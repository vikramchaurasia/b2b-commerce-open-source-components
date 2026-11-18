function toId15(id) {
  return id.substring(0, 15);
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