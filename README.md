# سوق اليمن - نسخة Next.js (App Router)

هذه نسخة Next.js منظمة تنقل أهم مميزات مشروع index.html:
- الإعلانات + الأقسام
- التسعير بثلاث عملات (YER / SAR / USD)
- الخريطة وتحديد الموقع (Leaflet / OpenStreetMap)
- نظام المزاد (عداد + مزايدة أعلى من السعر الحالي)
- تسجيل المشاهدات (visitorId + زيادة views)
- الدردشة (Chat) عبر Firestore

## التشغيل
1) ثبت الحزم:
```bash
npm install
```

2) شغل:
```bash
npm run dev
```

افتح: http://localhost:3000

## Firebase
- يمكنك استخدام نفس مشروع Firebase الموجود حالياً.
- إذا غيرت الدومين (sooqyemen.com) لا تغير firebaseConfig، فقط أضف الدومين في:
Authentication → Settings → Authorized domains

## Collections المستخدمة (Firestore)
- listings
  - subcollection: views
  - subcollection: bids
- categories
- site_views
- chats
  - subcollection: messages
- blocked_users

## صفحات
- /              الصفحة الرئيسية
- /listing/[id]  تفاصيل إعلان + خريطة + مزاد + بدء محادثة
- /add           إضافة إعلان (مع اختيار موقع + رفع صور)
- /admin         إدارة (حذف إعلانات + إدارة أقسام + حظر مستخدمين)
- /chat/[id]     الدردشة
