// llm.js — 国产大模型（DeepSeek，OpenAI 兼容接口）调用封装
// 环境变量：DEEPSEEK_API_KEY（必填）、DEEPSEEK_BASE_URL、DEEPSEEK_MODEL
const axios = require('axios');

const BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

async function callLLM(messages) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('未配置 DEEPSEEK_API_KEY 环境变量');

  const resp = await axios.post(
    `${BASE_URL}/chat/completions`,
    {
      model: MODEL,
      messages,
      temperature: 0.5,
      response_format: { type: 'json_object' }
    },
    {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      timeout: 25000
    }
  );

  const content = resp.data.choices[0].message.content;
  return safeParseJSON(content);
}

function safeParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }
    throw new Error('大模型返回无法解析为 JSON');
  }
}

module.exports = { callLLM };
