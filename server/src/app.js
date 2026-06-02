// Express 应用：日志 + 限流 + JWT 鉴权
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { auth } = require('./middleware/auth');
const { apiLimiter, loginLimiter, aiLimiter } = require('./middleware/rateLimit');
const logger = require('./logger');

const app = express();

// 部署在 Nginx 反向代理之后，信任一层代理以拿到真实客户端 IP（用于限流计数）
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

// HTTP 访问日志：自定义 openid 令牌（鉴权后才有值，响应结束时取）
morgan.token('openid', (req) => req.openid || '-');
app.use(
  morgan(':remote-addr :openid :method :url :status :response-time ms', {
    stream: { write: (line) => logger.info(line.trim()) }
  })
);

app.get('/health', (req, res) => res.json({ code: 0, data: { status: 'ok' } }));

// 登录（免鉴权，但单独防爆破限流）
app.post('/api/login', loginLimiter, require('./routes/login'));

// 以下接口需登录态；鉴权先于限流，使限流可按 openid 计数
app.use('/api', auth, apiLimiter);
app.post('/api/family', require('./routes/family'));
app.post('/api/recipes', require('./routes/recipes'));
app.post('/api/vote', require('./routes/vote'));
app.post('/api/seasonal', require('./routes/seasonal'));
// AI 接口较贵，叠加更严格的限流
app.post('/api/aiRecommend', aiLimiter, require('./routes/aiRecommend'));
app.post('/api/aiAnalyze', aiLimiter, require('./routes/aiAnalyze'));

// 兜底错误处理
app.use((err, req, res, next) => {
  logger.error('未捕获错误:', err.stack || err.message);
  res.status(500).json({ code: 500, message: err.message || '服务器错误' });
});

module.exports = app;
