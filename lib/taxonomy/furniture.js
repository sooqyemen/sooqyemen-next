// lib/taxonomy/furniture.js
// تقسيم الأقسام (Exports ثابتة ومتوافقة مع Turbopack)

import { detectKeyFromText, matchKeyFromValue } from './helpers';

export const FURNITURE_TYPES = [
  { key: 'bedroom', label: 'غرف نوم', aliases: ['bedroom', 'غرفة نوم', 'غرف نوم'] },
  { key: 'living', label: 'مجالس/صالة', aliases: ['living', 'sofa', 'majlis', 'مجلس', 'مجالس', 'صالة', 'كنب'] },
  { key: 'office', label: 'أثاث مكتبي', aliases: ['office', 'desk', 'chair', 'مكتب', 'مكتبي', 'كرسي'] },
  { key: 'kitchen', label: 'مطابخ', aliases: ['kitchen', 'مطابخ', 'مطبخ'] },
  { key: 'other', label: 'أخرى', aliases: ['other', 'misc', 'متنوع', 'اخرى', 'غير ذلك', 'غيرها'] },
];

export function normalizeFurnitureType(v) {
  return matchKeyFromValue(v, FURNITURE_TYPES) || '';
}

export function detectFurnitureTypeFromText(text) {
  return detectKeyFromText(text, FURNITURE_TYPES) || '';
}

export function furnitureTypeLabel(key) {
  const k = String(key || '').trim();
  const it = (FURNITURE_TYPES || []).find((x) => x && x.key === k);
  return it ? it.label : '';
}
