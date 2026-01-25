// lib/taxonomy/maintenance.js
// تقسيم الأقسام (Exports ثابتة ومتوافقة مع Turbopack)

import { detectKeyFromText, matchKeyFromValue } from './helpers';

export const MAINTENANCE_TYPES = [
  { key: 'plumbing', label: 'سباكة', aliases: ['plumbing', 'سباكة', 'سباك'] },
  { key: 'electrical', label: 'كهرباء', aliases: ['electrical', 'electric', 'كهرباء', 'كهربائي'] },
  { key: 'painting', label: 'دهانات', aliases: ['painting', 'paint', 'دهان', 'دهانات'] },
  { key: 'carpentry', label: 'نجارة', aliases: ['carpentry', 'woodwork', 'نجارة', 'نجار'] },
  { key: 'ac', label: 'تكييف', aliases: ['ac', 'air condition', 'تكييف', 'مكيف'] },
  { key: 'other', label: 'أخرى', aliases: ['other', 'misc', 'متنوع', 'اخرى', 'غير ذلك', 'غيرها'] },
];

export function normalizeMaintenanceType(v) {
  return matchKeyFromValue(v, MAINTENANCE_TYPES) || '';
}

export function detectMaintenanceTypeFromText(text) {
  return detectKeyFromText(text, MAINTENANCE_TYPES) || '';
}

export function maintenanceTypeLabel(key) {
  const k = String(key || '').trim();
  const it = (MAINTENANCE_TYPES || []).find((x) => x && x.key === k);
  return it ? it.label : '';
}
