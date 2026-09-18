import { readTrendyolLiveConfig, trendyolMode } from './trendyol-env';

describe('trendyolMode', () => {
  const keys = [
    'TRENDYOL_USE_MOCK',
    'TRENDYOL_SELLER_ID',
    'TRENDYOL_API_KEY',
    'TRENDYOL_API_SECRET',
    'TRENDYOL_BASE_URL',
    'TRENDYOL_ENV',
  ] as const;
  const prev: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of keys) {
      prev[key] = process.env[key];
    }
  });

  afterEach(() => {
    for (const key of keys) {
      if (prev[key] === undefined) delete process.env[key];
      else process.env[key] = prev[key];
    }
  });

  it('defaults to mock even if live env is set', () => {
    delete process.env.TRENDYOL_USE_MOCK;
    process.env.TRENDYOL_SELLER_ID = '1';
    process.env.TRENDYOL_API_KEY = 'k';
    process.env.TRENDYOL_API_SECRET = 's';
    expect(trendyolMode()).toBe('mock');
  });

  it('is live only when mock is off and seller+key+secret exist', () => {
    process.env.TRENDYOL_USE_MOCK = 'false';
    process.env.TRENDYOL_SELLER_ID = '4321';
    process.env.TRENDYOL_API_KEY = 'k';
    process.env.TRENDYOL_API_SECRET = 's';
    delete process.env.TRENDYOL_BASE_URL;
    expect(trendyolMode()).toBe('live');
    expect(readTrendyolLiveConfig()?.baseUrl).toBe('https://apigw.trendyol.com');
    expect(readTrendyolLiveConfig()?.userAgent).toBe('4321 - SelfIntegration');
  });

  it('is unconfigured when mock is off but secrets missing', () => {
    process.env.TRENDYOL_USE_MOCK = 'false';
    delete process.env.TRENDYOL_SELLER_ID;
    delete process.env.TRENDYOL_API_KEY;
    delete process.env.TRENDYOL_API_SECRET;
    expect(trendyolMode()).toBe('unconfigured');
    expect(readTrendyolLiveConfig()).toBeNull();
  });
});
