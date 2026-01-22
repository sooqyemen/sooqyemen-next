// lib/taxonomy/realestate.js
import { matchKeyFromValue, detectKeyFromText } from './helpers';

export const DEAL_TYPES = [
  { key: 'sale', label: 'بيع', aliases: ['sale', 'sell', 'بيع', 'للبيع', 'تمليك'] },
  { key: 'rent', label: 'إيجار', aliases: ['rent', 'rental', 'ايجار', 'إيجار', 'للإيجار', 'للايجار', 'تأجير'] },
];

export const PROPERTY_TYPES = [
  { key: 'land', label: 'أرض', aliases: ['land', 'أرض', 'ارض', 'قطعة', 'مخطط'] },
  { key: 'house', label: 'بيت', aliases: ['house', 'بيت', 'منزل', 'دور'] },
  { key: 'villa', label: 'فيلا', aliases: ['villa', 'فيلا', 'فلة'] },
  { key: 'apartment', label: 'شقة', aliases: ['apartment', 'شقة', 'شقق', 'شقه'] },
  { key: 'building', label: 'عمارة', aliases: ['building', 'عمارة', 'عمائر', 'عماره'] },
  { key: 'farm', label: 'مزرعة', aliases: ['farm', 'مزرعة', 'مزرعه', 'بستان'] },
  { key: 'shop', label: 'محل', aliases: ['shop', 'محل', 'متجر', 'دكان'] },
  { key: 'office', label: 'مكتب', aliases: ['office', 'مكتب'] },
  { key: 'warehouse', label: 'مستودع', aliases: ['warehouse', 'مستودع', 'مخزن', 'هنجر'] },
  { key: 'chalet', label: 'استراحة', aliases: ['chalet', 'استراحة', 'شاليه'] },
  { key: 'room', label: 'غرفة', aliases: ['room', 'غرفة', 'غرف'] },
  { key: 'workshop', label: 'ورشة', aliases: ['workshop', 'ورشة', 'كراج'] },
  { key: 'other', label: 'أخرى', aliases: ['other', 'اخرى', 'أخرى'] },
];

export function normalizeDealType(v) {
  return matchKeyFromValue(v, DEAL_TYPES) || '';
}
export function detectDealTypeFromText(text) {
  return detectKeyFromText(text, DEAL_TYPES) || '';
}
export function dealTypeLabel(key) {
  if (!key) return '';
  const it = DEAL_TYPES.find((x) => x.key === key);
  return it?.label ?? '';
}

export function normalizePropertyType(v) {
  return matchKeyFromValue(v, PROPERTY_TYPES) || '';
}
export function detectPropertyTypeFromText(text) {
  return detectKeyFromText(text, PROPERTY_TYPES) || '';
}
export function propertyTypeLabel(key) {
  if (!key) return '';
  const it = PROPERTY_TYPES.find((x) => x.key === key);
  return it?.label ?? '';
}
