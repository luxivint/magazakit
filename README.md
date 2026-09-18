# Mağazam

Trendyol satıcısı için stok, sipariş ve paketleme. **Expo / React Native** (`apps/mobile`). Next.js yok.

Kimlik: **Firebase Auth** projesi `magazam-app` (e-posta/şifre + Google). Web SDK config uygulamada gömülü (public). Paket/bundle: `com.luxivint.magazam`. FCM jetonu sonra.

Nest katalog isteklerinde `Authorization: Bearer <idToken>`. Bu PR `apps/api` yazmaz.

## Çalıştırma

```bash
cd apps/mobile
npm install
npx expo start
```

Web: `npx expo start --web`  
Windows: Expo Go veya EAS.

Google native için isteğe bağlı `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. Web’de Firebase popup yeter.

## Nest katalog (PR 2)

`EXPO_PUBLIC_API_URL` varsayılan `http://127.0.0.1:43140`. Yoksa yerel örnek.

## Ekranlar

E-13 Giriş · E-22 Hesap oluştur · E-14 İşletme · E-11 Hesap. HB, kâr, +ürün, ekip, fatura gizli.
