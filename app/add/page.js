'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

import { db, firebase, storage } from '@/lib/firebaseClient';
import { useAuth } from '@/lib/useAuth';
import { toYER, useRates } from '@/lib/rates';

// ✅ نستورد taxonomy بشكل آمن (لتجنب أخطاء build إذا اختلفت بعض الصادرات)
import * as taxonomy from '@/lib/taxonomy';

const LocationPicker = dynamic(() => import('@/components/Map/LocationPicker'), { ssr: false });

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

function slugKey(v) {
  return String(v || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_')
    .replace(/__+/g, '_')
    .replace(/[^a-z0-9_\u0600-\u06FF]/g, '')
    .slice(0, 60);
}

function getArray(x) {
  return Array.isArray(x) ? x : [];
}

function gateNextHref(path) {
  const next = encodeURIComponent(path || '/add');
  return {
    login: `/login?next=${next}`,
    register: `/register?next=${next}`,
  };
}

export default function AddPage() {
  const { user, loading } = useAuth();
  const rates = useRates();

  // basic
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');

  // location
  const [govKey, setGovKey] = useState('');
  const [city, setCity] = useState('');
  const [coords, setCoords] = useState(null); // [lat,lng]
  const [locationLabel, setLocationLabel] = useState('');

  // category
  const [category, setCategory] = useState('');

  // taxonomy (sub-fields)
  const [carMake, setCarMake] = useState('');
  const [carMakeText, setCarMakeText] = useState('');
  const [carModel, setCarModel] = useState('');
  const [carModelText, setCarModelText] = useState('');

  const [phoneBrand, setPhoneBrand] = useState('');
  const [phoneBrandText, setPhoneBrandText] = useState('');

  const [dealType, setDealType] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [propertyTypeText, setPropertyTypeText] = useState('');

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

  // price/contact
  const [currency, setCurrency] = useState('YER');
  const [price, setPrice] = useState('');
  const [phone, setPhone] = useState('');
  const [isWhatsapp, setIsWhatsapp] = useState(true);

  // auction (optional)
  const [auctionEnabled, setAuctionEnabled] = useState(false);
  const [auctionMinutes, setAuctionMinutes] = useState('60');

  // images
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const fileInputRef = useRef(null);

  // catalogs
  const [cats, setCats] = useState(DEFAULT_CATEGORIES);
  const [catsLoading, setCatsLoading] = useState(true);

  const [govs, setGovs] = useState(DEFAULT_GOVERNORATES);
  const [govsLoading, setGovsLoading] = useState(true);

  // state
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // ===== Load categories (once) =====
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const snap = await db.collection('categories').get();
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

        if (!mounted) return;
        setCats(arr.length ? arr : DEFAULT_CATEGORIES);
      } catch (e) {
        if (!mounted) return;
        setCats(DEFAULT_CATEGORIES);
      } finally {
        if (mounted) setCatsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // ===== Load governorates (once) =====
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const snap = await db.collection('taxonomy_governorates').get();
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

        if (!mounted) return;
        setGovs(arr.length ? arr : DEFAULT_GOVERNORATES);
      } catch (e) {
        if (!mounted) return;
        setGovs(DEFAULT_GOVERNORATES);
      } finally {
        if (mounted) setGovsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // derive city from govKey
  useEffect(() => {
    if (!govKey) {
      setCity('');
      return;
    }
    const found = (govs || []).find((g) => g.key === govKey);
    setCity(found?.nameAr ? String(found.nameAr) : '');
  }, [govKey, govs]);

  // reset sub fields when category changes
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

  // image previews
  useEffect(() => {
    // cleanup old previews
    imagePreviews.forEach((u) => {
      try { URL.revokeObjectURL(u); } catch (e) {}
    });

    if (!images.length) {
      setImagePreviews([]);
      return;
    }

    const urls = images.map((f) => URL.createObjectURL(f));
    setImagePreviews(urls);

    return () => {
      urls.forEach((u) => {
        try { URL.revokeObjectURL(u); } catch (e) {}
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  const carModelsForMake = useMemo(() => {
    const mk = String(carMake || '').trim();
    if (!mk || mk === 'other') return [];
    const map = taxonomy.CAR_MODELS_BY_MAKE || {};
    return Array.isArray(map?.[mk]) ? map[mk] : [];
  }, [carMake]);

  const convertedPrice = useMemo(() => {
    if (!price || isNaN(price)) return null;
    const yer = Number(toYER(price, currency, rates));
    if (!isFinite(yer) || yer <= 0) return null;

    const r = rates || {};
    const yerPerUSD = Number(r.USD || r.usd || r.usdRate || r.usdToYer || r.usd_yer || 1632);
    const yerPerSAR = Number(r.SAR || r.sar || r.sarRate || r.sarToYer || r.sar_yer || 425);

    const sar = yerPerSAR > 0 ? yer / yerPerSAR : null;
    const usd = yerPerUSD > 0 ? yer / yerPerUSD : null;

    return {
      YER: Math.round(yer).toLocaleString('ar-YE'),
      SAR: sar ? sar.toFixed(2) : null,
      USD: usd ? usd.toFixed(2) : null,
      rawYER: yer,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price, currency, rates]);

  const onPick = (c, lbl) => {
    setCoords(c);
    setLocationLabel(lbl || '');
    if (errors.location) setErrors((prev) => ({ ...prev, location: undefined }));
  };

  const onPickImages = (files) => {
    const arr = Array.from(files || []);
    const imgs = arr.filter((f) => f && String(f.type || '').startsWith('image/'));
    setImages(imgs.slice(0, 12));
  };

  const removeImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!title.trim()) newErrors.title = 'الرجاء إدخال عنوان للإعلان';
    else if (title.trim().length < 5) newErrors.title = 'العنوان يجب أن يكون 5 أحرف على الأقل';

    if (!desc.trim()) newErrors.desc = 'الرجاء إدخال وصف للإعلان';
    else if (desc.trim().length < 10) newErrors.desc = 'الوصف يجب أن يكون 10 أحرف على الأقل';

    if (!govKey) newErrors.govKey = 'الرجاء اختيار المحافظة';
    if (!category) newErrors.category = 'الرجاء اختيار القسم';

    if (!price || isNaN(price) || Number(price) <= 0) newErrors.price = 'الرجاء إدخال سعر صحيح';

    const phoneDigits = String(phone || '').replace(/\D/g, '');
    if (!phoneDigits) newErrors.phone = 'رقم التواصل مطلوب';
    else if (!/^[0-9]{9,15}$/.test(phoneDigits)) newErrors.phone = 'رقم الهاتف غير صحيح';

    // category-specific
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

    const otherTextNeeded = (k, txtKey) => {
      if (k === 'other' && !String(txtKey || '').trim()) return true;
      return false;
    };

    if (category === 'electronics' && otherTextNeeded(electronicsType, electronicsTypeText))
      newErrors.electronicsTypeText = 'اكتب نوع الإلكترونيات';
    if (category === 'motorcycles' && otherTextNeeded(motorcycleBrand, motorcycleBrandText))
      newErrors.motorcycleBrandText = 'اكتب ماركة الدراجة';
    if (category === 'heavy_equipment' && otherTextNeeded(heavyEquipmentType, heavyEquipmentTypeText))
      newErrors.heavyEquipmentTypeText = 'اكتب نوع المعدة';
    if (category === 'solar' && otherTextNeeded(solarType, solarTypeText))
      newErrors.solarTypeText = 'اكتب نوع الطاقة الشمسية';
    if (category === 'networks' && otherTextNeeded(networkType, networkTypeText))
      newErrors.networkTypeText = 'اكتب نوع الشبكات';
    if (category === 'maintenance' && otherTextNeeded(maintenanceType, maintenanceTypeText))
      newErrors.maintenanceTypeText = 'اكتب نوع الصيانة';
    if (category === 'furniture' && otherTextNeeded(furnitureType, furnitureTypeText))
      newErrors.furnitureTypeText = 'اكتب نوع الأثاث';
    if (category === 'home_tools' && otherTextNeeded(homeToolsType, homeToolsTypeText))
      newErrors.homeToolsTypeText = 'اكتب نوع الأدوات المنزلية';
    if (category === 'clothes' && otherTextNeeded(clothesType, clothesTypeText))
      newErrors.clothesTypeText = 'اكتب نوع الملابس';
    if (category === 'animals' && otherTextNeeded(animalType, animalTypeText))
      newErrors.animalTypeText = 'اكتب نوع الحيوانات';
    if (category === 'jobs' && otherTextNeeded(jobType, jobTypeText))
      newErrors.jobTypeText = 'اكتب نوع الوظيفة';
    if (category === 'services' && otherTextNeeded(serviceType, serviceTypeText))
      newErrors.serviceTypeText = 'اكتب نوع الخدمة';

    if (auctionEnabled && (!auctionMinutes || Number(auctionMinutes) < 1))
      newErrors.auctionMinutes = 'مدة المزاد يجب أن تكون دقيقة واحدة على الأقل';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

  const submit = async () => {
    setSubmitAttempted(true);

    if (!user) return;

    if (!validateForm()) {
      alert('يرجى تصحيح الأخطاء قبل المتابعة');
      return;
    }

    setBusy(true);
    try {
      const priceYER = Number(toYER(price, currency, rates));
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

        category: String(category || '').trim(),

        // cars
        carMake: category === 'cars' ? (carMake || null) : null,
        carMakeText: category === 'cars' && carMake === 'other' ? (carMakeText.trim() || null) : null,
        carModel:
          category === 'cars'
            ? (carModel && carModel !== 'other'
                ? carModel
                : (carModelText.trim() ? slugKey(carModelText) : null))
            : null,
        carModelText:
          category === 'cars' && (carModel === 'other' || carModelText.trim())
            ? (carModelText.trim() || null)
            : null,

        // phones
        phoneBrand: category === 'phones' ? (phoneBrand || null) : null,
        phoneBrandText: category === 'phones' && phoneBrand === 'other' ? (phoneBrandText.trim() || null) : null,

        // realestate
        dealType: category === 'realestate' ? (dealType || null) : null,
        propertyType: category === 'realestate' ? (propertyType || null) : null,
        propertyTypeText:
          category === 'realestate' && propertyType === 'other' ? (propertyTypeText.trim() || null) : null,

        // other categories
        electronicsType: category === 'electronics' ? (electronicsType || null) : null,
        electronicsTypeText:
          category === 'electronics' && electronicsType === 'other' ? (electronicsTypeText.trim() || null) : null,

        motorcycleBrand: category === 'motorcycles' ? (motorcycleBrand || null) : null,
        motorcycleBrandText:
          category === 'motorcycles' && motorcycleBrand === 'other' ? (motorcycleBrandText.trim() || null) : null,

        heavyEquipmentType: category === 'heavy_equipment' ? (heavyEquipmentType || null) : null,
        heavyEquipmentTypeText:
          category === 'heavy_equipment' && heavyEquipmentType === 'other'
            ? (heavyEquipmentTypeText.trim() || null)
            : null,

        solarType: category === 'solar' ? (solarType || null) : null,
        solarTypeText: category === 'solar' && solarType === 'other' ? (solarTypeText.trim() || null) : null,

        networkType: category === 'networks' ? (networkType || null) : null,
        networkTypeText:
          category === 'networks' && networkType === 'other' ? (networkTypeText.trim() || null) : null,

        maintenanceType: category === 'maintenance' ? (maintenanceType || null) : null,
        maintenanceTypeText:
          category === 'maintenance' && maintenanceType === 'other' ? (maintenanceTypeText.trim() || null) : null,

        furnitureType: category === 'furniture' ? (furnitureType || null) : null,
        furnitureTypeText:
          category === 'furniture' && furnitureType === 'other' ? (furnitureTypeText.trim() || null) : null,

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
        serviceTypeText:
          category === 'services' && serviceType === 'other' ? (serviceTypeText.trim() || null) : null,

        // contact
        phone: String(phone || '').trim() || null,
        isWhatsapp: !!isWhatsapp,

        // pricing
        priceYER: Number(priceYER),
        originalPrice: Number(price),
        originalCurrency: currency,
        currencyBase: 'YER',

        // geo
        coords: lat != null && lng != null ? [lat, lng] : null,
        lat: lat != null ? lat : null,
        lng: lng != null ? lng : null,
        locationLabel: locationLabel || null,

        // media
        images: imageUrls,

        // user/meta
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

      // only include bids fields when auction
      if (auctionEnabled) {
        payload.currentBidYER = Number(priceYER);
        payload.bidsCount = 0;
      }

      await db.collection('listings').add(payload);

      alert('🎉 تم نشر الإعلان بنجاح!');
      window.location.href = '/';
    } catch (e) {
      console.error(e);
      alert('❌ حدث خطأ أثناء النشر. يرجى المحاولة مرة أخرى.');
    } finally {
      setBusy(false);
    }
  };

  // ===== UI: loading / gate =====
  if (loading) {
    return (
      <div className="addWrap">
        <div className="card loadingCard">
          <div className="spinner" />
          <div style={{ fontWeight: 800, marginTop: 10 }}>جاري تحميل الصفحة...</div>
        </div>

        <style jsx>{`
          .addWrap{ padding: 18px 12px; min-height: calc(100vh - 90px); display:flex; align-items:center; justify-content:center; background:#f8fafc;}
          .loadingCard{ padding: 26px; text-align:center; max-width: 520px; width:100%; }
          .spinner{ width: 34px; height: 34px; border-radius: 999px; border: 3px solid rgba(0,0,0,.12); border-top-color: #C2410C; animation: spin 1s linear infinite; margin: 0 auto;}
          @keyframes spin{ to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (!loading && !user) {
    const { login, register } = gateNextHref('/add');
    return (
      <div className="gateWrap" dir="rtl">
        <div className="gateCard">
          <div className="gateTop">
            <div className="gateIcon" aria-hidden="true">🔒</div>
            <div className="gateHead">
              <h1 className="gateTitle">تسجيل الدخول مطلوب</h1>
              <p className="gateMsg">لاستكمال إضافة إعلان جديد، سجّل دخولك أو أنشئ حسابًا خلال دقيقة.</p>
            </div>
          </div>

          <div className="gateBenefits">
            <div className="bItem"><span className="bDot" aria-hidden="true">✅</span><span>سنُعيدك تلقائيًا إلى صفحة إضافة الإعلان بعد تسجيل الدخول</span></div>
            <div className="bItem"><span className="bDot" aria-hidden="true">⚡</span><span>إضافة إعلان في دقائق مع الصور وتحديد الموقع</span></div>
            <div className="bItem"><span className="bDot" aria-hidden="true">🛡️</span><span>حماية أفضل وتقليل المحتوى المزعج</span></div>
          </div>

          <div className="gateActions">
            <Link className="gateBtnPrimary" href={login}>تسجيل الدخول</Link>
            <Link className="gateBtn" href={register}>إنشاء حساب</Link>
          </div>

          <div className="gateLinks">
            <Link className="gateLink" href="/listings">تصفّح الإعلانات</Link>
            <span className="sep" aria-hidden="true">•</span>
            <Link className="gateLink" href="/">العودة للرئيسية</Link>
          </div>
        </div>

        <style jsx>{`
          .gateWrap{
            min-height: calc(100vh - 90px);
            display:flex;
            align-items:center;
            justify-content:center;
            padding: 28px 14px;
            background:
              radial-gradient(900px 450px at 80% 10%, rgba(194,65,12,.18), transparent 60%),
              radial-gradient(700px 420px at 10% 90%, rgba(2,132,199,.10), transparent 55%),
              #f8fafc;
          }
          .gateCard{
            width: 100%;
            max-width: 760px;
            background: #fff;
            border: 1px solid rgba(0,0,0,.08);
            border-radius: 18px;
            box-shadow: 0 18px 60px rgba(0,0,0,.08);
            padding: 18px;
          }
          .gateTop{ display:flex; gap: 12px; align-items:flex-start; }
          .gateIcon{
            width: 44px; height: 44px; border-radius: 14px;
            display:flex; align-items:center; justify-content:center;
            background: rgba(194,65,12,.10);
            border: 1px solid rgba(194,65,12,.18);
            font-size: 20px;
            flex: 0 0 auto;
          }
          .gateTitle{ margin: 0; font-size: 20px; line-height: 1.2; font-weight: 900; color: #0f172a; }
          .gateMsg{ margin: 6px 0 0; color: #475569; font-size: 14px; line-height: 1.7; }
          .gateBenefits{
            margin-top: 14px; padding: 12px; border-radius: 14px;
            background: rgba(15,23,42,.03);
            border: 1px dashed rgba(0,0,0,.10);
            display: grid; gap: 8px;
          }
          .bItem{ display:flex; gap: 8px; align-items:flex-start; color:#0f172a; font-size: 13.5px; line-height: 1.7; }
          .bDot{ margin-top: 1px; flex: 0 0 auto; }
          .gateActions{ display:flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; }
          .gateBtnPrimary, .gateBtn{
            display:inline-flex; align-items:center; justify-content:center;
            padding: 12px 14px; border-radius: 14px; font-weight: 900; text-decoration:none;
            transition: transform .08s ease, box-shadow .18s ease, background .18s ease;
            min-width: 160px;
          }
          .gateBtnPrimary{ background: #C2410C; color:#fff; box-shadow: 0 10px 24px rgba(194,65,12,.24); }
          .gateBtnPrimary:hover{ transform: translateY(-1px); }
          .gateBtn{ background: #fff; color:#0f172a; border: 1px solid rgba(0,0,0,.10); }
          .gateBtn:hover{ transform: translateY(-1px); }
          .gateLinks{
            margin-top: 12px; display:flex; gap: 8px; align-items:center; justify-content:center;
            color:#64748b; font-size: 13px;
          }
          .gateLink{ color:#2563eb; text-decoration:none; font-weight: 800; }
          .gateLink:hover{ text-decoration: underline; }
          .sep{ opacity:.7; }
          @media (max-width: 520px){
            .gateCard{ padding: 14px; }
            .gateBtnPrimary, .gateBtn{ width: 100%; }
            .gateLinks{ flex-wrap: wrap; }
          }
        `}</style>
      </div>
    );
  }

  // ===== Form =====
  const CAR_MAKES = getArray(taxonomy.CAR_MAKES);
  const PHONE_BRANDS = getArray(taxonomy.PHONE_BRANDS);
  const DEAL_TYPES = getArray(taxonomy.DEAL_TYPES);
  const PROPERTY_TYPES = getArray(taxonomy.PROPERTY_TYPES);

  const ELECTRONICS_TYPES = getArray(taxonomy.ELECTRONICS_TYPES);
  const MOTORCYCLE_BRANDS = getArray(taxonomy.MOTORCYCLE_BRANDS);
  const HEAVY_EQUIPMENT_TYPES = getArray(taxonomy.HEAVY_EQUIPMENT_TYPES);
  const SOLAR_TYPES = getArray(taxonomy.SOLAR_TYPES);
  const NETWORK_TYPES = getArray(taxonomy.NETWORK_TYPES);
  const MAINTENANCE_TYPES = getArray(taxonomy.MAINTENANCE_TYPES);
  const FURNITURE_TYPES = getArray(taxonomy.FURNITURE_TYPES);
  const HOME_TOOLS_TYPES = getArray(taxonomy.HOME_TOOLS_TYPES);
  const CLOTHES_TYPES = getArray(taxonomy.CLOTHES_TYPES);
  const ANIMAL_TYPES = getArray(taxonomy.ANIMAL_TYPES);
  const JOB_TYPES = getArray(taxonomy.JOB_TYPES);
  const SERVICE_TYPES = getArray(taxonomy.SERVICE_TYPES);

  return (
    <div className="addWrap">
      <div className="container">
        <div className="headerCard">
          <h1 className="h1">إضافة إعلان جديد</h1>
          <p className="muted">أضف إعلانك ليجده الآلاف من المشترين</p>
        </div>

        <div className="grid">
          <div className="card formCard">
            <div className="sectionTitle">معلومات الإعلان</div>

            <div className="field">
              <label className="label">عنوان الإعلان <span className="req">*</span></label>
              <input
                className={`input ${errors.title ? 'err' : ''}`}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (submitAttempted) setErrors((p) => ({ ...p, title: undefined }));
                }}
                placeholder="مثال: تويوتا شاص 2014 نظيف"
                maxLength={100}
              />
              <div className="helper">
                <span>اكتب عنواناً واضحاً</span>
                <span>{title.length}/100</span>
              </div>
              {errors.title ? <div className="error">{errors.title}</div> : null}
            </div>

            <div className="field">
              <label className="label">وصف الإعلان <span className="req">*</span></label>
              <textarea
                className={`textarea ${errors.desc ? 'err' : ''}`}
                value={desc}
                onChange={(e) => {
                  setDesc(e.target.value);
                  if (submitAttempted) setErrors((p) => ({ ...p, desc: undefined }));
                }}
                placeholder="اكتب كل التفاصيل: الحالة، المواصفات، سبب البيع..."
                rows={6}
                maxLength={2000}
              />
              <div className="helper">
                <span>التفاصيل تزيد فرص البيع</span>
                <span>{desc.length}/2000</span>
              </div>
              {errors.desc ? <div className="error">{errors.desc}</div> : null}
            </div>

            <div className="row2">
              <div className="field">
                <label className="label">المحافظة <span className="req">*</span></label>
                <select
                  className={`input ${errors.govKey ? 'err' : ''}`}
                  value={govKey}
                  onChange={(e) => {
                    setGovKey(e.target.value);
                    if (submitAttempted) setErrors((p) => ({ ...p, govKey: undefined }));
                  }}
                  disabled={govsLoading}
                >
                  <option value="">{govsLoading ? 'جاري التحميل...' : 'اختر المحافظة'}</option>
                  {(govs || []).map((g) => (
                    <option key={g.key} value={g.key}>{g.nameAr}</option>
                  ))}
                </select>
                {errors.govKey ? <div className="error">{errors.govKey}</div> : null}
              </div>

              <div className="field">
                <label className="label">القسم <span className="req">*</span></label>
                <select
                  className={`input ${errors.category ? 'err' : ''}`}
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    if (submitAttempted) setErrors((p) => ({ ...p, category: undefined }));
                  }}
                  disabled={catsLoading}
                >
                  <option value="">{catsLoading ? 'جاري التحميل...' : 'اختر القسم'}</option>
                  {(cats || []).map((c) => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </select>
                {errors.category ? <div className="error">{errors.category}</div> : null}
              </div>
            </div>

            {/* ===== Category details ===== */}
            {category === 'cars' && (
              <div className="subCard">
                <div className="subTitle">تفاصيل السيارة</div>

                <div className="row2">
                  <div className="field">
                    <label className="label">الماركة <span className="req">*</span></label>
                    <select
                      className={`input ${errors.carMake ? 'err' : ''}`}
                      value={carMake}
                      onChange={(e) => {
                        setCarMake(e.target.value);
                        setCarModel('');
                        setCarModelText('');
                        if (submitAttempted) setErrors((p) => ({ ...p, carMake: undefined, carMakeText: undefined, carModelText: undefined }));
                      }}
                    >
                      <option value="">اختر الماركة</option>
                      {CAR_MAKES.map((m) => (
                        <option key={m.key} value={m.key}>{m.label}</option>
                      ))}
                      {!CAR_MAKES.length ? <option value="other">أخرى</option> : null}
                    </select>
                    {errors.carMake ? <div className="error">{errors.carMake}</div> : null}

                    {carMake === 'other' && (
                      <div style={{ marginTop: 8 }}>
                        <input
                          className={`input ${errors.carMakeText ? 'err' : ''}`}
                          value={carMakeText}
                          onChange={(e) => {
                            setCarMakeText(e.target.value);
                            if (submitAttempted) setErrors((p) => ({ ...p, carMakeText: undefined }));
                          }}
                          placeholder="اكتب الماركة"
                          maxLength={40}
                        />
                        {errors.carMakeText ? <div className="error">{errors.carMakeText}</div> : null}
                      </div>
                    )}
                  </div>

                  <div className="field">
                    <label className="label">الموديل (اختياري)</label>

                    {carMake && carMake !== 'other' && carModelsForMake.length ? (
                      <select
                        className="input"
                        value={carModel}
                        onChange={(e) => {
                          setCarModel(e.target.value);
                          if (submitAttempted) setErrors((p) => ({ ...p, carModelText: undefined }));
                        }}
                      >
                        <option value="">كل الموديلات</option>
                        {carModelsForMake.map((mm) => (
                          <option key={mm.key} value={mm.key}>{mm.label}</option>
                        ))}
                        <option value="other">أخرى</option>
                      </select>
                    ) : (
                      <input
                        className={`input ${errors.carModelText ? 'err' : ''}`}
                        value={carModelText}
                        onChange={(e) => {
                          setCarModelText(e.target.value);
                          setCarModel(e.target.value ? 'other' : '');
                          if (submitAttempted) setErrors((p) => ({ ...p, carModelText: undefined }));
                        }}
                        placeholder={carMake ? 'اكتب الموديل (مثال: هايلوكس)' : 'اختر الماركة أولاً'}
                        disabled={!carMake}
                        maxLength={50}
                      />
                    )}

                    {carMake && carMake !== 'other' && carModelsForMake.length && carModel === 'other' && (
                      <div style={{ marginTop: 8 }}>
                        <input
                          className={`input ${errors.carModelText ? 'err' : ''}`}
                          value={carModelText}
                          onChange={(e) => {
                            setCarModelText(e.target.value);
                            if (submitAttempted) setErrors((p) => ({ ...p, carModelText: undefined }));
                          }}
                          placeholder="اكتب الموديل"
                          maxLength={50}
                        />
                        {errors.carModelText ? <div className="error">{errors.carModelText}</div> : null}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {category === 'phones' && (
              <div className="subCard">
                <div className="subTitle">تفاصيل الجوال</div>

                <div className="field">
                  <label className="label">الماركة <span className="req">*</span></label>
                  <select
                    className={`input ${errors.phoneBrand ? 'err' : ''}`}
                    value={phoneBrand}
                    onChange={(e) => {
                      setPhoneBrand(e.target.value);
                      if (submitAttempted) setErrors((p) => ({ ...p, phoneBrand: undefined, phoneBrandText: undefined }));
                    }}
                  >
                    <option value="">اختر الماركة</option>
                    {PHONE_BRANDS.map((m) => (
                      <option key={m.key} value={m.key}>{m.label}</option>
                    ))}
                    {!PHONE_BRANDS.length ? <option value="other">أخرى</option> : null}
                  </select>
                  {errors.phoneBrand ? <div className="error">{errors.phoneBrand}</div> : null}

                  {phoneBrand === 'other' && (
                    <div style={{ marginTop: 8 }}>
                      <input
                        className={`input ${errors.phoneBrandText ? 'err' : ''}`}
                        value={phoneBrandText}
                        onChange={(e) => {
                          setPhoneBrandText(e.target.value);
                          if (submitAttempted) setErrors((p) => ({ ...p, phoneBrandText: undefined }));
                        }}
                        placeholder="اكتب ماركة الجوال"
                        maxLength={40}
                      />
                      {errors.phoneBrandText ? <div className="error">{errors.phoneBrandText}</div> : null}
                    </div>
                  )}
                </div>
              </div>
            )}

            {category === 'realestate' && (
              <div className="subCard">
                <div className="subTitle">تفاصيل العقار</div>

                <div className="row2">
                  <div className="field">
                    <label className="label">نوع العملية <span className="req">*</span></label>
                    <select
                      className={`input ${errors.dealType ? 'err' : ''}`}
                      value={dealType}
                      onChange={(e) => {
                        setDealType(e.target.value);
                        setPropertyType('');
                        setPropertyTypeText('');
                        if (submitAttempted) setErrors((p) => ({ ...p, dealType: undefined, propertyType: undefined, propertyTypeText: undefined }));
                      }}
                    >
                      <option value="">اختر (بيع / إيجار)</option>
                      {DEAL_TYPES.map((d) => (
                        <option key={d.key} value={d.key}>{d.label}</option>
                      ))}
                    </select>
                    {errors.dealType ? <div className="error">{errors.dealType}</div> : null}
                  </div>

                  <div className="field">
                    <label className="label">نوع العقار <span className="req">*</span></label>
                    <select
                      className={`input ${errors.propertyType ? 'err' : ''}`}
                      value={propertyType}
                      onChange={(e) => {
                        setPropertyType(e.target.value);
                        if (submitAttempted) setErrors((p) => ({ ...p, propertyType: undefined, propertyTypeText: undefined }));
                      }}
                      disabled={!dealType}
                      title={!dealType ? 'اختر بيع/إيجار أولاً' : ''}
                    >
                      <option value="">{!dealType ? 'اختر العملية أولاً' : 'اختر نوع العقار'}</option>
                      {PROPERTY_TYPES.map((p) => (
                        <option key={p.key} value={p.key}>{p.label}</option>
                      ))}
                      <option value="other">أخرى</option>
                    </select>
                    {errors.propertyType ? <div className="error">{errors.propertyType}</div> : null}

                    {propertyType === 'other' && (
                      <div style={{ marginTop: 8 }}>
                        <input
                          className={`input ${errors.propertyTypeText ? 'err' : ''}`}
                          value={propertyTypeText}
                          onChange={(e) => {
                            setPropertyTypeText(e.target.value);
                            if (submitAttempted) setErrors((p) => ({ ...p, propertyTypeText: undefined }));
                          }}
                          placeholder="اكتب نوع العقار"
                          maxLength={50}
                        />
                        {errors.propertyTypeText ? <div className="error">{errors.propertyTypeText}</div> : null}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Optional details for other categories */}
            {category === 'electronics' && (
              <div className="subCard">
                <div className="subTitle">تفاصيل الإلكترونيات (اختياري)</div>
                <select className="input" value={electronicsType} onChange={(e)=>setElectronicsType(e.target.value)}>
                  <option value="">اختر النوع</option>
                  {ELECTRONICS_TYPES.map((x)=> <option key={x.key} value={x.key}>{x.label}</option>)}
                  <option value="other">أخرى</option>
                </select>
                {electronicsType === 'other' && (
                  <div style={{ marginTop: 8 }}>
                    <input className={`input ${errors.electronicsTypeText ? 'err':''}`} value={electronicsTypeText} onChange={(e)=>setElectronicsTypeText(e.target.value)} placeholder="اكتب النوع" maxLength={60}/>
                    {errors.electronicsTypeText ? <div className="error">{errors.electronicsTypeText}</div> : null}
                  </div>
                )}
              </div>
            )}

            {category === 'motorcycles' && (
              <div className="subCard">
                <div className="subTitle">تفاصيل الدراجة (اختياري)</div>
                <select className="input" value={motorcycleBrand} onChange={(e)=>setMotorcycleBrand(e.target.value)}>
                  <option value="">اختر الماركة</option>
                  {MOTORCYCLE_BRANDS.map((x)=> <option key={x.key} value={x.key}>{x.label}</option>)}
                  <option value="other">أخرى</option>
                </select>
                {motorcycleBrand === 'other' && (
                  <div style={{ marginTop: 8 }}>
                    <input className={`input ${errors.motorcycleBrandText ? 'err':''}`} value={motorcycleBrandText} onChange={(e)=>setMotorcycleBrandText(e.target.value)} placeholder="اكتب الماركة" maxLength={60}/>
                    {errors.motorcycleBrandText ? <div className="error">{errors.motorcycleBrandText}</div> : null}
                  </div>
                )}
              </div>
            )}

            {category === 'heavy_equipment' && (
              <div className="subCard">
                <div className="subTitle">تفاصيل المعدات (اختياري)</div>
                <select className="input" value={heavyEquipmentType} onChange={(e)=>setHeavyEquipmentType(e.target.value)}>
                  <option value="">اختر النوع</option>
                  {HEAVY_EQUIPMENT_TYPES.map((x)=> <option key={x.key} value={x.key}>{x.label}</option>)}
                  <option value="other">أخرى</option>
                </select>
                {heavyEquipmentType === 'other' && (
                  <div style={{ marginTop: 8 }}>
                    <input className={`input ${errors.heavyEquipmentTypeText ? 'err':''}`} value={heavyEquipmentTypeText} onChange={(e)=>setHeavyEquipmentTypeText(e.target.value)} placeholder="اكتب النوع" maxLength={60}/>
                    {errors.heavyEquipmentTypeText ? <div className="error">{errors.heavyEquipmentTypeText}</div> : null}
                  </div>
                )}
              </div>
            )}

            {category === 'solar' && (
              <div className="subCard">
                <div className="subTitle">تفاصيل الطاقة (اختياري)</div>
                <select className="input" value={solarType} onChange={(e)=>setSolarType(e.target.value)}>
                  <option value="">اختر الفئة</option>
                  {SOLAR_TYPES.map((x)=> <option key={x.key} value={x.key}>{x.label}</option>)}
                  <option value="other">أخرى</option>
                </select>
                {solarType === 'other' && (
                  <div style={{ marginTop: 8 }}>
                    <input className={`input ${errors.solarTypeText ? 'err':''}`} value={solarTypeText} onChange={(e)=>setSolarTypeText(e.target.value)} placeholder="اكتب الفئة" maxLength={60}/>
                    {errors.solarTypeText ? <div className="error">{errors.solarTypeText}</div> : null}
                  </div>
                )}
              </div>
            )}

            {category === 'networks' && (
              <div className="subCard">
                <div className="subTitle">تفاصيل الشبكات (اختياري)</div>
                <select className="input" value={networkType} onChange={(e)=>setNetworkType(e.target.value)}>
                  <option value="">اختر الفئة</option>
                  {NETWORK_TYPES.map((x)=> <option key={x.key} value={x.key}>{x.label}</option>)}
                  <option value="other">أخرى</option>
                </select>
                {networkType === 'other' && (
                  <div style={{ marginTop: 8 }}>
                    <input className={`input ${errors.networkTypeText ? 'err':''}`} value={networkTypeText} onChange={(e)=>setNetworkTypeText(e.target.value)} placeholder="اكتب الفئة" maxLength={60}/>
                    {errors.networkTypeText ? <div className="error">{errors.networkTypeText}</div> : null}
                  </div>
                )}
              </div>
            )}

            {category === 'maintenance' && (
              <div className="subCard">
                <div className="subTitle">تفاصيل الصيانة (اختياري)</div>
                <select className="input" value={maintenanceType} onChange={(e)=>setMaintenanceType(e.target.value)}>
                  <option value="">اختر النوع</option>
                  {MAINTENANCE_TYPES.map((x)=> <option key={x.key} value={x.key}>{x.label}</option>)}
                  <option value="other">أخرى</option>
                </select>
                {maintenanceType === 'other' && (
                  <div style={{ marginTop: 8 }}>
                    <input className={`input ${errors.maintenanceTypeText ? 'err':''}`} value={maintenanceTypeText} onChange={(e)=>setMaintenanceTypeText(e.target.value)} placeholder="اكتب النوع" maxLength={60}/>
                    {errors.maintenanceTypeText ? <div className="error">{errors.maintenanceTypeText}</div> : null}
                  </div>
                )}
              </div>
            )}

            {category === 'furniture' && (
              <div className="subCard">
                <div className="subTitle">تفاصيل الأثاث (اختياري)</div>
                <select className="input" value={furnitureType} onChange={(e)=>setFurnitureType(e.target.value)}>
                  <option value="">اختر النوع</option>
                  {FURNITURE_TYPES.map((x)=> <option key={x.key} value={x.key}>{x.label}</option>)}
                  <option value="other">أخرى</option>
                </select>
                {furnitureType === 'other' && (
                  <div style={{ marginTop: 8 }}>
                    <input className={`input ${errors.furnitureTypeText ? 'err':''}`} value={furnitureTypeText} onChange={(e)=>setFurnitureTypeText(e.target.value)} placeholder="اكتب النوع" maxLength={60}/>
                    {errors.furnitureTypeText ? <div className="error">{errors.furnitureTypeText}</div> : null}
                  </div>
                )}
              </div>
            )}

            {category === 'home_tools' && (
              <div className="subCard">
                <div className="subTitle">تفاصيل الأدوات (اختياري)</div>
                <select className="input" value={homeToolsType} onChange={(e)=>setHomeToolsType(e.target.value)}>
                  <option value="">اختر النوع</option>
                  {HOME_TOOLS_TYPES.map((x)=> <option key={x.key} value={x.key}>{x.label}</option>)}
                  <option value="other">أخرى</option>
                </select>
                {homeToolsType === 'other' && (
                  <div style={{ marginTop: 8 }}>
                    <input className={`input ${errors.homeToolsTypeText ? 'err':''}`} value={homeToolsTypeText} onChange={(e)=>setHomeToolsTypeText(e.target.value)} placeholder="اكتب النوع" maxLength={60}/>
                    {errors.homeToolsTypeText ? <div className="error">{errors.homeToolsTypeText}</div> : null}
                  </div>
                )}
              </div>
            )}

            {category === 'clothes' && (
              <div className="subCard">
                <div className="subTitle">تفاصيل الملابس (اختياري)</div>
                <select className="input" value={clothesType} onChange={(e)=>setClothesType(e.target.value)}>
                  <option value="">اختر النوع</option>
                  {CLOTHES_TYPES.map((x)=> <option key={x.key} value={x.key}>{x.label}</option>)}
                  <option value="other">أخرى</option>
                </select>
                {clothesType === 'other' && (
                  <div style={{ marginTop: 8 }}>
                    <input className={`input ${errors.clothesTypeText ? 'err':''}`} value={clothesTypeText} onChange={(e)=>setClothesTypeText(e.target.value)} placeholder="اكتب النوع" maxLength={60}/>
                    {errors.clothesTypeText ? <div className="error">{errors.clothesTypeText}</div> : null}
                  </div>
                )}
              </div>
            )}

            {category === 'animals' && (
              <div className="subCard">
                <div className="subTitle">تفاصيل الحيوانات (اختياري)</div>
                <select className="input" value={animalType} onChange={(e)=>setAnimalType(e.target.value)}>
                  <option value="">اختر النوع</option>
                  {ANIMAL_TYPES.map((x)=> <option key={x.key} value={x.key}>{x.label}</option>)}
                  <option value="other">أخرى</option>
                </select>
                {animalType === 'other' && (
                  <div style={{ marginTop: 8 }}>
                    <input className={`input ${errors.animalTypeText ? 'err':''}`} value={animalTypeText} onChange={(e)=>setAnimalTypeText(e.target.value)} placeholder="اكتب النوع" maxLength={60}/>
                    {errors.animalTypeText ? <div className="error">{errors.animalTypeText}</div> : null}
                  </div>
                )}
              </div>
            )}

            {category === 'jobs' && (
              <div className="subCard">
                <div className="subTitle">تفاصيل الوظيفة (اختياري)</div>
                <select className="input" value={jobType} onChange={(e)=>setJobType(e.target.value)}>
                  <option value="">اختر النوع</option>
                  {JOB_TYPES.map((x)=> <option key={x.key} value={x.key}>{x.label}</option>)}
                  <option value="other">أخرى</option>
                </select>
                {jobType === 'other' && (
                  <div style={{ marginTop: 8 }}>
                    <input className={`input ${errors.jobTypeText ? 'err':''}`} value={jobTypeText} onChange={(e)=>setJobTypeText(e.target.value)} placeholder="اكتب النوع" maxLength={60}/>
                    {errors.jobTypeText ? <div className="error">{errors.jobTypeText}</div> : null}
                  </div>
                )}
              </div>
            )}

            {category === 'services' && (
              <div className="subCard">
                <div className="subTitle">تفاصيل الخدمة (اختياري)</div>
                <select className="input" value={serviceType} onChange={(e)=>setServiceType(e.target.value)}>
                  <option value="">اختر النوع</option>
                  {SERVICE_TYPES.map((x)=> <option key={x.key} value={x.key}>{x.label}</option>)}
                  <option value="other">أخرى</option>
                </select>
                {serviceType === 'other' && (
                  <div style={{ marginTop: 8 }}>
                    <input className={`input ${errors.serviceTypeText ? 'err':''}`} value={serviceTypeText} onChange={(e)=>setServiceTypeText(e.target.value)} placeholder="اكتب النوع" maxLength={60}/>
                    {errors.serviceTypeText ? <div className="error">{errors.serviceTypeText}</div> : null}
                  </div>
                )}
              </div>
            )}

            {/* ===== Price & contact ===== */}
            <div className="sectionTitle" style={{ marginTop: 18 }}>السعر والتواصل</div>

            <div className="row2">
              <div className="field">
                <label className="label">السعر <span className="req">*</span></label>
                <input
                  className={`input ${errors.price ? 'err' : ''}`}
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    if (submitAttempted) setErrors((p) => ({ ...p, price: undefined }));
                  }}
                  placeholder="مثال: 3500000"
                  inputMode="numeric"
                />
                {errors.price ? <div className="error">{errors.price}</div> : null}
              </div>

              <div className="field">
                <label className="label">العملة</label>
                <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option value="YER">ريال يمني</option>
                  <option value="SAR">ريال سعودي</option>
                  <option value="USD">دولار</option>
                </select>
              </div>
            </div>

            {convertedPrice ? (
              <div className="priceBox">
                <div><b>المعادِل (تقريباً):</b></div>
                <div className="pRow">
                  <span>YER</span><span>{convertedPrice.YER}</span>
                </div>
                <div className="pRow">
                  <span>SAR</span><span>{convertedPrice.SAR || '-'}</span>
                </div>
                <div className="pRow">
                  <span>USD</span><span>{convertedPrice.USD || '-'}</span>
                </div>
              </div>
            ) : null}

            <div className="row2">
              <div className="field">
                <label className="label">رقم التواصل <span className="req">*</span></label>
                <input
                  className={`input ${errors.phone ? 'err' : ''}`}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (submitAttempted) setErrors((p) => ({ ...p, phone: undefined }));
                  }}
                  placeholder="مثال: 771234567"
                  inputMode="tel"
                />
                {errors.phone ? <div className="error">{errors.phone}</div> : null}
              </div>

              <div className="field">
                <label className="label">واتساب</label>
                <div className="toggleRow">
                  <input
                    id="whats"
                    type="checkbox"
                    checked={isWhatsapp}
                    onChange={(e) => setIsWhatsapp(e.target.checked)}
                  />
                  <label htmlFor="whats">نفس الرقم واتساب</label>
                </div>
              </div>
            </div>

            {/* ===== Images ===== */}
            <div className="sectionTitle" style={{ marginTop: 18 }}>الصور</div>

            <div className="field">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => onPickImages(e.target.files)}
              />
              <div className="helper">يمكنك رفع حتى 12 صورة.</div>

              {imagePreviews.length ? (
                <div className="imgs">
                  {imagePreviews.map((src, idx) => (
                    <div key={idx} className="imgItem">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="imgPrev" />
                      <button type="button" className="rmImg" onClick={() => removeImage(idx)}>حذف</button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* ===== Map ===== */}
            <div className="sectionTitle" style={{ marginTop: 18 }}>الموقع على الخريطة</div>
            <div className="mapWrap">
              <LocationPicker onPick={onPick} initialCoords={coords} />
              {locationLabel ? <div className="mapLabel">📍 {locationLabel}</div> : null}
            </div>

            {/* ===== Auction ===== */}
            <div className="sectionTitle" style={{ marginTop: 18 }}>المزاد (اختياري)</div>
            <div className="subCard">
              <div className="toggleRow">
                <input id="auc" type="checkbox" checked={auctionEnabled} onChange={(e) => setAuctionEnabled(e.target.checked)} />
                <label htmlFor="auc">تفعيل المزاد لهذا الإعلان</label>
              </div>

              {auctionEnabled ? (
                <div className="row2" style={{ marginTop: 10 }}>
                  <div className="field">
                    <label className="label">مدة المزاد بالدقائق <span className="req">*</span></label>
                    <input
                      className={`input ${errors.auctionMinutes ? 'err' : ''}`}
                      value={auctionMinutes}
                      onChange={(e) => setAuctionMinutes(e.target.value)}
                      inputMode="numeric"
                    />
                    {errors.auctionMinutes ? <div className="error">{errors.auctionMinutes}</div> : null}
                  </div>

                  <div className="field">
                    <label className="label">السعر الابتدائي</label>
                    <div className="muted" style={{ marginTop: 10 }}>سيستخدم نفس سعر الإعلان كسعر ابتدائي للمزاد.</div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="actions">
              <button
                type="button"
                className="btnPrimary"
                onClick={submit}
                disabled={busy}
              >
                {busy ? 'جاري النشر...' : 'نشر الإعلان'}
              </button>

              <Link className="btn" href="/">إلغاء</Link>
            </div>
          </div>

          <div className="card sideCard">
            <div className="sectionTitle">نصائح سريعة</div>
            <ul className="tips">
              <li>📸 صور واضحة تزيد الاتصالات.</li>
              <li>📝 اذكر كل التفاصيل المهمة.</li>
              <li>💰 سعر واقعي = بيع أسرع.</li>
              <li>📍 تحديد موقع دقيق يساعد المشتري.</li>
            </ul>

            <div className="divider" />

            <div className="muted">
              حسابك: <b>{user?.displayName || user?.email || user?.uid}</b>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .addWrap{
          padding: 16px 0 26px;
          background: #f8fafc;
          min-height: calc(100vh - 90px);
        }
        .container{ max-width: 1080px; margin: 0 auto; padding: 0 12px; }
        .headerCard{
          background:#fff;
          border: 1px solid rgba(0,0,0,.08);
          border-radius: 14px;
          padding: 14px 14px;
          margin-bottom: 12px;
        }
        .h1{ margin:0; font-size: 20px; font-weight: 900; }
        .muted{ color:#64748b; margin: 6px 0 0; }
        .grid{ display:grid; grid-template-columns: 1.5fr .7fr; gap: 12px; }
        .card{
          background:#fff;
          border: 1px solid rgba(0,0,0,.08);
          border-radius: 14px;
          padding: 14px;
        }
        .formCard{ padding: 14px; }
        .sideCard{ position: sticky; top: 12px; height: fit-content; }
        .sectionTitle{ font-weight: 900; margin: 0 0 10px; }
        .field{ margin-bottom: 12px; }
        .label{ display:block; font-weight: 800; margin-bottom: 6px; }
        .req{ color: #C2410C; }
        .input, .textarea{
          width: 100%;
          border: 1px solid rgba(0,0,0,.12);
          border-radius: 12px;
          padding: 10px 12px;
          outline: none;
          background:#fff;
          font-size: 14px;
        }
        .textarea{ resize: vertical; min-height: 120px; }
        .input:focus, .textarea:focus{ border-color: rgba(194,65,12,.55); box-shadow: 0 0 0 3px rgba(194,65,12,.10); }
        .err{ border-color: rgba(220,38,38,.65) !important; box-shadow: 0 0 0 3px rgba(220,38,38,.10) !important; }
        .helper{ display:flex; justify-content: space-between; font-size: 12.5px; color:#64748b; margin-top: 6px; }
        .error{ color: #dc2626; font-size: 12.5px; margin-top: 6px; font-weight: 700; }
        .row2{ display:grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .subCard{
          border: 1px dashed rgba(0,0,0,.14);
          border-radius: 14px;
          padding: 12px;
          background: rgba(15,23,42,.02);
          margin: 10px 0 12px;
        }
        .subTitle{ font-weight: 900; margin-bottom: 10px; }
        .toggleRow{ display:flex; gap: 8px; align-items:center; font-weight: 800; color:#0f172a; }
        .actions{ display:flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; }
        .btnPrimary{
          background: #C2410C;
          color: #fff;
          border: none;
          border-radius: 12px;
          padding: 11px 14px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 10px 24px rgba(194,65,12,.18);
        }
        .btnPrimary:disabled{ opacity: .7; cursor: not-allowed; }
        .btn{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          background: #fff;
          color:#0f172a;
          border: 1px solid rgba(0,0,0,.12);
          border-radius: 12px;
          padding: 11px 14px;
          font-weight: 900;
          text-decoration:none;
        }
        .priceBox{
          border: 1px solid rgba(0,0,0,.08);
          border-radius: 14px;
          padding: 10px 12px;
          background: rgba(2,132,199,.05);
          margin-top: 8px;
        }
        .pRow{ display:flex; justify-content: space-between; margin-top: 6px; font-weight: 800; }
        .imgs{
          display:grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 10px;
        }
        .imgItem{
          border: 1px solid rgba(0,0,0,.10);
          border-radius: 14px;
          overflow: hidden;
          background:#fff;
        }
        .imgPrev{ width:100%; height: 120px; object-fit: cover; display:block; }
        .rmImg{
          width: 100%;
          border: none;
          background: rgba(220,38,38,.10);
          color: #b91c1c;
          font-weight: 900;
          padding: 8px 10px;
          cursor: pointer;
        }
        .mapWrap{
          border: 1px solid rgba(0,0,0,.10);
          border-radius: 14px;
          overflow:hidden;
          background:#fff;
        }
        .mapLabel{
          padding: 10px 12px;
          border-top: 1px solid rgba(0,0,0,.08);
          color:#0f172a;
          font-weight: 800;
        }
        .tips{ margin: 0; padding: 0 18px; color:#0f172a; line-height: 1.9; }
        .divider{ height: 1px; background: rgba(0,0,0,.08); margin: 12px 0; }

        @media (max-width: 900px){
          .grid{ grid-template-columns: 1fr; }
          .sideCard{ position: static; }
        }
        @media (max-width: 520px){
          .row2{ grid-template-columns: 1fr; }
          .imgs{ grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  );
}
