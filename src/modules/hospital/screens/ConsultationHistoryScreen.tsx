import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { Encounter, EncounterType, EncounterStatus } from '../../../models/Encounter';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

const ACCENT = colors.info;

// ═══════════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════════

interface ConsultationRecord {
  id: string;
  patientId: string;
  patientName: string;
  patientNumber: string;
  patientAge: number;
  patientGender: 'male' | 'female';
  encounterType: EncounterType;
  encounterDate: string;
  chiefComplaint: string;
  diagnoses: {
    code?: string;
    description: string;
    type: 'primary' | 'secondary' | 'differential';
  }[];
  vitals?: {
    temperature?: number;
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    heartRate?: number;
    oxygenSaturation?: number;
  };
  prescriptions: {
    medication: string;
    dosage: string;
    frequency: string;
    duration: string;
  }[];
  labOrders: string[];
  disposition: 'discharged' | 'admitted' | 'transferred' | 'observation';
  doctorName: string;
  departmentName: string;
  status: EncounterStatus;
  notes?: string;
  followUpDate?: string;
}

// ═══════════════════════════════════════════════════════════════
//  SAMPLE DATA
// ═══════════════════════════════════════════════════════════════

const SAMPLE_CONSULTATIONS: ConsultationRecord[] = [
  {
    id: 'C001',
    patientId: 'P001',
    patientName: 'Jean Mukendi',
    patientNumber: 'PAT-0001',
    patientAge: 39,
    patientGender: 'male',
    encounterType: 'outpatient',
    encounterDate: '2024-01-15T10:30:00',
    chiefComplaint: 'Douleur thoracique depuis 2 jours, aggravée à l\'effort',
    diagnoses: [
      { code: 'I20.9', description: 'Angine de poitrine, sans précision', type: 'primary' },
      { code: 'I10', description: 'Hypertension artérielle essentielle', type: 'secondary' },
    ],
    vitals: {
      temperature: 36.8,
      bloodPressureSystolic: 150,
      bloodPressureDiastolic: 95,
      heartRate: 88,
      oxygenSaturation: 97,
    },
    prescriptions: [
      { medication: 'Amlodipine', dosage: '10mg', frequency: '1x/jour', duration: '30 jours' },
      { medication: 'Aspirine', dosage: '100mg', frequency: '1x/jour', duration: '30 jours' },
      { medication: 'Isosorbide dinitrate', dosage: '5mg', frequency: 'PRN', duration: '10 jours' },
    ],
    labOrders: ['ECG', 'Troponine', 'NFS', 'Bilan lipidique'],
    disposition: 'discharged',
    doctorName: 'Dr. Kabongo Pierre',
    departmentName: 'Cardiologie',
    status: 'completed',
    notes: 'Patient à revoir dans 2 semaines avec résultats ECG et bilan lipidique.',
    followUpDate: '2024-01-29',
  },
  {
    id: 'C002',
    patientId: 'P002',
    patientName: 'Marie Kabamba',
    patientNumber: 'PAT-0002',
    patientAge: 32,
    patientGender: 'female',
    encounterType: 'emergency',
    encounterDate: '2024-01-14T22:15:00',
    chiefComplaint: 'Fièvre élevée, toux productive, difficultés respiratoires',
    diagnoses: [
      { code: 'J18.9', description: 'Pneumonie, sans précision', type: 'primary' },
    ],
    vitals: {
      temperature: 39.2,
      bloodPressureSystolic: 110,
      bloodPressureDiastolic: 70,
      heartRate: 102,
      oxygenSaturation: 92,
    },
    prescriptions: [
      { medication: 'Amoxicilline', dosage: '1g', frequency: '3x/jour', duration: '10 jours' },
      { medication: 'Paracétamol', dosage: '1g', frequency: 'toutes les 6h', duration: '5 jours' },
      { medication: 'N-Acétylcystéine', dosage: '200mg', frequency: '3x/jour', duration: '7 jours' },
    ],
    labOrders: ['Radiographie thorax', 'NFS', 'CRP'],
    disposition: 'admitted',
    doctorName: 'Dr. Mutombo Sarah',
    departmentName: 'Médecine Interne',
    status: 'in_progress',
    notes: 'Hospitalisation pour surveillance et antibiothérapie IV.',
  },
  {
    id: 'C003',
    patientId: 'P003',
    patientName: 'Pierre Kasongo',
    patientNumber: 'PAT-0003',
    patientAge: 46,
    patientGender: 'male',
    encounterType: 'follow_up',
    encounterDate: '2024-01-12T14:00:00',
    chiefComplaint: 'Suivi diabète - contrôle glycémique',
    diagnoses: [
      { code: 'E11', description: 'Diabète sucré de type 2', type: 'primary' },
      { code: 'E78.0', description: 'Hypercholestérolémie', type: 'secondary' },
    ],
    vitals: {
      bloodPressureSystolic: 125,
      bloodPressureDiastolic: 82,
      heartRate: 76,
    },
    prescriptions: [
      { medication: 'Metformine', dosage: '850mg', frequency: '2x/jour', duration: '90 jours' },
      { medication: 'Gliclazide', dosage: '60mg', frequency: '1x/jour', duration: '90 jours' },
      { medication: 'Atorvastatine', dosage: '20mg', frequency: '1x/jour au coucher', duration: '90 jours' },
    ],
    labOrders: ['HbA1c', 'Glycémie à jeun', 'Bilan lipidique', 'Créatinine'],
    disposition: 'discharged',
    doctorName: 'Dr. Kalala Joseph',
    departmentName: 'Endocrinologie',
    status: 'completed',
    notes: 'HbA1c = 7.2%. Bon contrôle. Continuer traitement actuel.',
    followUpDate: '2024-04-12',
  },
  {
    id: 'C004',
    patientId: 'P001',
    patientName: 'Jean Mukendi',
    patientNumber: 'PAT-0001',
    patientAge: 39,
    patientGender: 'male',
    encounterType: 'outpatient',
    encounterDate: '2023-12-10T09:00:00',
    chiefComplaint: 'Céphalées récurrentes depuis 3 semaines',
    diagnoses: [
      { code: 'G43.9', description: 'Migraine, sans précision', type: 'primary' },
    ],
    vitals: {
      bloodPressureSystolic: 145,
      bloodPressureDiastolic: 90,
      heartRate: 72,
    },
    prescriptions: [
      { medication: 'Paracétamol', dosage: '1g', frequency: 'PRN max 4x/jour', duration: '14 jours' },
      { medication: 'Sumatriptan', dosage: '50mg', frequency: 'Au début de la migraine', duration: '10 comprimés' },
    ],
    labOrders: [],
    disposition: 'discharged',
    doctorName: 'Dr. Mbuyi Anne',
    departmentName: 'Neurologie',
    status: 'completed',
    notes: 'Tenir un journal des migraines. Revoir si fréquence augmente.',
  },
  {
    id: 'C005',
    patientId: 'P004',
    patientName: 'Sophie Lukusa',
    patientNumber: 'PAT-0004',
    patientAge: 28,
    patientGender: 'female',
    encounterType: 'outpatient',
    encounterDate: '2024-01-10T11:30:00',
    chiefComplaint: 'Douleurs abdominales basses, règles irrégulières',
    diagnoses: [
      { code: 'N92.1', description: 'Ménorragies', type: 'primary' },
      { code: 'D25.9', description: 'Léiomyome utérin, sans précision', type: 'differential' },
    ],
    vitals: {
      bloodPressureSystolic: 115,
      bloodPressureDiastolic: 72,
      heartRate: 80,
    },
    prescriptions: [
      { medication: 'Acide tranexamique', dosage: '500mg', frequency: '3x/jour pendant les règles', duration: '3 cycles' },
      { medication: 'Fer + Acide folique', dosage: '1 cp', frequency: '1x/jour', duration: '30 jours' },
    ],
    labOrders: ['NFS', 'Échographie pelvienne', 'Ferritine'],
    disposition: 'discharged',
    doctorName: 'Dr. Tshimanga Claire',
    departmentName: 'Gynécologie',
    status: 'completed',
    followUpDate: '2024-02-10',
  },
];

// ═══════════════════════════════════════════════════════════════
//  FILTER OPTIONS
// ═══════════════════════════════════════════════════════════════

const ENCOUNTER_TYPE_OPTIONS = [
  { key: 'all', label: 'Tous' },
  { key: 'outpatient', label: 'Consultation' },
  { key: 'emergency', label: 'Urgence' },
  { key: 'follow_up', label: 'Suivi' },
  { key: 'inpatient', label: 'Hospitalisation' },
];

const STATUS_OPTIONS = [
  { key: 'all', label: 'Tous' },
  { key: 'completed', label: 'Terminé' },
  { key: 'in_progress', label: 'En cours' },
  { key: 'cancelled', label: 'Annulé' },
];

const PERIOD_OPTIONS = [
  { key: 'all', label: 'Toute période' },
  { key: 'today', label: 'Aujourd\'hui' },
  { key: 'week', label: 'Cette semaine' },
  { key: 'month', label: 'Ce mois' },
  { key: '3months', label: '3 derniers mois' },
];

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getEncounterTypeLabel(type: EncounterType): string {
  switch (type) {
    case 'outpatient':
      return 'Consultation';
    case 'emergency':
      return 'Urgence';
    case 'follow_up':
      return 'Suivi';
    case 'inpatient':
      return 'Hospitalisation';
    default:
      return type;
  }
}

function getEncounterTypeColor(type: EncounterType): string {
  switch (type) {
    case 'outpatient':
      return colors.info;
    case 'emergency':
      return colors.error;
    case 'follow_up':
      return colors.success;
    case 'inpatient':
      return colors.warning;
    default:
      return colors.textSecondary;
  }
}

function getStatusLabel(status: EncounterStatus): string {
  switch (status) {
    case 'completed':
      return 'Terminé';
    case 'in_progress':
      return 'En cours';
    case 'cancelled':
      return 'Annulé';
    case 'scheduled':
      return 'Planifié';
    default:
      return status;
  }
}

function getStatusColor(status: EncounterStatus): string {
  switch (status) {
    case 'completed':
      return colors.success;
    case 'in_progress':
      return colors.warning;
    case 'cancelled':
      return colors.error;
    case 'scheduled':
      return colors.info;
    default:
      return colors.textSecondary;
  }
}

function isInPeriod(dateString: string, period: string): boolean {
  if (period === 'all') return true;
  const date = new Date(dateString);
  const now = new Date();

  switch (period) {
    case 'today':
      return date.toDateString() === now.toDateString();
    case 'week':
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= weekAgo;
    case 'month':
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return date >= monthAgo;
    case '3months':
      const threeMonthsAgo = new Date(now);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return date >= threeMonthsAgo;
    default:
      return true;
  }
}

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

interface ConsultationHistoryScreenProps {
  patientId?: string;
  onBack?: () => void;
  onViewConsultation?: (consultation: ConsultationRecord) => void;
}

export function ConsultationHistoryScreen({
  patientId,
  onBack,
  onViewConsultation,
}: ConsultationHistoryScreenProps) {
  // ─── State ──
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // ─── Filtered consultations ──
  const filteredConsultations = useMemo(() => {
    let filtered = SAMPLE_CONSULTATIONS;

    // Filter by patient if patientId is provided
    if (patientId) {
      filtered = filtered.filter(c => c.patientId === patientId);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        c =>
          c.patientName.toLowerCase().includes(q) ||
          c.patientNumber.toLowerCase().includes(q) ||
          c.chiefComplaint.toLowerCase().includes(q) ||
          c.doctorName.toLowerCase().includes(q) ||
          c.diagnoses.some(d => d.description.toLowerCase().includes(q))
      );
    }

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(c => c.encounterType === selectedType);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(c => c.status === selectedStatus);
    }

    // Period filter
    filtered = filtered.filter(c => isInPeriod(c.encounterDate, selectedPeriod));

    // Sort by date (most recent first)
    return filtered.sort(
      (a, b) => new Date(b.encounterDate).getTime() - new Date(a.encounterDate).getTime()
    );
  }, [searchQuery, selectedType, selectedStatus, selectedPeriod, patientId]);

  // ─── Stats ──
  const stats = useMemo(() => {
    const total = filteredConsultations.length;
    const completed = filteredConsultations.filter(c => c.status === 'completed').length;
    const inProgress = filteredConsultations.filter(c => c.status === 'in_progress').length;
    const emergency = filteredConsultations.filter(c => c.encounterType === 'emergency').length;
    return { total, completed, inProgress, emergency };
  }, [filteredConsultations]);

  // ─── Open detail modal ──
  const openDetail = (consultation: ConsultationRecord) => {
    setSelectedConsultation(consultation);
    setShowDetailModal(true);
  };

  // ═══════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Historique des Consultations</Text>
          <Text style={styles.headerSubtitle}>
            {filteredConsultations.length} consultation(s) trouvée(s)
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.filterToggle, showFilters && styles.filterToggleActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons
            name="options"
            size={20}
            color={showFilters ? '#FFF' : ACCENT}
          />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="documents" size={20} color={colors.primary} />
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.success + '15' }]}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.statValue}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Terminées</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.warning + '15' }]}>
          <Ionicons name="time" size={20} color={colors.warning} />
          <Text style={styles.statValue}>{stats.inProgress}</Text>
          <Text style={styles.statLabel}>En cours</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.error + '15' }]}>
          <Ionicons name="flash" size={20} color={colors.error} />
          <Text style={styles.statValue}>{stats.emergency}</Text>
          <Text style={styles.statLabel}>Urgences</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher par patient, médecin, diagnostic..."
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
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          {/* Type Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterChips}>
                {ENCOUNTER_TYPE_OPTIONS.map(opt => {
                  const isSelected = selectedType === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                      onPress={() => setSelectedType(opt.key)}
                    >
                      <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* Status Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Statut</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterChips}>
                {STATUS_OPTIONS.map(opt => {
                  const isSelected = selectedStatus === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                      onPress={() => setSelectedStatus(opt.key)}
                    >
                      <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* Period Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Période</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterChips}>
                {PERIOD_OPTIONS.map(opt => {
                  const isSelected = selectedPeriod === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                      onPress={() => setSelectedPeriod(opt.key)}
                    >
                      <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* Clear Filters */}
          {(selectedType !== 'all' || selectedStatus !== 'all' || selectedPeriod !== 'all') && (
            <TouchableOpacity
              style={styles.clearFilters}
              onPress={() => {
                setSelectedType('all');
                setSelectedStatus('all');
                setSelectedPeriod('all');
              }}
            >
              <Ionicons name="close" size={14} color={colors.error} />
              <Text style={styles.clearFiltersText}>Réinitialiser les filtres</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Consultation List */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {filteredConsultations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={60} color={colors.outline} />
            <Text style={styles.emptyTitle}>Aucune consultation trouvée</Text>
            <Text style={styles.emptyText}>
              Modifiez vos critères de recherche ou filtres
            </Text>
          </View>
        ) : (
          filteredConsultations.map(consultation => (
            <TouchableOpacity
              key={consultation.id}
              style={styles.consultationCard}
              onPress={() => openDetail(consultation)}
              activeOpacity={0.7}
            >
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.patientAvatar}>
                    <Text style={styles.patientAvatarText}>
                      {consultation.patientName.split(' ').map(n => n[0]).join('')}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.patientName}>{consultation.patientName}</Text>
                    <Text style={styles.patientMeta}>
                      {consultation.patientNumber} • {consultation.patientAge} ans
                    </Text>
                  </View>
                </View>
                <View style={styles.cardBadges}>
                  <View
                    style={[
                      styles.typeBadge,
                      { backgroundColor: getEncounterTypeColor(consultation.encounterType) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeBadgeText,
                        { color: getEncounterTypeColor(consultation.encounterType) },
                      ]}
                    >
                      {getEncounterTypeLabel(consultation.encounterType)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(consultation.status) + '20' },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: getStatusColor(consultation.status) },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: getStatusColor(consultation.status) },
                      ]}
                    >
                      {getStatusLabel(consultation.status)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Date & Doctor */}
              <View style={styles.cardDateRow}>
                <View style={styles.dateItem}>
                  <Ionicons name="calendar" size={14} color={colors.textSecondary} />
                  <Text style={styles.dateText}>{formatDate(consultation.encounterDate)}</Text>
                </View>
                <View style={styles.dateItem}>
                  <Ionicons name="time" size={14} color={colors.textSecondary} />
                  <Text style={styles.dateText}>{formatTime(consultation.encounterDate)}</Text>
                </View>
                <View style={styles.dateItem}>
                  <Ionicons name="person" size={14} color={colors.textSecondary} />
                  <Text style={styles.dateText}>{consultation.doctorName}</Text>
                </View>
              </View>

              {/* Chief Complaint */}
              <View style={styles.complaintSection}>
                <Text style={styles.complaintLabel}>Motif:</Text>
                <Text style={styles.complaintText} numberOfLines={2}>
                  {consultation.chiefComplaint}
                </Text>
              </View>

              {/* Diagnoses */}
              {consultation.diagnoses.length > 0 && (
                <View style={styles.diagnosesSection}>
                  <Text style={styles.diagnosesLabel}>Diagnostics:</Text>
                  <View style={styles.diagnosesList}>
                    {consultation.diagnoses.slice(0, 2).map((dx, idx) => (
                      <View key={idx} style={styles.diagnosisChip}>
                        <View
                          style={[
                            styles.diagnosisDot,
                            {
                              backgroundColor:
                                dx.type === 'primary'
                                  ? colors.primary
                                  : dx.type === 'secondary'
                                  ? colors.info
                                  : colors.warning,
                            },
                          ]}
                        />
                        <Text style={styles.diagnosisText} numberOfLines={1}>
                          {dx.description}
                        </Text>
                      </View>
                    ))}
                    {consultation.diagnoses.length > 2 && (
                      <Text style={styles.moreText}>
                        +{consultation.diagnoses.length - 2} autre(s)
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Card Footer */}
              <View style={styles.cardFooter}>
                <View style={styles.footerStats}>
                  {consultation.prescriptions.length > 0 && (
                    <View style={styles.footerStat}>
                      <Ionicons name="medical" size={14} color={colors.textSecondary} />
                      <Text style={styles.footerStatText}>
                        {consultation.prescriptions.length} prescription(s)
                      </Text>
                    </View>
                  )}
                  {consultation.labOrders.length > 0 && (
                    <View style={styles.footerStat}>
                      <Ionicons name="flask" size={14} color={colors.textSecondary} />
                      <Text style={styles.footerStatText}>
                        {consultation.labOrders.length} examen(s)
                      </Text>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Détails de la Consultation</Text>
                {selectedConsultation && (
                  <Text style={styles.modalSubtitle}>
                    {formatDate(selectedConsultation.encounterDate)} à{' '}
                    {formatTime(selectedConsultation.encounterDate)}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            {selectedConsultation && (
              <ScrollView style={styles.modalBody}>
                {/* Patient Info */}
                <View style={styles.detailSection}>
                  <View style={styles.detailHeader}>
                    <Ionicons name="person" size={18} color={ACCENT} />
                    <Text style={styles.detailTitle}>Patient</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Nom:</Text>
                    <Text style={styles.detailValue}>{selectedConsultation.patientName}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>N° Patient:</Text>
                    <Text style={styles.detailValue}>{selectedConsultation.patientNumber}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Âge:</Text>
                    <Text style={styles.detailValue}>
                      {selectedConsultation.patientAge} ans ({selectedConsultation.patientGender === 'male' ? 'M' : 'F'})
                    </Text>
                  </View>
                </View>

                {/* Consultation Info */}
                <View style={styles.detailSection}>
                  <View style={styles.detailHeader}>
                    <Ionicons name="clipboard" size={18} color={ACCENT} />
                    <Text style={styles.detailTitle}>Consultation</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Type:</Text>
                    <Text style={styles.detailValue}>
                      {getEncounterTypeLabel(selectedConsultation.encounterType)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Médecin:</Text>
                    <Text style={styles.detailValue}>{selectedConsultation.doctorName}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Service:</Text>
                    <Text style={styles.detailValue}>{selectedConsultation.departmentName}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Disposition:</Text>
                    <Text style={styles.detailValue}>
                      {selectedConsultation.disposition === 'discharged'
                        ? 'Sortie'
                        : selectedConsultation.disposition === 'admitted'
                        ? 'Hospitalisation'
                        : selectedConsultation.disposition === 'transferred'
                        ? 'Transfert'
                        : 'Observation'}
                    </Text>
                  </View>
                </View>

                {/* Chief Complaint */}
                <View style={styles.detailSection}>
                  <View style={styles.detailHeader}>
                    <Ionicons name="alert-circle" size={18} color={ACCENT} />
                    <Text style={styles.detailTitle}>Motif de Consultation</Text>
                  </View>
                  <Text style={styles.detailTextBlock}>{selectedConsultation.chiefComplaint}</Text>
                </View>

                {/* Vitals */}
                {selectedConsultation.vitals && (
                  <View style={styles.detailSection}>
                    <View style={styles.detailHeader}>
                      <Ionicons name="pulse" size={18} color={ACCENT} />
                      <Text style={styles.detailTitle}>Signes Vitaux</Text>
                    </View>
                    <View style={styles.vitalsGrid}>
                      {selectedConsultation.vitals.temperature && (
                        <View style={styles.vitalItem}>
                          <Text style={styles.vitalItemLabel}>T°</Text>
                          <Text style={styles.vitalItemValue}>
                            {selectedConsultation.vitals.temperature}°C
                          </Text>
                        </View>
                      )}
                      {selectedConsultation.vitals.bloodPressureSystolic && (
                        <View style={styles.vitalItem}>
                          <Text style={styles.vitalItemLabel}>TA</Text>
                          <Text style={styles.vitalItemValue}>
                            {selectedConsultation.vitals.bloodPressureSystolic}/
                            {selectedConsultation.vitals.bloodPressureDiastolic}
                          </Text>
                        </View>
                      )}
                      {selectedConsultation.vitals.heartRate && (
                        <View style={styles.vitalItem}>
                          <Text style={styles.vitalItemLabel}>FC</Text>
                          <Text style={styles.vitalItemValue}>
                            {selectedConsultation.vitals.heartRate} bpm
                          </Text>
                        </View>
                      )}
                      {selectedConsultation.vitals.oxygenSaturation && (
                        <View style={styles.vitalItem}>
                          <Text style={styles.vitalItemLabel}>SpO2</Text>
                          <Text style={styles.vitalItemValue}>
                            {selectedConsultation.vitals.oxygenSaturation}%
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Diagnoses */}
                <View style={styles.detailSection}>
                  <View style={styles.detailHeader}>
                    <Ionicons name="analytics" size={18} color={ACCENT} />
                    <Text style={styles.detailTitle}>
                      Diagnostics ({selectedConsultation.diagnoses.length})
                    </Text>
                  </View>
                  {selectedConsultation.diagnoses.map((dx, idx) => (
                    <View key={idx} style={styles.diagnosisDetailItem}>
                      <View
                        style={[
                          styles.diagnosisTypeTag,
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
                            styles.diagnosisTypeTagText,
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
                          {dx.type === 'primary'
                            ? 'Principal'
                            : dx.type === 'secondary'
                            ? 'Secondaire'
                            : 'Différentiel'}
                        </Text>
                      </View>
                      <Text style={styles.diagnosisDetailText}>{dx.description}</Text>
                      {dx.code && (
                        <Text style={styles.diagnosisDetailCode}>Code: {dx.code}</Text>
                      )}
                    </View>
                  ))}
                </View>

                {/* Prescriptions */}
                {selectedConsultation.prescriptions.length > 0 && (
                  <View style={styles.detailSection}>
                    <View style={styles.detailHeader}>
                      <Ionicons name="medical" size={18} color={ACCENT} />
                      <Text style={styles.detailTitle}>
                        Ordonnances ({selectedConsultation.prescriptions.length})
                      </Text>
                    </View>
                    {selectedConsultation.prescriptions.map((rx, idx) => (
                      <View key={idx} style={styles.prescriptionDetailItem}>
                        <Text style={styles.prescriptionMed}>{rx.medication}</Text>
                        <Text style={styles.prescriptionDetails}>
                          {rx.dosage} • {rx.frequency} • {rx.duration}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Lab Orders */}
                {selectedConsultation.labOrders.length > 0 && (
                  <View style={styles.detailSection}>
                    <View style={styles.detailHeader}>
                      <Ionicons name="flask" size={18} color={ACCENT} />
                      <Text style={styles.detailTitle}>
                        Examens Demandés ({selectedConsultation.labOrders.length})
                      </Text>
                    </View>
                    <View style={styles.labOrdersList}>
                      {selectedConsultation.labOrders.map((lab, idx) => (
                        <View key={idx} style={styles.labOrderItem}>
                          <Ionicons name="checkbox" size={14} color={colors.success} />
                          <Text style={styles.labOrderText}>{lab}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Notes */}
                {selectedConsultation.notes && (
                  <View style={styles.detailSection}>
                    <View style={styles.detailHeader}>
                      <Ionicons name="document-text" size={18} color={ACCENT} />
                      <Text style={styles.detailTitle}>Notes</Text>
                    </View>
                    <Text style={styles.detailTextBlock}>{selectedConsultation.notes}</Text>
                  </View>
                )}

                {/* Follow-up */}
                {selectedConsultation.followUpDate && (
                  <View style={[styles.detailSection, styles.followUpSection]}>
                    <View style={styles.detailHeader}>
                      <Ionicons name="calendar" size={18} color={colors.warning} />
                      <Text style={[styles.detailTitle, { color: colors.warning }]}>
                        Rendez-vous de Suivi
                      </Text>
                    </View>
                    <Text style={styles.followUpDate}>
                      {formatDate(selectedConsultation.followUpDate)}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalActionBtn}
                onPress={() => {
                  // Would print consultation
                  setShowDetailModal(false);
                }}
              >
                <Ionicons name="print" size={18} color={ACCENT} />
                <Text style={styles.modalActionBtnText}>Imprimer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionBtn, styles.modalActionBtnPrimary]}
                onPress={() => setShowDetailModal(false)}
              >
                <Text style={styles.modalActionBtnTextPrimary}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  filterToggle: {
    padding: 10,
    backgroundColor: ACCENT + '15',
    borderRadius: borderRadius.md,
  },
  filterToggleActive: {
    backgroundColor: ACCENT,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },

  // Search
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
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
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },

  // Filters
  filtersContainer: {
    padding: 16,
    paddingTop: 8,
    backgroundColor: colors.surfaceVariant,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  filterSection: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  filterChipSelected: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  filterChipText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  filterChipTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
  clearFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  clearFiltersText: {
    fontSize: 12,
    color: colors.error,
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },

  // Consultation Card
  consultationCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  patientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ACCENT + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: ACCENT,
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
  cardBadges: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Date Row
  cardDateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Complaint
  complaintSection: {
    marginBottom: 10,
  },
  complaintLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  complaintText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },

  // Diagnoses
  diagnosesSection: {
    marginBottom: 10,
  },
  diagnosesLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  diagnosesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  diagnosisChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    maxWidth: '100%',
  },
  diagnosisDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  diagnosisText: {
    fontSize: 11,
    color: colors.text,
    flexShrink: 1,
  },
  moreText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },

  // Card Footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    marginTop: 10,
  },
  footerStats: {
    flexDirection: 'row',
    gap: 16,
  },
  footerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerStatText: {
    fontSize: 11,
    color: colors.textSecondary,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  modalBody: {
    padding: 20,
  },

  // Detail Sections
  detailSection: {
    marginBottom: 20,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: ACCENT,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  detailTextBlock: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
    backgroundColor: colors.surfaceVariant,
    padding: 12,
    borderRadius: borderRadius.md,
  },

  // Vitals Grid
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  vitalItem: {
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  vitalItemLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  vitalItemValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },

  // Diagnosis Detail
  diagnosisDetailItem: {
    backgroundColor: colors.surfaceVariant,
    padding: 12,
    borderRadius: borderRadius.md,
    marginBottom: 8,
  },
  diagnosisTypeTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginBottom: 6,
  },
  diagnosisTypeTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  diagnosisDetailText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  diagnosisDetailCode: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },

  // Prescription Detail
  prescriptionDetailItem: {
    backgroundColor: colors.surfaceVariant,
    padding: 12,
    borderRadius: borderRadius.md,
    marginBottom: 8,
  },
  prescriptionMed: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  prescriptionDetails: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },

  // Lab Orders
  labOrdersList: {
    gap: 6,
  },
  labOrderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labOrderText: {
    fontSize: 13,
    color: colors.text,
  },

  // Follow-up
  followUpSection: {
    backgroundColor: colors.warningLight,
    padding: 14,
    borderRadius: borderRadius.md,
  },
  followUpDate: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.warning,
  },

  // Modal Footer
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  modalActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceVariant,
  },
  modalActionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: ACCENT,
  },
  modalActionBtnPrimary: {
    backgroundColor: ACCENT,
  },
  modalActionBtnTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default ConsultationHistoryScreen;
