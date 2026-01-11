'use client';

import { createContext, useContext, useEffect, useState } from 'react';

let firebaseClientPromise = null;

const loadFirebaseClient = () => {
  if (!firebaseClientPromise) {
    firebaseClientPromise = import('./firebaseClient');
  }
  return firebaseClientPromise;
};

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
    let unsub = null;
    let cancelled = false;
    let idleId = null;

    const startAuthListener = async () => {
      try {
        const { auth } = await loadFirebaseClient();
        if (cancelled) return;

        unsub = auth.onAuthStateChanged(async (firebaseUser) => {
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
      } catch (error) {
        console.error('[useAuth] Failed to initialize auth listener:', error);
        setLoading(false);
      }
    };

    if (typeof requestIdleCallback === 'function') {
      idleId = requestIdleCallback(startAuthListener, { timeout: 1200 });
    } else {
      idleId = setTimeout(startAuthListener, 300);
    }

    return () => {
      cancelled = true;
      if (typeof cancelIdleCallback === 'function' && idleId) {
        cancelIdleCallback(idleId);
      } else if (idleId) {
        clearTimeout(idleId);
      }
      if (unsub) unsub();
    };
  }, []);

  const logout = async () => {
    const { auth } = await loadFirebaseClient();
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
