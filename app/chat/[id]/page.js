// app/chat/[id]/page.js
'use client';

import Header from '@/components/Header';
import ChatBox from '@/components/Chat/ChatBox';
import Link from 'next/link';

export default function ChatPage({ params, searchParams }) {
  const chatId = decodeURIComponent(params?.id || '');

  // الأفضل: نستخدم uid للطرف الآخر بدل الإيميل (خصوصية)
  const listingId = searchParams?.listingId ? String(searchParams.listingId) : null;
  const otherUid = searchParams?.otherUid ? String(searchParams.otherUid) : null;

  return (
    <>
      <Header />
      <div className="container">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <Link className="btn" href="/">
            ← رجوع
          </Link>
          <span className="badge">💬 محادثة</span>
        </div>

        <div style={{ marginTop: 12 }}>
          <ChatBox chatId={chatId} listingId={listingId} otherUid={otherUid} />
        </div>
      </div>
    </>
  );
}
