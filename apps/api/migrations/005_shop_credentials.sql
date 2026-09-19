-- Per-shop marketplace credentials (ciphertext). Never store plaintext API keys.

CREATE TABLE IF NOT EXISTS shop_credentials (
  shop_id TEXT PRIMARY KEY REFERENCES shops (id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations (id),
  ciphertext TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
