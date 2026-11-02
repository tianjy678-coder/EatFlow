/**
 * EatFlow 全局字典与常量
 */

// 用餐场景（长期卡片 + 本次需求共用）
const SCENES = ['食堂', '校外餐馆', '外卖', '自炊', '零食'];

// 现在在哪（本次需求）：影响可达时间
const LOCATIONS = [
  { id: 'dorm', label: '宿舍' },
  { id: 'classroom', label: '教学楼' },
  { id: 'library', label: '图书馆' },
  { id: 'gym', label: '操场/健身房' },
  { id: 'offcampus', label: '校外' },
];

// 口味标签（卡片倾向 + 候选池标签共用）
const TASTE_TAGS = ['辣', '清淡', '甜', '酸', '咸香', '重口', '鲜'];

// 常见用餐方式
const DINING_MODES = ['食堂', '校外餐馆', '外卖', '自炊', '零食'];

// 冷热 / 清淡倾向
const PREFER_OPTIONS = [
  { id: 'any', label: '都行', emoji: '🤷' },
  { id: 'hot', label: '想吃热乎的', emoji: '🔥' },
  { id: 'light', label: '想吃清淡的', emoji: '🥗' },
];

// 心情 / 尝新倾向
const MOOD_OPTIONS = [
  { id: 'any', label: '无所谓', emoji: '🤔' },
  { id: 'familiar', label: '想吃熟悉的', emoji: '🏠' },
  { id: 'new', label: '想尝点新的', emoji: '🎲' },
];

// 人数
const COMPANY_OPTIONS = [
  { id: 'solo', label: '一个人吃', emoji: '🙋' },
  { id: 'group', label: '和同学一起', emoji: '👥' },
];

// 反馈不满意原因
const BAD_REASONS = ['太贵了', '等太久', '不好吃', '重复吃腻了', '分量不行', '不顺路'];

// 反馈满意原因
const GOOD_REASONS = ['好吃', '便宜实惠', '快', '顺路方便', '正合口味', '尝新成功'];

// 过敏常见项（供快速勾选）
const ALLERGY_PRESETS = ['花生', '海鲜', '鸡蛋', '牛奶', '大豆', '麸质', '芒果', '芝麻'];
// 禁忌常见项
const TABOO_PRESETS = ['猪肉', '牛肉', '羊肉', '动物内脏', '酒精', '狗肉', '鸡肉'];
// 常见不喜欢的食材
const DISLIKE_PRESETS = ['香菜', '苦瓜', '芹菜', '胡萝卜', '洋葱', '辣椒', '姜', '肥肉'];

// 默认卡片
const DEFAULT_CARD = {
  version: 1,
  campus: '示例大学 · 中心校区',
  allergies: [],
  taboos: [],
  dislikes: [],
  budget: 20,
  tastes: [],
  diningModes: ['食堂'],
  favoritePlaces: [],
  updatedAt: 0,
};

// 默认本次需求
const DEFAULT_DEMAND = {
  location: 'dorm',
  scenes: ['食堂', '外卖'],
  budgetMax: 20,
  budgetStrict: false,
  timeMax: 45,
  timeStrict: false,
  prefer: 'any',
  company: 'solo',
  mood: 'any',
  candidatesText: '',
};

module.exports = {
  SCENES,
  LOCATIONS,
  TASTE_TAGS,
  DINING_MODES,
  PREFER_OPTIONS,
  MOOD_OPTIONS,
  COMPANY_OPTIONS,
  BAD_REASONS,
  GOOD_REASONS,
  ALLERGY_PRESETS,
  TABOO_PRESETS,
  DISLIKE_PRESETS,
  DEFAULT_CARD,
  DEFAULT_DEMAND,
};
