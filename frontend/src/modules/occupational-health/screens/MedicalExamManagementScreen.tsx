import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator,
  StyleSheet, Dimensions, Modal, Alert, Platform, FlatList, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import DateInput from '../../../components/DateInput';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const ACCENT = colors.primary;

// ─── Types ──────────────────────────────────────────────────────
interface ExamSchedule {
  id: string;
  workerId: string;
  workerName: string;
  examType: 'pre_employment' | 'periodic' | 'return_to_work' | 'exit' | 'follow_up';
  scheduledDate: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
  examiner: string;
  location: string;
  sector: string;
  notes?: string;
  completedDate?: string;
}

interface MedicalExamResult {
  id: string;
  scheduleId: string;
  workerId: string;
  workerName: string;
  examType: 'pre_employment' | 'periodic' | 'return_to_work' | 'exit' | 'follow_up';
  examDate: string;
  fitnessStatus: 'fit' | 'fit_with_restrictions' | 'unfit' | 'unfit_pending_review';
  restrictions?: string[];
  clinicalFindings: string[];
  testResults: {
    spirometry?: { fev1: number; fvc: number; fev1_fvc: number; interpretation: string; };
    audiometry?: { left_ear: number; right_ear: number; hearing_loss: string; };
    vision?: { left: string; right: string; };
    bloodPressure?: { systolic: number; diastolic: number; };
    bloodTest?: { hemoglobin: string; glucose: string; [key: string]: any; };
  };
  recommendations: string[];
  followUpRequired: boolean;
  followUpDate?: string;
  certificationId?: string;
  examiner: string;
}

// Sample Data
const SAMPLE_SCHEDULES: ExamSchedule[] = [
  {
    id: 's1', workerId: 'w001', workerName: 'Jean-Charles Mulinga', 
    examType: 'pre_employment', scheduledDate: '2025-02-01', 
    status: 'scheduled', examiner: 'Dr. Habimana', location: 'KCC Health Center',
    sector: 'Mining Operations'
  },
  {
    id: 's2', workerId: 'w002', workerName: 'Marie Lusaka',
    examType: 'periodic', scheduledDate: '2025-02-03',
    status: 'scheduled', examiner: 'Dr. Habimana', location: 'KCC Health Center',
    sector: 'Processing'
  },
  {
    id: 's3', workerId: 'w003', workerName: 'Pierre Kabamba',
    examType: 'return_to_work', scheduledDate: '2025-02-02',
    status: 'completed', examiner: 'Dr. Nkulu', location: 'KCC Health Center',
    sector: 'Maintenance', completedDate: '2025-02-02'
  },
];

const SAMPLE_RESULTS: MedicalExamResult[] = [
  {
    id: 'r1', scheduleId: 's3', workerId: 'w003', workerName: 'Pierre Kabamba',
    examType: 'return_to_work', examDate: '2025-02-02',
    fitnessStatus: 'fit_with_restrictions',
    restrictions: ['No heights work for 4 weeks', 'Avoid confined spaces'],
    clinicalFindings: ['Mild ankle sprain', 'Good overall health'],
    testResults: {
      spirometry: { fev1: 92, fvc: 95, fev1_fvc: 97, interpretation: 'Normal' },
      audiometry: { left_ear: 15, right_ear: 18, hearing_loss: 'None' },
      vision: { left: '20/20', right: '20/20' },
      bloodPressure: { systolic: 120, diastolic: 80 },
    },
    recommendations: ['Return with restrictions', 'Review in 4 weeks'],
    followUpRequired: true,
    followUpDate: '2025-03-02',
    certificationId: 'CERT-2025-003',
    examiner: 'Dr. Nkulu',
  },
];

// ─── Status Badge Component ──────────────────────────────────
function StatusBadge({ status, type }: { status: string; type?: 'schedule' | 'fitness' }) {
  const scheduleConfig: Record<string, { color: string; icon: string; label: string }> = {
    scheduled: { color: '#3B82F6', icon: 'calendar-outline', label: 'Scheduled' },
    completed: { color: '#22C55E', icon: 'checkmark-circle', label: 'Completed' },
    cancelled: { color: '#EF4444', icon: 'close-circle', label: 'Cancelled' },
    no_show: { color: '#F59E0B', icon: 'alert-circle', label: 'No Show' },
    rescheduled: { color: '#8B5CF6', icon: 'refresh', label: 'Rescheduled' },
  };

  const fitnessConfig: Record<string, { color: string; icon: string; label: string }> = {
    fit: { color: '#22C55E', icon: 'checkmark-circle', label: 'Fit' },
    fit_with_restrictions: { color: '#F59E0B', icon: 'alert-circle', label: 'Fit w/ Restrictions' },
    unfit: { color: '#EF4444', icon: 'close-circle', label: 'Unfit' },
    unfit_pending_review: { color: '#DC2626', icon: 'alert', label: 'Unfit - Review Pending' },
  };

  const config = type === 'fitness' ? fitnessConfig[status] : scheduleConfig[status];
  if (!config) return null;

  return (
    <View style={[styles.badge, { backgroundColor: config.color + '20' }]}>
      <Ionicons name={config.icon as any} size={14} color={config.color} />
      <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

// ─── Exam Type Card ───────────────────────────────────────────
function ExamTypeCard({
  type,
  label,
  description,
  icon,
  scheduleCount,
  completedCount,
  onPress,
}: {
  type: string;
  label: string;
  description: string;
  icon: string;
  scheduleCount: number;
  completedCount: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.typeCard, styles.cardShadow]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.typeCardIcon, { backgroundColor: ACCENT + '20' }]}>
        <Ionicons name={icon as any} size={28} color={ACCENT} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.typeCardLabel}>{label}</Text>
        <Text style={styles.typeCardDesc} numberOfLines={2}>{description}</Text>
      </View>
      <View style={styles.typeCardStats}>
        <View style={styles.statBadge}>
          <Text style={styles.statNumber}>{scheduleCount}</Text>
          <Text style={styles.statLabel}>Scheduled</Text>
        </View>
        <View style={[styles.statBadge, { borderLeftWidth: 1, borderLeftColor: colors.border }]}>
          <Text style={styles.statNumber}>{completedCount}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Schedule Card ───────────────────────────────────────────
function ScheduleCard({
  schedule,
  onPress,
}: {
  schedule: ExamSchedule;
  onPress: () => void;
}) {
  const examTypeLabel: Record<string, string> = {
    pre_employment: 'Pre-Employment',
    periodic: 'Periodic',
    return_to_work: 'Return to Work',
    exit: 'Exit',
    follow_up: 'Follow-up',
  };

  const days = Math.ceil((new Date(schedule.scheduledDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const isDue = days <= 0;
  const isUpcoming = days > 0 && days <= 7;

  return (
    <TouchableOpacity style={[styles.scheduleCard, styles.cardShadow]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.scheduleCardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.scheduleWorker}>{schedule.workerName}</Text>
          <Text style={styles.scheduleType}>{examTypeLabel[schedule.examType]}</Text>
        </View>
        <StatusBadge status={schedule.status} type="schedule" />
      </View>

      <View style={styles.scheduleDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.detailText}>{schedule.scheduledDate}</Text>
          {isDue && <View style={styles.dueBadge}><Text style={styles.dueBadgeText}>DUE</Text></View>}
          {isUpcoming && <View style={styles.upcomingBadge}><Text style={styles.upcomingBadgeText}>Soon</Text></View>}
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.detailText}>{schedule.examiner}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.detailText}>{schedule.location}</Text>
        </View>
      </View>

      <View style={styles.scheduleFooter}>
        <TouchableOpacity style={styles.scheduleAction}>
          <Ionicons name="create-outline" size={16} color={ACCENT} />
          <Text style={[styles.actionText, { color: ACCENT }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.scheduleAction}>
          <Ionicons name="mail-outline" size={16} color={ACCENT} />
          <Text style={[styles.actionText, { color: ACCENT }]}>Notify</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Exam Result Card ────────────────────────────────────────
function ExamResultCard({
  result,
  onPress,
}: {
  result: MedicalExamResult;
  onPress: () => void;
}) {
  const examTypeLabel: Record<string, string> = {
    pre_employment: 'Pre-Employment',
    periodic: 'Periodic',
    return_to_work: 'Return to Work',
    exit: 'Exit',
    follow_up: 'Follow-up',
  };

  return (
    <TouchableOpacity style={[styles.resultCard, styles.cardShadow]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.resultCardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.resultWorker}>{result.workerName}</Text>
          <Text style={styles.resultType}>{examTypeLabel[result.examType]} • {result.examDate}</Text>
        </View>
        <StatusBadge status={result.fitnessStatus} type="fitness" />
      </View>

      {result.restrictions && result.restrictions.length > 0 && (
        <View style={styles.restrictionsBox}>
          <Ionicons name="warning" size={16} color="#F59E0B" />
          <Text style={styles.restrictionsText}>
            {result.restrictions[0]}
            {result.restrictions.length > 1 && ` +${result.restrictions.length - 1} more`}
          </Text>
        </View>
      )}

      <View style={styles.testResultsSummary}>
        {result.testResults.spirometry && (
          <View style={styles.testResult}>
            <Text style={styles.testLabel}>Spirometry</Text>
            <Text style={styles.testValue}>{result.testResults.spirometry.interpretation}</Text>
          </View>
        )}
        {result.testResults.audiometry && (
          <View style={styles.testResult}>
            <Text style={styles.testLabel}>Audiometry</Text>
            <Text style={styles.testValue}>{result.testResults.audiometry.hearing_loss}</Text>
          </View>
        )}
        {result.testResults.vision && (
          <View style={styles.testResult}>
            <Text style={styles.testLabel}>Vision</Text>
            <Text style={styles.testValue}>{result.testResults.vision.left}</Text>
          </View>
        )}
      </View>

      <View style={styles.resultFooter}>
        <TouchableOpacity style={styles.resultAction}>
          <Ionicons name="eye-outline" size={16} color={ACCENT} />
          <Text style={[styles.actionText, { color: ACCENT }]}>View Details</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resultAction}>
          <Ionicons name="document-outline" size={16} color={ACCENT} />
          <Text style={[styles.actionText, { color: ACCENT }]}>Certificate</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Schedule Modal ──────────────────────────────────────────
function ScheduleModal({
  visible,
  schedule,
  onClose,
  onSave,
}: {
  visible: boolean;
  schedule: ExamSchedule | null;
  onClose: () => void;
  onSave: (data: ExamSchedule) => void;
}) {
  const [formData, setFormData] = useState<ExamSchedule | null>(schedule);

  useEffect(() => {
    setFormData(schedule);
  }, [schedule, visible]);

  if (!formData) return null;

  const handleSave = () => {
    if (!formData.scheduledDate || !formData.examiner) {
      Alert.alert('Validation', 'Please fill all required fields');
      return;
    }
    onSave(formData);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Schedule Medical Exam</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Worker Info */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Worker Information</Text>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{formData.workerName}</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Sector</Text>
                <Text style={styles.infoValue}>{formData.sector}</Text>
              </View>
            </View>

            {/* Exam Details */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Exam Details</Text>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Examination Type</Text>
                <View style={styles.selectBox}>
                  <Text style={styles.selectText}>
                    {formData.examType === 'pre_employment' ? 'Pre-Employment' :
                     formData.examType === 'periodic' ? 'Periodic' :
                     formData.examType === 'return_to_work' ? 'Return to Work' :
                     formData.examType === 'exit' ? 'Exit' : 'Follow-up'}
                  </Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Scheduled Date *</Text>
                <DateInput
                  value={formData.scheduledDate}
                  onChange={(date) => setFormData({ ...formData, scheduledDate: date })}
                  minimumDate={new Date()}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Examiner *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.examiner}
                  onChangeText={(text) => setFormData({ ...formData, examiner: text })}
                  placeholder="Enter examiner name"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Location</Text>
                <TextInput
                  style={styles.input}
                  value={formData.location}
                  onChangeText={(text) => setFormData({ ...formData, location: text })}
                  placeholder="Examination location"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.notes || ''}
                  onChangeText={(text) => setFormData({ ...formData, notes: text })}
                  placeholder="Additional notes..."
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Ionicons name="checkmark" size={18} color="#FFF" />
              <Text style={styles.saveBtnText}>Save Schedule</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Result Detail Modal ────────────────────────────────────
function ResultDetailModal({
  visible,
  result,
  onClose,
}: {
  visible: boolean;
  result: MedicalExamResult | null;
  onClose: () => void;
}) {
  if (!result) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Exam Results</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.resultDetailHeader}>
              <View>
                <Text style={styles.resultName}>{result.workerName}</Text>
                <Text style={styles.resultDate}>{result.examDate}</Text>
              </View>
              <StatusBadge status={result.fitnessStatus} type="fitness" />
            </View>

            {/* Restrictions */}
            {result.restrictions && result.restrictions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Work Restrictions</Text>
                <View style={styles.restrictionsList}>
                  {result.restrictions.map((restriction, idx) => (
                    <View key={idx} style={styles.restrictionItem}>
                      <Ionicons name="alert-circle" size={16} color="#F59E0B" />
                      <Text style={styles.restrictionText}>{restriction}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Test Results */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Test Results</Text>

              {result.testResults.spirometry && (
                <View style={styles.testResultBox}>
                  <View style={styles.testHeader}>
                    <Ionicons name="arrow-forward" size={18} color={ACCENT} />
                    <Text style={styles.testTitle}>Spirometry</Text>
                  </View>
                  <View style={styles.testParams}>
                    <View style={styles.param}>
                      <Text style={styles.paramLabel}>FEV1</Text>
                      <Text style={styles.paramValue}>{result.testResults.spirometry.fev1}%</Text>
                    </View>
                    <View style={styles.param}>
                      <Text style={styles.paramLabel}>FVC</Text>
                      <Text style={styles.paramValue}>{result.testResults.spirometry.fvc}%</Text>
                    </View>
                    <View style={styles.param}>
                      <Text style={styles.paramLabel}>FEV1/FVC</Text>
                      <Text style={styles.paramValue}>{result.testResults.spirometry.fev1_fvc}%</Text>
                    </View>
                  </View>
                  <Text style={styles.testInterpretation}>
                    {result.testResults.spirometry.interpretation}
                  </Text>
                </View>
              )}

              {result.testResults.audiometry && (
                <View style={styles.testResultBox}>
                  <View style={styles.testHeader}>
                    <Ionicons name="volume-high" size={18} color={ACCENT} />
                    <Text style={styles.testTitle}>Audiometry</Text>
                  </View>
                  <View style={styles.testParams}>
                    <View style={styles.param}>
                      <Text style={styles.paramLabel}>Left Ear</Text>
                      <Text style={styles.paramValue}>{result.testResults.audiometry.left_ear} dB</Text>
                    </View>
                    <View style={styles.param}>
                      <Text style={styles.paramLabel}>Right Ear</Text>
                      <Text style={styles.paramValue}>{result.testResults.audiometry.right_ear} dB</Text>
                    </View>
                  </View>
                  <Text style={styles.testInterpretation}>
                    {result.testResults.audiometry.hearing_loss}
                  </Text>
                </View>
              )}

              {result.testResults.vision && (
                <View style={styles.testResultBox}>
                  <View style={styles.testHeader}>
                    <Ionicons name="eye" size={18} color={ACCENT} />
                    <Text style={styles.testTitle}>Vision</Text>
                  </View>
                  <View style={styles.testParams}>
                    <View style={styles.param}>
                      <Text style={styles.paramLabel}>Left Eye</Text>
                      <Text style={styles.paramValue}>{result.testResults.vision.left}</Text>
                    </View>
                    <View style={styles.param}>
                      <Text style={styles.paramLabel}>Right Eye</Text>
                      <Text style={styles.paramValue}>{result.testResults.vision.right}</Text>
                    </View>
                  </View>
                </View>
              )}

              {result.testResults.bloodPressure && (
                <View style={styles.testResultBox}>
                  <View style={styles.testHeader}>
                    <Ionicons name="heart" size={18} color={ACCENT} />
                    <Text style={styles.testTitle}>Blood Pressure</Text>
                  </View>
                  <View style={styles.testParams}>
                    <View style={styles.param}>
                      <Text style={styles.paramLabel}>Systolic</Text>
                      <Text style={styles.paramValue}>{result.testResults.bloodPressure.systolic} mmHg</Text>
                    </View>
                    <View style={styles.param}>
                      <Text style={styles.paramLabel}>Diastolic</Text>
                      <Text style={styles.paramValue}>{result.testResults.bloodPressure.diastolic} mmHg</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Recommendations */}
            {result.recommendations && result.recommendations.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Recommendations</Text>
                <View style={styles.recommendationsList}>
                  {result.recommendations.map((rec, idx) => (
                    <View key={idx} style={styles.recommendationItem}>
                      <View style={styles.recommendationDot} />
                      <Text style={styles.recommendationText}>{rec}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Follow-up */}
            {result.followUpRequired && (
              <View style={[styles.section, { backgroundColor: '#FEF3C7', borderRadius: borderRadius.md, padding: spacing.md }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                  <Ionicons name="alert" size={18} color="#F59E0B" />
                  <Text style={styles.sectionLabel} numberOfLines={1}>Follow-up Required</Text>
                </View>
                <Text style={styles.followUpText}>Scheduled: {result.followUpDate}</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={[styles.actionBtn, { flex: 1 }]}>
              <Ionicons name="document-outline" size={18} color={ACCENT} />
              <Text style={[styles.btnText, { color: ACCENT }]}>Generate Report</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { flex: 1, backgroundColor: ACCENT }]}>
              <Ionicons name="download-outline" size={18} color="#FFF" />
              <Text style={[styles.btnText, { color: '#FFF' }]}>Export PDF</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────
export function MedicalExamManagementScreen() {
  const [activeTab, setActiveTab] = useState<'schedule' | 'results'>('schedule');
  const [selectedSchedule, setSelectedSchedule] = useState<ExamSchedule | null>(null);
  const [selectedResult, setSelectedResult] = useState<MedicalExamResult | null>(null);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const examStats = useMemo(() => ({
    scheduled: SAMPLE_SCHEDULES.filter(s => s.status === 'scheduled').length,
    completed: SAMPLE_SCHEDULES.filter(s => s.status === 'completed').length,
    results: SAMPLE_RESULTS.length,
  }), []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const handleSaveSchedule = (data: ExamSchedule) => {
    Alert.alert('Success', 'Schedule saved successfully');
    setScheduleModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Medical Exams</Text>
        <Text style={styles.headerSubtitle}>Schedule and manage occupational health examinations</Text>
      </View>

      {/* Stats Row */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.statsRow}
        scrollEventThrottle={16}
      >
        <View style={[styles.statCard, styles.cardShadow]}>
          <Ionicons name="calendar" size={24} color={ACCENT} />
          <Text style={styles.statValue}>{examStats.scheduled}</Text>
          <Text style={styles.statLabel}>Scheduled</Text>
        </View>
        <View style={[styles.statCard, styles.cardShadow]}>
          <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
          <Text style={[styles.statValue, { color: '#22C55E' }]}>{examStats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={[styles.statCard, styles.cardShadow]}>
          <Ionicons name="document" size={24} color="#8B5CF6" />
          <Text style={[styles.statValue, { color: '#8B5CF6' }]}>{examStats.results}</Text>
          <Text style={styles.statLabel}>Results</Text>
        </View>
      </ScrollView>

      {/* Exam Type Cards */}
      <View style={styles.typeCardsSection}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
        >
          <ExamTypeCard
            type="pre_employment"
            label="Pre-Employment"
            description="Initial fitness assessment before hire"
            icon="person-add"
            scheduleCount={2}
            completedCount={5}
            onPress={() => setActiveTab('schedule')}
          />
          <ExamTypeCard
            type="periodic"
            label="Periodic"
            description="Regular health monitoring"
            icon="calendar-repeat"
            scheduleCount={8}
            completedCount={24}
            onPress={() => setActiveTab('schedule')}
          />
          <ExamTypeCard
            type="return_to_work"
            label="Return to Work"
            description="Post-absence fitness confirmation"
            icon="arrow-redo"
            scheduleCount={3}
            completedCount={12}
            onPress={() => setActiveTab('schedule')}
          />
          <ExamTypeCard
            type="exit"
            label="Exit"
            description="Final assessment on departure"
            icon="exit-outline"
            scheduleCount={1}
            completedCount={8}
            onPress={() => setActiveTab('schedule')}
          />
        </ScrollView>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'schedule' && styles.tabActive]}
          onPress={() => setActiveTab('schedule')}
        >
          <Ionicons name="calendar" size={18} color={activeTab === 'schedule' ? ACCENT : colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'schedule' && { color: ACCENT }]}>
            Schedules ({examStats.scheduled})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'results' && styles.tabActive]}
          onPress={() => setActiveTab('results')}
        >
          <Ionicons name="checkmark-done" size={18} color={activeTab === 'results' ? ACCENT : colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'results' && { color: ACCENT }]}>
            Results ({examStats.results})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <FlatList
        data={activeTab === 'schedule' ? SAMPLE_SCHEDULES : SAMPLE_RESULTS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) =>
          activeTab === 'schedule' ? (
            <ScheduleCard
              schedule={item as ExamSchedule}
              onPress={() => {
                setSelectedSchedule(item as ExamSchedule);
                setScheduleModalVisible(true);
              }}
            />
          ) : (
            <ExamResultCard
              result={item as MedicalExamResult}
              onPress={() => {
                setSelectedResult(item as MedicalExamResult);
                setResultModalVisible(true);
              }}
            />
          )
        }
        contentContainerStyle={styles.listContent}
        scrollEnabled={true}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="information-circle-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>No {activeTab === 'schedule' ? 'schedules' : 'results'} found</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, styles.cardShadow]}
        onPress={() => {
          const newSchedule: ExamSchedule = {
            id: `s${Date.now()}`,
            workerId: '',
            workerName: '',
            examType: 'periodic',
            scheduledDate: new Date().toISOString().split('T')[0],
            status: 'scheduled',
            examiner: '',
            location: 'KCC Health Center',
            sector: '',
          };
          setSelectedSchedule(newSchedule);
          setScheduleModalVisible(true);
        }}
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Modals */}
      <ScheduleModal
        visible={scheduleModalVisible}
        schedule={selectedSchedule}
        onClose={() => setScheduleModalVisible(false)}
        onSave={handleSaveSchedule}
      />
      <ResultDetailModal
        visible={resultModalVisible}
        result={selectedResult}
        onClose={() => setResultModalVisible(false)}
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
    flexGrow: 0,
  },
  statCard: {
    width: 100,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
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
    fontSize: 11,
    fontWeight: '600',
  },
  typeCardsSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  typeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginRight: spacing.md,
    width: 280,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  typeCardIcon: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeCardLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  typeCardDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  typeCardStats: {
    position: 'absolute',
    right: spacing.md,
    flexDirection: 'row',
    gap: 0,
  },
  statBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  scheduleCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  scheduleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  scheduleWorker: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  scheduleType: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scheduleDetails: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  dueBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dueBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  upcomingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  upcomingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
  },
  scheduleFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  scheduleAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  resultCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  resultWorker: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  resultType: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  restrictionsBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  restrictionsText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
  },
  testResultsSummary: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  testResult: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  testLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  testValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  resultFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  resultAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
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
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardShadow: {
    ...shadows.md,
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
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  infoBox: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    marginTop: 2,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  selectBox: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  selectText: {
    fontSize: 14,
    color: colors.text,
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
    minHeight: 44,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
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
  saveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  // Result Detail Modal
  resultDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  resultDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  restrictionsList: {
    gap: spacing.md,
  },
  restrictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  restrictionText: {
    fontSize: 13,
    color: '#92400E',
    flex: 1,
  },
  testResultBox: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  testTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  testParams: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  param: {
    flex: 1,
    alignItems: 'center',
  },
  paramLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  paramValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 4,
  },
  testInterpretation: {
    fontSize: 12,
    color: colors.text,
    fontStyle: 'italic',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  recommendationsList: {
    gap: spacing.md,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  recommendationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 7,
  },
  recommendationText: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  followUpText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
  },
  actionBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
