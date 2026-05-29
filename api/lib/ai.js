import { decryptSecret, maskSecret } from './crypto.js';

function trimTrailingSlash(value = '') {
  return String(value).replace(/\/+$/, '');
}

export function sanitizeApiConfig(config) {
  return {
    id: config.id,
    name: config.name,
    provider: config.provider,
    baseUrl: config.baseUrl,
    model: config.model,
    options: config.options || {},
    hasKey: Boolean(config.apiKey || config.encryptedApiKey),
    keyPreview: maskSecret(config.apiKey || config.keyPreview || '')
  };
}

export function hydrateApiConfig(row, encryptionKey = process.env.APP_ENCRYPTION_KEY) {
  return {
    id: row.id,
    name: row.name,
    provider: row.provider,
    baseUrl: row.base_url,
    model: row.model,
    options: row.options || {},
    apiKey: row.encrypted_api_key ? decryptSecret(row.encrypted_api_key, encryptionKey) : ''
  };
}

function normalizeOpenAiEndpoint(baseUrl) {
  const clean = trimTrailingSlash(baseUrl);
  if (clean.endsWith('/chat/completions')) return clean;
  return `${clean}/chat/completions`;
}

function toGeminiContents(messages) {
  return messages
    .filter(message => message.role !== 'system')
    .map(message => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(message.content || '') }]
    }));
}

export function buildAiRequest({ config, messages, stream = false, parameters = {} }) {
  if (!config?.provider) throw new Error('Missing AI provider');
  if (!config?.model) throw new Error('Missing AI model');
  if (!Array.isArray(messages) || messages.length === 0) throw new Error('Missing AI messages');

  if (config.provider === 'gemini') {
    const baseUrl = trimTrailingSlash(config.baseUrl || 'https://generativelanguage.googleapis.com');
    const url = `${baseUrl}/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey || '')}`;
    const systemText = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
    const body = {
      contents: toGeminiContents(messages),
      generationConfig: {
        temperature: parameters.temperature ?? 0.7,
        topP: parameters.top_p ?? parameters.topP ?? 1,
        topK: parameters.top_k ?? parameters.topK ?? 64,
        maxOutputTokens: parameters.max_tokens ?? parameters.maxOutputTokens ?? 8192
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'OFF' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'OFF' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'OFF' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'OFF' },
        { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'OFF' }
      ]
    };
    if (systemText) body.systemInstruction = { parts: [{ text: systemText }] };
    return {
      url,
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      },
      provider: config.provider,
      stream: false
    };
  }

  const body = {
    model: config.model,
    messages,
    stream,
    temperature: parameters.temperature ?? 0.7,
    top_p: parameters.top_p ?? 1,
    frequency_penalty: parameters.frequency_penalty ?? 0,
    presence_penalty: parameters.presence_penalty ?? 0,
    max_tokens: parameters.max_tokens ?? 8192
  };

  if (parameters.top_k !== undefined) body.top_k = parameters.top_k;
  if (parameters.repetition_penalty !== undefined) body.repetition_penalty = parameters.repetition_penalty;
  if (config.model === 'deepseek-v4-pro') {
    body.thinking = { type: 'enabled' };
    body.reasoning_effort = 'high';
    delete body.temperature;
  }

  return {
    url: normalizeOpenAiEndpoint(config.baseUrl),
    init: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey || ''}`
      },
      body: JSON.stringify(body)
    },
    provider: config.provider,
    stream
  };
}

export function extractTextFromAiResponse(provider, data) {
  if (provider === 'gemini') {
    return data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || '';
  }
  return data?.choices?.[0]?.message?.content || '';
}
