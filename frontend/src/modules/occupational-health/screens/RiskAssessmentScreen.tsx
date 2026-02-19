import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Dimensions, Modal, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows } from '../../../theme/theme';
import {
  SECTOR_PROFILES, OccHealthUtils,
  type IndustrySector, type RiskAssessment, type HazardIdentification,
  type ExposureRisk, type SectorRiskLevel,
} from '../../../models/OccupationalHealth';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const ACCENT = colors.primary;
const STORAGE_KEY = '@occhealth_risk_assessments';

function getControlLabel(c: string): string {
  const m: Record<string, string> = { elimination: 'Élimination', substitution: 'Substitution', engineering: 'Ingénierie', administrative: 'Administrative', ppe: 'EPI' };
  return m[c] || c;
}
function getControlColor(c: string): string {
  const m: Record<string, string> = { elimination: '#22C55E', substitution: '#3B82F6', engineering: '#6366F1', administrative: '#F59E0B', ppe: '#EF4444' };
  return m[c] || '#94A3B8';
}
function getStatusLabel(s: string): string {
  const m: Record<string, string> = { draft: 'Brouillon', active: 'Actif', under_review: 'En révision', archived: 'Archivé' };
  return m[s] || s;
}
function getStatusColor(s: string): string {
  const m: Record<string, string> = { draft: '#94A3B8', active: '#22C55E', under_review: '#F59E0B', archived: '#64748B' };
  return m[s] || '#94A3B8';
}

// ─── Sample Data ─────────────────────────────────────────────
const SAMPLE_ASSESSMENTS: RiskAssessment[] = [
  {
    id: 'ra1', sector: 'mining', site: 'Site Kamoto Principal', area: 'Galerie souterraine Niv. -200m',
    assessmentDate: '2025-01-08', assessorName: 'Ing. Kasongo',
    hazards: [
      { hazardType: 'silica_dust', description: 'Exposition aux poussières de silice lors du forage et dynamitage', affectedWorkers: 45, likelihood: 4, consequence: 4, riskScore: 16, existingControls: ['Ventilation forcée', 'Masques FFP3'], additionalControls: ['Système brumisation', 'Rotation des postes'], controlHierarchy: 'engineering', responsiblePerson: 'Chef Ventilation', targetDate: '2025-03-01' },
      { hazardType: 'noise', description: 'Bruit des foreuses et concasseurs > 95 dB(A)', affectedWorkers: 60, likelihood: 5, consequence: 3, riskScore: 15, existingControls: ['Bouchons d\'oreilles fournis'], additionalControls: ['Casque anti-bruit obligatoire', 'Encoffrement machines'], controlHierarchy: 'engineering', responsiblePerson: 'HSE Manager', targetDate: '2025-04-15' },
      { hazardType: 'working_at_heights', description: 'Travaux sur plateformes sans garde-corps', affectedWorkers: 20, likelihood: 3, consequence: 5, riskScore: 15, existingControls: ['Harnais disponibles'], additionalControls: ['Installation garde-corps permanents', 'Formation travail en hauteur'], controlHierarchy: 'engineering', responsiblePerson: 'Chef Maintenance', targetDate: '2025-02-15' },
    ],
    overallRiskLevel: 'very_high', reviewDate: '2025-07-08', status: 'active', createdAt: '2025-01-08T10:00:00Z',
  },
  {
    id: 'ra2', sector: 'banking_finance', site: 'Siège Social Rawbank', area: 'Étages bureaux (1-8)',
    assessmentDate: '2025-01-12', assessorName: 'Dr. Ngoy',
    hazards: [
      { hazardType: 'ergonomic', description: 'Postures prolongées devant écran sans mobilier adapté', affectedWorkers: 200, likelihood: 4, consequence: 2, riskScore: 8, existingControls: ['Chaises standard'], additionalControls: ['Audit ergonomique complet', 'Chaises ergonomiques', 'Écrans réglables'], controlHierarchy: 'engineering', responsiblePerson: 'Dir. Logistique', targetDate: '2025-06-01' },
      { hazardType: 'psychosocial', description: 'Charge de travail élevée, objectifs commerciaux agressifs', affectedWorkers: 150, likelihood: 4, consequence: 3, riskScore: 12, existingControls: ['Cellule d\'écoute'], additionalControls: ['Programme bien-être', 'Formation gestion du stress'], controlHierarchy: 'administrative', responsiblePerson: 'DRH', targetDate: '2025-04-01' },
    ],
    overallRiskLevel: 'medium', reviewDate: '2025-07-12', status: 'active', createdAt: '2025-01-12T09:00:00Z',
  },
  {
    id: 'ra3', sector: 'healthcare', site: 'Hôpital Sendwe', area: 'Service de chirurgie',
    assessmentDate: '2024-12-15', assessorName: 'Dr. Mbala',
    hazards: [
      { hazardType: 'biological', description: 'Risque d\'exposition au sang et fluides biologiques', affectedWorkers: 35, likelihood: 4, consequence: 4, riskScore: 16, existingControls: ['EPI standard', 'Protocole AES'], additionalControls: ['Aiguilles sécurisées', 'Formation continue'], controlHierarchy: 'substitution', responsiblePerson: 'Inf. Chef', targetDate: '2025-03-01' },
      { hazardType: 'psychosocial', description: 'Surcharge de travail, travail de nuit, confrontation à la mort', affectedWorkers: 50, likelihood: 5, consequence: 3, riskScore: 15, existingControls: ['Rotation des gardes'], additionalControls: ['Groupe de parole', 'Soutien psychologique'], controlHierarchy: 'administrative', responsiblePerson: 'Dir. Nursing', targetDate: '2025-02-28' },
    ],
    overallRiskLevel: 'high', reviewDate: '2025-06-15', status: 'under_review', createdAt: '2024-12-15T14:00:00Z',
  },
];

// ─── Risk Matrix Component ───────────────────────────────────
function RiskMatrix({ hazards }: { hazards: HazardIdentification[] }) {
  const matrix = Array.from({ length: 5 }, () => Array(5).fill(0));
  hazards.forEach(h => { if (h.likelihood >= 1 && h.likelihood <= 5 && h.consequence >= 1 && h.consequence <= 5) matrix[5 - h.consequence][h.likelihood - 1]++; });

  const getCellColor = (row: number, col: number): string => {
    const score = (5 - row) * (col + 1);
    if (score >= 20) return '#DC262640';
    if (score >= 12) return '#EF444440';
    if (score >= 6) return '#F59E0B40';
    return '#22C55E40';
  };

  return (
    <View style={styles.matrixContainer}>
      <Text style={styles.matrixTitle}>Matrice de Risques (5×5)</Text>
      <View style={styles.matrixGrid}>
        <View style={styles.matrixYLabel}><Text style={styles.matrixAxisLabel}>Conséquence ↑</Text></View>
        <View>
          {matrix.map((row, ri) => (
            <View key={ri} style={styles.matrixRow}>
              <Text style={styles.matrixRowLabel}>{5 - ri}</Text>
              {row.map((count, ci) => (
                <View key={ci} style={[styles.matrixCell, { backgroundColor: getCellColor(ri, ci) }]}>
                  {count > 0 && <Text style={styles.matrixCellText}>{count}</Text>}
                </View>
              ))}
            </View>
          ))}
          <View style={styles.matrixBottomRow}>
            <Text style={styles.matrixRowLabel}> </Text>
            {[1, 2, 3, 4, 5].map(n => <Text key={n} style={styles.matrixColLabel}>{n}</Text>)}
          </View>
          <Text style={styles.matrixXLabel}>Probabilité →</Text>
        </View>
      </View>
      <View style={styles.matrixLegend}>
        {[{ label: 'Faible (1-5)', color: '#22C55E' }, { label: 'Modéré (6-11)', color: '#F59E0B' }, { label: 'Élevé (12-19)', color: '#EF4444' }, { label: 'Critique (20-25)', color: '#DC2626' }].map((l, i) => (
          <View key={i} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: l.color }]} />
            <Text style={styles.legendText}>{l.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Assessment Card ─────────────────────────────────────────
function AssessmentCard({ assessment, onPress }: { assessment: RiskAssessment; onPress: () => void }) {
  const sectorProfile = SECTOR_PROFILES[assessment.sector];
  const riskColor = OccHealthUtils.getSectorRiskColor(assessment.overallRiskLevel);
  const statusColor = getStatusColor(assessment.status);

  const highRisks = assessment.hazards.filter(h => h.riskScore >= 12).length;
  const totalWorkers = assessment.hazards.reduce((s, h) => s + h.affectedWorkers, 0);

  return (
    <TouchableOpacity style={styles.assessmentCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.assessmentCardHeader}>
        <View style={[styles.assessmentIcon, { backgroundColor: riskColor + '14' }]}>
          <Ionicons name="alert-circle" size={20} color={riskColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.assessmentSite}>{assessment.site}</Text>
          <Text style={styles.assessmentArea}>{assessment.area}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View style={[styles.riskLevelBadge, { backgroundColor: riskColor + '14' }]}>
            <Text style={[styles.riskLevelText, { color: riskColor }]}>
              {OccHealthUtils.getSectorRiskLabel(assessment.overallRiskLevel)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '14' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{getStatusLabel(assessment.status)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.assessmentCardBody}>
        <View style={styles.assessmentInfoRow}>
          <View style={styles.assessmentInfoItem}>
            <Ionicons name={sectorProfile.icon as any} size={14} color={sectorProfile.color} />
            <Text style={styles.assessmentInfoText}>{sectorProfile.label}</Text>
          </View>
          <View style={styles.assessmentInfoItem}>
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.assessmentInfoText}>{new Date(assessment.assessmentDate).toLocaleDateString('fr-CD')}</Text>
          </View>
        </View>
        <View style={styles.assessmentInfoRow}>
          <View style={styles.assessmentInfoItem}>
            <Ionicons name="warning-outline" size={14} color="#EF4444" />
            <Text style={styles.assessmentInfoText}>{assessment.hazards.length} dangers identifiés ({highRisks} élevés)</Text>
          </View>
          <View style={styles.assessmentInfoItem}>
            <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.assessmentInfoText}>{totalWorkers} travailleurs exposés</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Detail Modal ────────────────────────────────────────────
function AssessmentDetailModal({ visible, assessment, onClose }: { visible: boolean; assessment: RiskAssessment | null; onClose: () => void }) {
  if (!assessment) return null;
  const sectorProfile = SECTOR_PROFILES[assessment.sector];
  const riskColor = OccHealthUtils.getSectorRiskColor(assessment.overallRiskLevel);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: '92%' }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Évaluation des Risques</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.textSecondary} /></TouchableOpacity>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Informations Générales</Text>
              <DetailRow label="Site" value={assessment.site} />
              <DetailRow label="Zone" value={assessment.area} />
              <DetailRow label="Secteur" value={sectorProfile.label} />
              <DetailRow label="Date évaluation" value={new Date(assessment.assessmentDate).toLocaleDateString('fr-CD')} />
              <DetailRow label="Évaluateur" value={assessment.assessorName} />
              <DetailRow label="Prochaine révision" value={new Date(assessment.reviewDate).toLocaleDateString('fr-CD')} />
              <DetailRow label="Niveau global" value={OccHealthUtils.getSectorRiskLabel(assessment.overallRiskLevel)} />
            </View>

            {/* Risk Matrix */}
            <RiskMatrix hazards={assessment.hazards} />

            {/* Hazards List */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Dangers Identifiés</Text>
              {assessment.hazards.map((h, i) => {
                const riskScoreColor = OccHealthUtils.getRiskScoreColor(h.riskScore);
                const controlColor = getControlColor(h.controlHierarchy);
                return (
                  <View key={i} style={styles.hazardCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <Ionicons name="warning" size={16} color={riskScoreColor} />
                        <Text style={styles.hazardType}>{OccHealthUtils.getExposureRiskLabel(h.hazardType)}</Text>
                      </View>
                      <View style={[styles.scoreBadge, { backgroundColor: riskScoreColor + '14' }]}>
                        <Text style={[styles.scoreText, { color: riskScoreColor }]}>
                          Score: {h.riskScore} ({OccHealthUtils.getRiskScoreLabel(h.riskScore)})
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.hazardDesc}>{h.description}</Text>
                    <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
                      <Text style={styles.hazardMeta}>P: {h.likelihood}/5</Text>
                      <Text style={styles.hazardMeta}>C: {h.consequence}/5</Text>
                      <Text style={styles.hazardMeta}>{h.affectedWorkers} travailleurs</Text>
                    </View>

                    <View style={{ marginTop: 8 }}>
                      <Text style={styles.controlTitle}>Contrôles existants:</Text>
                      {h.existingControls.map((c, j) => (
                        <View key={j} style={styles.controlItem}>
                          <Ionicons name="checkmark-circle-outline" size={12} color="#22C55E" />
                          <Text style={styles.controlText}>{c}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={{ marginTop: 6 }}>
                      <Text style={styles.controlTitle}>Contrôles additionnels:</Text>
                      {h.additionalControls.map((c, j) => (
                        <View key={j} style={styles.controlItem}>
                          <Ionicons name="add-circle-outline" size={12} color={ACCENT} />
                          <Text style={styles.controlText}>{c}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                      <View style={[styles.controlHierarchyBadge, { backgroundColor: controlColor + '14' }]}>
                        <Text style={[styles.controlHierarchyText, { color: controlColor }]}>{getControlLabel(h.controlHierarchy)}</Text>
                      </View>
                      <Text style={styles.hazardMeta}>→ {h.responsiblePerson} • {new Date(h.targetDate).toLocaleDateString('fr-CD')}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surfaceVariant }]} onPress={onClose}>
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Fermer</Text>
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

// ─── Add Modal ───────────────────────────────────────────────
function AddAssessmentModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (a: RiskAssessment) => void }) {
  const [site, setSite] = useState('');
  const [area, setArea] = useState('');
  const [sector, setSector] = useState<IndustrySector>('mining');
  const [assessorName, setAssessorName] = useState('');

  const handleSave = () => {
    if (!site.trim()) { Alert.alert('Erreur', 'Le site est obligatoire.'); return; }
    const newAssessment: RiskAssessment = {
      id: `ra-${Date.now()}`, sector, site: site.trim(), area: area.trim() || 'Non spécifié',
      assessmentDate: new Date().toISOString().split('T')[0], assessorName: assessorName.trim() || 'Non spécifié',
      hazards: [], overallRiskLevel: SECTOR_PROFILES[sector].riskLevel,
      reviewDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'draft', createdAt: new Date().toISOString(),
    };
    onSave(newAssessment);
    setSite(''); setArea(''); setAssessorName('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: '80%' }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle Évaluation</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.textSecondary} /></TouchableOpacity>
            </View>
            <View style={styles.formSection}><Text style={styles.formLabel}>Site *</Text><TextInput style={styles.formInput} value={site} onChangeText={setSite} placeholder="Nom du site" /></View>
            <View style={styles.formSection}><Text style={styles.formLabel}>Zone</Text><TextInput style={styles.formInput} value={area} onChangeText={setArea} placeholder="Zone évaluée" /></View>
            <View style={styles.formSection}><Text style={styles.formLabel}>Évaluateur</Text><TextInput style={styles.formInput} value={assessorName} onChangeText={setAssessorName} placeholder="Nom de l'évaluateur" /></View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Secteur</Text>
              <View style={styles.chipGrid}>
                {(Object.keys(SECTOR_PROFILES) as IndustrySector[]).slice(0, 8).map(s => {
                  const sp = SECTOR_PROFILES[s]; const sel = sector === s;
                  return (
                    <TouchableOpacity key={s} style={[styles.optionChip, sel && { backgroundColor: sp.color + '20', borderColor: sp.color }]} onPress={() => setSector(s)}>
                      <Ionicons name={sp.icon as any} size={12} color={sel ? sp.color : colors.textSecondary} />
                      <Text style={[styles.optionChipText, sel && { color: sp.color, fontWeight: '600' }]}>{sp.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>
          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surfaceVariant }]} onPress={onClose}><Text style={[styles.actionBtnText, { color: colors.text }]}>Annuler</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: ACCENT }]} onPress={handleSave}><Ionicons name="save-outline" size={18} color="#FFF" /><Text style={[styles.actionBtnText, { color: '#FFF' }]}>Créer</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────
export function RiskAssessmentScreen() {
  const [assessments, setAssessments] = useState<RiskAssessment[]>(SAMPLE_ASSESSMENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState<RiskAssessment | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setAssessments(JSON.parse(stored));
      else await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_ASSESSMENTS));
    } catch { }
  };
  const saveData = async (list: RiskAssessment[]) => { setAssessments(list); await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list)); };

  const handleAdd = (a: RiskAssessment) => { saveData([a, ...assessments]); setShowAdd(false); Alert.alert('Succès', 'Évaluation des risques créée.'); };

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return assessments.filter(a => !q || a.site.toLowerCase().includes(q) || a.area.toLowerCase().includes(q) || SECTOR_PROFILES[a.sector].label.toLowerCase().includes(q));
  }, [assessments, searchQuery]);

  const stats = useMemo(() => {
    const allHazards = assessments.flatMap(a => a.hazards);
    return {
      total: assessments.length,
      totalHazards: allHazards.length,
      highRisks: allHazards.filter(h => h.riskScore >= 12).length,
      criticalRisks: allHazards.filter(h => h.riskScore >= 20).length,
      workersExposed: allHazards.reduce((s, h) => s + h.affectedWorkers, 0),
    };
  }, [assessments]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Évaluation des Risques</Text>
          <Text style={styles.screenSubtitle}>ISO 45001 §6.1 — Matrice de risques par secteur et poste</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.addButtonText}>Nouvelle Évaluation</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        {[
          { label: 'Évaluations', value: stats.total, icon: 'clipboard', color: ACCENT },
          { label: 'Dangers', value: stats.totalHazards, icon: 'warning', color: '#F59E0B' },
          { label: 'Risques Élevés', value: stats.highRisks, icon: 'alert-circle', color: '#EF4444' },
          { label: 'Critiques', value: stats.criticalRisks, icon: 'skull', color: '#DC2626' },
          { label: 'Travailleurs', value: stats.workersExposed, icon: 'people', color: '#6366F1' },
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

      {/* Global Risk Matrix */}
      <RiskMatrix hazards={assessments.flatMap(a => a.hazards)} />

      <View style={styles.filterBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput style={styles.searchInput} placeholder="Rechercher par site, zone, secteur..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor={colors.placeholder} />
        </View>
      </View>

      <Text style={styles.resultsCount}>{filtered.length} évaluation(s)</Text>
      <View style={styles.listContainer}>
        {filtered.map(a => <AssessmentCard key={a.id} assessment={a} onPress={() => { setSelectedAssessment(a); setShowDetail(true); }} />)}
        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyText}>Aucune évaluation trouvée</Text>
          </View>
        )}
      </View>

      <AssessmentDetailModal visible={showDetail} assessment={selectedAssessment} onClose={() => { setShowDetail(false); setSelectedAssessment(null); }} />
      <AddAssessmentModal visible={showAdd} onClose={() => setShowAdd(false)} onSave={handleAdd} />
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
  statCard: { flex: 1, minWidth: isDesktop ? 120 : 90, borderRadius: borderRadius.xl, padding: 16, alignItems: 'center', ...shadows.md },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 2, textAlign: 'center' },

  filterBar: { gap: 10, marginBottom: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.lg, paddingHorizontal: 14, paddingVertical: 10, gap: 8, borderWidth: 1, borderColor: colors.outline, ...shadows.xs },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },

  resultsCount: { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
  listContainer: { gap: 12 },

  assessmentCard: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 16, ...shadows.sm },
  assessmentCardHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  assessmentIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  assessmentSite: { fontSize: 15, fontWeight: '600', color: colors.text },
  assessmentArea: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  riskLevelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  riskLevelText: { fontSize: 10, fontWeight: '600' },

  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '600' },

  assessmentCardBody: { gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.outline },
  assessmentInfoRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  assessmentInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  assessmentInfoText: { fontSize: 12, color: colors.textSecondary },

  emptyState: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },

  // Risk Matrix
  matrixContainer: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 20, marginBottom: 24, ...shadows.sm },
  matrixTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 16, textAlign: 'center' },
  matrixGrid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  matrixYLabel: { marginRight: 4 },
  matrixAxisLabel: { fontSize: 10, color: colors.textSecondary, writingDirection: 'ltr' },
  matrixRow: { flexDirection: 'row', alignItems: 'center' },
  matrixRowLabel: { width: 20, textAlign: 'center', fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  matrixCell: { width: isDesktop ? 48 : 40, height: isDesktop ? 36 : 30, borderWidth: 1, borderColor: colors.outline, alignItems: 'center', justifyContent: 'center' },
  matrixCellText: { fontSize: 13, fontWeight: '700', color: colors.text },
  matrixBottomRow: { flexDirection: 'row', alignItems: 'center' },
  matrixColLabel: { width: isDesktop ? 48 : 40, textAlign: 'center', fontSize: 11, color: colors.textSecondary, fontWeight: '600', marginTop: 2 },
  matrixXLabel: { textAlign: 'center', fontSize: 10, color: colors.textSecondary, marginTop: 4, marginLeft: 20 },
  matrixLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 10, color: colors.textSecondary },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, width: isDesktop ? 700 : '100%', maxHeight: '90%', padding: 24, ...shadows.xl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: borderRadius.lg },
  actionBtnText: { fontWeight: '600', fontSize: 14 },

  detailSection: { marginBottom: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.outline },
  detailSectionTitle: { fontSize: 13, fontWeight: '700', color: ACCENT, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  detailLabel: { fontSize: 13, color: colors.textSecondary },
  detailValue: { fontSize: 13, fontWeight: '500', color: colors.text, maxWidth: '60%', textAlign: 'right' },

  hazardCard: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.lg, padding: 14, marginBottom: 10 },
  hazardType: { fontSize: 14, fontWeight: '600', color: colors.text },
  hazardDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  hazardMeta: { fontSize: 11, color: colors.textSecondary },
  scoreBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  scoreText: { fontSize: 10, fontWeight: '700' },
  controlTitle: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 },
  controlItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  controlText: { fontSize: 12, color: colors.text },
  controlHierarchyBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  controlHierarchyText: { fontSize: 10, fontWeight: '600' },

  formSection: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  formInput: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.outline },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.surfaceVariant },
  optionChipText: { fontSize: 11, color: colors.textSecondary },
});
