# Pazaryeri entegrasyonu (araştırma + mevcut kod)

Tarih: 18 Eylül 2026. ChatGPT zip (`Pazaryeri_API_AI_Dokumanlari`) tek kaynak değil; resmi portal + GitHub ayrıca bakıldı.

## Bu dilimde gerçek olan

**Trendyol V2 salt okuma** (`apps/api`). HB, n11, Shopify, ikas vb. bağlanmaz. Stok/fiyat PUT, etiket, iade, finans yazılmaz.

| Kaynak | Ne doğrulandı |
|---|---|
| [Getting started](https://developers.trendyol.com/v3.0/docs/getting-started-1) | Basic auth (API key:secret), zorunlu `User-Agent`: `{sellerId} - SelfIntegration`. Prod `apigw.trendyol.com`; stage `stageapigw` + IP. |
| [Onaylı ürün V2](https://developers.trendyol.com/v3.0/docs/product-filter-approved-product-v2) | `GET /integration/product/sellers/{sellerId}/products/approved` — `page`/`size`≤100, `page*size`≤10000, `nextPageToken`, `variants[]`. |
| [Sipariş paketleri / V2](https://developers.trendyol.com/docs/sipari%C5%9F-paketlerini-%C3%A7ekme-getshipmentpackages) | `GET .../v2/orders`. Eski `/orders` 15 Ekim 2026’da kapanır. Paket `shipmentPackageId` ≠ `orderNumber`. Tarih yoksa son hafta; max pencere 2 hafta. |
| [Changelog V2](https://developers.trendyol.com/v2.0/changelog/changelog) | 10k maxQueryWindow; stream ayrı. |
| [Trendyol/trendyol-integration-developer-tool](https://github.com/Trendyol/trendyol-integration-developer-tool) | Resmi ürün-domain MCP; sipariş henüz “planned”. |
| [loncadev/lonca `@lonca/trendyol`](https://github.com/loncadev/lonca/tree/main/sdks/trendyol) | Topluluk SDK (resmi değil). V1 `/orders` hâlâ örneklerde var — biz **V2** kullanıyoruz. |

Hepsiburada (sonraki dilim): ayrı hostlar `listing-external` / `oms-external` / `mpop` / finance. Portal genel auth örneğini bütün servislere kopyalama. [developers.hepsiburada.com](https://developers.hepsiburada.com), [lonca hepsiburada SDK](https://github.com/loncadev/lonca/tree/main/sdks/hepsiburada).

n11 / Pazarama / Ticimax: zip BLOKE; OpenAPI yokken parser uydurulmaz.

## WSL’de canlı okuma

Satıcı paneli → Hesap detayları → Entegrasyon bilgileri (master kullanıcı). Gitignored `.env`:

```
TRENDYOL_USE_MOCK=false
TRENDYOL_BASE_URL=https://apigw.trendyol.com
TRENDYOL_SELLER_ID=
TRENDYOL_API_KEY=
TRENDYOL_API_SECRET=
```

Expo `POST /v1/shops/trendyol/connect` key göndermez. `GET /health` → `trendyol.mode: "live"`. Yanlış host `api.trendyol.com` (eski örnek) kullanılmaz.
