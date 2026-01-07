// components/ListingCard.jsx
'use client';

import Link from 'next/link';
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

export default function ListingCard({ listing, variant = 'grid' }) {
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
  if (variant === 'list') {
    return (
      <Link href={href} className="card lc-list" style={{ display: 'block', textDecoration: 'none' }}>
        <div className="row lc-list-row" style={{ gap: 12, alignItems: 'center' }}>
          {/* صورة */}
          <div className="lc-thumb">
            {img ? (
              <img
                src={img}
                alt={listing?.title || 'إعلان'}
                className="lc-thumb-img"
                loading="lazy"
                decoding="async"
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
              <div style={{ fontWeight: 800 }}>
                <Price
                  priceYER={Number(priceYER) || 0}
                  originalPrice={listing?.originalPrice}
                  originalCurrency={listing?.originalCurrency || 'YER'}
                />
              </div>
            </div>

            {shortDesc ? (
              <div className="muted lc-desc" style={{ marginTop: 8 }}>
                {shortDesc}
              </div>
            ) : null}
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
            background: #f8fafc;
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
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .lc-desc{
            font-size: 13px;
            line-height: 1.5;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          @media (max-width: 480px) {
            .lc-thumb { width: 105px; height: 88px; }
            .lc-title { font-size: 14px; }
          }
        `}</style>
      </Link>
    );
  }

  // ✅ وضع الشبكة: كرت عمودي (مثل الرئيسية)
  return (
    <Link href={href} className="card lc-grid" style={{ display: 'block', textDecoration: 'none' }}>
      {/* الصورة */}
      {img ? (
        <div className="lc-imgWrap">
          <img
            src={img}
            alt={listing?.title || 'إعلان'}
            className="lc-img"
            loading="lazy"
            decoding="async"
          />
        </div>
      ) : (
        <div className="lc-imgEmpty">بدون صورة</div>
      )}

      <div style={{ marginTop: 10 }}>
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
        {shortDesc ? (
          <p className="muted lc-desc" style={{ marginTop: 8, marginBottom: 0 }}>
            {shortDesc}
          </p>
        ) : null}
      </div>

      <style jsx>{`
        .lc-imgWrap{
          overflow: hidden;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
        }
        .lc-img{
          width: 100%;
          height: 170px;
          object-fit: cover;
          display: block;
        }
        .lc-imgEmpty{
          height: 170px;
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
          font-size: 15px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .lc-desc{
          font-size: 13px;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        @media (max-width: 768px) {
          .lc-img { height: 155px; }
          .lc-imgEmpty { height: 155px; }
        }
        @media (max-width: 480px) {
          .lc-img { height: 145px; }
          .lc-imgEmpty { height: 145px; }
          .lc-title { font-size: 14px; }
        }
      `}</style>
    </Link>
  );
}
