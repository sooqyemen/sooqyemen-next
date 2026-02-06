# Firestore Quick Reference

## Collection Name
```javascript
// ✅ CORRECT - Use 'listings'
db.collection('listings')

// ❌ WRONG - Don't use 'ads'
db.collection('ads') // This collection does NOT exist
```

## Essential Fields (Always Required)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `createdAt` | Timestamp | ✅ Yes | Creation time (for ordering) |
| `title` | String | ✅ Yes | Listing title |
| `description` | String | ✅ Yes | Listing description |
| `category` | String | ✅ Yes | Category key (e.g., 'cars', 'phones') |
| `priceYER` | Number | ✅ Yes | Price in Yemeni Rial |
| `isActive` | Boolean | ✅ Yes | Visibility flag (default: true) |
| `userId` | String | ✅ Yes | Owner's Firebase UID |

## Visibility Control Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `isActive` | Boolean | `true` | User can activate/deactivate |
| `hidden` | Boolean | `false` | Admin can hide from public |
| `status` | String | `'active'` | `'active'` or `'sold'` |

## Common Query Patterns

### Get Latest Listings
```javascript
db.collection('listings')
  .orderBy('createdAt', 'desc')
  .limit(24)
  .get()
```

### Get by Category
```javascript
db.collection('listings')
  .where('category', '==', 'cars')
  .orderBy('createdAt', 'desc')
  .limit(200)
  .get()
```

### Filter Active & Visible
```javascript
const listings = snapshot.docs
  .map(doc => ({ id: doc.id, ...doc.data() }))
  .filter(listing => listing.isActive !== false && listing.hidden !== true)
```

## Field Name Rules (⚠️ IMPORTANT)

### ✅ Correct Field Names (camelCase)
- `createdAt` ✅
- `isActive` ✅
- `priceYER` ✅
- `userId` ✅
- `userEmail` ✅
- `originalPrice` ✅

### ❌ Wrong Field Names
- `created_at` ❌ (use camelCase)
- `is_active` ❌ (use camelCase)
- `isHidden` ❌ (use `hidden` instead)
- `price_yer` ❌ (use camelCase)

## Category Values (16 Total)

Valid category keys (English):
- `'cars'`, `'phones'`, `'electronics'`, `'realestate'`
- `'motorcycles'`, `'heavy_equipment'`, `'solar'`, `'networks'`
- `'maintenance'`, `'furniture'`, `'home_tools'`, `'clothes'`
- `'animals'`, `'jobs'`, `'services'`, `'other'`

## Creating a New Listing

```javascript
await db.collection('listings').add({
  // Required content
  title: 'Your title',
  description: 'Your description',
  category: 'cars', // Must be one of 16 valid categories
  
  // Required price
  priceYER: 50000,
  originalPrice: 50000,
  originalCurrency: 'YER',
  currencyBase: 'YER',
  
  // Required location
  city: 'صنعاء',
  
  // Required user info
  userId: user.uid,
  userEmail: user.email || null,
  userName: user.displayName || null,
  
  // Required images
  images: ['url1', 'url2'],
  
  // Required flags
  isActive: true,
  
  // Required stats
  views: 0,
  likes: 0,
  
  // Required timestamp
  createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  
  // Optional fields
  phone: '777123456',
  isWhatsapp: true,
  locationLabel: 'Near...',
  coords: [15.3694, 44.1910], // [lat, lng]
  lat: 15.3694,
  lng: 44.1910,
  
  // Auction fields (optional)
  auctionEnabled: false,
  auctionEndAt: null,
  currentBidYER: null,
})
```

## Required Firestore Indexes

### Composite Indexes (Must Create Manually)
1. `category` (Ascending) + `createdAt` (Descending)
2. `userId` (Ascending) + `createdAt` (Descending)
3. `isActive` (Ascending) + `createdAt` (Descending)

### Single Field Indexes (Auto-created)
- `createdAt`
- `category`
- `isActive`
- `userId`
- `status`

## Common Mistakes to Avoid

### ❌ Wrong Collection Name
```javascript
db.collection('ads') // ❌ Collection doesn't exist
```

### ❌ Wrong Field Name Case
```javascript
{ is_active: true } // ❌ Use isActive
{ created_at: timestamp } // ❌ Use createdAt
{ isHidden: true } // ❌ Use hidden
```

### ❌ Wrong Field Type
```javascript
{ isActive: 'true' } // ❌ Use boolean, not string
{ priceYER: '1000' } // ❌ Use number, not string
```

### ❌ Missing Required Fields
```javascript
await db.collection('listings').add({
  title: 'Test',
  // ❌ Missing category, priceYER, userId, createdAt, etc.
})
```

### ✅ Correct Example
```javascript
await db.collection('listings').add({
  title: 'Toyota 2020',
  description: 'سيارة نظيفة',
  category: 'cars', // ✅ Valid category
  priceYER: 5000000,
  originalPrice: 5000000,
  originalCurrency: 'YER',
  city: 'صنعاء',
  userId: user.uid,
  userEmail: user.email,
  images: ['url1.jpg'],
  isActive: true, // ✅ Boolean
  views: 0,
  likes: 0,
  createdAt: firebase.firestore.FieldValue.serverTimestamp(),
})
```

## Troubleshooting

### No listings appearing?
1. Check collection name is `listings` (not `ads`)
2. Verify `isActive !== false` filter
3. Verify `hidden !== true` filter
4. Check Firestore rules allow read access
5. Verify composite indexes are created

### Query fails with "index required"?
Create the missing composite index in Firestore console. The error message will provide a direct link.

### Wrong data types?
Ensure boolean fields are actual booleans, not strings:
```javascript
isActive: true // ✅ Boolean
isActive: 'true' // ❌ String
```

## Additional Resources

- Full schema documentation: `FIRESTORE_SCHEMA_VERIFICATION.md`
- Server-side queries: `lib/getListings.server.js`
- REST API: `lib/firestoreRest.js`
- Client queries: `components/CategoryListings.jsx`
