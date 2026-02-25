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

interface VisionTestResult {
  id: string;
  worker_id: string;
  worker_name: string;
  employee_id: string;
  test_date: string;
  right_eye_uncorrected: number;
  right_eye_corrected: number;
  left_eye_uncorrected: number;
  left_eye_corrected: number;
  near_vision_test: number;
  requires_correction: boolean;
  recommendations: string;
  notes: string;
  status: 'normal' | 'warning' | 'critical';
  created_at: string;
  updated_at: string;
}

interface FormData {
  worker_id: string;
  test_date: string;
  right_eye_uncorrected: string;
  right_eye_corrected: string;
  left_eye_uncorrected: string;
  left_eye_corrected: string;
  near_vision_test: string;
  requires_correction: boolean;
  recommendations: string;
  notes: string;
}

const VisionTestListScreen = () => {
  // State management
  const [visionTests, setVisionTests] = useState<VisionTestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'normal' | 'warning' | 'critical'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'status'>('recent');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState<VisionTestResult | null>(null);
  const [editFormData, setEditFormData] = useState<FormData>({
    worker_id: '',
    test_date: '',
    right_eye_uncorrected: '',
    right_eye_corrected: '',
    left_eye_uncorrected: '',
    left_eye_corrected: '',
    near_vision_test: '',
    requires_correction: false,
    recommendations: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});

  // Fetch vision tests
  const fetchVisionTests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/occupational-health/vision-test-results/`,
        {
          params: { ordering: '-test_date', limit: 5 },
        }
      );
      setVisionTests(response.data.results || response.data);
      setErrors({});
    } catch (error) {
      console.error('Error fetching vision tests:', error);
      Alert.alert('Error', 'Failed to load vision test results');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVisionTests();
  }, [fetchVisionTests]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchVisionTests();
    setRefreshing(false);
  }, [fetchVisionTests]);

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!editFormData.worker_id.trim()) {
      newErrors.worker_id = 'Worker is required';
    }
    if (!editFormData.test_date.trim()) {
      newErrors.test_date = 'Test date is required';
    }
    if (!editFormData.right_eye_uncorrected.trim()) {
      newErrors.right_eye_uncorrected = 'Right eye uncorrected is required';
    }
    if (!editFormData.right_eye_corrected.trim()) {
      newErrors.right_eye_corrected = 'Right eye corrected is required';
    }
    if (!editFormData.left_eye_uncorrected.trim()) {
      newErrors.left_eye_uncorrected = 'Left eye uncorrected is required';
    }
    if (!editFormData.left_eye_corrected.trim()) {
      newErrors.left_eye_corrected = 'Left eye corrected is required';
    }
    if (!editFormData.near_vision_test.trim()) {
      newErrors.near_vision_test = 'Near vision test is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Add new test
  const handleAddTest = useCallback(() => {
    setEditFormData({
      worker_id: '',
      test_date: new Date().toISOString().split('T')[0],
      right_eye_uncorrected: '',
      right_eye_corrected: '',
      left_eye_uncorrected: '',
      left_eye_corrected: '',
      near_vision_test: '',
      requires_correction: false,
      recommendations: '',
      notes: '',
    });
    setErrors({});
    setSelectedTest(null);
    setShowAddModal(true);
  }, []);

  // Open edit modal
  const handleEditTest = useCallback((test: VisionTestResult) => {
    setSelectedTest(test);
    setEditFormData({
      worker_id: test.worker_id,
      test_date: test.test_date,
      right_eye_uncorrected: test.right_eye_uncorrected.toString(),
      right_eye_corrected: test.right_eye_corrected.toString(),
      left_eye_uncorrected: test.left_eye_uncorrected.toString(),
      left_eye_corrected: test.left_eye_corrected.toString(),
      near_vision_test: test.near_vision_test.toString(),
      requires_correction: test.requires_correction,
      recommendations: test.recommendations,
      notes: test.notes,
    });
    setErrors({});
    setShowEditModal(true);
  }, []);

  // Save new test
  const handleSaveAdd = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const postData = {
        worker_id: editFormData.worker_id,
        test_date: editFormData.test_date,
        right_eye_uncorrected: parseFloat(editFormData.right_eye_uncorrected) || 0,
        right_eye_corrected: parseFloat(editFormData.right_eye_corrected) || 0,
        left_eye_uncorrected: parseFloat(editFormData.left_eye_uncorrected) || 0,
        left_eye_corrected: parseFloat(editFormData.left_eye_corrected) || 0,
        near_vision_test: parseFloat(editFormData.near_vision_test) || 0,
        requires_correction: editFormData.requires_correction,
        recommendations: editFormData.recommendations,
        notes: editFormData.notes,
      };

      await axios.post(
        `${API_BASE_URL}/occupational-health/vision-test-results/`,
        postData
      );

      Alert.alert('Success', 'Vision test result added successfully');
      setShowAddModal(false);
      await fetchVisionTests();
    } catch (error: any) {
      console.error('Error adding vision test:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to add vision test result';
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Save edited test
  const handleSaveEdit = async () => {
    if (!validateForm() || !selectedTest) return;

    try {
      setLoading(true);
      const patchData = {
        test_date: editFormData.test_date,
        right_eye_uncorrected: parseFloat(editFormData.right_eye_uncorrected) || 0,
        right_eye_corrected: parseFloat(editFormData.right_eye_corrected) || 0,
        left_eye_uncorrected: parseFloat(editFormData.left_eye_uncorrected) || 0,
        left_eye_corrected: parseFloat(editFormData.left_eye_corrected) || 0,
        near_vision_test: parseFloat(editFormData.near_vision_test) || 0,
        requires_correction: editFormData.requires_correction,
        recommendations: editFormData.recommendations,
        notes: editFormData.notes,
      };

      await axios.patch(
        `${API_BASE_URL}/occupational-health/vision-test-results/${selectedTest.id}/`,
        patchData
      );

      Alert.alert('Success', 'Vision test result updated successfully');
      setShowEditModal(false);
      await fetchVisionTests();
    } catch (error: any) {
      console.error('Error updating vision test:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to update vision test result';
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Delete test
  const handleDeleteTest = useCallback((test: VisionTestResult) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete the vision test result for ${test.worker_name}?`,
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              setLoading(true);
              await axios.delete(
                `${API_BASE_URL}/occupational-health/vision-test-results/${test.id}/`
              );
              Alert.alert('Success', 'Vision test result deleted successfully');
              await fetchVisionTests();
            } catch (error: any) {
              console.error('Error deleting vision test:', error);
              const errorMsg = error.response?.data?.detail || 'Failed to delete vision test result';
              Alert.alert('Error', errorMsg);
            } finally {
              setLoading(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  }, [fetchVisionTests]);

  // Filter and search
  const filteredAndSearchedTests = visionTests.filter((test) => {
    const matchesSearch =
      test.worker_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.worker_id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = filterStatus === 'all' || test.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  // Sort
  const sortedTests = [...filteredAndSearchedTests].sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.test_date).getTime() - new Date(a.test_date).getTime();
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
  const renderCard = (test: VisionTestResult) => (
    <View key={test.id} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <MaterialCommunityIcons name="eye-outline" size={20} color={COLORS.primary} />
          <View style={styles.cardInfo}>
            <Text style={styles.workerName}>{test.worker_name}</Text>
            <Text style={styles.testDate}>
              {new Date(test.test_date).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(test.status) },
          ]}
        >
          <Text style={styles.statusText}>{test.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.visionValues}>
        <Text style={styles.visionLabel}>
          OD Corr: <Text style={styles.visionValue}>{test.right_eye_corrected}</Text>
        </Text>
        <Text style={styles.visionLabel}>
          OS Corr: <Text style={styles.visionValue}>{test.left_eye_corrected}</Text>
        </Text>
      </View>

      {test.requires_correction && (
        <View style={styles.correctionBadge}>
          <MaterialCommunityIcons name="alert-circle" size={14} color={COLORS.warning} />
          <Text style={styles.correctionText}>Requires Correction</Text>
        </View>
      )}

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditTest(test)}
        >
          <MaterialCommunityIcons name="pencil" size={16} color={COLORS.secondary} />
          <Text style={[styles.actionText, { color: COLORS.secondary }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteTest(test)}
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
        <Text style={styles.headerTitle}>Vision Test Results</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddTest}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Test</Text>
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
        {/* Filter Dropdown */}
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
        {sortedTests.length} result{sortedTests.length !== 1 ? 's' : ''}
      </Text>

      {/* List */}
      {loading && !refreshing ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : sortedTests.length === 0 ? (
        <View style={styles.centerContent}>
          <MaterialCommunityIcons name="magnify" size={48} color={COLORS.border} />
          <Text style={styles.emptyText}>No vision test results found</Text>
        </View>
      ) : (
        <FlatList
          data={sortedTests}
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
            <Text style={styles.modalTitle}>Add Vision Test Result</Text>
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

            {/* Test Date */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Test Date *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={editFormData.test_date}
                onChangeText={(value) =>
                  setEditFormData({ ...editFormData, test_date: value })
                }
              />
              {errors.test_date && <Text style={styles.errorText}>{errors.test_date}</Text>}
            </View>

            {/* Right Eye Uncorrected */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Right Eye (Uncorrected) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.0"
                keyboardType="decimal-pad"
                value={editFormData.right_eye_uncorrected}
                onChangeText={(value) =>
                  setEditFormData({ ...editFormData, right_eye_uncorrected: value })
                }
              />
              {errors.right_eye_uncorrected && (
                <Text style={styles.errorText}>{errors.right_eye_uncorrected}</Text>
              )}
            </View>

            {/* Right Eye Corrected */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Right Eye (Corrected) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.0"
                keyboardType="decimal-pad"
                value={editFormData.right_eye_corrected}
                onChangeText={(value) =>
                  setEditFormData({ ...editFormData, right_eye_corrected: value })
                }
              />
              {errors.right_eye_corrected && (
                <Text style={styles.errorText}>{errors.right_eye_corrected}</Text>
              )}
            </View>

            {/* Left Eye Uncorrected */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Left Eye (Uncorrected) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.0"
                keyboardType="decimal-pad"
                value={editFormData.left_eye_uncorrected}
                onChangeText={(value) =>
                  setEditFormData({ ...editFormData, left_eye_uncorrected: value })
                }
              />
              {errors.left_eye_uncorrected && (
                <Text style={styles.errorText}>{errors.left_eye_uncorrected}</Text>
              )}
            </View>

            {/* Left Eye Corrected */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Left Eye (Corrected) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.0"
                keyboardType="decimal-pad"
                value={editFormData.left_eye_corrected}
                onChangeText={(value) =>
                  setEditFormData({ ...editFormData, left_eye_corrected: value })
                }
              />
              {errors.left_eye_corrected && (
                <Text style={styles.errorText}>{errors.left_eye_corrected}</Text>
              )}
            </View>

            {/* Near Vision Test */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Near Vision Test *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.0"
                keyboardType="decimal-pad"
                value={editFormData.near_vision_test}
                onChangeText={(value) =>
                  setEditFormData({ ...editFormData, near_vision_test: value })
                }
              />
              {errors.near_vision_test && (
                <Text style={styles.errorText}>{errors.near_vision_test}</Text>
              )}
            </View>

            {/* Requires Correction*/}
            <View style={styles.switchGroup}>
              <Text style={styles.formLabel}>Requires Correction</Text>
              <Switch
                value={editFormData.requires_correction}
                onValueChange={(value) =>
                  setEditFormData({ ...editFormData, requires_correction: value })
                }
                trackColor={{ false: COLORS.border, true: COLORS.accent }}
                thumbColor={editFormData.requires_correction ? COLORS.secondary : COLORS.light}
              />
            </View>

            {/* Recommendations */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Recommendations</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Additional recommendations..."
                value={editFormData.recommendations}
                onChangeText={(value) =>
                  setEditFormData({ ...editFormData, recommendations: value })
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
                  <Text style={styles.saveButtonText}>Add Test Result</Text>
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
            <Text style={styles.modalTitle}>Edit Vision Test Result</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalContentPadding}>
            {/* Worker Selection - Read Only */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Worker</Text>
              <View style={[styles.input, styles.readOnlyInput]}>
                <Text style={styles.readOnlyText}>
                  {selectedTest?.worker_name || 'N/A'}
                </Text>
              </View>
            </View>

            {/* Test Date */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Test Date *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={editFormData.test_date}
                onChangeText={(value) =>
                  setEditFormData({ ...editFormData, test_date: value })
                }
              />
              {errors.test_date && <Text style={styles.errorText}>{errors.test_date}</Text>}
            </View>

            {/* Right Eye Uncorrected */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Right Eye (Uncorrected) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.0"
                keyboardType="decimal-pad"
                value={editFormData.right_eye_uncorrected}
                onChangeText={(value) =>
                  setEditFormData({ ...editFormData, right_eye_uncorrected: value })
                }
              />
              {errors.right_eye_uncorrected && (
                <Text style={styles.errorText}>{errors.right_eye_uncorrected}</Text>
              )}
            </View>

            {/* Right Eye Corrected */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Right Eye (Corrected) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.0"
                keyboardType="decimal-pad"
                value={editFormData.right_eye_corrected}
                onChangeText={(value) =>
                  setEditFormData({ ...editFormData, right_eye_corrected: value })
                }
              />
              {errors.right_eye_corrected && (
                <Text style={styles.errorText}>{errors.right_eye_corrected}</Text>
              )}
            </View>

            {/* Left Eye Uncorrected */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Left Eye (Uncorrected) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.0"
                keyboardType="decimal-pad"
                value={editFormData.left_eye_uncorrected}
                onChangeText={(value) =>
                  setEditFormData({ ...editFormData, left_eye_uncorrected: value })
                }
              />
              {errors.left_eye_uncorrected && (
                <Text style={styles.errorText}>{errors.left_eye_uncorrected}</Text>
              )}
            </View>

            {/* Left Eye Corrected */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Left Eye (Corrected) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.0"
                keyboardType="decimal-pad"
                value={editFormData.left_eye_corrected}
                onChangeText={(value) =>
                  setEditFormData({ ...editFormData, left_eye_corrected: value })
                }
              />
              {errors.left_eye_corrected && (
                <Text style={styles.errorText}>{errors.left_eye_corrected}</Text>
              )}
            </View>

            {/* Near Vision Test */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Near Vision Test *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.0"
                keyboardType="decimal-pad"
                value={editFormData.near_vision_test}
                onChangeText={(value) =>
                  setEditFormData({ ...editFormData, near_vision_test: value })
                }
              />
              {errors.near_vision_test && (
                <Text style={styles.errorText}>{errors.near_vision_test}</Text>
              )}
            </View>

            {/* Requires Correction*/}
            <View style={styles.switchGroup}>
              <Text style={styles.formLabel}>Requires Correction</Text>
              <Switch
                value={editFormData.requires_correction}
                onValueChange={(value) =>
                  setEditFormData({ ...editFormData, requires_correction: value })
                }
                trackColor={{ false: COLORS.border, true: COLORS.accent }}
                thumbColor={editFormData.requires_correction ? COLORS.secondary : COLORS.light}
              />
            </View>

            {/* Recommendations */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Recommendations</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Additional recommendations..."
                value={editFormData.recommendations}
                onChangeText={(value) =>
                  setEditFormData({ ...editFormData, recommendations: value })
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
                  <Text style={styles.saveButtonText}>Update Test Result</Text>
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
  testDate: {
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
  visionValues: {
    gap: 4,
    marginBottom: 8,
  },
  visionLabel: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  visionValue: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  correctionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FEF3C7',
    borderRadius: 4,
    marginBottom: 8,
  },
  correctionText: {
    fontSize: 12,
    color: COLORS.warning,
    fontWeight: '500',
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

export default VisionTestListScreen;
