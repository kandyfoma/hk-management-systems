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

interface PPEComplianceRecord {
  id: number;
  worker_id: number;
  worker_name: string;
  check_date: string;
  check_type: string;
  status: string;
  is_compliant: boolean;
  condition_notes?: string;
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
  check_date: string;
  check_type: string;
  status: string;
  is_compliant: boolean;
  condition_notes: string;
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

const CHECK_TYPES = ['Hard Hat', 'Safety Shoes', 'Gloves', 'Mask', 'Harness', 'Other'];
const STATUS_OPTIONS = ['In Use', 'Expired', 'Damaged', 'Lost', 'Replaced', 'Compliant', 'Non-Compliant'];

const PPEComplianceListScreen: React.FC = () => {
  const [results, setResults] = useState<PPEComplianceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PPEComplianceRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCompliance, setFilterCompliance] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<WorkerOption | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);
  const [showCheckTypeDropdown, setShowCheckTypeDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    check_date: new Date().toISOString().split('T')[0],
    check_type: '',
    status: '',
    is_compliant: false,
    condition_notes: '',
    notes: '',
  });

  const [editFormData, setEditFormData] = useState<FormData>({
    check_date: '',
    check_type: '',
    status: '',
    is_compliant: false,
    condition_notes: '',
    notes: '',
  });

  useEffect(() => {
    loadResults();
    loadWorkers();
  }, []);

  const loadResults = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ApiService.get('/occupational-health/ppe-compliance-results/');
      const sorted = response.data.sort(
        (a: PPEComplianceRecord, b: PPEComplianceRecord) =>
          new Date(b.check_date).getTime() - new Date(a.check_date).getTime()
      );
      setResults(sorted.slice(0, 5));
    } catch (error) {
      Alert.alert('Error', 'Failed to load PPE compliance records');
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

    if (!formData.check_date || !formData.check_type) {
      Alert.alert('Validation', 'Please fill in required fields');
      return;
    }

    try {
      setUpdating(true);
      const payload = {
        worker_id: selectedWorker.id,
        check_date: formData.check_date,
        check_type: formData.check_type,
        status: formData.status,
        is_compliant: formData.is_compliant,
        condition_notes: formData.condition_notes,
        notes: formData.notes,
      };

      await ApiService.post('/occupational-health/ppe-compliance-results/', payload);
      Alert.alert('Success', 'PPE compliance record added');
      setShowAddModal(false);
      setFormData({
        check_date: new Date().toISOString().split('T')[0],
        check_type: '',
        status: '',
        is_compliant: false,
        condition_notes: '',
        notes: '',
      });
      setSelectedWorker(null);
      await loadResults();
    } catch (error) {
      Alert.alert('Error', 'Failed to save PPE compliance record');
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenEdit = (item: PPEComplianceRecord) => {
    setSelectedItem(item);
    setEditFormData({
      check_date: item.check_date,
      check_type: item.check_type,
      status: item.status,
      is_compliant: item.is_compliant,
      condition_notes: item.condition_notes || '',
      notes: item.notes || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;

    try {
      setUpdating(true);
      const patchData = {
        check_date: editFormData.check_date,
        check_type: editFormData.check_type,
        status: editFormData.status,
        is_compliant: editFormData.is_compliant,
        condition_notes: editFormData.condition_notes,
        notes: editFormData.notes,
      };

      await ApiService.patch(
        `/occupational-health/ppe-compliance-results/${selectedItem.id}/`,
        patchData
      );

      setResults(
        results.map(r =>
          r.id === selectedItem.id ? { ...r, ...patchData } : r
        )
      );
      setShowEditModal(false);
      Alert.alert('Success', 'PPE compliance record updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to update PPE compliance record');
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = (item: PPEComplianceRecord) => {
    Alert.alert('Delete', 'Are you sure you want to delete this PPE compliance record?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            setDeleting(true);
            await ApiService.delete(`/occupational-health/ppe-compliance-results/${item.id}/`);
            setResults(results.filter(r => r.id !== item.id));
            Alert.alert('Success', 'PPE compliance record deleted');
          } catch (error) {
            Alert.alert('Error', 'Failed to delete PPE compliance record');
            console.error(error);
          } finally {
            setDeleting(false);
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const getStatusColor = (complianceStatus: string) => {
    const statusLower = complianceStatus.toLowerCase();
    if (statusLower.includes('compliant')) {
      return statusLower === 'compliant' ? colors.success : colors.danger;
    }
    switch (complianceStatus) {
      case 'In Use':
        return colors.success;
      case 'Expired':
      case 'Damaged':
        return colors.warning;
      case 'Lost':
      case 'Non-Compliant':
        return colors.danger;
      default:
        return colors.textLight;
    }
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
      const statusLower = filterStatus.toLowerCase();
      filtered = filtered.filter(item => item.status.toLowerCase().includes(statusLower));
    }

    if (filterCompliance !== 'all') {
      const isCompliant = filterCompliance === 'yes';
      filtered = filtered.filter(item => item.is_compliant === isCompliant);
    }

    let sorted = [...filtered];
    if (sortBy === 'recent') {
      sorted.sort((a, b) => new Date(b.check_date).getTime() - new Date(a.check_date).getTime());
    } else if (sortBy === 'name') {
      sorted.sort((a, b) => a.worker_name.localeCompare(b.worker_name));
    }

    return sorted;
  }, [results, searchQuery, filterStatus, filterCompliance, sortBy]);

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
          PPE Compliance
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
            onPress={() => setFilterCompliance('all')}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: filterCompliance === 'all' ? colors.secondary : colors.surface,
              borderWidth: 1,
              borderColor: filterCompliance === 'all' ? colors.secondary : colors.border,
            }}
          >
            <Text
              style={{
                color: filterCompliance === 'all' ? 'white' : colors.text,
                fontSize: 11,
                fontWeight: '600',
              }}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFilterCompliance('yes')}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: filterCompliance === 'yes' ? colors.success : colors.surface,
              borderWidth: 1,
              borderColor: filterCompliance === 'yes' ? colors.success : colors.border,
            }}
          >
            <Text
              style={{
                color: filterCompliance === 'yes' ? 'white' : colors.text,
                fontSize: 11,
                fontWeight: '600',
              }}
            >
              Compliant
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFilterCompliance('no')}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: filterCompliance === 'no' ? colors.danger : colors.surface,
              borderWidth: 1,
              borderColor: filterCompliance === 'no' ? colors.danger : colors.border,
            }}
          >
            <Text
              style={{
                color: filterCompliance === 'no' ? 'white' : colors.text,
                fontSize: 11,
                fontWeight: '600',
              }}
            >
              Non-Compliant
            </Text>
          </TouchableOpacity>
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
            <MaterialCommunityIcons name="shield-outline" size={48} color={colors.textLight} />
            <Text style={{ color: colors.textLight, marginTop: 8 }}>No PPE compliance records found</Text>
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
                    {new Date(item.check_date).toLocaleDateString()}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: item.is_compliant ? colors.success : colors.danger,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ fontSize: 11, color: 'white', fontWeight: '600' }}>
                    {item.is_compliant ? 'Compliant' : 'Non-Compliant'}
                  </Text>
                </View>
              </View>

              <Text style={{ fontSize: 13, color: colors.text, marginBottom: 8, fontWeight: '500' }}>
                Type: {item.check_type} | Status: {item.status}
              </Text>

              {!item.is_compliant && item.condition_notes && (
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
                    ⚠ {item.condition_notes}
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
                Add PPE Compliance Record
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
                Check Date
              </Text>
              <TextInput
                placeholder="YYYY-MM-DD"
                value={formData.check_date}
                onChangeText={text => setFormData({ ...formData, check_date: text })}
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
                  Check Type
                </Text>
                <TouchableOpacity
                  onPress={() => setShowCheckTypeDropdown(!showCheckTypeDropdown)}
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
                  <Text style={{ color: formData.check_type ? colors.text : colors.textLight }}>
                    {formData.check_type || 'Select check type'}
                  </Text>
                  <MaterialCommunityIcons
                    name={showCheckTypeDropdown ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textLight}
                  />
                </TouchableOpacity>
                {showCheckTypeDropdown && (
                  <View
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: 6,
                      marginTop: 8,
                    }}
                  >
                    {CHECK_TYPES.map((type, idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => {
                          setFormData({ ...formData, check_type: type });
                          setShowCheckTypeDropdown(false);
                        }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          borderBottomWidth: idx !== CHECK_TYPES.length - 1 ? 1 : 0,
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
                  Status
                </Text>
                <TouchableOpacity
                  onPress={() => setShowStatusDropdown(!showStatusDropdown)}
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
                  <Text style={{ color: formData.status ? colors.text : colors.textLight }}>
                    {formData.status || 'Select status'}
                  </Text>
                  <MaterialCommunityIcons
                    name={showStatusDropdown ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textLight}
                  />
                </TouchableOpacity>
                {showStatusDropdown && (
                  <ScrollView
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: 6,
                      marginTop: 8,
                      maxHeight: 200,
                    }}
                  >
                    {STATUS_OPTIONS.map((stat, idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => {
                          setFormData({ ...formData, status: stat });
                          setShowStatusDropdown(false);
                        }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          borderBottomWidth: 1,
                          borderBottomColor: colors.border,
                        }}
                      >
                        <Text style={{ color: colors.text }}>{stat}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, flex: 1 }}>
                  Is Compliant
                </Text>
                <Switch
                  value={formData.is_compliant}
                  onValueChange={value => setFormData({ ...formData, is_compliant: value })}
                  trackColor={{ false: colors.border, true: colors.secondary }}
                  thumbColor={formData.is_compliant ? colors.secondary : colors.text}
                />
              </View>

              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                Condition Notes
              </Text>
              <TextInput
                placeholder="Enter condition notes"
                value={formData.condition_notes}
                onChangeText={text => setFormData({ ...formData, condition_notes: text })}
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
                Edit PPE Compliance Record
              </Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                Check Date
              </Text>
              <TextInput
                placeholder="YYYY-MM-DD"
                value={editFormData.check_date}
                onChangeText={text => setEditFormData({ ...editFormData, check_date: text })}
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
                Check Type
              </Text>
              <TextInput
                placeholder="Enter check type"
                value={editFormData.check_type}
                onChangeText={text => setEditFormData({ ...editFormData, check_type: text })}
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
                Status
              </Text>
              <TextInput
                placeholder="Enter status"
                value={editFormData.status}
                onChangeText={text => setEditFormData({ ...editFormData, status: text })}
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
                  Is Compliant
                </Text>
                <Switch
                  value={editFormData.is_compliant}
                  onValueChange={value => setEditFormData({ ...editFormData, is_compliant: value })}
                  trackColor={{ false: colors.border, true: colors.secondary }}
                  thumbColor={editFormData.is_compliant ? colors.secondary : colors.text}
                />
              </View>

              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                Condition Notes
              </Text>
              <TextInput
                placeholder="Enter condition notes"
                value={editFormData.condition_notes}
                onChangeText={text => setEditFormData({ ...editFormData, condition_notes: text })}
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

export default PPEComplianceListScreen;
