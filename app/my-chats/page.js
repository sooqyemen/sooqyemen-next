'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import { useAuth } from '@/lib/useAuth';
import { db } from '@/lib/firebaseClient';

function fmtTime(ts) {
  try {
    const d = ts?.toDate ? ts.toDate() : null;
    if (!d) return '';
    return d.toLocaleString('ar', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return '';
  }
}

export default function MyChatsPage() {
  const { user, loading } = useAuth();
  const [chats, setChats] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!user?.uid) return;

    const unsub = db
      .collection('chats')
      .where('participants', 'array-contains', user.uid)
      .orderBy('updatedAt', 'desc')
      .limit(80)
      .onSnapshot(
        (snap) => {
          const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setChats(arr);
          setErr('');
        },
        (e) => {
          console.error('my-chats error', e);
          setErr('تعذر تحميل المحادثات');
        }
      );

    return () => unsub();
  }, [user?.uid]);

  const rows = useMemo(() => {
    const uid = user?.uid || '';
    return chats.map((c) => {
      const otherUid = Array.isArray(c.participants)
        ? c.participants.find((x) => String(x) !== String(uid))
        : null;

      const otherName =
        (c.participantNames && otherUid && c.participantNames[otherUid]) ||
        (otherUid ? `مستخدم ${String(otherUid).slice(0, 6)}…` : 'محادثة');

      const unread = Number(c.unread && c.unread[uid] ? c.unread[uid] : 0);

      return {
        id: c.id,
        otherUid,
        otherName,
        listingId: c.listingId || null,
        lastText: c.lastMessageText || '',
        updatedAt: c.updatedAt,
        unread,
      };
    });
  }, [chats, user?.uid]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="container" style={{ marginTop: 12 }}>
          <div className="card muted">جاري التحميل...</div>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Header />
        <div className="container" style={{ marginTop: 12 }}>
          <div className="card">سجّل دخولك أولاً لعرض محادثاتك.</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <Link className="btn" href="/">← رجوع</Link>
          <span className="badge">💬 محادثاتي</span>
        </div>

        {err ? (
          <div className="card" style={{ marginTop: 12, color: '#b91c1c' }}>
            {err}
          </div>
        ) : null}

        {rows.length === 0 ? (
          <div className="card" style={{ marginTop: 12 }}>
            لا توجد محادثات بعد.
          </div>
        ) : (
          <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
            {rows.map((c) => (
              <Link
                key={c.id}
                className="card"
                href={`/chat/${encodeURIComponent(c.id)}?listingId=${encodeURIComponent(
                  c.listingId || ''
                )}&otherUid=${encodeURIComponent(c.otherUid || '')}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 900 }}>{c.otherName}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {c.unread > 0 ? (
                      <span
                        style={{
                          background: '#ef4444',
                          color: '#fff',
                          borderRadius: 999,
                          padding: '2px 8px',
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {c.unread}
                      </span>
                    ) : null}
                    <span className="muted" style={{ fontSize: 12 }}>
                      {fmtTime(c.updatedAt)}
                    </span>
                  </div>
                </div>

                <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                  {c.lastText ? c.lastText : '(لا توجد رسائل بعد)'}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
