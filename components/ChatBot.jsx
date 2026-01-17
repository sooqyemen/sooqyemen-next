'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/useAuth';

export default function ChatBot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'مرحباً بك في سوق اليمن! 🇾🇪 كيف يمكنني مساعدتك في العثور على عقار أو سيارة اليوم؟' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const messageText = input;
    const userMessage = { role: 'user', text: messageText };
    const history = messages.slice(-10).map((msg) => ({ role: msg.role, content: msg.text }));
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // ✅ إذا المستخدم مسجل دخول: نرسل الـ ID Token للمساعد
      let token = '';
      try {
        if (user && typeof user.getIdToken === 'function') {
          token = await user.getIdToken();
        }
      } catch (e1) {
        // لا نوقف المساعد إذا فشل جلب التوكن
        console.warn('[ChatBot] getIdToken failed', e1);
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: messageText, history }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessages((prev) => [...prev, { role: 'assistant', text: data.reply }]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', text: 'عذراً، حدث خطأ في الاتصال.' }]);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'عذراً، لا يمكنني الرد حالياً.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* زر العائم */}
      {!isOpen && (
        <button className="chat-toggle-btn" onClick={() => setIsOpen(true)}>
          <span className="icon">🤖</span>
          <span className="text">مساعد ذكي</span>
        </button>
      )}

      {/* نافذة الشات */}
      {isOpen && (
        <div className="chat-window">
          {/* الرأس */}
          <div className="chat-header">
            <div className="header-info">
              <span className="icon">🤖</span>
              <div>
                <h3>مساعد سوق اليمن</h3>
                <span className="status">
                  <span className="dot"></span> متصل الآن
                </span>
              </div>
            </div>
            <button className="close-btn" onClick={() => setIsOpen(false)}>✕</button>
          </div>

          {/* الرسائل */}
          <div className="messages-area">
            {messages.map((msg, index) => (
              <div key={index} className={`message-row ${msg.role === 'user' ? 'user-row' : 'bot-row'}`}>
                <div className={`message-bubble ${msg.role === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message-row bot-row">
                <div className="message-bubble bot-bubble">
                  جاري الكتابة...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* الإدخال */}
          <form className="input-area" onSubmit={sendMessage}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب استفسارك هنا..."
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading}>
              إرسال
            </button>
          </form>
        </div>
      )}

      <style jsx>{`
        .chat-toggle-btn {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 9999;
          background: linear-gradient(135deg, #2563eb, #0ea5e9);
          color: white;
          border: none;
          border-radius: 999px;
          padding: 12px 16px;
          display: flex;
          gap: 8px;
          align-items: center;
          cursor: pointer;
          box-shadow: 0 10px 25px rgba(0,0,0,0.18);
          font-weight: 700;
        }
        .chat-toggle-btn .icon { font-size: 18px; }
        .chat-window {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 360px;
          height: 520px;
          z-index: 9999;
          background: white;
          border-radius: 14px;
          box-shadow: 0 18px 40px rgba(0,0,0,0.22);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .chat-header {
          background: linear-gradient(135deg, #0f172a, #1e293b);
          color: white;
          padding: 12px 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .header-info { display: flex; align-items: center; gap: 10px; }
        .header-info h3 { margin: 0; font-size: 14px; }
        .header-info .icon { font-size: 18px; }
        .status { font-size: 12px; opacity: 0.9; display: flex; align-items: center; gap: 6px; }
        .dot { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; display: inline-block; }
        .close-btn {
          background: transparent;
          border: none;
          color: white;
          font-size: 18px;
          cursor: pointer;
        }
        .messages-area {
          flex: 1;
          padding: 12px;
          overflow-y: auto;
          background: #f8fafc;
        }
        .message-row { display: flex; margin: 8px 0; }
        .user-row { justify-content: flex-end; }
        .bot-row { justify-content: flex-start; }
        .message-bubble {
          max-width: 78%;
          padding: 10px 12px;
          border-radius: 12px;
          font-size: 13px;
          line-height: 1.6;
          white-space: pre-wrap;
        }
        .user-bubble { background: #2563eb; color: white; border-bottom-right-radius: 4px; }
        .bot-bubble { background: white; color: #0f172a; border: 1px solid #e2e8f0; border-bottom-left-radius: 4px; }
        .input-area {
          padding: 10px;
          display: flex;
          gap: 8px;
          background: white;
          border-top: 1px solid #e2e8f0;
        }
        .input-area input {
          flex: 1;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px 12px;
          outline: none;
          font-size: 13px;
        }
        .input-area button {
          border: none;
          border-radius: 10px;
          background: #0f172a;
          color: white;
          padding: 10px 12px;
          cursor: pointer;
          font-weight: 700;
        }
        .input-area button:disabled { background: #94a3b8; cursor: not-allowed; }

        @media (max-width: 480px) {
          .chat-window {
            width: 100%;
            right: 0;
            bottom: 0;
            height: 70vh;
            border-radius: 0;
          }
          .chat-toggle-btn { right: 14px; bottom: 14px; }
        }
      `}</style>
    </>
  );
}
