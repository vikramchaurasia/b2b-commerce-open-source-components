export const SAMPLE_CART_ITEMS = [{
  id: '0a9xx000000004rAAA',
  cartId: '0a6xx00000007pVAAR',
  name: 'Prod1',
  type: 'Product',
  parentCartItemId: null,
  productClass: 'Simple',
  childProductCount: 0,
  quantity: 1,
  salesPrice: 10,
  amount: 10,
  price: 10,
  ProductDetails: {
    name: 'Prod1',
    productUrlName: 'product-url',
    fields: {
      Name: 'Prod1',
      ProductClass: 'Simple',
      ProductPurpose: 'Sell'
    },
    sku: '',
    productId: '01txx0000006i8uAAA',
    variationAttributes: {}
  },
  Messages: []
}];
export const SAMPLE_GIFT_WRAPS = {
  productIds: ['01txx0000006iDl'],
  total: 1
};
export const SAMPLE_CHECKOUT_DETAILS = {
  checkoutStatus: 200,
  checkoutId: '2z9xx000000004rAAA',
  cartSummary: {
    cartId: '0a6xx000000004rAAA',
    currencyIsoCode: 'USD',
    grandTotalAmount: '10.00',
    totalProductAmount: '10.0',
    uniqueProductCount: 1
  },
  deliveryGroups: {
    items: [{
      id: '0a7xx000000004rAAA',
      isDefault: true,
      name: 'Shipment 1',
      totalCartItemCount: '1',
      totalCartItemQuantity: '1'
    }]
  },
  errors: [],
  notifications: []
};