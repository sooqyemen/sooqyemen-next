// app/profile/page.jsx
'use client';

import { useAuth } from '@/lib/useAuth';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getCountFromServer,
  getDocs,
  addDoc,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';

const COMMISSION_PER_SIGNUP_SAR = 0.25;
const MIN_PAYOUT_SAR = 50;

function formatJoinedDate(user, userDocData) {
  const ts = userDocData?.createdAt;
  const d1 = ts?.toDate ? ts.toDate() : null;

  const creation = user?.metadata?.creationTime ? new Date(user.metadata.creationTime) : null;
  const d = d1 || creation;
  if (!d || Number.isNaN(d.getTime())) return 'غير معروف';

  return d.toLocaleDateString('ar-YE', { year: 'numeric', month: 'long' });
}

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function generateReferralCode(len = 8) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  try {
    const bytes = new Uint8Array(len);
    // eslint-disable-next-line no-undef
    crypto.getRandomValues(bytes);
    for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
    return out;
  } catch {
    for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
    return out;
  }
}

export default function ProfilePage() {
  const { user, loading, publicUserId } = useAuth();

  const [activeTab, setActiveTab] = useState('info');
  const [editMode, setEditMode] = useState(false);

  const [busySave, setBusySave] = useState(false);
  const [busyStats, setBusyStats] = useState(false);
  const [err, setErr] = useState('');

  const [userDocData, setUserDocData] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: 'صنعاء',
    bio: '',
  });

  const [stats, setStats] = useState({
    listings: null,
    sold: null,
    active: null,
    rating: null,
    joinedDate: null,
  });

  // ===== Referral (برنامج العمولة) =====
  const [refBusy, setRefBusy] = useState(false);
  const [refErr, setRefErr] = useState('');
  const [refData, setRefData] = useState(null); // { id, code, clicks, signups, createdAt }
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin || '');
    }
  }, []);

  const referralLink = useMemo(() => {
    if (!origin || !refData?.code) return '';
    return `${origin}/?ref=${encodeURIComponent(refData.code)}`;
  }, [origin, refData?.code]);

  const earningsSAR = useMemo(() => {
    const signups = safeNum(refData?.signups, 0);
    return signups * COMMISSION_PER_SIGNUP_SAR;
  }, [refData?.signups]);

  const canWithdraw = useMemo(() => earningsSAR >= MIN_PAYOUT_SAR, [earningsSAR]);

  const requiredSignupsForMin = useMemo(() => {
    return Math.ceil(MIN_PAYOUT_SAR / COMMISSION_PER_SIGNUP_SAR); // 200
  }, []);

  // ✅ دالة تجيب الرابط من Firestore وتُرجع البيانات (وتحدث state)
  // ✅ تدعم userId (قديم) + ownerUid (جديد)
  const fetchReferral = async (uid) => {
    // 1) محاولة بالصيغة القديمة userId
    let qRef = query(collection(db, 'referral_links'), where('userId', '==', uid), limit(1));
    let snap = await getDocs(qRef);

    // 2) لو ما لقى.. جرّب الصيغة الجديدة ownerUid
    if (snap.empty) {
      qRef = query(collection(db, 'referral_links'), where('ownerUid', '==', uid), limit(1));
      snap = await getDocs(qRef);
    }

    if (snap.empty) return null;

    const d = snap.docs[0];
    const data = d.data() || {};
    const out = {
      id: d.id,
      code: String(data.code || d.id || ''),
      clicks: safeNum(data.clicks, 0),
      signups: safeNum(data.signups, 0),
      createdAt: data.createdAt || null,
    };

    setRefData(out);
    return out;
  };

  const loadReferral = async (uid) => {
    setRefErr('');
    try {
      const out = await fetchReferral(uid);
      if (!out) setRefData(null);
    } catch (e) {
      console.error(e);
      setRefErr('تعذر تحميل بيانات برنامج العمولة.');
    }
  };

  const ensureReferral = async () => {
    if (!user) return;

    setRefBusy(true);
    setRefErr('');

    try {
      // ✅ لو موجود مسبقاً: لا نعيد الإنشاء (تحقق مباشر من Firestore)
      const existing = await fetchReferral(user.uid);
      if (existing?.code) return;

      // ✅ إنشاء رابط جديد مرة واحدة
      const code = generateReferralCode(8);

      await addDoc(collection(db, 'referral_links'), {
        userId: user.uid, // نخليه موجود للتوافق
        ownerUid: user.uid, // نخليه موجود للتوافق
        userEmail: user.email || '',
        ownerEmail: user.email || '',
        code,
        clicks: 0,
        signups: 0,
        currency: 'SAR',
        commissionPerSignup: COMMISSION_PER_SIGNUP_SAR,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // reload to get doc id/code safely
      await fetchReferral(user.uid);
    } catch (e) {
      console.error(e);
      setRefErr('تعذر إنشاء الرابط. تأكد من الصلاحيات (Firestore Rules).');
    } finally {
      setRefBusy(false);
    }
  };

  const copyReferralLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      alert('✅ تم نسخ الرابط');
    } catch {
      window.prompt('انسخ الرابط:', referralLink);
    }
  };

  const scrollToReferral = () => {
    try {
      document.getElementById('referral-box')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {}
  };

  // تحميل بيانات المستخدم من Firestore (users/{uid})
  useEffect(() => {
    if (!user) return;

    let mounted = true;

    const loadUserDoc = async () {
      setErr('');
      try {
        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);

        if (!mounted) return;

        if (snap.exists()) {
          const data = snap.data();
          setUserDocData(data);

          setFormData({
            name: data?.name || user?.name || '',
            email: user?.email || data?.email || '',
            phone: data?.phone || '',
            city: data?.city || 'صنعاء',
            bio: data?.bio || '',
          });

          setStats((s) => ({
            ...s,
            rating: typeof data?.ratingAvg === 'number' ? data.ratingAvg : null,
            joinedDate: formatJoinedDate(user, data),
          }));
        } else {
          const initial = {
            email: user?.email || '',
            name: user?.name || '',
            phone: '',
            city: 'صنعاء',
            bio: '',
            ratingAvg: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          await setDoc(ref, initial, { merge: true });

          if (!mounted) return;

          setUserDocData(initial);
          setFormData({
            name: initial.name || user?.email?.split('@')?.[0] || '',
            email: user?.email || '',
            phone: '',
            city: 'صنعاء',
            bio: '',
          });

          setStats((s) => ({
            ...s,
            rating: null,
            joinedDate: formatJoinedDate(user, initial),
          }));
        }
      } catch (e) {
        console.error(e);
        if (!mounted) return;
        setErr('تعذر تحميل بيانات المستخدم.');
      }
    };

    loadUserDoc();
    return () => {
      mounted = false;
    };
  }, [user]);

  // تحميل الإحصائيات الحقيقية من Firestore
  useEffect(() => {
    if (!user) return;

    let mounted = true;

    const loadStats = async () => {
      setBusyStats(true);
      setErr('');

      try {
        const uid = user.uid;

        const qAll = query(collection(db, 'listings'), where('userId', '==', uid));
        const qActive = query(
          collection(db, 'listings'),
          where('userId', '==', uid),
          where('isActive', '==', true)
        );

        let soldCount = 0;

        const allCountPromise = getCountFromServer(qAll);
        const activeCountPromise = getCountFromServer(qActive);

        let soldPromise1 = null;
        try {
          const qSoldStatus = query(
            collection(db, 'listings'),
            where('userId', '==', uid),
            where('status', '==', 'sold')
          );
          soldPromise1 = getCountFromServer(qSoldStatus);
        } catch {
          soldPromise1 = null;
        }

        let soldPromise2 = null;
        try {
          const qSoldFlag = query(
            collection(db, 'listings'),
            where('userId', '==', uid),
            where('isSold', '==', true)
          );
          soldPromise2 = getCountFromServer(qSoldFlag);
        } catch {
          soldPromise2 = null;
        }

        const [allCountRes, activeCountRes, soldRes1, soldRes2] = await Promise.all([
          allCountPromise,
          activeCountPromise,
          soldPromise1,
          soldPromise2,
        ]);

        const sold1 = soldRes1?.data?.().count ?? 0;
        const sold2 = soldRes2?.data?.().count ?? 0;
        soldCount = Math.max(sold1, sold2);

        if (!mounted) return;

        setStats((s) => ({
          ...s,
          listings: allCountRes.data().count,
          active: activeCountRes.data().count,
          sold: soldCount,
        }));
      } catch (e) {
        console.error(e);
        if (!mounted) return;
        setErr('تعذر تحميل الإحصائيات (تأكد من حقول الإعلانات/الصلاحيات).');
      } finally {
        if (mounted) setBusyStats(false);
      }
    };

    loadStats();
    return () => {
      mounted = false;
    };
  }, [user]);

  // تحميل بيانات برنامج العمولة
  useEffect(() => {
    if (!user) return;
    loadReferral(user.uid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const joinedDate = useMemo(() => {
    if (!user) return '';
    return stats.joinedDate || formatJoinedDate(user, userDocData);
  }, [stats.joinedDate, user, userDocData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!user) return;

    setBusySave(true);
    setErr('');

    try {
      const ref = doc(db, 'users', user.uid);

      await setDoc(
        ref,
        {
          name: formData.name || '',
          phone: formData.phone || '',
          city: formData.city || 'صنعاء',
          bio: formData.bio || '',
          email: user.email || formData.email || '',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setEditMode(false);
    } catch (e) {
      console.error(e);
      setErr('تعذر حفظ البيانات. حاول مرة أخرى.');
    } finally {
      setBusySave(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner" />
        <p>جاري تحميل بيانات الملف الشخصي...</p>

        <style jsx>{`
          .profile-loading{
            display:flex;flex-direction:column;align-items:center;justify-content:center;
            min-height:60vh;gap:18px;color:#64748b;
          }
          .loading-spinner{
            width:50px;height:50px;border:4px solid #f1f5f9;border-top-color:#4f46e5;border-radius:50%;
            animation:spin 1s linear infinite;
          }
          @keyframes spin{to{transform:rotate(360deg)}}
        `}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-not-signed-in">
        <div className="not-signed-in-content">
          <div className="lock-icon">🔒</div>
          <h2>لم تقم بتسجيل الدخول</h2>
          <p>يجب عليك تسجيل الدخول لعرض الملف الشخصي</p>
          <div className="auth-buttons">
            <Link href="/login" className="login-btn">تسجيل الدخول</Link>
            <Link href="/register" className="register-btn">إنشاء حساب جديد</Link>
          </div>
        </div>

        <style jsx>{`
          .profile-not-signed-in{display:flex;align-items:center;justify-content:center;min-height:70vh;padding:20px;text-align:center;}
          .not-signed-in-content{max-width:420px;background:#fff;padding:38px;border-radius:18px;box-shadow:0 10px 28px rgba(0,0,0,.08);}
          .lock-icon{font-size:56px;margin-bottom:14px;opacity:.75}
          h2{margin:0 0 8px;color:#1e293b}
          p{margin:0 0 18px;color:#64748b}
          .auth-buttons{display:flex;flex-direction:column;gap:10px}
          .login-btn,.register-btn{padding:12px;border-radius:10px;text-decoration:none;font-weight:800}
          .login-btn{background:#f8fafc;color:#4f46e5;border:2px solid #e2e8f0}
          .register-btn{background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff}
        `}</style>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-banner">
          <div className="banner-overlay">
            <h1>الملف الشخصي</h1>
            <p>إدارة معلوماتك وتفضيلاتك</p>
          </div>
        </div>

        <div className="profile-main-info">
          <div className="avatar-section">
            <div className="profile-avatar">
              {formData.name?.charAt(0) || publicUserId?.charAt(0) || '👤'}
            </div>

            <div className="avatar-actions">
              <button className="remove-avatar-btn" type="button" disabled>
                تغيير الصورة (قريباً)
              </button>
            </div>
          </div>

          <div className="profile-info">
            <div className="profile-name-section">
              {editMode ? (
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="edit-name-input"
                  placeholder="الاسم الكامل"
                />
              ) : (
                <h2>{formData.name || publicUserId || 'مستخدم'}</h2>
              )}

              <div className="profile-badges">
                <span className="badge verified">✓ حساب</span>
                <span className="badge member">عضو منذ {joinedDate}</span>
                {busyStats ? <span className="badge member">⏳ تحديث الإحصائيات…</span> : null}
              </div>
            </div>

            <div className="profile-actions">
              {editMode ? (
                <>
                  <button onClick={handleSave} className="save-btn" type="button" disabled={busySave}>
                    {busySave ? '⏳ جاري الحفظ…' : '💾 حفظ التغييرات'}
                  </button>
                  <button onClick={() => setEditMode(false)} className="cancel-btn" type="button" disabled={busySave}>
                    ❌ إلغاء
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setEditMode(true)} className="edit-btn" type="button">
                    ✏️ تعديل الملف الشخصي
                  </button>
                  <Link href="/my-listings" className="my-listings-btn">📋 إعلاناتي</Link>
                  <Link href="/my-chats" className="my-chats-btn">💬 محادثاتي</Link>
                  <button onClick={scrollToReferral} className="ref-btn" type="button">
                    🤝 برنامج العمولة
                  </button>
                </>
              )}
            </div>

            {err ? <div className="err">{err}</div> : null}
          </div>
        </div>
      </div>

      {/* إحصائيات حقيقية */}
      <div className="profile-stats">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <span className="stat-number">{stats.listings ?? '—'}</span>
            <span className="stat-label">إعلاناتي</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <span className="stat-number">{stats.sold ?? 0}</span>
            <span className="stat-label">تم البيع</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🔄</div>
          <div className="stat-info">
            <span className="stat-number">{stats.active ?? '—'}</span>
            <span className="stat-label">نشطة حالياً</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-info">
            <span className="stat-number">
              {typeof stats.rating === 'number' ? stats.rating.toFixed(1) : '—'}
            </span>
            <span className="stat-label">التقييم</span>
          </div>
        </div>
      </div>

      {/* ===== برنامج العمولة ===== */}
      <div id="referral-box" className="referral-box">
        <div className="referral-head">
          <div>
            <h3 className="referral-title">🤝 برنامج العمولة</h3>
            <p className="referral-sub">
              عمولتك الحالية: <b>{COMMISSION_PER_SIGNUP_SAR.toFixed(2)}</b> ريال سعودي لكل مستخدم مؤهل.
            </p>
          </div>

          {!refData?.code ? (
            <button
              type="button"
              onClick={ensureReferral}
              className="referral-create"
              disabled={refBusy}
            >
              {refBusy ? '⏳ جاري الإنشاء…' : '➕ إنشاء رابط العمولة'}
            </button>
          ) : (
            <button type="button" onClick={copyReferralLink} className="referral-copy" disabled={!referralLink}>
              📋 نسخ الرابط
            </button>
          )}
        </div>

        {refErr ? <div className="referral-err">{refErr}</div> : null}

        {refData?.code ? (
          <>
            <div className="referral-link-row">
              <div className="referral-link">
                <div className="referral-link-label">رابطك الخاص</div>
                <div className="referral-link-value" dir="ltr">
                  {referralLink}
                </div>
              </div>

              <div className="referral-code">
                <div className="referral-link-label">الكود</div>
                <div className="referral-code-value">{refData.code}</div>
              </div>
            </div>

            <div className="referral-stats">
              <div className="refStat">
                <div className="refStatIc">👀</div>
                <div className="refStatBody">
                  <div className="refStatNum">{safeNum(refData.clicks, 0).toLocaleString('ar-YE')}</div>
                  <div className="refStatLbl">زيارات الرابط</div>
                </div>
              </div>

              <div className="refStat">
                <div className="refStatIc">✅</div>
                <div className="refStatBody">
                  <div className="refStatNum">{safeNum(refData.signups, 0).toLocaleString('ar-YE')}</div>
                  <div className="refStatLbl">مسجلين مؤهلين</div>
                </div>
              </div>

              <div className="refStat">
                <div className="refStatIc">💵</div>
                <div className="refStatBody">
                  <div className="refStatNum">
                    {earningsSAR.toLocaleString('ar-YE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="refStatLbl">أرباحك (SAR)</div>
                </div>
              </div>
            </div>

            {/* ✅ حالة السحب */}
            <div className={`payout-status ${canWithdraw ? 'ok' : 'wait'}`}>
              <div className="payout-title">
                {canWithdraw ? '✅ مؤهل للسحب' : '⏳ غير مؤهل للسحب بعد'}
              </div>
              <div className="payout-sub">
                الحد الأدنى للسحب هو <b>{MIN_PAYOUT_SAR}</b> ريال سعودي.
                {canWithdraw ? (
                  <> رصيدك وصل للحد المطلوب.</>
                ) : (
                  <> تحتاج تقريبًا إلى <b>{requiredSignupsForMin}</b> تسجيل مؤهل للوصول للحد الأدنى.</>
                )}
              </div>

              {/* ✅ زر طلب السحب يظهر فقط إذا مؤهل */}
              {canWithdraw ? (
                <div style={{ marginTop: 10 }}>
                  <Link href="/payout/request" className="payout-btn">
                    💸 طلب سحب الأرباح
                  </Link>
                </div>
              ) : null}
            </div>

            {/* ✅ سياسة التحويل */}
            <div className="payout-policy">
              <div className="policy-title">سياسة السحب والتحويل (بنك الكريمي)</div>
              <ul className="policy-list">
                <li>الحد الأدنى للسحب: <b>{MIN_PAYOUT_SAR} ريال سعودي</b>.</li>
                <li>لا يتم تحويل مبالغ أقل من <b>{MIN_PAYOUT_SAR}</b> ريال.</li>
                <li>التحويل يتم عبر <b>بنك الكريمي</b>.</li>
                <li>عند تقديم طلب سحب (بعد التأهل)، تقوم الإدارة بالتواصل معك لإرسال بيانات التحويل (مثل الاسم الكامل وبيانات الكريمي).</li>
              </ul>
              <div className="policy-tip">
                <b>تنبيه أمان:</b> لا تشارك بياناتك البنكية علنًا. سيتم طلبها منك بشكل خاص من الإدارة.
              </div>
            </div>

            <div className="referral-note">
              <b>ملاحظة:</b> التسجيلات من نفس الجهاز/الآي بي قد لا تُحسب كعمولة إذا كانت مشبوهة، لكن التسجيل نفسه مسموح ولن نمنع المستخدم.
            </div>
          </>
        ) : (
          <div className="referral-empty">
            لم تقم بإنشاء رابط عمولة بعد. اضغط <b>“إنشاء رابط العمولة”</b> وسيتم حفظه لك بشكل دائم.
          </div>
        )}
      </div>

      {/* تبويبات */}
      <div className="profile-tabs">
        <button className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')} type="button">
          ℹ️ المعلومات الشخصية
        </button>
        <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')} type="button">
          ⚙️ الإعدادات
        </button>
        <button className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')} type="button">
          🔒 الأمان
        </button>
        <button className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')} type="button">
          📊 النشاطات
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'info' && (
          <div className="info-tab">
            <h3>المعلومات الشخصية</h3>
            <div className="info-grid">
              <div className="info-field">
                <label>الاسم الكامل</label>
                {editMode ? (
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="أدخل اسمك الكامل" />
                ) : (
                  <p>{formData.name || 'لم يتم إضافة اسم'}</p>
                )}
              </div>

              <div className="info-field">
                <label>البريد الإلكتروني</label>
                <p>رقم المستخدم: {publicUserId || '...'}</p>
                <span className="email-note">(رقم تعريفي ثابت)</span>
              </div>

              <div className="info-field">
                <label>رقم الجوال</label>
                {editMode ? (
                  <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="أدخل رقم جوالك" />
                ) : (
                  <p>{formData.phone || 'لم يتم إضافة رقم جوال'}</p>
                )}
              </div>

              <div className="info-field">
                <label>المدينة</label>
                {editMode ? (
                  <select name="city" value={formData.city} onChange={handleInputChange}>
                    <option value="صنعاء">صنعاء</option>
                    <option value="عدن">عدن</option>
                    <option value="تعز">تعز</option>
                    <option value="حضرموت">حضرموت</option>
                    <option value="المكلا">المكلا</option>
                    <option value="إب">إب</option>
                    <option value="ذمار">ذمار</option>
                    <option value="الحديدة">الحديدة</option>
                  </select>
                ) : (
                  <p>{formData.city}</p>
                )}
              </div>

              <div className="info-field full-width">
                <label>نبذة عني</label>
                {editMode ? (
                  <textarea name="bio" value={formData.bio} onChange={handleInputChange} placeholder="أخبرنا عن نفسك..." rows="4" />
                ) : (
                  <p>{formData.bio || 'لم يتم إضافة نبذة'}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && <div className="settings-tab"><h3>إعدادات الحساب</h3><p className="muted">قريباً…</p></div>}
        {activeTab === 'security' && <div className="security-tab"><h3>أمان الحساب</h3><p className="muted">قريباً…</p></div>}
        {activeTab === 'activity' && <div className="activity-tab"><h3>نشاطاتك الأخيرة</h3><p className="muted">قريباً…</p></div>}
      </div>

      <div className="quick-links">
        <h3>روابط سريعة</h3>
        <div className="links-grid">
          <Link href="/add" className="quick-link"><span className="link-icon">➕</span><span className="link-text">إضافة إعلان جديد</span></Link>
          <Link href="/favorites" className="quick-link"><span className="link-icon">❤️</span><span className="link-text">المفضلة</span></Link>
          <Link href="/help" className="quick-link"><span className="link-icon">❓</span><span className="link-text">مساعدة ودعم</span></Link>
          <Link href="/privacy" className="quick-link"><span className="link-icon">🔒</span><span className="link-text">سياسة الخصوصية</span></Link>
        </div>
      </div>

      <style jsx>{`
        .profile-page{max-width:1200px;margin:0 auto;padding:20px;}
        .profile-banner{background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:20px 20px 0 0;height:200px;position:relative;overflow:hidden;}
        .banner-overlay{position:absolute;inset:0;background:rgba(0,0,0,.2);display:flex;flex-direction:column;justify-content:center;padding:40px;color:#fff;}
        .banner-overlay h1{font-size:32px;margin:0 0 8px;font-weight:900;}
        .banner-overlay p{margin:0;opacity:.9}
        .profile-main-info{background:#fff;border-radius:0 0 20px 20px;padding:30px;display:flex;gap:40px;align-items:center;box-shadow:0 4px 20px rgba(0,0,0,.08);}
        .profile-avatar{width:120px;height:120px;background:linear-gradient(135deg,#8b5cf6,#6366f1);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:48px;color:#fff;font-weight:900;border:5px solid #fff;box-shadow:0 8px 25px rgba(0,0,0,.1);}
        .avatar-actions{display:flex;gap:10px}
        .remove-avatar-btn{padding:8px 14px;border-radius:10px;border:2px solid #e2e8f0;background:#f8fafc;color:#64748b;font-weight:800}
        .profile-info{flex:1}
        .profile-name-section h2{font-size:28px;color:#1e293b;margin:0 0 10px;}
        .edit-name-input{width:100%;padding:12px;font-size:24px;border:2px solid #e2e8f0;border-radius:10px;background:#f8fafc;font-weight:900}
        .profile-badges{display:flex;gap:10px;flex-wrap:wrap}
        .badge{padding:6px 12px;border-radius:20px;font-size:12px;font-weight:900}
        .badge.verified{background:#d1fae5;color:#065f46}
        .badge.member{background:#dbeafe;color:#1e40af}
        .profile-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:14px}
        .edit-btn,.save-btn,.cancel-btn,.my-listings-btn,.my-chats-btn,.ref-btn{padding:12px 18px;border-radius:12px;font-weight:900;text-decoration:none;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:8px;font-size:14px}
        .edit-btn{background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff}
        .save-btn{background:#10b981;color:#fff}
        .cancel-btn{background:#f1f5f9;color:#64748b}
        .my-listings-btn{background:#f8fafc;color:#4f46e5;border:2px solid #e2e8f0}
        .my-chats-btn{background:#fef3c7;color:#92400e;border:2px solid #fde68a}
        .ref-btn{background:#ecfeff;color:#155e75;border:2px solid #a5f3fc}
        .err{margin-top:12px;padding:10px 12px;border-radius:12px;background:rgba(220,38,38,.08);border:1px solid rgba(220,38,38,.25);color:#991b1b;font-weight:800}

        .profile-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin:24px 0 18px;}
        .stat-card{background:#fff;padding:22px;border-radius:15px;display:flex;align-items:center;gap:18px;box-shadow:0 4px 15px rgba(0,0,0,.05);}
        .stat-icon{font-size:36px;width:56px;height:56px;background:#f8fafc;border-radius:12px;display:flex;align-items:center;justify-content:center;}
        .stat-number{font-size:30px;font-weight:950;color:#1e293b;line-height:1}
        .stat-label{font-size:14px;color:#64748b;margin-top:4px}

        /* Referral box */
        .referral-box{
          background:#fff;border-radius:20px;padding:22px;margin:8px 0 28px;
          box-shadow:0 4px 20px rgba(0,0,0,.08);
          border:1px solid #eef2ff;
        }
        .referral-head{
          display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;
          padding-bottom:14px;border-bottom:2px solid #f1f5f9;margin-bottom:14px;
        }
        .referral-title{margin:0;color:#1e293b;font-size:20px}
        .referral-sub{margin:6px 0 0;color:#64748b;font-weight:800}
        .referral-create,.referral-copy{
          padding:12px 16px;border-radius:12px;border:none;cursor:pointer;font-weight:900;
        }
        .referral-create{background:linear-gradient(135deg,#0ea5e9,#2563eb);color:#fff}
        .referral-copy{background:#f8fafc;color:#4f46e5;border:2px solid #e2e8f0}
        .referral-create:disabled,.referral-copy:disabled{opacity:.65;cursor:not-allowed}
        .referral-err{
          margin:10px 0 12px;padding:10px 12px;border-radius:12px;
          background:rgba(220,38,38,.08);border:1px solid rgba(220,38,38,.25);color:#991b1b;font-weight:900;
        }
        .referral-link-row{
          display:grid;grid-template-columns: 1fr 170px;gap:12px;align-items:stretch;
          margin-top:10px;
        }
        .referral-link,.referral-code{
          background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:12px;
        }
        .referral-link-label{font-size:12px;color:#64748b;font-weight:900;margin-bottom:6px}
        .referral-link-value{
          font-weight:900;color:#0f172a;word-break:break-all;line-height:1.35;
        }
        .referral-code-value{
          font-weight:950;color:#0f172a;font-size:18px;letter-spacing:1px
        }

        .referral-stats{
          display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
          gap:12px;margin-top:14px;
        }
        .refStat{
          background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px;
          display:flex;gap:12px;align-items:center;
        }
        .refStatIc{
          width:46px;height:46px;border-radius:12px;background:#f8fafc;display:flex;align-items:center;justify-content:center;
          font-size:22px;
        }
        .refStatNum{font-size:22px;font-weight:950;color:#1e293b;line-height:1}
        .refStatLbl{margin-top:4px;color:#64748b;font-weight:900;font-size:13px}

        .payout-status{
          margin-top:12px;border-radius:14px;padding:14px;border:1px solid;
          font-weight:900;
        }
        .payout-status.ok{background:#ecfdf5;border-color:#86efac;color:#065f46}
        .payout-status.wait{background:#eff6ff;border-color:#93c5fd;color:#1e40af}
        .payout-title{font-size:16px;margin-bottom:6px}
        .payout-sub{font-size:13px;opacity:.95;line-height:1.6}

        .payout-btn{
          display:inline-flex;align-items:center;gap:8px;
          padding:10px 14px;border-radius:12px;
          background:linear-gradient(135deg,#10b981,#059669);
          color:#fff;text-decoration:none;font-weight:950;
        }

        .payout-policy{
          margin-top:12px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px;
        }
        .policy-title{font-weight:950;color:#0f172a;margin-bottom:8px}
        .policy-list{margin:0;padding-right:18px;color:#334155;font-weight:850;line-height:1.9}
        .policy-tip{
          margin-top:10px;padding:10px 12px;border-radius:12px;
          background:#fefce8;border:1px solid #fde68a;color:#92400e;font-weight:900;
        }

        .referral-note{
          margin-top:12px;padding:12px;border-radius:14px;
          background:#fefce8;border:1px solid #fde68a;color:#92400e;font-weight:850;
        }
        .referral-empty{
          margin-top:12px;padding:14px;border-radius:14px;background:#f8fafc;border:1px dashed #cbd5e1;color:#475569;font-weight:900;
        }

        .profile-tabs{display:flex;gap:10px;margin-bottom:20px;overflow-x:auto;padding-bottom:8px}
        .tab-btn{padding:14px 18px;background:#f8fafc;border:none;border-radius:12px;font-weight:900;color:#64748b;cursor:pointer;white-space:nowrap;display:flex;gap:10px;align-items:center}
        .tab-btn.active{background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff}

        .tab-content{background:#fff;border-radius:20px;padding:30px;margin-bottom:30px;box-shadow:0 4px 20px rgba(0,0,0,.08);}
        .tab-content h3{margin:0 0 20px;color:#1e293b;font-size:22px;padding-bottom:12px;border-bottom:2px solid #f1f5f9;}

        .info-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px}
        .info-field{display:flex;flex-direction:column;gap:8px}
        .info-field label{font-weight:900;color:#475569;font-size:14px}
        .info-field p{padding:12px;background:#f8fafc;border-radius:10px;color:#1e293b;min-height:46px;display:flex;align-items:center}
        .info-field input,.info-field select,.info-field textarea{padding:12px;border:2px solid #e2e8f0;border-radius:10px;background:#f8fafc}
        .info-field.full-width{grid-column:1/-1}
        .email-note{font-size:12px;color:#94a3b8}

        .quick-links{background:#fff;border-radius:20px;padding:30px;box-shadow:0 4px 20px rgba(0,0,0,.08);}
        .quick-links h3{margin:0 0 20px;color:#1e293b;font-size:22px}
        .links-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px}
        .quick-link{display:flex;align-items:center;gap:14px;padding:18px;background:#f8fafc;border-radius:12px;text-decoration:none;color:#1e293b;font-weight:900}
        .quick-link:hover{background:#4f46e5;color:#fff}

        .muted{color:#64748b;font-weight:800}

        @media (max-width:768px){
          .profile-page{padding:10px}
          .profile-main-info{flex-direction:column;text-align:center;gap:18px;padding:20px}
          .profile-actions{justify-content:center}
          .referral-link-row{grid-template-columns: 1fr;}
          .referral-head{align-items:stretch}
          .referral-create,.referral-copy{width:100%}
        }
      `}</style>
    </div>
  );
}
