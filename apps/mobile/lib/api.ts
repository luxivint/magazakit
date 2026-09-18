/** Web/emulator: http://127.0.0.1:43140. Physical device: LAN IP of the Nest host. */
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  'http://127.0.0.1:43140'
).replace(/\/$/, '');

export const API_BASE_URL = API_URL;

export type ProductListItem = {
  id: string;
  sku: string;
  barcode: string;
  title: string;
  channel: 'trendyol';
  priceTry: number;
  physicalStock: number;
  reservedStock: number;
  sellableStock: number;
  critical: boolean;
  status: 'active' | 'passive';
  statusLabel: string;
  imageUrl: string | null;
};

export type OrderListItem = {
  id: string;
  orderNumber: string;
  channel: 'trendyol';
  customerName: string;
  status: string;
  statusLabel: string;
  itemCount: number;
  totalTry: number;
  cargoDeadlineAt: string | null;
  cargoWarning: boolean;
  createdAt: string;
};

export type PreviewList<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  mock: boolean;
};

export type HealthResponse = {
  status: string;
  service?: string;
  mock?: boolean;
};

export type OrganizationSummary = {
  id: string;
  name: string;
  ownerUid: string;
};

export type CurrentUserResponse = {
  uid: string;
  email: string | null;
  organization: OrganizationSummary | null;
};

export type ShopStatusCode = 'mock_connected' | 'k01_blocked';

export type ShopStatus = {
  id: string;
  organizationId: string;
  channel: 'trendyol';
  status: ShopStatusCode;
  statusLabel: string;
  sellerLabel: string;
  connectedAt: string;
  k01: string;
  mock: true;
};
