// /components/Chat/ChatBox.jsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { db, firebase } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';

function safeName(user) {
  if (user?.displayName) return user.displayName;
  if (user?.email) return String(user.email).split('@')[0];
  return 'مستخدم';
}

export default function ChatBox({ chatId, listingId, otherUid }) {
  const { user } = useAuth();
  const uid = user?.uid || '';

  const [text, setText] = useState('');
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const endRef = useRef(null);

  const chatRef = useMemo(() => {
    if (!chatId) return null;
    return db.collection('chats').doc(String(chatId));
  }, [chatId]);

  const messagesRef = useMemo(() => {
    if (!chatRef) return null;
    return chatRef.collection('messages');
  }, [chatRef]);

  // ✅ استماع للرسائل
  useEffect(() => {
    if (!messagesRef) return;

    const unsub = messagesRef
      .orderBy('createdAt', 'asc')
      .limit(300)
      .onSnapshot(
        (snap) => {
          const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setMsgs(arr);
          setLoading(false);
          setError('');
        },
        (e) => {
          console.error('messages listen failed', e);
          setLoading(false);
          setError('تعذر تحميل الرسائل.');
        }
      );

    return () => unsub();
  }, [messagesRef]);

  // ✅ سكرول
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      const d = ts.toDate();
      return d.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const send = async (e) => {
    e?.preventDefault?.();
    if (!uid) return alert('سجّل دخولك لإرسال رسالة');
    const t = String(text || '').trim();
    if (!t) return;
    if (!chatRef || !messagesRef) return alert('الرابط غير صحيح');

    setSending(true);
    setText('');

    try {
      // 1) أضف الرسالة
      await messagesRef.add({
        text: t,
        from: uid,
        fromName: safeName(user),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      // 2) حدّث الشات: آخر رسالة + unread
      // unread للطرف الآخر + تصفير لنفسي
      await chatRef.set(
        {
          listingId: listingId || null,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastMessageText: t,
          lastMessageBy: uid,
          participantNames: {
            [uid]: safeName(user),
          },
          unread: {
            ...(otherUid ? { [String(otherUid)]: firebase.firestore.FieldValue.increment(1) } : {}),
            [uid]: 0,
          },
        },
        { merge: true }
      );
    } catch (e2) {
      console.error('send failed', e2);
      setError('فشل إرسال الرسالة.');
      setText(t);
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      {/* Messages */}
      <div
        style={{
          border: '1px solid rgba(0,0,0,.08)',
          borderRadius: 14,
          padding: 12,
          height: 520,
          overflowY: 'auto',
          background: '#fff',
        }}
      >
        {loading ? (
          <div className="muted">جاري تحميل الرسائل...</div>
        ) : error ? (
          <div className="muted">{error}</div>
        ) : msgs.length === 0 ? (
          <div className="muted">ابدأ أول رسالة 👇</div>
        ) : (
          msgs.map((m) => {
            const mine = String(m.from) === String(uid);
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  justifyContent: mine ? 'flex-start' : 'flex-end',
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '10px 12px',
                    borderRadius: 14,
                    background: mine ? 'rgba(59,130,246,.10)' : 'rgba(15,23,42,.06)',
                    border: '1px solid rgba(0,0,0,.08)',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.6,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 4, opacity: 0.85 }}>
                    {mine ? 'أنت' : (m.fromName || 'مستخدم')}
                  </div>
                  <div style={{ fontSize: 14 }}>{m.text}</div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 6, textAlign: 'left' }}>
                    {formatTime(m.createdAt)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form className="row" style={{ gap: 10, marginTop: 12, alignItems: 'center' }} onSubmit={send}>
        <input
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="اكتب رسالة..."
          disabled={sending}
        />
        <button className="btn btnPrimary" type="submit" disabled={sending || !text.trim()}>
          {sending ? '...' : 'إرسال'}
        </button>
      </form>
    </div>
  );
}
