const store = require('../../utils/store');
const C = require('../../utils/constants');

Page({
  data: {
    entry: null,
    missing: false,
    ateOptions: [
      { id: 'yes', label: '吃了', selected: false },
      { id: 'no', label: '没吃', selected: false },
    ],
    ratingOptions: [
      { id: 'up', label: '👍 满意', selected: false },
      { id: 'mid', label: '👌 还行', selected: false },
      { id: 'down', label: '👎 不满意', selected: false },
    ],
    reasons: [],
    note: '',
    submitting: false,
  },

  onLoad(options) {
    const history = store.getHistory();
    let entry = null;
    if (options && options.id) {
      entry = history.find((h) => h.id === options.id) || null;
    } else {
      entry = history.find((h) => h.chosen && !h.rating) || null;
    }
    if (!entry) {
      this.setData({ missing: true });
      return;
    }
    // 已有反馈时回填
    const ateOptions = this.data.ateOptions.map((x) => Object.assign({}, x, { selected: x.id === entry.ate }));
    const ratingOptions = this.data.ratingOptions.map((x) => Object.assign({}, x, { selected: x.id === entry.rating }));
    this.setData({ entry, ateOptions, ratingOptions, note: entry.note || '' });
    if (entry.rating) this.buildReasons(entry.rating, entry.reasons || []);
  },

  buildReasons(rating, picked) {
    const source = rating === 'down' ? C.BAD_REASONS : C.GOOD_REASONS;
    this.setData({
      reasons: source.map((r) => ({ id: r, label: r, selected: (picked || []).indexOf(r) >= 0 })),
    });
  },

  toggleAte(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      ateOptions: this.data.ateOptions.map((x) => Object.assign({}, x, { selected: x.id === id })),
    });
  },

  toggleRating(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      ratingOptions: this.data.ratingOptions.map((x) => Object.assign({}, x, { selected: x.id === id })),
    });
    this.buildReasons(id, []);
  },

  toggleReason(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      reasons: this.data.reasons.map((x) => (x.id === id ? Object.assign({}, x, { selected: !x.selected }) : x)),
    });
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value });
  },

  submit() {
    if (this.data.submitting) return;
    const ate = this.data.ateOptions.find((x) => x.selected);
    const rating = this.data.ratingOptions.find((x) => x.selected);

    if (!ate) {
      wx.showToast({ title: '先选一下吃没吃', icon: 'none' });
      return;
    }
    if (!rating) {
      wx.showToast({ title: '选一个满意度吧', icon: 'none' });
      return;
    }
    const reasons = this.data.reasons.filter((x) => x.selected).map((x) => x.id);

    this.setData({ submitting: true });
    const r = store.updateHistory(this.data.entry.id, {
      ate: ate.id,
      rating: rating.id,
      reasons,
      note: this.data.note.trim(),
    });
    this.setData({ submitting: false });

    if (r.error) {
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
      return;
    }
    wx.showToast({ title: '记好了，谢谢！', icon: 'success' });
    setTimeout(() => {
      wx.switchTab({ url: '/pages/history/history' });
    }, 700);
  },

  skip() {
    wx.switchTab({ url: '/pages/index/index' });
  },
});
