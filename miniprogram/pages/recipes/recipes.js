const { callFunction } = require('../../utils/cloud');
const { ensureLogin } = require('../../utils/store');

Page({
  data: {
    recipes: [],
    keyword: '',
    cuisines: ['全部', '家常', '川', '粤', '湘', '东北'],
    cuisine: '全部',
    picker: false,   // 是否为「加菜选择」模式
    meal: '晚',
    loading: true
  },

  async onLoad(query) {
    if (query.picker) this.setData({ picker: true, meal: query.meal || '晚' });
    await ensureLogin();
    await this.load();
  },

  async load() {
    this.setData({ loading: true });
    const params = { action: 'list' };
    if (this.data.cuisine !== '全部') params.cuisine = this.data.cuisine;
    if (this.data.keyword) params.keyword = this.data.keyword;
    try {
      const data = await callFunction('recipes', params);
      this.setData({ recipes: data.recipes });
    } finally {
      this.setData({ loading: false });
    }
  },

  onSearch(e) { this.setData({ keyword: e.detail.value }); },
  doSearch() { this.load(); },

  async pickCuisine(e) {
    this.setData({ cuisine: e.currentTarget.dataset.c });
    await this.load();
  },

  onTapRecipe(e) {
    const { id } = e.currentTarget.dataset;
    if (this.data.picker) {
      this.addToMenu(e.currentTarget.dataset.item);
    } else {
      wx.navigateTo({ url: `/pages/recipeDetail/recipeDetail?id=${id}` });
    }
  },

  async addToMenu(recipe) {
    await callFunction('vote', {
      action: 'addItem', meal: this.data.meal,
      recipeId: recipe._id, name: recipe.name
    }, { loading: true, loadingText: '加菜中' });
    wx.showToast({ title: `已加「${recipe.name}」`, icon: 'none' });
    setTimeout(() => wx.navigateBack(), 600);
  }
});
