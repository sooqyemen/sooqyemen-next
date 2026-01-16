# Firestore Collection Schema Verification

## Date: 2026-01-08

## Collection Name Verification

### ✅ Collection Name: `listings`

The website **exclusively uses the `listings` collection** throughout the entire codebase. There are **no references to an `ads` collection**.

### Evidence:

#### Server-Side Usage (lib/getListings.server.js)
```javascript
// Line 41
const snap = await adminDb.collection('listings').doc(id).get();

// Line 58
const listingsRef = adminDb.collection('listings');
```

#### REST API Usage (lib/firestoreRest.js)
```javascript
// Line 153
from: [{ collectionId: 'listings' }],

// Line 242
from: [{ collectionId: 'listings' }],
```

#### Client-Side Usage Examples
- `app/page-client.js:461` - `db.collection('listings')`
- `app/add/page.js:237` - `db.collection('listings').add(...)`
- `app/edit-listing/[id]/page.js:73` - `db.collection('listings')`
- `app/my-listings/page.js:39` - `db.collection('listings')`
- `components/CategoryListings.jsx:101` - `db.collection('listings')`
- `components/CommentsBox.jsx:27` - `db.collection('listings')`
- `components/AuctionBox.jsx:33` - `db.collection('listings')`

### Total Collection References:
- **`listings` collection**: 25+ references across the codebase
- **`ads` collection**: 0 references

---

## Field Schema Documentation

### Core Fields (Always Present)

#### 1. **createdAt** (Timestamp)
- **Type**: Firestore Timestamp / ISO String
- **Required**: Yes (set via `firebase.firestore.FieldValue.serverTimestamp()`)
- **Usage**: Ordering and sorting listings
- **Indexed**: Yes (used in orderBy queries)
- **Example locations**:
  - `app/add/page.js:274` - Created when listing is added
  - `lib/getListings.server.js:61` - Used for ordering `.orderBy('createdAt', 'desc')`
  - `components/CategoryListings.jsx:101` - Ordering listings
  - `lib/firestoreRest.js:154` - REST API ordering

#### 2. **status** (String)
- **Type**: String
- **Values**: `'active'` | `'sold'`
- **Required**: No (defaults to 'active')
- **Usage**: Track listing lifecycle
- **Example locations**:
  - `app/edit-listing/[id]/page.js:265` - `status: status === 'sold' ? 'sold' : 'active'`
  - `app/my-listings/page.js:73` - Used to determine if listing is sold
  - `app/profile/page.jsx:312` - Filter sold items: `where('status', '==', 'sold')`

#### 3. **isActive** (Boolean)
- **Type**: Boolean
- **Default**: `true`
- **Required**: Yes
- **Usage**: Enable/disable listing visibility
- **Example locations**:
  - `app/add/page.js:268` - `isActive: true` (set on creation)
  - `app/page-client.js:468` - Filter: `listing.isActive !== false`
  - `lib/firestoreRest.js:93` - `isActive: fields.isActive?.booleanValue !== false`
  - `lib/firestoreRest.js:182` - Filter: `.filter((l) => l.isActive && !l.hidden)`
  - `app/admin/page.js:89` - Query: `where('isActive', '==', true)`

#### 4. **hidden** (Boolean)
- **Type**: Boolean
- **Default**: `false`
- **Required**: No
- **Usage**: Hide listing from public view (admin moderation)
- **Example locations**:
  - `app/page-client.js:468` - Filter: `listing.hidden !== true`
  - `lib/firestoreRest.js:94` - `hidden: fields.hidden?.booleanValue || false`
  - `lib/firestoreRest.js:182` - Filter: `.filter((l) => l.isActive && !l.hidden)`
  - `app/listing/[id]/page-client.js:244` - Check if hidden before showing
  - `app/admin/listings/page.js:71` - Toggle hidden state

#### 5. **category** (String)
- **Type**: String (English key)
- **Required**: Yes
- **Values**: 
  - `'cars'`, `'phones'`, `'electronics'`, `'realestate'`, `'motorcycles'`
  - `'heavy_equipment'`, `'solar'`, `'networks'`, `'maintenance'`
  - `'furniture'`, `'home_tools'`, `'clothes'`, `'animals'`, `'jobs'`, `'services'`, `'other'`
- **Usage**: Categorize listings
- **Indexed**: Yes (used in where queries)
- **Example locations**:
  - `app/add/page.js:243` - `category: String(category || '').trim()`
  - `components/CategoryListings.jsx:143` - `where('category', '==', single)`
  - `lib/firestoreRest.js:162` - Filter by category in REST API

### Listing Content Fields

#### 6. **title** (String)
- **Type**: String
- **Required**: Yes
- **Usage**: Listing headline/name
- **Example**: `app/add/page.js:238` - `title: title.trim()`

#### 7. **description** (String)
- **Type**: String
- **Required**: Yes
- **Usage**: Detailed listing description
- **Example**: `app/add/page.js:239` - `description: desc.trim()`

#### 8. **images** (Array)
- **Type**: Array of Strings (URLs)
- **Required**: Yes
- **Usage**: Listing photos
- **Example**: `app/add/page.js:260` - `images: imageUrls`

### Price Fields

#### 9. **priceYER** (Number)
- **Type**: Number (Integer)
- **Required**: Yes
- **Usage**: Price in Yemeni Rial
- **Example**: `app/add/page.js:248` - `priceYER: Number(priceYER)`

#### 10. **originalPrice** (Number)
- **Type**: Number
- **Required**: Yes
- **Usage**: Original price in original currency
- **Example**: `app/add/page.js:249` - `originalPrice: Number(price)`

#### 11. **originalCurrency** (String)
- **Type**: String
- **Values**: `'YER'`, `'USD'`, `'SAR'`, etc.
- **Required**: Yes
- **Usage**: Currency of original price
- **Example**: `app/add/page.js:250` - `originalCurrency: currency`

#### 12. **currency** (String)
- **Type**: String
- **Default**: `'YER'`
- **Usage**: Display currency
- **Example**: `lib/firestoreRest.js:84` - `currency: fields.currency?.stringValue || 'YER'`

#### 13. **currencyBase** (String)
- **Type**: String
- **Default**: `'YER'`
- **Usage**: Base currency for calculations
- **Example**: `app/add/page.js:251` - `currencyBase: 'YER'`

### Location Fields

#### 14. **city** (String)
- **Type**: String
- **Required**: Yes
- **Usage**: City/location of listing
- **Example**: `app/add/page.js:240` - `city: city.trim()`

#### 15. **locationLabel** (String)
- **Type**: String
- **Required**: No
- **Usage**: Additional location description
- **Example**: `app/add/page.js:258` - `locationLabel: locationLabel || null`

#### 16. **coords** (Array)
- **Type**: Array of Numbers `[lat, lng]`
- **Required**: No
- **Usage**: Geographical coordinates
- **Example**: `app/add/page.js:254` - `coords: lat != null && lng != null ? [lat, lng] : null`

#### 17. **lat** (Number)
- **Type**: Number
- **Required**: No
- **Usage**: Latitude
- **Example**: `app/add/page.js:255` - `lat: lat != null ? lat : null`

#### 18. **lng** (Number)
- **Type**: Number
- **Required**: No
- **Usage**: Longitude
- **Example**: `app/add/page.js:256` - `lng: lng != null ? lng : null`

### User Fields

#### 19. **userId** (String)
- **Type**: String
- **Required**: Yes
- **Usage**: Owner's Firebase Auth UID
- **Example**: `app/add/page.js:262` - `userId: user.uid`

#### 20. **userEmail** (String)
- **Type**: String
- **Required**: No
- **Usage**: Owner's email
- **Example**: `app/add/page.js:263` - `userEmail: user.email || null`

#### 21. **userName** (String)
- **Type**: String
- **Required**: No
- **Usage**: Owner's display name
- **Example**: `app/add/page.js:264` - `userName: user.displayName || null`

### Contact Fields

#### 22. **phone** (String)
- **Type**: String
- **Required**: No
- **Usage**: Contact phone number
- **Example**: `app/add/page.js:245` - `phone: phone.trim() || null`

#### 23. **isWhatsapp** (Boolean)
- **Type**: Boolean
- **Default**: `false`
- **Usage**: Indicates if phone is WhatsApp-enabled
- **Example**: `app/add/page.js:246` - `isWhatsapp: !!isWhatsapp`

### Engagement Fields

#### 24. **views** (Number)
- **Type**: Number
- **Default**: `0`
- **Usage**: View counter
- **Example**: `app/add/page.js:266` - `views: 0`
- **Updated**: `lib/analytics.js:56` - Incremented on view

#### 25. **likes** (Number)
- **Type**: Number
- **Default**: `0`
- **Usage**: Like counter
- **Example**: `app/add/page.js:267` - `likes: 0`

### Auction Fields

#### 26. **auctionEnabled** (Boolean)
- **Type**: Boolean
- **Default**: `false`
- **Usage**: Enable auction mode
- **Example**: `app/add/page.js:270` - `auctionEnabled: !!auctionEnabled`

#### 27. **auctionEndAt** (Timestamp)
- **Type**: Firestore Timestamp
- **Required**: Only if `auctionEnabled === true`
- **Usage**: Auction end time
- **Example**: `app/add/page.js:271` - `auctionEndAt: endAt`

#### 28. **currentBidYER** (Number)
- **Type**: Number
- **Required**: Only if `auctionEnabled === true`
- **Usage**: Current highest bid
- **Example**: `app/add/page.js:272` - `currentBidYER: auctionEnabled ? Number(priceYER) : null`

### Optional/Legacy Fields

#### 29. **updatedAt** (Timestamp)
- **Type**: Firestore Timestamp / ISO String
- **Required**: No
- **Usage**: Last update timestamp
- **Example**: `lib/firestoreRest.js:96` - Used as fallback to createdAt

---

## Query Patterns Used

### 1. **Get Single Listing**
```javascript
adminDb.collection('listings').doc(id).get()
```

### 2. **Get Latest Listings**
```javascript
adminDb.collection('listings')
  .orderBy('createdAt', 'desc')
  .limit(24)
  .get()
```

### 3. **Get Listings by Category**
```javascript
db.collection('listings')
  .where('category', '==', categoryName)
  .orderBy('createdAt', 'desc')
  .limit(200)
```

### 4. **Get Active Listings**
```javascript
db.collection('listings')
  .where('isActive', '==', true)
```

### 5. **Get User's Listings**
```javascript
db.collection('listings')
  .where('userId', '==', uid)
  .orderBy('createdAt', 'desc')
```

### 6. **Filter Active & Visible**
```javascript
.filter((listing) => listing.isActive !== false && listing.hidden !== true)
```

---

## Indexes Required

Based on the queries used in the codebase, the following Firestore indexes are required:

1. **Single field indexes** (auto-created):
   - `createdAt` (descending)
   - `category` (ascending)
   - `isActive` (ascending)
   - `userId` (ascending)
   - `status` (ascending)

2. **Composite indexes** (must be created):
   - `category` (ascending) + `createdAt` (descending)
   - `userId` (ascending) + `createdAt` (descending)
   - `isActive` (ascending) + `createdAt` (descending)

---

## Verification Checklist

### ✅ Collection Name
- [x] Collection name is `listings` (not `ads`)
- [x] Verified across 25+ references in codebase
- [x] No conflicting collection names found

### ✅ Key Fields Verified
- [x] `createdAt` - Used for ordering (required)
- [x] `status` - Used for lifecycle management (optional)
- [x] `isActive` - Used for visibility control (required)
- [x] `hidden` - Used for admin moderation (optional)
- [x] `category` - Used for categorization (required)

### ⚠️ Needs Firestore Console Verification
The following should be verified in the Firestore console:

1. **Collection exists**: Verify `listings` collection exists
2. **Documents exist**: Verify there are documents in the collection
3. **Field consistency**: Verify field names match exactly (case-sensitive):
   - `createdAt` (not `created_at` or `CreatedAt`)
   - `isActive` (not `is_active` or `IsActive`)
   - `hidden` (not `isHidden`)
   - `status` (not `Status`)
   - `category` (not `Category`)

4. **Field types match**:
   - `createdAt`: Timestamp
   - `isActive`: Boolean
   - `hidden`: Boolean
   - `status`: String
   - `category`: String
   - `priceYER`: Number
   - `views`: Number

5. **Indexes exist**:
   - Composite index: `category` + `createdAt`
   - Composite index: `userId` + `createdAt`
   - Composite index: `isActive` + `createdAt`

---

## Acceptance Criteria

✅ **Website query matches real collection name**
- The website queries the `listings` collection
- No references to `ads` or other collection names found

✅ **Website uses correct field names**
- All field names documented above are used consistently
- Field names are case-sensitive and match exactly
- Boolean fields use proper boolean values (not strings)

⚠️ **Pending Verification**
- Firestore console verification needed to confirm:
  - Collection exists with correct name
  - Documents have the expected fields
  - Field types match the schema
  - Required indexes are created

---

## Recommendations

1. **Immediate Actions**:
   - Verify Firestore collection name is exactly `listings`
   - Verify all documents have `createdAt`, `isActive`, and `category` fields
   - Create missing composite indexes if queries fail

2. **Data Quality**:
   - Ensure all listings have `isActive` field (defaults to `true`)
   - Ensure boolean fields are actual booleans (not strings)
   - Validate `category` values match the 16 supported categories

3. **Performance**:
   - Monitor query performance for category filtering
   - Consider adding more indexes if new query patterns emerge
   - Use `limit()` on all queries to prevent large data fetches

---

## Related Files

- **Schema Definition**: No explicit schema file (inferred from code)
- **Collection References**: See "Collection Name Verification" section above
- **REST API**: `/lib/firestoreRest.js` (lines 153, 242)
- **Server Queries**: `/lib/getListings.server.js` (lines 41, 58)
- **Client Queries**: Multiple files (see evidence above)

---

**Status**: ✅ Code verification complete, ⚠️ Firestore console verification pending
**Last Updated**: 2026-01-08
