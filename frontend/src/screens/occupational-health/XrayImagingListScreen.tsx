import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  SafeAreaView,
  ScrollView,
  TextInput,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import WorkerSelectDropdown from '../../components/dropdown/WorkerSelectDropdown';

// Theme colors
const COLORS = {
  primary: '#122056',
  secondary: '#5B65DC',
  accent: '#818CF8',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  light: '#F3F4F6',
  dark: '#1F2937',
  border: '#E5E7EB',
  text: '#111827',
};

interface XrayImagingResult {
  id: string;
  worker_id: string;
  worker_name: string;
  employee_id: string;
  imaging_date: string;
  imaging_type: string;
  ilo_classification: string;
  profusion: string;
  pneumoconiosis_detected: boolean;
  severity: string;
  radiologist_notes: string;
  notes: string;
  status: 'normal' | 'warning' | 'critical';
  created_at: string;
  updated_at: string;
}

interface FormData {
  worker_id: string;
  imaging_date: string;
  imaging_type: string;
  ilo_classification: string;
  profusion: string;
  pneumoconiosis_detected: boolean;
  severity: string;
  radiologist_notes: string;
  notes: string;
}

const XrayImagingListScreen = () => {
  // State management
  const [xrayResults, setXrayResults] = useState<XrayImagingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'normal' | 'warning' | 'critical'>('all');
  const [filterPneumoconiosis, setFilterPneumoconiosis] = useState<'all' | 'yes' | 'no'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'status'>('recent');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedImaging, setSelectedImaging] = useState<XrayImagingResult | null>(null);
  const [editFormData, setEditFormData] = useState<FormData>({
    worker_id: '',
    imaging_date: '',
    imaging_type: '',
    ilo_classification: '',
    profusion: '',
    pneumoconiosis_detected: false,
    severity: '',
    radiologist_notes: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});

  // Fetch xray results
  const fetchXrayResults = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/occupational-health/xray-imaging-results/`,
        {
          params: { ordering: '-imaging_date', limit: 5 },
        }
      );
      setXrayResults(response.data.results || response.data);
      setErrors({});
    } catch (error) {
      console.error('Error fetching xray results:', error);
      Alert.alert('Error', 'Failed to load xray imaging results');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchXrayResults();
  }, [fetchXrayResults]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchXrayResults();
    setRefreshing(false);
  }, [fetchXrayResults]);

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!editFormData.worker_id.trim()) {
      newErrors.worker_id = 'Worker is required';
    }
    if (!editFormData.imaging_date.trim()) {
      newErrors.imaging_date = 'Imaging date is required';
    }
    if (!editFormData.imaging_type.trim()) {
      newErrors.imaging_type = 'Imaging type is required';
    }
    if (!editFormData.ilo_classification.trim()) {
      newErrors.ilo_classification = 'ILO classification is required';
    }
    if (!editFormData.profusion.trim()) {
      newErrors.profusion = 'Profusion is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Add new imaging result
  const handleAddImaging = useCallback(() => {
    setEditFormData({
      worker_id: '',
      imaging_date: new Date().toISOString().split('T')[0],
      imaging_type: '',
      ilo_classification: '',
      profusion: '',
      pneumoconiosis_detected: false,
      severity: '',
      radiologist_notes: '',
      notes: '',
    });
    setErrors({});
    setSelectedImaging(null);
    setShowAddModal(true);
  }, []);

  // Open edit modal
  const handleEditImaging = useCallback((imaging: XrayImagingResult) => {
    setSelectedImaging(imaging);
    setEditFormData({
      worker_id: imaging.worker_id,
      imaging_date: imaging.imaging_date,
      imaging_type: imaging.imaging_type,
      ilo_classification: imaging.ilo_classification,
      profusion: imaging.profusion,
      pneumoconiosis_detected: imaging.pneumoconiosis_detected,
      severity: imaging.severity,
      radiologist_notes: imaging.radiologist_notes,
      notes: imaging.notes,
    });
    setErrors({});
    setShowEditModal(true);
  }, []);

  // Save new imaging result
  const handleSaveAdd = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const postData = {
        worker_id: editFormData.worker_id,
        imaging_date: editFormData.imaging_date,
        imaging_type: editFormData.imaging_type,
        ilo_classification: editFormData.ilo_classification,
        profusion: editFormData.profusion,
        pneumoconiosis_detected: editFormData.pneumoconiosis_detected,
        severity: editFormData.severity,
        radiologist_notes: editFormData.radiologist_notes,
        notes: editFormData.notes,
      };

      await axios.post(
        `${API_BASE_URL}/occupational-health/xray-imaging-results/`,
        postData
      );

      Alert.alert('Success', 'Xray imaging result added successfully');
      setShowAddModal(false);
      await fetchXrayResults();
    } catch (error: any) {
      console.error('Error adding xray result:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to add xray imaging result';
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Save edited imaging result
  const handleSaveEdit = async () => {
    if (!validateForm() || !selectedImaging) return;

    try {
      setLoading(true);
      const patchData = {
        imaging_date: editFormData.imaging_date,
        imaging_type: editFormData.imaging_type,
        ilo_classification: editFormData.ilo_classification,
        profusion: editFormData.profusion,
        pneumoconiosis_detected: editFormData.pneumoconiosis_detected,
        severity: editFormData.severity,
        radiologist_notes: editFormData.radiologist_notes,
        notes: editFormData.notes,
      };

      await axios.patch(
        `${API_BASE_URL}/occupational-health/xray-imaging-results/${selectedImaging.id}/`,
        patchData
      );

      Alert.alert('Success', 'Xray imaging result updated successfully');
      setShowEditModal(false);
      await fetchXrayResults();
    } catch (error: any) {
      console.error('Error updating xray result:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to update xray imaging result';
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Delete imaging result
  const handleDeleteImaging = useCallback((imaging: XrayImagingResult) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete the xray imaging result for ${imaging.worker_name}?`,
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              setLoading(true);
              await axios.delete(
                `${API_BASE_URL}/occupational-health/xray-imaging-results/${imaging.id}/`
              );
              Alert.alert('Success', 'Xray imaging result deleted successfully');
              await fetchXrayResults();
            } catch (error: any) {
              console.error('Error deleting xray result:', error);
              const errorMsg = error.response?.data?.detail || 'Failed to delete xray imaging result';
              Alert.alert('Error', errorMsg);
            } finally {
              setLoading(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  }, [fetchXrayResults]);

  // Filter and search
  const filteredAndSearchedResults = xrayResults.filter((imaging) => {
    const matchesSearch =
      imaging.worker_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      imaging.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      imaging.worker_id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatusFilter = filterStatus === 'all' || imaging.status === filterStatus;

    const matchesPneumoFilter =
      filterPneumoconiosis === 'all' ||
      (filterPneumoconiosis === 'yes' && imaging.pneumoconiosis_detected) ||
      (filterPneumoconiosis === 'no' && !imaging.pneumoconiosis_detected);

    return matchesSearch && matchesStatusFilter && matchesPneumoFilter;
  });

  // Sort
  const sortedResults = [...filteredAndSearchedResults].sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.imaging_date).getTime() - new Date(a.imaging_date).getTime();
    } else if (sortBy === 'name') {
      return a.worker_name.localeCompare(b.worker_name);
    } else if (sortBy === 'status') {
      const statusOrder = { critical: 0, warning: 1, normal: 2 };
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return 0;
  });

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return COLORS.success;
      case 'warning':
        return COLORS.warning;
      case 'critical':
        return COLORS.danger;
      default:
        return COLORS.text;
    }
  };

  // Render card
  const renderCard = (imaging: XrayImagingResult) => (
    <View key={imaging.id} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <MaterialCommunityIcons name="medical-bag" size={20} color={COLORS.primary} />
          <View style={styles.cardInfo}>
            <Text style={styles.workerName}>{imaging.worker_name}</Text>
            <Text style={styles.imagingDate}>
              {new Date(imaging.imaging_date).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(imaging.status) },
          ]}
        >
          <Text style={styles.statusText}>{imaging.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.imagingValues}>
        <Text style={styles.imagingLabel}>
          ILO: <Text style={styles.imagingValue}>{imaging.ilo_classification}</Text>
        </Text>
        <Text style={styles.imagingLabel}>
          Profusion: <Text style={styles.imagingValue}>{imaging.profusion}</Text>
        </Text>
      </View>

      {imaging.pneumoconiosis_detected && (
        <View style={styles.pneumobadge}>
          <MaterialCommunityIcons name="alert-circle" size={14} color={COLORS.danger} />
          <Text style={styles.pneumoText}>Pneumoconiosis Detected</Text>
        </View>
      )}

      <View style={styles.imagingTypeBadge}>
        <Text style={styles.imagingTypeText}>{imaging.imaging_type}</Text>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditImaging(imaging)}
        >
          <MaterialCommunityIcons name="pencil" size={16} color={COLORS.secondary} />
          <Text style={[styles.actionText, { color: COLORS.secondary }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteImaging(imaging)}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={16} color={COLORS.danger} />
          <Text style={[styles.actionText, { color: COLORS.danger }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Xray Imaging Results</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddImaging}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Result</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color={COLORS.border} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.border}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialCommunityIcons name="close" size={20} color={COLORS.border} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter and Sort Controls */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.controlsContainer}
        contentContainerStyle={styles.controlsContent}
      >
        {/* Status Filter */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Status:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(['all', 'normal', 'warning', 'critical'] as const).map((status) => (
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
                    styles.filterButtonText,
                    filterStatus === status && styles.filterButtonTextActive,
                  ]}
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Pneumoconiosis Filter */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Pneumo:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(['all', 'yes', 'no'] as const).map((pneumo) => (
              <TouchableOpacity
                key={pneumo}
                style={[
                  styles.filterButton,
                  filterPneumoconiosis === pneumo && styles.filterButtonActive,
                ]}
                onPress={() => setFilterPneumoconiosis(pneumo)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filterPneumoconiosis === pneumo && styles.filterButtonTextActive,
                  ]}
                >
                  {pneumo === 'all' ? 'All' : pneumo === 'yes' ? 'Yes' : 'No'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Sort Dropdown */}
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Sort:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(['recent', 'name', 'status'] as const).map((sort) => (
              <TouchableOpacity
                key={sort}
                style={[
                  styles.filterButton,
                  sortBy === sort && styles.filterButtonActive,
                ]}
                onPress={() => setSortBy(sort)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    sortBy === sort && styles.filterButtonTextActive,
                  ]}
                >
                  {sort.charAt(0).toUpperCase() + sort.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Results Count */}
      <Text style={styles.resultsCount}>
        {sortedResults.length} result{sortedResults.length !== 1 ? 's' : ''}
      </Text>

      {/* List */}
      {loading && !refreshing ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : sortedResults.length === 0 ? (
        <View style={styles.centerContent}>
          <MaterialCommunityIcons name="magnify" size={48} color={COLORS.border} />
          <Text style={styles.emptyText}>No xray imaging results found</Text>
        </View>
      ) : (
        <FlatList
          data={sortedResults}
          renderItem={({ item }) => renderCard(item)}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          scrollEnabled={false}
          onEndReachedThreshold={0.1}
        />
      )}

      {/* Add Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Xray Imaging Result</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentPadding}>
            {/* Worker Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Worker *</Text>
              <WorkerSelectDropdown
                selectedValue={editFormData.worker_id}
                onSelect={(workerId) =>
                  setEditFormData({ ...editFormData, worker_id: workerId })
                }
                containerStyle={styles.dropdown}
              />
              {errors.worker_id && <Text style={styles.errorText}>{errors.worker_id}</Text>}
            </View>

            {/* Imaging Date */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Imaging Date *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={editFormData.imaging_date}
                onChangeText={(value) =>
                  setEditFormData({ ...editFormData, imaging_date: value })
                }
              />
              {errors.imaging_date && <Text style={styles.errorText}>{errors.imaging_date}</Text>}
            </View>

            {/* Imaging Type */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Imaging Type *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Chest X-ray, Lateral View"
                value={editFormData.imaging_type}
                onChangeText={(value) =>
                  setEditFormData({ ...editFormData, imaging_type: value })
                }
              />
              {errors.imaging_type && <Text style={styles.errorText}>{errors.imaging_type}</Text>}
            </View>

            {/* ILO Classification */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>ILO Classification *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 0/0, 1/0, 2/1"
                value={editFormData.ilo_classification}
                onChangeText={(value) =>
                  setEditFormData({ ...editFormData, ilo_classification: value })
                }
              />
              {errors.ilo_classification && (
                <Text style={styles.errorText}>{errors.ilo_classification}</Text>
              )}
            </View>

            {/* Profusion */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Profusion *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 1/0, 1/1, 2/2"
                value={editFormData.profusion}
                onChangeText={(value) =>
                  setEditFormData({ ...editFormData, profusion: value })
                }
              />
              {errors.profusion && <Text style={styles.errorText}>{errors.profusion}</Text>}
            </View>

            {/* Pneumoconiosis Detected */}
            <View style={styles.switchGroup}>
              <Text style={styles.formLabel}>Pneumoconiosis Detected</Text>
              <Switch
                value={editFormData.pneumoconiosis_detected}
                onValueChange={(value) =>
                  setEditFormData({ ...editFormData, pneumoconiosis_detected: value })
                }
                trackColor={{ false: COLORS.border, true: COLORS.danger }}
                thumbColor={editFormData.pneumoconiosis_detected ? COLORS.danger : COLORS.light}
              />
            </View>

            {/* Severity */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Severity</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Mild, Moderate, Severe"
                value={editFormData.severity}
                onChangeText={(value) =>
                  setEditFormData({ ...editFormData, severity: value })
                }
              />
            </View>

            {/* Radiologist Notes */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Radiologist Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Professional radiologist observations..."
                value={editFormData.radiologist_notes}
                onChangeText={(value) =>
                  setEditFormData({ ...editFormData, radiologist_notes: value })
                }
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Notes */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Additional notes..."
                value={editFormData.notes}
                onChangeText={(value) =>
                  setEditFormData({ ...editFormData, notes: value })
                }
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => setShowAddModal(false)}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleSaveAdd}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Add Imaging Result</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Xray Imaging Result</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentPadding}>
            {/* Worker Selection - Read Only */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Worker</Text>
              <View style={[styles.input, styles.readOnlyInput]}>
                <Text style={styles.readOnlyText}>
                  {selectedImaging?.worker_name || 'N/A'}
                </Text>
              </View>
            </View>

            {/* Imaging Date */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Imaging Date *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={editFormData.imaging_date}
                onChangeText={(value) =>
                  setEditFormData({ ...editFormData, imaging_date: value })
                }
              />
              {errors.imaging_date && <Text style={styles.errorText}>{errors.imaging_date}</Text>}
            </View>

            {/* Imaging Type */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Imaging Type *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Chest X-ray, Lateral View"
                value={editFormData.imaging_type}
                onChangeText={(value) =>
                  setEditFormData({ ...editFormData, imaging_type: value })
                }
              />
              {errors.imaging_type && <Text style={styles.errorText}>{errors.imaging_type}</Text>}
            </View>

            {/* ILO Classification */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>ILO Classification *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 0/0, 1/0, 2/1"
                value={editFormData.ilo_classification}
                onChangeText={(value) =>
                  setEditFormData({ ...editFormData, ilo_classification: value })
                }
              />
              {errors.ilo_classification && (
                <Text style={styles.errorText}>{errors.ilo_classification}</Text>
              )}
            </View>

            {/* Profusion */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Profusion *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 1/0, 1/1, 2/2"
                value={editFormData.profusion}
                onChangeText={(value) =>
                  setEditFormData({ ...editFormData, profusion: value })
                }
              />
              {errors.profusion && <Text style={styles.errorText}>{errors.profusion}</Text>}
            </View>

            {/* Pneumoconiosis Detected */}
            <View style={styles.switchGroup}>
              <Text style={styles.formLabel}>Pneumoconiosis Detected</Text>
              <Switch
                value={editFormData.pneumoconiosis_detected}
                onValueChange={(value) =>
                  setEditFormData({ ...editFormData, pneumoconiosis_detected: value })
                }
                trackColor={{ false: COLORS.border, true: COLORS.danger }}
                thumbColor={editFormData.pneumoconiosis_detected ? COLORS.danger : COLORS.light}
              />
            </View>

            {/* Severity */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Severity</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Mild, Moderate, Severe"
                value={editFormData.severity}
                onChangeText={(value) =>
                  setEditFormData({ ...editFormData, severity: value })
                }
              />
            </View>

            {/* Radiologist Notes */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Radiologist Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Professional radiologist observations..."
                value={editFormData.radiologist_notes}
                onChangeText={(value) =>
                  setEditFormData({ ...editFormData, radiologist_notes: value })
                }
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Notes */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Additional notes..."
                value={editFormData.notes}
                onChangeText={(value) =>
                  setEditFormData({ ...editFormData, notes: value })
                }
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => setShowEditModal(false)}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleSaveEdit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Update Imaging Result</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.light,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
    color: COLORS.text,
  },
  controlsContainer: {
    maxHeight: 50,
  },
  controlsContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.light,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text,
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  resultsCount: {
    fontSize: 12,
    color: COLORS.border,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.border,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  imagingDate: {
    fontSize: 12,
    color: COLORS.border,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.light,
    marginVertical: 8,
  },
  imagingValues: {
    gap: 4,
    marginBottom: 8,
  },
  imagingLabel: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  imagingValue: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  pneumobadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FEE2E2',
    borderRadius: 4,
    marginBottom: 8,
  },
  pneumoText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '500',
  },
  imagingTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: COLORS.accent,
    borderRadius: 4,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  imagingTypeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  editButton: {
    backgroundColor: '#EFF6FF',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.light,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  modalContent: {
    flex: 1,
  },
  modalContentPadding: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: '#fff',
  },
  textArea: {
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  readOnlyInput: {
    backgroundColor: COLORS.light,
    justifyContent: 'center',
  },
  readOnlyText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: 6,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.light,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.secondary,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
});

export default XrayImagingListScreen;
