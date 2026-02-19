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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../../components/GlobalUI';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import HybridDataService from '../../../services/HybridDataService';
import ApiService from '../../../services/ApiService';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import {
  Product, ProductCreate, ProductUpdate, ProductCategory, DosageForm, UnitOfMeasure, StorageCondition,
  InventoryItem, InventoryBatch, StockMovement, InventoryAlert,
  InventoryUtils,
} from '../../../models/Inventory';
import { getTextColor, getIconBackgroundColor, getSecondaryTextColor, getTertiaryTextColor } from '../../../utils/colorContrast';
import DateInput from '../../../components/DateInput';

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
  const [showImportModal, setShowImportModal] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // ─── Data loading — pulls from real backend API ─────────
  const loadData = useCallback(async () => {
    try {
      const api = ApiService.getInstance();
      
      // Add cache-busting timestamp to ensure fresh data
      const cacheBuster = { _t: Date.now() };

      // Fetch products, inventory items, batches, movements and alerts in parallel
      const [productsRes, itemsRes, batchesRes, movementsRes, alertsRes, statsRes] = await Promise.all([
        api.get('/inventory/products/', { page_size: 500, ...cacheBuster }),
        api.get('/inventory/items/', { page_size: 500, facility_id: 'pharmacy-main', ...cacheBuster }),
        api.get('/inventory/batches/', { page_size: 500, ...cacheBuster }),
        api.get('/inventory/movements/', { page_size: 200, ...cacheBuster }),
        api.get('/inventory/alerts/', { is_active: true, page_size: 200, ...cacheBuster }),
        api.get('/inventory/reports/stats/', cacheBuster),
      ]);

      const rawProducts: any[] = productsRes?.data?.results ?? productsRes?.data ?? [];
      const rawItems: any[] = itemsRes?.data?.results ?? itemsRes?.data ?? [];
      const rawBatches: any[] = batchesRes?.data?.results ?? batchesRes?.data ?? [];
      const rawMovements: any[] = movementsRes?.data?.results ?? movementsRes?.data ?? [];
      const rawAlerts: any[] = alertsRes?.data?.results ?? alertsRes?.data ?? [];
      const statsData: any = statsRes?.data ?? {};

      // Map backend snake_case → frontend camelCase for Product
      const mapProduct = (p: any): Product => ({
        id: p.id,
        organizationId: p.organization,
        name: p.name,
        genericName: p.generic_name ?? '',
        brandName: p.brand_name ?? '',
        sku: p.sku,
        barcode: p.barcode ?? '',
        description: p.notes ?? '',
        category: p.category,
        dosageForm: p.dosage_form,
        strength: p.strength ?? '',
        unitOfMeasure: p.unit_of_measure,
        packSize: p.pack_size ?? 1,
        manufacturer: p.manufacturer ?? '',
        requiresPrescription: p.requires_prescription ?? false,
        controlledSubstance: p.controlled_substance ?? false,
        costPrice: parseFloat(p.cost_price ?? '0'),
        sellingPrice: parseFloat(p.selling_price ?? '0'),
        currency: p.currency ?? 'USD',
        taxRate: 0,
        reorderLevel: p.reorder_level ?? 10,
        minStockLevel: p.min_stock_level ?? 5,
        maxStockLevel: p.max_stock_level ?? 500,
        reorderQuantity: p.reorder_quantity ?? 50,
        storageConditions: p.storage_condition ?? 'ROOM_TEMPERATURE',
        activeIngredients: [],
        insuranceReimbursable: false,
        safetyStockDays: 7,
        isActive: p.is_active ?? true,
        isDiscontinued: false,
        expirationDate: p.expiration_date ?? undefined,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      });

      // Map backend → InventoryItem
      const mapItem = (i: any): InventoryItem => ({
        id: i.id,
        organizationId: i.organization,
        productId: i.product,
        facilityId: i.facility_id ?? 'pharmacy-main',
        facilityType: 'PHARMACY',
        quantityOnHand: parseFloat(i.quantity_on_hand ?? '0'),
        quantityReserved: parseFloat(i.quantity_reserved ?? '0'),
        quantityAvailable: parseFloat(i.quantity_available ?? '0'),
        quantityOnOrder: parseFloat(i.quantity_on_order ?? '0'),
        quantityDamaged: 0,
        quantityExpired: 0,
        averageCost: parseFloat(i.average_cost ?? '0'),
        totalStockValue: parseFloat(i.total_value ?? '0'),
        lastPurchasePrice: parseFloat(i.average_cost ?? '0'),
        averageDailyUsage: 0,
        daysOfStockRemaining: 0,
        status: i.stock_status as any,
        isActive: true,
        createdAt: i.created_at,
        updatedAt: i.updated_at,
      });

      // Map backend → InventoryBatch
      const mapBatch = (b: any): InventoryBatch => ({
        id: b.id,
        inventoryItemId: b.inventory_item,
        batchNumber: b.batch_number ?? '',
        lotNumber: b.batch_number ?? '',
        manufactureDate: b.manufacture_date ?? '',
        expiryDate: b.expiry_date ?? '',
        supplierId: b.supplier,
        initialQuantity: parseFloat(b.initial_quantity ?? '0'),
        currentQuantity: parseFloat(b.current_quantity ?? '0'),
        unitCost: parseFloat(b.unit_cost ?? '0'),
        status: b.status as any,
        notes: b.quality_notes ?? '',
        createdAt: b.created_at,
        updatedAt: b.updated_at,
      });

      // Map backend → StockMovement
      const mapMovement = (m: any): StockMovement => ({
        id: m.id,
        organizationId: '',
        inventoryItemId: m.inventory_item,
        productId: '',
        movementType: m.movement_type as any,
        direction: m.direction as any,
        quantity: parseFloat(m.quantity ?? '0'),
        unitCost: parseFloat(m.unit_cost ?? '0'),
        totalCost: parseFloat(m.total_cost ?? '0'),
        previousBalance: 0,
        newBalance: 0,
        performedBy: m.performed_by_name ?? '',
        movementDate: m.movement_date ?? m.created_at,
        reason: m.reason ?? '',
        notes: m.notes ?? '',
        createdAt: m.created_at,
      });

      // Map backend → InventoryAlert
      const mapAlert = (a: any): InventoryAlert => ({
        id: a.id,
        organizationId: '',
        productId: a.product,
        inventoryItemId: '',
        alertType: a.alert_type as any,
        priority: a.severity as any,
        message: a.message,
        isActive: a.is_active ?? true,
        isAcknowledged: !!a.acknowledged_at,
        isResolved: !a.is_active,
        thresholdValue: 0,
        currentValue: 0,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
      });

      const mappedProducts = rawProducts.map(mapProduct);
      const mappedItems = rawItems.map(mapItem);
      
      // Recalculate inventory item statuses based on actual quantities and thresholds
      mappedItems.forEach(item => {
        const qty = item.quantityOnHand || 0;
        const product = mappedProducts.find(p => p.id === item.productId);
        if (product) {
          if (qty <= 0) {
            item.status = 'OUT_OF_STOCK';
          } else if (qty <= product.minStockLevel) {
            item.status = 'LOW_STOCK';
          } else if (qty >= product.maxStockLevel) {
            item.status = 'OVER_STOCK';
          } else {
            item.status = 'IN_STOCK';
          }
        }
      });
      
      const mappedBatches = rawBatches.map(mapBatch);
      const mappedMovements = rawMovements.map(mapMovement);
      const mappedAlerts = rawAlerts.map(mapAlert);

      // Build lookup maps
      const invByProduct = new Map<string, InventoryItem>();
      mappedItems.forEach(i => {
        const existing = invByProduct.get(i.productId);
        if (!existing) {
          invByProduct.set(i.productId, i);
          return;
        }

        const existingIsMain = existing.facilityId === 'pharmacy-main';
        const currentIsMain = i.facilityId === 'pharmacy-main';
        if (currentIsMain && !existingIsMain) {
          invByProduct.set(i.productId, i);
          return;
        }
        if (currentIsMain === existingIsMain) {
          const existingTs = new Date(existing.updatedAt || 0).getTime();
          const currentTs = new Date(i.updatedAt || 0).getTime();
          if (currentTs > existingTs) {
            invByProduct.set(i.productId, i);
          }
        }
      });

      const batchesByItem = new Map<string, InventoryBatch[]>();
      mappedBatches.forEach(b => {
        const arr = batchesByItem.get(b.inventoryItemId) ?? [];
        arr.push(b);
        batchesByItem.set(b.inventoryItemId, arr);
      });

      const movementsByItem = new Map<string, StockMovement[]>();
      mappedMovements.forEach(m => {
        const arr = movementsByItem.get(m.inventoryItemId) ?? [];
        arr.push(m);
        movementsByItem.set(m.inventoryItemId, arr);
      });

      const enriched: EnrichedProduct[] = mappedProducts.map(p => {
        const inv = invByProduct.get(p.id);
        const batches = inv ? (batchesByItem.get(inv.id) ?? []) : [];
        const movements = inv ? (movementsByItem.get(inv.id) ?? []) : [];
        return { ...p, inventoryItem: inv, batches, movements };
      });

      // Build summary — use the corrected local calculations
      const localLowStock = mappedItems.filter(i => i.status === 'LOW_STOCK').length;
      const localOutOfStock = mappedItems.filter(i => i.status === 'OUT_OF_STOCK').length;
      const localExpiring = mappedBatches.filter(b => { const d = daysUntilExpiry(b.expiryDate); return d > 0 && d <= 90; }).length;
      const localAlerts = mappedAlerts.filter(a => a.isActive).length;
      const localValue = mappedItems.reduce((s, i) => s + (i.totalStockValue || 0), 0);

      const summaryData = {
        totalProducts: statsData.total_products ?? mappedProducts.length,
        totalStockValue: statsData.total_value ?? localValue,
        lowStockCount: statsData.low_stock_count ?? localLowStock,
        outOfStockCount: statsData.out_of_stock_count ?? localOutOfStock,
        expiringBatchCount: statsData.expiring_soon_count ?? localExpiring,
        activeAlerts: statsData.active_alerts ?? localAlerts,
        pendingPurchaseOrders: statsData.pending_orders ?? 0,
      };

      setProducts(abcClassify(enriched));
      setSummary(summaryData);
      setAllMovements(mappedMovements);
      setAllAlerts(mappedAlerts);
    } catch (err) {
      console.error('Inventory load error', err);
      toast.error('Erreur lors du chargement de l\'inventaire');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => { 
    console.log('🔄 Manual refresh triggered');
    setRefreshing(true); 
    try {
      await loadData();
      console.log('✅ Refresh completed');
    } catch (error) {
      console.error('❌ Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  // ─── Filtering & sorting ─────────────────────────────────
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (catalogFilter === 'LOW_STOCK') {
      result = result.filter(p => p.inventoryItem?.status === 'LOW_STOCK' || p.inventoryItem?.status === 'OUT_OF_STOCK');
    } else if (catalogFilter === 'EXPIRING') {
      result = result.filter(p => {
        // Check both product-level and batch-level expiration
        const productExpiring = p.expirationDate ? (() => {
          const d = daysUntilExpiry(p.expirationDate);
          return d > 0 && d <= 90;
        })() : false;
        const batchExpiring = p.batches.some(b => { 
          const d = daysUntilExpiry(b.expiryDate); 
          return d > 0 && d <= 90; 
        });
        return productExpiring || batchExpiring;
      });
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
          // Priority: product expiration date, then earliest batch expiration
          const aProductExpiry = a.expirationDate ? daysUntilExpiry(a.expirationDate) : 9999;
          const aBatchExpiry = a.batches.length ? Math.min(...a.batches.map(bt => daysUntilExpiry(bt.expiryDate))) : 9999;
          const aMin = Math.min(aProductExpiry, aBatchExpiry);
          
          const bProductExpiry = b.expirationDate ? daysUntilExpiry(b.expirationDate) : 9999;
          const bBatchExpiry = b.batches.length ? Math.min(...b.batches.map(bt => daysUntilExpiry(bt.expiryDate))) : 9999;
          const bMin = Math.min(bProductExpiry, bBatchExpiry);
          
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
      const api = ApiService.getInstance();
      const inv = deletingProduct.inventoryItem;
      if (inv && inv.quantityOnHand > 0) {
        toast.warning(`Attention: ${inv.quantityOnHand} unités en stock seront perdues`);
      }
      await api.delete(`/inventory/products/${deletingProduct.id}/`);
      toast.success(`${deletingProduct.name} supprimé`);
      setShowDeleteConfirm(false);
      setDeletingProduct(null);
      setExpandedId(null);
      loadData();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  }, [deletingProduct, loadData]);

  const handleAlertAction = useCallback(async (alert: InventoryAlert, action: 'acknowledge' | 'resolve') => {
    try {
      const api = ApiService.getInstance();
      if (action === 'acknowledge') {
        await api.patch(`/inventory/alerts/${alert.id}/`, { acknowledged: true });
        toast.info('Alerte acquittée');
      } else {
        await api.patch(`/inventory/alerts/${alert.id}/`, { is_active: false });
        toast.success('Alerte résolue');
      }
      loadData();
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  }, [loadData]);

  // ─── Import: Template data (100 realistic medications for DRC/Africa pharmacy) ───
  const TEMPLATE_MEDICATIONS = useMemo(() => [
    { name: 'Paracétamol 500mg', generic_name: 'Paracétamol', sku: 'PARA-500', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '500mg', manufacturer: 'Denk Pharma', cost_price: 500, selling_price: 1000, quantity: 200, reorder_level: 50, min_stock_level: 20, max_stock_level: 500, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Amoxicilline 500mg', generic_name: 'Amoxicilline', sku: 'AMOX-500', category: 'MEDICATION', dosage_form: 'CAPSULE', unit_of_measure: 'CAPSULE', strength: '500mg', manufacturer: 'Sandoz', cost_price: 800, selling_price: 1500, quantity: 150, reorder_level: 40, min_stock_level: 15, max_stock_level: 400, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Ibuprofène 400mg', generic_name: 'Ibuprofène', sku: 'IBU-400', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '400mg', manufacturer: 'Ratiopharm', cost_price: 600, selling_price: 1200, quantity: 180, reorder_level: 40, min_stock_level: 15, max_stock_level: 450, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Ciprofloxacine 500mg', generic_name: 'Ciprofloxacine', sku: 'CIPRO-500', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '500mg', manufacturer: 'Bayer', cost_price: 1200, selling_price: 2500, quantity: 100, reorder_level: 30, min_stock_level: 10, max_stock_level: 300, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Métronidazole 500mg', generic_name: 'Métronidazole', sku: 'METRO-500', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '500mg', manufacturer: 'Sanofi', cost_price: 700, selling_price: 1400, quantity: 120, reorder_level: 35, min_stock_level: 15, max_stock_level: 350, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Oméprazole 20mg', generic_name: 'Oméprazole', sku: 'OMEP-20', category: 'MEDICATION', dosage_form: 'CAPSULE', unit_of_measure: 'CAPSULE', strength: '20mg', manufacturer: 'Medis', cost_price: 900, selling_price: 1800, quantity: 130, reorder_level: 30, min_stock_level: 10, max_stock_level: 300, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Diclofénac 50mg', generic_name: 'Diclofénac', sku: 'DICLO-50', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '50mg', manufacturer: 'Novartis', cost_price: 500, selling_price: 1000, quantity: 200, reorder_level: 50, min_stock_level: 20, max_stock_level: 500, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Artéméther-Luméfantrine', generic_name: 'Artéméther-Luméfantrine', sku: 'ALUM-20', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '20/120mg', manufacturer: 'Novartis', cost_price: 2000, selling_price: 4000, quantity: 80, reorder_level: 25, min_stock_level: 10, max_stock_level: 200, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: 'Antipaludéen - Coartem' },
    { name: 'Quinine Sulfate 300mg', generic_name: 'Quinine', sku: 'QUIN-300', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '300mg', manufacturer: 'IDA Foundation', cost_price: 1500, selling_price: 3000, quantity: 60, reorder_level: 20, min_stock_level: 10, max_stock_level: 150, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: 'Paludisme sévère' },
    { name: 'Cotrimoxazole 480mg', generic_name: 'Sulfaméthoxazole/Triméthoprime', sku: 'COTRI-480', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '400/80mg', manufacturer: 'Cipla', cost_price: 400, selling_price: 800, quantity: 250, reorder_level: 60, min_stock_level: 25, max_stock_level: 600, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Doxycycline 100mg', generic_name: 'Doxycycline', sku: 'DOXY-100', category: 'MEDICATION', dosage_form: 'CAPSULE', unit_of_measure: 'CAPSULE', strength: '100mg', manufacturer: 'Pfizer', cost_price: 600, selling_price: 1200, quantity: 100, reorder_level: 30, min_stock_level: 10, max_stock_level: 250, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Azithromycine 500mg', generic_name: 'Azithromycine', sku: 'AZITH-500', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '500mg', manufacturer: 'Pfizer', cost_price: 1500, selling_price: 3000, quantity: 70, reorder_level: 20, min_stock_level: 10, max_stock_level: 200, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: 'Zithromax' },
    { name: 'Érythromycine 500mg', generic_name: 'Érythromycine', sku: 'ERYTH-500', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '500mg', manufacturer: 'Abbott', cost_price: 800, selling_price: 1600, quantity: 90, reorder_level: 25, min_stock_level: 10, max_stock_level: 250, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Ceftriaxone 1g', generic_name: 'Ceftriaxone', sku: 'CEFT-1G', category: 'MEDICATION', dosage_form: 'INJECTION', unit_of_measure: 'VIAL', strength: '1g', manufacturer: 'Roche', cost_price: 3000, selling_price: 6000, quantity: 50, reorder_level: 15, min_stock_level: 5, max_stock_level: 120, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: 'Injectable IM/IV' },
    { name: 'Gentamicine 80mg/2ml', generic_name: 'Gentamicine', sku: 'GENT-80', category: 'MEDICATION', dosage_form: 'INJECTION', unit_of_measure: 'AMPOULE', strength: '80mg/2ml', manufacturer: 'Medochemie', cost_price: 1000, selling_price: 2000, quantity: 60, reorder_level: 20, min_stock_level: 10, max_stock_level: 150, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Cloxacilline 500mg', generic_name: 'Cloxacilline', sku: 'CLOX-500', category: 'MEDICATION', dosage_form: 'CAPSULE', unit_of_measure: 'CAPSULE', strength: '500mg', manufacturer: 'Strides', cost_price: 900, selling_price: 1800, quantity: 80, reorder_level: 25, min_stock_level: 10, max_stock_level: 200, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Ampicilline 500mg', generic_name: 'Ampicilline', sku: 'AMPI-500', category: 'MEDICATION', dosage_form: 'CAPSULE', unit_of_measure: 'CAPSULE', strength: '500mg', manufacturer: 'Cipla', cost_price: 700, selling_price: 1400, quantity: 100, reorder_level: 30, min_stock_level: 10, max_stock_level: 250, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Céfixime 200mg', generic_name: 'Céfixime', sku: 'CEFIX-200', category: 'MEDICATION', dosage_form: 'CAPSULE', unit_of_measure: 'CAPSULE', strength: '200mg', manufacturer: 'Lupin', cost_price: 1200, selling_price: 2500, quantity: 60, reorder_level: 20, min_stock_level: 10, max_stock_level: 150, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Fluconazole 150mg', generic_name: 'Fluconazole', sku: 'FLUCO-150', category: 'MEDICATION', dosage_form: 'CAPSULE', unit_of_measure: 'CAPSULE', strength: '150mg', manufacturer: 'Pfizer', cost_price: 1000, selling_price: 2000, quantity: 80, reorder_level: 20, min_stock_level: 10, max_stock_level: 200, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: 'Diflucan' },
    { name: 'Kétoconazole 200mg', generic_name: 'Kétoconazole', sku: 'KETO-200', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '200mg', manufacturer: 'Janssen', cost_price: 800, selling_price: 1600, quantity: 70, reorder_level: 20, min_stock_level: 10, max_stock_level: 180, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Mébendazole 100mg', generic_name: 'Mébendazole', sku: 'MEBEN-100', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '100mg', manufacturer: 'Janssen', cost_price: 300, selling_price: 600, quantity: 300, reorder_level: 80, min_stock_level: 30, max_stock_level: 800, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: 'Vermox - Antiparasitaire' },
    { name: 'Albendazole 400mg', generic_name: 'Albendazole', sku: 'ALBEN-400', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '400mg', manufacturer: 'GSK', cost_price: 400, selling_price: 800, quantity: 250, reorder_level: 60, min_stock_level: 25, max_stock_level: 600, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: 'Zentel' },
    { name: 'Métoclopramide 10mg', generic_name: 'Métoclopramide', sku: 'METOC-10', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '10mg', manufacturer: 'Sanofi', cost_price: 400, selling_price: 800, quantity: 150, reorder_level: 40, min_stock_level: 15, max_stock_level: 400, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: 'Primperan - Antiémétique' },
    { name: 'Loperamide 2mg', generic_name: 'Lopéramide', sku: 'LOPER-2', category: 'OTC', dosage_form: 'CAPSULE', unit_of_measure: 'CAPSULE', strength: '2mg', manufacturer: 'Janssen', cost_price: 500, selling_price: 1000, quantity: 180, reorder_level: 50, min_stock_level: 20, max_stock_level: 500, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: 'Imodium' },
    { name: 'SRO (Sels de Réhydratation)', generic_name: 'SRO', sku: 'SRO-SACH', category: 'OTC', dosage_form: 'POWDER', unit_of_measure: 'BOX', strength: '20.5g/sachet', manufacturer: 'UNICEF', cost_price: 200, selling_price: 400, quantity: 500, reorder_level: 100, min_stock_level: 50, max_stock_level: 1000, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Zinc 20mg', generic_name: 'Sulfate de Zinc', sku: 'ZINC-20', category: 'SUPPLEMENT', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '20mg', manufacturer: 'Nutriset', cost_price: 300, selling_price: 600, quantity: 300, reorder_level: 80, min_stock_level: 30, max_stock_level: 800, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: 'Complément diarrhée enfant' },
    { name: 'Salbutamol Aérosol 100mcg', generic_name: 'Salbutamol', sku: 'SALB-100', category: 'MEDICATION', dosage_form: 'INHALER', unit_of_measure: 'UNIT', strength: '100mcg/dose', manufacturer: 'GSK', cost_price: 3000, selling_price: 6000, quantity: 40, reorder_level: 15, min_stock_level: 5, max_stock_level: 100, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: 'Ventoline' },
    { name: 'Prednisolone 5mg', generic_name: 'Prednisolone', sku: 'PRED-5', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '5mg', manufacturer: 'Pfizer', cost_price: 600, selling_price: 1200, quantity: 100, reorder_level: 30, min_stock_level: 10, max_stock_level: 250, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Dexaméthasone 4mg', generic_name: 'Dexaméthasone', sku: 'DEXA-4', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '4mg', manufacturer: 'Medochemie', cost_price: 500, selling_price: 1000, quantity: 120, reorder_level: 30, min_stock_level: 10, max_stock_level: 300, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Hydrocortisone 1% Crème', generic_name: 'Hydrocortisone', sku: 'HYDRO-1CR', category: 'MEDICATION', dosage_form: 'CREAM', unit_of_measure: 'UNIT', strength: '1%', manufacturer: 'Pfizer', cost_price: 1500, selling_price: 3000, quantity: 50, reorder_level: 15, min_stock_level: 5, max_stock_level: 120, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Clotrimazole Crème 1%', generic_name: 'Clotrimazole', sku: 'CLOTRI-CR', category: 'MEDICATION', dosage_form: 'CREAM', unit_of_measure: 'UNIT', strength: '1%', manufacturer: 'Bayer', cost_price: 1200, selling_price: 2500, quantity: 60, reorder_level: 20, min_stock_level: 10, max_stock_level: 150, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: 'Antifongique topique' },
    { name: 'Miconazole Crème 2%', generic_name: 'Miconazole', sku: 'MICON-CR', category: 'MEDICATION', dosage_form: 'CREAM', unit_of_measure: 'UNIT', strength: '2%', manufacturer: 'Janssen', cost_price: 1300, selling_price: 2600, quantity: 50, reorder_level: 15, min_stock_level: 5, max_stock_level: 120, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Nystatine Suspension Orale', generic_name: 'Nystatine', sku: 'NYST-SUSP', category: 'MEDICATION', dosage_form: 'SUSPENSION', unit_of_measure: 'BOTTLE', strength: '100 000 UI/ml', manufacturer: 'Bristol-Myers', cost_price: 2000, selling_price: 4000, quantity: 40, reorder_level: 10, min_stock_level: 5, max_stock_level: 100, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Amlodipine 5mg', generic_name: 'Amlodipine', sku: 'AMLO-5', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '5mg', manufacturer: 'Pfizer', cost_price: 800, selling_price: 1600, quantity: 100, reorder_level: 30, min_stock_level: 10, max_stock_level: 250, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: 'Norvasc - Antihypertenseur' },
    { name: 'Énalapril 10mg', generic_name: 'Énalapril', sku: 'ENAL-10', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '10mg', manufacturer: 'Merck', cost_price: 700, selling_price: 1400, quantity: 90, reorder_level: 25, min_stock_level: 10, max_stock_level: 250, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Losartan 50mg', generic_name: 'Losartan', sku: 'LOSAR-50', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '50mg', manufacturer: 'Merck', cost_price: 900, selling_price: 1800, quantity: 80, reorder_level: 25, min_stock_level: 10, max_stock_level: 200, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Hydrochlorothiazide 25mg', generic_name: 'Hydrochlorothiazide', sku: 'HCTZ-25', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '25mg', manufacturer: 'Novartis', cost_price: 400, selling_price: 800, quantity: 150, reorder_level: 40, min_stock_level: 15, max_stock_level: 400, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: 'Diurétique' },
    { name: 'Furosémide 40mg', generic_name: 'Furosémide', sku: 'FURO-40', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '40mg', manufacturer: 'Sanofi', cost_price: 400, selling_price: 800, quantity: 120, reorder_level: 30, min_stock_level: 10, max_stock_level: 300, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: 'Lasix' },
    { name: 'Spironolactone 25mg', generic_name: 'Spironolactone', sku: 'SPIRO-25', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '25mg', manufacturer: 'Pfizer', cost_price: 700, selling_price: 1400, quantity: 70, reorder_level: 20, min_stock_level: 10, max_stock_level: 180, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Atenolol 50mg', generic_name: 'Aténolol', sku: 'ATEN-50', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '50mg', manufacturer: 'AstraZeneca', cost_price: 600, selling_price: 1200, quantity: 90, reorder_level: 25, min_stock_level: 10, max_stock_level: 250, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Nifédipine 20mg Retard', generic_name: 'Nifédipine', sku: 'NIFE-20', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '20mg', manufacturer: 'Bayer', cost_price: 800, selling_price: 1600, quantity: 80, reorder_level: 25, min_stock_level: 10, max_stock_level: 200, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: 'Libération prolongée' },
    { name: 'Metformine 500mg', generic_name: 'Metformine', sku: 'METF-500', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '500mg', manufacturer: 'Merck', cost_price: 500, selling_price: 1000, quantity: 150, reorder_level: 40, min_stock_level: 15, max_stock_level: 400, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: 'Glucophage - Diabète type 2' },
    { name: 'Glibenclamide 5mg', generic_name: 'Glibenclamide', sku: 'GLIB-5', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '5mg', manufacturer: 'Sanofi', cost_price: 400, selling_price: 800, quantity: 120, reorder_level: 30, min_stock_level: 10, max_stock_level: 300, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: 'Daonil' },
    { name: 'Insuline NPH 100UI/ml', generic_name: 'Insuline Isophane', sku: 'INSU-NPH', category: 'MEDICATION', dosage_form: 'INJECTION', unit_of_measure: 'VIAL', strength: '100UI/ml', manufacturer: 'Novo Nordisk', cost_price: 8000, selling_price: 15000, quantity: 20, reorder_level: 8, min_stock_level: 3, max_stock_level: 50, requires_prescription: true, storage_condition: 'REFRIGERATED', notes: 'Conserver au réfrigérateur 2-8°C' },
    { name: 'Insuline Rapide 100UI/ml', generic_name: 'Insuline Soluble', sku: 'INSU-RAP', category: 'MEDICATION', dosage_form: 'INJECTION', unit_of_measure: 'VIAL', strength: '100UI/ml', manufacturer: 'Novo Nordisk', cost_price: 8000, selling_price: 15000, quantity: 15, reorder_level: 5, min_stock_level: 3, max_stock_level: 40, requires_prescription: true, storage_condition: 'REFRIGERATED', notes: 'Conserver au réfrigérateur 2-8°C' },
    { name: 'Aspirine 100mg', generic_name: 'Acide acétylsalicylique', sku: 'ASP-100', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '100mg', manufacturer: 'Bayer', cost_price: 300, selling_price: 600, quantity: 200, reorder_level: 50, min_stock_level: 20, max_stock_level: 500, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: 'Dose cardiaque' },
    { name: 'Clopidogrel 75mg', generic_name: 'Clopidogrel', sku: 'CLOPI-75', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '75mg', manufacturer: 'Sanofi', cost_price: 1500, selling_price: 3000, quantity: 50, reorder_level: 15, min_stock_level: 5, max_stock_level: 120, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: 'Plavix' },
    { name: 'Warfarine 5mg', generic_name: 'Warfarine', sku: 'WARF-5', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '5mg', manufacturer: 'Bristol-Myers', cost_price: 1200, selling_price: 2500, quantity: 40, reorder_level: 10, min_stock_level: 5, max_stock_level: 100, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: 'Coumadine - Anticoagulant' },
    { name: 'Fer + Acide Folique', generic_name: 'Sulfate Ferreux/Acide Folique', sku: 'FER-FOL', category: 'SUPPLEMENT', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '200mg/0.4mg', manufacturer: 'WHO Essential', cost_price: 200, selling_price: 500, quantity: 400, reorder_level: 100, min_stock_level: 50, max_stock_level: 1000, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: 'Grossesse & anémie' },
    { name: 'Acide Folique 5mg', generic_name: 'Acide Folique', sku: 'AFOL-5', category: 'SUPPLEMENT', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '5mg', manufacturer: 'Medis', cost_price: 200, selling_price: 400, quantity: 300, reorder_level: 80, min_stock_level: 30, max_stock_level: 800, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Vitamine B Complexe', generic_name: 'Vitamine B Complexe', sku: 'VITB-COMP', category: 'SUPPLEMENT', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '', manufacturer: 'Roche', cost_price: 400, selling_price: 800, quantity: 200, reorder_level: 50, min_stock_level: 20, max_stock_level: 500, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Vitamine C 500mg', generic_name: 'Acide ascorbique', sku: 'VITC-500', category: 'SUPPLEMENT', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '500mg', manufacturer: 'Roche', cost_price: 300, selling_price: 600, quantity: 250, reorder_level: 60, min_stock_level: 25, max_stock_level: 600, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Calcium + Vitamine D3', generic_name: 'Carbonate de Calcium/Cholécalciférol', sku: 'CALC-VD3', category: 'SUPPLEMENT', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '500mg/400UI', manufacturer: 'Bayer', cost_price: 600, selling_price: 1200, quantity: 120, reorder_level: 30, min_stock_level: 10, max_stock_level: 300, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Multivitamines Adulte', generic_name: 'Multivitamines', sku: 'MULTI-ADU', category: 'SUPPLEMENT', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '', manufacturer: 'Pfizer', cost_price: 500, selling_price: 1000, quantity: 180, reorder_level: 50, min_stock_level: 20, max_stock_level: 500, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Amoxicilline Sirop 250mg/5ml', generic_name: 'Amoxicilline', sku: 'AMOX-SYR', category: 'MEDICATION', dosage_form: 'SYRUP', unit_of_measure: 'BOTTLE', strength: '250mg/5ml', manufacturer: 'Sandoz', cost_price: 2000, selling_price: 4000, quantity: 60, reorder_level: 20, min_stock_level: 10, max_stock_level: 150, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: '100ml' },
    { name: 'Paracétamol Sirop 120mg/5ml', generic_name: 'Paracétamol', sku: 'PARA-SYR', category: 'MEDICATION', dosage_form: 'SYRUP', unit_of_measure: 'BOTTLE', strength: '120mg/5ml', manufacturer: 'Sanofi', cost_price: 1500, selling_price: 3000, quantity: 80, reorder_level: 25, min_stock_level: 10, max_stock_level: 200, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: 'Doliprane pédiatrique 100ml' },
    { name: 'Ibuprofène Sirop 100mg/5ml', generic_name: 'Ibuprofène', sku: 'IBU-SYR', category: 'MEDICATION', dosage_form: 'SYRUP', unit_of_measure: 'BOTTLE', strength: '100mg/5ml', manufacturer: 'Ratiopharm', cost_price: 1800, selling_price: 3500, quantity: 50, reorder_level: 15, min_stock_level: 5, max_stock_level: 120, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: '100ml' },
    { name: 'Cotrimoxazole Sirop', generic_name: 'Sulfaméthoxazole/Triméthoprime', sku: 'COTRI-SYR', category: 'MEDICATION', dosage_form: 'SYRUP', unit_of_measure: 'BOTTLE', strength: '200/40mg per 5ml', manufacturer: 'Cipla', cost_price: 1500, selling_price: 3000, quantity: 60, reorder_level: 20, min_stock_level: 10, max_stock_level: 150, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: '100ml Bactrim pédiatrique' },
    { name: 'Chlorphénamine 4mg', generic_name: 'Chlorphéniramine', sku: 'CHLOR-4', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '4mg', manufacturer: 'Novartis', cost_price: 300, selling_price: 600, quantity: 200, reorder_level: 50, min_stock_level: 20, max_stock_level: 500, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: 'Antihistaminique' },
    { name: 'Cétirizine 10mg', generic_name: 'Cétirizine', sku: 'CETIR-10', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '10mg', manufacturer: 'UCB', cost_price: 600, selling_price: 1200, quantity: 150, reorder_level: 40, min_stock_level: 15, max_stock_level: 400, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: 'Zyrtec' },
    { name: 'Loratadine 10mg', generic_name: 'Loratadine', sku: 'LORAT-10', category: 'OTC', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '10mg', manufacturer: 'Schering', cost_price: 500, selling_price: 1000, quantity: 160, reorder_level: 40, min_stock_level: 15, max_stock_level: 400, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: 'Claritine' },
    { name: 'Ranitidine 150mg', generic_name: 'Ranitidine', sku: 'RANIT-150', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '150mg', manufacturer: 'GSK', cost_price: 500, selling_price: 1000, quantity: 110, reorder_level: 30, min_stock_level: 10, max_stock_level: 300, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: 'Zantac' },
    { name: 'Hydroxyde Aluminium/Magnésium', generic_name: 'Antiacide', sku: 'ANTAC-SUSP', category: 'OTC', dosage_form: 'SUSPENSION', unit_of_measure: 'BOTTLE', strength: '', manufacturer: 'Sanofi', cost_price: 1500, selling_price: 3000, quantity: 60, reorder_level: 20, min_stock_level: 10, max_stock_level: 150, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: 'Maalox 250ml' },
    { name: 'Tramadol 50mg', generic_name: 'Tramadol', sku: 'TRAM-50', category: 'MEDICATION', dosage_form: 'CAPSULE', unit_of_measure: 'CAPSULE', strength: '50mg', manufacturer: 'Grünenthal', cost_price: 800, selling_price: 1600, quantity: 80, reorder_level: 25, min_stock_level: 10, max_stock_level: 200, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: 'Antalgique opioïde faible' },
    { name: 'Morphine Sulfate 10mg', generic_name: 'Morphine', sku: 'MORPH-10', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '10mg', manufacturer: 'Mundipharma', cost_price: 2000, selling_price: 4000, quantity: 30, reorder_level: 10, min_stock_level: 5, max_stock_level: 80, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: 'Substance contrôlée' },
    { name: 'Diazépam 5mg', generic_name: 'Diazépam', sku: 'DIAZ-5', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '5mg', manufacturer: 'Roche', cost_price: 600, selling_price: 1200, quantity: 60, reorder_level: 20, min_stock_level: 10, max_stock_level: 150, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: 'Valium - Anxiolytique' },
    { name: 'Phénobarbital 100mg', generic_name: 'Phénobarbital', sku: 'PHENO-100', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '100mg', manufacturer: 'Sanofi', cost_price: 400, selling_price: 800, quantity: 70, reorder_level: 20, min_stock_level: 10, max_stock_level: 180, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: 'Antiépileptique' },
    { name: 'Carbamazépine 200mg', generic_name: 'Carbamazépine', sku: 'CARBA-200', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '200mg', manufacturer: 'Novartis', cost_price: 700, selling_price: 1400, quantity: 80, reorder_level: 25, min_stock_level: 10, max_stock_level: 200, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: 'Tegretol' },
    { name: 'Phénytoïne 100mg', generic_name: 'Phénytoïne', sku: 'PHENY-100', category: 'MEDICATION', dosage_form: 'CAPSULE', unit_of_measure: 'CAPSULE', strength: '100mg', manufacturer: 'Pfizer', cost_price: 600, selling_price: 1200, quantity: 60, reorder_level: 20, min_stock_level: 10, max_stock_level: 150, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: 'Di-Hydan' },
    { name: 'Amitriptyline 25mg', generic_name: 'Amitriptyline', sku: 'AMIT-25', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '25mg', manufacturer: 'Ratiopharm', cost_price: 500, selling_price: 1000, quantity: 70, reorder_level: 20, min_stock_level: 10, max_stock_level: 180, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: 'Antidépresseur / Douleur neuropathique' },
    { name: 'Halopéridol 5mg', generic_name: 'Halopéridol', sku: 'HALO-5', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '5mg', manufacturer: 'Janssen', cost_price: 500, selling_price: 1000, quantity: 50, reorder_level: 15, min_stock_level: 5, max_stock_level: 120, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: 'Antipsychotique' },
    { name: 'Chlorpromazine 100mg', generic_name: 'Chlorpromazine', sku: 'CHLORP-100', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '100mg', manufacturer: 'Sanofi', cost_price: 600, selling_price: 1200, quantity: 50, reorder_level: 15, min_stock_level: 5, max_stock_level: 120, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: 'Largactil' },
    { name: 'Oxytocine 10UI/ml', generic_name: 'Oxytocine', sku: 'OXYTO-10', category: 'MEDICATION', dosage_form: 'INJECTION', unit_of_measure: 'AMPOULE', strength: '10UI/ml', manufacturer: 'Novartis', cost_price: 2000, selling_price: 4000, quantity: 40, reorder_level: 15, min_stock_level: 5, max_stock_level: 100, requires_prescription: true, storage_condition: 'REFRIGERATED', notes: 'Conserver entre 2-8°C' },
    { name: 'Misoprostol 200mcg', generic_name: 'Misoprostol', sku: 'MISO-200', category: 'MEDICATION', dosage_form: 'TABLET', unit_of_measure: 'TABLET', strength: '200mcg', manufacturer: 'Pfizer', cost_price: 1500, selling_price: 3000, quantity: 30, reorder_level: 10, min_stock_level: 5, max_stock_level: 80, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: 'Cytotec' },
    { name: 'Sulfate de Magnésium 50%', generic_name: 'Sulfate de Magnésium', sku: 'MGSO4-50', category: 'MEDICATION', dosage_form: 'INJECTION', unit_of_measure: 'AMPOULE', strength: '50% (10ml)', manufacturer: 'IDA Foundation', cost_price: 1500, selling_price: 3000, quantity: 40, reorder_level: 15, min_stock_level: 5, max_stock_level: 100, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: 'Éclampsie / Pré-éclampsie' },
    { name: 'Lidocaïne 2%', generic_name: 'Lidocaïne', sku: 'LIDO-2', category: 'MEDICATION', dosage_form: 'INJECTION', unit_of_measure: 'VIAL', strength: '2% (20ml)', manufacturer: 'AstraZeneca', cost_price: 2000, selling_price: 4000, quantity: 30, reorder_level: 10, min_stock_level: 5, max_stock_level: 80, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: 'Anesthésique local' },
    { name: 'Kétamine 50mg/ml', generic_name: 'Kétamine', sku: 'KETA-50', category: 'MEDICATION', dosage_form: 'INJECTION', unit_of_measure: 'VIAL', strength: '50mg/ml (10ml)', manufacturer: 'Pfizer', cost_price: 5000, selling_price: 10000, quantity: 15, reorder_level: 5, min_stock_level: 3, max_stock_level: 40, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: 'Anesthésique - Substance contrôlée' },
    { name: 'Atropine 1mg/ml', generic_name: 'Atropine', sku: 'ATRO-1', category: 'MEDICATION', dosage_form: 'INJECTION', unit_of_measure: 'AMPOULE', strength: '1mg/ml', manufacturer: 'Medochemie', cost_price: 800, selling_price: 1600, quantity: 40, reorder_level: 15, min_stock_level: 5, max_stock_level: 100, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: 'Urgence' },
    { name: 'Adrénaline 1mg/ml', generic_name: 'Épinéphrine', sku: 'ADRE-1', category: 'MEDICATION', dosage_form: 'INJECTION', unit_of_measure: 'AMPOULE', strength: '1mg/ml', manufacturer: 'Medochemie', cost_price: 1200, selling_price: 2500, quantity: 30, reorder_level: 10, min_stock_level: 5, max_stock_level: 80, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: 'Urgence - Anaphylaxie' },
    { name: 'Glucosé 5% 500ml', generic_name: 'Dextrose', sku: 'GLUC-5-500', category: 'CONSUMABLE', dosage_form: 'INFUSION', unit_of_measure: 'BOTTLE', strength: '5%', manufacturer: 'Baxter', cost_price: 2500, selling_price: 5000, quantity: 50, reorder_level: 20, min_stock_level: 10, max_stock_level: 150, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: 'Perfusion' },
    { name: 'NaCl 0.9% 500ml', generic_name: 'Chlorure de Sodium', sku: 'NACL-500', category: 'CONSUMABLE', dosage_form: 'INFUSION', unit_of_measure: 'BOTTLE', strength: '0.9%', manufacturer: 'Baxter', cost_price: 2000, selling_price: 4000, quantity: 60, reorder_level: 25, min_stock_level: 10, max_stock_level: 200, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: 'Sérum physiologique' },
    { name: 'Ringer Lactate 500ml', generic_name: 'Ringer Lactate', sku: 'RLACT-500', category: 'CONSUMABLE', dosage_form: 'INFUSION', unit_of_measure: 'BOTTLE', strength: '', manufacturer: 'Baxter', cost_price: 2500, selling_price: 5000, quantity: 50, reorder_level: 20, min_stock_level: 10, max_stock_level: 150, requires_prescription: true, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Eau pour injection 10ml', generic_name: 'Eau pour préparation injectable', sku: 'EAU-INJ', category: 'CONSUMABLE', dosage_form: 'INJECTION', unit_of_measure: 'AMPOULE', strength: '10ml', manufacturer: 'Baxter', cost_price: 300, selling_price: 600, quantity: 200, reorder_level: 50, min_stock_level: 20, max_stock_level: 500, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Seringue 5ml', generic_name: 'Seringue jetable', sku: 'SER-5ML', category: 'CONSUMABLE', dosage_form: 'DEVICE', unit_of_measure: 'UNIT', strength: '5ml', manufacturer: 'BD', cost_price: 200, selling_price: 500, quantity: 500, reorder_level: 150, min_stock_level: 50, max_stock_level: 1500, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: 'Avec aiguille' },
    { name: 'Seringue 10ml', generic_name: 'Seringue jetable', sku: 'SER-10ML', category: 'CONSUMABLE', dosage_form: 'DEVICE', unit_of_measure: 'UNIT', strength: '10ml', manufacturer: 'BD', cost_price: 250, selling_price: 600, quantity: 400, reorder_level: 120, min_stock_level: 40, max_stock_level: 1200, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Gants Latex (Boîte 100)', generic_name: 'Gants examen latex', sku: 'GANT-LAT', category: 'CONSUMABLE', dosage_form: 'DEVICE', unit_of_measure: 'BOX', strength: 'M', manufacturer: 'Supermax', cost_price: 5000, selling_price: 9000, quantity: 30, reorder_level: 10, min_stock_level: 5, max_stock_level: 80, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: 'Boîte de 100' },
    { name: 'Compresses stériles 10x10', generic_name: 'Compresse stérile', sku: 'COMP-10', category: 'CONSUMABLE', dosage_form: 'DEVICE', unit_of_measure: 'PACK', strength: '10x10cm', manufacturer: 'Hartmann', cost_price: 1500, selling_price: 3000, quantity: 100, reorder_level: 30, min_stock_level: 10, max_stock_level: 300, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: 'Paquet de 10' },
    { name: 'Sparadrap 2.5cm x 5m', generic_name: 'Sparadrap', sku: 'SPAR-25', category: 'CONSUMABLE', dosage_form: 'DEVICE', unit_of_measure: 'UNIT', strength: '2.5cm x 5m', manufacturer: 'BSN Medical', cost_price: 1000, selling_price: 2000, quantity: 80, reorder_level: 25, min_stock_level: 10, max_stock_level: 200, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Bande élastique 10cm', generic_name: 'Bande de contention', sku: 'BAND-10', category: 'CONSUMABLE', dosage_form: 'DEVICE', unit_of_measure: 'UNIT', strength: '10cm x 4m', manufacturer: 'Hartmann', cost_price: 800, selling_price: 1500, quantity: 80, reorder_level: 25, min_stock_level: 10, max_stock_level: 200, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Coton hydrophile 100g', generic_name: 'Coton', sku: 'COT-100', category: 'CONSUMABLE', dosage_form: 'DEVICE', unit_of_measure: 'UNIT', strength: '100g', manufacturer: 'Hartmann', cost_price: 800, selling_price: 1500, quantity: 60, reorder_level: 20, min_stock_level: 10, max_stock_level: 150, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Fil de suture Soie 2/0', generic_name: 'Suture soie', sku: 'SUT-SOIE', category: 'SURGICAL_SUPPLY', dosage_form: 'DEVICE', unit_of_measure: 'UNIT', strength: '2/0', manufacturer: 'Ethicon', cost_price: 3000, selling_price: 6000, quantity: 30, reorder_level: 10, min_stock_level: 5, max_stock_level: 80, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: 'Avec aiguille' },
    { name: 'Cathéter IV 20G', generic_name: 'Cathéter intraveineux', sku: 'CATH-20G', category: 'CONSUMABLE', dosage_form: 'DEVICE', unit_of_measure: 'UNIT', strength: '20G', manufacturer: 'BD', cost_price: 500, selling_price: 1000, quantity: 200, reorder_level: 60, min_stock_level: 25, max_stock_level: 600, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Perfuseur standard', generic_name: 'Set de perfusion', sku: 'PERF-STD', category: 'CONSUMABLE', dosage_form: 'DEVICE', unit_of_measure: 'UNIT', strength: '', manufacturer: 'BD', cost_price: 500, selling_price: 1000, quantity: 150, reorder_level: 50, min_stock_level: 20, max_stock_level: 400, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Thermomètre digital', generic_name: 'Thermomètre', sku: 'THERM-DIG', category: 'MEDICAL_DEVICE', dosage_form: 'DEVICE', unit_of_measure: 'UNIT', strength: '', manufacturer: 'Omron', cost_price: 3000, selling_price: 6000, quantity: 20, reorder_level: 5, min_stock_level: 3, max_stock_level: 50, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Tensiomètre électronique', generic_name: 'Tensiomètre', sku: 'TENSI-ELE', category: 'MEDICAL_DEVICE', dosage_form: 'DEVICE', unit_of_measure: 'UNIT', strength: '', manufacturer: 'Omron', cost_price: 25000, selling_price: 45000, quantity: 5, reorder_level: 2, min_stock_level: 1, max_stock_level: 15, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Glucomètre + Bandelettes', generic_name: 'Glucomètre', sku: 'GLUCO-KIT', category: 'MEDICAL_DEVICE', dosage_form: 'DEVICE', unit_of_measure: 'UNIT', strength: '', manufacturer: 'Accu-Chek', cost_price: 20000, selling_price: 35000, quantity: 8, reorder_level: 3, min_stock_level: 1, max_stock_level: 20, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: 'Avec 50 bandelettes' },
    { name: 'Test de Grossesse (TDR)', generic_name: 'Test rapide hCG', sku: 'TEST-GROS', category: 'MEDICAL_DEVICE', dosage_form: 'DEVICE', unit_of_measure: 'UNIT', strength: '', manufacturer: 'Wondfo', cost_price: 500, selling_price: 2000, quantity: 100, reorder_level: 30, min_stock_level: 10, max_stock_level: 300, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: 'Bandelette urinaire' },
    { name: 'TDR Paludisme (Pf)', generic_name: 'Test rapide paludisme', sku: 'TDR-PALU', category: 'MEDICAL_DEVICE', dosage_form: 'DEVICE', unit_of_measure: 'UNIT', strength: '', manufacturer: 'SD Bioline', cost_price: 800, selling_price: 2500, quantity: 150, reorder_level: 50, min_stock_level: 20, max_stock_level: 500, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: 'P.falciparum' },
    { name: 'Povidone-Iodée 10% 500ml', generic_name: 'Povidone-Iodée', sku: 'BETAD-500', category: 'CONSUMABLE', dosage_form: 'SOLUTION', unit_of_measure: 'BOTTLE', strength: '10%', manufacturer: 'Mundipharma', cost_price: 3000, selling_price: 6000, quantity: 40, reorder_level: 15, min_stock_level: 5, max_stock_level: 100, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: 'Bétadine' },
    { name: 'Chlorhexidine 0.5% 500ml', generic_name: 'Chlorhexidine', sku: 'CHLORHEX-500', category: 'CONSUMABLE', dosage_form: 'SOLUTION', unit_of_measure: 'BOTTLE', strength: '0.5%', manufacturer: 'Medis', cost_price: 2500, selling_price: 5000, quantity: 40, reorder_level: 15, min_stock_level: 5, max_stock_level: 100, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Alcool 70% 500ml', generic_name: 'Alcool isopropylique', sku: 'ALC-70', category: 'CONSUMABLE', dosage_form: 'SOLUTION', unit_of_measure: 'BOTTLE', strength: '70%', manufacturer: 'Medis', cost_price: 1500, selling_price: 3000, quantity: 60, reorder_level: 20, min_stock_level: 10, max_stock_level: 150, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Peroxyde hydrogène 3% 500ml', generic_name: 'Eau oxygénée', sku: 'H2O2-3', category: 'CONSUMABLE', dosage_form: 'SOLUTION', unit_of_measure: 'BOTTLE', strength: '3%', manufacturer: 'Medis', cost_price: 1000, selling_price: 2000, quantity: 50, reorder_level: 15, min_stock_level: 5, max_stock_level: 120, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Lame de bistouri N°10', generic_name: 'Lame chirurgicale', sku: 'BIST-10', category: 'SURGICAL_SUPPLY', dosage_form: 'DEVICE', unit_of_measure: 'UNIT', strength: 'N°10', manufacturer: 'Swann-Morton', cost_price: 500, selling_price: 1000, quantity: 100, reorder_level: 30, min_stock_level: 10, max_stock_level: 300, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: 'Boîte de 100' },
    { name: 'Savon antiseptique 500ml', generic_name: 'Savon Chlorhexidine', sku: 'SAV-ANTI', category: 'PERSONAL_HYGIENE', dosage_form: 'SOLUTION', unit_of_measure: 'BOTTLE', strength: '', manufacturer: 'Medis', cost_price: 2000, selling_price: 4000, quantity: 40, reorder_level: 15, min_stock_level: 5, max_stock_level: 100, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Gel hydroalcoolique 500ml', generic_name: 'Solution hydroalcoolique', sku: 'GEL-HA', category: 'PERSONAL_HYGIENE', dosage_form: 'GEL', unit_of_measure: 'BOTTLE', strength: '', manufacturer: 'Anios', cost_price: 3000, selling_price: 6000, quantity: 30, reorder_level: 10, min_stock_level: 5, max_stock_level: 80, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Crème solaire SPF50', generic_name: 'Écran solaire', sku: 'SOLAIRE-50', category: 'COSMETIC', dosage_form: 'CREAM', unit_of_measure: 'UNIT', strength: 'SPF50', manufacturer: 'La Roche-Posay', cost_price: 8000, selling_price: 15000, quantity: 15, reorder_level: 5, min_stock_level: 2, max_stock_level: 40, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Vaseline pure 100g', generic_name: 'Vaseline', sku: 'VASEL-100', category: 'COSMETIC', dosage_form: 'OINTMENT', unit_of_measure: 'UNIT', strength: '100g', manufacturer: 'Unilever', cost_price: 1000, selling_price: 2000, quantity: 60, reorder_level: 20, min_stock_level: 10, max_stock_level: 150, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: '' },
    { name: 'Couches bébé (Taille M)', generic_name: 'Couches jetables', sku: 'COUCH-M', category: 'BABY_CARE', dosage_form: 'DEVICE', unit_of_measure: 'PACK', strength: 'Taille M', manufacturer: 'Pampers', cost_price: 5000, selling_price: 8000, quantity: 25, reorder_level: 8, min_stock_level: 3, max_stock_level: 60, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: 'Paquet de 30' },
    { name: 'Lait infantile 0-6 mois', generic_name: 'Formule infantile', sku: 'LAIT-06', category: 'BABY_CARE', dosage_form: 'POWDER', unit_of_measure: 'BOX', strength: '400g', manufacturer: 'Nestlé', cost_price: 6000, selling_price: 10000, quantity: 20, reorder_level: 5, min_stock_level: 3, max_stock_level: 50, requires_prescription: false, storage_condition: 'ROOM_TEMPERATURE', notes: 'NAN 1' },
  ], []);

  // ─── Import: Generate and download Excel template ────────
  const handleDownloadTemplate = useCallback(async () => {
    try {
      const headers = [
        'name', 'generic_name', 'sku', 'category', 'dosage_form',
        'unit_of_measure', 'strength', 'manufacturer', 'cost_price',
        'selling_price', 'quantity', 'reorder_level', 'min_stock_level',
        'max_stock_level', 'requires_prescription', 'storage_condition', 'notes',
      ];
      const wsData = [headers, ...TEMPLATE_MEDICATIONS.map(m => headers.map(h => (m as any)[h] ?? ''))];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Column widths for readability
      ws['!cols'] = [
        { wch: 35 }, { wch: 30 }, { wch: 14 }, { wch: 16 }, { wch: 14 },
        { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 12 },
        { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
        { wch: 12 }, { wch: 18 }, { wch: 20 }, { wch: 30 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Modèle Inventaire');

      // Add instruction sheet
      const instrData = [
        ['GUIDE D\'IMPORTATION INVENTAIRE'],
        [''],
        ['Colonnes obligatoires:', 'name (Nom du produit)'],
        ['Colonnes optionnelles:', 'Toutes les autres colonnes'],
        [''],
        ['CATÉGORIES VALIDES:'],
        ['MEDICATION', 'OTC', 'SUPPLEMENT', 'CONSUMABLE', 'MEDICAL_DEVICE', 'SURGICAL_SUPPLY', 'COSMETIC', 'BABY_CARE', 'PERSONAL_HYGIENE', 'LAB_REAGENT', 'OTHER'],
        [''],
        ['FORMES GALÉNIQUES VALIDES:'],
        ['TABLET', 'CAPSULE', 'SYRUP', 'SUSPENSION', 'INJECTION', 'CREAM', 'OINTMENT', 'GEL', 'DROPS', 'INHALER', 'SUPPOSITORY', 'POWDER', 'SOLUTION', 'SPRAY', 'INFUSION', 'DEVICE', 'OTHER'],
        [''],
        ['UNITÉS DE MESURE VALIDES:'],
        ['UNIT', 'TABLET', 'CAPSULE', 'ML', 'MG', 'G', 'VIAL', 'AMPOULE', 'BOTTLE', 'BOX', 'PACK'],
        [''],
        ['CONDITIONS DE STOCKAGE:'],
        ['ROOM_TEMPERATURE', 'REFRIGERATED', 'FROZEN', 'COOL_DRY'],
        [''],
        ['NOTES:'],
        ['- Le SKU est auto-généré si laissé vide'],
        ['- Les prix sont en CDF (Franc Congolais)'],
        ['- requires_prescription: true/false ou oui/non ou 1/0'],
        ['- Si un SKU existe déjà, le produit sera mis à jour au lieu d\'être créé'],
        ['- Les lignes avec des erreurs seront ignorées, les autres seront importées normalement'],
      ];
      const instrWs = XLSX.utils.aoa_to_sheet(instrData);
      instrWs['!cols'] = [{ wch: 35 }, ...Array(10).fill({ wch: 18 })];
      XLSX.utils.book_append_sheet(wb, instrWs, 'Instructions');

      if (Platform.OS === 'web') {
        XLSX.writeFile(wb, 'modele_inventaire.xlsx');
        toast.success('Modèle téléchargé !');
      } else {
        // Mobile: write to temp then share
        const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const uri = FileSystem.cacheDirectory + 'modele_inventaire.xlsx';
        await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: 'Exporter Modèle Inventaire',
          });
        } else {
          toast.success('Fichier sauvegardé dans le cache');
        }
      }
    } catch (err: any) {
      console.error('Template download error:', err);
      toast.error('Erreur lors du téléchargement du modèle');
    }
  }, [TEMPLATE_MEDICATIONS, toast]);

  // ─── Import: Pick file & parse Excel ─────────────────────
  const handlePickAndParseFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const file = result.assets[0];
      setImportLoading(true);
      setImportResult(null);
      setShowImportModal(true);

      let data: any[];

      if (Platform.OS === 'web') {
        // Web: use fetch + arrayBuffer
        const response = await fetch(file.uri);
        const ab = await response.arrayBuffer();
        const wb = XLSX.read(ab, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
      } else {
        // Mobile: read base64 from file system
        const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
        const wb = XLSX.read(base64, { type: 'base64' });
        const sheetName = wb.SheetNames[0];
        data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
      }

      if (!data || data.length === 0) {
        setImportLoading(false);
        setImportResult({ error: 'Le fichier est vide ou ne contient pas de données valides.' });
        return;
      }

      // Validate minimum: each row must have a 'name'
      const validRows = data.filter((row: any) => row.name && String(row.name).trim());
      const invalidCount = data.length - validRows.length;

      if (validRows.length === 0) {
        setImportLoading(false);
        setImportResult({
          error: 'Aucune ligne valide trouvée. Vérifiez que la colonne "name" est renseignée.',
          totalRows: data.length,
          invalidRows: invalidCount,
        });
        return;
      }

      // Normalize keys: trim whitespace, lowercase for safety
      const normalizedRows = validRows.map((row: any) => {
        const normalized: any = {};
        Object.keys(row).forEach(key => {
          const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_');
          let val = row[key];
          // Convert "TRUE"/"FALSE" strings
          if (typeof val === 'string') {
            const lower = val.trim().toLowerCase();
            if (lower === 'true' || lower === 'oui') val = true;
            if (lower === 'false' || lower === 'non') val = false;
          }
          normalized[cleanKey] = val;
        });
        return normalized;
      });

      // Send to backend
      try {
        const api = ApiService.getInstance();
        const response = await api.post('/inventory/products/bulk-import/', {
          products: normalizedRows,
        });

        if (response.success && response.data) {
          setImportResult({
            success: true,
            ...response.data,
            invalidRows: invalidCount,
          });
          // Reload inventory data
          loadData();
        } else {
          setImportResult({
            error: response.error?.message || 'Erreur lors de l\'importation.',
            details: response.errors,
          });
        }
      } catch (apiErr: any) {
        setImportResult({
          error: apiErr?.message || 'Erreur de connexion au serveur.',
        });
      }

      setImportLoading(false);
    } catch (err: any) {
      console.error('Import error:', err);
      setImportLoading(false);
      if (err?.message?.includes('cancel') || err?.code === 'ERR_CANCELED') return;
      setImportResult({ error: 'Erreur lors de la lecture du fichier: ' + (err?.message || 'Inconnue') });
      setShowImportModal(true);
    }
  }, [loadData, toast]);

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
              style={[styles.btnOutline, { borderColor: colors.info, opacity: refreshing ? 0.6 : 1 }]}
              onPress={onRefresh}
              disabled={refreshing}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={refreshing ? "sync" : "refresh-outline"} 
                size={16} 
                color={colors.info}
                style={refreshing ? { transform: [{ rotate: '180deg' }] } : {}}
              />
              <Text style={[styles.btnOutlineText, { color: colors.info }]}>
                {refreshing ? 'Actualisation...' : 'Actualiser'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnOutlineSuccess}
              onPress={handleDownloadTemplate}
              activeOpacity={0.7}
            >
              <Ionicons name="download-outline" size={16} color="#10B981" />
              <Text style={[styles.btnOutlineText, { color: '#10B981' }]}>Modèle Excel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnOutlineImport}
              onPress={handlePickAndParseFile}
              activeOpacity={0.7}
            >
              <Ionicons name="cloud-upload-outline" size={16} color={colors.info} />
              <Text style={[styles.btnOutlineText, { color: colors.info }]}>Importer Excel</Text>
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
          onSaved={(productId, newQty, newStatus) => {
            console.log('🔄 Stock updated:', { productId, newQty, newStatus });
            
            // Immediately update the adjusted product in local state so UI is instant
            setProducts(prev => {
              const updated = prev.map(p => {
                if (p.id !== productId) return p;
                const updatedInv = p.inventoryItem
                  ? { 
                      ...p.inventoryItem, 
                      quantityOnHand: newQty, 
                      quantityAvailable: Math.max(0, newQty - (p.inventoryItem.quantityReserved || 0)), 
                      status: newStatus as any,
                      totalStockValue: newQty * (p.inventoryItem.averageCost || p.costPrice || 0),
                      updatedAt: new Date().toISOString()
                    }
                  : undefined;
                return { ...p, inventoryItem: updatedInv };
              });
              console.log('📦 Local state updated');
              return updated;
            });
            
            setShowAdjustModal(false);
            
            // Force refresh after a short delay to ensure backend sync
            setTimeout(() => {
              console.log('🔄 Reloading data from backend...');
              loadData();
            }, 500);
          }}
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

      {/* ═══ IMPORT RESULTS MODAL ═══ */}
      {showImportModal && (
        <Modal transparent animationType="fade" visible>
          <View style={modalS.backdrop}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={modalS.wrapper}>
              <View style={[modalS.container, { maxHeight: '85%' }]}>
                {/* Header */}
                <View style={modalS.hdr}>
                  <Text style={modalS.hdrTitle}>
                    {importLoading ? 'Importation en cours…' : 'Résultat de l\'importation'}
                  </Text>
                  {!importLoading && (
                    <TouchableOpacity onPress={() => { setShowImportModal(false); setImportResult(null); }}>
                      <Ionicons name="close" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Body */}
                <ScrollView style={modalS.body} contentContainerStyle={{ paddingBottom: 20 }}>
                  {importLoading && (
                    <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                      <ActivityIndicator size="large" color={colors.primary} />
                      <Text style={{ marginTop: 16, fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>
                        Lecture et importation des données…{'\n'}Veuillez patienter.
                      </Text>
                    </View>
                  )}

                  {!importLoading && importResult?.error && !importResult?.success && (
                    <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                      <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: colors.error + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                        <Ionicons name="close-circle" size={36} color={colors.error} />
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.error, textAlign: 'center', marginBottom: 8 }}>
                        Erreur d'importation
                      </Text>
                      <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 10 }}>
                        {importResult.error}
                      </Text>
                      {importResult.totalRows != null && (
                        <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 8 }}>
                          {importResult.totalRows} lignes lues · {importResult.invalidRows || 0} sans nom
                        </Text>
                      )}
                    </View>
                  )}

                  {!importLoading && importResult?.success && importResult?.summary && (
                    <View>
                      {/* Success header */}
                      <View style={{ alignItems: 'center', marginBottom: 20 }}>
                        <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#10B98115', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                          <Ionicons name="checkmark-circle" size={36} color="#10B981" />
                        </View>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: '#10B981' }}>
                          Importation réussie !
                        </Text>
                      </View>

                      {/* Summary cards */}
                      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                        <View style={{ flex: 1, backgroundColor: colors.primary + '0A', borderRadius: borderRadius.lg, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.primary + '20' }}>
                          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.primary }}>{importResult.summary.total_rows}</Text>
                          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>Lignes totales</Text>
                        </View>
                        <View style={{ flex: 1, backgroundColor: '#10B98108', borderRadius: borderRadius.lg, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#10B98120' }}>
                          <Text style={{ fontSize: 24, fontWeight: '800', color: '#10B981' }}>{importResult.summary.created}</Text>
                          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>Créés</Text>
                        </View>
                        <View style={{ flex: 1, backgroundColor: colors.info + '08', borderRadius: borderRadius.lg, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.info + '20' }}>
                          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.info }}>{importResult.summary.updated}</Text>
                          <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>Mis à jour</Text>
                        </View>
                        {importResult.summary.errors > 0 && (
                          <View style={{ flex: 1, backgroundColor: colors.error + '08', borderRadius: borderRadius.lg, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.error + '20' }}>
                            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.error }}>{importResult.summary.errors}</Text>
                            <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>Erreurs</Text>
                          </View>
                        )}
                      </View>

                      {/* Skipped rows from frontend validation */}
                      {importResult.invalidRows > 0 && (
                        <View style={{ backgroundColor: colors.warning + '10', borderRadius: borderRadius.md, padding: 10, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: colors.warning }}>
                          <Text style={{ fontSize: 12, color: colors.warning, fontWeight: '600' }}>
                            {importResult.invalidRows} ligne(s) ignorée(s) – colonne "name" vide
                          </Text>
                        </View>
                      )}

                      {/* Error details */}
                      {importResult.errors && importResult.errors.length > 0 && (
                        <View style={{ marginBottom: 12 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.error, marginBottom: 8 }}>
                            Détails des erreurs :
                          </Text>
                          {importResult.errors.slice(0, 20).map((e: any, i: number) => (
                            <View key={i} style={{ flexDirection: 'row', gap: 8, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.outline }}>
                              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.error, minWidth: 50 }}>
                                Ligne {e.row}
                              </Text>
                              <Text style={{ fontSize: 11, color: colors.textSecondary, flex: 1 }}>
                                {e.message}
                              </Text>
                            </View>
                          ))}
                          {importResult.errors.length > 20 && (
                            <Text style={{ fontSize: 11, color: colors.textTertiary, fontStyle: 'italic', marginTop: 4 }}>
                              … et {importResult.errors.length - 20} erreurs supplémentaires
                            </Text>
                          )}
                        </View>
                      )}

                      {/* Created products preview */}
                      {importResult.created_products && importResult.created_products.length > 0 && (
                        <View style={{ marginBottom: 12 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#10B981', marginBottom: 8 }}>
                            Produits créés ({importResult.created_products.length}) :
                          </Text>
                          {importResult.created_products.slice(0, 10).map((p: any, i: number) => (
                            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 }}>
                              <Ionicons name="checkmark" size={14} color="#10B981" />
                              <Text style={{ fontSize: 12, color: colors.text, flex: 1 }} numberOfLines={1}>
                                {p.name}
                              </Text>
                              <Text style={{ fontSize: 10, color: colors.textTertiary }}>{p.sku}</Text>
                              {p.quantity > 0 && (
                                <Text style={{ fontSize: 10, color: colors.primary, fontWeight: '600' }}>
                                  {p.quantity} unités
                                </Text>
                              )}
                            </View>
                          ))}
                          {importResult.created_products.length > 10 && (
                            <Text style={{ fontSize: 11, color: colors.textTertiary, fontStyle: 'italic', marginTop: 4 }}>
                              … et {importResult.created_products.length - 10} autres produits
                            </Text>
                          )}
                        </View>
                      )}

                      {/* Updated products preview */}
                      {importResult.updated_products && importResult.updated_products.length > 0 && (
                        <View>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.info, marginBottom: 8 }}>
                            Produits mis à jour ({importResult.updated_products.length}) :
                          </Text>
                          {importResult.updated_products.slice(0, 10).map((p: any, i: number) => (
                            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 }}>
                              <Ionicons name="refresh" size={14} color={colors.info} />
                              <Text style={{ fontSize: 12, color: colors.text, flex: 1 }} numberOfLines={1}>
                                {p.name}
                              </Text>
                              <Text style={{ fontSize: 10, color: colors.textTertiary }}>{p.sku}</Text>
                            </View>
                          ))}
                          {importResult.updated_products.length > 10 && (
                            <Text style={{ fontSize: 11, color: colors.textTertiary, fontStyle: 'italic', marginTop: 4 }}>
                              … et {importResult.updated_products.length - 10} autres produits
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </ScrollView>

                {/* Footer */}
                {!importLoading && (
                  <View style={modalS.footer}>
                    <TouchableOpacity
                      style={modalS.cancelBtn}
                      onPress={() => { setShowImportModal(false); setImportResult(null); }}
                    >
                      <Text style={modalS.cancelText}>Fermer</Text>
                    </TouchableOpacity>
                    {importResult?.error && !importResult?.success && (
                      <TouchableOpacity
                        style={modalS.saveBtn}
                        onPress={() => { setShowImportModal(false); setImportResult(null); handlePickAndParseFile(); }}
                      >
                        <Ionicons name="refresh" size={16} color="#FFF" />
                        <Text style={modalS.saveText}>Réessayer</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
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
    { key: 'EXPIRING', label: '⏰ Exp. < 90j', count: allProducts.filter(p => {
      // Check both product-level and batch-level expiration
      const productExpiring = p.expirationDate ? (() => {
        const d = daysUntilExpiry(p.expirationDate);
        return d > 0 && d <= 90;
      })() : false;
      const batchExpiring = p.batches.some(b => { 
        const d = daysUntilExpiry(b.expiryDate); 
        return d > 0 && d <= 90; 
      });
      return productExpiring || batchExpiring;
    }).length },
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
  
  // Check for expiring products (product-level or batch-level)
  const hasExpiringProduct = product.expirationDate ? (() => {
    const d = daysUntilExpiry(product.expirationDate);
    return d > 0 && d <= 90;
  })() : false;
  const hasExpiringBatch = product.batches.some(b => { 
    const d = daysUntilExpiry(b.expiryDate); 
    return d > 0 && d <= 90; 
  });
  const hasExpiring = hasExpiringProduct || hasExpiringBatch;
  
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
          {(() => {
            // Show product-level expiration date if available
            if (product.expirationDate) {
              const d = daysUntilExpiry(product.expirationDate);
              const isExp = d <= 0;
              const isExpiring = d <= 90 && d > 0;
              if (isExp || isExpiring) {
                return (
                  <Text style={{ fontSize: 11, color: isExp ? colors.error : colors.warning, marginTop: 2 }}>
                    <Ionicons name="calendar-outline" size={11} color={isExp ? colors.error : colors.warning} />
                    {' '}Produit: {isExp ? 'Expiré' : `Exp. ${new Date(product.expirationDate).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })} (${d}j)`}
                  </Text>
                );
              }
            }
            
            // Show batch expiration as fallback/additional info
            const earliest = product.batches
              .filter(b => b.expiryDate)
              .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())[0];
            if (!earliest) return null;
            const d = daysUntilExpiry(earliest.expiryDate);
            const isExp = d <= 0;
            const isExpiring = d <= 90 && d > 0;
            if (!isExp && !isExpiring) return null;
            return (
              <Text style={{ fontSize: 11, color: isExp ? colors.error : colors.warning, marginTop: 2 }}>
                <Ionicons name="time-outline" size={11} color={isExp ? colors.error : colors.warning} />
                {' '}Lot: {isExp ? 'Expiré' : `Exp. ${new Date(earliest.expiryDate).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })} (${d}j)`}
              </Text>
            );
          })()}
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
            {product.expirationDate && (
              <Stat 
                label="Exp. produit" 
                val={(() => {
                  const days = daysUntilExpiry(product.expirationDate);
                  const isExp = days <= 0;
                  const isExpiring = days <= 90 && days > 0;
                  if (isExp) return 'EXPIRÉ';
                  if (isExpiring) return `${days}j restants`;
                  return new Date(product.expirationDate).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });
                })()} 
                valColor={(() => {
                  const days = daysUntilExpiry(product.expirationDate);
                  return days <= 0 ? colors.error : days <= 90 ? colors.warning : undefined;
                })()}
              />
            )}
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
                      <Text style={styles.batchQty}>{batch.currentQuantity} unités</Text>
                    </View>
                    <View style={styles.expBar}>
                      <View style={[styles.expFill, {
                        width: `${Math.max(5, Math.min(100, (days / 365) * 100))}%`,
                        backgroundColor: isExp ? colors.error : isExpiring ? colors.warning : '#10B981',
                      }]} />
                    </View>
                    <View style={[styles.expBadge, (isExp || isExpiring) && { backgroundColor: (isExp ? colors.error : colors.warning) + '14' }]}>
                      {(isExp || isExpiring) && <Ionicons name="warning" size={11} color={isExp ? colors.error : colors.warning} />}
                      <View>
                        <Text style={[styles.expText, (isExp || isExpiring) && { color: isExp ? colors.error : colors.warning, fontWeight: '700' }]}>
                          {isExp ? 'Expiré' : `${days}j`}
                        </Text>
                        {batch.expiryDate ? (
                          <Text style={[styles.expDateText, isExp && { color: colors.error }, isExpiring && { color: colors.warning }]}>
                            {new Date(batch.expiryDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </Text>
                        ) : null}
                      </View>
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
                  <Text style={styles.batchGroupLot}>Lot: {batch.batchNumber} · {batch.currentQuantity} unités</Text>
                </View>
                <View style={[styles.batchGroupExp, { backgroundColor: group.color + '14' }]}>
                  <Text style={[styles.batchGroupExpText, { color: group.color }]}>
                    {days <= 0 ? 'EXPIRÉ' : `${days}j`}
                  </Text>
                  {batch.expiryDate ? (
                    <Text style={[styles.batchGroupExpDate, { color: group.color }]}>
                      {new Date(batch.expiryDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Text>
                  ) : null}
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
    brandName: product?.brandName || '',
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
    currency: product?.currency || 'CDF',
    requiresPrescription: product?.requiresPrescription ?? false,
    controlledSubstance: product?.controlledSubstance ?? false,
    trackExpiry: true,
    reorderLevel: String(product?.reorderLevel || 10),
    reorderQuantity: String(product?.reorderQuantity || 50),
    minStockLevel: String(product?.minStockLevel || 5),
    maxStockLevel: String(product?.maxStockLevel || 500),
    indication: product?.indication || '',
    storageCondition: product?.storageConditions || 'ROOM_TEMPERATURE',
    expirationDate: product?.expirationDate || '',
    notes: '',
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
      const api = ApiService.getInstance();

      // Backend uses snake_case field names
      const data: any = {
        name: form.name.trim(),
        generic_name: form.genericName.trim() || undefined,
        brand_name: form.brandName.trim() || undefined,
        sku: form.sku.trim(),
        barcode: form.barcode.trim() || undefined,
        category: form.category,
        dosage_form: form.dosageForm,
        strength: form.strength.trim() || undefined,
        unit_of_measure: form.unitOfMeasure,
        pack_size: parseInt(form.packSize) || 1,
        manufacturer: form.manufacturer.trim() || undefined,
        cost_price: parseFloat(form.costPrice) || 0,
        selling_price: parseFloat(form.sellingPrice) || 0,
        currency: form.currency,
        requires_prescription: form.requiresPrescription,
        controlled_substance: form.controlledSubstance,
        track_expiry: form.trackExpiry,
        reorder_level: parseInt(form.reorderLevel) || 10,
        reorder_quantity: parseInt(form.reorderQuantity) || 50,
        min_stock_level: parseInt(form.minStockLevel) || 5,
        max_stock_level: parseInt(form.maxStockLevel) || 500,
        storage_condition: form.storageCondition,
        indication: form.indication.trim() || undefined,
        expiration_date: form.expirationDate.trim() || undefined,
        notes: form.notes.trim() || undefined,
        is_active: true,
      };

      if (product) {
        await api.patch(`/inventory/products/${product.id}/`, data);
        toast.success(`${data.name} mis à jour`);
      } else {
        // Create product — backend assigns organization from auth user
        const createRes = await api.post('/inventory/products/', data);
        const createdId = createRes?.data?.id ?? createRes?.id;
        // Create a matching inventory item with zero stock
        if (createdId) {
          await api.post('/inventory/items/', {
            product: createdId,
            facility_id: 'pharmacy-main',
            quantity_on_hand: 0,
            quantity_reserved: 0,
            quantity_on_order: 0,
          });
        }
        toast.success(`${data.name} ajouté à l'inventaire`);
      }
      onSaved();
    } catch (err: any) {
      console.error('Save product error:', err);
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
              <View style={modalS.row}>
                <Field label="DCI (Nom générique)" value={form.genericName} onChange={v => upd('genericName', v)} flex />
                <Field label="Nom de marque" value={form.brandName} onChange={v => upd('brandName', v)} flex />
              </View>
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
                <Field label="Prix d'achat *" value={form.costPrice} onChange={v => upd('costPrice', v)} keyboardType="decimal-pad" placeholder="0.00" flex />
                <Field label="Prix de vente *" value={form.sellingPrice} onChange={v => upd('sellingPrice', v)} keyboardType="decimal-pad" placeholder="0.00" flex />
                <Select label="Devise" value={form.currency} options={[{label:'CDF',value:'CDF'},{label:'USD',value:'USD'}]} onChange={v => upd('currency', v)} flex />
              </View>
              {computedMargin && <Text style={modalS.marginHint}>Marge: {computedMargin}%</Text>}

              {/* Stock levels */}
              <Text style={modalS.sec}>Niveaux de stock</Text>
              <View style={modalS.row}>
                <Field label="Stock minimum" value={form.minStockLevel} onChange={v => upd('minStockLevel', v)} keyboardType="numeric" flex />
                <Field label="Seuil réappro" value={form.reorderLevel} onChange={v => upd('reorderLevel', v)} keyboardType="numeric" flex />
                <Field label="Stock maximum" value={form.maxStockLevel} onChange={v => upd('maxStockLevel', v)} keyboardType="numeric" flex />
              </View>
              <View style={modalS.row}>
                <Field label="Qté réappro" value={form.reorderQuantity} onChange={v => upd('reorderQuantity', v)} keyboardType="numeric" flex />
                <Select label="Conservation" value={form.storageCondition} options={[
                  {label:'Temp. ambiante',value:'ROOM_TEMPERATURE'},{label:'Réfrigéré',value:'REFRIGERATED'},
                  {label:'Congelé',value:'FROZEN'},{label:'Protéger lumière',value:'PROTECT_FROM_LIGHT'},
                ]} onChange={v => upd('storageCondition', v)} flex />
              </View>
              <Field 
                label="Date d'expiration générale" 
                value={form.expirationDate} 
                onChange={v => upd('expirationDate', v)}
                placeholder="YYYY-MM-DD ou JJ/MM/AAAA"
                isDate
              />
              <View style={modalS.toggleRow}>
                <TouchableOpacity style={[modalS.toggle, form.trackExpiry && modalS.toggleOn]} onPress={() => upd('trackExpiry', !form.trackExpiry)}>
                  <Ionicons name={form.trackExpiry ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={form.trackExpiry ? '#8B5CF6' : colors.textTertiary} />
                  <Text style={modalS.toggleText}>Suivre dates d'expiration</Text>
                </TouchableOpacity>
              </View>

              {/* Extra */}
              <Text style={modalS.sec}>Informations supplémentaires</Text>
              <Field label="Indication thérapeutique" value={form.indication} onChange={v => upd('indication', v)} multiline />
              <Field label="Notes internes" value={form.notes} onChange={v => upd('notes', v)} multiline />
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
  onClose: () => void; onSaved: (productId: string, newQty: number, newStatus: string) => void;
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
    if (willSubtractExcess) {
      toast.warning(`Retrait plafonné à ${currentQty} (stock actuel)`);
    }
    setSaving(true);
    try {
      const api = ApiService.getInstance();

      // Resolve the inventory item: use cached one, or look it up, or create it
      let invId = inv?.id;
      if (!invId) {
        // Try fetching an existing item for this product first
        const fetchRes = await api.get('/inventory/items/', { product: product.id, facility_id: 'pharmacy-main', page_size: 1 });
        const existing = fetchRes?.data?.results?.[0] ?? fetchRes?.data?.[0];
        if (existing?.id) {
          invId = existing.id;
        } else {
          // Truly no item — create one
          const createRes = await api.post('/inventory/items/', {
            product: product.id,
            facility_id: 'pharmacy-main',
            quantity_on_hand: 0,
            quantity_reserved: 0,
            quantity_on_order: 0,
          });
          invId = createRes?.data?.id;
          if (!invId) { toast.error('Impossible de créer l\'inventaire'); setSaving(false); return; }
        }
      }

      // Record the stock movement first (with balance info)
      const movementRes = await api.post('/inventory/movements/', {
        inventory_item: invId,
        movement_type: adjType === 'add' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
        direction: adjType === 'add' ? 'IN' : 'OUT',
        quantity: adjType === 'add' ? qty : Math.min(qty, currentQty),
        unit_cost: product.costPrice,
        reason: adjReason,
        movement_date: new Date().toISOString(),
        balance_before: currentQty,
        balance_after: newQty,
      });
      if (!movementRes.success) {
        throw new Error(movementRes.error?.message || 'Échec de création du mouvement de stock');
      }

      // Update the inventory item quantity
      const updateResponse = await api.patch(`/inventory/items/${invId}/`, {
        quantity_on_hand: newQty,
      });
      
      console.log('📦 Stock update response:', updateResponse);
      
      // Verify the update was successful
      if (!updateResponse.success) {
        throw new Error(updateResponse.error?.message || 'Update failed');
      }

      const verifyRes = await api.get(`/inventory/items/${invId}/`);
      if (!verifyRes.success || !verifyRes.data) {
        throw new Error(verifyRes.error?.message || 'Impossible de vérifier le stock mis à jour');
      }
      const confirmedQty = parseFloat(verifyRes.data.quantity_on_hand ?? String(newQty));
      const confirmedStatus = confirmedQty === 0
        ? 'OUT_OF_STOCK'
        : confirmedQty <= product.minStockLevel
          ? 'LOW_STOCK'
          : confirmedQty >= product.maxStockLevel
            ? 'OVER_STOCK'
            : 'IN_STOCK';

      toast.success(`Stock ajusté: ${product.name} (${currentQty} → ${confirmedQty})`);
      onSaved(product.id, confirmedQty, confirmedStatus);
    } catch (error) {
      console.error('❌ Stock adjustment error:', error);
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
            {/* Selected product header */}
            <Text style={modalS.sec}>Produit</Text>
            <View style={{ backgroundColor: colors.primary + '12', borderRadius: 10, padding: 12, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{product.name}</Text>
              {!!product.genericName && <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{product.genericName}</Text>}
              <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}>SKU: {product.sku}</Text>
            </View>

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

function Field({ label, value, onChange, placeholder, keyboardType, multiline, flex, isDate }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; keyboardType?: string; multiline?: boolean; flex?: boolean; isDate?: boolean;
}) {
  return (
    <View style={[modalS.field, flex && { flex: 1 }]}>
      <Text style={modalS.fieldLbl}>{label}</Text>
      {isDate ? (
        <View style={modalS.fieldInput}>
          <DateInput
            value={value}
            onChangeText={onChange}
            placeholder={placeholder || label}
            placeholderTextColor={colors.placeholder}
            format="iso"
          />
        </View>
      ) : (
        <TextInput
          style={[modalS.fieldInput, multiline && { height: 72, textAlignVertical: 'top' }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder || label}
          placeholderTextColor={colors.placeholder}
          keyboardType={keyboardType as any}
          multiline={multiline}
        />
      )}
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
  headerBtns: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  btnFill: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: borderRadius.lg, gap: 6, ...shadows.sm },
  btnFillText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  btnOutline: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary + '0A', borderWidth: 1, borderColor: colors.primary + '30', paddingHorizontal: 14, paddingVertical: 9, borderRadius: borderRadius.lg, gap: 6 },
  btnOutlineText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  btnOutlineSuccess: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B98108', borderWidth: 1, borderColor: '#10B98130', paddingHorizontal: 14, paddingVertical: 9, borderRadius: borderRadius.lg, gap: 6 },
  btnOutlineImport: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.info + '08', borderWidth: 1, borderColor: colors.info + '30', paddingHorizontal: 14, paddingVertical: 9, borderRadius: borderRadius.lg, gap: 6 },

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
  expBadge: { flexDirection: 'row', alignItems: 'flex-start', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, minWidth: 50, justifyContent: 'center' },
  expText: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  expDateText: { fontSize: 10, color: colors.textTertiary, marginTop: 1 },
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
  batchGroupExpDate: { fontSize: 10, fontWeight: '500', marginTop: 1 },

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
