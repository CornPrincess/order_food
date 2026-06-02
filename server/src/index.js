// 入口：连接 MongoDB 并启动服务
const mongoose = require('mongoose');
const app = require('./app');
const { port, mongoUri } = require('./config');

async function start() {
  try {
    await mongoose.connect(mongoUri);
    console.log('[db] MongoDB 已连接');
    app.listen(port, () => console.log(`[server] 监听端口 ${port}`));
  } catch (err) {
    console.error('[server] 启动失败:', err.message);
    process.exit(1);
  }
}

start();
