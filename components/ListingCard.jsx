'use client';

import Link from 'next/link';
import Image from 'next/image';
import Price from '@/components/Price';

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

export default function ListingCard({ listing, variant = 'grid', view }) {
  // ✅ توافق: بعض الصفحات قد ترسل view بدل variant
  const mode = (view || variant || 'grid');
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

  const href = `/listing/${listing?.id}`;

  // ✅ وضع القائمة: كرت أفقي (مناسب للجوال)
  if (mode === 'list') {
    return (
      <Link href={href} className="card lc-list" style={{ textDecoration: 'none' }}>
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
            {/* عنوان + سعر (سطر واحد محترم) */}
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div className="lc-title" style={{ flex: 1, minWidth: 0 }}>
                {listing?.title || 'بدون عنوان'}
              </div>

              <div className="lc-price" aria-label="السعر">
                <Price
                  priceYER={Number(priceYER) || 0}
                  originalPrice={listing?.originalPrice}
                  originalCurrency={listing?.originalCurrency || 'YER'}
                />
              </div>
            </div>

            {/* سطر معلومات خفيف */}
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <span className="muted" style={{ fontSize: 12 }}>
                {city ? `📍 ${city}` : '📍 —'}
              </span>
              <span className="muted" style={{ fontSize: 12 }}>
                👁️ {Number(listing?.views || 0)}
              </span>
            </div>

            {/* القسم */}
            <div style={{ marginTop: 8 }}>
              <span className="badge">{getCategoryLabel(listing)}</span>
            </div>

            {/* وصف مختصر (سطرين) */}
            <div className="muted lc-desc" style={{ marginTop: 8 }}>{shortDesc || ""}</div>
          </div>
        </div>

        <style jsx>{`
          .lc-list{
            display: block;
            border-radius: 14px;
            transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease;
            border: 1px solid rgba(226,232,240,0.95);
          }
          .lc-list:hover{
            transform: translateY(-1px);
            box-shadow: 0 12px 22px rgba(0,0,0,0.10);
            border-color: rgba(148,163,184,0.6);
          }
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
          .lc-price{
            font-weight: 950;
            white-space: nowrap;
            font-size: 14px;
            line-height: 1.1;
            padding-top: 2px;
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

          <div style={{ fontWeight: 800 }}>
            <Price
              priceYER={Number(priceYER) || 0}
              originalPrice={listing?.originalPrice}
              originalCurrency={listing?.originalCurrency || 'YER'}
            />
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
          border-radius: 14px;
          transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease;
          border: 1px solid rgba(226,232,240,0.95);
        }
        .lc-grid:hover{
          transform: translateY(-1px);
          box-shadow: 0 12px 22px rgba(0,0,0,0.10);
          border-color: rgba(148,163,184,0.6);
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
