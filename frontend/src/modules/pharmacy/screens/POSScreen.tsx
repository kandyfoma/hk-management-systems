import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '../../../components/GlobalUI';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import DatabaseService from '../../../services/DatabaseService';
import ApiService from '../../../services/ApiService';
import SyncService from '../../../services/SyncService';
import {
  Product,
  InventoryItem,
} from '../../../models/Inventory';
import {
  CartItem,
  CartState,
  CartTotals,
  SalePayment,
  PaymentMethod,
  Sale,
  SaleUtils,
} from '../../../models/Sale';

const { width: SCREEN_W } = Dimensions.get('window');
const isDesktop = SCREEN_W >= 1024;
const isPhone = SCREEN_W < 640;
const isSmallPhone = SCREEN_W < 390;
const CART_WIDTH = isDesktop ? 380 : SCREEN_W;
const POS_DRAFT_KEY = 'pharmacy_pos_draft_v1';
const AUTH_SESSION_KEY = 'auth_session';

// ═══════════════════════════════════════════════════════════════
//  ENRICHED PRODUCT (product + live stock data)
// ═══════════════════════════════════════════════════════════════

interface ShopProduct extends Product {
  inventoryItem?: InventoryItem;
  availableQty: number;
}

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════

const fmt = (n: number, c = 'CDF') => SaleUtils.formatCurrency(n, c);

function getCatLabel(cat: string): string {
  const m: Record<string, string> = {
    MEDICATION: 'Médicament', OTC: 'Sans ordonnance', SUPPLEMENT: 'Complément',
    CONSUMABLE: 'Consommable', MEDICAL_DEVICE: 'Dispositif',
  };
  return m[cat] || cat;
}

// ═══════════════════════════════════════════════════════════════
//  MAIN POS SCREEN
// ═══════════════════════════════════════════════════════════════

export function POSScreen() {
  const toast = useToast();
  const toastRef = useRef(toast);
  const PRODUCTS_PER_PAGE = isDesktop ? 24 : isPhone ? 8 : 12;

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  // ─── State ──────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [catalogPage, setCatalogPage] = useState(1);
  const [cart, setCart] = useState<CartState>(SaleUtils.createEmptyCart());
  const [cartTotals, setCartTotals] = useState<CartTotals>({ itemCount: 0, totalQuantity: 0, subtotal: 0, lineDiscounts: 0, globalDiscount: 0, totalDiscount: 0, taxTotal: 0, grandTotal: 0 });

  // Modals
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [showMobileCart, setShowMobileCart] = useState(false);

  // Org context
  const [orgId, setOrgId] = useState('');
  const facilityId = 'pharmacy-main';
  const [pendingSalesCount, setPendingSalesCount] = useState(0);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [cashierId, setCashierId] = useState('');
  const [cashierName, setCashierName] = useState('Admin');
  const syncServiceRef = useRef(SyncService.getInstance());
  const syncLockRef = useRef(false);

  const isCartDraftEmpty = useCallback((value: CartState) => (
    value.items.length === 0
    && !value.customerId
    && !value.customerName
    && !value.customerPhone
    && !value.prescriptionId
    && value.globalDiscountType === 'NONE'
    && value.globalDiscountValue === 0
  ), []);

  const adjustLocalStockForSale = useCallback((soldItems: CartItem[]) => {
    const soldByProduct = new Map<string, number>();
    soldItems.forEach((item) => {
      soldByProduct.set(item.productId, (soldByProduct.get(item.productId) ?? 0) + item.quantity);
    });

    setProducts((prev) => prev.map((product) => {
      const soldQty = soldByProduct.get(product.id) ?? 0;
      if (!soldQty) return product;
      return {
        ...product,
        availableQty: Math.max(0, product.availableQty - soldQty),
      };
    }));
  }, []);

  const refreshSyncStatus = useCallback(() => {
    const status = syncServiceRef.current.getSyncStatus();
    setPendingSalesCount(status.pendingItems);
    setSyncInProgress(status.syncInProgress);
  }, []);

  const hydrateSessionContext = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(AUTH_SESSION_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      const sessionOrgId: string = parsed?.organization?.id ?? '';
      const sessionUser: any = parsed?.user ?? null;

      if (sessionOrgId) {
        setOrgId((prev) => prev || sessionOrgId);
      }

      const derivedCashierName =
        sessionUser?.fullName
        || [sessionUser?.firstName, sessionUser?.lastName].filter(Boolean).join(' ').trim()
        || sessionUser?.phone
        || 'Admin';

      setCashierId(sessionUser?.id ?? '');
      setCashierName(derivedCashierName);
    } catch {
      // Ignore malformed session
    }
  }, []);

  const queueLocalSaleForSync = useCallback(async (localSaleId: string, payload: any) => {
    await syncServiceRef.current.queueForSync('sales', 'CREATE', payload, localSaleId);
    refreshSyncStatus();
  }, [refreshSyncStatus]);

  const syncPendingSales = useCallback(async (silent = false) => {
    try {
      if (syncLockRef.current) return;

      syncLockRef.current = true;
      setSyncInProgress(true);
      const api = ApiService.getInstance();
      const isOnline = await api.checkConnection();
      if (!isOnline) {
        refreshSyncStatus();
        if (!silent) toastRef.current.info('Hors ligne: synchronisation différée');
        return;
      }

      const beforePending = syncServiceRef.current.getSyncStatus().pendingItems;
      await syncServiceRef.current.forceSync();
      const afterPending = syncServiceRef.current.getSyncStatus().pendingItems;
      refreshSyncStatus();

      if (!silent) {
        const synced = Math.max(0, beforePending - afterPending);
        if (synced > 0) {
          toastRef.current.success(`${synced} vente(s) synchronisée(s)`);
        } else if (afterPending > 0) {
          toastRef.current.warning('Certaines ventes restent en attente de synchronisation');
        }
      }
    } catch {
      if (!silent) toastRef.current.warning('Synchronisation reportée');
    } finally {
      syncLockRef.current = false;
      refreshSyncStatus();
    }
  }, [refreshSyncStatus]);

  const saveDraft = useCallback(async (value: CartState, silent = true) => {
    if (isCartDraftEmpty(value)) {
      await AsyncStorage.removeItem(POS_DRAFT_KEY);
      if (!silent) toastRef.current.info('Brouillon supprimé');
      return;
    }

    await AsyncStorage.setItem(POS_DRAFT_KEY, JSON.stringify({ cart: value, savedAt: new Date().toISOString() }));
    if (!silent) toastRef.current.success('Brouillon sauvegardé');
  }, [isCartDraftEmpty]);

  // ─── Load Products ─────────────────────────────────────
  const loadProducts = useCallback(async () => {
    try {
      const api = ApiService.getInstance();

      const fetchAllResults = async (endpoint: string, params: Record<string, any> = {}, maxPages = 8) => {
        const allRows: any[] = [];
        for (let page = 1; page <= maxPages; page += 1) {
          const res = await api.get(endpoint, { ...params, page });
          const payload = res?.data;
          const rows: any[] = Array.isArray(payload) ? payload : (payload?.results ?? []);
          allRows.push(...rows);

          if (Array.isArray(payload) || !payload?.next) break;
        }
        return allRows;
      };

      const [productsRes, itemsRes] = await Promise.all([
        fetchAllResults('/inventory/products/', { is_active: true, page_size: 200 }),
        fetchAllResults('/inventory/items/', { facility_id: facilityId, page_size: 300 }),
      ]);

      const rawProducts: any[] = productsRes ?? [];
      const rawItems: any[] = itemsRes ?? [];
      const resolvedOrgId = orgId || rawProducts[0]?.organization || rawItems[0]?.organization || '';
      if (resolvedOrgId) {
        setOrgId((prev) => prev || resolvedOrgId);
      }

      // Build inventory map: productId → inventory item
      const invMap = new Map<string, InventoryItem>();
      rawItems.forEach((i: any) => {
        const inv: InventoryItem = {
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
        };
        invMap.set(i.product, inv);
      });

      const enriched: ShopProduct[] = rawProducts.map((p: any) => {
        const inv = invMap.get(p.id);
        const product: Product = {
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
          currency: p.currency ?? 'CDF',
          taxRate: 0,
          reorderLevel: p.reorder_level ?? 10,
          minStockLevel: p.min_stock_level ?? 5,
          maxStockLevel: p.max_stock_level ?? 500,
          reorderQuantity: p.reorder_quantity ?? 50,
          storageConditions: p.storage_condition ?? '',
          activeIngredients: [],
          insuranceReimbursable: false,
          safetyStockDays: 7,
          isActive: p.is_active ?? true,
          isDiscontinued: p.is_discontinued ?? false,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        };
        return { ...product, inventoryItem: inv, availableQty: inv?.quantityAvailable ?? 0 };
      });

      setProducts(enriched);
    } catch (err) {
      console.error('POS load error', err);
      try {
        const db = DatabaseService.getInstance();
        const fallbackOrgId = orgId;
        if (!fallbackOrgId) {
          throw err;
        }

        const [localInventory, localProductMap] = await Promise.all([
          db.getInventoryItemsByOrganization(fallbackOrgId),
          db.getProductsMap(fallbackOrgId),
        ]);

        const invByProductId = new Map<string, InventoryItem>();
        localInventory.forEach((inv) => {
          invByProductId.set(inv.productId, inv);
        });

        const fallbackProducts: ShopProduct[] = Array.from(localProductMap.values()).map((product) => {
          const inv = invByProductId.get(product.id);
          return {
            ...product,
            inventoryItem: inv,
            availableQty: Math.max(0, inv?.quantityAvailable ?? inv?.quantityOnHand ?? 0),
          };
        });

        setProducts(fallbackProducts);
        toastRef.current.warning('Mode hors ligne: catalogue local chargé');
      } catch {
        toastRef.current.error('Erreur lors du chargement des produits');
      }
    } finally {
      setLoading(false);
    }
  }, [facilityId, orgId]);

  useEffect(() => {
    (async () => {
      await hydrateSessionContext();
      await loadProducts();
      refreshSyncStatus();
    })();
  }, [hydrateSessionContext, loadProducts, refreshSyncStatus]);

  useEffect(() => {
    (async () => {
      try {
        const draftRaw = await AsyncStorage.getItem(POS_DRAFT_KEY);
        if (draftRaw) {
          const parsed = JSON.parse(draftRaw);
          if (parsed?.cart?.items && Array.isArray(parsed.cart.items)) {
            setCart(parsed.cart as CartState);
            toastRef.current.info('Brouillon POS restauré');
          }
        }
      } catch {
        // Ignore malformed draft storage
      } finally {
        setDraftHydrated(true);
      }

      await hydrateSessionContext();
      refreshSyncStatus();
      await syncPendingSales(true);
    })();
  }, [hydrateSessionContext, refreshSyncStatus, syncPendingSales]);

  useEffect(() => {
    if (!draftHydrated) return;
    const timer = setTimeout(() => {
      saveDraft(cart, true).catch(() => undefined);
    }, 250);

    return () => clearTimeout(timer);
  }, [cart, draftHydrated, saveDraft]);

  useEffect(() => {
    const interval = setInterval(() => {
      syncPendingSales(true).catch(() => undefined);
    }, 30000);
    return () => clearInterval(interval);
  }, [syncPendingSales]);

  useEffect(() => {
    const statusPoll = setInterval(() => {
      refreshSyncStatus();
    }, 2500);
    return () => clearInterval(statusPoll);
  }, [refreshSyncStatus]);

  // ─── Recompute cart totals ─────────────────────────────
  useEffect(() => {
    setCartTotals(SaleUtils.computeCartTotals(cart));
  }, [cart]);

  // ─── Filter products ──────────────────────────────────
  const filteredProducts = useMemo(() => {
    let r = products;
    if (selectedCategory !== 'ALL') r = r.filter((p) => p.category === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      r = r.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.genericName?.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q),
      );
    }
    return r;
  }, [products, selectedCategory, searchQuery]);

  useEffect(() => {
    setCatalogPage(1);
  }, [searchQuery, selectedCategory]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE)), [filteredProducts.length, PRODUCTS_PER_PAGE]);

  useEffect(() => {
    if (catalogPage > totalPages) {
      setCatalogPage(totalPages);
    }
  }, [catalogPage, totalPages]);

  const paginatedProducts = useMemo(() => {
    const start = (catalogPage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(start, start + PRODUCTS_PER_PAGE);
  }, [catalogPage, filteredProducts, PRODUCTS_PER_PAGE]);

  const cartQtyByProduct = useMemo(() => {
    const qtyMap = new Map<string, number>();
    cart.items.forEach((item) => qtyMap.set(item.productId, item.quantity));
    return qtyMap;
  }, [cart.items]);

  // ─── Categories from live data ─────────────────────────
  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return ['ALL', ...Array.from(cats)];
  }, [products]);

  // ═══════════════════════════════════════════════════════
  //  CART ACTIONS
  // ═══════════════════════════════════════════════════════

  const addToCart = useCallback((product: ShopProduct) => {
    if (product.availableQty <= 0) {
      toast.warning(`${product.name} est en rupture de stock`);
      return;
    }

    // Check max stock BEFORE entering the state updater (toast inside setCart is a React anti-pattern)
    setCart((prev) => {
      const existing = prev.items.find((i) => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.availableQty) {
          // Return prev unchanged — we'll show toast after setCart
          return prev;
        }
        const updated = SaleUtils.computeLineItem({ ...existing, quantity: existing.quantity + 1 });
        return { ...prev, items: prev.items.map((i) => i.productId === product.id ? updated : i) };
      }

      const newItem = SaleUtils.computeLineItem({
        productId: product.id,
        product: {
          name: product.name,
          sku: product.sku,
          genericName: product.genericName,
          strength: product.strength,
          dosageForm: product.dosageForm,
          category: product.category,
          requiresPrescription: product.requiresPrescription,
          sellingPrice: product.sellingPrice,
          costPrice: product.costPrice,
          taxRate: product.taxRate,
          currency: product.currency,
          barcode: product.barcode,
          imageUrl: product.imageUrl,
        },
        quantity: 1,
        unitPrice: product.sellingPrice,
        discountPercent: 0,
        discountAmount: 0,
        taxAmount: 0,
        lineTotal: 0,
        inventoryItemId: product.inventoryItem?.id,
        maxQuantity: product.availableQty,
      });

      return { ...prev, items: [...prev.items, newItem] };
    });

    // Show max-stock warning outside setCart (check current cart state)
    setCart((prev) => {
      const existing = prev.items.find((i) => i.productId === product.id);
      if (existing && existing.quantity >= product.availableQty) {
        // Use setTimeout to avoid calling toast inside a React state updater
        setTimeout(() => toast.warning(`Stock max atteint pour ${product.name}`), 0);
      }
      return prev; // No mutation — just side-effect check
    });
  }, [toast]);

  const updateCartItemQty = useCallback((productId: string, delta: number) => {
    setCart((prev) => {
      const items = prev.items.map((item) => {
        if (item.productId !== productId) return item;
        const newQty = Math.max(0, Math.min(item.maxQuantity, item.quantity + delta));
        if (newQty === 0) return null;
        return SaleUtils.computeLineItem({ ...item, quantity: newQty });
      }).filter(Boolean) as CartItem[];
      return { ...prev, items };
    });
  }, []);

  const removeCartItem = useCallback((productId: string) => {
    setCart((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.productId !== productId),
    }));
  }, []);

  const clearCart = useCallback(() => {
    setCart(SaleUtils.createEmptyCart());
  }, []);

  const applyGlobalDiscount = useCallback((type: 'PERCENTAGE' | 'FIXED' | 'NONE', value: number) => {
    setCart((prev) => ({ ...prev, globalDiscountType: type, globalDiscountValue: value }));
  }, []);

  // ═══════════════════════════════════════════════════════
  //  CHECKOUT
  // ═══════════════════════════════════════════════════════

  const [checkoutInProgress, setCheckoutInProgress] = useState(false);

  const buildSalePayload = useCallback((sourceCart: CartState, payments: SalePayment[]) => {
    const items = sourceCart.items.map((item) => ({
      product: item.productId,
      product_name: item.product.name,
      product_sku: item.product.sku ?? '',
      unit_of_measure: item.product.dosageForm ?? 'UNIT',
      quantity: item.quantity,
      unit_price: item.unitPrice,
      unit_cost: item.product.costPrice ?? 0,
      discount_type: item.discountPercent > 0 ? 'PERCENTAGE' : item.discountAmount > 0 ? 'FIXED' : 'NONE',
      discount_value: item.discountPercent > 0 ? item.discountPercent : item.discountAmount ?? 0,
      discount_amount: item.discountAmount ?? 0,
    }));

    const backendPayments = payments.map((payment) => ({
      payment_method: payment.method,
      amount: payment.amount,
      currency: payment.currency ?? 'CDF',
      reference_number: payment.reference ?? '',
    }));

    const payload: any = {
      type: sourceCart.prescriptionId ? 'PRESCRIPTION' : 'COUNTER',
      notes: (sourceCart as any).notes ?? '',
      items,
      payments: backendPayments,
    };

    if (sourceCart.customerId) payload.customer = sourceCart.customerId;
    if (sourceCart.customerName) payload.customer_name = sourceCart.customerName;
    if (sourceCart.customerPhone) payload.customer_phone = sourceCart.customerPhone;
    if (sourceCart.prescriptionId) payload.prescription = sourceCart.prescriptionId;

    return payload;
  }, []);

  const handleCheckout = useCallback(async (payments: SalePayment[]) => {
    if (cart.items.length === 0) return;
    if (checkoutInProgress) return;
    if (cartTotals.grandTotal <= 0) {
      toast.warning('Le total doit être supérieur à zéro');
      return;
    }
    setCheckoutInProgress(true);
    try {
      const db = DatabaseService.getInstance();
      const api = ApiService.getInstance();
      const checkoutCart: CartState = {
        ...cart,
        items: cart.items.map((item) => ({ ...item })),
      };
      const checkoutPayments = payments.map((payment) => ({ ...payment }));
      const soldItems = [...checkoutCart.items];

      const stockConflict = soldItems.find((item) => {
        const product = products.find((p) => p.id === item.productId);
        return !!product && item.quantity > product.availableQty;
      });
      if (stockConflict) {
        throw new Error(`Stock insuffisant pour ${stockConflict.product.name}`);
      }

      const effectiveOrgId = orgId || '';
      const localSale = await db.processSale(
        checkoutCart,
        checkoutPayments,
        cashierId,
        cashierName,
        effectiveOrgId,
        facilityId,
      );

      const payload = buildSalePayload(checkoutCart, checkoutPayments);
      let queuedForSync = false;
      try {
        await queueLocalSaleForSync(localSale.id, payload);
        queuedForSync = true;
      } catch {
        queuedForSync = false;
      }

      setLastSale(localSale);
      setShowPayment(false);
      setShowReceipt(true);
      clearCart();
      adjustLocalStockForSale(soldItems);
      await AsyncStorage.removeItem(POS_DRAFT_KEY);

      if (!queuedForSync) {
        toast.warning(`Vente ${localSale.saleNumber} enregistrée localement (sync en attente manuelle)`);
        return;
      }

      const isOnline = await api.checkConnection();
      if (!isOnline) {
        toast.info(`Vente ${localSale.saleNumber} enregistrée hors ligne et en attente de sync`);
        return;
      }

      await syncPendingSales(true);
      const pending = syncServiceRef.current.getSyncStatus().pendingItems;
      if (pending > 0) {
        toast.warning(`Vente ${localSale.saleNumber} enregistrée localement; synchronisation en arrière-plan`);
      } else {
        toast.success(`Vente ${localSale.saleNumber} enregistrée et synchronisée`);
      }
    } catch (err) {
      console.error('Checkout error', err);
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement de la vente');
    } finally {
      setCheckoutInProgress(false);
    }
  }, [
    cart,
    cartTotals,
    products,
    orgId,
    facilityId,
    cashierId,
    cashierName,
    clearCart,
    toast,
    checkoutInProgress,
    buildSalePayload,
    queueLocalSaleForSync,
    syncPendingSales,
    adjustLocalStockForSale,
  ]);

  // ═══════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.loadingText}>Chargement du Point de Vente…</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* ════════════ LEFT: Product Catalogue ════════════ */}
      <View style={s.catalogSide}>
        {/* Header bar */}
        <View style={s.topBar}>
          <View style={s.topBarLeft}>
            <Ionicons name="cart" size={22} color={colors.primary} />
            <Text style={s.topBarTitle}>Point de Vente</Text>
          </View>
          <View style={s.topBarRight}>
            <TouchableOpacity
              style={s.historyBtn}
              onPress={() => saveDraft(cart, false)}
              activeOpacity={0.7}
            >
              <Ionicons name="save-outline" size={18} color={colors.primary} />
              {!isSmallPhone && <Text style={s.historyBtnText}>Brouillon</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={s.historyBtn}
              onPress={() => syncPendingSales(false)}
              activeOpacity={0.7}
              disabled={syncInProgress}
            >
              <Ionicons name={syncInProgress ? 'sync' : 'cloud-upload-outline'} size={18} color={colors.primary} />
              {!isSmallPhone && <Text style={s.historyBtnText}>{pendingSalesCount > 0 ? `Sync (${pendingSalesCount})` : 'Sync'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.historyBtn} onPress={() => setShowHistory(true)} activeOpacity={0.7}>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
              {!isSmallPhone && <Text style={s.historyBtnText}>Historique</Text>}
            </TouchableOpacity>
            {!isDesktop && cart.items.length > 0 && (
              <TouchableOpacity style={s.mobileCartBtn} onPress={() => setShowMobileCart(true)} activeOpacity={0.7}>
                <Ionicons name="cart" size={20} color="#FFF" />
                <View style={s.mobileCartBadge}>
                  <Text style={s.mobileCartBadgeText}>{cartTotals.itemCount}</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search */}
        <View style={s.searchRow}>
          <View style={s.searchBox}>
            <Ionicons name="search" size={18} color={colors.textTertiary} />
            <TextInput
              style={s.searchInput}
              placeholder="Rechercher produit, SKU, code-barres…"
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

        {/* Category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll} contentContainerStyle={s.catRow}>
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <TouchableOpacity key={cat} style={[s.catChip, active && s.catChipActive]} onPress={() => setSelectedCategory(cat)} activeOpacity={0.7}>
                <Text style={[s.catChipText, active && s.catChipTextActive]}>
                  {cat === 'ALL' ? 'Tous' : getCatLabel(cat)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Product grid */}
        <ScrollView style={s.productScroll} contentContainerStyle={s.productGrid}>
          {filteredProducts.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="search-outline" size={40} color={colors.textTertiary} />
              <Text style={s.emptyTitle}>Aucun produit trouvé</Text>
            </View>
          ) : (
            paginatedProducts.map((product) => (
              <ProductTile
                key={product.id}
                product={product}
                inCart={cartQtyByProduct.has(product.id)}
                cartQty={cartQtyByProduct.get(product.id) ?? 0}
                onAdd={() => addToCart(product)}
              />
            ))
          )}
        </ScrollView>

        {filteredProducts.length > 0 && (
          <View style={[s.paginationWrap, isPhone && s.paginationWrapMobile]}>
            <Text style={s.paginationInfo}>
              {(catalogPage - 1) * PRODUCTS_PER_PAGE + 1}–{Math.min(catalogPage * PRODUCTS_PER_PAGE, filteredProducts.length)} sur {filteredProducts.length}
            </Text>
            <View style={s.paginationCtrls}>
              <TouchableOpacity
                style={[s.pageBtn, catalogPage <= 1 && s.pageBtnDisabled]}
                onPress={() => setCatalogPage((p) => Math.max(1, p - 1))}
                disabled={catalogPage <= 1}
              >
                <Ionicons name="chevron-back" size={16} color={catalogPage <= 1 ? colors.textTertiary : colors.primary} />
              </TouchableOpacity>
              <Text style={s.pageLabel}>Page {catalogPage}/{totalPages}</Text>
              <TouchableOpacity
                style={[s.pageBtn, catalogPage >= totalPages && s.pageBtnDisabled]}
                onPress={() => setCatalogPage((p) => Math.min(totalPages, p + 1))}
                disabled={catalogPage >= totalPages}
              >
                <Ionicons name="chevron-forward" size={16} color={catalogPage >= totalPages ? colors.textTertiary : colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* ════════════ RIGHT: Cart Panel (desktop) ════════════ */}
      {isDesktop && (
        <CartPanel
          cart={cart}
          totals={cartTotals}
          onUpdateQty={updateCartItemQty}
          onRemove={removeCartItem}
          onClear={clearCart}
          onDiscount={applyGlobalDiscount}
          onCheckout={() => setShowPayment(true)}
        />
      )}

      {/* ════════════ MOBILE: Cart Overlay ═══════════════════ */}
      {!isDesktop && showMobileCart && (
        <Modal visible animationType="slide" transparent onRequestClose={() => setShowMobileCart(false)}>
          <View style={s.mobileCartOverlay}>
            <View style={s.mobileCartHeader}>
              <Text style={s.mobileCartTitle}>Panier</Text>
              <TouchableOpacity onPress={() => setShowMobileCart(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <CartPanel
              cart={cart}
              totals={cartTotals}
              onUpdateQty={updateCartItemQty}
              onRemove={removeCartItem}
              onClear={clearCart}
              onDiscount={applyGlobalDiscount}
              onCheckout={() => { setShowMobileCart(false); setShowPayment(true); }}
              isMobile
            />
          </View>
        </Modal>
      )}

      {/* ════════════ PAYMENT MODAL ════════════════════════ */}
      <PaymentModal
        visible={showPayment}
        totals={cartTotals}
        currency={cart.items[0]?.product.currency || 'CDF'}
        isProcessing={checkoutInProgress}
        onClose={() => setShowPayment(false)}
        onConfirm={handleCheckout}
      />

      {/* ════════════ RECEIPT MODAL ════════════════════════ */}
      <ReceiptModal
        visible={showReceipt}
        sale={lastSale}
        onClose={() => { setShowReceipt(false); setLastSale(null); }}
      />

      {/* ════════════ HISTORY MODAL ════════════════════════ */}
      <SalesHistoryModal
        visible={showHistory}
        orgId={orgId}
        onClose={() => setShowHistory(false)}
        onViewReceipt={(sale) => { setLastSale(sale); setShowHistory(false); setShowReceipt(true); }}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
//  PRODUCT TILE
// ═══════════════════════════════════════════════════════════════

const ProductTile = React.memo(function ProductTile({ product, inCart, cartQty, onAdd }: { product: ShopProduct; inCart: boolean; cartQty: number; onAdd: () => void }) {
  const outOfStock = product.availableQty <= 0;
  const lowStock = product.availableQty > 0 && product.availableQty <= (product.minStockLevel || 10);

  return (
    <TouchableOpacity
      style={[s.tile, outOfStock && s.tileDisabled, inCart && s.tileInCart]}
      onPress={onAdd}
      activeOpacity={outOfStock ? 1 : 0.7}
      disabled={outOfStock}
    >
      {/* Name */}
      <Text style={s.tileName} numberOfLines={2}>{product.name}</Text>
      <Text style={s.tileSub} numberOfLines={1}>
        {product.strength ? `${product.strength} · ` : ''}{product.sku}
      </Text>

      {/* Price + Stock */}
      <View style={s.tilePriceRow}>
        <Text style={s.tilePrice}>{fmt(product.sellingPrice, product.currency)}</Text>
        {product.requiresPrescription && (
          <View style={s.rxBadge}><Text style={s.rxText}>Rx</Text></View>
        )}
      </View>

      <View style={s.tileStockRow}>
        {outOfStock ? (
          <Text style={[s.tileStock, { color: colors.error }]}>Rupture</Text>
        ) : lowStock ? (
          <Text style={[s.tileStock, { color: colors.warning }]}>⚠ {product.availableQty} restants</Text>
        ) : (
          <Text style={s.tileStock}>{product.availableQty} en stock</Text>
        )}
      </View>

      {/* In-cart badge */}
      {inCart && (
        <View style={s.cartBadge}>
          <Text style={s.cartBadgeText}>{cartQty}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

// ═══════════════════════════════════════════════════════════════
//  CART PANEL
// ═══════════════════════════════════════════════════════════════

function CartPanel({
  cart, totals, onUpdateQty, onRemove, onClear, onDiscount, onCheckout, isMobile,
}: {
  cart: CartState;
  totals: CartTotals;
  onUpdateQty: (pid: string, delta: number) => void;
  onRemove: (pid: string) => void;
  onClear: () => void;
  onDiscount: (type: 'PERCENTAGE' | 'FIXED' | 'NONE', value: number) => void;
  onCheckout: () => void;
  isMobile?: boolean;
}) {
  const [discountInput, setDiscountInput] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');

  const applyDiscount = () => {
    const val = parseFloat(discountInput);
    if (isNaN(val) || val <= 0) {
      onDiscount('NONE', 0);
      setDiscountInput('');
      return;
    }
    // Edge case: percentage cannot exceed 100%
    if (discountType === 'PERCENTAGE' && val > 100) {
      setDiscountInput('100');
      onDiscount('PERCENTAGE', 100);
      return;
    }
    // Edge case: fixed discount cannot exceed subtotal
    if (discountType === 'FIXED' && val > totals.subtotal) {
      const clamped = Math.max(0, totals.subtotal);
      setDiscountInput(clamped.toFixed(2));
      onDiscount('FIXED', clamped);
      return;
    }
    onDiscount(discountType, val);
  };

  return (
    <View style={[s.cartPanel, isMobile && s.cartPanelMobile]}>
      {/* Cart header */}
      {!isMobile && (
        <View style={s.cartHeader}>
          <Ionicons name="receipt" size={20} color={colors.primary} />
          <Text style={s.cartTitle}>Panier</Text>
          <View style={s.cartHeaderBadge}>
            <Text style={s.cartHeaderBadgeText}>{totals.itemCount}</Text>
          </View>
          <View style={{ flex: 1 }} />
          {cart.items.length > 0 && (
            <TouchableOpacity onPress={onClear} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Items */}
      {cart.items.length === 0 ? (
        <View style={s.cartEmpty}>
          <Ionicons name="cart-outline" size={48} color={colors.textTertiary} />
          <Text style={s.cartEmptyText}>Panier vide</Text>
          <Text style={s.cartEmptyHint}>Sélectionnez des produits</Text>
        </View>
      ) : (
        <ScrollView style={s.cartItems} contentContainerStyle={{ paddingBottom: 8 }}>
          {cart.items.map((item) => (
            <View key={item.productId} style={s.cartItem}>
              <View style={s.cartItemInfo}>
                <Text style={s.cartItemName} numberOfLines={1}>{item.product.name}</Text>
                <Text style={s.cartItemSub}>{fmt(item.unitPrice, item.product.currency)} / unité</Text>
              </View>
              <View style={s.cartItemQtyRow}>
                <TouchableOpacity style={s.qtyBtn} onPress={() => onUpdateQty(item.productId, -1)} activeOpacity={0.7}>
                  <Ionicons name="remove" size={16} color={colors.primary} />
                </TouchableOpacity>
                <Text style={s.qtyText}>{item.quantity}</Text>
                <TouchableOpacity style={s.qtyBtn} onPress={() => onUpdateQty(item.productId, 1)} activeOpacity={0.7}>
                  <Ionicons name="add" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={s.cartItemTotal}>{fmt(item.lineTotal, item.product.currency)}</Text>
              <TouchableOpacity onPress={() => onRemove(item.productId)} style={s.cartItemRemove} activeOpacity={0.7}>
                <Ionicons name="close" size={14} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Discount row */}
      {cart.items.length > 0 && (
        <View style={s.discountSection}>
          <View style={s.discountRow}>
            <TouchableOpacity
              style={[s.discountTypeBtn, discountType === 'PERCENTAGE' && s.discountTypeBtnActive]}
              onPress={() => setDiscountType('PERCENTAGE')}
            >
              <Text style={[s.discountTypeText, discountType === 'PERCENTAGE' && s.discountTypeTextActive]}>%</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.discountTypeBtn, discountType === 'FIXED' && s.discountTypeBtnActive]}
              onPress={() => setDiscountType('FIXED')}
            >
              <Text style={[s.discountTypeText, discountType === 'FIXED' && s.discountTypeTextActive]}>$</Text>
            </TouchableOpacity>
            <TextInput
              style={s.discountInput}
              placeholder="Remise"
              placeholderTextColor={colors.placeholder}
              keyboardType="numeric"
              value={discountInput}
              onChangeText={setDiscountInput}
              onBlur={applyDiscount}
              onSubmitEditing={applyDiscount}
            />
            {cart.globalDiscountType !== 'NONE' && (
              <TouchableOpacity onPress={() => { onDiscount('NONE', 0); setDiscountInput(''); }}>
                <Ionicons name="close-circle" size={18} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Totals */}
      {cart.items.length > 0 && (
        <View style={s.totalsSection}>
          <TotalRow label="Sous-total" value={fmt(totals.subtotal)} />
          {totals.totalDiscount > 0 && <TotalRow label="Remise" value={`-${fmt(totals.totalDiscount)}`} color={colors.success} />}
          {totals.taxTotal > 0 && <TotalRow label="Taxe" value={fmt(totals.taxTotal)} />}
          <View style={s.totalsDivider} />
          <View style={s.grandTotalRow}>
            <Text style={s.grandTotalLabel}>TOTAL</Text>
            <Text style={s.grandTotalValue}>{fmt(totals.grandTotal)}</Text>
          </View>
        </View>
      )}

      {/* Checkout button */}
      {cart.items.length > 0 && (
        <TouchableOpacity style={s.checkoutBtn} onPress={onCheckout} activeOpacity={0.8}>
          <Ionicons name="card" size={20} color="#FFF" />
          <Text style={s.checkoutBtnText}>Encaisser {fmt(totals.grandTotal)}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function TotalRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.totalRow}>
      <Text style={s.totalLabel}>{label}</Text>
      <Text style={[s.totalValue, color ? { color } : undefined]}>{value}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
//  PAYMENT MODAL
// ═══════════════════════════════════════════════════════════════

function PaymentModal({
  visible, totals, currency, isProcessing, onClose, onConfirm,
}: {
  visible: boolean;
  totals: CartTotals;
  currency: string;
  isProcessing: boolean;
  onClose: () => void;
  onConfirm: (payments: SalePayment[]) => Promise<void> | void;
}) {
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [amountInput, setAmountInput] = useState('');
  const [reference, setReference] = useState('');

  useEffect(() => {
    if (visible) {
      setAmountInput(totals.grandTotal.toFixed(2));
      setMethod('CASH');
      setReference('');
    }
  }, [visible, totals.grandTotal]);

  const amount = parseFloat(amountInput) || 0;
  const change = Math.max(0, amount - totals.grandTotal);

  const methods: { key: PaymentMethod; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'CASH', label: 'Espèces', icon: 'cash' },
    { key: 'MOBILE_MONEY', label: 'Mobile Money', icon: 'phone-portrait' },
    { key: 'CARD', label: 'Carte', icon: 'card' },
    { key: 'INSURANCE', label: 'Assurance', icon: 'shield-checkmark' },
    { key: 'CREDIT', label: 'Crédit', icon: 'time' },
  ];

  const quickAmounts = totals.grandTotal > 0
    ? [
        totals.grandTotal,
        Math.ceil(totals.grandTotal),
        Math.ceil(totals.grandTotal / 5) * 5,
        Math.ceil(totals.grandTotal / 10) * 10,
        Math.ceil(totals.grandTotal / 50) * 50,
      ].filter((v, i, arr) => arr.indexOf(v) === i && v >= totals.grandTotal).slice(0, 4)
    : [];

  const handleConfirm = async () => {
    if (isProcessing) return;
    if (totals.grandTotal <= 0) return; // Zero-total guard
    if (amount < totals.grandTotal && method !== 'CREDIT') return;
    const payment: SalePayment = {
      id: Date.now().toString(36),
      saleId: '',
      method,
      amount: Math.min(amount, totals.grandTotal + change),
      reference: reference || undefined,
      receivedAt: new Date().toISOString(),
    };
    await onConfirm([payment]);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <View style={s.paymentModal}>
          {/* Header */}
          <View style={s.pmHeader}>
            <Text style={s.pmTitle}>Paiement</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.pmBody}>
            {/* Amount */}
            <Text style={s.pmTotal}>{fmt(totals.grandTotal, currency)}</Text>
            <Text style={s.pmTotalLabel}>Total à encaisser</Text>

            {/* Payment methods */}
            <Text style={s.pmSectionTitle}>Mode de paiement</Text>
            <View style={s.pmMethods}>
              {methods.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[s.pmMethod, method === m.key && s.pmMethodActive]}
                  onPress={() => setMethod(m.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={m.icon} size={22} color={method === m.key ? '#FFF' : colors.primary} />
                  <Text style={[s.pmMethodLabel, method === m.key && s.pmMethodLabelActive]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Amount input */}
            <Text style={s.pmSectionTitle}>Montant reçu</Text>
            <TextInput
              style={s.pmAmountInput}
              value={amountInput}
              onChangeText={setAmountInput}
              keyboardType="numeric"
              selectTextOnFocus
            />

            {/* Quick amounts */}
            {method === 'CASH' && (
              <View style={s.pmQuickRow}>
                {quickAmounts.map((qa) => (
                  <TouchableOpacity key={qa} style={s.pmQuickBtn} onPress={() => setAmountInput(qa.toFixed(2))} activeOpacity={0.7}>
                    <Text style={s.pmQuickText}>{fmt(qa, currency)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Reference (for non-cash) */}
            {method !== 'CASH' && (
              <TextInput
                style={s.pmReferenceInput}
                placeholder="Référence / N° transaction"
                placeholderTextColor={colors.placeholder}
                value={reference}
                onChangeText={setReference}
              />
            )}

            {/* Change */}
            {method === 'CASH' && change > 0 && (
              <View style={s.pmChangeBox}>
                <Text style={s.pmChangeLabel}>Monnaie à rendre</Text>
                <Text style={s.pmChangeValue}>{fmt(change, currency)}</Text>
              </View>
            )}
          </ScrollView>

          {/* Confirm */}
          <TouchableOpacity
            style={[s.pmConfirmBtn, (isProcessing || (amount < totals.grandTotal && method !== 'CREDIT')) && { opacity: 0.5 }]}
            onPress={handleConfirm}
            activeOpacity={0.8}
            disabled={isProcessing || (amount < totals.grandTotal && method !== 'CREDIT')}
          >
            <Ionicons name="checkmark-circle" size={22} color="#FFF" />
            <Text style={s.pmConfirmText}>Valider le paiement</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
//  RECEIPT MODAL
// ═══════════════════════════════════════════════════════════════

function ReceiptModal({ visible, sale, onClose }: { visible: boolean; sale: Sale | null; onClose: () => void }) {
  if (!sale) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <View style={s.receiptModal}>
          {/* Header */}
          <View style={s.rcHeader}>
            <View style={s.rcHeaderIcon}>
              <Ionicons name="checkmark-circle" size={36} color={colors.success} />
            </View>
            <Text style={s.rcTitle}>Vente enregistrée!</Text>
            <Text style={s.rcSaleNum}>{sale.saleNumber}</Text>
          </View>

          <ScrollView contentContainerStyle={s.rcBody}>
            {/* Receipt info */}
            <View style={s.rcInfo}>
              <RcRow label="Reçu N°" value={sale.receiptNumber} />
              <RcRow label="Date" value={SaleUtils.formatDateTime(sale.createdAt)} />
              <RcRow label="Caissier" value={sale.cashierName} />
              {sale.customerName && <RcRow label="Client" value={sale.customerName} />}
            </View>

            {/* Items */}
            <View style={s.rcDivider} />
            <Text style={s.rcSectionTitle}>Articles ({sale.itemCount})</Text>
            {sale.items.map((item) => (
              <View key={item.id} style={s.rcItem}>
                <View style={s.rcItemLeft}>
                  <Text style={s.rcItemName} numberOfLines={1}>{item.productName}</Text>
                  <Text style={s.rcItemDetail}>{item.quantity} × {fmt(item.unitPrice, sale.currency)}</Text>
                </View>
                <Text style={s.rcItemTotal}>{fmt(item.lineTotal, sale.currency)}</Text>
              </View>
            ))}

            {/* Totals */}
            <View style={s.rcDivider} />
            <RcRow label="Sous-total" value={fmt(sale.subtotal, sale.currency)} />
            {sale.discountAmount > 0 && <RcRow label="Remise" value={`-${fmt(sale.discountAmount, sale.currency)}`} />}
            {sale.taxAmount > 0 && <RcRow label="Taxe" value={fmt(sale.taxAmount, sale.currency)} />}
            <View style={s.rcGrandRow}>
              <Text style={s.rcGrandLabel}>TOTAL</Text>
              <Text style={s.rcGrandValue}>{fmt(sale.totalAmount, sale.currency)}</Text>
            </View>

            {/* Payment */}
            <View style={s.rcDivider} />
            <Text style={s.rcSectionTitle}>Paiement</Text>
            {sale.payments.map((p) => (
              <RcRow key={p.id} label={SaleUtils.getPaymentMethodLabel(p.method)} value={fmt(p.amount, sale.currency)} />
            ))}
            {sale.changeGiven > 0 && <RcRow label="Monnaie" value={fmt(sale.changeGiven, sale.currency)} />}
          </ScrollView>

          {/* Actions */}
          <View style={s.rcActions}>
            <TouchableOpacity style={s.rcPrintBtn} activeOpacity={0.7}>
              <Ionicons name="print" size={18} color={colors.primary} />
              <Text style={s.rcPrintText}>Imprimer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.rcDoneBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={s.rcDoneText}>Nouvelle Vente</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function RcRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.rcRow}>
      <Text style={s.rcRowLabel}>{label}</Text>
      <Text style={s.rcRowValue}>{value}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
//  SALES HISTORY MODAL
// ═══════════════════════════════════════════════════════════════

function SalesHistoryModal({ visible, orgId, onClose, onViewReceipt }: {
  visible: boolean;
  orgId: string;
  onClose: () => void;
  onViewReceipt: (sale: Sale) => void;
}) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalSales: 0, totalRevenue: 0, totalProfit: 0, totalItems: 0, avgSaleValue: 0, paymentBreakdown: {} as Record<string, number> });
  const toast = useToast();

  useEffect(() => {
    if (!visible) return;
    (async () => {
      setLoading(true);
      try {
        const api = ApiService.getInstance();
        const today = new Date().toISOString().split('T')[0];
        const [salesRes, statsRes] = await Promise.all([
          api.get('/sales/', { page_size: 50, ordering: '-created_at' }),
          api.get('/sales/reports/stats/'),
        ]);

        const rawSales: any[] = salesRes?.data?.results ?? salesRes?.data ?? [];
        const stats = statsRes?.data ?? {};

        // Map backend sale to frontend Sale shape
        const mapped: Sale[] = rawSales.map((s: any) => ({
          id: s.id,
          saleNumber: s.sale_number ?? s.id,
          receiptNumber: s.receipt_number ?? '',
          organizationId: '',
          facilityId: '',
          cashierId: '',
          cashierName: s.cashier_name ?? '',
          status: s.status ?? 'COMPLETED',
          type: s.type ?? 'COUNTER',
          customerId: s.customer ?? '',
          customerName: s.customer_name ?? '',
          customerPhone: s.customer_phone ?? '',
          prescriptionId: '',
          items: [],
          payments: (s.payments ?? []).map((p: any) => ({
            id: p.id,
            method: p.payment_method,
            amount: parseFloat(p.amount ?? '0'),
            currency: p.currency ?? 'CDF',
            reference: p.reference_number ?? '',
            status: p.status ?? 'COMPLETED',
            processedAt: p.processed_at,
          })),
          subtotal: parseFloat(s.subtotal ?? s.total_amount ?? '0'),
          taxTotal: parseFloat(s.tax_amount ?? '0'),
          discountTotal: parseFloat(s.discount_amount ?? '0'),
          grandTotal: parseFloat(s.total_amount ?? '0'),
          totalAmount: parseFloat(s.total_amount ?? '0'),
          currency: 'CDF',
          itemCount: s.item_count ?? 0,
          notes: s.notes ?? '',
          createdAt: s.created_at,
          updatedAt: s.updated_at ?? s.created_at,
        }));

        setSales(mapped);
        setSummary({
          totalSales: stats.today_sales_count ?? mapped.filter(s => s.status === 'COMPLETED').length,
          totalRevenue: parseFloat(stats.today_sales_amount ?? '0') || mapped.filter(s => s.status === 'COMPLETED').reduce((sum, s) => sum + s.totalAmount, 0),
          totalProfit: 0,
          totalItems: mapped.reduce((sum, s) => sum + s.itemCount, 0),
          avgSaleValue: mapped.length ? mapped.reduce((sum, s) => sum + s.totalAmount, 0) / mapped.length : 0,
          paymentBreakdown: {},
        });
      } catch {
        toast.error('Erreur lors du chargement de l\'historique');
      } finally {
        setLoading(false);
      }
    })();
  }, [visible]);

  const handleVoid = async (sale: Sale) => {
    try {
      const api = ApiService.getInstance();
      await api.patch(`/sales/${sale.id}/`, { status: 'VOIDED', void_reason: 'Annulation manuelle' });
      toast.success('Vente annulée');
      // Refresh list
      const [salesRes, statsRes] = await Promise.all([
        api.get('/sales/', { page_size: 50, ordering: '-created_at' }),
        api.get('/sales/reports/stats/'),
      ]);
      const rawSales: any[] = salesRes?.data?.results ?? salesRes?.data ?? [];
      const stats = statsRes?.data ?? {};
      setSales(rawSales.map((s: any) => ({
        id: s.id, saleNumber: s.sale_number ?? s.id, receiptNumber: s.receipt_number ?? '',
        organizationId: '', facilityId: '', cashierId: '', cashierName: s.cashier_name ?? '',
        status: s.status ?? 'COMPLETED', type: s.type ?? 'COUNTER',
        customerId: s.customer ?? '', customerName: s.customer_name ?? '', customerPhone: '',
        prescriptionId: '', items: [],
        payments: (s.payments ?? []).map((p: any) => ({ id: p.id, method: p.payment_method, amount: parseFloat(p.amount ?? '0'), currency: p.currency ?? 'CDF', reference: p.reference_number ?? '', status: p.status ?? 'COMPLETED', processedAt: p.processed_at })),
        subtotal: parseFloat(s.subtotal ?? s.total_amount ?? '0'),
        taxTotal: parseFloat(s.tax_amount ?? '0'), discountTotal: parseFloat(s.discount_amount ?? '0'),
        grandTotal: parseFloat(s.total_amount ?? '0'), totalAmount: parseFloat(s.total_amount ?? '0'),
        currency: 'CDF', itemCount: s.item_count ?? 0, notes: s.notes ?? '',
        createdAt: s.created_at, updatedAt: s.updated_at ?? s.created_at,
      })));
      setSummary(prev => ({ ...prev, totalSales: stats.today_sales_count ?? prev.totalSales, totalRevenue: parseFloat(stats.today_sales_amount ?? '0') || prev.totalRevenue }));
    } catch {
      toast.error('Erreur lors de l\'annulation');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <View style={s.historyModal}>
          {/* Header */}
          <View style={s.hisHeader}>
            <Text style={s.hisTitle}>Historique des Ventes</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={s.hisBody}>
              {/* Today summary */}
              <View style={s.hisSummaryRow}>
                <HisSummaryCard icon="receipt" label="Ventes" value={`${summary.totalSales}`} color={colors.primary} />
                <HisSummaryCard icon="cash" label="Revenu" value={fmt(summary.totalRevenue)} color={colors.success} />
                <HisSummaryCard icon="trending-up" label="Bénéfice" value={fmt(summary.totalProfit)} color={colors.info} />
              </View>

              {/* Sales list */}
              {sales.length === 0 ? (
                <View style={s.emptyState}>
                  <Ionicons name="receipt-outline" size={40} color={colors.textTertiary} />
                  <Text style={s.emptyTitle}>Aucune vente</Text>
                </View>
              ) : (
                sales.map((sale) => (
                  <TouchableOpacity key={sale.id} style={s.hisSaleCard} onPress={() => onViewReceipt(sale)} activeOpacity={0.7}>
                    <View style={s.hisSaleLeft}>
                      <View style={s.hisSaleIconWrap}>
                        <Ionicons name={sale.status === 'VOIDED' ? 'close-circle' : 'receipt'} size={20} color={sale.status === 'VOIDED' ? colors.error : colors.primary} />
                      </View>
                      <View>
                        <Text style={[s.hisSaleNum, sale.status === 'VOIDED' && { textDecorationLine: 'line-through', color: colors.textTertiary }]}>{sale.saleNumber}</Text>
                        <Text style={s.hisSaleTime}>{SaleUtils.formatDateTime(sale.createdAt)} · {sale.itemCount} article{sale.itemCount > 1 ? 's' : ''}</Text>
                        <Text style={s.hisSalePayment}>{sale.payments.map((p) => SaleUtils.getPaymentMethodLabel(p.method)).join(', ')}</Text>
                      </View>
                    </View>
                    <View style={s.hisSaleRight}>
                      <Text style={[s.hisSaleAmount, sale.status === 'VOIDED' && { color: colors.textTertiary }]}>{fmt(sale.totalAmount, sale.currency)}</Text>
                      {sale.status === 'VOIDED' && <Text style={s.hisSaleVoided}>Annulée</Text>}
                      {sale.status === 'COMPLETED' && (
                        <TouchableOpacity onPress={() => handleVoid(sale)} style={s.voidBtn} activeOpacity={0.7}>
                          <Ionicons name="trash-outline" size={14} color={colors.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function HisSummaryCard({ icon, label, value, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color: string }) {
  return (
    <View style={s.hisSCard}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={s.hisSValue}>{value}</Text>
      <Text style={s.hisSLabel}>{label}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════════

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: isDesktop ? 'row' : 'column', backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.textSecondary },

  // ─── CATALOGUE SIDE ─────────────────────────────────────
  catalogSide: { flex: 1, borderRightWidth: isDesktop ? 1 : 0, borderRightColor: colors.outline },

  // Top bar
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: isPhone ? 12 : 16, paddingVertical: isPhone ? 10 : 12, borderBottomWidth: 1, borderBottomColor: colors.outline, backgroundColor: colors.surface },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topBarTitle: { fontSize: isSmallPhone ? 16 : 18, fontWeight: '700', color: colors.text },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: isSmallPhone ? 9 : 12, paddingVertical: 6, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.primary },
  historyBtnText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  mobileCartBtn: { backgroundColor: colors.primary, borderRadius: borderRadius.full, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  mobileCartBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: colors.error, borderRadius: borderRadius.full, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  mobileCartBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },

  // Search
  searchRow: { padding: isPhone ? 10 : 12, paddingBottom: 0 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outline, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, outlineStyle: 'none' as any },

  // Categories
  catScroll: { maxHeight: 44, marginTop: 8 },
  catRow: { paddingHorizontal: 12, gap: 6 },
  catChip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline, borderRadius: borderRadius.full, paddingHorizontal: 14, paddingVertical: 6 },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catChipText: { fontSize: 12, fontWeight: '500', color: colors.textSecondary },
  catChipTextActive: { color: '#FFF', fontWeight: '600' },

  // Product grid
  productScroll: { flex: 1 },
  productGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: isPhone ? 10 : 12, gap: isPhone ? 8 : 10 },
  paginationWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paginationWrapMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  paginationInfo: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  paginationCtrls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pageBtn: {
    width: 30,
    height: 30,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  pageBtnDisabled: { backgroundColor: colors.surfaceVariant },
  pageLabel: { fontSize: 12, color: colors.text, fontWeight: '600' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 40, width: '100%' },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginTop: 8 },

  // ─── PRODUCT TILE ────────────────────────────────────────
  tile: {
    width: isDesktop ? 'calc(25% - 8px)' as any : isPhone ? '100%' as any : '48%' as any,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.outline,
    padding: isPhone ? 10 : 12,
    ...shadows.xs,
  },
  tileDisabled: { opacity: 0.5 },
  tileInCart: { borderColor: colors.primary, borderWidth: 2 },
  tileName: { fontSize: 13, fontWeight: '600', color: colors.text, lineHeight: 18 },
  tileSub: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
  tilePriceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  tilePrice: { fontSize: 16, fontWeight: '700', color: colors.primary },
  rxBadge: { backgroundColor: colors.primaryFaded, borderRadius: borderRadius.sm, paddingHorizontal: 5, paddingVertical: 1 },
  rxText: { fontSize: 9, fontWeight: '700', color: colors.primary },
  tileStockRow: { marginTop: 4 },
  tileStock: { fontSize: 11, color: colors.textTertiary },
  cartBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: colors.primary, borderRadius: borderRadius.full, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },

  // ─── CART PANEL ──────────────────────────────────────────
  cartPanel: { width: isDesktop ? CART_WIDTH : '100%', backgroundColor: colors.surface, borderLeftWidth: 0, flex: isDesktop ? undefined : 1 },
  cartPanelMobile: { flex: 1 },
  cartHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.outline, gap: 8 },
  cartTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  cartHeaderBadge: { backgroundColor: colors.primaryFaded, borderRadius: borderRadius.full, paddingHorizontal: 8, paddingVertical: 2 },
  cartHeaderBadgeText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  cartEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  cartEmptyText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary, marginTop: 12 },
  cartEmptyHint: { fontSize: 12, color: colors.textTertiary, marginTop: 4 },

  // Cart items
  cartItems: { flex: 1 },
  cartItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.outline, gap: 8 },
  cartItemInfo: { flex: 1, minWidth: 0 },
  cartItemName: { fontSize: 13, fontWeight: '600', color: colors.text },
  cartItemSub: { fontSize: 11, color: colors.textTertiary, marginTop: 1 },
  cartItemQtyRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qtyBtn: { width: 28, height: 28, borderRadius: borderRadius.md, backgroundColor: colors.primaryFaded, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 14, fontWeight: '700', color: colors.text, minWidth: 24, textAlign: 'center' },
  cartItemTotal: { fontSize: 13, fontWeight: '700', color: colors.text, minWidth: 55, textAlign: 'right' },
  cartItemRemove: { padding: 4 },

  // Discount
  discountSection: { paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.outline },
  discountRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  discountTypeBtn: { width: 32, height: 32, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.outline, alignItems: 'center', justifyContent: 'center' },
  discountTypeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  discountTypeText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  discountTypeTextActive: { color: '#FFF' },
  discountInput: { flex: 1, borderWidth: 1, borderColor: colors.outline, borderRadius: borderRadius.md, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, color: colors.text },

  // Totals
  totalsSection: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.outline },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalLabel: { fontSize: 13, color: colors.textSecondary },
  totalValue: { fontSize: 13, fontWeight: '600', color: colors.text },
  totalsDivider: { height: 1, backgroundColor: colors.outline, marginVertical: 6 },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  grandTotalLabel: { fontSize: 16, fontWeight: '800', color: colors.text },
  grandTotalValue: { fontSize: 18, fontWeight: '800', color: colors.primary },

  // Checkout
  checkoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, margin: 12, paddingVertical: 14, borderRadius: borderRadius.lg, ...shadows.md },
  checkoutBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },

  // ─── MOBILE CART OVERLAY ─────────────────────────────────
  mobileCartOverlay: { flex: 1, backgroundColor: colors.surface, paddingTop: Platform.OS === 'ios' ? 50 : 0 },
  mobileCartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.outline },
  mobileCartTitle: { fontSize: 18, fontWeight: '700', color: colors.text },

  // ─── MODAL BACKDROP ──────────────────────────────────────
  modalBackdrop: { flex: 1, backgroundColor: colors.backdrop, justifyContent: 'center', alignItems: 'center' },

  // ─── PAYMENT MODAL ──────────────────────────────────────
  paymentModal: { width: isDesktop ? 460 : '92%', maxHeight: '90%', backgroundColor: colors.surface, borderRadius: borderRadius.xl, ...shadows.xl, overflow: 'hidden' },
  pmHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.outline },
  pmTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  pmBody: { padding: 20 },
  pmTotal: { fontSize: 32, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  pmTotalLabel: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: 20 },
  pmSectionTitle: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
  pmMethods: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pmMethod: { flex: 1, minWidth: 80, alignItems: 'center', paddingVertical: 12, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outline, gap: 4 },
  pmMethodActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pmMethodLabel: { fontSize: 11, fontWeight: '600', color: colors.primary },
  pmMethodLabelActive: { color: '#FFF' },
  pmAmountInput: { borderWidth: 2, borderColor: colors.primary, borderRadius: borderRadius.lg, paddingHorizontal: 16, paddingVertical: 12, fontSize: 22, fontWeight: '700', color: colors.primary, textAlign: 'center', marginTop: 4 },
  pmQuickRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  pmQuickBtn: { flex: 1, paddingVertical: 8, borderRadius: borderRadius.md, backgroundColor: colors.surfaceVariant, alignItems: 'center' },
  pmQuickText: { fontSize: 12, fontWeight: '600', color: colors.text },
  pmReferenceInput: { borderWidth: 1, borderColor: colors.outline, borderRadius: borderRadius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: colors.text, marginTop: 10 },
  pmChangeBox: { backgroundColor: colors.successLight, borderRadius: borderRadius.lg, padding: 14, alignItems: 'center', marginTop: 16, gap: 4 },
  pmChangeLabel: { fontSize: 12, fontWeight: '600', color: colors.successDark },
  pmChangeValue: { fontSize: 24, fontWeight: '800', color: colors.success },
  pmConfirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.success, margin: 16, paddingVertical: 14, borderRadius: borderRadius.lg },
  pmConfirmText: { fontSize: 15, fontWeight: '700', color: '#FFF' },

  // ─── RECEIPT MODAL ──────────────────────────────────────
  receiptModal: { width: isDesktop ? 420 : '92%', maxHeight: '90%', backgroundColor: colors.surface, borderRadius: borderRadius.xl, ...shadows.xl, overflow: 'hidden' },
  rcHeader: { alignItems: 'center', paddingTop: 24, paddingBottom: 16, backgroundColor: colors.surfaceVariant },
  rcHeaderIcon: { marginBottom: 8 },
  rcTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  rcSaleNum: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', marginTop: 2 },
  rcBody: { padding: 20 },
  rcInfo: { gap: 4 },
  rcDivider: { height: 1, backgroundColor: colors.outline, marginVertical: 12 },
  rcSectionTitle: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  rcItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  rcItemLeft: { flex: 1 },
  rcItemName: { fontSize: 13, fontWeight: '600', color: colors.text },
  rcItemDetail: { fontSize: 11, color: colors.textTertiary },
  rcItemTotal: { fontSize: 13, fontWeight: '600', color: colors.text },
  rcRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  rcRowLabel: { fontSize: 13, color: colors.textSecondary },
  rcRowValue: { fontSize: 13, fontWeight: '600', color: colors.text },
  rcGrandRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, marginTop: 4 },
  rcGrandLabel: { fontSize: 16, fontWeight: '800', color: colors.text },
  rcGrandValue: { fontSize: 18, fontWeight: '800', color: colors.primary },
  rcActions: { flexDirection: 'row', padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: colors.outline },
  rcPrintBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.primary },
  rcPrintText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  rcDoneBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: borderRadius.lg, backgroundColor: colors.primary },
  rcDoneText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  // ─── HISTORY MODAL ──────────────────────────────────────
  historyModal: { width: isDesktop ? 560 : '95%', maxHeight: '90%', backgroundColor: colors.surface, borderRadius: borderRadius.xl, ...shadows.xl, overflow: 'hidden' },
  hisHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.outline },
  hisTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  hisBody: { padding: 16 },
  hisSummaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  hisSCard: { flex: 1, backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.lg, padding: 12, alignItems: 'center', gap: 4 },
  hisSValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  hisSLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase' },
  hisSaleCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.outline },
  hisSaleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  hisSaleIconWrap: { width: 36, height: 36, borderRadius: borderRadius.md, backgroundColor: colors.primaryFaded, alignItems: 'center', justifyContent: 'center' },
  hisSaleNum: { fontSize: 13, fontWeight: '700', color: colors.text },
  hisSaleTime: { fontSize: 11, color: colors.textTertiary, marginTop: 1 },
  hisSalePayment: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  hisSaleRight: { alignItems: 'flex-end', gap: 4 },
  hisSaleAmount: { fontSize: 15, fontWeight: '700', color: colors.primary },
  hisSaleVoided: { fontSize: 10, fontWeight: '700', color: colors.error },
  voidBtn: { padding: 4, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.error + '40' },
});
