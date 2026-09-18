import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { OutboxEntry, StockBalance, StockMovement } from '@magazakit/contracts';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { IdentityStore } from '../identity/identity.store';

@Controller('v1/stock')
export class StockController {
  constructor(private readonly identity: IdentityStore) {}

  @Get('movements')
  movements(@CurrentUser() user: AuthUser): Promise<{ items: StockMovement[] }> {
    return this.identity.listMovements(user.uid);
  }

  @Get('outbox')
  outbox(@CurrentUser() user: AuthUser): Promise<{ items: OutboxEntry[] }> {
    return this.identity.listOutbox(user.uid);
  }

  @Get(':sku')
  balance(@CurrentUser() user: AuthUser, @Param('sku') sku: string): Promise<StockBalance> {
    return this.identity.getSkuStock(user.uid, sku);
  }

  @Post('adjust')
  adjust(
    @CurrentUser() user: AuthUser,
    @Body() body: { sku?: string; deltaPhysical?: number; reason?: 'adjust' | 'count'; idempotencyKey?: string },
  ): Promise<{ balance: StockBalance; movement: StockMovement; outbox: OutboxEntry }> {
    return this.identity.adjustStock(user.uid, body ?? {});
  }
}
