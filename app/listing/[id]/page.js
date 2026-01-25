// app/listing/[id]/page.js
import { fetchListingById } from '@/lib/firestoreRest';
import HomeMapView from '@/components/Map/HomeMapView';
import Link from 'next/link';
import { Suspense } from 'react';

// تحديث الصفحة من السيرفر كل 5 دقائق (ISR)
export const revalidate = 300;

// رابط الموقع الأساسي (مهم جداً للـ SEO)
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sooqyemen.com';

function toAbsoluteUrl(src) {
  const s = String(src || '').trim();
  if (!s) return `${BASE_URL}/icon-512.png`;
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (s.startsWith('//')) return `https:${s}`;
  if (s.startsWith('/')) return `${BASE_URL}${s}`;
  return `${BASE_URL}/${s}`;
}

// 1. توليد البيانات الوصفية (Metadata) لمحركات البحث
export async function generateMetadata({ params }) {
  const { id } = await params;

  let listing = null;

  try {
    if (id) listing = await fetchListingById(id);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[generateMetadata] Failed to fetch listing:', error);
    }
  }

  // حالة عدم وجود الإعلان
  if (!listing) {
    return {
      title: 'الإعلان غير موجود | سوق اليمن',
      description: 'الإعلان الذي تبحث عنه غير متوفر أو تم حذفه.',
      robots: { index: false, follow: false },
    };
  }

  const titleText = listing.title || 'إعلان';
  const title = `${titleText} | سوق اليمن`;

  const priceVal = listing.priceYER || listing.currentBidYER || 0;
  const priceString = priceVal > 0 ? `${priceVal.toLocaleString('ar-YE')} ريال` : 'على السوم';
  const city = listing.city || listing.locationLabel || 'اليمن';

  const description = listing.description
    ? `${String(listing.description).slice(0, 150)}... | السعر: ${priceString} | الموقع: ${city}`
    : `${titleText} - ${priceString} في ${city} - سوق اليمن`;

  const imageList = Array.isArray(listing.images)
    ? listing.images
    : listing.image
    ? [listing.image]
    : [];

  const rawImages = imageList.length > 0 ? imageList.slice(0, 4) : ['/icon-512.png'];
  const imagesAbs = rawImages.map(toAbsoluteUrl);
  const url = `${BASE_URL}/listing/${id}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      locale: 'ar_YE',
      siteName: 'سوق اليمن',
      images: imagesAbs.map((img) => ({
        url: img,
        alt: titleText,
      })),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imagesAbs[0]],
    },
  };
}

// مكون لعرض الصور
function ImageGallery({ images, title }) {
  if (!images || images.length === 0) {
    return (
      <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
        <span className="text-gray-500">لا توجد صور</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="w-full h-96 bg-gray-100 rounded-xl overflow-hidden">
        <img
          src={images[0]}
          alt={title}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.slice(1).map((img, index) => (
            <div key={index} className="flex-shrink-0 w-24 h-24">
              <img
                src={img}
                alt={`${title} - ${index + 2}`}
                className="w-full h-full object-cover rounded-lg"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// مكون لأزرار التواصل
function ContactButtons({ phoneNumber, whatsapp, title }) {
  return (
    <div className="space-y-3">
      {phoneNumber && (
        <a
          href={`tel:${phoneNumber}`}
          className="w-full bg-green-600 text-white py-3 px-4 rounded-lg text-center font-semibold hover:bg-green-700 transition-colors block"
        >
          📞 اتصل بالبائع
        </a>
      )}
      
      {whatsapp && (
        <a
          href={`https://wa.me/${whatsapp}?text=مرحباً، أنا مهتم بالإعلان: ${encodeURIComponent(title || '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-green-500 text-white py-3 px-4 rounded-lg text-center font-semibold hover:bg-green-600 transition-colors block"
        >
          💬 واتساب
        </a>
      )}
    </div>
  );
}

// مكون لعرض معلومات الإعلان
function ListingInfo({ listing }) {
  return (
    <div className="space-y-6">
      {/* معلومات أساسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {listing.category && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">القسم</div>
            <div className="font-semibold">{listing.category}</div>
          </div>
        )}
        
        {listing.condition && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">الحالة</div>
            <div className="font-semibold">{listing.condition}</div>
          </div>
        )}
        
        {listing.city && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">المدينة</div>
            <div className="font-semibold">{listing.city}</div>
          </div>
        )}
        
        {listing.createdAt && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">تاريخ النشر</div>
            <div className="font-semibold">
              {new Date(listing.createdAt).toLocaleDateString('ar-YE')}
            </div>
          </div>
        )}
      </div>

      {/* وصف الإعلان */}
      {listing.description && (
        <div>
          <h3 className="text-lg font-semibold mb-3">📝 الوصف</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-700 whitespace-pre-line">{listing.description}</p>
          </div>
        </div>
      )}

      {/* مواصفات إضافية */}
      {listing.specifications && (
        <div>
          <h3 className="text-lg font-semibold mb-3">⚙️ المواصفات</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <pre className="text-gray-700 whitespace-pre-wrap font-sans">
              {JSON.stringify(listing.specifications, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// 2. صفحة التفاصيل (Server Component)
export default async function ListingDetailsPage({ params }) {
  const { id } = await params;

  let listing = null;

  try {
    if (id) listing = await fetchListingById(id);
  } catch (error) {
    console.error('[ListingDetailsPage] Error fetching listing:', error);
  }

  // إذا لم يتم العثور على الإعلان
  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">الإعلان غير موجود</h1>
          <p className="text-gray-600 mb-6">الإعلان الذي تبحث عنه غير متوفر أو تم حذفه.</p>
          <Link
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    );
  }

  // تحضير البيانات
  const images = Array.isArray(listing.images) 
    ? listing.images 
    : listing.image 
      ? [listing.image] 
      : [];

  const price = listing.priceYER 
    ? `${listing.priceYER.toLocaleString('ar-YE')} ريال` 
    : 'على السوم';

  const mapListings = [listing];
  const hasLocation = listing.lat && listing.lng;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 text-sm text-gray-600">
          <Link href="/" className="hover:text-blue-600">الرئيسية</Link>
          <span className="mx-2">/</span>
          <Link href={`/category/${listing.category || 'all'}`} className="hover:text-blue-600">
            {listing.category || 'الفئات'}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">{listing.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* العمود الأيسر - المحتوى الرئيسي */}
          <div className="lg:col-span-2 space-y-8">
            {/* العنوان والسعر */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{listing.title}</h1>
                  <div className="flex items-center gap-4">
                    {listing.status && (
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        listing.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {listing.status === 'active' ? 'نشط' : 'معلق'}
                      </span>
                    )}
                    {listing.isFeatured && (
                      <span className="px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800">
                        ⭐ مميز
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-600">{price}</div>
                  {listing.isNegotiable && (
                    <div className="text-sm text-green-600 mt-1">السعر قابل للتفاوض</div>
                  )}
                </div>
              </div>

              {/* معرض الصور */}
              <div className="mb-6">
                <ImageGallery images={images} title={listing.title} />
              </div>

              {/* معلومات الإعلان */}
              <ListingInfo listing={listing} />
            </div>

            {/* معلومات المعلن */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">👤 معلومات المعلن</h3>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">👤</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {listing.userName || 'معلن'}
                  </h4>
                  <p className="text-gray-600 text-sm mt-1">
                    عضو منذ {listing.createdAt 
                      ? new Date(listing.createdAt).toLocaleDateString('ar-YE') 
                      : 'فترة'}
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

          {/* العمود الأيمن - المعلومات الجانبية */}
          <div className="space-y-8">
            {/* أزرار التواصل */}
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
              <ContactButtons 
                phoneNumber={listing.phoneNumber}
                whatsapp={listing.whatsapp}
                title={listing.title}
              />
              
              {/* أزرار المشاركة */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">مشاركة الإعلان</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: listing.title,
                          text: listing.description?.substring(0, 100),
                          url: window.location.href,
                        });
                      } else {
                        navigator.clipboard.writeText(window.location.href);
                        alert('تم نسخ الرابط!');
                      }
                    }}
                    className="flex-1 bg-blue-100 text-blue-700 py-2 px-4 rounded-lg text-center hover:bg-blue-200 transition-colors"
                  >
                    📤 مشاركة
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      alert('تم نسخ الرابط!');
                    }}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-center hover:bg-gray-200 transition-colors"
                  >
                    📋 نسخ الرابط
                  </button>
                </div>
              </div>

              {/* زر التبليغ */}
              <div className="mt-4">
                <button
                  onClick={() => {
                    if (confirm('هل تريد التبليغ عن هذا الإعلان؟')) {
                      // هنا يمكن إضافة منطق التبليغ
                      alert('شكراً لتقريرك، سنقوم بمراجعة الإعلان.');
                    }
                  }}
                  className="w-full text-sm text-red-600 hover:text-red-700 py-2"
                >
                  ⚠️ تبليغ عن الإعلان
                </button>
              </div>
            </div>

            {/* الخريطة */}
            {hasLocation && (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <h3 className="text-lg font-semibold text-gray-900 p-6 border-b border-gray-100">
                  🗺️ الموقع على الخريطة
                </h3>
                <div className="p-4">
                  <Suspense fallback={<div className="h-64 bg-gray-200 animate-pulse rounded-lg" />}>
                    <HomeMapView 
                      listings={mapListings}
                      autoOpen={true}
                      selectedListingId={id}
                      initialCenter={[listing.lat, listing.lng]}
                      initialZoom={14}
                    />
                  </Suspense>
                </div>
              </div>
            )}

            {/* نصائح الأمان */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-yellow-800 mb-3">⚠️ نصائح أمان مهمة</h3>
              <ul className="text-yellow-700 space-y-2 text-sm">
                <li>• لا تحول أي مبلغ قبل معاينة السلعة</li>
                <li>• تأكد من هوية البائع عند التواصل</li>
                <li>• قابل البائع في مكان عام وآمن</li>
                <li>• احذر من العروض التي تبدو جيدة جداً</li>
                <li>• قم بفحص السلعة جيداً قبل الشراء</li>
              </ul>
            </div>
          </div>
        </div>

        {/* الإعلانات المشابهة (يمكن تفعيلها لاحقاً) */}
        {/* <div className="mt-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">🔥 إعلانات مشابهة</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* هنا يمكن عرض إعلانات مشابهة *//*}
          </div>
        </div> */}
      </div>

      {/* ترويسة SEO إضافية */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: listing.title,
            description: listing.description?.substring(0, 200),
            image: images[0] ? toAbsoluteUrl(images[0]) : undefined,
            offers: {
              '@type': 'Offer',
              price: listing.priceYER,
              priceCurrency: 'YER',
              availability: listing.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            },
            seller: {
              '@type': 'Person',
              name: listing.userName || 'معلن',
            },
            areaServed: {
              '@type': 'City',
              name: listing.city || 'اليمن',
            },
          }),
        }}
      />
    </div>
  );
}
