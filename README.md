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

F3 (`sellable = physical − reserved`; eşlenmemiş rezerve/kargo yok; yazdır ≠ kargo; çift rezerve 409):

- `POST /v1/orders/:id/reserve` `{ idempotencyKey }`
- `POST /v1/orders/:id/pack/scan` `{ sku | barcode }`
- `POST /v1/orders/:id/label` · `GET /v1/orders/:id/label.pdf` — yazdırma `POST /ship` çağırmaz
- `POST /v1/stock/adjust` `{ sku, deltaPhysical, reason, idempotencyKey }`
- `GET /v1/stock/movements` · `GET /v1/stock/:sku`
- `POST /v1/devices` `{ fcmToken }` — bildirim izni sonrası, mümkünse
- `GET /v1/operations`

F4/F5 (Bearer; kâr uydurulmaz; ödeme yok):

- `GET /v1/returns` · `PATCH /v1/returns/:id/review` `{ decision, note? }`
- `GET /v1/team` · `GET /v1/team/members` · `POST /v1/team/invites` `{ email }`
- `GET /v1/reports/summary`
- `GET/POST /v1/listings/:id/draft` · `POST /v1/listings/:id/publish` `{ mock: true }`
- `GET /v1/billing/offering` — 499/999/1999, `chargeable: false`

## Ekranlar

Özet, siparişler, ürünler, Hazırla, Stok, İşlem merkezi, İadeler, Ekip, Raporlar, Katalog yayın, Abonelik. HB canlı kanal değil; kâr ve ödeme yok.
