 // app/edit-listing/[id]/page.js
'use client';

import { useEffect, useState, useMemo } from 'react';
import { db, firebase } from '@/lib/firebaseClient';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useAuth } from '@/lib/useAuth';

// نفس إعدادات الأدمن
const RAW_ENV_ADMIN = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
const STATIC_ADMINS = [
  'mansouralbarout@gmail.com',
  'aboramez965@gmail.com', // احذف السطر لو ما تريده أدمن
];
const ADMIN_EMAILS = [RAW_ENV_ADMIN, ...STATIC_ADMINS]
  .filter(Boolean)
  .map((e) => String(e).toLowerCase());

export default function EditListingPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  const userEmail = user?.email ? String(user.email).toLowerCase() : null;
  const isAdmin = !!userEmail && ADMIN_EMAILS.includes(userEmail);
  const isOwner = !!user?.uid && !!data?.userId && user.uid === data.userId;

  // جلب بيانات الإعلان
  useEffect(() => {
    if (!id) return;
    db.collection('listings')
      .doc(id)
      .get()
      .then((doc) => {
        if (doc.exists) {
          const d = { id, ...doc.data() };
          setData(d);

          if (Array.isArray(d.coords) && d.coords.length === 2) {
            setLat(String(d.coords[0]));
            setLng(String(d.coords[1]));
          } else if (d.coords?.lat && d.coords?.lng) {
            setLat(String(d.coords.lat));
            setLng(String(d.coords.lng));
          }
        } else {
          alert('الإعلان غير موجود');
          router.push('/my-listings');
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, router]);

  const canEdit = useMemo(() => {
    if (!user) return false;
    return isAdmin || isOwner;
  }, [isAdmin, isOwner, user]);

  const save = async () => {
    if (!data) return;
    if (!canEdit) {
      alert('ليست لديك صلاحية تعديل هذا الإعلان');
      return;
    }

    setSaving(true);

    let coords = data.coords || null;
    const numLat = parseFloat(lat);
    const numLng = parseFloat(lng);
    if (!isNaN(numLat) && !isNaN(numLng)) {
      coords = [numLat, numLng];
    }

    await db.collection('listings').doc(id).update({
      title: data.title || '',
      description: data.description || '',
      priceYER: Number(data.priceYER || 0),
      city: data.city || '',
      locationLabel: data.locationLabel || '',
      coords: coords || null,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    setSaving(false);
    alert('تم حفظ التعديلات بنجاح');
    if (isAdmin) router.push('/admin');
    else router.push('/my-listings');
  };

  if (loading || authLoading) {
    return (
      <>
        <Header />
        <div className="container" style={{ marginTop: 20 }}>
          <div className="card muted">جاري تحميل بيانات الإعلان...</div>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Header />
        <div className="container" style={{ marginTop: 20 }}>
          <div className="card">يجب تسجيل الدخول لتعديل الإعلان.</div>
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <Header />
        <div className="container" style={{ marginTop: 20 }}>
          <div className="card">الإعلان غير موجود</div>
        </div>
      </>
    );
  }

  if (!canEdit) {
    return (
      <>
        <Header />
        <div className="container" style={{ marginTop: 20 }}>
          <div className="card">ليست لديك صلاحية تعديل هذا الإعلان.</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container" style={{ marginTop: 20, maxWidth: 720 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>تعديل الإعلان</h2>
          <button
            className="btn"
            onClick={() =>
              isAdmin ? router.push('/admin') : router.push('/my-listings')
            }
          >
            ← رجوع
          </button>
        </div>

        <label className="muted" style={{ fontSize: 13, marginTop: 16 }}>
          العنوان
        </label>
        <input
          className="input"
          style={{ marginBottom: 10 }}
          value={data.title || ''}
          onChange={(e) => setData({ ...data, title: e.target.value })}
          placeholder="عنوان الإعلان"
        />

        <label className="muted" style={{ fontSize: 13 }}>
          الوصف
        </label>
        <textarea
          className="input"
          style={{ height: 160, marginBottom: 10 }}
          value={data.description || ''}
          onChange={(e) =>
            setData({ ...data, description: e.target.value })
          }
          placeholder="وصف الإعلان"
        />

        <label className="muted" style={{ fontSize: 13 }}>
          السعر (بالريال اليمني)
        </label>
        <input
          className="input"
          style={{ marginBottom: 10 }}
          type="number"
          value={data.priceYER || ''}
          onChange={(e) =>
            setData({ ...data, priceYER: e.target.value })
          }
          placeholder="مثال: 1500000"
        />

        <label className="muted" style={{ fontSize: 13 }}>
          المدينة
        </label>
        <input
          className="input"
          style={{ marginBottom: 10 }}
          value={data.city || ''}
          onChange={(e) => setData({ ...data, city: e.target.value })}
          placeholder="مثال: صنعاء، عدن..."
        />

        <label className="muted" style={{ fontSize: 13 }}>
          وصف الموقع (مثال: بجوار المستشفى، الحي...)
        </label>
        <input
          className="input"
          style={{ marginBottom: 10 }}
          value={data.locationLabel || ''}
          onChange={(e) =>
            setData({ ...data, locationLabel: e.target.value })
          }
          placeholder="وصف مختصر لمكان الإعلان"
        />

        <div
          className="row"
          style={{ gap: 8, alignItems: 'center', marginTop: 8 }}
        >
          <div style={{ flex: 1 }}>
            <label className="muted" style={{ fontSize: 13 }}>
              خط العرض (Latitude)
            </label>
            <input
              className="input"
              type="number"
              step="0.000001"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="مثال: 15.3694"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="muted" style={{ fontSize: 13 }}>
              خط الطول (Longitude)
            </label>
            <input
              className="input"
              type="number"
              step="0.000001"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="مثال: 44.1910"
            />
          </div>
        </div>

        <div className="row" style={{ gap: 8, marginTop: 16 }}>
          <button
            className="btn"
            onClick={() =>
              isAdmin ? router.push('/admin') : router.push('/my-listings')
            }
          >
            إلغاء
          </button>
          <button
            className="btn btnPrimary"
            onClick={save}
            disabled={saving}
          >
            {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </button>
        </div>
      </div>
    </>
  );
}
