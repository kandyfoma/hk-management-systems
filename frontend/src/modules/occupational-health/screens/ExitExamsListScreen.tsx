import React, { useState } from 'react';
import { Alert, Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../../../services/ApiService';
import { SearchableList } from '../components/SearchableList';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';

interface ExitExamResult {
  id: string;
  worker_name: string;
  worker_id?: string;
  employee_id?: string;
  exam_date: string;
  status: string;
  exit_reason?: string;
  final_status?: string;
  notes?: string;
}

export function ExitExamsListScreen({ navigation }: any) {
  const [results, setResults] = useState<ExitExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ExitExamResult | null>(null);
  const [editFormData, setEditFormData] = useState({
    exam_date: '',
    exit_reason: '',
    final_status: '',
    notes: '',
  });

  // Load results on component mount
  React.useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      setLoading(true);
      const api = ApiService.getInstance();
      const response = await api.get('/occupational-health/exit-exams-results/');
      if (response.success && response.data) {
        let data = Array.isArray(response.data) ? response.data : response.data.results || [];
        // Sort by exam_date descending (most recent first)
        data = data.sort((a: any, b: any) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime());
        setResults(data);
      }
    } catch (error) {
      console.error('Error loading exit exam results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: ExitExamResult) => {
    try {
      const api = ApiService.getInstance();
      const response = await api.delete(`/occupational-health/exit-exams-results/${item.id}/`);
      if (response.success) {
        setResults(results.filter(r => r.id !== item.id));
        Alert.alert('Succès', 'Examen supprimé avec succès');
      } else {
        Alert.alert('Erreur', 'Impossible de supprimer l\'examen');
      }
    } catch (error) {
      console.error('Error deleting exit exam result:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la suppression');
    }
  };

  const handleOpenEditModal = (item: ExitExamResult) => {
    setSelectedItem(item);
    setEditFormData({
      exam_date: item.exam_date || '',
      exit_reason: item.exit_reason || '',
      final_status: item.final_status || '',
      notes: item.notes || '',
    });
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;
    
    try {
      const api = ApiService.getInstance();
      const response = await api.patch(`/occupational-health/exit-exams-results/${selectedItem.id}/`, editFormData);
      
      if (response.success) {
        setResults(results.map(r => r.id === selectedItem.id ? { ...r, ...editFormData } : r));
        setEditModalVisible(false);
        Alert.alert('Succès', 'Examen mis à jour avec succès');
      } else {
        Alert.alert('Erreur', 'Impossible de mettre à jour l\'examen');
      }
    } catch (error) {
      console.error('Error updating exit exam result:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la mise à jour');
    }
  };

  const styles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: borderRadius.lg,
      borderTopRightRadius: borderRadius.lg,
      padding: spacing.lg,
      maxHeight: '80%',
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
      color: '#1F2937',
    },
    closeButton: {
      padding: spacing.sm,
    },
    formGroup: {
      marginBottom: spacing.lg,
    },
    formLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: '#374151',
      marginBottom: spacing.sm,
    },
    formInput: {
      borderWidth: 1,
      borderColor: '#D1D5DB',
      borderRadius: borderRadius.md,
      padding: spacing.md,
      fontSize: 14,
      backgroundColor: '#F9FAFB',
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    button: {
      flex: 1,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveButton: {
      backgroundColor: '#F97316',
    },
    cancelButton: {
      backgroundColor: '#E5E7EB',
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: 14,
    },
    cancelButtonText: {
      color: '#374151',
      fontWeight: '600',
      fontSize: 14,
    },
  });

  return (
    <>
      <SearchableList
        title="Examens de Départ"
        icon="log-out-outline"
        accentColor={colors.accent}
        items={results}
        loading={loading}
        searchFields={['worker_name', 'worker_id', 'employee_id']}
        sortOptions={[
          { label: 'Nom (A-Z)', key: 'worker_name' },
          { label: 'Date (Récent)', key: 'exam_date' },
          { label: 'Statut', key: 'status' },
        ]}
        filterOptions={[
          { label: 'Tout', value: 'all' },
          { label: 'Complété', value: 'completed' },
          { label: 'En attente', value: 'pending' },
          { label: 'Annulé', value: 'cancelled' },
        ]}
        onAddNew={() => navigation.navigate('oh-exit-exams' as never)}
        onItemPress={(item) => {
          navigation.navigate('oh-exit-exams' as never, { resultId: item.id } as never);
        }}
        onDelete={(item: any) => handleDelete(item as ExitExamResult)}
        onEdit={(item: any) => handleOpenEditModal(item as ExitExamResult)}
      />
      
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier l'examen</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            
            <ScrollView>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Date d'examen</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="YYYY-MM-DD"
                  value={editFormData.exam_date}
                  onChangeText={(text) => setEditFormData({ ...editFormData, exam_date: text })}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Raison de départ</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Raison de départ"
                  value={editFormData.exit_reason}
                  onChangeText={(text) => setEditFormData({ ...editFormData, exit_reason: text })}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Statut final</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Statut final"
                  value={editFormData.final_status}
                  onChangeText={(text) => setEditFormData({ ...editFormData, final_status: text })}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notes</Text>
                <TextInput
                  style={[styles.formInput, { height: 100, textAlignVertical: 'top' }]}
                  placeholder="Notes supplémentaires"
                  multiline={true}
                  value={editFormData.notes}
                  onChangeText={(text) => setEditFormData({ ...editFormData, notes: text })}
                />
              </View>
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleSaveEdit}
                >
                  <Text style={styles.saveButtonText}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
