// ═══════════════════════════════════════════════════════════════════════════
// Occupational Health (Médecine du Travail) — Multi-Sector Data Models
// ═══════════════════════════════════════════════════════════════════════════
// Standards: ILO C155/C161/C187 · WHO Healthy Workplaces · ISO 45001:2018
//            ICD-10 (Occupational) · GHS (Chemical Hazards)
// Sectors:   Mining · Construction · Manufacturing · Banking/Office
//            Agriculture · Oil & Gas · Healthcare · Transport · Telecom
// ═══════════════════════════════════════════════════════════════════════════

import { Patient } from './Patient';

// ─── Industry Sector ─────────────────────────────────────────
export type IndustrySector =
  | 'mining'            // Mines & carrières
  | 'construction'      // Bâtiment & travaux publics
  | 'manufacturing'     // Industrie manufacturière
  | 'oil_gas'           // Pétrole & gaz
  | 'agriculture'       // Agriculture & agroalimentaire
  | 'banking_finance'   // Banque & finance
  | 'healthcare'        // Santé & soins
  | 'transport'         // Transport & logistique
  | 'telecom_it'        // Télécommunications & IT
  | 'education'         // Enseignement
  | 'hospitality'       // Hôtellerie & restauration
  | 'energy_utilities'  // Énergie & services publics
  | 'retail'            // Commerce de détail
  | 'government'        // Administration publique
  | 'ngo'               // ONG & organisations internationales
  | 'other';            // Autre

export type SectorRiskLevel = 'very_high' | 'high' | 'medium' | 'low';

// ─── Sector Configuration ────────────────────────────────────
export interface SectorProfile {
  sector: IndustrySector;
  label: string;
  riskLevel: SectorRiskLevel;
  icon: string;
  color: string;
  typicalRisks: ExposureRisk[];
  mandatoryExams: ExamType[];
  recommendedScreenings: string[];
  regulatoryBodies: string[];
  applicableStandards: string[];
}

export const SECTOR_PROFILES: Record<IndustrySector, SectorProfile> = {
  mining: {
    sector: 'mining',
    label: 'Mines & Carrières',
    riskLevel: 'very_high',
    icon: 'construct',
    color: '#D97706',
    typicalRisks: ['silica_dust', 'coal_dust', 'noise', 'vibration', 'heat_stress', 'confined_spaces', 'working_at_heights', 'heavy_metals', 'radiation', 'diesel_exhaust'],
    mandatoryExams: ['pre_employment', 'periodic', 'return_to_work', 'exit_medical'],
    recommendedScreenings: ['audiometry', 'spirometry', 'chest_xray', 'blood_lead', 'drug_screening', 'vision_test'],
    regulatoryBodies: ['Direction des Mines', 'Inspection du Travail', 'CNSS'],
    applicableStandards: ['ILO C176 (Safety & Health in Mines)', 'ILO C162 (Asbestos)', 'ISO 45001:2018', 'Code Minier RDC'],
  },
  construction: {
    sector: 'construction',
    label: 'Bâtiment & Travaux Publics',
    riskLevel: 'very_high',
    icon: 'hammer',
    color: '#EA580C',
    typicalRisks: ['working_at_heights', 'noise', 'vibration', 'silica_dust', 'chemical_exposure', 'ergonomic', 'heat_stress', 'asbestos'],
    mandatoryExams: ['pre_employment', 'periodic', 'return_to_work', 'fitness_for_duty'],
    recommendedScreenings: ['audiometry', 'spirometry', 'vision_test', 'drug_screening', 'musculoskeletal_screening'],
    regulatoryBodies: ['Inspection du Travail', 'CNSS', 'Ordre des Architectes'],
    applicableStandards: ['ILO C167 (Safety & Health in Construction)', 'ISO 45001:2018', 'Code du Travail RDC'],
  },
  manufacturing: {
    sector: 'manufacturing',
    label: 'Industrie Manufacturière',
    riskLevel: 'high',
    icon: 'cog',
    color: '#7C3AED',
    typicalRisks: ['noise', 'chemical_exposure', 'ergonomic', 'vibration', 'heat_stress', 'electrical', 'machine_hazards'],
    mandatoryExams: ['pre_employment', 'periodic', 'return_to_work'],
    recommendedScreenings: ['audiometry', 'spirometry', 'vision_test', 'dermatological_screening'],
    regulatoryBodies: ['Inspection du Travail', 'CNSS'],
    applicableStandards: ['ILO C119 (Guarding of Machinery)', 'ILO C170 (Chemicals)', 'ISO 45001:2018'],
  },
  oil_gas: {
    sector: 'oil_gas',
    label: 'Pétrole & Gaz',
    riskLevel: 'very_high',
    icon: 'flame',
    color: '#DC2626',
    typicalRisks: ['chemical_exposure', 'fire_explosion', 'confined_spaces', 'noise', 'heat_stress', 'radiation', 'ergonomic', 'psychosocial', 'working_at_heights'],
    mandatoryExams: ['pre_employment', 'periodic', 'return_to_work', 'fitness_for_duty', 'exit_medical'],
    recommendedScreenings: ['spirometry', 'audiometry', 'drug_screening', 'vision_test', 'cardiac_screening', 'chest_xray'],
    regulatoryBodies: ['Ministère des Hydrocarbures', 'Inspection du Travail', 'CNSS'],
    applicableStandards: ['OGP (IOGP) Guidelines', 'ILO C155', 'ISO 45001:2018', 'API Standards'],
  },
  agriculture: {
    sector: 'agriculture',
    label: 'Agriculture & Agroalimentaire',
    riskLevel: 'high',
    icon: 'leaf',
    color: '#16A34A',
    typicalRisks: ['chemical_exposure', 'biological', 'ergonomic', 'heat_stress', 'noise', 'vibration', 'animal_hazards'],
    mandatoryExams: ['pre_employment', 'periodic'],
    recommendedScreenings: ['spirometry', 'blood_cholinesterase', 'dermatological_screening', 'vision_test'],
    regulatoryBodies: ['Inspection du Travail', 'CNSS', 'Ministère de l\'Agriculture'],
    applicableStandards: ['ILO C184 (Safety & Health in Agriculture)', 'ISO 45001:2018', 'FAO Guidelines'],
  },
  banking_finance: {
    sector: 'banking_finance',
    label: 'Banque & Finance',
    riskLevel: 'low',
    icon: 'business',
    color: '#2563EB',
    typicalRisks: ['ergonomic', 'psychosocial', 'vdt_screen', 'sedentary', 'indoor_air_quality'],
    mandatoryExams: ['pre_employment', 'periodic'],
    recommendedScreenings: ['vision_test', 'ergonomic_assessment', 'cardiovascular_screening', 'mental_health_screening'],
    regulatoryBodies: ['Inspection du Travail', 'CNSS', 'Banque Centrale'],
    applicableStandards: ['ILO C155', 'ISO 45001:2018', 'EU VDT Directive 90/270/EEC (reference)'],
  },
  healthcare: {
    sector: 'healthcare',
    label: 'Santé & Soins',
    riskLevel: 'high',
    icon: 'medkit',
    color: '#0EA5E9',
    typicalRisks: ['biological', 'chemical_exposure', 'radiation', 'ergonomic', 'psychosocial', 'needle_stick', 'shift_work'],
    mandatoryExams: ['pre_employment', 'periodic', 'return_to_work'],
    recommendedScreenings: ['hepatitis_b_screening', 'tb_screening', 'blood_pathogen_test', 'mental_health_screening', 'vision_test'],
    regulatoryBodies: ['Inspection du Travail', 'CNSS', 'Ministère de la Santé', 'Ordre des Médecins'],
    applicableStandards: ['ILO C149 (Nursing Personnel)', 'WHO Healthy Workplaces', 'ISO 45001:2018', 'CDC/WHO Infection Control'],
  },
  transport: {
    sector: 'transport',
    label: 'Transport & Logistique',
    riskLevel: 'high',
    icon: 'car',
    color: '#0891B2',
    typicalRisks: ['ergonomic', 'vibration', 'noise', 'psychosocial', 'shift_work', 'road_accident', 'diesel_exhaust'],
    mandatoryExams: ['pre_employment', 'periodic', 'fitness_for_duty'],
    recommendedScreenings: ['vision_test', 'audiometry', 'drug_screening', 'cardiovascular_screening', 'sleep_apnea_screening'],
    regulatoryBodies: ['Inspection du Travail', 'CNSS', 'Ministère des Transports'],
    applicableStandards: ['ILO C153 (Hours of Work — Road Transport)', 'ISO 45001:2018', 'ISO 39001 (Road Traffic Safety)'],
  },
  telecom_it: {
    sector: 'telecom_it',
    label: 'Télécommunications & IT',
    riskLevel: 'low',
    icon: 'globe',
    color: '#6366F1',
    typicalRisks: ['ergonomic', 'psychosocial', 'vdt_screen', 'sedentary', 'electrical', 'working_at_heights'],
    mandatoryExams: ['pre_employment', 'periodic'],
    recommendedScreenings: ['vision_test', 'ergonomic_assessment', 'mental_health_screening'],
    regulatoryBodies: ['Inspection du Travail', 'CNSS', 'ARPTC'],
    applicableStandards: ['ILO C155', 'ISO 45001:2018', 'ITU Guidelines'],
  },
  education: {
    sector: 'education',
    label: 'Enseignement',
    riskLevel: 'low',
    icon: 'school',
    color: '#8B5CF6',
    typicalRisks: ['psychosocial', 'ergonomic', 'biological', 'voice_strain', 'indoor_air_quality'],
    mandatoryExams: ['pre_employment', 'periodic'],
    recommendedScreenings: ['vision_test', 'mental_health_screening', 'voice_assessment'],
    regulatoryBodies: ['Inspection du Travail', 'CNSS', 'Ministère de l\'Éducation'],
    applicableStandards: ['ILO C155', 'ISO 45001:2018', 'UNESCO Guidelines'],
  },
  hospitality: {
    sector: 'hospitality',
    label: 'Hôtellerie & Restauration',
    riskLevel: 'medium',
    icon: 'restaurant',
    color: '#F59E0B',
    typicalRisks: ['ergonomic', 'heat_stress', 'chemical_exposure', 'biological', 'psychosocial', 'shift_work', 'slip_trip_fall'],
    mandatoryExams: ['pre_employment', 'periodic'],
    recommendedScreenings: ['food_handler_certificate', 'dermatological_screening', 'hepatitis_screening'],
    regulatoryBodies: ['Inspection du Travail', 'CNSS', 'Inspection Sanitaire'],
    applicableStandards: ['ILO C172 (Working Conditions in Hotels/Restaurants)', 'ISO 45001:2018', 'HACCP'],
  },
  energy_utilities: {
    sector: 'energy_utilities',
    label: 'Énergie & Services Publics',
    riskLevel: 'high',
    icon: 'flash',
    color: '#CA8A04',
    typicalRisks: ['electrical', 'working_at_heights', 'confined_spaces', 'radiation', 'noise', 'chemical_exposure', 'heat_stress'],
    mandatoryExams: ['pre_employment', 'periodic', 'fitness_for_duty', 'return_to_work'],
    recommendedScreenings: ['vision_test', 'audiometry', 'cardiac_screening', 'drug_screening'],
    regulatoryBodies: ['Inspection du Travail', 'CNSS', 'Ministère de l\'Énergie'],
    applicableStandards: ['ILO C155', 'ISO 45001:2018', 'IEC Safety Standards'],
  },
  retail: {
    sector: 'retail',
    label: 'Commerce de Détail',
    riskLevel: 'low',
    icon: 'cart',
    color: '#EC4899',
    typicalRisks: ['ergonomic', 'psychosocial', 'slip_trip_fall', 'violence_aggression'],
    mandatoryExams: ['pre_employment', 'periodic'],
    recommendedScreenings: ['ergonomic_assessment', 'mental_health_screening'],
    regulatoryBodies: ['Inspection du Travail', 'CNSS'],
    applicableStandards: ['ILO C155', 'ISO 45001:2018'],
  },
  government: {
    sector: 'government',
    label: 'Administration Publique',
    riskLevel: 'low',
    icon: 'flag',
    color: '#475569',
    typicalRisks: ['ergonomic', 'psychosocial', 'vdt_screen', 'sedentary', 'indoor_air_quality'],
    mandatoryExams: ['pre_employment', 'periodic'],
    recommendedScreenings: ['vision_test', 'ergonomic_assessment', 'cardiovascular_screening'],
    regulatoryBodies: ['Fonction Publique', 'CNSS'],
    applicableStandards: ['ILO C155', 'ISO 45001:2018', 'Statut de la Fonction Publique'],
  },
  ngo: {
    sector: 'ngo',
    label: 'ONG & Organisations Internationales',
    riskLevel: 'medium',
    icon: 'earth',
    color: '#059669',
    typicalRisks: ['psychosocial', 'biological', 'road_accident', 'heat_stress', 'violence_aggression', 'ergonomic'],
    mandatoryExams: ['pre_employment', 'periodic', 'fitness_for_duty'],
    recommendedScreenings: ['vaccination_status', 'mental_health_screening', 'tropical_disease_screening'],
    regulatoryBodies: ['Inspection du Travail', 'CNSS'],
    applicableStandards: ['ILO C155', 'ISO 45001:2018', 'UN MOSS (Minimum Operating Security Standards)', 'WHO Travel Health'],
  },
  other: {
    sector: 'other',
    label: 'Autre Secteur',
    riskLevel: 'medium',
    icon: 'briefcase',
    color: '#64748B',
    typicalRisks: ['ergonomic', 'psychosocial'],
    mandatoryExams: ['pre_employment', 'periodic'],
    recommendedScreenings: ['vision_test', 'general_health_check'],
    regulatoryBodies: ['Inspection du Travail', 'CNSS'],
    applicableStandards: ['ILO C155', 'ISO 45001:2018', 'Code du Travail RDC'],
  },
};

// ─── Enterprise / Company ────────────────────────────────────
export interface Enterprise {
  id: string;
  name: string;
  sector: IndustrySector;
  registrationNumber?: string;
  address?: string;
  city?: string;
  province?: string;
  country: string;
  phone?: string;
  email?: string;
  sites: WorkSite[];
  ohServiceType: 'internal' | 'external' | 'inter_enterprise';
  ohServiceProvider?: string;
  totalEmployees: number;
  highRiskEmployees: number;
  createdAt: string;
  updatedAt?: string;
}

export interface WorkSite {
  id: string;
  name: string;
  address?: string;
  gpsCoordinates?: { latitude: number; longitude: number };
  departments: string[];
  totalWorkers: number;
  riskLevel: SectorRiskLevel;
  isActive: boolean;
}

// ─── Worker / Employee ───────────────────────────────────────
// ─── Occupational Health Patient Extension ──────────────────────────────────
// A Patient in the OH context is still a Patient — but with required employment
// fields. The base Patient model has optional sector/company/jobTitle fields that
// become mandatory here. This means the same person is always a Patient; when
// they enter Occupational Health, their employment context is enriched.
export interface OccupationalHealthPatient extends Patient {
  // Employment Information (required in OH context, optional on base Patient)
  employeeId: string;
  enterpriseId?: string;
  company: string;
  sector: IndustrySector;
  site: string;
  department: string;
  jobTitle: string;
  jobCategory: JobCategory;
  shiftPattern: ShiftPattern;
  hireDate: string;
  contractType: 'permanent' | 'contract' | 'seasonal' | 'intern' | 'daily_worker';
  
  // Occupational Health Status
  fitnessStatus: FitnessStatus;
  lastMedicalExam?: string;
  nextMedicalExam?: string;
  vaccinationStatus?: VaccinationRecord[];
  exposureRisks: ExposureRisk[];
  ppeRequired: PPEType[];
  riskLevel: SectorRiskLevel;
}

// Legacy alias — prefer OccupationalHealthPatient
/** @deprecated Use OccupationalHealthPatient instead */
export type Worker = OccupationalHealthPatient;

export interface VaccinationRecord {
  vaccine: string;
  date: string;
  boosterDue?: string;
  batchNumber?: string;
}

// ─── Job Category (Multi-Sector) ─────────────────────────────
export type JobCategory =
  | 'executive' | 'management' | 'administration' | 'human_resources' | 'finance_accounting'
  | 'office_clerical' | 'customer_service' | 'it_systems' | 'legal_compliance'
  | 'underground_work' | 'surface_operations' | 'processing_refining' | 'drilling_blasting'
  | 'construction_trades' | 'heavy_equipment' | 'production_line' | 'assembly' | 'quality_control'
  | 'maintenance_mechanical' | 'maintenance_electrical' | 'laboratory'
  | 'driving_transport' | 'warehousing' | 'logistics'
  | 'clinical_care' | 'nursing' | 'patient_support'
  | 'farming' | 'agro_processing'
  | 'safety_officer' | 'security_guard'
  | 'cleaning_housekeeping' | 'catering_food' | 'environmental'
  | 'teaching' | 'research'
  | 'other';

export type ShiftPattern =
  | 'day_shift' | 'night_shift' | 'rotating' | 'on_call' | 'regular' | 'flexible' | 'split_shift';

export type FitnessStatus =
  | 'fit' | 'fit_with_restrictions' | 'temporarily_unfit'
  | 'permanently_unfit' | 'pending_evaluation' | 'expired';

// ─── Medical Examination (ILO C161 / WHO) ────────────────────
export interface MedicalExamination {
  id: string;
  patientId: string; // References Patient.id (same person, different context)
  workerSector: IndustrySector;
  examType: ExamType;
  examDate: string;
  expiryDate: string;
  examinerDoctorId: string;
  examinerName: string;
  vitals: VitalSigns;
  physicalExam: PhysicalExamination;
  audiometry?: AudiometryResult;
  spirometry?: SpirometryResult;
  visionTest?: VisionTestResult;
  chestXRay?: ChestXRayResult;
  labResults?: LabResults;
  drugScreening?: DrugScreeningResult;
  ergonomicAssessment?: ErgonomicAssessment;
  mentalHealthScreening?: MentalHealthScreening;
  cardiovascularScreening?: CardiovascularScreening;
  fitnessDecision: FitnessStatus;
  restrictions: string[];
  recommendations: string[];
  followUpDate?: string;
  followUpReason?: string;
  certificateNumber?: string;
  certificateIssued: boolean;
  notes?: string;
  sectorQuestionnaireAnswers?: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
}

export type ExamType =
  | 'pre_employment' | 'periodic' | 'return_to_work' | 'post_incident'
  | 'fitness_for_duty' | 'exit_medical' | 'special_request'
  | 'pregnancy_related' | 'night_work';

export interface VitalSigns {
  temperature?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  visualAcuity?: string;
  waistCircumference?: number;
}

export interface PhysicalExamination {
  generalAppearance: 'normal' | 'abnormal';
  generalNotes?: string;
  cardiovascular: 'normal' | 'abnormal';
  cardiovascularNotes?: string;
  respiratory: 'normal' | 'abnormal';
  respiratoryNotes?: string;
  musculoskeletal: 'normal' | 'abnormal';
  musculoskeletalNotes?: string;
  neurological: 'normal' | 'abnormal';
  neurologicalNotes?: string;
  dermatological: 'normal' | 'abnormal';
  dermatologicalNotes?: string;
  ent: 'normal' | 'abnormal';
  entNotes?: string;
  abdomen: 'normal' | 'abnormal';
  abdomenNotes?: string;
  mentalHealth: 'normal' | 'concern';
  mentalHealthNotes?: string;
  ophthalmological: 'normal' | 'abnormal';
  ophthalmologicalNotes?: string;
}

// ─── Specialized Test Results ────────────────────────────────

export interface AudiometryResult {
  date: string;
  leftEar: HearingThresholds;
  rightEar: HearingThresholds;
  classification: 'normal' | 'mild_loss' | 'moderate_loss' | 'severe_loss' | 'profound_loss';
  noiseDamageDetected: boolean;
  baselineShift: boolean;
  notes?: string;
}

export interface HearingThresholds {
  hz250?: number; hz500?: number; hz1000?: number; hz2000?: number;
  hz3000?: number; hz4000?: number; hz6000?: number; hz8000?: number;
}

export interface SpirometryResult {
  date: string;
  fvc: number; fvcPercent: number;
  fev1: number; fev1Percent: number;
  fev1FvcRatio: number;
  pef?: number;
  interpretation: 'normal' | 'restrictive' | 'obstructive' | 'mixed';
  pneumoconiosisRisk: boolean;
  notes?: string;
}

export interface VisionTestResult {
  date: string;
  distanceLeft: string; distanceRight: string;
  nearLeft: string; nearRight: string;
  colorVision: 'normal' | 'deficient';
  depthPerception: 'normal' | 'abnormal';
  peripheralVision: 'normal' | 'restricted';
  nightVision?: 'normal' | 'impaired';
  screenGlare?: 'normal' | 'sensitive';
  notes?: string;
}

export interface ChestXRayResult {
  date: string;
  iloClassification?: string;
  findings: string;
  pneumoconiosisDetected: boolean;
  tuberculosisDetected: boolean;
  otherAbnormalities?: string;
  radiologistName?: string;
  notes?: string;
}

export interface LabResults {
  date: string;
  bloodLeadLevel?: number;
  bloodMercuryLevel?: number;
  urineArsenic?: number;
  urineCadmium?: number;
  hemoglobin?: number;
  whiteBloodCells?: number;
  platelets?: number;
  creatinine?: number;
  liverFunction?: { alt?: number; ast?: number; alkalinePhosphatase?: number; ggt?: number; };
  bloodGlucose?: number;
  hba1c?: number;
  cholesterol?: number;
  triglycerides?: number;
  hdlCholesterol?: number;
  ldlCholesterol?: number;
  hivStatus?: 'negative' | 'positive' | 'declined' | 'not_tested';
  hepatitisBStatus?: 'immune' | 'positive' | 'negative' | 'not_tested';
  tbScreening?: 'negative' | 'positive' | 'not_tested';
  cholinesteraseLevel?: number;
  notes?: string;
}

export interface DrugScreeningResult {
  date: string;
  overallResult: 'negative' | 'positive' | 'inconclusive';
  cannabis: boolean; cocaine: boolean; opiates: boolean;
  amphetamines: boolean; methamphetamines: boolean;
  alcohol: boolean; alcoholLevel?: number;
  notes?: string;
}

// ─── Sector-Specific Screenings ──────────────────────────────

export interface ErgonomicAssessment {
  date: string;
  workstationType: 'office_desk' | 'standing' | 'mixed' | 'vehicle' | 'manual_handling';
  postureScore?: number;
  screenDistance?: 'adequate' | 'too_close' | 'too_far';
  chairAdjustment?: 'adequate' | 'inadequate';
  keyboardPosition?: 'adequate' | 'inadequate';
  complaints: MusculoskeletalComplaint[];
  overallRisk: 'low' | 'moderate' | 'high';
  recommendations: string[];
  notes?: string;
}

export interface MusculoskeletalComplaint {
  bodyRegion: 'neck' | 'shoulder' | 'upper_back' | 'lower_back' | 'wrist_hand' | 'elbow' | 'knee' | 'ankle_foot';
  severity: 'mild' | 'moderate' | 'severe';
  frequency: 'occasional' | 'frequent' | 'constant';
  workRelated: boolean;
}

export interface MentalHealthScreening {
  date: string;
  screeningTool: 'WHO5' | 'GHQ12' | 'PHQ9' | 'GAD7' | 'BURNOUT_INVENTORY' | 'other';
  score: number; maxScore: number;
  interpretation: 'good' | 'mild_concern' | 'moderate_concern' | 'severe_concern';
  stressLevel?: 'low' | 'moderate' | 'high' | 'burnout';
  sleepQuality?: 'good' | 'fair' | 'poor';
  workLifeBalance?: 'good' | 'fair' | 'poor';
  workload: 'manageable' | 'high' | 'overwhelming';
  jobSatisfaction: 'satisfied' | 'neutral' | 'dissatisfied';
  referralNeeded: boolean;
  notes?: string;
}

export interface CardiovascularScreening {
  date: string;
  riskScore?: number;
  riskCategory: 'low' | 'moderate' | 'high' | 'very_high';
  ecgResult?: 'normal' | 'abnormal' | 'not_done';
  ecgNotes?: string;
  smokingStatus: 'non_smoker' | 'former' | 'current';
  physicalActivity: 'sedentary' | 'low' | 'moderate' | 'high';
  familyHistory: boolean;
  notes?: string;
}

// ─── Exposure Risk (Multi-Sector / ILO-WHO) ──────────────────
export type ExposureRisk =
  | 'noise' | 'vibration' | 'heat_stress' | 'cold_stress'
  | 'radiation' | 'non_ionizing_radiation' | 'working_at_heights' | 'confined_spaces'
  | 'silica_dust' | 'coal_dust' | 'asbestos' | 'heavy_metals'
  | 'chemical_exposure' | 'diesel_exhaust' | 'pesticides' | 'solvents'
  | 'biological' | 'needle_stick' | 'animal_hazards'
  | 'ergonomic' | 'manual_handling' | 'vdt_screen' | 'sedentary' | 'repetitive_motion'
  | 'psychosocial' | 'shift_work' | 'violence_aggression' | 'isolated_work'
  | 'machine_hazards' | 'electrical' | 'fire_explosion' | 'road_accident' | 'slip_trip_fall'
  | 'indoor_air_quality' | 'voice_strain';

export type PPEType =
  | 'hard_hat' | 'safety_glasses' | 'ear_plugs' | 'ear_muffs'
  | 'dust_mask' | 'respirator' | 'safety_boots' | 'safety_gloves'
  | 'high_vis_vest' | 'fall_harness' | 'face_shield' | 'coveralls'
  | 'lab_coat' | 'chemical_suit' | 'radiation_badge'
  | 'ergonomic_chair' | 'wrist_rest' | 'anti_fatigue_mat'
  | 'safety_harness_electrical' | 'none_required';

// ─── Workplace Incident (ILO C155 Art. 11) ──────────────────
export interface WorkplaceIncident {
  id: string;
  incidentNumber: string;
  reportedBy: string;
  reportedDate: string;
  incidentDate: string;
  incidentTime: string;
  sector: IndustrySector;
  enterpriseId?: string;
  type: IncidentType;
  severity: IncidentSeverity;
  category: IncidentCategory;
  site: string;
  area: string;
  gpsCoordinates?: { latitude: number; longitude: number };
  affectedWorkers: AffectedWorker[];
  description: string;
  immediateActions: string;
  rootCauses?: string[];
  contributingFactors?: string[];
  ppeWorn: boolean;
  ppeDetails?: string;
  witnessNames?: string[];
  witnessStatements?: string[];
  investigationStatus: 'open' | 'in_progress' | 'completed' | 'closed';
  investigatorId?: string;
  investigatorName?: string;
  investigationFindings?: string;
  correctiveActions?: CorrectiveAction[];
  reportedToAuthorities: boolean;
  authorityReferenceNumber?: string;
  lostTimeDays?: number;
  attachments?: string[];
  createdAt: string;
  updatedAt?: string;
}

export type IncidentType =
  | 'fatality' | 'lost_time_injury' | 'medical_treatment' | 'first_aid'
  | 'near_miss' | 'property_damage' | 'environmental'
  | 'occupational_disease' | 'commuting_accident';

export type IncidentSeverity = 'critical' | 'major' | 'moderate' | 'minor' | 'negligible';

export type IncidentCategory =
  | 'fall_from_height' | 'fall_same_level' | 'fall_of_ground'
  | 'struck_by_object' | 'caught_in_between' | 'vehicle_accident'
  | 'explosion' | 'fire' | 'electrical' | 'chemical_exposure'
  | 'heat_exhaustion' | 'respiratory' | 'musculoskeletal' | 'noise_induced'
  | 'needle_stick_injury' | 'assault_violence' | 'road_traffic'
  | 'animal_related' | 'manual_handling_injury' | 'slip_trip'
  | 'psychological_event' | 'other';

export interface AffectedWorker {
  workerId: string;
  workerName: string;
  injuryType?: string;
  bodyPart?: string;
  treatmentProvided?: string;
  daysOff?: number;
  returnToWorkDate?: string;
  fitnessStatusAfter?: FitnessStatus;
}

export interface CorrectiveAction {
  id: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  status: 'open' | 'in_progress' | 'completed' | 'overdue';
  completedDate?: string;
  verifiedBy?: string;
  notes?: string;
}

// ─── Occupational Disease (ILO R194) ────────────────────────
export interface OccupationalDisease {
  id: string;
  workerId: string;
  workerName: string;
  workerSector: IndustrySector;
  disease: OccupationalDiseaseType;
  icd10Code?: string;
  diagnosisDate: string;
  diagnosedBy: string;
  severity: 'mild' | 'moderate' | 'severe';
  exposureType: ExposureRisk;
  exposureDuration: string;
  cumulativeExposure?: string;
  treatmentPlan: string;
  medications: string[];
  followUpSchedule: string;
  workRestrictions: string[];
  compensation: boolean;
  compensationStatus?: 'pending' | 'approved' | 'rejected';
  status: 'active' | 'monitoring' | 'resolved' | 'chronic';
  createdAt: string;
  updatedAt?: string;
}

export type OccupationalDiseaseType =
  | 'silicosis' | 'asbestosis' | 'pneumoconiosis' | 'occupational_asthma' | 'copd' | 'byssinosis'
  | 'noise_induced_hearing_loss'
  | 'carpal_tunnel_syndrome' | 'tendinitis' | 'low_back_disorder'
  | 'hand_arm_vibration_syndrome' | 'musculoskeletal_disorder'
  | 'contact_dermatitis' | 'occupational_eczema' | 'skin_cancer'
  | 'burnout' | 'ptsd' | 'occupational_depression' | 'anxiety_disorder'
  | 'lead_poisoning' | 'mercury_poisoning' | 'pesticide_poisoning' | 'solvent_toxicity'
  | 'tuberculosis' | 'hepatitis_b_c' | 'hiv_occupational' | 'malaria' | 'leptospirosis'
  | 'work_related_hypertension' | 'ischemic_heart_disease'
  | 'mesothelioma' | 'bladder_cancer' | 'lung_cancer_occupational'
  | 'heat_stroke' | 'computer_vision_syndrome' | 'vocal_cord_nodules'
  | 'other';

// ─── Surveillance Program (ILO C161 Art. 5) ─────────────────
export interface SurveillanceProgram {
  id: string;
  name: string;
  description: string;
  sector: IndustrySector;
  targetRiskGroup: ExposureRisk;
  targetJobCategories: JobCategory[];
  frequency: 'monthly' | 'quarterly' | 'biannual' | 'annual';
  requiredTests: ExamType[];
  requiredScreenings: string[];
  actionLevels: ActionLevel[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ActionLevel {
  parameter: string;
  warningThreshold: number;
  actionThreshold: number;
  criticalThreshold: number;
  unit: string;
  actionRequired: string;
}

// ─── Site Health & Safety Metrics (ISO 45001) ────────────────
export interface SiteHealthMetrics {
  siteId: string;
  siteName: string;
  sector: IndustrySector;
  period: string;
  totalWorkers: number;
  activeWorkers: number;
  fitWorkers: number;
  fitWithRestrictions: number;
  temporarilyUnfit: number;
  permanentlyUnfit: number;
  pendingEvaluation: number;
  expiredCertificates: number;
  totalIncidents: number;
  lostTimeInjuries: number;
  lostTimeDays: number;
  nearMisses: number;
  fatalities: number;
  ltifr: number;
  trifr: number;
  sr: number;
  totalExaminations: number;
  preEmploymentExams: number;
  periodicExams: number;
  returnToWorkExams: number;
  newOccupationalDiseases: number;
  activeOccupationalDiseases: number;
  absenteeismRate?: number;
  turnoverRate?: number;
  examComplianceRate: number;
  ppeComplianceRate: number;
  trainingComplianceRate: number;
}

// ─── Fitness Certificate ─────────────────────────────────────
export interface FitnessCertificate {
  id: string;
  certificateNumber: string;
  workerId: string;
  workerName: string;
  workerSector: IndustrySector;
  examId: string;
  issuedDate: string;
  expiryDate: string;
  fitnessStatus: FitnessStatus;
  restrictions: string[];
  allowedActivities: string[];
  restrictedActivities: string[];
  issuedBy: string;
  issuedByName: string;
  isValid: boolean;
  revokedDate?: string;
  revokedReason?: string;
  createdAt: string;
}

// ─── Risk Assessment (ISO 45001 §6.1) ────────────────────────
export interface RiskAssessment {
  id: string;
  sector: IndustrySector;
  site: string;
  area: string;
  assessmentDate: string;
  assessorName: string;
  hazards: HazardIdentification[];
  overallRiskLevel: SectorRiskLevel;
  reviewDate: string;
  status: 'draft' | 'active' | 'under_review' | 'archived';
  createdAt: string;
  updatedAt?: string;
}

export interface HazardIdentification {
  hazardType: ExposureRisk;
  description: string;
  affectedWorkers: number;
  likelihood: 1 | 2 | 3 | 4 | 5;
  consequence: 1 | 2 | 3 | 4 | 5;
  riskScore: number;
  existingControls: string[];
  additionalControls: string[];
  controlHierarchy: 'elimination' | 'substitution' | 'engineering' | 'administrative' | 'ppe';
  responsiblePerson: string;
  targetDate: string;
}

// ─── Utility Functions ───────────────────────────────────────
export class OccHealthUtils {
  static getPatientFullName(patient: OccupationalHealthPatient): string {
    const parts = [patient.firstName];
    if (patient.middleName) parts.push(patient.middleName);
    parts.push(patient.lastName);
    return parts.join(' ');
  }

  /** @deprecated Use getPatientFullName */
  static getWorkerFullName(worker: Worker): string {
    return this.getPatientFullName(worker);
  }

  static getPatientAge(patient: OccupationalHealthPatient): number {
    const birthDate = new Date(patient.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  }

  /** @deprecated Use getPatientAge */
  static getWorkerAge(worker: Worker): number {
    return this.getPatientAge(worker);
  }

  static isCertificateExpired(cert: FitnessCertificate): boolean {
    return new Date(cert.expiryDate) < new Date();
  }

  static isCertificateExpiringSoon(cert: FitnessCertificate, days: number = 30): boolean {
    const exp = new Date(cert.expiryDate);
    const thr = new Date();
    thr.setDate(thr.getDate() + days);
    return exp <= thr && exp >= new Date();
  }

  // ── Sector helpers ──
  static getSectorProfile(sector: IndustrySector): SectorProfile { return SECTOR_PROFILES[sector]; }
  static getSectorLabel(sector: IndustrySector): string { return SECTOR_PROFILES[sector]?.label || sector; }
  static getSectorColor(sector: IndustrySector): string { return SECTOR_PROFILES[sector]?.color || '#64748B'; }
  static getSectorRiskLevel(sector: IndustrySector): SectorRiskLevel { return SECTOR_PROFILES[sector]?.riskLevel || 'medium'; }

  static getSectorRiskLabel(level: SectorRiskLevel): string {
    return ({ very_high: 'Très Élevé', high: 'Élevé', medium: 'Moyen', low: 'Faible' } as Record<SectorRiskLevel, string>)[level] || level;
  }

  static getSectorRiskColor(level: SectorRiskLevel): string {
    return ({ very_high: '#DC2626', high: '#EF4444', medium: '#F59E0B', low: '#22C55E' } as Record<SectorRiskLevel, string>)[level] || '#94A3B8';
  }

  // ── Fitness status ──
  static getFitnessStatusLabel(status: FitnessStatus): string {
    return ({ fit: 'Apte', fit_with_restrictions: 'Apte avec restrictions', temporarily_unfit: 'Inapte temporaire', permanently_unfit: 'Inapte définitif', pending_evaluation: 'En attente', expired: 'Certificat expiré' } as Record<FitnessStatus, string>)[status] || status;
  }

  static getFitnessStatusColor(status: FitnessStatus): string {
    return ({ fit: '#22C55E', fit_with_restrictions: '#F59E0B', temporarily_unfit: '#EF4444', permanently_unfit: '#DC2626', pending_evaluation: '#6366F1', expired: '#94A3B8' } as Record<FitnessStatus, string>)[status] || '#94A3B8';
  }

  // ── Incident ──
  static getIncidentSeverityColor(severity: IncidentSeverity): string {
    return ({ critical: '#DC2626', major: '#EF4444', moderate: '#F59E0B', minor: '#3B82F6', negligible: '#94A3B8' } as Record<IncidentSeverity, string>)[severity] || '#94A3B8';
  }

  // ── Job category (multi-sector) ──
  static getJobCategoryLabel(category: JobCategory): string {
    const labels: Record<JobCategory, string> = {
      executive: 'Direction Générale', management: 'Cadres / Management', administration: 'Administration',
      human_resources: 'Ressources Humaines', finance_accounting: 'Finance & Comptabilité',
      office_clerical: 'Travail de Bureau', customer_service: 'Service Clientèle',
      it_systems: 'Informatique & Systèmes', legal_compliance: 'Juridique & Conformité',
      underground_work: 'Travail Souterrain', surface_operations: 'Opérations de Surface',
      processing_refining: 'Traitement / Raffinage', drilling_blasting: 'Forage & Dynamitage',
      construction_trades: 'Métiers du BTP', heavy_equipment: 'Engins Lourds',
      production_line: 'Ligne de Production', assembly: 'Assemblage', quality_control: 'Contrôle Qualité',
      maintenance_mechanical: 'Maintenance Mécanique', maintenance_electrical: 'Maintenance Électrique',
      laboratory: 'Laboratoire', driving_transport: 'Conduite & Transport',
      warehousing: 'Entreposage / Magasin', logistics: 'Logistique',
      clinical_care: 'Soins Cliniques', nursing: 'Soins Infirmiers', patient_support: 'Support Patient',
      farming: 'Agriculture / Élevage', agro_processing: 'Transformation Agroalimentaire',
      safety_officer: 'Agent Sécurité SST', security_guard: 'Gardiennage & Sûreté',
      cleaning_housekeeping: 'Nettoyage & Entretien', catering_food: 'Restauration',
      environmental: 'Environnement', teaching: 'Enseignement', research: 'Recherche', other: 'Autre',
    };
    return labels[category] || category;
  }

  // ── Exposure risk ──
  static getExposureRiskLabel(risk: ExposureRisk): string {
    const labels: Record<ExposureRisk, string> = {
      noise: 'Bruit', vibration: 'Vibrations', heat_stress: 'Stress Thermique', cold_stress: 'Stress Froid',
      radiation: 'Radiation Ionisante', non_ionizing_radiation: 'Radiation Non-Ionisante',
      working_at_heights: 'Travail en Hauteur', confined_spaces: 'Espaces Confinés',
      silica_dust: 'Poussière de Silice', coal_dust: 'Poussière de Charbon', asbestos: 'Amiante',
      heavy_metals: 'Métaux Lourds', chemical_exposure: 'Exposition Chimique', diesel_exhaust: 'Gaz Diesel',
      pesticides: 'Pesticides', solvents: 'Solvants', biological: 'Biologique',
      needle_stick: 'Piqûre d\'Aiguille', animal_hazards: 'Risques Animaux',
      ergonomic: 'Ergonomique', manual_handling: 'Manutention Manuelle', vdt_screen: 'Écran / VDT',
      sedentary: 'Sédentarité', repetitive_motion: 'Mouvements Répétitifs',
      psychosocial: 'Psychosocial', shift_work: 'Travail Posté / Nuit',
      violence_aggression: 'Violence / Agression', isolated_work: 'Travail Isolé',
      machine_hazards: 'Risques Machines', electrical: 'Risques Électriques',
      fire_explosion: 'Incendie / Explosion', road_accident: 'Accident de la Route',
      slip_trip_fall: 'Glissade / Chute', indoor_air_quality: 'Qualité Air Intérieur',
      voice_strain: 'Fatigue Vocale',
    };
    return labels[risk] || risk;
  }

  // ── Exam type ──
  static getExamTypeLabel(examType: ExamType): string {
    const labels: Record<ExamType, string> = {
      pre_employment: 'Visite d\'Embauche', periodic: 'Visite Périodique', return_to_work: 'Visite de Reprise',
      post_incident: 'Post-Accident', fitness_for_duty: 'Aptitude Spécifique', exit_medical: 'Visite de Sortie',
      special_request: 'Demande Spéciale', pregnancy_related: 'Suivi Grossesse', night_work: 'Aptitude Travail de Nuit',
    };
    return labels[examType] || examType;
  }

  // ── Safety KPIs (ISO 45001) ──
  static calculateLTIFR(lti: number, hours: number): number { return hours === 0 ? 0 : (lti / hours) * 1_000_000; }
  static calculateTRIFR(tri: number, hours: number): number { return hours === 0 ? 0 : (tri / hours) * 1_000_000; }
  static calculateSeverityRate(days: number, hours: number): number { return hours === 0 ? 0 : (days / hours) * 1_000_000; }
  static calculateAbsenteeismRate(absent: number, total: number): number { return total === 0 ? 0 : (absent / total) * 100; }

  static getComplianceColor(rate: number): string {
    if (rate >= 95) return '#22C55E';
    if (rate >= 80) return '#F59E0B';
    return '#EF4444';
  }

  // ── Risk assessment (ISO 45001 §6.1) ──
  static getRiskScoreLabel(score: number): string {
    if (score >= 20) return 'Critique';
    if (score >= 12) return 'Élevé';
    if (score >= 6) return 'Modéré';
    return 'Faible';
  }

  static getRiskScoreColor(score: number): string {
    if (score >= 20) return '#DC2626';
    if (score >= 12) return '#EF4444';
    if (score >= 6) return '#F59E0B';
    return '#22C55E';
  }
}
