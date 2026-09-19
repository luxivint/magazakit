import { objectKeyForListing, readR2Config, signR2Put } from './r2';

describe('R2 config', () => {
  it('is absent without S3 keys', () => {
    expect(
      readR2Config({
        R2_BUCKET: 'magazakit',
      } as NodeJS.ProcessEnv),
    ).toBeNull();
  });

  it('reads endpoint and public base', () => {
    const cfg = readR2Config({
      R2_ACCESS_KEY_ID: 'AKIA',
      R2_SECRET_ACCESS_KEY: 'secret',
      R2_S3_ENDPOINT: 'https://acct.r2.cloudflarestorage.com',
      R2_PUBLIC_BASE_URL: 'https://pub.example.dev/',
      R2_BUCKET: 'magazakit',
    } as NodeJS.ProcessEnv);
    expect(cfg).toMatchObject({
      bucket: 'magazakit',
      publicBaseUrl: 'https://pub.example.dev',
      region: 'auto',
    });
  });

  it('signs PUT with sha256 payload hash', () => {
    const cfg = readR2Config({
      R2_ACCESS_KEY_ID: 'AKIA',
      R2_SECRET_ACCESS_KEY: 'secret',
      R2_S3_ENDPOINT: 'https://acct.r2.cloudflarestorage.com',
      R2_PUBLIC_BASE_URL: 'https://pub.example.dev',
    } as NodeJS.ProcessEnv)!;
    const signed = signR2Put({
      config: cfg,
      key: 'catalog/org/item.jpg',
      body: Buffer.from('abc'),
      contentType: 'image/jpeg',
      now: new Date('2026-09-19T10:00:00.000Z'),
    });
    expect(signed.url.pathname).toBe('/magazakit/catalog/org/item.jpg');
    expect(signed.headers.Authorization).toContain('AWS4-HMAC-SHA256');
    expect(signed.headers['x-amz-content-sha256']).toHaveLength(64);
  });

  it('builds listing object keys', () => {
    expect(objectKeyForListing('org/1', 'ty-abc', 'image/png', 'https://cdn/x.jpg')).toBe(
      'catalog/org_1/ty-abc.png',
    );
  });
});
