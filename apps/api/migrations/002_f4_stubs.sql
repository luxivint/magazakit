-- F4 stubs: returns review, team invites, listing drafts. No live TY writes. No billing charges.

CREATE TABLE IF NOT EXISTS org_returns (
  organization_id TEXT NOT NULL REFERENCES organizations (id),
  return_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  PRIMARY KEY (organization_id, return_id)
);

CREATE TABLE IF NOT EXISTS org_members (
  organization_id TEXT NOT NULL REFERENCES organizations (id),
  uid TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  PRIMARY KEY (organization_id, uid)
);

CREATE TABLE IF NOT EXISTS org_invites (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations (id),
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, email)
);

CREATE TABLE IF NOT EXISTS listing_drafts (
  organization_id TEXT NOT NULL REFERENCES organizations (id),
  listing_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  PRIMARY KEY (organization_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_org_returns_organization_id ON org_returns (organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_organization_id ON org_invites (organization_id);
