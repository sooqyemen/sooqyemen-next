import { NextResponse } from 'next/server';
import { 
  checkRateLimit, 
  normalizeText, 
  findBestMatch, 
  categoryNameFromSlug,
  detectCategorySlug
} from '@/lib/chat/utils';
import { 
  getUserFromRequest, 
  handleListingWizard, 
  tryCountListings, 
  analyzeIntentAndSentiment, 
  runAiFallback,
  adminNotReadyMessage 
} from '@/lib/chat/service';
import { greetings, thanks } from '@/lib/chat/data';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { message, history, meta } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'الرسالة مطلوبة' }, { status: 400 });
    }

    const trimmedMessage = message.trim();
    
    // 1. Rate Limiting (Note: Best effort in Serverless)
    const user = await getUserFromRequest(request);
    const userId = user?.uid || 'anonymous';
    
    if (!checkRateLimit(userId, 'assistant_request')) {
      return NextResponse.json({
        error: 'لقد تجاوزت الحد المسموح من الطلبات. حاول مرة أخرى بعد دقيقة.'
      }, { status: 429 });
    }

    const normalized = normalizeText(trimmedMessage);

    // 2. Handle Wizard (Create Listing) - Requires Auth
    // If the user is authenticated and potentially in a wizard flow, handle it here.
    if (user && !user.error) {
       // Check if user explicitly wants to cancel or start
       const isStart = normalized.includes('اضف اعلان') || normalized.includes('انشاء اعلان');
       
       // If starting or potentially inside a wizard (this logic can be refined to check DB for active draft first)
       // For this refactor, we call the wizard handler which checks for draft existence internally.
       if (isStart || normalized.includes('الغاء') || meta?.images?.length > 0) {
           const res = await handleListingWizard({ user, message: trimmedMessage, meta });
           // If the wizard returned a reply, it means it handled the request
           if (res && res.reply && !res.reply.includes('بدأنا من جديد') /* Logic to determine if handled */) {
               return NextResponse.json({ reply: res.reply });
           }
       }
       
       // If we didn't return above, we might still be in a draft, let's try calling it if it looks like a wizard input
       // (Simplified: In a real app, checking if a draft exists first is better for performance)
       const wizRes = await handleListingWizard({ user, message: trimmedMessage, meta });
       if (wizRes && wizRes.reply && !wizRes.reply.includes('بدأنا من جديد')) {
           return NextResponse.json({ reply: wizRes.reply });
       }
    }

    // 3. Simple Intents (Count, Greetings)
    if (normalized.includes('كم عدد') || normalized.includes('عدد الاعلانات')) {
        const cat = detectCategorySlug(normalized);
        const result = await tryCountListings(cat);
        if (!result.ok) return NextResponse.json({ reply: adminNotReadyMessage() });
        
        const label = cat ? categoryNameFromSlug(cat) : 'كل الأقسام';
        return NextResponse.json({ reply: `عدد الإعلانات في ${label}: ${result.publicCount}` });
    }

    if (greetings.some(g => normalized.includes(normalizeText(g)))) {
        return NextResponse.json({ reply: 'مرحباً بك في سوق اليمن! 🇾🇪\nكيف يمكنني مساعدتك اليوم؟' });
    }

    if (thanks.some(t => normalized.includes(normalizeText(t)))) {
        return NextResponse.json({ reply: 'العفو! 😊' });
    }

    // 4. Knowledge Base (FAQ)
    const faqAnswer = findBestMatch(trimmedMessage);
    if (faqAnswer) {
      return NextResponse.json({ reply: faqAnswer });
    }

    // 5. AI Fallback
    const analysis = await analyzeIntentAndSentiment(trimmedMessage);
    if (analysis.intents.isAskingForHelp || analysis.intents.isLookingToBuy) {
        const aiResult = await runAiFallback({ message: trimmedMessage, history });
        if (aiResult.ok) {
            return NextResponse.json({ reply: aiResult.reply });
        }
    }

    // 6. Default Fallback
    return NextResponse.json({
      reply: 'لم أفهم سؤالك تماماً 🤔\nيمكنك السؤال عن:\n• كيفية إضافة إعلان\n• عدد الإعلانات\n• أو اكتب "أضف إعلان" للبدء.'
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'حدث خطأ في معالجة الطلب' }, { status: 500 });
  }
}
