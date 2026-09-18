# Mağazam

Trendyol satıcısı için stok, sipariş ve paketleme. **Birincil istemci Expo / React Native** (`apps/mobile`). Next.js web yok.

F0 dilimi: uygulama kabuğu + **E-01 Özet**, **E-02 Siparişler**, **E-04 Ürünler**. Örnek / boş / yükleniyor / hata. Hepsiburada, tahmini kazanç ve “+ ürün” gizli.

## Çalıştırma

```bash
cd apps/mobile
npm install
npx expo start
```

QR kodu **Expo Go** ile tarayın (Android veya iOS). Geliştirme sunucusu Metro’yu açar.

Web önizleme (tasarım kontrolü):

```bash
cd apps/mobile
npx expo start --web
```

Kök dizinden:

```bash
npm start
```

## Windows

Bu makinede iOS Simulator yok. Windows’ta:

- **Expo Go:** `npx expo start` → aynı Wi‑Fi’deki telefon.
- **EAS Build:** `npx eas-cli login` sonra `npx eas build --platform android` (veya `ios` Apple hesabıyla). Development build için `expo-dev-client` sonraki dilimde.
- Yerel Android emülatör: Android Studio + `npx expo start --android`.

## Önizleme durumları

Alt sekme **Hesap** → Örnek veri / Boş / Yükleniyor / Hata. Seçim Özet, Siparişler ve Ürünler’e yansır.

## Ne yok (bilinçli)

Nest API bu pakette değil. F4–F6: HB, kâr, yayın sihirbazı, ekip, abonelik.
