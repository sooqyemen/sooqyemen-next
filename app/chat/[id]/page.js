// app/chat/[id]/page.js
'use client';

import Header from '@/components/Header';
import ChatBox from '@/components/Chat/ChatBox';
import Link from 'next/link';

export default function ChatPage({ params, searchParams }) {
  const chatId = decodeURIComponent(params.id || '');
  const listingId = searchParams?.listingId || null;
  const other = searchParams?.other ? decodeURIComponent(searchParams.other) : '';

  return (
    <>
      <Header />
      <div className="container">
        <div className="row" style={{ justifyContent:'space-between' }}>
          <Link className="btn" href="/">← رجوع</Link>
          <span className="badge">Chat</span>
        </div>

        <div style={{ marginTop:12 }}>
          <ChatBox chatId={chatId} listingId={listingId} otherUserEmail={other} />
        </div>
      </div>
    </>
  );
}
