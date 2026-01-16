# Firestore Console Verification Checklist

**Date**: 2026-01-08  
**Purpose**: Verify Firestore database matches the codebase expectations

---

## Step 1: Access Firestore Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (likely: `sooqyemen` or similar)
3. Navigate to **Firestore Database** from the left sidebar
4. You should see the **Data** tab

---

## Step 2: Verify Collection Name

### ✅ Check: Collection exists with correct name

- [ ] Collection named **`listings`** exists in Firestore
- [ ] **No collection named `ads`** exists (or if it exists, it's not being used)

**Expected Result**: You should see a collection called `listings` in the root of your database.

**If Failed**: 
- If you see `ads` instead of `listings`, you need to either:
  - Rename the collection to `listings` (requires migration)
  - OR update all code references from `listings` to `ads`

---

## Step 3: Verify Documents Exist

### ✅ Check: Collection has documents

- [ ] The `listings` collection contains at least 1 document
- [ ] Documents have valid IDs (auto-generated or custom)

**Expected Result**: Clicking on the `listings` collection should show a list of documents.

**If Failed**:
- If collection is empty, the website will show "no listings available"
- Create test listings using the website's "Add Listing" feature

---

## Step 4: Verify Field Names (Case-Sensitive)

Click on any document in the `listings` collection and verify the field names match **exactly** (case matters!):

### ✅ Required Core Fields

- [ ] **`createdAt`** - Type: `timestamp` (not `created_at` or `CreatedAt`)
- [ ] **`isActive`** - Type: `boolean` (not `is_active` or `IsActive`)
- [ ] **`category`** - Type: `string` (not `Category`)
- [ ] **`title`** - Type: `string`
- [ ] **`description`** - Type: `string`
- [ ] **`priceYER`** - Type: `number` (not `price_yer` or `priceYer`)
- [ ] **`userId`** - Type: `string` (not `user_id` or `UserId`)
- [ ] **`images`** - Type: `array` (of strings)

### ✅ Optional but Important Fields

- [ ] **`hidden`** - Type: `boolean` (if exists, NOT `isHidden`)
- [ ] **`status`** - Type: `string` (if exists, values: 'active' or 'sold')
- [ ] **`city`** - Type: `string`
- [ ] **`views`** - Type: `number`
- [ ] **`originalPrice`** - Type: `number`
- [ ] **`originalCurrency`** - Type: `string`

**Critical Notes**:
- ⚠️ Field names are **case-sensitive**
- ⚠️ Use `hidden` (not `isHidden`)
- ⚠️ Use `isActive` (not `is_active`)
- ⚠️ Use `priceYER` (not `priceYer` or `price_yer`)

**If Failed**:
- Document the incorrect field names
- You'll need to migrate data to use correct field names
- OR update all code to match the actual field names in Firestore

---

## Step 5: Verify Field Types

### ✅ Check: Fields have correct data types

For each field, verify the type shown in Firestore console:

| Field | Expected Type | Common Mistakes |
|-------|---------------|-----------------|
| `createdAt` | **timestamp** | ❌ string, ❌ number |
| `isActive` | **boolean** | ❌ string "true"/"false" |
| `hidden` | **boolean** | ❌ string "true"/"false" |
| `priceYER` | **number** | ❌ string "1000" |
| `views` | **number** | ❌ string "0" |
| `category` | **string** | ✅ string |
| `status` | **string** | ✅ string |
| `userId` | **string** | ✅ string |
| `images` | **array** | ❌ string |
| `coords` | **array** | ✅ array of numbers |

**If Failed**:
- Boolean fields stored as strings will cause filtering issues
- Number fields stored as strings will cause sorting issues
- Must fix data types or update code logic

---

## Step 6: Verify Category Values

### ✅ Check: Categories use valid English keys

Click on a few documents and check the `category` field:

- [ ] Categories use English keys (e.g., `'cars'`, `'phones'`)
- [ ] **NOT** Arabic text (e.g., ~~'سيارات'~~)
- [ ] **NOT** mixed case (e.g., ~~'Cars'~~, ~~'CARS'~~)

**Valid category values** (all lowercase, 16 total):
```
'cars', 'phones', 'electronics', 'realestate', 'motorcycles',
'heavy_equipment', 'solar', 'networks', 'maintenance', 
'furniture', 'home_tools', 'clothes', 'animals', 'jobs', 
'services', 'other'
```

**If Failed**:
- If categories use Arabic or different format, queries will fail
- Need to standardize all category values

---

## Step 7: Verify Visibility Logic

### ✅ Check: At least some listings should be visible

Sample 3-5 documents and verify:

- [ ] At least one document has `isActive: true`
- [ ] At least one document has `hidden: false` (or field doesn't exist)
- [ ] At least one document matches: `isActive === true AND hidden !== true`

**Expected Result**: Website filters listings using:
```javascript
listing.isActive !== false && listing.hidden !== true
```

So listings should be visible if:
- `isActive` is `true` OR field doesn't exist
- AND `hidden` is `false` OR field doesn't exist

**If Failed**:
- If all listings have `isActive: false`, none will show
- If all listings have `hidden: true`, none will show
- Update at least one document to be visible

---

## Step 8: Verify Required Indexes

Go to **Firestore Database** → **Indexes** tab

### ✅ Single Field Indexes (Usually Auto-Created)

Check that indexes exist for:
- [ ] `createdAt` (Descending)
- [ ] `category` (Ascending)
- [ ] `isActive` (Ascending)
- [ ] `userId` (Ascending)

### ✅ Composite Indexes (Must Create Manually)

Check that composite indexes exist:

1. [ ] **Index 1**: 
   - Collection: `listings`
   - Fields: `category` (Ascending) + `createdAt` (Descending)
   - Status: Enabled

2. [ ] **Index 2**:
   - Collection: `listings`
   - Fields: `userId` (Ascending) + `createdAt` (Descending)
   - Status: Enabled

3. [ ] **Index 3**:
   - Collection: `listings`
   - Fields: `isActive` (Ascending) + `createdAt` (Descending)
   - Status: Enabled

**If Missing**:
- Website will show "index required" errors in console
- The error will include a direct link to create the index
- Click the link and create the index (takes a few minutes)

---

## Step 9: Test a Query Manually

In Firestore console, try to filter the collection:

### Test 1: Filter by category
1. Click on `listings` collection
2. Click **"Add filter"**
3. Field: `category`, Operator: `==`, Value: `cars`
4. Click **"Apply"**

- [ ] Query returns results (if you have car listings)
- [ ] **OR** Shows index required error (create the index)

### Test 2: Order by createdAt
1. Clear previous filter
2. Click **"Order by"**
3. Field: `createdAt`, Direction: `Descending`
4. Click **"Apply"**

- [ ] Listings are ordered from newest to oldest
- [ ] Newest listings appear first

---

## Step 10: Verify Sample Document Structure

Expand one complete document and verify it looks similar to this:

```javascript
{
  // Required core fields
  "title": "سيارة تويوتا 2020",
  "description": "سيارة نظيفة للبيع",
  "category": "cars",                        // ✅ lowercase English key
  "createdAt": Timestamp(2026, 0, 7, ...),  // ✅ Firestore Timestamp
  
  // Required price fields
  "priceYER": 5000000,                       // ✅ Number
  "originalPrice": 5000000,                  // ✅ Number
  "originalCurrency": "YER",
  
  // Required user fields
  "userId": "abc123xyz",                     // ✅ String
  "userEmail": "user@example.com",
  
  // Required visibility
  "isActive": true,                          // ✅ Boolean (not "true")
  
  // Optional visibility
  "hidden": false,                           // ✅ Boolean (NOT "isHidden")
  "status": "active",                        // ✅ String
  
  // Location
  "city": "صنعاء",
  "coords": [15.3694, 44.1910],             // ✅ Array of numbers
  
  // Images
  "images": ["url1.jpg", "url2.jpg"],       // ✅ Array of strings
  
  // Stats
  "views": 42,                               // ✅ Number
  "likes": 5,                                // ✅ Number
}
```

**Key Checks**:
- [ ] Booleans are `true`/`false` (not strings `"true"`/`"false"`)
- [ ] Numbers are numbers (not strings `"1000"`)
- [ ] Arrays are arrays (not strings or objects)
- [ ] Timestamp fields use Firestore Timestamp type
- [ ] Field names match exactly (case-sensitive)

---

## Summary Checklist

Before marking this task as complete, ensure:

- [ ] ✅ Collection name is `listings` (not `ads`)
- [ ] ✅ Collection contains documents
- [ ] ✅ Field names match codebase exactly (case-sensitive)
- [ ] ✅ Field types are correct (boolean, number, timestamp, string, array)
- [ ] ✅ Category values use English lowercase keys
- [ ] ✅ At least some listings are visible (isActive=true, hidden=false)
- [ ] ✅ Required composite indexes exist
- [ ] ✅ Sample queries work without errors

---

## Common Issues and Solutions

### Issue: Collection named `ads` instead of `listings`
**Solution**: Either migrate the collection or update all code references.

### Issue: Field names don't match (e.g., `is_active` vs `isActive`)
**Solution**: Use Firestore data migration script or update code to match.

### Issue: Boolean fields are strings
**Solution**: Update documents to use proper boolean values.

### Issue: Missing indexes
**Solution**: Create indexes via Firestore console or click link in error message.

### Issue: All listings have `hidden: true`
**Solution**: Update documents to have `hidden: false` or remove the field.

### Issue: Categories in Arabic
**Solution**: Migrate category values to English keys.

---

## Next Steps After Verification

Once all items are checked:

1. ✅ Update issue tracker with verification results
2. ✅ Document any discrepancies found
3. ✅ Create migration plan if data fixes are needed
4. ✅ Test website functionality with verified schema

---

**Verification Completed By**: _________________  
**Date**: _________________  
**Status**: ⬜ Pass  ⬜ Fail (with issues documented)
