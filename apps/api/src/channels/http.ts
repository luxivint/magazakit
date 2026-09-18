import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '@magazakit/contracts';

const PRIVATE =
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|\[::1\])/i;

export function assertPublicHttps(raw: string, label: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new HttpException(
      { code: ErrorCodes.VALIDATION, message: `${label} geçersiz URL.` },
      HttpStatus.BAD_REQUEST,
    );
  }
  if (url.protocol !== 'https:') {
    throw new HttpException(
      { code: ErrorCodes.VALIDATION, message: `${label} HTTPS olmalı.` },
      HttpStatus.BAD_REQUEST,
    );
  }
  if (
    process.env.CHANNEL_ALLOW_PRIVATE_HOSTS !== 'true' &&
    PRIVATE.test(url.hostname)
  ) {
    throw new HttpException(
      { code: ErrorCodes.VALIDATION, message: `${label} özel ağa açılamaz.` },
      HttpStatus.BAD_REQUEST,
    );
  }
  return url;
}

export async function channelFetchJson(
  url: string | URL,
  init: RequestInit,
  label: string,
): Promise<unknown> {
  const attempts = 3;
  let res: Response | undefined;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const timeout = AbortSignal.timeout(
      Number(process.env.CHANNEL_HTTP_TIMEOUT_MS) || 15_000,
    );
    const signal = init.signal
      ? AbortSignal.any([init.signal, timeout])
      : timeout;
    try {
      res = await fetch(url, { ...init, signal });
    } catch {
      if (attempt + 1 < attempts && !init.signal?.aborted) {
        await delay(250 * 2 ** attempt);
        continue;
      }
      throw new HttpException(
        {
          code: ErrorCodes.CHANNEL_UNAVAILABLE,
          message: `${label} bağlantı/timeout hatası.`,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
    if (res.status !== 429 && res.status < 500) break;
    if (attempt + 1 >= attempts) break;
    const retryAfter = Number(res.headers.get('retry-after'));
    await delay(
      Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 5000)
        : 250 * 2 ** attempt,
    );
  }
  if (!res) {
    throw new HttpException(
      {
        code: ErrorCodes.CHANNEL_UNAVAILABLE,
        message: `${label} yanıt vermedi.`,
      },
      HttpStatus.BAD_GATEWAY,
    );
  }
  if (!res.ok) {
    const code =
      res.status === 401 || res.status === 403
        ? ErrorCodes.CHANNEL_UNAVAILABLE
        : ErrorCodes.INTERNAL;
    throw new HttpException(
      { code, message: `${label} ${res.status} (anahtar loglanmaz)` },
      res.status === 401 || res.status === 403
        ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.BAD_GATEWAY,
    );
  }
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HttpException(
      {
        code: ErrorCodes.INTERNAL,
        message: `${label} geçersiz JSON döndürdü.`,
      },
      HttpStatus.BAD_GATEWAY,
    );
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function rec(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function str(value: unknown): string {
  return value == null ? '' : String(value).trim();
}

export function num(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

export function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
