import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import ApiService from '../../../services/ApiService';
import { Triage, TriageLevel, TriageStatus, TRIAGE_LEVEL_CONFIG, TriageUtils } from '../../../models/Triage';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

// ─── Sample Data ─────────────────────────────────────────────
const sampleTriages: Triage[] = [
  {
    id: '1',
    encounterId: 'E260001',
    patientId: 'P1001',
    nurseId: 'N001',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    triageNumber: 'TR260001',
    triageDate: new Date().toISOString(),
    level: 1,
    category: 'resuscitation',
    acuity: 'critical',
    chiefComplaint: 'Douleur thoracique sévère, essoufflement',
    symptomOnset: '2 heures',
    vitals: {
      temperature: 37.2,
      bloodPressureSystolic: 90,
      bloodPressureDiastolic: 60,
      heartRate: 110,
      respiratoryRate: 28,
      oxygenSaturation: 88,
      weightEstimated: false,
      pupilsEqual: true,
    },
    painLevel: 9,
    consciousnessLevel: 'alert',
    airwayStatus: 'patent',
    breathingStatus: 'distressed',
    circulationStatus: 'compensated',
    mobilityStatus: 'stretcher',
    allergiesVerified: true,
    immunocompromised: false,
    redFlags: ['chest_pain', 'difficulty_breathing'],
    hasRedFlags: true,
    isTrauma: false,
    feverScreening: false,
    respiratorySymptoms: true,
    isolationRequired: false,
    status: 'in_treatment',
    assignedArea: 'Salle de Réanimation',
    assignedDoctor: 'Dr. Kalala',
    arrivalTime: new Date(Date.now() - 30 * 60000).toISOString(),
    triageStartTime: new Date(Date.now() - 25 * 60000).toISOString(),
    triageEndTime: new Date(Date.now() - 20 * 60000).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    encounterId: 'E260002',
    patientId: 'P1002',
    nurseId: 'N001',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    triageNumber: 'TR260002',
    triageDate: new Date().toISOString(),
    level: 2,
    category: 'emergency',
    acuity: 'high',
    chiefComplaint: 'Fracture ouverte jambe gauche - Accident moto',
    symptomOnset: '1 heure',
    vitals: {
      temperature: 37.0,
      bloodPressureSystolic: 130,
      bloodPressureDiastolic: 85,
      heartRate: 100,
      respiratoryRate: 20,
      oxygenSaturation: 96,
      weightEstimated: false,
      pupilsEqual: true,
    },
    painLevel: 8,
    consciousnessLevel: 'alert',
    airwayStatus: 'patent',
    breathingStatus: 'normal',
    circulationStatus: 'normal',
    mobilityStatus: 'stretcher',
    allergiesVerified: true,
    immunocompromised: false,
    redFlags: ['severe_trauma'],
    hasRedFlags: true,
    isTrauma: true,
    traumaMechanism: 'Accident de moto',
    feverScreening: false,
    respiratorySymptoms: false,
    isolationRequired: false,
    status: 'completed',
    assignedArea: 'Salle de Trauma',
    estimatedWaitTime: 5,
    arrivalTime: new Date(Date.now() - 45 * 60000).toISOString(),
    triageStartTime: new Date(Date.now() - 40 * 60000).toISOString(),
    triageEndTime: new Date(Date.now() - 35 * 60000).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    encounterId: 'E260003',
    patientId: 'P1003',
    nurseId: 'N002',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    triageNumber: 'TR260003',
    triageDate: new Date().toISOString(),
    level: 3,
    category: 'urgent',
    acuity: 'moderate',
    chiefComplaint: 'Fièvre élevée 39.5°C, vomissements depuis hier',
    symptomOnset: '24 heures',
    vitals: {
      temperature: 39.5,
      bloodPressureSystolic: 110,
      bloodPressureDiastolic: 70,
      heartRate: 95,
      respiratoryRate: 18,
      oxygenSaturation: 98,
      weightEstimated: false,
      pupilsEqual: true,
    },
    painLevel: 5,
    consciousnessLevel: 'alert',
    airwayStatus: 'patent',
    breathingStatus: 'normal',
    circulationStatus: 'normal',
    mobilityStatus: 'ambulatory',
    allergiesVerified: true,
    immunocompromised: false,
    redFlags: [],
    hasRedFlags: false,
    isTrauma: false,
    feverScreening: true,
    respiratorySymptoms: false,
    isolationRequired: true,
    status: 'completed',
    assignedArea: 'Salle d\'Attente Prioritaire',
    estimatedWaitTime: 20,
    arrivalTime: new Date(Date.now() - 60 * 60000).toISOString(),
    triageStartTime: new Date(Date.now() - 55 * 60000).toISOString(),
    triageEndTime: new Date(Date.now() - 50 * 60000).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: '4',
    encounterId: 'E260004',
    patientId: 'P1004',
    nurseId: 'N002',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    triageNumber: 'TR260004',
    triageDate: new Date().toISOString(),
    level: 4,
    category: 'semi_urgent',
    acuity: 'low',
    chiefComplaint: 'Entorse cheville droite - Sport',
    symptomOnset: '3 heures',
    vitals: {
      temperature: 36.8,
      bloodPressureSystolic: 120,
      bloodPressureDiastolic: 75,
      heartRate: 72,
      respiratoryRate: 16,
      oxygenSaturation: 99,
      weightEstimated: false,
      pupilsEqual: true,
    },
    painLevel: 4,
    consciousnessLevel: 'alert',
    airwayStatus: 'patent',
    breathingStatus: 'normal',
    circulationStatus: 'normal',
    mobilityStatus: 'assisted',
    allergiesVerified: true,
    immunocompromised: false,
    redFlags: [],
    hasRedFlags: false,
    isTrauma: true,
    traumaMechanism: 'Chute pendant sport',
    feverScreening: false,
    respiratorySymptoms: false,
    isolationRequired: false,
    status: 'completed',
    assignedArea: 'Salle d\'Attente Générale',
    estimatedWaitTime: 45,
    arrivalTime: new Date(Date.now() - 30 * 60000).toISOString(),
    triageStartTime: new Date(Date.now() - 25 * 60000).toISOString(),
    triageEndTime: new Date(Date.now() - 22 * 60000).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: '5',
    encounterId: 'E260005',
    patientId: 'P1005',
    nurseId: 'N001',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    triageNumber: 'TR260005',
    triageDate: new Date().toISOString(),
    level: 5,
    category: 'non_urgent',
    acuity: 'minimal',
    chiefComplaint: 'Renouvellement ordonnance - Hypertension',
    symptomOnset: 'N/A',
    vitals: {
      temperature: 36.6,
      bloodPressureSystolic: 135,
      bloodPressureDiastolic: 85,
      heartRate: 68,
      respiratoryRate: 14,
      oxygenSaturation: 99,
      weightEstimated: false,
      pupilsEqual: true,
    },
    consciousnessLevel: 'alert',
    airwayStatus: 'patent',
    breathingStatus: 'normal',
    circulationStatus: 'normal',
    mobilityStatus: 'ambulatory',
    allergiesVerified: true,
    immunocompromised: false,
    redFlags: [],
    hasRedFlags: false,
    isTrauma: false,
    feverScreening: false,
    respiratorySymptoms: false,
    isolationRequired: false,
    status: 'completed',
    assignedArea: 'Salle d\'Attente Générale',
    estimatedWaitTime: 90,
    arrivalTime: new Date(Date.now() - 20 * 60000).toISOString(),
    triageStartTime: new Date(Date.now() - 15 * 60000).toISOString(),
    triageEndTime: new Date(Date.now() - 12 * 60000).toISOString(),
    createdAt: new Date().toISOString(),
  },
];

const patientNames: Record<string, string> = {
  'P1001': 'Jean Mukendi',
  'P1002': 'Marie Kabamba',
  'P1003': 'Pierre Kasongo',
  'P1004': 'Sophie Mwamba',
  'P1005': 'David Mutombo',
};

// ─── Section Header Component ────────────────────────────────
function SectionHeader({
  title,
  subtitle,
  icon,
  accentColor = colors.error,
  ctaLabel,
  ctaIcon,
  onCtaPress,
}: {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
  ctaLabel?: string;
  ctaIcon?: keyof typeof Ionicons.glyphMap;
  onCtaPress?: () => void;
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
          <View>
            <Text style={secStyles.title}>{title}</Text>
            {subtitle && <Text style={secStyles.subtitle}>{subtitle}</Text>}
          </View>
        </View>
        {ctaLabel && (
          <TouchableOpacity
            style={[secStyles.ctaBtn, { backgroundColor: accentColor }]}
            onPress={onCtaPress}
            activeOpacity={0.7}
          >
            {ctaIcon && <Ionicons name={ctaIcon} size={15} color="#FFF" />}
            <Text style={secStyles.ctaText}>{ctaLabel}</Text>
          </TouchableOpacity>
        )}
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
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  ctaText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
});

// ─── Triage Level Badge ──────────────────────────────────────
function TriageLevelBadge({ level }: { level: TriageLevel }) {
  const config = TRIAGE_LEVEL_CONFIG[level];
  return (
    <View style={[styles.levelBadge, { backgroundColor: config.color }]}>
      <Text style={styles.levelBadgeText}>{level}</Text>
    </View>
  );
}

// ─── Status Badge ────────────────────────────────────────────
function StatusBadge({ status }: { status: TriageStatus }) {
  const color = TriageUtils.getStatusColor(status);
  const labels: Record<TriageStatus, string> = {
    'in_progress': 'En Cours',
    'completed': 'En Attente',
    'in_treatment': 'En Traitement',
    'reassessment_needed': 'Réévaluation',
    'discharged': 'Sorti',
    'admitted': 'Hospitalisé',
    'transferred': 'Transféré',
    'left_before_seen': 'Parti',
    'left_against_advice': 'Parti (AMA)',
  };
  return (
    <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{labels[status]}</Text>
    </View>
  );
}

// ─── Triage Queue Card ───────────────────────────────────────
function TriageQueueCard({ triage, patientName }: { triage: Triage; patientName: string }) {
  const waitTime = TriageUtils.getWaitTime(triage);
  const isOverdue = TriageUtils.isWaitTimeExceeded(triage);
  const config = TRIAGE_LEVEL_CONFIG[triage.level];

  return (
    <TouchableOpacity 
      style={[
        styles.queueCard,
        isOverdue && { borderLeftColor: colors.error, borderLeftWidth: 4 }
      ]}
      activeOpacity={0.7}
    >
      <View style={styles.queueCardHeader}>
        <View style={styles.queueCardLeft}>
          <TriageLevelBadge level={triage.level} />
          <View style={styles.queueCardInfo}>
            <Text style={styles.queueCardName}>{patientName}</Text>
            <Text style={styles.queueCardId}>{triage.triageNumber}</Text>
          </View>
        </View>
        <StatusBadge status={triage.status} />
      </View>

      <View style={styles.queueCardBody}>
        <View style={styles.queueCardRow}>
          <Ionicons name="medical" size={14} color={colors.textSecondary} />
          <Text style={styles.queueCardComplaint} numberOfLines={1}>
            {triage.chiefComplaint}
          </Text>
        </View>
        <View style={styles.queueCardRow}>
          <Ionicons name="location" size={14} color={colors.textSecondary} />
          <Text style={styles.queueCardArea}>{triage.assignedArea}</Text>
        </View>
      </View>

      <View style={styles.queueCardFooter}>
        <View style={styles.queueCardVitals}>
          <View style={styles.vitalItem}>
            <Ionicons name="heart" size={12} color={colors.error} />
            <Text style={styles.vitalText}>{triage.vitals.heartRate}</Text>
          </View>
          <View style={styles.vitalItem}>
            <Ionicons name="speedometer" size={12} color={colors.info} />
            <Text style={styles.vitalText}>
              {triage.vitals.bloodPressureSystolic}/{triage.vitals.bloodPressureDiastolic}
            </Text>
          </View>
          <View style={styles.vitalItem}>
            <Ionicons name="thermometer" size={12} color={colors.warning} />
            <Text style={styles.vitalText}>{triage.vitals.temperature}°C</Text>
          </View>
          <View style={styles.vitalItem}>
            <Text style={[styles.vitalText, { color: triage.vitals.oxygenSaturation! < 95 ? colors.error : colors.success }]}>
              SpO2: {triage.vitals.oxygenSaturation}%
            </Text>
          </View>
        </View>
        <View style={[styles.waitTime, isOverdue && { backgroundColor: colors.errorLight }]}>
          <Ionicons 
            name="time" 
            size={12} 
            color={isOverdue ? colors.error : colors.textSecondary} 
          />
          <Text style={[styles.waitTimeText, isOverdue && { color: colors.error }]}>
            {waitTime} min
          </Text>
        </View>
      </View>

      {triage.hasRedFlags && (
        <View style={styles.redFlagsContainer}>
          {TriageUtils.formatRedFlags(triage.redFlags).map((flag, idx) => (
            <View key={idx} style={styles.redFlagBadge}>
              <Text style={styles.redFlagText}>{flag}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Component ──────────────────────────────────────────
export function EmergencyDashboardScreen({ onNavigateToTriage }: { onNavigateToTriage?: () => void } = {}) {
  const api = ApiService.getInstance();
  
  // State for triages and patients
  const [triages, setTriages] = useState<Triage[]>([]);
  const [patientMap, setPatientMap] = useState<Record<string, { firstName: string; lastName: string }>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<TriageLevel | null>(null);

  // Fetch triages from API
  const loadTriages = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get('/triage/?limit=200&ordering=-triaged_date');
      if (res.success && res.data) {
        const payload = res.data as any;
        const raw: any[] = Array.isArray(payload) ? payload : (payload.results ?? []);
        
        const triageList = raw.map((d: any) => ({
          id: String(d.id),
          encounterId: d.encounter_id ?? '',
          patientId: String(d.patient_id ?? ''),
          nurseId: d.nurse_id ?? '',
          organizationId: d.organization_id ?? '',
          facilityId: d.facility_id ?? '',
          triageNumber: d.triage_number ?? `TR${d.id}`,
          triageDate: d.triage_date ?? new Date().toISOString(),
          level: (d.triage_level ?? 3) as TriageLevel,
          category: d.category ?? 'urgent',
          acuity: d.acuity ?? 'high',
          chiefComplaint: d.chief_complaint ?? '—',
          symptomOnset: d.symptom_onset ?? '—',
          vitals: d.vitals ?? {},
          painLevel: d.pain_level ?? 0,
          consciousnessLevel: d.consciousness_level ?? 'alert',
          airwayStatus: d.airway_status ?? 'patent',
          breathingStatus: d.breathing_status ?? 'normal',
          circulationStatus: d.circulation_status ?? 'normal',
          mobilityStatus: d.mobility_status ?? 'ambulatory',
          allergiesVerified: d.allergies_verified ?? false,
          immunocompromised: d.immunocompromised ?? false,
          redFlags: Array.isArray(d.red_flags) ? d.red_flags : [],
          hasRedFlags: (Array.isArray(d.red_flags) ? d.red_flags.length : 0) > 0,
          isTrauma: d.is_trauma ?? false,
          feverScreening: d.fever_screening ?? false,
          respiratorySymptoms: d.respiratory_symptoms ?? false,
          isolationRequired: d.isolation_required ?? false,
          status: (d.status ?? 'in_progress') as TriageStatus,
          assignedArea: d.assigned_area ?? '—',
          assignedDoctor: d.assigned_doctor ?? '—',
          arrivalTime: d.arrival_time ?? new Date().toISOString(),
          triageStartTime: d.triage_start_time,
          triageEndTime: d.triage_end_time,
          createdAt: d.created_at ?? new Date().toISOString(),
          accessCount: 0,
        }));
        
        setTriages(triageList);
        
        // Fetch patient details for all triages
        const uniquePatientIds = [...new Set(triageList.map(t => t.patientId))];
        if (uniquePatientIds.length > 0) {
          try {
            const patientRes = await api.get(`/patients/?id__in=${uniquePatientIds.join(',')}`);
            if (patientRes.success && patientRes.data) {
              const patientPayload = patientRes.data as any;
              const patientList: any[] = Array.isArray(patientPayload) ? patientPayload : (patientPayload.results ?? []);
              const map: Record<string, { firstName: string; lastName: string }> = {};
              patientList.forEach((p: any) => {
                map[String(p.id)] = {
                  firstName: p.first_name ?? '',
                  lastName: p.last_name ?? '',
                };
              });
              setPatientMap(map);
            }
          } catch (err) {
            console.error('[EmergencyDashboard] Error fetching patients:', err);
          }
        }
      }
    } catch (err) {
      console.error('[EmergencyDashboard] Error loading triages:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api]);

  useEffect(() => {
    setLoading(true);
    loadTriages();
  }, [loadTriages]);

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: triages.length,
      byLevel: {
        1: triages.filter(t => t.level === 1).length,
        2: triages.filter(t => t.level === 2).length,
        3: triages.filter(t => t.level === 3).length,
        4: triages.filter(t => t.level === 4).length,
        5: triages.filter(t => t.level === 5).length,
      },
      inTreatment: triages.filter(t => t.status === 'in_treatment').length,
      waiting: triages.filter(t => t.status === 'completed' || t.status === 'in_progress').length,
      avgWait: triages.length > 0 ? Math.round(triages.reduce((acc, t) => acc + TriageUtils.getWaitTime(t), 0) / triages.length) : 0,
    };
  }, [triages]);

  // Filter triages
  const filteredTriages = useMemo(() => {
    return triages.filter(t => {
      if (selectedLevel && t.level !== selectedLevel) return false;
      if (searchQuery) {
        const firstName = patientMap[t.patientId]?.firstName?.toLowerCase() || '';
        const lastName = patientMap[t.patientId]?.lastName?.toLowerCase() || '';
        const name = `${firstName} ${lastName}`;
        const query = searchQuery.toLowerCase();
        return name.includes(query) || t.triageNumber.toLowerCase().includes(query) || t.chiefComplaint.toLowerCase().includes(query);
      }
      return true;
    }).sort((a, b) => a.level - b.level);
  }, [triages, patientMap, selectedLevel, searchQuery]); // Sort by priority

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={() => {
            setRefreshing(true);
            loadTriages();
          }}
        />
      }
    >
      {/* Loading Error */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={24} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => {
            setLoading(true);
            loadTriages();
          }}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading State */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.error} />
          <Text style={styles.loadingText}>Chargement des urgences...</Text>
        </View>
      ) : (
        <>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>🚨 Urgences</Text>
              <Text style={styles.headerSubtitle}>Tableau de bord du service d'urgence</Text>
            </View>
            <TouchableOpacity 
              style={styles.addBtn} 
              activeOpacity={0.7}
              onPress={onNavigateToTriage}
            >
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.addBtnText}>Nouveau Triage</Text>
            </TouchableOpacity>
          </View>

      {/* ══════ SECTION: Niveaux de Triage ══════ */}
      <SectionHeader
        title="Niveaux de Triage"
        subtitle="Répartition des patients par priorité"
        icon="speedometer"
        accentColor={colors.error}
      />
      <View style={styles.levelCards}>
        {([1, 2, 3, 4, 5] as TriageLevel[]).map((level) => {
          const config = TRIAGE_LEVEL_CONFIG[level];
          const count = stats.byLevel[level];
          const isSelected = selectedLevel === level;
          return (
            <TouchableOpacity
              key={level}
              style={[
                styles.levelCard,
                { borderColor: config.color },
                isSelected && { backgroundColor: config.color + '15' },
              ]}
              onPress={() => setSelectedLevel(isSelected ? null : level)}
              activeOpacity={0.7}
            >
              <View style={[styles.levelCardBadge, { backgroundColor: config.color }]}>
                <Text style={styles.levelCardBadgeText}>{level}</Text>
              </View>
              <Text style={styles.levelCardName}>{config.name}</Text>
              <Text style={[styles.levelCardCount, { color: config.color }]}>{count}</Text>
              <Text style={styles.levelCardWait}>≤{config.maxWaitTime} min</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ══════ SECTION: Statistiques Rapides ══════ */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.errorLight }]}>
          <Ionicons name="pulse" size={24} color={colors.error} />
          <Text style={styles.statValue}>{stats.inTreatment}</Text>
          <Text style={styles.statLabel}>En Traitement</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.warningLight }]}>
          <Ionicons name="hourglass" size={24} color={colors.warning} />
          <Text style={styles.statValue}>{stats.waiting}</Text>
          <Text style={styles.statLabel}>En Attente</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.infoLight }]}>
          <Ionicons name="time" size={24} color={colors.info} />
          <Text style={styles.statValue}>{stats.avgWait} min</Text>
          <Text style={styles.statLabel}>Attente Moy.</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.successLight }]}>
          <Ionicons name="people" size={24} color={colors.success} />
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Patients</Text>
        </View>
      </View>

      {/* ══════ SECTION: File d'Attente ══════ */}
      <SectionHeader
        title="File d'Attente"
        subtitle={`${filteredTriages.length} patients`}
        icon="list"
        accentColor={colors.warning}
        ctaLabel="Actualiser"
        ctaIcon="refresh"
        onCtaPress={() => {
          setLoading(true);
          loadTriages();
        }}
      />

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher patient, numéro, plainte..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Queue List */}
      <View style={styles.queueList}>
        {filteredTriages.map((triage) => {
          const patient = patientMap[triage.patientId];
          const patientName = patient ? `${patient.firstName} ${patient.lastName}` : 'Inconnu';
          return (
            <TriageQueueCard
              key={triage.id}
              triage={triage}
              patientName={patientName}
            />
          );
        })}
        {filteredTriages.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            <Text style={styles.emptyStateText}>Aucun patient en attente</Text>
          </View>
        )}
      </View>
        </>
      )}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.error,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  addBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },

  // Level Cards
  levelCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  levelCard: {
    flex: isDesktop ? 1 : undefined,
    width: isDesktop ? undefined : (width - 48) / 2.5,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    ...shadows.sm,
  },
  levelCardBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  levelCardBadgeText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  levelCardName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  levelCardCount: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  levelCardWait: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 2,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: isDesktop ? 1 : undefined,
    width: isDesktop ? undefined : (width - 48) / 2,
    padding: 16,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Search
  searchContainer: {
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },

  // Queue List
  queueList: {
    gap: 12,
  },
  queueCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 16,
    ...shadows.sm,
  },
  queueCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  queueCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  queueCardInfo: {},
  queueCardName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  queueCardId: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  queueCardBody: {
    gap: 6,
    marginBottom: 12,
  },
  queueCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  queueCardComplaint: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  queueCardArea: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  queueCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  queueCardVitals: {
    flexDirection: 'row',
    gap: 12,
  },
  vitalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vitalText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  waitTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  waitTimeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // Badges
  levelBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Red Flags
  redFlagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  redFlagBadge: {
    backgroundColor: colors.errorLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  redFlagText: {
    fontSize: 11,
    color: colors.error,
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
  },
});

export default EmergencyDashboardScreen;
