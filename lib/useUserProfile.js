'use client';

import { useEffect, useState } from 'react';
import { loadFirebaseClient, scheduleIdleCallback } from './firebaseLoader';

const TIMEOUT_MS = 6000; // 6 seconds hard timeout

/**
 * Hook to fetch and manage user profile data from Firestore
 * - Listens to auth.onAuthStateChanged
 * - Fetches user document from users/{uid}
 * - Creates default profile if missing
 * - Has 6 second timeout to prevent infinite loading
 */
export function useUserProfile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let timeoutId = null;
    let unsubAuth = null;
    let unsubProfile = null;
    let cancelled = false;

    // Hard timeout to never stay loading forever
    timeoutId = setTimeout(() => {
      if (cancelled) return;
      setLoading((prev) => {
        if (!prev) return prev;
        console.warn('[useUserProfile] Timeout after 6 seconds');
        setError('timeout');
        return false;
      });
    }, TIMEOUT_MS);

    const startProfileListener = async () => {
      try {
        const { auth, db, firebase } = await loadFirebaseClient();
        if (cancelled) return;

        // Listen to auth state changes
        unsubAuth = auth.onAuthStateChanged(async (firebaseUser) => {
          if (cancelled) return;

          setUser(firebaseUser);

          if (!firebaseUser) {
            // No user logged in
            setProfile(null);
            setLoading(false);
            setError(null);
            if (timeoutId) clearTimeout(timeoutId);
            if (unsubProfile) unsubProfile();
            return;
          }

          // User logged in, fetch profile
          try {
            const userRef = db.collection('users').doc(firebaseUser.uid);

            // First, check if document exists
            const docSnap = await userRef.get();

            if (!docSnap.exists) {
              // Document doesn't exist, create it with default data
              const emailBeforeAt = firebaseUser.email 
                ? firebaseUser.email.split('@')[0] 
                : 'مستخدم';
              
              const defaultName = firebaseUser.displayName || emailBeforeAt || 'مستخدم';

              const defaultProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: defaultName,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
              };

              await userRef.set(defaultProfile, { merge: true });
              
              setProfile({ ...defaultProfile, name: defaultName });
              setLoading(false);
              setError(null);
              if (timeoutId) clearTimeout(timeoutId);
            } else {
              // Document exists, set up real-time listener
              unsubProfile = userRef.onSnapshot(
                (doc) => {
                  if (cancelled) return;
                  if (doc.exists) {
                    const data = doc.data();
                    setProfile({
                      uid: doc.id,
                      ...data,
                    });
                    setLoading(false);
                    setError(null);
                    if (timeoutId) clearTimeout(timeoutId);
                  } else {
                    // Document was deleted after we checked
                    setProfile(null);
                    setLoading(false);
                    if (timeoutId) clearTimeout(timeoutId);
                  }
                },
                (err) => {
                  if (cancelled) return;
                  console.error('[useUserProfile] Firestore error:', err);
                  setError('firestore_error');
                  setLoading(false);
                  if (timeoutId) clearTimeout(timeoutId);
                }
              );
            }
          } catch (err) {
            if (cancelled) return;
            console.error('[useUserProfile] Error fetching profile:', err);
            setError('fetch_error');
            setLoading(false);
            if (timeoutId) clearTimeout(timeoutId);
          }
        });
      } catch (error) {
        console.error('[useUserProfile] Failed to initialize profile listener:', error);
        setError('init_error');
        setLoading(false);
        if (timeoutId) clearTimeout(timeoutId);
      }
    };

    const cancelIdle = scheduleIdleCallback(startProfileListener);

    // Cleanup
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      cancelIdle();
      if (unsubAuth) unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  return {
    user,
    profile,
    loading,
    error,
  };
}
