import { Module } from '@nestjs/common';
import { TrendyolModule } from '../trendyol/trendyol.module';
import { OrdersController } from './orders.controller';
import { ProductsController } from './products.controller';

@Module({
  imports: [TrendyolModule],
  controllers: [ProductsController, OrdersController],
})
export class CatalogModule {}
