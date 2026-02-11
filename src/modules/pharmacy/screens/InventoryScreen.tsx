import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../../components/GlobalUI';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import DatabaseService from '../../../services/DatabaseService';
import { Product, InventoryItem, InventoryBatch, InventoryUtils } from '../../../models/Inventory';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface EnrichedProduct extends Product {
  inventoryItem?: InventoryItem;
  batches: InventoryBatch[];
}

type FilterTab = 'ALL' | 'MEDICATION' | 'OTC' | 'CONSUMABLE' | 'LOW_STOCK';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function formatCurrency(amount: number, currency = 'USD'): string {
  if (currency === 'CDF') return `${amount.toLocaleString()} FC`;
  return `$${amount.toFixed(2)}`;
}

function getStatusColor(status?: string): string {
  switch (status) {
    case 'IN_STOCK': return colors.success;
    case 'LOW_STOCK': return colors.warning;
    case 'OUT_OF_STOCK': return colors.error;
    case 'OVER_STOCK': return colors.info;
    default: return colors.textTertiary;
  }
}

function getStatusLabel(status?: string): string {
  switch (status) {
    case 'IN_STOCK': return 'En stock';
    case 'LOW_STOCK': return 'Stock bas';
    case 'OUT_OF_STOCK': return 'Rupture';
    case 'OVER_STOCK': return 'Sur-stock';
    case 'DISCONTINUED': return 'Arrêté';
    case 'QUARANTINED': return 'Quarantaine';
    default: return '—';
  }
}

function getCategoryLabel(cat: string): string {
  const labels: Record<string, string> = {
    MEDICATION: 'Médicament',
    OTC: 'Sans ordonnance',
    SUPPLEMENT: 'Complément',
    MEDICAL_DEVICE: 'Dispositif médical',
    SURGICAL_SUPPLY: 'Matériel chirurgical',
    CONSUMABLE: 'Consommable',
    COSMETIC: 'Cosmétique',
    BABY_CARE: 'Bébé',
    PERSONAL_HYGIENE: 'Hygiène',
    LAB_REAGENT: 'Réactif labo',
    VETERINARY: 'Vétérinaire',
    OTHER: 'Autre',
  };
  return labels[cat] || cat;
}

function getCategoryIcon(cat: string): keyof typeof Ionicons.glyphMap {
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    MEDICATION: 'medkit',
    OTC: 'medical',
    SUPPLEMENT: 'nutrition',
    CONSUMABLE: 'bandage',
    MEDICAL_DEVICE: 'hardware-chip',
    OTHER: 'cube',
  };
  return icons[cat] || 'cube';
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function InventoryScreen() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<EnrichedProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<EnrichedProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [summary, setSummary] = useState({ totalProducts: 0, totalStockValue: 0, lowStockCount: 0, outOfStockCount: 0, expiringBatchCount: 0 });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const db = DatabaseService.getInstance();
      const org = (await db.getOrganization(
        // Get first org (test data)
        (await db.getLicenseByKey('TRIAL-HK2024XY-Z9M3'))?.organizationId || '',
      ));
      if (!org) return;

      const orgId = org.id;
      const [rawProducts, inventoryItems, summaryData] = await Promise.all([
        db.getProductsByOrganization(orgId),
        db.getInventoryItemsByOrganization(orgId),
        db.getInventorySummary(orgId),
      ]);

      // Build enriched products
      const inventoryMap = new Map<string, InventoryItem>();
      inventoryItems.forEach((item) => inventoryMap.set(item.productId, item));

      const enriched: EnrichedProduct[] = await Promise.all(
        rawProducts.map(async (p) => {
          const inv = inventoryMap.get(p.id);
          const batches = inv ? await db.getBatchesByInventoryItem(inv.id) : [];
          return { ...p, inventoryItem: inv, batches };
        }),
      );

      setProducts(enriched);
      setSummary(summaryData);
    } catch (err) {
      console.error('Inventory load error', err);
      toast.error('Erreur lors du chargement de l\'inventaire');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Filter whenever search or tab changes
  useEffect(() => {
    let result = products;

    // Tab filter
    if (activeTab === 'LOW_STOCK') {
      result = result.filter((p) => {
        const status = p.inventoryItem?.status;
        return status === 'LOW_STOCK' || status === 'OUT_OF_STOCK';
      });
    } else if (activeTab !== 'ALL') {
      result = result.filter((p) => p.category === activeTab);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.genericName?.toLowerCase().includes(q)) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode?.toLowerCase().includes(q)),
      );
    }

    setFilteredProducts(result);
  }, [products, searchQuery, activeTab]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.loadingText}>Chargement de l'inventaire…</Text>
      </View>
    );
  }

  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: 'ALL', label: 'Tous', count: products.length },
    { key: 'MEDICATION', label: 'Médicaments', count: products.filter((p) => p.category === 'MEDICATION').length },
    { key: 'OTC', label: 'OTC', count: products.filter((p) => p.category === 'OTC').length },
    { key: 'CONSUMABLE', label: 'Consommables', count: products.filter((p) => p.category === 'CONSUMABLE').length },
    { key: 'LOW_STOCK', label: '⚠ Stock Bas', count: summary.lowStockCount + summary.outOfStockCount },
  ];

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      {/* ─── Header ────────────────────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Inventaire Médicaments</Text>
          <Text style={s.headerSubtitle}>
            {products.length} produits · Valeur: {formatCurrency(summary.totalStockValue)}
          </Text>
        </View>
        <TouchableOpacity
          style={s.addBtn}
          activeOpacity={0.7}
          onPress={() => toast.info('Ajout de produit — bientôt disponible')}
        >
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={s.addBtnText}>Nouveau Produit</Text>
        </TouchableOpacity>
      </View>

      {/* ─── Summary Cards ──────────────────────────────────── */}
      <View style={s.summaryRow}>
        <SummaryCard icon="cube" label="Produits" value={`${summary.totalProducts}`} color={colors.primary} />
        <SummaryCard icon="alert-circle" label="Stock Bas" value={`${summary.lowStockCount}`} color={colors.warning} />
        <SummaryCard icon="close-circle" label="Ruptures" value={`${summary.outOfStockCount}`} color={colors.error} />
        <SummaryCard icon="time" label="Expirations" value={`${summary.expiringBatchCount}`} color={colors.info} />
      </View>

      {/* ─── Search ─────────────────────────────────────────── */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={s.searchInput}
            placeholder="Rechercher par nom, DCI, SKU, code-barres…"
            placeholderTextColor={colors.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ─── Tabs ───────────────────────────────────────────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabScroll} contentContainerStyle={s.tabRow}>
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.tab, active && s.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[s.tabText, active && s.tabTextActive]}>{tab.label}</Text>
              {tab.count !== undefined && (
                <View style={[s.tabBadge, active && s.tabBadgeActive]}>
                  <Text style={[s.tabBadgeText, active && s.tabBadgeTextActive]}>{tab.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ─── Product List ───────────────────────────────────── */}
      {filteredProducts.length === 0 ? (
        <View style={s.emptyState}>
          <Ionicons name="cube-outline" size={48} color={colors.textTertiary} />
          <Text style={s.emptyTitle}>Aucun produit trouvé</Text>
          <Text style={s.emptySubtitle}>
            {searchQuery ? 'Modifiez votre recherche' : 'Ajoutez des produits à l\'inventaire'}
          </Text>
        </View>
      ) : (
        <View style={s.productList}>
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              expanded={expandedId === product.id}
              onToggle={() => setExpandedId(expandedId === product.id ? null : product.id)}
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

function SummaryCard({ icon, label, value, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color: string }) {
  return (
    <View style={s.summaryCard}>
      <View style={[s.summaryIcon, { backgroundColor: color + '14' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={s.summaryValue}>{value}</Text>
      <Text style={s.summaryLabel}>{label}</Text>
    </View>
  );
}

function ProductCard({ product, expanded, onToggle }: { product: EnrichedProduct; expanded: boolean; onToggle: () => void }) {
  const inv = product.inventoryItem;
  const statusColor = getStatusColor(inv?.status);
  const hasExpiringBatches = InventoryUtils.hasExpiringBatches(product.batches, 90);
  const margin = InventoryUtils.calculateMargin(product.costPrice, product.sellingPrice);

  return (
    <View style={s.card}>
      {/* ── Main Row ──────────────────────────────────────── */}
      <TouchableOpacity style={s.cardRow} onPress={onToggle} activeOpacity={0.7}>
        {/* Icon */}
        <View style={[s.cardIcon, { backgroundColor: statusColor + '14' }]}>
          <Ionicons name={getCategoryIcon(product.category)} size={24} color={statusColor} />
        </View>

        {/* Info */}
        <View style={s.cardInfo}>
          <View style={s.cardNameRow}>
            <Text style={s.cardName} numberOfLines={1}>{product.name}</Text>
            {product.requiresPrescription && (
              <View style={s.rxBadge}>
                <Text style={s.rxText}>Rx</Text>
              </View>
            )}
            {hasExpiringBatches && (
              <Ionicons name="warning" size={14} color={colors.warning} style={{ marginLeft: 4 }} />
            )}
          </View>
          <Text style={s.cardSub} numberOfLines={1}>
            {product.genericName ? `${product.genericName} · ` : ''}{product.sku}
            {product.strength ? ` · ${product.strength}` : ''}
          </Text>
        </View>

        {/* Stock + Price */}
        <View style={s.cardRight}>
          <View style={[s.statusBadge, { backgroundColor: statusColor + '14' }]}>
            <View style={[s.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[s.statusText, { color: statusColor }]}>
              {inv ? inv.quantityOnHand : 0}
            </Text>
          </View>
          <Text style={s.cardPrice}>{formatCurrency(product.sellingPrice, product.currency)}</Text>
        </View>

        {/* Chevron */}
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
      </TouchableOpacity>

      {/* ── Expanded Detail ───────────────────────────────── */}
      {expanded && (
        <View style={s.detail}>
          <View style={s.detailDivider} />

          {/* Quick stats */}
          <View style={s.detailGrid}>
            <DetailStat label="Statut" value={getStatusLabel(inv?.status)} valueColor={statusColor} />
            <DetailStat label="Disponible" value={`${inv?.quantityAvailable ?? 0}`} />
            <DetailStat label="Réservé" value={`${inv?.quantityReserved ?? 0}`} />
            <DetailStat label="En commande" value={`${inv?.quantityOnOrder ?? 0}`} />
            <DetailStat label="Coût unitaire" value={formatCurrency(product.costPrice, product.currency)} />
            <DetailStat label="Marge" value={`${margin.toFixed(1)}%`} valueColor={margin > 30 ? colors.success : colors.warning} />
            <DetailStat label="Emplacement" value={inv?.shelfLocation || '—'} />
            <DetailStat label="Jours restants" value={inv ? `${inv.daysOfStockRemaining}j` : '—'} valueColor={inv && inv.daysOfStockRemaining < 14 ? colors.error : undefined} />
          </View>

          {/* Thresholds */}
          <View style={s.thresholdRow}>
            <Text style={s.thresholdLabel}>Seuils:</Text>
            <ThresholdChip label="Min" value={product.minStockLevel} color={colors.error} />
            <ThresholdChip label="Réappro" value={product.reorderLevel} color={colors.warning} />
            <ThresholdChip label="Max" value={product.maxStockLevel} color={colors.success} />
          </View>

          {/* Batches */}
          {product.batches.length > 0 && (
            <View style={s.batchSection}>
              <Text style={s.batchTitle}>Lots ({product.batches.length})</Text>
              {product.batches.map((batch) => {
                const daysUntilExpiry = Math.floor(
                  (new Date(batch.expiryDate).getTime() - Date.now()) / (86400000),
                );
                const isExpiringSoon = daysUntilExpiry <= 90;
                return (
                  <View key={batch.id} style={s.batchRow}>
                    <View style={s.batchInfo}>
                      <Text style={s.batchNumber}>{batch.batchNumber}</Text>
                      <Text style={s.batchQty}>{batch.quantity} unités</Text>
                    </View>
                    <View style={[s.batchExpiry, isExpiringSoon && s.batchExpirySoon]}>
                      {isExpiringSoon && <Ionicons name="warning" size={12} color={daysUntilExpiry <= 30 ? colors.error : colors.warning} />}
                      <Text style={[s.batchExpiryText, isExpiringSoon && { color: daysUntilExpiry <= 30 ? colors.error : colors.warning, fontWeight: '600' }]}>
                        {daysUntilExpiry > 0 ? `${daysUntilExpiry}j` : 'Expiré'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Details footer */}
          <View style={s.detailFooter}>
            <Text style={s.detailMeta}>
              {getCategoryLabel(product.category)} · {product.dosageForm} · {product.manufacturer}
              {product.storageConditions ? ` · ${product.storageConditions.replace(/_/g, ' ')}` : ''}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

function DetailStat({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={s.detailStat}>
      <Text style={s.detailStatLabel}>{label}</Text>
      <Text style={[s.detailStatValue, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
    </View>
  );
}

function ThresholdChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[s.thresholdChip, { borderColor: color + '40' }]}>
      <Text style={[s.thresholdChipLabel, { color }]}>{label}</Text>
      <Text style={s.thresholdChipValue}>{value}</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  headerSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: borderRadius.lg, gap: 8, ...shadows.sm },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  // Summary
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  summaryCard: { flex: isDesktop ? 1 : undefined, width: isDesktop ? undefined : '47%' as any, backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 16, alignItems: 'center', ...shadows.sm, minWidth: isDesktop ? 140 : undefined },
  summaryIcon: { width: 44, height: 44, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  summaryValue: { fontSize: 22, fontWeight: '700', color: colors.text },
  summaryLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '500', marginTop: 2 },

  // Search
  searchRow: { marginBottom: 14 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outline, paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, outlineStyle: 'none' as any },

  // Tabs
  tabScroll: { marginBottom: 16 },
  tabRow: { gap: 8, paddingVertical: 2 },
  tab: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 8, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.outline, gap: 6 },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  tabTextActive: { color: '#FFF', fontWeight: '600' },
  tabBadge: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.full, paddingHorizontal: 7, paddingVertical: 1, minWidth: 22, alignItems: 'center' },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabBadgeText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  tabBadgeTextActive: { color: '#FFF' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },

  // Product list
  productList: { gap: 10 },

  // Product card
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.outline, ...shadows.sm, overflow: 'hidden' },
  cardRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  cardIcon: { width: 48, height: 48, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, minWidth: 0 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardName: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 },
  cardSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', marginRight: 8 },
  rxBadge: { backgroundColor: colors.primaryFaded, borderRadius: borderRadius.sm, paddingHorizontal: 5, paddingVertical: 1 },
  rxText: { fontSize: 10, fontWeight: '700', color: colors.primary },

  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 3, borderRadius: borderRadius.full, gap: 5, marginBottom: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 13, fontWeight: '700' },
  cardPrice: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },

  // Expanded detail
  detail: { paddingHorizontal: 14, paddingBottom: 14 },
  detailDivider: { height: 1, backgroundColor: colors.outline, marginBottom: 12 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  detailStat: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md, paddingHorizontal: 10, paddingVertical: 6, minWidth: isDesktop ? 120 : '30%' as any },
  detailStatLabel: { fontSize: 10, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailStatValue: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 2 },

  // Thresholds
  thresholdRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  thresholdLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  thresholdChip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: borderRadius.sm, paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
  thresholdChipLabel: { fontSize: 10, fontWeight: '600' },
  thresholdChipValue: { fontSize: 12, fontWeight: '700', color: colors.text },

  // Batches
  batchSection: { marginBottom: 12 },
  batchTitle: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 6 },
  batchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.outline },
  batchInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  batchNumber: { fontSize: 13, fontWeight: '600', color: colors.text },
  batchQty: { fontSize: 12, color: colors.textSecondary },
  batchExpiry: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  batchExpirySoon: {},
  batchExpiryText: { fontSize: 12, color: colors.textSecondary },

  // Footer
  detailFooter: { marginTop: 4 },
  detailMeta: { fontSize: 11, color: colors.textTertiary, fontStyle: 'italic' },
});
