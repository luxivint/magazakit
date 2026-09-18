export const ErrorCodes = {
  INTERNAL: 'INTERNAL',
  VALIDATION: 'VALIDATION',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  AUTH_NOT_CONFIGURED: 'AUTH_NOT_CONFIGURED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  UNMAPPED_SKU: 'UNMAPPED_SKU',
  WRONG_SKU: 'WRONG_SKU',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  PACK_INCOMPLETE: 'PACK_INCOMPLETE',
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
