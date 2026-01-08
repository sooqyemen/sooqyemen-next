// /lib/getListings.server.js
import 'server-only';
import { unstable_cache } from 'next/cache';
import { adminDb } from './firebaseAdmin';
import { fetchPublicListings, fetchListingById as fetchListingByIdRest } from './firestoreRest';

// دالة تنظيف البيانات (مهمة جداً لـ Next.js)
function normalize(value) {
  // 1. تحويل Firestore Timestamp إلى نص
  if (value && typeof value === 'object' && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  
  // 2. تحويل GeoPoint (خط العرض والطول) إلى كائن بسيط
  // هذا الجزء كان يسبب مشاكل اختفاء الإعلانات إذا كانت تحتوي على خريطة
  if (value && typeof value === 'object' && 'latitude' in value && 'longitude' in value) {
    return { lat: value.latitude, lng: value.longitude };
  }

  // 3. التعامل مع المصفوفات
  if (Array.isArray(value)) {
    return value.map(normalize);
  }

  // 4. التعامل مع الكائنات المتداخلة
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = normalize(v);
    }
    return out;
  }

  return value;
}

// دالة جلب إعلان واحد (داخلية)
async function _fetchListingById(id) {
  // Try using Admin SDK first
  if (adminDb) {
    try {
      const snap = await adminDb.collection('listings').doc(id).get();
      if (snap.exists) {
        const data = snap.data() || {};
        return normalize({ id: snap.id, ...data });
      }
    } catch (error) {
      console.error(`Error fetching listing ${id} from Admin SDK:`, error);
      // Fall through to REST API fallback
    }
  }

  // Fallback to REST API if Admin SDK is not available or failed
  try {
    const listing = await fetchListingByIdRest(id);
    return listing ? normalize(listing) : null;
  } catch (error) {
    console.error(`Error fetching listing ${id} from REST API:`, error);
    return null;
  }
}

// دالة جلب قائمة الإعلانات (داخلية)
async function _fetchLatestListings(limit = 24) {
  // Try using Admin SDK first
  if (adminDb) {
    try {
      const listingsRef = adminDb.collection('listings');
      
      const snapshot = await listingsRef
        .orderBy('createdAt', 'desc') // ترتيب من الأحدث للأقدم
        .limit(limit)
        .get();

      if (!snapshot.empty) {
        // تنظيف البيانات
        const listings = snapshot.docs.map(doc => {
          return normalize({ id: doc.id, ...doc.data() });
        });

        return listings;
      }
    } catch (error) {
      console.error('[getLatestListings] Error fetching from AdminDB:', error);
      // Fall through to REST API fallback
    }
  }

  // Fallback to REST API if Admin SDK is not available or failed
  console.log('[getLatestListings] Using REST API fallback');
  try {
    const listings = await fetchPublicListings({ limit });
    return listings.map(normalize);
  } catch (error) {
    console.error('[getLatestListings] Error fetching from REST API:', error);
    return [];
  }
}

// --- الدوال المصدرة (مع الكاش) ---

export function getListingById(id) {
  return unstable_cache(
    () => _fetchListingById(id),
    ['listing-by-id', id],
    { revalidate: 300, tags: [`listing:${id}`] }
  )();
}

export function getLatestListings(limit = 24) {
  return unstable_cache(
    () => _fetchLatestListings(limit),
    ['latest-listings', String(limit)],
    { revalidate: 60, tags: ['listings'] }
  )();
}
