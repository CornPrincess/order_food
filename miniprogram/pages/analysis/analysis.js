const { callFunction } = require('../../utils/cloud');
const { ensureLogin } = require('../../utils/store');

Page({
  data: {
    days: 7,
    analysis: null,
    stats: null,
    statList: [],
    empty: false,
    emptyMsg: '',
    loading: false,
    hasResult: false
  },

  async onShow() {
    const user = await ensureLogin();
    if (!user.familyId) wx.reLaunch({ url: '/pages/onboarding/onboarding' });
  },

  async onAnalyze() {
    this.setData({ loading: true, hasResult: false, empty: false });
    try {
      const data = await callFunction('aiAnalyze', { days: this.data.days });
      if (data.empty) {
        this.setData({ empty: true, emptyMsg: data.message });
        return;
      }
      // 营养标签统计转数组用于展示
      const statList = Object.keys(data.stats.tagCount || {})
        .map((k) => ({ tag: k, count: data.stats.tagCount[k] }))
        .sort((a, b) => b.count - a.count);
      this.setData({
        analysis: data.analysis,
        stats: data.stats,
        statList,
        hasResult: true
      });
    } finally {
      this.setData({ loading: false });
    }
  }
});
