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
  // ─── System-wide Roles ─────────────────────────────────────────
  | 'system_admin'           // Super admin across all modules
  | 'organization_admin'     // Admin for entire organization
  
  // ─── Pharmacy Module Roles ─────────────────────────────────────
  | 'pharmacy_admin'         // Pharmacy administrator
  | 'pharmacist'             // Licensed pharmacist
  | 'pharmacy_supervisor'    // Pharmacy shift supervisor
  | 'pharmacy_tech'          // Pharmacy technician
  | 'pharmacy_intern'        // Pharmacy student/intern
  | 'pharmacy_cashier'       // POS/sales cashier
  | 'inventory_manager'      // Inventory/stock manager
  
  // ─── Hospital Module Roles ─────────────────────────────────────
  | 'hospital_admin'         // Hospital administrator
  | 'medical_director'       // Chief medical officer
  | 'department_head'        // Department/unit head
  | 'doctor'                 // Medical doctor
  | 'specialist_doctor'      // Specialist physician
  | 'resident_doctor'        // Medical resident
  | 'nurse_manager'          // Nursing supervisor
  | 'registered_nurse'       // RN
  | 'licensed_nurse'         // LPN/LVN
  | 'nurse_aide'             // CNA/nursing assistant
  | 'lab_supervisor'         // Laboratory supervisor
  | 'lab_technician'         // Lab technician
  | 'radiographer'           // Radiology technician
  | 'medical_receptionist'   // Hospital front desk
  | 'medical_records'        // Medical records clerk
  | 'billing_specialist'     // Medical billing
  
  // ─── Occupational Health Module Roles ──────────────────────────
  | 'occ_health_admin'       // Occupational health administrator
  | 'occ_health_physician'   // Occupational medicine doctor
  | 'occ_health_nurse'       // Occupational health nurse
  | 'safety_officer'         // Health & safety officer
  | 'safety_coordinator'     // Safety coordinator
  | 'industrial_hygienist'   // Industrial hygienist
  | 'ergonomist'             // Ergonomics specialist
  | 'toxicologist'           // Occupational toxicologist
  | 'audiometrist'           // Hearing test specialist
  | 'spirometry_tech'        // Lung function test technician
  | 'occ_health_counselor'   // Employee wellness counselor
  | 'case_manager'           // Workers compensation case manager
  | 'compliance_officer'     // Regulatory compliance officer
  | 'safety_inspector'       // Workplace safety inspector
  | 'health_educator'        // Occupational health educator
  
  // ─── Cross-Module Support Roles ───────────────────────────────
  | 'data_analyst'           // Data analysis across modules
  | 'quality_assurance'      // Quality control specialist
  | 'it_support'             // Technical support
  | 'training_coordinator'   // Staff training coordinator
  
  // ─── Legacy/General Roles (for backward compatibility) ─────────
  | 'admin'
  | 'receptionist'
  | 'cashier';

export type Permission = 
  // ─── System Permissions ────────────────────────────────────────
  | 'manage_users'
  | 'manage_system_settings'
  | 'manage_licenses'
  | 'system_backup_restore'
  
  // ─── Patient/Worker Management ─────────────────────────────────
  | 'view_patients'
  | 'manage_patients'
  | 'view_workers'
  | 'manage_workers'
  | 'access_medical_records'
  | 'manage_medical_records'
  
  // ─── Pharmacy Permissions ──────────────────────────────────────
  | 'dispense_medication'
  | 'manage_prescriptions'
  | 'prescribe_medication'
  | 'manage_inventory'
  | 'manage_suppliers'
  | 'access_pos'
  | 'process_returns'
  | 'manage_drug_schedule'
  
  // ─── Hospital Permissions ──────────────────────────────────────
  | 'manage_appointments'
  | 'manage_admissions'
  | 'access_lab_results'
  | 'manage_lab_orders'
  | 'manage_wards'
  | 'discharge_patients'
  | 'access_imaging'
  | 'manage_procedures'
  
  // ─── Occupational Health Permissions ───────────────────────────
  | 'conduct_medical_exams'
  | 'issue_fitness_certificates'
  | 'manage_incidents'
  | 'conduct_risk_assessments'
  | 'manage_surveillance_programs'
  | 'conduct_audiometry'
  | 'conduct_spirometry'
  | 'manage_drug_screening'
  | 'manage_ppe_compliance'
  | 'access_injury_reports'
  | 'manage_return_to_work'
  | 'conduct_workplace_inspections'
  | 'manage_hazard_communications'
  | 'access_exposure_records'
  | 'manage_health_programs'
  | 'regulatory_reporting'
  | 'manage_ergonomic_assessments'
  | 'conduct_health_education'
  | 'manage_vaccination_programs'
  
  // ─── Financial & Administrative ────────────────────────────────
  | 'manage_billing'
  | 'view_financial_reports'
  | 'manage_insurance_claims'
  | 'process_payments'
  
  // ─── Reporting & Analytics ─────────────────────────────────────
  | 'view_reports'
  | 'generate_reports'
  | 'view_analytics'
  | 'export_data'
  | 'manage_dashboards'
  
  // ─── Compliance & Quality ──────────────────────────────────────
  | 'access_audit_logs'
  | 'manage_compliance'
  | 'quality_control'
  | 'access_sensitive_data'
  
  // ─── Training & Support ────────────────────────────────────────
  | 'manage_training'
  | 'provide_support'
  | 'manage_documentation';

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
      // System-wide Roles
      system_admin: 'System Administrator',
      organization_admin: 'Organization Admin',
      
      // Pharmacy Module Roles
      pharmacy_admin: 'Pharmacy Admin',
      pharmacist: 'Pharmacist',
      pharmacy_supervisor: 'Pharmacy Supervisor',
      pharmacy_tech: 'Pharmacy Technician',
      pharmacy_intern: 'Pharmacy Intern',
      pharmacy_cashier: 'Pharmacy Cashier',
      inventory_manager: 'Inventory Manager',
      
      // Hospital Module Roles
      hospital_admin: 'Hospital Admin',
      medical_director: 'Medical Director',
      department_head: 'Department Head',
      doctor: 'Doctor',
      specialist_doctor: 'Specialist Doctor',
      resident_doctor: 'Resident Doctor',
      nurse_manager: 'Nurse Manager',
      registered_nurse: 'Registered Nurse',
      licensed_nurse: 'Licensed Practical Nurse',
      nurse_aide: 'Nursing Assistant',
      lab_supervisor: 'Laboratory Supervisor',
      lab_technician: 'Lab Technician',
      radiographer: 'Radiographer',
      medical_receptionist: 'Medical Receptionist',
      medical_records: 'Medical Records Clerk',
      billing_specialist: 'Billing Specialist',
      
      // Occupational Health Module Roles
      occ_health_admin: 'Occupational Health Admin',
      occ_health_physician: 'Occupational Health Physician',
      occ_health_nurse: 'Occupational Health Nurse',
      safety_officer: 'Safety Officer',
      safety_coordinator: 'Safety Coordinator',
      industrial_hygienist: 'Industrial Hygienist',
      ergonomist: 'Ergonomist',
      toxicologist: 'Toxicologist',
      audiometrist: 'Audiometrist',
      spirometry_tech: 'Spirometry Technician',
      occ_health_counselor: 'Occupational Health Counselor',
      case_manager: 'Case Manager',
      compliance_officer: 'Compliance Officer',
      safety_inspector: 'Safety Inspector',
      health_educator: 'Health Educator',
      
      // Cross-Module Support Roles
      data_analyst: 'Data Analyst',
      quality_assurance: 'Quality Assurance',
      it_support: 'IT Support',
      training_coordinator: 'Training Coordinator',
      
      // Legacy/General Roles
      admin: 'Administrator',
      receptionist: 'Receptionist',
      cashier: 'Cashier'
    };
    return roleNames[role] || role;
  }

  static getRolesByModule(module: 'pharmacy' | 'hospital' | 'occupational_health' | 'system' | 'support'): UserRole[] {
    const rolesByModule = {
      system: [
        'system_admin', 
        'organization_admin', 
        'admin'
      ] as UserRole[],
      
      pharmacy: [
        'pharmacy_admin',
        'pharmacist',
        'pharmacy_supervisor', 
        'pharmacy_tech',
        'pharmacy_intern',
        'pharmacy_cashier',
        'inventory_manager'
      ] as UserRole[],
      
      hospital: [
        'hospital_admin',
        'medical_director',
        'department_head',
        'doctor',
        'specialist_doctor', 
        'resident_doctor',
        'nurse_manager',
        'registered_nurse',
        'licensed_nurse',
        'nurse_aide',
        'lab_supervisor',
        'lab_technician',
        'radiographer',
        'medical_receptionist',
        'medical_records',
        'billing_specialist'
      ] as UserRole[],
      
      occupational_health: [
        'occ_health_admin',
        'occ_health_physician',
        'occ_health_nurse',
        'safety_officer',
        'safety_coordinator',
        'industrial_hygienist',
        'ergonomist',
        'toxicologist', 
        'audiometrist',
        'spirometry_tech',
        'occ_health_counselor',
        'case_manager',
        'compliance_officer',
        'safety_inspector',
        'health_educator'
      ] as UserRole[],
      
      support: [
        'data_analyst',
        'quality_assurance',
        'it_support',
        'training_coordinator',
        'receptionist',
        'cashier'
      ] as UserRole[]
    };
    
    return rolesByModule[module] || [];
  }

  static getRoleModule(role: UserRole): 'pharmacy' | 'hospital' | 'occupational_health' | 'system' | 'support' | 'legacy' {
    const systemRoles = ['system_admin', 'organization_admin', 'admin'];
    const pharmacyRoles = ['pharmacy_admin', 'pharmacist', 'pharmacy_supervisor', 'pharmacy_tech', 'pharmacy_intern', 'pharmacy_cashier', 'inventory_manager'];
    const hospitalRoles = ['hospital_admin', 'medical_director', 'department_head', 'doctor', 'specialist_doctor', 'resident_doctor', 'nurse_manager', 'registered_nurse', 'licensed_nurse', 'nurse_aide', 'lab_supervisor', 'lab_technician', 'radiographer', 'medical_receptionist', 'medical_records', 'billing_specialist'];
    const occHealthRoles = ['occ_health_admin', 'occ_health_physician', 'occ_health_nurse', 'safety_officer', 'safety_coordinator', 'industrial_hygienist', 'ergonomist', 'toxicologist', 'audiometrist', 'spirometry_tech', 'occ_health_counselor', 'case_manager', 'compliance_officer', 'safety_inspector', 'health_educator'];
    const supportRoles = ['data_analyst', 'quality_assurance', 'it_support', 'training_coordinator', 'receptionist', 'cashier'];
    
    if (systemRoles.includes(role)) return 'system';
    if (pharmacyRoles.includes(role)) return 'pharmacy';
    if (hospitalRoles.includes(role)) return 'hospital';
    if (occHealthRoles.includes(role)) return 'occupational_health';
    if (supportRoles.includes(role)) return 'support';
    return 'legacy';
  }

  static hasPermission(user: User, permission: Permission): boolean {
    const permissions = this.getDefaultPermissions(user.primaryRole);
    return permissions.includes(permission);
  }

  static canAccessModule(user: User, module: 'pharmacy' | 'hospital' | 'occupational_health'): boolean {
    const roleModule = this.getRoleModule(user.primaryRole);
    // System admins and organization admins can access all modules
    if (roleModule === 'system') return true;
    // Users can access their own module + some support roles can access multiple
    return roleModule === module || roleModule === 'support';
  }

  static getDefaultPermissions(role: UserRole): Permission[] {
    switch (role) {
      // System-wide Roles
      case 'system_admin':
        return [
          'manage_users', 'manage_system_settings', 'manage_licenses', 'system_backup_restore',
          'view_patients', 'manage_patients', 'view_workers', 'manage_workers', 'access_medical_records', 'manage_medical_records',
          'dispense_medication', 'manage_prescriptions', 'prescribe_medication', 'manage_inventory', 'manage_suppliers', 'access_pos', 'process_returns', 'manage_drug_schedule',
          'manage_appointments', 'manage_admissions', 'access_lab_results', 'manage_lab_orders', 'manage_wards', 'discharge_patients', 'access_imaging', 'manage_procedures',
          'conduct_medical_exams', 'issue_fitness_certificates', 'manage_incidents', 'conduct_risk_assessments', 'manage_surveillance_programs', 'conduct_audiometry', 'conduct_spirometry', 'manage_drug_screening', 'manage_ppe_compliance', 'access_injury_reports', 'manage_return_to_work', 'conduct_workplace_inspections', 'manage_hazard_communications', 'access_exposure_records', 'manage_health_programs', 'regulatory_reporting', 'manage_ergonomic_assessments', 'conduct_health_education', 'manage_vaccination_programs',
          'manage_billing', 'view_financial_reports', 'manage_insurance_claims', 'process_payments',
          'view_reports', 'generate_reports', 'view_analytics', 'export_data', 'manage_dashboards',
          'access_audit_logs', 'manage_compliance', 'quality_control', 'access_sensitive_data',
          'manage_training', 'provide_support', 'manage_documentation'
        ];
      
      case 'organization_admin':
        return [
          'manage_users', 'manage_system_settings', 'view_patients', 'manage_patients', 'view_workers', 'manage_workers',
          'access_medical_records', 'manage_medical_records', 'manage_billing', 'view_financial_reports', 'manage_insurance_claims',
          'view_reports', 'generate_reports', 'view_analytics', 'export_data', 'manage_dashboards',
          'access_audit_logs', 'manage_compliance', 'quality_control', 'manage_training', 'provide_support'
        ];

      // Pharmacy Module Roles
      case 'pharmacy_admin':
        return [
          'manage_users', 'view_patients', 'manage_patients', 'dispense_medication', 'manage_prescriptions',
          'manage_inventory', 'manage_suppliers', 'access_pos', 'process_returns', 'manage_drug_schedule',
          'manage_billing', 'view_financial_reports', 'process_payments', 'view_reports', 'generate_reports',
          'view_analytics', 'export_data', 'manage_compliance', 'quality_control', 'manage_training'
        ];
      
      case 'pharmacist':
        return [
          'view_patients', 'dispense_medication', 'manage_prescriptions', 'manage_inventory', 
          'manage_suppliers', 'access_pos', 'process_returns', 'manage_drug_schedule',
          'view_reports', 'manage_compliance'
        ];
      
      case 'pharmacy_supervisor':
        return [
          'view_patients', 'dispense_medication', 'manage_prescriptions', 'manage_inventory',
          'access_pos', 'process_returns', 'view_reports', 'quality_control', 'manage_training'
        ];
      
      case 'pharmacy_tech':
        return [
          'view_patients', 'dispense_medication', 'manage_inventory', 'access_pos', 'process_returns'
        ];
      
      case 'pharmacy_intern':
        return [
          'view_patients', 'dispense_medication', 'manage_inventory', 'access_pos'
        ];
      
      case 'pharmacy_cashier':
        return [
          'view_patients', 'access_pos', 'manage_billing', 'process_payments'
        ];
      
      case 'inventory_manager':
        return [
          'manage_inventory', 'manage_suppliers', 'view_reports', 'generate_reports', 'view_analytics'
        ];

      // Hospital Module Roles
      case 'hospital_admin':
        return [
          'manage_users', 'view_patients', 'manage_patients', 'access_medical_records', 'manage_medical_records',
          'manage_appointments', 'manage_admissions', 'access_lab_results', 'manage_lab_orders', 'manage_wards',
          'discharge_patients', 'access_imaging', 'manage_procedures', 'manage_billing', 'view_financial_reports',
          'manage_insurance_claims', 'view_reports', 'generate_reports', 'view_analytics', 'export_data',
          'manage_compliance', 'quality_control', 'manage_training'
        ];
      
      case 'medical_director':
        return [
          'manage_users', 'view_patients', 'manage_patients', 'access_medical_records', 'manage_medical_records',
          'prescribe_medication', 'manage_appointments', 'manage_admissions', 'access_lab_results', 'manage_lab_orders',
          'manage_wards', 'discharge_patients', 'access_imaging', 'manage_procedures', 'view_reports', 'generate_reports',
          'view_analytics', 'manage_compliance', 'quality_control', 'manage_training'
        ];
      
      case 'department_head':
        return [
          'view_patients', 'manage_patients', 'access_medical_records', 'manage_medical_records', 'prescribe_medication',
          'manage_appointments', 'manage_admissions', 'access_lab_results', 'manage_lab_orders', 'manage_wards',
          'discharge_patients', 'access_imaging', 'manage_procedures', 'view_reports', 'manage_training'
        ];
      
      case 'doctor':
        return [
          'view_patients', 'manage_patients', 'access_medical_records', 'prescribe_medication',
          'manage_appointments', 'access_lab_results', 'manage_lab_orders', 'access_imaging', 'manage_procedures'
        ];
      
      case 'specialist_doctor':
        return [
          'view_patients', 'manage_patients', 'access_medical_records', 'prescribe_medication',
          'manage_appointments', 'access_lab_results', 'manage_lab_orders', 'access_imaging', 'manage_procedures'
        ];
      
      case 'resident_doctor':
        return [
          'view_patients', 'manage_patients', 'access_medical_records', 'prescribe_medication',
          'manage_appointments', 'access_lab_results', 'access_imaging'
        ];
      
      case 'nurse_manager':
        return [
          'view_patients', 'manage_patients', 'access_medical_records', 'manage_appointments',
          'manage_admissions', 'access_lab_results', 'manage_wards', 'discharge_patients',
          'view_reports', 'manage_training'
        ];
      
      case 'registered_nurse':
        return [
          'view_patients', 'manage_patients', 'access_medical_records', 'manage_appointments',
          'manage_admissions', 'access_lab_results', 'manage_wards'
        ];
      
      case 'licensed_nurse':
        return [
          'view_patients', 'manage_patients', 'access_medical_records', 'manage_appointments', 'manage_wards'
        ];
      
      case 'nurse_aide':
        return [
          'view_patients', 'manage_patients', 'manage_appointments', 'manage_wards'
        ];
      
      case 'lab_supervisor':
        return [
          'access_lab_results', 'manage_lab_orders', 'view_patients', 'view_reports', 'quality_control', 'manage_training'
        ];
      
      case 'lab_technician':
        return [
          'access_lab_results', 'manage_lab_orders', 'view_patients'
        ];
      
      case 'radiographer':
        return [
          'access_imaging', 'view_patients', 'manage_appointments'
        ];
      
      case 'medical_receptionist':
        return [
          'view_patients', 'manage_appointments', 'manage_billing', 'process_payments'
        ];
      
      case 'medical_records':
        return [
          'access_medical_records', 'manage_medical_records', 'view_patients', 'manage_appointments'
        ];
      
      case 'billing_specialist':
        return [
          'manage_billing', 'view_financial_reports', 'manage_insurance_claims', 'process_payments', 'view_patients'
        ];

      // Occupational Health Module Roles
      case 'occ_health_admin':
        return [
          'manage_users', 'view_workers', 'manage_workers', 'access_medical_records', 'manage_medical_records',
          'conduct_medical_exams', 'issue_fitness_certificates', 'manage_incidents', 'conduct_risk_assessments',
          'manage_surveillance_programs', 'conduct_audiometry', 'conduct_spirometry', 'manage_drug_screening',
          'manage_ppe_compliance', 'access_injury_reports', 'manage_return_to_work', 'conduct_workplace_inspections',
          'manage_hazard_communications', 'access_exposure_records', 'manage_health_programs', 'regulatory_reporting',
          'manage_ergonomic_assessments', 'conduct_health_education', 'manage_vaccination_programs',
          'manage_billing', 'view_financial_reports', 'view_reports', 'generate_reports', 'view_analytics',
          'export_data', 'manage_compliance', 'quality_control', 'manage_training', 'provide_support'
        ];
      
      case 'occ_health_physician':
        return [
          'view_workers', 'manage_workers', 'access_medical_records', 'manage_medical_records',
          'conduct_medical_exams', 'issue_fitness_certificates', 'manage_incidents', 'conduct_risk_assessments',
          'manage_surveillance_programs', 'manage_drug_screening', 'access_injury_reports', 'manage_return_to_work',
          'access_exposure_records', 'manage_health_programs', 'regulatory_reporting', 'manage_ergonomic_assessments',
          'conduct_health_education', 'manage_vaccination_programs', 'view_reports'
        ];
      
      case 'occ_health_nurse':
        return [
          'view_workers', 'manage_workers', 'access_medical_records', 'conduct_medical_exams',
          'issue_fitness_certificates', 'manage_incidents', 'manage_surveillance_programs', 'conduct_audiometry',
          'conduct_spirometry', 'manage_drug_screening', 'access_injury_reports', 'manage_return_to_work',
          'conduct_health_education', 'manage_vaccination_programs'
        ];
      
      case 'safety_officer':
        return [
          'view_workers', 'manage_incidents', 'conduct_risk_assessments', 'manage_ppe_compliance',
          'access_injury_reports', 'conduct_workplace_inspections', 'manage_hazard_communications',
          'access_exposure_records', 'regulatory_reporting', 'manage_ergonomic_assessments',
          'conduct_health_education', 'view_reports', 'manage_compliance'
        ];
      
      case 'safety_coordinator':
        return [
          'view_workers', 'manage_incidents', 'conduct_risk_assessments', 'manage_ppe_compliance',
          'access_injury_reports', 'conduct_workplace_inspections', 'manage_hazard_communications',
          'conduct_health_education', 'view_reports'
        ];
      
      case 'industrial_hygienist':
        return [
          'view_workers', 'conduct_risk_assessments', 'manage_surveillance_programs', 'access_exposure_records',
          'manage_ergonomic_assessments', 'conduct_workplace_inspections', 'manage_hazard_communications',
          'regulatory_reporting', 'view_reports'
        ];
      
      case 'ergonomist':
        return [
          'view_workers', 'manage_ergonomic_assessments', 'conduct_risk_assessments', 'conduct_health_education',
          'view_reports'
        ];
      
      case 'toxicologist':
        return [
          'view_workers', 'conduct_risk_assessments', 'access_exposure_records', 'manage_hazard_communications',
          'regulatory_reporting', 'view_reports'
        ];
      
      case 'audiometrist':
        return [
          'view_workers', 'conduct_audiometry', 'access_medical_records', 'view_reports'
        ];
      
      case 'spirometry_tech':
        return [
          'view_workers', 'conduct_spirometry', 'access_medical_records', 'view_reports'
        ];
      
      case 'occ_health_counselor':
        return [
          'view_workers', 'manage_workers', 'access_medical_records', 'manage_return_to_work',
          'conduct_health_education', 'view_reports'
        ];
      
      case 'case_manager':
        return [
          'view_workers', 'manage_workers', 'access_medical_records', 'manage_incidents',
          'access_injury_reports', 'manage_return_to_work', 'manage_insurance_claims', 'view_reports'
        ];
      
      case 'compliance_officer':
        return [
          'regulatory_reporting', 'manage_compliance', 'access_audit_logs', 'view_reports',
          'generate_reports', 'manage_documentation', 'quality_control'
        ];
      
      case 'safety_inspector':
        return [
          'conduct_workplace_inspections', 'conduct_risk_assessments', 'manage_incidents',
          'access_injury_reports', 'manage_ppe_compliance', 'view_reports'
        ];
      
      case 'health_educator':
        return [
          'view_workers', 'conduct_health_education', 'manage_health_programs', 'manage_training', 'view_reports'
        ];

      // Cross-Module Support Roles
      case 'data_analyst':
        return [
          'view_reports', 'generate_reports', 'view_analytics', 'export_data', 'manage_dashboards'
        ];
      
      case 'quality_assurance':
        return [
          'quality_control', 'manage_compliance', 'access_audit_logs', 'view_reports', 'generate_reports'
        ];
      
      case 'it_support':
        return [
          'provide_support', 'manage_system_settings', 'access_audit_logs'
        ];
      
      case 'training_coordinator':
        return [
          'manage_training', 'conduct_health_education', 'manage_documentation', 'view_reports'
        ];

      // Legacy/General Roles
      case 'admin':
        return [
          'manage_users', 'view_patients', 'manage_patients', 'prescribe_medication', 'dispense_medication',
          'manage_inventory', 'view_reports', 'manage_billing', 'manage_appointments', 'access_lab_results',
          'manage_system_settings', 'manage_licenses', 'view_analytics', 'manage_suppliers', 'access_pos',
          'manage_prescriptions', 'access_medical_records', 'manage_wards', 'view_financial_reports'
        ];
      
      case 'receptionist':
        return [
          'view_patients', 'manage_appointments', 'manage_billing', 'access_pos'
        ];
      
      case 'cashier':
        return [
          'access_pos', 'manage_billing', 'view_patients'
        ];
      
      default:
        return ['view_patients'];
    }
  }
}