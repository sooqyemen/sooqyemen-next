'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadFirebaseClient } from '@/lib/firebaseLoader';

function safeStr(v) {
  if (v == null) return '';
  return String(v);
}

function toMillis(v) {
  try {
    if (!v) return 0;
    if (typeof v === 'number') return v;
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (typeof v.toDate === 'function') return v.toDate().getTime();
    if (v.seconds != null) return Number(v.seconds) * 1000;
    return 0;
  } catch {
    return 0;
  }
}

function clipText(text, max = 120) {
  const t = safeStr(text).trim();
  if (!t) return '';
  if (t.length <= max) return t;
  return t.slice(0, max).trim() + '…';
}

export default function RealtimeAlerts({ uid, onCounts }) {
  const router = useRouter();

  const [toast, setToast] = useState(null);
  const hideTimerRef = useRef(null);
  const lastToastAtRef = useRef(0);

  const allowSoundRef = useRef(false);
  const audioCtxRef = useRef(null);

  const countsRef = useRef({ notifUnread: 0, chatUnread: 0 });
  const notifInitRef = useRef(false);
  const chatInitRef = useRef(false);
  const notifSeenRef = useRef(new Set());
  const prevChatUnreadRef = useRef(new Map());

  const pushCounts = (patch) => {
    countsRef.current = {
      notifUnread: Number(countsRef.current.notifUnread) || 0,
      chatUnread: Number(countsRef.current.chatUnread) || 0,
      ...patch,
    };
    if (typeof onCounts === 'function') {
      onCounts({ ...countsRef.current });
    }
  };

  // فعّل الصوت بعد أول تفاعل من المستخدم
  useEffect(() => {
    const onUserGesture = () => {
      allowSoundRef.current = true;
      try {
        if (!audioCtxRef.current) {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          if (Ctx) audioCtxRef.current = new Ctx();
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('pointerdown', onUserGesture, { passive: true });
    window.addEventListener('keydown', onUserGesture, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', onUserGesture);
      window.removeEventListener('keydown', onUserGesture);
    };
  }, []);

  const playBeep = async () => {
    if (!allowSoundRef.current) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;

      let ctx = audioCtxRef.current;
      if (!ctx) {
        ctx = audioCtxRef.current = new Ctx();
      }

      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch {
          // ignore
        }
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = 880;

      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);

      const t = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

      osc.start(t);
      osc.stop(t + 0.13);
    } catch {
      // ignore
    }
  };

  const showToast = (next) => {
    if (!next) return;
    const now = Date.now();

    // منع السبام
    if (now - lastToastAtRef.current < 1500) return;
    lastToastAtRef.current = now;

    setToast(next);
    playBeep();

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 6500);
  };

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  // Realtime listeners
  useEffect(() => {
    let unsubNotif = null;
    let unsubChats = null;
    let cancelled = false;

    // reset
    countsRef.current = { notifUnread: 0, chatUnread: 0 };
    notifInitRef.current = false;
    chatInitRef.current = false;
    notifSeenRef.current = new Set();
    prevChatUnreadRef.current = new Map();
    setToast(null);

    const run = async () => {
      if (!uid) {
        pushCounts({ notifUnread: 0, chatUnread: 0 });
        return;
      }

      try {
        const { db } = await loadFirebaseClient();
        if (cancelled) return;

        // 1) إشعارات النظام
        // ملاحظة: نتجنب where(read==false) عشان ما نحتاج Index مركّب
        unsubNotif = db
          .collection('notifications')
          .where('userId', '==', uid)
          .orderBy('createdAt', 'desc')
          .limit(50)
          .onSnapshot(
            (snap) => {
              let unread = 0;
              snap.forEach((doc) => {
                const d = doc.data() || {};
                if (d.read !== true) unread += 1;
              });
              pushCounts({ notifUnread: unread });

              // أول تحميل: لا نعرض Toast (عشان ما يطلع سبام عند فتح الموقع)
              if (!notifInitRef.current) {
                notifInitRef.current = true;
                snap.forEach((doc) => notifSeenRef.current.add(doc.id));
                return;
              }

              // تغييرات (Added فقط)
              const changes = snap.docChanges ? snap.docChanges() : [];
              changes.forEach((ch) => {
                if (ch.type !== 'added') return;
                const id = ch.doc?.id;
                if (!id) return;
                if (notifSeenRef.current.has(id)) return;

                const d = ch.doc.data() || {};
                notifSeenRef.current.add(id);

                // لا نعرض Toast إذا كان الإشعار مقروء
                if (d.read === true) return;

                showToast({
                  kind: 'notif',
                  title: safeStr(d.title) || 'إشعار جديد',
                  message: clipText(d.message, 160),
                  href: '/notifications',
                });
              });

              // مزامنة IDs الحالية
              snap.forEach((doc) => notifSeenRef.current.add(doc.id));
            },
            (err) => {
              console.error('[RealtimeAlerts] notifications error', err?.code, err?.message);
            }
          );

        // 2) رسائل (Unread داخل chats)
        unsubChats = db
          .collection('chats')
          .where('participants', 'array-contains', uid)
          .limit(50)
          .onSnapshot(
            (snap) => {
              let totalUnread = 0;
              const nextMap = new Map();

              snap.forEach((doc) => {
                const data = doc.data() || {};
                const chatId = doc.id;

                const unreadForMe = Number(data?.unread?.[uid] || 0) || 0;
                totalUnread += unreadForMe;
                nextMap.set(chatId, unreadForMe);

                const prev = prevChatUnreadRef.current.get(chatId) || 0;
                const lastBy = safeStr(data.lastMessageBy);

                // أول تحميل: لا نعرض Toast
                if (!chatInitRef.current) return;

                // فقط إذا زادت unread وكان آخر مرسل ليس أنا
                if (unreadForMe > prev && lastBy && lastBy !== uid) {
                  const title = data.listingTitle ? `💬 رسالة جديدة: ${safeStr(data.listingTitle)}` : '💬 رسالة جديدة';
                  showToast({
                    kind: 'chat',
                    title: clipText(title, 80),
                    message: clipText(data.lastMessageText, 160),
                    href: `/chat/${chatId}`,
                  });
                }
              });

              prevChatUnreadRef.current = nextMap;
              pushCounts({ chatUnread: totalUnread });

              if (!chatInitRef.current) {
                chatInitRef.current = true;
                // بعد أول Snapshot نبدأ نراقب الزيادات
                // (prevChatUnreadRef تم تعبئته بالفعل)
              }
            },
            (err) => {
              console.error('[RealtimeAlerts] chats error', err?.code, err?.message);
            }
          );
      } catch (e) {
        console.error('[RealtimeAlerts] init failed', e);
      }
    };

    run();

    return () => {
      cancelled = true;
      if (unsubNotif) unsubNotif();
      if (unsubChats) unsubChats();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  if (!toast) return null;

  const open = () => {
    const href = safeStr(toast.href);
    setToast(null);
    if (!href) return;
    try {
      router.push(href);
    } catch {
      window.location.href = href;
    }
  };

  return (
    <div className="sy-toast-wrap" dir="rtl" aria-live="polite">
      <div className="sy-toast card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 14 }}>{toast.title || 'تنبيه'}</div>
          <button
            type="button"
            className="toast-close"
            aria-label="إغلاق"
            onClick={() => setToast(null)}
          >
            ✕
          </button>
        </div>

        {toast.message ? (
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
            {toast.message}
          </div>
        ) : null}

        <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
          <button className="btn" type="button" onClick={() => setToast(null)}>
            إغلاق
          </button>
          <button className="btn btnPrimary" type="button" onClick={open}>
            فتح
          </button>
        </div>
      </div>

      <style jsx>{`
        .sy-toast-wrap {
          position: fixed;
          right: 14px;
          bottom: 14px;
          z-index: 9999;
          max-width: calc(100vw - 28px);
        }

        .sy-toast {
          width: 360px;
          max-width: 100%;
          padding: 12px;
          border: 1px solid rgba(15, 23, 42, 0.14);
          box-shadow: 0 18px 50px rgba(2, 6, 23, 0.18);
          backdrop-filter: blur(8px);
        }

        .toast-close {
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 16px;
          padding: 4px 6px;
          border-radius: 10px;
        }

        .toast-close:hover {
          background: rgba(15, 23, 42, 0.06);
        }

        @media (max-width: 480px) {
          .sy-toast-wrap {
            right: 10px;
            left: 10px;
            bottom: 10px;
          }

          .sy-toast {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
