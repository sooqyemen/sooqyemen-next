'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { db, firebase } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';

const DEMO_PHONE = '770991885';

export default function SeedDemoPage() {
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const demoListings = useMemo(() => {
    const now = Date.now();

    return [
      {
        title: 'تجريبي: تويوتا كامري 2012 نظيفة جداً',
        description:
          '⚠️ إعلان تجريبي مرتبط بحساب المدير.\nمكينة ممتازة - قير ممتاز - مكيف شغال.\nملاحظة: هذا الإعلان للتجربة فقط.',
        city: 'صنعاء',
        category: 'cars',
        locationLabel: 'صنعاء - التحرير',
        coords: [15.3694, 44.1910],
        images: [
          'https://placehold.co/900x650?text=DEMO+CAMRY+1',
          'https://placehold.co/900x650?text=DEMO+CAMRY+2',
        ],
        originalCurrency: 'YER',
        originalPrice: 3800000,
        priceYER: 3800000,
        auctionEnabled: false,
      },
      {
        title: 'تجريبي: تويوتا هايلوكس 2015 دبل (نظيف)',
        description:
          '⚠️ إعلان تجريبي مرتبط بحساب المدير.\nدبل - مناسب للخطوط.\nملاحظة: هذا الإعلان للتجربة فقط.',
        city: 'عدن',
        category: 'cars',
        locationLabel: 'عدن - المنصورة',
        coords: [12.8037, 45.0350],
        images: [
          'https://placehold.co/900x650?text=DEMO+HILUX+1',
          'https://placehold.co/900x650?text=DEMO+HILUX+2',
        ],
        originalCurrency: 'YER',
        originalPrice: 9200000,
        priceYER: 9200000,
        auctionEnabled: true,
        auctionMinutes: 90,
      },
      {
        title: 'تجريبي: تويوتا كورولا 2008 اقتصادي',
        description:
          '⚠️ إعلان تجريبي مرتبط بحساب المدير.\nاقتصادي - مناسب للاستخدام اليومي.\nملاحظة: هذا الإعلان للتجربة فقط.',
        city: 'تعز',
        category: 'cars',
        locationLabel: 'تعز - التحرير',
        coords: [13.5795, 44.0209],
        images: [
          'https://placehold.co/900x650?text=DEMO+COROLLA+1',
          'https://placehold.co/900x650?text=DEMO+COROLLA+2',
        ],
        originalCurrency: 'YER',
        originalPrice: 2600000,
        priceYER: 2600000,
        auctionEnabled: false,
      },
      {
        title: 'تجريبي: هيونداي سنتافي 2016 فل كامل',
        description:
          '⚠️ إعلان تجريبي مرتبط بحساب المدير.\nفل كامل - نظيفة.\nملاحظة: هذا الإعلان للتجربة فقط.',
        city: 'إب',
        category: 'cars',
        locationLabel: 'إب - شارع العدين',
        coords: [13.9667, 44.1833],
        images: [
          'https://placehold.co/900x650?text=DEMO+SANTAFE+1',
          'https://placehold.co/900x650?text=DEMO+SANTAFE+2',
        ],
        originalCurrency: 'YER',
        originalPrice: 11500000,
        priceYER: 11500000,
        auctionEnabled: false,
      },
    ].map((x) => {
      const auctionEnabled = !!x.auctionEnabled;
      const minutes = Number(x.auctionMinutes || 60);

      return {
        title: x.title,
        description: x.description,
        city: x.city,
        category: x.category,

        phone: DEMO_PHONE,
        isWhatsapp: true,

        // عملات
        priceYER: Number(x.priceYER || 0),
        originalPrice: Number(x.originalPrice || 0),
        originalCurrency: x.originalCurrency || 'YER',
        currencyBase: 'YER',

        coords: Array.isArray(x.coords) ? x.coords : null,
        locationLabel: x.locationLabel || null,

        images: Array.isArray(x.images) ? x.images : [],

        // ربط بالمدير الحالي (عضوية المدير)
        userId: user?.uid || null,
        userEmail: user?.email || null,
        userName: user?.displayName || 'Admin',

        views: 0,
        likes: 0,
        isActive: true,
        hidden: false,

        // مزاد
        auctionEnabled,
        auctionEndAt: auctionEnabled
          ? firebase.firestore.Timestamp.fromMillis(now + Math.max(1, minutes) * 60 * 1000)
          : null,
        currentBidYER: auctionEnabled ? Number(x.priceYER || 0) : null,

        // تمييز تجريبي
        isDemo: true,

        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
    });
  }, [user]);

  const createDemo = async () => {
    setMsg('');
    if (!user) {
      setMsg('لازم تسجل دخول بحساب المدير أولاً.');
      return;
    }

    setBusy(true);
    try {
      const col = db.collection('listings');
      for (const item of demoListings) {
        await col.add(item);
      }
      setMsg('✅ تم إنشاء 4 إعلانات تجريبية بنجاح. افتح قسم السيارات وتأكد.');
    } catch (e) {
      console.error(e);
      setMsg(`❌ فشل إنشاء الإعلانات: ${e?.message || 'Unknown error'}`);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: 16 }}>
        جاري التحميل...
      </div>
    );
  }

  return (
    <div dir="rtl" className="container" style={{ padding: 16 }}>
      <div className="card" style={{ padding: 16 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>إعلانات تجريبية (سيارات)</h1>
        <p className="muted" style={{ marginTop: 8, lineHeight: 1.7 }}>
          هذه الصفحة تنشئ 4 إعلانات سيارات تجريبية في <b>listings</b> مرتبطة بحساب المدير الحالي.
        </p>

        <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btnPrimary" onClick={createDemo} disabled={busy || !user}>
            {busy ? 'جاري الإنشاء...' : 'إنشاء 4 إعلانات تجريبية'}
          </button>

          <Link className="btn" href="/cars">
            فتح قسم السيارات
          </Link>

          <Link className="btn" href="/">
            العودة للرئيسية
          </Link>
        </div>

        {msg ? (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 10, border: '1px solid rgba(0,0,0,.08)' }}>
            {msg}
          </div>
        ) : null}
      </div>

      <style jsx>{`
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(0, 0, 0, 0.12);
          background: #fff;
          text-decoration: none;
          color: #0f172a;
          font-weight: 800;
        }
      `}</style>
    </div>
  );
}
