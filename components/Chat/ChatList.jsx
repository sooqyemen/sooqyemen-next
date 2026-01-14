'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';

const unreadBadgeStyle = {
  marginLeft: 8,
  background: '#ef4444',
  color: 'white',
  padding: '2px 8px',
  borderRadius: 12,
  fontSize: 11,
  fontWeight: 'bold',
};

export default function ChatList() {
  const { user } = useAuth();
  const uid = user?.uid ? String(user.uid) : '';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }

    const q = db
      .collection('chats')
      .where('participants', 'array-contains', uid)
      .orderBy('updatedAt', 'desc')
      .limit(50);

    const unsub = q.onSnapshot(
      (snap) => {
        const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setItems(arr);
        setLoading(false);
      },
      (e) => {
        console.error('ChatList error:', e?.code, e?.message, e);
        setItems([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [uid]);

  if (loading) return <div className="muted" style={{ padding: 12 }}>جاري تحميل المحادثات…</div>;
  if (!uid) return <div className="muted" style={{ padding: 12 }}>سجّل دخولك لعرض محادثاتك.</div>;
  if (!items.length) return <div className="muted" style={{ padding: 12 }}>لا توجد محادثات بعد.</div>;

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {items.map((c) => {
        const last = c.lastMessageText ? String(c.lastMessageText) : 'بدون رسائل';
        const title = c.listingTitle ? `📋 ${c.listingTitle}` : '💬 محادثة';
        const unreadCount = c.unread?.[uid] || 0;
        
        return (
          <Link key={c.id} href={`/chat/${c.id}`} className="card" style={{ padding: 12, textDecoration: 'none', position: 'relative' }}>
            <div style={{ fontWeight: 900, marginBottom: 4 }}>
              {title}
              {unreadCount > 0 && (
                <span style={unreadBadgeStyle}>
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>{last}</div>
            <div className="muted" style={{ fontSize: 11, direction: 'ltr' }}>{c.id}</div>
          </Link>
        );
      })}
    </div>
  );
}
