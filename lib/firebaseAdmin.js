// lib/firebaseAdmin.js - Server-only Firebase Admin initialization
import 'server-only';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  
  // ✅ التصحيح الشامل للمفتاح الخاص:
  // 1. يعالج مشكلة الأسطر الجديدة (\n).
  // 2. يزيل علامات التنصيص (") من البداية والنهاية إذا كانت موجودة بالخطأ.
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;
  const privateKey = rawKey
    ? rawKey.replace(/\\n/g, '\n').replace(/^"|"$/g, '') 
    : undefined;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn(
      '[FirebaseAdmin] Missing required environment variables. Firebase Admin SDK not initialized.'
    );
  } else {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('[FirebaseAdmin] Initialized successfully');
    } catch (error) {
      console.error('[FirebaseAdmin] Initialization error:', error);
    }
  }
}

// Export Firestore instance
export const adminDb = admin.apps.length ? admin.firestore() : null;
export const adminAuth = admin.apps.length ? admin.auth() : null;

export default admin;
