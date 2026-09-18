# Mağazam

Trendyol satıcısı için stok, sipariş ve paketleme. **Expo / React Native** (`apps/mobile`). Next.js yok.

Kimlik: **Firebase Auth** (`magazam-app`). Nest’e `Authorization: Bearer <Firebase ID token>`.

## Çalıştırma

```bash
cd apps/mobile
npm install
npx expo start --web --port 43131
```

`EXPO_PUBLIC_API_URL` — web/emülatör `http://127.0.0.1:43140`; fiziksel cihaz için Nest’in LAN IP’si. Nest kapalıysa işlem tamamlanmış sayılmaz.

## Nest (PR 2)

- `GET /v1/me`
- `POST /v1/organizations` `{ name }`
- `GET /v1/organizations/current`
- `GET /v1/shops`
- `POST /v1/shops/trendyol/connect` — K01 mock; apiKey/apiSecret gönderilmez
- `POST /v1/shops/:id/sync` — mock pull, idempotent; katalog senkten önce boş
- `GET /v1/products` · `GET /v1/orders` — org kapsamı, Bearer
- `POST /v1/mappings` `{ listingId, sku }` · `GET /v1/mappings`

Eşleşmeyince `mapped: false`, `sellableStock: 0`. `marketplaceStock` fiziksel sayılmaz.

F3 (Nest 409 = ikinci rezervasyon yok):

- `POST /v1/orders/:id/reserve` + `Idempotency-Key`
- `POST /v1/orders/:id/scan` `{ sku }`
- `GET /v1/orders/:id/label` · `POST /v1/orders/:id/label/print` — yazdırma kargolandı yapmaz
- `POST /v1/stock/adjust` `{ sku, delta }` — yalnız eşli SKU
- `GET /v1/operations` — append-only işlem defteri

## Ekranlar

… E-03/E-12/E-60 Hazırla · E-06 Stok · E-09 İşlem merkezi. HB, fatura, ekip yok.
