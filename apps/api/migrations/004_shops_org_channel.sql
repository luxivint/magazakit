-- One shop row per organization + channel (Trendyol id shop_ty_{org}, others shop_{channel}_{org}).
CREATE UNIQUE INDEX IF NOT EXISTS idx_shops_org_channel ON shops (organization_id, channel);
