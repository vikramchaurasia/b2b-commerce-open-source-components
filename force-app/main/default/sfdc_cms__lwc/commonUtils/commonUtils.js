export const CART_OPERATION_TYPE = {
  CLEAR_CART: 'ClearCart',
  IMPORT_CART: 'ImportCart',
  EXPORT_CART: 'ExportCart'
};
export const CART_OPERATION_STATUS = {
  IN_PROGRESS: 'InProgress',
  INITIATED: 'Initiated',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled'
};
function isActiveAsyncStatus(status) {
  return status === CART_OPERATION_STATUS.IN_PROGRESS || status === CART_OPERATION_STATUS.INITIATED;
}
function isCartOperationCompleted(status) {
  return status === CART_OPERATION_STATUS.COMPLETED;
}
function isCartOperationFailed(status) {
  return status === CART_OPERATION_STATUS.FAILED;
}
function isCartOperationCancelled(status) {
  return status === CART_OPERATION_STATUS.CANCELLED;
}
function isCartOperationFinished(status) {
  return isCartOperationCompleted(status) || isCartOperationFailed(status) || isCartOperationCancelled(status);
}
export function isClearCartOperation(type) {
  return type === CART_OPERATION_TYPE.CLEAR_CART;
}
export function isImportCartOperation(type) {
  return type === CART_OPERATION_TYPE.IMPORT_CART;
}
export function isExportCartOperation(type) {
  return type === CART_OPERATION_TYPE.EXPORT_CART;
}
export function hasActiveAsyncOperation(cart) {
  if (!cart) {
    return false;
  }
  const isBlockingOperation = isClearCartOperation(cart.lastOperationType) || isImportCartOperation(cart.lastOperationType) || isExportCartOperation(cart.lastOperationType);
  return isActiveAsyncStatus(cart.lastOperationStatus) && isBlockingOperation;
}
export function hasActiveAsyncOperationFromWires(cartStatusData, cart) {
  return Boolean(cartStatusData?.isAsyncOperationInProgress) || hasActiveAsyncOperation(cart);
}
export function hasActivePollableOperation(cart) {
  if (!cart) {
    return false;
  }
  return isActiveAsyncStatus(cart.lastOperationStatus) && isClearCartOperation(cart.lastOperationType);
}
export function hasCompletedOperation(cart) {
  if (!cart) {
    return false;
  }
  return isClearCartOperation(cart.lastOperationType) && isCartOperationCompleted(cart.lastOperationStatus);
}
export function hasFailedAsyncOperation(cart) {
  if (!cart) {
    return false;
  }
  return isClearCartOperation(cart.lastOperationType) && isCartOperationFailed(cart.lastOperationStatus);
}
export function hasFinishedAsyncOperation(cart) {
  if (!cart) {
    return false;
  }
  return isClearCartOperation(cart.lastOperationType) && isCartOperationFinished(cart.lastOperationStatus);
}
export function isCartCleared(cart) {
  if (!cart) {
    return false;
  }
  return hasCompletedOperation(cart);
}
const CART_OPERATION_FIELDS = ['lastOperationStatus', 'lastOperationType', 'lastOperationFinishedAt', 'lastOperationJobId'];
const BANNER_DISPLAY_DURATION_MS = 60_000;
const IMPORT_CART_BANNER_DISPLAY_DURATION_MS = 48 * 60 * 60 * 1000;
export function shouldShowAsyncOperationBanner(cart) {
  if (!cart) {
    return false;
  }
  const isBannerOperation = isClearCartOperation(cart.lastOperationType) || isImportCartOperation(cart.lastOperationType);
  if (!isBannerOperation) {
    return false;
  }
  const hasActiveState = isActiveAsyncStatus(cart.lastOperationStatus);
  const hasCompletedState = isCartOperationCompleted(cart.lastOperationStatus);
  const hasFailedState = isCartOperationFailed(cart.lastOperationStatus);
  if (hasActiveState) {
    return true;
  }
  if (hasCompletedState || hasFailedState) {
    const {
      lastOperationFinishedAt
    } = cart;
    if (!lastOperationFinishedAt) {
      return true;
    }
    const finishedAtTime = new Date(lastOperationFinishedAt).getTime();
    const currentTime = Date.now();
    const elapsedMs = currentTime - finishedAtTime;
    const durationMs = isImportCartOperation(cart.lastOperationType) ? IMPORT_CART_BANNER_DISPLAY_DURATION_MS : BANNER_DISPLAY_DURATION_MS;
    return elapsedMs >= 0 && elapsedMs < durationMs;
  }
  return false;
}
export function hasCartOperationFieldsChanged(oldCart, newCart) {
  if (!oldCart || !newCart) {
    return oldCart !== newCart;
  }
  return CART_OPERATION_FIELDS.some(field => oldCart[field] !== newCart[field]);
}
export function isOperationActive(cart) {
  return !!cart && isActiveAsyncStatus(cart.lastOperationStatus);
}
export function isOperationCompleted(cart) {
  return !!cart && isCartOperationCompleted(cart.lastOperationStatus);
}
export function isOperationFailed(cart) {
  return !!cart && isCartOperationFailed(cart.lastOperationStatus);
}
export function extractServerErrorMessage(error) {
  const fetchError = error;
  const status = fetchError?.status;
  if (typeof status !== 'number' || status < 400 || status >= 500) {
    return undefined;
  }
  const message = Array.isArray(fetchError.errors) ? fetchError.errors.find(e => e?.message?.trim())?.message : undefined;
  return message?.trim() || undefined;
}
export function normalizeId(id) {
  return id.substring(0, 15);
}
export function isCartOwner(currentUserId, cartOwnerId) {
  if (!currentUserId || !cartOwnerId) {
    return false;
  }
  return normalizeId(currentUserId) === normalizeId(cartOwnerId);
}