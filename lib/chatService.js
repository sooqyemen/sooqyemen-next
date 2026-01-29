/**
 * Chat Service
 * 
 * Handles chat document creation and management in Firestore
 */

import { db, firebase } from './firebaseClient';

/**
 * Ensure a chat document exists in Firestore
 * Creates it if it doesn't exist, or updates metadata if it does
 * 
 * @param {string} chatId - The deterministic chat ID
 * @param {string} uid1 - First participant user ID
 * @param {string} uid2 - Second participant user ID
 * @param {Object} options - Additional chat metadata
 * @param {string} [options.listingId] - Associated listing ID
 * @param {string} [options.listingTitle] - Associated listing title
 * @returns {Promise<void>}
 */
export async function ensureChatDoc(chatId, uid1, uid2, options = {}) {
  if (!chatId || !uid1 || !uid2) {
    throw new Error('chatId, uid1, and uid2 are required');
  }

  // Normalize to strings (Firestore stores auth uids as strings)
  const a = String(uid1);
  const b = String(uid2);

  const chatRef = db.collection('chats').doc(chatId);
  
  try {
    const snapshot = await chatRef.get();
    
    if (!snapshot.exists) {
      // Create new chat document
      await chatRef.set({
        participants: [a, b],
        listingId: options.listingId || null,
        listingTitle: options.listingTitle || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastMessageText: null,
        lastMessageBy: null,
        unread: {
          [a]: 0,
          [b]: 0,
        },
      });
    } else {
      // Chat exists
      const data = snapshot.data() || {};
      const participants = Array.isArray(data.participants) ? data.participants.map(String) : [];

      // Repair older/broken chat docs that might be missing participants
      const needRepair =
        participants.length < 2 ||
        !participants.includes(a) ||
        !participants.includes(b);

      const patch = {
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      if (needRepair) {
        patch.participants = [a, b];
        patch.unread = {
          ...(typeof data.unread === 'object' && data.unread ? data.unread : {}),
          [a]: 0,
          [b]: 0,
        };
      }

      // Keep listing metadata if supplied
      if (options.listingId && !data.listingId) patch.listingId = options.listingId;
      if (options.listingTitle && !data.listingTitle) patch.listingTitle = options.listingTitle;

      await chatRef.set(patch, { merge: true });
    }
  } catch (error) {
    console.error('ensureChatDoc failed:', error);
    throw error;
  }
}
