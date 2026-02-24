import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  Dimensions, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';

const { width } = Dimensions.get('window');

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface TestResult {
  id: string;
  date: string;
  value: number;
  unit: string;
  normalRange: string;
  status: 'normal' | 'abnormal' | 'critical';
}

// â”€â”€â”€ Medical Tests Visualization Screens â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function MedicalTestVisualizationScreen() {
  const [selectedTest, setSelectedTest] = useState<string | null>(null);

  const tests = [
    { id: 'spirometry', name: 'Spirometry', icon: 'air', color: '#3B82F6' },
    { id: 'audiometry', name: 'Audiometry', icon: 'volume-high', color: '#8B5CF6' },
    { id: 'xray', name: 'X-ray (Chest)', icon: 'image', color: '#EC4899' },
    { id: 'heavymetals', name: 'Heavy Metals', icon: 'flask', color: '#F59E0B' },
    { id: 'drugalcohol', name: 'Drug & Alcohol', icon: 'medical', color: '#EF4444' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Medical Tests Visualization</Text>
          <Text style={styles.subtitle}>Track test results over time</Text>
        </View>

        <View style={{ paddingHorizontal: spacing.md, paddingBottom: 40 }}>
          {tests.map(test => (
            <TouchableOpacity
              key={test.id}
              style={[styles.testCard, styles.cardShadow]}
              onPress={() => setSelectedTest(test.id)}
            >
              <View style={[styles.testIcon, { backgroundColor: test.color + '20' }]}>
                <Ionicons name={test.icon as any} size={28} color={test.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.testName}>{test.name}</Text>
                <Text style={styles.testDesc}>View trends & results</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {selectedTest && (
        <TestDetailModal
          testId={selectedTest}
          onClose={() => setSelectedTest(null)}
        />
      )}
    </View>
  );
}

// â”€â”€â”€ Test Detail Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TestDetailModal({
  testId,
  onClose,
}: {
  testId: string;
  onClose: () => void;
}) {
  const testConfigs: Record<string, any> = {
    spirometry: {
      name: 'Spirometry - Respiratory Function',
      description: 'Measures lung capacity & air flow',
      parameters: [
        { label: 'FEV1', value: 3.8, normal: '3.5-5.0', unit: 'L', status: 'normal' },
        { label: 'FVC', value: 4.2, normal: '3.7-5.5', unit: 'L', status: 'normal' },
        { label: 'FEV1/FVC Ratio', value: 0.90, normal: '>0.70', unit: '%', status: 'normal' },
      ],
      trend: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        data: [3.6, 3.7, 3.8, 3.8, 3.9, 3.8],
      },
      recommendations: [
        'Respiratory health maintained',
        'No significant decline detected',
        'Continue regular monitoring',
      ],
    },
    audiometry: {
      name: 'Audiometry - Hearing Assessment',
      description: 'Measures hearing sensitivity at various frequencies',
      parameters: [
        { label: 'Right Ear', value: 15, normal: '<20', unit: 'dB', status: 'normal' },
        { label: 'Left Ear', value: 18, normal: '<20', unit: 'dB', status: 'normal' },
        { label: 'High Frequency Loss', value: 25, normal: '<30', unit: 'dB', status: 'abnormal' },
      ],
      trend: {
        labels: ['2024-Q1', '2024-Q2', '2024-Q3', '2024-Q4', '2025-Q1', '2026-Q1'],
        data: [10, 12, 15, 16, 17, 18],
      },
      recommendations: [
        'Early high-frequency hearing loss detected',
        'Recommend enhanced hearing protection',
        'Annual monitoring suggested',
      ],
    },
    xray: {
      name: 'X-ray - Chest Imaging (ILO Classification)',
      description: 'Classified by ILO 2000 standards for pneumoconiosis',
      parameters: [
        { label: 'Profusion', value: '0/0', normal: '0/0', status: 'normal' },
        { label: 'Opacities', value: 'None', normal: 'None/Small', status: 'normal' },
        { label: 'Pleural Changes', value: 'None', normal: 'None', status: 'normal' },
      ],
      classification: 'Category 0/0 - Normal',
      findings: ['No pneumoconiosis detected', 'Clear lung fields', 'No pleural involvement'],
      recommendations: [
        'Lungs appear healthy',
        'No evidence of occupational lung disease',
        'Continue standard monitoring',
      ],
    },
    heavymetals: {
      name: 'Heavy Metals - Occupational Exposure Panel',
      description: 'Monitors 10 metal types for occupational exposure',
      parameters: [
        { label: 'Lead', value: 12, normal: '<25', unit: 'Âµg/dL', status: 'normal' },
        { label: 'Cadmium', value: 1.2, normal: '<5', unit: 'Âµg/L', status: 'normal' },
        { label: 'Cobalt', value: 2.8, normal: '<5', unit: 'Âµg/L', status: 'normal' },
        { label: 'Manganese', value: 8.5, normal: '<15', unit: 'Âµg/L', status: 'normal' },
        { label: 'Nickel', value: 4.2, normal: '<10', unit: 'Âµg/L', status: 'normal' },
      ],
      trend: {
        labels: ['6mo ago', '5mo ago', '4mo ago', '3mo ago', '2mo ago', 'Now'],
        data: [10, 11, 12, 12, 12, 12],
      },
      recommendations: [
        'Lead levels within normal limits',
        'Maintain current exposure controls',
        'Quarterly monitoring recommended',
      ],
    },
    drugalcohol: {
      name: 'Drug & Alcohol Screening',
      description: 'MRO-reviewed substance screening results',
      parameters: [
        { label: 'Amphetamines', value: 'Negative', normal: 'Negative', status: 'normal' },
        { label: 'Cocaine', value: 'Negative', normal: 'Negative', status: 'normal' },
        { label: 'Opioids', value: 'Negative', normal: 'Negative', status: 'normal' },
        { label: 'THC', value: 'Negative', normal: 'Negative', status: 'normal' },
        { label: 'Alcohol (Breathalyzer)', value: '0.00%', normal: '<0.02%', status: 'normal' },
      ],
      mroReview: {
        status: 'Approved',
        reviewer: 'Dr. Kapend Lubala, MRO',
        date: '2026-02-23',
      },
      recommendations: [
        'All screening tests negative',
        'Fit for duty clearance granted',
        'Annual follow-up screening',
      ],
    },
  };

  const config = testConfigs[testId];

  return (
    <Modal visible={true} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{config.name}</Text>
              <Text style={styles.modalSubtitle}>{config.description}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: spacing.lg }}>
            {/* Parameters */}
            <View style={[styles.section, styles.cardShadow]}>
              <Text style={styles.sectionTitle}>Current Values</Text>
              {config.parameters.map((param: any, idx: number) => (
                <View key={idx} style={styles.paramRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paramLabel}>{param.label}</Text>
                    <Text style={styles.paramRange}>Normal: {param.normal} {param.unit || ''}</Text>
                  </View>
                  <View style={[styles.paramValue, getStatusColor(param.status)]}>
                    <Text style={[styles.paramValueText, { color: getStatusTextColor(param.status) }]}>
                      {param.value} {param.unit || ''}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Trend Chart */}
            {config.trend && (
              <View style={[styles.section, styles.cardShadow]}>
                <Text style={styles.sectionTitle}>Trend Over Time</Text>
                <LineChart
                  data={{
                    labels: config.trend.labels,
                    datasets: [
                      {
                        data: config.trend.data,
                        color: () => colors.primary,
                        strokeWidth: 2,
                      },
                    ],
                  }}
                  width={width - 60}
                  height={220}
                  chartConfig={{
                    backgroundColor: colors.background,
                    backgroundGradientFrom: colors.background,
                    backgroundGradientTo: colors.background,
                    decimalPlaces: 1,
                    color: () => colors.textSecondary,
                    labelColor: () => colors.textSecondary,
                    style: { borderRadius: borderRadius.lg },
                    propsForDots: {
                      r: '5',
                      strokeWidth: '2',
                      stroke: colors.primary,
                    },
                  }}
                  bezier
                  style={{ marginVertical: spacing.md }}
                />
              </View>
            )}

            {/* ILO Classification (for X-ray) */}
            {config.classification && (
              <View style={[styles.section, styles.cardShadow]}>
                <Text style={styles.sectionTitle}>ILO 2000 Classification</Text>
                <View style={{ backgroundColor: '#22C55E' + '20', padding: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.md }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#22C55E' }}>
                    {config.classification}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing.md }}>
                  No pneumoconiosis detected. Lungs appear healthy.
                </Text>
              </View>
            )}

            {/* MRO Review (for Drug/Alcohol) */}
            {config.mroReview && (
              <View style={[styles.section, styles.cardShadow]}>
                <Text style={styles.sectionTitle}>Medical Review Officer (MRO) Review</Text>
                <View style={{ backgroundColor: colors.background, padding: spacing.lg, borderRadius: borderRadius.lg }}>
                  <View style={{ marginBottom: spacing.md }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>Status</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#22C55E', marginTop: 4 }}>
                      {config.mroReview.status}
                    </Text>
                  </View>
                  <View style={{ marginBottom: spacing.md }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>Reviewed By</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 4 }}>
                      {config.mroReview.reviewer}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>Date</Text>
                    <Text style={{ fontSize: 13, color: colors.text, marginTop: 4 }}>
                      {config.mroReview.date}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Findings */}
            {config.findings && (
              <View style={[styles.section, styles.cardShadow]}>
                <Text style={styles.sectionTitle}>Findings</Text>
                {config.findings.map((finding: string, idx: number) => (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginRight: 8, marginTop: 5 }} />
                    <Text style={{ flex: 1, fontSize: 13, color: colors.text }}>{finding}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Recommendations */}
            <View style={[styles.section, styles.cardShadow]}>
              <Text style={styles.sectionTitle}>Recommendations</Text>
              {config.recommendations.map((rec: string, idx: number) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E', marginRight: 8, marginTop: 5 }} />
                  <Text style={{ flex: 1, fontSize: 13, color: colors.text }}>{rec}</Text>
                </View>
              ))}
            </View>

            {/* Action Button */}
            <TouchableOpacity style={[styles.closeBtn, styles.cardShadow]}>
              <Ionicons name="download-outline" size={20} color="#FFF" />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFF' }}>Download Report</Text>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// â”€â”€â”€ Exit Exam Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function ExitExamScreen() {
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);

  const mockWorkers = [
    { id: '1', name: 'Kabamba Mutombo', department: 'Operations', reason: 'Resignation', lastExam: '2025-08-15' },
    { id: '2', name: 'Pongo Tshimanga', department: 'Maintenance', reason: 'Retirement', lastExam: '2025-11-20' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Exit Medical Examinations</Text>
          <Text style={styles.subtitle}>Final fitness assessments before departure</Text>
        </View>

        <View style={{ paddingHorizontal: spacing.md, paddingBottom: 40 }}>
          {mockWorkers.map(worker => (
            <TouchableOpacity
              key={worker.id}
              style={[styles.workerCard, styles.cardShadow]}
              onPress={() => setSelectedWorker(worker.id)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
                <View>
                  <Text style={styles.workerName}>{worker.name}</Text>
                  <Text style={styles.workerDept}>{worker.department}</Text>
                </View>
                <View style={{ backgroundColor: '#F59E0B' + '20', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#F59E0B' }}>Pending</Text>
                </View>
              </View>

              <View style={styles.reasonRow}>
                <Ionicons name="close-circle-outline" size={16} color={colors.textSecondary} />
                <Text style={{ flex: 1, fontSize: 12, color: colors.textSecondary }}>Exit Reason: {worker.reason}</Text>
              </View>

              <View style={styles.reasonRow}>
                <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                <Text style={{ flex: 1, fontSize: 12, color: colors.textSecondary }}>Last Exam: {worker.lastExam}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// â”€â”€â”€ Helper Functions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getStatusColor(status: string) {
  if (status === 'normal') return { backgroundColor: '#22C55E' + '20' };
  if (status === 'abnormal') return { backgroundColor: '#F59E0B' + '20' };
  return { backgroundColor: '#EF4444' + '20' };
}

function getStatusTextColor(status: string) {
  if (status === 'normal') return '#16A34A';
  if (status === 'abnormal') return '#D97706';
  return '#DC2626';
}

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: colors.textSecondary },

  testCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  testIcon: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  testName: { fontSize: 14, fontWeight: '700', color: colors.text },
  testDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, paddingTop: spacing.lg, maxHeight: '95%' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    paddingBottom: spacing.md,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  modalSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  section: { backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.md },

  paramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  paramLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  paramRange: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  paramValue: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.lg },
  paramValueText: { fontSize: 12, fontWeight: '700' },

  workerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  workerName: { fontSize: 14, fontWeight: '700', color: colors.text },
  workerDept: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },

  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },

  cardShadow: shadows.sm,
});
