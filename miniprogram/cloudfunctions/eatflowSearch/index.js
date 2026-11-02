/**
 * 云函数 eatflowSearch —— 周边餐饮搜索（服务端发请求，Key 不进小程序包）
 *
 * 环境变量：LBS_KEY（腾讯位置服务 WebService Key）
 *   设置位置：云开发控制台 → 云函数 → eatflowSearch → 配置 → 环境变量
 *
 * 配额约束（个人开发者，实测）：
 *   日调用 10,000 次/接口/Key；并发 5 次/秒/接口/Key
 *   距离矩阵按「元素数」计数 —— 每批最多 5 个 to 点，否则返回 120
 * 因此本函数单次决策只发 3 次请求：搜索 ×2 + 距离矩阵 ×1（5 个点）
 */

const https = require('https');

const SEARCH_URL = 'https://apis.map.qq.com/ws/place/v1/search/';
const MATRIX_URL = 'https://apis.map.qq.com/ws/distance/v1/matrix/';
const MATRIX_BATCH = 5; // 实测 10 点即触发 120

function request(url) {
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(buf));
        } catch (e) {
          resolve({ status: -1, message: 'PARSE_FAIL' });
        }
      });
    });
    req.on('error', () => resolve({ status: -2, message: 'NETWORK_FAIL' }));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ status: -3, message: 'TIMEOUT' });
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function requestRetry(url, tries) {
  const n = tries || 3;
  for (let i = 0; i < n; i += 1) {
    const d = await request(url);
    if (d.status === 0) return d;
    if (d.status === 120) {
      // 每秒并发超限，退避后重试
      await sleep(1200 + i * 1500);
      continue;
    }
    return d;
  }
  return { status: 120, message: 'RATE_LIMITED' };
}

function num(v, def, min, max) {
  const n = Number(v);
  if (!isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}

/** 搜索周边餐饮，返回去重后的 POI 列表 */
async function searchPois(key, lat, lng, radius, pages) {
  const seen = {};
  const out = [];
  for (let p = 1; p <= pages; p += 1) {
    const url =
      SEARCH_URL +
      '?keyword=' + encodeURIComponent('美食') +
      '&boundary=nearby(' + lat + ',' + lng + ',' + radius + ')' +
      '&filter=category=' + encodeURIComponent('美食') +
      '&page_size=20&page_index=' + p +
      '&key=' + key;
    const d = await requestRetry(url);
    if (d.status !== 0 || !Array.isArray(d.data) || !d.data.length) break;
    d.data.forEach((it) => {
      if (seen[it.id] || !it.location) return;
      seen[it.id] = true;
      out.push({
        id: it.id,
        title: it.title,
        addr: it.address || '',
        cat: it.category || '美食',
        tel: it.tel || '',
        lat: it.location.lat,
        lng: it.location.lng,
        distance: it._distance != null ? Math.round(it._distance) : null,
      });
    });
    if (d.data.length < 20) break;
    await sleep(250);
  }
  return out;
}

/**
 * 只给最近的若干个点算真实步行时间（省配额、控延迟）。
 * 返回 { id: { d, t } }
 */
async function walkTimes(key, lat, lng, pois) {
  const target = pois.slice(0, MATRIX_BATCH);
  if (!target.length) return {};
  const to = target.map((p) => p.lat.toFixed(6) + ',' + p.lng.toFixed(6)).join(';');
  const url = MATRIX_URL + '?mode=walking&from=' + lat + ',' + lng + '&to=' + to + '&key=' + key;
  const d = await requestRetry(url);
  const map = {};
  if (d.status !== 0 || !d.result || !d.result.rows || !d.result.rows[0]) return map;
  const els = d.result.rows[0].elements || [];
  els.forEach((e, i) => {
    if (!target[i]) return;
    if (e && (e.distance || e.duration)) {
      map[target[i].id] = { d: e.distance, t: Math.max(1, Math.round((e.duration || 0) / 60)) };
    }
  });
  return map;
}

exports.main = async (event) => {
  const key = process.env.LBS_KEY;
  if (!key) {
    return { ok: false, error: 'LBS_KEY_NOT_SET' };
  }
  const lat = num(event.lat, null, -90, 90);
  const lng = num(event.lng, null, -180, 180);
  if (lat === null || lng === null) {
    return { ok: false, error: 'BAD_COORDS' };
  }
  const radius = Math.round(num(event.radius, 1500, 300, 5000));
  const pages = Math.round(num(event.pages, 2, 1, 3));

  const pois = await searchPois(key, lat, lng, radius, pages);
  if (!pois.length) {
    return { ok: true, pois: [], radius: radius, message: 'NO_POI_FOUND' };
  }

  pois.sort((a, b) => (a.distance == null ? 1e9 : a.distance) - (b.distance == null ? 1e9 : b.distance));
  const walk = await walkTimes(key, lat, lng, pois);

  const result = pois.map((p) => {
    const w = walk[p.id];
    return {
      id: p.id,
      title: p.title,
      addr: p.addr,
      cat: p.cat,
      tel: p.tel,
      lat: p.lat,
      lng: p.lng,
      distance: p.distance,
      walk: w || null,
    };
  });

  return {
    ok: true,
    pois: result,
    radius: radius,
    center: { lat: lat, lng: lng },
    stats: { total: result.length, withRealWalk: Object.keys(walk).length },
    fetchedAt: Date.now(),
  };
};
