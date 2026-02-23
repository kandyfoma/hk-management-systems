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

export const HOSPITAL_PENDING_CONSULTATIONS_KEY = '@hospital_pending_consultations';

export interface PendingHospitalConsultation {
  id: string;
  patient: Patient;
  visitReason: string;
  referredBy: string;
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
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [visitReason, setVisitReason] = useState('');
  const [referredBy, setReferredBy] = useState('');

  const [temperature, setTemperature] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [oxygenSat, setOxygenSat] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const loadPatients = useCallback(async () => {
    setLoadingPatients(true);
    try {
      const res = await api.get('/patients/');
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

  const filteredPatients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q)
      || p.patientNumber.toLowerCase().includes(q)
      || (p.phone || '').toLowerCase().includes(q)
    );
  }, [patients, searchQuery]);

  const queuePatient = useCallback(async () => {
    if (!selectedPatient) {
      Alert.alert('Patient requis', 'Sélectionnez un patient avant de continuer.');
      return;
    }
    if (!visitReason.trim()) {
      Alert.alert('Motif requis', 'Veuillez renseigner le motif de consultation.');
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
      arrivalTime: new Date().toISOString(),
      status: 'waiting',
    };

    setSubmitting(true);
    try {
      const raw = await AsyncStorage.getItem(HOSPITAL_PENDING_CONSULTATIONS_KEY);
      const queue: PendingHospitalConsultation[] = raw ? JSON.parse(raw) : [];

      const deduped = queue.filter(
        item => !(item.patient.id === pending.patient.id && item.status !== 'completed')
      );

      const nextQueue = [pending, ...deduped];
      await AsyncStorage.setItem(HOSPITAL_PENDING_CONSULTATIONS_KEY, JSON.stringify(nextQueue));

      onConsultationQueued?.();
      Alert.alert(
        'Patient Ajouté ✓',
        `${selectedPatient?.firstName} ${selectedPatient?.lastName} est maintenant en attente de consultation.`,
        [
          {
            text: 'Continuer Accueil',
            onPress: () => {
              // Reset form to queue more patients
              setSelectedPatient(null);
              setVisitReason('');
              setReferredBy('');
              setTemperature('');
              setSystolic('');
              setDiastolic('');
              setHeartRate('');
              setOxygenSat('');
              setSearchQuery('');
            },
          },
          {
            text: 'Voir File Attente',
            onPress: () => onNavigateToConsultation?.(), // No pending ID - shows waiting room
          },
        ]
      );
    } catch {
      Alert.alert('Erreur', 'Impossible d\'ajouter le patient à la file d\'attente.');
    } finally {
      setSubmitting(false);
    }
  }, [selectedPatient, visitReason, referredBy, temperature, systolic, diastolic, heartRate, oxygenSat, onConsultationQueued, onNavigateToConsultation]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Accueil Consultation</Text>
      <Text style={styles.subtitle}>Étape préalable avant apparition en salle d'attente médecin</Text>

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
    </ScrollView>
  );
}

const ACCENT = colors.info;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  subtitle: { marginTop: 4, marginBottom: 16, color: colors.textSecondary },
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
});
