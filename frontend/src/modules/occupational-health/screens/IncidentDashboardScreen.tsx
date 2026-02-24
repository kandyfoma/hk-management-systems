import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions,
  Modal, Alert, FlatList, RefreshControl, TextInput, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import DateInput from '../../../components/DateInput';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

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
  lti: boolean; // Lost Time Injury
  ltiDays?: number;
  investigationId?: string;
  rootCause?: string;
  capaDeadline?: string;
  modifiedDate?: string;
}

// Sample Data
const SAMPLE_INCIDENTS: Incident[] = [
  {
    id: 'i1', number: 'INC-2025-0342', date: '2025-02-20', time: '09:15',
    worker: 'Pierre Kabamba', workerId: 'w003', type: 'injury',
    severity: 'high', status: 'under_investigation',
    description: 'Cut to left hand from sharp edge during equipment maintenance',
    location: 'Processing Building - Section C', department: 'Maintenance',
    lti: false,
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

// ─── Status Badge ───────────────────────────────────────────
function StatusBadge({ status }: { status: Incident['status'] }) {
  const config = {
    reported: { color: '#3B82F6', icon: 'flag-outline', label: 'Reported' },
    under_investigation: { color: '#F59E0B', icon: 'search-outline', label: 'Investigating' },
    investigation_complete: { color: '#8B5CF6', icon: 'checkmark-outline', label: 'Complete' },
    closed: { color: '#22C55E', icon: 'checkmark-circle', label: 'Closed' },
  }[status];

  return (
    <View style={[styles.badge, { backgroundColor: config.color + '20' }]}>
      <Ionicons name={config.icon as any} size={12} color={config.color} />
      <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

function SeverityBadge({ severity }: { severity: Incident['severity'] }) {
  const config = {
    low: { color: '#22C55E', label: 'Low' },
    medium: { color: '#F59E0B', label: 'Medium' },
    high: { color: '#EF4444', label: 'High' },
    critical: { color: '#DC2626', label: 'Critical' },
  }[severity];

  return (
    <View style={[styles.severityBadge, { backgroundColor: config.color }]}>
      <Text style={styles.severityText}>{config.label}</Text>
    </View>
  );
}

// ─── Incident Type Icon ─────────────────────────────────────
function IncidentTypeIcon({ type }: { type: Incident['type'] }) {
  const config = {
    injury: { icon: 'bandage', color: '#EF4444' },
    near_miss: { icon: 'alert-circle', color: '#F59E0B' },
    medical_treatment: { icon: 'medical', color: '#3B82F6' },
    property_damage: { icon: 'hammer', color: '#8B5CF6' },
    environmental: { icon: 'leaf', color: '#10B981' },
  }[type];

  return (
    <View style={[styles.typeIcon, { backgroundColor: config.color + '20' }]}>
      <Ionicons name={config.icon as any} size={20} color={config.color} />
    </View>
  );
}

// ─── Incident Card ──────────────────────────────────────────
function IncidentCard({
  incident,
  onPress,
}: {
  incident: Incident;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.incidentCard, styles.cardShadow]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <IncidentTypeIcon type={incident.type} />
          <View style={{ flex: 1 }}>
            <Text style={styles.incidentNumber}>{incident.number}</Text>
            <Text style={styles.incidentDate}>{incident.date} • {incident.time}</Text>
          </View>
        </View>
        <View style={styles.cardMeta}>
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={incident.status} />
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.contentRow}>
          <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.contentText}>{incident.worker}</Text>
        </View>
        <View style={styles.contentRow}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.contentText}>{incident.location}</Text>
        </View>
        <Text style={styles.description} numberOfLines={2}>{incident.description}</Text>
      </View>

      {incident.lti && (
        <View style={styles.ltiAlert}>
          <Ionicons name="alert-circle" size={14} color="#DC2626" />
          <Text style={styles.ltiText}>
            LTI • {incident.ltiDays} day{incident.ltiDays !== 1 ? 's' : ''} lost
          </Text>
        </View>
      )}

      {incident.capaDeadline && (
        <View style={styles.deadlineRow}>
          <Ionicons name="calendar-outline" size={14} color="#F59E0B" />
          <Text style={styles.deadlineText}>CAPA DUE: {incident.capaDeadline}</Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.footerBtn}>
          <Ionicons name="document-outline" size={14} color={colors.primary} />
          <Text style={[styles.footerBtnText, { color: colors.primary }]}>Details</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerBtn}>
          <Ionicons name="checkmark-done" size={14} color={colors.primary} />
          <Text style={[styles.footerBtnText, { color: colors.primary }]}>Update</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Incident Detail Modal ──────────────────────────────────
function IncidentDetailModal({
  visible,
  incident,
  onClose,
  onUpdate,
}: {
  visible: boolean;
  incident: Incident | null;
  onClose: () => void;
  onUpdate: (data: Incident) => void;
}) {
  const [formData, setFormData] = useState<Incident | null>(incident);
  const [isUpdating, setIsUpdating] = useState(false);

  React.useEffect(() => {
    setFormData(incident);
  }, [incident, visible]);

  if (!formData) return null;

  const handleUpdate = () => {
    onUpdate(formData);
    setIsUpdating(false);
    onClose();
  };

  const typeLabels = {
    injury: 'Injury',
    near_miss: 'Near Miss',
    medical_treatment: 'Medical Treatment',
    property_damage: 'Property Damage',
    environmental: 'Environmental',
  };

  const severityLabels = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
  };

  const statusLabels = {
    reported: 'Reported',
    under_investigation: 'Under Investigation',
    investigation_complete: 'Investigation Complete',
    closed: 'Closed',
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{formData.number}</Text>
              <Text style={styles.modalSubtitle}>{formData.date}</Text>
            </View>
            <TouchableOpacity onPress={onClose} disabled={isUpdating}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Status Cards */}
            <View style={styles.statusGrid}>
              <View style={[styles.statusCard, { borderLeftColor: '#EF4444' }]}>
                <Text style={styles.statusLabel}>Severity</Text>
                <Text style={[styles.statusValue, { color: '#EF4444' }]}>
                  {severityLabels[formData.severity]}
                </Text>
              </View>
              <View style={[styles.statusCard, { borderLeftColor: colors.primary }]}>
                <Text style={styles.statusLabel}>Status</Text>
                <Text style={[styles.statusValue, { color: colors.primary }]}>
                  {statusLabels[formData.status]}
                </Text>
              </View>
            </View>

            {/* Incident Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Incident Details</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Incident Type</Text>
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>{typeLabels[formData.type]}</Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <Text style={styles.infoText}>{formData.description}</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Location</Text>
                <Text style={styles.infoText}>{formData.location}</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Department</Text>
                <Text style={styles.infoText}>{formData.department}</Text>
              </View>
            </View>

            {/* Worker Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Affected Worker</Text>
              <View style={styles.infoBox}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Name</Text>
                  <Text style={styles.infoValue}>{formData.worker}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>ID</Text>
                  <Text style={styles.infoValue}>{formData.workerId}</Text>
                </View>
              </View>
            </View>

            {/* LTI Information */}
            {formData.lti && (
              <View style={[styles.section, { backgroundColor: '#FEE2E2', borderRadius: borderRadius.lg, padding: spacing.md }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                  <Ionicons name="alert" size={20} color="#DC2626" />
                  <Text style={[styles.sectionTitle, { marginLeft: spacing.md, marginBottom: 0 }]}>
                    Lost Time Injury
                  </Text>
                </View>
                <Text style={styles.ltiDetailText}>
                  This is a reportable Lost Time Injury (LTI). Days recorded: {formData.ltiDays} day{formData.ltiDays !== 1 ? 's' : ''}
                </Text>
              </View>
            )}

            {/* Investigation Section */}
            {formData.status !== 'reported' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Investigation</Text>

                {formData.rootCause && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Root Cause</Text>
                    <View style={styles.infoBox}>
                      <Text style={styles.infoText}>{formData.rootCause}</Text>
                    </View>
                  </View>
                )}

                {formData.capaDeadline && (
                  <View style={[styles.formGroup, { backgroundColor: '#FFFBEB', borderRadius: borderRadius.md, padding: spacing.md }]}>
                    <Text style={styles.label}>CAPA Deadline</Text>
                    <Text style={[styles.infoText, { color: '#92400E', fontWeight: '600', marginTop: spacing.sm }]}>
                      {formData.capaDeadline}
                    </Text>
                  </View>
                )}

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Update Status</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {['under_investigation', 'investigation_complete', 'closed'].map((st) => (
                      <TouchableOpacity
                        key={st}
                        style={[
                          styles.statusOption,
                          formData.status === st && styles.statusOptionActive,
                        ]}
                        onPress={() => setFormData({ ...formData, status: st as any })}
                      >
                        <Text
                          style={[
                            styles.statusOptionText,
                            formData.status === st && { color: colors.primary, fontWeight: '600' },
                          ]}
                        >
                          {statusLabels[st as keyof typeof statusLabels]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}

            {/* Additional Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Additional Information</Text>
              <View style={styles.infoBox}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Created</Text>
                  <Text style={styles.infoValue}>{formData.date} {formData.time}</Text>
                </View>
                {formData.modifiedDate && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Last Updated</Text>
                    <Text style={styles.infoValue}>{formData.modifiedDate}</Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={isUpdating}
            >
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.updateBtn, isUpdating && { opacity: 0.6 }]}
              onPress={handleUpdate}
              disabled={isUpdating}
            >
              <Ionicons name="checkmark" size={18} color="#FFF" />
              <Text style={styles.updateBtnText}>
                {isUpdating ? 'Updating...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────
export function IncidentDashboardScreen() {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [filterType, setFilterType] = useState<'all' | Incident['type']>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | Incident['status']>('all');
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const filteredIncidents = useMemo(() => {
    let filtered = SAMPLE_INCIDENTS;

    if (filterType !== 'all') {
      filtered = filtered.filter(i => i.type === filterType);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(i => i.status === filterStatus);
    }

    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(i =>
        i.number.toLowerCase().includes(search) ||
        i.worker.toLowerCase().includes(search) ||
        i.description.toLowerCase().includes(search)
      );
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filterType, filterStatus, searchText]);

  const stats = useMemo(() => ({
    total: SAMPLE_INCIDENTS.length,
    open: SAMPLE_INCIDENTS.filter(i => i.status !== 'closed').length,
    lti: SAMPLE_INCIDENTS.filter(i => i.lti).length,
    critical: SAMPLE_INCIDENTS.filter(i => i.severity === 'critical').length,
  }), []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const handleUpdateIncident = (data: Incident) => {
    Alert.alert('Success', `Incident ${data.number} updated successfully`);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Incident Dashboard</Text>
        <Text style={styles.headerSubtitle}>Track and manage workplace incidents</Text>
      </View>

      {/* Stats Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statsRow}
        scrollEventThrottle={16}
      >
        <View style={[styles.statBox, styles.cardShadow]}>
          <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="list-outline" size={24} color={colors.primary} />
          </View>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statBox, styles.cardShadow]}>
          <View style={[styles.statIcon, { backgroundColor: '#F59E0B' + '20' }]}>
            <Ionicons name="alert-circle" size={24} color="#F59E0B" />
          </View>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.open}</Text>
          <Text style={styles.statLabel}>Open</Text>
        </View>
        <View style={[styles.statBox, styles.cardShadow]}>
          <View style={[styles.statIcon, { backgroundColor: '#DC2626' + '20' }]}>
            <Ionicons name="alert" size={24} color="#DC2626" />
          </View>
          <Text style={[styles.statValue, { color: '#DC2626' }]}>{stats.lti}</Text>
          <Text style={styles.statLabel}>LTI</Text>
        </View>
        <View style={[styles.statBox, styles.cardShadow]}>
          <View style={[styles.statIcon, { backgroundColor: '#EF4444' + '20' }]}>
            <Ionicons name="warning" size={24} color="#EF4444" />
          </View>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.critical}</Text>
          <Text style={styles.statLabel}>Critical</Text>
        </View>
      </ScrollView>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search incidents..."
          placeholderTextColor={colors.textSecondary}
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText ? (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        scrollEventThrottle={16}
      >
        <TouchableOpacity
          style={[styles.filterChip, filterType === 'all' && styles.filterChipActive]}
          onPress={() => setFilterType('all')}
        >
          <Text style={[styles.filterChipText, filterType === 'all' && { color: colors.primary }]}>
            All Types
          </Text>
        </TouchableOpacity>
        {['injury', 'near_miss', 'medical_treatment', 'property_damage', 'environmental'].map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.filterChip, filterType === type && styles.filterChipActive]}
            onPress={() => setFilterType(type as any)}
          >
            <Text style={[styles.filterChipText, filterType === type && { color: colors.primary }]}>
              {type === 'injury' ? '🤕 Injury' :
               type === 'near_miss' ? '⚠️ Near Miss' :
               type === 'medical_treatment' ? '⚕️ Medical' :
               type === 'property_damage' ? '🔨 Property' :
               '🌍 Environmental'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Status Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        scrollEventThrottle={16}
      >
        <TouchableOpacity
          style={[styles.filterChip, filterStatus === 'all' && styles.filterChipActive]}
          onPress={() => setFilterStatus('all')}
        >
          <Text style={[styles.filterChipText, filterStatus === 'all' && { color: colors.primary }]}>
            All Status
          </Text>
        </TouchableOpacity>
        {['reported', 'under_investigation', 'investigation_complete', 'closed'].map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.filterChip, filterStatus === status && styles.filterChipActive]}
            onPress={() => setFilterStatus(status as any)}
          >
            <Text style={[styles.filterChipText, filterStatus === status && { color: colors.primary }]}>
              {status === 'reported' ? '🚩 Reported' :
               status === 'under_investigation' ? '🔍 Investigating' :
               status === 'investigation_complete' ? '✓ Complete' :
               '✓ Closed'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Incidents List */}
      <FlatList
        data={filteredIncidents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <IncidentCard
            incident={item}
            onPress={() => {
              setSelectedIncident(item);
              setDetailModalVisible(true);
            }}
          />
        )}
        contentContainerStyle={styles.listContent}
        scrollEnabled={true}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="information-circle-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>No incidents found</Text>
          </View>
        }
      />

      {/* Detail Modal */}
      <IncidentDetailModal
        visible={detailModalVisible}
        incident={selectedIncident}
        onClose={() => setDetailModalVisible(false)}
        onUpdate={handleUpdateIncident}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────
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
  statsRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  statBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginRight: spacing.md,
    width: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  cardShadow: {
    ...shadows.md,
  },
  searchBar: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 14,
    color: colors.text,
  },
  filterBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.full,
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  incidentCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    marginBottom: spacing.md,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  incidentNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  incidentDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  cardContent: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  contentText: {
    fontSize: 12,
    color: colors.text,
  },
  description: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  ltiAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  ltiText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  deadlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  cardFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTopWidth: spacing.md,
  },
  footerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
  },
  footerBtnText: {
    fontSize: 12,
    fontWeight: '600',
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
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalBody: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxHeight: 500,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statusCard: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderLeftWidth: 3,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  statusLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoBox: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  infoText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  ltiDetailText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  statusOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusOptionActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  statusOptionText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  updateBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  updateBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});
