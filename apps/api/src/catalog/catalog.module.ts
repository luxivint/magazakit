import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { OperationsController } from './operations.controller';
import { OrdersController } from './orders.controller';
import { ProductsController } from './products.controller';
import { StockController } from './stock.controller';

@Module({
  imports: [IdentityModule],
  controllers: [ProductsController, OrdersController, StockController, OperationsController],
})
export class CatalogModule {}
