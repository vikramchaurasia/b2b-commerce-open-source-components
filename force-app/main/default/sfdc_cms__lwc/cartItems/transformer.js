const DEFAULT_MEDIA = {
  alternateText: null,
  contentVersionId: null,
  id: null,
  mediaType: null,
  sortOrder: 0,
  thumbnailUrl: null,
  title: null,
  url: null
};
export const defaultSkuLabel = 'SKU';
export const defaultQuantityLabel = 'Qty';
const quantityFieldName = 'Quantity';
const skuFieldName = 'SKU';
function normalizeSubscriptionTermUnit(subscriptionTermUnit) {
  return subscriptionTermUnit === 'Monthly' ? 'Months' : subscriptionTermUnit;
}
function getSubscriptionPriceExists(subscriptionPrice) {
  return Boolean(subscriptionPrice && subscriptionPrice > 0);
}
export function transformFieldsToEntityFields(fields) {
  if (!fields) {
    return undefined;
  }
  return Object.entries(fields).map(([key, value]) => ({
    dataName: key,
    label: key,
    text: value != null ? String(value) : null,
    type: typeof value === 'number' ? 'CURRENCY' : 'STRING'
  }));
}
export function createAdjustmentsFromCartItem(cartItem, currencyIsoCode) {
  const adjustments = [];
  if (cartItem.totalAdjustmentAmount && parseFloat(cartItem.totalAdjustmentAmount) !== 0) {
    adjustments.push({
      id: 0,
      name: cartItem.promotionDisplayName || 'Adjustment',
      type: 'Promotion',
      targetType: null,
      discountAmount: cartItem.totalAdjustmentAmount,
      currencyIsoCode: cartItem.currencyIsoCode || currencyIsoCode || '',
      displayName: cartItem.promotionDisplayName
    });
  }
  return adjustments;
}
function transformVariantsArray(variationAttributes) {
  if (!variationAttributes) {
    return [];
  }
  return Object.values(variationAttributes).map(attr => ({
    name: attr.label || '',
    value: attr.value || ''
  }));
}
export function createFieldsArray(quantity, sku, modalLabels) {
  const quantityField = {
    dataName: quantityFieldName,
    label: modalLabels?.quantityLabel || defaultQuantityLabel,
    text: quantity != null ? quantity.toString() : '0',
    type: 'DOUBLE'
  };
  const fields = [quantityField];
  if (sku != null && sku.trim() !== '') {
    const skuField = {
      dataName: skuFieldName,
      label: modalLabels?.skuLabel || defaultSkuLabel,
      text: sku,
      type: 'STRING'
    };
    fields.push(skuField);
  }
  return fields;
}
export function transformCartItemToOrderItem(cartItem, currencyIsoCode, modalLabels, isParentAssetizable = false) {
  const thumbnail = cartItem.productDetails?.thumbnailImage;
  const variants = transformVariantsArray(cartItem.productDetails?.variationAttributes);
  const fields = createFieldsArray(cartItem.quantity, cartItem.productDetails?.sku, modalLabels);
  const firstPayment = parseFloat(cartItem.firstPymtTotalPrice || '0');
  const firstPaymentExists = getSubscriptionPriceExists(firstPayment);
  return {
    orderItemSummaryId: cartItem.cartItemId || '',
    name: cartItem.name || null,
    totalPrice: firstPaymentExists ? firstPayment : parseFloat(cartItem.totalPrice || '0'),
    productId: cartItem.productId || '',
    media: thumbnail || DEFAULT_MEDIA,
    fields: fields,
    isValid: true,
    variants: variants,
    adjustments: createAdjustmentsFromCartItem(cartItem, currencyIsoCode),
    id: cartItem.cartItemId,
    associatedOrderItems: [],
    itemClass: cartItem.productClass,
    productSellingModel: cartItem.productSellingModelId ? {
      id: cartItem.productSellingModelId,
      name: cartItem.name || '',
      sellingModelType: cartItem.sellingModelType || null,
      pricingTerm: 1,
      pricingTermUnit: normalizeSubscriptionTermUnit(cartItem.billingFrequency) || null
    } : null,
    processExceptions: [],
    subscriptionTerm: cartItem.subscriptionTerm || null,
    assetId: null,
    isAssetizable: isParentAssetizable,
    firstPaymentPriceExists: firstPaymentExists,
    errorCode: null,
    errorMessage: null,
    canViewProduct: true,
    dynamicAttributes: cartItem.productDetails?.dynamicAttributes || null
  };
}
export function transformCartItemWithDetailsToOrderItem(cartItem, currencyIsoCode, associatedOrderItems = [], modalLabels) {
  const thumbnail = cartItem?.ProductDetails?.thumbnailImage;
  const variants = transformVariantsArray(cartItem?.ProductDetails?.variationAttributes);
  const fields = createFieldsArray(cartItem?.quantity, cartItem?.ProductDetails?.sku, modalLabels);
  const cartItemForAdjustment = {
    totalAdjustmentAmount: cartItem?.adjustmentAmount?.toString(),
    promotionDisplayName: cartItem?.promotionDisplayName,
    currencyIsoCode: currencyIsoCode
  };
  const firstPayment = parseFloat(cartItem?.firstPymtPrice?.toString() || '0');
  const firstPaymentExists = getSubscriptionPriceExists(cartItem?.firstPymtPrice);
  return {
    orderItemSummaryId: cartItem?.id || '',
    name: cartItem?.name || null,
    totalPrice: firstPaymentExists ? firstPayment : parseFloat(cartItem?.price?.toString() || '0'),
    productId: cartItem?.ProductDetails?.productId || '',
    media: thumbnail || DEFAULT_MEDIA,
    fields: fields,
    isValid: true,
    variants: variants,
    adjustments: createAdjustmentsFromCartItem(cartItemForAdjustment, currencyIsoCode),
    id: cartItem?.id,
    associatedOrderItems: associatedOrderItems,
    itemClass: cartItem?.productClass || null,
    productSellingModel: cartItem?.subscriptionId ? {
      id: cartItem.subscriptionId,
      name: cartItem.name || '',
      sellingModelType: cartItem.subscriptionType || null,
      pricingTerm: 1,
      pricingTermUnit: normalizeSubscriptionTermUnit(cartItem.subscriptionTermUnit) || null
    } : null,
    processExceptions: [],
    subscriptionTerm: cartItem?.subscriptionTerm || null,
    assetId: null,
    isAssetizable: cartItem?.ProductDetails?.fields?.IsAssetizable === 'true',
    firstPaymentPriceExists: firstPaymentExists,
    errorCode: null,
    errorMessage: null,
    canViewProduct: true,
    dynamicAttributes: cartItem?.ProductDetails?.dynamicAttributes || null
  };
}
export function convertCartItemToOrderItem(cartItem, childItemsData, currencyIsoCode, modalLabels) {
  const childItems = childItemsData?.childCartItems || [];
  const isParentAssetizable = cartItem?.ProductDetails?.fields?.IsAssetizable === 'true';
  const associatedOrderItems = childItems.map(childSummary => {
    return transformCartItemToOrderItem(childSummary.cartItem, currencyIsoCode, modalLabels, isParentAssetizable);
  });
  return transformCartItemWithDetailsToOrderItem(cartItem, currencyIsoCode, associatedOrderItems, modalLabels);
}