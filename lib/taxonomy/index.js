// lib/taxonomy/index.js
import { compactSpaces, normStr } from './helpers';

export * from './helpers';
export * from './cars';
export * from './phones';
export * from './realestate';

// صريح: نصدّر الثوابت / أنواع الأقسام من ملف others.js بشكل مسمى
export {
  ELECTRONICS_TYPES,
  HEAVY_EQUIPMENT_TYPES,
  SOLAR_TYPES,
  NETWORK_TYPES,
  MAINTENANCE_TYPES,
  FURNITURE_TYPES,
  HOME_TOOLS_TYPES,
  CLOTHES_TYPES,
  ANIMAL_TYPES,
  JOB_TYPES,
  SERVICE_TYPES,
  MOTORCYCLE_BRANDS,
  normalizeElectronicsType,
  detectElectronicsTypeFromText,
  electronicsTypeLabel,
  normalizeHeavyEquipmentType,
  detectHeavyEquipmentTypeFromText,
  heavyEquipmentTypeLabel,
  normalizeSolarType,
  detectSolarTypeFromText,
  solarTypeLabel,
  normalizeNetworkType,
  detectNetworkTypeFromText,
  networkTypeLabel,
  normalizeMaintenanceType,
  detectMaintenanceTypeFromText,
  maintenanceTypeLabel,
  normalizeFurnitureType,
  detectFurnitureTypeFromText,
  furnitureTypeLabel,
  normalizeHomeToolsType,
  detectHomeToolsTypeFromText,
  homeToolsTypeLabel,
  normalizeClothesType,
  detectClothesTypeFromText,
  clothesTypeLabel,
  normalizeAnimalType,
  detectAnimalTypeFromText,
  animalTypeLabel,
  normalizeJobType,
  detectJobTypeFromText,
  jobTypeLabel,
  normalizeServiceType,
  detectServiceTypeFromText,
  serviceTypeLabel,
  normalizeMotorcycleBrand,
  detectMotorcycleBrandFromText,
  motorcycleBrandLabel,
} from './others';

import {
  normalizeCarMake,
  detectCarMakeFromText,
  normalizeCarModel,
  detectCarModelFromText,
} from './cars';

import { normalizePhoneBrand, detectPhoneBrandFromText } from './phones';
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
    carModel: '',
    phoneBrand: '',
    dealType: '',
    propertyType: '',
    electronicsType: '',
    motorcycleBrand: '',
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
  if (root === 'electronics') {
    const typeField =
      listing?.electronicsType ??
      listing?.electronics ??
      listing?.electronicsTypeText ??
      listing?.electronics_type ??
      listing?.type ??
      listing?.kind ??
      '';

    out.electronicsType =
      normalizeElectronicsType(typeField) || detectElectronicsTypeFromText(text) || 'other';
  }




  if (root === 'motorcycles') {
    const fromField =
      listing?.motorcycleBrand ??
      listing?.motorcycleBrandText ??
      listing?.motorcycle ??
      listing?.brand ??
      listing?.make ??
      listing?.company ??
      listing?.manufacturer ??
      '';
    out.motorcycleBrand =
      normalizeMotorcycleBrand(fromField) || detectMotorcycleBrandFromText(text) || 'other';
  }

  if (root === 'heavy_equipment') {
    const typeField =
      listing?.heavyEquipmentType ??
      listing?.heavyEquipmentTypeText ??
      listing?.equipmentType ??
      listing?.machineType ??
      listing?.type ??
      listing?.kind ??
      '';
    out.heavyEquipmentType =
      normalizeHeavyEquipmentType(typeField) || detectHeavyEquipmentTypeFromText(text) || 'other';
  }

  if (root === 'solar') {
    const typeField =
      listing?.solarType ??
      listing?.solarTypeText ??
      listing?.solar ??
      listing?.type ??
      listing?.kind ??
      '';
    out.solarType = normalizeSolarType(typeField) || detectSolarTypeFromText(text) || 'other';
  }

  if (root === 'networks') {
    const typeField =
      listing?.networkType ??
      listing?.networkTypeText ??
      listing?.network ??
      listing?.type ??
      listing?.kind ??
      '';
    out.networkType = normalizeNetworkType(typeField) || detectNetworkTypeFromText(text) || 'other';
  }

  if (root === 'maintenance') {
    const typeField =
      listing?.maintenanceType ??
      listing?.maintenanceTypeText ??
      listing?.maintenance ??
      listing?.type ??
      listing?.kind ??
      '';
    out.maintenanceType =
      normalizeMaintenanceType(typeField) || detectMaintenanceTypeFromText(text) || 'other';
  }

  if (root === 'furniture') {
    const typeField =
      listing?.furnitureType ??
      listing?.furnitureTypeText ??
      listing?.furniture ??
      listing?.type ??
      listing?.kind ??
      '';
    out.furnitureType =
      normalizeFurnitureType(typeField) || detectFurnitureTypeFromText(text) || 'other';
  }

  if (root === 'home_tools') {
    const typeField =
      listing?.homeToolsType ??
      listing?.homeToolsTypeText ??
      listing?.homeTools ??
      listing?.type ??
      listing?.kind ??
      '';
    out.homeToolsType =
      normalizeHomeToolsType(typeField) || detectHomeToolsTypeFromText(text) || 'other';
  }

  if (root === 'clothes') {
    const typeField =
      listing?.clothesType ??
      listing?.clothesTypeText ??
      listing?.clothes ??
      listing?.type ??
      listing?.kind ??
      '';
    out.clothesType = normalizeClothesType(typeField) || detectClothesTypeFromText(text) || 'other';
  }

  if (root === 'animals') {
    const typeField =
      listing?.animalType ??
      listing?.animalTypeText ??
      listing?.animal ??
      listing?.type ??
      listing?.kind ??
      '';
    out.animalType = normalizeAnimalType(typeField) || detectAnimalTypeFromText(text) || 'other';
  }

  if (root === 'jobs') {
    const typeField =
      listing?.jobType ??
      listing?.jobTypeText ??
      listing?.job ??
      listing?.type ??
      listing?.kind ??
      '';
    out.jobType = normalizeJobType(typeField) || detectJobTypeFromText(text) || 'other';
  }

  if (root === 'services') {
    const typeField =
      listing?.serviceType ??
      listing?.serviceTypeText ??
      listing?.service ??
      listing?.type ??
      listing?.kind ??
      '';
    out.serviceType = normalizeServiceType(typeField) || detectServiceTypeFromText(text) || 'other';
  }


  return out;
}
