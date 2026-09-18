import type {
  ListingMapping,
  OrderListItem,
  OrganizationSummary,
  ProductListItem,
  ShopStatus,
} from '@magazakit/contracts';
import type { MockListingSeed } from '../trendyol/mock-feed';

export type PersistenceBackend = 'memory' | 'postgres';

export type StoredListing = MockListingSeed & { shopId: string };

export interface IdentityRepository {
  readonly backend: PersistenceBackend;
  getOrgForUid(uid: string): Promise<OrganizationSummary | null>;
  getOrgById(id: string): Promise<OrganizationSummary | null>;
  createOrg(uid: string, name: string): Promise<OrganizationSummary>;
  saveDevice(uid: string, fcmToken: string): Promise<void>;
  upsertTrendyolMockShop(org: OrganizationSummary): Promise<ShopStatus>;
  listShopsForUid(uid: string): Promise<ShopStatus[]>;
  getShopById(shopId: string): Promise<ShopStatus | null>;
  markShopSynced(shopId: string, checkpoint: string, lastSyncAt: string): Promise<ShopStatus>;
  upsertListings(orgId: string, shopId: string, listings: MockListingSeed[]): Promise<number>;
  upsertOrders(orgId: string, orders: Omit<OrderListItem, 'organizationId'>[]): Promise<number>;
  listListings(orgId: string): Promise<StoredListing[]>;
  listOrgOrders(orgId: string): Promise<OrderListItem[]>;
  getListing(orgId: string, listingId: string): Promise<StoredListing | null>;
  upsertMapping(orgId: string, listingId: string, sku: string): Promise<ListingMapping>;
  listMappings(orgId: string): Promise<ListingMapping[]>;
}

export function toProductListItem(
  listing: StoredListing,
  orgId: string,
  mapping: ListingMapping | undefined,
): ProductListItem {
  const mapped = Boolean(mapping);
  return {
    id: listing.id,
    listingId: listing.id,
    organizationId: orgId,
    sku: mapping?.sku ?? listing.sku,
    barcode: listing.barcode,
    title: listing.title,
    channel: listing.channel,
    priceTry: listing.priceTry,
    marketplaceStock: listing.marketplaceStock,
    physicalStock: 0,
    reservedStock: 0,
    sellableStock: 0,
    critical: listing.critical,
    mapped,
    stockSource: mapped ? 'master_sku' : 'none',
    status: listing.status,
    statusLabel: listing.statusLabel,
    imageUrl: listing.imageUrl,
  };
}
