import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

function normalizeKey(secret) {
  if (!secret) throw new Error('Missing encryption key');
  return createHash('sha256').update(String(secret)).digest();
}

export function encryptSecret(value, secret = process.env.APP_ENCRYPTION_KEY) {
  if (!value) return '';
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, normalizeKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.');
}

export function decryptSecret(payload, secret = process.env.APP_ENCRYPTION_KEY) {
  if (!payload) return '';
  const [version, iv, tag, ciphertext] = String(payload).split('.');
  if (version !== 'v1' || !iv || !tag || !ciphertext) {
    throw new Error('Invalid encrypted payload');
  }
  const decipher = createDecipheriv(ALGORITHM, normalizeKey(secret), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64url')),
    decipher.final()
  ]).toString('utf8');
}

export function maskSecret(value) {
  if (!value) return '';
  const text = String(value);
  if (text.length <= 4) return '*'.repeat(text.length);
  return `${'*'.repeat(Math.min(12, Math.max(4, text.length - 4)))}${text.slice(-4)}`;
}
