// app/profile/page.jsx
'use client';

import { useAuth } from '@/lib/useAuth';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { signOut, reauthenticateWithCredential, EmailAuthProvider, updatePassword } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';

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
  orderBy,
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
    crypto.getRandomValues(bytes);
    for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
    return out;
  } catch {
    for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
    return out;
  }
}

// مكون عرض النشاط
function ActivityItem({ activity }) {
  const getActivityIcon = (type) => {
    const icons = {
      listing_created: '📋',
      listing_updated: '✏️',
      listing_sold: '💰',
      profile_updated: '👤',
      login: '🔐',
      password_changed: '🔒',
      referral_signup: '🤝',
      rating_given: '⭐',
      chat_started: '💬',
    };
    return icons[type] || '📝';
  };

  const getActivityText = (activity) => {
    const texts = {
      listing_created: 'قمت بإنشاء إعلان جديد',
      listing_updated: 'قمت بتحديث إعلان',
      listing_sold: 'قمت ببيع إعلان',
      profile_updated: 'قمت بتحديث ملفك الشخصي',
      login: 'تسجيل دخول جديد',
      password_changed: 'قمت بتغيير كلمة المرور',
      referral_signup: 'تسجيل جديد عبر رابطك',
      rating_given: 'قمت بتقييم مستخدم',
      chat_started: 'بدأت محادثة جديدة',
    };
    
    const base = texts[activity.type] || 'نشاط جديد';
    if (activity.metadata?.listingTitle) {
      return `${base}: "${activity.metadata.listingTitle}"`;
    }
    if (activity.metadata?.referralCode) {
      return `${base} باستخدام الكود: ${activity.metadata.referralCode}`;
    }
    return base;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('ar-YE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="activity-item">
      <div className="activity-icon">{getActivityIcon(activity.type)}</div>
      <div className="activity-content">
        <div className="activity-text">{getActivityText(activity)}</div>
        <div className="activity-time">{formatTime(activity.createdAt)}</div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, loading, publicUserId } = useAuth();

  const [activeTab, setActiveTab] = useState('info');
  const [editMode, setEditMode] = useState(false);

  const [busySave, setBusySave] = useState(false);
  const [busyStats, setBusyStats] = useState(false);
  const [err, setErr] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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

  // ===== الإعدادات =====
  const [settings, setSettings] = useState({
    language: 'ar',
    emailNotifications: true,
    appNotifications: true,
    showPhone: false,
    theme: 'light',
  });

  const [savingSettings, setSavingSettings] = useState(false);

  // ===== الأمان =====
  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [activeSessions, setActiveSessions] = useState([]);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // ===== النشاط =====
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [hasMoreActivities, setHasMoreActivities] = useState(true);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const ACTIVITIES_PER_PAGE = 10;

  // ===== Referral (برنامج العمولة) =====
  const [refBusy, setRefBusy] = useState(false);
  const [refErr, setRefErr] = useState('');
  const [refData, setRefData] = useState(null);
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
    return Math.ceil(MIN_PAYOUT_SAR / COMMISSION_PER_SIGNUP_SAR);
  }, []);

  // دالة تسجيل النشاط
  const logActivity = async (type, metadata = {}) => {
    if (!user) return;

    try {
      await addDoc(collection(db, 'user_activities'), {
        userId: user.uid,
        type,
        metadata,
        createdAt: serverTimestamp(),
        userEmail: user.email || '',
        userName: formData.name || user.email?.split('@')[0] || '',
      });
    } catch (error) {
      console.error('فشل تسجيل النشاط:', error);
    }
  };

  const fetchReferral = async (uid) => {
    let qRef = query(collection(db, 'referral_links'), where('userId', '==', uid), limit(1));
    let snap = await getDocs(qRef);

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
      const existing = await fetchReferral(user.uid);
      if (existing?.code) return;

      const code = generateReferralCode(8);

      await addDoc(collection(db, 'referral_links'), {
        userId: user.uid,
        ownerUid: user.uid,
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

      await fetchReferral(user.uid);
      await logActivity('referral_link_created', { code });
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

  // تحميل بيانات المستخدم من Firestore
  useEffect(() => {
    if (!user) return;

    let mounted = true;

    const loadUserDoc = async () => {
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

          // تحميل الإعدادات
          if (data.settings) {
            setSettings(prev => ({ ...prev, ...data.settings }));
          }

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
            settings: {
              language: 'ar',
              emailNotifications: true,
              appNotifications: true,
              showPhone: false,
              theme: 'light',
            },
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

  // تحميل الإحصائيات
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
        setErr('تعذر تحميل الإحصائيات.');
      } finally {
        if (mounted) setBusyStats(false);
      }
    };

    loadStats();
    return () => {
      mounted = false;
    };
  }, [user]);

  // تحميل النشاطات
  useEffect(() => {
    if (!user || activeTab !== 'activity') return;

    const loadActivities = async () => {
      setLoadingActivities(true);
      try {
        const q = query(
          collection(db, 'user_activities'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(ACTIVITIES_PER_PAGE * activitiesPage)
        );

        const snapshot = await getDocs(q);
        const activitiesList = [];
        snapshot.forEach((doc) => {
          activitiesList.push({ id: doc.id, ...doc.data() });
        });

        setActivities(activitiesList);
        setHasMoreActivities(activitiesList.length >= ACTIVITIES_PER_PAGE * activitiesPage);
      } catch (error) {
        console.error('خطأ في تحميل النشاطات:', error);
      } finally {
        setLoadingActivities(false);
      }
    };

    loadActivities();
  }, [user, activeTab, activitiesPage]);

  // تحميل بيانات برنامج العمولة
  useEffect(() => {
    if (!user) return;
    loadReferral(user.uid);
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
    setSuccessMsg('');

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

      await logActivity('profile_updated', {
        name: formData.name,
        city: formData.city,
      });

      setEditMode(false);
      setSuccessMsg('✅ تم حفظ التغييرات بنجاح');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      console.error(e);
      setErr('تعذر حفظ البيانات. حاول مرة أخرى.');
    } finally {
      setBusySave(false);
    }
  };

  // حفظ الإعدادات
  const handleSaveSettings = async () => {
    if (!user) return;

    setSavingSettings(true);
    try {
      const ref = doc(db, 'users', user.uid);
      await setDoc(
        ref,
        {
          settings,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await logActivity('settings_updated');
      setSuccessMsg('✅ تم حفظ الإعدادات بنجاح');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error('خطأ في حفظ الإعدادات:', error);
      setErr('تعذر حفظ الإعدادات');
    } finally {
      setSavingSettings(false);
    }
  };

  // تغيير كلمة المرور
  const handleChangePassword = async () => {
    if (!user) return;

    const { currentPassword, newPassword, confirmPassword } = securityData;

    if (newPassword !== confirmPassword) {
      setErr('كلمات المرور الجديدة غير متطابقة');
      return;
    }

    if (newPassword.length < 6) {
      setErr('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setChangingPassword(true);
    setErr('');
    setSuccessMsg('');

    try {
      // إعادة المصادقة
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // تغيير كلمة المرور
      await updatePassword(user, newPassword);

      await logActivity('password_changed');
      
      setSecurityData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
      setSuccessMsg('✅ تم تغيير كلمة المرور بنجاح');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      console.error('خطأ في تغيير كلمة المرور:', error);
      switch (error.code) {
        case 'auth/wrong-password':
          setErr('كلمة المرور الحالية غير صحيحة');
          break;
        case 'auth/weak-password':
          setErr('كلمة المرور الجديدة ضعيفة جداً');
          break;
        default:
          setErr('حدث خطأ أثناء تغيير كلمة المرور');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  // تسجيل الخروج من جميع الأجهزة
  const handleLogoutAllDevices = async () => {
    if (!user) return;

    if (confirm('هل أنت متأكد من تسجيل الخروج من جميع الأجهزة؟')) {
      try {
        // هذا مثال مبسط - في التطبيق الحقيقي ستحتاج إلى إدارة جلسات يدوياً في Firestore
        alert('هذه الميزة قيد التطوير. حالياً، سجل الخروج يدوياً من كل جهاز.');
      } catch (error) {
        console.error('خطأ في تسجيل الخروج:', error);
      }
    }
  };

  // تحميل المزيد من النشاطات
  const loadMoreActivities = () => {
    setActivitiesPage(prev => prev + 1);
  };

  // دالة تسجيل الخروج
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('خطأ في تسجيل الخروج:', error);
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
      {/* الرسائل */}
      {successMsg && <div className="success-message">{successMsg}</div>}
      {err && <div className="error-message">{err}</div>}

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
                <span className="badge verified">✓ حساب موثق</span>
                <span className="badge member">عضو منذ {joinedDate}</span>
                {busyStats && <span className="badge member">⏳ تحديث الإحصائيات…</span>}
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
          </div>
        </div>
      </div>

      {/* الإحصائيات */}
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

      {/* برنامج العمولة */}
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

        {refErr && <div className="referral-err">{refErr}</div>}

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

              {canWithdraw && (
                <div style={{ marginTop: 10 }}>
                  <Link href="/payout/request" className="payout-btn">
                    💸 طلب سحب الأرباح
                  </Link>
                </div>
              )}
            </div>

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
            لم تقم بإنشاء رابط عمولة بعد. اضغط <b>"إنشاء رابط العمولة"</b> وسيتم حفظه لك بشكل دائم.
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
        {/* المعلومات الشخصية */}
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
                <p>{user.email}</p>
                <span className="email-note">(رقم المستخدم: {publicUserId || '...'})</span>
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

        {/* الإعدادات */}
        {activeTab === 'settings' && (
          <div className="settings-tab">
            <h3>إعدادات الحساب</h3>
            <div className="settings-grid">
              <div className="setting-group">
                <h4>🌐 اللغة والمنطقة</h4>
                <div className="setting-item">
                  <label>اللغة</label>
                  <select 
                    value={settings.language}
                    onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
                  >
                    <option value="ar">العربية</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>

              <div className="setting-group">
                <h4>🔔 الإشعارات</h4>
                <div className="setting-item toggle">
                  <label>إشعارات البريد الإلكتروني</label>
                  <div className="toggle-switch">
                    <input
                      type="checkbox"
                      id="emailNotifications"
                      checked={settings.emailNotifications}
                      onChange={(e) => setSettings(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                    />
                    <label htmlFor="emailNotifications" className="toggle-label"></label>
                  </div>
                </div>
                <div className="setting-item toggle">
                  <label>إشعارات التطبيق</label>
                  <div className="toggle-switch">
                    <input
                      type="checkbox"
                      id="appNotifications"
                      checked={settings.appNotifications}
                      onChange={(e) => setSettings(prev => ({ ...prev, appNotifications: e.target.checked }))}
                    />
                    <label htmlFor="appNotifications" className="toggle-label"></label>
                  </div>
                </div>
              </div>

              <div className="setting-group">
                <h4>👁️ الخصوصية</h4>
                <div className="setting-item toggle">
                  <label>إظهار رقم الهاتف في الإعلانات</label>
                  <div className="toggle-switch">
                    <input
                      type="checkbox"
                      id="showPhone"
                      checked={settings.showPhone}
                      onChange={(e) => setSettings(prev => ({ ...prev, showPhone: e.target.checked }))}
                    />
                    <label htmlFor="showPhone" className="toggle-label"></label>
                  </div>
                </div>
              </div>

              <div className="setting-group">
                <h4>🎨 المظهر</h4>
                <div className="setting-item">
                  <label>المظهر</label>
                  <select 
                    value={settings.theme}
                    onChange={(e) => setSettings(prev => ({ ...prev, theme: e.target.value }))}
                  >
                    <option value="light">فاتح</option>
                    <option value="dark">غامق</option>
                    <option value="auto">تلقائي</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="settings-actions">
              <button 
                onClick={handleSaveSettings} 
                className="save-settings-btn"
                disabled={savingSettings}
              >
                {savingSettings ? '⏳ جاري الحفظ...' : '💾 حفظ الإعدادات'}
              </button>
            </div>
          </div>
        )}

        {/* الأمان */}
        {activeTab === 'security' && (
          <div className="security-tab">
            <h3>أمان الحساب</h3>
            
            <div className="security-sections">
              {/* تغيير كلمة المرور */}
              <div className="security-section">
                <h4>🔐 تغيير كلمة المرور</h4>
                <div className="password-form">
                  <div className="form-group">
                    <label>كلمة المرور الحالية</label>
                    <input
                      type="password"
                      value={securityData.currentPassword}
                      onChange={(e) => setSecurityData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="أدخل كلمة المرور الحالية"
                    />
                  </div>
                  <div className="form-group">
                    <label>كلمة المرور الجديدة</label>
                    <input
                      type="password"
                      value={securityData.newPassword}
                      onChange={(e) => setSecurityData(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="أدخل كلمة المرور الجديدة"
                    />
                  </div>
                  <div className="form-group">
                    <label>تأكيد كلمة المرور الجديدة</label>
                    <input
                      type="password"
                      value={securityData.confirmPassword}
                      onChange={(e) => setSecurityData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="أعد إدخال كلمة المرور الجديدة"
                    />
                  </div>
                  <button 
                    onClick={handleChangePassword}
                    className="change-password-btn"
                    disabled={changingPassword || !securityData.currentPassword || !securityData.newPassword}
                  >
                    {changingPassword ? '⏳ جاري التغيير...' : '🔑 تغيير كلمة المرور'}
                  </button>
                </div>
              </div>

              {/* المصادقة الثنائية */}
              <div className="security-section">
                <h4>🔒 المصادقة الثنائية (2FA)</h4>
                <div className="two-factor-section">
                  <div className="two-factor-status">
                    <span className={`status-indicator ${twoFactorEnabled ? 'active' : 'inactive'}`}>
                      {twoFactorEnabled ? '✅ مفعل' : '❌ غير مفعل'}
                    </span>
                  </div>
                  <p className="two-factor-description">
                    تضيف المصادقة الثنائية طبقة أمان إضافية لحسابك. عند تفعيلها، ستحتاج إلى كود إضافي عند تسجيل الدخول.
                  </p>
                  <button className="setup-2fa-btn" disabled>
                    ⚙️ إعداد المصادقة الثنائية (قريباً)
                  </button>
                </div>
              </div>

              {/* الجلسات النشطة */}
              <div className="security-section">
                <h4>📱 الجلسات النشطة</h4>
                <div className="sessions-section">
                  <div className="current-session">
                    <div className="session-info">
                      <span className="session-icon">📱</span>
                      <div>
                        <div className="session-device">هذا الجهاز</div>
                        <div className="session-time">متصل منذ: {new Date(user.metadata.lastSignInTime).toLocaleString('ar-YE')}</div>
                      </div>
                    </div>
                    <span className="session-active">نشطة الآن</span>
                  </div>
                  
                  <div className="sessions-actions">
                    <button onClick={handleLogoutAllDevices} className="logout-all-btn">
                      🚪 تسجيل الخروج من جميع الأجهزة
                    </button>
                    <button onClick={handleLogout} className="logout-btn">
                      تسجيل الخروج
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* النشاطات */}
        {activeTab === 'activity' && (
          <div className="activity-tab">
            <h3>نشاطاتك الأخيرة</h3>
            
            <div className="activity-filters">
              <select className="filter-select">
                <option value="all">جميع النشاطات</option>
                <option value="listings">الإعلانات</option>
                <option value="profile">الملف الشخصي</option>
                <option value="security">الأمان</option>
              </select>
              <div className="activity-period">
                <span className="period-label">آخر 30 يوم</span>
              </div>
            </div>

            <div className="activities-list">
              {loadingActivities ? (
                <div className="loading-activities">⏳ جاري تحميل النشاطات...</div>
              ) : activities.length > 0 ? (
                <>
                  {activities.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                  
                  {hasMoreActivities && (
                    <div className="load-more-container">
                      <button onClick={loadMoreActivities} className="load-more-btn">
                        📄 تحميل المزيد
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="no-activities">
                  <div className="no-activities-icon">📝</div>
                  <p>لا توجد نشاطات مسجلة بعد</p>
                  <p className="no-activities-sub">ستظهر نشاطاتك هنا عندما تبدأ باستخدام التطبيق</p>
                </div>
              )}
            </div>

            <div className="activity-summary">
              <div className="summary-item">
                <span className="summary-label">مجموع النشاطات:</span>
                <span className="summary-value">{activities.length}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">آخر نشاط:</span>
                <span className="summary-value">
                  {activities.length > 0 
                    ? new Date(activities[0].createdAt?.toDate?.() || activities[0].createdAt).toLocaleDateString('ar-YE')
                    : 'لا يوجد'
                  }
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* الروابط السريعة */}
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
        .profile-page{max-width:1200px;margin:0 auto;padding:20px;position:relative;}
        
        /* الرسائل */
        .success-message{
          position:fixed;top:20px;right:20px;left:20px;max-width:400px;margin:0 auto;
          background:#10b981;color:#fff;padding:12px 16px;border-radius:12px;
          text-align:center;font-weight:800;z-index:1000;box-shadow:0 4px 12px rgba(16,185,129,.3);
        }
        .error-message{
          position:fixed;top:20px;right:20px;left:20px;max-width:400px;margin:0 auto;
          background:#ef4444;color:#fff;padding:12px 16px;border-radius:12px;
          text-align:center;font-weight:800;z-index:1000;box-shadow:0 4px 12px rgba(239,68,68,.3);
        }
        
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

        /* المعلومات الشخصية */
        .info-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px}
        .info-field{display:flex;flex-direction:column;gap:8px}
        .info-field label{font-weight:900;color:#475569;font-size:14px}
        .info-field p{padding:12px;background:#f8fafc;border-radius:10px;color:#1e293b;min-height:46px;display:flex;align-items:center}
        .info-field input,.info-field select,.info-field textarea{padding:12px;border:2px solid #e2e8f0;border-radius:10px;background:#f8fafc}
        .info-field.full-width{grid-column:1/-1}
        .email-note{font-size:12px;color:#94a3b8}

        /* الإعدادات */
        .settings-grid{display:grid;gap:30px;margin-bottom:30px;}
        .setting-group{border:1px solid #e2e8f0;border-radius:15px;padding:20px;}
        .setting-group h4{margin:0 0 15px;color:#1e293b;font-size:16px;display:flex;align-items:center;gap:8px;}
        .setting-item{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #f1f5f9;}
        .setting-item:last-child{border-bottom:none;}
        .setting-item label{font-weight:800;color:#475569;}
        .setting-item select{padding:8px 12px;border:2px solid #e2e8f0;border-radius:8px;background:#f8fafc;min-width:150px;}
        
        /* Toggle Switch */
        .toggle-switch{position:relative;}
        .toggle-switch input{display:none;}
        .toggle-label{
          display:block;width:50px;height:28px;background:#cbd5e1;border-radius:14px;
          position:relative;cursor:pointer;transition:background .3s;
        }
        .toggle-label:after{
          content:'';position:absolute;left:4px;top:4px;
          width:20px;height:20px;background:#fff;border-radius:50%;
          transition:transform .3s;
        }
        .toggle-switch input:checked + .toggle-label{background:#10b981;}
        .toggle-switch input:checked + .toggle-label:after{transform:translateX(22px);}
        
        .settings-actions{text-align:left;}
        .save-settings-btn{
          padding:12px 24px;background:linear-gradient(135deg,#4f46e5,#7c3aed);
          color:#fff;border:none;border-radius:12px;font-weight:900;cursor:pointer;
        }
        .save-settings-btn:disabled{opacity:.6;cursor:not-allowed;}

        /* الأمان */
        .security-sections{display:grid;gap:30px;}
        .security-section{border:1px solid #e2e8f0;border-radius:15px;padding:20px;}
        .security-section h4{margin:0 0 15px;color:#1e293b;font-size:16px;display:flex;align-items:center;gap:8px;}
        
        .password-form{display:grid;gap:15px;max-width:400px;}
        .form-group{display:flex;flex-direction:column;gap:8px;}
        .form-group label{font-weight:800;color:#475569;font-size:14px;}
        .form-group input{
          padding:12px;border:2px solid #e2e8f0;border-radius:10px;background:#f8fafc;
        }
        .change-password-btn{
          padding:12px 24px;background:linear-gradient(135deg,#ef4444,#dc2626);
          color:#fff;border:none;border-radius:12px;font-weight:900;cursor:pointer;margin-top:10px;
        }
        .change-password-btn:disabled{opacity:.6;cursor:not-allowed;}
        
        .two-factor-section{display:grid;gap:12px;}
        .two-factor-status{margin-bottom:10px;}
        .status-indicator{
          display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:20px;
          font-weight:900;font-size:14px;
        }
        .status-indicator.active{background:#d1fae5;color:#065f46;}
        .status-indicator.inactive{background:#fef3c7;color:#92400e;}
        .two-factor-description{color:#64748b;line-height:1.6;margin:0 0 15px;}
        .setup-2fa-btn{
          padding:12px 24px;background:#f8fafc;color:#4f46e5;border:2px solid #e2e8f0;
          border-radius:12px;font-weight:900;cursor:pointer;width:fit-content;
        }
        .setup-2fa-btn:disabled{opacity:.6;cursor:not-allowed;}
        
        .sessions-section{display:grid;gap:15px;}
        .current-session{
          display:flex;justify-content:space-between;align-items:center;
          padding:15px;background:#f8fafc;border-radius:12px;
        }
        .session-info{display:flex;align-items:center;gap:12px;}
        .session-icon{font-size:24px;}
        .session-device{font-weight:900;color:#1e293b;}
        .session-time{font-size:12px;color:#64748b;}
        .session-active{
          padding:6px 12px;background:#d1fae5;color:#065f46;
          border-radius:20px;font-size:12px;font-weight:900;
        }
        .sessions-actions{display:flex;gap:12px;}
        .logout-all-btn,.logout-btn{
          padding:10px 16px;border-radius:10px;font-weight:900;cursor:pointer;
        }
        .logout-all-btn{background:#fef3c7;color:#92400e;border:2px solid #fde68a;}
        .logout-btn{background:#f8fafc;color:#4f46e5;border:2px solid #e2e8f0;}

        /* النشاطات */
        .activity-filters{
          display:flex;justify-content:space-between;align-items:center;
          margin-bottom:20px;padding-bottom:15px;border-bottom:2px solid #f1f5f9;
        }
        .filter-select{
          padding:8px 16px;border:2px solid #e2e8f0;border-radius:8px;
          background:#f8fafc;font-weight:800;
        }
        .activity-period{display:flex;align-items:center;gap:8px;}
        .period-label{
          padding:6px 12px;background:#f1f5f9;border-radius:20px;
          font-size:12px;font-weight:900;color:#64748b;
        }
        
        .activities-list{min-height:200px;}
        .activity-item{
          display:flex;gap:15px;padding:15px;border-bottom:1px solid #f1f5f9;
          transition:background .2s;
        }
        .activity-item:hover{background:#f8fafc;}
        .activity-icon{
          width:40px;height:40px;background:#f1f5f9;border-radius:10px;
          display:flex;align-items:center;justify-content:center;font-size:18px;
        }
        .activity-content{flex:1;}
        .activity-text{font-weight:800;color:#1e293b;margin-bottom:4px;}
        .activity-time{font-size:12px;color:#64748b;}
        
        .loading-activities{
          text-align:center;padding:40px;color:#64748b;font-weight:800;
        }
        .no-activities{
          text-align:center;padding:40px;color:#64748b;
        }
        .no-activities-icon{font-size:48px;margin-bottom:15px;opacity:.5;}
        .no-activities-sub{font-size:14px;margin-top:8px;}
        
        .load-more-container{text-align:center;margin:20px 0;}
        .load-more-btn{
          padding:10px 24px;background:#f8fafc;color:#4f46e5;
          border:2px solid #e2e8f0;border-radius:10px;font-weight:900;cursor:pointer;
        }
        
        .activity-summary{
          display:flex;gap:30px;padding-top:20px;margin-top:20px;
          border-top:2px solid #f1f5f9;
        }
        .summary-item{display:flex;flex-direction:column;gap:4px;}
        .summary-label{font-size:12px;color:#64748b;font-weight:900;}
        .summary-value{font-size:18px;font-weight:950;color:#1e293b;}

        /* الروابط السريعة */
        .quick-links{background:#fff;border-radius:20px;padding:30px;box-shadow:0 4px 20px rgba(0,0,0,.08);}
        .quick-links h3{margin:0 0 20px;color:#1e293b;font-size:22px}
        .links-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px}
        .quick-link{display:flex;align-items:center;gap:14px;padding:18px;background:#f8fafc;border-radius:12px;text-decoration:none;color:#1e293b;font-weight:900;transition:all .2s;}
        .quick-link:hover{background:#4f46e5;color:#fff;transform:translateY(-2px);}

        @media (max-width:768px){
          .profile-page{padding:10px}
          .profile-main-info{flex-direction:column;text-align:center;gap:18px;padding:20px}
          .profile-actions{justify-content:center}
          .referral-link-row{grid-template-columns: 1fr;}
          .referral-head{align-items:stretch}
          .referral-create,.referral-copy{width:100%}
          .activity-filters{flex-direction:column;gap:10px;align-items:stretch;}
          .sessions-actions{flex-direction:column;}
          .activity-summary{flex-direction:column;gap:15px;}
          .tab-btn{padding:10px 14px;font-size:12px;}
        }
      `}</style>
    </div>
  );
}
