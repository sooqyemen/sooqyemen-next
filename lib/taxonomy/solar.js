// lib/taxonomy/solar.js
// تقسيم الأقسام (Exports ثابتة ومتوافقة مع Turbopack)

import { detectKeyFromText, matchKeyFromValue } from './helpers';

export const SOLAR_TYPES = [
  { key: 'panel', label: 'ألواح', aliases: ['panel', 'panels', 'solar panel', 'لوح', 'الواح', 'ألواح'] },
  { key: 'inverter', label: 'انفرتر', aliases: ['inverter', 'محول', 'انفرتر', 'انفرترات'] },
  { key: 'battery', label: 'بطاريات', aliases: ['battery', 'batteries', 'بطارية', 'بطاريات'] },
  { key: 'controller', label: 'منظم شحن', aliases: ['controller', 'charge controller', 'منظم', 'منظم شحن'] },
  { key: 'cable', label: 'كيابل', aliases: ['cable', 'cables', 'wire', 'كيبل', 'كيابل', 'سلك'] },
  { key: 'pump', label: 'مضخات', aliases: ['pump', 'pumps', 'مضخة', 'مضخات'] },
  { key: 'light', label: 'إنارة', aliases: ['light', 'lights', 'lamp', 'إنارة', 'اضاءة', 'لمبة'] },
  { key: 'heater', label: 'سخانات', aliases: ['heater', 'water heater', 'سخان', 'سخانات'] },
  { key: 'other', label: 'أخرى', aliases: ['other', 'misc', 'متنوع', 'اخرى', 'غير ذلك', 'غيرها'] },
];

export function normalizeSolarType(v) {
  return matchKeyFromValue(v, SOLAR_TYPES) || '';
}

export function detectSolarTypeFromText(text) {
  return detectKeyFromText(text, SOLAR_TYPES) || '';
}

export function solarTypeLabel(key) {
  const k = String(key || '').trim();
  const it = (SOLAR_TYPES || []).find((x) => x && x.key === k);
  return it ? it.label : '';
}
