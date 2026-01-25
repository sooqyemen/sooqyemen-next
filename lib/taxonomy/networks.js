// lib/taxonomy/networks.js
// تقسيم الأقسام (Exports ثابتة ومتوافقة مع Turbopack)

import { detectKeyFromText, matchKeyFromValue } from './helpers';

export const NETWORK_TYPES = [
  { key: 'router', label: 'راوتر', aliases: ['router', 'wifi router', 'راوتر', 'واي فاي'] },
  { key: 'modem', label: 'مودم', aliases: ['modem', 'مودم'] },
  { key: 'switch', label: 'سويتش', aliases: ['switch', 'سويتش', 'سويتشات'] },
  { key: 'cable', label: 'كيابل', aliases: ['cable', 'cables', 'ethernet', 'lan', 'كيبل', 'كيابل', 'سلك'] },
  { key: 'antenna', label: 'أنتينا', aliases: ['antenna', 'antena', 'أنتينا', 'انتينا', 'هوائي'] },
  { key: 'other', label: 'أخرى', aliases: ['other', 'misc', 'متنوع', 'اخرى', 'غير ذلك', 'غيرها'] },
];

export function normalizeNetworkType(v) {
  return matchKeyFromValue(v, NETWORK_TYPES) || '';
}

export function detectNetworkTypeFromText(text) {
  return detectKeyFromText(text, NETWORK_TYPES) || '';
}

export function networkTypeLabel(key) {
  const k = String(key || '').trim();
  const it = (NETWORK_TYPES || []).find((x) => x && x.key === k);
  return it ? it.label : '';
}
