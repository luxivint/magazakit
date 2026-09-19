import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const DEV_FALLBACK = 'magazam-dev-credentials-key';

function masterKey(): Buffer {
  const raw = process.env.CREDENTIALS_ENCRYPTION_KEY?.trim();
  if (raw) {
    if (/^[0-9a-f]{64}$/i.test(raw)) {
      return Buffer.from(raw, 'hex');
    }
    return scryptSync(raw, 'magazam-shop-credentials', 32);
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CREDENTIALS_ENCRYPTION_KEY production’da zorunlu.');
  }
  return scryptSync(DEV_FALLBACK, 'magazam-shop-credentials', 32);
}

export function encryptJson(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', masterKey(), iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${enc.toString('base64url')}`;
}

export function decryptJson<T>(blob: string): T {
  const parts = blob.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('Geçersiz kimlik paketi.');
  }
  const iv = Buffer.from(parts[1], 'base64url');
  const tag = Buffer.from(parts[2], 'base64url');
  const enc = Buffer.from(parts[3], 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', masterKey(), iv);
  decipher.setAuthTag(tag);
  const raw = Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  return JSON.parse(raw) as T;
}
