import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import type { PurchaseOrderStub, Supplier } from '@magazakit/contracts';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { IdentityStore } from '../identity/identity.store';

@Controller('v1/suppliers')
export class SuppliersController {
  constructor(private readonly identity: IdentityStore) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<{ items: Supplier[] }> {
    return this.identity.listSuppliers(user.uid);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<Supplier> {
    return this.identity.getSupplier(user.uid, id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: { name?: string; note?: string },
  ): Promise<Supplier> {
    return this.identity.saveSupplier(user.uid, body ?? {});
  }

  @Patch(':id')
  patch(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { name?: string; note?: string | null },
  ): Promise<Supplier> {
    return this.identity.saveSupplier(user.uid, { ...body, id });
  }
}

@Controller('v1/purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly identity: IdentityStore) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<{ items: PurchaseOrderStub[]; stub: true }> {
    return this.identity.listPurchaseOrders(user.uid);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: { supplierId?: string; sku?: string; qty?: number },
  ): Promise<PurchaseOrderStub> {
    return this.identity.createPurchaseOrder(user.uid, body ?? {});
  }
}
