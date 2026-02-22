export interface License {
  id: string;
  licenseKey: string;
  organizationId: string;
  moduleType: ModuleType;
  licenseTier: LicenseTier;
  isActive: boolean;
  issuedDate: string; // ISO string
  expiryDate?: string; // ISO string, null for perpetual licenses
  maxUsers?: number; // null for unlimited
  maxFacilities?: number; // null for unlimited
  features: string[];
  billingCycle: BillingCycle;
  autoRenew: boolean;
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string
  metadata?: Record<string, any>;
}

export type ModuleType = 
  | 'PHARMACY'
  | 'HOSPITAL'
  | 'OCCUPATIONAL_HEALTH'
  | 'PHARMACY_HOSPITAL'
  | 'HOSPITAL_OCCUPATIONAL_HEALTH'
  | 'COMBINED'
  | 'TRIAL';

export type LicenseTier = 
  | 'BASIC'
  | 'PROFESSIONAL'
  | 'ENTERPRISE'
  | 'TRIAL';

export type BillingCycle = 
  | 'MONTHLY'
  | 'ANNUAL'
  | 'PERPETUAL'
  | 'TRIAL';

export interface UserModuleAccess {
  id: string;
  userId: string;
  licenseId: string;
  moduleType: ModuleType;
  role: string;
  permissions: string[];
  facilityAccess: string[]; // Array of facility IDs user can access
  isActive: boolean;
  grantedAt: string; // ISO string
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string
}

export interface LicenseHistory {
  id: string;
  licenseId: string;
  previousTier?: string;
  newTier: string;
  changeType: LicenseChangeType;
  changeReason?: string;
  effectiveDate: string; // ISO string
  changedBy?: string;
  billingImpact?: Record<string, any>;
  createdAt: string; // ISO string
}

export type LicenseChangeType = 
  | 'UPGRADE'
  | 'DOWNGRADE'
  | 'RENEWAL'
  | 'SUSPENSION'
  | 'ACTIVATION'
  | 'EXPIRY';

// License feature constants
export const PHARMACY_FEATURES = {
  BASIC: [
    'pos_system',
    'basic_inventory',
    'basic_reporting',
    'customer_management'
  ],
  PROFESSIONAL: [
    'pos_system',
    'advanced_inventory',
    'prescription_management',
    'supplier_management',
    'advanced_reporting',
    'customer_management',
    'stock_alerts'
  ],
  ENTERPRISE: [
    'pos_system',
    'advanced_inventory',
    'prescription_management',
    'supplier_management',
    'advanced_reporting',
    'customer_management',
    'stock_alerts',
    'multi_location',
    'api_access',
    'advanced_analytics',
    'custom_integrations'
  ]
} as const;

export const HOSPITAL_FEATURES = {
  BASIC: [
    'patient_management',
    'appointment_scheduling',
    'basic_billing',
    'basic_reporting'
  ],
  PROFESSIONAL: [
    'patient_management',
    'appointment_scheduling',
    'medical_records',
    'lab_integration',
    'advanced_scheduling',
    'billing_management',
    'advanced_reporting',
    'prescription_writing'
  ],
  ENTERPRISE: [
    'patient_management',
    'appointment_scheduling',
    'medical_records',
    'lab_integration',
    'advanced_scheduling',
    'billing_management',
    'advanced_reporting',
    'prescription_writing',
    'multi_department',
    'emr_integration',
    'advanced_analytics',
    'api_access',
    'custom_workflows'
  ]
} as const;

export const OCC_HEALTH_FEATURES = {
  BASIC: [
    'worker_management',
    'medical_examinations',
    'fitness_certificates',
    'basic_incident_reporting',
    'basic_reporting'
  ],
  PROFESSIONAL: [
    'worker_management',
    'medical_examinations',
    'fitness_certificates',
    'incident_management',
    'occupational_disease_tracking',
    'surveillance_programs',
    'audiometry_spirometry',
    'drug_screening',
    'ppe_management',
    'advanced_reporting',
    'risk_assessment'
  ],
  ENTERPRISE: [
    'worker_management',
    'medical_examinations',
    'fitness_certificates',
    'incident_management',
    'occupational_disease_tracking',
    'surveillance_programs',
    'audiometry_spirometry',
    'drug_screening',
    'ppe_management',
    'advanced_reporting',
    'risk_assessment',
    'regulatory_compliance',
    'advanced_analytics',
    'multi_site',
    'api_access',
    'custom_workflows',
    'predictive_analytics'
  ]
} as const;

export const TRIAL_FEATURES = [
  ...PHARMACY_FEATURES.PROFESSIONAL,
  ...HOSPITAL_FEATURES.PROFESSIONAL,
  ...OCC_HEALTH_FEATURES.PROFESSIONAL
] as const;

export interface LicenseCreate extends Omit<License, 'id' | 'createdAt' | 'isActive' | 'autoRenew'> {
  id?: string;
  createdAt?: string;
  isActive?: boolean;
  autoRenew?: boolean;
}

export interface LicenseUpdate extends Partial<Omit<License, 'id' | 'organizationId' | 'createdAt'>> {
  updatedAt?: string;
}

export interface UserModuleAccessCreate extends Omit<UserModuleAccess, 'id' | 'createdAt' | 'isActive'> {
  id?: string;
  createdAt?: string;
  isActive?: boolean;
}

export interface UserModuleAccessUpdate extends Partial<Omit<UserModuleAccess, 'id' | 'userId' | 'licenseId' | 'createdAt'>> {
  updatedAt?: string;
}

export class LicenseUtils {
  static isExpired(license: License): boolean {
    if (!license.expiryDate) return false; // Perpetual license
    return new Date(license.expiryDate) < new Date();
  }

  static isExpiringSoon(license: License, daysThreshold: number = 30): boolean {
    if (!license.expiryDate) return false; // Perpetual license
    const expiryDate = new Date(license.expiryDate);
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
    return expiryDate <= thresholdDate && expiryDate >= new Date();
  }

  static getFeatures(moduleType: ModuleType, tier: LicenseTier): string[] {
    if (tier === 'TRIAL') return [...TRIAL_FEATURES];
    
    switch (moduleType) {
      case 'PHARMACY':
        return [...(PHARMACY_FEATURES[tier as keyof typeof PHARMACY_FEATURES] || [])];
      case 'HOSPITAL':
        return [...(HOSPITAL_FEATURES[tier as keyof typeof HOSPITAL_FEATURES] || [])];
      case 'OCCUPATIONAL_HEALTH':
        return [...(OCC_HEALTH_FEATURES[tier as keyof typeof OCC_HEALTH_FEATURES] || [])];
      default:
        return [];
    }
  }

  static hasFeature(license: License, feature: string): boolean {
    return license.features.includes(feature);
  }

  static canAddUsers(license: License, currentUserCount: number): boolean {
    if (!license.maxUsers) return true; // Unlimited
    return currentUserCount < license.maxUsers;
  }

  static canAddFacilities(license: License, currentFacilityCount: number): boolean {
    if (!license.maxFacilities) return true; // Unlimited
    return currentFacilityCount < license.maxFacilities;
  }

  static getDisplayName(license: License): string {
    return `${license.moduleType} ${license.licenseTier}`;
  }

  static getStatusColor(license: License): string {
    if (!license.isActive) return '#ff4444';
    if (this.isExpired(license)) return '#ff4444';
    if (this.isExpiringSoon(license)) return '#ff8800';
    return '#44ff44';
  }
}