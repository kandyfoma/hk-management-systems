import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/theme';
import { commonStyles } from '../../../theme/commonStyles';
import { DatabaseService } from '../../../services/DatabaseService';
import { Patient } from '../../../models/Patient';
import { Drug } from '../../../models/Drug';
import { Prescription, PrescriptionItem } from '../../../models/Prescription';

interface PrescriptionFormData {
  patientId?: string;
  doctorName: string;
  instructions: string;
  items: {
    drugId: string;
    drugName: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }[];
}

export function HospitalPrescriptionsScreen() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showDrugModal, setShowDrugModal] = useState(false);
  const [drugSearchQuery, setDrugSearchQuery] = useState('');
  const [formData, setFormData] = useState<PrescriptionFormData>({
    doctorName: 'Dr. Jean Mukendi', // Default doctor name
    instructions: '',
    items: [],
  });

  // Load initial data
  useEffect(() => {
    loadPatients();
    loadDrugs();
  }, []);

  const loadPatients = async () => {
    const allPatients = await DatabaseService.getAllPatients();
    setPatients(allPatients);
  };

  const loadDrugs = async () => {
    const allDrugs = await DatabaseService.getAllDrugs();
    setDrugs(allDrugs);
  };

  // Filter patients based on search query
  const filteredPatients = patients.filter(patient =>
    patient.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.id.includes(searchQuery)
  );

  // Filter drugs based on search query
  const filteredDrugs = drugs.filter(drug =>
    drug.name.toLowerCase().includes(drugSearchQuery.toLowerCase()) ||
    drug.dci?.toLowerCase().includes(drugSearchQuery.toLowerCase()) ||
    drug.barcode?.includes(drugSearchQuery)
  );

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setFormData({ ...formData, patientId: patient.id });
    setShowPatientModal(false);
    setSearchQuery('');
  };

  const handleAddMedication = (drug: Drug) => {
    const newItem = {
      drugId: drug.id,
      drugName: drug.name,
      dosage: '',
      frequency: '',
      duration: '',
      instructions: '',
    };
    setFormData({
      ...formData,
      items: [...formData.items, newItem],
    });
    setShowDrugModal(false);
    setDrugSearchQuery('');
  };

  const handleRemoveMedication = (index: number) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: updatedItems });
  };

  const handleMedicationChange = (index: number, field: string, value: string) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setFormData({ ...formData, items: updatedItems });
  };

  const validateForm = (): string | null => {
    if (!formData.patientId) {
      return 'Veuillez sélectionner un patient';
    }
    if (!formData.doctorName.trim()) {
      return 'Le nom du médecin est requis';
    }
    if (formData.items.length === 0) {
      return 'Ajoutez au moins un médicament';
    }
    for (const item of formData.items) {
      if (!item.dosage.trim() || !item.frequency.trim() || !item.duration.trim()) {
        return 'Tous les champs des médicaments sont requis';
      }
    }
    return null;
  };

  const handleCreatePrescription = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Erreur de validation', validationError);
      return;
    }

    try {
      const organization = await DatabaseService.getCurrentOrganization();
      if (!organization) {
        Alert.alert('Erreur', 'Organisation non trouvée');
        return;
      }

      const prescription: Omit<Prescription, 'id' | 'createdAt' | 'updatedAt'> = {
        patientId: formData.patientId!,
        organizationId: organization.id,
        doctorName: formData.doctorName,
        instructions: formData.instructions,
        status: 'pending',
      };

      const prescriptionItems: Omit<PrescriptionItem, 'id' | 'prescriptionId'>[] = formData.items.map(item => ({
        drugId: item.drugId,
        drugName: item.drugName,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        instructions: item.instructions,
        status: 'pending',
        quantityPrescribed: 1, // Default quantity
        quantityDispensed: 0,
      }));

      await DatabaseService.createPrescription(prescription, prescriptionItems);

      Alert.alert(
        'Succès',
        'L\'ordonnance a été créée avec succès et transmise à la pharmacie.',
        [
          {
            text: 'Créer une nouvelle ordonnance',
            onPress: resetForm,
          },
          {
            text: 'OK',
            style: 'default',
          },
        ]
      );

    } catch (error) {
      console.error('Error creating prescription:', error);
      Alert.alert('Erreur', 'Impossible de créer l\'ordonnance');
    }
  };

  const resetForm = () => {
    setFormData({
      doctorName: 'Dr. Jean Mukendi',
      instructions: '',
      items: [],
    });
    setSelectedPatient(null);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="document-text" size={24} color={colors.info} />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Création d'Ordonnances</Text>
            <Text style={styles.headerSubtitle}>
              Prescrire des médicaments pour les patients
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Patient Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="person" size={16} color={colors.info} /> Patient
          </Text>
          <TouchableOpacity
            style={[styles.patientCard, selectedPatient && styles.patientSelected]}
            onPress={() => setShowPatientModal(true)}
          >
            {selectedPatient ? (
              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </Text>
                <Text style={styles.patientDetails}>
                  ID: {selectedPatient.id} • Tél: {selectedPatient.phone}
                </Text>
                {selectedPatient.allergies && (
                  <Text style={styles.allergiesText}>
                    Allergies: {selectedPatient.allergies}
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.selectPatientPlaceholder}>
                <Ionicons name="add-circle-outline" size={20} color={colors.textSecondary} />
                <Text style={styles.selectPatientText}>Sélectionner un patient</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Doctor Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="medical" size={16} color={colors.info} /> Médecin Prescripteur
          </Text>
          <TextInput
            style={styles.input}
            value={formData.doctorName}
            onChangeText={(text) => setFormData({ ...formData, doctorName: text })}
            placeholder="Nom du médecin"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Medications */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="medical-outline" size={16} color={colors.info} /> Médicaments
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowDrugModal(true)}
            >
              <Ionicons name="add" size={16} color={colors.white} />
              <Text style={styles.addButtonText}>Ajouter</Text>
            </TouchableOpacity>
          </View>

          {formData.items.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="medical-outline" size={32} color={colors.textSecondary} />
              <Text style={styles.emptyStateText}>Aucun médicament ajouté</Text>
              <Text style={styles.emptyStateSubtext}>
                Cliquez sur "Ajouter" pour prescrire des médicaments
              </Text>
            </View>
          ) : (
            formData.items.map((item, index) => (
              <View key={index} style={styles.medicationCard}>
                <View style={styles.medicationHeader}>
                  <Text style={styles.medicationName}>{item.drugName}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveMedication(index)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="close" size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>

                <View style={styles.medicationFields}>
                  <View style={styles.fieldRow}>
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>Dosage</Text>
                      <TextInput
                        style={styles.fieldInput}
                        value={item.dosage}
                        onChangeText={(text) => handleMedicationChange(index, 'dosage', text)}
                        placeholder="Ex: 500mg"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>Fréquence</Text>
                      <TextInput
                        style={styles.fieldInput}
                        value={item.frequency}
                        onChangeText={(text) => handleMedicationChange(index, 'frequency', text)}
                        placeholder="Ex: 2x/jour"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>
                  <View style={styles.fieldRow}>
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>Durée</Text>
                      <TextInput
                        style={styles.fieldInput}
                        value={item.duration}
                        onChangeText={(text) => handleMedicationChange(index, 'duration', text)}
                        placeholder="Ex: 7 jours"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>
                  <View style={styles.fullField}>
                    <Text style={styles.fieldLabel}>Instructions spéciales</Text>
                    <TextInput
                      style={[styles.fieldInput, styles.textArea]}
                      value={item.instructions}
                      onChangeText={(text) => handleMedicationChange(index, 'instructions', text)}
                      placeholder="Instructions particulières..."
                      placeholderTextColor={colors.textSecondary}
                      multiline
                      numberOfLines={2}
                    />
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* General Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="clipboard-outline" size={16} color={colors.info} /> Instructions Générales
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.instructions}
            onChangeText={(text) => setFormData({ ...formData, instructions: text })}
            placeholder="Instructions générales pour l'ordonnance..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.resetButton} onPress={resetForm}>
            <Ionicons name="refresh" size={16} color={colors.textSecondary} />
            <Text style={styles.resetButtonText}>Réinitialiser</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.createButton} onPress={handleCreatePrescription}>
            <Ionicons name="checkmark" size={16} color={colors.white} />
            <Text style={styles.createButtonText}>Créer l'Ordonnance</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Patient Selection Modal */}
      <Modal
        visible={showPatientModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPatientModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner un Patient</Text>
            <TouchableOpacity
              onPress={() => setShowPatientModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchSection}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Rechercher par nom ou ID..."
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <ScrollView style={styles.patientsList}>
            {filteredPatients.map((patient) => (
              <TouchableOpacity
                key={patient.id}
                style={styles.patientItem}
                onPress={() => handlePatientSelect(patient)}
              >
                <View style={styles.patientItemContent}>
                  <Text style={styles.patientItemName}>
                    {patient.firstName} {patient.lastName}
                  </Text>
                  <Text style={styles.patientItemDetails}>
                    ID: {patient.id} • Tél: {patient.phone}
                  </Text>
                  {patient.allergies && (
                    <Text style={styles.patientItemAllergies}>
                      Allergies: {patient.allergies}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Drug Selection Modal */}
      <Modal
        visible={showDrugModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDrugModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ajouter un Médicament</Text>
            <TouchableOpacity
              onPress={() => setShowDrugModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchSection}>
            <TextInput
              style={styles.searchInput}
              value={drugSearchQuery}
              onChangeText={setDrugSearchQuery}
              placeholder="Rechercher un médicament..."
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <ScrollView style={styles.drugsList}>
            {filteredDrugs.map((drug) => (
              <TouchableOpacity
                key={drug.id}
                style={styles.drugItem}
                onPress={() => handleAddMedication(drug)}
              >
                <View style={styles.drugItemContent}>
                  <Text style={styles.drugItemName}>{drug.name}</Text>
                  <Text style={styles.drugItemDetails}>
                    DCI: {drug.dci || 'N/A'} • Forme: {drug.form || 'N/A'}
                  </Text>
                  <Text style={styles.drugItemPrice}>
                    Prix: {drug.sellingPrice?.toFixed(2) || '0.00'} FC
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
  },
  headerTitle: {
    ...commonStyles.title,
    fontSize: 20,
    marginBottom: 2,
  },
  headerSubtitle: {
    ...commonStyles.subtitle,
    fontSize: 14,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    ...commonStyles.subtitle,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: colors.textPrimary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  patientCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  patientSelected: {
    borderColor: colors.info,
    backgroundColor: colors.info + '08',
  },
  patientInfo: {
    // Patient info styles
  },
  patientName: {
    ...commonStyles.title,
    fontSize: 16,
    marginBottom: 4,
  },
  patientDetails: {
    ...commonStyles.subtitle,
    fontSize: 14,
    marginBottom: 4,
  },
  allergiesText: {
    ...commonStyles.subtitle,
    fontSize: 12,
    color: colors.warning,
    fontStyle: 'italic',
  },
  selectPatientPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  selectPatientText: {
    ...commonStyles.subtitle,
    marginLeft: 8,
    fontSize: 14,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.info,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: colors.white,
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyStateText: {
    ...commonStyles.subtitle,
    fontSize: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    ...commonStyles.subtitle,
    fontSize: 14,
  },
  medicationCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  medicationName: {
    ...commonStyles.title,
    fontSize: 16,
    flex: 1,
  },
  removeButton: {
    padding: 4,
  },
  medicationFields: {
    // Fields container
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  field: {
    flex: 1,
  },
  fullField: {
    marginBottom: 12,
  },
  fieldLabel: {
    ...commonStyles.subtitle,
    fontSize: 14,
    marginBottom: 6,
    fontWeight: '500',
  },
  fieldInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 14,
    color: colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    paddingVertical: 24,
    gap: 12,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
    justifyContent: 'center',
  },
  resetButtonText: {
    ...commonStyles.subtitle,
    marginLeft: 4,
    fontWeight: '600',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.info,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 2,
    justifyContent: 'center',
  },
  createButtonText: {
    color: colors.white,
    marginLeft: 4,
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...commonStyles.title,
    fontSize: 18,
  },
  modalCloseButton: {
    padding: 4,
  },
  searchSection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: colors.white,
  },
  searchInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
    color: colors.textPrimary,
  },
  patientsList: {
    flex: 1,
    paddingHorizontal: 24,
  },
  patientItem: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  patientItemContent: {
    // Content styles
  },
  patientItemName: {
    ...commonStyles.title,
    fontSize: 16,
    marginBottom: 4,
  },
  patientItemDetails: {
    ...commonStyles.subtitle,
    fontSize: 14,
    marginBottom: 2,
  },
  patientItemAllergies: {
    ...commonStyles.subtitle,
    fontSize: 12,
    color: colors.warning,
    fontStyle: 'italic',
  },
  drugsList: {
    flex: 1,
    paddingHorizontal: 24,
  },
  drugItem: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  drugItemContent: {
    // Content styles
  },
  drugItemName: {
    ...commonStyles.title,
    fontSize: 16,
    marginBottom: 4,
  },
  drugItemDetails: {
    ...commonStyles.subtitle,
    fontSize: 14,
    marginBottom: 2,
  },
  drugItemPrice: {
    ...commonStyles.subtitle,
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },
});