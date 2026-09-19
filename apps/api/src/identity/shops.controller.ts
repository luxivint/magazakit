import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { ShopConnectRequest, ShopStatus, ShopSyncResult } from '@magazakit/contracts';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { IdentityStore } from './identity.store';

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
    @Body() body: ShopConnectRequest,
  ): Promise<ShopStatus> {
    return this.identity.connectTrendyolMock(user.uid, body);
  }

  @Post(':channel/connect')
  async connectChannel(
    @CurrentUser() user: AuthUser,
    @Param('channel') channel: string,
    @Body() body: ShopConnectRequest,
  ): Promise<ShopStatus> {
    return this.identity.connectChannel(user.uid, channel, body);
  }

  @Post(':id/sync')
  async sync(
    @CurrentUser() user: AuthUser,
    @Param('id') shopId: string,
  ): Promise<ShopSyncResult> {
    return this.identity.syncShop(user.uid, shopId);
  }
}
