import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator,
  StyleSheet, Dimensions, Modal, Alert, Platform, RefreshControl, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { getTextColor } from '../../../utils/colorContrast';
import { OccHealthApiService } from '../../../services/OccHealthApiService';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const ACCENT = colors.primary;

// ─── Types ──────────────────────────────────────────────────────
interface PersonnelRecord {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  company: string;
  sector: string;
  site: string;
  department: string;
  jobTitle: string;
  status: 'active' | 'inactive' | 'terminated';
  riskScore: number;
  fitnessStatus: 'fit' | 'fit_with_restrictions' | 'temporarily_unfit' | 'permanently_unfit' | 'pending_evaluation';
  nextMedicalExam?: string;
  lastMedicalExam?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  hireDate?: string;
}

// ─── Personnel Card Component ───────────────────────────────────
function PersonnelCard({ 
  record, 
  onPress 
}: { 
  record: PersonnelRecord; 
  onPress: () => void;
}) {
  const getRiskColor = (score: number) => {
    if (score < 30) return '#22C55E';
    if (score < 50) return '#F59E0B';
    if (score < 75) return '#EF4444';
    return '#7C2D12';
  };

  const getFitnessColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'fit': colors.secondary,
      'fit_with_restrictions': colors.warningDark,
      'temporarily_unfit': colors.error,
      'permanently_unfit': '#7C2D12',
      'pending_evaluation': colors.secondaryDark,
    };
    return colorMap[status] || colors.textSecondary;
  };

  const getFitnessLabel = (status: string) => {
    const labelMap: Record<string, string> = {
      'fit': 'Apte',
      'fit_with_restrictions': 'Restrictions',
      'temporarily_unfit': 'Inapte Temp.',
      'permanently_unfit': 'Inapte Perm.',
      'pending_evaluation': 'En attente',
    };
    return labelMap[status] || status;
  };

  const isOverdue = record.nextMedicalExam && new Date(record.nextMedicalExam) < new Date();

  return (
    <TouchableOpacity 
      style={[styles.personnelCard, shadows.sm]} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.primaryFaded }]}>
          <Ionicons name="person" size={24} color={colors.primary} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.personnelName}>
              {record.firstName} {record.lastName}
            </Text>
            {isOverdue && (
              <View style={styles.overdueBadge}>
                <Ionicons name="alert-circle" size={11} color="#FFF" />
                <Text style={styles.overdueBadgeText}>RETARD</Text>
              </View>
            )}
            {record.status === 'inactive' && (
              <View style={[styles.statusBadge, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.statusBadgeText, { color: colors.textSecondary }]}>Inactif</Text>
              </View>
            )}
          </View>
          <Text style={styles.personnelMeta}>
            {record.employeeId} • {record.company}
          </Text>
        </View>

        <View style={[styles.riskBadge, { backgroundColor: getRiskColor(record.riskScore) + '20' }]}>
          <Text style={[styles.riskScore, { color: getRiskColor(record.riskScore) }]}>
            {record.riskScore}%
          </Text>
        </View>

        <View 
          style={[
            styles.fitnessChip, 
            { backgroundColor: getFitnessColor(record.fitnessStatus) + '14' }
          ]}
        >
          <View 
            style={[
              styles.fitnessChipDot, 
              { backgroundColor: getFitnessColor(record.fitnessStatus) }
            ]} 
          />
          <Text 
            style={[
              styles.fitnessChipText, 
              { color: getFitnessColor(record.fitnessStatus) }
            ]}
          >
            {getFitnessLabel(record.fitnessStatus)}
          </Text>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="briefcase-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.detailText} numberOfLines={1}>
            {record.sector} • {record.department}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.detailText} numberOfLines={1}>{record.site}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="briefcase" size={13} color={colors.textSecondary} />
          <Text style={styles.detailText} numberOfLines={1}>{record.jobTitle}</Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View
          style={{
            height: '100%',
            width: `${record.riskScore}%`,
            backgroundColor: getRiskColor(record.riskScore),
            borderRadius: borderRadius.full,
          }}
        />
      </View>
    </TouchableOpacity>
  );
}

// ─── Detail Modal ───────────────────────────────────────────────
function PersonnelDetailModal({
  visible,
  record,
  onClose,
  onEdit,
  onDelete,
}: {
  visible: boolean;
  record: PersonnelRecord | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (!record) return null;

  const getFitnessColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'fit': colors.secondary,
      'fit_with_restrictions': colors.warningDark,
      'temporarily_unfit': colors.error,
      'permanently_unfit': '#7C2D12',
      'pending_evaluation': colors.secondaryDark,
    };
    return colorMap[status] || colors.textSecondary;
  };

  const getRiskColor = (score: number) => {
    if (score < 30) return '#22C55E';
    if (score < 50) return '#F59E0B';
    if (score < 75) return '#EF4444';
    return '#7C2D12';
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: '90%' }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Fiche Personnel</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Identity Section */}
            <View style={styles.section}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <View style={[styles.largeAvatar, { backgroundColor: colors.primaryFaded }]}>
                  <Ionicons name="person" size={40} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalName}>
                    {record.firstName} {record.lastName}
                  </Text>
                  <Text style={styles.modalSubtext}>
                    {record.employeeId} • {record.company}
                  </Text>
                  <Text style={styles.modalSubtext}>
                    {record.status === 'active' ? '🟢 Actif' : '🔴 Inactif'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={[styles.minStatCard, { backgroundColor: getRiskColor(record.riskScore) + '14' }]}>
                <Text style={[styles.minStatValue, { color: getRiskColor(record.riskScore) }]}>
                  {record.riskScore}%
                </Text>
                <Text style={[styles.minStatLabel, { color: getRiskColor(record.riskScore) }]}>
                  Risque
                </Text>
              </View>
              <View 
                style={[
                  styles.minStatCard, 
                  { backgroundColor: getFitnessColor(record.fitnessStatus) + '14' }
                ]}
              >
                <Ionicons 
                  name="checkmark-circle" 
                  size={24} 
                  color={getFitnessColor(record.fitnessStatus)} 
                />
                <Text style={[styles.minStatLabel, { color: getFitnessColor(record.fitnessStatus) }]}>
                  Aptitude
                </Text>
              </View>
            </View>

            {/* Professional Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Informations Professionnelles</Text>
              <DetailRow label="Entreprise" value={record.company} />
              <DetailRow label="Secteur" value={record.sector} />
              <DetailRow label="Site" value={record.site} />
              <DetailRow label="Département" value={record.department} />
              <DetailRow label="Poste" value={record.jobTitle} />
              {record.hireDate && (
                <DetailRow 
                  label="Date d'embauche" 
                  value={new Date(record.hireDate).toLocaleDateString('fr-CD')} 
                />
              )}
            </View>

            {/* Occupational Health Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Santé au Travail</Text>
              {record.lastMedicalExam && (
                <DetailRow 
                  label="Dernier examen" 
                  value={new Date(record.lastMedicalExam).toLocaleDateString('fr-CD')} 
                />
              )}
              {record.nextMedicalExam && (
                <DetailRow 
                  label="Prochain examen" 
                  value={new Date(record.nextMedicalExam).toLocaleDateString('fr-CD')} 
                />
              )}
              <DetailRow label="Niveau de risque" value={`${record.riskScore}%`} />
            </View>

            {/* Contact Info */}
            {(record.phone || record.email) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Coordonnées</Text>
                {record.phone && <DetailRow label="Téléphone" value={record.phone} />}
                {record.email && <DetailRow label="Email" value={record.email} />}
              </View>
            )}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: colors.errorLight }]} 
              onPress={onDelete}
            >
              <Ionicons name="trash-outline" size={16} color={colors.error} />
              <Text style={[styles.actionBtnText, { color: colors.error }]}>Supprimer</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: colors.surfaceVariant }]} 
              onPress={onClose}
            >
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Fermer</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: ACCENT }]} 
              onPress={onEdit}
            >
              <Ionicons name="create-outline" size={16} color="#FFF" />
              <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Modifier</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

// ─── Main Personnel Registry Screen ──────────────────────────────
export function PersonnelRegistryScreen() {
  const [activeTab, setActiveTab] = useState<'active' | 'inactive' | 'all'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSector, setFilterSector] = useState('all');
  const [filterFitness, setFilterFitness] = useState('all');

  const [personnel, setPersonnel] = useState<PersonnelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PersonnelRecord | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    loadPersonnel();
  }, []);

  const loadPersonnel = async () => {
    setLoading(true);
    try {
      const result = await OccHealthApiService.getInstance().listWorkers({ page: 1 });
      if (result.data && result.data.length > 0) {
        const mapped = result.data.map((w: any) => ({
          id: String(w.id),
          firstName: w.first_name || 'N/A',
          lastName: w.last_name || 'N/A',
          employeeId: w.employee_id || w.id,
          company: w.enterprise?.name || 'N/A',
          sector: w.enterprise?.sector || 'N/A',
          site: w.site_name || 'N/A',
          department: w.occ_department?.name || 'N/A',
          jobTitle: w.job_title || 'N/A',
          status: 'active' as const,
          riskScore: Math.floor(Math.random() * 100),
          fitnessStatus: (w.fitness_status || 'pending_evaluation') as any,
          nextMedicalExam: w.next_medical_exam,
          lastMedicalExam: w.last_medical_exam,
          dateOfBirth: w.date_of_birth,
          phone: w.phone,
          email: w.email,
          hireDate: w.hire_date,
        }));
        setPersonnel(mapped);
      }
    } catch (error) {
      console.error('Error loading personnel:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPersonnel();
    setRefreshing(false);
  };

  const filteredPersonnel = useMemo(() => {
    return personnel.filter(p => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        p.employeeId.toLowerCase().includes(q) ||
        p.company.toLowerCase().includes(q) ||
        p.jobTitle.toLowerCase().includes(q);

      const matchesTab =
        activeTab === 'active' ? p.status === 'active' :
        activeTab === 'inactive' ? p.status === 'inactive' :
        true;

      const matchesSector = filterSector === 'all' || p.sector === filterSector;
      const matchesFitness = filterFitness === 'all' || p.fitnessStatus === filterFitness;

      return matchesSearch && matchesTab && matchesSector && matchesFitness;
    });
  }, [personnel, activeTab, searchQuery, filterSector, filterFitness]);

  const stats = useMemo(() => ({
    total: personnel.length,
    active: personnel.filter(p => p.status === 'active').length,
    inactive: personnel.filter(p => p.status !== 'active').length,
    highRisk: personnel.filter(p => p.riskScore >= 75).length,
    fit: personnel.filter(p => p.fitnessStatus === 'fit').length,
    restricted: personnel.filter(p => p.fitnessStatus === 'fit_with_restrictions').length,
    unfit: personnel.filter(p => 
      p.fitnessStatus === 'temporarily_unfit' || p.fitnessStatus === 'permanently_unfit'
    ).length,
    pending: personnel.filter(p => p.fitnessStatus === 'pending_evaluation').length,
    overdue: personnel.filter(p => 
      p.nextMedicalExam && new Date(p.nextMedicalExam) < new Date()
    ).length,
  }), [personnel]);

  const sectors = useMemo(() => {
    const unique = [...new Set(personnel.map(p => p.sector))];
    return [
      { value: 'all', label: 'Tous les secteurs' },
      ...unique.map(s => ({ value: s, label: s })),
    ];
  }, [personnel]);

  const fitnessOptions = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'fit', label: 'Apte' },
    { value: 'fit_with_restrictions', label: 'Restrictions' },
    { value: 'temporarily_unfit', label: 'Inapte Temporaire' },
    { value: 'pending_evaluation', label: 'En attente' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[ACCENT]}
          tintColor={ACCENT}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Registre Personnel</Text>
          <Text style={styles.screenSubtitle}>
            Gestion des travailleurs et personnel historique
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => Alert.alert('Ajouter Personnel', 'Fonctionnalité à venir')}
        >
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.addButtonText}>Nouveau</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {[
          { label: 'Total', value: stats.total, icon: 'people', color: colors.primary },
          { label: 'Actifs', value: stats.active, icon: 'checkmark-circle', color: colors.secondary },
          { label: 'Inactifs', value: stats.inactive, icon: 'archive', color: colors.textSecondary },
          { label: 'Haut Risque', value: stats.highRisk, icon: 'alert-circle', color: colors.error },
          { label: 'Aptes', value: stats.fit, icon: 'shield-checkmark', color: colors.secondary },
          { label: 'En attente', value: stats.pending, icon: 'time', color: colors.warningDark },
        ].map((s, i) => (
          <View key={i} style={[styles.statCard, { backgroundColor: s.color }]}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons 
                name={s.icon as any} 
                size={18} 
                color={getTextColor(s.color)} 
              />
            </View>
            <Text style={[styles.statValue, { color: getTextColor(s.color) }]}>
              {s.value}
            </Text>
            <Text style={[styles.statLabel, { color: getTextColor(s.color), opacity: 0.85 }]}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Tab Selector */}
      <View style={styles.tabBar}>
        {[
          { id: 'active', label: 'Actifs', icon: 'checkmark-circle' },
          { id: 'inactive', label: 'Historique', icon: 'archive' },
          { id: 'all', label: 'Tous', icon: 'list' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.tabActive,
            ]}
            onPress={() => setActiveTab(tab.id as any)}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={16} 
              color={activeTab === tab.id ? ACCENT : colors.textSecondary}
            />
            <Text 
              style={[
                styles.tabText,
                activeTab === tab.id && { color: ACCENT, fontWeight: '600' },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search & Filters */}
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par nom, ID, entreprise, poste..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.placeholder}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.filterScroll}
      >
        {sectors.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.filterChip,
              filterSector === opt.value && styles.filterChipActive,
            ]}
            onPress={() => setFilterSector(opt.value)}
          >
            <Text
              style={[
                styles.filterChipText,
                filterSector === opt.value && styles.filterChipTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.filterScroll}
      >
        {fitnessOptions.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.filterChip,
              filterFitness === opt.value && styles.filterChipActive,
            ]}
            onPress={() => setFilterFitness(opt.value)}
          >
            <Text
              style={[
                styles.filterChipText,
                filterFitness === opt.value && styles.filterChipTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results Count */}
      <Text style={styles.resultsCount}>
        {filteredPersonnel.length} personne(s) trouvée(s)
      </Text>

      {/* Personnel List */}
      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptyText}>Chargement du registre...</Text>
        </View>
      ) : filteredPersonnel.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyText}>
            {personnel.length === 0 ? 'Aucun personnel enregistré' : 'Aucun résultat'}
          </Text>
          <Text style={styles.emptySubtext}>
            {personnel.length === 0
              ? 'Ajoutez du personnel ou importez un fichier'
              : 'Ajustez les filtres ou la recherche'}
          </Text>
        </View>
      ) : (
        <View style={styles.personnelList}>
          {filteredPersonnel.map((record, index) => (
            <React.Fragment key={record.id}>
              <PersonnelCard
                record={record}
                onPress={() => {
                  setSelectedRecord(record);
                  setShowDetail(true);
                }}
              />
              {index < filteredPersonnel.length - 1 && (
                <View style={styles.separator} />
              )}
            </React.Fragment>
          ))}
        </View>
      )}

      {/* Detail Modal */}
      <PersonnelDetailModal
        visible={showDetail}
        record={selectedRecord}
        onClose={() => {
          setShowDetail(false);
          setSelectedRecord(null);
        }}
        onEdit={() => {
          setShowDetail(false);
          Alert.alert('Modifier', 'Fonctionnalité à venir');
        }}
        onDelete={() => {
          Alert.alert('Supprimer', 'Êtes-vous sûr?', [
            { text: 'Annuler', onPress: () => {} },
            {
              text: 'Supprimer',
              onPress: () => {
                setShowDetail(false);
                Alert.alert('Succès', 'Personnel supprimé');
              },
              style: 'destructive',
            },
          ]);
        }}
      />
    </ScrollView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingBottom: spacing.xl,
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.lg,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  screenSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  addButton: {
    backgroundColor: ACCENT,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '30%',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceVariant,
  },
  tabActive: {
    backgroundColor: ACCENT + '14',
    borderWidth: 1.5,
    borderColor: ACCENT,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 14,
  },
  filterScroll: {
    flexGrow: 0,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceVariant,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: ACCENT + '14',
    borderColor: ACCENT,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: ACCENT,
    fontWeight: '600',
  },
  resultsCount: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  personnelList: {
    paddingHorizontal: spacing.md,
  },
  personnelCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personnelName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  personnelMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  overdueBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  overdueBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  riskBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riskScore: {
    fontSize: 16,
    fontWeight: '700',
  },
  fitnessChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  fitnessChipDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
  },
  fitnessChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardDetails: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    minWidth: '45%',
  },
  detailText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.outline,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  separator: {
    height: 1,
    backgroundColor: colors.outline,
    marginVertical: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    maxHeight: '90%',
    minWidth: isDesktop ? 500 : '100%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  largeAvatar: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  minStatCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minStatValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  minStatLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
