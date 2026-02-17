/**
 * Hospital Invoice & Service Catalog Models
 * 
 * Hospital billing system for itemized invoices that accumulate
 * all charges throughout a patient's visit/admission.
 * Separate from POS sales which are for pharmacy/retail items.
 */

export interface HospitalInvoice {
  id: string;
  encounterId: string;            // → Encounter
  patientId: string;              // → Patient
  organizationId: string;         // → Organization
  facilityId: string;             // → Hospital
  invoiceNumber: string;          // Auto-generated: "INV260001"
  
  // Invoice details
  date: string;                   // ISO date when invoice generated
  dueDate?: string;               // Payment due date
  status: InvoiceStatus;
  type: InvoiceType;
  
  // Line items
  items: InvoiceItem[];
  
  // Financial totals
  subtotal: number;               // Sum of all line items
  taxAmount: number;              // Total tax
  discountAmount: number;         // Total discounts
  totalAmount: number;            // Final amount due
  
  // Payment tracking
  amountPaid: number;             // Total paid so far
  amountDue: number;              // Remaining balance
  paymentHistory: InvoicePayment[]; // Payment records
  
  // Insurance handling
  insuranceCoveredAmount: number; // What insurance covers
  patientResponsibility: number;  // What patient owes
  insuranceClaimId?: string;      // → InsuranceClaim
  
  // Billing information
  currency: string;               // "CDF", "USD"
  billingAddress?: string;        // Patient billing address
  taxRate: number;                // Tax percentage (e.g., 16 for 16%)
  
  // Clinical context
  primaryDiagnosis?: string;      // Main diagnosis for billing
  diagnosisCodes?: string[];      // ICD-10 codes
  admissionId?: string;           // → Admission (if inpatient)
  
  // Staff information
  billingClerkId?: string;        // → User (who prepared bill)
  approvedBy?: string;            // → User (who approved charges)
  
  // Notes and references
  notes?: string;                 // Billing notes
  internalNotes?: string;         // Internal staff notes
  externalReference?: string;     // Insurance/external ref number
  
  // Metadata
  createdAt: string;              // ISO timestamp
  updatedAt?: string;             // ISO timestamp
  finalizedAt?: string;           // When invoice was finalized
  metadata?: Record<string, any>; // Extensible data
}

export type InvoiceStatus = 
  | 'draft'                       // Being prepared, not sent to patient
  | 'pending'                     // Sent to patient, awaiting payment
  | 'partially_paid'              // Some payment received
  | 'paid'                        // Fully paid
  | 'overdue'                     // Past due date
  | 'disputed'                    // Patient disputes charges
  | 'cancelled'                   // Invoice cancelled
  | 'written_off'                 // Bad debt write-off
  | 'insurance_pending'           // Waiting for insurance payment
  | 'insurance_denied';           // Insurance claim rejected

export type InvoiceType = 
  | 'outpatient'                  // OPD visit charges
  | 'inpatient'                   // Hospital stay charges
  | 'emergency'                   // Emergency department
  | 'day_case'                    // Day surgery/procedure
  | 'consultation_only'           // Doctor consultation only
  | 'lab_only'                    // Laboratory tests only
  | 'imaging_only'                // Radiology only
  | 'pharmacy_only'               // Medications only
  | 'comprehensive';              // Multiple services

export interface InvoiceItem {
  id: string;
  invoiceId: string;              // → HospitalInvoice
  serviceId: string;              // → ServiceCatalog
  category: ServiceCategory;
  description: string;            // Service description
  
  // Quantity and pricing
  quantity: number;               // Number of units (days, procedures, etc.)
  unitPrice: number;              // Price per unit
  totalPrice: number;             // quantity × unitPrice
  discountAmount?: number;        // Item-level discount
  netPrice: number;               // totalPrice - discountAmount
  
  // Service details
  serviceDate: string;            // ISO date when service provided
  serviceTime?: string;           // Time when service provided
  providedBy?: string;            // → User (doctor, nurse, technician)
  departmentId?: string;          // Which department provided service
  
  // Clinical references
  referenceId?: string;           // Link to specific record
  referenceType?: ServiceReferenceType; // Type of linked record
  notes?: string;                 // Item-specific notes
  
  // Billing codes
  billingCode?: string;           // Internal billing code
  insuranceCode?: string;         // Insurance reimbursement code
  taxRate?: number;               // Tax rate for this item
  
  // Metadata
  createdAt: string;
  updatedAt?: string;
}

export type ServiceCategory = 
  | 'consultation'                // Doctor consultations
  | 'nursing'                     // Nursing services
  | 'laboratory'                  // Lab tests
  | 'imaging'                     // X-ray, CT, MRI, ultrasound
  | 'pharmacy'                    // Medications
  | 'room_board'                  // Bed/room charges
  | 'surgery'                     // Surgical procedures
  | 'procedure'                   // Non-surgical procedures
  | 'therapy'                     // Physical/occupational therapy
  | 'emergency'                   // Emergency department services
  | 'supplies'                    // Medical supplies/consumables
  | 'equipment'                   // Equipment usage charges
  | 'administration'              // Administrative fees
  | 'other';                      // Miscellaneous charges

export type ServiceReferenceType = 
  | 'lab_order'                   // → LabOrder
  | 'prescription'                // → Prescription
  | 'admission'                   // → Admission
  | 'appointment'                 // → Appointment
  | 'medical_record'              // → MedicalRecord
  | 'bed_assignment'              // → BedAssignment
  | 'procedure_note'              // → ProcedureNote
  | 'imaging_order';              // → ImagingOrder

export interface InvoicePayment {
  id: string;
  invoiceId: string;              // → HospitalInvoice
  amount: number;                 // Payment amount
  currency: string;               // Payment currency
  paymentMethod: PaymentMethod;
  paymentDate: string;            // ISO timestamp
  
  // Payment details
  reference?: string;             // Payment reference number
  receivedBy: string;             // → User (cashier)
  bankAccount?: string;           // If bank transfer
  mobileNumber?: string;          // If mobile money
  cardLastFour?: string;          // If card payment
  
  // Status
  status: PaymentStatus;
  notes?: string;
  
  // Metadata
  createdAt: string;
  metadata?: Record<string, any>;
}

export type PaymentMethod = 
  | 'cash_cdf'                    // Cash in Congolese Franc
  | 'cash_usd'                    // Cash in US Dollars
  | 'mobile_money'                // M-Pesa, Orange Money, Airtel Money
  | 'bank_transfer'               // Bank wire transfer
  | 'credit_card'                 // Credit/debit card
  | 'cheque'                      // Bank cheque
  | 'insurance'                   // Insurance payment
  | 'corporate'                   // Corporate account
  | 'voucher'                     // Discount voucher
  | 'write_off';                  // Bad debt write-off

export type PaymentStatus = 
  | 'completed'                   // Payment successfully processed
  | 'pending'                     // Payment processing
  | 'failed'                      // Payment failed
  | 'reversed'                    // Payment reversed
  | 'disputed';                   // Payment disputed

/**
 * Service Catalog - Master list of billable services with pricing
 */
export interface ServiceCatalog {
  id: string;
  organizationId: string;         // → Organization
  facilityId?: string;            // → Hospital (if facility-specific)
  
  // Service identification
  code: string;                   // Internal service code (e.g., "CONS-GEN")
  name: string;                   // Service name
  description?: string;           // Detailed description
  category: ServiceCategory;
  subcategory?: string;           // More specific categorization
  
  // Pricing
  basePrice: number;              // Base price
  currency: string;               // Price currency
  unitOfMeasure: ServiceUnit;     // What the price is per
  
  // Pricing tiers (different rates for different patient types)
  priceTiers: ServicePriceTier[];
  
  // Clinical information
  department?: string;            // Which department provides this service
  specialtyRequired?: string;     // Required medical specialty
  estimatedDuration?: number;     // Minutes
  preparationRequired?: boolean;  // Patient preparation needed?
  equipmentRequired?: string[];   // Required equipment
  
  // Billing and insurance
  billingCode?: string;           // Internal billing code
  insuranceCodes?: string[];      // Insurance reimbursement codes
  isInsuranceCovered: boolean;    // Covered by insurance?
  requiresApproval: boolean;      // Needs approval before billing?
  
  // Status
  isActive: boolean;              // Service available?
  effectiveFrom: string;          // Price effective date
  effectiveTo?: string;           // Price expiry date
  
  // Metadata
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
}

export type ServiceUnit = 
  | 'per_service'                 // One-time service
  | 'per_day'                     // Daily charge
  | 'per_hour'                    // Hourly charge
  | 'per_item'                    // Per item/unit
  | 'per_test'                    // Per lab test
  | 'per_image'                   // Per X-ray/scan
  | 'per_dose'                    // Per medication dose
  | 'per_visit';                  // Per visit/encounter

export interface ServicePriceTier {
  id: string;
  serviceId: string;              // → ServiceCatalog
  tierName: string;               // "Standard", "VIP", "Insurance", "Staff"
  tierType: PriceTierType;
  price: number;                  // Price for this tier
  discountPercent?: number;       // Discount from base price
  conditions?: string[];          // Conditions for this tier
  isDefault: boolean;             // Default tier?
}

export type PriceTierType = 
  | 'standard'                    // Regular patients
  | 'vip'                         // VIP patients
  | 'insurance'                   // Insurance patients
  | 'staff'                       // Hospital staff
  | 'student'                     // Students
  | 'senior_citizen'              // Elderly patients
  | 'government'                  // Government employees
  | 'corporate'                   // Corporate contracts
  | 'charity'                     // Charity cases
  | 'emergency';                  // Emergency surcharge

// CRUD interfaces
export interface HospitalInvoiceCreate extends Omit<HospitalInvoice, 'id' | 'invoiceNumber' | 'items' | 'paymentHistory' | 'subtotal' | 'totalAmount' | 'amountPaid' | 'amountDue' | 'createdAt'> {
  id?: string;
  invoiceNumber?: string;
  createdAt?: string;
}

export interface HospitalInvoiceUpdate extends Partial<Omit<HospitalInvoice, 'id' | 'invoiceNumber' | 'patientId' | 'encounterId' | 'createdAt'>> {
  updatedAt?: string;
}

export interface ServiceCatalogCreate extends Omit<ServiceCatalog, 'id' | 'createdAt'> {
  id?: string;
  createdAt?: string;
}

export interface ServiceCatalogUpdate extends Partial<Omit<ServiceCatalog, 'id' | 'code' | 'organizationId' | 'createdAt'>> {
  updatedAt?: string;
}

/**
 * Invoice statistics for financial reporting
 */
export interface InvoiceStats {
  totalInvoices: number;
  totalValue: number;             // Sum of all invoice amounts
  totalPaid: number;              // Sum of all payments
  totalOutstanding: number;       // Unpaid balances
  byStatus: Record<InvoiceStatus, number>;
  byCategory: Record<ServiceCategory, number>;
  averageInvoiceValue: number;
  collectionRate: number;         // Percentage paid
  daysToPayment: number;          // Average days from invoice to payment
}

export class HospitalInvoiceUtils {
  /**
   * Generate invoice number: INV{YY}{DDDD}
   * Example: INV260001 (2026, sequence 0001)
   */
  static generateInvoiceNumber(): string {
    const year = new Date().getFullYear().toString().slice(-2);
    const sequence = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV${year}${sequence}`;
  }

  /**
   * Create new invoice with defaults
   */
  static createInvoice(data: HospitalInvoiceCreate): HospitalInvoice {
    const now = new Date().toISOString();
    return {
      ...data,
      id: data.id || generateUUID(),
      invoiceNumber: data.invoiceNumber || this.generateInvoiceNumber(),
      items: [],
      paymentHistory: [],
      subtotal: 0,
      totalAmount: 0,
      amountPaid: 0,
      amountDue: 0,
      createdAt: data.createdAt || now,
      updatedAt: now,
    };
  }

  /**
   * Add service to invoice
   */
  static addService(
    invoice: HospitalInvoice,
    serviceData: Omit<InvoiceItem, 'id' | 'invoiceId' | 'totalPrice' | 'netPrice' | 'createdAt'>
  ): HospitalInvoice {
    const totalPrice = serviceData.quantity * serviceData.unitPrice;
    const discountAmount = serviceData.discountAmount || 0;
    const netPrice = totalPrice - discountAmount;

    const newItem: InvoiceItem = {
      ...serviceData,
      id: generateUUID(),
      invoiceId: invoice.id,
      totalPrice,
      netPrice,
      discountAmount,
      createdAt: new Date().toISOString(),
    };

    const updatedItems = [...invoice.items, newItem];
    return this.recalculateTotals({ ...invoice, items: updatedItems });
  }

  /**
   * Add payment to invoice
   */
  static addPayment(
    invoice: HospitalInvoice,
    paymentData: Omit<InvoicePayment, 'id' | 'invoiceId' | 'createdAt'>
  ): HospitalInvoice {
    const newPayment: InvoicePayment = {
      ...paymentData,
      id: generateUUID(),
      invoiceId: invoice.id,
      createdAt: new Date().toISOString(),
    };

    const updatedPayments = [...invoice.paymentHistory, newPayment];
    return this.recalculateTotals({
      ...invoice,
      paymentHistory: updatedPayments,
    });
  }

  /**
   * Recalculate all invoice totals
   */
  static recalculateTotals(invoice: HospitalInvoice): HospitalInvoice {
    const subtotal = invoice.items.reduce((sum, item) => sum + item.netPrice, 0);
    const taxAmount = subtotal * (invoice.taxRate / 100);
    const totalAmount = subtotal + taxAmount;
    
    const amountPaid = invoice.paymentHistory
      .filter(payment => payment.status === 'completed')
      .reduce((sum, payment) => sum + payment.amount, 0);
    
    const amountDue = Math.max(0, totalAmount - amountPaid);
    
    // Update status based on payment
    let status = invoice.status;
    if (amountDue === 0 && totalAmount > 0) {
      status = 'paid';
    } else if (amountPaid > 0 && amountDue > 0) {
      status = 'partially_paid';
    } else if (invoice.dueDate && new Date(invoice.dueDate) < new Date() && amountDue > 0) {
      status = 'overdue';
    }

    return {
      ...invoice,
      subtotal,
      taxAmount,
      totalAmount,
      amountPaid,
      amountDue,
      status,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get invoice status display color
   */
  static getStatusColor(status: InvoiceStatus): string {
    switch (status) {
      case 'draft': return '#6B7280';           // Gray
      case 'pending': return '#F59E0B';         // Amber
      case 'partially_paid': return '#3B82F6'; // Blue
      case 'paid': return '#10B981';            // Green
      case 'overdue': return '#EF4444';         // Red
      case 'disputed': return '#8B5CF6';        // Purple
      case 'cancelled': return '#6B7280';       // Gray
      case 'written_off': return '#DC2626';     // Dark red
      case 'insurance_pending': return '#0891B2'; // Cyan
      case 'insurance_denied': return '#B91C1C'; // Dark red
      default: return '#6B7280';
    }
  }

  /**
   * Get invoice status display label
   */
  static getStatusLabel(status: InvoiceStatus): string {
    switch (status) {
      case 'draft': return 'Draft';
      case 'pending': return 'Pending';
      case 'partially_paid': return 'Partially Paid';
      case 'paid': return 'Paid';
      case 'overdue': return 'Overdue';
      case 'disputed': return 'Disputed';
      case 'cancelled': return 'Cancelled';
      case 'written_off': return 'Written Off';
      case 'insurance_pending': return 'Insurance Pending';
      case 'insurance_denied': return 'Insurance Denied';
      default: return status;
    }
  }

  /**
   * Get service category display label
   */
  static getCategoryLabel(category: ServiceCategory): string {
    switch (category) {
      case 'consultation': return 'Consultation';
      case 'nursing': return 'Nursing Care';
      case 'laboratory': return 'Laboratory';
      case 'imaging': return 'Imaging';
      case 'pharmacy': return 'Pharmacy';
      case 'room_board': return 'Room & Board';
      case 'surgery': return 'Surgery';
      case 'procedure': return 'Procedure';
      case 'therapy': return 'Therapy';
      case 'emergency': return 'Emergency';
      case 'supplies': return 'Supplies';
      case 'equipment': return 'Equipment';
      case 'administration': return 'Administration';
      case 'other': return 'Other';
      default: return category;
    }
  }

  /**
   * Get payment method display label
   */
  static getPaymentMethodLabel(method: PaymentMethod): string {
    switch (method) {
      case 'cash_cdf': return 'Cash (CDF)';
      case 'cash_usd': return 'Cash (USD)';
      case 'mobile_money': return 'Mobile Money';
      case 'bank_transfer': return 'Bank Transfer';
      case 'credit_card': return 'Credit/Debit Card';
      case 'cheque': return 'Cheque';
      case 'insurance': return 'Insurance';
      case 'corporate': return 'Corporate Account';
      case 'voucher': return 'Voucher';
      case 'write_off': return 'Write Off';
      default: return method;
    }
  }

  /**
   * Check if invoice can be paid
   */
  static canAcceptPayment(invoice: HospitalInvoice): boolean {
    return ['pending', 'partially_paid', 'overdue'].includes(invoice.status) && invoice.amountDue > 0;
  }

  /**
   * Check if invoice can be cancelled
   */
  static canCancel(invoice: HospitalInvoice): boolean {
    return ['draft', 'pending'].includes(invoice.status) && invoice.amountPaid === 0;
  }

  /**
   * Format currency amount
   */
  static formatAmount(amount: number, currency: string): string {
    const formatter = new Intl.NumberFormat('fr-CD', {
      style: 'currency',
      currency: currency === 'CDF' ? 'CDF' : 'USD',
      minimumFractionDigits: currency === 'CDF' ? 0 : 2,
    });
    return formatter.format(amount);
  }
}

export class ServiceCatalogUtils {
  /**
   * Generate service code based on category and name
   */
  static generateServiceCode(category: ServiceCategory, name: string): string {
    const categoryCode = category.substring(0, 4).toUpperCase();
    const nameCode = name.replace(/\s+/g, '').substring(0, 6).toUpperCase();
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `${categoryCode}-${nameCode}-${random}`;
  }

  /**
   * Create service with defaults
   */
  static createService(data: ServiceCatalogCreate): ServiceCatalog {
    const now = new Date().toISOString();
    return {
      ...data,
      id: data.id || generateUUID(),
      priceTiers: data.priceTiers || [{
        id: generateUUID(),
        serviceId: data.id || generateUUID(),
        tierName: 'Standard',
        tierType: 'standard',
        price: data.basePrice,
        isDefault: true,
      }],
      createdAt: data.createdAt || now,
      updatedAt: now,
    };
  }

  /**
   * Get price for specific tier
   */
  static getPriceForTier(service: ServiceCatalog, tierType: PriceTierType): number {
    const tier = service.priceTiers.find(t => t.tierType === tierType);
    return tier ? tier.price : service.basePrice;
  }
}

// Simple UUID generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}