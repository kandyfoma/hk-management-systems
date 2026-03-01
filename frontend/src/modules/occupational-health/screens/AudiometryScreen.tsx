import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Dimensions,
  Modal, Alert, FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store/store';
import ApiService from '../../../services/ApiService';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { WorkerSelectDropdown, Worker } from '../components/WorkerSelectDropdown';
import { ExamSelectDropdown, Exam } from '../components/ExamSelectDropdown';
import { useSimpleToast } from '../../../hooks/useSimpleToast';
import { SimpleToastNotification } from '../../../components/SimpleToastNotification';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const ACCENT = '#122056'; // Audiometry Primary Blue

interface AudiometryResult {
  id: string;
  worker_id: string;
  worker_name: string;
  test_date: string;
  left_ear_db: number;
  right_ear_db: number;
  frequency: number;
  status: 'normal' | 'warning' | 'critical';
  notes?: string;
  created_at: string;
}

const SAMPLE_RESULTS: AudiometryResult[] = [
  {
    id: '1', worker_id: 'w1', worker_name: 'Jean-Pierre Kabongo',
    test_date: '2025-02-20', left_ear_db: 15, right_ear_db: 18,
    frequency: 4000, status: 'normal', notes: 'Audition normale', created_at: '2025-02-20T10:00:00Z',
  },
  {
    id: '2', worker_id: 'w2', worker_name: 'Patrick Lukusa',
    test_date: '2025-02-19', left_ear_db: 45, right_ear_db: 42,
    frequency: 4000, status: 'warning', notes: 'Baisse auditive détectée', created_at: '2025-02-19T14:00:00Z',
  },
];

export function AudiometryScreen() {
  const authUser = useSelector((state: RootState) => state.auth.user);
  const { toastMsg, showToast } = useSimpleToast();
  const [results, setResults] = useState<AudiometryResult[]>(SAMPLE_RESULTS);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'normal' | 'warning' | 'critical'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState<AudiometryResult | null>(null);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [formData, setFormData] = useState({
    test_date: new Date().toISOString().split('T')[0],
    left_ear_db: '',
    right_ear_db: '',
    frequency: '4000',
    notes: '',
  });

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const api = ApiService.getInstance();
      const response = await api.get('/occupational-health/audiometry-results/');
      if (response.success && response.data) {
        let data = Array.isArray(response.data) ? response.data : response.data.results || [];
        // Sort by test_date descending (most recent first) and limit to 5
        data = data
          .sort((a: any, b: any) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime())
          .slice(0, 5);
        setResults(data);
      }
    } catch (error) {
      console.error('Error loading audiometry results:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadResults();
    setRefreshing(false);
  };

  const handleSubmit = async () => {
    if (!selectedWorker || !formData.left_ear_db || !formData.right_ear_db) {
      showToast('Veuillez remplir tous les champs', 'error');
      return;
    }

    try {
      const api = ApiService.getInstance();
      
      const newResult = {
        worker_id_input: selectedWorker.id,
        examination: selectedExam?.id ?? null,
        test_date: formData.test_date,
        left_ear_500hz: parseInt(formData.left_ear_db),
        right_ear_500hz: parseInt(formData.right_ear_db),
        notes: formData.notes,
        performed_by: authUser?.id ? Number(authUser.id) : undefined,
      };

      const response = await api.post('/occupational-health/audiometry-results/', newResult);
      if (response.success) {
        setResults([...results, response.data]);
        setShowAddModal(false);
        setSelectedWorker(null);
        setSelectedExam(null);
        setFormData({
          test_date: new Date().toISOString().split('T')[0],
          left_ear_db: '',
          right_ear_db: '',
          frequency: '4000',
          notes: '',
        });
        showToast('Résultat d\'audiométrie enregistré', 'success');
        loadResults();
      }
    } catch (error) {
      console.error('Error creating audiometry result:', error);
      showToast('Impossible d\'enregistrer le résultat', 'error');
    }
  };

  const filtered = useMemo(() => results.filter(r => {
    const q = searchQuery.toLowerCase();
    const matchQ = !q || r.worker_name.toLowerCase().includes(q);
    const matchS = filterStatus === 'all' || r.status === filterStatus;
    return matchQ && matchS;
  }), [results, searchQuery, filterStatus]);

  const getStatusColor = (status: string) => {
    return status === 'normal' ? '#22C55E' : status === 'warning' ? '#F59E0B' : '#EF4444';
  };

  const getStatusLabel = (status: string) => {
    return status === 'normal' ? 'Normal' : status === 'warning' ? 'Attention' : 'Critique';
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.screenTitle}>Audiométrie</Text>
            <Text style={styles.screenSubtitle}>Tests auditifs et historique</Text>
          </View>
          <TouchableOpacity
            style={[styles.fabButton, { backgroundColor: ACCENT }]}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Search & Filter */}
        <View style={styles.searchSection}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher par nom..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.md }}>
            {['all', 'normal', 'warning', 'critical'].map(status => (
              <TouchableOpacity
                key={status}
                onPress={() => setFilterStatus(status as any)}
                style={[
                  styles.filterChip,
                  filterStatus === status && { backgroundColor: ACCENT },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterStatus === status && { color: 'white', fontWeight: '600' },
                  ]}
                >
                  {status === 'all' ? 'Tous' : getStatusLabel(status)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content */}
        <View style={styles.contentSection}>
          {loading ? (
            <ActivityIndicator size="large" color={ACCENT} style={{ marginVertical: 40 }} />
          ) : filtered.length > 0 ? (
            filtered.map(result => (
              <TouchableOpacity
                key={result.id}
                style={[styles.resultCard, shadows.sm]}
                onPress={() => {
                  setSelectedResult(result);
                  setShowDetail(true);
                }}
              >
                <View style={styles.resultCardLeft}>
                  <View style={[styles.statusIcon, { backgroundColor: getStatusColor(result.status) + '20' }]}>
                    <Ionicons name="volume-high" size={24} color={getStatusColor(result.status)} />
                  </View>
                </View>

                <View style={styles.resultCardCenter}>
                  <Text style={styles.resultWorkerName}>{result.worker_name}</Text>
                  <Text style={styles.resultDate}>{new Date(result.test_date).toLocaleDateString('fr-FR')}</Text>
                  <View style={styles.dbValues}>
                    <Text style={styles.dbText}>OG: {result.left_ear_db} dB | OD: {result.right_ear_db} dB</Text>
                  </View>
                </View>

                <View style={styles.resultCardRight}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(result.status) + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(result.status) }]}>
                      {getStatusLabel(result.status)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="volume-high-outline" size={48} color={colors.textSecondary + '40'} />
              <Text style={styles.emptyStateText}>Aucun résultat d'audiométrie</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter un résultat d'audiométrie</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formSection}>
              <WorkerSelectDropdown
                value={selectedWorker}
                onChange={setSelectedWorker}
                label="Travailleur"
                placeholder="Sélectionnez un travailleur"
                error={selectedWorker === null ? 'Travailleur requis' : undefined}
              />

              <ExamSelectDropdown
                value={selectedExam}
                onChange={setSelectedExam}
                label="Lier à une visite médicale (optionnel)"
                placeholder="Choisir un examen..."
                workerId={selectedWorker?.id ?? null}
              />

              <Text style={styles.formLabel}>Date du test</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={formData.test_date}
                onChangeText={(text) => setFormData({ ...formData, test_date: text })}
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.formLabel}>Audition OG (dB)</Text>
              <TextInput
                style={styles.input}
                placeholder="0-120"
                keyboardType="decimal-pad"
                value={formData.left_ear_db}
                onChangeText={(text) => setFormData({ ...formData, left_ear_db: text })}
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.formLabel}>Audition OD (dB)</Text>
              <TextInput
                style={styles.input}
                placeholder="0-120"
                keyboardType="decimal-pad"
                value={formData.right_ear_db}
                onChangeText={(text) => setFormData({ ...formData, right_ear_db: text })}
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.formLabel}>Fréquence (Hz)</Text>
              <TextInput
                style={styles.input}
                placeholder="500, 1000, 2000, 4000"
                keyboardType="number-pad"
                value={formData.frequency}
                onChangeText={(text) => setFormData({ ...formData, frequency: text })}
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.formLabel}>Notes</Text>
              <TextInput
                style={[styles.input, { minHeight: 80 }]}
                placeholder="Remarques supplémentaires..."
                multiline
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                placeholderTextColor={colors.textSecondary}
              />

              <TouchableOpacity style={[styles.submitButton, { backgroundColor: ACCENT }]} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>Enregistrer</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      {selectedResult && (
        <Modal visible={showDetail} transparent animationType="fade" onRequestClose={() => setShowDetail(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Détails de l'audiométrie</Text>
                <TouchableOpacity onPress={() => setShowDetail(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.detailSection}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Travailleur</Text>
                  <Text style={styles.detailValue}>{selectedResult.worker_name}</Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date du test</Text>
                  <Text style={styles.detailValue}>{new Date(selectedResult.test_date).toLocaleDateString('fr-FR')}</Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Audition OG</Text>
                  <Text style={styles.detailValue}>{selectedResult.left_ear_db} dB</Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Audition OD</Text>
                  <Text style={styles.detailValue}>{selectedResult.right_ear_db} dB</Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Fréquence</Text>
                  <Text style={styles.detailValue}>{selectedResult.frequency} Hz</Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Statut</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedResult.status) + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(selectedResult.status) }]}>
                      {getStatusLabel(selectedResult.status)}
                    </Text>
                  </View>
                </View>

                {selectedResult.notes && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Notes</Text>
                      <Text style={styles.detailValue}>{selectedResult.notes}</Text>
                    </View>
                  </>
                )}
              </ScrollView>

              <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.surfaceVariant }]} onPress={() => setShowDetail(false)}>
                <Text style={[styles.closeButtonText, { color: colors.text }]}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
      <SimpleToastNotification message={toastMsg} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  fabButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  searchSection: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    color: colors.text,
    fontSize: 14,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    marginRight: spacing.sm,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontWeight: '500',
    fontSize: 12,
  },
  contentSection: {
    paddingHorizontal: spacing.md,
    paddingBottom: 40,
  },
  resultCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  resultCardLeft: {
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultCardCenter: {
    flex: 1,
  },
  resultWorkerName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  resultDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  dbValues: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  dbText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  resultCardRight: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingBottom: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  formSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
  },
  submitButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  detailSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.outline,
  },
  closeButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  closeButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
});
