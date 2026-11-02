/**
 * 已烘焙的离线真实数据包注册表
 *
 * 每个包 = 一个校区/片区 + 一份预先算好的「锚点 × 店铺」真实步行时间矩阵。
 * 命中 bbox 时直接本地加载，零网络请求、零延迟、不消耗 API 配额。
 */

module.exports = [
  {
    id: 'zju',
    label: '浙江大学紫金港校区',
    file: 'pois-zju',
    count: 160,
    // [minLat, maxLat, minLng, maxLng]
    bbox: [30.285, 30.325, 120.058, 120.104],
    anchors: [
      { id: 'center', label: '校园中心', lat: 30.3055, lng: 120.0795 },
      { id: 'south', label: '南门', lat: 30.295407, lng: 120.082134 },
      { id: 'east', label: '东门', lat: 30.30501, lng: 120.092199 },
      { id: 'north', label: '北门 / 宿舍区', lat: 30.309887, lng: 120.083021 },
    ],
    fetchedAt: '2026-10-29',
    source: '腾讯位置服务',
  },
];
