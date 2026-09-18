import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { EinvoicesController } from './einvoices.controller';
import { PrinterController } from './printer.controller';
import { PurchaseOrdersController, SuppliersController } from './suppliers.controller';
import { WarehousesController } from './warehouses.controller';

@Module({
  imports: [IdentityModule],
  controllers: [
    SuppliersController,
    PurchaseOrdersController,
    WarehousesController,
    EinvoicesController,
    PrinterController,
  ],
})
export class F6Module {}
