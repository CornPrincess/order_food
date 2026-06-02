const { callFunction } = require('../../utils/cloud');
const { ensureLogin, setUser, setFamily } = require('../../utils/store');

Page({
  data: {
    mode: 'create', // create | join
    familyName: '',
    inviteCode: '',
    role: '家长'
  },

  async onLoad() {
    // 进入即静默登录
    try {
      const user = await ensureLogin({ loading: true });
      if (user.familyId) {
        // 已有家庭，直接回首页
        wx.switchTab({ url: '/pages/index/index' });
      }
    } catch (e) {}
  },

  switchMode(e) {
    this.setData({ mode: e.currentTarget.dataset.mode });
  },
  onInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  async onCreate() {
    if (!this.data.familyName.trim()) {
      return wx.showToast({ title: '请输入家庭名称', icon: 'none' });
    }
    const data = await callFunction('family', {
      action: 'create',
      name: this.data.familyName.trim(),
      role: this.data.role || '家长'
    }, { loading: true, loadingText: '创建中' });
    await this.afterJoin(data.familyId);
  },

  async onJoin() {
    if (!this.data.inviteCode.trim()) {
      return wx.showToast({ title: '请输入邀请码', icon: 'none' });
    }
    const data = await callFunction('family', {
      action: 'join',
      inviteCode: this.data.inviteCode.trim().toUpperCase(),
      role: this.data.role || '成员'
    }, { loading: true, loadingText: '加入中' });
    await this.afterJoin(data.familyId);
  },

  async afterJoin(familyId) {
    const user = getApp().globalData.userInfo || {};
    setUser({ ...user, familyId, role: this.data.role });
    wx.showToast({ title: '欢迎回家 🏠', icon: 'success' });
    setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 800);
  }
});
