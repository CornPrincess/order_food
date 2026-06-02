const { callFunction } = require('../../utils/cloud');
const { ensureLogin, getUser } = require('../../utils/store');

Page({
  data: {
    meals: ['早', '中', '晚'],
    meal: '晚',
    menu: null,
    openid: '',
    loading: true
  },

  async onShow() {
    try {
      const user = await ensureLogin();
      if (!user.familyId) { wx.reLaunch({ url: '/pages/onboarding/onboarding' }); return; }
      this.setData({ openid: user.openid });
      await this.loadMenu();
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadMenu() {
    const data = await callFunction('vote', { action: 'today', meal: this.data.meal });
    this.setData({ menu: this.decorate(data.menu) });
  },

  // 标注当前用户是否已投票
  decorate(menu) {
    const me = this.data.openid;
    menu.items = (menu.items || []).map((it) => ({
      ...it,
      voted: (it.votedBy || []).includes(me),
      voteCount: (it.votedBy || []).length
    }));
    return menu;
  },

  async switchMeal(e) {
    this.setData({ meal: e.currentTarget.dataset.meal });
    await this.loadMenu();
  },

  // 从菜谱库添加菜
  addFromRecipes() {
    wx.navigateTo({ url: `/pages/recipes/recipes?picker=1&meal=${this.data.meal}` });
  },

  async onToggleVote(e) {
    const { id } = e.currentTarget.dataset;
    const data = await callFunction('vote', {
      action: 'toggleVote', menuId: this.data.menu._id, recipeId: id
    });
    this.setData({ menu: this.decorate(data.menu) });
  },

  async onFinalize() {
    if (!this.data.menu.items.length) {
      return wx.showToast({ title: '先加几道菜吧', icon: 'none' });
    }
    wx.showModal({
      title: '确定今日菜单',
      content: '将按得票确定菜单并记入饮食档案，确定吗？',
      success: async (res) => {
        if (!res.confirm) return;
        const data = await callFunction('vote', {
          action: 'finalize', menuId: this.data.menu._id
        }, { loading: true, loadingText: '确定中' });
        wx.showToast({ title: '今日菜单已定 🎉', icon: 'success' });
        await this.loadMenu();
      }
    });
  }
});
