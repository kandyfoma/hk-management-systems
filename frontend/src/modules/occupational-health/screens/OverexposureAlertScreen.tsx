import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Dimensions, Modal, Alert, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const ACCENT = colors.primary;

interface OverexposureAlert {
  id: string;
  worker_name: string;
  hazard_type: string;
  exposure_level: number;
  exposure_threshold: number;
  unit_measurement: string;
  severity: 'warning' | 'critical';
  recommended_action: string;
  alert_date: string;
  status: 'open' | 'acknowledged' | 'resolved';
  created_at: string;
}

const SAMPLE_ALERTS: OverexposureAlert[] = [
  {
    id: '1', worker_name: 'Jean-Pierre Kabongo', hazard_type: 'Cobalt Dust',
    exposure_level: 0.05, exposure_threshold: 0.02, unit_measurement: 'mg/mÂ³',
    severity: 'warning', recommended_action: 'Increase ventilation and respiratory protection',
    alert_date: '2025-02-20', status: 'acknowledged', created_at: '2025-02-20T10:00:00Z'
  },
];

export function OverexposureAlertScreen() {
  const [alerts, setAlerts] = useState<OverexposureAlert[]>(SAMPLE_ALERTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'acknowledged' | 'resolved'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<OverexposureAlert | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => { loadAlerts(); }, []);

  const loadAlerts = async () => {
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${baseURL}/api/v1/occupational-health/overexposure-alerts/`,
        { headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' } });
      if (response.data) setAlerts(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (error) {
      setAlerts(SAMPLE_ALERTS);
    }
  };

  const filtered = useMemo(() => alerts.filter(a => {
    const q = searchQuery.toLowerCase();
    const matchQ = !q || a.worker_name.toLowerCase().includes(q) || a.hazard_type.toLowerCase().includes(q);
    const matchF = filterStatus === 'all' || a.status === filterStatus;
    return matchQ && matchF;
  }), [alerts, searchQuery, filterStatus]);

  const updateAlertStatus = async (alertId: string, newStatus: string) => {
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const token = await AsyncStorage.getItem('auth_token');
      await axios.patch(`${baseURL}/api/v1/occupational-health/overexposure-alerts/${alertId}/`,
        { status: newStatus },
        { headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' } });
      loadAlerts();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre Ã  jour l\'alerte');
    }
  };

  const getSeverityColor = (sev: string) => {
    return sev === 'warning' ? '#F59E0B' : '#DC2626';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Alertes de Surexposition</Text>
          <Text style={styles.screenSubtitle}>Gestion des dÃ©passements de seuils â€” Actions requises</Text>
        </View>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: '#DC2626' }]} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add-circle" size={20} color="#FFF" /><Text style={styles.addButtonText}>Nouvelle</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput style={styles.searchInput} placeholder="Chercher..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor={colors.placeholder} />
        </View>
        <View style={styles.filterButtons}>
          {['all', 'open', 'acknowledged', 'resolved'].map(status => (
            <TouchableOpacity key={status} style={[styles.filterBtn, filterStatus === status && styles.filterBtnActive]} onPress={() => setFilterStatus(status as any)}>
              <Text style={[styles.filterBtnText, filterStatus === status && styles.filterBtnTextActive]}>
                {status === 'all' ? 'Tous' : status === 'open' ? 'Ouvert' : status === 'acknowledged' ? 'AccrÃ©ditÃ©' : 'RÃ©solu'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList scrollEnabled={false} data={filtered} keyExtractor={item => item.id} renderItem={({ item }) => (
        <TouchableOpacity style={[styles.card, { borderLeftColor: getSeverityColor(item.severity) }]} onPress={() => { setSelectedAlert(item); setShowDetail(true); }}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.worker_name}</Text>
              <Text style={styles.cardMeta}>{item.hazard_type}</Text>
            </View>
            <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(item.severity) }]}>
              <Text style={styles.badgeText}>{item.severity === 'warning' ? 'ALERTE' : 'CRITIQUE'}</Text>
            </View>
          </View>
          <View style={styles.exposureBox}>
            <View style={styles.exposureItem}>
              <Text style={styles.exposureLabel}>Mesure</Text>
              <Text style={styles.exposureValue}>{item.exposure_level} {item.unit_measurement}</Text>
            </View>
            <View style={styles.exposureItem}>
              <Text style={styles.exposureLabel}>Seuil</Text>
              <Text style={styles.exposureValue}>{item.exposure_threshold} {item.unit_measurement}</Text>
            </View>
            <View style={styles.exposureItem}>
              <Text style={styles.exposureLabel}>DÃ©passement</Text>
              <Text style={[styles.exposureValue, { color: '#DC2626' }]}>+{(((item.exposure_level - item.exposure_threshold) / item.exposure_threshold) * 100).toFixed(0)}%</Text>
            </View>
          </View>
          <Text style={styles.action}>{item.recommended_action}</Text>
          <View style={styles.statusButtons}>
            {item.status !== 'resolved' && (
              <TouchableOpacity style={styles.statusBtn} onPress={() => updateAlertStatus(item.id, item.status === 'open' ? 'acknowledged' : 'resolved')}>
                <Ionicons name="checkmark" size={16} color="#22C55E" />
                <Text style={styles.statusBtnText}>{item.status === 'open' ? 'Accuser' : 'RÃ©soudre'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      )} ListEmptyComponent={<Text style={styles.emptyText}>Aucune alerte</Text>} />

      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle Alerte</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close-circle-outline" size={28} color={ACCENT} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.formContainer}>
              <Text style={styles.formLabel}>Travailleur</Text>
              <TextInput style={styles.input} placeholder="Nom..." placeholderTextColor={colors.placeholder} />
              <Text style={styles.formLabel}>Type de Danger</Text>
              <TextInput style={styles.input} placeholder="Ex: Cobalt Dust..." placeholderTextColor={colors.placeholder} />
              <Text style={styles.formLabel}>Niveau MesurÃ©</Text>
              <TextInput style={styles.input} placeholder="0.05" keyboardType="decimal-pad" placeholderTextColor={colors.placeholder} />
              <Text style={styles.formLabel}>Seuil</Text>
              <TextInput style={styles.input} placeholder="0.02" keyboardType="decimal-pad" placeholderTextColor={colors.placeholder} />
            </ScrollView>
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#DC2626' }]} onPress={() => { setShowAddModal(false); Alert.alert('SuccÃ¨s', 'Alerte crÃ©Ã©e'); }}>
              <Text style={styles.submitBtnText}>CrÃ©er</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showDetail} animationType="fade" transparent onRequestClose={() => setShowDetail(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>DÃ©tail de l'Alerte</Text>
              <TouchableOpacity onPress={() => setShowDetail(false)}>
                <Ionicons name="close-circle-outline" size={28} color={ACCENT} />
              </TouchableOpacity>
            </View>
            {selectedAlert && (
              <ScrollView style={styles.detailContainer}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Travailleur</Text>
                  <Text style={styles.detailValue}>{selectedAlert.worker_name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type de Danger</Text>
                  <Text style={styles.detailValue}>{selectedAlert.hazard_type}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Niveau ExposÃ©</Text>
                  <Text style={styles.detailValue}>{selectedAlert.exposure_level} {selectedAlert.unit_measurement}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Seuil Permis</Text>
                  <Text style={styles.detailValue}>{selectedAlert.exposure_threshold} {selectedAlert.unit_measurement}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>GravitÃ©</Text>
                  <Text style={[styles.detailValue, { color: getSeverityColor(selectedAlert.severity) }]}>{selectedAlert.severity === 'warning' ? 'Alerte' : 'Critique'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Action RecommandÃ©e</Text>
                  <Text style={styles.detailValue}>{selectedAlert.recommended_action}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Statut</Text>
                  <Text style={styles.detailValue}>{selectedAlert.status === 'open' ? 'Ouvert' : selectedAlert.status === 'acknowledged' ? 'AccusÃ© rÃ©ception' : 'RÃ©solu'}</Text>
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
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, borderLeftWidth: 4, ...shadows.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  cardMeta: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs },
  severityBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  exposureBox: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.md, backgroundColor: colors.background, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  exposureItem: { alignItems: 'center' },
  exposureLabel: { fontSize: 10, fontWeight: '600', color: colors.textSecondary },
  exposureValue: { fontSize: 14, fontWeight: '700', color: ACCENT, marginTop: spacing.xs },
  action: { fontSize: 13, color: colors.text, marginBottom: spacing.md, fontWeight: '500' },
  statusButtons: { flexDirection: 'row', gap: spacing.sm },
  statusBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm, backgroundColor: '#F0FDF4', borderRadius: borderRadius.md, borderWidth: 1, borderColor: '#22C55E' },
  statusBtnText: { marginLeft: spacing.xs, fontSize: 12, fontWeight: '600', color: '#22C55E' },
  emptyText: { textAlign: 'center', color: colors.textSecondary, marginVertical: spacing.lg },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.background, borderTopLeftRadius: borderRadius.lg, borderTopRightRadius: borderRadius.lg, maxHeight: '90%', paddingTop: spacing.lg, paddingHorizontal: spacing.md },
  modalContentDesktop: { marginHorizontal: '20%', marginVertical: '5%', borderRadius: borderRadius.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.outline, paddingBottom: spacing.md },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  formContainer: { paddingBottom: spacing.lg },
  formLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: spacing.xs, marginTop: spacing.md },
  input: { backgroundColor: colors.surface, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text, marginBottom: spacing.md },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.md },
  submitBtnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
  detailContainer: { paddingVertical: spacing.lg, paddingBottom: spacing.lg },
  detailRow: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outline },
  detailLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  detailValue: { fontSize: 16, fontWeight: '500', color: colors.text },
});
