'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { db, firebase, storage } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';
import { toYER, useRates } from '@/lib/rates';
import Link from 'next/link';

// ✅ Taxonomy (تصنيف هرمي للفروع)
import {
  // options
  CAR_MAKES,
  CAR_MODELS_BY_MAKE,
  PHONE_BRANDS,
  DEAL_TYPES,
  PROPERTY_TYPES,
  ELECTRONICS_TYPES,
  HEAVY_EQUIPMENT_TYPES,
  SOLAR_TYPES,
  NETWORK_TYPES,
  MAINTENANCE_TYPES,
  FURNITURE_TYPES,
  HOME_TOOLS_TYPES,
  CLOTHES_TYPES,
  ANIMAL_TYPES,
  JOB_TYPES,
  SERVICE_TYPES,
  MOTORCYCLE_BRANDS,

  // detection/inference (for "Paste text" importer)
  inferListingTaxonomy,
  detectCarMakeFromText,
  detectPhoneBrandFromText,
  detectPropertyTypeFromText,
  detectDealTypeFromText,
  detectMotorcycleBrandFromText,
} from '@/lib/taxonomy';

const LocationPicker = dynamic(
  () => import('@/components/Map/LocationPicker'),
  { ssr: false }
);

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


const DEFAULT_GOVERNORATES = [
  { key: 'amanat_al_asimah', nameAr: 'أمانة العاصمة', order: 1, enabled: true },
  { key: 'sanaa', nameAr: 'صنعاء', order: 2, enabled: true },
  { key: 'aden', nameAr: 'عدن', order: 3, enabled: true },
  { key: 'taiz', nameAr: 'تعز', order: 4, enabled: true },
  { key: 'ibb', nameAr: 'إب', order: 5, enabled: true },
  { key: 'al_hudaydah', nameAr: 'الحديدة', order: 6, enabled: true },
  { key: 'hadramaut', nameAr: 'حضرموت', order: 7, enabled: true },
  { key: 'dhamar', nameAr: 'ذمار', order: 8, enabled: true },
  { key: 'al_bayda', nameAr: 'البيضاء', order: 9, enabled: true },
  { key: 'hajjah', nameAr: 'حجة', order: 10, enabled: true },
  { key: 'lahij', nameAr: 'لحج', order: 11, enabled: true },
  { key: 'abyan', nameAr: 'أبين', order: 12, enabled: true },
  { key: 'al_dhale', nameAr: 'الضالع', order: 13, enabled: true },
  { key: 'al_mahrah', nameAr: 'المهرة', order: 14, enabled: true },
  { key: 'al_jawf', nameAr: 'الجوف', order: 15, enabled: true },
  { key: 'al_mahwit', nameAr: 'المحويت', order: 16, enabled: true },
  { key: 'marib', nameAr: 'مأرب', order: 17, enabled: true },
  { key: 'raymah', nameAr: 'ريمة', order: 18, enabled: true },
  { key: 'saada', nameAr: 'صعدة', order: 19, enabled: true },
  { key: 'shabwah', nameAr: 'شبوة', order: 20, enabled: true },
  { key: 'amran', nameAr: 'عمران', order: 21, enabled: true },
  { key: 'socotra', nameAr: 'سقطرى', order: 22, enabled: true },
];

const YEMEN_BOUNDS = [
  [12.0, 41.0],
  [19.5, 54.7],
];



export default function AddPage() {
  const { user, loading } = useAuth();
  const rates = useRates();

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [city, setCity] = useState('');
  const [govKey, setGovKey] = useState('');
  // ✅ مهم: لا يوجد قسم افتراضي
  const [category, setCategory] = useState('');
  // ✅ فروع الأقسام (هرمية)
  const [carMake, setCarMake] = useState(''); // cars
  const [carMakeText, setCarMakeText] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carModelText, setCarModelText] = useState('');

  const [phoneBrand, setPhoneBrand] = useState(''); // phones
  const [phoneBrandText, setPhoneBrandText] = useState('');
  const [dealType, setDealType] = useState(''); // realestate: sale/rent
  const [propertyType, setPropertyType] = useState(''); // realestate: land/house...
  const [propertyTypeText, setPropertyTypeText] = useState('');

  // ✅ بقية الأقسام (اختياري، لكن يُحسّن البحث والفلترة)
  const [electronicsType, setElectronicsType] = useState('');
  const [electronicsTypeText, setElectronicsTypeText] = useState('');

  const [motorcycleBrand, setMotorcycleBrand] = useState('');
  const [motorcycleBrandText, setMotorcycleBrandText] = useState('');

  const [heavyEquipmentType, setHeavyEquipmentType] = useState('');
  const [heavyEquipmentTypeText, setHeavyEquipmentTypeText] = useState('');

  const [solarType, setSolarType] = useState('');
  const [solarTypeText, setSolarTypeText] = useState('');

  const [networkType, setNetworkType] = useState('');
  const [networkTypeText, setNetworkTypeText] = useState('');

  const [maintenanceType, setMaintenanceType] = useState('');
  const [maintenanceTypeText, setMaintenanceTypeText] = useState('');

  const [furnitureType, setFurnitureType] = useState('');
  const [furnitureTypeText, setFurnitureTypeText] = useState('');

  const [homeToolsType, setHomeToolsType] = useState('');
  const [homeToolsTypeText, setHomeToolsTypeText] = useState('');

  const [clothesType, setClothesType] = useState('');
  const [clothesTypeText, setClothesTypeText] = useState('');

  const [animalType, setAnimalType] = useState('');
  const [animalTypeText, setAnimalTypeText] = useState('');

  const [jobType, setJobType] = useState('');
  const [jobTypeText, setJobTypeText] = useState('');

  const [serviceType, setServiceType] = useState('');
  const [serviceTypeText, setServiceTypeText] = useState('');

  const [phone, setPhone] = useState('');
  const [isWhatsapp, setIsWhatsapp] = useState(true);

  const [currency, setCurrency] = useState('YER');
  const [price, setPrice] = useState('');

  const [coords, setCoords] = useState(null); // [lat, lng]
  const [locatingMe, setLocatingMe] = useState(false);

  // ==============================
  // ✅ Import helper (Paste text / Import URL)
  // ==============================
  const [importMode, setImportMode] = useState('text'); // 'text' | 'url'
  const [importInput, setImportInput] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importNotes, setImportNotes] = useState([]);
  const [importedImageUrls, setImportedImageUrls] = useState([]);

  const [locationLabel, setLocationLabel] = useState('');
  const [showMap, setShowMap] = useState(true); // ✅ الخريطة مفتوحة دائمًا


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

  // ✅ المحافظات (المدن) - تحميلها من Firestore أو استخدام fallback
  const [govs, setGovs] = useState(DEFAULT_GOVERNORATES);
  const [govsLoading, setGovsLoading] = useState(true);
  const [govsSource, setGovsSource] = useState('loading'); // loading | firestore | fallback



  // ✅ تحميل الأقسام من Firestore
  useEffect(() => {
    const unsub = db.collection('categories').onSnapshot(
      (snap) => {
        const arr = snap.docs
          .map((d) => {
            const data = d.data() || {};
            return {
              slug: d.id, // ✅ مفتاح القسم = id
              name: String(data.name || '').trim(),
              active: data.active,
            };
          })
          .filter((c) => c.slug && c.name && c.active !== false);

        // ترتيب عربي لطيف
        arr.sort((a, b) => a.name.localeCompare(b.name, 'ar'));

        if (arr.length) {
          setCats(arr);
          setCatsSource('firestore');

          // ✅ إذا القسم الحالي غير موجود، صفّره
          if (category && !arr.some((x) => x.slug === category)) {
            setCategory('');
          }
        } else {
          setCats(DEFAULT_CATEGORIES);
          setCatsSource('fallback');
          if (category && !DEFAULT_CATEGORIES.some((x) => x.slug === category)) {
            setCategory('');
          }
        }

        setCatsLoading(false);
      },
      (err) => {
        console.error('Failed to load categories:', err);
        setCats(DEFAULT_CATEGORIES);
        setCatsLoading(false);
        setCatsSource('fallback');

        if (category && !DEFAULT_CATEGORIES.some((x) => x.slug === category)) {
          setCategory('');
        }
      }
    );

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ تحميل المحافظات (taxonomy_governorates) من Firestore
  useEffect(() => {
    const unsub = db.collection('taxonomy_governorates').onSnapshot(
      (snap) => {
        const arr = snap.docs
          .map((d) => {
            const data = d.data() || {};
            return {
              key: d.id,
              nameAr: data.nameAr || data.name_ar || data.name || d.id,
              order: typeof data.order === 'number' ? data.order : Number(data.order || 0),
              enabled: data.enabled !== false,
            };
          })
          .filter((x) => x.enabled);

        arr.sort((a, b) => {
          const ao = Number.isFinite(a.order) ? a.order : 0;
          const bo = Number.isFinite(b.order) ? b.order : 0;
          if (ao !== bo) return ao - bo;
          return String(a.nameAr || '').localeCompare(String(b.nameAr || ''), 'ar');
        });

        if (arr.length) {
          setGovs(arr);
          setGovsSource('firestore');
        } else {
          setGovs(DEFAULT_GOVERNORATES);
          setGovsSource('fallback');
        }

        setGovsLoading(false);
      },
      (err) => {
        console.error('Failed to load taxonomy_governorates:', err);
        setGovs(DEFAULT_GOVERNORATES);
        setGovsLoading(false);
        setGovsSource('fallback');
      }
    );

    return () => unsub();
  }, []);

  // ✅ اجعل city مشتقة من govKey (حتى ما يصير اختلاف أسماء)
  useEffect(() => {
    if (!govKey) {
      setCity('');
      return;
    }
    const found = (govs || []).find((g) => g.key === govKey);
    setCity(found?.nameAr ? String(found.nameAr) : '');
  }, [govKey, govs]);

  // ==============================
  // ✅ Import helpers
  // ==============================
  const guessRootCategoryFromText = (text) => {
    const t = String(text || '').trim();
    if (!t) return '';

    const carMake = detectCarMakeFromText(t);
    if (carMake && carMake !== 'other') return 'cars';

    const phoneBrand = detectPhoneBrandFromText(t);
    if (phoneBrand && phoneBrand !== 'other') return 'phones';

    const propType = detectPropertyTypeFromText(t);
    const dealType = detectDealTypeFromText(t);
    if (propType || dealType) return 'realestate';

    const motoBrand = detectMotorcycleBrandFromText(t);
    if (motoBrand && motoBrand !== 'other') return 'motorcycles';

    // fallback by keywords (light)
    const lower = t.toLowerCase();
    if (lower.includes('شقة') || lower.includes('فيلا') || lower.includes('ارض') || lower.includes('عمارة')) return 'realestate';
    if (lower.includes('ايفون') || lower.includes('سامسونج') || lower.includes('جوال')) return 'phones';
    if (lower.includes('تويوتا') || lower.includes('نيسان') || lower.includes('سيارة')) return 'cars';

    return '';
  };

  const applyImportedData = (data) => {
    if (!data) return;

    // clear previous import msgs
    setImportError('');
    setImportNotes(Array.isArray(data?.notes) ? data.notes : []);

    // Basic fields
    if (data.title) setTitle(String(data.title).slice(0, 100));
    if (data.desc) setDesc(String(data.desc).slice(0, 2000));

    if (data.currency) setCurrency(String(data.currency));
    if (data.price != null) setPrice(String(data.price || ''));

    if (data.phone) setPhone(String(data.phone));

    if (data.govKey) setGovKey(String(data.govKey));
    if (Array.isArray(data.coords) && data.coords.length === 2) {
      // only set if user didn't choose a more precise point yet
      setCoords((prev) => (Array.isArray(prev) && prev.length === 2 ? prev : data.coords));
    }

    // Images
    if (Array.isArray(data.images) && data.images.length) {
      setImportedImageUrls(data.images.slice(0, 10));
    } else {
      setImportedImageUrls([]);
    }

    // Guess root category + infer taxonomy
    const text = `${data.title || ''} ${data.desc || ''}`.trim();
    const root = guessRootCategoryFromText(text);
    if (root) setCategory(root);

    if (root) {
      const inferred = inferListingTaxonomy({ title: data.title || '', description: data.desc || '' }, root);

      if (root === 'cars') {
        setCarMake(inferred.carMake || '');
        setCarMakeText('');
        setCarModel(inferred.carModel || '');
        setCarModelText('');
      }

      if (root === 'phones') {
        setPhoneBrand(inferred.phoneBrand || '');
        setPhoneBrandText('');
      }

      if (root === 'realestate') {
        setDealType(inferred.dealType || '');
        setPropertyType(inferred.propertyType || '');
        setPropertyTypeText('');
      }

      if (root === 'motorcycles') {
        setMotorcycleBrand(inferred.motorcycleBrand || '');
        setMotorcycleBrandText('');
        setMotorcycleModel(inferred.motorcycleModel || '');
        setMotorcycleModelText('');
      }
    }
  };

  const handleImport = async () => {
    try {
      setImportLoading(true);
      setImportError('');
      setImportNotes([]);

      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: importMode, input: importInput }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        // إذا الرابط غير مدعوم (مثل فيسبوك/انستقرام) حوّل المستخدم تلقائيًا لوضع "نص"
        if (json?.code === 'UNSUPPORTED_FACEBOOK') {
          setImportMode('text');
        }
        setImportError(String(json?.message || 'فشل الاستيراد.'));
        return;
      }

      applyImportedData(json.data || {});
    } catch (e) {
      console.error('Import failed:', e);
      setImportError('فشل الاستيراد. تأكد من الإنترنت أو جرّب لصق النص بدل الرابط.');
    } finally {
      setImportLoading(false);
    }
  };

  const clearImport = () => {
    setImportInput('');
    setImportError('');
    setImportNotes([]);
    setImportedImageUrls([]);
  };

  const tryImportImagesFromUrls = async () => {
    if (!importedImageUrls.length) return;

    // Try to download images as blobs and convert them into File objects
    // Note: Some sites block CORS, so this is best-effort only.
    const nextFiles = [];
    const nextPreviews = [];

    for (const url of importedImageUrls.slice(0, 10)) {
      try {
        const r = await fetch(`/api/import-image?url=${encodeURIComponent(url)}`);
        if (!r.ok) continue;
        const blob = await r.blob();
        const ext = (blob.type && blob.type.includes('/')) ? blob.type.split('/')[1] : 'jpg';
        const file = new File([blob], `imported_${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`, { type: blob.type || 'image/jpeg' });
        nextFiles.push(file);
        nextPreviews.push(URL.createObjectURL(file));
      } catch (e) {
        // ignore single image failure
      }
    }

    if (!nextFiles.length) {
      setImportError('تعذر استيراد الصور تلقائياً (موقع المصدر يمنع التحميل). ارفع الصور يدويًا.');
      return;
    }

    setImages((prev) => [...prev, ...nextFiles]);
    setImagePreviews((prev) => [...prev, ...nextPreviews]);
    setImportNotes((prev) => Array.isArray(prev) ? [...prev, 'تم استيراد بعض الصور بنجاح. راجعها قبل النشر.'] : ['تم استيراد بعض الصور بنجاح.']);
  };




  // ✅ عند تغيير القسم: صفّر الفروع
  useEffect(() => {
    setCarMake('');
    setCarMakeText('');
    setCarModel('');
    setCarModelText('');

    setPhoneBrand('');
    setPhoneBrandText('');

    setDealType('');
    setPropertyType('');
    setPropertyTypeText('');

    setElectronicsType('');
    setElectronicsTypeText('');

    setMotorcycleBrand('');
    setMotorcycleBrandText('');

    setHeavyEquipmentType('');
    setHeavyEquipmentTypeText('');

    setSolarType('');
    setSolarTypeText('');

    setNetworkType('');
    setNetworkTypeText('');

    setMaintenanceType('');
    setMaintenanceTypeText('');

    setFurnitureType('');
    setFurnitureTypeText('');

    setHomeToolsType('');
    setHomeToolsTypeText('');

    setClothesType('');
    setClothesTypeText('');

    setAnimalType('');
    setAnimalTypeText('');

    setJobType('');
    setJobTypeText('');

    setServiceType('');
    setServiceTypeText('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

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

  // ✅ موديلات السيارة حسب الماركة (لواجهة الإضافة)
  const carModelsForMake = useMemo(() => {
    const mk = String(carMake || '').trim();
    if (!mk || mk === 'other') return [];
    return Array.isArray(CAR_MODELS_BY_MAKE?.[mk]) ? CAR_MODELS_BY_MAKE[mk] : [];
  }, [carMake]);

  const slugKey = (v) =>
    String(v || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/-+/g, '_')
      .replace(/__+/g, '_')
      .replace(/[^a-z0-9_\u0600-\u06FF]/g, '')
      .slice(0, 60);

  // ✅ التحقق من الأخطاء
  const validateForm = () => {
    const newErrors = {};

    if (!title.trim()) newErrors.title = 'الرجاء إدخال عنوان للإعلان';
    else if (title.trim().length < 5) newErrors.title = 'العنوان يجب أن يكون 5 أحرف على الأقل';

    if (!desc.trim()) newErrors.desc = 'الرجاء إدخال وصف للإعلان';
    else if (desc.trim().length < 10) newErrors.desc = 'الوصف يجب أن يكون 10 أحرف على الأقل';

    if (!govKey) newErrors.govKey = 'الرجاء اختيار المحافظة';

    // ✅ القسم إجباري
    if (!category) newErrors.category = 'الرجاء اختيار القسم';

    if (!price || isNaN(price) || Number(price) <= 0) newErrors.price = 'الرجاء إدخال سعر صحيح';

    const phoneDigits = phone.replace(/\D/g, '');
    if (!phoneDigits) {
      newErrors.phone = 'رقم التواصل مطلوب';
    } else if (!/^[0-9]{9,15}$/.test(phoneDigits)) {
      newErrors.phone = 'رقم الهاتف غير صحيح';
    }

    // ✅ فروع الأقسام (للمستقبل + الخريطة)
    if (category === 'cars') {
      if (!carMake) newErrors.carMake = 'اختر ماركة السيارة';
      if (carMake === 'other' && !carMakeText.trim()) newErrors.carMakeText = 'اكتب ماركة السيارة';
      if (carModel === 'other' && !carModelText.trim()) newErrors.carModelText = 'اكتب موديل السيارة';
    }

    if (category === 'phones') {
      if (!phoneBrand) newErrors.phoneBrand = 'اختر ماركة الجوال';
      if (phoneBrand === 'other' && !phoneBrandText.trim()) newErrors.phoneBrandText = 'اكتب ماركة الجوال';
    }

    if (category === 'realestate') {
      if (!dealType) newErrors.dealType = 'اختر (بيع / إيجار)';
      if (!propertyType) newErrors.propertyType = 'اختر نوع العقار';
      if (propertyType === 'other' && !propertyTypeText.trim()) newErrors.propertyTypeText = 'اكتب نوع العقار';
    }

    // ✅ بقية الأقسام (نطلب وصف فقط إذا اختار المستخدم "أخرى")
    if (category === 'electronics') {
      if (electronicsType === 'other' && !electronicsTypeText.trim()) newErrors.electronicsTypeText = 'اكتب نوع الإلكترونيات';
    }
    if (category === 'motorcycles') {
      if (motorcycleBrand === 'other' && !motorcycleBrandText.trim()) newErrors.motorcycleBrandText = 'اكتب ماركة الدراجة';
    }
    if (category === 'heavy_equipment') {
      if (heavyEquipmentType === 'other' && !heavyEquipmentTypeText.trim()) newErrors.heavyEquipmentTypeText = 'اكتب نوع المعدة';
    }
    if (category === 'solar') {
      if (solarType === 'other' && !solarTypeText.trim()) newErrors.solarTypeText = 'اكتب نوع الطاقة الشمسية';
    }
    if (category === 'networks') {
      if (networkType === 'other' && !networkTypeText.trim()) newErrors.networkTypeText = 'اكتب نوع الشبكات';
    }
    if (category === 'maintenance') {
      if (maintenanceType === 'other' && !maintenanceTypeText.trim()) newErrors.maintenanceTypeText = 'اكتب نوع الصيانة';
    }
    if (category === 'furniture') {
      if (furnitureType === 'other' && !furnitureTypeText.trim()) newErrors.furnitureTypeText = 'اكتب نوع الأثاث';
    }
    if (category === 'home_tools') {
      if (homeToolsType === 'other' && !homeToolsTypeText.trim()) newErrors.homeToolsTypeText = 'اكتب نوع الأدوات المنزلية';
    }
    if (category === 'clothes') {
      if (clothesType === 'other' && !clothesTypeText.trim()) newErrors.clothesTypeText = 'اكتب نوع الملابس';
    }
    if (category === 'animals') {
      if (animalType === 'other' && !animalTypeText.trim()) newErrors.animalTypeText = 'اكتب نوع الحيوانات';
    }
    if (category === 'jobs') {
      if (jobType === 'other' && !jobTypeText.trim()) newErrors.jobTypeText = 'اكتب نوع الوظيفة';
    }
    if (category === 'services') {
      if (serviceType === 'other' && !serviceTypeText.trim()) newErrors.serviceTypeText = 'اكتب نوع الخدمة';
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

  const handleLocateMe = () => {
    if (typeof window === 'undefined') return;

    if (!navigator.geolocation) {
      alert('المتصفح لا يدعم تحديد الموقع');
      return;
    }

    // إذا كانت الخريطة مخفية (placeholder) افتحها أولاً
    if (!showMap) setShowMap(true);

    setLocatingMe(true);

    const reverseLabel = async (lat, lng) => {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
          lat
        )}&lon=${encodeURIComponent(lng)}&accept-language=ar`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('reverse failed');
        const data = await res.json();
        const a = data?.address || {};

        const parts = [];
        if (a.road) parts.push(a.road);
        else if (a.street) parts.push(a.street);

        if (a.village) parts.push(a.village);
        else if (a.suburb) parts.push(a.suburb);
        else if (a.neighbourhood) parts.push(a.neighbourhood);
        else if (a.hamlet) parts.push(a.hamlet);

        if (a.city) parts.push(a.city);
        else if (a.town) parts.push(a.town);
        else if (a.county) parts.push(a.county);
        else if (a.state) parts.push(a.state);

        const label = parts.length ? parts.join('، ') : (data?.display_name || '');
        return String(label || '').trim();
      } catch {
        return '';
      }
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = Number(position?.coords?.latitude);
          const lng = Number(position?.coords?.longitude);

          const inYemen =
            lat >= YEMEN_BOUNDS[0][0] &&
            lat <= YEMEN_BOUNDS[1][0] &&
            lng >= YEMEN_BOUNDS[0][1] &&
            lng <= YEMEN_BOUNDS[1][1];

          if (!inYemen) {
            alert('موقعك الحالي خارج اليمن 🇾🇪');
            return;
          }

          const label =
            (await reverseLabel(lat, lng)) || `Lat: ${lat.toFixed(5)} , Lng: ${lng.toFixed(5)}`;

          onPick([lat, lng], label);
        } finally {
          setLocatingMe(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        let message = 'فشل تحديد موقعك';

        if (error?.code === error.PERMISSION_DENIED) {
          message = 'يرجى السماح للمتصفح بالوصول إلى موقعك';
        } else if (error?.code === error.POSITION_UNAVAILABLE) {
          message = 'موقعك غير متاح حالياً';
        } else if (error?.code === error.TIMEOUT) {
          message = 'انتهت مهلة تحديد الموقع';
        }

        alert(message);
        setLocatingMe(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
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

    if (!user) {
      alert('يرجى تسجيل الدخول أولاً');
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

      const selectedGov = govs.find((g) => g.key === govKey);
      const cityToSave = selectedGov ? selectedGov.nameAr : String(city || '').trim();

      const payload = {
title: title.trim(),
    description: desc.trim(),
    city: cityToSave,
    governorateKey: String(govKey || '').trim(),

    // ✅ مهم جدًا: نخزّن key الإنجليزي المطابق لـ Firestore
    category: String(category || '').trim(),

    // ✅ فروع الأقسام (Taxonomy)
    carMake: category === 'cars' ? (carMake || null) : null,
    carMakeText: category === 'cars' && carMake === 'other' ? (carMakeText.trim() || null) : null,

    // carModel: نخزّن key موحد + نص عند اختيار "أخرى" أو عند عدم توفر preset
    carModel:
      category === 'cars'
        ? (carModel && carModel !== 'other'
            ? carModel
            : (carModelText.trim() ? slugKey(carModelText) : null))
        : null,
    carModelText:
      category === 'cars' && (carModel === 'other' || (carModelText.trim() && carModel !== 'other'))
        ? (carModelText.trim() || null)
        : null,

    // بقية الأقسام
    electronicsType: category === 'electronics' ? (electronicsType || null) : null,
    electronicsTypeText: category === 'electronics' && electronicsType === 'other' ? (electronicsTypeText.trim() || null) : null,

    motorcycleBrand: category === 'motorcycles' ? (motorcycleBrand || null) : null,
    motorcycleBrandText: category === 'motorcycles' && motorcycleBrand === 'other' ? (motorcycleBrandText.trim() || null) : null,

    heavyEquipmentType: category === 'heavy_equipment' ? (heavyEquipmentType || null) : null,
    heavyEquipmentTypeText:
      category === 'heavy_equipment' && heavyEquipmentType === 'other' ? (heavyEquipmentTypeText.trim() || null) : null,

    solarType: category === 'solar' ? (solarType || null) : null,
    solarTypeText: category === 'solar' && solarType === 'other' ? (solarTypeText.trim() || null) : null,

    networkType: category === 'networks' ? (networkType || null) : null,
    networkTypeText: category === 'networks' && networkType === 'other' ? (networkTypeText.trim() || null) : null,

    maintenanceType: category === 'maintenance' ? (maintenanceType || null) : null,
    maintenanceTypeText:
      category === 'maintenance' && maintenanceType === 'other' ? (maintenanceTypeText.trim() || null) : null,

    furnitureType: category === 'furniture' ? (furnitureType || null) : null,
    furnitureTypeText: category === 'furniture' && furnitureType === 'other' ? (furnitureTypeText.trim() || null) : null,

    homeToolsType: category === 'home_tools' ? (homeToolsType || null) : null,
    homeToolsTypeText:
      category === 'home_tools' && homeToolsType === 'other' ? (homeToolsTypeText.trim() || null) : null,

    clothesType: category === 'clothes' ? (clothesType || null) : null,
    clothesTypeText: category === 'clothes' && clothesType === 'other' ? (clothesTypeText.trim() || null) : null,

    animalType: category === 'animals' ? (animalType || null) : null,
    animalTypeText: category === 'animals' && animalType === 'other' ? (animalTypeText.trim() || null) : null,

    jobType: category === 'jobs' ? (jobType || null) : null,
    jobTypeText: category === 'jobs' && jobType === 'other' ? (jobTypeText.trim() || null) : null,

    serviceType: category === 'services' ? (serviceType || null) : null,
    serviceTypeText: category === 'services' && serviceType === 'other' ? (serviceTypeText.trim() || null) : null,

    phoneBrand: category === 'phones' ? (phoneBrand || null) : null,
    phoneBrandText: category === 'phones' && phoneBrand === 'other' ? (phoneBrandText.trim() || null) : null,

    dealType: category === 'realestate' ? (dealType || null) : null,
    propertyType: category === 'realestate' ? (propertyType || null) : null,
    propertyTypeText:
      category === 'realestate' && propertyType === 'other' ? (propertyTypeText.trim() || null) : null,

    phone: phone.trim() || null,
    isWhatsapp: !!isWhatsapp,

    priceYER: Number(priceYER),
    originalPrice: Number(price),
    originalCurrency: currency,
    currencyBase: 'YER',

    // ✅ نخزّن أكثر من صيغة لتضمن عمل الخريطة في كل مكان
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

    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      // ✅ لا نضيف حقول المزاد إلا إذا كان الإعلان مزاد فعلاً
      if (auctionEnabled) {
        payload.auctionEnabled = true;
        payload.auctionEndAt = auctionEndAt || null;
        payload.currentBidYER = Number(priceYER);
        payload.bidsCount = 0;
      }

      const docRef = await db.collection('listings').add(payload);
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

  if (loading) {
    return (
      <div className="add-page-layout">
        <div className="loading-container">
          <div className="loading-spinner-large" />
          <p>جاري تحميل الصفحة...</p>
        </div>
      </div>
    );
  }

  if (!loading && !user) {
    return (
      <div className="add-page-layout">
        <div className="auth-required-card">
          <div className="lock-icon-large">🔒</div>
          <h2>تسجيل الدخول مطلوب</h2>
          <p>يجب عليك تسجيل الدخول لإضافة إعلان جديد</p>
          <div className="auth-actions">
            <Link href="/login" className="btn-primary auth-btn">
              تسجيل الدخول
            </Link>
            <Link href="/register" className="btn-secondary auth-btn">
              إنشاء حساب جديد
            </Link>
            <Link href="/" className="back-home-btn">
              ← العودة للرئيسية
            </Link>
          </div>
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

          {/* ✅ استيراد سريع (نص / رابط) */}
          <div className="import-box">
            <div className="import-top">
              <div>
                <div className="import-title">استيراد سريع للإعلان</div>
                <div className="import-subtitle">الصق نص الإعلان من واتساب/فيسبوك أو ضع رابطاً من موقع مفتوح</div>
              </div>

              <div className="import-mode">
                <button
                  type="button"
                  className={`import-mode-btn ${importMode === 'text' ? 'active' : ''}`}
                  onClick={() => setImportMode('text')}
                >
                  لصق نص
                </button>
                <button
                  type="button"
                  className={`import-mode-btn ${importMode === 'url' ? 'active' : ''}`}
                  onClick={() => setImportMode('url')}
                >
                  رابط موقع
                </button>
              </div>
            </div>

            {importMode === 'url' ? (
              <input
                className="form-input"
                value={importInput}
                onChange={(e) => setImportInput(e.target.value)}
                placeholder="الصق رابط الإعلان من موقعك أو أي موقع (روابط فيسبوك/انستقرام غير مدعومة)"
              />
            ) : (
              <textarea
                className="form-textarea"
                value={importInput}
                onChange={(e) => setImportInput(e.target.value)}
                placeholder="الصق نص الإعلان هنا (مثال: تويوتا شاص 2014... السعر... التواصل... المحافظة...)"
                rows={5}
              />
            )}

            <div className="import-actions">
              <button
                type="button"
                className="btn btnPrimary"
                onClick={handleImport}
                disabled={importLoading || !importInput.trim()}
              >
                {importLoading ? 'جاري الاستيراد...' : 'استيراد وملء الحقول'}
              </button>

              <button type="button" className="btn" onClick={clearImport} disabled={importLoading && !importInput}>
                مسح
              </button>
            </div>

            {importError ? <div className="import-error">{importError}</div> : null}

            {Array.isArray(importNotes) && importNotes.length ? (
              <div className="import-notes">
                {importNotes.map((n, idx) => (
                  <div key={idx} className="import-note">• {n}</div>
                ))}
              </div>
            ) : null}

            {importedImageUrls.length ? (
              <div className="import-images">
                <div className="import-images-head">
                  <div>تم العثور على صور: {importedImageUrls.length}</div>
                  <button type="button" className="btn" onClick={tryImportImagesFromUrls}>
                    محاولة استيراد الصور
                  </button>
                </div>
                <div className="import-images-hint">
                  ملاحظة: بعض المواقع تمنع تحميل الصور تلقائياً، إذا لم تنجح العملية ارفع الصور يدويًا.
                </div>
              </div>
            ) : null}
          </div>

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

          {/* المحافظة والقسم */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">
                المحافظة {govsSource === 'fallback' ? '(Fallback)' : ''}
              </label>
              <select
                className={`form-select ${errors.govKey ? 'error' : ''}`}
                value={govKey}
                onChange={(e) => {
                  setGovKey(e.target.value);
                  if (submitAttempted) setErrors((prev) => ({ ...prev, govKey: undefined }));
                }}
                disabled={govsLoading}
              >
                <option value="">{govsLoading ? 'جاري تحميل المحافظات...' : 'اختر المحافظة'}</option>
                {(govs || []).map((g) => (
                  <option key={g.key} value={g.key}>
                    {g.nameAr}
                  </option>
                ))}
              </select>
              {errors.govKey && <div className="form-error">{errors.govKey}</div>}
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
                <option value="" disabled>
                  اختر القسم
                </option>

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


          {/* ✅ فرع القسم (هرمي) */}
          {category === 'cars' && (
            <div className="card" style={{ padding: 12, marginBottom: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>تفاصيل السيارة</div>

              <div className="form-row" style={{ marginBottom: 0 }}>
                <div className="form-group">
                  <label className="form-label required">ماركة السيارة</label>
                  <select
                    className={`form-select ${errors.carMake ? 'error' : ''}`}
                    value={carMake}
                    onChange={(e) => {
                      setCarMake(e.target.value);
                      setCarModel('');
                      setCarModelText('');
                      if (submitAttempted) setErrors((prev) => ({ ...prev, carMake: undefined, carMakeText: undefined, carModelText: undefined }));
                    }}
                  >
                    <option value="" disabled>
                      اختر الماركة
                    </option>
                    {CAR_MAKES.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  {errors.carMake && <div className="form-error">{errors.carMake}</div>}

                  {carMake === 'other' && (
                    <div style={{ marginTop: 10 }}>
                      <input
                        className={`form-input ${errors.carMakeText ? 'error' : ''}`}
                        value={carMakeText}
                        onChange={(e) => {
                          setCarMakeText(e.target.value);
                          if (submitAttempted) setErrors((prev) => ({ ...prev, carMakeText: undefined }));
                        }}
                        placeholder="اكتب الماركة"
                        maxLength={40}
                      />
                      {errors.carMakeText && <div className="form-error">{errors.carMakeText}</div>}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">موديل السيارة (اختياري)</label>

                  {carMake && carMake !== 'other' && carModelsForMake.length > 0 ? (
                    <select
                      className="form-select"
                      value={carModel}
                      onChange={(e) => {
                        setCarModel(e.target.value);
                        if (submitAttempted) setErrors((prev) => ({ ...prev, carModelText: undefined }));
                      }}
                    >
                      <option value="">كل الموديلات</option>
                      {carModelsForMake.map((mm) => (
                        <option key={mm.key} value={mm.key}>
                          {mm.label}
                        </option>
                      ))}
                      <option value="other">أخرى</option>
                    </select>
                  ) : (
                    <input
                      className={`form-input ${errors.carModelText ? 'error' : ''}`}
                      value={carModelText}
                      onChange={(e) => {
                        setCarModelText(e.target.value);
                        setCarModel(e.target.value ? 'other' : '');
                        if (submitAttempted) setErrors((prev) => ({ ...prev, carModelText: undefined }));
                      }}
                      placeholder={carMake ? 'اكتب الموديل (مثال: هايلوكس)' : 'اختر الماركة أولاً'}
                      disabled={!carMake}
                      maxLength={50}
                    />
                  )}

                  {carMake && carMake !== 'other' && carModelsForMake.length > 0 && carModel === 'other' && (
                    <div style={{ marginTop: 10 }}>
                      <input
                        className={`form-input ${errors.carModelText ? 'error' : ''}`}
                        value={carModelText}
                        onChange={(e) => {
                          setCarModelText(e.target.value);
                          if (submitAttempted) setErrors((prev) => ({ ...prev, carModelText: undefined }));
                        }}
                        placeholder="اكتب الموديل"
                        maxLength={50}
                      />
                      {errors.carModelText && <div className="form-error">{errors.carModelText}</div>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {category === 'phones' && (
            <div className="form-group">
              <label className="form-label required">ماركة الجوال</label>
              <select
                className={`form-select ${errors.phoneBrand ? 'error' : ''}`}
                value={phoneBrand}
                onChange={(e) => {
                  setPhoneBrand(e.target.value);
                  if (submitAttempted)
                    setErrors((prev) => ({ ...prev, phoneBrand: undefined, phoneBrandText: undefined }));
                }}
              >
                <option value="" disabled>
                  اختر الماركة
                </option>
                {PHONE_BRANDS.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
              {errors.phoneBrand && <div className="form-error">{errors.phoneBrand}</div>}

              {phoneBrand === 'other' && (
                <div style={{ marginTop: 10 }}>
                  <input
                    className={`form-input ${errors.phoneBrandText ? 'error' : ''}`}
                    value={phoneBrandText}
                    onChange={(e) => {
                      setPhoneBrandText(e.target.value);
                      if (submitAttempted) setErrors((prev) => ({ ...prev, phoneBrandText: undefined }));
                    }}
                    placeholder="اكتب ماركة الجوال"
                    maxLength={40}
                  />
                  {errors.phoneBrandText && <div className="form-error">{errors.phoneBrandText}</div>}
                </div>
              )}
            </div>
          )}

          {category === 'realestate' && (
            <div className="card" style={{ padding: 12, marginBottom: 12, border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>تفاصيل العقار</div>

              {/* بيع / إيجار */}
              <div className="form-row" style={{ marginBottom: 0 }}>
                <div className="form-group">
                  <label className="form-label required">نوع العملية</label>
                  <select
                    className={`form-select ${errors.dealType ? 'error' : ''}`}
                    value={dealType}
                    onChange={(e) => {
                      setDealType(e.target.value);
                      setPropertyType('');
                      setPropertyTypeText('');
                      if (submitAttempted)
                        setErrors((prev) => ({ ...prev, dealType: undefined, propertyType: undefined, propertyTypeText: undefined }));
                    }}
                  >
                    <option value="" disabled>
                      اختر (بيع / إيجار)
                    </option>
                    {DEAL_TYPES.map((d) => (
                      <option key={d.key} value={d.key}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  {errors.dealType && <div className="form-error">{errors.dealType}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label required">نوع العقار</label>
                  <select
                    className={`form-select ${errors.propertyType ? 'error' : ''}`}
                    value={propertyType}
                    onChange={(e) => {
                      setPropertyType(e.target.value);
                      if (submitAttempted)
                        setErrors((prev) => ({ ...prev, propertyType: undefined, propertyTypeText: undefined }));
                    }}
                    disabled={!dealType}
                    title={!dealType ? 'اختر بيع/إيجار أولاً' : ''}
                  >
                    <option value="" disabled>
                      اختر نوع العقار
                    </option>
                    {PROPERTY_TYPES.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  {errors.propertyType && <div className="form-error">{errors.propertyType}</div>}

                  {propertyType === 'other' && (
                    <div style={{ marginTop: 10 }}>
                      <input
                        className={`form-input ${errors.propertyTypeText ? 'error' : ''}`}
                        value={propertyTypeText}
                        onChange={(e) => {
                          setPropertyTypeText(e.target.value);
                          if (submitAttempted) setErrors((prev) => ({ ...prev, propertyTypeText: undefined }));
                        }}
                        placeholder="اكتب نوع العقار"
                        maxLength={50}
                      />
                      {errors.propertyTypeText && <div className="form-error">{errors.propertyTypeText}</div>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ✅ فروع الأقسام الأخرى (اختياري) */}
          {category === 'electronics' && (
            <div className="form-group">
              <label className="form-label">نوع الإلكترونيات</label>
              <select
                className="form-select"
                value={electronicsType}
                onChange={(e) => {
                  setElectronicsType(e.target.value);
                  if (submitAttempted) setErrors((prev) => ({ ...prev, electronicsTypeText: undefined }));
                }}
              >
                <option value="">اختر النوع (اختياري)</option>
                {ELECTRONICS_TYPES.map((x) => (
                  <option key={x.key} value={x.key}>
                    {x.label}
                  </option>
                ))}
              </select>

              {electronicsType === 'other' && (
                <div style={{ marginTop: 10 }}>
                  <input
                    className={`form-input ${errors.electronicsTypeText ? 'error' : ''}`}
                    value={electronicsTypeText}
                    onChange={(e) => {
                      setElectronicsTypeText(e.target.value);
                      if (submitAttempted) setErrors((prev) => ({ ...prev, electronicsTypeText: undefined }));
                    }}
                    placeholder="اكتب النوع"
                    maxLength={60}
                  />
                  {errors.electronicsTypeText && <div className="form-error">{errors.electronicsTypeText}</div>}
                </div>
              )}
            </div>
          )}

          {category === 'motorcycles' && (
            <div className="form-group">
              <label className="form-label">ماركة الدراجة</label>
              <select
                className="form-select"
                value={motorcycleBrand}
                onChange={(e) => {
                  setMotorcycleBrand(e.target.value);
                  if (submitAttempted) setErrors((prev) => ({ ...prev, motorcycleBrandText: undefined }));
                }}
              >
                <option value="">اختر الماركة (اختياري)</option>
                {MOTORCYCLE_BRANDS.map((x) => (
                  <option key={x.key} value={x.key}>
                    {x.label}
                  </option>
                ))}
              </select>

              {motorcycleBrand === 'other' && (
                <div style={{ marginTop: 10 }}>
                  <input
                    className={`form-input ${errors.motorcycleBrandText ? 'error' : ''}`}
                    value={motorcycleBrandText}
                    onChange={(e) => {
                      setMotorcycleBrandText(e.target.value);
                      if (submitAttempted) setErrors((prev) => ({ ...prev, motorcycleBrandText: undefined }));
                    }}
                    placeholder="اكتب الماركة"
                    maxLength={60}
                  />
                  {errors.motorcycleBrandText && <div className="form-error">{errors.motorcycleBrandText}</div>}
                </div>
              )}
            </div>
          )}

          {category === 'heavy_equipment' && (
            <div className="form-group">
              <label className="form-label">نوع المعدة</label>
              <select
                className="form-select"
                value={heavyEquipmentType}
                onChange={(e) => {
                  setHeavyEquipmentType(e.target.value);
                  if (submitAttempted) setErrors((prev) => ({ ...prev, heavyEquipmentTypeText: undefined }));
                }}
              >
                <option value="">اختر النوع (اختياري)</option>
                {HEAVY_EQUIPMENT_TYPES.map((x) => (
                  <option key={x.key} value={x.key}>
                    {x.label}
                  </option>
                ))}
              </select>

              {heavyEquipmentType === 'other' && (
                <div style={{ marginTop: 10 }}>
                  <input
                    className={`form-input ${errors.heavyEquipmentTypeText ? 'error' : ''}`}
                    value={heavyEquipmentTypeText}
                    onChange={(e) => {
                      setHeavyEquipmentTypeText(e.target.value);
                      if (submitAttempted) setErrors((prev) => ({ ...prev, heavyEquipmentTypeText: undefined }));
                    }}
                    placeholder="اكتب النوع"
                    maxLength={60}
                  />
                  {errors.heavyEquipmentTypeText && <div className="form-error">{errors.heavyEquipmentTypeText}</div>}
                </div>
              )}
            </div>
          )}

          {category === 'solar' && (
            <div className="form-group">
              <label className="form-label">فئة الطاقة الشمسية</label>
              <select
                className="form-select"
                value={solarType}
                onChange={(e) => {
                  setSolarType(e.target.value);
                  if (submitAttempted) setErrors((prev) => ({ ...prev, solarTypeText: undefined }));
                }}
              >
                <option value="">اختر الفئة (اختياري)</option>
                {SOLAR_TYPES.map((x) => (
                  <option key={x.key} value={x.key}>
                    {x.label}
                  </option>
                ))}
              </select>

              {solarType === 'other' && (
                <div style={{ marginTop: 10 }}>
                  <input
                    className={`form-input ${errors.solarTypeText ? 'error' : ''}`}
                    value={solarTypeText}
                    onChange={(e) => {
                      setSolarTypeText(e.target.value);
                      if (submitAttempted) setErrors((prev) => ({ ...prev, solarTypeText: undefined }));
                    }}
                    placeholder="اكتب الفئة"
                    maxLength={60}
                  />
                  {errors.solarTypeText && <div className="form-error">{errors.solarTypeText}</div>}
                </div>
              )}
            </div>
          )}

          {category === 'networks' && (
            <div className="form-group">
              <label className="form-label">فئة الشبكات</label>
              <select
                className="form-select"
                value={networkType}
                onChange={(e) => {
                  setNetworkType(e.target.value);
                  if (submitAttempted) setErrors((prev) => ({ ...prev, networkTypeText: undefined }));
                }}
              >
                <option value="">اختر الفئة (اختياري)</option>
                {NETWORK_TYPES.map((x) => (
                  <option key={x.key} value={x.key}>
                    {x.label}
                  </option>
                ))}
              </select>

              {networkType === 'other' && (
                <div style={{ marginTop: 10 }}>
                  <input
                    className={`form-input ${errors.networkTypeText ? 'error' : ''}`}
                    value={networkTypeText}
                    onChange={(e) => {
                      setNetworkTypeText(e.target.value);
                      if (submitAttempted) setErrors((prev) => ({ ...prev, networkTypeText: undefined }));
                    }}
                    placeholder="اكتب الفئة"
                    maxLength={60}
                  />
                  {errors.networkTypeText && <div className="form-error">{errors.networkTypeText}</div>}
                </div>
              )}
            </div>
          )}

          {category === 'maintenance' && (
            <div className="form-group">
              <label className="form-label">نوع الصيانة</label>
              <select
                className="form-select"
                value={maintenanceType}
                onChange={(e) => {
                  setMaintenanceType(e.target.value);
                  if (submitAttempted) setErrors((prev) => ({ ...prev, maintenanceTypeText: undefined }));
                }}
              >
                <option value="">اختر النوع (اختياري)</option>
                {MAINTENANCE_TYPES.map((x) => (
                  <option key={x.key} value={x.key}>
                    {x.label}
                  </option>
                ))}
              </select>

              {maintenanceType === 'other' && (
                <div style={{ marginTop: 10 }}>
                  <input
                    className={`form-input ${errors.maintenanceTypeText ? 'error' : ''}`}
                    value={maintenanceTypeText}
                    onChange={(e) => {
                      setMaintenanceTypeText(e.target.value);
                      if (submitAttempted) setErrors((prev) => ({ ...prev, maintenanceTypeText: undefined }));
                    }}
                    placeholder="اكتب النوع"
                    maxLength={60}
                  />
                  {errors.maintenanceTypeText && <div className="form-error">{errors.maintenanceTypeText}</div>}
                </div>
              )}
            </div>
          )}

          {category === 'furniture' && (
            <div className="form-group">
              <label className="form-label">نوع الأثاث</label>
              <select
                className="form-select"
                value={furnitureType}
                onChange={(e) => {
                  setFurnitureType(e.target.value);
                  if (submitAttempted) setErrors((prev) => ({ ...prev, furnitureTypeText: undefined }));
                }}
              >
                <option value="">اختر النوع (اختياري)</option>
                {FURNITURE_TYPES.map((x) => (
                  <option key={x.key} value={x.key}>
                    {x.label}
                  </option>
                ))}
              </select>

              {furnitureType === 'other' && (
                <div style={{ marginTop: 10 }}>
                  <input
                    className={`form-input ${errors.furnitureTypeText ? 'error' : ''}`}
                    value={furnitureTypeText}
                    onChange={(e) => {
                      setFurnitureTypeText(e.target.value);
                      if (submitAttempted) setErrors((prev) => ({ ...prev, furnitureTypeText: undefined }));
                    }}
                    placeholder="اكتب النوع"
                    maxLength={60}
                  />
                  {errors.furnitureTypeText && <div className="form-error">{errors.furnitureTypeText}</div>}
                </div>
              )}
            </div>
          )}

          {category === 'home_tools' && (
            <div className="form-group">
              <label className="form-label">نوع الأدوات المنزلية</label>
              <select
                className="form-select"
                value={homeToolsType}
                onChange={(e) => {
                  setHomeToolsType(e.target.value);
                  if (submitAttempted) setErrors((prev) => ({ ...prev, homeToolsTypeText: undefined }));
                }}
              >
                <option value="">اختر النوع (اختياري)</option>
                {HOME_TOOLS_TYPES.map((x) => (
                  <option key={x.key} value={x.key}>
                    {x.label}
                  </option>
                ))}
              </select>

              {homeToolsType === 'other' && (
                <div style={{ marginTop: 10 }}>
                  <input
                    className={`form-input ${errors.homeToolsTypeText ? 'error' : ''}`}
                    value={homeToolsTypeText}
                    onChange={(e) => {
                      setHomeToolsTypeText(e.target.value);
                      if (submitAttempted) setErrors((prev) => ({ ...prev, homeToolsTypeText: undefined }));
                    }}
                    placeholder="اكتب النوع"
                    maxLength={60}
                  />
                  {errors.homeToolsTypeText && <div className="form-error">{errors.homeToolsTypeText}</div>}
                </div>
              )}
            </div>
          )}

          {category === 'clothes' && (
            <div className="form-group">
              <label className="form-label">نوع الملابس</label>
              <select
                className="form-select"
                value={clothesType}
                onChange={(e) => {
                  setClothesType(e.target.value);
                  if (submitAttempted) setErrors((prev) => ({ ...prev, clothesTypeText: undefined }));
                }}
              >
                <option value="">اختر النوع (اختياري)</option>
                {CLOTHES_TYPES.map((x) => (
                  <option key={x.key} value={x.key}>
                    {x.label}
                  </option>
                ))}
              </select>

              {clothesType === 'other' && (
                <div style={{ marginTop: 10 }}>
                  <input
                    className={`form-input ${errors.clothesTypeText ? 'error' : ''}`}
                    value={clothesTypeText}
                    onChange={(e) => {
                      setClothesTypeText(e.target.value);
                      if (submitAttempted) setErrors((prev) => ({ ...prev, clothesTypeText: undefined }));
                    }}
                    placeholder="اكتب النوع"
                    maxLength={60}
                  />
                  {errors.clothesTypeText && <div className="form-error">{errors.clothesTypeText}</div>}
                </div>
              )}
            </div>
          )}

          {category === 'animals' && (
            <div className="form-group">
              <label className="form-label">نوع الحيوانات</label>
              <select
                className="form-select"
                value={animalType}
                onChange={(e) => {
                  setAnimalType(e.target.value);
                  if (submitAttempted) setErrors((prev) => ({ ...prev, animalTypeText: undefined }));
                }}
              >
                <option value="">اختر النوع (اختياري)</option>
                {ANIMAL_TYPES.map((x) => (
                  <option key={x.key} value={x.key}>
                    {x.label}
                  </option>
                ))}
              </select>

              {animalType === 'other' && (
                <div style={{ marginTop: 10 }}>
                  <input
                    className={`form-input ${errors.animalTypeText ? 'error' : ''}`}
                    value={animalTypeText}
                    onChange={(e) => {
                      setAnimalTypeText(e.target.value);
                      if (submitAttempted) setErrors((prev) => ({ ...prev, animalTypeText: undefined }));
                    }}
                    placeholder="اكتب النوع"
                    maxLength={60}
                  />
                  {errors.animalTypeText && <div className="form-error">{errors.animalTypeText}</div>}
                </div>
              )}
            </div>
          )}

          {category === 'jobs' && (
            <div className="form-group">
              <label className="form-label">نوع الوظيفة</label>
              <select
                className="form-select"
                value={jobType}
                onChange={(e) => {
                  setJobType(e.target.value);
                  if (submitAttempted) setErrors((prev) => ({ ...prev, jobTypeText: undefined }));
                }}
              >
                <option value="">اختر النوع (اختياري)</option>
                {JOB_TYPES.map((x) => (
                  <option key={x.key} value={x.key}>
                    {x.label}
                  </option>
                ))}
              </select>

              {jobType === 'other' && (
                <div style={{ marginTop: 10 }}>
                  <input
                    className={`form-input ${errors.jobTypeText ? 'error' : ''}`}
                    value={jobTypeText}
                    onChange={(e) => {
                      setJobTypeText(e.target.value);
                      if (submitAttempted) setErrors((prev) => ({ ...prev, jobTypeText: undefined }));
                    }}
                    placeholder="اكتب النوع"
                    maxLength={60}
                  />
                  {errors.jobTypeText && <div className="form-error">{errors.jobTypeText}</div>}
                </div>
              )}
            </div>
          )}

          {category === 'services' && (
            <div className="form-group">
              <label className="form-label">نوع الخدمة</label>
              <select
                className="form-select"
                value={serviceType}
                onChange={(e) => {
                  setServiceType(e.target.value);
                  if (submitAttempted) setErrors((prev) => ({ ...prev, serviceTypeText: undefined }));
                }}
              >
                <option value="">اختر النوع (اختياري)</option>
                {SERVICE_TYPES.map((x) => (
                  <option key={x.key} value={x.key}>
                    {x.label}
                  </option>
                ))}
              </select>

              {serviceType === 'other' && (
                <div style={{ marginTop: 10 }}>
                  <input
                    className={`form-input ${errors.serviceTypeText ? 'error' : ''}`}
                    value={serviceTypeText}
                    onChange={(e) => {
                      setServiceTypeText(e.target.value);
                      if (submitAttempted) setErrors((prev) => ({ ...prev, serviceTypeText: undefined }));
                    }}
                    placeholder="اكتب النوع"
                    maxLength={60}
                  />
                  {errors.serviceTypeText && <div className="form-error">{errors.serviceTypeText}</div>}
                </div>
              )}
            </div>
          )}

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
              <label className="form-label required">رقم التواصل</label>
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
            <div className="map-header-text">
              <h2 className="form-section-title">
                <span className="map-icon">📍</span>
                موقع الإعلان
              </h2>
              <p className="map-subtitle">اسحب المؤشر لتحديد الموقع الدقيق</p>
            </div>

            <div className="map-header-actions">
              <button
                type="button"
                className="btn btnPrimary locate-me-btn"
                onClick={handleLocateMe}
                disabled={locatingMe}
                aria-label="تحديد موقعي الحالي"
              >
                {locatingMe ? '⌛ جاري التحديد...' : '📍 تحديد موقعي'}
              </button>
            </div>
          </div>

          <div className="map-wrapper">
            {!showMap ? (
              <div className="map-placeholder" style={{
                padding: '60px 20px',
                textAlign: 'center',
                background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                borderRadius: '12px',
                border: '2px dashed #0ea5e9'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }} role="img" aria-label="أيقونة الخريطة">🗺️</div>
                <button
                  type="button"
                  onClick={() => setShowMap(true)}
                  className="btn btnPrimary"
                  style={{
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                  aria-label="تحميل الخريطة لتحديد الموقع"
                >
                  <span role="img" aria-label="أيقونة موقع">📍</span> تحميل الخريطة
                </button>
                <p style={{ marginTop: '12px', color: '#64748b', fontSize: '14px' }}>
                  اضغط لتحديد موقع الإعلان على الخريطة
                </p>
              </div>
            ) : (
              <LocationPicker value={coords} onChange={onPick} showLocateButton={false} />
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

        .cats-note{
          margin: 10px 0 18px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid #fde68a;
          background: #fffbeb;
          color: #92400e;
          font-weight: 700;
          font-size: 13px;
          line-height: 1.6;
        }

        .add-page-header {
          text-align: center;
          padding: 30px 20px;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          margin-bottom: 20px;
          border-radius: 20px;
          box-shadow: 0 8px 25px rgba(79, 70, 229, 0.2);
        }

        .add-page-header h1 {
          font-size: 32px;
          margin-bottom: 10px;
          font-weight: 900;
        }

        .form-tips {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 15px;
          margin-bottom: 30px;
          padding: 15px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

        .tip-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 15px;
          background: white;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #475569;
          border: 1px solid #e2e8f0;
        }

        .tip-icon {
          font-size: 16px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 40px;
        }

        @media (max-width: 1024px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
        }

        .form-container {
          background: white;
          border-radius: 20px;
          padding: 30px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
        }

        .form-section-title {
          font-size: 22px;
          color: #1e293b;
          margin-bottom: 25px;
          padding-bottom: 15px;
          border-bottom: 2px solid #f1f5f9;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }

        .form-label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #1e293b;
          font-size: 15px;
        }

        .form-label.required::after {
          content: ' *';
          color: #dc2626;
        }

        .form-input,
        .form-textarea,
        .form-select {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 16px;
          transition: all 0.2s ease;
          background: #f8fafc;
          color: #1e293b;
        }

        .form-input:focus,
        .form-textarea:focus,
        .form-select:focus {
          outline: none;
          border-color: #4f46e5;
          background: white;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .form-input.error,
        .form-textarea.error,
        .form-select.error {
          border-color: #dc2626;
          background: #fef2f2;
        }

        .form-helper {
          display: flex;
          justify-content: space-between;
          margin-top: 6px;
          font-size: 13px;
          color: #64748b;
        }

        .char-count {
          font-weight: 500;
        }

        .form-error {
          color: #dc2626;
          font-size: 13px;
          margin-top: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .form-error::before {
          content: '⚠️';
        }

        .currency-selector {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .currency-btn {
          padding: 10px 20px;
          border: 2px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 8px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
          flex: 1;
          text-align: center;
          min-width: 80px;
        }

        .currency-btn.active {
          background: #4f46e5;
          color: white;
          border-color: #4f46e5;
        }

        .price-conversion {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          padding: 15px 20px;
          border-radius: 10px;
          margin: 20px 0;
          border: 1px solid #e2e8f0;
        }

        .conversion-label {
          display: block;
          font-weight: 600;
          color: #475569;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .converted-prices {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .converted-price {
          color: #1e293b;
          font-size: 15px;
        }

        .converted-price strong {
          color: #4f46e5;
        }

        .communication-toggle {
          display: flex;
          gap: 10px;
          margin-top: 8px;
        }

        .toggle-btn {
          flex: 1;
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 8px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .toggle-btn.active {
          background: #4f46e5;
          color: white;
          border-color: #4f46e5;
        }

        .toggle-icon {
          font-size: 18px;
        }

        .image-upload-input {
          display: none;
        }

        .image-upload-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
          background: #f8fafc;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }

        .upload-icon {
          font-size: 40px;
          margin-bottom: 10px;
          opacity: 0.6;
        }

        .upload-hint {
          font-size: 13px;
          color: #94a3b8;
          margin-top: 5px;
        }

        .image-previews {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 10px;
          margin-top: 15px;
        }

        .image-preview {
          position: relative;
          aspect-ratio: 1;
          border-radius: 8px;
          overflow: hidden;
          border: 2px solid #e2e8f0;
        }

        .preview-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .remove-image-btn {
          position: absolute;
          top: 5px;
          left: 5px;
          width: 24px;
          height: 24px;
          background: rgba(239, 68, 68, 0.9);
          color: white;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: bold;
        }

        .image-number {
          position: absolute;
          bottom: 5px;
          left: 5px;
          background: rgba(0, 0, 0, 0.6);
          color: white;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 12px;
        }

        .auction-section {
          background: #f8fafc;
          padding: 20px;
          border-radius: 12px;
          margin-top: 30px;
          border: 1px solid #e2e8f0;
        }

        .auction-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .switch {
          position: relative;
          display: inline-block;
          width: 60px;
          height: 30px;
        }

        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #cbd5e1;
          transition: 0.4s;
          border-radius: 34px;
        }

        .slider:before {
          position: absolute;
          content: '';
          height: 22px;
          width: 22px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: 0.4s;
          border-radius: 50%;
        }

        input:checked + .slider {
          background-color: #4f46e5;
        }

        input:checked + .slider:before {
          transform: translateX(30px);
        }

        .map-container {
          background: white;
          border-radius: 20px;
          padding: 30px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
        }

        .map-wrapper {
          flex: 1;
          min-height: 400px;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          margin-bottom: 20px;
        }

        .mobile-submit-section {
          display: none;
          margin-top: 30px;
        }

        .desktop-submit-section {
          margin-top: 40px;
          padding-top: 30px;
          border-top: 2px solid #f1f5f9;
        }

        @media (max-width: 1024px) {
          .mobile-submit-section { display: block; }
          .desktop-submit-section { display: none; }
        }

        .submit-btn-large {
          width: 100%;
          max-width: 400px;
          padding: 18px 30px;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .submit-btn-large:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .cancel-link {
          color: #64748b;
          text-decoration: none;
          font-weight: 700;
        }

        .final-notes, .form-notes{
          margin-top: 20px;
          padding: 15px;
          background: #f8fafc;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
        }

        .note-item {
          color: #475569;
          font-size: 14px;
          margin: 8px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          gap: 20px;
        }

        .loading-spinner-large {
          width: 60px;
          height: 60px;
          border: 4px solid #f1f5f9;
          border-top-color: #4f46e5;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .loading-spinner-small {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .auth-required-card {
          max-width: 500px;
          margin: 50px auto;
          background: white;
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          text-align: center;
          border: 1px solid #e2e8f0;
        }

        .lock-icon-large {
          font-size: 70px;
          margin-bottom: 20px;
          opacity: 0.7;
        }

        .auth-actions {
          display: flex;
          flex-direction: column;
          gap: 15px;
          margin-top: 25px;
        }

        .auth-btn {
          padding: 14px;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 700;
          text-align: center;
        }

        .btn-primary.auth-btn {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
        }

        .btn-secondary.auth-btn {
          background: #f8fafc;
          color: #4f46e5;
          border: 2px solid #e2e8f0;
        }

        .back-home-btn {
          color: #64748b;
          text-decoration: none;
          font-size: 14px;
          margin-top: 10px;
          display: inline-block;
        }

        @media (max-width: 768px) {
          .add-page-header { padding: 25px 15px; border-radius: 16px; }
          .add-page-header h1 { font-size: 24px; }
          .form-container, .map-container { padding: 20px; border-radius: 16px; }
          .form-section-title { font-size: 18px; }
          .currency-btn { padding: 8px 12px; font-size: 14px; }
        }

        @media (max-width: 480px) {
          .form-row { grid-template-columns: 1fr; gap: 15px; }
          .currency-selector { flex-direction: column; }
          .communication-toggle { flex-direction: column; }
          .image-previews { grid-template-columns: repeat(3, 1fr); }
        }
      
          /* ===== Import box ===== */
          .import-box{
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            padding: 14px;
            margin: 0 0 16px 0;
          }
          .import-top{
            display:flex;
            align-items:flex-start;
            justify-content:space-between;
            gap: 12px;
            margin-bottom: 10px;
          }
          .import-title{
            font-weight: 800;
            font-size: 15px;
            margin-bottom: 2px;
          }
          .import-subtitle{
            color: #64748b;
            font-size: 13px;
          }
          .import-mode{
            display:flex;
            gap: 8px;
            flex-wrap: wrap;
          }
          .import-mode-btn{
            border: 1px solid #e5e7eb;
            background: #f8fafc;
            padding: 8px 10px;
            border-radius: 12px;
            cursor: pointer;
            font-size: 13px;
          }
          .import-mode-btn.active{
            background: #0f172a;
            color: #fff;
            border-color: #0f172a;
          }
          .import-actions{
            display:flex;
            gap: 10px;
            margin-top: 10px;
            flex-wrap: wrap;
          }
          .import-error{
            margin-top: 10px;
            background: #fff1f2;
            border: 1px solid #fecdd3;
            color: #9f1239;
            padding: 10px 12px;
            border-radius: 12px;
            font-size: 13px;
          }
          .import-notes{
            margin-top: 10px;
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            color: #166534;
            padding: 10px 12px;
            border-radius: 12px;
            font-size: 13px;
          }
          .import-note{ margin: 4px 0; }
          .import-images{
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px dashed #e5e7eb;
          }
          .import-images-head{
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap: 10px;
            flex-wrap: wrap;
            font-size: 13px;
          }
          .import-images-hint{
            margin-top: 6px;
            color: #64748b;
            font-size: 12px;
          }


        /* ✅ زر تحديد موقعي في صفحة إضافة الإعلان */
        .map-header{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap: 16px;
          margin-bottom: 16px;
        }
        .map-header-text{ flex: 1; min-width: 0; }
        .map-header-actions{ display:flex; align-items:center; }
        .locate-me-btn{
          padding: 12px 18px;
          border-radius: 12px;
          font-weight: 900;
          white-space: nowrap;
        }
        @media (max-width: 640px) {
          .map-header{ flex-direction: column; align-items: stretch; }
          .map-header-actions{ justify-content: stretch; }
          .locate-me-btn{ width: 100%; }
        }
`}</style>
    </div>
  );
}
