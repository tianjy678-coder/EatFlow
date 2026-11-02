// 拉取浙江大学紫金港校区周边真实餐饮 POI
// 用法: node fetch_zju.js
const https = require('https');
const fs = require('fs');
const path = require('path');

const KEY = process.env.TENCENT_LBS_KEY;
if (!KEY) {
  console.error('缺少环境变量 TENCENT_LBS_KEY');
  process.exit(1);
}

const OUT = path.join(__dirname, 'raw-zju.json');

function get(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(buf));
        } catch (e) {
          resolve({ status: -1, message: 'parse fail ' + buf.slice(0, 200) });
        }
      });
    }).on('error', (e) => resolve({ status: -2, message: String(e) }));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 带退避的请求：120（每秒限流）时等待重试
async function getRetry(url, tag) {
  for (let i = 0; i < 6; i += 1) {
    const d = await get(url);
    if (d.status === 0) return d;
    if (d.status === 120) {
      await sleep(6000 + i * 4000);
      continue;
    }
    console.error('  [' + tag + '] status', d.status, d.message);
    return d;
  }
  console.error('  [' + tag + '] 重试耗尽');
  return { status: 120 };
}

const CENTER = { lat: 30.3055, lng: 120.0795 };

async function fetchPois() {
  const all = [];
  const seen = {};
  for (let page = 1; page <= 8; page += 1) {
    const url =
      'https://apis.map.qq.com/ws/place/v1/search/?keyword=%E7%BE%8E%E9%A3%9F' +
      '&boundary=nearby(' + CENTER.lat + ',' + CENTER.lng + ',2000)' +
      '&filter=category=' + encodeURIComponent('美食') +
      '&page_size=20&page_index=' + page + '&key=' + KEY;
    const d = await getRetry(url, 'page' + page);
    if (d.status !== 0 || !d.data) break;
    let added = 0;
    d.data.forEach((it) => {
      if (seen[it.id]) return;
      seen[it.id] = true;
      all.push(it);
      added += 1;
    });
    console.error('  page ' + page + ' 新增 ' + added + ' 累计 ' + all.length);
    if (d.data.length < 20) break;
    await sleep(1500);
  }
  return all;
}

(async () => {
  console.error('== 1) 拉取 POI ==');
  const pois = await fetchPois();
  console.error('POI 总数: ' + pois.length);

  const cats = {};
  pois.forEach((p) => {
    cats[p.category] = (cats[p.category] || 0) + 1;
  });
  console.error('== 分类分布 ==');
  Object.keys(cats)
    .sort((a, b) => cats[b] - cats[a])
    .forEach((k) => console.error('  ' + cats[k] + '\t' + k));

  fs.writeFileSync(OUT, JSON.stringify(pois, null, 0), 'utf-8');
  console.error('已写入 ' + OUT);
})();
