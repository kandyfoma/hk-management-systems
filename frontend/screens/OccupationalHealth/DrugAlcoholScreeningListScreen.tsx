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

interface DrugAlcoholScreeningResult {
  id: number;
  worker_id: number;
  worker_name: string;
  test_date: string;
  test_type: string;
  alcohol_result: string;
  drug_result: string;
  fit_for_duty: boolean;
  status: string;
  specimens_tested?: string;
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
  test_type: string;
  alcohol_result: string;
  drug_result: string;
  fit_for_duty: boolean;
  specimens_tested: string;
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

const TEST_TYPES = ['Breath', 'Blood', 'Urine'];
const RESULT_OPTIONS = ['Negative', 'Presumptive', 'Positive'];

const DrugAlcoholScreeningListScreen: React.FC = () => {
  const [results, setResults] = useState<DrugAlcoholScreeningResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DrugAlcoholScreeningResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<WorkerOption | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);
  const [showTestTypeDropdown, setShowTestTypeDropdown] = useState(false);
  const [showAlcoholDropdown, setShowAlcoholDropdown] = useState(false);
  const [showDrugDropdown, setShowDrugDropdown] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    test_date: new Date().toISOString().split('T')[0],
    test_type: '',
    alcohol_result: '',
    drug_result: '',
    fit_for_duty: true,
    specimens_tested: '',
    notes: '',
  });

  const [editFormData, setEditFormData] = useState<FormData>({
    test_date: '',
    test_type: '',
    alcohol_result: '',
    drug_result: '',
    fit_for_duty: true,
    specimens_tested: '',
    notes: '',
  });

  useEffect(() => {
    loadResults();
    loadWorkers();
  }, []);

  const loadResults = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ApiService.get('/occupational-health/drug-alcohol-screening-results/');
      const sorted = response.data.sort(
        (a: DrugAlcoholScreeningResult, b: DrugAlcoholScreeningResult) =>
          new Date(b.test_date).getTime() - new Date(a.test_date).getTime()
      );
      setResults(sorted.slice(0, 5));
    } catch (error) {
      Alert.alert('Error', 'Failed to load drug/alcohol screening results');
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

    if (!formData.test_date || !formData.test_type) {
      Alert.alert('Validation', 'Please fill in required fields');
      return;
    }

    try {
      setUpdating(true);
      const payload = {
        worker_id: selectedWorker.id,
        test_date: formData.test_date,
        test_type: formData.test_type,
        alcohol_result: formData.alcohol_result,
        drug_result: formData.drug_result,
        fit_for_duty: formData.fit_for_duty,
        specimens_tested: formData.specimens_tested,
        notes: formData.notes,
      };

      await ApiService.post('/occupational-health/drug-alcohol-screening-results/', payload);
      Alert.alert('Success', 'Drug/alcohol screening result added');
      setShowAddModal(false);
      setFormData({
        test_date: new Date().toISOString().split('T')[0],
        test_type: '',
        alcohol_result: '',
        drug_result: '',
        fit_for_duty: true,
        specimens_tested: '',
        notes: '',
      });
      setSelectedWorker(null);
      await loadResults();
    } catch (error) {
      Alert.alert('Error', 'Failed to save drug/alcohol screening result');
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenEdit = (item: DrugAlcoholScreeningResult) => {
    setSelectedItem(item);
    setEditFormData({
      test_date: item.test_date,
      test_type: item.test_type,
      alcohol_result: item.alcohol_result,
      drug_result: item.drug_result,
      fit_for_duty: item.fit_for_duty,
      specimens_tested: item.specimens_tested || '',
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
        test_type: editFormData.test_type,
        alcohol_result: editFormData.alcohol_result,
        drug_result: editFormData.drug_result,
        fit_for_duty: editFormData.fit_for_duty,
        specimens_tested: editFormData.specimens_tested,
        notes: editFormData.notes,
      };

      await ApiService.patch(
        `/occupational-health/drug-alcohol-screening-results/${selectedItem.id}/`,
        patchData
      );

      setResults(
        results.map(r =>
          r.id === selectedItem.id ? { ...r, ...patchData } : r
        )
      );
      setShowEditModal(false);
      Alert.alert('Success', 'Drug/alcohol screening result updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to update drug/alcohol screening result');
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = (item: DrugAlcoholScreeningResult) => {
    Alert.alert('Delete', 'Are you sure you want to delete this screening result?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            setDeleting(true);
            await ApiService.delete(`/occupational-health/drug-alcohol-screening-results/${item.id}/`);
            setResults(results.filter(r => r.id !== item.id));
            Alert.alert('Success', 'Drug/alcohol screening result deleted');
          } catch (error) {
            Alert.alert('Error', 'Failed to delete drug/alcohol screening result');
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
          Drug/Alcohol Screening
        </Text>
        <TouchableOpacity
          onPress={() => setShowAddModal(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.primary,
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
              borderColor: filterStatus === 'all' ? colors.primary : colors.border,
              borderRadius: 20,
              backgroundColor: filterStatus === 'all' ? colors.primary : colors.surface,
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
                  sortBy === sort ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: sortBy === sort ? colors.primary : colors.border,
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
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
        ) : filteredAndSorted.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <MaterialCommunityIcons name="flask-empty-outline" size={48} color={colors.textLight} />
            <Text style={{ color: colors.textLight, marginTop: 8 }}>No screening results found</Text>
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
                Result: {item.alcohol_result} / {item.drug_result}
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: colors.textLight }}>{item.test_type} Test</Text>
                {!item.fit_for_duty && (
                  <View
                    style={{
                      backgroundColor: colors.danger + '20',
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 3,
                    }}
                  >
                    <Text style={{ fontSize: 10, color: colors.danger, fontWeight: '600' }}>
                      ⚠ Not Fit for Duty
                    </Text>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => handleOpenEdit(item)}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.primary,
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
                Add Screening Result
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

              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                  Test Type
                </Text>
                <TouchableOpacity
                  onPress={() => setShowTestTypeDropdown(!showTestTypeDropdown)}
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
                  <Text style={{ color: formData.test_type ? colors.text : colors.textLight }}>
                    {formData.test_type || 'Select test type'}
                  </Text>
                  <MaterialCommunityIcons
                    name={showTestTypeDropdown ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textLight}
                  />
                </TouchableOpacity>
                {showTestTypeDropdown && (
                  <View
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: 6,
                      marginTop: 8,
                    }}
                  >
                    {TEST_TYPES.map((type, idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => {
                          setFormData({ ...formData, test_type: type });
                          setShowTestTypeDropdown(false);
                        }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          borderBottomWidth: idx !== TEST_TYPES.length - 1 ? 1 : 0,
                          borderBottomColor: colors.border,
                        }}
                      >
                        <Text style={{ color: colors.text }}>{type}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                  Alcohol Result
                </Text>
                <TouchableOpacity
                  onPress={() => setShowAlcoholDropdown(!showAlcoholDropdown)}
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
                  <Text style={{ color: formData.alcohol_result ? colors.text : colors.textLight }}>
                    {formData.alcohol_result || 'Select result'}
                  </Text>
                  <MaterialCommunityIcons
                    name={showAlcoholDropdown ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textLight}
                  />
                </TouchableOpacity>
                {showAlcoholDropdown && (
                  <View
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: 6,
                      marginTop: 8,
                    }}
                  >
                    {RESULT_OPTIONS.map((result, idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => {
                          setFormData({ ...formData, alcohol_result: result });
                          setShowAlcoholDropdown(false);
                        }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          borderBottomWidth: idx !== RESULT_OPTIONS.length - 1 ? 1 : 0,
                          borderBottomColor: colors.border,
                        }}
                      >
                        <Text style={{ color: colors.text }}>{result}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                  Drug Result
                </Text>
                <TouchableOpacity
                  onPress={() => setShowDrugDropdown(!showDrugDropdown)}
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
                  <Text style={{ color: formData.drug_result ? colors.text : colors.textLight }}>
                    {formData.drug_result || 'Select result'}
                  </Text>
                  <MaterialCommunityIcons
                    name={showDrugDropdown ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textLight}
                  />
                </TouchableOpacity>
                {showDrugDropdown && (
                  <View
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: 6,
                      marginTop: 8,
                    }}
                  >
                    {RESULT_OPTIONS.map((result, idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => {
                          setFormData({ ...formData, drug_result: result });
                          setShowDrugDropdown(false);
                        }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          borderBottomWidth: idx !== RESULT_OPTIONS.length - 1 ? 1 : 0,
                          borderBottomColor: colors.border,
                        }}
                      >
                        <Text style={{ color: colors.text }}>{result}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, flex: 1 }}>
                  Fit for Duty
                </Text>
                <Switch
                  value={formData.fit_for_duty}
                  onValueChange={value => setFormData({ ...formData, fit_for_duty: value })}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={formData.fit_for_duty ? colors.primary : colors.text}
                />
              </View>

              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                Specimens Tested
              </Text>
              <TextInput
                placeholder="Enter specimens tested"
                value={formData.specimens_tested}
                onChangeText={text => setFormData({ ...formData, specimens_tested: text })}
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
                    backgroundColor: colors.primary,
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
                Edit Screening Result
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
                Test Type
              </Text>
              <TextInput
                placeholder="Enter test type"
                value={editFormData.test_type}
                onChangeText={text => setEditFormData({ ...editFormData, test_type: text })}
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
                Alcohol Result
              </Text>
              <TextInput
                placeholder="Enter alcohol result"
                value={editFormData.alcohol_result}
                onChangeText={text => setEditFormData({ ...editFormData, alcohol_result: text })}
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
                Drug Result
              </Text>
              <TextInput
                placeholder="Enter drug result"
                value={editFormData.drug_result}
                onChangeText={text => setEditFormData({ ...editFormData, drug_result: text })}
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
                  Fit for Duty
                </Text>
                <Switch
                  value={editFormData.fit_for_duty}
                  onValueChange={value => setEditFormData({ ...editFormData, fit_for_duty: value })}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={editFormData.fit_for_duty ? colors.primary : colors.text}
                />
              </View>

              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                Specimens Tested
              </Text>
              <TextInput
                placeholder="Enter specimens tested"
                value={editFormData.specimens_tested}
                onChangeText={text => setEditFormData({ ...editFormData, specimens_tested: text })}
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
                    backgroundColor: colors.primary,
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

export default DrugAlcoholScreeningListScreen;
