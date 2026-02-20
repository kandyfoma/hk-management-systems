import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../../../services/ApiService';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { useToast } from '../../../components/GlobalUI';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

type ExpiryFilter = 'all' | 'expired' | '30days' | '90days';

type ExpiryRow = {
  id: string;
  productName: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  daysRemaining: number;
  status: string;
};

function daysUntil(dateStr: string): number {
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const target = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(dateStr);
  if (Number.isNaN(target.getTime())) return Number.MAX_SAFE_INTEGER;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.floor((target.getTime() - today.getTime()) / 86400000);
}

export function ExpirationReportScreen() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<ExpiryRow[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ExpiryFilter>('all');

  const loadData = useCallback(async () => {
    try {
      const api = ApiService.getInstance();

      const res = await api.get('/inventory/reports/expiring/', { scope: 'all', days: 3650 });
      if (!res.success) {
        throw new Error(res.error?.message || 'Failed to load expiration report');
      }
      const payload = res.data as any;
      const rawBatches: any[] = Array.isArray(payload?.results) ? payload.results : [];

      const mapped: ExpiryRow[] = rawBatches
        .map((batch: any) => {
          const expiryDate = batch?.expiry_date;
          const quantity = Number(batch?.current_quantity ?? 0);
          if (!expiryDate || quantity <= 0) return null;

          return {
            id: String(batch.id),
            productName: batch.product_name ?? 'Produit',
            batchNumber: batch.batch_number ?? '-',
            expiryDate,
            quantity,
            daysRemaining: daysUntil(expiryDate),
            status: String(batch.status ?? 'AVAILABLE'),
          };
        })
        .filter(Boolean) as ExpiryRow[];

      mapped.sort((a, b) => a.daysRemaining - b.daysRemaining);
      setRows(mapped);
    } catch (error) {
      console.error('Expiration report load error', error);
      toast.error('Erreur lors du chargement du rapport d\'expiration');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === 'expired' && row.daysRemaining >= 0) return false;
      if (filter === '30days' && !(row.daysRemaining >= 0 && row.daysRemaining <= 30)) return false;
      if (filter === '90days' && !(row.daysRemaining >= 0 && row.daysRemaining <= 90)) return false;

      if (!q) return true;
      return (
        row.productName.toLowerCase().includes(q) ||
        row.batchNumber.toLowerCase().includes(q)
      );
    });
  }, [rows, search, filter]);

  const stats = useMemo(() => {
    let expired = 0;
    let in30Days = 0;
    let in90Days = 0;
    rows.forEach((r) => {
      if (r.daysRemaining < 0) expired += 1;
      if (r.daysRemaining >= 0 && r.daysRemaining <= 30) in30Days += 1;
      if (r.daysRemaining >= 0 && r.daysRemaining <= 90) in90Days += 1;
    });
    return { expired, in30Days, in90Days, total: rows.length };
  }, [rows]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Chargement du rapport d&apos;expiration…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={[colors.primary]} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Rapport complet d&apos;expiration</Text>
        <Text style={styles.subtitle}>{stats.total} lot(s) avec date d&apos;expiration et stock positif</Text>
      </View>

      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}><Text style={styles.kpiLabel}>Expirés</Text><Text style={[styles.kpiValue, { color: colors.error }]}>{stats.expired}</Text></View>
        <View style={styles.kpiCard}><Text style={styles.kpiLabel}>≤ 30 jours</Text><Text style={[styles.kpiValue, { color: colors.warning }]}>{stats.in30Days}</Text></View>
        <View style={styles.kpiCard}><Text style={styles.kpiLabel}>≤ 90 jours</Text><Text style={[styles.kpiValue, { color: '#E65100' }]}>{stats.in90Days}</Text></View>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher produit ou lot"
          placeholderTextColor={colors.textSecondary}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.filterRow}>
        {[
          { key: 'all', label: 'Tous' },
          { key: 'expired', label: 'Expirés' },
          { key: '30days', label: '≤ 30 jours' },
          { key: '90days', label: '≤ 90 jours' },
        ].map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key as ExpiryFilter)}
          >
            <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.tableCard}>
        {filteredRows.length === 0 ? (
          <Text style={styles.emptyText}>Aucun lot trouvé pour ce filtre.</Text>
        ) : (
          filteredRows.map((row) => (
            <View key={row.id} style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle} numberOfLines={1}>{row.productName}</Text>
                <Text style={styles.rowMeta}>Lot {row.batchNumber} · Exp. {new Date(row.expiryDate).toLocaleDateString('fr-FR')} · Qté {row.quantity}</Text>
              </View>
              <View style={[
                styles.badge,
                row.daysRemaining < 0 ? styles.badgeCritical : row.daysRemaining <= 30 ? styles.badgeHigh : styles.badgeMedium,
              ]}>
                <Text style={[
                  styles.badgeText,
                  row.daysRemaining < 0 ? { color: colors.error } : row.daysRemaining <= 30 ? { color: '#E65100' } : { color: colors.warning },
                ]}>
                  {row.daysRemaining < 0 ? 'Expiré' : `J-${row.daysRemaining}`}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: spacing.md, color: colors.textSecondary, fontSize: 14 },
  header: { marginBottom: spacing.md },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  subtitle: { marginTop: 4, fontSize: 12, color: colors.textSecondary },
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  kpiCard: { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outline, paddingVertical: 10, paddingHorizontal: 10, ...shadows.sm },
  kpiLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  kpiValue: { marginTop: 2, fontSize: 20, fontWeight: '800' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline, borderRadius: borderRadius.md, paddingHorizontal: spacing.sm, marginBottom: spacing.md },
  searchInput: { flex: 1, color: colors.text, paddingVertical: 10, fontSize: 14 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  filterChip: { borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.outline, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.surface },
  filterChipActive: { backgroundColor: colors.primary + '14', borderColor: colors.primary },
  filterChipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  filterChipTextActive: { color: colors.primary },
  tableCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outline, padding: spacing.md, ...shadows.sm },
  emptyText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.outline + '55' },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  rowMeta: { marginTop: 2, fontSize: 11, color: colors.textSecondary },
  badge: { borderRadius: borderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  badgeCritical: { backgroundColor: colors.error + '14' },
  badgeHigh: { backgroundColor: '#E6510014' },
  badgeMedium: { backgroundColor: colors.warning + '14' },
  badgeText: { fontSize: 11, fontWeight: '800' },
});
