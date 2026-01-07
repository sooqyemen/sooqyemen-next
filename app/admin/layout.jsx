// app/admin/layout.jsx
'use client';

import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';

const ADMIN_EMAILS = ['mansouralbarout@gmail.com', 'aboramez965@gmail.com'];

export default function AdminLayout({ children }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  const isAdmin = useMemo(() => {
    const email = (user?.email || '').toLowerCase();
    return !!email && ADMIN_EMAILS.includes(email);
  }, [user?.email]);

  useEffect(() => {
    if (loading) return;
    if (!user) router.push('/login');
    else if (!isAdmin) router.push('/');
  }, [loading, user, isAdmin, router]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="container" style={{ paddingTop: 24 }}>
        <div className="card" style={{ padding: 16 }}>جاري التحقق…</div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 18, paddingBottom: 40 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <aside className="card" style={{ padding: 12, minWidth: 220 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>لوحة الإدارة</div>
          <div style={{ display: 'grid', gap: 8 }}>
            <Link className="btn" href="/admin">🏠 الرئيسية</Link>
            <Link className="btn" href="/admin/listings">📦 الإعلانات</Link>
            <Link className="btn" href="/admin/users">👥 المستخدمون</Link>
            <Link className="btn" href="/admin/payouts">💸 طلبات السحب</Link>
          </div>
        </aside>

        <main style={{ flex: 1 }}>{children}</main>
      </div>
    </div>
  );
}
