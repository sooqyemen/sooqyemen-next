// lib/taxonomy/clothes.js
// تقسيم الأقسام (Exports ثابتة ومتوافقة مع Turbopack)

import { detectKeyFromText, matchKeyFromValue } from './helpers';

export const CLOTHES_TYPES = [
  { key: 'men', label: 'رجالي', aliases: ['men', 'mens', 'رجالي', 'رجال'] },
  { key: 'women', label: 'نسائي', aliases: ['women', 'womens', 'نسائي', 'نساء'] },
  { key: 'kids', label: 'أطفال', aliases: ['kids', 'children', 'اطفال', 'أطفال'] },
  { key: 'shoes', label: 'أحذية', aliases: ['shoes', 'shoe', 'حذاء', 'أحذية'] },
  { key: 'accessories', label: 'اكسسوارات', aliases: ['accessories', 'accessory', 'اكسسوارات', 'اكسسوار'] },
  { key: 'other', label: 'أخرى', aliases: ['other', 'misc', 'متنوع', 'اخرى', 'غير ذلك', 'غيرها'] },
];

export function normalizeClothesType(v) {
  return matchKeyFromValue(v, CLOTHES_TYPES) || '';
}

export function detectClothesTypeFromText(text) {
  return detectKeyFromText(text, CLOTHES_TYPES) || '';
}

export function clothesTypeLabel(key) {
  const k = String(key || '').trim();
  const it = (CLOTHES_TYPES || []).find((x) => x && x.key === k);
  return it ? it.label : '';
}
