'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRates } from '@/lib/rates';

// ✅ تحويل slug إلى اسم عربي (fallback فقط إذا ما توفر categoryName)
const CATEGORY_LABELS = {
  cars: 'سيارات',
  realestate: 'عقارات',
  real_estate: 'عقارات',
  electronics: 'إلكترونيات',
  motorcycles: 'دراجات نارية',
  heavy_equipment: 'معدات ثقيلة',
  solar: 'طاقة شمسية',
  networks: 'نت وشبكات',
  maintenance: 'صيانة',
  furniture: 'أثاث',
  clothes: 'ملابس',
  animals: 'حيوانات وطيور',
  jobs: 'وظائف',
  services: 'خدمات',
  other: 'أخرى / غير مصنف',
};

function getCategoryLabel(listing) {
  const raw = String(listing?.categoryName || listing?.category || '').trim();
  if (!raw) return 'قسم';
  // لو كان أصلاً عربي نخليه
  if (/[\u0600-\u06FF]/.test(raw)) return raw;
  return CATEGORY_LABELS[raw] || raw;
}

// ✅ عرض السعر: العملة الأصلية كعملة رئيسية + تحويلات تحتها (بدون إجبار YER كعملة عرض)
const FALLBACK_SAR_TO_YER = 425;
const FALLBACK_USD_TO_YER = 1632;

function getYerPerSAR(rates) {
  const r = rates || {};
  const v = Number(r.SAR || r.sar || r.sarRate || r.sarToYer || r.sar_yer || FALLBACK_SAR_TO_YER);
  return v > 0 ? v : FALLBACK_SAR_TO_YER;
}

function getYerPerUSD(rates) {
  const r = rates || {};
  const v = Number(r.USD || r.usd || r.usdRate || r.usdToYer || r.usd_yer || FALLBACK_USD_TO_YER);
  return v > 0 ? v : FALLBACK_USD_TO_YER;
}

function currencyLabel(cur) {
  const c = String(cur || 'YER').toUpperCase();
  if (c === 'SAR') return 'ريال سعودي';
  if (c === 'USD') return 'دولار';
  return 'ريال يمني';
}

function formatAmount(cur, value) {
  const c = String(cur || 'YER').toUpperCase();
  const n = Number(value);
  if (!isFinite(n) || n <= 0) return '—';

  if (c === 'YER') {
    return new Intl.NumberFormat('ar-YE', { maximumFractionDigits: 0 }).format(Math.round(n));
  }
  if (c === 'USD') {
    return new Intl.NumberFormat('ar-YE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  }
  // SAR وغيره
  return new Intl.NumberFormat('ar-YE', { maximumFractionDigits: 2 }).format(n);
}

function computePriceDisplay(listing, priceYER, rates) {
  const yer = Math.max(0, Number(priceYER) || 0);
  const yerPerSAR = getYerPerSAR(rates);
  const yerPerUSD = getYerPerUSD(rates);

  const sar = yerPerSAR > 0 ? yer / yerPerSAR : null;
  const usd = yerPerUSD > 0 ? yer / yerPerUSD : null;

  const rawCur = String(listing?.originalCurrency || 'YER').toUpperCase();
  const rawOrig = listing?.originalPrice;

  const hasOriginal = rawOrig !== undefined && rawOrig !== null && String(rawOrig).trim() !== '';
  const origNum = Number(rawOrig);

  let mainCur = rawCur || 'YER';
  let mainVal = null;

  if (hasOriginal && isFinite(origNum) && origNum > 0) {
    mainVal = origNum;
  } else {
    if (mainCur === 'SAR') mainVal = sar;
    else if (mainCur === 'USD') mainVal = usd;
    else mainVal = yer;

    if (!isFinite(Number(mainVal)) || Number(mainVal) <= 0) {
      mainCur = 'YER';
      mainVal = yer;
    }
  }

  const all = { YER: yer, SAR: sar, USD: usd };

  const main = {
    cur: mainCur,
    num: formatAmount(mainCur, mainVal),
    label: currencyLabel(mainCur),
  };

  const subs = ['YER', 'SAR', 'USD']
    .filter((c) => c !== mainCur)
    .map((c) => ({
      cur: c,
      num: formatAmount(c, all[c]),
      label: currencyLabel(c),
    }));

  return { main, subs };
}

export default function ListingCard({ listing, variant = 'grid' }) {
  const rates = useRates();
  const img = (Array.isArray(listing?.images) && listing.images[0]) || listing?.image || null;

  // المدينة (إن وجدت)
  const city = listing?.city || listing?.region || '';

  // وصف مختصر
  const rawDesc = String(listing?.description || '');
  const shortDesc = rawDesc.length > 90 ? rawDesc.slice(0, 90) + '…' : rawDesc;

  /**
   * ✅ السعر المعتمد عندنا: YER فقط
   */
  let priceYER = listing?.priceYER ?? listing?.currentBidYER ?? 0;

  // Fallback للإعلانات القديمة (إن وجدت)
  if (!priceYER && listing?.originalPrice) {
    const p = Number(listing.originalPrice) || 0;
    const cur = String(listing.originalCurrency || 'YER').toUpperCase();

    const SAR_TO_YER = 425;
    const USD_TO_YER = 1632;

    if (cur === 'SAR') priceYER = p * SAR_TO_YER;
    else if (cur === 'USD') priceYER = p * USD_TO_YER;
    else priceYER = p;
  }

  const priceView = useMemo(() => {
    return computePriceDisplay(listing, Number(priceYER) || 0, rates);
  }, [listing?.originalPrice, listing?.originalCurrency, priceYER, rates]);

  const href = `/listing/${listing?.id}`;

  // ✅ وضع القائمة: كرت أفقي (مناسب للجوال)
  if (variant === 'list') {
    return (
      <Link href={href} className="card lc-list" style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none' }}>
        <div className="row lc-list-row" style={{ gap: 12, alignItems: 'center' }}>
          {/* صورة */}
          <div className="lc-thumb">
            {img ? (
              <Image
                src={img}
                alt={listing?.title || 'إعلان'}
                className="lc-thumb-img"
                width={120}
                height={95}
                style={{ objectFit: 'cover' }}
                loading="lazy"
              />
            ) : (
              <div className="lc-thumb-empty">بدون صورة</div>
            )}
          </div>

          {/* محتوى */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="lc-title">
              {listing?.title || 'بدون عنوان'}
            </div>

            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <span className="muted" style={{ fontSize: 12 }}>
                {city ? `📍 ${city}` : '📍 —'}
              </span>
              <span className="muted" style={{ fontSize: 12 }}>
                👁️ {Number(listing?.views || 0)}
              </span>
            </div>

            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <span className="badge">{getCategoryLabel(listing)}</span>
              <div className="lc-price">
                <div className="lc-priceMain">
                  <span className="lc-priceNum" dir="ltr">{priceView.main.num}</span> {priceView.main.label}
                </div>
                {priceView.subs?.length ? (
                  <div className="lc-priceSub">
                    ≈ {priceView.subs.map((x) => `${x.num} ${x.label}`).join(' • ')}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="muted lc-desc" style={{ marginTop: 8 }}>{shortDesc || ""}</div>
          </div>
        </div>

        <style jsx>{`
          .lc-list-row { flex-wrap: nowrap; }
          .lc-thumb {
            width: 120px;
            height: 95px;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
            background: #ffffff;
            flex: 0 0 auto;
          }
          .lc-thumb-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }
          .lc-thumb-empty{
            width: 100%;
            height: 100%;
            display:flex;
            align-items:center;
            justify-content:center;
            color:#94a3b8;
            font-weight:800;
            font-size:12px;
          }
          .lc-title{
            font-weight: 900;
            font-size: 15px;
            line-height: 1.4;
            min-height: 42px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .lc-desc{
            font-size: 13px;
            line-height: 1.5;
            min-height: 40px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .lc-priceMain{
            font-weight: 900;
            font-size: 14px;
            line-height: 1.15;
            text-align: right;
            direction: rtl;
          }
          .lc-priceNum{
            direction: ltr;
            unicode-bidi: isolate;
            font-variant-numeric: tabular-nums;
          }
          .lc-priceSub{
            margin-top: 2px;
            font-size: 11px;
            color: #64748b;
            line-height: 1.25;
            text-align: right;
            direction: rtl;
          }

          @media (max-width: 480px) {
            .lc-thumb { width: 105px; height: 88px; }
            .lc-title { font-size: 14px; min-height: 39px; }
          }
        `}</style>
      </Link>
    );
  }

  // ✅ وضع الشبكة: كرت عمودي (مثل الرئيسية)
  return (
    <Link href={href} className="card lc-grid" style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none' }}>
      {/* الصورة */}
      {img ? (
        <div className="lc-imgWrap">
          <Image
            src={img}
            alt={listing?.title || 'إعلان'}
            className="lc-img"
            width={300}
            height={200}
            style={{ objectFit: 'cover' }}
            loading="lazy"
          />
        </div>
      ) : (
        <div className="lc-imgEmpty">بدون صورة</div>
      )}

      <div className="lc-body" style={{ marginTop: 10 }}>
        {/* العنوان */}
        <div className="lc-title">
          {listing?.title || 'بدون عنوان'}
        </div>

        {/* المدينة + عدد المشاهدات */}
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <span className="muted" style={{ fontSize: 12 }}>
            {city ? `📍 ${city}` : '📍 —'}
          </span>
          <span className="muted" style={{ fontSize: 12 }}>
            👁️ {Number(listing?.views || 0)}
          </span>
        </div>

        {/* القسم + السعر */}
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <span className="badge">{getCategoryLabel(listing)}</span>

                        <div className="lc-price">
                <div className="lc-priceMain">
                  <span className="lc-priceNum" dir="ltr">{priceView.main.num}</span> {priceView.main.label}
                </div>
                {priceView.subs?.length ? (
                  <div className="lc-priceSub">
                    ≈ {priceView.subs.map((x) => `${x.num} ${x.label}`).join(' • ')}
                  </div>
                ) : null}
              </div>
        </div>

        {/* وصف مختصر */}
        <p className="muted lc-desc" style={{ marginTop: 8, marginBottom: 0 }}>{shortDesc || ""}</p>
      </div>

      <style jsx>{`
        .lc-grid{
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .lc-body{
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        /* ✅ تم تعديل هذا الجزء لتوحيد الارتفاع */
        .lc-imgWrap{
          overflow: hidden;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          height: 200px; /* ارتفاع ثابت للحاوية */
          width: 100%;
          position: relative;
        }
        .lc-img{
          width: 100%;
          height: 100%; /* تملأ الحاوية بالكامل */
          object-fit: cover;
          display: block;
        }
        .lc-imgEmpty{
          height: 200px; /* نفس ارتفاع الصورة */
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          display:flex;
          align-items:center;
          justify-content:center;
          color:#94a3b8;
          font-weight:900;
          font-size:13px;
        }

        .lc-title{
          font-weight: 900;
          margin-bottom: 4px;
          line-height: 1.4;
          min-height: 42px;
          font-size: 15px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .lc-desc{
          font-size: 13px;
          line-height: 1.5;
          min-height: 40px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .lc-priceMain{
          font-weight: 900;
          font-size: 14px;
          line-height: 1.15;
          text-align: right;
          direction: rtl;
        }
        .lc-priceNum{
          direction: ltr;
          unicode-bidi: isolate;
          font-variant-numeric: tabular-nums;
        }
        .lc-priceSub{
          margin-top: 2px;
          font-size: 11px;
          color: #64748b;
          line-height: 1.25;
          text-align: right;
          direction: rtl;
        }

        @media (max-width: 768px) {
          /* تصغير الارتفاع قليلاً في التابلت */
          .lc-imgWrap, .lc-imgEmpty { height: 170px; }
        }
        @media (max-width: 480px) {
          /* تصغير الارتفاع في الجوال */
          .lc-imgWrap, .lc-imgEmpty { height: 155px; }
          .lc-title { font-size: 14px; min-height: 39px; }
        }
      `}</style>
    </Link>
  );
}
