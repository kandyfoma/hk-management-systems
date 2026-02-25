import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Dimensions,
  Modal, Alert, ActivityIndicator, RefreshControl, SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../../../services/ApiService';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { WorkerSelectDropdown, Worker } from '../components/WorkerSelectDropdown';

interface VisionTestResult {
  id: string;
  worker_id: string;
  worker_name: string;
  employee_id?: string;
  test_date: string;
  right_eye_uncorrected: number;
  right_eye_corrected: number;
  left_eye_uncorrected: number;
  left_eye_corrected: number;
  near_vision_test: number;
  requires_correction: boolean;
  created_at: string;
}

export function VisionTestListScreen() {
  const [results, setResults] = useState<VisionTestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<VisionTestResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');
  
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [formData, setFormData] = useState({
    test_date: new Date().toISOString().split('T')[0],
    right_eye_uncorrected: '',
    right_eye_corrected: '',
    left_eye_uncorrected: '',
    left_eye_corrected: '',
    near_vision_test: '',
    requires_correction: false,
  });
  const [editFormData, setEditFormData] = useState({
    test_date: '',
    right_eye_uncorrected: '',
    right_eye_corrected: '',
    left_eye_uncorrected: '',
    left_eye_corrected: '',
    near_vision_test: '',
    requires_correction: false,
  });

  React.useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const api = ApiService.getInstance();
      const response = await api.get('/occupational-health/vision-test-results/');
      if (response.success && response.data) {
        let data = Array.isArray(response.data) ? response.data : response.data.results || [];
        data = data.sort((a: any, b: any) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime()).slice(0, 5);
        setResults(data);
      }
    } catch (error) {
      console.error('Error loading vision test results:', error);
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
    if (!selectedWorker || !formData.test_date || !formData.visual_acuity_os || !formData.visual_acuity_od) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }
    try {
      const api = ApiService.getInstance();
      const response = await api.post('/occupational-health/vision-test-results/', {
        worker_id: selectedWorker.id,
        test_date: formData.test_date,
        visual_acuity_os: formData.visual_acuity_os,
        visual_acuity_od: formData.visual_acuity_od,
        color_blindness: formData.color_blindness,
        refractive_error: formData.refractive_error,
        notes: formData.notes,
      });
      if (response.success) {
        Alert.alert('Succès', 'Résultat enregistré');
        setShowAddModal(false);
        setSelectedWorker(null);
        setFormData({ test_date: new Date().toISOString().split('T')[0], visual_acuity_os: '', visual_acuity_od: '', color_blindness: false, refractive_error: '', notes: '' });
        await loadResults();
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
  };

  const handleOpenEdit = (item: VisionTestResult) => {
    setSelectedItem(item);
    setEditFormData({
      test_date: item.test_date || '',
      visual_acuity_os: item.visual_acuity_os || '',
      visual_acuity_od: item.visual_acuity_od || '',
      color_blindness: item.color_blindness || false,
      refractive_error: item.refractive_error || '',
      notes: item.notes || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;
    try {
      const api = ApiService.getInstance();
      const response = await api.patch(`/occupational-health/vision-test-results/${selectedItem.id}/`, {
        test_date: editFormData.test_date,
        visual_acuity_os: editFormData.visual_acuity_os,
        visual_acuity_od: editFormData.visual_acuity_od,
        color_blindness: editFormData.color_blindness,
        refractive_error: editFormData.refractive_error,
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

  const handleDelete = async (item: VisionTestResult) => {
    Alert.alert('Confirmer', 'Supprimer ce résultat ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            const api = ApiService.getInstance();
            const response = await api.delete(`/occupational-health/vision-test-results/${item.id}/`);
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
      const matchFilter = filterStatus === 'all' || item.status === filterStatus;
      return matchSearch && matchFilter;
    });
    result.sort((a, b) => {
      if (sortBy === 'name') return a.worker_name.localeCompare(b.worker_name);
      if (sortBy === 'status') {
        const order = { critical: 0, warning: 1, normal: 2 };
        return order[a.status as keyof typeof order] - order[b.status as keyof typeof order];
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
            <Text style={styles.title}>Test de Vision</Text>
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
                  <View style={[styles.statusIcon, { backgroundColor: getStatusColor(result.status) + '20' }]}>
                    <Ionicons name="eye" size={24} color={getStatusColor(result.status)} />
                  </View>
                </View>
                <View style={styles.resultCardCenter}>
                  <Text style={styles.resultWorkerName}>{result.worker_name}</Text>
                  <Text style={styles.resultDate}>{new Date(result.test_date).toLocaleDateString('fr-FR')}</Text>
                  <Text style={styles.resultValues}>OD: {result.visual_acuity_od} | OS: {result.visual_acuity_os}</Text>
                </View>
                <View style={styles.resultCardRight}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(result.status) + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(result.status) }]}>{getStatusLabel(result.status)}</Text>
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
              <Ionicons name="eye-outline" size={48} color={colors.textSecondary + '40'} />
              <Text style={styles.emptyStateText}>Aucun résultat</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter un test de vision</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.formSection}>
              <WorkerSelectDropdown value={selectedWorker} onChange={setSelectedWorker} label="Travailleur" placeholder="Sélectionnez un travailleur" />
              <Text style={styles.formLabel}>Date du test</Text>
              <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={formData.test_date} onChangeText={(text) => setFormData({ ...formData, test_date: text })} placeholderTextColor={colors.textSecondary} />
              <Text style={styles.formLabel}>Acuité visuelle OD (Oeil droit)</Text>
              <TextInput style={styles.input} placeholder="20/20" value={formData.visual_acuity_od} onChangeText={(text) => setFormData({ ...formData, visual_acuity_od: text })} placeholderTextColor={colors.textSecondary} />
              <Text style={styles.formLabel}>Acuité visuelle OS (Oeil gauche)</Text>
              <TextInput style={styles.input} placeholder="20/20" value={formData.visual_acuity_os} onChangeText={(text) => setFormData({ ...formData, visual_acuity_os: text })} placeholderTextColor={colors.textSecondary} />
              <Text style={styles.formLabel}>Erreur de réfraction</Text>
              <TextInput style={styles.input} placeholder="Myopie, Hypermétropie..." value={formData.refractive_error} onChangeText={(text) => setFormData({ ...formData, refractive_error: text })} placeholderTextColor={colors.textSecondary} />
              <Text style={styles.formLabel}>Daltonisme</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.md }}>
                <TouchableOpacity onPress={() => setFormData({ ...formData, color_blindness: !formData.color_blindness })} style={{ marginRight: spacing.md }}>
                  <Ionicons name={formData.color_blindness ? "checkbox" : "square-outline"} size={20} color={colors.secondary} />
                </TouchableOpacity>
                <Text style={{ color: colors.text }}>Daltonisme détecté</Text>
              </View>
              <Text style={styles.formLabel}>Notes</Text>
              <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="Notes..." multiline value={formData.notes} onChangeText={(text) => setFormData({ ...formData, notes: text })} placeholderTextColor={colors.textSecondary} />
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
              <Text style={styles.formLabel}>Acuité visuelle OD</Text>
              <TextInput style={styles.input} value={editFormData.visual_acuity_od} onChangeText={(text) => setEditFormData({ ...editFormData, visual_acuity_od: text })} />
              <Text style={styles.formLabel}>Acuité visuelle OS</Text>
              <TextInput style={styles.input} value={editFormData.visual_acuity_os} onChangeText={(text) => setEditFormData({ ...editFormData, visual_acuity_os: text })} />
              <Text style={styles.formLabel}>Erreur de réfraction</Text>
              <TextInput style={styles.input} value={editFormData.refractive_error} onChangeText={(text) => setEditFormData({ ...editFormData, refractive_error: text })} />
              <Text style={styles.formLabel}>Daltonisme</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.md }}>
                <TouchableOpacity onPress={() => setEditFormData({ ...editFormData, color_blindness: !editFormData.color_blindness })} style={{ marginRight: spacing.md }}>
                  <Ionicons name={editFormData.color_blindness ? "checkbox" : "square-outline"} size={20} color={colors.secondary} />
                </TouchableOpacity>
                <Text style={{ color: colors.text }}>Daltonisme détecté</Text>
              </View>
              <Text style={styles.formLabel}>Notes</Text>
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
