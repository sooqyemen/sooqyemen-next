'use client';

import { useState, useRef, useEffect } from 'react';

export default function ChatBot() {
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

    const userMessage = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
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
                <div className="message-bubble bot-bubble typing">
                  جاري الكتابة... ✍️
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* الإدخال */}
          <form onSubmit={sendMessage} className="input-area">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب استفسارك هنا..."
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !input.trim()}>
              ➤
            </button>
          </form>
        </div>
      )}

      <style jsx>{`
        /* زر الفتح */
        .chat-toggle-btn {
          position: fixed;
          bottom: 24px;
          left: 24px;
          z-index: 9999;
          background-color: #2563eb;
          color: white;
          padding: 16px;
          border-radius: 50px;
          border: none;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: inherit;
          transition: transform 0.2s;
        }
        .chat-toggle-btn:hover {
          transform: scale(1.05);
          background-color: #1d4ed8;
        }
        .chat-toggle-btn .icon { font-size: 24px; }
        .chat-toggle-btn .text { font-weight: bold; font-size: 16px; }

        /* نافذة الشات */
        .chat-window {
          position: fixed;
          bottom: 24px;
          left: 24px;
          width: 350px;
          height: 500px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.2);
          z-index: 9999;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          font-family: sans-serif;
        }

        /* الهيدر */
        .chat-header {
          background-color: #2563eb;
          color: white;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .header-info { display: flex; align-items: center; gap: 10px; }
        .header-info h3 { margin: 0; font-size: 16px; font-weight: bold; }
        .status { font-size: 12px; color: #dbeafe; display: flex; align-items: center; gap: 4px; }
        .dot { width: 8px; height: 8px; background: #4ade80; border-radius: 50%; }
        .close-btn { background: none; border: none; color: white; font-size: 20px; cursor: pointer; }

        /* منطقة الرسائل */
        .messages-area {
          flex: 1;
          padding: 16px;
          background-color: #f8fafc;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .message-row { display: flex; width: 100%; }
        .user-row { justify-content: flex-end; }
        .bot-row { justify-content: flex-start; }
        
        .message-bubble {
          max-width: 80%;
          padding: 10px 14px;
          border-radius: 14px;
          font-size: 14px;
          line-height: 1.5;
          word-wrap: break-word;
        }
        .user-bubble {
          background-color: #2563eb;
          color: white;
          border-bottom-right-radius: 2px;
        }
        .bot-bubble {
          background-color: white;
          color: #1e293b;
          border: 1px solid #e2e8f0;
          border-bottom-left-radius: 2px;
        }
        .typing { color: #64748b; font-style: italic; }

        /* الإدخال */
        .input-area {
          padding: 12px;
          background: white;
          border-top: 1px solid #e2e8f0;
          display: flex;
          gap: 8px;
        }
        .input-area input {
          flex: 1;
          padding: 10px 16px;
          border-radius: 24px;
          border: 1px solid #cbd5e1;
          outline: none;
          font-size: 14px;
        }
        .input-area input:focus { border-color: #2563eb; }
        .input-area button {
          background: #2563eb;
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          transform: rotate(180deg); /* لأن الأيقونة تتجه لليمين ونحن RTL */
        }
        .input-area button:disabled { background: #94a3b8; cursor: not-allowed; }

        @media (max-width: 480px) {
          .chat-window {
            width: 100%;
            height: 100%;
            bottom: 0;
            left: 0;
            border-radius: 0;
          }
          .chat-toggle-btn {
            bottom: 20px;
            left: 20px;
          }
        }
      `}</style>
    </>
  );
}
