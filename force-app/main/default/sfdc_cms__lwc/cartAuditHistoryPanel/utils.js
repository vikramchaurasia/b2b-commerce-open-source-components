import LABELS from './labels';
import { DEFAULT_GLYPH, DEFAULT_ICON_VARIANT, OPERATION_GLYPH, OPERATION_ICON_VARIANT, CART_OPERATION_TYPES, RAW_OPERATION_TYPE_MAP } from './constants';
function classifyByStatus(status, successType, failedType) {
  return status === 'Completed' ? successType : failedType;
}
function classifyExport(entry) {
  const itemCount = entry.operationSummary?.itemCount;
  if (typeof itemCount === 'number' && itemCount <= 0) {
    return CART_OPERATION_TYPES.EXPORT_FAILED;
  }
  return classifyByStatus(entry.status, CART_OPERATION_TYPES.EXPORT_FULL, CART_OPERATION_TYPES.EXPORT_FAILED);
}
function classifyImport(entry) {
  const imported = entry.operationSummary?.itemCount;
  const total = entry.operationSummary?.totalCount;
  if (typeof imported === 'number' && typeof total === 'number' && total > 0) {
    if (imported <= 0) {
      return CART_OPERATION_TYPES.IMPORT_FAILED;
    }
    if (imported < total) {
      return CART_OPERATION_TYPES.IMPORT_PARTIAL;
    }
    return CART_OPERATION_TYPES.IMPORT_FULL;
  }
  return classifyByStatus(entry.status, CART_OPERATION_TYPES.IMPORT_FULL, CART_OPERATION_TYPES.IMPORT_FAILED);
}
export function classifyOperation(entry) {
  const mapped = entry.operationType ? RAW_OPERATION_TYPE_MAP[entry.operationType] : undefined;
  if (!mapped) {
    return undefined;
  }
  if (mapped === CART_OPERATION_TYPES.UPDATE_ITEM_QUANTITY) {
    const oldQuantity = entry.operationSummary?.oldQuantity;
    const newQuantity = entry.operationSummary?.newQuantity;
    if (typeof oldQuantity === 'number' && typeof newQuantity === 'number') {
      if (newQuantity > oldQuantity) {
        return CART_OPERATION_TYPES.INCREASE_QUANTITY;
      }
      if (newQuantity < oldQuantity) {
        return CART_OPERATION_TYPES.DECREASE_QUANTITY;
      }
    }
    return CART_OPERATION_TYPES.UPDATE_CART;
  }
  if (mapped === CART_OPERATION_TYPES.EXPORT) {
    return classifyExport(entry);
  }
  if (mapped === CART_OPERATION_TYPES.IMPORT) {
    return classifyImport(entry);
  }
  return mapped;
}
function formatTitle(template, value) {
  const hasValue = value != null && String(value).length > 0;
  const replacement = hasValue ? String(value) : '';
  const interpolated = template.replace(/\{0\}/g, () => replacement);
  return hasValue ? interpolated.trim() : interpolated.replace(/\s+/g, ' ').trim();
}
function formatTitle2(template, first, second) {
  return template.replace(/\{0\}/g, () => String(first)).replace(/\{1\}/g, () => String(second)).trim();
}
function composeTitle(kind, entry) {
  const productName = entry.operationSummary?.productName ?? undefined;
  const sharedCount = entry.operationSummary?.sharedCount ?? undefined;
  const accessRevokedCount = entry.operationSummary?.accessRevokedCount ?? undefined;
  switch (kind) {
    case CART_OPERATION_TYPES.ADD_ITEM:
      return formatTitle(LABELS.titleAddItem, productName);
    case CART_OPERATION_TYPES.REMOVE_ITEM:
      return formatTitle(LABELS.titleRemoveItem, productName);
    case CART_OPERATION_TYPES.INCREASE_QUANTITY:
      return formatTitle(LABELS.titleIncreaseQuantity, productName);
    case CART_OPERATION_TYPES.DECREASE_QUANTITY:
      return formatTitle(LABELS.titleDecreaseQuantity, productName);
    case CART_OPERATION_TYPES.APPLY_COUPON:
      return formatTitle(LABELS.titleApplyCoupon, undefined);
    case CART_OPERATION_TYPES.REMOVE_COUPON:
      return formatTitle(LABELS.titleRemoveCoupon, undefined);
    case CART_OPERATION_TYPES.SHARE:
      return sharedCount === 1 ? LABELS.titleShareOne : formatTitle(LABELS.titleShare, sharedCount);
    case CART_OPERATION_TYPES.REVOKE:
      return accessRevokedCount === 1 ? LABELS.titleRevokeOne : formatTitle(LABELS.titleRevoke, accessRevokedCount);
    case CART_OPERATION_TYPES.CHECKOUT:
      return LABELS.titleCheckout;
    case CART_OPERATION_TYPES.CONFIGURE_CART:
      return formatTitle(LABELS.titleConfigurableProductUpdated, productName);
    case CART_OPERATION_TYPES.EXPORT_FULL:
      return formatTitle(LABELS.titleExportFull, entry.operationSummary?.itemCount ?? undefined);
    case CART_OPERATION_TYPES.EXPORT_FAILED:
      return LABELS.titleExportFailed;
    case CART_OPERATION_TYPES.IMPORT_FULL:
      return formatTitle(LABELS.titleImportFull, entry.operationSummary?.itemCount ?? undefined);
    case CART_OPERATION_TYPES.IMPORT_PARTIAL:
      {
        const summary = entry.operationSummary;
        return formatTitle2(LABELS.titleImportPartial, summary.itemCount, summary.totalCount);
      }
    case CART_OPERATION_TYPES.IMPORT_FAILED:
      return LABELS.titleImportFailed;
    case CART_OPERATION_TYPES.UPDATE_CART:
    default:
      return LABELS.titleGeneric;
  }
}
export function toRows(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries.map((entry, index) => {
    const kind = classifyOperation(entry);
    const glyph = kind ? OPERATION_GLYPH[kind] : DEFAULT_GLYPH;
    const iconVariant = kind ? OPERATION_ICON_VARIANT[kind] : DEFAULT_ICON_VARIANT;
    const previous = entry.operationSummary?.oldQuantity ?? undefined;
    const next = entry.operationSummary?.newQuantity ?? undefined;
    const isQuantityChange = (kind === CART_OPERATION_TYPES.INCREASE_QUANTITY || kind === CART_OPERATION_TYPES.DECREASE_QUANTITY) && typeof previous === 'number' && typeof next === 'number';
    const isCoupon = kind === CART_OPERATION_TYPES.APPLY_COUPON || kind === CART_OPERATION_TYPES.REMOVE_COUPON;
    const couponCode = entry.operationSummary?.couponCode?.trim();
    const hasCouponCode = isCoupon && Boolean(couponCode);
    const email = entry.initiator?.email?.trim();
    const name = entry.initiator?.name?.trim();
    return {
      key: entry.id || `${kind ?? 'unknown'}-${index}`,
      description: composeTitle(kind, entry),
      glyphClass: `cart-audit-history-panel__glyph cart-audit-history-panel__glyph_${glyph}`,
      iconVariantClass: `cart-audit-history-panel__icon cart-audit-history-panel__icon_${iconVariant}`,
      isQuantityChange,
      previousQuantity: isQuantityChange ? previous : undefined,
      newQuantity: isQuantityChange ? next : undefined,
      hasCouponCode,
      couponCode: hasCouponCode ? couponCode : '',
      performedByName: name || LABELS.unknownActorName,
      hasEmail: Boolean(email),
      displayEmail: email ?? '',
      actionDate: entry.occurredAt ?? ''
    };
  });
}