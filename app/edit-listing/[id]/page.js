// app/edit-listing/[id]/page.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import { db, firebase, storage } from '@/lib/firebaseClient';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useAuth } from '@/lib/useAuth';

const MAX_IMAGES = 10;

// نفس إعدادات الأدمن
const RAW_ENV_ADMIN = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
const STATIC_ADMINS = ['mansouralbarout@gmail.com', 'aboramez965@gmail.com'];
const ADMIN_EMAILS = [RAW_ENV_ADMIN, ...STATIC_ADMINS]
  .filter(Boolean)
  .map((e) => String(e).toLowerCase());

// --- ✅ تصغير/ضغط الصورة قبل الرفع (نفس المستخدمة في add) ---
async function compressImageFile(file, opts = {}) {
  const { maxSide = 1600, quality = 0.78, outputType = 'image/jpeg' } = opts;

  try {
    if (!file?.type?.startsWith('image/')) return file;

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = 'async';
    img.src = url;

    await new Promise((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('IMAGE_LOAD_FAILED'));
    });

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;

    if (!w || !h) {
      URL.revokeObjectURL(url);
      return file;
    }

    const scale = Math.min(1, maxSide / Math.max(w, h));
    const nw = Math.max(1, Math.round(w * scale));
    const nh = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement('canvas');
    canvas.width = nw;
    canvas.height = nh;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(url);
      return file;
    }

    ctx.drawImage(img, 0, 0, nw, nh);
    URL.revokeObjectURL(url);

    const blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), outputType, quality)
    );

    if (!blob) return file;

    const safeBase = String(file.name || 'image')
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_');

    return new File([blob], `${safeBase}.jpg`, { type: outputType });
  } catch {
    return file;
  }
}

// تحويل URL من storage إلى ref (لو كان Firebase URL)
function tryGetStorageRefFromUrl(url) {
  try {
    // في compat: storage.refFromURL
    if (storage?.refFromURL) return storage.refFromURL(url);
    return null;
  } catch {
    return null;
  }
}

export default function EditListingPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  // الصور الحالية (URLs)
  const [existingUrls, setExistingUrls] = useState([]); // string[]
  const [removedUrls, setRemovedUrls] = useState([]); // string[] للحذف من Storage بعد الحفظ

  // صور جديدة للإضافة
  const [newFiles, setNewFiles] = useState([]); // File[]
  const [newPreviews, setNewPreviews] = useState([]); // objectURL[]

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
        if (!doc.exists) {
          alert('الإعلان غير موجود');
          router.push('/my-listings');
          return;
        }

        const d = { id, ...doc.data() };
        setData(d);

        // coords
        if (Array.isArray(d.coords) && d.coords.length === 2) {
          setLat(String(d.coords[0]));
          setLng(String(d.coords[1]));
        } else if (d.coords?.lat && d.coords?.lng) {
          setLat(String(d.coords.lat));
          setLng(String(d.coords.lng));
        }

        // images
        const urls = Array.isArray(d.images) ? d.images.filter(Boolean) : [];
        setExistingUrls(urls);

        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, [id, router]);

  // تنظيف معاينات الصور الجديدة
  useEffect(() => {
    return () => {
      newPreviews.forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch {}
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canEdit = useMemo(() => {
    if (!user) return false;
    return isAdmin || isOwner;
  }, [isAdmin, isOwner, user]);

  const totalCount = existingUrls.length + newFiles.length;

  const onAddNewImages = (fileList) => {
    const list = Array.from(fileList || []);
    if (!list.length) return;

    const nextFiles = [...newFiles, ...list];
    const nextTotal = existingUrls.length + nextFiles.length;

    if (nextTotal > MAX_IMAGES) {
      alert(`الحد الأقصى للصور هو ${MAX_IMAGES}`);
      return;
    }

    // revoke old previews
    newPreviews.forEach((u) => {
      try {
        URL.revokeObjectURL(u);
      } catch {}
    });

    setNewFiles(nextFiles);
    setNewPreviews(nextFiles.map((f) => URL.createObjectURL(f)));
  };

  const removeExistingUrl = (url) => {
    setExistingUrls((prev) => prev.filter((u) => u !== url));
    setRemovedUrls((prev) => (prev.includes(url) ? prev : [...prev, url]));
  };

  const removeNewFileAt = (idx) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));
    setNewPreviews((prev) => {
      try {
        URL.revokeObjectURL(prev[idx]);
      } catch {}
      return prev.filter((_, i) => i !== idx);
    });
  };

  const uploadNewImages = async () => {
    if (!newFiles.length) return [];

    const uploaded = [];

    for (const originalFile of newFiles) {
      const file = await compressImageFile(originalFile, {
        maxSide: 1600,
        quality: 0.78,
      });

      const safeName = String(file.name || 'img').replace(
        /[^a-zA-Z0-9._-]/g,
        '_'
      );

      const path = `listings/${data.userId || user.uid}/${Date.now()}_${safeName}`;
      const ref = storage.ref().child(path);

      await ref.put(file);
      const url = await ref.getDownloadURL();
      uploaded.push(url);
    }

    return uploaded;
  };

  const deleteRemovedFromStorage = async () => {
    // محاولة حذفها من Storage (لو ما عندك صلاحية ما نخرب الحفظ)
    for (const url of removedUrls) {
      try {
        const ref = tryGetStorageRefFromUrl(url);
        if (ref) await ref.delete();
      } catch (e) {
        console.warn('Storage delete failed:', e?.code || e?.message || e);
      }
    }
  };

  const save = async () => {
    if (!data) return;
    if (!canEdit) {
      alert('ليست لديك صلاحية تعديل هذا الإعلان');
      return;
    }

    // تحقق عدد الصور
    const nextTotal = existingUrls.length + newFiles.length;
    if (nextTotal > MAX_IMAGES) {
      alert(`الحد الأقصى للصور هو ${MAX_IMAGES}`);
      return;
    }

    setSaving(true);

    try {
      let coords = data.coords || null;
      const numLat = parseFloat(lat);
      const numLng = parseFloat(lng);
      if (!isNaN(numLat) && !isNaN(numLng)) {
        coords = [numLat, numLng];
      }

      // رفع الصور الجديدة ودمجها مع الموجودة
      const newUrls = await uploadNewImages();
      const finalImages = [...existingUrls, ...newUrls].slice(0, MAX_IMAGES);

      await db.collection('listings').doc(id).update({
        title: data.title || '',
        description: data.description || '',
        priceYER: Number(data.priceYER || 0),
        city: data.city || '',
        locationLabel: data.locationLabel || '',
        coords: coords || null,
        images: finalImages,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      // بعد نجاح الحفظ: نحذف الصور المحذوفة من Storage
      await deleteRemovedFromStorage();

      // نظف الحالة
      setRemovedUrls([]);
      newPreviews.forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch {}
      });
      setNewFiles([]);
      setNewPreviews([]);

      alert('تم حفظ التعديلات بنجاح');
      if (isAdmin) router.push('/admin');
      else router.push('/my-listings');
    } catch (e) {
      console.error(e);
      alert('فشل حفظ التعديلات');
    } finally {
      setSaving(false);
    }
  };

  const deleteListing = async () => {
    if (!data) return;
    if (!canEdit) {
      alert('ليست لديك صلاحية حذف هذا الإعلان');
      return;
    }

    const ok = confirm('أكيد تريد حذف الإعلان نهائيًا؟ سيتم حذف الصور المرتبطة به.');
    if (!ok) return;

    setSaving(true);
    try {
      // حاول حذف صور Storage أولاً
      const allUrls = Array.isArray(data.images) ? data.images : existingUrls;
      for (const url of allUrls) {
        try {
          const ref = tryGetStorageRefFromUrl(url);
          if (ref) await ref.delete();
        } catch (e) {
          console.warn('Storage delete failed:', e?.code || e?.message || e);
        }
      }

      // حذف وثيقة الإعلان (ملاحظة: subcollections مثل comments/bids لا تُحذف تلقائيًا)
      await db.collection('listings').doc(id).delete();

      alert('تم حذف الإعلان');
      if (isAdmin) router.push('/admin');
      else router.push('/my-listings');
    } catch (e) {
      console.error(e);
      alert('فشل حذف الإعلان');
    } finally {
      setSaving(false);
    }
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
      <div className="container" style={{ marginTop: 20, maxWidth: 820 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>تعديل الإعلان</h2>
          <div className="row" style={{ gap: 8 }}>
            <button
              className="btn"
              onClick={() => (isAdmin ? router.push('/admin') : router.push('/my-listings'))}
            >
              ← رجوع
            </button>
            <button className="btn" style={{ background: '#fee2e2', borderColor: '#fecaca', color: '#991b1b' }}
              onClick={deleteListing}
              disabled={saving}
            >
              {saving ? '...' : 'حذف الإعلان'}
            </button>
          </div>
        </div>

        {/* ✅ الصور */}
        <div className="card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>🖼️ صور الإعلان ({totalCount}/{MAX_IMAGES})</div>

          <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
            تقدر تحذف صور قديمة أو تضيف صور جديدة. الصور الجديدة يتم تصغيرها قبل الرفع.
          </div>

          {/* صور موجودة */}
          {existingUrls.length ? (
            <div style={{ marginBottom: 12 }}>
              <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>الصور الحالية</div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                  gap: 10,
                }}
              >
                {existingUrls.map((url) => (
                  <div
                    key={url}
                    style={{
                      position: 'relative',
                      borderRadius: 12,
                      overflow: 'hidden',
                      border: '1px solid #e5e7eb',
                      background: '#fff',
                    }}
                  >
                    <img src={url} alt="img" style={{ width: '100%', height: 90, objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => removeExistingUrl(url)}
                      style={{
                        position: 'absolute',
                        top: 6,
                        left: 6,
                        border: 'none',
                        background: 'rgba(0,0,0,0.55)',
                        color: '#fff',
                        borderRadius: 999,
                        width: 28,
                        height: 28,
                        cursor: 'pointer',
                        fontWeight: 800,
                        lineHeight: '28px',
                      }}
                      title="حذف"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
              لا توجد صور حالياً.
            </div>
          )}

          {/* صور جديدة */}
          <label className="muted" style={{ fontSize: 13 }}>إضافة صور جديدة</label>
          <input
            className="input"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => onAddNewImages(e.target.files)}
          />

          {newPreviews.length ? (
            <div style={{ marginTop: 12 }}>
              <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>صور جديدة (قبل الحفظ)</div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                  gap: 10,
                }}
              >
                {newPreviews.map((src, idx) => (
                  <div
                    key={src}
                    style={{
                      position: 'relative',
                      borderRadius: 12,
                      overflow: 'hidden',
                      border: '1px solid #e5e7eb',
                      background: '#fff',
                    }}
                  >
                    <img src={src} alt={`new-${idx}`} style={{ width: '100%', height: 90, objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => removeNewFileAt(idx)}
                      style={{
                        position: 'absolute',
                        top: 6,
                        left: 6,
                        border: 'none',
                        background: 'rgba(0,0,0,0.55)',
                        color: '#fff',
                        borderRadius: 999,
                        width: 28,
                        height: 28,
                        cursor: 'pointer',
                        fontWeight: 800,
                        lineHeight: '28px',
                      }}
                      title="حذف"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* ✅ باقي بيانات الإعلان */}
        <div className="card" style={{ marginTop: 12 }}>
          <label className="muted" style={{ fontSize: 13, marginTop: 2 }}>العنوان</label>
          <input
            className="input"
            style={{ marginBottom: 10 }}
            value={data.title || ''}
            onChange={(e) => setData({ ...data, title: e.target.value })}
            placeholder="عنوان الإعلان"
          />

          <label className="muted" style={{ fontSize: 13 }}>الوصف</label>
          <textarea
            className="input"
            style={{ height: 160, marginBottom: 10 }}
            value={data.description || ''}
            onChange={(e) => setData({ ...data, description: e.target.value })}
            placeholder="وصف الإعلان"
          />

          <label className="muted" style={{ fontSize: 13 }}>السعر (بالريال اليمني)</label>
          <input
            className="input"
            style={{ marginBottom: 10 }}
            type="number"
            value={data.priceYER || ''}
            onChange={(e) => setData({ ...data, priceYER: e.target.value })}
            placeholder="مثال: 1500000"
          />

          <label className="muted" style={{ fontSize: 13 }}>المدينة</label>
          <input
            className="input"
            style={{ marginBottom: 10 }}
            value={data.city || ''}
            onChange={(e) => setData({ ...data, city: e.target.value })}
            placeholder="مثال: صنعاء، عدن..."
          />

          <label className="muted" style={{ fontSize: 13 }}>وصف الموقع (مثال: بجوار المستشفى، الحي...)</label>
          <input
            className="input"
            style={{ marginBottom: 10 }}
            value={data.locationLabel || ''}
            onChange={(e) => setData({ ...data, locationLabel: e.target.value })}
            placeholder="وصف مختصر لمكان الإعلان"
          />

          <div className="row" style={{ gap: 8, alignItems: 'center', marginTop: 8 }}>
            <div style={{ flex: 1 }}>
              <label className="muted" style={{ fontSize: 13 }}>خط العرض (Latitude)</label>
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
              <label className="muted" style={{ fontSize: 13 }}>خط الطول (Longitude)</label>
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
              onClick={() => (isAdmin ? router.push('/admin') : router.push('/my-listings'))}
            >
              إلغاء
            </button>

            <button className="btn btnPrimary" onClick={save} disabled={saving}>
              {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
