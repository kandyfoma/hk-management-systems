import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Dimensions,
  Modal, Alert, ActivityIndicator, RefreshControl, FlatList, SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../../../services/ApiService';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { WorkerSelectDropdown, Worker } from '../components/WorkerSelectDropdown';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

interface AudiometryResult {
  id: string;
  worker_id: string;
  worker_name: string;
  employee_id?: string;
  test_date: string;
  left_ear_db: number;
  right_ear_db: number;
  frequency: number;
  status: 'normal' | 'warning' | 'critical';
  notes?: string;
  created_at: string;
}

export function AudiometryListScreen() {
  const [results, setResults] = useState<AudiometryResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AudiometryResult | null>(null);
  
  // Search, filter, sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'normal' | 'warning' | 'critical'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'status'>('recent');
  
  // Add form state
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [formData, setFormData] = useState({
    test_date: new Date().toISOString().split('T')[0],
    left_ear_db: '',
    right_ear_db: '',
    frequency: '4000',
    notes: '',
  });
  
  // Edit form state
  const [editFormData, setEditFormData] = useState({
    test_date: '',
    left_ear_db: '',
    right_ear_db: '',
    frequency: '',
    notes: '',
  });

  React.useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const api = ApiService.getInstance();
      const response = await api.get('/occupational-health/audiometry-results/');
      if (response.success && response.data) {
        let data = Array.isArray(response.data) ? response.data : response.data.results || [];
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
    if (!selectedWorker) {
      Alert.alert('Erreur', 'Veuillez sélectionner un travailleur');
      return;
    }
    if (!formData.test_date || !formData.left_ear_db || !formData.right_ear_db) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const api = ApiService.getInstance();
      const payload = {
        worker_id: selectedWorker.id,
        test_date: formData.test_date,
        left_ear_500hz: formData.left_ear_db ? parseInt(formData.left_ear_db) : null,
        right_ear_500hz: formData.right_ear_db ? parseInt(formData.right_ear_db) : null,
        notes: formData.notes,
      };

      const response = await api.post('/occupational-health/audiometry-results/', payload);
      if (response.success) {
        Alert.alert('Succès', 'Résultat d\'audiométrie enregistré');
        setShowAddModal(false);
        setSelectedWorker(null);
        setFormData({
          test_date: new Date().toISOString().split('T')[0],
          left_ear_db: '',
          right_ear_db: '',
          frequency: '4000',
          notes: '',
        });
        // Refetch data to ensure consistency
        await loadResults();
      } else {
        Alert.alert('Erreur', response.message || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Error creating audiometry result:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
  };

  const handleOpenEdit = (item: AudiometryResult) => {
    setSelectedItem(item);
    setEditFormData({
      test_date: item.test_date || '',
      left_ear_db: item.left_ear_db?.toString() || '',
      right_ear_db: item.right_ear_db?.toString() || '',
      frequency: item.frequency?.toString() || '',
      notes: item.notes || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;

    try {
      const api = ApiService.getInstance();
      const patchData = {
        test_date: editFormData.test_date,
        left_ear_db: parseFloat(editFormData.left_ear_db) || 0,
        right_ear_db: parseFloat(editFormData.right_ear_db) || 0,
        frequency: editFormData.frequency ? parseFloat(editFormData.frequency) : null,
        notes: editFormData.notes,
      };

      const response = await api.patch(
        `/occupational-health/audiometry-results/${selectedItem.id}/`,
        patchData
      );

      if (response.success) {
        // Update results with properly typed data
        setResults(
          results.map(r =>
            r.id === selectedItem.id
              ? {
                  ...r,
                  test_date: patchData.test_date,
                  left_ear_db: patchData.left_ear_db,
                  right_ear_db: patchData.right_ear_db,
                  frequency: patchData.frequency,
                  notes: patchData.notes,
                }
              : r
          )
        );
        setShowEditModal(false);
        setSelectedItem(null);
        Alert.alert('Succès', 'Résultat mis à jour');
      } else {
        Alert.alert('Erreur', 'Impossible de mettre à jour');
      }
    } catch (error) {
      console.error('Error updating:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
  };

  const handleDelete = async (item: AudiometryResult) => {
    Alert.alert(
      'Confirmer la suppression',
      'Êtes-vous sûr de vouloir supprimer ce résultat ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const api = ApiService.getInstance();
              const response = await api.delete(`/occupational-health/audiometry-results/${item.id}/`);
              if (response.success) {
                setResults(results.filter(r => r.id !== item.id));
                Alert.alert('Succès', 'Résultat supprimé');
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
      } else if (sortBy === 'status') {
        const statusOrder = { critical: 0, warning: 1, normal: 2 };
        return statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder];
      } else {
        return new Date(b.test_date).getTime() - new Date(a.test_date).getTime();
      }
    });

    return result;
  }, [results, searchQuery, filterStatus, sortBy]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: spacing.lg,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.outline,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.md,
      flexDirection: 'row',
      display: 'flex',
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    addButton: {
      padding: spacing.md,
      borderRadius: borderRadius.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    searchSection: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.outline,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.outline,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    searchInput: {
      flex: 1,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      color: colors.text,
    },
    filterRow: {
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    filterButton: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.outline,
    },
    filterButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.text,
    },
    filterTextActive: {
      color: '#FFF',
    },
    sortRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    sortButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.outline,
    },
    sortButtonActive: {
      backgroundColor: colors.secondary,
      borderColor: colors.secondary,
    },
    sortText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.text,
    },
    sortTextActive: {
      color: '#FFF',
    },
    contentSection: {
      flex: 1,
      padding: spacing.lg,
    },
    resultCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      ...shadows.sm,
    },
    resultCardLeft: {
      marginRight: spacing.md,
    },
    statusIcon: {
      width: 50,
      height: 50,
      borderRadius: borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    resultCardCenter: {
      flex: 1,
    },
    resultWorkerName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: spacing.xs,
    },
    resultDate: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    dbValues: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dbText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    resultCardRight: {
      alignItems: 'flex-end',
      gap: spacing.sm,
    },
    statusBadge: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.md,
    },
    statusBadgeText: {
      fontSize: 12,
      fontWeight: '600',
    },
    cardActions: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    actionButton: {
      padding: spacing.sm,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl,
    },
    emptyStateText: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: spacing.md,
    },
    
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: borderRadius.xl,
      borderTopRightRadius: borderRadius.xl,
      padding: spacing.lg,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    formSection: {
      marginBottom: spacing.lg,
    },
    formLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
      marginBottom: spacing.sm,
      marginTop: spacing.md,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.outline,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.background,
    },
    submitButton: {
      marginTop: spacing.lg,
      marginBottom: spacing.md,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      alignItems: 'center',
    },
    submitButtonText: {
      color: '#FFF',
      fontWeight: '600',
      fontSize: 14,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    button: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      alignItems: 'center',
    },
    saveButton: {
      backgroundColor: colors.primary,
    },
    cancelButton: {
      backgroundColor: colors.outline,
    },
    buttonText: {
      fontWeight: '600',
      fontSize: 14,
    },
    cancelButtonText: {
      color: colors.text,
    },
    saveButtonText: {
      color: '#FFF',
    },
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
              <Text style={styles.title}>Audiométrie</Text>
            </View>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowAddModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={{ color: '#FFF', fontWeight: '600' }}>Ajouter</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
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
            {(['recent', 'name', 'status'] as const).map(sort => (
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
                  {sort === 'recent' ? 'Récent' : sort === 'name' ? 'Nom' : 'Statut'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Results List */}
        <View style={styles.contentSection}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 40 }} />
          ) : filteredAndSorted.length > 0 ? (
            filteredAndSorted.map(result => (
              <View key={result.id} style={[styles.resultCard, shadows.sm]}>
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
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleOpenEdit(result)}
                    >
                      <Ionicons name="pencil" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDelete(result)}
                    >
                      <Ionicons name="trash" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
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

              <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.primary }]} onPress={handleSubmit}>
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
              <Text style={styles.modalTitle}>Modifier le résultat</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
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

              <Text style={styles.formLabel}>Audition OG (dB)</Text>
              <TextInput
                style={styles.input}
                placeholder="0-120"
                keyboardType="decimal-pad"
                value={editFormData.left_ear_db}
                onChangeText={(text) => setEditFormData({ ...editFormData, left_ear_db: text })}
              />

              <Text style={styles.formLabel}>Audition OD (dB)</Text>
              <TextInput
                style={styles.input}
                placeholder="0-120"
                keyboardType="decimal-pad"
                value={editFormData.right_ear_db}
                onChangeText={(text) => setEditFormData({ ...editFormData, right_ear_db: text })}
              />

              <Text style={styles.formLabel}>Fréquence (Hz)</Text>
              <TextInput
                style={styles.input}
                placeholder="500, 1000, 2000, 4000"
                keyboardType="number-pad"
                value={editFormData.frequency}
                onChangeText={(text) => setEditFormData({ ...editFormData, frequency: text })}
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
