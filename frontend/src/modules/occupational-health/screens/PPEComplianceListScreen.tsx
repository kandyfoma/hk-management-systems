import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Dimensions,
  Modal, Alert, ActivityIndicator, RefreshControl, SafeAreaView, Switch
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ApiService from '../../../services/ApiService';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { WorkerSelectDropdown, Worker } from '../components/WorkerSelectDropdown';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

interface PPEComplianceResult {
  id: string;
  worker_id: string;
  worker_name: string;
  employee_id?: string;
  check_date: string;
  check_type: 'Hard Hat' | 'Safety Shoes' | 'Gloves' | 'Mask' | 'Harness' | 'Other';
  status: 'In Use' | 'Expired' | 'Damaged' | 'Lost' | 'Replaced' | 'Compliant' | 'Non-Compliant';
  is_compliant: boolean;
  condition_notes?: string;
  notes?: string;
  status_badge: 'normal' | 'warning' | 'critical';
  created_at: string;
}

export function PPEComplianceListScreen() {
  const [results, setResults] = useState<PPEComplianceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PPEComplianceResult | null>(null);
  
  // Search, filter, sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'normal' | 'warning' | 'critical'>('all');
  const [filterCompliance, setFilterCompliance] = useState<'all' | 'yes' | 'no'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');
  
  // Add form state
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [formData, setFormData] = useState({
    check_date: new Date().toISOString().split('T')[0],
    check_type: 'Hard Hat' as 'Hard Hat' | 'Safety Shoes' | 'Gloves' | 'Mask' | 'Harness' | 'Other',
    status: 'Compliant' as 'In Use' | 'Expired' | 'Damaged' | 'Lost' | 'Replaced' | 'Compliant' | 'Non-Compliant',
    is_compliant: true,
    condition_notes: '',
    notes: '',
  });
  
  // Edit form state
  const [editFormData, setEditFormData] = useState({
    check_date: '',
    check_type: 'Hard Hat' as 'Hard Hat' | 'Safety Shoes' | 'Gloves' | 'Mask' | 'Harness' | 'Other',
    status: 'Compliant' as 'In Use' | 'Expired' | 'Damaged' | 'Lost' | 'Replaced' | 'Compliant' | 'Non-Compliant',
    is_compliant: true,
    condition_notes: '',
    notes: '',
  });

  React.useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const api = ApiService.getInstance();
      const response = await api.get('/occupational-health/ppe-compliance-results/');
      if (response.success && response.data) {
        let data = Array.isArray(response.data) ? response.data : response.data.results || [];
        data = data
          .sort((a: any, b: any) => new Date(b.check_date).getTime() - new Date(a.check_date).getTime())
          .slice(0, 5);
        setResults(data);
      }
    } catch (error) {
      console.error('Error loading PPE compliance results:', error);
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
    if (!formData.check_date) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const api = ApiService.getInstance();
      const payload = {
        worker_id: selectedWorker.id,
        check_date: formData.check_date,
        check_type: formData.check_type,
        status: formData.status,
        is_compliant: formData.is_compliant,
        condition_notes: formData.condition_notes,
        notes: formData.notes,
      };

      const response = await api.post('/occupational-health/ppe-compliance-results/', payload);
      if (response.success) {
        Alert.alert('Succès', 'Résultat de conformité EPI enregistré');
        setShowAddModal(false);
        setSelectedWorker(null);
        setFormData({
          check_date: new Date().toISOString().split('T')[0],
          check_type: 'Hard Hat',
          status: 'Compliant',
          is_compliant: true,
          condition_notes: '',
          notes: '',
        });
        await loadResults();
      } else {
        Alert.alert('Erreur', response.message || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Error creating PPE result:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
  };

  const handleOpenEdit = (item: PPEComplianceResult) => {
    setSelectedItem(item);
    setEditFormData({
      check_date: item.check_date || '',
      check_type: item.check_type || 'Hard Hat',
      status: item.status || 'Compliant',
      is_compliant: item.is_compliant || true,
      condition_notes: item.condition_notes || '',
      notes: item.notes || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;

    try {
      const api = ApiService.getInstance();
      const patchData = {
        check_date: editFormData.check_date,
        check_type: editFormData.check_type,
        status: editFormData.status,
        is_compliant: editFormData.is_compliant,
        condition_notes: editFormData.condition_notes,
        notes: editFormData.notes,
      };

      const response = await api.patch(
        `/occupational-health/ppe-compliance-results/${selectedItem.id}/`,
        patchData
      );

      if (response.success) {
        setResults(
          results.map(r =>
            r.id === selectedItem.id
              ? {
                  ...r,
                  ...patchData,
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

  const handleDelete = async (item: PPEComplianceResult) => {
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
              const response = await api.delete(`/occupational-health/ppe-compliance-results/${item.id}/`);
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
      
      const matchStatus = filterStatus === 'all' || item.status_badge === filterStatus;
      const matchCompliance = filterCompliance === 'all' || 
        (filterCompliance === 'yes' ? item.is_compliant : !item.is_compliant);
      
      return matchSearch && matchStatus && matchCompliance;
    });

    result.sort((a, b) => {
      if (sortBy === 'name') {
        return a.worker_name.localeCompare(b.worker_name);
      } else {
        return new Date(b.check_date).getTime() - new Date(a.check_date).getTime();
      }
    });

    return result;
  }, [results, searchQuery, filterStatus, filterCompliance, sortBy]);

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
      backgroundColor: '#5B65DC',
      borderColor: '#5B65DC',
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
      backgroundColor: '#5B65DC',
      borderColor: '#5B65DC',
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
    resultValues: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
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
      backgroundColor: '#5B65DC',
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
              <Text style={styles.title}>Conformité EPI</Text>
            </View>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: '#5B65DC' }]}
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

          {/* Compliance Filter */}
          <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.md }}>
            Conformité:
          </Text>
          <View style={styles.filterRow}>
            {(['all', 'yes', 'no'] as const).map(comp => (
              <TouchableOpacity
                key={comp}
                style={[
                  styles.filterButton,
                  filterCompliance === comp && styles.filterButtonActive,
                ]}
                onPress={() => setFilterCompliance(comp)}
              >
                <Text
                  style={[
                    styles.filterText,
                    filterCompliance === comp && styles.filterTextActive,
                  ]}
                >
                  {comp === 'all' ? 'Tous' : comp === 'yes' ? 'Conforme' : 'Non conforme'}
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
            <ActivityIndicator size="large" color="#5B65DC" style={{ marginVertical: 40 }} />
          ) : filteredAndSorted.length > 0 ? (
            filteredAndSorted.map(result => (
              <View key={result.id} style={[styles.resultCard, shadows.sm]}>
                <View style={styles.resultCardLeft}>
                  <View style={[styles.statusIcon, { backgroundColor: getStatusColor(result.status_badge) + '20' }]}>
                    <MaterialCommunityIcons name="shield-outline" size={24} color={getStatusColor(result.status_badge)} />
                  </View>
                </View>

                <View style={styles.resultCardCenter}>
                  <Text style={styles.resultWorkerName}>{result.worker_name}</Text>
                  <Text style={styles.resultDate}>{new Date(result.check_date).toLocaleDateString('fr-FR')}</Text>
                  <Text style={styles.resultValues}>
                    Type: {result.check_type} | Statut: {result.status}
                  </Text>
                  {!result.is_compliant && result.condition_notes && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}>
                      <MaterialCommunityIcons name="alert-circle" size={12} color="#F59E0B" />
                      <Text style={{ fontSize: 11, color: '#F59E0B', marginLeft: spacing.xs }}>{result.condition_notes}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.resultCardRight}>
                  <View style={[styles.statusBadge, { backgroundColor: result.is_compliant ? '#22C55E20' : '#EF444420' }]}>
                    <Text style={[styles.statusBadgeText, { color: result.is_compliant ? '#22C55E' : '#EF4444' }]}>
                      {result.is_compliant ? 'Conforme' : 'Non conforme'}
                    </Text>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleOpenEdit(result)}
                    >
                      <MaterialCommunityIcons name="pencil" size={18} color="#5B65DC" />
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
              <MaterialCommunityIcons name="shield-outline" size={48} color={colors.textSecondary + '40'} />
              <Text style={styles.emptyStateText}>Aucun résultat de conformité EPI</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '95%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter une vérification EPI</Text>
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

              <Text style={styles.formLabel}>Date de vérification</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={formData.check_date}
                onChangeText={(text) => setFormData({ ...formData, check_date: text })}
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.formLabel}>Type d'EPI</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
                {(['Hard Hat', 'Safety Shoes', 'Gloves', 'Mask', 'Harness', 'Other'] as const).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.selectInput,
                      { marginRight: spacing.md },
                      formData.check_type === type && { backgroundColor: '#5B65DC' }
                    ]}
                    onPress={() => setFormData({ ...formData, check_type: type })}
                  >
                    <Text style={[{ fontSize: 12, fontWeight: '500', color: colors.text }, formData.check_type === type && { color: '#FFF' }]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.formLabel}>Statut</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
                {(['In Use', 'Expired', 'Damaged', 'Lost', 'Replaced', 'Compliant', 'Non-Compliant'] as const).map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.selectInput,
                      { marginRight: spacing.md },
                      formData.status === s && { backgroundColor: '#5B65DC' }
                    ]}
                    onPress={() => setFormData({ ...formData, status: s })}
                  >
                    <Text style={[{ fontSize: 10, fontWeight: '500', color: colors.text }, formData.status === s && { color: '#FFF' }]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.formLabel}>Conforme</Text>
              <View style={styles.switchContainer}>
                <Text style={{ color: colors.text }}>Non</Text>
                <Switch
                  value={formData.is_compliant}
                  onValueChange={(value) => setFormData({ ...formData, is_compliant: value })}
                  trackColor={{ false: '#CCCCCC', true: '#5B65DC' }}
                  thumbColor={formData.is_compliant ? '#FFF' : '#999'}
                />
                <Text style={{ color: colors.text }}>Oui</Text>
              </View>

              <Text style={styles.formLabel}>Notes d'état</Text>
              <TextInput
                style={styles.input}
                placeholder="État détaillé..."
                value={formData.condition_notes}
                onChangeText={(text) => setFormData({ ...formData, condition_notes: text })}
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

              <TouchableOpacity style={[styles.submitButton, { backgroundColor: '#5B65DC' }]} onPress={handleSubmit}>
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
              <Text style={styles.modalTitle}>Modifier la vérification EPI</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formSection}>
              <Text style={styles.formLabel}>Date de vérification</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={editFormData.check_date}
                onChangeText={(text) => setEditFormData({ ...editFormData, check_date: text })}
              />

              <Text style={styles.formLabel}>Type d'EPI</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
                {(['Hard Hat', 'Safety Shoes', 'Gloves', 'Mask', 'Harness', 'Other'] as const).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.selectInput,
                      { marginRight: spacing.md },
                      editFormData.check_type === type && { backgroundColor: '#5B65DC' }
                    ]}
                    onPress={() => setEditFormData({ ...editFormData, check_type: type })}
                  >
                    <Text style={[{ fontSize: 12, fontWeight: '500', color: colors.text }, editFormData.check_type === type && { color: '#FFF' }]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.formLabel}>Statut</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
                {(['In Use', 'Expired', 'Damaged', 'Lost', 'Replaced', 'Compliant', 'Non-Compliant'] as const).map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.selectInput,
                      { marginRight: spacing.md },
                      editFormData.status === s && { backgroundColor: '#5B65DC' }
                    ]}
                    onPress={() => setEditFormData({ ...editFormData, status: s })}
                  >
                    <Text style={[{ fontSize: 10, fontWeight: '500', color: colors.text }, editFormData.status === s && { color: '#FFF' }]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.formLabel}>Conforme</Text>
              <View style={styles.switchContainer}>
                <Text style={{ color: colors.text }}>Non</Text>
                <Switch
                  value={editFormData.is_compliant}
                  onValueChange={(value) => setEditFormData({ ...editFormData, is_compliant: value })}
                  trackColor={{ false: '#CCCCCC', true: '#5B65DC' }}
                  thumbColor={editFormData.is_compliant ? '#FFF' : '#999'}
                />
                <Text style={{ color: colors.text }}>Oui</Text>
              </View>

              <Text style={styles.formLabel}>Notes d'état</Text>
              <TextInput
                style={styles.input}
                placeholder="État détaillé..."
                value={editFormData.condition_notes}
                onChangeText={(text) => setEditFormData({ ...editFormData, condition_notes: text })}
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

