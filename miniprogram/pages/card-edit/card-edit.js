const store = require('../../utils/store');
const C = require('../../utils/constants');

function chips(presets, picked) {
  const ids = {};
  const list = [];
  ;(picked || []).forEach((x) => {
    if (!ids[x]) {
      ids[x] = true;
      list.push({ id: x, label: x, selected: true });
    }
  });
  presets.forEach((x) => {
    if (!ids[x]) {
      ids[x] = true;
      list.push({ id: x, label: x, selected: false });
    }
  });
  return list;
}

Page({
  data: {
    campus: '',
    allergies: [],
    taboos: [],
    dislikes: [],
    tastes: [],
    diningModes: [],
    customAllergy: '',
    customTaboo: '',
    customDislike: '',
    budget: 20,
    favoritePlaces: '',
    saving: false,
  },

  onLoad() {
    const card = store.getCard();
    if (!card) {
      wx.redirectTo({ url: '/pages/onboard/onboard' });
      return;
    }
    this.setData({
      campus: card.campus || '',
      allergies: chips(C.ALLERGY_PRESETS, card.allergies),
      taboos: chips(C.TABOO_PRESETS, card.taboos),
      dislikes: chips(C.DISLIKE_PRESETS, card.dislikes),
      tastes: chips(C.TASTE_TAGS, card.tastes),
      diningModes: chips(C.DINING_MODES, card.diningModes),
      budget: card.budget || 20,
      favoritePlaces: (card.favoritePlaces || []).join('、'),
    });
  },

  toggle(e) {
    const list = e.currentTarget.dataset.list;
    const id = e.currentTarget.dataset.id;
    const next = this.data[list].map((x) => (x.id === id ? Object.assign({}, x, { selected: !x.selected }) : x));
    const patch = {};
    patch[list] = next;
    this.setData(patch);
  },

  onCustomInput(e) {
    const type = e.currentTarget.dataset.type;
    const key = 'custom' + type.charAt(0).toUpperCase() + type.slice(1);
    const patch = {};
    patch[key] = e.detail.value;
    this.setData(patch);
  },

  addCustom(e) {
    const type = e.currentTarget.dataset.type;
    const key = 'custom' + type.charAt(0).toUpperCase() + type.slice(1);
    const value = (this.data[key] || '').trim();
    if (!value || this.data[type].some((x) => x.id === value)) {
      const patch = {};
      patch[key] = '';
      this.setData(patch);
      return;
    }
    const patch = {};
    patch[type] = this.data[type].concat([{ id: value, label: value, selected: true }]);
    patch[key] = '';
    this.setData(patch);
  },

  onCampus(e) {
    this.setData({ campus: e.detail.value });
  },

  onBudget(e) {
    this.setData({ budget: Number(e.detail.value) || 0 });
  },

  onFavorite(e) {
    this.setData({ favoritePlaces: e.detail.value });
  },

  save() {
    if (this.data.saving) return;
    const d = this.data;
    const sel = (list) => list.filter((x) => x.selected).map((x) => x.id);
    const card = {
      version: 1,
      campus: d.campus.trim() || '示例大学 · 中心校区',
      allergies: sel(d.allergies),
      taboos: sel(d.taboos),
      dislikes: sel(d.dislikes),
      budget: d.budget,
      tastes: sel(d.tastes),
      diningModes: sel(d.diningModes),
      favoritePlaces: d.favoritePlaces
        .split(/[、,，\s]+/)
        .map((s) => s.trim())
        .filter(Boolean),
      updatedAt: Date.now(),
    };
    if (!card.allergies.length && !card.taboos.length) {
      wx.showModal({
        title: '过敏 / 禁忌都是空的',
        content: '这两项是硬约束的来源，空着会有安全风险。确定要这样保存吗？',
        confirmText: '仍要保存',
        confirmColor: '#D9482B',
        cancelText: '回去补',
        success: (res) => {
          if (res.confirm) this.doSave(card);
        },
      });
      return;
    }
    this.doSave(card);
  },

  doSave(card) {
    this.setData({ saving: true });
    const r = store.saveCard(card);
    this.setData({ saving: false });
    if (r.error) {
      wx.showToast({ title: '保存失败', icon: 'none' });
      return;
    }
    wx.showToast({ title: '已更新卡片', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 600);
  },

  removeCard() {
    wx.showModal({
      title: '删除卡片？',
      content: '会清空长期卡片并回到首次建档，历史记录仍保留。',
      confirmText: '删除',
      confirmColor: '#D9482B',
      success: (res) => {
        if (!res.confirm) return;
        store.clearCard();
        store.saveSettings({ onboarded: false });
        getApp().globalData.session.demand = null;
        wx.reLaunch({ url: '/pages/onboard/onboard' });
      },
    });
  },
});
