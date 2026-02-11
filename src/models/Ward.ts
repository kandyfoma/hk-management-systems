/**
 * Ward & Bed Models
 * 
 * Ward management for inpatient care including bed tracking,
 * availability, assignments, and nursing staff allocation.
 */

export interface Ward {
  id: string;
  hospitalId: string;             // → Hospital
  organizationId: string;         // → Organization
  name: string;                   // "Medical Ward A"
  code: string;                   // "MW-A" 
  type: WardType;
  floor: number;                  // Which floor (0 = ground, 1 = first, etc.)
  totalBeds: number;              // Total bed capacity
  occupiedBeds: number;           // Currently occupied (calculated)
  availableBeds: number;          // Currently available (calculated)
  headNurseId?: string;           // → User (nurse in charge)
  nurseStaffIds: string[];        // → User[] (assigned nurses)
  specialties: string[];          // Medical specialties served
  amenities: WardAmenity[];       // Available facilities
  restrictions?: string[];        // Age, gender, condition restrictions
  isActive: boolean;              // Ward operational?
  isIsolation: boolean;           // Isolation ward for infectious diseases?
  // Metadata
  createdAt: string;              // ISO timestamp
  updatedAt?: string;             // ISO timestamp
  metadata?: Record<string, any>; // Extensible data
}

export type WardType = 
  | 'general'                     // General medical ward
  | 'surgical'                    // Surgical/post-op patients
  | 'pediatric'                   // Children (0-15 years)
  | 'maternity'                   // Pregnancy, delivery, postpartum
  | 'obstetrics'                  // OB-GYN
  | 'icu'                         // Intensive Care Unit
  | 'ccu'                         // Cardiac Care Unit
  | 'nicu'                        // Neonatal ICU
  | 'emergency'                   // Emergency observation
  | 'isolation'                   // Infectious disease patients
  | 'psychiatric'                 // Mental health patients
  | 'rehabilitation'              // Physical therapy, recovery
  | 'oncology'                    // Cancer patients
  | 'dialysis'                    // Kidney dialysis
  | 'vip'                         // VIP/private rooms
  | 'day_case';                   // Day surgery patients

export type WardAmenity = 
  | 'oxygen_supply'               // Piped oxygen
  | 'suction'                     // Medical suction
  | 'cardiac_monitoring'          // Heart monitors
  | 'ventilator_ready'            // Ventilator support
  | 'isolation_rooms'             // Negative pressure rooms
  | 'family_rooms'                // Family accommodation
  | 'wifi'                        // Internet access
  | 'television'                  // Entertainment
  | 'refrigerator'                // Food storage
  | 'private_bathroom'            // En-suite bathroom
  | 'air_conditioning'            // Climate control
  | 'nurse_call_system'           // Emergency call buttons
  | 'wheelchair_accessible'       // Disability access
  | 'pharmacy_satellite';         // On-ward pharmacy

export interface Bed {
  id: string;
  wardId: string;                 // → Ward
  bedNumber: string;              // "MW-A-12" (Ward Code + Number)
  bedLabel?: string;              // "Bed 12 - Window side"
  type: BedType;
  status: BedStatus;
  // Current assignment
  currentPatientId?: string;      // → Patient (if occupied)
  currentAdmissionId?: string;    // → Admission (if occupied)
  assignedDate?: string;          // When patient was assigned
  // Bed features
  features: BedFeature[];         // Available equipment/features
  location: {
    row?: string;                 // "A", "B", "C"
    position?: string;            // "window", "door", "center"
    x?: number;                   // Floor plan coordinates
    y?: number;
  };
  // Pricing
  dailyRate: number;              // Cost per night (base rate)
  currency: string;               // "CDF", "USD"
  // Maintenance
  lastCleanedDate?: string;       // When bed was last cleaned
  lastMaintenanceDate?: string;   // Equipment maintenance
  nextMaintenanceDate?: string;   // Scheduled maintenance
  maintenanceNotes?: string;      // Maintenance history/issues
  // Status
  isActive: boolean;              // Bed operational?
  isBlocked: boolean;             // Temporarily unavailable?
  blockReason?: string;           // Why blocked?
  // Metadata
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
}

export type BedType = 
  | 'standard'                    // Regular hospital bed
  | 'electric'                    // Motorized positioning
  | 'icu'                         // ICU bed with monitoring
  | 'pediatric'                   // Child-sized bed
  | 'bariatric'                   // Heavy-duty for obese patients
  | 'birthing'                    // Labor & delivery bed
  | 'crib'                        // Infant crib
  | 'stretcher'                   // Emergency stretcher
  | 'recliner'                    // Day case reclining chair
  | 'dialysis';                   // Dialysis chair

export type BedStatus = 
  | 'available'                   // Ready for new patient
  | 'occupied'                    // Patient currently in bed
  | 'reserved'                    // Pre-booked for admission
  | 'cleaning'                    // Being cleaned/sanitized
  | 'maintenance'                 // Under repair
  | 'out_of_service'              // Broken/condemned
  | 'blocked';                    // Administratively blocked

export type BedFeature = 
  | 'oxygen_port'                 // Oxygen supply connection
  | 'suction_port'                // Medical suction
  | 'cardiac_monitor'             // Heart monitoring equipment
  | 'bp_monitor'                  // Blood pressure monitor
  | 'iv_pole'                     // IV drip stand
  | 'bedside_table'               // Storage table
  | 'nurse_call_button'           // Emergency call
  | 'reading_light'               // Individual lighting
  | 'privacy_curtain'             // Separation curtain
  | 'power_outlet'                // Electrical outlet
  | 'phone_jack'                  // Telephone connection
  | 'tv_mount'                    // Television bracket
  | 'weighing_scale'              // Built-in scale
  | 'ventilator_ready'            // Ventilator connections
  | 'isolation_equipment';        // Negative pressure, etc.

export interface WardCreate extends Omit<Ward, 'id' | 'occupiedBeds' | 'availableBeds' | 'createdAt'> {
  id?: string;
  createdAt?: string;
}

export interface WardUpdate extends Partial<Omit<Ward, 'id' | 'hospitalId' | 'organizationId' | 'createdAt'>> {
  updatedAt?: string;
}

export interface BedCreate extends Omit<Bed, 'id' | 'createdAt'> {
  id?: string;
  createdAt?: string;
}

export interface BedUpdate extends Partial<Omit<Bed, 'id' | 'wardId' | 'bedNumber' | 'createdAt'>> {
  updatedAt?: string;
}

/**
 * Ward occupancy statistics
 */
export interface WardOccupancy {
  wardId: string;
  wardName: string;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  reservedBeds: number;
  outOfServiceBeds: number;
  occupancyRate: number;          // Percentage (0-100)
  turnoverRate?: number;          // Beds per day
  avgLengthOfStay?: number;       // Days
}

/**
 * Bed assignment history for audit trail
 */
export interface BedAssignment {
  id: string;
  bedId: string;                  // → Bed
  patientId: string;              // → Patient
  admissionId?: string;           // → Admission
  assignedDate: string;           // ISO timestamp
  releasedDate?: string;          // ISO timestamp
  assignedBy: string;             // → User (who assigned)
  releasedBy?: string;            // → User (who released)
  reason: 'admission' | 'transfer' | 'discharge' | 'death' | 'absconded';
  notes?: string;
  createdAt: string;
}

export class WardUtils {
  /**
   * Calculate ward occupancy statistics
   */
  static calculateOccupancy(ward: Ward, beds: Bed[]): WardOccupancy {
    const wardBeds = beds.filter(bed => bed.wardId === ward.id && bed.isActive);
    const totalBeds = wardBeds.length;
    const occupiedBeds = wardBeds.filter(bed => bed.status === 'occupied').length;
    const availableBeds = wardBeds.filter(bed => bed.status === 'available').length;
    const reservedBeds = wardBeds.filter(bed => bed.status === 'reserved').length;
    const outOfServiceBeds = wardBeds.filter(bed => 
      ['maintenance', 'out_of_service', 'blocked'].includes(bed.status)
    ).length;

    return {
      wardId: ward.id,
      wardName: ward.name,
      totalBeds,
      occupiedBeds,
      availableBeds,
      reservedBeds,
      outOfServiceBeds,
      occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
    };
  }

  /**
   * Create ward with defaults
   */
  static createWard(data: WardCreate): Ward {
    const now = new Date().toISOString();
    return {
      ...data,
      id: data.id || generateUUID(),
      occupiedBeds: 0,
      availableBeds: data.totalBeds,
      nurseStaffIds: data.nurseStaffIds || [],
      specialties: data.specialties || [],
      amenities: data.amenities || [],
      createdAt: data.createdAt || now,
      updatedAt: now,
    };
  }

  /**
   * Update ward with timestamp
   */
  static updateWard(ward: Ward, updates: WardUpdate): Ward {
    return {
      ...ward,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get ward type display label
   */
  static getWardTypeLabel(type: WardType): string {
    switch (type) {
      case 'general': return 'General Medical';
      case 'surgical': return 'Surgical';
      case 'pediatric': return 'Pediatric';
      case 'maternity': return 'Maternity';
      case 'obstetrics': return 'Obstetrics & Gynecology';
      case 'icu': return 'Intensive Care Unit';
      case 'ccu': return 'Cardiac Care Unit';
      case 'nicu': return 'Neonatal ICU';
      case 'emergency': return 'Emergency';
      case 'isolation': return 'Isolation';
      case 'psychiatric': return 'Psychiatric';
      case 'rehabilitation': return 'Rehabilitation';
      case 'oncology': return 'Oncology';
      case 'dialysis': return 'Dialysis';
      case 'vip': return 'VIP/Private';
      case 'day_case': return 'Day Case';
      default: return type;
    }
  }

  /**
   * Get ward status color based on occupancy
   */
  static getOccupancyColor(occupancyRate: number): string {
    if (occupancyRate >= 95) return '#DC2626';      // Red - overcrowded
    if (occupancyRate >= 80) return '#F59E0B';      // Amber - high
    if (occupancyRate >= 60) return '#10B981';      // Green - good
    if (occupancyRate >= 20) return '#3B82F6';      // Blue - low
    return '#6B7280';                               // Gray - very low
  }
}

export class BedUtils {
  /**
   * Generate bed number: {WardCode}-{Number}
   * Example: MW-A-12 (Medical Ward A, Bed 12)
   */
  static generateBedNumber(wardCode: string, bedSequence: number): string {
    return `${wardCode}-${bedSequence.toString().padStart(2, '0')}`;
  }

  /**
   * Create bed with defaults
   */
  static createBed(data: BedCreate): Bed {
    const now = new Date().toISOString();
    return {
      ...data,
      id: data.id || generateUUID(),
      features: data.features || [],
      location: data.location || {},
      createdAt: data.createdAt || now,
      updatedAt: now,
    };
  }

  /**
   * Update bed with timestamp
   */
  static updateBed(bed: Bed, updates: BedUpdate): Bed {
    return {
      ...bed,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Assign patient to bed
   */
  static assignPatient(bed: Bed, patientId: string, admissionId?: string): Bed {
    if (bed.status !== 'available' && bed.status !== 'reserved') {
      throw new Error(`Cannot assign patient to bed with status: ${bed.status}`);
    }

    return this.updateBed(bed, {
      status: 'occupied',
      currentPatientId: patientId,
      currentAdmissionId: admissionId,
      assignedDate: new Date().toISOString(),
    });
  }

  /**
   * Release patient from bed
   */
  static releasePatient(bed: Bed): Bed {
    return this.updateBed(bed, {
      status: 'cleaning',
      currentPatientId: undefined,
      currentAdmissionId: undefined,
      assignedDate: undefined,
    });
  }

  /**
   * Mark bed as cleaned and available
   */
  static markCleaned(bed: Bed): Bed {
    return this.updateBed(bed, {
      status: 'available',
      lastCleanedDate: new Date().toISOString(),
    });
  }

  /**
   * Block bed (maintenance, etc.)
   */
  static blockBed(bed: Bed, reason: string): Bed {
    if (bed.status === 'occupied') {
      throw new Error('Cannot block occupied bed');
    }

    return this.updateBed(bed, {
      status: 'blocked',
      isBlocked: true,
      blockReason: reason,
    });
  }

  /**
   * Unblock bed
   */
  static unblockBed(bed: Bed): Bed {
    return this.updateBed(bed, {
      status: 'available',
      isBlocked: false,
      blockReason: undefined,
    });
  }

  /**
   * Get bed type display label
   */
  static getBedTypeLabel(type: BedType): string {
    switch (type) {
      case 'standard': return 'Standard';
      case 'electric': return 'Electric';
      case 'icu': return 'ICU';
      case 'pediatric': return 'Pediatric';
      case 'bariatric': return 'Bariatric';
      case 'birthing': return 'Birthing';
      case 'crib': return 'Crib';
      case 'stretcher': return 'Stretcher';
      case 'recliner': return 'Recliner';
      case 'dialysis': return 'Dialysis';
      default: return type;
    }
  }

  /**
   * Get bed status display color
   */
  static getStatusColor(status: BedStatus): string {
    switch (status) {
      case 'available': return '#10B981';     // Green
      case 'occupied': return '#EF4444';      // Red
      case 'reserved': return '#F59E0B';      // Amber
      case 'cleaning': return '#3B82F6';      // Blue
      case 'maintenance': return '#8B5CF6';   // Purple
      case 'out_of_service': return '#6B7280'; // Gray
      case 'blocked': return '#DC2626';       // Dark red
      default: return '#6B7280';
    }
  }

  /**
   * Get bed status display label
   */
  static getStatusLabel(status: BedStatus): string {
    switch (status) {
      case 'available': return 'Available';
      case 'occupied': return 'Occupied';
      case 'reserved': return 'Reserved';
      case 'cleaning': return 'Cleaning';
      case 'maintenance': return 'Maintenance';
      case 'out_of_service': return 'Out of Service';
      case 'blocked': return 'Blocked';
      default: return status;
    }
  }

  /**
   * Check if bed can be assigned
   */
  static canAssign(bed: Bed): boolean {
    return bed.isActive && ['available', 'reserved'].includes(bed.status);
  }

  /**
   * Check if bed can be released
   */
  static canRelease(bed: Bed): boolean {
    return bed.status === 'occupied';
  }

  /**
   * Get feature display labels
   */
  static getFeatureLabels(features: BedFeature[]): string[] {
    const labels: Record<BedFeature, string> = {
      'oxygen_port': 'Oxygen',
      'suction_port': 'Suction', 
      'cardiac_monitor': 'Cardiac Monitor',
      'bp_monitor': 'BP Monitor',
      'iv_pole': 'IV Pole',
      'bedside_table': 'Bedside Table',
      'nurse_call_button': 'Nurse Call',
      'reading_light': 'Reading Light',
      'privacy_curtain': 'Privacy Curtain',
      'power_outlet': 'Power Outlet',
      'phone_jack': 'Phone',
      'tv_mount': 'TV Mount',
      'weighing_scale': 'Scale',
      'ventilator_ready': 'Ventilator Ready',
      'isolation_equipment': 'Isolation Equipment',
    };

    return features.map(feature => labels[feature] || feature);
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