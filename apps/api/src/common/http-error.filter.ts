import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { apiError, ErrorCodes } from '@magazakit/contracts';
import type { Request, Response } from 'express';
import { readRequestId } from './request-id.middleware';

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const requestId = readRequestId(req);

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const message =
        typeof payload === 'string'
          ? payload
          : typeof payload === 'object' && payload !== null && 'message' in payload
            ? String((payload as { message: unknown }).message)
            : exception.message;
      const code =
        typeof payload === 'object' && payload !== null && 'code' in payload
          ? String((payload as { code: unknown }).code)
          : status === HttpStatus.NOT_FOUND
            ? ErrorCodes.NOT_FOUND
            : status === HttpStatus.BAD_REQUEST
              ? ErrorCodes.VALIDATION
              : status === HttpStatus.UNAUTHORIZED
                ? ErrorCodes.UNAUTHENTICATED
                  : status === HttpStatus.FORBIDDEN
                    ? ErrorCodes.FORBIDDEN
                    : status === HttpStatus.CONFLICT
                      ? ErrorCodes.CONFLICT
                      : ErrorCodes.INTERNAL;
      res.status(status).json(apiError(code, message, requestId));
      return;
    }

    this.logger.error(
      `unhandled error requestId=${requestId}`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(apiError(ErrorCodes.INTERNAL, 'Beklenmeyen bir hata oluştu.', requestId));
  }
}
