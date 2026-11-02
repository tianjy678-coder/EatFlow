/**
 * EatFlow 推荐引擎（本地规则引擎，完全离线、可解释）
 *
 * 决策优先级（对应产品设计 4.3）：
 *   安全与硬约束 → 本次明确需求 → 长期卡片 → 历史偏好 → 多样性探索
 *
 * 硬约束（命中即排除，绝不推荐）：
 *   过敏、宗教/伦理禁忌、不喜欢的食材、严格价格上限、严格时间上限、
 *   场景不符、自炊但不在宿舍、该时段未营业
 *
 * 软偏好（用于打分排序与解释）：口味倾向、冷热、尝新/熟悉、
 *   非严格预算、常用商家、用餐方式、多人分食、多样性（近期重复惩罚）
 */

/* ---------------- 基础工具 ---------------- */

function nowHour(date) {
  const d = date || new Date();
  return d.getHours() + d.getMinutes() / 60;
}

function isOpen(item, h) {
  const hours = item.hours || [];
  if (!hours.length) return true; // 无营业时间数据（周边店铺），不臆断、不拦截
  for (let i = 0; i < hours.length; i++) {
    const seg = hours[i];
    if (h >= seg[0] && h <= seg[1]) return true;
  }
  return false;
}

/** 'open' | 'closed' | 'unknown' —— 周边店铺 POI 没有营业时间，绝不谎称"在营业" */
function openState(item, h) {
  if (!item.hours || !item.hours.length) return item.hoursUnknown ? 'unknown' : 'open';
  return isOpen(item, h) ? 'open' : 'closed';
}

/** 当前时间到最近的一个营业时段开始的等待分钟数 */
function minutesUntilOpen(item, h) {
  const hours = (item.hours || []).slice().sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < hours.length; i++) {
    if (hours[i][0] > h) return Math.round((hours[i][0] - h) * 60);
  }
  return null; // 今天不再营业
}

/**
 * 步行分钟数。
 * 两类数据来源：
 *   - 周边店铺（source='lbs'）：已在 lbs.applyWalk 里按当前位置算好（真实路径或直线估算），直接用
 *   - 内置候选：walkMin 是"从校区中心"的标量，按本次位置做偏移
 */
function walkFrom(item, location) {
  if (item.source === 'lbs') return item.walkMin || 15;
  const base = item.walkMin || 0;
  if (location === 'offcampus') {
    return item.location === 'off' ? Math.max(2, Math.round(base * 0.3)) : base + 30;
  }
  let delta = 0;
  if (location === 'classroom') delta = -2;
  else if (location === 'library') delta = -1;
  else if (location === 'gym') delta = 2;
  return Math.max(0, base + delta);
}

function totalTime(item, demand) {
  return (item.waitMin || 0) + walkFrom(item, demand.location);
}

/** 展示用价格，统一两位小数以下 */
function fmtPrice(p) {
  return '¥' + (Math.round(p * 10) / 10);
}

/* ---------------- 硬约束过滤 ---------------- */

/**
 * 返回 { ok, blocks }，blocks 为 ['allergy:花生', ...]
 */
function hardCheck(item, card, demand, h) {
  const blocks = [];
  const ing = item.ingredients || [];

  (card.allergies || []).forEach((a) => {
    if (a && contains(ing, a)) blocks.push('allergy:' + a);
  });
  (card.taboos || []).forEach((t) => {
    if (t && contains(ing, t)) blocks.push('taboo:' + t);
  });
  (card.dislikes || []).forEach((d) => {
    if (d && contains(ing, d)) blocks.push('dislike:' + d);
  });

  if (demand.budgetStrict && item.price > demand.budgetMax) {
    blocks.push('budget');
  }
  if (demand.timeStrict && totalTime(item, demand) > demand.timeMax) {
    blocks.push('time');
  }
  if (demand.scenes && demand.scenes.length && demand.scenes.indexOf(item.scene) < 0) {
    blocks.push('scene');
  }
  // 自炊只在宿舍可行。locationKind 来自真实位置；兼容旧的 location === 'dorm'
  const kind = demand.locationKind || (demand.location === 'dorm' ? 'dorm' : 'campus');
  if (item.scene === '自炊' && kind !== 'dorm') {
    blocks.push('dorm');
  }
  if (!isOpen(item, h)) {
    blocks.push('closed');
  }
  return { ok: blocks.length === 0, blocks };
}

function contains(list, target) {
  for (let i = 0; i < list.length; i++) {
    const a = (list[i] || '').trim();
    const b = (target || '').trim();
    if (!a || !b) continue;
    if (a === b || a.indexOf(b) >= 0 || b.indexOf(a) >= 0) return true;
  }
  return false;
}

/* ---------------- 近期历史统计（多样性 / 尝新） ---------------- */

/**
 * 返回 { byItem: {id: 次数}, recentNames: [name,...], total }
 * 统计最近 7 天内记录的历史
 */
function recentStats(history) {
  const byItem = {};
  const names = {};
  const sevenDays = Date.now() - 7 * 24 * 3600 * 1000;
  let total = 0;
  (history || []).forEach((h) => {
    if (!h.ts || h.ts < sevenDays) return;
    total += 1;
    const key = h.itemId || h.name;
    if (key) byItem[key] = (byItem[key] || 0) + 1;
    if (h.name) names[h.name] = (names[h.name] || 0) + 1;
  });
  return { byItem, names, total };
}

/* ---------------- 软偏好打分 ---------------- */

function softScore(item, card, demand, stats) {
  const matches = [];
  const penalties = [];
  let score = 0;

  // 1. 长期口味倾向
  let tasteHit = 0;
  (card.tastes || []).forEach((t) => {
    if ((item.tags || []).indexOf(t) >= 0) {
      tasteHit += 1;
      matches.push('符合你偏好的「' + t + '」');
    }
  });
  score += Math.min(6, tasteHit * 3);

  // 2. 本次冷热偏好
  if (demand.prefer === 'hot' && item.hot) {
    score += 2;
    matches.push('热乎的，符合你现在想要的');
  } else if (demand.prefer === 'light' && !item.hot) {
    score += 2;
    matches.push('清淡不烫口，符合你现在想要的');
  } else if (demand.prefer === 'light' && (item.tags || []).indexOf('清淡') >= 0) {
    score += 2;
    matches.push('够清淡，符合你现在想要的');
  }

  // 3. 尝新 / 熟悉
  const seen = (stats.byItem[item.id] || 0) + (stats.names[item.name] || 0);
  if (demand.mood === 'new' && seen === 0) {
    score += 3;
    matches.push('最近没吃过，正好尝新');
  } else if (demand.mood === 'familiar' && seen > 0) {
    score += 3;
    matches.push('你最近吃过，口味熟悉');
  }

  // 3.5 距离（周边店铺专属）：越近越好，且要能说清"多远"
  if (item.source === 'lbs' && item.walkMin != null) {
    const w = item.walkMin;
    score += Math.max(0, 5 - w * 0.25);
    if (w <= 8) matches.push('步行约 ' + w + ' 分钟，很近');
    else if (w <= 15) matches.push('步行约 ' + w + ' 分钟');
    else penalties.push('步行要 ' + w + ' 分钟，有点远');
  }

  // 4. 预算（非严格时作软约束）
  if (item.price <= demand.budgetMax) {
    score += 1;
    matches.push(fmtPrice(item.price) + (item.priceEstimated ? '（按品类估算）' : '') + '，在你本次预算内');
  } else {
    const over = item.price - demand.budgetMax;
    score -= Math.min(5, over * 0.8);
    penalties.push('超预算约 ' + Math.round(over) + ' 元');
  }

  // 5. 常用商家 / 场景
  if ((card.favoritePlaces || []).indexOf(item.venue) >= 0) {
    score += 3;
    matches.push('你常去的' + item.venue);
  }
  if ((card.diningModes || []).indexOf(item.scene) >= 0) {
    score += 1;
  }

  // 6. 多人分食
  if (demand.company === 'group' && item.shareable) {
    score += 2;
    matches.push('适合分食，和同学一起吃不尴尬');
  }
  if (demand.company === 'group' && !item.shareable && (item.tags || []).indexOf('自选') >= 0) {
    score += 1;
  }

  // 7. 多样性：近 7 天重复惩罚
  if (seen > 0) {
    const hit = Math.min(3, seen) * 1.5;
    score -= hit;
    penalties.push('近 7 天已吃过 ' + seen + ' 次');
  }

  return { score, matches, penalties, seen };
}

/* ---------------- 候选人名匹配（用户已有候选） ---------------- */

function matchCandidateText(pool, text) {
  const keys = (text || '')
    .split(/[,，、\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 1);
  if (!keys.length) return null;
  const scored = pool.map((item) => {
    let hit = 0;
    keys.forEach((k) => {
      if (item.name.indexOf(k) >= 0 || item.venue.indexOf(k) >= 0) hit += 2;
      else if ((item.tags || []).some((t) => t.indexOf(k) >= 0)) hit += 1;
    });
    return { item, hit };
  });
  const hits = scored.filter((x) => x.hit > 0);
  if (!hits.length) return null;
  hits.sort((a, b) => b.hit - a.hit);
  return hits.map((x) => x.item);
}

/* ---------------- 理由生成 ---------------- */

function buildReasons(item, card, demand, info, h) {
  const next = buildNextStep(item, demand);
  const tradeoffs = info.penalties.slice(0, 2);
  return {
    whyMe: info.matches.slice(0, 3),
    whyNow: buildWhyNow(item, demand, h),
    tradeoffs,
    next,
  };
}

function buildWhyNow(item, demand, h) {
  const total = totalTime(item, demand);
  const arr = [];
  const st = openState(item, h);
  if (st === 'open') {
    arr.push('现在在营业');
  } else if (st === 'unknown') {
    arr.push('营业时间未核实，出发前建议确认');
  } else {
    const wait = minutesUntilOpen(item, h);
    if (wait !== null) arr.push('约 ' + wait + ' 分钟后开始营业');
    else arr.push('今天这个点可能不营业');
  }
  if (item.source === 'lbs') {
    arr.push(
      '步行约 ' + walkFrom(item, demand.location) + ' 分钟' +
        (item.walkReal ? '' : '（直线估算）') +
        '，出餐约 ' + item.waitMin + ' 分钟'
    );
  } else if (demand.timeStrict) {
    arr.push('步行+出餐约 ' + total + ' 分钟，在你 ' + demand.timeMax + ' 分钟内');
  } else {
    arr.push('步行+出餐约 ' + total + ' 分钟');
  }
  if (demand.budgetStrict) {
    arr.push(fmtPrice(item.price) + ' ≤ 你的上限 ' + fmtPrice(demand.budgetMax));
  }
  return arr.slice(0, 3);
}

function buildNextStep(item, demand) {
  if (item.source === 'lbs') {
    const w = walkFrom(item, demand.location);
    return (
      '步行约 ' + w + ' 分钟到' + item.name +
      (item.address ? '（' + item.address + '）' : '') +
      (item.walkReal ? '' : '，距离为直线估算')
    );
  }
  if (item.scene === '食堂') {
    return '去' + item.venue + '，出餐约 ' + item.waitMin + ' 分钟，记得避开 12:00 高峰';
  }
  if (item.scene === '校外餐馆') {
    const w = walkFrom(item, demand.location);
    return '步行约 ' + w + ' 分钟到' + item.venue + '，建议现在就出发';
  }
  if (item.scene === '外卖') {
    return '现在下单' + item.name + '，预计 ' + item.waitMin + ' 分钟送达';
  }
  if (item.scene === '自炊') {
    return '回宿舍自己动手，约 ' + item.waitMin + ' 分钟搞定';
  }
  return '到' + item.venue + '即可，即买即走';
}

/* ---------------- 冲突诊断 ---------------- */

/**
 * 当合格候选为 0 时，说明卡在哪个约束、放宽后会怎样。
 */
function diagnose(pool, card, demand, h) {
  const stats = { byItem: {}, names: {} };
  const counter = {};
  const relax = [];

  pool.forEach((item) => {
    const r = hardCheck(item, card, demand, h);
    r.blocks.forEach((b) => {
      const type = b.split(':')[0];
      counter[type] = (counter[type] || 0) + 1;
    });
  });

  const labelMap = {
    allergy: '过敏原',
    taboo: '饮食禁忌',
    dislike: '不喜欢的食材',
    budget: '严格预算上限',
    time: '严格时间上限',
    scene: '场景选择',
    dorm: '自炊需要回宿舍',
    closed: '该时段未营业',
  };

  const conflicts = Object.keys(counter)
    .sort((a, b) => counter[b] - counter[a])
    .map((type) => ({
      type,
      count: counter[type],
      label: labelMap[type] || type,
      message: (counter[type] >= 5 ? '大量' : counter[type] + ' 个') + '候选被「' + labelMap[type] + '」挡住了',
    }));

  // 放宽模拟：放宽单个约束后能保留多少候选
  const tryRelax = (label, patch) => {
    const d = Object.assign({}, demand, patch);
    let n = 0;
    pool.forEach((item) => {
      if (hardCheck(item, card, d, h).ok) n += 1;
    });
    if (n > 0) relax.push({ label, count: n, patch, message: '若' + label + '，可有 ' + n + ' 个候选' });
  };

  if (demand.budgetStrict) {
    const maxPrice = pool.reduce((m, x) => Math.max(m, x.price), 0);
    if (maxPrice > demand.budgetMax) {
      tryRelax('把预算上限放宽到 ' + fmtPrice(Math.ceil(maxPrice)), { budgetMax: Math.ceil(maxPrice), budgetStrict: false });
    }
  }
  if (demand.timeStrict) {
    const maxTime = pool.reduce((m, x) => Math.max(m, totalTime(x, demand)), 0);
    if (maxTime > demand.timeMax) {
      tryRelax('把时间上限放宽到 ' + Math.ceil(maxTime) + ' 分钟', { timeMax: Math.ceil(maxTime), timeStrict: false });
    }
  }
  if (demand.scenes && demand.scenes.length && demand.scenes.length < 5) {
    tryRelax('放开场景限制', { scenes: [] });
  }
  if (demand.prefer !== 'any') {
    tryRelax('不限定冷热口味', { prefer: 'any' });
  }

  return { conflicts, relax: relax.slice(0, 3) };
}

/* ---------------- 主入口 ---------------- */

/**
 * 推荐主函数
 * @param {object} opts { card, demand, history, offset, now }
 * @returns { picks, qualified, conflicts, relax, poolSize }
 */
function recommend(opts) {
  const card = opts.card || {};
  const demand = opts.demand || {};
  const history = opts.history || [];
  const offset = Math.max(0, opts.offset || 0);
  const h = nowHour(opts.now);

  const pool = opts.pool || [];
  const stats = recentStats(history);

  // 1. 硬约束过滤
  const qualified = pool.filter((item) => hardCheck(item, card, demand, h).ok);

  // 2. 用户已有候选优先（文档 4.2：是否已有候选菜）
  let ordered;
  const matched = matchCandidateText(qualified, demand.candidatesText);
  if (matched) {
    const rest = qualified.filter((x) => matched.indexOf(x) < 0);
    ordered = matched.concat(rest).map((item) => ({ item, info: softScore(item, card, demand, stats) }));
  } else {
    // 3. 软偏好打分排序
    ordered = qualified
      .map((item) => ({ item, info: softScore(item, card, demand, stats) }))
      .sort((a, b) => b.info.score - a.info.score);
  }

  // 4. 冲突诊断（候选不足时）
  let diag = { conflicts: [], relax: [] };
  if (qualified.length === 0) {
    diag = diagnose(pool, card, demand, h);
  } else if (qualified.length < 3) {
    diag = { conflicts: [], relax: diagnose(pool, card, demand, h).relax };
  }

  // 5. 取 3 个；换一批 = 顺移 offset
  const perBatch = Math.min(3, ordered.length);
  const picks = [];
  for (let i = 0; i < perBatch && ordered.length; i++) {
    const entry = ordered[(offset + i) % ordered.length];
    const item = entry.item || entry;
    const info = entry.info || { matches: [], penalties: [], seen: 0 };
    picks.push({
      item,
      score: info.score || 0,
      reasons: buildReasons(item, card, demand, info, h),
    });
  }

  return {
    picks,
    qualifiedCount: qualified.length,
    conflicts: diag.conflicts,
    relax: diag.relax,
    poolSize: pool.length,
    qualifiedPool: qualified,
  };
}

module.exports = {
  nowHour,
  isOpen,
  openState,
  totalTime,
  walkFrom,
  hardCheck,
  recentStats,
  softScore,
  recommend,
  fmtPrice,
};
