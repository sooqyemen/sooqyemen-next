'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { db } from '@/lib/firebaseClient';

const COMMISSION_PER_SIGNUP_SAR = 0.25;
const MIN_PAYOUT_SAR = 50;

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default function PayoutRequestPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const [ref, setRef] = useState(null); // { id, code, signups, clicks }
  const [pendingReq, setPendingReq] = useState(null); // { id, status, createdAt, amountSAR }

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const requiredSignups = useMemo(() => {
    return Math.ceil(MIN_PAYOUT_SAR / COMMISSION_PER_SIGNUP_SAR); // 200
  }, []);

  const earningsSAR = useMemo(() => {
    const s = safeNum(ref?.signups, 0);
    return s * COMMISSION_PER_SIGNUP_SAR;
  }, [ref?.signups]);

  const eligible = earningsSAR >= MIN_PAYOUT_SAR;

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  // تحميل بيانات الرابط + طلب سحب pending (إن وجد)
  useEffect(() => {
    if (!user?.uid) return;

    let mounted = true;

    const load = async () => {
      setErr('');
      setOk('');

      try {
        // 1) referral link (ندعم userId أو ownerUid)
        let refDoc = null;

        const q1 = await db.collection('referral_links').where('userId', '==', user.uid).limit(1).get();
        if (!q1.empty) refDoc = q1.docs[0];

        if (!refDoc) {
          const q2 = await db.collection('referral_links').where('ownerUid', '==', user.uid).limit(1).get();
          if (!q2.empty) refDoc = q2.docs[0];
        }

        if (!mounted) return;

        if (refDoc) {
          const d = refDoc.data() || {};
          setRef({
            id: refDoc.id,
            code: String(d.code || refDoc.id || ''),
            clicks: safeNum(d.clicks, 0),
            signups: safeNum(d.signups, 0),
          });
        } else {
          setRef(null);
        }

        // 2) pending payout request
        const pr = await db
          .collection('payout_requests')
          .where('userId', '==', user.uid)
          .where('status', '==', 'pending')
          .limit(1)
          .get();

        if (!mounted) return;

        if (!pr.empty) {
          const r = pr.docs[0];
          const rd = r.data() || {};
          setPendingReq({
            id: r.id,
            status: String(rd.status || 'pending'),
            amountSAR: safeNum(rd.amountSAR, 0),
            createdAt: rd.createdAt || null,
          });
        } else {
          setPendingReq(null);
        }

        // 3) تحميل الاسم/الجوال من users إن موجودة (اختياري)
        try {
          const u = await db.collection('users').doc(user.uid).get();
          const ud = u.exists ? u.data() : null;
          if (!mounted) return;
          setFullName(String(ud?.name || user?.name || '').trim());
          setPhone(String(ud?.phone || '').trim());
        } catch {
          // تجاهل
        }
      } catch (e) {
        console.error(e);
        if (!mounted) return;
        setErr('تعذر تحميل بيانات السحب. تأكد من الصلاحيات.');
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [user?.uid]);

  const handleSubmit = async () => {
    setErr('');
    setOk('');

    if (!user?.uid) return;
    if (!ref?.id) {
      setErr('لا يوجد لديك رابط عمولة حتى الآن. أنشئ رابط العمولة أولاً من صفحة الملف الشخصي.');
      return;
    }
    if (!eligible) {
      setErr(`غير مؤهل للسحب حالياً. الحد الأدنى ${MIN_PAYOUT_SAR} ريال (يعادل ${requiredSignups} تسجيل مؤهل).`);
      return;
    }
    if (pendingReq) {
      setErr('عندك طلب سحب قيد المراجعة بالفعل.');
      return;
    }

    const name = String(fullName || '').trim();
    const ph = String(phone || '').trim();

    if (name.length < 3) {
      setErr('اكتب اسمك الكامل (3 أحرف على الأقل).');
      return;
    }
    if (ph.length < 7) {
      setErr('اكتب رقم جوال صحيح.');
      return;
    }

    setBusy(true);
    try {
      const amount = Math.floor(earningsSAR * 100) / 100; // تقطيع منزلتين

      await db.collection('payout_requests').add({
        userId: user.uid,
        userEmail: user.email || '',
        referralId: ref.id,
        referralCode: ref.code || '',
        signupsAtRequest: safeNum(ref.signups, 0),
        amountSAR: amount,
        method: 'Al-Kuraimi',
        fullName: name,
        phone: ph,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        note:
          'سيتم التواصل معك من الإدارة لإتمام التحويل عبر بنك الكريمي بعد مراجعة البيانات.',
      });

      setOk('✅ تم إرسال طلب السحب. الإدارة ستتواصل معك عبر رقم الجوال لإتمام التحويل (بنك الكريمي).');

      // إعادة تحميل pending
      const pr = await db
        .collection('payout_requests')
        .where('userId', '==', user.uid)
        .where('status', '==', 'pending')
        .limit(1)
        .get();

      if (!pr.empty) {
        const r = pr.docs[0];
        const rd = r.data() || {};
        setPendingReq({
          id: r.id,
          status: String(rd.status || 'pending'),
          amountSAR: safeNum(rd.amountSAR, 0),
          createdAt: rd.createdAt || null,
        });
      }
    } catch (e) {
      console.error(e);
      const msg =
        e?.code === 'permission-denied'
          ? 'رفض صلاحيات Firestore (permission-denied) — تأكد من إضافة قواعد payout_requests.'
          : e?.message
          ? `فشل إرسال الطلب: ${e.message}`
          : 'فشل إرسال طلب السحب.';
      setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 24 }}>
        <div className="card" style={{ padding: 16 }}>
          جاري التحميل…
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 40 }}>
      <div className="card" style={{ padding: 16 }}>
        <h1 style={{ margin: 0 }}>💸 طلب سحب الأرباح</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          الحد الأدنى للسحب: <b>{MIN_PAYOUT_SAR}</b> ريال سعودي. التحويل يتم عبر <b>بنك الكريمي</b> بعد تواصل الإدارة معك.
        </p>

        {!ref ? (
          <div className="card" style={{ padding: 12, marginTop: 12 }}>
            <b>لا يوجد رابط عمولة</b>
            <div className="muted" style={{ marginTop: 6 }}>
              أنشئ رابط العمولة أولاً من صفحة <Link href="/profile">الملف الشخصي</Link>.
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 12, marginTop: 12 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>ملخص العمولة</div>
            <div className="muted">التسجيلات المؤهلة: {safeNum(ref.signups, 0).toLocaleString('ar-YE')}</div>
            <div className="muted">
              أرباحك: {earningsSAR.toLocaleString('ar-YE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              المؤهل للسحب يبدأ من {requiredSignups} تسجيل مؤهل (يعادل {MIN_PAYOUT_SAR} ريال).
            </div>
          </div>
        )}

        {pendingReq ? (
          <div className="card" style={{ padding: 12, marginTop: 12, borderColor: '#fde68a' }}>
            <div style={{ fontWeight: 900 }}>⏳ عندك طلب سحب قيد المراجعة</div>
            <div className="muted" style={{ marginTop: 6 }}>
              المبلغ المطلوب: {safeNum(pendingReq.amountSAR, 0).toLocaleString('ar-YE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR
            </div>
            <div className="muted">سيتم التواصل معك من الإدارة عبر الجوال.</div>
          </div>
        ) : (
          <>
            <div className="card" style={{ padding: 12, marginTop: 12 }}>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>بيانات التواصل للتحويل</div>

              <div style={{ display: 'grid', gap: 10 }}>
                <div>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                    الاسم الكامل
                  </div>
                  <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>

                <div>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>
                    رقم الجوال
                  </div>
                  <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>

              <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>
                * بعد قبول الطلب، الإدارة ستتواصل معك لإكمال إجراءات التحويل عبر بنك الكريمي.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
              <button className="btn btnPrimary" type="button" onClick={handleSubmit} disabled={busy || !eligible || !ref}>
                {busy ? 'جاري الإرسال…' : eligible ? 'إرسال طلب السحب' : `غير مؤهل (أقل من ${MIN_PAYOUT_SAR})`}
              </button>

              <Link className="btn" href="/profile">
                رجوع للملف الشخصي
              </Link>
            </div>
          </>
        )}

        {err ? (
          <div className="card" style={{ marginTop: 12, padding: 12, borderColor: 'rgba(220,38,38,.35)', color: '#991b1b' }}>
            {err}
          </div>
        ) : null}

        {ok ? (
          <div className="card" style={{ marginTop: 12, padding: 12, borderColor: 'rgba(16,185,129,.35)', color: '#065f46' }}>
            {ok}
          </div>
        ) : null}
      </div>
    </div>
  );
}
