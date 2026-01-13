// scripts/updateSeedImages.cjs
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const keyPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.join(__dirname, "serviceAccount.json");

if (!fs.existsSync(keyPath)) {
  console.error("❌ ملف الخدمة غير موجود:", keyPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// نحدّث فقط إعلانات الـ seed (حسب رقم الهاتف الثابت)
const SEED_PHONE = "770000000";

// صور “شكلها طبيعي” (ثابتة لكل إعلان) + صورة ثانية عنوانية (اختياري)
function makeImages({ id, title, category }) {
  const seed = `${category || "other"}-${id}`;
  const cleanTitle = String(title || "Sooq Yemen").trim().slice(0, 28);

  // صورة عشوائية ثابتة لكل إعلان (ما تتغير كل مرة)
  const img1 = `https://picsum.photos/seed/${encodeURIComponent(seed)}/900/600`;

  // صورة ثانية بعنوان الإعلان (اختياري) — إذا ما تبغاها احذفها
  const img2 = `https://placehold.co/900x600/0f172a/ffffff?text=${encodeURIComponent(cleanTitle)}`;

  return [img1, img2];
}

(async () => {
  console.log("🔄 تحديث صور إعلانات الـ seed ...");

  const snap = await db
    .collection("listings")
    .where("phone", "==", SEED_PHONE)
    .get();

  console.log(`📌 عدد الإعلانات المستهدفة (phone=${SEED_PHONE}): ${snap.size}`);

  if (snap.empty) {
    console.log("⚠️ ما لقيت إعلانات seed بهذا الرقم. تأكد من رقم الهاتف في seed.");
    process.exit(0);
  }

  let batch = db.batch();
  let ops = 0;
  let done = 0;

  for (const doc of snap.docs) {
    const d = doc.data() || {};
    const images = makeImages({ id: doc.id, title: d.title, category: d.category });

    batch.update(doc.ref, {
      images,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    ops++;
    done++;

    // حد Firestore للباتش 500 — نخليها 450 احتياط
    if (ops >= 450) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
      console.log(`✅ تم تحديث: ${done}/${snap.size}`);
    }
  }

  if (ops > 0) await batch.commit();

  console.log("🎉 انتهينا! تم تحديث الصور:", done);
  process.exit(0);
})().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});
