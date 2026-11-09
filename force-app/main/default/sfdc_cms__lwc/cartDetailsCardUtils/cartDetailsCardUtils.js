import labels from './labels';
function toId15(id) {
  return id.substring(0, 15);
}
export function truncateWithEllipsis(str, maxLength) {
  if (str == null || maxLength == null || maxLength < 4 || str.length <= maxLength) {
    return str ?? '';
  }
  return str.slice(0, maxLength - 3) + '...';
}
export const CART_NAME_DISPLAY_TEXT_MAX_LENGTH = 80;
export const CART_DESCRIPTION_DISPLAY_TEXT_MAX_LENGTH = 100;
export function parseTotalProductCount(data) {
  const raw = data?.totalProductCount;
  if (raw == null || raw === '') {
    return null;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}
export function parseUniqueProductCount(data) {
  const raw = data?.uniqueProductCount;
  if (raw == null) {
    return null;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    return null;
  }
  return Math.trunc(n);
}
export function getCountByType(data, countType) {
  if (countType === 'UniqueProductCount') {
    return parseUniqueProductCount(data) ?? 0;
  }
  if (countType !== undefined) {
    return parseTotalProductCount(data) ?? 0;
  }
  return parseTotalProductCount(data);
}
export function parseGrandTotalAmount(data) {
  const raw = data?.grandTotalAmount;
  if (raw == null || raw === '') {
    return null;
  }
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}
export function getCartName(data) {
  return truncateWithEllipsis(data?.name ?? '', CART_NAME_DISPLAY_TEXT_MAX_LENGTH);
}
export function getCartDescription(data) {
  return truncateWithEllipsis(data?.description ?? '', CART_DESCRIPTION_DISPLAY_TEXT_MAX_LENGTH);
}
export function getCurrencyCode(data) {
  return data?.currencyIsoCode ?? '';
}
export function getCartTypePillLabel(data, customLabel) {
  if (data?.isSecondary === false) {
    return customLabel || labels.defaultCartTypePillLabel;
  }
  return '';
}
export function getItemsDisplayText(data, countType, itemsLabel) {
  const quantity = getCountByType(data, countType);
  if (quantity == null || quantity < 0) {
    return '';
  }
  return `${quantity} ${itemsLabel || labels.itemsLabel}`;
}
export function hasItemsLine(data, countType) {
  const count = getCountByType(data, countType);
  return count != null && count >= 0;
}
export function getCollaboratorCount(data) {
  return data?.collaborators?.length ?? 0;
}
export function getCartSharingStatusText(data, displayLabels) {
  const count = getCollaboratorCount(data);
  if (count <= 0) {
    return displayLabels.personalLabel;
  }
  if (count === 1 && displayLabels.sharedWithOneOtherLabel) {
    return displayLabels.sharedWithOneOtherLabel;
  }
  return displayLabels.sharedWithOthersLabel.replace('{0}', String(count));
}
export function getCartOwner(data) {
  const collaborators = data?.collaborators;
  if (!collaborators || collaborators.length === 0) {
    return undefined;
  }
  const sharer = collaborators.find(c => c.sharedByName);
  if (!sharer) {
    return undefined;
  }
  return {
    name: sharer.sharedByName,
    email: sharer.sharedByEmail ?? ''
  };
}
export function getSharedByText(data, sharedByLabel, options = {}) {
  const owner = getCartOwner(data) ?? options.ownerFallback;
  if (!owner || !owner.name) {
    return '';
  }
  const attribution = owner.email ? `${owner.name} (${owner.email})` : owner.name;
  const accessLabel = options.accessLabel ?? '';
  return sharedByLabel.replace('{0}', attribution).replace('{1}', accessLabel).trim();
}
export function getSharedByTextSegments(data, sharedByLabel, options = {}) {
  const owner = getCartOwner(data);
  const accessLabel = options.accessLabel ?? '';
  if (!owner || !owner.name || !accessLabel || !sharedByLabel.includes('{1}')) {
    return undefined;
  }
  const attribution = owner.email ? `${owner.name} (${owner.email})` : owner.name;
  const [before, after] = sharedByLabel.split('{1}');
  return {
    before: before.replace('{0}', attribution),
    access: accessLabel,
    after
  };
}
export function shouldRestrictOwnerActions(data, currentUserId) {
  const ownerId = data?.ownerId;
  if (!ownerId || !currentUserId) {
    return false;
  }
  return toId15(ownerId) !== toId15(currentUserId);
}
export function getCurrentUserAccessLevel(data, currentUserId) {
  const ownerId = data?.ownerId;
  if (!ownerId || !currentUserId) {
    return 'Owner';
  }
  if (toId15(ownerId) === toId15(currentUserId)) {
    return 'Owner';
  }
  const viewer = data?.collaborators?.find(c => toId15(c.collaboratorId) === toId15(currentUserId));
  return viewer?.accessLevel;
}
function resolveAccessWord(data, currentUserId, statusLabels) {
  switch (getCurrentUserAccessLevel(data, currentUserId)) {
    case 'View':
      return statusLabels.viewAccessLabel ?? '';
    case 'Edit':
      return statusLabels.editAccessLabel ?? '';
    case 'Checkout':
      return statusLabels.checkoutAccessLabel ?? '';
    default:
      return '';
  }
}
export function getCollaborationStatusView(data, session, statusLabels, options = {}) {
  const isRecipientViewing = shouldRestrictOwnerActions(data, session.currentUserId);
  const accessWord = resolveAccessWord(data, session.currentUserId, statusLabels);
  const ownerFallback = isRecipientViewing || !options.currentUserName ? undefined : {
    name: options.currentUserName,
    email: options.currentUserEmail ?? ''
  };
  const useAccessTemplate = isRecipientViewing && Boolean(options.useSharedByForOwner) && Boolean(accessWord);
  const template = useAccessTemplate ? statusLabels.sharedByWithAccessLabel ?? '' : statusLabels.sharedByLabel ?? '';
  const sharedByText = getSharedByText(data, template, {
    accessLabel: useAccessTemplate ? accessWord : '',
    ownerFallback
  });
  const isRecipientView = Boolean(sharedByText) && (isRecipientViewing || Boolean(options.useSharedByForOwner));
  const sharedByTextSegments = isRecipientViewing && options.useSharedByForOwner && statusLabels.sharedByWithAccessLabel ? getSharedByTextSegments(data, statusLabels.sharedByWithAccessLabel, {
    accessLabel: accessWord
  }) : undefined;
  return {
    isShareCartEnabled: session.isLoggedIn && Boolean(options.shareCartEnabled),
    isOwnerOrPersonalView: !isRecipientView,
    isRecipientView,
    sharingStatusText: getCartSharingStatusText(data, {
      personalLabel: statusLabels.personalLabel ?? '',
      sharedWithOthersLabel: statusLabels.sharedWithOthersLabel ?? '',
      sharedWithOneOtherLabel: statusLabels.sharedWithOneOtherLabel
    }),
    sharedByText,
    sharedByTextSegments
  };
}
export function canEditCart(data, currentUserId) {
  const level = getCurrentUserAccessLevel(data, currentUserId);
  return level === 'Owner' || level === 'Edit' || level === 'Checkout';
}
export function isCartLocked(data) {
  return data?.collaborationLockDetail != null || data?.collaborationStatus === 'LOCKED';
}
export function isLockHolder(data, currentUserId) {
  const lockedById = data?.collaborationLockDetail?.lockedById;
  if (!lockedById || !currentUserId) {
    return false;
  }
  return toId15(lockedById) === toId15(currentUserId);
}
export function getCartLockOwnerName(data) {
  const fromDetail = data?.collaborationLockDetail?.lockedByName?.trim();
  if (fromDetail) {
    return fromDetail;
  }
  return data?.lockedByUserName?.trim() ?? '';
}
export function getCartLockOwnerEmail(data) {
  return data?.collaborationLockDetail?.lockedByEmail?.trim() ?? '';
}
export function hasPrice(data) {
  const value = parseGrandTotalAmount(data);
  const code = getCurrencyCode(data);
  return value != null && Boolean(code);
}
export function hasItemsAndTotal(data, countType) {
  return hasItemsLine(data, countType) || hasPrice(data);
}
export function hasDescription(data) {
  return Boolean(getCartDescription(data).trim());
}
export function shouldShowCartTypePill(data) {
  return data?.isSecondary === false;
}
export const isLockedByCurrentUser = isLockHolder;
export function getEffectiveAccessLevel(data) {
  if (!data) {
    return null;
  }
  if (data.currentUserAccessLevel === undefined) {
    return null;
  }
  if (data.currentUserAccessLevel === null) {
    return 'Owner';
  }
  return data.currentUserAccessLevel;
}
export function canMutateCartItems(data) {
  if (isCartLocked(data)) {
    return false;
  }
  const level = getEffectiveAccessLevel(data);
  if (level === null) {
    return true;
  }
  return level === 'Owner' || level === 'Checkout' || level === 'Edit';
}
export function canInitiateCheckout(data) {
  if (isCartLocked(data)) {
    return false;
  }
  const level = getEffectiveAccessLevel(data);
  if (level === null) {
    return true;
  }
  return level === 'Owner' || level === 'Checkout';
}
export function canApplyPromotions(data) {
  if (isCartLocked(data)) {
    return false;
  }
  const level = getEffectiveAccessLevel(data);
  if (level === null) {
    return true;
  }
  return level === 'Owner' || level === 'Checkout';
}