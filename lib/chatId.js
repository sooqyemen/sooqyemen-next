/**
 * Chat ID Utility
 * 
 * Generates deterministic chat IDs to prevent duplicate conversations
 * between the same two users for the same listing.
 * 
 * Format: listingId__min(uid1,uid2)__max(uid1,uid2)
 * Or without listing: min(uid1,uid2)__max(uid1,uid2)
 */

/**
 * Generate a deterministic chat ID
 * @param {string} uid1 - First user ID
 * @param {string} uid2 - Second user ID
 * @param {string} [listingId] - Optional listing ID
 * @returns {string} - Deterministic chat ID
 */
export function makeChatId(uid1, uid2, listingId = null) {
  const a = String(uid1 || '').trim();
  const b = String(uid2 || '').trim();
  
  if (!a || !b) {
    throw new Error('Both user IDs are required to create a chat ID');
  }
  
  if (a === b) {
    throw new Error('Cannot create a chat between the same user');
  }
  
  // Sort UIDs to ensure consistency regardless of order
  const [minUid, maxUid] = [a, b].sort();
  
  if (listingId) {
    const lid = String(listingId).trim();
    return `${lid}__${minUid}__${maxUid}`;
  }
  
  return `${minUid}__${maxUid}`;
}
