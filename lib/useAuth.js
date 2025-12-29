// lib/useAuth.js
'use client';

import { useEffect, useState, useCallback } from 'react';
import { auth, db } from '@/lib/firebaseClient';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ تسجيل الدخول عبر Google
  const login = useCallback(async () => {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
    } catch (error) {
      console.error('Login error:', error);
      alert('فشل تسجيل الدخول، حاول مرة أخرى.');
    }
  }, []);

  // ✅ تسجيل الخروج
  const logout = useCallback(async () => {
    try {
      await auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  // ✅ مراقبة المستخدم + التحقق من الحظر
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      try {
        if (u) {
          const blockDoc = await db
            .collection('blocked_users')
            .doc(u.uid)
            .get();

          if (blockDoc.exists) {
            await auth.signOut();
            setUser(null);
            setLoading(false);
            alert('تم حظر هذا الحساب من استخدام الموقع');
            return;
          }
        }
        setUser(u || null);
      } catch (err) {
        console.error('Auth state error:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // مهم: نرجّع login + logout مع user, loading
  return { user, loading, login, logout };
}
