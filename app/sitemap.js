import { fetchListingIdsForSitemap } from '@/lib/firestoreRest';

const BASE_URL = 'https://sooqyemen.com';

export default async function sitemap() {
  // ==========================================
  // 1. الصفحات الثابتة والأقسام (تم تحديثها حسب موقعك)
  // ==========================================
  const routes = [
    // الصفحات الأساسية
    '',              // الرئيسية
    '/ads',          // كل الإعلانات
    '/add',          // إضافة إعلان
    '/about',        // من نحن
    '/contact',      // اتصل بنا
    '/privacy',      // سياسة الخصوصية
    '/terms',        // الشروط والأحكام

    // -- الأقسام (تأكد أن أسماء المجلدات عندك مطابقة لهذه الأسماء) --
    '/cars',             // سيارات
    '/realestate',       // عقارات
    '/phones',           // جوالات
    '/electronics',      // إلكترونيات
    '/motorcycles',      // دراجات نارية
    '/heavy-equipment',  // معدات ثقيلة
    '/solar',            // طاقة شمسية
    '/internet-networks',// نت وشبكات
    '/maintenance',      // صيانة
    '/furniture',        // أثاث
    '/home-appliances',  // أدوات منزلية
    '/clothes',          // ملابس
    '/animals-birds',    // حيوانات وطيور
    '/jobs',             // وظائف
    '/services',         // خدمات
    '/other',            // أخرى
  ];

  // تحويل القائمة إلى روابط
  const staticUrls = routes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: route === '' ? 1 : 0.8,
  }));

  // ==========================================
  // 2. الإعلانات الديناميكية (من قاعدة البيانات)
  // ==========================================
  // نجلب عددًا كبيرًا لضمان تغطية أحدث الإعلانات
  const listings = await fetchListingIdsForSitemap(5000); 

  const listingUrls = listings.map((item) => ({
    url: `${BASE_URL}/listing/${item.id}`,
    lastModified: new Date(item.updatedAt || new Date()),
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  // 3. دمج الجميع
  return [...staticUrls, ...listingUrls];
}
