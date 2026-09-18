import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { TrendyolModule } from '../trendyol/trendyol.module';
import { OrdersController } from './orders.controller';
import { ProductsController } from './products.controller';

@Module({
  imports: [TrendyolModule, IdentityModule],
  controllers: [ProductsController, OrdersController],
})
export class CatalogModule {}
