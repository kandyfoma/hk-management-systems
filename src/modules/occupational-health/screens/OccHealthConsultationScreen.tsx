import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import {
  SECTOR_PROFILES,
  OccHealthUtils,
  type OccupationalHealthPatient,
  type Worker, // Legacy alias for backward compatibility
  type IndustrySector,
  type ExamType,
  type FitnessStatus,
  type VitalSigns,
  type PhysicalExamination,
  type MedicalExamination,
  type ErgonomicAssessment,
  type MentalHealthScreening,
  type CardiovascularScreening,
  type MusculoskeletalComplaint,
  type AudiometryResult,
  type SpirometryResult,
  type VisionTestResult,
  type DrugScreeningResult,
} from '../../../models/OccupationalHealth';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

const ACCENT = '#D97706';

// ═══════════════════════════════════════════════════════════════
//  Step-by-step wizard for occupational health consultation
// ═══════════════════════════════════════════════════════════════

type ConsultationStep =
  | 'worker_identification'
  | 'visit_reason'
  | 'vital_signs'
  | 'physical_exam'
  | 'sector_tests'
  | 'mental_ergonomic'
  | 'fitness_decision'
  | 'summary';

const STEPS: { key: ConsultationStep; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'worker_identification', label: 'Identification', icon: 'person' },
  { key: 'visit_reason', label: 'Motif de Visite', icon: 'clipboard' },
  { key: 'vital_signs', label: 'Signes Vitaux', icon: 'pulse' },
  { key: 'physical_exam', label: 'Examen Physique', icon: 'body' },
  { key: 'sector_tests', label: 'Tests Sectoriels', icon: 'flask' },
  { key: 'mental_ergonomic', label: 'Santé Mentale & Ergonomie', icon: 'happy' },
  { key: 'fitness_decision', label: 'Décision d\'Aptitude', icon: 'shield-checkmark' },
  { key: 'summary', label: 'Résumé & Certificat', icon: 'document-text' },
];

// ─── Sample workers (would come from DB in production) ───────
const SAMPLE_WORKERS: OccupationalHealthPatient[] = [
  {
    // Base Patient fields
    id: 'W001', 
    firstName: 'Kabamba', 
    lastName: 'Mutombo', 
    dateOfBirth: '1988-03-15', 
    gender: 'male',
    phone: '+243 81 234 5678',
    patientNumber: 'PAT-0421',
    registrationDate: '2015-06-01',
    lastVisit: '2024-01-15',
    status: 'active',
    allergies: [], 
    chronicConditions: [], 
    currentMedications: [],
    createdAt: '2015-06-01',
    // Occupational Health extensions
    employeeId: 'EMP-0421', 
    company: 'Gécamines SA', 
    sector: 'mining', 
    site: 'Kolwezi - Puit Principal',
    department: 'Extraction', 
    jobTitle: 'Mineur de fond', 
    jobCategory: 'underground_work',
    shiftPattern: 'rotating', 
    hireDate: '2015-06-01', 
    contractType: 'permanent',
    fitnessStatus: 'fit', 
    exposureRisks: ['silica_dust', 'noise', 'heat_stress', 'vibration', 'confined_spaces'],
    ppeRequired: ['hard_hat', 'safety_boots', 'ear_plugs', 'dust_mask', 'safety_glasses', 'safety_gloves'],
    riskLevel: 'very_high',
  },
  {
    // Base Patient fields
    id: 'W002', 
    firstName: 'Mwamba', 
    lastName: 'Kalala', 
    dateOfBirth: '1992-07-22', 
    gender: 'female',
    phone: '+243 99 876 5432',
    patientNumber: 'PAT-1087',
    registrationDate: '2019-01-15',
    lastVisit: '2024-01-10',
    status: 'active',
    allergies: ['Pénicilline'], 
    chronicConditions: [], 
    currentMedications: [],
    createdAt: '2019-01-15',
    // Occupational Health extensions
    employeeId: 'EMP-1087', 
    company: 'Rawbank', 
    sector: 'banking_finance', 
    site: 'Lubumbashi - Agence Principale',
    department: 'Service Clientèle', 
    jobTitle: 'Chargée de Clientèle', 
    jobCategory: 'customer_service',
    shiftPattern: 'regular', 
    hireDate: '2019-01-15', 
    contractType: 'permanent',
    fitnessStatus: 'pending_evaluation', 
    exposureRisks: ['ergonomic', 'psychosocial', 'vdt_screen', 'sedentary'],
    ppeRequired: ['ergonomic_chair', 'wrist_rest', 'none_required'],
    riskLevel: 'low',
  },
  {
    // Base Patient fields
    id: 'W003', 
    firstName: 'Tshisekedi', 
    lastName: 'Ilunga', 
    dateOfBirth: '1985-11-08', 
    gender: 'male',
    phone: '+243 85 555 1234',
    patientNumber: 'PAT-0562',
    registrationDate: '2020-03-10',
    lastVisit: '2024-01-08',
    status: 'active',
    allergies: [], 
    chronicConditions: ['Hypertension légère'], 
    currentMedications: ['Amlodipine 5mg'],
    createdAt: '2020-03-10',
    // Occupational Health extensions
    employeeId: 'EMP-0562', 
    company: 'Bâtiment Congo SARL', 
    sector: 'construction', 
    site: 'Kinshasa - Chantier Gombe',
    department: 'Charpente Métallique', 
    jobTitle: 'Soudeur-Monteur', 
    jobCategory: 'construction_trades',
    shiftPattern: 'day_shift', 
    hireDate: '2020-03-10', 
    contractType: 'contract',
    fitnessStatus: 'fit_with_restrictions', 
    exposureRisks: ['working_at_heights', 'noise', 'chemical_exposure', 'heat_stress'],
    ppeRequired: ['hard_hat', 'safety_glasses', 'fall_harness', 'safety_boots', 'safety_gloves', 'ear_plugs'],
    riskLevel: 'very_high',
  },
  {
    // Base Patient fields
    id: 'W004', 
    firstName: 'Lukusa', 
    lastName: 'Nzuzi', 
    dateOfBirth: '1995-02-28', 
    gender: 'female',
    phone: '+243 82 333 7890',
    patientNumber: 'PAT-2301',
    registrationDate: '2021-09-01',
    lastVisit: '2024-01-05',
    status: 'active',
    allergies: [], 
    chronicConditions: [], 
    currentMedications: [],
    createdAt: '2021-09-01',
    // Occupational Health extensions
    employeeId: 'EMP-2301', 
    company: 'Hôpital Général de Référence', 
    sector: 'healthcare', 
    site: 'Lubumbashi - HGR',
    department: 'Soins Infirmiers', 
    jobTitle: 'Infirmière', 
    jobCategory: 'nursing',
    shiftPattern: 'rotating', 
    hireDate: '2021-09-01', 
    contractType: 'permanent',
    fitnessStatus: 'fit', 
    exposureRisks: ['biological', 'needle_stick', 'psychosocial', 'shift_work', 'ergonomic'],
    ppeRequired: ['lab_coat', 'safety_gloves', 'face_shield', 'safety_glasses'],
    riskLevel: 'high',
    vaccinationStatus: [
      { vaccine: 'Hépatite B', date: '2021-09-15' },
      { vaccine: 'Tétanos', date: '2021-09-15', boosterDue: '2031-09-15' },
    ],
  },
  {
    // Base Patient fields
    id: 'W005', 
    firstName: 'Pongo', 
    lastName: 'Tshimanga', 
    dateOfBirth: '1990-06-10', 
    gender: 'male',
    phone: '+243 81 999 4567',
    patientNumber: 'PAT-3412',
    registrationDate: '2022-02-01',
    status: 'active',
    allergies: [], 
    chronicConditions: [], 
    currentMedications: [],
    createdAt: '2022-02-01',
    // Occupational Health extensions
    employeeId: 'EMP-3412', 
    company: 'Vodacom Congo', 
    sector: 'telecom_it', 
    site: 'Kinshasa - Siège',
    department: 'Développement', 
    jobTitle: 'Ingénieur Logiciel', 
    jobCategory: 'it_systems',
    shiftPattern: 'flexible', 
    hireDate: '2022-02-01', 
    contractType: 'permanent',
    fitnessStatus: 'pending_evaluation', 
    exposureRisks: ['vdt_screen', 'sedentary', 'psychosocial', 'ergonomic'],
    ppeRequired: ['ergonomic_chair', 'wrist_rest', 'none_required'],
    riskLevel: 'low',
  },
];

// ─── Helpers ─────────────────────────────────────────────────

function calculateBMI(weight?: number, height?: number): number | undefined {
  if (!weight || !height) return undefined;
  const h = height / 100;
  return Math.round((weight / (h * h)) * 10) / 10;
}

function getBMICategory(bmi?: number): { label: string; color: string } {
  if (!bmi) return { label: '—', color: colors.textSecondary };
  if (bmi < 18.5) return { label: 'Insuffisance', color: colors.info };
  if (bmi < 25) return { label: 'Normal', color: colors.success };
  if (bmi < 30) return { label: 'Surpoids', color: colors.warning };
  return { label: 'Obésité', color: colors.error };
}

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function OccHealthConsultationScreen({ 
  draftToLoad, 
  onDraftLoaded 
}: { 
  draftToLoad?: string | null;
  onDraftLoaded?: () => void;
}) {
  // ─── Step state ──
  const [currentStep, setCurrentStep] = useState<ConsultationStep>('worker_identification');
  const currentStepIdx = STEPS.findIndex(s => s.key === currentStep);

  // ─── Worker identification ──
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorker, setSelectedWorker] = useState<OccupationalHealthPatient | null>(null);
  const [showWorkerModal, setShowWorkerModal] = useState(false);

  // ─── Visit reason ──
  const [examType, setExamType] = useState<ExamType>('periodic');
  const [visitReason, setVisitReason] = useState('');
  const [referredBy, setReferredBy] = useState('');

  // ─── Vital signs ──
  const [vitals, setVitals] = useState<VitalSigns>({});

  // ─── Physical exam ──
  const [physicalExam, setPhysicalExam] = useState<PhysicalExamination>({
    generalAppearance: 'normal', cardiovascular: 'normal', respiratory: 'normal',
    musculoskeletal: 'normal', neurological: 'normal', dermatological: 'normal',
    ent: 'normal', abdomen: 'normal', mentalHealth: 'normal', ophthalmological: 'normal',
  });

  // ─── Sector-specific tests ──
  const [orderedTests, setOrderedTests] = useState<string[]>([]);
  const [audiometryDone, setAudiometryDone] = useState(false);
  const [spirometryDone, setSpirometryDone] = useState(false);
  const [visionDone, setVisionDone] = useState(false);
  const [drugScreeningDone, setDrugScreeningDone] = useState(false);
  const [bloodWorkDone, setBloodWorkDone] = useState(false);
  const [xrayDone, setXrayDone] = useState(false);

  // ─── Mental health / Ergonomic ──
  const [mentalScreening, setMentalScreening] = useState<Partial<MentalHealthScreening>>({
    screeningTool: 'WHO5', interpretation: 'good', stressLevel: 'low',
    sleepQuality: 'good', workLifeBalance: 'good', workload: 'manageable',
    jobSatisfaction: 'satisfied', referralNeeded: false,
  });
  const [ergonomicNeeded, setErgonomicNeeded] = useState(false);
  const [ergonomicNotes, setErgonomicNotes] = useState('');
  const [mskComplaints, setMskComplaints] = useState<MusculoskeletalComplaint[]>([]);

  // ─── Fitness decision ──
  const [fitnessDecision, setFitnessDecision] = useState<FitnessStatus>('fit');
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [restrictionInput, setRestrictionInput] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [followUpNeeded, setFollowUpNeeded] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [consultationNotes, setConsultationNotes] = useState('');

  // ─── Draft functionality ──
  const [isDraft, setIsDraft] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Draft state type
  type DraftState = {
    id: string;
    selectedWorker: OccupationalHealthPatient | null;
    examType: ExamType;
    visitReason: string;
    referredBy: string;
    vitals: VitalSigns;
    physicalExam: PhysicalExamination;
    orderedTests: string[];
    audiometryDone: boolean;
    spirometryDone: boolean;
    visionDone: boolean;
    drugScreeningDone: boolean;
    bloodWorkDone: boolean;
    xrayDone: boolean;
    mentalScreening: Partial<MentalHealthScreening>;
    ergonomicNeeded: boolean;
    ergonomicNotes: string;
    mskComplaints: MusculoskeletalComplaint[];
    fitnessDecision: FitnessStatus;
    restrictions: string[];
    recommendations: string;
    followUpNeeded: boolean;
    followUpDate: string;
    consultationNotes: string;
    currentStep: ConsultationStep;
    createdAt: string;
    updatedAt: string;
  };

  // Save current state as draft
  const saveDraft = useCallback(async () => {
    try {
      const id = draftId || `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      
      const draft: DraftState = {
        id,
        selectedWorker,
        examType,
        visitReason,
        referredBy,
        vitals,
        physicalExam,
        orderedTests,
        audiometryDone,
        spirometryDone,
        visionDone,
        drugScreeningDone,
        bloodWorkDone,
        xrayDone,
        mentalScreening,
        ergonomicNeeded,
        ergonomicNotes,
        mskComplaints,
        fitnessDecision,
        restrictions,
        recommendations,
        followUpNeeded,
        followUpDate,
        consultationNotes,
        currentStep,
        createdAt: draftId ? (await getDraftCreatedAt(id)) || now : now,
        updatedAt: now,
      };

      await AsyncStorage.setItem(`consultation_draft_${id}`, JSON.stringify(draft));
      
      setDraftId(id);
      setIsDraft(true);
      setLastSaved(new Date());
      
      return id;
    } catch (error) {
      console.error('Error saving draft:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le brouillon');
    }
  }, [
    draftId, selectedWorker, examType, visitReason, referredBy, vitals, physicalExam,
    orderedTests, audiometryDone, spirometryDone, visionDone, drugScreeningDone,
    bloodWorkDone, xrayDone, mentalScreening, ergonomicNeeded, ergonomicNotes,
    mskComplaints, fitnessDecision, restrictions, recommendations, followUpNeeded,
    followUpDate, consultationNotes, currentStep,
  ]);

  // Get draft creation date
  const getDraftCreatedAt = async (id: string): Promise<string | null> => {
    try {
      const draft = await AsyncStorage.getItem(`consultation_draft_${id}`);
      if (draft) {
        const parsed = JSON.parse(draft) as DraftState;
        return parsed.createdAt;
      }
    } catch (error) {
      console.error('Error getting draft created date:', error);
    }
    return null;
  };

  // Load draft from storage
  const loadDraft = useCallback(async (id: string) => {
    try {
      const draft = await AsyncStorage.getItem(`consultation_draft_${id}`);
      if (draft) {
        const parsed = JSON.parse(draft) as DraftState;
        
        setSelectedWorker(parsed.selectedWorker);
        setExamType(parsed.examType);
        setVisitReason(parsed.visitReason);
        setReferredBy(parsed.referredBy);
        setVitals(parsed.vitals);
        setPhysicalExam(parsed.physicalExam);
        setOrderedTests(parsed.orderedTests);
        setAudiometryDone(parsed.audiometryDone);
        setSpirometryDone(parsed.spirometryDone);
        setVisionDone(parsed.visionDone);
        setDrugScreeningDone(parsed.drugScreeningDone);
        setBloodWorkDone(parsed.bloodWorkDone);
        setXrayDone(parsed.xrayDone);
        setMentalScreening(parsed.mentalScreening);
        setErgonomicNeeded(parsed.ergonomicNeeded);
        setErgonomicNotes(parsed.ergonomicNotes);
        setMskComplaints(parsed.mskComplaints);
        setFitnessDecision(parsed.fitnessDecision);
        setRestrictions(parsed.restrictions);
        setRecommendations(parsed.recommendations);
        setFollowUpNeeded(parsed.followUpNeeded);
        setFollowUpDate(parsed.followUpDate);
        setConsultationNotes(parsed.consultationNotes);
        setCurrentStep(parsed.currentStep);
        
        setDraftId(id);
        setIsDraft(true);
        setLastSaved(new Date(parsed.updatedAt));
      } else if (id === 'EXAM-DRAFT-001') {
        // Handle sample draft data
        const sampleWorker = SAMPLE_WORKERS.find(w => w.id === 'W005');
        if (sampleWorker) {
          setSelectedWorker(sampleWorker);
          setExamType('periodic');
          setVisitReason('');
          setReferredBy('');
          setVitals({
            temperature: 36.6,
            bloodPressureSystolic: 125,
            bloodPressureDiastolic: 80,
            heartRate: 75,
          });
          setPhysicalExam({
            generalAppearance: 'normal',
            cardiovascular: 'normal',
            respiratory: 'normal',
            musculoskeletal: 'normal',
            neurological: 'normal',
            dermatological: 'normal',
            ent: 'normal',
            abdomen: 'normal',
            mentalHealth: 'normal',
            ophthalmological: 'normal',
          });
          setOrderedTests([]);
          setAudiometryDone(false);
          setSpirometryDone(false);
          setVisionDone(false);
          setDrugScreeningDone(false);
          setBloodWorkDone(false);
          setXrayDone(false);
          setMentalScreening({
            screeningTool: 'WHO5',
            interpretation: 'good',
            stressLevel: 'low',
            sleepQuality: 'good',
            workLifeBalance: 'good',
            workload: 'manageable',
            jobSatisfaction: 'satisfied',
            referralNeeded: false,
          });
          setErgonomicNeeded(false);
          setErgonomicNotes('');
          setMskComplaints([]);
          setFitnessDecision('fit');
          setRestrictions([]);
          setRecommendations('');
          setFollowUpNeeded(false);
          setFollowUpDate('');
          setConsultationNotes('Consultation en cours - données partielles');
          setCurrentStep('vital_signs'); // Continue from where it was left off
          
          setDraftId(id);
          setIsDraft(true);
          setLastSaved(new Date('2024-01-20T09:00:00Z'));
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error);
      Alert.alert('Erreur', 'Impossible de charger le brouillon');
    }
  }, []);

  // Delete draft from storage
  const deleteDraft = useCallback(async (id?: string) => {
    try {
      const idToDelete = id || draftId;
      if (idToDelete) {
        await AsyncStorage.removeItem(`consultation_draft_${idToDelete}`);
        
        if (id === draftId) {
          setDraftId(null);
          setIsDraft(false);
          setLastSaved(null);
        }
      }
    } catch (error) {
      console.error('Error deleting draft:', error);
    }
  }, [draftId]);

  // Auto-save draft every 30 seconds if there are changes
  useEffect(() => {
    if (!selectedWorker) return; // Don't auto-save if no worker selected

    const interval = setInterval(() => {
      saveDraft();
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(interval);
  }, [saveDraft, selectedWorker]);

  // Load draft when requested
  useEffect(() => {
    if (draftToLoad) {
      loadDraft(draftToLoad);
      onDraftLoaded?.();
      
      // Show success feedback after loading
      setTimeout(() => {
        Alert.alert(
          'Brouillon Chargé',
          'La consultation a été reprise avec succès.',
          [{ text: 'Continuer' }]
        );
      }, 500);
    }
  }, [draftToLoad, loadDraft, onDraftLoaded]);

  // ─── Derived ──
  const sectorProfile = useMemo(
    () => selectedWorker ? SECTOR_PROFILES[selectedWorker.sector] : null,
    [selectedWorker]
  );

  const recommendedTests = useMemo(() => {
    if (!sectorProfile) return [];
    return sectorProfile.recommendedScreenings;
  }, [sectorProfile]);

  // ─── Navigation ──
  const goNext = () => {
    const idx = currentStepIdx;
    if (idx < STEPS.length - 1) setCurrentStep(STEPS[idx + 1].key);
  };
  const goPrev = () => {
    const idx = currentStepIdx;
    if (idx > 0) setCurrentStep(STEPS[idx - 1].key);
  };
  const canGoNext = (): boolean => {
    switch (currentStep) {
      case 'worker_identification': return !!selectedWorker;
      case 'visit_reason': return !!examType;
      default: return true;
    }
  };

  // ─── Worker search ──
  const filteredWorkers = useMemo(() => {
    if (!searchQuery.trim()) return SAMPLE_WORKERS;
    const q = searchQuery.toLowerCase();
    return SAMPLE_WORKERS.filter(w =>
      w.firstName.toLowerCase().includes(q) ||
      w.lastName.toLowerCase().includes(q) ||
      w.employeeId.toLowerCase().includes(q) ||
      w.company.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // ─── Handlers ──
  const handleSelectWorker = (w: Worker) => {
    setSelectedWorker(w);
    setShowWorkerModal(false);
    setSearchQuery('');
  };

  const handleAddRestriction = () => {
    if (restrictionInput.trim()) {
      setRestrictions(prev => [...prev, restrictionInput.trim()]);
      setRestrictionInput('');
    }
  };

  const handleRemoveRestriction = (idx: number) => {
    setRestrictions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmitConsultation = async () => {
    if (!selectedWorker) return;

    try {
      // Generate certificate
      const certificateNumber = `CERT-${Date.now().toString(36).toUpperCase()}`;
      const currentDate = new Date().toISOString();
      const expiryDate = new Date();
      
      // Set expiry based on exam type and fitness decision
      if (examType === 'pre_employment') {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year
      } else if (fitnessDecision === 'fit_with_restrictions') {
        expiryDate.setMonth(expiryDate.getMonth() + 6); // 6 months
      } else {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year
      }

      // Create medical examination record
      const medicalExamination: MedicalExamination = {
        id: `EXAM-${Date.now()}`,
        patientId: selectedWorker.id,
        workerSector: selectedWorker.sector,
        examType,
        examDate: currentDate,
        expiryDate: expiryDate.toISOString(),
        examinerDoctorId: 'DOC-001', // Default examiner
        examinerName: 'Dr. Système', // Default examiner name
        vitals,
        physicalExam,
        fitnessDecision,
        restrictions,
        recommendations: recommendations.trim() ? [recommendations] : [],
        followUpDate: followUpNeeded ? followUpDate : undefined,
        followUpReason: followUpNeeded ? 'Suivi médical requis' : undefined,
        certificateNumber,
        certificateIssued: true,
        notes: consultationNotes,
        createdAt: currentDate,
      };

      // Create certificate record
      const certificate = {
        id: certificateNumber,
        patientId: selectedWorker.id,
        patientName: `${selectedWorker.firstName} ${selectedWorker.lastName}`,
        patientNumber: selectedWorker.patientNumber,
        company: selectedWorker.company,
        jobTitle: selectedWorker.jobTitle,
        examType,
        examDate: currentDate,
        expiryDate: expiryDate.toISOString(),
        fitnessDecision,
        restrictions,
        examinerName: 'Dr. Système',
        certificateNumber,
        sector: selectedWorker.sector,
        createdAt: currentDate,
      };

      // Save to AsyncStorage
      await AsyncStorage.setItem(`medical_exam_${medicalExamination.id}`, JSON.stringify(medicalExamination));
      await AsyncStorage.setItem(`certificate_${certificateNumber}`, JSON.stringify(certificate));

      // Also save to certificates list
      const existingCertificates = await AsyncStorage.getItem('certificates_list');
      const certificatesList = existingCertificates ? JSON.parse(existingCertificates) : [];
      certificatesList.push(certificate);
      await AsyncStorage.setItem('certificates_list', JSON.stringify(certificatesList));

      Alert.alert(
        'Consultation Enregistrée',
        `Visite médicale pour ${selectedWorker.firstName} ${selectedWorker.lastName} enregistrée avec succès.\n\nDécision: ${OccHealthUtils.getFitnessStatusLabel(fitnessDecision)}\nCertificat N°: ${certificateNumber}\nValidité: ${expiryDate.toLocaleDateString('fr-CD')}`,
        [{ 
          text: 'OK', 
          onPress: async () => {
            // Delete draft since consultation is completed
            if (draftId) {
              await deleteDraft(draftId);
            }
            // Reset form to initial state
            resetForm();
          }
        }]
      );
    } catch (error) {
      console.error('Error saving consultation:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la consultation');
    }
  };

  // Reset form to initial state
  const resetForm = () => {
    setCurrentStep('worker_identification');
    setSelectedWorker(null);
    setExamType('periodic');
    setVisitReason('');
    setReferredBy('');
    setVitals({});
    setPhysicalExam({
      generalAppearance: 'normal', cardiovascular: 'normal', respiratory: 'normal',
      musculoskeletal: 'normal', neurological: 'normal', dermatological: 'normal',
      ent: 'normal', abdomen: 'normal', mentalHealth: 'normal', ophthalmological: 'normal',
    });
    setOrderedTests([]);
    setAudiometryDone(false);
    setSpirometryDone(false);
    setVisionDone(false);
    setDrugScreeningDone(false);
    setBloodWorkDone(false);
    setXrayDone(false);
    setMentalScreening({
      screeningTool: 'WHO5', interpretation: 'good', stressLevel: 'low',
      sleepQuality: 'good', workLifeBalance: 'good', workload: 'manageable',
      jobSatisfaction: 'satisfied', referralNeeded: false,
    });
    setErgonomicNeeded(false);
    setErgonomicNotes('');
    setMskComplaints([]);
    setFitnessDecision('fit');
    setRestrictions([]);
    setRestrictionInput('');
    setRecommendations('');
    setFollowUpNeeded(false);
    setFollowUpDate('');
    setConsultationNotes('');
    setDraftId(null);
    setIsDraft(false);
    setLastSaved(null);
  };

  // ═══════════════════════════════════════════════════════════
  //  STEP RENDERERS
  // ═══════════════════════════════════════════════════════════

  // ─── Step 1: Worker Identification ──
  const renderWorkerIdentification = () => (
    <View>
      <StepHeader
        title="Identification du Travailleur"
        subtitle="Recherchez le travailleur par nom, numéro employé ou entreprise."
        icon="person"
      />

      {selectedWorker ? (
        <View style={styles.workerCard}>
          <View style={styles.workerCardHeader}>
            <View style={[styles.workerAvatar, { backgroundColor: sectorProfile?.color + '20' }]}>
              <Text style={[styles.workerAvatarText, { color: sectorProfile?.color }]}>
                {selectedWorker.firstName[0]}{selectedWorker.lastName[0]}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.workerName}>
                {selectedWorker.firstName} {selectedWorker.lastName}
              </Text>
              <Text style={styles.workerMeta}>
                {selectedWorker.employeeId} · {selectedWorker.company}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.changeBtn}
              onPress={() => { setSelectedWorker(null); setShowWorkerModal(true); }}
            >
              <Ionicons name="swap-horizontal" size={16} color={ACCENT} />
              <Text style={{ fontSize: 12, color: ACCENT, fontWeight: '600' }}>Changer</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Worker detail grid */}
          <View style={styles.detailGrid}>
            <DetailItem label="Secteur" value={sectorProfile?.label || ''} icon="business" color={sectorProfile?.color} />
            <DetailItem label="Poste" value={selectedWorker.jobTitle} icon="briefcase" />
            <DetailItem label="Site" value={selectedWorker.site} icon="location" />
            <DetailItem label="Département" value={selectedWorker.department} icon="layers" />
            <DetailItem label="Date de Naissance" value={formatDate(selectedWorker.dateOfBirth)} icon="calendar" />
            <DetailItem label="Âge" value={`${OccHealthUtils.getWorkerAge(selectedWorker)} ans`} icon="time" />
            <DetailItem label="Contrat" value={getContractLabel(selectedWorker.contractType)} icon="document" />
            <DetailItem label="Embauché le" value={formatDate(selectedWorker.hireDate)} icon="flag" />
          </View>

          {/* Risk profile */}
          <View style={styles.riskSection}>
            <Text style={styles.riskTitle}>Profil de Risque</Text>
            <View style={styles.chipRow}>
              <View style={[styles.riskChip, { backgroundColor: OccHealthUtils.getSectorRiskColor(selectedWorker.riskLevel) + '14' }]}>
                <Text style={[styles.riskChipText, { color: OccHealthUtils.getSectorRiskColor(selectedWorker.riskLevel) }]}>
                  Risque {OccHealthUtils.getSectorRiskLabel(selectedWorker.riskLevel)}
                </Text>
              </View>
              {selectedWorker.fitnessStatus !== 'pending_evaluation' && (
                <View style={[styles.riskChip, { backgroundColor: OccHealthUtils.getFitnessStatusColor(selectedWorker.fitnessStatus) + '14' }]}>
                  <Text style={[styles.riskChipText, { color: OccHealthUtils.getFitnessStatusColor(selectedWorker.fitnessStatus) }]}>
                    {OccHealthUtils.getFitnessStatusLabel(selectedWorker.fitnessStatus)}
                  </Text>
                </View>
              )}
            </View>
            <View style={[styles.chipRow, { marginTop: 8 }]}>
              {selectedWorker.exposureRisks.slice(0, 5).map((r, i) => (
                <View key={i} style={[styles.exposureChip]}>
                  <Text style={styles.exposureChipText}>{OccHealthUtils.getExposureRiskLabel(r)}</Text>
                </View>
              ))}
              {selectedWorker.exposureRisks.length > 5 && (
                <View style={styles.exposureChip}>
                  <Text style={styles.exposureChipText}>+{selectedWorker.exposureRisks.length - 5}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Allergies & conditions */}
          {(selectedWorker.allergies.length > 0 || selectedWorker.chronicConditions.length > 0) && (
            <View style={styles.alertBox}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                {selectedWorker.allergies.length > 0 && (
                  <Text style={styles.alertText}>
                    <Text style={{ fontWeight: '700' }}>Allergies:</Text> {selectedWorker.allergies.join(', ')}
                  </Text>
                )}
                {selectedWorker.chronicConditions.length > 0 && (
                  <Text style={styles.alertText}>
                    <Text style={{ fontWeight: '700' }}>Conditions:</Text> {selectedWorker.chronicConditions.join(', ')}
                  </Text>
                )}
                {selectedWorker.currentMedications.length > 0 && (
                  <Text style={styles.alertText}>
                    <Text style={{ fontWeight: '700' }}>Médicaments:</Text> {selectedWorker.currentMedications.join(', ')}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>
      ) : (
        <TouchableOpacity style={styles.selectWorkerBtn} onPress={() => setShowWorkerModal(true)}>
          <View style={styles.selectWorkerIcon}>
            <Ionicons name="person-add" size={28} color={ACCENT} />
          </View>
          <Text style={styles.selectWorkerTitle}>Sélectionner un Travailleur</Text>
          <Text style={styles.selectWorkerSub}>Rechercher par nom, ID employé ou entreprise</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ─── Step 2: Visit Reason ──
  const renderVisitReason = () => {
    const examTypes: { type: ExamType; label: string; icon: keyof typeof Ionicons.glyphMap; desc: string }[] = [
      { type: 'pre_employment', label: 'Visite d\'Embauche', icon: 'person-add', desc: 'Nouvel employé — examen initial' },
      { type: 'periodic', label: 'Visite Périodique', icon: 'repeat', desc: 'Surveillance régulière programmée' },
      { type: 'return_to_work', label: 'Visite de Reprise', icon: 'arrow-redo', desc: 'Retour après arrêt maladie/accident' },
      { type: 'post_incident', label: 'Post-Accident', icon: 'warning', desc: 'Suite à un incident de travail' },
      { type: 'fitness_for_duty', label: 'Aptitude Spécifique', icon: 'shield-checkmark', desc: 'Poste spécial (hauteur, conduite...)' },
      { type: 'exit_medical', label: 'Visite de Sortie', icon: 'exit', desc: 'Fin de contrat / départ' },
      { type: 'night_work', label: 'Aptitude Travail de Nuit', icon: 'moon', desc: 'Évaluation pour poste de nuit' },
      { type: 'pregnancy_related', label: 'Suivi Grossesse', icon: 'heart', desc: 'Aménagement poste grossesse' },
      { type: 'special_request', label: 'Demande Spéciale', icon: 'help-circle', desc: 'À la demande du travailleur/employeur' },
    ];

    return (
      <View>
        <StepHeader
          title="Motif de la Visite"
          subtitle={`Sélectionnez le type d'examen pour ${selectedWorker?.firstName} ${selectedWorker?.lastName}.`}
          icon="clipboard"
        />
        <View style={styles.examTypeGrid}>
          {examTypes.map((et) => {
            const isActive = examType === et.type;
            return (
              <TouchableOpacity
                key={et.type}
                style={[styles.examTypeCard, isActive && { borderColor: ACCENT, backgroundColor: ACCENT + '08' }]}
                onPress={() => setExamType(et.type)}
                activeOpacity={0.7}
              >
                <View style={[styles.examTypeIcon, { backgroundColor: isActive ? ACCENT + '14' : colors.outlineVariant }]}>
                  <Ionicons name={et.icon} size={20} color={isActive ? ACCENT : colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.examTypeLabel, isActive && { color: ACCENT }]}>{et.label}</Text>
                  <Text style={styles.examTypeDesc}>{et.desc}</Text>
                </View>
                {isActive && <Ionicons name="checkmark-circle" size={22} color={ACCENT} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>Notes / Motif détaillé (optionnel)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={visitReason}
            onChangeText={setVisitReason}
            placeholder="Détails supplémentaires sur le motif de la visite..."
            placeholderTextColor={colors.placeholder}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>Référé par (optionnel)</Text>
          <TextInput
            style={styles.input}
            value={referredBy}
            onChangeText={setReferredBy}
            placeholder="Nom du médecin, employeur, ou auto-référé"
            placeholderTextColor={colors.placeholder}
          />
        </View>
      </View>
    );
  };

  // ─── Step 3: Vital Signs ──
  const renderVitalSigns = () => {
    const bmi = calculateBMI(vitals.weight, vitals.height);
    const bmiCat = getBMICategory(bmi);

    return (
      <View>
        <StepHeader
          title="Signes Vitaux"
          subtitle="Enregistrez les constantes du travailleur."
          icon="pulse"
        />

        <View style={styles.vitalsGrid}>
          <VitalField label="Température (°C)" value={vitals.temperature?.toString() || ''} placeholder="36.5"
            onChange={v => setVitals(p => ({ ...p, temperature: v ? parseFloat(v) : undefined }))}
            icon="thermometer" unit="°C" />
          <VitalField label="TA Systolique (mmHg)" value={vitals.bloodPressureSystolic?.toString() || ''} placeholder="120"
            onChange={v => setVitals(p => ({ ...p, bloodPressureSystolic: v ? parseInt(v) : undefined }))}
            icon="heart" unit="mmHg" alert={vitals.bloodPressureSystolic && vitals.bloodPressureSystolic >= 140} />
          <VitalField label="TA Diastolique (mmHg)" value={vitals.bloodPressureDiastolic?.toString() || ''} placeholder="80"
            onChange={v => setVitals(p => ({ ...p, bloodPressureDiastolic: v ? parseInt(v) : undefined }))}
            icon="heart" unit="mmHg" alert={vitals.bloodPressureDiastolic && vitals.bloodPressureDiastolic >= 90} />
          <VitalField label="Fréq. Cardiaque (bpm)" value={vitals.heartRate?.toString() || ''} placeholder="72"
            onChange={v => setVitals(p => ({ ...p, heartRate: v ? parseInt(v) : undefined }))}
            icon="pulse" unit="bpm" />
          <VitalField label="Fréq. Respiratoire" value={vitals.respiratoryRate?.toString() || ''} placeholder="16"
            onChange={v => setVitals(p => ({ ...p, respiratoryRate: v ? parseInt(v) : undefined }))}
            icon="cloud" unit="/min" />
          <VitalField label="SpO2 (%)" value={vitals.oxygenSaturation?.toString() || ''} placeholder="98"
            onChange={v => setVitals(p => ({ ...p, oxygenSaturation: v ? parseInt(v) : undefined }))}
            icon="water" unit="%" alert={vitals.oxygenSaturation && vitals.oxygenSaturation < 95} />
          <VitalField label="Poids (kg)" value={vitals.weight?.toString() || ''} placeholder="75"
            onChange={v => setVitals(p => ({ ...p, weight: v ? parseFloat(v) : undefined }))}
            icon="scale" unit="kg" />
          <VitalField label="Taille (cm)" value={vitals.height?.toString() || ''} placeholder="175"
            onChange={v => setVitals(p => ({ ...p, height: v ? parseFloat(v) : undefined }))}
            icon="resize" unit="cm" />
          <VitalField label="Tour de taille (cm)" value={vitals.waistCircumference?.toString() || ''} placeholder="85"
            onChange={v => setVitals(p => ({ ...p, waistCircumference: v ? parseFloat(v) : undefined }))}
            icon="ellipse" unit="cm" />
          <VitalField label="Acuité visuelle" value={vitals.visualAcuity || ''} placeholder="10/10"
            onChange={v => setVitals(p => ({ ...p, visualAcuity: v }))}
            icon="eye" isText />
        </View>

        {/* Auto-computed BMI */}
        {bmi && (
          <View style={[styles.bmiCard, { borderLeftColor: bmiCat.color }]}>
            <View>
              <Text style={styles.bmiLabel}>IMC Calculé</Text>
              <Text style={[styles.bmiValue, { color: bmiCat.color }]}>{bmi}</Text>
            </View>
            <View style={[styles.bmiCatChip, { backgroundColor: bmiCat.color + '14' }]}>
              <Text style={[styles.bmiCatText, { color: bmiCat.color }]}>{bmiCat.label}</Text>
            </View>
          </View>
        )}

        {/* Alert for high BP */}
        {vitals.bloodPressureSystolic && vitals.bloodPressureSystolic >= 140 && (
          <View style={[styles.alertBox, { marginTop: 12 }]}>
            <Ionicons name="alert-circle" size={18} color={colors.error} />
            <Text style={[styles.alertText, { marginLeft: 8 }]}>
              TA élevée détectée ({vitals.bloodPressureSystolic}/{vitals.bloodPressureDiastolic || '?'} mmHg). Contrôle recommandé.
            </Text>
          </View>
        )}
      </View>
    );
  };

  // ─── Step 4: Physical Examination ──
  const renderPhysicalExam = () => {
    const systems: { key: keyof PhysicalExamination; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
      { key: 'generalAppearance', label: 'Aspect Général', icon: 'person' },
      { key: 'cardiovascular', label: 'Cardiovasculaire', icon: 'heart' },
      { key: 'respiratory', label: 'Respiratoire', icon: 'cloud' },
      { key: 'musculoskeletal', label: 'Musculo-squelettique', icon: 'fitness' },
      { key: 'neurological', label: 'Neurologique', icon: 'flash' },
      { key: 'dermatological', label: 'Dermatologique', icon: 'hand-left' },
      { key: 'ent', label: 'ORL (Oreilles, Nez, Gorge)', icon: 'ear' },
      { key: 'abdomen', label: 'Abdomen', icon: 'body' },
      { key: 'ophthalmological', label: 'Ophtalmologique', icon: 'eye' },
      { key: 'mentalHealth', label: 'État Mental', icon: 'happy' },
    ];

    return (
      <View>
        <StepHeader
          title="Examen Physique"
          subtitle="Évaluez chaque système. Cliquez pour basculer entre Normal et Anormal."
          icon="body"
        />

        {systems.map((sys) => {
          const val = physicalExam[sys.key] as string;
          const isNormal = val === 'normal';
          const notesKey = (sys.key + 'Notes') as keyof PhysicalExamination;
          const notes = physicalExam[notesKey] as string | undefined;

          return (
            <View key={sys.key} style={styles.examSystem}>
              <TouchableOpacity
                style={styles.examSystemHeader}
                onPress={() => {
                  const newVal = isNormal ? (sys.key === 'mentalHealth' ? 'concern' : 'abnormal') : 'normal';
                  setPhysicalExam(p => ({ ...p, [sys.key]: newVal }));
                }}
                activeOpacity={0.7}
              >
                <Ionicons name={sys.icon} size={18} color={isNormal ? colors.success : colors.error} />
                <Text style={styles.examSystemLabel}>{sys.label}</Text>
                <View style={[styles.examStatusChip, { backgroundColor: isNormal ? colors.successLight : colors.errorLight }]}>
                  <View style={[styles.examStatusDot, { backgroundColor: isNormal ? colors.success : colors.error }]} />
                  <Text style={[styles.examStatusText, { color: isNormal ? colors.success : colors.error }]}>
                    {isNormal ? 'Normal' : (sys.key === 'mentalHealth' ? 'Préoccupant' : 'Anormal')}
                  </Text>
                </View>
              </TouchableOpacity>
              {!isNormal && (
                <TextInput
                  style={[styles.input, { marginTop: 8, marginLeft: 30 }]}
                  value={notes || ''}
                  onChangeText={v => setPhysicalExam(p => ({ ...p, [notesKey]: v }))}
                  placeholder={`Détails — ${sys.label}`}
                  placeholderTextColor={colors.placeholder}
                />
              )}
            </View>
          );
        })}
      </View>
    );
  };

  // ─── Step 5: Sector-Specific Tests ──
  const renderSectorTests = () => {
    if (!sectorProfile) return null;

    const testOptions: { id: string; label: string; icon: keyof typeof Ionicons.glyphMap; recommended: boolean; desc: string }[] = [
      { id: 'audiometry', label: 'Audiométrie', icon: 'ear', recommended: sectorProfile.recommendedScreenings.includes('audiometry'), desc: 'Seuils auditifs 250–8000 Hz' },
      { id: 'spirometry', label: 'Spirométrie', icon: 'cloud', recommended: sectorProfile.recommendedScreenings.includes('spirometry'), desc: 'FVC, FEV1, ratio FEV1/FVC' },
      { id: 'vision_test', label: 'Examen de Vision', icon: 'eye', recommended: sectorProfile.recommendedScreenings.includes('vision_test'), desc: 'Acuité, couleur, profondeur, périphérique' },
      { id: 'drug_screening', label: 'Dépistage Toxicologique', icon: 'flask', recommended: sectorProfile.recommendedScreenings.includes('drug_screening'), desc: 'Cannabis, opiacés, alcool...' },
      { id: 'chest_xray', label: 'Radiographie Thoracique', icon: 'scan', recommended: sectorProfile.recommendedScreenings.includes('chest_xray'), desc: 'Classification ILO, dépistage TB' },
      { id: 'blood_lead', label: 'Plombémie / Métaux Lourds', icon: 'water', recommended: sectorProfile.recommendedScreenings.includes('blood_lead'), desc: 'Plomb, mercure, arsenic sang' },
      { id: 'cardiac_screening', label: 'Bilan Cardiovasculaire', icon: 'heart', recommended: sectorProfile.recommendedScreenings.includes('cardiac_screening') || sectorProfile.recommendedScreenings.includes('cardiovascular_screening'), desc: 'ECG, cholestérol, glycémie' },
      { id: 'mental_health_screening', label: 'Évaluation Santé Mentale', icon: 'happy', recommended: sectorProfile.recommendedScreenings.includes('mental_health_screening'), desc: 'WHO-5, burnout, stress' },
      { id: 'ergonomic_assessment', label: 'Évaluation Ergonomique', icon: 'desktop', recommended: sectorProfile.recommendedScreenings.includes('ergonomic_assessment'), desc: 'Poste de travail, posture, TMS' },
      { id: 'musculoskeletal_screening', label: 'Dépistage Musculo-squelettique', icon: 'fitness', recommended: sectorProfile.recommendedScreenings.includes('musculoskeletal_screening'), desc: 'Dos, épaules, membres' },
      { id: 'hepatitis_screening', label: 'Dépistage Hépatite B', icon: 'shield', recommended: sectorProfile.recommendedScreenings.includes('hepatitis_b_screening') || sectorProfile.recommendedScreenings.includes('hepatitis_screening'), desc: 'Sérologie HBs' },
      { id: 'tb_screening', label: 'Dépistage Tuberculose', icon: 'medkit', recommended: sectorProfile.recommendedScreenings.includes('tb_screening'), desc: 'IDR / Quantiferon' },
    ];

    // Sort recommended first
    const sorted = [...testOptions].sort((a, b) => (b.recommended ? 1 : 0) - (a.recommended ? 1 : 0));

    return (
      <View>
        <StepHeader
          title="Tests & Examens Complémentaires"
          subtitle={`Tests recommandés pour le secteur ${sectorProfile.label} (risque ${OccHealthUtils.getSectorRiskLabel(sectorProfile.riskLevel).toLowerCase()}).`}
          icon="flask"
        />

        <View style={[styles.alertBox, { backgroundColor: sectorProfile.color + '08', borderColor: sectorProfile.color + '30' }]}>
          <Ionicons name={sectorProfile.icon as any} size={18} color={sectorProfile.color} />
          <Text style={[styles.alertText, { marginLeft: 8, color: sectorProfile.color }]}>
            Profil sectoriel: {sectorProfile.label} — Les tests marqués ★ sont recommandés pour ce secteur.
          </Text>
        </View>

        <View style={{ marginTop: 16 }}>
          {sorted.map((test) => {
            const isOrdered = orderedTests.includes(test.id);
            return (
              <TouchableOpacity
                key={test.id}
                style={[styles.testCard, isOrdered && { borderColor: ACCENT, backgroundColor: ACCENT + '06' }]}
                onPress={() => {
                  setOrderedTests(prev =>
                    prev.includes(test.id) ? prev.filter(t => t !== test.id) : [...prev, test.id]
                  );
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.testCheckbox, isOrdered && { backgroundColor: ACCENT, borderColor: ACCENT }]}>
                  {isOrdered && <Ionicons name="checkmark" size={14} color="#FFF" />}
                </View>
                <Ionicons name={test.icon} size={18} color={isOrdered ? ACCENT : colors.textSecondary} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.testLabel, isOrdered && { color: ACCENT }]}>{test.label}</Text>
                    {test.recommended && (
                      <View style={[styles.recBadge, { backgroundColor: sectorProfile.color + '14' }]}>
                        <Text style={[styles.recBadgeText, { color: sectorProfile.color }]}>★ Recommandé</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.testDesc}>{test.desc}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // ─── Step 6: Mental Health & Ergonomic ──
  const renderMentalErgonomic = () => {
    const showMental = selectedWorker?.exposureRisks.includes('psychosocial') ||
                       selectedWorker?.exposureRisks.includes('shift_work') ||
                       orderedTests.includes('mental_health_screening');
    const showErgo = selectedWorker?.exposureRisks.includes('ergonomic') ||
                     selectedWorker?.exposureRisks.includes('vdt_screen') ||
                     selectedWorker?.exposureRisks.includes('sedentary') ||
                     orderedTests.includes('ergonomic_assessment');

    return (
      <View>
        <StepHeader
          title="Santé Mentale & Ergonomie"
          subtitle="Évaluations complémentaires adaptées au profil de risque."
          icon="happy"
        />

        {/* Mental Health Section */}
        {showMental ? (
          <View style={styles.sectionCard}>
            <View style={styles.sectionCardHeader}>
              <Ionicons name="happy" size={20} color={colors.infoDark} />
              <Text style={styles.sectionCardTitle}>Dépistage Santé Mentale</Text>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Niveau de Stress</Text>
              <View style={styles.chipRow}>
                {(['low', 'moderate', 'high', 'burnout'] as const).map(level => (
                  <TouchableOpacity
                    key={level}
                    style={[styles.choiceChip, mentalScreening.stressLevel === level && styles.choiceChipActive]}
                    onPress={() => setMentalScreening(p => ({ ...p, stressLevel: level }))}
                  >
                    <Text style={[styles.choiceChipText, mentalScreening.stressLevel === level && styles.choiceChipTextActive]}>
                      {{ low: 'Faible', moderate: 'Modéré', high: 'Élevé', burnout: 'Burnout' }[level]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Qualité du Sommeil</Text>
              <View style={styles.chipRow}>
                {(['good', 'fair', 'poor'] as const).map(q => (
                  <TouchableOpacity
                    key={q}
                    style={[styles.choiceChip, mentalScreening.sleepQuality === q && styles.choiceChipActive]}
                    onPress={() => setMentalScreening(p => ({ ...p, sleepQuality: q }))}
                  >
                    <Text style={[styles.choiceChipText, mentalScreening.sleepQuality === q && styles.choiceChipTextActive]}>
                      {{ good: 'Bonne', fair: 'Moyenne', poor: 'Mauvaise' }[q]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Charge de Travail</Text>
              <View style={styles.chipRow}>
                {(['manageable', 'high', 'overwhelming'] as const).map(w => (
                  <TouchableOpacity
                    key={w}
                    style={[styles.choiceChip, mentalScreening.workload === w && styles.choiceChipActive]}
                    onPress={() => setMentalScreening(p => ({ ...p, workload: w }))}
                  >
                    <Text style={[styles.choiceChipText, mentalScreening.workload === w && styles.choiceChipTextActive]}>
                      {{ manageable: 'Gérable', high: 'Élevée', overwhelming: 'Écrasante' }[w]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Satisfaction Professionnelle</Text>
              <View style={styles.chipRow}>
                {(['satisfied', 'neutral', 'dissatisfied'] as const).map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.choiceChip, mentalScreening.jobSatisfaction === s && styles.choiceChipActive]}
                    onPress={() => setMentalScreening(p => ({ ...p, jobSatisfaction: s }))}
                  >
                    <Text style={[styles.choiceChipText, mentalScreening.jobSatisfaction === s && styles.choiceChipTextActive]}>
                      {{ satisfied: 'Satisfait', neutral: 'Neutre', dissatisfied: 'Insatisfait' }[s]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formGroup}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setMentalScreening(p => ({ ...p, referralNeeded: !p.referralNeeded }))}
              >
                <View style={[styles.checkbox, mentalScreening.referralNeeded && styles.checkboxActive]}>
                  {mentalScreening.referralNeeded && <Ionicons name="checkmark" size={14} color="#FFF" />}
                </View>
                <Text style={styles.checkboxLabel}>Orientation vers un spécialiste recommandée</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.notApplicableCard}>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            <Text style={styles.notApplicableText}>
              Dépistage santé mentale non indiqué pour ce profil de risque.
            </Text>
          </View>
        )}

        {/* Ergonomic Section */}
        {showErgo ? (
          <View style={[styles.sectionCard, { marginTop: 16 }]}>
            <View style={styles.sectionCardHeader}>
              <Ionicons name="desktop" size={20} color={colors.secondary} />
              <Text style={styles.sectionCardTitle}>Évaluation Ergonomique</Text>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Plaintes Musculo-squelettiques?</Text>
              <View style={styles.chipRow}>
                {[
                  { region: 'neck' as const, label: 'Cou' },
                  { region: 'shoulder' as const, label: 'Épaules' },
                  { region: 'upper_back' as const, label: 'Haut du Dos' },
                  { region: 'lower_back' as const, label: 'Bas du Dos' },
                  { region: 'wrist_hand' as const, label: 'Poignets/Mains' },
                  { region: 'elbow' as const, label: 'Coudes' },
                  { region: 'knee' as const, label: 'Genoux' },
                ].map(part => {
                  const exists = mskComplaints.some(c => c.bodyRegion === part.region);
                  return (
                    <TouchableOpacity
                      key={part.region}
                      style={[styles.choiceChip, exists && { backgroundColor: colors.errorLight, borderColor: colors.error }]}
                      onPress={() => {
                        if (exists) {
                          setMskComplaints(prev => prev.filter(c => c.bodyRegion !== part.region));
                        } else {
                          setMskComplaints(prev => [...prev, {
                            bodyRegion: part.region, severity: 'mild', frequency: 'occasional', workRelated: true,
                          }]);
                        }
                      }}
                    >
                      <Text style={[styles.choiceChipText, exists && { color: colors.error }]}>{part.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Notes Ergonomiques</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={ergonomicNotes}
                onChangeText={setErgonomicNotes}
                placeholder="Observations sur le poste de travail, posture, écran, siège..."
                placeholderTextColor={colors.placeholder}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        ) : (
          <View style={[styles.notApplicableCard, { marginTop: 16 }]}>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            <Text style={styles.notApplicableText}>
              Évaluation ergonomique non indiquée pour ce profil de risque.
            </Text>
          </View>
        )}
      </View>
    );
  };

  // ─── Step 7: Fitness Decision ──
  const renderFitnessDecision = () => {
    const decisions: { status: FitnessStatus; label: string; desc: string; color: string; icon: keyof typeof Ionicons.glyphMap }[] = [
      { status: 'fit', label: 'Apte', desc: 'Le travailleur peut exercer son poste sans restriction.', color: colors.success, icon: 'checkmark-circle' },
      { status: 'fit_with_restrictions', label: 'Apte avec Restrictions', desc: 'Le travailleur peut travailler avec des aménagements.', color: colors.warning, icon: 'alert-circle' },
      { status: 'temporarily_unfit', label: 'Inapte Temporaire', desc: 'Arrêt temporaire — réévaluation à une date ultérieure.', color: colors.error, icon: 'close-circle' },
      { status: 'permanently_unfit', label: 'Inapte Définitif', desc: 'Incompatibilité permanente avec le poste.', color: colors.errorDark, icon: 'ban' },
    ];

    return (
      <View>
        <StepHeader
          title="Décision d'Aptitude"
          subtitle="Déterminez le statut d'aptitude du travailleur (ILO C161)."
          icon="shield-checkmark"
        />

        {decisions.map(d => {
          const isActive = fitnessDecision === d.status;
          return (
            <TouchableOpacity
              key={d.status}
              style={[styles.decisionCard, isActive && { borderColor: d.color, backgroundColor: d.color + '08' }]}
              onPress={() => setFitnessDecision(d.status)}
              activeOpacity={0.7}
            >
              <View style={[styles.decisionRadio, isActive && { borderColor: d.color }]}>
                {isActive && <View style={[styles.decisionRadioInner, { backgroundColor: d.color }]} />}
              </View>
              <Ionicons name={d.icon} size={22} color={isActive ? d.color : colors.textSecondary} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.decisionLabel, isActive && { color: d.color }]}>{d.label}</Text>
                <Text style={styles.decisionDesc}>{d.desc}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Restrictions (if applicable) */}
        {(fitnessDecision === 'fit_with_restrictions' || fitnessDecision === 'temporarily_unfit') && (
          <View style={[styles.sectionCard, { marginTop: 16 }]}>
            <Text style={styles.sectionCardTitle}>Restrictions</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={restrictionInput}
                onChangeText={setRestrictionInput}
                placeholder="Ex: pas de travail en hauteur, pas de port > 10kg..."
                placeholderTextColor={colors.placeholder}
                onSubmitEditing={handleAddRestriction}
              />
              <TouchableOpacity style={styles.addRestrictionBtn} onPress={handleAddRestriction}>
                <Ionicons name="add" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
            {restrictions.length > 0 && (
              <View style={{ marginTop: 10 }}>
                {restrictions.map((r, i) => (
                  <View key={i} style={styles.restrictionItem}>
                    <Ionicons name="remove-circle" size={16} color={colors.error} />
                    <Text style={styles.restrictionText}>{r}</Text>
                    <TouchableOpacity onPress={() => handleRemoveRestriction(i)}>
                      <Ionicons name="close" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Follow-up */}
        <View style={[styles.sectionCard, { marginTop: 16 }]}>
          <TouchableOpacity style={styles.checkboxRow} onPress={() => setFollowUpNeeded(!followUpNeeded)}>
            <View style={[styles.checkbox, followUpNeeded && styles.checkboxActive]}>
              {followUpNeeded && <Ionicons name="checkmark" size={14} color="#FFF" />}
            </View>
            <Text style={styles.checkboxLabel}>Visite de contrôle nécessaire</Text>
          </TouchableOpacity>
          {followUpNeeded && (
            <TextInput
              style={[styles.input, { marginTop: 8, marginLeft: 32 }]}
              value={followUpDate}
              onChangeText={setFollowUpDate}
              placeholder="Date de contrôle (JJ/MM/AAAA)"
              placeholderTextColor={colors.placeholder}
            />
          )}
        </View>

        {/* Recommendations */}
        <View style={[styles.formGroup, { marginTop: 16 }]}>
          <Text style={styles.fieldLabel}>Recommandations</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={recommendations}
            onChangeText={setRecommendations}
            placeholder="Recommandations médicales pour le travailleur et l'employeur..."
            placeholderTextColor={colors.placeholder}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Notes */}
        <View style={styles.formGroup}>
          <Text style={styles.fieldLabel}>Notes de Consultation</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={consultationNotes}
            onChangeText={setConsultationNotes}
            placeholder="Observations cliniques, remarques pour le dossier..."
            placeholderTextColor={colors.placeholder}
            multiline
            numberOfLines={4}
          />
        </View>
      </View>
    );
  };

  // ─── Step 8: Summary ──
  const renderSummary = () => {
    if (!selectedWorker || !sectorProfile) return null;

    const decisionColor = OccHealthUtils.getFitnessStatusColor(fitnessDecision);

    return (
      <View>
        <StepHeader
          title="Résumé de la Consultation"
          subtitle="Vérifiez les informations avant de valider."
          icon="document-text"
        />

        {/* Decision Banner */}
        <View style={[styles.decisionBanner, { backgroundColor: decisionColor + '10', borderColor: decisionColor }]}>
          <Ionicons
            name={fitnessDecision === 'fit' ? 'checkmark-circle' : fitnessDecision === 'fit_with_restrictions' ? 'alert-circle' : 'close-circle'}
            size={32} color={decisionColor}
          />
          <View style={{ marginLeft: 12 }}>
            <Text style={[styles.decisionBannerTitle, { color: decisionColor }]}>
              {OccHealthUtils.getFitnessStatusLabel(fitnessDecision)}
            </Text>
            <Text style={styles.decisionBannerSub}>
              Certificat pour {selectedWorker.firstName} {selectedWorker.lastName}
            </Text>
          </View>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <SummaryCard title="Travailleur" icon="person" color={colors.primary} items={[
            `${selectedWorker.firstName} ${selectedWorker.lastName}`,
            `${selectedWorker.employeeId} · ${selectedWorker.company}`,
            `${sectorProfile.label} · ${selectedWorker.department}`,
          ]} />
          <SummaryCard title="Type de Visite" icon="clipboard" color={ACCENT} items={[
            OccHealthUtils.getExamTypeLabel(examType),
            visitReason || 'Aucune note',
            referredBy ? `Référé par: ${referredBy}` : 'Auto-référé',
          ]} />
          <SummaryCard title="Signes Vitaux" icon="pulse" color={colors.infoDark} items={[
            `TA: ${vitals.bloodPressureSystolic || '—'}/${vitals.bloodPressureDiastolic || '—'} mmHg`,
            `FC: ${vitals.heartRate || '—'} bpm · T: ${vitals.temperature || '—'}°C`,
            `IMC: ${calculateBMI(vitals.weight, vitals.height) || '—'} · SpO2: ${vitals.oxygenSaturation || '—'}%`,
          ]} />
          <SummaryCard title="Tests Prescrits" icon="flask" color={colors.secondary} items={
            orderedTests.length > 0 ? orderedTests.map(t => {
              const labels: Record<string, string> = {
                audiometry: 'Audiométrie', spirometry: 'Spirométrie', vision_test: 'Vision',
                drug_screening: 'Toxicologie', chest_xray: 'Radio Thorax', blood_lead: 'Métaux Lourds',
                cardiac_screening: 'Cardio', mental_health_screening: 'Santé Mentale',
                ergonomic_assessment: 'Ergonomie', musculoskeletal_screening: 'MSK',
                hepatitis_screening: 'Hépatite B', tb_screening: 'TB',
              };
              return labels[t] || t;
            }) : ['Aucun test prescrit']
          } />
        </View>

        {/* Restrictions */}
        {restrictions.length > 0 && (
          <View style={[styles.sectionCard, { marginTop: 16 }]}>
            <View style={styles.sectionCardHeader}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={[styles.sectionCardTitle, { color: colors.error }]}>Restrictions</Text>
            </View>
            {restrictions.map((r, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <Ionicons name="remove-circle" size={14} color={colors.error} />
                <Text style={{ fontSize: 13, color: colors.text }}>{r}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recommendations */}
        {recommendations.trim() && (
          <View style={[styles.sectionCard, { marginTop: 16 }]}>
            <View style={styles.sectionCardHeader}>
              <Ionicons name="bulb" size={18} color={colors.warning} />
              <Text style={styles.sectionCardTitle}>Recommandations</Text>
            </View>
            <Text style={{ fontSize: 13, color: colors.text, marginTop: 6, lineHeight: 20 }}>{recommendations}</Text>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitConsultation} activeOpacity={0.8}>
          <Ionicons name="checkmark-circle" size={22} color="#FFF" />
          <Text style={styles.submitBtnText}>Valider & Générer Certificat</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════

  const renderStep = () => {
    switch (currentStep) {
      case 'worker_identification': return renderWorkerIdentification();
      case 'visit_reason': return renderVisitReason();
      case 'vital_signs': return renderVitalSigns();
      case 'physical_exam': return renderPhysicalExam();
      case 'sector_tests': return renderSectorTests();
      case 'mental_ergonomic': return renderMentalErgonomic();
      case 'fitness_decision': return renderFitnessDecision();
      case 'summary': return renderSummary();
    }
  };

  return (
    <View style={styles.container}>
      {/* Draft Status Bar */}
      {(isDraft || selectedWorker) && (
        <View style={styles.draftStatusBar}>
          <View style={styles.draftStatusLeft}>
            {isDraft && (
              <>
                <View style={styles.draftIndicator}>
                  <Ionicons name="document-text" size={16} color={ACCENT} />
                  <Text style={styles.draftText}>BROUILLON</Text>
                </View>
                {lastSaved && (
                  <Text style={styles.lastSavedText}>
                    Sauvé: {lastSaved.toLocaleTimeString('fr-CD', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
              </>
            )}
            {!isDraft && selectedWorker && (
              <View style={styles.draftIndicator}>
                <Ionicons name="person" size={16} color={colors.primary} />
                <Text style={styles.draftText}>
                  {selectedWorker.firstName} {selectedWorker.lastName}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={[styles.saveDraftBtn, !selectedWorker && { opacity: 0.5 }]}
            onPress={selectedWorker ? saveDraft : undefined}
            disabled={!selectedWorker}
            activeOpacity={0.7}
          >
            <Ionicons name="save" size={16} color={ACCENT} />
            <Text style={styles.saveDraftBtnText}>Sauvegarder</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stepper Header */}
      <View style={styles.stepperContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stepperContent}>
          {STEPS.map((step, i) => {
            const isActive = i === currentStepIdx;
            const isDone = i < currentStepIdx;
            return (
              <TouchableOpacity
                key={step.key}
                style={[styles.stepItem, isActive && styles.stepItemActive]}
                onPress={() => {
                  // Allow navigating to completed steps or current step
                  if (i <= currentStepIdx || (i === currentStepIdx + 1 && canGoNext())) {
                    setCurrentStep(step.key);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.stepCircle,
                  isDone && { backgroundColor: colors.success },
                  isActive && { backgroundColor: ACCENT },
                ]}>
                  {isDone ? (
                    <Ionicons name="checkmark" size={14} color="#FFF" />
                  ) : (
                    <Text style={[styles.stepNumber, (isActive || isDone) && { color: '#FFF' }]}>
                      {i + 1}
                    </Text>
                  )}
                </View>
                {isDesktop && (
                  <Text style={[
                    styles.stepLabel,
                    isActive && { color: ACCENT, fontWeight: '700' },
                    isDone && { color: colors.success },
                  ]}>
                    {step.label}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {renderStep()}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navBtn, styles.navBtnOutline, currentStepIdx === 0 && { opacity: 0.4 }]}
          onPress={goPrev}
          disabled={currentStepIdx === 0}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={18} color={ACCENT} />
          <Text style={[styles.navBtnText, { color: ACCENT }]}>Précédent</Text>
        </TouchableOpacity>

        <Text style={styles.stepIndicator}>
          {currentStepIdx + 1} / {STEPS.length}
        </Text>

        {currentStep !== 'summary' ? (
          <TouchableOpacity
            style={[styles.navBtn, styles.navBtnFilled, !canGoNext() && { opacity: 0.4 }]}
            onPress={goNext}
            disabled={!canGoNext()}
            activeOpacity={0.7}
          >
            <Text style={[styles.navBtnText, { color: '#FFF' }]}>Suivant</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 120 }} />
        )}
      </View>

      {/* Worker Selection Modal */}
      <Modal visible={showWorkerModal} transparent animationType="fade" onRequestClose={() => setShowWorkerModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rechercher un Travailleur</Text>
              <TouchableOpacity onPress={() => setShowWorkerModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Nom, ID employé, entreprise..."
                placeholderTextColor={colors.placeholder}
                autoFocus
              />
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {filteredWorkers.map(w => {
                const sp = SECTOR_PROFILES[w.sector];
                return (
                  <TouchableOpacity key={w.id} style={styles.workerItem} onPress={() => handleSelectWorker(w)} activeOpacity={0.7}>
                    <View style={[styles.workerItemAvatar, { backgroundColor: sp.color + '14' }]}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: sp.color }}>{w.firstName[0]}{w.lastName[0]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.workerItemName}>{w.firstName} {w.lastName}</Text>
                      <Text style={styles.workerItemMeta}>{w.employeeId} · {w.company}</Text>
                      <Text style={styles.workerItemSector}>
                        <Ionicons name={sp.icon as any} size={12} color={sp.color} /> {sp.label} · {w.jobTitle}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
//  REUSABLE SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StepHeader({ title, subtitle, icon }: { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.stepHeader}>
      <View style={styles.stepHeaderIcon}>
        <Ionicons name={icon} size={22} color={ACCENT} />
      </View>
      <View>
        <Text style={styles.stepHeaderTitle}>{title}</Text>
        <Text style={styles.stepHeaderSub}>{subtitle}</Text>
      </View>
    </View>
  );
}

function DetailItem({ label, value, icon, color }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; color?: string }) {
  return (
    <View style={styles.detailItem}>
      <Ionicons name={icon} size={14} color={color || colors.textSecondary} />
      <View>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function VitalField({ label, value, placeholder, onChange, icon, unit, isText, alert: isAlert }: {
  label: string; value: string; placeholder: string; onChange: (v: string) => void;
  icon: keyof typeof Ionicons.glyphMap; unit?: string; isText?: boolean; alert?: boolean | number;
}) {
  return (
    <View style={[styles.vitalField, isAlert ? { borderColor: '#EF4444', backgroundColor: '#EF444408' } : {}]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Ionicons name={icon} size={14} color={isAlert ? '#EF4444' : colors.textSecondary} />
        <Text style={[styles.vitalLabel, isAlert && { color: '#EF4444' }]}>{label}</Text>
      </View>
      <TextInput
        style={styles.vitalInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        keyboardType={isText ? 'default' : 'numeric'}
      />
    </View>
  );
}

function SummaryCard({ title, icon, color, items }: { title: string; icon: keyof typeof Ionicons.glyphMap; color: string; items: string[] }) {
  return (
    <View style={styles.summaryCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <View style={[styles.summaryCardIcon, { backgroundColor: color + '14' }]}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
        <Text style={styles.summaryCardTitle}>{title}</Text>
      </View>
      {items.map((item, i) => (
        <Text key={i} style={styles.summaryCardItem}>• {item}</Text>
      ))}
    </View>
  );
}

// ─── Helper functions ──
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-CD', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getContractLabel(type: string): string {
  const labels: Record<string, string> = {
    permanent: 'CDI', contract: 'CDD', seasonal: 'Saisonnier', intern: 'Stagiaire', daily_worker: 'Journalier',
  };
  return labels[type] || type;
}

// ═══════════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  
  // ── Stepper ──
  stepperContainer: {
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.outline,
    ...shadows.sm,
  },
  stepperContent: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 4 },
  stepItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  stepItemActive: { backgroundColor: ACCENT + '0A' },
  stepCircle: {
    width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.outlineVariant,
  },
  stepNumber: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  stepLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },

  // ── Content ──
  content: { flex: 1 },
  contentInner: { padding: isDesktop ? 32 : 16, paddingBottom: 100 },

  // ── Step Header ──
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
  stepHeaderIcon: {
    width: 44, height: 44, borderRadius: borderRadius.lg, backgroundColor: ACCENT + '14',
    alignItems: 'center', justifyContent: 'center',
  },
  stepHeaderTitle: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  stepHeaderSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2, maxWidth: isDesktop ? 500 : 280 },

  // ── Worker Card ──
  workerCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: 20,
    borderWidth: 1, borderColor: colors.outline, ...shadows.sm,
  },
  workerCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  workerAvatar: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
  },
  workerAvatarText: { fontSize: 16, fontWeight: '800' },
  workerName: { fontSize: 16, fontWeight: '700', color: colors.text },
  workerMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  changeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: ACCENT + '40',
  },
  divider: { height: 1, backgroundColor: colors.outline, marginVertical: 16 },
  detailGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  detailItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    width: isDesktop ? '23%' : '47%', paddingVertical: 4,
  },
  detailLabel: { fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  detailValue: { fontSize: 13, color: colors.text, fontWeight: '500', marginTop: 1 },
  riskSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.outline },
  riskTitle: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  riskChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  riskChipText: { fontSize: 11, fontWeight: '600' },
  exposureChip: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12,
    backgroundColor: colors.outlineVariant, borderWidth: 1, borderColor: colors.outline,
  },
  exposureChipText: { fontSize: 10, color: colors.textSecondary, fontWeight: '500' },
  alertBox: {
    flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderRadius: borderRadius.md,
    backgroundColor: colors.errorLight, borderWidth: 1, borderColor: colors.error + '40', marginTop: 12,
  },
  alertText: { fontSize: 12, color: colors.errorDark, lineHeight: 18, flex: 1 },

  // ── Select Worker Button ──
  selectWorkerBtn: {
    alignItems: 'center', justifyContent: 'center', padding: 40,
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 2, borderColor: colors.outline, borderStyle: 'dashed',
  },
  selectWorkerIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: ACCENT + '14',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  selectWorkerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  selectWorkerSub: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },

  // ── Exam Type ──
  examTypeGrid: { gap: 8 },
  examTypeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.outline,
  },
  examTypeIcon: {
    width: 40, height: 40, borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  examTypeLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  examTypeDesc: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },

  // ── Form ──
  formGroup: { marginTop: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 1, borderColor: colors.outline, borderRadius: borderRadius.md,
    padding: 12, fontSize: 14, color: colors.text, backgroundColor: colors.surface,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },

  // ── Vitals ──
  vitalsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  vitalField: {
    width: isDesktop ? '23%' : '47%', padding: 12,
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.outline,
  },
  vitalLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  vitalInput: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 2, padding: 0 },
  bmiCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, marginTop: 16, backgroundColor: colors.surface,
    borderRadius: borderRadius.md, borderLeftWidth: 4,
  },
  bmiLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase' },
  bmiValue: { fontSize: 24, fontWeight: '800', marginTop: 2 },
  bmiCatChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  bmiCatText: { fontSize: 12, fontWeight: '700' },

  // ── Physical Exam ──
  examSystem: {
    marginBottom: 8, padding: 12, backgroundColor: colors.surface,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.outline,
  },
  examSystemHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  examSystemLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  examStatusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  examStatusDot: { width: 8, height: 8, borderRadius: 4 },
  examStatusText: { fontSize: 11, fontWeight: '600' },

  // ── Sector Tests ──
  testCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, marginBottom: 8,
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.outline,
  },
  testCheckbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.outline,
    alignItems: 'center', justifyContent: 'center',
  },
  testLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  testDesc: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  recBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  recBadgeText: { fontSize: 10, fontWeight: '700' },

  // ── Mental Health / Ergonomic ──
  sectionCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: 18,
    borderWidth: 1, borderColor: colors.outline, ...shadows.sm,
  },
  sectionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionCardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  choiceChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.surface,
  },
  choiceChipActive: { backgroundColor: ACCENT + '14', borderColor: ACCENT },
  choiceChipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  choiceChipTextActive: { color: ACCENT },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.outline,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  checkboxLabel: { fontSize: 13, fontWeight: '500', color: colors.text },
  notApplicableCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16,
    backgroundColor: colors.successLight, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.success + '30',
  },
  notApplicableText: { fontSize: 13, color: colors.successDark, fontWeight: '500', flex: 1 },

  // ── Fitness Decision ──
  decisionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, marginBottom: 10,
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 2, borderColor: colors.outline,
  },
  decisionRadio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.outline,
    alignItems: 'center', justifyContent: 'center',
  },
  decisionRadioInner: { width: 12, height: 12, borderRadius: 6 },
  decisionLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  decisionDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  addRestrictionBtn: {
    width: 44, height: 44, borderRadius: borderRadius.md, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
  },
  restrictionItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.outline,
  },
  restrictionText: { flex: 1, fontSize: 13, color: colors.text },

  // ── Summary ──
  decisionBanner: {
    flexDirection: 'row', alignItems: 'center', padding: 20, marginBottom: 20,
    borderRadius: borderRadius.lg, borderWidth: 2,
  },
  decisionBannerTitle: { fontSize: 18, fontWeight: '800' },
  decisionBannerSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  summaryCard: {
    flex: 1, minWidth: isDesktop ? 200 : '47%', padding: 16,
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.outline, ...shadows.sm,
  },
  summaryCardIcon: {
    width: 32, height: 32, borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  summaryCardTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  summaryCardItem: { fontSize: 12, color: colors.textSecondary, lineHeight: 20, marginLeft: 4 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginTop: 24, padding: 16, borderRadius: borderRadius.lg,
    backgroundColor: colors.primary, ...shadows.md,
  },
  submitBtnText: { fontSize: 15, fontWeight: '800', color: '#FFF' },

  // ── Bottom Nav ──
  bottomNav: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.outline,
    ...shadows.sm,
  },
  navBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: borderRadius.lg,
  },

  // ── Draft Status Bar ──
  draftStatusBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: isDesktop ? 32 : 16, paddingVertical: 12,
    backgroundColor: ACCENT + '05', borderBottomWidth: 1, borderBottomColor: ACCENT + '20',
  },
  draftStatusLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  draftIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  draftText: { fontSize: 12, fontWeight: '700', color: ACCENT },
  lastSavedText: { fontSize: 11, color: colors.textSecondary },
  saveDraftBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: ACCENT + '40',
  },
  saveDraftBtnText: { fontSize: 12, color: ACCENT, fontWeight: '600' },
  navBtnOutline: { borderWidth: 1, borderColor: ACCENT },
  navBtnFilled: { backgroundColor: ACCENT },
  navBtnText: { fontSize: 13, fontWeight: '700' },
  stepIndicator: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },

  // ── Modal ──
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  modal: {
    width: isDesktop ? 600 : '92%', maxHeight: '80%',
    backgroundColor: colors.surface, borderRadius: borderRadius.xl,
    padding: 24, ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
    backgroundColor: colors.outlineVariant, borderRadius: borderRadius.md, marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, padding: 0 },
  workerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.outline,
  },
  workerItemAvatar: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
  },
  workerItemName: { fontSize: 14, fontWeight: '600', color: colors.text },
  workerItemMeta: { fontSize: 11, color: colors.textSecondary },
  workerItemSector: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
});
