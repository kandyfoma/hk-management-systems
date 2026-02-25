import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Switch,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ApiService from '../../../services/ApiService';

interface VisionTestResult {
  id: number;
  worker_id: number;
  worker_name: string;
  test_date: string;
  right_eye_uncorrected: number;
  right_eye_corrected: number;
  left_eye_uncorrected: number;
  left_eye_corrected: number;
  near_vision_test: number;
  requires_correction: boolean;
  status: string;
  recommendations?: string;
  notes?: string;
}

interface WorkerOption {
  id: number;
  label: string;
  user_id: number;
  employee_id: string;
  full_name: string;
}

interface FormData {
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

const colors = {
  primary: '#122056',
  secondary: '#5B65DC',
  accent: '#818CF8',
  background: '#F5F7FA',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  text: '#1F2937',
  textLight: '#6B7280',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

const VisionTestListScreen: React.FC = () => {
  const [results, setResults] = useState<VisionTestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<VisionTestResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<WorkerOption | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);

  const [formData, setFormData] = useState<FormData>({
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

  const [editFormData, setEditFormData] = useState<FormData>({
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

  useEffect(() => {
    loadResults();
    loadWorkers();
  }, []);

  const loadResults = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ApiService.get('/occupational-health/vision-test-results/');
      const sorted = response.data.sort(
        (a: VisionTestResult, b: VisionTestResult) =>
          new Date(b.test_date).getTime() - new Date(a.test_date).getTime()
      );
      setResults(sorted.slice(0, 5));
    } catch (error) {
      Alert.alert('Error', 'Failed to load vision test results');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWorkers = useCallback(async () => {
    try {
      const response = await ApiService.get('/workers/');
      setWorkers(response.data);
    } catch (error) {
      console.error('Failed to load workers:', error);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadResults();
    setRefreshing(false);
  }, [loadResults]);

  const handleSubmit = async () => {
    if (!selectedWorker) {
      Alert.alert('Validation', 'Please select a worker');
      return;
    }

    if (!formData.test_date || !formData.right_eye_corrected || !formData.left_eye_corrected) {
      Alert.alert('Validation', 'Please fill in required fields');
      return;
    }

    try {
      setUpdating(true);
      const payload = {
        worker_id: selectedWorker.id,
        test_date: formData.test_date,
        right_eye_uncorrected: parseFloat(formData.right_eye_uncorrected) || 0,
        right_eye_corrected: parseFloat(formData.right_eye_corrected) || 0,
        left_eye_uncorrected: parseFloat(formData.left_eye_uncorrected) || 0,
        left_eye_corrected: parseFloat(formData.left_eye_corrected) || 0,
        near_vision_test: parseFloat(formData.near_vision_test) || 0,
        requires_correction: formData.requires_correction,
        recommendations: formData.recommendations,
        notes: formData.notes,
      };

      await ApiService.post('/occupational-health/vision-test-results/', payload);
      Alert.alert('Success', 'Vision test result added');
      setShowAddModal(false);
      setFormData({
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
      setSelectedWorker(null);
      await loadResults();
    } catch (error) {
      Alert.alert('Error', 'Failed to save vision test result');
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenEdit = (item: VisionTestResult) => {
    setSelectedItem(item);
    setEditFormData({
      test_date: item.test_date,
      right_eye_uncorrected: item.right_eye_uncorrected.toString(),
      right_eye_corrected: item.right_eye_corrected.toString(),
      left_eye_uncorrected: item.left_eye_uncorrected.toString(),
      left_eye_corrected: item.left_eye_corrected.toString(),
      near_vision_test: item.near_vision_test.toString(),
      requires_correction: item.requires_correction,
      recommendations: item.recommendations || '',
      notes: item.notes || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;

    try {
      setUpdating(true);
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

      await ApiService.patch(
        `/occupational-health/vision-test-results/${selectedItem.id}/`,
        patchData
      );

      setResults(
        results.map(r =>
          r.id === selectedItem.id ? { ...r, ...patchData } : r
        )
      );
      setShowEditModal(false);
      Alert.alert('Success', 'Vision test result updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to update vision test result');
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = (item: VisionTestResult) => {
    Alert.alert('Delete', 'Are you sure you want to delete this vision test result?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            setDeleting(true);
            await ApiService.delete(`/occupational-health/vision-test-results/${item.id}/`);
            setResults(results.filter(r => r.id !== item.id));
            Alert.alert('Success', 'Vision test result deleted');
          } catch (error) {
            Alert.alert('Error', 'Failed to delete vision test result');
            console.error(error);
          } finally {
            setDeleting(false);
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'critical':
        return colors.danger;
      default:
        return colors.textLight;
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const filteredAndSorted = useMemo(() => {
    let filtered = results;

    if (searchQuery) {
      filtered = filtered.filter(
        item =>
          item.worker_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.worker_name.includes(searchQuery)
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => item.status === filterStatus);
    }

    let sorted = [...filtered];
    if (sortBy === 'recent') {
      sorted.sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime());
    } else if (sortBy === 'name') {
      sorted.sort((a, b) => a.worker_name.localeCompare(b.worker_name));
    }

    return sorted;
  }, [results, searchQuery, filterStatus, sortBy]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.primary }}>
          Vision Tests
        </Text>
        <TouchableOpacity
          onPress={() => setShowAddModal(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.secondary,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 6,
          }}
        >
          <MaterialCommunityIcons name="plus" size={18} color="white" />
          <Text style={{ color: 'white', marginLeft: 4, fontWeight: '600' }}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
      >
        <View
          style={{
            flexDirection: 'row',
            marginBottom: 12,
            gap: 8,
            alignItems: 'center',
          }}
        >
          <MaterialCommunityIcons name="magnify" size={20} color={colors.textLight} />
          <TextInput
            placeholder="Search by worker name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 6,
              paddingHorizontal: 12,
              paddingVertical: 8,
              color: colors.text,
            }}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => setFilterStatus(filterStatus === 'all' ? 'normal' : 'all')}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: filterStatus === 'all' ? colors.secondary : colors.border,
              borderRadius: 20,
              backgroundColor: filterStatus === 'all' ? colors.secondary : colors.surface,
            }}
          >
            <Text
              style={{
                color: filterStatus === 'all' ? 'white' : colors.text,
                fontSize: 12,
                fontWeight: '600',
              }}
            >
              All
            </Text>
          </TouchableOpacity>
          {['normal', 'warning', 'critical'].map(status => (
            <TouchableOpacity
              key={status}
              onPress={() => setFilterStatus(status)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderWidth: 1,
                borderColor: filterStatus === status ? getStatusColor(status) : colors.border,
                borderRadius: 20,
                backgroundColor:
                  filterStatus === status ? getStatusColor(status) : colors.surface,
              }}
            >
              <Text
                style={{
                  color: filterStatus === status ? 'white' : colors.text,
                  fontSize: 12,
                  fontWeight: '600',
                  textTransform: 'capitalize',
                }}
              >
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {['recent', 'name'].map(sort => (
            <TouchableOpacity
              key={sort}
              onPress={() => setSortBy(sort)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 6,
                backgroundColor:
                  sortBy === sort ? colors.secondary : colors.surface,
                borderWidth: 1,
                borderColor: sortBy === sort ? colors.secondary : colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: sortBy === sort ? 'white' : colors.text,
                  textTransform: 'capitalize',
                }}
              >
                {sort}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.secondary} style={{ marginTop: 20 }} />
        ) : filteredAndSorted.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <MaterialCommunityIcons name="eye-off-outline" size={48} color={colors.textLight} />
            <Text style={{ color: colors.textLight, marginTop: 8 }}>No vision tests found</Text>
          </View>
        ) : (
          filteredAndSorted.map(item => (
            <View
              key={item.id}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 8,
                padding: 12,
                marginBottom: 12,
                borderLeftWidth: 4,
                borderLeftColor: getStatusColor(item.status),
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 8,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                    {item.worker_name}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }}>
                    {new Date(item.test_date).toLocaleDateString()}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: getStatusColor(item.status),
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ fontSize: 11, color: 'white', fontWeight: '600' }}>
                    {getStatusLabel(item.status)}
                  </Text>
                </View>
              </View>

              <Text style={{ fontSize: 13, color: colors.text, marginBottom: 8, fontWeight: '500' }}>
                OD Corr: {item.right_eye_corrected} | OG Corr: {item.left_eye_corrected}
              </Text>

              {item.requires_correction && (
                <View
                  style={{
                    backgroundColor: colors.warning + '20',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 4,
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ fontSize: 11, color: colors.warning, fontWeight: '600' }}>
                    ⚠ Correction Required
                  </Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => handleOpenEdit(item)}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.secondary,
                    paddingVertical: 8,
                    borderRadius: 6,
                  }}
                >
                  <MaterialCommunityIcons name="pencil" size={16} color="white" />
                  <Text style={{ color: 'white', marginLeft: 4, fontWeight: '600' }}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  disabled={deleting}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.danger,
                    paddingVertical: 8,
                    borderRadius: 6,
                    opacity: deleting ? 0.5 : 1,
                  }}
                >
                  <MaterialCommunityIcons name="trash-can" size={16} color="white" />
                  <Text style={{ color: 'white', marginLeft: 4, fontWeight: '600' }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              marginTop: 50,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>
                Add Vision Test
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                  Worker
                </Text>
                <TouchableOpacity
                  onPress={() => setShowWorkerDropdown(!showWorkerDropdown)}
                  style={{
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: selectedWorker ? colors.text : colors.textLight }}>
                    {selectedWorker ? selectedWorker.label : 'Select a worker'}
                  </Text>
                  <MaterialCommunityIcons
                    name={showWorkerDropdown ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textLight}
                  />
                </TouchableOpacity>
                {showWorkerDropdown && (
                  <ScrollView
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: 6,
                      marginTop: 8,
                      maxHeight: 200,
                    }}
                  >
                    {workers.map(worker => (
                      <TouchableOpacity
                        key={worker.id}
                        onPress={() => {
                          setSelectedWorker(worker);
                          setShowWorkerDropdown(false);
                        }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          borderBottomWidth: 1,
                          borderBottomColor: colors.border,
                        }}
                      >
                        <Text style={{ color: colors.text }}>{worker.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                Test Date
              </Text>
              <TextInput
                placeholder="YYYY-MM-DD"
                value={formData.test_date}
                onChangeText={text => setFormData({ ...formData, test_date: text })}
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: colors.text,
                  marginBottom: 16,
                }}
              />

              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                Right Eye Uncorrected
              </Text>
              <TextInput
                placeholder="Enter value"
                value={formData.right_eye_uncorrected}
                onChangeText={text => setFormData({ ...formData, right_eye_uncorrected: text })}
                keyboardType="decimal-pad"
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: colors.text,
                  marginBottom: 16,
                }}
              />

              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                Right Eye Corrected *
              </Text>
              <TextInput
                placeholder="Enter value"
                value={formData.right_eye_corrected}
                onChangeText={text => setFormData({ ...formData, right_eye_corrected: text })}
                keyboardType="decimal-pad"
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: colors.text,
                  marginBottom: 16,
                }}
              />

              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                Left Eye Uncorrected
              </Text>
              <TextInput
                placeholder="Enter value"
                value={formData.left_eye_uncorrected}
                onChangeText={text => setFormData({ ...formData, left_eye_uncorrected: text })}
                keyboardType="decimal-pad"
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: colors.text,
                  marginBottom: 16,
                }}
              />

              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                Left Eye Corrected *
              </Text>
              <TextInput
                placeholder="Enter value"
                value={formData.left_eye_corrected}
                onChangeText={text => setFormData({ ...formData, left_eye_corrected: text })}
                keyboardType="decimal-pad"
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: colors.text,
                  marginBottom: 16,
                }}
              />

              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                Near Vision Test
              </Text>
              <TextInput
                placeholder="Enter value"
                value={formData.near_vision_test}
                onChangeText={text => setFormData({ ...formData, near_vision_test: text })}
                keyboardType="decimal-pad"
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: colors.text,
                  marginBottom: 16,
                }}
              />

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, flex: 1 }}>
                  Requires Correction
                </Text>
                <Switch
                  value={formData.requires_correction}
                  onValueChange={value => setFormData({ ...formData, requires_correction: value })}
                  trackColor={{ false: colors.border, true: colors.secondary }}
                  thumbColor={formData.requires_correction ? colors.secondary : colors.text}
                />
              </View>

              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                Recommendations
              </Text>
              <TextInput
                placeholder="Enter recommendations"
                value={formData.recommendations}
                onChangeText={text => setFormData({ ...formData, recommendations: text })}
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: colors.text,
                  marginBottom: 16,
                  textAlignVertical: 'top',
                }}
              />

              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                Notes
              </Text>
              <TextInput
                placeholder="Enter notes"
                value={formData.notes}
                onChangeText={text => setFormData({ ...formData, notes: text })}
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: colors.text,
                  marginBottom: 24,
                  textAlignVertical: 'top',
                }}
              />

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setShowAddModal(false)}
                  style={{
                    flex: 1,
                    backgroundColor: colors.border,
                    paddingVertical: 12,
                    borderRadius: 6,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={updating}
                  style={{
                    flex: 1,
                    backgroundColor: colors.secondary,
                    paddingVertical: 12,
                    borderRadius: 6,
                    alignItems: 'center',
                    opacity: updating ? 0.5 : 1,
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: '600' }}>
                    {updating ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              marginTop: 50,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>
                Edit Vision Test
              </Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                Test Date
              </Text>
              <TextInput
                placeholder="YYYY-MM-DD"
                value={editFormData.test_date}
                onChangeText={text => setEditFormData({ ...editFormData, test_date: text })}
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: colors.text,
                  marginBottom: 16,
                }}
              />

              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                Right Eye Uncorrected
              </Text>
              <TextInput
                placeholder="Enter value"
                value={editFormData.right_eye_uncorrected}
                onChangeText={text => setEditFormData({ ...editFormData, right_eye_uncorrected: text })}
                keyboardType="decimal-pad"
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: colors.text,
                  marginBottom: 16,
                }}
              />

              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                Right Eye Corrected
              </Text>
              <TextInput
                placeholder="Enter value"
                value={editFormData.right_eye_corrected}
                onChangeText={text => setEditFormData({ ...editFormData, right_eye_corrected: text })}
                keyboardType="decimal-pad"
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: colors.text,
                  marginBottom: 16,
                }}
              />

              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                Left Eye Uncorrected
              </Text>
              <TextInput
                placeholder="Enter value"
                value={editFormData.left_eye_uncorrected}
                onChangeText={text => setEditFormData({ ...editFormData, left_eye_uncorrected: text })}
                keyboardType="decimal-pad"
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: colors.text,
                  marginBottom: 16,
                }}
              />

              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                Left Eye Corrected
              </Text>
              <TextInput
                placeholder="Enter value"
                value={editFormData.left_eye_corrected}
                onChangeText={text => setEditFormData({ ...editFormData, left_eye_corrected: text })}
                keyboardType="decimal-pad"
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: colors.text,
                  marginBottom: 16,
                }}
              />

              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                Near Vision Test
              </Text>
              <TextInput
                placeholder="Enter value"
                value={editFormData.near_vision_test}
                onChangeText={text => setEditFormData({ ...editFormData, near_vision_test: text })}
                keyboardType="decimal-pad"
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: colors.text,
                  marginBottom: 16,
                }}
              />

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, flex: 1 }}>
                  Requires Correction
                </Text>
                <Switch
                  value={editFormData.requires_correction}
                  onValueChange={value => setEditFormData({ ...editFormData, requires_correction: value })}
                  trackColor={{ false: colors.border, true: colors.secondary }}
                  thumbColor={editFormData.requires_correction ? colors.secondary : colors.text}
                />
              </View>

              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                Recommendations
              </Text>
              <TextInput
                placeholder="Enter recommendations"
                value={editFormData.recommendations}
                onChangeText={text => setEditFormData({ ...editFormData, recommendations: text })}
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: colors.text,
                  marginBottom: 16,
                  textAlignVertical: 'top',
                }}
              />

              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                Notes
              </Text>
              <TextInput
                placeholder="Enter notes"
                value={editFormData.notes}
                onChangeText={text => setEditFormData({ ...editFormData, notes: text })}
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: colors.text,
                  marginBottom: 24,
                  textAlignVertical: 'top',
                }}
              />

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setShowEditModal(false)}
                  style={{
                    flex: 1,
                    backgroundColor: colors.border,
                    paddingVertical: 12,
                    borderRadius: 6,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveEdit}
                  disabled={updating}
                  style={{
                    flex: 1,
                    backgroundColor: colors.secondary,
                    paddingVertical: 12,
                    borderRadius: 6,
                    alignItems: 'center',
                    opacity: updating ? 0.5 : 1,
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: '600' }}>
                    {updating ? 'Updating...' : 'Update'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default VisionTestListScreen;
