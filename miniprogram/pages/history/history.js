const store = require('../../utils/store');

function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

function fmt(ts) {
  const d = new Date(ts);
  return pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function statusOf(h) {
  if (h.chosen && !h.rating) return { text: '待反馈', cls: 'st-pending' };
  if (h.ate === 'no') return { text: '没吃', cls: 'st-mute' };
  if (h.rating === 'up') return { text: '👍 满意', cls: 'st-good' };
  if (h.rating === 'mid') return { text: '👌 还行', cls: 'st-mute' };
  if (h.rating === 'down') return { text: '👎 不满意', cls: 'st-bad' };
  return { text: '已选择', cls: 'st-mute' };
}

Page({
  data: {
    list: [],
    recordHistory: true,
    pendingCount: 0,
    loaded: false,
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const history = store.getHistory();
    const settings = store.getSettings();
    const list = history.map((h) => ({
      id: h.id,
      name: h.name,
      venue: h.venue || '',
      price: h.price ? '¥' + h.price : '',
      time: fmt(h.ts),
      reason: h.reason || '',
      reasons: (h.reasons || []).join('、'),
      note: h.note || '',
      status: statusOf(h),
    }));
    this.setData({
      loaded: true,
      list,
      recordHistory: settings.recordHistory,
      pendingCount: history.filter((h) => h.chosen && !h.rating).length,
    });
  },

  goFeedback(e) {
    wx.navigateTo({ url: '/pages/feedback/feedback?id=' + e.currentTarget.dataset.id });
  },

  goIndex() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  removeOne(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除这条记录？',
      content: '只删这一条，不影响其它记录。',
      confirmText: '删除',
      confirmColor: '#D9482B',
      success: (res) => {
        if (!res.confirm) return;
        store.removeHistory(id);
        this.refresh();
      },
    });
  },

  onRecordToggle(e) {
    const on = e.detail.value;
    store.saveSettings({ recordHistory: on });
    this.setData({ recordHistory: on });
  },

  clearAll() {
    wx.showModal({
      title: '清除全部历史？',
      content: '将删除所有记录，无法恢复。',
      confirmText: '清除',
      confirmColor: '#D9482B',
      success: (res) => {
        if (!res.confirm) return;
        store.clearHistory();
        this.refresh();
      },
    });
  },
});
