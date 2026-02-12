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
  
  // ── Enhanced Audit Fields ──────────────────────────────────────
  lastLogin?: string; // ISO string
  lastLogout?: string; // ISO string  
  lastActivity?: string; // ISO string - tracks any user action
  loginCount: number; // Total number of logins
  failedLoginAttempts: number; // Failed login attempts since last success
  lockoutUntil?: string; // ISO string - account lockout expiration
  lastIpAddress?: string; // Last known IP address
  lastUserAgent?: string; // Last known browser/device
  sessionId?: string; // Current active session
  passwordChangedAt?: string; // ISO string - last password change
  twoFactorEnabled: boolean; // 2FA status
  lastPasswordResetAt?: string; // ISO string - last password reset
  emailVerifiedAt?: string; // ISO string - email verification
  profileCompleteness: number; // 0-100 profile completion percentage
  
  // ── Audit Metadata ─────────────────────────────────────────────
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string
  createdBy?: string; // User ID who created this user
  updatedBy?: string; // User ID who last updated this user
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

// ═══════════════════════════════════════════════════════════════
// AUDIT LOG INTERFACE - Track all user activities
// ═══════════════════════════════════════════════════════════════

export type AuditAction = 
  | 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'PASSWORD_CHANGE' | 'PASSWORD_RESET'
  | 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'SEARCH' | 'EXPORT'
  | 'DISPENSE_MEDICATION' | 'PRESCRIBE_MEDICATION' | 'VOID_PRESCRIPTION'
  | 'PROCESS_SALE' | 'VOID_SALE' | 'REFUND_SALE'
  | 'ADMIT_PATIENT' | 'DISCHARGE_PATIENT' | 'TRANSFER_PATIENT'
  | 'SCHEDULE_APPOINTMENT' | 'CANCEL_APPOINTMENT'
  | 'STOCK_ADJUSTMENT' | 'RECEIVE_INVENTORY' | 'TRANSFER_STOCK'
  | 'GENERATE_REPORT' | 'ACCESS_SENSITIVE_DATA'
  | 'SYSTEM_BACKUP' | 'SYSTEM_RESTORE' | 'SYSTEM_MAINTENANCE';

export type AuditEntityType = 
  | 'USER' | 'PATIENT' | 'ENCOUNTER' | 'PRESCRIPTION' | 'SALE' 
  | 'PRODUCT' | 'SUPPLIER' | 'INVENTORY_ITEM' | 'PURCHASE_ORDER' 
  | 'STOCK_MOVEMENT' | 'ORGANIZATION' | 'LICENSE' | 'APPOINTMENT'
  | 'MEDICAL_RECORD' | 'LAB_RESULT' | 'BILLING' | 'REPORT' | 'SYSTEM';

export interface AuditLog {
  id: string;
  userId: string;
  userName: string; // Full name for easy reading
  userRole: UserRole;
  organizationId: string;
  
  // Action details
  action: AuditAction;
  entityType?: AuditEntityType;
  entityId?: string;
  entityName?: string; // Human-readable entity name
  
  // Data changes (for CREATE/UPDATE/DELETE)
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changes?: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  
  // Request context
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestPath?: string; // API endpoint or screen
  requestMethod?: string; // GET, POST, PUT, DELETE
  
  // Timing and status
  timestamp: string; // ISO string
  duration?: number; // Action duration in milliseconds
  success: boolean;
  errorMessage?: string;
  
  // Additional context
  reason?: string; // Why the action was performed
  notes?: string; // Additional notes
  sensitiveData: boolean; // Flag for sensitive operations
  automated: boolean; // Was this an automated action?
  
  // Compliance tracking
  complianceFlags?: string[]; // HIPAA, GDPR, etc.
  retentionUntil?: string; // ISO string for data retention
  
  createdAt: string;
}

export interface AuditLogCreate extends Omit<AuditLog, 'id' | 'createdAt' | 'userName' | 'userRole' | 'organizationId'> {
  id?: string;
  createdAt?: string;
}

// ═══════════════════════════════════════════════════════════════

export interface UserCreate extends Omit<User, 'id' | 'createdAt' | 'isActive' | 'loginCount' | 'failedLoginAttempts' | 'twoFactorEnabled' | 'profileCompleteness'> {
  id?: string;
  createdAt?: string;
  password?: string;
  isActive?: boolean;
  loginCount?: number;
  failedLoginAttempts?: number;
  twoFactorEnabled?: boolean;
  profileCompleteness?: number;
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