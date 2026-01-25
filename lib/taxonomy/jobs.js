// lib/taxonomy/jobs.js
// تقسيم الأقسام (Exports ثابتة ومتوافقة مع Turbopack)

import { detectKeyFromText, matchKeyFromValue } from './helpers';

export const JOB_TYPES = [
  { key: 'it', label: 'تقنية', aliases: ['it', 'tech', 'developer', 'تقنية', 'برمجة', 'مطور'] },
  { key: 'sales', label: 'مبيعات', aliases: ['sales', 'selling', 'مبيعات', 'تسويق'] },
  { key: 'driver', label: 'سائق', aliases: ['driver', 'سائق', 'سواق'] },
  { key: 'construction', label: 'بناء', aliases: ['construction', 'builder', 'بناء', 'مقاولات', 'عمال'] },
  { key: 'teaching', label: 'تعليم', aliases: ['teaching', 'teacher', 'تعليم', 'مدرس'] },
  { key: 'medical', label: 'طبي', aliases: ['medical', 'nurse', 'doctor', 'طبي', 'ممرض', 'طبيب'] },
  { key: 'other', label: 'أخرى', aliases: ['other', 'misc', 'متنوع', 'اخرى', 'غير ذلك', 'غيرها'] },
];

export function normalizeJobType(v) {
  return matchKeyFromValue(v, JOB_TYPES) || '';
}

export function detectJobTypeFromText(text) {
  return detectKeyFromText(text, JOB_TYPES) || '';
}

export function jobTypeLabel(key) {
  const k = String(key || '').trim();
  const it = (JOB_TYPES || []).find((x) => x && x.key === k);
  return it ? it.label : '';
}
