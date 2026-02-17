/**
 * Clinical Notes Models
 * 
 * Progress notes and discharge summaries for clinical documentation
 * during inpatient stays.
 */

export interface ProgressNote {
  id: string;
  admissionId: string;            // → Admission
  encounterId: string;            // → Encounter
  patientId: string;              // → Patient
  authorId: string;               // → User (doctor or nurse)
  organizationId: string;         // → Organization
  
  // Note identification
  noteNumber?: string;            // Sequential note number
  noteDate: string;               // ISO date of the note
  noteTime: string;               // Time when note was written
  
  // Note type and author
  type: ProgressNoteType;
  authorRole: 'doctor' | 'nurse' | 'therapist' | 'pharmacist' | 'other';
  authorName: string;             // Author's full name (denormalized)
  cosignerId?: string;            // → User (supervising physician)
  cosignerName?: string;
  cosignedDate?: string;
  
  // SOAP Format (standard medical documentation)
  subjective?: string;            // Patient's complaints, symptoms, history
  objective?: string;             // Physical exam findings, vitals, test results
  assessment?: string;            // Diagnosis, clinical impression
  plan?: string;                  // Treatment plan, orders, follow-up
  
  // Alternative: Free-text format
  content?: string;               // Free-form narrative note
  
  // Vital signs at time of note
  vitals?: VitalSignsSnapshot;
  
  // Clinical context
  diagnosis?: string;             // Current working diagnosis
  medications?: string[];         // Current medications
  allergies?: string[];           // Patient allergies (verified)
  
  // Care information
  painLevel?: number;             // 0-10 pain scale
  activityLevel?: string;         // "Bed rest", "Ambulating", etc.
  dietStatus?: string;            // "NPO", "Clear liquids", "Regular"
  oxygenStatus?: string;          // "Room air", "2L NC", etc.
  ivStatus?: string;              // IV line status
  
  // Orders and changes
  newOrders?: string[];           // New orders placed during this note
  discontinuedOrders?: string[];  // Orders discontinued
  medicationChanges?: string[];   // Medication adjustments
  
  // Status
  status: NoteStatus;
  isLocked: boolean;              // Cannot be edited after locking
  lockedAt?: string;
  lockedBy?: string;
  
  // Addendum support
  hasAddendum: boolean;
  addenda?: NoteAddendum[];
  
  // Metadata
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
}

export type ProgressNoteType = 
  | 'admission_note'              // Initial admission documentation
  | 'daily_progress'              // Daily progress note
  | 'consultation_note'           // Specialist consultation
  | 'nursing_assessment'          // Nursing assessment
  | 'nursing_shift'               // Shift change note
  | 'procedure_note'              // Post-procedure documentation
  | 'operative_note'              // Post-surgery note
  | 'transfer_note'               // Ward/bed transfer
  | 'code_note'                   // Resuscitation documentation
  | 'death_note'                  // Death documentation
  | 'handoff_note'                // Shift handoff
  | 'telephone_note'              // Phone consultation
  | 'late_entry'                  // Delayed documentation
  | 'correction';                 // Corrected entry

export type NoteStatus = 
  | 'draft'                       // Not yet finalized
  | 'signed'                      // Author has signed
  | 'cosigned'                    // Cosigner has signed (if required)
  | 'final'                       // Complete and locked
  | 'amended';                    // Has addendum

export interface NoteAddendum {
  id: string;
  noteId: string;                 // → ProgressNote
  authorId: string;               // → User
  authorName: string;
  content: string;                // Addendum text
  reason: string;                 // Why addendum was added
  createdAt: string;
  signedAt?: string;
}

export interface VitalSignsSnapshot {
  temperature?: number;           // Celsius
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;             // BPM
  respiratoryRate?: number;       // Per minute
  oxygenSaturation?: number;      // Percentage
  weight?: number;                // kg
  height?: number;                // cm
  painScale?: number;             // 0-10
  glucoseLevel?: number;          // mg/dL
  recordedAt: string;             // When vitals were taken
}

/**
 * Discharge Summary - Comprehensive discharge documentation
 */
export interface DischargeSummary {
  id: string;
  admissionId: string;            // → Admission
  encounterId: string;            // → Encounter
  patientId: string;              // → Patient
  organizationId: string;         // → Organization
  facilityId: string;             // → Hospital
  
  // Document identification
  summaryNumber: string;          // Auto-generated: "DS260001"
  
  // Dates
  admissionDate: string;          // Original admission date
  dischargeDate: string;          // Actual discharge date
  documentDate: string;           // When summary was written
  
  // Physicians
  attendingDoctorId: string;      // → User (primary doctor)
  attendingDoctorName: string;    // Denormalized
  admittingDoctorId?: string;     // → User (who admitted)
  admittingDoctorName?: string;
  consultingDoctors?: ConsultingDoctor[];
  
  // Diagnosis
  admittingDiagnosis: string;     // Diagnosis on admission
  principalDiagnosis: string;     // Main diagnosis at discharge
  secondaryDiagnoses?: string[];  // Additional diagnoses
  diagnosisCodes?: DiagnosisCode[]; // ICD-10 codes
  
  // Hospital course
  reasonForAdmission: string;     // Why patient was admitted
  hospitalCourse: string;         // Summary of stay
  significantFindings?: string;   // Key test results, imaging
  proceduresPerformed?: Procedure[]; // Surgeries, procedures
  complications?: string[];       // Any complications during stay
  
  // Outcome
  conditionAtDischarge: DischargeCondition;
  dischargeDisposition: DischargeDispositionType;
  functionalStatus?: string;      // Ability to perform activities
  
  // Discharge medications
  dischargeMedications: DischargeMedication[];
  medicationsReconciled: boolean; // Medication reconciliation done?
  
  // Follow-up care
  followUpInstructions: string;   // Written instructions for patient
  followUpAppointments?: FollowUpAppointment[];
  referrals?: Referral[];
  
  // Patient education
  dietaryAdvice?: string;         // Diet instructions
  activityRestrictions?: string;  // Physical activity limits
  woundCare?: string;             // Wound care instructions
  warningSignsToWatch: string[];  // When to seek medical attention
  
  // Pending items
  pendingLabResults?: string[];   // Labs to follow up
  pendingConsults?: string[];     // Pending specialist opinions
  pendingImaging?: string[];      // Imaging results pending
  
  // Signatures
  preparedBy: string;             // → User (who wrote summary)
  preparedByName: string;
  approvedBy?: string;            // → User (who approved)
  approvedByName?: string;
  approvedDate?: string;
  
  // Status
  status: DischargeSummaryStatus;
  isLocked: boolean;
  lockedAt?: string;
  
  // Metadata
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
}

export type DischargeCondition = 
  | 'improved'                    // Condition improved
  | 'stable'                      // Condition stabilized
  | 'unchanged'                   // No change
  | 'deteriorated'                // Condition worsened
  | 'critical'                    // Still critical
  | 'deceased';                   // Died in hospital

export type DischargeDispositionType = 
  | 'home_self_care'              // Discharged home, self-care
  | 'home_with_services'          // Home with home health
  | 'home_hospice'                // Home for hospice care
  | 'skilled_nursing'             // Skilled nursing facility
  | 'rehabilitation'              // Inpatient rehabilitation
  | 'long_term_care'              // Long-term care facility
  | 'psychiatric_facility'        // Psychiatric hospital
  | 'another_hospital'            // Transfer to another hospital
  | 'against_medical_advice'      // AMA discharge
  | 'expired'                     // Died
  | 'other';

export type DischargeSummaryStatus = 
  | 'draft'                       // Being written
  | 'pending_review'              // Awaiting approval
  | 'approved'                    // Approved and signed
  | 'final'                       // Complete and locked
  | 'amended';                    // Has corrections

export interface ConsultingDoctor {
  doctorId: string;               // → User
  doctorName: string;
  specialty: string;
  consultDate: string;
  findings?: string;
}

export interface DiagnosisCode {
  code: string;                   // ICD-10 code
  description: string;            // Code description
  type: 'principal' | 'secondary' | 'complication';
}

export interface Procedure {
  name: string;
  code?: string;                  // CPT/ICD procedure code
  date: string;
  performedBy: string;
  findings?: string;
  complications?: string;
}

export interface DischargeMedication {
  medicationName: string;
  dosage: string;
  frequency: string;
  route: string;
  duration?: string;
  instructions?: string;
  isNew: boolean;                 // New medication started during admission
  isContinued: boolean;           // Continued from before admission
  isDiscontinued: boolean;        // Stopped during admission
  prescriptionId?: string;        // → Prescription
}

export interface FollowUpAppointment {
  specialty: string;              // Which specialty to see
  doctorName?: string;            // Specific doctor if known
  timeframe: string;              // "1 week", "2 weeks", "1 month"
  date?: string;                  // Specific date if scheduled
  appointmentId?: string;         // → Appointment
  instructions?: string;          // What to bring, prepare
}

export interface Referral {
  specialty: string;
  facility?: string;              // External facility if applicable
  reason: string;
  urgency: 'routine' | 'urgent' | 'emergent';
  notes?: string;
}

// CRUD interfaces
export interface ProgressNoteCreate extends Omit<ProgressNote, 'id' | 'status' | 'isLocked' | 'hasAddendum' | 'addenda' | 'createdAt'> {
  id?: string;
  createdAt?: string;
}

export interface ProgressNoteUpdate extends Partial<Omit<ProgressNote, 'id' | 'admissionId' | 'patientId' | 'authorId' | 'createdAt'>> {
  updatedAt?: string;
}

export interface DischargeSummaryCreate extends Omit<DischargeSummary, 'id' | 'summaryNumber' | 'status' | 'isLocked' | 'createdAt'> {
  id?: string;
  summaryNumber?: string;
  createdAt?: string;
}

export interface DischargeSummaryUpdate extends Partial<Omit<DischargeSummary, 'id' | 'summaryNumber' | 'admissionId' | 'patientId' | 'createdAt'>> {
  updatedAt?: string;
}

/**
 * Clinical documentation statistics
 */
export interface ClinicalNoteStats {
  totalProgressNotes: number;
  totalDischargeSummaries: number;
  notesByType: Record<ProgressNoteType, number>;
  notesByAuthorRole: Record<string, number>;
  averageNotesPerAdmission: number;
  pendingDischargeSummaries: number;
  averageTimeToComplete: number;  // Hours
}

export class ProgressNoteUtils {
  /**
   * Create progress note with defaults
   */
  static createNote(data: ProgressNoteCreate): ProgressNote {
    const now = new Date().toISOString();
    return {
      ...data,
      id: data.id || generateUUID(),
      status: 'draft',
      isLocked: false,
      hasAddendum: false,
      addenda: [],
      createdAt: data.createdAt || now,
      updatedAt: now,
    };
  }

  /**
   * Sign the note
   */
  static signNote(note: ProgressNote): ProgressNote {
    return {
      ...note,
      status: note.cosignerId ? 'signed' : 'final',
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Cosign the note
   */
  static cosignNote(note: ProgressNote, cosignerId: string, cosignerName: string): ProgressNote {
    return {
      ...note,
      status: 'final',
      cosignerId,
      cosignerName,
      cosignedDate: new Date().toISOString(),
      isLocked: true,
      lockedAt: new Date().toISOString(),
      lockedBy: cosignerId,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Add addendum to note
   */
  static addAddendum(note: ProgressNote, addendum: Omit<NoteAddendum, 'id' | 'noteId' | 'createdAt'>): ProgressNote {
    const newAddendum: NoteAddendum = {
      ...addendum,
      id: generateUUID(),
      noteId: note.id,
      createdAt: new Date().toISOString(),
    };

    return {
      ...note,
      status: 'amended',
      hasAddendum: true,
      addenda: [...(note.addenda || []), newAddendum],
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Format SOAP note for display
   */
  static formatSOAP(note: ProgressNote): string {
    const parts: string[] = [];
    
    if (note.subjective) parts.push(`**Subjective:**\n${note.subjective}`);
    if (note.objective) parts.push(`**Objective:**\n${note.objective}`);
    if (note.assessment) parts.push(`**Assessment:**\n${note.assessment}`);
    if (note.plan) parts.push(`**Plan:**\n${note.plan}`);
    
    return parts.join('\n\n');
  }

  /**
   * Get note type display label
   */
  static getTypeLabel(type: ProgressNoteType): string {
    switch (type) {
      case 'admission_note': return 'Admission Note';
      case 'daily_progress': return 'Daily Progress Note';
      case 'consultation_note': return 'Consultation Note';
      case 'nursing_assessment': return 'Nursing Assessment';
      case 'nursing_shift': return 'Nursing Shift Note';
      case 'procedure_note': return 'Procedure Note';
      case 'operative_note': return 'Operative Note';
      case 'transfer_note': return 'Transfer Note';
      case 'code_note': return 'Code/Resuscitation Note';
      case 'death_note': return 'Death Note';
      case 'handoff_note': return 'Handoff Note';
      case 'telephone_note': return 'Telephone Note';
      case 'late_entry': return 'Late Entry';
      case 'correction': return 'Correction';
      default: return type;
    }
  }

  /**
   * Check if note can be edited
   */
  static canEdit(note: ProgressNote): boolean {
    return !note.isLocked && ['draft', 'signed'].includes(note.status);
  }
}

export class DischargeSummaryUtils {
  /**
   * Generate discharge summary number: DS{YY}{DDDD}
   */
  static generateSummaryNumber(): string {
    const year = new Date().getFullYear().toString().slice(-2);
    const sequence = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `DS${year}${sequence}`;
  }

  /**
   * Create discharge summary with defaults
   */
  static createSummary(data: DischargeSummaryCreate): DischargeSummary {
    const now = new Date().toISOString();
    return {
      ...data,
      id: data.id || generateUUID(),
      summaryNumber: data.summaryNumber || this.generateSummaryNumber(),
      status: 'draft',
      isLocked: false,
      warningSignsToWatch: data.warningSignsToWatch || [],
      dischargeMedications: data.dischargeMedications || [],
      createdAt: data.createdAt || now,
      updatedAt: now,
    };
  }

  /**
   * Approve discharge summary
   */
  static approveSummary(summary: DischargeSummary, approvedBy: string, approvedByName: string): DischargeSummary {
    return {
      ...summary,
      status: 'approved',
      approvedBy,
      approvedByName,
      approvedDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Finalize and lock summary
   */
  static finalizeSummary(summary: DischargeSummary): DischargeSummary {
    return {
      ...summary,
      status: 'final',
      isLocked: true,
      lockedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate length of stay
   */
  static getLengthOfStay(summary: DischargeSummary): number {
    const admission = new Date(summary.admissionDate);
    const discharge = new Date(summary.dischargeDate);
    const diffTime = Math.abs(discharge.getTime() - admission.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get condition color
   */
  static getConditionColor(condition: DischargeCondition): string {
    switch (condition) {
      case 'improved': return '#10B981';       // Green
      case 'stable': return '#3B82F6';         // Blue
      case 'unchanged': return '#F59E0B';      // Amber
      case 'deteriorated': return '#EF4444';   // Red
      case 'critical': return '#DC2626';       // Dark red
      case 'deceased': return '#1F2937';       // Dark gray
      default: return '#6B7280';
    }
  }

  /**
   * Validate summary completeness
   */
  static validateForApproval(summary: DischargeSummary): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!summary.principalDiagnosis) errors.push('Principal diagnosis is required');
    if (!summary.hospitalCourse) errors.push('Hospital course summary is required');
    if (!summary.conditionAtDischarge) errors.push('Condition at discharge is required');
    if (!summary.dischargeDisposition) errors.push('Discharge disposition is required');
    if (!summary.followUpInstructions) errors.push('Follow-up instructions are required');
    if (summary.warningSignsToWatch.length === 0) errors.push('Warning signs to watch are required');
    if (!summary.medicationsReconciled) errors.push('Medication reconciliation not completed');

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