import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isAllowedProxyTarget } from '../api/lib/proxy-targets.js';

test('proxy target rules allow common AI and SD endpoints', () => {
  assert.equal(isAllowedProxyTarget('https://api.deepseek.com/chat/completions'), true);
  assert.equal(isAllowedProxyTarget('https://generativelanguage.googleapis.com/v1beta/models/gemini:generateContent?key=x'), true);
  assert.equal(isAllowedProxyTarget('http://192.168.1.20:7860/sdapi/v1/txt2img'), true);
});

test('proxy target rules reject unrelated web URLs and non-http protocols', () => {
  assert.equal(isAllowedProxyTarget('https://example.com/profile'), false);
  assert.equal(isAllowedProxyTarget('file:///etc/passwd'), false);
});
