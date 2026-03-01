import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Dimensions, Modal, Alert, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../../../services/ApiService';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { WorkerSelectDropdown, Worker } from '../components/WorkerSelectDropdown';
import { useSimpleToast } from '../../../hooks/useSimpleToast';
import { SimpleToastNotification } from '../../../components/SimpleToastNotification';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const ACCENT = colors.primary;

interface ErgonomicAssessment {
  id: string;
  worker_name: string;
  assessment_date: string;
  workstation_type: string;
  posture_score: number;
  repetitive_tasks: boolean;
  msk_risk_level: 'low' | 'medium' | 'high';
  recommendations: string;
  notes: string;
  created_at: string;
}

const SAMPLE_ASSESSMENTS: ErgonomicAssessment[] = [
  {
    id: '1', worker_name: 'Jean-Pierre Kabongo', assessment_date: '2025-02-20',
    workstation_type: 'Desk', posture_score: 85, repetitive_tasks: false,
    msk_risk_level: 'low', recommendations: 'Position bien maintenue', notes: 'Poste optimal',
    created_at: '2025-02-20T10:00:00Z'
  },
];

export function ErgonomicAssessmentScreen() {
  const { toastMsg, showToast } = useSimpleToast();
  const [assessments, setAssessments] = useState<ErgonomicAssessment[]>(SAMPLE_ASSESSMENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => { loadAssessments(); }, []);

  const loadAssessments = async () => {
    try {
      const api = ApiService.getInstance();
      const response = await api.get('/occupational-health/ergonomic-assessments/');
      if (response.success && response.data) {
        const data = Array.isArray(response.data) ? response.data : response.data.results || [];
        setAssessments(data);
      }
    } catch (error) {
      console.error('Error loading ergonomic assessments:', error);
    }
  };

  const filtered = useMemo(() => assessments.filter(a => !searchQuery || a.worker_name.toLowerCase().includes(searchQuery.toLowerCase())), [assessments, searchQuery]);

  const getRiskColor = (level: string) => {
    return level === 'low' ? '#22C55E' : level === 'medium' ? '#F59E0B' : '#DC2626';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View><Text style={styles.screenTitle}>Ã‰valuations Ergonomiques</Text><Text style={styles.screenSubtitle}>Analyse du poste de travail â€” PrÃ©vention TMS</Text></View>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: '#059669' }]} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add-circle" size={20} color="#FFF" /><Text style={styles.addButtonText}>Nouvelle</Text>
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
            <View style={[styles.riskBadge, { backgroundColor: getRiskColor(item.msk_risk_level) }]}>
              <Text style={styles.badgeText}>{item.msk_risk_level === 'low' ? 'FAIBLE' : item.msk_risk_level === 'medium' ? 'MOYEN' : 'Ã‰LEVÃ‰'}</Text>
            </View>
          </View>
          <Text style={styles.cardMeta}>{item.assessment_date}</Text>
          <View style={styles.scoreContainer}>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>Score Posture</Text>
              <View style={styles.scoreBar}>
                <View style={[styles.scoreBarFill, { width: `${item.posture_score}%`, backgroundColor: getRiskColor(item.posture_score > 80 ? 'low' : item.posture_score > 60 ? 'medium' : 'high') }]} />
              </View>
              <Text style={styles.scoreValue}>{item.posture_score}/100</Text>
            </View>
          </View>
          <Text style={styles.recomm}>{item.recommendations}</Text>
        </View>
      )} ListEmptyComponent={<Text style={styles.emptyText}>Aucune Ã©valuation</Text>} />

      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle Ã‰valuation Ergonomique</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close-circle-outline" size={28} color={ACCENT} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.formContainer}>
              <Text style={styles.formLabel}>Travailleur</Text>
              <TextInput style={styles.input} placeholder="Nom..." placeholderTextColor={colors.placeholder} />
              <Text style={styles.formLabel}>Type de Poste</Text>
              <TextInput style={styles.input} placeholder="Bureau, Usine, etc..." placeholderTextColor={colors.placeholder} />
              <Text style={styles.formLabel}>Score Posture (0-100)</Text>
              <TextInput style={styles.input} placeholder="85" keyboardType="number-pad" placeholderTextColor={colors.placeholder} />
              <Text style={styles.formLabel}>Recommandations</Text>
              <TextInput style={[styles.input, styles.inputMultiline]} placeholder="Actions Ã  prendre..." multiline numberOfLines={4} placeholderTextColor={colors.placeholder} />
            </ScrollView>
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#059669' }]} onPress={() => { setShowAddModal(false); showToast('Évaluation créée', 'success'); }}>
              <Text style={styles.submitBtnText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <SimpleToastNotification message={toastMsg} />
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
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, borderLeftWidth: 4, borderLeftColor: '#059669', ...shadows.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  riskBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  cardMeta: { fontSize: 12, color: colors.textSecondary, marginBottom: spacing.md },
  scoreContainer: { marginBottom: spacing.md },
  scoreItem: { marginBottom: spacing.md },
  scoreLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  scoreBar: { height: 8, backgroundColor: colors.background, borderRadius: borderRadius.sm, overflow: 'hidden', marginBottom: spacing.xs },
  scoreBarFill: { height: '100%' },
  scoreValue: { fontSize: 13, fontWeight: '600', color: ACCENT },
  recomm: { fontSize: 13, color: colors.text, fontStyle: 'italic' },
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
