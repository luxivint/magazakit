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

import type { Channel } from './catalog';

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
};
