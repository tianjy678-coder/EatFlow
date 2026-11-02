const store = require('../../utils/store');
const C = require('../../utils/constants');

const EXTRA_TAGS = ['热食', '凉', '汤', '面食', '米饭', '轻食', '自选', '实惠', '尝新', '荤', '素'];
const ALL_TAGS = C.TASTE_TAGS.concat(EXTRA_TAGS);

const HOUR_PRESETS = [
  { id: 'all', label: '全天', hours: [[0, 24]] },
  { id: 'campus', label: '食堂时段', hours: [[6.5, 9.5], [10.5, 13.5], [16.5, 19.5]] },
  { id: 'day', label: '白天', hours: [[8, 20]] },
  { id: 'night', label: '夜宵', hours: [[16.5, 23.5]] },
];

function mkChips(list, picked) {
  const ids = {};
  const out = [];
  const push = (id, label, selected) => {
    if (ids[id]) return;
    ids[id] = true;
    out.push({ id, label, selected });
  };
  (picked || []).forEach((p) => push(p, p, true));
  list.forEach((x) => {
    if (typeof x === 'string') push(x, x, false);
    else push(x.id, x.label, false);
  });
  return out;
}

const EMPTY_FORM = {
  name: '',
  venue: '',
  price: 15,
  waitMin: 10,
  walkMin: 5,
  ingredients: '',
  hot: true,
  shareable: false,
};

Page({
  data: {
    builtin: [],
    mine: [],
    tab: 'mine',
    editing: false,
    editingId: null,
    form: null,
    formScene: [],
    formTags: [],
    formSpicy: [],
    formHours: [],
    builtinOnCount: 0,
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const disabled = store.getDisabledBuiltins();
    const BUILTIN = require('../../data/candidates');
    const builtin = BUILTIN.map((x) => ({
      id: x.id,
      name: x.name,
      venue: x.venue,
      price: '¥' + x.price,
      scene: x.scene,
      on: disabled.indexOf(x.id) < 0,
    }));
    const mine = store.getUserCandidates().map((x) => ({
      id: x.id,
      name: x.name,
      venue: x.venue,
      price: '¥' + x.price,
      scene: x.scene,
    }));
    this.setData({
      builtin,
      mine,
      builtinOnCount: builtin.filter((x) => x.on).length,
    });
  },

  switchTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab });
  },

  toggleBuiltin(e) {
    const id = e.currentTarget.dataset.id;
    const on = e.detail.value;
    store.toggleBuiltin(id, !on);
    this.refresh();
  },

  openAdd() {
    this.setData({
      editing: true,
      editingId: null,
      form: Object.assign({}, EMPTY_FORM),
      formScene: mkChips(C.SCENES, ['食堂']),
      formTags: mkChips(ALL_TAGS, []),
      formSpicy: mkChips(['0', '1', '2', '3'], ['0']),
      formHours: mkChips(HOUR_PRESETS, ['campus']),
    });
  },

  openEdit(e) {
    const id = e.currentTarget.dataset.id;
    const item = store.getUserCandidates().find((x) => x.id === id);
    if (!item) return;
    this.setData({
      editing: true,
      editingId: id,
      form: {
        name: item.name,
        venue: item.venue,
        price: item.price,
        waitMin: item.waitMin,
        walkMin: item.walkMin,
        ingredients: (item.ingredients || []).join('、'),
        hot: !!item.hot,
        shareable: !!item.shareable,
      },
      formScene: mkChips(C.SCENES, [item.scene]),
      formTags: mkChips(ALL_TAGS, item.tags || []),
      formSpicy: mkChips(['0', '1', '2', '3'], [String(item.spicy || 0)]),
      formHours: mkChips(HOUR_PRESETS, [this.hourPresetOf(item.hours)]),
    });
  },

  hourPresetOf(hours) {
    const key = JSON.stringify(hours || []);
    const hit = HOUR_PRESETS.find((x) => JSON.stringify(x.hours) === key);
    return hit ? hit.id : 'all';
  },

  closeForm() {
    this.setData({ editing: false, editingId: null });
  },

  toggleFormChip(e) {
    const key = e.currentTarget.dataset.key;
    const id = e.currentTarget.dataset.id;
    const multi = e.currentTarget.dataset.multi === '1';
    const next = this.data[key].map((x) => {
      if (multi) return x.id === id ? Object.assign({}, x, { selected: !x.selected }) : x;
      return Object.assign({}, x, { selected: x.id === id });
    });
    const patch = {};
    patch[key] = next;
    this.setData(patch);
  },

  onFormInput(e) {
    const key = e.currentTarget.dataset.key;
    const form = Object.assign({}, this.data.form);
    form[key] = e.detail.value;
    this.setData({ form });
  },

  onFormNumber(e) {
    const key = e.currentTarget.dataset.key;
    const form = Object.assign({}, this.data.form);
    form[key] = Number(e.detail.value) || 0;
    this.setData({ form });
  },

  onFormSwitch(e) {
    const key = e.currentTarget.dataset.key;
    const form = Object.assign({}, this.data.form);
    form[key] = e.detail.value;
    this.setData({ form });
  },

  submitForm() {
    const f = this.data.form;
    if (!f.name.trim()) {
      wx.showToast({ title: '先填个名字', icon: 'none' });
      return;
    }
    const single = (list) => {
      const hit = list.find((x) => x.selected);
      return hit ? hit.id : list[0].id;
    };
    const multi = (list) => list.filter((x) => x.selected).map((x) => x.id);

    const hourPreset = single(this.data.formHours);
    const hoursObj = HOUR_PRESETS.find((x) => x.id === hourPreset) || HOUR_PRESETS[0];

    const item = {
      name: f.name.trim(),
      venue: f.venue.trim() || '自定义',
      scene: single(this.data.formScene),
      location: 'on',
      price: f.price,
      waitMin: f.waitMin,
      walkMin: f.walkMin,
      tags: multi(this.data.formTags),
      ingredients: f.ingredients
        .split(/[、,，\s]+/)
        .map((s) => s.trim())
        .filter(Boolean),
      spicy: Number(single(this.data.formSpicy)),
      hot: !!f.hot,
      shareable: !!f.shareable,
      hours: hoursObj.hours,
      source: 'user',
    };

    const list = store.getUserCandidates();
    if (this.data.editingId) {
      const idx = list.findIndex((x) => x.id === this.data.editingId);
      if (idx >= 0) list[idx] = Object.assign({}, list[idx], item);
    } else {
      list.unshift(Object.assign({ id: 'u' + Date.now() }, item));
    }
    store.saveUserCandidates(list);
    this.setData({ editing: false, editingId: null });
    this.refresh();
    wx.showToast({ title: '已保存', icon: 'success' });
  },

  removeMine(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除这个候选？',
      content: '只从你的自建候选里移除。',
      confirmText: '删除',
      confirmColor: '#D9482B',
      success: (res) => {
        if (!res.confirm) return;
        store.saveUserCandidates(store.getUserCandidates().filter((x) => x.id !== id));
        this.refresh();
      },
    });
  },
});
