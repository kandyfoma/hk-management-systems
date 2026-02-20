import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../../components/GlobalUI';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import ApiService from '../../../services/ApiService';
import { InventoryAlert, Product } from '../../../models/Inventory';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

type ExpiryReportItem = {
  id: string;
  productName: string;
  batchNumber: string;
  expiryDate: string;
  daysRemaining: number;
  quantity: number;
};

function getSeverityConfig(severity: Severity) {
  switch (severity) {
    case 'CRITICAL': return { color: colors.error, bg: colors.error + '14', icon: 'alert-circle' as const, label: 'Critique' };
    case 'HIGH': return { color: '#E65100', bg: '#E6510014', icon: 'warning' as const, label: 'Élevé' };
    case 'MEDIUM': return { color: colors.warning, bg: colors.warning + '14', icon: 'information-circle' as const, label: 'Moyen' };
    case 'LOW': return { color: colors.info, bg: colors.info + '14', icon: 'chevron-down-circle' as const, label: 'Faible' };
    default: return { color: colors.textTertiary, bg: colors.surfaceVariant, icon: 'help-circle' as const, label: '—' };
  }
}

function getAlertTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    LOW_STOCK: 'Stock bas',
    OUT_OF_STOCK: 'Rupture de stock',
    EXPIRING_SOON: 'Expiration proche',
    EXPIRED: 'Expiré',
    OVER_STOCK: 'Sur-stock',
    REORDER_POINT: 'Point de réappro.',
    PRICE_CHANGE: 'Changement de prix',
    RECALL: 'Rappel',
    DAMAGE: 'Endommagé',
    THEFT: 'Vol',
    TEMPERATURE_EXCURSION: 'Excursion temp.',
  };
  return labels[type] || type;
}

function getAlertTypeIcon(type: string): keyof typeof Ionicons.glyphMap {
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    LOW_STOCK: 'trending-down',
    OUT_OF_STOCK: 'close-circle',
    EXPIRING_SOON: 'time',
    EXPIRED: 'skull',
    OVER_STOCK: 'trending-up',
    REORDER_POINT: 'cart',
    RECALL: 'megaphone',
    DAMAGE: 'hammer',
    THEFT: 'lock-open',
    TEMPERATURE_EXCURSION: 'thermometer',
  };
  return icons[type] || 'alert';
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'À l\'instant';
  if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)}h`;
  return `Il y a ${Math.floor(seconds / 86400)}j`;
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return Number.MAX_SAFE_INTEGER;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.floor((target.getTime() - today.getTime()) / 86400000);
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function StockAlertsScreen({ onOpenExpirationReport }: { onOpenExpirationReport?: () => void } = {}) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<(InventoryAlert & { product?: Product })[]>([]);
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium'>('all');
  const [expiryReport, setExpiryReport] = useState<{
    expired: number;
    in7Days: number;
    in30Days: number;
    items: ExpiryReportItem[];
  }>({ expired: 0, in7Days: 0, in30Days: 0, items: [] });

  const loadData = useCallback(async () => {
    try {
      const api = ApiService.getInstance();
      const [alertsRes, productsRes, itemsRes, batchesRes] = await Promise.all([
        api.get('/inventory/alerts/', { is_active: true, page_size: 500 }),
        api.get('/inventory/products/', { page_size: 500 }),
        api.get('/inventory/items/', { page_size: 1000 }),
        api.get('/inventory/batches/', { page_size: 1000 }),
      ]);

      const rawAlerts: any[] = alertsRes?.data?.results ?? alertsRes?.data ?? [];
      const rawProducts: any[] = productsRes?.data?.results ?? productsRes?.data ?? [];
      const rawItems: any[] = itemsRes?.data?.results ?? itemsRes?.data ?? [];
      const rawBatches: any[] = batchesRes?.data?.results ?? batchesRes?.data ?? [];

      // Build products map by id
      const productsMap = new Map<string, any>();
      rawProducts.forEach((p: any) => productsMap.set(p.id, p));

      // Build inventory items map by id
      const itemsMap = new Map<string, any>();
      rawItems.forEach((item: any) => itemsMap.set(item.id, item));

      // Build expiry report (expired + expiring in 7/30 days)
      let expired = 0;
      let in7Days = 0;
      let in30Days = 0;
      const expiryItems: ExpiryReportItem[] = [];

      rawBatches.forEach((batch: any) => {
        const expiryDate = batch?.expiry_date;
        const quantity = Number(batch?.current_quantity ?? 0);
        if (!expiryDate || quantity <= 0) return;

        const inventoryItem = itemsMap.get(batch.inventory_item);
        const product = inventoryItem ? productsMap.get(inventoryItem.product) : undefined;
        const productName = product?.name ?? batch?.product_name ?? 'Produit';

        const daysRemaining = daysUntil(expiryDate);
        if (daysRemaining < 0) expired += 1;
        if (daysRemaining >= 0 && daysRemaining <= 7) in7Days += 1;
        if (daysRemaining >= 0 && daysRemaining <= 30) in30Days += 1;

        if (daysRemaining <= 30) {
          expiryItems.push({
            id: String(batch.id),
            productName,
            batchNumber: batch.batch_number ?? '-',
            expiryDate,
            daysRemaining,
            quantity,
          });
        }
      });

      expiryItems.sort((a, b) => a.daysRemaining - b.daysRemaining);
      setExpiryReport({ expired, in7Days, in30Days, items: expiryItems.slice(0, 10) });

      // Map to InventoryAlert shape and enrich with product
      const enriched = rawAlerts.map((a: any) => {
        const product = productsMap.get(a.product);
        const inventoryItem = a.inventory_item ? itemsMap.get(a.inventory_item) : undefined;

        const currentValue =
          inventoryItem?.quantity_on_hand ??
          undefined;

        const thresholdValue =
          inventoryItem?.product_details?.min_stock_level ??
          product?.min_stock_level ??
          undefined;

        return {
          id: a.id,
          organizationId: '',
          productId: a.product,
          inventoryItemId: a.inventory_item ?? '',
          batchId: a.batch ?? '',
          alertType: a.alert_type as any,
          severity: a.severity as any,
          message: a.message ?? a.title ?? '',
          isActive: a.is_active ?? true,
          isAcknowledged: !!a.acknowledged_at,
          isResolved: !!a.resolved_at,
          thresholdValue,
          currentValue,
          createdAt: a.created_at,
          updatedAt: a.created_at,
          // keep raw fields for UI
          status: a.acknowledged_at ? 'ACKNOWLEDGED' : 'ACTIVE',
          product: product ? {
            id: product.id,
            name: product.name,
            strength: product.strength,
          } as any : undefined,
        };
      });

      // Sort: CRITICAL first, then by createdAt descending
      const severityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      enriched.sort((a, b) => {
        const diff = (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9);
        if (diff !== 0) return diff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setAlerts(enriched);
    } catch (err) {
      console.error('Alerts load error', err);
      toast.error('Erreur lors du chargement des alertes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleAcknowledge = async (alert: InventoryAlert) => {
    try {
      const api = ApiService.getInstance();
      await api.patch(`/inventory/alerts/${alert.id}/`, { acknowledged_at: new Date().toISOString() });
      toast.success('Alerte acquittée');
      loadData();
    } catch {
      toast.error('Erreur lors de l\'acquittement');
    }
  };

  const handleResolve = async (alert: InventoryAlert) => {
    try {
      const api = ApiService.getInstance();
      await api.patch(`/inventory/alerts/${alert.id}/`, { is_active: false, resolved_at: new Date().toISOString() });
      toast.success('Alerte résolue');
      loadData();
    } catch {
      toast.error('Erreur lors de la résolution');
    }
  };

  // Filter
  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'all') return true;
    return a.severity.toLowerCase() === filter;
  });

  // Counts
  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length;
  const highCount = alerts.filter((a) => a.severity === 'HIGH').length;
  const mediumCount = alerts.filter((a) => a.severity === 'MEDIUM').length;
  const unacknowledgedCount = alerts.filter((a) => a.status === 'ACTIVE').length;

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.loadingText}>Chargement des alertes…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      {/* ─── Header ────────────────────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Alertes de Stock</Text>
          <Text style={s.headerSubtitle}>
            {alerts.length} alerte{alerts.length !== 1 ? 's' : ''} active{alerts.length !== 1 ? 's' : ''}
            {unacknowledgedCount > 0 ? ` · ${unacknowledgedCount} non acquittée${unacknowledgedCount !== 1 ? 's' : ''}` : ''}
          </Text>
        </View>
      </View>

      {/* ─── Severity KPIs ──────────────────────────────────── */}
      <View style={s.kpiRow}>
        <SeverityKPI severity="CRITICAL" count={criticalCount} active={filter === 'critical'} onPress={() => setFilter(filter === 'critical' ? 'all' : 'critical')} />
        <SeverityKPI severity="HIGH" count={highCount} active={filter === 'high'} onPress={() => setFilter(filter === 'high' ? 'all' : 'high')} />
        <SeverityKPI severity="MEDIUM" count={mediumCount} active={filter === 'medium'} onPress={() => setFilter(filter === 'medium' ? 'all' : 'medium')} />
        <TouchableOpacity
          style={[s.filterAllBtn, filter === 'all' && s.filterAllBtnActive]}
          onPress={() => setFilter('all')}
          activeOpacity={0.7}
        >
          <Ionicons name="list" size={18} color={filter === 'all' ? '#FFF' : colors.textSecondary} />
          <Text style={[s.filterAllText, filter === 'all' && s.filterAllTextActive]}>Tous ({alerts.length})</Text>
        </TouchableOpacity>
      </View>

      {/* ─── Expiration Reporting ───────────────────────────── */}
      <View style={s.expirySection}>
        <View style={s.expiryHeader}>
          <View style={s.expiryHeaderTop}>
            <Text style={s.expiryTitle}>Rapport d&apos;expiration</Text>
            {onOpenExpirationReport && (
              <TouchableOpacity style={s.expiryActionBtn} onPress={onOpenExpirationReport}>
                <Ionicons name="open-outline" size={13} color={colors.primary} />
                <Text style={s.expiryActionText}>Rapport complet</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={s.expirySubtitle}>{expiryReport.items.length} lot(s) à surveiller (≤ 30 jours)</Text>
        </View>

        <View style={s.expiryKpiRow}>
          <View style={s.expiryKpiCard}>
            <Text style={s.expiryKpiLabel}>Expirés</Text>
            <Text style={[s.expiryKpiValue, { color: colors.error }]}>{expiryReport.expired}</Text>
          </View>
          <View style={s.expiryKpiCard}>
            <Text style={s.expiryKpiLabel}>≤ 7 jours</Text>
            <Text style={[s.expiryKpiValue, { color: '#E65100' }]}>{expiryReport.in7Days}</Text>
          </View>
          <View style={s.expiryKpiCard}>
            <Text style={s.expiryKpiLabel}>≤ 30 jours</Text>
            <Text style={[s.expiryKpiValue, { color: colors.warning }]}>{expiryReport.in30Days}</Text>
          </View>
        </View>

        {expiryReport.items.length === 0 ? (
          <Text style={s.expiryEmpty}>Aucun lot proche d&apos;expiration</Text>
        ) : (
          <View style={s.expiryList}>
            {expiryReport.items.map((item) => (
              <View key={item.id} style={s.expiryRow}>
                <View style={s.expiryInfo}>
                  <Text style={s.expiryProduct} numberOfLines={1}>{item.productName}</Text>
                  <Text style={s.expiryMeta}>Lot {item.batchNumber} · Exp. {new Date(item.expiryDate).toLocaleDateString('fr-FR')} · Qté {item.quantity}</Text>
                </View>
                <View style={[
                  s.expiryBadge,
                  item.daysRemaining < 0 ? s.expiryBadgeCritical : item.daysRemaining <= 7 ? s.expiryBadgeHigh : s.expiryBadgeMedium,
                ]}>
                  <Text style={[
                    s.expiryBadgeText,
                    item.daysRemaining < 0 ? { color: colors.error } : item.daysRemaining <= 7 ? { color: '#E65100' } : { color: colors.warning },
                  ]}>
                    {item.daysRemaining < 0 ? 'Expiré' : `J-${item.daysRemaining}`}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ─── Alerts List ────────────────────────────────────── */}
      {filteredAlerts.length === 0 ? (
        <View style={s.emptyState}>
          <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          <Text style={s.emptyTitle}>Aucune alerte</Text>
          <Text style={s.emptySubtitle}>
            {filter !== 'all' ? 'Aucune alerte pour ce niveau de sévérité' : 'Tous les stocks sont en règle'}
          </Text>
        </View>
      ) : (
        <View style={s.alertList}>
          {filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onAcknowledge={() => handleAcknowledge(alert)}
              onResolve={() => handleResolve(alert)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function SeverityKPI({
  severity,
  count,
  active,
  onPress,
}: {
  severity: Severity;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  const cfg = getSeverityConfig(severity);
  return (
    <TouchableOpacity
      style={[s.severityCard, active && { borderColor: cfg.color, borderWidth: 2 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[s.severityIcon, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon} size={20} color={cfg.color} />
      </View>
      <Text style={s.severityCount}>{count}</Text>
      <Text style={[s.severityLabel, { color: cfg.color }]}>{cfg.label}</Text>
    </TouchableOpacity>
  );
}

function AlertCard({
  alert,
  onAcknowledge,
  onResolve,
}: {
  alert: InventoryAlert & { product?: Product };
  onAcknowledge: () => void;
  onResolve: () => void;
}) {
  const severity = alert.severity as Severity;
  const cfg = getSeverityConfig(severity);

  return (
    <View style={[s.card, { borderLeftWidth: 4, borderLeftColor: cfg.color }]}>
      <View style={s.cardHeader}>
        {/* Icon + Type */}
        <View style={[s.alertTypeIcon, { backgroundColor: cfg.bg }]}>
          <Ionicons name={getAlertTypeIcon(alert.alertType)} size={18} color={cfg.color} />
        </View>
        <View style={s.cardHeaderInfo}>
          <View style={s.cardTitleRow}>
            <Text style={s.cardTitle}>{getAlertTypeLabel(alert.alertType)}</Text>
            <View style={[s.severityBadge, { backgroundColor: cfg.bg }]}>
              <Text style={[s.severityBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>
          {alert.product && (
            <Text style={s.cardProductName} numberOfLines={1}>
              {alert.product.name}
              {alert.product.strength ? ` ${alert.product.strength}` : ''}
            </Text>
          )}
        </View>
        <Text style={s.cardTime}>{timeAgo(alert.createdAt)}</Text>
      </View>

      {/* Message */}
      <Text style={s.cardMessage}>{alert.message}</Text>

      {/* Details */}
      <View style={s.alertDetails}>
        {alert.currentValue !== undefined && (
          <View style={s.alertDetail}>
            <Text style={s.alertDetailLabel}>Valeur actuelle</Text>
            <Text style={[s.alertDetailValue, severity === 'CRITICAL' ? { color: colors.error, fontWeight: '700' } : undefined]}>
              {alert.currentValue}
            </Text>
          </View>
        )}
        {alert.thresholdValue !== undefined && (
          <View style={s.alertDetail}>
            <Text style={s.alertDetailLabel}>Seuil</Text>
            <Text style={s.alertDetailValue}>{alert.thresholdValue}</Text>
          </View>
        )}
        {alert.batchId && (
          <View style={s.alertDetail}>
            <Text style={s.alertDetailLabel}>Lot</Text>
            <Text style={s.alertDetailValue}>{alert.batchId}</Text>
          </View>
        )}
      </View>

      {/* Status + Actions */}
      <View style={s.cardFooter}>
        <View style={s.statusRow}>
          {alert.status !== 'ACTIVE' ? (
            <View style={s.ackBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={s.ackText}>Acquittée</Text>
            </View>
          ) : (
            <View style={s.unackBadge}>
              <Ionicons name="radio-button-on" size={12} color={colors.error} />
              <Text style={s.unackText}>Non acquittée</Text>
            </View>
          )}
        </View>
        <View style={s.actionRow}>
          {alert.status === 'ACTIVE' && (
            <TouchableOpacity style={s.ackBtn} onPress={onAcknowledge} activeOpacity={0.7}>
              <Ionicons name="checkmark" size={16} color={colors.primary} />
              <Text style={s.ackBtnText}>Acquitter</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.resolveBtn} onPress={onResolve} activeOpacity={0.7}>
            <Ionicons name="checkmark-done" size={16} color="#FFF" />
            <Text style={s.resolveBtnText}>Résoudre</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: isDesktop ? 28 : 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.textSecondary },

  // Header
  header: { marginBottom: 20 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  headerSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },

  // KPIs
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  severityCard: { flex: 1, minWidth: 90, backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 14, alignItems: 'center', ...shadows.sm, borderWidth: 1, borderColor: colors.outline },
  severityIcon: { width: 40, height: 40, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  severityCount: { fontSize: 22, fontWeight: '700', color: colors.text },
  severityLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  filterAllBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.xl, paddingHorizontal: 14, paddingVertical: 14, ...shadows.sm, borderWidth: 1, borderColor: colors.outline, gap: 4, minWidth: 80 },
  filterAllBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterAllText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  filterAllTextActive: { color: '#FFF' },

  // Expiry report
  expirySection: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.outline, padding: 14, marginBottom: 16, ...shadows.sm },
  expiryHeader: { marginBottom: 10 },
  expiryHeaderTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  expiryTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  expiryActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.primary, borderRadius: borderRadius.full, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.primary + '10' },
  expiryActionText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  expirySubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  expiryKpiRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  expiryKpiCard: { flex: 1, backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.lg, paddingVertical: 8, paddingHorizontal: 10 },
  expiryKpiLabel: { fontSize: 11, fontWeight: '600', color: colors.textTertiary },
  expiryKpiValue: { fontSize: 18, fontWeight: '700', marginTop: 2 },
  expiryEmpty: { fontSize: 13, color: colors.success, fontWeight: '600' },
  expiryList: { gap: 8 },
  expiryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md, paddingHorizontal: 10, paddingVertical: 8 },
  expiryInfo: { flex: 1 },
  expiryProduct: { fontSize: 13, fontWeight: '600', color: colors.text },
  expiryMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  expiryBadge: { borderRadius: borderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  expiryBadgeCritical: { backgroundColor: colors.error + '14' },
  expiryBadgeHigh: { backgroundColor: '#E6510014' },
  expiryBadgeMedium: { backgroundColor: colors.warning + '14' },
  expiryBadgeText: { fontSize: 11, fontWeight: '700' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },

  // Alert list
  alertList: { gap: 12 },

  // Alert card
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.outline, padding: 16, ...shadows.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  alertTypeIcon: { width: 38, height: 38, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  cardHeaderInfo: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full },
  severityBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardProductName: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  cardTime: { fontSize: 11, color: colors.textTertiary, fontWeight: '500' },

  // Message
  cardMessage: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: 10 },

  // Details
  alertDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  alertDetail: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md, paddingHorizontal: 10, paddingVertical: 6, minWidth: 100 },
  alertDetailLabel: { fontSize: 10, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  alertDetailValue: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 2 },

  // Footer
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  statusRow: {},
  ackBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ackText: { fontSize: 12, color: colors.success, fontWeight: '600' },
  unackBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  unackText: { fontSize: 12, color: colors.error, fontWeight: '600' },

  actionRow: { flexDirection: 'row', gap: 8 },
  ackBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.primary },
  ackBtnText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  resolveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: borderRadius.lg, backgroundColor: colors.success },
  resolveBtnText: { fontSize: 12, fontWeight: '600', color: '#FFF' },
});
