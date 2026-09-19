import { HttpException, HttpStatus } from '@nestjs/common';
import type { OrderListItem, PageQuery, PreviewList, ProductListItem } from '@magazakit/contracts';
import { ErrorCodes } from '@magazakit/contracts';
import { K01_NOTE } from '../config/trendyol-env';
import type { TrendyolReadAdapter } from './trendyol-read.adapter';

/** Live client is unimplemented until K01 credentials exist. No secrets are read. */
export class UnconfiguredTrendyolReadAdapter implements TrendyolReadAdapter {
  readonly channel = 'trendyol' as const;
  readonly mock = false;

  async probe(): Promise<void> {
    throw this.blocked();
  }

  async pullFeed(): Promise<{ listings: never[]; orders: never[]; returns: never[] }> {
    throw this.blocked();
  }

  async listProducts(_query: PageQuery): Promise<PreviewList<ProductListItem>> {
    throw this.blocked();
  }

  async listOrders(_query: PageQuery): Promise<PreviewList<OrderListItem>> {
    throw this.blocked();
  }

  private blocked(): HttpException {
    return new HttpException(
      { code: ErrorCodes.K01_TRENDYOL_UNAVAILABLE, message: K01_NOTE },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
