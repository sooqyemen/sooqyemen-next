// lib/taxonomy/solar.js
// ✅ أنواع الطاقة الشمسية + دوال التطبيع/الاكتشاف/التسمية.
// ✅ مفاتيح (key) هنا هي التي تُحفظ في Firestore وتُستخدم للفلترة.

import { matchKeyFromValue, detectKeyFromText } from './helpers';

// ============
// طاقة شمسية
// ============
export const SOLAR_TYPES = [
  { key: 'panels', label: 'ألواح شمسية', aliases: ['panel', 'panels', 'الواح', 'ألواح'] },
  { key: 'inverter', label: 'انفرتر', aliases: ['inverter', 'انفرتر'] },
  { key: 'batteries', label: 'بطاريات', aliases: ['battery', 'batteries', 'بطارية', 'بطاريات'] },
  { key: 'controller', label: 'منظم شحن', aliases: ['controller', 'منظم', 'منظم شحن'] },
  { key: 'pumps', label: 'مضخات / غطاسات', aliases: ['pump', 'pumps', 'مضخة', 'غطاس', 'غطاسات'] },
  { key: 'wiring', label: 'أسلاك وملحقات', aliases: ['wire', 'wiring', 'اسلاك', 'أسلاك'] },
  { key: 'other', label: 'أخرى', aliases: ['اخرى', 'أخرى', 'other'] },
];

export function normalizeSolarType(v) {
  return matchKeyFromValue(v, SOLAR_TYPES);
}
export function detectSolarTypeFromText(text) {
  return detectKeyFromText(text, SOLAR_TYPES);
}
export function solarTypeLabel(key) {
  const k = String(key || '').trim();
  const item = SOLAR_TYPES.find((x) => x.key === k);
  return item ? item.label : '';
}
