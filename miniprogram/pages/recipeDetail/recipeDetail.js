const { callFunction } = require('../../utils/cloud');

Page({
  data: { recipe: null, loading: true },

  async onLoad(query) {
    try {
      const data = await callFunction('recipes', { action: 'detail', recipeId: query.id });
      this.setData({ recipe: data.recipe });
    } finally {
      this.setData({ loading: false });
    }
  }
});
