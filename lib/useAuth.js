// lib/useAuth.js
'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebaseClient';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      try {
        if (u) {
          // تحقق من الحظر
          const blockDoc = await db.collection('blocked_users').doc(u.uid).get();
          if (blockDoc.exists) {
            await auth.signOut();
            setUser(null);
            setLoading(false);
            return;
          }
        }
        setUser(u || null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  return { user, loading };
}
