import { Body, Controller, Get, Post } from '@nestjs/common';
import type { ShopStatus } from '@magazakit/contracts';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { IdentityStore } from './identity.store';

type ConnectBody = {
  sellerId?: string;
  /** Ignored. Never stored or logged (K01). */
  apiKey?: string;
  apiSecret?: string;
};

@Controller('v1/shops')
export class ShopsController {
  constructor(private readonly identity: IdentityStore) {}

  @Get()
  async list(@CurrentUser() user: AuthUser): Promise<{ items: ShopStatus[]; mock: true }> {
    const items = await this.identity.listShops(user.uid);
    return { items, mock: true };
  }

  @Post('trendyol/connect')
  async connectTrendyol(
    @CurrentUser() user: AuthUser,
    @Body() _body: ConnectBody,
  ): Promise<ShopStatus> {
    void _body;
    return this.identity.connectTrendyolMock(user.uid);
  }
}
