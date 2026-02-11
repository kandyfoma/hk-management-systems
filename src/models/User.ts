export interface User {
  id: string;
  organizationId: string;
  phone: string;
  firstName: string;
  lastName: string;
  primaryRole: UserRole;
  department?: string;
  employeeId?: string;
  professionalLicense?: string;
  isActive: boolean;
  lastLogin?: string; // ISO string
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string
  metadata?: Record<string, any>;
}

export type UserRole = 
  | 'admin'
  | 'hospital_admin'
  | 'pharmacy_admin'
  | 'doctor' 
  | 'nurse' 
  | 'pharmacist'
  | 'pharmacy_tech'
  | 'receptionist' 
  | 'lab_technician' 
  | 'cashier'
  | 'inventory_manager';

export type Permission = 
  | 'manage_users'
  | 'view_patients'
  | 'manage_patients'
  | 'prescribe_medication'
  | 'dispense_medication'
  | 'manage_inventory'
  | 'view_reports'
  | 'manage_billing'
  | 'manage_appointments'
  | 'access_lab_results'
  | 'manage_system_settings'
  | 'manage_licenses'
  | 'view_analytics'
  | 'manage_suppliers'
  | 'access_pos'
  | 'manage_prescriptions'
  | 'access_medical_records'
  | 'manage_wards'
  | 'view_financial_reports';

export interface UserCreate extends Omit<User, 'id' | 'createdAt' | 'isActive'> {
  id?: string;
  createdAt?: string;
  password?: string;
  isActive?: boolean;
}

export interface UserUpdate extends Partial<Omit<User, 'id' | 'organizationId' | 'createdAt'>> {
  updatedAt?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user?: User;
  token?: string;
}

export class UserUtils {
  static getFullName(user: User): string {
    return `${user.firstName} ${user.lastName}`;
  }

  static getRoleDisplayName(role: UserRole): string {
    const roleNames: Record<UserRole, string> = {
      admin: 'Administrator',
      hospital_admin: 'Hospital Admin',
      pharmacy_admin: 'Pharmacy Admin',
      doctor: 'Doctor',
      nurse: 'Nurse',
      pharmacist: 'Pharmacist',
      pharmacy_tech: 'Pharmacy Technician',
      receptionist: 'Receptionist',
      lab_technician: 'Lab Technician',
      cashier: 'Cashier',
      inventory_manager: 'Inventory Manager',
    };
    return roleNames[role];
  }

  static getDefaultPermissions(role: UserRole): Permission[] {
    const defaultPermissions: Record<UserRole, Permission[]> = {
      admin: [
        'manage_users',
        'view_patients',
        'manage_patients',
        'manage_inventory',
        'view_reports',
        'manage_billing',
        'manage_appointments',
        'manage_system_settings',
        'manage_licenses',
        'view_analytics',
      ],
      hospital_admin: [
        'manage_users',
        'view_patients',
        'manage_patients',
        'manage_billing',
        'manage_appointments',
        'manage_system_settings',
        'view_reports',
        'view_analytics',
        'manage_wards',
      ],
      pharmacy_admin: [
        'manage_users',
        'manage_inventory',
        'manage_suppliers',
        'manage_billing',
        'view_reports',
        'view_analytics',
        'access_pos',
        'manage_system_settings',
      ],
      doctor: [
        'view_patients',
        'manage_patients',
        'prescribe_medication',
        'access_lab_results',
        'manage_appointments',
        'access_medical_records',
      ],
      nurse: [
        'view_patients',
        'manage_patients',
        'manage_appointments',
        'access_medical_records',
      ],
      pharmacist: [
        'view_patients',
        'dispense_medication',
        'manage_inventory',
        'manage_prescriptions',
        'access_pos',
      ],
      pharmacy_tech: [
        'view_patients',
        'dispense_medication',
        'manage_inventory',
        'access_pos',
      ],
      receptionist: [
        'view_patients',
        'manage_appointments',
        'manage_billing',
      ],
      lab_technician: [
        'view_patients',
        'access_lab_results',
      ],
      cashier: [
        'view_patients',
        'manage_billing',
        'access_pos',
      ],
      inventory_manager: [
        'manage_inventory',
        'manage_suppliers',
        'view_reports',
        'view_analytics',
      ],
    };
    return defaultPermissions[role] || [];
  }
}