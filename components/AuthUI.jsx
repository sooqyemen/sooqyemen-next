// components/AuthUI.jsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '@/lib/firebaseClient';

const AuthContext = createContext({
  user: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth state changes
    const unsub = auth.onAuthStateChanged((firebaseUser) => {
      console.log('onAuthStateChanged =>', firebaseUser);
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const logout = async () => {
    await auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
