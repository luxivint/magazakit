import { Body, Controller, Get, Post } from '@nestjs/common';
import type { Warehouse, WarehouseTransfer } from '@magazakit/contracts';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { IdentityStore } from '../identity/identity.store';

@Controller('v1/warehouses')
export class WarehousesController {
  constructor(private readonly identity: IdentityStore) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<{ items: Warehouse[] }> {
    return this.identity.listWarehouses(user.uid);
  }

  @Post('transfers')
  transfer(
    @CurrentUser() user: AuthUser,
    @Body() body: { fromWarehouseId?: string; toWarehouseId?: string; sku?: string; qty?: number },
  ): Promise<WarehouseTransfer> {
    return this.identity.transferStock(user.uid, body ?? {});
  }
}
