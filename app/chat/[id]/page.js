// app/chat/[id]/page.jsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, onSnapshot, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient'; // لازم تكون Firestore modular (getFirestore)
import { useAuth } from '@/lib/useAuth';
import ChatBox from '@/components/Chat/ChatBox';
// import Header from '@/components/Header'; // ✅ إذا عندك Header في layout احذف هذا
import './chatPage.css';

function safeToDate(ts) {
  try {
    if (!ts) return null;
    if (ts?.toDate) return ts.toDate();
    if (ts?.seconds) return new Date(ts.seconds * 1000);
    return new Date(ts);
  } catch {
    return null;
  }
}

function ChatPageContent({ chatId, listingId, otherUid }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [chatData, setChatData] = useState(null);
  const [listing, setListing] = useState(null);
  const [otherUser, setOtherUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);

  // ✅ جلب البيانات أول مرة
  useEffect(() => {
    if (!chatId || authLoading) return;
    if (!user?.uid) {
      setError('سجّل دخولك لعرض المحادثة');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setError('');

        const chatRef = doc(db, 'chats', String(chatId));
        const chatSnap = await getDoc(chatRef);

        if (!chatSnap.exists()) {
          setError('المحادثة غير موجودة أو تم حذفها');
          return;
        }

        const cd = { id: chatSnap.id, ...chatSnap.data() };
        setChatData(cd);

        // صلاحية الوصول
        if (!Array.isArray(cd.participants) || !cd.participants.includes(user.uid)) {
          setError('ليس لديك صلاحية الوصول إلى هذه المحادثة');
          return;
        }

        // جلب الإعلان
        if (listingId) {
          const listingRef = doc(db, 'listings', String(listingId));
          const listingSnap = await getDoc(listingRef);
          if (listingSnap.exists()) {
            setListing({ id: listingSnap.id, ...listingSnap.data() });
          }
        }

        // تحديد الطرف الآخر
        const otherUserId = otherUid || (cd.participants || []).find((id) => id !== user.uid);
        if (otherUserId) {
          const userRef = doc(db, 'users', String(otherUserId));
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setOtherUser({ id: userSnap.id, ...userSnap.data() });
          } else {
            setOtherUser({ id: otherUserId });
          }
        }

        // حالة الحجب
        setIsBlocked(Array.isArray(cd.blockedBy) ? cd.blockedBy.includes(user.uid) : false);
      } catch (e) {
        console.error('chat initial load error:', e);
        setError('حدث خطأ في تحميل المحادثة');
      } finally {
        setLoading(false);
      }
    })();
  }, [chatId, listingId, otherUid, user?.uid, authLoading]);

  // ✅ تحديثات لحظية للمحادثة
  useEffect(() => {
    if (!chatId || !user?.uid) return;

    const chatRef = doc(db, 'chats', String(chatId));
    const unsub = onSnapshot(
      chatRef,
      (snap) => {
        if (!snap.exists()) return;
        const cd = { id: snap.id, ...snap.data() };
        setChatData(cd);
        setIsBlocked(Array.isArray(cd.blockedBy) ? cd.blockedBy.includes(user.uid) : false);
      },
      (e) => console.error('chat realtime error:', e)
    );

    return () => unsub();
  }, [chatId, user?.uid]);

  // ✅ تصفير غير المقروء
  useEffect(() => {
    if (!chatId || !user?.uid || !chatData) return;
    if (chatData.lastMessageBy === user.uid) return;

    (async () => {
      try {
        const chatRef = doc(db, 'chats', String(chatId));
        await updateDoc(chatRef, { [`unread.${user.uid}`]: 0 });
      } catch (e) {
        console.error('mark read error:', e);
      }
    })();
  }, [chatId, user?.uid, chatData?.lastMessageBy]);

  const handleToggleBlock = async () => {
    if (!chatId || !user?.uid || !chatData) return;

    try {
      const chatRef = doc(db, 'chats', String(chatId));
      const currentlyBlocked = Array.isArray(chatData.blockedBy) && chatData.blockedBy.includes(user.uid);

      await updateDoc(chatRef, {
        blockedBy: currentlyBlocked ? arrayRemove(user.uid) : arrayUnion(user.uid),
      });

      setIsBlocked(!currentlyBlocked);
    } catch (e) {
      console.error('toggle block error:', e);
      alert('حدث خطأ في تعديل حالة الحجب');
    }
  };

  const handleDeleteChat = async () => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المحادثة؟')) return;
    router.push('/my-chats');
  };

  // ✅ Loading
  if (authLoading || loading) {
    return (
      <div className="chat-page">
        {/* <Header /> */}
        <div className="loading-container">
          <div className="spinner" />
          <p className="loading-text">جاري تحميل المحادثة...</p>
        </div>
      </div>
    );
  }

  // ✅ Error
  if (error) {
    return (
      <div className="chat-page">
        {/* <Header /> */}
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2 className="error-title">حدث خطأ</h2>
          <p className="error-message">{error}</p>
          <div className="error-actions">
            <button className="btn btn-primary" onClick={() => router.push('/my-chats')}>
              العودة للمحادثات
            </button>
            <button className="btn btn-secondary" onClick={() => window.location.reload()}>
              إعادة المحاولة
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Blocked
  if (isBlocked) {
    return (
      <div className="chat-page">
        {/* <Header /> */}
        <div className="blocked-container">
          <div className="blocked-icon">🚫</div>
          <h2 className="blocked-title">المحادثة محجوبة</h2>
          <p className="blocked-message">لقد حجبت هذه المحادثة. لن تتمكن من إرسال أو استقبال رسائل جديدة.</p>
          <button className="btn btn-primary" onClick={handleToggleBlock}>
            إلغاء الحجب
          </button>
        </div>
      </div>
    );
  }

  const createdAt = safeToDate(chatData?.createdAt);

  return (
    <div className="chat-page">
      {/* <Header /> */}

      <div className="chat-container">
        <header className="chat-header">
          <div className="header-left">
            <button className="back-btn" onClick={() => router.push('/my-chats')} aria-label="العودة للمحادثات">
              ←
            </button>

            {otherUser && (
              <div className="user-info">
                <div className="user-avatar">
                  {otherUser.photoURL ? (
                    <img src={otherUser.photoURL} alt={otherUser.displayName || 'مستخدم'} />
                  ) : (
                    <span className="avatar-placeholder">
                      {otherUser.displayName?.charAt(0) || otherUser.email?.charAt(0) || '?'}
                    </span>
                  )}
                </div>
                <div className="user-details">
                  <h1 className="user-name">{otherUser.displayName || otherUser.email || 'مستخدم'}</h1>
                  <span className="user-status">{chatData?.lastSeen ? 'نشط الآن' : 'غير متصل'}</span>
                </div>
              </div>
            )}
          </div>

          <div className="header-right">
            {listing?.id && (
              <a href={`/listing/${listing.id}`} className="listing-link" target="_blank" rel="noopener noreferrer">
                <span className="link-icon">📄</span>
                <span className="link-text">عرض الإعلان</span>
              </a>
            )}

            <div className="chat-actions">
              <button className="action-btn" onClick={handleToggleBlock} title={isBlocked ? 'إلغاء الحجب' : 'حجب المحادثة'}>
                {isBlocked ? '🔓' : '🚫'}
              </button>
              <button className="action-btn" onClick={handleDeleteChat} title="حذف المحادثة">
                🗑️
              </button>
              <button className="action-btn" onClick={() => window.print()} title="طباعة المحادثة">
                🖨️
              </button>
            </div>
          </div>
        </header>

        {listing && (
          <div className="listing-preview">
            <div className="listing-image">
              {listing.images?.[0] ? <img src={listing.images[0]} alt={listing.title} /> : <div className="image-placeholder">🖼️</div>}
            </div>
            <div className="listing-info">
              <h3 className="listing-title">{listing.title}</h3>
              <p className="listing-price">
                {new Intl.NumberFormat('ar-YE', { style: 'currency', currency: 'YER' }).format(listing.priceYER || 0)}
              </p>
              <p className="listing-location">📍 {listing.city || 'غير محدد'}</p>
            </div>
          </div>
        )}

        <div className="chat-area">
          <Suspense fallback={<div className="loading-messages">جاري تحميل الرسائل...</div>}>
            <ChatBox chatId={chatId} listingId={listingId} otherUid={otherUser?.id} isBlocked={isBlocked} />
          </Suspense>
        </div>

        <footer className="chat-footer">
          <div className="footer-info">
            <span className="info-item">
              <span className="info-icon">🔒</span>
              <span className="info-text">المحادثة مشفرة</span>
            </span>
            <span className="info-item">
              <span className="info-icon">💾</span>
              <span className="info-text">يتم حفظ الرسائل تلقائياً</span>
            </span>
            {createdAt && (
              <span className="info-item">
                <span className="info-icon">📅</span>
                <span className="info-text">بدأت في {createdAt.toLocaleDateString('ar-YE')}</span>
              </span>
            )}
          </div>

          <button className="report-btn" onClick={() => alert('سيتم فتح نموذج الإبلاغ قريباً')}>
            ⚠️ الإبلاغ عن محتوى غير لائق
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function ChatPage({ params, searchParams }) {
  const chatId = decodeURIComponent(params?.id || '');
  const listingId = searchParams?.listingId ? String(searchParams.listingId) : null;
  const otherUid = searchParams?.otherUid ? String(searchParams.otherUid) : null;

  return (
    <Suspense
      fallback={
        <div className="chat-page">
          {/* <Header /> */}
          <div className="loading-container">
            <div className="spinner" />
            <p>جاري تحميل المحادثة...</p>
          </div>
        </div>
      }
    >
      <ChatPageContent chatId={chatId} listingId={listingId} otherUid={otherUid} />
    </Suspense>
  );
}
