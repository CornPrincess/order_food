// 入口：连接 MongoDB 并启动服务
const mongoose = require('mongoose');
const app = require('./app');
const { port, mongoUri } = require('./config');
const logger = require('./logger');

async function start() {
  try {
    await mongoose.connect(mongoUri);
    logger.info('MongoDB 已连接');
    app.listen(port, () => logger.info(`服务监听端口 ${port}`));
  } catch (err) {
    logger.error('启动失败:', err.message);
    process.exit(1);
  }
}

start();
