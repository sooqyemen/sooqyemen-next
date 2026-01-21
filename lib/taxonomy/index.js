// lib/taxonomy/index.js
import { compactSpaces, normStr } from './helpers';

export * from './helpers';
export * from './cars';
export * from './phones';
export * from './realestate';
export * from './others';

import { normalizeCarMake, detectCarMakeFromText, normalizeCarModel, detectCarModelFromText } from './cars';
import { normalizePhoneBrand, detectPhoneBrandFromText } from './phones';
import {
  normalizeDealType,
  detectDealTypeFromText,
  normalizePropertyType,
  detectPropertyTypeFromText,
} from './realestate';
import {
  normalizeElectronicsType,
  detectElectronicsTypeFromText,
  normalizeHeavyEquipmentType,
  detectHeavyEquipmentTypeFromText,
  normalizeSolarType,
  detectSolarTypeFromText,
  normalizeNetworkType,
  detectNetworkTypeFromText,
  normalizeMaintenanceType,
  detectMaintenanceTypeFromText,
  normalizeFurnitureType,
  detectFurnitureTypeFromText,
  normalizeHomeToolsType,
  detectHomeToolsTypeFromText,
  normalizeClothesType,
  detectClothesTypeFromText,
  normalizeAnimalType,
  detectAnimalTypeFromText,
  normalizeJobType,
  detectJobTypeFromText,
  normalizeServiceType,
  detectServiceTypeFromText,
  normalizeMotorcycleBrand,
  detectMotorcycleBrandFromText,
} from './others';

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

    electronicsType: '',
    heavyEquipmentType: '',
    solarType: '',
    networkType: '',
    maintenanceType: '',
    furnitureType: '',
    homeToolsType: '',
    clothesType: '',
    animalType: '',
    jobType: '',
    serviceType: '',
    motorcycleBrand: '',
  };

  if (root === 'cars') {
    const fromMake =
      listing?.carMake ??
      listing?.make ??
      listing?.brand ??
      listing?.company ??
      listing?.manufacturer ??
      listing?.car_make ??
      listing?.carBrand ??
      '';

    const mk = normalizeCarMake(fromMake) || detectCarMakeFromText(text) || 'other';
    out.carMake = mk;

    const fromModel =
      listing?.carModel ??
      listing?.model ??
      listing?.vehicleModel ??
      listing?.subModel ??
      listing?.modelName ??
      '';
    // إذا ما في حقل، حاول من النص (حسب الماركة)
    out.carModel =
      normalizeCarModel(mk, fromModel) ||
      detectCarModelFromText(mk, text) ||
      '';
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

  if (root === 'electronics') {
    const fromField = listing?.electronicsType ?? listing?.type ?? listing?.subType ?? '';
    out.electronicsType = normalizeElectronicsType(fromField) || detectElectronicsTypeFromText(text) || 'other';
  }

  if (root === 'heavy_equipment') {
    const fromField = listing?.heavyEquipmentType ?? listing?.equipmentType ?? listing?.type ?? '';
    out.heavyEquipmentType = normalizeHeavyEquipmentType(fromField) || detectHeavyEquipmentTypeFromText(text) || 'other';
  }

  if (root === 'solar') {
    const fromField = listing?.solarType ?? listing?.type ?? '';
    out.solarType = normalizeSolarType(fromField) || detectSolarTypeFromText(text) || 'other';
  }

  if (root === 'networks') {
    const fromField = listing?.networkType ?? listing?.type ?? '';
    out.networkType = normalizeNetworkType(fromField) || detectNetworkTypeFromText(text) || 'other';
  }

  if (root === 'maintenance') {
    const fromField = listing?.maintenanceType ?? listing?.type ?? '';
    out.maintenanceType = normalizeMaintenanceType(fromField) || detectMaintenanceTypeFromText(text) || 'other';
  }

  if (root === 'furniture') {
    const fromField = listing?.furnitureType ?? listing?.type ?? '';
    out.furnitureType = normalizeFurnitureType(fromField) || detectFurnitureTypeFromText(text) || 'other';
  }

  if (root === 'home_tools') {
    const fromField = listing?.homeToolsType ?? listing?.type ?? '';
    out.homeToolsType = normalizeHomeToolsType(fromField) || detectHomeToolsTypeFromText(text) || 'other';
  }

  if (root === 'clothes') {
    const fromField = listing?.clothesType ?? listing?.type ?? '';
    out.clothesType = normalizeClothesType(fromField) || detectClothesTypeFromText(text) || 'other';
  }

  if (root === 'animals') {
    const fromField = listing?.animalType ?? listing?.type ?? '';
    out.animalType = normalizeAnimalType(fromField) || detectAnimalTypeFromText(text) || 'other';
  }

  if (root === 'jobs') {
    const fromField = listing?.jobType ?? listing?.type ?? '';
    out.jobType = normalizeJobType(fromField) || detectJobTypeFromText(text) || 'other';
  }

  if (root === 'services') {
    const fromField = listing?.serviceType ?? listing?.type ?? '';
    out.serviceType = normalizeServiceType(fromField) || detectServiceTypeFromText(text) || 'other';
  }

  if (root === 'motorcycles') {
    const fromField = listing?.motorcycleBrand ?? listing?.brand ?? listing?.make ?? '';
    out.motorcycleBrand = normalizeMotorcycleBrand(fromField) || detectMotorcycleBrandFromText(text) || 'other';
  }

  return out;
}
