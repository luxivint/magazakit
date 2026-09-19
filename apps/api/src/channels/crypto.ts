import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const DEV_FALLBACK = 'magazam-dev-credentials-key';
const WEAK_KEY =
  /replace-me|changeme|placeholder|example|local-only|magazam-dev|password|secret123/i;

function isTestRuntime(): boolean {
  return process.env.NODE_ENV === 'test';
}

function parseWrappingKey(raw: string): Buffer {
  const t = raw.trim();
  if (!t || WEAK_KEY.test(t) || t.length < 32) {
    throw new Error(
      'CREDENTIALS_ENCRYPTION_KEY zayıf/placeholder. openssl rand -hex 32 üretin (64 hex veya 32-byte base64).',
    );
  }
  if (/^[0-9a-f]{64}$/i.test(t)) {
    return Buffer.from(t, 'hex');
  }
  const b64 = Buffer.from(t, 'base64');
  if (b64.length === 32) {
    return b64;
  }
  throw new Error(
    'CREDENTIALS_ENCRYPTION_KEY 32-byte hex (64 karakter) veya 32-byte base64 olmalı.',
  );
}

function masterKey(): Buffer {
  const raw = process.env.CREDENTIALS_ENCRYPTION_KEY?.trim();
  if (raw) {
    return parseWrappingKey(raw);
  }
  if (isTestRuntime()) {
    return scryptSync(DEV_FALLBACK, 'magazam-shop-credentials', 32);
  }
  throw new Error(
    'CREDENTIALS_ENCRYPTION_KEY zorunlu. openssl rand -hex 32 (yalnızca test ortamında varsayılan anahtar kullanılır).',
  );
}

/** Call after loading env. Throws if wrapping key is missing/weak outside Jest unset. */
export function assertCredentialsEncryptionKey(): void {
  masterKey();
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
