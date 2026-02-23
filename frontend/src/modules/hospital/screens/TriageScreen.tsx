import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import ApiService from '../../../services/ApiService';
import { Patient } from '../../../models/Patient';
import {
  Triage,
  TriageLevel,
  TriageCategory,
  ConsciousnessLevel,
  AirwayStatus,
  BreathingStatus,
  CirculationStatus,
  MobilityStatus,
  RedFlag,
  TriageVitals,
  TRIAGE_LEVEL_CONFIG,
  TriageUtils,
} from '../../../models/Triage';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

// ─── Section Header Component ────────────────────────────────
function SectionHeader({
  title,
  icon,
  accentColor = colors.error,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
}) {
  return (
    <View style={secStyles.wrapper}>
      <View style={secStyles.divider}>
        <View style={[secStyles.dividerAccent, { backgroundColor: accentColor }]} />
        <View style={secStyles.dividerLine} />
      </View>
      <View style={secStyles.header}>
        <View style={secStyles.headerLeft}>
          <View style={[secStyles.iconBubble, { backgroundColor: accentColor + '14' }]}>
            <Ionicons name={icon} size={18} color={accentColor} />
          </View>
          <Text style={secStyles.title}>{title}</Text>
        </View>
      </View>
    </View>
  );
}

const secStyles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  dividerAccent: { width: 40, height: 3, borderRadius: 2 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.outline, marginLeft: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBubble: { width: 36, height: 36, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
});

// ─── Selection Button Component ──────────────────────────────
function SelectionButton<T extends string>({
  options,
  value,
  onChange,
  labels,
  colorMap,
}: {
  options: T[];
  value: T | undefined;
  onChange: (val: T) => void;
  labels: Record<T, string>;
  colorMap?: Record<T, string>;
}) {
  return (
    <View style={styles.selectionRow}>
      {options.map((opt) => {
        const isSelected = value === opt;
        const color = colorMap?.[opt] || colors.primary;
        return (
          <TouchableOpacity
            key={opt}
            style={[
              styles.selectionBtn,
              isSelected && { backgroundColor: color, borderColor: color },
            ]}
            onPress={() => onChange(opt)}
            activeOpacity={0.7}
          >
            <Text style={[styles.selectionBtnText, isSelected && { color: '#FFF' }]}>
              {labels[opt]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Vital Input Component ───────────────────────────────────
function VitalInput({
  label,
  value,
  onChangeText,
  unit,
  icon,
  iconColor = colors.textSecondary,
  keyboardType = 'numeric',
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  unit: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  keyboardType?: 'numeric' | 'default';
}) {
  return (
    <View style={styles.vitalInputContainer}>
      <View style={styles.vitalInputLabel}>
        <Ionicons name={icon} size={16} color={iconColor} />
        <Text style={styles.vitalInputLabelText}>{label}</Text>
      </View>
      <View style={styles.vitalInputRow}>
        <TextInput
          style={styles.vitalInput}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholder="--"
          placeholderTextColor={colors.textTertiary}
        />
        <Text style={styles.vitalUnit}>{unit}</Text>
      </View>
    </View>
  );
}

// ─── Red Flag Chip Component ─────────────────────────────────
function RedFlagChip({
  flag,
  isSelected,
  onToggle,
  label,
}: {
  flag: RedFlag;
  isSelected: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.redFlagChip, isSelected && styles.redFlagChipSelected]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <Ionicons
        name={isSelected ? 'checkbox' : 'square-outline'}
        size={16}
        color={isSelected ? colors.error : colors.textSecondary}
      />
      <Text style={[styles.redFlagChipText, isSelected && { color: colors.error }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Main Component ──────────────────────────────────────────
interface TriageScreenProps {
  onNavigateToRegisterPatient?: () => void;
}

export function TriageScreen({ onNavigateToRegisterPatient }: TriageScreenProps = {}) {
  const api = ApiService.getInstance();
  
  // Patient list state
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  // Fetch patients
  const loadPatients = useCallback(async () => {
    setLoadingPatients(true);
    try {
      const res = await api.get('/patients/?limit=100&ordering=-created_at');
      if (res.success && res.data) {
        const payload = res.data as any;
        const raw: any[] = Array.isArray(payload) ? payload : (payload.results ?? []);
        const patientList = raw.map((d: any) => ({
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
          bloodType: d.blood_type,
          allergies: Array.isArray(d.allergies) ? d.allergies : [],
          chronicConditions: Array.isArray(d.chronic_conditions) ? d.chronic_conditions : [],
          currentMedications: Array.isArray(d.current_medications) ? d.current_medications : [],
          emergencyContactName: d.emergency_contact_name ?? '',
          emergencyContactPhone: d.emergency_contact_phone ?? '',
          insuranceProvider: d.insurance_provider ?? '',
          insuranceNumber: d.insurance_number ?? '',
          patientNumber: d.patient_number ?? '',
          registrationDate: d.registration_date ?? d.created_at ?? '',
          lastVisit: d.last_visit,
          status: d.status ?? 'active',
          createdAt: d.created_at ?? '',
          accessCount: 0,
        }));
        setPatients(patientList);
      }
    } catch (err) {
      console.error('[TriageScreen] Error loading patients:', err);
    } finally {
      setLoadingPatients(false);
    }
  }, [api]);
  
  useEffect(() => {
    loadPatients();
  }, [loadPatients]);
  
  // Filter patients based on search
  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return patients;
    const q = patientSearch.toLowerCase();
    return patients.filter(p =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      p.patientNumber.toLowerCase().includes(q) ||
      (p.phone || '').includes(q)
    );
  }, [patients, patientSearch]);
  
  // Handle patient selection
  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatientId(patient.id);
    setSelectedPatient(patient);
    setChiefComplaint('');
    setTemperature('');
    setSystolic('');
    setDiastolic('');
    setHeartRate('');
    setRespiratoryRate('');
    setOxygenSat('');
    setBloodGlucose('');
  };
  
  // Calculate age from DOB
  const calculateAge = (dob?: string): string => {
    if (!dob) return '—';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  };
  
  // Chief complaint
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [symptomOnset, setSymptomOnset] = useState('');
  const [symptomProgression, setSymptomProgression] = useState<'improving' | 'stable' | 'worsening' | undefined>();
  
  // Vitals
  const [temperature, setTemperature] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [respiratoryRate, setRespiratoryRate] = useState('');
  const [oxygenSat, setOxygenSat] = useState('');
  const [bloodGlucose, setBloodGlucose] = useState('');
  
  // Pain
  const [painLevel, setPainLevel] = useState<number | undefined>();
  const [painLocation, setPainLocation] = useState('');
  
  // Clinical assessment
  const [consciousness, setConsciousness] = useState<ConsciousnessLevel | undefined>();
  const [airway, setAirway] = useState<AirwayStatus | undefined>();
  const [breathing, setBreathing] = useState<BreathingStatus | undefined>();
  const [circulation, setCirculation] = useState<CirculationStatus | undefined>();
  const [mobility, setMobility] = useState<MobilityStatus | undefined>();
  
  // Red flags
  const [redFlags, setRedFlags] = useState<RedFlag[]>([]);
  
  // Isolation
  const [feverScreening, setFeverScreening] = useState(false);
  const [respiratorySymptoms, setRespiratorySymptoms] = useState(false);
  const [isolationRequired, setIsolationRequired] = useState(false);
  
  // Assignment
  const [assignedArea, setAssignedArea] = useState('');
  
  // Calculate suggested triage level
  const suggestedLevel = TriageUtils.calculateTriageLevel({
    consciousnessLevel: consciousness,
    airwayStatus: airway,
    breathingStatus: breathing,
    circulationStatus: circulation,
    painLevel,
    hasRedFlags: redFlags.length > 0,
    mobilityStatus: mobility,
  });
  const levelConfig = TRIAGE_LEVEL_CONFIG[suggestedLevel];

  // Handle triage submission
  const handleSubmitTriage = () => {
    const triageData: Partial<Triage> = {
      chiefComplaint,
      symptomOnset: 'today', // This should be collected from form
      consciousnessLevel: consciousness,
      airwayStatus: airway,
      breathingStatus: breathing,
      circulationStatus: circulation,
      mobilityStatus: mobility,
      redFlags,
      hasRedFlags: redFlags.length > 0,
      level: suggestedLevel,
      category: TriageUtils.getCategoryFromLevel(suggestedLevel),
      painLevel: painLevel || 0,
      vitals: {
        temperature: temperature ? parseFloat(temperature) : undefined,
        heartRate: heartRate ? parseInt(heartRate) : undefined,
        bloodPressureSystolic: systolic ? parseInt(systolic) : undefined,
        bloodPressureDiastolic: diastolic ? parseInt(diastolic) : undefined,
        respiratoryRate: respiratoryRate ? parseInt(respiratoryRate) : undefined,
        oxygenSaturation: oxygenSat ? parseFloat(oxygenSat) : undefined,
        weightEstimated: false,
        pupilsEqual: true,
      },
      isolationRequired,
      assignedArea,
    };

    console.log('Triage Data:', triageData);
    // TODO: Call API to save triage
    alert(`Triage enregistré avec succès!\nNiveau: ${suggestedLevel} - ${levelConfig.name}`);
  };

  // Toggle red flag
  const toggleRedFlag = (flag: RedFlag) => {
    setRedFlags(prev => 
      prev.includes(flag) 
        ? prev.filter(f => f !== flag)
        : [...prev, flag]
    );
  };

  // Red flag labels
  const redFlagLabels: Record<RedFlag, string> = {
    'chest_pain': 'Douleur Thoracique',
    'stroke_symptoms': 'Symptômes AVC',
    'severe_bleeding': 'Hémorragie Sévère',
    'difficulty_breathing': 'Difficulté Respiratoire',
    'altered_consciousness': 'Conscience Altérée',
    'severe_trauma': 'Trauma Sévère',
    'high_fever_child': 'Fièvre Élevée (Enfant)',
    'seizure': 'Convulsions',
    'severe_allergic_reaction': 'Réaction Allergique',
    'suicidal_ideation': 'Idées Suicidaires',
    'obstetric_emergency': 'Urgence Obstétrique',
    'severe_pain': 'Douleur Sévère (9-10)',
    'abnormal_vitals': 'Signes Vitaux Anormaux',
    'toxic_exposure': 'Exposition Toxique',
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🏥 Nouveau Triage</Text>
          <Text style={styles.headerSubtitle}>Évaluation initiale du patient aux urgences</Text>
        </View>
      </View>

      {/* Suggested Level Display */}
      <View style={[styles.suggestedLevel, { borderColor: levelConfig.color }]}>
        <View style={[styles.suggestedLevelBadge, { backgroundColor: levelConfig.color }]}>
          <Text style={styles.suggestedLevelNumber}>{suggestedLevel}</Text>
        </View>
        <View style={styles.suggestedLevelInfo}>
          <Text style={styles.suggestedLevelTitle}>Niveau Suggéré: {levelConfig.name}</Text>
          <Text style={styles.suggestedLevelDesc}>{levelConfig.description}</Text>
          <Text style={[styles.suggestedLevelWait, { color: levelConfig.color }]}>
            Délai max: {levelConfig.maxWaitTime === 0 ? 'Immédiat' : `${levelConfig.maxWaitTime} min`}
          </Text>
        </View>
      </View>

      {/* ══════ SECTION: Patient ══════ */}
      <SectionHeader title="Identification Patient" icon="person" accentColor={colors.info} />
      <View style={styles.card}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher patient (nom, ID, téléphone)..."
            placeholderTextColor={colors.textSecondary}
            value={patientSearch}
            onChangeText={setPatientSearch}
          />
        </View>
        <TouchableOpacity 
          style={styles.newPatientBtn} 
          activeOpacity={0.7}
          onPress={onNavigateToRegisterPatient}
        >
          <Ionicons name="add-circle" size={18} color={colors.primary} />
          <Text style={styles.newPatientBtnText}>Enregistrer Nouveau Patient</Text>
        </TouchableOpacity>
        
        {/* Patient List */}
        {loadingPatients ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.info} />
            <Text style={styles.loadingText}>Chargement des patients...</Text>
          </View>
        ) : filteredPatients.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="person-outline" size={40} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>Aucun patient trouvé</Text>
          </View>
        ) : (
          <View style={styles.patientList}>
            {filteredPatients.map((patient) => (
              <TouchableOpacity
                key={patient.id}
                style={[
                  styles.patientListItem,
                  selectedPatientId === patient.id && styles.patientListItemSelected,
                ]}
                onPress={() => handleSelectPatient(patient)}
                activeOpacity={0.7}
              >
                <View style={styles.patientListItemContent}>
                  <View style={styles.patientListItemHeader}>
                    <Text style={styles.patientListItemName}>
                      {patient.firstName} {patient.lastName}
                    </Text>
                    <Text style={styles.patientListItemAge}>
                      {calculateAge(patient.dateOfBirth)} ans
                    </Text>
                  </View>
                  <Text style={styles.patientListItemMeta}>
                    {patient.patientNumber} • {patient.phone || '—'}
                  </Text>
                </View>
                {selectedPatientId === patient.id && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      
      {/* Selected Patient Info */}
      {selectedPatient && (
        <View style={styles.selectedPatientInfo}>
          <View style={styles.selectedPatientRow}>
            <Ionicons name="person" size={24} color={colors.info} />
            <View style={styles.selectedPatientText}>
              <Text style={styles.selectedPatientName}>
                {selectedPatient.firstName} {selectedPatient.lastName}
              </Text>
              <Text style={styles.selectedPatientMeta}>
                {selectedPatient.patientNumber} • {calculateAge(selectedPatient.dateOfBirth)} ans • {selectedPatient.phone}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* ══════ SECTION: Plainte Principale ══════ */}
      <SectionHeader title="Plainte Principale" icon="medical" accentColor={colors.warning} />
      <View style={styles.card}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Motif de Consultation *</Text>
          <TextInput
            style={styles.textArea}
            value={chiefComplaint}
            onChangeText={setChiefComplaint}
            placeholder="Décrivez la plainte principale du patient..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={3}
          />
        </View>
        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Début des Symptômes</Text>
            <TextInput
              style={styles.input}
              value={symptomOnset}
              onChangeText={setSymptomOnset}
              placeholder="Ex: 2 heures, 3 jours..."
              placeholderTextColor={colors.textTertiary}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Évolution</Text>
            <SelectionButton
              options={['improving', 'stable', 'worsening'] as const}
              value={symptomProgression}
              onChange={setSymptomProgression}
              labels={{
                improving: '↑ Mieux',
                stable: '→ Stable',
                worsening: '↓ Pire',
              }}
              colorMap={{
                improving: colors.success,
                stable: colors.info,
                worsening: colors.error,
              }}
            />
          </View>
        </View>
      </View>

      {/* ══════ SECTION: Signes Vitaux ══════ */}
      <SectionHeader title="Signes Vitaux" icon="pulse" accentColor={colors.error} />
      <View style={styles.card}>
        <View style={styles.vitalsGrid}>
          <VitalInput
            label="Température"
            value={temperature}
            onChangeText={setTemperature}
            unit="°C"
            icon="thermometer"
            iconColor={colors.warning}
          />
          <VitalInput
            label="TA Systolique"
            value={systolic}
            onChangeText={setSystolic}
            unit="mmHg"
            icon="speedometer"
            iconColor={colors.error}
          />
          <VitalInput
            label="TA Diastolique"
            value={diastolic}
            onChangeText={setDiastolic}
            unit="mmHg"
            icon="speedometer-outline"
            iconColor={colors.error}
          />
          <VitalInput
            label="Fréq. Cardiaque"
            value={heartRate}
            onChangeText={setHeartRate}
            unit="bpm"
            icon="heart"
            iconColor={colors.error}
          />
          <VitalInput
            label="Fréq. Respiratoire"
            value={respiratoryRate}
            onChangeText={setRespiratoryRate}
            unit="/min"
            icon="fitness"
            iconColor={colors.info}
          />
          <VitalInput
            label="SpO2"
            value={oxygenSat}
            onChangeText={setOxygenSat}
            unit="%"
            icon="water"
            iconColor={colors.info}
          />
          <VitalInput
            label="Glycémie"
            value={bloodGlucose}
            onChangeText={setBloodGlucose}
            unit="mg/dL"
            icon="analytics"
            iconColor={colors.secondary}
          />
        </View>
      </View>

      {/* ══════ SECTION: Évaluation Douleur ══════ */}
      <SectionHeader title="Évaluation Douleur" icon="flash" accentColor={colors.warning} />
      <View style={styles.card}>
        <Text style={styles.inputLabel}>Niveau de Douleur (0-10)</Text>
        <View style={styles.painScale}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => {
            const isSelected = painLevel === level;
            let bgColor = colors.outline;
            if (level <= 3) bgColor = colors.success;
            else if (level <= 6) bgColor = colors.warning;
            else bgColor = colors.error;
            return (
              <TouchableOpacity
                key={level}
                style={[
                  styles.painBtn,
                  isSelected && { backgroundColor: bgColor, borderColor: bgColor },
                ]}
                onPress={() => setPainLevel(level)}
                activeOpacity={0.7}
              >
                <Text style={[styles.painBtnText, isSelected && { color: '#FFF' }]}>
                  {level}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Localisation de la Douleur</Text>
          <TextInput
            style={styles.input}
            value={painLocation}
            onChangeText={setPainLocation}
            placeholder="Ex: Poitrine, Abdomen, Tête..."
            placeholderTextColor={colors.textTertiary}
          />
        </View>
      </View>

      {/* ══════ SECTION: Évaluation Clinique (ABCDE) ══════ */}
      <SectionHeader title="Évaluation Clinique (ABCDE)" icon="shield-checkmark" accentColor={colors.secondary} />
      <View style={styles.card}>
        {/* Consciousness (AVPU) */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Niveau de Conscience (AVPU)</Text>
          <SelectionButton
            options={['alert', 'verbal', 'pain', 'unresponsive'] as ConsciousnessLevel[]}
            value={consciousness}
            onChange={setConsciousness}
            labels={{
              alert: 'Alerte',
              verbal: 'Verbal',
              pain: 'Douleur',
              unresponsive: 'Inconscient',
            }}
            colorMap={{
              alert: colors.success,
              verbal: colors.warning,
              pain: colors.error,
              unresponsive: '#7C3AED',
            }}
          />
        </View>

        {/* Airway */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Voies Aériennes</Text>
          <SelectionButton
            options={['patent', 'at_risk', 'compromised', 'obstructed'] as AirwayStatus[]}
            value={airway}
            onChange={setAirway}
            labels={{
              patent: 'Libres',
              at_risk: 'À Risque',
              compromised: 'Compromises',
              obstructed: 'Obstruées',
            }}
            colorMap={{
              patent: colors.success,
              at_risk: colors.warning,
              compromised: colors.error,
              obstructed: '#7C3AED',
            }}
          />
        </View>

        {/* Breathing */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Respiration</Text>
          <SelectionButton
            options={['normal', 'labored', 'distressed', 'apneic', 'assisted'] as BreathingStatus[]}
            value={breathing}
            onChange={setBreathing}
            labels={{
              normal: 'Normale',
              labored: 'Laborieuse',
              distressed: 'Détresse',
              apneic: 'Apnée',
              assisted: 'Assistée',
            }}
            colorMap={{
              normal: colors.success,
              labored: colors.warning,
              distressed: colors.error,
              apneic: '#7C3AED',
              assisted: colors.info,
            }}
          />
        </View>

        {/* Circulation */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Circulation</Text>
          <SelectionButton
            options={['normal', 'compensated', 'decompensated', 'arrest'] as CirculationStatus[]}
            value={circulation}
            onChange={setCirculation}
            labels={{
              normal: 'Normale',
              compensated: 'Compensé',
              decompensated: 'Décompensé',
              arrest: 'Arrêt',
            }}
            colorMap={{
              normal: colors.success,
              compensated: colors.warning,
              decompensated: colors.error,
              arrest: '#7C3AED',
            }}
          />
        </View>

        {/* Mobility */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Mobilité</Text>
          <SelectionButton
            options={['ambulatory', 'assisted', 'wheelchair', 'stretcher', 'immobile'] as MobilityStatus[]}
            value={mobility}
            onChange={setMobility}
            labels={{
              ambulatory: 'Ambulant',
              assisted: 'Aidé',
              wheelchair: 'Fauteuil',
              stretcher: 'Brancard',
              immobile: 'Immobile',
            }}
          />
        </View>
      </View>

      {/* ══════ SECTION: Drapeaux Rouges ══════ */}
      <SectionHeader title="Drapeaux Rouges ⚠️" icon="warning" accentColor={colors.error} />
      <View style={styles.card}>
        <Text style={styles.redFlagHint}>Sélectionnez les conditions présentes:</Text>
        <View style={styles.redFlagsGrid}>
          {(Object.keys(redFlagLabels) as RedFlag[]).map((flag) => (
            <RedFlagChip
              key={flag}
              flag={flag}
              isSelected={redFlags.includes(flag)}
              onToggle={() => toggleRedFlag(flag)}
              label={redFlagLabels[flag]}
            />
          ))}
        </View>
      </View>

      {/* ══════ SECTION: Dépistage Infectieux ══════ */}
      <SectionHeader title="Dépistage Infectieux" icon="bug" accentColor={colors.info} />
      <View style={styles.card}>
        <View style={styles.checkboxRow}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setFeverScreening(!feverScreening)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={feverScreening ? 'checkbox' : 'square-outline'}
              size={22}
              color={feverScreening ? colors.warning : colors.textSecondary}
            />
            <Text style={styles.checkboxText}>Fièvre (&gt;38°C)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setRespiratorySymptoms(!respiratorySymptoms)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={respiratorySymptoms ? 'checkbox' : 'square-outline'}
              size={22}
              color={respiratorySymptoms ? colors.warning : colors.textSecondary}
            />
            <Text style={styles.checkboxText}>Symptômes Respiratoires</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setIsolationRequired(!isolationRequired)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isolationRequired ? 'checkbox' : 'square-outline'}
              size={22}
              color={isolationRequired ? colors.error : colors.textSecondary}
            />
            <Text style={[styles.checkboxText, isolationRequired && { color: colors.error }]}>
              Isolation Requise
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ══════ SECTION: Affectation ══════ */}
      <SectionHeader title="Affectation" icon="location" accentColor={colors.success} />
      <View style={styles.card}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Zone d'Affectation</Text>
          <View style={styles.areaButtons}>
            {[
              { id: 'resus', label: 'Réanimation', color: colors.error },
              { id: 'trauma', label: 'Trauma', color: '#EA580C' },
              { id: 'priority', label: 'Prioritaire', color: colors.warning },
              { id: 'general', label: 'Générale', color: colors.success },
              { id: 'pediatric', label: 'Pédiatrie', color: colors.info },
              { id: 'isolation', label: 'Isolation', color: '#7C3AED' },
            ].map((area) => (
              <TouchableOpacity
                key={area.id}
                style={[
                  styles.areaBtn,
                  assignedArea === area.label && { backgroundColor: area.color, borderColor: area.color },
                ]}
                onPress={() => setAssignedArea(area.label)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.areaBtnText,
                  assignedArea === area.label && { color: '#FFF' },
                ]}>
                  {area.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* ══════ Action Buttons ══════ */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.7}>
          <Text style={styles.cancelBtnText}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.submitBtn, { backgroundColor: levelConfig.color }]} 
          activeOpacity={0.7}
          onPress={handleSubmitTriage}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFF" />
          <Text style={styles.submitBtnText}>Enregistrer Triage (Niveau {suggestedLevel})</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: isDesktop ? 32 : 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Suggested Level
  suggestedLevel: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 16,
    marginBottom: 24,
    borderWidth: 2,
    ...shadows.sm,
  },
  suggestedLevelBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  suggestedLevelNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
  },
  suggestedLevelInfo: {
    flex: 1,
  },
  suggestedLevelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  suggestedLevelDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  suggestedLevelWait: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 16,
    marginBottom: 20,
    ...shadows.sm,
  },

  // Search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  newPatientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    borderStyle: 'dashed',
    justifyContent: 'center',
  },
  newPatientBtnText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },

  // Patient List
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  patientList: {
    marginTop: 12,
    gap: 8,
  },
  patientListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  patientListItemSelected: {
    borderColor: colors.success,
    backgroundColor: colors.success + '08',
  },
  patientListItemContent: {
    flex: 1,
  },
  patientListItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  patientListItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  patientListItemAge: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  patientListItemMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Selected Patient Info
  selectedPatientInfo: {
    backgroundColor: colors.info + '12',
    borderRadius: borderRadius.lg,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
  },
  selectedPatientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedPatientText: {
    flex: 1,
  },
  selectedPatientName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  selectedPatientMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  textArea: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: isDesktop ? 'row' : 'column',
    gap: 16,
  },

  // Selection Buttons
  selectionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceVariant,
  },
  selectionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // Vitals
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  vitalInputContainer: {
    width: isDesktop ? 'auto' : '47%',
    minWidth: 120,
  },
  vitalInputLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  vitalInputLabelText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  vitalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    paddingHorizontal: 10,
  },
  vitalInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    paddingVertical: 10,
  },
  vitalUnit: {
    fontSize: 12,
    color: colors.textTertiary,
    marginLeft: 4,
  },

  // Pain Scale
  painScale: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  painBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceVariant,
  },
  painBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // Red Flags
  redFlagHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  redFlagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  redFlagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceVariant,
  },
  redFlagChipSelected: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  redFlagChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Checkboxes
  checkboxRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxText: {
    fontSize: 14,
    color: colors.text,
  },

  // Area Buttons
  areaButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  areaBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceVariant,
  },
  areaBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
});

export default TriageScreen;
