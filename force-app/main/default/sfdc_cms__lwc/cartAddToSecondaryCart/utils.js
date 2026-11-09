import Toast from 'site/commonToast';
import { INSUFFICIENT_ACCESS, MAX_NAME_LENGTH, TRAILING_DOTS } from './constants';
export function getTruncatedName(name) {
  if (name === undefined || name.length <= MAX_NAME_LENGTH) {
    return name;
  }
  return name.substring(0, MAX_NAME_LENGTH - TRAILING_DOTS.length) + TRAILING_DOTS;
}
export function getTotalProductCount(totalProductCount) {
  if (typeof totalProductCount === 'number') {
    return Number.isFinite(totalProductCount) && totalProductCount >= 0 ? Math.trunc(totalProductCount) : 0;
  }
  const parsedCount = Number.parseInt(totalProductCount ?? '0', 10);
  return Number.isNaN(parsedCount) || parsedCount < 0 ? 0 : parsedCount;
}
export function getCartCountByType(countType, totalProductCount, uniqueProductCount) {
  if (countType === 'UniqueProductCount') {
    return String(getTotalProductCount(uniqueProductCount));
  }
  return String(getTotalProductCount(totalProductCount));
}
export function getCartMenuLabel(cartName, count, itemsLabel, showItemCount = true) {
  if (!cartName) {
    return cartName;
  }
  if (!showItemCount) {
    return cartName;
  }
  const itemCount = getTotalProductCount(count);
  return `${cartName} (${itemCount} ${itemsLabel})`;
}
export function isSecondaryOrSharedCart(cart, currentUserId) {
  const isSharedWithUser = Boolean(currentUserId && cart.ownerId && cart.ownerId.slice(0, 15) !== currentUserId);
  return cart.isSecondary === true || isSharedWithUser;
}
export function showAddToSecondaryCartSuccessToast(label, target) {
  Toast.show({
    label,
    variant: 'success'
  }, target);
}
export function showSecondaryCartErrorToast(label, target) {
  Toast.show({
    label,
    variant: 'error'
  }, target);
}
export function showAddToSecondaryCartErrorToast(label, target) {
  showSecondaryCartErrorToast(label, target);
}
export function getApiErrorMessage(error) {
  const errors = error?.errors;
  const firstError = Array.isArray(errors) ? errors[0] : undefined;
  if (typeof firstError !== 'object' || firstError === null) {
    return undefined;
  }
  const {
    type,
    message
  } = firstError;
  return type === INSUFFICIENT_ACCESS && typeof message === 'string' ? message : undefined;
}