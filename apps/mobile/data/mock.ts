import type { Channel } from '@/lib/api';

export type OrderStatus = 'hazirlanacak' | 'kargoda' | 'tamamlandi' | 'iade';

export type OrderLineView = {
  listingId: string;
  qty: number;
  title?: string;
  imageUrl?: string | null;
  unitPriceTry?: number;
  commissionRate?: number;
};

export type Order = {
  id: string;
  channel: Channel;
  channelLabel: string;
  number: string;
  product: string;
  customer: string;
  qty: number;
  amount: number;
  time: string;
  createdAt: string;
  due: string;
  dueTone: 'warn' | 'idle';
  status: OrderStatus;
  statusLabel: string;
  thumb: ProductThumbKind;
  imageUrl?: string | null;
  lines: OrderLineView[];
  reserved?: boolean;
  packed?: boolean;
  labeled?: boolean;
  shipped?: boolean;
  money?: {
    grossTry: number;
    sellerDiscountTry: number;
    tyDiscountTry: number;
    customerTry: number;
    commissionRate: number | null;
    commissionTry: number | null;
    commissionSource?: 'package_rate' | 'settlement' | 'invoice' | 'none';
    sgrFeeTry: number;
    cargoFeeTry?: number | null;
    cargoFeeLabel?: string | null;
    serviceFeeTry?: number | null;
    storeFeeTry?: number | null;
    stoppageTry?: number | null;
    sellerRevenueTry?: number | null;
    cancelTry?: number;
    returnTry?: number;
    returnCargoTry?: number;
    intlReturnOpTry?: number;
    intlServiceTry?: number;
    penaltyTry?: number;
    paymentMethod?: string | null;
    cargoFeeRate?: number | null;
    financeLoaded?: boolean;
    estimatedEarningsTry: number | null;
    earningsEstimated: boolean;
    cargoProvider: string | null;
    cargoTrackingNumber?: string | null;
    cargoDeci?: number | null;
    cargoPayer?: 'seller' | 'marketplace' | null;
  };
};

export type ProductThumbKind = 'mug' | 'towel' | 'thermos' | 'lamp';

export type Product = {
  id: string;
  name: string;
  sku: string;
  listingSku: string;
  barcode: string;
  price: number;
  physical: number;
  reserved: number;
  sellable: number;
  stock: number;
  listing: string;
  channels: { trendyol: boolean };
  thumb: ProductThumbKind;
  critical: boolean;
  mapped: boolean;
  marketplaceStock: number;
  listingId: string;
  channel?: Channel;
  imageUrl: string | null;
  imageUrls: string[];
  statusLabel?: string;
};

export const STORE_NAME = 'Mağazam';

export const summary = {
  sales: 24850,
  salesDelta: 12.4,
  orderCount: 32,
  toPrepare: 12,
  inTransit: 18,
  returns: 2,
  shippingDue: 4,
  lastSync: '14:32',
  connectedStores: 1,
};

export const orders: Order[] = [
  {
    id: 'ty-10482',
    channel: 'trendyol',
    channelLabel: 'Trendyol',
    number: '#TY-10482',
    product: 'Seramik kupa seti',
    customer: 'Ayşe Yılmaz',
    qty: 2,
    amount: 899.9,
    time: '13:42',
    createdAt: '2026-09-18T10:42:00.000Z',
    due: "Bugün 17:00'ye kadar",
    dueTone: 'warn',
    status: 'hazirlanacak',
    statusLabel: 'Hazırlanacak',
    thumb: 'mug',
    lines: [],
  },
  {
    id: 'ty-10479',
    channel: 'trendyol',
    channelLabel: 'Trendyol',
    number: '#TY-10479',
    product: 'Çelik termos',
    customer: 'Elif Demir',
    qty: 1,
    amount: 649,
    time: '11:56',
    createdAt: '2026-09-18T08:56:00.000Z',
    due: "Yarın 17:00'ye kadar",
    dueTone: 'idle',
    status: 'hazirlanacak',
    statusLabel: 'Hazırlanacak',
    thumb: 'thermos',
    lines: [],
  },
  {
    id: 'ty-10470',
    channel: 'trendyol',
    channelLabel: 'Trendyol',
    number: '#TY-10470',
    product: 'Masa lambası',
    customer: 'Can Yücel',
    qty: 1,
    amount: 1290,
    time: '10:18',
    createdAt: '2026-09-18T07:18:00.000Z',
    due: 'Kargoya verildi',
    dueTone: 'idle',
    status: 'kargoda',
    statusLabel: 'Kargoda',
    thumb: 'lamp',
    lines: [],
  },
];

export const recentOrders = orders.slice(0, 2).map((order) => ({
  ...order,
  statusLabel:
    order.status === 'tamamlandi' ? 'Teslim' : order.status === 'kargoda' ? 'Kargoda' : 'Hazırlanacak',
}));

export const products: Product[] = [
  {
    id: 'kupa',
    name: 'Seramik kupa seti',
    sku: 'KUPA-224',
    listingSku: 'KUPA-224',
    barcode: '',
    price: 899.9,
    physical: 24,
    reserved: 0,
    sellable: 24,
    stock: 24,
    listing: 'Bekleyen fiyat',
    channels: { trendyol: true },
    thumb: 'mug',
    critical: false,
    mapped: false,
    marketplaceStock: 24,
    listingId: 'kupa',
    imageUrl: null,
    imageUrls: [],
  },
  {
    id: 'havlu',
    name: 'Pamuklu havlu',
    sku: 'HVL-012',
    listingSku: 'HVL-012',
    barcode: '',
    price: 449.9,
    physical: 3,
    reserved: 0,
    sellable: 3,
    stock: 3,
    listing: 'Bekleyen fiyat',
    channels: { trendyol: true },
    thumb: 'towel',
    critical: true,
    mapped: false,
    marketplaceStock: 3,
    listingId: 'havlu',
    imageUrl: null,
    imageUrls: [],
  },
  {
    id: 'termos',
    name: 'Çelik termos',
    sku: 'TRM-008',
    listingSku: 'TRM-008',
    barcode: '',
    price: 649,
    physical: 18,
    reserved: 0,
    sellable: 18,
    stock: 18,
    listing: 'Bekleyen fiyat',
    channels: { trendyol: true },
    thumb: 'thermos',
    critical: false,
    mapped: false,
    marketplaceStock: 18,
    listingId: 'termos',
    imageUrl: null,
    imageUrls: [],
  },
  {
    id: 'lamba',
    name: 'Masa lambası',
    sku: 'LMB-016',
    listingSku: 'LMB-016',
    barcode: '',
    price: 1290,
    physical: 12,
    reserved: 0,
    sellable: 12,
    stock: 12,
    listing: 'Bekleyen fiyat',
    channels: { trendyol: true },
    thumb: 'lamp',
    critical: false,
    mapped: false,
    marketplaceStock: 12,
    listingId: 'lamba',
    imageUrl: null,
    imageUrls: [],
  },
];

export const sparkline = [18, 22, 19, 28, 24, 31, 27, 36, 33, 41, 38, 46];
