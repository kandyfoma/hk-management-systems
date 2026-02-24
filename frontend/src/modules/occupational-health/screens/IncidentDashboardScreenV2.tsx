import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions,
  Modal, Alert, FlatList, RefreshControl, TextInput, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing, typography } from '../../../theme/theme';

const ACCENT = colors.primary;

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
  investigationId?: string;
  rootCause?: string;
  capaDeadline?: string;
  modifiedDate?: string;
}

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

// Type Configuration
const TYPE_CONFIG = {
  injury: { icon: 'bandage', color: '#EF4444', label: 'Injury' },
  near_miss: { icon: 'alert-circle', color: '#F59E0B', label: 'Near Miss' },
  medical_treatment: { icon: 'medical', color: '#3B82F6', label: 'Medical' },
  property_damage: { icon: 'hammer', color: '#8B5CF6', label: 'Damage' },
  environmental: { icon: 'leaf', color: '#10B981', label: 'Environment' },
};

const SEVERITY_CONFIG = {
  low: { color: '#22C55E', label: 'Low' },
  medium: { color: '#F59E0B', label: 'Medium' },
  high: { color: '#EF4444', label: 'High' },
  critical: { color: '#DC2626', label: 'Critical' },
};

const STATUS_CONFIG = {
  reported: { color: '#3B82F6', icon: 'flag-outline', label: 'Reported' },
  under_investigation: { color: '#F59E0B', icon: 'search-outline', label: 'Investigating' },
  investigation_complete: { color: '#8B5CF6', icon: 'checkmark-outline', label: 'Complete' },
  closed: { color: '#22C55E', icon: 'checkmark-circle', label: 'Closed' },
};

// â”€â”€â”€ Stat Card Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StatCard({ icon, label, value, color, badge }: { icon: string; label: string; value: number; color: string; badge?: number }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <View style={[styles.statIconBox, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={22} color={color} />
        {badge ? (
          <View style={[styles.statBadge, { backgroundColor: color }]}>
            <Text style={styles.statBadgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

// â”€â”€â”€ Incident Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function IncidentCard({ incident, onPress }: { incident: Incident; onPress: () => void }) {
  const typeConfig = TYPE_CONFIG[incident.type];
  const severityConfig = SEVERITY_CONFIG[incident.severity];
  const statusConfig = STATUS_CONFIG[incident.status];

  return (
    <TouchableOpacity
      style={[styles.incidentCard]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      {/* Status indicator left border */}
      <View style={[styles.cardStatusBorder, { backgroundColor: statusConfig.color }]} />

      <View style={styles.cardContent}>
        {/* Row 1: Type icon + Number + Severity badge */}
        <View style={styles.cardHeaderRow}>
          <View style={[styles.typeIconBox, { backgroundColor: typeConfig.color + '15' }]}>
            <Ionicons name={typeConfig.icon as any} size={18} color={typeConfig.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.incidentNumber}>{incident.number}</Text>
            <Text style={styles.incidentMeta}>{incident.date} â€¢ {incident.time}</Text>
          </View>
          <View style={[styles.severityBadge, { backgroundColor: severityConfig.color + '20' }]}>
            <Text style={[styles.severityText, { color: severityConfig.color }]}>{severityConfig.label}</Text>
          </View>
        </View>

        {/* Row 2: Worker & Location */}
        <View style={styles.cardDetailsRow}>
          <View style={styles.detailItem}>
            <Ionicons name="person" size={14} color={colors.textSecondary} />
            <Text style={styles.detailText} numberOfLines={1}>{incident.worker}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="location" size={14} color={colors.textSecondary} />
            <Text style={styles.detailText} numberOfLines={1}>{incident.location}</Text>
          </View>
        </View>

        {/* Row 3: Description */}
        <Text style={styles.description} numberOfLines={2}>{incident.description}</Text>

        {/* Row 4: LTI Alert or CAPA deadline */}
        {incident.lti || incident.capaDeadline ? (
          <View style={styles.alertRow}>
            {incident.lti && (
              <View style={styles.ltiAlert}>
                <Ionicons name="alert-circle" size={13} color="#DC2626" />
                <Text style={styles.alertText}>LTI â€¢ {incident.ltiDays} days</Text>
              </View>
            )}
            {incident.capaDeadline && (
              <View style={styles.capaAlert}>
                <Ionicons name="calendar" size={13} color="#F59E0B" />
                <Text style={styles.alertText}>CAPA: {incident.capaDeadline}</Text>
              </View>
            )}
          </View>
        ) : null}

        {/* Row 5: Status badge + Footer */}
        <View style={styles.cardFooter}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '15' }]}>
            <Ionicons name={statusConfig.icon as any} size={12} color={statusConfig.color} />
            <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
          <TouchableOpacity style={styles.viewBtn} onPress={onPress}>
            <Text style={styles.viewBtnText}>View Details</Text>
            <Ionicons name="chevron-forward" size={14} color={ACCENT} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// â”€â”€â”€ Detail Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  React.useEffect(() => {
    setFormData(incident);
  }, [incident, visible]);

  if (!formData) return null;

  const handleUpdate = () => {
    onUpdate(formData);
    setIsUpdating(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{formData.number}</Text>
              <Text style={styles.modalSubtitle}>{formData.date} â€¢ {formData.time}</Text>
            </View>
            <TouchableOpacity onPress={onClose} disabled={isUpdating}>
              <Ionicons name="close-circle" size={28} color={ACCENT} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Key Metrics */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Type</Text>
                <Text style={styles.metricValue}>{TYPE_CONFIG[formData.type].label}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Severity</Text>
                <Text style={[styles.metricValue, { color: SEVERITY_CONFIG[formData.severity].color }]}>
                  {SEVERITY_CONFIG[formData.severity].label}
                </Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Status</Text>
                <Text style={[styles.metricValue, { color: STATUS_CONFIG[formData.status].color }]}>
                  {STATUS_CONFIG[formData.status].label}
                </Text>
              </View>
            </View>

            {/* Section: Incident Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Incident Details</Text>
              <DetailRow label="Description" value={formData.description} />
              <DetailRow label="Location" value={formData.location} />
              <DetailRow label="Department" value={formData.department} />
            </View>

            {/* Section: Affected Worker */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Affected Worker</Text>
              <DetailRow label="Name" value={formData.worker} />
              <DetailRow label="Worker ID" value={formData.workerId} />
            </View>

            {/* Section: LTI Alert */}
            {formData.lti && (
              <View style={[styles.section, styles.alertSection]}>
                <View style={styles.alertHeader}>
                  <Ionicons name="alert" size={20} color="#DC2626" />
                  <Text style={styles.sectionTitle}>Lost Time Injury</Text>
                </View>
                <Text style={styles.alertContent}>
                  Reportable LTI â€¢ {formData.ltiDays} day{formData.ltiDays !== 1 ? 's' : ''} lost
                </Text>
              </View>
            )}

            {/* Section: Investigation */}
            {formData.status !== 'reported' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Investigation</Text>
                {formData.rootCause && <DetailRow label="Root Cause" value={formData.rootCause} />}
                {formData.capaDeadline && <DetailRow label="CAPA Deadline" value={formData.capaDeadline} />}
              </View>
            )}

            {/* Section: Metadata */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Metadata</Text>
              <DetailRow label="Incident ID" value={formData.id} />
              <DetailRow label="Created" value={`${formData.date} ${formData.time}`} />
              {formData.modifiedDate && <DetailRow label="Last Updated" value={formData.modifiedDate} />}
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} disabled={isUpdating}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.updateBtn, isUpdating && { opacity: 0.6 }]}
              onPress={handleUpdate}
              disabled={isUpdating}
            >
              <Ionicons name="checkmark" size={18} color="#FFF" />
              <Text style={styles.updateBtnText}>{isUpdating ? 'Saving...' : 'Save Changes'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// â”€â”€â”€ Detail Row Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

// â”€â”€â”€ Main Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function IncidentDashboardScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

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

  const stats = useMemo(() => {
    const total = SAMPLE_INCIDENTS.length;
    const open = SAMPLE_INCIDENTS.filter(i => i.status !== 'closed').length;
    const lti = SAMPLE_INCIDENTS.filter(i => i.lti).length;
    const critical = SAMPLE_INCIDENTS.filter(i => i.severity === 'critical').length;
    return { total, open, lti, critical };
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const handleUpdateIncident = (data: Incident) => {
    Alert.alert('Success', `Incident ${data.number} updated successfully`);
  };

  const openIncident = (incident: Incident) => {
    setSelectedIncident(incident);
    setDetailModalVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* â”€â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Incident Dashboard</Text>
          <Text style={styles.headerSubtitle}>Track & manage workplace incidents in real-time</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* â”€â”€â”€ Stats Section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <View style={isDesktop ? styles.statsGridDesktop : styles.statsGridMobile}>
          <StatCard icon="list" label="Total" value={stats.total} color={ACCENT} />
          <StatCard icon="alert-circle" label="Open" value={stats.open} color="#F59E0B" badge={stats.open} />
          <StatCard icon="alert" label="LTI" value={stats.lti} color="#DC2626" badge={stats.lti} />
          <StatCard icon="warning" label="Critical" value={stats.critical} color="#EF4444" badge={stats.critical} />
        </View>

        {/* â”€â”€â”€ Search Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search incident ID, worker, or description..."
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor={colors.placeholder}
            />
            {searchText ? (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* â”€â”€â”€ Filter Tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <FilterChip
              label="All"
              active={filterType === 'all'}
              onPress={() => setFilterType('all')}
            />
            {Object.entries(TYPE_CONFIG).map(([key, config]) => (
              <FilterChip
                key={key}
                label={config.label}
                active={filterType === key}
                color={config.color}
                onPress={() => setFilterType(key as any)}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <FilterChip
              label="All"
              active={filterStatus === 'all'}
              onPress={() => setFilterStatus('all')}
            />
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <FilterChip
                key={key}
                label={config.label}
                active={filterStatus === key}
                color={config.color}
                onPress={() => setFilterStatus(key as any)}
              />
            ))}
          </ScrollView>
        </View>

        {/* â”€â”€â”€ Incidents List â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <View style={styles.incidentsSection}>
          <Text style={styles.incidentsTitle}>
            <Text style={{ color: ACCENT, fontWeight: '700' }}>{filteredIncidents.length}</Text>
            {' '}Incident{filteredIncidents.length !== 1 ? 's' : ''}
          </Text>
          {filteredIncidents.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>No incidents found</Text>
              <Text style={styles.emptySubtitle}>Great job! All incidents are resolved.</Text>
            </View>
          ) : (
            <FlatList
              scrollEnabled={false}
              data={filteredIncidents}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <IncidentCard incident={item} onPress={() => openIncident(item)} />
              )}
              ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
              contentContainerStyle={{ paddingVertical: spacing.md }}
            />
          )}
        </View>
      </ScrollView>

      {/* â”€â”€â”€ Detail Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <IncidentDetailModal
        visible={detailModalVisible}
        incident={selectedIncident}
        onClose={() => setDetailModalVisible(false)}
        onUpdate={handleUpdateIncident}
      />
    </View>
  );
}

// â”€â”€â”€ Filter Chip Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function FilterChip({
  label,
  active,
  color,
  onPress,
}: {
  label: string;
  active: boolean;
  color?: string;
  onPress: () => void;
}) {
  const activeColor = color || ACCENT;
  return (
    <TouchableOpacity
      style={[
        styles.filterChip,
        active && { backgroundColor: activeColor + '20', borderColor: activeColor, borderWidth: 1.5 },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.filterChipText,
          active && { color: activeColor, fontWeight: '600' },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// STYLES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },

  // â”€â”€â”€ Stats Grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  statsGridDesktop: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statsGridMobile: {
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderTopWidth: 3,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.sm,
  },
  statIconBox: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // â”€â”€â”€ Search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  searchContainer: {
    marginBottom: spacing.lg,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.sm,
    color: colors.text,
    fontSize: 14,
  },

  // â”€â”€â”€ Filters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  filterSection: {
    marginBottom: spacing.lg,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  filterScroll: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },

  // â”€â”€â”€ Incidents List â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  incidentsSection: {
    marginTop: spacing.lg,
  },
  incidentsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  incidentCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  cardStatusBorder: {
    height: 4,
  },
  cardContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  typeIconBox: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incidentNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  incidentMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  severityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardDetailsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  description: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  alertRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  ltiAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  capaAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  alertText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  viewBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: ACCENT,
  },

  // â”€â”€â”€ Empty State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // â”€â”€â”€ Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: '90%',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  modalContentDesktop: {
    marginHorizontal: '20%',
    marginVertical: '5%',
    borderRadius: borderRadius.lg,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  modalBody: {
    maxHeight: '70%',
    marginBottom: spacing.lg,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  metricItem: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  detailRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    lineHeight: 20,
  },
  alertSection: {
    backgroundColor: '#FEE2E2',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  alertContent: {
    fontSize: 13,
    color: '#7F1D1D',
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  closeBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  updateBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  updateBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});
