# Mağazam API

NestJS for Expo. Firebase project **magazam-app**. No homemade login. No mobile/web UI in this PR.

## Expo how to call

```
EXPO_PUBLIC_API_URL=http://127.0.0.1:43140
Authorization: Bearer <Firebase idToken from magazam-app>
```

Device: LAN IP, not 127.0.0.1.

| Step | Call |
| --- | --- |
| Session | `GET /v1/me` |
| Business (E-14) | `POST /v1/organizations` `{ "name" }` |
| Current org | `GET /v1/organizations/current` |
| Shops (E-08) | `GET /v1/shops` |
| Connect TY (K01 mock) | `POST /v1/shops/trendyol/connect` `{}` — never send real keys |
| Pull catalog (E-16) | `POST /v1/shops/:id/sync` — idempotent mock upsert |
| Products / orders | `GET /v1/products`, `GET /v1/orders` — **org-scoped after sync** (empty until sync) |
| Manual map (E-18) | `POST /v1/mappings` `{ "listingId", "sku" }` |

Unmapped listings: `mapped: false`, `stockSource: "none"`, `sellableStock: 0`. Marketplace `marketplaceStock` is **not** physical stock (K02). Repeat sync does not duplicate (T06).

`GET /health` public. Missing Bearer → `401`. Foreign `organizationId` → `403`.

## Persistence

In-memory unless `DATABASE_URL` (optional Postgres). TODO(F3) when stock writes need a durable ledger.

## Run

```bash
cp .env.example .env
pnpm install
pnpm --filter @magazakit/contracts build
pnpm dev:api
```
