import { HttpException, HttpStatus } from '@nestjs/common';
import {
  asPreviewList,
  ErrorCodes,
  paginate,
  type Channel,
  type OrderListItem,
  type PageQuery,
  type PreviewList,
  type ProductListItem,
} from '@magazakit/contracts';
import type { ChannelReadAdapter } from './types';
import { assertPublicHttps, channelFetchJson, num, rec, str } from './http';
import { envTriple, httpImage, listing, order, pageItems } from './map';

function emptyLists(query: PageQuery, mock: boolean): PreviewList<ProductListItem> {
  return asPreviewList(paginate([] as ProductListItem[], query), mock);
}

export class BlockedChannelAdapter implements ChannelReadAdapter {
  readonly mock = false;
  constructor(
    readonly channel: Channel,
    private readonly reason: string,
  ) {}

  async probe(): Promise<void> {
    throw new HttpException(
      { code: ErrorCodes.CHANNEL_UNAVAILABLE, message: this.reason },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  async pullFeed() {
    await this.probe();
    return { listings: [], orders: [], returns: [] };
  }

  async listProducts(query: PageQuery) {
    await this.probe();
    return emptyLists(query, false);
  }

  async listOrders(query: PageQuery) {
    await this.probe();
    return asPreviewList(paginate([] as OrderListItem[], query), false);
  }
}

export class HepsiburadaReadAdapter implements ChannelReadAdapter {
  readonly channel = 'hepsiburada' as const;
  readonly mock = false;

  constructor(private readonly cred = envTriple('HEPSIBURADA')) {}

  private cfg() {
    if (!this.cred?.id || !this.cred.key || !this.cred.secret) {
      throw new HttpException(
        { code: ErrorCodes.CHANNEL_UNAVAILABLE, message: 'Hepsiburada merchantId/key/secret yok.' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const sit = (process.env.HEPSIBURADA_ENV ?? 'prod').toLowerCase() === 'sit';
    const listingHost = sit
      ? 'https://listing-external-sit.hepsiburada.com'
      : 'https://listing-external.hepsiburada.com';
    const omsHost = sit ? 'https://oms-external-sit.hepsiburada.com' : 'https://oms-external.hepsiburada.com';
    const auth = Buffer.from(`${this.cred.key}:${this.cred.secret}`, 'utf8').toString('base64');
    const headers = {
      Authorization: `Basic ${auth}`,
      /* Lonca SIT: yalın integrator adı. `{merchantId} - SelfIntegration` (TY kopyası) 401/403. */
      'User-Agent':
        process.env.HEPSIBURADA_USER_AGENT?.trim() ||
        process.env.HEPSIBURADA_INTEGRATOR_NAME?.trim() ||
        'Magazam',
      Accept: 'application/json',
    };
    return { merchantId: this.cred.id, listingHost, omsHost, headers };
  }

  async probe(): Promise<void> {
    const c = this.cfg();
    await channelFetchJson(
      `${c.listingHost}/listings/merchantid/${encodeURIComponent(c.merchantId)}?offset=0&limit=1`,
      { headers: c.headers },
      'Hepsiburada listings',
    );
  }

  async pullFeed() {
    const c = this.cfg();
    const listingsRaw = await channelFetchJson(
      `${c.listingHost}/listings/merchantid/${encodeURIComponent(c.merchantId)}?offset=0&limit=100`,
      { headers: c.headers },
      'Hepsiburada listings',
    );
    const listings = pageItems(listingsRaw, ['listings', 'items', 'data', 'content']).flatMap((row) => {
      const r = rec(row);
      if (!r) return [];
      const hbSku = str(r.hepsiburadaSku ?? r.HepsiburadaSku);
      const merchantSku = str(r.merchantSku ?? r.MerchantSku) || hbSku;
      if (!merchantSku && !hbSku) return [];
      return [
        listing({
          channel: 'hepsiburada',
          id: `hb-${hbSku || merchantSku}`,
          sku: merchantSku,
          barcode: hbSku || merchantSku,
          title: str(r.productName ?? r.name) || merchantSku,
          priceTry: num(rec(r.price)?.amount ?? r.price),
          marketplaceStock: num(r.availableStock ?? r.AvailableStock),
          active: r.isSalable !== false,
        }),
      ];
    });
    const ordersRaw = await channelFetchJson(
      `${c.omsHost}/orders/merchantid/${encodeURIComponent(c.merchantId)}?offset=0&limit=100`,
      { headers: c.headers },
      'Hepsiburada orders',
    );
    const orders = pageItems(ordersRaw).map((row, i) => {
      const r = rec(row) ?? {};
      const items = pageItems(r.items ?? r.Items);
      const number = str(r.orderNumber ?? r.OrderNumber) || `hb-${i}`;
      return order({
        channel: 'hepsiburada',
        id: `hb-${str(r.id ?? r.orderId) || number}`,
        orderNumber: number,
        customerName: str(rec(r.shippingAddress)?.name ?? rec(r.ShippingAddress)?.name),
        statusRaw: str(r.status ?? r.Status),
        totalTry: num(rec(r.totalPrice)?.amount ?? r.totalPrice),
        createdAt: str(r.orderDate ?? r.OrderDate) || undefined,
        lines: items.map((it) => {
          const line = rec(it) ?? {};
          const sku = str(line.sku ?? line.hbSku ?? line.merchantSku);
          return { listingId: sku ? `hb-${sku}` : `hb-line-${str(line.id)}`, qty: Math.max(1, num(line.quantity)) };
        }),
      });
    });
    return { listings, orders, returns: [] };
  }

  async listProducts(query: PageQuery) {
    const { listings } = await this.pullFeed();
    return asPreviewList(
      paginate(
        listings.map((p) => ({ ...p, listingId: p.id, organizationId: '', mapped: false, stockSource: 'none' as const })),
        query,
      ),
      false,
    );
  }

  async listOrders(query: PageQuery) {
    const { orders } = await this.pullFeed();
    return asPreviewList(
      paginate(
        orders.map((o) => ({ ...o, organizationId: '' })),
        query,
      ),
      false,
    );
  }
}

export class N11ReadAdapter implements ChannelReadAdapter {
  readonly channel = 'n11' as const;
  readonly mock = false;
  constructor(private readonly cred = envTriple('N11')) {}

  private headers() {
    if (!this.cred) {
      throw new HttpException(
        { code: ErrorCodes.CHANNEL_UNAVAILABLE, message: 'n11 appKey/appSecret yok.' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return {
      appKey: this.cred.key,
      appSecret: this.cred.secret,
      appkey: this.cred.key,
      appsecret: this.cred.secret,
      Accept: 'application/json',
    };
  }

  async probe(): Promise<void> {
    await channelFetchJson('https://api.n11.com/ms/product-query?page=0&size=1', { headers: this.headers() }, 'n11 products');
  }

  async pullFeed() {
    const headers = this.headers();
    const products = await channelFetchJson(
      'https://api.n11.com/ms/product-query?page=0&size=50',
      { headers },
      'n11 products',
    );
    const listings = pageItems(products).map((row) => {
      const r = rec(row) ?? {};
      const sku = str(r.stockCode) || str(r.n11ProductId);
      return listing({
        channel: 'n11',
        id: `n11-${sku}`,
        sku,
        barcode: str(r.barcode) || sku,
        title: str(r.title) || sku,
        priceTry: num(r.salePrice),
        marketplaceStock: num(r.quantity),
        active: str(r.saleStatus) !== 'Out_Of_Stock',
        imageUrl: httpImage(arrFirst(r.imageUrls)),
      });
    });
    const end = Date.now();
    const start = end - 7 * 24 * 60 * 60 * 1000;
    const pkgs = await channelFetchJson(
      `https://api.n11.com/rest/delivery/v1/shipmentPackages?startDate=${start}&endDate=${end}&page=0&size=50`,
      { headers },
      'n11 orders',
    );
    const orders = pageItems(pkgs).map((row) => {
      const r = rec(row) ?? {};
      const pkgId = str(r.id ?? r.packageId);
      const lines = pageItems(r.lines).map((it) => {
        const line = rec(it) ?? {};
        const barcode = str(line.barcode);
        return { listingId: barcode ? `n11-${barcode}` : `n11-line-${str(line.orderLineId)}`, qty: Math.max(1, num(line.quantity)) };
      });
      return order({
        channel: 'n11',
        id: `n11-${pkgId}`,
        orderNumber: str(r.orderNumber) || pkgId,
        customerName: str(rec(r.shippingAddress)?.fullName),
        statusRaw: str(r.status ?? r.shipmentPackageStatus),
        totalTry: num(r.totalAmount ?? r.packageTotalPrice),
        createdAt: num(r.orderDate) ? new Date(num(r.orderDate)).toISOString() : undefined,
        lines,
      });
    });
    return { listings, orders, returns: [] };
  }

  async listProducts(query: PageQuery) {
    const { listings } = await this.pullFeed();
    return asPreviewList(
      paginate(
        listings.map((p) => ({ ...p, listingId: p.id, organizationId: '', mapped: false, stockSource: 'none' as const })),
        query,
      ),
      false,
    );
  }

  async listOrders(query: PageQuery) {
    const { orders } = await this.pullFeed();
    return asPreviewList(paginate(orders.map((o) => ({ ...o, organizationId: '' })), query), false);
  }
}

function arrFirst(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

function graphQlFailed(payload: unknown): boolean {
  const errors = rec(payload)?.errors;
  return Array.isArray(errors) && errors.length > 0;
}

export class ShopifyReadAdapter implements ChannelReadAdapter {
  readonly channel = 'shopify' as const;
  readonly mock = false;

  private shop() {
    const domain = process.env.SHOPIFY_SHOP?.trim();
    const token = process.env.SHOPIFY_ACCESS_TOKEN?.trim();
    if (!domain || !token) {
      throw new HttpException(
        { code: ErrorCodes.CHANNEL_UNAVAILABLE, message: 'SHOPIFY_SHOP / SHOPIFY_ACCESS_TOKEN yok.' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const host = domain.includes('.') ? domain : `${domain}.myshopify.com`;
    const version = process.env.SHOPIFY_API_VERSION?.trim() || '2026-07';
    const url = assertPublicHttps(`https://${host}/admin/api/${version}/graphql.json`, 'Shopify');
    return { url, token };
  }

  private async gql(query: string): Promise<unknown> {
    const s = this.shop();
    return channelFetchJson(
      s.url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': s.token,
        },
        body: JSON.stringify({ query }),
      },
      'Shopify GraphQL',
    );
  }

  async probe(): Promise<void> {
    const data = rec(await this.gql('{ shop { name } }'));
    if (graphQlFailed(data)) {
      throw new HttpException(
        { code: ErrorCodes.CHANNEL_UNAVAILABLE, message: 'Shopify GraphQL errors (token loglanmaz).' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async pullFeed() {
    const products = rec(await this.gql(`{
      products(first: 50) {
        edges { node { id title featuredImage { url }
          variants(first: 30) { edges { node { id sku barcode inventoryQuantity price } } } } }
      }
    }`));
    const listings = pageItems(rec(rec(products?.data)?.products)?.edges, ['edges']).flatMap((edge) => {
      const node = rec(rec(edge)?.node);
      if (!node) return [];
      const title = str(node.title);
      const img = httpImage(rec(node.featuredImage)?.url);
      return pageItems(rec(node.variants)?.edges, ['edges']).map((vEdge) => {
        const v = rec(rec(vEdge)?.node) ?? {};
        const sku = str(v.sku) || str(v.id);
        return listing({
          channel: 'shopify',
          id: `sh-${sku}`,
          sku,
          barcode: str(v.barcode) || sku,
          title,
          priceTry: num(v.price),
          marketplaceStock: num(v.inventoryQuantity),
          imageUrl: img,
        });
      });
    });
    const ordersRaw = rec(await this.gql(`{
      orders(first: 50) {
        edges { node { id name createdAt displayFulfillmentStatus
          currentTotalPriceSet { shopMoney { amount } }
          lineItems(first: 30) { edges { node { sku quantity } } } } }
      }
    }`));
    const orders = pageItems(rec(rec(ordersRaw?.data)?.orders)?.edges, ['edges']).map((edge) => {
      const n = rec(rec(edge)?.node) ?? {};
      const lines = pageItems(rec(n.lineItems)?.edges, ['edges']).map((le) => {
        const li = rec(rec(le)?.node) ?? {};
        const sku = str(li.sku);
        return { listingId: sku ? `sh-${sku}` : 'sh-line', qty: Math.max(1, num(li.quantity)) };
      });
      return order({
        channel: 'shopify',
        id: `sh-${str(n.id).split('/').pop()}`,
        orderNumber: str(n.name),
        statusRaw: str(n.displayFulfillmentStatus),
        totalTry: num(rec(rec(n.currentTotalPriceSet)?.shopMoney)?.amount),
        createdAt: str(n.createdAt) || undefined,
        lines,
      });
    });
    return { listings, orders, returns: [] };
  }

  async listProducts(query: PageQuery) {
    const { listings } = await this.pullFeed();
    return asPreviewList(
      paginate(
        listings.map((p) => ({ ...p, listingId: p.id, organizationId: '', mapped: false, stockSource: 'none' as const })),
        query,
      ),
      false,
    );
  }

  async listOrders(query: PageQuery) {
    const { orders } = await this.pullFeed();
    return asPreviewList(paginate(orders.map((o) => ({ ...o, organizationId: '' })), query), false);
  }
}

export class WooCommerceReadAdapter implements ChannelReadAdapter {
  readonly channel = 'woocommerce' as const;
  readonly mock = false;

  private cfg() {
    const host = process.env.WOOCOMMERCE_HOST?.trim();
    const key = process.env.WOOCOMMERCE_CONSUMER_KEY?.trim();
    const secret = process.env.WOOCOMMERCE_CONSUMER_SECRET?.trim();
    if (!host || !key || !secret) {
      throw new HttpException(
        { code: ErrorCodes.CHANNEL_UNAVAILABLE, message: 'WooCommerce host/key/secret yok.' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const base = assertPublicHttps(host.startsWith('http') ? host : `https://${host}`, 'WooCommerce');
    const root = `${base.origin}/wp-json/wc/v3`;
    const q = `consumer_key=${encodeURIComponent(key)}&consumer_secret=${encodeURIComponent(secret)}`;
    return { root, q };
  }

  async probe(): Promise<void> {
    const c = this.cfg();
    await channelFetchJson(`${c.root}/products?per_page=1&${c.q}`, {}, 'WooCommerce products');
  }

  async pullFeed() {
    const c = this.cfg();
    const products = await channelFetchJson(`${c.root}/products?per_page=50&${c.q}`, {}, 'WooCommerce products');
    const listings = pageItems(products).map((row) => {
      const r = rec(row) ?? {};
      const sku = str(r.sku) || str(r.id);
      const img = rec(arrFirst(r.images) as unknown);
      return listing({
        channel: 'woocommerce',
        id: `woo-${sku}`,
        sku,
        title: str(r.name) || sku,
        priceTry: num(r.price ?? r.regular_price),
        marketplaceStock: num(r.stock_quantity),
        active: str(r.stock_status) !== 'outofstock',
        imageUrl: httpImage(img?.src),
      });
    });
    const ordersRaw = await channelFetchJson(`${c.root}/orders?per_page=50&${c.q}`, {}, 'WooCommerce orders');
    const orders = pageItems(ordersRaw).map((row) => {
      const r = rec(row) ?? {};
      const lines = pageItems(r.line_items).map((it) => {
        const line = rec(it) ?? {};
        const sku = str(line.sku) || str(line.product_id);
        return { listingId: `woo-${sku}`, qty: Math.max(1, num(line.quantity)) };
      });
      return order({
        channel: 'woocommerce',
        id: `woo-${str(r.id)}`,
        orderNumber: str(r.number) || str(r.id),
        customerName: str(rec(r.billing)?.first_name),
        statusRaw: str(r.status),
        totalTry: num(r.total),
        createdAt: str(r.date_created_gmt) ? `${str(r.date_created_gmt)}Z` : undefined,
        lines,
      });
    });
    return { listings, orders, returns: [] };
  }

  async listProducts(query: PageQuery) {
    const { listings } = await this.pullFeed();
    return asPreviewList(
      paginate(
        listings.map((p) => ({ ...p, listingId: p.id, organizationId: '', mapped: false, stockSource: 'none' as const })),
        query,
      ),
      false,
    );
  }

  async listOrders(query: PageQuery) {
    const { orders } = await this.pullFeed();
    return asPreviewList(paginate(orders.map((o) => ({ ...o, organizationId: '' })), query), false);
  }
}

export class CiceksepetiReadAdapter implements ChannelReadAdapter {
  readonly channel = 'ciceksepeti' as const;
  readonly mock = false;

  private cfg() {
    const key = process.env.CICEKSEPETI_API_KEY?.trim();
    if (!key) {
      throw new HttpException(
        { code: ErrorCodes.CHANNEL_UNAVAILABLE, message: 'CICEKSEPETI_API_KEY yok.' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const sandbox = (process.env.CICEKSEPETI_ENV ?? 'prod').toLowerCase() === 'sandbox';
    const base = sandbox ? 'https://sandbox-apis.ciceksepeti.com/api/v1' : 'https://apis.ciceksepeti.com/api/v1';
    return {
      base,
      headers: {
        'x-api-key': key,
        'User-Agent':
          process.env.CICEKSEPETI_USER_AGENT?.trim() ||
          process.env.CICEKSEPETI_SELLER_ID?.trim() ||
          'Magazam',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };
  }

  async probe(): Promise<void> {
    const c = this.cfg();
    await channelFetchJson(`${c.base}/Products?Page=1&PageSize=1`, { headers: c.headers }, 'Çiçeksepeti products');
  }

  async pullFeed() {
    const c = this.cfg();
    const productsRaw = await channelFetchJson(
      `${c.base}/Products?Page=1&PageSize=50`,
      { headers: c.headers },
      'Çiçeksepeti products',
    );
    const listings = pageItems(productsRaw, ['products', 'items', 'data']).map((row) => {
      const r = rec(row) ?? {};
      const sku = str(r.stockCode ?? r.productCode);
      return listing({
        channel: 'ciceksepeti',
        id: `cs-${sku || str(r.id)}`,
        sku: sku || str(r.id),
        title: str(r.productName ?? r.name) || sku,
        priceTry: num(r.salesPrice ?? r.salePrice),
        marketplaceStock: num(r.stockQuantity ?? r.quantity),
        imageUrl: httpImage(rec(arrFirst(r.images))?.url ?? rec(arrFirst(r.images))?.imageUrl),
      });
    });
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    const payload = await channelFetchJson(
      `${c.base}/Order/GetOrders`,
      {
        method: 'POST',
        headers: c.headers,
        body: JSON.stringify({
          startDate: start.toISOString().slice(0, 10),
          endDate: end.toISOString().slice(0, 10),
          page: 0,
          pageSize: 50,
        }),
      },
      'Çiçeksepeti orders',
    );
    const orders = pageItems(payload, ['supplierOrderListWithBranch', 'orders', 'items', 'data']).map((row) => {
      const r = rec(row) ?? {};
      const items = pageItems(r.orderItems ?? r.items);
      const id = str(r.orderId ?? r.orderNo);
      return order({
        channel: 'ciceksepeti',
        id: `cs-${id}`,
        orderNumber: str(r.orderNo) || id,
        statusRaw: str(r.statusId ?? r.status),
        totalTry: num(r.totalPrice ?? r.amount),
        lines: items.map((it) => {
          const line = rec(it) ?? {};
          const code = str(line.stockCode ?? line.orderItemId);
          return { listingId: `cs-${code}`, qty: Math.max(1, num(line.quantity)) };
        }),
      });
    });
    return { listings, orders, returns: [] };
  }

  async listProducts(query: PageQuery) {
    const { listings } = await this.pullFeed();
    return asPreviewList(
      paginate(
        listings.map((p) => ({ ...p, listingId: p.id, organizationId: '', mapped: false, stockSource: 'none' as const })),
        query,
      ),
      false,
    );
  }

  async listOrders(query: PageQuery) {
    const { orders } = await this.pullFeed();
    return asPreviewList(paginate(orders.map((o) => ({ ...o, organizationId: '' })), query), false);
  }
}

export class IkasReadAdapter implements ChannelReadAdapter {
  readonly channel = 'ikas' as const;
  readonly mock = false;

  private token() {
    const t = process.env.IKAS_ACCESS_TOKEN?.trim();
    if (!t) {
      throw new HttpException(
        { code: ErrorCodes.CHANNEL_UNAVAILABLE, message: 'IKAS_ACCESS_TOKEN yok.' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return t;
  }

  private async gql(query: string, variables?: Record<string, unknown>): Promise<unknown> {
    return channelFetchJson(
      'https://api.myikas.com/api/v2/admin/graphql',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
      },
      'ikas GraphQL',
    );
  }

  async probe(): Promise<void> {
    const data = rec(await this.gql('query { listProduct(pagination: { page: 1, limit: 1 }) { count } }'));
    if (graphQlFailed(data)) {
      throw new HttpException(
        { code: ErrorCodes.CHANNEL_UNAVAILABLE, message: 'ikas GraphQL errors (token loglanmaz).' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async pullFeed() {
    const products = rec(await this.gql(
      `query ListProduct($pagination: PaginationInput) {
        listProduct(pagination: $pagination) {
          count data { id name totalStock variants { id sku barcodeList prices { sellPrice } } }
        }
      }`,
      { pagination: { page: 1, limit: 50 } },
    ));
    const listings = pageItems(rec(rec(products?.data)?.listProduct)?.data).flatMap((row) => {
      const p = rec(row) ?? {};
      const variants = pageItems(p.variants);
      if (variants.length === 0) {
        return [
          listing({
            channel: 'ikas',
            id: `ikas-${str(p.id)}`,
            sku: str(p.id),
            title: str(p.name),
            marketplaceStock: num(p.totalStock),
          }),
        ];
      }
      return variants.map((vRaw) => {
        const v = rec(vRaw) ?? {};
        const sku = str(v.sku) || str(v.id);
        const barcodes = v.barcodeList;
        const barcode = Array.isArray(barcodes) ? str(barcodes[0]) : str(barcodes);
        const price = rec(arrFirst(v.prices));
        return listing({
          channel: 'ikas',
          id: `ikas-${sku}`,
          sku,
          barcode: barcode || sku,
          title: str(p.name) || sku,
          priceTry: num(price?.sellPrice),
          marketplaceStock: num(p.totalStock),
        });
      });
    });
    return { listings, orders: [], returns: [] };
  }

  async listProducts(query: PageQuery) {
    const { listings } = await this.pullFeed();
    return asPreviewList(
      paginate(
        listings.map((p) => ({ ...p, listingId: p.id, organizationId: '', mapped: false, stockSource: 'none' as const })),
        query,
      ),
      false,
    );
  }

  async listOrders(query: PageQuery) {
    return asPreviewList(paginate([] as OrderListItem[], query), false);
  }
}

export class AmazonReadAdapter implements ChannelReadAdapter {
  readonly channel = 'amazon' as const;
  readonly mock = false;

  private async accessToken(): Promise<string> {
    const clientId = process.env.AMAZON_LWA_CLIENT_ID?.trim();
    const clientSecret = process.env.AMAZON_LWA_CLIENT_SECRET?.trim();
    const refresh = process.env.AMAZON_REFRESH_TOKEN?.trim();
    if (!clientId || !clientSecret || !refresh) {
      throw new HttpException(
        { code: ErrorCodes.CHANNEL_UNAVAILABLE, message: 'Amazon LWA client/refresh yok.' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refresh,
      client_id: clientId,
      client_secret: clientSecret,
    });
    const json = rec(
      await channelFetchJson(
        'https://api.amazon.com/auth/o2/token',
        { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body },
        'Amazon LWA',
      ),
    );
    const token = str(json?.access_token);
    if (!token) {
      throw new HttpException(
        { code: ErrorCodes.CHANNEL_UNAVAILABLE, message: 'Amazon access_token alınamadı.' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return token;
  }

  private spHeaders(token: string): Record<string, string> {
    return {
      'x-amz-access-token': token,
      Accept: 'application/json',
      'User-Agent': process.env.AMAZON_USER_AGENT?.trim() || 'Magazam/1.0 (Language=JavaScript)',
    };
  }

  private ordersUrl(limit: number): string {
    const marketplace = process.env.AMAZON_MARKETPLACE_ID?.trim() || 'A33AVAJ2PDY3EV';
    const host = process.env.AMAZON_SP_HOST?.trim() || 'https://sellingpartnerapi-eu.amazon.com';
    const after = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    return `${host}/orders/2026-01-01/orders?marketplaceIds=${encodeURIComponent(marketplace)}&createdAfter=${encodeURIComponent(after)}&maxResultsPerPage=${limit}`;
  }

  async probe(): Promise<void> {
    const token = await this.accessToken();
    await channelFetchJson(this.ordersUrl(1), { headers: this.spHeaders(token) }, 'Amazon orders');
  }

  async pullFeed() {
    const token = await this.accessToken();
    const payload = await channelFetchJson(this.ordersUrl(50), { headers: this.spHeaders(token) }, 'Amazon orders');
    const root = rec(payload) ?? {};
    const rows = pageItems(root.orders ?? rec(root.payload)?.Orders ?? payload, ['orders', 'Orders', 'items']);
    const orders = rows.map((row) => {
      const r = rec(row) ?? {};
      const id = str(r.orderId ?? r.AmazonOrderId);
      return order({
        channel: 'amazon',
        id: `amz-${id}`,
        orderNumber: id,
        statusRaw: str(r.orderStatus ?? r.OrderStatus),
        totalTry: num(rec(r.orderTotal)?.amount ?? rec(r.OrderTotal)?.Amount),
        createdAt: str(r.createdTime ?? r.PurchaseDate) || undefined,
      });
    });
    return { listings: [], orders, returns: [] };
  }

  async listProducts(query: PageQuery) {
    return asPreviewList(paginate([] as ProductListItem[], query), false);
  }

  async listOrders(query: PageQuery) {
    const { orders } = await this.pullFeed();
    return asPreviewList(paginate(orders.map((o) => ({ ...o, organizationId: '' })), query), false);
  }
}
