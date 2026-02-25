import React, { useState } from 'react';
import { Alert, Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../../../services/ApiService';
import { SearchableList } from '../components/SearchableList';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';

interface OccupationalDiseaseResult {
  id: string;
  worker_name: string;
  worker_id?: string;
  employee_id?: string;
  diagnosis_date: string;
  status: string;
  disease_name?: string;
  determination_status?: string;
  classification?: string;
  notes?: string;
}

export function DiseasesListScreen({ navigation }: any) {
  const [results, setResults] = useState<OccupationalDiseaseResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OccupationalDiseaseResult | null>(null);
  const [editFormData, setEditFormData] = useState({
    diagnosis_date: '',
    disease_name: '',
    determination_status: '',
    classification: '',
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
      const response = await api.get('/occupational-health/occupational-diseases-results/');
      if (response.success && response.data) {
        let data = Array.isArray(response.data) ? response.data : response.data.results || [];
        // Sort by diagnosis_date descending (most recent first)
        data = data.sort((a: any, b: any) => new Date(b.diagnosis_date).getTime() - new Date(a.diagnosis_date).getTime());
        setResults(data);
      }
    } catch (error) {
      console.error('Error loading occupational disease results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: OccupationalDiseaseResult) => {
    try {
      const api = ApiService.getInstance();
      const response = await api.delete(`/occupational-health/occupational-diseases-results/${item.id}/`);
      if (response.success) {
        setResults(results.filter(r => r.id !== item.id));
        Alert.alert('Succès', 'Maladie supprimée avec succès');
      } else {
        Alert.alert('Erreur', 'Impossible de supprimer la maladie');
      }
    } catch (error) {
      console.error('Error deleting occupational disease result:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la suppression');
    }
  };

  const handleOpenEditModal = (item: OccupationalDiseaseResult) => {
    setSelectedItem(item);
    setEditFormData({
      diagnosis_date: item.diagnosis_date || '',
      disease_name: item.disease_name || '',
      determination_status: item.determination_status || '',
      classification: item.classification || '',
      notes: item.notes || '',
    });
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;
    
    try {
      const api = ApiService.getInstance();
      const response = await api.patch(`/occupational-health/occupational-diseases-results/${selectedItem.id}/`, editFormData);
      
      if (response.success) {
        setResults(results.map(r => r.id === selectedItem.id ? { ...r, ...editFormData } : r));
        setEditModalVisible(false);
        Alert.alert('Succès', 'Maladie mise à jour avec succès');
      } else {
        Alert.alert('Erreur', 'Impossible de mettre à jour la maladie');
      }
    } catch (error) {
      console.error('Error updating occupational disease result:', error);
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
      backgroundColor: '#DC2626',
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
        title="Maladies Professionnelles"
        icon="warning-outline"
        accentColor={colors.primary}
        items={results}
        loading={loading}
        searchFields={['worker_name', 'worker_id', 'employee_id']}
        sortOptions={[
          { label: 'Nom (A-Z)', key: 'worker_name' },
          { label: 'Date (Récent)', key: 'diagnosis_date' },
          { label: 'Statut', key: 'status' },
        ]}
        filterOptions={[
          { label: 'Tout', value: 'all' },
          { label: 'Diagnostiquée', value: 'diagnosed' },
          { label: 'Investigation', value: 'under_investigation' },
          { label: 'Résolue', value: 'resolved' },
        ]}
        onAddNew={() => navigation.navigate('oh-diseases' as never)}
        onItemPress={(item) => {
          navigation.navigate('oh-diseases' as never, { resultId: item.id } as never);
        }}
        onDelete={(item: any) => handleDelete(item as OccupationalDiseaseResult)}
        onEdit={(item: any) => handleOpenEditModal(item as OccupationalDiseaseResult)}
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
              <Text style={styles.modalTitle}>Modifier la maladie</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            
            <ScrollView>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Date de diagnostic</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="YYYY-MM-DD"
                  value={editFormData.diagnosis_date}
                  onChangeText={(text) => setEditFormData({ ...editFormData, diagnosis_date: text })}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nom de la maladie</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Nom de la maladie"
                  value={editFormData.disease_name}
                  onChangeText={(text) => setEditFormData({ ...editFormData, disease_name: text })}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Statut de détermination</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Statut de détermination"
                  value={editFormData.determination_status}
                  onChangeText={(text) => setEditFormData({ ...editFormData, determination_status: text })}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Classification</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Classification"
                  value={editFormData.classification}
                  onChangeText={(text) => setEditFormData({ ...editFormData, classification: text })}
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
