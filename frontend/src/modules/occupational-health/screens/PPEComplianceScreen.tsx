import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  Modal, Alert, ActivityIndicator, RefreshControl, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../../../services/ApiService';
import DateInput from '../../../components/DateInput';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { WorkerSelectDropdown, Worker } from '../components/WorkerSelectDropdown';
const ACCENT = '#4338CA'; // PPE Compliance Secondary Dark
const themeColors = { border: '#E2E8F0' };


interface PPEComplianceRecord {
  id: string;
  worker_id: string;
  worker_name: string;
  ppe_type: string;
  assigned_date: string;
  expiry_date: string;
  inspection_date?: string;
  compliance_status: 'compliant' | 'non_compliant' | 'due_inspection';
  notes?: string;
  created_at: string;
}

const SAMPLE_RECORDS: PPEComplianceRecord[] = [
  {
    id: '1', worker_id: 'w1', worker_name: 'Jean-Pierre Kabongo',
    ppe_type: 'Casque de sécurité', assigned_date: '2024-01-15',
    expiry_date: '2027-01-15', inspection_date: '2025-02-20',
    compliance_status: 'compliant', notes: 'En bon état',
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: '2', worker_id: 'w2', worker_name: 'Patrick Lukusa',
    ppe_type: 'Gants de protection', assigned_date: '2024-08-01',
    expiry_date: '2025-08-01', inspection_date: undefined,
    compliance_status: 'due_inspection', notes: 'Inspection attendue',
    created_at: '2024-08-01T14:00:00Z',
  },
];

export function PPEComplianceScreen() {
  const [records, setRecords] = useState<PPEComplianceRecord[]>(SAMPLE_RECORDS);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [ppeCatalog, setPpeCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'compliant' | 'non_compliant' | 'due_inspection'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PPEComplianceRecord | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showPpePicker, setShowPpePicker] = useState(false);
  const [ppeCatalogSearch, setPpeCatalogSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    ppe_catalog: '',   // ID of catalog item being checked
    check_date: new Date().toISOString().split('T')[0],
    check_type: '',
    status: '',
    condition_notes: '',
    is_compliant: true,
    non_compliance_reason: '',
    corrective_action_required: false,
    corrective_action: '',
  });

  useEffect(() => {
    loadRecords();
    loadPpeCatalog();
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const api = ApiService.getInstance();
      const response = await api.get('/occupational-health/ppe-compliance/');
      if (response.success && response.data) {
        let data = Array.isArray(response.data) ? response.data : response.data.results || [];
        // Sort by check_date descending (most recent first)
        data = data.sort((a: any, b: any) => new Date(b.check_date || b.assigned_date).getTime() - new Date(a.check_date || a.assigned_date).getTime());
        setRecords(data);
      }
    } catch (error) {
      console.error('Error loading PPE compliance records:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecords();
    setRefreshing(false);
  };

  /**
   * Load the PPE stock catalog once on mount.
   * #oh-ppe is the stock screen (PPECatalog, no worker assignment).
   * Compliance checks record: worker + catalog item + check details.
   */
  const loadPpeCatalog = async () => {
    try {
      const api = ApiService.getInstance();
      const response = await api.get('/occupational-health/ppe-catalog/', { page_size: 200, is_active: true });
      if (response.data) {
        const items = Array.isArray(response.data) ? response.data : response.data.results || [];
        setPpeCatalog(items);
      }
    } catch (error) {
      console.error('[PPECompliance] Error loading PPE catalog:', error);
    }
  };

  const isFormValid = !!(selectedWorker && formData.ppe_catalog && formData.check_date && formData.check_type && formData.status);

  const handleSubmit = async () => {
    console.log('[PPE Compliance] ✅ Button clicked - handleSubmit called');
    Alert.alert('Debug', 'handleSubmit exécuté');
    
    console.log('[PPE Compliance] Validation check:', {
      selectedWorker: !!selectedWorker,
      ppe_catalog: !!formData.ppe_catalog,
      check_date: !!formData.check_date,
      check_type: !!formData.check_type,
      status: !!formData.status,
    });

    if (!selectedWorker) {
      Alert.alert('Erreur', 'Veuillez sélectionner un travailleur');
      return;
    }
    if (!formData.ppe_catalog) {
      Alert.alert('Erreur', 'Veuillez sélectionner un article EPI');
      return;
    }
    if (!formData.check_date) {
      Alert.alert('Erreur', 'Veuillez entrer une date');
      return;
    }
    if (!formData.check_type) {
      Alert.alert('Erreur', 'Veuillez sélectionner un type d\'inspection');
      return;
    }
    if (!formData.status) {
      Alert.alert('Erreur', 'Veuillez sélectionner un statut');
      return;
    }

    Alert.alert('Info', 'Validation réussie - Envoi au serveur...');
    setSubmitting(true);
    
    try {
      const api = ApiService.getInstance();
      const payload = {
        worker: selectedWorker.id,
        ppe_catalog: parseInt(formData.ppe_catalog, 10),
        check_date: formData.check_date,
        check_type: formData.check_type,
        status: formData.status,
        condition_notes: formData.condition_notes,
        is_compliant: formData.is_compliant,
        non_compliance_reason: formData.non_compliance_reason,
        corrective_action_required: formData.corrective_action_required,
        corrective_action: formData.corrective_action,
      };

      console.log('[PPE Compliance] 📡 Posting payload:', JSON.stringify(payload, null, 2));
      const response = await api.post('/occupational-health/ppe-compliance/', payload);
      console.log('[PPE Compliance] 📥 API response received:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        console.log('[PPE Compliance] ✅ Success! Adding record and closing modal');
        setRecords([...records, response.data]);
        setShowAddModal(false);
        setSelectedWorker(null);
        setFormData({
          ppe_catalog: '',
          check_date: new Date().toISOString().split('T')[0],
          check_type: '',
          status: '',
          condition_notes: '',
          is_compliant: true,
          non_compliance_reason: '',
          corrective_action_required: false,
          corrective_action: '',
        });
        Alert.alert('✅ Succès', 'Enregistrement ajouté avec succès');
        await loadRecords();
      } else {
        console.error('[PPE Compliance] ❌ API returned success=false:', response.error);
        Alert.alert('❌ Erreur', response.error?.message || 'Erreur API: réponse invalide');
      }
    } catch (error: any) {
      console.error('[PPE Compliance] ❌ Exception caught:', error);
      Alert.alert('❌ Erreur', `${error?.message || 'Impossible d\'enregistrer'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = useMemo(() => records.filter(r => {
    const q = searchQuery.toLowerCase();
    const matchQ = !q || r.worker_name.toLowerCase().includes(q) || r.ppe_type.toLowerCase().includes(q);
    const matchS = filterStatus === 'all' || r.compliance_status === filterStatus;
    return matchQ && matchS;
  }), [records, searchQuery, filterStatus]);

  const getStatusColor = (status: string) => {
    return status === 'compliant' ? '#22C55E' : status === 'due_inspection' ? '#F59E0B' : '#EF4444';
  };

  const getStatusLabel = (status: string) => {
    return status === 'compliant' ? 'Conforme' : status === 'due_inspection' ? 'Inspection requise' : 'Non conforme';
  };

  const isExpiring = (expiryDate: string) => {
    const exp = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.floor((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date();
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
            <Text style={styles.screenTitle}>Conformité EPI</Text>
            <Text style={styles.screenSubtitle}>Suivi des équipements de protection</Text>
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
              placeholder="Rechercher..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.md }}>
            {['all', 'compliant', 'due_inspection', 'non_compliant'].map(status => (
              <TouchableOpacity
                key={status}
                onPress={() => setFilterStatus(status as any)}
                style={[
                  styles.filterChip,
                  filterStatus === status && { backgroundColor: ACCENT },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterStatus === status && { color: 'white', fontWeight: '600' },
                  ]}
                >
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
            filtered.map(record => (
              <TouchableOpacity
                key={record.id}
                style={[styles.recordCard, shadows.sm, isExpired(record.expiry_date) && { borderLeftWidth: 4, borderLeftColor: '#EF4444' }]}
                onPress={() => {
                  setSelectedRecord(record);
                  setShowDetail(true);
                }}
              >
                <View style={styles.recordCardLeft}>
                  <View style={[styles.statusIcon, { backgroundColor: getStatusColor(record.compliance_status) + '20' }]}>
                    <Ionicons name="shield" size={24} color={getStatusColor(record.compliance_status)} />
                  </View>
                </View>

                <View style={styles.recordCardCenter}>
                  <Text style={styles.recordWorkerName}>{record.worker_name}</Text>
                  <Text style={styles.recordType}>{record.ppe_type}</Text>
                  <View style={styles.datesBox}>
                    <Text style={styles.dateText}>Expiration: {new Date(record.expiry_date).toLocaleDateString('fr-FR')}</Text>
                    {isExpiring(record.expiry_date) && <Ionicons name="alert-circle" size={12} color="#F59E0B" style={{ marginLeft: 4 }} />}
                    {isExpired(record.expiry_date) && <Ionicons name="alert-circle" size={12} color="#EF4444" style={{ marginLeft: 4 }} />}
                  </View>
                </View>

                <View style={styles.recordCardRight}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(record.compliance_status) + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(record.compliance_status) }]}>
                      {getStatusLabel(record.compliance_status)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="shield-outline" size={48} color={colors.textSecondary + '40'} />
              <Text style={styles.emptyStateText}>Aucun enregistrement EPI</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter enregistrement EPI</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formSection}>
              <WorkerSelectDropdown
                value={selectedWorker}
                onChange={setSelectedWorker}
                label="Travailleur"
                placeholder="Sélectionnez un travailleur"
                error={selectedWorker === null ? 'Travailleur requis' : undefined}
              />

              <Text style={styles.formLabel}>Article EPI (Catalogue stock)</Text>
              {ppeCatalog.length === 0 ? (
                <View style={styles.catalogWarning}>
                  <Ionicons name="alert-circle" size={20} color={colors.warning} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.catalogWarningTitle}>Aucun article EPI dans le catalogue</Text>
                    <Text style={styles.catalogWarningBody}>
                      Ajoutez d'abord des équipements via l'écran <Text style={{ fontWeight: '600' }}>Gestion EPI</Text>.
                    </Text>
                  </View>
                </View>
              ) : formData.ppe_catalog ? (
                // Selected item card
                (() => {
                  const sel = ppeCatalog.find(i => String(i.id) === formData.ppe_catalog);
                  return (
                    <View style={styles.selectedPpeCard}>
                      <View style={styles.selectedPpeIcon}>
                        <Ionicons name="shield-checkmark" size={20} color={ACCENT} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.selectedPpeName}>{sel?.name || sel?.ppe_type_display || sel?.ppe_type || 'Article EPI'}</Text>
                        {sel?.brand ? <Text style={styles.selectedPpeSub}>{sel.brand}{sel.model_number ? ` — ${sel.model_number}` : ''}</Text> : null}
                        {sel?.certification_standard ? <Text style={styles.selectedPpeCert}>{sel.certification_standard}</Text> : null}
                      </View>
                      <TouchableOpacity onPress={() => setShowPpePicker(true)} style={styles.changePpeBtn}>
                        <Text style={styles.changeText}>Changer</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })()
              ) : (
                // Picker trigger
                <TouchableOpacity style={styles.ppePickerTrigger} onPress={() => setShowPpePicker(true)} activeOpacity={0.75}>
                  <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.ppePickerPlaceholder}>Rechercher un article EPI… ({ppeCatalog.length} disponibles)</Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}

              <Text style={styles.formLabel}>Date d'inspection</Text>
              <DateInput
                value={formData.check_date}
                onChangeText={(text) => setFormData({ ...formData, check_date: text })}
                placeholder="YYYY-MM-DD"
                format="iso"
              />

              <Text style={styles.formLabel}>Type d'inspection</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {['routine', 'pre_use', 'post_incident', 'inventory', 'expiry_check', 'damage'].map(type => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setFormData({ ...formData, check_type: type })}
                    style={[
                      styles.input,
                      { paddingVertical: 6, paddingHorizontal: 10, minWidth: 80, alignItems: 'center', flex: 1, minHeight: 40 },
                      formData.check_type === type && { backgroundColor: ACCENT, borderColor: ACCENT },
                    ]}
                  >
                    <Text style={[
                      { fontSize: 11, color: colors.text },
                      formData.check_type === type && { color: 'white', fontWeight: '600' },
                    ]}>
                      {type === 'routine' ? 'Classique' : type === 'pre_use' ? 'Avant usage' : type === 'post_incident' ? 'Post-incident' : type === 'inventory' ? 'Inventaire' : type === 'expiry_check' ? 'Vérif. Expiration' : 'Dommage'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>Statut</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                {['in_use', 'expired', 'damaged', 'lost', 'replaced', 'compliant', 'non_compliant'].map(status => (
                  <TouchableOpacity
                    key={status}
                    onPress={() => setFormData({ ...formData, status })}
                    style={[
                      { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.lg, marginRight: spacing.md, borderWidth: 1.5 },
                      formData.status === status
                        ? { backgroundColor: ACCENT, borderColor: ACCENT }
                        : { backgroundColor: colors.surface, borderColor: colors.outline }
                    ]}
                  >
                    <Text style={[
                      { fontSize: 12, fontWeight: formData.status === status ? '600' : '500' },
                      formData.status === status ? { color: '#FFF' } : { color: colors.text }
                    ]}>
                      {status === 'in_use' ? 'En usage' : status === 'expired' ? 'Expiré' : status === 'damaged' ? 'Endommagé' : status === 'lost' ? 'Perdu' : status === 'replaced' ? 'Remplacé' : status === 'compliant' ? 'Conforme' : 'Non-Conforme'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.formLabel}>Notes d'état</Text>
              <TextInput
                style={[styles.input, { minHeight: 80 }]}
                placeholder="Observations sur l'état..."
                multiline
                value={formData.condition_notes}
                onChangeText={(text) => setFormData({ ...formData, condition_notes: text })}
                placeholderTextColor={colors.textSecondary}
              />

              {/* Validation checklist */}
              <View style={{ marginTop: spacing.md, padding: spacing.sm, backgroundColor: colors.info + '12', borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.info + '30' }}>
                {[
                  [!!selectedWorker,      'Travailleur'],
                  [!!formData.ppe_catalog,'Article EPI sélectionné'],
                  [!!formData.check_date, 'Date'],
                  [!!formData.check_type, 'Type d\'inspection'],
                  [!!formData.status,     'Statut'],
                ].map(([ok, label]) => (
                  <Text key={label as string} style={{ fontSize: 11, color: ok ? colors.success : colors.warning, marginBottom: 2 }}>
                    {ok ? '✓' : '✗'} {label as string}
                  </Text>
                ))}
              </View>

              <TouchableOpacity 
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: !isFormValid ? '#ccc' : ACCENT,
                    opacity: submitting ? 0.6 : 1,
                  }
                ]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Enregistrer</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* PPE Catalogue Picker Modal */}
      <Modal visible={showPpePicker} transparent animationType="slide" onRequestClose={() => setShowPpePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir un article EPI</Text>
              <TouchableOpacity onPress={() => { setShowPpePicker(false); setPpeCatalogSearch(''); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {/* Search */}
            <View style={styles.pickerSearch}>
              <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
              <TextInput
                style={styles.pickerSearchInput}
                placeholder="Nom, marque, norme…"
                placeholderTextColor={colors.textSecondary}
                value={ppeCatalogSearch}
                onChangeText={setPpeCatalogSearch}
                autoFocus
              />
              {ppeCatalogSearch.length > 0 && (
                <TouchableOpacity onPress={() => setPpeCatalogSearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            <FlatList
              data={ppeCatalog.filter(item => {
                const q = ppeCatalogSearch.toLowerCase();
                if (!q) return true;
                return (
                  (item.name || '').toLowerCase().includes(q) ||
                  (item.ppe_type_display || item.ppe_type || '').toLowerCase().includes(q) ||
                  (item.brand || '').toLowerCase().includes(q) ||
                  (item.model_number || '').toLowerCase().includes(q) ||
                  (item.certification_standard || '').toLowerCase().includes(q)
                );
              })}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => {
                const selected = formData.ppe_catalog === String(item.id);
                return (
                  <TouchableOpacity
                    style={[styles.pickerRow, selected && styles.pickerRowSelected]}
                    onPress={() => {
                      setFormData({ ...formData, ppe_catalog: String(item.id) });
                      setShowPpePicker(false);
                      setPpeCatalogSearch('');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.pickerRowIcon, { backgroundColor: selected ? ACCENT + '18' : colors.background }]}>
                      <Ionicons name="shield-outline" size={18} color={selected ? ACCENT : colors.textSecondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerRowName, selected && { color: ACCENT }]}>
                        {item.name || item.ppe_type_display || item.ppe_type}
                      </Text>
                      {item.brand ? (
                        <Text style={styles.pickerRowSub}>{item.brand}{item.model_number ? ` — ${item.model_number}` : ''}</Text>
                      ) : null}
                      {item.certification_standard ? (
                        <Text style={styles.pickerRowCert}>{item.certification_standard}</Text>
                      ) : null}
                    </View>
                    {selected && <Ionicons name="checkmark-circle" size={20} color={ACCENT} />}
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.outline, marginLeft: 56 }} />}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <Ionicons name="search-outline" size={36} color={colors.outline} />
                  <Text style={{ color: colors.textSecondary, marginTop: 8, fontSize: 13 }}>Aucun résultat pour "{ppeCatalogSearch}"</Text>
                </View>
              }
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      {selectedRecord && (
        <Modal visible={showDetail} transparent animationType="fade" onRequestClose={() => setShowDetail(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Détails EPI</Text>
                <TouchableOpacity onPress={() => setShowDetail(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.detailSection}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Travailleur</Text>
                  <Text style={styles.detailValue}>{selectedRecord.worker_name}</Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type d'EPI</Text>
                  <Text style={styles.detailValue}>{selectedRecord.ppe_type}</Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Assigné le</Text>
                  <Text style={styles.detailValue}>{new Date(selectedRecord.assigned_date).toLocaleDateString('fr-FR')}</Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Expire le</Text>
                  <Text style={[styles.detailValue, isExpired(selectedRecord.expiry_date) && { color: '#EF4444' }]}>
                    {new Date(selectedRecord.expiry_date).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Statut</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedRecord.compliance_status) + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(selectedRecord.compliance_status) }]}>
                      {getStatusLabel(selectedRecord.compliance_status)}
                    </Text>
                  </View>
                </View>

                {selectedRecord.inspection_date && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Dernière inspection</Text>
                      <Text style={styles.detailValue}>{new Date(selectedRecord.inspection_date).toLocaleDateString('fr-FR')}</Text>
                    </View>
                  </>
                )}

                {selectedRecord.notes && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Notes</Text>
                      <Text style={styles.detailValue}>{selectedRecord.notes}</Text>
                    </View>
                  </>
                )}
              </ScrollView>

              <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.surfaceVariant }]} onPress={() => setShowDetail(false)}>
                <Text style={[styles.closeButtonText, { color: colors.text }]}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  fabButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  searchSection: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    color: colors.text,
    fontSize: 14,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    marginRight: spacing.sm,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontWeight: '500',
    fontSize: 12,
  },
  contentSection: {
    paddingHorizontal: spacing.md,
    paddingBottom: 40,
  },
  recordCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  recordCardLeft: {
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordCardCenter: {
    flex: 1,
  },
  recordWorkerName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  recordType: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  datesBox: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  recordCardRight: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingBottom: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  formSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
  },
  submitButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  detailSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.outline,
  },
  closeButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  closeButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  // PPE Picker styles
  catalogWarning: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: spacing.md, backgroundColor: colors.warning + '12',
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.warning + '30',
  },
  catalogWarningTitle: { fontSize: 12, fontWeight: '700', color: colors.warning, marginBottom: 4 },
  catalogWarningBody:  { fontSize: 11, color: colors.warning, lineHeight: 16 },
  selectedPpeCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, backgroundColor: ACCENT + '08',
    borderRadius: borderRadius.md, borderWidth: 1.5, borderColor: ACCENT + '40',
  },
  selectedPpeIcon: {
    width: 40, height: 40, borderRadius: borderRadius.md,
    backgroundColor: ACCENT + '18', justifyContent: 'center', alignItems: 'center',
  },
  selectedPpeName: { fontSize: 13, fontWeight: '700', color: colors.text },
  selectedPpeSub:  { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  selectedPpeCert: { fontSize: 10, color: ACCENT, marginTop: 2, fontWeight: '500' },
  changePpeBtn: {
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: borderRadius.sm, backgroundColor: ACCENT + '18',
  },
  changeText: { fontSize: 11, color: ACCENT, fontWeight: '700' },
  ppePickerTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderWidth: 1.5, borderColor: colors.outline, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    backgroundColor: colors.background,
  },
  ppePickerPlaceholder: { flex: 1, fontSize: 13, color: colors.textSecondary },
  pickerSearch: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.md, marginVertical: spacing.sm,
    paddingHorizontal: spacing.md, height: 42,
    backgroundColor: colors.background, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.outline,
  },
  pickerSearchInput: { flex: 1, fontSize: 14, color: colors.text },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: 12,
  },
  pickerRowSelected: { backgroundColor: ACCENT + '06' },
  pickerRowIcon: {
    width: 36, height: 36, borderRadius: borderRadius.md,
    justifyContent: 'center', alignItems: 'center',
  },
  pickerRowName: { fontSize: 13, fontWeight: '600', color: colors.text },
  pickerRowSub:  { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  pickerRowCert: { fontSize: 10, color: ACCENT, marginTop: 2, fontWeight: '500' },
});
