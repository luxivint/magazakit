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

  it('keeps packages when orderNumber is missing', () => {
    const orders = mapShipmentPackages({
      content: [{ shipmentPackageId: 9, status: 'Created', lines: [] }],
    });
    expect(orders[0].id).toBe('ty-9');
    expect(orders[0].orderNumber).toBe('9');
  });
});
