import { decryptJson, encryptJson } from './crypto';

describe('shop credential crypto', () => {
  it('round-trips JSON and does not embed plaintext', () => {
    const blob = encryptJson({ accessToken: 'super-secret-token' });
    expect(blob.startsWith('v1.')).toBe(true);
    expect(blob).not.toContain('super-secret-token');
    expect(decryptJson<{ accessToken: string }>(blob).accessToken).toBe('super-secret-token');
  });

  it('requires CREDENTIALS_ENCRYPTION_KEY outside test', () => {
    const prevKey = process.env.CREDENTIALS_ENCRYPTION_KEY;
    const prevEnv = process.env.NODE_ENV;
    delete process.env.CREDENTIALS_ENCRYPTION_KEY;
    process.env.NODE_ENV = 'production';
    try {
      expect(() => encryptJson({ a: 1 })).toThrow(/CREDENTIALS_ENCRYPTION_KEY/);
    } finally {
      process.env.NODE_ENV = prevEnv;
      if (prevKey === undefined) delete process.env.CREDENTIALS_ENCRYPTION_KEY;
      else process.env.CREDENTIALS_ENCRYPTION_KEY = prevKey;
    }
  });
});
