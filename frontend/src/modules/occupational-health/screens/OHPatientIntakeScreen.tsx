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
  ActivityIndicator,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store/store';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import {
  SECTOR_PROFILES,
  OccHealthUtils,
  type OccupationalHealthPatient,
  type IndustrySector,
  type ExamType,
  type VitalSigns,
} from '../../../models/OccupationalHealth';
import { occHealthApi } from '../../../services/OccHealthApiService';
import { OccHealthProtocolService } from '../../../services/OccHealthProtocolService';
import { useSimpleToast } from '../../../hooks/useSimpleToast';
import { SimpleToastNotification } from '../../../components/SimpleToastNotification';
import {
  EXAM_CATEGORY_COLORS,
  EXAM_CATEGORY_LABELS,
  EXAM_CATEGORY_ICONS,
  type ProtocolQueryResult,
} from '../../../models/OccHealthProtocol';

// ─── Constants ───────────────────────────────────────────────
const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const ACCENT = colors.primary;
export const PENDING_CONSULTATIONS_KEY = '@occ_pending_consultations';

function safeParsePendingConsultations(raw: string | null): PendingConsultation[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function upsertPendingConsultationQueue(
  queue: PendingConsultation[],
  nextItem: PendingConsultation,
): PendingConsultation[] {
  // Keep only one active intake entry per patient in waiting/in_consultation.
  const activeStatuses: PendingConsultation['status'][] = ['waiting', 'in_consultation'];
  const existingIndex = queue.findIndex(
    item =>
      item.patient?.id === nextItem.patient?.id &&
      activeStatuses.includes(item.status),
  );

  if (existingIndex >= 0) {
    const updated = [...queue];
    // Refresh latest triage details while keeping the same queue id for stability.
    updated[existingIndex] = {
      ...updated[existingIndex],
      ...nextItem,
      id: updated[existingIndex].id,
      status: 'waiting',
    };
    return updated;
  }

  return [...queue, nextItem];
}

// ─── Types ───────────────────────────────────────────────────
export interface PendingConsultation {
  id: string;
  patient: OccupationalHealthPatient;
  examType: ExamType;
  visitReason: string;
  referredBy: string;
  vitals: VitalSigns;
  arrivalTime: string;
  status: 'waiting' | 'in_consultation' | 'completed';
  assignedDoctor?: { id: string; name: string; email?: string };  // NEW: Assigned doctor
  resumeDraftId?: string;  // Linked draft for resuming consultation
  resumeStatus?: string;   // Status of the resumed draft
  resumeStep?: string;     // Step to resume from
}

type IntakeStep = 'patient_search' | 'visit_motif' | 'vital_signs';

const INTAKE_STEPS: { key: IntakeStep; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'patient_search', label: 'Patient', icon: 'search' },
  { key: 'visit_motif', label: 'Motif', icon: 'clipboard' },
  { key: 'vital_signs', label: 'Signes Vitaux', icon: 'pulse' },
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

// ─── Sub-component: VitalField ───────────────────────────────
function VitalField({
  label, value, placeholder, onChange, icon, unit, alert, isText,
}: {
  label: string; value: string; placeholder: string;
  onChange: (v: string) => void; icon: string; unit?: string;
  alert?: boolean; isText?: boolean;
}) {
  return (
    <View style={vStyles.vitalCard}>
      <View style={vStyles.vitalHeader}>
        <Ionicons name={icon as any} size={14} color={alert ? colors.error : ACCENT} />
        <Text style={[vStyles.vitalLabel, alert && { color: colors.error }]}>{label}</Text>
      </View>
      <View style={[vStyles.vitalInputRow, alert && { borderColor: colors.error }]}>
        <TextInput
          style={vStyles.vitalInput}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          keyboardType={isText ? 'default' : 'numeric'}
        />
        {unit && <Text style={vStyles.vitalUnit}>{unit}</Text>}
      </View>
    </View>
  );
}

// ─── Sub-component: StepHeader ───────────────────────────────
function StepHeader({ title, subtitle, icon }: { title: string; subtitle: string; icon: string }) {
  return (
    <View style={vStyles.stepHeader}>
      <View style={vStyles.stepIconBox}>
        <Ionicons name={icon as any} size={22} color={ACCENT} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={vStyles.stepTitle}>{title}</Text>
        <Text style={vStyles.stepSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────
export function OHPatientIntakeScreen({
  onConsultationQueued,
  onNavigateToConsultation,
}: {
  onConsultationQueued?: () => void;
  onNavigateToConsultation?: (pendingId?: string) => void;
}): React.JSX.Element {
  const authUser = useSelector((state: RootState) => state.auth.user);
  const { toastMsg, showToast } = useSimpleToast();
  const [currentStep, setCurrentStep] = useState<IntakeStep>('patient_search');
  const currentStepIdx = INTAKE_STEPS.findIndex(s => s.key === currentStep);

  // Patient selection
  const [patients, setPatients] = useState<OccupationalHealthPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<OccupationalHealthPatient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'sector' | 'company' | 'created'>('name_asc');
  const [filterSector, setFilterSector] = useState<IndustrySector | 'all'>('all');
  const [filterRisk, setFilterRisk] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');

  // Visit motif
  const [examType, setExamType] = useState<ExamType>('periodic');
  const [visitReason, setVisitReason] = useState('');
  const [referredBy, setReferredBy] = useState('');

  // Vital signs
  const [vitals, setVitals] = useState<VitalSigns>({});

  // Protocol
  const [protocolResult, setProtocolResult] = useState<ProtocolQueryResult | null>(null);

  // Submitting
  const [submitting, setSubmitting] = useState(false);

  // Doctor assignment (NEW)
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [doctors, setDoctors] = useState<{ id: string; name: string; email?: string }[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<{ id: string; name: string; email?: string } | null>(null);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [doctorSearch, setDoctorSearch] = useState('');

  // Load patients and bootstrap protocol data from API
  useEffect(() => {
    const load = async () => {
      setLoadingPatients(true);
      try {
        const svc = OccHealthProtocolService.getInstance();
        if (!svc.isLoadedFromApi) {
          await svc.loadFromApi();
        }
        const { data, error } = await occHealthApi.listWorkers();
        if (!error && data.length > 0) {
          setPatients(data);
        } else {
          // Fallback: try stored data from AsyncStorage
          const stored = await AsyncStorage.getItem('@occ_health_patients');
          if (stored) {
            setPatients(JSON.parse(stored) as OccupationalHealthPatient[]);
          }
        }
      } catch (e) {
        console.error('Failed to load patients for intake:', e);
      } finally {
        setLoadingPatients(false);
      }
    };
    load();
  }, []);

  // Filtered patients
  const filteredPatients = useMemo(() => {
    let result = [...patients];
    
    // Apply text search
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(p =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.employeeId?.toLowerCase().includes(q) ||
        p.company?.toLowerCase().includes(q) ||
        p.jobTitle?.toLowerCase().includes(q) ||
        p.patientNumber?.toLowerCase().includes(q),
      );
    }
    
    // Apply sector filter
    if (filterSector !== 'all') {
      result = result.filter(p => p.sector === filterSector);
    }
    
    // Apply risk filter
    if (filterRisk !== 'all') {
      result = result.filter(p => p.riskLevel === filterRisk);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        case 'name_desc':
          return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`);
        case 'sector':
          return (a.sector || '').localeCompare(b.sector || '');
        case 'company':
          return (a.company || '').localeCompare(b.company || '');
        case 'created':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        default:
          return 0;
      }
    });
    
    return result;
  }, [patients, searchQuery, filterSector, filterRisk, sortBy]);

  const sectorProfile = useMemo(
    () => selectedPatient ? SECTOR_PROFILES[selectedPatient.sector] : null,
    [selectedPatient],
  );

  // Resolve protocol whenever patient or exam type changes
  useEffect(() => {
    if (!selectedPatient?.positionCode) {
      setProtocolResult(null);
      return;
    }
    const svc = OccHealthProtocolService.getInstance();
    const result = svc.getProtocolForVisit(selectedPatient.positionCode, examType);
    setProtocolResult(result);
  }, [selectedPatient, examType]);

  const bmi = calculateBMI(vitals.weight, vitals.height);
  const bmiCat = getBMICategory(bmi);

  // Navigation
  const canGoNext = (): boolean => {
    if (currentStep === 'patient_search') return !!selectedPatient;
    if (currentStep === 'visit_motif') return !!examType;
    return true;
  };

  const goNext = () => {
    if (!canGoNext()) return;
    const idx = INTAKE_STEPS.findIndex(s => s.key === currentStep);
    if (idx < INTAKE_STEPS.length - 1) setCurrentStep(INTAKE_STEPS[idx + 1].key);
  };

  const goPrev = () => {
    const idx = INTAKE_STEPS.findIndex(s => s.key === currentStep);
    if (idx > 0) setCurrentStep(INTAKE_STEPS[idx - 1].key);
  };

  // Load doctors list (from API + current logged-in user)
  const loadDoctors = useCallback(async () => {
    setLoadingDoctors(true);
    try {
      const api = (await import('../../../services/ApiService')).default.getInstance();
      const response = await api.get('/auth/organization/users/');
      
      let doctorList: { id: string; name: string; email?: string }[] = [];
      
      if (response.success && Array.isArray(response.data)) {
        doctorList = response.data
          .filter((u: any) => u.primary_role === 'doctor' || u.primary_role === 'nurse' || u.is_active !== false)
          .map((u: any) => ({
            id: String(u.id),
            name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || u.email || 'Dr. Inconnu',
            email: u.email,
          }));
      }
      
      // Ensure current logged-in user is always in the list (as first option)
      if (authUser?.id) {
        const currentUserEntry = {
          id: String(authUser.id),
          name: `${authUser.firstName || ''} ${authUser.lastName || ''}`.trim() || 'Moi (Connecté)',
          email: authUser.email,
        };
        // Remove duplicate if already in list
        doctorList = doctorList.filter(d => d.id !== String(authUser.id));
        doctorList.unshift(currentUserEntry);
      }
      
      if (doctorList.length === 0) {
        // Fallback mock data if API returns nothing
        doctorList = [
          { id: 'doc_1', name: 'Dr. Jean Mbeki', email: 'jean@hospital.com' },
          { id: 'doc_2', name: 'Dr. Marie Dupont', email: 'marie@hospital.com' },
        ];
      }
      
      setDoctors(doctorList);
    } catch (err) {
      console.error('Error loading doctors:', err);
      // Fallback
      setDoctors([
        { id: 'doc_1', name: 'Dr. Jean Mbeki', email: 'jean@hospital.com' },
        { id: 'doc_2', name: 'Dr. Marie Dupont', email: 'marie@hospital.com' },
      ]);
    } finally {
      setLoadingDoctors(false);
    }
  }, [authUser]);

  // Filtered doctors
  const filteredDoctors = useMemo(() => {
    const q = doctorSearch.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.email?.toLowerCase().includes(q)
    );
  }, [doctors, doctorSearch]);

  // Show doctor assignment modal after vitals saved (NEW)
  const handleVitalsComplete = useCallback(async () => {
    if (!selectedPatient) return;
    
    // Load doctors if not already loaded
    if (doctors.length === 0) {
      await loadDoctors();
    }
    
    setShowDoctorModal(true);
  }, [selectedPatient, doctors, loadDoctors]);

  // Save consultation with optional doctor assignment
  const handleSaveConsultation = useCallback(async (withDoctor: boolean = true) => {
    if (!selectedPatient || submitting) return;
    if (withDoctor && !selectedDoctor) return;
    
    setSubmitting(true);
    try {
      const pending: PendingConsultation = {
        id: `intake_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        patient: selectedPatient,
        examType,
        visitReason: visitReason.trim(),
        referredBy: referredBy.trim(),
        vitals,
        arrivalTime: new Date().toISOString(),
        status: 'waiting',
        assignedDoctor: selectedDoctor || undefined,  // Optional doctor assignment
      };

      // Load existing list
      const stored = await AsyncStorage.getItem(PENDING_CONSULTATIONS_KEY);
      const list = upsertPendingConsultationQueue(
        safeParsePendingConsultations(stored),
        pending
      );
      await AsyncStorage.setItem(PENDING_CONSULTATIONS_KEY, JSON.stringify(list));

      // SYNC TO BACKEND: Save medical examination to database
      try {
        // Extract numeric IDs safely
        let workerId = 0;
        if (selectedPatient.id) {
          const parsed = parseInt(String(selectedPatient.id));
          if (Number.isFinite(parsed) && parsed > 0) {
            workerId = parsed;
          }
        }
        // Fallback to employee ID if available
        if (!workerId && selectedPatient.employeeId) {
          const parsed = parseInt(String(selectedPatient.employeeId));
          if (Number.isFinite(parsed) && parsed > 0) {
            workerId = parsed;
          }
        }

        // Only sync if we have a valid worker ID
        if (workerId > 0) {
          const examData = {
            worker: workerId,
            exam_type: examType,
            exam_date: new Date().toISOString().split('T')[0],
            examining_doctor: selectedDoctor ? parseInt(String(selectedDoctor.id)) : undefined,
            chief_complaint: visitReason || '',
            medical_history_review: selectedPatient.chronicConditions?.join('; ') || '',
            results_summary: `Vitals: BP ${vitals.bloodPressureSystolic || 'N/A'}/${vitals.bloodPressureDiastolic || 'N/A'}, Temp ${vitals.temperature || 'N/A'}°C`,
            recommendations: referredBy ? `Referred by: ${referredBy}` : '',
            examination_completed: false,
            follow_up_required: false,
          };
          
          await occHealthApi.createMedicalExamination(examData);
        }
      } catch (backendErr) {
        // Non-critical: Log error but don't fail the flow
        console.warn('Could not sync to backend:', backendErr);
      }

      // Reset form for next patient
      setCurrentStep('patient_search');
      setSelectedPatient(null);
      setSearchQuery('');
      setExamType('periodic');
      setVisitReason('');
      setReferredBy('');
      setVitals({});
      setSelectedDoctor(null);
      setShowDoctorModal(false);

      // Success message
      const doctorMsg = selectedDoctor ? ` - Assigné à ${selectedDoctor.name}` : ' - En attente d\'assignation';
      Alert.alert(
        '✅ Patient Enregistré',
        `${selectedPatient.firstName} ${selectedPatient.lastName}${doctorMsg}\n\nAccueil Suivant`,
        [{ text: 'OK', onPress: () => onConsultationQueued?.() }],
      );
    } catch (err) {
      console.error('Error saving consultation:', err);
      showToast('Impossible d\'enregistrer le patient. Réessayez.', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [selectedPatient, selectedDoctor, examType, visitReason, referredBy, vitals, submitting, onConsultationQueued]);

  // Save pending consultation - triggers doctor modal
  const handleSave = useCallback(async () => {
    if (!selectedPatient || submitting) return;
    // Trigger doctor assignment modal
    await handleVitalsComplete();
  }, [selectedPatient, submitting, handleVitalsComplete]);

  const handleAutoFillNormalVitals = useCallback(() => {
    setVitals({
      temperature: 36.7,
      bloodPressureSystolic: 120,
      bloodPressureDiastolic: 80,
      heartRate: 72,
      respiratoryRate: 16,
      oxygenSaturation: 98,
      weight: 70,
      height: 170,
      waistCircumference: 85,
      visualAcuity: '10/10',
    });
  }, []);

  // ─── Step Renderers ──────────────────────────────────────

  const renderPatientSearch = () => (
    <View>
      <StepHeader
        title="Sélection du Patient"
        subtitle="Recherchez le travailleur dans le registre des patients."
        icon="search"
      />

      {/* Search box */}
      <View style={vStyles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={vStyles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Nom, matricule, entreprise, poste..."
          placeholderTextColor={colors.placeholder}
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => setShowFilterPanel(!showFilterPanel)}>
          <Ionicons 
            name={showFilterPanel ? "funnel" : "funnel-outline"} 
            size={18} 
            color={showFilterPanel || filterSector !== 'all' || filterRisk !== 'all' ? ACCENT : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Filter panel */}
      {showFilterPanel && (
        <View style={[vStyles.filterPanel, { borderColor: colors.outline }]}>
          {/* Sector filter */}
          <View style={vStyles.filterSection}>
            <Text style={vStyles.filterLabel}>Secteur</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <TouchableOpacity
                onPress={() => setFilterSector('all')}
                style={[
                  vStyles.filterChip,
                  filterSector === 'all' && { backgroundColor: ACCENT, borderColor: ACCENT }
                ]}
              >
                <Text style={[vStyles.filterChipText, filterSector === 'all' && { color: colors.surface }]}>Tous</Text>
              </TouchableOpacity>
              {Object.entries(SECTOR_PROFILES).map(([key, sector]) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setFilterSector(key as IndustrySector)}
                  style={[
                    vStyles.filterChip,
                    filterSector === key && { backgroundColor: sector.color, borderColor: sector.color }
                  ]}
                >
                  <Text style={[vStyles.filterChipText, filterSector === key && { color: colors.surface }]}>
                    {sector.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Risk level filter */}
          <View style={vStyles.filterSection}>
            <Text style={vStyles.filterLabel}>Niveau de Risque</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {['all', 'low', 'medium', 'high', 'critical'].map((risk) => {
                const riskLabel = {
                  all: 'Tous',
                  low: 'Faible',
                  medium: 'Moyen',
                  high: 'Élevé',
                  critical: 'Critique'
                }[risk];
                const riskColor = {
                  all: ACCENT,
                  low: '#10B981',
                  medium: '#F59E0B',
                  high: '#EF4444',
                  critical: '#DC2626'
                }[risk];
                return (
                  <TouchableOpacity
                    key={risk}
                    onPress={() => setFilterRisk(risk as any)}
                    style={[
                      vStyles.filterChip,
                      filterRisk === risk && { backgroundColor: riskColor, borderColor: riskColor }
                    ]}
                  >
                    <Text style={[vStyles.filterChipText, filterRisk === risk && { color: colors.surface }]}>
                      {riskLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Sort order */}
          <View style={vStyles.filterSection}>
            <Text style={vStyles.filterLabel}>Tri</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                { value: 'name_asc', label: 'Nom (A-Z)' },
                { value: 'name_desc', label: 'Nom (Z-A)' },
                { value: 'sector', label: 'Secteur' },
                { value: 'company', label: 'Entreprise' },
                { value: 'created', label: 'Plus récent' }
              ].map((sort) => (
                <TouchableOpacity
                  key={sort.value}
                  onPress={() => setSortBy(sort.value as any)}
                  style={[
                    vStyles.filterChip,
                    sortBy === sort.value && { backgroundColor: ACCENT, borderColor: ACCENT }
                  ]}
                >
                  <Text style={[vStyles.filterChipText, sortBy === sort.value && { color: colors.surface }]}>
                    {sort.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Clear filters button */}
          {(filterSector !== 'all' || filterRisk !== 'all' || sortBy !== 'name_asc' || searchQuery) && (
            <TouchableOpacity
              onPress={() => {
                setFilterSector('all');
                setFilterRisk('all');
                setSortBy('name_asc');
                setSearchQuery('');
              }}
              style={vStyles.clearButton}
            >
              <Ionicons name="refresh" size={16} color={colors.error} />
              <Text style={{ color: colors.error, fontWeight: '600', fontSize: 13 }}>Réinitialiser les filtres</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Currently selected patient — compact card */}
      {selectedPatient && (
        <View style={[vStyles.selectedPatientCard, { borderColor: sectorProfile?.color || ACCENT }]}>
          <View style={[vStyles.selectedAvatar, { backgroundColor: (sectorProfile?.color || ACCENT) + '18' }]}>
            <Text style={[vStyles.selectedAvatarText, { color: sectorProfile?.color || ACCENT }]}>
              {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={vStyles.selectedName}>{selectedPatient.firstName} {selectedPatient.lastName}</Text>
            <Text style={vStyles.selectedMeta}>{selectedPatient.employeeId} · {selectedPatient.company}</Text>
            <Text style={vStyles.selectedMeta}>{selectedPatient.jobTitle} · {sectorProfile?.label}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <View style={[vStyles.fitnessChip, { backgroundColor: OccHealthUtils.getFitnessStatusColor(selectedPatient.fitnessStatus) + '18' }]}>
              <Text style={[vStyles.fitnessChipText, { color: OccHealthUtils.getFitnessStatusColor(selectedPatient.fitnessStatus) }]}>
                {OccHealthUtils.getFitnessStatusLabel(selectedPatient.fitnessStatus)}
              </Text>
            </View>
            <TouchableOpacity onPress={() => { setSelectedPatient(null); setSearchQuery(''); }}>
              <Text style={{ fontSize: 11, color: ACCENT, fontWeight: '600' }}>Changer ›</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Patient list */}
      {loadingPatients ? (
        <View style={vStyles.loadingBox}>
          <ActivityIndicator size="small" color={ACCENT} />
          <Text style={vStyles.loadingText}>Chargement des patients...</Text>
        </View>
      ) : filteredPatients.length === 0 ? (
        <View style={vStyles.emptyBox}>
          <Ionicons name="people-outline" size={40} color={colors.textSecondary} />
          <Text style={vStyles.emptyText}>
            {searchQuery ? `Aucun patient trouvé pour "${searchQuery}"` : 'Aucun patient enregistré. Créez d\'abord un patient dans "Gestion Patients".'}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 8, marginTop: 12 }}>
          {filteredPatients.map((p) => {
            const sp = SECTOR_PROFILES[p.sector];
            const isSelected = selectedPatient?.id === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[vStyles.patientRow, isSelected && { borderColor: sp.color, backgroundColor: sp.color + '06' }]}
                onPress={() => setSelectedPatient(p)}
                activeOpacity={0.7}
              >
                <View style={[vStyles.rowAvatar, { backgroundColor: sp.color + '18' }]}>
                  <Text style={[vStyles.rowAvatarText, { color: sp.color }]}>{p.firstName[0]}{p.lastName[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[vStyles.rowName, isSelected && { color: sp.color }]}>
                    {p.firstName} {p.lastName}
                  </Text>
                  <Text style={vStyles.rowMeta}>{p.employeeId} · {p.company}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Ionicons name={sp.icon as any} size={11} color={sp.color} />
                    <Text style={[vStyles.rowMeta, { color: sp.color }]}>{sp.label}</Text>
                    <Text style={vStyles.rowMeta}>· {p.jobTitle}</Text>
                  </View>
                  {/* Allergies / conditions alert */}
                  {(p.allergies?.length > 0 || p.chronicConditions?.length > 0) && (
                    <View style={vStyles.rowAlert}>
                      <Ionicons name="alert-circle" size={11} color={colors.error} />
                      <Text style={vStyles.rowAlertText}>
                        {p.allergies?.length > 0 ? `Allergie: ${p.allergies.slice(0, 2).join(', ')}` : `Condition: ${p.chronicConditions?.slice(0, 1).join(', ')}`}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <View style={[vStyles.riskDot, { backgroundColor: OccHealthUtils.getSectorRiskColor(p.riskLevel) }]} />
                  {isSelected && <Ionicons name="checkmark-circle" size={20} color={sp.color} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderVisitMotif = () => {
    const examTypes: { type: ExamType; label: string; icon: keyof typeof Ionicons.glyphMap; desc: string }[] = [
      { type: 'pre_employment', label: 'Visite d\'Embauche', icon: 'person-add', desc: 'Nouvel employé — examen initial' },
      { type: 'periodic', label: 'Visite Périodique', icon: 'repeat', desc: 'Surveillance régulière programmée' },
      { type: 'return_to_work', label: 'Visite de Reprise', icon: 'arrow-redo', desc: 'Retour après arrêt maladie ou accident' },
      { type: 'post_incident', label: 'Post-Accident', icon: 'warning', desc: 'Suite à un incident de travail' },
      { type: 'fitness_for_duty', label: 'Aptitude Spécifique', icon: 'shield-checkmark', desc: 'Poste spécial (hauteur, conduite...)' },
      { type: 'exit_medical', label: 'Visite de Sortie', icon: 'exit', desc: 'Fin de contrat / départ' },
      { type: 'night_work', label: 'Travail de Nuit', icon: 'moon', desc: 'Évaluation pour poste de nuit' },
      { type: 'pregnancy_related', label: 'Suivi Grossesse', icon: 'heart', desc: 'Aménagement poste grossesse' },
      { type: 'special_request', label: 'Demande Spéciale', icon: 'help-circle', desc: 'À la demande du travailleur ou employeur' },
    ];

    return (
      <View>
        <StepHeader
          title="Motif de la Visite"
          subtitle={`Type d'examen pour ${selectedPatient?.firstName} ${selectedPatient?.lastName}.`}
          icon="clipboard"
        />

        {/* Patient reminder */}
        {selectedPatient && sectorProfile && (
          <View style={[vStyles.patientReminder, { borderColor: sectorProfile.color + '40' }]}>
            <Ionicons name={sectorProfile.icon as any} size={16} color={sectorProfile.color} />
            <Text style={[vStyles.patientReminderText, { color: sectorProfile.color }]}>
              {selectedPatient.firstName} {selectedPatient.lastName} — {sectorProfile.label} · {selectedPatient.jobTitle}
            </Text>
          </View>
        )}

        {/* Exam types */}
        <View style={{ gap: 8, marginTop: 12 }}>
          {examTypes.map((et) => {
            const isActive = examType === et.type;
            return (
              <TouchableOpacity
                key={et.type}
                style={[vStyles.examTypeCard, isActive && { borderColor: ACCENT, backgroundColor: ACCENT + '08' }]}
                onPress={() => setExamType(et.type)}
                activeOpacity={0.7}
              >
                <View style={[vStyles.examTypeIcon, { backgroundColor: isActive ? ACCENT + '18' : colors.outlineVariant }]}>
                  <Ionicons name={et.icon} size={20} color={isActive ? ACCENT : colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[vStyles.examTypeLabel, isActive && { color: ACCENT }]}>{et.label}</Text>
                  <Text style={vStyles.examTypeDesc}>{et.desc}</Text>
                </View>
                {isActive && <Ionicons name="checkmark-circle" size={22} color={ACCENT} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Protocol Exam Checklist Preview */}
        {protocolResult && protocolResult.hasProtocol && (
          <View style={vStyles.protocolBox}>
            <View style={vStyles.protocolHeader}>
              <Ionicons name="list" size={16} color={ACCENT} />
              <Text style={vStyles.protocolTitle}>
                Examens Requis — {protocolResult.protocol?.visitTypeLabel}
              </Text>
              <View style={vStyles.protocolCountChip}>
                <Text style={vStyles.protocolCountText}>{protocolResult.requiredExams.length} examens</Text>
              </View>
            </View>
            {protocolResult.protocol?.regulatoryNote && (
              <Text style={vStyles.protocolRegNote}>
                <Ionicons name="shield-checkmark" size={11} color={colors.textSecondary} /> {protocolResult.protocol.regulatoryNote}
              </Text>
            )}
            {/* Group by category */}
            {Object.entries(
              protocolResult.requiredExams.reduce<Record<string, typeof protocolResult.requiredExams>>((acc, ex) => {
                if (!acc[ex.category]) acc[ex.category] = [];
                acc[ex.category].push(ex);
                return acc;
              }, {})
            ).map(([cat, exams]) => (
              <View key={cat} style={vStyles.protocolCatGroup}>
                <View style={vStyles.protocolCatHeader}>
                  <View style={[vStyles.protocolCatDot, { backgroundColor: EXAM_CATEGORY_COLORS[cat as keyof typeof EXAM_CATEGORY_COLORS] }]} />
                  <Text style={[vStyles.protocolCatLabel, { color: EXAM_CATEGORY_COLORS[cat as keyof typeof EXAM_CATEGORY_COLORS] }]}>
                    {EXAM_CATEGORY_LABELS[cat as keyof typeof EXAM_CATEGORY_LABELS]}
                  </Text>
                </View>
                {exams.map((ex) => (
                  <View key={ex.code} style={vStyles.protocolExamRow}>
                    <Ionicons name="checkmark-circle-outline" size={14} color={colors.textSecondary} />
                    <Text style={vStyles.protocolExamText}>{ex.label}</Text>
                  </View>
                ))}
              </View>
            ))}
            {protocolResult.recommendedExams.length > 0 && (
              <View style={vStyles.protocolRecBox}>
                <Text style={vStyles.protocolRecTitle}>Recommandés ({protocolResult.recommendedExams.length})</Text>
                <Text style={vStyles.protocolRecList}>
                  {protocolResult.recommendedExams.map((e) => e.label).join(' · ')}
                </Text>
              </View>
            )}
          </View>
        )}
        {selectedPatient && !selectedPatient.positionCode && (
          <View style={vStyles.protocolNoPosition}>
            <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
            <Text style={vStyles.protocolNoPositionText}>
              Aucun code de poste renseigné pour ce patient. Complétez le profil dans "Gestion Patients" pour des examens automatiques.
            </Text>
          </View>
        )}

        {/* Notes */}
        <View style={vStyles.formGroup}>
          <Text style={vStyles.fieldLabel}>Motif détaillé (optionnel)</Text>
          <TextInput
            style={[vStyles.input, vStyles.textArea]}
            value={visitReason}
            onChangeText={setVisitReason}
            placeholder="Détails supplémentaires sur le motif..."
            placeholderTextColor={colors.placeholder}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={vStyles.formGroup}>
          <Text style={vStyles.fieldLabel}>Référé par (optionnel)</Text>
          <TextInput
            style={vStyles.input}
            value={referredBy}
            onChangeText={setReferredBy}
            placeholder="Nom du médecin, chef de service, auto-référé..."
            placeholderTextColor={colors.placeholder}
          />
        </View>
      </View>
    );
  };

  const renderVitalSigns = () => (
    <View>
      <StepHeader
        title="Signes Vitaux"
        subtitle={`Prenez les constantes de ${selectedPatient?.firstName} ${selectedPatient?.lastName}.`}
        icon="pulse"
      />

      <View style={vStyles.quickActionRow}>
        <TouchableOpacity style={vStyles.quickFillBtn} onPress={handleAutoFillNormalVitals} activeOpacity={0.75}>
          <Ionicons name="flash" size={14} color={ACCENT} />
          <Text style={vStyles.quickFillBtnText}>Auto-remplir (aptitude normale)</Text>
        </TouchableOpacity>
      </View>

      {/* Patient + motif reminder */}
      {selectedPatient && sectorProfile && (
        <View style={[vStyles.patientReminder, { borderColor: sectorProfile.color + '40' }]}>
          <Ionicons name="clipboard" size={16} color={ACCENT} style={{ marginRight: 6 }} />
          <Text style={vStyles.patientReminderText}>
            {selectedPatient.firstName} {selectedPatient.lastName} · {OccHealthUtils.getExamTypeLabel(examType)}
          </Text>
        </View>
      )}

      <View style={vStyles.vitalsGrid}>
        <VitalField label="Température (°C)" value={vitals.temperature?.toString() || ''} placeholder="36.5"
          onChange={v => setVitals(p => ({ ...p, temperature: v ? parseFloat(v) : undefined }))}
          icon="thermometer" unit="°C" />
        <VitalField label="TA Systolique" value={vitals.bloodPressureSystolic?.toString() || ''} placeholder="120"
          onChange={v => setVitals(p => ({ ...p, bloodPressureSystolic: v ? parseInt(v) : undefined }))}
          icon="heart" unit="mmHg" alert={!!vitals.bloodPressureSystolic && vitals.bloodPressureSystolic >= 140} />
        <VitalField label="TA Diastolique" value={vitals.bloodPressureDiastolic?.toString() || ''} placeholder="80"
          onChange={v => setVitals(p => ({ ...p, bloodPressureDiastolic: v ? parseInt(v) : undefined }))}
          icon="heart" unit="mmHg" alert={!!vitals.bloodPressureDiastolic && vitals.bloodPressureDiastolic >= 90} />
        <VitalField label="Fréq. Cardiaque" value={vitals.heartRate?.toString() || ''} placeholder="72"
          onChange={v => setVitals(p => ({ ...p, heartRate: v ? parseInt(v) : undefined }))}
          icon="pulse" unit="bpm" />
        <VitalField label="Fréq. Respiratoire" value={vitals.respiratoryRate?.toString() || ''} placeholder="16"
          onChange={v => setVitals(p => ({ ...p, respiratoryRate: v ? parseInt(v) : undefined }))}
          icon="cloud" unit="/min" />
        <VitalField label="SpO2 (%)" value={vitals.oxygenSaturation?.toString() || ''} placeholder="98"
          onChange={v => setVitals(p => ({ ...p, oxygenSaturation: v ? parseInt(v) : undefined }))}
          icon="water" unit="%" alert={!!vitals.oxygenSaturation && vitals.oxygenSaturation < 95} />
        <VitalField label="Poids (kg)" value={vitals.weight?.toString() || ''} placeholder="75"
          onChange={v => setVitals(p => ({ ...p, weight: v ? parseFloat(v) : undefined }))}
          icon="scale" unit="kg" />
        <VitalField label="Taille (cm)" value={vitals.height?.toString() || ''} placeholder="175"
          onChange={v => setVitals(p => ({ ...p, height: v ? parseFloat(v) : undefined }))}
          icon="resize" unit="cm" />
        <VitalField label="Tour de taille" value={vitals.waistCircumference?.toString() || ''} placeholder="85"
          onChange={v => setVitals(p => ({ ...p, waistCircumference: v ? parseFloat(v) : undefined }))}
          icon="ellipse" unit="cm" />
        <VitalField label="Acuité visuelle" value={vitals.visualAcuity || ''} placeholder="10/10"
          onChange={v => setVitals(p => ({ ...p, visualAcuity: v }))}
          icon="eye" isText />
      </View>

      {/* Auto-computed BMI */}
      {!!bmi && (
        <View style={[vStyles.bmiCard, { borderLeftColor: bmiCat.color }]}>
          <View>
            <Text style={vStyles.bmiLabel}>IMC Calculé</Text>
            <Text style={[vStyles.bmiValue, { color: bmiCat.color }]}>{bmi}</Text>
          </View>
          <View style={[vStyles.bmiChip, { backgroundColor: bmiCat.color + '14' }]}>
            <Text style={[vStyles.bmiChipText, { color: bmiCat.color }]}>{bmiCat.label}</Text>
          </View>
        </View>
      )}

      {/* BP Alert */}
      {!!vitals.bloodPressureSystolic && vitals.bloodPressureSystolic >= 140 && (
        <View style={vStyles.alertBox}>
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <Text style={vStyles.alertText}>
            TA élevée ({vitals.bloodPressureSystolic}/{vitals.bloodPressureDiastolic ?? '?'} mmHg) — informer le médecin.
          </Text>
        </View>
      )}

      {/* Low SpO2 Alert */}
      {!!vitals.oxygenSaturation && vitals.oxygenSaturation < 95 && (
        <View style={vStyles.alertBox}>
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <Text style={vStyles.alertText}>
            SpO2 basse ({vitals.oxygenSaturation}%) — consultation urgente recommandée.
          </Text>
        </View>
      )}

      {/* Sector vital alerts */}
      {(sectorProfile?.recommendedScreenings?.length ?? 0) > 0 && (
        <View style={[vStyles.sectorHint, { borderColor: (sectorProfile?.color || ACCENT) + '30', backgroundColor: (sectorProfile?.color || ACCENT) + '06' }]}>
          <Ionicons name="star" size={13} color={sectorProfile?.color || ACCENT} />
          <Text style={[vStyles.sectorHintText, { color: sectorProfile?.color || ACCENT }]}>
            Secteur {sectorProfile?.label} : vigilance particulière sur SpO2, TA et FC.
          </Text>
        </View>
      )}
    </View>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 'patient_search': return renderPatientSearch();
      case 'visit_motif': return renderVisitMotif();
      case 'vital_signs': return renderVitalSigns();
    }
  };

  // ─── Render ───────────────────────────────────────────────
  return (
    <View style={vStyles.container}>
      {/* Header bar */}
      <View style={vStyles.headerBar}>
        <View style={vStyles.headerLeft}>
          <Ionicons name="person-add" size={20} color={ACCENT} />
          <View>
            <Text style={vStyles.headerTitle}>Accueil Patient</Text>
            <Text style={vStyles.headerSub}>Enregistrement & signes vitaux</Text>
          </View>
        </View>
        {selectedPatient && (
          <View style={[vStyles.headerPatientBadge, { borderColor: (sectorProfile?.color || ACCENT) + '40' }]}>
            <Text style={[vStyles.headerPatientName, { color: sectorProfile?.color || ACCENT }]}>
              {selectedPatient.firstName} {selectedPatient.lastName}
            </Text>
          </View>
        )}
      </View>

      {/* Stepper */}
      <View style={vStyles.stepperRow}>
        {INTAKE_STEPS.map((step, i) => {
          const isActive = i === currentStepIdx;
          const isDone = i < currentStepIdx;
          return (
            <React.Fragment key={step.key}>
              <TouchableOpacity
                style={[vStyles.stepDot, isDone && { backgroundColor: colors.success }, isActive && { backgroundColor: ACCENT }]}
                onPress={() => {
                  if (i <= currentStepIdx) setCurrentStep(step.key);
                }}
              >
                {isDone ? (
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                ) : (
                  <Text style={[vStyles.stepDotText, (isActive || isDone) && { color: '#FFF' }]}>{i + 1}</Text>
                )}
              </TouchableOpacity>
              {isDesktop && (
                <Text style={[vStyles.stepDotLabel, isActive && { color: ACCENT, fontWeight: '700' }, isDone && { color: colors.success }]}>
                  {step.label}
                </Text>
              )}
              {i < INTAKE_STEPS.length - 1 && (
                <View style={[vStyles.stepConnector, isDone && { backgroundColor: colors.success }]} />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Content */}
      <ScrollView style={vStyles.content} contentContainerStyle={vStyles.contentInner}>
        {renderStep()}
      </ScrollView>

      {/* Bottom navigation */}
      <View style={vStyles.bottomNav}>
        <TouchableOpacity
          style={[vStyles.navBtn, vStyles.navBtnOutline, currentStepIdx === 0 && { opacity: 0.4 }]}
          onPress={goPrev}
          disabled={currentStepIdx === 0}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={18} color={ACCENT} />
          <Text style={[vStyles.navBtnText, { color: ACCENT }]}>Précédent</Text>
        </TouchableOpacity>

        <Text style={vStyles.stepCounter}>{currentStepIdx + 1} / {INTAKE_STEPS.length}</Text>

        {currentStep !== 'vital_signs' ? (
          <TouchableOpacity
            style={[vStyles.navBtn, vStyles.navBtnFilled, !canGoNext() && { opacity: 0.4 }]}
            onPress={goNext}
            disabled={!canGoNext()}
            activeOpacity={0.7}
          >
            <Text style={[vStyles.navBtnText, { color: '#FFF' }]}>Suivant</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[vStyles.navBtn, vStyles.navBtnFilled, (!selectedPatient || submitting) && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={!selectedPatient || submitting}
            activeOpacity={0.7}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="checkmark-circle" size={18} color="#FFF" />
            )}
            <Text style={[vStyles.navBtnText, { color: '#FFF' }]}>Enregistrer</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Doctor Assignment Modal (NEW) */}
      <Modal visible={showDoctorModal} transparent animationType="slide">
        <View style={styles.doctorModalOverlay}>
          <View style={styles.doctorModal}>
            {/* Header */}
            <View style={styles.doctorModalHeader}>
              <View style={styles.doctorModalHeaderIcon}>
                <Ionicons name="person-circle" size={24} color={ACCENT} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.doctorModalTitle}>Assigner un Médecin</Text>
                <Text style={styles.doctorModalSubtitle}>Sélectionnez le médecin pour cette consultation</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowDoctorModal(false)}
                style={styles.doctorModalClose}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Search box */}
            <View style={styles.doctorSearchBox}>
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.doctorSearchInput}
                placeholder="Rechercher médecin..."
                placeholderTextColor={colors.textSecondary}
                value={doctorSearch}
                onChangeText={setDoctorSearch}
              />
              {doctorSearch && (
                <TouchableOpacity onPress={() => setDoctorSearch('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Doctor list */}
            <ScrollView style={styles.doctorList} contentContainerStyle={styles.doctorListContent}>
              {loadingDoctors ? (
                <View style={styles.doctorLoadingWrap}>
                  <ActivityIndicator size="large" color={ACCENT} />
                  <Text style={styles.doctorLoadingText}>Chargement des médecins...</Text>
                </View>
              ) : filteredDoctors.length === 0 ? (
                <View style={styles.doctorEmptyWrap}>
                  <Ionicons name="sad" size={40} color={colors.textSecondary} />
                  <Text style={styles.doctorEmptyText}>Aucun médecin trouvé</Text>
                </View>
              ) : (
                filteredDoctors.map((doctor) => (
                  <TouchableOpacity
                    key={doctor.id}
                    style={[
                      styles.doctorCard,
                      selectedDoctor?.id === doctor.id && styles.doctorCardSelected,
                    ]}
                    onPress={() => setSelectedDoctor(doctor)}
                  >
                    <View style={styles.doctorCardLeft}>
                      <View style={[styles.doctorAvatar, { backgroundColor: ACCENT + '18' }]}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: ACCENT }}>
                          {doctor.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.doctorName}>{doctor.name}</Text>
                        {!!doctor.email && (
                          <Text style={styles.doctorEmail}>{doctor.email}</Text>
                        )}
                      </View>
                    </View>
                    {selectedDoctor?.id === doctor.id && (
                      <Ionicons name="checkmark-circle" size={24} color={ACCENT} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            {/* Footer buttons */}
            <View style={styles.doctorModalFooter}>
              <TouchableOpacity
                style={[styles.doctorFooterBtn, styles.doctorFooterBtnOutline]}
                onPress={() => {
                  setShowDoctorModal(false);
                  setSelectedDoctor(null);
                }}
              >
                <Ionicons name="close" size={18} color={ACCENT} />
                <Text style={[styles.doctorFooterBtnText, { color: ACCENT }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.doctorFooterBtn, styles.doctorFooterBtnOutline]}
                onPress={() => handleSaveConsultation(false)}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={ACCENT} />
                ) : (
                  <Ionicons name="arrow-forward-outline" size={18} color={ACCENT} />
                )}
                <Text style={[styles.doctorFooterBtnText, { color: ACCENT }]}>Ignorer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.doctorFooterBtn,
                  styles.doctorFooterBtnFilled,
                  (!selectedDoctor || submitting) && { opacity: 0.5 },
                ]}
                onPress={() => handleSaveConsultation(true)}
                disabled={!selectedDoctor || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="checkmark" size={18} color="#FFF" />
                )}
                <Text style={[styles.doctorFooterBtnText, { color: '#FFF' }]}>Assigner</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <SimpleToastNotification message={toastMsg} />
    </View>
  );
}

// Doctor Modal Styles (NEW)
const styles = StyleSheet.create({
  doctorModalOverlay: {
    flex: 1,
    backgroundColor: '#000000CC',
    justifyContent: 'flex-end',
  },
  doctorModal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    display: 'flex',
    flexDirection: 'column',
    ...shadows.lg,
  },
  doctorModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    gap: 12,
  },
  doctorModalHeaderIcon: {
    backgroundColor: ACCENT + '18',
    borderRadius: 16,
    padding: 8,
  },
  doctorModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  doctorModalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  doctorModalClose: {
    padding: 8,
  },
  doctorSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  doctorSearchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  doctorList: {
    flex: 1,
  },
  doctorListContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
  },
  doctorLoadingWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  doctorLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  doctorEmptyWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  doctorEmptyText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  doctorCardSelected: {
    borderColor: ACCENT,
    backgroundColor: ACCENT + '08',
  },
  doctorCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  doctorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  doctorEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  doctorModalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  doctorFooterBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  doctorFooterBtnOutline: {
    borderColor: ACCENT,
  },
  doctorFooterBtnFilled: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  doctorFooterBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

// ─── Styles ──────────────────────────────────────────────────
const vStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
    gap: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  headerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  headerPatientBadge: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, backgroundColor: 'transparent',
  },
  headerPatientName: { fontSize: 13, fontWeight: '600' },

  // Stepper
  stepperRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.outlineVariant,
  },
  stepDotText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  stepDotLabel: { fontSize: 12, color: colors.textSecondary, marginHorizontal: 6 },
  stepConnector: {
    flex: 1, height: 2, backgroundColor: colors.outlineVariant, marginHorizontal: 4,
  },

  // Layout
  content: { flex: 1 },
  contentInner: { padding: 20, paddingBottom: 32 },

  // Step header
  stepHeader: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20,
    paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  stepIconBox: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: ACCENT + '14', alignItems: 'center', justifyContent: 'center',
  },
  stepTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  stepSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 3, lineHeight: 18 },

  // Vital step quick action
  quickActionRow: {
    alignItems: 'flex-end',
    marginTop: -8,
    marginBottom: 12,
  },
  quickFillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: ACCENT + '0F',
    borderWidth: 1,
    borderColor: ACCENT + '3A',
  },
  quickFillBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: ACCENT,
  },

  // Search
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surfaceVariant || colors.background,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, paddingVertical: 0 },

  // Filter panel
  filterPanel: {
    marginTop: 12, padding: 14,
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderTopWidth: 2,
    gap: 14,
  },
  filterSection: { gap: 8 },
  filterLabel: { fontSize: 12, fontWeight: '700', color: colors.text },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1, borderColor: colors.outline,
    backgroundColor: colors.surfaceVariant,
  },
  filterChipText: { fontSize: 12, fontWeight: '500', color: colors.text },
  clearButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 8, borderWidth: 1, borderColor: colors.error + '30',
    backgroundColor: colors.error + '08',
    marginTop: 4,
  },

  // Patient list
  patientRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12,
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.outlineVariant,
    ...shadows.xs,
  },
  rowAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  rowAvatarText: { fontSize: 14, fontWeight: '700' },
  rowName: { fontSize: 14, fontWeight: '700', color: colors.text },
  rowMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  rowAlert: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  rowAlertText: { fontSize: 11, color: colors.error },
  riskDot: { width: 8, height: 8, borderRadius: 4 },

  // Selected patient card
  selectedPatientCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginTop: 12,
    backgroundColor: colors.surface, borderRadius: 12, borderWidth: 2,
    ...shadows.sm,
  },
  selectedAvatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  selectedAvatarText: { fontSize: 16, fontWeight: '700' },
  selectedName: { fontSize: 15, fontWeight: '700', color: colors.text },
  selectedMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  fitnessChip: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20,
  },
  fitnessChipText: { fontSize: 11, fontWeight: '600' },

  // Loading / empty states
  loadingBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    justifyContent: 'center', paddingVertical: 40,
  },
  loadingText: { fontSize: 14, color: colors.textSecondary },
  emptyBox: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', maxWidth: 280 },

  // Visit motif
  patientReminder: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, borderRadius: 10, borderWidth: 1,
    backgroundColor: colors.surface, marginBottom: 4,
  },
  patientReminderText: { fontSize: 13, fontWeight: '600', flex: 1 },
  examTypeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: colors.outlineVariant,
    ...shadows.xs,
  },
  examTypeIcon: {
    width: 42, height: 42, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  examTypeLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  examTypeDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  // Forms
  formGroup: { marginTop: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface, borderRadius: 10,
    borderWidth: 1, borderColor: colors.outlineVariant,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: colors.text,
  },
  textArea: { height: 80, textAlignVertical: 'top', paddingTop: 10 },

  // Vitals
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  vitalCard: {
    width: isDesktop ? '23%' : '47%',
    backgroundColor: colors.surface, borderRadius: 10,
    borderWidth: 1, borderColor: colors.outlineVariant, padding: 10,
    ...shadows.xs,
  },
  vitalHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  vitalLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, flex: 1 },
  vitalInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceVariant || colors.background,
    borderRadius: 8, borderWidth: 1, borderColor: colors.outlineVariant,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  vitalInput: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text, paddingVertical: 2 },
  vitalUnit: { fontSize: 11, color: colors.textSecondary, marginLeft: 4 },

  // BMI
  bmiCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: 10, borderLeftWidth: 4,
    backgroundColor: colors.surface, marginTop: 14,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  bmiLabel: { fontSize: 12, color: colors.textSecondary },
  bmiValue: { fontSize: 24, fontWeight: '800', marginTop: 2 },
  bmiChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  bmiChipText: { fontSize: 13, fontWeight: '700' },

  // Alerts
  alertBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12,
    backgroundColor: colors.errorLight, borderRadius: 10, marginTop: 10,
    borderWidth: 1, borderColor: colors.error + '30',
  },
  alertText: { fontSize: 13, color: colors.errorDark, flex: 1, lineHeight: 18 },

  // Sector hint
  sectorHint: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12,
    borderRadius: 10, borderWidth: 1, marginTop: 12,
  },
  sectorHintText: { fontSize: 12, flex: 1, lineHeight: 18, fontWeight: '500' },

  // Bottom nav
  bottomNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.outlineVariant,
    ...shadows.md,
  },
  navBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10,
    minWidth: isDesktop ? 120 : 80,
  },
  navBtnOutline: { borderWidth: 1.5, borderColor: ACCENT },
  navBtnFilled: { backgroundColor: ACCENT },
  navBtnText: { fontSize: 14, fontWeight: '700' },
  stepCounter: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },

  // Protocol Checklist
  protocolBox: {
    backgroundColor: colors.surface,
    borderRadius: 12, borderWidth: 1, borderColor: ACCENT + '40',
    padding: 14, marginTop: 16, marginBottom: 4,
  },
  protocolHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10,
  },
  protocolTitle: {
    flex: 1, fontSize: 13, fontWeight: '700', color: colors.text,
  },
  protocolCountChip: {
    backgroundColor: ACCENT + '18', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  protocolCountText: { fontSize: 11, fontWeight: '700', color: ACCENT },
  protocolRegNote: {
    fontSize: 11, color: colors.textSecondary, marginBottom: 10,
    fontStyle: 'italic', lineHeight: 16,
  },
  protocolCatGroup: { marginBottom: 8 },
  protocolCatHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4,
  },
  protocolCatDot: { width: 8, height: 8, borderRadius: 4 },
  protocolCatLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  protocolExamRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingLeft: 14, paddingVertical: 3,
  },
  protocolExamText: { fontSize: 12, color: colors.textSecondary, flex: 1 },
  protocolRecBox: {
    marginTop: 8, padding: 10, borderRadius: 8,
    backgroundColor: colors.surfaceVariant || colors.background,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  protocolRecTitle: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 4 },
  protocolRecList: { fontSize: 11, color: colors.textSecondary, lineHeight: 18 },
  protocolNoPosition: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12,
    backgroundColor: colors.warning + '10', borderRadius: 10,
    borderWidth: 1, borderColor: colors.warning + '30', marginTop: 16,
  },
  protocolNoPositionText: {
    fontSize: 12, color: colors.warning, flex: 1, lineHeight: 18,
  },
});
