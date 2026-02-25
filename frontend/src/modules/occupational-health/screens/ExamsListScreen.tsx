import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Dimensions,
  Modal, Alert, ActivityIndicator, RefreshControl, SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../../../services/ApiService';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { WorkerSelectDropdown, Worker } from '../components/WorkerSelectDropdown';

interface ExamResult {
  id: string;
  worker_id: string;
  worker_name: string;
  employee_id?: string;
  exam_date: string;
  exam_type: string;
  finding: string;
  doctor_name: string;
  notes?: string;
  status: 'normal' | 'warning' | 'critical';
  created_at: string;
}

export function ExamsListScreen() {
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ExamResult | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'normal' | 'warning' | 'critical'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'status'>('recent');
  
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [formData, setFormData] = useState({
    exam_date: new Date().toISOString().split('T')[0],
    exam_type: '',
    finding: '',
    doctor_name: '',
    notes: '',
  });
  
  const [editFormData, setEditFormData] = useState({
    exam_date: '',
    exam_type: '',
    finding: '',
    doctor_name: '',
    notes: '',
  });

  React.useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const api = ApiService.getInstance();
      const response = await api.get('/occupational-health/medical-exams-results/');
      if (response.success && response.data) {
        let data = Array.isArray(response.data) ? response.data : response.data.results || [];
        data = data
          .sort((a: any, b: any) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime())
          .slice(0, 5);
        setResults(data);
      }
    } catch (error) {
      console.error('Error loading medical exams results:', error);
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
      Alert.alert('Erreur', 'Veuillez sélectionner un travailleur');
      return;
    }
    if (!formData.exam_date || !formData.exam_type || !formData.finding || !formData.doctor_name) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const api = ApiService.getInstance();
      const payload = {
        worker_id: selectedWorker.id,
        exam_date: formData.exam_date,
        exam_type: formData.exam_type,
        finding: formData.finding,
        doctor_name: formData.doctor_name,
        notes: formData.notes,
      };

      const response = await api.post('/occupational-health/medical-exams-results/', payload);
      if (response.success) {
        Alert.alert('Succès', 'Examen médical enregistré');
        setShowAddModal(false);
        setSelectedWorker(null);
        setFormData({
          exam_date: new Date().toISOString().split('T')[0],
          exam_type: '',
          finding: '',
          doctor_name: '',
          notes: '',
        });
        await loadResults();
      } else {
        Alert.alert('Erreur', response.message || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Error creating exam result:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
  };

  const handleOpenEdit = (item: ExamResult) => {
    setSelectedItem(item);
    setEditFormData({
      exam_date: item.exam_date || '',
      exam_type: item.exam_type || '',
      finding: item.finding || '',
      doctor_name: item.doctor_name || '',
      notes: item.notes || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;

    try {
      const api = ApiService.getInstance();
      const patchData = {
        exam_date: editFormData.exam_date,
        exam_type: editFormData.exam_type,
        finding: editFormData.finding,
        doctor_name: editFormData.doctor_name,
        notes: editFormData.notes,
      };

      const response = await api.patch(
        `/occupational-health/medical-exams-results/${selectedItem.id}/`,
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
        Alert.alert('Succès', 'Examen mis à jour');
      } else {
        Alert.alert('Erreur', 'Impossible de mettre à jour');
      }
    } catch (error) {
      console.error('Error updating:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
  };

  const handleDelete = async (item: ExamResult) => {
    Alert.alert(
      'Confirmer la suppression',
      'Êtes-vous sûr de vouloir supprimer cet examen ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const api = ApiService.getInstance();
              const response = await api.delete(`/occupational-health/medical-exams-results/${item.id}/`);
              if (response.success) {
                setResults(results.filter(r => r.id !== item.id));
                Alert.alert('Succès', 'Examen supprimé');
              }
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer');
            }
          },
        },
      ]
    );
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
        item.exam_type?.toLowerCase().includes(searchQuery.toLowerCase());
      
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
        return new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime();
      }
    });

    return result;
  }, [results, searchQuery, filterStatus, sortBy]);

  const styles = StyleSheet.create({
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
    sortButtonActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
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
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Examens Médicaux</Text>
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
              placeholder="Rechercher par nom, type..."
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
                    <Ionicons name="medkit-outline" size={24} color={getStatusColor(result.status)} />
                  </View>
                </View>
                <View style={styles.resultCardCenter}>
                  <Text style={styles.resultWorkerName}>{result.worker_name}</Text>
                  <Text style={styles.resultDate}>{new Date(result.exam_date).toLocaleDateString('fr-FR')}</Text>
                  <Text style={styles.resultInfo}>{result.exam_type}</Text>
                  <Text style={styles.resultInfo}>Médecin: {result.doctor_name}</Text>
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
              <Ionicons name="medkit-outline" size={48} color={colors.textSecondary + '40'} />
              <Text style={styles.emptyStateText}>Aucun examen médical</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter un examen médical</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formSection}>
              <WorkerSelectDropdown value={selectedWorker} onChange={setSelectedWorker} label="Travailleur" placeholder="Sélectionnez un travailleur" error={selectedWorker === null ? 'Travailleur requis' : undefined} />
              <Text style={styles.formLabel}>Date de l'examen</Text>
              <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={formData.exam_date} onChangeText={(text) => setFormData({ ...formData, exam_date: text })} placeholderTextColor={colors.textSecondary} />
              <Text style={styles.formLabel}>Type d'examen</Text>
              <TextInput style={styles.input} placeholder="Ex: Générales, Sang, Vision..." value={formData.exam_type} onChangeText={(text) => setFormData({ ...formData, exam_type: text })} placeholderTextColor={colors.textSecondary} />
              <Text style={styles.formLabel}>Constatations</Text>
              <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="Détails des constatations..." multiline value={formData.finding} onChangeText={(text) => setFormData({ ...formData, finding: text })} placeholderTextColor={colors.textSecondary} />
              <Text style={styles.formLabel}>Nom du médecin</Text>
              <TextInput style={styles.input} placeholder="Dr. [Nom]" value={formData.doctor_name} onChangeText={(text) => setFormData({ ...formData, doctor_name: text })} placeholderTextColor={colors.textSecondary} />
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
              <Text style={styles.modalTitle}>Modifier l'examen</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formSection}>
              <Text style={styles.formLabel}>Date de l'examen</Text>
              <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={editFormData.exam_date} onChangeText={(text) => setEditFormData({ ...editFormData, exam_date: text })} />
              <Text style={styles.formLabel}>Type d'examen</Text>
              <TextInput style={styles.input} placeholder="Ex: Générales, Sang, Vision..." value={editFormData.exam_type} onChangeText={(text) => setEditFormData({ ...editFormData, exam_type: text })} />
              <Text style={styles.formLabel}>Constatations</Text>
              <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="Détails des constatations..." multiline value={editFormData.finding} onChangeText={(text) => setEditFormData({ ...editFormData, finding: text })} />
              <Text style={styles.formLabel}>Nom du médecin</Text>
              <TextInput style={styles.input} placeholder="Dr. [Nom]" value={editFormData.doctor_name} onChangeText={(text) => setEditFormData({ ...editFormData, doctor_name: text })} />
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
