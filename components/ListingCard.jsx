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

export default function ListingCard({ listing, variant = 'grid' }) {
  const img = (Array.isArray(listing?.images) && listing.images[0]) || listing?.image || null;

  // المدينة (إن وجدت)
  const city = listing?.city || listing?.region || '';

  // وصف مختصر
  const rawDesc = String(listing?.description || '');
  const shortDesc = rawDesc.length > 90 ? rawDesc.slice(0, 90) + '…' : rawDesc;

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
              <Price listing={listing} variant="compact" />
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
            font-size: 14px;
            line-height: 1.4;
            min-height: 38px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .lc-desc{
            font-size: 12.5px;
            line-height: 1.5;
            min-height: 36px;
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
          <Price listing={listing} variant="compact" />
        </div>

        {/* وصف مختصر */}
        <p className="muted lc-desc" style={{ marginTop: 8, marginBottom: 0 }}>{shortDesc || ""}</p>
      </div>

      <style jsx>{`
        .lc-grid{
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .lc-body{
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .lc-body{ padding: 10px; }

        .lc-imgWrap{
          overflow: hidden;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          height: 170px;
          width: 100%;
          position: relative;
        }
        .lc-img{
          width: 100%;
          height: 100%;
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
          min-height: 38px;
          font-size: 14px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .lc-desc{
          font-size: 12.5px;
          line-height: 1.5;
          min-height: 36px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        @media (max-width: 768px) {
          .lc-imgWrap, .lc-imgEmpty { height: 150px; }
        }
        @media (max-width: 480px) {
          .lc-imgWrap, .lc-imgEmpty { height: 140px; }
          .lc-title { font-size: 14px; min-height: 39px; }
        }
      `}</style>
    </Link>
  );
}
