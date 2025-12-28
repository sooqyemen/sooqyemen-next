// components/Chat/ChatBox.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { db, firebase } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';

export default function ChatBox({ chatId, listingId, otherUserEmail }) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [msgs, setMsgs] = useState([]);

  useEffect(() => {
    if (!chatId) return;
    const unsub = db.collection('chats').doc(chatId)
      .collection('messages').orderBy('createdAt', 'asc').limit(200)
      .onSnapshot((snap) => {
        setMsgs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    return () => unsub();
  }, [chatId]);

  const send = async () => {
    if (!user) {
      alert('سجل دخول أولاً للدردشة');
      return;
    }
    const t = text.trim();
    if (!t) return;

    const chatRef = db.collection('chats').doc(chatId);
    await chatRef.set({
      chatId,
      listingId: listingId || null,
      users: [user.uid],
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastMessage: t
    }, { merge: true });

    await chatRef.collection('messages').add({
      text: t,
      uid: user.uid,
      email: user.email || null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    setText('');
  };

  return (
    <div className="card">
      <div style={{ fontWeight:900, marginBottom:6 }}>💬 الدردشة</div>
      {otherUserEmail ? <div className="muted" style={{ fontSize:12 }}>مع: {otherUserEmail}</div> : null}

      <div style={{ border:'1px solid #eee', borderRadius:14, padding:10, height:280, overflow:'auto', marginTop:10 }}>
        {msgs.length === 0 ? (
          <div className="muted">لا توجد رسائل بعد</div>
        ) : msgs.map(m => (
          <div key={m.id} style={{ marginBottom:8, textAlign: (m.uid === user?.uid ? 'left' : 'right') }}>
            <div style={{
              display:'inline-block',
              padding:'8px 10px',
              borderRadius:14,
              border:'1px solid #eee',
              background: m.uid === user?.uid ? '#e0f2fe' : '#f9fafb',
              maxWidth:'90%'
            }}>
              <div style={{ fontSize:12, fontWeight:700 }} className="muted">{m.email || m.uid}</div>
              <div>{m.text}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="row" style={{ marginTop:10 }}>
        <input className="input" value={text} onChange={(e)=>setText(e.target.value)} placeholder="اكتب رسالتك..." />
        <button className="btn btnPrimary" onClick={send}>إرسال</button>
      </div>
    </div>
  );
}
