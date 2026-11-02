const store = require('../../utils/store');
const lbs = require('../../utils/lbs');

Page({
  data: {
    hasCard: false,
    campus: '',
    safeChips: [],
    budget: 0,
    tasteChips: [],
    historyCount: 0,
    recordHistory: true,
    pendingCount: 0,
    strictAllergy: true,
    locLabel: '未设置位置',
    locDesc: '点这里选你所在的位置',
    dataSource: '内置示例数据',
  },

  onShow() {
    const card = store.getCard();
    const settings = store.getSettings();
    const history = store.getHistory();
    const safeChips = [];
    if (card) {
      (card.allergies || []).forEach((a) => safeChips.push('过敏:' + a));
      (card.taboos || []).forEach((t) => safeChips.push('忌:' + t));
      (card.dislikes || []).forEach((d) => safeChips.push('不吃:' + d));
    }
    const loc = lbs.getLocation();
    const area = loc ? lbs.inOfflineArea(loc.lat, loc.lng) : null;
    const areas = require('../../data/areas');
    let dataSource = '内置示例候选池（未接入真实位置数据）';
    if (area) dataSource = '腾讯位置服务 · ' + area.label + ' ' + area.count + ' 家真实店铺（抓取于 ' + area.fetchedAt + '）';
    else if (loc) dataSource = '内置示例数据 · 该位置需开通云开发后联网搜索';

    this.setData({
      hasCard: !!card,
      campus: card ? card.campus : '',
      safeChips,
      budget: card ? card.budget : 0,
      tasteChips: card ? card.tastes || [] : [],
      historyCount: history.length,
      recordHistory: settings.recordHistory,
      pendingCount: history.filter((h) => h.chosen && !h.rating).length,
      strictAllergy: settings.strictAllergy !== false,
      locLabel: loc ? loc.label : '未设置位置',
      locDesc: loc ? (area ? area.label : loc.address || loc.tag || '该位置需联网搜索') : '点这里选你所在的位置',
      dataSource: dataSource,
    });
  },

  goCardEdit() {
    wx.navigateTo({ url: '/pages/card-edit/card-edit' });
  },

  goCandidates() {
    wx.navigateTo({ url: '/pages/candidates/candidates' });
  },

  goHistory() {
    wx.switchTab({ url: '/pages/history/history' });
  },

  goLocation() {
    wx.navigateTo({ url: '/pages/location/location' });
  },

  onStrictToggle(e) {
    const on = e.detail.value;
    store.saveSettings({ strictAllergy: on });
    this.setData({ strictAllergy: on });
    wx.showToast({
      title: on ? '已开启：无法核验食材的店铺不推荐' : '已关闭：这类店铺会带「食材未核验」标记',
      icon: 'none',
      duration: 2200,
    });
  },

  clearPoiCache() {
    lbs.clearCache();
    wx.showToast({ title: '已清除周边缓存', icon: 'success' });
  },

  onRecordToggle(e) {
    const on = e.detail.value;
    store.saveSettings({ recordHistory: on });
    this.setData({ recordHistory: on });
    wx.showToast({ title: on ? '已开启记录' : '已关闭记录', icon: 'none' });
  },

  clearHistory() {
    wx.showModal({
      title: '清除全部历史？',
      content: '将删除所有推荐与反馈记录，卡片和候选池不受影响，且无法恢复。',
      confirmText: '清除',
      confirmColor: '#D9482B',
      success: (res) => {
        if (!res.confirm) return;
        store.clearHistory();
        this.setData({ historyCount: 0, pendingCount: 0 });
        wx.showToast({ title: '已清除', icon: 'success' });
      },
    });
  },
});
