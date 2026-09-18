import { Body, Controller, Get, HttpException, HttpStatus, Post } from '@nestjs/common';
import { ErrorCodes, type ListingMapping } from '@magazakit/contracts';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { IdentityStore } from './identity.store';

@Controller('v1/mappings')
export class MappingsController {
  constructor(private readonly identity: IdentityStore) {}

  @Get()
  async list(@CurrentUser() user: AuthUser): Promise<{ items: ListingMapping[] }> {
    return { items: await this.identity.listMappings(user.uid) };
  }

  @Post()
  async upsert(
    @CurrentUser() user: AuthUser,
    @Body() body: { listingId?: string; sku?: string },
  ): Promise<ListingMapping> {
    const listingId = body?.listingId?.trim();
    const sku = body?.sku?.trim();
    if (!listingId || !sku) {
      throw new HttpException(
        { code: ErrorCodes.VALIDATION, message: 'listingId ve sku gerekli (manuel eşleme).' },
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.identity.upsertMapping(user.uid, listingId, sku);
  }
}
