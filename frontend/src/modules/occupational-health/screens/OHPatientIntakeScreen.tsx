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
  const [currentStep, setCurrentStep] = useState<IntakeStep>('patient_search');
  const currentStepIdx = INTAKE_STEPS.findIndex(s => s.key === currentStep);

  // Patient selection
  const [patients, setPatients] = useState<OccupationalHealthPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<OccupationalHealthPatient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingPatients, setLoadingPatients] = useState(false);

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
    const q = searchQuery.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(p =>
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.employeeId?.toLowerCase().includes(q) ||
      p.company?.toLowerCase().includes(q) ||
      p.jobTitle?.toLowerCase().includes(q) ||
      p.patientNumber?.toLowerCase().includes(q),
    );
  }, [patients, searchQuery]);

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

  // Save pending consultation
  const handleSave = useCallback(async () => {
    if (!selectedPatient || submitting) return;
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
      };

      // Load existing list
      const stored = await AsyncStorage.getItem(PENDING_CONSULTATIONS_KEY);
      const list = upsertPendingConsultationQueue(safeParsePendingConsultations(stored), pending);
      await AsyncStorage.setItem(PENDING_CONSULTATIONS_KEY, JSON.stringify(list));

      const resetForNextPatient = () => {
        setCurrentStep('patient_search');
        setSelectedPatient(null);
        setSearchQuery('');
        setExamType('periodic');
        setVisitReason('');
        setReferredBy('');
        setVitals({});
      };

      const successMessage = `${selectedPatient.firstName} ${selectedPatient.lastName} est maintenant dans la file d'attente du médecin.`;

      if (Platform.OS === 'web') {
        const goToConsultation = window.confirm(`${successMessage}\n\nOK: Aller chez le Médecin\nAnnuler: Accueil Suivant`);
        onConsultationQueued?.();
        if (goToConsultation) {
          onNavigateToConsultation?.(pending.id);
        } else {
          resetForNextPatient();
        }
      } else {
        Alert.alert(
          'Patient Enregistré',
          successMessage,
          [
            {
              text: 'Accueil Suivant',
              onPress: () => {
                resetForNextPatient();
                onConsultationQueued?.();
              },
            },
            {
              text: 'Aller chez le Médecin',
              onPress: () => {
                onConsultationQueued?.();
                onNavigateToConsultation?.(pending.id);
              },
            },
          ],
        );
      }
    } catch (err) {
      console.error('Error queuing consultation:', err);
      Alert.alert('Erreur', 'Impossible d\'enregistrer le patient. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  }, [selectedPatient, examType, visitReason, referredBy, vitals, onConsultationQueued, onNavigateToConsultation]);

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
      </View>

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
      {bmi && (
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
      {vitals.bloodPressureSystolic && vitals.bloodPressureSystolic >= 140 && (
        <View style={vStyles.alertBox}>
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <Text style={vStyles.alertText}>
            TA élevée ({vitals.bloodPressureSystolic}/{vitals.bloodPressureDiastolic ?? '?'} mmHg) — informer le médecin.
          </Text>
        </View>
      )}

      {/* Low SpO2 Alert */}
      {vitals.oxygenSaturation && vitals.oxygenSaturation < 95 && (
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
    </View>
  );
}

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
