require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/order_food',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  wxAppId: process.env.WX_APPID || '',
  wxSecret: process.env.WX_SECRET || '',
  allowMockLogin: process.env.ALLOW_MOCK_LOGIN === 'true',
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat'
  },
  logLevel: process.env.LOG_LEVEL || 'info', // debug | info | warn | error
  // 限流窗口与上限（按 IP+openid 计），均可用环境变量覆盖
  rateLimit: {
    windowMs: Number(process.env.RATE_WINDOW_MS) || 60 * 1000,
    apiMax: Number(process.env.RATE_API_MAX) || 120,    // 全局每窗口请求数
    loginMax: Number(process.env.RATE_LOGIN_MAX) || 10, // 登录每窗口次数
    aiMax: Number(process.env.RATE_AI_MAX) || 10        // AI 接口每窗口次数
  }
};
