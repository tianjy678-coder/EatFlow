const lbs = require('../../utils/lbs');

Page({
  data: {
    current: null,
    currentLabel: '',
    currentDesc: '',
    presets: [],
    recent: [],
    areaHit: null,
    isCustom: false,
    atDorm: false,
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const cur = lbs.getLocation();
    const presets = lbs.PRESET_LOCATIONS.map((p) => {
      const d = cur ? Math.round(haversine(cur, p)) : null;
      return Object.assign({}, p, {
        selected: !!cur && cur.id === p.id,
        distanceText: d == null ? '' : d < 1000 ? d + ' 米' : (d / 1000).toFixed(1) + ' 公里',
      });
    });
    const recent = lbs.getRecentLocations()
      .filter((r) => r.id === 'custom')
      .map((r) => Object.assign({}, r, { selected: !!cur && cur.id === 'custom' && cur.lat === r.lat }));
    const area = cur ? lbs.inOfflineArea(cur.lat, cur.lng) : null;

    this.setData({
      current: cur,
      currentLabel: cur ? cur.label : '还没设置',
      currentDesc: cur ? (cur.tag ? cur.tag + ' · ' : '') + (cur.address || '') : '选一个你所在（或要去）的位置',
      presets: presets,
      recent: recent,
      areaHit: area ? area.label + ' · 已内置 ' + area.count + " 家真实店铺" : null,
      isCustom: !!cur && cur.id === 'custom',
      atDorm: !!cur && cur.kind === 'dorm',
    });
  },

  /** 自选位置无法判断是否在宿舍，交给用户自己说；自炊只在宿舍可行 */
  onDormToggle(e) {
    const cur = lbs.getLocation();
    if (!cur) return;
    const next = Object.assign({}, cur, { kind: e.detail.value ? 'dorm' : 'other' });
    lbs.saveLocation(next);
    this.refresh();
  },

  pickPreset(e) {
    const id = e.currentTarget.dataset.id;
    const p = lbs.PRESET_LOCATIONS.find((x) => x.id === id);
    if (!p) return;
    this.apply(Object.assign({}, p, { address: p.tag || '', ts: Date.now() }));
  },

  pickRecent(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    const r = this.data.recent[idx];
    if (r) this.apply(Object.assign({}, r, { ts: Date.now() }));
  },

  openMap() {
    const self = this;
    lbs.chooseLocation().then((res) => {
      if (!res.data) return; // 用户取消
      self.apply(res.data);
    });
  },

  apply(loc) {
    lbs.saveLocation(loc);
    lbs.pushRecentLocation(loc);
    const area = lbs.inOfflineArea(loc.lat, loc.lng);
    wx.showToast({
      title: area ? '已切换 · 内置真实数据' : '已切换位置',
      icon: 'none',
      duration: 1500,
    });
    this.refresh();
    // 位置变了，清空上次的需求记忆中的场景无关，保持其它不动
  },

  confirm() {
    wx.navigateBack({
      fail() {
        wx.switchTab({ url: '/pages/index/index' });
      },
    });
  },

  goProfile() {
    wx.navigateTo({ url: '/pages/profile/profile' });
  },
});

function toRad(d) {
  return (d * Math.PI) / 180;
}

function haversine(a, b) {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}
