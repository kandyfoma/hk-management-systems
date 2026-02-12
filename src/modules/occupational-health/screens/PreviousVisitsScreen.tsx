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
import { 
  SECTOR_PROFILES, 
  OccHealthUtils,
  type Worker,
  type MedicalExamination,
  type ExamType,
  type FitnessStatus,
} from '../../../models/OccupationalHealth';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

const ACCENT = '#D97706';

// ─── Sample previous medical examinations ────────────────────
const SAMPLE_EXAMINATIONS: (MedicalExamination & { 
  workerName: string; 
  company: string;
  sector: string;
  jobTitle: string;
  status: 'completed' | 'draft';
})[] = [
  {
    id: 'EXAM-001',
    patientId: 'W001',
    workerName: 'Kabamba Mutombo',
    company: 'Gécamines SA',
    sector: 'Mining',
    jobTitle: 'Mineur de fond',
    workerSector: 'mining',
    examType: 'periodic',
    examDate: '2024-01-15',
    examinerName: 'Dr. Mukendi',
    vitals: {
      temperature: 36.8,
      bloodPressureSystolic: 135,
      bloodPressureDiastolic: 85,
      heartRate: 78,
      weight: 72,
      height: 175,
    },
    physicalExam: {
      generalAppearance: 'normal',
      cardiovascular: 'abnormal',
      cardiovascularNotes: 'Souffle systolique léger',
      respiratory: 'normal',
      musculoskeletal: 'abnormal', 
      musculoskeletalNotes: 'Douleur lombaire légère',
      neurological: 'normal',
      dermatological: 'normal',
      ent: 'abnormal',
      entNotes: 'Baisse auditive légère (exposition bruit)',
      abdomen: 'normal',
      mentalHealth: 'normal',
      ophthalmological: 'normal',
    },
    fitnessDecision: 'fit_with_restrictions',
    restrictions: ['Pas de travail en hauteur > 3m', 'Port obligatoire EPI auditif'],
    recommendations: ['Suivi cardiovasculaire tous les 6 mois', 'Ergothérapie pour le dos'],
    certificateNumber: 'CERT-2024-001',
    notes: 'Travailleur expérimenté. Exposition prolongée au bruit et vibrations.',
    createdAt: '2024-01-15T09:30:00Z',
    status: 'completed',
    expiryDate: '2024-07-15',
    examinerDoctorId: 'DOC-001',
    certificateIssued: true,
  },
  {
    id: 'EXAM-002', 
    patientId: 'W002',
    workerName: 'Mwamba Kalala',
    company: 'Rawbank',
    sector: 'Banking',
    jobTitle: 'Chargée de Clientèle',
    workerSector: 'banking_finance',
    examType: 'pre_employment',
    examDate: '2024-01-10',
    examinerName: 'Dr. Tshilombo',
    vitals: {
      temperature: 36.5,
      bloodPressureSystolic: 115,
      bloodPressureDiastolic: 75,
      heartRate: 68,
      weight: 58,
      height: 165,
    },
    physicalExam: {
      generalAppearance: 'normal',
      cardiovascular: 'normal',
      respiratory: 'normal', 
      musculoskeletal: 'normal',
      neurological: 'normal',
      dermatological: 'normal',
      ent: 'normal',
      abdomen: 'normal',
      mentalHealth: 'concern',
      mentalHealthNotes: 'Stress léger lié à nouveau poste',
      ophthalmological: 'normal',
    },
    fitnessDecision: 'fit',
    recommendations: ['Aménagement ergonomique du poste', 'Pause régulière écran'],
    certificateNumber: 'CERT-2024-002',
    notes: 'Nouvelle employée. Profil compatible poste bureautique.',
    createdAt: '2024-01-10T14:15:00Z',
    status: 'completed',
    expiryDate: '2025-01-10',
    examinerDoctorId: 'DOC-002',
    restrictions: [],
    certificateIssued: true,
  },
  {
    id: 'EXAM-003',
    patientId: 'W003',
    workerName: 'Tshisekedi Ilunga', 
    company: 'Bâtiment Congo SARL',
    sector: 'Construction',
    jobTitle: 'Soudeur-Monteur',
    workerSector: 'construction',
    examType: 'return_to_work',
    examDate: '2024-01-08',
    examinerName: 'Dr. Mukendi',
    vitals: {
      temperature: 36.7,
      bloodPressureSystolic: 142,
      bloodPressureDiastolic: 88,
      heartRate: 82,
      weight: 78,
      height: 172,
    },
    physicalExam: {
      generalAppearance: 'normal',
      cardiovascular: 'abnormal',
      cardiovascularNotes: 'HTA légère contrôlée sous traitement',
      respiratory: 'normal',
      musculoskeletal: 'abnormal',
      musculoskeletalNotes: 'Raideur épaule droite post-trauma',
      neurological: 'normal',
      dermatological: 'normal',
      ent: 'normal',
      abdomen: 'normal', 
      mentalHealth: 'normal',
      ophthalmological: 'normal',
    },
    fitnessDecision: 'fit_with_restrictions',
    restrictions: ['Éviter soudure aérienne prolongée', 'Contrôle TA mensuel'],
    recommendations: ['Kinésithérapie épaule', 'Surveillance cardiovasculaire'],
    certificateNumber: 'CERT-2024-003',
    notes: 'Reprise après accident travail. Amélioration épaule.',
    createdAt: '2024-01-08T11:20:00Z',
    status: 'completed',
    expiryDate: '2024-04-08',
    examinerDoctorId: 'DOC-001',
    certificateIssued: true,
  },
  {
    id: 'EXAM-004',
    patientId: 'W004',
    workerName: 'Lukusa Nzuzi',
    company: 'Hôpital Général de Référence',
    sector: 'Healthcare',
    jobTitle: 'Infirmière',
    workerSector: 'healthcare',
    examType: 'periodic',
    examDate: '2024-01-05',
    examinerName: 'Dr. Tshilombo',
    vitals: {
      temperature: 36.4,
      bloodPressureSystolic: 108,
      bloodPressureDiastolic: 70,
      heartRate: 72,
      weight: 62,
      height: 168,
    },
    physicalExam: {
      generalAppearance: 'normal',
      cardiovascular: 'normal',
      respiratory: 'normal',
      musculoskeletal: 'abnormal',
      musculoskeletalNotes: 'TMS légers membres supérieurs',
      neurological: 'normal',
      dermatological: 'normal',
      ent: 'normal',
      abdomen: 'normal',
      mentalHealth: 'concern',
      mentalHealthNotes: 'Fatigue liée travail de nuit',
      ophthalmological: 'normal',
    },
    fitnessDecision: 'fit',
    recommendations: ['Rotation équipes nuit/jour', 'Exercices TMS'],
    certificateNumber: 'CERT-2024-004',
    notes: 'Bonne adaptation travail hospitalier.',
    createdAt: '2024-01-05T10:45:00Z',
    status: 'completed',
    expiryDate: '2024-07-05',
    examinerDoctorId: 'DOC-002',
    restrictions: [],
    certificateIssued: true,
  },
  {
    id: 'EXAM-DRAFT-001',
    patientId: 'W005',
    workerName: 'Pongo Tshimanga',
    company: 'Vodacom Congo',
    sector: 'Telecom',
    jobTitle: 'Ingénieur Logiciel',
    workerSector: 'telecom_it',
    examType: 'periodic',
    examDate: '2024-01-20',
    examinerName: 'Dr. Mukendi',
    vitals: {
      temperature: 36.6,
      bloodPressureSystolic: 125,
      bloodPressureDiastolic: 80,
      heartRate: 75,
    },
    physicalExam: {
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
    notes: 'Consultation en cours - données partielles',
    createdAt: '2024-01-20T09:00:00Z',
    status: 'draft',
    expiryDate: '2024-07-20',
    examinerDoctorId: 'DOC-001',
    fitnessDecision: 'pending_evaluation',
    restrictions: [],
    recommendations: [],
    certificateIssued: false,
  },
];

// ─── Helper Components ───────────────────────────────────────
function ExamCard({ 
  exam, 
  onPress, 
  onResumeDraft 
}: { 
  exam: typeof SAMPLE_EXAMINATIONS[0]; 
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterExamType, setFilterExamType] = useState<ExamType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'draft'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedExam, setSelectedExam] = useState<typeof SAMPLE_EXAMINATIONS[0] | null>(null);

  // ─── Filtered examinations ──
  const filteredExams = useMemo(() => {
    let filtered = SAMPLE_EXAMINATIONS;

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
    const total = SAMPLE_EXAMINATIONS.length;
    const completed = SAMPLE_EXAMINATIONS.filter(e => e.status === 'completed').length;
    const drafts = SAMPLE_EXAMINATIONS.filter(e => e.status === 'draft').length;
    const thisMonth = SAMPLE_EXAMINATIONS.filter(e => {
      const examDate = new Date(e.examDate);
      const now = new Date();
      return examDate.getMonth() === now.getMonth() && examDate.getFullYear() === now.getFullYear();
    }).length;

    return { total, completed, drafts, thisMonth };
  }, []);

  // ─── Handlers ──
  const handleExamPress = (exam: typeof SAMPLE_EXAMINATIONS[0]) => {
    setSelectedExam(exam);
  };

  const handleResumeDraft = (exam: typeof SAMPLE_EXAMINATIONS[0]) => {
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

      {/* Examinations List */}
      <ScrollView style={styles.examsList} contentContainerStyle={styles.examsListContent}>
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
                      <Text style={styles.modalText}>{selectedExam.recommendations}</Text>
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

  // Exams List
  examsList: { flex: 1 },
  examsListContent: { paddingHorizontal: isDesktop ? 32 : 16, paddingBottom: 16, gap: 12 },

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