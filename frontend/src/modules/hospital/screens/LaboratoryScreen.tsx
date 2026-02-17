import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import {
  LabOrder,
  LabTest,
  LabResult,
  LabOrderStatus,
  LabPriority,
  SampleType,
  LAB_TEST_PANELS,
} from '../../../models/Laboratory';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

type UILabOrder = LabOrder & {
  patientName: string;
  doctorName: string;
  totalTests: number;
  completedTests: number;
  orderDateTime?: string;
};

const today = new Date().toISOString().split('T')[0];

const sampleLabTests: LabTest[] = [
  { id: 'T1', orderId: '1', testCode: 'TROP', testName: 'Troponine I', category: 'biochemistry', status: 'in_progress', results: [], hasCriticalValue: false, hasAbnormalValue: false, createdAt: new Date().toISOString() },
  { id: 'T2', orderId: '1', testCode: 'CKMB', testName: 'CK-MB', category: 'biochemistry', status: 'pending', results: [], hasCriticalValue: false, hasAbnormalValue: false, createdAt: new Date().toISOString() },
  { id: 'T3', orderId: '1', testCode: 'BNP', testName: 'BNP', category: 'biochemistry', status: 'pending', results: [], hasCriticalValue: false, hasAbnormalValue: false, createdAt: new Date().toISOString() },
  { id: 'T4', orderId: '2', testCode: 'CBC', testName: 'Numération Formule Sanguine', category: 'hematology', status: 'in_progress', results: [], hasCriticalValue: false, hasAbnormalValue: false, createdAt: new Date().toISOString() },
  { id: 'T5', orderId: '2', testCode: 'CRP', testName: 'CRP', category: 'biochemistry', status: 'pending', results: [], hasCriticalValue: false, hasAbnormalValue: false, createdAt: new Date().toISOString() },
  { id: 'T6', orderId: '3', testCode: 'CULT', testName: 'Hémoculture', category: 'microbiology', status: 'completed', results: [], hasCriticalValue: false, hasAbnormalValue: false, createdAt: new Date().toISOString() },
  { id: 'T7', orderId: '3', testCode: 'CRP', testName: 'CRP', category: 'biochemistry', status: 'completed', results: [], hasCriticalValue: false, hasAbnormalValue: false, createdAt: new Date().toISOString() },
  { id: 'T8', orderId: '3', testCode: 'LAC', testName: 'Lactate', category: 'biochemistry', status: 'completed', results: [], hasCriticalValue: false, hasAbnormalValue: false, createdAt: new Date().toISOString() },
  { id: 'T9', orderId: '3', testCode: 'ABG', testName: 'Gaz du Sang', category: 'biochemistry', status: 'completed', results: [], hasCriticalValue: false, hasAbnormalValue: false, createdAt: new Date().toISOString() },
  { id: 'T10', orderId: '4', testCode: 'BETA', testName: 'β-HCG', category: 'endocrinology', status: 'pending', results: [], hasCriticalValue: false, hasAbnormalValue: false, createdAt: new Date().toISOString() },
];

const testsByOrder = (orderId: string) => sampleLabTests.filter(t => t.orderId === orderId);
const completedCount = (orderId: string) => testsByOrder(orderId).filter(t => t.status === 'completed' || t.status === 'verified').length;

const sampleLabOrders: UILabOrder[] = [
  {
    id: '1',
    orderNumber: 'LAB260001',
    patientId: 'P1001',
    patientName: 'Jean Mukendi',
    encounterId: 'E001',
    doctorId: 'D001',
    doctorName: 'Dr. Mbeki',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    orderDate: `${today}T08:30:00`,
    orderDateTime: `${today}T08:30:00`,
    status: 'sample_collected',
    priority: 'urgent',
    tests: testsByOrder('1'),
    totalTests: testsByOrder('1').length,
    completedTests: completedCount('1'),
    sampleType: 'blood_venous',
    clinicalNotes: 'Douleurs thoraciques, essoufflement',
    diagnosis: 'Suspicion infarctus du myocarde',
    fastingRequired: true,
    specialInstructions: 'Prélèvement à jeun depuis 12h',
    criticalValueAlerted: false,
    billable: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    orderNumber: 'LAB260002',
    patientId: 'P1002',
    patientName: 'Marie Kabamba',
    encounterId: 'E002',
    doctorId: 'D002',
    doctorName: 'Dr. Kalombo',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    orderDate: `${today}T09:15:00`,
    orderDateTime: `${today}T09:15:00`,
    status: 'processing',
    priority: 'routine',
    tests: testsByOrder('2'),
    totalTests: testsByOrder('2').length,
    completedTests: completedCount('2'),
    sampleType: 'blood_venous',
    clinicalNotes: 'Contrôle post-opératoire',
    diagnosis: 'Appendicectomie J+3',
    fastingRequired: false,
    criticalValueAlerted: false,
    billable: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    orderNumber: 'LAB260003',
    patientId: 'P1003',
    patientName: 'Pierre Kasongo',
    encounterId: 'E003',
    doctorId: 'D001',
    doctorName: 'Dr. Mbeki',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    orderDate: `${today}T07:00:00`,
    orderDateTime: `${today}T07:00:00`,
    status: 'completed',
    priority: 'stat',
    tests: testsByOrder('3'),
    totalTests: testsByOrder('3').length,
    completedTests: completedCount('3'),
    sampleType: 'blood_venous',
    clinicalNotes: 'Fièvre haute, confusion',
    diagnosis: 'Septicémie suspectée',
    fastingRequired: false,
    criticalValueAlerted: false,
    billable: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: '4',
    orderNumber: 'LAB260004',
    patientId: 'P1004',
    patientName: 'Sophie Lunga',
    encounterId: 'E004',
    doctorId: 'D003',
    doctorName: 'Dr. Nkumu',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    orderDate: `${today}T10:30:00`,
    orderDateTime: `${today}T10:30:00`,
    status: 'ordered',
    priority: 'routine',
    tests: testsByOrder('4'),
    totalTests: testsByOrder('4').length,
    completedTests: completedCount('4'),
    sampleType: 'urine_midstream',
    clinicalNotes: 'Grossesse 12 SA',
    diagnosis: 'Bilan prénatal',
    fastingRequired: true,
    criticalValueAlerted: false,
    billable: true,
    createdAt: new Date().toISOString(),
  },
];

// ─── Section Header Component ────────────────────────────────
function SectionHeader({
  title,
  subtitle,
  icon,
  accentColor = colors.primary,
}: {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
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
});

// ─── Status Badge Component ──────────────────────────────────
function StatusBadge({ status }: { status: LabOrderStatus }) {
  const config: Record<LabOrderStatus, { color: string; label: string }> = {
    ordered: { color: colors.info, label: 'Commandé' },
    acknowledged: { color: '#4F46E5', label: 'Accusé' },
    sample_pending: { color: colors.warning, label: 'Échantillon en attente' },
    sample_collected: { color: '#8B5CF6', label: 'Prélevé' },
    sample_received: { color: colors.warning, label: 'Reçu au labo' },
    processing: { color: colors.primary, label: 'En traitement' },
    partial_results: { color: '#22C55E', label: 'Résultats partiels' },
    completed: { color: colors.success, label: 'Terminé' },
    verified: { color: '#10B981', label: 'Vérifié' },
    reported: { color: '#0EA5E9', label: 'Communiqué' },
    cancelled: { color: colors.error, label: 'Annulé' },
  };
  const { color, label } = config[status];
  return (
    <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Priority Badge Component ────────────────────────────────
function PriorityBadge({ priority }: { priority: LabPriority }) {
  const config: Record<LabPriority, { color: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
    stat: { color: colors.error, label: 'STAT', icon: 'flash' },
    urgent: { color: colors.warning, label: 'Urgent', icon: 'alert' },
    routine: { color: colors.info, label: 'Routine', icon: 'time' },
    timed: { color: '#8B5CF6', label: 'Programmé', icon: 'calendar' },
    asap: { color: '#F97316', label: 'ASAP', icon: 'time' },
  };
  const { color, label, icon } = config[priority];
  return (
    <View style={[styles.priorityBadge, { backgroundColor: color + '15', borderColor: color }]}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[styles.priorityText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Sample Type Badge ───────────────────────────────────────
function SampleTypeBadge({ sampleType }: { sampleType: SampleType }) {
  const label = getSampleTypeLabel(sampleType);
  return (
    <View style={styles.sampleBadge}>
      <Ionicons name="water" size={12} color={colors.info} />
      <Text style={styles.sampleText}>{label}</Text>
    </View>
  );
}

function getSampleTypeLabel(sampleType: SampleType): string {
  const labels: Partial<Record<SampleType, string>> = {
    blood_venous: 'Sang veineux',
    blood_arterial: 'Sang artériel',
    blood_capillary: 'Sang capillaire',
    urine_random: 'Urine',
    urine_midstream: 'Urine milieu jet',
    urine_24hr: 'Urine 24h',
    stool: 'Selles',
    sputum: 'Expectoration',
    swab_throat: 'Prélèvement gorge',
    swab_nasal: 'Prélèvement nasal',
    swab_wound: 'Prélèvement plaie',
    csf: 'LCR',
    pleural_fluid: 'Liquide pleural',
    ascitic_fluid: 'Liquide ascitique',
    synovial_fluid: 'Liquide synovial',
    biopsy: 'Biopsie',
    other: 'Autre',
  };
  return labels[sampleType] || sampleType;
}

// ─── Lab Order Card ──────────────────────────────────────────
function LabOrderCard({ order }: { order: typeof sampleLabOrders[0] }) {
  const [expanded, setExpanded] = useState(false);
  const orderTests = sampleLabTests.filter(t => t.orderId === order.id);
  const progress = order.totalTests > 0 ? (order.completedTests / order.totalTests) * 100 : 0;
  const clinicalText = order.clinicalNotes || order.diagnosis || 'Aucune note clinique';
  const fasting = order.fastingRequired;
  const orderSampleType: SampleType = order.sampleType || 'blood_venous';

  const priorityColors: Record<LabPriority, string> = {
    stat: colors.error,
    urgent: colors.warning,
    routine: colors.info,
    timed: '#8B5CF6',
    asap: '#F97316',
  };

  return (
    <View 
      style={[
        styles.orderCard,
        { borderLeftColor: priorityColors[order.priority], borderLeftWidth: 4 }
      ]}
    >
      {/* Header */}
      <TouchableOpacity 
        style={styles.orderCardHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.orderCardLeft}>
          <View style={styles.orderNumberRow}>
            <Text style={styles.orderNumber}>{order.orderNumber}</Text>
            <PriorityBadge priority={order.priority} />
          </View>
          <View style={styles.patientRow}>
            <Ionicons name="person" size={14} color={colors.textSecondary} />
            <Text style={styles.patientName}>{order.patientName}</Text>
          </View>
          <View style={styles.doctorRow}>
            <Ionicons name="medical" size={14} color={colors.textSecondary} />
            <Text style={styles.doctorName}>{order.doctorName}</Text>
          </View>
        </View>
        
        <View style={styles.orderCardRight}>
          <StatusBadge status={order.status} />
          <View style={styles.testCountBadge}>
            <Text style={styles.testCountText}>
              {order.completedTests}/{order.totalTests} Tests
            </Text>
          </View>
          <Ionicons 
            name={expanded ? 'chevron-up' : 'chevron-down'} 
            size={18} 
            color={colors.textSecondary}
          />
        </View>
      </TouchableOpacity>

      {/* Progress Bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      {/* Clinical Info */}
      <View style={styles.clinicalInfo}>
        <Text style={styles.clinicalInfoText} numberOfLines={2}>
          {clinicalText}
        </Text>
        {fasting && (
          <View style={styles.fastingBadge}>
            <Ionicons name="moon" size={12} color="#EC4899" />
            <Text style={styles.fastingText}>À jeun</Text>
          </View>
        )}
      </View>

      {/* Expanded Tests List */}
      {expanded && (
        <View style={styles.testsList}>
          <Text style={styles.testsListTitle}>Tests demandés:</Text>
          {orderTests.map((test) => (
            <View key={test.id} style={styles.testItem}>
              <View style={styles.testItemLeft}>
                <View style={[
                  styles.testStatusIndicator,
                  { backgroundColor: getTestStatusColor(test.status) }
                ]} />
                <View>
                  <Text style={styles.testName}>{test.testName}</Text>
                  <Text style={styles.testCode}>{test.testCode}</Text>
                </View>
              </View>
              <View style={styles.testItemRight}>
                <SampleTypeBadge sampleType={orderSampleType} />
                <Text style={styles.testStatus}>
                  {getTestStatusLabel(test.status)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.orderActions}>
        {order.status === 'ordered' && (
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} activeOpacity={0.7}>
            <Ionicons name="water" size={16} color="#FFF" />
            <Text style={styles.actionBtnText}>Prélever</Text>
          </TouchableOpacity>
        )}
        {order.status === 'sample_collected' && (
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]} activeOpacity={0.7}>
            <Ionicons name="enter" size={16} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Réceptionner</Text>
          </TouchableOpacity>
        )}
        {order.status === 'completed' && (
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSuccess]} activeOpacity={0.7}>
            <Ionicons name="document-text" size={16} color="#FFF" />
            <Text style={styles.actionBtnText}>Voir Résultats</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline]} activeOpacity={0.7}>
          <Ionicons name="print" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function getTestStatusColor(status: string): string {
  const colors_map: Record<string, string> = {
    'pending': colors.outline,
    'collected': '#8B5CF6',
    'received': colors.warning,
    'in_progress': colors.primary,
    'completed': colors.success,
    'verified': '#10B981',
    'released': '#059669',
    'cancelled': colors.error,
  };
  return colors_map[status] || colors.outline;
}

function getTestStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'pending': 'En attente',
    'collected': 'Prélevé',
    'received': 'Reçu',
    'in_progress': 'En cours',
    'completed': 'Terminé',
    'verified': 'Vérifié',
    'released': 'Libéré',
    'cancelled': 'Annulé',
  };
  return labels[status] || status;
}

// ─── Quick Test Panels ───────────────────────────────────────
function QuickPanelCard({ 
  name, 
  tests, 
  color 
}: { 
  name: string; 
  tests: readonly string[]; 
  color: string;
}) {
  const testsArray = Array.isArray(tests) ? [...tests] : [];
  return (
    <View style={[styles.panelCard, { borderTopColor: color }]}>
      <Text style={styles.panelName}>{name || 'Unknown Panel'}</Text>
      <Text style={styles.panelTests}>{testsArray.length} tests</Text>
      <View style={styles.panelTestList}>
        {testsArray.slice(0, 4).map((test, idx) => (
          <Text key={idx} style={styles.panelTestItem} numberOfLines={1}>
            • {test}
          </Text>
        ))}
        {testsArray.length > 4 && (
          <Text style={styles.panelMore}>+{testsArray.length - 4} autres</Text>
        )}
      </View>
      <TouchableOpacity style={[styles.panelBtn, { backgroundColor: color + '15' }]} activeOpacity={0.7}>
        <Text style={[styles.panelBtnText, { color }]}>Commander</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────────
export function LaboratoryScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<LabOrderStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<LabPriority | 'all'>('all');

  // Filter orders
  const filteredOrders = sampleLabOrders.filter(order => {
    if (filterStatus !== 'all' && order.status !== filterStatus) return false;
    if (filterPriority !== 'all' && order.priority !== filterPriority) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        order.patientName.toLowerCase().includes(query) ||
        order.orderNumber.toLowerCase().includes(query) ||
        order.doctorName.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Stats
  const stats = {
    total: sampleLabOrders.length,
    pending: sampleLabOrders.filter(o => o.status === 'ordered' || o.status === 'sample_pending').length,
    inProgress: sampleLabOrders.filter(o => o.status === 'sample_collected' || o.status === 'sample_received' || o.status === 'processing' || o.status === 'partial_results').length,
    completed: sampleLabOrders.filter(o => o.status === 'completed' || o.status === 'verified' || o.status === 'reported').length,
    stat: sampleLabOrders.filter(o => o.priority === 'stat').length,
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🔬 Laboratoire</Text>
          <Text style={styles.headerSubtitle}>Gestion des analyses médicales</Text>
        </View>
        <TouchableOpacity style={styles.newOrderBtn} activeOpacity={0.7}>
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.newOrderBtnText}>Nouvelle Demande</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher patient, numéro, médecin..."
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

      {/* ══════ SECTION: Statistiques ══════ */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.infoLight }]}>
          <Ionicons name="flask" size={22} color={colors.info} />
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.warningLight }]}>
          <Ionicons name="hourglass" size={22} color={colors.warning} />
          <Text style={styles.statValue}>{stats.pending}</Text>
          <Text style={styles.statLabel}>En Attente</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.primaryLight || '#E0E7FF' }]}>
          <Ionicons name="sync" size={22} color={colors.primary} />
          <Text style={styles.statValue}>{stats.inProgress}</Text>
          <Text style={styles.statLabel}>En Cours</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.successLight }]}>
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
          <Text style={styles.statValue}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Terminés</Text>
        </View>
        {stats.stat > 0 && (
          <View style={[styles.statCard, { backgroundColor: colors.errorLight }]}>
            <Ionicons name="flash" size={22} color={colors.error} />
            <Text style={styles.statValue}>{stats.stat}</Text>
            <Text style={styles.statLabel}>STAT</Text>
          </View>
        )}
      </View>

      {/* ══════ SECTION: Panels Rapides ══════ */}
      <SectionHeader
        title="Panels Standards"
        subtitle="Commande rapide de bilans"
        icon="apps"
        accentColor="#8B5CF6"
      />
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.panelsScroll}
        contentContainerStyle={styles.panelsScrollContent}
      >
        {Object.entries(LAB_TEST_PANELS).slice(0, 5).map(([key, panel]) => (
          <QuickPanelCard
            key={key}
            name={panel.name}
            tests={panel.parameters}
            color={
              key === 'BMP' ? colors.info :
              key === 'CMP' ? colors.primary :
              key === 'CBC' ? colors.error :
              key === 'Lipid' ? colors.warning :
              '#8B5CF6'
            }
          />
        ))}
      </ScrollView>

      {/* ══════ SECTION: Filtres ══════ */}
      <SectionHeader
        title="Filtrer"
        icon="filter"
        accentColor={colors.secondary}
      />
      <View style={styles.filtersRow}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterScrollContent}
        >
          {[
            { key: 'all', label: 'Tous', color: colors.primary },
            { key: 'ordered', label: 'Commandés', color: colors.info },
            { key: 'sample_collected', label: 'Prélevés', color: '#8B5CF6' },
            { key: 'processing', label: 'En Cours', color: colors.primary },
            { key: 'completed', label: 'Terminés', color: colors.success },
          ].map((filter) => {
            const isSelected = filterStatus === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterChip,
                  isSelected && { backgroundColor: filter.color, borderColor: filter.color },
                ]}
                onPress={() => setFilterStatus(filter.key as any)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, isSelected && { color: '#FFF' }]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Priority Filter */}
      <View style={styles.priorityFilter}>
        <Text style={styles.priorityFilterLabel}>Priorité:</Text>
        {[
          { key: 'all', label: 'Toutes', color: colors.textSecondary },
          { key: 'stat', label: 'STAT', color: colors.error },
          { key: 'urgent', label: 'Urgent', color: colors.warning },
          { key: 'routine', label: 'Routine', color: colors.info },
          { key: 'asap', label: 'ASAP', color: '#F97316' },
          { key: 'timed', label: 'Programmé', color: '#8B5CF6' },
        ].map((filter) => {
          const isSelected = filterPriority === filter.key;
          return (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.priorityFilterBtn,
                isSelected && { backgroundColor: filter.color + '20', borderColor: filter.color },
              ]}
              onPress={() => setFilterPriority(filter.key as any)}
              activeOpacity={0.7}
            >
              <Text style={[styles.priorityFilterText, isSelected && { color: filter.color }]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ══════ SECTION: Demandes ══════ */}
      <SectionHeader
        title="Demandes d'Analyses"
        subtitle={`${filteredOrders.length} demande(s)`}
        icon="document-text"
        accentColor={colors.info}
      />

      <View style={styles.ordersList}>
        {filteredOrders.map((order) => (
          <LabOrderCard key={order.id} order={order} />
        ))}

        {filteredOrders.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="flask-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>Aucune demande trouvée</Text>
            <Text style={styles.emptyStateSubtext}>
              Modifiez les filtres ou lancez une nouvelle demande
            </Text>
          </View>
        )}
      </View>

      {/* ══════ SECTION: Légende ══════ */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Types d'échantillons:</Text>
        <View style={styles.legendRow}>
          {[
            { type: 'whole_blood', label: 'Sang total' },
            { type: 'serum', label: 'Sérum' },
            { type: 'plasma', label: 'Plasma' },
            { type: 'urine', label: 'Urine' },
            { type: 'csf', label: 'LCR' },
          ].map((item) => (
            <View key={item.type} style={styles.legendItem}>
              <Ionicons name="water" size={12} color={colors.info} />
              <Text style={styles.legendItemText}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
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
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
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
  newOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
  },
  newOrderBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Search
  searchContainer: {
    marginBottom: 20,
  },
  searchInputWrapper: {
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

  // Stats
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: isDesktop ? 1 : undefined,
    width: isDesktop ? undefined : (width - 48) / 2,
    padding: 14,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Panels
  panelsScroll: {
    marginBottom: 24,
  },
  panelsScrollContent: {
    gap: 12,
    paddingRight: 16,
  },
  panelCard: {
    width: 160,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 14,
    borderTopWidth: 4,
    ...shadows.sm,
  },
  panelName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  panelTests: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  panelTestList: {
    marginBottom: 10,
  },
  panelTestItem: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  panelMore: {
    fontSize: 10,
    color: colors.primary,
    fontStyle: 'italic',
  },
  panelBtn: {
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  panelBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Filter
  filtersRow: {
    marginBottom: 12,
  },
  filterScroll: {},
  filterScrollContent: {
    gap: 8,
    paddingRight: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  priorityFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  priorityFilterLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginRight: 4,
  },
  priorityFilterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  priorityFilterText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },

  // Orders List
  ordersList: {
    gap: 14,
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  orderCardLeft: {
    flex: 1,
    gap: 6,
  },
  orderNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  patientName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  doctorName: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  orderCardRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  testCountBadge: {
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  testCountText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.surfaceVariant,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
  },
  clinicalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surfaceVariant,
    gap: 10,
  },
  clinicalInfoText: {
    flex: 1,
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  fastingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FCE7F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  fastingText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#EC4899',
  },
  testsList: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  testsListTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 10,
  },
  testItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  testItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  testStatusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  testName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  testCode: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  testItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  testStatus: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  orderActions: {
    flexDirection: 'row',
    gap: 8,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
  },
  actionBtnPrimary: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
  },
  actionBtnSecondary: {
    flex: 1,
    backgroundColor: colors.primaryLight || '#E0E7FF',
    justifyContent: 'center',
  },
  actionBtnSuccess: {
    flex: 1,
    backgroundColor: colors.success,
    justifyContent: 'center',
  },
  actionBtnOutline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },

  // Badges
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  sampleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.infoLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  sampleText: {
    fontSize: 10,
    color: colors.info,
    fontWeight: '500',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },

  // Legend
  legend: {
    marginTop: 24,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 16,
  },
  legendTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendItemText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});

export default LaboratoryScreen;
