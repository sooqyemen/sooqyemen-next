// lib/taxonomy/index.js
import { compactSpaces, normStr } from './helpers';

export * from './helpers';
export * from './cars';
export * from './phones';
export * from './realestate';
export * from './motorcycles';

// ✅ الأقسام المتبقية أصبحت كل واحدة بملف مستقل داخل lib/taxonomy/*
// ✅ هنا نصدرها عبر others.js للتوافق (Backwards-compat) بدون تكرار exports
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

import {
  normalizeMotorcycleBrand,
  detectMotorcycleBrandFromText,
  normalizeMotorcycleModel,
  detectMotorcycleModelFromText,
} from './motorcycles';

import { normalizeElectronicsType, detectElectronicsTypeFromText } from './electronics';
import { normalizeHeavyEquipmentType, detectHeavyEquipmentTypeFromText } from './heavy_equipment';
import { normalizeSolarType, detectSolarTypeFromText } from './solar';
import { normalizeNetworkType, detectNetworkTypeFromText } from './networks';
import { normalizeMaintenanceType, detectMaintenanceTypeFromText } from './maintenance';
import { normalizeFurnitureType, detectFurnitureTypeFromText } from './furniture';
import { normalizeHomeToolsType, detectHomeToolsTypeFromText } from './home_tools';
import { normalizeClothesType, detectClothesTypeFromText } from './clothes';
import { normalizeAnimalType, detectAnimalTypeFromText } from './animals';
import { normalizeJobType, detectJobTypeFromText } from './jobs';
import { normalizeServiceType, detectServiceTypeFromText } from './services';

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
    motorcycleModel: '',
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
    const brandField =
      listing?.motorcycleBrand ??
      listing?.motorcycleBrandText ??
      listing?.motorcycle ??
      listing?.brand ??
      listing?.make ??
      listing?.company ??
      listing?.manufacturer ??
      '';

    out.motorcycleBrand =
      normalizeMotorcycleBrand(brandField) || detectMotorcycleBrandFromText(text) || 'other';

    const modelField =
      listing?.motorcycleModel ??
      listing?.motorcycleModelText ??
      listing?.motorcycle_model ??
      listing?.model ??
      listing?.type ??
      listing?.kind ??
      '';

    out.motorcycleModel =
      normalizeMotorcycleModel(out.motorcycleBrand, modelField) ||
      detectMotorcycleModelFromText(out.motorcycleBrand, text) ||
      '';
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
