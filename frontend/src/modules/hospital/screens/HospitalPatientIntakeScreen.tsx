import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import ApiService from '../../../services/ApiService';
import { Patient } from '../../../models/Patient';
import { User } from '../../../models/User';
import { useSimpleToast } from '../../../hooks/useSimpleToast';
import { SimpleToastNotification } from '../../../components/SimpleToastNotification';

export const HOSPITAL_PENDING_CONSULTATIONS_KEY = '@hospital_pending_consultations';
export const HOSPITAL_INTAKE_DRAFT_KEY = '@hospital_intake_draft';

export interface PendingHospitalConsultation {
  id: string;
  patient: Patient;
  visitReason: string;
  referredBy: string;
  assignedDoctor?: User;
  vitals: {
    temperature?: number;
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    heartRate?: number;
    oxygenSaturation?: number;
  };
  arrivalTime: string;
  status: 'waiting' | 'in_consultation' | 'completed';
}

function apiToPatient(d: any): Patient {
  return {
    id: String(d.id),
    firstName: d.first_name ?? '',
    lastName: d.last_name ?? '',
    middleName: d.middle_name ?? '',
    dateOfBirth: d.date_of_birth ?? '',
    gender: d.gender ?? 'other',
    phone: d.phone ?? '',
    email: d.email ?? '',
    address: d.address ?? '',
    city: d.city ?? '',
    nationalId: d.national_id ?? '',
    bloodType: d.blood_type ?? undefined,
    allergies: Array.isArray(d.allergies) ? d.allergies : [],
    chronicConditions: Array.isArray(d.chronic_conditions) ? d.chronic_conditions : [],
    currentMedications: Array.isArray(d.current_medications) ? d.current_medications : [],
    emergencyContactName: d.emergency_contact_name ?? '',
    emergencyContactPhone: d.emergency_contact_phone ?? '',
    insuranceProvider: d.insurance_provider ?? '',
    insuranceNumber: d.insurance_number ?? '',
    patientNumber: d.patient_number ?? '',
    registrationDate: d.registration_date ?? d.created_at ?? '',
    lastVisit: d.last_visit ?? undefined,
    status: d.status ?? 'active',
    createdAt: d.created_at ?? '',
    accessCount: 0,
  };
}

export function HospitalPatientIntakeScreen({
  onConsultationQueued,
  onNavigateToConsultation,
}: {
  onConsultationQueued?: () => void;
  onNavigateToConsultation?: (pendingId?: string) => void;
}) {
  const api = ApiService.getInstance();
  const { toastMsg, showToast } = useSimpleToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [doctors, setDoctors] = useState<User[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<User | null>(null);
  const [showDoctorList, setShowDoctorList] = useState(false);

  const [visitReason, setVisitReason] = useState('');
  const [referredBy, setReferredBy] = useState('');

  const [temperature, setTemperature] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [oxygenSat, setOxygenSat] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Load draft on mount
  useEffect(() => {
    const checkDraft = async () => {
      try {
        const draft = await AsyncStorage.getItem(HOSPITAL_INTAKE_DRAFT_KEY);
        setHasDraft(!!draft);
      } catch (err) {
        console.error('[HospitalPatientIntake] Error checking draft:', err);
      }
    };
    checkDraft();
  }, []);

  // Save draft (called automatically)
  const saveDraft = useCallback(async () => {
    if (!selectedPatient) return;
    try {
      setAutoSaveStatus('saving');
      const draft = {
        patient: selectedPatient,
        doctor: selectedDoctor,
        visitReason,
        referredBy,
        temperature,
        systolic,
        diastolic,
        heartRate,
        oxygenSat,
        savedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(HOSPITAL_INTAKE_DRAFT_KEY, JSON.stringify(draft));
      setHasDraft(true);
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('[HospitalPatientIntake] Error auto-saving draft:', err);
      setAutoSaveStatus('idle');
    }
  }, [selectedPatient, selectedDoctor, visitReason, referredBy, temperature, systolic, diastolic, heartRate, oxygenSat]);

  // Auto-save draft when form data changes
  useEffect(() => {
    if (!selectedPatient) return;
    const timer = setTimeout(() => {
      saveDraft();
    }, 1000); // Debounce for 1 second
    return () => clearTimeout(timer);
  }, [selectedPatient, selectedDoctor, visitReason, referredBy, temperature, systolic, diastolic, heartRate, oxygenSat, saveDraft]);

  const loadPatients = useCallback(async () => {
    setLoadingPatients(true);
    try {
      const res = await api.get('/patients/?ordering=-created_at');
      if (res.success && res.data) {
        const payload = res.data as any;
        const raw: any[] = Array.isArray(payload) ? payload : (payload.results ?? []);
        setPatients(raw.map(apiToPatient));
      }
    } finally {
      setLoadingPatients(false);
    }
  }, [api]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const loadDoctors = useCallback(async () => {
    setLoadingDoctors(true);
    try {
      console.log('[HospitalPatientIntake] Loading doctors from /auth/users/');
      const res = await api.get('/auth/users/?role=doctor&ordering=first_name');
      console.log('[HospitalPatientIntake] Doctors response:', res);
      if (res.success && res.data) {
        const payload = res.data as any;
        const raw: any[] = Array.isArray(payload) ? payload : (payload.results ?? []);
        console.log('[HospitalPatientIntake] Doctors loaded:', raw.length);
        setDoctors(raw);
      } else {
        console.error('[HospitalPatientIntake] Failed to load doctors:', res);
        setDoctors([]);
      }
    } catch (err) {
      console.error('[HospitalPatientIntake] Error loading doctors:', err);
      setDoctors([]);
    } finally {
      setLoadingDoctors(false);
    }
  }, [api]);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  const filteredPatients = useMemo(() => {
    const searchQuery_trimmed = searchQuery.trim().toLowerCase();
    
    // If patient is selected and no search, show only selected patient
    if (selectedPatient && !searchQuery_trimmed) {
      return patients.filter((p) => p.id === selectedPatient.id);
    }
    
    // If there's a search query, show all matching patients
    if (searchQuery_trimmed) {
      return patients.filter((p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery_trimmed)
        || p.patientNumber.toLowerCase().includes(searchQuery_trimmed)
        || (p.phone || '').toLowerCase().includes(searchQuery_trimmed)
      );
    }
    
    // No selection and no search: show only last 2 patients
    return patients.slice(0, 2);
  }, [patients, searchQuery, selectedPatient]);

  const filteredDoctors = useMemo(() => {
    const search = doctorSearch.trim().toLowerCase();
    if (!search) {
      return doctors;
    }
    return doctors.filter((d) =>
      `${d.firstName} ${d.lastName}`.toLowerCase().includes(search)
      || (d.department || '').toLowerCase().includes(search)
    );
  }, [doctors, doctorSearch]);

  const queuePatient = useCallback(async () => {
    console.log('[HospitalPatientIntake] Queue button clicked');
    console.log('[HospitalPatientIntake] selectedPatient:', selectedPatient);
    console.log('[HospitalPatientIntake] visitReason:', visitReason);
    
    if (!selectedPatient) {
      console.log('[HospitalPatientIntake] Error: No patient selected');
      showToast('Sélectionnez un patient avant de continuer.', 'error');
      return;
    }
    if (!visitReason.trim()) {
      console.log('[HospitalPatientIntake] Error: No visit reason');
      showToast('Veuillez renseigner le motif de consultation.', 'error');
      return;
    }

    const pending: PendingHospitalConsultation = {
      id: `hpq_${Date.now()}`,
      patient: selectedPatient,
      visitReason: visitReason.trim(),
      referredBy: referredBy.trim(),
      vitals: {
        temperature: temperature ? Number(temperature) : undefined,
        bloodPressureSystolic: systolic ? Number(systolic) : undefined,
        bloodPressureDiastolic: diastolic ? Number(diastolic) : undefined,
        heartRate: heartRate ? Number(heartRate) : undefined,
        oxygenSaturation: oxygenSat ? Number(oxygenSat) : undefined,
      },
      assignedDoctor: selectedDoctor || undefined,
      arrivalTime: new Date().toISOString(),
      status: 'waiting',
    };

    setSubmitting(true);
    try {
      console.log('[HospitalPatientIntake] Saving to AsyncStorage:', pending);
      const raw = await AsyncStorage.getItem(HOSPITAL_PENDING_CONSULTATIONS_KEY);
      const queue: PendingHospitalConsultation[] = raw ? JSON.parse(raw) : [];

      const deduped = queue.filter(
        item => !(item.patient.id === pending.patient.id && item.status !== 'completed')
      );

      const nextQueue = [pending, ...deduped];
      await AsyncStorage.setItem(HOSPITAL_PENDING_CONSULTATIONS_KEY, JSON.stringify(nextQueue));
      
      console.log('[HospitalPatientIntake] Successfully saved. Showing alert...');
      console.log('[HospitalPatientIntake] Patient name:', selectedPatient?.firstName, selectedPatient?.lastName);
      
      Alert.alert(
        '✅ Patient Ajouté',
        `${selectedPatient?.firstName} ${selectedPatient?.lastName} est maintenant en attente de consultation.`,
        [
          {
            text: 'Continuer Accueil',
            onPress: () => {
              console.log('[HospitalPatientIntake] Continuing with intake (reset form)');
              // Reset form to queue more patients
              setSelectedPatient(null);
              setSelectedDoctor(null);
              setVisitReason('');
              setReferredBy('');
              setTemperature('');
              setSystolic('');
              setDiastolic('');
              setHeartRate('');
              setOxygenSat('');
              setSearchQuery('');
              onConsultationQueued?.();
            },
          },
          {
            text: 'Voir File Attente',
            onPress: () => {
              console.log('[HospitalPatientIntake] Navigating to waiting room');
              onConsultationQueued?.();
              onNavigateToConsultation?.(); // No pending ID - shows waiting room
            },
          },
        ],
        { cancelable: false }
      );
    } catch (err) {
      console.error('[HospitalPatientIntake] Error:', err);
      showToast('Impossible d\'ajouter le patient à la file d\'attente.', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [selectedPatient, visitReason, referredBy, temperature, systolic, diastolic, heartRate, oxygenSat, onConsultationQueued, onNavigateToConsultation]);

  const getAutoSaveIcon = () => {
    switch (autoSaveStatus) {
      case 'saving':
        return <ActivityIndicator size={16} color={colors.warning} />;
      case 'saved':
        return <Ionicons name="checkmark-circle" size={16} color={colors.success} />;
      default:
        return <Ionicons name="document" size={16} color={colors.textSecondary} />;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Accueil Consultation</Text>
          <Text style={styles.subtitle}>Étape préalable avant apparition en salle d'attente médecin</Text>
        </View>
        <TouchableOpacity style={styles.draftIcon} activeOpacity={0.7}>
          {getAutoSaveIcon()}
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher patient..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loadingPatients ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Chargement des patients...</Text>
        </View>
      ) : (
        <View style={styles.patientList}>
          {filteredPatients.slice(0, 30).map((patient) => {
            const isSelected = selectedPatient?.id === patient.id;
            return (
              <TouchableOpacity
                key={patient.id}
                style={[styles.patientCard, isSelected && styles.patientCardSelected]}
                onPress={() => setSelectedPatient(patient)}
              >
                <View>
                  <Text style={styles.patientName}>{patient.firstName} {patient.lastName}</Text>
                  <Text style={styles.patientMeta}>{patient.patientNumber} • {patient.phone || '—'}</Text>
                </View>
                {isSelected && <Ionicons name="checkmark-circle" size={22} color={ACCENT} />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Pré-évaluation</Text>
        <TextInput
          style={styles.input}
          placeholder="Motif de consultation"
          placeholderTextColor={colors.textSecondary}
          value={visitReason}
          onChangeText={setVisitReason}
        />
        <TextInput
          style={styles.input}
          placeholder="Référé par (optionnel)"
          placeholderTextColor={colors.textSecondary}
          value={referredBy}
          onChangeText={setReferredBy}
        />

        {/* Doctor Selection */}
        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowDoctorList(!showDoctorList)}
        >
          <View style={styles.doctorSelectorContent}>
            <Text style={[styles.doctorSelectorText, !selectedDoctor && styles.placeholder]}>
              {selectedDoctor ? `Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName}` : 'Assigner un médecin (optionnel)'}
            </Text>
            <Ionicons name={showDoctorList ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>

        {showDoctorList && (
          <View style={styles.doctorListContainer}>
            <TextInput
              style={styles.doctorSearchInput}
              placeholder="Rechercher médecin..."
              placeholderTextColor={colors.textSecondary}
              value={doctorSearch}
              onChangeText={setDoctorSearch}
            />
            {loadingDoctors ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color={ACCENT} />
              </View>
            ) : (
              <View style={styles.doctorListItems}>
                <TouchableOpacity
                  style={styles.doctorClearItem}
                  onPress={() => {
                    setSelectedDoctor(null);
                    setShowDoctorList(false);
                  }}
                >
                  <Text style={styles.doctorClearText}>Aucun médecin</Text>
                </TouchableOpacity>
                {filteredDoctors.slice(0, 10).map((doctor) => (
                  <TouchableOpacity
                    key={doctor.id}
                    style={styles.doctorListItem}
                    onPress={() => {
                      setSelectedDoctor(doctor);
                      setShowDoctorList(false);
                    }}
                  >
                    <View>
                      <Text style={styles.doctorName}>
                        Dr. {doctor.firstName} {doctor.lastName}
                      </Text>
                      {doctor.department && (
                        <Text style={styles.doctorDept}>{doctor.department}</Text>
                      )}
                    </View>
                    {selectedDoctor?.id === doctor.id && (
                      <Ionicons name="checkmark-circle" size={20} color={ACCENT} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.vitalsRow}>
          <TextInput style={[styles.input, styles.vitalInput]} placeholder="T°" placeholderTextColor={colors.textSecondary} keyboardType="numeric" value={temperature} onChangeText={setTemperature} />
          <TextInput style={[styles.input, styles.vitalInput]} placeholder="TA Sys" placeholderTextColor={colors.textSecondary} keyboardType="numeric" value={systolic} onChangeText={setSystolic} />
          <TextInput style={[styles.input, styles.vitalInput]} placeholder="TA Dia" placeholderTextColor={colors.textSecondary} keyboardType="numeric" value={diastolic} onChangeText={setDiastolic} />
        </View>
        <View style={styles.vitalsRow}>
          <TextInput style={[styles.input, styles.vitalInput]} placeholder="FC" placeholderTextColor={colors.textSecondary} keyboardType="numeric" value={heartRate} onChangeText={setHeartRate} />
          <TextInput style={[styles.input, styles.vitalInput]} placeholder="SpO2" placeholderTextColor={colors.textSecondary} keyboardType="numeric" value={oxygenSat} onChangeText={setOxygenSat} />
        </View>
      </View>

      <TouchableOpacity style={[styles.queueBtn, submitting && { opacity: 0.6 }]} onPress={queuePatient} disabled={submitting}>
        <Ionicons name="add-circle" size={18} color="#FFF" />
        <Text style={styles.queueBtnText}>{submitting ? 'Ajout en cours...' : 'Ajouter à la salle d\'attente'}</Text>
      </TouchableOpacity>
      <SimpleToastNotification message={toastMsg} />
    </ScrollView>
  );
}

const ACCENT = colors.info;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  titleContainer: { flex: 1 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  subtitle: { marginTop: 4, marginBottom: 16, color: colors.textSecondary },
  draftIcon: { padding: 8, marginRight: -8 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.outline,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: { flex: 1, height: 44, marginLeft: 8, color: colors.text },
  loadingWrap: { paddingVertical: 24, alignItems: 'center' },
  loadingText: { marginTop: 8, color: colors.textSecondary },
  patientList: { gap: 8, marginBottom: 16 },
  patientCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.lg,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  patientCardSelected: { borderColor: ACCENT, backgroundColor: ACCENT + '12' },
  patientName: { fontSize: 15, fontWeight: '600', color: colors.text },
  patientMeta: { marginTop: 2, color: colors.textSecondary, fontSize: 12 },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadows.sm,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 10 },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.md,
    paddingHorizontal: 10,
    height: 42,
    marginBottom: 8,
    color: colors.text,
  },
  vitalsRow: { flexDirection: 'row', gap: 8 },
  vitalInput: { flex: 1 },
  queueBtn: {
    marginTop: 14,
    backgroundColor: ACCENT,
    borderRadius: borderRadius.lg,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...shadows.sm,
  },
  queueBtnText: { color: '#FFF', fontWeight: '700' },
  draftBanner: {
    marginBottom: 16,
    backgroundColor: '#FFF8E1',
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
    borderRadius: borderRadius.md,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  draftBannerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  draftBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B00',
  },
  draftBannerSubtitle: {
    fontSize: 12,
    color: '#FF8C00',
    marginLeft: 8,
  },
  draftActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  draftLoadBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.info,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  draftLoadBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  draftClearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
  },
  doctorSelectorContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 42,
  },
  doctorSelectorText: {
    fontSize: 15,
    color: colors.text,
  },
  placeholder: {
    color: colors.textSecondary,
  },
  doctorListContainer: {
    marginBottom: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  doctorSearchInput: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    paddingHorizontal: 10,
    height: 36,
    color: colors.text,
  },
  doctorListItems: {
    maxHeight: 250,
  },
  doctorListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  doctorName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  doctorDept: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  doctorClearItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  doctorClearText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
