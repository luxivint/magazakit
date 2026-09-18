# Mağazam API

NestJS for Expo. Firebase project **magazam-app**. No homemade login. No `apps/web` / `apps/mobile` UI in this PR.

## Expo how to call

In `apps/mobile` (Expo):

```
EXPO_PUBLIC_API_URL=http://127.0.0.1:43140
```

On a physical device use your LAN IP (`http://192.168.x.x:43140`), not 127.0.0.1.

```ts
const token = await user.getIdToken(); // Firebase Auth, project magazam-app
await fetch(`${process.env.EXPO_PUBLIC_API_URL}/v1/me`, {
  headers: {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  },
});
```

| Step | Call |
| --- | --- |
| Session | `GET /v1/me` |
| Create business (E-14) | `POST /v1/organizations` `{ "name": "..." }` |
| Current org | `GET /v1/organizations/current` |
| E-08 shops | `GET /v1/shops` |
| Connect Trendyol (K01 mock) | `POST /v1/shops/trendyol/connect` `{}` — do **not** send real API keys |
| Catalog | `GET /v1/products`, `GET /v1/orders` |

`GET /health` is public. Missing Bearer → `401 UNAUTHENTICATED`. Foreign `organizationId` → `403`.

CORS allows Expo web (`localhost` / `127.0.0.1` / LAN / `*.expo.dev`). Extra origins: `CORS_ORIGINS`.

## Firebase Admin

- Default `FIREBASE_PROJECT_ID=magazam-app`
- No service account in git. ADC if `GOOGLE_APPLICATION_CREDENTIALS` is set; otherwise project-id-only `verifyIdToken`.

## Persistence

Orgs are keyed by Firebase `uid`. **In-memory** unless `DATABASE_URL` is set (optional Postgres via `docker compose up -d postgres`). TODO(F2): require Postgres.

## Run

```bash
cp .env.example .env
pnpm install
pnpm --filter @magazakit/contracts build
pnpm dev:api           # http://127.0.0.1:43140
```
