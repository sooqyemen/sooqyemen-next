'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { db, firebase, storage } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';
import { toYER, useRates } from '@/lib/rates';
import Link from 'next/link';

const LocationPicker = dynamic(() => import('@/components/Map/LocationPicker'), { ssr: false });

// ✅ الأقسام الافتراضية (مطابقة تمامًا لمفاتيح Firestore عندك)
const DEFAULT_CATEGORIES = [
  { slug: 'cars', name: 'سيارات' },
  { slug: 'realestate', name: 'عقارات' },
  { slug: 'phones', name: 'جوالات' },
  { slug: 'electronics', name: 'إلكترونيات' },
  { slug: 'motorcycles', name: 'دراجات نارية' },
  { slug: 'heavy_equipment', name: 'معدات ثقيلة' },
  { slug: 'solar', name: 'طاقة شمسية' },
  { slug: 'networks', name: 'نت وشبكات' },
  { slug: 'maintenance', name: 'صيانة' },
  { slug: 'furniture', name: 'أثاث' },
  { slug: 'home_tools', name: 'أدوات منزلية' },
  { slug: 'clothes', name: 'ملابس' },
  { slug: 'animals', name: 'حيوانات وطيور' },
  { slug: 'jobs', name: 'وظائف' },
  { slug: 'services', name: 'خدمات' },
  { slug: 'other', name: 'أخرى / غير مصنف' },
];

export default function AddPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const rates = useRates();

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [phone, setPhone] = useState('');
  const [isWhatsapp, setIsWhatsapp] = useState(true);

  const [currency, setCurrency] = useState('YER');
  const [price, setPrice] = useState('');

  const [coords, setCoords] = useState(null); // [lat, lng]
  const [locationLabel, setLocationLabel] = useState('');
  const [showMap, setShowMap] = useState(false);

  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  const [auctionEnabled, setAuctionEnabled] = useState(false);
  const [auctionMinutes, setAuctionMinutes] = useState('60');

  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const [cats, setCats] = useState(DEFAULT_CATEGORIES);
  const [catsLoading, setCatsLoading] = useState(true);
  const [catsSource, setCatsSource] = useState('loading'); // loading | firestore | fallback

  // ✅ السيناريو الأفضل: إذا ما فيه user → حوّل تلقائياً لصفحة الدخول مع next=/add
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent('/add')}`);
    }
  }, [loading, user, router]);

  // ✅ تحميل الأقسام من Firestore
  useEffect(() => {
    const unsub = db.collection('categories').onSnapshot(
      (snap) => {
        const arr = snap.docs
          .map((d) => {
            const data = d.data() || {};
            return {
              slug: d.id,
              name: String(data.name || '').trim(),
              active: data.active,
            };
          })
          .filter((c) => c.slug && c.name && c.active !== false);

        arr.sort((a, b) => a.name.localeCompare(b.name, 'ar'));

        if (arr.length) {
          setCats(arr);
          setCatsSource('firestore');

          if (category && !arr.some((x) => x.slug === category)) setCategory('');
        } else {
          setCats(DEFAULT_CATEGORIES);
          setCatsSource('fallback');

          if (category && !DEFAULT_CATEGORIES.some((x) => x.slug === category)) setCategory('');
        }

        setCatsLoading(false);
      },
      (err) => {
        console.error('Failed to load categories:', err);
        setCats(DEFAULT_CATEGORIES);
        setCatsLoading(false);
        setCatsSource('fallback');

        if (category && !DEFAULT_CATEGORIES.some((x) => x.slug === category)) setCategory('');
      }
    );

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ معاينة الصور
  useEffect(() => {
    if (images.length === 0) {
      setImagePreviews([]);
      return;
    }

    const previews = [];
    images.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        previews.push(reader.result);
        if (previews.length === images.length) {
          setImagePreviews([...previews]);
        }
      };
      reader.readAsDataURL(file);
    });
  }, [images]);

  // ✅ Helpers for rates (fallback إذا rates ما وصل)
  const getYerPerUSD = () => {
    const r = rates || {};
    return Number(r.USD || r.usd || r.usdRate || r.usdToYer || r.usd_yer || 1632);
  };

  const getYerPerSAR = () => {
    const r = rates || {};
    return Number(r.SAR || r.sar || r.sarRate || r.sarToYer || r.sar_yer || 425);
  };

  // ✅ التحقق من الأخطاء
  const validateForm = () => {
    const newErrors = {};

    if (!title.trim()) newErrors.title = 'الرجاء إدخال عنوان للإعلان';
    else if (title.trim().length < 5) newErrors.title = 'العنوان يجب أن يكون 5 أحرف على الأقل';

    if (!desc.trim()) newErrors.desc = 'الرجاء إدخال وصف للإعلان';
    else if (desc.trim().length < 10) newErrors.desc = 'الوصف يجب أن يكون 10 أحرف على الأقل';

    if (!city.trim()) newErrors.city = 'الرجاء إدخال المدينة';

    if (!category) newErrors.category = 'الرجاء اختيار القسم';

    if (!price || isNaN(price) || Number(price) <= 0) newErrors.price = 'الرجاء إدخال سعر صحيح';

    if (phone && !/^[0-9]{9,15}$/.test(phone.replace(/\D/g, ''))) {
      newErrors.phone = 'رقم الهاتف غير صحيح';
    }

    if (auctionEnabled && (!auctionMinutes || Number(auctionMinutes) < 1)) {
      newErrors.auctionMinutes = 'مدة المزاد يجب أن تكون دقيقة واحدة على الأقل';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onPick = (c, lbl) => {
    setCoords(c);
    setLocationLabel(lbl || '');
    if (errors.location) setErrors((prev) => ({ ...prev, location: undefined }));
  };

  const uploadImages = async () => {
    if (!images.length) return [];
    const out = [];

    for (const file of images) {
      const safeName = String(file.name || 'img').replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `listings/${user.uid}/${Date.now()}_${safeName}`;
      const ref = storage.ref().child(path);
      await ref.put(file);
      const url = await ref.getDownloadURL();
      out.push(url);
    }

    return out;
  };

  const handleRemoveImage = (index) => {
    const newImages = [...images];
    const newPreviews = [...imagePreviews];
    newImages.splice(index, 1);
    newPreviews.splice(index, 1);
    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  const submit = async () => {
    setSubmitAttempted(true);

    // ✅ احتياط: لو حصل ضغط قبل اكتمال redirect
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent('/add')}`);
      return;
    }

    if (!validateForm()) {
      alert('يرجى تصحيح الأخطاء قبل المتابعة');
      return;
    }

    setBusy(true);
    try {
      const priceYER = toYER(price, currency, rates);
      const imageUrls = await uploadImages();

      const endAt = auctionEnabled
        ? firebase.firestore.Timestamp.fromMillis(
            Date.now() + Math.max(1, Number(auctionMinutes || 60)) * 60 * 1000
          )
        : null;

      const lat = Array.isArray(coords) ? Number(coords[0]) : null;
      const lng = Array.isArray(coords) ? Number(coords[1]) : null;

      await db.collection('listings').add({
        title: title.trim(),
        description: desc.trim(),
        city: city.trim(),

        category: String(category || '').trim(),

        phone: phone.trim() || null,
        isWhatsapp: !!isWhatsapp,

        priceYER: Number(priceYER),
        originalPrice: Number(price),
        originalCurrency: currency,
        currencyBase: 'YER',

        coords: lat != null && lng != null ? [lat, lng] : null,
        lat: lat != null ? lat : null,
        lng: lng != null ? lng : null,

        locationLabel: locationLabel || null,

        images: imageUrls,

        userId: user.uid,
        userEmail: user.email || null,
        userName: user.displayName || null,

        views: 0,
        likes: 0,
        isActive: true,

        auctionEnabled: !!auctionEnabled,
        auctionEndAt: endAt,
        currentBidYER: auctionEnabled ? Number(priceYER) : null,

        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      alert('🎉 تم نشر الإعلان بنجاح!');
      window.location.href = '/';
    } catch (e) {
      console.error(e);
      alert('❌ حدث خطأ أثناء النشر. يرجى المحاولة مرة أخرى.');
    } finally {
      setBusy(false);
    }
  };

  // ✅ السعر المحول
  const convertedPrice = useMemo(() => {
    if (!price || isNaN(price)) return null;

    const yer = Number(toYER(price, currency, rates));
    if (!isFinite(yer) || yer <= 0) return null;

    const yerPerSAR = getYerPerSAR();
    const yerPerUSD = getYerPerUSD();

    const sar = yerPerSAR > 0 ? yer / yerPerSAR : null;
    const usd = yerPerUSD > 0 ? yer / yerPerUSD : null;

    return {
      YER: Math.round(yer).toLocaleString('ar-YE'),
      SAR: sar ? sar.toFixed(2) : null,
      USD: usd ? usd.toFixed(2) : null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price, currency, rates]);

  // ✅ أثناء التحميل أو أثناء التحويل لصفحة الدخول
  if (loading || (!loading && !user)) {
    return (
      <div className="add-page-layout">
        <div className="loading-container">
          <div className="loading-spinner-large" />
          <p>{loading ? 'جاري تحميل الصفحة...' : 'جارٍ تحويلك إلى صفحة تسجيل الدخول…'}</p>

          {/* fallback فقط لو شخص أوقف الجافاسكربت أو حصل شيء */}
          {!loading && !user ? (
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <Link
                href={`/login?next=${encodeURIComponent('/add')}`}
                className="btn-primary auth-btn"
              >
                تسجيل الدخول
              </Link>
              <div style={{ height: 10 }} />
              <Link
                href={`/register?next=${encodeURIComponent('/add')}`}
                className="btn-secondary auth-btn"
              >
                إنشاء حساب جديد
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="add-page-layout">
      <div className="page-header add-page-header">
        <h1>إضافة إعلان جديد</h1>
        <p className="page-subtitle">أضف إعلانك ليجده الآلاف من المشترين</p>
      </div>

      <div className="form-tips">
        <div className="tip-item"><span className="tip-icon">📸</span><span>أضف صور واضحة وجودة عالية</span></div>
        <div className="tip-item"><span className="tip-icon">📝</span><span>اكتب وصفاً مفصلاً ودقيقاً</span></div>
        <div className="tip-item"><span className="tip-icon">💰</span><span>حدد سعراً مناسباً ومنافساً</span></div>
        <div className="tip-item"><span className="tip-icon">📍</span><span>اختر الموقع الدقيق لإعلانك</span></div>
      </div>

      <div className="form-grid">
        <div className="form-container">
          <h2 className="form-section-title">معلومات الإعلان</h2>

          {/* العنوان */}
          <div className="form-group">
            <label className="form-label required">عنوان الإعلان</label>
            <input
              className={`form-input ${errors.title ? 'error' : ''}`}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (submitAttempted) setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              placeholder="مثال: لابتوب ماك بوك برو 2023 بحالة ممتازة"
              maxLength={100}
            />
            <div className="form-helper">
              <span>أكتب عنواناً واضحاً وجذاباً</span>
              <span className="char-count">{title.length}/100</span>
            </div>
            {errors.title && <div className="form-error">{errors.title}</div>}
          </div>

          {/* الوصف */}
          <div className="form-group">
            <label className="form-label required">وصف الإعلان</label>
            <textarea
              className={`form-textarea ${errors.desc ? 'error' : ''}`}
              value={desc}
              onChange={(e) => {
                setDesc(e.target.value);
                if (submitAttempted) setErrors((prev) => ({ ...prev, desc: undefined }));
              }}
              placeholder="صف إعلانك بالتفصيل: الحالة، المواصفات، السبب البيع، إلخ..."
              rows={6}
              maxLength={2000}
            />
            <div className="form-helper">
              <span>التفاصيل تساعد على زيادة المبيعات</span>
              <span className="char-count">{desc.length}/2000</span>
            </div>
            {errors.desc && <div className="form-error">{errors.desc}</div>}
          </div>

          {/* المدينة والقسم */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">المدينة</label>
              <input
                className={`form-input ${errors.city ? 'error' : ''}`}
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  if (submitAttempted) setErrors((prev) => ({ ...prev, city: undefined }));
                }}
                placeholder="مثال: صنعاء"
              />
              {errors.city && <div className="form-error">{errors.city}</div>}
            </div>

            <div className="form-group">
              <label className="form-label required">
                القسم {catsSource === 'fallback' ? '(Fallback)' : ''}
              </label>
              <select
                className={`form-select ${errors.category ? 'error' : ''}`}
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  if (submitAttempted) setErrors((prev) => ({ ...prev, category: undefined }));
                }}
                disabled={catsLoading}
              >
                <option value="" disabled>اختر القسم</option>
                {catsLoading ? (
                  <option>جاري تحميل الأقسام...</option>
                ) : (
                  cats.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
              {errors.category && <div className="form-error">{errors.category}</div>}
            </div>
          </div>

          {/* السعر والعملة */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">السعر</label>
              <input
                className={`form-input ${errors.price ? 'error' : ''}`}
                value={price}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  setPrice(value);
                  if (submitAttempted) setErrors((prev) => ({ ...prev, price: undefined }));
                }}
                placeholder="مثال: 100000"
                inputMode="decimal"
              />
              {errors.price && <div className="form-error">{errors.price}</div>}
            </div>

            <div className="form-group">
              <label className="form-label required">العملة</label>
              <div className="currency-selector">
                {['YER', 'SAR', 'USD'].map((curr) => (
                  <button
                    key={curr}
                    type="button"
                    className={`currency-btn ${currency === curr ? 'active' : ''}`}
                    onClick={() => setCurrency(curr)}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* السعر المحول */}
          {convertedPrice && (
            <div className="price-conversion">
              <span className="conversion-label">السعر المحول:</span>
              <div className="converted-prices">
                <span className="converted-price">
                  <strong>{convertedPrice.YER}</strong> ريال يمني
                </span>
                <span className="converted-price">≈ {convertedPrice.SAR} ريال سعودي</span>
                <span className="converted-price">≈ ${convertedPrice.USD} دولار أمريكي</span>
              </div>
            </div>
          )}

          {/* رقم الهاتف وواتساب */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">رقم الهاتف</label>
              <input
                className={`form-input ${errors.phone ? 'error' : ''}`}
                value={phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setPhone(value);
                  if (submitAttempted) setErrors((prev) => ({ ...prev, phone: undefined }));
                }}
                placeholder="مثال: 770000000"
                inputMode="tel"
                maxLength={15}
              />
              {errors.phone && <div className="form-error">{errors.phone}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">طريقة التواصل</label>
              <div className="communication-toggle">
                <button
                  type="button"
                  className={`toggle-btn ${isWhatsapp ? 'active' : ''}`}
                  onClick={() => setIsWhatsapp(true)}
                >
                  <span className="toggle-icon">💬</span>
                  واتساب
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${!isWhatsapp ? 'active' : ''}`}
                  onClick={() => setIsWhatsapp(false)}
                >
                  <span className="toggle-icon">📞</span>
                  مكالمة
                </button>
              </div>
            </div>
          </div>

          {/* الصور */}
          <div className="form-group">
            <label className="form-label">صور الإعلان (اختياري)</label>
            <div className="image-upload-area">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (images.length + files.length > 10) {
                    alert('يمكنك رفع 10 صور كحد أقصى');
                    return;
                  }
                  setImages((prev) => [...prev, ...files]);
                }}
                id="image-upload"
                className="image-upload-input"
              />
              <label htmlFor="image-upload" className="image-upload-label">
                <span className="upload-icon">📷</span>
                <span>اختر الصور</span>
                <span className="upload-hint">يمكنك رفع حتى 10 صور</span>
              </label>
            </div>

            {imagePreviews.length > 0 && (
              <div className="image-previews">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="image-preview">
                    <img src={preview} alt={`معاينة ${index + 1}`} className="preview-img" />
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={() => handleRemoveImage(index)}
                      aria-label="حذف الصورة"
                    >
                      ×
                    </button>
                    <span className="image-number">{index + 1}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* المزاد */}
          <div className="auction-section">
            <div className="auction-header">
              <div className="auction-title">
                <span className="auction-icon">⚡</span>
                <span>تفعيل نظام المزاد</span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={auctionEnabled}
                  onChange={(e) => setAuctionEnabled(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            {auctionEnabled && (
              <div className="auction-details">
                <div className="form-group">
                  <label className="form-label">مدة المزاد</label>
                  <div className="auction-time-input">
                    <input
                      className={`form-input ${errors.auctionMinutes ? 'error' : ''}`}
                      value={auctionMinutes}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setAuctionMinutes(value);
                        if (submitAttempted) setErrors((prev) => ({ ...prev, auctionMinutes: undefined }));
                      }}
                      inputMode="numeric"
                      maxLength={4}
                    />
                    <span className="auction-unit">دقيقة</span>
                  </div>
                  {errors.auctionMinutes && <div className="form-error">{errors.auctionMinutes}</div>}
                  <div className="auction-note">⏱️ سينتهي المزاد بعد {auctionMinutes} دقيقة من النشر</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* الخريطة */}
        <div className="map-container">
          <div className="map-header">
            <h2 className="form-section-title">
              <span className="map-icon">📍</span>
              موقع الإعلان
            </h2>
            <p className="map-subtitle">اسحب المؤشر لتحديد الموقع الدقيق</p>
          </div>

          <div className="map-wrapper">
            {!showMap ? (
              <div
                className="map-placeholder"
                style={{
                  padding: '60px 20px',
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                  borderRadius: '12px',
                  border: '2px dashed #0ea5e9',
                }}
              >
                <div style={{ fontSize: '48px', marginBottom: '16px' }} role="img" aria-label="أيقونة الخريطة">
                  🗺️
                </div>
                <button
                  type="button"
                  onClick={() => setShowMap(true)}
                  className="btn btnPrimary"
                  style={{ padding: '12px 24px', fontSize: '16px', fontWeight: 'bold' }}
                  aria-label="تحميل الخريطة لتحديد الموقع"
                >
                  <span role="img" aria-label="أيقونة موقع">📍</span> تحميل الخريطة
                </button>
                <p style={{ marginTop: '12px', color: '#64748b', fontSize: '14px' }}>
                  اضغط لتحديد موقع الإعلان على الخريطة
                </p>
              </div>
            ) : (
              <LocationPicker value={coords} onChange={onPick} />
            )}
          </div>

          {locationLabel && (
            <div className="location-info">
              <div className="location-label">
                <span className="location-icon">🏷️</span>
                {locationLabel}
              </div>
            </div>
          )}

          {!coords && (
            <div className="location-hint">
              <div className="hint-icon">💡</div>
              <p>تحديد الموقع يساعد المشترين في الوصول إليك بسهولة</p>
            </div>
          )}

          <div className="mobile-submit-section">
            <button className="submit-btn-large" onClick={submit} disabled={!user || busy}>
              {busy ? (
                <>
                  <span className="loading-spinner-small"></span>
                  جاري النشر...
                </>
              ) : (
                '📢 نشر الإعلان'
              )}
            </button>

            <div className="form-notes">
              <p className="note-item">✅ يمكنك تعديل الإعلان لاحقاً</p>
              <p className="note-item">🛡️ معلوماتك محمية وآمنة</p>
            </div>
          </div>
        </div>
      </div>

      <div className="desktop-submit-section">
        <div className="submit-actions">
          <button className="submit-btn-large" onClick={submit} disabled={!user || busy}>
            {busy ? (
              <>
                <span className="loading-spinner-small"></span>
                جاري النشر...
              </>
            ) : (
              '📢 نشر الإعلان الآن'
            )}
          </button>

          <Link href="/" className="cancel-link">
            ❌ إلغاء والعودة
          </Link>
        </div>

        <div className="final-notes">
          <p>
            بعد النشر، يمكنك متابعة إعلانك من قسم <strong>&quot;إعلاناتي&quot;</strong>
          </p>
        </div>
      </div>

      {/* ✅ نفس CSS حقك كما هو */}
      <style jsx>{`
        /* (نفس الـ CSS الذي أرسلته بدون تغيير) */
        .add-page-layout {
          min-height: calc(100vh - 60px);
          padding: 20px 16px;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }
        /* ... نفس الـ CSS الذي عندك بالكامل ... */
      `}</style>
    </div>
  );
}
