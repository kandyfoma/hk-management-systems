import DatabaseService from './DatabaseService';
import { License, LicenseCreate, LicenseUpdate, LicenseUtils, ModuleType, LicenseTier, PHARMACY_FEATURES, HOSPITAL_FEATURES } from '../models/License';
import { Organization } from '../models/Organization';

export class LicenseService {
  private static instance: LicenseService;
  private db: DatabaseService;

  private constructor() {
    this.db = DatabaseService.getInstance();
  }

  public static getInstance(): LicenseService {
    if (!LicenseService.instance) {
      LicenseService.instance = new LicenseService();
    }
    return LicenseService.instance;
  }

  /**
   * Validate a license key and return license information
   */
  async validateLicenseKey(licenseKey: string): Promise<{
    isValid: boolean;
    license?: License;
    organization?: Organization;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    try {
      const license = await this.db.getLicenseByKey(licenseKey);
      
      if (!license) {
        errors.push('License key not found');
        return { isValid: false, errors };
      }

      // Check if license is active
      if (!license.isActive) {
        errors.push('License is inactive');
      }

      // Check if license is expired
      if (LicenseUtils.isExpired(license)) {
        errors.push('License has expired');
      }

      // Get organization
      const organization = await this.db.getOrganization(license.organizationId);
      if (!organization) {
        errors.push('Associated organization not found');
      }

      // Check if organization is active
      if (organization && !organization.isActive) {
        errors.push('Organization is inactive');
      }

      const isValid = errors.length === 0;
      
      return {
        isValid,
        license: isValid ? license : undefined,
        organization: isValid ? organization : undefined,
        errors
      };
    } catch (error) {
      console.error('Error validating license key:', error);
      errors.push('System error during license validation');
      return { isValid: false, errors };
    }
  }

  /**
   * Get all licenses for an organization
   */
  async getLicensesForOrganization(organizationId: string): Promise<License[]> {
    try {
      return await this.db.getLicensesByOrganization(organizationId);
    } catch (error) {
      console.error('Error getting licenses for organization:', error);
      return [];
    }
  }

  /**
   * Get active licenses for an organization
   */
  async getActiveLicenses(organizationId: string): Promise<License[]> {
    try {
      const allLicenses = await this.getLicensesForOrganization(organizationId);
      return allLicenses.filter(license => 
        license.isActive && !LicenseUtils.isExpired(license)
      );
    } catch (error) {
      console.error('Error getting active licenses:', error);
      return [];
    }
  }

  /**
   * Check if organization has access to a specific module
   */
  async hasModuleAccess(organizationId: string, moduleType: ModuleType): Promise<boolean> {
    try {
      const activeLicenses = await this.getActiveLicenses(organizationId);
      
      // For trial licenses, check if it matches the module or is TRIAL
      return activeLicenses.some(license => 
        license.moduleType === moduleType || license.moduleType === 'TRIAL'
      );
    } catch (error) {
      console.error('Error checking module access:', error);
      return false;
    }
  }

  /**
   * Check if organization has access to a specific feature
   */
  async hasFeatureAccess(organizationId: string, feature: string): Promise<boolean> {
    try {
      const activeLicenses = await this.getActiveLicenses(organizationId);
      return activeLicenses.some(license => LicenseUtils.hasFeature(license, feature));
    } catch (error) {
      console.error('Error checking feature access:', error);
      return false;
    }
  }

  /**
   * Get available features for an organization
   */
  async getAvailableFeatures(organizationId: string): Promise<string[]> {
    try {
      const activeLicenses = await this.getActiveLicenses(organizationId);
      const allFeatures = new Set<string>();
      
      activeLicenses.forEach(license => {
        license.features.forEach(feature => allFeatures.add(feature));
      });
      
      return Array.from(allFeatures);
    } catch (error) {
      console.error('Error getting available features:', error);
      return [];
    }
  }

  /**
   * Create a new license for an organization
   */
  async createLicense(data: LicenseCreate): Promise<License> {
    try {
      // Validate that organization doesn't already have this module type (unless it's an upgrade)
      const existingLicenses = await this.db.getLicensesByOrganization(data.organizationId);
      const existingModule = existingLicenses.find(l => 
        l.moduleType === data.moduleType && 
        l.isActive && 
        !LicenseUtils.isExpired(l)
      );

      if (existingModule && data.moduleType !== 'TRIAL') {
        throw new Error(`Organization already has an active ${data.moduleType} license`);
      }

      // Auto-generate features based on module type and tier
      const features = LicenseUtils.getFeatures(data.moduleType, data.licenseTier);
      
      const licenseData: LicenseCreate = {
        ...data,
        features,
        issuedDate: data.issuedDate || new Date().toISOString()
      };

      return await this.db.createLicense(licenseData);
    } catch (error) {
      console.error('Error creating license:', error);
      throw error;
    }
  }

  /**
   * Check if organization can add more users for a specific module
   */
  async canAddUsersToModule(organizationId: string, moduleType: ModuleType): Promise<{
    canAdd: boolean;
    currentCount: number;
    maxAllowed: number | null;
    availableSlots: number | null;
  }> {
    try {
      const activeLicenses = await this.getActiveLicenses(organizationId);
      const moduleLicense = activeLicenses.find(l => 
        l.moduleType === moduleType || (l.moduleType === 'TRIAL' && moduleType !== 'TRIAL')
      );

      if (!moduleLicense) {
        return {
          canAdd: false,
          currentCount: 0,
          maxAllowed: 0,
          availableSlots: 0
        };
      }

      // Get current user count for this module
      const userAccess = await this.db.getUserModuleAccess(''); // This would need a different query
      const currentCount = userAccess.filter(access => 
        access.moduleType === moduleType && access.isActive
      ).length;

      const maxAllowed = moduleLicense.maxUsers;
      const canAdd = maxAllowed === null || currentCount < maxAllowed;
      const availableSlots = maxAllowed === null ? null : Math.max(0, maxAllowed - currentCount);

      return {
        canAdd,
        currentCount,
        maxAllowed,
        availableSlots
      };
    } catch (error) {
      console.error('Error checking user capacity:', error);
      return {
        canAdd: false,
        currentCount: 0,
        maxAllowed: 0,
        availableSlots: 0
      };
    }
  }

  /**
   * Get licenses that are expiring soon
   */
  async getExpiringLicenses(organizationId: string, daysThreshold: number = 30): Promise<License[]> {
    try {
      const activeLicenses = await this.getActiveLicenses(organizationId);
      return activeLicenses.filter(license => 
        LicenseUtils.isExpiringSoon(license, daysThreshold)
      );
    } catch (error) {
      console.error('Error getting expiring licenses:', error);
      return [];
    }
  }

  /**
   * Generate trial license for new organization
   */
  async generateTrialLicense(organizationId: string): Promise<License> {
    const trialKey = `TRIAL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // 30 days trial

    const trialLicense: LicenseCreate = {
      licenseKey: trialKey,
      organizationId,
      moduleType: 'TRIAL',
      licenseTier: 'TRIAL',
      issuedDate: new Date().toISOString(),
      expiryDate: expiryDate.toISOString(),
      maxUsers: 3,
      maxFacilities: 1,
      features: [
        ...PHARMACY_FEATURES.PROFESSIONAL,
        ...HOSPITAL_FEATURES.PROFESSIONAL
      ],
      billingCycle: 'TRIAL',
      autoRenew: false
    };

    return await this.createLicense(trialLicense);
  }

  /**
   * Upgrade/downgrade license tier
   */
  async changeLicenseTier(
    licenseId: string, 
    newTier: LicenseTier, 
    changedBy: string,
    reason?: string
  ): Promise<License> {
    try {
      // Get existing license
      const existingLicense = await this.db.getLicenseByKey(''); // Need to get by ID
      if (!existingLicense) {
        throw new Error('License not found');
      }

      // Create license history record
      const historyRecord = {
        licenseId,
        previousTier: existingLicense.licenseTier,
        newTier,
        changeType: newTier > existingLicense.licenseTier ? 'UPGRADE' : 'DOWNGRADE',
        changeReason: reason,
        effectiveDate: new Date().toISOString(),
        changedBy
      };

      // Update license with new tier and features
      const newFeatures = LicenseUtils.getFeatures(existingLicense.moduleType, newTier);
      
      // This would need an update method in DatabaseService
      // For now, we'll return the existing license structure
      const updatedLicense: License = {
        ...existingLicense,
        licenseTier: newTier,
        features: newFeatures,
        updatedAt: new Date().toISOString()
      };

      return updatedLicense;
    } catch (error) {
      console.error('Error changing license tier:', error);
      throw error;
    }
  }

  /**
   * Get license status summary for organization
   */
  async getLicenseStatusSummary(organizationId: string): Promise<{
    totalLicenses: number;
    activeLicenses: number;
    expiredLicenses: number;
    expiringSoon: number;
    modules: ModuleType[];
    features: string[];
    userCapacity: {
      total: number | null;
      used: number;
      available: number | null;
    };
  }> {
    try {
      const allLicenses = await this.getLicensesForOrganization(organizationId);
      const activeLicenses = allLicenses.filter(l => l.isActive && !LicenseUtils.isExpired(l));
      const expiredLicenses = allLicenses.filter(l => LicenseUtils.isExpired(l));
      const expiringSoon = activeLicenses.filter(l => LicenseUtils.isExpiringSoon(l));
      
      const modules = [...new Set(activeLicenses.map(l => l.moduleType))];
      const features = [...new Set(activeLicenses.flatMap(l => l.features))];
      
      const totalUserCapacity = activeLicenses.reduce((sum, l) => {
        if (l.maxUsers === null) return null; // Unlimited
        return (sum || 0) + l.maxUsers;
      }, 0 as number | null);

      // This would need proper user counting implementation
      const usedUserCapacity = 0; // Placeholder

      return {
        totalLicenses: allLicenses.length,
        activeLicenses: activeLicenses.length,
        expiredLicenses: expiredLicenses.length,
        expiringSoon: expiringSoon.length,
        modules,
        features,
        userCapacity: {
          total: totalUserCapacity,
          used: usedUserCapacity,
          available: totalUserCapacity === null ? null : Math.max(0, totalUserCapacity - usedUserCapacity)
        }
      };
    } catch (error) {
      console.error('Error getting license status summary:', error);
      throw error;
    }
  }
}

export default LicenseService;
