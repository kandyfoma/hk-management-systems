import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, Alert, FlatList, RefreshControl, TextInput, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';

// ─── Types ──────────────────────────────────────────────────
interface Incident {
  id: string;
  number: string;
  date: string;
  time: string;
  worker: string;
  workerId: string;
  type: 'injury' | 'near_miss' | 'medical_treatment' | 'property_damage' | 'environmental';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'reported' | 'under_investigation' | 'investigation_complete' | 'closed';
  description: string;
  location: string;
  department: string;
  lti: boolean;
  ltiDays?: number;
  rootCause?: string;
  capaDeadline?: string;
  modifiedDate?: string;
}

// ─── Config Maps ─────────────────────────────────────────────
const TYPE_CONFIG: Record<Incident['type'], { icon: string; color: string; label: string }> = {
  injury:            { icon: 'bandage',       color: '#EF4444', label: 'Injury' },
  near_miss:         { icon: 'alert-circle',  color: '#F59E0B', label: 'Near Miss' },
  medical_treatment: { icon: 'medical',       color: '#3B82F6', label: 'Medical' },
  property_damage:   { icon: 'hammer',        color: '#8B5CF6', label: 'Property' },
  environmental:     { icon: 'leaf',          color: '#10B981', label: 'Environmental' },
};

const STATUS_CONFIG: Record<Incident['status'], { icon: string; color: string; label: string }> = {
  reported:               { icon: 'flag',                  color: '#3B82F6', label: 'Reported' },
  under_investigation:    { icon: 'search',                 color: '#F59E0B', label: 'Investigating' },
  investigation_complete: { icon: 'checkmark-circle',       color: '#8B5CF6', label: 'Complete' },
  closed:                 { icon: 'checkmark-done-circle',  color: '#22C55E', label: 'Closed' },
};

const SEVERITY_CONFIG: Record<Incident['severity'], { color: string; label: string }> = {
  low:      { color: '#22C55E', label: 'Low' },
  medium:   { color: '#F59E0B', label: 'Medium' },
  high:     { color: '#EF4444', label: 'High' },
  critical: { color: '#DC2626', label: 'Critical' },
};

// ─── Sample Data ─────────────────────────────────────────────
const SAMPLE_INCIDENTS: Incident[] = [
  {
    id: 'i1', number: 'INC-2025-0342', date: '2025-02-20', time: '09:15',
    worker: 'Pierre Kabamba', workerId: 'w003', type: 'injury',
    severity: 'high', status: 'under_investigation',
    description: 'Cut to left hand from sharp edge during equipment maintenance',
    location: 'Processing Building - Section C', department: 'Maintenance', lti: false,
  },
  {
    id: 'i2', number: 'INC-2025-0341', date: '2025-02-19', time: '14:30',
    worker: 'Robert Mbala', workerId: 'w004', type: 'near_miss',
    severity: 'medium', status: 'investigation_complete',
    description: 'Near miss: Equipment fell from shelf but did not hit worker',
    location: 'Storage Area - Building B', department: 'Warehouse',
    lti: false, rootCause: 'Improper securing of equipment',
  },
  {
    id: 'i3', number: 'INC-2025-0340', date: '2025-02-18', time: '11:00',
    worker: 'Marie Lusaka', workerId: 'w002', type: 'medical_treatment',
    severity: 'medium', status: 'closed',
    description: 'Eye irritation from dust exposure - first aid treatment provided',
    location: 'Main Shaft Extraction', department: 'Operations',
    lti: false, modifiedDate: '2025-02-20',
  },
  {
    id: 'i4', number: 'INC-2025-0339', date: '2025-02-17', time: '08:45',
    worker: 'Jean-Charles Mulinga', workerId: 'w001', type: 'injury',
    severity: 'critical', status: 'under_investigation',
    description: 'Slip and fall on wet surface, suspected broken ankle',
    location: 'Processing Area - Building A', department: 'Processing',
    lti: true, ltiDays: 5, capaDeadline: '2025-03-03',
  },
];

// ─── Sub-components ──────────────────────────────────────────
function StatusBadge({ status }: { status: Incident['status'] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.color + '18' }]}>
      <Ionicons name={cfg.icon as any} size={11} color={cfg.color} />
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function SeverityBadge({ severity }: { severity: Incident['severity'] }) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <View style={[styles.severityBadge, { backgroundColor: cfg.color }]}>
      <Text style={styles.severityText}>{cfg.label}</Text>
    </View>
  );
}

function MetricTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.metricTile, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );
}

// ─── Incident Card ───────────────────────────────────────────
function IncidentCard({ incident, onPress }: { incident: Incident; onPress: () => void }) {
  const typeCfg   = TYPE_CONFIG[incident.type];
  const statusCfg = STATUS_CONFIG[incident.status];

  return (
    <TouchableOpacity
      style={[styles.incidentCard, styles.cardShadow, { borderLeftColor: statusCfg.color }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Top row */}
      <View style={styles.cardTop}>
        <View style={[styles.typeIconBox, { backgroundColor: typeCfg.color + '18' }]}>
          <Ionicons name={typeCfg.icon as any} size={20} color={typeCfg.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.incidentNumber}>{incident.number}</Text>
          <Text style={styles.incidentDate}>{incident.date} · {incident.time}</Text>
        </View>
        <View style={styles.badgeStack}>
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={incident.status} />
        </View>
      </View>

      {/* Meta row */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="person-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.metaText} numberOfLines={1}>{incident.worker}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.metaText} numberOfLines={1}>{incident.location}</Text>
        </View>
      </View>

      {/* Description */}
      <Text style={styles.description} numberOfLines={2}>{incident.description}</Text>

      {/* Alert pills */}
      {incident.lti && (
        <View style={styles.alertPill}>
          <Ionicons name="alert-circle" size={13} color="#DC2626" />
          <Text style={styles.alertPillText}>
            LTI — {incident.ltiDays} day{incident.ltiDays !== 1 ? 's' : ''} lost
          </Text>
        </View>
      )}
      {incident.capaDeadline && (
        <View style={[styles.alertPill, styles.alertPillAmber]}>
          <Ionicons name="calendar-outline" size={13} color="#D97706" />
          <Text style={[styles.alertPillText, { color: '#92400E' }]}>CAPA due {incident.capaDeadline}</Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View style={[styles.typeLabelPill, { backgroundColor: typeCfg.color + '12' }]}>
          <Ionicons name={typeCfg.icon as any} size={11} color={typeCfg.color} />
          <Text style={[styles.typeLabelText, { color: typeCfg.color }]}>{typeCfg.label}</Text>
        </View>
        <TouchableOpacity style={styles.footerBtn} onPress={onPress}>
          <Ionicons name="eye-outline" size={14} color={colors.primary} />
          <Text style={[styles.footerBtnText, { color: colors.primary }]}>View Details</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Detail Modal ────────────────────────────────────────────
function IncidentDetailModal({
  visible, incident, onClose, onUpdate, isDesktop,
}: {
  visible: boolean;
  incident: Incident | null;
  onClose: () => void;
  onUpdate: (data: Incident) => void;
  isDesktop: boolean;
}) {
  const [formData, setFormData] = useState<Incident | null>(incident);
  React.useEffect(() => { setFormData(incident); }, [incident, visible]);
  if (!formData) return null;

  const typeCfg   = TYPE_CONFIG[formData.type];
  const statusCfg = STATUS_CONFIG[formData.status];
  const sevCfg    = SEVERITY_CONFIG[formData.severity];

  return (
    <Modal visible={visible} transparent animationType={isDesktop ? 'fade' : 'slide'}>
      <View style={[styles.modalOverlay, isDesktop && styles.modalOverlayDesktop]}>
        <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>

          {/* Header */}
          <View style={[styles.modalHeader, { borderTopColor: statusCfg.color, borderTopWidth: 4 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{formData.number}</Text>
              <Text style={styles.modalSubtitle}>
                {formData.date} · {formData.time} · {formData.department}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>

            {/* Metrics grid */}
            <View style={styles.metricsGrid}>
              <MetricTile label="Type"     value={typeCfg.label}   color={typeCfg.color} />
              <MetricTile label="Severity" value={sevCfg.label}    color={sevCfg.color} />
              <MetricTile label="Status"   value={statusCfg.label} color={statusCfg.color} />
              <MetricTile label="Dept."    value={formData.department} color={colors.primary} />
            </View>

            {/* Description */}
            <View style={styles.modalSection}>
              <View style={styles.modalSectionHeader}>
                <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                <Text style={styles.modalSectionTitle}>Description</Text>
              </View>
              <Text style={styles.modalBodyText}>{formData.description}</Text>
            </View>

            {/* Location */}
            <View style={styles.modalSection}>
              <View style={styles.modalSectionHeader}>
                <Ionicons name="location-outline" size={16} color={colors.primary} />
                <Text style={styles.modalSectionTitle}>Location</Text>
              </View>
              <Text style={styles.modalBodyText}>{formData.location}</Text>
            </View>

            {/* Worker */}
            <View style={styles.modalSection}>
              <View style={styles.modalSectionHeader}>
                <Ionicons name="person-outline" size={16} color={colors.primary} />
                <Text style={styles.modalSectionTitle}>Affected Worker</Text>
              </View>
              <View style={styles.infoTable}>
                <View style={styles.infoTableRow}>
                  <Text style={styles.infoTableLabel}>Name</Text>
                  <Text style={styles.infoTableValue}>{formData.worker}</Text>
                </View>
                <View style={[styles.infoTableRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.infoTableLabel}>Worker ID</Text>
                  <Text style={styles.infoTableValue}>{formData.workerId}</Text>
                </View>
              </View>
            </View>

            {/* LTI */}
            {formData.lti && (
              <View style={styles.ltiBanner}>
                <View style={styles.ltiBannerTitle}>
                  <Ionicons name="alert-circle" size={18} color="#DC2626" />
                  <Text style={styles.ltiBannerHeading}>Lost Time Injury (LTI)</Text>
                </View>
                <Text style={styles.ltiBannerText}>
                  Reportable LTI — {formData.ltiDays} day{formData.ltiDays !== 1 ? 's' : ''} recorded
                </Text>
              </View>
            )}

            {/* Investigation */}
            {formData.status !== 'reported' && (
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeader}>
                  <Ionicons name="search-outline" size={16} color={colors.primary} />
                  <Text style={styles.modalSectionTitle}>Investigation</Text>
                </View>
                {formData.rootCause && (
                  <View style={styles.rootCauseBox}>
                    <Text style={styles.infoTableLabel}>Root Cause</Text>
                    <Text style={styles.modalBodyText}>{formData.rootCause}</Text>
                  </View>
                )}
                {formData.capaDeadline && (
                  <View style={styles.capaBanner}>
                    <Ionicons name="calendar-outline" size={15} color="#D97706" />
                    <Text style={styles.capaBannerText}>CAPA Deadline: {formData.capaDeadline}</Text>
                  </View>
                )}
                <Text style={[styles.infoTableLabel, { marginTop: spacing.sm }]}>Update Status</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
                  {(Object.entries(STATUS_CONFIG) as [Incident['status'], typeof STATUS_CONFIG[Incident['status']]][])
                    .filter(([k]) => k !== 'reported')
                    .map(([st, cfg]) => (
                      <TouchableOpacity
                        key={st}
                        style={[
                          styles.statusChip,
                          formData.status === st && { backgroundColor: cfg.color + '20', borderColor: cfg.color },
                        ]}
                        onPress={() => setFormData({ ...formData, status: st })}
                      >
                        <Ionicons name={cfg.icon as any} size={13} color={formData.status === st ? cfg.color : colors.textSecondary} />
                        <Text style={[styles.statusChipText, formData.status === st && { color: cfg.color, fontWeight: '600' }]}>
                          {cfg.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </View>
            )}

            {/* Timestamps */}
            <View style={[styles.infoTable, { marginBottom: spacing.md }]}>
              <View style={styles.infoTableRow}>
                <Text style={styles.infoTableLabel}>Reported</Text>
                <Text style={styles.infoTableValue}>{formData.date} {formData.time}</Text>
              </View>
              {formData.modifiedDate && (
                <View style={[styles.infoTableRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.infoTableLabel}>Last Updated</Text>
                  <Text style={styles.infoTableValue}>{formData.modifiedDate}</Text>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => { onUpdate(formData); onClose(); }}
            >
              <Ionicons name="checkmark" size={16} color="#FFF" />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Stat Card ───────────────────────────────────────────────
function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <View style={[styles.statCard, styles.cardShadow, { borderTopColor: color, borderTopWidth: 3 }]}>
      <View style={[styles.statCardIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={[styles.statCardValue, { color }]}>{value}</Text>
      <Text style={styles.statCardLabel}>{label}</Text>
    </View>
  );
}

// ─── Filter Chip ─────────────────────────────────────────────
function FilterChip({ label, active, onPress, dotColor }: {
  label: string; active: boolean; onPress: () => void; dotColor?: string;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.filterChip,
        active && { backgroundColor: (dotColor || colors.primary) + '18', borderColor: dotColor || colors.primary },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {dotColor && <View style={[styles.filterDot, { backgroundColor: dotColor, opacity: active ? 1 : 0.35 }]} />}
      <Text style={[styles.filterChipText, active && { color: dotColor || colors.primary, fontWeight: '600' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ─────────────────────────────────────────────
export function IncidentDashboardScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [modalVisible, setModalVisible]         = useState(false);
  const [filterType,   setFilterType]           = useState<'all' | Incident['type']>('all');
  const [filterStatus, setFilterStatus]         = useState<'all' | Incident['status']>('all');
  const [searchText,   setSearchText]           = useState('');
  const [refreshing,   setRefreshing]           = useState(false);

  const stats = useMemo(() => ({
    total:    SAMPLE_INCIDENTS.length,
    open:     SAMPLE_INCIDENTS.filter(i => i.status !== 'closed').length,
    lti:      SAMPLE_INCIDENTS.filter(i => i.lti).length,
    critical: SAMPLE_INCIDENTS.filter(i => i.severity === 'critical').length,
  }), []);

  const filteredIncidents = useMemo(() => {
    let list = [...SAMPLE_INCIDENTS];
    if (filterType   !== 'all') list = list.filter(i => i.type   === filterType);
    if (filterStatus !== 'all') list = list.filter(i => i.status === filterStatus);
    if (searchText) {
      const q = searchText.toLowerCase();
      list = list.filter(i =>
        i.number.toLowerCase().includes(q) ||
        i.worker.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q),
      );
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filterType, filterStatus, searchText]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  const openDetail = (incident: Incident) => {
    setSelectedIncident(incident);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Incident Dashboard</Text>
          <Text style={styles.headerSubtitle}>Track and manage workplace incidents</Text>
        </View>
        <TouchableOpacity style={styles.newBtn}>
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={styles.newBtnText}>Report</Text>
        </TouchableOpacity>
      </View>

      {/* Stats grid — 2×2 mobile, 1×4 desktop */}
      <View style={[styles.statsGrid, isDesktop && styles.statsGridDesktop]}>
        <StatCard icon="list-outline"         label="Total"    value={stats.total}    color={colors.primary} />
        <StatCard icon="alert-circle-outline" label="Open"     value={stats.open}     color="#F59E0B" />
        <StatCard icon="alert-outline"        label="LTI"      value={stats.lti}      color="#DC2626" />
        <StatCard icon="warning-outline"      label="Critical" value={stats.critical} color="#EF4444" />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color={colors.textSecondary} style={{ marginRight: spacing.sm }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by number, worker, description..."
          placeholderTextColor={colors.textSecondary}
          value={searchText}
          onChangeText={setSearchText}
        />
        {!!searchText && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filtersWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <FilterChip label="All types" active={filterType === 'all'} onPress={() => setFilterType('all')} />
          {(Object.entries(TYPE_CONFIG) as [Incident['type'], typeof TYPE_CONFIG[Incident['type']]][]).map(([k, v]) => (
            <FilterChip key={k} label={v.label} active={filterType === k} onPress={() => setFilterType(k)} dotColor={v.color} />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterRow, styles.filterRowBordered]}>
          <FilterChip label="All status" active={filterStatus === 'all'} onPress={() => setFilterStatus('all')} />
          {(Object.entries(STATUS_CONFIG) as [Incident['status'], typeof STATUS_CONFIG[Incident['status']]][]).map(([k, v]) => (
            <FilterChip key={k} label={v.label} active={filterStatus === k} onPress={() => setFilterStatus(k)} dotColor={v.color} />
          ))}
        </ScrollView>
      </View>

      {/* Results */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>
          {filteredIncidents.length} incident{filteredIncidents.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={filteredIncidents as any[]}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }: { item: any }) => (
          <IncidentCard incident={item as Incident} onPress={() => openDetail(item as Incident)} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="checkmark-circle-outline" size={40} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No incidents found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your filters or search</Text>
          </View>
        }
      />

      <IncidentDetailModal
        visible={modalVisible}
        incident={selectedIncident}
        onClose={() => setModalVisible(false)}
        onUpdate={(data) => Alert.alert('Saved', `${data.number} updated`)}
        isDesktop={isDesktop}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle:    { fontSize: 22, fontWeight: '700', color: colors.text },
  headerSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  newBtnText: { fontSize: 13, fontWeight: '600', color: '#FFF' },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  statsGridDesktop: { flexWrap: 'nowrap' },
  statCard: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  statCardIcon: {
    width: 40, height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statCardValue: { fontSize: 26, fontWeight: '800' },
  statCardLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2, fontWeight: '500' },
  cardShadow: { ...shadows.sm },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    height: 40,
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadows.sm,
  },
  searchInput: { flex: 1, fontSize: 13, color: colors.text },

  filtersWrapper: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
  },
  filterRow:        { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  filterRowBordered:{ borderTopWidth: 1, borderTopColor: colors.outline },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.surfaceVariant,
    gap: 5,
  },
  filterDot:      { width: 7, height: 7, borderRadius: 4 },
  filterChipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },

  resultsBar: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  resultsText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },

  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },

  incidentCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  typeIconBox: {
    width: 40, height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  incidentNumber: { fontSize: 14, fontWeight: '700', color: colors.text },
  incidentDate:   { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  badgeStack:     { gap: 4, alignItems: 'flex-end' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 3,
  },
  badgeText:     { fontSize: 10, fontWeight: '600' },
  severityBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 },
  severityText:  { fontSize: 10, fontWeight: '700', color: '#FFF' },

  metaRow:  { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  metaText: { fontSize: 12, color: colors.textSecondary, flex: 1 },

  description: { fontSize: 12, color: colors.text, lineHeight: 17, marginBottom: spacing.sm },

  alertPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    gap: 5,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  alertPillAmber: { backgroundColor: '#FEF3C7' },
  alertPillText:  { fontSize: 11, fontWeight: '600', color: '#991B1B' },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  typeLabelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  typeLabelText: { fontSize: 11, fontWeight: '600' },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  footerBtnText: { fontSize: 12, fontWeight: '600' },

  emptyState:    { alignItems: 'center', paddingVertical: 60 },
  emptyIconBox: {
    width: 72, height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle:    { fontSize: 16, fontWeight: '600', color: colors.text },
  emptySubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,27,66,0.55)',
    justifyContent: 'flex-end',
  },
  modalOverlayDesktop: { justifyContent: 'center', alignItems: 'center' },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '92%',
    ...shadows.lg,
  },
  modalContentDesktop: {
    width: '52%',
    maxWidth: 640,
    borderRadius: borderRadius.xl,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    gap: spacing.sm,
  },
  modalTitle:    { fontSize: 17, fontWeight: '700', color: colors.text },
  modalSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, maxHeight: 520 },

  metricsGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  metricTile: {
    flex: 1,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  metricLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: '500', marginBottom: 4 },
  metricValue: { fontSize: 12, fontWeight: '700', textAlign: 'center' },

  modalSection: { marginBottom: spacing.lg },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  modalSectionTitle: { fontSize: 13, fontWeight: '600', color: colors.text },
  modalBodyText:     { fontSize: 13, color: colors.text, lineHeight: 19 },

  infoTable: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  infoTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  infoTableLabel: { fontSize: 12, color: colors.textSecondary },
  infoTableValue: { fontSize: 12, fontWeight: '600', color: colors.text },

  ltiBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  ltiBannerTitle:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  ltiBannerHeading: { fontSize: 13, fontWeight: '700', color: '#DC2626' },
  ltiBannerText:    { fontSize: 12, color: '#7F1D1D' },

  capaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FEF3C7',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#D97706',
  },
  capaBannerText: { fontSize: 12, fontWeight: '600', color: '#92400E' },

  rootCauseBox: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 4,
  },

  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceVariant,
  },
  statusChipText: { fontSize: 12, color: colors.textSecondary },

  modalFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: colors.text },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
});
