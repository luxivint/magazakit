import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '@magazakit/contracts';

const PRIVATE = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|\[::1\])/i;

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
  if (process.env.CHANNEL_ALLOW_PRIVATE_HOSTS !== 'true' && PRIVATE.test(url.hostname)) {
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
  const res = await fetch(url, init);
  if (!res.ok) {
    const code =
      res.status === 401 || res.status === 403
        ? ErrorCodes.CHANNEL_UNAVAILABLE
        : ErrorCodes.INTERNAL;
    throw new HttpException(
      { code, message: `${label} ${res.status} (anahtar loglanmaz)` },
      res.status === 401 || res.status === 403 ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.BAD_GATEWAY,
    );
  }
  const text = await res.text();
  if (!text) return {};
  return JSON.parse(text) as unknown;
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
