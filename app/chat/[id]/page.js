// app/chat/[id]/page.js
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { db, firebase } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';

function safeName(user) {
  if (user?.displayName) return user.displayName;
  if (user?.email) return String(user.email).split('@')[0];
  return 'مستخدم';
}

export default function ChatPage({ params }) {
  const searchParams = useSearchParams();

  // ✅ Next 14: params كائن طبيعي
  const chatId = params?.id ? String(params.id) : null;

  // اختياري: /chat/ID?otherUid=XXX&listingId=YYY
  const otherUid = searchParams.get('otherUid') ? String(searchParams.get('otherUid')) : null;
  const listingId = searchParams.get('listingId') ? String(searchParams.get('listingId')) : null;

  const { user } = useAuth();
  const uid = user?.uid || null;

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

  // 1) تهيئة الشات
  useEffect(() => {
    if (!chatRef || !chatId) return;

    let cancelled = false;

    (async () => {
      try {
        if (!uid) {
          if (!cancelled) {
            setLoading(false);
            setErrorMsg('يرجى تسجيل الدخول لبدء المحادثة.');
          }
          return;
        }

        const snap = await chatRef.get();

        if (!snap.exists) {
          if (!otherUid) {
            if (!cancelled) {
              setLoading(false);
              setErrorMsg('المحادثة غير موجودة. ابدأ محادثة من داخل الإعلان.');
            }
            return;
          }

          const participants = [uid, otherUid].filter(Boolean);

          await chatRef.set(
            {
              participants,
              listingId: listingId || null,
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
              lastMessageText: '',
              lastMessageBy: null,
              participantNames: { [uid]: safeName(user) },
              unread: { [uid]: 0 },
            },
            { merge: true }
          );
        } else {
          await chatRef.set(
            {
              updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
              participantNames: { [uid]: safeName(user) },
              unread: { [uid]: 0 },
            },
            { merge: true }
          );
        }

        if (!cancelled) {
          setErrorMsg('');
          setLoading(false);
        }
      } catch (e) {
        console.error('Chat init failed', e);
        if (!cancelled) {
          setLoading(false);
          setErrorMsg('حدث خطأ أثناء فتح المحادثة (تحقق من Firestore Rules).');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chatRef, chatId, uid, otherUid, listingId, user]);

  // 2) الاستماع للرسائل
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
          console.error('listen messages failed', e);
          setErrorMsg('تعذر تحميل الرسائل (تحقق من الصلاحيات).');
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

    if (!uid) return alert('سجّل دخولك لإرسال رسالة');
    if (!chatRef || !messagesRef) return alert('الرابط غير صحيح (chatId مفقود).');

    const t = String(text || '').trim();
    if (!t) return;

    setSending(true);
    setText('');

    try {
      await messagesRef.add({
        text: t,
        from: uid,
        fromName: safeName(user),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      const snap = await chatRef.get();
      const data = snap.data() || {};
      const participants = Array.isArray(data.participants) ? data.participants : [];
      const other = participants.find((p) => String(p) !== String(uid)) || otherUid || null;

      await chatRef.set(
        {
          listingId: data.listingId || listingId || null,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastMessageText: t,
          lastMessageBy: uid,
          participantNames: { [uid]: safeName(user) },
          unread: {
            ...(other ? { [other]: firebase.firestore.FieldValue.increment(1) } : {}),
            [uid]: 0,
          },
        },
        { merge: true }
      );
    } catch (e2) {
      console.error('send failed', e2);
      alert('فشل إرسال الرسالة (Firestore Rules تمنع الإرسال).');
      setText(t);
    } finally {
      setSending(false);
    }
  };

  if (!chatId) {
    return (
      <div className="container" style={{ padding: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>💬 المحادثة</div>
          <div className="muted">الرابط غير صحيح (chatId مفقود).</div>
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
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: 16 }}>
      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn" onClick={() => window.history.back()} type="button" style={{ padding: '6px 10px' }}>
              ←
            </button>

            <div>
              <div style={{ fontWeight: 900 }}>المحادثة</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {chatId}
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: 10 }} />

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
          ) : errorMsg ? (
            <div className="muted">{errorMsg}</div>
          ) : msgs.length === 0 ? (
            <div className="muted">ابدأ أول رسالة 👇</div>
          ) : (
            msgs.map((m) => {
              const mine = String(m.from) === String(uid);
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-start' : 'flex-end', marginBottom: 8 }}>
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
                    <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 2, opacity: 0.85 }}>
                      {mine ? 'أنت' : m.fromName || 'مستخدم'}
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

        <form className="row" style={{ gap: 8 }} onSubmit={send}>
          <input
            className="input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="اكتب رسالة..."
            disabled={sending || !!errorMsg}
          />
          <button className="btn btnPrimary" type="submit" disabled={sending || !text.trim() || !!errorMsg}>
            {sending ? '...' : 'إرسال'}
          </button>
        </form>
      </div>
    </div>
  );
}
