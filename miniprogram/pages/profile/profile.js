const { callFunction } = require('../../utils/cloud');
const { ensureLogin, refresh, getFamily, setUser } = require('../../utils/store');

const TASTE_OPTIONS = ['咸鲜', '清淡', '酸辣', '麻辣', '酸甜', '咸甜', '微辣'];
const DISLIKE_OPTIONS = ['香菜', '葱', '姜', '蒜', '辣', '内脏', '羊肉', '海鲜', '茄子', '苦瓜'];
const ROLE_OPTIONS = ['爸爸', '妈妈', '儿子', '女儿', '爷爷', '奶奶', '我'];

Page({
  data: {
    user: null,
    family: null,
    members: [],
    tasteOptions: TASTE_OPTIONS,
    dislikeOptions: DISLIKE_OPTIONS,
    roleOptions: ROLE_OPTIONS,
    tastes: [],
    dislikes: [],
    allergies: '',
    nickname: '',
    role: '',
    customRole: ''
  },

  async onShow() {
    let user = await ensureLogin();
    if (!user.familyId) { wx.reLaunch({ url: '/pages/onboarding/onboarding' }); return; }
    // 兜底：本地缺家庭缓存（老数据/冷启动）时，强制刷新登录态以拉回 inviteCode
    if (!getFamily()) {
      try { user = await refresh(); } catch (e) {}
    }
    const role = user.role || '';
    this.setData({
      user,
      family: getFamily(),
      tastes: user.tastes || [],
      dislikes: user.dislikes || [],
      allergies: (user.allergies || []).join('、'),
      nickname: user.nickname && user.nickname !== '家庭成员' ? user.nickname : '',
      // 角色命中预设则高亮预设，否则填入自定义框
      role: ROLE_OPTIONS.includes(role) ? role : '',
      customRole: ROLE_OPTIONS.includes(role) ? '' : role
    });
    this.loadMembers();
  },

  onNickname(e) { this.setData({ nickname: e.detail.value }); },
  selectRole(e) { this.setData({ role: e.currentTarget.dataset.role, customRole: '' }); },
  onCustomRole(e) { this.setData({ customRole: e.detail.value, role: '' }); },

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
  onAllergies(e) { this.setData({ allergies: e.detail.value }); },

  async onSave() {
    const allergies = this.data.allergies
      ? this.data.allergies.split(/[、,，\s]+/).filter(Boolean)
      : [];
    const role = (this.data.customRole || '').trim() || this.data.role || '成员';
    const nickname = (this.data.nickname || '').trim();
    const payload = {
      action: 'updateProfile',
      role,
      tastes: this.data.tastes,
      dislikes: this.data.dislikes,
      allergies
    };
    if (nickname) payload.nickname = nickname;
    const data = await callFunction('family', payload, { loading: true, loadingText: '保存中' });
    setUser(data.user);
    this.setData({ user: data.user });
    wx.showToast({ title: '已保存', icon: 'success' });
    this.loadMembers();
  },

  copyInvite() {
    const code = this.data.family && this.data.family.inviteCode;
    if (!code) return wx.showToast({ title: '邀请码加载中', icon: 'none' });
    wx.setClipboardData({ data: code });
  },

  // 点击「分享给家人」按钮（open-type="share"）触发；也用于右上角菜单分享
  onShareAppMessage() {
    const fam = this.data.family || {};
    const code = fam.inviteCode || '';
    return {
      title: `「${fam.name || '我们家'}」邀请你一起点餐 🍲`,
      path: `/pages/onboarding/onboarding?inviteCode=${code}`
    };
  }
});
