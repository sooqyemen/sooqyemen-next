// lib/taxonomy/electronics.js
// تقسيم الأقسام (Exports ثابتة ومتوافقة مع Turbopack)

import { detectKeyFromText, matchKeyFromValue } from './helpers';

export const ELECTRONICS_TYPES = [
  { key: 'accessories', label: 'اكسسوارات', aliases: ['accessory', 'accessories', 'اكسسوار', 'اكسسوارات', 'ملحقات'] },
  { key: 'computer', label: 'كمبيوتر', aliases: ['pc', 'computer', 'desktop', 'كمبيوتر', 'حاسوب', 'سطح مكتب'] },
  { key: 'laptop', label: 'لابتوب', aliases: ['laptop', 'notebook', 'لابتوب', 'لاب توب', 'كمبيوتر محمول'] },
  { key: 'tablet', label: 'تابلت', aliases: ['tablet', 'ipad', 'تابلت', 'ايباد'] },
  { key: 'tv', label: 'تلفزيون', aliases: ['tv', 'television', 'تلفزيون', 'شاشة', 'smart tv'] },
  { key: 'camera', label: 'كاميرا', aliases: ['camera', 'dslr', 'كاميرا', 'تصوير'] },
  { key: 'gaming', label: 'ألعاب', aliases: ['gaming', 'ps', 'playstation', 'xbox', 'games', 'العاب', 'ألعاب', 'بلايستيشن', 'اكس بوكس'] },
  { key: 'audio', label: 'صوتيات', aliases: ['audio', 'speaker', 'speakers', 'headphone', 'headphones', 'سماعة', 'سماعات', 'صوتيات'] },
  { key: 'printer', label: 'طابعات', aliases: ['printer', 'printers', 'طابعة', 'طابعات'] },
  { key: 'parts', label: 'قطع غيار', aliases: ['parts', 'spare', 'قطع', 'قطع غيار', 'spare parts'] },
  { key: 'other', label: 'أخرى', aliases: ['other', 'misc', 'متنوع', 'اخرى', 'غير ذلك', 'غيرها'] },
];

export function normalizeElectronicsType(v) {
  return matchKeyFromValue(v, ELECTRONICS_TYPES) || '';
}

export function detectElectronicsTypeFromText(text) {
  return detectKeyFromText(text, ELECTRONICS_TYPES) || '';
}

export function electronicsTypeLabel(key) {
  const k = String(key || '').trim();
  const it = (ELECTRONICS_TYPES || []).find((x) => x && x.key === k);
  return it ? it.label : '';
}
