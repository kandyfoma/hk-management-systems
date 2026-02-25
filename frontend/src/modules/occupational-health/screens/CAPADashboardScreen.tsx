import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../../../services/ApiService';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const CARD_WIDTH = isDesktop ? Math.min((width - 96) / 2, 560) : width - 32;

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface IncidentInvestigation {
  id: number;
  incident?: number;
  incident_type?: string;
  root_cause_method?: string;
  root_cause_description?: string;
  status: 'open' | 'in_progress' | 'review' | 'closed';
  assigned_to?: number;
  assigned_to_name?: string;
  target_date?: string;
  completion_date?: string | null;
  corrective_actions?: string;
  preventive_actions?: string;
  created_at?: string;
}

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const STATUS_LABELS: Record<string, string> = {
  open: 'Ouvert',
  in_progress: 'En cours',
  review: 'En révision',
  closed: 'Clôturé',
};

const STATUS_COLORS: Record<string, string> = {
  open: colors.error,
  in_progress: colors.warning,
  review: colors.secondary,
  closed: colors.success,
};

const RCA_LABELS: Record<string, string> = {
  five_whys: '5 Pourquois',
  fishbone: 'Diagramme Ishikawa',
  fault_tree: 'Arbre des Défaillances',
  bowtie: 'Nœud Papillon',
  timeline: 'Analyse Chronologique',
};

// â”€â”€â”€ CAPA Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CAPACard({ item, onPress }: { item: IncidentInvestigation; onPress: () => void }) {
  const statusColor = STATUS_COLORS[item.status] ?? colors.textSecondary;
  const statusLabel = STATUS_LABELS[item.status] ?? item.status;
  const isOverdue =
    item.status !== 'closed' &&
    item.target_date &&
    new Date(item.target_date) < new Date();

  return (
    <TouchableOpacity style={[styles.card, shadows.sm]} onPress={onPress} activeOpacity={0.7}>
      {/* Top Row */}
      <View style={styles.cardHeader}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {isOverdue && (
            <View style={styles.overdueBadge}>
              <Ionicons name="alert" size={10} color={colors.error} />
              <Text style={styles.overdueText}>En retard</Text>
            </View>
          )}
          <Text style={styles.cardId}>#{item.id}</Text>
        </View>
      </View>

      {/* Root Cause Method */}
      {item.root_cause_method && (
        <View style={styles.rcaRow}>
          <Ionicons name="search" size={12} color={colors.primary} />
          <Text style={styles.rcaText}>
            MÃ©thode: {RCA_LABELS[item.root_cause_method] ?? item.root_cause_method}
          </Text>
        </View>
      )}

      {/* Root Cause Description */}
      {item.root_cause_description ? (
        <Text style={styles.descText} numberOfLines={2}>
          {item.root_cause_description}
        </Text>
      ) : null}

      {/* Assigned To + Target Date */}
      <View style={styles.cardFooter}>
        {item.assigned_to_name ? (
          <View style={styles.footerItem}>
            <Ionicons name="person-outline" size={12} color={colors.textSecondary} />
            <Text style={styles.footerText}>{item.assigned_to_name}</Text>
          </View>
        ) : null}
        {item.target_date ? (
          <View style={styles.footerItem}>
            <Ionicons name="calendar-outline" size={12} color={isOverdue ? colors.error : colors.textSecondary} />
            <Text style={[styles.footerText, isOverdue && { color: colors.error }]}>
              {new Date(item.target_date).toLocaleDateString('fr-CD')}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// â”€â”€â”€ KPI Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function KPIRow({
  open, inProgress, review, closed,
}: { open: number; inProgress: number; review: number; closed: number }) {
  const items = [
    { label: 'Ouverts', value: open, color: colors.error, icon: 'alert-circle-outline' },
    { label: 'En cours', value: inProgress, color: colors.warning, icon: 'reload-outline' },
    { label: 'En révision', value: review, color: colors.secondary, icon: 'eye-outline' },
    { label: 'Clôturés', value: closed, color: colors.success, icon: 'checkmark-circle-outline' },
  ];
  return (
    <View style={styles.kpiRow}>
      {items.map(kpi => (
        <View key={kpi.label} style={[styles.kpiCard, shadows.sm]}>
          <View style={[styles.kpiIcon, { backgroundColor: kpi.color + '18' }]}>
            <Ionicons name={kpi.icon as any} size={20} color={kpi.color} />
          </View>
          <Text style={[styles.kpiValue, { color: kpi.color }]}>{kpi.value}</Text>
          <Text style={styles.kpiLabel}>{kpi.label}</Text>
        </View>
      ))}
    </View>
  );
}

// â”€â”€â”€ Main Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function CAPADashboardScreen({ navigation }: any) {
  const [investigations, setInvestigations] = useState<IncidentInvestigation[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'review' | 'closed'>('open');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const api = ApiService.getInstance();
      const response = await api.get('/ohs/incident-investigations/');
      if (response.success && response.data) {
        const data: IncidentInvestigation[] = Array.isArray(response.data)
          ? response.data
          : response.data.results ?? [];
        setInvestigations(data);
      }
    } catch (err) {
      console.error('CAPADashboard: load error', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // KPI counts
  const open = investigations.filter(i => i.status === 'open').length;
  const inProgress = investigations.filter(i => i.status === 'in_progress').length;
  const review = investigations.filter(i => i.status === 'review').length;
  const closed = investigations.filter(i => i.status === 'closed').length;
  const overdue = investigations.filter(
    i => i.status !== 'closed' && i.target_date && new Date(i.target_date) < new Date()
  ).length;

  const displayed =
    filter === 'all' ? investigations : investigations.filter(i => i.status === filter);

  const FILTER_TABS = [
    { id: 'open', label: `Ouverts (${open})` },
    { id: 'in_progress', label: `En cours (${inProgress})` },
    { id: 'review', label: `RÃ©vision (${review})` },
    { id: 'closed', label: `ClÃ´turÃ©s (${closed})` },
    { id: 'all', label: 'Tous' },
  ] as const;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: colors.warning + '18' }]}>
          <Ionicons name="construct" size={26} color={colors.warning} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Actions CAPA</Text>
          <Text style={styles.headerSubtitle}>
            Correctives & PrÃ©ventives Â· {overdue > 0 ? `âš  ${overdue} en retard` : 'Ã€ jour'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.warning }]}
          onPress={() => navigation?.navigate?.('incidents')}
        >
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.addBtnText}>Incident</Text>
        </TouchableOpacity>
      </View>

      {/* KPIs */}
      <KPIRow open={open} inProgress={inProgress} review={review} closed={closed} />

      {/* CAPA Workflow Steps */}
      <View style={[styles.workflowCard, shadows.sm]}>
        <Text style={styles.workflowTitle}>Flux de Travail CAPA</Text>
        <View style={styles.workflowSteps}>
          {[
            { step: '1', label: 'Incident\nSignalé', icon: 'warning-outline', color: colors.error, count: open },
            { step: '2', label: 'Investigation\n& Causes', icon: 'search-outline', color: colors.warning, count: inProgress },
            { step: '3', label: 'Actions\nDéfinies', icon: 'list-outline', color: colors.secondary, count: review },
            { step: '4', label: 'Clôturé\n& Vérifié', icon: 'checkmark-done-outline', color: colors.success, count: closed },
          ].map((s, idx) => (
            <React.Fragment key={s.step}>
              <View style={styles.workflowStep}>
                <View style={[styles.workflowStepIcon, { backgroundColor: s.color + '18' }]}>
                  <Ionicons name={s.icon as any} size={18} color={s.color} />
                </View>
                <Text style={[styles.workflowStepCount, { color: s.color }]}>{s.count}</Text>
                <Text style={styles.workflowStepLabel}>{s.label}</Text>
              </View>
              {idx < 3 && (
                <Ionicons name="arrow-forward-outline" size={14} color={colors.outline} style={{ marginTop: 10 }} />
              )}
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: spacing.sm }}
        contentContainerStyle={{ paddingHorizontal: spacing.md, gap: 8 }}
      >
        {FILTER_TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.filterTab, filter === tab.id && styles.filterTabActive]}
            onPress={() => setFilter(tab.id)}
          >
            <Text style={[styles.filterTabText, filter === tab.id && styles.filterTabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.warning} style={{ padding: spacing.xl }} />
      ) : displayed.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="construct-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>Aucune action CAPA</Text>
          <Text style={styles.emptyHint}>
            Les actions sont crÃ©Ã©es Ã  partir des investigations d'incidents
          </Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
          {displayed.map(item => (
            <CAPACard
              key={item.id}
              item={item}
              onPress={() => navigation?.navigate?.('incident-dashboard')}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.lg, paddingBottom: spacing.md,
  },
  headerIcon: {
    width: 52, height: 52, borderRadius: borderRadius.xl,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  headerSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  addBtnText: { fontSize: 13, fontWeight: '600', color: '#FFF' },
  kpiRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm,
    paddingHorizontal: spacing.md, marginBottom: spacing.sm,
  },
  kpiCard: {
    flex: 1, minWidth: 80, backgroundColor: colors.surface,
    borderRadius: borderRadius.xl, padding: spacing.md, alignItems: 'center', gap: 6,
  },
  kpiIcon: {
    width: 40, height: 40, borderRadius: borderRadius.lg,
    justifyContent: 'center', alignItems: 'center',
  },
  kpiValue: { fontSize: 22, fontWeight: '800' },
  kpiLabel: { fontSize: 10, color: colors.textSecondary, textAlign: 'center', fontWeight: '500' },
  workflowCard: {
    marginHorizontal: spacing.md, marginBottom: spacing.md,
    backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing.md,
  },
  workflowTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  workflowSteps: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
  },
  workflowStep: { alignItems: 'center', flex: 1 },
  workflowStepIcon: {
    width: 40, height: 40, borderRadius: borderRadius.lg,
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  workflowStepCount: { fontSize: 18, fontWeight: '800' },
  workflowStepLabel: {
    fontSize: 9, color: colors.textSecondary, textAlign: 'center',
    marginTop: 2, fontWeight: '500',
  },
  filterTab: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.outline,
  },
  filterTabActive: { backgroundColor: colors.warning, borderColor: colors.warning },
  filterTabText: { fontSize: 12, fontWeight: '500', color: colors.textSecondary },
  filterTabTextActive: { color: '#FFF', fontWeight: '600' },
  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: borderRadius.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  overdueBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.error + '18', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  overdueText: { fontSize: 9, color: colors.error, fontWeight: '600' },
  cardId: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  rcaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6,
  },
  rcaText: { fontSize: 11, color: colors.primary, fontWeight: '500' },
  descText: { fontSize: 12, color: colors.textSecondary, marginBottom: spacing.sm, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 11, color: colors.textSecondary },
  emptyState: {
    padding: spacing.xl, alignItems: 'center', gap: spacing.sm,
  },
  emptyText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  emptyHint: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.lg },
});
