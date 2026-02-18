/**
 * Inventory Models — Complete pharmacy-grade inventory management.
 *
 * Relationships:
 *   Supplier ──┬── 1:N ── Product (a product can also have many suppliers)
 *              └── 1:N ── PurchaseOrder
 *
 *   Product  ──┬── 1:N ── InventoryItem (stock per facility / location)
 *              └── 1:N ── InventoryBatch (lot / expiry tracking)
 *
 *   InventoryItem ── 1:N ── StockMovement (every in/out is logged)
 *
 *   PurchaseOrder ── 1:N ── PurchaseOrderItem
 *
 *   InventoryAlert (low stock, expiry, reorder, recall)
 */

// ═══════════════════════════════════════════════════════════════
// SUPPLIER
// ═══════════════════════════════════════════════════════════════

export interface Supplier {
  id: string;
  organizationId: string;          // FK → Organization
  name: string;
  code: string;                    // Internal supplier code
  contactPerson: string;
  phone: string;
  altPhone?: string;
  email?: string;
  website?: string;
  address: string;
  city: string;
  country: string;
  taxId?: string;                  // Tax identification number
  licenseNumber?: string;          // Pharmaceutical distribution license
  paymentTerms: PaymentTerms;
  creditLimit?: number;
  currentBalance: number;          // Outstanding balance with supplier
  currency: string;                // CDF, USD, EUR
  bankName?: string;
  bankAccountNumber?: string;
  rating: number;                  // 1-5 supplier quality rating
  leadTimeDays: number;            // Average delivery time in days
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  
  // Cloud Sync Fields
  cloudId?: string; // ID from Django backend
  synced?: boolean; // Whether this record has been synced to cloud
}

export type PaymentTerms =
  | 'CASH_ON_DELIVERY'
  | 'NET_7'
  | 'NET_15'
  | 'NET_30'
  | 'NET_60'
  | 'NET_90'
  | 'PREPAID'
  | 'CREDIT';

export interface SupplierCreate extends Omit<Supplier, 'id' | 'createdAt' | 'isActive'> {
  id?: string;
  createdAt?: string;
  isActive?: boolean;
}

export interface SupplierUpdate extends Partial<Omit<Supplier, 'id' | 'organizationId' | 'createdAt'>> {
  updatedAt?: string;
}

// ═══════════════════════════════════════════════════════════════
// PRODUCT  (extends / replaces Drug for inventory purposes)
// ═══════════════════════════════════════════════════════════════

export interface Product {
  id: string;
  organizationId: string;          // FK → Organization

  // ─── Identification ───────────────────────────────────────
  name: string;                    // Commercial name
  genericName?: string;            // INN (International Non-proprietary Name)
  brandName?: string;
  sku: string;                     // Stock Keeping Unit — unique per org
  barcode?: string;                // EAN-13 / UPC / QR
  internalCode?: string;           // Internal pharmacy code

  // ─── Classification ───────────────────────────────────────
  category: ProductCategory;
  subCategory?: string;
  therapeuticClass?: string;       // ATC classification
  controlledSubstance: boolean;
  requiresPrescription: boolean;
  scheduledDrug?: ScheduledDrugClass;

  // ─── Formulation ──────────────────────────────────────────
  dosageForm: DosageForm;
  strength?: string;               // e.g. "500mg", "10mg/5ml"
  unitOfMeasure: UnitOfMeasure;    // The smallest dispensing unit
  packSize: number;                // How many units per pack
  packType?: string;               // "blister", "bottle", "box", "tube"
  activeIngredients: string[];     // JSON array
  concentration?: string;          // e.g. "10mg/ml"

  // ─── Manufacturer ─────────────────────────────────────────
  manufacturer: string;
  countryOfOrigin?: string;
  registrationNumber?: string;     // Drug registration / marketing auth

  // ─── Clinical Info ────────────────────────────────────────
  indication?: string;
  contraindication?: string;
  sideEffects?: string;
  dosageInstructions?: string;
  storageConditions?: StorageCondition;
  warnings?: string;

  // ─── Pricing ──────────────────────────────────────────────
  costPrice: number;               // Purchase / landed cost per unit
  sellingPrice: number;            // Retail price per unit
  wholesalePrice?: number;         // Wholesale price per unit
  currency: string;
  taxRate: number;                 // Tax percentage (e.g. 16)
  marginPercent?: number;          // Auto-calculated profit margin
  insuranceReimbursable: boolean;
  insuranceCode?: string;          // NHIS / insurance billing code

  // ─── Inventory Thresholds ─────────────────────────────────
  reorderLevel: number;            // When stock hits this → alert
  reorderQuantity: number;         // Default qty to reorder
  minStockLevel: number;           // Absolute minimum
  maxStockLevel: number;           // Maximum recommended
  safetyStockDays: number;         // Buffer stock in days of usage

  // ─── Status ───────────────────────────────────────────────
  isActive: boolean;
  isDiscontinued: boolean;
  discontinuedDate?: string;
  primarySupplierId?: string;      // FK → Supplier (preferred)
  alternateSupplierIds?: string[]; // FK[] → Supplier

  // ─── Media ────────────────────────────────────────────────
  imageUrl?: string;
  thumbnailUrl?: string;

  // ─── Meta ─────────────────────────────────────────────────
  tags?: string[];
  notes?: string;
  expirationDate?: string;         // General product expiration/shelf life date
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
}

export type ProductCategory =
  | 'MEDICATION'
  | 'OTC'                          // Over-The-Counter
  | 'SUPPLEMENT'
  | 'MEDICAL_DEVICE'
  | 'SURGICAL_SUPPLY'
  | 'CONSUMABLE'
  | 'COSMETIC'
  | 'BABY_CARE'
  | 'PERSONAL_HYGIENE'
  | 'LAB_REAGENT'
  | 'VETERINARY'
  | 'OTHER';

export type DosageForm =
  | 'TABLET'
  | 'CAPSULE'
  | 'SYRUP'
  | 'SUSPENSION'
  | 'INJECTION'
  | 'CREAM'
  | 'OINTMENT'
  | 'GEL'
  | 'DROPS'
  | 'INHALER'
  | 'SUPPOSITORY'
  | 'PATCH'
  | 'POWDER'
  | 'SOLUTION'
  | 'SPRAY'
  | 'LOZENGE'
  | 'INFUSION'
  | 'IMPLANT'
  | 'DEVICE'
  | 'OTHER';

export type UnitOfMeasure =
  | 'UNIT'        // Each / piece
  | 'TABLET'
  | 'CAPSULE'
  | 'ML'          // Millilitre
  | 'MG'          // Milligram
  | 'G'           // Gram
  | 'VIAL'
  | 'AMPOULE'
  | 'BOTTLE'
  | 'BOX'
  | 'PACK'
  | 'STRIP'
  | 'TUBE'
  | 'SACHET'
  | 'PAIR'
  | 'SET';

export type StorageCondition =
  | 'ROOM_TEMPERATURE'             // 15-25 °C
  | 'COOL_DRY_PLACE'              // < 25 °C
  | 'REFRIGERATED'                // 2-8 °C
  | 'FROZEN'                      // -20 °C
  | 'DEEP_FROZEN'                 // -70 °C
  | 'PROTECT_FROM_LIGHT'
  | 'PROTECT_FROM_MOISTURE';

export type ScheduledDrugClass =
  | 'SCHEDULE_I'     // No medical use, high abuse (e.g. heroin)
  | 'SCHEDULE_II'    // High abuse potential (e.g. morphine)
  | 'SCHEDULE_III'   // Moderate abuse (e.g. codeine combinations)
  | 'SCHEDULE_IV'    // Low abuse (e.g. diazepam)
  | 'SCHEDULE_V'     // Lowest abuse (e.g. cough preparations)
  | 'UNSCHEDULED';

export interface ProductCreate extends Omit<Product, 'id' | 'createdAt' | 'isActive' | 'isDiscontinued'> {
  id?: string;
  createdAt?: string;
  isActive?: boolean;
  isDiscontinued?: boolean;
}

export interface ProductUpdate extends Partial<Omit<Product, 'id' | 'organizationId' | 'createdAt'>> {
  updatedAt?: string;
}

// ═══════════════════════════════════════════════════════════════
// INVENTORY ITEM  (stock of a product at a specific location)
// ═══════════════════════════════════════════════════════════════

export interface InventoryItem {
  id: string;
  organizationId: string;          // FK → Organization
  productId: string;               // FK → Product
  facilityId: string;              // FK → Pharmacy or Hospital ward
  facilityType: 'PHARMACY' | 'HOSPITAL_WARD' | 'WAREHOUSE';

  // ─── Stock Levels ─────────────────────────────────────────
  quantityOnHand: number;          // Physical stock right now
  quantityReserved: number;        // Reserved for pending orders / prescriptions
  quantityAvailable: number;       // onHand – reserved (virtual)
  quantityOnOrder: number;         // Qty in open purchase orders
  quantityDamaged: number;         // Damaged / quarantined
  quantityExpired: number;         // Expired stock not yet disposed

  // ─── Location ─────────────────────────────────────────────
  shelfLocation?: string;          // e.g. "A3-R2-S4" (Aisle-Rack-Shelf)
  binNumber?: string;              // Specific bin
  zone?: string;                   // Controlled, Refrigerated, General

  // ─── Valuation ────────────────────────────────────────────
  averageCost: number;             // Weighted average cost
  totalStockValue: number;         // onHand × averageCost
  lastPurchasePrice: number;
  lastPurchaseDate?: string;

  // ─── Movement Stats ───────────────────────────────────────
  averageDailyUsage: number;       // Rolling average
  daysOfStockRemaining: number;    // onHand / dailyUsage
  lastMovementDate?: string;
  lastCountDate?: string;          // Physical inventory count

  // ─── Status ───────────────────────────────────────────────
  status: InventoryStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  
  // Cloud Sync Fields
  cloudId?: string; // ID from Django backend
  synced?: boolean; // Whether this record has been synced to cloud
}

export type InventoryStatus =
  | 'IN_STOCK'
  | 'LOW_STOCK'
  | 'OUT_OF_STOCK'
  | 'OVER_STOCK'
  | 'DISCONTINUED'
  | 'QUARANTINED';

export interface InventoryItemCreate extends Omit<InventoryItem, 'id' | 'createdAt' | 'isActive'> {
  id?: string;
  createdAt?: string;
  isActive?: boolean;
}

export interface InventoryItemUpdate extends Partial<Omit<InventoryItem, 'id' | 'organizationId' | 'productId' | 'createdAt'>> {
  updatedAt?: string;
}

// ═══════════════════════════════════════════════════════════════
// INVENTORY BATCH  (lot / expiry tracking per product per location)
// ═══════════════════════════════════════════════════════════════

export interface InventoryBatch {
  id: string;
  inventoryItemId: string;         // FK → InventoryItem
  productId: string;               // FK → Product (denormalised for speed)

  // ─── Lot Info ─────────────────────────────────────────────
  batchNumber: string;             // Manufacturer batch / lot number
  serialNumber?: string;           // For serialised products
  quantity: number;                // Current qty in this batch
  initialQuantity: number;         // Qty received originally
  costPrice: number;               // Purchase cost per unit for this batch

  // ─── Dates ────────────────────────────────────────────────
  manufacturingDate?: string;
  expiryDate: string;              // Critical for pharmacy
  receivedDate: string;            // When batch was received
  lastDispensedDate?: string;

  // ─── Status ───────────────────────────────────────────────
  status: BatchStatus;
  isQuarantined: boolean;
  quarantineReason?: string;
  disposalDate?: string;
  disposalMethod?: string;
  disposalApprovedBy?: string;     // FK → User

  // ─── Supplier ─────────────────────────────────────────────
  supplierId?: string;             // FK → Supplier
  purchaseOrderId?: string;        // FK → PurchaseOrder
  invoiceNumber?: string;

  // ─── Meta ─────────────────────────────────────────────────
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type BatchStatus =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'EXPIRED'
  | 'QUARANTINED'
  | 'RECALLED'
  | 'DAMAGED'
  | 'DISPOSED'
  | 'RETURNED';

export interface InventoryBatchCreate extends Omit<InventoryBatch, 'id' | 'createdAt'> {
  id?: string;
  createdAt?: string;
}

export interface InventoryBatchUpdate extends Partial<Omit<InventoryBatch, 'id' | 'inventoryItemId' | 'productId' | 'createdAt'>> {
  updatedAt?: string;
}

// ═══════════════════════════════════════════════════════════════
// STOCK MOVEMENT  (every in / out is an immutable audit log)
// ═══════════════════════════════════════════════════════════════

export interface StockMovement {
  id: string;
  organizationId: string;          // FK → Organization
  inventoryItemId: string;         // FK → InventoryItem
  productId: string;               // FK → Product (denormalised)
  batchId?: string;                // FK → InventoryBatch

  // ─── Movement Details ─────────────────────────────────────
  movementType: MovementType;
  direction: 'IN' | 'OUT';
  quantity: number;                // Always positive
  unitCost: number;                // Cost at time of movement
  totalCost: number;               // quantity × unitCost

  // ─── Running Balance ──────────────────────────────────────
  previousBalance: number;         // Stock before this movement
  newBalance: number;              // Stock after this movement

  // ─── Source / Destination ─────────────────────────────────
  sourceFacilityId?: string;       // For transfers – where it came from
  destinationFacilityId?: string;  // For transfers – where it went
  referenceType?: MovementReferenceType;
  referenceId?: string;            // FK → PurchaseOrder, Sale, Prescription, etc.
  referenceNumber?: string;        // Human-readable ref (invoice #, Rx #)

  // ─── Who / When ───────────────────────────────────────────
  performedBy: string;             // FK → User
  approvedBy?: string;             // FK → User (for high-value movements)
  movementDate: string;            // When it physically happened
  reason?: string;
  notes?: string;

  // ─── Meta ─────────────────────────────────────────────────
  createdAt: string;
  updatedAt?: string;
}

export type MovementType =
  | 'PURCHASE_RECEIPT'    // Goods received from supplier
  | 'SALE'                // POS / counter sale
  | 'PRESCRIPTION'        // Dispensed on prescription
  | 'TRANSFER_IN'         // Inter-facility transfer in
  | 'TRANSFER_OUT'        // Inter-facility transfer out
  | 'RETURN_TO_SUPPLIER'  // Returned to supplier
  | 'CUSTOMER_RETURN'     // Customer returned
  | 'ADJUSTMENT_IN'       // Physical count adjustment +
  | 'ADJUSTMENT_OUT'      // Physical count adjustment -
  | 'DAMAGED'             // Written off as damaged
  | 'EXPIRED'             // Written off as expired
  | 'DISPOSAL'            // Destroyed / disposed
  | 'DONATION'            // Donated stock
  | 'INITIAL_STOCK'       // Opening balance
  | 'PRODUCTION'          // Compound pharmacy – produced
  | 'SAMPLE'              // Free sample given out
  | 'RECALL';             // Manufacturer recall

export type MovementReferenceType =
  | 'PURCHASE_ORDER'
  | 'SALE_INVOICE'
  | 'PRESCRIPTION'
  | 'TRANSFER_ORDER'
  | 'RETURN_NOTE'
  | 'ADJUSTMENT'
  | 'DISPOSAL_RECORD';

export interface StockMovementCreate extends Omit<StockMovement, 'id' | 'createdAt'> {
  id?: string;
  createdAt?: string;
}

// ═══════════════════════════════════════════════════════════════
// PURCHASE ORDER
// ═══════════════════════════════════════════════════════════════

export interface PurchaseOrder {
  id: string;
  organizationId: string;          // FK → Organization
  supplierId: string;              // FK → Supplier
  facilityId: string;              // FK → Pharmacy or Hospital receiving

  // ─── PO Header ────────────────────────────────────────────
  poNumber: string;                // Auto-generated PO-20260211-001
  status: PurchaseOrderStatus;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  orderDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;

  // ─── Financials ───────────────────────────────────────────
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  shippingCost: number;
  totalAmount: number;
  currency: string;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  paymentDate?: string;
  paymentReference?: string;

  // ─── Approvals ────────────────────────────────────────────
  createdBy: string;               // FK → User
  approvedBy?: string;             // FK → User
  approvalDate?: string;
  receivedBy?: string;             // FK → User
  receivedDate?: string;

  // ─── Shipping ─────────────────────────────────────────────
  deliveryAddress?: string;
  trackingNumber?: string;
  shippingMethod?: string;

  // ─── Meta ─────────────────────────────────────────────────
  notes?: string;
  internalNotes?: string;
  attachments?: string[];          // File paths or URLs
  createdAt: string;
  updatedAt?: string;
}

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'ORDERED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED'
  | 'RETURNED';

export type PaymentStatus =
  | 'UNPAID'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'REFUNDED';

export interface PurchaseOrderCreate extends Omit<PurchaseOrder, 'id' | 'createdAt'> {
  id?: string;
  createdAt?: string;
}

export interface PurchaseOrderUpdate extends Partial<Omit<PurchaseOrder, 'id' | 'organizationId' | 'createdAt'>> {
  updatedAt?: string;
}

// ═══════════════════════════════════════════════════════════════
// PURCHASE ORDER ITEM  (line items)
// ═══════════════════════════════════════════════════════════════

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;         // FK → PurchaseOrder
  productId: string;               // FK → Product

  // ─── Quantities ───────────────────────────────────────────
  quantityOrdered: number;
  quantityReceived: number;
  quantityDamaged: number;
  quantityReturned: number;

  // ─── Pricing ──────────────────────────────────────────────
  unitPrice: number;               // Price per unit on PO
  discount: number;                // Per-line discount amount
  taxRate: number;
  taxAmount: number;
  lineTotal: number;               // (qty × price) – discount + tax

  // ─── Batch Info (filled on receipt) ───────────────────────
  batchNumber?: string;
  expiryDate?: string;
  manufacturingDate?: string;

  // ─── Status ───────────────────────────────────────────────
  status: 'PENDING' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED' | 'BACK_ORDERED';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PurchaseOrderItemCreate extends Omit<PurchaseOrderItem, 'id' | 'createdAt'> {
  id?: string;
  createdAt?: string;
}

// ═══════════════════════════════════════════════════════════════
// INVENTORY ALERT
// ═══════════════════════════════════════════════════════════════

export interface InventoryAlert {
  id: string;
  organizationId: string;          // FK → Organization
  productId: string;               // FK → Product
  inventoryItemId?: string;        // FK → InventoryItem
  batchId?: string;                // FK → InventoryBatch

  // ─── Alert Details ────────────────────────────────────────
  alertType: AlertType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;

  // ─── Thresholds (for stock alerts) ────────────────────────
  currentValue?: number;           // e.g. current stock level
  thresholdValue?: number;         // e.g. reorder level
  expiryDate?: string;             // For expiry alerts
  daysUntilExpiry?: number;

  // ─── Resolution ───────────────────────────────────────────
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED' | 'AUTO_RESOLVED';
  acknowledgedBy?: string;         // FK → User
  acknowledgedAt?: string;
  resolvedBy?: string;             // FK → User
  resolvedAt?: string;
  resolutionNotes?: string;

  // ─── Meta ─────────────────────────────────────────────────
  createdAt: string;
  updatedAt?: string;
}

export type AlertType =
  | 'LOW_STOCK'
  | 'OUT_OF_STOCK'
  | 'OVER_STOCK'
  | 'EXPIRING_SOON'        // Within configurable days (e.g. 90)
  | 'EXPIRED'
  | 'RECALL'
  | 'REORDER_POINT'
  | 'PRICE_CHANGE'
  | 'SLOW_MOVING'          // No movement in X days
  | 'DAMAGED_STOCK'
  | 'TEMPERATURE_EXCURSION';

export interface InventoryAlertCreate extends Omit<InventoryAlert, 'id' | 'createdAt'> {
  id?: string;
  createdAt?: string;
}

// ═══════════════════════════════════════════════════════════════
// STOCK COUNT  (physical inventory / cycle count)
// ═══════════════════════════════════════════════════════════════

export interface StockCount {
  id: string;
  organizationId: string;          // FK → Organization
  facilityId: string;              // FK → Pharmacy / Hospital

  // ─── Count Header ────────────────────────────────────────
  countNumber: string;             // Auto-generated SC-20260211-001
  countType: 'FULL' | 'CYCLE' | 'SPOT' | 'ANNUAL';
  status: 'PLANNED' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'COMPLETED' | 'CANCELLED';
  scheduledDate: string;
  startedAt?: string;
  completedAt?: string;

  // ─── Scope ────────────────────────────────────────────────
  zone?: string;                   // Restrict to a zone / aisle
  category?: string;               // Restrict to product category

  // ─── Stats ────────────────────────────────────────────────
  totalItems: number;
  itemsCounted: number;
  discrepancyCount: number;
  totalVarianceValue: number;      // Cost of discrepancies

  // ─── People ───────────────────────────────────────────────
  assignedTo: string[];            // FK[] → User
  supervisedBy?: string;           // FK → User
  approvedBy?: string;             // FK → User

  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StockCountItem {
  id: string;
  stockCountId: string;            // FK → StockCount
  productId: string;               // FK → Product
  inventoryItemId: string;         // FK → InventoryItem
  batchId?: string;                // FK → InventoryBatch

  // ─── Quantities ───────────────────────────────────────────
  systemQuantity: number;          // What the system says
  countedQuantity: number;         // What was physically counted
  variance: number;                // counted – system
  varianceValue: number;           // variance × averageCost
  variancePercent: number;         // (variance / system) × 100

  // ─── Resolution ───────────────────────────────────────────
  adjustmentApplied: boolean;
  adjustmentMovementId?: string;   // FK → StockMovement
  reason?: string;

  countedBy: string;               // FK → User
  countedAt: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

// ═══════════════════════════════════════════════════════════════
// UTILITY HELPERS
// ═══════════════════════════════════════════════════════════════

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export class InventoryUtils {
  /**
   * Calculate available quantity (on-hand minus reserved)
   */
  static getAvailable(item: InventoryItem): number {
    return Math.max(0, item.quantityOnHand - item.quantityReserved);
  }

  /**
   * Determine inventory status based on thresholds
   */
  static calculateStatus(item: InventoryItem, product: Product): InventoryStatus {
    const available = this.getAvailable(item);
    if (available <= 0) return 'OUT_OF_STOCK';
    if (available <= product.minStockLevel) return 'LOW_STOCK';
    if (available >= product.maxStockLevel) return 'OVER_STOCK';
    return 'IN_STOCK';
  }

  /**
   * Calculate days of stock remaining
   */
  static daysRemaining(item: InventoryItem): number {
    if (item.averageDailyUsage <= 0) return 999;
    return Math.floor(item.quantityOnHand / item.averageDailyUsage);
  }

  /**
   * Check if any batch is expiring within threshold
   */
  static hasExpiringBatches(batches: InventoryBatch[], thresholdDays: number = 90): boolean {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + thresholdDays);
    return batches.some(
      (b) => b.status === 'AVAILABLE' && new Date(b.expiryDate) <= cutoff,
    );
  }

  /**
   * Get expired batches
   */
  static getExpiredBatches(batches: InventoryBatch[]): InventoryBatch[] {
    const now = new Date();
    return batches.filter(
      (b) => b.status === 'AVAILABLE' && new Date(b.expiryDate) < now,
    );
  }

  /**
   * FEFO sort — First Expired, First Out
   */
  static sortBatchesFEFO(batches: InventoryBatch[]): InventoryBatch[] {
    return [...batches]
      .filter((b) => b.status === 'AVAILABLE' && b.quantity > 0)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  }

  /**
   * Calculate total stock value
   */
  static calculateStockValue(item: InventoryItem): number {
    return item.quantityOnHand * item.averageCost;
  }

  /**
   * Calculate profit margin percentage
   */
  static calculateMargin(costPrice: number, sellingPrice: number): number {
    if (sellingPrice <= 0) return 0;
    return ((sellingPrice - costPrice) / sellingPrice) * 100;
  }

  /**
   * Determine if reorder is needed
   */
  static needsReorder(item: InventoryItem, product: Product): boolean {
    return this.getAvailable(item) <= product.reorderLevel;
  }

  /**
   * Generate PO number
   */
  static generatePONumber(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const seq = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PO-${date}-${seq}`;
  }

  /**
   * Generate Stock Count number
   */
  static generateCountNumber(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const seq = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `SC-${date}-${seq}`;
  }

  /**
   * Get alert severity based on stock level
   */
  static getAlertSeverity(item: InventoryItem, product: Product): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const available = this.getAvailable(item);
    if (available <= 0) return 'CRITICAL';
    if (available <= product.minStockLevel) return 'HIGH';
    if (available <= product.reorderLevel) return 'MEDIUM';
    return 'LOW';
  }
}
