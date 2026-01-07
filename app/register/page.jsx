'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // If user is already logged in, redirect to profile
    if (!loading && user) {
      router.push('/profile');
    }
  }, [user, loading, router]);

  // Since we use Google Sign-In only, redirect to login page
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
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
