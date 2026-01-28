# هيكل المشروع | Project Structure

## نظرة عامة | Overview

هذا الملف يشرح هيكل مشروع سوق اليمن بالتفصيل، مع وصف لكل مجلد وملف رئيسي في المشروع.

This document explains the Souq Yemen project structure in detail, describing each main folder and file.

---

## الهيكل الكامل للمشروع | Complete Project Structure

```
sooqyemen-next/
├── app/                          # مجلد التطبيق الرئيسي (Next.js App Router)
│   ├── page.js                   # الصفحة الرئيسية للموقع
│   ├── layout.js                 # التخطيط الرئيسي للموقع
│   ├── globals.css               # الأنماط العامة
│   ├── home.css                  # أنماط الصفحة الرئيسية
│   ├── error.jsx                 # صفحة الأخطاء
│   ├── loading.jsx               # صفحة التحميل
│   ├── not-found.jsx             # صفحة 404
│   │
│   ├── listings/                 # صفحة جميع الإعلانات
│   │   ├── page.js               # الصفحة الرئيسية للإعلانات
│   │   └── page-client.js        # المكون التفاعلي للإعلانات
│   │
│   ├── listing/[id]/             # صفحة تفاصيل الإعلان
│   │   ├── page.js               # صفحة تفاصيل الإعلان (SSR)
│   │   └── page-client.js        # المكون التفاعلي لتفاصيل الإعلان
│   │
│   ├── add/                      # صفحة إضافة إعلان جديد
│   ├── edit-listing/[id]/        # صفحة تعديل الإعلان
│   ├── my-listings/              # صفحة إعلاناتي
│   │
│   ├── login/                    # صفحة تسجيل الدخول
│   ├── register/                 # صفحة التسجيل
│   ├── profile/                  # صفحة الملف الشخصي
│   │
│   ├── chat/[id]/                # صفحة المحادثة الفردية
│   ├── my-chats/                 # صفحة جميع المحادثات
│   │
│   ├── admin/                    # لوحة تحكم المشرف
│   │   ├── listings/             # إدارة الإعلانات
│   │   ├── users/                # إدارة المستخدمين
│   │   ├── payouts/              # إدارة المدفوعات
│   │   └── edit-listing/         # تعديل الإعلان من لوحة التحكم
│   │
│   ├── categories/               # صفحة جميع الفئات
│   │
│   ├── cars/                     # فئة السيارات
│   ├── realestate/               # فئة العقارات
│   ├── phones/                   # فئة الجوالات
│   ├── electronics/              # فئة الإلكترونيات
│   ├── motorcycles/              # فئة الدراجات النارية
│   ├── heavy_equipment/          # فئة المعدات الثقيلة
│   ├── solar/                    # فئة الطاقة الشمسية
│   ├── networks/                 # فئة الشبكات
│   ├── maintenance/              # فئة الصيانة
│   ├── furniture/                # فئة الأثاث
│   ├── home_tools/               # فئة أدوات المنزل
│   ├── clothes/                  # فئة الملابس
│   ├── animals/                  # فئة الحيوانات
│   ├── jobs/                     # فئة الوظائف
│   ├── services/                 # فئة الخدمات
│   ├── other/                    # فئة أخرى
│   │
│   ├── about/                    # صفحة من نحن
│   ├── contact/                  # صفحة اتصل بنا
│   ├── help/                     # صفحة المساعدة
│   ├── terms/                    # صفحة الشروط والأحكام
│   ├── privacy/                  # صفحة سياسة الخصوصية
│   │
│   ├── ads/                      # صفحة الإعلانات الممولة
│   ├── affiliate/                # صفحة التسويق بالعمولة
│   ├── payout/                   # صفحة طلب الدفع
│   │
│   ├── api/                      # مسارات API
│   │   └── public-id/            # API للحصول على معرف عام
│   │
│   ├── sitemap.js                # خريطة الموقع (XML)
│   ├── robots.txt/               # ملف robots.txt
│   └── web-vitals.js             # تتبع أداء الموقع
│
├── components/                   # المكونات القابلة لإعادة الاستخدام
│   ├── Header.jsx                # رأس الصفحة (الشريط العلوي)
│   ├── CategoryBar.jsx           # شريط الفئات
│   ├── ListingCard.jsx           # بطاقة الإعلان
│   ├── CategoryListings.jsx      # عرض إعلانات الفئة
│   ├── CategoryPageShell.jsx     # غلاف صفحة الفئة
│   ├── ImageGallery.jsx          # معرض الصور
│   ├── AuctionBox.jsx            # صندوق المزاد
│   ├── CommentsBox.jsx           # صندوق التعليقات
│   ├── Price.jsx                 # عرض السعر
│   ├── AuthUI.jsx                # واجهة المصادقة
│   ├── ClientProviders.jsx       # موفرو السياق للعميل
│   ├── ReferralTracker.jsx       # تتبع الإحالات
│   ├── Icons.jsx                 # الأيقونات
│   │
│   ├── Chat/                     # مكونات المحادثة
│   │   ├── ChatBox.jsx           # صندوق المحادثة
│   │   └── ChatList.jsx          # قائمة المحادثات
│   │
│   ├── Map/                      # مكونات الخرائط
│   │   ├── HomeListingsMap.jsx   # خريطة إعلانات الصفحة الرئيسية
│   │   ├── HomeMapView.jsx       # عرض الخريطة في الصفحة الرئيسية
│   │   ├── ListingMap.jsx        # خريطة الإعلان الفردي
│   │   └── LocationPicker.jsx    # اختيار الموقع
│   │
│   ├── StructuredData/           # البيانات المنظمة (SEO)
│   │   ├── WebsiteJsonLd.jsx     # بيانات الموقع المنظمة
│   │   ├── ListingJsonLd.jsx     # بيانات الإعلان المنظمة
│   │   └── BreadcrumbJsonLd.jsx  # بيانات المسار التنقلي المنظمة
│   │
│   ├── Icons/                    # مكونات الأيقونات المخصصة
│   │   └── WhatsAppIcon.jsx      # أيقونة واتساب
│   │
│   ├── EmptyState.jsx            # حالة فارغة
│   ├── EmptyState.css            # أنماط الحالة الفارغة
│   ├── SkeletonLoader.jsx        # محمل هيكلي
│   ├── SkeletonLoader.css        # أنماط المحمل الهيكلي
│   ├── OfflineIndicator.jsx      # مؤشر عدم الاتصال
│   ├── OfflineIndicator.css      # أنماط مؤشر عدم الاتصال
│   ├── ErrorBoundary.jsx         # حد الأخطاء
│   └── ErrorBoundary.css         # أنماط حد الأخطاء
│
├── lib/                          # المكتبات والوظائف المساعدة
│   ├── firebaseClient.js         # إعداد Firebase للعميل
│   ├── firebaseAdmin.js          # إعداد Firebase للخادم
│   ├── firebaseLoader.js         # محمل Firebase الديناميكي
│   ├── firestoreRest.js          # Firestore REST API للخادم
│   ├── getListings.server.js     # جلب الإعلانات من الخادم
│   ├── useAuth.js                # Hook للمصادقة
│   ├── useUserProfile.js         # Hook لملف المستخدم
│   ├── analytics.js              # تتبع التحليلات
│   ├── rates.js                  # أسعار العملات
│   └── viewed.js                 # تتبع المشاهدات
│
├── public/                       # الملفات العامة الثابتة
│   ├── favicon.ico               # أيقونة الموقع
│   ├── favicon-16.png            # أيقونة 16x16
│   ├── favicon-32.png            # أيقونة 32x32
│   ├── apple-touch-icon.png      # أيقونة Apple
│   ├── icon-192.png              # أيقونة 192x192
│   ├── icon-512.png              # أيقونة 512x512
│   ├── icon-512-maskable.png     # أيقونة قابلة للقناع
│   ├── manifest.json             # ملف PWA manifest
│   ├── sw.js                     # Service Worker
│   ├── offline.html              # صفحة عدم الاتصال
│   └── robots.txt                # ملف robots.txt الثابت
│
├── .github/                      # إعدادات GitHub
│
├── next.config.mjs               # إعدادات Next.js
├── package.json                  # تبعيات المشروع
├── package-lock.json             # قفل التبعيات
├── jsconfig.json                 # إعدادات JavaScript
├── .eslintrc.json                # إعدادات ESLint
├── .gitignore                    # ملفات مستبعدة من Git
├── .nvmrc                        # إصدار Node.js
├── .env.example                  # مثال على متغيرات البيئة
│
└── ملفات التوثيق:
    ├── README.md                 # الملف التعريفي الرئيسي
    ├── PROJECT_STRUCTURE.md      # هيكل المشروع (هذا الملف)
    ├── PROJECT_REFERENCE.md      # مرجع المشروع التقني
    ├── QUICKSTART_AR.md          # دليل البدء السريع بالعربية
    ├── SUMMARY.md                # ملخص المشروع
    ├── TESTING_GUIDE.md          # دليل الاختبار
    ├── PREVIEW_GUIDE.md          # دليل المعاينة
    ├── UPGRADE_GUIDE.md          # دليل الترقية
    └── وثائق الأداء والتحسينات...
```

---

## شرح المجلدات الرئيسية | Main Directories Explanation

### 1. مجلد `app/` | App Directory

هذا هو المجلد الرئيسي للتطبيق الذي يستخدم Next.js App Router (الإصدار 13+). يحتوي على:

- **الصفحات الرئيسية**: الصفحة الرئيسية، صفحة الإعلانات، تفاصيل الإعلان
- **صفحات الفئات**: 17 فئة مختلفة (سيارات، عقارات، جوالات، إلخ)
- **صفحات المستخدم**: تسجيل الدخول، التسجيل، الملف الشخصي، إعلاناتي
- **صفحات الإدارة**: لوحة تحكم المشرف لإدارة الموقع
- **صفحات المحادثة**: نظام المحادثة الفورية
- **صفحات المحتوى**: من نحن، اتصل بنا، المساعدة، الشروط، الخصوصية
- **API Routes**: مسارات API للوظائف الخاصة

#### الملفات المهمة في `app/`:
- `layout.js`: التخطيط الرئيسي الذي يحيط بجميع الصفحات
- `page.js`: الصفحة الرئيسية للموقع
- `globals.css`: الأنماط العامة المطبقة على الموقع بأكمله
- `error.jsx`: صفحة معالجة الأخطاء
- `loading.jsx`: صفحة التحميل الافتراضية
- `not-found.jsx`: صفحة 404 (الصفحة غير موجودة)

### 2. مجلد `components/` | Components Directory

يحتوي على جميع المكونات القابلة لإعادة الاستخدام في التطبيق:

- **مكونات العرض**: Header، CategoryBar، ListingCard، ImageGallery
- **مكونات التفاعل**: AuctionBox، CommentsBox، Chat
- **مكونات الخرائط**: HomeListingsMap، ListingMap، LocationPicker
- **مكونات SEO**: StructuredData (JSON-LD للبحث)
- **مكونات الحالة**: EmptyState، SkeletonLoader، OfflineIndicator، ErrorBoundary

### 3. مجلد `lib/` | Library Directory

يحتوي على الوظائف المساعدة والمكتبات:

- **Firebase**: إعدادات وأدوات Firebase (Client، Admin، REST API)
- **Hooks**: Custom React Hooks للمصادقة وملف المستخدم
- **Utilities**: وظائف مساعدة للتحليلات، أسعار العملات، المشاهدات

### 4. مجلد `public/` | Public Directory

يحتوي على الملفات الثابتة التي يمكن الوصول إليها مباشرة:

- **الأيقونات**: Favicons وأيقونات التطبيق بأحجام مختلفة
- **PWA**: manifest.json وservice worker للتطبيق التقدمي
- **الصفحات الثابتة**: offline.html، robots.txt

---

## التقنيات المستخدمة | Technology Stack

### Frontend
- **Next.js 16.1.1**: إطار React مع App Router
- **React 19.2.3**: مكتبة واجهة المستخدم
- **Leaflet ^1.9.4 & React-Leaflet ^5.0.0**: مكتبة الخرائط التفاعلية
- **Lucide React ^0.562.0**: مكتبة الأيقونات

### Backend & Database
- **Firebase 12.7.0**: قاعدة البيانات والمصادقة
  - Firestore: قاعدة البيانات NoSQL
  - Firebase Auth: نظام المصادقة
  - Firebase Storage: تخزين الصور
- **firebase-admin 13.6.0**: Firebase Admin SDK للخادم
- **Firestore REST API**: لجلب البيانات في Server Components

### Development Tools
- **ESLint 9.39.2**: للتحقق من جودة الكود
- **Next.js Bundle Analyzer**: لتحليل حجم الحزم

### Styling
- **CSS Modules**: للأنماط المحلية
- **Global CSS**: للأنماط العامة
- **RTL Support**: دعم كامل للغة العربية (من اليمين إلى اليسار)

---

## أنماط التقديم | Rendering Patterns

المشروع يستخدم استراتيجية تقديم هجينة:

1. **SSR (Server-Side Rendering)**: للصفحة الرئيسية وصفحات الفئات
2. **ISR (Incremental Static Regeneration)**: لتفاصيل الإعلانات
3. **CSR (Client-Side Rendering)**: للمكونات التفاعلية والخاصة بالمستخدم

---

## مميزات SEO | SEO Features

- **Metadata**: عناوين وأوصاف ديناميكية لكل صفحة
- **Open Graph**: لمشاركة أفضل على وسائل التواصل
- **Twitter Cards**: للعرض المحسن على تويتر
- **JSON-LD**: بيانات منظمة للبحث (Website، Listing، Breadcrumb)
- **Sitemap**: خريطة موقع ديناميكية
- **Robots.txt**: ملف robots.txt للتحكم في الزحف

---

## مميزات الأداء | Performance Features

- **Lazy Loading**: تحميل الصور والمكونات بشكل كسول
- **Dynamic Imports**: استيراد ديناميكي للمكونات الثقيلة
- **Image Optimization**: تحسين الصور تلقائياً
- **Code Splitting**: تقسيم الكود تلقائياً
- **Caching**: استخدام ISR للتخزين المؤقت
- **PWA Ready**: جاهز ليكون تطبيق ويب تقدمي

---

## الفئات المتاحة | Available Categories

1. **cars** - السيارات
2. **realestate** - العقارات
3. **phones** - الجوالات
4. **electronics** - الإلكترونيات
5. **motorcycles** - الدراجات النارية
6. **heavy_equipment** - المعدات الثقيلة
7. **solar** - الطاقة الشمسية
8. **networks** - الشبكات
9. **maintenance** - الصيانة
10. **furniture** - الأثاث
11. **home_tools** - أدوات المنزل
12. **clothes** - الملابس
13. **animals** - الحيوانات
14. **jobs** - الوظائف
15. **services** - الخدمات
16. **other** - أخرى

---

## المسارات المهمة | Important Routes

### مسارات عامة | Public Routes
- `/` - الصفحة الرئيسية
- `/listings` - جميع الإعلانات
- `/[category]` - صفحة فئة محددة
- `/listing/[id]` - تفاصيل إعلان
- `/categories` - جميع الفئات

### مسارات المستخدم | User Routes
- `/login` - تسجيل الدخول
- `/register` - التسجيل
- `/profile` - الملف الشخصي
- `/my-listings` - إعلاناتي
- `/add` - إضافة إعلان
- `/edit-listing/[id]` - تعديل إعلان

### مسارات المحادثة | Chat Routes
- `/chat/[id]` - محادثة محددة
- `/my-chats` - جميع محادثاتي

### مسارات الإدارة | Admin Routes
- `/admin` - لوحة التحكم
- `/admin/listings` - إدارة الإعلانات
- `/admin/users` - إدارة المستخدمين
- `/admin/payouts` - إدارة المدفوعات

### مسارات المحتوى | Content Routes
- `/about` - من نحن
- `/contact` - اتصل بنا
- `/help` - المساعدة
- `/terms` - الشروط والأحكام
- `/privacy` - سياسة الخصوصية

---

## كيفية البدء | Getting Started

```bash
# تثبيت التبعيات
npm install

# تشغيل الخادم المحلي
npm run dev

# بناء المشروع للإنتاج
npm run build

# تشغيل الإنتاج محلياً
npm start

# فحص الكود
npm run lint

# تحليل حجم الحزم
npm run analyze
```

---

## متغيرات البيئة | Environment Variables

أنشئ ملف `.env.local` بناءً على `.env.example`:

```
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (Server-side)
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
FIREBASE_ADMIN_PROJECT_ID=

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## المراجع الإضافية | Additional References

- **README.md**: الملف التعريفي الرئيسي
- **PROJECT_REFERENCE.md**: مرجع تقني مفصل
- **QUICKSTART_AR.md**: دليل البدء السريع بالعربية
- **TESTING_GUIDE.md**: دليل اختبار المشروع
- **PERFORMANCE_OPTIMIZATION_GUIDE.md**: دليل تحسين الأداء

---

## ملاحظات مهمة | Important Notes

1. المشروع يدعم اللغة العربية بالكامل (RTL)
2. التصميم Mobile First لتجربة موبايل ممتازة
3. استخدام Next.js App Router (الإصدار الجديد)
4. دعم PWA للعمل كتطبيق ويب تقدمي
5. SEO محسّن لمحركات البحث
6. أداء عالي مع ISR و Caching
7. نظام مزادات فوري
8. نظام محادثة مباشر

---

## التواصل والدعم | Contact & Support

للاستفسارات والدعم، راجع:
- صفحة المساعدة: `/help`
- صفحة اتصل بنا: `/contact`

---

**آخر تحديث**: يناير 2026  
**الإصدار**: 0.1.0
