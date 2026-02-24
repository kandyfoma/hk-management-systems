import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Dimensions, Modal, Alert, FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const ACCENT = colors.primary;

interface AudiometryTest {
  id: string;
  worker_id?: string;
  worker_name: string;
  test_date: string;
  frequency_hz: number;
  hearing_threshold_db: number;
  ear: 'left' | 'right' | 'both';
  status: 'normal' | 'warning' | 'critical';
  classification: string;
  notes: string;
  created_at: string;
}

const SAMPLE_TESTS: AudiometryTest[] = [
  {
    id: '1', worker_name: 'Jean-Pierre Kabongo', test_date: '2025-02-20',
    frequency_hz: 1000, hearing_threshold_db: 15, ear: 'both',
    status: 'normal', classification: 'Normal Hearing', notes: 'Baseline test',
    created_at: '2025-02-20T10:00:00Z'
  },
  {
    id: '2', worker_name: 'Patrick Lukusa', test_date: '2025-02-18',
    frequency_hz: 4000, hearing_threshold_db: 35, ear: 'both',
    status: 'warning', classification: 'Mild High-Frequency Loss', notes: 'Occupational exposure',
    created_at: '2025-02-18T14:30:00Z'
  },
];

export function AudiometryResultScreen() {
  const [tests, setTests] = useState<AudiometryTest[]>(SAMPLE_TESTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'normal' | 'warning' | 'critical'>('all');
  const [selectedTest, setSelectedTest] = useState<AudiometryTest | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    worker_name: '',
    frequency_hz: '1000',
    hearing_threshold_db: '20',
    ear: 'both' as 'left' | 'right' | 'both',
    status: 'normal' as 'normal' | 'warning' | 'critical',
    notes: '',
  });

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const token = await AsyncStorage.getItem('auth_token');
      
      const response = await axios.get(
        `${baseURL}/api/v1/occupational-health/heavy-metals-tests/`,
        { headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' } }
      );
      
      if (response.data) {
        const testsList = Array.isArray(response.data) ? response.data : response.data.results || [];
        setTests(testsList);
      }
    } catch (error) {
      console.warn('Failed to fetch tests from API, using sample data:', error);
      setTests(SAMPLE_TESTS);
    } finally {
      setLoading(false);
    }
  };

  const saveTest = async () => {
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const token = await AsyncStorage.getItem('auth_token');
      
      const testData = {
        worker_name: formData.worker_name,
        frequency_hz: parseInt(formData.frequency_hz),
        hearing_threshold_db: parseInt(formData.hearing_threshold_db),
        ear: formData.ear,
        status: formData.status,
        notes: formData.notes,
        test_date: new Date().toISOString().split('T')[0],
      };
      
      await axios.post(
        `${baseURL}/api/v1/occupational-health/heavy-metals-tests/`,
        testData,
        { headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' } }
      );
      
      loadTests();
      setShowAddModal(false);
      setFormData({ worker_name: '', frequency_hz: '1000', hearing_threshold_db: '20', ear: 'both', status: 'normal', notes: '' });
      Alert.alert('SuccÃ¨s', 'Test d\'audiomÃ©trie crÃ©Ã©');
    } catch (error) {
      console.error('Failed to save test:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le test');
    }
  };

  const deleteTest = async (testId: string) => {
    Alert.alert('Confirmation', 'Supprimer ce test?', [
      { text: 'Annuler' },
      {
        text: 'Supprimer', onPress: async () => {
          try {
            const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
            const token = await AsyncStorage.getItem('auth_token');
            await axios.delete(`${baseURL}/api/v1/occupational-health/heavy-metals-tests/${testId}/`,
              { headers: { Authorization: `Token ${token}` } });
            loadTests();
            Alert.alert('SuccÃ¨s', 'Test supprimÃ©');
          } catch (error) {
            Alert.alert('Erreur', 'Impossible de supprimer le test');
          }
        }
      }
    ]);
  };

  const filtered = useMemo(() => {
    return tests.filter(t => {
      const q = searchQuery.toLowerCase();
      const matchQ = !q || t.worker_name.toLowerCase().includes(q);
      const matchS = filterStatus === 'all' || t.status === filterStatus;
      return matchQ && matchS;
    });
  }, [tests, searchQuery, filterStatus]);

  const TestCard = ({ test }: { test: AudiometryTest }) => {
    const statusColor = { normal: '#22C55E', warning: '#F59E0B', critical: '#DC2626' }[test.status];
    return (
      <TouchableOpacity
        style={[styles.card, { borderLeftWidth: 4, borderLeftColor: statusColor }]}
        onPress={() => { setSelectedTest(test); setShowDetail(true); }}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{test.worker_name}</Text>
          <View style={[styles.badge, { backgroundColor: statusColor }]}>
            <Text style={styles.badgeText}>{test.status.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.cardMeta}>{test.test_date} â€¢ {test.frequency_hz} Hz â€¢ {test.ear}</Text>
        <Text style={styles.cardValue}>{test.hearing_threshold_db} dB Threshold</Text>
        <Text style={styles.cardNote}>{test.classification}</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => deleteTest(test.id)} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Tests d'AudiomÃ©trie</Text>
          <Text style={styles.screenSubtitle}>Ã‰valuation de l'audition â€” Protection auditive</Text>
        </View>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: '#3B82F6' }]} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add-circle" size={20} color="#FFF" />
          <Text style={styles.addButtonText}>Nouveau Test</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput style={styles.searchInput} placeholder="Chercher un travailleur..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor={colors.placeholder} />
        </View>
        <View style={styles.filterButtons}>
          {['all', 'normal', 'warning', 'critical'].map(status => (
            <TouchableOpacity
              key={status}
              style={[styles.filterBtn, filterStatus === status && styles.filterBtnActive]}
              onPress={() => setFilterStatus(status as any)}
            >
              <Text style={[styles.filterBtnText, filterStatus === status && styles.filterBtnTextActive]}>
                {status === 'all' ? 'Tous' : status === 'normal' ? 'Normal' : status === 'warning' ? 'Attention' : 'Critique'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : (
        <FlatList
          scrollEnabled={false}
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <TestCard test={item} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Aucun test trouvÃ©</Text>}
        />
      )}

      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouveau Test d'AudiomÃ©trie</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close-circle-outline" size={28} color={ACCENT} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.formContainer}>
              <Text style={styles.formLabel}>Nom du Travailleur</Text>
              <TextInput style={styles.input} placeholder="Jean-Pierre Kabongo" value={formData.worker_name} onChangeText={(val) => setFormData({...formData, worker_name: val})} />
              
              <Text style={styles.formLabel}>FrÃ©quence (Hz)</Text>
              <TextInput style={styles.input} placeholder="1000" value={formData.frequency_hz} onChangeText={(val) => setFormData({...formData, frequency_hz: val})} keyboardType="number-pad" />
              
              <Text style={styles.formLabel}>Seuil d'Audition (dB)</Text>
              <TextInput style={styles.input} placeholder="20" value={formData.hearing_threshold_db} onChangeText={(val) => setFormData({...formData, hearing_threshold_db: val})} keyboardType="number-pad" />
              
              <Text style={styles.formLabel}>Oreille</Text>
              <View style={styles.buttonGroup}>
                {(['left', 'right', 'both'] as const).map(ear => (
                  <TouchableOpacity
                    key={ear}
                    style={[styles.groupBtn, formData.ear === ear && styles.groupBtnActive]}
                    onPress={() => setFormData({...formData, ear})}
                  >
                    <Text style={[styles.groupBtnText, formData.ear === ear && styles.groupBtnTextActive]}>
                      {ear === 'left' ? 'Gauche' : ear === 'right' ? 'Droite' : 'BilatÃ©ral'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>Statut</Text>
              <View style={styles.buttonGroup}>
                {(['normal', 'warning', 'critical'] as const).map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.groupBtn, formData.status === status && styles.groupBtnActive]}
                    onPress={() => setFormData({...formData, status})}
                  >
                    <Text style={[styles.groupBtnText, formData.status === status && styles.groupBtnTextActive]}>
                      {status === 'normal' ? 'Normal' : status === 'warning' ? 'Attention' : 'Critique'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>Notes</Text>
              <TextInput style={[styles.input, styles.inputMultiline]} placeholder="Observations..." value={formData.notes} onChangeText={(val) => setFormData({...formData, notes: val})} multiline numberOfLines={4} />
            </ScrollView>
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#3B82F6' }]} onPress={saveTest}>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              <Text style={styles.submitBtnText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showDetail} animationType="fade" transparent onRequestClose={() => setShowDetail(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>DÃ©tail du Test</Text>
              <TouchableOpacity onPress={() => setShowDetail(false)}>
                <Ionicons name="close-circle-outline" size={28} color={ACCENT} />
              </TouchableOpacity>
            </View>
            {selectedTest && (
              <ScrollView style={styles.detailContainer}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Travailleur</Text>
                  <Text style={styles.detailValue}>{selectedTest.worker_name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>{selectedTest.test_date}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>FrÃ©quence</Text>
                  <Text style={styles.detailValue}>{selectedTest.frequency_hz} Hz</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Seuil</Text>
                  <Text style={styles.detailValue}>{selectedTest.hearing_threshold_db} dB</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Oreille</Text>
                  <Text style={styles.detailValue}>{selectedTest.ear === 'left' ? 'Gauche' : selectedTest.ear === 'right' ? 'Droite' : 'BilatÃ©ral'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Statut</Text>
                  <Text style={[styles.detailValue, { color: { normal: '#22C55E', warning: '#F59E0B', critical: '#DC2626' }[selectedTest.status] }]}>
                    {selectedTest.status === 'normal' ? 'Normal' : selectedTest.status === 'warning' ? 'Attention' : 'Critique'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Classification</Text>
                  <Text style={styles.detailValue}>{selectedTest.classification}</Text>
                </View>
                {selectedTest.notes && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Notes</Text>
                    <Text style={styles.detailValue}>{selectedTest.notes}</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  contentContainer: { padding: spacing.md, paddingBottom: spacing.lg },
  header: { marginBottom: spacing.lg, flexDirection: isDesktop ? 'row' : 'column', justifyContent: 'space-between', alignItems: isDesktop ? 'center' : 'flex-start' },
  screenTitle: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  screenSubtitle: { fontSize: 14, color: colors.textSecondary },
  addButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, marginTop: isDesktop ? 0 : spacing.md },
  addButtonText: { color: '#FFF', marginLeft: spacing.sm, fontWeight: '600' },
  filterBar: { marginBottom: spacing.lg },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.md, ...shadows.sm },
  searchInput: { flex: 1, paddingVertical: spacing.md, marginLeft: spacing.sm, color: colors.text, fontSize: 14 },
  filterButtons: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  filterBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.surface },
  filterBtnActive: { backgroundColor: ACCENT },
  filterBtnText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  filterBtnTextActive: { color: '#FFF' },
  loadingContainer: { padding: spacing.lg, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: colors.textSecondary },
  emptyText: { textAlign: 'center', color: colors.textSecondary, marginVertical: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, ...shadows.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  cardMeta: { fontSize: 12, color: colors.textSecondary, marginBottom: spacing.xs },
  cardValue: { fontSize: 18, fontWeight: '700', color: ACCENT, marginBottom: spacing.xs },
  cardNote: { fontSize: 13, color: colors.text, marginBottom: spacing.sm },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  deleteBtn: { padding: spacing.sm, backgroundColor: '#FEE', borderRadius: borderRadius.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.background, borderTopLeftRadius: borderRadius.lg, borderTopRightRadius: borderRadius.lg, maxHeight: '90%', paddingTop: spacing.lg, paddingHorizontal: spacing.md },
  modalContentDesktop: { marginHorizontal: '20%', marginVertical: '5%', borderRadius: borderRadius.lg, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.outline, paddingBottom: spacing.md },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  formContainer: { paddingBottom: spacing.lg },
  formLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: spacing.xs, marginTop: spacing.md },
  input: { backgroundColor: colors.surface, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text, fontSize: 14, marginBottom: spacing.md },
  inputMultiline: { minHeight: 100, paddingTop: spacing.sm, textAlignVertical: 'top' },
  buttonGroup: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  groupBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.surface, alignItems: 'center' },
  groupBtnActive: { backgroundColor: ACCENT },
  groupBtnText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  groupBtnTextActive: { color: '#FFF' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.md },
  submitBtnText: { color: '#FFF', marginLeft: spacing.sm, fontWeight: '600', fontSize: 16 },
  detailContainer: { paddingVertical: spacing.lg },
  detailRow: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outline },
  detailLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  detailValue: { fontSize: 16, fontWeight: '500', color: colors.text },
});
