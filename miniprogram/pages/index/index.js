const store = require('../../utils/store');
const C = require('../../utils/constants');
const lbs = require('../../utils/lbs');

function buildDemandSummary(d) {
  const parts = [];
  const loc = lbs.getLocation();
  if (loc) parts.push('在' + loc.label);
  else {
    const l = C.LOCATIONS.find((x) => x.id === d.location);
    if (l) parts.push('在' + l.label);
  }
  if (d.scenes && d.scenes.length) parts.push(d.scenes.join('/'));
  parts.push(d.budgetStrict ? '预算严格 ≤¥' + d.budgetMax : '预算约 ¥' + d.budgetMax + ' 以内');
  parts.push(d.timeStrict ? '时间严格 ≤' + d.timeMax + ' 分钟' : '约 ' + d.timeMax + ' 分钟以内');
  const pref = C.PREFER_OPTIONS.find((x) => x.id === d.prefer);
  if (pref && pref.id !== 'any') parts.push(pref.label);
  const mood = C.MOOD_OPTIONS.find((x) => x.id === d.mood);
  if (mood && mood.id !== 'any') parts.push(mood.label);
  const comp = C.COMPANY_OPTIONS.find((x) => x.id === d.company);
  if (comp) parts.push(comp.label);
  return parts.join(' · ');
}

function buildCardSummary(card) {
  const safe = [];
  (card.allergies || []).forEach((a) => safe.push('过敏:' + a));
  (card.taboos || []).forEach((t) => safe.push('忌:' + t));
  return {
    safe,
    budget: card.budget,
    tastes: card.tastes || [],
    modes: card.diningModes || [],
    campus: card.campus,
  };
}

Page({
  data: {
    slogan: 'Food is All You Need',
    hasCard: false,
    cardSummary: null,
    demand: null,
    demandSummary: '',
    pending: null,
    poolCount: 0,
    locLabel: '',
    locDesc: '',
  },

  onShow() {
    const card = store.getCard();
    if (!card) {
      wx.redirectTo({ url: '/pages/onboard/onboard' });
      return;
    }
    const session = getApp().globalData.session;
    const demand = session.demand || store.getLastDemand() || C.DEFAULT_DEMAND;
    session.demand = demand;

    const history = store.getHistory();
    const pending = history.find((h) => h.chosen && !h.rating) || null;
    const self = this;
    const loc = lbs.getLocation();

    this.setData({
      hasCard: true,
      cardSummary: buildCardSummary(card),
      demand,
      demandSummary: buildDemandSummary(demand),
      pending,
      locLabel: loc ? loc.label : '未设置位置',
      locDesc: loc ? (loc.ts ? loc.tag || loc.address || '已选位置' : '默认位置 · 点这里切换') : '点这里选你所在的位置',
    });

    lbs.buildPool(loc).then((pool) => {
      self.setData({ poolCount: pool.items.length });
    });
  },

  goLocation() {
    wx.navigateTo({ url: '/pages/location/location' });
  },

  goDemand() {
    wx.navigateTo({ url: '/pages/demand/demand' });
  },

  startDecide() {
    wx.navigateTo({ url: '/pages/result/result' });
  },

  goCardEdit() {
    wx.navigateTo({ url: '/pages/card-edit/card-edit' });
  },

  goFeedback() {
    wx.navigateTo({ url: '/pages/feedback/feedback?id=' + this.data.pending.id });
  },
});
