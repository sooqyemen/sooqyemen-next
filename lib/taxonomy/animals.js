// lib/taxonomy/animals.js
// تقسيم الأقسام (Exports ثابتة ومتوافقة مع Turbopack)

import { detectKeyFromText, matchKeyFromValue } from './helpers';

export const ANIMAL_TYPES = [
  { key: 'sheep', label: 'غنم', aliases: ['sheep', 'غنم', 'غنيم'] },
  { key: 'goats', label: 'ماعز', aliases: ['goat', 'goats', 'ماعز'] },
  { key: 'cows', label: 'أبقار', aliases: ['cow', 'cows', 'بقر', 'أبقار'] },
  { key: 'camels', label: 'إبل', aliases: ['camel', 'camels', 'ابل', 'إبل', 'جمال'] },
  { key: 'horses', label: 'خيول', aliases: ['horse', 'horses', 'خيل', 'خيول'] },
  { key: 'birds', label: 'طيور', aliases: ['bird', 'birds', 'طيور', 'عصافير'] },
  { key: 'cats', label: 'قطط', aliases: ['cat', 'cats', 'قط', 'قطط'] },
  { key: 'dogs', label: 'كلاب', aliases: ['dog', 'dogs', 'كلب', 'كلاب'] },
  { key: 'other', label: 'أخرى', aliases: ['other', 'misc', 'متنوع', 'اخرى', 'غير ذلك', 'غيرها'] },
];

export function normalizeAnimalType(v) {
  return matchKeyFromValue(v, ANIMAL_TYPES) || '';
}

export function detectAnimalTypeFromText(text) {
  return detectKeyFromText(text, ANIMAL_TYPES) || '';
}

export function animalTypeLabel(key) {
  const k = String(key || '').trim();
  const it = (ANIMAL_TYPES || []).find((x) => x && x.key === k);
  return it ? it.label : '';
}
