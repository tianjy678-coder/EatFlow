// 为已拉取的 POI 计算真实步行时间矩阵（腾讯 distance/v1/matrix, mode=walking）
// 限流实测：并发 5 次/秒，且距离矩阵按"元素数"计数 → 每批最多 5 个 to 点，间隔 >=1.3s
const https = require('https');
const fs = require('fs');
const path = require('path');

const KEY = process.env.TENCENT_LBS_KEY;
const RAW = path.join(__dirname, 'raw-zju.json');
const OUT = path.join(__dirname, 'raw-zju-walk.json');

const ANCHORS = [
  { id: 'center', label: '校园中心', lat: 30.3055, lng: 120.0795 },
  { id: 'south', label: '南门', lat: 30.295407, lng: 120.082134 },
  { id: 'east', label: '东门', lat: 30.30501, lng: 120.092199 },
  { id: 'north', label: '北门', lat: 30.309887, lng: 120.083021 },
];

const BATCH = 5; // 实测 10 点即触发 120，5 点稳定
const GAP = 1300; // ms

function get(url) {
  return new Promise((resolve) => {
    https
      .get(url, (res) => {
        let buf = '';
        res.on('data', (c) => (buf += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(buf));
          } catch (e) {
            resolve({ status: -1, message: 'parse fail' });
          }
        });
      })
      .on('error', (e) => resolve({ status: -2, message: String(e) }));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function matrixBatch(from, points) {
  const to = points.map((p) => p.lat.toFixed(6) + ',' + p.lng.toFixed(6)).join(';');
  const url =
    'https://apis.map.qq.com/ws/distance/v1/matrix/?mode=walking' +
    '&from=' + from.lat + ',' + from.lng +
    '&to=' + to + '&key=' + KEY;
  for (let i = 0; i < 8; i += 1) {
    const d = await get(url);
    if (d.status === 0) {
      const els = (d.result && d.result.rows && d.result.rows[0] && d.result.rows[0].elements) || [];
      if (els.length === points.length) return els;
      return null;
    }
    if (d.status === 120) {
      await sleep(5000 + i * 3000);
      continue;
    }
    console.error('   status', d.status, d.message);
    return null;
  }
  return null;
}

(async () => {
  const pois = JSON.parse(fs.readFileSync(RAW, 'utf-8'));
  console.error('POI 数: ' + pois.length);

  const out = pois.map((p) => ({
    id: p.id,
    title: p.title,
    addr: p.address,
    cat: p.category,
    tel: p.tel || '',
    lat: p.location.lat,
    lng: p.location.lng,
    walk: {},
  }));

  for (let a = 0; a < ANCHORS.length; a += 1) {
    const anchor = ANCHORS[a];
    let done = 0;
    let fail = 0;
    for (let i = 0; i < out.length; i += BATCH) {
      const slice = out.slice(i, i + BATCH);
      const els = await matrixBatch(anchor, slice);
      if (!els) {
        fail += BATCH;
        slice.forEach((p) => (p.walk[anchor.id] = null));
      } else {
        els.forEach((e, k) => {
          slice[k].walk[anchor.id] = {
            d: e.distance,
            t: Math.max(1, Math.round(e.duration / 60)),
          };
        });
        done += els.length;
      }
      await sleep(GAP);
      if ((i / BATCH) % 8 === 0) console.error('  [' + anchor.id + '] ' + done + '/' + out.length + ' fail=' + fail);
    }
    console.error('== ' + anchor.label + ' 完成: ' + done + ' ok, ' + fail + ' fail');
  }

  fs.writeFileSync(OUT, JSON.stringify(out, null, 0), 'utf-8');
  const okCount = out.filter((p) => p.walk.center && p.walk.south && p.walk.east && p.walk.north).length;
  console.error('已写入 ' + OUT + ' | 四锚点齐全: ' + okCount + '/' + out.length);
})();
