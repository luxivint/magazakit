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
- `GET /v1/products` · `GET /v1/orders` — Bearer; içeri al upsert (T06)

## Ekranlar

E-13 Giriş · E-22 Hesap oluştur · E-14 İşletme · E-11 Hesap lite · E-08 Mağazalarım · E-15 Trendyol bağla · E-16 İçeri al · E-18 Eşleştirme (manuel SKU) · E-04 Ürünler · E-02 Siparişler · E-05 ürün salt okunur.
