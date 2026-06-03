const { callFunction } = require('../../utils/cloud');
const { ensureLogin, setUser, setFamily } = require('../../utils/store');

// 预设身份，可点选；也支持「自定义」自由填写
const ROLE_OPTIONS = ['爸爸', '妈妈', '儿子', '女儿', '爷爷', '奶奶', '我'];

Page({
  data: {
    mode: 'create', // create | join
    familyName: '',
    inviteCode: '',
    nickname: '',
    roleOptions: ROLE_OPTIONS,
    role: '我',
    customRole: ''
  },

  async onLoad(query) {
    // 来自家人分享的链接：?inviteCode=XXXXXX → 自动切到「加入家庭」并预填邀请码
    const presetCode = (query && query.inviteCode ? query.inviteCode : '').trim().toUpperCase();
    if (presetCode) {
      this.setData({ mode: 'join', inviteCode: presetCode });
    }

    // 进入即静默登录
    try {
      const user = await ensureLogin({ loading: true });
      // 预填已有昵称（微信昵称或历史保存值）
      if (user && user.nickname && user.nickname !== '家庭成员') {
        this.setData({ nickname: user.nickname });
      }
      if (user.familyId) {
        // 已在某个家庭里：分享进来的也提示一下，避免误以为没生效
        if (presetCode) wx.showToast({ title: '你已在一个家庭中', icon: 'none' });
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
  selectRole(e) {
    this.setData({ role: e.currentTarget.dataset.role, customRole: '' });
  },
  onCustomRole(e) {
    // 填了自定义身份就以它为准
    this.setData({ customRole: e.detail.value, role: '' });
  },

  // 最终生效的身份
  resolvedRole() {
    return (this.data.customRole || '').trim() || this.data.role || '成员';
  },

  async onCreate() {
    if (!this.data.familyName.trim()) {
      return wx.showToast({ title: '请输入家庭名称', icon: 'none' });
    }
    const data = await callFunction('family', {
      action: 'create',
      name: this.data.familyName.trim(),
      role: this.resolvedRole()
    }, { loading: true, loadingText: '创建中' });
    await this.afterJoin(data);
  },

  async onJoin() {
    if (!this.data.inviteCode.trim()) {
      return wx.showToast({ title: '请输入邀请码', icon: 'none' });
    }
    const data = await callFunction('family', {
      action: 'join',
      inviteCode: this.data.inviteCode.trim().toUpperCase(),
      role: this.resolvedRole()
    }, { loading: true, loadingText: '加入中' });
    await this.afterJoin(data);
  },

  // data = 后端返回的家庭对象（含 familyId / inviteCode / name / memberOpenids）
  async afterJoin(data) {
    const role = this.resolvedRole();
    const nickname = (this.data.nickname || '').trim();

    // 持久化昵称 + 身份到当前用户，并刷新本地缓存
    try {
      const patch = { action: 'updateProfile', role };
      if (nickname) patch.nickname = nickname;
      const resp = await callFunction('family', patch);
      setUser(resp.user);
    } catch (e) {
      // 兜底：至少把 familyId/role 写进本地，避免回首页又被弹回引导页
      const u = getApp().globalData.userInfo || {};
      setUser({ ...u, familyId: data.familyId, role, nickname: nickname || u.nickname });
    }

    // 关键修复：把含 inviteCode 的家庭对象写入全局缓存，供「我的」页展示
    setFamily(data);

    wx.showToast({ title: '欢迎回家 🏠', icon: 'success' });
    setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 800);
  }
});
