import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Dimensions,
  Modal, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../../../services/ApiService';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { WorkerSelectDropdown, Worker } from '../components/WorkerSelectDropdown';
import { useSimpleToast } from '../../../hooks/useSimpleToast';
import { SimpleToastNotification } from '../../../components/SimpleToastNotification';

const { width } = Dimensions.get('window');
const ACCENT = '#122056'; // Heavy Metals Primary Blue

const METAL_CHOICES = [
  { value: 'lead', label: 'Plomb (Pb)' },
  { value: 'mercury', label: 'Mercure (Hg)' },
  { value: 'cadmium', label: 'Cadmium (Cd)' },
  { value: 'cobalt', label: 'Cobalt (Co)' },
  { value: 'chromium', label: 'Chrome (Cr)' },
  { value: 'nickel', label: 'Nickel (Ni)' },
  { value: 'manganese', label: 'Manganèse (Mn)' },
  { value: 'arsenic', label: 'Arsenic (As)' },
  { value: 'beryllium', label: 'Béryllium (Be)' },
  { value: 'aluminum', label: 'Aluminium (Al)' },
];

const SPECIMEN_CHOICES = [
  { value: 'blood', label: 'Sang' },
  { value: 'urine', label: 'Urine' },
  { value: 'hair', label: 'Cheveux' },
];

interface HeavyMetalsResult {
  id: string;
  worker_name: string;
  heavy_metal: string;
  heavy_metal_display: string;
  specimen_type: string;
  specimen_type_display: string;
  test_date: string;
  level_value: string;
  unit: string;
  status: 'normal' | 'elevated' | 'high' | 'critical';
  status_display: string;
  follow_up_required: boolean;
  clinical_significance?: string;
  created: string;
}

export function HeavyMetalsScreen() {
  const { toastMsg, showToast } = useSimpleToast();
  const [results, setResults] = useState<HeavyMetalsResult[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'normal' | 'elevated' | 'high' | 'critical'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState<HeavyMetalsResult | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    heavy_metal: 'lead',
    specimen_type: 'blood',
    test_date: new Date().toISOString().split('T')[0],
    level_value: '',
    unit: 'µg/L',
    reference_lower: '',
    reference_upper: '',
    clinical_significance: '',
    follow_up_required: false,
    follow_up_recommendation: '',
  });

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const api = ApiService.getInstance();
      const response = await api.get('/occupational-health/heavy-metals-tests/');
      if (response.success && response.data) {
        let data = Array.isArray(response.data) ? response.data : response.data.results || [];
        data = data.sort((a: any, b: any) =>
          new Date(b.test_date).getTime() - new Date(a.test_date).getTime()
        );
        setResults(data);
      }
    } catch (error) {
      console.error('Error loading heavy metals results:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadResults();
    setRefreshing(false);
  };

  const resetForm = () => {
    setSelectedWorker(null);
    setFormData({
      heavy_metal: 'lead',
      specimen_type: 'blood',
      test_date: new Date().toISOString().split('T')[0],
      level_value: '',
      unit: 'µg/L',
      reference_lower: '',
      reference_upper: '',
      clinical_significance: '',
      follow_up_required: false,
      follow_up_recommendation: '',
    });
  };

  const handleSubmit = async () => {
    console.log('[HeavyMetalsScreen] Submit button pressed');
    console.log('[HeavyMetalsScreen] selectedWorker:', selectedWorker);
    console.log('[HeavyMetalsScreen] formData.level_value:', formData.level_value);
    setValidationError(null);

    if (!selectedWorker) {
      console.log('[HeavyMetalsScreen] Validation failed: no worker selected');
      const msg = 'Veuillez sélectionner un travailleur';
      setValidationError(msg);
      showToast(msg, 'error');
      return;
    }
    if (!formData.level_value) {
      console.log('[HeavyMetalsScreen] Validation failed: no level value');
      const msg = 'Veuillez saisir la valeur du test';
      setValidationError(msg);
      showToast(msg, 'error');
      return;
    }

    setSubmitting(true);
    try {
      const api = ApiService.getInstance();

      const payload: Record<string, any> = {
        worker_id: selectedWorker.id,
        heavy_metal: formData.heavy_metal,
        specimen_type: formData.specimen_type,
        test_date: formData.test_date,
        level_value: parseFloat(formData.level_value),
        unit: formData.unit,
        clinical_significance: formData.clinical_significance,
        follow_up_required: formData.follow_up_required,
        follow_up_recommendation: formData.follow_up_recommendation,
      };

      if (formData.reference_lower) payload.reference_lower = parseFloat(formData.reference_lower);
      if (formData.reference_upper) payload.reference_upper = parseFloat(formData.reference_upper);

      console.log('[HeavyMetalsScreen] Sending payload:', payload);
      const response = await api.post('/occupational-health/heavy-metals-tests/', payload);
      console.log('[HeavyMetalsScreen] API Response:', response);
      
      if (response.success) {
        showToast('Test de métaux lourds enregistré', 'success');
        setShowAddModal(false);
        resetForm();
        loadResults();
      } else {
        const responseAsAny = response as Record<string, any>;
        const errMsg = responseAsAny.message || responseAsAny.errors || 'Erreur serveur';
        console.error('[HeavyMetalsScreen] API returned failure:', errMsg);
        showToast(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg), 'error');
      }
    } catch (error: any) {
      console.error('[HeavyMetalsScreen] Error creating heavy metals test:', error);
      const errMsg = error?.message || 'Impossible d\'enregistrer le test';
      setValidationError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    let list = results;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => r.worker_name?.toLowerCase().includes(q) || r.heavy_metal_display?.toLowerCase().includes(q));
    }
    if (filterStatus !== 'all') {
      list = list.filter(r => r.status === filterStatus);
    }
    return list;
  }, [results, searchQuery, filterStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return '#22C55E';
      case 'elevated': return '#F59E0B';
      case 'high': return '#F97316';
      case 'critical': return '#EF4444';
      default: return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'normal': return 'Normal';
      case 'elevated': return 'Élevé';
      case 'high': return 'Haut';
      case 'critical': return 'Critique';
      default: return status;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.screenTitle}>Métaux Lourds</Text>
            <Text style={styles.screenSubtitle}>Dosages biologiques des métaux toxiques</Text>
          </View>
          <TouchableOpacity
            style={[styles.fabButton, { backgroundColor: ACCENT }]}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Search & Filter */}
        <View style={styles.searchSection}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher par nom ou métal..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.md }}>
            {(['all', 'normal', 'elevated', 'high', 'critical'] as const).map(status => (
              <TouchableOpacity
                key={status}
                onPress={() => setFilterStatus(status)}
                style={[
                  styles.filterChip,
                  filterStatus === status && { backgroundColor: ACCENT },
                ]}
              >
                <Text style={[
                  styles.filterChipText,
                  filterStatus === status && { color: 'white', fontWeight: '600' },
                ]}>
                  {status === 'all' ? 'Tous' : getStatusLabel(status)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content */}
        <View style={styles.contentSection}>
          {loading ? (
            <ActivityIndicator size="large" color={ACCENT} style={{ marginVertical: 40 }} />
          ) : filtered.length > 0 ? (
            filtered.map(result => (
              <TouchableOpacity
                key={result.id}
                style={[styles.resultCard, shadows.sm]}
                onPress={() => { setSelectedResult(result); setShowDetail(true); }}
              >
                <View style={styles.resultCardLeft}>
                  <View style={[styles.statusIcon, { backgroundColor: getStatusColor(result.status) + '20' }]}>
                    <Ionicons name="flask" size={24} color={getStatusColor(result.status)} />
                  </View>
                </View>

                <View style={styles.resultCardCenter}>
                  <Text style={styles.resultWorkerName}>{result.worker_name}</Text>
                  <Text style={styles.resultMetal}>{result.heavy_metal_display || result.heavy_metal}</Text>
                  <View style={styles.resultValues}>
                    <Text style={styles.valueText}>
                      {result.level_value} {result.unit} · {result.specimen_type_display || result.specimen_type}
                    </Text>
                  </View>
                  <Text style={styles.resultDate}>{new Date(result.test_date).toLocaleDateString('fr-FR')}</Text>
                </View>

                <View style={styles.resultCardRight}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(result.status) + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(result.status) }]}>
                      {result.status_display || getStatusLabel(result.status)}
                    </Text>
                  </View>
                  {result.follow_up_required && (
                    <Ionicons name="alert-circle" size={16} color="#F59E0B" />
                  )}
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="flask-outline" size={48} color={colors.textSecondary + '40'} />
              <Text style={styles.emptyStateText}>Aucun test de métaux lourds</Text>
              <TouchableOpacity
                style={[styles.emptyAddBtn, { backgroundColor: ACCENT }]}
                onPress={() => setShowAddModal(true)}
              >
                <Ionicons name="add" size={18} color="white" />
                <Text style={styles.emptyAddBtnText}>Ajouter un test</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Add Modal ── */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '95%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouveau test — Métaux Lourds</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formSection} showsVerticalScrollIndicator={false}>
              {/* Validation Error Banner */}
              {validationError && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.errorBannerText}>{validationError}</Text>
                </View>
              )}

              {/* Worker */}
              <WorkerSelectDropdown
                value={selectedWorker}
                onChange={setSelectedWorker}
                label="Travailleur *"
                placeholder="Sélectionnez un travailleur"
              />

              {/* Metal Type */}
              <Text style={styles.formLabel}>Type de métal *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
                {METAL_CHOICES.map(m => (
                  <TouchableOpacity
                    key={m.value}
                    onPress={() => setFormData({ ...formData, heavy_metal: m.value })}
                    style={[
                      styles.chipBtn,
                      formData.heavy_metal === m.value && { backgroundColor: ACCENT, borderColor: ACCENT },
                    ]}
                  >
                    <Text style={[
                      styles.chipBtnText,
                      formData.heavy_metal === m.value && { color: 'white' },
                    ]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Specimen Type */}
              <Text style={styles.formLabel}>Type de prélèvement *</Text>
              <View style={styles.rowChips}>
                {SPECIMEN_CHOICES.map(s => (
                  <TouchableOpacity
                    key={s.value}
                    onPress={() => setFormData({ ...formData, specimen_type: s.value })}
                    style={[
                      styles.chipBtn,
                      formData.specimen_type === s.value && { backgroundColor: ACCENT, borderColor: ACCENT },
                    ]}
                  >
                    <Text style={[
                      styles.chipBtnText,
                      formData.specimen_type === s.value && { color: 'white' },
                    ]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Date */}
              <Text style={styles.formLabel}>Date du test *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={formData.test_date}
                onChangeText={(t) => setFormData({ ...formData, test_date: t })}
                placeholderTextColor={colors.textSecondary}
              />

              {/* Value + Unit */}
              <Text style={styles.formLabel}>Valeur mesurée *</Text>
              <View style={styles.rowInputs}>
                <TextInput
                  style={[styles.input, { flex: 2, marginRight: spacing.sm }]}
                  placeholder="Ex: 12.5"
                  keyboardType="decimal-pad"
                  value={formData.level_value}
                  onChangeText={(t) => setFormData({ ...formData, level_value: t })}
                  placeholderTextColor={colors.textSecondary}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Unité"
                  value={formData.unit}
                  onChangeText={(t) => setFormData({ ...formData, unit: t })}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Reference Range */}
              <Text style={styles.formLabel}>Valeurs de référence (optionnel)</Text>
              <View style={styles.rowInputs}>
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: spacing.sm }]}
                  placeholder="Min"
                  keyboardType="decimal-pad"
                  value={formData.reference_lower}
                  onChangeText={(t) => setFormData({ ...formData, reference_lower: t })}
                  placeholderTextColor={colors.textSecondary}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Max"
                  keyboardType="decimal-pad"
                  value={formData.reference_upper}
                  onChangeText={(t) => setFormData({ ...formData, reference_upper: t })}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Clinical Significance */}
              <Text style={styles.formLabel}>Signification clinique / Notes</Text>
              <TextInput
                style={[styles.input, { minHeight: 80 }]}
                placeholder="Remarques cliniques..."
                multiline
                value={formData.clinical_significance}
                onChangeText={(t) => setFormData({ ...formData, clinical_significance: t })}
                placeholderTextColor={colors.textSecondary}
              />

              {/* Follow-up */}
              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => setFormData({ ...formData, follow_up_required: !formData.follow_up_required })}
              >
                <View style={[
                  styles.checkbox,
                  formData.follow_up_required && { backgroundColor: ACCENT, borderColor: ACCENT },
                ]}>
                  {formData.follow_up_required && <Ionicons name="checkmark" size={14} color="white" />}
                </View>
                <Text style={styles.checkLabel}>Suivi requis</Text>
              </TouchableOpacity>

              {formData.follow_up_required && (
                <>
                  <Text style={styles.formLabel}>Recommandation de suivi</Text>
                  <TextInput
                    style={[styles.input, { minHeight: 60 }]}
                    placeholder="Recommandations..."
                    multiline
                    value={formData.follow_up_recommendation}
                    onChangeText={(t) => setFormData({ ...formData, follow_up_recommendation: t })}
                    placeholderTextColor={colors.textSecondary}
                  />
                </>
              )}

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: ACCENT, opacity: submitting ? 0.7 : 1 }]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.submitButtonText}>Enregistrer le test</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Detail Modal ── */}
      {selectedResult && (
        <Modal visible={showDetail} transparent animationType="fade" onRequestClose={() => setShowDetail(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Détails — Métaux Lourds</Text>
                <TouchableOpacity onPress={() => setShowDetail(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.detailSection}>
                {[
                  { label: 'Travailleur', value: selectedResult.worker_name },
                  { label: 'Métal', value: selectedResult.heavy_metal_display || selectedResult.heavy_metal },
                  { label: 'Prélèvement', value: selectedResult.specimen_type_display || selectedResult.specimen_type },
                  { label: 'Date', value: new Date(selectedResult.test_date).toLocaleDateString('fr-FR') },
                  { label: 'Valeur', value: `${selectedResult.level_value} ${selectedResult.unit}` },
                ].map(({ label, value }) => (
                  <View key={label}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{label}</Text>
                      <Text style={styles.detailValue}>{value}</Text>
                    </View>
                    <View style={styles.divider} />
                  </View>
                ))}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Statut</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedResult.status) + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(selectedResult.status) }]}>
                      {selectedResult.status_display || getStatusLabel(selectedResult.status)}
                    </Text>
                  </View>
                </View>

                {selectedResult.clinical_significance ? (
                  <View>
                    <View style={styles.divider} />
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Notes cliniques</Text>
                      <Text style={[styles.detailValue, { flex: 1, textAlign: 'right' }]}>{selectedResult.clinical_significance}</Text>
                    </View>
                  </View>
                ) : null}

                {selectedResult.follow_up_required && (
                  <View style={styles.followUpBanner}>
                    <Ionicons name="alert-circle" size={16} color="#F59E0B" />
                    <Text style={styles.followUpText}>Suivi requis</Text>
                  </View>
                )}
              </ScrollView>

              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: colors.surfaceVariant }]}
                onPress={() => setShowDetail(false)}
              >
                <Text style={[styles.closeButtonText, { color: colors.text }]}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
      <SimpleToastNotification message={toastMsg} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.md,
  },
  screenTitle: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 4 },
  screenSubtitle: { fontSize: 13, color: colors.textSecondary },
  fabButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', ...shadows.md },
  searchSection: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: borderRadius.md, paddingHorizontal: spacing.md, height: 44,
    borderWidth: 1, borderColor: colors.outline,
  },
  searchInput: { flex: 1, marginLeft: spacing.sm, color: colors.text, fontSize: 14 },
  filterChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline, marginRight: spacing.sm,
  },
  filterChipText: { color: colors.textSecondary, fontWeight: '500', fontSize: 12 },
  contentSection: { paddingHorizontal: spacing.md, paddingBottom: 40 },
  resultCard: {
    flexDirection: 'row', backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.md,
  },
  resultCardLeft: { justifyContent: 'center', marginRight: spacing.md },
  statusIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  resultCardCenter: { flex: 1 },
  resultWorkerName: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 2 },
  resultMetal: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  resultValues: {
    backgroundColor: colors.background, paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: borderRadius.sm, marginBottom: 4,
  },
  valueText: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  resultDate: { fontSize: 11, color: colors.textSecondary },
  resultCardRight: { justifyContent: 'center', alignItems: 'flex-end', gap: spacing.sm },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.sm },
  statusBadgeText: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyStateText: { marginTop: spacing.md, color: colors.textSecondary, fontSize: 14, marginBottom: spacing.lg },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: borderRadius.md,
  },
  emptyAddBtnText: { color: 'white', fontWeight: '600', fontSize: 14 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg, paddingBottom: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.outline,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  formSection: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  formLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: spacing.sm, marginTop: spacing.md },
  input: {
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.outline,
    borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: 14, color: colors.text,
  },
  rowInputs: { flexDirection: 'row' },
  rowChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  chipBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.surface, marginRight: spacing.sm,
  },
  chipBtnText: { fontSize: 12, fontWeight: '500', color: colors.text },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  checkbox: {
    width: 22, height: 22, borderRadius: 4, borderWidth: 2,
    borderColor: colors.outline, alignItems: 'center', justifyContent: 'center',
  },
  checkLabel: { fontSize: 14, color: colors.text, fontWeight: '500' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: '#FEE2E2', borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    marginBottom: spacing.md, borderLeftWidth: 4, borderLeftColor: '#EF4444',
  },
  errorBannerText: { fontSize: 13, color: '#DC2626', fontWeight: '500', flex: 1 },
  submitButton: {
    borderRadius: borderRadius.md, paddingVertical: spacing.md,
    alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.md,
  },
  submitButtonText: { color: 'white', fontWeight: '600', fontSize: 14 },

  // Detail Modal
  detailSection: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md,
  },
  detailLabel: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
  detailValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  divider: { height: 1, backgroundColor: colors.outline },
  followUpBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: '#FEF3C7', borderRadius: borderRadius.md, padding: spacing.md, marginTop: spacing.md,
  },
  followUpText: { fontSize: 13, color: '#D97706', fontWeight: '600' },
  closeButton: { borderRadius: borderRadius.md, paddingVertical: spacing.md, alignItems: 'center', marginHorizontal: spacing.md, marginTop: spacing.md },
  closeButtonText: { fontWeight: '600', fontSize: 14 },
});
