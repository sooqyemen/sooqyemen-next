// lib/firestoreRest.js
// Firestore REST عبر Firebase Auth ID Token (بدون firebase-admin)
// ✅ لا خلط compat/modular
// ✅ يدعم SSR + revalidate
import 'server-only';

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
  if (_cachedToken && Date.now() < _cachedTokenExp - 30_000) {
    return _cachedToken; // صالح
  }

  const apiKey = getEnv('NEXT_PUBLIC_FIREBASE_API_KEY', 'AIzaSyD_LRQdmb3Kyo6NVroUMvHGnx-Ciz9OIcU');
  const email = requireEnv('FIREBASE_SERVER_READER_EMAIL');
  const password = requireEnv('FIREBASE_SERVER_READER_PASSWORD');

  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  const name = doc?.name || '';
  const id = name.split('/').pop() || '';
  const fields = doc?.fields || {};

  // ===== Firestore REST value helpers =====
  const has = (k) => Object.prototype.hasOwnProperty.call(fields, k) && fields[k] != null;

  const toNum = (v, fallback = null) => {
    if (!v) return fallback;
    if (v.integerValue != null) return parseInt(v.integerValue, 10);
    if (v.doubleValue != null) return parseFloat(v.doubleValue);
    // في بعض الحالات قد تأتي الأرقام كنصوص
    if (v.stringValue != null) {
      const n = parseFloat(v.stringValue);
      return Number.isFinite(n) ? n : fallback;
    }
    return fallback;
  };

  const toStr = (v, fallback = '') => {
    if (!v) return fallback;
    if (v.stringValue != null) return v.stringValue;
    if (v.timestampValue != null) return v.timestampValue;
    return fallback;
  };

  const toBool = (v, fallback = false) => {
    if (!v) return fallback;
    if (v.booleanValue != null) return v.booleanValue;
    return fallback;
  };

  const toArrStrings = (v) =>
    v?.arrayValue?.values?.map((x) => x?.stringValue).filter(Boolean) || [];

  const toArrNumbers = (v) => {
    const vals = v?.arrayValue?.values || [];
    const out = [];
    for (const x of vals) {
      const n = toNum(x, null);
      if (n == null || Number.isNaN(n)) continue;
      out.push(n);
    }
    return out.length ? out : null;
  };

  const getStr = (k, fallback = '') => toStr(fields[k], fallback);
  const getBool = (k, fallback = false) => toBool(fields[k], fallback);
  const getNum = (k, fallback = null) => toNum(fields[k], fallback);
  const getArrStr = (k) => toArrStrings(fields[k]);
  const getArrNum = (k) => toArrNumbers(fields[k]);
  const getTs = (k, fallback = null) => (fields[k]?.timestampValue ? fields[k].timestampValue : fallback);

  // ===== coords / lat / lng =====
  let coords = getArrNum('coords'); // غالباً [lat,lng]
  let lat = getNum('lat', null);
  let lng = getNum('lng', null);

  // geoPointValue support
  if ((!coords || coords.length < 2) && fields.coords?.geoPointValue) {
    const gp = fields.coords.geoPointValue;
    const glat = typeof gp.latitude === 'number' ? gp.latitude : parseFloat(gp.latitude || '0');
    const glng = typeof gp.longitude === 'number' ? gp.longitude : parseFloat(gp.longitude || '0');
    if (Number.isFinite(glat) && Number.isFinite(glng)) {
      coords = [glat, glng];
      lat = lat ?? glat;
      lng = lng ?? glng;
    }
  }

  // mapValue {lat,lng} support
  if ((!coords || coords.length < 2) && fields.coords?.mapValue?.fields) {
    const mv = fields.coords.mapValue.fields;
    const mlat = toNum(mv.lat, null);
    const mlng = toNum(mv.lng, null);
    if (mlat != null && mlng != null) {
      coords = [mlat, mlng];
      lat = lat ?? mlat;
      lng = lng ?? mlng;
    }
  }

  // fallback coords from lat/lng fields
  if ((!coords || coords.length < 2) && lat != null && lng != null) {
    coords = [lat, lng];
  }

  return {
    id,

    // ===== Basic =====
    title: getStr('title', ''),
    description: getStr('description', ''),
    category: getStr('category', ''),
    status: getStr('status', ''),
    isActive: has('isActive') ? getBool('isActive', true) : true,
    hidden: getBool('hidden', false),

    // ===== Pricing =====
    priceYER: getNum('priceYER', null),
    priceSAR: getNum('priceSAR', null),
    priceUSD: getNum('priceUSD', null),
    currencyBase: getStr('currencyBase', ''),
    originalPrice: getNum('originalPrice', null),
    originalCurrency: getStr('originalCurrency', ''),

    // ===== Location =====
    govKey: getStr('govKey', ''),
    city: getStr('city', ''),
    locationLabel: getStr('locationLabel', ''),
    lat,
    lng,
    coords,

    // ===== Media =====
    images: getArrStr('images'),

    // ===== Owner / Contact =====
    userId: getStr('userId', ''),
    userEmail: getStr('userEmail', ''),
    phone: getStr('phone', ''),
    isWhatsapp: getBool('isWhatsapp', false),

    // ===== Analytics =====
    views: getNum('views', 0) || 0,
    lastViewedAt: getTs('lastViewedAt', null),

    // ===== Auction =====
    auctionEnabled: getBool('auctionEnabled', false),
    auctionEndAt: getTs('auctionEndAt', null),
    startingPrice: getNum('startingPrice', null),
    currentBidYER: getNum('currentBidYER', null),
    lastBidAt: getTs('lastBidAt', null),

    // ===== Category-specific taxonomy (important for filtering) =====
    dealType: getStr('dealType', ''),
    propertyType: getStr('propertyType', ''),
    propertyTypeText: getStr('propertyTypeText', ''),
    phoneBrand: getStr('phoneBrand', ''),
    phoneBrandText: getStr('phoneBrandText', ''),
    electronicsType: getStr('electronicsType', ''),
    electronicsTypeText: getStr('electronicsTypeText', ''),
    heavyEquipmentType: getStr('heavyEquipmentType', ''),
    heavyEquipmentTypeText: getStr('heavyEquipmentTypeText', ''),
    solarType: getStr('solarType', ''),
    solarTypeText: getStr('solarTypeText', ''),
    networkType: getStr('networkType', ''),
    networkTypeText: getStr('networkTypeText', ''),
    maintenanceType: getStr('maintenanceType', ''),
    maintenanceTypeText: getStr('maintenanceTypeText', ''),
    furnitureType: getStr('furnitureType', ''),
    furnitureTypeText: getStr('furnitureTypeText', ''),
    homeToolsType: getStr('homeToolsType', ''),
    homeToolsTypeText: getStr('homeToolsTypeText', ''),
    clothesType: getStr('clothesType', ''),
    clothesTypeText: getStr('clothesTypeText', ''),
    animalType: getStr('animalType', ''),
    animalTypeText: getStr('animalTypeText', ''),
    jobType: getStr('jobType', ''),
    jobTypeText: getStr('jobTypeText', ''),
    serviceType: getStr('serviceType', ''),
    serviceTypeText: getStr('serviceTypeText', ''),
    motorcycleBrand: getStr('motorcycleBrand', ''),
    motorcycleBrandText: getStr('motorcycleBrandText', ''),
    motorcycleModel: getStr('motorcycleModel', ''),
    motorcycleModelText: getStr('motorcycleModelText', ''),

    // سيارات
    carMake: getStr('carMake', ''),
    carMakeText: getStr('carMakeText', ''),
    carModel: getStr('carModel', ''),
    carModelText: getStr('carModelText', ''),

    // ===== Timestamps =====
    createdAt: getTs('createdAt', new Date().toISOString()),
    updatedAt: getTs('updatedAt', getTs('createdAt', new Date().toISOString())),
  };
}

function getProjectId() {
  const projectId = getEnv('FIREBASE_PROJECT_ID') || getEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  if (!projectId) {
    return 'aqarabhour-c8a9f';
  }
  return projectId;
}

async function firestoreRunQuery(structuredQuery, { revalidate = 60 } = {}) {
  const projectId = getProjectId();
  if (!projectId) {
    logOnce('missing_project', '[firestoreRest] Missing FIREBASE_PROJECT_ID');
    return [];
  }

  let token = null;
  try {
    token = await getServerIdToken();
  } catch (e) {
    logOnce('token_fail', `[firestoreRest] Token error: ${e?.message || e}`);
    return [];
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
    logOnce(`runquery_${res.status}`, `[firestoreRest] runQuery HTTP ${res.status}: ${text}`);
    return [];
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * جلب الإعلانات العامة (نخفي المخفي هنا)
 */
export async function fetchPublicListings({ limit = 24, category = null, cursor = null } = {}) {
  try {
    const structuredQuery = {
      from: [{ collectionId: 'listings' }],
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
      limit,
    };

    if (category) {
      structuredQuery.where = {
        fieldFilter: {
          field: { fieldPath: 'category' },
          op: 'EQUAL',
          value: { stringValue: category },
        },
      };
    }

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
      // ✅ هنا يجب إخفاء غير النشط والمخفي لأن هذه قائمة عامة
      .filter((l) => l.isActive && !l.hidden);

    return listings;
  } catch (e) {
    logOnce('fetchPublicListings_fail', `[firestoreRest] fetchPublicListings error: ${e?.message || e}`);
    return [];
  }
}

/**
 * جلب إعلان واحد بالـ ID
 */
export async function fetchListingById(id) {
  if (!id) return null;

  const projectId = getProjectId();
  if (!projectId) {
    logOnce('missing_project_single', '[firestoreRest] Missing project id');
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

  // ⚠️ تعديل هام جداً:
  // لا تقم بإرجاع null إذا كان مخفياً، بل أرجع البيانات.
  // صفحة العرض (page-client.js) هي التي ستقرر إخفاءه لغير المالك.
  // إذا أرجعنا null هنا، لن يستطيع المالك رؤية إعلانه المخفي أبداً.
  
  if (!listing.isActive) return null; // المحذوف نهائياً لا يظهر
  
  // if (listing.hidden) return null; <--- تم إيقاف هذا السطر للسماح للمالك بالرؤية

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
      // في خريطة الموقع، لا نريد روابط للإعلانات المخفية
      .filter((x) => x.isActive && !x.hidden);

    return ids;
  } catch (e) {
    logOnce('sitemap_ids_fail', `[firestoreRest] fetchListingIdsForSitemap error: ${e?.message || e}`);
    return [];
  }
}
