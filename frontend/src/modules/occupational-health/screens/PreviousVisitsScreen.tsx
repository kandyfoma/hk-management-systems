import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { 
  SECTOR_PROFILES, 
  OccHealthUtils,
  type Worker,
  type OccupationalHealthPatient,
  type MedicalExamination,
  type ExamType,
  type FitnessStatus,
} from '../../../models/OccupationalHealth';
import { occHealthApi } from '../../../services/OccHealthApiService';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

const ACCENT = colors.primary;

type PreviousExamItem = MedicalExamination & {
  workerName: string;
  company: string;
  sector: string;
  jobTitle: string;
  status: 'completed' | 'draft';
  apiId?: number;
};

const mapBackendExamTypeToFrontend = (value?: string): ExamType => {
  switch (value) {
    case 'exit': return 'exit_medical';
    case 'special': return 'special_request';
    case 'pre_employment':
    case 'periodic':
    case 'return_to_work':
    case 'post_incident':
    case 'night_work':
    case 'pregnancy_related':
      return value;
    default:
      return 'periodic';
  }
};

const mapBackendFitnessToFrontend = (value?: string): FitnessStatus => {
  switch (value) {
    case 'fit':
    case 'fit_with_restrictions':
    case 'temporarily_unfit':
    case 'permanently_unfit':
      return value;
    default:
      return 'pending_evaluation';
  }
};

const parseRestrictions = (value?: string | null): string[] => {
  if (!value) return [];
  return value
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean);
};

// All medical examination data is now loaded from the API in the loadFromBackend() and loadDrafts() functions
// Sample data has been removed to ensure the UI always shows real data or empty state

// ─── Helper Components ───────────────────────────────────────
function ExamCard({ 
  exam,
  onPress,
  onResumeDraft
}: {
  exam: PreviousExamItem;
  onPress: () => void;
  onResumeDraft?: () => void;
}) {
  const isDraft = exam.status === 'draft';
  const sectorProfile = SECTOR_PROFILES[exam.workerSector];
  const fitnessColor = exam.fitnessDecision ? OccHealthUtils.getFitnessStatusColor(exam.fitnessDecision) : colors.textSecondary;

  return (
    <TouchableOpacity 
      style={[styles.examCard, isDraft && styles.examCardDraft]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.examCardHeader}>
        <View style={[styles.examAvatar, { backgroundColor: sectorProfile.color + '14' }]}>
          <Ionicons name={sectorProfile.icon as any} size={18} color={sectorProfile.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.examWorkerName}>{exam.workerName}</Text>
            {isDraft && (
              <View style={styles.draftBadge}>
                <Text style={styles.draftBadgeText}>BROUILLON</Text>
              </View>
            )}
          </View>
          <Text style={styles.examCompany}>{exam.company}</Text>
          <Text style={styles.examJobTitle}>{exam.jobTitle}</Text>
        </View>
        <View style={styles.examCardActions}>
          <Text style={styles.examDate}>{new Date(exam.examDate).toLocaleDateString('fr-CD')}</Text>
          {exam.fitnessDecision && (
            <View style={[styles.fitnessChip, { backgroundColor: fitnessColor + '14' }]}>
              <Text style={[styles.fitnessChipText, { color: fitnessColor }]}>
                {OccHealthUtils.getFitnessStatusLabel(exam.fitnessDecision)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Details */}
      <View style={styles.examCardDetails}>
        <View style={styles.examDetail}>
          <Ionicons name="clipboard" size={14} color={colors.textSecondary} />
          <Text style={styles.examDetailText}>{OccHealthUtils.getExamTypeLabel(exam.examType)}</Text>
        </View>
        <View style={styles.examDetail}>
          <Ionicons name="person" size={14} color={colors.textSecondary} />
          <Text style={styles.examDetailText}>{exam.examinerName}</Text>
        </View>
        {exam.certificateNumber && (
          <View style={styles.examDetail}>
            <Ionicons name="shield-checkmark" size={14} color={colors.textSecondary} />
            <Text style={styles.examDetailText}>{exam.certificateNumber}</Text>
          </View>
        )}
      </View>

      {/* Bottom Actions */}
      {isDraft && (
        <View style={styles.examCardFooter}>
          <TouchableOpacity 
            style={styles.resumeDraftBtn}
            onPress={() => onResumeDraft?.()}
            activeOpacity={0.7}
          >
            <Ionicons name="play" size={16} color={ACCENT} />
            <Text style={styles.resumeDraftBtnText}>Reprendre</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Component ──────────────────────────────────────────
export function PreviousVisitsScreen({ 
  onResumeDraft,
  onNewConsultation
}: { 
  onResumeDraft?: (draftId: string) => void;
  onNewConsultation?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [examinations, setExaminations] = useState<PreviousExamItem[]>([]);
  const [isBackendData, setIsBackendData] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterExamType, setFilterExamType] = useState<ExamType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'draft'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedExam, setSelectedExam] = useState<PreviousExamItem | null>(null);

  const loadFromBackend = useCallback(async () => {
    try {
      console.log('[PreviousVisits] Starting backend data fetch...');
      
      const [workersRes, examsRes] = await Promise.all([
        occHealthApi.listWorkers({ page: 1 }),
        occHealthApi.listMedicalExaminations({ page: 1 }),
      ]);

      console.log('[PreviousVisits] API responses:', {
        workersError: workersRes.error,
        workersCount: workersRes.data?.length,
        examsError: examsRes.error,
        examsCount: examsRes.data?.length,
      });

      if (workersRes.error || examsRes.error) {
        throw new Error(workersRes.error || examsRes.error || 'Erreur de chargement backend');
      }

      const workersById = new Map<string, OccupationalHealthPatient>();
      (workersRes.data || []).forEach((w) => workersById.set(String(w.id), w));

      console.log(`[PreviousVisits] Loaded ${workersRes.data?.length || 0} workers, fetching exam details...`);

      const detailed = await Promise.all(
        (examsRes.data || []).map(async (e: any) => {
          const detail = await occHealthApi.getMedicalExamination(e.id);
          return detail.data || e;
        })
      );

      console.log(`[PreviousVisits] Successfully mapped ${detailed.length} examinations`);

      const mapped: PreviousExamItem[] = detailed.map((e: any) => {
      const workerId = String(e.worker ?? '');
      const worker = workersById.get(workerId);
      const certificate = e.fitness_certificate;

      return {
        id: `EXAM-${e.id}`,
        apiId: e.id,
        patientId: workerId,
        workerName: e.worker_name || (worker ? `${worker.firstName} ${worker.lastName}` : 'Travailleur'),
        company: e.enterprise_name || worker?.company || 'Non spécifié',
        sector: worker?.sector || 'other',
        jobTitle: worker?.jobTitle || '—',
        workerSector: worker?.sector || 'other',
        examType: mapBackendExamTypeToFrontend(e.exam_type),
        examDate: e.exam_date,
        examinerName: e.examining_doctor_name || 'Médecin',
        vitals: e.vital_signs ? {
          temperature: e.vital_signs.temperature,
          bloodPressureSystolic: e.vital_signs.systolic_bp,
          bloodPressureDiastolic: e.vital_signs.diastolic_bp,
          heartRate: e.vital_signs.heart_rate,
          respiratoryRate: e.vital_signs.respiratory_rate,
          weight: e.vital_signs.weight,
          height: e.vital_signs.height,
          waistCircumference: e.vital_signs.waist_circumference,
        } : undefined,
        physicalExam: e.physical_exam ? {
          generalAppearance: e.physical_exam.general_appearance ? 'abnormal' : 'normal',
          generalNotes: e.physical_exam.general_appearance || '',
          cardiovascular: e.physical_exam.cardiovascular ? 'abnormal' : 'normal',
          cardiovascularNotes: e.physical_exam.cardiovascular || '',
          respiratory: e.physical_exam.respiratory ? 'abnormal' : 'normal',
          respiratoryNotes: e.physical_exam.respiratory || '',
          musculoskeletal: e.physical_exam.musculoskeletal ? 'abnormal' : 'normal',
          musculoskeletalNotes: e.physical_exam.musculoskeletal || '',
          neurological: e.physical_exam.neurological ? 'abnormal' : 'normal',
          neurologicalNotes: e.physical_exam.neurological || '',
          dermatological: e.physical_exam.skin ? 'abnormal' : 'normal',
          dermatologicalNotes: e.physical_exam.skin || '',
          ent: e.physical_exam.ent ? 'abnormal' : 'normal',
          entNotes: e.physical_exam.ent || '',
          abdomen: e.physical_exam.abdominal ? 'abnormal' : 'normal',
          abdomenNotes: e.physical_exam.abdominal || '',
          mentalHealth: 'normal',
          ophthalmological: 'normal',
        } : {
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
        },
        fitnessDecision: mapBackendFitnessToFrontend(certificate?.fitness_decision),
        restrictions: parseRestrictions(certificate?.restrictions),
        recommendations: e.recommendations ? [e.recommendations] : [],
        certificateNumber: certificate?.certificate_number,
        certificateIssued: !!certificate,
        notes: e.results_summary || e.chief_complaint || '',
        createdAt: e.created_at || new Date().toISOString(),
        updatedAt: e.updated_at,
        status: 'completed',
        expiryDate: certificate?.valid_until,
        examinerDoctorId: e.examining_doctor ? String(e.examining_doctor) : undefined,
      };
    });

    console.log(`[PreviousVisits] Backend fetch complete: ${mapped.length} exams ready to display`);
    return mapped;
  } catch (error: any) {
    console.error('[PreviousVisits] Backend fetch error:', error?.message || error);
    throw error;
  }
  }, []);

  const loadDrafts = useCallback(async (): Promise<PreviousExamItem[]> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const draftKeys = keys.filter((k) => k.startsWith('consultation_draft_'));
      if (draftKeys.length === 0) return [];

      const draftPairs = await AsyncStorage.multiGet(draftKeys);
      return draftPairs
        .map(([, value]) => {
          if (!value) return null;
          const d = JSON.parse(value);
          const workerName = d?.selectedWorker ? `${d.selectedWorker.firstName} ${d.selectedWorker.lastName}` : 'Travailleur';
          return {
            id: d.id,
            patientId: d?.selectedWorker?.id || '',
            workerName,
            company: d?.selectedWorker?.company || 'Non spécifié',
            sector: d?.selectedWorker?.sector || 'other',
            jobTitle: d?.selectedWorker?.jobTitle || '—',
            workerSector: d?.selectedWorker?.sector || 'other',
            examType: d?.examType || 'periodic',
            examDate: d?.updatedAt || d?.createdAt || new Date().toISOString(),
            examinerName: 'Brouillon',
            vitals: d?.vitals || {},
            physicalExam: d?.physicalExam || {
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
            },
            fitnessDecision: d?.fitnessDecision || 'pending_evaluation',
            restrictions: d?.restrictions || [],
            recommendations: d?.recommendations ? [d.recommendations] : [],
            certificateIssued: false,
            notes: d?.consultationNotes || 'Brouillon en cours',
            createdAt: d?.createdAt || new Date().toISOString(),
            updatedAt: d?.updatedAt,
            status: 'draft' as const,
          } as PreviousExamItem;
        })
        .filter((x): x is PreviousExamItem => !!x);
    } catch {
      return [];
    }
  }, []);

  const reloadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    setBackendError(null);
    let backendFetchedData: PreviousExamItem[] = [];
    let backendError: string | null = null;

    try {
      const [drafts, backend] = await Promise.all([
        loadDrafts(),
        loadFromBackend().catch((e: any) => {
          const errorMsg = e?.message || 'Erreur lors du chargement du backend';
          console.error('Backend load failed in PreviousVisitsScreen:', errorMsg);
          backendError = errorMsg;
          setBackendError(errorMsg);
          return [] as PreviousExamItem[];
        }),
      ]);

      backendFetchedData = backend;
      const merged = [...drafts, ...backend];
      
      // Log what we got from backend
      console.log(`Backend data: ${backend.length} examinations loaded`);
      console.log(`Local drafts: ${drafts.length} drafts loaded`);
      
      if (merged.length > 0) {
        setExaminations(merged);
        setIsBackendData(backend.length > 0);
      } else {
        console.warn('No completed examinations or drafts found');
        // Show empty state instead of mocking data with samples
        setExaminations([]);
        setIsBackendData(false);
        if (!backendError) {
          setBackendError('Aucune donnée trouvée. Créez une nouvelle consultation.');
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadDrafts, loadFromBackend]);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  // ─── Filtered examinations ──
  const filteredExams = useMemo(() => {
    let filtered = examinations;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(exam => 
        exam.workerName.toLowerCase().includes(query) ||
        exam.company.toLowerCase().includes(query) ||
        exam.jobTitle.toLowerCase().includes(query) ||
        exam.certificateNumber?.toLowerCase().includes(query)
      );
    }

    // Exam type filter
    if (filterExamType !== 'all') {
      filtered = filtered.filter(exam => exam.examType === filterExamType);
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(exam => exam.status === filterStatus);
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime());
  }, [searchQuery, filterExamType, filterStatus]);

  // ─── Stats ──
  const stats = useMemo(() => {
    const total = examinations.length;
    const completed = examinations.filter(e => e.status === 'completed').length;
    const drafts = examinations.filter(e => e.status === 'draft').length;
    const thisMonth = examinations.filter(e => {
      const examDate = new Date(e.examDate);
      const now = new Date();
      return examDate.getMonth() === now.getMonth() && examDate.getFullYear() === now.getFullYear();
    }).length;

    return { total, completed, drafts, thisMonth };
  }, [examinations]);

  // ─── Handlers ──
  const handleExamPress = (exam: PreviousExamItem) => {
    setSelectedExam(exam);
  };

  const handleResumeDraft = (exam: PreviousExamItem) => {
    if (exam.status === 'draft' && onResumeDraft) {
      // Show loading feedback
      console.log(
        'Chargement du Brouillon',
        `Reprise de la consultation pour ${exam.workerName}...`,
        [],
        { cancelable: false }
      );
      
      // Small delay to show the alert, then navigate
      setTimeout(() => {
        console.log('Dismissing alert');
        onResumeDraft(exam.id);
      }, 1000);
    } else {
      // For demo purposes, just log
      console.log('Resume draft:', exam.id);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Historique des Visites Médicales</Text>
          <Text style={styles.subtitle}>Consultez et gérez les examens d'aptitude</Text>
        </View>
        {onNewConsultation && (
          <TouchableOpacity 
            style={styles.newConsultationBtn}
            onPress={onNewConsultation}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={styles.newConsultationBtnText}>Nouvelle Consultation</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="folder" size={20} color={colors.primary} />
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.statNumber}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Terminées</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="document-text" size={20} color={ACCENT} />
          <Text style={styles.statNumber}>{stats.drafts}</Text>
          <Text style={styles.statLabel}>Brouillons</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="calendar" size={20} color={colors.info} />
          <Text style={styles.statNumber}>{stats.thisMonth}</Text>
          <Text style={styles.statLabel}>Ce Mois</Text>
        </View>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Rechercher par nom, entreprise, certificat..."
            placeholderTextColor={colors.placeholder}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity 
          style={[styles.filterBtn, showFilters && { backgroundColor: ACCENT + '14' }]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="funnel" size={18} color={showFilters ? ACCENT : colors.textSecondary} />
          <Text style={[styles.filterBtnText, showFilters && { color: ACCENT }]}>Filtres</Text>
        </TouchableOpacity>
      </View>

      {/* Filters Panel */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Type d'Examen</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterChips}>
                {[
                  { value: 'all', label: 'Tous' },
                  { value: 'pre_employment', label: 'Embauche' },
                  { value: 'periodic', label: 'Périodique' },
                  { value: 'return_to_work', label: 'Reprise' },
                  { value: 'post_incident', label: 'Post-Accident' },
                ].map(filter => (
                  <TouchableOpacity
                    key={filter.value}
                    style={[styles.filterChip, filterExamType === filter.value && styles.filterChipActive]}
                    onPress={() => setFilterExamType(filter.value as ExamType | 'all')}
                  >
                    <Text style={[styles.filterChipText, filterExamType === filter.value && styles.filterChipTextActive]}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Statut</Text>
            <View style={styles.filterChips}>
              {[
                { value: 'all', label: 'Tous' },
                { value: 'completed', label: 'Terminées' },
                { value: 'draft', label: 'Brouillons' },
              ].map(filter => (
                <TouchableOpacity
                  key={filter.value}
                  style={[styles.filterChip, filterStatus === filter.value && styles.filterChipActive]}
                  onPress={() => setFilterStatus(filter.value as 'all' | 'completed' | 'draft')}
                >
                  <Text style={[styles.filterChipText, filterStatus === filter.value && styles.filterChipTextActive]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Results */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filteredExams.length} résultat{filteredExams.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Data Source Indicator */}
      {!loading && (
        <View style={[
          styles.dataSourceBanner,
          { backgroundColor: isBackendData ? '#D1FAE5' : '#FEF3C7' }
        ]}>
          <Ionicons 
            name={isBackendData ? 'checkmark-circle' : 'alert-circle'} 
            size={16} 
            color={isBackendData ? '#059669' : '#D97706'}
            style={{ marginRight: 8 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={[
              styles.dataSourceText,
              { color: isBackendData ? '#059669' : '#D97706' }
            ]}>
              {isBackendData 
                ? '✓ Données du serveur' 
                : '⚠ Affichage des exemples (aucune donnée trouvée)'}
            </Text>
          </View>
        </View>
      )}

      {/* Error Banner */}
      {backendError && !isBackendData && (
        <View style={styles.errorBanner}>
          <Ionicons name="information-circle" size={16} color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={styles.errorText}>{backendError}</Text>
        </View>
      )}

      {/* Examinations List */}
      <ScrollView
        style={styles.examsList}
        contentContainerStyle={styles.examsListContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reloadData(true)} colors={[ACCENT]} tintColor={ACCENT} />}
      >
        {loading && (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={ACCENT} />
            <Text style={styles.loadingText}>Chargement depuis la base backend...</Text>
          </View>
        )}
        {filteredExams.map(exam => (
          <ExamCard
            key={exam.id}
            exam={exam}
            onPress={() => handleExamPress(exam)}
            onResumeDraft={() => handleResumeDraft(exam)}
          />
        ))}
        
        {filteredExams.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>Aucune visite trouvée</Text>
            <Text style={styles.emptySubtitle}>
              Essayez de modifier vos critères de recherche
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Exam Details Modal */}
      <Modal visible={!!selectedExam} transparent animationType="fade" onRequestClose={() => setSelectedExam(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            {selectedExam && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Détails de la Visite</Text>
                  <TouchableOpacity onPress={() => setSelectedExam(null)}>
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalContent}>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Travailleur</Text>
                    <Text style={styles.modalText}>{selectedExam.workerName}</Text>
                    <Text style={styles.modalSubtext}>{selectedExam.company} • {selectedExam.jobTitle}</Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Examen</Text>
                    <Text style={styles.modalText}>{OccHealthUtils.getExamTypeLabel(selectedExam.examType)}</Text>
                    <Text style={styles.modalSubtext}>
                      {new Date(selectedExam.examDate).toLocaleDateString('fr-CD')} • {selectedExam.examinerName}
                    </Text>
                  </View>

                  {selectedExam.vitals && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Signes Vitaux</Text>
                      <View style={styles.vitalsGrid}>
                        {selectedExam.vitals.bloodPressureSystolic && (
                          <Text style={styles.modalText}>
                            TA: {selectedExam.vitals.bloodPressureSystolic}/{selectedExam.vitals.bloodPressureDiastolic} mmHg
                          </Text>
                        )}
                        {selectedExam.vitals.heartRate && (
                          <Text style={styles.modalText}>FC: {selectedExam.vitals.heartRate} bpm</Text>
                        )}
                        {selectedExam.vitals.temperature && (
                          <Text style={styles.modalText}>T°: {selectedExam.vitals.temperature}°C</Text>
                        )}
                      </View>
                    </View>
                  )}

                  {selectedExam.fitnessDecision && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Décision d'Aptitude</Text>
                      <View style={[styles.fitnessChip, { backgroundColor: OccHealthUtils.getFitnessStatusColor(selectedExam.fitnessDecision) + '14' }]}>
                        <Text style={[styles.fitnessChipText, { color: OccHealthUtils.getFitnessStatusColor(selectedExam.fitnessDecision) }]}>
                          {OccHealthUtils.getFitnessStatusLabel(selectedExam.fitnessDecision)}
                        </Text>
                      </View>
                    </View>
                  )}

                  {selectedExam.restrictions && selectedExam.restrictions.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Restrictions</Text>
                      {selectedExam.restrictions.map((restriction, i) => (
                        <View key={i} style={styles.restrictionItem}>
                          <Ionicons name="remove-circle" size={14} color={colors.error} />
                          <Text style={styles.modalText}>{restriction}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {selectedExam.recommendations && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Recommandations</Text>
                      <Text style={styles.modalText}>
                        {Array.isArray(selectedExam.recommendations)
                          ? selectedExam.recommendations.join(' · ')
                          : selectedExam.recommendations}
                      </Text>
                    </View>
                  )}

                  {selectedExam.notes && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Notes</Text>
                      <Text style={styles.modalText}>{selectedExam.notes}</Text>
                    </View>
                  )}
                </ScrollView>
              </>
            )}
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
  container: { flex: 1, backgroundColor: colors.background },
  
  // Header
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: isDesktop ? 32 : 16, paddingBottom: 16,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.outline,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  newConsultationBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: borderRadius.md,
    backgroundColor: ACCENT, ...shadows.sm,
  },
  newConsultationBtnText: { fontSize: 13, color: '#FFF', fontWeight: '600' },

  // Stats
  statsRow: { 
    flexDirection: 'row', gap: 12, paddingHorizontal: isDesktop ? 32 : 16, paddingVertical: 16,
  },
  statCard: {
    flex: 1, alignItems: 'center', padding: 16,
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.outline, ...shadows.sm,
  },
  statNumber: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 4 },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2, textAlign: 'center' },

  // Search
  searchSection: { 
    flexDirection: 'row', gap: 12, paddingHorizontal: isDesktop ? 32 : 16, paddingBottom: 16,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.outline,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, padding: 0 },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 12,
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.outline,
  },
  filterBtnText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },

  // Filters
  filtersPanel: {
    padding: 16, marginHorizontal: isDesktop ? 32 : 16, marginBottom: 16,
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.outline, gap: 12,
  },
  filterGroup: { gap: 8 },
  filterLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase' },
  filterChips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: colors.outlineVariant, borderWidth: 1, borderColor: colors.outline,
  },
  filterChipActive: { backgroundColor: ACCENT + '14', borderColor: ACCENT },
  filterChipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  filterChipTextActive: { color: ACCENT, fontWeight: '600' },

  // Results
  resultsHeader: { paddingHorizontal: isDesktop ? 32 : 16, paddingBottom: 8 },
  resultsCount: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },

  // Data Source Indicator
  dataSourceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: isDesktop ? 32 : 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
  },
  dataSourceText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: isDesktop ? 32 : 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    backgroundColor: '#FEE2E2',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
    flex: 1,
  },

  // Exams List
  examsList: { flex: 1 },
  examsListContent: { paddingHorizontal: isDesktop ? 32 : 16, paddingBottom: 16, gap: 12 },
  loadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    paddingVertical: 10,
    marginBottom: 8,
  },
  loadingText: { fontSize: 12, color: colors.textSecondary },

  // Exam Card
  examCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: 16,
    borderWidth: 1, borderColor: colors.outline, ...shadows.sm,
  },
  examCardDraft: { 
    borderColor: ACCENT, backgroundColor: ACCENT + '04',
  },
  examCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  examAvatar: { 
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
  },
  examWorkerName: { fontSize: 15, fontWeight: '700', color: colors.text },
  examCompany: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  examJobTitle: { fontSize: 12, color: colors.textSecondary },
  examCardActions: { alignItems: 'flex-end', gap: 4 },
  examDate: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  fitnessChip: { 
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12,
  },
  fitnessChipText: { fontSize: 10, fontWeight: '700' },
  draftBadge: { 
    backgroundColor: ACCENT, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
  },
  draftBadgeText: { fontSize: 8, color: '#FFF', fontWeight: '700' },

  examCardDetails: { 
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8,
  },
  examDetail: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  examDetailText: { fontSize: 12, color: colors.text },

  examCardFooter: { 
    flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: colors.outline,
  },
  resumeDraftBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.md,
    backgroundColor: ACCENT + '14', borderWidth: 1, borderColor: ACCENT + '40',
  },
  resumeDraftBtnText: { fontSize: 12, color: ACCENT, fontWeight: '600' },

  // Empty State
  emptyState: { 
    alignItems: 'center', justifyContent: 'center', padding: 40,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 4 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  modal: {
    width: isDesktop ? 600 : '92%', maxHeight: '80%',
    backgroundColor: colors.surface, borderRadius: borderRadius.xl, ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: colors.outline,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  modalContent: { flex: 1, padding: 20 },
  modalSection: { marginBottom: 16 },
  modalSectionTitle: { 
    fontSize: 12, color: colors.textSecondary, fontWeight: '700', 
    textTransform: 'uppercase', marginBottom: 6,
  },
  modalText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  modalSubtext: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  restrictionItem: { 
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4,
  },
});