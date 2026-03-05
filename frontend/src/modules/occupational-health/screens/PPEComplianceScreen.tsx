import React, { useState, useEffect } from 'react';
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
  id: number;
  worker: number;
  worker_name: string;
  worker_employee_id: string;
  ppe_catalog: number;
  ppe_catalog_name: string;
  ppe_type_display: string;
  check_date: string;
  check_type: string;
  check_type_display: string;
  status: string;
  status_display: string;
  status_computed: 'normal' | 'warning' | 'critical';
  condition_notes: string;
  is_compliant: boolean;
  non_compliance_reason: string;
  corrective_action_required: boolean;
  corrective_action: string;
  checked_by_name: string;
  approved_by_name: string;
  approval_date: string | null;
}

const SAMPLE_RECORDS: PPEComplianceRecord[] = [
  {
    id: 1,
    worker: 1,
    worker_name: 'Jean-Pierre Kabongo',
    worker_employee_id: 'EMP001',
    ppe_catalog: 1,
    ppe_catalog_name: 'Casque de sécurité',
    ppe_type_display: 'Casque de sécurité',
    check_date: '2025-02-20',
    check_type: 'routine',
    check_type_display: 'Routine',
    status: 'compliant',
    status_display: 'Conforme',
    status_computed: 'normal',
    condition_notes: 'En bon état',
    is_compliant: true,
    non_compliance_reason: '',
    corrective_action_required: false,
    corrective_action: '',
    checked_by_name: 'Admin User',
    approved_by_name: 'Manager',
    approval_date: '2025-02-21',
  },
  {
    id: 2,
    worker: 2,
    worker_name: 'Patrick Lukusa',
    worker_employee_id: 'EMP002',
    ppe_catalog: 2,
    ppe_catalog_name: 'Gants de protection',
    ppe_type_display: 'Gants de protection',
    check_date: '2025-03-01',
    check_type: 'pre_use',
    check_type_display: 'Pre-Use',
    status: 'non_compliant',
    status_display: 'Non-Conforme',
    status_computed: 'warning',
    condition_notes: 'Usure visible',
    is_compliant: false,
    non_compliance_reason: 'Dommage observé',
    corrective_action_required: true,
    corrective_action: 'Remplacer les gants',
    checked_by_name: 'Admin User',
    approved_by_name: 'Manager',
    approval_date: null,
  },
];

export function PPEComplianceScreen() {
  const [records, setRecords] = useState<PPEComplianceRecord[]>(SAMPLE_RECORDS);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [ppeCatalog, setPpeCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'compliant' | 'non_compliant' | 'in_use' | 'expired' | 'damaged'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'worker' | 'status'>('recent');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PPEComplianceRecord | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showPpePicker, setShowPpePicker] = useState(false);
  const [ppeCatalogSearch, setPpeCatalogSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
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
    loadRecords(1, true);
    loadPpeCatalog();
  }, []);

  /**
   * Optimized API call with pagination, search, filtering, and sorting.
   * Backend handles the heavy lifting; frontend just displays results.
   */
  const loadRecords = async (page: number = 1, isRefresh: boolean = false) => {
    if (page === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const api = ApiService.getInstance();
      
      // Build query params for API optimization
      const params: any = {
        page,
        page_size: pageSize,
      };

      // Only add search if not empty
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      // Only add status filter if not 'all'
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }

      // Add ordering based on sortBy
      switch(sortBy) {
        case 'recent':
          params.ordering = '-check_date';
          break;
        case 'oldest':
          params.ordering = 'check_date';
          break;
        case 'worker':
          params.ordering = 'worker_name';
          break;
        case 'status':
          params.ordering = 'status';
          break;
      }

      const response = await api.get('/occupational-health/ppe-compliance/', params);
      
      if (response.success && response.data) {
        let data = Array.isArray(response.data) ? response.data : response.data.results || [];
        const total = response.data.count || data.length;
        const next = response.data.next || null;

        if (page === 1 || isRefresh) {
          setRecords(data);
        } else {
          setRecords([...records, ...data]);
        }

        setTotalCount(total);
        setHasNextPage(!!next);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error loading PPE compliance records:', error);
    } finally {
      if (page === 1) setLoading(false);
      else setLoadingMore(false);
    }
  };

  // Reload when search, filter, or sort changes
  useEffect(() => {
    setCurrentPage(1);
    loadRecords(1, false);
  }, [searchQuery, filterStatus, sortBy]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecords(1, true);
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

      const response = await api.post('/occupational-health/ppe-compliance/', payload);
      
      if (response.success && response.data) {
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
        Alert.alert('❌ Erreur', response.error?.message || 'Erreur API: réponse invalide');
      }
    } catch (error: any) {
      console.error('[PPE Compliance] Error:', error);
      Alert.alert('❌ Erreur', `${error?.message || 'Impossible d\'enregistrer'}`);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * No longer needed - filtering, sorting done on backend
   */

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'compliant': return '#22C55E';
      case 'non_compliant': return '#EF4444';
      case 'in_use': return '#3B82F6';
      case 'expired': return '#F59E0B';
      case 'damaged': return '#DC2626';
      case 'lost': return '#7C3AED';
      case 'replaced': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'compliant': return 'Conforme';
      case 'non_compliant': return 'Non conforme';
      case 'in_use': return 'En usage';
      case 'expired': return 'Expiré';
      case 'damaged': return 'Endommagé';
      case 'lost': return 'Perdu';
      case 'replaced': return 'Remplacé';
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

          {/* Status Filter Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.md }}>
            {['all', 'compliant', 'non_compliant', 'in_use', 'expired', 'damaged'].map(status => (
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

          {/* Sorting Options */}
          <View style={{ marginTop: spacing.md }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.sm }}>Trier par</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[
                { key: 'recent', label: 'Plus récent' },
                { key: 'oldest', label: 'Plus ancien' },
                { key: 'worker', label: 'Travailleur' },
                { key: 'status', label: 'Statut' },
              ].map(sort => (
                <TouchableOpacity
                  key={sort.key}
                  onPress={() => setSortBy(sort.key as any)}
                  style={[
                    styles.sortChip,
                    sortBy === sort.key && { backgroundColor: ACCENT, borderColor: ACCENT },
                  ]}
                >
                  <Ionicons name="arrow-down" size={12} color={sortBy === sort.key ? 'white' : colors.textSecondary} style={{ marginRight: 4 }} />
                  <Text
                    style={[
                      { fontSize: 11, fontWeight: '500', color: colors.textSecondary },
                      sortBy === sort.key && { color: 'white', fontWeight: '600' },
                    ]}
                  >
                    {sort.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Results Info */}
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '500' }}>
            {records.length > 0 ? `${records.length} de ${totalCount} résultats` : 'Aucun résultat'}
          </Text>
        </View>

        {/* Content */}
        <View style={styles.contentSection}>
          {loading ? (
            <ActivityIndicator size="large" color={ACCENT} style={{ marginVertical: 40 }} />
          ) : records.length > 0 ? (
            <>
              {records.map(record => (
                <TouchableOpacity
                  key={record.id}
                  style={[styles.recordCard, shadows.sm]}
                  onPress={() => {
                    setSelectedRecord(record);
                    setShowDetail(true);
                  }}
                >
                  <View style={styles.recordCardLeft}>
                    <View style={[styles.statusIcon, { backgroundColor: getStatusColor(record.status) + '20' }]}>
                      <Ionicons name="shield" size={24} color={getStatusColor(record.status)} />
                    </View>
                  </View>

                  <View style={styles.recordCardCenter}>
                    <Text style={styles.recordWorkerName}>{record.worker_name}</Text>
                    <Text style={styles.recordType}>{record.ppe_type_display}</Text>
                    <View style={styles.datesBox}>
                      <Text style={styles.dateText}>Vérification: {new Date(record.check_date).toLocaleDateString('fr-FR')}</Text>
                    </View>
                  </View>

                  <View style={styles.recordCardRight}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(record.status) + '20' }]}>
                      <Text style={[styles.statusBadgeText, { color: getStatusColor(record.status) }]}>
                        {getStatusLabel(record.status)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              ))}

              {/* Load More Button */}
              {hasNextPage && (
                <TouchableOpacity
                  style={[styles.loadMoreButton, { backgroundColor: ACCENT + '12', borderColor: ACCENT }]}
                  onPress={() => loadRecords(currentPage + 1)}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <ActivityIndicator color={ACCENT} size="small" />
                  ) : (
                    <>
                      <Ionicons name="arrow-down" size={16} color={ACCENT} style={{ marginRight: 8 }} />
                      <Text style={{ color: ACCENT, fontWeight: '600', fontSize: 14 }}>Charger plus</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </>
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

            </ScrollView>

            {/* Submit button OUTSIDE ScrollView — fixes React Native Web touch-interception bug */}
            <TouchableOpacity 
              style={[
                styles.submitButton,
                {
                  marginHorizontal: spacing.md,
                  marginBottom: spacing.md,
                  backgroundColor: !isFormValid ? '#9CA3AF' : ACCENT,
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
                  <Text style={styles.detailLabel}>Article EPI</Text>
                  <Text style={styles.detailValue}>{selectedRecord.ppe_type_display}</Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date de vérification</Text>
                  <Text style={styles.detailValue}>{new Date(selectedRecord.check_date).toLocaleDateString('fr-FR')}</Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type de vérification</Text>
                  <Text style={styles.detailValue}>{selectedRecord.check_type_display}</Text>
                </View>
                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Statut</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedRecord.status) + '20' }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(selectedRecord.status) }]}>
                      {getStatusLabel(selectedRecord.status)}
                    </Text>
                  </View>
                </View>
                <View style={styles.divider} />

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Conforme</Text>
                  <Text style={styles.detailValue}>{selectedRecord.is_compliant ? '✓ Oui' : '✗ Non'}</Text>
                </View>

                {selectedRecord.condition_notes && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Notes d'état</Text>
                      <Text style={styles.detailValue}>{selectedRecord.condition_notes}</Text>
                    </View>
                  </>
                )}

                {selectedRecord.non_compliance_reason && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Raison de non-conformité</Text>
                      <Text style={styles.detailValue}>{selectedRecord.non_compliance_reason}</Text>
                    </View>
                  </>
                )}

                {selectedRecord.corrective_action && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Action corrective</Text>
                      <Text style={styles.detailValue}>{selectedRecord.corrective_action}</Text>
                    </View>
                  </>
                )}

                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Vérifié par</Text>
                  <Text style={styles.detailValue}>{selectedRecord.checked_by_name || '—'}</Text>
                </View>
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
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    marginRight: spacing.sm,
  },
  contentSection: {
    paddingHorizontal: spacing.md,
    paddingBottom: 40,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    marginTop: spacing.md,
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
