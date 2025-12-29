// lib/rates.js

// العملة الأساسية هي الريال اليمني
export const BASE_CURRENCY = 'YER';

// أسعار الصرف الصحيحة حسب كلامك
// 1 SAR = 425 YER
// 1 USD = 1632 YER
export const RATES = {
  YER: 1,
  SAR: 425,
  USD: 1632,
};

// تحويل أي عملة إلى ريال يمني
export function toYER(amount, currency = 'YER') {
  const n = Number(amount) || 0;
  const cur = (currency || 'YER').toUpperCase();
  const rate = RATES[cur] ?? 1;
  return n * rate;
}

// تحويل من ريال يمني إلى عملة أخرى
export function fromYER(amountYER, currency = 'YER') {
  const n = Number(amountYER) || 0;
  const cur = (currency || 'YER').toUpperCase();
  const rate = RATES[cur] ?? 1;
  return n / rate;
}
