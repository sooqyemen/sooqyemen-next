// lib/rates.js
export const RATES = {
  USD_TO_YER: Number(process.env.NEXT_PUBLIC_USD_TO_YER || 1632),
  SAR_TO_YER: Number(process.env.NEXT_PUBLIC_SAR_TO_YER || 425),
};

export function toYER(amount, currency) {
  const n = Number(amount || 0);
  if (currency === 'YER') return n;
  if (currency === 'USD') return n * RATES.USD_TO_YER;
  if (currency === 'SAR') return n * RATES.SAR_TO_YER;
  return n;
}

export function fromYER(y, currency) {
  const n = Number(y || 0);
  if (currency === 'YER') return n;
  if (currency === 'USD') return n / RATES.USD_TO_YER;
  if (currency === 'SAR') return n / RATES.SAR_TO_YER;
  return n;
}

export function formatNumber(num) {
  return Math.round(Number(num || 0)).toLocaleString('en-US');
}
