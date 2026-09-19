# Mağazam (magazakit)

Trendyol satıcısı için stok, sipariş ve paketleme. **Bir clone:** Nest API (`apps/api`) + outbox worker (`apps/worker`) + Expo (`apps/mobile`). Next.js yok. Pazaryeri yazımı yok. Nest `.env` ile **salt okuma**: Trendyol V2; HB, n11, Shopify, Woo, Çiçeksepeti, ikas, Amazon TR env varsa. Pazarama/Ticimax/IdeaSoft BLOKE.

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

**Fiziksel telefon:** `127.0.0.1` WSL Nest’e gitmez. Mağaza anahtarları **HTTP/LAN ile gönderilmez** (`EXPO_PUBLIC_API_URL` HTTPS veya `http://127.0.0.1`). USB: `adb reverse tcp:43140 tcp:43140` sonra `http://127.0.0.1:43140`. LAN adresi commit etme.

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

F0–F2: `/v1/me`, org, shops (`GET /v1/channels` 11 kanal), connect (anahtar mağaza kaydında şifreli), sync, mappings, products, orders.

Canlı bağlama Expo **Mağaza bağla** ekranından. Pazaryeri key `.env`’ye yazılmaz. Sarmalama anahtarı (test dışında zorunlu, 32-byte hex/base64; placeholder reddedilir):

```
CREDENTIALS_ENCRYPTION_KEY=<openssl rand -hex 32>
TRENDYOL_USE_MOCK=true
```

Pazarama, Ticimax, IdeaSoft path yok → `CHANNEL_UNAVAILABLE`, bağlı sayılmaz. Yazma kapalı.

Satıcı paneli entegrasyon bilgileri uygulamaya girilir; User-Agent Trendyol’da `{sellerId} - SelfIntegration`. `GET /health` → `trendyol.mode` + `channels[]`.

F3: reserve, pack/scan, label PDF (yazdır ≠ kargo), stock, operations, `POST /v1/devices`.  
F4/F5 stub: returns, team, reports (kâr yok), listing `mock: true`, billing `chargeable: false`.  
F6 stub: suppliers, warehouses, einvoices (`gibLive: false`), printer.

Katalog: `GET /v1/docs`. Satılabilir = fiziksel − rezerve. Yazdırma kargolamaz.

İçeri al ürün **ve** sipariş çeker. Trendyol sipariş API’si 2 haftalık pencerelerle son ~6 ayı tarar. İlan görselleri varsa Cloudflare R2’ye kopyalanır (`R2_*` gitignored `.env`); anahtar yoksa pazaryeri CDN URL’si kalır.

Kargo ve PHB üç katman: fatura kalemi; PHB dönem tahsisi; tohumlu tarife v1 (Aras Tablo 1 48,33+KDV=57,99, PHB 10,99+KDV) satıcı düzenler. Ürün detay/gir/düzenle desi bloğu tahmini kargo+PHB gösterir — kesinleşmiş değil.

## Persistence

`DATABASE_URL` yoksa işletme/mağaza `apps/api/.data/identity.json` dosyasında kalır (Nest restart’ta silinmez). Postgres için gitignored `DATABASE_URL`.

Worker `GET http://127.0.0.1:43141/health` pending outbox sayar. Mock drain pazaryeri teslimatı iddia etmez; kayıtları `unknown` yapar. Pazaryeri secret git’te yok; loglanmaz. Redis yok.
