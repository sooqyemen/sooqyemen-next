// lib/taxonomy/clothes.js
// ✅ أنواع الملابس + دوال التطبيع/الاكتشاف/التسمية.
// ✅ مفاتيح (key) هنا هي التي تُحفظ في Firestore وتُستخدم للفلترة.

import { matchKeyFromValue, detectKeyFromText } from './helpers';

// ============
// ملابس
// ============
export const CLOTHES_TYPES = [
  { key: 'men', label: 'رجالي', aliases: ['men', 'رجال', 'رجالي'] },
  { key: 'women', label: 'نسائي', aliases: ['women', 'نساء', 'نسائي'] },
  { key: 'kids', label: 'أطفال', aliases: ['kids', 'اطفال', 'أطفال'] },
  { key: 'shoes', label: 'أحذية', aliases: ['shoes', 'حذاء', 'أحذية'] },
  { key: 'other', label: 'أخرى', aliases: ['اخرى', 'أخرى', 'other'] },
];

export function normalizeClothesType(v) {
  return matchKeyFromValue(v, CLOTHES_TYPES);
}
export function detectClothesTypeFromText(text) {
  return detectKeyFromText(text, CLOTHES_TYPES);
}
export function clothesTypeLabel(key) {
  const k = String(key || '').trim();
  const item = CLOTHES_TYPES.find((x) => x.key === k);
  return item ? item.label : '';
}
