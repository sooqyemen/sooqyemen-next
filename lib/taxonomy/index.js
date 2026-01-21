// lib/taxonomy/index.js
import { compactSpaces, normStr } from './helpers';

export * from './helpers';
export * from './cars';
export * from './phones';
export * from './realestate';
export * from './others';

import {
  normalizeCarMake,
  detectCarMakeFromText,
  normalizeCarModel,
  detectCarModelFromText,
} from './cars';

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
    carModel: '', // ✅ جديد
    phoneBrand: '',
    dealType: '',
    propertyType: '',
  };

  if (root === 'cars') {
    const makeField =
      listing?.carMake ??
      listing?.make ??
      listing?.brand ??
      listing?.company ??
      listing?.manufacturer ??
      listing?.car_make ??
      listing?.carBrand ??
      '';

    // الشركة
    out.carMake = normalizeCarMake(makeField) || detectCarMakeFromText(text) || 'other';

    // الموديل (نستخرجه من حقول شائعة أو من النص)
    const modelField =
      listing?.carModel ??
      listing?.model ??
      listing?.car_model ??
      listing?.carModelName ??
      listing?.car_type ??
      '';

    // لو الشركة "other" ما نحاول نطلع موديل لأنه يعتمد على make
    if (out.carMake && out.carMake !== 'other') {
      out.carModel =
        normalizeCarModel(out.carMake, modelField) ||
        detectCarModelFromText(out.carMake, text) ||
        '';
    } else {
      out.carModel = '';
    }
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
    out.propertyType =
      normalizePropertyType(propField) || detectPropertyTypeFromText(text) || 'other';
  }

  return out;
}
