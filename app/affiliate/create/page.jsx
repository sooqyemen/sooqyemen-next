'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { db } from '@/lib/firebaseClient';

function randomCode(len = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function AffiliateCreatePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [refCode, setRefCode] = useState('');
  const [refUrl, setRefUrl] = useState('');

  const baseUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.origin;
  }, []);

  useEffect(() => {
    // لو غير مسجل دخول، ودّه لتسجيل الدخول
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  const handleCreate = async () => {
    setError('');
    setRefCode('');
    setRefUrl('');

    if (loading) return;
    if (!user?.uid) {
      setError('يجب تسجيل الدخول لإنشاء رابط إحالة.');
      return;
    }

    setCreating(true);

    try {
      // كود قصير + شبه فريد
      const code = `${user.uid.slice(0, 5).toUpperCase()}-${randomCode(6)}`;

      // ✅ مجموعة جديدة: referral_links
      // ⚠️ لو الـ Rules تمنع، سيطلع لك Permission Denied (وسيظهر في الرسالة أدناه)
      await db.collection('referral_links').doc(code).set({
        code,
        ownerUid: user.uid,
        ownerEmail: user.email || '',
        commissionPerSignupSAR: 0.25,
        clicks: 0,
        signups: 0,
        earningsSAR: 0,
        enabled: true,
        createdAt: new Date(),
      });

      const url = `${baseUrl}/?ref=${encodeURIComponent(code)}`;
      setRefCode(code);
      setRefUrl(url);
    } catch (e) {
      console.error('Affiliate create error:', e);
      const msg =
        e?.code === 'permission-denied'
          ? 'رفض صلاحيات Firestore (permission-denied). لازم نضيف سماح لمجموعة referral_links في Rules.'
          : e?.message
          ? `فشل إنشاء الرابط: ${e.message}`
          : 'حدث خطأ أثناء إنشاء الرابط.';
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 40 }}>
      <div className="card" style={{ padding: 16 }}>
        <h1 style={{ margin: 0 }}>إنشاء رابط إحالة</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          سيتم إنشاء كود خاص بك ويمكنك مشاركته. سيتم تسجيل الزيارات والتسجيلات لاحقًا.
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
          <button
            type="button"
            className={'btn btnPrimary'}
            onClick={handleCreate}
            disabled={creating || loading || !user}
          >
            {creating ? 'جاري الإنشاء…' : 'إنشاء رابط إحالة'}
          </button>

          <Link className="btn" href="/">
            رجوع للرئيسية
          </Link>
        </div>

        {error ? (
          <div
            className="card"
            style={{
              marginTop: 12,
              padding: 12,
              borderColor: 'rgba(220,38,38,.35)',
              color: '#991b1b',
              background: '#fff',
            }}
          >
            {error}
          </div>
        ) : null}

        {refUrl ? (
          <div className="card" style={{ marginTop: 12, padding: 12 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>تم إنشاء الرابط ✅</div>

            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              الكود:
            </div>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>{refCode}</div>

            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              الرابط:
            </div>

            <input className="input" value={refUrl} readOnly />

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
              <button
                type="button"
                className="btn"
                onClick={() => navigator.clipboard?.writeText(refUrl)}
              >
                📋 نسخ الرابط
              </button>

              <a className="btn" href={`https://wa.me/?text=${encodeURIComponent(refUrl)}`} target="_blank" rel="noreferrer">
                واتساب
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
