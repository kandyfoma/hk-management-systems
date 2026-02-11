/**
 * DatabaseService — In-Memory database that works on Web, Android & iOS.
 * Replaces expo-sqlite with a plain JS in-memory store.
 * All data persists for the lifetime of the app session.
 */

import { User, UserCreate } from '../models/User';
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

// ═══════════════════════════════════════════════════════════════
// In-Memory Tables
// ═══════════════════════════════════════════════════════════════

interface Tables {
  organizations: Organization[];
  licenses: License[];
  users: User[];
  user_module_access: UserModuleAccess[];
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
}

// ═══════════════════════════════════════════════════════════════
// Service
// ═══════════════════════════════════════════════════════════════

export class DatabaseService {
  private static instance: DatabaseService;
  private tables: Tables = {
    organizations: [],
    licenses: [],
    users: [],
    user_module_access: [],
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
      createdAt: now,
    };

    this.tables.sales.push(sale);

    // ── Deduct stock & log movements ───────────────────────
    for (const item of cart.items) {
      if (!item.inventoryItemId) continue;
      const invItem = this.tables.inventory_items.find((i) => i.id === item.inventoryItemId);
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
          'pos_system',
          'patient_management',
          'basic_inventory',
          'appointment_scheduling',
          'basic_reporting',
          'prescription_management',
          'stock_alerts',
          'supplier_management',
          'medical_records',
          'lab_integration',
          'multi_department',
          'basic_billing',
          'advanced_reporting',
          'staff_management',
          'advanced_scheduling',
          'billing_management',
          'advanced_inventory',
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
          'pos_system',
          'basic_inventory',
          'advanced_inventory',
          'prescription_management',
          'supplier_management',
          'stock_alerts',
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
    } catch (error) {
      console.error('Error inserting test data:', error);
    }
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
}

export default DatabaseService;
