import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  asPreviewList,
  ErrorCodes,
  paginate,
  parsePageQuery,
  type ListingMapping,
  type OrderListItem,
  type OrganizationSummary,
  type PreviewList,
  type ProductListItem,
  type ShopStatus,
  type ShopSyncResult,
} from '@magazakit/contracts';
import type { IdentityRepository, PersistenceBackend } from './identity.repository';
import { toProductListItem } from './identity.repository';
import {
  TRENDYOL_READ_ADAPTER,
  type TrendyolReadAdapter,
} from '../trendyol/trendyol-read.adapter';

@Injectable()
export class IdentityStore {
  constructor(
    private readonly repo: IdentityRepository,
    @Inject(TRENDYOL_READ_ADAPTER) private readonly trendyol: TrendyolReadAdapter,
  ) {}

  get backend(): PersistenceBackend {
    return this.repo.backend;
  }

  getOrgForUid(uid: string): Promise<OrganizationSummary | null> {
    return this.repo.getOrgForUid(uid);
  }

  createOrg(uid: string, name: string): Promise<OrganizationSummary> {
    return this.repo.createOrg(uid, name);
  }

  async requireOrg(uid: string): Promise<OrganizationSummary> {
    const org = await this.repo.getOrgForUid(uid);
    if (!org) {
      throw new HttpException(
        {
          code: ErrorCodes.VALIDATION,
          message: 'Önce işletme oluşturun (POST /v1/organizations).',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return org;
  }

  async assertOrgAccess(uid: string, organizationId: string | undefined): Promise<OrganizationSummary> {
    const org = await this.requireOrg(uid);
    if (organizationId && organizationId.trim() !== '' && organizationId !== org.id) {
      const other = await this.repo.getOrgById(organizationId);
      if (!other || other.ownerUid !== uid) {
        throw new HttpException(
          {
            code: ErrorCodes.FORBIDDEN,
            message: 'Bu organization_id bu kullanıcıya ait değil.',
          },
          HttpStatus.FORBIDDEN,
        );
      }
    }
    return org;
  }

  saveDevice(uid: string, fcmToken: string): Promise<void> {
    return this.repo.saveDevice(uid, fcmToken);
  }

  async connectTrendyolMock(uid: string): Promise<ShopStatus> {
    const org = await this.requireOrg(uid);
    return this.repo.upsertTrendyolMockShop(org);
  }

  listShops(uid: string): Promise<ShopStatus[]> {
    return this.repo.listShopsForUid(uid);
  }

  async syncShop(uid: string, shopId: string): Promise<ShopSyncResult> {
    const org = await this.requireOrg(uid);
    const shop = await this.repo.getShopById(shopId);
    if (!shop || shop.organizationId !== org.id) {
      throw new HttpException(
        { code: ErrorCodes.NOT_FOUND, message: 'Mağaza bulunamadı.' },
        HttpStatus.NOT_FOUND,
      );
    }
    const feed = await this.trendyol.pullFeed();
    const productsUpserted = await this.repo.upsertListings(org.id, shop.id, feed.listings);
    const ordersUpserted = await this.repo.upsertOrders(org.id, feed.orders);
    const lastSyncAt = new Date().toISOString();
    const checkpoint = `mock:${feed.listings.length}:${feed.orders.length}:${lastSyncAt}`;
    await this.repo.markShopSynced(shop.id, checkpoint, lastSyncAt);
    return {
      shopId: shop.id,
      organizationId: org.id,
      productsUpserted,
      ordersUpserted,
      checkpoint,
      lastSyncAt,
      mock: true,
    };
  }

  async listProducts(
    uid: string,
    organizationId: string | undefined,
    page?: string,
    pageSize?: string,
  ): Promise<PreviewList<ProductListItem>> {
    const org = await this.assertOrgAccess(uid, organizationId);
    const [listings, mappings] = await Promise.all([
      this.repo.listListings(org.id),
      this.repo.listMappings(org.id),
    ]);
    const byListing = new Map(mappings.map((m) => [m.listingId, m]));
    const items = listings.map((listing) => toProductListItem(listing, org.id, byListing.get(listing.id)));
    return asPreviewList(paginate(items, parsePageQuery({ page, pageSize })), true);
  }

  async listOrders(
    uid: string,
    organizationId: string | undefined,
    page?: string,
    pageSize?: string,
  ): Promise<PreviewList<OrderListItem>> {
    const org = await this.assertOrgAccess(uid, organizationId);
    const orders = await this.repo.listOrgOrders(org.id);
    return asPreviewList(paginate(orders, parsePageQuery({ page, pageSize })), true);
  }

  async upsertMapping(uid: string, listingId: string, sku: string): Promise<ListingMapping> {
    const org = await this.requireOrg(uid);
    const listing = await this.repo.getListing(org.id, listingId);
    if (!listing) {
      throw new HttpException(
        {
          code: ErrorCodes.NOT_FOUND,
          message: 'İlan org kataloğunda yok. Önce POST /v1/shops/:id/sync.',
        },
        HttpStatus.NOT_FOUND,
      );
    }
    return this.repo.upsertMapping(org.id, listingId, sku);
  }

  async listMappings(uid: string): Promise<ListingMapping[]> {
    const org = await this.requireOrg(uid);
    return this.repo.listMappings(org.id);
  }
}
