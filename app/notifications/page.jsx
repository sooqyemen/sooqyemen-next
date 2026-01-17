'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import { loadFirebaseClient } from '@/lib/firebaseLoader';

function toMs(ts) {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts.seconds != null) return Number(ts.seconds) * 1000;
  return 0;
}

function formatDate(ms) {
  if (!ms) return '';
  try {
    return new Intl.DateTimeFormat('ar', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toLocaleString();
  }
}

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyAll, setBusyAll] = useState(false);

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  useEffect(() => {
    let unsub = null;
    let cancelled = false;

    const run = async () => {
      setError('');

      if (authLoading) return;
      if (!user) {
        setItems([]);
        setLoading(false);
        return;
      }

      try {
        const { db } = await loadFirebaseClient();
        if (cancelled) return;

        setLoading(true);
        unsub = db
          .collection('notifications')
          .where('userId', '==', user.uid)
          .limit(60)
          .onSnapshot(
            (snap) => {
              const list = [];
              snap.forEach((doc) => {
                const d = doc.data() || {};
                list.push({
                  id: doc.id,
                  title: String(d.title || ''),
                  message: String(d.message || ''),
                  read: Boolean(d.read),
                  createdAtMs: toMs(d.createdAt),
                });
              });
              list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
              setItems(list);
              setLoading(false);
            },
            (err) => {
              console.error('[notifications] snapshot error', err);
              setError('تعذر تحميل الإشعارات. تأكد من صلاحيات Firestore (rules) ثم أعد المحاولة.');
              setLoading(false);
            }
          );
      } catch (e) {
        console.error('[notifications] init error', e);
        setError('تعذر تهيئة Firebase على المتصفح.');
        setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [user?.uid, authLoading]);

  const markOne = async (id) => {
    if (!user || !id) return;
    try {
      const { db } = await loadFirebaseClient();
      await db.collection('notifications').doc(id).set(
        {
          read: true,
          readAt: new Date(),
        },
        { merge: true }
      );
    } catch (e) {
      console.error('[notifications] markOne failed', e);
    }
  };

  const markAll = async () => {
    if (!user) return;
    if (busyAll) return;
    const unread = items.filter((n) => !n.read);
    if (unread.length === 0) return;

    setBusyAll(true);
    try {
      const { db } = await loadFirebaseClient();
      const batch = db.batch();
      unread.forEach((n) => {
        const ref = db.collection('notifications').doc(n.id);
        batch.set(ref, { read: true, readAt: new Date() }, { merge: true });
      });
      await batch.commit();
    } catch (e) {
      console.error('[notifications] markAll failed', e);
    } finally {
      setBusyAll(false);
    }
  };

  if (authLoading) {
    return (
      <div className="container" style={{ paddingTop: 24, paddingBottom: 40 }} dir="rtl">
        <div className="card" style={{ padding: 16 }}>جاري التحميل…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container" style={{ paddingTop: 24, paddingBottom: 40 }} dir="rtl">
        <div className="card" style={{ padding: 18 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>الإشعارات</h1>
          <p className="muted" style={{ marginTop: 10 }}>
            لمشاهدة إشعاراتك، سجل دخول أولاً.
          </p>
          <div className="row" style={{ gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <Link className="btn btnPrimary" href="/login">تسجيل الدخول</Link>
            <Link className="btn" href="/">العودة للرئيسية</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 40 }} dir="rtl">
      <div className="card" style={{ padding: 18 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>الإشعارات</h1>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className="muted">غير مقروء: {unreadCount}</span>
            <button className="btn" onClick={markAll} disabled={busyAll || unreadCount === 0}>
              {busyAll ? 'جارٍ التحديث…' : 'تحديد الكل كمقروء'}
            </button>
          </div>
        </div>

        {error ? (
          <div className="card" style={{ marginTop: 14, padding: 12, border: '1px solid #fecaca', background: '#fef2f2' }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>⚠️</div>
            <div>{error}</div>
          </div>
        ) : null}

        {loading ? (
          <div className="card" style={{ marginTop: 14, padding: 12 }}>جاري تحميل الإشعارات…</div>
        ) : items.length === 0 ? (
          <div className="card" style={{ marginTop: 14, padding: 12 }}>
            لا توجد إشعارات حالياً.
          </div>
        ) : (
          <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
            {items.map((n) => (
              <div
                key={n.id}
                className="card"
                style={{
                  padding: 12,
                  border: n.read ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(37,99,235,0.35)',
                  background: n.read ? '#fff' : 'rgba(37,99,235,0.06)',
                }}
              >
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 4, wordBreak: 'break-word' }}>
                      {n.title || 'إشعار'}
                      {!n.read ? <span style={{ marginInlineStart: 8, fontSize: 12 }}>🟦 جديد</span> : null}
                    </div>
                    {n.message ? (
                      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, wordBreak: 'break-word' }}>{n.message}</div>
                    ) : (
                      <div className="muted">(بدون نص)</div>
                    )}
                    {n.createdAtMs ? (
                      <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>{formatDate(n.createdAtMs)}</div>
                    ) : null}
                  </div>

                  {!n.read ? (
                    <button className="btn" onClick={() => markOne(n.id)} style={{ whiteSpace: 'nowrap' }}>
                      تعليم كمقروء
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="row" style={{ gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <Link className="btn" href="/">العودة للرئيسية</Link>
          <Link className="btn" href="/profile">الملف الشخصي</Link>
        </div>
      </div>
    </div>
  );
}
