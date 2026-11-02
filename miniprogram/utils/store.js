/**
 * EatFlow 本地数据层
 * 全部数据保存在小程序本地存储，不上传、不联网。
 * 所有方法返回 { data, error }，不抛异常，便于页面统一处理。
 */

const BUILTIN = require('../data/candidates');

const KEY_CARD = 'eatflow_card';
const KEY_HISTORY = 'eatflow_history';
const KEY_USER_CANDIDATES = 'eatflow_user_candidates';
const KEY_DISABLED_BUILTINS = 'eatflow_disabled_builtins';
const KEY_SETTINGS = 'eatflow_settings';
const KEY_LAST_DEMAND = 'eatflow_last_demand';

const DEFAULT_SETTINGS = {
  onboarded: false, // 是否完成首次建档
  recordHistory: true, // 是否记录历史（用户可关闭）
  // 安全开关：周边店铺 POI 不含食材信息，无法核验过敏原。
  // 开启（默认）时，若卡片填了过敏/禁忌，这些店铺不进候选池。
  strictAllergy: true,
};

function safeGet(key, fallback) {
  try {
    const v = wx.getStorageSync(key);
    return v === '' || v === null || v === undefined ? fallback : v;
  } catch (e) {
    return { __error: e };
  }
}

function safeSet(key, value) {
  try {
    wx.setStorageSync(key, value);
    return { data: true, error: null };
  } catch (e) {
    return { data: null, error: 'STORE_WRITE_FAILED' };
  }
}

function read(key, fallback) {
  const v = safeGet(key, fallback);
  if (v && v.__error) return { data: fallback, error: 'STORE_READ_FAILED' };
  return { data: v, error: null };
}

/* ---------------- 初始化 ---------------- */

function initDefaults() {
  const s = read(KEY_SETTINGS, null);
  if (!s.error && !s.data) safeSet(KEY_SETTINGS, DEFAULT_SETTINGS);
}

/* ---------------- 设置 ---------------- */

function getSettings() {
  const r = read(KEY_SETTINGS, DEFAULT_SETTINGS);
  return Object.assign({}, DEFAULT_SETTINGS, r.data || {});
}

function saveSettings(patch) {
  const next = Object.assign({}, getSettings(), patch || {});
  return safeSet(KEY_SETTINGS, next);
}

/* ---------------- 长期卡片 ---------------- */

function getCard() {
  const r = read(KEY_CARD, null);
  return r.data;
}

function saveCard(card) {
  const next = Object.assign({}, card || {}, { updatedAt: Date.now() });
  return safeSet(KEY_CARD, next);
}

function clearCard() {
  try {
    wx.removeStorageSync(KEY_CARD);
    return { data: true, error: null };
  } catch (e) {
    return { data: null, error: 'STORE_WRITE_FAILED' };
  }
}

/* ---------------- 历史 ---------------- */

function getHistory() {
  const r = read(KEY_HISTORY, []);
  return Array.isArray(r.data) ? r.data : [];
}

function addHistory(entry) {
  const list = getHistory();
  const item = Object.assign({ id: 'h' + Date.now() + Math.floor(Math.random() * 1000), ts: Date.now() }, entry);
  list.unshift(item);
  if (list.length > 500) list.length = 500;
  const r = safeSet(KEY_HISTORY, list);
  return r.error ? r : { data: item, error: null };
}

function updateHistory(id, patch) {
  const list = getHistory();
  let hit = null;
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      list[i] = Object.assign({}, list[i], patch);
      hit = list[i];
      break;
    }
  }
  if (!hit) return { data: null, error: 'NOT_FOUND_OR_FORBIDDEN' };
  const r = safeSet(KEY_HISTORY, list);
  return r.error ? r : { data: hit, error: null };
}

function removeHistory(id) {
  const list = getHistory().filter((h) => h.id !== id);
  return safeSet(KEY_HISTORY, list);
}

function clearHistory() {
  return safeSet(KEY_HISTORY, []);
}

/* ---------------- 候选池 ---------------- */

function getDisabledBuiltins() {
  const r = read(KEY_DISABLED_BUILTINS, []);
  return Array.isArray(r.data) ? r.data : [];
}

function toggleBuiltin(id, disabled) {
  let list = getDisabledBuiltins();
  if (disabled) {
    if (list.indexOf(id) < 0) list.push(id);
  } else {
    list = list.filter((x) => x !== id);
  }
  return safeSet(KEY_DISABLED_BUILTINS, list);
}

function getUserCandidates() {
  const r = read(KEY_USER_CANDIDATES, []);
  return Array.isArray(r.data) ? r.data : [];
}

function saveUserCandidates(list) {
  return safeSet(KEY_USER_CANDIDATES, Array.isArray(list) ? list : []);
}

/**
 * 全量候选 = 内置 - 已关闭 + 用户自建
 */
function getAllCandidates() {
  const disabled = getDisabledBuiltins();
  const builtins = BUILTIN.filter((x) => disabled.indexOf(x.id) < 0).map((x) => Object.assign({ source: 'builtin' }, x));
  const mine = getUserCandidates().map((x) => Object.assign({ source: 'user' }, x));
  return builtins.concat(mine);
}

function getCandidateById(id) {
  return getAllCandidates().find((x) => x.id === id) || null;
}

/* ---------------- 上次需求记忆 ---------------- */

function getLastDemand() {
  const r = read(KEY_LAST_DEMAND, null);
  return r.data;
}

function saveLastDemand(demand) {
  return safeSet(KEY_LAST_DEMAND, demand);
}

module.exports = {
  initDefaults,
  getSettings,
  saveSettings,
  getCard,
  saveCard,
  clearCard,
  getHistory,
  addHistory,
  updateHistory,
  removeHistory,
  clearHistory,
  getDisabledBuiltins,
  toggleBuiltin,
  getUserCandidates,
  saveUserCandidates,
  getAllCandidates,
  getCandidateById,
  getLastDemand,
  saveLastDemand,
};
