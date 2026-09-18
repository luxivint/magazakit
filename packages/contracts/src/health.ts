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
    mock: boolean;
  };
  trendyol?: {
    mode: 'mock' | 'live' | 'unconfigured';
    k01: string;
  };
  channels?: {
    channel: string;
    mode: 'mock' | 'live' | 'unconfigured' | 'blocked';
    write: false;
  }[];
};
