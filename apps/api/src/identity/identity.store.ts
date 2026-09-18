import { randomUUID } from 'node:crypto';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  asPreviewList,
  ErrorCodes,
  paginate,
  parsePageQuery,
  type LabelResult,
  type ListingMapping,
  type OperationEvent,
  type OrderListItem,
  type OrganizationSummary,
  type OutboxEntry,
  type PreviewList,
  type ProductListItem,
  type ShopStatus,
  type ShopSyncResult,
  type StockBalance,
  type StockMovement,
  type ListingDraft,
  type OpsReport,
  type OrgInvite,
  type OrgMember,
  type ReturnListItem,
} from '@magazakit/contracts';
import type { IdentityRepository, PersistenceBackend } from './identity.repository';
import { sellableOf, toProductListItem } from './identity.repository';
import {
  TRENDYOL_READ_ADAPTER,
  type TrendyolReadAdapter,
} from '../trendyol/trendyol-read.adapter';

function boom(code: string, message: string, status: HttpStatus): never {
  throw new HttpException({ code, message }, status);
}

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

function mockLabelUrl(orderId: string): string {
  const port = process.env.PORT ?? '43140';
  return `http://127.0.0.1:${port}/v1/orders/${orderId}/label.pdf`;
}

export const MOCK_LABEL_PDF = Buffer.from(
  `%PDF-1.1
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]/Contents 4 0 R>>endobj
4 0 obj<</Length 52>>stream
BT /F1 12 Tf 24 160 Td (Magazam mock kargo etiketi) Tj ET
endstream
endobj
trailer<</Root 1 0 R>>
%%EOF
`,
  'utf8',
);

@Injectable()
export class IdentityStore {
  constructor(
    private readonly repo: IdentityRepository,
    @Inject(TRENDYOL_READ_ADAPTER) private readonly trendyol: TrendyolReadAdapter,
  ) {}

  get backend(): PersistenceBackend {
    return this.repo.backend;
  }

  getOrgForUid(uid: string): Promise<OrganizationSummary | null> {
    return this.repo.getOrgForUid(uid);
  }

  createOrg(uid: string, name: string): Promise<OrganizationSummary> {
    return this.repo.createOrg(uid, name);
  }

  async requireOrg(uid: string): Promise<OrganizationSummary> {
    const org = await this.repo.getOrgForUid(uid);
    if (!org) {
      throw new HttpException(
        {
          code: ErrorCodes.VALIDATION,
          message: 'Önce işletme oluşturun (POST /v1/organizations).',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return org;
  }

  async assertOrgAccess(uid: string, organizationId: string | undefined): Promise<OrganizationSummary> {
    const org = await this.requireOrg(uid);
    if (organizationId && organizationId.trim() !== '' && organizationId !== org.id) {
      const other = await this.repo.getOrgById(organizationId);
      if (!other || other.ownerUid !== uid) {
        throw new HttpException(
          {
            code: ErrorCodes.FORBIDDEN,
            message: 'Bu organization_id bu kullanıcıya ait değil.',
          },
          HttpStatus.FORBIDDEN,
        );
      }
    }
    return org;
  }

  saveDevice(uid: string, fcmToken: string): Promise<void> {
    return this.repo.saveDevice(uid, fcmToken);
  }

  async connectTrendyolMock(uid: string): Promise<ShopStatus> {
    const org = await this.requireOrg(uid);
    return this.repo.upsertTrendyolMockShop(org);
  }

  listShops(uid: string): Promise<ShopStatus[]> {
    return this.repo.listShopsForUid(uid);
  }

  async syncShop(uid: string, shopId: string): Promise<ShopSyncResult> {
    const org = await this.requireOrg(uid);
    const shop = await this.repo.getShopById(shopId);
    if (!shop || shop.organizationId !== org.id) {
      throw new HttpException(
        { code: ErrorCodes.NOT_FOUND, message: 'Mağaza bulunamadı.' },
        HttpStatus.NOT_FOUND,
      );
    }
    const feed = await this.trendyol.pullFeed();
    const productsUpserted = await this.repo.upsertListings(org.id, shop.id, feed.listings);
    const ordersUpserted = await this.repo.upsertOrders(org.id, feed.orders);
    await this.repo.upsertReturns(org.id, feed.returns ?? []);
    const lastSyncAt = new Date().toISOString();
    const checkpoint = `mock:${feed.listings.length}:${feed.orders.length}:${lastSyncAt}`;
    await this.repo.markShopSynced(shop.id, checkpoint, lastSyncAt);
    return {
      shopId: shop.id,
      organizationId: org.id,
      productsUpserted,
      ordersUpserted,
      checkpoint,
      lastSyncAt,
      mock: true,
    };
  }

  async listProducts(
    uid: string,
    organizationId: string | undefined,
    page?: string,
    pageSize?: string,
  ): Promise<PreviewList<ProductListItem>> {
    const org = await this.assertOrgAccess(uid, organizationId);
    const [listings, mappings] = await Promise.all([
      this.repo.listListings(org.id),
      this.repo.listMappings(org.id),
    ]);
    const byListing = new Map(mappings.map((m) => [m.listingId, m]));
    const items: ProductListItem[] = [];
    for (const listing of listings) {
      const mapping = byListing.get(listing.id);
      const stock = mapping ? await this.repo.getSkuStock(org.id, mapping.sku) : undefined;
      items.push(toProductListItem(listing, org.id, mapping, stock));
    }
    return asPreviewList(paginate(items, parsePageQuery({ page, pageSize })), true);
  }

  async listOrders(
    uid: string,
    organizationId: string | undefined,
    page?: string,
    pageSize?: string,
  ): Promise<PreviewList<OrderListItem>> {
    const org = await this.assertOrgAccess(uid, organizationId);
    const orders = await this.repo.listOrgOrders(org.id);
    return asPreviewList(paginate(orders, parsePageQuery({ page, pageSize })), true);
  }

  async upsertMapping(uid: string, listingId: string, sku: string): Promise<ListingMapping> {
    const org = await this.requireOrg(uid);
    const listing = await this.repo.getListing(org.id, listingId);
    if (!listing) {
      throw new HttpException(
        {
          code: ErrorCodes.NOT_FOUND,
          message: 'İlan org kataloğunda yok. Önce POST /v1/shops/:id/sync.',
        },
        HttpStatus.NOT_FOUND,
      );
    }
    return this.repo.upsertMapping(org.id, listingId, sku);
  }

  async listMappings(uid: string): Promise<ListingMapping[]> {
    const org = await this.requireOrg(uid);
    return this.repo.listMappings(org.id);
  }

  async getOrder(uid: string, orderId: string): Promise<OrderListItem> {
    const org = await this.requireOrg(uid);
    return this.requireOrder(org.id, orderId);
  }

  async listOperations(uid: string): Promise<{ items: OperationEvent[] }> {
    const org = await this.requireOrg(uid);
    return { items: await this.repo.listOperations(org.id) };
  }

  async listMovements(uid: string): Promise<{ items: StockMovement[] }> {
    const org = await this.requireOrg(uid);
    return { items: await this.repo.listMovements(org.id) };
  }

  async listOutbox(uid: string): Promise<{ items: OutboxEntry[] }> {
    const org = await this.requireOrg(uid);
    return { items: await this.repo.listOutbox(org.id) };
  }

  async getSkuStock(uid: string, sku: string): Promise<StockBalance> {
    const org = await this.requireOrg(uid);
    return this.repo.getSkuStock(org.id, sku.trim());
  }

  /**
   * T07: first reserve wins. Same idempotency key is a no-op replay.
   * sellable = physical − reserved. Unmapped listing SKUs cannot reserve.
   */
  async reserveOrder(uid: string, orderId: string, idempotencyKey?: string): Promise<OrderListItem> {
    const org = await this.requireOrg(uid);
    const order = await this.requireOrder(org.id, orderId);
    const key = (idempotencyKey?.trim() || `reserve:${order.id}`).trim();

    if (order.shipped) {
      boom(ErrorCodes.CONFLICT, 'Kargolanmış sipariş tekrar rezerve edilemez.', HttpStatus.CONFLICT);
    }
    if (order.reserved) {
      if (order.reservationKey === key) {
        return order;
      }
      boom(ErrorCodes.CONFLICT, 'Bu sipariş zaten rezerve. İkinci rezervasyon yok (T07).', HttpStatus.CONFLICT);
    }

    const existingMove = await this.repo.findMovementByKey(org.id, key);
    if (existingMove) {
      boom(
        ErrorCodes.CONFLICT,
        'Bu idempotency anahtarı başka bir stok hareketinde kullanıldı.',
        HttpStatus.CONFLICT,
      );
    }

    const mappings = await this.repo.listMappings(org.id);
    const byListing = new Map(mappings.map((m) => [m.listingId, m]));
    const qtyBySku = new Map<string, number>();

    for (const line of order.lines) {
      const mapping = byListing.get(line.listingId);
      if (!mapping) {
        boom(
          ErrorCodes.UNMAPPED_SKU,
          `Eşlenmemiş ilan rezervelenemez: ${line.listingId}. POST /v1/mappings.`,
          HttpStatus.BAD_REQUEST,
        );
      }
      qtyBySku.set(mapping.sku, (qtyBySku.get(mapping.sku) ?? 0) + line.qty);
    }

    for (const [sku, qty] of qtyBySku) {
      const stock = await this.repo.getSkuStock(org.id, sku);
      if (stock.sellableStock < qty) {
        boom(
          ErrorCodes.INSUFFICIENT_STOCK,
          `Satılabilir stok yetersiz (${sku}): ${stock.sellableStock} < ${qty}.`,
          HttpStatus.CONFLICT,
        );
      }
    }

    for (const [sku, qty] of qtyBySku) {
      const stock = await this.repo.getSkuStock(org.id, sku);
      const next = await this.writeBalance(org.id, sku, stock.physicalStock, stock.reservedStock + qty);
      await this.repo.appendMovement({
        id: newId('mov'),
        organizationId: org.id,
        sku,
        deltaPhysical: 0,
        deltaReserved: qty,
        reason: 'reserve',
        idempotencyKey: `${key}:${sku}`,
        createdAt: nowIso(),
      });
      await this.recordChannelIntent(org.id, sku, next.sellableStock, `Rezerve ${sku} (${qty})`);
    }

    const reserved: OrderListItem = {
      ...order,
      reserved: true,
      reservationKey: key,
      status: order.status === 'created' ? 'picking' : order.status,
      statusLabel: order.status === 'created' ? 'Hazırlanacak' : order.statusLabel,
    };
    await this.repo.saveOrder(reserved);
    await this.op(org.id, 'reserve', `Sipariş rezerve ${reserved.orderNumber}`, 'ok', reserved.id);
    return reserved;
  }

  async scanPackSku(
    uid: string,
    orderId: string,
    input: { sku?: string; barcode?: string },
  ): Promise<OrderListItem> {
    const org = await this.requireOrg(uid);
    const order = await this.requireOrder(org.id, orderId);
    if (order.shipped) {
      boom(ErrorCodes.CONFLICT, 'Kargolanmış sipariş paketlenemez.', HttpStatus.CONFLICT);
    }
    if (!order.reserved) {
      boom(ErrorCodes.VALIDATION, 'Önce POST /v1/orders/:id/reserve.', HttpStatus.BAD_REQUEST);
    }

    const token = (input.sku ?? input.barcode ?? '').trim();
    if (!token) {
      boom(ErrorCodes.VALIDATION, 'sku veya barcode gerekli.', HttpStatus.BAD_REQUEST);
    }

    const [listings, mappings] = await Promise.all([
      this.repo.listListings(org.id),
      this.repo.listMappings(org.id),
    ]);
    const listing =
      listings.find((l) => l.barcode === token || l.sku === token || l.id === token) ?? null;
    const mappingByListing = new Map(mappings.map((m) => [m.listingId, m]));
    const mappingBySku = mappings.find((m) => m.sku === token);

    let listingId: string | null = null;
    if (listing) {
      const mapped = mappingByListing.get(listing.id);
      if (!mapped) {
        boom(
          ErrorCodes.UNMAPPED_SKU,
          `Eşlenmemiş SKU paketlenemez / kargolanamaz: ${listing.id}.`,
          HttpStatus.BAD_REQUEST,
        );
      }
      listingId = listing.id;
    } else if (mappingBySku) {
      listingId = mappingBySku.listingId;
    } else {
      boom(ErrorCodes.WRONG_SKU, 'Okunan SKU / barkod bu siparişte yok.', HttpStatus.BAD_REQUEST);
    }

    const lineIndex = order.lines.findIndex((l) => l.listingId === listingId);
    if (lineIndex < 0) {
      boom(ErrorCodes.WRONG_SKU, 'Yanlış ürün. Bu sipariş kaleminde yok (E-63).', HttpStatus.BAD_REQUEST);
    }
    const line = order.lines[lineIndex];
    if (line.scannedQty >= line.qty) {
      boom(ErrorCodes.CONFLICT, 'Bu kalem zaten tam tarandı.', HttpStatus.CONFLICT);
    }

    const lines = order.lines.map((l, i) =>
      i === lineIndex ? { ...l, scannedQty: l.scannedQty + 1 } : l,
    );
    const packed = lines.every((l) => l.scannedQty >= l.qty);
    const next: OrderListItem = { ...order, lines, packed };
    await this.repo.saveOrder(next);
    await this.op(
      org.id,
      'pack_scan',
      packed ? `Paket tamam ${next.orderNumber}` : `SKU okundu ${token} (${next.orderNumber})`,
      'ok',
      next.id,
    );
    return next;
  }

  async createLabel(uid: string, orderId: string): Promise<LabelResult> {
    const org = await this.requireOrg(uid);
    const order = await this.requireOrder(org.id, orderId);
    if (order.shipped) {
      boom(ErrorCodes.CONFLICT, 'Kargolanmış siparişe etiket basılmaz.', HttpStatus.CONFLICT);
    }
    const pdfUrl = order.labelUrl ?? mockLabelUrl(order.id);
    const next: OrderListItem = {
      ...order,
      labeled: true,
      labelUrl: pdfUrl,
    };
    await this.repo.saveOrder(next);
    await this.op(org.id, 'label', `Etiket hazır ${next.orderNumber} (yazdırmak kargolamaz)`, 'ok', next.id);
    return {
      orderId: next.id,
      labeled: true,
      shipped: next.shipped,
      pdfUrl,
      mock: true,
    };
  }

  async labelPdf(uid: string, orderId: string): Promise<Buffer> {
    await this.createLabel(uid, orderId);
    return MOCK_LABEL_PDF;
  }

  async shipOrder(uid: string, orderId: string, idempotencyKey?: string): Promise<OrderListItem> {
    const org = await this.requireOrg(uid);
    const order = await this.requireOrder(org.id, orderId);
    const key = (idempotencyKey?.trim() || `ship:${order.id}`).trim();

    if (order.shipped) {
      return order;
    }
    if (!order.reserved) {
      boom(ErrorCodes.VALIDATION, 'Önce rezervasyon.', HttpStatus.BAD_REQUEST);
    }
    if (!order.packed || order.lines.some((l) => l.scannedQty < l.qty)) {
      boom(ErrorCodes.PACK_INCOMPLETE, 'Paket eksik. Tüm SKU’lar taranmalı (E-12).', HttpStatus.BAD_REQUEST);
    }

    const mappings = await this.repo.listMappings(org.id);
    const byListing = new Map(mappings.map((m) => [m.listingId, m]));
    const qtyBySku = new Map<string, number>();
    for (const line of order.lines) {
      const mapping = byListing.get(line.listingId);
      if (!mapping) {
        boom(
          ErrorCodes.UNMAPPED_SKU,
          `Eşlenmemiş SKU kargolanamaz: ${line.listingId}.`,
          HttpStatus.BAD_REQUEST,
        );
      }
      qtyBySku.set(mapping.sku, (qtyBySku.get(mapping.sku) ?? 0) + line.qty);
    }

    for (const [sku, qty] of qtyBySku) {
      const stock = await this.repo.getSkuStock(org.id, sku);
      const physical = stock.physicalStock - qty;
      const reserved = stock.reservedStock - qty;
      if (physical < 0 || reserved < 0) {
        boom(ErrorCodes.INSUFFICIENT_STOCK, `Sevkiyat stoku tutarsız: ${sku}.`, HttpStatus.CONFLICT);
      }
      const next = await this.writeBalance(org.id, sku, physical, reserved);
      await this.repo.appendMovement({
        id: newId('mov'),
        organizationId: org.id,
        sku,
        deltaPhysical: -qty,
        deltaReserved: -qty,
        reason: 'ship',
        idempotencyKey: `${key}:${sku}`,
        createdAt: nowIso(),
      });
      await this.recordChannelIntent(org.id, sku, next.sellableStock, `Kanal stok yazımı ${sku} → ${next.sellableStock}`);
    }

    const shipped: OrderListItem = {
      ...order,
      shipped: true,
      status: 'shipped',
      statusLabel: 'Kargoda',
    };
    await this.repo.saveOrder(shipped);
    await this.op(org.id, 'ship', `Kargolandı ${shipped.orderNumber}`, 'ok', shipped.id);
    return shipped;
  }

  /**
   * E-06 / T08: ledger + intended channel write (no Redis). Duplicate key = one movement.
   */
  async adjustStock(
    uid: string,
    body: { sku?: string; deltaPhysical?: number; reason?: 'adjust' | 'count'; idempotencyKey?: string },
  ): Promise<{ balance: StockBalance; movement: StockMovement; outbox: OutboxEntry }> {
    const org = await this.requireOrg(uid);
    const sku = body.sku?.trim();
    const key = body.idempotencyKey?.trim();
    const reason = body.reason === 'count' ? 'count' : 'adjust';
    if (!sku) {
      boom(ErrorCodes.VALIDATION, 'sku gerekli.', HttpStatus.BAD_REQUEST);
    }
    if (!key) {
      boom(ErrorCodes.VALIDATION, 'idempotencyKey gerekli (çift gönderim tek hareket).', HttpStatus.BAD_REQUEST);
    }
    if (!Number.isFinite(body.deltaPhysical)) {
      boom(ErrorCodes.VALIDATION, 'deltaPhysical sayı olmalı.', HttpStatus.BAD_REQUEST);
    }
    const delta = Number(body.deltaPhysical);

    const existing = await this.repo.findMovementByKey(org.id, key);
    if (existing) {
      const balance = await this.repo.getSkuStock(org.id, sku);
      const outbox = (await this.repo.listOutbox(org.id)).find((e) => e.sku === sku) ?? {
        id: existing.id,
        organizationId: org.id,
        kind: 'channel_stock_write' as const,
        channel: 'trendyol' as const,
        sku,
        intendedQty: balance.sellableStock,
        status: 'pending' as const,
        createdAt: existing.createdAt,
      };
      return { balance, movement: existing, outbox };
    }

    const stock = await this.repo.getSkuStock(org.id, sku);
    const physical = stock.physicalStock + delta;
    if (physical < 0) {
      boom(ErrorCodes.INSUFFICIENT_STOCK, 'Fiziksel stok negatif olamaz.', HttpStatus.CONFLICT);
    }
    if (physical < stock.reservedStock) {
      boom(
        ErrorCodes.INSUFFICIENT_STOCK,
        'Fiziksel stok rezerve adedinin altına inemez.',
        HttpStatus.CONFLICT,
      );
    }

    const balance = await this.writeBalance(org.id, sku, physical, stock.reservedStock);
    const movement = await this.repo.appendMovement({
      id: newId('mov'),
      organizationId: org.id,
      sku,
      deltaPhysical: delta,
      deltaReserved: 0,
      reason,
      idempotencyKey: key,
      createdAt: nowIso(),
    });
    const outbox = await this.recordChannelIntent(
      org.id,
      sku,
      balance.sellableStock,
      `Stok kaydedildi ${sku} → ${balance.sellableStock} (kanal teyidi yok)`,
    );
    return { balance, movement, outbox };
  }

  private async requireOrder(orgId: string, orderId: string): Promise<OrderListItem> {
    const order = await this.repo.getOrder(orgId, orderId);
    if (!order) {
      boom(ErrorCodes.NOT_FOUND, 'Sipariş bulunamadı. Önce POST /v1/shops/:id/sync.', HttpStatus.NOT_FOUND);
    }
    return order;
  }

  private async writeBalance(
    orgId: string,
    sku: string,
    physicalStock: number,
    reservedStock: number,
  ): Promise<StockBalance> {
    return this.repo.setSkuStock({
      organizationId: orgId,
      sku,
      physicalStock,
      reservedStock,
      sellableStock: sellableOf(physicalStock, reservedStock),
    });
  }

  private async recordChannelIntent(
    orgId: string,
    sku: string,
    intendedQty: number,
    title: string,
  ): Promise<OutboxEntry> {
    const entry: OutboxEntry = {
      id: newId('obx'),
      organizationId: orgId,
      kind: 'channel_stock_write',
      channel: 'trendyol',
      sku,
      intendedQty,
      status: 'pending',
      createdAt: nowIso(),
    };
    await this.repo.appendOutbox(entry);
    await this.op(orgId, 'channel_stock_write', title, 'pending', entry.id);
    return entry;
  }

  private async op(
    orgId: string,
    type: string,
    title: string,
    status: OperationEvent['status'],
    refId: string | null,
  ): Promise<OperationEvent> {
    return this.repo.appendOperation({
      id: newId('op'),
      organizationId: orgId,
      type,
      title,
      status,
      refId,
      createdAt: nowIso(),
    });
  }

  async listReturns(uid: string): Promise<{ items: ReturnListItem[]; tyWrite: false }> {
    const org = await this.requireOrg(uid);
    const items = await this.repo.listReturns(org.id);
    return { items, tyWrite: false };
  }

  async reviewReturn(
    uid: string,
    returnId: string,
    body: { decision?: string; note?: string },
  ): Promise<ReturnListItem> {
    const org = await this.requireOrg(uid);
    const item = await this.repo.getReturn(org.id, returnId);
    if (!item) {
      boom(ErrorCodes.NOT_FOUND, 'İade bulunamadı. Önce senkron.', HttpStatus.NOT_FOUND);
    }
    const decision = body.decision?.trim();
    if (decision !== 'approve' && decision !== 'reject') {
      boom(ErrorCodes.VALIDATION, 'decision approve veya reject olmalı.', HttpStatus.BAD_REQUEST);
    }
    const reviewed: ReturnListItem = {
      ...item,
      status: decision === 'approve' ? 'approved' : 'rejected',
      statusLabel: decision === 'approve' ? 'Onaylandı (stub)' : 'Reddedildi (stub)',
      reviewNote: body.note?.trim() || item.reviewNote,
      tyWrite: false,
    };
    await this.repo.saveReturn(reviewed);
    await this.op(org.id, 'return_review', `İade inceleme stub ${reviewed.id}`, 'ok', reviewed.id);
    return reviewed;
  }

  async listTeam(uid: string): Promise<{ members: OrgMember[]; invites: OrgInvite[] }> {
    const org = await this.requireOrg(uid);
    let members = await this.repo.listMembers(org.id);
    if (!members.some((m) => m.role === 'owner')) {
      members = [
        {
          organizationId: org.id,
          uid: org.ownerUid,
          email: '',
          role: 'owner',
          status: 'active',
        },
        ...members,
      ];
    }
    const invites = await this.repo.listInvites(org.id);
    return { members, invites };
  }

  async inviteMember(uid: string, emailRaw: string): Promise<OrgInvite> {
    const org = await this.requireOrg(uid);
    const email = emailRaw.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      boom(ErrorCodes.VALIDATION, 'Geçerli e-posta gerekli.', HttpStatus.BAD_REQUEST);
    }
    const existing = await this.repo.findInviteByEmail(org.id, email);
    if (existing) {
      return existing;
    }
    const invite: OrgInvite = {
      id: newId('inv'),
      organizationId: org.id,
      email,
      role: 'staff',
      status: 'pending',
      emailSent: false,
      createdAt: nowIso(),
    };
    await this.repo.saveInvite(invite);
    await this.op(org.id, 'team_invite', `Davet kaydı ${email} (e-posta gönderilmedi)`, 'ok', invite.id);
    return invite;
  }

  async opsReport(uid: string): Promise<OpsReport> {
    const org = await this.requireOrg(uid);
    const orders = await this.repo.listOrgOrders(org.id);
    const movements = await this.repo.listMovements(org.id);
    const count = (status: string) => orders.filter((o) => o.status === status).length;
    return {
      organizationId: org.id,
      orderCounts: {
        total: orders.length,
        created: count('created'),
        picking: count('picking'),
        shipped: count('shipped'),
        delivered: count('delivered'),
        cancelled: count('cancelled'),
      },
      stockDeltaPhysical: movements.reduce((sum, m) => sum + m.deltaPhysical, 0),
      note: 'Kâr hesaplanmaz; maliyet ve komisyon yok.',
    };
  }

  async saveListingDraft(
    uid: string,
    listingId: string,
    body: { title?: string; priceTry?: number },
  ): Promise<ListingDraft> {
    const org = await this.requireOrg(uid);
    const listing = await this.repo.getListing(org.id, listingId);
    if (!listing) {
      boom(ErrorCodes.NOT_FOUND, 'İlan yok. Önce POST /v1/shops/:id/sync.', HttpStatus.NOT_FOUND);
    }
    const prev = await this.repo.getListingDraft(org.id, listingId);
    const draft: ListingDraft = {
      listingId,
      organizationId: org.id,
      state: prev?.state === 'mock_live' ? 'mock_live' : 'draft',
      title: body.title?.trim() || prev?.title || listing.title,
      priceTry: Number.isFinite(body.priceTry) ? Number(body.priceTry) : (prev?.priceTry ?? listing.priceTry),
      mock: prev?.mock ?? true,
      liveTyWrite: false,
      updatedAt: nowIso(),
    };
    return this.repo.saveListingDraft(draft);
  }

  async publishListing(uid: string, listingId: string, mockFlag: boolean): Promise<ListingDraft> {
    const org = await this.requireOrg(uid);
    const listing = await this.repo.getListing(org.id, listingId);
    if (!listing) {
      boom(ErrorCodes.NOT_FOUND, 'İlan yok. Önce senkron.', HttpStatus.NOT_FOUND);
    }
    const prev =
      (await this.repo.getListingDraft(org.id, listingId)) ??
      ({
        listingId,
        organizationId: org.id,
        state: 'draft' as const,
        title: listing.title,
        priceTry: listing.priceTry,
        mock: true,
        liveTyWrite: false as const,
        updatedAt: nowIso(),
      } satisfies ListingDraft);
    const next: ListingDraft = {
      ...prev,
      state: mockFlag ? 'mock_live' : 'draft',
      mock: mockFlag,
      liveTyWrite: false,
      updatedAt: nowIso(),
    };
    const saved = await this.repo.saveListingDraft(next);
    await this.op(
      org.id,
      'listing_publish',
      mockFlag ? `Mock yayın ${listingId} (canlı TY yazılmadı)` : `Taslak kaldı ${listingId} (canlı TY yok)`,
      'ok',
      listingId,
    );
    return saved;
  }

  async getListingDraft(uid: string, listingId: string): Promise<ListingDraft> {
    const org = await this.requireOrg(uid);
    const existing = await this.repo.getListingDraft(org.id, listingId);
    if (existing) {
      return existing;
    }
    const listing = await this.repo.getListing(org.id, listingId);
    if (!listing) {
      boom(ErrorCodes.NOT_FOUND, 'İlan yok.', HttpStatus.NOT_FOUND);
    }
    return {
      listingId,
      organizationId: org.id,
      state: 'draft',
      title: listing.title,
      priceTry: listing.priceTry,
      mock: true,
      liveTyWrite: false,
      updatedAt: listing.id ? nowIso() : nowIso(),
    };
  }
}
