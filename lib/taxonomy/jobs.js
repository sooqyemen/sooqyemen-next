// lib/taxonomy/jobs.js
// ✅ أنواع الوظائف + دوال التطبيع/الاكتشاف/التسمية.
// ✅ مفاتيح (key) هنا هي التي تُحفظ في Firestore وتُستخدم للفلترة.

import { matchKeyFromValue, detectKeyFromText } from './helpers';

// ============
// وظائف
// ============
export const JOB_TYPES = [
  { key: 'full_time', label: 'دوام كامل', aliases: ['full time', 'full_time', 'دوام كامل'] },
  { key: 'part_time', label: 'دوام جزئي', aliases: ['part time', 'part_time', 'جزئي'] },
  { key: 'remote', label: 'عن بُعد', aliases: ['remote', 'عن بعد', 'عن بُعد'] },
  { key: 'contract', label: 'عقد / مؤقت', aliases: ['contract', 'مؤقت', 'عقد'] },
  { key: 'other', label: 'أخرى', aliases: ['اخرى', 'أخرى', 'other'] },
];

export function normalizeJobType(v) {
  return matchKeyFromValue(v, JOB_TYPES);
}
export function detectJobTypeFromText(text) {
  return detectKeyFromText(text, JOB_TYPES);
}
export function jobTypeLabel(key) {
  const k = String(key || '').trim();
  const item = JOB_TYPES.find((x) => x.key === k);
  return item ? item.label : '';
}
