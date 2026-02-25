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

interface ExamResult {
  id: number;
  worker_id: number;
  worker_name: string;
  exam_date: string;
  exam_type: string;
  fitness_level: string;
  restrictions?: string;
  status: string;
  medical_findings?: string;
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
  exam_date: string;
  exam_type: string;
  fitness_level: string;
  restrictions: string;
  medical_findings: string;
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

const EXAM_TYPES = ['Pre-employment', 'Periodic', 'Return to Work', 'Exit', 'Medical'];
const FITNESS_LEVELS = ['Fit', 'Fit with Restrictions', 'Unfit', 'Pending'];

const ExamsListScreen: React.FC = () => {
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ExamResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<WorkerOption | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);
  const [showExamTypeDropdown, setShowExamTypeDropdown] = useState(false);
  const [showFitnessDropdown, setShowFitnessDropdown] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    exam_date: new Date().toISOString().split('T')[0],
    exam_type: '',
    fitness_level: '',
    restrictions: '',
    medical_findings: '',
    notes: '',
  });

  const [editFormData, setEditFormData] = useState<FormData>({
    exam_date: '',
    exam_type: '',
    fitness_level: '',
    restrictions: '',
    medical_findings: '',
    notes: '',
  });

  useEffect(() => {
    loadResults();
    loadWorkers();
  }, []);

  const loadResults = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ApiService.get('/occupational-health/medical-exams-results/');
      const sorted = response.data.sort(
        (a: ExamResult, b: ExamResult) =>
          new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime()
      );
      setResults(sorted.slice(0, 5));
    } catch (error) {
      Alert.alert('Error', 'Failed to load exam results');
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

    if (!formData.exam_date || !formData.exam_type) {
      Alert.alert('Validation', 'Please fill in required fields');
      return;
    }

    try {
      setUpdating(true);
      const payload = {
        worker_id: selectedWorker.id,
        exam_date: formData.exam_date,
        exam_type: formData.exam_type,
        fitness_level: formData.fitness_level,
        restrictions: formData.restrictions,
        medical_findings: formData.medical_findings,
        notes: formData.notes,
      };

      await ApiService.post('/occupational-health/medical-exams-results/', payload);
      Alert.alert('Success', 'Exam result added');
      setShowAddModal(false);
      setFormData({
        exam_date: new Date().toISOString().split('T')[0],
        exam_type: '',
        fitness_level: '',
        restrictions: '',
        medical_findings: '',
        notes: '',
      });
      setSelectedWorker(null);
      await loadResults();
    } catch (error) {
      Alert.alert('Error', 'Failed to save exam result');
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenEdit = (item: ExamResult) => {
    setSelectedItem(item);
    setEditFormData({
      exam_date: item.exam_date,
      exam_type: item.exam_type,
      fitness_level: item.fitness_level,
      restrictions: item.restrictions || '',
      medical_findings: item.medical_findings || '',
      notes: item.notes || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;

    try {
      setUpdating(true);
      const patchData = {
        exam_date: editFormData.exam_date,
        exam_type: editFormData.exam_type,
        fitness_level: editFormData.fitness_level,
        restrictions: editFormData.restrictions,
        medical_findings: editFormData.medical_findings,
        notes: editFormData.notes,
      };

      await ApiService.patch(
        `/occupational-health/medical-exams-results/${selectedItem.id}/`,
        patchData
      );

      setResults(
        results.map(r =>
          r.id === selectedItem.id ? { ...r, ...patchData } : r
        )
      );
      setShowEditModal(false);
      Alert.alert('Success', 'Exam result updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to update exam result');
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = (item: ExamResult) => {
    Alert.alert('Delete', 'Are you sure you want to delete this exam result?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            setDeleting(true);
            await ApiService.delete(`/occupational-health/medical-exams-results/${item.id}/`);
            setResults(results.filter(r => r.id !== item.id));
            Alert.alert('Success', 'Exam result deleted');
          } catch (error) {
            Alert.alert('Error', 'Failed to delete exam result');
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
      sorted.sort((a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime());
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
          Medical Exams
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
            <Text style={{ color: colors.textLight, marginTop: 8 }}>No exam results found</Text>
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
                    {new Date(item.exam_date).toLocaleDateString()}
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
                {item.exam_type} | Fitness: {item.fitness_level}
              </Text>

              {item.restrictions && (
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
                    ⚠ Restrictions: {item.restrictions}
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

      {/* Add Modal - Abbreviated */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ flex: 1, backgroundColor: colors.surface, marginTop: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>Add Exam</Text>
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
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Exam Date</Text>
              <TextInput placeholder="YYYY-MM-DD" value={formData.exam_date} onChangeText={t => setFormData({ ...formData, exam_date: t })} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginBottom: 16 }} />
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Exam Type</Text>
                <TouchableOpacity onPress={() => setShowExamTypeDropdown(!showExamTypeDropdown)} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: formData.exam_type ? colors.text : colors.textLight }}>{formData.exam_type || 'Select type'}</Text>
                  <MaterialCommunityIcons name={showExamTypeDropdown ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textLight} />
                </TouchableOpacity>
                {showExamTypeDropdown && (
                  <View style={{ backgroundColor: colors.background, borderRadius: 6, marginTop: 8 }}>
                    {EXAM_TYPES.map((t, i) => (
                      <TouchableOpacity key={i} onPress={() => { setFormData({ ...formData, exam_type: t }); setShowExamTypeDropdown(false); }} style={{ paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: i !== EXAM_TYPES.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                        <Text style={{ color: colors.text }}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Fitness Level</Text>
                <TouchableOpacity onPress={() => setShowFitnessDropdown(!showFitnessDropdown)} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: formData.fitness_level ? colors.text : colors.textLight }}>{formData.fitness_level || 'Select level'}</Text>
                  <MaterialCommunityIcons name={showFitnessDropdown ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textLight} />
                </TouchableOpacity>
                {showFitnessDropdown && (
                  <View style={{ backgroundColor: colors.background, borderRadius: 6, marginTop: 8 }}>
                    {FITNESS_LEVELS.map((l, i) => (
                      <TouchableOpacity key={i} onPress={() => { setFormData({ ...formData, fitness_level: l }); setShowFitnessDropdown(false); }} style={{ paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: i !== FITNESS_LEVELS.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
                        <Text style={{ color: colors.text }}>{l}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Restrictions</Text>
              <TextInput placeholder="Enter restrictions" value={formData.restrictions} onChangeText={t => setFormData({ ...formData, restrictions: t })} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginBottom: 16 }} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Medical Findings</Text>
              <TextInput placeholder="Enter findings" value={formData.medical_findings} onChangeText={t => setFormData({ ...formData, medical_findings: t })} multiline numberOfLines={2} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginBottom: 16, textAlignVertical: 'top' }} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Notes</Text>
              <TextInput placeholder="Enter notes" value={formData.notes} onChangeText={t => setFormData({ ...formData, notes: t })} multiline numberOfLines={2} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginBottom: 24, textAlignVertical: 'top' }} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => setShowAddModal(false)} style={{ flex: 1, backgroundColor: colors.border, paddingVertical: 12, borderRadius: 6, alignItems: 'center' }}><Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity onPress={handleSubmit} disabled={updating} style={{ flex: 1, backgroundColor: colors.accent, paddingVertical: 12, borderRadius: 6, alignItems: 'center', opacity: updating ? 0.5 : 1 }}><Text style={{ color: 'white', fontWeight: '600' }}>{updating ? 'Saving...' : 'Save'}</Text></TouchableOpacity>
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
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary }}>Edit Exam</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Exam Date</Text>
              <TextInput placeholder="YYYY-MM-DD" value={editFormData.exam_date} onChangeText={t => setEditFormData({ ...editFormData, exam_date: t })} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginBottom: 16 }} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Exam Type</Text>
              <TextInput placeholder="Enter type" value={editFormData.exam_type} onChangeText={t => setEditFormData({ ...editFormData, exam_type: t })} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginBottom: 16 }} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Fitness Level</Text>
              <TextInput placeholder="Enter level" value={editFormData.fitness_level} onChangeText={t => setEditFormData({ ...editFormData, fitness_level: t })} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginBottom: 16 }} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Restrictions</Text>
              <TextInput placeholder="Enter restrictions" value={editFormData.restrictions} onChangeText={t => setEditFormData({ ...editFormData, restrictions: t })} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginBottom: 16 }} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Medical Findings</Text>
              <TextInput placeholder="Enter findings" value={editFormData.medical_findings} onChangeText={t => setEditFormData({ ...editFormData, medical_findings: t })} multiline numberOfLines={2} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10,color: colors.text, marginBottom: 16, textAlignVertical: 'top' }} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Notes</Text>
              <TextInput placeholder="Enter notes" value={editFormData.notes} onChangeText={t => setEditFormData({ ...editFormData, notes: t })} multiline numberOfLines={2} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginBottom: 24, textAlignVertical: 'top' }} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => setShowEditModal(false)} style={{ flex: 1, backgroundColor: colors.border, paddingVertical: 12, borderRadius: 6, alignItems: 'center' }}><Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity onPress={handleSaveEdit} disabled={updating} style={{ flex: 1, backgroundColor: colors.accent, paddingVertical: 12, borderRadius: 6, alignItems: 'center', opacity: updating ? 0.5 : 1 }}><Text style={{ color: 'white', fontWeight: '600' }}>{updating ? 'Updating...' : 'Update'}</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default ExamsListScreen;
