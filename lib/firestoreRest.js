// lib/firestoreRest.js
// Firestore REST عبر Firebase Auth ID Token (بدون firebase-admin)
// ✅ لا خلط compat/modular
// ✅ يدعم SSR + revalidate

let _cachedToken = null;
let _cachedTokenExp = 0; // epoch ms
const _logGate = new Map();

function logOnce(key, msg) {
  const now = Date.now();
  const last = _logGate.get(key) || 0;
  if (now - last > 60_000) { // مرة كل دقيقة لكل نوع خطأ
    _logGate.set(key, now);
    console.error(msg);
  }
}

function getEnv(name, fallback = '') {
  const v = process.env[name];
  return (v && String(v).trim()) || fallback;
}

function requireEnv(name) {
  const v = getEnv(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function getServerIdToken() {
  // نستخدم حساب “قارئ” واحد بدل إنشاء anonymous كل مرة
  // ENV المطلوبة:
  // NEXT_PUBLIC_FIREBASE_API_KEY
  // FIREBASE_SERVER_READER_EMAIL
  // FIREBASE_SERVER_READER_PASSWORD

  if (_cachedToken && Date.now() < _cachedTokenExp - 30_000) {
    return _cachedToken; // صالح
  }

  const apiKey = requireEnv('NEXT_PUBLIC_FIREBASE_API_KEY');
  const email = requireEnv('FIREBASE_SERVER_READER_EMAIL');
  const password = requireEnv('FIREBASE_SERVER_READER_PASSWORD');

  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // لا نستخدم next revalidate هنا، نبي توكن حي
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`IdentityToolkit signInWithPassword failed: ${res.status} ${res.statusText} ${text}`);
  }

  const data = await res.json();
  const idToken = data?.idToken;
  const expiresInSec = parseInt(data?.expiresIn || '3600', 10);

  if (!idToken) throw new Error('IdentityToolkit returned no idToken');

  _cachedToken = idToken;
  _cachedTokenExp = Date.now() + (expiresInSec * 1000);

  return idToken;
}

function parseDoc(doc) {
  const id = doc.name.split('/').pop();
  const fields = doc.fields || {};

  const toInt = (v) => parseInt(v?.integerValue || v?.doubleValue || '0', 10);
  const toFloat = (v) => parseFloat(v?.doubleValue || v?.integerValue || '0');

  return {
    id,
    title: fields.title?.stringValue || '',
    description: fields.description?.stringValue || '',
    priceYER: toInt(fields.priceYER),
    currentBidYER: toInt(fields.currentBidYER),
    currency: fields.currency?.stringValue || 'YER',
    originalPrice: toFloat(fields.originalPrice),
    originalCurrency: fields.originalCurrency?.stringValue || '',
    city: fields.city?.stringValue || '',
    locationLabel: fields.locationLabel?.stringValue || '',
    category: fields.category?.stringValue || '',
    images: fields.images?.arrayValue?.values?.map((v) => v.stringValue).filter(Boolean) || [],
    views: toInt(fields.views),
    auctionEnabled: fields.auctionEnabled?.booleanValue || false,
    isActive: fields.isActive?.booleanValue !== false,
    hidden: fields.hidden?.booleanValue || false,
    createdAt: fields.createdAt?.timestampValue || new Date().toISOString(),
    updatedAt: fields.updatedAt?.timestampValue || fields.createdAt?.timestampValue || new Date().toISOString(),
    userId: fields.userId?.stringValue || '',
    userEmail: fields.userEmail?.stringValue || '',
    phone: fields.phone?.stringValue || '',
    isWhatsapp: fields.isWhatsapp?.booleanValue || false,
    coords: fields.coords?.arrayValue?.values?.map((v) => parseFloat(v.doubleValue || 0)) || null,
  };
}

function getProjectId() {
  // لا نستخدم fallback لمشروع ثاني
  return getEnv('FIREBASE_PROJECT_ID') || getEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
}

async function firestoreRunQuery(structuredQuery, { revalidate = 60 } = {}) {
  const projectId = getProjectId();
  if (!projectId) {
    const errorMsg = '[firestoreRest] Missing FIREBASE_PROJECT_ID/NEXT_PUBLIC_FIREBASE_PROJECT_ID';
    if (process.env.NODE_ENV === 'development') {
      console.error(errorMsg);
    }
    throw new Error('فشل الاتصال بقاعدة البيانات: معرف المشروع مفقود');
  }

  let token = null;
  try {
    token = await getServerIdToken();
  } catch (e) {
    const errorMsg = `[firestoreRest] Token error: ${e?.message || e}`;
    if (process.env.NODE_ENV === 'development') {
      console.error(errorMsg);
    }
    throw new Error('فشل المصادقة مع قاعدة البيانات');
  }

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ structuredQuery }),
    next: { revalidate },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const errorMsg = `[firestoreRest] runQuery HTTP ${res.status} ${res.statusText}: ${text}`;
    if (process.env.NODE_ENV === 'development') {
      console.error(errorMsg);
    }
    throw new Error(`فشل جلب البيانات من قاعدة البيانات (${res.status})`);
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * جلب الإعلانات العامة
 */
export async function fetchPublicListings({ limit = 24, category = null, cursor = null } = {}) {
  const structuredQuery = {
    from: [{ collectionId: 'listings' }],
    orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
    limit,
  };

  // فلترة القسم
  if (category) {
    structuredQuery.where = {
      fieldFilter: {
        field: { fieldPath: 'category' },
        op: 'EQUAL',
        value: { stringValue: category },
      },
    };
  }

  // Cursor (اختياري) — لازم يكون timestampValue لأننا نرتب createdAt
  if (cursor) {
    structuredQuery.startAt = {
      values: [{ timestampValue: cursor }],
      before: false,
    };
  }

  const data = await firestoreRunQuery(structuredQuery, { revalidate: 60 });

  const listings = data
    .filter((item) => item.document)
    .map((item) => parseDoc(item.document))
    .filter((l) => l.isActive && !l.hidden);

  return listings;
}

/**
 * جلب إعلان واحد بالـ ID
 */
export async function fetchListingById(id) {
  if (!id) return null;

  const projectId = getProjectId();
  if (!projectId) {
    logOnce('missing_project_single', '[firestoreRest] Missing project id for fetchListingById');
    return null;
  }

  let token = null;
  try {
    token = await getServerIdToken();
  } catch (e) {
    logOnce('token_fail_single', `[firestoreRest] Token error (single): ${e?.message || e}`);
    return null;
  }

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/listings/${id}`;

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    if (res.status !== 404) {
      const text = await res.text().catch(() => '');
      logOnce(`single_${res.status}`, `[firestoreRest] fetchListingById HTTP ${res.status}: ${text}`);
    }
    return null;
  }

  const doc = await res.json();
  const listing = parseDoc(doc);

  if (!listing.isActive || listing.hidden) return null;
  return listing;
}

/**
 * جلب IDs للإعلانات (sitemap)
 */
export async function fetchListingIdsForSitemap(limit = 1000) {
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

    const data = await firestoreRunQuery(structuredQuery, { revalidate: 3600 });

    const ids = data
      .filter((item) => item.document)
      .map((item) => {
        const doc = item.document;
        const parsed = parseDoc(doc);
        return {
          id: parsed.id,
          updatedAt: parsed.updatedAt || parsed.createdAt || new Date().toISOString(),
          isActive: parsed.isActive,
          hidden: parsed.hidden,
        };
      })
      .filter((x) => x.isActive && !x.hidden);

    return ids;
  } catch (e) {
    logOnce('sitemap_ids_fail', `[firestoreRest] fetchListingIdsForSitemap error: ${e?.message || e}`);
    return [];
  }
}
