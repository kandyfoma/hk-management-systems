import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  Modal, Alert, ActivityIndicator, RefreshControl, SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../../../services/ApiService';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { WorkerSelectDropdown, Worker } from '../components/WorkerSelectDropdown';

interface ExitExamResult {
  id: string;
  worker_id: string;
  worker_name: string;
  employee_id?: string;
  exit_date: string;
  exam_date: string;
  health_status_summary: string;
  disease_present: string;
  notes?: string;
  status: 'normal' | 'warning' | 'critical';
  created_at: string;
}

export function ExitExamsListScreen() {
  const [results, setResults] = useState<ExitExamResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ExitExamResult | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'normal' | 'warning' | 'critical'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'status'>('recent');
  
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [formData, setFormData] = useState({
    exit_date: new Date().toISOString().split('T')[0],
    exam_date: new Date().toISOString().split('T')[0],
    health_status_summary: '',
    disease_present: '',
    notes: '',
  });
  
  const [editFormData, setEditFormData] = useState({
    exit_date: '',
    exam_date: '',
    health_status_summary: '',
    disease_present: '',
    notes: '',
  });

  React.useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const api = ApiService.getInstance();
      const response = await api.get('/occupational-health/exit-exams-results/');
      if (response.success && response.data) {
        let data = Array.isArray(response.data) ? response.data : response.data.results || [];
        data = data
          .sort((a: any, b: any) => new Date(b.exit_date).getTime() - new Date(a.exit_date).getTime())
          .slice(0, 5);
        setResults(data);
      }
    } catch (error) {
      console.error('Error loading exit exams results:', error);
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
    if (!formData.exit_date || !formData.exam_date || !formData.health_status_summary) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const api = ApiService.getInstance();
      const payload = {
        worker_id: selectedWorker.id,
        exit_date: formData.exit_date,
        exam_date: formData.exam_date,
        health_status_summary: formData.health_status_summary,
        disease_present: formData.disease_present,
        notes: formData.notes,
      };

      const response = await api.post('/occupational-health/exit-exams-results/', payload);
      if (response.success) {
        Alert.alert('Succès', 'Examen de départ enregistré');
        setShowAddModal(false);
        setSelectedWorker(null);
        setFormData({
          exit_date: new Date().toISOString().split('T')[0],
          exam_date: new Date().toISOString().split('T')[0],
          health_status_summary: '',
          disease_present: '',
          notes: '',
        });
        await loadResults();
      } else {
        Alert.alert('Erreur', response.message || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Error creating exit exam result:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
  };

  const handleOpenEdit = (item: ExitExamResult) => {
    setSelectedItem(item);
    setEditFormData({
      exit_date: item.exit_date || '',
      exam_date: item.exam_date || '',
      health_status_summary: item.health_status_summary || '',
      disease_present: item.disease_present || '',
      notes: item.notes || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;

    try {
      const api = ApiService.getInstance();
      const patchData = {
        exit_date: editFormData.exit_date,
        exam_date: editFormData.exam_date,
        health_status_summary: editFormData.health_status_summary,
        disease_present: editFormData.disease_present,
        notes: editFormData.notes,
      };

      const response = await api.patch(
        `/occupational-health/exit-exams-results/${selectedItem.id}/`,
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

  const handleDelete = async (item: ExitExamResult) => {
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
              const response = await api.delete(`/occupational-health/exit-exams-results/${item.id}/`);
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
        item.health_status_summary?.toLowerCase().includes(searchQuery.toLowerCase());
      
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
        return new Date(b.exit_date).getTime() - new Date(a.exit_date).getTime();
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
    filterButtonActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    filterText: { fontSize: 12, fontWeight: '500', color: colors.text },
    filterTextActive: { color: '#FFF' },
    sortRow: { flexDirection: 'row', gap: spacing.md },
    sortButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.outline },
    sortButtonActive: { backgroundColor: colors.accent, borderColor: colors.accent },
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
    saveButton: { backgroundColor: colors.accent },
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
            <Text style={styles.title}>Examens de Départ</Text>
            <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.accent }]} onPress={() => setShowAddModal(true)} activeOpacity={0.8}>
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
              placeholder="Rechercher par nom, statut..."
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
            <ActivityIndicator size="large" color={colors.accent} style={{ marginVertical: 40 }} />
          ) : filteredAndSorted.length > 0 ? (
            filteredAndSorted.map(result => (
              <View key={result.id} style={[styles.resultCard, shadows.sm]}>
                <View style={styles.resultCardLeft}>
                  <View style={[styles.statusIcon, { backgroundColor: getStatusColor(result.status) + '20' }]}>
                    <Ionicons name="exit-outline" size={24} color={getStatusColor(result.status)} />
                  </View>
                </View>
                <View style={styles.resultCardCenter}>
                  <Text style={styles.resultWorkerName}>{result.worker_name}</Text>
                  <Text style={styles.resultDate}>{new Date(result.exit_date).toLocaleDateString('fr-FR')}</Text>
                  <Text style={styles.resultInfo}>{result.health_status_summary}</Text>
                  <Text style={styles.resultInfo}>Maladie: {result.disease_present}</Text>
                </View>
                <View style={styles.resultCardRight}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(result.status) + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(result.status) }]}>{getStatusLabel(result.status)}</Text>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleOpenEdit(result)}>
                      <Ionicons name="pencil" size={18} color={colors.accent} />
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
              <Ionicons name="exit-outline" size={48} color={colors.textSecondary + '40'} />
              <Text style={styles.emptyStateText}>Aucun examen de départ</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter un examen de départ</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formSection}>
              <WorkerSelectDropdown value={selectedWorker} onChange={setSelectedWorker} label="Travailleur" placeholder="Sélectionnez un travailleur" error={selectedWorker === null ? 'Travailleur requis' : undefined} />
              <Text style={styles.formLabel}>Date de départ</Text>
              <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={formData.exit_date} onChangeText={(text) => setFormData({ ...formData, exit_date: text })} placeholderTextColor={colors.textSecondary} />
              <Text style={styles.formLabel}>Date d'examen</Text>
              <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={formData.exam_date} onChangeText={(text) => setFormData({ ...formData, exam_date: text })} placeholderTextColor={colors.textSecondary} />
              <Text style={styles.formLabel}>Résumé du statut de santé</Text>
              <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="Détails du statut..." multiline value={formData.health_status_summary} onChangeText={(text) => setFormData({ ...formData, health_status_summary: text })} placeholderTextColor={colors.textSecondary} />
              <Text style={styles.formLabel}>Présence de maladie</Text>
              <TextInput style={styles.input} placeholder="Oui/Non ou détails" value={formData.disease_present} onChangeText={(text) => setFormData({ ...formData, disease_present: text })} placeholderTextColor={colors.textSecondary} />
              <Text style={styles.formLabel}>Notes</Text>
              <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="Remarques supplémentaires..." multiline value={formData.notes} onChangeText={(text) => setFormData({ ...formData, notes: text })} placeholderTextColor={colors.textSecondary} />
              <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.accent }]} onPress={handleSubmit}>
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
              <Text style={styles.formLabel}>Date de départ</Text>
              <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={editFormData.exit_date} onChangeText={(text) => setEditFormData({ ...editFormData, exit_date: text })} />
              <Text style={styles.formLabel}>Date d'examen</Text>
              <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={editFormData.exam_date} onChangeText={(text) => setEditFormData({ ...editFormData, exam_date: text })} />
              <Text style={styles.formLabel}>Résumé du statut de santé</Text>
              <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="Détails du statut..." multiline value={editFormData.health_status_summary} onChangeText={(text) => setEditFormData({ ...editFormData, health_status_summary: text })} />
              <Text style={styles.formLabel}>Présence de maladie</Text>
              <TextInput style={styles.input} placeholder="Oui/Non ou détails" value={editFormData.disease_present} onChangeText={(text) => setEditFormData({ ...editFormData, disease_present: text })} />
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
