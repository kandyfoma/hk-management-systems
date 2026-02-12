// ═══════════════════════════════════════════════════════════════
// CLOUD SYNC ARCHITECTURE - Future Implementation Plan
// ═══════════════════════════════════════════════════════════════

/**
 * This shows how to add cloud synchronization to your existing local database.
 * Your current local storage will remain as the primary data source for speed,
 * with cloud sync as a background process.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import DatabaseService from './DatabaseService';

// ─── SYNC CONFIGURATION ──────────────────────────────────────

interface SyncConfig {
  baseUrl: string;          // Your backend API URL
  apiKey: string;           // Authentication
  organizationId: string;   // Multi-tenant support
  syncInterval: number;     // Auto-sync frequency (milliseconds)
  retryAttempts: number;    // Network failure retry
}

interface SyncStatus {
  lastSyncTime: string;
  pendingChanges: number;
  syncInProgress: boolean;
  lastError?: string;
}

// ─── CHANGE TRACKING ─────────────────────────────────────────

interface ChangeRecord {
  id: string;
  entity: 'patient' | 'encounter' | 'prescription' | 'sale' | 'product';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: string;
  synced: boolean;
  attempts: number;
}

// ═══════════════════════════════════════════════════════════════
// CLOUD SYNC SERVICE - Future Implementation
// ═══════════════════════════════════════════════════════════════

export class CloudSyncService {
  private static instance: CloudSyncService;
  private dbService: DatabaseService;
  private config: SyncConfig;
  private changeLog: ChangeRecord[] = [];
  private syncStatus: SyncStatus = {
    lastSyncTime: '',
    pendingChanges: 0,
    syncInProgress: false
  };

  private constructor(config: SyncConfig) {
    this.config = config;
    this.dbService = DatabaseService.getInstance();
    this.loadChangeLog();
    this.startAutoSync();
  }

  public static initialize(config: SyncConfig): CloudSyncService {
    if (!CloudSyncService.instance) {
      CloudSyncService.instance = new CloudSyncService(config);
    }
    return CloudSyncService.instance;
  }

  public static getInstance(): CloudSyncService | null {
    return CloudSyncService.instance || null;
  }

  // ─── CHANGE TRACKING METHODS ─────────────────────────────────

  async recordChange(
    entity: 'patient' | 'encounter' | 'prescription' | 'sale' | 'product',
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    data: any
  ): Promise<void> {
    const change: ChangeRecord = {
      id: this.generateId(),
      entity,
      entityId,
      operation,
      data,
      timestamp: new Date().toISOString(),
      synced: false,
      attempts: 0
    };

    this.changeLog.push(change);
    await this.saveChangeLog();
    
    console.log(`📝 Change recorded: ${operation} ${entity} ${entityId}`);
    
    // Trigger immediate sync if online
    if (await this.isOnline()) {
      this.syncChangesToCloud();
    }
  }

  // ─── CLOUD SYNC METHODS ──────────────────────────────────────

  async syncChangesToCloud(): Promise<boolean> {
    if (this.syncStatus.syncInProgress) {
      console.log('🔄 Sync already in progress');
      return false;
    }

    this.syncStatus.syncInProgress = true;
    console.log('☁️ Starting cloud sync...');

    try {
      const pendingChanges = this.changeLog.filter(c => !c.synced);
      let successCount = 0;
      
      for (const change of pendingChanges) {
        try {
          await this.syncSingleChange(change);
          change.synced = true;
          successCount++;
          console.log(`✅ Synced: ${change.operation} ${change.entity}`);
        } catch (error) {
          change.attempts++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`❌ Sync failed: ${change.entity}`, errorMessage);
          
          if (change.attempts >= this.config.retryAttempts) {
            console.error(`⚠️ Max retry attempts reached for ${change.entity}`);
          }
        }
      }

      await this.saveChangeLog();
      this.syncStatus.lastSyncTime = new Date().toISOString();
      this.syncStatus.pendingChanges = this.changeLog.filter(c => !c.synced).length;
      this.syncStatus.lastError = undefined; // Clear error on successful sync
      
      console.log(`✅ Cloud sync completed. Synced: ${successCount}, Pending: ${this.syncStatus.pendingChanges}`);
      return successCount > 0;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Cloud sync failed:', errorMessage);
      this.syncStatus.lastError = errorMessage;
      return false;
    } finally {
      this.syncStatus.syncInProgress = false;
    }
  }

  async syncSingleChange(change: ChangeRecord): Promise<void> {
    const endpoint = this.getEndpointForEntity(change.entity);
    
    switch (change.operation) {
      case 'create':
        await this.apiCall('POST', endpoint, change.data);
        break;
      case 'update':
        await this.apiCall('PUT', `${endpoint}/${change.entityId}`, change.data);
        break;
      case 'delete':
        await this.apiCall('DELETE', `${endpoint}/${change.entityId}`);
        break;
    }
  }

  // ─── PULL SYNC FROM CLOUD ────────────────────────────────────

  async pullFromCloud(): Promise<void> {
    console.log('📥 Pulling data from cloud...');
    
    try {
      // Get last sync timestamp
      const lastSync = this.syncStatus.lastSyncTime || '1970-01-01T00:00:00Z';
      
      // Fetch updated entities from cloud
      const entities = ['patients', 'encounters', 'prescriptions', 'sales', 'products'];
      
      for (const entity of entities) {
        try {
          const response = await this.apiCall('GET', 
            `/api/${entity}?modified_since=${lastSync}&org_id=${this.config.organizationId}`
          );
          
          // Handle different response formats
          const data = response?.data || response;
          if (Array.isArray(data) && data.length > 0) {
            await this.mergeCloudData(entity, data);
            console.log(`📥 Merged ${data.length} ${entity} from cloud`);
          } else {
            console.log(`📥 No new ${entity} data from cloud`);
          }
        } catch (error) {
          console.error(`❌ Failed to pull ${entity} from cloud:`, error);
          // Continue with other entities even if one fails
        }
      }
      
    } catch (error) {
      console.error('❌ Pull from cloud failed:', error);
      this.syncStatus.lastError = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  async mergeCloudData(entity: string, cloudData: any[]): Promise<void> {
    // Smart merge: Cloud wins for conflicts, but preserve local changes
    for (const item of cloudData) {
      try {
        const existingItem = await this.findLocalItem(entity, item.id);
        
        if (!existingItem) {
          // New item from cloud
          await this.insertLocalItem(entity, item);
          console.log(`📥 Inserted new ${entity} from cloud: ${item.id}`);
        } else {
          // Conflict resolution: Compare timestamps
          const cloudTimestamp = new Date(item.updatedAt || item.createdAt);
          const localTimestamp = new Date(existingItem.updatedAt || existingItem.createdAt);
          
          if (cloudTimestamp > localTimestamp) {
            // Cloud version is newer
            await this.updateLocalItem(entity, item.id, item);
            console.log(`🔄 Updated local ${entity} from cloud: ${item.id}`);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to merge ${entity} item ${item.id}:`, error);
      }
    }
  }

  // ─── UTILITY METHODS ─────────────────────────────────────────

  private async apiCall(method: string, endpoint: string, data?: any): Promise<any> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Organization-ID': this.config.organizationId
        },
        body: data ? JSON.stringify(data) : undefined
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      // Handle empty responses (like DELETE operations)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return null;
      }
    } catch (error) {
      console.error(`❌ API call failed: ${method} ${url}`, error);
      throw error;
    }
  }

  private getEndpointForEntity(entity: string): string {
    const endpoints: Record<string, string> = {
      patient: '/api/patients',
      encounter: '/api/encounters',
      prescription: '/api/prescriptions',
      sale: '/api/sales',
      product: '/api/products'
    };
    return endpoints[entity] || '/api/unknown';
  }

  private async isOnline(): Promise<boolean> {
    // Check network connectivity
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.config.baseUrl}/health`, { 
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  private startAutoSync(): void {
    setInterval(async () => {
      try {
        const isOnline = await this.isOnline();
        const hasPendingChanges = this.changeLog.some(c => !c.synced);
        
        if (isOnline && hasPendingChanges && !this.syncStatus.syncInProgress) {
          console.log('⏰ Auto-sync triggered');
          await this.syncChangesToCloud();
          await this.pullFromCloud();
        }
      } catch (error) {
        console.error('❌ Auto-sync failed:', error);
      }
    }, this.config.syncInterval);
  }

  private async saveChangeLog(): Promise<void> {
    await AsyncStorage.setItem('HK_SYNC_CHANGELOG', JSON.stringify(this.changeLog));
  }

  private async loadChangeLog(): Promise<void> {
    const stored = await AsyncStorage.getItem('HK_SYNC_CHANGELOG');
    if (stored) {
      this.changeLog = JSON.parse(stored);
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private async findLocalItem(entity: string, id: string): Promise<any | null> {
    switch (entity) {
      case 'patients':
        return await this.dbService.getPatient(id, false);
      case 'encounters':
        return await this.dbService.getEncounter(id);
      case 'prescriptions':
        return await this.dbService.getPrescription(id);
      case 'sales':
        return await this.dbService.getSale(id);
      case 'products':
        return await this.dbService.getProduct(id);
      default:
        return null;
    }
  }

  private async insertLocalItem(entity: string, item: any): Promise<void> {
    switch (entity) {
      case 'patients':
        await this.dbService.createPatient(item);
        break;
      case 'encounters':
        await this.dbService.createEncounter(item);
        break;
      case 'prescriptions':
        await this.dbService.createPrescription(item);
        break;
      case 'sales':
        // Sales creation might need special handling
        console.warn('Sale insertion from cloud not implemented');
        break;
      case 'products':
        await this.dbService.createProduct(item);
        break;
      default:
        console.warn(`Unknown entity type for insertion: ${entity}`);
    }
  }

  private async updateLocalItem(entity: string, id: string, item: any): Promise<void> {
    switch (entity) {
      case 'patients':
        await this.dbService.updatePatient(id, item);
        break;
      case 'encounters':
        await this.dbService.updateEncounter(id, item);
        break;
      case 'prescriptions':
        await this.dbService.updatePrescription(id, item);
        break;
      case 'sales':
        // Sales updates might need special handling
        console.warn('Sale update from cloud not implemented');
        break;
      case 'products':
        await this.dbService.updateProduct(id, item);
        break;
      default:
        console.warn(`Unknown entity type for update: ${entity}`);
    }
  }

  // ─── PUBLIC STATUS METHODS ───────────────────────────────────

  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  getPendingChanges(): ChangeRecord[] {
    return this.changeLog.filter(c => !c.synced);
  }

  async forceSyncNow(): Promise<boolean> {
    await this.syncChangesToCloud();
    await this.pullFromCloud();
    return this.syncStatus.pendingChanges === 0;
  }
}

// ═══════════════════════════════════════════════════════════════
// INTEGRATION WITH EXISTING DATABASESERVICE
// ═══════════════════════════════════════════════════════════════

/**
 * To enable cloud sync, you would modify your existing DatabaseService
 * to call CloudSyncService.recordChange() after each CRUD operation:
 */

/*
// Example: Modified createPatient method with sync
async createPatient(data: PatientCreate): Promise<Patient> {
  // Existing local database logic
  const patient = { ...existingCreationLogic... };
  this.tables.patients.push(patient);
  await this.autoSave(); // Local storage
  
  // NEW: Record change for cloud sync
  if (this.cloudSync) {
    await this.cloudSync.recordChange('patient', patient.id, 'create', patient);
  }
  
  return patient;
}
*/

export default CloudSyncService;