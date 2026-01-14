'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { db, firebase } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';

function safeName(user) {
  if (user?.displayName) return user.displayName;
  if (user?.email) return String(user.email).split('@')[0];
  return 'مستخدم';
}

export default function ChatPage() {
  const params = useParams();
  const chatId = params?.id ? String(params.id) : '';

  const { user } = useAuth();
  const uid = user?.uid ? String(user.uid) : '';

  const [text, setText] = useState('');
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const endRef = useRef(null);

  const chatRef = useMemo(() => {
    if (!chatId) return null;
    return db.collection('chats').doc(chatId);
  }, [chatId]);

  const messagesRef = useMemo(() => {
    if (!chatRef) return null;
    return chatRef.collection('messages');
  }, [chatRef]);

  // 1) تأكد من وجود الشات + صفّر unread لك
  useEffect(() => {
    if (!chatId) {
      setLoading(false);
      setErrorMsg('الرابط غير صحيح (chatId مفقود).');
      return;
    }
    if (!chatRef) return;

    (async () => {
      try {
        const snap = await chatRef.get();
        if (!snap.exists) {
          setErrorMsg('المحادثة غير موجودة أو الرابط غير صحيح.');
          setLoading(false);
          return;
        }

        if (uid) {
          await chatRef.set(
            {
              updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
              unread: { [uid]: 0 },
            },
            { merge: true }
          );
        }

        setErrorMsg('');
      } catch (e) {
        console.error('Chat init failed:', e?.code, e?.message, e);
        setErrorMsg(e?.code ? `تعذر فتح المحادثة: ${e.code}` : 'تعذر فتح المحادثة.');
      } finally {
        setLoading(false);
      }
    })();
  }, [chatId, chatRef, uid, user]);

  // 2) استماع للرسائل
  useEffect(() => {
    if (!messagesRef) return;

    const unsub = messagesRef
      .orderBy('createdAt', 'asc')
      .limit(200)
      .onSnapshot(
        (snap) => {
          const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setMsgs(arr);
          setLoading(false);
        },
        (e) => {
          console.error('listen messages failed:', e?.code, e?.message, e);
          setErrorMsg(e?.code ? `تعذر تحميل الرسائل: ${e.code}` : 'تعذر تحميل الرسائل.');
          setLoading(false);
        }
      );

    return () => unsub();
  }, [messagesRef]);

  // 3) سكرول تلقائي
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      const d = ts.toDate();
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // 4) إرسال رسالة
  const send = async (e) => {
    e?.preventDefault?.();

    if (!uid) {
      setErrorMsg('سجّل دخولك لإرسال رسالة.');
      return;
    }
    if (!chatRef || !messagesRef) {
      setErrorMsg('الرابط غير صحيح (chatId مفقود).');
      return;
    }

    const t = String(text || '').trim();
    if (!t) return;

    setSending(true);
    setText('');

    try {
      // أضف الرسالة (نستخدم from لتوافق موحد)
      await messagesRef.add({
        text: t,
        from: uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      // تحديث الشات: unread للطرف الآخر إن وجد
      const snap = await chatRef.get();
      const data = snap.data() || {};
      const participants = Array.isArray(data.participants) ? data.participants.map(String) : [];
      const otherUid = participants.find((p) => p !== uid) || '';

      await chatRef.set(
        {
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastMessageText: t,
          lastMessageBy: uid,
          unread: {
            ...(otherUid ? { [otherUid]: firebase.firestore.FieldValue.increment(1) } : {}),
            [uid]: 0,
          },
        },
        { merge: true }
      );

      setErrorMsg('');
    } catch (e2) {
      console.error('send failed:', e2?.code, e2?.message, e2);
      setErrorMsg(e2?.code ? `فشل الإرسال: ${e2.code}` : 'فشل إرسال الرسالة');
      setText(t);
    } finally {
      setSending(false);
    }
  };

  // حالات العرض
  if (!chatId) {
    return (
      <div className="container" style={{ padding: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>💬 المحادثة</div>
          <div className="muted">الرابط غير صحيح (chatId مفقود).</div>
          <div style={{ height: 10 }} />
          <Link className="btn" href="/my-chats">العودة إلى محادثاتي</Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container" style={{ padding: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>💬 المحادثة</div>
          <div className="muted">يرجى تسجيل الدخول لبدء المحادثة.</div>
          <div style={{ height: 10 }} />
          <Link className="btn" href="/login">تسجيل الدخول</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: 16 }}>
      <div className="card" style={{ padding: 14 }}>
        {/* Header */}
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div className="row" style={{ alignItems: 'center', gap: 10 }}>
            <button className="btn" onClick={() => window.history.back()} type="button" style={{ padding: '6px 10px' }}>
              ←
            </button>

            <div>
              <div style={{ fontWeight: 900 }}>المحادثة</div>
              <div className="muted" style={{ fontSize: 12, direction: 'ltr' }}>{chatId}</div>
            </div>
          </div>

          <Link className="btn" href="/my-chats">محادثاتي</Link>
        </div>

        <div style={{ height: 10 }} />

        {/* Error */}
        {!!errorMsg && (
          <div className="card" style={{ padding: 10, border: '1px solid #fee2e2', background: '#fff1f2', marginBottom: 10 }}>
            <div style={{ fontWeight: 800 }}>تنبيه</div>
            <div className="muted" style={{ marginTop: 4 }}>{errorMsg}</div>
          </div>
        )}

        {/* Messages */}
        <div
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: 10,
            height: 520,
            overflowY: 'auto',
            background: '#fff',
          }}
        >
          {loading ? (
            <div className="muted">جاري تحميل الرسائل...</div>
          ) : msgs.length === 0 ? (
            <div className="muted">ابدأ أول رسالة 👇</div>
          ) : (
            msgs.map((m) => {
              const fromUid = m.senderUid || m.from || '';
              const mine = String(fromUid) === String(uid);
              const name = mine ? 'أنت' : (m.senderName || m.fromName || 'مستخدم');

              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    justifyContent: mine ? 'flex-end' : 'flex-start',
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      maxWidth: '78%',
                      padding: '8px 10px',
                      borderRadius: 12,
                      background: mine ? '#eef2ff' : '#f3f4f6',
                      border: '1px solid #e5e7eb',
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.5,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 2, opacity: 0.85 }}>
                      {name}
                    </div>
                    <div style={{ fontSize: 14 }}>{m.text}</div>
                    <div className="muted" style={{ fontSize: 11, marginTop: 4, textAlign: 'left' }}>
                      {formatTime(m.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        <div style={{ height: 10 }} />

        {/* Input */}
        <form className="row" style={{ gap: 8 }} onSubmit={send}>
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
    </div>
  );
}
