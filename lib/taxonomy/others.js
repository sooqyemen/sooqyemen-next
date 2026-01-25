// lib/taxonomy/others.js
// ✅ هذا الملف صار خفيف: أشياء عامة (مثل وقود/قير) + إعادة تصدير (Backward-compat).
// ✅ المطلوب: كل قسم بملفه الخاص داخل lib/taxonomy/ … وهذا الملف فقط يجمع للتوافق.

import { matchKeyFromValue, detectKeyFromText } from './helpers';

// ============
// عام (مشتركات بين أكثر من قسم)
// ============

export const FUEL_TYPES = [
  { key: 'petrol', label: 'بنزين', aliases: ['petrol', 'gas', 'بنزين'] },
  { key: 'diesel', label: 'ديزل', aliases: ['diesel', 'ديزل'] },
  { key: 'hybrid', label: 'هجين', aliases: ['hybrid', 'هجين'] },
  { key: 'electric', label: 'كهرباء', aliases: ['electric', 'كهربائي', 'كهرباء'] },
  { key: 'other', label: 'أخرى', aliases: ['اخرى', 'أخرى', 'other'] },
];

export function normalizeFuelType(v) {
  return matchKeyFromValue(v, FUEL_TYPES);
}
export function detectFuelTypeFromText(text) {
  return detectKeyFromText(text, FUEL_TYPES);
}
export function fuelTypeLabel(key) {
  const k = String(key || '').trim();
  const item = FUEL_TYPES.find((x) => x.key === k);
  return item ? item.label : '';
}

export const TRANSMISSION_TYPES = [
  { key: 'automatic', label: 'أوتوماتيك', aliases: ['automatic', 'auto', 'اوتوماتيك'] },
  { key: 'manual', label: 'عادي', aliases: ['manual', 'عادي', 'قير عادي'] },
  { key: 'cvt', label: 'CVT', aliases: ['cvt'] },
  { key: 'other', label: 'أخرى', aliases: ['اخرى', 'أخرى', 'other'] },
];

export function normalizeTransmissionType(v) {
  return matchKeyFromValue(v, TRANSMISSION_TYPES);
}
export function detectTransmissionTypeFromText(text) {
  return detectKeyFromText(text, TRANSMISSION_TYPES);
}
export function transmissionTypeLabel(key) {
  const k = String(key || '').trim();
  const item = TRANSMISSION_TYPES.find((x) => x.key === k);
  return item ? item.label : '';
}

// ============
// Backward-compat (كان كل شيء في others.js سابقاً)
// ============
export * from './electronics';
export * from './heavy_equipment';
export * from './solar';
export * from './networks';
export * from './maintenance';
export * from './furniture';
export * from './home_tools';
export * from './clothes';
export * from './animals';
export * from './jobs';
export * from './services';
