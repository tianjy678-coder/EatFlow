const store = require('./utils/store');
const lbs = require('./utils/lbs');

// 微信云开发环境 ID。填入后自动启用云函数（任意位置实时搜索）；留空则只走离线数据包，功能不受影响。
const CLOUD_ENV = ''; // 例：'eatflow-1g8xxxxxxx'

App({
  globalData: {
    appName: 'EatFlow',
    slogan: 'Food is All You Need',
    cloudReady: !!CLOUD_ENV,
    // 一次决策的会话数据：demand -> result -> wheel -> feedback 之间传递
    session: {
      demand: null,
      picks: [],
      chosen: null,
      qualifiedPool: [],
    },
  },

  onLaunch() {
    store.initDefaults();

    // 未设置位置时用校园中心兜底，避免首次进入候选池为空
    if (!lbs.getLocation()) {
      lbs.saveLocation(lbs.PRESET_LOCATIONS[0]);
    }

    if (CLOUD_ENV && wx.cloud) {
      try {
        wx.cloud.init({ env: CLOUD_ENV, traceUser: false });
        this.globalData.cloudReady = true;
      } catch (e) {
        this.globalData.cloudReady = false;
      }
    }
  },
});
