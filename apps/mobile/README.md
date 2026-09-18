# Mağazam mobil (`apps/mobile`)

Bundle `com.luxivint.magazam`. Firebase proje `magazam-app`. Nest Bearer.

Repo kökünden `pnpm install` (bu klasörde ayrıca `npm install` gerekmez):

```bash
cp .env.example .env
npx expo start
# web: npx expo start --web --port 43131
```

`EXPO_PUBLIC_API_URL` varsayılan `http://127.0.0.1:43140`. LAN IP commit etme.

Expo Go: kamera eklentisi ve native FCM yok. EAS:

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --profile development --platform android
```

Native config yenileme: `pnpm firebase:sdkconfig` (`npx firebase-tools login` gerekir). SHA uydurma.
