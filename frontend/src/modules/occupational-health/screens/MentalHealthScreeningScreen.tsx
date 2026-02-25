import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Dimensions, Modal, Alert, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../../../services/ApiService';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { WorkerSelectDropdown, Worker } from '../components/WorkerSelectDropdown';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const ACCENT = colors.primary;

interface MentalHealthScreening {
  id: string;
  worker_name: string;
  screening_date: string;
  stress_score: number;
  burnout_risk: 'low' | 'moderate' | 'high';
  depression_screening: 'negative' | 'positive';
  anxiety_level: 'normal' | 'elevated' | 'high';
  recommendations: string;
  notes: string;
  created_at: string;
}

const SAMPLE_SCREENINGS: MentalHealthScreening[] = [
  {
    id: '1', worker_name: 'Jean-Pierre Kabongo', screening_date: '2025-02-20',
    stress_score: 35, burnout_risk: 'low', depression_screening: 'negative',
    anxiety_level: 'normal', recommendations: 'Suivi rÃ©gulier', notes: 'Ã‰tat satisfaisant',
    created_at: '2025-02-20T10:00:00Z'
  },
];

export function MentalHealthScreeningScreen() {
  const [screenings, setScreenings] = useState<MentalHealthScreening[]>(SAMPLE_SCREENINGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => { loadScreenings(); }, []);

  const loadScreenings = async () => {
    try {
      const api = ApiService.getInstance();
      const response = await api.get('/occupational-health/mental-health-screening/');
      if (response.success && response.data) {
        const data = Array.isArray(response.data) ? response.data : response.data.results || [];
        setScreenings(data);
      }
    } catch (error) {
      console.error('Error loading mental health screenings:', error);
    }
  };

  const filtered = useMemo(() => screenings.filter(s => !searchQuery || s.worker_name.toLowerCase().includes(searchQuery.toLowerCase())), [screenings, searchQuery]);

  const getBurnoutColor = (risk: string) => {
    return risk === 'low' ? '#22C55E' : risk === 'moderate' ? '#F59E0B' : '#DC2626';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View><Text style={styles.screenTitle}>SantÃ© Mentale</Text><Text style={styles.screenSubtitle}>DÃ©pistage du stress et burnout</Text></View>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: '#EC4899' }]} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add-circle" size={20} color="#FFF" /><Text style={styles.addButtonText}>Nouveau</Text>
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
            <View style={[styles.burnoutBadge, { backgroundColor: getBurnoutColor(item.burnout_risk) }]}>
              <Text style={styles.badgeText}>{item.burnout_risk === 'low' ? 'FAIBLE' : item.burnout_risk === 'moderate' ? 'MOYEN' : 'Ã‰LEVÃ‰'}</Text>
            </View>
          </View>
          <Text style={styles.cardMeta}>{item.screening_date}</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Stress</Text>
              <View style={styles.scoreBar}>
                <View style={[styles.scoreBarFill, { width: `${Math.min(item.stress_score, 100)}%`, backgroundColor: item.stress_score > 70 ? '#DC2626' : item.stress_score > 40 ? '#F59E0B' : '#22C55E' }]} />
              </View>
              <Text style={styles.scoreVal}>{item.stress_score}/100</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>AnxiÃ©tÃ©</Text>
              <Text style={styles.anxietyBadge}>{item.anxiety_level === 'normal' ? 'Normal' : item.anxiety_level === 'elevated' ? 'Ã‰levÃ©e' : 'Haute'}</Text>
            </View>
          </View>
          <Text style={styles.depr}>DÃ©pression: {item.depression_screening === 'negative' ? 'âœ“ NÃ©gatif' : 'âš  Positif'}</Text>
        </View>
      )} ListEmptyComponent={<Text style={styles.emptyText}>Aucun dÃ©pistage</Text>} />

      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouveau DÃ©pistage</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close-circle-outline" size={28} color={ACCENT} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.formContainer}>
              <Text style={styles.formLabel}>Travailleur</Text>
              <TextInput style={styles.input} placeholder="Nom..." placeholderTextColor={colors.placeholder} />
              <Text style={styles.formLabel}>Score de Stress (0-100)</Text>
              <TextInput style={styles.input} placeholder="35" keyboardType="number-pad" placeholderTextColor={colors.placeholder} />
              <Text style={styles.formLabel}>Risque de Burnout</Text>
              <View style={styles.buttonGroup}>
                {['low', 'moderate', 'high'].map(risk => (
                  <TouchableOpacity key={risk} style={styles.groupBtn}>
                    <Text style={styles.groupBtnText}>{risk === 'low' ? 'Faible' : risk === 'moderate' ? 'Moyen' : 'Ã‰levÃ©'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.formLabel}>Recommandations</Text>
              <TextInput style={[styles.input, styles.inputMultiline]} placeholder="Actions..." multiline numberOfLines={4} placeholderTextColor={colors.placeholder} />
            </ScrollView>
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#EC4899' }]} onPress={() => { setShowAddModal(false); Alert.alert('SuccÃ¨s', 'DÃ©pistage crÃ©Ã©'); }}>
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
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, borderLeftWidth: 4, borderLeftColor: '#EC4899', ...shadows.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  burnoutBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  cardMeta: { fontSize: 12, color: colors.textSecondary, marginBottom: spacing.md },
  metricsGrid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  metricItem: { flex: 1 },
  metricLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  scoreBar: { height: 8, backgroundColor: colors.background, borderRadius: borderRadius.sm, overflow: 'hidden', marginBottom: spacing.xs },
  scoreBarFill: { height: '100%' },
  scoreVal: { fontSize: 12, fontWeight: '600', color: ACCENT },
  anxietyBadge: { fontSize: 13, fontWeight: '600', color: ACCENT, marginTop: spacing.xs },
  depr: { fontSize: 13, color: colors.text },
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
  buttonGroup: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  groupBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.surface, alignItems: 'center' },
  groupBtnText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.md },
  submitBtnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
});
