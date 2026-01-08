// lib/publicUserId.js
import { auth } from './firebaseClient';

// In-memory cache to avoid repeated API calls
const publicIdCache = new Map();

/**
 * Fetch or generate public user ID for a given user
 * @param {Object} user - Firebase user object with uid
 * @returns {Promise<string>} Public ID like "U-000123" or fallback
 */
export async function getPublicUserId(user) {
  if (!user || !user.uid) {
    return 'مستخدم';
  }

  // Check cache first
  if (publicIdCache.has(user.uid)) {
    return publicIdCache.get(user.uid);
  }

  try {
    // Get Firebase ID token
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      return 'مستخدم';
    }

    // Call API to get/generate public ID
    const response = await fetch('/api/public-id', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[publicUserId] API error:', response.status);
      return 'مستخدم';
    }

    const data = await response.json();
    const publicId = data.publicId || 'مستخدم';
    
    // Cache the result
    publicIdCache.set(user.uid, publicId);
    
    return publicId;
  } catch (error) {
    console.error('[publicUserId] Error fetching public ID:', error);
    return 'مستخدم';
  }
}

/**
 * Fetch public user ID by email (for listing sellers, etc.)
 * This is a simplified version that formats a display ID
 * In production, you'd need a backend lookup by email
 */
export function getPublicUserIdByEmail(email) {
  if (!email) return 'مستخدم';
  
  // For now, return a placeholder since we can't lookup by email client-side
  // In production: call an API endpoint that looks up user by email
  return 'رقم مستخدم غير متوفر';
}

/**
 * Clear the cache (useful for testing or logout)
 */
export function clearPublicIdCache() {
  publicIdCache.clear();
}
