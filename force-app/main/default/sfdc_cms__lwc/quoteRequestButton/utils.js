export function asNonEmptyString(value) {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
function toId15(id) {
  return id.substring(0, 15);
}
export function shouldRestrictOwnerActions(data, currentUserId) {
  const ownerId = data?.ownerId;
  if (!ownerId || !currentUserId) {
    return false;
  }
  return toId15(ownerId) !== toId15(currentUserId);
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