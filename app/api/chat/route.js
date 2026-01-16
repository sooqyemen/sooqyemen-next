import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req) {
  console.log("--------------- بداية الاتصال -------------");
  
  try {
    // 1. قراءة المفتاح
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("1. حالة المفتاح:", apiKey ? "موجود ✅" : "مفقود ❌");
    
    if (!apiKey) {
      console.error("خطأ: المفتاح غير موجود في ملف .env.local");
      return NextResponse.json({ error: "Server Error: API Key missing" }, { status: 500 });
    }

    // 2. استلام الرسالة
    const body = await req.json();
    console.log("2. رسالة المستخدم:", body.message);

    // 3. الاتصال بجوجل
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    console.log("3. جاري إرسال الطلب لجوجل...");
    const result = await model.generateContent(body.message);
    const response = await result.response;
    const text = response.text();
    
    console.log("4. تم استلام الرد بنجاح ✅");
    console.log("--------------- نهاية الاتصال -------------");

    return NextResponse.json({ reply: text });

  } catch (error) {
    console.error("❌❌ حدث خطأ كبير ❌❌");
    console.error(error);
    return NextResponse.json({ error: "فشل الاتصال" }, { status: 500 });
  }
}
