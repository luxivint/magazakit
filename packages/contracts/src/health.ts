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
  persistence: 'memory' | 'postgres';
  outbox?: {
    pending: number;
    channel: 'trendyol';
    mock: true;
  };
  trendyol?: {
    mode: 'mock' | 'unconfigured';
    k01: string;
  };
};
