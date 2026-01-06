'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import { db } from '@/lib/firebaseClient';

const ADMIN_EMAILS = ['mansouralbarout@gmail.com', 'aboramez965@gmail.com'];

const COMMISSION_PER_SIGNUP_SAR = 0.25;
const MIN_PAYOUT_SAR = 50;

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default function AdminPayoutsPage() {
  const { user, loading } = useAuth();
  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

  const requiredSignups = useMemo(() => Math.ceil(MIN_PAYOUT_SAR / COMMISSION_PER_SIGNUP_SAR), []);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const [eligible, setEligible] = useState([]); // [{id, userId, code, signups, clicks, email, phone, name}]
  const [requests, setRequests] = useState([]); // pending payout requests [{id, ...}]

  const loadUsersMap = async (uids) => {
    const unique = Array.from(new Set((uids || []).filter(Boolean))).slice(0, 80);
    const pairs = await Promise.all(
      unique.map(async (uid) => {
        try {
          const snap = await db.collection('users').doc(uid).get();
          const d = snap.exists ? snap.data() : null;
          return [uid, d || null];
        } catch {
          return [uid, null];
        }
      })
    );
    const map = {};
    pairs.forEach(([uid, d]) => (map[uid] = d));
    return map;
  };

  const loadAll = async () => {
    if (!isAdmin) return;

    setBusy(true);
    setErr('');

    try {
      // 1) Eligible referral links (signups >= requiredSignups)
      // ترتيب: لازم orderBy على نفس الحقل
      const snapEligible = await db
        .collection('referral_links')
        .where('signups', '>=', requiredSignups)
        .orderBy('signups', 'desc')
        .limit(200)
        .get();

      const eligibleRaw = snapEligible.docs.map((d) => {
        const data = d.data() || {};
        const userId = String(data.userId || data.ownerUid || '');
        const code = String(data.code || d.id || '');
        const signups = safeNum(data.signups, 0);
        const clicks = safeNum(data.clicks, 0);
        const ownerEmail = String(data.userEmail || data.ownerEmail || '');
        return { id: d.id, userId, code, signups, clicks, ownerEmail };
      });

      // 2) Pending payout requests
      // لتجنب متطلبات Index، بدون orderBy
      const snapReq = await db
        .collection('payout_requests')
        .where('status', '==', 'pending')
        .limit(200)
        .get();

      const reqRaw = snapReq.docs.map((d) => {
        const data = d.data() || {};
        return {
          id: d.id,
          userId: String(data.userId || ''),
          userEmail: String(data.userEmail || ''),
          referralCode: String(data.referralCode || ''),
          amountSAR: safeNum(data.amountSAR, 0),
          signupsAtRequest: safeNum(data.signupsAtRequest, 0),
          method: String(data.method || 'Al-Kuraimi'),
          fullName: String(data.fullName || ''),
          phone: String(data.phone || ''),
          status: String(data.status || 'pending'),
          createdAt: data.createdAt || null,
        };
      });

      const uids = [
        ...eligibleRaw.map((x) => x.userId),
        ...reqRaw.map((x) => x.userId),
      ].filter(Boolean);

      const usersMap = await loadUsersMap(uids);

      const eligibleEnriched = eligibleRaw.map((x) => {
        const u = usersMap[x.userId] || {};
        return {
          ...x,
          name: String(u?.name || '').trim(),
          phone: String(u?.phone || '').trim(),
          email: String(u?.email || x.ownerEmail || '').trim(),
        };
      });

      const reqEnriched = reqRaw.map((x) => {
        const u = usersMap[x.userId] || {};
        return {
          ...x,
          name: String(x.fullName || u?.name || '').trim(),
          phoneFinal: String(x.phone || u?.phone || '').trim(),
        };
      });

      setEligible(eligibleEnriched);
      setRequests(reqEnriched);
    } catch (e) {
      console.error(e);
      setErr('تعذر تحميل بيانات العمولة/السحب. تأكد من الصلاحيات ووجود الحقول.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!loading && isAdmin) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAdmin]);

  const markRequest = async (id, status) => {
    if (!isAdmin) return;
    const ok = window.confirm(status === 'paid' ? 'تأكيد: تم السداد؟' : 'تأكيد: رفض الطلب؟');
    if (!ok) return;

    try {
      await db.collection('payout_requests').doc(id).update({
        status,
        updatedAt: new Date(),
        paidAt: status === 'paid' ? new Date() : null,
      });
      await loadAll();
    } catch (e) {
      console.error(e);
      alert('فشل تحديث حالة الطلب. تأكد من الصلاحيات.');
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 24 }}>
        <div className="card" style={{ padding: 16 }}>جاري التحميل…</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container" style={{ paddingTop: 24 }}>
        <div className="card" style={{ padding: 16 }}>
          <h2 style={{ margin: 0 }}>⛔ لا تملك صلاحية</h2>
          <p className="muted" style={{ marginTop: 8 }}>هذه الصفحة للمدراء فقط.</p>
          <Link className="btn" href="/">رجوع</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 40 }}>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0 }}>💰 إدارة السحب والعمولات</h1>
            <p className="muted" style={{ marginTop: 8 }}>
              المؤهل للسحب: <b>{MIN_PAYOUT_SAR}</b> ريال (يعادل <b>{requiredSignups}</b> تسجيل مؤهل) — العمولة: {COMMISSION_PER_SIGNUP_SAR} SAR
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <button className="btn btnPrimary" type="button" onClick={loadAll} disabled={busy}>
              {busy ? '⏳ تحديث…' : '🔄 تحديث'}
            </button>
            <Link className="btn" href="/admin">لوحة الإدارة</Link>
          </div>
        </div>

        {err ? (
          <div className="card" style={{ marginTop: 12, padding: 12, borderColor: 'rgba(220,38,38,.35)', color: '#991b1b' }}>
            {err}
          </div>
        ) : null}

        {/* Eligible */}
        <div className="card" style={{ marginTop: 14, padding: 12 }}>
          <div style={{ fontWeight: 950, marginBottom: 8 }}>✅ المؤهلين تلقائيًا (بدون طلب)</div>
          <div className="muted" style={{ marginBottom: 10 }}>
            هذا يساعد المالية تجهّز الميزانية حتى لو المستخدم ما طلب سحب.
          </div>

          {eligible.length === 0 ? (
            <div className="muted">لا يوجد مؤهلين حالياً.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ textAlign: 'right' }}>
                    <th style={{ padding: 8, borderBottom: '1px solid #e2e8f0' }}>المستخدم</th>
                    <th style={{ padding: 8, borderBottom: '1px solid #e2e8f0' }}>الجوال</th>
                    <th style={{ padding: 8, borderBottom: '1px solid #e2e8f0' }}>التسجيلات</th>
                    <th style={{ padding: 8, borderBottom: '1px solid #e2e8f0' }}>الأرباح (SAR)</th>
                    <th style={{ padding: 8, borderBottom: '1px solid #e2e8f0' }}>الكود</th>
                  </tr>
                </thead>
                <tbody>
                  {eligible.map((x) => {
                    const earnings = x.signups * COMMISSION_PER_SIGNUP_SAR;
                    return (
                      <tr key={x.id}>
                        <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{ fontWeight: 900 }}>{x.name || x.email || x.ownerEmail || x.userId}</div>
                          <div className="muted" style={{ fontSize: 12 }}>{x.email || ''}</div>
                        </td>
                        <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}>
                          {x.phone || '—'}
                        </td>
                        <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}>
                          {safeNum(x.signups, 0).toLocaleString('ar-YE')}
                        </td>
                        <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9', fontWeight: 900 }}>
                          {earnings.toLocaleString('ar-YE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}>
                          <span style={{ fontWeight: 900 }}>{x.code}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Requests */}
        <div className="card" style={{ marginTop: 14, padding: 12 }}>
          <div style={{ fontWeight: 950, marginBottom: 8 }}>📥 طلبات السحب (Pending)</div>

          {requests.length === 0 ? (
            <div className="muted">لا يوجد طلبات سحب حالياً.</div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {requests.map((r) => (
                <div key={r.id} className="card" style={{ padding: 12, borderColor: '#fde68a' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 950 }}>
                        {r.name || r.userEmail || r.userId}
                      </div>
                      <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                        جوال: <b>{r.phoneFinal || '—'}</b> — طريقة: <b>{r.method}</b>
                      </div>
                      <div className="muted" style={{ fontSize: 13 }}>
                        الكود: <b>{r.referralCode || '—'}</b> — تسجيلات عند الطلب: {safeNum(r.signupsAtRequest, 0).toLocaleString('ar-YE')}
                      </div>
                      <div style={{ marginTop: 6, fontWeight: 900 }}>
                        المبلغ: {safeNum(r.amountSAR, 0).toLocaleString('ar-YE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <button className="btn" type="button" onClick={() => navigator.clipboard?.writeText(r.phoneFinal || '')}>
                        نسخ الجوال
                      </button>
                      <button className="btn" type="button" onClick={() => markRequest(r.id, 'paid')}>
                        ✅ تم السداد
                      </button>
                      <button className="btn" type="button" onClick={() => markRequest(r.id, 'rejected')}>
                        ❌ رفض
                      </button>
                    </div>
                  </div>

                  <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                    ملاحظة: التحويل عبر بنك الكريمي بعد تواصل الإدارة مع المستفيد وأخذ بياناته.
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <style jsx>{`
          table th{color:#475569;font-weight:950}
          .btn{padding:10px 14px;border-radius:12px;border:2px solid #e2e8f0;background:#f8fafc;font-weight:900;cursor:pointer;text-decoration:none;color:#0f172a}
          .btnPrimary{background:linear-gradient(135deg,#4f46e5,#7c3aed);border:none;color:#fff}
        `}</style>
      </div>
    </div>
  );
}
