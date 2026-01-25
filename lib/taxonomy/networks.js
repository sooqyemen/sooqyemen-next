// lib/taxonomy/networks.js
// ✅ أنواع النت والشبكات + دوال التطبيع/الاكتشاف/التسمية.
// ✅ مفاتيح (key) هنا هي التي تُحفظ في Firestore وتُستخدم للفلترة.

import { matchKeyFromValue, detectKeyFromText } from './helpers';

// ============
// نت وشبكات
// ============
export const NETWORK_TYPES = [
  { key: 'router', label: 'راوتر', aliases: ['router', 'راوتر'] },
  { key: 'switch', label: 'سويتش', aliases: ['switch', 'سويتش'] },
  { key: 'access_point', label: 'Access Point', aliases: ['ap', 'access point', 'نقطة وصول'] },
  { key: 'cable', label: 'كيابل / وصلات', aliases: ['cable', 'كيبل', 'كيابل'] },
  { key: 'internet_service', label: 'اشتراك / خدمة إنترنت', aliases: ['internet', 'نت', 'انترنت', 'اشتراك'] },
  { key: 'other', label: 'أخرى', aliases: ['اخرى', 'أخرى', 'other'] },
];

export function normalizeNetworkType(v) {
  return matchKeyFromValue(v, NETWORK_TYPES);
}
export function detectNetworkTypeFromText(text) {
  return detectKeyFromText(text, NETWORK_TYPES);
}
export function networkTypeLabel(key) {
  const k = String(key || '').trim();
  const item = NETWORK_TYPES.find((x) => x.key === k);
  return item ? item.label : '';
}
