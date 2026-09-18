# Mağazam (magazakit)

Trendyol satıcısı için stok, sipariş ve paketleme. **Bir clone:** Nest API (`apps/api`) + outbox worker (`apps/worker`) + Expo (`apps/mobile`). Next.js yok. Canlı Trendyol / HB / GİB yok (K01 mock). Nest’te `TRENDYOL_USE_MOCK=false` + satıcı panelinden key/secret olunca **V2 salt okuma** açılır (ürün + sipariş). Stok yazımı hâlâ mock outbox.

Kimlik: **Firebase Auth** (`magazam-app`). Nest `Authorization: Bearer <Firebase ID token>` doğrular. Bundle: `com.luxivint.magazam`.

`.env` gitignore’da. `DATABASE_URL`, Admin SDK JSON, pazaryeri sırları commit edilmez.

## Atakan — Windows / WSL

API, worker ve Metro’yu **WSL** içinde çalıştır. EAS Android’i Windows veya WSL’den `npx eas-cli` ile üret. Yerel iOS Simulator yok; iOS EAS bulutta.

İki terminal (WSL):

```bash
# repo kökü
cp .env.example .env
# DATABASE_URL yazma — boş bırak = bellek. Postgres için gitignored apps/api/.env kullan.
pnpm install
pnpm --filter @magazakit/contracts build
pnpm dev:api          # :43140 — mock outbox drain interval
```

```bash
cd apps/mobile
cp .env.example .env
# EXPO_PUBLIC_API_URL=http://127.0.0.1:43140  (emülatör / WSL tarayıcı)
npx expo start        # istersen: --web --port 43131
```

İsteğe bağlı Postgres + worker:

```bash
docker compose up -d postgres
# gitignored apps/api/.env:
# DATABASE_URL=postgres://magazakit:magazakit@127.0.0.1:5433/magazakit
pnpm dev:worker       # :43141 — stock_outbox pending → sent/failed (mock TY)
```

`GET http://127.0.0.1:43140/health` 200 olmalı. Kapalı API’de işlem tamamlanmış sayılmaz.

**Fiziksel telefon:** `127.0.0.1` WSL Nest’e gitmez. `EXPO_PUBLIC_API_URL` olarak telefonun gördüğü host’u yaz (`hostname -I` / `ip.config`). LAN adresi commit etme.

## Expo Go vs EAS

Push **Firebase FCM** (`@react-native-firebase/messaging`), Expo push / `expo-notifications` değil. `POST /v1/devices` yalnızca gerçek FCM token gönderir.

Expo Go ve `expo start --web` native FCM yüklemez (import patlamaz; token da gelmez). E-posta girişi ve Metro çalışır. Barkod kamerası ve gerçek FCM **EAS development / expo-dev-client** ister. Hazırla ekranı SKU/barkod yazarak da paketler.

```bash
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --profile development --platform android
npx expo start --dev-client
```

Repo’daki `google-services.json` / `GoogleService-Info.plist` açık web SDK + paket adı. SHA uydurma. İlk Android build sonrası EAS keystore SHA’yı Firebase Android uygulamasına ekle.

## Expo → API

```
EXPO_PUBLIC_API_URL=http://127.0.0.1:43140
Authorization: Bearer <Firebase idToken from magazam-app>
```

CORS: Expo localhost / LAN / `*.expo.dev`.

F0–F2: `/v1/me`, org, shops (Trendyol mock veya V2 live okuma), sync, mappings, products, orders.  

Canlı bağlama (WSL, gitignored `apps/api/.env` veya kök `.env`):

```
TRENDYOL_USE_MOCK=false
TRENDYOL_BASE_URL=https://apigw.trendyol.com
TRENDYOL_SELLER_ID=...
TRENDYOL_API_KEY=...
TRENDYOL_API_SECRET=...
```

Satıcı paneli → Hesap → Entegrasyon Bilgileri. User-Agent `{sellerId} - SelfIntegration`. Anahtar telefona yazılmaz; Expo sadece `sellerId` gönderir. `GET /health` → `trendyol.mode: live`. Stage (`stageapigw`) IP allowlist ister.

F3: reserve, pack/scan, label PDF (yazdır ≠ kargo), stock, operations, `POST /v1/devices`.  
F4/F5 stub: returns, team, reports (kâr yok), listing `mock: true`, billing `chargeable: false`.  
F6 stub: suppliers, warehouses, einvoices (`gibLive: false`), printer.

Katalog: `GET /v1/docs`. Satılabilir = fiziksel − rezerve. Yazdırma kargolamaz.

## Persistence

`DATABASE_URL` yoksa bellek (restart’ta silinir). Varsa `apps/api/migrations/*.sql` boot’ta uygulanır. URL var ama Postgres kapalıysa uyarı + bellek.

Worker `GET http://127.0.0.1:43141/health` pending outbox sayar. `TRENDYOL_API_KEY` git’te yok; loglanmaz. Redis yok.
