import assert from 'node:assert/strict';
import { test } from 'node:test';

import { artifactPathname, decodeBase64DataUrl } from '../api/lib/artifacts.js';

test('decodeBase64DataUrl returns content type and bytes', () => {
  const decoded = decodeBase64DataUrl('data:text/plain;base64,aGVsbG8=');

  assert.equal(decoded.contentType, 'text/plain');
  assert.equal(decoded.buffer.toString('utf8'), 'hello');
});

test('artifactPathname sanitizes unsafe path characters', () => {
  assert.equal(
    artifactPathname('worldbook', 'art_123', 'bad:name?.json'),
    'artifacts/worldbook/art_123-bad_name_.json'
  );
});
