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
export function isChildCartItemsData(data) {
  return typeof data === 'object' && data !== null && Array.isArray(data.childCartItems);
}