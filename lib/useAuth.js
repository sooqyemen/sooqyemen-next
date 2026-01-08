'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from './firebaseClient'; // تأكد أن المسار صحيح

const AuthContext = createContext({
  user: null,
  loading: true,
  publicUserId: '',
  logout: async () => {},
});

// توليد رقم المستخدم تلقائيًا بعد تسجيل الدخول
async function ensurePublicIdOnce(firebaseUser) {
  if (!firebaseUser || !firebaseUser.uid) return null;
  
  try {
    const token = await firebaseUser.getIdToken();
    const response = await fetch('/api/public-id', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data.publicId || null;
    }
  } catch (error) {
    console.error('[useAuth] Error generating public ID:', error);
  }
  
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publicUserId, setPublicUserId] = useState('');

  useEffect(() => {
    // نسمع لأي تغيير في حالة تسجيل الدخول
    const unsub = auth.onAuthStateChanged(async (firebaseUser) => {
      console.log('onAuthStateChanged =>', firebaseUser);
      setUser(firebaseUser);
      setLoading(false);
      
      // توليد رقم المستخدم تلقائيًا بعد تسجيل الدخول
      if (firebaseUser) {
        const publicId = await ensurePublicIdOnce(firebaseUser);
        if (publicId) {
          setPublicUserId(publicId);
        }
      } else {
        setPublicUserId('');
      }
    });

    return () => unsub();
  }, []);

  const logout = async () => {
    await auth.signOut();
    setPublicUserId('');
  };

  return (
    <AuthContext.Provider value={{ user, loading, publicUserId, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
