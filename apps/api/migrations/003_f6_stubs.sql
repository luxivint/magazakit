-- F6 stubs: suppliers, POs, warehouses, e-invoice drafts, printer. No live GİB / HB / Redis.

CREATE TABLE IF NOT EXISTS org_suppliers (
  organization_id TEXT NOT NULL REFERENCES organizations (id),
  supplier_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  PRIMARY KEY (organization_id, supplier_id)
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  organization_id TEXT NOT NULL REFERENCES organizations (id),
  po_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  PRIMARY KEY (organization_id, po_id)
);

CREATE TABLE IF NOT EXISTS warehouses (
  organization_id TEXT NOT NULL REFERENCES organizations (id),
  warehouse_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  PRIMARY KEY (organization_id, warehouse_id)
);

CREATE TABLE IF NOT EXISTS warehouse_transfers (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations (id),
  payload JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS einvoice_drafts (
  organization_id TEXT NOT NULL REFERENCES organizations (id),
  invoice_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  PRIMARY KEY (organization_id, invoice_id)
);

CREATE TABLE IF NOT EXISTS printer_settings (
  organization_id TEXT PRIMARY KEY REFERENCES organizations (id),
  payload JSONB NOT NULL
);
