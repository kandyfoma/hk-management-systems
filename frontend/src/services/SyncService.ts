/**
 * SyncService - Handles bi-directional synchronization between local SQLite and Django backend
 * Designed for unreliable internet connections in DRC
 */

import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DatabaseService from './DatabaseService';
import ApiService from './ApiService';
import { Patient } from '../models/Patient';
import { InventoryItem } from '../models/Inventory';
import { Prescription } from '../models/Prescription';
import { Sale } from '../models/Sale';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface SyncItem {
  id: string;
  tableName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  data: any;
  localId: string;
  cloudId?: string;
  timestamp: number;
  synced: boolean;
  version: number;
  lastSyncAttempt?: number;
  retryCount: number;
}

interface SyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  pendingItems: number;
  syncInProgress: boolean;
  syncErrors: SyncError[];
}

interface SyncError {
  itemId: string;
  error: string;
  timestamp: number;
  retryCount: number;
}

interface ConflictResolution {
  strategy: 'LOCAL_WINS' | 'CLOUD_WINS' | 'MERGE' | 'MANUAL';
  localData: any;
  cloudData: any;
  resolvedData?: any;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const SYNC_QUEUE_KEY = 'sync_queue';
const SYNC_STATUS_KEY = 'sync_status';
const LAST_SYNC_KEY = 'last_sync_timestamp';
const MAX_RETRY_COUNT = 3;
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
const BATCH_SIZE = 10;

// ═══════════════════════════════════════════════════════════════
// SYNC SERVICE CLASS
// ═══════════════════════════════════════════════════════════════

export class SyncService {
  private static instance: SyncService;
  private db: DatabaseService;
  private syncQueue: SyncItem[] = [];
  private syncStatus: SyncStatus = {
    isOnline: false,
    lastSync: null,
    pendingItems: 0,
    syncInProgress: false,
    syncErrors: [],
  };
  private syncTimer: NodeJS.Timeout | null = null;
  private netInfoUnsubscribe: (() => void) | null = null;

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.initializeSync();
  }

  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  // ═══════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════

  private async initializeSync(): Promise<void> {
    try {
      // Load sync queue from storage
      await this.loadSyncQueue();
      
      // Setup network monitoring
      this.setupNetworkMonitoring();
      
      // Start periodic sync
      this.startPeriodicSync();
      
      // Sync on startup if online
      const netState = await NetInfo.fetch();
      if (netState.isConnected) {
        this.performSync();
      }
    } catch (error) {
      console.error('Failed to initialize sync service:', error);
    }
  }

  private setupNetworkMonitoring(): void {
    this.netInfoUnsubscribe = NetInfo.addEventListener(state => {
      const wasOnline = this.syncStatus.isOnline;
      this.syncStatus.isOnline = state.isConnected || false;
      
      // If we just came online, trigger sync
      if (!wasOnline && this.syncStatus.isOnline) {
        console.log('🌐 Connection restored, starting sync...');
        this.performSync();
      }
    });
  }

  private startPeriodicSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    this.syncTimer = setInterval(() => {
      if (this.syncStatus.isOnline && !this.syncStatus.syncInProgress) {
        this.performSync();
      }
    }, SYNC_INTERVAL);
  }

  // ═══════════════════════════════════════════════════════════════
  // QUEUE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  async queueForSync(
    tableName: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    data: any,
    localId: string,
    cloudId?: string
  ): Promise<void> {
    const syncItem: SyncItem = {
      id: `${tableName}_${localId}_${Date.now()}`,
      tableName,
      action,
      data,
      localId,
      cloudId,
      timestamp: Date.now(),
      synced: false,
      version: 1,
      retryCount: 0,
    };

    this.syncQueue.push(syncItem);
    this.syncStatus.pendingItems = this.syncQueue.filter(item => !item.synced).length;
    
    await this.saveSyncQueue();
    
    // Try immediate sync if online
    if (this.syncStatus.isOnline && !this.syncStatus.syncInProgress) {
      this.performSync();
    }
  }

  private async loadSyncQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      if (stored) {
        this.syncQueue = JSON.parse(stored);
        this.syncStatus.pendingItems = this.syncQueue.filter(item => !item.synced).length;
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
    }
  }

  private async saveSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SYNC OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  async performSync(): Promise<void> {
    if (this.syncStatus.syncInProgress || !this.syncStatus.isOnline) {
      return;
    }

    console.log('🔄 Starting sync process...');
    this.syncStatus.syncInProgress = true;

    try {
      // 1. Push local changes to cloud
      await this.pushChangesToCloud();
      
      // 2. Pull changes from cloud
      await this.pullChangesFromCloud();
      
      // 3. Clean up completed sync items
      await this.cleanupSyncQueue();
      
      this.syncStatus.lastSync = new Date();
      await AsyncStorage.setItem(LAST_SYNC_KEY, this.syncStatus.lastSync.toISOString());
      
      console.log('✅ Sync completed successfully');
    } catch (error) {
      console.error('❌ Sync failed:', error);
    } finally {
      this.syncStatus.syncInProgress = false;
      this.syncStatus.pendingItems = this.syncQueue.filter(item => !item.synced).length;
    }
  }

  private async pushChangesToCloud(): Promise<void> {
    const pendingItems = this.syncQueue
      .filter(item => !item.synced && item.retryCount < MAX_RETRY_COUNT)
      .slice(0, BATCH_SIZE);

    for (const item of pendingItems) {
      try {
        await this.syncItemToCloud(item);
        item.synced = true;
        console.log(`✅ Synced ${item.tableName} ${item.action} ${item.localId}`);
      } catch (error) {
        item.retryCount++;
        item.lastSyncAttempt = Date.now();
        this.syncStatus.syncErrors.push({
          itemId: item.id,
          error: String(error),
          timestamp: Date.now(),
          retryCount: item.retryCount,
        });
        console.error(`❌ Failed to sync ${item.tableName} ${item.action} ${item.localId}:`, error);
      }
    }

    await this.saveSyncQueue();
  }

  private async syncItemToCloud(item: SyncItem): Promise<void> {
    const endpoint = this.getApiEndpoint(item.tableName);
    const api = ApiService.getInstance();
    
    switch (item.action) {
      case 'CREATE':
        const createResponse = await api.post(endpoint, item.data);
        if (createResponse.success && createResponse.data) {
          // Update local record with cloud ID
          await this.updateLocalRecordWithCloudId(item.tableName, item.localId, createResponse.data.id);
          item.cloudId = createResponse.data.id;
        } else {
          throw new Error(createResponse.error?.message || 'Create failed');
        }
        break;

      case 'UPDATE':
        if (!item.cloudId) {
          throw new Error('Cannot update without cloud ID');
        }
        const updateResponse = await api.patch(`${endpoint}${item.cloudId}/`, item.data);
        if (!updateResponse.success) {
          throw new Error(updateResponse.error?.message || 'Update failed');
        }
        break;

      case 'DELETE':
        if (!item.cloudId) {
          throw new Error('Cannot delete without cloud ID');
        }
        const deleteResponse = await api.delete(`${endpoint}${item.cloudId}/`);
        if (!deleteResponse.success) {
          throw new Error(deleteResponse.error?.message || 'Delete failed');
        }
        break;
    }
  }

  private async pullChangesFromCloud(): Promise<void> {
    const lastSyncStr = await AsyncStorage.getItem(LAST_SYNC_KEY);
    const lastSync = lastSyncStr ? new Date(lastSyncStr) : new Date(0);
    
    // Pull changes for each table
    const tables = ['patients', 'inventory', 'prescriptions', 'sales', 'suppliers'];
    
    for (const table of tables) {
      try {
        await this.pullTableChanges(table, lastSync);
      } catch (error) {
        console.error(`Failed to pull ${table} changes:`, error);
      }
    }
  }

  private async pullTableChanges(tableName: string, since: Date): Promise<void> {
    const endpoint = this.getApiEndpoint(tableName);
    const api = ApiService.getInstance();
    const response = await api.get(endpoint, {
      updated_at__gte: since.toISOString(),
    });

    if (response.success && response.data?.results) {
      const data = Array.isArray(response.data.results) ? response.data.results : response.data;
      
      for (const item of data) {
        await this.updateLocalRecord(tableName, item);
      }
    }
  }

  private async updateLocalRecord(tableName: string, cloudData: any): Promise<void> {
    // Check for local version and handle conflicts
    const localData = await this.getLocalRecord(tableName, cloudData.id);
    
    if (localData && this.hasConflict(localData, cloudData)) {
      const resolution = await this.resolveConflict(localData, cloudData);
      await this.applyResolvedData(tableName, resolution.resolvedData || cloudData);
    } else {
      // No conflict, apply cloud data
      await this.applyCloudData(tableName, cloudData);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // CONFLICT RESOLUTION
  // ═══════════════════════════════════════════════════════════════

  private hasConflict(localData: any, cloudData: any): boolean {
    // Check if both versions have been modified since last sync
    const localUpdated = new Date(localData.updated_at || localData.updatedAt);
    const cloudUpdated = new Date(cloudData.updated_at || cloudData.updatedAt);
    
    // If local version is newer and hasn't been synced yet, there's a conflict
    return localUpdated > cloudUpdated && !localData.synced;
  }

  private async resolveConflict(localData: any, cloudData: any): Promise<ConflictResolution> {
    // Default strategy: Cloud wins (you can make this configurable)
    return {
      strategy: 'CLOUD_WINS',
      localData,
      cloudData,
      resolvedData: cloudData,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════

  private getApiEndpoint(tableName: string): string {
    const endpointMap: { [key: string]: string } = {
      patients: '/patients/',
      inventory: '/inventory/',
      prescriptions: '/prescriptions/',
      sales: '/sales/',
      suppliers: '/suppliers/',
      appointments: '/hospital/appointments/',
      admissions: '/hospital/admissions/',
      occupational_health: '/occupational-health/employee-records/',
    };
    
    return endpointMap[tableName] || `/${tableName}/`;
  }

  private async getLocalRecord(tableName: string, cloudId: string): Promise<any | null> {
    try {
      switch (tableName) {
        case 'patients':
          return await this.db.getPatientByCloudId(cloudId);
        case 'inventory':
          return await this.db.getInventoryItemByCloudId(cloudId);
        case 'prescriptions':
          return await this.db.getPrescriptionByCloudId(cloudId);
        case 'sales':
          return await this.db.getSaleByCloudId(cloudId);
        default:
          return null;
      }
    } catch (error) {
      return null;
    }
  }

  private async updateLocalRecordWithCloudId(tableName: string, localId: string, cloudId: string): Promise<void> {
    switch (tableName) {
      case 'patients':
        await this.db.updatePatientCloudId(localId, cloudId);
        break;
      case 'inventory':
        await this.db.updateInventoryItemCloudId(localId, cloudId);
        break;
      case 'prescriptions':
        await this.db.updatePrescriptionCloudId(localId, cloudId);
        break;
      case 'sales':
        await this.db.updateSaleCloudId(localId, cloudId);
        break;
    }
  }

  private async applyCloudData(tableName: string, cloudData: any): Promise<void> {
    switch (tableName) {
      case 'patients':
        await this.db.insertOrUpdatePatientFromCloud(cloudData);
        break;
      case 'inventory':
        await this.db.insertOrUpdateInventoryItemFromCloud(cloudData);
        break;
      case 'prescriptions':
        await this.db.insertOrUpdatePrescriptionFromCloud(cloudData);
        break;
      case 'sales':
        await this.db.insertOrUpdateSaleFromCloud(cloudData);
        break;
    }
  }

  private async applyResolvedData(tableName: string, resolvedData: any): Promise<void> {
    await this.applyCloudData(tableName, resolvedData);
  }

  private async cleanupSyncQueue(): Promise<void> {
    // Remove successfully synced items older than 24 hours
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    this.syncQueue = this.syncQueue.filter(item => 
      !item.synced || item.timestamp > cutoff
    );
    
    await this.saveSyncQueue();
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════

  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  async forceSync(): Promise<void> {
    await this.performSync();
  }

  async clearSyncQueue(): Promise<void> {
    this.syncQueue = [];
    this.syncStatus.pendingItems = 0;
    await this.saveSyncQueue();
  }

  async pauseSync(): Promise<void> {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  async resumeSync(): Promise<void> {
    this.startPeriodicSync();
    if (this.syncStatus.isOnline && !this.syncStatus.syncInProgress) {
      this.performSync();
    }
  }

  destroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
    }
  }
}

export default SyncService;