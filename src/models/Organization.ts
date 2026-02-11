export interface Organization {
  id: string;
  name: string;
  registrationNumber?: string;
  businessType: BusinessType;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  billingAddress?: string;
  taxNumber?: string;
  isActive: boolean;
  settings?: Record<string, any>;
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string
}

export type BusinessType = 
  | 'HOSPITAL'
  | 'PHARMACY'
  | 'CLINIC'
  | 'HEALTHCARE_GROUP'
  | 'MEDICAL_CENTER'
  | 'DIAGNOSTIC_CENTER';

export interface Hospital {
  id: string;
  organizationId: string;
  name: string;
  hospitalCode: string;
  type: HospitalType;
  bedCapacity: number;
  departments: string[];
  servicesOffered: string[];
  accreditationInfo?: Record<string, any>;
  emergencyContact?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type HospitalType = 
  | 'GENERAL'
  | 'SPECIALTY'
  | 'CLINIC'
  | 'EMERGENCY'
  | 'TEACHING'
  | 'PSYCHIATRIC'
  | 'REHABILITATION';

export interface Pharmacy {
  id: string;
  organizationId: string;
  name: string;
  pharmacyCode: string;
  licenseNumber: string;
  type: PharmacyType;
  services: string[];
  operatingHours?: Record<string, any>;
  acceptsInsurance: boolean;
  deliveryAvailable: boolean;
  is24Hours: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type PharmacyType = 
  | 'RETAIL'
  | 'HOSPITAL'
  | 'SPECIALTY'
  | 'ONLINE'
  | 'COMPOUND'
  | 'CLINICAL';

export interface OrganizationCreate extends Omit<Organization, 'id' | 'createdAt' | 'isActive'> {
  id?: string;
  createdAt?: string;
  isActive?: boolean;
}

export interface OrganizationUpdate extends Partial<Omit<Organization, 'id' | 'createdAt'>> {
  updatedAt?: string;
}

export interface HospitalCreate extends Omit<Hospital, 'id' | 'createdAt' | 'isActive'> {
  id?: string;
  createdAt?: string;
  isActive?: boolean;
}

export interface HospitalUpdate extends Partial<Omit<Hospital, 'id' | 'organizationId' | 'createdAt'>> {
  updatedAt?: string;
}

export interface PharmacyCreate extends Omit<Pharmacy, 'id' | 'createdAt' | 'isActive'> {
  id?: string;
  createdAt?: string;
  isActive?: boolean;
}

export interface PharmacyUpdate extends Partial<Omit<Pharmacy, 'id' | 'organizationId' | 'createdAt'>> {
  updatedAt?: string;
}

export class OrganizationUtils {
  static getDisplayName(organization: Organization): string {
    return organization.name;
  }

  static getFullAddress(organization: Organization): string {
    const parts: string[] = [];
    if (organization.address) parts.push(organization.address);
    if (organization.city) parts.push(organization.city);
    if (organization.country) parts.push(organization.country);
    return parts.join(', ');
  }

  static hasContactInfo(organization: Organization): boolean {
    return !!(organization.phone || organization.email);
  }

  static isMultiFacility(hospitals: Hospital[], pharmacies: Pharmacy[]): boolean {
    return (hospitals.length + pharmacies.length) > 1;
  }
}