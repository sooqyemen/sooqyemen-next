// lib/taxonomy/index.js
// نقطة الدخول الموحدة للتصنيفات (Taxonomy)

export * from './helpers';
export * from './cars';
export * from './phones';
export * from './realestate';
export * from './motorcycles';

// ✅ الاستدلال (Inference)
export { inferListingTaxonomy } from './infer';

// ⚠️ نصدّر أنواع الأقسام الأخرى بشكل مسمّى فقط (بدون export * لتجنب أي تعارض أسماء)
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
} from './others';
