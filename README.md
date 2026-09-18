# Mağazam API

NestJS for Expo. Firebase project **magazam-app**. No homemade login. No mobile/web UI in this PR (Expo screens stay in the app repo). HB and billing are out of F3.

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
| Shops (E-08) | `GET /v1/shops` |
| Connect TY (K01 mock) | `POST /v1/shops/trendyol/connect` `{}` — never send real keys |
| Pull catalog (E-16) | `POST /v1/shops/:id/sync` — idempotent mock upsert |
| Products / orders | `GET /v1/products`, `GET /v1/orders` — **org-scoped after sync** (empty until sync) |
| Order detail (E-03) | `GET /v1/orders/:id` |
| Manual map (E-18) | `POST /v1/mappings` `{ "listingId", "sku" }` |
| Stock (E-06) | `POST /v1/stock/adjust` `{ "sku", "deltaPhysical", "reason", "idempotencyKey" }` |
| Ledger (E-21) | `GET /v1/stock/movements` |
| Channel write intent (T08) | `GET /v1/stock/outbox` — recorded; **no Redis** yet |
| Reserve (T07) | `POST /v1/orders/:id/reserve` `{ "idempotencyKey"? }` |
| Pack scan (E-12) | `POST /v1/orders/:id/pack/scan` `{ "sku" }` or `{ "barcode" }` |
| Label (E-60) | `POST /v1/orders/:id/label` → mock `pdfUrl`; print **does not** ship |
| Ship | `POST /v1/orders/:id/ship` — separate from label |
| Ops feed (E-09) | `GET /v1/operations` |

Unmapped listings: `mapped: false`, `stockSource: "none"`, `sellableStock: 0`. Unmapped SKU **cannot reserve or ship**. Marketplace `marketplaceStock` is **not** physical stock (K02). `sellable = physical − reserved`. Repeat sync does not duplicate (T06). Same reserve key is a no-op; a second reserve is `CONFLICT`. Same `idempotencyKey` on adjust is one ledger row.

`GET /health` public. Missing Bearer → `401`. Foreign `organizationId` → `403`. Catalog: `GET /v1/docs`.

## Persistence

In-memory unless `DATABASE_URL` (optional Postgres for orgs, catalog, stock ledger, outbox). Worker (`pnpm dev:worker`) is health-only; F3 outbox stores the **intended** Trendyol qty, it does not enqueue Redis.

## Run

```bash
cp .env.example .env
pnpm install
pnpm --filter @magazakit/contracts build
pnpm dev:api
```
