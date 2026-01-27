// components/ListingCard.js
'use client';

import Link from 'next/link';
import Image from 'next/image';
import Price from '@/components/Price';

// ✅ تحويل slug إلى اسم عربي
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
  phones: 'جوالات',
  phone: 'جوالات',
  home_tools: 'أدوات منزلية',
  clothes: 'ملابس',
  animals: 'حيوانات وطيور',
  jobs: 'وظائف',
  services: 'خدمات',
  other: 'أخرى',
};

function getCategoryLabel(listing) {
  const raw = String(listing?.categoryName || listing?.category || '').trim();
  if (!raw) return 'قسم';
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
  const city = listing?.city || listing?.region || '';
  const shortDesc = truncateText(String(listing?.description || ''), 65);
  const href = `/listing/${listing?.id}`;

  // ✅ وضع القائمة: كرت أفقي (مصغر)
  if (variant === 'list') {
    return (
      <Link 
        href={href} 
        className="card lc-list"
        style={{
          display: 'flex',
          textDecoration: 'none',
          padding: '12px',
          borderRadius: '10px',
          marginBottom: '8px',
          background: 'white',
          border: '1px solid #e2e8f0',
          transition: 'all 0.2s ease',
          minHeight: '100px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
          e.currentTarget.style.borderColor = '#3b82f6';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
          e.currentTarget.style.borderColor = '#e2e8f0';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        {/* صورة مصغرة */}
        <div 
          className="lc-thumb"
          style={{
            width: '85px',
            height: '85px',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid #f1f5f9',
            background: '#f8fafc',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          {img ? (
            <Image
              src={img}
              alt={listing?.title || 'إعلان'}
              fill
              style={{ objectFit: 'cover' }}
              sizes="85px"
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
              fontSize: '11px',
              fontWeight: '600',
            }}>
              بدون صورة
            </div>
          )}
        </div>

        {/* محتوى */}
        <div style={{ 
          flex: 1, 
          minWidth: 0, 
          display: 'flex', 
          flexDirection: 'column',
          marginRight: '12px',
        }}>
          {/* العنوان */}
          <div style={{
            fontWeight: '700',
            fontSize: '13.5px',
            lineHeight: '1.3',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            marginBottom: '6px',
            color: '#1e293b'
          }}>
            {truncateText(listing?.title || 'بدون عنوان', 50)}
          </div>

          {/* المدينة والمشاهدات */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{ 
              fontSize: '12px',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span style={{ fontSize: '11px' }}>📍</span>
              {city ? truncateText(city, 18) : '—'}
            </span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              👁️ {Number(listing?.views || 0).toLocaleString('ar-YE')}
            </span>
          </div>

          {/* القسم والسعر */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginTop: 'auto'
          }}>
            <span style={{
              padding: '4px 10px',
              borderRadius: '12px',
              background: '#f1f5f9',
              color: '#475569',
              fontSize: '11px',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '90px'
            }}>
              {getCategoryLabel(listing)}
            </span>
            
            {/* السعر المعدل */}
            <div style={{ textAlign: 'right' }}>
              <Price listing={listing} variant="compact" maxConversions={2} />
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // ✅ وضع الشبكة: كرت عمودي (المحسّن)
  return (
    <Link 
      href={href} 
      className="card lc-grid"
      style={{
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        borderRadius: '12px',
        overflow: 'hidden',
        background: 'white',
        border: '1px solid #e2e8f0',
        transition: 'all 0.2s ease',
        height: '100%',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
        e.currentTarget.style.borderColor = '#3b82f6';
        e.currentTarget.style.transform = 'translateY(-3px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
        e.currentTarget.style.borderColor = '#e2e8f0';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* حاوية الصورة مع علامة القسم */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '140px',
        overflow: 'hidden',
        background: '#f8fafc',
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
            fontSize: '13px',
            fontWeight: '600',
          }}>
            🖼️ بدون صورة
          </div>
        )}
        
        {/* علامة القسم في أعلى الصورة */}
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'rgba(0, 0, 0, 0.75)',
          color: 'white',
          padding: '4px 10px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '600',
          backdropFilter: 'blur(4px)',
          zIndex: 2,
        }}>
          {getCategoryLabel(listing)}
        </div>
      </div>

      {/* محتوى البطاقة */}
      <div style={{ 
        padding: '14px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* العنوان */}
        <h3 style={{
          fontWeight: '700',
          fontSize: '14px',
          lineHeight: '1.3',
          margin: '0 0 10px 0',
          color: '#1e293b',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          minHeight: '36px'
        }}>
          {truncateText(listing?.title || 'بدون عنوان', 55)}
        </h3>

        {/* المدينة والمشاهدات */}
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          paddingBottom: '10px',
          borderBottom: '1px solid #f1f5f9'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '5px',
            fontSize: '12px',
            color: '#64748b'
          }}>
            <span style={{ fontSize: '11px' }}>📍</span>
            <span style={{ fontWeight: '500' }}>
              {city ? truncateText(city, 15) : '—'}
            </span>
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>👁️</span>
            <span>{Number(listing?.views || 0).toLocaleString('ar-YE')}</span>
          </div>
        </div>

        {/* السعر (الجزء الأهم) */}
        <div style={{ 
          marginTop: 'auto',
          paddingTop: '8px'
        }}>
          <Price listing={listing} variant="grid" maxConversions={2} />
        </div>

        {/* الوصف المختصر (اختياري) */}
        {shortDesc && (
          <div style={{
            marginTop: '10px',
            fontSize: '12px',
            color: '#64748b',
            lineHeight: '1.4',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            paddingTop: '8px',
            borderTop: '1px solid #f1f5f9'
          }}>
            {shortDesc}
          </div>
        )}
      </div>

      {/* الأنماط العامة */}
      <style jsx>{`
        @media (max-width: 768px) {
          .lc-grid {
            border-radius: 10px;
          }
          
          .lc-list {
            padding: 10px;
          }
          
          .lc-list .lc-thumb {
            width: 75px;
            height: 75px;
          }
        }
        
        @media (max-width: 480px) {
          .lc-grid {
            border-radius: 8px;
          }
          
          .lc-list {
            flex-direction: column;
            min-height: auto;
          }
          
          .lc-list .lc-thumb {
            width: 100%;
            height: 120px;
            margin-bottom: 10px;
          }
          
          .lc-list > div:last-child {
            margin-right: 0;
            width: 100%;
          }
        }
        
        /* تحسينات للعرض على الجوال */
        @media (hover: none) {
          .card {
            transform: none !important;
          }
        }
      `}</style>
    </Link>
  );
}
