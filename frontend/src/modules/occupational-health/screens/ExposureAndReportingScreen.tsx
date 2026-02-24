import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  Dimensions, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';

const { width } = Dimensions.get('window');

// ─── Exposure Monitoring Dashboard ──────────────────────────────
export function ExposureMonitoringDashboard() {
  const [selectedExposure, setSelectedExposure] = useState<string | null>(null);

  const exposureTypes = [
    {
      id: 'silica',
      name: 'Silica (Respirable)',
      limit: 0.025,
      unit: 'mg/m³',
      current: 0.008,
      status: 'safe',
      trend: [0.020, 0.018, 0.015, 0.012, 0.010, 0.008],
    },
    {
      id: 'cobalt',
      name: 'Cobalt & Compounds',
      limit: 0.05,
      unit: 'mg/m³',
      current: 0.012,
      status: 'safe',
      trend: [0.015, 0.020, 0.018, 0.015, 0.012, 0.012],
    },
    {
      id: 'dust',
      name: 'Total Dust',
      limit: 10.0,
      unit: 'mg/m³',
      current: 3.5,
      status: 'safe',
      trend: [5.0, 4.5, 4.0, 3.8, 3.6, 3.5],
    },
    {
      id: 'noise',
      name: 'Noise Level',
      limit: 85,
      unit: 'dB(A)',
      current: 82,
      status: 'safe',
      trend: [88, 86, 85, 84, 83, 82],
    },
    {
      id: 'vibration',
      name: 'Hand-Arm Vibration',
      limit: 2.8,
      unit: 'm/s²',
      current: 1.2,
      status: 'safe',
      trend: [2.0, 1.8, 1.6, 1.4, 1.3, 1.2],
    },
    {
      id: 'heat',
      name: 'Heat (WBGT)',
      limit: 32.0,
      unit: '°C',
      current: 28.5,
      status: 'safe',
      trend: [31.0, 30.0, 29.5, 29.0, 28.8, 28.5],
    },
  ];

  const getStatusColor = (status: string) => {
    if (status === 'safe') return '#22C55E';
    if (status === 'warning') return '#F59E0B';
    return '#EF4444';
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Exposure Monitoring</Text>
          <Text style={styles.subtitle}>Real-time occupational exposure tracking</Text>
        </View>

        {/* Overall Status */}
        <View style={[styles.section, styles.cardShadow, { marginHorizontal: spacing.md, marginBottom: spacing.lg }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={styles.sectionTitle}>Overall Status</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>All exposures monitored</Text>
            </View>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#22C55E' + '20', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: '#22C55E' }}>✓</Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#22C55E' }}>Safe</Text>
            </View>
          </View>
        </View>

        {/* Exposure Types */}
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: 40 }}>
          {exposureTypes.map(exp => (
            <TouchableOpacity
              key={exp.id}
              style={[styles.exposureCard, styles.cardShadow]}
              onPress={() => setSelectedExposure(exp.id)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exposureName}>{exp.name}</Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                    Limit: {exp.limit} {exp.unit}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(exp.status) + '20' }]}>
                  <Text style={[styles.statusValue, { color: getStatusColor(exp.status) }]}>
                    {exp.current} {exp.unit}
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBar}>
                <View
                  style={{
                    height: '100%',
                    width: `${(exp.current / exp.limit) * 100}%`,
                    backgroundColor: getStatusColor(exp.status),
                    borderRadius: borderRadius.full,
                  }}
                />
              </View>

              <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 8, textAlign: 'right' }}>
                {Math.round((exp.current / exp.limit) * 100)}% of limit
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {selectedExposure && (
        <ExposureDetailModal
          exposureId={selectedExposure}
          exposures={exposureTypes}
          onClose={() => setSelectedExposure(null)}
        />
      )}
    </View>
  );
}

// ─── Exposure Detail Modal ──────────────────────────────────────
function ExposureDetailModal({
  exposureId,
  exposures,
  onClose,
}: {
  exposureId: string;
  exposures: any[];
  onClose: () => void;
}) {
  const exp = exposures.find(e => e.id === exposureId);
  if (!exp) return null;

  return (
    <Modal visible={true} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{exp.name}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: spacing.lg }}>
            {/* Current Status */}
            <View style={[styles.section, styles.cardShadow]}>
              <Text style={styles.sectionTitle}>Current Status</Text>
              <View style={{ flexDirection: 'row', gap: spacing.lg }}>
                <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg, borderRadius: borderRadius.lg }}>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>Current Level</Text>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary }}>
                    {exp.current} {exp.unit}
                  </Text>
                </View>
                <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg, borderRadius: borderRadius.lg }}>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>Limit</Text>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
                    {exp.limit} {exp.unit}
                  </Text>
                </View>
                <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg, borderRadius: borderRadius.lg }}>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>Safety Margin</Text>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: '#22C55E' }}>
                    {Math.round(((exp.limit - exp.current) / exp.limit) * 100)}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Trend Chart */}
            <View style={[styles.section, styles.cardShadow]}>
              <Text style={styles.sectionTitle}>6-Month Trend</Text>
              <LineChart
                data={{
                  labels: ['M-5', 'M-4', 'M-3', 'M-2', 'M-1', 'Now'],
                  datasets: [
                    {
                      data: exp.trend,
                      color: () => colors.primary,
                      strokeWidth: 2,
                    },
                    {
                      data: Array(6).fill(exp.limit),
                      color: () => '#EF4444',
                      strokeWidth: 2,
                      strokeDasharray: [5, 5],
                    },
                  ],
                }}
                width={width - 60}
                height={220}
                chartConfig={{
                  backgroundColor: colors.background,
                  backgroundGradientFrom: colors.background,
                  backgroundGradientTo: colors.background,
                  decimalPlaces: 2,
                  color: () => colors.textSecondary,
                  labelColor: () => colors.textSecondary,
                  style: { borderRadius: borderRadius.lg },
                }}
                bezier
                style={{ marginVertical: spacing.md }}
              />
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: spacing.md }}>
                Blue line: Current levels | Red line: Exposure limit
              </Text>
            </View>

            {/* Recommendations */}
            <View style={[styles.section, styles.cardShadow]}>
              <Text style={styles.sectionTitle}>Controls in Place</Text>
              {[
                'Continuous monitoring system installed',
                'Automated alert system at 75% of limit',
                'Weekly calibration of sensors',
                'Real-time data logging to backend',
                'Monthly trend analysis & reporting',
              ].map((control, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
                  <Text style={{ fontSize: 12, color: colors.text, marginLeft: spacing.md }}>{control}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={[styles.actionBtn, styles.cardShadow]}>
              <Ionicons name="download" size={20} color="#FFF" />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFF' }}>Download Detailed Report</Text>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Regulatory Reports Screen ──────────────────────────────────
export function RegulatoryReportsScreen() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const reports = [
    {
      id: 'cnss-monthly',
      name: 'CNSS Monthly Report',
      description: 'Monthly occupational health & safety report',
      format: 'PDF/Excel',
      status: 'ready',
      dueDate: '2026-03-05',
    },
    {
      id: 'drc-annual',
      name: '  DRC Annual Report',
      description: 'Annual compliance report to DRC authorities',
      format: 'PDF',
      status: 'pending',
      dueDate: '2026-12-31',
    },
    {
      id: 'iso-audit',
      name: 'ISO 45001 Audit Report',
      description: 'Internal audit checklist & findings',
      format: 'PDF',
      status: 'draft',
      dueDate: '2026-03-15',
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Regulatory Reports</Text>
          <Text style={styles.subtitle}>CNSS, DRC & ISO 45001 compliance reporting</Text>
        </View>

        <View style={{ paddingHorizontal: spacing.md, paddingBottom: 40 }}>
          {reports.map(report => (
            <TouchableOpacity
              key={report.id}
              style={[styles.reportCard, styles.cardShadow]}
              onPress={() => setSelectedReport(report.id)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reportName}>{report.name}</Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                    {report.description}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        report.status === 'ready'
                          ? '#22C55E' + '20'
                          : report.status === 'pending'
                            ? '#F59E0B' + '20'
                            : colors.outlineVariant,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '600',
                      color:
                        report.status === 'ready'
                          ? '#22C55E'
                          : report.status === 'pending'
                            ? '#F59E0B'
                            : colors.textSecondary,
                    }}
                  >
                    {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: spacing.lg }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: colors.textSecondary }}>Format</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginTop: 2 }}>
                    {report.format}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: colors.textSecondary }}>Due Date</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginTop: 2 }}>
                    {report.dueDate}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {selectedReport && (
        <ReportDetailModal reportId={selectedReport} reports={reports} onClose={() => setSelectedReport(null)} />
      )}
    </View>
  );
}

// ─── Report Detail Modal ────────────────────────────────────────
function ReportDetailModal({
  reportId,
  reports,
  onClose,
}: {
  reportId: string;
  reports: any[];
  onClose: () => void;
}) {
  const report = reports.find(r => r.id === reportId);
  if (!report) return null;

  return (
    <Modal visible={true} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{report.name}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: spacing.lg }}>
            {/* Report Details */}
            <View style={[styles.section, styles.cardShadow]}>
              <Text style={styles.sectionTitle}>Report Information</Text>
              <View style={{ gap: spacing.md }}>
                <View>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>Name</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 4 }}>
                    {report.name}
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>Status</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 4 }}>
                    {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>Due Date</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 4 }}>
                    {report.dueDate}
                  </Text>
                </View>
              </View>
            </View>

            {/* Contents */}
            <View style={[styles.section, styles.cardShadow]}>
              <Text style={styles.sectionTitle}>Report Contents</Text>
              {[
                'Executive Summary',
                'Key Performance Indicators',
                'Incident Statistics',
                'Medical Surveillance Results',
                'Compliance Findings',
                'Recommendations',
              ].map((item, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Ionicons name="document-text" size={16} color={colors.primary} />
                  <Text style={{ fontSize: 12, color: colors.text, marginLeft: spacing.md }}>{item}</Text>
                </View>
              ))}
            </View>

            {/* Action Buttons */}
            <View style={{ gap: spacing.md }}>
              <TouchableOpacity style={[styles.actionBtn, styles.cardShadow]}>
                <Ionicons name="download" size={20} color="#FFF" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFF' }}>Download Report</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.secondary }, styles.cardShadow]}>
                <Ionicons name="mail" size={20} color="#FFF" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFF' }}>Send to Authorities</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: colors.textSecondary },

  section: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.md },

  exposureCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  exposureName: { fontSize: 13, fontWeight: '700', color: colors.text },
  statusBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  statusValue: { fontSize: 12, fontWeight: '700' },
  progressBar: { height: 8, backgroundColor: colors.outlineVariant, borderRadius: borderRadius.full, overflow: 'hidden' },

  reportCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  reportName: { fontSize: 13, fontWeight: '700', color: colors.text },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, paddingTop: spacing.lg, maxHeight: '95%' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.md,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },

  cardShadow: shadows.sm,
});
