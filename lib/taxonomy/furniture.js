// lib/taxonomy/furniture.js
// ✅ أنواع الأثاث + دوال التطبيع/الاكتشاف/التسمية.
// ✅ مفاتيح (key) هنا هي التي تُحفظ في Firestore وتُستخدم للفلترة.

import { matchKeyFromValue, detectKeyFromText } from './helpers';

// ============
// أثاث
// ============
export const FURNITURE_TYPES = [
  { key: 'bedroom', label: 'غرف نوم', aliases: ['bedroom', 'نوم'] },
  { key: 'living', label: 'مجالس / صالات', aliases: ['living', 'مجلس', 'مجالس', 'صالون', 'صالات'] },
  { key: 'kitchen', label: 'مطابخ', aliases: ['kitchen', 'مطبخ', 'مطابخ'] },
  { key: 'office', label: 'أثاث مكتبي', aliases: ['office', 'مكتبي'] },
  { key: 'decor', label: 'ديكور', aliases: ['decor', 'ديكور'] },
  { key: 'other', label: 'أخرى', aliases: ['اخرى', 'أخرى', 'other'] },
];

export function normalizeFurnitureType(v) {
  return matchKeyFromValue(v, FURNITURE_TYPES);
}
export function detectFurnitureTypeFromText(text) {
  return detectKeyFromText(text, FURNITURE_TYPES);
}
export function furnitureTypeLabel(key) {
  const k = String(key || '').trim();
  const item = FURNITURE_TYPES.find((x) => x.key === k);
  return item ? item.label : '';
}
