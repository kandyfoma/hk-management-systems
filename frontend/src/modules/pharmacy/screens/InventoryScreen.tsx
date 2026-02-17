import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../../components/GlobalUI';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import HybridDataService from '../../../services/HybridDataService';
import {
  Product, ProductCreate, ProductUpdate, ProductCategory, DosageForm, UnitOfMeasure, StorageCondition,
  InventoryItem, InventoryBatch, StockMovement, InventoryAlert,
  InventoryUtils,
} from '../../../models/Inventory';
import { getTextColor, getIconBackgroundColor, getSecondaryTextColor, getTertiaryTextColor } from '../../../utils/colorContrast';

const { width: SCREEN_W } = Dimensions.get('window');
const IS_DESKTOP = SCREEN_W >= 1024;

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface EnrichedProduct extends Product {
  inventoryItem?: InventoryItem;
  batches: InventoryBatch[];
  movements: StockMovement[];
  abcClass?: 'A' | 'B' | 'C';
}

type ScreenTab = 'catalog' | 'batches' | 'movements' | 'alerts';
type CatalogFilter = 'ALL' | 'MEDICATION' | 'OTC' | 'CONSUMABLE' | 'LOW_STOCK' | 'EXPIRING';
type SortField = 'name' | 'stock' | 'value' | 'expiry' | 'margin';
type SortDir = 'asc' | 'desc';

// ═══════════════════════════════════════════════════════════════
// SELECT OPTIONS
// ═══════════════════════════════════════════════════════════════

const CATEGORY_OPTIONS: { value: ProductCategory; label: string }[] = [
  { value: 'MEDICATION', label: 'Médicament' },
  { value: 'OTC', label: 'Sans ordonnance (OTC)' },
  { value: 'SUPPLEMENT', label: 'Complément alimentaire' },
  { value: 'CONSUMABLE', label: 'Consommable médical' },
  { value: 'MEDICAL_DEVICE', label: 'Dispositif médical' },
  { value: 'SURGICAL_SUPPLY', label: 'Matériel chirurgical' },
  { value: 'COSMETIC', label: 'Cosmétique' },
  { value: 'BABY_CARE', label: 'Soins bébé' },
  { value: 'PERSONAL_HYGIENE', label: 'Hygiène personnelle' },
  { value: 'LAB_REAGENT', label: 'Réactif de laboratoire' },
  { value: 'OTHER', label: 'Autre' },
];

const DOSAGE_OPTIONS: { value: DosageForm; label: string }[] = [
  { value: 'TABLET', label: 'Comprimé' }, { value: 'CAPSULE', label: 'Gélule' },
  { value: 'SYRUP', label: 'Sirop' }, { value: 'SUSPENSION', label: 'Suspension' },
  { value: 'INJECTION', label: 'Injectable' }, { value: 'CREAM', label: 'Crème' },
  { value: 'OINTMENT', label: 'Pommade' }, { value: 'GEL', label: 'Gel' },
  { value: 'DROPS', label: 'Gouttes' }, { value: 'INHALER', label: 'Inhalateur' },
  { value: 'SUPPOSITORY', label: 'Suppositoire' }, { value: 'POWDER', label: 'Poudre' },
  { value: 'SOLUTION', label: 'Solution' }, { value: 'SPRAY', label: 'Spray' },
  { value: 'INFUSION', label: 'Perfusion' }, { value: 'DEVICE', label: 'Dispositif' },
  { value: 'OTHER', label: 'Autre' },
];

const UNIT_OPTIONS: { value: UnitOfMeasure; label: string }[] = [
  { value: 'UNIT', label: 'Unité' }, { value: 'TABLET', label: 'Comprimé' },
  { value: 'CAPSULE', label: 'Gélule' }, { value: 'ML', label: 'ml' },
  { value: 'MG', label: 'mg' }, { value: 'G', label: 'g' },
  { value: 'VIAL', label: 'Flacon' }, { value: 'AMPOULE', label: 'Ampoule' },
  { value: 'BOTTLE', label: 'Bouteille' }, { value: 'BOX', label: 'Boîte' },
  { value: 'PACK', label: 'Pack' },
];

const ADJUST_REASONS = [
  'Comptage physique', 'Réception livraison', 'Produit endommagé',
  'Produit expiré', 'Retour client', 'Correction d\'erreur', 'Don / Échantillon', 'Autre',
];

// ═══════════════════════════════════════════════════════════════
// UTILITY HELPERS
// ═══════════════════════════════════════════════════════════════

function fmtCurrency(amount: number | null | undefined, currency = 'USD'): string {
  const v = Number(amount) || 0;
  if (currency === 'CDF') return `${v.toLocaleString()} FC`;
  return `$${v.toFixed(2)}`;
}

function statusColor(status?: string): string {
  switch (status) {
    case 'IN_STOCK': return '#10B981';
    case 'LOW_STOCK': return colors.warning;
    case 'OUT_OF_STOCK': return colors.error;
    case 'OVER_STOCK': return colors.info;
    default: return colors.textTertiary;
  }
}

function statusLabel(status?: string): string {
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

function categoryLabel(cat: string): string {
  return CATEGORY_OPTIONS.find(c => c.value === cat)?.label || cat;
}

function categoryIcon(cat: string): keyof typeof Ionicons.glyphMap {
  const map: Record<string, keyof typeof Ionicons.glyphMap> = {
    MEDICATION: 'medkit', OTC: 'medical', SUPPLEMENT: 'nutrition',
    CONSUMABLE: 'bandage', MEDICAL_DEVICE: 'hardware-chip',
    SURGICAL_SUPPLY: 'cut', COSMETIC: 'flower', BABY_CARE: 'heart',
    PERSONAL_HYGIENE: 'water', LAB_REAGENT: 'flask', OTHER: 'cube',
  };
  return map[cat] || 'cube';
}

function movementLabel(type: string): string {
  const labels: Record<string, string> = {
    PURCHASE_RECEIPT: 'Réception achat', SALE: 'Vente', PRESCRIPTION: 'Ordonnance',
    TRANSFER_IN: 'Transfert entrant', TRANSFER_OUT: 'Transfert sortant',
    RETURN_TO_SUPPLIER: 'Retour fournisseur', CUSTOMER_RETURN: 'Retour client',
    ADJUSTMENT_IN: 'Ajustement +', ADJUSTMENT_OUT: 'Ajustement -',
    DAMAGED: 'Endommagé', EXPIRED: 'Expiré', DISPOSAL: 'Élimination',
    DONATION: 'Don', INITIAL_STOCK: 'Stock initial', SAMPLE: 'Échantillon',
    RECALL: 'Rappel',
  };
  return labels[type] || type;
}

function movementIcon(type: string): keyof typeof Ionicons.glyphMap {
  const map: Record<string, keyof typeof Ionicons.glyphMap> = {
    PURCHASE_RECEIPT: 'arrow-down-circle', SALE: 'cart', PRESCRIPTION: 'document-text',
    ADJUSTMENT_IN: 'add-circle', ADJUSTMENT_OUT: 'remove-circle',
    INITIAL_STOCK: 'layers', CUSTOMER_RETURN: 'return-up-back',
    DAMAGED: 'warning', EXPIRED: 'time', DISPOSAL: 'trash',
  };
  return map[type] || 'swap-horizontal';
}

function daysUntilExpiry(dateStr: string | undefined | null): number {
  if (!dateStr) return 9999;
  const ts = new Date(dateStr).getTime();
  if (isNaN(ts)) return 9999;
  return Math.floor((ts - Date.now()) / 86400000);
}

function relativeDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  const ts = new Date(dateStr).getTime();
  if (isNaN(ts)) return '—';
  const diff = Math.floor((Date.now() - ts) / 86400000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Hier';
  if (diff < 0) return 'À venir';
  if (diff < 7) return `Il y a ${diff} jours`;
  if (diff < 30) return `Il y a ${Math.floor(diff / 7)} sem.`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

/** ABC analysis: rank products by total stock value */
function abcClassify(products: EnrichedProduct[]): EnrichedProduct[] {
  if (products.length === 0) return [];
  const withValue = products.map(p => ({
    ...p,
    _tv: (p.inventoryItem?.totalStockValue || 0),
  }));
  const totalValue = withValue.reduce((s, p) => s + p._tv, 0);
  // If all products have zero value, assign all as 'C'
  if (totalValue <= 0) {
    return products.map(p => ({ ...p, abcClass: 'C' as const }));
  }
  const sorted = [...withValue].sort((a, b) => b._tv - a._tv);
  let cum = 0;
  return sorted.map(p => {
    cum += p._tv;
    const pct = (cum / totalValue) * 100;
    const abcClass: 'A' | 'B' | 'C' = pct <= 70 ? 'A' : pct <= 90 ? 'B' : 'C';
    const { _tv, ...rest } = p;
    return { ...rest, abcClass } as EnrichedProduct;
  });
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════

export function InventoryScreen() {
  const toast = useToast();

  // ─── Core state ──────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<EnrichedProduct[]>([]);
  const [allMovements, setAllMovements] = useState<StockMovement[]>([]);
  const [allAlerts, setAllAlerts] = useState<InventoryAlert[]>([]);
  const [summary, setSummary] = useState({
    totalProducts: 0, totalStockValue: 0, lowStockCount: 0,
    outOfStockCount: 0, expiringBatchCount: 0, activeAlerts: 0, pendingPurchaseOrders: 0,
  });

  // ─── UI state ────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ScreenTab>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogFilter, setCatalogFilter] = useState<CatalogFilter>('ALL');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ─── Modal state ─────────────────────────────────────────
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<EnrichedProduct | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<EnrichedProduct | null>(null);

  // ─── Data loading ────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const db = DatabaseService.getInstance();
      const license = await db.getLicenseByKey('TRIAL-HK2024XY-Z9M3');
      if (!license) return;
      const org = await db.getOrganization(license.organizationId);
      if (!org) return;
      const orgId = org.id;

      const [rawProducts, inventoryItems, summaryData, movements, alerts] = await Promise.all([
        db.getProductsByOrganization(orgId),
        db.getInventoryItemsByOrganization(orgId),
        db.getInventorySummary(orgId),
        db.getMovementsByOrganization(orgId, { limit: 100 }),
        db.getActiveAlerts(orgId),
      ]);

      const invMap = new Map<string, InventoryItem>();
      inventoryItems.forEach(item => invMap.set(item.productId, item));

      const enriched: EnrichedProduct[] = await Promise.all(
        rawProducts.map(async p => {
          const inv = invMap.get(p.id);
          const batches = inv ? await db.getBatchesByInventoryItem(inv.id) : [];
          const mvts = inv ? await db.getStockMovements(inv.id, { limit: 20 }) : [];
          return { ...p, inventoryItem: inv, batches, movements: mvts };
        }),
      );

      setProducts(abcClassify(enriched));
      setSummary(summaryData);
      setAllMovements(movements);
      setAllAlerts(alerts);
    } catch (err) {
      console.error('Inventory load error', err);
      toast.error('Erreur lors du chargement de l\'inventaire');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

  // ─── Filtering & sorting ─────────────────────────────────
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (catalogFilter === 'LOW_STOCK') {
      result = result.filter(p => p.inventoryItem?.status === 'LOW_STOCK' || p.inventoryItem?.status === 'OUT_OF_STOCK');
    } else if (catalogFilter === 'EXPIRING') {
      result = result.filter(p => p.batches.some(b => { const d = daysUntilExpiry(b.expiryDate); return d > 0 && d <= 90; }));
    } else if (catalogFilter !== 'ALL') {
      result = result.filter(p => p.category === catalogFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.genericName?.toLowerCase().includes(q)) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode?.toLowerCase().includes(q)) ||
        (p.manufacturer?.toLowerCase().includes(q)),
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'stock': cmp = (a.inventoryItem?.quantityOnHand || 0) - (b.inventoryItem?.quantityOnHand || 0); break;
        case 'value': cmp = (a.inventoryItem?.totalStockValue || 0) - (b.inventoryItem?.totalStockValue || 0); break;
        case 'margin': cmp = InventoryUtils.calculateMargin(a.costPrice, a.sellingPrice) - InventoryUtils.calculateMargin(b.costPrice, b.sellingPrice); break;
        case 'expiry': {
          const aMin = a.batches.length ? Math.min(...a.batches.map(bt => daysUntilExpiry(bt.expiryDate))) : 9999;
          const bMin = b.batches.length ? Math.min(...b.batches.map(bt => daysUntilExpiry(bt.expiryDate))) : 9999;
          cmp = aMin - bMin;
          break;
        }
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return result;
  }, [products, catalogFilter, searchQuery, sortField, sortDir]);

  // ─── KPIs ────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total = products.length;
    const avgMargin = total > 0
      ? (products.reduce((s, p) => s + InventoryUtils.calculateMargin(p.costPrice, p.sellingPrice), 0) / total).toFixed(1)
      : '0';
    const classA = products.filter(p => p.abcClass === 'A').length;
    const classB = products.filter(p => p.abcClass === 'B').length;
    const classC = products.filter(p => p.abcClass === 'C').length;
    return { total, avgMargin, classA, classB, classC };
  }, [products]);

  // ─── Handlers ────────────────────────────────────────────
  const handleDeleteProduct = useCallback(async () => {
    if (!deletingProduct) return;
    try {
      const db = DatabaseService.getInstance();
      // Check if product has active stock — warn user
      const inv = deletingProduct.inventoryItem;
      if (inv && inv.quantityOnHand > 0) {
        toast.warning(`Attention: ${inv.quantityOnHand} unités en stock seront perdues`);
      }
      await db.deleteProduct(deletingProduct.id);
      toast.success(`${deletingProduct.name} supprimé`);
      setShowDeleteConfirm(false);
      setDeletingProduct(null);
      // Collapse any expanded card to avoid stale reference
      setExpandedId(null);
      loadData();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  }, [deletingProduct, loadData]);

  const handleAlertAction = useCallback(async (alert: InventoryAlert, action: 'acknowledge' | 'resolve') => {
    try {
      const db = DatabaseService.getInstance();
      if (action === 'acknowledge') {
        await db.acknowledgeAlert(alert.id, 'admin');
        toast.info('Alerte acquittée');
      } else {
        await db.resolveAlert(alert.id, 'admin', 'Résolu manuellement');
        toast.success('Alerte résolue');
      }
      loadData();
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  }, [loadData]);

  // ─── Loading state ───────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Chargement de l'inventaire…</Text>
      </View>
    );
  }

  // ─── Main Render ─────────────────────────────────────────
  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* ═══ HEADER ═══ */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Gestion d'Inventaire</Text>
            <Text style={styles.headerSub}>
              {products.length} produits · Valeur totale: {fmtCurrency(summary.totalStockValue)}
            </Text>
          </View>
          <View style={styles.headerBtns}>
            <TouchableOpacity
              style={[styles.btnOutline, products.length === 0 && { opacity: 0.4 }]}
              onPress={() => {
                if (products.length === 0) { toast.warning('Aucun produit disponible'); return; }
                setAdjustProduct(products[0]); setShowAdjustModal(true);
              }}
              activeOpacity={0.7}
              disabled={products.length === 0}
            >
              <Ionicons name="swap-vertical" size={16} color={colors.primary} />
              <Text style={styles.btnOutlineText}>Ajuster Stock</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnFill}
              onPress={() => { setEditingProduct(null); setShowProductModal(true); }}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={styles.btnFillText}>Nouveau Produit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ═══ KPI CARDS ═══ */}
        <View style={styles.kpiRow}>
          <KPICard icon="cube" label="Total Produits" value={`${kpis.total}`} accent={colors.primary} />
          <KPICard icon="alert-circle" label="Stock Bas" value={`${summary.lowStockCount}`} accent={colors.warning}
            hint={summary.lowStockCount > 0 ? 'Attention' : 'OK'} hintColor={summary.lowStockCount > 0 ? colors.warning : '#10B981'} />
          <KPICard icon="close-circle" label="Ruptures" value={`${summary.outOfStockCount}`} accent={colors.error}
            hint={summary.outOfStockCount > 0 ? 'Critique' : 'Aucune'} hintColor={summary.outOfStockCount > 0 ? colors.error : '#10B981'} />
          <KPICard icon="time" label="Exp. < 90j" value={`${summary.expiringBatchCount}`} accent="#8B5CF6" />
          <KPICard icon="trending-up" label="Marge Moy." value={`${kpis.avgMargin}%`} accent="#10B981" />
          <KPICard icon="notifications" label="Alertes" value={`${summary.activeAlerts}`}
            accent={summary.activeAlerts > 0 ? colors.error : colors.textTertiary} />
        </View>

        {/* ═══ ABC BAR ═══ */}
        <View style={styles.abcCard}>
          <Text style={styles.abcTitle}>Analyse ABC — Classification par Valeur</Text>
          <View style={styles.abcBarRow}>
            <View style={[styles.abcSeg, { flex: kpis.classA || 1, backgroundColor: '#10B981' }]}>
              <Text style={styles.abcSegText}>A ({kpis.classA})</Text>
            </View>
            <View style={[styles.abcSeg, { flex: kpis.classB || 1, backgroundColor: colors.warning }]}>
              <Text style={styles.abcSegText}>B ({kpis.classB})</Text>
            </View>
            <View style={[styles.abcSeg, { flex: kpis.classC || 1, backgroundColor: colors.textTertiary }]}>
              <Text style={styles.abcSegText}>C ({kpis.classC})</Text>
            </View>
          </View>
          <View style={styles.abcLegend}>
            <Text style={styles.abcLeg}>🟢 A = 70% valeur</Text>
            <Text style={styles.abcLeg}>🟡 B = 20% valeur</Text>
            <Text style={styles.abcLeg}>⚪ C = 10% valeur</Text>
          </View>
        </View>

        {/* ═══ SCREEN TABS ═══ */}
        <View style={styles.tabBar}>
          {([
            { key: 'catalog' as ScreenTab, label: 'Catalogue', icon: 'cube-outline' as keyof typeof Ionicons.glyphMap, count: products.length },
            { key: 'batches' as ScreenTab, label: 'Lots & Expiration', icon: 'layers-outline' as keyof typeof Ionicons.glyphMap, count: products.reduce((s, p) => s + p.batches.length, 0) },
            { key: 'movements' as ScreenTab, label: 'Mouvements', icon: 'swap-horizontal-outline' as keyof typeof Ionicons.glyphMap, count: allMovements.length },
            { key: 'alerts' as ScreenTab, label: 'Alertes', icon: 'notifications-outline' as keyof typeof Ionicons.glyphMap, count: allAlerts.length },
          ]).map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons name={tab.icon} size={16} color={activeTab === tab.key ? colors.primary : colors.textTertiary} />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
              {tab.count > 0 && (
                <View style={[styles.tabBadge, activeTab === tab.key && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, activeTab === tab.key && { color: '#FFF' }]}>{tab.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ═══ TAB CONTENT ═══ */}
        {activeTab === 'catalog' && (
          <CatalogContent
            products={filteredProducts}
            allProducts={products}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            catalogFilter={catalogFilter}
            setCatalogFilter={setCatalogFilter}
            sortField={sortField}
            setSortField={setSortField}
            sortDir={sortDir}
            setSortDir={setSortDir}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            onEdit={(p) => { setEditingProduct(p); setShowProductModal(true); }}
            onDelete={(p) => { setDeletingProduct(p); setShowDeleteConfirm(true); }}
            onAdjust={(p) => { setAdjustProduct(p); setShowAdjustModal(true); }}
          />
        )}
        {activeTab === 'batches' && <BatchesContent products={products} />}
        {activeTab === 'movements' && <MovementsContent movements={allMovements} products={products} />}
        {activeTab === 'alerts' && <AlertsContent alerts={allAlerts} onAction={handleAlertAction} />}
      </ScrollView>

      {/* ═══ PRODUCT FORM MODAL ═══ */}
      {showProductModal && (
        <ProductFormModal
          product={editingProduct}
          onClose={() => { setShowProductModal(false); setEditingProduct(null); }}
          onSaved={() => { setShowProductModal(false); setEditingProduct(null); loadData(); }}
        />
      )}

      {/* ═══ STOCK ADJUST MODAL ═══ */}
      {showAdjustModal && adjustProduct && (
        <StockAdjustModal
          product={adjustProduct}
          products={products}
          onSelectProduct={setAdjustProduct}
          onClose={() => setShowAdjustModal(false)}
          onSaved={() => { setShowAdjustModal(false); loadData(); }}
        />
      )}

      {/* ═══ DELETE CONFIRM MODAL ═══ */}
      {showDeleteConfirm && deletingProduct && (
        <ConfirmDeleteModal
          productName={deletingProduct.name}
          onCancel={() => { setShowDeleteConfirm(false); setDeletingProduct(null); }}
          onConfirm={handleDeleteProduct}
        />
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// KPI CARD
// ═══════════════════════════════════════════════════════════════

function KPICard({ icon, label, value, accent, hint, hintColor }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value: string; accent: string;
  hint?: string; hintColor?: string;
}) {
  const textColor = getTextColor(accent);
  const iconBgColor = getIconBackgroundColor(textColor);
  const secondaryTextColor = getSecondaryTextColor(textColor);
  const tertiaryTextColor = getTertiaryTextColor(textColor);
  
  return (
    <View style={[styles.kpiCard, { backgroundColor: accent }]}>
      <View style={[styles.kpiIcon, { backgroundColor: iconBgColor }]}>
        <Ionicons name={icon} size={22} color={textColor} />
      </View>
      <Text style={[styles.kpiVal, { color: textColor }]}>{value}</Text>
      <Text style={[styles.kpiLbl, { color: secondaryTextColor }]}>{label}</Text>
      {hint && <Text style={[styles.kpiHint, { color: hintColor || tertiaryTextColor }]}>{hint}</Text>}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// CATALOG CONTENT
// ═══════════════════════════════════════════════════════════════

function CatalogContent({ products, allProducts, searchQuery, setSearchQuery,
  catalogFilter, setCatalogFilter, sortField, setSortField, sortDir, setSortDir,
  expandedId, setExpandedId, onEdit, onDelete, onAdjust }: {
  products: EnrichedProduct[]; allProducts: EnrichedProduct[];
  searchQuery: string; setSearchQuery: (v: string) => void;
  catalogFilter: CatalogFilter; setCatalogFilter: (v: CatalogFilter) => void;
  sortField: SortField; setSortField: (v: SortField) => void;
  sortDir: SortDir; setSortDir: (v: SortDir) => void;
  expandedId: string | null; setExpandedId: (v: string | null) => void;
  onEdit: (p: Product) => void; onDelete: (p: EnrichedProduct) => void; onAdjust: (p: EnrichedProduct) => void;
}) {
  const filters: { key: CatalogFilter; label: string; count: number }[] = [
    { key: 'ALL', label: 'Tous', count: allProducts.length },
    { key: 'MEDICATION', label: 'Médicaments', count: allProducts.filter(p => p.category === 'MEDICATION').length },
    { key: 'OTC', label: 'OTC', count: allProducts.filter(p => p.category === 'OTC').length },
    { key: 'CONSUMABLE', label: 'Consommables', count: allProducts.filter(p => p.category === 'CONSUMABLE').length },
    { key: 'LOW_STOCK', label: '⚠ Stock Bas', count: allProducts.filter(p => p.inventoryItem?.status === 'LOW_STOCK' || p.inventoryItem?.status === 'OUT_OF_STOCK').length },
    { key: 'EXPIRING', label: '⏰ Exp. < 90j', count: allProducts.filter(p => p.batches.some(b => { const d = daysUntilExpiry(b.expiryDate); return d > 0 && d <= 90; })).length },
  ];

  const sorts: { key: SortField; label: string }[] = [
    { key: 'name', label: 'Nom' }, { key: 'stock', label: 'Stock' },
    { key: 'value', label: 'Valeur' }, { key: 'margin', label: 'Marge' }, { key: 'expiry', label: 'Expiration' },
  ];

  return (
    <>
      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher par nom, DCI, SKU, code-barres, fabricant…"
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

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}
        contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
        {filters.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, catalogFilter === f.key && styles.chipActive]}
            onPress={() => setCatalogFilter(f.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, catalogFilter === f.key && styles.chipTextActive]}>{f.label}</Text>
            <View style={[styles.chipBadge, catalogFilter === f.key && styles.chipBadgeActive]}>
              <Text style={[styles.chipBadgeText, catalogFilter === f.key && { color: '#FFF' }]}>{f.count}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sort */}
      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Trier par:</Text>
        {sorts.map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.sortBtn, sortField === opt.key && styles.sortBtnActive]}
            onPress={() => {
              if (sortField === opt.key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
              else { setSortField(opt.key); setSortDir('asc'); }
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.sortBtnText, sortField === opt.key && styles.sortBtnTextActive]}>{opt.label}</Text>
            {sortField === opt.key && <Ionicons name={sortDir === 'asc' ? 'arrow-up' : 'arrow-down'} size={12} color={colors.primary} />}
          </TouchableOpacity>
        ))}
        <Text style={styles.resultCnt}>{products.length} résultats</Text>
      </View>

      {/* Product list */}
      {products.length === 0 ? (
        <EmptyState icon="cube-outline" title="Aucun produit trouvé"
          sub={searchQuery ? 'Modifiez votre recherche' : 'Ajoutez des produits à l\'inventaire'} />
      ) : (
        <View style={{ gap: 8 }}>
          {products.map(p => (
            <ProductCard
              key={p.id}
              product={p}
              expanded={expandedId === p.id}
              onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
              onEdit={() => onEdit(p)}
              onDelete={() => onDelete(p)}
              onAdjust={() => onAdjust(p)}
            />
          ))}
        </View>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// PRODUCT CARD (expandable)
// ═══════════════════════════════════════════════════════════════

function ProductCard({ product, expanded, onToggle, onEdit, onDelete, onAdjust }: {
  product: EnrichedProduct; expanded: boolean; onToggle: () => void;
  onEdit: () => void; onDelete: () => void; onAdjust: () => void;
}) {
  const inv = product.inventoryItem;
  const sc = statusColor(inv?.status);
  const margin = InventoryUtils.calculateMargin(product.costPrice, product.sellingPrice);
  const hasExpiring = product.batches.some(b => { const d = daysUntilExpiry(b.expiryDate); return d > 0 && d <= 90; });
  const abcCol = product.abcClass === 'A' ? '#10B981' : product.abcClass === 'B' ? colors.warning : colors.textTertiary;

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardRow} onPress={onToggle} activeOpacity={0.7}>
        <View style={[styles.cardIcon, { backgroundColor: sc + '14' }]}>
          <Ionicons name={categoryIcon(product.category)} size={22} color={sc} />
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.cardNameRow}>
            <Text style={styles.cardName} numberOfLines={1}>{product.name}</Text>
            {product.requiresPrescription && <View style={styles.rxBadge}><Text style={styles.rxText}>Rx</Text></View>}
            {hasExpiring && <Ionicons name="warning" size={13} color={colors.warning} />}
            <View style={[styles.abcChip, { borderColor: abcCol }]}><Text style={[styles.abcChipText, { color: abcCol }]}>{product.abcClass}</Text></View>
          </View>
          <Text style={styles.cardSub} numberOfLines={1}>
            {product.genericName ? `${product.genericName} · ` : ''}{product.sku}
            {product.strength ? ` · ${product.strength}` : ''}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.statusPill, { backgroundColor: sc + '14' }]}>
            <View style={[styles.statusDot, { backgroundColor: sc }]} />
            <Text style={[styles.statusPillText, { color: sc }]}>{inv?.quantityOnHand ?? 0}</Text>
          </View>
          <Text style={styles.cardPrice}>{fmtCurrency(product.sellingPrice, product.currency)}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
      </TouchableOpacity>

      {/* ─── Expanded detail ─── */}
      {expanded && (
        <View style={styles.detail}>
          <View style={styles.divider} />

          {/* Stats grid */}
          <View style={styles.statGrid}>
            <Stat label="Statut" val={statusLabel(inv?.status)} valColor={sc} />
            <Stat label="Disponible" val={`${inv?.quantityAvailable ?? 0}`} />
            <Stat label="Réservé" val={`${inv?.quantityReserved ?? 0}`} />
            <Stat label="En commande" val={`${inv?.quantityOnOrder ?? 0}`} />
            <Stat label="Coût unit." val={fmtCurrency(product.costPrice, product.currency)} />
            <Stat label="Marge" val={`${margin.toFixed(1)}%`} valColor={margin > 30 ? '#10B981' : colors.warning} />
            <Stat label="Emplacement" val={inv?.shelfLocation || '—'} />
            <Stat label="Jours rest." val={inv ? `${inv.daysOfStockRemaining}j` : '—'}
              valColor={inv && inv.daysOfStockRemaining < 14 ? colors.error : undefined} />
            <Stat label="Classe ABC" val={product.abcClass || '—'} valColor={abcCol} />
            <Stat label="Valeur stock" val={fmtCurrency(inv?.totalStockValue || 0, product.currency)} />
          </View>

          {/* Thresholds */}
          <View style={styles.thresholdRow}>
            <Text style={styles.thresholdLbl}>Seuils:</Text>
            <Threshold label="Min" value={product.minStockLevel} color={colors.error} />
            <Threshold label="Réappro" value={product.reorderLevel} color={colors.warning} />
            <Threshold label="Max" value={product.maxStockLevel} color="#10B981" />
          </View>

          {/* Batches */}
          {product.batches.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Lots ({product.batches.length})</Text>
              {product.batches.map(batch => {
                const days = daysUntilExpiry(batch.expiryDate);
                const isExp = days <= 0;
                const isExpiring = days <= 90 && days > 0;
                return (
                  <View key={batch.id} style={styles.batchRow}>
                    <View style={styles.batchInfo}>
                      <Text style={styles.batchNum}>{batch.batchNumber}</Text>
                      <Text style={styles.batchQty}>{batch.quantity} unités</Text>
                    </View>
                    <View style={styles.expBar}>
                      <View style={[styles.expFill, {
                        width: `${Math.max(5, Math.min(100, (days / 365) * 100))}%`,
                        backgroundColor: isExp ? colors.error : isExpiring ? colors.warning : '#10B981',
                      }]} />
                    </View>
                    <View style={[styles.expBadge, (isExp || isExpiring) && { backgroundColor: (isExp ? colors.error : colors.warning) + '14' }]}>
                      {(isExp || isExpiring) && <Ionicons name="warning" size={11} color={isExp ? colors.error : colors.warning} />}
                      <Text style={[styles.expText, (isExp || isExpiring) && { color: isExp ? colors.error : colors.warning, fontWeight: '700' }]}>
                        {isExp ? 'Expiré' : `${days}j`}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Recent movements */}
          {product.movements.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Derniers Mouvements</Text>
              {product.movements.slice(0, 5).map(mvt => (
                <View key={mvt.id} style={styles.mvtMini}>
                  <Ionicons name={movementIcon(mvt.movementType)} size={14} color={mvt.direction === 'IN' ? '#10B981' : colors.error} />
                  <Text style={styles.mvtMiniLbl}>{movementLabel(mvt.movementType)}</Text>
                  <Text style={[styles.mvtMiniQty, { color: mvt.direction === 'IN' ? '#10B981' : colors.error }]}>
                    {mvt.direction === 'IN' ? '+' : '-'}{mvt.quantity}
                  </Text>
                  <Text style={styles.mvtMiniDate}>{relativeDate(mvt.movementDate)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Meta */}
          <Text style={styles.metaText}>
            {categoryLabel(product.category)} · {product.dosageForm} · {product.manufacturer}
            {product.storageConditions ? ` · ${product.storageConditions.replace(/_/g, ' ')}` : ''}
          </Text>

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={onAdjust} activeOpacity={0.7}>
              <Ionicons name="swap-vertical" size={15} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }]}>Ajuster</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={onEdit} activeOpacity={0.7}>
              <Ionicons name="create-outline" size={15} color={colors.info} />
              <Text style={[styles.actionText, { color: colors.info }]}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={onDelete} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={15} color={colors.error} />
              <Text style={[styles.actionText, { color: colors.error }]}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

function Stat({ label, val, valColor }: { label: string; val: string; valColor?: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statLbl}>{label}</Text>
      <Text style={[styles.statVal, valColor ? { color: valColor } : undefined]}>{val}</Text>
    </View>
  );
}

function Threshold({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.thresholdPill, { borderColor: color + '40' }]}>
      <Text style={[styles.thresholdPillLbl, { color }]}>{label}</Text>
      <Text style={styles.thresholdPillVal}>{value}</Text>
    </View>
  );
}

function EmptyState({ icon, title, sub }: { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={48} color={colors.textTertiary} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{sub}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// BATCHES TAB
// ═══════════════════════════════════════════════════════════════

function BatchesContent({ products }: { products: EnrichedProduct[] }) {
  const allBatches = useMemo(() =>
    products.flatMap(p => p.batches.map(b => ({ ...b, productName: p.name, productSku: p.sku })))
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()),
    [products],
  );

  if (allBatches.length === 0) {
    return <EmptyState icon="layers-outline" title="Aucun lot enregistré" sub="Les lots apparaîtront ici après réception de stock" />;
  }

  const expired = allBatches.filter(b => daysUntilExpiry(b.expiryDate) <= 0);
  const exp30 = allBatches.filter(b => { const d = daysUntilExpiry(b.expiryDate); return d > 0 && d <= 30; });
  const exp90 = allBatches.filter(b => { const d = daysUntilExpiry(b.expiryDate); return d > 30 && d <= 90; });
  const safe = allBatches.filter(b => daysUntilExpiry(b.expiryDate) > 90);

  const groups = [
    { title: '🔴 Expirés', items: expired, color: colors.error },
    { title: '🟠 Expire dans 30 jours', items: exp30, color: colors.warning },
    { title: '🟡 Expire dans 90 jours', items: exp90, color: '#8B5CF6' },
    { title: '🟢 Stock sûr (> 90 jours)', items: safe, color: '#10B981' },
  ];

  return (
    <View style={{ gap: 16 }}>
      {/* Summary bar */}
      <View style={styles.batchSummary}>
        {[
          { n: expired.length, l: 'Expirés', c: colors.error },
          { n: exp30.length, l: '< 30j', c: colors.warning },
          { n: exp90.length, l: '< 90j', c: '#8B5CF6' },
          { n: safe.length, l: 'OK', c: '#10B981' },
        ].map((x, i) => (
          <View key={i} style={[styles.batchSumCard, { borderLeftColor: x.c }]}>
            <Text style={styles.batchSumVal}>{x.n}</Text>
            <Text style={styles.batchSumLbl}>{x.l}</Text>
          </View>
        ))}
      </View>

      {groups.filter(g => g.items.length > 0).map(group => (
        <View key={group.title} style={styles.batchGroup}>
          <Text style={[styles.batchGroupTitle, { color: group.color }]}>{group.title} ({group.items.length})</Text>
          {group.items.map(batch => {
            const days = daysUntilExpiry(batch.expiryDate);
            return (
              <View key={batch.id} style={styles.batchGroupRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.batchGroupProd}>{(batch as any).productName}</Text>
                  <Text style={styles.batchGroupLot}>Lot: {batch.batchNumber} · {batch.quantity} unités</Text>
                </View>
                <View style={[styles.batchGroupExp, { backgroundColor: group.color + '14' }]}>
                  <Text style={[styles.batchGroupExpText, { color: group.color }]}>
                    {days <= 0 ? 'EXPIRÉ' : `${days}j`}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// MOVEMENTS TAB
// ═══════════════════════════════════════════════════════════════

function MovementsContent({ movements, products }: { movements: StockMovement[]; products: EnrichedProduct[] }) {
  const prodMap = useMemo(() => {
    const m = new Map<string, string>();
    products.forEach(p => {
      m.set(p.id, p.name);
      // Also map by inventoryItemId so movements referencing either ID resolve
      if (p.inventoryItem) m.set(p.inventoryItem.id, p.name);
    });
    return m;
  }, [products]);

  const grouped = useMemo(() => {
    const g: Record<string, StockMovement[]> = {};
    movements.forEach(m => {
      const dk = new Date(m.movementDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
      if (!g[dk]) g[dk] = [];
      g[dk].push(m);
    });
    return Object.entries(g);
  }, [movements]);

  if (movements.length === 0) {
    return <EmptyState icon="swap-horizontal-outline" title="Aucun mouvement" sub="Les mouvements de stock apparaîtront ici" />;
  }

  return (
    <View style={{ gap: 16 }}>
      {grouped.map(([date, mvts]) => (
        <View key={date}>
          <Text style={styles.mvtDateHdr}>{date}</Text>
          <View style={{ gap: 6 }}>
            {mvts.map(mvt => (
              <View key={mvt.id} style={styles.mvtCard}>
                <View style={[styles.mvtIcon, { backgroundColor: (mvt.direction === 'IN' ? '#10B981' : colors.error) + '14' }]}>
                  <Ionicons name={movementIcon(mvt.movementType)} size={18} color={mvt.direction === 'IN' ? '#10B981' : colors.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mvtTitle}>{movementLabel(mvt.movementType)}</Text>
                  <Text style={styles.mvtProd}>{prodMap.get(mvt.productId) || 'Produit inconnu'}</Text>
                  {mvt.reason ? <Text style={styles.mvtReason}>{mvt.reason}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.mvtQty, { color: mvt.direction === 'IN' ? '#10B981' : colors.error }]}>
                    {mvt.direction === 'IN' ? '+' : '-'}{mvt.quantity}
                  </Text>
                  <Text style={styles.mvtBal}>{mvt.previousBalance} → {mvt.newBalance}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// ALERTS TAB
// ═══════════════════════════════════════════════════════════════

function AlertsContent({ alerts, onAction }: { alerts: InventoryAlert[]; onAction: (a: InventoryAlert, action: 'acknowledge' | 'resolve') => void }) {
  if (alerts.length === 0) {
    return <EmptyState icon="checkmark-circle" title="Aucune alerte active" sub="Votre inventaire est en bon état" />;
  }

  const sevColor = (s: string) => {
    switch (s) { case 'CRITICAL': return colors.error; case 'HIGH': return colors.warning; case 'MEDIUM': return '#8B5CF6'; default: return colors.info; }
  };
  const sevIcon = (t: string): keyof typeof Ionicons.glyphMap => {
    switch (t) { case 'LOW_STOCK': return 'alert-circle'; case 'EXPIRING_SOON': return 'time'; case 'OUT_OF_STOCK': return 'close-circle'; default: return 'notifications'; }
  };

  return (
    <View style={{ gap: 10 }}>
      {alerts.map(a => (
        <View key={a.id} style={[styles.alertCard, { borderLeftColor: sevColor(a.severity) }]}>
          <View style={[styles.alertIcon, { backgroundColor: sevColor(a.severity) + '14' }]}>
            <Ionicons name={sevIcon(a.alertType)} size={20} color={sevColor(a.severity)} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <Text style={styles.alertTitle}>{a.title}</Text>
              <View style={[styles.alertSev, { backgroundColor: sevColor(a.severity) + '14' }]}>
                <Text style={[styles.alertSevText, { color: sevColor(a.severity) }]}>{a.severity}</Text>
              </View>
            </View>
            <Text style={styles.alertMsg}>{a.message}</Text>
            <View style={styles.alertBtns}>
              <TouchableOpacity style={styles.alertActBtn} onPress={() => onAction(a, 'acknowledge')} activeOpacity={0.7}>
                <Text style={[styles.alertActText, { color: colors.info }]}>Acquitter</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.alertActBtn} onPress={() => onAction(a, 'resolve')} activeOpacity={0.7}>
                <Text style={[styles.alertActText, { color: '#10B981' }]}>Résoudre</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// PRODUCT FORM MODAL
// ═══════════════════════════════════════════════════════════════

function ProductFormModal({ product, onClose, onSaved }: {
  product: Product | null; onClose: () => void; onSaved: () => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: product?.name || '',
    genericName: product?.genericName || '',
    sku: product?.sku || `MED-${Date.now().toString(36).toUpperCase()}`,
    barcode: product?.barcode || '',
    category: (product?.category || 'MEDICATION') as ProductCategory,
    dosageForm: (product?.dosageForm || 'TABLET') as DosageForm,
    strength: product?.strength || '',
    unitOfMeasure: (product?.unitOfMeasure || 'UNIT') as UnitOfMeasure,
    packSize: String(product?.packSize || 1),
    manufacturer: product?.manufacturer || '',
    costPrice: String(product?.costPrice || ''),
    sellingPrice: String(product?.sellingPrice || ''),
    currency: product?.currency || 'USD',
    taxRate: String(product?.taxRate || 0),
    requiresPrescription: product?.requiresPrescription ?? false,
    controlledSubstance: product?.controlledSubstance ?? false,
    reorderLevel: String(product?.reorderLevel || 10),
    minStockLevel: String(product?.minStockLevel || 5),
    maxStockLevel: String(product?.maxStockLevel || 500),
    indication: product?.indication || '',
    storageConditions: product?.storageConditions || 'ROOM_TEMPERATURE',
  });

  const upd = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const computedMargin = useMemo(() => {
    const cost = parseFloat(form.costPrice) || 0;
    const sell = parseFloat(form.sellingPrice) || 0;
    return cost > 0 && sell > 0 ? InventoryUtils.calculateMargin(cost, sell).toFixed(1) : null;
  }, [form.costPrice, form.sellingPrice]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.warning('Le nom du produit est requis');
      return;
    }
    const costVal = parseFloat(form.costPrice);
    const sellVal = parseFloat(form.sellingPrice);
    if (isNaN(costVal) || costVal < 0 || isNaN(sellVal) || sellVal < 0) {
      toast.warning('Prix d\'achat et prix de vente doivent être des nombres valides');
      return;
    }
    if (costVal <= 0 || sellVal <= 0) {
      toast.warning('Prix d\'achat et prix de vente doivent être supérieurs à 0');
      return;
    }
    if (sellVal < costVal) {
      toast.warning('Le prix de vente ne peut pas être inférieur au prix d\'achat');
      return;
    }
    const minSt = parseInt(form.minStockLevel) || 0;
    const reorder = parseInt(form.reorderLevel) || 0;
    const maxSt = parseInt(form.maxStockLevel) || 0;
    if (minSt > reorder || reorder > maxSt) {
      toast.warning('Niveaux de stock incohérents: min ≤ réappro ≤ max');
      return;
    }
    setSaving(true);
    try {
      const db = DatabaseService.getInstance();
      const license = await db.getLicenseByKey('TRIAL-HK2024XY-Z9M3');
      if (!license) { toast.error('Licence non trouvée'); setSaving(false); return; }
      const org = await db.getOrganization(license.organizationId);
      if (!org) { toast.error('Organisation non trouvée'); setSaving(false); return; }

      const data: any = {
        name: form.name.trim(),
        genericName: form.genericName.trim() || undefined,
        sku: form.sku.trim(),
        barcode: form.barcode.trim() || undefined,
        category: form.category,
        dosageForm: form.dosageForm,
        strength: form.strength.trim() || undefined,
        unitOfMeasure: form.unitOfMeasure,
        packSize: parseInt(form.packSize) || 1,
        manufacturer: form.manufacturer.trim(),
        costPrice: parseFloat(form.costPrice) || 0,
        sellingPrice: parseFloat(form.sellingPrice) || 0,
        currency: form.currency,
        taxRate: parseFloat(form.taxRate) || 0,
        requiresPrescription: form.requiresPrescription,
        controlledSubstance: form.controlledSubstance,
        reorderLevel: parseInt(form.reorderLevel) || 10,
        minStockLevel: parseInt(form.minStockLevel) || 5,
        maxStockLevel: parseInt(form.maxStockLevel) || 500,
        indication: form.indication.trim() || undefined,
        storageConditions: form.storageConditions as StorageCondition,
        activeIngredients: [],
        insuranceReimbursable: false,
        reorderQuantity: (parseInt(form.reorderLevel) || 10) * 2,
        safetyStockDays: 7,
      };

      if (product) {
        await db.updateProduct(product.id, data as ProductUpdate);
        toast.success(`${data.name} mis à jour`);
      } else {
        const created = await db.createProduct({ ...data, organizationId: org.id } as ProductCreate);
        await db.createInventoryItem({
          organizationId: org.id,
          productId: created.id,
          facilityId: 'pharmacy-main',
          facilityType: 'PHARMACY',
          quantityOnHand: 0, quantityReserved: 0, quantityAvailable: 0,
          quantityOnOrder: 0, quantityDamaged: 0, quantityExpired: 0,
          averageCost: created.costPrice, totalStockValue: 0,
          lastPurchasePrice: created.costPrice, averageDailyUsage: 0,
          daysOfStockRemaining: 0, status: 'OUT_OF_STOCK', isActive: true,
        });
        toast.success(`${created.name} ajouté à l'inventaire`);
      }
      onSaved();
    } catch {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalS.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={modalS.wrapper}>
          <View style={modalS.container}>
            {/* Header */}
            <View style={modalS.hdr}>
              <Text style={modalS.hdrTitle}>{product ? 'Modifier le Produit' : 'Nouveau Produit'}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={modalS.body} showsVerticalScrollIndicator={false}>
              {/* Identification */}
              <Text style={modalS.sec}>Identification</Text>
              <Field label="Nom commercial *" value={form.name} onChange={v => upd('name', v)} />
              <Field label="DCI (Nom générique)" value={form.genericName} onChange={v => upd('genericName', v)} />
              <View style={modalS.row}>
                <Field label="SKU *" value={form.sku} onChange={v => upd('sku', v)} flex />
                <Field label="Code-barres" value={form.barcode} onChange={v => upd('barcode', v)} flex />
              </View>

              {/* Classification */}
              <Text style={modalS.sec}>Classification</Text>
              <View style={modalS.row}>
                <Select label="Catégorie" value={form.category} options={CATEGORY_OPTIONS} onChange={v => upd('category', v)} flex />
                <Select label="Forme" value={form.dosageForm} options={DOSAGE_OPTIONS} onChange={v => upd('dosageForm', v)} flex />
              </View>
              <View style={modalS.row}>
                <Field label="Dosage" value={form.strength} onChange={v => upd('strength', v)} placeholder="ex: 500mg" flex />
                <Select label="Unité" value={form.unitOfMeasure} options={UNIT_OPTIONS} onChange={v => upd('unitOfMeasure', v)} flex />
              </View>
              <View style={modalS.row}>
                <Field label="Fabricant" value={form.manufacturer} onChange={v => upd('manufacturer', v)} flex />
                <Field label="Taille pack" value={form.packSize} onChange={v => upd('packSize', v)} keyboardType="numeric" flex />
              </View>

              {/* Toggles */}
              <View style={modalS.toggleRow}>
                <TouchableOpacity style={[modalS.toggle, form.requiresPrescription && modalS.toggleOn]} onPress={() => upd('requiresPrescription', !form.requiresPrescription)}>
                  <Ionicons name={form.requiresPrescription ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={form.requiresPrescription ? colors.primary : colors.textTertiary} />
                  <Text style={modalS.toggleText}>Ordonnance requise</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[modalS.toggle, form.controlledSubstance && modalS.toggleOn]} onPress={() => upd('controlledSubstance', !form.controlledSubstance)}>
                  <Ionicons name={form.controlledSubstance ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={form.controlledSubstance ? colors.error : colors.textTertiary} />
                  <Text style={modalS.toggleText}>Substance contrôlée</Text>
                </TouchableOpacity>
              </View>

              {/* Pricing */}
              <Text style={modalS.sec}>Tarification</Text>
              <View style={modalS.row}>
                <Field label="Prix d'achat ($) *" value={form.costPrice} onChange={v => upd('costPrice', v)} keyboardType="decimal-pad" placeholder="0.00" flex />
                <Field label="Prix de vente ($) *" value={form.sellingPrice} onChange={v => upd('sellingPrice', v)} keyboardType="decimal-pad" placeholder="0.00" flex />
                <Field label="TVA %" value={form.taxRate} onChange={v => upd('taxRate', v)} keyboardType="decimal-pad" flex />
              </View>
              {computedMargin && <Text style={modalS.marginHint}>Marge: {computedMargin}%</Text>}

              {/* Stock levels */}
              <Text style={modalS.sec}>Niveaux de stock</Text>
              <View style={modalS.row}>
                <Field label="Stock minimum" value={form.minStockLevel} onChange={v => upd('minStockLevel', v)} keyboardType="numeric" flex />
                <Field label="Seuil réappro" value={form.reorderLevel} onChange={v => upd('reorderLevel', v)} keyboardType="numeric" flex />
                <Field label="Stock maximum" value={form.maxStockLevel} onChange={v => upd('maxStockLevel', v)} keyboardType="numeric" flex />
              </View>

              {/* Extra */}
              <Text style={modalS.sec}>Informations supplémentaires</Text>
              <Field label="Indication thérapeutique" value={form.indication} onChange={v => upd('indication', v)} multiline />
            </ScrollView>

            {/* Footer */}
            <View style={modalS.footer}>
              <TouchableOpacity style={modalS.cancelBtn} onPress={onClose}>
                <Text style={modalS.cancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalS.saveBtn, (saving || !form.name.trim() || !(parseFloat(form.costPrice) > 0) || !(parseFloat(form.sellingPrice) > 0)) && { opacity: 0.5 }]}
                onPress={handleSave}
                disabled={saving || !form.name.trim() || !(parseFloat(form.costPrice) > 0) || !(parseFloat(form.sellingPrice) > 0)}
                activeOpacity={0.7}
              >
                {saving ? <ActivityIndicator size="small" color="#FFF" /> : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#FFF" />
                    <Text style={modalS.saveText}>{product ? 'Mettre à jour' : 'Créer le produit'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// STOCK ADJUSTMENT MODAL
// ═══════════════════════════════════════════════════════════════

function StockAdjustModal({ product, products, onSelectProduct, onClose, onSaved }: {
  product: EnrichedProduct; products: EnrichedProduct[];
  onSelectProduct: (p: EnrichedProduct) => void;
  onClose: () => void; onSaved: () => void;
}) {
  const toast = useToast();
  const [adjType, setAdjType] = useState<'add' | 'subtract'>('add');
  const [adjQty, setAdjQty] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset fields when selected product changes
  const prevProdRef = React.useRef(product.id);
  React.useEffect(() => {
    if (prevProdRef.current !== product.id) {
      setAdjQty('');
      setAdjReason('');
      setAdjType('add');
      prevProdRef.current = product.id;
    }
  }, [product.id]);

  const inv = product.inventoryItem;
  const currentQty = inv?.quantityOnHand || 0;
  const qty = Math.max(0, parseInt(adjQty) || 0);
  const newQty = adjType === 'add' ? currentQty + qty : Math.max(0, currentQty - qty);
  const willSubtractExcess = adjType === 'subtract' && qty > currentQty;
  const computedStatus = newQty === 0
    ? 'OUT_OF_STOCK'
    : newQty <= product.minStockLevel
      ? 'LOW_STOCK'
      : newQty >= product.maxStockLevel
        ? 'OVER_STOCK'
        : 'IN_STOCK';

  const handleSave = async () => {
    if (!adjQty || !adjReason) { toast.warning('Quantité et raison requises'); return; }
    if (qty <= 0) { toast.warning('Quantité invalide'); return; }
    if (!inv) { toast.warning('Pas d\'inventaire pour ce produit'); return; }
    if (willSubtractExcess) {
      toast.warning(`Retrait plafonné à ${currentQty} (stock actuel)`);
    }
    setSaving(true);
    try {
      const db = DatabaseService.getInstance();
      const safeAvailable = Math.max(0, newQty - (inv.quantityReserved || 0));
      await db.updateInventoryItem(inv.id, {
        quantityOnHand: newQty,
        quantityAvailable: safeAvailable,
        totalStockValue: newQty * (inv.averageCost || product.costPrice),
        status: computedStatus as any,
      });

      const license = await db.getLicenseByKey('TRIAL-HK2024XY-Z9M3');
      await db.createStockMovement({
        organizationId: license?.organizationId || '',
        inventoryItemId: inv.id,
        productId: product.id,
        movementType: adjType === 'add' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
        direction: adjType === 'add' ? 'IN' : 'OUT',
        quantity: qty,
        unitCost: product.costPrice,
        totalCost: qty * product.costPrice,
        previousBalance: currentQty,
        newBalance: newQty,
        performedBy: 'admin',
        movementDate: new Date().toISOString(),
        reason: adjReason,
      });

      toast.success(`Stock ajusté: ${product.name} (${currentQty} → ${newQty})`);
      onSaved();
    } catch {
      toast.error('Erreur lors de l\'ajustement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalS.backdrop}>
        <View style={[modalS.container, { maxWidth: 480 }]}>
          <View style={modalS.hdr}>
            <Text style={modalS.hdrTitle}>Ajustement de Stock</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={colors.textSecondary} /></TouchableOpacity>
          </View>

          <ScrollView style={modalS.body} showsVerticalScrollIndicator={false}>
            {/* Product picker */}
            <Text style={modalS.sec}>Produit</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {products.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.chip, p.id === product.id && styles.chipActive, { marginRight: 8 }]}
                  onPress={() => onSelectProduct(p)}
                >
                  <Text style={[styles.chipText, p.id === product.id && styles.chipTextActive]} numberOfLines={1}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Current */}
            <View style={styles.adjBox}>
              <Text style={styles.adjBoxLbl}>Stock actuel</Text>
              <Text style={styles.adjBoxVal}>{currentQty}</Text>
            </View>

            {/* Direction */}
            <View style={styles.adjDirRow}>
              <TouchableOpacity
                style={[styles.adjDir, adjType === 'add' && { backgroundColor: '#10B981' + '14', borderColor: '#10B981' }]}
                onPress={() => setAdjType('add')}
              >
                <Ionicons name="add-circle" size={18} color={adjType === 'add' ? '#10B981' : colors.textTertiary} />
                <Text style={[styles.adjDirText, adjType === 'add' && { color: '#10B981' }]}>Ajouter</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.adjDir, adjType === 'subtract' && { backgroundColor: colors.error + '14', borderColor: colors.error }]}
                onPress={() => setAdjType('subtract')}
              >
                <Ionicons name="remove-circle" size={18} color={adjType === 'subtract' ? colors.error : colors.textTertiary} />
                <Text style={[styles.adjDirText, adjType === 'subtract' && { color: colors.error }]}>Retirer</Text>
              </TouchableOpacity>
            </View>

            <Field label="Quantité *" value={adjQty} onChange={setAdjQty} keyboardType="numeric" placeholder="0" />

            {/* Excess subtraction warning */}
            {willSubtractExcess && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.warning + '14', padding: 10, borderRadius: 8, marginBottom: 8, gap: 8 }}>
                <Ionicons name="warning" size={16} color={colors.warning} />
                <Text style={{ fontSize: 12, color: colors.warning, flex: 1 }}>Le retrait dépasse le stock actuel. Le stock sera mis à zéro.</Text>
              </View>
            )}

            {/* Preview */}
            <View style={styles.adjBox}>
              <Text style={styles.adjBoxLbl}>Nouveau stock</Text>
              <Text style={[styles.adjBoxVal, { color: computedStatus === 'OUT_OF_STOCK' ? colors.error : computedStatus === 'LOW_STOCK' ? colors.warning : computedStatus === 'OVER_STOCK' ? colors.info : '#10B981' }]}>{newQty}</Text>
            </View>
            {computedStatus === 'OVER_STOCK' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.info + '14', padding: 10, borderRadius: 8, marginBottom: 8, gap: 8 }}>
                <Ionicons name="information-circle" size={16} color={colors.info} />
                <Text style={{ fontSize: 12, color: colors.info, flex: 1 }}>Ce niveau dépassera le stock maximum ({product.maxStockLevel}).</Text>
              </View>
            )}

            {/* Reason */}
            <Text style={modalS.sec}>Raison *</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {ADJUST_REASONS.map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.chip, adjReason === r && styles.chipActive, { marginBottom: 4 }]}
                  onPress={() => setAdjReason(r)}
                >
                  <Text style={[styles.chipText, adjReason === r && styles.chipTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={modalS.footer}>
            <TouchableOpacity style={modalS.cancelBtn} onPress={onClose}>
              <Text style={modalS.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalS.saveBtn, (!adjQty || !adjReason || saving) && { opacity: 0.5 }]}
              onPress={handleSave}
              disabled={!adjQty || !adjReason || saving}
              activeOpacity={0.7}
            >
              {saving ? <ActivityIndicator size="small" color="#FFF" /> : (
                <>
                  <Ionicons name="checkmark" size={18} color="#FFF" />
                  <Text style={modalS.saveText}>Confirmer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONFIRM DELETE MODAL
// ═══════════════════════════════════════════════════════════════

function ConfirmDeleteModal({ productName, onCancel, onConfirm }: {
  productName: string; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={modalS.backdrop}>
        <View style={[modalS.container, { maxWidth: 400 }]}>
          <View style={{ padding: 24, alignItems: 'center' }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.error + '14', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Ionicons name="trash" size={24} color={colors.error} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8, textAlign: 'center' }}>Supprimer ce produit ?</Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
              « {productName} » sera supprimé définitivement. Cette action est irréversible.
            </Text>
          </View>
          <View style={[modalS.footer, { justifyContent: 'center', gap: 12 }]}>
            <TouchableOpacity style={[modalS.cancelBtn, { flex: 1, alignItems: 'center' }]} onPress={onCancel}>
              <Text style={modalS.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[modalS.saveBtn, { flex: 1, backgroundColor: colors.error, justifyContent: 'center' }]} onPress={onConfirm} activeOpacity={0.7}>
              <Ionicons name="trash" size={16} color="#FFF" />
              <Text style={modalS.saveText}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// FORM COMPONENTS
// ═══════════════════════════════════════════════════════════════

function Field({ label, value, onChange, placeholder, keyboardType, multiline, flex }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; keyboardType?: string; multiline?: boolean; flex?: boolean;
}) {
  return (
    <View style={[modalS.field, flex && { flex: 1 }]}>
      <Text style={modalS.fieldLbl}>{label}</Text>
      <TextInput
        style={[modalS.fieldInput, multiline && { height: 72, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder || label}
        placeholderTextColor={colors.placeholder}
        keyboardType={keyboardType as any}
        multiline={multiline}
      />
    </View>
  );
}

function Select({ label, value, options, onChange, flex }: {
  label: string; value: string; options: { value: string; label: string }[];
  onChange: (v: any) => void; flex?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const cur = options.find(o => o.value === value);

  return (
    <View style={[modalS.field, flex && { flex: 1 }]}>
      <Text style={modalS.fieldLbl}>{label}</Text>
      <TouchableOpacity style={modalS.selectBtn} onPress={() => setOpen(!open)} activeOpacity={0.7}>
        <Text style={modalS.selectText} numberOfLines={1}>{cur?.label || value}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textTertiary} />
      </TouchableOpacity>
      {open && (
        <ScrollView style={modalS.dropdown} nestedScrollEnabled>
          {options.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[modalS.ddItem, opt.value === value && modalS.ddItemActive]}
              onPress={() => { onChange(opt.value); setOpen(false); }}
            >
              <Text style={[modalS.ddText, opt.value === value && { color: colors.primary, fontWeight: '600' }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: IS_DESKTOP ? 28 : 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.textSecondary },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  headerBtns: { flexDirection: 'row', gap: 10 },
  btnFill: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: borderRadius.lg, gap: 6, ...shadows.sm },
  btnFillText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  btnOutline: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary + '0A', borderWidth: 1, borderColor: colors.primary + '30', paddingHorizontal: 14, paddingVertical: 9, borderRadius: borderRadius.lg, gap: 6 },
  btnOutlineText: { fontSize: 13, fontWeight: '600', color: colors.primary },

  // KPIs
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  kpiCard: { flex: IS_DESKTOP ? 1 : undefined, width: IS_DESKTOP ? undefined : '31%' as any, borderRadius: borderRadius.xl, padding: 18, alignItems: 'center', ...shadows.md, minWidth: IS_DESKTOP ? 130 : undefined },
  kpiIcon: { width: 36, height: 36, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  kpiVal: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  kpiLbl: { fontSize: 12, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  kpiHint: { fontSize: 9, fontWeight: '600', marginTop: 3 },

  // ABC
  abcCard: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 16, marginBottom: 16, ...shadows.sm, borderWidth: 1, borderColor: colors.outline },
  abcTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 10 },
  abcBarRow: { flexDirection: 'row', height: 28, borderRadius: borderRadius.full, overflow: 'hidden', gap: 2 },
  abcSeg: { alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.sm },
  abcSegText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  abcLegend: { flexDirection: 'row', gap: 16, marginTop: 8 },
  abcLeg: { fontSize: 10, color: colors.textSecondary },

  // Tabs
  tabBar: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: colors.outline, flexWrap: 'wrap' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: borderRadius.lg, gap: 6, minWidth: 100 },
  tabActive: { backgroundColor: colors.primary + '0C' },
  tabText: { fontSize: 12, fontWeight: '500', color: colors.textTertiary },
  tabTextActive: { color: colors.primary, fontWeight: '700' },
  tabBadge: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.full, paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: 'center' },
  tabBadgeActive: { backgroundColor: colors.primary },
  tabBadgeText: { fontSize: 10, fontWeight: '700', color: colors.textSecondary },

  // Search & chips
  searchWrap: { marginBottom: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outline, paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, outlineStyle: 'none' as any },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 7, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.outline, gap: 5 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '500', color: colors.textSecondary },
  chipTextActive: { color: '#FFF', fontWeight: '600' },
  chipBadge: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.full, paddingHorizontal: 6, minWidth: 20, alignItems: 'center' },
  chipBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  chipBadgeText: { fontSize: 10, fontWeight: '700', color: colors.textSecondary },

  // Sort
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  sortLabel: { fontSize: 11, fontWeight: '600', color: colors.textTertiary, marginRight: 4 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: borderRadius.sm, gap: 3, backgroundColor: colors.surfaceVariant },
  sortBtnActive: { backgroundColor: colors.primary + '14' },
  sortBtnText: { fontSize: 11, fontWeight: '500', color: colors.textTertiary },
  sortBtnTextActive: { color: colors.primary, fontWeight: '600' },
  resultCnt: { fontSize: 11, color: colors.textTertiary, marginLeft: 'auto' },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 12 },
  emptySub: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },

  // Product card
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.outline, ...shadows.sm, overflow: 'hidden' },
  cardRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  cardIcon: { width: 44, height: 44, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, minWidth: 0 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardName: { fontSize: 13, fontWeight: '600', color: colors.text, flex: 1 },
  cardSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', marginRight: 6 },
  rxBadge: { backgroundColor: colors.primaryFaded, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  rxText: { fontSize: 9, fontWeight: '700', color: colors.primary },
  abcChip: { borderWidth: 1.5, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 0 },
  abcChipText: { fontSize: 9, fontWeight: '800' },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full, gap: 4, marginBottom: 3 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 13, fontWeight: '700' },
  cardPrice: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },

  // Detail expanded
  detail: { paddingHorizontal: 12, paddingBottom: 12 },
  divider: { height: 1, backgroundColor: colors.outline, marginBottom: 10 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  statCell: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md, paddingHorizontal: 8, paddingVertical: 5, minWidth: IS_DESKTOP ? 110 : '30%' as any },
  statLbl: { fontSize: 9, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  statVal: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 1 },
  thresholdRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  thresholdLbl: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  thresholdPill: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, gap: 3 },
  thresholdPillLbl: { fontSize: 9, fontWeight: '600' },
  thresholdPillVal: { fontSize: 11, fontWeight: '700', color: colors.text },
  section: { marginBottom: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 4 },
  batchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: colors.outline, gap: 8 },
  batchInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 140 },
  batchNum: { fontSize: 12, fontWeight: '600', color: colors.text },
  batchQty: { fontSize: 11, color: colors.textSecondary },
  expBar: { flex: 1, height: 4, backgroundColor: colors.surfaceVariant, borderRadius: 2, overflow: 'hidden' },
  expFill: { height: '100%', borderRadius: 2 },
  expBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, minWidth: 50, justifyContent: 'center' },
  expText: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  mvtMini: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  mvtMiniLbl: { flex: 1, fontSize: 11, color: colors.text },
  mvtMiniQty: { fontSize: 12, fontWeight: '700', minWidth: 40, textAlign: 'right' },
  mvtMiniDate: { fontSize: 10, color: colors.textTertiary, minWidth: 60, textAlign: 'right' },
  metaText: { fontSize: 10, color: colors.textTertiary, fontStyle: 'italic', marginBottom: 10 },
  actionRow: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: colors.outline, paddingTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: borderRadius.md, backgroundColor: colors.surfaceVariant },
  actionText: { fontSize: 11, fontWeight: '600' },

  // Batches tab
  batchSummary: { flexDirection: 'row', gap: 10 },
  batchSumCard: { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: 12, borderLeftWidth: 3, ...shadows.sm, alignItems: 'center' },
  batchSumVal: { fontSize: 20, fontWeight: '800', color: colors.text },
  batchSumLbl: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  batchGroup: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 14, ...shadows.sm, borderWidth: 1, borderColor: colors.outline },
  batchGroupTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  batchGroupRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.outline, gap: 10 },
  batchGroupProd: { fontSize: 13, fontWeight: '600', color: colors.text },
  batchGroupLot: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  batchGroupExp: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.sm },
  batchGroupExpText: { fontSize: 11, fontWeight: '700' },

  // Movements tab
  mvtDateHdr: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 6, marginTop: 4 },
  mvtCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: 12, gap: 10, ...shadows.sm, borderWidth: 1, borderColor: colors.outline },
  mvtIcon: { width: 36, height: 36, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  mvtTitle: { fontSize: 12, fontWeight: '600', color: colors.text },
  mvtProd: { fontSize: 11, color: colors.textSecondary },
  mvtReason: { fontSize: 10, color: colors.textTertiary, fontStyle: 'italic', marginTop: 1 },
  mvtQty: { fontSize: 14, fontWeight: '800' },
  mvtBal: { fontSize: 10, color: colors.textTertiary, marginTop: 1 },

  // Alerts tab
  alertCard: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: 12, gap: 10, borderLeftWidth: 3, ...shadows.sm },
  alertIcon: { width: 36, height: 36, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  alertTitle: { fontSize: 13, fontWeight: '600', color: colors.text },
  alertMsg: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  alertSev: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  alertSevText: { fontSize: 9, fontWeight: '700' },
  alertBtns: { flexDirection: 'row', gap: 12, marginTop: 6 },
  alertActBtn: { paddingVertical: 3 },
  alertActText: { fontSize: 11, fontWeight: '600' },

  // Stock adjust modal extras
  adjBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceVariant, padding: 14, borderRadius: borderRadius.lg, marginBottom: 12 },
  adjBoxLbl: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  adjBoxVal: { fontSize: 24, fontWeight: '800', color: colors.text },
  adjDirRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  adjDir: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: borderRadius.lg, borderWidth: 1.5, borderColor: colors.outline },
  adjDirText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
});

// ─── Modal Styles ──────────────────────────────────────────
const modalS = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  wrapper: { width: '100%', maxWidth: 640, maxHeight: '90%' },
  container: { backgroundColor: colors.surface, borderRadius: borderRadius.xxl, overflow: 'hidden', maxHeight: '90%', width: '100%', maxWidth: 640, ...shadows.xl },
  hdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.outline },
  hdrTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  body: { padding: 20, maxHeight: 500 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: colors.outline },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outline },
  cancelText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: borderRadius.lg },
  saveText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  sec: { fontSize: 13, fontWeight: '700', color: colors.primary, marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', gap: 10 },
  field: { marginBottom: 10 },
  fieldLbl: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 },
  fieldInput: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: colors.text, borderWidth: 1, borderColor: colors.outline },
  selectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: colors.outline },
  selectText: { fontSize: 13, color: colors.text },
  dropdown: { maxHeight: 150, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline, borderRadius: borderRadius.md, marginTop: 4 },
  ddItem: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.outline },
  ddItemActive: { backgroundColor: colors.primary + '0A' },
  ddText: { fontSize: 12, color: colors.text },
  toggleRow: { flexDirection: 'row', gap: 12, marginVertical: 8 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: borderRadius.md, backgroundColor: colors.surfaceVariant },
  toggleOn: { backgroundColor: colors.primary + '0A' },
  toggleText: { fontSize: 12, fontWeight: '500', color: colors.text },
  marginHint: { fontSize: 12, fontWeight: '600', color: '#10B981', marginTop: -4, marginBottom: 8 },
});
