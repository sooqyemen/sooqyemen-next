// lib/taxonomy/home_tools.js
// تقسيم الأقسام (Exports ثابتة ومتوافقة مع Turbopack)

import { detectKeyFromText, matchKeyFromValue } from './helpers';

export const HOME_TOOLS_TYPES = [
  { key: 'kitchen_tools', label: 'أدوات مطبخ', aliases: ['kitchen tools', 'kitchen', 'أدوات مطبخ', 'مطبخ'] },
  { key: 'cleaning', label: 'منظفات', aliases: ['cleaning', 'clean', 'منظفات', 'تنظيف'] },
  { key: 'electrical', label: 'أدوات كهربائية', aliases: ['electrical tools', 'drill', 'أدوات كهربائية', 'دريل', 'مثقاب'] },
  { key: 'gardening', label: 'حدائق', aliases: ['gardening', 'garden', 'حديقة', 'حدائق', 'زراعة'] },
  { key: 'other', label: 'أخرى', aliases: ['other', 'misc', 'متنوع', 'اخرى', 'غير ذلك', 'غيرها'] },
];

export function normalizeHomeToolsType(v) {
  return matchKeyFromValue(v, HOME_TOOLS_TYPES) || '';
}

export function detectHomeToolsTypeFromText(text) {
  return detectKeyFromText(text, HOME_TOOLS_TYPES) || '';
}

export function homeToolsTypeLabel(key) {
  const k = String(key || '').trim();
  const it = (HOME_TOOLS_TYPES || []).find((x) => x && x.key === k);
  return it ? it.label : '';
}
