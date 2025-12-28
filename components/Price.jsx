'use client';

function formatNumber(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString('ar-YE');
}

export default function Price({ amount = 0, currency = 'YER', rates }) {
  const a = Number(amount) || 0;

  // rates: { USD_YER, SAR_YER, USD_SAR }
  const USD_YER = rates?.USD_YER ?? 2500;
  const SAR_YER = rates?.SAR_YER ?? 650;

  let yer = 0;
  if (currency === 'YER') yer = a;
  else if (currency === 'USD') yer = a * USD_YER;
  else if (currency === 'SAR') yer = a * SAR_YER;

  const usd = yer / USD_YER;
  const sar = yer / SAR_YER;

  return (
    <div className="text-sm text-slate-600 dark:text-slate-300">
      <div className="text-lg font-extrabold text-slate-900 dark:text-white">
        {formatNumber(yer)} ريال يمني
      </div>
      <div className="text-xs mt-0.5 opacity-80">
        SAR · {formatNumber(sar.toFixed(2))} — USD · {formatNumber(usd.toFixed(2))}
      </div>
    </div>
  );
}
