// app/affiliate/create/page.jsx
'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { db } from '@/lib/firebaseClient';

function makeCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function AffiliateCreatePage() {
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [code, setCode] = useState('');

  const baseUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.origin;
  }, []);

  const createLink = async () => {
    if (!user?.uid) return;
    setBusy(true);
    setMsg('');
    try {
      let c = makeCode();

      // جرّب أكثر من مرة لو الكود مستخدم
      for (let i = 0; i < 5; i++) {
        const doc = await db.collection('referrals').doc(c).get();
        if (!doc.exists) break;
        c = makeCode();
      }

      await db.collection('referrals').doc(c).set({
        code: c,
        ownerUid: user.uid,
        ownerEmail: user.email || null,
        active: true,
        commissionPerSignupSAR: 0.25, // ✅ ربع ريال لكل تسجيل (تقدر تعدلها)
        createdAt: new Date(),
      });

      setCode(c);
      setMsg('تم إنشاء رابط الإحالة بنجاح ✅');
    } catch (e) {
      console.error(e);
      setMsg('حدث خطأ أثناء إنشاء الرابط');
    } finally {
      setBusy(false);
    }
  };

  const link = code && baseUrl ? `${baseUrl}/?ref=${code}` : '';

  if (loading) return <div className="container" style={{ padding: 16 }}>جاري التحميل…</div>;

  if (!user) {
    return (
      <div className="container" style={{ padding: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>لوحة المسوق</div>
          <div className="muted" style={{ marginTop: 6 }}>سجل دخولك أولاً لإنشاء رابط إحالة.</div>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl">
      <div className="container" style={{ paddingTop: 14 }}>
        <div className="card" style={{ padding: 16, marginBottom: 12 }}>
          <div style={{ fontWeight: 900, fontSize: 20 }}>إنشاء رابط إحالة</div>
          <div className="muted" style={{ marginTop: 6 }}>
            سيتم إنشاء كود خاص بك، ويمكنك مشاركته. سيتم تسجيل الزيارات والتسجيلات.
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <button className="btn btnPrimary" onClick={createLink} disabled={busy}>
            {busy ? 'جاري الإنشاء…' : 'إنشاء رابط إحالة'}
          </button>

          {msg ? <div className="muted" style={{ marginTop: 10 }}>{msg}</div> : null}

          {code ? (
            <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
              <div><b>الكود:</b> {code}</div>
              <div><b>الرابط:</b></div>
              <input className="input" value={link} readOnly />
              <button
                className="btn"
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(link);
                    setMsg('تم نسخ الرابط ✅');
                  } catch {
                    setMsg('لم أستطع النسخ تلقائياً — انسخ الرابط يدوياً');
                  }
                }}
              >
                📋 نسخ الرابط
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
