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

  const chatRef = db.collection('chats').doc(chatId);
  
  try {
    const snapshot = await chatRef.get();
    
    if (!snapshot.exists) {
      // Create new chat document
      await chatRef.set({
        participants: [uid1, uid2],
        listingId: options.listingId || null,
        listingTitle: options.listingTitle || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastMessageText: null,
        lastMessageBy: null,
        unread: {
          [uid1]: 0,
          [uid2]: 0,
        },
      });
    } else {
      // Chat exists, just update the timestamp
      await chatRef.set(
        {
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    console.error('ensureChatDoc failed:', error);
    throw error;
  }
}
