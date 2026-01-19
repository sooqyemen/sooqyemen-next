// lib/taxonomy/index.js
import { compactSpaces, normStr } from './helpers';

export * from './helpers';
export * from './cars';
export * from './phones';
export * from './realestate';

import { normalizeCarMake, detectCarMakeFromText } from './cars';
import { normalizePhoneBrand, detectPhoneBrandFromText } from './phones';
import {
  normalizeDealType,
  detectDealTypeFromText,
  normalizePropertyType,
  detectPropertyTypeFromText,
} from './realestate';

// ✅ استنتاج الفروع حتى لو الإعلانات القديمة ما فيها حقول
export function inferListingTaxonomy(listing, rootKey) {
  const title = normStr(listing?.title);
  const desc = normStr(listing?.description);
  const text = compactSpaces(`${title} ${desc}`);

  const root = String(rootKey || '').trim() || '';

  const out = {
    root,
    carMake: '',
    phoneBrand: '',
    dealType: '',
    propertyType: '',
  };

  if (root === 'cars') {
    const fromField =
      listing?.carMake ??
      listing?.make ??
      listing?.brand ??
      listing?.company ??
      listing?.manufacturer ??
      listing?.car_make ??
      listing?.carBrand ??
      '';

    out.carMake = normalizeCarMake(fromField) || detectCarMakeFromText(text) || 'other';
  }

  if (root === 'phones') {
    const fromField =
      listing?.phoneBrand ??
      listing?.brand ??
      listing?.make ??
      listing?.company ??
      listing?.manufacturer ??
      listing?.phone_make ??
      '';

    out.phoneBrand = normalizePhoneBrand(fromField) || detectPhoneBrandFromText(text) || 'other';
  }

  if (root === 'realestate') {
    const dealField =
      listing?.dealType ??
      listing?.deal ??
      listing?.offerType ??
      listing?.purpose ??
      listing?.forType ??
      listing?.rentOrSale ??
      '';

    const propField =
      listing?.propertyType ??
      listing?.realestateType ??
      listing?.subType ??
      listing?.kind ??
      listing?.property_kind ??
      '';

    // نتركها فارغة بدل افتراض "بيع" للإعلانات القديمة
    out.dealType = normalizeDealType(dealField) || detectDealTypeFromText(text) || '';
    out.propertyType = normalizePropertyType(propField) || detectPropertyTypeFromText(text) || 'other';
  }

  return out;
}
