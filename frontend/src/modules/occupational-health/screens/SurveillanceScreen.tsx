import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Dimensions, Modal, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import {
  SECTOR_PROFILES, OccHealthUtils,
  type IndustrySector, type ExposureRisk, type SurveillanceProgram,
  type JobCategory, type ExamType,
} from '../../../models/OccupationalHealth';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const ACCENT = colors.primary;
const STORAGE_KEY = '@occhealth_surveillance';

function getFrequencyLabel(f: string): string {
  const m: Record<string, string> = { monthly: 'Mensuel', quarterly: 'Trimestriel', biannual: 'Semestriel', annual: 'Annuel' };
  return m[f] || f;
}
function getFrequencyColor(f: string): string {
  const m: Record<string, string> = { monthly: '#EF4444', quarterly: '#F59E0B', biannual: '#3B82F6', annual: '#22C55E' };
  return m[f] || '#94A3B8';
}

// ─── Sample Data ─────────────────────────────────────────────
const SAMPLE_PROGRAMS: SurveillanceProgram[] = [
  {
    id: 'sp1', name: 'Surveillance Respiratoire — Mines', description: 'Programme de surveillance des travailleurs exposés aux poussières dans le secteur minier. Spirométrie et radiographie thoracique périodiques.',
    sector: 'mining', targetRiskGroup: 'silica_dust', targetJobCategories: ['underground_work', 'surface_operations', 'processing_refining'],
    frequency: 'biannual', requiredTests: ['periodic'], requiredScreenings: ['spirometry', 'chest_xray', 'blood_lead'],
    actionLevels: [
      { parameter: 'FEV1', warningThreshold: 80, actionThreshold: 70, criticalThreshold: 60, unit: '% prédit', actionRequired: 'Consultation pneumologue' },
      { parameter: 'Concentration silice', warningThreshold: 0.05, actionThreshold: 0.1, criticalThreshold: 0.2, unit: 'mg/m³', actionRequired: 'Renforcement ventilation + EPI' },
    ],
    isActive: true, createdBy: 'Dr. Mutombo', createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'sp2', name: 'Surveillance Auditive — Industrie', description: 'Audiométrie de suivi pour les travailleurs exposés au bruit industriel >85 dB(A).',
    sector: 'manufacturing', targetRiskGroup: 'noise', targetJobCategories: ['production_line', 'maintenance_mechanical'],
    frequency: 'annual', requiredTests: ['periodic'], requiredScreenings: ['audiometry'],
    actionLevels: [
      { parameter: 'STS (Standard Threshold Shift)', warningThreshold: 10, actionThreshold: 15, criticalThreshold: 25, unit: 'dB', actionRequired: 'Renforcement protection auditive' },
    ],
    isActive: true, createdBy: 'Dr. Kabasele', createdAt: '2024-03-01T08:00:00Z',
  },
  {
    id: 'sp3', name: 'Surveillance Psychosociale — Secteur Tertiaire', description: 'Dépistage du burnout et du stress professionnel pour les employés de bureau et du secteur bancaire.',
    sector: 'banking_finance', targetRiskGroup: 'psychosocial', targetJobCategories: ['office_clerical', 'management', 'customer_service', 'finance_accounting'],
    frequency: 'annual', requiredTests: ['periodic'], requiredScreenings: ['mental_health_screening', 'cardiovascular_screening'],
    actionLevels: [
      { parameter: 'Score Burnout (MBI)', warningThreshold: 3, actionThreshold: 4, criticalThreshold: 5, unit: '/6', actionRequired: 'Orientation psychologue du travail' },
    ],
    isActive: true, createdBy: 'Dr. Ngoy', createdAt: '2024-06-01T09:00:00Z',
  },
  {
    id: 'sp4', name: 'Surveillance AES — Santé', description: 'Suivi des accidents d\'exposition au sang (AES) et vaccination pour le personnel de santé.',
    sector: 'healthcare', targetRiskGroup: 'biological', targetJobCategories: ['clinical_care', 'nursing', 'laboratory'],
    frequency: 'quarterly', requiredTests: ['periodic'], requiredScreenings: ['hepatitis_b_screening', 'tb_screening', 'blood_pathogen_test'],
    actionLevels: [
      { parameter: 'Taux AES', warningThreshold: 2, actionThreshold: 5, criticalThreshold: 10, unit: 'incidents/trimestre', actionRequired: 'Formation rappel + audit des pratiques' },
    ],
    isActive: true, createdBy: 'Dr. Mbala', createdAt: '2024-02-10T11:00:00Z',
  },
  {
    id: 'sp5', name: 'Surveillance Ergonomique — BTP', description: 'Évaluation musculo-squelettique pour les travailleurs du BTP soumis à des charges lourdes.',
    sector: 'construction', targetRiskGroup: 'ergonomic', targetJobCategories: ['construction_trades', 'heavy_equipment'],
    frequency: 'biannual', requiredTests: ['periodic'], requiredScreenings: ['musculoskeletal_screening'],
    actionLevels: [
      { parameter: 'Score REBA', warningThreshold: 4, actionThreshold: 8, criticalThreshold: 11, unit: '/15', actionRequired: 'Aménagement de poste' },
    ],
    isActive: false, createdBy: 'Dr. Kasongo', createdAt: '2024-04-20T14:00:00Z',
  },
];

// ─── Program Card ────────────────────────────────────────────
function ProgramCard({ program, onPress }: { program: SurveillanceProgram; onPress: () => void }) {
  const sectorProfile = SECTOR_PROFILES[program.sector];
  const freqColor = getFrequencyColor(program.frequency);

  return (
    <TouchableOpacity style={[styles.programCard, !program.isActive && styles.programCardInactive]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.programCardHeader}>
        <View style={[styles.programIcon, { backgroundColor: sectorProfile.color + '14' }]}>
          <Ionicons name="eye" size={20} color={sectorProfile.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={styles.programName}>{program.name}</Text>
            {!program.isActive && (
              <View style={styles.inactiveBadge}><Text style={styles.inactiveBadgeText}>INACTIF</Text></View>
            )}
          </View>
          <Text style={styles.programDescription} numberOfLines={2}>{program.description}</Text>
        </View>
      </View>

      <View style={styles.programCardBody}>
        <View style={styles.programInfoRow}>
          <View style={styles.programInfoItem}>
            <Ionicons name={sectorProfile.icon as any} size={14} color={sectorProfile.color} />
            <Text style={styles.programInfoText}>{sectorProfile.label}</Text>
          </View>
          <View style={[styles.freqBadge, { backgroundColor: freqColor + '14' }]}>
            <Ionicons name="repeat-outline" size={12} color={freqColor} />
            <Text style={[styles.freqBadgeText, { color: freqColor }]}>{getFrequencyLabel(program.frequency)}</Text>
          </View>
        </View>
        <View style={styles.programInfoRow}>
          <View style={styles.programInfoItem}>
            <Ionicons name="warning-outline" size={14} color="#EF4444" />
            <Text style={styles.programInfoText}>Risque: {OccHealthUtils.getExposureRiskLabel(program.targetRiskGroup)}</Text>
          </View>
          <View style={styles.programInfoItem}>
            <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.programInfoText}>{program.targetJobCategories.length} catégories</Text>
          </View>
        </View>
      </View>

      <View style={styles.programCardFooter}>
        <View style={styles.screeningTags}>
          {program.requiredScreenings.slice(0, 3).map((s, i) => (
            <View key={i} style={styles.screeningTag}>
              <Text style={styles.screeningTagText}>{s.replace(/_/g, ' ')}</Text>
            </View>
          ))}
          {program.requiredScreenings.length > 3 && <Text style={styles.moreText}>+{program.requiredScreenings.length - 3}</Text>}
        </View>
        <Text style={styles.alertLevels}>{program.actionLevels.length} seuil(s) d'alerte</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Detail Modal ────────────────────────────────────────────
function ProgramDetailModal({ visible, program, onClose, onToggle }: { visible: boolean; program: SurveillanceProgram | null; onClose: () => void; onToggle: () => void }) {
  if (!program) return null;
  const sectorProfile = SECTOR_PROFILES[program.sector];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Programme de Surveillance</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.textSecondary} /></TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <View style={[styles.detailIcon, { backgroundColor: sectorProfile.color + '14' }]}>
                <Ionicons name="eye" size={28} color={sectorProfile.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailTitle}>{program.name}</Text>
                <Text style={styles.detailSubtext}>{sectorProfile.label}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: program.isActive ? '#22C55E14' : '#94A3B814' }]}>
                <View style={[styles.statusDot, { backgroundColor: program.isActive ? '#22C55E' : '#94A3B8' }]} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: program.isActive ? '#22C55E' : '#94A3B8' }}>
                  {program.isActive ? 'Actif' : 'Inactif'}
                </Text>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Description</Text>
              <Text style={styles.detailText}>{program.description}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Configuration</Text>
              <DetailRow label="Fréquence" value={getFrequencyLabel(program.frequency)} />
              <DetailRow label="Risque ciblé" value={OccHealthUtils.getExposureRiskLabel(program.targetRiskGroup)} />
              <DetailRow label="Créé par" value={program.createdBy} />
              <DetailRow label="Date création" value={new Date(program.createdAt).toLocaleDateString('fr-CD')} />
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Catégories de postes ciblés</Text>
              <View style={styles.tagContainer}>
                {program.targetJobCategories.map((jc, i) => (
                  <View key={i} style={styles.jobTag}>
                    <Ionicons name="briefcase-outline" size={12} color={ACCENT} />
                    <Text style={styles.jobTagText}>{OccHealthUtils.getJobCategoryLabel(jc)}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Examens et Dépistages Requis</Text>
              <View style={styles.tagContainer}>
                {program.requiredScreenings.map((s, i) => (
                  <View key={i} style={[styles.jobTag, { backgroundColor: '#3B82F614' }]}>
                    <Ionicons name="medkit-outline" size={12} color="#3B82F6" />
                    <Text style={[styles.jobTagText, { color: '#3B82F6' }]}>{s.replace(/_/g, ' ')}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Seuils d'Alerte et Niveaux d'Action</Text>
              {program.actionLevels.map((al, i) => (
                <View key={i} style={styles.actionLevelCard}>
                  <Text style={styles.actionLevelParam}>{al.parameter} ({al.unit})</Text>
                  <View style={styles.thresholdsRow}>
                    <View style={[styles.thresholdBadge, { backgroundColor: '#F59E0B14' }]}>
                      <Text style={[styles.thresholdText, { color: '#F59E0B' }]}>⚠️ {al.warningThreshold}</Text>
                    </View>
                    <View style={[styles.thresholdBadge, { backgroundColor: '#EF444414' }]}>
                      <Text style={[styles.thresholdText, { color: '#EF4444' }]}>🔴 {al.actionThreshold}</Text>
                    </View>
                    <View style={[styles.thresholdBadge, { backgroundColor: '#DC262614' }]}>
                      <Text style={[styles.thresholdText, { color: '#DC2626' }]}>🚨 {al.criticalThreshold}</Text>
                    </View>
                  </View>
                  <Text style={styles.actionRequired}>Action: {al.actionRequired}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surfaceVariant }]} onPress={onClose}>
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Fermer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: program.isActive ? '#EF4444' : '#22C55E' }]} onPress={onToggle}>
              <Ionicons name={program.isActive ? 'pause-circle-outline' : 'play-circle-outline'} size={18} color="#FFF" />
              <Text style={[styles.actionBtnText, { color: '#FFF' }]}>{program.isActive ? 'Désactiver' : 'Activer'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

// ─── Add Program Modal ───────────────────────────────────────
function AddProgramModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (p: SurveillanceProgram) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sector, setSector] = useState<IndustrySector>('mining');
  const [frequency, setFrequency] = useState<'monthly' | 'quarterly' | 'biannual' | 'annual'>('annual');
  const [targetRisk, setTargetRisk] = useState<ExposureRisk>('noise');

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Erreur', 'Le nom est obligatoire.'); return; }
    const newProgram: SurveillanceProgram = {
      id: `sp-${Date.now()}`, name: name.trim(), description: description.trim(),
      sector, targetRiskGroup: targetRisk, targetJobCategories: [],
      frequency, requiredTests: ['periodic'], requiredScreenings: [],
      actionLevels: [], isActive: true, createdBy: 'Utilisateur',
      createdAt: new Date().toISOString(),
    };
    onSave(newProgram);
    setName(''); setDescription('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: '85%' }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouveau Programme</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.textSecondary} /></TouchableOpacity>
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Nom du Programme *</Text>
              <TextInput style={styles.formInput} value={name} onChangeText={setName} placeholder="Ex: Surveillance Respiratoire" />
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput style={[styles.formInput, { minHeight: 60, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} placeholder="Description du programme..." multiline />
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Fréquence</Text>
              <View style={styles.chipGrid}>
                {(['monthly', 'quarterly', 'biannual', 'annual'] as const).map(f => (
                  <TouchableOpacity key={f} style={[styles.optionChip, frequency === f && { backgroundColor: getFrequencyColor(f) + '20', borderColor: getFrequencyColor(f) }]} onPress={() => setFrequency(f)}>
                    <Text style={[styles.optionChipText, frequency === f && { color: getFrequencyColor(f), fontWeight: '600' }]}>{getFrequencyLabel(f)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Risque Ciblé</Text>
              <View style={styles.chipGrid}>
                {(['noise', 'silica_dust', 'chemical_exposure', 'ergonomic', 'psychosocial', 'biological', 'vibration', 'heat_stress'] as ExposureRisk[]).map(r => (
                  <TouchableOpacity key={r} style={[styles.optionChip, targetRisk === r && styles.optionChipActive]} onPress={() => setTargetRisk(r)}>
                    <Text style={[styles.optionChipText, targetRisk === r && styles.optionChipTextActive]}>{OccHealthUtils.getExposureRiskLabel(r)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surfaceVariant }]} onPress={onClose}>
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: ACCENT }]} onPress={handleSave}>
              <Ionicons name="save-outline" size={18} color="#FFF" />
              <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Créer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────
export function SurveillanceScreen() {
  const [programs, setPrograms] = useState<SurveillanceProgram[]>(SAMPLE_PROGRAMS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedProgram, setSelectedProgram] = useState<SurveillanceProgram | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setPrograms(JSON.parse(stored));
      else await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_PROGRAMS));
    } catch { }
  };
  const saveData = async (list: SurveillanceProgram[]) => {
    setPrograms(list);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  const handleAdd = (p: SurveillanceProgram) => {
    saveData([p, ...programs]);
    setShowAdd(false);
    Alert.alert('Succès', 'Programme de surveillance créé.');
  };

  const handleToggle = () => {
    if (!selectedProgram) return;
    const updated = programs.map(p =>
      p.id === selectedProgram.id ? { ...p, isActive: !p.isActive } : p
    );
    saveData(updated);
    setSelectedProgram({ ...selectedProgram, isActive: !selectedProgram.isActive });
    Alert.alert('Succès', `Programme ${selectedProgram.isActive ? 'désactivé' : 'activé'}.`);
  };

  const filtered = useMemo(() => {
    return programs.filter(p => {
      const q = searchQuery.toLowerCase();
      const matchQ = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      const matchA = filterActive === 'all' || (filterActive === 'active' ? p.isActive : !p.isActive);
      return matchQ && matchA;
    });
  }, [programs, searchQuery, filterActive]);

  const stats = useMemo(() => ({
    total: programs.length,
    active: programs.filter(p => p.isActive).length,
    inactive: programs.filter(p => !p.isActive).length,
    sectors: new Set(programs.map(p => p.sector)).size,
  }), [programs]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Programmes de Surveillance</Text>
          <Text style={styles.screenSubtitle}>Surveillance médicale par groupe de risque et secteur</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.addButtonText}>Nouveau Programme</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        {[
          { label: 'Total', value: stats.total, icon: 'eye', color: ACCENT },
          { label: 'Actifs', value: stats.active, icon: 'checkmark-circle', color: '#22C55E' },
          { label: 'Inactifs', value: stats.inactive, icon: 'pause-circle', color: '#94A3B8' },
          { label: 'Secteurs', value: stats.sectors, icon: 'business', color: '#6366F1' },
        ].map((s, i) => (
          <View key={i} style={[styles.statCard, { backgroundColor: s.color }]}>
            <View style={styles.statIcon}>
              <Ionicons name={s.icon as any} size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.filterBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput style={styles.searchInput} placeholder="Rechercher..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor={colors.placeholder} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollRow}>
          {[{ v: 'all', l: 'Tous' }, { v: 'active', l: 'Actifs' }, { v: 'inactive', l: 'Inactifs' }].map(opt => (
            <TouchableOpacity key={opt.v} style={[styles.filterChip, filterActive === opt.v && styles.filterChipActive]} onPress={() => setFilterActive(opt.v as any)}>
              <Text style={[styles.filterChipText, filterActive === opt.v && styles.filterChipTextActive]}>{opt.l}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Text style={styles.resultsCount}>{filtered.length} programme(s)</Text>
      <View style={styles.listContainer}>
        {filtered.map(p => <ProgramCard key={p.id} program={p} onPress={() => { setSelectedProgram(p); setShowDetail(true); }} />)}
        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="eye-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyText}>Aucun programme de surveillance</Text>
          </View>
        )}
      </View>

      <ProgramDetailModal visible={showDetail} program={selectedProgram} onClose={() => { setShowDetail(false); setSelectedProgram(null); }} onToggle={handleToggle} />
      <AddProgramModal visible={showAdd} onClose={() => setShowAdd(false)} onSave={handleAdd} />
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  contentContainer: { padding: isDesktop ? 32 : 16, paddingBottom: 40 },
  header: { flexDirection: isDesktop ? 'row' : 'column', justifyContent: 'space-between', alignItems: isDesktop ? 'center' : 'flex-start', gap: 12, marginBottom: 24 },
  screenTitle: { fontSize: 24, fontWeight: '700', color: colors.text },
  screenSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ACCENT, paddingHorizontal: 16, paddingVertical: 10, borderRadius: borderRadius.lg },
  addButtonText: { color: '#FFF', fontWeight: '600', fontSize: 14 },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, minWidth: isDesktop ? 130 : 100, borderRadius: borderRadius.xl, padding: 16, alignItems: 'center', ...shadows.md },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 2, textAlign: 'center' },

  filterBar: { gap: 10, marginBottom: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.lg, paddingHorizontal: 14, paddingVertical: 10, gap: 8, borderWidth: 1, borderColor: colors.outline, ...shadows.xs },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  filterScrollRow: { flexGrow: 0 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: borderRadius.full, backgroundColor: colors.surfaceVariant, marginRight: 8 },
  filterChipActive: { backgroundColor: ACCENT },
  filterChipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  filterChipTextActive: { color: '#FFF', fontWeight: '600' },

  resultsCount: { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
  listContainer: { gap: 12 },

  programCard: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 16, ...shadows.sm },
  programCardInactive: { opacity: 0.6 },
  programCardHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  programIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  programName: { fontSize: 15, fontWeight: '600', color: colors.text },
  programDescription: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 18 },
  inactiveBadge: { backgroundColor: '#94A3B814', paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full },
  inactiveBadgeText: { fontSize: 9, fontWeight: '700', color: '#94A3B8' },

  programCardBody: { gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.outline, marginBottom: 10 },
  programInfoRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  programInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  programInfoText: { fontSize: 12, color: colors.textSecondary },

  freqBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  freqBadgeText: { fontSize: 10, fontWeight: '600' },

  programCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.outline },
  screeningTags: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', flex: 1 },
  screeningTag: { backgroundColor: colors.surfaceVariant, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  screeningTagText: { fontSize: 10, color: colors.textSecondary, textTransform: 'capitalize' },
  moreText: { fontSize: 11, color: colors.textTertiary, alignSelf: 'center' },
  alertLevels: { fontSize: 11, color: colors.textSecondary },

  emptyState: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, width: isDesktop ? 650 : '100%', maxHeight: '90%', padding: 24, ...shadows.xl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: borderRadius.lg },
  actionBtnText: { fontWeight: '600', fontSize: 14 },

  detailSection: { marginBottom: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.outline },
  detailSectionTitle: { fontSize: 13, fontWeight: '700', color: ACCENT, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  detailTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  detailSubtext: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  detailText: { fontSize: 13, color: colors.text, lineHeight: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  detailLabel: { fontSize: 13, color: colors.textSecondary },
  detailValue: { fontSize: 13, fontWeight: '500', color: colors.text, maxWidth: '60%', textAlign: 'right' },

  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: borderRadius.full },
  statusDot: { width: 7, height: 7, borderRadius: 4 },

  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  jobTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ACCENT + '14', paddingHorizontal: 8, paddingVertical: 5, borderRadius: borderRadius.full },
  jobTagText: { fontSize: 11, fontWeight: '500', color: ACCENT },

  actionLevelCard: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.lg, padding: 12, marginBottom: 10 },
  actionLevelParam: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
  thresholdsRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  thresholdBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: borderRadius.md },
  thresholdText: { fontSize: 11, fontWeight: '600' },
  actionRequired: { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic' },

  formSection: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  formInput: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.outline },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.surfaceVariant },
  optionChipActive: { backgroundColor: ACCENT + '20', borderColor: ACCENT },
  optionChipText: { fontSize: 12, color: colors.textSecondary },
  optionChipTextActive: { color: ACCENT, fontWeight: '600' },
});
