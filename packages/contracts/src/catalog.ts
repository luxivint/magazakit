export type Channel = 'trendyol';

export type ProductStatus = 'active' | 'passive';

export type ProductListItem = {
  id: string;
  sku: string;
  barcode: string;
  title: string;
  channel: Channel;
  priceTry: number;
  physicalStock: number;
  reservedStock: number;
  sellableStock: number;
  critical: boolean;
  status: ProductStatus;
  statusLabel: string;
  imageUrl: string | null;
};

export type OrderStatus = 'created' | 'picking' | 'shipped' | 'delivered' | 'cancelled';

export type OrderListItem = {
  id: string;
  orderNumber: string;
  channel: Channel;
  customerName: string;
  status: OrderStatus;
  statusLabel: string;
  itemCount: number;
  totalTry: number;
  cargoDeadlineAt: string | null;
  cargoWarning: boolean;
  createdAt: string;
};
