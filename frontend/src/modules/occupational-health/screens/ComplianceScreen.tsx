import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions, Modal, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows } from '../../../theme/theme';
import { SECTOR_PROFILES, OccHealthUtils, type IndustrySector } from '../../../models/OccupationalHealth';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const ACCENT = '#D97706';
const STORAGE_KEY = '@occhealth_compliance';

interface ComplianceItem {
  id: string;
  category: 'iso45001' | 'ilo' | 'national' | 'sector' | 'internal';
  standard: string;
  clause: string;
  requirement: string;
  status: 'compliant' | 'partial' | 'non_compliant' | 'not_applicable';
  evidence: string;
  dueDate?: string;
  responsiblePerson: string;
  lastAuditDate?: string;
  notes: string;
  sector?: IndustrySector;
}

interface AuditRecord {
  id: string;
  title: string;
  auditDate: string;
  auditor: string;
  scope: string;
  findings: { type: 'major_nc' | 'minor_nc' | 'observation' | 'good_practice'; count: number }[];
  overallScore: number;
  status: 'planned' | 'in_progress' | 'completed' | 'follow_up';
  nextAuditDate?: string;
}

function getCategoryLabel(c: string): string {
  const m: Record<string, string> = { iso45001: 'ISO 45001', ilo: 'OIT/ILO', national: 'Législation RDC', sector: 'Sectoriel', internal: 'Interne' };
  return m[c] || c;
}
function getCategoryColor(c: string): string {
  const m: Record<string, string> = { iso45001: '#3B82F6', ilo: '#8B5CF6', national: '#059669', sector: '#D97706', internal: '#6366F1' };
  return m[c] || '#94A3B8';
}
function getCategoryIcon(c: string): string {
  const m: Record<string, string> = { iso45001: 'ribbon', ilo: 'globe', national: 'flag', sector: 'business', internal: 'document-text' };
  return m[c] || 'document';
}
function getStatusLabel(s: string): string {
  const m: Record<string, string> = { compliant: 'Conforme', partial: 'Partiel', non_compliant: 'Non conforme', not_applicable: 'N/A' };
  return m[s] || s;
}
function getStatusColor(s: string): string {
  const m: Record<string, string> = { compliant: '#22C55E', partial: '#F59E0B', non_compliant: '#EF4444', not_applicable: '#94A3B8' };
  return m[s] || '#94A3B8';
}
function getAuditStatusLabel(s: string): string {
  const m: Record<string, string> = { planned: 'Planifié', in_progress: 'En cours', completed: 'Terminé', follow_up: 'Suivi' };
  return m[s] || s;
}
function getAuditStatusColor(s: string): string {
  const m: Record<string, string> = { planned: '#3B82F6', in_progress: '#F59E0B', completed: '#22C55E', follow_up: '#8B5CF6' };
  return m[s] || '#94A3B8';
}

// ─── Sample Data ─────────────────────────────────────────────
const SAMPLE_ITEMS: ComplianceItem[] = [
  { id: 'c1', category: 'iso45001', standard: 'ISO 45001:2018', clause: '§4.1', requirement: 'Compréhension de l\'organisme et de son contexte', status: 'compliant', evidence: 'Analyse SWOT SST réalisée, revue de direction Q4 2024.', responsiblePerson: 'Dir. SST', lastAuditDate: '2024-12-15', notes: '' },
  { id: 'c2', category: 'iso45001', standard: 'ISO 45001:2018', clause: '§5.4', requirement: 'Consultation et participation des travailleurs', status: 'partial', evidence: 'Comité SST en place, mais participation irrégulière.', responsiblePerson: 'RH', dueDate: '2025-03-01', lastAuditDate: '2024-12-15', notes: 'Action: renforcer le comité SST' },
  { id: 'c3', category: 'iso45001', standard: 'ISO 45001:2018', clause: '§6.1', requirement: 'Actions face aux risques et opportunités', status: 'compliant', evidence: 'Évaluations des risques à jour pour 3 sites principaux.', responsiblePerson: 'Ing. HSE', lastAuditDate: '2024-12-15', notes: '' },
  { id: 'c4', category: 'iso45001', standard: 'ISO 45001:2018', clause: '§8.1.2', requirement: 'Élimination des dangers et réduction des risques', status: 'partial', evidence: 'Hiérarchie des contrôles appliquée partiellement.', responsiblePerson: 'Ing. HSE', dueDate: '2025-06-01', notes: 'Plan d\'action en cours' },
  { id: 'c5', category: 'iso45001', standard: 'ISO 45001:2018', clause: '§9.1.2', requirement: 'Évaluation de la conformité', status: 'non_compliant', evidence: 'Audit de conformité légale non réalisé en 2024.', responsiblePerson: 'Dir. Juridique', dueDate: '2025-02-15', notes: 'PRIORITÉ HAUTE — audit à planifier' },
  { id: 'c6', category: 'ilo', standard: 'Convention C155', clause: 'Art. 16', requirement: 'Garantir la sécurité des lieux de travail', status: 'compliant', evidence: 'Inspections mensuelles réalisées sur tous les sites.', responsiblePerson: 'HSE Manager', lastAuditDate: '2024-11-30', notes: '' },
  { id: 'c7', category: 'ilo', standard: 'Convention C161', clause: 'Art. 5', requirement: 'Services de médecine du travail', status: 'compliant', evidence: 'Service médical du travail opérationnel, 3 médecins.', responsiblePerson: 'Dir. Médical', notes: '' },
  { id: 'c8', category: 'national', standard: 'Code du Travail RDC', clause: 'Art. 171', requirement: 'Examens médicaux obligatoires (embauche, périodique, reprise)', status: 'partial', evidence: 'Examens d\'embauche systématiques, périodiques à renforcer.', responsiblePerson: 'Médecin du Travail', dueDate: '2025-04-01', notes: '' },
  { id: 'c9', category: 'national', standard: 'Code du Travail RDC', clause: 'Art. 178', requirement: 'Déclaration des accidents de travail dans les 48h', status: 'compliant', evidence: 'Processus de déclaration en place via application.', responsiblePerson: 'HSE Manager', notes: '' },
  { id: 'c10', category: 'sector', standard: 'Code Minier RDC', clause: 'Art. 285', requirement: 'Plan de gestion environnementale et sociale', status: 'partial', evidence: 'PGES existant mais nécessite mise à jour.', responsiblePerson: 'Dir. Environnement', dueDate: '2025-05-01', sector: 'mining', notes: '' },
  { id: 'c11', category: 'internal', standard: 'Politique SST Interne', clause: 'POL-001', requirement: 'Formation SST initiale pour tous les nouveaux employés', status: 'compliant', evidence: 'Programme d\'intégration SST de 3 jours en place.', responsiblePerson: 'Formation', notes: '' },
  { id: 'c12', category: 'internal', standard: 'Procédure EPI', clause: 'PROC-EPI-001', requirement: 'Dotation EPI selon matrice de risques', status: 'non_compliant', evidence: 'Ruptures de stock fréquentes sur certains EPI.', responsiblePerson: 'Logistique', dueDate: '2025-03-15', notes: 'Budget supplémentaire demandé' },
];

const SAMPLE_AUDITS: AuditRecord[] = [
  {
    id: 'a1', title: 'Audit ISO 45001 — Maintien', auditDate: '2024-12-15', auditor: 'Bureau Veritas',
    scope: 'Tous sites miniers et industriels', overallScore: 82,
    findings: [{ type: 'major_nc', count: 1 }, { type: 'minor_nc', count: 4 }, { type: 'observation', count: 7 }, { type: 'good_practice', count: 3 }],
    status: 'follow_up', nextAuditDate: '2025-06-15',
  },
  {
    id: 'a2', title: 'Audit Interne SST Q1 2025', auditDate: '2025-01-20', auditor: 'Équipe SST Interne',
    scope: 'Site Kamoto + Bureaux Lubumbashi', overallScore: 75,
    findings: [{ type: 'minor_nc', count: 6 }, { type: 'observation', count: 10 }, { type: 'good_practice', count: 5 }],
    status: 'in_progress',
  },
  {
    id: 'a3', title: 'Inspection Ministère du Travail', auditDate: '2025-03-10', auditor: 'Inspection du Travail',
    scope: 'Conformité Code du Travail', overallScore: 0,
    findings: [],
    status: 'planned',
  },
];

// ─── Compliance Item Card ────────────────────────────────────
function ComplianceCard({ item, onPress }: { item: ComplianceItem; onPress: () => void }) {
  const catColor = getCategoryColor(item.category);
  const statColor = getStatusColor(item.status);

  return (
    <TouchableOpacity style={styles.complianceCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: catColor + '14' }]}>
          <Ionicons name={getCategoryIcon(item.category) as any} size={16} color={catColor} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.cardStandard}>{item.standard}</Text>
            <Text style={styles.cardClause}>{item.clause}</Text>
          </View>
          <Text style={styles.cardRequirement} numberOfLines={2}>{item.requirement}</Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: statColor + '14' }]}>
          <View style={[styles.statusDot, { backgroundColor: statColor }]} />
          <Text style={[styles.statusChipText, { color: statColor }]}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>
      {item.evidence && <Text style={styles.cardEvidence} numberOfLines={1}>{item.evidence}</Text>}
      <View style={styles.cardFooter}>
        <Text style={styles.cardResponsible}>{item.responsiblePerson}</Text>
        {item.dueDate && <Text style={styles.cardDue}>Échéance: {new Date(item.dueDate).toLocaleDateString('fr-CD')}</Text>}
      </View>
    </TouchableOpacity>
  );
}

// ─── Detail Modal ────────────────────────────────────────────
function ComplianceDetailModal({ visible, item, onClose, onUpdateStatus }: { visible: boolean; item: ComplianceItem | null; onClose: () => void; onUpdateStatus: (id: string, status: ComplianceItem['status']) => void }) {
  if (!item) return null;
  const catColor = getCategoryColor(item.category);
  const statColor = getStatusColor(item.status);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Exigence de Conformité</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.textSecondary} /></TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <View style={[styles.detailIcon, { backgroundColor: catColor + '14' }]}>
                <Ionicons name={getCategoryIcon(item.category) as any} size={28} color={catColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailTitle}>{item.standard} — {item.clause}</Text>
                <Text style={styles.detailSubtext}>{getCategoryLabel(item.category)}</Text>
              </View>
              <View style={[styles.statusChip, { backgroundColor: statColor + '14' }]}>
                <View style={[styles.statusDot, { backgroundColor: statColor }]} />
                <Text style={[styles.statusChipText, { color: statColor }]}>{getStatusLabel(item.status)}</Text>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Exigence</Text>
              <Text style={styles.detailText}>{item.requirement}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Preuve / Évidence</Text>
              <Text style={styles.detailText}>{item.evidence || 'Aucune preuve documentée.'}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Détails</Text>
              <DetailRow label="Responsable" value={item.responsiblePerson} />
              {item.dueDate && <DetailRow label="Échéance" value={new Date(item.dueDate).toLocaleDateString('fr-CD')} />}
              {item.lastAuditDate && <DetailRow label="Dernier audit" value={new Date(item.lastAuditDate).toLocaleDateString('fr-CD')} />}
              {item.notes && <DetailRow label="Notes" value={item.notes} />}
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Modifier le Statut</Text>
              <View style={styles.statusOptions}>
                {(['compliant', 'partial', 'non_compliant', 'not_applicable'] as const).map(s => {
                  const c = getStatusColor(s); const sel = item.status === s;
                  return (
                    <TouchableOpacity key={s} style={[styles.statusOption, sel && { backgroundColor: c + '20', borderColor: c }]} onPress={() => onUpdateStatus(item.id, s)}>
                      <View style={[styles.statusDot, { backgroundColor: c }]} />
                      <Text style={[styles.statusOptionText, sel && { color: c, fontWeight: '600' }]}>{getStatusLabel(s)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
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

// ─── Main Screen ─────────────────────────────────────────────
export function ComplianceScreen() {
  const [items, setItems] = useState<ComplianceItem[]>(SAMPLE_ITEMS);
  const [audits] = useState<AuditRecord[]>(SAMPLE_AUDITS);
  const [selectedItem, setSelectedItem] = useState<ComplianceItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
      else await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_ITEMS));
    } catch { }
  };
  const saveData = async (list: ComplianceItem[]) => {
    setItems(list);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  const handleUpdateStatus = (id: string, status: ComplianceItem['status']) => {
    const updated = items.map(i => i.id === id ? { ...i, status } : i);
    saveData(updated);
    setSelectedItem(prev => prev && prev.id === id ? { ...prev, status } : prev);
    Alert.alert('Succès', 'Statut mis à jour.');
  };

  const filtered = useMemo(() => {
    return items.filter(i => {
      const matchC = filterCategory === 'all' || i.category === filterCategory;
      const matchS = filterStatus === 'all' || i.status === filterStatus;
      return matchC && matchS;
    });
  }, [items, filterCategory, filterStatus]);

  const stats = useMemo(() => {
    const compliant = items.filter(i => i.status === 'compliant').length;
    const partial = items.filter(i => i.status === 'partial').length;
    const nonCompliant = items.filter(i => i.status === 'non_compliant').length;
    const applicable = items.filter(i => i.status !== 'not_applicable').length;
    const score = applicable > 0 ? Math.round(((compliant + partial * 0.5) / applicable) * 100) : 0;
    return { total: items.length, compliant, partial, nonCompliant, score };
  }, [items]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Conformité Réglementaire</Text>
          <Text style={styles.screenSubtitle}>Suivi ISO 45001, OIT, Code du Travail RDC et normes sectorielles</Text>
        </View>
      </View>

      {/* Score & Stats */}
      <View style={styles.scoreRow}>
        <View style={styles.scoreCard}>
          <View style={[styles.scoreCircle, { borderColor: OccHealthUtils.getComplianceColor(stats.score) }]}>
            <Text style={[styles.scoreValue, { color: OccHealthUtils.getComplianceColor(stats.score) }]}>{stats.score}%</Text>
          </View>
          <Text style={styles.scoreLabel}>Score Global</Text>
        </View>
        <View style={styles.statsColumn}>
          {[
            { label: 'Total', value: stats.total, icon: 'list', color: ACCENT },
            { label: 'Conformes', value: stats.compliant, icon: 'checkmark-circle', color: '#22C55E' },
            { label: 'Partiels', value: stats.partial, icon: 'alert-circle', color: '#F59E0B' },
            { label: 'Non conformes', value: stats.nonCompliant, icon: 'close-circle', color: '#EF4444' },
          ].map((s, i) => (
            <View key={i} style={[styles.miniStatCard, { backgroundColor: s.color }]}>
              <View style={styles.miniStatIcon}>
                <Ionicons name={s.icon as any} size={14} color="#FFFFFF" />
              </View>
              <Text style={styles.miniStatValue}>{s.value}</Text>
              <Text style={styles.miniStatLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Audit Section */}
      <View style={styles.auditSection}>
        <Text style={styles.sectionTitle}>Audits Récents & Planifiés</Text>
        <View style={{ gap: 10 }}>
          {audits.map(a => {
            const aColor = getAuditStatusColor(a.status);
            return (
              <View key={a.id} style={styles.auditCard}>
                <View style={styles.auditHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.auditTitle}>{a.title}</Text>
                    <Text style={styles.auditMeta}>{a.auditor} • {a.scope}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={[styles.statusChip, { backgroundColor: aColor + '14' }]}>
                      <View style={[styles.statusDot, { backgroundColor: aColor }]} />
                      <Text style={[styles.statusChipText, { color: aColor }]}>{getAuditStatusLabel(a.status)}</Text>
                    </View>
                    {a.overallScore > 0 && (
                      <Text style={[styles.auditScore, { color: OccHealthUtils.getComplianceColor(a.overallScore) }]}>{a.overallScore}%</Text>
                    )}
                  </View>
                </View>
                {a.findings.length > 0 && (
                  <View style={styles.findingsRow}>
                    {a.findings.map((f, fi) => {
                      const fColor = f.type === 'major_nc' ? '#DC2626' : f.type === 'minor_nc' ? '#EF4444' : f.type === 'observation' ? '#F59E0B' : '#22C55E';
                      const fLabel = f.type === 'major_nc' ? 'NC Maj.' : f.type === 'minor_nc' ? 'NC Min.' : f.type === 'observation' ? 'Obs.' : 'BP';
                      return (
                        <View key={fi} style={[styles.findingBadge, { backgroundColor: fColor + '14' }]}>
                          <Text style={[styles.findingText, { color: fColor }]}>{f.count} {fLabel}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
                <View style={styles.auditDates}>
                  <Text style={styles.auditDateText}>Date: {new Date(a.auditDate).toLocaleDateString('fr-CD')}</Text>
                  {a.nextAuditDate && <Text style={styles.auditDateText}>Prochain: {new Date(a.nextAuditDate).toLocaleDateString('fr-CD')}</Text>}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          {[{ v: 'all', l: 'Tous' }, { v: 'iso45001', l: 'ISO 45001' }, { v: 'ilo', l: 'OIT' }, { v: 'national', l: 'RDC' }, { v: 'sector', l: 'Sectoriel' }, { v: 'internal', l: 'Interne' }].map(opt => (
            <TouchableOpacity key={opt.v} style={[styles.filterChip, filterCategory === opt.v && styles.filterChipActive]} onPress={() => setFilterCategory(opt.v)}>
              <Text style={[styles.filterChipText, filterCategory === opt.v && styles.filterChipTextActive]}>{opt.l}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[{ v: 'all', l: '🔘 Tous' }, { v: 'compliant', l: '✅ Conforme' }, { v: 'partial', l: '⚠️ Partiel' }, { v: 'non_compliant', l: '❌ Non conforme' }].map(opt => (
            <TouchableOpacity key={opt.v} style={[styles.filterChip, filterStatus === opt.v && styles.filterChipActive]} onPress={() => setFilterStatus(opt.v)}>
              <Text style={[styles.filterChipText, filterStatus === opt.v && styles.filterChipTextActive]}>{opt.l}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Text style={styles.resultsCount}>{filtered.length} exigence(s)</Text>
      <View style={styles.listContainer}>
        {filtered.map(item => <ComplianceCard key={item.id} item={item} onPress={() => { setSelectedItem(item); setShowDetail(true); }} />)}
        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyText}>Aucune exigence trouvée</Text>
          </View>
        )}
      </View>

      <ComplianceDetailModal visible={showDetail} item={selectedItem} onClose={() => { setShowDetail(false); setSelectedItem(null); }} onUpdateStatus={handleUpdateStatus} />
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  contentContainer: { padding: isDesktop ? 32 : 16, paddingBottom: 40 },
  header: { marginBottom: 24 },
  screenTitle: { fontSize: 24, fontWeight: '700', color: colors.text },
  screenSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },

  scoreRow: { flexDirection: isDesktop ? 'row' : 'column', gap: 16, marginBottom: 24 },
  scoreCard: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 24, alignItems: 'center', ...shadows.sm },
  scoreCircle: { width: 100, height: 100, borderRadius: 50, borderWidth: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  scoreValue: { fontSize: 28, fontWeight: '700' },
  scoreLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  statsColumn: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  miniStatCard: { flex: 1, minWidth: isDesktop ? 120 : 90, borderRadius: borderRadius.lg, padding: 14, alignItems: 'center', ...shadows.md },
  miniStatIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  miniStatValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  miniStatLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: ACCENT, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

  auditSection: { marginBottom: 24 },
  auditCard: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 16, ...shadows.xs },
  auditHeader: { flexDirection: 'row', gap: 12 },
  auditTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  auditMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  auditScore: { fontSize: 16, fontWeight: '700' },
  findingsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.outline },
  findingBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  findingText: { fontSize: 10, fontWeight: '600' },
  auditDates: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  auditDateText: { fontSize: 11, color: colors.textSecondary },

  filterBar: { marginBottom: 16 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: borderRadius.full, backgroundColor: colors.surfaceVariant, marginRight: 8 },
  filterChipActive: { backgroundColor: ACCENT },
  filterChipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  filterChipTextActive: { color: '#FFF', fontWeight: '600' },

  resultsCount: { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
  listContainer: { gap: 10 },

  complianceCard: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 14, ...shadows.xs },
  cardHeader: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  cardIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardStandard: { fontSize: 12, fontWeight: '600', color: colors.text },
  cardClause: { fontSize: 11, color: ACCENT, fontWeight: '600' },
  cardRequirement: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusChipText: { fontSize: 10, fontWeight: '600' },
  cardEvidence: { fontSize: 11, color: colors.textTertiary, marginBottom: 6, fontStyle: 'italic' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.outline },
  cardResponsible: { fontSize: 11, color: colors.textSecondary },
  cardDue: { fontSize: 11, color: '#EF4444' },

  emptyState: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, width: isDesktop ? 600 : '100%', maxHeight: '90%', padding: 24, ...shadows.xl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: borderRadius.lg },
  actionBtnText: { fontWeight: '600', fontSize: 14 },

  detailSection: { marginBottom: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.outline },
  detailSectionTitle: { fontSize: 13, fontWeight: '700', color: ACCENT, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  detailTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  detailSubtext: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  detailText: { fontSize: 13, color: colors.text, lineHeight: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  detailLabel: { fontSize: 13, color: colors.textSecondary },
  detailValue: { fontSize: 13, fontWeight: '500', color: colors.text, maxWidth: '55%', textAlign: 'right' },

  statusOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.surfaceVariant },
  statusOptionText: { fontSize: 12, color: colors.textSecondary },
});
