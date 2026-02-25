import React, { useState } from 'react';
import { Alert, Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../../../services/ApiService';
import { SearchableList } from '../components/SearchableList';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';

interface MedicalExamResult {
  id: string;
  worker_name: string;
  worker_id?: string;
  employee_id?: string;
  exam_date: string;
  status: string;
  exam_type?: string;
  finding?: string;
  doctor_name?: string;
  notes?: string;
}

export function ExamsListScreen({ navigation }: any) {
  const [results, setResults] = useState<MedicalExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MedicalExamResult | null>(null);
  const [editFormData, setEditFormData] = useState({
    exam_date: '',
    exam_type: '',
    finding: '',
    doctor_name: '',
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
      const response = await api.get('/occupational-health/medical-exams-results/');
      if (response.success && response.data) {
        let data = Array.isArray(response.data) ? response.data : response.data.results || [];
        // Sort by exam_date descending (most recent first)
        data = data.sort((a: any, b: any) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime());
        setResults(data);
      }
    } catch (error) {
      console.error('Error loading medical exam results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item: MedicalExamResult) => {
    try {
      const api = ApiService.getInstance();
      const response = await api.delete(`/occupational-health/medical-exams-results/${item.id}/`);
      if (response.success) {
        setResults(results.filter(r => r.id !== item.id));
        Alert.alert('Succès', 'Examen supprimé avec succès');
      } else {
        Alert.alert('Erreur', 'Impossible de supprimer l\'examen');
      }
    } catch (error) {
      console.error('Error deleting medical exam result:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la suppression');
    }
  };

  const handleOpenEditModal = (item: MedicalExamResult) => {
    setSelectedItem(item);
    setEditFormData({
      exam_date: item.exam_date || '',
      exam_type: item.exam_type || '',
      finding: item.finding || '',
      doctor_name: item.doctor_name || '',
      notes: item.notes || '',
    });
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;

    try {
      const api = ApiService.getInstance();
      const updatedData = {
        exam_date: editFormData.exam_date,
        exam_type: editFormData.exam_type,
        finding: editFormData.finding,
        doctor_name: editFormData.doctor_name,
        notes: editFormData.notes,
      };

      const response = await api.patch(
        `/occupational-health/medical-exams-results/${selectedItem.id}/`,
        updatedData
      );

      if (response.success) {
        setResults(
          results.map(r =>
            r.id === selectedItem.id
              ? { ...r, ...updatedData }
              : r
          )
        );
        setEditModalVisible(false);
        setSelectedItem(null);
        Alert.alert('Succès', 'Examen mis à jour avec succès');
      } else {
        Alert.alert('Erreur', 'Impossible de mettre à jour l\'examen');
      }
    } catch (error) {
      console.error('Error updating medical exam result:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la mise à jour');
    }
  };

  const styles = StyleSheet.create({
    modal: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: borderRadius.xl,
      borderTopRightRadius: borderRadius.xl,
      padding: spacing.lg,
      maxHeight: '80%',
    },
    modalHeader: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: spacing.md,
    },
    formGroup: {
      marginBottom: spacing.md,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
      marginBottom: spacing.sm,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.outline,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      fontSize: 14,
      color: colors.text,
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
      backgroundColor: '#EC4899',
    },
    cancelButton: {
      backgroundColor: colors.outline,
    },
    buttonText: {
      fontWeight: '600',
      fontSize: 14,
    },
    saveButtonText: {
      color: colors.surface,
    },
    cancelButtonText: {
      color: colors.text,
    },
  });

  return (
    <>
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modal}>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalHeader}>Modifier l'examen</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Date de l'examen</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={editFormData.exam_date}
                onChangeText={(text) =>
                  setEditFormData({ ...editFormData, exam_date: text })
                }
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Type d'examen</Text>
              <TextInput
                style={styles.input}
                placeholder="Examen général"
                value={editFormData.exam_type}
                onChangeText={(text) =>
                  setEditFormData({ ...editFormData, exam_type: text })
                }
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Résultats</Text>
              <TextInput
                style={styles.input}
                placeholder="Normal/Anormal"
                value={editFormData.finding}
                onChangeText={(text) =>
                  setEditFormData({ ...editFormData, finding: text })
                }
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Nom du médecin</Text>
              <TextInput
                style={styles.input}
                placeholder="Médecin"
                value={editFormData.doctor_name}
                onChangeText={(text) =>
                  setEditFormData({ ...editFormData, doctor_name: text })
                }
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, { minHeight: 80 }]}
                placeholder="Ajouter des notes..."
                multiline
                value={editFormData.notes}
                onChangeText={(text) =>
                  setEditFormData({ ...editFormData, notes: text })
                }
              />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={[styles.buttonText, styles.cancelButtonText]}>
                  Annuler
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSaveEdit}
              >
                <Text style={[styles.buttonText, styles.saveButtonText]}>
                  Enregistrer
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <SearchableList
        title="Visites Médicales"
        icon="medkit-outline"
        accentColor={colors.primary}
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
          { label: 'Normal', value: 'normal' },
          { label: 'Anormal', value: 'abnormal' },
          { label: 'En attente', value: 'pending' },
        ]}
        onAddNew={() => navigation.navigate('oh-exams' as never)}
        onItemPress={(item) => {
          navigation.navigate('oh-exams' as never, { resultId: item.id } as never);
        }}
        onEdit={((item: any) => handleOpenEditModal(item as MedicalExamResult)) as any}
        onDelete={(item: any) => handleDelete(item as MedicalExamResult)}
      />
    </>
  );
}
