import { mapApprovedProducts, mapShipmentPackages } from './trendyol-parse';

describe('trendyol-parse', () => {
  it('maps V2 approved products from variants', () => {
    const listings = mapApprovedProducts({
      content: [
        {
          title: 'Açık Gri T-',
          images: [{ url: 'https://cdn.example/a.jpg' }],
          variants: [
            {
              barcode: '12613876842A60',
              stockCode: 'STK-stokum-1',
              onSale: true,
              archived: false,
              stock: { quantity: 4 },
              price: { salePrice: 222 },
            },
            {
              barcode: '12613876842A61',
              onSale: false,
              stock: { quantity: 0 },
              price: { salePrice: 222 },
            },
          ],
        },
      ],
    });
    expect(listings).toHaveLength(2);
    expect(listings[0]).toMatchObject({
      id: 'ty-12613876842A60',
      sku: 'STK-stokum-1',
      barcode: '12613876842A60',
      marketplaceStock: 4,
      priceTry: 222,
      status: 'active',
      imageUrl: 'https://cdn.example/a.jpg',
    });
    expect(listings[1].status).toBe('passive');
  });

  it('reads string image arrays and variant imageUrl', () => {
    const listings = mapApprovedProducts({
      content: [
        {
          title: 'Clip',
          imageUrl: 'https://cdn.example/parent.jpg',
          variants: [
            {
              barcode: 'B1',
              onSale: true,
              images: ['https://cdn.example/variant.jpg'],
              stock: { quantity: 1 },
              price: { salePrice: 10 },
            },
          ],
        },
      ],
    });
    expect(listings[0].imageUrl).toBe('https://cdn.example/variant.jpg');
    expect(listings[0].imageUrls).toContain('https://cdn.example/parent.jpg');
  });

  it('maps v2 order packages without treating package as order number', () => {
    const orders = mapShipmentPackages({
      content: [
        {
          shipmentPackageId: 3330111111,
          orderNumber: '10654411111',
          customerFirstName: 'John',
          customerLastName: 'Doe',
          status: 'Created',
          packageTotalPrice: 498.9,
          orderDate: 1762253333685,
          agreedDeliveryDate: 1762376340000,
          lines: [{ barcode: '8683772071724', quantity: 2, lineId: 1 }],
        },
      ],
    });
    expect(orders).toHaveLength(1);
    expect(orders[0].id).toBe('ty-3330111111');
    expect(orders[0].orderNumber).toBe('10654411111');
    expect(orders[0].customerName).toBe('John D.');
    expect(orders[0].itemCount).toBe(2);
    expect(orders[0].lines[0].listingId).toBe('ty-8683772071724');
    expect(orders[0].status).toBe('created');
    expect(orders[0].productTitle).toContain('8683772071724');
  });

  it('does not treat shipped packages as to-prepare and estimates commission', () => {
    const orders = mapShipmentPackages({
      content: [
        {
          shipmentPackageId: 2,
          orderNumber: 'TY-9',
          status: 'Shipped',
          packageGrossAmount: 200,
          packageSellerDiscount: 20,
          packageTyDiscount: 0,
          packageTotalPrice: 180,
          cargoProviderName: 'Trendyol Express',
          agreedDeliveryDate: Date.now() - 86_400_000,
          orderDate: Date.now() - 2 * 86_400_000,
          customerFirstName: 'A',
          customerLastName: 'B',
          lines: [
            {
              barcode: 'B1',
              productName: 'Klip',
              quantity: 2,
              lineGrossAmount: 100,
              lineSellerDiscount: 20,
              lineTyDiscount: 0,
              lineUnitPrice: 90,
              commission: 15,
              lineSgrFee: 1,
              vatRate: 20,
            },
          ],
        },
      ],
    });
    expect(orders[0].status).toBe('shipped');
    expect(orders[0].statusLabel).toBe('Kargoda');
    expect(orders[0].cargoWarning).toBe(false);
    expect(orders[0].money).toMatchObject({
      customerTry: 180,
      sellerDiscountTry: 20,
      commissionRate: 15,
      cargoProvider: 'Trendyol Express',
      earningsEstimated: true,
      commissionSource: 'package_rate',
      cargoFeeTry: null,
      serviceFeeTry: null,
      storeFeeTry: null,
    });
    expect(orders[0].money?.commissionTry).toBe(27);
    expect(orders[0].money?.sgrFeeTry).toBe(2);
    expect(orders[0].money?.estimatedEarningsTry).toBe(151);
  });

  it('keeps packages when orderNumber is missing', () => {
    const orders = mapShipmentPackages({
      content: [{ shipmentPackageId: 9, status: 'Created', lines: [] }],
    });
    expect(orders[0].id).toBe('ty-9');
    expect(orders[0].orderNumber).toBe('9');
  });

  it('uses line item status when the package is still Created', () => {
    const orders = mapShipmentPackages({
      content: [
        {
          shipmentPackageId: 3,
          orderNumber: 'TY-10',
          status: 'Created',
          packageTotalPrice: 10,
          lines: [{ barcode: 'B', quantity: 1, orderLineItemStatusName: 'Delivered' }],
        },
      ],
    });
    expect(orders[0].status).toBe('delivered');
    expect(orders[0].statusLabel).toBe('Teslim');
    expect(orders[0].status).not.toBe('shipped');
  });

  it('reads productImages on shipment lines', () => {
    const orders = mapShipmentPackages({
      content: [
        {
          shipmentPackageId: 4,
          orderNumber: 'TY-11',
          status: 'Delivered',
          packageTotalPrice: 10,
          lines: [
            {
              barcode: 'B2',
              quantity: 1,
              productName: 'Takoz',
              productImages: [{ url: 'https://cdn.example/line.jpg' }],
            },
          ],
        },
      ],
    });
    expect(orders[0].status).toBe('delivered');
    expect(orders[0].imageUrl).toBe('https://cdn.example/line.jpg');
    expect(orders[0].lines[0].imageUrl).toBe('https://cdn.example/line.jpg');
  });
});
