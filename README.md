# Mağazam API (F0)

NestJS read slice for **Mağazam**. The product client is Expo (later). This PR does not own `apps/web`.

K01: no Trendyol test-store credentials. Catalog and orders are an **in-memory mock**. Secrets are not required and must not be committed.

## Endpoints

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/health` | `{ status, service, mock, trendyol }` |
| `GET` | `/v1/products` | Paginated product page (`page`, `pageSize`) |
| `GET` | `/v1/orders` | Paginated order page |
| `GET` | `/api/preview/products` | Same body as `/v1/products` (`mock: true`) |
| `GET` | `/api/preview/orders` | Same body as `/v1/orders` |
| `GET` | worker `/health` | Empty process, no queue |

Error envelope: `{ error: { code, message }, requestId }`. `x-request-id` is echoed.

Not in F0: billing, Hepsiburada, WMS, stock write, webhooks.

## Run

```bash
cp .env.example .env   # keys stay empty
pnpm install
pnpm --filter @magazakit/contracts build
pnpm dev:api           # http://127.0.0.1:43140
pnpm dev:worker        # optional http://127.0.0.1:43141
```

Postgres is **not** used by the mock. Optional Compose for later slices:

```bash
docker compose up -d postgres
```

`TRENDYOL_USE_MOCK=false` without a live client returns `503` + `K01_TRENDYOL_UNAVAILABLE`. Do not put real keys in env files.

## Layout

- `apps/api` — NestJS
- `apps/worker` — health-only process
- `packages/contracts` — error, pagination, product/order types
