// /app/chat/[id]/page.js
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db, firebase } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';
import ChatBox from '@/components/Chat/ChatBox';

function safeName(user) {
  if (user?.displayName) return user.displayName;
  if (user?.email) return String(user.email).split('@')[0];
  return 'مستخدم';
}

function makeChatId(uid1, uid2, listingId) {
  const a = String(uid1 || '');
  const b = String(uid2 || '');
  const sorted = [a, b].sort().join('_');
  return `${sorted}__${String(listingId || '')}`;
}

export default function ChatPage({ params, searchParams }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const chatId = useMemo(() => {
    const id = params?.id ? decodeURIComponent(String(params.id)) : '';
    return id || '';
  }, [params]);

  const listingId = useMemo(() => {
    const v = searchParams?.listingId ? String(searchParams.listingId) : '';
    return v || '';
  }, [searchParams]);

  const otherUidFromQS = useMemo(() => {
    const v = searchParams?.otherUid ? String(searchParams.otherUid) : '';
    return v || '';
  }, [searchParams]);

  const uid = user?.uid || '';

  const chatRef = useMemo(() => {
    if (!chatId) return null;
    return db.collection('chats').doc(String(chatId));
  }, [chatId]);

  const [ready, setReady] = useState(false);
  const [err, setErr] = useState('');
  const [chatDoc, setChatDoc] = useState(null);
  const [otherUid, setOtherUid] = useState('');
  const [otherName, setOtherName] = useState('');
  const [blocked, setBlocked] = useState(false);

  const endTopRef = useRef(null);

  // ✅ تحقق سريع من chatId
  useEffect(() => {
    if (!chatId) setErr('الرابط غير صحيح (chatId مفقود).');
    else setErr('');
  }, [chatId]);

  // ✅ تجهيز/إنشاء المحادثة إذا غير موجودة (منع اللوب)
  useEffect(() => {
    if (!chatRef) return;
    if (authLoading) return;

    if (!user) {
      setReady(true);
      return;
    }

    let alive = true;

    (async () => {
      try {
        setErr('');
        setReady(false);

        const snap = await chatRef.get();

        // إذا غير موجود: نحاول ننشئه بشرط وجود listingId + otherUid
        if (!snap.exists) {
          if (!listingId || !otherUidFromQS) {
            if (!alive) return;
            setErr('المحادثة غير موجودة. افتحها من زر "بدء محادثة" داخل الإعلان.');
            setReady(true);
            return;
          }

          // تأكد أن chatId هو نفسه المتوقع (ثابت وغير عشوائي)
          const expected = makeChatId(uid, otherUidFromQS, listingId);
          // لو chatId مختلف جداً: ما نمنع، بس الأفضل يكون ثابت
          // إذا تريد إلزام 100% احذف الشرط التالي وخليها refuse
          // هنا نخليها تنشئ على نفس chatId القادم بالرابط
          const participants = [uid, otherUidFromQS].filter(Boolean);

          await chatRef.set(
            {
              participants,
              listingId,
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
              lastMessageText: '',
              lastMessageBy: null,
              blockedBy: [],
              participantNames: {
                [uid]: safeName(user),
              },
              unread: {
                [uid]: 0,
              },
            },
            { merge: true }
          );
        }

        // تصفير غير المقروء لك عند فتح الصفحة
        await chatRef.set(
          {
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            participantNames: { [uid]: safeName(user) },
            unread: { [uid]: 0 },
          },
          { merge: true }
        );

        if (!alive) return;
        setReady(true);
      } catch (e) {
        console.error('chat init failed:', e);
        if (!alive) return;
        setErr('حدث خطأ أثناء فتح المحادثة.');
        setReady(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [chatRef, authLoading, user, uid, listingId, otherUidFromQS]);

  // ✅ الاستماع لوثيقة الشات (للتحقق من المشاركين + الحجب + اسم الطرف الآخر)
  useEffect(() => {
    if (!chatRef) return;
    if (!uid) return;

    const unsub = chatRef.onSnapshot(
      async (snap) => {
        if (!snap.exists) return;

        const data = { id: snap.id, ...(snap.data() || {}) };
        setChatDoc(data);

        const participants = Array.isArray(data.participants) ? data.participants : [];
        if (participants.length && !participants.includes(uid)) {
          setErr('ليس لديك صلاحية الوصول إلى هذه المحادثة.');
          return;
        }

        const other = otherUidFromQS || participants.find((p) => String(p) !== String(uid)) || '';
        setOtherUid(other);

        // حجب؟
        const blockedBy = Array.isArray(data.blockedBy) ? data.blockedBy : [];
        setBlocked(blockedBy.includes(uid));

        // اسم الطرف الآخر (من participantNames أو users)
        const names = data.participantNames || {};
        const nameFromDoc = other ? names[other] : '';
        if (nameFromDoc) {
          setOtherName(String(nameFromDoc));
        } else if (other) {
          try {
            const uSnap = await db.collection('users').doc(String(other)).get();
            if (uSnap.exists) {
              const u = uSnap.data() || {};
              setOtherName(String(u.name || u.displayName || (u.email ? String(u.email).split('@')[0] : 'مستخدم')));
            } else {
              setOtherName('مستخدم');
            }
          } catch {
            setOtherName('مستخدم');
          }
        }

        setErr('');
      },
      (e) => {
        console.error('chat snapshot error:', e);
        setErr('تعذر تحميل بيانات المحادثة.');
      }
    );

    return () => unsub();
  }, [chatRef, uid, otherUidFromQS]);

  // سكرول أعلى عند فتح
  useEffect(() => {
    endTopRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatId]);

  const toggleBlock = async () => {
    if (!chatRef || !uid || !chatDoc) return;
    try {
      const arr = Array.isArray(chatDoc.blockedBy) ? chatDoc.blockedBy : [];
      const exists = arr.includes(uid);

      await chatRef.set(
        {
          blockedBy: exists
            ? arr.filter((x) => String(x) !== String(uid))
            : [...arr, uid],
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } catch (e) {
      console.error('toggle block failed', e);
      alert('حدث خطأ.');
    }
  };

  // ---------- حالات العرض ----------
  if (!chatId) {
    return (
      <div className="container" style={{ padding: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>💬 المحادثة</div>
          <div className="muted">الرابط غير صحيح (chatId مفقود).</div>
          <div className="row" style={{ gap: 10, marginTop: 12 }}>
            <Link className="btn" href="/my-chats">العودة للمحادثات</Link>
          </div>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="container" style={{ padding: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div className="muted">جاري التحقق من تسجيل الدخول...</div>
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
          <div className="row" style={{ gap: 10, marginTop: 12 }}>
            <Link className="btn btnPrimary" href="/login">تسجيل الدخول</Link>
            <Link className="btn" href="/my-chats">العودة للمحادثات</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!ready && !err) {
    return (
      <div className="container" style={{ padding: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div className="muted">جاري فتح المحادثة...</div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="container" style={{ padding: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>حدث خطأ</div>
          <div className="muted">{err}</div>
          <div className="row" style={{ gap: 10, marginTop: 12 }}>
            <button className="btn" onClick={() => router.push('/my-chats')}>العودة للمحادثات</button>
            <button className="btn btnPrimary" onClick={() => window.location.reload()}>إعادة المحاولة</button>
          </div>
        </div>
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="container" style={{ padding: 16 }}>
        <div className="card" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>🚫</div>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>المحادثة محجوبة</div>
          <div className="muted">قمت بحجب هذه المحادثة.</div>
          <div className="row" style={{ gap: 10, marginTop: 12, justifyContent: 'center' }}>
            <button className="btn btnPrimary" onClick={toggleBlock}>إلغاء الحجب</button>
            <Link className="btn" href="/my-chats">العودة</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: 16 }}>
      <div ref={endTopRef} />
      <div className="card" style={{ padding: 14 }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            borderBottom: '1px solid rgba(0,0,0,.06)',
            paddingBottom: 10,
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <button className="btn" type="button" onClick={() => router.push('/my-chats')} style={{ padding: '6px 10px' }}>
              ←
            </button>

            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {otherName ? otherName : 'محادثة'}
              </div>
              <div className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {listingId ? `إعلان: ${listingId}` : chatId}
              </div>
            </div>
          </div>

          <div className="row" style={{ gap: 8 }}>
            {listingId ? (
              <Link className="btn" href={`/listing/${encodeURIComponent(listingId)}`} target="_blank" rel="noopener noreferrer">
                📄 الإعلان
              </Link>
            ) : null}

            <button className="btn" type="button" onClick={toggleBlock} title="حجب/إلغاء الحجب">
              🚫
            </button>
          </div>
        </div>

        {/* Body */}
        <ChatBox chatId={chatId} listingId={listingId || null} otherUid={otherUid || otherUidFromQS || null} />
      </div>
    </div>
  );
}
