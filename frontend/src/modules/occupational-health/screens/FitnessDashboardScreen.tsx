import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../../../services/ApiService';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { TestDashboard, KPI } from '../components/TestDashboard';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface FitnessCertificate {
  id: string;
  certificate_number: string;
  worker_name?: string;
  worker_employee_id?: string;
  examination?: number;
  fitness_decision: 'fit' | 'fit_with_restrictions' | 'temporarily_unfit' | 'permanently_unfit';
  issue_date: string;
  valid_until: string;
  restrictions?: string;
  work_limitations?: string;
  requires_follow_up?: boolean;
  is_active: boolean;
  revoked_date?: string | null;
}

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const FITNESS_LABELS: Record<string, string> = {
  fit: 'Apte',
  fit_with_restrictions: 'Apte avec Restrictions',
  temporarily_unfit: 'Inapte Temporaire',
  permanently_unfit: 'Inapte Définitif',
};

const FITNESS_COLORS: Record<string, string> = {
  fit: colors.success,
  fit_with_restrictions: colors.warning,
  temporarily_unfit: colors.error,
  permanently_unfit: colors.errorDark,
};

const FITNESS_ICONS: Record<string, string> = {
  fit: 'checkmark-circle',
  fit_with_restrictions: 'alert-circle',
  temporarily_unfit: 'time',
  permanently_unfit: 'close-circle',
};

// â”€â”€â”€ Helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function isExpiringSoon(validUntil: string): boolean {
  const expiry = new Date(validUntil);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  return diffMs > 0 && diffMs < 30 * 24 * 60 * 60 * 1000; // within 30 days
}

function isExpired(validUntil: string): boolean {
  return new Date(validUntil) < new Date();
}

// â”€â”€â”€ Certificate Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CertificateRow({ cert }: { cert: FitnessCertificate }) {
  const expired = isExpired(cert.valid_until);
  const expiringSoon = !expired && isExpiringSoon(cert.valid_until);
  const decisionColor = FITNESS_COLORS[cert.fitness_decision] ?? colors.textSecondary;
  const decisionLabel = FITNESS_LABELS[cert.fitness_decision] ?? cert.fitness_decision;
  const decisionIcon = (FITNESS_ICONS[cert.fitness_decision] ?? 'help-circle') as any;

  return (
    <View style={[styles.certRow, expired && styles.certRowExpired]}>
      <View style={[styles.certStatusDot, { backgroundColor: decisionColor }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.certWorker} numberOfLines={1}>
          {cert.worker_name ?? `Travailleur #${cert.worker_employee_id ?? cert.id}`}
        </Text>
        <Text style={styles.certNumber}>{cert.certificate_number}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <View style={[styles.fitnessBadge, { backgroundColor: decisionColor + '18' }]}>
          <Ionicons name={decisionIcon} size={11} color={decisionColor} />
          <Text style={[styles.fitnessBadgeText, { color: decisionColor }]}>{decisionLabel}</Text>
        </View>
        {expired ? (
          <Text style={styles.expiredText}>ExpirÃ©</Text>
        ) : expiringSoon ? (
          <Text style={styles.expiringSoonText}>
            Exp. {new Date(cert.valid_until).toLocaleDateString('fr-CD')}
          </Text>
        ) : (
          <Text style={styles.validText}>
            Valide jusqu'au {new Date(cert.valid_until).toLocaleDateString('fr-CD')}
          </Text>
        )}
      </View>
    </View>
  );
}

// â”€â”€â”€ Summary Stats Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SummaryBar({ certs }: { certs: FitnessCertificate[] }) {
  const active = certs.filter(c => c.is_active && !isExpired(c.valid_until));
  const fit = active.filter(c => c.fitness_decision === 'fit').length;
  const restricted = active.filter(c => c.fitness_decision === 'fit_with_restrictions').length;
  const tempUnfit = active.filter(c => c.fitness_decision === 'temporarily_unfit').length;
  const permUnfit = active.filter(c => c.fitness_decision === 'permanently_unfit').length;
  const total = active.length || 1;

  const bars = [
    { label: 'Apte', count: fit, color: FITNESS_COLORS.fit },
    { label: 'Restrictions', count: restricted, color: FITNESS_COLORS.fit_with_restrictions },
    { label: 'Inapte Temp.', count: tempUnfit, color: FITNESS_COLORS.temporarily_unfit },
    { label: 'Inapte DÃ©f.', count: permUnfit, color: FITNESS_COLORS.permanently_unfit },
  ];

  return (
    <View style={styles.summaryBar}>
      <Text style={styles.summaryTitle}>RÃ©partition Aptitude â€” Certificats Actifs</Text>
      <View style={styles.barTrack}>
        {bars.map(b => (
          b.count > 0 ? (
            <View
              key={b.label}
              style={[styles.barSegment, { flex: b.count / total, backgroundColor: b.color }]}
            />
          ) : null
        ))}
      </View>
      <View style={styles.barLegend}>
        {bars.map(b => (
          <View key={b.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: b.color }]} />
            <Text style={styles.legendText}>{b.count} {b.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// â”€â”€â”€ Main Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function FitnessDashboardScreen({ navigation }: any) {
  const [certs, setCerts] = useState<FitnessCertificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'expiring' | 'expired'>('active');

  useEffect(() => { loadCerts(); }, []);

  const loadCerts = async () => {
    setLoading(true);
    try {
      const api = ApiService.getInstance();
      const response = await api.get('/occupational-health/fitness-certificates/');
      if (response.success && response.data) {
        const data = Array.isArray(response.data)
          ? response.data
          : response.data.results ?? [];
        setCerts(data);
      }
    } catch (err) {
      console.error('Error loading fitness certificates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCerts();
    setRefreshing(false);
  };

  // KPIs
  const active = certs.filter(c => c.is_active && !isExpired(c.valid_until));
  const fit = active.filter(c => c.fitness_decision === 'fit').length;
  const restricted = active.filter(c => c.fitness_decision === 'fit_with_restrictions').length;
  const unfit = active.filter(c =>
    c.fitness_decision === 'temporarily_unfit' || c.fitness_decision === 'permanently_unfit'
  ).length;
  const expiring = certs.filter(c => c.is_active && isExpiringSoon(c.valid_until)).length;

  const kpis: KPI[] = [
    { label: 'Aptes', value: fit, icon: 'checkmark-circle-outline', color: colors.success },
    { label: 'Restrictions', value: restricted, icon: 'alert-circle-outline', color: colors.warning },
    { label: 'Inaptes', value: unfit, icon: 'close-circle-outline', color: colors.error },
    { label: 'Expire bientôt', value: expiring, icon: 'time-outline', color: colors.secondary },
  ];

  // Filter certs for list
  const filtered = certs.filter(c => {
    if (filter === 'active') return c.is_active && !isExpired(c.valid_until);
    if (filter === 'expiring') return c.is_active && isExpiringSoon(c.valid_until);
    if (filter === 'expired') return !c.is_active || isExpired(c.valid_until);
    return true;
  });

  const FILTER_TABS = [
    { id: 'active', label: 'Actifs' },
    { id: 'expiring', label: 'Expirant bientÃ´t' },
    { id: 'expired', label: 'ExpirÃ©s' },
    { id: 'all', label: 'Tous' },
  ] as const;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: colors.success + '18' }]}>
          <Ionicons name="shield-checkmark" size={28} color={colors.success} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Aptitude au Travail</Text>
          <Text style={styles.headerSubtitle}>Fitness-for-Duty â€” Certificats en temps rÃ©el</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation?.navigate?.('certificates')}
        >
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.addBtnText}>Nouveau</Text>
        </TouchableOpacity>
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiRow}>
        {kpis.map(kpi => (
          <View key={kpi.label} style={[styles.kpiCard, shadows.sm]}>
            <View style={[styles.kpiIcon, { backgroundColor: kpi.color + '18' }]}>
              <Ionicons name={kpi.icon as any} size={20} color={kpi.color} />
            </View>
            <Text style={[styles.kpiValue, { color: kpi.color }]}>{kpi.value}</Text>
            <Text style={styles.kpiLabel}>{kpi.label}</Text>
          </View>
        ))}
      </View>

      {/* Summary Bar */}
      {certs.length > 0 && <SummaryBar certs={certs} />}

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: 8 }}>
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

      {/* Certificate List */}
      <View style={[styles.listCard, shadows.sm]}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Certificats</Text>
          <Text style={styles.listCount}>{filtered.length} rÃ©sultats</Text>
        </View>
        {loading ? (
          <ActivityIndicator size="large" color={colors.success} style={{ padding: spacing.xl }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="shield-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Aucun certificat trouvÃ©</Text>
          </View>
        ) : (
          filtered.map(cert => <CertificateRow key={cert.id} cert={cert} />)
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 40 },
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
    backgroundColor: colors.success, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, borderRadius: borderRadius.lg,
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
  summaryBar: {
    marginHorizontal: spacing.md, marginBottom: spacing.md,
    backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing.md,
    ...shadows.sm,
  },
  summaryTitle: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.sm },
  barTrack: {
    height: 10, borderRadius: borderRadius.full, overflow: 'hidden',
    flexDirection: 'row', backgroundColor: colors.outline,
  },
  barSegment: { height: '100%' },
  barLegend: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: colors.textSecondary },
  filterRow: { marginBottom: spacing.sm },
  filterTab: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.outline,
  },
  filterTabActive: { backgroundColor: colors.success, borderColor: colors.success },
  filterTabText: { fontSize: 12, fontWeight: '500', color: colors.textSecondary },
  filterTabTextActive: { color: '#FFF', fontWeight: '600' },
  listCard: {
    marginHorizontal: spacing.md, backgroundColor: colors.surface,
    borderRadius: borderRadius.xl, overflow: 'hidden',
  },
  listHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outline,
  },
  listTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  listCount: { fontSize: 12, color: colors.textSecondary },
  certRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outline,
  },
  certRowExpired: { opacity: 0.55 },
  certStatusDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  certWorker: { fontSize: 13, fontWeight: '600', color: colors.text },
  certNumber: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  fitnessBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: borderRadius.full,
  },
  fitnessBadgeText: { fontSize: 10, fontWeight: '600' },
  expiredText: { fontSize: 10, color: colors.error, fontWeight: '600' },
  expiringSoonText: { fontSize: 10, color: colors.warning, fontWeight: '600' },
  validText: { fontSize: 10, color: colors.textSecondary },
  emptyState: { padding: spacing.xl, alignItems: 'center', gap: spacing.md },
  emptyText: { fontSize: 14, color: colors.textSecondary },
});
