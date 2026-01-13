// components/Chat/ChatBox.jsx
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
  const uid = user?.uid || null;

  const [text, setText] = useState('');
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const scrollerRef = useRef(null);

  const chatRef = useMemo(() => {
    if (!chatId) return null;
    return db.collection('chats').doc(String(chatId));
  }, [chatId]);

  const messagesRef = useMemo(() => {
    if (!chatRef) return null;
    return chatRef.collection('messages');
  }, [chatRef]);

  // ✅ تأكيد وجود وثيقة الشات (ومشاركين) — مهم جدًا لقواعد Firestore
  const ensureChatDoc = async () => {
    if (!uid || !chatRef) throw new Error('missing uid/chatRef');
    if (!otherUid) throw new Error('missing otherUid');

    const snap = await chatRef.get();
    const participants = [uid, otherUid].filter(Boolean);

    if (!snap.exists) {
      await chatRef.set(
        {
          participants,
          listingId: listingId || null,
          blockedBy: [],
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastMessageText: '',
          lastMessageBy: null,
          lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
          participantNames: {
            [uid]: safeName(user),
          },
          unread: {
            [uid]: 0,
            [otherUid]: 0,
          },
        },
        { merge: true }
      );
      return;
    }

    // موجود: حدّث الاسم وصفر unread لنفسك بدون ما تمسح باقي القيم
    await chatRef.set(
      {
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        participantNames: { [uid]: safeName(user) },
        [`unread.${uid}`]: 0,
      },
      { merge: true }
    );
  };

  // ✅ عند فتح المحادثة: تأكد من وجودها + صفّر غير المقروء لك
  useEffect(() => {
    if (!uid || !chatRef || !otherUid) return;

    (async () => {
      try {
        await ensureChatDoc();
      } catch (e) {
        // لا نوقف الصفحة هنا — فقط نسجل
        console.error('ensureChatDoc failed:', e?.message || e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, chatRef, otherUid, listingId]);

  // ✅ الاستماع للرسائل
  useEffect(() => {
    if (!messagesRef || !uid) return;

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
          console.error('listen messages failed:', e);
          setLoading(false);
        }
      );

    return () => unsub();
  }, [messagesRef, uid]);

  // ✅ Auto scroll لآخر رسالة
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight + 200;
  }, [msgs.length]);

  const send = async () => {
    if (!uid) {
      alert('سجّل دخولك لإرسال رسالة');
      return;
    }
    if (!chatId || !chatRef || !messagesRef) {
      alert('المحادثة غير جاهزة (chatId مفقود).');
      return;
    }
    if (!otherUid) {
      alert('تعذر تحديد الطرف الآخر للمحادثة.');
      return;
    }

    const t = String(text || '').trim();
    if (!t) return;

    setSending(true);

    try {
      // ✅ مهم: تأكد من وجود وثيقة الشات قبل الإرسال (حتى لا تفشل rules)
      await ensureChatDoc();

      // 1) إضافة الرسالة
      await messagesRef.add({
        text: t,
        // للتوافق مع أي كود قديم/جديد
        from: uid,
        senderId: uid,
        fromName: safeName(user),
        senderName: safeName(user),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      // 2) تحديث الشات: آخر رسالة + عداد unread (بدون مسح باقي المفاتيح)
      await chatRef.set(
        {
          listingId: listingId || null,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          lastMessageText: t,
          lastMessageBy: uid,
          lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
          participantNames: {
            [uid]: safeName(user),
          },
          [`unread.${otherUid}`]: firebase.firestore.FieldValue.increment(1),
          [`unread.${uid}`]: 0,
        },
        { merge: true }
      );

      // ✅ امسح حقل الكتابة بعد نجاح الإرسال
      setText('');
    } catch (e) {
      console.error('send failed', e);
      // عرض سبب مفيد بدل "فشل إرسال" فقط
      const msg =
        e?.code === 'permission-denied'
          ? 'فشل الإرسال: الصلاحيات تمنع الإرسال (راجع Firestore Rules أو المشاركين).'
          : 'فشل إرسال الرسالة';
      alert(msg);
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return <div className="card">سجّل دخولك لبدء المحادثة.</div>;
  }

  return (
    <div className="card">
      <div style={{ fontWeight: 900, marginBottom: 10 }}>💬 المحادثة</div>

      <div
        ref={scrollerRef}
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 10,
          height: 420,
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
            const fromId = m.from || m.senderId;
            const mine = String(fromId) === String(uid);
            const name = m.fromName || m.senderName || 'مستخدم';

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
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      marginBottom: 2,
                      opacity: 0.8,
                    }}
                  >
                    {mine ? 'أنت' : name}
                  </div>
                  <div style={{ fontSize: 14 }}>{m.text}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="row" style={{ gap: 8, marginTop: 10 }}>
        <input
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="اكتب رسالة..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (!sending) send();
            }
          }}
          disabled={sending}
        />
        <button className="btn btnPrimary" onClick={send} disabled={sending}>
          {sending ? '...' : 'إرسال'}
        </button>
      </div>
    </div>
  );
}
