import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';

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

// ─── Sample Data ─────────────────────────────────────────────
const metrics: MetricCard[] = [
  { title: 'Ventes du Jour', value: '847.500 FC', change: '+12.5%', changeType: 'up', icon: 'cart', color: colors.primary },
  { title: 'Ordonnances', value: '34', change: '+8.3%', changeType: 'up', icon: 'document-text', color: colors.info },
  { title: 'Produits en Stock', value: '1.284', change: '-2.1%', changeType: 'down', icon: 'cube', color: colors.secondary },
  { title: 'Alertes Stock', value: '7', change: '+3', changeType: 'down', icon: 'alert-circle', color: colors.error },
];

const topDrugs: TopDrug[] = [
  { name: 'Paracétamol 500mg', sold: 245, revenue: '122.500 FC', stock: 580 },
  { name: 'Amoxicilline 250mg', sold: 189, revenue: '283.500 FC', stock: 320 },
  { name: 'Ibuprofène 400mg', sold: 156, revenue: '156.000 FC', stock: 410 },
  { name: 'Métronidazole 500mg', sold: 132, revenue: '198.000 FC', stock: 95 },
  { name: 'Ciprofloxacine 500mg', sold: 98, revenue: '245.000 FC', stock: 150 },
];

const recentSales = [
  { id: 'V-0041', client: 'Jean Mukendi', items: 3, total: '45.000 FC', time: '14:32' },
  { id: 'V-0040', client: 'Marie Kabamba', items: 1, total: '12.500 FC', time: '14:15' },
  { id: 'V-0039', client: 'Pierre Kasongo', items: 5, total: '87.000 FC', time: '13:48' },
  { id: 'V-0038', client: 'Sophie Mwamba', items: 2, total: '34.000 FC', time: '13:20' },
];

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
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Tableau de Bord Pharmacie</Text>
          <Text style={styles.headerSubtitle}>Aperçu de l'activité pharmaceutique</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.7} onPress={() => onNavigate?.('pos')}>
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
        onCtaPress={() => onNavigate?.('analytics')}
      />
      <View style={styles.metricsGrid}>
        {metrics.map((m, i) => (
          <View key={i} style={styles.metricCard}>
            <View style={styles.metricTop}>
              <View style={[styles.metricIcon, { backgroundColor: m.color + '14' }]}>
                <Ionicons name={m.icon} size={22} color={m.color} />
              </View>
              <View style={[styles.changeBadge, { backgroundColor: m.changeType === 'up' ? colors.successLight : colors.errorLight }]}>
                <Ionicons name={m.changeType === 'up' ? 'arrow-up' : 'arrow-down'} size={12} color={m.changeType === 'up' ? colors.successDark : colors.errorDark} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: m.changeType === 'up' ? colors.successDark : colors.errorDark }}>{m.change}</Text>
              </View>
            </View>
            <Text style={styles.metricValue}>{m.value}</Text>
            <Text style={styles.metricLabel}>{m.title}</Text>
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
        onCtaPress={() => onNavigate?.('inventory')}
      />
      <View style={styles.row}>
        {/* Top Selling Drugs */}
        <View style={[styles.card, isDesktop && { flex: 3 }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Médicaments les Plus Vendus</Text>
            <TouchableOpacity style={styles.viewAllBtn} onPress={() => onNavigate?.('inventory')}>
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
            <TouchableOpacity style={styles.viewAllBtn} onPress={() => onNavigate?.('sales-reports')}>
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
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: isDesktop ? 28 : 16, paddingBottom: 40 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  headerSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: borderRadius.lg, gap: 8, ...shadows.sm },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 },
  metricCard: { flex: isDesktop ? 1 : undefined, width: isDesktop ? undefined : '47%' as any, backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 18, minWidth: isDesktop ? 200 : undefined, ...shadows.sm },
  metricTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  metricIcon: { width: 44, height: 44, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  changeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full, gap: 2 },
  metricValue: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 4 },
  metricLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },

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
