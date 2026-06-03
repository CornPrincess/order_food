// app.js — 小程序入口
App({
  globalData: {
    // 后端模式：'cloud' = 微信云开发；'server' = 阿里云自建后端
    backend: 'server',

    // —— 云函数模式配置 ——
    // 部署前请替换为你自己的云开发环境 ID
    cloudEnv: 'your-cloud-env-id',

    // —— 自建后端模式配置 ——
    // 必须是已 ICP 备案 + HTTPS 的域名，并在小程序后台「服务器域名」中配置
    serverBaseUrl: 'https://food.bbmmcc.cn',

    userInfo: null,   // 当前登录用户（含 familyId、role、口味等）
    family: null      // 当前家庭信息
  },

  onLaunch() {
    if (this.globalData.backend === 'cloud') {
      if (!wx.cloud) {
        console.error('请使用 2.2.3 或以上的基础库以使用云能力');
        return;
      }
      wx.cloud.init({
        env: this.globalData.cloudEnv,
        traceUser: true
      });
    }
  }
});
