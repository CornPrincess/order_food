// AI 批量生成家常菜入公共库（幂等去重）。
// 用法：node src/scripts/generateRecipes.js [总数=120] [每批=12]
// 依赖后端 .env 里的 DEEPSEEK_API_KEY。生成的菜 source=ai、familyId=''（公共库）。
const mongoose = require('mongoose');
const { mongoUri, deepseek } = require('../config');
const { Recipe } = require('../models');
const { callLLM } = require('../services/llm');

const TOTAL = Number(process.argv[2]) || 120;
const BATCH = Number(process.argv[3]) || 12;

const SYS =
  '你是一位资深中式家庭厨师。请生成真实、常见、可操作的家常菜谱，覆盖不同菜系与荤素汤主食，难度以易/中为主。严格输出 JSON，不要多余文字。';

function buildUserMsg(n, existingNames) {
  const avoid = existingNames.slice(-200).join('、'); // 控制 token，取最近的名字去重
  return `请生成 ${n} 道互不相同的中式家常菜。
请勿与以下已有菜名重复：${avoid || '（暂无）'}。
每道菜字段齐全。输出 JSON：
{"recipes":[{"name":"","cuisine":"家常/川/粤/湘/东北/鲁/浙等","cookTime":数字(分钟),"difficulty":"易/中/难","ingredients":["食材带份量，如 番茄2个"],"steps":["分步骤，动词开头"],"tasteTags":["如 咸鲜/酸辣/麻辣/清淡/咸甜"],"seasonTags":["四季 或 春/夏/秋/冬"],"nutritionTags":["如 蛋白质/蔬菜/主食类/汤品/低脂/红肉/白肉"]}]}`;
}

function valid(r) {
  return r && typeof r.name === 'string' && r.name.trim()
    && Array.isArray(r.ingredients) && r.ingredients.length
    && Array.isArray(r.steps) && r.steps.length;
}

async function run() {
  if (!deepseek.apiKey) {
    console.error('未配置 DEEPSEEK_API_KEY，无法生成。请先在 server/.env 中设置。');
    process.exit(1);
  }
  await mongoose.connect(mongoUri);

  const seen = new Set((await Recipe.find({ familyId: '' }, 'name')).map((r) => r.name));
  console.log(`公共库已有 ${seen.size} 道，目标新增 ${TOTAL} 道（每批 ${BATCH}）。`);

  let inserted = 0;
  let guard = 0; // 防止模型一直重复导致死循环
  while (inserted < TOTAL && guard < Math.ceil(TOTAL / BATCH) + 8) {
    guard++;
    const want = Math.min(BATCH, TOTAL - inserted);
    let list = [];
    try {
      const result = await callLLM(
        [
          { role: 'system', content: SYS },
          { role: 'user', content: buildUserMsg(want, [...seen]) }
        ],
        { temperature: 0.9 }
      );
      list = Array.isArray(result.recipes) ? result.recipes : [];
    } catch (e) {
      console.warn(`  第 ${guard} 批调用失败：${e.message}，重试中…`);
      continue;
    }

    let batchNew = 0;
    for (const r of list) {
      if (!valid(r)) continue;
      const name = r.name.trim();
      if (seen.has(name)) continue;
      await Recipe.create({
        name,
        cuisine: r.cuisine || '家常',
        ingredients: r.ingredients,
        steps: r.steps,
        tasteTags: r.tasteTags || [],
        seasonTags: r.seasonTags && r.seasonTags.length ? r.seasonTags : ['四季'],
        nutritionTags: r.nutritionTags || [],
        cookTime: Number(r.cookTime) || 0,
        difficulty: r.difficulty || '中',
        source: 'ai',
        familyId: '',
        createdBy: 'ai-batch'
      });
      seen.add(name);
      inserted++;
      batchNew++;
      if (inserted >= TOTAL) break;
    }
    console.log(`  批 ${guard}：模型返回 ${list.length} 道，新增 ${batchNew} 道，累计 ${inserted}/${TOTAL}`);
  }

  console.log(`完成：本次新增 ${inserted} 道，公共库现有 ${seen.size} 道。`);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
