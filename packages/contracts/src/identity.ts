import type { Channel } from './catalog';

export type CurrentUserResponse = {
  uid: string;
  email: string | null;
  organization: OrganizationSummary | null;
};

export type OrganizationSummary = {
  id: string;
  name: string;
  ownerUid: string;
};

export type DeviceRegistration = {
  uid: string;
  stored: true;
  /** True when DATABASE_URL Postgres is active; memory process store otherwise. */
  durable: boolean;
};

/** Sent once on connect. API encrypts and stores per shop. Never returned. */
export type ShopConnectRequest = {
  sellerId?: string;
  merchantId?: string;
  apiKey?: string;
  apiSecret?: string;
  appKey?: string;
  appSecret?: string;
  shopDomain?: string;
  accessToken?: string;
  host?: string;
  consumerKey?: string;
  consumerSecret?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  sandbox?: boolean;
};

export type ShopChannel = Channel;

export type ShopStatusCode = 'mock_connected' | 'live_connected' | 'k01_blocked' | 'unverified';

/** E-08 connected-store row. Secrets are never returned. */
export type ShopStatus = {
  id: string;
  organizationId: string;
  channel: ShopChannel;
  status: ShopStatusCode;
  statusLabel: string;
  sellerLabel: string;
  connectedAt: string;
  lastSyncAt: string | null;
  checkpoint: string | null;
  k01: string;
  mock: boolean;
  tariffMismatchNotice?: string | null;
  tariffSourceNotice?: string | null;
};
