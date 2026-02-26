import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Switch, Dimensions, ActivityIndicator, FlatList, Alert, Platform,
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
      // Fetch real data from API
      const result = await OccHealthApiService.getInstance().listHealthScreenings();
      
      if (result.data && result.data.length > 0) {
        // Map API response to component format
        const screenings = result.data.map((screening: any) => {
          const typeLabels: Record<string, string> = {
            ergonomic: 'Ergonomic Assessment',
            mental: 'Mental Health Assessment',
            cardio: 'Cardiovascular Risk',
            msk: 'Musculoskeletal Complaints',
          };
          
          return {
            id: screening.id?.toString() || '',
            workerId: screening.worker?.toString() || '',
            workerName: screening.worker_name || 'Unknown',
            screeningType: screening.screening_type || '',
            screeningTypeDisplay: typeLabels[screening.screening_type] || screening.screening_type,
            completedDate: screening.created_at || new Date().toISOString(),
            status: 'completed' as const,
            details: screening.responses || {},
          };
        });
        setCompletedScreenings(screenings);
      } else {
        // No data from API, use mock data
        setCompletedScreenings([]);
      }
    } catch (error) {
      console.error('Error loading completed screenings:', error);
      // Silently fail - show empty state instead of mock data
      setCompletedScreenings([]);
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
    { id: 'ergonomic', name: 'Évaluation Ergonomique', icon: 'desktop-outline', color: '#3B82F6' },
    { id: 'mental', name: 'Évaluation Santé Mentale', icon: 'happy-outline', color: '#8B5CF6' },
    { id: 'cardio', name: 'Risque Cardiovasculaire', icon: 'heart-outline', color: '#EC4899' },
    { id: 'msk', name: 'Dépistage Musculo-squelettique', icon: 'body-outline', color: '#F59E0B' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Formulaires de Dépistage</Text>
          <Text style={styles.subtitle}>Évaluations de santé occupationnelle</Text>
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
                <Text style={styles.screeningDesc}>Commencer l'évaluation</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}

          {/* Completed Health Screenings History */}
          {completedScreenings.length > 0 && (
            <>
              <View style={{ marginTop: spacing.lg, marginBottom: spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase' }}>
                    Historique de Dépistage
                  </Text>
                </View>

                {/* Filter and Sort Controls */}
                <View style={{ gap: spacing.md }}>
                  {/* Filter Buttons */}
                  <View style={{ gap: spacing.xs }}>
                    <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase' }}>Filtrer par Type</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                        {['all', 'ergonomic', 'mental', 'cardio', 'msk'].map((type) => (
                          <TouchableOpacity
                            key={type}
                            onPress={() => setFilterType(type as any)}
                            style={[
                              styles.filterBtn,
                              filterType === type && styles.filterBtnActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.filterBtnText,
                                filterType === type && styles.filterBtnTextActive,
                              ]}
                            >
                              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>

                  {/* Sort Controls */}
                  <View style={{ gap: spacing.xs }}>
                    <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase' }}>Trier par</Text>
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      {[
                        { value: 'date-desc' as const, label: 'Plus récent' },
                        { value: 'date-asc' as const, label: 'Plus ancien' },
                        { value: 'worker' as const, label: 'Travailleur' },
                      ].map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          onPress={() => setSortBy(option.value)}
                          style={[
                            styles.sortBtn,
                            sortBy === option.value && styles.sortBtnActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.sortBtnText,
                              sortBy === option.value && styles.sortBtnTextActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </View>

              {loadingScreenings ? (
                <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : filteredAndSortedScreenings.length > 0 ? (
                filteredAndSortedScreenings.map(screening => {
                  const screeningType = screenings.find(s => s.id === screening.screeningType);
                  return (
                    <TouchableOpacity
                      key={screening.id}
                      onPress={() => setSelectedScreening(screening)}
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
                      <View style={{ alignItems: 'center', gap: spacing.xs }}>
                        <View style={{ backgroundColor: colors.primary + '20', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: '600', color: colors.primary, textTransform: 'uppercase' }}>
                            {screening.status}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
                  <Ionicons name="filter-outline" size={40} color={colors.textSecondary + '40'} />
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: spacing.md }}>Aucun dépistage trouvé</Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {activeForm && (
        <ScreeningFormModal
          formType={activeForm}
          onClose={() => setActiveForm(null)}
          onSuccess={() => {
            setActiveForm(null);
            loadCompletedScreenings();
          }}
          workers={workers}
          loadingWorkers={loadingWorkers}
        />
      )}

      {selectedScreening && (
        <ScreeningDetailsModal
          screening={selectedScreening}
          onClose={() => setSelectedScreening(null)}
          screenings={screenings}
        />
      )}
    </View>
  );
}

// ─── Screening Form Modal ───────────────────────────────────────
function ScreeningFormModal({
  formType,
  onClose,
  onSuccess,
  workers,
  loadingWorkers,
}: {
  formType: 'ergonomic' | 'mental' | 'cardio' | 'msk';
  onClose: () => void;
  onSuccess?: () => void;
  workers: Worker[];
  loadingWorkers: boolean;
}) {
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);
  const [workerSearchText, setWorkerSearchText] = useState('');
  const [saving, setSaving] = useState(false);
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
      title: 'Formulaire d\'Évaluation Ergonomique',
      questions: [
        { id: 'posture', label: 'Maintenez-vous une bonne posture tout au long de votre journée de travail ?', type: 'yesno' },
        { id: 'breaks', label: 'Combien de fois prenez-vous des pauses à votre bureau ? (en minutes)', type: 'number' },
        { id: 'neck', label: 'Ressentez-vous des douleurs au cou ou aux épaules ?', type: 'yesno' },
        { id: 'wrist', label: 'Ressentez-vous des douleurs aux poignets ou aux mains ?', type: 'yesno' },
        { id: 'back', label: 'Ressentez-vous des douleurs au bas du dos ?', type: 'yesno' },
      ],
    },
    mental: {
      title: 'Formulaire de Dépistage de Santé Mentale',
      questions: [
        { id: 'stress', label: 'Comment évaluez-vous votre niveau de stress actuel ? (1-10)', type: 'scale' },
        { id: 'sleep', label: 'Avez-vous des difficultés de sommeil ?', type: 'yesno' },
        { id: 'mood', label: 'Vous êtes-vous senti persistamment triste ou anxieux ?', type: 'yesno' },
        { id: 'support', label: 'Vous sentez-vous soutenu au travail ?', type: 'yesno' },
        { id: 'worklife', label: 'Êtes-vous satisfait de votre équilibre travail-vie personnelle ? (1-10)', type: 'scale' },
      ],
    },
    cardio: {
      title: 'Évaluation du Risque Cardiovasculaire',
      questions: [
        { id: 'history', label: 'Avez-vous un antécédent familial de maladie cardiaque ?', type: 'yesno' },
        { id: 'exercise', label: 'Combien de jours par semaine faites-vous de l\'exercice ?', type: 'number' },
        { id: 'smoking', label: 'Fumez-vous ?', type: 'yesno' },
        { id: 'diet', label: 'Comment évaluez-vous votre alimentation ? (Mauvaise/Passable/Bonne/Excellente)', type: 'select' },
        { id: 'chest', label: 'Ressentez-vous une gêne thoracique pendant l\'exercice ?', type: 'yesno' },
      ],
    },
    msk: {
      title: 'Dépistage Musculo-squelettique',
      questions: [
        { id: 'pain', label: 'Ressentez-vous une douleur articulaire ou musculaire ?', type: 'yesno' },
        { id: 'location', label: 'Localisation de la douleur (le cas échéant)', type: 'text' },
        { id: 'duration', label: 'Depuis combien de temps avez-vous cette douleur ? (en semaines)', type: 'number' },
        { id: 'lifting', label: 'Portez-vous ou transportez-vous régulièrement des objets lourds ?', type: 'yesno' },
        { id: 'impact', label: 'Quel impact cela a-t-il sur votre travail ? (1-10)', type: 'scale' },
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
              onPress={async () => {
                if (!selectedWorkerId) return;
                
                setSaving(true);
                try {
                  const result = await OccHealthApiService.getInstance().createHealthScreening({
                    worker_id: selectedWorkerId,
                    screening_type: formType,
                    responses,
                    notes: '',
                  });
                  
                  if (result.error) {
                    Alert.alert('Error', result.error || 'Failed to save screening');
                  } else {
                    Alert.alert('Success', 'Screening saved successfully');
                    onSuccess?.();
                  }
                } catch (error: any) {
                  Alert.alert('Error', error?.message || 'Failed to save screening');
                } finally {
                  setSaving(false);
                }
              }}
              disabled={!selectedWorkerId || saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#FFF" />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFF' }}>
                    {saving ? 'Saving...' : 'Submit Assessment'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Export & Rescan Helpers ────────────────────────────────────
const exportScreening = (screening: any) => {
  try {
    // Prepare CSV data
    const csvRows: string[] = [];
    
    // Header
    csvRows.push('Health Screening Export');
    csvRows.push(`Exported: ${new Date().toLocaleString()}`);
    csvRows.push('');
    
    // Basic Info
    csvRows.push('Basic Information');
    csvRows.push(`Worker Name,${screening.workerName || 'N/A'}`);
    csvRows.push(`Screening Type,${screening.screeningTypeDisplay || 'N/A'}`);
    csvRows.push(`Completed Date,${new Date(screening.completedDate).toLocaleString()}`);
    csvRows.push(`Status,${screening.status || 'N/A'}`);
    csvRows.push('');
    
    // Assessment Details
    if (screening.details && Object.keys(screening.details).length > 0) {
      csvRows.push('Assessment Details');
      Object.entries(screening.details).forEach(([key, value]: [string, any]) => {
        if (Array.isArray(value)) {
          csvRows.push(`${key},"${value.join('; ')}"`);
        } else if (typeof value === 'object') {
          csvRows.push(`${key},"${JSON.stringify(value)}"`);
        } else {
          csvRows.push(`${key},${value}`);
        }
      });
    }
    
    const csv = csvRows.join('\n');

    // Download on web
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
      const fileName = `health-screening-${screening.id}_${new Date().toISOString().slice(0, 10)}.csv`;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = (window.URL || window.webkitURL).createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      (window.URL || window.webkitURL).revokeObjectURL(url);
      Alert.alert('Success', `Screening exported as ${fileName}`);
      return;
    }

    Alert.alert('Info', 'Export feature available on web platform');
  } catch (error: any) {
    console.error('Export error:', error);
    Alert.alert('Error', 'Failed to export screening: ' + error?.message);
  }
};

const handleRescan = (screening: any) => {
  try {
    Alert.alert(
      'Rescan Screening',
      `Ready to retake the ${screening.screeningTypeDisplay} screening for ${screening.workerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed',
          onPress: () => {
            Alert.alert('Rescan Started', `Retaking screening ID: ${screening.id}. Please provide new assessment data.`);
            console.log('Rescan screening:', screening.id);
          },
        },
      ]
    );
  } catch (error: any) {
    console.error('Rescan error:', error);
    Alert.alert('Error', 'Failed to start rescan: ' + error?.message);
  }
};

// ─── Screening Details Modal ────────────────────────────────────
interface ScreeningDetailsModalProps {
  screening: any;
  onClose: () => void;
  screenings: Array<{ id: string; name: string; icon: string; color: string }>;
}

function ScreeningDetailsModal({ screening, onClose, screenings }: ScreeningDetailsModalProps) {
  const screeningType = screenings.find(s => s.id === screening.screeningType);
  const details = screening.details || {};

  return (
    <Modal visible={true} transparent animationType="fade">
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <View style={[styles.modalContent, { maxHeight: '90%' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 }}>
              <View style={[styles.screeningIcon, { backgroundColor: (screeningType?.color || colors.primary) + '20' }]}>
                <Ionicons name={(screeningType?.icon as any) || 'checkmark-circle-outline'} size={28} color={screeningType?.color || colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{screening.screeningTypeDisplay}</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>ID: {screening.id}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: spacing.sm }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Basic Information */}
            <View style={{ backgroundColor: colors.background, padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.lg }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: spacing.md, textTransform: 'uppercase' }}>
                Basic Information
              </Text>
              <InfoRow label="Worker Name" value={screening.workerName} />
              <InfoRow label="Screening Type" value={screening.screeningTypeDisplay} />
              <InfoRow label="Completed Date" value={new Date(screening.completedDate).toLocaleString()} />
              <InfoRow label="Status" value={screening.status.charAt(0).toUpperCase() + screening.status.slice(1)} />
            </View>

            {/* Assessment Details */}
            {Object.keys(details).length > 0 && (
              <View style={{ backgroundColor: colors.background, padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.lg }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: spacing.md, textTransform: 'uppercase' }}>
                  Assessment Details
                </Text>
                {Object.entries(details).map(([key, value]) => {
                  if (key === 'recommendations' && Array.isArray(value)) {
                    return (
                      <View key={key} style={{ marginBottom: spacing.md }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase' }}>
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </Text>
                        {value.map((rec, idx) => (
                          <View key={idx} style={{ flexDirection: 'row', marginBottom: 6, alignItems: 'flex-start' }}>
                            <Text style={{ color: screeningType?.color || colors.primary, marginRight: spacing.sm, fontWeight: 'bold' }}>•</Text>
                            <Text style={{ fontSize: 13, color: colors.text, flex: 1 }}>{rec}</Text>
                          </View>
                        ))}
                      </View>
                    );
                  }
                  return (
                    <InfoRow
                      key={key}
                      label={key.replace(/([A-Z])/g, ' $1').trim()}
                      value={typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                    />
                  );
                })}
              </View>
            )}

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
              <TouchableOpacity
                style={[styles.submitBtn, { flex: 1, backgroundColor: colors.primary + '20', marginHorizontal: 0 }]}
                onPress={() => exportScreening(screening)}
              >
                <Ionicons name="download-outline" size={20} color={colors.primary} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>Export</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, { flex: 1, marginHorizontal: 0 }]}
                onPress={() => {
                  handleRescan(screening);
                  onClose();
                }}
              >
                <Ionicons name="refresh-outline" size={20} color="#FFF" />
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#FFF' }}>Rescan</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <TouchableOpacity style={[styles.submitBtn, { marginBottom: 0 }]} onPress={onClose}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFF' }}>Close</Text>
          </TouchableOpacity>
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

  filterBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterBtnTextActive: {
    color: '#FFF',
  },

  sortBtn: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  sortBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sortBtnTextActive: {
    color: '#FFF',
  },

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
