'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { db } from '@/lib/firebaseClient';

const COMMISSION_PER_SIGNUP_SAR = 0.25;
const MIN_PAYOUT_SAR = 50;

// 200 تسجيل = 50 ريال (0.25 لكل تسجيل)
const REQUIRED_SIGNUPS = Math.ceil(MIN_PAYOUT_SAR / COMMISSION_PER_SIGNUP_SAR);

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toDateString(d) {
  try {
    if (!d) return '—';
    const dt = d?.toDate ? d.toDate() : new Date(d);
    if (Number.isNaN(dt.getTime())) return '—';
    return dt.toLocaleString('ar-YE');
  } catch (e) {
    return '—';
  }
}

export default function AdminPayoutsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminBusy, setAdminBusy] = useState(true);

  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const [eligibleRefs, setEligibleRefs] = useState([]); // referral_links eligible
  const [pendingReqs, setPendingReqs] = useState([]); // payout_requests pending

  const eligibleCount = eligibleRefs.length;
  const pendingCount = pendingReqs.length;

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  // ✅ تحقق صلاحيات الإدارة من users/{uid}
  useEffect(() => {
    if (!user?.uid) return;

    let mounted = true;
    const run = async () => {
      setAdminBusy(true);
      setErr('');

      try {
        const snap = await db.collection('users').doc(user.uid).get();
        const data = snap.exists ? snap.data() : null;

        const ok =
          data?.isAdmin === true ||
          String(data?.role || '').toLowerCase() === 'admin';

        if (!mounted) return;
        setIsAdmin(!!ok);
      } catch (e) {
        console.error(e);
        if (!mounted) return;
        setErr('تعذر التحقق من صلاحيات الإدارة.');
        setIsAdmin(false);
      } finally {
        if (mounted) setAdminBusy(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [user?.uid]);

  const loadAll = async () => {
    if (!user?.uid) return;
    setErr('');
    setBusy(true);

    try {
      // ===== 1) المؤهلين تلقائيًا =====
      // نحاول: where + orderBy، ولو فشل بسبب Index نعمل fallback بدون orderBy ونرتب محليًا
      let eligible = [];
      try {
        const q = await db
          .collection('referral_links')
          .where('signups', '>=', REQUIRED_SIGNUPS)
          .orderBy('signups', 'desc')
          .limit(200)
          .get();

        eligible = q.docs.map((d) => {
          const x = d.data() || {};
          const signups = safeNum(x.signups, 0);
          const earningsSAR = signups * COMMISSION_PER_SIGNUP_SAR;

          return {
            id: d.id,
            code: String(x.code || d.id || ''),
            userId: String(x.userId || x.ownerUid || ''),
            userEmail: String(x.userEmail || x.ownerEmail || ''),
            signups,
            clicks: safeNum(x.clicks, 0),
            earningsSAR,
            createdAt: x.createdAt || null,
            updatedAt: x.updatedAt || null,
          };
        });
      } catch (e1) {
        console.warn('Eligible query with orderBy failed, fallback:', e1?.message || e1);

        const q = await db
          .collection('referral_links')
          .where('signups', '>=', REQUIRED_SIGNUPS)
          .limit(200)
          .get();

        eligible = q.docs
          .map((d) => {
            const x = d.data() || {};
            const signups = safeNum(x.signups, 0);
            const earningsSAR = signups * COMMISSION_PER_SIGNUP_SAR;

            return {
              id: d.id,
              code: String(x.code || d.id || ''),
              userId: String(x.userId || x.ownerUid || ''),
              userEmail: String(x.userEmail || x.ownerEmail || ''),
              signups,
              clicks: safeNum(x.clicks, 0),
              earningsSAR,
              createdAt: x.createdAt || null,
              updatedAt: x.updatedAt || null,
            };
          })
          .sort((a, b) => b.signups - a.signups);
      }

      // ===== 2) طلبات السحب pending =====
      let pending = [];
      try {
        const r = await db
          .collection('payout_requests')
          .where('status', '==', 'pending')
          .orderBy('createdAt', 'desc')
          .limit(200)
          .get();

        pending = r.docs.map((d) => {
          const x = d.data() || {};
          return {
            id: d.id,
            userId: String(x.userId || ''),
            userEmail: String(x.userEmail || ''),
            fullName: String(x.fullName || ''),
            phone: String(x.phone || ''),
            amountSAR: safeNum(x.amountSAR, 0),
            method: String(x.method || ''),
            referralId: String(x.referralId || ''),
            referralCode: String(x.referralCode || ''),
            signupsAtRequest: safeNum(x.signupsAtRequest, 0),
            status: String(x.status || 'pending'),
            createdAt: x.createdAt || null,
            updatedAt: x.updatedAt || null,
            note: String(x.note || ''),
          };
        });
      } catch (e2) {
        console.warn('Pending query with orderBy failed, fallback:', e2?.message || e2);

        const r = await db
          .collection('payout_requests')
          .where('status', '==', 'pending')
          .limit(200)
          .get();

        pending = r.docs.map((d) => {
          const x = d.data() || {};
          return {
            id: d.id,
            userId: String(x.userId || ''),
            userEmail: String(x.userEmail || ''),
            fullName: String(x.fullName || ''),
            phone: String(x.phone || ''),
            amountSAR: safeNum(x.amountSAR, 0),
            method: String(x.method || ''),
            referralId: String(x.referralId || ''),
            referralCode: String(x.referralCode || ''),
            signupsAtRequest: safeNum(x.signupsAtRequest, 0),
            status: String(x.status || 'pending'),
            createdAt: x.createdAt || null,
            updatedAt: x.updatedAt || null,
            note: String(x.note || ''),
          };
        });
      }

      setEligibleRefs(eligible);
      setPendingReqs(pending);
    } catch (e) {
      console.error(e);
      setErr(
        e?.code === 'permission-denied'
          ? 'رفض صلاحيات Firestore (permission-denied) — راجع Rules للوحة الإدارة.'
          : e?.message
          ? `تعذر تحميل بيانات الإدارة: ${e.message}`
          : 'تعذر تحميل بيانات الإدارة.'
      );
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const setStatus = async (id, newStatus) => {
    if (!id) return;
    setErr('');
    setBusy(true);

    try {
      const patch = {
        status: newStatus,
        updatedAt: new Date(),
      };

      if (newStatus === 'contacted') patch.contactedAt = new Date();
      if (newStatus === 'paid') patch.paidAt = new Date();
      if (newStatus === 'rejected') patch.rejectedAt = new Date();

      await db.collection('payout_requests').doc(id).set(patch, { merge: true });

      // تحديث محلي
      setPendingReqs((prev) =>
        prev
          .map((x) => (x.id === id ? { ...x, status: newStatus, updatedAt: patch.updatedAt } : x))
          .filter((x) => x.status === 'pending') // نخفي اللي تغيرت حالتها
      );
    } catch (e) {
      console.error(e);
      setErr(
        e?.code === 'permission-denied'
          ? 'رفض صلاحيات Firestore (permission-denied) — لازم الإدارة تكون لها صلاحيات تعديل payout_requests.'
          : e?.message
          ? `تعذر تحديث الحالة: ${e.message}`
          : 'تعذر تحديث الحالة.'
      );
    } finally {
      setBusy(false);
    }
  };

  const copyText = async (txt) => {
    const t = String(txt || '').trim();
    if (!t) return;
    try {
      await navigator.clipboard.writeText(t);
      alert('✅ تم النسخ');
    } catch (e) {
      window.prompt('انسخ النص:', t);
    }
  };

  if (loading || adminBusy) {
    return (
      <div className="container" style={{ paddingTop: 24, paddingBottom: 40 }}>
        <div className="card" style={{ padding: 16 }}>جاري التحميل…</div>
      </div>
    );
  }

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="container" style={{ paddingTop: 24, paddingBottom: 40 }}>
        <div className="card" style={{ padding: 16 }}>
          <h1 style={{ margin: 0 }}>لوحة الإدارة المالية</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            صلاحيات غير كافية. لتفعيل الإدارة لحسابك أضف في Firestore:
            <br />
            <b>users/{user.uid}</b> → <b>isAdmin: true</b> (أو role: &quot;admin&quot;)
          </p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
            <Link className="btn" href="/">رجوع للرئيسية</Link>
            <Link className="btn" href="/profile">الملف الشخصي</Link>
          </div>

          {err ? (
            <div className="card" style={{ marginTop: 12, padding: 12, borderColor: 'rgba(220,38,38,.35)', color: '#991b1b' }}>
              {err}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 60 }}>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0 }}>🏦 الإدارة المالية</h1>
            <p className="muted" style={{ marginTop: 6 }}>
              الحد الأدنى للسحب: <b>{MIN_PAYOUT_SAR}</b> SAR — (يعادل <b>{REQUIRED_SIGNUPS}</b> تسجيل مؤهل)
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btnPrimary" type="button" onClick={loadAll} disabled={busy}>
              {busy ? 'جاري التحديث…' : '🔄 تحديث'}
            </button>
            <Link className="btn" href="/admin">لوحة الإدارة</Link>
          </div>
        </div>

        {err ? (
          <div className="card" style={{ marginTop: 12, padding: 12, borderColor: 'rgba(220,38,38,.35)', color: '#991b1b' }}>
            {err}
          </div>
        ) : null}

        {/* ===== طلبات السحب pending ===== */}
        <div className="card" style={{ marginTop: 14, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 900 }}>📨 طلبات السحب (قيد المراجعة)</div>
            <div className="muted">عددها: <b>{pendingCount}</b></div>
          </div>

          {pendingCount === 0 ? (
            <div className="muted" style={{ marginTop: 10 }}>لا توجد طلبات سحب pending حالياً.</div>
          ) : (
            <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
              {pendingReqs.map((r) => (
                <div key={r.id} className="card" style={{ padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 220 }}>
                      <div style={{ fontWeight: 950 }}>{r.fullName || '—'}</div>
                      <div className="muted" style={{ marginTop: 4 }}>
                        📧 {r.userEmail || '—'}
                      </div>
                      <div className="muted" style={{ marginTop: 4 }}>
                        📞 {r.phone || '—'}
                      </div>
                      <div className="muted" style={{ marginTop: 4 }}>
                        ⏱️ {toDateString(r.createdAt)}
                      </div>
                    </div>

                    <div style={{ minWidth: 220 }}>
                      <div className="muted">المبلغ:</div>
                      <div style={{ fontWeight: 950, fontSize: 18 }}>
                        {safeNum(r.amountSAR, 0).toLocaleString('ar-YE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR
                      </div>

                      <div className="muted" style={{ marginTop: 6 }}>
                        طريقة التحويل: <b>{r.method || '—'}</b>
                      </div>

                      <div className="muted" style={{ marginTop: 6 }}>
                        كود الإحالة: <b>{r.referralCode || '—'}</b> — تسجيلات عند الطلب: <b>{safeNum(r.signupsAtRequest, 0)}</b>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <button className="btn" type="button" onClick={() => copyText(r.phone)}>📋 نسخ الجوال</button>
                      <button className="btn" type="button" onClick={() => copyText(r.userEmail)}>📋 نسخ البريد</button>

                      <button className="btn" type="button" disabled={busy} onClick={() => setStatus(r.id, 'contacted')}>
                        ✅ تم التواصل
                      </button>
                      <button className="btn" type="button" disabled={busy} onClick={() => setStatus(r.id, 'paid')}>
                        💸 تم التحويل
                      </button>
                      <button className="btn" type="button" disabled={busy} onClick={() => setStatus(r.id, 'rejected')}>
                        ❌ رفض
                      </button>
                    </div>
                  </div>

                  {r.note ? (
                    <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
                      ملاحظة الطلب: {r.note}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===== المؤهلين تلقائيًا ===== */}
        <div className="card" style={{ marginTop: 14, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 900 }}>✅ المؤهلين للسحب تلقائيًا (بدون طلب)</div>
            <div className="muted">عددهم: <b>{eligibleCount}</b></div>
          </div>

          <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
            معيار التأهل: <b>signups ≥ {REQUIRED_SIGNUPS}</b> (يُحسب الرصيد = signups × {COMMISSION_PER_SIGNUP_SAR})
          </div>

          {eligibleCount === 0 ? (
            <div className="muted" style={{ marginTop: 10 }}>لا يوجد مؤهلين حالياً.</div>
          ) : (
            <div style={{ marginTop: 10, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'right', padding: 10, borderBottom: '1px solid #e2e8f0' }}>المستخدم</th>
                    <th style={{ textAlign: 'right', padding: 10, borderBottom: '1px solid #e2e8f0' }}>الكود</th>
                    <th style={{ textAlign: 'right', padding: 10, borderBottom: '1px solid #e2e8f0' }}>التسجيلات</th>
                    <th style={{ textAlign: 'right', padding: 10, borderBottom: '1px solid #e2e8f0' }}>الأرباح (SAR)</th>
                    <th style={{ textAlign: 'right', padding: 10, borderBottom: '1px solid #e2e8f0' }}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {eligibleRefs.map((x) => (
                    <tr key={x.id}>
                      <td style={{ padding: 10, borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontWeight: 900 }}>{x.userEmail || x.userId || '—'}</div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          UID: {x.userId || '—'}
                        </div>
                      </td>
                      <td style={{ padding: 10, borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ fontWeight: 900 }}>{x.code || '—'}</div>
                      </td>
                      <td style={{ padding: 10, borderBottom: '1px solid #f1f5f9' }}>
                        {safeNum(x.signups, 0).toLocaleString('ar-YE')}
                      </td>
                      <td style={{ padding: 10, borderBottom: '1px solid #f1f5f9' }}>
                        {safeNum(x.earningsSAR, 0).toLocaleString('ar-YE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: 10, borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button className="btn" type="button" onClick={() => copyText(x.userEmail)}>📋 نسخ البريد</button>
                          <button className="btn" type="button" onClick={() => copyText(x.code)}>📋 نسخ الكود</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="muted" style={{ marginTop: 12, fontSize: 13 }}>
          * لو واجهت خطأ Index في الاستعلامات، هذا طبيعي أول مرة. الكود عنده fallback، ومع الوقت تقدر تعمل Index من Firebase Console لو تحب.
        </div>
      </div>
    </div>
  );
}
