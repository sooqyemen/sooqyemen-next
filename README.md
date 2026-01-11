# سوق اليمن | Souq Yemen

منصة إعلانات ومزادات يمنية حديثة مبنية على Next.js و Firebase لتقديم تجربة بيع وشراء سلسة، سريعة، وآمنة مع دعم كامل للواجهة العربية وتجربة موبايل محسّنة.

## ما الذي يقدمه الموقع؟
- أكثر من 16 فئة: سيارات، عقارات، جوالات وإلكترونيات، معدات ثقيلة، وظائف، خدمات، حيوانات، وغيرها.
- إعلانات عامة مع صور وأسعار بالريال اليمني والدولار.
- مزادات مباشرة بتحديث فوري للبيانات.
- محادثة فورية بين البائع والمشتري.
- خرائط تفاعلية لتحديد مواقع الإعلانات.
- مصادقة وحسابات شخصية مع إدارة الإعلانات.
- لوحة إدارة لمراجعة الإعلانات والمستخدمين والمدفوعات.
- دعم كامل للعربية (RTL) وتصميم Mobile First.

## المزايا التقنية
- Next.js 16 (App Router) مع بنية هجينة SSR + ISR + CSR.
- React 19 لواجهات تفاعلية.
- Firebase (Firestore, Auth, Storage) عبر compat SDK + firebase-admin على السيرفر.
- Firestore REST API لقراءة البيانات في Server Components.
- Leaflet / React-Leaflet للخرائط.
- SEO متقدم: Open Graph، Twitter Cards، JSON-LD، sitemap، robots.txt.
- تحسين أداء: Lazy Loading للصور، Dynamic Imports للمكونات الثقيلة، Cache/ISR، manifest و PWA-ready.

## هيكل الصفحات والوظائف الأساسية
- الصفحة الرئيسية، صفحة جميع الإعلانات `/listings`، وصفحات الفئات الـ16 (cars, phones, electronics, realestate, motorcycles, heavy_equipment, solar, networks, maintenance, furniture, home_tools, clothes, animals, jobs, services, other).
- صفحة تفاصيل الإعلان مع معرض صور، خريطة، مزاد، وتعليقات.
- إضافة وتعديل وإدارة الإعلانات (`/add`, `/edit-listing/[id]`, `/my-listings`).
- المصادقة والملف الشخصي (`/login`, `/register`, `/profile`).
- المحادثات (`/chat/[id]`, `/my-chats`).
- صفحات المحتوى (`/about`, `/contact`, `/help`, `/terms`, `/privacy`).
- لوحة الإدارة (`/admin/listings`, `/admin/users`, `/admin/payouts`).

## كيف تشغّل المشروع محلياً؟
```bash
npm install
npm run dev
# للنشر المحلي
npm run build && npm start
```
ضع متغيرات البيئة في `.env.local` (إعدادات Firebase و `NEXT_PUBLIC_SITE_URL`).

## مراجع مهمة في الكود
- `app/page.js`, `app/listings/page.js`, `app/[category]/page.jsx` لصفحات SSR/ISR.
- `app/listing/[id]/page.js` و `page-client.js` لتفاصيل الإعلان والتفاعل.
- `lib/firestoreRest.js` لجلب البيانات عبر Firestore REST.
- `components/` لبطاقات الإعلانات، الخرائط، والبيانات المنظمة (JSON-LD).
- وثائق إضافية: `PROJECT_REFERENCE.md`, `SUMMARY.md`, `QUICKSTART_AR.md`.
