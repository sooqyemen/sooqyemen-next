'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { db, firebase } from '@/lib/firebaseClient';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useAuth } from '@/lib/useAuth';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import './edit-listing.css';

// إعدادات الأدمن
const RAW_ENV_ADMIN = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
const STATIC_ADMINS = [
  'mansouralbarout@gmail.com',
  'aboramez965@gmail.com',
];
const ADMIN_EMAILS = [RAW_ENV_ADMIN, ...STATIC_ADMINS]
  .filter(Boolean)
  .map((e) => String(e).toLowerCase());

// مكون العرض المحسّن
const EditListingPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [listing, setListing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  // بيانات النموذج
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priceYER: '',
    originalPrice: '',
    originalCurrency: 'USD',
    city: '',
    locationLabel: '',
    coords: null,
    category: '',
    auctionEnabled: false,
    auctionEndDate: '',
  });

  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  const userEmail = user?.email ? String(user.email).toLowerCase() : null;
  const isAdmin = !!userEmail && ADMIN_EMAILS.includes(userEmail);
  const isOwner = !!user?.uid && !!listing?.userId && user.uid === listing.userId;

  // جلب الأقسام
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesSnapshot = await db.collection('categories').get();
        const categoriesList = categoriesSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(cat => cat.active !== false)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        
        setCategories(categoriesList);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchCategories();
  }, []);

  // جلب بيانات الإعلان
  useEffect(() => {
    const fetchListing = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const listingDoc = await getDoc(doc(db, 'listings', id));
        
        if (!listingDoc.exists()) {
          setError('الإعلان غير موجود أو تم حذفه');
          setTimeout(() => router.push('/my-listings'), 2000);
          return;
        }

        const listingData = { id, ...listingDoc.data() };
        setListing(listingData);
        setSelectedCategory(listingData.category || '');

        // تعبئة بيانات النموذج
        setFormData({
          title: listingData.title || '',
          description: listingData.description || '',
          priceYER: listingData.priceYER || '',
          originalPrice: listingData.originalPrice || '',
          originalCurrency: listingData.originalCurrency || 'USD',
          city: listingData.city || '',
          locationLabel: listingData.locationLabel || '',
          coords: listingData.coords,
          category: listingData.category || '',
          auctionEnabled: listingData.auctionEnabled || false,
          auctionEndDate: listingData.auctionEndDate || '',
        });

        // إعداد الإحداثيات
        if (Array.isArray(listingData.coords) && listingData.coords.length === 2) {
          setLat(String(listingData.coords[0]));
          setLng(String(listingData.coords[1]));
        } else if (listingData.coords?.lat && listingData.coords?.lng) {
          setLat(String(listingData.coords.lat));
          setLng(String(listingData.coords.lng));
        }

        setError('');
      } catch (error) {
        console.error('Error fetching listing:', error);
        setError('حدث خطأ في جلب بيانات الإعلان. يرجى المحاولة لاحقاً.');
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [id, router]);

  // منع الخروج مع وجود تغييرات غير محفوظة
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'لديك تغييرات غير محفوظة. هل تريد المغادرة؟';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const canEdit = useMemo(() => {
    if (!user) return false;
    return isAdmin || isOwner;
  }, [isAdmin, isOwner, user]);

  // تحديث بيانات النموذج
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  // التحقق من صحة البيانات
  const validateForm = () => {
    if (!formData.title.trim()) {
      setError('يرجى إدخال عنوان الإعلان');
      return false;
    }
    
    if (!formData.description.trim()) {
      setError('يرجى إدخال وصف الإعلان');
      return false;
    }
    
    if (!formData.priceYER || Number(formData.priceYER) <= 0) {
      setError('يرجى إدخال سعر صحيح للإعلان');
      return false;
    }
    
    if (!formData.city.trim()) {
      setError('يرجى إدخال المدينة');
      return false;
    }
    
    if (formData.auctionEnabled && !formData.auctionEndDate) {
      setError('يرجى تحديد تاريخ انتهاء المزاد');
      return false;
    }

    // التحقق من الإحداثيات
    const numLat = parseFloat(lat);
    const numLng = parseFloat(lng);
    if ((lat && isNaN(numLat)) || (lng && isNaN(numLng))) {
      setError('الإحداثيات غير صحيحة. يرجى استخدام أرقام فقط');
      return false;
    }

    return true;
  };

  // حفظ التعديلات
  const saveChanges = async () => {
    if (!validateForm()) return;
    if (!canEdit) {
      setError('ليست لديك صلاحية تعديل هذا الإعلان');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      let coords = listing.coords || null;
      const numLat = parseFloat(lat);
      const numLng = parseFloat(lng);
      
      if (!isNaN(numLat) && !isNaN(numLng)) {
        coords = [numLat, numLng];
      }

      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        priceYER: Number(formData.priceYER),
        originalPrice: formData.originalPrice ? Number(formData.originalPrice) : null,
        originalCurrency: formData.originalCurrency,
        city: formData.city.trim(),
        locationLabel: formData.locationLabel.trim(),
        category: selectedCategory,
        coords,
        auctionEnabled: formData.auctionEnabled,
        auctionEndDate: formData.auctionEndDate || null,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      // للمزاد، تأكد من صحة التاريخ
      if (formData.auctionEnabled && formData.auctionEndDate) {
        const auctionEnd = new Date(formData.auctionEndDate);
        if (auctionEnd <= new Date()) {
          setError('تاريخ انتهاء المزاد يجب أن يكون في المستقبل');
          setSaving(false);
          return;
        }
        updateData.auctionEndDate = auctionEnd;
      }

      // سجل التعديل
      await updateDoc(doc(db, 'listings', id), updateData);
      
      // إضافة سجل التعديل
      await updateDoc(doc(db, 'listings', id), {
        editHistory: arrayUnion({
          editedBy: user.email,
          editedAt: firebase.firestore.FieldValue.serverTimestamp(),
          changes: Object.keys(updateData).filter(key => key !== 'updatedAt')
        })
      });

      setSuccess('تم حفظ التعديلات بنجاح');
      setHasUnsavedChanges(false);
      
      // إعادة التوجيه بعد ثانيتين
      setTimeout(() => {
        if (isAdmin) {
          router.push('/admin');
        } else {
          router.push('/my-listings');
        }
      }, 2000);

    } catch (error) {
      console.error('Error saving listing:', error);
      setError('حدث خطأ أثناء حفظ التعديلات. يرجى المحاولة مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  // حذف الإعلان
  const deleteListing = async () => {
    if (!canEdit) {
      setError('ليست لديك صلاحية حذف هذا الإعلان');
      return;
    }

    if (!confirm('هل أنت متأكد من حذف هذا الإعلان؟ لا يمكن التراجع عن هذا الإجراء.')) {
      return;
    }

    try {
      setSaving(true);
      await db.collection('listings').doc(id).delete();
      alert('تم حذف الإعلان بنجاح');
      router.push(isAdmin ? '/admin' : '/my-listings');
    } catch (error) {
      console.error('Error deleting listing:', error);
      setError('حدث خطأ أثناء حذف الإعلان');
    } finally {
      setSaving(false);
    }
  };

  // تحديث الإحداثيات
  const updateCoordinates = (newLat, newLng) => {
    setLat(newLat);
    setLng(newLng);
    setHasUnsavedChanges(true);
  };

  // استخدام موقع المستخدم الحالي
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('المتصفح لا يدعم تحديد الموقع');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        updateCoordinates(latitude.toFixed(6), longitude.toFixed(6));
        setSuccess('تم تحديد موقعك الحالي بنجاح');
      },
      (error) => {
        console.error('Error getting location:', error);
        setError('فشل في تحديد الموقع. يرجى التأكد من السماح بتحديد الموقع');
      }
    );
  };

  // حالات التحميل
  if (loading || authLoading) {
    return (
      <>
        <Header />
        <div className="edit-listing-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>جاري تحميل بيانات الإعلان...</p>
          </div>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Header />
        <div className="edit-listing-container">
          <div className="access-denied">
            <h2>🔐 يرجى تسجيل الدخول</h2>
            <p>يجب تسجيل الدخول لتعديل الإعلانات.</p>
            <button 
              className="btn-primary" 
              onClick={() => router.push('/login')}
            >
              تسجيل الدخول
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!listing) {
    return (
      <>
        <Header />
        <div className="edit-listing-container">
          <div className="not-found">
            <h2>⚠️ الإعلان غير موجود</h2>
            <p>الإعلان الذي تحاول تعديله غير موجود أو تم حذفه.</p>
            <button 
              className="btn-secondary" 
              onClick={() => router.push('/my-listings')}
            >
              العودة للإعلانات
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!canEdit) {
    return (
      <>
        <Header />
        <div className="edit-listing-container">
          <div className="access-denied">
            <h2>🚫 صلاحية مرفوضة</h2>
            <p>ليست لديك صلاحية لتعديل هذا الإعلان.</p>
            <div className="user-info">
              <p>مالك الإعلان: <strong>{listing.userEmail || 'غير معروف'}</strong></p>
              <p>البريد الحالي: <strong>{user.email}</strong></p>
            </div>
            <button 
              className="btn-secondary" 
              onClick={() => router.push('/my-listings')}
            >
              العودة للإعلانات
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="edit-listing-container">
        {/* رأس الصفحة */}
        <div className="page-header">
          <div className="header-left">
            <button
              className="back-button"
              onClick={() => isAdmin ? router.push('/admin') : router.push('/my-listings')}
            >
              ← رجوع
            </button>
            <h1 className="page-title">تعديل الإعلان</h1>
          </div>
          <div className="header-badges">
            <span className="badge owner-badge">
              {isAdmin ? 'مدير' : 'مالك'}
            </span>
            {listing.auctionEnabled && (
              <span className="badge auction-badge">⚡ مزاد</span>
            )}
          </div>
        </div>

        {/* رسائل */}
        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <span className="alert-icon">✅</span>
            <span>{success}</span>
          </div>
        )}

        {hasUnsavedChanges && (
          <div className="alert alert-warning">
            <span className="alert-icon">💾</span>
            <span>لديك تغييرات غير محفوظة</span>
          </div>
        )}

        {/* معلومات الإعلان */}
        <div className="listing-info-card">
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">رقم الإعلان:</span>
              <span className="info-value">{id}</span>
            </div>
            <div className="info-item">
              <span className="info-label">تاريخ النشر:</span>
              <span className="info-value">
                {listing.createdAt?.toDate?.().toLocaleDateString('ar-YE') || 'غير معروف'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">المشاهدات:</span>
              <span className="info-value">{listing.views || 0}</span>
            </div>
            <div className="info-item">
              <span className="info-label">الحالة:</span>
              <span className={`status-badge ${listing.hidden ? 'hidden' : 'active'}`}>
                {listing.hidden ? 'مخفي' : 'نشط'}
              </span>
            </div>
          </div>
        </div>

        {/* نموذج التعديل */}
        <div className="edit-form">
          {/* العنوان */}
          <div className="form-group">
            <label className="form-label required">عنوان الإعلان</label>
            <input
              type="text"
              className="form-input"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="أدخل عنوان الإعلان..."
              maxLength={100}
            />
            <div className="form-hint">الحد الأقصى: 100 حرف</div>
          </div>

          {/* الوصف */}
          <div className="form-group">
            <label className="form-label required">وصف الإعلان</label>
            <textarea
              className="form-textarea"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="أدخل وصفاً مفصلاً للإعلان..."
              rows={6}
              maxLength={2000}
            />
            <div className="form-hint">الحد الأقصى: 2000 حرف</div>
          </div>

          {/* السعر */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">السعر (ريال يمني)</label>
              <input
                type="number"
                className="form-input"
                value={formData.priceYER}
                onChange={(e) => handleInputChange('priceYER', e.target.value)}
                placeholder="أدخل السعر بالريال اليمني..."
                min="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">السعر الأصلي</label>
              <div className="currency-input">
                <input
                  type="number"
                  className="form-input"
                  value={formData.originalPrice}
                  onChange={(e) => handleInputChange('originalPrice', e.target.value)}
                  placeholder="السعر بالعملة الأصلية"
                  min="0"
                />
                <select
                  className="currency-select"
                  value={formData.originalCurrency}
                  onChange={(e) => handleInputChange('originalCurrency', e.target.value)}
                >
                  <option value="USD">$ دولار</option>
                  <option value="SAR">﷼ ريال سعودي</option>
                  <option value="AED">د.إ درهم</option>
                </select>
              </div>
            </div>
          </div>

          {/* القسم */}
          <div className="form-group">
            <label className="form-label">القسم</label>
            <select
              className="form-select"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setHasUnsavedChanges(true);
              }}
            >
              <option value="">اختر القسم</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* الموقع */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">المدينة</label>
              <input
                type="text"
                className="form-input"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="أدخل المدينة..."
              />
            </div>
            <div className="form-group">
              <label className="form-label">وصف الموقع</label>
              <input
                type="text"
                className="form-input"
                value={formData.locationLabel}
                onChange={(e) => handleInputChange('locationLabel', e.target.value)}
                placeholder="مثال: بجوار السوق المركزي..."
              />
            </div>
          </div>

          {/* الإحداثيات */}
          <div className="form-group">
            <label className="form-label">الإحداثيات الجغرافية</label>
            <div className="coordinates-section">
              <div className="coordinates-inputs">
                <div className="coordinate-input">
                  <label className="coordinate-label">خط العرض</label>
                  <input
                    type="text"
                    className="form-input"
                    value={lat}
                    onChange={(e) => updateCoordinates(e.target.value, lng)}
                    placeholder="مثال: 15.369445"
                  />
                </div>
                <div className="coordinate-input">
                  <label className="coordinate-label">خط الطول</label>
                  <input
                    type="text"
                    className="form-input"
                    value={lng}
                    onChange={(e) => updateCoordinates(lat, e.target.value)}
                    placeholder="مثال: 44.191007"
                  />
                </div>
              </div>
              <button
                type="button"
                className="location-button"
                onClick={useCurrentLocation}
              >
                📍 استخدام موقعي الحالي
              </button>
              <div className="coordinates-hint">
                اترك الحقول فارغة إذا كنت لا تريد تحديد موقع دقيق
              </div>
            </div>
          </div>

          {/* المزاد */}
          <div className="form-group">
            <div className="auction-section">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  className="checkbox-input"
                  checked={formData.auctionEnabled}
                  onChange={(e) => handleInputChange('auctionEnabled', e.target.checked)}
                />
                <span className="checkbox-text">تفعيل نظام المزاد</span>
              </label>
              
              {formData.auctionEnabled && (
                <div className="auction-details">
                  <label className="form-label required">تاريخ انتهاء المزاد</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={formData.auctionEndDate}
                    onChange={(e) => handleInputChange('auctionEndDate', e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* أزرار الإجراءات */}
          <div className="action-buttons">
            <div className="left-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => isAdmin ? router.push('/admin') : router.push('/my-listings')}
                disabled={saving}
              >
                إلغاء
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={deleteListing}
                disabled={saving}
              >
                🗑️ حذف الإعلان
              </button>
            </div>
            <div className="right-actions">
              <button
                type="button"
                className="btn-success"
                onClick={saveChanges}
                disabled={saving || !hasUnsavedChanges}
              >
                {saving ? (
                  <>
                    <span className="spinner-small"></span>
                    جاري الحفظ...
                  </>
                ) : (
                  '💾 حفظ التعديلات'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditListingPage;
