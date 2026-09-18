import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { ListingDraft } from '@magazakit/contracts';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { IdentityStore } from '../identity/identity.store';

@Controller('v1/listings')
export class ListingPublishController {
  constructor(private readonly identity: IdentityStore) {}

  @Get(':id/draft')
  getDraft(@CurrentUser() user: AuthUser, @Param('id') listingId: string): Promise<ListingDraft> {
    return this.identity.getListingDraft(user.uid, listingId);
  }

  @Post(':id/draft')
  saveDraft(
    @CurrentUser() user: AuthUser,
    @Param('id') listingId: string,
    @Body() body: { title?: string; priceTry?: number },
  ): Promise<ListingDraft> {
    return this.identity.saveListingDraft(user.uid, listingId, body ?? {});
  }

  @Post(':id/publish')
  publish(
    @CurrentUser() user: AuthUser,
    @Param('id') listingId: string,
    @Body() body: { mock?: boolean },
  ): Promise<ListingDraft> {
    return this.identity.publishListing(user.uid, listingId, body?.mock === true);
  }
}
