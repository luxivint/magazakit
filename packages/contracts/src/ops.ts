export type ReturnStatus = 'open' | 'reviewing' | 'approved' | 'rejected';

export type ReturnListItem = {
  id: string;
  organizationId: string;
  orderId: string;
  orderNumber: string;
  channel: 'trendyol';
  reason: string;
  status: ReturnStatus;
  statusLabel: string;
  reviewNote: string | null;
  /** Never a live Trendyol claims write. */
  tyWrite: false;
  createdAt: string;
};

export type OrgMemberRole = 'owner' | 'staff';

export type OrgMember = {
  organizationId: string;
  uid: string | null;
  email: string;
  role: OrgMemberRole;
  status: 'active' | 'invited';
};

export type OrgInvite = {
  id: string;
  organizationId: string;
  email: string;
  role: 'staff';
  status: 'pending';
  /** Invite email is recorded only; no mail provider. */
  emailSent: false;
  createdAt: string;
};

/** Order counts + stock ledger delta. No profit / estimated earnings. */
export type OpsReport = {
  organizationId: string;
  orderCounts: {
    total: number;
    created: number;
    picking: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
  stockDeltaPhysical: number;
  note: 'Kâr hesaplanmaz; maliyet ve komisyon yok.';
};

export type ListingPublishState = 'draft' | 'mock_live';

export type ListingDraft = {
  listingId: string;
  organizationId: string;
  state: ListingPublishState;
  title: string;
  priceTry: number;
  weightKg?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  lengthCm?: number | null;
  mock: boolean;
  liveTyWrite: false;
  updatedAt: string;
};

export type BillingPackageId = 'starter' | 'growth' | 'scale';

export type BillingOffering = {
  id: BillingPackageId;
  name: string;
  priceTry: 499 | 999 | 1999;
  period: 'month';
  chargeable: false;
};

export const BILLING_OFFERINGS: BillingOffering[] = [
  { id: 'starter', name: 'Başlangıç', priceTry: 499, period: 'month', chargeable: false },
  { id: 'growth', name: 'Büyüme', priceTry: 999, period: 'month', chargeable: false },
  { id: 'scale', name: 'Ölçek', priceTry: 1999, period: 'month', chargeable: false },
];
