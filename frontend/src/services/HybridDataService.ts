/**
 * HybridDataService - Combines local SQLite storage with cloud sync
 * Offline-first architecture with automatic cloud synchronization
 */

import DatabaseService from './DatabaseService';
import SyncService from './SyncService';
import ApiService from './ApiService';
import { Patient, PatientCreate, PatientUpdate } from '../models/Patient';
import { InventoryItem, InventoryItemCreate, InventoryItemUpdate } from '../models/Inventory';
import { Prescription, PrescriptionCreate, PrescriptionUpdate } from '../models/Prescription';
import { Sale, SaleCreate, SaleUpdate } from '../models/Sale';
import { Supplier, SupplierCreate, SupplierUpdate } from '../models/Inventory';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface DataServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  isOffline?: boolean;
  syncPending?: boolean;
}

interface QueryOptions {
  includeDeleted?: boolean;
  syncedOnly?: boolean;
  offlineData?: boolean;
  limit?: number;
  offset?: number;
}

// ═══════════════════════════════════════════════════════════════
// HYBRID DATA SERVICE CLASS
// ═══════════════════════════════════════════════════════════════

export class HybridDataService {
  private static instance: HybridDataService;
  private db: DatabaseService;
  private sync: SyncService;

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.sync = SyncService.getInstance();
  }

  public static getInstance(): HybridDataService {
    if (!HybridDataService.instance) {
      HybridDataService.instance = new HybridDataService();
    }
    return HybridDataService.instance;
  }

  // ═══════════════════════════════════════════════════════════════
  // PATIENTS
  // ═══════════════════════════════════════════════════════════════

  async getAllPatients(options?: QueryOptions): Promise<DataServiceResult<Patient[]>> {
    try {
      // Always get from local database first (offline-first)
      const patients = await this.db.getAllPatients();
      
      // Try to get fresh data from API if online (background refresh)
      const syncStatus = this.sync.getSyncStatus();
      if (syncStatus.isOnline && !options?.offlineData) {
        // Trigger background sync but don't wait for it
        this.sync.forceSync().catch(console.error);
      }

      return {
        success: true,
        data: patients,
        isOffline: !syncStatus.isOnline,
        syncPending: syncStatus.pendingItems > 0,
      };
    } catch (error) {
      console.error('Get patients error:', error);
      return {
        success: false,
        error: String(error),
      };
    }
  }

  async getPatient(id: string): Promise<DataServiceResult<Patient | null>> {
    try {
      const patient = await this.db.getPatient(id);
      const syncStatus = this.sync.getSyncStatus();

      return {
        success: true,
        data: patient || undefined,
        isOffline: !syncStatus.isOnline,
      };
    } catch (error) {
      console.error('Get patient error:', error);
      return {
        success: false,
        error: String(error),
      };
    }
  }

  async createPatient(patientData: PatientCreate): Promise<DataServiceResult<Patient>> {
    try {
      // Always save locally first
      const patient = await this.db.createPatient(patientData);
      
      // Queue for cloud sync
      await this.sync.queueForSync('patients', 'CREATE', patient, patient.id);
      
      const syncStatus = this.sync.getSyncStatus();
      
      return {
        success: true,
        data: patient,
        isOffline: !syncStatus.isOnline,
        syncPending: true,
      };
    } catch (error) {
      console.error('Create patient error:', error);
      return {
        success: false,
        error: String(error),
      };
    }
  }

  async updatePatient(id: string, patientData: PatientUpdate): Promise<DataServiceResult<Patient | null>> {
    try {
      // Update locally first
      const patient = await this.db.updatePatient(id, patientData);
      
      if (patient) {
        // Queue for cloud sync
        await this.sync.queueForSync('patients', 'UPDATE', patient, patient.id, patient.cloudId);
      }
      
      const syncStatus = this.sync.getSyncStatus();
      
      return {
        success: true,
        data: patient || undefined,
        isOffline: !syncStatus.isOnline,
        syncPending: true,
      };
    } catch (error) {
      console.error('Update patient error:', error);
      return {
        success: false,
        error: String(error),
      };
    }
  }

  async deletePatient(id: string): Promise<DataServiceResult<boolean>> {
    try {
      // Get patient for cloud sync info
      const patient = await this.db.getPatient(id);
      
      // Soft delete locally
      await this.db.deletePatient(id);
      
      if (patient?.cloudId) {
        // Queue for cloud sync
        await this.sync.queueForSync('patients', 'DELETE', { id: patient.cloudId }, patient.id, patient.cloudId);
      }
      
      const syncStatus = this.sync.getSyncStatus();
      
      return {
        success: true,
        data: true,
        isOffline: !syncStatus.isOnline,
        syncPending: true,
      };
    } catch (error) {
      console.error('Delete patient error:', error);
      return {
        success: false,
        error: String(error),
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // INVENTORY
  // ═══════════════════════════════════════════════════════════════

  async getAllInventoryItems(options?: QueryOptions): Promise<DataServiceResult<InventoryItem[]>> {
    try {
      const items = await this.db.getInventoryItemsByOrganization(
        (await this.db.getCurrentOrganization())?.id || ''
      );
      const syncStatus = this.sync.getSyncStatus();
      
      if (syncStatus.isOnline && !options?.offlineData) {
        this.sync.forceSync().catch(console.error);
      }

      return {
        success: true,
        data: items,
        isOffline: !syncStatus.isOnline,
        syncPending: syncStatus.pendingItems > 0,
      };
    } catch (error) {
      console.error('Get inventory items error:', error);
      return {
        success: false,
        error: String(error),
      };
    }
  }

  async createInventoryItem(itemData: InventoryItemCreate): Promise<DataServiceResult<InventoryItem>> {
    try {
      const item = await this.db.createInventoryItem(itemData);
      await this.sync.queueForSync('inventory', 'CREATE', item, item.id);
      
      const syncStatus = this.sync.getSyncStatus();
      
      return {
        success: true,
        data: item,
        isOffline: !syncStatus.isOnline,
        syncPending: true,
      };
    } catch (error) {
      console.error('Create inventory item error:', error);
      return {
        success: false,
        error: String(error),
      };
    }
  }

  async updateInventoryItem(id: string, itemData: InventoryItemUpdate): Promise<DataServiceResult<InventoryItem | null>> {
    try {
      const item = await this.db.updateInventoryItem(id, itemData);
      
      if (item) {
        await this.sync.queueForSync('inventory', 'UPDATE', item, item.id, item.cloudId);
      }
      
      const syncStatus = this.sync.getSyncStatus();
      
      return {
        success: true,
        data: item || undefined,
        isOffline: !syncStatus.isOnline,
        syncPending: true,
      };
    } catch (error) {
      console.error('Update inventory item error:', error);
      return {
        success: false,
        error: String(error),
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PRESCRIPTIONS
  // ═══════════════════════════════════════════════════════════════

  async getAllPrescriptions(options?: QueryOptions): Promise<DataServiceResult<Prescription[]>> {
    try {
      const prescriptions = await this.db.getAllPrescriptions();
      const syncStatus = this.sync.getSyncStatus();
      
      if (syncStatus.isOnline && !options?.offlineData) {
        this.sync.forceSync().catch(console.error);
      }

      return {
        success: true,
        data: prescriptions,
        isOffline: !syncStatus.isOnline,
        syncPending: syncStatus.pendingItems > 0,
      };
    } catch (error) {
      console.error('Get prescriptions error:', error);
      return {
        success: false,
        error: String(error),
      };
    }
  }

  async createPrescription(prescriptionData: PrescriptionCreate): Promise<DataServiceResult<Prescription>> {
    try {
      const prescription = await this.db.createPrescription(prescriptionData);
      await this.sync.queueForSync('prescriptions', 'CREATE', prescription, prescription.id);
      
      const syncStatus = this.sync.getSyncStatus();
      
      return {
        success: true,
        data: prescription,
        isOffline: !syncStatus.isOnline,
        syncPending: true,
      };
    } catch (error) {
      console.error('Create prescription error:', error);
      return {
        success: false,
        error: String(error),
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SALES
  // ═══════════════════════════════════════════════════════════════

  async getAllSales(options?: QueryOptions): Promise<DataServiceResult<Sale[]>> {
    try {
      const sales = await this.db.getAllSales();
      const syncStatus = this.sync.getSyncStatus();
      
      if (syncStatus.isOnline && !options?.offlineData) {
        this.sync.forceSync().catch(console.error);
      }

      return {
        success: true,
        data: sales,
        isOffline: !syncStatus.isOnline,
        syncPending: syncStatus.pendingItems > 0,
      };
    } catch (error) {
      console.error('Get sales error:', error);
      return {
        success: false,
        error: String(error),
      };
    }
  }

  async createSale(saleData: SaleCreate): Promise<DataServiceResult<Sale>> {
    try {
      const sale = await this.db.createSale(saleData);
      await this.sync.queueForSync('sales', 'CREATE', sale, sale.id);
      
      const syncStatus = this.sync.getSyncStatus();
      
      return {
        success: true,
        data: sale,
        isOffline: !syncStatus.isOnline,
        syncPending: true,
      };
    } catch (error) {
      console.error('Create sale error:', error);
      return {
        success: false,
        error: String(error),
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SUPPLIERS
  // ═══════════════════════════════════════════════════════════════

  async getAllSuppliers(options?: QueryOptions): Promise<DataServiceResult<Supplier[]>> {
    try {
      const suppliers = await this.db.getSuppliersByOrganization(
        (await this.db.getCurrentOrganization())?.id || ''
      );
      const syncStatus = this.sync.getSyncStatus();
      
      if (syncStatus.isOnline && !options?.offlineData) {
        this.sync.forceSync().catch(console.error);
      }

      return {
        success: true,
        data: suppliers,
        isOffline: !syncStatus.isOnline,
        syncPending: syncStatus.pendingItems > 0,
      };
    } catch (error) {
      console.error('Get suppliers error:', error);
      return {
        success: false,
        error: String(error),
      };
    }
  }

  async createSupplier(supplierData: SupplierCreate): Promise<DataServiceResult<Supplier>> {
    try {
      const supplier = await this.db.createSupplier(supplierData);
      await this.sync.queueForSync('suppliers', 'CREATE', supplier, supplier.id);
      
      const syncStatus = this.sync.getSyncStatus();
      
      return {
        success: true,
        data: supplier,
        isOffline: !syncStatus.isOnline,
        syncPending: true,
      };
    } catch (error) {
      console.error('Create supplier error:', error);
      return {
        success: false,
        error: String(error),
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SYNC MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  getSyncStatus() {
    return this.sync.getSyncStatus();
  }

  async forceSync(): Promise<boolean> {
    try {
      await this.sync.forceSync();
      return true;
    } catch (error) {
      console.error('Force sync error:', error);
      return false;
    }
  }

  async pauseSync(): Promise<void> {
    await this.sync.pauseSync();
  }

  async resumeSync(): Promise<void> {
    await this.sync.resumeSync();
  }

  async clearSyncQueue(): Promise<void> {
    await this.sync.clearSyncQueue();
  }

  // ═══════════════════════════════════════════════════════════════
  // DATABASE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  async initializeDatabase(): Promise<void> {
    await this.db.initializeDatabase();
  }

  async clearDatabase(): Promise<void> {
    // Clear local data and sync queue
    await this.sync.clearSyncQueue();
    // Note: clearDatabase method would need to be added to DatabaseService
  }

  async getOrganization() {
    return await this.db.getCurrentOrganization();
  }

  async getDashboardStats() {
    // Get organization and return basic stats structure
    const org = await this.db.getCurrentOrganization();
    if (!org) return null;
    
    // Return a basic stats structure that the dashboard expects
    return {
      totalPatients: 0,
      totalSales: 0,
      totalPrescriptions: 0,
      criticalStock: 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // CLOUD-ONLY OPERATIONS (when online)
  // ═══════════════════════════════════════════════════════════════

  async syncWithCloud(): Promise<DataServiceResult<boolean>> {
    const syncStatus = this.sync.getSyncStatus();
    
    if (!syncStatus.isOnline) {
      return {
        success: false,
        error: 'No internet connection',
        isOffline: true,
      };
    }

    try {
      await this.sync.forceSync();
      return {
        success: true,
        data: true,
      };
    } catch (error) {
      console.error('Cloud sync error:', error);
      return {
        success: false,
        error: String(error),
      };
    }
  }

  async validateCloudConnection(): Promise<boolean> {
    return await ApiService.getInstance().checkConnection();
  }
}

export default HybridDataService;