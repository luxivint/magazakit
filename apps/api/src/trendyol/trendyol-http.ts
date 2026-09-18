import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '@magazakit/contracts';
import type { TrendyolLiveConfig } from '../config/trendyol-env';

export type TrendyolQuery = Record<string, string | number | undefined>;

function redactUrl(url: string): string {
  return url.replace(/\/\/[^/]+@/, '//***@');
}

export class TrendyolHttpError extends HttpException {
  constructor(status: number, message: string) {
    const code =
      status === 401 || status === 403
        ? ErrorCodes.K01_TRENDYOL_UNAVAILABLE
        : ErrorCodes.INTERNAL;
    super(
      {
        code,
        message,
      },
      status === 401 || status === 403 ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.BAD_GATEWAY,
    );
  }
}

export async function trendyolGetJson(
  config: TrendyolLiveConfig,
  path: string,
  query: TrendyolQuery = {},
): Promise<unknown> {
  const url = new URL(path.startsWith('http') ? path : `${config.baseUrl}${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '') continue;
    url.searchParams.set(key, String(value));
  }
  const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`, 'utf8').toString('base64');
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${auth}`,
      'User-Agent': config.userAgent,
      Accept: 'application/json',
    },
  });
  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after');
    const waitMs = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) * 1000 : 1000;
    await new Promise((resolve) => setTimeout(resolve, Math.min(waitMs, 5000)));
    return trendyolGetJsonOnce(config, url, auth);
  }
  return parseResponse(res, url);
}

async function trendyolGetJsonOnce(
  config: TrendyolLiveConfig,
  url: URL,
  auth: string,
): Promise<unknown> {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${auth}`,
      'User-Agent': config.userAgent,
      Accept: 'application/json',
    },
  });
  return parseResponse(res, url);
}

async function parseResponse(res: Response, url: URL): Promise<unknown> {
  if (!res.ok) {
    throw new TrendyolHttpError(
      res.status,
      `Trendyol ${res.status} ${redactUrl(url.pathname)} (anahtar loglanmaz)`,
    );
  }
  return res.json() as Promise<unknown>;
}
