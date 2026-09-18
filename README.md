# Mağazam

Trendyol satıcısı için stok, sipariş ve paketleme. **Expo / React Native** (`apps/mobile`). Next.js yok. Trendyol canlı değil (K01 mock).

Kimlik: **Firebase Auth** (`magazam-app`). Nest’e `Authorization: Bearer <Firebase ID token>`. Bundle: `com.luxivint.magazam`.

## Atakan — Windows / WSL

API ve Metro’yu **WSL** içinde çalıştır. EAS Android paketini Windows’tan veya WSL’den `npx eas-cli` ile üret. Yerel iOS Simulator yok; iOS EAS bulutta.

### 1. Nest (PR 2)

Ayrı API checkout / aynı monorepo `apps/api` hangisi duruyorsa:

```bash
export PORT=43140
export FIREBASE_PROJECT_ID=magazam-app
export TRENDYOL_USE_MOCK=true
# pnpm --filter @magazakit/api start:dev
```

`GET http://127.0.0.1:43140/health` 200 olmalı. Kapalı API’de işlem tamamlanmış sayılmaz.

### 2. Expo (bu repo)

```bash
cd apps/mobile
cp .env.example .env
npm install
npx expo start --web --port 43131
```

`.env` içinde `EXPO_PUBLIC_API_URL=http://127.0.0.1:43140` WSL tarayıcı / emülatör için yeterli.

**Fiziksel telefon (Expo Go veya development build):** telefonda `127.0.0.1` WSL Nest’e gitmez. Oturumda API adresini, telefonun gördüğü Windows/WSL host olarak ver (`ipconfig` / `hostname -I`). Bu adresi `.env`’e yazıp commit etme.

### 3. Expo Go sınırları

Expo Go’da özel `google-services.json` / FCM native kanalı ve bu projenin kamera native eklentisi yok. Giriş (e-posta) ve web/Metro akışı çalışır; barkod kamerası ve gerçek FCM token **EAS development build** ister.

Hazırla ekranı SKU/barkod yazarak da paketler.

### 4. EAS development build (Windows)

İlk kez Expo hesabı:

```bash
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest init
```

`eas init` `extra.eas.projectId` yazar; uydurma UUID koyma.

Android APK (Play SHA’sı henüz yok — uydurma):

```bash
cd apps/mobile
npx eas-cli@latest build --profile development --platform android
```

Kurulumdan sonra `npx expo start --dev-client`. Kameraya izin iste; FCM `POST /v1/devices { fcmToken }` native token gelince gider.

iOS: `npx eas-cli@latest build --profile development --platform ios` (EAS bulut; Windows’ta Simulator yok).

### 5. Firebase native dosyalar

Repo’daki `google-services.json` ve `GoogleService-Info.plist` **açık web SDK** alanları + paket adı. SHA-1/256 **yok** (uydurulmaz).

CLI ile yenile (login gerekir):

```bash
cd apps/mobile
bash ./scripts/fetch-firebase-sdk.sh
```

İlk Android build’den sonra EAS → Credentials → Android keystore SHA-1/256’yı Firebase Android uygulamasına ekle. Debug SHA icat etme.

## Nest uçları (Bearer)

F0–F2: `/v1/me`, org, shops (Trendyol mock), sync, mappings, products, orders.

F3: reserve, pack/scan, label PDF (yazdır ≠ kargo), stock adjust/movements, operations, devices.

F4/F5: returns, team, reports/summary (kâr yok), listing draft/publish `mock: true`, billing/offering `chargeable: false`.

F6: suppliers, purchase-orders, warehouses/transfers, einvoices (`gibLive: false`), printer test-print mock.
