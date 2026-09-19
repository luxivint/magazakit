import { Body, Controller, Get, Param, Post, Put, Req } from '@nestjs/common';
import type { ShopConnectRequest, ShopStatus, ShopSyncResult, TrendyolTariff } from '@magazakit/contracts';
import type { Request } from 'express';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { assertConnectTransport } from './connect-transport';
import { IdentityStore } from './identity.store';

@Controller('v1/shops')
export class ShopsController {
  constructor(private readonly identity: IdentityStore) {}

  @Get()
  async list(@CurrentUser() user: AuthUser): Promise<{ items: ShopStatus[]; mock: boolean }> {
    const items = await this.identity.listShops(user.uid);
    return { items, mock: items.every((s) => s.mock) };
  }

  @Get('trendyol/tariff')
  getTariff(@CurrentUser() user: AuthUser): Promise<TrendyolTariff> {
    return this.identity.getTrendyolTariff(user.uid);
  }

  @Put('trendyol/tariff')
  saveTariff(
    @CurrentUser() user: AuthUser,
    @Body() body: Partial<TrendyolTariff>,
  ): Promise<TrendyolTariff> {
    return this.identity.saveTrendyolTariff(user.uid, body ?? {});
  }

  @Post('trendyol/connect')
  async connectTrendyol(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Body() body: ShopConnectRequest,
  ): Promise<ShopStatus> {
    assertConnectTransport(req);
    return this.identity.connectTrendyolMock(user.uid, body);
  }

  @Post(':channel/connect')
  async connectChannel(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Param('channel') channel: string,
    @Body() body: ShopConnectRequest,
  ): Promise<ShopStatus> {
    assertConnectTransport(req);
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
