// 种子导入脚本：node src/scripts/seed.js（或 npm run seed）。幂等。
const mongoose = require('mongoose');
const { mongoUri } = require('../config');
const { runSeed } = require('../seedRunner');

async function run() {
  await mongoose.connect(mongoUri);
  const { recipesInserted, seasonalInserted } = await runSeed();
  console.log(`种子导入完成：菜谱 +${recipesInserted}，时令表 +${seasonalInserted}`);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
