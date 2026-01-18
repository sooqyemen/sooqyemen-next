'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/useAuth';
import { storage } from '@/lib/firebaseClient';

export default function ChatBot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'مرحباً بك في سوق اليمن! 🇾🇪 كيف يمكنني مساعدتك في العثور على عقار أو سيارة اليوم؟' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const speechRef = useRef(null);
  const latestInputRef = useRef('');

  useEffect(() => {
    latestInputRef.current = input;
  }, [input]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // ✅ تحويل الكلام إلى نص (Voice to Text) عبر Web Speech API (في المتصفحات المدعومة)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar';
    recognition.interimResults = true;
    recognition.continuous = false;
    speechRef.current = recognition;

    let baseInput = '';

    recognition.onstart = () => {
      baseInput = latestInputRef.current || '';
      setIsRecording(true);
    };

    recognition.onresult = (event) => {
      try {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0]?.transcript || '';
        }
        const next = String((baseInput + ' ' + transcript).replace(/\s+/g, ' ')).trim();
        setInput(next);
      } catch {
        // ignore
      }
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    return () => {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendText = async (messageText, meta) => {
    if (!String(messageText || '').trim() || isLoading) return;

    const userMessage = { role: 'user', text: messageText };
    const history = messages.slice(-10).map((msg) => ({ role: msg.role, content: msg.text }));
    setMessages((prev) => [...prev, userMessage]);
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
        body: JSON.stringify({ message: messageText, history, meta: meta || null }),
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

  const sendMessage = async (e) => {
    e.preventDefault();
    const messageText = input;
    if (!messageText.trim() || isLoading) return;
    setInput('');
    await sendText(messageText);
  };

  const quickAsk = async (text) => {
    if (isLoading) return;
    await sendText(text);
  };

  const goTo = (path) => {
    try {
      window.location.href = path;
    } catch {
      // ignore
    }
  };

  const shareMyLocation = async () => {
    if (isLoading || locationBusy) return;
    if (typeof window === 'undefined' || !navigator?.geolocation) {
      await sendText('لا أستطيع إرسال موقعي من هذا الجهاز. اكتب الإحداثيات (lat, lng) أو أرسل رابط خرائط جوجل.');
      return;
    }

    setLocationBusy(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        });
      });

      const lat = Number(position?.coords?.latitude);
      const lng = Number(position?.coords?.longitude);
      const accuracy = Number(position?.coords?.accuracy);

      if (!isFinite(lat) || !isFinite(lng)) {
        await sendText('ما قدرت أقرأ الإحداثيات. اكتب موقعك يدوياً أو أرسل رابط خرائط.');
        return;
      }

      await sendText('📍 هذا موقعي', {
        location: {
          lat,
          lng,
          accuracy: isFinite(accuracy) ? accuracy : null,
        },
      });
    } catch (e) {
      await sendText('لم يتم السماح بالموقع. اكتب الإحداثيات (lat, lng) أو أرسل رابط خرائط.');
    } finally {
      setLocationBusy(false);
    }
  };

  const toggleRecording = async () => {
    if (isLoading) return;
    const recognition = speechRef.current;
    if (!recognition) {
      await sendText('ميزة التسجيل الصوتي غير مدعومة في هذا المتصفح. جرّب Chrome على الجوال/الكمبيوتر.');
      return;
    }

    try {
      if (isRecording) {
        recognition.stop();
        setIsRecording(false);
        return;
      }
      recognition.start();
    } catch (e) {
      setIsRecording(false);
    }
  };

  const openImagePicker = () => {
    if (isLoading || uploadBusy) return;
    if (!fileInputRef.current) return;
    fileInputRef.current.value = '';
    fileInputRef.current.click();
  };

  const handleImagePicked = async (e) => {
    const files = Array.from(e?.target?.files || []).filter(Boolean);
    if (!files.length) return;

    if (!user) {
      await sendText('لرفع الصور من داخل الشات لازم تسجل دخول أولاً ✅\nاذهب إلى: /login');
      return;
    }

    // حد أقصى 8 صور
    const picked = files.slice(0, 8);

    setUploadBusy(true);
    try {
      const uploaded = [];

      for (let i = 0; i < picked.length; i++) {
        const file = picked[i];
        if (!file || !file.type || !file.type.startsWith('image/')) continue;

        const safeName = String(file.name || 'image')
          .toLowerCase()
          .replace(/[^a-z0-9._-]+/g, '-')
          .slice(0, 80);

        const path = `chat_uploads/${user.uid}/${Date.now()}_${i}_${safeName}`;
        const ref = storage.ref().child(path);
        await ref.put(file, { contentType: file.type });
        const url = await ref.getDownloadURL();
        uploaded.push({ url, path, name: file.name || safeName });
      }

      if (!uploaded.length) {
        await sendText('ما قدرت أرفع الصور. جرّب صور بصيغة JPG/PNG وبحجم أصغر.');
        return;
      }

      await sendText(`📷 تم رفع ${uploaded.length} صورة. سأضيفها لمسودة الإعلان (إن وجدت).`, {
        images: uploaded,
      });
    } catch (err) {
      console.warn('[ChatBot] upload images failed', err);
      await sendText('حدث خطأ أثناء رفع الصور. تأكد أنك مسجل دخول وأن الاتصال جيد.');
    } finally {
      setUploadBusy(false);
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

          {/* رفع صور (مخفي) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleImagePicked}
          />

          {/* أزرار سريعة (بعد إزالة أيقونتي الصور والصوت) */}
          <div className="quick-actions">
            <button type="button" className="chip" onClick={() => quickAsk('أضف إعلان')} disabled={isLoading}>
              ➕ إضافة إعلان
            </button>
            <button type="button" className="chip" onClick={() => goTo('/add')}>
              📝 صفحة الإضافة
            </button>
            <button type="button" className="chip" onClick={() => goTo('/contact')}>
              📞 تواصل
            </button>
            <button type="button" className="chip chip-location" onClick={shareMyLocation} disabled={isLoading || locationBusy}>
              📍 {locationBusy ? 'جارٍ تحديد…' : 'موقعي'}
            </button>
            <button type="button" className="chip" onClick={() => goTo('/listings?view=map')} disabled={isLoading}>
              🗺️ عرض الإعلانات على الخريطة
            </button>
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

          {/* الإدخال (الأيقونات موجودة هنا فقط) */}
          <form className="input-area" onSubmit={sendMessage}>
            <button
              type="button"
              className="icon-btn"
              onClick={openImagePicker}
              title="إرفاق صور"
              disabled={isLoading || uploadBusy}
            >
              📷
            </button>
            <button
              type="button"
              className={`icon-btn ${isRecording ? 'icon-btn-recording' : ''}`}
              onClick={toggleRecording}
              title="تسجيل صوت"
              disabled={isLoading}
            >
              🎙️
            </button>
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

        .quick-actions {
          padding: 10px 10px 8px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
        }

        .chip {
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #0f172a;
          padding: 8px 10px;
          border-radius: 999px;
          font-size: 12px;
          cursor: pointer;
          font-weight: 700;
          transition: transform 0.05s ease;
        }
        .chip:active { transform: scale(0.98); }
        .chip:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .chip-location { background: #0f172a; color: #fff; border-color: #0f172a; }
        .chip-recording { background: #fee2e2; color: #991b1b; border-color: #ef4444; }
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

        .icon-btn {
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #0f172a;
          width: 40px;
          min-width: 40px;
          height: 40px;
          padding: 0;
          border-radius: 10px;
          cursor: pointer;
          font-size: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .icon-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .icon-btn-recording {
          border-color: #ef4444;
          background: #fee2e2;
        }

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
