import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, FlatList, Modal, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';

const { width } = Dimensions.get('window');

// ─── Types ──────────────────────────────────────────────────────
interface Worker {
  id: string;
  name: string;
  employeeId: string;
  sector: string;
  department: string;
  riskProfile: string;
  riskScore: number;
  fitnessCertificate: string;
}

interface Enterprise {
  id: string;
  name: string;
  sector: string;
  sites: number;
  workers: number;
  complianceScore: number;
  lastAudit: string;
}

interface RiskProfile {
  score: number;
  level: 'Low' | 'Medium' | 'High' | 'Critical';
  factors: string[];
  recommendations: string[];
}

// ─── Worker Registration & Risk Profiling ──────────────────────
export function WorkerRegistrationScreen() {
  const [searchText, setSearchText] = useState('');
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const mockWorkers: Worker[] = [
    {
      id: '1',
      name: 'Kabamba Mutombo',
      employeeId: 'EMP-001',
      sector: 'Mining - Underground',
      department: 'Operations',
      riskProfile: 'High',
      riskScore: 78,
      fitnessCertificate: 'Fit with Restrictions',
    },
    {
      id: '2',
      name: 'Tshisekedi Ilunga',
      employeeId: 'EMP-002',
      sector: 'Mining - Surface',
      department: 'Maintenance',
      riskProfile: 'Medium',
      riskScore: 54,
      fitnessCertificate: 'Fit',
    },
    {
      id: '3',
      name: 'Mukendi Kasongo',
      employeeId: 'EMP-003',
      sector: 'Construction',
      department: 'Safety',
      riskProfile: 'Medium',
      riskScore: 62,
      fitnessCertificate: 'Fit',
    },
  ];

  const filteredWorkers = mockWorkers.filter(w =>
    w.name.toLowerCase().includes(searchText.toLowerCase()) ||
    w.employeeId.toLowerCase().includes(searchText.toLowerCase())
  );

  const getRiskColor = (score: number) => {
    if (score < 30) return '#22C55E';
    if (score < 50) return '#F59E0B';
    if (score < 75) return '#EF4444';
    return '#7C2D12';
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Worker Registration</Text>
          <Text style={styles.subtitle}>Manage worker profiles & risk assessments</Text>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search worker name or ID..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.cardShadow]}>
            <Text style={styles.statValue}>1,247</Text>
            <Text style={styles.statLabel}>Total Workers</Text>
          </View>
          <View style={[styles.statCard, styles.cardShadow]}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>156</Text>
            <Text style={styles.statLabel}>High Risk</Text>
          </View>
          <View style={[styles.statCard, styles.cardShadow]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>342</Text>
            <Text style={styles.statLabel}>Medium Risk</Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {['All', 'High Risk', 'Medium Risk', 'Low Risk'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.filterTab, tab === 'All' && styles.filterTabActive]}
            >
              <Text style={[styles.filterTabText, tab === 'All' && { color: colors.primary }]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Detailed Worker List */}
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: 40 }}>
          {filteredWorkers.map(worker => (
            <TouchableOpacity
              key={worker.id}
              style={[styles.workerCard, styles.cardShadow]}
              onPress={() => {
                setSelectedWorker(worker);
                setIsModalVisible(true);
              }}
            >
              <View style={styles.workerHeader}>
                <View style={styles.workerAvatar}>
                  <Ionicons name="person" size={28} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.workerName}>{worker.name}</Text>
                  <Text style={styles.workerMeta}>{worker.employeeId}</Text>
                </View>
                <View style={[styles.riskBadge, { backgroundColor: getRiskColor(worker.riskScore) + '20' }]}>
                  <Text style={[styles.riskScore, { color: getRiskColor(worker.riskScore) }]}>
                    {worker.riskScore}%
                  </Text>
                </View>
              </View>

              <View style={styles.workerDetails}>
                <View style={styles.detailItem}>
                  <Ionicons name="briefcase" size={14} color={colors.textSecondary} />
                  <Text style={styles.detailText}>{worker.sector}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="people" size={14} color={colors.textSecondary} />
                  <Text style={styles.detailText}>{worker.department}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="shield-checkmark" size={14} color={colors.textSecondary} />
                  <Text style={styles.detailText}>{worker.fitnessCertificate}</Text>
                </View>
              </View>

              <View style={styles.progressBar}>
                <View
                  style={{
                    height: '100%',
                    width: `${worker.riskScore}%`,
                    backgroundColor: getRiskColor(worker.riskScore),
                    borderRadius: borderRadius.full,
                  }}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Worker Detail Modal */}
      {selectedWorker && (
        <WorkerDetailModal
          worker={selectedWorker}
          isVisible={isModalVisible}
          onClose={() => setIsModalVisible(false)}
        />
      )}
    </View>
  );
}

// ─── Worker Detail Modal ────────────────────────────────────────
function WorkerDetailModal({
  worker,
  isVisible,
  onClose,
}: {
  worker: Worker;
  isVisible: boolean;
  onClose: () => void;
}) {
  const riskFactors = [
    'Underground mining operations',
    'Exposure to silica dust',
    'High noise levels (>85dB)',
    'Heavy lifting & repetitive motions',
  ];

  const recommendations = [
    'Quarterly medical surveillance',
    'Enhanced respiratory protection',
    'Hearing protection devices required',
    'Ergonomic workstation assessment',
  ];

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{worker.name}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Risk Score Visualization */}
            <View style={[styles.riskSection, styles.cardShadow]}>
              <Text style={styles.sectionTitle}>Risk Assessment</Text>
              <View style={{ alignItems: 'center', marginVertical: spacing.lg }}>
                <View style={styles.riskCircle}>
                  <Text style={styles.riskCircleValue}>{worker.riskScore}</Text>
                  <Text style={styles.riskCircleLabel}>%</Text>
                </View>
                <Text style={[styles.riskLevel, { color: getRiskColor(worker.riskScore) }]}>
                  {worker.riskProfile} Risk Level
                </Text>
              </View>

              {/* Progress Bars for Categories */}
              {[
                { label: 'Exposure', value: 78 },
                { label: 'Physical Demand', value: 65 },
                { label: 'Chemical Hazard', value: 72 },
                { label: 'Psychosocial', value: 45 },
              ].map((cat, i) => (
                <View key={i} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{cat.label}</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>{cat.value}%</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View style={{ height: '100%', width: `${cat.value}%`, backgroundColor: colors.primary, borderRadius: 2 }} />
                  </View>
                </View>
              ))}
            </View>

            {/* Risk Factors */}
            <View style={[styles.section, styles.cardShadow]}>
              <Text style={styles.sectionTitle}>Key Risk Factors</Text>
              {riskFactors.map((factor, i) => (
                <View key={i} style={styles.factorItem}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', marginRight: 8 }} />
                  <Text style={{ flex: 1, fontSize: 13, color: colors.text }}>{factor}</Text>
                </View>
              ))}
            </View>

            {/* Recommendations */}
            <View style={[styles.section, styles.cardShadow]}>
              <Text style={styles.sectionTitle}>Recommendations</Text>
              {recommendations.map((rec, i) => (
                <View key={i} style={styles.factorItem}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E', marginRight: 8 }} />
                  <Text style={{ flex: 1, fontSize: 13, color: colors.text }}>{rec}</Text>
                </View>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="clipboard-outline" size={20} color={colors.primary} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>View History</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#22C55E' + '20' }]}>
                <Ionicons name="medkit-outline" size={20} color="#22C55E" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#22C55E' }}>Schedule Exam</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Enterprise & Multi-Site Management ─────────────────────────
export function EnterpriseManagementScreen() {
  const [selectedTab, setSelectedTab] = useState<'enterprises' | 'sites'>('enterprises');

  const mockEnterprises: Enterprise[] = [
    {
      id: '1',
      name: 'KCC Mining Main',
      sector: 'Mining',
      sites: 3,
      workers: 420,
      complianceScore: 94,
      lastAudit: '2026-01-15',
    },
    {
      id: '2',
      name: 'Construction Partners Ltd',
      sector: 'Construction',
      sites: 2,
      workers: 156,
      complianceScore: 87,
      lastAudit: '2025-12-20',
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Enterprise Management</Text>
          <Text style={styles.subtitle}>Multi-company & multi-site oversight</Text>
        </View>

        {/* Tab Selection */}
        <View style={styles.tabBar}>
          {['enterprises', 'sites'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, selectedTab === tab && styles.tabActive]}
              onPress={() => setSelectedTab(tab as any)}
            >
              <Text style={[styles.tabText, selectedTab === tab && { color: colors.primary }]}>
                {tab === 'enterprises' ? 'Enterprises' : 'Sites'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Enterprises List */}
        {selectedTab === 'enterprises' && (
          <View style={{ paddingHorizontal: spacing.md, paddingBottom: 40 }}>
            {mockEnterprises.map(ent => (
              <TouchableOpacity key={ent.id} style={[styles.enterpriseCard, styles.cardShadow]}>
                <View style={styles.enterpriseHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.enterpriseName}>{ent.name}</Text>
                    <Text style={styles.enterpriseMeta}>{ent.sector}</Text>
                  </View>
                  <View style={[styles.complianceBadge, complianceColor(ent.complianceScore)]}>
                    <Text style={styles.complianceValue}>{ent.complianceScore}%</Text>
                  </View>
                </View>

                <View style={styles.enterpriseStats}>
                  <View style={styles.statBarItem}>
                    <Ionicons name="location" size={16} color={colors.primary} />
                    <Text style={styles.statBarText}>{ent.sites} sites</Text>
                  </View>
                  <View style={styles.statBarItem}>
                    <Ionicons name="people" size={16} color={colors.secondary} />
                    <Text style={styles.statBarText}>{ent.workers} workers</Text>
                  </View>
                  <View style={styles.statBarItem}>
                    <Ionicons name="calendar" size={16} color={colors.textSecondary} />
                    <Text style={styles.statBarText}>Audit: {ent.lastAudit}</Text>
                  </View>
                </View>

                <View style={styles.progressBar}>
                  <View
                    style={{
                      height: '100%',
                      width: `${ent.complianceScore}%`,
                      backgroundColor: colors.primary,
                      borderRadius: 2,
                    }}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Helper Functions ────────────────────────────────────────────
function getRiskColor(score: number): string {
  if (score < 30) return '#22C55E';
  if (score < 50) return '#F59E0B';
  if (score < 75) return '#EF4444';
  return '#7C2D12';
}

function complianceColor(score: number) {
  if (score >= 90) return styles.complianceGreen;
  if (score >= 75) return styles.complianceYellow;
  return styles.complianceRed;
}

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: colors.textSecondary },
  
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.text,
  },

  statsRow: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.md, marginBottom: spacing.lg },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.primary },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },

  filterRow: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm, marginBottom: spacing.lg },
  filterTab: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: colors.surfaceSecondary },
  filterTabActive: { backgroundColor: colors.primary + '20', borderWidth: 1, borderColor: colors.primary },
  filterTabText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },

  workerCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md, borderLeftWidth: 4, borderLeftColor: colors.primary },
  workerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, gap: spacing.md },
  workerAvatar: { width: 50, height: 50, borderRadius: borderRadius.lg, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center' },
  workerName: { fontSize: 14, fontWeight: '700', color: colors.text },
  workerMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  riskBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  riskScore: { fontSize: 13, fontWeight: '700' },

  workerDetails: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 11, color: colors.textSecondary },

  progressBar: { height: 4, backgroundColor: colors.outlineVariant, borderRadius: borderRadius.full, overflow: 'hidden' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, paddingTop: spacing.lg, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.md },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },

  riskSection: { marginHorizontal: spacing.md, marginBottom: spacing.lg, backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.lg },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  riskCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center' },
  riskCircleValue: { fontSize: 32, fontWeight: '800', color: colors.primary },
  riskCircleLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  riskLevel: { fontSize: 14, fontWeight: '700', marginTop: spacing.sm },

  section: { marginHorizontal: spacing.md, marginBottom: spacing.lg, backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.lg },
  factorItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },

  actionButtons: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: borderRadius.lg },

  // Enterprise
  enterpriseCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md },
  enterpriseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, justifyContent: 'space-between' },
  enterpriseName: { fontSize: 14, fontWeight: '700', color: colors.text },
  enterpriseMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  complianceBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.lg },
  complianceValue: { fontSize: 13, fontWeight: '700', color: colors.primary },
  complianceGreen: { backgroundColor: '#22C55E' + '20' },
  complianceYellow: { backgroundColor: '#F59E0B' + '20' },
  complianceRed: { backgroundColor: '#EF4444' + '20' },

  enterpriseStats: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  statBarItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statBarText: { fontSize: 11, color: colors.textSecondary },

  // Tabs
  tabBar: { flexDirection: 'row', paddingHorizontal: spacing.md, spacing: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: spacing.md, borderBottomWidth: 2, borderBottomColor: 'transparent', alignItems: 'center' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },

  cardShadow: shadows.sm,
});
