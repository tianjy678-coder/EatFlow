// 把拉取到的真实 POI + 步行矩阵烘焙成小程序可直接 require 的数据文件
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'raw-zju-walk.json');
const OUT = path.join(__dirname, '../../data/pois-zju.js');

const rows = JSON.parse(fs.readFileSync(SRC, 'utf-8'));

// 只用得上的字段：店名、短地址、品类、坐标、四个锚点的真实步行分钟
const keep = rows
  .filter((r) => r.walk && r.walk.center && r.walk.center.t)
  .map((r) => ({
    id: r.id,
    t: r.title,
    a: shortAddr(r.addr),
    c: r.cat.replace(/^美食:/, ''),
    lat: round6(r.lat),
    lng: round6(r.lng),
    d: r.walk.center.d,
    w: [
      r.walk.center ? r.walk.center.t : null,
      r.walk.south ? r.walk.south.t : null,
      r.walk.east ? r.walk.east.t : null,
      r.walk.north ? r.walk.north.t : null,
    ],
  }));

function round6(n) {
  return Math.round(n * 1e5) / 1e5;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function shortAddr(addr) {
  if (!addr) return '';
  let s = addr.replace(/^浙江省杭州市/, '').replace(/^浙江省/, '').replace(/^杭州市/, '');
  if (s.length > 20) s = s.slice(0, 20);
  return s;
}

const lats = keep.map((x) => x.lat);
const lngs = keep.map((x) => x.lng);
const bbox = [
  Math.min.apply(null, lats),
  Math.max.apply(null, lats),
  Math.min.apply(null, lngs),
  Math.max.apply(null, lngs),
];

const lines = keep.map(
  (x) =>
    "  ['" + esc(x.id) + "','" + esc(x.t) + "','" + esc(x.a) + "','" + esc(x.c) + "'," +
    x.lat + ',' + x.lng + ',' + x.d + ',' +
    '[' + x.w.map((v) => (v == null ? '0' : v)).join(',') + ']],'
);

const header = `/**
 * 浙江大学紫金港校区周边真实餐饮数据（离线包）
 *
 * 来源：腾讯位置服务 WebService API
 * 抓取时间：2026-10-29
 * 条数：${keep.length}
 *
 * 字段：[id, 店名, 短地址, 品类, 纬度, 经度, 距校园中心步行米数, [校园中心, 南门, 东门, 北门] 步行分钟]
 * 步行分钟来自 distance/v1/matrix?mode=walking 的真实路径规划结果，不是直线换算。
 *
 * 注意：POI 不含食材与营业时间，过敏/禁忌无法自动核验，营业状态不臆断。
 */

var ANCHORS = ['center', 'south', 'east', 'north'];

var RAW = [
`;

const footer = `];

module.exports = function load() {
  return RAW.map(function (r) {
    var walk = {};
    for (var i = 0; i < ANCHORS.length; i++) {
      if (r[7][i]) walk[ANCHORS[i]] = { d: null, t: r[7][i] };
    }
    return {
      id: r[0],
      title: r[1],
      addr: r[2],
      cat: '美食:' + r[3],
      tel: '',
      lat: r[4],
      lng: r[5],
      distance: r[6],
      walk: walk,
      source: 'lbs',
    };
  });
};

module.exports.count = ${keep.length};
module.exports.bbox = [${bbox.map((v) => round6(v)).join(', ')}];
`;

fs.writeFileSync(OUT, header + lines.join('\n') + '\n' + footer, 'utf-8');

const size = fs.statSync(OUT).size;
console.log('写入 ' + OUT);
console.log('条数 ' + keep.length + ' | 体积 ' + (size / 1024).toFixed(1) + ' KB');
console.log('bbox ' + JSON.stringify(bbox.map((v) => round6(v))));

// 抽样：同一家店从不同校门出发的步行差异（验证矩阵真的有用）
const sample = keep
  .filter((x) => x.w[0] && x.w[1] && x.w[2] && x.w[3])
  .map((x) => ({ name: x.t, spread: Math.max.apply(null, x.w) - Math.min.apply(null, x.w) }))
  .sort((a, b) => b.spread - a.spread)
  .slice(0, 6);
console.log('\\n位置敏感度 TOP6（从四个校门出发的步行分钟差）:');
sample.forEach((s) => console.log('  ' + s.spread + ' 分钟\t' + s.name));
