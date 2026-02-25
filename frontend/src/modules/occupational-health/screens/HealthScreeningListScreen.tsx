import React, { useState } from 'react';
import { Alert, Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../../../services/ApiService';
import { SearchableList } from '../components/SearchableList';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';

interface HealthScreeningResult {
  id: string;
  worker_name: string;
  worker_id?: string;
  employee_id?: string;
  screening_date: string;
  status: string;
  cholesterol_level?: string;
  blood_pressure?: string;
  heart_rate?: string;
  notes?: string;
}

export function HealthScreeningListScreen({ navigation }: any) {
  const [results, setResults] = useState<HealthScreeningResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<HealthScreeningResult | null>(null);
  const [editFormData, setEditFormData] = useState({
    screening_date: '',
    cholesterol_level: '',
    blood_pressure: '',
    heart_rate: '',
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
      const response = await api.get('/occupational-health/health-screening-results/');
      if (response.success && response.data) {
        let data = Array.isArray(response.data) ? response.data : response.data.results || [];
        // Sort by screening_date descending (most recent first)
        data = data.sort((a: any, b: any) => new Date(b.screening_date).getTime() - new Date(a.screening_date).getTime());
        setResults(data);
      }
    } catch (error) {
      console.error('Error loading health screening results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: HealthScreeningResult) => {
    try {
      const api = ApiService.getInstance();
      const response = await api.delete(`/occupational-health/health-screening-results/${item.id}/`);
      if (response.success) {
        setResults(results.filter(r => r.id !== item.id));
        Alert.alert('Succès', 'Résultat supprimé avec succès');
      } else {
        Alert.alert('Erreur', 'Impossible de supprimer le résultat');
      }
    } catch (error) {
      console.error('Error deleting health screening result:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la suppression');
    }
  };

  const handleOpenEditModal = (item: HealthScreeningResult) => {
    setSelectedItem(item);
    setEditFormData({
      screening_date: item.screening_date || '',
      cholesterol_level: item.cholesterol_level || '',
      blood_pressure: item.blood_pressure || '',
      heart_rate: item.heart_rate || '',
      notes: item.notes || '',
    });
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;
    
    try {
      const api = ApiService.getInstance();
      const response = await api.patch(`/occupational-health/health-screening-results/${selectedItem.id}/`, editFormData);
      
      if (response.success) {
        setResults(results.map(r => r.id === selectedItem.id ? { ...r, ...editFormData } : r));
        setEditModalVisible(false);
        Alert.alert('Succès', 'Résultat mis à jour avec succès');
      } else {
        Alert.alert('Erreur', 'Impossible de mettre à jour le résultat');
      }
    } catch (error) {
      console.error('Error updating health screening result:', error);
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
      backgroundColor: '#14B8A6',
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
        title="Dépistages Santé"
        icon="document-text-outline"
        accentColor={colors.secondary}
        items={results}
        loading={loading}
        searchFields={['worker_name', 'worker_id', 'employee_id']}
        sortOptions={[
          { label: 'Nom (A-Z)', key: 'worker_name' },
          { label: 'Date (Récent)', key: 'screening_date' },
          { label: 'Statut', key: 'status' },
        ]}
        filterOptions={[
          { label: 'Tout', value: 'all' },
          { label: 'Normal', value: 'normal' },
          { label: 'À risque', value: 'at_risk' },
          { label: 'Critique', value: 'critical' },
        ]}
        onAddNew={() => navigation.navigate('oh-health-screening' as never)}
        onItemPress={(item) => {
          navigation.navigate('oh-health-screening' as never, { resultId: item.id } as never);
        }}
        onDelete={(item: any) => handleDelete(item as HealthScreeningResult)}
        onEdit={(item: any) => handleOpenEditModal(item as HealthScreeningResult)}
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
              <Text style={styles.modalTitle}>Modifier le dépistage</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            
            <ScrollView>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Date du dépistage</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="YYYY-MM-DD"
                  value={editFormData.screening_date}
                  onChangeText={(text) => setEditFormData({ ...editFormData, screening_date: text })}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Cholestérol</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Niveau de cholestérol"
                  value={editFormData.cholesterol_level}
                  onChangeText={(text) => setEditFormData({ ...editFormData, cholesterol_level: text })}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Tension artérielle</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Tension artérielle"
                  value={editFormData.blood_pressure}
                  onChangeText={(text) => setEditFormData({ ...editFormData, blood_pressure: text })}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Fréquence cardiaque</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Fréquence cardiaque"
                  value={editFormData.heart_rate}
                  onChangeText={(text) => setEditFormData({ ...editFormData, heart_rate: text })}
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
