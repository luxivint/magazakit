import type { Channel, OrderListItem, PageQuery, PreviewList, ProductListItem, ReturnListItem } from '@magazakit/contracts';
import type { MockListingSeed } from '../trendyol/mock-feed';

export const CHANNEL_READ_ADAPTERS = Symbol('CHANNEL_READ_ADAPTERS');

export const SHOP_CHANNELS: Channel[] = [
  'trendyol',
  'hepsiburada',
  'n11',
  'shopify',
  'woocommerce',
  'ciceksepeti',
  'ikas',
  'amazon',
  'pazarama',
  'ticimax',
  'ideasoft',
];

export type ChannelMode = 'mock' | 'live' | 'unconfigured' | 'blocked';

export type ChannelCatalogRow = {
  channel: Channel;
  label: string;
  mode: ChannelMode;
  read: 'live' | 'mock' | 'blocked';
  write: false;
  note: string;
};

export type ChannelFeedWarning = { scope: 'products' | 'orders'; message: string };

export type ChannelFeed = {
  listings: MockListingSeed[];
  orders: Omit<OrderListItem, 'organizationId'>[];
  returns: Omit<ReturnListItem, 'organizationId'>[];
  warnings?: ChannelFeedWarning[];
};

export interface ChannelReadAdapter {
  readonly channel: Channel;
  readonly mock: boolean;
  probe?(): Promise<void>;
  pullFeed(): Promise<ChannelFeed>;
  listProducts(query: PageQuery): Promise<PreviewList<ProductListItem>>;
  listOrders(query: PageQuery): Promise<PreviewList<OrderListItem>>;
}

export type ChannelAdapterMap = Record<Channel, ChannelReadAdapter>;
