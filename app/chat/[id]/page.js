'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db, auth, firebase } from '@/lib/firebaseClient'; 
// تأكد من أن ملف CSS موجود في نفس المجلد
import './chatPage.css';

export default function ChatPage({ params }) {
  // التعامل مع params في Next.js الحديث
  // ملاحظة: في النسخ الأحدث قد تحتاج لـ React.use() لكن سنستخدم الطريقة التقليدية الآن
  const chatId = params.id; 

  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  
  // مرجع للتمرير التلقائي لأسفل الشاشة
  const messagesEndRef = useRef(null);

  // 1. التحقق من تسجيل الدخول
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (!u) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. جلب الرسائل لحظياً (Real-time) باستخدام صيغة Compat
  useEffect(() => {
    if (!chatId) return;

    const unsubscribe = db
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .orderBy('createdAt', 'asc') // مهم جداً: ترتيب الرسائل زمنياً
      .onSnapshot((snapshot) => {
        const fetchedMessages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMessages(fetchedMessages);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching messages:", error);
        setLoading(false);
      });

    return () => unsubscribe();
  }, [chatId]);

  // 3. التمرير التلقائي عند وصول رسالة جديدة
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. دالة إرسال الرسالة
  const handleSendMessage = async (e) => {
    e.preventDefault(); // منع إعادة تحميل الصفحة

    if (!newMessage.trim() || !user) return;

    try {
      await db.collection('chats').doc(chatId).collection('messages').add({
        text: newMessage,
        senderId: user.uid,
        senderEmail: user.email, // اختياري
        createdAt: firebase.firestore.FieldValue.serverTimestamp(), // توقيت السيرفر
      });
      setNewMessage(''); // مسح الحقل بعد الإرسال
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  };

  // تنسيق الوقت (مثال: 10:30 PM)
  const formatTime = (timestamp) => {
    if (!timestamp) return '...';
    // التعامل مع timestamp الخاص بـ Firebase
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // شاشة التحميل أو الخطأ
  if (loading) return <div className="chat-page"><div className="loading-container"><div className="spinner"></div></div></div>;
  if (!user) return <div className="chat-page"><div className="error-container">يرجى تسجيل الدخول.</div></div>;

  return (
    <div className="chat-page">
      <div className="chat-container">
        
        {/* --- Header: باستخدام كلاساتك الأصلية --- */}
        <div className="chat-header">
          <div className="header-left">
            <button className="back-btn" onClick={() => window.history.back()}>➜</button>
            <div className="user-info">
              <div className="user-avatar">
                 {/* صورة افتراضية أو صورة المستخدم */}
                 <img src="https://via.placeholder.com/48" alt="User" />
              </div>
              <div className="user-details">
                <p className="user-name">مستخدم سوق اليمن</p>
                <span className="user-status">متصل الآن</span>
              </div>
            </div>
          </div>
        </div>

        {/* --- منطقة المحادثة --- */}
        <div className="chat-area">
          <div className="messages-list">
            {messages.length === 0 && (
                <div style={{textAlign: 'center', padding: '20px', color: '#888'}}>
                    لا توجد رسائل بعد، ابدأ المحادثة!
                </div>
            )}
            
            {messages.map((msg) => {
              const isMyMessage = msg.senderId === user.uid;
              return (
                <div 
                  key={msg.id} 
                  className={`message-bubble ${isMyMessage ? 'message-own' : 'message-other'}`}
                >
                  <div>{msg.text}</div>
                  <span className="msg-time">{formatTime(msg.createdAt)}</span>
                </div>
              );
            })}
            {/* عنصر مخفي لضمان التمرير للأسفل */}
            <div ref={messagesEndRef} />
          </div>

          {/* --- نموذج الإرسال --- */}
          <form className="chat-input-area" onSubmit={handleSendMessage}>
            <input
              type="text"
              className="chat-input"
              placeholder="اكتب رسالتك هنا..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button 
              type="submit" 
              className="send-btn" 
              disabled={!newMessage.trim()}
            >
              ➤
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
