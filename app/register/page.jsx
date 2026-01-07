'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Since we use Google Sign-In only, redirect accordingly
    if (!loading) {
      if (user) {
        // User already logged in, go to profile
        router.push('/profile');
      } else {
        // Not logged in, go to login page
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 40, textAlign: 'center' }}>
        <div className="card" style={{ padding: 40 }}>
          <div className="muted">جاري التحميل...</div>
        </div>
      </div>
    );
  }

  return null;
}
