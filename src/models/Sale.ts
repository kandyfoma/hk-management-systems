/**
 * Sale / POS Models — Complete pharmacy point-of-sale system.
 *
 * Relationships:
 *   Sale ──┬── 1:N ── SaleItem      (line items)
 *          ├── 1:N ── SalePayment   (split-payment support)
 *          └── N:1 ── Patient       (optional, for prescription sales)
 *
 *   SaleItem ── N:1 ── Product
 *
 * Flow:
 *   Cart → Checkout → Payment → Sale created → Stock deducted → Receipt generated
 */

// ═══════════════════════════════════════════════════════════════
// SALE (completed transaction)
// ═══════════════════════════════════════════════════════════════

export interface Sale {
  id: string;
  organizationId: string;        // FK → Organization
  facilityId: string;            // FK → Pharmacy / location

  // ─── Identification ─────────────────────────────────────
  saleNumber: string;            // e.g. "VNT-20260211-001"
  receiptNumber: string;         // e.g. "REC-20260211-001"
  type: SaleType;

  // ─── Customer ───────────────────────────────────────────
  customerId?: string;           // FK → Patient (optional)
  customerName?: string;         // Walk-in customer name
  customerPhone?: string;
  prescriptionId?: string;       // FK → Prescription (if Rx sale)

  // ─── Line Items ─────────────────────────────────────────
  items: SaleItem[];
  itemCount: number;             // Total number of line items
  totalQuantity: number;         // Total quantity across all items

  // ─── Financials ─────────────────────────────────────────
  subtotal: number;              // Sum of line totals before tax/discount
  discountType: 'PERCENTAGE' | 'FIXED' | 'NONE';
  discountValue: number;         // The discount rate or amount
  discountAmount: number;        // Actual discount in currency
  taxAmount: number;             // Total tax
  totalAmount: number;           // Final amount (subtotal - discount + tax)
  currency: string;

  // ─── Payment ────────────────────────────────────────────
  payments: SalePayment[];
  totalPaid: number;
  changeGiven: number;
  paymentStatus: SalePaymentStatus;

  // ─── Status ─────────────────────────────────────────────
  status: SaleStatus;
  voidReason?: string;
  voidedBy?: string;
  voidedAt?: string;

  // ─── Staff ──────────────────────────────────────────────
  cashierId: string;             // FK → User
  cashierName: string;

  // ─── Meta ───────────────────────────────────────────────
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type SaleType =
  | 'COUNTER'           // Walk-in counter sale
  | 'PRESCRIPTION'      // Prescription-based sale
  | 'INSURANCE'         // Insurance claim sale
  | 'WHOLESALE'         // Bulk / wholesale
  | 'RETURN';           // Return / refund

export type SaleStatus =
  | 'COMPLETED'
  | 'VOIDED'
  | 'REFUNDED'
  | 'PARTIAL_REFUND'
  | 'ON_HOLD';

export type SalePaymentStatus =
  | 'PAID'
  | 'PARTIAL'
  | 'UNPAID'
  | 'REFUNDED';

// ═══════════════════════════════════════════════════════════════
// SALE ITEM (line item in a sale)
// ═══════════════════════════════════════════════════════════════

export interface SaleItem {
  id: string;
  saleId: string;                // FK → Sale
  productId: string;             // FK → Product
  batchId?: string;              // FK → InventoryBatch (FEFO auto-selected)
  inventoryItemId?: string;      // FK → InventoryItem

  // ─── Product Snapshot ───────────────────────────────────
  productName: string;           // Snapshot at time of sale
  productSku: string;
  genericName?: string;
  dosageForm?: string;
  strength?: string;
  requiresPrescription: boolean;

  // ─── Quantities ─────────────────────────────────────────
  quantity: number;
  returnedQuantity: number;

  // ─── Pricing ────────────────────────────────────────────
  unitPrice: number;             // Selling price per unit
  costPrice: number;             // Cost at time of sale (for margin)
  discountPercent: number;       // Per-line discount
  discountAmount: number;        // Computed discount
  taxRate: number;               // Tax percentage
  taxAmount: number;             // Computed tax
  lineTotal: number;             // (qty × price) - discount + tax

  // ─── Meta ───────────────────────────────────────────────
  notes?: string;
}

// ═══════════════════════════════════════════════════════════════
// SALE PAYMENT (supports split payment across methods)
// ═══════════════════════════════════════════════════════════════

export interface SalePayment {
  id: string;
  saleId: string;                // FK → Sale
  method: PaymentMethod;
  amount: number;
  reference?: string;            // Cheque #, Mobile Money txn ID, etc.
  receivedAt: string;
}

export type PaymentMethod =
  | 'CASH'
  | 'MOBILE_MONEY'       // M-Pesa, Airtel Money, Orange Money
  | 'CARD'               // Debit / Credit
  | 'BANK_TRANSFER'
  | 'CHEQUE'
  | 'INSURANCE'
  | 'CREDIT'             // On-account / pay later
  | 'OTHER';

// ═══════════════════════════════════════════════════════════════
// CART (in-memory session, not persisted)
// ═══════════════════════════════════════════════════════════════

export interface CartItem {
  productId: string;
  product: {
    name: string;
    sku: string;
    genericName?: string;
    strength?: string;
    dosageForm?: string;
    category: string;
    requiresPrescription: boolean;
    sellingPrice: number;
    costPrice: number;
    taxRate: number;
    currency: string;
    barcode?: string;
    imageUrl?: string;
  };
  quantity: number;
  unitPrice: number;            // May differ from product price (manual override)
  discountPercent: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
  inventoryItemId?: string;
  batchId?: string;
  maxQuantity: number;          // Available stock
  notes?: string;
}

export interface CartState {
  items: CartItem[];
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  prescriptionId?: string;
  saleType: SaleType;
  globalDiscountType: 'PERCENTAGE' | 'FIXED' | 'NONE';
  globalDiscountValue: number;
}

export interface CartTotals {
  itemCount: number;
  totalQuantity: number;
  subtotal: number;
  lineDiscounts: number;
  globalDiscount: number;
  totalDiscount: number;
  taxTotal: number;
  grandTotal: number;
}

// ═══════════════════════════════════════════════════════════════
// CREATE / UPDATE INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface SaleCreate extends Omit<Sale, 'id' | 'createdAt'> {
  id?: string;
  createdAt?: string;
}

// ═══════════════════════════════════════════════════════════════
// UTILITY CLASS
// ═══════════════════════════════════════════════════════════════

export class SaleUtils {
  /**
   * Compute line-level totals for a cart item
   */
  static computeLineItem(item: CartItem): CartItem {
    const baseTotal = item.quantity * item.unitPrice;
    const clampedPercent = Math.max(0, Math.min(100, item.discountPercent));
    const discountAmount = clampedPercent > 0
      ? baseTotal * (clampedPercent / 100)
      : 0;
    const afterDiscount = Math.max(0, baseTotal - discountAmount);
    const taxAmount = afterDiscount * (item.product.taxRate / 100);
    const lineTotal = afterDiscount + taxAmount;

    return {
      ...item,
      discountPercent: clampedPercent,
      discountAmount: Math.round(discountAmount * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      lineTotal: Math.round(lineTotal * 100) / 100,
    };
  }

  /**
   * Compute full cart totals
   */
  static computeCartTotals(cart: CartState): CartTotals {
    const itemCount = cart.items.length;
    const totalQuantity = cart.items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = cart.items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
    const lineDiscounts = cart.items.reduce((sum, i) => sum + i.discountAmount, 0);

    let globalDiscount = 0;
    const afterLineDiscounts = Math.max(0, subtotal - lineDiscounts);
    if (cart.globalDiscountType === 'PERCENTAGE') {
      const clampedPct = Math.min(100, Math.max(0, cart.globalDiscountValue));
      globalDiscount = afterLineDiscounts * (clampedPct / 100);
    } else if (cart.globalDiscountType === 'FIXED') {
      globalDiscount = Math.min(Math.max(0, cart.globalDiscountValue), afterLineDiscounts);
    }

    const totalDiscount = lineDiscounts + globalDiscount;
    const taxTotal = cart.items.reduce((sum, i) => sum + i.taxAmount, 0);
    const grandTotal = Math.max(0, subtotal - totalDiscount + taxTotal);

    return {
      itemCount,
      totalQuantity,
      subtotal: Math.round(subtotal * 100) / 100,
      lineDiscounts: Math.round(lineDiscounts * 100) / 100,
      globalDiscount: Math.round(globalDiscount * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      taxTotal: Math.round(taxTotal * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
    };
  }

  /**
   * Generate sale number
   */
  static generateSaleNumber(): string {
    const d = new Date();
    const dateStr = `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;
    const seq = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `VNT-${dateStr}-${seq}`;
  }

  /**
   * Generate receipt number
   */
  static generateReceiptNumber(): string {
    const d = new Date();
    const dateStr = `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;
    const seq = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `REC-${dateStr}-${seq}`;
  }

  /**
   * Create an empty cart
   */
  static createEmptyCart(): CartState {
    return {
      items: [],
      saleType: 'COUNTER',
      globalDiscountType: 'NONE',
      globalDiscountValue: 0,
    };
  }

  /**
   * Format currency
   */
  static formatCurrency(amount: number, currency = 'USD'): string {
    if (currency === 'CDF') return `${amount.toLocaleString()} FC`;
    return `$${amount.toFixed(2)}`;
  }

  /**
   * Format date-time
   */
  static formatDateTime(isoStr: string): string {
    const d = new Date(isoStr);
    return d.toLocaleDateString('fr-CD', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Format time only
   */
  static formatTime(isoStr: string): string {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('fr-CD', { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Get payment method label
   */
  static getPaymentMethodLabel(method: PaymentMethod): string {
    const labels: Record<PaymentMethod, string> = {
      CASH: 'Espèces',
      MOBILE_MONEY: 'Mobile Money',
      CARD: 'Carte bancaire',
      BANK_TRANSFER: 'Virement',
      CHEQUE: 'Chèque',
      INSURANCE: 'Assurance',
      CREDIT: 'Crédit',
      OTHER: 'Autre',
    };
    return labels[method] || method;
  }

  /**
   * Get payment method icon
   */
  static getPaymentMethodIcon(method: PaymentMethod): string {
    const icons: Record<PaymentMethod, string> = {
      CASH: 'cash',
      MOBILE_MONEY: 'phone-portrait',
      CARD: 'card',
      BANK_TRANSFER: 'swap-horizontal',
      CHEQUE: 'document-text',
      INSURANCE: 'shield-checkmark',
      CREDIT: 'time',
      OTHER: 'ellipsis-horizontal',
    };
    return icons[method] || 'cash';
  }
}
