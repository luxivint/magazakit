import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { OrdersController } from './orders.controller';
import { ProductsController } from './products.controller';

@Module({
  imports: [IdentityModule],
  controllers: [ProductsController, OrdersController],
})
export class CatalogModule {}
