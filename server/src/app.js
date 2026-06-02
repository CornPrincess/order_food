// Express 应用：登录免鉴权，其余接口走 JWT 鉴权
const express = require('express');
const cors = require('cors');
const { auth } = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ code: 0, data: { status: 'ok' } }));

// 登录（免鉴权）
app.post('/api/login', require('./routes/login'));

// 以下接口需登录态
app.use(auth);
app.post('/api/family', require('./routes/family'));
app.post('/api/recipes', require('./routes/recipes'));
app.post('/api/vote', require('./routes/vote'));
app.post('/api/seasonal', require('./routes/seasonal'));
app.post('/api/aiRecommend', require('./routes/aiRecommend'));
app.post('/api/aiAnalyze', require('./routes/aiAnalyze'));

// 兜底错误处理
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ code: 500, message: err.message || '服务器错误' });
});

module.exports = app;
