const { callFunction } = require('../../utils/cloud');
const { ensureLogin, getUser, getFamily } = require('../../utils/store');
const { getSolarTerm, getSeason } = require('../../utils/season');

Page({
  data: {
    user: null,
    family: null,
    solarTerm: '',
    season: '',
    seasonal: null,
    todayMenu: null,
    meal: '晚',
    loading: true
  },

  async onShow() {
    this.setData({ solarTerm: getSolarTerm(), season: getSeason() });
    try {
      const user = await ensureLogin();
      if (!user.familyId) {
        wx.reLaunch({ url: '/pages/onboarding/onboarding' });
        return;
      }
      this.setData({ user, family: getFamily() });
      await Promise.all([this.loadSeasonal(), this.loadTodayMenu()]);
    } catch (e) {
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadSeasonal() {
    try {
      const data = await callFunction('seasonal', {});
      this.setData({ seasonal: data });
    } catch (e) {}
  },

  async loadTodayMenu() {
    try {
      const data = await callFunction('vote', { action: 'today', meal: this.data.meal });
      this.setData({ todayMenu: data.menu });
    } catch (e) {}
  },

  goOrder() { wx.switchTab({ url: '/pages/order/order' }); },
  goRecommend() { wx.switchTab({ url: '/pages/recommend/recommend' }); },
  goAnalysis() { wx.switchTab({ url: '/pages/analysis/analysis' }); },
  goRecipes() { wx.navigateTo({ url: '/pages/recipes/recipes' }); }
});
