// lib/taxonomy/services.js
// تقسيم الأقسام (Exports ثابتة ومتوافقة مع Turbopack)

import { detectKeyFromText, matchKeyFromValue } from './helpers';

export const SERVICE_TYPES = [
  { key: 'transport', label: 'نقل', aliases: ['transport', 'shipping', 'نقل', 'توصيل'] },
  { key: 'construction', label: 'مقاولات', aliases: ['construction', 'contracting', 'مقاولات', 'بناء', 'تشطيب'] },
  { key: 'cleaning', label: 'تنظيف', aliases: ['cleaning', 'تنظيف'] },
  { key: 'marketing', label: 'تسويق', aliases: ['marketing', 'ads', 'تسويق', 'اعلان', 'إعلان'] },
  { key: 'design', label: 'تصميم', aliases: ['design', 'designer', 'تصميم', 'مصمم'] },
  { key: 'programming', label: 'برمجة', aliases: ['programming', 'code', 'dev', 'برمجة', 'تطوير'] },
  { key: 'other', label: 'أخرى', aliases: ['other', 'misc', 'متنوع', 'اخرى', 'غير ذلك', 'غيرها'] },
];

export function normalizeServiceType(v) {
  return matchKeyFromValue(v, SERVICE_TYPES) || '';
}

export function detectServiceTypeFromText(text) {
  return detectKeyFromText(text, SERVICE_TYPES) || '';
}

export function serviceTypeLabel(key) {
  const k = String(key || '').trim();
  const it = (SERVICE_TYPES || []).find((x) => x && x.key === k);
  return it ? it.label : '';
}
