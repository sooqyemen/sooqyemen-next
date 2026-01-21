// components/Price.jsx
'use client';

import { useMemo } from 'react';
import { useRates, toYER } from '@/lib/rates';

/**
 * ✅ Price (مكوّن موحّد لعرض الأسعار في كل الصفحات)
 *
 * الفكرة:
 * - التخزين والفلترة والفرز: تعتمد على priceYER / currentBidYER (عملة معيارية واحدة)
 * - العرض: نُظهر العملة الأصلية (originalCurrency + originalPrice) كسعر أساسي إن كانت موجودة،
 *          ونُظهر التحويلات (YER/SAR/USD) حسب أسعار الصرف الحالية القادمة من Firestore (settings/rates).
 *
 * مهم:
 * - لتفادي اختلاف السعر بين "الكرت" و"صفحة التفاصيل": استخدم هذا المكوّن في الاثنين.
 * - يدعم المزايدات: إذا وجد currentBidYER يستخدمه للتحويلات (ولا يعيد حسابه من الأصل).
 */

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

function getYerPerSAR(rates) {
  const r = rates || {};
  const v = Number(r.SAR || r.sar || r.sarRate || r.sarToYer || r.sar_yer || FALLBACK_SAR_TO_YER);
  return v > 0 ? v : FALLBACK_SAR_TO_YER;
}

function getYerPerUSD(rates) {
  const r = rates || {};
  const v = Number(r.USD || r.usd || r.usdRate || r.usdToYer || r.usd_yer || FALLBACK_USD_TO_YER);
  return v > 0 ? v : FALLBACK_USD_TO_YER;
}

function formatAmount(cur, value) {
  const c = String(cur || 'YER').toUpperCase();
  const n = Number(value);
  if (!isFinite(n) || n <= 0) return '—';

  if (c === 'YER') {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(n));
  }
  if (c === 'USD') {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  }
  // SAR وغيره
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);
}

/**
 * @param {object} props.listing (اختياري) — مرّر الإعلان كاملًا لتفادي تكرار تمرير الحقول
 * @param {number} props.priceYER — fallback إذا ما مرّرت listing
 * @param {any} props.originalPrice — fallback إذا ما مرّرت listing
 * @param {string} props.originalCurrency — fallback إذا ما مرّرت listing
 * @param {boolean} props.showConversions — إظهار التحويلات تحت السعر الأساسي
 * @param {'compact'|'hero'} props.variant — للتحكم في حجم العرض (كرت/تفاصيل)
 */
export default function Price({
  listing,
  priceYER = 0,
  originalPrice,
  originalCurrency = 'YER',
  showConversions = true,
  variant = 'compact',
}) {
  const rates = useRates();

  const view = useMemo(() => {
    const yerPerSAR = getYerPerSAR(rates);
    const yerPerUSD = getYerPerUSD(rates);

    const src = listing || {};
    const rawCur = String((src.originalCurrency ?? originalCurrency) || 'YER').toUpperCase();
    const origNum = parseMoney(src.originalPrice ?? originalPrice);

    const hasOrig =
      (rawCur === 'YER' || rawCur === 'SAR' || rawCur === 'USD') &&
      isFinite(origNum) &&
      origNum > 0;

    // السعر المخزن (يُستخدم للفلترة/الفرز/المزاد)
    const storedYER = Number(
      src.currentBidYER ?? src.priceYER ?? priceYER ?? 0
    ) || 0;

    // المزاد: إذا فيه currentBidYER نعتبره هو الحقيقة (ولا نعيد حسابه من الأصل)
    const hasBid = Number(src.currentBidYER || 0) > 0;

    // ✅ YER "فعلي" للعرض والتحويل:
    // - إن لم يكن مزادًا وكان الأصل متوفرًا: نحسبه من الأصل بأسعار الصرف الحالية
    // - وإلا: نعتمد على المخزن
    let effectiveYER = storedYER;
    if (!hasBid && hasOrig) {
      const computed = Number(toYER(origNum, rawCur, rates));
      if (isFinite(computed) && computed > 0) effectiveYER = computed;
    }
    if (!effectiveYER && !hasBid && hasOrig) {
      const computed = Number(toYER(origNum, rawCur, rates));
      if (isFinite(computed) && computed > 0) effectiveYER = computed;
    }

    const sar = yerPerSAR > 0 ? effectiveYER / yerPerSAR : null;
    const usd = yerPerUSD > 0 ? effectiveYER / yerPerUSD : null;

    // السعر الأساسي (Main):
    // - إعلان عادي + لديه أصل: نعرض الأصل نفسه (مثلاً 1000 SAR)
    // - مزاد: نعرض قيمة المزايدة بالعملة الأصلية إن كانت SAR/USD (محسوبة من YER)
    // - بدون أصل: نعرض YER
    let mainCur = 'YER';
    let mainVal = effectiveYER;

    if (hasOrig) {
      mainCur = rawCur;
      if (!hasBid) {
        mainVal = origNum;
      } else {
        if (rawCur === 'SAR') mainVal = sar;
        else if (rawCur === 'USD') mainVal = usd;
        else mainVal = effectiveYER;
      }
    }

    const main = { cur: mainCur, num: formatAmount(mainCur, mainVal), label: currencyLabel(mainCur) };

    const subs = [
      { cur: 'YER', num: formatAmount('YER', effectiveYER), label: currencyLabel('YER') },
      { cur: 'SAR', num: formatAmount('SAR', sar), label: currencyLabel('SAR') },
      { cur: 'USD', num: formatAmount('USD', usd), label: currencyLabel('USD') },
    ].filter((x) => x.cur !== mainCur);

    return { main, subs };
  }, [listing, priceYER, originalPrice, originalCurrency, rates]);

  const isHero = variant === 'hero';

  return (
    <div className={`priceBox ${isHero ? 'hero' : 'compact'}`}>
      <div className="priceMain">
        <span className="priceNum" dir="ltr">{view.main.num}</span>{' '}
        <span className="priceLbl">{view.main.label}</span>
      </div>

      {showConversions && view.subs?.length ? (
        <div className="priceSub">
          ≈ {view.subs.map((x) => `${x.num} ${x.label}`).join(' • ')}
        </div>
      ) : null}

      <style jsx>{`
        .priceBox{
          display: inline-flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
          direction: rtl;
          text-align: right;
        }
        .priceMain{
          font-weight: 900;
          line-height: 1.15;
          font-size: ${isHero ? '22px' : '14px'};
        }
        .priceNum{
          direction: ltr;
          unicode-bidi: isolate;
          font-variant-numeric: tabular-nums;
        }
        .priceLbl{
          font-weight: 500;
          font-size: ${isHero ? '16px' : '12px'};
        }
        .priceSub{
          font-size: ${isHero ? '13px' : '11px'};
          color: #64748b;
          line-height: 1.25;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}
