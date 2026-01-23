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
  other: 'أخرى',
};

function getCategoryLabel(listing) {
  const raw = String(listing?.categoryName || listing?.category || '').trim();
  if (!raw) return 'قسم';
  // لو كان أصلاً عربي نخليه
  if (/[\u0600-\u06FF]/.test(raw)) return raw;
  return CATEGORY_LABELS[raw] || raw;
}

// ✅ دالة لتقصير النص
function truncateText(text, maxLength = 80) {
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength) + '…' : text;
}

export default function ListingCard({ listing, variant = 'grid' }) {
  const img = (Array.isArray(listing?.images) && listing.images[0]) || listing?.image || null;

  // المدينة (إن وجدت)
  const city = listing?.city || listing?.region || '';

  // وصف مختصر
  const shortDesc = truncateText(String(listing?.description || ''), 65);

  const href = `/listing/${listing?.id}`;

  // ✅ وضع القائمة: كرت أفقي (مناسب للجوال) - مصغر
  if (variant === 'list') {
    return (
      <Link href={href} className="card lc-list" style={{ 
        display: 'flex', 
        textDecoration: 'none',
        padding: '10px',
        borderRadius: '10px',
        marginBottom: '8px',
        background: 'white',
        border: '1px solid #eef2f7',
        transition: 'all 0.2s ease',
        minHeight: '90px'
      }}>
        <div className="lc-list-content" style={{ 
          display: 'flex', 
          gap: '10px', 
          alignItems: 'flex-start',
          width: '100%'
        }}>
          {/* صورة مصغرة */}
          <div className="lc-thumb" style={{
            width: '75px',
            height: '75px',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid #f1f5f9',
            background: '#f8fafc',
            flex: '0 0 auto',
          }}>
            {img ? (
              <Image
                src={img}
                alt={listing?.title || 'إعلان'}
                className="lc-thumb-img"
                width={75}
                height={75}
                style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                loading="lazy"
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                fontWeight: '600',
                fontSize: '10px',
              }}>
                بدون صورة
              </div>
            )}
          </div>

          {/* محتوى */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '75px' }}>
            <div className="lc-title" style={{
              fontWeight: '700',
              fontSize: '12.5px',
              lineHeight: '1.3',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              marginBottom: '4px',
              color: '#1e293b'
            }}>
              {truncateText(listing?.title || 'بدون عنوان', 45)}
            </div>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '6px'
            }}>
              <span style={{ 
                fontSize: '11px',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}>
                <span style={{ fontSize: '10px' }}>📍</span>
                {city ? truncateText(city, 15) : '—'}
              </span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                👁️ {Number(listing?.views || 0)}
              </span>
            </div>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginTop: 'auto'
            }}>
              <span style={{
                padding: '3px 8px',
                borderRadius: '12px',
                background: '#f1f5f9',
                color: '#475569',
                fontSize: '10.5px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '70px'
              }}>
                {getCategoryLabel(listing)}
              </span>
              <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#3b82f6' }}>
                <Price listing={listing} variant="compact" />
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // ✅ وضع الشبكة: كرت عمودي (مثل الرئيسية) - مصغر
  return (
    <Link href={href} className="card lc-grid" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      textDecoration: 'none',
      borderRadius: '12px',
      overflow: 'hidden',
      background: 'white',
      border: '1px solid #eef2f7',
      transition: 'all 0.2s ease',
      height: '100%',
      ':hover': {
        borderColor: '#cbd5e1',
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }
    }}>
      {/* الصورة */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '120px',
        overflow: 'hidden',
        background: '#f8fafc',
        borderBottom: '1px solid #f1f5f9'
      }}>
        {img ? (
          <Image
            src={img}
            alt={listing?.title || 'إعلان'}
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            loading="lazy"
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            fontWeight: '600',
            fontSize: '11px',
          }}>
            بدون صورة
          </div>
        )}
      </div>

      {/* المحتوى */}
      <div style={{ 
        padding: '10px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* العنوان */}
        <div style={{
          fontWeight: '700',
          fontSize: '13px',
          lineHeight: '1.3',
          marginBottom: '8px',
          color: '#1e293b',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          height: '34px'
        }}>
          {truncateText(listing?.title || 'بدون عنوان', 50)}
        </div>

        {/* المدينة والمشاهدات */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px',
            fontSize: '11px',
            color: '#64748b'
          }}>
            <span style={{ fontSize: '10px' }}>📍</span>
            <span>{city ? truncateText(city, 12) : '—'}</span>
          </div>
          <div style={{ 
            fontSize: '11px', 
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '3px'
          }}>
            <span>👁️</span>
            <span>{Number(listing?.views || 0)}</span>
          </div>
        </div>

        {/* القسم والسعر */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 'auto'
        }}>
          <span style={{
            padding: '3px 8px',
            borderRadius: '12px',
            background: '#f1f5f9',
            color: '#475569',
            fontSize: '10.5px',
            fontWeight: '600',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '80px'
          }}>
            {getCategoryLabel(listing)}
          </span>
          <div style={{ fontSize: '13px', fontWeight: '800', color: '#3b82f6' }}>
            <Price listing={listing} variant="compact" />
          </div>
        </div>

        {/* الوصف المختصر (اختياري) */}
        {shortDesc && (
          <div style={{
            marginTop: '8px',
            fontSize: '11px',
            color: '#64748b',
            lineHeight: '1.4',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {shortDesc}
          </div>
        )}
      </div>

      <style jsx>{`
        .card:hover {
          border-color: #cbd5e1;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        
        @media (max-width: 768px) {
          .lc-grid {
            border-radius: 10px;
          }
        }
        
        @media (max-width: 480px) {
          .lc-grid {
            border-radius: 8px;
          }
        }
      `}</style>
    </Link>
  );
}
