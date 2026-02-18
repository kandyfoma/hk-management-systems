// ═══════════════════════════════════════════════════════════════════════════
// Occupational Health — Protocol & Exam Requirements Architecture
// ═══════════════════════════════════════════════════════════════════════════
// Hierarchy: Sector → Department → Position → Protocol (per visit type) → Exams
//
// Design:
//   - Each company has a SECTOR (e.g. Mining, Telecom, Banking)
//   - Each sector has DEPARTMENTS (functional units / work areas)
//   - Each department has POSITIONS (job roles)
//   - Each position has one or more VISIT PROTOCOLS per ExamType (embauche, périodique…)
//   - Each protocol lists the required MEDICAL EXAM codes to perform
//   - Medical exams are cross-referenced from a global CATALOG with category/type info
//
// This enables:
//   ① Automatic protocol selection when a patient arrives (sector + position + visit type)
//   ② Checklist generation for the doctor (which exams to perform/request)
//   ③ Compliance tracking (were all required exams done?)
//   ④ Report generation per sector/position
// ═══════════════════════════════════════════════════════════════════════════

import { ExamType } from './OccupationalHealth';

// ─── Medical Exam Category ────────────────────────────────────
export type MedicalExamCategory =
  | 'clinique'        // Clinical examination
  | 'biologique'      // Lab / blood / urine tests
  | 'imagerie'        // Radiology / imaging
  | 'fonctionnel'     // Functional tests (spirometry, audiometry…)
  | 'cardiologique'   // Cardiac tests (ECG, stress test…)
  | 'ophtalmologie'   // Eye / vision tests
  | 'neurologique'    // Neurological tests
  | 'toxicologie'     // Toxicology (heavy metals, drugs…)
  | 'psychotechnique' // Psychotechnical / aptitude evaluation
  | 'psychosocial'    // Stress / mental health screening
  | 'aptitude';       // Fitness-for-specific-task tests

// ─── Medical Exam Entry (catalog item) ─────────────────────── 
export interface MedicalExamCatalogEntry {
  /** Unique code, e.g. "RADIO_THORAX" */
  code: string;
  /** Human-readable French label */
  label: string;
  /** Functional category for grouping in UI */
  category: MedicalExamCategory;
  /** Brief description of what the exam evaluates */
  description?: string;
  /** Whether a specialist referral is typically needed */
  requiresSpecialist?: boolean;
  /** Whether the result must be documented before fitness decision */
  mandatory?: boolean;
}

// ─── Exam Visit Protocol ──────────────────────────────────────
// A protocol binds a visit type (pre_employment, periodic…) to
// a list of required exam codes for a specific position.
export interface ExamVisitProtocol {
  /** Maps to ExamType: 'pre_employment' | 'periodic' | 'return_to_work' | … */
  visitType: ExamType;
  /** Human label for display, e.g. "Visite d'Embauche" */
  visitTypeLabel: string;
  /** Ordered list of exam codes required for this visit */
  requiredExams: string[];
  /** Exam codes that are strongly recommended but not strictly mandatory */
  recommendedExams?: string[];
  /** Any regulatory notes / legal references */
  regulatoryNote?: string;
  /** Validity period in months (0 = one-time only) */
  validityMonths?: number;
}

// ─── Position ────────────────────────────────────────────────
export interface OccPosition {
  /** Unique code scoped to the department, e.g. "FOREUR" */
  code: string;
  /** Full French job title, e.g. "Foreur / Dynamiteur" */
  name: string;
  /** Parent department code */
  departmentCode: string;
  /** Parent sector code */
  sectorCode: string;
  /** All visit protocols for this position */
  protocols: ExamVisitProtocol[];
  /** Typical exposure risks for this position */
  typicalExposures?: string[];
  /** Recommended PPE */
  recommendedPPE?: string[];
}

// ─── Department ───────────────────────────────────────────────
export interface OccDepartment {
  /** Unique code, e.g. "MIN_UNDER" */
  code: string;
  /** French name of the department / work area */
  name: string;
  /** Parent sector code */
  sectorCode: string;
  /** All positions within this department */
  positions: OccPosition[];
}

// ─── Sector ──────────────────────────────────────────────────
export interface OccSector {
  /** Short code, e.g. "MIN" */
  code: string;
  /** Full French name */
  name: string;
  /**
   * Optional link to an IndustrySector key from OccupationalHealth.ts.
   * Used to fetch SECTOR_PROFILES data (risk level, icon, color, etc.)
   */
  industrySectorKey?: string;
  /** All departments within this sector */
  departments: OccDepartment[];
}

// ─── Protocol Query Result ────────────────────────────────────
// Returned when looking up what to do for a specific patient visit.
export interface ProtocolQueryResult {
  sector: OccSector;
  department: OccDepartment;
  position: OccPosition;
  protocol: ExamVisitProtocol | null;
  requiredExams: MedicalExamCatalogEntry[];
  recommendedExams: MedicalExamCatalogEntry[];
  /** True if a matching protocol was found for the visit type */
  hasProtocol: boolean;
  /** Visit types available for this position (for dynamic UI) */
  availableVisitTypes: ExamType[];
}

// ─── Patient Employment Context ───────────────────────────────
// Extends existing patient fields with structured protocol references.
// These codes allow instant protocol lookup without free-text matching.
export interface PatientEmploymentContext {
  /** e.g. "MIN" — references OccSector.code */
  sectorCode: string;
  /** e.g. "MIN_UNDER" — references OccDepartment.code */
  departmentCode: string;
  /** e.g. "FOREUR" — references OccPosition.code */
  positionCode: string;
  /** Resolved sector name (denormalized for display) */
  sectorName?: string;
  /** Resolved department name (denormalized for display) */
  departmentName?: string;
  /** Resolved position name (denormalized for display) */
  positionName?: string;
}

// ─── Visit Checklist Item ────────────────────────────────────
// Used during consultation to track which required exams are done.
export interface ExamChecklistItem {
  exam: MedicalExamCatalogEntry;
  isRequired: boolean;
  isCompleted: boolean;
  completedAt?: string;
  resultSummary?: string;
  isAbnormal?: boolean;
  notes?: string;
}

// ─── Visit Checklist ─────────────────────────────────────────
export interface VisitExamChecklist {
  patientId: string;
  visitType: ExamType;
  positionCode: string;
  generatedAt: string;
  items: ExamChecklistItem[];
  completionRate: number; // 0–100
  allRequiredDone: boolean;
}

// ─── Category Labels & Colors ─────────────────────────────────
export const EXAM_CATEGORY_LABELS: Record<MedicalExamCategory, string> = {
  clinique:       'Clinique',
  biologique:     'Biologique',
  imagerie:       'Imagerie',
  fonctionnel:    'Fonctionnel',
  cardiologique:  'Cardiologique',
  ophtalmologie:  'Ophtalmologie',
  neurologique:   'Neurologique',
  toxicologie:    'Toxicologie',
  psychotechnique:'Psychotechnique',
  psychosocial:   'Psychosocial',
  aptitude:       'Aptitude',
};

export const EXAM_CATEGORY_COLORS: Record<MedicalExamCategory, string> = {
  clinique:       '#0EA5E9',
  biologique:     '#8B5CF6',
  imagerie:       '#F59E0B',
  fonctionnel:    '#10B981',
  cardiologique:  '#EF4444',
  ophtalmologie:  '#06B6D4',
  neurologique:   '#6366F1',
  toxicologie:    '#DC2626',
  psychotechnique:'#7C3AED',
  psychosocial:   '#EC4899',
  aptitude:       '#16A34A',
};

export const EXAM_CATEGORY_ICONS: Record<MedicalExamCategory, string> = {
  clinique:       'person',
  biologique:     'flask',
  imagerie:       'scan',
  fonctionnel:    'pulse',
  cardiologique:  'heart',
  ophtalmologie:  'eye',
  neurologique:   'hardware-chip',
  toxicologie:    'warning',
  psychotechnique:'brain',
  psychosocial:   'chatbubble',
  aptitude:       'checkmark-circle',
};

// ─── Visit Type Labels (mirrors ExamType in OccupationalHealth.ts) ─────────
export const VISIT_TYPE_LABELS: Partial<Record<ExamType, string>> = {
  pre_employment:  "Visite d'Embauche",
  periodic:        'Visite Périodique',
  return_to_work:  'Visite de Reprise',
  post_incident:   "Visite Post-Accident",
  fitness_for_duty:'Aptitude Spécifique',
  exit_medical:    'Visite de Sortie',
  special_request: 'Demande Spéciale',
  night_work:      'Aptitude Travail de Nuit',
};
