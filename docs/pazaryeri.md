# Pazaryeri entegrasyonu (11 kanal)

Doğrulama: 18 Eylül 2026, resmi portallar + (resmi olmayan) lonca / coskntkk SDK. Yazma yok. Anahtar Expo’da yok.

`GET /v1/channels` → `mode` + `write: false`. `POST /v1/shops/:channel/connect` Nest `.env` probe; BLOKE / eksik env → `CHANNEL_UNAVAILABLE` (503), shop yazılmaz. Trendyol default `TRENDYOL_USE_MOCK=true` (mock); canlı için `false` + üç env.

| Kanal | Kod | Resmi kaynak | Not |
|---|---|---|---|
| Trendyol | V2 approved + `/v2/orders`, `apigw.trendyol.com`, UA `{sellerId} - SelfIntegration` | [getting started](https://developers.trendyol.com/v3.0/docs/getting-started-1), [ürün V2](https://developers.trendyol.com/v3.0/docs/product-filter-approved-product-v2), [sipariş V2](https://developers.trendyol.com/docs/sipari%C5%9F-paketlerini-%C3%A7ekme-getshipmentpackages) | Lonca örnekleri V1 `/orders` içerebilir — kullanılmaz. |
| Hepsiburada | `GET listing-external.../listings/merchantid/{id}` + `GET oms-external.../orders/merchantid/{id}` Basic | [developers.hepsiburada.com](https://developers.hepsiburada.com) | UA **yalın integrator adı** (`HEPSIBURADA_INTEGRATOR_NAME`). `{merchantId} - SelfIntegration` SIT’te 401. |
| n11 | `GET api.n11.com/ms/product-query` + `.../shipmentPackages` header `appKey`/`appSecret` | [ürün](https://developer.n11.com/documentation/n11-marketplace-entegrasyonu/satici-urun-sorgulama/), [sipariş](https://developer.n11.com/documentation/n11-siparis-entegrasyonu/siparis-listeleme-servisi/) | SOAP ayrı; kullanılmaz. |
| Shopify | Admin GraphQL `2026-07` | [versioning](https://shopify.dev/docs/api/usage/versioning) | `2025-10` 16 Eki 2026’da düşer. `read_orders` scope ayrı. |
| WooCommerce | `wp-json/wc/v3` query key | [REST](https://developer.woocommerce.com/docs/apis/rest-api/) | HTTPS; özel IP yok. |
| Çiçeksepeti | `GET /Products` + `POST /Order/GetOrders`; cevap `supplierOrderListWithBranch` | [ciceksepeti.dev](https://www.ciceksepeti.dev/) | UA satıcı id. Tarih ≤14 gün. |
| ikas | `api.myikas.com` `listProduct` Bearer | [auth](https://builders.ikas.com/docs/app-development/private-app/authentication) | Token ~4 saat; sipariş sorgusu yok (boş liste). |
| Amazon TR | LWA + `GET /orders/2026-01-01/orders` EU, marketplace `A33AVAJ2PDY3EV` | [marketplace IDs](https://developer-docs.amazon.com/sp-api/docs/marketplace-ids), [searchOrders](https://developer-docs.amazon.com/sp-api/reference/searchorders) | v0 `getOrders` deprecated. UA `App/1.0 (Language=JavaScript)`. Catalog listings yok. |
| Pazarama | **BLOKE** | isortagim panel; `isortagimapi.pazarama.com/docs` **404** | Path uydurulmadı. |
| Ticimax | **BLOKE** | SOAP [UrunServis](https://static.ticimax.com/dokumanlar/UrunServis.pdf) / [SiparisServis](https://static.ticimax.com/dokumanlar/SiparisServis.pdf) | REST yok; SOAP bu dilimde yok. |
| IdeaSoft | **BLOKE** | [apidoc.ideasoft.dev](https://apidoc.ideasoft.dev/) OAuth | Ürün/sipariş path doğrulanmadan çağrılmıyor. |
