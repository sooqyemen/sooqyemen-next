// app/affiliate/create/page.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { db } from '@/lib/firebaseClient';

const COMMISSION_PER_SIGNUP_SAR = 0.25;

function randomCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function buildCode(user) {
  const prefix = String(user?.uid || '').slice(0, 5).toUpperCase() || 'USER';
  return `${prefix}-${randomCode(6)}`;
}

export default function AffiliateCreatePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // بيانات الرابط (ثابت)
  const [refDocId, setRefDocId] = useState(''); // id of doc (same as code عندنا)
  const [refCode, setRefCode] = useState('');
  const [refUrl, setRefUrl] = useState('');

  // إحصائيات
  const [stats, setStats] = useState({
    clicks: 0,
    signups: 0,
    earningsSAR: 0,
    enabled: true,
  });

  const baseUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.origin;
  }, []);

  // ✅ إذا غير مسجل دخول → ودّه لتسجيل الدخول
  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  // ✅ حمّل الرابط الموجود مسبقًا (لو موجود) حتى ما يختفي وما يطلب رابط جديد
  useEffect(() => {
    if (loading || !user?.uid) return;

    let mounted = true;

    const loadExisting = async () => {
      setError('');
      setBusy(true);
      try {
        const snap = await db
          .collection('referral_links')
          .where('ownerUid', '==', user.uid)
          .limit(1)
          .get();

        if (!mounted) return;

        if (!snap.empty) {
          const docSnap = snap.docs[0];
          const data = docSnap.data() || {};
          const code = data.code || docSnap.id;

          const url = `${baseUrl}/?ref=${encodeURIComponent(code)}`;

          setRefDocId(docSnap.id);
          setRefCode(code);
          setRefUrl(url);

          setStats({
            clicks: Number(data.clicks || 0),
            signups: Number(data.signups || 0),
            earningsSAR:
              typeof data.earningsSAR === 'number'
                ? data.earningsSAR
                : Number(data.signups || 0) * COMMISSION_PER_SIGNUP_SAR,
            enabled: data.enabled !== false,
          });
        }
      } catch (e) {
        console.error('Load referral link error:', e);
        if (!mounted) return;
        setError('تعذر تحميل رابط الإحالة. حاول مرة أخرى.');
      } finally {
        if (mounted) setBusy(false);
      }
    };

    // لا نحاول قبل معرفة baseUrl
    if (baseUrl) loadExisting();

    return () => {
      mounted = false;
    };
  }, [loading, user, baseUrl]);

  const refreshStats = async () => {
    setError('');
    if (!refDocId) return;

    setBusy(true);
    try {
      const docSnap = await db.collection('referral_links').doc(refDocId).get();
      if (!docSnap.exists) return;

      const data = docSnap.data() || {};
      setStats({
        clicks: Number(data.clicks || 0),
        signups: Number(data.signups || 0),
        earningsSAR:
          typeof data.earningsSAR === 'number'
            ? data.earningsSAR
            : Number(data.signups || 0) * COMMISSION_PER_SIGNUP_SAR,
        enabled: data.enabled !== false,
      });

      // لو كان الكود غير مضبوط، نعيد توليده للعرض فقط
      const code = data.code || docSnap.id;
      setRefCode(code);
      setRefUrl(`${baseUrl}/?ref=${encodeURIComponent(code)}`);
    } catch (e) {
      console.error('Refresh stats error:', e);
      setError('تعذر تحديث الإحصائيات.');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateOrShow = async () => {
    setError('');

    if (loading) return;
    if (!user?.uid) {
      setError('يجب تسجيل الدخول لإنشاء رابط إحالة.');
      return;
    }
    if (!baseUrl) {
      setError('تعذر تحديد رابط الموقع. أعد تحميل الصفحة.');
      return;
    }

    setBusy(true);

    try {
      // ✅ 1) لو عنده رابط أصلاً: اعرضه فقط ولا تنشئ جديد
      const exist = await db
        .collection('referral_links')
        .where('ownerUid', '==', user.uid)
        .limit(1)
        .get();

      if (!exist.empty) {
        const d = exist.docs[0];
        const data = d.data() || {};
        const code = data.code || d.id;

        setRefDocId(d.id);
        setRefCode(code);
        setRefUrl(`${baseUrl}/?ref=${encodeURIComponent(code)}`);

        setStats({
          clicks: Number(data.clicks || 0),
          signups: Number(data.signups || 0),
          earningsSAR:
            typeof data.earningsSAR === 'number'
              ? data.earningsSAR
              : Number(data.signups || 0) * COMMISSION_PER_SIGNUP_SAR,
          enabled: data.enabled !== false,
        });

        setBusy(false);
        return;
      }

      // ✅ 2) ما عنده رابط: أنشئ مرة واحدة
      // نحاول أكثر من مرة لو حصل تصادم نادر
      let code = '';
      let created = false;

      for (let attempt = 0; attempt < 5; attempt++) {
        code = buildCode(user);
        const docRef = db.collection('referral_links').doc(code);
        const docSnap = await docRef.get();

        if (docSnap.exists) continue; // تصادم، جرّب كود آخر

        await docRef.set({
          code,
          ownerUid: user.uid,
          ownerEmail: user.email || '',
          commissionPerSignupSAR: COMMISSION_PER_SIGNUP_SAR,
          clicks: 0,
          signups: 0,
          earningsSAR: 0,
          enabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        created = true;
        setRefDocId(code);
        setRefCode(code);
        setRefUrl(`${baseUrl}/?ref=${encodeURIComponent(code)}`);
        setStats({ clicks: 0, signups: 0, earningsSAR: 0, enabled: true });
        break;
      }

      if (!created) {
        setError('تعذر إنشاء كود فريد. حاول مرة أخرى.');
      }
    } catch (e) {
      console.error('Affiliate create/show error:', e);
      const msg =
        e?.code === 'permission-denied'
          ? 'رفض صلاحيات Firestore (permission-denied). تأكد من Rules لمجموعة referral_links.'
          : e?.message
          ? `فشل العملية: ${e.message}`
          : 'حدث خطأ أثناء العملية.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard?.writeText(refUrl);
    } catch {
      // ignore
    }
  };

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 40 }}>
      <div className="card" style={{ padding: 16 }}>
        <h1 style={{ margin: 0 }}>برنامج العمولة</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          هذا رابط إحالتك ثابت. شاركه، وسيتم احتساب التسجيلات المؤهلة لك.
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
          <button
            type="button"
            className="btn btnPrimary"
            onClick={handleCreateOrShow}
            disabled={busy || loading || !user}
          >
            {busy ? 'جاري…' : refUrl ? 'عرض/تحديث رابط الإحالة' : 'إنشاء رابط إحالة'}
          </button>

          <button type="button" className="btn" onClick={refreshStats} disabled={busy || !refDocId}>
            🔄 تحديث الإحصائيات
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

        {/* ✅ لوحة الإحالة */}
        <div className="card" style={{ marginTop: 12, padding: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>لوحة الإحالة</div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 10,
            }}
          >
            <div className="card" style={{ padding: 12 }}>
              <div className="muted" style={{ fontSize: 13 }}>الزيارات</div>
              <div style={{ fontWeight: 900, fontSize: 22 }}>{Number(stats.clicks || 0).toLocaleString('ar-SA')}</div>
            </div>

            <div className="card" style={{ padding: 12 }}>
              <div className="muted" style={{ fontSize: 13 }}>التسجيلات المؤهلة</div>
              <div style={{ fontWeight: 900, fontSize: 22 }}>{Number(stats.signups || 0).toLocaleString('ar-SA')}</div>
            </div>

            <div className="card" style={{ padding: 12 }}>
              <div className="muted" style={{ fontSize: 13 }}>الأرباح (ريال سعودي)</div>
              <div style={{ fontWeight: 900, fontSize: 22 }}>
                {Number(stats.earningsSAR || 0).toFixed(2)}
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                {COMMISSION_PER_SIGNUP_SAR.toFixed(2)} لكل تسجيل
              </div>
            </div>

            <div className="card" style={{ padding: 12 }}>
              <div className="muted" style={{ fontSize: 13 }}>الحالة</div>
              <div style={{ fontWeight: 900, fontSize: 18 }}>
                {stats.enabled ? '✅ فعّال' : '⛔ متوقف'}
              </div>
            </div>
          </div>
        </div>

        {/* ✅ عرض الرابط إذا موجود */}
        {refUrl ? (
          <div className="card" style={{ marginTop: 12, padding: 12 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>رابطك الثابت ✅</div>

            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              الكود:
            </div>
            <div style={{ fontWeight: 900, marginBottom: 10, direction: 'ltr' }}>{refCode}</div>

            <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
              الرابط:
            </div>

            <input className="input" value={refUrl} readOnly style={{ direction: 'ltr' }} />

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
              <button type="button" className="btn" onClick={copyLink}>
                📋 نسخ الرابط
              </button>

              <a
                className="btn"
                href={`https://wa.me/?text=${encodeURIComponent(refUrl)}`}
                target="_blank"
                rel="noreferrer"
              >
                واتساب
              </a>
            </div>
          </div>
        ) : (
          <div className="card" style={{ marginTop: 12, padding: 12 }}>
            <div className="muted">
              لم يتم إنشاء رابط إحالة بعد. اضغط “إنشاء رابط إحالة”.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
