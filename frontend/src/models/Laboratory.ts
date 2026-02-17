/**
 * Laboratory Order & Result Models
 * 
 * Lab workflow from doctor ordering tests, through sample collection,
 * processing, and result reporting back to the ordering physician.
 */

export interface LabOrder {
  id: string;
  encounterId: string;            // → Encounter
  patientId: string;              // → Patient
  doctorId: string;               // → User (ordering doctor)
  organizationId: string;         // → Organization
  facilityId: string;             // → Hospital
  orderNumber: string;            // Auto-generated: "LAB260001"
  
  // Order details
  orderDate: string;              // ISO timestamp when ordered
  status: LabOrderStatus;
  priority: LabPriority;
  
  // Tests ordered
  tests: LabTest[];
  
  // Clinical context
  clinicalNotes?: string;         // Why tests are ordered
  diagnosis?: string;             // Suspected/working diagnosis
  icdCodes?: string[];            // ICD-10 diagnosis codes
  fastingRequired: boolean;       // Patient needs to fast?
  specialInstructions?: string;   // Special preparation/handling
  
  // Sample information
  sampleType?: SampleType;        // Type of sample needed
  sampleCollectionDate?: string;  // When sample was collected
  sampleCollectedBy?: string;     // → User (phlebotomist/nurse)
  sampleNumber?: string;          // Lab sample/accession number
  sampleStatus?: SampleStatus;
  
  // Workflow tracking
  receivedInLabDate?: string;     // When lab received sample
  receivedBy?: string;            // → User (lab technician)
  expectedResultDate?: string;    // Estimated completion
  completedDate?: string;         // When all results ready
  verifiedBy?: string;            // → User (lab supervisor)
  verifiedDate?: string;          // When results verified
  
  // Notification
  resultsNotifiedDate?: string;   // When doctor was notified
  resultsNotifiedTo?: string;     // → User (who received notification)
  criticalValueAlerted: boolean;  // Was critical value alert sent?
  
  // Billing
  billable: boolean;              // Should this be billed?
  invoiceItemId?: string;         // → InvoiceItem
  totalCost?: number;
  currency?: string;
  
  // Metadata
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
}

export type LabOrderStatus = 
  | 'ordered'                     // Doctor placed order
  | 'acknowledged'                // Lab received order
  | 'sample_pending'              // Waiting for sample
  | 'sample_collected'            // Sample taken from patient
  | 'sample_received'             // Sample arrived in lab
  | 'processing'                  // Tests in progress
  | 'partial_results'             // Some results ready
  | 'completed'                   // All results ready
  | 'verified'                    // Results verified by supervisor
  | 'reported'                    // Results sent to doctor
  | 'cancelled';                  // Order cancelled

export type LabPriority = 
  | 'routine'                     // Normal turnaround (24-48 hours)
  | 'urgent'                      // Faster turnaround (6-12 hours)
  | 'stat'                        // Immediate (1-2 hours)
  | 'asap'                        // As soon as possible
  | 'timed';                      // Specific time required

export type SampleType = 
  | 'blood_venous'                // Venous blood
  | 'blood_arterial'              // Arterial blood
  | 'blood_capillary'             // Fingerstick/heelstick
  | 'urine_random'                // Random urine
  | 'urine_midstream'             // Clean catch
  | 'urine_24hr'                  // 24-hour collection
  | 'stool'                       // Fecal sample
  | 'sputum'                      // Respiratory secretion
  | 'swab_throat'                 // Throat swab
  | 'swab_nasal'                  // Nasal swab
  | 'swab_wound'                  // Wound swab
  | 'swab_vaginal'                // Vaginal swab
  | 'swab_urethral'               // Urethral swab
  | 'csf'                         // Cerebrospinal fluid
  | 'pleural_fluid'               // Pleural fluid
  | 'ascitic_fluid'               // Peritoneal fluid
  | 'synovial_fluid'              // Joint fluid
  | 'biopsy'                      // Tissue biopsy
  | 'bone_marrow'                 // Bone marrow aspirate
  | 'other';

export type SampleStatus = 
  | 'pending'                     // Not yet collected
  | 'collected'                   // Sample taken
  | 'in_transit'                  // Being transported to lab
  | 'received'                    // Received in lab
  | 'rejected'                    // Sample rejected (hemolyzed, insufficient, etc.)
  | 'processing'                  // Being analyzed
  | 'stored'                      // Archived for future testing
  | 'disposed';                   // Discarded

export interface LabTest {
  id: string;
  orderId: string;                // → LabOrder
  testCode: string;               // Internal test code (e.g., "CBC", "BMP")
  testName: string;               // Full test name
  category: LabTestCategory;
  
  // Test status
  status: LabTestStatus;
  
  // Results
  results: LabResult[];           // Individual result values
  interpretation?: string;        // Overall interpretation
  comments?: string;              // Pathologist/technician comments
  
  // Workflow
  performedBy?: string;           // → User (lab technician)
  performedDate?: string;         // When test was run
  verifiedBy?: string;            // → User (who verified)
  verifiedDate?: string;          // When verified
  
  // Flags
  hasCriticalValue: boolean;      // Any critical values?
  hasAbnormalValue: boolean;      // Any abnormal values?
  
  // Pricing
  price?: number;
  currency?: string;
  
  // Metadata
  createdAt: string;
  updatedAt?: string;
}

export type LabTestCategory = 
  | 'hematology'                  // Blood cell counts, coagulation
  | 'biochemistry'                // Chemistry panel, electrolytes
  | 'microbiology'                // Cultures, sensitivity
  | 'serology'                    // Antibodies, viral markers
  | 'immunology'                  // Immune system tests
  | 'urinalysis'                  // Urine analysis
  | 'parasitology'                // Parasite detection
  | 'histopathology'              // Tissue analysis
  | 'cytology'                    // Cell analysis
  | 'molecular'                   // PCR, genetic tests
  | 'toxicology'                  // Drug/toxin screening
  | 'endocrinology'               // Hormone tests
  | 'blood_bank'                  // Blood typing, crossmatch
  | 'other';

export type LabTestStatus = 
  | 'pending'                     // Not started
  | 'in_progress'                 // Being analyzed
  | 'completed'                   // Results ready
  | 'verified'                    // Results verified
  | 'cancelled';                  // Test cancelled

export interface LabResult {
  id: string;
  testId: string;                 // → LabTest
  parameterCode: string;          // e.g., "WBC", "HGB", "PLT"
  parameterName: string;          // "White Blood Cell Count"
  
  // Result value
  value: string;                  // Result value (as string to handle all types)
  numericValue?: number;          // Numeric value if applicable
  unit?: string;                  // Unit of measure (e.g., "×10³/µL", "g/dL")
  
  // Reference ranges
  referenceRange?: string;        // Display text (e.g., "4.5 - 11.0")
  referenceLow?: number;          // Low normal value
  referenceHigh?: number;         // High normal value
  
  // Flags
  flag: ResultFlag;               // Normal, high, low, critical
  isCritical: boolean;            // Critical value requiring immediate action
  isAbnormal: boolean;            // Outside reference range
  
  // Comments
  notes?: string;                 // Result-specific notes
  
  // Metadata
  resultDate: string;             // When result was recorded
  performedBy?: string;           // → User
}

export type ResultFlag = 
  | 'normal'                      // Within reference range
  | 'low'                         // Below reference range
  | 'high'                        // Above reference range
  | 'critical_low'                // Critically low (panic value)
  | 'critical_high'               // Critically high (panic value)
  | 'positive'                    // Positive result (for qualitative tests)
  | 'negative'                    // Negative result
  | 'reactive'                    // Reactive (serology)
  | 'non_reactive'                // Non-reactive
  | 'indeterminate';              // Inconclusive

// Common lab test panels (templates)
export const LAB_TEST_PANELS = {
  CBC: {
    name: 'Complete Blood Count',
    category: 'hematology',
    parameters: ['WBC', 'RBC', 'HGB', 'HCT', 'MCV', 'MCH', 'MCHC', 'PLT', 'NEUT', 'LYMPH', 'MONO', 'EOS', 'BASO'],
  },
  BMP: {
    name: 'Basic Metabolic Panel',
    category: 'biochemistry',
    parameters: ['GLU', 'BUN', 'CREAT', 'NA', 'K', 'CL', 'CO2', 'CA'],
  },
  CMP: {
    name: 'Comprehensive Metabolic Panel',
    category: 'biochemistry',
    parameters: ['GLU', 'BUN', 'CREAT', 'NA', 'K', 'CL', 'CO2', 'CA', 'TP', 'ALB', 'TBIL', 'ALP', 'AST', 'ALT'],
  },
  LFT: {
    name: 'Liver Function Tests',
    category: 'biochemistry',
    parameters: ['TBIL', 'DBIL', 'AST', 'ALT', 'ALP', 'GGT', 'TP', 'ALB'],
  },
  RFT: {
    name: 'Renal Function Tests',
    category: 'biochemistry',
    parameters: ['BUN', 'CREAT', 'URIC', 'NA', 'K', 'CL', 'CO2'],
  },
  LIPID: {
    name: 'Lipid Profile',
    category: 'biochemistry',
    parameters: ['CHOL', 'TRIG', 'HDL', 'LDL', 'VLDL'],
  },
  COAG: {
    name: 'Coagulation Panel',
    category: 'hematology',
    parameters: ['PT', 'INR', 'PTT', 'FIB'],
  },
  TFT: {
    name: 'Thyroid Function Tests',
    category: 'endocrinology',
    parameters: ['TSH', 'T3', 'T4', 'FT3', 'FT4'],
  },
  UA: {
    name: 'Urinalysis',
    category: 'urinalysis',
    parameters: ['COLOR', 'CLARITY', 'SG', 'PH', 'PROT', 'GLU', 'KET', 'BLOOD', 'LEUK', 'NIT', 'BILI', 'URO'],
  },
  MALARIA: {
    name: 'Malaria Screening',
    category: 'parasitology',
    parameters: ['MALARIA_RDT', 'MALARIA_SMEAR'],
  },
} as const;

// CRUD interfaces
export interface LabOrderCreate extends Omit<LabOrder, 'id' | 'orderNumber' | 'tests' | 'criticalValueAlerted' | 'createdAt'> {
  id?: string;
  orderNumber?: string;
  createdAt?: string;
}

export interface LabOrderUpdate extends Partial<Omit<LabOrder, 'id' | 'orderNumber' | 'patientId' | 'encounterId' | 'doctorId' | 'createdAt'>> {
  updatedAt?: string;
}

export interface LabTestCreate extends Omit<LabTest, 'id' | 'results' | 'hasCriticalValue' | 'hasAbnormalValue' | 'createdAt'> {
  id?: string;
  createdAt?: string;
}

export interface LabResultCreate extends Omit<LabResult, 'id' | 'isCritical' | 'isAbnormal'> {
  id?: string;
}

/**
 * Lab statistics for dashboard
 */
export interface LabStats {
  totalOrders: number;
  byStatus: Record<LabOrderStatus, number>;
  byCategory: Record<LabTestCategory, number>;
  byPriority: Record<LabPriority, number>;
  averageTurnaroundTime: number;  // Hours
  criticalValueCount: number;
  pendingResults: number;
  completedToday: number;
}

export class LabOrderUtils {
  /**
   * Generate lab order number: LAB{YY}{DDDD}
   */
  static generateOrderNumber(): string {
    const year = new Date().getFullYear().toString().slice(-2);
    const sequence = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `LAB${year}${sequence}`;
  }

  /**
   * Generate sample number: S{YY}{DDDDD}
   */
  static generateSampleNumber(): string {
    const year = new Date().getFullYear().toString().slice(-2);
    const sequence = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `S${year}${sequence}`;
  }

  /**
   * Create new lab order with defaults
   */
  static createLabOrder(data: LabOrderCreate): LabOrder {
    const now = new Date().toISOString();
    return {
      ...data,
      id: data.id || generateUUID(),
      orderNumber: data.orderNumber || this.generateOrderNumber(),
      tests: [],
      criticalValueAlerted: false,
      createdAt: data.createdAt || now,
      updatedAt: now,
    };
  }

  /**
   * Add test to order
   */
  static addTest(order: LabOrder, testData: LabTestCreate): LabOrder {
    const newTest: LabTest = {
      ...testData,
      id: testData.id || generateUUID(),
      orderId: order.id,
      results: [],
      hasCriticalValue: false,
      hasAbnormalValue: false,
      createdAt: testData.createdAt || new Date().toISOString(),
    };

    return {
      ...order,
      tests: [...order.tests, newTest],
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Add result to test
   */
  static addResult(order: LabOrder, testId: string, resultData: LabResultCreate): LabOrder {
    // Determine flags
    const isCritical = resultData.flag === 'critical_low' || resultData.flag === 'critical_high';
    const isAbnormal = !['normal', 'negative', 'non_reactive'].includes(resultData.flag);

    const newResult: LabResult = {
      ...resultData,
      id: resultData.id || generateUUID(),
      isCritical,
      isAbnormal,
    };

    const updatedTests = order.tests.map(test => {
      if (test.id !== testId) return test;
      
      const updatedResults = [...test.results, newResult];
      return {
        ...test,
        results: updatedResults,
        hasCriticalValue: test.hasCriticalValue || isCritical,
        hasAbnormalValue: test.hasAbnormalValue || isAbnormal,
        updatedAt: new Date().toISOString(),
      };
    });

    return {
      ...order,
      tests: updatedTests,
      criticalValueAlerted: order.criticalValueAlerted || isCritical,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Mark sample as collected
   */
  static collectSample(order: LabOrder, collectedBy: string): LabOrder {
    return {
      ...order,
      status: 'sample_collected',
      sampleStatus: 'collected',
      sampleCollectionDate: new Date().toISOString(),
      sampleCollectedBy: collectedBy,
      sampleNumber: order.sampleNumber || this.generateSampleNumber(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Mark sample as received in lab
   */
  static receiveInLab(order: LabOrder, receivedBy: string): LabOrder {
    return {
      ...order,
      status: 'sample_received',
      sampleStatus: 'received',
      receivedInLabDate: new Date().toISOString(),
      receivedBy,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Check if all tests are complete
   */
  static areAllTestsComplete(order: LabOrder): boolean {
    return order.tests.every(test => test.status === 'completed' || test.status === 'verified');
  }

  /**
   * Complete the order
   */
  static completeOrder(order: LabOrder): LabOrder {
    return {
      ...order,
      status: 'completed',
      completedDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get order status color
   */
  static getStatusColor(status: LabOrderStatus): string {
    switch (status) {
      case 'ordered': return '#6B7280';          // Gray
      case 'acknowledged': return '#8B5CF6';     // Purple
      case 'sample_pending': return '#F59E0B';   // Amber
      case 'sample_collected': return '#0891B2'; // Cyan
      case 'sample_received': return '#3B82F6';  // Blue
      case 'processing': return '#6366F1';       // Indigo
      case 'partial_results': return '#EC4899';  // Pink
      case 'completed': return '#10B981';        // Green
      case 'verified': return '#059669';         // Emerald
      case 'reported': return '#065F46';         // Dark green
      case 'cancelled': return '#EF4444';        // Red
      default: return '#6B7280';
    }
  }

  /**
   * Get priority color
   */
  static getPriorityColor(priority: LabPriority): string {
    switch (priority) {
      case 'routine': return '#6B7280';          // Gray
      case 'urgent': return '#F59E0B';           // Amber
      case 'stat': return '#EF4444';             // Red
      case 'asap': return '#DC2626';             // Dark red
      case 'timed': return '#8B5CF6';            // Purple
      default: return '#6B7280';
    }
  }

  /**
   * Get result flag color
   */
  static getResultFlagColor(flag: ResultFlag): string {
    switch (flag) {
      case 'normal': return '#10B981';           // Green
      case 'negative': return '#10B981';         // Green
      case 'non_reactive': return '#10B981';     // Green
      case 'low': return '#3B82F6';              // Blue
      case 'high': return '#F59E0B';             // Amber
      case 'critical_low': return '#DC2626';     // Red
      case 'critical_high': return '#DC2626';    // Red
      case 'positive': return '#EF4444';         // Red
      case 'reactive': return '#EF4444';         // Red
      case 'indeterminate': return '#8B5CF6';    // Purple
      default: return '#6B7280';
    }
  }

  /**
   * Check if order can be cancelled
   */
  static canCancel(order: LabOrder): boolean {
    return ['ordered', 'acknowledged', 'sample_pending'].includes(order.status);
  }

  /**
   * Calculate turnaround time in hours
   */
  static getTurnaroundTime(order: LabOrder): number | null {
    if (!order.completedDate) return null;
    
    const ordered = new Date(order.orderDate);
    const completed = new Date(order.completedDate);
    return Math.round((completed.getTime() - ordered.getTime()) / (1000 * 60 * 60));
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