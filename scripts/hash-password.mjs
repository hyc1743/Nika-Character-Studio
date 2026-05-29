import { randomBytes, scryptSync } from 'node:crypto';
import { readFileSync } from 'node:fs';

function readPassword() {
  const arg = process.argv[2];
  if (arg) return arg;
  const piped = readFileSync(0, 'utf8').trim();
  if (!piped) {
    console.error('Usage: npm run hash-password -- "your-password"');
    process.exit(1);
  }
  return piped;
}

const password = readPassword();
const salt = randomBytes(16).toString('base64url');
const hash = scryptSync(password, salt, 64).toString('base64url');
console.log(`scrypt:${salt}:${hash}`);
