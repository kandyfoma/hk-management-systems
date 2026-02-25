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
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ApiService from '../../../services/ApiService';

interface HealthScreeningResult {
  id: number;
  worker_id: number;
  worker_name: string;
  screening_date: string;
  screening_type: string;
  status: string;
  responses?: string;
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
  screening_date: string;
  screening_type: string;
  responses: string;
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

const SCREENING_TYPES = ['Health Risk Assessment', 'Fitness Evaluation', 'Mental Health', 'Nutritional Assessment', 'Lifestyle Counseling'];

const HealthScreeningListScreen: React.FC = () => {
  const [results, setResults] = useState<HealthScreeningResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<HealthScreeningResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<WorkerOption | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    screening_date: new Date().toISOString().split('T')[0],
    screening_type: '',
    responses: '',
    notes: '',
  });

  const [editFormData, setEditFormData] = useState<FormData>({
    screening_date: '',
    screening_type: '',
    responses: '',
    notes: '',
  });

  useEffect(() => {
    loadResults();
    loadWorkers();
  }, []);

  const loadResults = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ApiService.get('/occupational-health/health-screening-results/');
      const sorted = response.data.sort(
        (a: HealthScreeningResult, b: HealthScreeningResult) =>
          new Date(b.screening_date).getTime() - new Date(a.screening_date).getTime()
      );
      setResults(sorted.slice(0, 5));
    } catch (error) {
      Alert.alert('Error', 'Failed to load health screening results');
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

    if (!formData.screening_date || !formData.screening_type) {
      Alert.alert('Validation', 'Please fill in required fields');
      return;
    }

    try {
      setUpdating(true);
      const payload = {
        worker_id: selectedWorker.id,
        screening_date: formData.screening_date,
        screening_type: formData.screening_type,
        responses: formData.responses,
        notes: formData.notes,
      };

      await ApiService.post('/occupational-health/health-screening-results/', payload);
      Alert.alert('Success', 'Health screening result added');
      setShowAddModal(false);
      setFormData({
        screening_date: new Date().toISOString().split('T')[0],
        screening_type: '',
        responses: '',
        notes: '',
      });
      setSelectedWorker(null);
      await loadResults();
    } catch (error) {
      Alert.alert('Error', 'Failed to save health screening result');
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenEdit = (item: HealthScreeningResult) => {
    setSelectedItem(item);
    setEditFormData({
      screening_date: item.screening_date,
      screening_type: item.screening_type,
      responses: item.responses || '',
      notes: item.notes || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;

    try {
      setUpdating(true);
      const patchData = {
        screening_date: editFormData.screening_date,
        screening_type: editFormData.screening_type,
        responses: editFormData.responses,
        notes: editFormData.notes,
      };

      await ApiService.patch(
        `/occupational-health/health-screening-results/${selectedItem.id}/`,
        patchData
      );

      setResults(
        results.map(r =>
          r.id === selectedItem.id ? { ...r, ...patchData } : r
        )
      );
      setShowEditModal(false);
      Alert.alert('Success', 'Health screening result updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to update health screening result');
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = (item: HealthScreeningResult) => {
    Alert.alert('Delete', 'Are you sure you want to delete this health screening result?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            setDeleting(true);
            await ApiService.delete(`/occupational-health/health-screening-results/${item.id}/`);
            setResults(results.filter(r => r.id !== item.id));
            Alert.alert('Success', 'Health screening result deleted');
          } catch (error) {
            Alert.alert('Error', 'Failed to delete health screening result');
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
      sorted.sort((a, b) => new Date(b.screening_date).getTime() - new Date(a.screening_date).getTime());
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
          Health Screening
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
            <MaterialCommunityIcons name="heart-outline" size={48} color={colors.textLight} />
            <Text style={{ color: colors.textLight, marginTop: 8 }}>No health screening results found</Text>
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
                    {new Date(item.screening_date).toLocaleDateString()}
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
                {item.screening_type}
              </Text>

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
          <View style={{ flex: 1, backgroundColor: colors.surface, marginTop: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>Add Health Screening</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Worker</Text>
                <TouchableOpacity onPress={() => setShowWorkerDropdown(!showWorkerDropdown)} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: selectedWorker ? colors.text : colors.textLight }}>{selectedWorker ? selectedWorker.label : 'Select worker'}</Text>
                  <MaterialCommunityIcons name={showWorkerDropdown ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textLight} />
                </TouchableOpacity>
                {showWorkerDropdown && (
                  <ScrollView style={{ backgroundColor: colors.background, borderRadius: 6, marginTop: 8, maxHeight: 150 }}>
                    {workers.map(w => (
                      <TouchableOpacity key={w.id} onPress={() => { setSelectedWorker(w); setShowWorkerDropdown(false); }} style={{ paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                        <Text style={{ color: colors.text }}>{w.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Screening Date</Text>
              <TextInput placeholder="YYYY-MM-DD" value={formData.screening_date} onChangeText={t => setFormData({ ...formData, screening_date: t })} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginBottom: 16 }} />
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Screening Type</Text>
                <TouchableOpacity onPress={() => setShowTypeDropdown(!showTypeDropdown)} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: formData.screening_type ? colors.text : colors.textLight }}>{formData.screening_type || 'Select type'}</Text>
                  <MaterialCommunityIcons name={showTypeDropdown ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textLight} />
                </TouchableOpacity>
                {showTypeDropdown && (
                  <View style={{ backgroundColor: colors.background, borderRadius: 6, marginTop: 8 }}>
                    {SCREENING_TYPES.map((t, i) => (
                      <TouchableOpacity key={i} onPress={() => { setFormData({ ...formData, screening_type: t }); setShowTypeDropdown(false); }} style={{ paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: i !== SCREENING_TYPES.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                        <Text style={{ color: colors.text }}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Responses</Text>
              <TextInput placeholder="Enter responses" value={formData.responses} onChangeText={t => setFormData({ ...formData, responses: t })} multiline numberOfLines={2} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginBottom: 16, textAlignVertical: 'top' }} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Notes</Text>
              <TextInput placeholder="Enter notes" value={formData.notes} onChangeText={t => setFormData({ ...formData, notes: t })} multiline numberOfLines={2} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginBottom: 24, textAlignVertical: 'top' }} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => setShowAddModal(false)} style={{ flex: 1, backgroundColor: colors.border, paddingVertical: 12, borderRadius: 6, alignItems: 'center' }}><Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity onPress={handleSubmit} disabled={updating} style={{ flex: 1, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 6, alignItems: 'center', opacity: updating ? 0.5 : 1 }}><Text style={{ color: 'white', fontWeight: '600' }}>{updating ? 'Saving...' : 'Save'}</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ flex: 1, backgroundColor: colors.surface, marginTop: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>Edit Health Screening</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Screening Date</Text>
              <TextInput placeholder="YYYY-MM-DD" value={editFormData.screening_date} onChangeText={t => setEditFormData({ ...editFormData, screening_date: t })} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginBottom: 16 }} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Screening Type</Text>
              <TextInput placeholder="Enter type" value={editFormData.screening_type} onChangeText={t => setEditFormData({ ...editFormData, screening_type: t })} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginBottom: 16 }} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Responses</Text>
              <TextInput placeholder="Enter responses" value={editFormData.responses} onChangeText={t => setEditFormData({ ...editFormData, responses: t })} multiline numberOfLines={2} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginBottom: 16, textAlignVertical: 'top' }} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Notes</Text>
              <TextInput placeholder="Enter notes" value={editFormData.notes} onChangeText={t => setEditFormData({ ...editFormData, notes: t })} multiline numberOfLines={2} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginBottom: 24, textAlignVertical: 'top' }} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => setShowEditModal(false)} style={{ flex: 1, backgroundColor: colors.border, paddingVertical: 12, borderRadius: 6, alignItems: 'center' }}><Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity onPress={handleSaveEdit} disabled={updating} style={{ flex: 1, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 6, alignItems: 'center', opacity: updating ? 0.5 : 1 }}><Text style={{ color: 'white', fontWeight: '600' }}>{updating ? 'Updating...' : 'Update'}</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default HealthScreeningListScreen;
