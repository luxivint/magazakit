import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { type LabelResult, type OrderListItem, type PreviewList } from '@magazakit/contracts';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { IdentityStore } from '../identity/identity.store';

@Controller()
export class OrdersController {
  constructor(private readonly identity: IdentityStore) {}

  @Get(['v1/orders', 'api/preview/orders'])
  list(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('organizationId') organizationId?: string,
  ): Promise<PreviewList<OrderListItem>> {
    return this.identity.listOrders(user.uid, organizationId, page, pageSize);
  }

  @Get('v1/orders/:id')
  get(@CurrentUser() user: AuthUser, @Param('id') orderId: string): Promise<OrderListItem> {
    return this.identity.getOrder(user.uid, orderId);
  }

  @Post('v1/orders/:id/reserve')
  reserve(
    @CurrentUser() user: AuthUser,
    @Param('id') orderId: string,
    @Body() body: { idempotencyKey?: string },
  ): Promise<OrderListItem> {
    return this.identity.reserveOrder(user.uid, orderId, body?.idempotencyKey);
  }

  @Post('v1/orders/:id/pack/scan')
  scan(
    @CurrentUser() user: AuthUser,
    @Param('id') orderId: string,
    @Body() body: { sku?: string; barcode?: string },
  ): Promise<OrderListItem> {
    return this.identity.scanPackSku(user.uid, orderId, body ?? {});
  }

  @Post('v1/orders/:id/label')
  label(
    @CurrentUser() user: AuthUser,
    @Param('id') orderId: string,
  ): Promise<LabelResult> {
    return this.identity.createLabel(user.uid, orderId);
  }

  @Get('v1/orders/:id/label.pdf')
  @Header('content-type', 'application/pdf')
  async labelPdf(
    @CurrentUser() user: AuthUser,
    @Param('id') orderId: string,
  ): Promise<StreamableFile> {
    const buf = await this.identity.labelPdf(user.uid, orderId);
    return new StreamableFile(buf, {
      type: 'application/pdf',
      disposition: `inline; filename="${orderId}.pdf"`,
    });
  }

  @Post('v1/orders/:id/ship')
  ship(
    @CurrentUser() user: AuthUser,
    @Param('id') orderId: string,
    @Body() body: { idempotencyKey?: string },
  ): Promise<OrderListItem> {
    return this.identity.shipOrder(user.uid, orderId, body?.idempotencyKey);
  }
}
