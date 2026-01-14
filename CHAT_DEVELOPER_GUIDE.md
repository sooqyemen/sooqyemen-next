# نظام المحادثات - دليل المطور

## 📋 نظرة عامة

هذا الدليل يشرح كيفية عمل نظام المحادثات في مشروع sooqyemen-next بعد الإصلاح الشامل.

## 🏗️ البنية المعمارية

### المكونات الرئيسية

```
lib/
├── chatId.js          # توليد معرف محادثة ثابت
└── chatService.js     # إدارة وثائق المحادثات

app/
└── chat/[id]/
    └── page.js        # صفحة المحادثة الرئيسية

components/
└── Chat/
    ├── ChatList.jsx   # قائمة المحادثات
    └── ChatBox.jsx    # صندوق المحادثة (مكون قابل لإعادة الاستخدام)

firestore.rules        # قواعد الأمان
```

## 🔑 المفاهيم الأساسية

### 1. معرف المحادثة الثابت (Deterministic Chat ID)

بدلاً من إنشاء معرف عشوائي، نستخدم صيغة ثابتة:

```javascript
// مع إعلان
listingId__minUid__maxUid

// بدون إعلان
minUid__maxUid
```

**مثال:**
```javascript
import { makeChatId } from '@/lib/chatId';

const chatId = makeChatId('userA', 'userB', 'listing123');
// النتيجة: "listing123__userA__userB"
```

**الفوائد:**
- لا تكرار للمحادثات
- يمكن حساب chatId من أي مكان
- روابط ثابتة يمكن مشاركتها

### 2. ضمان وجود المحادثة (ensureChatDoc)

قبل فتح محادثة، نتأكد من وجود وثيقتها في Firestore:

```javascript
import { ensureChatDoc } from '@/lib/chatService';

await ensureChatDoc(chatId, uid1, uid2, {
  listingId: 'listing123',
  listingTitle: 'عنوان الإعلان'
});
```

**ماذا يحدث:**
- إذا لم توجد: تُنشأ وثيقة جديدة
- إذا وجدت: يُحدث timestamp فقط

### 3. صيغة الرسالة الموحدة

جميع الرسائل تستخدم هذه الصيغة:

```javascript
{
  from: uid,           // معرف المرسل
  text: "نص الرسالة",
  createdAt: serverTimestamp()
}
```

**ملاحظة:** الكود يدعم الصيغة القديمة (`senderUid`) للتوافق العكسي.

## 💻 كيفية الاستخدام

### إنشاء محادثة جديدة

```javascript
import { useRouter } from 'next/navigation';
import { makeChatId } from '@/lib/chatId';
import { ensureChatDoc } from '@/lib/chatService';

const router = useRouter();
const currentUserId = user?.uid;
const otherUserId = listing.userId;
const listingId = listing.id;

async function startChat() {
  try {
    // 1. توليد chatId
    const chatId = makeChatId(currentUserId, otherUserId, listingId);
    
    // 2. ضمان وجود الوثيقة
    await ensureChatDoc(chatId, currentUserId, otherUserId, {
      listingId: listingId,
      listingTitle: listing.title
    });
    
    // 3. الانتقال للمحادثة
    router.push(`/chat/${chatId}`);
  } catch (error) {
    console.error('Failed to start chat:', error);
  }
}
```

### عرض قائمة المحادثات

```javascript
import ChatList from '@/components/Chat/ChatList';

export default function MyChatsPage() {
  return (
    <div>
      <h1>💬 محادثاتي</h1>
      <ChatList />
    </div>
  );
}
```

### إضافة زر محادثة في صفحة الإعلان

```javascript
<button onClick={startChat} disabled={loading}>
  {loading ? '⏳' : '💬'} محادثة
</button>
```

## 🔒 Firebase Security Rules

### نشر القواعد

```bash
firebase deploy --only firestore:rules
```

أو يدوياً من Firebase Console → Firestore → Rules.

### كيف تعمل القواعد

**قراءة المحادثات:**
```javascript
allow read: if isSignedIn() && 
               request.auth.uid in resource.data.participants;
```

**كتابة الرسائل:**
```javascript
allow create: if isSignedIn() && 
                 request.auth.uid in get(...).data.participants &&
                 request.resource.data.from == request.auth.uid &&
                 // ... شروط أخرى
```

## 📊 بنية البيانات في Firestore

### وثيقة المحادثة (`/chats/{chatId}`)

```javascript
{
  participants: ["uidA", "uidB"],     // المشاركون
  listingId: "listing123",            // معرف الإعلان (اختياري)
  listingTitle: "عنوان الإعلان",      // عنوان الإعلان (اختياري)
  createdAt: Timestamp,               // تاريخ الإنشاء
  updatedAt: Timestamp,               // آخر تحديث
  lastMessageText: "آخر رسالة",       // نص آخر رسالة
  lastMessageBy: "uidA",              // مرسل آخر رسالة
  unread: {                           // عدد الرسائل غير المقروءة
    uidA: 0,
    uidB: 3
  }
}
```

### وثيقة الرسالة (`/chats/{chatId}/messages/{messageId}`)

```javascript
{
  from: "uidA",                       // معرف المرسل
  text: "نص الرسالة",                 // محتوى الرسالة
  createdAt: Timestamp                // وقت الإرسال
}
```

## 🎨 تخصيص التصميم

### تغيير لون badge الرسائل غير المقروءة

في `components/Chat/ChatList.jsx`:

```javascript
const unreadBadgeStyle = {
  marginLeft: 8,
  background: '#ef4444',  // غيّر هذا اللون
  color: 'white',
  padding: '2px 8px',
  borderRadius: 12,
  fontSize: 11,
  fontWeight: 'bold',
};
```

### تغيير تصميم فقاعات الرسائل

في `app/chat/[id]/page.js`، الأسطر 259-268:

```javascript
style={{
  maxWidth: '78%',          // عرض الفقاعة
  padding: '8px 10px',      // المساحة الداخلية
  borderRadius: 12,          // انحناء الأطراف
  background: mine ? '#eef2ff' : '#f3f4f6',  // لون الخلفية
  border: '1px solid #e5e7eb',
  // ...
}}
```

## 🐛 استكشاف الأخطاء

### المشكلة: "chatId مفقود"

**الأسباب المحتملة:**
- الرابط لا يحتوي على معرف المحادثة
- استخدام `params` prop بدلاً من `useParams()`

**الحل:**
```javascript
// ❌ خطأ
export default function ChatPage({ params }) {
  const chatId = params?.id;
}

// ✅ صحيح
import { useParams } from 'next/navigation';

export default function ChatPage() {
  const params = useParams();
  const chatId = params?.id;
}
```

### المشكلة: "فشل إرسال الرسالة"

**الأسباب المحتملة:**
- Firebase rules لم تُنشر
- صيغة الرسالة خاطئة
- المستخدم ليس مشاركاً في المحادثة

**الحل:**
1. تأكد من نشر `firestore.rules`
2. تأكد من صيغة الرسالة: `{from, text, createdAt}`
3. تحقق من Console للأخطاء

### المشكلة: تكرار المحادثات

**السبب:**
- استخدام دالة `makeChatId` محلية قديمة

**الحل:**
```javascript
// استخدم دائماً الدالة من lib
import { makeChatId } from '@/lib/chatId';
```

## 📈 الأداء

### Firestore Reads

كل رسالة تتطلب:
- 1 قراءة للتحقق من participants (في rules)
- 1 قراءة لجلب الرسالة نفسها

**التحسينات الممكنة:**
- Cache participants في client-side
- استخدام Firebase Functions للتحقق
- Custom claims للمستخدمين

### Firestore Writes

كل رسالة تتطلب:
- 1 كتابة للرسالة
- 1 كتابة لتحديث وثيقة المحادثة

هذا مقبول لمعظم التطبيقات.

## 🧪 الاختبار

راجع `CHAT_TESTING_GUIDE.md` للتفاصيل الكاملة.

**اختبار سريع:**
```bash
# 1. شغل المشروع
npm run dev

# 2. افتح متصفح
# 3. سجل دخول
# 4. اذهب لأي إعلان
# 5. اضغط "💬 محادثة"
# 6. أرسل رسالة
```

## 📚 مراجع إضافية

- [CHAT_SYSTEM_FIX_SUMMARY.md](./CHAT_SYSTEM_FIX_SUMMARY.md) - ملخص الإصلاحات
- [FIRESTORE_RULES_CHAT.md](./FIRESTORE_RULES_CHAT.md) - شرح القواعد
- [CHAT_TESTING_GUIDE.md](./CHAT_TESTING_GUIDE.md) - دليل الاختبار

## 🤝 المساهمة

عند تعديل نظام المحادثات:
1. حافظ على صيغة chatId الثابتة
2. استخدم `ensureChatDoc` دائماً قبل الانتقال
3. التزم بصيغة الرسالة الموحدة
4. اختبر على الجوال والكمبيوتر
5. حدّث هذا الدليل إذا لزم الأمر

## 📝 License

نفس ترخيص المشروع الرئيسي.
