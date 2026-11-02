/**
 * EatFlow 位置服务客户端
 *
 * 三级降级（每一级都如实告知用户当前数据是什么）：
 *   1) 离线真实数据包（已烘焙的校区 POI + 真实步行矩阵）—— 零请求、零延迟
 *   2) 云函数实时搜索（需开通云开发）+ 本地网格缓存（7 天）
 *   3) 内置示例池 —— 明确提示"这是演示数据，不是你周围的店"
 *
 * 安全约束：周边店铺 POI 不含食材信息，过敏/禁忌无法自动核验。
 * 默认「严格模式」下，用户配了过敏/禁忌时这些店铺不进候选池（见 store.getSettings().strictAllergy）。
 */

const geo = require('./geo');
const store = require('./store');

const KEY_LOCATION = 'eatflow_location';
const KEY_POI_CACHE = 'eatflow_poi_cache';
const CACHE_TTL = 7 * 24 * 3600 * 1000;
const MAX_GRIDS = 30;

/* ---------------- 位置 ---------------- */

/**
 * 预设位置：不申请定位权限也能用，且允许用户选"我一会儿要去的地方"。
 * 个人主体小程序 getLocation 受类目限制，chooseLocation 不受限 —— 这是主路径。
 */
const PRESET_LOCATIONS = [
  { id: 'center', label: '校园中心', lat: 30.3055, lng: 120.0795, tag: '浙大紫金港', kind: 'campus' },
  { id: 'south', label: '南门', lat: 30.295407, lng: 120.082134, tag: '浙大紫金港', kind: 'campus' },
  { id: 'east', label: '东门', lat: 30.30501, lng: 120.092199, tag: '浙大紫金港', kind: 'campus' },
  { id: 'north', label: '北门 / 宿舍区', lat: 30.309887, lng: 120.083021, tag: '浙大紫金港', kind: 'dorm' },
];

/** 位置性质：自炊只在宿舍可行 */
const LOCATION_KINDS = {
  dorm: '宿舍',
  campus: '校内',
  offcampus: '校外',
  other: '其它',
};

function getLocation() {
  try {
    const v = wx.getStorageSync(KEY_LOCATION);
    return v && v.lat ? v : null;
  } catch (e) {
    return null;
  }
}

function saveLocation(loc) {
  try {
    wx.setStorageSync(KEY_LOCATION, loc);
    return { data: loc, error: null };
  } catch (e) {
    return { data: null, error: 'STORE_WRITE_FAILED' };
  }
}

function getRecentLocations() {
  try {
    const v = wx.getStorageSync('eatflow_recent_locations');
    return Array.isArray(v) ? v : [];
  } catch (e) {
    return [];
  }
}

function pushRecentLocation(loc) {
  let list = getRecentLocations().filter((x) => !(Math.abs(x.lat - loc.lat) < 0.0002 && Math.abs(x.lng - loc.lng) < 0.0002));
  list.unshift(loc);
  if (list.length > 6) list.length = 6;
  try {
    wx.setStorageSync('eatflow_recent_locations', list);
  } catch (e) {
    /* ignore */
  }
}

/** 地图选点：wx.chooseLocation，个人主体即可用 */
function chooseLocation() {
  return new Promise((resolve) => {
    if (!wx.chooseLocation) {
      resolve({ data: null, error: 'UNSUPPORTED' });
      return;
    }
    wx.chooseLocation({
      success(res) {
        if (!res || typeof res.latitude !== 'number') {
          resolve({ data: null, error: 'CANCELLED' });
          return;
        }
        const loc = {
          id: 'custom',
          label: res.name || '自选位置',
          tag: '自选',
          address: res.address || '',
          lat: res.latitude,
          lng: res.longitude,
          ts: Date.now(),
        };
        resolve({ data: loc, error: null });
      },
      fail() {
        resolve({ data: null, error: 'CANCELLED' });
      },
    });
  });
}

/* ---------------- 网格缓存 ---------------- */

function readCache() {
  try {
    const v = wx.getStorageSync(KEY_POI_CACHE);
    return v && typeof v === 'object' ? v : {};
  } catch (e) {
    return {};
  }
}

function writeCache(cache) {
  const keys = Object.keys(cache);
  if (keys.length > MAX_GRIDS) {
    keys.sort((a, b) => (cache[b].ts || 0) - (cache[a].ts || 0));
    keys.slice(MAX_GRIDS).forEach((k) => delete cache[k]);
  }
  try {
    wx.setStorageSync(KEY_POI_CACHE, cache);
  } catch (e) {
    /* 容量超限时静默放弃缓存，不影响主流程 */
  }
}

function getCached(lat, lng) {
  const cache = readCache();
  const key = geo.gridKey(lat, lng);
  const hit = cache[key];
  if (!hit || !hit.ts || Date.now() - hit.ts > CACHE_TTL) return null;
  return hit.pois || null;
}

function setCached(lat, lng, pois) {
  const cache = readCache();
  cache[geo.gridKey(lat, lng)] = { ts: Date.now(), pois: pois };
  writeCache(cache);
}

function clearCache() {
  try {
    wx.removeStorageSync(KEY_POI_CACHE);
    return { data: true, error: null };
  } catch (e) {
    return { data: null, error: 'STORE_WRITE_FAILED' };
  }
}

/* ---------------- 云函数调用 ---------------- */

function cloudAvailable() {
  if (typeof wx === 'undefined' || !wx.cloud || typeof wx.cloud.callFunction !== 'function') return false;
  try {
    const app = getApp();
    if (app && app.globalData && app.globalData.cloudReady === false) return false;
  } catch (e) {
    /* 非小程序环境忽略 */
  }
  return true;
}

/**
 * 实时搜索周边餐饮。
 * @returns Promise<{ pois, source, error }>  source: 'cloud' | 'cache' | null
 */
function searchNearby(lat, lng, radius) {
  const cached = getCached(lat, lng);
  if (cached) return Promise.resolve({ pois: cached, source: 'cache', error: null });

  if (!cloudAvailable()) {
    return Promise.resolve({ pois: null, source: null, error: 'NO_CLOUD' });
  }

  return new Promise((resolve) => {
    wx.cloud
      .callFunction({
        name: 'eatflowSearch',
        data: { lat: lat, lng: lng, radius: radius || 1500 },
      })
      .then((res) => {
        const r = res && res.result ? res.result : null;
        if (!r || r.ok === false || !Array.isArray(r.pois)) {
          resolve({ pois: null, source: null, error: (r && r.error) || 'BAD_RESULT' });
          return;
        }
        setCached(lat, lng, r.pois);
        resolve({ pois: r.pois, source: 'cloud', error: null });
      })
      .catch((e) => {
        resolve({ pois: null, source: null, error: 'CALL_FAILED' });
      });
  });
}

/* ---------------- 候选池组装 ---------------- */

/**
 * 给定位置，算出每个 POI 的步行分钟数。
 * 优先用真实矩阵列（按最近锚点），否则用直线距离 × 绕行系数估算。
 */
function applyWalk(pois, location) {
  return pois.map((p) => {
    let walkMin = null;
    let real = false;
    if (p.walk && location && location.anchor && p.walk[location.anchor]) {
      walkMin = p.walk[location.anchor].t;
      real = true;
    } else if (p.walk && location) {
      // 取所有锚点里最接近当前位置的一列
      let best = null;
      let bestD = Infinity;
      PRESET_LOCATIONS.forEach((a) => {
        if (!p.walk[a.id]) return;
        const d = geo.haversine({ lat: a.lat, lng: a.lng }, { lat: location.lat, lng: location.lng });
        if (d < bestD) {
          bestD = d;
          best = p.walk[a.id];
        }
      });
      if (best) {
        walkMin = best.t;
        real = true;
      }
    }
    if (walkMin == null && location) {
      walkMin = geo.estimateWalkMin(geo.haversine({ lat: location.lat, lng: location.lng }, { lat: p.lat, lng: p.lng }));
      real = false;
    }
    // 直线距离必须相对「当前选的位置」算 —— 离线包里存的是距校园中心的距离，
    // 换成南门/东门后继续沿用会和步行分钟数自相矛盾。
    let distance = p.distance != null ? p.distance : null;
    if (location && p.lat && p.lng) {
      distance = Math.round(geo.haversine({ lat: location.lat, lng: location.lng }, { lat: p.lat, lng: p.lng }));
    }
    return Object.assign({}, p, { walkMin: walkMin || 15, walkReal: real, distance: distance });
  });
}

/** 判断坐标是否落在某个已烘焙数据包的覆盖范围内 */
function inOfflineArea(lat, lng) {
  const areas = getOfflineAreas();
  for (let i = 0; i < areas.length; i += 1) {
    const a = areas[i];
    if (lat >= a.bbox[0] && lat <= a.bbox[1] && lng >= a.bbox[2] && lng <= a.bbox[3]) return a;
  }
  return null;
}

// 离线数据包必须静态引入 —— 小程序不支持 require('../data/' + name) 的动态路径
const AREAS = require('../data/areas');
const BUNDLES = {
  'pois-zju': require('../data/pois-zju'),
};
const BUILTIN = require('../data/candidates');

function getOfflineAreas() {
  return AREAS;
}

function loadBundle(file) {
  const fn = BUNDLES[file];
  return typeof fn === 'function' ? fn() : null;
}

/**
 * 组装完整候选池（同步版本，用于离线包/缓存命中）
 * @returns { items, source, message, degraded }
 */
function buildPoolSync(location) {
  const settings = store.getSettings();
  const strict = settings.strictAllergy !== false; // 默认严格
  const area = location ? inOfflineArea(location.lat, location.lng) : null;

  let pois = null;
  let source = 'builtin';
  let message = '';

  if (area) {
    pois = loadBundle(area.file);
    source = 'offline';
    message = area.label + ' · ' + area.count + ' 家真实店铺';
  } else if (location) {
    const cached = getCached(location.lat, location.lng);
    if (cached) {
      pois = cached;
      source = 'cache';
      message = '上次在此处搜到的 ' + cached.length + ' 家店';
    }
  }

  let items = [];
  let excluded = 0;
  let poiTotal = 0;
  if (pois && pois.length) {
    poiTotal = pois.length;
    const decorated = applyWalk(pois, location).map((p, i) => geo.normalizePoi(p, i));
    // 安全：严格模式下，无法核验食材的店铺在有过敏/禁忌时不进池
    const card = store.getCard() || {};
    const hasSafetyNeed = (card.allergies || []).length > 0 || (card.taboos || []).length > 0;
    decorated.forEach((it) => {
      if (strict && hasSafetyNeed && it.ingredientsUnknown) {
        excluded += 1;
        return;
      }
      items.push(it);
    });
    if (excluded > 0) {
      message += '（' + excluded + ' 家因无法核验食材已排除）';
    }
  }

  // 自炊与零食不依赖 POI，始终保留内置项；其余内置项只在无真实数据时启用
  const userItems = store.getUserCandidates().map((x) => Object.assign({ source: 'user' }, x));
  if (items.length === 0) {
    const disabled = store.getDisabledBuiltins();
    const builtins = BUILTIN
      .filter((x) => disabled.indexOf(x.id) < 0)
      .map((x) => Object.assign({ source: 'builtin' }, x));
    items = builtins.concat(userItems);
    if (poiTotal > 0) {
      // 有真实数据，但被安全策略全挡了 —— 必须说清原因，不能说成"没数据"
      source = 'blocked';
      message =
        '周边 ' + poiTotal + " 家店铺因不含食材信息、无法核验你的过敏/禁忌，已全部排除。" +
        '可在「我的」关闭严格模式，关闭后它们会带「食材未核验」标记出现';
    } else {
      message = '未接入位置数据，当前是内置的示例候选池';
    }
  } else {
    const disabled = store.getDisabledBuiltins();
    const extras = BUILTIN
      .filter((x) => disabled.indexOf(x.id) < 0 && (x.scene === '自炊' || x.scene === '零食'))
      .map((x) => Object.assign({ source: 'builtin' }, x));
    items = items.concat(extras, userItems);
  }

  return {
    items: items,
    source: source,
    message: message,
    degraded: source === 'builtin' || source === 'cache',
  };
}

/**
 * 异步完整流程：先试云函数（仅当离线包未覆盖），再回落到同步组装。
 */
function buildPool(location) {
  const area = location ? inOfflineArea(location.lat, location.lng) : null;
  if (area || !location) {
    return Promise.resolve(buildPoolSync(location));
  }
  const cached = getCached(location.lat, location.lng);
  if (cached) return Promise.resolve(buildPoolSync(location));

  if (!cloudAvailable()) return Promise.resolve(buildPoolSync(location));

  return searchNearby(location.lat, location.lng, 1500).then((res) => {
    if (!res.pois) return buildPoolSync(location);
    const pool = buildPoolSync(location);
    if (pool.source !== 'builtin') return pool;
    // 用云搜索结果替换示例池
    const settings = store.getSettings();
    const strict = settings.strictAllergy !== false;
    const card = store.getCard() || {};
    const hasSafetyNeed = ((card.allergies || []).length + (card.taboos || []).length) > 0;
    const decorated = applyWalk(res.pois, location).map((p, i) => geo.normalizePoi(p, i));
    const kept = decorated.filter((it) => !(strict && hasSafetyNeed && it.ingredientsUnknown));
    const disabled = store.getDisabledBuiltins();
    const extras = BUILTIN
      .filter((x) => disabled.indexOf(x.id) < 0 && (x.scene === '自炊' || x.scene === '零食'))
      .map((x) => Object.assign({ source: 'builtin' }, x));
    const userItems = store.getUserCandidates().map((x) => Object.assign({ source: 'user' }, x));

    if (!kept.length && decorated.length) {
      return {
        items: extras.concat(userItems),
        source: 'blocked',
        message:
          '搜到 ' + decorated.length + ' 家周边店铺，但因不含食材信息、无法核验你的过敏/禁忌，已全部排除',
        degraded: false,
      };
    }
    return {
      items: kept.concat(extras, userItems),
      source: res.source,
      message: (res.source === 'cache' ? '本地缓存' : '实时搜索') + '到 ' + kept.length + ' 家周边店铺',
      degraded: res.source === 'cache',
    };
  });
}

/** 距离展示文案 */
function fmtDistance(m) {
  if (m == null) return '';
  return m < 1000 ? m + ' 米' : (Math.round(m / 100) / 10).toFixed(1) + ' 公里';
}

module.exports = {
  PRESET_LOCATIONS,
  LOCATION_KINDS,
  getLocation,
  saveLocation,
  getRecentLocations,
  pushRecentLocation,
  chooseLocation,
  searchNearby,
  buildPool,
  buildPoolSync,
  applyWalk,
  inOfflineArea,
  clearCache,
  fmtDistance,
};
