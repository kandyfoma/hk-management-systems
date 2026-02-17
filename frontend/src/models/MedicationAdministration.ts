/**
 * Medication Administration Record (MAR) Model
 * 
 * Tracks medication administration for inpatients - what was given,
 * when, by whom, and any related observations.
 */

export interface MedicationAdministration {
  id: string;
  admissionId: string;            // → Admission
  encounterId: string;            // → Encounter
  patientId: string;              // → Patient
  prescriptionId: string;         // → Prescription
  prescriptionItemId: string;     // → PrescriptionItem
  organizationId: string;         // → Organization
  facilityId: string;             // → Hospital
  
  // Administration identification
  administrationNumber: string;   // Auto-generated: "MAR260001"
  
  // Medication details (denormalized from prescription)
  medicationName: string;
  dosage: string;                 // "500mg"
  dose: number;                   // Numeric dose value
  doseUnit: string;               // "mg", "ml", "units"
  route: MedicationRoute;
  frequency: string;              // "TDS", "BD", etc.
  
  // Schedule
  scheduledDate: string;          // ISO date
  scheduledTime: string;          // HH:MM format
  scheduledDateTime: string;      // Combined ISO timestamp
  
  // Administration details
  administeredDate?: string;      // ISO date
  administeredTime?: string;      // HH:MM format
  administeredDateTime?: string;  // Combined ISO timestamp
  administeredBy?: string;        // → User (nurse)
  administeredByName?: string;    // Denormalized
  
  // What was actually given
  actualDose?: number;            // Actual dose given
  actualDoseUnit?: string;        // Unit of actual dose
  actualRoute?: MedicationRoute;  // Route used
  site?: string;                  // Injection site if applicable
  
  // Status
  status: AdministrationStatus;
  statusReason?: string;          // Reason for held/refused/omitted
  
  // Verification (for controlled substances)
  requiresWitness: boolean;
  witnessId?: string;             // → User (second nurse)
  witnessName?: string;
  witnessedAt?: string;
  
  // Clinical observations
  vitalsBefore?: VitalsCheck;     // Pre-admin vitals if required
  vitalsAfter?: VitalsCheck;      // Post-admin vitals if required
  patientResponse?: string;       // How patient responded
  adverseReaction?: string;       // Any adverse reactions
  
  // Inventory tracking
  batchNumber?: string;           // Medication batch/lot
  inventoryBatchId?: string;      // → InventoryBatch
  
  // Notes
  notes?: string;                 // Administration notes
  instructions?: string;          // Special instructions followed
  
  // Audit trail
  createdAt: string;
  createdBy: string;              // → User
  updatedAt?: string;
  updatedBy?: string;             // → User
  metadata?: Record<string, any>;
}

export type MedicationRoute = 
  | 'oral'                        // PO - by mouth
  | 'sublingual'                  // SL - under tongue
  | 'buccal'                      // Between cheek and gum
  | 'intravenous'                 // IV
  | 'intravenous_push'            // IV push
  | 'intravenous_infusion'        // IV drip
  | 'intramuscular'               // IM
  | 'subcutaneous'                // SC/SQ
  | 'intradermal'                 // ID
  | 'topical'                     // Applied to skin
  | 'rectal'                      // PR
  | 'vaginal'                     // PV
  | 'inhaled'                     // Inhaler/nebulizer
  | 'nasal'                       // Nasal spray/drops
  | 'ophthalmic'                  // Eye
  | 'otic'                        // Ear
  | 'transdermal'                 // Patch
  | 'enteral'                     // NG/PEG tube
  | 'epidural'                    // Epidural
  | 'intrathecal'                 // Spinal
  | 'other';

export type AdministrationStatus = 
  | 'scheduled'                   // Due at scheduled time
  | 'due'                         // Coming due soon
  | 'overdue'                     // Past scheduled time
  | 'given'                       // Medication administered
  | 'held'                        // Temporarily held (clinical reason)
  | 'refused'                     // Patient refused
  | 'omitted'                     // Skipped (nursing decision)
  | 'not_available'               // Medication not available
  | 'cancelled'                   // Order cancelled
  | 'discontinued';               // Medication stopped

export interface VitalsCheck {
  bloodPressure?: string;         // "120/80"
  heartRate?: number;             // BPM
  temperature?: number;           // Celsius
  respiratoryRate?: number;       // Per minute
  oxygenSaturation?: number;      // SpO2 %
  bloodGlucose?: number;          // mg/dL (for insulin)
  painLevel?: number;             // 0-10 (for pain meds)
  recordedAt: string;             // ISO timestamp
  recordedBy: string;             // → User
}

/**
 * MAR Schedule - Generated schedule for a patient's medications
 */
export interface MARSchedule {
  patientId: string;
  admissionId: string;
  date: string;                   // YYYY-MM-DD
  administrations: MedicationAdministration[];
  summary: MARSummary;
}

export interface MARSummary {
  totalScheduled: number;
  given: number;
  held: number;
  refused: number;
  omitted: number;
  overdue: number;
  upcoming: number;
  complianceRate: number;         // Percentage given on time
}

/**
 * Common administration times (hospital standard schedules)
 */
export const STANDARD_ADMIN_TIMES = {
  // Common frequencies
  'OD': ['08:00'],                            // Once daily
  'BD': ['08:00', '20:00'],                   // Twice daily
  'TDS': ['08:00', '14:00', '20:00'],         // Three times daily
  'QDS': ['08:00', '12:00', '18:00', '22:00'], // Four times daily
  'Q4H': ['06:00', '10:00', '14:00', '18:00', '22:00', '02:00'], // Every 4 hours
  'Q6H': ['06:00', '12:00', '18:00', '00:00'], // Every 6 hours
  'Q8H': ['06:00', '14:00', '22:00'],         // Every 8 hours
  'Q12H': ['08:00', '20:00'],                 // Every 12 hours
  'HS': ['22:00'],                            // At bedtime
  'AC': ['07:30', '11:30', '17:30'],          // Before meals
  'PC': ['09:00', '13:00', '19:00'],          // After meals
  'QAM': ['08:00'],                           // Every morning
  'QPM': ['20:00'],                           // Every evening
} as const;

// CRUD interfaces
export interface MedicationAdministrationCreate extends Omit<MedicationAdministration, 'id' | 'administrationNumber' | 'createdAt'> {
  id?: string;
  administrationNumber?: string;
  createdAt?: string;
}

export interface MedicationAdministrationUpdate extends Partial<Omit<MedicationAdministration, 'id' | 'administrationNumber' | 'patientId' | 'admissionId' | 'prescriptionId' | 'createdAt' | 'createdBy'>> {
  updatedAt?: string;
  updatedBy?: string;
}

/**
 * MAR Statistics
 */
export interface MARStats {
  totalAdministrations: number;
  byStatus: Record<AdministrationStatus, number>;
  byRoute: Record<MedicationRoute, number>;
  complianceRate: number;         // % given on time
  overdueCount: number;
  averageDelayMinutes: number;    // For late administrations
  adverseReactionCount: number;
}

export class MedicationAdministrationUtils {
  /**
   * Generate administration number: MAR{YY}{DDDDD}
   */
  static generateAdministrationNumber(): string {
    const year = new Date().getFullYear().toString().slice(-2);
    const sequence = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `MAR${year}${sequence}`;
  }

  /**
   * Create scheduled administration
   */
  static createAdministration(data: MedicationAdministrationCreate): MedicationAdministration {
    const now = new Date().toISOString();
    return {
      ...data,
      id: data.id || generateUUID(),
      administrationNumber: data.administrationNumber || this.generateAdministrationNumber(),
      scheduledDateTime: `${data.scheduledDate}T${data.scheduledTime}:00`,
      createdAt: data.createdAt || now,
    };
  }

  /**
   * Record medication as given
   */
  static recordGiven(
    admin: MedicationAdministration,
    givenBy: string,
    givenByName: string,
    actualDose?: number,
    site?: string,
    notes?: string
  ): MedicationAdministration {
    const now = new Date();
    return {
      ...admin,
      status: 'given',
      administeredDate: now.toISOString().split('T')[0],
      administeredTime: now.toTimeString().slice(0, 5),
      administeredDateTime: now.toISOString(),
      administeredBy: givenBy,
      administeredByName: givenByName,
      actualDose: actualDose || admin.dose,
      actualDoseUnit: admin.doseUnit,
      actualRoute: admin.route,
      site,
      notes,
      updatedAt: now.toISOString(),
      updatedBy: givenBy,
    };
  }

  /**
   * Record medication as held
   */
  static recordHeld(
    admin: MedicationAdministration,
    reason: string,
    userId: string
  ): MedicationAdministration {
    const now = new Date().toISOString();
    return {
      ...admin,
      status: 'held',
      statusReason: reason,
      updatedAt: now,
      updatedBy: userId,
    };
  }

  /**
   * Record medication as refused
   */
  static recordRefused(
    admin: MedicationAdministration,
    reason: string,
    userId: string
  ): MedicationAdministration {
    const now = new Date().toISOString();
    return {
      ...admin,
      status: 'refused',
      statusReason: reason,
      updatedAt: now,
      updatedBy: userId,
    };
  }

  /**
   * Add witness for controlled substance
   */
  static addWitness(
    admin: MedicationAdministration,
    witnessId: string,
    witnessName: string
  ): MedicationAdministration {
    return {
      ...admin,
      witnessId,
      witnessName,
      witnessedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Check if administration is overdue
   */
  static isOverdue(admin: MedicationAdministration): boolean {
    if (admin.status !== 'scheduled' && admin.status !== 'due') return false;
    
    const scheduled = new Date(admin.scheduledDateTime);
    const now = new Date();
    const gracePeriodMinutes = 30; // 30-minute grace period
    
    scheduled.setMinutes(scheduled.getMinutes() + gracePeriodMinutes);
    return now > scheduled;
  }

  /**
   * Check if administration is due soon (within next 30 minutes)
   */
  static isDueSoon(admin: MedicationAdministration): boolean {
    if (admin.status !== 'scheduled') return false;
    
    const scheduled = new Date(admin.scheduledDateTime);
    const now = new Date();
    const upcomingMinutes = 30;
    
    const diff = (scheduled.getTime() - now.getTime()) / (1000 * 60);
    return diff > 0 && diff <= upcomingMinutes;
  }

  /**
   * Calculate delay in minutes (for late administrations)
   */
  static getDelayMinutes(admin: MedicationAdministration): number | null {
    if (!admin.administeredDateTime) return null;
    
    const scheduled = new Date(admin.scheduledDateTime);
    const actual = new Date(admin.administeredDateTime);
    
    return Math.round((actual.getTime() - scheduled.getTime()) / (1000 * 60));
  }

  /**
   * Generate schedule from prescription
   */
  static generateSchedule(
    prescriptionItem: {
      id: string;
      prescriptionId: string;
      medicationName: string;
      dosage: string;
      frequency: string;
      route: MedicationRoute;
    },
    admission: { id: string; encounterId: string; patientId: string; },
    startDate: string,
    days: number,
    organizationId: string,
    facilityId: string,
    createdBy: string
  ): MedicationAdministration[] {
    const times = STANDARD_ADMIN_TIMES[prescriptionItem.frequency as keyof typeof STANDARD_ADMIN_TIMES] || ['08:00'];
    const schedule: MedicationAdministration[] = [];
    
    for (let day = 0; day < days; day++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + day);
      const dateStr = date.toISOString().split('T')[0];
      
      for (const time of times) {
        schedule.push(this.createAdministration({
          admissionId: admission.id,
          encounterId: admission.encounterId,
          patientId: admission.patientId,
          prescriptionId: prescriptionItem.prescriptionId,
          prescriptionItemId: prescriptionItem.id,
          organizationId,
          facilityId,
          medicationName: prescriptionItem.medicationName,
          dosage: prescriptionItem.dosage,
          dose: parseFloat(prescriptionItem.dosage) || 0,
          doseUnit: 'mg', // Default, should be parsed from dosage
          route: prescriptionItem.route,
          frequency: prescriptionItem.frequency,
          scheduledDate: dateStr,
          scheduledTime: time,
          scheduledDateTime: `${dateStr}T${time}:00`,
          status: 'scheduled',
          requiresWitness: false, // Set based on controlled substance flag
          createdBy,
        }));
      }
    }
    
    return schedule;
  }

  /**
   * Get status color
   */
  static getStatusColor(status: AdministrationStatus): string {
    switch (status) {
      case 'scheduled': return '#6B7280';     // Gray
      case 'due': return '#F59E0B';           // Amber
      case 'overdue': return '#EF4444';       // Red
      case 'given': return '#10B981';         // Green
      case 'held': return '#8B5CF6';          // Purple
      case 'refused': return '#EC4899';       // Pink
      case 'omitted': return '#6366F1';       // Indigo
      case 'not_available': return '#DC2626'; // Dark red
      case 'cancelled': return '#6B7280';     // Gray
      case 'discontinued': return '#1F2937';  // Dark gray
      default: return '#6B7280';
    }
  }

  /**
   * Get route display label
   */
  static getRouteLabel(route: MedicationRoute): string {
    switch (route) {
      case 'oral': return 'PO (By Mouth)';
      case 'sublingual': return 'SL (Sublingual)';
      case 'buccal': return 'Buccal';
      case 'intravenous': return 'IV';
      case 'intravenous_push': return 'IV Push';
      case 'intravenous_infusion': return 'IV Infusion';
      case 'intramuscular': return 'IM';
      case 'subcutaneous': return 'SC/SQ';
      case 'intradermal': return 'ID';
      case 'topical': return 'Topical';
      case 'rectal': return 'PR (Rectal)';
      case 'vaginal': return 'PV (Vaginal)';
      case 'inhaled': return 'Inhaled';
      case 'nasal': return 'Nasal';
      case 'ophthalmic': return 'Ophthalmic (Eye)';
      case 'otic': return 'Otic (Ear)';
      case 'transdermal': return 'Transdermal (Patch)';
      case 'enteral': return 'Enteral (Tube)';
      case 'epidural': return 'Epidural';
      case 'intrathecal': return 'Intrathecal';
      default: return route;
    }
  }

  /**
   * Validate administration can be recorded
   */
  static canRecordGiven(admin: MedicationAdministration): { canRecord: boolean; reason?: string } {
    if (admin.status === 'given') {
      return { canRecord: false, reason: 'Already administered' };
    }
    if (admin.status === 'cancelled' || admin.status === 'discontinued') {
      return { canRecord: false, reason: 'Medication order cancelled/discontinued' };
    }
    
    // Check if too early (more than 1 hour before scheduled)
    const scheduled = new Date(admin.scheduledDateTime);
    const now = new Date();
    const earlyMinutes = (scheduled.getTime() - now.getTime()) / (1000 * 60);
    
    if (earlyMinutes > 60) {
      return { canRecord: false, reason: 'Too early - more than 1 hour before scheduled time' };
    }
    
    return { canRecord: true };
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