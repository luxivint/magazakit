import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { F4Module } from './f4/f4.module';
import { F5Module } from './f5/f5.module';
import { HttpErrorFilter } from './common/http-error.filter';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { HealthModule } from './health/health.module';
import { IdentityModule } from './identity/identity.module';
import { MetaModule } from './meta/meta.module';

@Module({
  imports: [AuthModule, HealthModule, MetaModule, IdentityModule, CatalogModule, F4Module, F5Module],
  providers: [{ provide: APP_FILTER, useClass: HttpErrorFilter }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
