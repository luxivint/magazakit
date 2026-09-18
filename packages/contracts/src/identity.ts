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
};

export type ShopChannel = 'trendyol';

export type ShopStatusCode = 'mock_connected' | 'k01_blocked';

/** E-08 connected-store row. Secrets are never returned. */
export type ShopStatus = {
  id: string;
  organizationId: string;
  channel: ShopChannel;
  status: ShopStatusCode;
  statusLabel: string;
  sellerLabel: string;
  connectedAt: string;
  k01: string;
  mock: true;
};
