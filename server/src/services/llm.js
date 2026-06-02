// 国产大模型（DeepSeek，OpenAI 兼容接口）调用封装
const axios = require('axios');
const { deepseek } = require('../config');

/**
 * 调用大模型并要求返回 JSON。
 * @param {Array} messages [{role, content}]
 * @param {object} opts { temperature }
 */
async function callLLM(messages, opts = {}) {
  if (!deepseek.apiKey) throw new Error('未配置 DEEPSEEK_API_KEY');

  const resp = await axios.post(
    `${deepseek.baseUrl}/chat/completions`,
    {
      model: deepseek.model,
      messages,
      temperature: opts.temperature != null ? opts.temperature : 0.7,
      response_format: { type: 'json_object' }
    },
    {
      headers: { Authorization: `Bearer ${deepseek.apiKey}`, 'Content-Type': 'application/json' },
      timeout: 25000
    }
  );

  return safeParseJSON(resp.data.choices[0].message.content);
}

function safeParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
    throw new Error('大模型返回无法解析为 JSON');
  }
}

module.exports = { callLLM };
