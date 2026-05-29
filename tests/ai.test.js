import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildAiRequest, sanitizeApiConfig } from '../api/lib/ai.js';

test('sanitizeApiConfig removes plaintext API keys', () => {
  const sanitized = sanitizeApiConfig({
    id: 'cfg_1',
    name: 'DeepSeek',
    provider: 'openai-compatible',
    apiKey: 'sk-secret',
    model: 'deepseek-chat'
  });

  assert.equal(sanitized.hasKey, true);
  assert.equal('apiKey' in sanitized, false);
});

test('buildAiRequest creates OpenAI-compatible chat completion request', () => {
  const request = buildAiRequest({
    config: {
      provider: 'openai-compatible',
      baseUrl: 'https://api.example.com/v1',
      apiKey: 'sk-secret',
      model: 'model-a'
    },
    messages: [{ role: 'user', content: 'hello' }],
    stream: true
  });

  assert.equal(request.url, 'https://api.example.com/v1/chat/completions');
  assert.equal(request.init.headers.Authorization, 'Bearer sk-secret');
  assert.equal(JSON.parse(request.init.body).stream, true);
});

test('buildAiRequest creates Gemini request without Authorization header', () => {
  const request = buildAiRequest({
    config: {
      provider: 'gemini',
      baseUrl: 'https://generativelanguage.googleapis.com',
      apiKey: 'AIza-secret',
      model: 'gemini-2.5-flash'
    },
    messages: [
      { role: 'system', content: 'system text' },
      { role: 'user', content: 'hello' }
    ]
  });

  assert.ok(request.url.includes(':generateContent?key=AIza-secret'));
  assert.equal('Authorization' in request.init.headers, false);
  assert.equal(JSON.parse(request.init.body).systemInstruction.parts[0].text, 'system text');
});
