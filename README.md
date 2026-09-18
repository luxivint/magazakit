# Mağazam API

NestJS for **Mağazam**. Client is **Expo** (`apps/mobile`). This PR does not own web UI.

Auth is **Firebase**. Nest verifies `Authorization: Bearer <Firebase ID token>` with the Admin SDK and stores `uid` on org/device records. There is **no** email/password register or login route.

## Expo

```
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:43140
Authorization: Bearer <Firebase ID token>
```

Without `FIREBASE_PROJECT_ID` on the API, `/health` still works; other user routes return `401` `AUTH_NOT_CONFIGURED`.

## Endpoints

Public:

| Method | Path |
| --- | --- |
| `GET` | `/health` |
| `GET` | `/v1/docs` |

Authenticated (Firebase Bearer):

| Method | Path | Body |
| --- | --- | --- |
| `GET` | `/v1/me` | |
| `POST` | `/v1/organizations` | `{ "name": "..." }` |
| `GET` | `/v1/organizations/current` | |
| `POST` | `/v1/devices` | `{ "fcmToken": "..." }` in-memory |
| `GET` | `/v1/products` | query `page`, `pageSize`, optional `organizationId` |
| `GET` | `/v1/orders` | same |
| `GET` | `/api/preview/products` | same as products (`mock: true`) |
| `GET` | `/api/preview/orders` | same as orders |

Foreign `organizationId` → `403`. Catalog/orders remain K01 **mock** (no Trendyol secrets).

## Run

```bash
cp .env.example .env
pnpm install
pnpm --filter @magazakit/contracts build
pnpm dev:api           # http://127.0.0.1:43140
```

Optional: `pnpm dev:worker` (`:43141/health`), `docker compose up -d postgres` (unused in this slice).
