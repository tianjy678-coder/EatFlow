const store = require('../../utils/store');
const C = require('../../utils/constants');
const lbs = require('../../utils/lbs');

function withSelected(list, picked) {
  return list.map((x) => {
    const id = typeof x === 'string' ? x : x.id;
    const label = typeof x === 'string' ? x : x.label;
    return { id, label, selected: (picked || []).indexOf(id) >= 0 };
  });
}

Page({
  data: {
    locLabel: '还没设置位置',
    locDesc: '点这里选你现在在（或要去）的地方',
    scenes: [],
    prefers: [],
    companies: [],
    moods: [],
    budgetMax: 20,
    budgetStrict: false,
    timeMax: 45,
    timeStrict: false,
    candidatesText: '',
  },

  onLoad() {
    this.syncLocation();
    const session = getApp().globalData.session;
    const d = session.demand || store.getLastDemand() || C.DEFAULT_DEMAND;
    this.setData({
      scenes: withSelected(C.SCENES, d.scenes || []),
      prefers: withSelected(C.PREFER_OPTIONS, [d.prefer]),
      companies: withSelected(C.COMPANY_OPTIONS, [d.company]),
      moods: withSelected(C.MOOD_OPTIONS, [d.mood]),
      budgetMax: d.budgetMax,
      budgetStrict: !!d.budgetStrict,
      timeMax: d.timeMax,
      timeStrict: !!d.timeStrict,
      candidatesText: d.candidatesText || '',
    });
  },

  onShow() {
    // 从位置页返回后同步
    this.syncLocation();
  },

  syncLocation() {
    const loc = lbs.getLocation();
    if (!loc) {
      this.setData({ locLabel: '还没设置位置', locDesc: '点这里选你现在在（或要去）的地方' });
      return;
    }
    const area = lbs.inOfflineArea(loc.lat, loc.lng);
    const where = area ? area.label + ' · 内置 ' + area.count + ' 家真实店铺' : '该位置需联网搜索周边';
    const hint = loc.ts ? where : '默认位置 · 点这里切换（' + where + '）';
    const desc = hint + (loc.address ? ' · ' + loc.address : '');
    this.setData({ locLabel: loc.label, locDesc: desc });
  },

  goLocation() {
    wx.navigateTo({ url: '/pages/location/location' });
  },

  toggleChip(e) {
    const { group, multi } = e.currentTarget.dataset;
    const id = e.currentTarget.dataset.id;
    const list = this.data[group].map((x) => {
      if (multi) {
        if (x.id === id) return Object.assign({}, x, { selected: !x.selected });
        return x;
      }
      return Object.assign({}, x, { selected: x.id === id });
    });
    this.setData(this.buildPatch(group, list));
  },

  buildPatch(group, list) {
    const patch = {};
    patch[group] = list;
    return patch;
  },

  onBudgetInput(e) {
    this.setData({ budgetMax: Number(e.detail.value) || 0 });
  },

  onTimeInput(e) {
    this.setData({ timeMax: Number(e.detail.value) || 0 });
  },

  onBudgetStrict(e) {
    this.setData({ budgetStrict: e.detail.value });
  },

  onTimeStrict(e) {
    this.setData({ timeStrict: e.detail.value });
  },

  onCandidatesInput(e) {
    this.setData({ candidatesText: e.detail.value });
  },

  confirm() {
    const d = this.data;
    const pickSingle = (list) => {
      const hit = list.find((x) => x.selected);
      return hit ? hit.id : (list[0] ? list[0].id : 'any');
    };
    const pickMulti = (list) => list.filter((x) => x.selected).map((x) => x.id);
    const loc = lbs.getLocation();

    const demand = {
      location: loc ? loc.id : 'campus',
      locationKind: loc ? loc.kind || 'other' : 'campus',
      scenes: pickMulti(d.scenes),
      budgetMax: d.budgetMax,
      budgetStrict: d.budgetStrict,
      timeMax: d.timeMax,
      timeStrict: d.timeStrict,
      prefer: pickSingle(d.prefers),
      company: pickSingle(d.companies),
      mood: pickSingle(d.moods),
      candidatesText: d.candidatesText.trim(),
    };

    if (!demand.scenes.length) demand.scenes = [];

    const session = getApp().globalData.session;
    session.demand = demand;
    store.saveLastDemand(demand);
    wx.redirectTo({ url: '/pages/result/result' });
  },

  resetDemand() {
    const d = C.DEFAULT_DEMAND;
    const loc = lbs.getLocation();
    this.setData({
      locLabel: loc ? loc.label : '还没设置位置',
      locDesc: loc ? (loc.address || loc.tag || '') : '点这里选你现在在（或要去）的地方',
      scenes: withSelected(C.SCENES, d.scenes),
      prefers: withSelected(C.PREFER_OPTIONS, [d.prefer]),
      companies: withSelected(C.COMPANY_OPTIONS, [d.company]),
      moods: withSelected(C.MOOD_OPTIONS, [d.mood]),
      budgetMax: d.budgetMax,
      budgetStrict: false,
      timeMax: d.timeMax,
      timeStrict: false,
      candidatesText: '',
    });
  },
});
