'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// ✅ Taxonomy (تصنيف هرمي للفروع)
import {
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
  getMotorcycleModelsByBrand,
} from '@/lib/taxonomy';

import { db, firebase, storage } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';
const LocationPicker = dynamic(() => import('@/components/Map/LocationPicker'), { ssr: false });

// ✅ إيميلات المدراء (نفس الهيدر)
const ADMIN_EMAILS = ['mansouralbarout@gmail.com', 'aboramez965@gmail.com'];

const MAX_IMAGES = 10;

// ✅ الأقسام الافتراضية (Fallback) — لازم تطابق مفاتيح Firestore والتصنيف
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
  { slug: 'animals', name: 'حيوانات' },
  { slug: 'jobs', name: 'وظائف' },
  { slug: 'services', name: 'خدمات' },
  { slug: 'other', name: 'أخرى' },
];

const DEFAULT_EXCHANGE = {
  // تقدر تغيّرها من .env.local (قيم تقريبية افتراضية)
  SAR_TO_YER: Number(process.env.NEXT_PUBLIC_SAR_TO_YER || process.env.NEXT_PUBLIC_RATE_SAR_TO_YER || 600),
  USD_TO_YER: Number(process.env.NEXT_PUBLIC_USD_TO_YER || process.env.NEXT_PUBLIC_RATE_USD_TO_YER || 1500),
};

function toYERLocal(amount, cur) {
  const n = Number(String(amount ?? '').replace(/,/g, ''));
  if (!isFinite(n) || n <= 0) return 0;
  if (cur === 'YER') return n;
  if (cur === 'SAR') return n * DEFAULT_EXCHANGE.SAR_TO_YER;
  if (cur === 'USD') return n * DEFAULT_EXCHANGE.USD_TO_YER;
  return n;
}

function normalizeCatKey(v) {
  const raw = String(v || '').trim();
  if (!raw) return '';
  const lowered = raw.toLowerCase();
  const norm = lowered.replace(/\s+/g, '_').replace(/-+/g, '_').replace(/__+/g, '_');

  const map = {
    real_estate: 'realestate',
    'real estate': 'realestate',
    realestate: 'realestate',
    cars: 'cars',
    car: 'cars',
    phones: 'phones',
    phone: 'phones',
    mobiles: 'phones',
    mobile: 'phones',

    // عربي
    عقارات: 'realestate',
    العقارات: 'realestate',
    سيارات: 'cars',
    السيارات: 'cars',
    جوالات: 'phones',
    الجوالات: 'phones',
    موبايلات: 'phones',
  };

  return map[norm] || map[raw] || norm;
}

const slugKey = (v) =>
  String(v || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_')
    .replace(/__+/g, '_')
    .replace(/[^a-z0-9_\u0600-\u06FF]/g, '')
    .slice(0, 60);

export default function EditListingPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const userEmail = user?.email ? String(user.email).toLowerCase() : null;
  const isAdmin = !!userEmail && ADMIN_EMAILS.includes(userEmail);

  const [docLoading, setDocLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [data, setData] = useState(null);
  const isOwner = !!user?.uid && !!data?.userId && user.uid === data.userId;
  const canEdit = !!user && (isAdmin || isOwner);

  // ====== Form State ======
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('solar');

  // ✅ أقسام (من Firestore إن وجدت) + Fallback
  const [cats, setCats] = useState(DEFAULT_CATEGORIES);
  const [catsLoading, setCatsLoading] = useState(true);
  const [catsSource, setCatsSource] = useState('loading'); // firestore | fallback | loading

  // ✅ فروع الأقسام (هرمية)
  const [carMake, setCarMake] = useState('');
  const [carMakeText, setCarMakeText] = useState('');
  const [phoneBrand, setPhoneBrand] = useState('');
  const [phoneBrandText, setPhoneBrandText] = useState('');
  const [dealType, setDealType] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [propertyTypeText, setPropertyTypeText] = useState('');

  // ✅ cars: موديل (اختياري لكنه مهم للفلترة)
  const [carModel, setCarModel] = useState('');
  const [carModelText, setCarModelText] = useState('');

  // ✅ بقية الأقسام (اختياري لتحسين البحث/الفلترة)
  const [electronicsType, setElectronicsType] = useState('');
  const [electronicsTypeText, setElectronicsTypeText] = useState('');

  const [motorcycleBrand, setMotorcycleBrand] = useState('');
  const [motorcycleBrandText, setMotorcycleBrandText] = useState('');
  const [motorcycleModel, setMotorcycleModel] = useState('');
  const [motorcycleModelText, setMotorcycleModelText] = useState('');

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

  // ✅ لتصفير الفروع فقط عند تغيير القسم "بعد التحميل"
  const [didInitCategory, setDidInitCategory] = useState(false);

  const [phone, setPhone] = useState('');
  const [isWhatsapp, setIsWhatsapp] = useState(true);

  const [currency, setCurrency] = useState('YER');
  const [price, setPrice] = useState('');

  const [coords, setCoords] = useState(null);
  const [locationLabel, setLocationLabel] = useState('');

  // صور موجودة + صور جديدة
  const [existingImages, setExistingImages] = useState([]); // urls
  const [removedExisting, setRemovedExisting] = useState([]); // urls to delete
  const [newImages, setNewImages] = useState([]); // File[]
  const [newPreviews, setNewPreviews] = useState([]); // dataUrl[]

  // حالة الإعلان (اختياري)
  const [status, setStatus] = useState('active'); // active | sold

  const [errors, setErrors] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // ✅ تحميل الأقسام (من Firestore إن توفر، وإلا Fallback)
  useEffect(() => {
    let unsub = null;

    try {
      unsub = db.collection('categories').onSnapshot(
        (snap) => {
          const arr = snap.docs
            .map((doc) => {
              const d = doc.data() || {};
              const slug = normalizeCatKey(d.slug || d.key || d.id || doc.id);
              const name = String(d.name || d.label || slug || '').trim();
              const active = d.active !== false;
              if (!slug || !name || !active) return null;
              return { slug, name };
            })
            .filter(Boolean);

          // إزالة التكرار
          const uniq = [];
          for (const c of arr) {
            if (!uniq.some((x) => x.slug === c.slug)) uniq.push(c);
          }

          uniq.sort((a, b) => a.name.localeCompare(b.name, 'ar'));

          if (uniq.length) {
            setCats(uniq);
            setCatsSource('firestore');
          } else {
            setCats(DEFAULT_CATEGORIES);
            setCatsSource('fallback');
          }
          setCatsLoading(false);
        },
        (err) => {
          console.warn('Categories snapshot failed:', err);
          setCats(DEFAULT_CATEGORIES);
          setCatsSource('fallback');
          setCatsLoading(false);
        }
      );
    } catch (e) {
      console.warn('Categories init failed:', e);
      setCats(DEFAULT_CATEGORIES);
      setCatsSource('fallback');
      setCatsLoading(false);
    }

    return () => {
      try {
        if (unsub) unsub();
      } catch {}
    };
  }, []);

  // ✅ تأكد أن قيمة القسم مطابقة للقائمة (تطبيع + Fallback)
  useEffect(() => {
    if (catsLoading) return;

    const norm = normalizeCatKey(category);
    if (!norm) return;

    const exists = cats.some((x) => x.slug === norm);
    if (!exists) {
      if (category !== 'other') setCategory('other');
      return;
    }
    if (category !== norm) setCategory(norm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catsLoading, cats, category]);

  const catKey = useMemo(() => normalizeCatKey(category), [category]);

  const carModelsForMake = useMemo(() => {
    const mk = String(carMake || '').trim();
    if (!mk || mk === 'other') return [];
    const arr = CAR_MODELS_BY_MAKE?.[mk];
    return Array.isArray(arr) ? arr : [];
  }, [carMake]);

  // ✅ حساب موديلات الدراجات النارية
  const motorcycleModelsForBrand = useMemo(() => {
    const brand = String(motorcycleBrand || '').trim();
    if (!brand || brand === 'other') return [];
    return getMotorcycleModelsByBrand(brand);
  }, [motorcycleBrand]);

  // ====== Load doc ======
  useEffect(() => {
    if (!id) return;

    let mounted = true;
    setDocLoading(true);

    db.collection('listings')
      .doc(String(id))
      .get()
      .then((snap) => {
        if (!mounted) return;

        if (!snap.exists) {
          alert('الإعلان غير موجود');
          router.replace('/my-listings');
          return;
        }

        const d = { id: String(id), ...snap.data() };
        setData(d);

        setTitle(String(d.title || ''));
        setDesc(String(d.description || ''));
        setCity(String(d.city || ''));
        setCategory(normalizeCatKey(d.category || 'solar') || 'other');

        // ✅ فروع الأقسام (Taxonomy)
        setCarMake(String(d.carMake || ''));
        setCarMakeText(String(d.carMakeText || ''));
        setPhoneBrand(String(d.phoneBrand || ''));
        setPhoneBrandText(String(d.phoneBrandText || ''));
        setDealType(String(d.dealType || ''));
        setPropertyType(String(d.propertyType || ''));
        setPropertyTypeText(String(d.propertyTypeText || ''));

        // cars: موديل
        setCarModel(String(d.carModel || ''));
        setCarModelText(String(d.carModelText || ''));

        // بقية الأقسام
        setElectronicsType(String(d.electronicsType || ''));
        setElectronicsTypeText(String(d.electronicsTypeText || ''));

        setMotorcycleBrand(String(d.motorcycleBrand || ''));
        setMotorcycleBrandText(String(d.motorcycleBrandText || ''));
        setMotorcycleModel(String(d.motorcycleModel || ''));
        setMotorcycleModelText(String(d.motorcycleModelText || ''));

        setHeavyEquipmentType(String(d.heavyEquipmentType || ''));
        setHeavyEquipmentTypeText(String(d.heavyEquipmentTypeText || ''));

        setSolarType(String(d.solarType || ''));
        setSolarTypeText(String(d.solarTypeText || ''));

        setNetworkType(String(d.networkType || ''));
        setNetworkTypeText(String(d.networkTypeText || ''));

        setMaintenanceType(String(d.maintenanceType || ''));
        setMaintenanceTypeText(String(d.maintenanceTypeText || ''));

        setFurnitureType(String(d.furnitureType || ''));
        setFurnitureTypeText(String(d.furnitureTypeText || ''));

        setHomeToolsType(String(d.homeToolsType || ''));
        setHomeToolsTypeText(String(d.homeToolsTypeText || ''));

        setClothesType(String(d.clothesType || ''));
        setClothesTypeText(String(d.clothesTypeText || ''));

        setAnimalType(String(d.animalType || ''));
        setAnimalTypeText(String(d.animalTypeText || ''));

        setJobType(String(d.jobType || ''));
        setJobTypeText(String(d.jobTypeText || ''));

        setServiceType(String(d.serviceType || ''));
        setServiceTypeText(String(d.serviceTypeText || ''));

        setDidInitCategory(true);

        setPhone(String(d.phone || ''));
        setIsWhatsapp(d.isWhatsapp !== false);

        // عملة + سعر أصلي
        const origCur = String(d.originalCurrency || 'YER');
        const origPrice = d.originalPrice ?? '';
        setCurrency(['YER', 'SAR', 'USD'].includes(origCur) ? origCur : 'YER');
        setPrice(origPrice !== '' ? String(origPrice) : d.priceYER ? String(d.priceYER) : '');

        // موقع
        const c = d.coords;
        if (Array.isArray(c) && c.length === 2) {
          setCoords([Number(c[0]), Number(c[1])]);
        } else {
          setCoords(null);
        }
        setLocationLabel(String(d.locationLabel || ''));

        // صور
        setExistingImages(Array.isArray(d.images) ? d.images.filter(Boolean) : []);
        setRemovedExisting([]);
        setNewImages([]);
        setNewPreviews([]);

        // حالة
        setStatus(String(d.status || 'active') === 'sold' ? 'sold' : 'active');

        setDocLoading(false);
      })
      .catch((e) => {
        console.error('Load listing error:', e);
        alert('تعذر تحميل الإعلان');
        setDocLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id, router]);

  // ✅ عند تغيير القسم: صفّر الفروع (بعد التحميل فقط)
  useEffect(() => {
    if (!didInitCategory) return;

    setCarMake('');
    setCarMakeText('');
    setPhoneBrand('');
    setPhoneBrandText('');
    setDealType('');
    setPropertyType('');
    setPropertyTypeText('');

    setCarModel('');
    setCarModelText('');

    setElectronicsType('');
    setElectronicsTypeText('');

    setMotorcycleBrand('');
    setMotorcycleBrandText('');
    setMotorcycleModel('');
    setMotorcycleModelText('');

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
  }, [category, didInitCategory]);

  // ====== Previews for new images ======
  useEffect(() => {
    if (!newImages.length) {
      setNewPreviews([]);
      return;
    }
    const previews = [];
    newImages.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        previews.push(reader.result);
        if (previews.length === newImages.length) setNewPreviews([...previews]);
      };
      reader.readAsDataURL(file);
    });
  }, [newImages]);

  // ====== Validation ======
  const validate = () => {
    const e = {};

    if (!title.trim()) e.title = 'الرجاء إدخال عنوان للإعلان';
    else if (title.trim().length < 5) e.title = 'العنوان يجب أن يكون 5 أحرف على الأقل';

    if (!desc.trim()) e.desc = 'الرجاء إدخال وصف للإعلان';
    else if (desc.trim().length < 10) e.desc = 'الوصف يجب أن يكون 10 أحرف على الأقل';

    if (!city.trim()) e.city = 'الرجاء إدخال المدينة';

    const cKey = normalizeCatKey(category);
    if (!cKey) e.category = 'الرجاء اختيار القسم';

    if (!price || isNaN(price) || Number(price) <= 0) e.price = 'الرجاء إدخال سعر صحيح';

    const phoneDigits = String(phone || '').replace(/\D/g, '');
    if (!phoneDigits) {
      e.phone = 'رقم التواصل مطلوب';
    } else if (!/^[0-9]{9,15}$/.test(phoneDigits)) {
      e.phone = 'رقم الهاتف غير صحيح';
    }

    // ✅ فروع الأقسام (لثبات الخريطة/الأقسام)

    if (cKey === 'cars') {
      if (!carMake) e.carMake = 'اختر ماركة السيارة';
      if (carMake === 'other' && !carMakeText.trim()) e.carMakeText = 'اكتب ماركة السيارة';
      if (carModel === 'other' && !carModelText.trim()) e.carModelText = 'اكتب موديل السيارة';
    }

    if (cKey === 'phones') {
      if (!phoneBrand) e.phoneBrand = 'اختر ماركة الجوال';
      if (phoneBrand === 'other' && !phoneBrandText.trim()) e.phoneBrandText = 'اكتب ماركة الجوال';
    }

    if (cKey === 'realestate') {
      if (!dealType) e.dealType = 'اختر (بيع / إيجار)';
      if (!propertyType) e.propertyType = 'اختر نوع العقار';
      if (propertyType === 'other' && !propertyTypeText.trim()) e.propertyTypeText = 'اكتب نوع العقار';
    }

    if (cKey === 'electronics') {
      if (electronicsType === 'other' && !electronicsTypeText.trim()) e.electronicsTypeText = 'اكتب نوع الإلكترونيات';
    }

    if (cKey === 'motorcycles') {
      if (!motorcycleBrand) e.motorcycleBrand = 'اختر ماركة الدراجة';
      if (motorcycleBrand === 'other' && !motorcycleBrandText.trim()) e.motorcycleBrandText = 'اكتب ماركة الدراجة';

      if (motorcycleBrand === 'other') {
        if (!motorcycleModelText.trim()) e.motorcycleModelText = 'اكتب موديل الدراجة';
      } else {
        if (!motorcycleModel) e.motorcycleModel = 'اختر موديل الدراجة';
        if (motorcycleModel === 'other' && !motorcycleModelText.trim()) e.motorcycleModelText = 'اكتب موديل الدراجة';
      }
    }

    if (cKey === 'heavy_equipment') {
      if (heavyEquipmentType === 'other' && !heavyEquipmentTypeText.trim()) e.heavyEquipmentTypeText = 'اكتب نوع المعدة';
    }

    if (cKey === 'solar') {
      if (solarType === 'other' && !solarTypeText.trim()) e.solarTypeText = 'اكتب نوع الطاقة الشمسية';
    }

    if (cKey === 'networks') {
      if (networkType === 'other' && !networkTypeText.trim()) e.networkTypeText = 'اكتب نوع الشبكات';
    }

    if (cKey === 'maintenance') {
      if (maintenanceType === 'other' && !maintenanceTypeText.trim()) e.maintenanceTypeText = 'اكتب نوع الصيانة';
    }

    if (cKey === 'furniture') {
      if (furnitureType === 'other' && !furnitureTypeText.trim()) e.furnitureTypeText = 'اكتب نوع الأثاث';
    }

    if (cKey === 'home_tools') {
      if (homeToolsType === 'other' && !homeToolsTypeText.trim()) e.homeToolsTypeText = 'اكتب نوع الأدوات المنزلية';
    }

    if (cKey === 'clothes') {
      if (clothesType === 'other' && !clothesTypeText.trim()) e.clothesTypeText = 'اكتب نوع الملابس';
    }

    if (cKey === 'animals') {
      if (animalType === 'other' && !animalTypeText.trim()) e.animalTypeText = 'اكتب نوع الحيوانات';
    }

    if (cKey === 'jobs') {
      if (jobType === 'other' && !jobTypeText.trim()) e.jobTypeText = 'اكتب نوع الوظيفة';
    }

    if (cKey === 'services') {
      if (serviceType === 'other' && !serviceTypeText.trim()) e.serviceTypeText = 'اكتب نوع الخدمة';
    }

    const keptExisting = existingImages.length;
    const total = keptExisting + newImages.length;
    if (total > MAX_IMAGES) e.images = `الحد الأقصى للصور هو ${MAX_IMAGES}`;

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ====== Helpers ======
  const onPick = (c, lbl) => {
    setCoords(c);
    setLocationLabel(lbl || '');
    if (errors.location) setErrors((p) => ({ ...p, location: undefined }));
  };

  const handleRemoveExistingImage = (url) => {
    setExistingImages((prev) => prev.filter((x) => x !== url));
    setRemovedExisting((prev) => (prev.includes(url) ? prev : [...prev, url]));
  };

  const handleRemoveNewImage = (index) => {
    setNewImages((prev) => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });
  };

  const uploadNewImages = async () => {
    if (!newImages.length) return [];
    const out = [];

    for (const file of newImages) {
      const safeName = String(file.name || 'img').replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `listings/${user.uid}/${Date.now()}_${safeName}`;
      const ref = storage.ref().child(path);
      await ref.put(file);
      const url = await ref.getDownloadURL();
      out.push(url);
    }

    return out;
  };

  const bestEffortDeleteStorageUrl = async (url) => {
    try {
      // ✅ compat: storage.refFromURL
      const ref = storage.refFromURL(url);
      await ref.delete();
    } catch (e) {
      console.warn('Storage delete failed:', url, e);
    }
  };

  // ====== Save ======
  const save = async () => {
    setSubmitAttempted(true);

    if (!user) {
      alert('يرجى تسجيل الدخول');
      return;
    }
    if (!canEdit) {
      alert('ليست لديك صلاحية تعديل هذا الإعلان');
      return;
    }
    if (!validate()) {
      alert('يرجى تصحيح الأخطاء قبل الحفظ');
      return;
    }

    setSaving(true);
    try {
      const cKey = normalizeCatKey(category);
      const priceYER = toYERLocal(price, currency);
      const phoneDigits = String(phone || '').replace(/\D/g, '');

      const uploaded = await uploadNewImages();
      const finalImages = [...existingImages, ...uploaded].slice(0, MAX_IMAGES);

      const payload = {
        title: title.trim(),
        description: desc.trim(),
        city: city.trim(),
        category: cKey || 'other',
        categoryKey: cKey || 'other',

        // ✅ فروع الأقسام (Taxonomy)
        carMake: cKey === 'cars' ? (carMake || null) : null,
        carMakeText: cKey === 'cars' && carMake === 'other' ? (carMakeText.trim() || null) : null,

        carModel:
          cKey === 'cars'
            ? carModel && carModel !== 'other'
              ? carModel
              : carModelText.trim()
                ? slugKey(carModelText)
                : null
            : null,
        carModelText:
          cKey === 'cars' && (carModel === 'other' || (carModelText.trim() && carModel !== 'other'))
            ? (carModelText.trim() || null)
            : null,

        phoneBrand: cKey === 'phones' ? (phoneBrand || null) : null,
        phoneBrandText: cKey === 'phones' && phoneBrand === 'other' ? (phoneBrandText.trim() || null) : null,

        dealType: cKey === 'realestate' ? (dealType || null) : null,
        propertyType: cKey === 'realestate' ? (propertyType || null) : null,
        propertyTypeText: cKey === 'realestate' && propertyType === 'other' ? (propertyTypeText.trim() || null) : null,

        electronicsType: cKey === 'electronics' ? (electronicsType || null) : null,
        electronicsTypeText:
          cKey === 'electronics' && electronicsType === 'other' ? (electronicsTypeText.trim() || null) : null,

        motorcycleBrand: cKey === 'motorcycles' ? (motorcycleBrand || null) : null,
        motorcycleBrandText:
          cKey === 'motorcycles' && motorcycleBrand === 'other' ? (motorcycleBrandText.trim() || null) : null,
        motorcycleModel: cKey === 'motorcycles'
          ? (motorcycleBrand && motorcycleBrand !== 'other'
              ? (motorcycleModel && motorcycleModel !== 'other'
                  ? motorcycleModel
                  : (motorcycleModelText.trim() ? slugKey(motorcycleModelText) : null))
              : (motorcycleModelText.trim() ? slugKey(motorcycleModelText) : null))
          : null,
        motorcycleModelText: cKey === 'motorcycles' ? (motorcycleModelText.trim() || null) : null,

        heavyEquipmentType: cKey === 'heavy_equipment' ? (heavyEquipmentType || null) : null,
        heavyEquipmentTypeText:
          cKey === 'heavy_equipment' && heavyEquipmentType === 'other'
            ? (heavyEquipmentTypeText.trim() || null)
            : null,

        solarType: cKey === 'solar' ? (solarType || null) : null,
        solarTypeText: cKey === 'solar' && solarType === 'other' ? (solarTypeText.trim() || null) : null,

        networkType: cKey === 'networks' ? (networkType || null) : null,
        networkTypeText: cKey === 'networks' && networkType === 'other' ? (networkTypeText.trim() || null) : null,

        maintenanceType: cKey === 'maintenance' ? (maintenanceType || null) : null,
        maintenanceTypeText:
          cKey === 'maintenance' && maintenanceType === 'other' ? (maintenanceTypeText.trim() || null) : null,

        furnitureType: cKey === 'furniture' ? (furnitureType || null) : null,
        furnitureTypeText: cKey === 'furniture' && furnitureType === 'other' ? (furnitureTypeText.trim() || null) : null,

        homeToolsType: cKey === 'home_tools' ? (homeToolsType || null) : null,
        homeToolsTypeText:
          cKey === 'home_tools' && homeToolsType === 'other' ? (homeToolsTypeText.trim() || null) : null,

        clothesType: cKey === 'clothes' ? (clothesType || null) : null,
        clothesTypeText: cKey === 'clothes' && clothesType === 'other' ? (clothesTypeText.trim() || null) : null,

        animalType: cKey === 'animals' ? (animalType || null) : null,
        animalTypeText: cKey === 'animals' && animalType === 'other' ? (animalTypeText.trim() || null) : null,

        jobType: cKey === 'jobs' ? (jobType || null) : null,
        jobTypeText: cKey === 'jobs' && jobType === 'other' ? (jobTypeText.trim() || null) : null,

        serviceType: cKey === 'services' ? (serviceType || null) : null,
        serviceTypeText: cKey === 'services' && serviceType === 'other' ? (serviceTypeText.trim() || null) : null,

        phone: phoneDigits || null,
        isWhatsapp: !!isWhatsapp,

        priceYER: Number(priceYER),
        originalPrice: Number(price),
        originalCurrency: currency,
        currencyBase: 'YER',

        coords: coords ? [Number(coords[0]), Number(coords[1])] : null,
        locationLabel: locationLabel || null,

        images: finalImages,

        status: status === 'sold' ? 'sold' : 'active',

        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection('listings').doc(String(id)).update(payload);

      // بعد حفظ الدوك: نحاول نحذف الصور التي أزلتها من التخزين
      if (removedExisting.length) {
        await Promise.all(removedExisting.map(bestEffortDeleteStorageUrl));
        setRemovedExisting([]);
      }

      // نظّف صور جديدة
      setNewImages([]);
      setNewPreviews([]);

      alert('✅ تم حفظ التعديلات');
      router.push(isAdmin ? '/admin' : '/my-listings');
    } catch (e) {
      console.error('Save error:', e);
      alert('❌ فشل الحفظ، حاول مرة أخرى');
    } finally {
      setSaving(false);
    }
  };

  // ====== Delete listing (حقيقي) ======
  const deleteListing = async () => {
    if (!user) return;
    if (!canEdit) return;

    const ok = confirm('⚠️ هل أنت متأكد من حذف الإعلان نهائياً؟ سيتم حذف الصور أيضاً إن أمكن.');
    if (!ok) return;

    setDeleting(true);
    try {
      const urls = Array.isArray(existingImages) ? existingImages : [];
      await db.collection('listings').doc(String(id)).delete();

      await Promise.all(urls.map(bestEffortDeleteStorageUrl));

      alert('🗑️ تم حذف الإعلان نهائياً');
      router.push(isAdmin ? '/admin' : '/my-listings');
    } catch (e) {
      console.error('Delete listing error:', e);
      alert('❌ تعذر حذف الإعلان (قد تكون الصلاحيات تمنع ذلك)');
    } finally {
      setDeleting(false);
    }
  };

  const convertedPrice = useMemo(() => {
    if (!price || isNaN(price)) return null;
    if (currency === 'YER') return null;
    try {
      const yer = toYERLocal(price, currency);
      return Math.round(yer).toLocaleString('ar-YE');
    } catch {
      return null;
    }
  }, [price, currency]);

  // ====== Guards ======
  if (authLoading || docLoading) {
    return (
      <div className="wrap">
        <div className="card center">
          <div className="spinner" />
          <p>جاري تحميل الإعلان…</p>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="wrap">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>🔒 تسجيل الدخول مطلوب</h2>
          <p>يجب تسجيل الدخول لتعديل الإعلان.</p>
          <div className="row">
            <Link className="btn primary" href="/login">
              تسجيل الدخول
            </Link>
            <Link className="btn" href="/">
              العودة للرئيسية
            </Link>
          </div>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="wrap">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>غير موجود</h2>
          <p>الإعلان غير موجود.</p>
          <Link className="btn" href="/my-listings">
            إعلاناتي
          </Link>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="wrap">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>🛑 غير مصرح</h2>
          <p>ليست لديك صلاحية تعديل هذا الإعلان.</p>
          <div className="row">
            <Link className="btn" href="/">
              الرئيسية
            </Link>
            <Link className="btn" href="/my-listings">
              إعلاناتي
            </Link>
          </div>
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  // ====== UI ======
  return (
    <div className="wrap">
      <div className="hero">
        <div>
          <h1>تعديل الإعلان</h1>
          <p className="muted">عدّل بيانات إعلانك، الصور، والموقع بسهولة.</p>
        </div>
        <div className="heroActions">
          <button className="btn" onClick={() => router.back()}>
            ← رجوع
          </button>
          <button className="btn danger" onClick={deleteListing} disabled={deleting} title="حذف نهائي">
            {deleting ? 'جاري الحذف…' : '🗑️ حذف نهائي'}
          </button>
        </div>
      </div>

      <div className="grid">
        {/* Form */}
        <div className="card">
          <h2 className="secTitle">معلومات الإعلان</h2>

          <div className="field">
            <label className="label req">العنوان</label>
            <input
              className={`input ${errors.title ? 'err' : ''}`}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (submitAttempted) setErrors((p) => ({ ...p, title: undefined }));
              }}
              maxLength={100}
              placeholder="عنوان الإعلان"
            />
            {errors.title && <div className="errMsg">{errors.title}</div>}
          </div>

          <div className="field">
            <label className="label req">الوصف</label>
            <textarea
              className={`input ${errors.desc ? 'err' : ''}`}
              value={desc}
              onChange={(e) => {
                setDesc(e.target.value);
                if (submitAttempted) setErrors((p) => ({ ...p, desc: undefined }));
              }}
              rows={6}
              maxLength={2000}
              placeholder="وصف الإعلان"
            />
            {errors.desc && <div className="errMsg">{errors.desc}</div>}
          </div>

          <div className="row2">
            <div className="field">
              <label className="label req">المدينة</label>
              <input
                className={`input ${errors.city ? 'err' : ''}`}
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  if (submitAttempted) setErrors((p) => ({ ...p, city: undefined }));
                }}
                placeholder="مثال: صنعاء"
              />
              {errors.city && <div className="errMsg">{errors.city}</div>}
            </div>

            <div className="field">
              <label className="label req">القسم</label>
              <select
                className={`input ${errors.category ? 'err' : ''}`}
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  if (submitAttempted) setErrors((p) => ({ ...p, category: undefined }));
                }}
                disabled={catsLoading}
              >
                <option value="">— اختر —</option>
                {cats.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.category && <div className="errMsg">{errors.category}</div>}
              <div className="help">
                {catsLoading
                  ? 'جاري تحميل الأقسام…'
                  : catsSource === 'firestore'
                    ? 'الأقسام من قاعدة البيانات'
                    : 'الأقسام الافتراضية (Fallback)'}
              </div>
            </div>
          </div>

          {/* ✅ تفاصيل القسم (تصنيف هرمي) */}
          {catKey === 'cars' ? (
            <div className="taxBox">
              <div className="taxTitle">تفاصيل السيارة</div>

              <div className="row2">
                <div className="field">
                  <label className="label req">ماركة السيارة</label>
                  <select
                    className={`input ${errors.carMake ? 'err' : ''}`}
                    value={carMake}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCarMake(v);
                      // عند تغيير الماركة: صفّر الموديل (بدون useEffect عشان ما يصفّر عند التحميل)
                      setCarModel('');
                      setCarModelText('');
                      if (submitAttempted) setErrors((p) => ({ ...p, carMake: undefined }));
                    }}
                  >
                    <option value="">— اختر —</option>
                    {CAR_MAKES.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  {errors.carMake && <div className="errMsg">{errors.carMake}</div>}

                  {carMake === 'other' ? (
                    <>
                      <div style={{ height: 8 }} />
                      <input
                        className={`input ${errors.carMakeText ? 'err' : ''}`}
                        value={carMakeText}
                        onChange={(e) => {
                          setCarMakeText(e.target.value);
                          if (submitAttempted) setErrors((p) => ({ ...p, carMakeText: undefined }));
                        }}
                        placeholder="اكتب الماركة"
                      />
                      {errors.carMakeText && <div className="errMsg">{errors.carMakeText}</div>}
                    </>
                  ) : null}
                </div>

                <div className="field">
                  <label className="label">موديل السيارة</label>

                  {carModelsForMake.length ? (
                    <select
                      className={`input ${errors.carModelText ? 'err' : ''}`}
                      value={carModel}
                      onChange={(e) => {
                        setCarModel(e.target.value);
                        if (submitAttempted) setErrors((p) => ({ ...p, carModelText: undefined }));
                      }}
                    >
                      <option value="">— غير محدد —</option>
                      {carModelsForMake.map((x) => (
                        <option key={x.key} value={x.key}>
                          {x.label}
                        </option>
                      ))}
                      <option value="other">أخرى…</option>
                    </select>
                  ) : (
                    <select
                      className={`input ${errors.carModelText ? 'err' : ''}`}
                      value={carModel}
                      onChange={(e) => {
                        setCarModel(e.target.value);
                        if (submitAttempted) setErrors((p) => ({ ...p, carModelText: undefined }));
                      }}
                    >
                      <option value="">— غير محدد —</option>
                      <option value="other">اكتب الموديل…</option>
                    </select>
                  )}

                  {carModel === 'other' ? (
                    <>
                      <div style={{ height: 8 }} />
                      <input
                        className={`input ${errors.carModelText ? 'err' : ''}`}
                        value={carModelText}
                        onChange={(e) => {
                          setCarModelText(e.target.value);
                          if (submitAttempted) setErrors((p) => ({ ...p, carModelText: undefined }));
                        }}
                        placeholder="مثال: هايلوكس / لاندكروزر / سنتافي…"
                      />
                      {errors.carModelText && <div className="errMsg">{errors.carModelText}</div>}
                    </>
                  ) : null}

                  <div className="help">يساعد في فلترة موديلات السيارات.</div>
                </div>
              </div>
            </div>
          ) : null}

          {catKey === 'phones' ? (
            <div className="taxBox">
              <div className="taxTitle">تفاصيل الجوال</div>

              <div className="row2">
                <div className="field">
                  <label className="label req">ماركة الجوال</label>
                  <select
                    className={`input ${errors.phoneBrand ? 'err' : ''}`}
                    value={phoneBrand}
                    onChange={(e) => {
                      setPhoneBrand(e.target.value);
                      if (submitAttempted) setErrors((p) => ({ ...p, phoneBrand: undefined }));
                    }}
                  >
                    <option value="">— اختر —</option>
                    {PHONE_BRANDS.map((b) => (
                      <option key={b.key} value={b.key}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                  {errors.phoneBrand && <div className="errMsg">{errors.phoneBrand}</div>}

                  {phoneBrand === 'other' ? (
                    <>
                      <div style={{ height: 8 }} />
                      <input
                        className={`input ${errors.phoneBrandText ? 'err' : ''}`}
                        value={phoneBrandText}
                        onChange={(e) => {
                          setPhoneBrandText(e.target.value);
                          if (submitAttempted) setErrors((p) => ({ ...p, phoneBrandText: undefined }));
                        }}
                        placeholder="اكتب الماركة"
                      />
                      {errors.phoneBrandText && <div className="errMsg">{errors.phoneBrandText}</div>}
                    </>
                  ) : null}
                </div>
                <div className="field">
                  <div className="help">اختياري، لكنه يحسّن البحث والفلترة.</div>
                </div>
              </div>
            </div>
          ) : null}

          {catKey === 'realestate' ? (
            <div className="taxBox">
              <div className="taxTitle">تفاصيل العقار</div>

              <div className="row2">
                <div className="field">
                  <label className="label req">نوع العرض</label>
                  <select
                    className={`input ${errors.dealType ? 'err' : ''}`}
                    value={dealType}
                    onChange={(e) => {
                      setDealType(e.target.value);
                      if (submitAttempted) setErrors((p) => ({ ...p, dealType: undefined }));
                    }}
                  >
                    <option value="">— اختر —</option>
                    {DEAL_TYPES.map((d) => (
                      <option key={d.key} value={d.key}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  {errors.dealType && <div className="errMsg">{errors.dealType}</div>}
                </div>

                <div className="field">
                  <label className="label req">نوع العقار</label>
                  <select
                    className={`input ${errors.propertyType ? 'err' : ''}`}
                    value={propertyType}
                    onChange={(e) => {
                      setPropertyType(e.target.value);
                      if (submitAttempted) setErrors((p) => ({ ...p, propertyType: undefined }));
                    }}
                  >
                    <option value="">— اختر —</option>
                    {PROPERTY_TYPES.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                    <option value="other">أخرى…</option>
                  </select>
                  {errors.propertyType && <div className="errMsg">{errors.propertyType}</div>}

                  {propertyType === 'other' ? (
                    <>
                      <div style={{ height: 8 }} />
                      <input
                        className={`input ${errors.propertyTypeText ? 'err' : ''}`}
                        value={propertyTypeText}
                        onChange={(e) => {
                          setPropertyTypeText(e.target.value);
                          if (submitAttempted) setErrors((p) => ({ ...p, propertyTypeText: undefined }));
                        }}
                        placeholder="اكتب نوع العقار"
                      />
                      {errors.propertyTypeText && <div className="errMsg">{errors.propertyTypeText}</div>}
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {catKey === 'electronics' ? (
            <div className="taxBox">
              <div className="taxTitle">تفاصيل الإلكترونيات</div>
              <div className="row2">
                <div className="field">
                  <label className="label">النوع</label>
                  <select className="input" value={electronicsType} onChange={(e) => setElectronicsType(e.target.value)}>
                    <option value="">— غير محدد —</option>
                    {ELECTRONICS_TYPES.map((x) => (
                      <option key={x.key} value={x.key}>
                        {x.label}
                      </option>
                    ))}
                    <option value="other">أخرى…</option>
                  </select>

                  {electronicsType === 'other' ? (
                    <>
                      <div style={{ height: 8 }} />
                      <input
                        className={`input ${errors.electronicsTypeText ? 'err' : ''}`}
                        value={electronicsTypeText}
                        onChange={(e) => setElectronicsTypeText(e.target.value)}
                        placeholder="اكتب نوع الإلكترونيات"
                      />
                      {errors.electronicsTypeText && <div className="errMsg">{errors.electronicsTypeText}</div>}
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {catKey === 'motorcycles' ? (
            <div className="taxBox">
              <div className="taxTitle">تفاصيل الدراجات</div>
              <div className="row2">
                <div className="field">
                  <label className="label">الماركة</label>
                  <select
                    className={`input ${errors.motorcycleBrand ? 'err' : ''}`}
                    value={motorcycleBrand}
                    onChange={(e) => {
                      const v = e.target.value;
                      setMotorcycleBrand(v);
                      setMotorcycleModel('');
                      setMotorcycleModelText('');
                    }}
                  >
                    <option value="">— اختر الماركة —</option>
                    {MOTORCYCLE_BRANDS.map((x) => (
                      <option key={x.key} value={x.key}>
                        {x.label}
                      </option>
                    ))}
                  </select>
                  {errors.motorcycleBrand && <div className="errMsg">{errors.motorcycleBrand}</div>}

                  {motorcycleBrand === 'other' ? (
                    <>
                      <div style={{ height: 8 }} />
                      <input
                        className={`input ${errors.motorcycleBrandText ? 'err' : ''}`}
                        value={motorcycleBrandText}
                        onChange={(e) => setMotorcycleBrandText(e.target.value)}
                        placeholder="اكتب ماركة الدراجة"
                      />
                      {errors.motorcycleBrandText && <div className="errMsg">{errors.motorcycleBrandText}</div>}
                    </>
                  ) : null}
                </div>

                <div className="field">
                  <label className="label">الموديل</label>

                  {motorcycleBrand && motorcycleBrand !== 'other' ? (
                    <>
                      <select
                        className={`input ${errors.motorcycleModel ? 'err' : ''}`}
                        value={motorcycleModel}
                        onChange={(e) => setMotorcycleModel(e.target.value)}
                      >
                        <option value="">— اختر الموديل —</option>
                        {motorcycleModelsForBrand.map((x) => (
                          <option key={x.key} value={x.key}>
                            {x.label}
                          </option>
                        ))}
                      </select>
                      {errors.motorcycleModel && <div className="errMsg">{errors.motorcycleModel}</div>}

                      {motorcycleModel === 'other' ? (
                        <>
                          <div style={{ height: 8 }} />
                          <input
                            className={`input ${errors.motorcycleModelText ? 'err' : ''}`}
                            value={motorcycleModelText}
                            onChange={(e) => setMotorcycleModelText(e.target.value)}
                            placeholder="اكتب موديل الدراجة"
                          />
                          {errors.motorcycleModelText && <div className="errMsg">{errors.motorcycleModelText}</div>}
                        </>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <input
                        className={`input ${errors.motorcycleModelText ? 'err' : ''}`}
                        value={motorcycleModelText}
                        onChange={(e) => setMotorcycleModelText(e.target.value)}
                        placeholder="اكتب موديل الدراجة"
                        disabled={!motorcycleBrand}
                      />
                      {errors.motorcycleModelText && <div className="errMsg">{errors.motorcycleModelText}</div>}
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {catKey === 'heavy_equipment' ? (
            <div className="taxBox">
              <div className="taxTitle">تفاصيل المعدات الثقيلة</div>
              <div className="row2">
                <div className="field">
                  <label className="label">النوع</label>
                  <select className="input" value={heavyEquipmentType} onChange={(e) => setHeavyEquipmentType(e.target.value)}>
                    <option value="">— غير محدد —</option>
                    {HEAVY_EQUIPMENT_TYPES.map((x) => (
                      <option key={x.key} value={x.key}>
                        {x.label}
                      </option>
                    ))}
                    <option value="other">أخرى…</option>
                  </select>

                  {heavyEquipmentType === 'other' ? (
                    <>
                      <div style={{ height: 8 }} />
                      <input
                        className={`input ${errors.heavyEquipmentTypeText ? 'err' : ''}`}
                        value={heavyEquipmentTypeText}
                        onChange={(e) => setHeavyEquipmentTypeText(e.target.value)}
                        placeholder="اكتب نوع المعدة"
                      />
                      {errors.heavyEquipmentTypeText && <div className="errMsg">{errors.heavyEquipmentTypeText}</div>}
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {catKey === 'solar' ? (
            <div className="taxBox">
              <div className="taxTitle">تفاصيل الطاقة الشمسية</div>
              <div className="row2">
                <div className="field">
                  <label className="label">النوع</label>
                  <select className="input" value={solarType} onChange={(e) => setSolarType(e.target.value)}>
                    <option value="">— غير محدد —</option>
                    {SOLAR_TYPES.map((x) => (
                      <option key={x.key} value={x.key}>
                        {x.label}
                      </option>
                    ))}
                    <option value="other">أخرى…</option>
                  </select>

                  {solarType === 'other' ? (
                    <>
                      <div style={{ height: 8 }} />
                      <input
                        className={`input ${errors.solarTypeText ? 'err' : ''}`}
                        value={solarTypeText}
                        onChange={(e) => setSolarTypeText(e.target.value)}
                        placeholder="اكتب نوع الطاقة الشمسية"
                      />
                      {errors.solarTypeText && <div className="errMsg">{errors.solarTypeText}</div>}
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {catKey === 'networks' ? (
            <div className="taxBox">
              <div className="taxTitle">تفاصيل الشبكات</div>
              <div className="row2">
                <div className="field">
                  <label className="label">النوع</label>
                  <select className="input" value={networkType} onChange={(e) => setNetworkType(e.target.value)}>
                    <option value="">— غير محدد —</option>
                    {NETWORK_TYPES.map((x) => (
                      <option key={x.key} value={x.key}>
                        {x.label}
                      </option>
                    ))}
                    <option value="other">أخرى…</option>
                  </select>

                  {networkType === 'other' ? (
                    <>
                      <div style={{ height: 8 }} />
                      <input
                        className={`input ${errors.networkTypeText ? 'err' : ''}`}
                        value={networkTypeText}
                        onChange={(e) => setNetworkTypeText(e.target.value)}
                        placeholder="اكتب نوع الشبكات"
                      />
                      {errors.networkTypeText && <div className="errMsg">{errors.networkTypeText}</div>}
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {catKey === 'maintenance' ? (
            <div className="taxBox">
              <div className="taxTitle">تفاصيل الصيانة</div>
              <div className="row2">
                <div className="field">
                  <label className="label">النوع</label>
                  <select className="input" value={maintenanceType} onChange={(e) => setMaintenanceType(e.target.value)}>
                    <option value="">— غير محدد —</option>
                    {MAINTENANCE_TYPES.map((x) => (
                      <option key={x.key} value={x.key}>
                        {x.label}
                      </option>
                    ))}
                    <option value="other">أخرى…</option>
                  </select>

                  {maintenanceType === 'other' ? (
                    <>
                      <div style={{ height: 8 }} />
                      <input
                        className={`input ${errors.maintenanceTypeText ? 'err' : ''}`}
                        value={maintenanceTypeText}
                        onChange={(e) => setMaintenanceTypeText(e.target.value)}
                        placeholder="اكتب نوع الصيانة"
                      />
                      {errors.maintenanceTypeText && <div className="errMsg">{errors.maintenanceTypeText}</div>}
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {catKey === 'furniture' ? (
            <div className="taxBox">
              <div className="taxTitle">تفاصيل الأثاث</div>
              <div className="row2">
                <div className="field">
                  <label className="label">النوع</label>
                  <select className="input" value={furnitureType} onChange={(e) => setFurnitureType(e.target.value)}>
                    <option value="">— غير محدد —</option>
                    {FURNITURE_TYPES.map((x) => (
                      <option key={x.key} value={x.key}>
                        {x.label}
                      </option>
                    ))}
                    <option value="other">أخرى…</option>
                  </select>

                  {furnitureType === 'other' ? (
                    <>
                      <div style={{ height: 8 }} />
                      <input
                        className={`input ${errors.furnitureTypeText ? 'err' : ''}`}
                        value={furnitureTypeText}
                        onChange={(e) => setFurnitureTypeText(e.target.value)}
                        placeholder="اكتب نوع الأثاث"
                      />
                      {errors.furnitureTypeText && <div className="errMsg">{errors.furnitureTypeText}</div>}
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {catKey === 'home_tools' ? (
            <div className="taxBox">
              <div className="taxTitle">تفاصيل الأدوات المنزلية</div>
              <div className="row2">
                <div className="field">
                  <label className="label">النوع</label>
                  <select className="input" value={homeToolsType} onChange={(e) => setHomeToolsType(e.target.value)}>
                    <option value="">— غير محدد —</option>
                    {HOME_TOOLS_TYPES.map((x) => (
                      <option key={x.key} value={x.key}>
                        {x.label}
                      </option>
                    ))}
                    <option value="other">أخرى…</option>
                  </select>

                  {homeToolsType === 'other' ? (
                    <>
                      <div style={{ height: 8 }} />
                      <input
                        className={`input ${errors.homeToolsTypeText ? 'err' : ''}`}
                        value={homeToolsTypeText}
                        onChange={(e) => setHomeToolsTypeText(e.target.value)}
                        placeholder="اكتب نوع الأدوات المنزلية"
                      />
                      {errors.homeToolsTypeText && <div className="errMsg">{errors.homeToolsTypeText}</div>}
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {catKey === 'clothes' ? (
            <div className="taxBox">
              <div className="taxTitle">تفاصيل الملابس</div>
              <div className="row2">
                <div className="field">
                  <label className="label">النوع</label>
                  <select className="input" value={clothesType} onChange={(e) => setClothesType(e.target.value)}>
                    <option value="">— غير محدد —</option>
                    {CLOTHES_TYPES.map((x) => (
                      <option key={x.key} value={x.key}>
                        {x.label}
                      </option>
                    ))}
                    <option value="other">أخرى…</option>
                  </select>

                  {clothesType === 'other' ? (
                    <>
                      <div style={{ height: 8 }} />
                      <input
                        className={`input ${errors.clothesTypeText ? 'err' : ''}`}
                        value={clothesTypeText}
                        onChange={(e) => setClothesTypeText(e.target.value)}
                        placeholder="اكتب نوع الملابس"
                      />
                      {errors.clothesTypeText && <div className="errMsg">{errors.clothesTypeText}</div>}
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {catKey === 'animals' ? (
            <div className="taxBox">
              <div className="taxTitle">تفاصيل الحيوانات</div>
              <div className="row2">
                <div className="field">
                  <label className="label">النوع</label>
                  <select className="input" value={animalType} onChange={(e) => setAnimalType(e.target.value)}>
                    <option value="">— غير محدد —</option>
                    {ANIMAL_TYPES.map((x) => (
                      <option key={x.key} value={x.key}>
                        {x.label}
                      </option>
                    ))}
                    <option value="other">أخرى…</option>
                  </select>

                  {animalType === 'other' ? (
                    <>
                      <div style={{ height: 8 }} />
                      <input
                        className={`input ${errors.animalTypeText ? 'err' : ''}`}
                        value={animalTypeText}
                        onChange={(e) => setAnimalTypeText(e.target.value)}
                        placeholder="اكتب نوع الحيوانات"
                      />
                      {errors.animalTypeText && <div className="errMsg">{errors.animalTypeText}</div>}
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {catKey === 'jobs' ? (
            <div className="taxBox">
              <div className="taxTitle">تفاصيل الوظائف</div>
              <div className="row2">
                <div className="field">
                  <label className="label">نوع الوظيفة</label>
                  <select className="input" value={jobType} onChange={(e) => setJobType(e.target.value)}>
                    <option value="">— غير محدد —</option>
                    {JOB_TYPES.map((x) => (
                      <option key={x.key} value={x.key}>
                        {x.label}
                      </option>
                    ))}
                    <option value="other">أخرى…</option>
                  </select>

                  {jobType === 'other' ? (
                    <>
                      <div style={{ height: 8 }} />
                      <input
                        className={`input ${errors.jobTypeText ? 'err' : ''}`}
                        value={jobTypeText}
                        onChange={(e) => setJobTypeText(e.target.value)}
                        placeholder="اكتب نوع الوظيفة"
                      />
                      {errors.jobTypeText && <div className="errMsg">{errors.jobTypeText}</div>}
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {catKey === 'services' ? (
            <div className="taxBox">
              <div className="taxTitle">تفاصيل الخدمات</div>
              <div className="row2">
                <div className="field">
                  <label className="label">نوع الخدمة</label>
                  <select className="input" value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                    <option value="">— غير محدد —</option>
                    {SERVICE_TYPES.map((x) => (
                      <option key={x.key} value={x.key}>
                        {x.label}
                      </option>
                    ))}
                    <option value="other">أخرى…</option>
                  </select>

                  {serviceType === 'other' ? (
                    <>
                      <div style={{ height: 8 }} />
                      <input
                        className={`input ${errors.serviceTypeText ? 'err' : ''}`}
                        value={serviceTypeText}
                        onChange={(e) => setServiceTypeText(e.target.value)}
                        placeholder="اكتب نوع الخدمة"
                      />
                      {errors.serviceTypeText && <div className="errMsg">{errors.serviceTypeText}</div>}
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <div className="row2">
            <div className="field">
              <label className="label req">السعر</label>
              <input
                className={`input ${errors.price ? 'err' : ''}`}
                value={price}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9.]/g, '');
                  setPrice(v);
                  if (submitAttempted) setErrors((p) => ({ ...p, price: undefined }));
                }}
                inputMode="decimal"
                placeholder="مثال: 100000"
              />
              {errors.price && <div className="errMsg">{errors.price}</div>}
            </div>

            <div className="field">
              <label className="label req">العملة</label>
              <div className="pillRow">
                {['YER', 'SAR', 'USD'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`pill ${currency === c ? 'active' : ''}`}
                    onClick={() => setCurrency(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {convertedPrice && (
                <div className="help">
                  سيتم الحفظ كـ <b>{convertedPrice}</b> ريال يمني (priceYER)
                </div>
              )}
            </div>
          </div>

          <div className="row2">
            <div className="field">
              <label className="label req">رقم التواصل</label>
              <input
                className={`input ${errors.phone ? 'err' : ''}`}
                value={phone}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '');
                  setPhone(v);
                  if (submitAttempted) setErrors((p) => ({ ...p, phone: undefined }));
                }}
                inputMode="tel"
                maxLength={15}
                placeholder="مثال: 770000000"
              />
              {errors.phone && <div className="errMsg">{errors.phone}</div>}
            </div>

            <div className="field">
              <label className="label">طريقة التواصل</label>
              <div className="pillRow">
                <button
                  type="button"
                  className={`pill ${isWhatsapp ? 'active' : ''}`}
                  onClick={() => setIsWhatsapp(true)}
                >
                  💬 واتساب
                </button>
                <button
                  type="button"
                  className={`pill ${!isWhatsapp ? 'active' : ''}`}
                  onClick={() => setIsWhatsapp(false)}
                >
                  📞 مكالمة
                </button>
              </div>
            </div>
          </div>

          <div className="row2">
            <div className="field">
              <label className="label">حالة الإعلان</label>
              <div className="pillRow">
                <button
                  type="button"
                  className={`pill ${status === 'active' ? 'active' : ''}`}
                  onClick={() => setStatus('active')}
                >
                  ✅ نشط
                </button>
                <button
                  type="button"
                  className={`pill ${status === 'sold' ? 'active' : ''}`}
                  onClick={() => setStatus('sold')}
                >
                  💰 تم البيع
                </button>
              </div>
              <div className="help">
                هذه تضيف/تحدث الحقل <b>status</b> داخل الإعلان
              </div>
            </div>

            <div className="field">
              <label className="label">وصف الموقع</label>
              <input
                className="input"
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
                placeholder="مثال: بجوار المستشفى…"
              />
            </div>
          </div>

          {/* Images */}
          <div className="field">
            <label className="label">الصور</label>

            {errors.images && <div className="errMsg">{errors.images}</div>}

            {!!existingImages.length && (
              <>
                <div className="subTitle">الصور الحالية</div>
                <div className="imgs">
                  {existingImages.map((url) => (
                    <div key={url} className="imgBox">
                      <img src={url} alt="صورة" className="img" />
                      <button
                        type="button"
                        className="x"
                        onClick={() => handleRemoveExistingImage(url)}
                        aria-label="حذف"
                        title="حذف من الإعلان"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="subTitle">إضافة صور جديدة</div>
            <div className="upload">
              <input
                id="upl"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  const remain = MAX_IMAGES - existingImages.length - newImages.length;
                  if (files.length > remain) {
                    alert(`يمكنك إضافة ${remain} صور فقط (الحد ${MAX_IMAGES})`);
                    return;
                  }
                  setNewImages((prev) => [...prev, ...files]);
                }}
              />
              <label htmlFor="upl" className="uploadBtn">
                📷 اختر صور
              </label>
              <div className="help">حد أقصى {MAX_IMAGES} صور للإعلان</div>
            </div>

            {!!newPreviews.length && (
              <div className="imgs">
                {newPreviews.map((p, idx) => (
                  <div key={idx} className="imgBox">
                    <img src={p} alt={`new-${idx}`} className="img" />
                    <button type="button" className="x" onClick={() => handleRemoveNewImage(idx)} aria-label="حذف">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="footerRow">
            <button className="btn" onClick={() => router.back()}>
              إلغاء
            </button>
            <button className="btn primary" onClick={save} disabled={saving}>
              {saving ? 'جاري الحفظ…' : '💾 حفظ التعديلات'}
            </button>
          </div>
        </div>

        {/* Map */}
        <div className="card">
          <h2 className="secTitle">📍 موقع الإعلان</h2>
          <p className="muted">اسحب المؤشر لتحديد الموقع الدقيق</p>
          <div className="map">
            <LocationPicker value={coords} onChange={onPick} />
          </div>
          <div className="help">{coords ? `Lat: ${coords[0]} — Lng: ${coords[1]}` : 'لم يتم تحديد موقع بعد'}</div>
        </div>
      </div>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
.wrap{
  max-width: 1200px;
  margin: 0 auto;
  padding: 18px 14px 40px;
}
.hero{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:12px;
  padding:16px;
  border:1px solid rgba(0,0,0,.08);
  border-radius:16px;
  background: linear-gradient(135deg, rgba(79,70,229,.08), rgba(124,58,237,.08));
  margin-bottom: 14px;
}
.hero h1{margin:0 0 6px; font-size:1.4rem; font-weight:900; color:#0f172a;}
.muted{color:#64748b; margin:0; line-height:1.6;}
.heroActions{display:flex; gap:10px; flex-wrap:wrap;}

.grid{
  display:grid;
  grid-template-columns: 1.2fr .8fr;
  gap:14px;
}
@media (max-width: 980px){
  .grid{grid-template-columns: 1fr;}
}

.card{
  background:#fff;
  border:1px solid rgba(0,0,0,.08);
  border-radius:16px;
  padding:16px;
  box-shadow: 0 8px 26px rgba(0,0,0,.05);
}

.taxBox{
  margin-top:12px;
  padding:14px;
  border:1px solid rgba(0,0,0,.08);
  border-radius:16px;
  background: linear-gradient(135deg, rgba(2,132,199,.06), rgba(79,70,229,.06));
}
.taxTitle{font-weight:900; color:#0f172a; margin-bottom:10px;}

.center{display:flex; flex-direction:column; align-items:center; gap:10px; padding:28px;}
.spinner{
  width:44px; height:44px;
  border:3px solid rgba(0,0,0,.08);
  border-top:3px solid rgba(79,70,229,1);
  border-radius:50%;
  animation: spin 1s linear infinite;
}
@keyframes spin{to{transform:rotate(360deg)}}

.secTitle{margin:0 0 10px; font-size:1.05rem; font-weight:900; color:#0f172a;}

.field{margin-top:12px;}
.label{display:block; font-weight:700; color:#0f172a; margin-bottom:8px;}
.label.req::after{content:" *"; color:#dc2626;}
.input{
  width:100%;
  padding:12px 12px;
  border-radius:12px;
  border:2px solid #e2e8f0;
  background:#f8fafc;
  outline:none;
  transition:.15s ease;
  font-size:15px;
}
.input:focus{
  border-color:#4f46e5;
  background:#fff;
  box-shadow:0 0 0 3px rgba(79,70,229,.12);
}
.input.err{border-color:#dc2626; background:#fef2f2;}
.errMsg{
  margin-top:8px;
  color:#dc2626;
  font-weight:600;
  font-size:13px;
}
.help{margin-top:8px; font-size:13px; color:#64748b; line-height:1.6;}
.row2{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap:12px;
}
@media (max-width: 640px){
  .row2{grid-template-columns: 1fr;}
}

.pillRow{display:flex; gap:10px; flex-wrap:wrap;}
.pill{
  padding:10px 14px;
  border-radius:999px;
  border:2px solid #e2e8f0;
  background:#f8fafc;
  color:#64748b;
  font-weight:800;
  cursor:pointer;
  transition:.15s ease;
}
.pill.active{
  background:#4f46e5;
  border-color:#4f46e5;
  color:#fff;
}
.pill:hover{transform: translateY(-1px);}

.subTitle{margin-top:10px; font-weight:900; color:#0f172a; font-size:.95rem;}
.imgs{
  margin-top:10px;
  display:grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap:10px;
}
.imgBox{
  position:relative;
  border-radius:12px;
  overflow:hidden;
  border:1px solid rgba(0,0,0,.08);
  aspect-ratio: 1;
}
.img{width:100%; height:100%; object-fit:cover; display:block;}
.x{
  position:absolute;
  top:6px; left:6px;
  width:26px; height:26px;
  border-radius:999px;
  border:none;
  background: rgba(239,68,68,.92);
  color:#fff;
  font-size:18px;
  font-weight:900;
  cursor:pointer;
  display:flex; align-items:center; justify-content:center;
}
.x:hover{background:#dc2626}

.upload{margin-top:10px; display:flex; gap:12px; align-items:center; flex-wrap:wrap;}
.upload input{display:none;}
.uploadBtn{
  padding:10px 14px;
  border-radius:12px;
  background:#0f172a;
  color:#fff;
  font-weight:900;
  cursor:pointer;
}
.uploadBtn:hover{opacity:.92}

.map{
  margin-top:10px;
  height: 420px;
  border-radius:14px;
  overflow:hidden;
  border:1px solid rgba(0,0,0,.08);
}

.footerRow{
  margin-top:16px;
  display:flex;
  gap:10px;
  justify-content:flex-end;
  flex-wrap:wrap;
}

.btn{
  padding:10px 14px;
  border-radius:12px;
  border:1px solid rgba(0,0,0,.12);
  background:#fff;
  font-weight:900;
  cursor:pointer;
  text-decoration:none;
  color:#0f172a;
}
.btn.primary{
  background:#4f46e5;
  color:#fff;
  border-color:#4f46e5;
}
.btn.primary:disabled{opacity:.75; cursor:not-allowed;}
.btn.danger{
  background:#fef2f2;
  border-color:#fecaca;
  color:#dc2626;
}
.btn.danger:disabled{opacity:.7; cursor:not-allowed;}
`;
