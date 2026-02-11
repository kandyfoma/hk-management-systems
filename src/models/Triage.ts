/**
 * Triage Model
 * 
 * Emergency department triage assessment for prioritizing patient care
 * based on severity and urgency of their condition.
 */

export interface Triage {
  id: string;
  encounterId: string;            // → Encounter
  patientId: string;              // → Patient
  nurseId: string;                // → User (triage nurse)
  organizationId: string;         // → Organization
  facilityId: string;             // → Hospital
  
  // Triage identification
  triageNumber: string;           // Auto-generated: "TR260001"
  triageDate: string;             // ISO timestamp
  
  // Triage classification
  level: TriageLevel;             // 1-5 severity scale
  category: TriageCategory;
  acuity: AcuityScore;            // Clinical acuity
  
  // Chief complaint
  chiefComplaint: string;         // Primary reason for visit
  symptomOnset: string;           // When symptoms started
  symptomDuration?: string;       // How long symptoms present
  symptomProgression?: 'improving' | 'stable' | 'worsening';
  
  // Vital signs at triage
  vitals: TriageVitals;
  
  // Pain assessment
  painLevel?: number;             // 0-10 scale
  painLocation?: string;          // Where is the pain
  painCharacter?: string;         // Sharp, dull, burning, etc.
  painRadiation?: string;         // Does pain spread
  
  // Clinical assessment
  consciousnessLevel: ConsciousnessLevel;
  airwayStatus: AirwayStatus;
  breathingStatus: BreathingStatus;
  circulationStatus: CirculationStatus;
  mobilityStatus: MobilityStatus;
  
  // Risk factors
  allergiesVerified: boolean;
  allergies?: string[];
  currentMedications?: string[];
  medicalHistory?: string[];      // Relevant conditions
  recentSurgery?: string;         // Surgery in last 30 days
  immunocompromised: boolean;
  pregnant?: boolean;             // If applicable
  pregnancyWeeks?: number;
  
  // Red flags (automatic escalation triggers)
  redFlags: RedFlag[];
  hasRedFlags: boolean;
  
  // Trauma assessment (if applicable)
  isTrauma: boolean;
  traumaMechanism?: string;       // How injury occurred
  traumaTime?: string;            // When injury occurred
  
  // Infectious disease screening
  feverScreening: boolean;        // Temperature > 38°C
  respiratorySymptoms: boolean;   // Cough, SOB, etc.
  travelHistory?: string;         // Recent travel
  exposureHistory?: string;       // Contact with sick persons
  isolationRequired: boolean;
  
  // Disposition
  assignedArea?: string;          // Where patient will wait/be treated
  assignedDoctor?: string;        // → User (assigned physician)
  estimatedWaitTime?: number;     // Minutes
  reassessmentTime?: string;      // When to reassess
  
  // Notes
  triageNotes?: string;           // Additional observations
  handoffNotes?: string;          // For next provider
  
  // Status
  status: TriageStatus;
  
  // Timestamps
  arrivalTime: string;            // When patient arrived
  triageStartTime: string;        // When triage started
  triageEndTime?: string;         // When triage completed
  seenByDoctorTime?: string;      // When doctor saw patient
  
  // Metadata
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
}

export type TriageLevel = 1 | 2 | 3 | 4 | 5;

export type TriageCategory = 
  | 'resuscitation'               // Level 1: Immediate life-threatening
  | 'emergency'                   // Level 2: Imminent life-threatening
  | 'urgent'                      // Level 3: Could progress to emergency
  | 'semi_urgent'                 // Level 4: Less urgent but needs care
  | 'non_urgent';                 // Level 5: Minor issues

export type AcuityScore = 
  | 'critical'                    // Requires immediate intervention
  | 'high'                        // Requires rapid intervention
  | 'moderate'                    // Requires timely care
  | 'low'                         // Can wait safely
  | 'minimal';                    // Very low acuity

export type ConsciousnessLevel = 
  | 'alert'                       // Fully conscious
  | 'verbal'                      // Responds to voice
  | 'pain'                        // Responds to pain
  | 'unresponsive';               // No response (AVPU scale)

export type AirwayStatus = 
  | 'patent'                      // Airway open and clear
  | 'at_risk'                     // May become compromised
  | 'compromised'                 // Partially obstructed
  | 'obstructed';                 // Completely blocked

export type BreathingStatus = 
  | 'normal'                      // Normal breathing
  | 'labored'                     // Increased work of breathing
  | 'distressed'                  // Severe difficulty
  | 'apneic'                      // Not breathing
  | 'assisted';                   // On ventilator/oxygen

export type CirculationStatus = 
  | 'normal'                      // Normal circulation
  | 'compensated'                 // Compensated shock
  | 'decompensated'               // Decompensated shock
  | 'arrest';                     // Cardiac arrest

export type MobilityStatus = 
  | 'ambulatory'                  // Walking independently
  | 'assisted'                    // Needs assistance
  | 'wheelchair'                  // Wheelchair bound
  | 'stretcher'                   // On stretcher/bed
  | 'immobile';                   // Cannot move

export type TriageStatus = 
  | 'in_progress'                 // Triage ongoing
  | 'completed'                   // Triage done, waiting
  | 'in_treatment'                // Being treated
  | 'reassessment_needed'         // Needs re-triage
  | 'discharged'                  // Left ED
  | 'admitted'                    // Admitted to hospital
  | 'transferred'                 // Transferred out
  | 'left_before_seen'            // LWBS
  | 'left_against_advice';        // AMA

export type RedFlag = 
  | 'chest_pain'                  // Cardiac symptoms
  | 'stroke_symptoms'             // Neurological symptoms
  | 'severe_bleeding'             // Major hemorrhage
  | 'difficulty_breathing'        // Respiratory distress
  | 'altered_consciousness'       // Confusion, drowsiness
  | 'severe_trauma'               // Major injury
  | 'high_fever_child'            // Pediatric fever >39°C
  | 'seizure'                     // Active or recent seizure
  | 'severe_allergic_reaction'    // Anaphylaxis
  | 'suicidal_ideation'           // Mental health crisis
  | 'obstetric_emergency'         // Pregnancy complications
  | 'severe_pain'                 // Pain 9-10/10
  | 'abnormal_vitals'             // Critical vital signs
  | 'toxic_exposure';             // Poisoning/overdose

export interface TriageVitals {
  temperature?: number;           // Celsius
  temperatureMethod?: 'oral' | 'axillary' | 'rectal' | 'tympanic' | 'temporal';
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;             // BPM
  respiratoryRate?: number;       // Per minute
  oxygenSaturation?: number;      // SpO2 percentage
  oxygenSupplementation?: string; // "Room air", "2L NC", etc.
  bloodGlucose?: number;          // mg/dL
  weight?: number;                // kg (estimated if needed)
  weightEstimated: boolean;
  pupilsEqual: boolean;
  pupilSize?: string;             // "3mm reactive" etc.
  skinCondition?: string;         // Color, moisture, temperature
  capillaryRefill?: number;       // Seconds
}

// CRUD interfaces
export interface TriageCreate extends Omit<Triage, 'id' | 'triageNumber' | 'hasRedFlags' | 'createdAt'> {
  id?: string;
  triageNumber?: string;
  createdAt?: string;
}

export interface TriageUpdate extends Partial<Omit<Triage, 'id' | 'triageNumber' | 'patientId' | 'encounterId' | 'createdAt'>> {
  updatedAt?: string;
}

/**
 * Triage statistics for ED dashboard
 */
export interface TriageStats {
  currentWaiting: number;
  byLevel: Record<TriageLevel, number>;
  byCategory: Record<TriageCategory, number>;
  averageWaitTime: number;        // Minutes
  averageTriageTime: number;      // Minutes
  leftBeforeSeen: number;
  redFlagCount: number;
  longestWait: number;            // Minutes
}

/**
 * Triage level configuration (hospital-specific thresholds)
 */
export const TRIAGE_LEVEL_CONFIG = {
  1: {
    name: 'Resuscitation',
    category: 'resuscitation',
    color: '#DC2626',              // Red
    maxWaitTime: 0,                // Immediate
    description: 'Conditions that are threats to life or limb',
    examples: ['Cardiac arrest', 'Severe trauma', 'Active seizure', 'Anaphylaxis'],
  },
  2: {
    name: 'Emergency',
    category: 'emergency',
    color: '#EA580C',              // Orange
    maxWaitTime: 10,               // 10 minutes
    description: 'Conditions that are a potential threat to life, limb, or function',
    examples: ['Chest pain', 'Stroke symptoms', 'Severe asthma', 'Major fracture'],
  },
  3: {
    name: 'Urgent',
    category: 'urgent',
    color: '#F59E0B',              // Yellow/Amber
    maxWaitTime: 30,               // 30 minutes
    description: 'Conditions that could potentially progress to a serious problem',
    examples: ['Moderate pain', 'High fever', 'Vomiting/dehydration', 'Lacerations'],
  },
  4: {
    name: 'Semi-Urgent',
    category: 'semi_urgent',
    color: '#22C55E',              // Green
    maxWaitTime: 60,               // 60 minutes
    description: 'Conditions that are related to patient age, distress, or risk of deterioration',
    examples: ['Mild pain', 'Minor injuries', 'Chronic conditions', 'Simple infections'],
  },
  5: {
    name: 'Non-Urgent',
    category: 'non_urgent',
    color: '#3B82F6',              // Blue
    maxWaitTime: 120,              // 120 minutes
    description: 'Conditions that are minor or part of an ongoing problem',
    examples: ['Cold symptoms', 'Minor rash', 'Medication refills', 'Follow-up care'],
  },
} as const;

export class TriageUtils {
  /**
   * Generate triage number: TR{YY}{DDDD}
   */
  static generateTriageNumber(): string {
    const year = new Date().getFullYear().toString().slice(-2);
    const sequence = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `TR${year}${sequence}`;
  }

  /**
   * Create triage with defaults
   */
  static createTriage(data: TriageCreate): Triage {
    const now = new Date().toISOString();
    const hasRedFlags = data.redFlags && data.redFlags.length > 0;
    
    return {
      ...data,
      id: data.id || generateUUID(),
      triageNumber: data.triageNumber || this.generateTriageNumber(),
      hasRedFlags: hasRedFlags || false,
      redFlags: data.redFlags || [],
      createdAt: data.createdAt || now,
      updatedAt: now,
    };
  }

  /**
   * Calculate triage level based on assessment
   */
  static calculateTriageLevel(triage: Partial<Triage>): TriageLevel {
    // Level 1: Resuscitation
    if (
      triage.consciousnessLevel === 'unresponsive' ||
      triage.airwayStatus === 'obstructed' ||
      triage.breathingStatus === 'apneic' ||
      triage.circulationStatus === 'arrest' ||
      triage.hasRedFlags
    ) {
      return 1;
    }

    // Level 2: Emergency
    if (
      triage.consciousnessLevel === 'pain' ||
      triage.airwayStatus === 'compromised' ||
      triage.breathingStatus === 'distressed' ||
      triage.circulationStatus === 'decompensated' ||
      (triage.painLevel && triage.painLevel >= 8)
    ) {
      return 2;
    }

    // Level 3: Urgent
    if (
      triage.consciousnessLevel === 'verbal' ||
      triage.airwayStatus === 'at_risk' ||
      triage.breathingStatus === 'labored' ||
      triage.circulationStatus === 'compensated' ||
      (triage.painLevel && triage.painLevel >= 5)
    ) {
      return 3;
    }

    // Level 4: Semi-urgent
    if (
      (triage.painLevel && triage.painLevel >= 2) ||
      triage.mobilityStatus === 'assisted'
    ) {
      return 4;
    }

    // Level 5: Non-urgent
    return 5;
  }

  /**
   * Check if vital signs are critical
   */
  static hasAbnormalVitals(vitals: TriageVitals): boolean {
    // Check for critical values
    if (vitals.temperature && (vitals.temperature < 35 || vitals.temperature > 40)) return true;
    if (vitals.bloodPressureSystolic && (vitals.bloodPressureSystolic < 90 || vitals.bloodPressureSystolic > 180)) return true;
    if (vitals.heartRate && (vitals.heartRate < 50 || vitals.heartRate > 130)) return true;
    if (vitals.respiratoryRate && (vitals.respiratoryRate < 10 || vitals.respiratoryRate > 30)) return true;
    if (vitals.oxygenSaturation && vitals.oxygenSaturation < 92) return true;
    if (vitals.bloodGlucose && (vitals.bloodGlucose < 60 || vitals.bloodGlucose > 400)) return true;
    
    return false;
  }

  /**
   * Get triage level color
   */
  static getLevelColor(level: TriageLevel): string {
    return TRIAGE_LEVEL_CONFIG[level].color;
  }

  /**
   * Get triage category from level
   */
  static getCategoryFromLevel(level: TriageLevel): TriageCategory {
    return TRIAGE_LEVEL_CONFIG[level].category as TriageCategory;
  }

  /**
   * Get max wait time for level
   */
  static getMaxWaitTime(level: TriageLevel): number {
    return TRIAGE_LEVEL_CONFIG[level].maxWaitTime;
  }

  /**
   * Check if patient has been waiting too long
   */
  static isWaitTimeExceeded(triage: Triage): boolean {
    if (triage.status !== 'completed') return false;
    
    const maxWait = this.getMaxWaitTime(triage.level);
    const waitTime = this.getWaitTime(triage);
    
    return waitTime > maxWait;
  }

  /**
   * Calculate current wait time in minutes
   */
  static getWaitTime(triage: Triage): number {
    if (triage.seenByDoctorTime) {
      const end = new Date(triage.seenByDoctorTime);
      const start = new Date(triage.triageEndTime || triage.triageStartTime);
      return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    }
    
    const now = new Date();
    const start = new Date(triage.triageEndTime || triage.triageStartTime);
    return Math.round((now.getTime() - start.getTime()) / (1000 * 60));
  }

  /**
   * Get status color
   */
  static getStatusColor(status: TriageStatus): string {
    switch (status) {
      case 'in_progress': return '#8B5CF6';       // Purple
      case 'completed': return '#F59E0B';         // Amber (waiting)
      case 'in_treatment': return '#10B981';      // Green
      case 'reassessment_needed': return '#EF4444'; // Red
      case 'discharged': return '#6B7280';        // Gray
      case 'admitted': return '#3B82F6';          // Blue
      case 'transferred': return '#0891B2';       // Cyan
      case 'left_before_seen': return '#DC2626';  // Dark red
      case 'left_against_advice': return '#B91C1C'; // Darker red
      default: return '#6B7280';
    }
  }

  /**
   * Format red flags for display
   */
  static formatRedFlags(flags: RedFlag[]): string[] {
    const labels: Record<RedFlag, string> = {
      'chest_pain': '⚠️ Chest Pain',
      'stroke_symptoms': '⚠️ Stroke Symptoms',
      'severe_bleeding': '⚠️ Severe Bleeding',
      'difficulty_breathing': '⚠️ Difficulty Breathing',
      'altered_consciousness': '⚠️ Altered Consciousness',
      'severe_trauma': '⚠️ Severe Trauma',
      'high_fever_child': '⚠️ High Fever (Child)',
      'seizure': '⚠️ Seizure',
      'severe_allergic_reaction': '⚠️ Anaphylaxis',
      'suicidal_ideation': '⚠️ Suicide Risk',
      'obstetric_emergency': '⚠️ OB Emergency',
      'severe_pain': '⚠️ Severe Pain',
      'abnormal_vitals': '⚠️ Abnormal Vitals',
      'toxic_exposure': '⚠️ Toxic Exposure',
    };

    return flags.map(flag => labels[flag] || flag);
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