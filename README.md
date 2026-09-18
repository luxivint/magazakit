# Mağazam API

NestJS for **Mağazam**. Client is **Expo**. This PR does not own web/mobile UI.

Auth is **Firebase project `magazam-app`**. Nest verifies `Authorization: Bearer <Firebase ID token>` with the Admin SDK (`aud` must be `magazam-app`) and stores that `uid` on org/device records. There is **no** email/password register or login route.

## Expo

```
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:43140
EXPO_PUBLIC_FIREBASE_PROJECT_ID=magazam-app
Authorization: Bearer <Firebase ID token issued for magazam-app>
```

## Firebase Admin

- `FIREBASE_PROJECT_ID=magazam-app` (default if the env var is omitted).
- **Do not commit a service account.** Local `verifyIdToken` works with project ID only (Google public certs).
- If Application Default Credentials are present (`GOOGLE_APPLICATION_CREDENTIALS` or the runtime ADC), the Admin SDK uses them.
- Cloud / production: set `GOOGLE_APPLICATION_CREDENTIALS` to a key file **outside the repo** when the platform does not already inject ADC.

Blank `FIREBASE_PROJECT_ID=` disables auth (`401 AUTH_NOT_CONFIGURED`). Missing Bearer → `401 UNAUTHENTICATED`. `GET /health` stays public.

## Endpoints

Public: `GET /health`, `GET /v1/docs`

Authenticated: `GET /v1/me`, `POST /v1/organizations`, `GET /v1/organizations/current`, `POST /v1/devices`, `GET /v1/products`, `GET /v1/orders`, `/api/preview/products`, `/api/preview/orders`.

Foreign `organizationId` → `403`. Catalog remains K01 mock.

## Run

```bash
cp .env.example .env
pnpm install
pnpm --filter @magazakit/contracts build
pnpm dev:api           # http://127.0.0.1:43140
```
