/**
 * EatFlow 地理与距离工具
 *
 * 真实性分级（重要，UI 必须如实呈现）：
 *   distance / walkMin  —— 真实值（腾讯步行路径规划）或由真实直线距离换算的估算值
 *   price               —— 由品类先验估算（POI 不返回人均消费），标 priceEstimated
 *   waitMin             —— 由品类先验估算，标 waitEstimated
 *   hours               —— POI 不返回营业时间，标 hoursUnknown，绝不断言"在营业"
 */

// 地球半径（米）
const R = 6371000;

function toRad(d) {
  return (d * Math.PI) / 180;
}

/** 两点直线距离（米），GCJ-02 坐标直接可用，与微信 getLocation/chooseLocation 同源 */
function haversine(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}

// 步行绕行系数：直线距离 → 实际步行距离。城市路网经验值 1.25~1.45
const DETOUR = 1.3;
// 步行速度（米/分钟）
const WALK_SPEED = 80;

/** 直线距离 → 估算步行分钟数（未拿到真实路径时的兜底） */
function estimateWalkMin(distanceM, speed) {
  return Math.max(1, Math.round((distanceM * DETOUR) / (speed || WALK_SPEED)));
}

/** 真实步行时长（秒）→ 分钟 */
function durationToMin(sec) {
  return Math.max(1, Math.round(sec / 60));
}

/**
 * 网格 key：把坐标量化成格子，用于缓存复用。
 * 0.005° ≈ 550m（纬度方向）；经度按纬度收缩修正，保证格子近似正方形。
 */
function gridKey(lat, lng, sizeDeg) {
  const s = sizeDeg || 0.005;
  const gl = Math.floor(lat / s);
  const gg = Math.floor(lng / (s / Math.max(0.2, Math.cos(toRad(lat)))));
  return 'g' + gl + '_' + gg;
}

/** 网格中心坐标（用于判断命中范围） */
function gridCenter(key) {
  const m = /^g(-?\d+)_(-?\d+)$/.exec(key || '');
  if (!m) return null;
  const s = 0.005;
  return { lat: (parseInt(m[1], 10) + 0.5) * s, lng: (parseInt(m[2], 10) + 0.5) * s };
}

/* ---------------- 品类 → 先验 ---------------- */

/**
 * 腾讯 POI category 形如 "美食:小吃快餐"、"美食:中餐厅:火锅"
 * 映射为：人均价格区间、出餐分钟、默认标签、是否适合分食
 */
const CATEGORY_PRIORS = [
  { key: '火锅', price: [55, 85], wait: 12, tags: ['热食', '重口'], shareable: true },
  { key: '烧烤', price: [45, 70], wait: 15, tags: ['热食', '重口'], shareable: true },
  { key: '烤肉', price: [55, 80], wait: 15, tags: ['热食'], shareable: true },
  { key: '自助餐', price: [60, 100], wait: 5, tags: ['热食'], shareable: true },
  { key: '日本料理', price: [60, 95], wait: 15, tags: ['鲜'], shareable: false },
  { key: '韩国料理', price: [45, 70], wait: 12, tags: ['热食'], shareable: true },
  { key: '西餐', price: [65, 110], wait: 18, tags: [], shareable: false },
  { key: '牛排', price: [70, 120], wait: 18, tags: ['热食'], shareable: false },
  { key: '披萨', price: [40, 65], wait: 15, tags: ['热食'], shareable: true },
  { key: '比萨', price: [40, 65], wait: 15, tags: ['热食'], shareable: true },
  { key: '意大利菜', price: [60, 100], wait: 18, tags: [], shareable: true },
  { key: '海鲜', price: [55, 90], wait: 18, tags: ['鲜'], shareable: true },
  { key: '酒楼', price: [45, 75], wait: 20, tags: ['热食'], shareable: true },
  { key: '茶餐厅', price: [30, 50], wait: 12, tags: ['热食'], shareable: true },
  { key: '农家菜', price: [40, 65], wait: 18, tags: ['热食'], shareable: true },
  { key: '浙江菜', price: [35, 60], wait: 15, tags: ['鲜', '清淡'], shareable: true },
  { key: '上海菜', price: [35, 60], wait: 15, tags: ['甜'], shareable: true },
  { key: '东北菜', price: [35, 55], wait: 15, tags: ['热食', '重口'], shareable: true },
  { key: '印度菜', price: [50, 80], wait: 18, tags: ['重口'], shareable: true },
  { key: '东南亚菜', price: [45, 75], wait: 16, tags: [], shareable: true },
  { key: '中餐厅', price: [25, 45], wait: 14, tags: ['热食'], shareable: true },
  { key: '湘菜', price: [35, 55], wait: 14, tags: ['辣', '热食', '重口'], shareable: true },
  { key: '川菜', price: [35, 55], wait: 14, tags: ['辣', '热食', '重口'], shareable: true },
  { key: '家常菜', price: [25, 40], wait: 12, tags: ['热食'], shareable: true },
  { key: '快餐', price: [15, 25], wait: 6, tags: ['热食'], shareable: false },
  { key: '小吃快餐', price: [15, 25], wait: 6, tags: ['热食'], shareable: false },
  { key: '面', price: [13, 22], wait: 8, tags: ['热食'], shareable: false },
  { key: '米粉', price: [13, 22], wait: 8, tags: ['热食'], shareable: false },
  { key: '麻辣烫', price: [20, 32], wait: 8, tags: ['辣', '热食'], shareable: false },
  { key: '香锅', price: [25, 40], wait: 10, tags: ['辣', '热食', '重口'], shareable: true },
  { key: '麻辣', price: [25, 40], wait: 10, tags: ['辣', '热食', '重口'], shareable: true },
  { key: '冒菜', price: [22, 35], wait: 8, tags: ['辣', '热食'], shareable: false },
  { key: '饺子', price: [18, 30], wait: 10, tags: ['热食'], shareable: true },
  { key: '包子', price: [6, 14], wait: 3, tags: ['热食'], shareable: false },
  { key: '粥', price: [10, 18], wait: 6, tags: ['热食', '清淡'], shareable: false },
  { key: '寿司', price: [30, 55], wait: 10, tags: ['鲜'], shareable: false },
  { key: '咖啡', price: [20, 35], wait: 5, tags: [], shareable: false },
  { key: '茶饮', price: [12, 20], wait: 5, tags: [], shareable: false },
  { key: '甜品', price: [15, 30], wait: 5, tags: ['甜'], shareable: false },
  { key: '蛋糕', price: [20, 40], wait: 3, tags: ['甜'], shareable: true },
  { key: '面包', price: [12, 25], wait: 2, tags: [], shareable: false },
  { key: '清真', price: [20, 35], wait: 10, tags: ['热食'], shareable: true, noPork: true },
  { key: '素食', price: [20, 35], wait: 10, tags: ['清淡'], shareable: true, noMeat: true },
  { key: '食堂', price: [10, 20], wait: 8, tags: ['热食'], shareable: false },
  { key: '餐厅', price: [25, 45], wait: 13, tags: ['热食'], shareable: true },
  { key: '美食', price: [25, 45], wait: 10, tags: ['热食'], shareable: true },
];

const DEFAULT_PRIOR = { key: 'default', price: [22, 40], wait: 10, tags: ['热食'], shareable: true };

function matchPrior(category) {
  const c = String(category || '');
  // 从最具体的子级往父级匹配："美食:中餐厅:火锅" 先试 "火锅"，再试 "中餐厅"
  const parts = c.split(':');
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const seg = parts[i];
    for (let j = 0; j < CATEGORY_PRIORS.length; j += 1) {
      if (seg.indexOf(CATEGORY_PRIORS[j].key) >= 0) return CATEGORY_PRIORS[j];
    }
  }
  return DEFAULT_PRIOR;
}

/** 人均价格取先验区间中值，用于预算筛选 */
function priorPrice(category) {
  const p = matchPrior(category);
  return Math.round((p.price[0] + p.price[1]) / 2);
}

/* ---------------- POI → 候选项 ---------------- */

/**
 * 把腾讯 POI（或已烘焙的离线 POI）转成统一候选结构。
 * 只填真实可得的字段；推断字段一律打标，绝不伪装成事实。
 */
function normalizePoi(poi, index) {
  const cat = poi.category || poi.cat || '美食';
  const prior = matchPrior(cat);
  const lat = poi.location ? poi.location.lat : poi.lat;
  const lng = poi.location ? poi.location.lng : poi.lng;
  const distance = poi.distance != null ? poi.distance : null;
  const walkMin = poi.walkMin != null ? poi.walkMin : distance != null ? estimateWalkMin(distance) : null;

  // 店名里能直接读到的强信号（清真 / 素食 / 面 / 火锅…）
  const title = poi.title || poi.name || '';
  const tags = (prior.tags || []).slice();
  if (/清真|穆斯林|回民/.test(title)) tags.push('清真');
  if (/素食|斋/.test(title)) tags.push('清淡');
  if (/火锅|冒菜|麻辣|香锅|串串/.test(title) && tags.indexOf('辣') < 0) tags.push('辣');
  if (/咖啡/.test(title)) tags.push('提神');

  return {
    id: 'lbs_' + (poi.id || 'p' + index),
    name: title,
    venue: shortVenue(poi.address || poi.addr || ''),
    address: poi.address || poi.addr || '',
    scene: /食堂|餐厅\(.*校|^浙大/.test(title) && /校/.test(poi.address || '') ? '食堂' : '校外餐馆',
    location: 'off',
    price: poi.price != null ? poi.price : priorPrice(cat),
    priceEstimated: poi.price == null,
    waitMin: prior.wait,
    waitEstimated: true,
    walkMin: walkMin || 15,
    walkReal: poi.walk != null, // 有真实步行矩阵列
    walk: poi.walk || null, // { anchorId: minutes }
    distance: distance,
    lat: lat,
    lng: lng,
    category: cat,
    tel: poi.tel || '',
    tags: unique(tags),
    ingredients: [], // POI 无食材数据 —— 过敏/禁忌无法自动核验
    ingredientsUnknown: true,
    spicy: /火锅|麻辣|香锅|川菜|湘菜|冒菜|串串/.test(cat + title) ? 2 : 0,
    hot: (prior.tags || []).indexOf('热食') >= 0,
    shareable: !!prior.shareable,
    hours: null, // 不编造营业时间
    hoursUnknown: true,
    noPork: !!prior.noPork || /清真|穆斯林/.test(title),
    noMeat: !!prior.noMeat || /素食/.test(title),
    source: 'lbs',
  };
}

/** 地址截断成"去哪儿"的短提示 */
function shortVenue(addr) {
  if (!addr) return '';
  const s = addr.replace(/^浙江省杭州市/, '').replace(/^浙江省/, '');
  return s.length > 18 ? s.slice(0, 18) + '…' : s;
}

function unique(arr) {
  const seen = {};
  const out = [];
  arr.forEach((x) => {
    if (x && !seen[x]) {
      seen[x] = true;
      out.push(x);
    }
  });
  return out;
}

module.exports = {
  haversine,
  estimateWalkMin,
  durationToMin,
  gridKey,
  gridCenter,
  matchPrior,
  priorPrice,
  normalizePoi,
  shortVenue,
  DETOUR,
  WALK_SPEED,
};
