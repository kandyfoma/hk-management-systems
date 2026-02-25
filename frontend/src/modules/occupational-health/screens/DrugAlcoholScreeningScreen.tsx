import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  Modal, Alert, ActivityIndicator, RefreshControl, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../../../services/ApiService';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { WorkerSelectDropdown, Worker } from '../components/WorkerSelectDropdown';

const ACCENT = colors.primary;
const themeColors = { border: '#E2E8F0' };


interface DrugAlcoholScreeningResult {
  id: string;
  worker_id: string;
  worker_name: string;
  screening_date: string;
  alcohol_test: boolean;
  drug_test: boolean;
  alcohol_level?: number;
  drug_result: string;
  overall_status: 'negative' | 'positive' | 'inconclusive';
  follow_up_required: boolean;
  notes?: string;
  created_at: string;
}

const SAMPLE_RESULTS: DrugAlcoholScreeningResult[] = [
  {
    id: '1', worker_id: 'w1', worker_name: 'Jean-Pierre Kabongo',
    screening_date: '2025-02-18', alcohol_test: true, drug_test: true,
    alcohol_level: 0, drug_result: 'Négatif', overall_status: 'negative',
    follow_up_required: false, notes: 'Résultats normaux', created_at: '2025-02-18T09:00:00Z',
  },
  {
    id: '2', worker_id: 'w2', worker_name: 'Patrick Lukusa',
    screening_date: '2025-02-19', alcohol_test: true, drug_test: true,
    alcohol_level: 45, drug_result: 'À vérifier', overall_status: 'inconclusive',
    follow_up_required: true, notes: 'Second test recommandé', created_at: '2025-02-19T10:30:00Z',
  },
];

export function DrugAlcoholScreeningScreen() {
  const [results, setResults] = useState<DrugAlcoholScreeningResult[]>(SAMPLE_RESULTS);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'negative' | 'positive' | 'inconclusive'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState<DrugAlcoholScreeningResult | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [formData, setFormData] = useState({
    screening_date: new Date().toISOString().split('T')[0],
    alcohol_test: true,
    drug_test: true,
    alcohol_level: '',
    drug_result: '',
    notes: '',
  });

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const api = ApiService.getInstance();
      const response = await api.get('/occupational-health/drug-alcohol-screening/');
      if (response.success && response.data) {
        let data = Array.isArray(response.data) ? response.data : response.data.results || [];
        // Sort by test_date descending (most recent first) and limit to 5
        data = data
          .sort((a: any, b: any) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime())
          .slice(0, 5);
        setResults(data);
      }
    } catch (error) {
      console.error('Error loading drug/alcohol screening results:', error);
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
    if (!selectedWorker || (!formData.alcohol_test && !formData.drug_test)) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs requis');
      return;
    }

    try {
      const api = ApiService.getInstance();

      const newResult = {
        worker_id_input: selectedWorker.id,
        screening_date: formData.screening_date,
        alcohol_test: formData.alcohol_test,
        drug_test: formData.drug_test,
        alcohol_level: formData.alcohol_test && formData.alcohol_level ? parseFloat(formData.alcohol_level) : null,
        drug_result: formData.drug_test ? formData.drug_result : '',
        overall_status: 'negative' as const,
        follow_up_required: false,
        notes: formData.notes,
      };

      const response = await api.post('/occupational-health/drug-alcohol-screening/', newResult);
      if (response.success) {
        setResults([...results, response.data]);
        setShowAddModal(false);
        setSelectedWorker(null);
        setFormData({
          screening_date: new Date().toISOString().split('T')[0],
          alcohol_test: true,
          drug_test: true,
          alcohol_level: '',
          drug_result: '',
          notes: '',
        });
        Alert.alert('Succès', 'Résultat de dépistage ajouté');
        loadResults();
      }
    } catch (error) {
      console.error('Error creating drug/alcohol screening result:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer le résultat');
    }
  };

  const filtered = useMemo(() => results.filter(r => {
    const q = searchQuery.toLowerCase();
    const matchQ = !q || r.worker_name.toLowerCase().includes(q);
    const matchS = filterStatus === 'all' || r.overall_status === filterStatus;
    return matchQ && matchS;
  }), [results, searchQuery, filterStatus]);

  const getStatusColor = (status: string) => {
    return status === 'negative' ? '#22C55E' : status === 'inconclusive' ? '#F59E0B' : '#EF4444';
  };

  const getStatusLabel = (status: string) => {
    return status === 'negative' ? 'Négatif' : status === 'inconclusive' ? 'Incertain' : 'Positif';
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
            <Text style={styles.screenTitle}>Dépistage D/A</Text>
            <Text style={styles.screenSubtitle}>Dépistage drogue et alcool</Text>
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
            {['all', 'negative', 'inconclusive', 'positive'].map(status => (
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
                style={[styles.resultCard, shadows.sm, result.overall_status === 'positive' && { borderLeftWidth: 4, borderLeftColor: '#EF4444' }]}
                onPress={() => {
                  setSelectedResult(result);
                  setShowDetail(true);
                }}
              >
                <View style={styles.resultCardLeft}>
                  <View style={[styles.statusIcon, { backgroundColor: getStatusColor(result.overall_status) + '20' }]}>
                    <Ionicons name="alert-circle" size={24} color={getStatusColor(result.overall_status)} />
                  </View>
                </View>

                <View style={styles.resultCardCenter}>
                  <Text style={styles.resultWorkerName}>{result.worker_name}</Text>
                  <View style={styles.testBadges}>
                    {result.alcohol_test && (
                      <View style={styles.testBadge}>
                        <Text style={styles.testBadgeText}>Alcool</Text>
                      </View>
                    )}
                    {result.drug_test && (
                      <View style={styles.testBadge}>
                        <Text style={styles.testBadgeText}>Drogue</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.dateBox}>
                    <Ionicons name="calendar-outline" size={11} color={colors.textSecondary} />
                    <Text style={styles.dateText}>{new Date(result.screening_date).toLocaleDateString('fr-FR')}</Text>
                  </View>
                </View>

                <View style={styles.resultCardRight}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(result.overall_status) + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(result.overall_status) }]}>
                      {getStatusLabel(result.overall_status)}
                    </Text>
                  </View>
                  {result.follow_up_required && (
                    <View style={styles.followUpBadge}>
                      <Ionicons name="alert" size={12} color="#F59E0B" />
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary + '40'} />
              <Text style={styles.emptyStateText}>Aucun résultat de dépistage</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter résultat dépistage</Text>
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

              <Text style={styles.formLabel}>Date du dépistage</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={formData.screening_date}
                onChangeText={(text) => setFormData({ ...formData, screening_date: text })}
                placeholderTextColor={colors.textSecondary}
              />

              <View style={styles.switchSection}>
                <View style={styles.switchRow}>
                  <Text style={styles.formLabel}>Test d'alcool</Text>
                  <Switch
                    value={formData.alcohol_test}
                    onValueChange={(value) => setFormData({ ...formData, alcohol_test: value })}
                    trackColor={{ false: colors.outline, true: ACCENT + '80' }}
                    thumbColor={formData.alcohol_test ? ACCENT : colors.textSecondary}
                  />
                </View>

                {formData.alcohol_test && (
                  <TextInput
                    style={[styles.input, { marginTop: spacing.md }]}
                    placeholder="Niveau d'alcool (mg/100ml)"
                    keyboardType="decimal-pad"
                    value={formData.alcohol_level}
                    onChangeText={(text) => setFormData({ ...formData, alcohol_level: text })}
                    placeholderTextColor={colors.textSecondary}
                  />
                )}

                <View style={styles.switchRow}>
                  <Text style={styles.formLabel}>Test de drogue</Text>
                  <Switch
                    value={formData.drug_test}
                    onValueChange={(value) => setFormData({ ...formData, drug_test: value })}
                    trackColor={{ false: colors.outline, true: ACCENT + '80' }}
                    thumbColor={formData.drug_test ? ACCENT : colors.textSecondary}
                  />
                </View>

                {formData.drug_test && (
                  <TextInput
                    style={[styles.input, { marginTop: spacing.md }]}
                    placeholder="Résultat (Négatif/Positif/À vérifier)"
                    value={formData.drug_result}
                    onChangeText={(text) => setFormData({ ...formData, drug_result: text })}
                    placeholderTextColor={colors.textSecondary}
                  />
                )}
              </View>

              <Text style={styles.formLabel}>Notes</Text>
              <TextInput
                style={[styles.input, { minHeight: 60 }]}
                placeholder="Notes additionnelles..."
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
                <Text style={styles.modalTitle}>Détails dépistage</Text>
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
                  <Text style={styles.detailLabel}>Date de dépistage</Text>
                  <Text style={styles.detailValue}>{new Date(selectedResult.screening_date).toLocaleDateString('fr-FR')}</Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Statut global</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedResult.overall_status) + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(selectedResult.overall_status) }]}>
                      {getStatusLabel(selectedResult.overall_status)}
                    </Text>
                  </View>
                </View>

                {selectedResult.alcohol_test && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Test d'alcool</Text>
                      <Text style={styles.detailValue}>Effectué</Text>
                    </View>
                    {selectedResult.alcohol_level !== undefined && selectedResult.alcohol_level !== null && (
                      <>
                        <View style={styles.divider} />
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Niveau d'alcool</Text>
                          <Text style={styles.detailValue}>{selectedResult.alcohol_level} mg/100ml</Text>
                        </View>
                      </>
                    )}
                  </>
                )}

                {selectedResult.drug_test && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Test de drogue</Text>
                      <Text style={styles.detailValue}>{selectedResult.drug_result}</Text>
                    </View>
                  </>
                )}

                {selectedResult.follow_up_required && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Suivi requis</Text>
                      <Text style={[styles.detailValue, { color: '#F59E0B' }]}>Oui</Text>
                    </View>
                  </>
                )}

                {selectedResult.notes && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Notes</Text>
                      <Text style={[styles.detailValue, { marginTop: spacing.sm }]}>{selectedResult.notes}</Text>
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
    marginBottom: 4,
  },
  testBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: 6,
  },
  testBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  testBadgeText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
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
    gap: spacing.xs,
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
  followUpBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F59E0B20',
    alignItems: 'center',
    justifyContent: 'center',
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
  switchSection: {
    marginTop: spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
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
