export type HealthResponse = {
  status: 'ok';
  service: 'api' | 'worker';
  mock: boolean;
  auth: {
    provider: 'firebase';
    projectId: string | null;
    configured: boolean;
    credential: 'adc' | 'project-id-only' | 'none';
  };
  trendyol?: {
    mode: 'mock' | 'unconfigured';
    k01: string;
  };
};
