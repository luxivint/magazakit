import { decryptJson, encryptJson } from './crypto';

describe('shop credential crypto', () => {
  it('round-trips JSON and does not embed plaintext', () => {
    const blob = encryptJson({ accessToken: 'super-secret-token' });
    expect(blob.startsWith('v1.')).toBe(true);
    expect(blob).not.toContain('super-secret-token');
    expect(decryptJson<{ accessToken: string }>(blob).accessToken).toBe('super-secret-token');
  });
});
