// lib/firestoreRest.js - Server-safe Firestore REST API (بدون firebase-admin)

/**
 * جلب الإعلانات العامة من Firestore REST API
 * @param {Object} options
 * @param {number} options.limit - عدد الإعلانات (افتراضي: 24)
 * @param {string} options.category - فلترة حسب القسم (اختياري)
 * @param {string} options.cursor - للصفحات التالية (اختياري)
 * @returns {Promise<Array>} قائمة الإعلانات
 */
export async function fetchPublicListings({ limit = 24, category = null, cursor = null } = {}) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'aqarabhour-c8a9f';
  
  if (!projectId) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[firestoreRest] Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID');
    }
    return [];
  }

  try {
    // بناء الـ Query
    const structuredQuery = {
      from: [{ collectionId: 'listings' }],
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
      limit,
    };

    // إضافة فلتر القسم إذا موجود
    if (category) {
      structuredQuery.where = {
        fieldFilter: {
          field: { fieldPath: 'category' },
          op: 'EQUAL',
          value: { stringValue: category },
        },
      };
    }

    // إضافة cursor للصفحات التالية
    if (cursor) {
      structuredQuery.startAt = { values: [{ timestampValue: cursor }] };
    }

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ structuredQuery }),
      // استخدام cache للسيرفر (Next.js)
      next: { revalidate: 60 }, // إعادة التحقق كل 60 ثانية
    });

    if (!response.ok) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[firestoreRest] HTTP Error:', response.status, response.statusText);
        const text = await response.text();
        console.error('[firestoreRest] Response:', text);
      }
      return [];
    }

    const data = await response.json();
    
    if (!Array.isArray(data)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[firestoreRest] Unexpected response format:', typeof data);
      }
      return [];
    }

    // تحويل البيانات من Firestore REST format إلى JSON عادي
    const listings = data
      .filter((item) => item.document)
      .map((item) => {
        const doc = item.document;
        const id = doc.name.split('/').pop();
        const fields = doc.fields || {};
        
        return {
          id,
          title: fields.title?.stringValue || '',
          description: fields.description?.stringValue || '',
          priceYER: parseInt(fields.priceYER?.integerValue || fields.priceYER?.doubleValue || '0', 10),
          currentBidYER: parseInt(fields.currentBidYER?.integerValue || fields.currentBidYER?.doubleValue || '0', 10),
          currency: fields.currency?.stringValue || 'YER',
          originalPrice: parseFloat(fields.originalPrice?.doubleValue || fields.originalPrice?.integerValue || '0'),
          originalCurrency: fields.originalCurrency?.stringValue || '',
          city: fields.city?.stringValue || '',
          locationLabel: fields.locationLabel?.stringValue || '',
          category: fields.category?.stringValue || '',
          images: fields.images?.arrayValue?.values?.map((v) => v.stringValue).filter(Boolean) || [],
          views: parseInt(fields.views?.integerValue || '0', 10),
          auctionEnabled: fields.auctionEnabled?.booleanValue || false,
          isActive: fields.isActive?.booleanValue !== false,
          hidden: fields.hidden?.booleanValue || false,
          createdAt: fields.createdAt?.timestampValue || new Date().toISOString(),
          userId: fields.userId?.stringValue || '',
          userEmail: fields.userEmail?.stringValue || '',
          phone: fields.phone?.stringValue || '',
          isWhatsapp: fields.isWhatsapp?.booleanValue || false,
        };
      })
      // فلترة الإعلانات المخفية وغير النشطة
      .filter((listing) => listing.isActive && !listing.hidden);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[firestoreRest] Fetched ${listings.length} public listings (category: ${category || 'all'})`);
    }

    return listings;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[firestoreRest] Error fetching listings:', error?.message || error);
    }
    return [];
  }
}

/**
 * جلب إعلان واحد بالـ ID
 * @param {string} id - معرف الإعلان
 * @returns {Promise<Object|null>} الإعلان أو null
 */
export async function fetchListingById(id) {
  if (!id) return null;

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'aqarabhour-c8a9f';
  
  if (!projectId) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[firestoreRest] Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID');
    }
    return null;
  }

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/listings/${id}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      // cache أطول للإعلانات الفردية
      next: { revalidate: 300 }, // 5 دقائق
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      if (process.env.NODE_ENV === 'development') {
        console.error('[firestoreRest] HTTP Error:', response.status, response.statusText);
      }
      return null;
    }

    const doc = await response.json();
    const fields = doc.fields || {};

    const listing = {
      id,
      title: fields.title?.stringValue || '',
      description: fields.description?.stringValue || '',
      priceYER: parseInt(fields.priceYER?.integerValue || fields.priceYER?.doubleValue || '0', 10),
      currentBidYER: parseInt(fields.currentBidYER?.integerValue || fields.currentBidYER?.doubleValue || '0', 10),
      currency: fields.currency?.stringValue || 'YER',
      originalPrice: parseFloat(fields.originalPrice?.doubleValue || fields.originalPrice?.integerValue || '0'),
      originalCurrency: fields.originalCurrency?.stringValue || '',
      city: fields.city?.stringValue || '',
      locationLabel: fields.locationLabel?.stringValue || '',
      category: fields.category?.stringValue || '',
      images: fields.images?.arrayValue?.values?.map((v) => v.stringValue).filter(Boolean) || [],
      views: parseInt(fields.views?.integerValue || '0', 10),
      auctionEnabled: fields.auctionEnabled?.booleanValue || false,
      isActive: fields.isActive?.booleanValue !== false,
      hidden: fields.hidden?.booleanValue || false,
      createdAt: fields.createdAt?.timestampValue || new Date().toISOString(),
      userId: fields.userId?.stringValue || '',
      userEmail: fields.userEmail?.stringValue || '',
      phone: fields.phone?.stringValue || '',
      isWhatsapp: fields.isWhatsapp?.booleanValue || false,
      coords: fields.coords?.arrayValue?.values?.map((v) => parseFloat(v.doubleValue || 0)) || null,
    };

    if (process.env.NODE_ENV === 'development') {
      console.log(`[firestoreRest] Fetched listing: ${id}`);
    }

    return listing;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[firestoreRest] Error fetching listing by ID:', error?.message || error);
    }
    return null;
  }
}

/**
 * جلب IDs الإعلانات النشطة (للـ sitemap)
 * @param {number} limit - عدد الإعلانات (افتراضي: 1000)
 * @returns {Promise<Array<{id: string, updatedAt: string}>>}
 */
export async function fetchListingIdsForSitemap(limit = 1000) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'aqarabhour-c8a9f';
  
  if (!projectId) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[firestoreRest] Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID');
    }
    return [];
  }

  try {
    const structuredQuery = {
      from: [{ collectionId: 'listings' }],
      select: {
        fields: [
          { fieldPath: 'createdAt' },
          { fieldPath: 'updatedAt' },
          { fieldPath: 'isActive' },
          { fieldPath: 'hidden' },
        ],
      },
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
      limit,
    };

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ structuredQuery }),
      next: { revalidate: 3600 }, // cache لمدة ساعة
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    
    if (!Array.isArray(data)) {
      return [];
    }

    const ids = data
      .filter((item) => item.document)
      .map((item) => {
        const doc = item.document;
        const id = doc.name.split('/').pop();
        const fields = doc.fields || {};
        
        return {
          id,
          updatedAt: fields.updatedAt?.timestampValue || fields.createdAt?.timestampValue || new Date().toISOString(),
          isActive: fields.isActive?.booleanValue !== false,
          hidden: fields.hidden?.booleanValue || false,
        };
      })
      // فلترة الإعلانات المخفية وغير النشطة
      .filter((listing) => listing.isActive && !listing.hidden);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[firestoreRest] Fetched ${ids.length} listing IDs for sitemap`);
    }

    return ids;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[firestoreRest] Error fetching listing IDs:', error?.message || error);
    }
    return [];
  }
}
