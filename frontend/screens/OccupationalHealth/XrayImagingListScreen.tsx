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

interface XrayImagingResult {
  id: number;
  worker_id: number;
  worker_name: string;
  imaging_date: string;
  imaging_type: string;
  ilo_classification: string;
  profusion: string;
  pneumoconiosis_detected: boolean;
  severity?: string;
  status: string;
  radiologist_notes?: string;
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
  imaging_date: string;
  imaging_type: string;
  ilo_classification: string;
  profusion: string;
  pneumoconiosis_detected: boolean;
  severity: string;
  radiologist_notes: string;
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

const IMAGING_TYPES = ['Chest X-ray', 'Digital Radiography', 'CT Scan', 'Ultrasound', 'Other'];
const PROFUSION_OPTIONS = ['0/0', '0/1', '1/0', '1/1', '1/2', '2/1', '2/2', '2/3', '3/2', '3/3', '3/4', '4/3', '4/4'];
const ILO_OPTIONS = ['0', '1', '2', '3'];

const XrayImagingListScreen: React.FC = () => {
  const [results, setResults] = useState<XrayImagingResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<XrayImagingResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPneumo, setFilterPneumo] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<WorkerOption | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);
  const [showImagingTypeDropdown, setShowImagingTypeDropdown] = useState(false);
  const [showILODropdown, setShowILODropdown] = useState(false);
  const [showProfusionDropdown, setShowProfusionDropdown] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    imaging_date: new Date().toISOString().split('T')[0],
    imaging_type: '',
    ilo_classification: '',
    profusion: '',
    pneumoconiosis_detected: false,
    severity: '',
    radiologist_notes: '',
    notes: '',
  });

  const [editFormData, setEditFormData] = useState<FormData>({
    imaging_date: '',
    imaging_type: '',
    ilo_classification: '',
    profusion: '',
    pneumoconiosis_detected: false,
    severity: '',
    radiologist_notes: '',
    notes: '',
  });

  useEffect(() => {
    loadResults();
    loadWorkers();
  }, []);

  const loadResults = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ApiService.get('/occupational-health/xray-imaging-results/');
      const sorted = response.data.sort(
        (a: XrayImagingResult, b: XrayImagingResult) =>
          new Date(b.imaging_date).getTime() - new Date(a.imaging_date).getTime()
      );
      setResults(sorted.slice(0, 5));
    } catch (error) {
      Alert.alert('Error', 'Failed to load xray imaging results');
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

    if (!formData.imaging_date || !formData.imaging_type) {
      Alert.alert('Validation', 'Please fill in required fields');
      return;
    }

    try {
      setUpdating(true);
      const payload = {
        worker_id: selectedWorker.id,
        imaging_date: formData.imaging_date,
        imaging_type: formData.imaging_type,
        ilo_classification: formData.ilo_classification,
        profusion: formData.profusion,
        pneumoconiosis_detected: formData.pneumoconiosis_detected,
        severity: formData.severity,
        radiologist_notes: formData.radiologist_notes,
        notes: formData.notes,
      };

      await ApiService.post('/occupational-health/xray-imaging-results/', payload);
      Alert.alert('Success', 'X-ray imaging result added');
      setShowAddModal(false);
      setFormData({
        imaging_date: new Date().toISOString().split('T')[0],
        imaging_type: '',
        ilo_classification: '',
        profusion: '',
        pneumoconiosis_detected: false,
        severity: '',
        radiologist_notes: '',
        notes: '',
      });
      setSelectedWorker(null);
      await loadResults();
    } catch (error) {
      Alert.alert('Error', 'Failed to save x-ray imaging result');
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenEdit = (item: XrayImagingResult) => {
    setSelectedItem(item);
    setEditFormData({
      imaging_date: item.imaging_date,
      imaging_type: item.imaging_type,
      ilo_classification: item.ilo_classification,
      profusion: item.profusion,
      pneumoconiosis_detected: item.pneumoconiosis_detected,
      severity: item.severity || '',
      radiologist_notes: item.radiologist_notes || '',
      notes: item.notes || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;

    try {
      setUpdating(true);
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

      await ApiService.patch(
        `/occupational-health/xray-imaging-results/${selectedItem.id}/`,
        patchData
      );

      setResults(
        results.map(r =>
          r.id === selectedItem.id ? { ...r, ...patchData } : r
        )
      );
      setShowEditModal(false);
      Alert.alert('Success', 'X-ray imaging result updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to update x-ray imaging result');
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = (item: XrayImagingResult) => {
    Alert.alert('Delete', 'Are you sure you want to delete this x-ray imaging result?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            setDeleting(true);
            await ApiService.delete(`/occupational-health/xray-imaging-results/${item.id}/`);
            setResults(results.filter(r => r.id !== item.id));
            Alert.alert('Success', 'X-ray imaging result deleted');
          } catch (error) {
            Alert.alert('Error', 'Failed to delete x-ray imaging result');
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

    if (filterPneumo !== 'all') {
      const pneumo = filterPneumo === 'yes';
      filtered = filtered.filter(item => item.pneumoconiosis_detected === pneumo);
    }

    let sorted = [...filtered];
    if (sortBy === 'recent') {
      sorted.sort((a, b) => new Date(b.imaging_date).getTime() - new Date(a.imaging_date).getTime());
    } else if (sortBy === 'name') {
      sorted.sort((a, b) => a.worker_name.localeCompare(b.worker_name));
    }

    return sorted;
  }, [results, searchQuery, filterStatus, filterPneumo, sortBy]);

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
          X-ray Imaging
        </Text>
        <TouchableOpacity
          onPress={() => setShowAddModal(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.accent,
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
              borderColor: filterStatus === 'all' ? colors.accent : colors.border,
              borderRadius: 20,
              backgroundColor: filterStatus === 'all' ? colors.accent : colors.surface,
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

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => setFilterPneumo('all')}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: filterPneumo === 'all' ? colors.accent : colors.surface,
              borderWidth: 1,
              borderColor: filterPneumo === 'all' ? colors.accent : colors.border,
            }}
          >
            <Text
              style={{
                color: filterPneumo === 'all' ? 'white' : colors.text,
                fontSize: 11,
                fontWeight: '600',
              }}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFilterPneumo('yes')}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: filterPneumo === 'yes' ? colors.danger : colors.surface,
              borderWidth: 1,
              borderColor: filterPneumo === 'yes' ? colors.danger : colors.border,
            }}
          >
            <Text
              style={{
                color: filterPneumo === 'yes' ? 'white' : colors.text,
                fontSize: 11,
                fontWeight: '600',
              }}
            >
              Pneumo +
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFilterPneumo('no')}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: filterPneumo === 'no' ? colors.success : colors.surface,
              borderWidth: 1,
              borderColor: filterPneumo === 'no' ? colors.success : colors.border,
            }}
          >
            <Text
              style={{
                color: filterPneumo === 'no' ? 'white' : colors.text,
                fontSize: 11,
                fontWeight: '600',
              }}
            >
              Pneumo -
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
                  sortBy === sort ? colors.accent : colors.surface,
                borderWidth: 1,
                borderColor: sortBy === sort ? colors.accent : colors.border,
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
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 20 }} />
        ) : filteredAndSorted.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <MaterialCommunityIcons name="file-document-outline" size={48} color={colors.textLight} />
            <Text style={{ color: colors.textLight, marginTop: 8 }}>No x-ray imaging results found</Text>
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
                    {new Date(item.imaging_date).toLocaleDateString()}
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
                ILO: {item.ilo_classification} | Profusion: {item.profusion}
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: colors.textLight }}>{item.imaging_type}</Text>
                {item.pneumoconiosis_detected && (
                  <View
                    style={{
                      backgroundColor: colors.danger + '20',
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 3,
                    }}
                  >
                    <Text style={{ fontSize: 10, color: colors.danger, fontWeight: '600' }}>
                      ⚠ Pneumoconiosis
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
                    backgroundColor: colors.accent,
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
                Add X-ray Imaging
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
                Imaging Date
              </Text>
              <TextInput
                placeholder="YYYY-MM-DD"
                value={formData.imaging_date}
                onChangeText={text => setFormData({ ...formData, imaging_date: text })}
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
                  Imaging Type
                </Text>
                <TouchableOpacity
                  onPress={() => setShowImagingTypeDropdown(!showImagingTypeDropdown)}
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
                  <Text style={{ color: formData.imaging_type ? colors.text : colors.textLight }}>
                    {formData.imaging_type || 'Select imaging type'}
                  </Text>
                  <MaterialCommunityIcons
                    name={showImagingTypeDropdown ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textLight}
                  />
                </TouchableOpacity>
                {showImagingTypeDropdown && (
                  <View
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: 6,
                      marginTop: 8,
                    }}
                  >
                    {IMAGING_TYPES.map((type, idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => {
                          setFormData({ ...formData, imaging_type: type });
                          setShowImagingTypeDropdown(false);
                        }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          borderBottomWidth: idx !== IMAGING_TYPES.length - 1 ? 1 : 0,
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
                  ILO Classification
                </Text>
                <TouchableOpacity
                  onPress={() => setShowILODropdown(!showILODropdown)}
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
                  <Text style={{ color: formData.ilo_classification ? colors.text : colors.textLight }}>
                    {formData.ilo_classification || 'Select classification'}
                  </Text>
                  <MaterialCommunityIcons
                    name={showILODropdown ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textLight}
                  />
                </TouchableOpacity>
                {showILODropdown && (
                  <View
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: 6,
                      marginTop: 8,
                    }}
                  >
                    {ILO_OPTIONS.map((ilo, idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => {
                          setFormData({ ...formData, ilo_classification: ilo });
                          setShowILODropdown(false);
                        }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          borderBottomWidth: idx !== ILO_OPTIONS.length - 1 ? 1 : 0,
                          borderBottomColor: colors.border,
                        }}
                      >
                        <Text style={{ color: colors.text }}>{ilo}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                  Profusion
                </Text>
                <TouchableOpacity
                  onPress={() => setShowProfusionDropdown(!showProfusionDropdown)}
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
                  <Text style={{ color: formData.profusion ? colors.text : colors.textLight }}>
                    {formData.profusion || 'Select profusion'}
                  </Text>
                  <MaterialCommunityIcons
                    name={showProfusionDropdown ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textLight}
                  />
                </TouchableOpacity>
                {showProfusionDropdown && (
                  <ScrollView
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: 6,
                      marginTop: 8,
                      maxHeight: 200,
                    }}
                  >
                    {PROFUSION_OPTIONS.map((prof, idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => {
                          setFormData({ ...formData, profusion: prof });
                          setShowProfusionDropdown(false);
                        }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          borderBottomWidth: 1,
                          borderBottomColor: colors.border,
                        }}
                      >
                        <Text style={{ color: colors.text }}>{prof}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, flex: 1 }}>
                  Pneumoconiosis Detected
                </Text>
                <Switch
                  value={formData.pneumoconiosis_detected}
                  onValueChange={value => setFormData({ ...formData, pneumoconiosis_detected: value })}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={formData.pneumoconiosis_detected ? colors.accent : colors.text}
                />
              </View>

              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                Severity
              </Text>
              <TextInput
                placeholder="Enter severity"
                value={formData.severity}
                onChangeText={text => setFormData({ ...formData, severity: text })}
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
                Radiologist Notes
              </Text>
              <TextInput
                placeholder="Enter radiologist notes"
                value={formData.radiologist_notes}
                onChangeText={text => setFormData({ ...formData, radiologist_notes: text })}
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
                    backgroundColor: colors.accent,
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
                Edit X-ray Imaging
              </Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                Imaging Date
              </Text>
              <TextInput
                placeholder="YYYY-MM-DD"
                value={editFormData.imaging_date}
                onChangeText={text => setEditFormData({ ...editFormData, imaging_date: text })}
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
                Imaging Type
              </Text>
              <TextInput
                placeholder="Enter imaging type"
                value={editFormData.imaging_type}
                onChangeText={text => setEditFormData({ ...editFormData, imaging_type: text })}
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
                ILO Classification
              </Text>
              <TextInput
                placeholder="Enter ILO classification"
                value={editFormData.ilo_classification}
                onChangeText={text => setEditFormData({ ...editFormData, ilo_classification: text })}
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
                Profusion
              </Text>
              <TextInput
                placeholder="Enter profusion"
                value={editFormData.profusion}
                onChangeText={text => setEditFormData({ ...editFormData, profusion: text })}
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
                  Pneumoconiosis Detected
                </Text>
                <Switch
                  value={editFormData.pneumoconiosis_detected}
                  onValueChange={value => setEditFormData({ ...editFormData, pneumoconiosis_detected: value })}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={editFormData.pneumoconiosis_detected ? colors.accent : colors.text}
                />
              </View>

              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                Severity
              </Text>
              <TextInput
                placeholder="Enter severity"
                value={editFormData.severity}
                onChangeText={text => setEditFormData({ ...editFormData, severity: text })}
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
                Radiologist Notes
              </Text>
              <TextInput
                placeholder="Enter radiologist notes"
                value={editFormData.radiologist_notes}
                onChangeText={text => setEditFormData({ ...editFormData, radiologist_notes: text })}
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
                    backgroundColor: colors.accent,
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

export default XrayImagingListScreen;
