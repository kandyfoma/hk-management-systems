/**
 * Encounter (Visit) Model
 * 
 * The central record that ties everything together for a single patient visit.
 * This is the spine of the hospital management system - every service, order,
 * and procedure is linked to an encounter.
 */

export interface Encounter {
  id: string;
  patientId: string;              // → Patient
  organizationId: string;         // → Organization
  facilityId: string;             // → Hospital
  encounterNumber: string;        // Auto-generated: "E260001"
  type: EncounterType;
  status: EncounterStatus;
  arrivalDate: string;            // ISO timestamp
  dischargeDate?: string;         // ISO timestamp
  chiefComplaint: string;         // Why patient came ("chest pain for 2 days")
  assignedDoctorId?: string;      // → User (doctor)
  assignedNurseId?: string;       // → User (nurse) 
  departmentId?: string;          // Which hospital department
  priority: TriagePriority;
  notes?: string;
  
  // Clinical Assessment
  presentIllness?: string;        // History of present illness
  vitalSigns?: {
    temperature?: number;         // Celsius
    bloodPressure?: string;       // "120/80"
    heartRate?: number;           // BPM
    respiratoryRate?: number;     // breaths/min
    oxygenSaturation?: number;    // %
  };
  physicalExam?: string;          // Physical examination findings
  assessment?: string;            // Clinical assessment/diagnosis
  plan?: string;                  // Treatment plan
  doctorId?: string;              // Primary attending doctor
  doctorName?: string;            // Doctor's full name
  facility?: string;              // Facility name
  
  // Metadata & Audit
  createdAt: string;              // ISO timestamp
  updatedAt?: string;             // ISO timestamp
  createdBy?: string;             // User ID who created encounter
  updatedBy?: string;             // User ID who last updated encounter
  lastAccessedBy?: string;        // User ID who last accessed encounter
  lastAccessedAt?: string;        // ISO timestamp - last access time
  accessCount: number;            // Number of times accessed
  metadata?: Record<string, any>; // Extensible data
}

export type EncounterType = 
  | 'outpatient'                  // OPD - patient leaves same day
  | 'inpatient'                   // IPD - patient stays overnight
  | 'emergency'                   // ER visit
  | 'day_case'                    // Day surgery/procedure
  | 'follow_up'                   // Return visit
  | 'consultation'                // Specialist consult
  | 'procedure'                   // Specific procedure visit
  | 'lab_only';                   // Lab work only

export type EncounterStatus = 
  | 'registered'                  // Just checked in
  | 'triaged'                     // Nurse assessment done
  | 'waiting'                     // Waiting for doctor
  | 'in_consultation'             // With doctor now
  | 'orders_pending'              // Tests/procedures ordered
  | 'admitted'                    // Moved to inpatient
  | 'ready_for_discharge'         // Clinically ready to leave
  | 'discharged'                  // Completed visit
  | 'cancelled'                   // Visit cancelled
  | 'no_show';                    // Didn't show up for appointment

export type TriagePriority = 
  | 'emergency'                   // Level 1-2: Red/Orange
  | 'urgent'                      // Level 3: Yellow  
  | 'semi_urgent'                 // Level 4: Green
  | 'routine';                    // Level 5: Blue

export interface EncounterCreate extends Omit<Encounter, 'id' | 'encounterNumber' | 'createdAt' | 'accessCount'> {
  id?: string;
  encounterNumber?: string;
  createdAt?: string;
  accessCount?: number;
}

export interface EncounterUpdate extends Partial<Omit<Encounter, 'id' | 'patientId' | 'organizationId' | 'encounterNumber' | 'createdAt'>> {
  updatedAt?: string;
}

/**
 * Encounter Statistics for dashboard/reporting
 */
export interface EncounterStats {
  total: number;
  byStatus: Record<EncounterStatus, number>;
  byType: Record<EncounterType, number>;
  byPriority: Record<TriagePriority, number>;
  avgWaitTime: number;           // Minutes
  avgLengthOfStay: number;       // Hours for outpatient, days for inpatient
}

export class EncounterUtils {
  /**
   * Generate encounter number: E{YY}{DDDD}
   * Example: E260001 (2026, sequence 0001)
   */
  static generateEncounterNumber(): string {
    const year = new Date().getFullYear().toString().slice(-2);
    const sequence = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `E${year}${sequence}`;
  }

  /**
   * Create new encounter with defaults
   */
  static createEncounter(data: EncounterCreate): Encounter {
    const now = new Date().toISOString();
    return {
      ...data,
      id: data.id || generateUUID(),
      encounterNumber: data.encounterNumber || this.generateEncounterNumber(),
      createdAt: data.createdAt || now,
      updatedAt: now,
      accessCount: data.accessCount || 0,
    };
  }

  /**
   * Update encounter with timestamp
   */
  static updateEncounter(encounter: Encounter, updates: EncounterUpdate): Encounter {
    return {
      ...encounter,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate wait time in minutes
   */
  static getWaitTime(encounter: Encounter): number {
    if (!encounter.dischargeDate) return 0;
    
    const arrival = new Date(encounter.arrivalDate);
    const discharge = new Date(encounter.dischargeDate);
    return Math.round((discharge.getTime() - arrival.getTime()) / (1000 * 60));
  }

  /**
   * Check if encounter is active (not completed)
   */
  static isActive(encounter: Encounter): boolean {
    return !['discharged', 'cancelled', 'no_show'].includes(encounter.status);
  }

  /**
   * Get display color for triage priority
   */
  static getPriorityColor(priority: TriagePriority): string {
    switch (priority) {
      case 'emergency': return '#DC2626'; // Red
      case 'urgent': return '#EA580C';    // Orange  
      case 'semi_urgent': return '#D97706'; // Yellow
      case 'routine': return '#059669';   // Green
      default: return '#6B7280';          // Gray
    }
  }

  /**
   * Get status display label
   */
  static getStatusLabel(status: EncounterStatus): string {
    switch (status) {
      case 'registered': return 'Registered';
      case 'triaged': return 'Triaged';
      case 'waiting': return 'Waiting';
      case 'in_consultation': return 'In Consultation';
      case 'orders_pending': return 'Orders Pending';
      case 'admitted': return 'Admitted';
      case 'ready_for_discharge': return 'Ready for Discharge';
      case 'discharged': return 'Discharged';
      case 'cancelled': return 'Cancelled';
      case 'no_show': return 'No Show';
      default: return status;
    }
  }

  /**
   * Get display color for encounter status
   */
  static getStatusColor(status: EncounterStatus): string {
    switch (status) {
      case 'registered': return '#6366F1';      // Indigo
      case 'triaged': return '#8B5CF6';         // Violet
      case 'waiting': return '#F59E0B';         // Amber
      case 'in_consultation': return '#3B82F6'; // Blue
      case 'orders_pending': return '#F97316';  // Orange
      case 'admitted': return '#10B981';        // Emerald
      case 'ready_for_discharge': return '#22C55E'; // Green
      case 'discharged': return '#6B7280';      // Gray
      case 'cancelled': return '#EF4444';       // Red
      case 'no_show': return '#9CA3AF';         // Light Gray
      default: return '#6B7280';                // Gray
    }
  }

  /**
   * Get icon name for encounter type (used in UI badges)
   */
  static getTypeIcon(type: EncounterType): string {
    switch (type) {
      case 'emergency': return 'flash';
      case 'inpatient': return 'home';
      case 'outpatient': return 'walk';
      case 'follow_up': return 'refresh';
      case 'consultation': return 'medkit';
      case 'procedure': return 'construct';
      case 'day_case': return 'sunny';
      case 'lab_only': return 'flask';
      default: return 'medkit';
    }
  }

  /**
   * Get human label for encounter type
   */
  static getTypeLabel(type: EncounterType): string {
    switch (type) {
      case 'emergency': return 'Urgences';
      case 'inpatient': return 'Hospitalisation';
      case 'outpatient': return 'Consultation Externe';
      case 'follow_up': return 'Suivi';
      case 'consultation': return 'Consultation';
      case 'procedure': return 'Procédure';
      case 'day_case': return 'Hôpital de Jour';
      case 'lab_only': return 'Laboratoire';
      default: return type;
    }
  }

  /**
   * Get human label for triage priority
   */
  static getPriorityLabel(priority: TriagePriority): string {
    switch (priority) {
      case 'emergency': return 'Urgence';
      case 'urgent': return 'Urgent';
      case 'semi_urgent': return 'Semi-urgent';
      case 'routine': return 'Routine';
      default: return priority;
    }
  }

  /**
   * Determine if encounter can be cancelled
   */
  static canCancel(encounter: Encounter): boolean {
    return ['registered', 'triaged', 'waiting'].includes(encounter.status);
  }

  /**
   * Determine if encounter can be discharged
   */
  static canDischarge(encounter: Encounter): boolean {
    return ['in_consultation', 'orders_pending', 'ready_for_discharge'].includes(encounter.status);
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