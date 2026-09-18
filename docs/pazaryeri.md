# Pazaryeri entegrasyonu (11 kanal)

Tarih: 18 Eylül 2026. Zip tek kaynak değil. Yazma (stok PUT, etiket, iade, finans) yok. Anahtar Expo’da yok.

`GET /v1/channels` her kanalın `mode` + `write: false` listeler. `POST /v1/shops/:channel/connect` Nest `.env` probe eder; BLOKE / eksik env → `CHANNEL_UNAVAILABLE` (503). Shop satırı yazılmaz.

| Kanal | Okuma (env varsa) | Kaynak |
|---|---|---|
| Trendyol | V2 approved products + `/v2/orders`. Host `apigw.trendyol.com`. User-Agent `{sellerId} - SelfIntegration`. | [Getting started](https://developers.trendyol.com/v3.0/docs/getting-started-1), [ürün V2](https://developers.trendyol.com/v3.0/docs/product-filter-approved-product-v2), [sipariş V2](https://developers.trendyol.com/docs/sipari%C5%9F-paketlerini-%C3%A7ekme-getshipmentpackages). Lonca hâlâ V1 `/orders` örnekliyor — kullanılmaz. |
| Hepsiburada | `listing-external` + `oms-external` Basic + User-Agent `{merchantId} - SelfIntegration`. | [developers.hepsiburada.com](https://developers.hepsiburada.com) |
| n11 | `api.n11.com/ms/product-query` + `rest/delivery/v1/shipmentPackages` (`appKey`/`appSecret`). | developer.n11.com REST |
| Shopify | Admin GraphQL `products` + `orders`. `SHOPIFY_SHOP` + token. HTTPS, özel IP yok. | Admin API |
| WooCommerce | `wp-json/wc/v3` consumer key. Host `assertPublicHttps`. | Woo REST |
| Çiçeksepeti | `POST /api/v1/Order/GetOrders`. Ürün şeması belgede yok; ilanlar sipariş kaleminden. | apis.ciceksepeti.com |
| ikas | `api.myikas.com` `listProduct`. Sipariş sorgusu bu dilimde yok (boş liste, bağlı yalanı yok). | V2 GraphQL |
| Amazon TR | LWA refresh → SP-API EU `orders/v0/orders`, marketplace `A33AVAJ2PDY3EV`. Catalog listings yok. | SP-API |
| Pazarama | **BLOKE** — partner OpenAPI yok (isortagim). Path uydurulmadı. | — |
| Ticimax | **BLOKE** — güncel REST/WSDL yok. SOAP XML feed değil. | — |
| IdeaSoft | **BLOKE** — OAuth var; `/products` şeması doğrulanmadı. | — |

WSL `.env` (gitignore). Expo `POST .../connect` key göndermez.
