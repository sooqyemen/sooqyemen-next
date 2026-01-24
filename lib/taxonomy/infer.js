// lib/taxonomy/infer.js
// دوال الاستدلال (inference) للتعامل مع اختلافات الحقول/النصوص

import { compactSpaces, normStr } from './helpers';

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

import { inferMotorcycleFromListing } from './motorcycles';

// ✅ استنتاج الفروع حتى لو الإعلانات القديمة ما فيها حقول
export function inferListingTaxonomy(listing, rootKey) {
  const title = normStr(listing?.title);
  const desc = normStr(listing?.description);
  const text = compactSpaces(`${title} ${desc}`);

  const root = String(rootKey || '').trim() || '';

  const out = {
    root,
    carMake: '',
    carModel: '',
    phoneBrand: '',
    dealType: '',
    propertyType: '',
    motorcycleBrand: '',
    motorcycleModel: '',
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

    out.carMake = normalizeCarMake(makeField) || detectCarMakeFromText(text) || 'other';

    const modelField =
      listing?.carModel ??
      listing?.model ??
      listing?.car_model ??
      listing?.carModelName ??
      listing?.car_type ??
      '';

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

    out.dealType = normalizeDealType(dealField) || detectDealTypeFromText(text) || '';
    out.propertyType = normalizePropertyType(propField) || detectPropertyTypeFromText(text) || 'other';
  }

  if (root === 'motorcycles') {
    const moto = inferMotorcycleFromListing(listing);
    out.motorcycleBrand = moto?.motorcycleBrand || '';
    out.motorcycleModel = moto?.motorcycleModel || '';
  }

  return out;
}
