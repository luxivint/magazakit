export type HealthResponse = {
  status: 'ok';
  service: 'api' | 'worker';
  mock: boolean;
  auth: {
    provider: 'firebase';
    configured: boolean;
  };
  trendyol?: {
    mode: 'mock' | 'unconfigured';
    k01: string;
  };
};
