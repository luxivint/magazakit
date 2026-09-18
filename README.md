# Mağazam API

NestJS for Expo. Firebase project **magazam-app**. No homemade login. No mobile/web UI in this PR. No live HB, GİB, or Redis. Billing offerings only — no processor. F6 is stubs (suppliers, depo transfer, e-fatura taslağı, yazıcı).

## Expo how to call

```
EXPO_PUBLIC_API_URL=http://127.0.0.1:43140
Authorization: Bearer <Firebase idToken from magazam-app>
```

Device: LAN IP, not 127.0.0.1. CORS allows Expo localhost / LAN / `*.expo.dev`.

| Step | Call |
| --- | --- |
| Session | `GET /v1/me` |
| Business (E-14) | `POST /v1/organizations` `{ "name" }` |
| Current org | `GET /v1/organizations/current` |
| Device FCM | `POST /v1/devices` `{ "fcmToken" }` — durable when Postgres is on |
| Shops (E-08) | `GET /v1/shops` |
| Connect TY (K01 mock) | `POST /v1/shops/trendyol/connect` `{}` — never send real keys |
| Pull catalog (E-16) | `POST /v1/shops/:id/sync` — idempotent mock upsert |
| Products / orders | `GET /v1/products`, `GET /v1/orders` — **org-scoped after sync** (empty until sync) |
| Order detail (E-03) | `GET /v1/orders/:id` |
| Manual map (E-18) | `POST /v1/mappings` `{ "listingId", "sku" }` |
| Stock (E-06) | `POST /v1/stock/adjust` `{ "sku", "deltaPhysical", "reason", "idempotencyKey" }` |
| Ledger (E-21) | `GET /v1/stock/movements` |
| Channel write intent (T08) | `GET /v1/stock/outbox` — pending → worker/API drain marks `sent`/`failed` (mock TY, **no Redis**, no secrets) |
| Reserve (T07) | `POST /v1/orders/:id/reserve` `{ "idempotencyKey"? }` |
| Pack scan (E-12) | `POST /v1/orders/:id/pack/scan` `{ "sku" }` or `{ "barcode" }` |
| Label (E-60) | `POST /v1/orders/:id/label` → mock `pdfUrl`; print **does not** ship |
| Ship | `POST /v1/orders/:id/ship` — separate from label |
| Ops feed (E-09) | `GET /v1/operations` |
| Returns (E-19 stub) | `GET /v1/returns` · `PATCH /v1/returns/:id/review` `{ decision: approve\|reject }` — **no live TY return write** |
| Team (E-43 stub) | `GET /v1/team/members` · `POST /v1/team/invites` `{ email }` — e-posta gönderilmez |
| Reports | `GET /v1/reports/summary` — sipariş adetleri + stok `deltaPhysical`; **kâr yok** |
| Publish stub | `POST /v1/listings/:id/draft` · `POST /v1/listings/:id/publish` `{ mock: true }` — canlı TY yazılmaz (`liveTyWrite: false`) |
| Billing offering (F5) | `GET /v1/billing/offering` — 499 / 999 / 1999 ₺, `chargeable: false` |
| Suppliers (F6) | `GET/POST /v1/suppliers` · `GET/PATCH /v1/suppliers/:id` |
| Purchase orders (F6) | `GET/POST /v1/purchase-orders` — stub |
| Warehouses (F6) | `GET /v1/warehouses` (tek varsayılan) · `POST /v1/warehouses/transfers` `{ sku, qty }` stub |
| E-invoice (F6) | `GET/POST /v1/einvoices` — `gibLive: false` always |
| Printer (F6) | `GET/PUT /v1/printer` · `POST /v1/printer/test-print` — gönderilmez |

Unmapped listings: `mapped: false`, `stockSource: "none"`, `sellableStock: 0`. Unmapped SKU **cannot reserve or ship**. Marketplace `marketplaceStock` is **not** physical stock (K02). `sellable = physical − reserved`. Repeat sync does not duplicate (T06). Same reserve key is a no-op; a second reserve is `CONFLICT`. Same `idempotencyKey` on adjust is one ledger row.

`GET /health` public (`persistence`, `outbox.pending`). Missing Bearer → `401`. Foreign `organizationId` → `403`. Catalog: `GET /v1/docs`.

## Persistence

**Default:** in-memory if `DATABASE_URL` is unset (lost on restart).

**Postgres:** set `DATABASE_URL` **locally** in gitignored `apps/api/.env` or repo `.env`. Never commit it. Never put a real URL in `.env.example`. On boot the API applies `apps/api/migrations/*.sql` (tracked in `schema_migrations`). If the URL is set but Postgres is down, it logs a warning (never the connection string) and falls back to memory.

### Production-ish run (remote Postgres)

Keep the real URL only in gitignored `.env`. Then:

```bash
pnpm --filter @magazakit/contracts build
pnpm dev:api      # :43140 — also drains outbox on an interval (memory or Postgres)
pnpm dev:worker   # :43141 — drains pending stock_outbox via mock Trendyol (K01)
```

`GET /health` → `"persistence":"postgres"`, `"outbox": { "pending": N, "channel": "trendyol", "mock": true }`.

Worker `GET http://127.0.0.1:43141/health` reports the same pending count when it can see Postgres. Channel writes stay mock; TRENDYOL_API_KEY is never stored or logged. No Redis.

### Local docker Postgres

```bash
# put DATABASE_URL only in gitignored apps/api/.env (or .env) — never commit
docker compose up -d postgres
pnpm install
pnpm --filter @magazakit/contracts build
pnpm dev:api
pnpm dev:worker
```

Do not commit `.env`, `apps/api/.env`, service-account JSON, or any real `DATABASE_URL`.

### Tables (`001_f3_core.sql`)

| Table | Holds |
| --- | --- |
| `schema_migrations` | Applied SQL filenames |
| `organizations` | İşletme, keyed by Firebase `owner_uid` |
| `shops` | Mock Trendyol shop + sync checkpoint |
| `devices` | Durable FCM tokens (`POST /v1/devices`) |
| `listings` | Products after `POST /v1/shops/:id/sync` |
| `org_orders` | Orders after sync; reservation/pack/label/ship flags in `payload` |
| `listing_mappings` | Manual listing → master SKU |
| `sku_stock` | Physical + reserved (sellable = physical − reserved) |
| `stock_movements` | Immutable ledger (idempotency key unique per org) |
| `stock_outbox` | Intended channel stock writes; drain marks `sent`/`failed` (mock TY) |
| `operations` | `GET /v1/operations` feed |
| `org_returns` | İade listesi + inceleme stub |
| `org_members` | Org üyeleri (sahip) |
| `org_invites` | E-posta davet kaydı (gönderilmez) |
| `listing_drafts` | Yayın taslağı / mock_live |
| `org_suppliers` | Tedarikçi CRUD lite |
| `purchase_orders` | Mal girişi sipariş stub |
| `warehouses` | Tek varsayılan depo + overflow stub |
| `warehouse_transfers` | Transfer kaydı (WMS yok) |
| `einvoice_drafts` | E-fatura taslağı (`gibLive` false) |
| `printer_settings` | Termal ayar stub |

F4 SQL: `002_f4_stubs.sql`. F6 SQL: `003_f6_stubs.sql`. Worker (`pnpm dev:worker`) is health-only.

## Run (memory)

```bash
cp .env.example .env
pnpm install
pnpm --filter @magazakit/contracts build
pnpm dev:api
```
