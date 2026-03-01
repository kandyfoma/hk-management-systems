import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator,
  StyleSheet, Dimensions, Modal, Alert, Platform, FlatList, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import DateInput from '../../../components/DateInput';
import ApiService from '../../../services/ApiService';
import { useSimpleToast } from '../../../hooks/useSimpleToast';
import { SimpleToastNotification } from '../../../components/SimpleToastNotification';

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
  examinerId?: string;
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
const EXAM_TYPE_COLORS: Record<string, string> = {
  pre_employment: '#3B82F6',
  periodic: ACCENT,
  return_to_work: '#22C55E',
  exit: '#F59E0B',
  follow_up: '#8B5CF6',
};

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
  const typeColor = EXAM_TYPE_COLORS[type] || ACCENT;
  const totalCount = scheduleCount + completedCount;
  return (
    <TouchableOpacity
      style={[styles.typeCard, styles.cardShadow]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Top border accent */}
      <View style={[styles.typeCardTopBorder, { backgroundColor: typeColor }]} />
      
      {/* Content */}
      <View style={styles.typeCardContent}>
        {/* Header with Icon and Title */}
        <View style={styles.typeCardHeader}>
          <View style={[styles.typeCardIcon, { backgroundColor: typeColor + '18' }]}>
            <Ionicons name={icon as any} size={24} color={typeColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.typeCardLabel}>{label}</Text>
            <Text style={styles.typeCardDesc} numberOfLines={1}>{description}</Text>
          </View>
        </View>

        {/* Counters */}
        <View style={styles.typeCardFooter}>
          <View style={styles.typeCounterBox}>
            <Text style={[styles.typeCounterLabel]}>Scheduled</Text>
            <Text style={[styles.typeCounterValue, { color: typeColor }]}>{scheduleCount}</Text>
          </View>
          <View style={[styles.typeCounterBox, { borderLeftWidth: 1, borderLeftColor: colors.outline, paddingLeft: spacing.md }]}>
            <Text style={[styles.typeCounterLabel]}>Completed</Text>
            <Text style={[styles.typeCounterValue, { color: colors.success }]}>{completedCount}</Text>
          </View>
          <View style={[styles.typeCounterBox, { borderLeftWidth: 1, borderLeftColor: colors.outline, paddingLeft: spacing.md }]}>
            <Text style={[styles.typeCounterLabel]}>Total</Text>
            <Text style={[styles.typeCounterValue, { color: colors.primary }]}>{totalCount}</Text>
          </View>
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
  const typeColor = EXAM_TYPE_COLORS[schedule.examType] || ACCENT;

  return (
    <TouchableOpacity style={[styles.scheduleCard, styles.cardShadow, { borderLeftColor: typeColor }]} onPress={onPress} activeOpacity={0.7}>
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

  const fitnessColors: Record<string, string> = {
    fit: '#22C55E',
    fit_with_restrictions: '#F59E0B',
    unfit: '#EF4444',
    unfit_pending_review: '#DC2626',
  };
  const fitnessColor = fitnessColors[result.fitnessStatus] || colors.primary;

  return (
    <TouchableOpacity style={[styles.resultCard, styles.cardShadow, { borderLeftColor: fitnessColor }]} onPress={onPress} activeOpacity={0.7}>
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
  workers,
  users,
  onClose,
  onSave,
}: {
  visible: boolean;
  schedule: ExamSchedule | null;
  workers: any[];
  users: any[];
  onClose: () => void;
  onSave: (data: ExamSchedule) => void;
}) {
  const [formData, setFormData] = useState<ExamSchedule | null>(schedule);
  const [showWorkerPicker, setShowWorkerPicker] = useState(false);
  const [showExaminerPicker, setShowExaminerPicker] = useState(false);

  useEffect(() => {
    setFormData(schedule);
  }, [schedule, visible]);

  if (!formData) return null;

  const handleSave = () => {
    if (!formData.workerId || !formData.scheduledDate || !formData.examiner) {
      showToast('Please fill all required fields', 'error');
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
            {/* Worker Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Select Worker *</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowWorkerPicker(true)}
              >
                <Text style={[styles.dropdownButtonText, !formData.workerId && styles.dropdownPlaceholder]}>
                  {formData.workerName || 'Select a worker'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              {showWorkerPicker && (
                <Modal visible={showWorkerPicker} transparent animationType="fade">
                  <View style={styles.pickerOverlay}>
                    <View style={styles.pickerCard}>
                      <View style={styles.pickerHeader}>
                        <Text style={styles.pickerTitle}>Select Worker</Text>
                        <TouchableOpacity onPress={() => setShowWorkerPicker(false)}>
                          <Ionicons name="close" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                      <ScrollView style={styles.pickerList}>
                        {workers.map((worker) => (
                          <TouchableOpacity
                            key={worker.id}
                            style={styles.pickerOption}
                            onPress={() => {
                              setFormData({
                                ...formData,
                                workerId: String(worker.id),
                                workerName: `${worker.first_name} ${worker.last_name}`,
                              });
                              setShowWorkerPicker(false);
                            }}
                          >
                            <Text style={styles.pickerOptionText}>
                              {worker.first_name} {worker.last_name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                </Modal>
              )}
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
                  onChangeText={(date) => setFormData({ ...formData, scheduledDate: date })}
                  minimumDate={new Date()}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Examiner *</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setShowExaminerPicker(true)}
                >
                  <Text style={[styles.dropdownButtonText, !formData.examiner && styles.dropdownPlaceholder]}>
                    {formData.examiner || 'Select examiner'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                {showExaminerPicker && (
                  <Modal visible={showExaminerPicker} transparent animationType="fade">
                    <View style={styles.pickerOverlay}>
                      <View style={styles.pickerCard}>
                        <View style={styles.pickerHeader}>
                          <Text style={styles.pickerTitle}>Select Examiner</Text>
                          <TouchableOpacity onPress={() => setShowExaminerPicker(false)}>
                            <Ionicons name="close" size={20} color={colors.textSecondary} />
                          </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.pickerList}>
                          {users.map((user) => (
                            <TouchableOpacity
                              key={user.id}
                              style={styles.pickerOption}
                              onPress={() => {
                                setFormData({
                                  ...formData,
                                  examiner: `${user.first_name} ${user.last_name}`,
                                  examinerId: String(user.id),
                                });
                                setShowExaminerPicker(false);
                              }}
                            >
                              <Text style={styles.pickerOptionText}>
                                {user.first_name} {user.last_name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </View>
                  </Modal>
                )}
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
  const { toastMsg, showToast } = useSimpleToast();
  const [activeTab, setActiveTab] = useState<'schedule' | 'results'>('schedule');
  const [selectedSchedule, setSelectedSchedule] = useState<ExamSchedule | null>(null);
  const [selectedResult, setSelectedResult] = useState<MedicalExamResult | null>(null);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [results, setResults] = useState<MedicalExamResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [workers, setWorkers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const apiService = useMemo(() => ApiService.getInstance(), []);

  // Load exam data, workers, and users
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [examsRes, workersRes, usersRes] = await Promise.all([
          apiService.get('/occupational-health/medical-exams/', {
            ordering: '-exam_date',
            page_size: 100,
          }),
          apiService.get('/occupational-health/workers/', {
            page_size: 1000,
          }),
          apiService.get('/auth/users/', {
            page_size: 1000,
          }),
        ]);
        
        const exams = examsRes?.data?.results || examsRes?.data || [];
        
        // Map API data to frontend ExamSchedule interface
        const mappedExams = exams.map((exam: any) => ({
          id: String(exam.id),
          workerId: String(exam.worker),
          workerName: exam.worker_name || '',
          examType: exam.exam_type || 'periodic',
          scheduledDate: exam.exam_date || '',
          status: exam.examination_completed ? 'completed' : 'scheduled',
          examiner: exam.examining_doctor_name || '',
          examinerId: String(exam.examining_doctor || ''),
          location: 'KCC Health Center',
          sector: '',
          notes: exam.results_summary || '',
        }));
        
        const scheduledExams = mappedExams.filter((e: ExamSchedule) => e.status !== 'completed');
        const completedExams = mappedExams.filter((e: ExamSchedule) => e.status === 'completed');
        
        console.log('Loaded exams:', { total: exams.length, scheduled: scheduledExams.length, completed: completedExams.length, exams: mappedExams });
        
        setSchedules(scheduledExams);
        setResults(completedExams);
        setWorkers(workersRes?.data?.results || workersRes?.data || []);
        setUsers(usersRes?.data?.results || usersRes?.data || []);
      } catch (err: any) {
        console.error('Failed to load data:', err);
        setError(err?.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [apiService]);

  const examStats = useMemo(() => {
    const allExams = [...schedules, ...results];
    return {
      scheduled: schedules.filter(s => s.status === 'scheduled').length,
      completed: schedules.filter(s => s.status === 'completed').length,
      results: results.length,
      // Exam type breakdown
      examTypeStats: {
        pre_employment: {
          scheduled: schedules.filter(s => s.examType === 'pre_employment').length,
          completed: results.filter(r => r.examType === 'pre_employment').length,
        },
        periodic: {
          scheduled: schedules.filter(s => s.examType === 'periodic').length,
          completed: results.filter(r => r.examType === 'periodic').length,
        },
        return_to_work: {
          scheduled: schedules.filter(s => s.examType === 'return_to_work').length,
          completed: results.filter(r => r.examType === 'return_to_work').length,
        },
        exit: {
          scheduled: schedules.filter(s => s.examType === 'exit').length,
          completed: results.filter(r => r.examType === 'exit').length,
        },
        follow_up: {
          scheduled: schedules.filter(s => s.examType === 'follow_up').length,
          completed: results.filter(r => r.examType === 'follow_up').length,
        },
      },
    };
  }, [schedules, results]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    const loadData = async () => {
      try {
        const [examsRes, workersRes, usersRes] = await Promise.all([
          apiService.get('/occupational-health/medical-exams/', {
            ordering: '-exam_date',
            page_size: 100,
          }),
          apiService.get('/occupational-health/workers/', {
            page_size: 1000,
          }),
          apiService.get('/auth/users/', {
            page_size: 1000,
          }),
        ]);
        
        const exams = examsRes?.data?.results || examsRes?.data || [];
        
        // Map API data to frontend ExamSchedule interface
        const mappedExams = exams.map((exam: any) => ({
          id: String(exam.id),
          workerId: String(exam.worker),
          workerName: exam.worker_name || '',
          examType: exam.exam_type || 'periodic',
          scheduledDate: exam.exam_date || '',
          status: exam.examination_completed ? 'completed' : 'scheduled',
          examiner: exam.examining_doctor_name || '',
          examinerId: String(exam.examining_doctor || ''),
          location: 'KCC Health Center',
          sector: '',
          notes: exam.results_summary || '',
        }));
        
        const scheduledExams = mappedExams.filter((e: ExamSchedule) => e.status !== 'completed');
        const completedExams = mappedExams.filter((e: ExamSchedule) => e.status === 'completed');
        
        setSchedules(scheduledExams);
        setResults(completedExams);
        setWorkers(workersRes?.data?.results || workersRes?.data || []);
        setUsers(usersRes?.data?.results || usersRes?.data || []);
      } catch (err: any) {
        console.error('Refresh failed:', err);
      } finally {
        setRefreshing(false);
      }
    };
    loadData();
  }, [apiService]);

  const handleSaveSchedule = async (data: ExamSchedule) => {
    try {
      if (!data.workerId || !data.examinerId || !data.scheduledDate) {
        showToast('Missing required fields', 'error');
        return;
      }

      // Create the exam payload
      const examPayload = {
        worker: parseInt(data.workerId),
        exam_type: data.examType,
        exam_date: data.scheduledDate,
        examining_doctor: parseInt(data.examinerId),
        chief_complaint: data.notes || '',
        results_summary: '',
        recommendations: '',
        examination_completed: false,
        follow_up_required: false,
      };

      // Post to backend
      const response = await apiService.post('/occupational-health/medical-exams/', examPayload);
      
      if (response) {
        showToast('Exam scheduled successfully', 'success');
        setScheduleModalVisible(false);
        // Refresh the list
        handleRefresh();
      }
    } catch (err: any) {
      console.error('Failed to save schedule:', err);
      showToast(
        err?.response?.data?.detail || 
        err?.message || 
        'Failed to schedule exam',
        'error'
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Medical Exams</Text>
        <Text style={styles.headerSubtitle}>Schedule and manage occupational health examinations</Text>
      </View>

      {/* KPI Stats Section */}
      <View style={styles.kpiSection}>
        <View style={[styles.statCard, styles.scheduledCard, styles.cardShadow]}>
          <View style={[styles.statCardIcon, { backgroundColor: colors.secondary + '18' }]}>
            <Ionicons name="calendar-outline" size={24} color={colors.secondary} />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: colors.secondary }]}>{examStats.scheduled}</Text>
            <Text style={styles.statLabel}>Scheduled</Text>
            <Text style={styles.statSubtext}>Pending exams</Text>
          </View>
        </View>
        <View style={[styles.statCard, styles.completedCard, styles.cardShadow]}>
          <View style={[styles.statCardIcon, { backgroundColor: colors.success + '18' }]}>
            <Ionicons name="checkmark-circle-outline" size={24} color={colors.success} />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: colors.success }]}>{examStats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
            <Text style={styles.statSubtext}>This month</Text>
          </View>
        </View>
        <View style={[styles.statCard, styles.resultsCard, styles.cardShadow]}>
          <View style={[styles.statCardIcon, { backgroundColor: colors.info + '18' }]}>
            <Ionicons name="document-text-outline" size={24} color={colors.info} />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: colors.info }]}>{examStats.results}</Text>
            <Text style={styles.statLabel}>Results</Text>
            <Text style={styles.statSubtext}>Processed</Text>
          </View>
        </View>
      </View>

      {/* Exam Type Cards */}
      <View style={styles.typeCardsSection}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          contentContainerStyle={styles.typeCardsContent}
        >
          <ExamTypeCard
            type="pre_employment"
            label="Pre-Employment"
            description="Initial fitness assessment before hire"
            icon="person-add"
            scheduleCount={examStats.examTypeStats.pre_employment.scheduled}
            completedCount={examStats.examTypeStats.pre_employment.completed}
            onPress={() => setActiveTab('schedule')}
          />
          <ExamTypeCard
            type="periodic"
            label="Periodic"
            description="Regular health monitoring"
            icon="calendar-repeat"
            scheduleCount={examStats.examTypeStats.periodic.scheduled}
            completedCount={examStats.examTypeStats.periodic.completed}
            onPress={() => setActiveTab('schedule')}
          />
          <ExamTypeCard
            type="return_to_work"
            label="Return to Work"
            description="Post-absence fitness confirmation"
            icon="arrow-redo"
            scheduleCount={examStats.examTypeStats.return_to_work.scheduled}
            completedCount={examStats.examTypeStats.return_to_work.completed}
            onPress={() => setActiveTab('schedule')}
          />
          <ExamTypeCard
            type="exit"
            label="Exit"
            description="Final assessment on departure"
            icon="exit-outline"
            scheduleCount={examStats.examTypeStats.exit.scheduled}
            completedCount={examStats.examTypeStats.exit.completed}
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
      {loading ? (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Loading exams...</Text>
        </View>
      ) : error ? (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error || '#EF4444'} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={(activeTab === 'schedule' ? schedules : results) as any[]}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }: { item: any }) =>
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
      )}

      {/* FAB - Primary CTA */}
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
            examinerId: '',
            location: 'KCC Health Center',
            sector: '',
          };
          setSelectedSchedule(newSchedule);
          setScheduleModalVisible(true);
        }}
        activeOpacity={0.85}
      >
        <View style={styles.fabContent}>
          <Ionicons name="add" size={28} color="#FFF" />
        </View>
      </TouchableOpacity>
      <View style={styles.fabLabel}>
        <Text style={styles.fabLabelText}>Schedule Exam</Text>
      </View>

      {/* Modals */}
      <ScheduleModal
        visible={scheduleModalVisible}
        schedule={selectedSchedule}
        workers={workers}
        users={users}
        onClose={() => setScheduleModalVisible(false)}
        onSave={handleSaveSchedule}
      />
      <ResultDetailModal
        visible={resultModalVisible}
        result={selectedResult}
        onClose={() => setResultModalVisible(false)}
      />
      <SimpleToastNotification message={toastMsg} />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: colors.textSecondary },
  // KPI Stats Section
  kpiSection: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  scheduledCard: { borderTopWidth: 3, borderTopColor: colors.secondary },
  completedCard: { borderTopWidth: 3, borderTopColor: colors.success },
  resultsCard: { borderTopWidth: 3, borderTopColor: colors.info },
  statCardIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 48,
  },
  statContent: { flex: 1 },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.primary, marginBottom: 2 },
  statLabel: { fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 2 },
  statSubtext: { fontSize: 10, color: colors.textSecondary, fontStyle: 'italic' },
  // Badges
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, gap: 4 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  // Exam Type Cards
  typeCardsSection: { paddingHorizontal: spacing.md, marginBottom: spacing.lg },
  typeCardsContent: { paddingRight: spacing.lg },
  typeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    marginRight: spacing.md,
    width: 280,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.outline,
  },
  typeCardTopBorder: { height: 4, width: '100%' },
  typeCardContent: { padding: spacing.md },
  typeCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.lg },
  typeCardIcon: { width: 44, height: 44, borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center' },
  typeCardLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  typeCardDesc: { fontSize: 11, color: colors.textSecondary, marginTop: 4, lineHeight: 15 },
  typeCardFooter: { flexDirection: 'row', gap: 0 },
  typeCounterBox: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.sm },
  typeCounterValue: { fontSize: 18, fontWeight: '800', color: colors.primary, marginTop: 6 },
  typeCounterLabel: { fontSize: 10, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  // kept for compatibility
  statBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, alignItems: 'center' },
  statNumber: { fontSize: 14, fontWeight: '700', color: colors.primary },
  // Tab Bar
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.outline },
  tab: { flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  tabActive: { borderBottomWidth: 3, borderBottomColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  listContent: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.lg },
  // Schedule Card
  scheduleCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
  },
  scheduleCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  scheduleWorker: { fontSize: 14, fontWeight: '600', color: colors.text },
  scheduleType: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  scheduleDetails: { gap: 4, marginBottom: spacing.sm },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 12, color: colors.text, flex: 1 },
  dueBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  dueBadgeText: { fontSize: 10, fontWeight: '700', color: '#DC2626' },
  upcomingBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  upcomingBadgeText: { fontSize: 10, fontWeight: '700', color: '#F59E0B' },
  scheduleFooter: { flexDirection: 'row', gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.outline, paddingTop: spacing.sm },
  scheduleAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  actionText: { fontSize: 11, fontWeight: '600' },
  // Result Card
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
  },
  resultCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  resultWorker: { fontSize: 14, fontWeight: '600', color: colors.text },
  resultType: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  restrictionsBox: { backgroundColor: '#FEF3C7', borderRadius: borderRadius.md, paddingHorizontal: spacing.sm, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  restrictionsText: { fontSize: 11, color: '#92400E', flex: 1 },
  testResultsSummary: { flexDirection: 'row', gap: 4, marginBottom: spacing.sm },
  testResult: { flex: 1, backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md, padding: 6, alignItems: 'center' },
  testLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: '500' },
  testValue: { fontSize: 11, fontWeight: '600', color: colors.text, marginTop: 2 },
  resultFooter: { flexDirection: 'row', gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.outline, paddingTop: spacing.sm },
  resultAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyStateText: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.md },
  loadingText: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.md },
  errorText: { fontSize: 14, color: colors.error || '#EF4444', marginTop: spacing.md, textAlign: 'center' },
  // FAB - Primary CTA
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  fabContent: { justifyContent: 'center', alignItems: 'center' },
  fabLabel: {
    position: 'absolute',
    bottom: spacing.lg + 80,
    right: spacing.lg,
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    elevation: 4,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  fabLabelText: { fontSize: 12, fontWeight: '600', color: '#FFF', letterSpacing: 0.3 },
  cardShadow: { ...shadows.md },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, maxHeight: '90%', ...shadows.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outline },
  modalTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  modalBody: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, maxHeight: 500 },
  modalFooter: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.outline },
  section: { marginBottom: spacing.lg },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  infoBox: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.sm },
  infoLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  infoValue: { fontSize: 13, color: colors.text, fontWeight: '600', marginTop: 2 },
  formGroup: { marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  selectBox: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 44, justifyContent: 'center' },
  selectText: { fontSize: 14, color: colors.text },
  input: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 14, color: colors.text, minHeight: 44 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  // Dropdown Selector Styles
  dropdownButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 44 },
  dropdownButtonText: { fontSize: 14, color: colors.text, flex: 1 },
  dropdownPlaceholder: { color: colors.textSecondary },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  pickerCard: { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, maxHeight: '70%' },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outline },
  pickerTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  pickerList: { maxHeight: 400 },
  pickerOption: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outline },
  pickerOptionText: { fontSize: 14, color: colors.text, fontWeight: '500' },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: colors.outline, borderRadius: borderRadius.md, paddingVertical: spacing.md, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: colors.text },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: spacing.md, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  // Result Detail Modal
  resultDetailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg, paddingBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.outline },
  resultName: { fontSize: 18, fontWeight: '700', color: colors.text },
  resultDate: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  restrictionsList: { gap: spacing.md },
  restrictionItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  restrictionText: { fontSize: 13, color: '#92400E', flex: 1 },
  testResultBox: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md },
  testHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  testTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  testParams: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  param: { flex: 1, alignItems: 'center' },
  paramLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  paramValue: { fontSize: 16, fontWeight: '700', color: colors.primary, marginTop: 4 },
  testInterpretation: { fontSize: 12, color: colors.text, fontStyle: 'italic', paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.outline },
  recommendationsList: { gap: spacing.md },
  recommendationItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  recommendationDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 7 },
  recommendationText: { fontSize: 13, color: colors.text, flex: 1 },
  followUpText: { fontSize: 13, color: '#92400E', fontWeight: '500' },
  actionBtn: { borderWidth: 1, borderColor: colors.outline, borderRadius: borderRadius.md, paddingVertical: spacing.md, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  btnText: { fontSize: 13, fontWeight: '600' },
});
