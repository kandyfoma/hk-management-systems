/**
 * Prescription Model
 * 
 * Bridge between doctor's clinical decision and pharmacy dispensing.
 * A prescription contains multiple items (medications) that can be
 * dispensed individually by the pharmacist.
 */

export interface Prescription {
  id: string;
  encounterId: string;            // → Encounter
  patientId: string;              // → Patient  
  doctorId: string;               // → User (doctor)
  organizationId: string;         // → Organization
  facilityId: string;             // → Hospital
  prescriptionNumber: string;     // Auto-generated: "RX260001"
  date: string;                   // ISO date when prescribed
  status: PrescriptionStatus;
  items: PrescriptionItem[];      // List of medications
  instructions?: string;          // General prescription notes
  diagnosis?: string;             // Related diagnosis
  validUntil?: string;            // Prescription expiry date (ISO)
  // Dispensing tracking
  totalItems: number;             // Total number of medication items
  itemsDispensed: number;         // Number of items fully dispensed
  isComplete: boolean;            // All items dispensed?
  // Clinical notes
  allergiesChecked: boolean;      // Doctor verified allergies?
  interactionsChecked: boolean;   // Drug interactions verified?
  clinicalNotes?: string;         // Special instructions
  // Metadata
  createdAt: string;              // ISO timestamp
  updatedAt?: string;             // ISO timestamp
  metadata?: Record<string, any>; // Extensible data
  // Audit fields
  createdBy?: string;             // User ID who created the prescription
  updatedBy?: string;             // User ID who last updated
  lastAccessedBy?: string;        // User ID who last accessed
  lastAccessedAt?: string;        // When prescription was last accessed
  accessCount?: number;           // Number of times accessed
}

export type PrescriptionStatus = 
  | 'pending'                     // Written by doctor, not dispensed
  | 'partially_dispensed'         // Some items dispensed
  | 'fully_dispensed'             // All items dispensed
  | 'cancelled'                   // Cancelled by doctor
  | 'expired';                    // Past validity date

export interface PrescriptionItem {
  id: string;
  prescriptionId: string;         // → Prescription
  // Medication details (doctor's order)
  medicationName: string;         // Free text from doctor
  genericName?: string;           // INN name if specified
  dosage: string;                 // "500mg", "10ml"
  strength?: string;              // "500mg/tablet" 
  dosageForm?: DosageForm;        // tablet, syrup, injection, etc.
  frequency: string;              // "TDS" (three times daily), "BD", "PRN"
  duration: string;               // "7 days", "2 weeks", "1 month"
  quantity: number;               // Total quantity to dispense
  route: MedicationRoute;         // How to administer
  instructions?: string;          // "Take after meals", "Apply to affected area"
  // Dispensing details (pharmacist's work)
  productId?: string;             // → Product (matched during dispensing)
  quantityDispensed: number;      // How much actually dispensed
  quantityRemaining: number;      // quantity - quantityDispensed
  batchesUsed?: string[];         // → InventoryBatch IDs used
  unitPrice?: number;             // Price per unit when dispensed
  totalPrice?: number;            // Total cost for this item
  dispensedBy?: string;           // → User (pharmacist)
  dispensedDate?: string;         // ISO timestamp when dispensed
  status: PrescriptionItemStatus;
  // Clinical flags
  isSubstitutionAllowed: boolean; // Can pharmacist substitute generic?
  isControlled: boolean;          // Controlled substance?
  requiresCounseling: boolean;    // Special patient counseling needed?
  // Notes
  pharmacistNotes?: string;       // Dispensing notes
  patientCounseling?: string;     // What was explained to patient
  // Metadata
  createdAt: string;
  updatedAt?: string;
  // Audit fields
  createdBy?: string;             // User ID who created the item
  updatedBy?: string;             // User ID who last updated
}

export type PrescriptionItemStatus = 
  | 'pending'                     // Not dispensed yet
  | 'partially_dispensed'         // Some quantity dispensed
  | 'fully_dispensed'             // Complete quantity dispensed
  | 'out_of_stock'                // Cannot dispense - no stock
  | 'discontinued'                // Product discontinued
  | 'cancelled'                   // Doctor cancelled this item
  | 'substituted';                // Generic/alternative dispensed

export type MedicationRoute = 
  | 'oral'                        // By mouth (PO)
  | 'sublingual'                  // Under tongue (SL)
  | 'buccal'                      // Between cheek and gum
  | 'intravenous'                 // IV injection
  | 'intramuscular'               // IM injection  
  | 'subcutaneous'                // SC injection
  | 'intradermal'                 // ID injection
  | 'topical'                     // Apply to skin
  | 'rectal'                      // PR (per rectum)
  | 'vaginal'                     // PV (per vaginum)
  | 'inhaled'                     // Inhaler/nebulizer
  | 'nasal'                       // Nasal spray/drops
  | 'ophthalmic'                  // Eye drops/ointment
  | 'otic'                        // Ear drops
  | 'transdermal'                 // Patch
  | 'other';

export type DosageForm = 
  | 'tablet'
  | 'capsule'
  | 'syrup'
  | 'suspension' 
  | 'injection'
  | 'infusion'
  | 'cream'
  | 'ointment'
  | 'gel'
  | 'drops'
  | 'spray'
  | 'inhaler'
  | 'suppository'
  | 'patch'
  | 'powder'
  | 'solution'
  | 'lozenge'
  | 'implant'
  | 'device'
  | 'other';

export interface PrescriptionCreate extends Omit<Prescription, 'id' | 'prescriptionNumber' | 'totalItems' | 'itemsDispensed' | 'isComplete' | 'createdAt'> {
  id?: string;
  prescriptionNumber?: string;
  createdAt?: string;
}

export interface PrescriptionUpdate extends Partial<Omit<Prescription, 'id' | 'prescriptionNumber' | 'patientId' | 'doctorId' | 'encounterId' | 'createdAt'>> {
  updatedAt?: string;
}

export interface PrescriptionItemCreate extends Omit<PrescriptionItem, 'id' | 'quantityDispensed' | 'quantityRemaining' | 'createdAt'> {
  id?: string;
  createdAt?: string;
}

export interface PrescriptionItemUpdate extends Partial<Omit<PrescriptionItem, 'id' | 'prescriptionId' | 'createdAt'>> {
  updatedAt?: string;
}

/**
 * Prescription statistics for pharmacy workflow
 */
export interface PrescriptionStats {
  total: number;
  byStatus: Record<PrescriptionStatus, number>;
  pendingItems: number;           // Items waiting to be dispensed
  averageItemsPerPrescription: number;
  topMedications: { name: string; count: number }[];
  dispensingRate: number;         // Percentage of items dispensed
}

/**
 * Common medication frequencies (for dropdown/validation)
 */
export const MEDICATION_FREQUENCIES = {
  'OD': 'Once daily',
  'BD': 'Twice daily', 
  'TDS': 'Three times daily',
  'QDS': 'Four times daily',
  'QID': 'Four times daily',
  'Q4H': 'Every 4 hours',
  'Q6H': 'Every 6 hours', 
  'Q8H': 'Every 8 hours',
  'Q12H': 'Every 12 hours',
  'PRN': 'As needed',
  'STAT': 'Immediately',
  'HS': 'At bedtime',
  'AC': 'Before meals',
  'PC': 'After meals',
  'QAM': 'Every morning',
  'QPM': 'Every evening',
} as const;

export class PrescriptionUtils {
  /**
   * Generate prescription number: RX{YY}{DDDD}
   * Example: RX260001 (2026, sequence 0001)
   */
  static generatePrescriptionNumber(): string {
    const year = new Date().getFullYear().toString().slice(-2);
    const sequence = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `RX${year}${sequence}`;
  }

  /**
   * Create new prescription with defaults
   */
  static createPrescription(data: PrescriptionCreate): Prescription {
    const now = new Date().toISOString();
    const totalItems = data.items.length;
    
    return {
      ...data,
      id: data.id || generateUUID(),
      prescriptionNumber: data.prescriptionNumber || this.generatePrescriptionNumber(),
      totalItems,
      itemsDispensed: 0,
      isComplete: false,
      createdAt: data.createdAt || now,
      updatedAt: now,
    };
  }

  /**
   * Update prescription and recalculate dispensing status
   */
  static updatePrescription(prescription: Prescription, updates: PrescriptionUpdate): Prescription {
    const updatedPrescription = {
      ...prescription,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Recalculate dispensing status
    return this.recalculateStatus(updatedPrescription);
  }

  /**
   * Add item to prescription
   */
  static addItem(prescription: Prescription, item: PrescriptionItemCreate): Prescription {
    const newItem: PrescriptionItem = {
      ...item,
      id: item.id || generateUUID(),
      quantityDispensed: 0,
      quantityRemaining: item.quantity,
      createdAt: item.createdAt || new Date().toISOString(),
    };

    const updatedItems = [...prescription.items, newItem];
    
    return this.updatePrescription(prescription, {
      items: updatedItems,
    });
  }

  /**
   * Update prescription item (usually for dispensing)
   */
  static updateItem(prescription: Prescription, itemId: string, updates: PrescriptionItemUpdate): Prescription {
    const updatedItems = prescription.items.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            ...updates, 
            quantityRemaining: updates.quantity !== undefined 
              ? updates.quantity - (updates.quantityDispensed || item.quantityDispensed)
              : item.quantity - (updates.quantityDispensed || item.quantityDispensed),
            updatedAt: new Date().toISOString(),
          }
        : item
    );

    return this.updatePrescription(prescription, {
      items: updatedItems,
    });
  }

  /**
   * Recalculate prescription status based on items
   */
  static recalculateStatus(prescription: Prescription): Prescription {
    const fullyDispensedItems = prescription.items.filter(item => 
      item.status === 'fully_dispensed'
    ).length;
    
    const partiallyDispensedItems = prescription.items.filter(item => 
      item.status === 'partially_dispensed'
    ).length;

    let status: PrescriptionStatus;
    let isComplete: boolean;

    if (fullyDispensedItems === prescription.items.length) {
      status = 'fully_dispensed';
      isComplete = true;
    } else if (fullyDispensedItems > 0 || partiallyDispensedItems > 0) {
      status = 'partially_dispensed';
      isComplete = false;
    } else {
      status = 'pending';
      isComplete = false;
    }

    // Check if expired
    if (prescription.validUntil && new Date(prescription.validUntil) < new Date()) {
      status = 'expired';
    }

    return {
      ...prescription,
      status,
      isComplete,
      itemsDispensed: fullyDispensedItems,
    };
  }

  /**
   * Check if prescription is expired
   */
  static isExpired(prescription: Prescription): boolean {
    if (!prescription.validUntil) return false;
    return new Date(prescription.validUntil) < new Date();
  }

  /**
   * Calculate total prescription value (after dispensing)
   */
  static getTotalValue(prescription: Prescription): number {
    return prescription.items.reduce((total, item) => 
      total + (item.totalPrice || 0), 0
    );
  }

  /**
   * Get pending items (not fully dispensed)
   */
  static getPendingItems(prescription: Prescription): PrescriptionItem[] {
    return prescription.items.filter(item => 
      !['fully_dispensed', 'cancelled'].includes(item.status)
    );
  }

  /**
   * Format frequency display
   */
  static formatFrequency(frequency: string): string {
    return MEDICATION_FREQUENCIES[frequency as keyof typeof MEDICATION_FREQUENCIES] || frequency;
  }

  /**
   * Get route display label
   */
  static getRouteLabel(route: MedicationRoute): string {
    switch (route) {
      case 'oral': return 'By mouth (PO)';
      case 'sublingual': return 'Under tongue (SL)';
      case 'buccal': return 'Buccal';
      case 'intravenous': return 'Intravenous (IV)';
      case 'intramuscular': return 'Intramuscular (IM)';
      case 'subcutaneous': return 'Subcutaneous (SC)';
      case 'intradermal': return 'Intradermal (ID)';
      case 'topical': return 'Apply to skin';
      case 'rectal': return 'Rectal (PR)';
      case 'vaginal': return 'Vaginal (PV)';
      case 'inhaled': return 'Inhaled';
      case 'nasal': return 'Nasal';
      case 'ophthalmic': return 'Eye';
      case 'otic': return 'Ear';
      case 'transdermal': return 'Patch';
      default: return route;
    }
  }

  /**
   * Get status color for display
   */
  static getStatusColor(status: PrescriptionStatus): string {
    switch (status) {
      case 'pending': return '#F59E0B';         // Amber
      case 'partially_dispensed': return '#3B82F6'; // Blue
      case 'fully_dispensed': return '#10B981'; // Emerald
      case 'cancelled': return '#EF4444';       // Red
      case 'expired': return '#6B7280';         // Gray
      default: return '#6B7280';
    }
  }

  /**
   * Get item status color
   */
  static getItemStatusColor(status: PrescriptionItemStatus): string {
    switch (status) {
      case 'pending': return '#F59E0B';         // Amber
      case 'partially_dispensed': return '#3B82F6'; // Blue
      case 'fully_dispensed': return '#10B981'; // Emerald
      case 'out_of_stock': return '#EF4444';    // Red
      case 'discontinued': return '#6B7280';    // Gray
      case 'cancelled': return '#EF4444';       // Red
      case 'substituted': return '#8B5CF6';     // Purple
      default: return '#6B7280';
    }
  }

  /**
   * Validate prescription item before dispensing
   */
  static validateForDispensing(item: PrescriptionItem): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (item.quantity <= 0) {
      errors.push('Quantity must be greater than 0');
    }

    if (item.quantityRemaining <= 0) {
      errors.push('No remaining quantity to dispense');
    }

    if (!item.medicationName.trim()) {
      errors.push('Medication name is required');
    }

    if (!item.dosage.trim()) {
      errors.push('Dosage is required');
    }

    if (!item.frequency.trim()) {
      errors.push('Frequency is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
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