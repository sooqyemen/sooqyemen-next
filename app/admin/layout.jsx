// app/admin/layout.jsx
'use client';

import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';

const ADMIN_EMAILS = ['mansouralbarout@gmail.com', 'aboramez965@gmail.com'];

export default function AdminLayout({ children }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  // UI Preview mode - skip auth check
  const uiPreview = searchParams.get('ui') === '1';

  const isAdmin = useMemo(() => {
    const email = (user?.email || '').toLowerCase();
    return !!email && ADMIN_EMAILS.includes(email);
  }, [user?.email]);

  useEffect(() => {
    if (uiPreview) return; // Skip auth check in UI preview mode
    if (loading) return;
    if (!user) router.push('/login');
    else if (!isAdmin) router.push('/');
  }, [loading, user, isAdmin, router, uiPreview]);

  // In UI preview mode, render layout directly
  if (uiPreview) {
    return (
      <div className="container" style={{ paddingTop: 18, paddingBottom: 40 }}>
        <div className="adminLayout">
          <main className="adminCard">{children}</main>
          
          <aside className="adminMenu card">
            <div style={{ fontWeight: 900, marginBottom: 10 }}>لوحة الإدارة</div>
            <div style={{ display: 'grid', gap: 8 }}>
              <Link className="btn" href="/admin?ui=1">🏠 الرئيسية</Link>
              <Link className="btn" href="#preview">📦 الإعلانات</Link>
              <Link className="btn" href="#preview">👥 المستخدمون</Link>
              <Link className="btn" href="#preview">💸 طلبات السحب</Link>
            </div>
          </aside>
        </div>

        <style jsx>{`
          .adminLayout {
            display: grid;
            grid-template-columns: 1fr 320px;
            gap: 16px;
            max-width: 1100px;
            margin: 0 auto;
          }
          .adminLayout * {
            min-width: 0;
          }
          .adminCard, .adminMenu {
            width: 100%;
            min-width: 0;
          }
          .adminMenu {
            padding: 12px;
          }
          .adminMenu .btn {
            width: 100%;
            display: flex;
            min-height: 48px;
          }
          @media (max-width: 900px) {
            .adminLayout {
              grid-template-columns: 1fr;
              padding: 12px;
            }
            .adminMenu {
              order: -1;
            }
            .adminMenu .btn {
              width: 100%;
              display: flex;
              min-height: 48px;
            }
          }
        `}</style>
      </div>
    );
  }

  if (loading || !user || !isAdmin) {
    return (
      <div className="container" style={{ paddingTop: 24 }}>
        <div className="card" style={{ padding: 16 }}>جاري التحقق…</div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 18, paddingBottom: 40 }}>
      <div className="adminLayout">
        <main className="adminCard">{children}</main>
        
        <aside className="adminMenu card">
          <div style={{ fontWeight: 900, marginBottom: 10 }}>لوحة الإدارة</div>
          <div style={{ display: 'grid', gap: 8 }}>
            <Link className="btn" href="/admin">🏠 الرئيسية</Link>
            <Link className="btn" href="/admin/listings">📦 الإعلانات</Link>
            <Link className="btn" href="/admin/users">👥 المستخدمون</Link>
            <Link className="btn" href="/admin/payouts">💸 طلبات السحب</Link>
          </div>
        </aside>
      </div>

      <style jsx>{`
        .adminLayout {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 16px;
          max-width: 1100px;
          margin: 0 auto;
        }
        .adminLayout * {
          min-width: 0;
        }
        .adminCard, .adminMenu {
          width: 100%;
          min-width: 0;
        }
        .adminMenu {
          padding: 12px;
        }
        .adminMenu .btn {
          width: 100%;
          display: flex;
          min-height: 48px;
        }
        @media (max-width: 900px) {
          .adminLayout {
            grid-template-columns: 1fr;
            padding: 12px;
          }
          .adminMenu {
            order: -1;
          }
          .adminMenu .btn {
            width: 100%;
            display: flex;
            min-height: 48px;
          }
        }
      `}</style>
    </div>
  );
}
