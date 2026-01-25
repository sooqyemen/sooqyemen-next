// lib/taxonomy/animals.js
// ✅ أنواع الحيوانات + دوال التطبيع/الاكتشاف/التسمية.
// ✅ مفاتيح (key) هنا هي التي تُحفظ في Firestore وتُستخدم للفلترة.

import { matchKeyFromValue, detectKeyFromText } from './helpers';

// ============
// حيوانات
// ============
export const ANIMAL_TYPES = [
  { key: 'birds', label: 'طيور', aliases: ['birds', 'طيور'] },
  { key: 'sheep', label: 'غنم', aliases: ['sheep', 'غنم', 'ضأن'] },
  { key: 'goats', label: 'ماعز', aliases: ['goat', 'goats', 'ماعز'] },
  { key: 'cows', label: 'بقر', aliases: ['cow', 'cows', 'بقر'] },
  { key: 'camels', label: 'إبل', aliases: ['camel', 'camels', 'ابل', 'إبل'] },
  { key: 'pets', label: 'حيوانات أليفة', aliases: ['pets', 'قطط', 'كلاب'] },
  { key: 'other', label: 'أخرى', aliases: ['اخرى', 'أخرى', 'other'] },
];

export function normalizeAnimalType(v) {
  return matchKeyFromValue(v, ANIMAL_TYPES);
}
export function detectAnimalTypeFromText(text) {
  return detectKeyFromText(text, ANIMAL_TYPES);
}
export function animalTypeLabel(key) {
  const k = String(key || '').trim();
  const item = ANIMAL_TYPES.find((x) => x.key === k);
  return item ? item.label : '';
}
