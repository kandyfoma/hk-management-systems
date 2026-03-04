/**
 * OverexposureAlertScreen
 *
 * Gestion des alertes de surexposition professionnelle – conforme :
 *   • ISO 45001:2018 §8.1.4 – hiérarchie des mesures de maîtrise
 *   • ISO 45001:2018 §9.1   – surveillance et mesure de la performance
 *   • OSHA 29 CFR 1910.1000 – niveaux PEL/TWA
 *   • ACGIH TLV/BEI         – valeurs limites d'exposition
 *   • OIT Convention 161    – services de santé au travail
 *
 * Workflow : Actif → Accusé réception (qui + quand) → Résolu (action documentée)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  Dimensions, Modal, Alert, FlatList, ActivityIndicator, RefreshControl, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { occHealthApi } from '../../../services/OccHealthApiService';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const ACCENT = colors.primary;

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface OverexposureAlert {
  id: number;
  worker: number;
  worker_name: string;
  worker_employee_id: string;
  enterprise_name: string;
  exposure_type: string;
  exposure_level: string;       // DecimalField → string from DRF
  exposure_threshold: string;
  unit_measurement: string;
  severity: 'warning' | 'critical' | 'emergency';
  severity_display: string;
  status: 'active' | 'acknowledged' | 'resolved';
  status_display: string;
  detected_date: string;
  acknowledged_date: string | null;
  resolved_date: string | null;
  recommended_action: string;
  action_taken: string;
  acknowledged_by_name: string | null;
  medical_followup_required: boolean;
  medical_followup_date: string | null;
}

interface WorkerOption {
  id: number;
  firstName: string;
  lastName: string;
  employeeId: string;
}

interface CreateForm {
  worker: number | null;
  workerLabel: string;
  exposure_type: string;
  exposure_level: string;
  exposure_threshold: string;
  unit_measurement: string;
  severity: 'warning' | 'critical' | 'emergency';
  recommended_action: string;
  medical_followup_required: boolean;
  medical_followup_date: string;
}

interface ResolveForm {
  alertId: number;
  action_taken: string;
  medical_followup_required: boolean;
  medical_followup_date: string;
}

type StatusFilter   = 'all' | 'active' | 'acknowledged' | 'resolved';
type SeverityFilter = 'all' | 'warning' | 'critical' | 'emergency';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const SEV_COLORS: Record<string, string> = {
  warning:   '#F59E0B',
  critical:  '#EF4444',
  emergency: '#7C3AED',
};

const SEV_BG: Record<string, string> = {
  warning:   '#FEF9C3',
  critical:  '#FEE2E2',
  emergency: '#EDE9FE',
};

const SEV_LABELS: Record<string, string> = {
  warning:   'AVERTISSEMENT',
  critical:  'CRITIQUE',
  emergency: 'URGENCE',
};

const STATUS_COLORS: Record<string, string> = {
  active:       '#EF4444',
  acknowledged: '#F59E0B',
  resolved:     '#22C55E',
};

const STATUS_LABELS: Record<string, string> = {
  active:       'Actif',
  acknowledged: 'Accusé réception',
  resolved:     'Résolu',
};

/** ISO 45001 §8.1.4 – hiérarchie des mesures de maîtrise selon le type d'exposition */
function getHierarchyHint(exposureType: string): string {
  const et = (exposureType || '').toLowerCase();
  if (et.includes('bruit') || et.includes('noise') || et.includes('sonore')) {
    return 'Contrôle : encoffrement source → barrières acoustiques → réduction durée → protecteurs auditifs (EN 352)';
  }
  if (et.includes('chimique') || et.includes('poussière') || et.includes('dust') || et.includes('fume')) {
    return 'Contrôle : substitution → ventilation locale aspirante → confinement → EPI respiratoire (EN 143/EN 149)';
  }
  if (et.includes('rayonnement') || et.includes('radiation') || et.includes('uv') || et.includes('x-ray')) {
    return 'Contrôle : blindage → distance accrue → réduction du temps → dosimétrie → EPI spécialisé';
  }
  if (et.includes('chaleur') || et.includes('heat') || et.includes('thermique')) {
    return 'Contrôle : isolation thermique → ventilation/climatisation → pauses → acclimation → EPI thermique';
  }
  if (et.includes('vibration')) {
    return 'Contrôle : outils à faible vibration → poignées anti-vibratiles → rotation postes → gants anti-vibration (EN ISO 10819)';
  }
  return 'Contrôle (ISO 45001 §8.1.4) : Élimination → Substitution → Contrôles techniques → Contrôles administratifs → EPI';
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return iso; }
}

function fmtDatetime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function calcExceedance(level: string, threshold: string): string {
  const l = parseFloat(level);
  const t = parseFloat(threshold);
  if (!t || isNaN(l) || isNaN(t)) return '—';
  return `+${(((l - t) / t) * 100).toFixed(0)}%`;
}

const EMPTY_CREATE: CreateForm = {
  worker: null, workerLabel: '',
  exposure_type: '', exposure_level: '', exposure_threshold: '',
  unit_measurement: 'mg/m³', severity: 'warning',
  recommended_action: '', medical_followup_required: false, medical_followup_date: '',
};

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export function OverexposureAlertScreen() {
  // Data
  const [alerts, setAlerts]           = useState<OverexposureAlert[]>([]);
  const [criticalAlerts, setCritical] = useState<OverexposureAlert[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearch]        = useState('');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
  const [filterSeverity, setFilterSev]  = useState<SeverityFilter>('all');

  // Bulk selection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds]     = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy]           = useState(false);

  // Modals
  const [detailAlert, setDetailAlert] = useState<OverexposureAlert | null>(null);
  const [resolveForm, setResolveForm] = useState<ResolveForm | null>(null);
  const [resolveBusy, setResolveBusy] = useState(false);
  const [showCreate, setShowCreate]   = useState(false);
  const [createForm, setCreateForm]   = useState<CreateForm>(EMPTY_CREATE);
  const [createBusy, setCreateBusy]   = useState(false);

  // Worker picker (pre-loaded, filtered client-side)
  const [allWorkers, setAllWorkers]               = useState<WorkerOption[]>([]);
  const [loadingWorkers, setLoadingWorkers]       = useState(false);
  const [workerSearchText, setWorkerSearchText]   = useState('');
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);

  const filteredWorkers = useMemo(() => {
    const q = workerSearchText.toLowerCase();
    if (!q) return allWorkers;
    return allWorkers.filter(w =>
      `${w.firstName} ${w.lastName}`.toLowerCase().includes(q) ||
      w.employeeId.toLowerCase().includes(q)
    );
  }, [allWorkers, workerSearchText]);

  // Load workers once when create modal opens
  useEffect(() => {
    if (!showCreate) return;
    if (allWorkers.length > 0) return;
    setLoadingWorkers(true);
    occHealthApi.listWorkers({ page_size: 200 }).then(res => {
      setLoadingWorkers(false);
      if (!res.error) {
        setAllWorkers(res.data.map((w: any) => ({
          id: w.id,
          firstName: w.firstName ?? w.first_name ?? '',
          lastName:  w.lastName  ?? w.last_name  ?? '',
          employeeId: w.employeeId ?? w.employee_id ?? '',
        })));
      }
    });
  }, [showCreate]);

  // ── Load ──────────────────────────────────────────────────

  const loadAll = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const [alertsRes, critRes] = await Promise.all([
        occHealthApi.listOverexposureAlerts({ page_size: 200 }),
        occHealthApi.listCriticalAlerts(),
      ]);
      if (alertsRes.error) { setError(alertsRes.error); }
      else { setAlerts(alertsRes.data as OverexposureAlert[]); }
      if (!critRes.error) { setCritical(critRes.data as OverexposureAlert[]); }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const onRefresh = () => { setRefreshing(true); loadAll(true); };

  // ── Filtered list ─────────────────────────────────────────

  const filtered = useMemo(() => alerts.filter(a => {
    const q = searchQuery.toLowerCase();
    const matchQ = !q
      || (a.worker_name ?? '').toLowerCase().includes(q)
      || (a.exposure_type ?? '').toLowerCase().includes(q)
      || (a.worker_employee_id ?? '').toLowerCase().includes(q);
    const matchS   = filterStatus   === 'all' || a.status   === filterStatus;
    const matchSev = filterSeverity === 'all' || a.severity === filterSeverity;
    return matchQ && matchS && matchSev;
  }), [alerts, searchQuery, filterStatus, filterSeverity]);

  // ── Stats ─────────────────────────────────────────────────

  const stats = useMemo(() => ({
    active:   alerts.filter(a => a.status === 'active').length,
    highRisk: alerts.filter(a => a.status === 'active' && (a.severity === 'critical' || a.severity === 'emergency')).length,
    followUp: alerts.filter(a => a.medical_followup_required && a.status !== 'resolved').length,
    resolved: alerts.filter(a => a.status === 'resolved').length,
  }), [alerts]);

  // ── Acknowledge ───────────────────────────────────────────

  const handleAcknowledge = async (alert: OverexposureAlert) => {
    const res = await occHealthApi.acknowledgeOverexposureAlert(alert.id);
    if (res.error) { Alert.alert('Erreur', res.error); return; }
    const updated = { ...alert, ...res.data };
    setAlerts(prev => prev.map(a => a.id === alert.id ? updated : a));
    if (detailAlert?.id === alert.id) setDetailAlert(updated);
  };

  // ── Resolve ───────────────────────────────────────────────

  const openResolveModal = (alert: OverexposureAlert) => {
    setResolveForm({
      alertId: alert.id,
      action_taken: alert.action_taken ?? '',
      medical_followup_required: alert.medical_followup_required,
      medical_followup_date: alert.medical_followup_date ?? '',
    });
  };

  const submitResolve = async () => {
    if (!resolveForm) return;
    if (!resolveForm.action_taken.trim()) {
      Alert.alert('Champ requis', 'Veuillez documenter les actions correctives (obligatoire ISO 45001 §10.2).');
      return;
    }
    setResolveBusy(true);
    try {
      const patch = await occHealthApi.patchOverexposureAlert(resolveForm.alertId, {
        action_taken: resolveForm.action_taken,
        medical_followup_required: resolveForm.medical_followup_required,
        medical_followup_date: resolveForm.medical_followup_date || null,
      });
      if (patch.error) { Alert.alert('Erreur', patch.error); return; }
      const res = await occHealthApi.resolveOverexposureAlert(resolveForm.alertId);
      if (res.error) { Alert.alert('Erreur', res.error); return; }
      const updated = { ...patch.data, ...res.data };
      setAlerts(prev => prev.map(a => a.id === resolveForm.alertId ? { ...a, ...updated } : a));
      if (detailAlert?.id === resolveForm.alertId) setDetailAlert(d => d ? { ...d, ...updated } : d);
      setResolveForm(null);
    } finally { setResolveBusy(false); }
  };

  // ── Bulk acknowledge ──────────────────────────────────────

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const submitBulk = async () => {
    if (!selectedIds.size) return;
    setBulkBusy(true);
    const res = await occHealthApi.bulkAcknowledgeAlerts(Array.from(selectedIds));
    setBulkBusy(false);
    if (res.error) { Alert.alert('Erreur', res.error); return; }
    setSelectionMode(false);
    setSelectedIds(new Set());
    loadAll(true);
  };

  // ── Create ────────────────────────────────────────────────

  const selectWorker = (w: WorkerOption) => {
    setCreateForm(f => ({ ...f, worker: w.id, workerLabel: `${w.firstName} ${w.lastName} (${w.employeeId})` }));
    setWorkerSearchText(`${w.firstName} ${w.lastName}`);
    setShowWorkerDropdown(false);
  };

  const clearWorker = () => {
    setCreateForm(f => ({ ...f, worker: null, workerLabel: '' }));
    setWorkerSearchText('');
    setShowWorkerDropdown(false);
  };

  const submitCreate = async () => {
    if (!createForm.worker) { Alert.alert('Champ requis', 'Sélectionnez un travailleur.'); return; }
    if (!createForm.exposure_type.trim()) { Alert.alert('Champ requis', "Renseignez le type d'exposition."); return; }
    if (!createForm.exposure_level || !createForm.exposure_threshold) {
      Alert.alert('Champ requis', 'Renseignez le niveau mesuré et le seuil réglementaire.'); return;
    }
    setCreateBusy(true);
    const res = await occHealthApi.createOverexposureAlert({
      worker:              createForm.worker,
      exposure_type:       createForm.exposure_type,
      exposure_level:      parseFloat(createForm.exposure_level),
      exposure_threshold:  parseFloat(createForm.exposure_threshold),
      unit_measurement:    createForm.unit_measurement,
      severity:            createForm.severity,
      recommended_action:  createForm.recommended_action,
      medical_followup_required: createForm.medical_followup_required,
      medical_followup_date: createForm.medical_followup_date || null,
    });
    setCreateBusy(false);
    if (res.error) { Alert.alert('Erreur', res.error); return; }
    setShowCreate(false);
    setCreateForm(EMPTY_CREATE);
    setWorkerSearchText('');
    setShowWorkerDropdown(false);
    loadAll(true);
    Alert.alert('Alerte créée', "L'alerte de surexposition a été enregistrée.");
  };

  // ─────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────

  const renderSeverityBadge = (severity: string) => (
    <View style={[styles.severityBadge, { backgroundColor: SEV_COLORS[severity] ?? '#6B7280' }]}>
      <Text style={styles.badgeText}>{SEV_LABELS[severity] ?? severity.toUpperCase()}</Text>
    </View>
  );

  const renderStatusChip = (status: string) => (
    <View style={[styles.statusChip, { borderColor: STATUS_COLORS[status] ?? '#6B7280' }]}>
      <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] ?? '#6B7280' }]} />
      <Text style={[styles.statusChipText, { color: STATUS_COLORS[status] ?? '#6B7280' }]}>
        {STATUS_LABELS[status] ?? status}
      </Text>
    </View>
  );

  const renderAlertCard = ({ item }: { item: OverexposureAlert }) => {
    const isSelected = selectedIds.has(item.id);
    const exceedance = calcExceedance(item.exposure_level, item.exposure_threshold);
    const sevColor   = SEV_COLORS[item.severity] ?? '#6B7280';
    const hint       = getHierarchyHint(item.exposure_type);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { borderLeftColor: sevColor },
          isSelected && styles.cardSelected,
        ]}
        onPress={() => selectionMode ? toggleSelect(item.id) : setDetailAlert(item)}
        onLongPress={() => { setSelectionMode(true); toggleSelect(item.id); }}
        activeOpacity={0.85}
      >
        {/* Card header */}
        <View style={styles.cardHeader}>
          {selectionMode && (
            <View style={[styles.checkbox, isSelected && { backgroundColor: ACCENT, borderColor: ACCENT }]}>
              {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>{item.worker_name || '—'}</Text>
              {item.worker_employee_id ? (
                <Text style={styles.cardEmpId}> #{item.worker_employee_id}</Text>
              ) : null}
            </View>
            <Text style={styles.cardMeta}>{item.exposure_type}</Text>
            {item.enterprise_name ? (
              <Text style={styles.cardEnterprise}>{item.enterprise_name}</Text>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            {renderSeverityBadge(item.severity)}
            {renderStatusChip(item.status)}
          </View>
        </View>

        {/* Exposure metrics */}
        <View style={[styles.exposureBox, { borderLeftColor: sevColor }]}>
          <View style={styles.exposureItem}>
            <Text style={styles.exposureLabel}>MESURÉ</Text>
            <Text style={[styles.exposureValue, { color: sevColor }]}>
              {parseFloat(item.exposure_level).toFixed(3)}
            </Text>
            <Text style={styles.exposureUnit}>{item.unit_measurement}</Text>
          </View>
          <View style={styles.exposureDivider} />
          <View style={styles.exposureItem}>
            <Text style={styles.exposureLabel}>SEUIL (PEL/TLV)</Text>
            <Text style={styles.exposureValue}>{parseFloat(item.exposure_threshold).toFixed(3)}</Text>
            <Text style={styles.exposureUnit}>{item.unit_measurement}</Text>
          </View>
          <View style={styles.exposureDivider} />
          <View style={styles.exposureItem}>
            <Text style={styles.exposureLabel}>DÉPASSEMENT</Text>
            <Text style={[styles.exposureValue, { color: sevColor, fontSize: 16 }]}>{exceedance}</Text>
            <Text style={styles.exposureUnit}>vs seuil</Text>
          </View>
        </View>

        {/* ISO hierarchy hint */}
        <View style={[styles.hintBox, { borderColor: SEV_BG[item.severity] ?? '#F3F4F6' }]}>
          <Ionicons name="shield-checkmark-outline" size={13} color={sevColor} style={{ marginRight: 6 }} />
          <Text style={[styles.hintText, { color: sevColor }]}>{hint}</Text>
        </View>

        {item.recommended_action ? (
          <Text style={styles.actionText} numberOfLines={2}>
            <Text style={styles.actionLabel}>Action recommandée : </Text>
            {item.recommended_action}
          </Text>
        ) : null}

        {/* Medical follow-up flag */}
        {item.medical_followup_required && (
          <View style={styles.followUpBanner}>
            <Ionicons name="medical-outline" size={13} color="#7C3AED" />
            <Text style={styles.followUpText}>
              Suivi médical requis
              {item.medical_followup_date ? ` — avant le ${fmtDate(item.medical_followup_date)}` : ''}
            </Text>
          </View>
        )}

        {/* Action buttons */}
        {!selectionMode && item.status !== 'resolved' && (
          <View style={styles.actionRow}>
            {item.status === 'active' && (
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' }]}
                onPress={() => handleAcknowledge(item)}
              >
                <Ionicons name="eye-outline" size={15} color="#F59E0B" />
                <Text style={[styles.actionBtnText, { color: '#F59E0B' }]}>Accuser réception</Text>
              </TouchableOpacity>
            )}
            {item.status === 'acknowledged' && (
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: '#22C55E', backgroundColor: '#F0FDF4' }]}
                onPress={() => openResolveModal(item)}
              >
                <Ionicons name="checkmark-circle-outline" size={15} color="#22C55E" />
                <Text style={[styles.actionBtnText, { color: '#22C55E' }]}>Résoudre</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: ACCENT, backgroundColor: colors.background }]}
              onPress={() => setDetailAlert(item)}
            >
              <Ionicons name="document-text-outline" size={15} color={ACCENT} />
              <Text style={[styles.actionBtnText, { color: ACCENT }]}>Détails</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.cardDate}>Détecté le {fmtDatetime(item.detected_date)}</Text>
      </TouchableOpacity>
    );
  };

  // ─────────────────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.screenTitle}>Alertes de Surexposition</Text>
          <Text style={styles.screenSubtitle}>
            Dépassements de seuils réglementaires — Actions correctives requises
          </Text>
        </View>
        <View style={styles.headerBtns}>
          {selectionMode ? (
            <>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: '#F59E0B' }]}
                onPress={submitBulk}
                disabled={bulkBusy || !selectedIds.size}
              >
                {bulkBusy
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <><Ionicons name="eye-outline" size={17} color="#FFF" />
                    <Text style={styles.addButtonText}>Accuser ({selectedIds.size})</Text></>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.surface, marginLeft: 8 }]}
                onPress={() => { setSelectionMode(false); setSelectedIds(new Set()); }}
              >
                <Text style={[styles.addButtonText, { color: colors.text }]}>Annuler</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: '#DC2626' }]}
              onPress={() => setShowCreate(true)}
            >
              <Ionicons name="add-circle" size={18} color="#FFF" />
              <Text style={styles.addButtonText}>Nouvelle alerte</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Critical banner ── */}
      {criticalAlerts.length > 0 && (
        <View style={styles.criticalBanner}>
          <Ionicons name="warning" size={20} color="#FFF" />
          <Text style={styles.criticalBannerText}>
            {criticalAlerts.length} alerte{criticalAlerts.length > 1 ? 's' : ''} critique
            {criticalAlerts.length > 1 ? 's' : ''} / urgences actives — Intervention immédiate requise
          </Text>
        </View>
      )}

      {/* ── Stats ── */}
      <View style={styles.statsRow}>
        {[
          { label: 'Alertes actives', value: stats.active,   color: '#EF4444' },
          { label: 'Haut risque',     value: stats.highRisk, color: '#7C3AED' },
          { label: 'Suivi médical',   value: stats.followUp, color: '#F59E0B' },
          { label: 'Résolues',        value: stats.resolved, color: '#22C55E' },
        ].map(s => (
          <View key={s.label} style={styles.statCard}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Filters ── */}
      <View style={styles.filterBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Travailleur, type d'exposition, matricule…"
            value={searchQuery}
            onChangeText={setSearch}
            placeholderTextColor={colors.placeholder}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
          <View style={styles.filterPillRow}>
            {(['all', 'active', 'acknowledged', 'resolved'] as StatusFilter[]).map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.filterPill, filterStatus === s && { backgroundColor: ACCENT }]}
                onPress={() => setFilterStatus(s)}
              >
                <Text style={[styles.filterPillText, filterStatus === s && { color: '#FFF' }]}>
                  {s === 'all' ? 'Tous' : STATUS_LABELS[s]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterPillRow}>
            {(['all', 'warning', 'critical', 'emergency'] as SeverityFilter[]).map(sv => (
              <TouchableOpacity
                key={sv}
                style={[
                  styles.filterPill,
                  filterSeverity === sv && {
                    backgroundColor: sv === 'all' ? ACCENT : (SEV_COLORS[sv] ?? ACCENT),
                  },
                ]}
                onPress={() => setFilterSev(sv)}
              >
                <Text style={[styles.filterPillText, filterSeverity === sv && { color: '#FFF' }]}>
                  {sv === 'all' ? 'Toutes gravités' : SEV_LABELS[sv]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* ── List ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Chargement des alertes…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.textSecondary} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadAll()}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          scrollEnabled={false}
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={renderAlertCard}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="shield-checkmark-outline" size={48} color="#22C55E" />
              <Text style={styles.emptyTitle}>Aucune alerte</Text>
              <Text style={styles.emptyText}>
                {filterStatus !== 'all' || filterSeverity !== 'all' || searchQuery
                  ? 'Aucune alerte ne correspond aux filtres sélectionnés.'
                  : "Aucun dépassement de seuil enregistré. Les niveaux d'exposition sont conformes."}
              </Text>
            </View>
          }
        />
      )}

      {/* ══════════════════════════════════════════════════════
          DETAIL MODAL
      ══════════════════════════════════════════════════════ */}
      <Modal visible={!!detailAlert} animationType="slide" transparent onRequestClose={() => setDetailAlert(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Détail de l'alerte</Text>
              <TouchableOpacity onPress={() => setDetailAlert(null)}>
                <Ionicons name="close-circle-outline" size={28} color={ACCENT} />
              </TouchableOpacity>
            </View>
            {detailAlert && (
              <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
                {/* Severity banner */}
                <View style={[
                  styles.detailSevBanner,
                  { backgroundColor: SEV_BG[detailAlert.severity] ?? '#F3F4F6', borderColor: SEV_COLORS[detailAlert.severity] ?? '#6B7280' },
                ]}>
                  {renderSeverityBadge(detailAlert.severity)}
                  {renderStatusChip(detailAlert.status)}
                </View>

                <Text style={styles.detailSection}>Informations du travailleur</Text>
                <DetailRow label="Travailleur"  value={detailAlert.worker_name || '—'} />
                <DetailRow label="Matricule"    value={detailAlert.worker_employee_id || '—'} />
                <DetailRow label="Entreprise"   value={detailAlert.enterprise_name || '—'} />

                <Text style={styles.detailSection}>Données d'exposition</Text>
                <DetailRow label="Type d'exposition" value={detailAlert.exposure_type} />
                <DetailRow
                  label="Niveau mesuré"
                  value={`${parseFloat(detailAlert.exposure_level).toFixed(4)} ${detailAlert.unit_measurement}`}
                />
                <DetailRow
                  label="Seuil réglementaire (PEL/TLV)"
                  value={`${parseFloat(detailAlert.exposure_threshold).toFixed(4)} ${detailAlert.unit_measurement}`}
                />
                <DetailRow
                  label="Dépassement"
                  value={calcExceedance(detailAlert.exposure_level, detailAlert.exposure_threshold)}
                  highlight={SEV_COLORS[detailAlert.severity]}
                />
                <DetailRow label="Détecté le" value={fmtDatetime(detailAlert.detected_date)} />

                <Text style={styles.detailSection}>Actions correctives (ISO 45001 §10.2)</Text>
                <DetailRow label="Action recommandée" value={detailAlert.recommended_action || '—'} />
                <DetailRow label="Action réalisée"    value={detailAlert.action_taken || 'Non documentée'} />

                <Text style={styles.detailSection}>Traçabilité</Text>
                <DetailRow label="Accusé réception par"   value={detailAlert.acknowledged_by_name || '—'} />
                <DetailRow label="Date accusé réception"  value={fmtDatetime(detailAlert.acknowledged_date)} />
                <DetailRow label="Date de résolution"     value={fmtDatetime(detailAlert.resolved_date)} />

                <Text style={styles.detailSection}>Surveillance médicale (OIT C.161)</Text>
                <DetailRow label="Suivi médical requis"  value={detailAlert.medical_followup_required ? 'Oui' : 'Non'} />
                <DetailRow label="Échéance suivi"        value={fmtDate(detailAlert.medical_followup_date)} />

                <Text style={[styles.detailSection, { marginTop: spacing.md }]}>Mesures de maîtrise préconisées</Text>
                <View style={styles.hierarchyBox}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={ACCENT} style={{ marginBottom: 6 }} />
                  <Text style={styles.hierarchyText}>{getHierarchyHint(detailAlert.exposure_type)}</Text>
                </View>

                {/* Action buttons inside detail */}
                {detailAlert.status !== 'resolved' && (
                  <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
                    {detailAlert.status === 'active' && (
                      <TouchableOpacity
                        style={[styles.modalActionBtn, { backgroundColor: '#FFFBEB', borderColor: '#F59E0B' }]}
                        onPress={() => handleAcknowledge(detailAlert)}
                      >
                        <Ionicons name="eye-outline" size={16} color="#F59E0B" />
                        <Text style={[styles.modalActionBtnText, { color: '#F59E0B' }]}>Accuser réception</Text>
                      </TouchableOpacity>
                    )}
                    {detailAlert.status === 'acknowledged' && (
                      <TouchableOpacity
                        style={[styles.modalActionBtn, { backgroundColor: '#F0FDF4', borderColor: '#22C55E' }]}
                        onPress={() => { setDetailAlert(null); openResolveModal(detailAlert); }}
                      >
                        <Ionicons name="checkmark-circle-outline" size={16} color="#22C55E" />
                        <Text style={[styles.modalActionBtnText, { color: '#22C55E' }]}>Résoudre l'alerte</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <View style={{ height: spacing.xl }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          RESOLVE MODAL
      ══════════════════════════════════════════════════════ */}
      <Modal visible={!!resolveForm} animationType="slide" transparent onRequestClose={() => setResolveForm(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Résolution de l'alerte</Text>
              <TouchableOpacity onPress={() => setResolveForm(null)}>
                <Ionicons name="close-circle-outline" size={28} color={ACCENT} />
              </TouchableOpacity>
            </View>
            {resolveForm && (
              <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle-outline" size={16} color={ACCENT} />
                  <Text style={styles.infoBoxText}>
                    La documentation des actions correctives est obligatoire (ISO 45001 §10.2 – traçabilité des mesures de maîtrise).
                  </Text>
                </View>

                <Text style={styles.formLabel}>Actions correctives réalisées *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Décrivez les mesures prises : contrôle à la source, EPI fournis, réduction du temps d'exposition, formation, etc."
                  value={resolveForm.action_taken}
                  onChangeText={v => setResolveForm(f => f ? { ...f, action_taken: v } : f)}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={colors.placeholder}
                />

                <Text style={styles.formLabel}>Suivi médical requis (OIT C.161)</Text>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Requiert un suivi médical spécialisé</Text>
                  <Switch
                    value={resolveForm.medical_followup_required}
                    onValueChange={v => setResolveForm(f => f ? { ...f, medical_followup_required: v } : f)}
                    trackColor={{ true: ACCENT }}
                  />
                </View>

                {resolveForm.medical_followup_required && (
                  <>
                    <Text style={styles.formLabel}>Date limite de consultation</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="AAAA-MM-JJ"
                      value={resolveForm.medical_followup_date}
                      onChangeText={v => setResolveForm(f => f ? { ...f, medical_followup_date: v } : f)}
                      placeholderTextColor={colors.placeholder}
                    />
                  </>
                )}

                <TouchableOpacity
                  style={[styles.submitBtn, resolveBusy && { opacity: 0.6 }]}
                  onPress={submitResolve}
                  disabled={resolveBusy}
                >
                  {resolveBusy
                    ? <ActivityIndicator size="small" color="#FFF" />
                    : <><Ionicons name="checkmark-circle" size={18} color="#FFF" />
                      <Text style={styles.submitBtnText}>Confirmer la résolution</Text></>
                  }
                </TouchableOpacity>
                <View style={{ height: spacing.xl }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          CREATE MODAL
      ══════════════════════════════════════════════════════ */}
      <Modal
        visible={showCreate}
        animationType={isDesktop ? 'fade' : 'slide'}
        transparent
        onRequestClose={() => { setShowCreate(false); setWorkerSearchText(''); setShowWorkerDropdown(false); }}
      >
        <View style={[styles.modalOverlay, isDesktop && styles.modalOverlayDesktop]}>
          <View style={[styles.modalContent, isDesktop && { ...styles.modalContentDesktop, width: '60%', maxWidth: 720, maxHeight: '94%' }]}>

            {/* Header */}
            <View style={[styles.modalHeader, { borderTopColor: '#DC2626', borderTopWidth: 4 }]}>
              <Text style={styles.modalTitle}>Nouvelle alerte de surexposition</Text>
              <TouchableOpacity
                onPress={() => { setShowCreate(false); setWorkerSearchText(''); setShowWorkerDropdown(false); }}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.createModalBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >

              {/* ── Travailleur ── */}
              <View style={styles.createSection}>
                <View style={styles.workerSectionHeader}>
                  <Ionicons name="person-circle-outline" size={18} color={colors.primary} />
                  <Text style={styles.createSectionLabel}>Travailleur *</Text>
                </View>

                {createForm.worker ? (
                  <View style={[styles.workerSelectedCard, styles.cardShadow]}>
                    <View style={styles.workerSelectedLeft}>
                      <View style={[styles.workerAvatar, { backgroundColor: colors.primary + '20' }]}>
                        <Ionicons name="person" size={16} color={colors.primary} />
                      </View>
                      <View style={styles.workerSelectedInfo}>
                        <Text style={styles.workerSelectedName}>{createForm.workerLabel.split(' (')[0]}</Text>
                        <Text style={styles.workerSelectedId}>ID travailleur : {createForm.worker}</Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.workerClearBtn} onPress={clearWorker}>
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={[styles.workerSearchBox, showWorkerDropdown && { borderColor: colors.primary, borderWidth: 2 }]}>
                      <Ionicons name="search" size={16} color={colors.textSecondary} />
                      <TextInput
                        style={styles.workerSearchInput}
                        placeholder="Rechercher par nom ou matricule…"
                        placeholderTextColor={colors.textSecondary}
                        value={workerSearchText}
                        onChangeText={text => { setWorkerSearchText(text); setShowWorkerDropdown(true); }}
                        onFocus={() => setShowWorkerDropdown(true)}
                      />
                      {workerSearchText ? (
                        <TouchableOpacity onPress={() => setWorkerSearchText('')}>
                          <Ionicons name="close-outline" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    {showWorkerDropdown && (
                      <View style={[styles.workerDropdown, styles.cardShadow]}>
                        {loadingWorkers ? (
                          <View style={styles.workerDropdownLoading}>
                            <ActivityIndicator size="small" color={colors.primary} />
                            <Text style={styles.workerDropdownLoadingText}>Chargement des travailleurs...</Text>
                          </View>
                        ) : filteredWorkers.length > 0 ? (
                          <FlatList
                            scrollEnabled
                            data={filteredWorkers}
                            keyExtractor={item => String(item.id)}
                            renderItem={({ item }) => (
                              <TouchableOpacity
                                style={styles.workerDropdownItem}
                                onPress={() => selectWorker(item)}
                              >
                                <View style={[styles.workerItemAvatar, { backgroundColor: colors.primary + '15' }]}>
                                  <Text style={styles.workerItemAvatarText}>
                                    {((item.firstName || item.lastName || '?').charAt(0)).toUpperCase()}
                                  </Text>
                                </View>
                                <View style={styles.workerItemInfo}>
                                  <Text style={styles.workerItemName}>{`${item.firstName} ${item.lastName}`.trim()}</Text>
                                  <Text style={styles.workerItemId}>ID : {item.employeeId || item.id}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                              </TouchableOpacity>
                            )}
                            nestedScrollEnabled
                            maxToRenderPerBatch={10}
                            initialNumToRender={10}
                            style={{ maxHeight: 280 }}
                          />
                        ) : (
                          <View style={styles.workerDropdownEmpty}>
                            <Ionicons name="people-outline" size={24} color={colors.textSecondary} />
                            <Text style={styles.workerDropdownEmptyText}>
                              {workerSearchText ? 'Aucun travailleur trouvé' : 'Aucun travailleur disponible'}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </>
                )}
                <Text style={styles.workerHelperText}>
                  Lier le travailleur exposé pour la traçabilité ISO 45001
                </Text>
              </View>

              {/* ── Type d'exposition ── */}
              <View style={styles.createSection}>
                <Text style={styles.createSectionLabel}>Type d'exposition *</Text>
                <TextInput
                  style={styles.createField}
                  placeholder="Ex : Poussière de cobalt, Bruit, Benzène…"
                  value={createForm.exposure_type}
                  onChangeText={v => setCreateForm(f => ({ ...f, exposure_type: v }))}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* ── Niveaux ── */}
              <View style={styles.createSection}>
                <Text style={styles.createSectionLabel}>Niveaux d'exposition *</Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.createFieldSub}>Niveau mesuré</Text>
                    <TextInput
                      style={styles.createField}
                      placeholder="0.050"
                      keyboardType="decimal-pad"
                      value={createForm.exposure_level}
                      onChangeText={v => setCreateForm(f => ({ ...f, exposure_level: v }))}
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.createFieldSub}>Seuil (PEL/TLV)</Text>
                    <TextInput
                      style={styles.createField}
                      placeholder="0.020"
                      keyboardType="decimal-pad"
                      value={createForm.exposure_threshold}
                      onChangeText={v => setCreateForm(f => ({ ...f, exposure_threshold: v }))}
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>
              </View>

              {/* ── Unité ── */}
              <View style={styles.createSection}>
                <Text style={styles.createSectionLabel}>Unité de mesure</Text>
                <TextInput
                  style={styles.createField}
                  placeholder="mg/m³, ppm, dB(A), °C…"
                  value={createForm.unit_measurement}
                  onChangeText={v => setCreateForm(f => ({ ...f, unit_measurement: v }))}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* ── Gravité ── */}
              <View style={styles.createSection}>
                <Text style={styles.createSectionLabel}>Niveau de gravité</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
                  {(['warning', 'critical', 'emergency'] as const).map(sv => (
                    <TouchableOpacity
                      key={sv}
                      style={[
                        styles.gravityChip,
                        createForm.severity === sv && { backgroundColor: SEV_COLORS[sv] + '20', borderColor: SEV_COLORS[sv] },
                      ]}
                      onPress={() => setCreateForm(f => ({ ...f, severity: sv }))}
                    >
                      <Ionicons
                        name="alert-circle"
                        size={13}
                        color={createForm.severity === sv ? SEV_COLORS[sv] : colors.textSecondary}
                      />
                      <Text style={[
                        styles.gravityChipText,
                        createForm.severity === sv && { color: SEV_COLORS[sv], fontWeight: '600' },
                      ]}>
                        {SEV_LABELS[sv]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* ── Action recommandée ── */}
              <View style={styles.createSection}>
                <Text style={[styles.createSectionLabel, { opacity: 0.8 }]}>Action recommandée (Optionnel)</Text>
                <TextInput
                  style={[styles.createField, styles.createFieldMulti]}
                  placeholder="Mesures de contrôle ISO 45001 §8.1.4…"
                  value={createForm.recommended_action}
                  onChangeText={v => setCreateForm(f => ({ ...f, recommended_action: v }))}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* ── Suivi médical ── */}
              <View style={styles.createSection}>
                <Text style={styles.createSectionLabel}>Suivi médical (OIT C.161)</Text>
                <TouchableOpacity
                  style={[styles.toggleBtn, {
                    backgroundColor: createForm.medical_followup_required ? '#7C3AED20' : colors.surfaceVariant,
                    borderColor: createForm.medical_followup_required ? '#7C3AED' : colors.outline,
                    marginTop: spacing.sm,
                  }]}
                  onPress={() => setCreateForm(f => ({ ...f, medical_followup_required: !f.medical_followup_required }))}
                >
                  <Ionicons
                    name={createForm.medical_followup_required ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={createForm.medical_followup_required ? '#7C3AED' : colors.textSecondary}
                  />
                  <Text style={[styles.toggleBtnText, { color: createForm.medical_followup_required ? '#7C3AED' : colors.textSecondary }]}>
                    Suivi médical spécialisé requis
                  </Text>
                </TouchableOpacity>
                {createForm.medical_followup_required && (
                  <TextInput
                    style={[styles.createField, { marginTop: spacing.sm }]}
                    placeholder="Date limite : AAAA-MM-JJ"
                    value={createForm.medical_followup_date}
                    onChangeText={v => setCreateForm(f => ({ ...f, medical_followup_date: v }))}
                    placeholderTextColor={colors.textSecondary}
                  />
                )}
              </View>

              <View style={{ height: spacing.md }} />
            </ScrollView>

            {/* Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowCreate(false); setWorkerSearchText(''); setShowWorkerDropdown(false); }}
              >
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: '#DC2626' }, createBusy && { opacity: 0.6 }]}
                onPress={submitCreate}
                disabled={createBusy}
              >
                {createBusy
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <><Ionicons name="alert-circle" size={16} color="#FFF" />
                    <Text style={styles.saveBtnText}>Créer l'alerte</Text></>
                }
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────
// Detail row helper
// ─────────────────────────────────────────────────────────────

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, highlight ? { color: highlight, fontWeight: '700' } : {}]}>{value}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: colors.background },
  contentContainer:   { padding: spacing.md, paddingBottom: spacing.xl },

  // Header
  header:             { marginBottom: spacing.md, flexDirection: isDesktop ? 'row' : 'column', justifyContent: 'space-between', alignItems: isDesktop ? 'center' : 'flex-start' },
  screenTitle:        { fontSize: 22, fontWeight: '700', color: colors.text },
  screenSubtitle:     { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  headerBtns:         { flexDirection: 'row', marginTop: isDesktop ? 0 : spacing.md },
  addButton:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  addButtonText:      { color: '#FFF', marginLeft: 6, fontWeight: '600', fontSize: 13 },

  // Critical banner
  criticalBanner:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#7C3AED', borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, gap: spacing.sm },
  criticalBannerText: { flex: 1, color: '#FFF', fontWeight: '600', fontSize: 13 },

  // Stats
  statsRow:           { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statCard:           { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.sm, alignItems: 'center', ...shadows.sm },
  statValue:          { fontSize: 22, fontWeight: '800' },
  statLabel:          { fontSize: 9, fontWeight: '600', color: colors.textSecondary, textAlign: 'center', marginTop: 2 },

  // Filters
  filterBar:          { marginBottom: spacing.md },
  searchBox:          { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.sm, ...shadows.sm },
  searchInput:        { flex: 1, paddingVertical: spacing.sm, marginLeft: spacing.sm, color: colors.text, fontSize: 14 },
  filterPillRow:      { flexDirection: 'row', gap: spacing.xs, paddingVertical: spacing.xs },
  filterPill:         { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 20, backgroundColor: colors.surface },
  filterPillText:     { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },

  // Card
  card:               { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, borderLeftWidth: 4, ...shadows.sm },
  cardSelected:       { borderWidth: 2, borderColor: ACCENT, borderLeftWidth: 4 },
  cardHeader:         { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.md },
  cardTitleRow:       { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  cardTitle:          { fontSize: 15, fontWeight: '700', color: colors.text },
  cardEmpId:          { fontSize: 12, color: colors.textSecondary },
  cardMeta:           { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  cardEnterprise:     { fontSize: 11, color: colors.textSecondary, fontStyle: 'italic', marginTop: 1 },
  cardDate:           { fontSize: 10, color: colors.textSecondary, marginTop: spacing.sm },

  // Severity / status chips
  severityBadge:      { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.sm },
  badgeText:          { fontSize: 9, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
  statusChip:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 3, borderRadius: borderRadius.sm, borderWidth: 1, gap: 4 },
  statusDot:          { width: 6, height: 6, borderRadius: 3 },
  statusChipText:     { fontSize: 9, fontWeight: '700' },

  // Exposure box
  exposureBox:        { flexDirection: 'row', backgroundColor: colors.background, borderRadius: borderRadius.md, paddingVertical: spacing.sm, marginBottom: spacing.sm, borderLeftWidth: 3, borderLeftColor: '#E5E7EB' },
  exposureItem:       { flex: 1, alignItems: 'center' },
  exposureDivider:    { width: 1, backgroundColor: colors.outline },
  exposureLabel:      { fontSize: 9, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.3 },
  exposureValue:      { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 2 },
  exposureUnit:       { fontSize: 9, color: colors.textSecondary, marginTop: 1 },

  // Hint
  hintBox:            { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: borderRadius.sm, padding: spacing.sm, marginBottom: spacing.sm },
  hintText:           { flex: 1, fontSize: 11, lineHeight: 16 },

  // Action text
  actionText:         { fontSize: 12, color: colors.text, marginBottom: spacing.sm, lineHeight: 17 },
  actionLabel:        { fontWeight: '700' },

  // Follow-up banner
  followUpBanner:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EDE9FE', borderRadius: borderRadius.sm, padding: spacing.sm, marginBottom: spacing.sm, gap: 6 },
  followUpText:       { flex: 1, fontSize: 11, color: '#7C3AED', fontWeight: '600' },

  // Action row (on card)
  actionRow:          { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1, gap: 4 },
  actionBtnText:      { fontSize: 12, fontWeight: '600' },

  // Checkbox (bulk)
  checkbox:           { width: 22, height: 22, borderRadius: 5, borderWidth: 2, borderColor: colors.outline, alignItems: 'center', justifyContent: 'center', marginRight: 4, marginTop: 2 },

  // Loading / error / empty
  center:             { alignItems: 'center', padding: spacing.xl },
  loadingText:        { marginTop: spacing.md, color: colors.textSecondary },
  errorText:          { marginTop: spacing.md, color: '#EF4444', textAlign: 'center' },
  retryBtn:           { marginTop: spacing.md, backgroundColor: ACCENT, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  retryBtnText:       { color: '#FFF', fontWeight: '600' },
  emptyState:         { alignItems: 'center', padding: spacing.xl },
  emptyTitle:         { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  emptyText:          { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },

  // Modals
  modalOverlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalOverlayDesktop:  { justifyContent: 'center', alignItems: 'center' },
  modalContent:         { backgroundColor: colors.background, borderTopLeftRadius: borderRadius.lg, borderTopRightRadius: borderRadius.lg, maxHeight: '92%', paddingTop: spacing.lg, paddingHorizontal: spacing.md },
  modalContentDesktop:  { borderRadius: borderRadius.lg },
  modalHeader:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outline, paddingBottom: spacing.md, paddingHorizontal: spacing.md },
  modalTitle:           { fontSize: 17, fontWeight: '700', color: colors.text },
  closeBtn:             { padding: spacing.xs, borderRadius: borderRadius.sm, backgroundColor: colors.surfaceVariant },

  // Detail modal
  detailScroll:         { paddingBottom: spacing.md },
  detailSevBanner:      { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, flexWrap: 'wrap' },
  detailSection:        { fontSize: 11, fontWeight: '700', color: ACCENT, textTransform: 'uppercase', letterSpacing: 0.7, marginTop: spacing.lg, marginBottom: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.outline, paddingBottom: 4 },
  detailRow:            { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.outline },
  detailLabel:          { fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginBottom: 2 },
  detailValue:          { fontSize: 14, fontWeight: '500', color: colors.text },
  hierarchyBox:         { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, alignItems: 'flex-start' },
  hierarchyText:        { fontSize: 12, color: colors.text, lineHeight: 18 },
  modalActionBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, gap: 6 },
  modalActionBtnText:   { fontWeight: '700', fontSize: 14 },

  // Forms
  formScroll:           { paddingBottom: spacing.md },
  formLabel:            { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: spacing.xs, marginTop: spacing.md },
  input:                { backgroundColor: colors.surface, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.text, fontSize: 14, borderWidth: 1, borderColor: colors.outline },
  textArea:             { minHeight: 90, textAlignVertical: 'top' },
  row2:                 { flexDirection: 'row' },
  switchRow:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.outline },
  switchLabel:          { flex: 1, fontSize: 13, color: colors.text, fontWeight: '500', marginRight: spacing.sm },

  // Severity picker
  severityPicker:       { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  severityOption:       { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.outline },
  severityOptionText:   { fontSize: 10, fontWeight: '700', color: colors.textSecondary },

  // Worker picker
  workerSearchBox:      { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.outline, gap: spacing.sm, height: 44 },
  workerSearchInput:    { flex: 1, fontSize: 13, color: colors.text, paddingVertical: spacing.sm },
  selectedWorkerChip:   { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 6, marginBottom: spacing.sm, borderWidth: 1, borderColor: ACCENT },
  selectedWorkerText:   { flex: 1, fontSize: 13, color: colors.text },
  workerDropdown:       { backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.primary, marginTop: spacing.sm, overflow: 'hidden' },
  workerDropdownItem:   { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outline },
  workerDropdownName:   { fontSize: 14, color: colors.text, fontWeight: '500' },
  workerDropdownId:     { fontSize: 12, color: colors.textSecondary },

  // ─── Worker Selection Styles (matching IncidentDashboardScreen) ────
  workerSectionHeader:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  workerDropdownLoading:    { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.lg, gap: spacing.sm },
  workerDropdownLoadingText:{ fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  workerItemAvatar:         { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  workerItemAvatarText:     { fontSize: 14, fontWeight: '700', color: colors.primary },
  workerItemInfo:           { flex: 1 },
  workerItemName:           { fontSize: 14, fontWeight: '700', color: colors.text },
  workerItemId:             { fontSize: 12, fontWeight: '500', color: colors.textSecondary, marginTop: 3 },
  workerDropdownEmpty:      { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.lg, gap: spacing.sm },
  workerDropdownEmptyText:  { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic' },
  workerSelectedCard:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.primary + '08', borderRadius: borderRadius.lg, borderWidth: 2, borderColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.md, marginBottom: spacing.sm },
  workerSelectedLeft:       { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  workerAvatar:             { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  workerSelectedInfo:       { flex: 1 },
  workerSelectedName:       { fontSize: 14, fontWeight: '700', color: colors.text },
  workerSelectedId:         { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  workerClearBtn:           { padding: spacing.xs },
  workerHelperText:         { fontSize: 11, color: colors.textSecondary, marginTop: spacing.sm, fontStyle: 'italic' },
  cardShadow:               { ...shadows.sm },
  infoBox:              { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, gap: spacing.sm, marginTop: spacing.md },
  infoBoxText:          { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 18 },

  // Submit (resolve modal)
  submitBtn:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, borderRadius: borderRadius.md, marginTop: spacing.lg, backgroundColor: ACCENT, gap: 8 },
  submitBtnText:        { color: '#FFF', fontWeight: '700', fontSize: 15 },

  // Create modal sections
  createModalBody:      { paddingHorizontal: spacing.md },
  createSection:        { marginBottom: spacing.md },
  createSectionLabel:   { fontSize: 12, color: colors.textSecondary },
  createField:          { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 14, color: colors.text, marginTop: spacing.xs },
  createFieldSub:       { fontSize: 11, color: colors.textSecondary, marginBottom: 2 },
  createFieldMulti:     { textAlignVertical: 'top', minHeight: 80, paddingTop: spacing.sm },
  gravityChip:          { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: borderRadius.full, marginRight: spacing.sm, borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.surfaceVariant },
  gravityChipText:      { fontSize: 12, color: colors.textSecondary },
  toggleBtn:            { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1 },
  toggleBtnText:        { fontSize: 13, fontWeight: '500' },
  modalFooter:          { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.outline },
  cancelBtn:            { flex: 1, borderWidth: 1, borderColor: colors.outline, borderRadius: borderRadius.md, paddingVertical: spacing.sm, alignItems: 'center' },
  cancelBtnText:        { fontSize: 14, fontWeight: '600', color: colors.text },
  saveBtn:              { flex: 1, borderRadius: borderRadius.md, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  saveBtnText:          { fontSize: 14, fontWeight: '600', color: '#FFF' },
});
