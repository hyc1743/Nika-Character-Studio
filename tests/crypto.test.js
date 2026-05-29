import assert from 'node:assert/strict';
import { test } from 'node:test';

import { decryptSecret, encryptSecret, maskSecret } from '../api/lib/crypto.js';

test('encryptSecret stores decryptable ciphertext without plaintext leakage', () => {
  const key = '0123456789abcdef0123456789abcdef';
  const encrypted = encryptSecret('sk-test-secret', key);

  assert.notEqual(encrypted, 'sk-test-secret');
  assert.ok(!encrypted.includes('sk-test-secret'));
  assert.equal(decryptSecret(encrypted, key), 'sk-test-secret');
});

test('maskSecret only exposes a short suffix', () => {
  assert.equal(maskSecret('sk-1234567890abcdef'), '************cdef');
  assert.equal(maskSecret('abc'), '***');
  assert.equal(maskSecret(''), '');
});
