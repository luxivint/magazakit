# Pazaryeri entegrasyonu (11 kanal)

Doğrulama: 19 Eylül 2026. **Canlı yazma yok.** Pazaryeri anahtarları `.env` ve Expo’da yok: `POST /v1/shops/:channel/connect` ile org mağazasına AES-256-GCM yazılır. Tek sunucu sırrı `CREDENTIALS_ENCRYPTION_KEY` (sarmalama). Trendyol mock `TRENDYOL_USE_MOCK=true` anahtarsız demo.

`GET /v1/channels` → `unconfigured` bağlanabilir, `blocked` (Pazarama/Ticimax/IdeaSoft) bağlanamaz, `mock` Trendyol demo. `write: false`.

| Kanal | Kod | Resmi kaynak | Not |
|---|---|---|---|
| Trendyol | V2 approved + `/v2/orders`, `apigw.trendyol.com`, UA `{sellerId} - SelfIntegration` | [getting started](https://developers.trendyol.com/v3.0/docs/getting-started-1), [ürün V2](https://developers.trendyol.com/v3.0/docs/product-filter-approved-product-v2), [sipariş V2](https://developers.trendyol.com/docs/sipari%C5%9F-paketlerini-%C3%A7ekme-getshipmentpackages) | Lonca örnekleri V1 `/orders` içerebilir — kullanılmaz. |
| Hepsiburada | `GET listing-external.../listings/merchantid/{id}` + `GET oms-external.../orders/merchantid/{id}` Basic | [developers.hepsiburada.com](https://developers.hepsiburada.com) | UA **yalın integrator adı** (`HEPSIBURADA_INTEGRATOR_NAME`). `{merchantId} - SelfIntegration` SIT’te 401. |
| n11 | `GET api.n11.com/ms/product-query` + `.../shipmentPackages` header `appKey`/`appSecret` | [ürün](https://developer.n11.com/documentation/n11-marketplace-entegrasyonu/satici-urun-sorgulama/), [sipariş](https://developer.n11.com/documentation/n11-siparis-entegrasyonu/siparis-listeleme-servisi/) | SOAP ayrı; kullanılmaz. |
| Shopify | Admin GraphQL `2026-07`, cursor `pageInfo` | [versioning](https://shopify.dev/docs/api/usage/versioning) | `read_orders` ayrı; sipariş izni yoksa ürün senkronu yine çalışır. |
| WooCommerce | `wp-json/wc/v3` **Basic Auth** | [auth](https://developer.woocommerce.com/docs/apis/rest-api/) | Query-string key kullanılmaz. Para birimi `GET /data/currencies/current`. |
| Çiçeksepeti | `GET /Products` + `POST /Order/GetOrders`; cevap `supplierOrderListWithBranch` | [ciceksepeti.dev](https://www.ciceksepeti.dev/) | UA satıcı id. Tarih ≤14 gün. |
| ikas | OAuth `client_credentials` + `listProduct` / `listOrder` | [auth](https://builders.ikas.com/docs/app-development/private-app/authentication), [Order](https://ikas.dev/docs/api/admin-api/orders), [listOrder](https://builders.ikas.com/docs/admin-api/admin-apis/order/list-order) | `orderLineItems` Order tipinde var; builders örneği başlık-only. Alan yoksa başlık sorgusuna düşülür (senkron kısmi olmaz). Token 14400sn. |
| Amazon TR | `searchOrders` 2026-01-01 `includedData=PROCEEDS,FULFILLMENT` + Listings Items `2021-08-01` | [searchOrders](https://developer-docs.amazon.com/sp-api/reference/searchorders), [searchListingsItems](https://developer-docs.amazon.com/sp-api/reference/searchlistingsitems) | Sayfa `pagination.nextToken` → `paginationToken`. Ürün için `AMAZON_SELLER_ID`. |
| Pazarama | **BLOKE** | isortagim panel; `isortagimapi.pazarama.com/docs` **404** | Path uydurulmadı. |
| Ticimax | **BLOKE** | SOAP [UrunServis](https://static.ticimax.com/dokumanlar/UrunServis.pdf) / [SiparisServis](https://static.ticimax.com/dokumanlar/SiparisServis.pdf) | REST yok; SOAP bu dilimde yok. |
| IdeaSoft | **BLOKE** | [apidoc.ideasoft.dev](https://apidoc.ideasoft.dev/) OAuth | Ürün/sipariş path doğrulanmadan çağrılmıyor. |
