const store = require('../../utils/store');
const C = require('../../utils/constants');

function chips(list, picked) {
  return list.map((x) => ({ id: x, label: x, selected: (picked || []).indexOf(x) >= 0 }));
}

function pick(list) {
  return list.filter((x) => x.selected).map((x) => x.id);
}

Page({
  data: {
    step: 0,
    allergies: chips(C.ALLERGY_PRESETS, []),
    taboos: chips(C.TABOO_PRESETS, []),
    dislikes: chips(C.DISLIKE_PRESETS, []),
    tastes: chips(C.TASTE_TAGS, []),
    diningModes: chips(C.DINING_MODES, ['食堂']),
    customAllergy: '',
    customTaboo: '',
    customDislike: '',
    budget: 20,
    campus: '示例大学 · 中心校区',
    review: null,
    safeWarning: false,
  },

  addCustom(e) {
    const type = e.currentTarget.dataset.type;
    const key = 'custom' + type.charAt(0).toUpperCase() + type.slice(1);
    const listKey = type;
    const value = (this.data[key] || '').trim();
    if (!value) return;
    const list = this.data[listKey];
    if (list.some((x) => x.id === value)) {
      this.setData(this.obj(key, ''));
      return;
    }
    const patch = this.obj(listKey, list.concat([{ id: value, label: value, selected: true }]));
    patch[key] = '';
    this.setData(patch);
  },

  obj(key, value) {
    const o = {};
    o[key] = value;
    return o;
  },

  onCustomInput(e) {
    const type = e.currentTarget.dataset.type;
    const key = 'custom' + type.charAt(0).toUpperCase() + type.slice(1);
    this.setData(this.obj(key, e.detail.value));
  },

  toggle(e) {
    const list = e.currentTarget.dataset.list;
    const id = e.currentTarget.dataset.id;
    const next = this.data[list].map((x) => (x.id === id ? Object.assign({}, x, { selected: !x.selected }) : x));
    this.setData(this.obj(list, next));
  },

  onBudget(e) {
    this.setData({ budget: Number(e.detail.value) || 0 });
  },

  onCampus(e) {
    this.setData({ campus: e.detail.value });
  },

  nextStep() {
    const step = this.data.step;
    if (step === 0) {
      this.setData({ step: 1 });
      return;
    }
    if (step === 1) {
      const hasSafe = pick(this.data.allergies).length || pick(this.data.taboos).length;
      if (!hasSafe) {
        this.setData({ safeWarning: true });
        return;
      }
      this.setData({ step: 2, safeWarning: false, review: this.buildReview() });
      return;
    }
    this.finish();
  },

  skipSafe() {
    this.setData({ step: 2, safeWarning: false, review: this.buildReview() });
  },

  prevStep() {
    this.setData({ step: Math.max(0, this.data.step - 1) });
  },

  buildReview() {
    const allergies = pick(this.data.allergies);
    const taboos = pick(this.data.taboos);
    const dislikes = pick(this.data.dislikes);
    const tastes = pick(this.data.tastes);
    const diningModes = pick(this.data.diningModes);
    return {
      campus: this.data.campus,
      allergies,
      taboos,
      dislikes,
      tastes,
      diningModes,
      budget: this.data.budget,
      safeText: allergies.concat(taboos).join('、') || '未填写',
    };
  },

  finish() {
    const r = this.data.review || this.buildReview();
    const card = {
      version: 1,
      campus: r.campus,
      allergies: r.allergies,
      taboos: r.taboos,
      dislikes: r.dislikes,
      budget: r.budget,
      tastes: r.tastes,
      diningModes: r.diningModes.length ? r.diningModes : ['食堂'],
      favoritePlaces: [],
      updatedAt: Date.now(),
    };
    store.saveCard(card);
    store.saveSettings({ onboarded: true });
    // 文档 5.1：直接进入第一次决策，不再要求填问卷
    getApp().globalData.session.demand = null;
    wx.reLaunch({ url: '/pages/demand/demand' });
  },
});
