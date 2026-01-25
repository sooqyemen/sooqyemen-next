// lib/taxonomy/home_tools.js
// ✅ أنواع الأدوات المنزلية + دوال التطبيع/الاكتشاف/التسمية.
// ✅ مفاتيح (key) هنا هي التي تُحفظ في Firestore وتُستخدم للفلترة.

import { matchKeyFromValue, detectKeyFromText } from './helpers';

// ============
// أدوات منزلية
// ============
export const HOME_TOOLS_TYPES = [
  { key: 'kitchen_tools', label: 'أدوات مطبخ', aliases: ['kitchen', 'مطبخ'] },
  { key: 'cleaning', label: 'تنظيف', aliases: ['cleaning', 'تنظيف'] },
  { key: 'appliances', label: 'أجهزة منزلية', aliases: ['appliance', 'أجهزة', 'ثلاجة', 'غسالة'] },
  { key: 'other', label: 'أخرى', aliases: ['اخرى', 'أخرى', 'other'] },
];

export function normalizeHomeToolsType(v) {
  return matchKeyFromValue(v, HOME_TOOLS_TYPES);
}
export function detectHomeToolsTypeFromText(text) {
  return detectKeyFromText(text, HOME_TOOLS_TYPES);
}
export function homeToolsTypeLabel(key) {
  const k = String(key || '').trim();
  const item = HOME_TOOLS_TYPES.find((x) => x.key === k);
  return item ? item.label : '';
}
