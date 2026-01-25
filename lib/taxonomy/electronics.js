// lib/taxonomy/electronics.js
// ✅ أنواع الإلكترونيات + دوال التطبيع/الاكتشاف/التسمية.
// ✅ مفاتيح (key) هنا هي التي تُحفظ في Firestore وتُستخدم للفلترة.

import { matchKeyFromValue, detectKeyFromText } from './helpers';

// ============
// إلكترونيات
// ============
export const ELECTRONICS_TYPES = [
  { key: 'laptop', label: 'لابتوب', aliases: ['laptop', 'لاب', 'كمبيوتر محمول'] },
  { key: 'desktop', label: 'كمبيوتر مكتبي', aliases: ['desktop', 'pc', 'مكتبي'] },
  { key: 'tablet', label: 'تابلت', aliases: ['tablet', 'تابلت'] },
  { key: 'tv', label: 'شاشات / تلفزيون', aliases: ['tv', 'تلفزيون', 'شاشة'] },
  { key: 'camera', label: 'كاميرات', aliases: ['camera', 'كاميرا', 'كاميرات'] },
  { key: 'console', label: 'ألعاب / بلايستيشن', aliases: ['ps', 'playstation', 'xbox', 'console', 'بلايستيشن'] },
  { key: 'printer', label: 'طابعات', aliases: ['printer', 'طابعة'] },
  { key: 'accessories', label: 'ملحقات', aliases: ['accessories', 'ملحقات', 'اكسسوارات'] },
  { key: 'other', label: 'أخرى', aliases: ['اخرى', 'أخرى', 'other'] },
];

export function normalizeElectronicsType(v) {
  return matchKeyFromValue(v, ELECTRONICS_TYPES);
}
export function detectElectronicsTypeFromText(text) {
  return detectKeyFromText(text, ELECTRONICS_TYPES);
}
export function electronicsTypeLabel(key) {
  const k = String(key || '').trim();
  const item = ELECTRONICS_TYPES.find((x) => x.key === k);
  return item ? item.label : '';
}
