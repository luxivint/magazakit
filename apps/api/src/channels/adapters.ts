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
import type { ChannelFeed, ChannelFeedWarning, ChannelReadAdapter } from './types';
import { assertPublicHttps, channelFetchJson, num, rec, str } from './http';
import { httpImage, listing, order, pageItems } from './map';

function emptyLists(
  query: PageQuery,
  mock: boolean,
): PreviewList<ProductListItem> {
  return asPreviewList(paginate([] as ProductListItem[], query), mock);
}

export class BlockedChannelAdapter implements ChannelReadAdapter {
  readonly mock = false;
  constructor(
    readonly channel: Channel,
    private readonly reason: string,
    readonly kind: 'blocked' | 'needs_credentials' = 'blocked',
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

  constructor(
    private readonly cred: { id: string; key: string; secret: string; sit?: boolean },
  ) {}

  private cfg() {
    if (!this.cred?.id || !this.cred.key || !this.cred.secret) {
      throw new HttpException(
        {
          code: ErrorCodes.CHANNEL_UNAVAILABLE,
          message: 'Hepsiburada merchantId/key/secret yok.',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const sit = this.cred.sit === true;
    const listingHost = sit
      ? 'https://listing-external-sit.hepsiburada.com'
      : 'https://listing-external.hepsiburada.com';
    const omsHost = sit
      ? 'https://oms-external-sit.hepsiburada.com'
      : 'https://oms-external.hepsiburada.com';
    const auth = Buffer.from(
      `${this.cred.key}:${this.cred.secret}`,
      'utf8',
    ).toString('base64');
    const headers = {
      Authorization: `Basic ${auth}`,
      /* Lonca SIT: yalın integrator adı. `{merchantId} - SelfIntegration` (TY kopyası) 401/403. */
      'User-Agent': 'Magazam',
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
    return this.collectFeed(true, true);
  }

  private async collectFeed(includeListings: boolean, includeOrders: boolean) {
    const c = this.cfg();
    const listingRows: unknown[] = [];
    if (includeListings) {
      for (let offset = 0; offset < 100_000; offset += 100) {
        const raw = await channelFetchJson(
          `${c.listingHost}/listings/merchantid/${encodeURIComponent(c.merchantId)}?offset=${offset}&limit=100`,
          { headers: c.headers },
          'Hepsiburada listings',
        );
        const batch = pageItems(raw, ['listings', 'items', 'data', 'content']);
        listingRows.push(...batch);
        if (batch.length < 100) break;
      }
    }
    const listings = listingRows.flatMap((row) => {
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
    const orderRows: unknown[] = [];
    if (includeOrders) {
      for (let offset = 0; offset < 100_000; offset += 100) {
        const raw = await channelFetchJson(
          `${c.omsHost}/orders/merchantid/${encodeURIComponent(c.merchantId)}?offset=${offset}&limit=100`,
          { headers: c.headers },
          'Hepsiburada orders',
        );
        const batch = pageItems(raw);
        orderRows.push(...batch);
        if (batch.length < 100) break;
      }
    }
    const orders = orderRows.map((row, i) => {
      const r = rec(row) ?? {};
      const items = pageItems(r.lineItems ?? r.LineItems ?? r.items ?? r.Items);
      const number = str(r.orderNumber ?? r.OrderNumber) || `hb-${i}`;
      return order({
        channel: 'hepsiburada',
        id: `hb-${str(r.id ?? r.orderId) || number}`,
        orderNumber: number,
        customerName: str(
          rec(r.shippingAddress)?.name ??
            rec(r.ShippingAddress)?.name ??
            rec(r.deliveryAddress)?.name ??
            rec(r.DeliveryAddress)?.Name,
        ),
        statusRaw: str(r.status ?? r.Status),
        totalTry: num(
          rec(r.totalPrice)?.amount ??
            rec(r.TotalPrice)?.Amount ??
            r.totalPrice,
        ),
        createdAt: str(r.orderDate ?? r.OrderDate) || undefined,
        lines: items.map((it) => {
          const line = rec(it) ?? {};
          const sku = str(
            line.hepsiburadaSku ??
              line.HepsiburadaSku ??
              line.merchantSku ??
              line.MerchantSku ??
              line.sku ??
              line.hbSku,
          );
          return {
            listingId: sku ? `hb-${sku}` : `hb-line-${str(line.id)}`,
            qty: Math.max(1, num(line.quantity)),
          };
        }),
      });
    });
    return { listings, orders, returns: [] };
  }

  async listProducts(query: PageQuery) {
    const { listings } = await this.collectFeed(true, false);
    return asPreviewList(
      paginate(
        listings.map((p) => ({
          ...p,
          listingId: p.id,
          organizationId: '',
          mapped: false,
          stockSource: 'none' as const,
        })),
        query,
      ),
      false,
    );
  }

  async listOrders(query: PageQuery) {
    const { orders } = await this.collectFeed(false, true);
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
  constructor(private readonly cred: { key: string; secret: string }) {}

  private headers() {
    if (!this.cred) {
      throw new HttpException(
        {
          code: ErrorCodes.CHANNEL_UNAVAILABLE,
          message: 'n11 appKey/appSecret yok.',
        },
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
    await channelFetchJson(
      'https://api.n11.com/ms/product-query?page=0&size=1',
      { headers: this.headers() },
      'n11 products',
    );
  }

  async pullFeed() {
    return this.collectFeed(true, true);
  }

  private async collectFeed(includeListings: boolean, includeOrders: boolean) {
    const headers = this.headers();
    const productRows: unknown[] = [];
    if (includeListings) {
      for (let page = 0; page < 400; page += 1) {
        const raw = await channelFetchJson(
          `https://api.n11.com/ms/product-query?page=${page}&size=250`,
          { headers },
          'n11 products',
        );
        const batch = pageItems(raw);
        productRows.push(...batch);
        const totalPages = num(rec(raw)?.totalPages);
        if (batch.length < 250 || (totalPages > 0 && page + 1 >= totalPages))
          break;
      }
    }
    const listings = productRows.map((row) => {
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
    const packageRows: unknown[] = [];
    if (includeOrders) {
      for (let page = 0; page < 400; page += 1) {
        const raw = await channelFetchJson(
          `https://api.n11.com/rest/delivery/v1/shipmentPackages?startDate=${start}&endDate=${end}&page=${page}&size=250`,
          { headers },
          'n11 orders',
        );
        const batch = pageItems(raw);
        packageRows.push(...batch);
        const totalPages = num(rec(raw)?.totalPages);
        if (batch.length < 250 || (totalPages > 0 && page + 1 >= totalPages))
          break;
      }
    }
    const orders = packageRows.map((row) => {
      const r = rec(row) ?? {};
      const pkgId = str(r.id ?? r.packageId);
      const lines = pageItems(r.lines).map((it) => {
        const line = rec(it) ?? {};
        const stockCode = str(line.stockCode ?? line.barcode);
        return {
          listingId: stockCode
            ? `n11-${stockCode}`
            : `n11-line-${str(line.orderLineId)}`,
          qty: Math.max(1, num(line.quantity)),
        };
      });
      return order({
        channel: 'n11',
        id: `n11-${pkgId}`,
        orderNumber: str(r.orderNumber) || pkgId,
        customerName: str(rec(r.shippingAddress)?.fullName),
        statusRaw: str(r.status ?? r.shipmentPackageStatus),
        totalTry: num(r.totalAmount ?? r.packageTotalPrice),
        createdAt: num(r.orderDate)
          ? new Date(num(r.orderDate)).toISOString()
          : undefined,
        lines,
      });
    });
    return { listings, orders, returns: [] };
  }

  async listProducts(query: PageQuery) {
    const { listings } = await this.collectFeed(true, false);
    return asPreviewList(
      paginate(
        listings.map((p) => ({
          ...p,
          listingId: p.id,
          organizationId: '',
          mapped: false,
          stockSource: 'none' as const,
        })),
        query,
      ),
      false,
    );
  }

  async listOrders(query: PageQuery) {
    const { orders } = await this.collectFeed(false, true);
    return asPreviewList(
      paginate(
        orders.map((o) => ({ ...o, organizationId: '' })),
        query,
      ),
      false,
    );
  }
}

function arrFirst(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

/** A missing product or order scope must not fail the other feed, but must be visible. */
async function independentFeed(
  products: () => Promise<ReturnType<typeof listing>[]>,
  orders: () => Promise<Omit<OrderListItem, 'organizationId'>[]>,
): Promise<ChannelFeed> {
  const [listingPart, orderPart] = await Promise.allSettled([products(), orders()]);
  if (listingPart.status === 'rejected' && orderPart.status === 'rejected') {
    throw listingPart.reason;
  }
  const warnings: ChannelFeedWarning[] = [];
  if (listingPart.status === 'rejected') {
    warnings.push({ scope: 'products', message: feedErr(listingPart.reason) });
  }
  if (orderPart.status === 'rejected') {
    warnings.push({ scope: 'orders', message: feedErr(orderPart.reason) });
  }
  return {
    listings: listingPart.status === 'fulfilled' ? listingPart.value : [],
    orders: orderPart.status === 'fulfilled' ? orderPart.value : [],
    returns: [],
    warnings: warnings.length ? warnings : undefined,
  };
}

function feedErr(reason: unknown): string {
  if (reason instanceof HttpException) {
    const body = reason.getResponse();
    if (typeof body === 'object' && body && 'message' in body) {
      return String((body as { message: string }).message);
    }
    return reason.message;
  }
  return reason instanceof Error ? reason.message : 'Kanal isteği başarısız.';
}

function graphQlFailed(payload: unknown): boolean {
  const errors = rec(payload)?.errors;
  return Array.isArray(errors) && errors.length > 0;
}

function graphQlUnknownField(payload: unknown, field: string): boolean {
  const errors = rec(payload)?.errors;
  if (!Array.isArray(errors)) return false;
  const needle = field.toLowerCase();
  return errors.some((err) => str(rec(err)?.message).toLowerCase().includes(needle));
}

export class ShopifyReadAdapter implements ChannelReadAdapter {
  readonly channel = 'shopify' as const;
  readonly mock = false;

  constructor(private readonly cred: { shop: string; accessToken: string }) {}

  private shop() {
    const domain = this.cred.shop.trim();
    const token = this.cred.accessToken.trim();
    if (!domain || !token) {
      throw new HttpException(
        {
          code: ErrorCodes.CHANNEL_UNAVAILABLE,
          message: 'Shopify mağaza / token yok.',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const host = domain.includes('.') ? domain : `${domain}.myshopify.com`;
    const version = '2026-07';
    const url = assertPublicHttps(
      `https://${host}/admin/api/${version}/graphql.json`,
      'Shopify',
    );
    return { url, token };
  }

  private async gql(query: string): Promise<unknown> {
    const s = this.shop();
    const payload = await channelFetchJson(
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
    if (graphQlFailed(payload)) {
      throw new HttpException(
        {
          code: ErrorCodes.CHANNEL_UNAVAILABLE,
          message: 'Shopify GraphQL errors (token loglanmaz).',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
    return payload;
  }

  async probe(): Promise<void> {
    await this.gql('{ shop { name } }');
  }

  async pullFeed() {
    return independentFeed(
      () => this.collectProducts(),
      () => this.collectOrders(),
    );
  }

  private async collectProducts() {
    const listings = [] as ReturnType<typeof listing>[];
    let after = '';
    for (let page = 0; page < 1000; page += 1) {
      const payload = rec(
        await this.gql(`{
        productVariants(first: 100${after ? `, after: ${JSON.stringify(after)}` : ''}) {
          edges { cursor node { id sku barcode inventoryQuantity price
            product { title featuredImage { url } } } }
          pageInfo { hasNextPage endCursor }
        }
      }`),
      );
      const connection = rec(rec(payload?.data)?.productVariants);
      for (const edge of pageItems(connection?.edges, ['edges'])) {
        const v = rec(rec(edge)?.node) ?? {};
        const product = rec(v.product) ?? {};
        const sku = str(v.sku) || str(v.id);
        listings.push(
          listing({
            channel: 'shopify',
            id: `sh-${sku}`,
            sku,
            barcode: str(v.barcode) || sku,
            title: str(product.title) || sku,
            priceTry: num(v.price),
            marketplaceStock: num(v.inventoryQuantity),
            imageUrl: httpImage(rec(product.featuredImage)?.url),
          }),
        );
      }
      const info = rec(connection?.pageInfo);
      if (info?.hasNextPage !== true || !str(info.endCursor)) break;
      after = str(info.endCursor);
    }
    return listings;
  }

  private async collectOrders() {
    const orders = [] as Omit<OrderListItem, 'organizationId'>[];
    let after = '';
    for (let page = 0; page < 1000; page += 1) {
      const payload = rec(
        await this.gql(`{
        orders(first: 100${after ? `, after: ${JSON.stringify(after)}` : ''}) {
          edges { cursor node { id name createdAt displayFulfillmentStatus
            currentTotalPriceSet { shopMoney { amount currencyCode } }
            lineItems(first: 100) { edges { node { sku quantity } } } } }
          pageInfo { hasNextPage endCursor }
        }
      }`),
      );
      const connection = rec(rec(payload?.data)?.orders);
      for (const edge of pageItems(connection?.edges, ['edges'])) {
        const n = rec(rec(edge)?.node) ?? {};
        const lines = pageItems(rec(n.lineItems)?.edges, ['edges']).map(
          (le) => {
            const li = rec(rec(le)?.node) ?? {};
            const sku = str(li.sku);
            return {
              listingId: sku ? `sh-${sku}` : `sh-line-${str(n.id)}`,
              qty: Math.max(1, num(li.quantity)),
            };
          },
        );
        const money = rec(rec(n.currentTotalPriceSet)?.shopMoney);
        orders.push(
          order({
            channel: 'shopify',
            id: `sh-${str(n.id).split('/').pop()}`,
            orderNumber: str(n.name),
            statusRaw: str(n.displayFulfillmentStatus),
            totalTry: num(money?.amount),
            totalCurrency: str(money?.currencyCode) || 'TRY',
            createdAt: str(n.createdAt) || undefined,
            lines,
          }),
        );
      }
      const info = rec(connection?.pageInfo);
      if (info?.hasNextPage !== true || !str(info.endCursor)) break;
      after = str(info.endCursor);
    }
    return orders;
  }

  async listProducts(query: PageQuery) {
    const listings = await this.collectProducts();
    return asPreviewList(
      paginate(
        listings.map((p) => ({
          ...p,
          listingId: p.id,
          organizationId: '',
          mapped: false,
          stockSource: 'none' as const,
        })),
        query,
      ),
      false,
    );
  }

  async listOrders(query: PageQuery) {
    const orders = await this.collectOrders();
    return asPreviewList(
      paginate(
        orders.map((o) => ({ ...o, organizationId: '' })),
        query,
      ),
      false,
    );
  }
}

export class WooCommerceReadAdapter implements ChannelReadAdapter {
  readonly channel = 'woocommerce' as const;
  readonly mock = false;

  constructor(
    private readonly cred: { host: string; consumerKey: string; consumerSecret: string },
  ) {}

  private cfg() {
    const host = this.cred.host.trim();
    const key = this.cred.consumerKey.trim();
    const secret = this.cred.consumerSecret.trim();
    if (!host || !key || !secret) {
      throw new HttpException(
        {
          code: ErrorCodes.CHANNEL_UNAVAILABLE,
          message: 'WooCommerce host/key/secret yok.',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const base = assertPublicHttps(
      host.startsWith('http') ? host : `https://${host}`,
      'WooCommerce',
    );
    const root = `${base.origin}/wp-json/wc/v3`;
    const headers = {
      Authorization: `Basic ${Buffer.from(`${key}:${secret}`, 'utf8').toString('base64')}`,
    };
    return { root, headers };
  }

  async probe(): Promise<void> {
    const c = this.cfg();
    await channelFetchJson(
      `${c.root}/products?per_page=1`,
      { headers: c.headers },
      'WooCommerce products',
    );
  }

  async pullFeed() {
    return this.collectFeed(true, true);
  }

  private async storeCurrency(c: { root: string; headers: Record<string, string> }): Promise<string> {
    try {
      const payload = rec(
        await channelFetchJson(
          `${c.root}/data/currencies/current`,
          { headers: c.headers },
          'WooCommerce currency',
        ),
      );
      return str(payload?.code) || 'TRY';
    } catch {
      return 'TRY';
    }
  }

  private async collectFeed(includeListings: boolean, includeOrders: boolean) {
    const c = this.cfg();
    const currency = await this.storeCurrency(c);
    const productRows: unknown[] = [];
    if (includeListings) {
      for (let page = 1; page <= 1000; page += 1) {
        const raw = await channelFetchJson(
          `${c.root}/products?per_page=100&page=${page}`,
          { headers: c.headers },
          'WooCommerce products',
        );
        const batch = pageItems(raw);
        productRows.push(...batch);
        if (batch.length < 100) break;
      }
    }
    const listings = productRows.map((row) => {
      const r = rec(row) ?? {};
      const sku = str(r.sku) || str(r.id);
      const img = rec(arrFirst(r.images) as unknown);
      return listing({
        channel: 'woocommerce',
        id: `woo-${sku}`,
        sku,
        title: str(r.name) || sku,
        priceTry: num(r.price ?? r.regular_price),
        priceCurrency: currency,
        marketplaceStock: num(r.stock_quantity),
        active: str(r.stock_status) !== 'outofstock',
        imageUrl: httpImage(img?.src),
      });
    });
    const orderRows: unknown[] = [];
    if (includeOrders) {
      for (let page = 1; page <= 1000; page += 1) {
        const raw = await channelFetchJson(
          `${c.root}/orders?per_page=100&page=${page}`,
          { headers: c.headers },
          'WooCommerce orders',
        );
        const batch = pageItems(raw);
        orderRows.push(...batch);
        if (batch.length < 100) break;
      }
    }
    const orders = orderRows.map((row) => {
      const r = rec(row) ?? {};
      const lines = pageItems(r.line_items).map((it) => {
        const line = rec(it) ?? {};
        const sku = str(line.sku) || str(line.product_id);
        return {
          listingId: `woo-${sku}`,
          qty: Math.max(1, num(line.quantity)),
        };
      });
      return order({
        channel: 'woocommerce',
        id: `woo-${str(r.id)}`,
        orderNumber: str(r.number) || str(r.id),
        customerName: str(rec(r.billing)?.first_name),
        statusRaw: str(r.status),
        totalTry: num(r.total),
        totalCurrency: str(r.currency) || currency,
        createdAt: str(r.date_created_gmt)
          ? `${str(r.date_created_gmt)}Z`
          : undefined,
        lines,
      });
    });
    return { listings, orders, returns: [] };
  }

  async listProducts(query: PageQuery) {
    const { listings } = await this.collectFeed(true, false);
    return asPreviewList(
      paginate(
        listings.map((p) => ({
          ...p,
          listingId: p.id,
          organizationId: '',
          mapped: false,
          stockSource: 'none' as const,
        })),
        query,
      ),
      false,
    );
  }

  async listOrders(query: PageQuery) {
    const { orders } = await this.collectFeed(false, true);
    return asPreviewList(
      paginate(
        orders.map((o) => ({ ...o, organizationId: '' })),
        query,
      ),
      false,
    );
  }
}

export class CiceksepetiReadAdapter implements ChannelReadAdapter {
  readonly channel = 'ciceksepeti' as const;
  readonly mock = false;

  constructor(
    private readonly cred: { apiKey: string; sandbox?: boolean; sellerId?: string },
  ) {}

  private cfg() {
    const key = this.cred.apiKey.trim();
    if (!key) {
      throw new HttpException(
        {
          code: ErrorCodes.CHANNEL_UNAVAILABLE,
          message: 'CICEKSEPETI_API_KEY yok.',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const sandbox = this.cred.sandbox === true;
    const base = sandbox
      ? 'https://sandbox-apis.ciceksepeti.com/api/v1'
      : 'https://apis.ciceksepeti.com/api/v1';
    return {
      base,
      headers: {
        'x-api-key': key,
        'User-Agent': this.cred.sellerId?.trim() || 'Magazam',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };
  }

  async probe(): Promise<void> {
    const c = this.cfg();
    await channelFetchJson(
      `${c.base}/Products?Page=1&PageSize=1`,
      { headers: c.headers },
      'Çiçeksepeti products',
    );
  }

  async pullFeed() {
    return this.collectFeed(true, true);
  }

  private async collectFeed(includeListings: boolean, includeOrders: boolean) {
    const c = this.cfg();
    const productRows: unknown[] = [];
    if (includeListings) {
      for (let page = 1; page <= 1000; page += 1) {
        const raw = await channelFetchJson(
          `${c.base}/Products?Page=${page}&PageSize=100`,
          { headers: c.headers },
          'Çiçeksepeti products',
        );
        const batch = pageItems(raw, ['products', 'items', 'data']);
        productRows.push(...batch);
        if (batch.length < 100) break;
      }
    }
    const listings = productRows.map((row) => {
      const r = rec(row) ?? {};
      const sku = str(r.stockCode ?? r.productCode);
      return listing({
        channel: 'ciceksepeti',
        id: `cs-${sku || str(r.id)}`,
        sku: sku || str(r.id),
        title: str(r.productName ?? r.name) || sku,
        priceTry: num(r.salesPrice ?? r.salePrice),
        marketplaceStock: num(r.stockQuantity ?? r.quantity),
        imageUrl: httpImage(
          rec(arrFirst(r.images))?.url ?? rec(arrFirst(r.images))?.imageUrl,
        ),
      });
    });
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    const orderRows: unknown[] = [];
    if (includeOrders) {
      for (let page = 0; page < 1000; page += 1) {
        const payload = await channelFetchJson(
          `${c.base}/Order/GetOrders`,
          {
            method: 'POST',
            headers: c.headers,
            body: JSON.stringify({
              startDate: start.toISOString().slice(0, 10),
              endDate: end.toISOString().slice(0, 10),
              page,
              pageSize: 100,
            }),
          },
          'Çiçeksepeti orders',
        );
        const batch = pageItems(payload, [
          'supplierOrderListWithBranch',
          'orders',
          'items',
          'data',
        ]);
        orderRows.push(...batch);
        if (batch.length < 100) break;
      }
    }
    const orders = orderRows.map((row) => {
      const r = rec(row) ?? {};
      const items = pageItems(r.orderItems ?? r.items);
      const id = str(r.orderId ?? r.orderNo);
      return order({
        channel: 'ciceksepeti',
        id: `cs-${id}`,
        orderNumber: str(r.orderNo) || id,
        statusRaw: str(r.statusName ?? r.status ?? r.statusId),
        totalTry: num(r.totalPrice ?? r.amount),
        lines: items.map((it) => {
          const line = rec(it) ?? {};
          const code = str(line.stockCode ?? line.orderItemId);
          return {
            listingId: `cs-${code}`,
            qty: Math.max(1, num(line.quantity)),
          };
        }),
      });
    });
    return { listings, orders, returns: [] };
  }

  async listProducts(query: PageQuery) {
    const { listings } = await this.collectFeed(true, false);
    return asPreviewList(
      paginate(
        listings.map((p) => ({
          ...p,
          listingId: p.id,
          organizationId: '',
          mapped: false,
          stockSource: 'none' as const,
        })),
        query,
      ),
      false,
    );
  }

  async listOrders(query: PageQuery) {
    const { orders } = await this.collectFeed(false, true);
    return asPreviewList(
      paginate(
        orders.map((o) => ({ ...o, organizationId: '' })),
        query,
      ),
      false,
    );
  }
}

export class IkasReadAdapter implements ChannelReadAdapter {
  readonly channel = 'ikas' as const;
  readonly mock = false;
  private cachedToken: { value: string; expiresAt: number } | null = null;
  /** Official Order type has orderLineItems; builders.ikas.com listOrder sample omits it. Probe once. */
  private listOrderHasLines: boolean | null = null;

  constructor(
    private readonly cred: { clientId?: string; clientSecret?: string; accessToken?: string },
  ) {}

  private async token(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 60_000)
      return this.cachedToken.value;
    const clientId = this.cred.clientId?.trim();
    const clientSecret = this.cred.clientSecret?.trim();
    if (clientId && clientSecret) {
      const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      });
      const payload = rec(
        await channelFetchJson(
          'https://api.myikas.com/api/admin/oauth/token',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
          },
          'ikas OAuth',
        ),
      );
      const value = str(payload?.access_token);
      if (value) {
        this.cachedToken = {
          value,
          expiresAt: Date.now() + Math.max(60, num(payload?.expires_in)) * 1000,
        };
        return value;
      }
    }
    const fallback = this.cred.accessToken?.trim();
    if (!fallback) {
      throw new HttpException(
        {
          code: ErrorCodes.CHANNEL_UNAVAILABLE,
          message: 'IKAS_CLIENT_ID/IKAS_CLIENT_SECRET yok.',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return fallback;
  }

  private async gqlRaw(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<unknown> {
    return channelFetchJson(
      'https://api.myikas.com/api/v2/admin/graphql',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await this.token()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
      },
      'ikas GraphQL',
    );
  }

  private async gql(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<unknown> {
    const payload = await this.gqlRaw(query, variables);
    if (graphQlFailed(payload)) {
      throw new HttpException(
        {
          code: ErrorCodes.CHANNEL_UNAVAILABLE,
          message: 'ikas GraphQL errors (token loglanmaz).',
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
    return payload;
  }

  async probe(): Promise<void> {
    await this.gql(
      'query { listProduct(pagination: { page: 1, limit: 1 }) { count } }',
    );
  }

  async pullFeed() {
    return independentFeed(
      () => this.collectProducts(),
      () => this.collectOrders(),
    );
  }

  private async collectProducts() {
    const productRows: unknown[] = [];
    for (let page = 1; page <= 1000; page += 1) {
      const products = rec(
        await this.gql(
          `query ListProduct($pagination: PaginationInput) {
          listProduct(pagination: $pagination) {
            count data { id name totalStock variants { id sku barcodeList prices { sellPrice } } }
          }
        }`,
          { pagination: { page, limit: 100 } },
        ),
      );
      const root = rec(rec(products?.data)?.listProduct);
      const batch = pageItems(root?.data);
      productRows.push(...batch);
      const count = num(root?.count);
      if (batch.length < 100 || (count > 0 && productRows.length >= count))
        break;
    }
    const listings = productRows.flatMap((row) => {
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
        const barcode = Array.isArray(barcodes)
          ? str(barcodes[0])
          : str(barcodes);
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
    return listings;
  }

  private listOrderQuery(withLines: boolean): string {
    const lines = withLines
      ? `
                orderLineItems { quantity variant { sku } }`
      : '';
    return `query ListOrder($pagination: PaginationInput, $sort: String) {
            listOrder(pagination: $pagination, sort: $sort) {
              count
              hasNext
              data {
                id
                orderNumber
                orderedAt
                status
                totalFinalPrice${lines}
              }
            }
          }`;
  }

  private async fetchOrderPage(page: number): Promise<unknown> {
    const variables = { pagination: { page, limit: 100 }, sort: '-orderedAt' };
    if (this.listOrderHasLines === false) {
      return this.gql(this.listOrderQuery(false), variables);
    }
    if (this.listOrderHasLines === true) {
      return this.gql(this.listOrderQuery(true), variables);
    }
    const withLines = await this.gqlRaw(this.listOrderQuery(true), variables);
    if (!graphQlFailed(withLines)) {
      this.listOrderHasLines = true;
      return withLines;
    }
    if (graphQlUnknownField(withLines, 'orderLineItems')) {
      this.listOrderHasLines = false;
      return this.gql(this.listOrderQuery(false), variables);
    }
    throw new HttpException(
      {
        code: ErrorCodes.CHANNEL_UNAVAILABLE,
        message: 'ikas GraphQL errors (token loglanmaz).',
      },
      HttpStatus.BAD_GATEWAY,
    );
  }

  private async collectOrders() {
    const orderRows: unknown[] = [];
    for (let page = 1; page <= 1000; page += 1) {
      const payload = rec(await this.fetchOrderPage(page));
      const root = rec(rec(payload?.data)?.listOrder);
      const batch = pageItems(root?.data);
      orderRows.push(...batch);
      if (batch.length < 100 || root?.hasNext === false) break;
      const count = num(root?.count);
      if (count > 0 && orderRows.length >= count) break;
    }
    return orderRows.map((row) => {
      const r = rec(row) ?? {};
      const id = str(r.id) || str(r.orderNumber);
      const lines = pageItems(r.orderLineItems).map((rawLine) => {
        const line = rec(rawLine) ?? {};
        const sku = str(rec(line.variant)?.sku);
        return {
          listingId: sku ? `ikas-${sku}` : `ikas-line-${id}`,
          qty: Math.max(1, num(line.quantity)),
        };
      });
      return order({
        channel: 'ikas',
        id: `ikas-${id}`,
        orderNumber: str(r.orderNumber) || id,
        statusRaw: str(r.status),
        totalTry: num(r.totalFinalPrice),
        createdAt: num(r.orderedAt)
          ? new Date(num(r.orderedAt)).toISOString()
          : str(r.orderedAt) || undefined,
        lines,
      });
    });
  }

  async listProducts(query: PageQuery) {
    const { listings } = await this.pullFeed();
    return asPreviewList(
      paginate(
        listings.map((p) => ({
          ...p,
          listingId: p.id,
          organizationId: '',
          mapped: false,
          stockSource: 'none' as const,
        })),
        query,
      ),
      false,
    );
  }

  async listOrders(query: PageQuery) {
    const orders = await this.collectOrders();
    return asPreviewList(
      paginate(
        orders.map((o) => ({ ...o, organizationId: '' })),
        query,
      ),
      false,
    );
  }
}

export class AmazonReadAdapter implements ChannelReadAdapter {
  readonly channel = 'amazon' as const;
  readonly mock = false;
  private cachedToken: { value: string; expiresAt: number } | null = null;

  constructor(
    private readonly cred: {
      lwaClientId: string;
      lwaClientSecret: string;
      refreshToken: string;
      sellerId?: string;
    },
  ) {}

  private async accessToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 60_000)
      return this.cachedToken.value;
    const clientId = this.cred.lwaClientId.trim();
    const clientSecret = this.cred.lwaClientSecret.trim();
    const refresh = this.cred.refreshToken.trim();
    if (!clientId || !clientSecret || !refresh) {
      throw new HttpException(
        {
          code: ErrorCodes.CHANNEL_UNAVAILABLE,
          message: 'Amazon LWA client/refresh yok.',
        },
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
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
        },
        'Amazon LWA',
      ),
    );
    const token = str(json?.access_token);
    if (!token) {
      throw new HttpException(
        {
          code: ErrorCodes.CHANNEL_UNAVAILABLE,
          message: 'Amazon access_token alınamadı.',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    this.cachedToken = {
      value: token,
      expiresAt: Date.now() + Math.max(60, num(json?.expires_in)) * 1000,
    };
    return token;
  }

  private amzDate(at = new Date()): string {
    return at.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  }

  private spHeaders(token: string, requestUrl: string): Record<string, string> {
    return {
      host: new URL(requestUrl).host,
      'x-amz-access-token': token,
      'x-amz-date': this.amzDate(),
      Accept: 'application/json',
      'User-Agent': 'Magazam/1.0 (Language=JavaScript)',
    };
  }

  private ordersUrl(limit: number, paginationToken?: string): string {
    const marketplace =
      'A33AVAJ2PDY3EV';
    const host = assertPublicHttps(
      'https://sellingpartnerapi-eu.amazon.com',
      'Amazon SP-API',
    ).origin;
    const after = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const query = new URLSearchParams({
      marketplaceIds: marketplace,
      createdAfter: after,
      maxResultsPerPage: String(limit),
      includedData: 'PROCEEDS,FULFILLMENT',
    });
    if (paginationToken) query.set('paginationToken', paginationToken);
    return `${host}/orders/2026-01-01/orders?${query.toString()}`;
  }

  async probe(): Promise<void> {
    const token = await this.accessToken();
    const ordersUrl = this.ordersUrl(1);
    await channelFetchJson(
      ordersUrl,
      { headers: this.spHeaders(token, ordersUrl) },
      'Amazon orders',
    );
  }

  async pullFeed() {
    return independentFeed(
      () => this.collectProducts(),
      () => this.collectOrders(),
    );
  }

  private async collectProducts() {
    const sellerId = this.cred.sellerId?.trim();
    if (!sellerId) return [];
    const token = await this.accessToken();
    const marketplace =
      'A33AVAJ2PDY3EV';
    const host = assertPublicHttps(
      'https://sellingpartnerapi-eu.amazon.com',
      'Amazon SP-API',
    ).origin;
    const rows: unknown[] = [];
    let pageToken = '';
    for (let page = 0; page < 1000; page += 1) {
      const query = new URLSearchParams({
        marketplaceIds: marketplace,
        includedData: 'summaries,attributes,offers,fulfillmentAvailability',
        pageSize: '20',
      });
      if (pageToken) query.set('pageToken', pageToken);
      const listingsUrl = `${host}/listings/2021-08-01/items/${encodeURIComponent(sellerId)}?${query.toString()}`;
      const payload =
        rec(
          await channelFetchJson(
            listingsUrl,
            { headers: this.spHeaders(token, listingsUrl) },
            'Amazon listings',
          ),
        ) ?? {};
      rows.push(...pageItems(payload.items));
      pageToken = str(rec(payload.pagination)?.nextToken);
      if (!pageToken) break;
    }
    return rows.map((raw) => {
      const item = rec(raw) ?? {};
      const sku = str(item.sku ?? item.sellerSku);
      const summary = rec(arrFirst(item.summaries)) ?? {};
      const offer = rec(arrFirst(item.offers)) ?? {};
      const price = rec(offer.price) ?? {};
      const availability = rec(arrFirst(item.fulfillmentAvailability)) ?? {};
      return listing({
        channel: 'amazon',
        id: `amz-${sku}`,
        sku,
        barcode: sku,
        title: str(summary.itemName) || sku,
        priceTry: num(price.amount),
        priceCurrency: str(price.currencyCode) || 'TRY',
        marketplaceStock: num(availability.quantity),
      });
    });
  }

  private async collectOrders() {
    const token = await this.accessToken();
    const rows: unknown[] = [];
    let paginationToken = '';
    for (let page = 0; page < 1000; page += 1) {
      const ordersUrl = this.ordersUrl(100, paginationToken || undefined);
      const payload = await channelFetchJson(
        ordersUrl,
        { headers: this.spHeaders(token, ordersUrl) },
        'Amazon orders',
      );
      const root = rec(payload) ?? {};
      rows.push(
        ...pageItems(root.orders ?? rec(root.payload)?.Orders ?? payload, [
          'orders',
          'Orders',
          'items',
        ]),
      );
      paginationToken = str(
        rec(root.pagination)?.nextToken ??
          root.paginationToken ??
          rec(root.payload)?.NextToken,
      );
      if (!paginationToken) break;
    }
    const orders = rows.map((row) => {
      const r = rec(row) ?? {};
      const id = str(r.orderId ?? r.AmazonOrderId);
      const fulfillment = rec(r.fulfillment);
      const grandTotal = rec(rec(r.proceeds)?.grandTotal);
      const orderItems = pageItems(r.orderItems);
      const lines = orderItems.map((raw) => {
        const item = rec(raw) ?? {};
        const product = rec(item.product) ?? {};
        const sku = str(product.sellerSku ?? item.SellerSKU);
        return {
          listingId: sku ? `amz-${sku}` : `amz-line-${str(item.orderItemId)}`,
          qty: Math.max(1, num(item.quantityOrdered ?? item.QuantityOrdered)),
        };
      });
      return order({
        channel: 'amazon',
        id: `amz-${id}`,
        orderNumber: id,
        statusRaw: str(
          fulfillment?.fulfillmentStatus ?? r.orderStatus ?? r.OrderStatus,
        ),
        totalTry: num(
          grandTotal?.amount ??
            rec(r.orderTotal)?.amount ??
            rec(r.OrderTotal)?.Amount,
        ),
        totalCurrency:
          str(
            grandTotal?.currencyCode ??
              rec(r.orderTotal)?.currencyCode ??
              rec(r.OrderTotal)?.CurrencyCode,
          ) || 'TRY',
        createdAt: str(r.createdTime ?? r.PurchaseDate) || undefined,
        lines,
      });
    });
    return orders;
  }

  async listProducts(query: PageQuery) {
    const listings = await this.collectProducts();
    return asPreviewList(
      paginate(
        listings.map((p) => ({
          ...p,
          listingId: p.id,
          organizationId: '',
          mapped: false,
          stockSource: 'none' as const,
        })),
        query,
      ),
      false,
    );
  }

  async listOrders(query: PageQuery) {
    const orders = await this.collectOrders();
    return asPreviewList(
      paginate(
        orders.map((o) => ({ ...o, organizationId: '' })),
        query,
      ),
      false,
    );
  }
}
