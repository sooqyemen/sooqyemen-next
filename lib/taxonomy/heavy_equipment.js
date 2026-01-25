// lib/taxonomy/heavy_equipment.js
// تقسيم الأقسام (Exports ثابتة ومتوافقة مع Turbopack)

import { detectKeyFromText, matchKeyFromValue } from './helpers';

export const HEAVY_EQUIPMENT_TYPES = [
  { key: 'excavator', label: 'حفّارات', aliases: ['excavator', 'حفار', 'حفّار', 'حفارات'] },
  { key: 'loader', label: 'لودر', aliases: ['loader', 'لودر', 'شيول', 'شيولات'] },
  { key: 'bulldozer', label: 'بلدوزر', aliases: ['bulldozer', 'بلدوزر', 'بلدوزرات'] },
  { key: 'forklift', label: 'رافعة شوكية', aliases: ['forklift', 'رافعة شوكية', 'فوركلفت'] },
  { key: 'crane', label: 'رافعات', aliases: ['crane', 'رافعة', 'رافعات', 'كرين'] },
  { key: 'generator', label: 'مولدات', aliases: ['generator', 'مولد', 'مولدات'] },
  { key: 'compressor', label: 'كمبروسر', aliases: ['compressor', 'كمبروسر', 'ضاغط'] },
  { key: 'other', label: 'أخرى', aliases: ['other', 'misc', 'متنوع', 'اخرى', 'غير ذلك', 'غيرها'] },
];

export function normalizeHeavyEquipmentType(v) {
  return matchKeyFromValue(v, HEAVY_EQUIPMENT_TYPES) || '';
}

export function detectHeavyEquipmentTypeFromText(text) {
  return detectKeyFromText(text, HEAVY_EQUIPMENT_TYPES) || '';
}

export function heavyEquipmentTypeLabel(key) {
  const k = String(key || '').trim();
  const it = (HEAVY_EQUIPMENT_TYPES || []).find((x) => x && x.key === k);
  return it ? it.label : '';
}
