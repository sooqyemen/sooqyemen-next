// lib/taxonomy/phones.js
import { matchKeyFromValue, detectKeyFromText } from './helpers';

// 📱 أشهر ماركات الجوالات في اليمن + أسماء متداولة
export const PHONE_BRANDS = [
  { key: 'apple', label: 'آيفون', aliases: ['apple', 'iphone', 'آيفون', 'ايفون', 'ابل', 'أبل'] },
  { key: 'samsung', label: 'سامسونج', aliases: ['samsung', 'سامسونج', 'سمسونج'] },

  // تجنبنا alias قصير مثل "mi" لأنه يسبب تطابقات خاطئة.
  { key: 'xiaomi', label: 'شاومي', aliases: ['xiaomi', 'شاومي', 'poco'] },
  { key: 'redmi', label: 'ريدمي', aliases: ['redmi', 'ريدمي', 'red mi'] },

  { key: 'huawei', label: 'هواوي', aliases: ['huawei', 'هواوي', 'واوي'] },
  { key: 'oppo', label: 'أوبو', aliases: ['oppo', 'أوبو', 'اوبو'] },
  { key: 'vivo', label: 'فيفو', aliases: ['vivo', 'فيفو'] },

  { key: 'tecno', label: 'تكنو', aliases: ['tecno', 'تكنو', 'تكنوو'] },
  { key: 'infinix', label: 'إنفينيكس', aliases: ['infinix', 'انفينيكس', 'إنفينيكس'] },
  { key: 'realme', label: 'ريلمي', aliases: ['realme', 'ريلمي'] },

  { key: 'nokia', label: 'نوكيا', aliases: ['nokia', 'نوكيا'] },
  { key: 'sony', label: 'سوني', aliases: ['sony', 'سوني'] },
  { key: 'lg', label: 'إل جي', aliases: ['lg', 'ال جي', 'إل جي'] },
  { key: 'motorola', label: 'موتورولا', aliases: ['motorola', 'موتورولا'] },

  { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] },
];

export function normalizePhoneBrand(v) {
  return matchKeyFromValue(v, PHONE_BRANDS) || '';
}

export function detectPhoneBrandFromText(text) {
  return detectKeyFromText(text, PHONE_BRANDS) || '';
}

export function phoneBrandLabel(key) {
  if (!key) return '';
  const it = PHONE_BRANDS.find((x) => x.key === key);
  return it?.label ?? key ?? '';
}
