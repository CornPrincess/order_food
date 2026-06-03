// 入口：连接 MongoDB 并启动服务
const mongoose = require('mongoose');
const app = require('./app');
const { port, mongoUri, autoSeed } = require('./config');
const { runSeed } = require('./seedRunner');
const logger = require('./logger');

async function start() {
  try {
    await mongoose.connect(mongoUri);
    logger.info('MongoDB 已连接');

    if (autoSeed) {
      const { recipesInserted, seasonalInserted } = await runSeed();
      logger.info(`自动种子导入：菜谱 +${recipesInserted}，时令表 +${seasonalInserted}`);
    }

    app.listen(port, () => logger.info(`服务监听端口 ${port}`));
  } catch (err) {
    logger.error('启动失败:', err.message);
    process.exit(1);
  }
}

start();
