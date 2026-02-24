import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Switch, Dimensions, ActivityIndicator, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { OccHealthApiService } from '../../../services/OccHealthApiService';

const { width } = Dimensions.get('window');

// ─── Types ──────────────────────────────────────────────────────
interface Worker {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  department?: string;
  fullName?: string;
}

interface OccupationalDisease {
  id: string;
  workerId: string;
  workerName: string;
  diseaseType: string;
  iloCode: string;
  dateReported: string;
  status: 'under-investigation' | 'confirmed' | 'closed';
  severity: 'mild' | 'moderate' | 'severe';
}

// ─── Occupational Disease Registry ──────────────────────────────
export function DiseaseRegistryScreen() {
  const [searchText, setSearchText] = useState('');
  const [selectedDisease, setSelectedDisease] = useState<OccupationalDisease | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(true);

  // Load workers on mount
  useEffect(() => {
    const loadWorkers = async () => {
      try {
        const result = await OccHealthApiService.getInstance().listWorkers({ page: 1 });
        if (result.data && result.data.length > 0) {
          setWorkers(result.data.map((w: any) => ({
            id: w.id,
            firstName: w.firstName || w.first_name || '',
            lastName: w.lastName || w.last_name || '',
            employeeId: w.employeeId || w.employee_id || w.id,
            department: w.department || 'N/A',
            fullName: `${w.firstName || w.first_name || ''} ${w.lastName || w.last_name || ''}`.trim(),
          })));
        }
      } catch (error) {
        console.error('Error loading workers:', error);
      } finally {
        setLoadingWorkers(false);
      }
    };
    loadWorkers();
  }, []);

  const mockDiseases: OccupationalDisease[] = [
    {
      id: '1',
      workerId: 'w001',
      workerName: 'Kabamba Mutombo',
      diseaseType: 'Silicosis',
      iloCode: 'ILO-1601',
      dateReported: '2026-01-15',
      status: 'confirmed',
      severity: 'severe',
    },
    {
      id: '2',
      workerId: 'w002',
      workerName: 'Tshisekedi Ilunga',
      diseaseType: 'Occupational Hearing Loss',
      iloCode: 'ILO-1602',
      dateReported: '2026-02-01',
      status: 'under-investigation',
      severity: 'moderate',
    },
    {
      id: '3',
      workerId: 'w003',
      workerName: 'Mukendi Kasongo',
      diseaseType: 'Work-Related Asthma',
      iloCode: 'ILO-1610',
      dateReported: '2025-12-20',
      status: 'confirmed',
      severity: 'mild',
    },
  ];

  const getStatusColor = (status: string) => {
    if (status === 'confirmed') return '#EF4444';
    if (status === 'under-investigation') return '#F59E0B';
    return '#22C55E';
  };

  const getSeverityColor = (severity: string) => {
    if (severity === 'severe') return '#7C2D12';
    if (severity === 'moderate') return '#EA580C';
    return '#F59E0B';
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Occupational Disease Registry</Text>
          <Text style={styles.subtitle}>ILO R194 Classification</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.cardShadow]}>
            <Text style={styles.statValue}>23</Text>
            <Text style={styles.statLabel}>Total Cases</Text>
          </View>
          <View style={[styles.statCard, styles.cardShadow]}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>8</Text>
            <Text style={styles.statLabel}>Confirmed</Text>
          </View>
          <View style={[styles.statCard, styles.cardShadow]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>5</Text>
            <Text style={styles.statLabel}>Investigating</Text>
          </View>
        </View>

        {/* Disease Categories */}
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: 40 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: spacing.md, textTransform: 'uppercase' }}>
            Common Diseases
          </Text>

          {['Silicosis', 'Asbestos-Related', 'Noise-Induced Hearing Loss', 'Work-Related Asthma', 'Occupational Dermatitis'].map((disease, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.diseaseCard, styles.cardShadow]}
              onPress={() => {
                setSelectedDisease(mockDiseases[idx % mockDiseases.length]);
                setIsModalVisible(true);
              }}
            >
              <View style={styles.diseaseIcon}>
                <Ionicons name="alert-circle" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.diseaseName}>{disease}</Text>
                <Text style={styles.diseaseCode}>ILO Code: ILO-{1600 + idx}</Text>
              </View>
              <View style={[styles.caseBadge, { backgroundColor: '#EF4444' + '20' }]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#EF4444' }}>
                  {Math.floor(Math.random() * 5) + 1} cases
                </Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* Registered Cases */}
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.md, textTransform: 'uppercase' }}>
            Registered Cases
          </Text>

          {mockDiseases.map(disease => (
            <TouchableOpacity
              key={disease.id}
              style={[styles.caseCard, styles.cardShadow]}
              onPress={() => {
                setSelectedDisease(disease);
                setIsModalVisible(true);
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                <Text style={styles.workerName}>{disease.workerName}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(disease.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(disease.status) }]}>
                    {disease.status.charAt(0).toUpperCase() + disease.status.slice(1)}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{disease.diseaseType}</Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                    {disease.dateReported} • Severity: {disease.severity}
                  </Text>
                </View>
                <View style={[styles.severityDot, { backgroundColor: getSeverityColor(disease.severity) }]} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {selectedDisease && (
        <DiseaseDetailModal
          disease={selectedDisease}
          isVisible={isModalVisible}
          onClose={() => setIsModalVisible(false)}
          workers={workers}
          loadingWorkers={loadingWorkers}
        />
      )}
    </View>
  );
}

// ─── Disease Detail Modal ───────────────────────────────────────
function DiseaseDetailModal({
  disease,
  isVisible,
  onClose,
  workers,
  loadingWorkers,
}: {
  disease: OccupationalDisease;
  isVisible: boolean;
  onClose: () => void;
  workers: Worker[];
  loadingWorkers: boolean;
}) {
  const [selectedWorkerId, setSelectedWorkerId] = useState(disease.workerId);
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);
  const [workerSearchText, setWorkerSearchText] = useState('');
  const selectedWorker = workers.find(w => w.id === selectedWorkerId || w.employeeId === selectedWorkerId);
  
  // Filter workers based on search text (name or employee ID)
  const filteredWorkers = workers.filter(worker => {
    const searchLower = workerSearchText.toLowerCase();
    return (
      (worker.fullName || '').toLowerCase().includes(searchLower) ||
      (worker.employeeId || '').toLowerCase().includes(searchLower)
    );
  });

  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{disease.diseaseType}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: spacing.lg }}>
            {/* Worker Selection */}
            <View style={[styles.section, styles.cardShadow]}>
              <Text style={styles.sectionTitle}>Worker Assignment</Text>
              
              {loadingWorkers ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.md }} />
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.workerSelectorBtn, showWorkerDropdown && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}
                    onPress={() => setShowWorkerDropdown(!showWorkerDropdown)}
                  >
                    <View>
                      <Text style={styles.workerSelectorLabel}>Selected Worker</Text>
                      <Text style={styles.workerSelectorValue}>
                        {selectedWorker ? `${selectedWorker.fullName} (${selectedWorker.employeeId})` : 'Select worker...'}
                      </Text>
                    </View>
                    <Ionicons 
                      name={showWorkerDropdown ? 'chevron-up' : 'chevron-down'} 
                      size={20} 
                      color={colors.textSecondary} 
                    />
                  </TouchableOpacity>

                  {showWorkerDropdown && (
                    <View style={styles.workerDropdownList}>
                      <TextInput
                        style={styles.workerSearchInput}
                        placeholder="Search by name or employee ID..."
                        placeholderTextColor={colors.textSecondary}
                        value={workerSearchText}
                        onChangeText={setWorkerSearchText}
                      />
                      
                      <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                        {filteredWorkers.length > 0 ? (
                          filteredWorkers.map(worker => (
                            <TouchableOpacity
                              key={worker.id}
                              style={[
                                styles.workerDropdownItem,
                                selectedWorkerId === worker.id && styles.workerDropdownItemSelected,
                              ]}
                              onPress={() => {
                                setSelectedWorkerId(worker.id);
                                setShowWorkerDropdown(false);
                                setWorkerSearchText('');
                              }}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.workerDropdownName, selectedWorkerId === worker.id && { color: colors.primary, fontWeight: '700' }]}>
                                  {worker.fullName}
                                </Text>
                                <Text style={styles.workerDropdownMeta}>{worker.employeeId} • {worker.department}</Text>
                              </View>
                              {selectedWorkerId === worker.id && (
                                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                              )}
                            </TouchableOpacity>
                          ))
                        ) : (
                          <View style={{ padding: spacing.md, alignItems: 'center' }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>No workers found</Text>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Info */}
            <View style={[styles.section, styles.cardShadow]}>
              <Text style={styles.sectionTitle}>Case Information</Text>
              <InfoRow label="ILO Classification" value={disease.iloCode} />
              <InfoRow label="Date Reported" value={disease.dateReported} />
              <InfoRow label="Severity" value={disease.severity} />
              <InfoRow label="Status" value={disease.status} />
            </View>

            {/* Clinical Details */}
            <View style={[styles.section, styles.cardShadow]}>
              <Text style={styles.sectionTitle}>Clinical Details</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18 }}>
                {disease.diseaseType === 'Silicosis' &&
                  'Lung disease caused by inhaling silica dust. Progressive condition with fibrosis developing over years of exposure.'}
                {disease.diseaseType === 'Occupational Hearing Loss' &&
                  'Noise-induced hearing loss from prolonged exposure to high noise levels. Often presents with high-frequency hearing loss initially.'}
                {disease.diseaseType === 'Work-Related Asthma' &&
                  'Occupational asthma triggered or exacerbated by workplace exposure to harmful agents or allergens.'}
              </Text>
            </View>

            {/* Recommendations */}
            <View style={[styles.section, styles.cardShadow]}>
              <Text style={styles.sectionTitle}>Medical Management</Text>
              {['Regular monitoring', 'Enhanced respiratory protection', 'Workstation modification', 'Medical treatment as needed'].map((rec, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginRight: 8, marginTop: 5 }} />
                  <Text style={{ flex: 1, fontSize: 12, color: colors.text }}>{rec}</Text>
                </View>
              ))}
            </View>

            {/* Action Button */}
            <TouchableOpacity style={[styles.actionBtn, styles.cardShadow]}>
              <Ionicons name="document-outline" size={20} color="#FFF" />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFF' }}>Generate Medical Report</Text>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Health Screening Forms ─────────────────────────────────────
export function HealthScreeningFormScreen() {
  const [activeForm, setActiveForm] = useState<'ergonomic' | 'mental' | 'cardio' | 'msk' | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(true);
  const [completedScreenings, setCompletedScreenings] = useState<Array<{
    id: string;
    workerId: string;
    workerName: string;
    screeningType: string;
    screeningTypeDisplay: string;
    completedDate: string;
    status: 'completed' | 'pending';
    details?: Record<string, any>;
  }>>([]);
  const [selectedScreening, setSelectedScreening] = useState<(typeof completedScreenings)[0] | null>(null);
  const [loadingScreenings, setLoadingScreenings] = useState(false);
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'worker'>('date-desc');
  const [filterType, setFilterType] = useState<'all' | 'ergonomic' | 'mental' | 'cardio' | 'msk'>('all');

  // Load workers on mount
  useEffect(() => {
    const loadWorkers = async () => {
      try {
        const result = await OccHealthApiService.getInstance().listWorkers({ page: 1 });
        if (result.data && result.data.length > 0) {
          setWorkers(result.data.map((w: any) => ({
            id: w.id,
            firstName: w.firstName || w.first_name || '',
            lastName: w.lastName || w.last_name || '',
            employeeId: w.employeeId || w.employee_id || w.id,
            department: w.department || 'N/A',
            fullName: `${w.firstName || w.first_name || ''} ${w.lastName || w.last_name || ''}`.trim(),
          })));
        }
      } catch (error) {
        console.error('Error loading workers:', error);
      } finally {
        setLoadingWorkers(false);
      }
    };
    loadWorkers();

    // Load completed screenings from storage
    loadCompletedScreenings();
  }, []);

  const loadCompletedScreenings = async () => {
    setLoadingScreenings(true);
    try {
      // Try to fetch from API - replace with actual endpoint when backend is ready
      try {
        const result = await OccHealthApiService.getInstance().listWorkers({ page: 1 });
        // API call logic here - for now using mock data
      } catch (apiError) {
        console.log('API not ready, using mock data');
      }
      
      // Mock data - replace with actual API response
      const mockScreenings = [
        {
          id: 'screen-001',
          workerId: 'w1',
          workerName: 'Jean-Pierre Kabongo',
          screeningType: 'ergonomic',
          screeningTypeDisplay: 'Ergonomic Assessment',
          completedDate: '2026-02-20T10:30:00Z',
          status: 'completed' as const,
          details: {
            workstationType: 'Desk Work',
            posture: 'Neutral',
            riskLevel: 'Low',
            recommendations: ['Use ergonomic chair', 'Position monitor at eye level'],
            score: 8.5,
          },
        },
        {
          id: 'screen-002',
          workerId: 'w2',
          workerName: 'Grace Mwamba',
          screeningType: 'mental',
          screeningTypeDisplay: 'Mental Health Assessment',
          completedDate: '2026-02-19T14:15:00Z',
          status: 'completed' as const,
          details: {
            stressLevel: 'Moderate',
            wellbeingScore: 7.2,
            recommendations: ['Regular breaks needed', 'Consider stress management program'],
            flagged: false,
          },
        },
        {
          id: 'screen-003',
          workerId: 'w3',
          workerName: 'Patrick Lukusa',
          screeningType: 'cardio',
          screeningTypeDisplay: 'Cardiovascular Risk',
          completedDate: '2026-02-18T09:45:00Z',
          status: 'completed' as const,
          details: {
            riskCategory: 'Low',
            bmi: 24.5,
            bloodPressure: '120/80',
            recommendations: ['Maintain current exercise routine'],
            nextCheckupDate: '2026-08-18',
          },
        },
      ];
      setCompletedScreenings(mockScreenings);
    } catch (error) {
      console.error('Error loading completed screenings:', error);
    } finally {
      setLoadingScreenings(false);
    }
  };

  // Filter and sort completed screenings
  const filteredAndSortedScreenings = completedScreenings
    .filter(s => filterType === 'all' || s.screeningType === filterType)
    .sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.completedDate).getTime() - new Date(b.completedDate).getTime();
        case 'date-desc':
          return new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime();
        case 'worker':
          return a.workerName.localeCompare(b.workerName);
        default:
          return 0;
      }
    });

  const screenings = [
    { id: 'ergonomic', name: 'Ergonomic Assessment', icon: 'desktop-outline', color: '#3B82F6' },
    { id: 'mental', name: 'Mental Health Assessment', icon: 'happy-outline', color: '#8B5CF6' },
    { id: 'cardio', name: 'Cardiovascular Risk', icon: 'heart-outline', color: '#EC4899' },
    { id: 'msk', name: 'Musculoskeletal Screening', icon: 'body-outline', color: '#F59E0B' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Health Screening Forms</Text>
          <Text style={styles.subtitle}>Occupational health assessments</Text>
        </View>

        <View style={{ paddingHorizontal: spacing.md, paddingBottom: 40 }}>
          {/* Available Screenings */}
          {screenings.map(screening => (
            <TouchableOpacity
              key={screening.id}
              style={[styles.screeningCard, styles.cardShadow]}
              onPress={() => setActiveForm(screening.id as any)}
            >
              <View style={[styles.screeningIcon, { backgroundColor: (screening as any).color + '20' }]}>
                <Ionicons name={screening.icon as any} size={28} color={(screening as any).color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.screeningName}>{screening.name}</Text>
                <Text style={styles.screeningDesc}>Start assessment</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}

          {/* Completed Health Screenings History */}
          {completedScreenings.length > 0 && (
            <>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.md, textTransform: 'uppercase' }}>
                Screening History
              </Text>
              {completedScreenings.map(screening => {
                const screeningType = screenings.find(s => s.id === screening.screeningType);
                return (
                  <View
                    key={screening.id}
                    style={[styles.screeningCard, styles.cardShadow, { backgroundColor: colors.surface, borderLeftWidth: 4, borderLeftColor: screeningType?.color || colors.primary }]}
                  >
                    <View style={[styles.screeningIcon, { backgroundColor: (screeningType?.color || colors.primary) + '20' }]}>
                      <Ionicons name={(screeningType?.icon as any) || 'checkmark-circle-outline'} size={28} color={screeningType?.color || colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.screeningName}>{screening.screeningTypeDisplay}</Text>
                      <Text style={styles.screeningDesc}>{screening.workerName}</Text>
                      <Text style={[styles.screeningDesc, { fontSize: 11, marginTop: spacing.xs }]}>
                        {new Date(screening.completedDate).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <View style={{ backgroundColor: colors.primary + '20', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 4, marginBottom: spacing.xs }}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: colors.primary, textTransform: 'uppercase' }}>
                          {screening.status}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </View>
      </ScrollView>

      {activeForm && (
        <ScreeningFormModal
          formType={activeForm}
          onClose={() => setActiveForm(null)}
          workers={workers}
          loadingWorkers={loadingWorkers}
        />
      )}
    </View>
  );
}

// ─── Screening Form Modal ───────────────────────────────────────
function ScreeningFormModal({
  formType,
  onClose,
  workers,
  loadingWorkers,
}: {
  formType: 'ergonomic' | 'mental' | 'cardio' | 'msk';
  onClose: () => void;
  workers: Worker[];
  loadingWorkers: boolean;
}) {
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);
  const [workerSearchText, setWorkerSearchText] = useState('');
  const selectedWorker = workers.find(w => w.id === selectedWorkerId || w.employeeId === selectedWorkerId);
  
  // Filter workers based on search text (name or employee ID)
  const filteredWorkers = workers.filter(worker => {
    const searchLower = workerSearchText.toLowerCase();
    return (
      (worker.fullName || '').toLowerCase().includes(searchLower) ||
      (worker.employeeId || '').toLowerCase().includes(searchLower)
    );
  });

  const formConfigs: Record<string, any> = {
    ergonomic: {
      title: 'Ergonomic Assessment Form',
      questions: [
        { id: 'posture', label: 'Do you maintain proper posture throughout your workday?', type: 'yesno' },
        { id: 'breaks', label: 'How often do you take breaks from your desk? (in minutes)', type: 'number' },
        { id: 'neck', label: 'Do you experience neck or shoulder pain?', type: 'yesno' },
        { id: 'wrist', label: 'Do you experience wrist or hand pain?', type: 'yesno' },
        { id: 'back', label: 'Do you experience lower back pain?', type: 'yesno' },
      ],
    },
    mental: {
      title: 'Mental Health Screening Form',
      questions: [
        { id: 'stress', label: 'How would you rate your current stress level? (1-10)', type: 'scale' },
        { id: 'sleep', label: 'Are you experiencing sleep difficulties?', type: 'yesno' },
        { id: 'mood', label: 'Have you felt persistently sad or anxious?', type: 'yesno' },
        { id: 'support', label: 'Do you feel supported at work?', type: 'yesno' },
        { id: 'worklife', label: 'How satisfied are you with your work-life balance? (1-10)', type: 'scale' },
      ],
    },
    cardio: {
      title: 'Cardiovascular Risk Assessment',
      questions: [
        { id: 'history', label: 'Family history of heart disease?', type: 'yesno' },
        { id: 'exercise', label: 'How many days per week do you exercise?', type: 'number' },
        { id: 'smoking', label: 'Do you smoke?', type: 'yesno' },
        { id: 'diet', label: 'How would you rate your diet? (Poor/Fair/Good/Excellent)', type: 'select' },
        { id: 'chest', label: 'Do you experience chest discomfort during exercise?', type: 'yesno' },
      ],
    },
    msk: {
      title: 'Musculoskeletal Screening',
      questions: [
        { id: 'pain', label: 'Do you experience any joint or muscle pain?', type: 'yesno' },
        { id: 'location', label: 'Location of pain (if applicable)', type: 'text' },
        { id: 'duration', label: 'How long have you had this pain? (in weeks)', type: 'number' },
        { id: 'lifting', label: 'Do you regularly lift or carry heavy objects?', type: 'yesno' },
        { id: 'impact', label: 'How much does this affect your work? (1-10)', type: 'scale' },
      ],
    },
  };

  const config = formConfigs[formType];

  return (
    <Modal visible={true} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{config.title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: spacing.lg }}>
            {/* Worker Selection */}
            <View style={[styles.section, styles.cardShadow, { marginTop: spacing.lg }]}>
              <Text style={styles.sectionTitle}>Select Worker</Text>
              
              {loadingWorkers ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.md }} />
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.workerSelectorBtn, showWorkerDropdown && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}
                    onPress={() => setShowWorkerDropdown(!showWorkerDropdown)}
                  >
                    <View>
                      <Text style={styles.workerSelectorLabel}>Worker</Text>
                      <Text style={styles.workerSelectorValue}>
                        {selectedWorker ? `${selectedWorker.fullName} (${selectedWorker.employeeId})` : 'Select worker...'}
                      </Text>
                    </View>
                    <Ionicons 
                      name={showWorkerDropdown ? 'chevron-up' : 'chevron-down'} 
                      size={20} 
                      color={colors.textSecondary} 
                    />
                  </TouchableOpacity>

                  {showWorkerDropdown && (
                    <View style={styles.workerDropdownList}>
                      <TextInput
                        style={styles.workerSearchInput}
                        placeholder="Search by name or employee ID..."
                        placeholderTextColor={colors.textSecondary}
                        value={workerSearchText}
                        onChangeText={setWorkerSearchText}
                      />
                      
                      <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                        {filteredWorkers.length > 0 ? (
                          filteredWorkers.map(worker => (
                            <TouchableOpacity
                              key={worker.id}
                              style={[
                                styles.workerDropdownItem,
                                selectedWorkerId === worker.id && styles.workerDropdownItemSelected,
                              ]}
                              onPress={() => {
                                setSelectedWorkerId(worker.id);
                                setShowWorkerDropdown(false);
                                setWorkerSearchText('');
                              }}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.workerDropdownName, selectedWorkerId === worker.id && { color: colors.primary, fontWeight: '700' }]}>
                                  {worker.fullName}
                                </Text>
                                <Text style={styles.workerDropdownMeta}>{worker.employeeId} • {worker.department}</Text>
                              </View>
                              {selectedWorkerId === worker.id && (
                                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                              )}
                            </TouchableOpacity>
                          ))
                        ) : (
                          <View style={{ padding: spacing.md, alignItems: 'center' }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>No workers found</Text>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  )}
                </>
              )}
            </View>
            {config.questions.map((q: any, idx: number) => (
              <View key={q.id} style={[styles.formQuestion, idx < config.questions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.outline }]}>
                <Text style={styles.questionLabel}>{idx + 1}. {q.label}</Text>

                {q.type === 'yesno' && (
                  <View style={styles.yesnoButtons}>
                    {['Yes', 'No'].map(opt => (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.optionBtn, responses[q.id] === opt && styles.optionBtnSelected]}
                        onPress={() => setResponses({ ...responses, [q.id]: opt })}
                      >
                        <Text style={[styles.optionText, responses[q.id] === opt && styles.optionTextSelected]}>
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {q.type === 'number' && (
                  <TextInput
                    style={styles.numberInput}
                    placeholder="Enter number"
                    keyboardType="number-pad"
                    onChangeText={text => setResponses({ ...responses, [q.id]: text })}
                    value={responses[q.id] || ''}
                  />
                )}

                {q.type === 'text' && (
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter response"
                    onChangeText={text => setResponses({ ...responses, [q.id]: text })}
                    value={responses[q.id] || ''}
                  />
                )}

                {q.type === 'scale' && (
                  <View style={styles.scaleContainer}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <TouchableOpacity
                        key={num}
                        style={[styles.scaleBtn, responses[q.id] === num && styles.scaleBtnSelected]}
                        onPress={() => setResponses({ ...responses, [q.id]: num })}
                      >
                        <Text style={[styles.scaleBtnText, responses[q.id] === num && styles.scaleBtnTextSelected]}>
                          {num}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}

            <TouchableOpacity 
              style={[styles.submitBtn, styles.cardShadow, !selectedWorkerId && { opacity: 0.5 }]}
              onPress={() => {
                if (selectedWorkerId) {
                  // Save screening with worker ID
                  console.log(`Screening for worker: ${selectedWorkerId}`, { formType, responses });
                  onClose();
                }
              }}
              disabled={!selectedWorkerId}
            >
              <Ionicons name="send" size={20} color="#FFF" />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFF' }}>Submit Assessment</Text>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Helper Components ──────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>
        {label}
      </Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{value}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: colors.textSecondary },

  statsRow: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.md, marginBottom: spacing.lg },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.primary },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },

  diseaseCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  diseaseIcon: { width: 50, height: 50, borderRadius: borderRadius.lg, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center' },
  diseaseName: { fontSize: 13, fontWeight: '700', color: colors.text },
  diseaseCode: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  caseBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full },

  caseCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  workerName: { fontSize: 13, fontWeight: '700', color: colors.text },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
  statusText: { fontSize: 10, fontWeight: '600' },
  severityDot: { width: 12, height: 12, borderRadius: 6 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, paddingTop: spacing.lg, maxHeight: '95%' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    paddingBottom: spacing.md,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text },

  section: { backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.md },

  actionBtn: {
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

  screeningCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  screeningIcon: { width: 50, height: 50, borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center' },
  screeningName: { fontSize: 14, fontWeight: '700', color: colors.text },
  screeningDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  formQuestion: { paddingVertical: spacing.lg },
  questionLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: spacing.md },

  yesnoButtons: { flexDirection: 'row', gap: spacing.md },
  optionBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.surfaceVariant, alignItems: 'center' },
  optionBtnSelected: { backgroundColor: colors.primary },
  optionText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  optionTextSelected: { color: '#FFF' },

  numberInput: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 13,
    color: colors.text,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 13,
    color: colors.text,
    minHeight: 100,
  },

  scaleContainer: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  scaleBtn: { width: '18%', aspectRatio: 1, borderWidth: 1, borderColor: colors.outline, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  scaleBtnSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  scaleBtnText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  scaleBtnTextSelected: { color: '#FFF' },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    marginTop: spacing.lg,
  },

  // Worker Selector Styles
  workerSelectorBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  workerSelectorLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  workerSelectorValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  workerDropdownList: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.outline,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  workerSearchInput: {
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  workerDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  workerDropdownItemSelected: {
    backgroundColor: colors.primary + '10',
  },
  workerDropdownName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  workerDropdownMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },

  cardShadow: shadows.sm,
});
