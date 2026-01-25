// lib/taxonomy/heavy_equipment.js
// ✅ أنواع المعدات الثقيلة + دوال التطبيع/الاكتشاف/التسمية.
// ✅ مفاتيح (key) هنا هي التي تُحفظ في Firestore وتُستخدم للفلترة.

import { matchKeyFromValue, detectKeyFromText } from './helpers';

// ============
// معدات ثقيلة
// ============
export const HEAVY_EQUIPMENT_TYPES = [
  { key: 'excavator', label: 'حفّار', aliases: ['excavator', 'حفار'] },
  { key: 'loader', label: 'شيول / لودر', aliases: ['loader', 'لودر', 'شيول'] },
  { key: 'bulldozer', label: 'بلدوزر', aliases: ['bulldozer', 'بلدوزر'] },
  { key: 'crane', label: 'رافعة', aliases: ['crane', 'رافعة'] },
  { key: 'generator', label: 'مولد كهرباء', aliases: ['generator', 'مولد'] },
  { key: 'forklift', label: 'رافعة شوكية', aliases: ['forklift', 'فوركلفت', 'رافعة شوكية'] },
  { key: 'spare_parts', label: 'قطع غيار', aliases: ['قطع', 'spare', 'spare parts', 'قطع غيار'] },
  { key: 'other', label: 'أخرى', aliases: ['اخرى', 'أخرى', 'other'] },
];

export function normalizeHeavyEquipmentType(v) {
  return matchKeyFromValue(v, HEAVY_EQUIPMENT_TYPES);
}
export function detectHeavyEquipmentTypeFromText(text) {
  return detectKeyFromText(text, HEAVY_EQUIPMENT_TYPES);
}
export function heavyEquipmentTypeLabel(key) {
  const k = String(key || '').trim();
  const item = HEAVY_EQUIPMENT_TYPES.find((x) => x.key === k);
  return item ? item.label : '';
}
