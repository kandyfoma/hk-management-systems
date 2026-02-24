import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Dimensions, Modal, Alert, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const ACCENT = colors.primary;

interface WorkerRiskProfile {
  id: string;
  worker_name: string;
  health_risk_score: number;
  exposure_risk_score: number;
  compliance_risk_score: number;
  overall_risk_level: 'low' | 'medium' | 'high' | 'critical';
  calculated_by_system: boolean;
  last_updated: string;
  recommendations: string;
  created_at: string;
}

const SAMPLE_PROFILES: WorkerRiskProfile[] = [
  {
    id: '1', worker_name: 'Jean-Pierre Kabongo',
    health_risk_score: 30, exposure_risk_score: 45, compliance_risk_score: 20,
    overall_risk_level: 'low', calculated_by_system: true,
    last_updated: '2025-02-20', recommendations: 'Suivi annuel', created_at: '2025-02-20T10:00:00Z'
  },
  {
    id: '2', worker_name: 'Patrick Lukusa',
    health_risk_score: 60, exposure_risk_score: 75, compliance_risk_score: 50,
    overall_risk_level: 'high', calculated_by_system: true,
    last_updated: '2025-02-20', recommendations: 'Suivi trimestriel requis', created_at: '2025-02-20T10:00:00Z'
  },
];

export function WorkerRiskProfileScreen() {
  const [profiles, setProfiles] = useState<WorkerRiskProfile[]>(SAMPLE_PROFILES);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  const [selectedProfile, setSelectedProfile] = useState<WorkerRiskProfile | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => { loadProfiles(); }, []);

  const loadProfiles = async () => {
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${baseURL}/api/v1/occupational-health/worker-risk-profiles/`,
        { headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' } });
      if (response.data) setProfiles(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (error) {
      setProfiles(SAMPLE_PROFILES);
    }
  };

  const filtered = useMemo(() => profiles.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchQ = !q || p.worker_name.toLowerCase().includes(q);
    const matchF = filterRisk === 'all' || p.overall_risk_level === filterRisk;
    return matchQ && matchF;
  }), [profiles, searchQuery, filterRisk]);

  const getRiskColor = (level: string) => {
    return level === 'low' ? '#22C55E' : level === 'medium' ? '#F59E0B' : level === 'high' ? '#EF4444' : '#DC2626';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Profils de Risque</Text>
          <Text style={styles.screenSubtitle}>Score de risque par travailleur â€” Surveillance ciblÃ©e</Text>
        </View>
      </View>

      <View style={styles.filterBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput style={styles.searchInput} placeholder="Chercher..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor={colors.placeholder} />
        </View>
        <View style={styles.filterButtons}>
          {['all', 'low', 'medium', 'high', 'critical'].map(risk => (
            <TouchableOpacity key={risk} style={[styles.filterBtn, filterRisk === risk && styles.filterBtnActive]} onPress={() => setFilterRisk(risk as any)}>
              <Text style={[styles.filterBtnText, filterRisk === risk && styles.filterBtnTextActive]}>
                {risk === 'all' ? 'Tous' : risk === 'low' ? 'Faible' : risk === 'medium' ? 'Moyen' : risk === 'high' ? 'Ã‰levÃ©' : 'Critique'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList scrollEnabled={false} data={filtered} keyExtractor={item => item.id} renderItem={({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => { setSelectedProfile(item); setShowDetail(true); }}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.worker_name}</Text>
            <View style={[styles.riskLevel, { backgroundColor: getRiskColor(item.overall_risk_level) }]}>
              <Text style={styles.riskLevelText}>{item.overall_risk_level === 'low' ? 'FAIBLE' : item.overall_risk_level === 'medium' ? 'MOYEN' : item.overall_risk_level === 'high' ? 'Ã‰LEVÃ‰' : 'CRITIQUE'}</Text>
            </View>
          </View>
          <View style={styles.scoresGrid}>
            <View style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>SantÃ©</Text>
              <View style={styles.scoreRing}>
                <Text style={styles.scoreNumber}>{item.health_risk_score}</Text>
              </View>
            </View>
            <View style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>Exposition</Text>
              <View style={styles.scoreRing}>
                <Text style={styles.scoreNumber}>{item.exposure_risk_score}</Text>
              </View>
            </View>
            <View style={styles.scoreCard}>
              <Text style={styles.scoreLabel}>ConformitÃ©</Text>
              <View style={styles.scoreRing}>
                <Text style={styles.scoreNumber}>{item.compliance_risk_score}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.recomm}>{item.recommendations}</Text>
        </TouchableOpacity>
      )} ListEmptyComponent={<Text style={styles.emptyText}>Aucun profil</Text>} />

      <Modal visible={showDetail} animationType="fade" transparent onRequestClose={() => setShowDetail(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>DÃ©tail du Profil</Text>
              <TouchableOpacity onPress={() => setShowDetail(false)}>
                <Ionicons name="close-circle-outline" size={28} color={ACCENT} />
              </TouchableOpacity>
            </View>
            {selectedProfile && (
              <ScrollView style={styles.detailContainer}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Travailleur</Text>
                  <Text style={styles.detailValue}>{selectedProfile.worker_name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Niveau de Risque Global</Text>
                  <View style={[styles.badge, { backgroundColor: getRiskColor(selectedProfile.overall_risk_level) }]}>
                    <Text style={styles.badgeText}>{selectedProfile.overall_risk_level.toUpperCase()}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Score SantÃ©</Text>
                  <Text style={styles.detailValue}>{selectedProfile.health_risk_score}/100</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Score Exposition</Text>
                  <Text style={styles.detailValue}>{selectedProfile.exposure_risk_score}/100</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Score ConformitÃ©</Text>
                  <Text style={styles.detailValue}>{selectedProfile.compliance_risk_score}/100</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>DerniÃ¨re Mise Ã  Jour</Text>
                  <Text style={styles.detailValue}>{selectedProfile.last_updated}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Recommandations</Text>
                  <Text style={styles.detailValue}>{selectedProfile.recommendations}</Text>
                </View>
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
  contentContainer: { padding: spacing.md },
  header: { marginBottom: spacing.lg },
  screenTitle: { fontSize: 24, fontWeight: '700', color: colors.text },
  screenSubtitle: { fontSize: 14, color: colors.textSecondary },
  filterBar: { marginBottom: spacing.lg },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.md, ...shadows.sm },
  searchInput: { flex: 1, paddingVertical: spacing.md, marginLeft: spacing.sm, color: colors.text },
  filterButtons: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  filterBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.surface },
  filterBtnActive: { backgroundColor: ACCENT },
  filterBtnText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  filterBtnTextActive: { color: '#FFF' },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, borderLeftWidth: 4, borderLeftColor: ACCENT, ...shadows.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1 },
  riskLevel: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  riskLevelText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  scoresGrid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.md },
  scoreCard: { alignItems: 'center' },
  scoreLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  scoreRing: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: ACCENT },
  scoreNumber: { fontSize: 20, fontWeight: '700', color: ACCENT },
  recomm: { fontSize: 13, color: colors.text, fontStyle: 'italic' },
  emptyText: { textAlign: 'center', color: colors.textSecondary, marginVertical: spacing.lg },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.background, borderTopLeftRadius: borderRadius.lg, borderTopRightRadius: borderRadius.lg, maxHeight: '90%', paddingTop: spacing.lg, paddingHorizontal: spacing.md },
  modalContentDesktop: { marginHorizontal: '20%', marginVertical: '5%', borderRadius: borderRadius.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.outline, paddingBottom: spacing.md },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  detailContainer: { paddingVertical: spacing.lg, paddingBottom: spacing.lg },
  detailRow: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outline },
  detailLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  detailValue: { fontSize: 16, fontWeight: '500', color: colors.text },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
});
