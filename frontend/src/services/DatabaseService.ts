/**
 * DatabaseService — In-Memory database that works on Web, Android & iOS.
 * Replaces expo-sqlite with a plain JS in-memory store.
 * All data persists for the lifetime of the app session.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserCreate, AuditLog, AuditLogCreate, AuditAction, AuditEntityType } from '../models/User';
import { Organization, OrganizationCreate } from '../models/Organization';
import { License, LicenseCreate, UserModuleAccess, UserModuleAccessCreate } from '../models/License';
import {
  Supplier, SupplierCreate, SupplierUpdate,
  Product, ProductCreate, ProductUpdate,
  InventoryItem, InventoryItemCreate, InventoryItemUpdate,
  InventoryBatch, InventoryBatchCreate, InventoryBatchUpdate,
  StockMovement, StockMovementCreate,
  PurchaseOrder, PurchaseOrderCreate, PurchaseOrderUpdate,
  PurchaseOrderItem, PurchaseOrderItemCreate,
  InventoryAlert, InventoryAlertCreate,
  StockCount, StockCountItem,
  InventoryUtils,
} from '../models/Inventory';
import {
  Sale, SaleCreate, SaleItem, SalePayment,
  CartState, CartItem, SaleUtils,
} from '../models/Sale';
import {
  Prescription, PrescriptionCreate, PrescriptionUpdate,
  PrescriptionItem, PrescriptionItemCreate, PrescriptionItemUpdate,
  PrescriptionStatus, PrescriptionItemStatus,
  PrescriptionUtils,
} from '../models/Prescription';
import { Patient, PatientCreate, PatientUpdate, PatientUtils, MedicalRecord, VitalSigns } from '../models/Patient';
import { Encounter, EncounterCreate, EncounterUpdate, EncounterUtils } from '../models/Encounter';
import { HospitalInvoice, HospitalInvoiceCreate, HospitalInvoiceUpdate, InvoiceItem, HospitalInvoiceUtils } from '../models/HospitalBilling';
import { PaymentMethod } from '../models/Sale';
import { 
  COMPREHENSIVE_PATIENTS, 
  COMPREHENSIVE_ENCOUNTERS, 
  COMPREHENSIVE_PRESCRIPTIONS, 
  COMPREHENSIVE_SALES,
  ADDITIONAL_PRODUCTS,
  COMPREHENSIVE_SUPPLIERS,
  COMPREHENSIVE_INVENTORY,
  COMPREHENSIVE_PURCHASE_ORDERS,
  COMPREHENSIVE_STOCK_MOVEMENTS
} from './seedData/comprehensiveSeedData';

// ═══════════════════════════════════════════════════════════════
// In-Memory Tables
// ═══════════════════════════════════════════════════════════════

interface Tables {
  organizations: Organization[];
  licenses: License[];
  users: User[];
  user_module_access: UserModuleAccess[];
  audit_logs: AuditLog[];
  // ── Inventory Tables ──────────────────────────────────────
  suppliers: Supplier[];
  products: Product[];
  inventory_items: InventoryItem[];
  inventory_batches: InventoryBatch[];
  stock_movements: StockMovement[];
  purchase_orders: PurchaseOrder[];
  purchase_order_items: PurchaseOrderItem[];
  inventory_alerts: InventoryAlert[];
  stock_counts: StockCount[];
  stock_count_items: StockCountItem[];
  // ── Sales / POS Tables ────────────────────────────────────
  sales: Sale[];
  // ── Patient Tables ────────────────────────────────────────
  patients: Patient[];
  medical_records: MedicalRecord[];
  // ── Encounter Tables ─────────────────────────────────────
  encounters: Encounter[];
  // ── Prescription Tables ───────────────────────────────────
  prescriptions: Prescription[];
  prescription_items: PrescriptionItem[];
  // ── Hospital Billing Tables ───────────────────────────────
  hospital_invoices: HospitalInvoice[];
}

// ═══════════════════════════════════════════════════════════════
// Service
// ═══════════════════════════════════════════════════════════════

export class DatabaseService {
  private static instance: DatabaseService;
  private sales: Map<string, Sale> = new Map();
  private tables: Tables = {
    organizations: [],
    licenses: [],
    users: [],
    user_module_access: [],
    audit_logs: [],
    suppliers: [],
    products: [],
    inventory_items: [],
    inventory_batches: [],
    stock_movements: [],
    purchase_orders: [],
    purchase_order_items: [],
    inventory_alerts: [],
    stock_counts: [],
    stock_count_items: [],
    sales: [],
    patients: [],
    medical_records: [],
    encounters: [],
    prescriptions: [],
    prescription_items: [],
    hospital_invoices: [],
  };

  private constructor() {
    console.log('📦 In-memory database initialized');
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // ── Data Persistence Methods ──────────────────────────────────

  private readonly STORAGE_KEY = 'HK_DATABASE_DATA';
  private readonly PHARMACY_PRESCRIPTIONS_CACHE_KEY = 'HK_PHARMACY_PRESCRIPTIONS_CACHE';
  private readonly PHARMACY_ANALYTICS_CACHE_KEY = 'HK_PHARMACY_ANALYTICS_CACHE';
  private readonly PHARMACY_REPORTS_CACHE_KEY = 'HK_PHARMACY_REPORTS_CACHE';

  async saveDataToPersistentStorage(): Promise<void> {
    try {
      const data = {
        patients: this.tables.patients,
        encounters: this.tables.encounters,
        prescriptions: this.tables.prescriptions,
        products: this.tables.products,
        suppliers: this.tables.suppliers,
        inventory_items: this.tables.inventory_items,
        organizations: this.tables.organizations,
        licenses: this.tables.licenses,
        users: this.tables.users,
        user_module_access: this.tables.user_module_access,
        sales: Array.from(this.sales.values()),
        purchase_orders: this.tables.purchase_orders,
        stock_movements: this.tables.stock_movements,
        timestamp: new Date().toISOString()
      };

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      console.log('💾 Data saved to persistent storage');
    } catch (error) {
      console.error('Failed to save data to storage:', error);
    }
  }

  async loadDataFromPersistentStorage(): Promise<boolean> {
    try {
      const storedData = await AsyncStorage.getItem(this.STORAGE_KEY);
      
      if (storedData) {
        const data = JSON.parse(storedData);
        
        // Load data back into tables
        if (data.patients) this.tables.patients = data.patients;
        if (data.encounters) this.tables.encounters = data.encounters;
        if (data.prescriptions) this.tables.prescriptions = data.prescriptions;
        if (data.products) this.tables.products = data.products;
        if (data.suppliers) this.tables.suppliers = data.suppliers;
        if (data.inventory_items) this.tables.inventory_items = data.inventory_items;
        if (data.organizations) this.tables.organizations = data.organizations;
        if (data.licenses) this.tables.licenses = data.licenses;
        if (data.users) this.tables.users = data.users;
        if (data.user_module_access) this.tables.user_module_access = data.user_module_access;
        if (data.purchase_orders) this.tables.purchase_orders = data.purchase_orders;
        if (data.stock_movements) this.tables.stock_movements = data.stock_movements;
        
        // Restore Maps
        if (data.sales) {
          this.sales.clear();
          data.sales.forEach((sale: Sale) => this.sales.set(sale.id, sale));
        }

        console.log('📂 Data loaded from persistent storage');
        return true;
      }
    } catch (error) {
      console.error('Failed to load data from storage:', error);
    }
    return false;
  }

  async initializeDatabase(): Promise<void> {
    console.log('🔄 Initializing database...');
    
    // Try to load existing data first
    const dataLoaded = await this.loadDataFromPersistentStorage();
    
    if (!dataLoaded) {
      // If no existing data, load seed data including test licenses
      console.log('🌱 Loading test data with licenses...');
      await this.insertTestData();
    } else {
      // Ensure we have licenses and admin user even if old storage didn't include them
      const hasLicenses = this.tables.licenses && this.tables.licenses.length > 0;
      const hasUsers = this.tables.users && this.tables.users.length > 0;
      
      if (!hasLicenses || !hasUsers) {
        console.log(`📄 Missing data — licenses: ${hasLicenses}, users: ${hasUsers}. Re-seeding...`);
        await this.createTestLicenses();
        await this.createTestAdminUser();
      }
    }
    
    // Save data after initialization
    await this.saveDataToPersistentStorage();
  }

  // Create just the test licenses without full test data
  async createTestLicenses(): Promise<void> {
    try {
      // Create test organization if it doesn't exist
      let testOrg = this.tables.organizations.find(org => org.name === 'HK Healthcare Group');
      
      if (!testOrg) {
        testOrg = await this.createOrganization({
          name: 'HK Healthcare Group',
          businessType: 'HEALTHCARE_GROUP',
          address: '123 Avenue de la Santé',
          city: 'Kinshasa',
          country: 'RD Congo',
          phone: '+243 999 123 456',
          email: 'contact@hkhealthcare.cd',
          contactPerson: 'Admin HK',
        });
      }

      // Trial license
      await this.createLicense({
        licenseKey: 'TRIAL-HK2024XY-Z9M3',
        organizationId: testOrg.id,
        moduleType: 'TRIAL',
        licenseTier: 'TRIAL',
        issuedDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        maxUsers: 3,
        features: [
          'pos_system', 'basic_inventory', 'advanced_inventory', 'prescription_management',
          'stock_alerts', 'supplier_management', 'basic_reporting', 'advanced_reporting',
          'customer_management', 'patient_management', 'appointment_scheduling',
          'advanced_scheduling', 'medical_records', 'lab_integration', 'multi_department',
          'basic_billing', 'billing_management', 'staff_management', 'prescription_writing',
          'worker_management', 'medical_examinations', 'fitness_certificates',
          'incident_management', 'basic_incident_reporting', 'occupational_disease_tracking',
          'surveillance_programs', 'audiometry_spirometry', 'drug_screening',
          'ppe_management', 'risk_assessment',
        ],
        billingCycle: 'TRIAL',
      });

      // Pharmacy license
      await this.createLicense({
        licenseKey: 'PHARMACY-PH2024XY-M9N3',
        organizationId: testOrg.id,
        moduleType: 'PHARMACY',
        licenseTier: 'PROFESSIONAL',
        issuedDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        maxUsers: 10,
        features: ['pos_system', 'basic_inventory', 'advanced_inventory', 'prescription_management', 'supplier_management', 'stock_alerts', 'basic_reporting', 'advanced_reporting'],
        billingCycle: 'ANNUAL',
      });

      // Hospital license
      await this.createLicense({
        licenseKey: 'HOSPITAL-HP2024XY-B6C4',
        organizationId: testOrg.id,
        moduleType: 'HOSPITAL',
        licenseTier: 'PROFESSIONAL',
        issuedDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        maxUsers: 20,
        features: ['patient_management', 'appointment_scheduling', 'advanced_scheduling', 'medical_records', 'lab_integration', 'multi_department', 'basic_billing', 'billing_management', 'staff_management', 'basic_reporting', 'advanced_reporting'],
        billingCycle: 'ANNUAL',
      });

      // Occupational Health license
      await this.createLicense({
        licenseKey: 'OCCHEALTH-OH2024XY-P8Q3',
        organizationId: testOrg.id,
        moduleType: 'OCCUPATIONAL_HEALTH',
        licenseTier: 'PROFESSIONAL',
        issuedDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        maxUsers: 15,
        features: ['worker_management', 'medical_examinations', 'fitness_certificates', 'incident_management', 'basic_incident_reporting', 'occupational_disease_tracking', 'surveillance_programs', 'audiometry_spirometry', 'drug_screening', 'ppe_management', 'risk_assessment', 'basic_reporting', 'advanced_reporting'],
        billingCycle: 'ANNUAL',
      });

      // Combined license
      await this.createLicense({
        licenseKey: 'COMBINED-CB2024XY-K7L2',
        organizationId: testOrg.id,
        moduleType: 'COMBINED',
        licenseTier: 'ENTERPRISE',
        issuedDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        maxUsers: 50,
        features: [
          'pos_system', 'basic_inventory', 'advanced_inventory', 'prescription_management',
          'supplier_management', 'stock_alerts', 'patient_management', 'appointment_scheduling',
          'advanced_scheduling', 'medical_records', 'lab_integration', 'multi_department',
          'basic_billing', 'billing_management', 'staff_management', 'prescription_writing',
          'worker_management', 'medical_examinations', 'fitness_certificates', 'incident_management',
          'basic_incident_reporting', 'occupational_disease_tracking', 'surveillance_programs',
          'audiometry_spirometry', 'drug_screening', 'ppe_management', 'risk_assessment',
          'basic_reporting', 'advanced_reporting', 'customer_management',
        ],
        billingCycle: 'ANNUAL',
      });

      console.log('✅ Test licenses created successfully');
    } catch (error) {
      console.error('Error creating test licenses:', error);
    }
  }

  // Create the default admin user if none exists
  async createTestAdminUser(): Promise<void> {
    try {
      const existingAdmin = this.tables.users.find(u => u.phone === 'admin');
      if (existingAdmin) {
        console.log('👤 Admin user already exists');
        return;
      }

      // Find org
      const testOrg = this.tables.organizations.find(org => org.name === 'HK Healthcare Group');
      if (!testOrg) {
        console.error('❌ Cannot create admin user — test organization not found');
        return;
      }

      // Create admin user
      const adminUser = await this.createUser({
        organizationId: testOrg.id,
        phone: 'admin',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'HK',
        primaryRole: 'ADMIN' as any,
      });

      // Give admin access to trial module
      const trialLicense = this.tables.licenses.find(l => l.moduleType === 'TRIAL');
      if (trialLicense) {
        await this.createUserModuleAccess({
          userId: adminUser.id,
          licenseId: trialLicense.id,
          moduleType: 'TRIAL',
          role: 'admin',
          permissions: [
            'manage_users', 'manage_patients', 'manage_inventory',
            'view_reports', 'manage_billing', 'manage_appointments',
            'access_lab_results', 'manage_system_settings',
          ],
          facilityAccess: [],
          grantedAt: new Date().toISOString(),
        });
      }

      console.log('✅ Admin user created successfully (phone: admin, password: admin123)');
    } catch (error) {
      console.error('Error creating admin user:', error);
    }
  }

  private async autoSave(): Promise<void> {
    // Auto-save data after any modification
    await this.saveDataToPersistentStorage();
  }

  private async persistData(): Promise<void> {
    await this.saveDataToPersistentStorage();
  }

  // ── Pharmacy API Cache Methods ─────────────────────────────────

  async savePharmacyPrescriptionsCache(payload: any): Promise<void> {
    await AsyncStorage.setItem(
      this.PHARMACY_PRESCRIPTIONS_CACHE_KEY,
      JSON.stringify({ payload, savedAt: new Date().toISOString() })
    );
  }

  async getPharmacyPrescriptionsCache(): Promise<{ payload: any; savedAt: string } | null> {
    const raw = await AsyncStorage.getItem(this.PHARMACY_PRESCRIPTIONS_CACHE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async savePharmacyAnalyticsCache(payload: any): Promise<void> {
    await AsyncStorage.setItem(
      this.PHARMACY_ANALYTICS_CACHE_KEY,
      JSON.stringify({ payload, savedAt: new Date().toISOString() })
    );
  }

  async getPharmacyAnalyticsCache(): Promise<{ payload: any; savedAt: string } | null> {
    const raw = await AsyncStorage.getItem(this.PHARMACY_ANALYTICS_CACHE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async savePharmacyReportsCache(payload: any): Promise<void> {
    await AsyncStorage.setItem(
      this.PHARMACY_REPORTS_CACHE_KEY,
      JSON.stringify({ payload, savedAt: new Date().toISOString() })
    );
  }

  async getPharmacyReportsCache(): Promise<{ payload: any; savedAt: string } | null> {
    const raw = await AsyncStorage.getItem(this.PHARMACY_REPORTS_CACHE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  // ── Audit Logging Methods ─────────────────────────────────

  private currentUserId?: string;
  private currentUserName?: string;
  private currentUserRole?: string;
  private currentSessionId?: string;
  private currentIpAddress?: string;
  private currentUserAgent?: string;

  private get auditContext() {
    return this.currentUserId ? {
      userId: this.currentUserId,
      userName: this.currentUserName || 'Unknown User',
      userRole: this.currentUserRole as any || 'unknown',
      organizationId: 'unknown',
      ipAddress: this.currentIpAddress,
      userAgent: this.currentUserAgent,
      sessionId: this.currentSessionId
    } : null;
  }

  setAuditContext(userId: string, userName: string, userRole: string, sessionId?: string, ipAddress?: string, userAgent?: string): void {
    this.currentUserId = userId;
    this.currentUserName = userName;
    this.currentUserRole = userRole as any;
    this.currentSessionId = sessionId;
    this.currentIpAddress = ipAddress;
    this.currentUserAgent = userAgent;
  }

  async logAudit(data: Partial<AuditLogCreate> & { action: AuditAction; automated?: boolean; sensitiveData?: boolean; reason?: string; organizationId?: string }): Promise<void> {
    if (!this.currentUserId) {
      console.warn('Audit context not set - skipping audit log');
      return;
    }

    const auditLog: AuditLog = {
      id: this.generateId(),
      userId: this.currentUserId,
      userName: this.currentUserName || 'Unknown User',
      userRole: this.currentUserRole as any || 'unknown',
      organizationId: data.organizationId || 'unknown',
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      entityName: data.entityName,
      oldValues: data.oldValues,
      newValues: data.newValues,
      changes: data.changes,
      ipAddress: data.ipAddress || this.currentIpAddress,
      userAgent: data.userAgent || this.currentUserAgent,
      sessionId: data.sessionId || this.currentSessionId,
      requestPath: data.requestPath,
      requestMethod: data.requestMethod,
      duration: data.duration,
      success: true, // Assuming success since we're logging it
      errorMessage: data.errorMessage,
      reason: data.reason,
      notes: data.notes,
      sensitiveData: data.sensitiveData || false,
      automated: data.automated || false,
      complianceFlags: data.complianceFlags,
      retentionUntil: data.retentionUntil,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    this.tables.audit_logs.push(auditLog);
    
    // Don't auto-save audit logs to prevent infinite recursion
    // They will be saved with the next regular operation
  }

  async getAuditLogs(options?: {
    userId?: string;
    entityType?: AuditEntityType;
    entityId?: string;
    action?: AuditAction;
    startDate?: string;
    endDate?: string;
    sensitiveDataOnly?: boolean;
    limit?: number;
  }): Promise<AuditLog[]> {
    let results = [...this.tables.audit_logs];

    if (options?.userId) {
      results = results.filter(log => log.userId === options.userId);
    }
    if (options?.entityType) {
      results = results.filter(log => log.entityType === options.entityType);
    }
    if (options?.entityId) {
      results = results.filter(log => log.entityId === options.entityId);
    }
    if (options?.action) {
      results = results.filter(log => log.action === options.action);
    }
    if (options?.startDate) {
      results = results.filter(log => log.timestamp >= options.startDate!);
    }
    if (options?.endDate) {
      results = results.filter(log => log.timestamp <= options.endDate!);
    }
    if (options?.sensitiveDataOnly) {
      results = results.filter(log => log.sensitiveData);
    }

    // Sort by newest first
    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  async getEntityAuditHistory(entityType: AuditEntityType, entityId: string): Promise<AuditLog[]> {
    return this.getAuditLogs({ entityType, entityId });
  }

  async getUserActivity(userId: string, limit?: number): Promise<AuditLog[]> {
    return this.getAuditLogs({ userId, limit });
  }

  // ── Authentication Audit Methods ──────────────────────────

  async logUserLogin(userId: string, success: boolean, ipAddress?: string, userAgent?: string, errorMessage?: string): Promise<void> {
    if (success) {
      // Update user login info
      const userIdx = this.tables.users.findIndex(u => u.id === userId);
      if (userIdx !== -1) {
        const user = this.tables.users[userIdx];
        this.tables.users[userIdx] = {
          ...user,
          lastLogin: new Date().toISOString(),
          lastIpAddress: ipAddress,
          lastUserAgent: userAgent,
          loginCount: (user.loginCount || 0) + 1,
          failedLoginAttempts: 0, // Reset failed attempts on success
          lastActivity: new Date().toISOString(),
        };
      }
    } else {
      // Update failed login attempts
      const userIdx = this.tables.users.findIndex(u => u.id === userId);
      if (userIdx !== -1) {
        const user = this.tables.users[userIdx];
        const failedAttempts = (user.failedLoginAttempts || 0) + 1;
        this.tables.users[userIdx] = {
          ...user,
          failedLoginAttempts: failedAttempts,
          // Lock account after 5 failed attempts for 30 minutes
          lockoutUntil: failedAttempts >= 5 ? 
            new Date(Date.now() + 30 * 60 * 1000).toISOString() : 
            user.lockoutUntil,
        };
      }
    }

    // Audit log
    const user = this.tables.users.find(u => u.id === userId);
    await this.logAudit({
      organizationId: user?.organizationId || 'unknown',
      action: success ? 'LOGIN' : 'LOGIN_FAILED',
      ipAddress,
      userAgent,
      errorMessage,
      sensitiveData: false,
      automated: false,
      reason: success ? 'User login successful' : 'User login failed'
    });

    await this.autoSave();
  }

  async logUserLogout(userId: string, ipAddress?: string): Promise<void> {
    // Update user logout info
    const userIdx = this.tables.users.findIndex(u => u.id === userId);
    if (userIdx !== -1) {
      this.tables.users[userIdx] = {
        ...this.tables.users[userIdx],
        lastLogout: new Date().toISOString(),
        sessionId: undefined, // Clear session
      };
    }

    // Audit log
    const user = this.tables.users.find(u => u.id === userId);
    await this.logAudit({
      organizationId: user?.organizationId || 'unknown',
      action: 'LOGOUT',
      ipAddress,
      sensitiveData: false,
      automated: false,
      reason: 'User logout'
    });

    await this.autoSave();
  }

  async updateUserActivity(userId: string): Promise<void> {
    const userIdx = this.tables.users.findIndex(u => u.id === userId);
    if (userIdx !== -1) {
      this.tables.users[userIdx] = {
        ...this.tables.users[userIdx],
        lastActivity: new Date().toISOString(),
      };
    }
  }

  private calculateChanges(oldData: any, newData: any): Array<{ field: string; oldValue: any; newValue: any }> {
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
    
    if (!oldData && newData) {
      // New record - all fields are changes
      Object.keys(newData).forEach(key => {
        if (key !== 'id' && key !== 'createdAt') {
          changes.push({ field: key, oldValue: null, newValue: newData[key] });
        }
      });
    } else if (oldData && newData) {
      // Updated record - compare fields
      const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
      allKeys.forEach(key => {
        if (key !== 'updatedAt' && oldData[key] !== newData[key]) {
          changes.push({ field: key, oldValue: oldData[key], newValue: newData[key] });
        }
      });
    }
    
    return changes;
  }

  // ── Organization ──────────────────────────────────────────

  async createOrganization(data: OrganizationCreate): Promise<Organization> {
    const org: Organization = {
      id: data.id || this.generateId(),
      name: data.name,
      registrationNumber: data.registrationNumber,
      businessType: data.businessType,
      address: data.address,
      city: data.city,
      country: data.country,
      phone: data.phone,
      email: data.email,
      contactPerson: data.contactPerson,
      billingAddress: data.billingAddress,
      taxNumber: data.taxNumber,
      isActive: data.isActive ?? true,
      settings: data.settings,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt,
    };
    this.tables.organizations.push(org);
    return org;
  }

  async getOrganization(id: string): Promise<Organization | null> {
    return this.tables.organizations.find((o) => o.id === id) ?? null;
  }

  async updateOrganization(id: string, data: Partial<OrganizationCreate>): Promise<Organization | null> {
    const index = this.tables.organizations.findIndex((o) => o.id === id);
    if (index === -1) return null;

    const existing = this.tables.organizations[index];
    const updated: Organization = {
      ...existing,
      ...data,
      id: existing.id, // Preserve ID
      updatedAt: new Date().toISOString(),
    };

    this.tables.organizations[index] = updated;
    return updated;
  }

  async getCurrentOrganization(): Promise<Organization | null> {
    // For now, return the first active organization
    // In a real app, this would be based on the logged-in user's context
    return this.tables.organizations.find((o) => o.isActive) ?? null;
  }

  // ── Patients ──────────────────────────────────────────────

  async createPatient(data: PatientCreate): Promise<Patient> {
    const now = new Date().toISOString();
    const patientCount = this.tables.patients.length + 1;
    const patient: Patient = {
      ...data,
      id: (data as any).id || this.generateId(),
      patientNumber: data.patientNumber || `PAT${String(patientCount).padStart(5, '0')}`,
      registrationDate: data.registrationDate || now,
      createdAt: data.createdAt || now,
      createdBy: this.currentUserId,
      accessCount: 0,
    };
    
    this.tables.patients.push(patient);
    
    // Audit log
    await this.logAudit({
      action: 'CREATE',
      entityType: 'PATIENT',
      entityId: patient.id,
      entityName: `${patient.firstName} ${patient.lastName}`,
      newValues: patient,
      changes: this.calculateChanges(null, patient),
      sensitiveData: true,
      automated: false,
      reason: 'New patient registration'
    });
    
    // Auto-save after creating patient
    await this.autoSave();
    
    return patient;
  }

  async getAllPatients(): Promise<Patient[]> {
    return [...this.tables.patients];
  }

  async getPatient(id: string, logAccess: boolean = true): Promise<Patient | null> {
    const patient = this.tables.patients.find(p => p.id === id);
    if (!patient) return null;
    
    if (logAccess && this.currentUserId) {
      // Update access tracking
      const idx = this.tables.patients.findIndex(p => p.id === id);
      if (idx !== -1) {
        this.tables.patients[idx] = {
          ...this.tables.patients[idx],
          lastAccessedBy: this.currentUserId,
          lastAccessedAt: new Date().toISOString(),
          accessCount: (this.tables.patients[idx].accessCount || 0) + 1,
        };
      }
      
      // Audit log for accessing sensitive patient data
      await this.logAudit({
        action: 'VIEW',
        entityType: 'PATIENT',
        entityId: id,
        entityName: `${patient.firstName} ${patient.lastName}`,
        sensitiveData: true,
        automated: false,
        reason: 'Patient record accessed'
      });
      
      await this.autoSave();
    }
    
    return patient;
  }

  async getPatientByNumber(patientNumber: string): Promise<Patient | null> {
    return this.tables.patients.find(p => p.patientNumber === patientNumber) ?? null;
  }

  async updatePatient(id: string, data: PatientUpdate): Promise<Patient | null> {
    const idx = this.tables.patients.findIndex(p => p.id === id);
    if (idx === -1) return null;
    
    const oldPatient = { ...this.tables.patients[idx] };
    const updatedPatient = {
      ...this.tables.patients[idx],
      ...data,
      updatedAt: new Date().toISOString(),
      updatedBy: this.currentUserId,
    };
    
    this.tables.patients[idx] = updatedPatient;
    
    // Audit log
    await this.logAudit({
      action: 'UPDATE',
      entityType: 'PATIENT',
      entityId: id,
      entityName: `${updatedPatient.firstName} ${updatedPatient.lastName}`,
      oldValues: oldPatient,
      newValues: updatedPatient,
      changes: this.calculateChanges(oldPatient, updatedPatient),
      sensitiveData: true,
      automated: false,
      reason: 'Patient information updated'
    });
    
    // Auto-save after updating patient
    await this.autoSave();
    
    return updatedPatient;
  }

  async searchPatients(query: string): Promise<Patient[]> {
    const q = query.toLowerCase().trim();
    if (!q) return [...this.tables.patients];
    return this.tables.patients.filter(p =>
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.patientNumber.toLowerCase().includes(q) ||
      (p.phone && p.phone.includes(q)) ||
      (p.nationalId && p.nationalId.toLowerCase().includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q))
    );
  }

  async getPatientsByOrganization(organizationId: string): Promise<Patient[]> {
    // In the current in-memory setup, all patients belong to the active org
    return [...this.tables.patients];
  }

  async getPatientStats(): Promise<{
    total: number;
    active: number;
    newThisMonth: number;
    byGender: { male: number; female: number; other: number };
  }> {
    const patients = this.tables.patients;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    return {
      total: patients.length,
      active: patients.filter(p => p.status === 'active').length,
      newThisMonth: patients.filter(p => p.createdAt >= startOfMonth).length,
      byGender: {
        male: patients.filter(p => p.gender === 'male').length,
        female: patients.filter(p => p.gender === 'female').length,
        other: patients.filter(p => p.gender === 'other').length,
      },
    };
  }

  // ── Medical Records ───────────────────────────────────────

  async createMedicalRecord(data: Omit<MedicalRecord, 'id' | 'createdAt'> & { id?: string }): Promise<MedicalRecord> {
    const now = new Date().toISOString();
    const record: MedicalRecord = {
      ...data,
      id: data.id || this.generateId(),
      createdAt: now,
    };
    this.tables.medical_records.push(record);
    // Update patient lastVisit
    const patientIdx = this.tables.patients.findIndex(p => p.id === data.patientId);
    if (patientIdx !== -1) {
      this.tables.patients[patientIdx].lastVisit = now;
    }
    return record;
  }

  async getMedicalRecordsByPatient(patientId: string): Promise<MedicalRecord[]> {
    return this.tables.medical_records
      .filter(r => r.patientId === patientId)
      .sort((a, b) => b.visitDate.localeCompare(a.visitDate));
  }

  // ── Encounters ────────────────────────────────────────────

  async createEncounter(data: EncounterCreate): Promise<Encounter> {
    const now = new Date().toISOString();
    const encounter: Encounter = {
      ...data,
      id: (data as any).id || this.generateId(),
      encounterNumber: data.encounterNumber || EncounterUtils.generateEncounterNumber(),
      createdAt: data.createdAt || now,
      updatedAt: now,
      createdBy: this.auditContext?.userId || 'system',
      updatedBy: this.auditContext?.userId || 'system',
      lastAccessedBy: this.auditContext?.userId,
      lastAccessedAt: now,
      accessCount: 1,
    };
    
    this.tables.encounters.push(encounter);
    
    // Update patient lastVisit
    const patientIdx = this.tables.patients.findIndex(p => p.id === data.patientId);
    if (patientIdx !== -1) {
      this.tables.patients[patientIdx].lastVisit = now;
      this.tables.patients[patientIdx].updatedAt = now;
    }

    // Audit logging
    if (this.auditContext) {
      await this.logAudit({
        organizationId: this.auditContext.organizationId,
        action: 'CREATE',
        entityType: 'ENCOUNTER',
        entityId: encounter.id,
        newValues: encounter,
        sensitiveData: true,
        automated: false,
        reason: 'New encounter created'
      });
    }

    return encounter;
  }

  async getEncounter(id: string): Promise<Encounter | null> {
    const encounter = this.tables.encounters.find(e => e.id === id) ?? null;
    
    if (encounter && this.auditContext) {
      // Update access tracking
      const encounterIdx = this.tables.encounters.findIndex(e => e.id === id);
      if (encounterIdx !== -1) {
        this.tables.encounters[encounterIdx] = {
          ...encounter,
          lastAccessedBy: this.auditContext.userId,
          lastAccessedAt: new Date().toISOString(),
          accessCount: (encounter.accessCount || 0) + 1,
        };
      }

      // Audit logging
      await this.logAudit({
        organizationId: this.auditContext.organizationId,
        action: 'VIEW',
        entityType: 'ENCOUNTER',
        entityId: id,
        sensitiveData: true,
        automated: false,
        reason: 'Encounter accessed'
      });
    }
    
    return encounter;
  }

  async getEncountersByPatient(patientId: string): Promise<Encounter[]> {
    return this.tables.encounters
      .filter(e => e.patientId === patientId)
      .sort((a, b) => b.arrivalDate.localeCompare(a.arrivalDate));
  }

  async getEncountersByOrganization(organizationId: string): Promise<Encounter[]> {
    return this.tables.encounters
      .filter(e => e.organizationId === organizationId)
      .sort((a, b) => b.arrivalDate.localeCompare(a.arrivalDate));
  }

  async getActiveEncounters(organizationId: string): Promise<Encounter[]> {
    return this.tables.encounters
      .filter(e => e.organizationId === organizationId && EncounterUtils.isActive(e))
      .sort((a, b) => b.arrivalDate.localeCompare(a.arrivalDate));
  }

  async updateEncounter(id: string, data: EncounterUpdate): Promise<Encounter | null> {
    const idx = this.tables.encounters.findIndex(e => e.id === id);
    if (idx === -1) return null;

    const oldEncounter = this.tables.encounters[idx];
    const updatedEncounter = {
      ...oldEncounter,
      ...data,
      updatedAt: new Date().toISOString(),
      updatedBy: this.auditContext?.userId || 'system',
      lastAccessedBy: this.auditContext?.userId,
      lastAccessedAt: new Date().toISOString(),
      accessCount: (oldEncounter.accessCount || 0) + 1,
    };

    this.tables.encounters[idx] = updatedEncounter;

    // Audit logging
    if (this.auditContext) {
      await this.logAudit({
        organizationId: this.auditContext.organizationId,
        action: 'UPDATE',
        entityType: 'ENCOUNTER',
        entityId: id,
        oldValues: oldEncounter,
        newValues: updatedEncounter,
        changes: this.calculateChanges(oldEncounter, data),
        sensitiveData: true,
        automated: false,
        reason: 'Encounter updated'
      });
    }

    return updatedEncounter;
  }

  async getEncounterStats(organizationId: string): Promise<{
    total: number;
    active: number;
    todayCount: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
  }> {
    const encounters = this.tables.encounters.filter(e => e.organizationId === organizationId);
    const today = new Date().toISOString().split('T')[0];
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let active = 0;
    let todayCount = 0;
    for (const e of encounters) {
      byStatus[e.status] = (byStatus[e.status] || 0) + 1;
      byType[e.type] = (byType[e.type] || 0) + 1;
      if (EncounterUtils.isActive(e)) active++;
      if (e.arrivalDate.startsWith(today)) todayCount++;
    }
    return { total: encounters.length, active, todayCount, byStatus, byType };
  }

  // ── License ───────────────────────────────────────────────

  async createLicense(data: LicenseCreate): Promise<License> {
    const license: License = {
      id: data.id || this.generateId(),
      licenseKey: data.licenseKey,
      organizationId: data.organizationId,
      moduleType: data.moduleType,
      licenseTier: data.licenseTier,
      isActive: data.isActive ?? true,
      issuedDate: data.issuedDate,
      expiryDate: data.expiryDate,
      maxUsers: data.maxUsers,
      maxFacilities: data.maxFacilities,
      features: data.features || [],
      billingCycle: data.billingCycle,
      autoRenew: data.autoRenew ?? false,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt,
      metadata: data.metadata,
    };
    this.tables.licenses.push(license);
    return license;
  }

  async getLicensesByOrganization(organizationId: string): Promise<License[]> {
    return this.tables.licenses
      .filter((l) => l.organizationId === organizationId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getLicenseByKey(licenseKey: string): Promise<License | null> {
    return this.tables.licenses.find((l) => l.licenseKey === licenseKey) ?? null;
  }

  // ── User ──────────────────────────────────────────────────

  async createUser(data: UserCreate): Promise<User> {
    const user: User = {
      id: data.id || this.generateId(),
      organizationId: data.organizationId,
      phone: data.phone,
      firstName: data.firstName,
      lastName: data.lastName,
      primaryRole: data.primaryRole,
      department: data.department,
      employeeId: data.employeeId,
      professionalLicense: data.professionalLicense,
      isActive: data.isActive ?? true,
      lastLogin: data.lastLogin,
      loginCount: 0,
      failedLoginAttempts: 0,
      twoFactorEnabled: false,
      profileCompleteness: 50,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt,
      metadata: data.metadata,
    };
    // Store password hash separately (not on the User model)
    (user as any)._passwordHash = data.password || '';
    this.tables.users.push(user);
    return user;
  }

  async getUserByPhone(phone: string): Promise<User | null> {
    return this.tables.users.find((u) => u.phone === phone) ?? null;
  }

  async getUserModuleAccess(userId: string): Promise<UserModuleAccess[]> {
    return this.tables.user_module_access.filter((uma) => {
      if (uma.userId !== userId || !uma.isActive) return false;

      // Check that the associated license is still active & not expired
      const license = this.tables.licenses.find((l) => l.id === uma.licenseId);
      if (!license || !license.isActive) return false;
      if (license.expiryDate && new Date(license.expiryDate) < new Date()) return false;

      return true;
    });
  }

  async createUserModuleAccess(data: UserModuleAccessCreate): Promise<UserModuleAccess> {
    const access: UserModuleAccess = {
      id: data.id || this.generateId(),
      userId: data.userId,
      licenseId: data.licenseId,
      moduleType: data.moduleType,
      role: data.role,
      permissions: data.permissions || [],
      facilityAccess: data.facilityAccess || [],
      isActive: data.isActive ?? true,
      grantedAt: data.grantedAt,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt,
    };
    this.tables.user_module_access.push(access);
    return access;
  }

  // ── Utilities ─────────────────────────────────────────────

  // ══════════════════════════════════════════════════════════
  //  SUPPLIER
  // ══════════════════════════════════════════════════════════

  async createSupplier(data: SupplierCreate): Promise<Supplier> {
    const supplier: Supplier = {
      ...data,
      id: data.id || this.generateId(),
      currentBalance: data.currentBalance ?? 0,
      rating: data.rating ?? 3,
      leadTimeDays: data.leadTimeDays ?? 7,
      isActive: data.isActive ?? true,
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.tables.suppliers.push(supplier);
    return supplier;
  }

  async getSupplier(id: string): Promise<Supplier | null> {
    return this.tables.suppliers.find((s) => s.id === id) ?? null;
  }

  async getSuppliersByOrganization(organizationId: string): Promise<Supplier[]> {
    return this.tables.suppliers
      .filter((s) => s.organizationId === organizationId && s.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async updateSupplier(id: string, data: SupplierUpdate): Promise<Supplier | null> {
    const idx = this.tables.suppliers.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    this.tables.suppliers[idx] = {
      ...this.tables.suppliers[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return this.tables.suppliers[idx];
  }

  // ══════════════════════════════════════════════════════════
  //  PRODUCT
  // ══════════════════════════════════════════════════════════

  async createProduct(data: ProductCreate): Promise<Product> {
    const product: Product = {
      ...data,
      id: data.id || this.generateId(),
      controlledSubstance: data.controlledSubstance ?? false,
      requiresPrescription: data.requiresPrescription ?? false,
      packSize: data.packSize ?? 1,
      taxRate: data.taxRate ?? 0,
      insuranceReimbursable: data.insuranceReimbursable ?? false,
      reorderLevel: data.reorderLevel ?? 10,
      reorderQuantity: data.reorderQuantity ?? 50,
      minStockLevel: data.minStockLevel ?? 5,
      maxStockLevel: data.maxStockLevel ?? 500,
      safetyStockDays: data.safetyStockDays ?? 7,
      isActive: data.isActive ?? true,
      isDiscontinued: data.isDiscontinued ?? false,
      activeIngredients: data.activeIngredients || [],
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.tables.products.push(product);
    return product;
  }

  async getProduct(id: string): Promise<Product | null> {
    return this.tables.products.find((p) => p.id === id) ?? null;
  }

  async getProductBySku(organizationId: string, sku: string): Promise<Product | null> {
    return this.tables.products.find(
      (p) => p.organizationId === organizationId && p.sku === sku,
    ) ?? null;
  }

  async getProductByBarcode(organizationId: string, barcode: string): Promise<Product | null> {
    return this.tables.products.find(
      (p) => p.organizationId === organizationId && p.barcode === barcode,
    ) ?? null;
  }

  async getProductsByOrganization(organizationId: string, options?: {
    category?: string;
    search?: string;
    activeOnly?: boolean;
  }): Promise<Product[]> {
    let results = this.tables.products.filter(
      (p) => p.organizationId === organizationId,
    );
    if (options?.activeOnly !== false) {
      results = results.filter((p) => p.isActive && !p.isDiscontinued);
    }
    if (options?.category) {
      results = results.filter((p) => p.category === options.category);
    }
    if (options?.search) {
      const q = options.search.toLowerCase();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.genericName?.toLowerCase().includes(q)) ||
          (p.brandName?.toLowerCase().includes(q)) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode?.toLowerCase().includes(q)),
      );
    }
    return results.sort((a, b) => a.name.localeCompare(b.name));
  }

  async updateProduct(id: string, data: ProductUpdate): Promise<Product | null> {
    const idx = this.tables.products.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.tables.products[idx] = {
      ...this.tables.products[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return this.tables.products[idx];
  }

  // ══════════════════════════════════════════════════════════
  //  INVENTORY ITEM
  // ══════════════════════════════════════════════════════════

  async createInventoryItem(data: InventoryItemCreate): Promise<InventoryItem> {
    const item: InventoryItem = {
      ...data,
      id: data.id || this.generateId(),
      quantityOnHand: data.quantityOnHand ?? 0,
      quantityReserved: data.quantityReserved ?? 0,
      quantityAvailable: data.quantityAvailable ?? 0,
      quantityOnOrder: data.quantityOnOrder ?? 0,
      quantityDamaged: data.quantityDamaged ?? 0,
      quantityExpired: data.quantityExpired ?? 0,
      averageCost: data.averageCost ?? 0,
      totalStockValue: data.totalStockValue ?? 0,
      lastPurchasePrice: data.lastPurchasePrice ?? 0,
      averageDailyUsage: data.averageDailyUsage ?? 0,
      daysOfStockRemaining: data.daysOfStockRemaining ?? 0,
      status: data.status ?? 'IN_STOCK',
      isActive: data.isActive ?? true,
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.tables.inventory_items.push(item);
    return item;
  }

  async getInventoryItem(id: string): Promise<InventoryItem | null> {
    return this.tables.inventory_items.find((i) => i.id === id) ?? null;
  }

  async getInventoryByProduct(productId: string, facilityId?: string): Promise<InventoryItem[]> {
    return this.tables.inventory_items.filter((i) => {
      if (i.productId !== productId) return false;
      if (facilityId && i.facilityId !== facilityId) return false;
      return true;
    });
  }

  async getInventoryByFacility(facilityId: string, options?: {
    status?: string;
    lowStockOnly?: boolean;
  }): Promise<InventoryItem[]> {
    let results = this.tables.inventory_items.filter(
      (i) => i.facilityId === facilityId && i.isActive,
    );
    if (options?.status) {
      results = results.filter((i) => i.status === options.status);
    }
    if (options?.lowStockOnly) {
      results = results.filter(
        (i) => i.status === 'LOW_STOCK' || i.status === 'OUT_OF_STOCK',
      );
    }
    return results;
  }

  async updateInventoryItem(id: string, data: InventoryItemUpdate): Promise<InventoryItem | null> {
    const idx = this.tables.inventory_items.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    const item = this.tables.inventory_items[idx];
    this.tables.inventory_items[idx] = {
      ...item,
      ...data,
      // Re-calculate available & value
      quantityAvailable: (data.quantityOnHand ?? item.quantityOnHand) -
                         (data.quantityReserved ?? item.quantityReserved),
      totalStockValue: (data.quantityOnHand ?? item.quantityOnHand) *
                       (data.averageCost ?? item.averageCost),
      updatedAt: new Date().toISOString(),
    };
    return this.tables.inventory_items[idx];
  }

  // ══════════════════════════════════════════════════════════
  //  INVENTORY BATCH
  // ══════════════════════════════════════════════════════════

  async createInventoryBatch(data: InventoryBatchCreate): Promise<InventoryBatch> {
    const batch: InventoryBatch = {
      ...data,
      id: data.id || this.generateId(),
      initialQuantity: data.initialQuantity ?? data.quantity,
      isQuarantined: data.isQuarantined ?? false,
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.tables.inventory_batches.push(batch);
    return batch;
  }

  async getBatchesByInventoryItem(inventoryItemId: string): Promise<InventoryBatch[]> {
    return this.tables.inventory_batches
      .filter((b) => b.inventoryItemId === inventoryItemId)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }

  async getBatchesByProduct(productId: string): Promise<InventoryBatch[]> {
    return this.tables.inventory_batches
      .filter((b) => b.productId === productId && b.status === 'AVAILABLE' && b.quantity > 0)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }

  async getExpiringBatches(organizationId: string, thresholdDays: number = 90): Promise<InventoryBatch[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + thresholdDays);
    const orgProducts = new Set(
      this.tables.products
        .filter((p) => p.organizationId === organizationId)
        .map((p) => p.id),
    );
    return this.tables.inventory_batches.filter(
      (b) =>
        orgProducts.has(b.productId) &&
        b.status === 'AVAILABLE' &&
        new Date(b.expiryDate) <= cutoff,
    );
  }

  async updateInventoryBatch(id: string, data: InventoryBatchUpdate): Promise<InventoryBatch | null> {
    const idx = this.tables.inventory_batches.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    this.tables.inventory_batches[idx] = {
      ...this.tables.inventory_batches[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return this.tables.inventory_batches[idx];
  }

  // ══════════════════════════════════════════════════════════
  //  STOCK MOVEMENT
  // ══════════════════════════════════════════════════════════

  async createStockMovement(data: StockMovementCreate): Promise<StockMovement> {
    const movement: StockMovement = {
      ...data,
      id: data.id || this.generateId(),
      totalCost: data.totalCost ?? data.quantity * data.unitCost,
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.tables.stock_movements.push(movement);
    return movement;
  }

  async getStockMovements(inventoryItemId: string, options?: {
    limit?: number;
    movementType?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<StockMovement[]> {
    let results = this.tables.stock_movements
      .filter((m) => m.inventoryItemId === inventoryItemId)
      .sort((a, b) => new Date(b.movementDate).getTime() - new Date(a.movementDate).getTime());

    if (options?.movementType) {
      results = results.filter((m) => m.movementType === options.movementType);
    }
    if (options?.startDate) {
      results = results.filter((m) => m.movementDate >= options.startDate!);
    }
    if (options?.endDate) {
      results = results.filter((m) => m.movementDate <= options.endDate!);
    }
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }
    return results;
  }

  async getMovementsByOrganization(organizationId: string, options?: {
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<StockMovement[]> {
    let results = this.tables.stock_movements
      .filter((m) => m.organizationId === organizationId)
      .sort((a, b) => new Date(b.movementDate).getTime() - new Date(a.movementDate).getTime());

    if (options?.startDate) {
      results = results.filter((m) => m.movementDate >= options.startDate!);
    }
    if (options?.endDate) {
      results = results.filter((m) => m.movementDate <= options.endDate!);
    }
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }
    return results;
  }

  // ══════════════════════════════════════════════════════════
  //  PURCHASE ORDER
  // ══════════════════════════════════════════════════════════

  async createPurchaseOrder(data: PurchaseOrderCreate): Promise<PurchaseOrder> {
    const po: PurchaseOrder = {
      ...data,
      id: data.id || this.generateId(),
      poNumber: data.poNumber || InventoryUtils.generatePONumber(),
      status: data.status ?? 'DRAFT',
      priority: data.priority ?? 'NORMAL',
      subtotal: data.subtotal ?? 0,
      taxAmount: data.taxAmount ?? 0,
      discountAmount: data.discountAmount ?? 0,
      shippingCost: data.shippingCost ?? 0,
      totalAmount: data.totalAmount ?? 0,
      paymentStatus: data.paymentStatus ?? 'UNPAID',
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.tables.purchase_orders.push(po);
    return po;
  }

  async getPurchaseOrder(id: string): Promise<PurchaseOrder | null> {
    return this.tables.purchase_orders.find((po) => po.id === id) ?? null;
  }

  async getPurchaseOrdersByOrganization(organizationId: string, options?: {
    status?: string;
    supplierId?: string;
  }): Promise<PurchaseOrder[]> {
    let results = this.tables.purchase_orders.filter(
      (po) => po.organizationId === organizationId,
    );
    if (options?.status) {
      results = results.filter((po) => po.status === options.status);
    }
    if (options?.supplierId) {
      results = results.filter((po) => po.supplierId === options.supplierId);
    }
    return results.sort(
      (a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime(),
    );
  }

  async updatePurchaseOrder(id: string, data: PurchaseOrderUpdate): Promise<PurchaseOrder | null> {
    const idx = this.tables.purchase_orders.findIndex((po) => po.id === id);
    if (idx === -1) return null;
    this.tables.purchase_orders[idx] = {
      ...this.tables.purchase_orders[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return this.tables.purchase_orders[idx];
  }

  // ── Purchase Order Items ──────────────────────────────────

  async createPurchaseOrderItem(data: PurchaseOrderItemCreate): Promise<PurchaseOrderItem> {
    const item: PurchaseOrderItem = {
      ...data,
      id: data.id || this.generateId(),
      quantityReceived: data.quantityReceived ?? 0,
      quantityDamaged: data.quantityDamaged ?? 0,
      quantityReturned: data.quantityReturned ?? 0,
      discount: data.discount ?? 0,
      status: data.status ?? 'PENDING',
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.tables.purchase_order_items.push(item);
    return item;
  }

  async getPurchaseOrderItems(purchaseOrderId: string): Promise<PurchaseOrderItem[]> {
    return this.tables.purchase_order_items.filter(
      (i) => i.purchaseOrderId === purchaseOrderId,
    );
  }

  // ══════════════════════════════════════════════════════════
  //  INVENTORY ALERT
  // ══════════════════════════════════════════════════════════

  async createInventoryAlert(data: InventoryAlertCreate): Promise<InventoryAlert> {
    const alert: InventoryAlert = {
      ...data,
      id: data.id || this.generateId(),
      status: data.status ?? 'ACTIVE',
      createdAt: data.createdAt || new Date().toISOString(),
    };
    this.tables.inventory_alerts.push(alert);
    return alert;
  }

  async getActiveAlerts(organizationId: string, options?: {
    severity?: string;
    alertType?: string;
  }): Promise<InventoryAlert[]> {
    let results = this.tables.inventory_alerts.filter(
      (a) => a.organizationId === organizationId && a.status === 'ACTIVE',
    );
    if (options?.severity) {
      results = results.filter((a) => a.severity === options.severity);
    }
    if (options?.alertType) {
      results = results.filter((a) => a.alertType === options.alertType);
    }
    return results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async acknowledgeAlert(id: string, userId: string): Promise<InventoryAlert | null> {
    const idx = this.tables.inventory_alerts.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    this.tables.inventory_alerts[idx] = {
      ...this.tables.inventory_alerts[idx],
      status: 'ACKNOWLEDGED',
      acknowledgedBy: userId,
      acknowledgedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return this.tables.inventory_alerts[idx];
  }

  async resolveAlert(id: string, userId: string, notes?: string): Promise<InventoryAlert | null> {
    const idx = this.tables.inventory_alerts.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    this.tables.inventory_alerts[idx] = {
      ...this.tables.inventory_alerts[idx],
      status: 'RESOLVED',
      resolvedBy: userId,
      resolvedAt: new Date().toISOString(),
      resolutionNotes: notes,
      updatedAt: new Date().toISOString(),
    };
    return this.tables.inventory_alerts[idx];
  }

  // ══════════════════════════════════════════════════════════
  //  INVENTORY AGGREGATE HELPERS
  // ══════════════════════════════════════════════════════════

  /**
   * Get a full inventory dashboard summary for an organisation
   */
  async getInventorySummary(organizationId: string): Promise<{
    totalProducts: number;
    totalStockValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    expiringBatchCount: number;
    activeAlerts: number;
    pendingPurchaseOrders: number;
  }> {
    const products = this.tables.products.filter(
      (p) => p.organizationId === organizationId && p.isActive,
    );
    const productIds = new Set(products.map((p) => p.id));

    const items = this.tables.inventory_items.filter(
      (i) => i.organizationId === organizationId && i.isActive,
    );

    const expiringBatches = this.tables.inventory_batches.filter((b) => {
      if (!productIds.has(b.productId) || b.status !== 'AVAILABLE') return false;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + 90);
      return new Date(b.expiryDate) <= cutoff;
    });

    const alerts = this.tables.inventory_alerts.filter(
      (a) => a.organizationId === organizationId && a.status === 'ACTIVE',
    );

    const pendingPOs = this.tables.purchase_orders.filter(
      (po) =>
        po.organizationId === organizationId &&
        ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ORDERED'].includes(po.status),
    );

    return {
      totalProducts: products.length,
      totalStockValue: items.reduce((sum, i) => sum + i.totalStockValue, 0),
      lowStockCount: items.filter((i) => i.status === 'LOW_STOCK').length,
      outOfStockCount: items.filter((i) => i.status === 'OUT_OF_STOCK').length,
      expiringBatchCount: expiringBatches.length,
      activeAlerts: alerts.length,
      pendingPurchaseOrders: pendingPOs.length,
    };
  }

  // ── Sales CRUD Operations ──────────────────────────────

  async createSale(data: Omit<Sale, 'id' | 'createdAt'> & { id?: string }): Promise<Sale> {
    const sale: Sale = {
      id: data.id || this.generateId(),
      organizationId: data.organizationId,
      facilityId: data.facilityId,
      saleNumber: data.saleNumber,
      receiptNumber: data.receiptNumber,
      type: data.type,
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      prescriptionId: data.prescriptionId,
      items: data.items,
      itemCount: data.itemCount,
      totalQuantity: data.totalQuantity,
      subtotal: data.subtotal,
      discountType: data.discountType,
      discountValue: data.discountValue,
      discountAmount: data.discountAmount,
      taxAmount: data.taxAmount,
      totalAmount: data.totalAmount,
      currency: data.currency,
      payments: data.payments,
      totalPaid: data.totalPaid,
      changeGiven: data.changeGiven,
      paymentStatus: data.paymentStatus,
      status: data.status,
      cashierId: data.cashierId,
      cashierName: data.cashierName,
      notes: data.notes,
      voidReason: data.voidReason,
      voidedBy: data.voidedBy,
      voidedAt: data.voidedAt,
      createdAt: new Date().toISOString(),
      updatedAt: data.updatedAt,
      createdBy: this.currentUserId,
      processedBy: this.currentUserId,
      accessCount: 0,
      receiptPrinted: false,
      printCount: 0,
    };

    this.sales.set(sale.id, sale);
    
    // Audit log
    await this.logAudit({
      action: 'PROCESS_SALE',
      entityType: 'SALE',
      entityId: sale.id,
      entityName: `Sale ${sale.receiptNumber}`,
      newValues: { 
        receiptNumber: sale.receiptNumber,
        totalAmount: sale.totalAmount,
        customerName: sale.customerName,
        itemCount: sale.itemCount
      },
      sensitiveData: false,
      automated: false,
      reason: 'POS sale processed'
    });
    
    // Auto-save after creating sale
    await this.autoSave();
    
    return sale;
  }

  async updateSale(id: string, data: Partial<Omit<Sale, 'id' | 'createdAt'>>): Promise<Sale | null> {
    const existing = this.sales.get(id);
    if (!existing) return null;

    const updated: Sale = {
      ...existing,
      ...data,
      id: existing.id, // Preserve ID
      createdAt: existing.createdAt, // Preserve creation date
    };

    this.sales.set(id, updated);
    
    // Auto-save after updating sale
    await this.autoSave();
    
    return updated;
  }

  // ── Extra Convenience Methods ──────────────────────────────

  async getInventoryItemsByOrganization(organizationId: string): Promise<InventoryItem[]> {
    return this.tables.inventory_items
      .filter((i) => i.organizationId === organizationId && i.isActive)
      .sort((a, b) => b.totalStockValue - a.totalStockValue);
  }

  async getProductsMap(organizationId: string): Promise<Map<string, Product>> {
    const map = new Map<string, Product>();
    this.tables.products
      .filter((p) => p.organizationId === organizationId)
      .forEach((p) => map.set(p.id, p));
    return map;
  }

  async getSuppliersMap(organizationId: string): Promise<Map<string, Supplier>> {
    const map = new Map<string, Supplier>();
    this.tables.suppliers
      .filter((s) => s.organizationId === organizationId)
      .forEach((s) => map.set(s.id, s));
    return map;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const idx = this.tables.products.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    this.tables.products.splice(idx, 1);
    return true;
  }

  async deleteSupplier(id: string): Promise<boolean> {
    const idx = this.tables.suppliers.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    this.tables.suppliers.splice(idx, 1);
    return true;
  }

  // ══════════════════════════════════════════════════════════
  //  SALES / POS
  // ══════════════════════════════════════════════════════════

  /**
   * Process a complete sale: create sale record, deduct stock, log movements.
   */
  async processSale(cart: CartState, payments: SalePayment[], cashierId: string, cashierName: string, organizationId: string, facilityId: string): Promise<Sale> {
    const now = new Date().toISOString();
    const totals = SaleUtils.computeCartTotals(cart);
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    const saleId = this.generateId();

    // Build SaleItems from CartItems
    const saleItems: SaleItem[] = cart.items.map((ci) => ({
      id: this.generateId(),
      saleId,
      productId: ci.productId,
      batchId: ci.batchId,
      inventoryItemId: ci.inventoryItemId,
      productName: ci.product.name,
      productSku: ci.product.sku,
      genericName: ci.product.genericName,
      dosageForm: ci.product.dosageForm,
      strength: ci.product.strength,
      requiresPrescription: ci.product.requiresPrescription,
      quantity: ci.quantity,
      returnedQuantity: 0,
      unitPrice: ci.unitPrice,
      costPrice: ci.product.costPrice,
      discountPercent: ci.discountPercent,
      discountAmount: ci.discountAmount,
      taxRate: ci.product.taxRate,
      taxAmount: ci.taxAmount,
      lineTotal: ci.lineTotal,
      notes: ci.notes,
    }));

    // Stamp payments with saleId
    const stamped: SalePayment[] = payments.map((p) => ({
      ...p,
      id: p.id || this.generateId(),
      saleId,
    }));

    const sale: Sale = {
      id: saleId,
      organizationId,
      facilityId,
      saleNumber: SaleUtils.generateSaleNumber(),
      receiptNumber: SaleUtils.generateReceiptNumber(),
      type: cart.saleType,
      customerId: cart.customerId,
      customerName: cart.customerName,
      customerPhone: cart.customerPhone,
      customerEmail: cart.customerEmail,
      prescriptionId: cart.prescriptionId,
      items: saleItems,
      itemCount: totals.itemCount,
      totalQuantity: totals.totalQuantity,
      subtotal: totals.subtotal,
      discountType: cart.globalDiscountType,
      discountValue: cart.globalDiscountValue,
      discountAmount: totals.totalDiscount,
      taxAmount: totals.taxTotal,
      totalAmount: totals.grandTotal,
      currency: cart.items[0]?.product.currency || 'USD',
      payments: stamped,
      totalPaid,
      changeGiven: Math.max(0, totalPaid - totals.grandTotal),
      paymentStatus: totalPaid >= totals.grandTotal ? 'PAID' : 'PARTIAL',
      status: 'COMPLETED',
      cashierId,
      cashierName,
      accessCount: 0,
      receiptPrinted: false,
      printCount: 0,
      createdAt: now,
      synced: false,
    };

    this.tables.sales.push(sale);
    this.sales.set(sale.id, sale);

    // ── Deduct stock & log movements ───────────────────────
    for (const item of cart.items) {
      const invItem = this.tables.inventory_items.find((i) => {
        if (item.inventoryItemId && (i.id === item.inventoryItemId || i.cloudId === item.inventoryItemId)) {
          return true;
        }
        return i.productId === item.productId
          && (!organizationId || i.organizationId === organizationId)
          && (!facilityId || i.facilityId === facilityId)
          && i.isActive;
      });
      if (!invItem) continue;

      const prevBalance = invItem.quantityOnHand;
      const newBalance = Math.max(0, prevBalance - item.quantity);

      await this.updateInventoryItem(invItem.id, {
        quantityOnHand: newBalance,
        quantityAvailable: Math.max(0, newBalance - invItem.quantityReserved),
        lastMovementDate: now,
      });

      // Deduct from batch (FEFO)
      if (item.batchId) {
        const batchIdx = this.tables.inventory_batches.findIndex((b) => b.id === item.batchId);
        if (batchIdx !== -1) {
          const batch = this.tables.inventory_batches[batchIdx];
          this.tables.inventory_batches[batchIdx] = {
            ...batch,
            quantity: Math.max(0, batch.quantity - item.quantity),
            lastDispensedDate: now,
            updatedAt: now,
          };
        }
      }

      // Stock movement
      await this.createStockMovement({
        organizationId,
        inventoryItemId: invItem.id,
        productId: item.productId,
        batchId: item.batchId,
        movementType: 'SALE',
        direction: 'OUT',
        quantity: item.quantity,
        unitCost: item.product.costPrice,
        totalCost: item.quantity * item.product.costPrice,
        previousBalance: prevBalance,
        newBalance,
        referenceType: 'SALE_INVOICE',
        referenceId: saleId,
        referenceNumber: sale.saleNumber,
        performedBy: cashierId,
        movementDate: now,
        reason: 'POS Sale',
      });
    }

    await this.autoSave();

    return sale;
  }

  async getSale(id: string): Promise<Sale | null> {
    return this.tables.sales.find((s) => s.id === id) ?? null;
  }

  async getSalesByOrganization(organizationId: string, options?: {
    limit?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
  }): Promise<Sale[]> {
    let results = this.tables.sales
      .filter((s) => s.organizationId === organizationId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (options?.status) {
      results = results.filter((s) => s.status === options.status);
    }
    if (options?.startDate) {
      results = results.filter((s) => s.createdAt >= options.startDate!);
    }
    if (options?.endDate) {
      results = results.filter((s) => s.createdAt <= options.endDate!);
    }
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }
    return results;
  }

  async voidSale(saleId: string, userId: string, reason: string): Promise<Sale | null> {
    const idx = this.tables.sales.findIndex((s) => s.id === saleId);
    if (idx === -1) return null;
    const sale = this.tables.sales[idx];
    if (sale.status !== 'COMPLETED') return null;

    // Restore stock
    for (const item of sale.items) {
      if (!item.inventoryItemId) continue;
      const invItem = this.tables.inventory_items.find((i) => i.id === item.inventoryItemId);
      if (!invItem) continue;

      await this.updateInventoryItem(invItem.id, {
        quantityOnHand: invItem.quantityOnHand + item.quantity,
      });

      if (item.batchId) {
        const bi = this.tables.inventory_batches.findIndex((b) => b.id === item.batchId);
        if (bi !== -1) {
          this.tables.inventory_batches[bi].quantity += item.quantity;
        }
      }

      await this.createStockMovement({
        organizationId: sale.organizationId,
        inventoryItemId: item.inventoryItemId!,
        productId: item.productId,
        batchId: item.batchId,
        movementType: 'CUSTOMER_RETURN',
        direction: 'IN',
        quantity: item.quantity,
        unitCost: item.costPrice,
        totalCost: item.quantity * item.costPrice,
        previousBalance: invItem.quantityOnHand,
        newBalance: invItem.quantityOnHand + item.quantity,
        referenceType: 'SALE_INVOICE',
        referenceId: saleId,
        referenceNumber: sale.saleNumber,
        performedBy: userId,
        movementDate: new Date().toISOString(),
        reason: `Vente annulée: ${reason}`,
      });
    }

    this.tables.sales[idx] = {
      ...sale,
      status: 'VOIDED',
      voidReason: reason,
      voidedBy: userId,
      voidedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return this.tables.sales[idx];
  }

  /**
   * Get today's sales summary for dashboard
   */
  async getTodaysSalesSummary(organizationId: string): Promise<{
    totalSales: number;
    totalRevenue: number;
    totalProfit: number;
    totalItems: number;
    avgSaleValue: number;
    paymentBreakdown: Record<string, number>;
  }> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStr = todayStart.toISOString();

    const todaySales = this.tables.sales.filter(
      (s) => s.organizationId === organizationId && s.status === 'COMPLETED' && s.createdAt >= todayStr,
    );

    const totalRevenue = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalProfit = todaySales.reduce((sum, s) => {
      const cost = s.items.reduce((c, i) => c + (i.costPrice * i.quantity), 0);
      return sum + (s.totalAmount - cost);
    }, 0);
    const totalItems = todaySales.reduce((sum, s) => sum + s.totalQuantity, 0);

    const paymentBreakdown: Record<string, number> = {};
    todaySales.forEach((s) => s.payments.forEach((p) => {
      paymentBreakdown[p.method] = (paymentBreakdown[p.method] || 0) + p.amount;
    }));

    return {
      totalSales: todaySales.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      totalItems,
      avgSaleValue: todaySales.length > 0 ? Math.round((totalRevenue / todaySales.length) * 100) / 100 : 0,
      paymentBreakdown,
    };
  }

  // ── Utilities ─────────────────────────────────────────────

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  async close(): Promise<void> {
    // No-op for in-memory
  }

  // ═══════════════════════════════════════════════════════════
  // HOSPITAL BILLING / INVOICES
  // ═══════════════════════════════════════════════════════════

  async createHospitalInvoice(data: Partial<HospitalInvoice>): Promise<HospitalInvoice> {
    const now = new Date().toISOString();
    const year = new Date().getFullYear().toString().slice(-2);
    const seq = (this.tables.hospital_invoices.length + 1).toString().padStart(4, '0');
    const invoice: HospitalInvoice = {
      id: data.id || this.generateId(),
      encounterId: data.encounterId || '',
      patientId: data.patientId || '',
      organizationId: data.organizationId || '',
      facilityId: data.facilityId || 'facility-main',
      invoiceNumber: data.invoiceNumber || `INV${year}${seq}`,
      date: data.date || now.split('T')[0],
      dueDate: data.dueDate,
      status: data.status || 'draft',
      type: data.type || 'outpatient',
      items: data.items || [],
      subtotal: data.subtotal || 0,
      taxAmount: data.taxAmount || 0,
      discountAmount: data.discountAmount || 0,
      totalAmount: data.totalAmount || 0,
      amountPaid: data.amountPaid || 0,
      amountDue: data.amountDue || 0,
      paymentHistory: data.paymentHistory || [],
      insuranceCoveredAmount: data.insuranceCoveredAmount || 0,
      patientResponsibility: data.patientResponsibility || 0,
      currency: data.currency || 'CDF',
      taxRate: data.taxRate || 0,
      primaryDiagnosis: data.primaryDiagnosis,
      notes: data.notes,
      createdAt: now,
      updatedAt: now,
    };
    this.tables.hospital_invoices.push(invoice);
    console.log(`💰 Hospital invoice created: ${invoice.invoiceNumber} for patient ${invoice.patientId}`);
    return invoice;
  }

  async getHospitalInvoice(id: string): Promise<HospitalInvoice | undefined> {
    return this.tables.hospital_invoices.find(inv => inv.id === id);
  }

  async getHospitalInvoiceByEncounter(encounterId: string): Promise<HospitalInvoice | undefined> {
    return this.tables.hospital_invoices.find(inv => inv.encounterId === encounterId);
  }

  async getHospitalInvoicesByPatient(patientId: string): Promise<HospitalInvoice[]> {
    return this.tables.hospital_invoices
      .filter(inv => inv.patientId === patientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getHospitalInvoicesByOrganization(orgId: string): Promise<HospitalInvoice[]> {
    return this.tables.hospital_invoices
      .filter(inv => inv.organizationId === orgId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async updateHospitalInvoice(id: string, updates: Partial<HospitalInvoice>): Promise<HospitalInvoice | undefined> {
    const idx = this.tables.hospital_invoices.findIndex(inv => inv.id === id);
    if (idx < 0) return undefined;
    this.tables.hospital_invoices[idx] = {
      ...this.tables.hospital_invoices[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return this.tables.hospital_invoices[idx];
  }

  async addInvoiceItem(invoiceId: string, item: Omit<InvoiceItem, 'id' | 'invoiceId' | 'createdAt'>): Promise<HospitalInvoice | undefined> {
    const invoice = this.tables.hospital_invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return undefined;
    const newItem: InvoiceItem = {
      ...item,
      id: this.generateId(),
      invoiceId,
      createdAt: new Date().toISOString(),
    };
    invoice.items.push(newItem);
    // Recalculate totals
    invoice.subtotal = invoice.items.reduce((sum, i) => sum + (i.netPrice ?? i.totalPrice ?? 0), 0);
    invoice.taxAmount = invoice.subtotal * (invoice.taxRate / 100);
    invoice.totalAmount = invoice.subtotal + invoice.taxAmount - invoice.discountAmount;
    invoice.amountDue = invoice.totalAmount - invoice.amountPaid;
    invoice.patientResponsibility = invoice.amountDue - invoice.insuranceCoveredAmount;
    invoice.updatedAt = new Date().toISOString();
    return invoice;
  }

  // ── Test Data ─────────────────────────────────────────────

  async insertTestData(): Promise<void> {
    // Prevent duplicate inserts
    if (this.tables.organizations.length > 0) {
      console.log('📊 Test data already exists, skipping');
      return;
    }

    try {
      // Create test organization
      const testOrg = await this.createOrganization({
        name: 'HK Healthcare Group',
        businessType: 'HEALTHCARE_GROUP',
        address: '123 Avenue de la Santé',
        city: 'Kinshasa',
        country: 'RD Congo',
        phone: '+243 999 123 456',
        email: 'contact@hkhealthcare.cd',
        contactPerson: 'Admin HK',
      });

      // Trial license
      await this.createLicense({
        licenseKey: 'TRIAL-HK2024XY-Z9M3',
        organizationId: testOrg.id,
        moduleType: 'TRIAL',
        licenseTier: 'TRIAL',
        issuedDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        maxUsers: 3,
        features: [
          // Pharmacy features
          'pos_system',
          'basic_inventory',
          'advanced_inventory',
          'prescription_management',
          'stock_alerts',
          'supplier_management',
          'basic_reporting',
          'advanced_reporting',
          'customer_management',
          // Hospital features
          'patient_management',
          'appointment_scheduling',
          'advanced_scheduling',
          'medical_records',
          'lab_integration',
          'multi_department',
          'basic_billing',
          'billing_management',
          'staff_management',
          'prescription_writing',
          // Occupational Health features
          'worker_management',
          'medical_examinations',
          'fitness_certificates',
          'incident_management',
          'basic_incident_reporting',
          'occupational_disease_tracking',
          'surveillance_programs',
          'audiometry_spirometry',
          'drug_screening',
          'ppe_management',
          'risk_assessment',
        ],
        billingCycle: 'TRIAL',
      });

      // Pharmacy license
      await this.createLicense({
        licenseKey: 'PHARMACY-PH2024XY-M9N3',
        organizationId: testOrg.id,
        moduleType: 'PHARMACY',
        licenseTier: 'PROFESSIONAL',
        issuedDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        maxUsers: 10,
        features: [
          'pos_system',
          'basic_inventory',
          'advanced_inventory',
          'prescription_management',
          'supplier_management',
          'stock_alerts',
          'basic_reporting',
          'advanced_reporting',
        ],
        billingCycle: 'ANNUAL',
      });

      // Hospital license
      await this.createLicense({
        licenseKey: 'HOSPITAL-HP2024XY-B6C4',
        organizationId: testOrg.id,
        moduleType: 'HOSPITAL',
        licenseTier: 'PROFESSIONAL',
        issuedDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        maxUsers: 20,
        features: [
          'patient_management',
          'appointment_scheduling',
          'advanced_scheduling',
          'medical_records',
          'lab_integration',
          'multi_department',
          'basic_billing',
          'billing_management',
          'staff_management',
          'basic_reporting',
          'advanced_reporting',
        ],
        billingCycle: 'ANNUAL',
      });

      // Occupational Health license
      await this.createLicense({
        licenseKey: 'OCCHEALTH-OH2024XY-P8Q3',
        organizationId: testOrg.id,
        moduleType: 'OCCUPATIONAL_HEALTH',
        licenseTier: 'PROFESSIONAL',
        issuedDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        maxUsers: 15,
        features: [
          'worker_management',
          'medical_examinations',
          'fitness_certificates',
          'incident_management',
          'basic_incident_reporting',
          'occupational_disease_tracking',
          'surveillance_programs',
          'audiometry_spirometry',
          'drug_screening',
          'ppe_management',
          'risk_assessment',
          'basic_reporting',
          'advanced_reporting',
        ],
        billingCycle: 'ANNUAL',
      });

      // Combined license
      await this.createLicense({
        licenseKey: 'COMBINED-CB2024XY-K7L2',
        organizationId: testOrg.id,
        moduleType: 'COMBINED',
        licenseTier: 'ENTERPRISE',
        issuedDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        maxUsers: 50,
        features: [
          // Pharmacy features
          'pos_system',
          'basic_inventory',
          'advanced_inventory',
          'prescription_management',
          'supplier_management',
          'stock_alerts',
          // Hospital features
          'patient_management',
          'appointment_scheduling',
          'advanced_scheduling',
          'medical_records',
          'lab_integration',
          'multi_department',
          'basic_billing',
          'billing_management',
          'staff_management',
          'prescription_writing',
          // Occupational Health features
          'worker_management',
          'medical_examinations',
          'fitness_certificates',
          'incident_management',
          'basic_incident_reporting',
          'occupational_disease_tracking',
          'surveillance_programs',
          'audiometry_spirometry',
          'drug_screening',
          'ppe_management',
          'risk_assessment',
          // Shared
          'basic_reporting',
          'advanced_reporting',
          'customer_management',
        ],
        billingCycle: 'ANNUAL',
      });

      // Create admin user
      const adminUser = await this.createUser({
        organizationId: testOrg.id,
        phone: 'admin',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'HK',
        primaryRole: 'ADMIN' as any,
      });

      // Give admin access to trial module
      await this.createUserModuleAccess({
        userId: adminUser.id,
        licenseId: this.tables.licenses[0].id, // Trial license
        moduleType: 'TRIAL',
        role: 'admin',
        permissions: [
          'manage_users',
          'manage_patients',
          'manage_inventory',
          'view_reports',
          'manage_billing',
          'manage_appointments',
          'access_lab_results',
          'manage_system_settings',
        ],
        facilityAccess: [],
        grantedAt: new Date().toISOString(),
      });

      console.log('✅ Test data inserted successfully');

      // ── INVENTORY TEST DATA ───────────────────────────────
      await this.insertInventoryTestData(testOrg.id);
      
      // ── PATIENTS AND PRESCRIPTIONS TEST DATA ─────────────
      await this.insertPatientTestData(testOrg.id);
      
      // ── COMPREHENSIVE CROSS-MODULE DATA ───────────────────
      await this.loadComprehensiveData();
    } catch (error) {
      console.error('Error inserting test data:', error);
    }
  }

  // ── Comprehensive Cross-Module Data ──────────────────────────

  async loadComprehensiveData(): Promise<void> {
    console.log('📊 Loading comprehensive cross-module data...');
    
    try {
      // Import comprehensive data
      const { 
        COMPREHENSIVE_PATIENTS, 
        COMPREHENSIVE_ENCOUNTERS, 
        COMPREHENSIVE_PRESCRIPTIONS, 
        COMPREHENSIVE_SALES,
        ADDITIONAL_PRODUCTS,
        COMPREHENSIVE_SUPPLIERS,
        COMPREHENSIVE_INVENTORY,
        COMPREHENSIVE_PURCHASE_ORDERS,
        COMPREHENSIVE_STOCK_MOVEMENTS
      } = await import('./seedData/comprehensiveSeedData');
      
      // Get the real organization ID
      const organization = this.tables.organizations[0];
      const realOrgId = organization ? organization.id : 'ORG-001';
      
      // 1. Add comprehensive patients (includes OccHealth workers)
      for (const patient of COMPREHENSIVE_PATIENTS) {
        this.tables.patients.push({ ...patient, organizationId: realOrgId });
      }
      
      // 2. Add pharmacy suppliers — fix organizationId
      for (const supplier of COMPREHENSIVE_SUPPLIERS) {
        this.tables.suppliers.push({ ...supplier, organizationId: realOrgId });
      }
      
      // 3. Add comprehensive products — fix organizationId
      for (const product of ADDITIONAL_PRODUCTS) {
        this.tables.products.push({ ...product, organizationId: realOrgId });
      }
      
      // 4. Add inventory items with realistic stock levels
      // Create inventory items for our products
      if (organization) {
        for (const product of ADDITIONAL_PRODUCTS) {
          const inventoryItem = {
            id: `inv-${product.id.toLowerCase()}`,
            organizationId: organization.id,
            productId: product.id,
            facilityId: 'facility-main-pharmacy',
            facilityType: 'PHARMACY' as const,
            quantityOnHand: Math.floor(Math.random() * 200) + 50, // Random stock 50-250
            quantityReserved: Math.floor(Math.random() * 20),
            quantityAvailable: 0, // Will be calculated
            quantityOnOrder: Math.floor(Math.random() * 100),
            quantityDamaged: Math.floor(Math.random() * 5),
            quantityExpired: 0,
            shelfLocation: `A${Math.floor(Math.random() * 5) + 1}-R${Math.floor(Math.random() * 3) + 1}-S${Math.floor(Math.random() * 4) + 1}`,
            zone: 'General',
            averageCost: product.costPrice,
            totalStockValue: 0, // Will be calculated
            lastPurchasePrice: product.costPrice * (0.9 + Math.random() * 0.2), // ±10% variation
            lastPurchaseDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(), // Within last 30 days
            averageDailyUsage: Math.random() * 5 + 1, // 1-6 units per day
            daysOfStockRemaining: 0, // Will be calculated
            lastMovementDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(), // Within last 7 days
            lastCountDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'IN_STOCK' as const,
            isActive: true,
            createdAt: product.createdAt,
          };
          
          // Calculate derived fields
          inventoryItem.quantityAvailable = inventoryItem.quantityOnHand - inventoryItem.quantityReserved;
          inventoryItem.totalStockValue = inventoryItem.quantityOnHand * inventoryItem.averageCost;
          inventoryItem.daysOfStockRemaining = Math.floor(inventoryItem.quantityAvailable / inventoryItem.averageDailyUsage);
          
          // Determine status based on stock levels
          if (inventoryItem.quantityOnHand <= product.minStockLevel) {
            inventoryItem.status = 'LOW_STOCK';
          } else if (inventoryItem.quantityOnHand === 0) {
            inventoryItem.status = 'OUT_OF_STOCK';
          } else if (inventoryItem.quantityOnHand >= product.maxStockLevel) {
            inventoryItem.status = 'OVER_STOCK';
          }
          
          this.tables.inventory_items.push(inventoryItem);
        }
      }
      
      // 5. Add purchase orders
      // TODO: Fix COMPREHENSIVE_PURCHASE_ORDERS structure to match PurchaseOrder interface
      // for (const po of COMPREHENSIVE_PURCHASE_ORDERS) {
      //   this.tables.purchase_orders.push(po);
      // }
      
      // 6. Add stock movements (audit trail)
      for (const movement of COMPREHENSIVE_STOCK_MOVEMENTS) {
        this.tables.stock_movements.push({ ...movement, organizationId: realOrgId });
      }
      
      // 7. Add realistic encounters
      for (const encounter of COMPREHENSIVE_ENCOUNTERS) {
        this.tables.encounters.push({ ...encounter, organizationId: realOrgId });
      }
      
      // 8. Add prescriptions with proper relationships
      for (const prescription of COMPREHENSIVE_PRESCRIPTIONS) {
        this.tables.prescriptions.push({ ...prescription, organizationId: realOrgId });
      }
      
      // 9. Add sales data linking to prescriptions
      for (const sale of COMPREHENSIVE_SALES) {
        this.tables.sales.push({ ...sale, organizationId: realOrgId });
      }
      
      console.log(`✅ Comprehensive data loaded:`);
      console.log(`   - ${COMPREHENSIVE_PATIENTS.length} cross-module patients`);
      console.log(`   - ${COMPREHENSIVE_SUPPLIERS.length} suppliers`);
      console.log(`   - ${ADDITIONAL_PRODUCTS.length} products`);
      console.log(`   - ${COMPREHENSIVE_INVENTORY.length} inventory items`);
      console.log(`   - ${COMPREHENSIVE_PURCHASE_ORDERS.length} purchase orders`);
      console.log(`   - ${COMPREHENSIVE_STOCK_MOVEMENTS.length} stock movements`);
      console.log(`   - ${COMPREHENSIVE_ENCOUNTERS.length} realistic encounters`);
      console.log(`   - ${COMPREHENSIVE_PRESCRIPTIONS.length} linked prescriptions`);
      console.log(`   - ${COMPREHENSIVE_SALES.length} pharmacy sales`);
      console.log(`   - ${ADDITIONAL_PRODUCTS.length} additional products`);
      
    } catch (error) {
      console.error('❌ Error loading comprehensive data:', error);
    }
  }

  // ── OccHealth Integration Methods ─────────────────────────────

  /**
   * Get patients with occupational health context
   */
  async getOccHealthPatients(): Promise<Patient[]> {
    return this.tables.patients.filter(p => p.employeeId && p.company);
  }

  /**
   * Get patient by employee ID (for OccHealth modules)
   */
  async getPatientByEmployeeId(employeeId: string): Promise<Patient | null> {
    const patient = this.tables.patients.find(p => p.employeeId === employeeId);
    return patient || null;
  }

  /**
   * Get encounters for occupational health (work-related visits)
   */
  async getOccHealthEncounters(): Promise<Encounter[]> {
    return this.tables.encounters.filter(e => 
      e.type === 'outpatient' || // Use valid encounter type
      e.notes?.includes('travail') || 
      e.notes?.includes('professionnel')
    );
  }

  /** Seed realistic pharmacy inventory for testing */
  private async insertInventoryTestData(organizationId: string): Promise<void> {
    const now = new Date().toISOString();

    // ── Suppliers ─────────────────────────────────────────
    const supplier1 = await this.createSupplier({
      organizationId,
      name: 'PharmaCongo SARL',
      code: 'SUP-001',
      contactPerson: 'Jean Mukendi',
      phone: '+243 812 345 678',
      email: 'commandes@pharmacongo.cd',
      address: '45 Avenue Kasa-Vubu',
      city: 'Kinshasa',
      country: 'RD Congo',
      paymentTerms: 'NET_30',
      currency: 'USD',
      rating: 4,
      leadTimeDays: 5,
      currentBalance: 0,
    });

    const supplier2 = await this.createSupplier({
      organizationId,
      name: 'MedSupply International',
      code: 'SUP-002',
      contactPerson: 'Marie Kabongo',
      phone: '+243 998 765 432',
      email: 'orders@medsupply.com',
      address: '12 Boulevard du 30 Juin',
      city: 'Lubumbashi',
      country: 'RD Congo',
      paymentTerms: 'NET_15',
      currency: 'USD',
      rating: 5,
      leadTimeDays: 3,
      currentBalance: 0,
    });

    // ── Products ──────────────────────────────────────────
    const products = [
      await this.createProduct({
        organizationId,
        name: 'Amoxicilline 500mg',
        genericName: 'Amoxicillin',
        brandName: 'Amoxil',
        sku: 'MED-AMX-500',
        barcode: '6001234567890',
        category: 'MEDICATION',
        dosageForm: 'CAPSULE',
        strength: '500mg',
        unitOfMeasure: 'CAPSULE',
        packSize: 20,
        manufacturer: 'GSK',
        countryOfOrigin: 'Belgium',
        indication: 'Infections bactériennes',
        storageConditions: 'ROOM_TEMPERATURE',
        costPrice: 0.15,
        sellingPrice: 0.35,
        currency: 'USD',
        taxRate: 0,
        controlledSubstance: false,
        requiresPrescription: true,
        insuranceReimbursable: true,
        activeIngredients: ['Amoxicillin trihydrate'],
        reorderLevel: 200,
        reorderQuantity: 500,
        minStockLevel: 100,
        maxStockLevel: 2000,
        safetyStockDays: 14,
        primarySupplierId: supplier1.id,
        isActive: true,
        isDiscontinued: false,
      }),
      await this.createProduct({
        organizationId,
        name: 'Paracétamol 500mg',
        genericName: 'Acetaminophen',
        brandName: 'Doliprane',
        sku: 'MED-PCM-500',
        barcode: '6001234567891',
        category: 'OTC',
        dosageForm: 'TABLET',
        strength: '500mg',
        unitOfMeasure: 'TABLET',
        packSize: 16,
        manufacturer: 'Sanofi',
        countryOfOrigin: 'France',
        indication: 'Douleur, fièvre',
        storageConditions: 'ROOM_TEMPERATURE',
        costPrice: 0.05,
        sellingPrice: 0.12,
        currency: 'USD',
        taxRate: 0,
        controlledSubstance: false,
        requiresPrescription: false,
        insuranceReimbursable: true,
        activeIngredients: ['Paracetamol'],
        reorderLevel: 500,
        reorderQuantity: 1000,
        minStockLevel: 200,
        maxStockLevel: 5000,
        safetyStockDays: 14,
        primarySupplierId: supplier1.id,
        isActive: true,
        isDiscontinued: false,
      }),
      await this.createProduct({
        organizationId,
        name: 'Metformine 850mg',
        genericName: 'Metformin',
        brandName: 'Glucophage',
        sku: 'MED-MET-850',
        barcode: '6001234567892',
        category: 'MEDICATION',
        dosageForm: 'TABLET',
        strength: '850mg',
        unitOfMeasure: 'TABLET',
        packSize: 30,
        manufacturer: 'Merck',
        countryOfOrigin: 'Germany',
        indication: 'Diabète type 2',
        storageConditions: 'COOL_DRY_PLACE',
        costPrice: 0.08,
        sellingPrice: 0.20,
        currency: 'USD',
        taxRate: 0,
        controlledSubstance: false,
        requiresPrescription: true,
        insuranceReimbursable: true,
        activeIngredients: ['Metformin hydrochloride'],
        reorderLevel: 150,
        reorderQuantity: 300,
        minStockLevel: 60,
        maxStockLevel: 1500,
        safetyStockDays: 14,
        primarySupplierId: supplier2.id,
        isActive: true,
        isDiscontinued: false,
      }),
      await this.createProduct({
        organizationId,
        name: 'Sérum Physiologique 500ml',
        genericName: 'Sodium Chloride 0.9%',
        sku: 'SUP-NaCl-500',
        barcode: '6001234567893',
        category: 'CONSUMABLE',
        dosageForm: 'INFUSION',
        strength: '0.9%',
        unitOfMeasure: 'BOTTLE',
        packSize: 1,
        manufacturer: 'B.Braun',
        countryOfOrigin: 'Germany',
        indication: 'Perfusion, dilution',
        storageConditions: 'ROOM_TEMPERATURE',
        costPrice: 1.50,
        sellingPrice: 3.00,
        currency: 'USD',
        taxRate: 0,
        controlledSubstance: false,
        requiresPrescription: false,
        insuranceReimbursable: true,
        activeIngredients: ['Sodium chloride'],
        reorderLevel: 50,
        reorderQuantity: 100,
        minStockLevel: 20,
        maxStockLevel: 500,
        safetyStockDays: 7,
        primarySupplierId: supplier2.id,
        isActive: true,
        isDiscontinued: false,
      }),
      await this.createProduct({
        organizationId,
        name: 'Gants Latex (M) x100',
        sku: 'SUP-GLT-M100',
        barcode: '6001234567894',
        category: 'CONSUMABLE',
        dosageForm: 'OTHER',
        unitOfMeasure: 'BOX',
        packSize: 100,
        manufacturer: 'Top Glove',
        countryOfOrigin: 'Malaysia',
        storageConditions: 'ROOM_TEMPERATURE',
        costPrice: 4.50,
        sellingPrice: 8.00,
        currency: 'USD',
        taxRate: 16,
        controlledSubstance: false,
        requiresPrescription: false,
        insuranceReimbursable: false,
        activeIngredients: [],
        reorderLevel: 10,
        reorderQuantity: 50,
        minStockLevel: 5,
        maxStockLevel: 200,
        safetyStockDays: 7,
        primarySupplierId: supplier2.id,
        isActive: true,
        isDiscontinued: false,
      }),
    ];

    // ── Inventory Items (stock at facility) ──────────────
    const facilityId = 'pharmacy-main'; // would be real Pharmacy.id

    for (const product of products) {
      const qty = Math.floor(Math.random() * 400) + 50;
      const item = await this.createInventoryItem({
        organizationId,
        productId: product.id,
        facilityId,
        facilityType: 'PHARMACY',
        quantityOnHand: qty,
        quantityReserved: 0,
        quantityAvailable: qty,
        quantityOnOrder: 0,
        quantityDamaged: 0,
        quantityExpired: 0,
        shelfLocation: `A${Math.ceil(Math.random() * 5)}-R${Math.ceil(Math.random() * 3)}-S${Math.ceil(Math.random() * 6)}`,
        averageCost: product.costPrice,
        totalStockValue: qty * product.costPrice,
        lastPurchasePrice: product.costPrice,
        lastPurchaseDate: now,
        averageDailyUsage: Math.floor(Math.random() * 20) + 2,
        daysOfStockRemaining: 0,
        status: qty <= product.minStockLevel ? 'LOW_STOCK' : 'IN_STOCK',
        isActive: true,
      });

      // Update days remaining
      const usage = item.averageDailyUsage || 1;
      await this.updateInventoryItem(item.id, {
        daysOfStockRemaining: Math.floor(qty / usage),
      });

      // ── Batches per product ─────────────────────────────
      const batchQty1 = Math.floor(qty * 0.6);
      const batchQty2 = qty - batchQty1;

      await this.createInventoryBatch({
        inventoryItemId: item.id,
        productId: product.id,
        batchNumber: `LOT-${product.sku}-A`,
        quantity: batchQty1,
        initialQuantity: batchQty1,
        costPrice: product.costPrice,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        receivedDate: now,
        status: 'AVAILABLE',
        isQuarantined: false,
        supplierId: product.primarySupplierId,
      });

      // Second batch — expiring sooner
      await this.createInventoryBatch({
        inventoryItemId: item.id,
        productId: product.id,
        batchNumber: `LOT-${product.sku}-B`,
        quantity: batchQty2,
        initialQuantity: batchQty2,
        costPrice: product.costPrice * 0.95,
        expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
        receivedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'AVAILABLE',
        isQuarantined: false,
        supplierId: product.primarySupplierId,
      });

      // ── Initial stock movement ──────────────────────────
      await this.createStockMovement({
        organizationId,
        inventoryItemId: item.id,
        productId: product.id,
        movementType: 'INITIAL_STOCK',
        direction: 'IN',
        quantity: qty,
        unitCost: product.costPrice,
        totalCost: qty * product.costPrice,
        previousBalance: 0,
        newBalance: qty,
        performedBy: 'system',
        movementDate: now,
        reason: 'Initial stock setup',
      });
    }

    // ── Low-stock alert for demonstration ────────────────
    const lowStockItems = this.tables.inventory_items.filter(
      (i) => i.status === 'LOW_STOCK',
    );
    for (const item of lowStockItems) {
      const product = this.tables.products.find((p) => p.id === item.productId);
      if (!product) continue;
      await this.createInventoryAlert({
        organizationId,
        productId: product.id,
        inventoryItemId: item.id,
        alertType: 'LOW_STOCK',
        severity: 'HIGH',
        title: `Stock bas: ${product.name}`,
        message: `Le stock de ${product.name} (${item.quantityOnHand} unités) est en dessous du seuil minimum (${product.minStockLevel}).`,
        currentValue: item.quantityOnHand,
        thresholdValue: product.minStockLevel,
        status: 'ACTIVE',
      });
    }

    // ── Expiring soon alert ─────────────────────────────
    const expiringBatches = this.tables.inventory_batches.filter((b) => {
      const daysLeft = Math.floor(
        (new Date(b.expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
      );
      return daysLeft <= 90 && daysLeft > 0 && b.status === 'AVAILABLE';
    });
    for (const batch of expiringBatches) {
      const product = this.tables.products.find((p) => p.id === batch.productId);
      if (!product) continue;
      const daysLeft = Math.floor(
        (new Date(batch.expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
      );
      await this.createInventoryAlert({
        organizationId,
        productId: product.id,
        batchId: batch.id,
        alertType: 'EXPIRING_SOON',
        severity: daysLeft <= 30 ? 'CRITICAL' : 'MEDIUM',
        title: `Expiration proche: ${product.name}`,
        message: `Le lot ${batch.batchNumber} de ${product.name} expire dans ${daysLeft} jours (${batch.quantity} unités).`,
        expiryDate: batch.expiryDate,
        daysUntilExpiry: daysLeft,
        status: 'ACTIVE',
      });
    }

    console.log('✅ Inventory test data inserted —',
      `${products.length} products,`,
      `${this.tables.inventory_items.length} inventory items,`,
      `${this.tables.inventory_batches.length} batches,`,
      `${this.tables.inventory_alerts.length} alerts`);
  }

  /** Seed sample patients and prescriptions for testing */
  private async insertPatientTestData(organizationId: string): Promise<void> {
    const now = new Date().toISOString();

    // Create sample patients
    const patients = await Promise.all([
      this.createPatient({
        firstName: 'Marie',
        lastName: 'Kasongo',
        dateOfBirth: new Date('1985-03-15').toISOString(),
        gender: 'female',
        phone: '+243 812 345 678',
        email: 'marie.kasongo@email.cd',
        address: '123 Avenue de la Paix',
        city: 'Kinshasa',
        country: 'RD Congo',
        emergencyContactName: 'Jean Kasongo',
        emergencyContactPhone: '+243 998 765 432',
        allergies: ['Pénicilline'],
        chronicConditions: ['Hypertension', 'Diabète type 2'],
        currentMedications: [],
        bloodType: 'O+',
        status: 'active',
      }),
      this.createPatient({
        firstName: 'Joseph',
        lastName: 'Mukendi',
        dateOfBirth: new Date('1978-08-22').toISOString(),
        gender: 'male',
        phone: '+243 899 123 456',
        address: '45 Boulevard du 30 Juin',
        city: 'Kinshasa',
        country: 'RD Congo',
        emergencyContactName: 'Marie Mukendi',
        emergencyContactPhone: '+243 812 987 654',
        allergies: ['Aspirine'],
        chronicConditions: ['Asthme'],
        currentMedications: [],
        bloodType: 'A+',
        status: 'active',
      }),
      this.createPatient({
        firstName: 'Grace',
        lastName: 'Tshilanda',
        dateOfBirth: new Date('1995-12-08').toISOString(),
        gender: 'female',
        phone: '+243 970 555 789',
        address: '78 Avenue Mobutu',
        city: 'Kinshasa',
        country: 'RD Congo',
        emergencyContactName: 'Papa Tshilanda',
        emergencyContactPhone: '+243 811 222 333',
        allergies: [],
        chronicConditions: [],
        currentMedications: [],
        bloodType: 'B+',
        status: 'active',
      }),
    ]);

    // Create sample encounters for the patients
    const encNow = new Date().toISOString();
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const encDoctorId = this.tables.users[0]?.id || 'doc-001';

    await Promise.all([
      // Marie — active consultation today
      this.createEncounter({
        patientId: patients[0].id,
        organizationId,
        facilityId: '',
        type: 'outpatient',
        status: 'in_consultation',
        arrivalDate: encNow,
        chiefComplaint: 'Douleurs abdominales depuis 3 jours, nausées',
        assignedDoctorId: encDoctorId,
        priority: 'urgent',
        departmentId: 'dept-001',
      }),
      // Marie — past discharged visit
      this.createEncounter({
        patientId: patients[0].id,
        organizationId,
        facilityId: '',
        type: 'outpatient',
        status: 'discharged',
        arrivalDate: twoWeeksAgo,
        dischargeDate: twoWeeksAgo,
        chiefComplaint: 'Contrôle hypertension et glycémie',
        assignedDoctorId: encDoctorId,
        priority: 'routine',
        departmentId: 'dept-002',
        notes: 'Bilan satisfaisant, continuer traitement actuel.',
      }),
      // Joseph — triaged, waiting
      this.createEncounter({
        patientId: patients[1].id,
        organizationId,
        facilityId: '',
        type: 'outpatient',
        status: 'triaged',
        arrivalDate: encNow,
        chiefComplaint: 'Toux persistante avec crachats, essoufflement',
        assignedDoctorId: encDoctorId,
        priority: 'semi_urgent',
        departmentId: 'dept-003',
      }),
      // Joseph — past emergency visit
      this.createEncounter({
        patientId: patients[1].id,
        organizationId,
        facilityId: '',
        type: 'emergency',
        status: 'discharged',
        arrivalDate: oneWeekAgo,
        dischargeDate: oneWeekAgo,
        chiefComplaint: 'Crise d\'asthme sévère',
        assignedDoctorId: encDoctorId,
        priority: 'emergency',
        departmentId: 'dept-004',
      }),
      // Grace — registered, waiting
      this.createEncounter({
        patientId: patients[2].id,
        organizationId,
        facilityId: '',
        type: 'follow_up',
        status: 'registered',
        arrivalDate: encNow,
        chiefComplaint: 'Suivi post-traitement, résultats laboratoire',
        priority: 'routine',
        departmentId: 'dept-001',
      }),
      // Grace — past follow-up
      this.createEncounter({
        patientId: patients[2].id,
        organizationId,
        facilityId: '',
        type: 'outpatient',
        status: 'discharged',
        arrivalDate: threeDaysAgo,
        dischargeDate: threeDaysAgo,
        chiefComplaint: 'Maux de tête récurrents, fatigue',
        assignedDoctorId: encDoctorId,
        priority: 'routine',
        departmentId: 'dept-001',
        notes: 'Bilan sanguin prescrit. Paracétamol pour 3 jours.',
      }),
    ]);

    // Get some medications for prescriptions
    const amoxicillin = this.tables.products.find(p => p.name.includes('Amoxicilline'));
    const paracetamol = this.tables.products.find(p => p.name.includes('Paracétamol'));
    const metformin = this.tables.products.find(p => p.name.includes('Metformine'));

    if (!amoxicillin || !paracetamol || !metformin) {
      console.warn('⚠️ Some medications not found for prescription creation');
      // Still create sales even without prescriptions
      await this.createSampleSales(organizationId);
      return;
    }

    // Helper to build a PrescriptionItem with all required fields
    const makeItem = (med: typeof amoxicillin, dosage: string, freq: string, dur: string, qty: number, instructions?: string): PrescriptionItem => ({
      id: this.generateId(),
      prescriptionId: '',
      medicationName: med!.name,
      genericName: med!.genericName,
      dosage,
      frequency: freq,
      duration: dur,
      quantity: qty,
      route: 'oral' as const,
      instructions,
      quantityDispensed: 0,
      quantityRemaining: qty,
      status: 'pending' as const,
      isSubstitutionAllowed: true,
      isControlled: false,
      requiresCounseling: false,
      createdAt: now,
    });

    // Create sample prescriptions
    const doctorId = this.tables.users[0]?.id || 'doc-001';
    const prescriptions = await Promise.all([
      this.createPrescription({
        encounterId: 'enc-001',
        patientId: patients[0].id,
        doctorId,
        organizationId,
        facilityId: '',
        date: now,
        status: 'pending',
        items: [
          makeItem(amoxicillin, '500mg', '3 fois par jour', '7 jours', 21, 'Prendre après les repas'),
          makeItem(paracetamol, '500mg', 'Au besoin (max 4/jour)', '5 jours', 20, 'En cas de douleur ou fièvre'),
        ],
        instructions: 'Prendre avec les repas. Boire beaucoup d\'eau.',
        allergiesChecked: true,
        interactionsChecked: true,
      }),
      this.createPrescription({
        encounterId: 'enc-002',
        patientId: patients[1].id,
        doctorId,
        organizationId,
        facilityId: '',
        date: now,
        status: 'partially_dispensed',
        items: [
          makeItem(metformin, '850mg', '2 fois par jour', '30 jours', 60, 'Prendre avec les repas principaux'),
          makeItem(paracetamol, '500mg', 'Au besoin', '7 jours', 14, 'En cas de maux de tête'),
        ],
        instructions: 'Traitement du diabète. Surveillance régulière.',
        allergiesChecked: true,
        interactionsChecked: true,
      }),
      this.createPrescription({
        encounterId: 'enc-003',
        patientId: patients[2].id,
        doctorId,
        organizationId,
        facilityId: '',
        date: now,
        status: 'pending',
        items: [
          makeItem(paracetamol, '500mg', '2 fois par jour', '3 jours', 6, 'Prendre le matin et le soir'),
        ],
        instructions: 'Traitement préventif. Contrôle dans 15 jours.',
        allergiesChecked: true,
        interactionsChecked: false,
      }),
    ]);

    // Create sample sales for testing reports
    await this.createSampleSales(organizationId);

    console.log('✅ Patient test data inserted —',
      `${patients.length} patients,`,
      `${prescriptions.length} prescriptions,`,
      `${this.tables.prescription_items.length} prescription items,`,
      `${this.tables.sales.length} sales`);
  }

  /** Create sample sales for testing reports */
  private async createSampleSales(organizationId: string): Promise<void> {
    const products = this.tables.products.filter(p => p.organizationId === organizationId);
    if (products.length === 0) return;

    const inventoryItems = this.tables.inventory_items.filter(i => i.organizationId === organizationId);
    if (inventoryItems.length === 0) return;

    // Helper function to create a sale
    const createSampleSale = async (
      daysAgo: number,
      items: Array<{ productId: string; quantity: number }>,
      paymentMethods: Array<{ method: PaymentMethod; percentage: number }>
    ) => {
      const saleDate = new Date();
      saleDate.setDate(saleDate.getDate() - daysAgo);

      const cartItems: CartItem[] = items.map(item => {
        const product = products.find(p => p.id === item.productId)!;
        const inventoryItem = inventoryItems.find(i => i.productId === product.id)!;
        
        return {
          productId: product.id,
          product: {
            name: product.name,
            sku: product.sku || '',
            genericName: product.genericName,
            dosageForm: product.dosageForm,
            strength: product.strength,
            category: product.category,
            sellingPrice: product.sellingPrice,
            costPrice: product.costPrice,
            taxRate: product.taxRate,
            currency: product.currency,
            barcode: product.barcode,
            requiresPrescription: product.requiresPrescription,
          },
          quantity: item.quantity,
          unitPrice: product.sellingPrice,
          discountPercent: 0,
          discountAmount: 0,
          taxAmount: item.quantity * product.sellingPrice * (product.taxRate / 100),
          lineTotal: item.quantity * product.sellingPrice,
          inventoryItemId: inventoryItem.id,
          batchId: undefined,
          maxQuantity: inventoryItem.quantityAvailable,
        };
      });

      const subtotal = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
      const totalTax = cartItems.reduce((sum, item) => sum + item.taxAmount, 0);
      const totalAmount = subtotal + totalTax;

      const payments: SalePayment[] = paymentMethods.map(pm => ({
        id: this.generateId(),
        saleId: '',
        method: pm.method,
        amount: totalAmount * (pm.percentage / 100),
        reference: `PAY-${this.generateId().slice(-6)}`,
        receivedAt: saleDate.toISOString(),
      }));

      const cart: CartState = {
        items: cartItems,
        saleType: 'WALK_IN' as any,
        globalDiscountType: 'NONE',
        globalDiscountValue: 0,
      };

      // Process the sale with the specific date
      const sale = await this.processSale(
        cart,
        payments,
        'admin',
        'Admin HK',
        organizationId,
        '',
      );

      // Manually update the created date for testing
      const saleIndex = this.tables.sales.findIndex(s => s.id === sale.id);
      if (saleIndex !== -1) {
        this.tables.sales[saleIndex].createdAt = saleDate.toISOString();
      }
    };

    // Create sales for the last 30 days
    const paracetamol = products.find(p => p.name.includes('Paracétamol'));
    const amoxicillin = products.find(p => p.name.includes('Amoxicilline'));
    const metformin = products.find(p => p.name.includes('Metformine'));
    const serum = products.find(p => p.name.includes('Sérum'));
    const gloves = products.find(p => p.name.includes('Gants'));

    if (!paracetamol || !amoxicillin || !metformin) return;

    // Recent sales (last week) - higher volume
    for (let day = 0; day < 7; day++) {
      // Morning sale - multiple items
      await createSampleSale(day, [
        { productId: paracetamol.id, quantity: Math.floor(Math.random() * 5) + 1 },
        { productId: amoxicillin.id, quantity: Math.floor(Math.random() * 3) + 1 },
      ], [{ method: 'CASH', percentage: 100 }]);

      // Afternoon sale - prescription
      await createSampleSale(day, [
        { productId: metformin.id, quantity: Math.floor(Math.random() * 2) + 1 },
      ], [{ method: 'PRESCRIPTION', percentage: 100 }]);

      // Evening sale - mixed payment
      if (Math.random() > 0.3) {
        await createSampleSale(day, [
          { productId: paracetamol.id, quantity: Math.floor(Math.random() * 3) + 2 },
          ...(serum ? [{ productId: serum.id, quantity: 1 }] : []),
        ], [
          { method: 'CASH', percentage: 60 },
          { method: 'MOBILE_MONEY', percentage: 40 },
        ]);
      }
    }

    // Older sales (2-4 weeks ago) - medium volume
    for (let day = 7; day < 28; day += 2) {
      await createSampleSale(day, [
        { productId: paracetamol.id, quantity: Math.floor(Math.random() * 3) + 1 },
      ], [{ method: 'CASH', percentage: 100 }]);

      if (Math.random() > 0.5) {
        await createSampleSale(day, [
          { productId: amoxicillin.id, quantity: Math.floor(Math.random() * 2) + 1 },
        ], [{ method: 'CARD', percentage: 100 }]);
      }
    }

    // Older sales (1-3 months ago) - lower volume
    for (let day = 28; day < 90; day += 5) {
      if (Math.random() > 0.4) {
        await createSampleSale(day, [
          { productId: products[Math.floor(Math.random() * Math.min(products.length, 5))].id, quantity: 1 },
        ], [{ method: 'CASH', percentage: 100 }]);
      }
    }

    console.log('✅ Sample sales created for testing reports');
  }

  // ══════════════════════════════════════════════════════════
  //  PRESCRIPTIONS
  // ══════════════════════════════════════════════════════════

  async createPrescription(data: PrescriptionCreate): Promise<Prescription> {
    const now = new Date().toISOString();
    const prescription = PrescriptionUtils.createPrescription({
      ...data,
      id: data.id || this.generateId(),
      createdAt: data.createdAt || now,
      createdBy: this.auditContext?.userId || 'system',
      updatedBy: this.auditContext?.userId || 'system',
    });

    this.tables.prescriptions.push(prescription);

    // Create prescription items
    for (const itemData of data.items) {
      const item: PrescriptionItem = {
        ...itemData,
        id: itemData.id || this.generateId(),
        prescriptionId: prescription.id,
        quantityDispensed: 0,
        quantityRemaining: itemData.quantity,
        status: 'pending',
        createdAt: now,
        createdBy: this.auditContext?.userId || 'system',
        updatedBy: this.auditContext?.userId || 'system',
      };
      this.tables.prescription_items.push(item);
    }

    // Audit logging
    if (this.auditContext) {
      await this.logAudit({
        organizationId: this.auditContext.organizationId,
        action: 'CREATE',
        entityType: 'PRESCRIPTION',
        entityId: prescription.id,
        newValues: { prescription, items: data.items },
        sensitiveData: true,
        automated: false,
        reason: 'New prescription created'
      });
    }

    return prescription;
  }

  async getPrescription(id: string): Promise<Prescription | null> {
    const prescription = this.tables.prescriptions.find(p => p.id === id);
    if (!prescription) return null;

    const items = this.tables.prescription_items.filter(i => i.prescriptionId === id);
    return { ...prescription, items };
  }

  async getPrescriptionsByOrganization(organizationId: string, options?: {
    status?: PrescriptionStatus;
    patientId?: string;
    doctorId?: string;
    facilityId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<Prescription[]> {
    let results = this.tables.prescriptions.filter(p => p.organizationId === organizationId);

    if (options?.status) {
      results = results.filter(p => p.status === options.status);
    }
    if (options?.patientId) {
      results = results.filter(p => p.patientId === options.patientId);
    }
    if (options?.doctorId) {
      results = results.filter(p => p.doctorId === options.doctorId);
    }
    if (options?.facilityId) {
      results = results.filter(p => p.facilityId === options.facilityId);
    }
    if (options?.startDate) {
      results = results.filter(p => p.date >= options.startDate!);
    }
    if (options?.endDate) {
      results = results.filter(p => p.date <= options.endDate!);
    }

    // Sort by date (newest first)
    results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    // Enrich with items
    return Promise.all(results.map(async p => {
      const items = this.tables.prescription_items.filter(i => i.prescriptionId === p.id);
      return { ...p, items };
    }));
  }

  async updatePrescription(id: string, data: PrescriptionUpdate): Promise<Prescription | null> {
    const idx = this.tables.prescriptions.findIndex(p => p.id === id);
    if (idx === -1) return null;

    this.tables.prescriptions[idx] = {
      ...this.tables.prescriptions[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    // Recalculate status based on items
    const prescription = await this.getPrescription(id);
    if (!prescription) return null;

    const recalculated = PrescriptionUtils.recalculateStatus(prescription);
    this.tables.prescriptions[idx] = recalculated;

    return recalculated;
  }

  async deletePrescription(id: string): Promise<boolean> {
    const idx = this.tables.prescriptions.findIndex(p => p.id === id);
    if (idx === -1) return false;

    // Delete prescription items
    this.tables.prescription_items = this.tables.prescription_items.filter(i => i.prescriptionId !== id);
    
    // Delete prescription
    this.tables.prescriptions.splice(idx, 1);
    return true;
  }

  async updatePrescriptionItem(itemId: string, data: PrescriptionItemUpdate): Promise<PrescriptionItem | null> {
    const idx = this.tables.prescription_items.findIndex(i => i.id === itemId);
    if (idx === -1) return null;

    const item = this.tables.prescription_items[idx];
    const updatedItem = {
      ...item,
      ...data,
      quantityRemaining: (data.quantity ?? item.quantity) - (data.quantityDispensed ?? item.quantityDispensed),
      updatedAt: new Date().toISOString(),
    };

    // Update status based on dispensed quantity
    if (updatedItem.quantityDispensed >= updatedItem.quantity) {
      updatedItem.status = 'fully_dispensed';
    } else if (updatedItem.quantityDispensed > 0) {
      updatedItem.status = 'partially_dispensed';
    } else {
      updatedItem.status = 'pending';
    }

    this.tables.prescription_items[idx] = updatedItem;

    // Update prescription status
    await this.updatePrescription(item.prescriptionId, {});

    return updatedItem;
  }

  /**
   * Dispense medication for a prescription item (pharmacy workflow)
   */
  async dispensePrescriptionItem(itemId: string, data: {
    productId: string;
    quantityToDispense: number;
    batchIds?: string[];
    pharmacistId: string;
    notes?: string;
    counselingNotes?: string;
    substituted?: boolean;
  }): Promise<{ prescriptionItem: PrescriptionItem; sale: Sale | null }> {
    const item = this.tables.prescription_items.find(i => i.id === itemId);
    if (!item) throw new Error('Prescription item not found');

    const product = await this.getProduct(data.productId);
    if (!product) throw new Error('Product not found');

    const inventoryItem = this.tables.inventory_items.find(i => i.productId === data.productId);
    if (!inventoryItem) throw new Error('Product not in inventory');

    const prescription = await this.getPrescription(item.prescriptionId);
    if (!prescription) throw new Error('Prescription not found');

    // Check stock availability
    if (inventoryItem.quantityAvailable < data.quantityToDispense) {
      throw new Error('Insufficient stock available');
    }

    // Update prescription item
    const newQuantityDispensed = item.quantityDispensed + data.quantityToDispense;
    const updatedItem = await this.updatePrescriptionItem(itemId, {
      productId: data.productId,
      quantityDispensed: newQuantityDispensed,
      batchesUsed: data.batchIds,
      unitPrice: product.sellingPrice,
      totalPrice: (item.totalPrice || 0) + (data.quantityToDispense * product.sellingPrice),
      dispensedBy: data.pharmacistId,
      dispensedDate: new Date().toISOString(),
      pharmacistNotes: data.notes,
      patientCounseling: data.counselingNotes,
      status: data.substituted ? 'substituted' : undefined,
    });

    if (!updatedItem) throw new Error('Failed to update prescription item');

    // Create sale for dispensed medication
    const cart = SaleUtils.createEmptyCart();
    cart.items = [{
      productId: data.productId,
      product: {
        name: product.name,
        sku: product.sku,
        genericName: product.genericName,
        strength: product.strength,
        dosageForm: product.dosageForm,
        category: product.category,
        requiresPrescription: product.requiresPrescription,
        sellingPrice: product.sellingPrice,
        costPrice: product.costPrice,
        taxRate: product.taxRate,
        currency: product.currency,
        barcode: product.barcode,
        imageUrl: product.imageUrl,
      },
      quantity: data.quantityToDispense,
      unitPrice: product.sellingPrice,
      discountPercent: 0,
      discountAmount: 0,
      taxAmount: data.quantityToDispense * product.sellingPrice * (product.taxRate / 100),
      lineTotal: data.quantityToDispense * product.sellingPrice,
      inventoryItemId: inventoryItem.id,
      batchId: data.batchIds?.[0],
      maxQuantity: inventoryItem.quantityAvailable,
    }];

    // Process sale
    const payments: SalePayment[] = [{
      id: this.generateId(),
      saleId: '',
      method: 'PRESCRIPTION' as PaymentMethod,
      amount: data.quantityToDispense * product.sellingPrice,
      reference: `RX-${prescription.prescriptionNumber}`,
      receivedAt: new Date().toISOString(),
    }];

    const sale = await this.processSale(
      cart, 
      payments,
      data.pharmacistId, 
      'Pharmacist',
      prescription.organizationId, 
      prescription.facilityId,
    );

    // Audit logging for medication dispensing
    if (this.auditContext) {
      await this.logAudit({
        organizationId: this.auditContext.organizationId,
        action: 'DISPENSE_MEDICATION',
        entityType: 'PRESCRIPTION',
        entityId: itemId,
        oldValues: item,
        newValues: updatedItem,
        sensitiveData: true,
        automated: false,
        reason: `Dispensed ${data.quantityToDispense} units of ${product.name}`,
      });
    }

    return { prescriptionItem: updatedItem, sale };
  }

  /**
   * Get prescription statistics for pharmacy dashboard
   */
  async getPrescriptionStats(organizationId: string, facilityId?: string): Promise<any> {
    let prescriptions = this.tables.prescriptions.filter(p => p.organizationId === organizationId);
    
    if (facilityId) {
      prescriptions = prescriptions.filter(p => p.facilityId === facilityId);
    }

    const stats = {
      total: prescriptions.length,
      byStatus: {
        pending: 0,
        partially_dispensed: 0,
        fully_dispensed: 0,
        cancelled: 0,
        expired: 0,
      },
      pendingItems: 0,
      averageItemsPerPrescription: 0,
      totalValue: 0,
    };

    let totalItems = 0;
    let totalValue = 0;

    for (const prescription of prescriptions) {
      stats.byStatus[prescription.status]++;
      
      const items = this.tables.prescription_items.filter(i => i.prescriptionId === prescription.id);
      totalItems += items.length;
      
      const pendingItems = items.filter(i => !['fully_dispensed', 'cancelled'].includes(i.status));
      stats.pendingItems += pendingItems.length;
      
      totalValue += items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    }

    stats.averageItemsPerPrescription = prescriptions.length > 0 ? totalItems / prescriptions.length : 0;
    stats.totalValue = totalValue;

    return stats;
  }

  // Helper methods for testing and simple access
  async getAllEncounters(): Promise<Encounter[]> {
    return this.tables.encounters;
  }

  async getAllPrescriptions(): Promise<Prescription[]> {
    return this.tables.prescriptions;
  }

  async getAllSales(): Promise<Sale[]> {
    return Array.from(this.sales.values());
  }

  // ═══════════════════════════════════════════════════════════════
  // COMPREHENSIVE CRUD OPERATIONS - Delete Methods
  // ═══════════════════════════════════════════════════════════════

  // ── Patient Delete Operations ─────────────────────────────────

  async deletePatient(id: string): Promise<boolean> {
    const idx = this.tables.patients.findIndex(p => p.id === id);
    if (idx === -1) return false;
    
    // Also remove related data
    this.tables.medical_records = this.tables.medical_records.filter(mr => mr.patientId !== id);
    this.tables.encounters = this.tables.encounters.filter(e => e.patientId !== id);
    this.tables.prescriptions = this.tables.prescriptions.filter(p => p.patientId !== id);
    
    this.tables.patients.splice(idx, 1);
    return true;
  }

  // ── Encounter Delete Operations ───────────────────────────────

  async deleteEncounter(id: string): Promise<boolean> {
    const idx = this.tables.encounters.findIndex(e => e.id === id);
    if (idx === -1) return false;
    
    // Also remove related prescriptions
    this.tables.prescriptions = this.tables.prescriptions.filter(p => p.encounterId !== id);
    
    this.tables.encounters.splice(idx, 1);
    return true;
  }

  // ── Medical Record Delete Operations ───────────────────────────

  async deleteMedicalRecord(id: string): Promise<boolean> {
    const idx = this.tables.medical_records.findIndex(mr => mr.id === id);
    if (idx === -1) return false;
    this.tables.medical_records.splice(idx, 1);
    return true;
  }

  // ── Inventory Delete Operations ────────────────────────────────

  async deleteInventoryItem(id: string): Promise<boolean> {
    const idx = this.tables.inventory_items.findIndex(ii => ii.id === id);
    if (idx === -1) return false;
    
    // Also remove related data
    this.tables.inventory_batches = this.tables.inventory_batches.filter(ib => ib.productId !== id);
    this.tables.stock_movements = this.tables.stock_movements.filter(sm => sm.productId !== id);
    
    this.tables.inventory_items.splice(idx, 1);
    return true;
  }

  async deletePurchaseOrder(id: string): Promise<boolean> {
    const idx = this.tables.purchase_orders.findIndex(po => po.id === id);
    if (idx === -1) return false;
    
    // Also remove related items
    this.tables.purchase_order_items = this.tables.purchase_order_items.filter(poi => poi.purchaseOrderId !== id);
    
    this.tables.purchase_orders.splice(idx, 1);
    return true;
  }

  async deleteStockMovement(id: string): Promise<boolean> {
    const idx = this.tables.stock_movements.findIndex(sm => sm.id === id);
    if (idx === -1) return false;
    this.tables.stock_movements.splice(idx, 1);
    return true;
  }

  // ── Sales Delete Operations ────────────────────────────────────

  async deleteSale(id: string): Promise<boolean> {
    return this.sales.delete(id);
  }

  // ── Organization Delete Operations ──────────────────────────────

  async deleteOrganization(id: string): Promise<boolean> {
    const idx = this.tables.organizations.findIndex(o => o.id === id);
    if (idx === -1) return false;
    
    // Remove related data
    this.tables.licenses = this.tables.licenses.filter(l => l.organizationId !== id);
    this.tables.users = this.tables.users.filter(u => u.organizationId !== id);
    
    this.tables.organizations.splice(idx, 1);
    return true;
  }

  // ── License Delete Operations ───────────────────────────────────

  async deleteLicense(id: string): Promise<boolean> {
    const idx = this.tables.licenses.findIndex(l => l.id === id);
    if (idx === -1) return false;
    
    // Remove related access records
    this.tables.user_module_access = this.tables.user_module_access.filter(uma => uma.licenseId !== id);
    
    this.tables.licenses.splice(idx, 1);
    return true;
  }

  // ── User Delete Operations ──────────────────────────────────────

  async deleteUser(id: string): Promise<boolean> {
    const idx = this.tables.users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    
    // Remove related access records
    this.tables.user_module_access = this.tables.user_module_access.filter(uma => uma.userId !== id);
    
    this.tables.users.splice(idx, 1);
    return true;
  }

  // ═══════════════════════════════════════════════════════════════
  // BATCH OPERATIONS & UTILITIES
  // ═══════════════════════════════════════════════════════════════

  // ── Bulk Create Operations ─────────────────────────────────────

  async createPatientsBatch(patients: PatientCreate[]): Promise<Patient[]> {
    const results: Patient[] = [];
    for (const patientData of patients) {
      const patient = await this.createPatient(patientData);
      results.push(patient);
    }
    return results;
  }

  async createProductsBatch(products: ProductCreate[]): Promise<Product[]> {
    const results: Product[] = [];
    for (const productData of products) {
      const product = await this.createProduct(productData);
      results.push(product);
    }
    return results;
  }

  async createSuppliersBatch(suppliers: SupplierCreate[]): Promise<Supplier[]> {
    const results: Supplier[] = [];
    for (const supplierData of suppliers) {
      const supplier = await this.createSupplier(supplierData);
      results.push(supplier);
    }
    return results;
  }

  // ── Search & Filter Operations ─────────────────────────────────

  async searchAllEntities(query: string): Promise<{
    patients: Patient[];
    encounters: Encounter[];
    prescriptions: Prescription[];
    products: Product[];
    suppliers: Supplier[];
  }> {
    const q = query.toLowerCase().trim();
    
    return {
      patients: await this.searchPatients(q),
      encounters: this.tables.encounters.filter(e => 
        e.chiefComplaint?.toLowerCase().includes(q) ||
        e.assessment?.toLowerCase().includes(q)
      ),
      prescriptions: this.tables.prescriptions.filter(p =>
        p.prescriptionNumber?.toLowerCase().includes(q)
      ),
      products: this.tables.products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.genericName?.toLowerCase().includes(q) ||
        p.manufacturer?.toLowerCase().includes(q)
      ),
      suppliers: this.tables.suppliers.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.contactPerson?.toLowerCase().includes(q)
      )
    };
  }

  // ── Data Export Operations ─────────────────────────────────────

  async exportAllData(): Promise<{
    patients: Patient[];
    encounters: Encounter[];
    prescriptions: Prescription[];
    sales: Sale[];
    products: Product[];
    suppliers: Supplier[];
    inventory: InventoryItem[];
    organizations: Organization[];
    exportDate: string;
  }> {
    return {
      patients: [...this.tables.patients],
      encounters: [...this.tables.encounters],
      prescriptions: [...this.tables.prescriptions],
      sales: Array.from(this.sales.values()),
      products: [...this.tables.products],
      suppliers: [...this.tables.suppliers],
      inventory: [...this.tables.inventory_items],
      organizations: [...this.tables.organizations],
      exportDate: new Date().toISOString()
    };
  }

  // ── Database Maintenance Operations ────────────────────────────

  async clearAllData(): Promise<void> {
    // Clear all tables
    Object.keys(this.tables).forEach(key => {
      (this.tables as any)[key] = [];
    });
    
    // Clear Maps
    this.sales.clear();
    this.tables.prescriptions = [];
    this.tables.encounters = [];
    this.tables.patients = [];
    
    console.log('🗑️ All database tables cleared');
  }

  async getDataStats(): Promise<{
    patients: number;
    encounters: number;
    prescriptions: number;
    sales: number;
    products: number;
    suppliers: number;
    inventory: number;
    organizations: number;
  }> {
    return {
      patients: this.tables.patients.length,
      encounters: this.tables.encounters.length,
      prescriptions: this.tables.prescriptions.length,
      sales: this.sales.size,
      products: this.tables.products.length,
      suppliers: this.tables.suppliers.length,
      inventory: this.tables.inventory_items.length,
      organizations: this.tables.organizations.length
    };
  }

  // ── Audit Reporting Utilities ──────────────────────────

  async getComplianceReport(organizationId: string, startDate?: string, endDate?: string): Promise<{
    auditLogs: AuditLog[];
    summary: {
      totalActivities: number;
      sensitiveDataAccess: number;
      failedAttempts: number;
      complianceViolations: number;
      userBreakdown: Record<string, number>;
      actionBreakdown: Record<string, number>;
    };
  }> {
    const filters: any = { organizationId };
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const auditLogs = await this.getAuditLogs(filters);

    const summary = {
      totalActivities: auditLogs.length,
      sensitiveDataAccess: auditLogs.filter(log => log.sensitiveData).length,
      failedAttempts: auditLogs.filter(log => !log.success).length,
      complianceViolations: auditLogs.filter(log => log.complianceFlags && log.complianceFlags.length > 0).length,
      userBreakdown: {} as Record<string, number>,
      actionBreakdown: {} as Record<string, number>,
    };

    // Calculate breakdowns
    for (const log of auditLogs) {
      summary.userBreakdown[log.userName] = (summary.userBreakdown[log.userName] || 0) + 1;
      summary.actionBreakdown[log.action] = (summary.actionBreakdown[log.action] || 0) + 1;
    }

    return { auditLogs, summary };
  }

  async getUserSecuritySummary(userId: string): Promise<{
    user: User | null;
    recentActivity: AuditLog[];
    securityMetrics: {
      loginCount: number;
      failedAttempts: number;
      isLocked: boolean;
      lastLogin: string | undefined;
      lastActivity: string | undefined;
      riskScore: number;
    };
  }> {
    const user = this.tables.users.find(u => u.id === userId) || null;
    const recentActivity = await this.getAuditLogs({ userId, limit: 50 });

    const now = new Date();
    const lockoutTime = user?.lockoutUntil ? new Date(user.lockoutUntil) : null;
    const isLocked = lockoutTime ? lockoutTime > now : false;

    // Calculate risk score based on recent failed attempts, unusual activity times, etc.
    const failedLoginsLast24h = recentActivity.filter(log => 
      log.action === 'LOGIN_FAILED' && 
      new Date(log.timestamp).getTime() > now.getTime() - 24 * 60 * 60 * 1000
    ).length;

    const riskScore = Math.min(100, failedLoginsLast24h * 20 + (user?.failedLoginAttempts || 0) * 10);

    return {
      user,
      recentActivity,
      securityMetrics: {
        loginCount: user?.loginCount || 0,
        failedAttempts: user?.failedLoginAttempts || 0,
        isLocked,
        lastLogin: user?.lastLogin,
        lastActivity: user?.lastActivity,
        riskScore,
      }
    };
  }

  async exportAuditData(filters: any, format: 'json' | 'csv' = 'json'): Promise<string> {
    const auditLogs = await this.getAuditLogs(filters);

    if (format === 'csv') {
      const headers = [
        'Timestamp', 'User', 'Role', 'Organization', 'Action', 'Entity Type', 
        'Entity ID', 'Success', 'Sensitive Data', 'Compliance Flags', 
        'IP Address', 'User Agent', 'Reason'
      ];

      const csvRows = [
        headers.join(','),
        ...auditLogs.map(log => [
          log.timestamp,
          log.userName,
          log.userRole,
          log.organizationId,
          log.action,
          log.entityType || '',
          log.entityId || '',
          log.success,
          log.sensitiveData,
          log.complianceFlags?.join(';') || '',
          log.ipAddress || '',
          log.userAgent || '',
          log.reason || ''
        ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
      ];

      return csvRows.join('\n');
    }

    return JSON.stringify(auditLogs, null, 2);
  }

  // ═══════════════════════════════════════════════════════════════
  // CLOUD SYNC SUPPORT METHODS
  // ═══════════════════════════════════════════════════════════════

  // ─── Patient Cloud Sync Methods ─────────────────────────────────────────

  async getPatientByCloudId(cloudId: string): Promise<Patient | null> {
    return this.tables.patients.find(p => p.cloudId === cloudId) || null;
  }

  async updatePatientCloudId(localId: string, cloudId: string): Promise<void> {
    const patient = this.tables.patients.find(p => p.id === localId);
    if (patient) {
      patient.cloudId = cloudId;
      patient.synced = true;
      await this.persistData();
    }
  }

  async insertOrUpdatePatientFromCloud(cloudData: any): Promise<Patient> {
    const existingPatient = this.tables.patients.find(p => p.cloudId === cloudData.id);
    
    if (existingPatient) {
      // Update existing patient
      Object.assign(existingPatient, {
        ...cloudData,
        id: existingPatient.id, // Keep local ID
        cloudId: cloudData.id,
        synced: true,
        updatedAt: new Date(cloudData.updated_at || Date.now()),
      });
      await this.persistData();
      return existingPatient;
    } else {
      // Create new patient from cloud data
      const patient: Patient = {
        id: this.generateId(),
        cloudId: cloudData.id,
        patientNumber: cloudData.patient_number || this.generatePatientNumber(),
        firstName: cloudData.first_name,
        lastName: cloudData.last_name,
        dateOfBirth: new Date(cloudData.date_of_birth),
        gender: cloudData.gender,
        phone: cloudData.phone,
        email: cloudData.email,
        address: cloudData.address,
        emergencyContact: cloudData.emergency_contact,
        emergencyPhone: cloudData.emergency_phone,
        nationalId: cloudData.national_id,
        bloodType: cloudData.blood_type,
        allergies: cloudData.allergies,
        medicalHistory: cloudData.medical_history,
        medications: cloudData.medications,
        tags: cloudData.tags || [],
        notes: cloudData.notes,
        isActive: cloudData.is_active !== false,
        lastVisit: cloudData.last_visit ? new Date(cloudData.last_visit) : undefined,
        createdAt: new Date(cloudData.created_at || Date.now()),
        updatedAt: new Date(cloudData.updated_at || Date.now()),
        organizationId: cloudData.organization || '',
        synced: true,
      };
      
      this.tables.patients.push(patient);
      await this.persistData();
      return patient;
    }
  }

  // ─── Inventory Cloud Sync Methods ───────────────────────────────────────

  async getInventoryItemByCloudId(cloudId: string): Promise<InventoryItem | null> {
    return this.tables.inventory_items.find(item => item.cloudId === cloudId) || null;
  }

  async updateInventoryItemCloudId(localId: string, cloudId: string): Promise<void> {
    const item = this.tables.inventory_items.find(item => item.id === localId);
    if (item) {
      item.cloudId = cloudId;
      item.synced = true;
      await this.persistData();
    }
  }

  async insertOrUpdateInventoryItemFromCloud(cloudData: any): Promise<InventoryItem> {
    const existingItem = this.tables.inventory_items.find(item => item.cloudId === cloudData.id);
    
    if (existingItem) {
      // Update existing item
      Object.assign(existingItem, {
        ...cloudData,
        id: existingItem.id, // Keep local ID
        cloudId: cloudData.id,
        synced: true,
        updatedAt: new Date(cloudData.updated_at || Date.now()),
      });
      await this.persistData();
      return existingItem;
    } else {
      // Create new item from cloud data
      const item: InventoryItem = {
        id: this.generateId(),
        cloudId: cloudData.id,
        productId: cloudData.product_id || this.generateId(),
        supplierId: cloudData.supplier_id,
        sku: cloudData.sku,
        productName: cloudData.product_name || cloudData.name,
        genericName: cloudData.generic_name,
        dosage: cloudData.dosage,
        form: cloudData.form,
        unitOfMeasure: cloudData.unit_of_measure,
        category: cloudData.category,
        subcategory: cloudData.subcategory,
        brand: cloudData.brand,
        manufacturer: cloudData.manufacturer,
        description: cloudData.description,
        batchNumber: cloudData.batch_number,
        expirationDate: cloudData.expiration_date ? new Date(cloudData.expiration_date) : undefined,
        quantity: cloudData.quantity || 0,
        unitCost: cloudData.unit_cost || 0,
        sellingPrice: cloudData.selling_price || 0,
        minimumStock: cloudData.minimum_stock || 0,
        maximumStock: cloudData.maximum_stock || 0,
        location: cloudData.location,
        barcode: cloudData.barcode,
        requiresPrescription: cloudData.requires_prescription || false,
        isControlledSubstance: cloudData.is_controlled_substance || false,
        storageConditions: cloudData.storage_conditions,
        tags: cloudData.tags || [],
        notes: cloudData.notes,
        isActive: cloudData.is_active !== false,
        createdAt: new Date(cloudData.created_at || Date.now()),
        updatedAt: new Date(cloudData.updated_at || Date.now()),
        organizationId: cloudData.organization || '',
        synced: true,
      };
      
      this.tables.inventory_items.push(item);
      await this.persistData();
      return item;
    }
  }

  // ─── Prescription Cloud Sync Methods ───────────────────────────────────

  async getPrescriptionByCloudId(cloudId: string): Promise<Prescription | null> {
    return this.tables.prescriptions.find(p => p.cloudId === cloudId) || null;
  }

  async updatePrescriptionCloudId(localId: string, cloudId: string): Promise<void> {
    const prescription = this.tables.prescriptions.find(p => p.id === localId);
    if (prescription) {
      prescription.cloudId = cloudId;
      prescription.synced = true;
      await this.persistData();
    }
  }

  async insertOrUpdatePrescriptionFromCloud(cloudData: any): Promise<Prescription> {
    const existingPrescription = this.tables.prescriptions.find(p => p.cloudId === cloudData.id);
    
    if (existingPrescription) {
      // Update existing prescription
      Object.assign(existingPrescription, {
        ...cloudData,
        id: existingPrescription.id, // Keep local ID
        cloudId: cloudData.id,
        synced: true,
        updatedAt: new Date(cloudData.updated_at || Date.now()),
      });
      await this.persistData();
      return existingPrescription;
    } else {
      // Create new prescription from cloud data
      const prescription: Prescription = {
        id: this.generateId(),
        cloudId: cloudData.id,
        prescriptionNumber: cloudData.prescription_number || this.generateId(),
        patientId: cloudData.patient_id || '',
        doctorId: cloudData.doctor_id || '',
        doctorName: cloudData.doctor_name || 'Dr. Unknown',
        facilityName: cloudData.facility_name,
        diagnosis: cloudData.diagnosis,
        prescriptionDate: new Date(cloudData.prescription_date || Date.now()),
        status: cloudData.status || 'PENDING',
        items: cloudData.items || [],
        totalAmount: cloudData.total_amount || 0,
        notes: cloudData.notes,
        tags: cloudData.tags || [],
        isInsurance: cloudData.is_insurance || false,
        insuranceDetails: cloudData.insurance_details,
        createdAt: new Date(cloudData.created_at || Date.now()),
        updatedAt: new Date(cloudData.updated_at || Date.now()),
        organizationId: cloudData.organization || '',
        synced: true,
      };
      
      this.tables.prescriptions.push(prescription);
      await this.persistData();
      return prescription;
    }
  }

  // ─── Sale Cloud Sync Methods ─────────────────────────────────────────

  async getSaleByCloudId(cloudId: string): Promise<Sale | null> {
    const salesArray = Array.from(this.sales.values());
    return salesArray.find(s => s.cloudId === cloudId) || null;
  }

  async updateSaleCloudId(localId: string, cloudId: string): Promise<void> {
    const sale = this.sales.get(localId);
    if (sale) {
      sale.cloudId = cloudId;
      sale.synced = true;
      await this.persistData();
    }
  }

  async insertOrUpdateSaleFromCloud(cloudData: any): Promise<Sale> {
    const salesArray = Array.from(this.sales.values());
    const existingSale = salesArray.find(s => s.cloudId === cloudData.id);
    
    if (existingSale) {
      // Update existing sale
      Object.assign(existingSale, {
        ...cloudData,
        id: existingSale.id, // Keep local ID
        cloudId: cloudData.id,
        synced: true,
        updatedAt: new Date(cloudData.updated_at || Date.now()),
      });
      this.sales.set(existingSale.id, existingSale);
      await this.persistData();
      return existingSale;
    } else {
      // Create new sale from cloud data
      const sale: Sale = {
        id: this.generateId(),
        cloudId: cloudData.id,
        receiptNumber: cloudData.receipt_number || this.generateReceiptNumber(),
        customerId: cloudData.customer_id,
        patientId: cloudData.patient_id,
        prescriptionId: cloudData.prescription_id,
        saleDate: new Date(cloudData.sale_date || Date.now()),
        items: cloudData.items || [],
        paymentMethod: cloudData.payment_method || 'CASH',
        totalAmount: cloudData.total_amount || 0,
        subtotal: cloudData.subtotal || 0,
        taxAmount: cloudData.tax_amount || 0,
        discountAmount: cloudData.discount_amount || 0,
        amountPaid: cloudData.amount_paid || 0,
        changeGiven: cloudData.change_given || 0,
        status: cloudData.status || 'COMPLETED',
        paymentDetails: cloudData.payment_details,
        notes: cloudData.notes,
        tags: cloudData.tags || [],
        cashierId: cloudData.cashier_id || '',
        cashierName: cloudData.cashier_name || 'Unknown',
        createdAt: new Date(cloudData.created_at || Date.now()),
        updatedAt: new Date(cloudData.updated_at || Date.now()),
        organizationId: cloudData.organization || '',
        synced: true,
      };
      
      this.sales.set(sale.id, sale);
      this.tables.sales.push(sale);
      await this.persistData();
      return sale;
    }
  }

  // ─── Supplier Cloud Sync Methods ─────────────────────────────────────

  async getSupplierByCloudId(cloudId: string): Promise<Supplier | null> {
    return this.tables.suppliers.find(s => s.cloudId === cloudId) || null;
  }

  async updateSupplierCloudId(localId: string, cloudId: string): Promise<void> {
    const supplier = this.tables.suppliers.find(s => s.id === localId);
    if (supplier) {
      supplier.cloudId = cloudId;
      supplier.synced = true;
      await this.persistData();
    }
  }

  async insertOrUpdateSupplierFromCloud(cloudData: any): Promise<Supplier> {
    const existingSupplier = this.tables.suppliers.find(s => s.cloudId === cloudData.id);
    
    if (existingSupplier) {
      // Update existing supplier
      Object.assign(existingSupplier, {
        ...cloudData,
        id: existingSupplier.id, // Keep local ID
        cloudId: cloudData.id,
        synced: true,
        updatedAt: new Date(cloudData.updated_at || Date.now()),
      });
      await this.persistData();
      return existingSupplier;
    } else {
      // Create new supplier from cloud data
      const supplier: Supplier = {
        id: this.generateId(),
        cloudId: cloudData.id,
        name: cloudData.name,
        contactPerson: cloudData.contact_person,
        phone: cloudData.phone,
        email: cloudData.email,
        address: cloudData.address,
        taxId: cloudData.tax_id,
        licenseNumber: cloudData.license_number,
        paymentTerms: cloudData.payment_terms,
        creditLimit: cloudData.credit_limit || 0,
        category: cloudData.category,
        notes: cloudData.notes,
        tags: cloudData.tags || [],
        isActive: cloudData.is_active !== false,
        createdAt: new Date(cloudData.created_at || Date.now()),
        updatedAt: new Date(cloudData.updated_at || Date.now()),
        organizationId: cloudData.organization || '',
        synced: true,
      };
      
      this.tables.suppliers.push(supplier);
      await this.persistData();
      return supplier;
    }
  }

  // ─── Helper Methods for Cloud Sync ─────────────────────────────────────

  private generateReceiptNumber(): string {
    const timestamp = Date.now().toString();
    return `R${timestamp.slice(-8)}`;
  }

  private generatePatientNumber(): string {
    const timestamp = Date.now().toString();
    return `P${timestamp.slice(-8)}`;
  }
}

export default DatabaseService;
