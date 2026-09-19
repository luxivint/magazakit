import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '@magazakit/contracts';
import { assertConnectTransport } from './connect-transport';
import type { Request } from 'express';

function req(partial: Partial<Request> & { appGet?: unknown; encrypted?: boolean }): Request {
  const appGet = partial.appGet ?? false;
  return {
    headers: partial.headers ?? {},
    protocol: partial.protocol ?? 'http',
    secure: partial.secure ?? false,
    ip: partial.ip,
    socket: {
      remoteAddress: partial.socket?.remoteAddress ?? (partial.ip as string | undefined),
      encrypted: partial.encrypted ?? false,
    },
    app: { get: () => appGet },
  } as unknown as Request;
}

describe('assertConnectTransport', () => {
  const prev = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = prev;
  });

  it('rejects spoofed X-Forwarded-Proto on plaintext internet HTTP', () => {
    process.env.NODE_ENV = 'production';
    expect(() =>
      assertConnectTransport(
        req({
          headers: { 'x-forwarded-proto': 'https' },
          protocol: 'https',
          ip: '203.0.113.9',
          encrypted: false,
          secure: false,
          appGet: false,
        }),
      ),
    ).toThrow(HttpException);
    try {
      assertConnectTransport(
        req({
          headers: { 'x-forwarded-proto': 'https' },
          protocol: 'https',
          ip: '203.0.113.9',
          appGet: false,
        }),
      );
    } catch (err) {
      expect((err as HttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(((err as HttpException).getResponse() as { code: string }).code).toBe(
        ErrorCodes.VALIDATION,
      );
    }
  });

  it('allows loopback without TLS', () => {
    expect(() => assertConnectTransport(req({ ip: '127.0.0.1' }))).not.toThrow();
    expect(() => assertConnectTransport(req({ ip: '::ffff:127.0.0.1' }))).not.toThrow();
  });

  it('allows direct TLS', () => {
    expect(() =>
      assertConnectTransport(req({ ip: '203.0.113.9', encrypted: true, secure: true })),
    ).not.toThrow();
  });

  it('allows forwarded HTTPS only when trust proxy is configured', () => {
    expect(() =>
      assertConnectTransport(
        req({
          ip: '10.0.0.2',
          protocol: 'https',
          headers: { 'x-forwarded-proto': 'https' },
          appGet: 1,
        }),
      ),
    ).not.toThrow();
  });
});
