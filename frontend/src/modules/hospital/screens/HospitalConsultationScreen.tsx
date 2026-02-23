import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Audio, Recording, Sound } from 'expo-audio';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import ApiService from '../../../services/ApiService';
import { Patient } from '../../../models/Patient';
import { Encounter, EncounterType, EncounterStatus } from '../../../models/Encounter';
import { PendingHospitalConsultation, HOSPITAL_PENDING_CONSULTATIONS_KEY } from './HospitalPatientIntakeScreen';
import DateInput from '../../../components/DateInput';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

const ACCENT = colors.info;

// ─── Glitter Animation Helper ───
const useGlitterAnimation = () => {
  const opacity = new Animated.Value(1);
  const scale = new Animated.Value(1);
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0.5,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1.1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, [opacity, scale]);
  
  return { opacity, scale };
};

// ═══════════════════════════════════════════════════════════════
//  Step-by-step wizard for hospital consultation
// ═══════════════════════════════════════════════════════════════

type ConsultationStep =
  | 'patient_identification'
  | 'visit_reason'
  | 'physical_exam'
  | 'generate_notes'
  | 'diagnosis'
  | 'treatment_plan'
  | 'prescriptions'
  | 'summary';

const STEPS: { key: ConsultationStep; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'patient_identification', label: 'Identification', icon: 'person' },
  { key: 'visit_reason', label: 'Motif de Consultation', icon: 'clipboard' },
  { key: 'physical_exam', label: 'Examen Physique', icon: 'body' },
  { key: 'generate_notes', label: 'Générer Notes', icon: 'document-text' },
  { key: 'diagnosis', label: 'Diagnostic', icon: 'analytics' },
  { key: 'treatment_plan', label: 'Plan de Traitement', icon: 'medkit' },
  { key: 'prescriptions', label: 'Ordonnances', icon: 'document-text' },
  { key: 'summary', label: 'Résumé & Clôture', icon: 'checkmark-circle' },
];

// ─── Types ───────────────────────────────────────────────────
interface PhysicalExamination {
  generalAppearance: 'normal' | 'abnormal' | 'not_examined';
  generalAppearanceNotes?: string;
  heent: 'normal' | 'abnormal' | 'not_examined';
  heentNotes?: string;
  cardiovascular: 'normal' | 'abnormal' | 'not_examined';
  cardiovascularNotes?: string;
  respiratory: 'normal' | 'abnormal' | 'not_examined';
  respiratoryNotes?: string;
  abdomen: 'normal' | 'abnormal' | 'not_examined';
  abdomenNotes?: string;
  musculoskeletal: 'normal' | 'abnormal' | 'not_examined';
  musculoskeletalNotes?: string;
  neurological: 'normal' | 'abnormal' | 'not_examined';
  neurologicalNotes?: string;
  skin: 'normal' | 'abnormal' | 'not_examined';
  skinNotes?: string;
  psychiatric: 'normal' | 'abnormal' | 'not_examined';
  psychiatricNotes?: string;
}

interface Diagnosis {
  code?: string;
  description: string;
  type: 'primary' | 'secondary' | 'differential';
  certainty: 'confirmed' | 'probable' | 'suspected' | 'ruled_out';
}

interface PrescriptionItem {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  instructions?: string;
}

interface LabOrder {
  id: string;
  testName: string;
  priority: 'routine' | 'urgent' | 'stat';
  notes?: string;
}

// ─── Sample patients (would come from DB in production) ──────
const SAMPLE_PATIENTS: Patient[] = [
  {
    id: 'P001',
    firstName: 'Jean',
    lastName: 'Mukendi',
    dateOfBirth: '1985-03-15',
    gender: 'male',
    phone: '+243 81 234 5678',
    patientNumber: 'PAT-0001',
    registrationDate: '2023-01-15',
    lastVisit: '2024-01-15',
    status: 'active',
    allergies: ['Pénicilline'],
    chronicConditions: ['Hypertension', 'Diabète Type 2'],
    currentMedications: ['Amlodipine 5mg', 'Metformine 850mg'],
    createdAt: '2023-01-15',
    encounters: [],
  },
  {
    id: 'P002',
    firstName: 'Marie',
    lastName: 'Kabamba',
    dateOfBirth: '1992-07-22',
    gender: 'female',
    phone: '+243 99 876 5432',
    patientNumber: 'PAT-0002',
    registrationDate: '2023-06-10',
    lastVisit: '2024-01-10',
    status: 'active',
    allergies: [],
    chronicConditions: [],
    currentMedications: [],
    createdAt: '2023-06-10',
    encounters: [],
  },
  {
    id: 'P003',
    firstName: 'Pierre',
    lastName: 'Kasongo',
    dateOfBirth: '1978-11-08',
    gender: 'male',
    phone: '+243 85 555 1234',
    patientNumber: 'PAT-0003',
    registrationDate: '2022-03-20',
    lastVisit: '2024-01-08',
    status: 'active',
    allergies: ['Aspirine', 'Sulfamides'],
    chronicConditions: ['Asthme', 'Arthrite'],
    currentMedications: ['Ventoline PRN', 'Ibuprofène 400mg'],
    createdAt: '2022-03-20',
    encounters: [],
  },
];

// ─── Common medications for quick selection ──────────────────
const COMMON_MEDICATIONS = [
  'Paracétamol 500mg',
  'Amoxicilline 500mg',
  'Ibuprofène 400mg',
  'Oméprazole 20mg',
  'Métronidazole 500mg',
  'Ciprofloxacine 500mg',
  'Amlodipine 5mg',
  'Metformine 500mg',
  'Prednisone 5mg',
  'Diclofénac 50mg',
];

// ─── Common lab tests ────────────────────────────────────────
const COMMON_LAB_TESTS = [
  'Numération Formule Sanguine (NFS)',
  'Glycémie à jeun',
  'Créatinine',
  'Transaminases (ALAT/ASAT)',
  'Bilan lipidique',
  'Examen d\'urine',
  'CRP',
  'VS',
  'Hémocultures',
  'Radiographie thorax',
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

function getAge(dateOfBirth: string): number {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

interface HospitalConsultationScreenProps {
  patientId?: string;
  encounterId?: string;
  pendingConsultationToLoad?: string | null;
  onPendingLoaded?: () => void;
  onBack?: () => void;
  onComplete?: (encounter: Partial<Encounter>) => void;
}

export function HospitalConsultationScreen({
  patientId,
  encounterId,
  pendingConsultationToLoad,
  onPendingLoaded,
  onBack,
  onComplete,
}: HospitalConsultationScreenProps) {
  // ─── Recording state ──
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [soundObject, setSoundObject] = useState<Sound | null>(null);
  const recordingRef = useRef<Recording | null>(null);
  const webMediaRecorderRef = useRef<any>(null);
  const webMediaChunksRef = useRef<BlobPart[]>([]);
  const webAudioElementRef = useRef<any>(null);
  const webStreamRef = useRef<any>(null);
  const webStopResolverRef = useRef<((uri: string | null) => void) | null>(null);
  const webPromptOnStopRef = useRef(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const glitterAnim = useGlitterAnimation();
  const notesGenerationInitiatedRef = useRef(false);

  // ─── Generated notes state ──
  const [generatedNotes, setGeneratedNotes] = useState<string>('');
  const [editedNotes, setEditedNotes] = useState<string>('');
  const [generatingNotes, setGeneratingNotes] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [consultationNotes, setConsultationNotes] = useState<string>('');

  // ─── Custom exam types ──
  const [customExamTypes, setCustomExamTypes] = useState<string[]>([]);
  const [showAddExamModal, setShowAddExamModal] = useState(false);
  const [newExamName, setNewExamName] = useState('');

  // ─── Step state ──
  const [currentStep, setCurrentStep] = useState<ConsultationStep>(
    patientId ? 'visit_reason' : 'patient_identification'
  );
  const currentStepIdx = STEPS.findIndex(s => s.key === currentStep);

  // ─── Patient identification ──
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(
    patientId ? SAMPLE_PATIENTS.find(p => p.id === patientId) || null : null
  );
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [pendingConsultations, setPendingConsultations] = useState<PendingHospitalConsultation[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);

  // ─── Visit reason ──
  const [encounterType, setEncounterType] = useState<EncounterType>('outpatient');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [historyOfPresentIllness, setHistoryOfPresentIllness] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [vitals, setVitals] = useState<{
    temperature?: number;
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    heartRate?: number;
    oxygenSaturation?: number;
  }>({});

  // ─── Physical exam ──
  const [physicalExam, setPhysicalExam] = useState<PhysicalExamination>({
    generalAppearance: 'normal',
    heent: 'normal',
    cardiovascular: 'normal',
    respiratory: 'normal',
    abdomen: 'normal',
    musculoskeletal: 'normal',
    neurological: 'normal',
    skin: 'normal',
    psychiatric: 'normal',
  });

  // ─── Diagnosis ──
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [newDiagnosisDesc, setNewDiagnosisDesc] = useState('');
  const [newDiagnosisCode, setNewDiagnosisCode] = useState('');
  const [newDiagnosisType, setNewDiagnosisType] = useState<'primary' | 'secondary' | 'differential'>('primary');

  // ─── Treatment plan ──
  const [treatmentNotes, setTreatmentNotes] = useState('');
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [imagingOrders, setImagingOrders] = useState<string[]>([]);
  const [referrals, setReferrals] = useState<string[]>([]);
  const [followUpNeeded, setFollowUpNeeded] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');

  // ─── Prescriptions ──
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState<Partial<PrescriptionItem>>({});

  // ─── Summary ──
  const [disposition, setDisposition] = useState<'discharged' | 'admitted' | 'transferred' | 'observation'>('discharged');

  // ─── Filtered patients for search ──
  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return SAMPLE_PATIENTS;
    const q = searchQuery.toLowerCase();
    return SAMPLE_PATIENTS.filter(p =>
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.patientNumber.toLowerCase().includes(q) ||
      p.phone?.includes(q)
    );
  }, [searchQuery]);

  const loadPendingQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const stored = await AsyncStorage.getItem(HOSPITAL_PENDING_CONSULTATIONS_KEY);
      console.log('[HospitalConsultation] Stored queue:', stored);
      const list: PendingHospitalConsultation[] = stored ? JSON.parse(stored) : [];
      const waiting = list.filter(item => item.status === 'waiting');
      console.log('[HospitalConsultation] Waiting patients:', waiting.length);
      setPendingConsultations(waiting);
    } catch (err) {
      console.error('[HospitalConsultation] Error loading queue:', err);
      setPendingConsultations([]);
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  const loadPendingConsultation = useCallback(async (pendingId: string) => {
    try {
      const stored = await AsyncStorage.getItem(HOSPITAL_PENDING_CONSULTATIONS_KEY);
      if (!stored) return;
      const list: PendingHospitalConsultation[] = JSON.parse(stored);
      const pending = list.find(item => item.id === pendingId);
      if (!pending) return;

      setSelectedPatient(pending.patient);
      setChiefComplaint(pending.visitReason || '');
      setReferredBy(pending.referredBy || 'Accueil Consultation');
      setVitals(pending.vitals || {});
      setCurrentStep('visit_reason');

      // Keep patient in waiting list until consultation is completed
      // Patient remains in queue until doctor clicks complete button
    } catch (err) {
      console.error('[HospitalConsultation] Error loading pending:', err);
      Alert.alert('Erreur', 'Impossible de charger ce patient depuis la file d\'attente.');
    }
  }, []);

  // Load queue on mount
  useEffect(() => {
    loadPendingQueue();
  }, [loadPendingQueue]);

  // Wait a bit then load pending consultation if provided
  useEffect(() => {
    if (pendingConsultationToLoad) {
      setTimeout(() => {
        loadPendingConsultation(pendingConsultationToLoad);
        onPendingLoaded?.();
      }, 100);
    }
  }, [pendingConsultationToLoad, loadPendingConsultation, onPendingLoaded]);

  // Auto-refresh waiting room when screen gains focus
  useFocusEffect(
    useCallback(() => {
      if (!selectedPatient) {
        loadPendingQueue();
      }
    }, [selectedPatient, loadPendingQueue])
  );

  // ─── Navigation ──
  const goNext = () => {
    if (currentStepIdx < STEPS.length - 1) {
      setCurrentStep(STEPS[currentStepIdx + 1].key);
    }
  };

  const goPrev = () => {
    if (currentStepIdx > 0) {
      setCurrentStep(STEPS[currentStepIdx - 1].key);
    }
  };

  // ─── Recording functions ───
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      console.log('[Recording] Starting recording...');
      console.log('[Recording] Platform:', Platform.OS);
      console.log('[Recording] Current step:', currentStep);
      console.log('[Recording] Is recording:', isRecording);

      // Web fallback via MediaRecorder
      if (Platform.OS === 'web') {
        const mediaDevices = (navigator as any)?.mediaDevices;
        const MediaRecorderCtor = (globalThis as any)?.MediaRecorder;

        if (!mediaDevices?.getUserMedia || !MediaRecorderCtor) {
          Alert.alert(
            'Non disponible',
            'L\'enregistrement audio n\'est pas supporté sur ce navigateur.'
          );
          return;
        }

        const stream = await mediaDevices.getUserMedia({ audio: true });
        webStreamRef.current = stream;
        webMediaChunksRef.current = [];

        const recorder = new MediaRecorderCtor(stream);
        recorder.ondataavailable = (event: any) => {
          if (event.data && event.data.size > 0) {
            webMediaChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const mimeType = recorder.mimeType || 'audio/webm';
          const blob = new Blob(webMediaChunksRef.current, { type: mimeType });
          const uri = URL.createObjectURL(blob);

          setAudioUri(uri);
          setIsRecording(false);

          if (webStreamRef.current) {
            webStreamRef.current.getTracks().forEach((track: any) => track.stop());
            webStreamRef.current = null;
          }

          if (webPromptOnStopRef.current) {
            Alert.alert(
              '🎙️ Enregistrement Terminé',
              'Voulez-vous utiliser cet enregistrement pour générer automatiquement les notes de consultation avec l\'IA?',
              [
                { text: 'Non, continuer', onPress: () => {} },
                {
                  text: 'Oui, générer les notes',
                  onPress: () => generateNotesFromRecording(uri),
                },
              ]
            );
          }

          if (webStopResolverRef.current) {
            webStopResolverRef.current(uri);
            webStopResolverRef.current = null;
          }
        };

        webMediaRecorderRef.current = recorder;
        recorder.start();
        setIsRecording(true);
        setRecordingDuration(0);
        setAudioUri(null);

        timerRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 100);
        }, 100);

        console.log('[Recording] Web recording started successfully');
        return;
      }

      // Request microphone permissions
      const permission = await Audio.requestPermissionsAsync();
      console.log('[Recording] Permission result:', permission);
      
      if (!permission.granted) {
        console.error('[Recording] Permission not granted:', permission);
        Alert.alert('Permission refusée', 'L\'accès au microphone est nécessaire pour enregistrer.');
        return;
      }

      console.log('[Recording] Setting audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('[Recording] Creating recording...');
      const recording = await Recording.createAsync({
        isMeteringEnabled: true,
        android: {
          extension: '.m4a',
          outputFormat: 2,
          audioEncoder: 3,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: 1,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      });

      console.log('[Recording] Recording created:', recording);
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);
      setAudioUri(null);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 100);
      }, 100);

      console.log('[Recording] Recording started successfully');
    } catch (err) {
      console.error('[Recording] Error starting:', err);
      console.error('[Recording] Error details:', JSON.stringify(err));
      Alert.alert('Erreur', 'Impossible de démarrer l\'enregistrement: ' + (err as any)?.message);
    }
  };

  const stopRecording = async (options: { promptForNotes?: boolean } = {}): Promise<string | null> => {
    try {
      const promptForNotes = options.promptForNotes ?? true;
      console.log('[Recording] Stopping recording...');
      console.log('[Recording] recordingRef.current exists:', !!recordingRef.current);

      if (Platform.OS === 'web') {
        if (timerRef.current) clearInterval(timerRef.current);

        const recorder = webMediaRecorderRef.current;
        if (!recorder || recorder.state === 'inactive') {
          console.log('[Recording] No web recording in progress');
          return audioUri;
        }

        webPromptOnStopRef.current = promptForNotes;
        return await new Promise<string | null>((resolve) => {
          webStopResolverRef.current = resolve;
          recorder.stop();
        });
      }
      
      if (!recordingRef.current) {
        console.log('[Recording] No recording in progress');
        return audioUri;
      }

      if (timerRef.current) clearInterval(timerRef.current);

      console.log('[Recording] Stopping and unloading...');
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();

      console.log('[Recording] Recording saved to:', uri);
      setAudioUri(uri || null);
      setIsRecording(false);
      recordingRef.current = null;

      // Ask if user wants to use recording for notes
      if (promptForNotes) {
        Alert.alert(
          '🎙️ Enregistrement Terminé',
          'Voulez-vous utiliser cet enregistrement pour générer automatiquement les notes de consultation avec l\'IA?',
          [
            { text: 'Non, continuer', onPress: () => {} },
            {
              text: 'Oui, générer les notes',
              onPress: () => generateNotesFromRecording(uri),
            },
          ]
        );
      }

      return uri || null;
    } catch (err) {
      console.error('[Recording] Error stopping:', err);
      console.error('[Recording] Error details:', JSON.stringify(err));
      Alert.alert('Erreur', 'Impossible d\'arrêter l\'enregistrement: ' + (err as any)?.message);
      return null;
    }
  };

  const playRecording = async () => {
    try {
      if (!audioUri) return;

      if (Platform.OS === 'web') {
        if (webAudioElementRef.current) {
          webAudioElementRef.current.pause();
          webAudioElementRef.current = null;
        }

        const htmlAudio = new (globalThis as any).Audio(audioUri);
        webAudioElementRef.current = htmlAudio;
        setIsPlaying(true);

        htmlAudio.onended = () => {
          setIsPlaying(false);
          webAudioElementRef.current = null;
        };

        await htmlAudio.play();
        return;
      }

      const sound = await Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: false }
      );
      setSoundObject(sound);
      setIsPlaying(true);

      await sound.playAsync();

      // Monitor playback
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
          setSoundObject(null);
        }
      });
    } catch (err) {
      console.error('[Recording] Error playing:', err);
      Alert.alert('Erreur', 'Impossible de lire l\'enregistrement.');
    }
  };

  const stopPlayback = async () => {
    try {
      if (Platform.OS === 'web') {
        if (webAudioElementRef.current) {
          webAudioElementRef.current.pause();
          setIsPlaying(false);
        }
        return;
      }

      if (soundObject) {
        await soundObject.pauseAsync();
        setIsPlaying(false);
      }
    } catch (err) {
      console.error('[Recording] Error stopping playback:', err);
    }
  };

  const generateNotesFromRecording = async (uri: string | null) => {
    if (!uri) return;

    try {
      Alert.alert('📝', 'Génération des notes en cours...');
      
      // Read audio file and create FormData
      const formData = new FormData();
      
      // Convert URI to blob
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append('audio', blob, 'consultation_recording.wav');
      
      // Make API call to transcribe with Gemini
      const api = ApiService.getInstance();
      const result = await api.post('/hospital/transcribe-recording/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (result.success && result.data) {
        const notes = result.data;
        
        // Populate the consultation form with generated notes
        if (notes.chief_complaint) setChiefComplaint(notes.chief_complaint);
        if (notes.history_of_present_illness) setHistoryOfPresentIllness(notes.history_of_present_illness);
        if (notes.assessment) {
          // Add diagnosis from assessment
          if (notes.assessment.trim()) {
            setDiagnoses([{
              description: notes.assessment,
              type: 'primary',
              certainty: 'suspected',
            }]);
          }
        }
        if (notes.treatment_plan) setTreatmentNotes(notes.treatment_plan);
        
        Alert.alert(
          '✅ Notes Générées',
          'Les notes de consultation ont été générées avec succès. Vous pouvez les modifier et continuer.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Erreur', result.data?.error || 'Impossible de générer les notes.');
      }
    } catch (err) {
      console.error('[Recording] Error generating notes:', err);
      Alert.alert('Erreur', 'Impossible de générer les notes de consultation.');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (webMediaRecorderRef.current && webMediaRecorderRef.current.state !== 'inactive') {
        webMediaRecorderRef.current.stop();
      }
      if (webStreamRef.current) {
        webStreamRef.current.getTracks().forEach((track: any) => track.stop());
      }
      if (webAudioElementRef.current) {
        webAudioElementRef.current.pause();
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
      if (soundObject) {
        soundObject.unloadAsync();
      }
    };
  }, [soundObject]);

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 'patient_identification':
        return !!selectedPatient;
      case 'visit_reason':
        return !!chiefComplaint.trim();
      case 'physical_exam':
        return true; // Optional
      case 'generate_notes':
        return !!consultationNotes.trim(); // Must have validated notes
      case 'diagnosis':
        return diagnoses.length > 0;
      case 'treatment_plan':
        return true;
      case 'prescriptions':
        return true;
      case 'summary':
        return true;
      default:
        return true;
    }
  }, [currentStep, selectedPatient, chiefComplaint, diagnoses, consultationNotes]);

  // ─── Add diagnosis ──
  const addDiagnosis = () => {
    if (!newDiagnosisDesc.trim()) return;
    setDiagnoses([
      ...diagnoses,
      {
        code: newDiagnosisCode || undefined,
        description: newDiagnosisDesc,
        type: newDiagnosisType,
        certainty: 'confirmed',
      },
    ]);
    setNewDiagnosisDesc('');
    setNewDiagnosisCode('');
    setNewDiagnosisType('secondary');
  };

  // ─── Add prescription ──
  const addPrescription = () => {
    if (!editingPrescription.medication) return;
    const newRx: PrescriptionItem = {
      id: `RX${Date.now()}`,
      medication: editingPrescription.medication || '',
      dosage: editingPrescription.dosage || '',
      frequency: editingPrescription.frequency || '',
      duration: editingPrescription.duration || '',
      route: editingPrescription.route || 'oral',
      instructions: editingPrescription.instructions,
    };
    setPrescriptions([...prescriptions, newRx]);
    setEditingPrescription({});
    setShowPrescriptionModal(false);
  };

  // ─── Add lab order ──
  const addLabOrder = (testName: string) => {
    if (labOrders.find(l => l.testName === testName)) return;
    setLabOrders([
      ...labOrders,
      { id: `LAB${Date.now()}`, testName, priority: 'routine' },
    ]);
  };

  // ─── Complete consultation ──
  const completeConsultation = async () => {
    if (!selectedPatient) return;

    const encounter: Partial<Encounter> = {
      patientId: selectedPatient.id,
      encounterType,
      status: disposition === 'admitted' ? 'in_progress' : 'completed',
      chiefComplaint,
      // Would include all other data in real implementation
    };

    // Mark pending consultation as completed - remove from waiting list
    try {
      const stored = await AsyncStorage.getItem(HOSPITAL_PENDING_CONSULTATIONS_KEY);
      if (stored) {
        const list: PendingHospitalConsultation[] = JSON.parse(stored);
        const updated = list.map(item =>
          item.patient.id === selectedPatient.id 
            ? { ...item, status: 'completed' as const }
            : item,
        );
        await AsyncStorage.setItem(HOSPITAL_PENDING_CONSULTATIONS_KEY, JSON.stringify(updated));
        // Update displayed queue to remove completed patient from waiting list
        setPendingConsultations(updated.filter(item => item.status === 'waiting'));
      }
    } catch (err) {
      console.error('Error updating pending consultation:', err);
    }

    Alert.alert(
      'Consultation Terminée',
      `La consultation pour ${selectedPatient.firstName} ${selectedPatient.lastName} a été enregistrée.`,
      [
        {
          text: 'OK',
          onPress: () => {
            onComplete?.(encounter);
            // Return to waiting room to see next patient
            setSelectedPatient(null);
            setCurrentStep('patient_identification');
            loadPendingQueue();
          },
        },
      ]
    );
  };

  // ─── Generate consultation notes from recording and form data ──
  const generateConsultationNotes = async () => {
    try {
      let recordingUri = audioUri;

      // Stop recording if still active
      if (isRecording) {
        recordingUri = await stopRecording({ promptForNotes: false });
      }

      // Check if we have audio
      if (!recordingUri) {
        Alert.alert('Enregistrement', 'Aucun enregistrement audio trouvé. Veuillez enregistrer avant de continuer.');
        return;
      }

      // Show loading indicator
      setGeneratingNotes(true);

      // Collect all consultation data
      const consultationData = {
        patientId: selectedPatient?.id,
        patientName: selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : '',
        encounterType,
        chiefComplaint,
        historyOfPresentIllness,
        referredBy,
        vitals,
        physicalExam,
        allergies: selectedPatient?.allergies || [],
        chronicConditions: selectedPatient?.chronicConditions || [],
        currentMedications: selectedPatient?.currentMedications || [],
      };

      // Create FormData with audio file and consultation context
      const formData = new FormData();

      // Convert audio URI to blob
      const response = await fetch(recordingUri);
      const blob = await response.blob();
      formData.append('audio', blob, 'consultation_recording.wav');
      formData.append('consultationContext', JSON.stringify(consultationData));

      // Call API to generate notes
      const api = ApiService.getInstance();
      const result = await api.post('/hospital/transcribe-recording/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (result.success && result.data) {
        const generatedText = result.data.structured_notes || result.data.transcription || '';
        setGeneratedNotes(generatedText);
        setEditedNotes(generatedText);
        setShowNotesModal(true);
      } else {
        Alert.alert('Erreur', result.data?.error || 'Impossible de générer les notes.');
      }
    } catch (err) {
      console.error('[Notes] Error generating notes:', err);
      Alert.alert('Erreur', 'Impossible de générer les notes de consultation.');
    } finally {
      setGeneratingNotes(false);
    }
  };

  // Auto-trigger note generation when entering generate_notes step
  useEffect(() => {
    if (currentStep === 'generate_notes' && !notesGenerationInitiatedRef.current) {
      notesGenerationInitiatedRef.current = true;
      generateConsultationNotes();
    } else if (currentStep !== 'generate_notes') {
      notesGenerationInitiatedRef.current = false;
    }
  }, [currentStep]);

  // ═══════════════════════════════════════════════════════════════
  //  RENDER STEP CONTENT
  // ═══════════════════════════════════════════════════════════════

  const renderStepContent = () => {
    switch (currentStep) {
      case 'patient_identification':
        return renderPatientIdentification();
      case 'visit_reason':
        return renderVisitReason();
      case 'physical_exam':
        return renderPhysicalExam();
      case 'generate_notes':
        return renderGenerateNotes();
      case 'diagnosis':
        return renderDiagnosis();
      case 'treatment_plan':
        return renderTreatmentPlan();
      case 'prescriptions':
        return renderPrescriptions();
      case 'summary':
        return renderSummary();
      default:
        return null;
    }
  };

  // ─── Step 1: Patient Identification ────────────────────────
  const renderPatientIdentification = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Identification du Patient</Text>
      <Text style={styles.stepSubtitle}>
        Recherchez et sélectionnez le patient pour cette consultation
      </Text>

      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Nom, numéro patient, téléphone..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Patient List */}
      <View style={styles.patientList}>
        {filteredPatients.map(patient => {
          const isSelected = selectedPatient?.id === patient.id;
          const age = getAge(patient.dateOfBirth);
          return (
            <TouchableOpacity
              key={patient.id}
              style={[styles.patientCard, isSelected && styles.patientCardSelected]}
              onPress={() => setSelectedPatient(patient)}
              activeOpacity={0.7}
            >
              <View style={styles.patientCardLeft}>
                <View style={[styles.patientAvatar, isSelected && { backgroundColor: ACCENT + '30' }]}>
                  <Text style={[styles.patientAvatarText, isSelected && { color: ACCENT }]}>
                    {patient.firstName[0]}{patient.lastName[0]}
                  </Text>
                </View>
                <View>
                  <Text style={styles.patientName}>
                    {patient.firstName} {patient.lastName}
                  </Text>
                  <Text style={styles.patientMeta}>
                    {patient.patientNumber} • {age} ans • {patient.gender === 'male' ? 'M' : 'F'}
                  </Text>
                </View>
              </View>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={24} color={ACCENT} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected Patient Details */}
      {selectedPatient && (
        <View style={styles.selectedPatientCard}>
          <Text style={styles.selectedPatientTitle}>Patient sélectionné</Text>
          <View style={styles.selectedPatientInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="person" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>
                {selectedPatient.firstName} {selectedPatient.lastName}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>{getAge(selectedPatient.dateOfBirth)} ans</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>{selectedPatient.phone || '—'}</Text>
            </View>
          </View>

          {/* Allergies Alert */}
          {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
            <View style={styles.alertBox}>
              <Ionicons name="warning" size={18} color={colors.error} />
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>Allergies</Text>
                <Text style={styles.alertText}>{selectedPatient.allergies.join(', ')}</Text>
              </View>
            </View>
          )}

          {/* Chronic Conditions */}
          {selectedPatient.chronicConditions && selectedPatient.chronicConditions.length > 0 && (
            <View style={[styles.alertBox, { backgroundColor: colors.warningLight }]}>
              <Ionicons name="heart" size={18} color={colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertTitle, { color: colors.warning }]}>Conditions Chroniques</Text>
                <Text style={styles.alertText}>{selectedPatient.chronicConditions.join(', ')}</Text>
              </View>
            </View>
          )}

          {/* Current Medications */}
          {selectedPatient.currentMedications && selectedPatient.currentMedications.length > 0 && (
            <View style={[styles.alertBox, { backgroundColor: colors.infoLight }]}>
              <Ionicons name="medical" size={18} color={colors.info} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertTitle, { color: colors.info }]}>Médicaments Actuels</Text>
                <Text style={styles.alertText}>{selectedPatient.currentMedications.join(', ')}</Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );

  // ─── Step 2: Visit Reason ──────────────────────────────────
  const renderVisitReason = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Motif de Consultation</Text>
      <Text style={styles.stepSubtitle}>
        Décrivez la raison principale de cette visite
      </Text>

      {/* Encounter Type */}
      <Text style={styles.fieldLabel}>Type de Consultation</Text>
      <View style={styles.chipRow}>
        {[
          { key: 'outpatient', label: 'Consultation', icon: 'person' },
          { key: 'emergency', label: 'Urgence', icon: 'flash' },
          { key: 'follow_up', label: 'Suivi', icon: 'refresh' },
          { key: 'inpatient', label: 'Hospitalisation', icon: 'bed' },
        ].map(type => {
          const isSelected = encounterType === type.key;
          return (
            <TouchableOpacity
              key={type.key}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => setEncounterType(type.key as EncounterType)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={type.icon as any}
                size={16}
                color={isSelected ? '#FFF' : colors.textSecondary}
              />
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Chief Complaint */}
      <Text style={styles.fieldLabel}>Plainte Principale *</Text>
      <TextInput
        style={styles.textArea}
        placeholder="Ex: Douleur abdominale depuis 3 jours, fièvre..."
        placeholderTextColor={colors.textSecondary}
        value={chiefComplaint}
        onChangeText={setChiefComplaint}
        multiline
        numberOfLines={3}
      />

      {/* History of Present Illness */}
      <Text style={styles.fieldLabel}>Histoire de la Maladie Actuelle</Text>
      <TextInput
        style={[styles.textArea, { height: 120 }]}
        placeholder="Décrivez l'évolution des symptômes, les facteurs aggravants/soulageants, les traitements essayés..."
        placeholderTextColor={colors.textSecondary}
        value={historyOfPresentIllness}
        onChangeText={setHistoryOfPresentIllness}
        multiline
        numberOfLines={5}
      />

      {/* Referred By */}
      <Text style={styles.fieldLabel}>Référé par</Text>
      <TextInput
        style={styles.input}
        placeholder="Nom du médecin ou établissement référent"
        placeholderTextColor={colors.textSecondary}
        value={referredBy}
        onChangeText={setReferredBy}
      />
    </View>
  );

  // ─── Step 3: Physical Exam ─────────────────────────────────
  const renderPhysicalExam = () => {
    const systems = [
      { key: 'generalAppearance', label: 'Apparence Générale', icon: 'body' },
      { key: 'heent', label: 'Tête, Yeux, Oreilles, Nez, Gorge', icon: 'eye' },
      { key: 'cardiovascular', label: 'Cardiovasculaire', icon: 'heart' },
      { key: 'respiratory', label: 'Respiratoire', icon: 'fitness' },
      { key: 'abdomen', label: 'Abdomen', icon: 'ellipse' },
      { key: 'musculoskeletal', label: 'Musculo-squelettique', icon: 'accessibility' },
      { key: 'neurological', label: 'Neurologique', icon: 'flash' },
      { key: 'skin', label: 'Peau', icon: 'hand-left' },
      { key: 'psychiatric', label: 'Psychiatrique', icon: 'happy' },
    ];

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Examen Physique</Text>
        <Text style={styles.stepSubtitle}>
          Documentez les résultats de l'examen par système
        </Text>

        {systems.map(system => {
          const value = physicalExam[system.key as keyof PhysicalExamination];
          const notes = physicalExam[(system.key + 'Notes') as keyof PhysicalExamination];

          return (
            <View key={system.key} style={styles.examSection}>
              <View style={styles.examHeader}>
                <Ionicons name={system.icon as any} size={20} color={ACCENT} />
                <Text style={styles.examLabel}>{system.label}</Text>
              </View>

              <View style={styles.examOptions}>
                {[
                  { key: 'normal', label: 'Normal', color: colors.success },
                  { key: 'abnormal', label: 'Anormal', color: colors.error },
                  { key: 'not_examined', label: 'Non examiné', color: colors.textSecondary },
                ].map(option => {
                  const isSelected = value === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.examOption,
                        isSelected && { backgroundColor: option.color + '20', borderColor: option.color },
                      ]}
                      onPress={() =>
                        setPhysicalExam({ ...physicalExam, [system.key]: option.key })
                      }
                    >
                      <Text
                        style={[
                          styles.examOptionText,
                          isSelected && { color: option.color, fontWeight: '600' },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {value === 'abnormal' && (
                <TextInput
                  style={styles.examNotes}
                  placeholder="Décrivez les anomalies..."
                  placeholderTextColor={colors.textSecondary}
                  value={(notes as string) || ''}
                  onChangeText={text =>
                    setPhysicalExam({ ...physicalExam, [system.key + 'Notes']: text })
                  }
                  multiline
                />
              )}
            </View>
          );
        })}

        {/* Custom Exam Types */}
        {customExamTypes.length > 0 && (
          <View style={styles.customExamsSection}>
            <Text style={styles.customExamsTitle}>Examens Personnalisés</Text>
            {customExamTypes.map(examType => {
              const examKey = `custom_${examType}`;
              const value = (physicalExam as any)[examKey] || 'not_examined';
              const notes = `${examKey}_Notes`;

              return (
                <View key={examType} style={styles.examSection}>
                  <View style={styles.examHeader}>
                    <Ionicons name="add-circle-outline" size={20} color={ACCENT} />
                    <Text style={styles.examLabel}>{examType}</Text>
                  </View>

                  <View style={styles.examOptions}>
                    {[
                      { key: 'normal', label: 'Normal', color: colors.success },
                      { key: 'abnormal', label: 'Anormal', color: colors.error },
                      { key: 'not_examined', label: 'Non examiné', color: colors.textSecondary },
                    ].map(option => {
                      const isSelected = value === option.key;
                      return (
                        <TouchableOpacity
                          key={option.key}
                          style={[
                            styles.examOption,
                            isSelected && { backgroundColor: option.color + '20', borderColor: option.color },
                          ]}
                          onPress={() =>
                            setPhysicalExam({ ...physicalExam, [examKey]: option.key })
                          }
                        >
                          <Text
                            style={[
                              styles.examOptionText,
                              isSelected && { color: option.color, fontWeight: '600' },
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {value === 'abnormal' && (
                    <TextInput
                      style={styles.examNotes}
                      placeholder="Décrivez les anomalies..."
                      placeholderTextColor={colors.textSecondary}
                      value={(physicalExam as any)[notes] || ''}
                      onChangeText={text =>
                        setPhysicalExam({ ...physicalExam, [notes]: text })
                      }
                      multiline
                    />
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Add Custom Exam Button */}
        <TouchableOpacity
          style={styles.addCustomExamButton}
          onPress={() => setShowAddExamModal(true)}
        >
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.addCustomExamButtonText}>Ajouter Type d'Examen</Text>
        </TouchableOpacity>

        {/* Add Custom Exam Modal */}
        <Modal visible={showAddExamModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Ajouter Type d'Examen</Text>
                <TouchableOpacity onPress={() => setShowAddExamModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <Text style={styles.fieldLabel}>Nom de l'examen *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Réflexe palpébral, Mobilité..."
                  placeholderTextColor={colors.textSecondary}
                  value={newExamName}
                  onChangeText={setNewExamName}
                />
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSecondary]}
                  onPress={() => setShowAddExamModal(false)}
                >
                  <Text style={styles.modalButtonSecondaryText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={() => {
                    if (newExamName.trim() && !customExamTypes.includes(newExamName.trim())) {
                      setCustomExamTypes([...customExamTypes, newExamName.trim()]);
                      setNewExamName('');
                      setShowAddExamModal(false);
                    }
                  }}
                >
                  <Text style={styles.modalButtonPrimaryText}>Ajouter</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  // ─── Step 4: Generate Notes ────────────────────────────────
  const renderGenerateNotes = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Générer Notes de Consultation</Text>
      <Text style={styles.stepSubtitle}>
        Les notes sont générées par IA à partir de votre enregistrement audio
      </Text>

      {generatingNotes ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={ACCENT} style={{ marginBottom: 16 }} />
          <Text style={styles.loadingText}>Analyse en cours...</Text>
          <Text style={styles.loadingSubtext}>
            Transcription et génération des notes médicales
          </Text>
        </View>
      ) : (
        <View>
          {!showNotesModal && (
            <View style={styles.notesPreview}>
              <View style={styles.notesInfo}>
                <Ionicons name="document-text" size={32} color={ACCENT} />
                <Text style={styles.notesInfoTitle}>Prêt à générer les notes</Text>
                <Text style={styles.notesInfoSubtitle}>
                  Cliquez ci-dessous pour générer les notes à partir de votre enregistrement
                </Text>
              </View>

              <TouchableOpacity
                style={styles.generateButton}
                onPress={generateConsultationNotes}
              >
                <Ionicons name="sparkles" size={20} color="#FFF" />
                <Text style={styles.generateButtonText}>Générer les Notes</Text>
              </TouchableOpacity>
            </View>
          )}

          {showNotesModal && (
            <View style={styles.notesModalContent}>
              <View style={styles.notesHeader}>
                <Text style={styles.notesTitle}>Notes de Consultation - Révision</Text>
                <Text style={styles.notesSubtitle}>Vérifiez et modifiez les notes générées</Text>
              </View>

              <TextInput
                style={styles.notesEditor}
                placeholder="Les notes de consultation apparaîtront ici..."
                placeholderTextColor={colors.textSecondary}
                value={editedNotes}
                onChangeText={setEditedNotes}
                multiline
                scrollEnabled
              />

              <View style={styles.notesActions}>
                <TouchableOpacity
                  style={[styles.notesButton, styles.notesButtonSecondary]}
                  onPress={() => {
                    setEditedNotes(generatedNotes);
                  }}
                >
                  <Ionicons name="refresh" size={18} color={colors.primary} />
                  <Text style={styles.notesButtonSecondaryText}>Réinitialiser</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.notesButton, styles.notesButtonPrimary]}
                  onPress={() => {
                    if (editedNotes.trim()) {
                      setConsultationNotes(editedNotes);
                      setShowNotesModal(false);
                      // Auto-proceed to next step
                      setTimeout(() => {
                        goNext();
                      }, 300);
                    } else {
                      Alert.alert('Erreur', 'Veuillez entrer le contenu des notes');
                    }
                  }}
                >
                  <Ionicons name="checkmark" size={18} color="#FFF" />
                  <Text style={styles.notesButtonPrimaryText}>Valider</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );

  // ─── Step 5: Diagnosis ─────────────────────────────────────
  const renderDiagnosis = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Diagnostic</Text>
      <Text style={styles.stepSubtitle}>
        Ajoutez les diagnostics (principal et secondaires)
      </Text>

      {/* Existing Diagnoses */}
      {diagnoses.length > 0 && (
        <View style={styles.diagnosisList}>
          {diagnoses.map((dx, idx) => (
            <View key={idx} style={styles.diagnosisCard}>
              <View style={styles.diagnosisCardLeft}>
                <View
                  style={[
                    styles.diagnosisTypeBadge,
                    {
                      backgroundColor:
                        dx.type === 'primary'
                          ? colors.primary + '20'
                          : dx.type === 'secondary'
                          ? colors.info + '20'
                          : colors.warning + '20',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.diagnosisTypeText,
                      {
                        color:
                          dx.type === 'primary'
                            ? colors.primary
                            : dx.type === 'secondary'
                            ? colors.info
                            : colors.warning,
                      },
                    ]}
                  >
                    {dx.type === 'primary' ? 'Principal' : dx.type === 'secondary' ? 'Secondaire' : 'Différentiel'}
                  </Text>
                </View>
                <Text style={styles.diagnosisDesc}>{dx.description}</Text>
                {dx.code && <Text style={styles.diagnosisCode}>Code: {dx.code}</Text>}
              </View>
              <TouchableOpacity
                onPress={() => setDiagnoses(diagnoses.filter((_, i) => i !== idx))}
              >
                <Ionicons name="close-circle" size={22} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Add New Diagnosis */}
      <View style={styles.addDiagnosisCard}>
        <Text style={styles.addDiagnosisTitle}>Ajouter un Diagnostic</Text>

        <Text style={styles.fieldLabel}>Type</Text>
        <View style={styles.chipRow}>
          {[
            { key: 'primary', label: 'Principal' },
            { key: 'secondary', label: 'Secondaire' },
            { key: 'differential', label: 'Différentiel' },
          ].map(type => {
            const isSelected = newDiagnosisType === type.key;
            return (
              <TouchableOpacity
                key={type.key}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => setNewDiagnosisType(type.key as any)}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>Code CIM-10 (optionnel)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: J18.9"
          placeholderTextColor={colors.textSecondary}
          value={newDiagnosisCode}
          onChangeText={setNewDiagnosisCode}
        />

        <Text style={styles.fieldLabel}>Description *</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Ex: Pneumonie communautaire"
          placeholderTextColor={colors.textSecondary}
          value={newDiagnosisDesc}
          onChangeText={setNewDiagnosisDesc}
          multiline
        />

        <TouchableOpacity
          style={[styles.addButton, !newDiagnosisDesc.trim() && styles.addButtonDisabled]}
          onPress={addDiagnosis}
          disabled={!newDiagnosisDesc.trim()}
        >
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.addButtonText}>Ajouter Diagnostic</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ─── Step 6: Treatment Plan ────────────────────────────────
  const renderTreatmentPlan = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Plan de Traitement</Text>
      <Text style={styles.stepSubtitle}>
        Définissez le plan de soins et les examens complémentaires
      </Text>

      {/* Treatment Notes */}
      <Text style={styles.fieldLabel}>Notes de Traitement</Text>
      <TextInput
        style={[styles.textArea, { height: 100 }]}
        placeholder="Décrivez le plan de traitement..."
        placeholderTextColor={colors.textSecondary}
        value={treatmentNotes}
        onChangeText={setTreatmentNotes}
        multiline
      />

      {/* Lab Orders */}
      <Text style={styles.fieldLabel}>Examens de Laboratoire</Text>
      <View style={styles.labOrdersGrid}>
        {COMMON_LAB_TESTS.map(test => {
          const isOrdered = labOrders.find(l => l.testName === test);
          return (
            <TouchableOpacity
              key={test}
              style={[styles.labChip, isOrdered && styles.labChipSelected]}
              onPress={() => {
                if (isOrdered) {
                  setLabOrders(labOrders.filter(l => l.testName !== test));
                } else {
                  addLabOrder(test);
                }
              }}
            >
              <Ionicons
                name={isOrdered ? 'checkmark-circle' : 'add-circle-outline'}
                size={16}
                color={isOrdered ? '#FFF' : colors.textSecondary}
              />
              <Text style={[styles.labChipText, isOrdered && { color: '#FFF' }]}>
                {test}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Ordered Labs Summary */}
      {labOrders.length > 0 && (
        <View style={styles.orderedLabsCard}>
          <Text style={styles.orderedLabsTitle}>
            Examens commandés ({labOrders.length})
          </Text>
          {labOrders.map(lab => (
            <View key={lab.id} style={styles.orderedLabItem}>
              <Text style={styles.orderedLabText}>{lab.testName}</Text>
              <TouchableOpacity
                onPress={() => setLabOrders(labOrders.filter(l => l.id !== lab.id))}
              >
                <Ionicons name="close" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Follow-up */}
      <View style={styles.followUpSection}>
        <TouchableOpacity
          style={styles.followUpToggle}
          onPress={() => setFollowUpNeeded(!followUpNeeded)}
        >
          <Ionicons
            name={followUpNeeded ? 'checkbox' : 'square-outline'}
            size={22}
            color={followUpNeeded ? ACCENT : colors.textSecondary}
          />
          <Text style={styles.followUpLabel}>Suivi nécessaire</Text>
        </TouchableOpacity>

        {followUpNeeded && (
          <View style={styles.followUpDetails}>
            <Text style={styles.fieldLabel}>Date de suivi</Text>
            <View style={styles.input}>
              <DateInput
                value={followUpDate}
                onChangeText={setFollowUpDate}
                placeholder="JJ/MM/AAAA"
                placeholderTextColor={colors.textSecondary}
                format="fr"
              />
            </View>
            <Text style={styles.fieldLabel}>Notes de suivi</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Instructions pour le suivi..."
              placeholderTextColor={colors.textSecondary}
              value={followUpNotes}
              onChangeText={setFollowUpNotes}
              multiline
            />
          </View>
        )}
      </View>
    </View>
  );

  // ─── Step 7: Prescriptions ─────────────────────────────────
  const renderPrescriptions = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Ordonnances</Text>
      <Text style={styles.stepSubtitle}>
        Ajoutez les médicaments à prescrire
      </Text>

      {/* Existing Prescriptions */}
      {prescriptions.length > 0 && (
        <View style={styles.prescriptionList}>
          {prescriptions.map(rx => (
            <View key={rx.id} style={styles.prescriptionCard}>
              <View style={styles.prescriptionCardLeft}>
                <Text style={styles.prescriptionMed}>{rx.medication}</Text>
                <Text style={styles.prescriptionDetails}>
                  {rx.dosage} • {rx.frequency} • {rx.duration}
                </Text>
                {rx.instructions && (
                  <Text style={styles.prescriptionInstructions}>{rx.instructions}</Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setPrescriptions(prescriptions.filter(p => p.id !== rx.id))}
              >
                <Ionicons name="trash" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Quick Add Medications */}
      <Text style={styles.fieldLabel}>Médicaments Courants</Text>
      <View style={styles.quickMedsGrid}>
        {COMMON_MEDICATIONS.map(med => (
          <TouchableOpacity
            key={med}
            style={styles.quickMedChip}
            onPress={() => {
              setEditingPrescription({ medication: med, route: 'oral' });
              setShowPrescriptionModal(true);
            }}
          >
            <Ionicons name="add" size={14} color={ACCENT} />
            <Text style={styles.quickMedText}>{med}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Add Custom Prescription */}
      <TouchableOpacity
        style={styles.addPrescriptionButton}
        onPress={() => {
          setEditingPrescription({ route: 'oral' });
          setShowPrescriptionModal(true);
        }}
      >
        <Ionicons name="add-circle" size={22} color="#FFF" />
        <Text style={styles.addPrescriptionButtonText}>Ajouter Prescription</Text>
      </TouchableOpacity>

      {/* Prescription Modal */}
      <Modal visible={showPrescriptionModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle Prescription</Text>
              <TouchableOpacity onPress={() => setShowPrescriptionModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.fieldLabel}>Médicament *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nom du médicament"
                placeholderTextColor={colors.textSecondary}
                value={editingPrescription.medication || ''}
                onChangeText={v => setEditingPrescription({ ...editingPrescription, medication: v })}
              />

              <Text style={styles.fieldLabel}>Dosage</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 500mg"
                placeholderTextColor={colors.textSecondary}
                value={editingPrescription.dosage || ''}
                onChangeText={v => setEditingPrescription({ ...editingPrescription, dosage: v })}
              />

              <Text style={styles.fieldLabel}>Fréquence</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 3x/jour"
                placeholderTextColor={colors.textSecondary}
                value={editingPrescription.frequency || ''}
                onChangeText={v => setEditingPrescription({ ...editingPrescription, frequency: v })}
              />

              <Text style={styles.fieldLabel}>Durée</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 7 jours"
                placeholderTextColor={colors.textSecondary}
                value={editingPrescription.duration || ''}
                onChangeText={v => setEditingPrescription({ ...editingPrescription, duration: v })}
              />

              <Text style={styles.fieldLabel}>Voie d'administration</Text>
              <View style={styles.chipRow}>
                {['oral', 'IV', 'IM', 'SC', 'topique'].map(route => {
                  const isSelected = editingPrescription.route === route;
                  return (
                    <TouchableOpacity
                      key={route}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => setEditingPrescription({ ...editingPrescription, route })}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                        {route.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Instructions</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Instructions spéciales..."
                placeholderTextColor={colors.textSecondary}
                value={editingPrescription.instructions || ''}
                onChangeText={v => setEditingPrescription({ ...editingPrescription, instructions: v })}
                multiline
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowPrescriptionModal(false)}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, !editingPrescription.medication && { opacity: 0.5 }]}
                onPress={addPrescription}
                disabled={!editingPrescription.medication}
              >
                <Text style={styles.modalConfirmText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  // ─── Step 8: Summary ───────────────────────────────────────
  const renderSummary = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Résumé de la Consultation</Text>
      <Text style={styles.stepSubtitle}>
        Vérifiez et finalisez la consultation
      </Text>

      {/* Patient Summary */}
      {selectedPatient && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="person" size={20} color={ACCENT} />
            <Text style={styles.summaryTitle}>Patient</Text>
          </View>
          <Text style={styles.summaryText}>
            {selectedPatient.firstName} {selectedPatient.lastName} ({selectedPatient.patientNumber})
          </Text>
          <Text style={styles.summaryMeta}>
            {getAge(selectedPatient.dateOfBirth)} ans • {selectedPatient.gender === 'male' ? 'Masculin' : 'Féminin'}
          </Text>
        </View>
      )}

      {/* Chief Complaint */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Ionicons name="clipboard" size={20} color={ACCENT} />
          <Text style={styles.summaryTitle}>Motif de Consultation</Text>
        </View>
        <Text style={styles.summaryText}>{chiefComplaint || '—'}</Text>
      </View>

      {/* Vital Signs Summary */}
      {(vitals.temperature || vitals.bloodPressureSystolic || vitals.heartRate) && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="pulse" size={20} color={ACCENT} />
            <Text style={styles.summaryTitle}>Signes Vitaux</Text>
          </View>
          <View style={styles.vitalsSummaryGrid}>
            {vitals.temperature && (
              <Text style={styles.vitalsSummaryItem}>T°: {vitals.temperature}°C</Text>
            )}
            {vitals.bloodPressureSystolic && (
              <Text style={styles.vitalsSummaryItem}>
                TA: {vitals.bloodPressureSystolic}/{vitals.bloodPressureDiastolic} mmHg
              </Text>
            )}
            {vitals.heartRate && (
              <Text style={styles.vitalsSummaryItem}>FC: {vitals.heartRate} bpm</Text>
            )}
            {vitals.oxygenSaturation && (
              <Text style={styles.vitalsSummaryItem}>SpO2: {vitals.oxygenSaturation}%</Text>
            )}
          </View>
        </View>
      )}

      {/* Diagnoses Summary */}
      {diagnoses.length > 0 && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="analytics" size={20} color={ACCENT} />
            <Text style={styles.summaryTitle}>Diagnostics ({diagnoses.length})</Text>
          </View>
          {diagnoses.map((dx, idx) => (
            <View key={idx} style={styles.diagnosisSummaryItem}>
              <View
                style={[
                  styles.diagnosisTypeDot,
                  {
                    backgroundColor:
                      dx.type === 'primary' ? colors.primary : dx.type === 'secondary' ? colors.info : colors.warning,
                  },
                ]}
              />
              <Text style={styles.diagnosisSummaryText}>{dx.description}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Prescriptions Summary */}
      {prescriptions.length > 0 && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="medical" size={20} color={ACCENT} />
            <Text style={styles.summaryTitle}>Ordonnances ({prescriptions.length})</Text>
          </View>
          {prescriptions.map(rx => (
            <Text key={rx.id} style={styles.prescriptionSummaryItem}>
              • {rx.medication} {rx.dosage} - {rx.frequency} x {rx.duration}
            </Text>
          ))}
        </View>
      )}

      {/* Lab Orders Summary */}
      {labOrders.length > 0 && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="flask" size={20} color={ACCENT} />
            <Text style={styles.summaryTitle}>Examens Demandés ({labOrders.length})</Text>
          </View>
          {labOrders.map(lab => (
            <Text key={lab.id} style={styles.labSummaryItem}>• {lab.testName}</Text>
          ))}
        </View>
      )}

      {/* Disposition */}
      <Text style={styles.fieldLabel}>Disposition</Text>
      <View style={styles.chipRow}>
        {[
          { key: 'discharged', label: 'Sortie', icon: 'exit' },
          { key: 'admitted', label: 'Hospitalisation', icon: 'bed' },
          { key: 'transferred', label: 'Transfert', icon: 'swap-horizontal' },
          { key: 'observation', label: 'Observation', icon: 'eye' },
        ].map(d => {
          const isSelected = disposition === d.key;
          return (
            <TouchableOpacity
              key={d.key}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => setDisposition(d.key as any)}
            >
              <Ionicons
                name={d.icon as any}
                size={16}
                color={isSelected ? '#FFF' : colors.textSecondary}
              />
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {d.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Final Notes */}
      <Text style={styles.fieldLabel}>Notes Finales</Text>
      <TextInput
        style={[styles.textArea, { height: 100 }]}
        placeholder="Notes additionnelles..."
        placeholderTextColor={colors.textSecondary}
        value={consultationNotes}
        onChangeText={setConsultationNotes}
        multiline
      />

      {/* Complete Button */}
      <TouchableOpacity style={styles.completeButton} onPress={completeConsultation}>
        <Ionicons name="checkmark-circle" size={22} color="#FFF" />
        <Text style={styles.completeButtonText}>Terminer la Consultation</Text>
      </TouchableOpacity>
    </View>
  );

  // ═══════════════════════════════════════════════════════════════
  //  MAIN RENDER
  // ═══════════════════════════════════════════════════════════════

  if (!selectedPatient) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Salle d'attente Consultation</Text>
            <Text style={styles.headerSubtitle}>Patients issus de l'accueil consultation</Text>
          </View>
          <TouchableOpacity style={styles.saveButton} onPress={loadPendingQueue}>
            <Ionicons name="refresh" size={20} color={ACCENT} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.queueBanner}>
            <Ionicons name="people" size={18} color={ACCENT} />
            <Text style={styles.queueBannerText}>
              <Text style={{ fontWeight: '700' }}>{pendingConsultations.length}</Text> patient{pendingConsultations.length > 1 ? 's' : ''} en attente
            </Text>
          </View>

          {loadingQueue ? (
            <View style={styles.queueEmpty}>
              <Text style={styles.queueEmptyText}>Chargement de la file d'attente...</Text>
            </View>
          ) : pendingConsultations.length === 0 ? (
            <View style={styles.queueEmpty}>
              <Ionicons name="time-outline" size={44} color={colors.textSecondary} />
              <Text style={styles.queueEmptyTitle}>Aucun patient en attente</Text>
              <Text style={styles.queueEmptyText}>Passez d'abord par "Accueil Consultation" avant la visite médecin.</Text>
            </View>
          ) : (
            <View style={styles.queueList}>
              {pendingConsultations.map((pending) => (
                <TouchableOpacity
                  key={pending.id}
                  style={styles.queueCard}
                  activeOpacity={0.75}
                  onPress={() => loadPendingConsultation(pending.id)}
                >
                  <View style={styles.queueCardLeft}>
                    <View style={styles.queueAvatar}>
                      <Text style={styles.queueAvatarText}>
                        {pending.patient.firstName?.[0] ?? '?'}{pending.patient.lastName?.[0] ?? '?'}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.queueName}>{pending.patient.firstName} {pending.patient.lastName}</Text>
                      <Text style={styles.queueMeta}>{pending.patient.patientNumber} • {pending.visitReason || 'Motif non renseigné'}</Text>
                    </View>
                  </View>
                  <Ionicons name="play-circle" size={24} color={ACCENT} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => {
            if (selectedPatient) {
              // Going back from consultation to waiting room
              setSelectedPatient(null);
              setCurrentStep('patient_identification');
              loadPendingQueue();
            } else {
              // Going back from waiting room to patients
              onBack?.();
            }
          }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {selectedPatient ? 'Consultation Médicale' : 'Salle d\'attente Consultation'}
          </Text>
          {selectedPatient && (
            <Text style={styles.headerSubtitle}>
              {selectedPatient.firstName} {selectedPatient.lastName}
            </Text>
          )}
          {!selectedPatient && (
            <Text style={styles.headerSubtitle}>
              Patients issus de l'accueil consultation
            </Text>
          )}
        </View>
        <View style={styles.headerRight}>
          {selectedPatient && currentStep === 'visit_reason' && (
            <>
              {console.log('[RecordingUI] Recording controls visible - selectedPatient:', !!selectedPatient, 'currentStep:', currentStep, 'isRecording:', isRecording)}
              <View style={styles.recordingControls}>
              {audioUri && !isRecording && (
                <TouchableOpacity
                  style={styles.recordButton}
                  onPress={() => (isPlaying ? stopPlayback() : playRecording())}
                >
                  <Ionicons
                    name={isPlaying ? 'pause-circle' : 'play-circle'}
                    size={18}
                    color={ACCENT}
                  />
                </TouchableOpacity>
              )}
              <Animated.View
                style={[
                  styles.recordingButton,
                  currentStep === 'visit_reason' && {
                    opacity: glitterAnim.opacity,
                    transform: [{ scale: glitterAnim.scale }],
                  },
                ]}
              >
                <TouchableOpacity
                  style={[styles.iconButton, isRecording && styles.recordingActive]}
                  onPress={() => {
                    console.log('[Recording Button] Clicked - isRecording:', isRecording);
                    if (isRecording) {
                      console.log('[Recording Button] Stopping recording');
                      stopRecording();
                    } else {
                      console.log('[Recording Button] Starting recording');
                      startRecording();
                    }
                  }}
                >
                  <Ionicons
                    name={isRecording ? 'stop-circle' : 'radio-button-on'}
                    size={20}
                    color={isRecording ? colors.error : ACCENT}
                  />
                </TouchableOpacity>
              </Animated.View>
              {isRecording && <Text style={styles.recordingTime}>{formatTime(recordingDuration)}</Text>}
            </View>
            </>
          )}
          <TouchableOpacity style={styles.saveButton}>
            <Ionicons name="save-outline" size={20} color={ACCENT} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress Steps */}
      <View style={styles.stepsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stepsScroll}>
          {STEPS.map((step, idx) => {
            const isActive = idx === currentStepIdx;
            const isCompleted = idx < currentStepIdx;
            return (
              <TouchableOpacity
                key={step.key}
                style={[
                  styles.stepItem,
                  isActive && styles.stepItemActive,
                  isCompleted && styles.stepItemCompleted,
                ]}
                onPress={() => {
                  if (idx <= currentStepIdx || canProceed) {
                    setCurrentStep(step.key);
                  }
                }}
              >
                <View
                  style={[
                    styles.stepIcon,
                    isActive && { backgroundColor: ACCENT },
                    isCompleted && { backgroundColor: colors.success },
                  ]}
                >
                  <Ionicons
                    name={isCompleted ? 'checkmark' : step.icon}
                    size={16}
                    color={isActive || isCompleted ? '#FFF' : colors.textSecondary}
                  />
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    isActive && { color: ACCENT, fontWeight: '600' },
                    isCompleted && { color: colors.success },
                  ]}
                >
                  {step.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {renderStepContent()}
      </ScrollView>

      {/* Footer Navigation */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerButton, styles.footerButtonSecondary]}
          onPress={goPrev}
          disabled={currentStepIdx === 0}
        >
          <Ionicons name="arrow-back" size={18} color={currentStepIdx === 0 ? colors.textSecondary : ACCENT} />
          <Text style={[styles.footerButtonText, { color: currentStepIdx === 0 ? colors.textSecondary : ACCENT }]}>
            Précédent
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerProgress}>
          {currentStepIdx + 1} / {STEPS.length}
        </Text>

        {currentStepIdx < STEPS.length - 1 ? (
          <TouchableOpacity
            style={[styles.footerButton, styles.footerButtonPrimary, !canProceed && { opacity: 0.5 }]}
            onPress={goNext}
            disabled={!canProceed}
          >
            <Text style={styles.footerButtonTextPrimary}>Suivant</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 120 }} />
        )}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  saveButton: {
    padding: 8,
    backgroundColor: ACCENT + '15',
    borderRadius: borderRadius.md,
  },
  recordingButton: {
    padding: 8,
  },
  recordingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordButton: {
    padding: 8,
  },
  recordingTime: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
    minWidth: 35,
  },
  iconButton: {
    padding: 8,
    borderRadius: borderRadius.md,
  },
  recordingActive: {
    backgroundColor: colors.error + '15',
  },

  // Steps
  stepsContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  stepsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceVariant,
    marginRight: 8,
  },
  stepItemActive: {
    backgroundColor: ACCENT + '15',
  },
  stepItemCompleted: {
    backgroundColor: colors.successLight,
  },
  stepIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: isDesktop ? 32 : 16,
    paddingBottom: 100,
  },
  queueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ACCENT + '12',
    borderWidth: 1,
    borderColor: ACCENT + '35',
    borderRadius: borderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  queueBannerText: {
    fontSize: 13,
    color: colors.text,
  },
  queueEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 34,
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  queueEmptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  queueEmptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  queueList: {
    gap: 10,
  },
  queueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: 12,
  },
  queueCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  queueAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: ACCENT + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: ACCENT,
  },
  queueName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  queueMeta: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },
  stepContent: {},
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },

  // Search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.outline,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },

  // Patient List
  patientList: {
    gap: 10,
    marginBottom: 20,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  patientCardSelected: {
    borderColor: ACCENT,
    backgroundColor: ACCENT + '08',
  },
  patientCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  patientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  patientMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Selected Patient Card
  selectedPatientCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: ACCENT,
    marginTop: 16,
  },
  selectedPatientTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: ACCENT,
    marginBottom: 12,
  },
  selectedPatientInfo: {
    gap: 8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.md,
    padding: 12,
    marginTop: 10,
  },
  alertTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
  },
  alertText: {
    fontSize: 13,
    color: colors.text,
    marginTop: 2,
  },

  // Form Fields
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  textArea: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.outline,
    height: 80,
    textAlignVertical: 'top',
  },

  // Chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  chipSelected: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  chipText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },

  // Physical Exam
  examSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  examHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  examLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  examOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  examOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
  },
  examOptionText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  examNotes: {
    marginTop: 10,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.text,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  
  // Custom Exam Types
  customExamsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  customExamsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: ACCENT,
    marginBottom: 12,
  },
  addCustomExamButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: borderRadius.lg,
    paddingVertical: 12,
    marginTop: 16,
  },
  addCustomExamButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },

  // Diagnosis
  diagnosisList: {
    gap: 10,
    marginBottom: 20,
  },
  diagnosisCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  diagnosisCardLeft: {
    flex: 1,
  },
  diagnosisTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    marginBottom: 6,
  },
  diagnosisTypeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  diagnosisDesc: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  diagnosisCode: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  addDiagnosisCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  addDiagnosisTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    marginTop: 16,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },

  // Treatment Plan
  labOrdersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  labChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  labChipSelected: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  labChipText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  orderedLabsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: ACCENT,
  },
  orderedLabsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: ACCENT,
    marginBottom: 10,
  },
  orderedLabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  orderedLabText: {
    fontSize: 13,
    color: colors.text,
  },
  followUpSection: {
    marginTop: 20,
  },
  followUpToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  followUpLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  followUpDetails: {
    marginTop: 16,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.outline,
  },

  // Prescriptions
  prescriptionList: {
    gap: 10,
    marginBottom: 20,
  },
  prescriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  prescriptionCardLeft: {
    flex: 1,
  },
  prescriptionMed: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  prescriptionDetails: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  prescriptionInstructions: {
    fontSize: 11,
    color: colors.info,
    fontStyle: 'italic',
    marginTop: 4,
  },
  quickMedsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickMedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    backgroundColor: ACCENT + '10',
    borderWidth: 1,
    borderColor: ACCENT + '30',
  },
  quickMedText: {
    fontSize: 11,
    color: ACCENT,
  },
  addPrescriptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    marginTop: 20,
  },
  addPrescriptionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: isDesktop ? 500 : '100%',
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalBody: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    backgroundColor: ACCENT,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },

  // Summary
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: ACCENT,
  },
  summaryText: {
    fontSize: 14,
    color: colors.text,
  },
  summaryMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  vitalsSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  vitalsSummaryItem: {
    fontSize: 13,
    color: colors.text,
  },
  diagnosisSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  diagnosisTypeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  diagnosisSummaryText: {
    fontSize: 13,
    color: colors.text,
  },
  prescriptionSummaryItem: {
    fontSize: 13,
    color: colors.text,
    paddingVertical: 2,
  },
  labSummaryItem: {
    fontSize: 13,
    color: colors.text,
    paddingVertical: 2,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.success,
    borderRadius: borderRadius.md,
    paddingVertical: 16,
    marginTop: 24,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    minWidth: 120,
    justifyContent: 'center',
  },
  footerButtonSecondary: {
    backgroundColor: colors.surfaceVariant,
  },
  footerButtonPrimary: {
    backgroundColor: ACCENT,
  },
  footerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footerButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  footerProgress: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // ─── Notes Styles ─
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.lg,
  },
  loadingSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  notesPreview: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  notesInfo: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  notesInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
  },
  notesInfoSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  notesModalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
  },
  notesHeader: {
    marginBottom: spacing.lg,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  notesSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  notesEditor: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 13,
    color: colors.text,
    minHeight: 300,
    maxHeight: 400,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
  },
  notesActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  notesButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  notesButtonSecondary: {
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesButtonSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  notesButtonPrimary: {
    backgroundColor: ACCENT,
  },
  notesButtonPrimaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default HospitalConsultationScreen;
