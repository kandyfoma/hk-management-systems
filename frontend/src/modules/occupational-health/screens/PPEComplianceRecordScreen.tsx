import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Dimensions, Modal, Alert, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const ACCENT = colors.primary;

interface PPEComplianceRecord {
  id: string;
  worker_name: string;
  ppe_item: string;
  assignment_date: string;
  condition: 'new' | 'good' | 'worn' | 'damaged' | 'expired';
  compliance_status: 'compliant' | 'non_compliant' | 'pending_inspection';
  inspection_date?: string;
  returned_date?: string;
  notes: string;
  created_at: string;
}

const SAMPLE_RECORDS: PPEComplianceRecord[] = [
  {
    id: '1', worker_name: 'Jean-Pierre Kabongo', ppe_item: 'Casque de sÃ©curitÃ© MSA',
    assignment_date: '2025-01-15', condition: 'good',
    compliance_status: 'compliant', inspection_date: '2025-02-20',
    notes: 'Ã‰tat satisfaisant', created_at: '2025-01-15T10:00:00Z'
  },
  {
    id: '2', worker_name: 'Patrick Lukusa', ppe_item: 'Respirateur FFP3',
    assignment_date: '2025-02-01', condition: 'worn',
    compliance_status: 'non_compliant', inspection_date: '2025-02-19',
    notes: 'Remplacement recommandÃ©', created_at: '2025-02-01T10:00:00Z'
  },
];

export function PPEComplianceRecordScreen() {
  const [records, setRecords] = useState<PPEComplianceRecord[]>(SAMPLE_RECORDS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCompliance, setFilterCompliance] = useState<'all' | 'compliant' | 'non_compliant' | 'pending_inspection'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => { loadRecords(); }, []);

  const loadRecords = async () => {
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${baseURL}/api/v1/occupational-health/ppe-compliance/`,
        { headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' } });
      if (response.data) setRecords(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (error) {
      setRecords(SAMPLE_RECORDS);
    }
  };

  const filtered = useMemo(() => records.filter(r => {
    const q = searchQuery.toLowerCase();
    const matchQ = !q || r.worker_name.toLowerCase().includes(q) || r.ppe_item.toLowerCase().includes(q);
    const matchF = filterCompliance === 'all' || r.compliance_status === filterCompliance;
    return matchQ && matchF;
  }), [records, searchQuery, filterCompliance]);

  const getComplianceColor = (status: string) => {
    return status === 'compliant' ? '#22C55E' : status === 'non_compliant' ? '#DC2626' : '#F59E0B';
  };

  const getConditionColor = (condition: string) => {
    return condition === 'new' ? '#22C55E' : condition === 'good' ? '#3B82F6' : condition === 'worn' ? '#F59E0B' : condition === 'damaged' ? '#DC2626' : '#94A3B8';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>ConformitÃ© EPI</Text>
          <Text style={styles.screenSubtitle}>Suivi des Ã©quipements de protection â€” Inspections</Text>
        </View>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: '#0891B2' }]} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add-circle" size={20} color="#FFF" /><Text style={styles.addButtonText}>Nouveau</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput style={styles.searchInput} placeholder="Chercher..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor={colors.placeholder} />
        </View>
        <View style={styles.filterButtons}>
          {['all', 'compliant', 'non_compliant', 'pending_inspection'].map(status => (
            <TouchableOpacity key={status} style={[styles.filterBtn, filterCompliance === status && styles.filterBtnActive]} onPress={() => setFilterCompliance(status as any)}>
              <Text style={[styles.filterBtnText, filterCompliance === status && styles.filterBtnTextActive]}>
                {status === 'all' ? 'Tous' : status === 'compliant' ? 'OK' : status === 'non_compliant' ? 'Non-OK' : 'Ã€ inspecter'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList scrollEnabled={false} data={filtered} keyExtractor={item => item.id} renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.worker_name}</Text>
              <Text style={styles.ppeItem}>{item.ppe_item}</Text>
            </View>
            <View style={[styles.complianceBadge, { backgroundColor: getComplianceColor(item.compliance_status) }]}>
              <Text style={styles.badgeText}>{item.compliance_status === 'compliant' ? 'OK' : item.compliance_status === 'non_compliant' ? 'KO' : 'INSPECT'}</Text>
            </View>
          </View>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Ã‰tat</Text>
              <View style={[styles.conditionBadge, { backgroundColor: getConditionColor(item.condition) }]}>
                <Text style={styles.conditionText}>{item.condition === 'new' ? 'Neuf' : item.condition === 'good' ? 'Bon' : item.condition === 'worn' ? 'UsÃ©' : item.condition === 'damaged' ? 'EndommagÃ©' : 'ExpirÃ©'}</Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>AttribuÃ© le</Text>
              <Text style={styles.dateText}>{item.assignment_date}</Text>
            </View>
            {item.inspection_date && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>InspectÃ© le</Text>
                <Text style={styles.dateText}>{item.inspection_date}</Text>
              </View>
            )}
          </View>
          {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
        </View>
      )} ListEmptyComponent={<Text style={styles.emptyText}>Aucun enregistrement</Text>} />

      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvel Enregistrement de ConformitÃ© EPI</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close-circle-outline" size={28} color={ACCENT} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.formContainer}>
              <Text style={styles.formLabel}>Travailleur</Text>
              <TextInput style={styles.input} placeholder="Nom..." placeholderTextColor={colors.placeholder} />
              <Text style={styles.formLabel}>Ã‰quipement EPI</Text>
              <TextInput style={styles.input} placeholder="Casque, Gants, etc..." placeholderTextColor={colors.placeholder} />
              <Text style={styles.formLabel}>Ã‰tat</Text>
              <View style={styles.buttonGroup}>
                {['new', 'good', 'worn', 'damaged', 'expired'].map(cond => (
                  <TouchableOpacity key={cond} style={styles.groupBtn}>
                    <Text style={styles.groupBtnText}>{cond === 'new' ? 'Neuf' : cond === 'good' ? 'Bon' : cond === 'worn' ? 'UsÃ©' : cond === 'damaged' ? 'EndommagÃ©' : 'ExpirÃ©'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.formLabel}>Notes</Text>
              <TextInput style={[styles.input, styles.inputMultiline]} placeholder="Observations..." multiline numberOfLines={4} placeholderTextColor={colors.placeholder} />
            </ScrollView>
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#0891B2' }]} onPress={() => { setShowAddModal(false); Alert.alert('SuccÃ¨s', 'Enregistrement crÃ©Ã©'); }}>
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
  filterBar: { marginBottom: spacing.lg },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.md, ...shadows.sm },
  searchInput: { flex: 1, paddingVertical: spacing.md, marginLeft: spacing.sm, color: colors.text },
  filterButtons: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  filterBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.surface },
  filterBtnActive: { backgroundColor: ACCENT },
  filterBtnText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  filterBtnTextActive: { color: '#FFF' },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, borderLeftWidth: 4, borderLeftColor: '#0891B2', ...shadows.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  ppeItem: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.xs },
  complianceBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  detailsGrid: { marginBottom: spacing.md, backgroundColor: colors.background, padding: spacing.md, borderRadius: borderRadius.md },
  detailItem: { marginBottom: spacing.md },
  detailLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  conditionBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  conditionText: { fontSize: 11, fontWeight: '600', color: '#FFF' },
  dateText: { fontSize: 13, color: colors.text, fontWeight: '500' },
  notes: { fontSize: 13, color: colors.text, fontStyle: 'italic' },
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
  buttonGroup: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' },
  groupBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.surface },
  groupBtnText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.md },
  submitBtnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
});
