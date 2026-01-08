// /lib/getListing.server.js
import 'server-only';
import { unstable_cache } from 'next/cache';
import { adminDb } from './firebaseAdmin';
import { fetchPublicListings } from './firestoreRest';

function normalize(value) {
  // تحويل Firestore Timestamp إلى نص
  if (value && typeof value === 'object' && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = normalize(v);
    return out;
  }
  return value;
}

async function _fetchListingById(id) {
  if (!adminDb) return null;

  const snap = await adminDb.collection('listings').doc(id).get();
  if (!snap.exists) return null;

  const data = snap.data() || {};
  return normalize({ id: snap.id, ...data });
}

export function getListingById(id) {
  // كاش لكل إعلان لوحده
  return unstable_cache(
    () => _fetchListingById(id),
    ['listing-by-id', id],
    { revalidate: 300, tags: [`listing:${id}`] }
  )();
}

async function _fetchLatestListings(limit = 24) {
  try {
    // استخدام firestoreRest لجلب الإعلانات
    const listings = await fetchPublicListings({ limit });
    // البيانات من firestoreRest مرجعة منظمة بالفعل
    return listings;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[getLatestListings] Error:', error);
    }
    return [];
  }
}

export function getLatestListings(limit = 24) {
  // كاش للإعلانات الأخيرة
  return unstable_cache(
    () => _fetchLatestListings(limit),
    ['latest-listings', String(limit)],
    { revalidate: 60, tags: ['listings'] }
  )();
}
