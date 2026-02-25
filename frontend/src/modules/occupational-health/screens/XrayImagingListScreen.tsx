import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Dimensions,
  Modal, Alert, ActivityIndicator, RefreshControl, SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../../../services/ApiService';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { WorkerSelectDropdown, Worker } from '../components/WorkerSelectDropdown';

interface XrayImagingResult {
  id: string;
  worker_id: string;
  worker_name: string;
  employee_id?: string;
  test_date: string;
  exam_type: string;
  imaging_findings: string;
  radiologist_notes: string;
  result_status: 'normal' | 'warning' | 'critical';
  notes?: string;
}

export function XrayImagingListScreen() {
  const [results, setResults] = useState<XrayImagingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<XrayImagingResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'normal' | 'warning' | 'critical'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'status'>('recent');
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [formData, setFormData] = useState({
    test_date: new Date().toISOString().split('T')[0],
    exam_type: '',
    imaging_findings: '',
    radiologist_notes: '',
    notes: '',
  });
  const [editFormData, setEditFormData] = useState({
    test_date: '',
    exam_type: '',
    imaging_findings: '',
    radiologist_notes: '',
    notes: '',
  });

  React.useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const api = ApiService.getInstance();
      const response = await api.get('/occupational-health/xray-imaging-results/');
      if (response.success && response.data) {
        let data = Array.isArray(response.data) ? response.data : response.data.results || [];
        data = data.sort((a: any, b: any) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime()).slice(0, 5);
        setResults(data);
      }
    } catch (error) {
      console.error('Error loading xray imaging results:', error);
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
    if (!selectedWorker || !formData.test_date || !formData.exam_type) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }
    try {
      const api = ApiService.getInstance();
      const response = await api.post('/occupational-health/xray-imaging-results/', {
        worker_id: selectedWorker.id,
        test_date: formData.test_date,
        exam_type: formData.exam_type,
        imaging_findings: formData.imaging_findings,
        radiologist_notes: formData.radiologist_notes,
        notes: formData.notes,
      });
      if (response.success) {
        Alert.alert('Succès', 'Résultat enregistré');
        setShowAddModal(false);
        setSelectedWorker(null);
        setFormData({ test_date: new Date().toISOString().split('T')[0], exam_type: '', imaging_findings: '', radiologist_notes: '', notes: '' });
        await loadResults();
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
  };

  const handleOpenEdit = (item: XrayImagingResult) => {
    setSelectedItem(item);
    setEditFormData({
      test_date: item.test_date || '',
      exam_type: item.exam_type || '',
      imaging_findings: item.imaging_findings || '',
      radiologist_notes: item.radiologist_notes || '',
      notes: item.notes || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;
    try {
      const api = ApiService.getInstance();
      const response = await api.patch(`/occupational-health/xray-imaging-results/${selectedItem.id}/`, {
        test_date: editFormData.test_date,
        exam_type: editFormData.exam_type,
        imaging_findings: editFormData.imaging_findings,
        radiologist_notes: editFormData.radiologist_notes,
        notes: editFormData.notes,
      });
      if (response.success) {
        setResults(results.map(r => r.id === selectedItem.id ? { ...r, ...editFormData } : r));
        setShowEditModal(false);
        setSelectedItem(null);
        Alert.alert('Succès', 'Résultat mis à jour');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
  };

  const handleDelete = async (item: XrayImagingResult) => {
    Alert.alert('Confirmer', 'Supprimer ce résultat ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            const api = ApiService.getInstance();
            const response = await api.delete(`/occupational-health/xray-imaging-results/${item.id}/`);
            if (response.success) {
              setResults(results.filter(r => r.id !== item.id));
              Alert.alert('Succès', 'Résultat supprimé');
            }
          } catch (error) {
            Alert.alert('Erreur', 'Impossible de supprimer');
          }
        },
      },
    ]);
  };

  const getStatusColor = (status: string) => status === 'normal' ? '#22C55E' : status === 'warning' ? '#F59E0B' : '#EF4444';
  const getStatusLabel = (status: string) => status === 'normal' ? 'Normal' : status === 'warning' ? 'Attention' : 'Critique';

  const filteredAndSorted = useMemo(() => {
    let result = results.filter(item => {
      const matchSearch = !searchQuery || item.worker_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchFilter = filterStatus === 'all' || item.result_status === filterStatus;
      return matchSearch && matchFilter;
    });
    result.sort((a, b) => {
      if (sortBy === 'name') return a.worker_name.localeCompare(b.worker_name);
      if (sortBy === 'status') {
        const order = { critical: 0, warning: 1, normal: 2 };
        return order[a.result_status as keyof typeof order] - order[b.result_status as keyof typeof order];
      }
      return new Date(b.test_date).getTime() - new Date(a.test_date).getTime();
    });
    return result;
  }, [results, searchQuery, filterStatus, sortBy]);

  const styles = StyleSheet.create({
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
    filterButtonActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
    filterText: { fontSize: 12, fontWeight: '500', color: colors.text },
    filterTextActive: { color: '#FFF' },
    sortRow: { flexDirection: 'row', gap: spacing.md },
    sortButton: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.outline },
    sortButtonActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
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
    submitButton: { marginTop: spacing.lg, marginBottom: spacing.md, paddingVertical: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },
    submitButtonText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
    buttonRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
    button: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },
    saveButton: { backgroundColor: colors.secondary },
    cancelButton: { backgroundColor: colors.outline },
    buttonText: { fontWeight: '600', fontSize: 14 },
    cancelButtonText: { color: colors.text },
    saveButtonText: { color: '#FFF' },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Imagerie Radiologique</Text>
            <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.secondary }]} onPress={() => setShowAddModal(true)} activeOpacity={0.8}>
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={{ color: '#FFF', fontWeight: '600' }}>Ajouter</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchSection}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
            <TextInput style={styles.searchInput} placeholder="Rechercher..." placeholderTextColor={colors.textSecondary} value={searchQuery} onChangeText={setSearchQuery} />
          </View>
          <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textSecondary, marginBottom: spacing.sm }}>Filtrer:</Text>
          <View style={styles.filterRow}>
            {(['all', 'normal', 'warning', 'critical'] as const).map(status => (
              <TouchableOpacity key={status} style={[styles.filterButton, filterStatus === status && styles.filterButtonActive]} onPress={() => setFilterStatus(status)}>
                <Text style={[styles.filterText, filterStatus === status && styles.filterTextActive]}>{status === 'all' ? 'Tous' : status === 'normal' ? 'Normal' : status === 'warning' ? 'Attention' : 'Critique'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.md }}>Trier:</Text>
          <View style={styles.sortRow}>
            {(['recent', 'name', 'status'] as const).map(sort => (
              <TouchableOpacity key={sort} style={[styles.sortButton, sortBy === sort && styles.sortButtonActive]} onPress={() => setSortBy(sort)}>
                <Text style={[styles.filterText, sortBy === sort && styles.filterTextActive]}>{sort === 'recent' ? 'Récent' : sort === 'name' ? 'Nom' : 'Statut'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.contentSection}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.secondary} style={{ marginVertical: 40 }} />
          ) : filteredAndSorted.length > 0 ? (
            filteredAndSorted.map(result => (
              <View key={result.id} style={[styles.resultCard, shadows.sm]}>
                <View style={styles.resultCardLeft}>
                  <View style={[styles.statusIcon, { backgroundColor: getStatusColor(result.result_status) + '20' }]}>
                    <Ionicons name="scan" size={24} color={getStatusColor(result.result_status)} />
                  </View>
                </View>
                <View style={styles.resultCardCenter}>
                  <Text style={styles.resultWorkerName}>{result.worker_name}</Text>
                  <Text style={styles.resultDate}>{new Date(result.test_date).toLocaleDateString('fr-FR')}</Text>
                  <Text style={styles.resultValues}>{result.exam_type} - {result.imaging_findings}</Text>
                </View>
                <View style={styles.resultCardRight}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(result.result_status) + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(result.result_status) }]}>{getStatusLabel(result.result_status)}</Text>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleOpenEdit(result)}>
                      <Ionicons name="pencil" size={18} color={colors.secondary} />
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
              <Ionicons name="scan-outline" size={48} color={colors.textSecondary + '40'} />
              <Text style={styles.emptyStateText}>Aucun résultat</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter une imagerie radiologique</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.formSection}>
              <WorkerSelectDropdown value={selectedWorker} onChange={setSelectedWorker} label="Travailleur" placeholder="Sélectionnez un travailleur" />
              <Text style={styles.formLabel}>Date du test</Text>
              <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={formData.test_date} onChangeText={(text) => setFormData({ ...formData, test_date: text })} placeholderTextColor={colors.textSecondary} />
              <Text style={styles.formLabel}>Type d'examen</Text>
              <TextInput style={styles.input} placeholder="Radiographie, Tomodensitométrie..." value={formData.exam_type} onChangeText={(text) => setFormData({ ...formData, exam_type: text })} placeholderTextColor={colors.textSecondary} />
              <Text style={styles.formLabel}>Résultats de l'imagerie</Text>
              <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="Constatations..." multiline value={formData.imaging_findings} onChangeText={(text) => setFormData({ ...formData, imaging_findings: text })} placeholderTextColor={colors.textSecondary} />
              <Text style={styles.formLabel}>Notes du radiologue</Text>
              <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="Notes..." multiline value={formData.radiologist_notes} onChangeText={(text) => setFormData({ ...formData, radiologist_notes: text })} placeholderTextColor={colors.textSecondary} />
              <Text style={styles.formLabel}>Notes supplémentaires</Text>
              <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="Autres notes..." multiline value={formData.notes} onChangeText={(text) => setFormData({ ...formData, notes: text })} placeholderTextColor={colors.textSecondary} />
              <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.secondary }]} onPress={handleSubmit}>
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
              <Text style={styles.modalTitle}>Modifier</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.formSection}>
              <Text style={styles.formLabel}>Date du test</Text>
              <TextInput style={styles.input} value={editFormData.test_date} onChangeText={(text) => setEditFormData({ ...editFormData, test_date: text })} />
              <Text style={styles.formLabel}>Type d'examen</Text>
              <TextInput style={styles.input} value={editFormData.exam_type} onChangeText={(text) => setEditFormData({ ...editFormData, exam_type: text })} />
              <Text style={styles.formLabel}>Résultats de l'imagerie</Text>
              <TextInput style={[styles.input, { minHeight: 80 }]} multiline value={editFormData.imaging_findings} onChangeText={(text) => setEditFormData({ ...editFormData, imaging_findings: text })} />
              <Text style={styles.formLabel}>Notes du radiologue</Text>
              <TextInput style={[styles.input, { minHeight: 80 }]} multiline value={editFormData.radiologist_notes} onChangeText={(text) => setEditFormData({ ...editFormData, radiologist_notes: text })} />
              <Text style={styles.formLabel}>Notes supplémentaires</Text>
              <TextInput style={[styles.input, { minHeight: 80 }]} multiline value={editFormData.notes} onChangeText={(text) => setEditFormData({ ...editFormData, notes: text })} />
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
