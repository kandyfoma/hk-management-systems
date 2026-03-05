import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  Modal, Alert, ActivityIndicator, RefreshControl,
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
  const [ppeItems, setPpeItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'compliant' | 'non_compliant' | 'due_inspection'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PPEComplianceRecord | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [formData, setFormData] = useState({
    ppe_item: '',
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

  const loadPpeItems = async (workerId: string | number) => {
    setPpeItems([]);
    try {
      const api = ApiService.getInstance();
      // ?worker= is the DRF filterset param; ?worker_id= also handled by backend as fallback
      console.log(`[PPECompliance] Loading PPE items for worker ${workerId}...`);
      const response = await api.get('/occupational-health/ppe-items/', { worker: Number(workerId), page_size: 100 });
      console.log(`[PPECompliance] API Response:`, response);
      if (response.data) {
        const items = Array.isArray(response.data) ? response.data : response.data.results || [];
        console.log(`[PPECompliance] Found ${items.length} PPE items for worker ${workerId}:`, items);
        setPpeItems(items);
      } else {
        console.warn(`[PPECompliance] No data in response for worker ${workerId}`);
      }
    } catch (error) {
      console.error(`[PPECompliance] Error loading PPE items for worker ${workerId}:`, error);
      setPpeItems([]);
    }
  };

  const isFormValid = !!(selectedWorker && formData.ppe_item && formData.check_date && formData.check_type && formData.status);

  const handleSubmit = async () => {
    if (!selectedWorker || !formData.ppe_item || !formData.check_date || !formData.check_type || !formData.status) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs requis');
      return;
    }

    try {
      const api = ApiService.getInstance();

      const newRecord = {
        ppe_item: parseInt(formData.ppe_item, 10),
        check_date: formData.check_date,
        check_type: formData.check_type,
        status: formData.status,
        condition_notes: formData.condition_notes,
        is_compliant: formData.is_compliant,
        non_compliance_reason: formData.non_compliance_reason,
        corrective_action_required: formData.corrective_action_required,
        corrective_action: formData.corrective_action,
      };

      const response = await api.post('/occupational-health/ppe-compliance/', newRecord);
      if (response.success) {
        setRecords([...records, response.data]);
        setShowAddModal(false);
        setSelectedWorker(null);
        setPpeItems([]);
        setFormData({
          ppe_item: '',
          check_date: new Date().toISOString().split('T')[0],
          check_type: '',
          status: '',
          condition_notes: '',
          is_compliant: true,
          non_compliance_reason: '',
          corrective_action_required: false,
          corrective_action: '',
        });
        Alert.alert('Succès', 'Enregistrement de conformité EPI ajouté');
        loadRecords();
      }
    } catch (error) {
      console.error('Error creating PPE compliance record:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer le dossier');
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
                onChange={(worker) => {
                  setSelectedWorker(worker);
                  if (worker?.id) loadPpeItems(worker.id);
                }}
                label="Travailleur"
                placeholder="Sélectionnez un travailleur"
                error={selectedWorker === null ? 'Travailleur requis' : undefined}
              />

              <Text style={styles.formLabel}>EPI à vérifier</Text>
              {ppeItems.length > 0 ? (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={{ margin: -spacing.md, paddingHorizontal: spacing.md, marginVertical: spacing.md }}
                >
                  {ppeItems.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => setFormData({ ...formData, ppe_item: String(item.id) })}
                      style={[
                        { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.lg, marginRight: spacing.md, borderWidth: 1.5, minWidth: 100 },
                        formData.ppe_item === String(item.id)
                          ? { backgroundColor: ACCENT, borderColor: ACCENT }
                          : { backgroundColor: colors.surface, borderColor: colors.outline }
                      ]}
                    >
                      <Text style={[
                        { fontSize: 12, fontWeight: formData.ppe_item === String(item.id) ? '600' : '500' },
                        formData.ppe_item === String(item.id) ? { color: '#FFF' } : { color: colors.text }
                      ]}>
                        {item.ppe_type_display || item.ppe_type}
                      </Text>
                      {item.brand_model ? (
                        <Text style={[{ fontSize: 10, marginTop: 2 }, formData.ppe_item === String(item.id) ? { color: '#FFF', opacity: 0.8 } : { color: colors.textSecondary }]}>
                          {item.brand_model}
                        </Text>
                      ) : null}
                      {item.standard_ref ? (
                        <Text style={[{ fontSize: 9, marginTop: 1 }, formData.ppe_item === String(item.id) ? { color: '#FFF', opacity: 0.7 } : { color: colors.textSecondary }]}>
                          {item.standard_ref}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : selectedWorker ? (
                <View style={{ paddingVertical: spacing.md, paddingHorizontal: spacing.md, backgroundColor: colors.warning + '12', borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.warning + '30' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                    <Ionicons name="alert-circle" size={20} color={colors.warning} style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.warning, marginBottom: 4 }}>Aucun EPI assigné</Text>
                      <Text style={{ fontSize: 11, color: colors.warning, lineHeight: 16 }}>
                        Ce travailleur n'a aucun équipement EPI enregistré. Vous devez d'abord{'\n'}
                        <Text style={{ fontWeight: '600' }}>créer et assigner des articles EPI</Text> via l'écran{'\n'}
                        <Text style={{ fontStyle: 'italic' }}>Gestion EPI</Text> (catalogue d'équipements).
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginVertical: spacing.md }}>Sélectionnez d'abord un travailleur</Text>
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

              {/* Debug validation status */}
              <View style={{ marginTop: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.info + '14', borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.info + '40' }}>
                <Text style={{ fontSize: 11, color: colors.info, fontWeight: '700', marginBottom: 4 }}>État de validation:</Text>
                <Text style={{ fontSize: 10, color: colors.info }}>
                  {selectedWorker ? '✓' : '✗'} Travailleur{'\n'}
                  {formData.ppe_item ? '✓' : '✗'} EPI sélectionné{'\n'}
                  {formData.check_date ? '✓' : '✗'} Date: {formData.check_date}{'\n'}
                  {formData.check_type ? '✓' : `✗ Type: ${formData.check_type || 'aucun'}`}{'\n'}
                  {formData.status ? '✓' : `✗ Statut: ${formData.status || 'aucun'}`}
                </Text>
                {ppeItems.length === 0 && selectedWorker && (
                  <Text style={{ fontSize: 10, color: colors.warning, marginTop: 8, fontWeight: '600' }}>
                    ⚠️ Ce travailleur n'a aucun EPI assigné. Ajoutez d'abord des équipements.
                  </Text>
                )}
              </View>

              <TouchableOpacity 
                style={[styles.submitButton, { backgroundColor: ACCENT, opacity: isFormValid ? 1 : 0.5 }]} 
                onPress={handleSubmit}
                disabled={!isFormValid}
              >
                <Text style={styles.submitButtonText}>Enregistrer</Text>
              </TouchableOpacity>
            </ScrollView>
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
});
