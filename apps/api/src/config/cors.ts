import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/** Native Expo has no Origin; Expo web / Metro / tunnels do. */
export function isExpoDevOrigin(origin: string): boolean {
  if (
    /^(https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?)$/i.test(origin)
  ) {
    return true;
  }
  if (/^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$/i.test(origin)) {
    return true;
  }
  if (/^exp:\/\//i.test(origin)) {
    return true;
  }
  if (/\.(expo\.dev|exp\.direct|exp\.host)(:\d+)?$/i.test(origin.replace(/^https?:\/\//, ''))) {
    return true;
  }
  if (/\.trycloudflare\.com$/i.test(origin.replace(/^https?:\/\//, '').split('/')[0])) {
    return true;
  }
  return false;
}

export function corsOptions(): CorsOptions {
  const extra = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (extra.includes('*') || isExpoDevOrigin(origin) || extra.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'Accept',
      'x-request-id',
      'X-Request-Id',
      'X-Firebase-AppCheck',
    ],
    exposedHeaders: ['x-request-id'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    maxAge: 86400,
  };
}
