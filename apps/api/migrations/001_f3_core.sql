-- F3 identity + catalog + stock (applied on API boot when DATABASE_URL is set).
-- Local docker password is not a production secret; do not commit real credentials.

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_uid TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shops (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations (id),
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  status_label TEXT NOT NULL,
  seller_label TEXT NOT NULL,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_sync_at TIMESTAMPTZ,
  checkpoint TEXT
);

CREATE TABLE IF NOT EXISTS devices (
  uid TEXT PRIMARY KEY,
  fcm_token TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS listings (
  organization_id TEXT NOT NULL REFERENCES organizations (id),
  listing_id TEXT NOT NULL,
  shop_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  PRIMARY KEY (organization_id, listing_id)
);

CREATE TABLE IF NOT EXISTS org_orders (
  organization_id TEXT NOT NULL REFERENCES organizations (id),
  order_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  PRIMARY KEY (organization_id, order_id)
);

CREATE TABLE IF NOT EXISTS listing_mappings (
  organization_id TEXT NOT NULL REFERENCES organizations (id),
  listing_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  PRIMARY KEY (organization_id, listing_id)
);

CREATE TABLE IF NOT EXISTS sku_stock (
  organization_id TEXT NOT NULL REFERENCES organizations (id),
  sku TEXT NOT NULL,
  physical INTEGER NOT NULL DEFAULT 0,
  reserved INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (organization_id, sku)
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations (id),
  sku TEXT NOT NULL,
  delta_physical INTEGER NOT NULL,
  delta_reserved INTEGER NOT NULL,
  reason TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS stock_outbox (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations (id),
  sku TEXT NOT NULL,
  intended_qty INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS operations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations (id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  ref_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Upgrade path if an older boot created shops without sync columns.
ALTER TABLE shops ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS checkpoint TEXT;

CREATE INDEX IF NOT EXISTS idx_shops_organization_id ON shops (organization_id);
CREATE INDEX IF NOT EXISTS idx_listings_organization_id ON listings (organization_id);
CREATE INDEX IF NOT EXISTS idx_org_orders_organization_id ON org_orders (organization_id);
CREATE INDEX IF NOT EXISTS idx_listing_mappings_organization_id ON listing_mappings (organization_id);
CREATE INDEX IF NOT EXISTS idx_sku_stock_organization_id ON sku_stock (organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_org_created ON stock_movements (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_outbox_org_created ON stock_outbox (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operations_org_created ON operations (organization_id, created_at DESC);
