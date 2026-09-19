import { trendyolMode } from './trendyol-env';

describe('trendyolMode', () => {
  const keys = ['TRENDYOL_USE_MOCK'] as const;
  const prev: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of keys) prev[key] = process.env[key];
  });

  afterEach(() => {
    for (const key of keys) {
      if (prev[key] === undefined) delete process.env[key];
      else process.env[key] = prev[key];
    }
  });

  it('defaults to mock', () => {
    delete process.env.TRENDYOL_USE_MOCK;
    expect(trendyolMode()).toBe('mock');
  });

  it('is unconfigured when mock is off — live keys are per shop, not env', () => {
    process.env.TRENDYOL_USE_MOCK = 'false';
    expect(trendyolMode()).toBe('unconfigured');
  });
});
