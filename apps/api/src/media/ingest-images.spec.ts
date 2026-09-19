import { mirrorListingImages } from './ingest-images';
import type { R2Config } from './r2';
import type { MockListingSeed } from '../trendyol/mock-feed';

const listing = (over: Partial<MockListingSeed> = {}): MockListingSeed => ({
  id: 'ty-1',
  sku: 'SKU',
  barcode: '1',
  title: 'Clip',
  channel: 'trendyol',
  priceTry: 10,
  marketplaceStock: 1,
  physicalStock: 0,
  reservedStock: 0,
  sellableStock: 0,
  critical: false,
  status: 'active',
  statusLabel: 'Aktif',
  imageUrl: 'https://cdn.example/a.jpg',
  ...over,
});

const cfg: R2Config = {
  endpoint: 'https://acct.r2.cloudflarestorage.com',
  bucket: 'magazakit',
  accessKeyId: 'id',
  secretAccessKey: 'secret',
  publicBaseUrl: 'https://pub.example.dev',
  region: 'auto',
};

describe('mirrorListingImages', () => {
  it('leaves listings unchanged without R2', async () => {
    const items = [listing()];
    await expect(mirrorListingImages('org', items, { config: null })).resolves.toBe(items);
  });

  it('rewrites marketplace URLs to the public R2 base', async () => {
    const out = await mirrorListingImages('org-1', [listing()], {
      config: cfg,
      fetchBytes: async () => ({ bytes: Buffer.from('img'), contentType: 'image/jpeg' }),
      put: async (_c, key) => `https://pub.example.dev/${key}`,
    });
    expect(out[0].imageUrl).toBe('https://pub.example.dev/catalog/org-1/ty-1.jpg');
    expect(out[0].imageUrls?.[0]).toBe(out[0].imageUrl);
  });

  it('keeps the source URL when download fails', async () => {
    const out = await mirrorListingImages('org', [listing()], {
      config: cfg,
      fetchBytes: async () => {
        throw new Error('cdn down');
      },
      put: async () => {
        throw new Error('should not put');
      },
    });
    expect(out[0].imageUrl).toBe('https://cdn.example/a.jpg');
  });
});
