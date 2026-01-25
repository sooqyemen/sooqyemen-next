// app/listing/[id]/page.js
import { fetchListingById } from '@/lib/firestoreRest';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamic import للخريطة (Client Component فقط)
const HomeMapView = dynamic(
  () => import('@/components/Map/HomeMapView'),
  { 
    ssr: false, // تعطيل SSR للخريطة
    loading: () => (
      <div className="h-64 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
        <span className="text-gray-500">جاري تحميل الخريطة...</span>
      </div>
    )
  }
);

export const revalidate = 300;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sooqyemen.com';

// Metadata generation (ابقاء نفس الكود)
export async function generateMetadata({ params }) {
  // ... نفس كود generateMetadata السابق
}

// مكون بسيط لعرض الصور
function SimpleImageGallery({ images, title }) {
  if (!images || images.length === 0) {
    return (
      <div className="w-full h-64 bg-gray-100 rounded-xl flex items-center justify-center">
        <span className="text-gray-400">لا توجد صور متاحة</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative w-full h-80 md:h-96 bg-gray-100 rounded-xl overflow-hidden">
        <img
          src={images[0]}
          alt={title}
          className="w-full h-full object-contain"
          loading="eager"
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-4">
          {images.slice(1).map((img, index) => (
            <button
              key={index}
              className="flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition-colors"
              onClick={() => {
                // بسيط للتبديل بين الصور
                const mainImg = document.querySelector('.main-image');
                if (mainImg) mainImg.src = img;
              }}
            >
              <img
                src={img}
                alt={`${title} - ${index + 2}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// مكون أزرار التواصل
function ContactSection({ listing }) {
  const phoneNumber = listing.phoneNumber || listing.contactPhone;
  const whatsapp = listing.whatsapp || listing.contactWhatsapp;
  const title = listing.title || 'إعلان';

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📞 تواصل مع المعلن</h3>
        
        {phoneNumber ? (
          <a
            href={`tel:${phoneNumber}`}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg text-center font-semibold hover:bg-green-700 transition-colors block mb-3"
          >
            الاتصال بالرقم: {phoneNumber}
          </a>
        ) : (
          <div className="text-center py-3 text-gray-500">
            رقم الهاتف غير متوفر
          </div>
        )}
        
        {whatsapp ? (
          <a
            href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`مرحباً، أنا مهتم بالإعلان: ${title}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-green-500 text-white py-3 px-4 rounded-lg text-center font-semibold hover:bg-green-600 transition-colors block"
          >
            التواصل عبر واتساب
          </a>
        ) : null}
        
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  navigator.clipboard.writeText(window.location.href);
                  alert('تم نسخ رابط الإعلان!');
                }
              }}
              className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-center hover:bg-gray-200 transition-colors"
            >
              📋 نسخ الرابط
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && navigator.share) {
                  navigator.share({
                    title: title,
                    text: listing.description?.substring(0, 100) || '',
                    url: window.location.href,
                  });
                } else {
                  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(window.location.href)}`;
                  window.open(url, '_blank');
                }
              }}
              className="flex-1 bg-blue-100 text-blue-700 py-2 px-4 rounded-lg text-center hover:bg-blue-200 transition-colors"
            >
              📤 مشاركة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function ListingDetailsPage({ params }) {
  const { id } = await params;

  let listing = null;

  try {
    if (id) {
      listing = await fetchListingById(id);
    }
  } catch (error) {
    console.error('[ListingDetailsPage] Error:', error);
    // لا ترمي الخطأ، فقط سجلها
  }

  // إذا لم يتم العثور على الإعلان
  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">الإعلان غير موجود</h1>
          <p className="text-gray-600 mb-6">
            الإعلان الذي تبحث عنه غير متوفر أو تم حذفه.
          </p>
          <Link
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    );
  }

  // معالجة البيانات
  const images = Array.isArray(listing.images) 
    ? listing.images.filter(img => img) 
    : listing.image 
      ? [listing.image] 
      : [];

  const price = listing.priceYER 
    ? `${listing.priceYER.toLocaleString('ar-YE')} ريال يمني` 
    : 'السوم';

  const hasLocation = listing.lat && listing.lng && 
                     !isNaN(parseFloat(listing.lat)) && 
                     !isNaN(parseFloat(listing.lng));

  const mapListings = hasLocation ? [{
    ...listing,
    _id: listing.id || id,
    _coords: [parseFloat(listing.lat), parseFloat(listing.lng)],
    _categoryValue: listing.category || 'other',
    _catKey: listing.category?.toLowerCase().replace(/\s+/g, '_') || 'other',
    _govKey: listing.governorateKey || listing.city || '',
  }] : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-4 md:py-8">
        {/* Breadcrumb مبسط */}
        <div className="mb-4 md:mb-6 text-sm text-gray-600">
          <Link href="/" className="hover:text-blue-600 transition-colors">الرئيسية</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium truncate">{listing.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* المحتوى الرئيسي */}
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
            {/* البطاقة الرئيسية */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {/* العنوان والحالة */}
              <div className="p-4 md:p-6 border-b border-gray-100">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                      {listing.title}
                    </h1>
                    <div className="flex flex-wrap gap-2">
                      {listing.status === 'active' ? (
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
                          نشط
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full">
                          مغلق
                        </span>
                      )}
                      {listing.isFeatured && (
                        <span className="px-3 py-1 bg-yellow-50 text-yellow-700 text-sm font-semibold rounded-full">
                          ⭐ مميز
                        </span>
                      )}
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-semibold rounded-full">
                        {new Date(listing.createdAt || Date.now()).toLocaleDateString('ar-YE')}
                      </span>
                    </div>
                  </div>
                  <div className="text-left md:text-right">
                    <div className="text-2xl md:text-3xl font-bold text-blue-600">
                      {price}
                    </div>
                    {listing.isNegotiable && (
                      <div className="text-sm text-green-600 mt-1">السعر قابل للتفاوض</div>
                    )}
                  </div>
                </div>
              </div>

              {/* الصور */}
              <div className="p-4 md:p-6">
                <SimpleImageGallery images={images} title={listing.title} />
              </div>

              {/* الوصف والمعلومات */}
              <div className="p-4 md:p-6 border-t border-gray-100">
                {listing.description && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">الوصف</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                        {listing.description}
                      </p>
                    </div>
                  </div>
                )}

                {/* المعلومات الأساسية */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {listing.category && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">القسم</div>
                      <div className="font-semibold">{listing.category}</div>
                    </div>
                  )}
                  
                  {listing.condition && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">الحالة</div>
                      <div className="font-semibold">{listing.condition}</div>
                    </div>
                  )}
                  
                  {listing.city && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">المدينة</div>
                      <div className="font-semibold">{listing.city}</div>
                    </div>
                  )}
                  
                  {listing.brand && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">الماركة</div>
                      <div className="font-semibold">{listing.brand}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* معلومات المعلن */}
            <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">معلومات المعلن</h3>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xl md:text-2xl">👤</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {listing.userName || 'معلن'}
                  </h4>
                  <p className="text-gray-600 text-sm mt-1">
                    عضو منذ {new Date(listing.createdAt || Date.now()).toLocaleDateString('ar-YE')}
                  </p>
                  {listing.isVerifiedSeller && (
                    <span className="inline-block mt-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      ✅ موثق
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* العمود الجانبي */}
          <div className="space-y-6 md:space-y-8">
            <ContactSection listing={listing} />

            {/* الخريطة */}
            {hasLocation && (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <h3 className="text-lg font-semibold text-gray-900 p-4 md:p-6 border-b border-gray-100">
                  الموقع على الخريطة
                </h3>
                <div className="p-4">
                  <HomeMapView 
                    listings={mapListings}
                    autoOpen={true}
                    selectedListingId={id}
                    initialCenter={[parseFloat(listing.lat), parseFloat(listing.lng)]}
                    initialZoom={14}
                  />
                </div>
              </div>
            )}

            {/* نصائح الأمان */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 md:p-6">
              <h3 className="text-lg font-semibold text-yellow-800 mb-3">نصائح أمان مهمة</h3>
              <ul className="text-yellow-700 space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>لا تحول أي مبلغ قبل معاينة السلعة</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>تأكد من هوية البائع عند التواصل</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>قابل البائع في مكان عام وآمن</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>احذر من العروض التي تبدو جيدة جداً</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Schema markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: listing.title,
            description: listing.description?.substring(0, 200),
            image: images[0],
            offers: {
              '@type': 'Offer',
              price: listing.priceYER,
              priceCurrency: 'YER',
              availability: listing.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            },
          }),
        }}
      />
    </div>
  );
}
