import { asPreviewList, paginate, type OrderListItem, type PageQuery, type PreviewList, type ProductListItem } from '@magazakit/contracts';
import type { TrendyolReadAdapter } from './trendyol-read.adapter';

const PRODUCTS: ProductListItem[] = [
  {
    id: 'ty-p-1001',
    sku: 'MGM-TSHIRT-S',
    barcode: '8680001001001',
    title: 'Grafit basic tişört S',
    channel: 'trendyol',
    priceTry: 249.9,
    physicalStock: 24,
    reservedStock: 4,
    sellableStock: 20,
    critical: false,
    status: 'active',
    statusLabel: 'Aktif',
    imageUrl: null,
  },
  {
    id: 'ty-p-1002',
    sku: 'MGM-HOODIE-M',
    barcode: '8680001001002',
    title: 'Lime hoodie M',
    channel: 'trendyol',
    priceTry: 899.9,
    physicalStock: 8,
    reservedStock: 2,
    sellableStock: 6,
    critical: false,
    status: 'active',
    statusLabel: 'Aktif',
    imageUrl: null,
  },
  {
    id: 'ty-p-1003',
    sku: 'MGM-SOCK-3',
    barcode: '8680001001003',
    title: '3’lü çorap seti',
    channel: 'trendyol',
    priceTry: 79.9,
    physicalStock: 2,
    reservedStock: 0,
    sellableStock: 2,
    critical: true,
    status: 'passive',
    statusLabel: 'Pasif',
    imageUrl: null,
  },
];

const ORDERS: OrderListItem[] = [
  {
    id: 'ty-o-5001',
    orderNumber: 'TY-1048291',
    channel: 'trendyol',
    customerName: 'A. Yılmaz',
    status: 'picking',
    statusLabel: 'Hazırlanacak',
    itemCount: 2,
    totalTry: 1149.8,
    cargoDeadlineAt: '2026-09-18T16:00:00.000Z',
    cargoWarning: true,
    createdAt: '2026-09-18T08:12:00.000Z',
  },
  {
    id: 'ty-o-5002',
    orderNumber: 'TY-1048302',
    channel: 'trendyol',
    customerName: 'M. Kaya',
    status: 'shipped',
    statusLabel: 'Kargoda',
    itemCount: 1,
    totalTry: 249.9,
    cargoDeadlineAt: null,
    cargoWarning: false,
    createdAt: '2026-09-17T19:40:00.000Z',
  },
  {
    id: 'ty-o-5003',
    orderNumber: 'TY-1048310',
    channel: 'trendyol',
    customerName: 'S. Demir',
    status: 'created',
    statusLabel: 'Yeni',
    itemCount: 3,
    totalTry: 429.7,
    cargoDeadlineAt: '2026-09-18T18:00:00.000Z',
    cargoWarning: true,
    createdAt: '2026-09-18T11:02:00.000Z',
  },
];

export class MockTrendyolReadAdapter implements TrendyolReadAdapter {
  readonly mock = true;

  async listProducts(query: PageQuery): Promise<PreviewList<ProductListItem>> {
    return asPreviewList(paginate(PRODUCTS, query), true);
  }

  async listOrders(query: PageQuery): Promise<PreviewList<OrderListItem>> {
    return asPreviewList(paginate(ORDERS, query), true);
  }
}
