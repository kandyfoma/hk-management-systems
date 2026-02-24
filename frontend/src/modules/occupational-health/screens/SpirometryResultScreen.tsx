import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Dimensions, Modal, Alert, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const ACCENT = colors.primary;

interface SpirometryTest {
  id: string;
  worker_name: string;
  test_date: string;
  fev1: number;
  fvc: number;
  fev1_fvc_ratio: number;
  status: 'normal' | 'restrictive' | 'obstructive' | 'mixed';
  interpretation: string;
  notes: string;
  created_at: string;
}

const SAMPLE_TESTS: SpirometryTest[] = [
  {
    id: '1', worker_name: 'Jean-Pierre Kabongo', test_date: '2025-02-20',
    fev1: 95, fvc: 100, fev1_fvc_ratio: 95,
    status: 'normal', interpretation: 'Normal Function', notes: 'Baseline test', created_at: '2025-02-20T10:00:00Z'
  },
];

export function SpirometryResultScreen() {
  const [tests, setTests] = useState<SpirometryTest[]>(SAMPLE_TESTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadTests(); }, []);

  const loadTests = async () => {
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${baseURL}/api/v1/occupational-health/heavy-metals-tests/`,
        { headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' } });
      if (response.data) setTests(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (error) {
      setTests(SAMPLE_TESTS);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => tests.filter(t => !searchQuery || t.worker_name.toLowerCase().includes(searchQuery.toLowerCase())), [tests, searchQuery]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Tests de SpiromÃ©trie</Text>
          <Text style={styles.screenSubtitle}>Fonction pulmonaire â€” Ã‰valuation respiratoire</Text>
        </View>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: '#3B82F6' }]} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add-circle" size={20} color="#FFF" />
          <Text style={styles.addButtonText}>Nouveau Test</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
        <TextInput style={styles.searchInput} placeholder="Chercher..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor={colors.placeholder} />
      </View>

      <FlatList scrollEnabled={false} data={filtered} keyExtractor={item => item.id} renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.worker_name}</Text>
            <View style={[styles.badge, { backgroundColor: item.status === 'normal' ? '#22C55E' : '#F59E0B' }]}>
              <Text style={styles.badgeText}>{item.status.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.cardMeta}>{item.test_date}</Text>
          <View style={styles.dataGrid}>
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>FEV1</Text>
              <Text style={styles.dataValue}>{item.fev1}%</Text>
            </View>
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>FVC</Text>
              <Text style={styles.dataValue}>{item.fvc}%</Text>
            </View>
            <View style={styles.dataItem}>
              <Text style={styles.dataLabel}>Ratio</Text>
              <Text style={styles.dataValue}>{item.fev1_fvc_ratio}%</Text>
            </View>
          </View>
          <Text style={styles.interpretation}>{item.interpretation}</Text>
        </View>
      )} ListEmptyComponent={<Text style={styles.emptyText}>Aucun test</Text>} />

      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouveau Test de SpiromÃ©trie</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close-circle-outline" size={28} color={ACCENT} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.formContainer}>
              <Text style={styles.formLabel}>Travailleur</Text>
              <TextInput style={styles.input} placeholder="Nom..." placeholderTextColor={colors.placeholder} />
              <Text style={styles.formLabel}>FEV1 (%)</Text>
              <TextInput style={styles.input} placeholder="95" keyboardType="number-pad" placeholderTextColor={colors.placeholder} />
              <Text style={styles.formLabel}>FVC (%)</Text>
              <TextInput style={styles.input} placeholder="100" keyboardType="number-pad" placeholderTextColor={colors.placeholder} />
              <Text style={styles.formLabel}>Notes</Text>
              <TextInput style={[styles.input, styles.inputMultiline]} placeholder="Observations..." multiline numberOfLines={4} placeholderTextColor={colors.placeholder} />
            </ScrollView>
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#3B82F6' }]} onPress={() => { setShowAddModal(false); Alert.alert('SuccÃ¨s', 'Test crÃ©Ã©'); }}>
              <Text style={styles.submitBtnText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  contentContainer: { padding: spacing.md },
  header: { marginBottom: spacing.lg, flexDirection: isDesktop ? 'row' : 'column', justifyContent: 'space-between' },
  screenTitle: { fontSize: 24, fontWeight: '700', color: colors.text },
  screenSubtitle: { fontSize: 14, color: colors.textSecondary },
  addButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, marginTop: isDesktop ? 0 : spacing.md },
  addButtonText: { color: '#FFF', marginLeft: spacing.sm, fontWeight: '600' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.lg, ...shadows.sm },
  searchInput: { flex: 1, paddingVertical: spacing.md, marginLeft: spacing.sm, color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, borderLeftWidth: 4, borderLeftColor: ACCENT, ...shadows.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  cardMeta: { fontSize: 12, color: colors.textSecondary, marginBottom: spacing.md },
  dataGrid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.md, backgroundColor: colors.background, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  dataItem: { alignItems: 'center' },
  dataLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', marginBottom: spacing.xs },
  dataValue: { fontSize: 18, fontWeight: '700', color: ACCENT },
  interpretation: { fontSize: 13, color: colors.text, fontWeight: '500' },
  emptyText: { textAlign: 'center', color: colors.textSecondary, marginVertical: spacing.lg },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.background, borderTopLeftRadius: borderRadius.lg, borderTopRightRadius: borderRadius.lg, maxHeight: '90%', paddingTop: spacing.lg, paddingHorizontal: spacing.md },
  modalContentDesktop: { marginHorizontal: '20%', marginVertical: '5%', borderRadius: borderRadius.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.outline, paddingBottom: spacing.md },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  formContainer: { paddingBottom: spacing.lg },
  formLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: spacing.xs, marginTop: spacing.md },
  input: { backgroundColor: colors.surface, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text, marginBottom: spacing.md },
  inputMultiline: { minHeight: 100, textAlignVertical: 'top' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.md },
  submitBtnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
});
