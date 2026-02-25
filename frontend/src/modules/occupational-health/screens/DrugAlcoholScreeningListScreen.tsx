import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Dimensions,
  Modal, ActivityIndicator, RefreshControl, SafeAreaView, Switch, Animated
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ApiService from '../../../services/ApiService';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { WorkerSelectDropdown, Worker } from '../components/WorkerSelectDropdown';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

interface DrugAlcoholScreeningResult {
  id: string;
  worker_id: string;
  worker_name: string;
  employee_id?: string;
  test_date: string;
  test_type: 'Breath' | 'Blood' | 'Urine';
  alcohol_result: 'Negative' | 'Presumptive' | 'Positive';
  drug_result: 'Negative' | 'Presumptive' | 'Positive';
  fit_for_duty: boolean;
  specimens_tested?: string;
  notes?: string;
  status: 'normal' | 'warning' | 'critical';
  created_at: string;
}

export function DrugAlcoholScreeningListScreen() {
  const [results, setResults] = useState<DrugAlcoholScreeningResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DrugAlcoholScreeningResult | null>(null);
  
  // Search, filter, sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'normal' | 'warning' | 'critical'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');
  
  // Add form state
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<DrugAlcoholScreeningResult | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => setToastMsg(null));
  };

  const [formData, setFormData] = useState({
    test_date: new Date().toISOString().split('T')[0],
    test_type: 'Breath' as 'Breath' | 'Blood' | 'Urine',
    alcohol_result: 'Negative' as 'Negative' | 'Presumptive' | 'Positive',
    drug_result: 'Negative' as 'Negative' | 'Presumptive' | 'Positive',
    fit_for_duty: true,
    specimens_tested: '',
    notes: '',
  });
  
  // Edit form state
  const [editFormData, setEditFormData] = useState({
    test_date: '',
    test_type: 'Breath' as 'Breath' | 'Blood' | 'Urine',
    alcohol_result: 'Negative' as 'Negative' | 'Presumptive' | 'Positive',
    drug_result: 'Negative' as 'Negative' | 'Presumptive' | 'Positive',
    fit_for_duty: true,
    specimens_tested: '',
    notes: '',
  });

  React.useEffect(() => {
    loadResults();
  }, []);

  React.useEffect(() => {
    // Reset form when modal opens
    if (showAddModal) {
      setSelectedWorker(null);
      setFormData({
        test_date: new Date().toISOString().split('T')[0],
        test_type: 'Breath',
        alcohol_result: 'Negative',
        drug_result: 'Negative',
        fit_for_duty: true,
        specimens_tested: '',
        notes: '',
      });
    }
  }, [showAddModal]);

  const loadResults = async () => {
    setLoading(true);
    try {
      const api = ApiService.getInstance();
      const response = await api.get('/occupational-health/drug-alcohol-screening-results/');
      if (response.success && response.data) {
        let data = Array.isArray(response.data) ? response.data : response.data.results || [];
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
    if (!selectedWorker) {
      showToast('Veuillez sélectionner un travailleur', 'error');
      return;
    }
    if (!formData.test_date || !formData.test_type || !formData.alcohol_result || !formData.drug_result) {
      showToast('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const api = ApiService.getInstance();
      const payload = {
        worker_id: selectedWorker.id,
        test_date: formData.test_date,
        test_type: formData.test_type.toLowerCase(),
        alcohol_result: formData.alcohol_result.toLowerCase(),
        drug_result: formData.drug_result.toLowerCase(),
        fit_for_duty: formData.fit_for_duty,
        substances_tested: formData.specimens_tested || undefined,
        notes: formData.notes || undefined,
      };

      const response = await api.post('/occupational-health/drug-alcohol-screening-results/', payload);
      if (response.success) {
        showToast('Résultat de dépistage enregistré avec succès');
        setShowAddModal(false);
        setSelectedWorker(null);
        setFormData({
          test_date: new Date().toISOString().split('T')[0],
          test_type: 'Breath',
          alcohol_result: 'Negative',
          drug_result: 'Negative',
          fit_for_duty: true,
          specimens_tested: '',
          notes: '',
        });
        await loadResults();
      } else {
        showToast('Erreur lors de la création du résultat', 'error');
      }
    } catch (error) {
      console.error('Error creating screening result:', error);
      showToast('Une erreur est survenue', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (item: DrugAlcoholScreeningResult) => {
    setSelectedItem(item);
    setEditFormData({
      test_date: item.test_date || '',
      test_type: item.test_type || 'Breath',
      alcohol_result: item.alcohol_result || 'Negative',
      drug_result: item.drug_result || 'Negative',
      fit_for_duty: item.fit_for_duty || true,
      specimens_tested: item.specimens_tested || '',
      notes: item.notes || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;

    setSubmitting(true);
    try {
      const api = ApiService.getInstance();
      const patchData = {
        test_date: editFormData.test_date,
        test_type: editFormData.test_type.toLowerCase(),
        alcohol_result: editFormData.alcohol_result.toLowerCase(),
        drug_result: editFormData.drug_result.toLowerCase(),
        fit_for_duty: editFormData.fit_for_duty,
        substances_tested: editFormData.specimens_tested,
        notes: editFormData.notes,
      };

      const response = await api.patch(
        `/occupational-health/drug-alcohol-screening-results/${selectedItem.id}/`,
        patchData
      );

      if (response.success) {
        setResults(
          results.map(r =>
            r.id === selectedItem.id
              ? {
                  ...r,
                  test_date: editFormData.test_date,
                  test_type: editFormData.test_type as 'Breath' | 'Blood' | 'Urine',
                  alcohol_result: editFormData.alcohol_result as 'Negative' | 'Presumptive' | 'Positive',
                  drug_result: editFormData.drug_result as 'Negative' | 'Presumptive' | 'Positive',
                  fit_for_duty: editFormData.fit_for_duty,
                  substances_tested: editFormData.specimens_tested,
                  notes: editFormData.notes,
                }
              : r
          )
        );
        setShowEditModal(false);
        setSelectedItem(null);
        showToast('Résultat mis à jour avec succès');
      } else {
        showToast('Impossible de mettre à jour', 'error');
      }
    } catch (error) {
      console.error('Error updating:', error);
      showToast('Une erreur est survenue', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: DrugAlcoholScreeningResult) => {
    setDeleteConfirmItem(item);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmItem) return;
    setSubmitting(true);
    try {
      const api = ApiService.getInstance();
      const response = await api.delete(`/occupational-health/drug-alcohol-screening-results/${deleteConfirmItem.id}/`);
      if (response.success) {
        setResults(results.filter(r => r.id !== deleteConfirmItem.id));
        showToast('Résultat supprimé avec succès');
      } else {
        showToast('Impossible de supprimer', 'error');
      }
    } catch (error) {
      showToast('Impossible de supprimer', 'error');
    } finally {
      setDeleteConfirmItem(null);
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'normal' ? '#22C55E' : status === 'warning' ? '#F59E0B' : '#EF4444';
  };

  const getStatusLabel = (status: string) => {
    return status === 'normal' ? 'Normal' : status === 'warning' ? 'Attention' : 'Critique';
  };

  // Filter and sort results
  const filteredAndSorted = useMemo(() => {
    let result = results.filter(item => {
      const matchSearch = !searchQuery ||
        item.worker_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.employee_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.worker_id?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchFilter = filterStatus === 'all' || item.status === filterStatus;
      return matchSearch && matchFilter;
    });

    result.sort((a, b) => {
      if (sortBy === 'name') {
        return a.worker_name.localeCompare(b.worker_name);
      } else {
        return new Date(b.test_date).getTime() - new Date(a.test_date).getTime();
      }
    });

    return result;
  }, [results, searchQuery, filterStatus, sortBy]);

  const styles = StyleSheet.create({
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  confirmText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  toast: {
    position: 'absolute',
    bottom: 32,
    left: 24,
    right: 24,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 999,
  },
  toastText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
    container: { flex: 1, backgroundColor: colors.background },
    header: { padding: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.outline },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: '700', color: colors.text },
    addButton: { padding: spacing.md, borderRadius: borderRadius.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    searchSection: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.outline },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.outline, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, marginBottom: spacing.md },
    searchInput: { flex: 1, paddingVertical: spacing.md, color: colors.text },
    filterRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
    filterButton: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.outline },
    filterButtonActive: { backgroundColor: '#122056', borderColor: '#122056' },
    filterText: { fontSize: 12, fontWeight: '500', color: colors.text },
    filterTextActive: { color: '#FFF' },
    sortRow: { flexDirection: 'row', gap: spacing.md },
    sortButton: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.outline },
    sortButtonActive: { backgroundColor: '#122056', borderColor: '#122056' },
    sortText: { fontSize: 12, fontWeight: '500', color: colors.text },
    sortTextActive: { color: '#FFF' },
    contentSection: { flex: 1, padding: spacing.lg },
    resultCard: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', ...shadows.sm },
    resultCardLeft: { marginRight: spacing.md },
    statusIcon: { width: 50, height: 50, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
    resultCardCenter: { flex: 1 },
    resultWorkerName: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
    resultDate: { fontSize: 12, color: colors.textSecondary, marginBottom: spacing.xs },
    resultValues: { fontSize: 12, color: colors.textSecondary },
    resultCardRight: { alignItems: 'flex-end', gap: spacing.sm },
    statusBadge: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: borderRadius.md },
    statusBadgeText: { fontSize: 12, fontWeight: '600' },
    cardActions: { flexDirection: 'row', gap: spacing.sm },
    actionButton: { padding: spacing.sm },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl },
    emptyStateText: { fontSize: 16, color: colors.textSecondary, marginTop: spacing.md },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.lg, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
    modalTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
    formSection: { marginBottom: spacing.lg },
    formLabel: { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: spacing.sm, marginTop: spacing.md },
    input: { borderWidth: 1, borderColor: colors.outline, borderRadius: borderRadius.md, padding: spacing.md, fontSize: 14, color: colors.text, backgroundColor: colors.background },
    selectInput: {
      borderWidth: 1,
      borderColor: colors.outline,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.background,
    },
    switchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.outline,
      borderRadius: borderRadius.md,
      marginTop: spacing.sm,
    },
    submitButton: { marginTop: spacing.lg, marginBottom: spacing.md, paddingVertical: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },
    submitButtonText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
    buttonRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
    button: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },
    saveButton: { backgroundColor: '#122056' },
    cancelButton: { backgroundColor: colors.outline },
    buttonText: { fontWeight: '600', fontSize: 14 },
    cancelButtonText: { color: colors.text },
    saveButtonText: { color: '#FFF' },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Dépistage Alcool & Drogue</Text>
            </View>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: '#122056' }]}
              onPress={() => setShowAddModal(true)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
              <Text style={{ color: '#FFF', fontWeight: '600' }}>Ajouter</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchBox}>
            <MaterialCommunityIcons name="magnify" size={18} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher par nom, ID..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Filter Section */}
          <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textSecondary, marginBottom: spacing.sm }}>
            Filtrer par statut:
          </Text>
          <View style={styles.filterRow}>
            {(['all', 'normal', 'warning', 'critical'] as const).map(status => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterButton,
                  filterStatus === status && styles.filterButtonActive,
                ]}
                onPress={() => setFilterStatus(status)}
              >
                <Text
                  style={[
                    styles.filterText,
                    filterStatus === status && styles.filterTextActive,
                  ]}
                >
                  {status === 'all' ? 'Tous' : status === 'normal' ? 'Normal' : status === 'warning' ? 'Attention' : 'Critique'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sort Section */}
          <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.md }}>
            Trier par:
          </Text>
          <View style={styles.sortRow}>
            {(['recent', 'name'] as const).map(sort => (
              <TouchableOpacity
                key={sort}
                style={[
                  styles.sortButton,
                  sortBy === sort && styles.sortButtonActive,
                ]}
                onPress={() => setSortBy(sort)}
              >
                <Text
                  style={[
                    styles.sortText,
                    sortBy === sort && styles.sortTextActive,
                  ]}
                >
                  {sort === 'recent' ? 'Récent' : 'Nom'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Results List */}
        <View style={styles.contentSection}>
          {loading ? (
            <ActivityIndicator size="large" color="#122056" style={{ marginVertical: 40 }} />
          ) : filteredAndSorted.length > 0 ? (
            filteredAndSorted.map(result => (
              <View key={result.id} style={[styles.resultCard, shadows.sm]}>
                <View style={styles.resultCardLeft}>
                  <View style={[styles.statusIcon, { backgroundColor: getStatusColor(result.status) + '20' }]}>
                    <MaterialCommunityIcons name="flask-outline" size={24} color={getStatusColor(result.status)} />
                  </View>
                </View>

                <View style={styles.resultCardCenter}>
                  <Text style={styles.resultWorkerName}>{result.worker_name}</Text>
                  <Text style={styles.resultDate}>{new Date(result.test_date).toLocaleDateString('fr-FR')}</Text>
                  <Text style={styles.resultValues}>
                    Résultat: {result.alcohol_result} / {result.drug_result}
                  </Text>
                  {!result.fit_for_duty && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}>
                      <MaterialCommunityIcons name="alert-circle" size={12} color="#EF4444" />
                      <Text style={{ fontSize: 11, color: '#EF4444', marginLeft: spacing.xs }}>Non apte au travail</Text>
                    </View>
                  )}
                </View>

                <View style={styles.resultCardRight}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(result.status) + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(result.status) }]}>
                      {getStatusLabel(result.status)}
                    </Text>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleOpenEdit(result)}
                    >
                      <MaterialCommunityIcons name="pencil" size={18} color="#122056" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDelete(result)}
                    >
                      <MaterialCommunityIcons name="trash-can" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="flask-outline" size={48} color={colors.textSecondary + '40'} />
              <Text style={styles.emptyStateText}>Aucun résultat de dépistage</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '95%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter un dépistage</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
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

              <Text style={styles.formLabel}>Date du test</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={formData.test_date}
                onChangeText={(text) => setFormData({ ...formData, test_date: text })}
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.formLabel}>Type de test</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
                {(['Breath', 'Blood', 'Urine'] as const).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.selectInput,
                      { marginRight: spacing.md },
                      formData.test_type === type && { backgroundColor: '#122056' }
                    ]}
                    onPress={() => setFormData({ ...formData, test_type: type })}
                  >
                    <Text style={[{ fontSize: 12, fontWeight: '500', color: colors.text }, formData.test_type === type && { color: '#FFF' }]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.formLabel}>Résultat alcool</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
                {(['Negative', 'Presumptive', 'Positive'] as const).map(result => (
                  <TouchableOpacity
                    key={result}
                    style={[
                      styles.selectInput,
                      { marginRight: spacing.md },
                      formData.alcohol_result === result && { backgroundColor: '#122056' }
                    ]}
                    onPress={() => setFormData({ ...formData, alcohol_result: result })}
                  >
                    <Text style={[{ fontSize: 12, fontWeight: '500', color: colors.text }, formData.alcohol_result === result && { color: '#FFF' }]}>
                      {result}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.formLabel}>Résultat drogue</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
                {(['Negative', 'Presumptive', 'Positive'] as const).map(result => (
                  <TouchableOpacity
                    key={result}
                    style={[
                      styles.selectInput,
                      { marginRight: spacing.md },
                      formData.drug_result === result && { backgroundColor: '#122056' }
                    ]}
                    onPress={() => setFormData({ ...formData, drug_result: result })}
                  >
                    <Text style={[{ fontSize: 12, fontWeight: '500', color: colors.text }, formData.drug_result === result && { color: '#FFF' }]}>
                      {result}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.formLabel}>Apte au travail</Text>
              <View style={styles.switchContainer}>
                <Text style={{ color: colors.text }}>Non</Text>
                <Switch
                  value={formData.fit_for_duty}
                  onValueChange={(value) => setFormData({ ...formData, fit_for_duty: value })}
                  trackColor={{ false: '#CCCCCC', true: '#122056' }}
                  thumbColor={formData.fit_for_duty ? '#FFF' : '#999'}
                />
                <Text style={{ color: colors.text }}>Oui</Text>
              </View>

              <Text style={styles.formLabel}>Spécimens testés</Text>
              <TextInput
                style={styles.input}
                placeholder="Détails des spécimens..."
                value={formData.specimens_tested}
                onChangeText={(text) => setFormData({ ...formData, specimens_tested: text })}
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

              <TouchableOpacity style={[styles.submitButton, { backgroundColor: '#122056' }]} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>Enregistrer</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier le dépistage</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formSection}>
              <Text style={styles.formLabel}>Date du test</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={editFormData.test_date}
                onChangeText={(text) => setEditFormData({ ...editFormData, test_date: text })}
              />

              <Text style={styles.formLabel}>Type de test</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
                {(['Breath', 'Blood', 'Urine'] as const).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.selectInput,
                      { marginRight: spacing.md },
                      editFormData.test_type === type && { backgroundColor: '#122056' }
                    ]}
                    onPress={() => setEditFormData({ ...editFormData, test_type: type })}
                  >
                    <Text style={[{ fontSize: 12, fontWeight: '500', color: colors.text }, editFormData.test_type === type && { color: '#FFF' }]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.formLabel}>Résultat alcool</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
                {(['Negative', 'Presumptive', 'Positive'] as const).map(result => (
                  <TouchableOpacity
                    key={result}
                    style={[
                      styles.selectInput,
                      { marginRight: spacing.md },
                      editFormData.alcohol_result === result && { backgroundColor: '#122056' }
                    ]}
                    onPress={() => setEditFormData({ ...editFormData, alcohol_result: result })}
                  >
                    <Text style={[{ fontSize: 12, fontWeight: '500', color: colors.text }, editFormData.alcohol_result === result && { color: '#FFF' }]}>
                      {result}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.formLabel}>Résultat drogue</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
                {(['Negative', 'Presumptive', 'Positive'] as const).map(result => (
                  <TouchableOpacity
                    key={result}
                    style={[
                      styles.selectInput,
                      { marginRight: spacing.md },
                      editFormData.drug_result === result && { backgroundColor: '#122056' }
                    ]}
                    onPress={() => setEditFormData({ ...editFormData, drug_result: result })}
                  >
                    <Text style={[{ fontSize: 12, fontWeight: '500', color: colors.text }, editFormData.drug_result === result && { color: '#FFF' }]}>
                      {result}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.formLabel}>Apte au travail</Text>
              <View style={styles.switchContainer}>
                <Text style={{ color: colors.text }}>Non</Text>
                <Switch
                  value={editFormData.fit_for_duty}
                  onValueChange={(value) => setEditFormData({ ...editFormData, fit_for_duty: value })}
                  trackColor={{ false: '#CCCCCC', true: '#122056' }}
                  thumbColor={editFormData.fit_for_duty ? '#FFF' : '#999'}
                />
                <Text style={{ color: colors.text }}>Oui</Text>
              </View>

              <Text style={styles.formLabel}>Spécimens testés</Text>
              <TextInput
                style={styles.input}
                placeholder="Détails des spécimens..."
                value={editFormData.specimens_tested}
                onChangeText={(text) => setEditFormData({ ...editFormData, specimens_tested: text })}
              />

              <Text style={styles.formLabel}>Notes</Text>
              <TextInput
                style={[styles.input, { minHeight: 80 }]}
                placeholder="Remarques supplémentaires..."
                multiline
                value={editFormData.notes}
                onChangeText={(text) => setEditFormData({ ...editFormData, notes: text })}
              />

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setShowEditModal(false)}
                >
                  <Text style={[styles.buttonText, styles.cancelButtonText]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleSaveEdit}
                >
                  <Text style={[styles.buttonText, styles.saveButtonText]}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
