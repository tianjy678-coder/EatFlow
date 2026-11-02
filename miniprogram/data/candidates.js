/**
 * 内置候选池 —— 「示例大学 · 中心校区」周边
 *
 * 数据为人工维护的示例数据（价格 / 出餐时长为估计值，非实时信息），
 * 用户可在「我的 → 我的候选」里增删改，也可在卡片里关闭任意内置条目。
 *
 * 字段说明：
 *   scene      用餐场景（食堂/校外餐馆/外卖/自炊/零食）
 *   location   on=校内, off=校外周边
 *   price      估计价格（元）
 *   waitMin    出餐/制作等待（分钟）
 *   walkMin    从校区中心的步行时间（分钟）
 *   tags       软偏好标签
 *   ingredients 主要食材（用于过敏 / 禁忌 / 忌口硬约束）
 *   spicy      0 不辣 - 3 很辣
 *   hot        是否热食
 *   shareable  是否适合多人分食
 *   hours      营业时段（24 小时制，可为多段）
 */

const campusHours = [
  [6.5, 9.5],
  [10.5, 13.5],
  [16.5, 19.5],
];

const items = [
  // ---------------- 校内食堂 ----------------
  { id: 'b01', name: '麻辣香锅', venue: '一食堂二楼', scene: '食堂', location: 'on', price: 22, waitMin: 12, walkMin: 6, tags: ['辣', '重口', '热食', '自选', '米饭'], ingredients: ['土豆', '豆皮', '午餐肉', '青菜'], spicy: 3, hot: true, shareable: true, hours: campusHours },
  { id: 'b02', name: '黄焖鸡米饭', venue: '一食堂一楼', scene: '食堂', location: 'on', price: 18, waitMin: 10, walkMin: 5, tags: ['辣', '热食', '米饭', '咸香'], ingredients: ['鸡肉', '土豆', '香菇'], spicy: 2, hot: true, shareable: false, hours: campusHours },
  { id: 'b03', name: '兰州拉面', venue: '一食堂一楼', scene: '食堂', location: 'on', price: 15, waitMin: 8, walkMin: 5, tags: ['热食', '面食', '汤', '鲜'], ingredients: ['牛肉', '面条', '香菜', '萝卜'], spicy: 1, hot: true, shareable: false, hours: campusHours },
  { id: 'b04', name: '番茄鸡蛋盖饭', venue: '二食堂', scene: '食堂', location: 'on', price: 13, waitMin: 7, walkMin: 9, tags: ['清淡', '热食', '米饭', '酸甜'], ingredients: ['番茄', '鸡蛋', '米饭'], spicy: 0, hot: true, shareable: false, hours: campusHours },
  { id: 'b05', name: '青椒肉丝盖饭', venue: '二食堂', scene: '食堂', location: 'on', price: 15, waitMin: 7, walkMin: 9, tags: ['辣', '米饭', '热食', '咸香'], ingredients: ['猪肉', '青椒', '米饭'], spicy: 2, hot: true, shareable: false, hours: campusHours },
  { id: 'b06', name: '麻辣烫', venue: '二食堂', scene: '食堂', location: 'on', price: 17, waitMin: 10, walkMin: 9, tags: ['辣', '热食', '自选', '汤'], ingredients: ['丸子', '豆皮', '青菜', '粉丝'], spicy: 2, hot: true, shareable: false, hours: campusHours },
  { id: 'b07', name: '牛肉面', venue: '清真食堂', scene: '食堂', location: 'on', price: 16, waitMin: 8, walkMin: 12, tags: ['热食', '面食', '汤', '鲜'], ingredients: ['牛肉', '面条'], spicy: 1, hot: true, shareable: false, hours: campusHours },
  { id: 'b08', name: '大盘鸡拌面', venue: '清真食堂', scene: '食堂', location: 'on', price: 24, waitMin: 14, walkMin: 12, tags: ['辣', '重口', '面食', '热食'], ingredients: ['鸡肉', '土豆', '面条'], spicy: 3, hot: true, shareable: true, hours: campusHours },
  { id: 'b09', name: '糖醋里脊饭', venue: '一食堂一楼', scene: '食堂', location: 'on', price: 19, waitMin: 9, walkMin: 6, tags: ['甜', '酸', '米饭', '热食'], ingredients: ['猪肉', '米饭'], spicy: 0, hot: true, shareable: false, hours: campusHours },
  { id: 'b10', name: '蒸饺（8 只）', venue: '一食堂一楼', scene: '食堂', location: 'on', price: 11, waitMin: 6, walkMin: 5, tags: ['清淡', '热食', '面食'], ingredients: ['猪肉', '白菜', '面粉'], spicy: 0, hot: true, shareable: false, hours: campusHours },
  { id: 'b11', name: '凉皮', venue: '二食堂', scene: '食堂', location: 'on', price: 10, waitMin: 4, walkMin: 9, tags: ['凉', '酸', '辣', '面食'], ingredients: ['面筋', '黄瓜', '芝麻酱'], spicy: 1, hot: false, shareable: false, hours: campusHours },
  { id: 'b12', name: '酸菜鱼饭', venue: '二食堂', scene: '食堂', location: 'on', price: 23, waitMin: 13, walkMin: 9, tags: ['辣', '热食', '米饭', '鲜'], ingredients: ['鱼', '酸菜', '米饭'], spicy: 2, hot: true, shareable: false, hours: campusHours },
  { id: 'b13', name: '手抓饼加蛋', venue: '一食堂一楼', scene: '食堂', location: 'on', price: 8, waitMin: 4, walkMin: 5, tags: ['咸香', '热食', '面食', '快'], ingredients: ['面粉', '鸡蛋', '生菜'], spicy: 0, hot: true, shareable: false, hours: campusHours },
  { id: 'b14', name: '石锅拌饭', venue: '一食堂二楼', scene: '食堂', location: 'on', price: 21, waitMin: 12, walkMin: 6, tags: ['辣', '热食', '米饭', '重口'], ingredients: ['米饭', '鸡蛋', '牛肉', '泡菜'], spicy: 2, hot: true, shareable: false, hours: campusHours },
  { id: 'b15', name: '素炒时蔬套餐', venue: '二食堂', scene: '食堂', location: 'on', price: 12, waitMin: 6, walkMin: 9, tags: ['清淡', '素', '热食', '米饭', '实惠'], ingredients: ['青菜', '豆腐', '米饭'], spicy: 0, hot: true, shareable: false, hours: campusHours },
  { id: 'b16', name: '韩式部队锅', venue: '一食堂二楼', scene: '食堂', location: 'on', price: 26, waitMin: 15, walkMin: 6, tags: ['辣', '重口', '热食', '汤', '自选'], ingredients: ['午餐肉', '泡面', '年糕', '芝士'], spicy: 3, hot: true, shareable: true, hours: campusHours },

  // ---------------- 校外餐馆 ----------------
  { id: 'b17', name: '老王烧烤', venue: '小吃街', scene: '校外餐馆', location: 'off', price: 35, waitMin: 20, walkMin: 15, tags: ['辣', '重口', '荤', '自选'], ingredients: ['羊肉', '牛肉', '韭菜'], spicy: 2, hot: true, shareable: true, hours: [[16.5, 23.5]] },
  { id: 'b18', name: '重庆小面', venue: '小吃街', scene: '校外餐馆', location: 'off', price: 14, waitMin: 8, walkMin: 13, tags: ['辣', '热食', '面食', '汤'], ingredients: ['面条', '猪肉', '青菜'], spicy: 3, hot: true, shareable: false, hours: [[7, 20.5]] },
  { id: 'b19', name: '沙县小吃', venue: '小吃街', scene: '校外餐馆', location: 'off', price: 13, waitMin: 6, walkMin: 12, tags: ['实惠', '快', '热食'], ingredients: ['猪肉', '鸡蛋', '面条'], spicy: 1, hot: true, shareable: false, hours: [[7, 21]] },
  { id: 'b20', name: '螺蛳粉', venue: '小吃街', scene: '校外餐馆', location: 'off', price: 16, waitMin: 9, walkMin: 14, tags: ['辣', '酸', '重口', '热食', '面食'], ingredients: ['米粉', '酸笋', '腐竹'], spicy: 3, hot: true, shareable: false, hours: [[10, 21]] },
  { id: 'b21', name: '关东煮', venue: '小吃街', scene: '校外餐馆', location: 'off', price: 12, waitMin: 3, walkMin: 12, tags: ['清淡', '热食', '汤', '快'], ingredients: ['鱼丸', '萝卜', '海带'], spicy: 0, hot: true, shareable: false, hours: [[9, 22]] },
  { id: 'b22', name: '港式茶餐厅', venue: '小吃街', scene: '校外餐馆', location: 'off', price: 32, waitMin: 18, walkMin: 16, tags: ['清淡', '热食', '米饭', '鲜'], ingredients: ['鸡肉', '米饭', '鸡蛋'], spicy: 0, hot: true, shareable: false, hours: [[10, 21]] },
  { id: 'b23', name: '麻辣拌', venue: '小吃街', scene: '校外餐馆', location: 'off', price: 18, waitMin: 8, walkMin: 13, tags: ['辣', '自选', '热食', '重口'], ingredients: ['土豆', '豆皮', '丸子'], spicy: 2, hot: true, shareable: false, hours: [[10, 21.5]] },
  { id: 'b24', name: '比萨小站', venue: '小吃街', scene: '校外餐馆', location: 'off', price: 38, waitMin: 22, walkMin: 17, tags: ['咸香', '荤', '自选', '尝新'], ingredients: ['芝士', '面粉', '牛肉'], spicy: 0, hot: true, shareable: true, hours: [[10.5, 22]] },
  { id: 'b25', name: '日式咖喱饭', venue: '小吃街', scene: '校外餐馆', location: 'off', price: 26, waitMin: 12, walkMin: 15, tags: ['咸香', '热食', '米饭'], ingredients: ['鸡肉', '土豆', '咖喱'], spicy: 1, hot: true, shareable: false, hours: [[10.5, 21]] },
  { id: 'b26', name: '轻食沙拉', venue: '小吃街', scene: '校外餐馆', location: 'off', price: 22, waitMin: 5, walkMin: 13, tags: ['清淡', '素', '凉', '轻食', '尝新'], ingredients: ['生菜', '鸡胸肉', '玉米'], spicy: 0, hot: false, shareable: false, hours: [[9, 20.5]] },
  { id: 'b27', name: '炸鸡店', venue: '小吃街', scene: '校外餐馆', location: 'off', price: 25, waitMin: 15, walkMin: 14, tags: ['咸香', '荤', '热食', '重口'], ingredients: ['鸡肉'], spicy: 1, hot: true, shareable: true, hours: [[10.5, 22]] },

  // ---------------- 外卖 ----------------
  { id: 'b28', name: '麦当劳（外卖）', venue: '外卖', scene: '外卖', location: 'off', price: 30, waitMin: 25, walkMin: 0, tags: ['荤', '热食', '咸香'], ingredients: ['牛肉', '鸡肉', '面粉'], spicy: 1, hot: true, shareable: false, hours: [[9, 22]] },
  { id: 'b29', name: '华莱士（外卖）', venue: '外卖', scene: '外卖', location: 'off', price: 20, waitMin: 22, walkMin: 0, tags: ['荤', '实惠', '热食', '咸香'], ingredients: ['鸡肉'], spicy: 1, hot: true, shareable: false, hours: [[9, 22]] },
  { id: 'b30', name: '猪脚饭（外卖）', venue: '外卖', scene: '外卖', location: 'off', price: 22, waitMin: 25, walkMin: 0, tags: ['咸香', '热食', '米饭', '荤'], ingredients: ['猪肉', '米饭'], spicy: 1, hot: true, shareable: false, hours: [[10, 21]] },
  { id: 'b31', name: '麻辣拌（外卖）', venue: '外卖', scene: '外卖', location: 'off', price: 19, waitMin: 28, walkMin: 0, tags: ['辣', '自选', '热食'], ingredients: ['土豆', '豆皮', '丸子'], spicy: 2, hot: true, shareable: false, hours: [[10, 21]] },
  { id: 'b32', name: '粥铺（外卖）', venue: '外卖', scene: '外卖', location: 'off', price: 15, waitMin: 20, walkMin: 0, tags: ['清淡', '热食', '汤'], ingredients: ['大米', '皮蛋', '瘦肉'], spicy: 0, hot: true, shareable: false, hours: [[6.5, 22]] },
  { id: 'b33', name: '水果捞（外卖）', venue: '外卖', scene: '外卖', location: 'off', price: 15, waitMin: 15, walkMin: 0, tags: ['甜', '凉', '清淡', '零食'], ingredients: ['芒果', '西瓜', '酸奶'], spicy: 0, hot: false, shareable: false, hours: [[9, 21]] },

  // ---------------- 自炊（仅宿舍） ----------------
  { id: 'b34', name: '宿舍自煮 · 番茄鸡蛋面', venue: '宿舍', scene: '自炊', location: 'on', price: 8, waitMin: 20, walkMin: 0, tags: ['清淡', '热食', '面食', '实惠'], ingredients: ['番茄', '鸡蛋', '面条'], spicy: 0, hot: true, shareable: false, hours: [[0, 24]] },
  { id: 'b35', name: '宿舍自煮 · 速冻水饺', venue: '宿舍', scene: '自炊', location: 'on', price: 10, waitMin: 15, walkMin: 0, tags: ['热食', '面食', '实惠', '快'], ingredients: ['猪肉', '面粉', '白菜'], spicy: 0, hot: true, shareable: false, hours: [[0, 24]] },
  { id: 'b36', name: '宿舍小火锅', venue: '宿舍', scene: '自炊', location: 'on', price: 28, waitMin: 30, walkMin: 0, tags: ['辣', '重口', '热食', '自选', '汤'], ingredients: ['丸子', '蔬菜', '牛肉'], spicy: 2, hot: true, shareable: true, hours: [[0, 24]] },

  // ---------------- 零食 / 便利店 ----------------
  { id: 'b37', name: '饭团 + 关东煮', venue: '校内便利店', scene: '零食', location: 'on', price: 12, waitMin: 3, walkMin: 4, tags: ['快', '清淡', '热食', '实惠'], ingredients: ['米饭', '海苔', '鱼丸'], spicy: 0, hot: true, shareable: false, hours: [[6.5, 23]] },
  { id: 'b38', name: '三明治', venue: '校内便利店', scene: '零食', location: 'on', price: 10, waitMin: 2, walkMin: 4, tags: ['快', '凉', '轻食', '实惠'], ingredients: ['面粉', '鸡蛋', '生菜'], spicy: 0, hot: false, shareable: false, hours: [[6.5, 23]] },
  { id: 'b39', name: '芋泥波波奶茶', venue: '校内奶茶店', scene: '零食', location: 'on', price: 15, waitMin: 8, walkMin: 7, tags: ['甜', '凉', '零食'], ingredients: ['牛奶', '芋泥'], spicy: 0, hot: false, shareable: false, hours: [[9, 22]] },
  { id: 'b40', name: '现切水果盒', venue: '校内水果摊', scene: '零食', location: 'on', price: 9, waitMin: 3, walkMin: 6, tags: ['甜', '凉', '清淡', '实惠'], ingredients: ['西瓜', '哈密瓜'], spicy: 0, hot: false, shareable: false, hours: [[8, 20]] },
];

module.exports = items;
