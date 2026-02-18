import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Alert,
  TextInput,
  Platform,
  Dimensions,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useToast } from '../components/GlobalUI';
import { colors, borderRadius, shadows, spacing } from '../theme/theme';
import ApiService from '../services/ApiService';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const isTablet = width >= 768;

interface User {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  employee_id?: string;
  primary_role: string;
  department?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

interface UserFormData {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  employee_id: string;
  primary_role: string;
  department: string;
  password?: string;
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Super Administrateur' },
  { value: 'hospital_admin', label: 'Administrateur Hospitalier' },
  { value: 'pharmacy_admin', label: 'Administrateur Pharmacie' },
  { value: 'doctor', label: 'Médecin' },
  { value: 'nurse', label: 'Infirmier(e)' },
  { value: 'pharmacist', label: 'Pharmacien' },
  { value: 'pharmacy_tech', label: 'Technicien Pharmacie' },
  { value: 'receptionist', label: 'Réceptionniste' },
  { value: 'lab_technician', label: 'Technicien Laboratoire' },
  { value: 'cashier', label: 'Caissier(ière)' },
  { value: 'inventory_manager', label: 'Gestionnaire Inventaire' },
];

const DEPARTMENT_OPTIONS = [
  { value: 'Médecine Générale', label: 'Médecine Générale' },
  { value: 'Pédiatrie', label: 'Pédiatrie' },
  { value: 'Chirurgie', label: 'Chirurgie' },
  { value: 'Obstétrique-Gynécologie', label: 'Obstétrique-Gynécologie' },
  { value: 'Urgences', label: 'Urgences' },
  { value: 'Pharmacie', label: 'Pharmacie' },
  { value: 'Laboratoire', label: 'Laboratoire' },
  { value: 'Radiologie', label: 'Radiologie' },
  { value: 'Cardiologie', label: 'Cardiologie' },
  { value: 'Santé Professionnelle', label: 'Santé Professionnelle' },
  { value: 'Administration', label: 'Administration' },
  { value: 'Comptabilité', label: 'Comptabilité' },
  { value: 'Ressources Humaines', label: 'Ressources Humaines' },
];

export function StaffManagementScreen() {
  const { showToast } = useToast();
  const { user, organization } = useSelector((state: RootState) => state.auth);
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    employee_id: '',
    primary_role: 'EMPLOYEE',
    department: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  
  // Bulk import state
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkImportData, setBulkImportData] = useState<any[]>([]);
  const [bulkImportLoading, setBulkImportLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getInstance().get('/auth/organization/users/');
      if (response.success && response.data) {
        setUsers(response.data);
      } else {
        showToast('Erreur lors du chargement du personnel', 'error');
      }
    } catch (error) {
      console.error('Load users error:', error);
      showToast('Erreur lors du chargement du personnel', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (u.first_name || '').toLowerCase().includes(query) ||
      (u.last_name || '').toLowerCase().includes(query) ||
      (u.phone || '').includes(query) ||
      (u.email || '').toLowerCase().includes(query) ||
      (u.employee_id || '').toLowerCase().includes(query) ||
      (u.primary_role || '').toLowerCase().includes(query) ||
      (u.department || '').toLowerCase().includes(query)
    );
  });

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      employee_id: '',
      primary_role: 'nurse',
      department: '',
    });
  };

  const handleAddUser = async () => {
    if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.phone.trim()) {
      showToast('Nom, prénom et téléphone sont requis', 'error');
      return;
    }

    // Validate phone number format
    let formattedPhone = formData.phone.trim();
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+243' + formattedPhone.substring(1);
      } else {
        formattedPhone = '+243' + formattedPhone;
      }
    }

    // Generate a secure random password
    const generatePassword = () => {
      const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%';
      let password = '';
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };

    const generatedPassword = generatePassword();

    try {
      setFormLoading(true);
      const userData = {
        ...formData,
        phone: formattedPhone,
        password: generatedPassword,
        confirm_password: generatedPassword,
        organization: organization?.id, // Auto-set to current user's organization
      };
      
      const response = await ApiService.getInstance().post('/auth/users/', userData);
      if (response.success) {
        showToast(
          `Personnel ajouté avec succès\nMot de passe temporaire: ${generatedPassword}\n(L'utilisateur doit le changer à la première connexion)`, 
          'success'
        );
        setShowAddModal(false);
        resetForm();
        loadUsers();
      } else {
        console.log('API Error:', response);
        if (response.errors) {
          // Handle field-specific errors
          const errorMessages = Object.entries(response.errors).map(([field, messages]) => {
            return `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`;
          }).join('\n');
          showToast(`Erreurs de validation:\n${errorMessages}`, 'error');
        } else {
          showToast(response.error?.message || 'Erreur lors de l\'ajout', 'error');
        }
      }
    } catch (error) {
      console.error('Add user error:', error);
      showToast('Erreur lors de l\'ajout du personnel', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditUser = async () => {
    if (!editingUser || !formData.first_name.trim() || !formData.last_name.trim()) {
      showToast('Nom et prénom sont requis', 'error');
      return;
    }

    try {
      setFormLoading(true);
      const updateData = { ...formData };
      
      const response = await ApiService.getInstance().patch(`/auth/users/${editingUser.id}/`, updateData);
      if (response.success) {
        showToast('Personnel modifié avec succès', 'success');
        setShowEditModal(false);
        setEditingUser(null);
        resetForm();
        loadUsers();
      } else {
        if (response.errors) {
          const errorMessages = Object.entries(response.errors).map(([field, messages]) => {
            return `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`;
          }).join('\n');
          showToast(`Erreurs de validation:\n${errorMessages}`, 'error');
        } else {
          showToast(response.error?.message || 'Erreur lors de la modification', 'error');
        }
      }
    } catch (error) {
      console.error('Update user error:', error);
      showToast('Erreur lors de la modification du personnel', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteUser = (userToDelete: User) => {
    Alert.alert(
      'Désactiver Personnel',
      `Êtes-vous sûr de vouloir désactiver ${userToDelete.first_name} ${userToDelete.last_name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Désactiver', 
          style: 'destructive',
          onPress: () => performDeleteUser(userToDelete)
        }
      ]
    );
  };

  const performDeleteUser = async (userToDelete: User) => {
    try {
      const response = await ApiService.getInstance().delete(`/auth/users/${userToDelete.id}/`);
      if (response.success) {
        showToast('Personnel désactivé avec succès', 'success');
        loadUsers();
      } else {
        showToast('Erreur lors de la désactivation', 'error');
      }
    } catch (error) {
      console.error('Delete user error:', error);
      showToast('Erreur lors de la désactivation du personnel', 'error');
    }
  };

  const openEditModal = (userToEdit: User) => {
    setEditingUser(userToEdit);
    setFormData({
      first_name: userToEdit.first_name,
      last_name: userToEdit.last_name,
      phone: userToEdit.phone,
      email: userToEdit.email || '',
      employee_id: userToEdit.employee_id || '',
      primary_role: userToEdit.primary_role,
      department: userToEdit.department || '',
      password: '', // Don't pre-fill password
    });
    setShowEditModal(true);
  };

  const handleBulkImportFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/json', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        
        try {
          // Read the file content
          const fileContent = await FileSystem.readAsStringAsync(file.uri);
          
          // Parse CSV content
          const lines = fileContent.split('\n').filter(line => line.trim());
          if (lines.length < 2) {
            showToast('Le fichier doit contenir au moins une ligne d\'en-tête et une ligne de données', 'error');
            return;
          }
          
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          const dataLines = lines.slice(1);
          
          const importData = dataLines.map((line, index) => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const rowData: any = {};
            
            headers.forEach((header, i) => {
              const value = values[i] || '';
              // Map CSV headers to our field names
              switch (header.toLowerCase()) {
                case 'prénom':
                case 'first_name':
                case 'prenom':
                  rowData.first_name = value;
                  break;
                case 'nom':
                case 'last_name':
                  rowData.last_name = value;
                  break;
                case 'téléphone':
                case 'phone':
                case 'telephone':
                  rowData.phone = value;
                  break;
                case 'email':
                case 'e-mail':
                  rowData.email = value;
                  break;
                case 'id_employé':
                case 'employee_id':
                case 'id_employe':
                  rowData.employee_id = value;
                  break;
                case 'rôle':
                case 'role':
                case 'primary_role':
                  rowData.role = value.toUpperCase();
                  break;
                case 'département':
                case 'department':
                case 'departement':
                  rowData.department = value;
                  break;
                case 'mot_de_passe':
                case 'password':
                  rowData.password = value || 'password123';
                  break;
                default:
                  break;
              }
            });
            
            return rowData;
          });
          
          setBulkImportData(importData);
          setShowBulkImportModal(true);
          showToast(`Fichier ${file.name} chargé avec ${importData.length} entrées`, 'info');
        } catch (parseError) {
          console.error('File parsing error:', parseError);
          showToast('Erreur lors de la lecture du fichier. Vérifiez le format CSV.', 'error');
        }
      }
    } catch (error) {
      console.error('File picker error:', error);
      showToast('Erreur lors de la sélection du fichier', 'error');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const csvContent = 'prénom,nom,téléphone,email,id_employé,rôle,département,mot_de_passe\n' +
                        'Jean,Dupont,+243123456001,jean.dupont@hospital.cd,EMP001,DOCTOR,Cardiologie,password123\n' +
                        'Marie,Mbala,+243123456002,marie.mbala@hospital.cd,EMP002,NURSE,Pédiatrie,password123\n' +
                        'Paul,Mukendi,+243123456003,paul.mukendi@hospital.cd,EMP003,PHARMACIST,Pharmacie,password123';
      
      if (Platform.OS === 'web') {
        // For web, create a download link
        const element = document.createElement('a');
        const file = new Blob([csvContent], { type: 'text/csv' });
        element.href = URL.createObjectURL(file);
        element.download = 'modele_personnel.csv';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        showToast('Modèle CSV téléchargé', 'success');
      } else {
        // For mobile, save to device and share
        const fileUri = FileSystem.documentDirectory + 'modele_personnel.csv';
        await FileSystem.writeAsStringAsync(fileUri, csvContent);
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Modèle CSV Personnel',
          });
        } else {
          showToast('Modèle CSV sauvegardé dans Documents', 'success');
        }
      }
    } catch (error) {
      console.error('Template download error:', error);
      showToast('Erreur lors du téléchargement du modèle', 'error');
    }
  };

  const performBulkImport = async () => {
    if (bulkImportData.length === 0) {
      showToast('Aucune donnée à importer', 'error');
      return;
    }

    try {
      setBulkImportLoading(true);
      const response = await ApiService.getInstance().post('/auth/users/bulk-import/', {
        users: bulkImportData
      });
      
      if (response.success && response.data) {
        const { created_count, error_count, errors } = response.data;
        showToast(`Import terminé: ${created_count} créés, ${error_count} erreurs`, 'success');
        
        if (errors.length > 0) {
          Alert.alert('Erreurs d\'import', errors.join('\n'));
        }
        
        setShowBulkImportModal(false);
        setBulkImportData([]);
        loadUsers();
      } else {
        showToast('Erreur lors de l\'import en lot', 'error');
      }
    } catch (error) {
      console.error('Bulk import error:', error);
      showToast('Erreur lors de l\'import en lot', 'error');
    } finally {
      setBulkImportLoading(false);
    }
  };

  const renderUserCard = ({ item: user }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={styles.userHeader}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: user.is_active ? colors.success + '20' : colors.error + '20' }
          ]}>
            <View style={[
              styles.statusDot,
              { backgroundColor: user.is_active ? colors.success : colors.error }
            ]} />
            <Text style={[
              styles.statusText,
              { color: user.is_active ? colors.success : colors.error }
            ]}>
              {user.is_active ? 'Actif' : 'Inactif'}
            </Text>
          </View>
          <Text style={styles.roleText}>
            {ROLE_OPTIONS.find(r => r.value === user.primary_role)?.label || user.primary_role}
          </Text>
        </View>
        
        <Text style={styles.userName}>
          {user.first_name} {user.last_name}
        </Text>
        
        <View style={styles.userDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="call" size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>{user.phone}</Text>
          </View>
          
          {user.email && (
            <View style={styles.detailRow}>
              <Ionicons name="mail" size={16} color={colors.textSecondary} />
              <Text style={styles.detailText}>{user.email}</Text>
            </View>
          )}
          
          {user.employee_id && (
            <View style={styles.detailRow}>
              <Ionicons name="id-card" size={16} color={colors.textSecondary} />
              <Text style={styles.detailText}>ID: {user.employee_id}</Text>
            </View>
          )}
          
          {user.department && (
            <View style={styles.detailRow}>
              <Ionicons name="business" size={16} color={colors.textSecondary} />
              <Text style={styles.detailText}>{user.department}</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.userActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => openEditModal(user)}
        >
          <Ionicons name="create" size={20} color={colors.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteUser(user)}
        >
          <Ionicons name="trash" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFormModal = (isEdit: boolean) => (
    <Modal
      visible={isEdit ? showEditModal : showAddModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isEdit ? 'Modifier Personnel' : 'Ajouter Personnel'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (isEdit) {
                  setShowEditModal(false);
                  setEditingUser(null);
                } else {
                  setShowAddModal(false);
                }
                resetForm();
              }}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Prénom *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.first_name}
                  onChangeText={(text) => setFormData({ ...formData, first_name: text })}
                  placeholder="Prénom"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Nom *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.last_name}
                  onChangeText={(text) => setFormData({ ...formData, last_name: text })}
                  placeholder="Nom de famille"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>
            
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Téléphone *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="+243 XXX XXX XXX"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
              />
            </View>
            
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.textInput}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="email@exemple.com"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>ID Employé</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.employee_id}
                  onChangeText={(text) => setFormData({ ...formData, employee_id: text })}
                  placeholder="EMP001"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Département</Text>
                <View style={styles.departmentSelector}>
                  {DEPARTMENT_OPTIONS.map((dept) => (
                    <TouchableOpacity
                      key={dept.value}
                      style={[
                        styles.departmentOption,
                        formData.department === dept.value && styles.departmentOptionSelected
                      ]}
                      onPress={() => setFormData({ ...formData, department: dept.value })}
                    >
                      <Text style={[
                        styles.departmentOptionText,
                        formData.department === dept.value && styles.departmentOptionTextSelected
                      ]}>
                        {dept.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Rôle</Text>
              <View style={styles.roleSelector}>
                {ROLE_OPTIONS.map((role) => (
                  <TouchableOpacity
                    key={role.value}
                    style={[
                      styles.roleOption,
                      formData.primary_role === role.value && styles.roleOptionSelected
                    ]}
                    onPress={() => setFormData({ ...formData, primary_role: role.value })}
                  >
                    <Text style={[
                      styles.roleOptionText,
                      formData.primary_role === role.value && styles.roleOptionTextSelected
                    ]}>
                      {role.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            Only show password field for editing users
            {isEdit && (
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>
                  Nouveau mot de passe (optionnel)
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.password || ''}
                  onChangeText={(text) => setFormData({ ...formData, password: text })}
                  placeholder="Laisser vide pour conserver"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry
                />
                <Text style={styles.fieldHelp}>
                  Laissez vide pour ne pas changer le mot de passe existant
                </Text>
              </View>
            )}
            
            {/* Info message for new user password */}
            {!isEdit && (
              <View style={styles.infoBox}>
                <View style={styles.infoRow}>
                  <Ionicons name="information-circle" size={20} color={colors.info} />
                  <Text style={styles.infoText}>
                    Un mot de passe sécurisé sera généré automatiquement et affiché après la création de l'utilisateur.
                  </Text>
                </View>
              </View>
            )}
            
            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.formButton, styles.cancelButton]}
                onPress={() => {
                  if (isEdit) {
                    setShowEditModal(false);
                    setEditingUser(null);
                  } else {
                    setShowAddModal(false);
                  }
                  resetForm();
                }}
              >
                <Text style={[styles.buttonText, { color: colors.textSecondary }]}>
                  Annuler
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.formButton, styles.saveButton, formLoading && styles.disabledButton]}
                onPress={isEdit ? handleEditUser : handleAddUser}
                disabled={formLoading}
              >
                {formLoading ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Text style={[styles.buttonText, { color: colors.surface }]}>
                    {isEdit ? 'Modifier' : 'Ajouter'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Chargement du personnel...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>👥 Gestion du Personnel</Text>
          <Text style={styles.headerSubtitle}>
            {filteredUsers.length} membre(s) du personnel
          </Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleDownloadTemplate}
          >
            <Ionicons name="download" size={20} color={colors.primary} />
            <Text style={styles.headerButtonText}>Modèle</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleBulkImportFile}
          >
            <Ionicons name="cloud-upload" size={20} color={colors.primary} />
            <Text style={styles.headerButtonText}>Import</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.headerButton, styles.primaryButton]}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={20} color={colors.surface} />
            <Text style={[styles.headerButtonText, { color: colors.surface }]}>
              Ajouter
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Rechercher du personnel..."
            placeholderTextColor={colors.textSecondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Users List */}
      <FlatList
        data={filteredUsers}
        renderItem={renderUserCard}
        keyExtractor={(item) => item.id}
        style={styles.usersList}
        contentContainerStyle={styles.usersListContent}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Aucun personnel trouvé</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Essayez un autre terme de recherche' : 'Commencez par ajouter du personnel'}
            </Text>
          </View>
        }
      />
      
      {/* Add/Edit User Modal */}
      {renderFormModal(false)}
      {renderFormModal(true)}
      
      {/* Bulk Import Modal */}
      <Modal
        visible={showBulkImportModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Import en Lot</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowBulkImportModal(false);
                  setBulkImportData([]);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.bulkImportContent}>
              <Text style={styles.bulkImportInfo}>
                {bulkImportData.length} entrée(s) détectée(s) dans le fichier.
              </Text>
              
              <ScrollView style={styles.previewContainer}>
                {bulkImportData.slice(0, 3).map((item, index) => (
                  <View key={index} style={styles.previewItem}>
                    <Text style={styles.previewText}>
                      {item.first_name} {item.last_name} - {item.phone} ({item.role})
                    </Text>
                  </View>
                ))}
                {bulkImportData.length > 3 && (
                  <Text style={styles.moreItemsText}>
                    ...et {bulkImportData.length - 3} autre(s)
                  </Text>
                )}
              </ScrollView>
              
              <View style={styles.bulkImportActions}>
                <TouchableOpacity
                  style={[styles.formButton, styles.cancelButton]}
                  onPress={() => {
                    setShowBulkImportModal(false);
                    setBulkImportData([]);
                  }}
                >
                  <Text style={[styles.buttonText, { color: colors.textSecondary }]}>
                    Annuler
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.formButton, styles.saveButton, bulkImportLoading && styles.disabledButton]}
                  onPress={performBulkImport}
                  disabled={bulkImportLoading}
                >
                  {bulkImportLoading ? (
                    <ActivityIndicator size="small" color={colors.surface} />
                  ) : (
                    <Text style={[styles.buttonText, { color: colors.surface }]}>
                      Importer Tout
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.textSecondary,
  },
  
  // Header
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    ...shadows.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  
  // Search
  searchContainer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  
  // Users List
  usersList: {
    flex: 1,
  },
  usersListContent: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  userCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    ...shadows.sm,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  roleText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  userDetails: {
    gap: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  
  // User Actions
  userActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: colors.primary + '14',
  },
  deleteButton: {
    backgroundColor: colors.error + '14',
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    ...shadows.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  
  // Form styles
  formContainer: {
    padding: spacing.lg,
  },
  formRow: {
    flexDirection: isDesktop ? 'row' : 'column',
    gap: spacing.md,
  },
  formField: {
    flex: 1,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  roleSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  roleOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.background,
  },
  roleOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleOptionText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  roleOptionTextSelected: {
    color: colors.surface,
    fontWeight: '600',
  },
  
  // Department selector styles
  departmentSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  departmentOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.background,
    marginBottom: spacing.xs,
  },
  departmentOptionSelected: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  departmentOptionText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  departmentOptionTextSelected: {
    color: colors.surface,
    fontWeight: '600',
  },
  
  // Info box styles
  infoBox: {
    backgroundColor: colors.info + '14',
    borderWidth: 1,
    borderColor: colors.info + '40',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  fieldHelp: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  formButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Bulk Import
  bulkImportContent: {
    padding: spacing.lg,
  },
  bulkImportInfo: {
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  previewContainer: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    maxHeight: 200,
    marginBottom: spacing.lg,
  },
  previewItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  previewText: {
    fontSize: 14,
    color: colors.text,
  },
  moreItemsText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  bulkImportActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});