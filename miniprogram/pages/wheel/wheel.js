const store = require('../../utils/store');
const R = require('../../utils/recommend');
const lbs = require('../../utils/lbs');

const COLORS = ['#FF6B35', '#F0A02B', '#3D7BD9', '#1D9E6E', '#E0559B', '#8A63D2', '#2BB3A3', '#D9482B'];
const MAX_SEGMENTS = 8;

Page({
  data: {
    candidates: [],
    qualifiedCount: 0,
    spinning: false,
    result: null,
    respins: 0,
    showNag: false,
    canvasReady: false,
    emptyPool: false,
  },

  onLoad() {
    const card = store.getCard();
    if (!card) {
      wx.redirectTo({ url: '/pages/onboard/onboard' });
      return;
    }
    this.card = card;
    const session = getApp().globalData.session;
    this.demand = session.demand || store.getLastDemand();

    const self = this;
    lbs.buildPool(lbs.getLocation()).then((pool) => {
      const h = R.nowHour();
      const qualified = pool.items.filter((item) => R.hardCheck(item, card, self.demand, h).ok);
      self.render(qualified);
    });
  },

  render(qualified) {
    if (!qualified.length) {
      this.setData({ emptyPool: true, qualifiedCount: 0 });
      return;
    }

    const segs = qualified.slice(0, MAX_SEGMENTS).map((item) => ({
      id: item.id,
      label: item.name.length > 6 ? item.name.slice(0, 6) + '…' : item.name,
      name: item.name,
      venue: item.venue,
      price: R.fmtPrice(item.price),
    }));

    this.segs = segs;
    this.setData({
      canvasReady: true,
      qualifiedCount: qualified.length,
      candidates: segs,
    });
    if (this.rendered) this.initCanvas();
  },

  // 等首次渲染完成后再查 canvas 节点，onLoad 时节点还不存在
  onReady() {
    this.rendered = true;
    if (this.segs && this.segs.length) this.initCanvas();
  },

  initCanvas() {
    const query = wx.createSelectorQuery().in(this);
    query
      .select('#wheel')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          this.setData({ canvasReady: false });
          return;
        }
        const canvas = res[0].node;
        const info = wx.getSystemInfoSync();
        const dpr = info.pixelRatio || 2;
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        this.canvas = canvas;
        this.ctx = ctx;
        this.size = res[0].width;
        this.rotation = 0;
        this.draw(this.rotation);
      });
  },

  draw(rot) {
    const ctx = this.ctx;
    if (!ctx) return;
    const size = this.size;
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 12;
    const n = this.segs.length;
    const seg = (Math.PI * 2) / n;

    ctx.clearRect(0, 0, size, size);

    for (let i = 0; i < n; i++) {
      const a0 = -Math.PI / 2 + i * seg + rot;
      const a1 = a0 + seg;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a0, a1);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.strokeStyle = '#FFF8F3';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a0 + seg / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '600 13px sans-serif';
      ctx.fillText(this.segs[i].label, r - 12, 0);
      ctx.restore();
    }

    // 中心圆
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.fillStyle = '#FF6B35';
    ctx.font = '700 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GO', cx, cy + 1);

    // 顶部指针
    ctx.beginPath();
    ctx.moveTo(cx - 9, 2);
    ctx.lineTo(cx + 9, 2);
    ctx.lineTo(cx, 20);
    ctx.closePath();
    ctx.fillStyle = '#2B2118';
    ctx.fill();
  },

  spin() {
    if (this.data.spinning || !this.canvas) return;
    const n = this.segs.length;
    const winner = Math.floor(Math.random() * n);
    const seg = (Math.PI * 2) / n;

    // 让 winner 扇区中心停在顶部指针处：targetCenter + end ≡ -PI/2 (mod 2PI)
    const targetCenter = -Math.PI / 2 + winner * seg + seg / 2;
    const jitter = (Math.random() - 0.5) * seg * 0.7;
    const base = ((-targetCenter - jitter) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);

    const start = this.rotation || 0;
    const turns = 4 + Math.floor(Math.random() * 2);
    const end = start + turns * Math.PI * 2 + ((base - start) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);

    const duration = 3200;
    const t0 = Date.now();

    this.setData({ spinning: true, result: null, showNag: false });

    const step = () => {
      const p = Math.min(1, (Date.now() - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      this.rotation = start + (end - start) * eased;
      this.draw(this.rotation);
      if (p < 1) {
        this.canvas.requestAnimationFrame(step);
      } else {
        this.rotation = end;
        this.finish(winner);
      }
    };
    this.canvas.requestAnimationFrame(step);
  },

  finish(winner) {
    const seg = this.segs[winner];
    const respins = (this.respins || 0) + 1;
    this.respins = respins;
    this.setData({
      spinning: false,
      result: seg,
      respins,
      showNag: respins >= 3,
    });
  },

  pickResult() {
    const seg = this.data.result;
    if (!seg) return;
    const entry = store.addHistory({
      itemId: seg.id,
      name: seg.name,
      venue: seg.venue,
      price: null,
      scene: null,
      chosen: true,
      ate: null,
      rating: null,
      reason: '转盘决定',
    });
    getApp().globalData.session.chosen = entry;
    wx.redirectTo({ url: '/pages/feedback/feedback?id=' + entry.id });
  },

  again() {
    this.spin();
  },

  goDemand() {
    wx.redirectTo({ url: '/pages/demand/demand' });
  },

  goResult() {
    wx.redirectTo({ url: '/pages/result/result' });
  },
});
