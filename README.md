# Mağazam

Trendyol satıcısı için stok, sipariş ve paketleme. **Birincil istemci Expo / React Native** (`apps/mobile`). Next.js yok.

Kimlik: **Firebase Auth** (e-posta/şifre + Google). Push: **Expo Notifications / FCM jetonu** — bildirim spam’i yok. Nest `Authorization: Bearer <idToken>` ile doğrulayacak; bu PR `apps/api` yazmaz.

## Çalıştırma

```bash
cd apps/mobile
cp .env.example .env   # Firebase anahtarlarını doldur
npm install
npx expo start
```

Web: `npx expo start --web`  
Windows: Expo Go veya EAS. iOS Simulator yok.

Anahtar yoksa ekranlar açılır; giriş **Firebase yapılandırılmadı** gösterir. Nest’e şifre gitmez.

## Firebase

1. Console’da Email/Password ve Google’ı aç.
2. `.env` içine `EXPO_PUBLIC_FIREBASE_*` ve `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
3. Android EAS: `google-services.json` (`google-services.json.example` kopyası). iOS: `GoogleService-Info.plist`. Gerçek dosyalar git’te yok.

## Nest katalog (PR 2)

`EXPO_PUBLIC_API_URL` varsayılan `http://127.0.0.1:43140`. `GET /health`, `/v1/products`, `/v1/orders`. Ulaşılamazsa yerel örnek + “yerel örnek” etiketi.

## Ekranlar

E-13 Giriş · E-22 Hesap oluştur · E-14 İşletme (ad + Trendyol) · E-11 Hesap (profil, mağazalar, çıkış). HB, kâr, +ürün, ekip, fatura, destek talebi gizli.
