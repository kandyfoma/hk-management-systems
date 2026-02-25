import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  Modal, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../../../services/ApiService';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { WorkerSelectDropdown, Worker } from '../components/WorkerSelectDropdown';
import { ExamSelectDropdown, Exam } from '../components/ExamSelectDropdown';
const ACCENT = colors.primary;
const themeColors = { border: '#E2E8F0' };


interface XrayImagingResult {
  id: string;
  worker_id: string;
  worker_name: string;
  exam_type: string;
  exam_date: string;
  imaging_findings: string;
  radiologist_notes: string;
  result_status: 'normal' | 'abnormal' | 'pending';
  file_path?: string;
  created_at: string;
}

const SAMPLE_RESULTS: XrayImagingResult[] = [
  {
    id: '1', worker_id: 'w1', worker_name: 'Jean-Pierre Kabongo',
    exam_type: 'Radiographie thoracique', exam_date: '2025-02-15',
    imaging_findings: 'Poumons clairs', radiologist_notes: 'Aucune anomalie détectée',
    result_status: 'normal', file_path: '/imaging/1.dcm', created_at: '2025-02-15T10:00:00Z',
  },
  {
    id: '2', worker_id: 'w2', worker_name: 'Patrick Lukusa',
    exam_type: 'Radiographie thoracique', exam_date: '2025-02-20',
    imaging_findings: 'Opacités légères', radiologist_notes: 'À vérifier lors du suivi',
    result_status: 'abnormal', file_path: '/imaging/2.dcm', created_at: '2025-02-20T14:30:00Z',
  },
];

export function XrayImagingScreen() {
  const [results, setResults] = useState<XrayImagingResult[]>(SAMPLE_RESULTS);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'normal' | 'abnormal' | 'pending'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState<XrayImagingResult | null>(null);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [formData, setFormData] = useState({
    exam_type: '',
    exam_date: new Date().toISOString().split('T')[0],
    imaging_findings: '',
    radiologist_notes: '',
  });

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const api = ApiService.getInstance();
      const response = await api.get('/occupational-health/xray-imaging/');
      if (response.success && response.data) {
        let data = Array.isArray(response.data) ? response.data : response.data.results || [];
        // Sort by imaging_date descending (most recent first) and limit to 5
        data = data
          .sort((a: any, b: any) => new Date(b.imaging_date || b.test_date).getTime() - new Date(a.imaging_date || a.test_date).getTime())
          .slice(0, 5);
        setResults(data);
      }
    } catch (error) {
      console.error('Error loading X-ray imaging results:', error);
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
    if (!selectedWorker || !formData.exam_type || !formData.imaging_findings) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    try {
      const api = ApiService.getInstance();

      const newResult = {
        worker_id_input: selectedWorker.id,
        examination: selectedExam?.id ?? null,
        exam_type: formData.exam_type,
        exam_date: formData.exam_date,
        imaging_findings: formData.imaging_findings,
        radiologist_notes: formData.radiologist_notes,
        result_status: 'pending',
      };

      const response = await api.post('/occupational-health/xray-imaging/', newResult);
      if (response.success) {
        setResults([...results, response.data]);
        setShowAddModal(false);
        setSelectedWorker(null);
        setSelectedExam(null);
        setFormData({
          exam_type: '',
          exam_date: new Date().toISOString().split('T')[0],
          imaging_findings: '',
          radiologist_notes: '',
        });
        Alert.alert('Succès', 'Résultat imagerie ajouté');
        loadResults();
      }
    } catch (error) {
      console.error('Error creating X-ray imaging result:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer le résultat');
    }
  };

  const filtered = useMemo(() => results.filter(r => {
    const q = searchQuery.toLowerCase();
    const matchQ = !q || r.worker_name.toLowerCase().includes(q) || r.exam_type.toLowerCase().includes(q);
    const matchS = filterStatus === 'all' || r.result_status === filterStatus;
    return matchQ && matchS;
  }), [results, searchQuery, filterStatus]);

  const getStatusColor = (status: string) => {
    return status === 'normal' ? '#22C55E' : status === 'abnormal' ? '#EF4444' : '#F59E0B';
  };

  const getStatusLabel = (status: string) => {
    return status === 'normal' ? 'Normal' : status === 'abnormal' ? 'Anormal' : 'En attente';
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
            <Text style={styles.screenTitle}>Imagerie Radiologique</Text>
            <Text style={styles.screenSubtitle}>Résultats radiographiques</Text>
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
              placeholder="Rechercher..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.md }}>
            {['all', 'normal', 'abnormal', 'pending'].map(status => (
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
                style={[styles.resultCard, shadows.sm, result.result_status === 'abnormal' && { borderLeftWidth: 4, borderLeftColor: '#EF4444' }]}
                onPress={() => {
                  setSelectedResult(result);
                  setShowDetail(true);
                }}
              >
                <View style={styles.resultCardLeft}>
                  <View style={[styles.statusIcon, { backgroundColor: getStatusColor(result.result_status) + '20' }]}>
                    <Ionicons name="image" size={24} color={getStatusColor(result.result_status)} />
                  </View>
                </View>

                <View style={styles.resultCardCenter}>
                  <Text style={styles.resultWorkerName}>{result.worker_name}</Text>
                  <Text style={styles.examType}>{result.exam_type}</Text>
                  <View style={styles.dateBox}>
                    <Ionicons name="calendar-outline" size={11} color={colors.textSecondary} />
                    <Text style={styles.dateText}>{new Date(result.exam_date).toLocaleDateString('fr-FR')}</Text>
                  </View>
                </View>

                <View style={styles.resultCardRight}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(result.result_status) + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(result.result_status) }]}>
                      {getStatusLabel(result.result_status)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="image-outline" size={48} color={colors.textSecondary + '40'} />
              <Text style={styles.emptyStateText}>Aucun résultat d'imagerie</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter résultat imagerie</Text>
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

              <Text style={styles.formLabel}>Type d'examen</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Radiographie thoracique"
                value={formData.exam_type}
                onChangeText={(text) => setFormData({ ...formData, exam_type: text })}
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.formLabel}>Date de l'examen</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={formData.exam_date}
                onChangeText={(text) => setFormData({ ...formData, exam_date: text })}
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.formLabel}>Findings d'imagerie</Text>
              <TextInput
                style={[styles.input, { minHeight: 60 }]}
                placeholder="Décrire les findings..."
                multiline
                value={formData.imaging_findings}
                onChangeText={(text) => setFormData({ ...formData, imaging_findings: text })}
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.formLabel}>Notes du radiologue</Text>
              <TextInput
                style={[styles.input, { minHeight: 60 }]}
                placeholder="Notes cliniques..."
                multiline
                value={formData.radiologist_notes}
                onChangeText={(text) => setFormData({ ...formData, radiologist_notes: text })}
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
                <Text style={styles.modalTitle}>Détails imagerie radiologique</Text>
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
                  <Text style={styles.detailLabel}>Type d'examen</Text>
                  <Text style={styles.detailValue}>{selectedResult.exam_type}</Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date d'examen</Text>
                  <Text style={styles.detailValue}>{new Date(selectedResult.exam_date).toLocaleDateString('fr-FR')}</Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Statut</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedResult.result_status) + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(selectedResult.result_status) }]}>
                      {getStatusLabel(selectedResult.result_status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Findings d'imagerie</Text>
                  <Text style={[styles.detailValue, { marginTop: spacing.sm }]}>{selectedResult.imaging_findings}</Text>
                </View>

                {selectedResult.radiologist_notes && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Notes du radiologue</Text>
                      <Text style={[styles.detailValue, { marginTop: spacing.sm }]}>{selectedResult.radiologist_notes}</Text>
                    </View>
                  </>
                )}

                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Créé le</Text>
                  <Text style={styles.detailValue}>{new Date(selectedResult.created_at).toLocaleDateString('fr-FR')}</Text>
                </View>
              </ScrollView>

              <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.surfaceVariant }]} onPress={() => setShowDetail(false)}>
                <Text style={[styles.closeButtonText, { color: colors.text }]}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
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
  examType: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  dateBox: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
    marginLeft: 4,
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
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
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
