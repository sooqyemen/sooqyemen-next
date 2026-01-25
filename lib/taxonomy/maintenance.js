// lib/taxonomy/maintenance.js
// ✅ أنواع الصيانة + دوال التطبيع/الاكتشاف/التسمية.
// ✅ مفاتيح (key) هنا هي التي تُحفظ في Firestore وتُستخدم للفلترة.

import { matchKeyFromValue, detectKeyFromText } from './helpers';

// ============
// صيانة
// ============
export const MAINTENANCE_TYPES = [
  { key: 'electronics', label: 'صيانة إلكترونيات', aliases: ['electronics', 'الكترونيات', 'إلكترونيات'] },
  { key: 'phones', label: 'صيانة جوالات', aliases: ['phones', 'جوالات', 'موبايلات'] },
  { key: 'cars', label: 'صيانة سيارات', aliases: ['cars', 'سيارات'] },
  { key: 'home', label: 'صيانة منزلية', aliases: ['home', 'منزل', 'منزلية'] },
  { key: 'other', label: 'أخرى', aliases: ['اخرى', 'أخرى', 'other'] },
];

export function normalizeMaintenanceType(v) {
  return matchKeyFromValue(v, MAINTENANCE_TYPES);
}
export function detectMaintenanceTypeFromText(text) {
  return detectKeyFromText(text, MAINTENANCE_TYPES);
}
export function maintenanceTypeLabel(key) {
  const k = String(key || '').trim();
  const item = MAINTENANCE_TYPES.find((x) => x.key === k);
  return item ? item.label : '';
}
