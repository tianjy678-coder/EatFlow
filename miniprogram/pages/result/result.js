const store = require('../../utils/store');
const R = require('../../utils/recommend');
const lbs = require('../../utils/lbs');

function decoratePick(p, demand) {
  const item = p.item;
  const isPoi = item.source === 'lbs';
  const flags = [];
  if (item.priceEstimated) flags.push('人均按品类估算');
  if (item.waitEstimated) flags.push('出餐时长为估算');
  if (item.hoursUnknown) flags.push('营业时间未核实');
  if (item.ingredientsUnknown) flags.push('食材未核验');
  if (isPoi && !item.walkReal) flags.push('步行按直线估算');
  return {
    id: item.id,
    name: item.name,
    venue: item.venue,
    scene: item.scene,
    price: R.fmtPrice(item.price),
    spicy: item.spicy,
    totalMin: R.totalTime(item, demand || {}),
    walkMin: isPoi ? R.walkFrom(item, (demand || {}).location) : null,
    distanceText: isPoi ? lbs.fmtDistance(item.distance) : '',
    category: item.category || '',
    flags: flags,
    tags: item.tags || [],
    whyMe: p.reasons.whyMe,
    whyNow: p.reasons.whyNow,
    tradeoffs: p.reasons.tradeoffs,
    next: p.reasons.next,
  };
}

Page({
  data: {
    loading: true,
    hasCard: true,
    picks: [],
    poolSize: 0,
    qualifiedCount: 0,
    conflicts: [],
    relax: [],
    offset: 0,
    chosen: null,
    empty: false,
    sourceText: '',
  },

  onLoad() {
    const card = store.getCard();
    if (!card) {
      wx.redirectTo({ url: '/pages/onboard/onboard' });
      return;
    }
    this.card = card;
    this.compute(0);
  },

  compute(offset) {
    const session = getApp().globalData.session;
    const demand = session.demand || store.getLastDemand();
    if (!demand) {
      wx.redirectTo({ url: '/pages/demand/demand' });
      return;
    }
    this.demand = demand;
    const location = lbs.getLocation();
    lbs.buildPool(location).then((pool) => {
      if (!this.demand) return; // 页面已离开
      const history = store.getSettings().recordHistory ? store.getHistory() : [];
      const out = R.recommend({ card: this.card, demand, history, offset, pool: pool.items });
      // 转盘要用同一个合格池
      getApp().globalData.session.qualifiedPool = out.qualifiedPool || [];
      this.setData({
        loading: false,
        offset,
        sourceText: pool.message || '',
        picks: out.picks.map((p) => decoratePick(p, demand)),
        poolSize: out.poolSize,
        qualifiedCount: out.qualifiedCount,
        conflicts: out.conflicts,
        relax: out.relax,
        empty: out.picks.length === 0,
        canShuffle: out.qualifiedCount > 3,
        chosen: null,
      });
    });
  },

  shuffle() {
    this.compute(this.data.offset + 1);
  },

  choose(e) {
    const id = e.currentTarget.dataset.id;
    const pick = this.data.picks.find((p) => p.id === id);
    if (!pick) return;
    let item = store.getCandidateById(id);
    if (!item) {
      // 周边店铺不在本地存储里，从本次合格池取
      const pool = (getApp().globalData.session.qualifiedPool || []);
      item = pool.find((x) => x.id === id) || null;
    }
    if (!item) return;

    const entry = store.addHistory({
      itemId: item.id,
      name: item.name,
      venue: item.venue,
      price: item.price,
      scene: item.scene,
      chosen: true,
      ate: null,
      rating: null,
      reason: null,
    });

    const session = getApp().globalData.session;
    session.chosen = entry;
    this.setData({ chosen: entry });
  },

  goFeedback() {
    wx.redirectTo({ url: '/pages/feedback/feedback?id=' + this.data.chosen.id });
  },

  goWheel() {
    wx.navigateTo({ url: '/pages/wheel/wheel' });
  },

  goDemand() {
    wx.redirectTo({ url: '/pages/demand/demand' });
  },

  applyRelax(e) {
    const idx = e.currentTarget.dataset.idx;
    const suggestion = this.data.relax[idx];
    if (!suggestion || !suggestion.patch) return;
    const demand = Object.assign({}, this.demand, suggestion.patch);
    const session = getApp().globalData.session;
    session.demand = demand;
    store.saveLastDemand(demand);
    this.demand = demand;
    this.compute(0);
  },
});
