// components/Price.jsx
'use client';

import { useMemo } from 'react';
import { useRates, toYER } from '@/lib/rates';

/**
 * ✅ Price (مكوّن موحّد لعرض الأسعار في كل الصفحات)
 *
 * التحسينات الجديدة:
 * - إضافة maxConversions للتحكم بعدد التحويلات المعروضة
 * - تحسين عرض التحويلات في وضع compact للبطاقات
 * - عرض أنظف للأسعار بتنسيق مصغر
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

function currencyLabel(cur, short = false) {
  const c = String(cur || 'YER').toUpperCase();
  if (c === 'SAR') return short ? 'ر.س' : 'ريال سعودي';
  if (c === 'USD') return short ? '$' : 'دولار';
  return short ? 'ر.ي' : 'ريال يمني';
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

function formatAmount(cur, value, short = false) {
  const c = String(cur || 'YER').toUpperCase();
  const n = Number(value);
  if (!isFinite(n) || n <= 0) return '—';

  if (c === 'YER') {
    const rounded = Math.round(n);
    if (short && rounded >= 1000000) {
      return `${(rounded / 1000000).toFixed(1)}M`;
    }
    if (short && rounded >= 1000) {
      return `${(rounded / 1000).toFixed(0)}K`;
    }
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(rounded);
  }
  
  if (c === 'USD') {
    const formatted = new Intl.NumberFormat('en-US', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(n);
    return short ? formatted : formatted;
  }
  
  // SAR وغيره
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
}

/**
 * @param {object} props.listing (اختياري) — مرّر الإعلان كاملًا لتفادي تكرار تمرير الحقول
 * @param {number} props.priceYER — fallback إذا ما مرّرت listing
 * @param {any} props.originalPrice — fallback إذا ما مرّرت listing
 * @param {string} props.originalCurrency — fallback إذا ما مرّرت listing
 * @param {boolean} props.showConversions — إظهار التحويلات تحت السعر الأساسي
 * @param {number} props.maxConversions — عدد التحويلات المعروضة (افتراضي 2 للبطاقات)
 * @param {'compact'|'grid'|'hero'} props.variant — للتحكم في حجم العرض
 */
export default function Price({
  listing,
  priceYER = 0,
  originalPrice,
  originalCurrency = 'YER',
  showConversions = true,
  maxConversions = 2, // ⭐ جديد: تحديد عدد التحويلات (2 للبطاقات)
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

    const main = { 
      cur: mainCur, 
      num: formatAmount(mainCur, mainVal), 
      shortNum: formatAmount(mainCur, mainVal, true),
      label: currencyLabel(mainCur),
      shortLabel: currencyLabel(mainCur, true)
    };

    const subs = [
      { 
        cur: 'YER', 
        num: formatAmount('YER', effectiveYER), 
        shortNum: formatAmount('YER', effectiveYER, true),
        label: currencyLabel('YER'),
        shortLabel: currencyLabel('YER', true)
      },
      { 
        cur: 'SAR', 
        num: formatAmount('SAR', sar), 
        shortNum: formatAmount('SAR', sar, true),
        label: currencyLabel('SAR'),
        shortLabel: currencyLabel('SAR', true)
      },
      { 
        cur: 'USD', 
        num: formatAmount('USD', usd), 
        shortNum: formatAmount('USD', usd, true),
        label: currencyLabel('USD'),
        shortLabel: currencyLabel('USD', true)
      },
    ].filter((x) => x.cur !== mainCur);

    return { main, subs };
  }, [listing, priceYER, originalPrice, originalCurrency, rates]);

  const isHero = variant === 'hero';
  const isGrid = variant === 'grid';

  // عدد التحويلات المعروضة
  const displayedSubs = showConversions ? view.subs.slice(0, maxConversions) : [];

  return (
    <div className={`priceBox ${variant}`}>
      {/* السعر الأساسي */}
      <div className="priceMain">
        <span className="priceNum" dir="ltr">
          {isGrid ? view.main.shortNum : view.main.num}
        </span>{' '}
        <span className="priceLbl">
          {isGrid ? view.main.shortLabel : view.main.label}
        </span>
      </div>

      {/* التحويلات */}
      {displayedSubs.length > 0 ? (
        <div className="priceSub">
          {variant === 'hero' ? (
            // عرض تفصيلي لصفحة التفاصيل
            <div className="conversionsDetail">
              {displayedSubs.map((x) => (
                <div key={x.cur} className="conversionItem">
                  <span className="approx">≈</span>
                  <span className="conversionNum" dir="ltr">{x.num}</span>
                  <span className="conversionLabel">{x.label}</span>
                </div>
              ))}
            </div>
          ) : (
            // عرض مضغوط للبطاقات
            <div className="conversionsCompact">
              <span className="approx">≈</span>
              {displayedSubs.map((x, index) => (
                <span key={x.cur}>
                  <span className="conversionNum" dir="ltr">{x.shortNum}</span>
                  <span className="conversionLabel">{x.shortLabel}</span>
                  {index < displayedSubs.length - 1 && ' • '}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <style jsx>{`
        .priceBox {
          display: inline-flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
          direction: rtl;
          text-align: right;
        }
        
        .priceBox.compact {
          gap: 1px;
        }
        
        .priceBox.grid {
          gap: 1px;
        }
        
        .priceBox.hero {
          gap: 4px;
        }
        
        .priceMain {
          font-weight: 900;
          line-height: 1.15;
          display: flex;
          align-items: baseline;
          gap: 2px;
        }
        
        .priceBox.compact .priceMain {
          font-size: 13px;
        }
        
        .priceBox.grid .priceMain {
          font-size: 14px;
          color: var(--price-green, #059669);
        }
        
        .priceBox.hero .priceMain {
          font-size: 22px;
        }
        
        .priceNum {
          direction: ltr;
          unicode-bidi: isolate;
          font-variant-numeric: tabular-nums;
        }
        
        .priceLbl {
          font-weight: 600;
        }
        
        .priceBox.compact .priceLbl {
          font-size: 11px;
        }
        
        .priceBox.grid .priceLbl {
          font-size: 12px;
        }
        
        .priceBox.hero .priceLbl {
          font-size: 16px;
        }
        
        .priceSub {
          font-size: 11px;
          color: var(--muted, #64748b);
          line-height: 1.2;
        }
        
        .priceBox.compact .priceSub {
          font-size: 10px;
        }
        
        .priceBox.hero .priceSub {
          font-size: 13px;
        }
        
        .conversionsDetail {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        
        .conversionsCompact {
          white-space: nowrap;
        }
        
        .conversionItem {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .conversionNum {
          direction: ltr;
          unicode-bidi: isolate;
          font-variant-numeric: tabular-nums;
          font-weight: 600;
        }
        
        .conversionLabel {
          font-weight: 500;
        }
        
        .priceBox.compact .conversionLabel,
        .priceBox.grid .conversionLabel {
          font-size: 9px;
        }
        
        .approx {
          margin-left: 2px;
          margin-right: 3px;
        }
        
        .priceBox.compact .approx,
        .priceBox.grid .approx {
          font-size: 9px;
        }
      `}</style>
    </div>
  );
}
