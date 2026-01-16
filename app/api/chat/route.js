// 👇 هذا السطر هو الحل لمشكلة البناء
export const runtime = "nodejs";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req) {
  console.log("--------------- بداية الاتصال -------------");

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("1. حالة المفتاح:", apiKey ? "موجود ✅" : "مفقود ❌");

    if (!apiKey) {
      return NextResponse.json(
        { error: "Server Error: GEMINI_API_KEY missing" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const message = typeof body.message === "string" ? body.message.trim() : "";

    console.log("2. رسالة المستخدم:", message);

    if (!message) {
      return NextResponse.json(
        { error: "Bad Request: message is required" },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    console.log("3. جاري إرسال الطلب لجوجل...");
    const result = await model.generateContent(message);
    const response = await result.response;
    const text = response.text();

    console.log("4. تم استلام الرد بنجاح ✅");
    console.log("--------------- نهاية الاتصال -------------");

    return NextResponse.json({ reply: text });
  } catch (error) {
    console.error("❌❌ حدث خطأ كبير ❌❌");
    console.error(error); // طباعة الخطأ كاملاً
    return NextResponse.json({ error: "فشل الاتصال" }, { status: 500 });
  }
}
