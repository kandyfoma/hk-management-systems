import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator,
  StyleSheet, Dimensions, Modal, Alert, Platform, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { getTextColor } from '../../../utils/colorContrast';
import DateInput from '../../../components/DateInput';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const chartWidth = width - 40;
const ACCENT = colors.primary;

interface ExposureReading {
  id: string;
  date: string;
  time: string;
  worker: string;
  workerId: string;
  area: string;
  value: number;
  unit: string;
  limit: number;
  status: 'safe' | 'warning' | 'critical' | 'exceeded';
  equipment: string;
  calibrationDate?: string;
}

interface ExposureType {
  id: string;
  name: string;
  fullName: string;
  unit: string;
  osha_limit: number;
  acgih_limit: number;
  icon: string;
  color: string;
  riskColor: (value: number, limit: number) => string;
}

const EXPOSURE_TYPES: Record<string, ExposureType> = {
  silica: {
    id: 'silica',
    name: 'Silica',
    fullName: 'Crystalline Silica (Respirable)',
    unit: 'mg/m³',
    osha_limit: 0.025,
    acgih_limit: 0.025,
    icon: 'water-outline',
    color: '#EF4444',
    riskColor: (val, limit) => val >= limit * 1.5 ? '#DC2626' : val >= limit ? '#EF4444' : '#FCA5A5'
  },
  cobalt: {
    id: 'cobalt',
    name: 'Cobalt',
    fullName: 'Cobalt & Cobalt Compounds',
    unit: 'µg/m³',
    osha_limit: 100,
    acgih_limit: 5,
    icon: 'sparkles-outline',
    color: '#F59E0B',
    riskColor: (val, limit) => val >= limit * 1.5 ? '#D97706' : val >= limit ? '#F59E0B' : '#FED7AA'
  },
  dust: {
    id: 'dust',
    name: 'Dust',
    fullName: 'Total Inhalable Dust',
    unit: 'mg/m³',
    osha_limit: 5,
    acgih_limit: 3,
    icon: 'cloud-outline',
    color: '#8B5CF6',
    riskColor: (val, limit) => val >= limit * 1.5 ? '#7C3AED' : val >= limit ? '#8B5CF6' : '#DDD6FE'
  },
  noise: {
    id: 'noise',
    name: 'Noise',
    fullName: 'Noise Level',
    unit: 'dB(A)',
    osha_limit: 90,
    acgih_limit: 85,
    icon: 'volume-high-outline',
    color: '#06B6D4',
    riskColor: (val, limit) => val >= limit * 1.1 ? '#0891B2' : val >= limit ? '#06B6D4' : '#A5F3FC'
  },
  vibration: {
    id: 'vibration',
    name: 'Vibration',
    fullName: 'Hand-Arm Vibration',
    unit: 'm/s²',
    osha_limit: 5,
    acgih_limit: 2.2,
    icon: 'radio-outline',
    color: '#EC4899',
    riskColor: (val, limit) => val >= limit * 1.5 ? '#BE185D' : val >= limit ? '#EC4899' : '#FCE7F3'
  },
  heat: {
    id: 'heat',
    name: 'Heat',
    fullName: 'Wet Bulb Globe Temperature',
    unit: '°C',
    osha_limit: 32.2,
    acgih_limit: 28,
    icon: 'flame-outline',
    color: '#FF6B6B',
    riskColor: (val, limit) => val >= limit * 1.15 ? '#D32F2F' : val >= limit ? '#FF6B6B' : '#FFCDD2'
  }
};

// Sample Data
const SAMPLE_READINGS: ExposureReading[] = [
  {
    id: 'r1', date: '2025-01-24', time: '09:30', worker: 'Jean-Charles Mulinga', workerId: 'w001',
    area: 'Main Shaft Extraction', value: 0.032, unit: 'mg/m³', limit: 0.025, status: 'exceeded',
    equipment: 'Gravimetric Sampler #02', calibrationDate: '2025-01-20'
  },
  {
    id: 'r2', date: '2025-01-24', time: '10:00', worker: 'Marie Lusaka', workerId: 'w002',
    area: 'Grinding Mill', value: 255, unit: 'µg/m³', limit: 100, status: 'exceeded',
    equipment: 'Real-Time Aerosol Monitor', calibrationDate: '2025-01-18'
  },
  {
    id: 'r3', date: '2025-01-24', time: '11:15', worker: 'Pierre Kabamba', workerId: 'w003',
    area: 'Crushing Plant', value: 4.2, unit: 'mg/m³', limit: 5, status: 'safe',
    equipment: 'Dust Monitor DM-100', calibrationDate: '2025-01-22'
  },
  {
    id: 'r4', date: '2025-01-24', time: '08:00', worker: 'Robert Mbala', workerId: 'w004',
    area: 'Processing Area', value: 94, unit: 'dB(A)', limit: 90, status: 'critical',
    equipment: 'Sound Level Meter SLM-001', calibrationDate: '2025-01-19'
  },
  {
    id: 'r5', date: '2025-01-24', time: '09:45', worker: 'Sandra Tshilombo', workerId: 'w005',
    area: 'Drill Operation', value: 3.8, unit: 'm/s²', limit: 2.2, status: 'exceeded',
    equipment: 'Vibration Meter VM-50'
  }
];

// ─── Status Badge ────────────────────────────────────────────
function StatusBadge({ status }: { status: 'safe' | 'warning' | 'critical' | 'exceeded' }) {
  const config = {
    safe: { color: '#22C55E', label: 'Safe', icon: 'checkmark-circle' },
    warning: { color: '#F59E0B', label: 'Warning', icon: 'alert-circle' },
    exceeded: { color: '#EF4444', label: 'Exceeded', icon: 'close-circle' },
    critical: { color: '#DC2626', label: 'Critical', icon: 'alert' }
  };
  const cfg = config[status];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.color + '20' }]}>
      <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Exposure Type Card ──────────────────────────────────────
function ExposureTypeCard({ 
  exposure, 
  readings, 
  onPress 
}: { 
  exposure: ExposureType; 
  readings: ExposureReading[]; 
  onPress: () => void 
}) {
  const exposureReadings = readings.filter(r => r.unit === exposure.unit);
  const latestReading = exposureReadings[0];
  const exceedCount = exposureReadings.filter(r => r.status === 'exceeded' || r.status === 'critical').length;
  const avgValue = exposureReadings.reduce((sum, r) => sum + r.value, 0) / (exposureReadings.length || 1);
  const exceeding = latestReading && (latestReading.status === 'exceeded' || latestReading.status === 'critical');

  return (
    <TouchableOpacity 
      style={[styles.typeCard, { borderLeftColor: exposure.color, borderLeftWidth: 4 }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.typeCardHeader}>
        <View style={[styles.typeIcon, { backgroundColor: exposure.color + '20' }]}>
          <Ionicons name={exposure.icon as any} size={24} color={exposure.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.typeName}>{exposure.name}</Text>
          <Text style={styles.typeUnit}>{exposure.fullName}</Text>
        </View>
        {exceedCount > 0 && (
          <View style={styles.exceedBadge}>
            <Text style={styles.exceedCount}>{exceedCount}</Text>
            <Text style={styles.exceedLabel}>Exceeded</Text>
          </View>
        )}
      </View>

      {latestReading && (
        <View style={styles.typeCardContent}>
          <View style={styles.readingRow}>
            <Text style={styles.label}>Latest Reading:</Text>
            <View style={styles.valueWithStatus}>
              <Text style={[styles.value, { color: exceeding ? exposure.color : '#16A34A' }]}>
                {latestReading.value.toFixed(2)} {latestReading.unit}
              </Text>
              <StatusBadge status={latestReading.status} />
            </View>
          </View>
          <View style={styles.readingRow}>
            <Text style={styles.label}>ACGIH Limit:</Text>
            <Text style={styles.limit}>{exposure.acgih_limit} {exposure.unit}</Text>
          </View>
          <View style={styles.limitBar}>
            <View 
              style={[
                styles.limitFill, 
                { 
                  width: `${Math.min((avgValue / exposure.acgih_limit) * 100, 100)}%`,
                  backgroundColor: exposure.riskColor(avgValue, exposure.acgih_limit)
                }
              ]} 
            />
          </View>
          <Text style={styles.limitText}>
            {latestReading.worker} • {latestReading.area} • {latestReading.date}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Detailed Exposure View ──────────────────────────────────
function ExposureDetailModal({ 
  exposure, 
  readings, 
  visible, 
  onClose 
}: { 
  exposure: ExposureType | null; 
  readings: ExposureReading[]; 
  visible: boolean; 
  onClose: () => void 
}) {
  if (!exposure) return null;

  const exposureReadings = readings.filter(r => r.unit === exposure.unit);
  const exceedCount = exposureReadings.filter(r => r.status === 'exceeded' || r.status === 'critical').length;
  const safeCount = exposureReadings.filter(r => r.status === 'safe').length;
  const avgValue = exposureReadings.reduce((sum, r) => sum + r.value, 0) / (exposureReadings.length || 1);

  const chartData = {
    labels: exposureReadings.slice(0, 7).map(r => r.time),
    datasets: [{
      data: exposureReadings.slice(0, 7).map(r => r.value)
    }]
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <View style={[styles.typeIcon, { backgroundColor: exposure.color + '20' }]}>
                <Ionicons name={exposure.icon as any} size={28} color={exposure.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{exposure.fullName}</Text>
                <Text style={styles.modalSubtitle}>{exposure.unit}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Statistics */}
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { borderTopColor: exposure.color }]}>
                <Text style={styles.statLabel}>Readings</Text>
                <Text style={styles.statValue}>{exposureReadings.length}</Text>
              </View>
              <View style={[styles.statCard, { borderTopColor: '#22C55E' }]}>
                <Text style={styles.statLabel}>Safe</Text>
                <Text style={[styles.statValue, { color: '#22C55E' }]}>{safeCount}</Text>
              </View>
              <View style={[styles.statCard, { borderTopColor: '#EF4444' }]}>
                <Text style={styles.statLabel}>Exceeded</Text>
                <Text style={[styles.statValue, { color: '#EF4444' }]}>{exceedCount}</Text>
              </View>
              <View style={[styles.statCard, { borderTopColor: exposure.color }]}>
                <Text style={styles.statLabel}>Average</Text>
                <Text style={styles.statValue}>{avgValue.toFixed(2)}</Text>
              </View>
            </View>

            {/* Limit Info */}
            <View style={styles.limitSection}>
              <Text style={styles.sectionTitle}>Exposure Limits</Text>
              <View style={styles.limitRow}>
                <Text style={styles.limitRowLabel}>OSHA TWA:</Text>
                <Text style={styles.limitRowValue}>{exposure.osha_limit} {exposure.unit}</Text>
              </View>
              <View style={styles.limitRow}>
                <Text style={styles.limitRowLabel}>ACGIH TLV:</Text>
                <Text style={styles.limitRowValue}>{exposure.acgih_limit} {exposure.unit}</Text>
              </View>
              <View style={[styles.limitBar, { marginTop: 12 }]}>
                <View 
                  style={[
                    styles.limitFill, 
                    { 
                      width: `${Math.min((avgValue / exposure.acgih_limit) * 100, 100)}%`,
                      backgroundColor: exposure.riskColor(avgValue, exposure.acgih_limit)
                    }
                  ]} 
                />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 8 }}>
                <Text style={styles.limitScaleLabel}>0</Text>
                <Text style={styles.limitScaleLabel}>{exposure.acgih_limit} {exposure.unit}</Text>
              </View>
            </View>

            {/* Recent Readings Table */}
            <View style={styles.readingsSection}>
              <Text style={styles.sectionTitle}>Recent Readings</Text>
              <View style={styles.readingsTable}>
                <View style={[styles.tableHeader, { backgroundColor: exposure.color + '15' }]}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>Worker</Text>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>Reading</Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>Area</Text>
                </View>
                {exposureReadings.map(reading => (
                  <View key={reading.id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>
                      {reading.worker.split(' ')[0]}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1.5, color: reading.status === 'safe' ? '#22C55E' : '#EF4444' }]}>
                      {reading.value.toFixed(2)}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1 }]} numberOfLines={1}>
                      {reading.area.split(' ')[0]}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
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

// ─── Main Screen ─────────────────────────────────────────────
export function ExposureMonitoringScreen() {
  const [selectedExposure, setSelectedExposure] = useState<ExposureType | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'safe' | 'exceeded'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'value' | 'status'>('date');

  const filteredReadings = useMemo(() => {
    let filtered = SAMPLE_READINGS;
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => 
        filterStatus === 'safe' ? r.status === 'safe' : r.status === 'exceeded' || r.status === 'critical'
      );
    }

    if (sortBy === 'value') {
      filtered = [...filtered].sort((a, b) => b.value - a.value);
    } else if (sortBy === 'status') {
      const statusOrder = { critical: 0, exceeded: 1, warning: 2, safe: 3 };
      filtered = [...filtered].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
    }

    return filtered;
  }, [filterStatus, sortBy]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const openModal = useCallback((exposure: ExposureType) => {
    setSelectedExposure(exposure);
    setModalVisible(true);
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Exposure Monitoring</Text>
        <Text style={styles.headerSubtitle}>Real-time occupational exposure tracking</Text>
      </View>

      {/* Filter /Sort Bar */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <TouchableOpacity 
            style={[styles.filterBadge, filterStatus === 'all' && styles.filterBadgeActive]}
            onPress={() => setFilterStatus('all')}
          >
            <Text style={[styles.filterText, filterStatus === 'all' && { color: colors.primary }]}>
              All ({SAMPLE_READINGS.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterBadge, filterStatus === 'safe' && styles.filterBadgeActive]}
            onPress={() => setFilterStatus('safe')}
          >
            <Text style={[styles.filterText, filterStatus === 'safe' && { color: '#22C55E' }]}>
              Safe ({SAMPLE_READINGS.filter(r => r.status === 'safe').length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterBadge, filterStatus === 'exceeded' && styles.filterBadgeActive]}
            onPress={() => setFilterStatus('exceeded')}
          >
            <Text style={[styles.filterText, filterStatus === 'exceeded' && { color: '#EF4444' }]}>
              Exceeded ({SAMPLE_READINGS.filter(r => r.status === 'exceeded' || r.status === 'critical').length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Overview Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exposure Types</Text>
          <View style={styles.typesGrid}>
            {Object.values(EXPOSURE_TYPES).map(exposure => (
              <ExposureTypeCard 
                key={exposure.id} 
                exposure={exposure} 
                readings={SAMPLE_READINGS}
                onPress={() => openModal(exposure)}
              />
            ))}
          </View>
        </View>

        {/* Recent Readings Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Readings</Text>
            <TouchableOpacity onPress={() => setSortBy(sortBy === 'date' ? 'value' : 'date')}>
              <Text style={styles.sortText}>Sort: {sortBy === 'date' ? 'Date' : 'Value'}</Text>
            </TouchableOpacity>
          </View>

          {filteredReadings.length > 0 ? (
            filteredReadings.map(reading => (
              <View key={reading.id} style={styles.readingCard}>
                <View style={styles.readingHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.readingWorker}>{reading.worker}</Text>
                    <Text style={styles.readingArea}>{reading.area}</Text>
                  </View>
                  <StatusBadge status={reading.status} />
                </View>
                <View style={styles.readingDetails}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailLabel}>Value</Text>
                    <Text style={[styles.detailValue, { color: reading.status === 'safe' ? '#22C55E' : '#EF4444' }]}>
                      {reading.value.toFixed(3)} {reading.unit}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailLabel}>Limit</Text>
                    <Text style={styles.detailValue}>{reading.limit} {reading.unit}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailLabel}>Time</Text>
                    <Text style={styles.detailValue}>{reading.time}</Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="information-circle-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyStateText}>No readings found</Text>
            </View>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Detail Modal */}
      <ExposureDetailModal 
        exposure={selectedExposure}
        readings={SAMPLE_READINGS}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
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
  filterBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceSecondary,
  },
  filterBadgeActive: {
    backgroundColor: colors.primaryFaded,
  },
  filterText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  sortText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  typesGrid: {
    gap: spacing.md,
  },
  typeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.md,
  },
  typeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  typeUnit: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  exceedBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: borderRadius.md,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  exceedCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  exceedLabel: {
    fontSize: 10,
    color: '#DC2626',
    fontWeight: '500',
  },
  typeCardContent: {
    gap: spacing.md,
  },
  readingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  valueWithStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  limit: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  limitBar: {
    height: 6,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  limitFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  limitText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  readingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  readingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  readingWorker: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  readingArea: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  readingDetails: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  detailLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
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
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
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
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 0.5,
    backgroundColor: colors.surfaceSecondary,
    borderTopWidth: 3,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  limitSection: {
    marginBottom: spacing.lg,
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  limitRowLabel: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  limitRowValue: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  limitScaleLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  readingsSection: {
    marginBottom: spacing.lg,
  },
  readingsTable: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tableCell: {
    fontSize: 12,
    color: colors.text,
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
});
