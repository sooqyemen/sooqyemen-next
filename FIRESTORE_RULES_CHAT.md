# Firestore Security Rules - Chat System

## Overview
This document explains the Firestore security rules for the chat system.

## Rules Structure

### Chats Collection (`/chats/{chatId}`)

#### Read Access
- User must be authenticated
- User must be in the `participants` array of the chat document

#### Write Access (Create/Update)
- User must be authenticated
- User must be in the `participants` array in the new document data

### Messages Subcollection (`/chats/{chatId}/messages/{messageId}`)

#### Read Access
- User must be authenticated
- User must be a participant in the parent chat document

#### Create Access
Messages can only be created if ALL of the following conditions are met:
1. User is authenticated
2. User is a participant in the parent chat
3. The `from` field equals the authenticated user's UID
4. The `text` field is a string between 1-2000 characters
5. Required fields are present: `from`, `text`, `createdAt`

**Note:** We do NOT enforce `createdAt is timestamp` because Firebase's `serverTimestamp()` initially writes as null and then updates to a timestamp, which can cause validation failures.

## Message Format

All messages must use this standardized format:

```javascript
{
  from: uid,                                              // Required: sender's UID
  text: string,                                           // Required: message text (1-2000 chars)
  createdAt: firebase.firestore.FieldValue.serverTimestamp()  // Required: timestamp
}
```

## Deploying Rules

To deploy these rules to your Firebase project:

```bash
firebase deploy --only firestore:rules
```

Or manually copy the contents of `firestore.rules` to the Firebase Console:
1. Go to Firebase Console
2. Navigate to Firestore Database
3. Click on "Rules" tab
4. Paste the rules
5. Click "Publish"

## Testing Rules

You can test these rules in the Firebase Console using the Rules Playground:
1. Go to Firestore Database > Rules
2. Click on "Rules playground"
3. Test different scenarios with authenticated/unauthenticated users

## Backward Compatibility

The message display code supports both old and new message formats:
- New format: `from` field
- Old format: `senderUid` field (for backward compatibility)

The display code checks both fields:
```javascript
const fromUid = m.senderUid || m.from || '';
```

This ensures existing messages continue to display correctly while new messages use the standardized format.
