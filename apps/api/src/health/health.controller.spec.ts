import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports mock mode by default', () => {
    delete process.env.TRENDYOL_USE_MOCK;
    const body = new HealthController().getHealth();
    expect(body.status).toBe('ok');
    expect(body.mock).toBe(true);
    expect(body.trendyol?.mode).toBe('mock');
  });
});
