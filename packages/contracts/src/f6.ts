export type Supplier = {
  id: string;
  organizationId: string;
  name: string;
  note: string | null;
  createdAt: string;
};

export type PurchaseOrderStub = {
  id: string;
  organizationId: string;
  supplierId: string;
  sku: string | null;
  qty: number;
  status: 'draft';
  stub: true;
  createdAt: string;
};

export type Warehouse = {
  id: string;
  organizationId: string;
  name: string;
  isDefault: boolean;
};

export type WarehouseTransfer = {
  id: string;
  organizationId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  sku: string;
  qty: number;
  stub: true;
  createdAt: string;
};

export type EinvoiceDraft = {
  id: string;
  organizationId: string;
  orderId: string | null;
  status: 'draft';
  gibLive: false;
  createdAt: string;
};

export type PrinterSettings = {
  organizationId: string;
  name: string;
  host: string | null;
};

export type PrinterTestResult = {
  ok: true;
  printed: false;
  mock: true;
  note: 'Termal yazıcıya gönderilmedi.';
};
