import React, { useEffect, useState } from 'react';
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
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { useToast } from '../../../components/GlobalUI';
import DataService from '../../../services/DataService';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

// ─── Types ───────────────────────────────────────────────────
interface MetricCard {
  title: string;
  value: string;
  change: string;
  changeType: 'up' | 'down';
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

interface TopDrug {
  name: string;
  sold: number;
  revenue: string;
  stock: number;
}

interface RecentSale {
  id: string;
  sale_number: string;
  customer_name: string;
  total_amount: number;
  item_count: number;
  created_at: string;
  payment_status: string;
}

// ─── Dashboard Hook for Data Management ──────────────────────
function usePharmacyDashboardData() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [topProducts, setTopProducts] = useState<TopDrug[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);

  const loadDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Load all dashboard data in parallel
      const [metricsResponse, topProductsResponse, recentSalesResponse] = await Promise.all([
        DataService.getPharmacyDashboardMetrics(),
        DataService.getPharmacyTopProducts({ days: 30, limit: 5 }),
        DataService.getPharmacyRecentSales({ limit: 10 })
      ]);

      // Process metrics
      if (metricsResponse.success && metricsResponse.data) {
        const data = metricsResponse.data;
        const newMetrics: MetricCard[] = [
          {
            title: 'Ventes du Jour',
            value: `${(data.daily_sales.value / 1000).toFixed(1)}k FC`,
            change: `${data.daily_sales.change > 0 ? '+' : ''}${data.daily_sales.change}%`,
            changeType: data.daily_sales.change >= 0 ? 'up' : 'down',
            icon: 'cart',
            color: colors.primary
          },
          {
            title: 'Ordonnances',
            value: data.prescriptions.value.toString(),
            change: `${data.prescriptions.change > 0 ? '+' : ''}${data.prescriptions.change}%`,
            changeType: data.prescriptions.change >= 0 ? 'up' : 'down',
            icon: 'document-text',
            color: colors.info
          },
          {
            title: 'Produits en Stock',
            value: data.products_in_stock.toString(),
            change: 'Actuel',
            changeType: 'up',
            icon: 'cube',
            color: colors.secondary
          },
          {
            title: 'Alertes Stock',
            value: data.active_alerts.toString(),
            change: data.active_alerts > 0 ? 'À traiter' : 'RAS',
            changeType: data.active_alerts > 0 ? 'down' : 'up',
            icon: 'alert-circle',
            color: data.active_alerts > 0 ? colors.error : colors.success
          }
        ];
        setMetrics(newMetrics);
      }

      // Process top products
      if (topProductsResponse.success && topProductsResponse.data) {
        const products: TopDrug[] = topProductsResponse.data.map((item: any) => ({
          name: item.name,
          sold: item.sold,
          revenue: `${(item.revenue / 1000).toFixed(1)}k FC`,
          stock: item.stock
        }));
        setTopProducts(products);
      }

      // Process recent sales
      if (recentSalesResponse.success && recentSalesResponse.data) {
        setRecentSales(recentSalesResponse.data);
      }

    } catch (error) {
      console.error('Dashboard data loading error:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleRefresh = () => {
    loadDashboardData(true);
  };

  return {
    loading,
    refreshing,
    metrics,
    topProducts,
    recentSales,
    handleRefresh
  };
}

// ─── Section Header Component ────────────────────────────────
function SectionHeader({
  title,
  subtitle,
  icon,
  accentColor = colors.primary,
  ctaLabel,
  ctaIcon,
  onCtaPress,
}: {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
  ctaLabel?: string;
  ctaIcon?: keyof typeof Ionicons.glyphMap;
  onCtaPress?: () => void;
}) {
  return (
    <View style={secStyles.wrapper}>
      <View style={secStyles.divider}>
        <View style={[secStyles.dividerAccent, { backgroundColor: accentColor }]} />
        <View style={secStyles.dividerLine} />
      </View>
      <View style={secStyles.header}>
        <View style={secStyles.headerLeft}>
          <View style={[secStyles.iconBubble, { backgroundColor: accentColor + '14' }]}>
            <Ionicons name={icon} size={18} color={accentColor} />
          </View>
          <View>
            <Text style={secStyles.title}>{title}</Text>
            {subtitle && <Text style={secStyles.subtitle}>{subtitle}</Text>}
          </View>
        </View>
        {ctaLabel && (
          <TouchableOpacity
            style={[secStyles.ctaBtn, { backgroundColor: accentColor }]}
            onPress={onCtaPress}
            activeOpacity={0.7}
          >
            {ctaIcon && <Ionicons name={ctaIcon} size={15} color="#FFF" />}
            <Text style={secStyles.ctaText}>{ctaLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const secStyles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  dividerAccent: { width: 40, height: 3, borderRadius: 2 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.outline, marginLeft: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBubble: { width: 36, height: 36, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  ctaText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
});

// ─── Component ───────────────────────────────────────────────
interface PharmacyDashboardProps {
  onNavigate?: (screenId: string) => void;
}

export function PharmacyDashboardContent({ onNavigate }: PharmacyDashboardProps = {}) {
  const {
    loading,
    refreshing,
    metrics,
    topProducts: topDrugs,
    recentSales,
    handleRefresh
  } = usePharmacyDashboardData();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Chargement du tableau de bord...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Tableau de Bord Pharmacie</Text>
          <Text style={styles.headerSubtitle}>Aperçu de l'activité pharmaceutique</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.7} onPress={() => onNavigate?.('ph-pos')}>
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.addBtnText}>Nouvelle Vente</Text>
        </TouchableOpacity>
      </View>

      {/* ══════ SECTION: Indicateurs Pharmacie ══════ */}
      <SectionHeader
        title="Indicateurs Pharmacie"
        subtitle="Performance du jour"
        icon="stats-chart"
        accentColor={colors.primary}
        ctaLabel="Exporter"
        ctaIcon="download-outline"
        onCtaPress={() => onNavigate?.('ph-reports')}
      />
      <View style={styles.metricsGrid}>
        {metrics.map((m, i) => (
          <View key={i} style={[styles.metricCard, { backgroundColor: m.color }]}>
            <View style={styles.metricIcon}>
              <Ionicons name={m.icon} size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.metricValue}>{m.value}</Text>
            <Text style={styles.metricLabel}>{m.title}</Text>
            <View style={styles.changeBadge}>
              <Ionicons name={m.changeType === 'up' ? 'arrow-up' : 'arrow-down'} size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.changeText}>{m.change}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* ══════ SECTION: Produits & Ventes ══════ */}
      <SectionHeader
        title="Produits & Ventes"
        subtitle="Médicaments populaires et transactions récentes"
        icon="medical"
        accentColor={colors.secondary}
        ctaLabel="Ajouter Produit"
        ctaIcon="add-circle-outline"
        onCtaPress={() => onNavigate?.('ph-inventory')}
      />
      <View style={styles.row}>
        {/* Top Selling Drugs */}
        <View style={[styles.card, isDesktop && { flex: 3 }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Médicaments les Plus Vendus</Text>
            <TouchableOpacity style={styles.viewAllBtn} onPress={() => onNavigate?.('ph-inventory')}>
              <Text style={styles.viewAllText}>Tout Voir</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2 }]}>Produit</Text>
            <Text style={[styles.th, { flex: 1 }]}>Vendus</Text>
            <Text style={[styles.th, { flex: 1 }]}>Revenus</Text>
            <Text style={[styles.th, { flex: 1 }]}>Stock</Text>
          </View>
          {topDrugs.map((drug, idx) => (
            <View key={idx} style={[styles.tableRow, idx % 2 === 0 && styles.tableRowAlt]}>
              <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.drugDot, { backgroundColor: drug.stock < 100 ? colors.error : colors.success }]} />
                <Text style={styles.td}>{drug.name}</Text>
              </View>
              <Text style={[styles.td, { flex: 1, fontWeight: '600' }]}>{drug.sold}</Text>
              <Text style={[styles.td, { flex: 1, color: colors.primary, fontWeight: '600' }]}>{drug.revenue}</Text>
              <View style={{ flex: 1 }}>
                <View style={[styles.stockBadge, { backgroundColor: drug.stock < 100 ? colors.errorLight : drug.stock < 200 ? colors.warningLight : colors.successLight }]}>
                  <Text style={[styles.stockText, { color: drug.stock < 100 ? colors.errorDark : drug.stock < 200 ? colors.warningDark : colors.successDark }]}>{drug.stock}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Recent Sales */}
        <View style={[styles.card, isDesktop && { flex: 2 }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Ventes Récentes</Text>
            <TouchableOpacity style={styles.viewAllBtn} onPress={() => onNavigate?.('ph-reports')}>
              <Text style={styles.viewAllText}>Tout Voir</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
          {recentSales.map((sale, idx) => (
            <View key={idx} style={[styles.saleRow, idx === recentSales.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={styles.saleLeft}>
                <View style={[styles.saleIcon, { backgroundColor: colors.primaryFaded }]}>
                  <Ionicons name="receipt-outline" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.saleClient}>{sale.client}</Text>
                  <Text style={styles.saleId}>{sale.id} · {sale.items} articles</Text>
                </View>
              </View>
              <View style={styles.saleRight}>
                <Text style={styles.saleTotal}>{sale.total}</Text>
                <Text style={styles.saleTime}>{sale.time}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: isDesktop ? 28 : 16, paddingBottom: 40 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  headerSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: borderRadius.lg, gap: 8, ...shadows.sm },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 },
  metricCard: { flex: isDesktop ? 1 : undefined, width: isDesktop ? undefined : '47%' as any, borderRadius: borderRadius.xl, padding: 18, alignItems: 'center', minWidth: isDesktop ? 200 : undefined, ...shadows.md },
  metricTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  metricIcon: { width: 36, height: 36, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 10 },
  changeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: borderRadius.full, gap: 2, backgroundColor: 'rgba(255,255,255,0.15)', marginTop: 8 },
  changeText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  metricValue: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginBottom: 4, textAlign: 'center' },
  metricLabel: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600', textAlign: 'center' },

  row: { flexDirection: isDesktop ? 'row' : 'column', gap: 16 },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 20, borderWidth: 1, borderColor: colors.outline, ...shadows.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewAllText: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  tableHeader: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: colors.primary + '08', borderRadius: borderRadius.md, marginBottom: 4, borderWidth: 1, borderColor: colors.primary + '20' },
  th: { fontSize: 11, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.outline },
  tableRowAlt: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.sm },
  td: { fontSize: 13, color: colors.text },
  drugDot: { width: 8, height: 8, borderRadius: 4 },
  stockBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: borderRadius.full },
  stockText: { fontSize: 12, fontWeight: '700' },

  saleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.outline },
  saleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  saleIcon: { width: 40, height: 40, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  saleClient: { fontSize: 14, fontWeight: '600', color: colors.text },
  saleId: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
  saleRight: { alignItems: 'flex-end' },
  saleTotal: { fontSize: 14, fontWeight: '700', color: colors.text },
  saleTime: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
});
