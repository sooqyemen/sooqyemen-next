// app/chat/[id]/page.jsx
'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { db, firebase } from '@/lib/firebaseClient'; // ✅ compat
import { useAuth } from '@/lib/useAuth';
import ChatBox from '@/components/Chat/ChatBox';

function ChatPageContent({ chatId }) {
  const router = useRouter();
  const sp = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const listingId = sp?.get('listingId') || null;
  const otherUidParam = sp?.get('otherUid') || null;

  const [chatData, setChatData] = useState(null);
  const [listing, setListing] = useState(null);
  const [otherUser, setOtherUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);

  const isAdmin = useMemo(() => {
    const email = String(user?.email || '').toLowerCase();
    return email === 'mansouralbarout@gmail.com' || email === 'aboramez965@gmail.com';
  }, [user?.email]);

  // ✅ جلب بيانات المحادثة + الإعلان + الطرف الآخر (Compat)
  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        setLoading(true);
        setError('');

        if (!chatId) {
          setError('الرابط غير صحيح (chatId مفقود).');
          return;
        }

        if (authLoading) return;

        if (!user) {
          router.replace('/login');
          return;
        }

        const chatRef = db.collection('chats').doc(chatId);
        const chatSnap = await chatRef.get();

        // ✅ لو المحادثة غير موجودة: غالباً لم يتم إنشاء مستند chat عند الضغط "بدء محادثة"
        if (!chatSnap.exists) {
          setError('المحادثة غير موجودة أو لم يتم إنشاؤها بعد.');
          return;
        }

        const chatLocal = { id: chatSnap.id, ...chatSnap.data() };

        // ✅ صلاحية: لازم يكون مشارك أو أدمن
        const participants = Array.isArray(chatLocal.participants) ? chatLocal.participants : [];
        const canAccess = participants.includes(user.uid) || isAdmin;

        if (!canAccess) {
          setError('ليس لديك صلاحية الوصول إلى هذه المحادثة.');
          return;
        }

        if (!mounted) return;
        setChatData(chatLocal);

        // ✅ الإعلان
        if (listingId) {
          try {
            const listingSnap = await db.collection('listings').doc(listingId).get();
            if (listingSnap.exists && mounted) {
              setListing({ id: listingSnap.id, ...listingSnap.data() });
            }
          } catch {}
        }

        // ✅ الطرف الآخر
        const otherUid =
          otherUidParam || participants.find((id) => id && id !== user.uid) || null;

        if (otherUid) {
          try {
            const otherSnap = await db.collection('users').doc(otherUid).get();
            if (otherSnap.exists && mounted) {
              setOtherUser({ id: otherSnap.id, ...otherSnap.data() });
            }
          } catch {}
        }
      } catch (e) {
        console.error('Chat init error:', e);
        if (!mounted) return;

        const code = e?.code || '';
        if (code === 'permission-denied') {
          setError('تم رفض الوصول (Firestore Rules). تأكد أن المستخدم ضمن participants.');
        } else {
          setError('حدث خطأ في تحميل المحادثة.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();

    return () => {
      mounted = false;
    };
  }, [chatId, listingId, otherUidParam, user?.uid, authLoading, isAdmin, router]);

  // ✅ الاستماع للتحديثات (Compat onSnapshot)
  useEffect(() => {
    if (!chatId || !user?.uid) return;

    const chatRef = db.collection('chats').doc(chatId);

    const unsub = chatRef.onSnapshot(
      (snap) => {
        if (!snap.exists) return;

        const updated = { id: snap.id, ...snap.data() };
        setChatData(updated);

        const blockedBy = Array.isArray(updated.blockedBy) ? updated.blockedBy : [];
        setIsBlocked(blockedBy.includes(user.uid));
      },
      (err) => {
        console.error('Chat snapshot error:', err);
      }
    );

    return () => unsub();
  }, [chatId, user?.uid]);

  // ✅ تعليم كمقروء (Compat update)
  useEffect(() => {
    if (!chatId || !user?.uid || !chatData) return;

    const lastBy = chatData?.lastMessageBy;
    if (lastBy && lastBy !== user.uid) {
      db.collection('chats')
        .doc(chatId)
        .update({ [`unread.${user.uid}`]: 0 })
        .catch(() => {});
    }
  }, [chatId, user?.uid, chatData?.lastMessageBy]);

  const handleToggleBlock = async () => {
    if (!chatId || !user?.uid) return;

    try {
      const ref = db.collection('chats').doc(chatId);
      const blockedBy = Array.isArray(chatData?.blockedBy) ? chatData.blockedBy : [];
      const currentlyBlocked = blockedBy.includes(user.uid);

      await ref.update({
        blockedBy: currentlyBlocked
          ? firebase.firestore.FieldValue.arrayRemove(user.uid)
          : firebase.firestore.FieldValue.arrayUnion(user.uid),
      });
    } catch (e) {
      console.error('toggle block error', e);
      alert('حدث خطأ في تعديل حالة الحجب');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="wrap">
        <div className="center">
          <div className="spinner" />
          <p>جاري تحميل المحادثة...</p>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wrap">
        <div className="panel">
          <div className="icon">⚠️</div>
          <h1>حدث خطأ</h1>
          <p className="muted">{error}</p>

          <div className="row">
            <button className="btn btnPrimary" onClick={() => router.push('/my-chats')}>
              العودة للمحادثات
            </button>
            <button className="btn" onClick={() => window.location.reload()}>
              إعادة المحاولة
            </button>
          </div>

          <div className="hint">
            إن كانت المشكلة “المحادثة غير موجودة”، لازم نضيف إنشاء مستند chat عند ضغط “بدء محادثة”.
          </div>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="wrap">
        <div className="panel">
          <div className="icon">🚫</div>
          <h1>المحادثة محجوبة</h1>
          <p className="muted">لقد حجبت هذه المحادثة.</p>
          <div className="row">
            <button className="btn btnPrimary" onClick={handleToggleBlock}>
              إلغاء الحجب
            </button>
            <button className="btn" onClick={() => router.push('/my-chats')}>
              العودة
            </button>
          </div>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="chatPage">
      <div className="chatTop">
        <button className="back" onClick={() => router.push('/my-chats')}>←</button>

        <div className="who">
          <div className="avatar">
            {(otherUser?.name || otherUser?.displayName || otherUser?.email || '?')
              .toString()
              .charAt(0)
              .toUpperCase()}
          </div>
          <div className="meta">
            <div className="name">
              {otherUser?.name || otherUser?.displayName || otherUser?.email || 'مستخدم'}
            </div>
            <div className="mutedSmall">
              {listing ? (
                <Link className="link" href={`/listing/${listing.id}`} target="_blank">
                  عرض الإعلان
                </Link>
              ) : (
                '—'
              )}
            </div>
          </div>
        </div>

        <div className="actions">
          <button className="act" onClick={handleToggleBlock} title="حجب/إلغاء الحجب">
            🚫
          </button>
        </div>
      </div>

      <div className="chatBody">
        <Suspense fallback={<div className="loadingMsgs">جاري تحميل الرسائل...</div>}>
          <ChatBox
            chatId={chatId}
            listingId={listingId}
            otherUid={otherUser?.id || otherUidParam || ''}
            isBlocked={isBlocked}
          />
        </Suspense>
      </div>

      <style jsx>{styles}</style>
    </div>
  );
}

export default function ChatPage({ params }) {
  // params في App Router يجي صحيح — نستخدم decodeURIComponent بحذر
  let chatId = '';
  try {
    chatId = decodeURIComponent(params?.id || '');
  } catch {
    chatId = String(params?.id || '');
  }

  return (
    <Suspense fallback={<div style={{ padding: 20 }}>جاري التحميل...</div>}>
      <ChatPageContent chatId={chatId} />
    </Suspense>
  );
}

const styles = `
.wrap{min-height: calc(100vh - 60px);padding: 24px 16px 48px;max-width: 1100px;margin: 0 auto;}
.center{margin-top:60px;display:flex;flex-direction:column;align-items:center;gap:10px;color:#64748b;}
.spinner{width:40px;height:40px;border:3px solid rgba(0,0,0,.08);border-top:3px solid rgba(59,130,246,1);border-radius:50%;animation: spin 1s linear infinite;}
@keyframes spin{to{transform:rotate(360deg)}}
.panel{margin-top:60px;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:18px;padding:22px;text-align:center;box-shadow: 0 10px 26px rgba(0,0,0,.06);}
.icon{font-size:2.2rem;margin-bottom:10px;}
.row{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:12px;}
.btn{display:inline-flex;align-items:center;justify-content:center;padding:10px 12px;border-radius:12px;border:1px solid rgba(0,0,0,.10);background:#fff;color:#0f172a;font-weight:900;cursor:pointer;}
.btnPrimary{background:#3b82f6;color:#fff;}
.muted{color:#64748b;font-weight:850;line-height:1.8;}
.hint{margin-top:12px;color:#64748b;font-weight:900;font-size:.92rem}

.chatPage{max-width: 1100px;margin: 0 auto;padding: 14px 12px 22px;}
.chatTop{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:16px;padding:12px;}
.back{width:40px;height:40px;border-radius:12px;border:1px solid rgba(0,0,0,.10);background:#fff;font-weight:950;cursor:pointer;}
.who{display:flex;align-items:center;gap:10px;flex:1;min-width:0;}
.avatar{width:40px;height:40px;border-radius:14px;display:flex;align-items:center;justify-content:center;background: rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.18);font-weight:950;}
.meta{min-width:0;}
.name{font-weight:950;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.mutedSmall{color:#64748b;font-weight:850;font-size:.9rem;}
.link{color:#2563eb;text-decoration:none;font-weight:950;}
.link:hover{text-decoration:underline;}
.actions{display:flex;gap:8px;}
.act{width:40px;height:40px;border-radius:12px;border:1px solid rgba(0,0,0,.10);background:#fff;cursor:pointer;}
.chatBody{margin-top:10px;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:16px;overflow:hidden;min-height: calc(100vh - 170px);}
.loadingMsgs{padding:16px;color:#64748b;font-weight:900;}
`;
