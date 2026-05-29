import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createSessionCookie, parseCookies, verifySessionCookie } from '../api/lib/auth.js';

test('createSessionCookie returns an HttpOnly signed cookie accepted by verifySessionCookie', () => {
  const cookie = createSessionCookie('secret', 60_000);
  const headerValue = cookie.split(';')[0];

  assert.ok(cookie.includes('HttpOnly'));
  assert.ok(cookie.includes('SameSite=Lax'));
  assert.equal(verifySessionCookie(headerValue.replace('nika_session=', ''), 'secret'), true);
});

test('createSessionCookie can omit Secure for local development', () => {
  const cookie = createSessionCookie('secret', 60_000, { secure: false });

  assert.ok(!cookie.includes('Secure'));
  assert.ok(cookie.includes('HttpOnly'));
});

test('verifySessionCookie rejects tampered cookies', () => {
  const cookie = createSessionCookie('secret', 60_000);
  const token = cookie.split(';')[0].replace('nika_session=', '');

  assert.equal(verifySessionCookie(`${token}x`, 'secret'), false);
});

test('parseCookies parses common cookie headers', () => {
  assert.deepEqual(parseCookies('a=1; nika_session=abc%3D; theme=dark'), {
    a: '1',
    nika_session: 'abc=',
    theme: 'dark'
  });
});
