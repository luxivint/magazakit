import { lookup } from 'node:dns/promises';
import { isIP, isIPv4 } from 'node:net';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '@magazakit/contracts';

const PRIVATE_HOST =
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|\[::1\]|::1$|f[cd][0-9a-f]{2}:|fe[89ab][0-9a-f]:)/i;

function allowPrivateHosts(): boolean {
  return process.env.CHANNEL_ALLOW_PRIVATE_HOSTS === 'true';
}

export function isBlockedIp(address: string): boolean {
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  const ip = mapped ? mapped[1] : address;
  if (isIPv4(ip)) {
    const p = ip.split('.').map((n) => Number(n));
    if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
      return true;
    }
    const [a, b] = p;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 192 && b === 0) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    if (a === 198 && b === 51) return true;
    if (a === 203 && b === 113) return true;
    if (a >= 224) return true;
    return false;
  }
  if (isIP(ip) !== 6) return true;
  const v = ip.toLowerCase();
  if (v === '::1' || v === '::') return true;
  if (v.startsWith('fc') || v.startsWith('fd')) return true;
  if (/^fe[89ab]/.test(v)) return true;
  if (v.startsWith('ff')) return true;
  if (v.startsWith('2001:db8:')) return true;
  return false;
}

function reject(label: string, message: string, status = HttpStatus.BAD_REQUEST): never {
  throw new HttpException({ code: ErrorCodes.VALIDATION, message: `${label} ${message}` }, status);
}

export function assertPublicHttps(raw: string, label: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    reject(label, 'geçersiz URL.');
  }
  if (url.protocol !== 'https:') {
    reject(label, 'HTTPS olmalı.');
  }
  if (!allowPrivateHosts() && PRIVATE_HOST.test(url.hostname)) {
    reject(label, 'özel ağa açılamaz.');
  }
  if (!allowPrivateHosts() && isIP(url.hostname) && isBlockedIp(url.hostname)) {
    reject(label, 'özel ağa açılamaz.');
  }
  return url;
}

export async function assertSafeChannelUrl(raw: string | URL, label: string): Promise<URL> {
  const url = raw instanceof URL ? raw : assertPublicHttps(raw, label);
  if (url.protocol !== 'https:') {
    reject(label, 'HTTPS olmalı.');
  }
  if (allowPrivateHosts()) return url;
  if (PRIVATE_HOST.test(url.hostname) || (isIP(url.hostname) && isBlockedIp(url.hostname))) {
    reject(label, 'özel ağa açılamaz.');
  }
  if (isIP(url.hostname)) return url;
  if (process.env.NODE_ENV === 'test') return url;
  let records: { address: string }[];
  try {
    records = await lookup(url.hostname, { all: true });
  } catch {
    reject(label, 'çözülemedi.', HttpStatus.BAD_GATEWAY);
  }
  if (!records.length || records.some((r) => isBlockedIp(r.address))) {
    reject(label, 'özel ağa açılamaz.');
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
      res = await fetchFollowingRedirects(url, { ...init, signal }, label);
    } catch (err) {
      if (err instanceof HttpException) throw err;
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

async function fetchFollowingRedirects(
  start: string | URL,
  init: RequestInit,
  label: string,
): Promise<Response> {
  let current = start instanceof URL ? start : new URL(String(start));
  for (let hop = 0; hop < 5; hop += 1) {
    await assertSafeChannelUrl(current, label);
    const res = await fetch(current, { ...init, redirect: 'manual' });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) {
        throw new HttpException(
          {
            code: ErrorCodes.CHANNEL_UNAVAILABLE,
            message: `${label} yönlendirme hedefi yok.`,
          },
          HttpStatus.BAD_GATEWAY,
        );
      }
      current = new URL(location, current);
      continue;
    }
    return res;
  }
  throw new HttpException(
    {
      code: ErrorCodes.CHANNEL_UNAVAILABLE,
      message: `${label} çok fazla yönlendirme.`,
    },
    HttpStatus.BAD_GATEWAY,
  );
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
