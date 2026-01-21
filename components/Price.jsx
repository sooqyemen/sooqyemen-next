// components/Price.jsx
'use client';

import { useMemo } from 'react';
import { useRates, toYER } from '@/lib/rates';

const FALLBACK_SAR_TO_YER = 425;   // 1 SAR = 425 YER
const FALLBACK_USD_TO_YER = 1632;  // 1 USD = 1632 YER

function parseMoney(val) {
  if (val === undefined || val === null) return NaN;
  if (typeof val === 'number') return val;
  let s = String(val).trim();
  if (!s) return NaN;

  // Normalize Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩) and Eastern Arabic digits (۰۱۲۳۴۵۶۷۸۹)
  const map = {
    '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
    '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9',
  };
  s = s.replace(/[٠-٩۰-۹]/g, (d) => map[d] || d);

  // Remove separators and keep digits + dot only
  s = s.replace(/[,\s]/g, '');
  s = s.replace(/[^0-9.]/g, '');

  const n = Number(s);
  return isFinite(n) ? n : NaN;
}

function currencyLabel(cur) {
  const c = String(cur || 'YER').toUpperCase();
  if (c === 'SAR') return 'ريال سعودي';
  if (c === 'USD') return 'دولار';
  return 'ريال يمني';
}

function formatAmount(cur, value) {
  const c = String(cur || 'YER').toUpperCase();
  const n = Number(value);
  if (!isFinite(n) || n <= 0) return '—';

  if (c === 'YER') {
    return new Intl.NumberFormat('ar-YE', { maximumFractionDigits: 0 }).format(Math.round(n));
  }
  // SAR / USD
  return new Intl.NumberFormat('ar-YE', { maximumFractionDigits: 2 }).format(n);
}

/**
 * Price component:
 * - يعرض العملة الأصلية (إن توفرت) كسعر أساسي
 * - ويعرض التحويلات تحتها باستخدام أسعار الصرف من Firestore (settings/rates)
 *
 * ملاحظة: لا نعتمد على أرقام ثابتة داخل الكود؛ أي تغيير في Firestore ينعكس فوراً على العرض.
 */
export default function Price({
  priceYER = 0,
  originalPrice,
  originalCurrency = 'YER',
  showConversions = true,
}) {
  const rates = useRates();

  const view = useMemo(() => {
    const yerPerSAR = Number(rates?.sar || FALLBACK_SAR_TO_YER) > 0 ? Number(rates.sar) : FALLBACK_SAR_TO_YER;
    const yerPerUSD = Number(rates?.usd || FALLBACK_USD_TO_YER) > 0 ? Number(rates.usd) : FALLBACK_USD_TO_YER;

    const rawCur = String(originalCurrency || 'YER').toUpperCase();
    const origNum = parseMoney(originalPrice);

    const hasOrig =
      (rawCur === 'YER' || rawCur === 'SAR' || rawCur === 'USD') &&
      isFinite(origNum) &&
      origNum > 0;

    // ✅ YER "فعلي" للعرض والتحويل:
    // لو الأصل متوفر، نحسبه من الأصل بأسعار الصرف الحالية (حتى يتحدث مع تحديث الصرف).
    const effectiveYER = hasOrig ? Number(toYER(origNum, rawCur, rates)) : Number(priceYER || 0);

    // السعر الأساسي المعروض
    const mainCur = hasOrig ? rawCur : 'YER';
    const mainVal = hasOrig ? origNum : effectiveYER;

    const sar = yerPerSAR > 0 ? effectiveYER / yerPerSAR : null;
    const usd = yerPerUSD > 0 ? effectiveYER / yerPerUSD : null;

    return {
      main: { cur: mainCur, num: formatAmount(mainCur, mainVal), label: currencyLabel(mainCur) },
      subs: [
        { cur: 'YER', num: formatAmount('YER', effectiveYER), label: currencyLabel('YER') },
        { cur: 'SAR', num: formatAmount('SAR', sar), label: currencyLabel('SAR') },
        { cur: 'USD', num: formatAmount('USD', usd), label: currencyLabel('USD') },
      ].filter((x) => x.cur !== mainCur),
    };
  }, [priceYER, originalPrice, originalCurrency, rates]);

  return (
    <div>
      <div style={{ fontWeight: 900, fontSize: 18 }}>
        <span dir="ltr">{view.main.num}</span>{' '}
        <span style={{ fontWeight: 400 }}>{view.main.label}</span>
      </div>

      {showConversions && view.subs?.length ? (
        <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
          ≈ {view.subs.map((x) => `${x.num} ${x.label}`).join(' • ')}
        </div>
      ) : null}
    </div>
  );
}
