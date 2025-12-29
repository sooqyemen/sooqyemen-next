'use client';

import { useEffect, useState } from 'react';
import { db, firebase } from '@/lib/firebaseClient';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';

export default function EditListingPage() {
  const { id } = useParams();
  const router = useRouter();

  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    db.collection('listings')
      .doc(id)
      .get()
      .then((doc) => {
        if (doc.exists) {
          setData({ id, ...doc.data() });
        } else {
          alert('الإعلان غير موجود');
          router.push('/admin');
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, router]);

  const save = async () => {
    if (!data) return;
    setSaving(true);
    await db.collection('listings').doc(id).update({
      title: data.title || '',
      description: data.description || '',
      priceYER: data.priceYER || 0,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    setSaving(false);
    alert('تم حفظ التعديلات بنجاح');
    router.push('/admin');
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="container" style={{ marginTop: 20 }}>
          <div className="card muted">جاري تحميل بيانات الإعلان...</div>
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

  return (
    <>
      <Header />
      <div className="container" style={{ marginTop: 20, maxWidth: 700 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>تعديل الإعلان</h2>
          <button className="btn" onClick={() => router.push('/admin')}>
            ← رجوع للوحة التحكم
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
          onChange={(e) => setData({ ...data, description: e.target.value })}
          placeholder="وصف الإعلان"
        />

        <label className="muted" style={{ fontSize: 13 }}>
          السعر (بالريال اليمني)
        </label>
        <input
          className="input"
          style={{ marginBottom: 16 }}
          type="number"
          value={data.priceYER || ''}
          onChange={(e) =>
            setData({ ...data, priceYER: Number(e.target.value || 0) })
          }
          placeholder="مثال: 1500000"
        />

        <div className="row" style={{ gap: 8 }}>
          <button className="btn" onClick={() => router.push('/admin')}>
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
