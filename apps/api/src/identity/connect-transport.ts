import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '@magazakit/contracts';
import type { Request } from 'express';

function isLoopbackIp(ip: string): boolean {
  const v = ip.replace('::ffff:', '');
  return v === '127.0.0.1' || v === '::1' || v === 'localhost';
}

/** Production connect must be HTTPS except loopback. Tests skip. */
export function assertConnectTransport(req: Request): void {
  if (process.env.NODE_ENV === 'test') return;
  const forwarded = String(req.headers['x-forwarded-proto'] ?? '')
    .split(',')[0]
    ?.trim()
    .toLowerCase();
  const proto = forwarded || req.protocol || '';
  const ip = String(req.ip || req.socket?.remoteAddress || '');
  if (proto === 'https' || isLoopbackIp(ip)) return;
  if (process.env.NODE_ENV === 'production') {
    throw new HttpException(
      {
        code: ErrorCodes.VALIDATION,
        message: 'Mağaza anahtarları yalnızca HTTPS üzerinden gönderilir.',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
