const { callFunction } = require('../../utils/cloud');
const { ensureLogin } = require('../../utils/store');

Page({
  data: {
    recipes: [],
    season: '',
    generating: false,
    hasResult: false,
    meal: '晚'
  },

  async onShow() {
    const user = await ensureLogin();
    if (!user.familyId) wx.reLaunch({ url: '/pages/onboarding/onboarding' });
  },

  async onGenerate() {
    this.setData({ generating: true });
    try {
      const data = await callFunction('aiRecommend', { count: 4 });
      this.setData({ recipes: data.recipes, season: data.season, hasResult: true });
    } catch (e) {
      // 错误已在 cloud.js 弹 toast
    } finally {
      this.setData({ generating: false });
    }
  },

  viewDetail(e) {
    wx.navigateTo({ url: `/pages/recipeDetail/recipeDetail?id=${e.currentTarget.dataset.id}` });
  },

  async addToOrder(e) {
    const r = e.currentTarget.dataset.item;
    await callFunction('vote', {
      action: 'addItem', meal: this.data.meal,
      recipeId: r.recipeId, name: r.name
    }, { loading: true, loadingText: '加菜中' });
    wx.showToast({ title: `已加入${this.data.meal}餐`, icon: 'none' });
  }
});
