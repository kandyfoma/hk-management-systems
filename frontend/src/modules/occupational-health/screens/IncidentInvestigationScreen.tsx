import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  StyleSheet, Dimensions, Alert, TextInput, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import DateInput from '../../../components/DateInput';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const ACCENT = colors.primary;

interface RCAMethod {
  id: string;
  name: string;
  description: string;
  icon: string;
  steps: string[];
}

interface CAPA {
  id: string;
  action: string;
  responsible: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  effectiveness: 'not_assessed' | 'ineffective' | 'partially_effective' | 'effective' | 'highly_effective';
  completedDate?: string;
  notes?: string;
}

interface IncidentInvestigation {
  id: string;
  incidentId: string;
  status: 'reported' | 'under_investigation' | 'root_cause_identified' | 'corrective_action_planned' | 'corrective_action_implemented' | 'effectiveness_verified' | 'closed';
  investigationTeam: string[];
  investigator: string;
  startDate: string;
  completedDate?: string;
  rcaMethod: 'fishbone' | 'five_why' | 'fault_tree' | 'timeline' | 'other';
  rcaFindings: string;
  rootCauses: string[];
  contributingFactors: string[];
  immediateCauses: string[];
  capaList: CAPA[];
  analysisNotes: string;
  evidenceAttachments: string[];
  nextReviewDate?: string;
}

const RCA_METHODS: Record<string, RCAMethod> = {
  fishbone: {
    id: 'fishbone',
    name: 'Ishikawa Diagram (Fishbone)',
    description: 'Organized analysis of causes by category',
    icon: 'git-branch-outline',
    steps: [
      'Draw problem heading (head)',
      'Identify main cause categories (bones)',
      'List causes under each category',
      'Drill down to root causes',
    ],
  },
  five_why: {
    id: 'five_why',
    name: '5 Why Analysis',
    description: 'Iterative questioning to reach root cause',
    icon: 'help-buoy-outline',
    steps: [
      'Why did the failure occur? â†’',
      'Why did that cause occur? â†’',
      'Why did that happen? â†’',
      'Why did that cause happen? â†’',
      'Why did the root cause occur? âœ“',
    ],
  },
  fault_tree: {
    id: 'fault_tree',
    name: 'Fault Tree Analysis',
    description: 'Deductive analysis from failure to causes',
    icon: 'git-network-outline',
    steps: [
      'Define top event (failure)',
      'Identify intermediate events',
      'Identify basic events',
      'Use logic gates (AND/OR)',
    ],
  },
  timeline: {
    id: 'timeline',
    name: 'Chronological Timeline',
    description: 'Sequential analysis of events leading to incident',
    icon: 'calendar-outline',
    steps: [
      'Document start of shift/task',
      'List all events chronologically',
      'Note conditions/environment',
      'Identify critical transition points',
    ],
  },
  other: {
    id: 'other',
    name: 'Narrative Analysis',
    description: 'Detailed narrative description of events',
    icon: 'document-text-outline',
    steps: [
      'Write detailed incident narrative',
      'Identify all actors involved',
      'Document environmental conditions',
      'Note sequences and contributing factors',
    ],
  },
};

const SAMPLE_INVESTIGATIONS: IncidentInvestigation[] = [
  {
    id: 'inv1',
    incidentId: 'inc1',
    status: 'root_cause_identified',
    investigationTeam: ['Dr. Mutombo', 'Eng. Kasongo', 'HSE Manager'],
    investigator: 'Dr. Mutombo',
    startDate: '2025-01-10',
    rcaMethod: 'fishbone',
    rootCauses: ['Absence de garde-corps sur plateforme', 'Défaut d\'inspection pré-travail'],
    contributingFactors: ['Éclairage insuffisant', 'Personnel insuffisamment formé'],
    immediateCauses: ['Chute de 3m sans retenue'],
    rcaFindings: 'L\'inspection pré-travail n\'a pas identifié les lacunes de sécurité. Les guards-corps manquaient.',
    capaList: [
      {
        id: 'ca1',
        action: 'Installation de garde-corps sur toutes les plateformes',
        responsible: 'Chef Maintenance',
        dueDate: '2025-02-01',
        status: 'in_progress',
        effectiveness: 'not_assessed',
      },
      {
        id: 'ca2',
        action: 'Formation recyclage travail en hauteur',
        responsible: 'HSE Manager',
        dueDate: '2025-01-25',
        status: 'completed',
        effectiveness: 'effective',
        completedDate: '2025-01-22',
      },
    ],
    analysisNotes: 'Investigation complétée. Causes racines identifiées. Actions correctives en cours.',
    evidenceAttachments: ['photo_1.jpg', 'report_eng.pdf', 'interview_notes.docx'],
  },
  {
    id: 'inv2',
    incidentId: 'inc2',
    status: 'effectiveness_verified',
    investigationTeam: ['Dr. Kabasele', 'Nursing Lead'],
    investigator: 'Dr. Kabasele',
    startDate: '2025-01-12',
    completedDate: '2025-01-20',
    rcaMethod: 'five_why',
    rootCauses: ['Recapuchonnage d\'aiguille (pratique interdite)'],
    contributingFactors: ['Conteneur à aiguilles plein', 'Surcharge temporaire'],
    immediateCauses: ['Piqûre accidentelle lors du recapuchonnage'],
    rcaFindings: 'L\'agent n\'a pas respecté le protocole. Conteneur à proximité était plein.',
    capaList: [
      {
        id: 'ca3',
        action: 'Remplacement quotidien des conteneurs à aiguilles',
        responsible: 'Infirmière Chef',
        dueDate: '2025-01-15',
        status: 'completed',
        effectiveness: 'effective',
        completedDate: '2025-01-14',
      },
      {
        id: 'ca4',
        action: 'Rappel formation AES à tout le personnel',
        responsible: 'Direction Nursing',
        dueDate: '2025-02-01',
        status: 'completed',
        effectiveness: 'effective',
        completedDate: '2025-01-28',
      },
    ],
    analysisNotes: 'Investigation 100% complétée. Toutes les actions correctives vérifiées efficaces.',
    evidenceAttachments: ['protocol_checklist.pdf'],
    nextReviewDate: '2025-04-12',
  },
];

// â”€â”€â”€ Investigation Status Timeline â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function InvestigationTimeline({ status }: { status: IncidentInvestigation['status'] }) {
  const steps = [
    { id: 'reported', label: 'SignalÃ©', icon: 'alert-circle' },
    { id: 'under_investigation', label: 'En Investigation', icon: 'search' },
    { id: 'root_cause_identified', label: 'Cause IdentifiÃ©e', icon: 'checkmark-circle' },
    { id: 'corrective_action_planned', label: 'Actions PlanifiÃ©es', icon: 'clipboard' },
    { id: 'corrective_action_implemented', label: 'Actions Mises en Å’uvre', icon: 'construct' },
    { id: 'effectiveness_verified', label: 'EfficacitÃ© VÃ©rifiÃ©e', icon: 'checkmark' },
    { id: 'closed', label: 'FermÃ©', icon: 'checkmark-done' },
  ];

  const statusIndex = steps.findIndex(s => s.id === status);

  return (
    <View style={styles.timeline}>
      {steps.map((step, index) => {
        const isActive = index <= statusIndex;
        const isCurrent = index === statusIndex;

        return (
          <View key={step.id} style={styles.timelineItem}>
            <View style={[styles.timelineNode, isActive && styles.timelineNodeActive, isCurrent && styles.timelineNodeCurrent]}>
              <Ionicons name={step.icon as any} size={16} color={isActive ? (isCurrent ? colors.primary : '#fff') : colors.textSecondary} />
            </View>
            {index < steps.length - 1 && (
              <View style={[styles.timelineConnector, isActive && styles.timelineConnectorActive]} />
            )}
            <Text style={[styles.timelineLabel, isActive && styles.timelineLabelActive]}>{step.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

// â”€â”€â”€ CAPA Item â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CAPAItem({ capa, onPress }: { capa: CAPA; onPress: () => void }) {
  const statusConfig = {
    pending: { color: '#94A3B8', label: 'En attente' },
    in_progress: { color: '#F59E0B', label: 'En cours' },
    completed: { color: '#22C55E', label: 'ComplÃ©tÃ©e' },
    cancelled: { color: '#EF4444', label: 'AnnulÃ©e' },
  };
  const effectivenessConfig = {
    not_assessed: { color: '#94A3B8', label: 'Non Ã©valuÃ©e' },
    ineffective: { color: '#EF4444', label: 'Inefficace' },
    partially_effective: { color: '#F59E0B', label: 'Partiellement efficace' },
    effective: { color: '#22C55E', label: 'Efficace' },
    highly_effective: { color: '#16A34A', label: 'TrÃ¨s efficace' },
  };

  const statusCfg = statusConfig[capa.status];
  const effectivenessCfg = effectivenessConfig[capa.effectiveness];
  const isOverdue = new Date(capa.dueDate) < new Date() && capa.status !== 'completed';

  return (
    <TouchableOpacity style={styles.capaCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.capaHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.capaAction} numberOfLines={2}>{capa.action}</Text>
          <View style={styles.capaMetaRow}>
            <Ionicons name="person-outline" size={12} color={colors.textSecondary} />
            <Text style={styles.capaMeta}>{capa.responsible}</Text>
          </View>
        </View>
        <View style={[styles.capaStatusBadge, { backgroundColor: statusCfg.color + '20' }]}>
          <Text style={[styles.capaStatusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
        </View>
      </View>

      <View style={styles.capaDetails}>
        <View style={{ flex: 1 }}>
          <Text style={styles.capaDetailLabel}>Due</Text>
          <Text style={[styles.capaDetailValue, isOverdue && { color: '#EF4444' }]}>
            {capa.dueDate}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.capaDetailLabel}>Effectiveness</Text>
          <View style={[styles.effectivenessBadge, { backgroundColor: effectivenessCfg.color + '20' }]}>
            <Text style={[styles.effectivenessText, { color: effectivenessCfg.color }]}>
              {effectivenessCfg.label.split(' ')[0]}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// â”€â”€â”€ Investigation Detail Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function InvestigationDetailModal({
  investigation,
  visible,
  onClose,
}: {
  investigation: IncidentInvestigation | null;
  visible: boolean;
  onClose: () => void;
}) {
  const [expandedSection, setExpandedSection] = useState<'rca' | 'capa' | 'findings' | null>(null);

  if (!investigation) return null;

  const rcaMethod = RCA_METHODS[investigation.rcaMethod];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Investigation Details</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Status & Timeline */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Investigation Status</Text>
              <InvestigationTimeline status={investigation.status} />
              <View style={styles.statusMetrics}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Investigator</Text>
                  <Text style={styles.metricValue}>{investigation.investigator}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Started</Text>
                  <Text style={styles.metricValue}>{investigation.startDate}</Text>
                </View>
              </View>
            </View>

            {/* RCA Method */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>RCA Method: {rcaMethod.name}</Text>
              <View style={styles.rcaMethodCard}>
                <View style={styles.rcaMethodHeader}>
                  <Ionicons name={rcaMethod.icon as any} size={24} color={colors.primary} />
                  <Text style={styles.rcaMethodDesc}>{rcaMethod.description}</Text>
                </View>
                <View style={styles.rcaSteps}>
                  {rcaMethod.steps.map((step, idx) => (
                    <View key={idx} style={styles.rcaStep}>
                      <View style={styles.rcaStepNumber}>
                        <Text style={styles.rcaStepNumberText}>{idx + 1}</Text>
                      </View>
                      <Text style={styles.rcaStepText}>{step}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Root Causes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Root Causes Identified</Text>
              {investigation.rootCauses.map((cause, idx) => (
                <View key={idx} style={styles.causeCard}>
                  <Ionicons name="warning-outline" size={16} color="#DC2626" />
                  <Text style={styles.causeText}>{cause}</Text>
                </View>
              ))}
            </View>

            {/* Contributing Factors */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contributing Factors</Text>
              {investigation.contributingFactors.map((factor, idx) => (
                <View key={idx} style={styles.factorCard}>
                  <Ionicons name="alert-circle-outline" size={16} color="#F59E0B" />
                  <Text style={styles.factorText}>{factor}</Text>
                </View>
              ))}
            </View>

            {/* CAPA */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Corrective Actions</Text>
              {investigation.capaList.map((capa) => (
                <CAPAItem key={capa.id} capa={capa} onPress={() => {}} />
              ))}
              <View style={styles.capaStats}>
                <View style={styles.capaStat}>
                  <Text style={styles.capaStatValue}>{investigation.capaList.length}</Text>
                  <Text style={styles.capaStatLabel}>Total</Text>
                </View>
                <View style={styles.capaStat}>
                  <Text style={styles.capaStatValue}>{investigation.capaList.filter(c => c.status === 'completed').length}</Text>
                  <Text style={styles.capaStatLabel}>Done</Text>
                </View>
                <View style={styles.capaStat}>
                  <Text style={styles.capaStatValue}>{investigation.capaList.filter(c => c.effectiveness === 'effective' || c.effectiveness === 'highly_effective').length}</Text>
                  <Text style={styles.capaStatLabel}>Effective</Text>
                </View>
              </View>
            </View>

            {/* Findings */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Investigation Findings</Text>
              <View style={styles.findingsBox}>
                <Text style={styles.findingsText}>{investigation.rcaFindings}</Text>
              </View>
            </View>

            {/* Evidence */}
            {investigation.evidenceAttachments && investigation.evidenceAttachments.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Evidence & Attachments</Text>
                {investigation.evidenceAttachments.map((attachment, idx) => (
                  <TouchableOpacity key={idx} style={styles.attachmentCard}>
                    <Ionicons name="document-outline" size={20} color={colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.attachmentName}>{attachment}</Text>
                    </View>
                    <Ionicons name="download-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// â”€â”€â”€ Main Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function IncidentInvestigationScreen() {
  const [selectedInvestigation, setSelectedInvestigation] = useState<IncidentInvestigation | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState<IncidentInvestigation['status'] | 'all'>('all');

  const filteredInvestigations = useMemo(() => {
    if (filterStatus === 'all') return SAMPLE_INVESTIGATIONS;
    return SAMPLE_INVESTIGATIONS.filter(inv => inv.status === filterStatus);
  }, [filterStatus]);

  const openModal = (investigation: IncidentInvestigation) => {
    setSelectedInvestigation(investigation);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Incident Investigations</Text>
        <Text style={styles.headerSubtitle}>Root cause analysis & corrective actions</Text>
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
        {['all', 'reported', 'under_investigation', 'root_cause_identified', 'closed'].map(status => (
          <TouchableOpacity
            key={status}
            style={[styles.filterTab, filterStatus === status && styles.filterTabActive]}
            onPress={() => setFilterStatus(status as any)}
          >
            <Text style={[styles.filterTabText, filterStatus === status && { color: colors.primary }]}>
              {status === 'all' ? 'All' : status.replace(/_/g, ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Investigations List */}
      <FlatList
        data={filteredInvestigations}
        scrollEnabled={true}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.investigationCard}
            onPress={() => openModal(item)}
            activeOpacity={0.7}
          >
            <View style={styles.investigationHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.incidentRef}>Incident #{item.incidentId}</Text>
                <Text style={styles.investigatorName}>Investigator: {item.investigator}</Text>
              </View>
              <View style={styles.statusIndicator}>
                <Ionicons name={item.status === 'closed' ? 'checkmark-done' : 'hourglass-outline'} size={20} color={item.status === 'closed' ? '#22C55E' : colors.primary} />
              </View>
            </View>

            {/* Timeline */}
            <InvestigationTimeline status={item.status} />

            {/* Meta */}
            <View style={styles.investigationMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.metaText}>{item.startDate}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="warning-outline" size={14} color="#DC2626" />
                <Text style={styles.metaText}>{item.rootCauses.length} root causes</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="checkmark-circle-outline" size={14} color="#22C55E" />
                <Text style={styles.metaText}>{item.capaList.filter(c => c.status === 'completed').length}/{item.capaList.length} CAPA done</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={item => item.id}
        ListEmptyComponent={( <View style={styles.emptyState}>
            <Ionicons name="file-tray-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>No investigations found</Text>
          </View>
        )}
      />

      {/* Detail Modal */}
      <InvestigationDetailModal
        investigation={selectedInvestigation}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  filterBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceVariant,
  },
  filterTabActive: {
    backgroundColor: colors.primaryFaded,
  },
  filterTabText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  investigationCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  investigationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  incidentRef: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  investigatorName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusIndicator: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  timelineItem: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  timelineNode: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.outline,
  },
  timelineNodeActive: {
    backgroundColor: colors.primaryFaded,
    borderColor: colors.primary,
  },
  timelineNodeCurrent: {
    backgroundColor: colors.primary,
  },
  timelineConnector: {
    width: 20,
    height: 2,
    backgroundColor: colors.outline,
    marginHorizontal: 4,
  },
  timelineConnectorActive: {
    backgroundColor: colors.primary,
  },
  timelineLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    marginLeft: 2,
    flex: 1,
  },
  timelineLabelActive: {
    color: colors.text,
    fontWeight: '600',
  },
  statusMetrics: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    marginTop: 4,
  },
  investigationMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  metaText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
    ...shadows.lg,
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
    fontWeight: '600',
    color: colors.text,
  },
  modalBody: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  rcaMethodCard: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  rcaMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  rcaMethodDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  rcaSteps: {
    gap: spacing.sm,
  },
  rcaStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  rcaStepNumber: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rcaStepNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  rcaStepText: {
    fontSize: 12,
    color: colors.text,
    flex: 1,
    marginTop: 2,
  },
  causeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEE2E2',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  causeText: {
    fontSize: 12,
    color: '#DC2626',
    flex: 1,
  },
  factorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  factorText: {
    fontSize: 12,
    color: '#B45309',
    flex: 1,
  },
  capaCard: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  capaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  capaAction: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  capaMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },
  capaMeta: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  capaStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  capaStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  capaDetails: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  capaDetailLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  capaDetailValue: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
    marginTop: 2,
  },
  effectivenessBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: 2,
  },
  effectivenessText: {
    fontSize: 9,
    fontWeight: '600',
  },
  capaStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  capaStat: {
    flex: 1,
    backgroundColor: colors.primaryFaded,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  capaStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  capaStatLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  findingsBox: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  findingsText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 18,
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  attachmentName: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  closeButton: {
    margin: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
