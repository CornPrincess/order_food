const { callFunction } = require('../../utils/cloud');
const { ensureLogin, getFamily, setUser } = require('../../utils/store');

const TASTE_OPTIONS = ['咸鲜', '清淡', '酸辣', '麻辣', '酸甜', '咸甜', '微辣'];
const DISLIKE_OPTIONS = ['香菜', '葱', '姜', '蒜', '辣', '内脏', '羊肉', '海鲜', '茄子', '苦瓜'];

Page({
  data: {
    user: null,
    family: null,
    members: [],
    tasteOptions: TASTE_OPTIONS,
    dislikeOptions: DISLIKE_OPTIONS,
    tastes: [],
    dislikes: [],
    allergies: '',
    role: ''
  },

  async onShow() {
    const user = await ensureLogin();
    if (!user.familyId) { wx.reLaunch({ url: '/pages/onboarding/onboarding' }); return; }
    this.setData({
      user,
      family: getFamily(),
      tastes: user.tastes || [],
      dislikes: user.dislikes || [],
      allergies: (user.allergies || []).join('、'),
      role: user.role || ''
    });
    this.loadMembers();
  },

  async loadMembers() {
    try {
      const data = await callFunction('family', { action: 'members' });
      this.setData({ members: data.members });
    } catch (e) {}
  },

  toggleTaste(e) {
    const v = e.currentTarget.dataset.v;
    const tastes = this.data.tastes.includes(v)
      ? this.data.tastes.filter((t) => t !== v)
      : [...this.data.tastes, v];
    this.setData({ tastes });
  },
  toggleDislike(e) {
    const v = e.currentTarget.dataset.v;
    const dislikes = this.data.dislikes.includes(v)
      ? this.data.dislikes.filter((t) => t !== v)
      : [...this.data.dislikes, v];
    this.setData({ dislikes });
  },
  onRole(e) { this.setData({ role: e.detail.value }); },
  onAllergies(e) { this.setData({ allergies: e.detail.value }); },

  async onSave() {
    const allergies = this.data.allergies
      ? this.data.allergies.split(/[、,，\s]+/).filter(Boolean)
      : [];
    const data = await callFunction('family', {
      action: 'updateProfile',
      role: this.data.role,
      tastes: this.data.tastes,
      dislikes: this.data.dislikes,
      allergies
    }, { loading: true, loadingText: '保存中' });
    setUser(data.user);
    this.setData({ user: data.user });
    wx.showToast({ title: '已保存', icon: 'success' });
    this.loadMembers();
  },

  copyInvite() {
    wx.setClipboardData({ data: this.data.family.inviteCode });
  }
});
