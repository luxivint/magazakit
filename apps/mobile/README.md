# Mağazam mobil

```bash
npx expo start --web --port 43131
```

`EXPO_PUBLIC_API_URL=http://127.0.0.1:43140` (cihazda LAN IP). Bearer: Firebase ID token.

F3: `POST /v1/orders/:id/reserve` `{ idempotencyKey }`, `POST …/pack/scan` `{ sku | barcode }`, `POST …/label` + `GET …/label.pdf` (print ≠ ship), `POST /v1/stock/adjust` `{ sku, deltaPhysical, reason, idempotencyKey }`, `GET /v1/stock/movements`, `GET /v1/stock/:sku`, `GET /v1/operations`.
