// lib/taxonomy/services.js
// ✅ أنواع الخدمات + دوال التطبيع/الاكتشاف/التسمية.
// ✅ مفاتيح (key) هنا هي التي تُحفظ في Firestore وتُستخدم للفلترة.

import { matchKeyFromValue, detectKeyFromText } from './helpers';

// ============
// خدمات
// ============
export const SERVICE_TYPES = [
  { key: 'transport', label: 'نقل', aliases: ['transport', 'نقل'] },
  { key: 'construction', label: 'بناء ومقاولات', aliases: ['construction', 'مقاولات', 'بناء'] },
  { key: 'education', label: 'تعليم ودورات', aliases: ['education', 'تعليم', 'دورات'] },
  { key: 'design', label: 'تصميم', aliases: ['design', 'تصميم'] },
  { key: 'marketing', label: 'تسويق', aliases: ['marketing', 'تسويق'] },
  { key: 'repair', label: 'صيانة/تصليح', aliases: ['repair', 'صيانة', 'تصليح'] },
  { key: 'other', label: 'أخرى', aliases: ['اخرى', 'أخرى', 'other'] },
];

export function normalizeServiceType(v) {
  return matchKeyFromValue(v, SERVICE_TYPES);
}
export function detectServiceTypeFromText(text) {
  return detectKeyFromText(text, SERVICE_TYPES);
}
export function serviceTypeLabel(key) {
  const k = String(key || '').trim();
  const item = SERVICE_TYPES.find((x) => x.key === k);
  return item ? item.label : '';
}
