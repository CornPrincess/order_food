// app.js — 小程序入口
App({
  globalData: {
    // 云环境 ID，部署前请替换为你自己的云开发环境 ID
    cloudEnv: 'your-cloud-env-id',
    userInfo: null,   // 当前登录用户（含 familyId、role、口味等）
    family: null      // 当前家庭信息
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }
    wx.cloud.init({
      env: this.globalData.cloudEnv,
      traceUser: true
    });
  }
});
