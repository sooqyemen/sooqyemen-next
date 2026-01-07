// lib/getListings.server.js - Server-only cached query for listings
import 'server-only';
import { unstable_cache } from 'next/cache';
import { adminDb } from './firebaseAdmin';

/**
 * Convert Firestore Timestamp to ISO string
 */
function timestampToISO(timestamp) {
  if (!timestamp) return new Date().toISOString();
  if (typeof timestamp === 'string') return timestamp;
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }
  if (timestamp._seconds !== undefined) {
    return new Date(timestamp._seconds * 1000).toISOString();
  }
  return new Date().toISOString();
}

/**
 * Fetch latest listings from Firestore (cached with ISR-like revalidation)
 */
async function fetchListings(limit = 24) {
  if (!adminDb) {
    console.warn('[getListings] Firebase Admin not initialized, returning empty array');
    return [];
  }

  try {
    // Query listings ordered by createdAt descending
    // Note: We don't filter by status='active' here since not all documents may have that field
    // Instead, we filter inactive/hidden listings after fetching
    const query = adminDb
      .collection('listings')
      .orderBy('createdAt', 'desc')
      .limit(limit);

    const snapshot = await query.get();

    const listings = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      
      // Filter out inactive or hidden listings
      if (data.isActive === false || data.hidden === true) {
        return;
      }

      listings.push({
        id: doc.id,
        title: data.title || '',
        description: data.description || '',
        priceYER: data.priceYER || 0,
        currentBidYER: data.currentBidYER || 0,
        currency: data.currency || 'YER',
        originalPrice: data.originalPrice || 0,
        originalCurrency: data.originalCurrency || '',
        city: data.city || '',
        locationLabel: data.locationLabel || '',
        category: data.category || '',
        images: Array.isArray(data.images) ? data.images : (data.image ? [data.image] : []),
        image: data.image || (Array.isArray(data.images) ? data.images[0] : null),
        views: data.views || 0,
        auctionEnabled: data.auctionEnabled || false,
        isActive: data.isActive !== false,
        hidden: data.hidden || false,
        createdAt: timestampToISO(data.createdAt),
        updatedAt: timestampToISO(data.updatedAt || data.createdAt),
        userId: data.userId || '',
        userEmail: data.userEmail || '',
        phone: data.phone || '',
        isWhatsapp: data.isWhatsapp || false,
        coords: data.coords || null,
      });
    });

    return listings;
  } catch (error) {
    console.error('[getListings] Error fetching listings:', error);
    return [];
  }
}

/**
 * Cached version with ISR-like revalidation every 60 seconds
 */
export const getLatestListings = unstable_cache(
  fetchListings,
  ['latest-listings'],
  {
    revalidate: 60,
    tags: ['listings'],
  }
);
