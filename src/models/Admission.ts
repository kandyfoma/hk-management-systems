/**
 * Admission Model
 * 
 * Tracks inpatient stays from admission to discharge, including
 * bed assignments, transfers, and clinical milestones.
 */

export interface Admission {
  id: string;
  encounterId: string;            // → Encounter
  patientId: string;              // → Patient
  organizationId: string;         // → Organization
  facilityId: string;             // → Hospital
  admissionNumber: string;        // Auto-generated: "ADM260001"
  
  // Admission details
  admitDate: string;              // ISO timestamp when patient admitted
  dischargeDate?: string;         // ISO timestamp when discharged
  status: AdmissionStatus;
  type: AdmissionType;
  
  // Medical staff
  admittingDoctorId: string;      // → User (doctor who admitted)
  attendingDoctorId: string;      // → User (primary doctor during stay)
  consultingDoctorIds: string[];  // → User[] (specialists involved)
  primaryNurseId?: string;        // → User (primary nurse assigned)
  
  // Location tracking
  currentWardId: string;          // → Ward (current location)
  currentBedId: string;           // → Bed (current bed assignment)
  transferHistory: BedTransfer[]; // History of bed/ward moves
  
  // Clinical information
  admissionReason: string;        // Why patient was admitted
  admissionDiagnosis: string;     // Initial diagnosis on admission
  workingDiagnosis?: string;      // Current working diagnosis
  finalDiagnosis?: string;        // Diagnosis at discharge
  complications?: string[];       // Any complications during stay
  
  // Care planning
  careLevel: CareLevel;           // Level of care required
  dietaryRestrictions: string[];  // Special diet needs
  allergiesVerified: boolean;     // Allergies checked on admission?
  specialInstructions?: string;   // Special care instructions
  precautions?: Precaution[];     // Isolation, fall risk, etc.
  
  // Discharge planning
  dischargeReason?: DischargeReason;
  dischargeDisposition?: DischargeDisposition;
  estimatedDischargeDate?: string;
  actualLengthOfStay?: number;    // Days (calculated on discharge)
  estimatedStayDays?: number;     // Initial estimate
  
  // Financial
  insuranceVerified: boolean;     // Insurance checked?
  insuranceAuthorizationNumber?: string;
  estimatedCost?: number;         // Estimated total cost
  currency?: string;              // Cost currency
  
  // Emergency contacts (can differ from patient record)
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  
  // Metadata
  createdAt: string;              // ISO timestamp
  updatedAt?: string;             // ISO timestamp
  metadata?: Record<string, any>; // Extensible data
}

export type AdmissionStatus = 
  | 'admitted'                    // Currently inpatient
  | 'transferred'                 // Moved to different ward/facility
  | 'discharge_pending'           // Ready for discharge
  | 'discharged'                  // Completed stay
  | 'deceased'                    // Died during admission
  | 'absconded'                   // Left without discharge
  | 'cancelled';                  // Admission cancelled

export type AdmissionType = 
  | 'emergency'                   // Emergency admission
  | 'elective'                    // Planned admission
  | 'urgent'                      // Urgent but not emergency
  | 'observation'                 // Short-term observation
  | 'day_case'                    // Day surgery/procedure
  | 'maternity'                   // Pregnancy/delivery
  | 'psychiatric'                 // Mental health admission
  | 'rehabilitation'              // Recovery/rehab
  | 'palliative'                  // End-of-life care
  | 'transfer_in';                // Transferred from another facility

export type CareLevel = 
  | 'minimal'                     // Self-care, minimal nursing
  | 'moderate'                    // Regular nursing care
  | 'intensive'                   // Frequent monitoring
  | 'critical'                    // ICU-level care
  | 'palliative'                  // Comfort care only
  | 'rehabilitation';             // Recovery-focused care

export type Precaution = 
  | 'isolation'                   // Infectious disease isolation
  | 'contact_precaution'          // Contact transmission prevention
  | 'droplet_precaution'          // Respiratory droplet prevention
  | 'airborne_precaution'         // Airborne transmission prevention
  | 'fall_risk'                   // Patient at risk of falling
  | 'suicide_risk'                // Mental health risk
  | 'bleeding_precaution'         // Risk of hemorrhage
  | 'seizure_precaution'          // Risk of seizures
  | 'allergy_alert'               // Severe allergies
  | 'diabetic_monitoring'         // Blood sugar monitoring
  | 'cardiac_monitoring'          // Heart rhythm monitoring
  | 'fluid_restriction'           // Limited fluid intake
  | 'nothing_by_mouth';           // NPO - no oral intake

export type DischargeReason = 
  | 'treatment_complete'          // Treatment finished successfully
  | 'improved'                    // Condition improved
  | 'stable'                      // Condition stabilized
  | 'patient_request'             // Patient requested discharge
  | 'against_medical_advice'      // AMA - patient left against advice
  | 'transfer_to_facility'        // Transferred to another facility
  | 'expired'                     // Patient died
  | 'absconded'                   // Left without permission
  | 'no_improvement'              // Treatment not effective
  | 'insurance_exhausted';        // Insurance benefits depleted

export type DischargeDisposition = 
  | 'home'                        // Discharged home
  | 'home_with_services'          // Home with nursing/therapy
  | 'family_care'                 // Care by family members
  | 'transfer_acute'              // Transfer to acute care hospital
  | 'transfer_rehab'              // Transfer to rehabilitation facility
  | 'transfer_ltc'                // Transfer to long-term care
  | 'transfer_psych'              // Transfer to psychiatric facility
  | 'hospice'                     // Hospice care
  | 'deceased'                    // Died in hospital
  | 'prison'                      // Correctional facility
  | 'unknown';                    // Lost to follow-up

export interface BedTransfer {
  id: string;
  admissionId: string;            // → Admission
  fromWardId?: string;            // → Ward (source, null if first admission)
  toWardId: string;               // → Ward (destination)
  fromBedId?: string;             // → Bed (source)
  toBedId: string;                // → Bed (destination)
  transferDate: string;           // ISO timestamp
  reason: TransferReason;
  orderedBy: string;              // → User (doctor who ordered transfer)
  transferredBy?: string;         // → User (nurse who performed transfer)
  notes?: string;                 // Transfer notes
  createdAt: string;
}

export type TransferReason = 
  | 'clinical_need'               // Medical condition changed
  | 'bed_unavailable'             // Original bed needed
  | 'isolation_required'          // Infection control
  | 'patient_preference'          // Patient requested
  | 'family_request'              // Family requested
  | 'room_upgrade'                // Better room available
  | 'room_downgrade'              // Reduce costs
  | 'ward_closure'                // Ward temporarily closed
  | 'equipment_need'              // Special equipment access
  | 'nursing_ratio'               // Staffing considerations
  | 'discharge_preparation'       // Preparing for discharge
  | 'administrative';             // Administrative reasons

export interface AdmissionCreate extends Omit<Admission, 'id' | 'admissionNumber' | 'transferHistory' | 'actualLengthOfStay' | 'createdAt'> {
  id?: string;
  admissionNumber?: string;
  createdAt?: string;
}

export interface AdmissionUpdate extends Partial<Omit<Admission, 'id' | 'patientId' | 'encounterId' | 'admissionNumber' | 'createdAt'>> {
  updatedAt?: string;
}

/**
 * Admission statistics for dashboard
 */
export interface AdmissionStats {
  totalAdmissions: number;
  currentCensus: number;          // Currently admitted patients
  byStatus: Record<AdmissionStatus, number>;
  byType: Record<AdmissionType, number>;
  byCareLevel: Record<CareLevel, number>;
  averageLengthOfStay: number;    // Days
  occupancyRate: number;          // Percentage
  dischargeRate: number;          // Discharges per day
  readmissionRate: number;        // 30-day readmissions
  mortalityRate: number;          // In-hospital deaths
}

export class AdmissionUtils {
  /**
   * Generate admission number: ADM{YY}{DDDD}
   * Example: ADM260001 (2026, sequence 0001)
   */
  static generateAdmissionNumber(): string {
    const year = new Date().getFullYear().toString().slice(-2);
    const sequence = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ADM${year}${sequence}`;
  }

  /**
   * Create new admission with defaults
   */
  static createAdmission(data: AdmissionCreate): Admission {
    const now = new Date().toISOString();
    return {
      ...data,
      id: data.id || generateUUID(),
      admissionNumber: data.admissionNumber || this.generateAdmissionNumber(),
      transferHistory: [],
      consultingDoctorIds: data.consultingDoctorIds || [],
      dietaryRestrictions: data.dietaryRestrictions || [],
      complications: data.complications || [],
      precautions: data.precautions || [],
      createdAt: data.createdAt || now,
      updatedAt: now,
    };
  }

  /**
   * Update admission with timestamp
   */
  static updateAdmission(admission: Admission, updates: AdmissionUpdate): Admission {
    return {
      ...admission,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate length of stay in days
   */
  static calculateLengthOfStay(admission: Admission): number {
    const admitDate = new Date(admission.admitDate);
    const endDate = admission.dischargeDate ? new Date(admission.dischargeDate) : new Date();
    const diffTime = Math.abs(endDate.getTime() - admitDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Format length of stay as readable string
   */
  static formatLengthOfStay(admission: Admission): string {
    const days = this.calculateLengthOfStay(admission);
    
    if (days === 1) {
      return '1 day';
    } else if (days < 7) {
      return `${days} days`;
    } else if (days < 30) {
      const weeks = Math.floor(days / 7);
      const remainingDays = days % 7;
      if (weeks === 1 && remainingDays === 0) {
        return '1 week';
      } else if (remainingDays === 0) {
        return `${weeks} weeks`;
      } else if (weeks === 1) {
        return `1 week, ${remainingDays} day${remainingDays > 1 ? 's' : ''}`;
      } else {
        return `${weeks} weeks, ${remainingDays} day${remainingDays > 1 ? 's' : ''}`;
      }
    } else {
      const months = Math.floor(days / 30);
      const remainingDays = days % 30;
      if (months === 1 && remainingDays === 0) {
        return '1 month';
      } else if (remainingDays === 0) {
        return `${months} months`;
      } else if (months === 1) {
        return `1 month, ${remainingDays} day${remainingDays > 1 ? 's' : ''}`;
      } else {
        return `${months} months, ${remainingDays} day${remainingDays > 1 ? 's' : ''}`;
      }
    }
  }

  /**
   * Add bed transfer to admission
   */
  static addBedTransfer(
    admission: Admission,
    transfer: Omit<BedTransfer, 'id' | 'admissionId' | 'createdAt'>
  ): Admission {
    const newTransfer: BedTransfer = {
      ...transfer,
      id: generateUUID(),
      admissionId: admission.id,
      createdAt: new Date().toISOString(),
    };

    return this.updateAdmission(admission, {
      currentWardId: transfer.toWardId,
      currentBedId: transfer.toBedId,
      transferHistory: [...admission.transferHistory, newTransfer],
    });
  }

  /**
   * Discharge patient
   */
  static discharge(
    admission: Admission,
    dischargeData: {
      dischargeDate?: string;
      dischargeReason: DischargeReason;
      dischargeDisposition: DischargeDisposition;
      finalDiagnosis?: string;
      dischargedBy: string;
    }
  ): Admission {
    const dischargeDate = dischargeData.dischargeDate || new Date().toISOString();
    const actualLengthOfStay = this.calculateLengthOfStay({
      ...admission,
      dischargeDate,
    });

    return this.updateAdmission(admission, {
      status: 'discharged',
      dischargeDate,
      actualLengthOfStay,
      dischargeReason: dischargeData.dischargeReason,
      dischargeDisposition: dischargeData.dischargeDisposition,
      finalDiagnosis: dischargeData.finalDiagnosis || admission.finalDiagnosis,
    });
  }

  /**
   * Check if admission is active
   */
  static isActive(admission: Admission): boolean {
    return ['admitted', 'transferred'].includes(admission.status);
  }

  /**
   * Get admission status display color
   */
  static getStatusColor(status: AdmissionStatus): string {
    switch (status) {
      case 'admitted': return '#10B981';         // Green
      case 'transferred': return '#3B82F6';     // Blue
      case 'discharge_pending': return '#F59E0B'; // Amber
      case 'discharged': return '#6B7280';      // Gray
      case 'deceased': return '#DC2626';        // Red
      case 'absconded': return '#EF4444';       // Red
      case 'cancelled': return '#8B5CF6';       // Purple
      default: return '#6B7280';
    }
  }

  /**
   * Get care level display label
   */
  static getCareLevelLabel(level: CareLevel): string {
    switch (level) {
      case 'minimal': return 'Minimal Care';
      case 'moderate': return 'Moderate Care';
      case 'intensive': return 'Intensive Care';
      case 'critical': return 'Critical Care';
      case 'palliative': return 'Palliative Care';
      case 'rehabilitation': return 'Rehabilitation';
      default: return level;
    }
  }

  /**
   * Get admission type display label
   */
  static getTypeLabel(type: AdmissionType): string {
    switch (type) {
      case 'emergency': return 'Emergency';
      case 'elective': return 'Elective';
      case 'urgent': return 'Urgent';
      case 'observation': return 'Observation';
      case 'day_case': return 'Day Case';
      case 'maternity': return 'Maternity';
      case 'psychiatric': return 'Psychiatric';
      case 'rehabilitation': return 'Rehabilitation';
      case 'palliative': return 'Palliative';
      case 'transfer_in': return 'Transfer In';
      default: return type;
    }
  }

  /**
   * Get precaution display labels
   */
  static getPrecautionLabels(precautions: Precaution[]): string[] {
    const labels: Record<Precaution, string> = {
      'isolation': 'Isolation',
      'contact_precaution': 'Contact Precaution',
      'droplet_precaution': 'Droplet Precaution',
      'airborne_precaution': 'Airborne Precaution',
      'fall_risk': 'Fall Risk',
      'suicide_risk': 'Suicide Risk',
      'bleeding_precaution': 'Bleeding Risk',
      'seizure_precaution': 'Seizure Risk',
      'allergy_alert': 'Allergy Alert',
      'diabetic_monitoring': 'Diabetic Monitoring',
      'cardiac_monitoring': 'Cardiac Monitoring',
      'fluid_restriction': 'Fluid Restriction',
      'nothing_by_mouth': 'NPO (Nothing by Mouth)',
    };

    return precautions.map(precaution => labels[precaution] || precaution);
  }

  /**
   * Check if admission can be discharged
   */
  static canDischarge(admission: Admission): boolean {
    return ['admitted', 'transferred', 'discharge_pending'].includes(admission.status);
  }

  /**
   * Check if patient can be transferred
   */
  static canTransfer(admission: Admission): boolean {
    return admission.status === 'admitted';
  }

  /**
   * Get bed transfer history summary
   */
  static getTransferSummary(admission: Admission): string[] {
    return admission.transferHistory.map(transfer => {
      const date = new Date(transfer.transferDate).toLocaleDateString();
      return `${date}: Moved to ${transfer.toBedId}`;
    });
  }

  /**
   * Calculate estimated discharge date
   */
  static calculateEstimatedDischarge(admission: Admission): string | null {
    if (!admission.estimatedStayDays) return null;
    
    const admitDate = new Date(admission.admitDate);
    const dischargeDate = new Date(admitDate);
    dischargeDate.setDate(dischargeDate.getDate() + admission.estimatedStayDays);
    
    return dischargeDate.toISOString();
  }

  /**
   * Check if admission is overdue for discharge
   */
  static isOverdue(admission: Admission): boolean {
    if (!admission.estimatedStayDays || admission.status !== 'admitted') return false;
    
    const estimatedDischarge = this.calculateEstimatedDischarge(admission);
    if (!estimatedDischarge) return false;
    
    return new Date() > new Date(estimatedDischarge);
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