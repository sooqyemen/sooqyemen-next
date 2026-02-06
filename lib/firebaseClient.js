// lib/firebaseClient.js
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';

const env = (k) => (process.env[k] ? String(process.env[k]).trim() : '');

const isBrowser = typeof window !== 'undefined';

// افتراضياً: نفس إعدادات index.html القديمة (تقدر تغيرها من .env.local)
const firebaseConfig = {
  apiKey: env('NEXT_PUBLIC_FIREBASE_API_KEY'),
  authDomain: env('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  databaseURL: env('NEXT_PUBLIC_FIREBASE_DATABASE_URL'),
  projectId: env('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: env('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: env('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: env('NEXT_PUBLIC_FIREBASE_APP_ID'),
};

if (isBrowser && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = isBrowser ? firebase.auth() : null;
const db = isBrowser ? firebase.firestore() : null;
const storage = isBrowser ? firebase.storage() : null;
const googleProvider = isBrowser ? new firebase.auth.GoogleAuthProvider() : null;

export { firebase, auth, db, storage, googleProvider };
export default firebase;
