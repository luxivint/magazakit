export const ErrorCodes = {
  INTERNAL: 'INTERNAL',
  VALIDATION: 'VALIDATION',
  NOT_FOUND: 'NOT_FOUND',
  K01_TRENDYOL_UNAVAILABLE: 'K01_TRENDYOL_UNAVAILABLE',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export type ApiErrorBody = {
  error: {
    code: ErrorCode | string;
    message: string;
    details?: unknown;
  };
  requestId: string;
};

export function apiError(
  code: ErrorCode | string,
  message: string,
  requestId: string,
  details?: unknown,
): ApiErrorBody {
  return {
    error: details === undefined ? { code, message } : { code, message, details },
    requestId,
  };
}
