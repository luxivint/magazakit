export type HealthResponse = {
  status: 'ok';
  service: 'api' | 'worker';
  mock: boolean;
  trendyol?: {
    mode: 'mock' | 'unconfigured';
    k01: string;
  };
};
