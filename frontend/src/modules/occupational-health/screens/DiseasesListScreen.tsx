import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, RefreshControl, SafeAreaView, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../../../services/ApiService';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { WorkerSelectDropdown, Worker } from '../components/WorkerSelectDropdown';

interface DiseaseResult {
  id: string;
  worker_id: string;
  worker_name: string;
  employee_id?: string;
  diagnosis_date: string;
  disease: string;
  severity: string;
  exposure_type: string;
  notes?: string;
  status: 'normal' | 'warning' | 'critical';
  created_at: string;
}

export function DiseasesListScreen() {
  const [results, setResults] = useState<DiseaseResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DiseaseResult | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'normal' | 'warning' | 'critical'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'status'>('recent');
  
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<DiseaseResult | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => setToastMsg(null));
  };

  const [formData, setFormData] = useState({
    diagnosis_date: new Date().toISOString().split('T')[0],
    disease: '',
    severity: '',
    exposure_type: '',
    notes: '',
  });
  
  const [editFormData, setEditFormData] = useState({
    diagnosis_date: '',
    disease: '',
    severity: '',
    exposure_type: '',
    notes: '',
  });

  React.useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const api = ApiService.getInstance();
      const response = await api.get('/occupational-health/occupational-diseases-results/');
      if (response.success && response.data) {
        let data = Array.isArray(response.data) ? response.data : response.data.results || [];
        data = data
          .sort((a: any, b: any) => new Date(b.diagnosis_date).getTime() - new Date(a.diagnosis_date).getTime())
          .slice(0, 5);
        setResults(data);
      }
    } catch (error) {
      console.error('Error loading occupational diseases results:', error);
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
    if (!formData.diagnosis_date || !formData.disease || !formData.severity || !formData.exposure_type) {
      showToast('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const api = ApiService.getInstance();
      const payload = {
        worker_id: selectedWorker.id,
        diagnosis_date: formData.diagnosis_date,
        disease: formData.disease,
        severity: formData.severity,
        exposure_type: formData.exposure_type,
        notes: formData.notes,
      };

      const response = await api.post('/occupational-health/occupational-diseases-results/', payload);
      if (response.success) {
        showToast('Maladie professionnelle enregistrée avec succès');
        setShowAddModal(false);
        setSelectedWorker(null);
        setFormData({
          diagnosis_date: new Date().toISOString().split('T')[0],
          disease: '',
          severity: '',
          exposure_type: '',
          notes: '',
        });
        await loadResults();
      } else {
        showToast('Erreur lors de la creation', 'error');
      }
    } catch (error) {
      console.error('Error creating disease result:', error);
      showToast('Une erreur est survenue', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (item: DiseaseResult) => {
    setSelectedItem(item);
    setEditFormData({
      diagnosis_date: item.diagnosis_date || '',
      disease: item.disease || '',
      severity: item.severity || '',
      exposure_type: item.exposure_type || '',
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
        diagnosis_date: editFormData.diagnosis_date,
        disease: editFormData.disease,
        severity: editFormData.severity,
        exposure_type: editFormData.exposure_type,
        notes: editFormData.notes,
      };

      const response = await api.patch(
        `/occupational-health/occupational-diseases-results/${selectedItem.id}/`,
        patchData
      );

      if (response.success) {
        setResults(
          results.map(r =>
            r.id === selectedItem.id ? { ...r, ...patchData } : r
          )
        );
        setShowEditModal(false);
        setSelectedItem(null);
        showToast('Maladie mise à jour avec succès');
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

  const handleDelete = async (item: DiseaseResult) => {
    setDeleteConfirmItem(item);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmItem) return;
    setSubmitting(true);
    try {
      const api = ApiService.getInstance();
      const response = await api.delete(`/occupational-health/occupational-diseases-results/${deleteConfirmItem.id}/`);
      if (response.success) {
        setResults(results.filter(r => r.id !== deleteConfirmItem.id));
        showToast('Maladie supprimée avec succès');
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

  const filteredAndSorted = useMemo(() => {
    let result = results.filter(item => {
      const matchSearch = !searchQuery ||
        item.worker_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.employee_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.disease?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchFilter = filterStatus === 'all' || item.status === filterStatus;
      return matchSearch && matchFilter;
    });

    result.sort((a, b) => {
      if (sortBy === 'name') {
        return a.worker_name.localeCompare(b.worker_name);
      } else if (sortBy === 'status') {
        const statusOrder = { critical: 0, warning: 1, normal: 2 };
        return statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder];
      } else {
        return new Date(b.diagnosis_date).getTime() - new Date(a.diagnosis_date).getTime();
      }
    });

    return result;
  }, [results, searchQuery, filterStatus, sortBy]);

  const styles = StyleSheet.create({confirmOverlay: {
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
    title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    addButton: { padding: spacing.md, borderRadius: borderRadius.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    searchSection: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.outline },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.outline, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, marginBottom: spacing.md },
    searchInput: { flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, color: colors.text },
    filterRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', marginBottom: spacing.md },
    filterButton: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.outline },
    filterButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterText: { fontSize: 12, fontWeight: '500', color: colors.text },
    filterTextActive: { color: '#FFF' },
    sortRow: { flexDirection: 'row', gap: spacing.md },
    sortButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.outline },
    sortButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    sortText: { fontSize: 12, fontWeight: '500', color: colors.text },
    sortTextActive: { color: '#FFF' },
    contentSection: { flex: 1, padding: spacing.lg },
    resultCard: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', ...shadows.sm },
    resultCardLeft: { marginRight: spacing.md },
    statusIcon: { width: 50, height: 50, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
    resultCardCenter: { flex: 1 },
    resultWorkerName: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
    resultDate: { fontSize: 12, color: colors.textSecondary, marginBottom: spacing.xs },
    resultInfo: { fontSize: 12, color: colors.textSecondary },
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
    submitButton: { marginTop: spacing.lg, marginBottom: spacing.md, paddingVertical: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },
    submitButtonText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
    buttonRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
    button: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },
    saveButton: { backgroundColor: colors.primary },
    cancelButton: { backgroundColor: colors.outline },
    buttonText: { fontWeight: '600', fontSize: 14 },
    cancelButtonText: { color: colors.text },
    saveButtonText: { color: '#FFF' },
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Delete Confirmation Modal */}
      <Modal visible={deleteConfirmItem !== null} transparent animationType="fade" onRequestClose={() => setDeleteConfirmItem(null)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>Confirmer la suppression</Text>
            <Text style={styles.confirmText}>Êtes-vous sûr de vouloir supprimer cette maladie ?</Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={[styles.confirmButton, { borderColor: '#E2E8F0', borderWidth: 1 }]} onPress={() => setDeleteConfirmItem(null)} disabled={submitting}>
                <Text style={styles.confirmButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmButton, { backgroundColor: '#EF4444', opacity: submitting ? 0.7 : 1 }]} onPress={confirmDelete} disabled={submitting}>
                <Text style={[styles.confirmButtonText, { color: 'white' }]}>{submitting ? 'Suppression...' : 'Supprimer'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast */}
      {toastMsg && (
        <Animated.View style={[styles.toast, { backgroundColor: toastMsg.type === 'success' ? '#22C55E' : '#EF4444', opacity: toastAnim }]}>
          <Text style={styles.toastText}>{toastMsg.text}</Text>
        </Animated.View>
      )}
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Maladies Professionnelles</Text>
            <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={() => setShowAddModal(true)} activeOpacity={0.8}>
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={{ color: '#FFF', fontWeight: '600' }}>Ajouter</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchSection}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher par nom, maladie..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textSecondary, marginBottom: spacing.sm }}>Filtrer par statut:</Text>
          <View style={styles.filterRow}>
            {(['all', 'normal', 'warning', 'critical'] as const).map(status => (
              <TouchableOpacity key={status} style={[styles.filterButton, filterStatus === status && styles.filterButtonActive]} onPress={() => setFilterStatus(status)}>
                <Text style={[styles.filterText, filterStatus === status && styles.filterTextActive]}>
                  {status === 'all' ? 'Tous' : status === 'normal' ? 'Normal' : status === 'warning' ? 'Attention' : 'Critique'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.md }}>Trier par:</Text>
          <View style={styles.sortRow}>
            {(['recent', 'name', 'status'] as const).map(sort => (
              <TouchableOpacity key={sort} style={[styles.sortButton, sortBy === sort && styles.sortButtonActive]} onPress={() => setSortBy(sort)}>
                <Text style={[styles.sortText, sortBy === sort && styles.sortTextActive]}>
                  {sort === 'recent' ? 'Récent' : sort === 'name' ? 'Nom' : 'Statut'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.contentSection}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 40 }} />
          ) : filteredAndSorted.length > 0 ? (
            filteredAndSorted.map(result => (
              <View key={result.id} style={[styles.resultCard, shadows.sm]}>
                <View style={styles.resultCardLeft}>
                  <View style={[styles.statusIcon, { backgroundColor: getStatusColor(result.status) + '20' }]}>
                    <Ionicons name="alert-circle-outline" size={24} color={getStatusColor(result.status)} />
                  </View>
                </View>
                <View style={styles.resultCardCenter}>
                  <Text style={styles.resultWorkerName}>{result.worker_name}</Text>
                  <Text style={styles.resultDate}>{new Date(result.diagnosis_date).toLocaleDateString('fr-FR')}</Text>
                  <Text style={styles.resultInfo}>{result.disease}</Text>
                  <Text style={styles.resultInfo}>Sévérité: {result.severity} | Exposition: {result.exposure_type}</Text>
                </View>
                <View style={styles.resultCardRight}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(result.status) + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(result.status) }]}>{getStatusLabel(result.status)}</Text>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleOpenEdit(result)}>
                      <Ionicons name="pencil" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(result)}>
                      <Ionicons name="trash" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary + '40'} />
              <Text style={styles.emptyStateText}>Aucune maladie professionnelle</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter une maladie professionnelle</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formSection}>
              <WorkerSelectDropdown value={selectedWorker} onChange={setSelectedWorker} label="Travailleur" placeholder="Sélectionnez un travailleur" error={selectedWorker === null ? 'Travailleur requis' : undefined} />
              <Text style={styles.formLabel}>Date de diagnostic</Text>
              <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={formData.diagnosis_date} onChangeText={(text) => setFormData({ ...formData, diagnosis_date: text })} placeholderTextColor={colors.textSecondary} />
              <Text style={styles.formLabel}>Maladie</Text>
              <TextInput style={styles.input} placeholder="Ex: Silicose, Asbestose..." value={formData.disease} onChangeText={(text) => setFormData({ ...formData, disease: text })} placeholderTextColor={colors.textSecondary} />
              <Text style={styles.formLabel}>Sévérité</Text>
              <TextInput style={styles.input} placeholder="Légère, Modérée, Sévère" value={formData.severity} onChangeText={(text) => setFormData({ ...formData, severity: text })} placeholderTextColor={colors.textSecondary} />
              <Text style={styles.formLabel}>Type d'exposition</Text>
              <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="Détails d'exposition..." multiline value={formData.exposure_type} onChangeText={(text) => setFormData({ ...formData, exposure_type: text })} placeholderTextColor={colors.textSecondary} />
              <Text style={styles.formLabel}>Notes</Text>
              <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="Remarques supplémentaires..." multiline value={formData.notes} onChangeText={(text) => setFormData({ ...formData, notes: text })} placeholderTextColor={colors.textSecondary} />
              <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.primary }]} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>Enregistrer</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier la maladie</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formSection}>
              <Text style={styles.formLabel}>Date de diagnostic</Text>
              <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={editFormData.diagnosis_date} onChangeText={(text) => setEditFormData({ ...editFormData, diagnosis_date: text })} />
              <Text style={styles.formLabel}>Maladie</Text>
              <TextInput style={styles.input} placeholder="Ex: Silicose, Asbestose..." value={editFormData.disease} onChangeText={(text) => setEditFormData({ ...editFormData, disease: text })} />
              <Text style={styles.formLabel}>Sévérité</Text>
              <TextInput style={styles.input} placeholder="Légère, Modérée, Sévère" value={editFormData.severity} onChangeText={(text) => setEditFormData({ ...editFormData, severity: text })} />
              <Text style={styles.formLabel}>Type d'exposition</Text>
              <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="Détails d'exposition..." multiline value={editFormData.exposure_type} onChangeText={(text) => setEditFormData({ ...editFormData, exposure_type: text })} />
              <Text style={styles.formLabel}>Notes</Text>
              <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="Remarques supplémentaires..." multiline value={editFormData.notes} onChangeText={(text) => setEditFormData({ ...editFormData, notes: text })} />
              <View style={styles.buttonRow}>
                <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setShowEditModal(false)}>
                  <Text style={[styles.buttonText, styles.cancelButtonText]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSaveEdit}>
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
