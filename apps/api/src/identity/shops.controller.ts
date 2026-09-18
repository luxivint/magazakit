import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { ShopStatus, ShopSyncResult } from '@magazakit/contracts';
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
  async list(@CurrentUser() user: AuthUser): Promise<{ items: ShopStatus[]; mock: boolean }> {
    const items = await this.identity.listShops(user.uid);
    return { items, mock: items.every((s) => s.mock) };
  }

  @Post('trendyol/connect')
  async connectTrendyol(
    @CurrentUser() user: AuthUser,
    @Body() body: ConnectBody,
  ): Promise<ShopStatus> {
    return this.identity.connectTrendyolMock(user.uid, body?.sellerId);
  }

  @Post(':channel/connect')
  async connectChannel(
    @CurrentUser() user: AuthUser,
    @Param('channel') channel: string,
    @Body() body: ConnectBody,
  ): Promise<ShopStatus> {
    return this.identity.connectChannel(user.uid, channel, body?.sellerId);
  }

  @Post(':id/sync')
  async sync(
    @CurrentUser() user: AuthUser,
    @Param('id') shopId: string,
  ): Promise<ShopSyncResult> {
    return this.identity.syncShop(user.uid, shopId);
  }
}
