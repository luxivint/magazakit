import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '@magazakit/contracts';
import type { Request } from 'express';

function isLoopbackIp(ip: string): boolean {
  const v = ip.replace(/^::ffff:/i, '');
  return v === '127.0.0.1' || v === '::1' || v === 'localhost';
}

function isDirectTls(req: Request): boolean {
  if (req.secure === true) return true;
  return Boolean((req.socket as { encrypted?: boolean } | undefined)?.encrypted);
}

/** Express only honors X-Forwarded-* when `trust proxy` is set in main.ts via TRUST_PROXY. */
export function trustsForwardedProto(req: Request): boolean {
  const setting = req.app?.get?.('trust proxy');
  if (setting === undefined || setting === false || setting === 0 || setting === 'false') {
    return false;
  }
  return true;
}

/**
 * Shop secrets: loopback, real TLS, or HTTPS as seen by a configured reverse proxy.
 * X-Forwarded-Proto is never read directly — spoofed headers on a public HTTP port do not pass.
 */
export function assertConnectTransport(req: Request): void {
  const ip = String(req.ip || req.socket?.remoteAddress || '');
  if (isLoopbackIp(ip)) return;
  if (isDirectTls(req)) return;
  if (trustsForwardedProto(req) && req.protocol === 'https') return;
  throw new HttpException(
    {
      code: ErrorCodes.VALIDATION,
      message: 'Mağaza anahtarları yalnızca HTTPS üzerinden gönderilir.',
    },
    HttpStatus.BAD_REQUEST,
  );
}
