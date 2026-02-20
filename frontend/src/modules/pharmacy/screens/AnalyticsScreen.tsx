import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { useToast } from '../../../components/GlobalUI';
import ApiService from '../../../services/ApiService';
import DatabaseService from '../../../services/DatabaseService';
import DateInput from '../../../components/DateInput';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface AnalyticsData {
  totalRevenue: number;
  totalProfit: number;
  totalSales: number;
  totalCustomers: number;
  avgOrderValue: number;
  profitMargin: number;
  growthRate: number;
}

interface TopProduct {
  id: string;
  name: string;
  category: string;
  quantitySold: number;
  revenue: number;
  profit: number;
  margin: number;
}

interface FinancialSummary {
  grossRevenue: number;
  totalCosts: number;
  netProfit: number;
  taxAmount: number;
  expenses: number;
  profitMargin: number;
}

interface CustomerMetrics {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  avgOrdersPerCustomer: number;
  avgSpentPerCustomer: number;
  retentionRate: number;
}

interface ProductAnalytics {
  totalProducts: number;
  activeProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  categoryPerformance: CategoryPerformance[];
  topPerformers: TopProduct[];
  slowMovers: TopProduct[];
}

interface CategoryPerformance {
  category: string;
  revenue: number;
  profit: number;
  quantity: number;
  percentage: number;
}

type ReportPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
type ReportType = 'overview' | 'financial' | 'inventory' | 'customers' | 'prescriptions';

// ═══════════════════════════════════════════════════════════════
// ANALYTICS SCREEN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function AnalyticsScreen() {
  const [activeTab, setActiveTab] = useState<ReportType>('overview');
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [financialData, setFinancialData] = useState<FinancialSummary | null>(null);
  const [customerMetrics, setCustomerMetrics] = useState<CustomerMetrics | null>(null);
  const [productAnalytics, setProductAnalytics] = useState<ProductAnalytics | null>(null);
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [prescriptionStats, setPrescriptionStats] = useState<{ total: number; pending: number; completed: number; expired: number }>({ total: 0, pending: 0, completed: 0, expired: 0 });
  const toast = useToast();

  const parseInputDate = (value: string): Date | null => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  };

  // ─── Load Analytics Data ─────────────────────────────────────
  const loadAnalyticsData = useCallback(async () => {
    setLoading(true);
    try {
      const api = ApiService.getInstance();
      const db = DatabaseService.getInstance();
      const dateRange = getDateRange();

      const fetchAllResults = async (endpoint: string, params: Record<string, any> = {}, maxPages = 16) => {
        const rows: any[] = [];
        for (let page = 1; page <= maxPages; page += 1) {
          const res = await api.get(endpoint, { ...params, page });
          const payload = res?.data;
          const pageRows: any[] = Array.isArray(payload) ? payload : (payload?.results ?? []);
          rows.push(...pageRows);
          if (Array.isArray(payload) || !payload?.next) break;
        }
        return rows;
      };

      const [salesRows, saleItemsRows, productsRows, patientsRows, inventoryStatsRes, prescriptionStatsRes] = await Promise.all([
        fetchAllResults('/sales/', { page_size: 200, ordering: '-created_at' }),
        fetchAllResults('/sales/items/', { page_size: 500 }),
        fetchAllResults('/inventory/products/', { page_size: 500 }),
        fetchAllResults('/patients/', { page_size: 500 }),
        api.get('/inventory/reports/stats/'),
        api.get('/prescriptions/reports/stats/'),
      ]);

      const inRangeSales = salesRows.filter((sale: any) => {
        const ts = new Date(sale.created_at).getTime();
        return !isNaN(ts) && ts >= dateRange.start.getTime() && ts <= dateRange.end.getTime();
      });

      const saleIdsInRange = new Set(inRangeSales.map((sale: any) => sale.id));
      const inRangeSaleItems = saleItemsRows.filter((item: any) => saleIdsInRange.has(item.sale));

      const analytics = calculateAnalytics(inRangeSales, salesRows, dateRange);
      const topProductsData = calculateTopProducts(inRangeSaleItems, productsRows);
      const financial = calculateFinancialSummary(inRangeSales, inRangeSaleItems);
      const customers = calculateCustomerMetrics(inRangeSales, patientsRows.length);
      const products = calculateProductAnalytics(productsRows, inRangeSaleItems, inventoryStatsRes?.data ?? {});

      const ps = prescriptionStatsRes?.data ?? {};
      setPrescriptionStats({
        total: Number(ps.total_prescriptions ?? 0),
        pending: Number(ps.pending_count ?? 0),
        completed: Number(ps.completed_count ?? 0),
        expired: Number(ps.expired_count ?? 0),
      });
      
      setAnalyticsData(analytics);
      setTopProducts(topProductsData);
      setFinancialData(financial);
      setCustomerMetrics(customers);
      setProductAnalytics(products);

      await db.savePharmacyAnalyticsCache({
        analytics,
        topProductsData,
        financial,
        customers,
        products,
        prescriptionStats: {
          total: Number(ps.total_prescriptions ?? 0),
          pending: Number(ps.pending_count ?? 0),
          completed: Number(ps.completed_count ?? 0),
          expired: Number(ps.expired_count ?? 0),
        },
      });
      
    } catch (error) {
      console.error('Error loading analytics:', error);
      try {
        const db = DatabaseService.getInstance();
        const cached = await db.getPharmacyAnalyticsCache();
        if (cached?.payload) {
          setAnalyticsData(cached.payload.analytics ?? null);
          setTopProducts(cached.payload.topProductsData ?? []);
          setFinancialData(cached.payload.financial ?? null);
          setCustomerMetrics(cached.payload.customers ?? null);
          setProductAnalytics(cached.payload.products ?? null);
          setPrescriptionStats(cached.payload.prescriptionStats ?? { total: 0, pending: 0, completed: 0, expired: 0 });
          toast.warning('Mode hors ligne: analytiques locales chargées');
        } else {
          toast.error('Erreur lors du chargement des données');
        }
      } catch {
        toast.error('Erreur lors du chargement des données');
      }
    } finally {
      setLoading(false);
    }
  }, [period, customDateFrom, customDateTo]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  // ─── Helper Functions ───────────────────────────────────────
  const getDateRange = () => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (period) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        break;
      case 'custom':
        start = parseInputDate(customDateFrom) ?? new Date();
        end = parseInputDate(customDateTo) ?? new Date();
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
    }

    if (start.getTime() > end.getTime()) {
      const previousStart = start;
      start = end;
      end = previousStart;
    }

    return { start, end };
  };

  const calculateAnalytics = (sales: any[], allSales: any[], dateRange: { start: Date; end: Date }): AnalyticsData => {
    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.total_amount ?? 0), 0);
    const estimatedCost = totalRevenue * 0.72;
    const totalProfit = totalRevenue - estimatedCost;
    const totalSales = sales.length;
    const totalCustomers = new Set(sales.map((s) => s.customer).filter(Boolean)).size;
    const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const periodMs = Math.max(1, dateRange.end.getTime() - dateRange.start.getTime());
    const prevStart = new Date(dateRange.start.getTime() - periodMs);
    const prevEnd = new Date(dateRange.start.getTime());
    const previousRevenue = allSales
      .filter((sale) => {
        const ts = new Date(sale.created_at).getTime();
        return !isNaN(ts) && ts >= prevStart.getTime() && ts < prevEnd.getTime();
      })
      .reduce((sum, sale) => sum + Number(sale.total_amount ?? 0), 0);
    const growthRate = previousRevenue > 0
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
      : (totalRevenue > 0 ? 100 : 0);

    return {
      totalRevenue,
      totalProfit,
      totalSales,
      totalCustomers,
      avgOrderValue,
      profitMargin,
      growthRate,
    };
  };

  const calculateTopProducts = (saleItems: any[], products: any[]): TopProduct[] => {
    const productById = new Map<string, any>();
    products.forEach((p) => productById.set(p.id, p));
    const productMap = new Map<string, TopProduct>();

    saleItems.forEach((item) => {
      const productId = item.product;
      const product = productById.get(productId);
      const quantity = Number(item.quantity ?? 0);
      const revenue = Number(item.line_total ?? 0);
      const estimatedCost = Number(item.unit_cost ?? 0) * quantity;
      const existing = productMap.get(productId);

      if (existing) {
        existing.quantitySold += quantity;
        existing.revenue += revenue;
        existing.profit += (revenue - estimatedCost);
      } else {
        productMap.set(productId, {
          id: productId,
          name: item.product_name ?? product?.name ?? 'Produit',
          category: product?.category ?? 'Général',
          quantitySold: quantity,
          revenue,
          profit: revenue - estimatedCost,
          margin: 0,
        });
      }
    });

    const rankedProducts = Array.from(productMap.values()).map(product => ({
      ...product,
      margin: product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0,
    }));

    return rankedProducts.sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  };

  const calculateFinancialSummary = (sales: any[], saleItems: any[]): FinancialSummary => {
    const grossRevenue = sales.reduce((sum, sale) => sum + Number(sale.total_amount ?? 0), 0);
    const totalCosts = saleItems.reduce((sum, item) => {
      const qty = Number(item.quantity ?? 0);
      const unitCost = Number(item.unit_cost ?? 0);
      return sum + (qty * unitCost);
    }, 0);
    const netProfit = grossRevenue - totalCosts;
    const taxAmount = sales.reduce((sum, sale) => sum + Number(sale.tax_amount ?? 0), 0);
    const expenses = Math.max(0, netProfit) * 0.1;
    const profitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

    return {
      grossRevenue,
      totalCosts,
      netProfit,
      taxAmount,
      expenses,
      profitMargin,
    };
  };

  const calculateCustomerMetrics = (sales: any[], totalPatients: number): CustomerMetrics => {
    const customerIds = sales.map((s) => s.customer).filter(Boolean);
    const counts = new Map<string, number>();
    customerIds.forEach((id: string) => counts.set(id, (counts.get(id) ?? 0) + 1));
    const totalCustomers = new Set(customerIds).size;
    const avgOrdersPerCustomer = totalCustomers > 0 ? sales.length / totalCustomers : 0;
    const avgSpentPerCustomer = totalCustomers > 0 ? 
      sales.reduce((sum, sale) => sum + Number(sale.total_amount ?? 0), 0) / totalCustomers : 0;

    const returningCustomers = Array.from(counts.values()).filter((count) => count > 1).length;
    const newCustomers = Math.max(0, totalCustomers - returningCustomers);
    const retentionRate = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;

    return {
      totalCustomers,
      newCustomers,
      returningCustomers,
      avgOrdersPerCustomer,
      avgSpentPerCustomer,
      retentionRate,
    };
  };

  const calculateProductAnalytics = (products: any[], saleItems: any[], inventoryStats: any): ProductAnalytics => {
    const totalProducts = Number(inventoryStats.total_products ?? products.length);
    const activeProducts = Number(inventoryStats.in_stock_count ?? products.filter((p) => p.is_active).length);
    const lowStockCount = Number(inventoryStats.low_stock_count ?? 0);
    const outOfStockCount = Number(inventoryStats.out_of_stock_count ?? 0);

    // Calculate category performance
    const categoryMap = new Map<string, { revenue: number; profit: number; quantity: number }>();
    const productById = new Map<string, any>();
    products.forEach((p) => productById.set(p.id, p));
    
    saleItems.forEach((item) => {
      const product = productById.get(item.product);
      const category = product?.category || 'Général';
      const existing = categoryMap.get(category);
      const quantity = Number(item.quantity ?? 0);
      const revenue = Number(item.line_total ?? 0);
      const profit = revenue - (Number(item.unit_cost ?? 0) * quantity);
      
      if (existing) {
        existing.revenue += revenue;
        existing.profit += profit;
        existing.quantity += quantity;
      } else {
        categoryMap.set(category, {
          revenue,
          profit,
          quantity,
        });
      }
    });

    const totalRevenue = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.revenue, 0);
    const categoryPerformance: CategoryPerformance[] = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      revenue: data.revenue,
      profit: data.profit,
      quantity: data.quantity,
      percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
    }));

    const topProducts = calculateTopProducts(saleItems, products);
    const slowMovers = topProducts.slice(-5).reverse(); // Bottom 5 as slow movers

    return {
      totalProducts,
      activeProducts,
      lowStockCount,
      outOfStockCount,
      categoryPerformance,
      topPerformers: topProducts.slice(0, 5),
      slowMovers,
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CD', {
      style: 'currency',
      currency: 'CDF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const exportReport = async () => {
    try {
      toast.success('Données analytiques chargées depuis le backend et prêtes pour export');
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  // ─── Render Functions ───────────────────────────────────────
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={styles.headerIcon}>
          <Ionicons name="analytics" size={16} color={colors.primary} />
        </View>
        <Text style={styles.headerTitle}>Rapports & Analytiques</Text>
      </View>
      
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.exportBtn} onPress={exportReport}>
          <Ionicons name="download" size={16} color={colors.surface} />
          <Text style={styles.exportBtnText}>Exporter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPeriodSelector = () => (
    <View style={styles.periodSelectorWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 4, minHeight: '100%' }}>
      {[
        { key: 'today', label: "Aujourd'hui" },
        { key: 'week', label: 'Semaine' },
        { key: 'month', label: 'Mois' },
        { key: 'quarter', label: 'Trimestre' },
        { key: 'year', label: 'Année' },
        { key: 'custom', label: 'Personnalisé' },
      ].map(({ key, label }) => (
        <TouchableOpacity
          key={key}
          style={[styles.periodButton, period === key && styles.periodButtonActive]}
          onPress={() => setPeriod(key as ReportPeriod)}
        >
          <Text style={[styles.periodButtonText, period === key && styles.periodButtonTextActive]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
    </View>
  );

  const renderTabSelector = () => (
    <View style={styles.tabSelectorWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 4, minHeight: '100%' }}>
      {[
        { key: 'overview', label: 'Aperçu', icon: 'bar-chart' },
        { key: 'financial', label: 'Financier', icon: 'wallet' },
        { key: 'inventory', label: 'Stock', icon: 'cube' },
        { key: 'customers', label: 'Clients', icon: 'people' },
        { key: 'prescriptions', label: 'Ordonnances', icon: 'document-text' },
      ].map(({ key, label, icon }) => (
        <TouchableOpacity
          key={key}
          style={[styles.tab, activeTab === key && styles.tabActive]}
          onPress={() => setActiveTab(key as ReportType)}
        >
          <Ionicons 
            name={icon as any} 
            size={14} 
            color={activeTab === key ? colors.primary : colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
    </View>
  );

  const renderCustomDateRange = () => {
    if (period !== 'custom') return null;

    return (
      <View style={styles.customDateWrap}>
        <Text style={styles.customDateTitle}>Personnaliser</Text>
        <View style={styles.customDateRow}>
          <View style={styles.customDateField}>
            <Text style={styles.customDateLabel}>Du</Text>
            <DateInput
              containerStyle={styles.customDateInputContainer}
              inputStyle={styles.customDateInput}
              value={customDateFrom}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
              onChangeText={setCustomDateFrom}
              format="iso"
              maximumDate={parseInputDate(customDateTo) ?? undefined}
            />
          </View>
          <View style={styles.customDateField}>
            <Text style={styles.customDateLabel}>Au</Text>
            <DateInput
              containerStyle={styles.customDateInputContainer}
              inputStyle={styles.customDateInput}
              value={customDateTo}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
              onChangeText={setCustomDateTo}
              format="iso"
              minimumDate={parseInputDate(customDateFrom) ?? undefined}
            />
          </View>
        </View>
        <Text style={styles.customDateHint}>
          Format: YYYY-MM-DD (ex: 2026-02-20)
        </Text>
      </View>
    );
  };

  const renderOverviewTab = () => {
    if (!analyticsData) return null;

    return (
      <View style={styles.tabContent}>
        {/* Key Metrics */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Ionicons name="cash" size={24} color={colors.success} />
            <Text style={styles.metricValue}>{formatCurrency(analyticsData.totalRevenue)}</Text>
            <Text style={styles.metricLabel}>Chiffre d'Affaires</Text>
            <Text style={styles.metricChange}>+{analyticsData.growthRate}%</Text>
          </View>

          <View style={styles.metricCard}>
            <Ionicons name="trending-up" size={24} color={colors.primary} />
            <Text style={styles.metricValue}>{formatCurrency(analyticsData.totalProfit)}</Text>
            <Text style={styles.metricLabel}>Bénéfice Net</Text>
            <Text style={styles.metricChange}>{analyticsData.profitMargin.toFixed(1)}%</Text>
          </View>

          <View style={styles.metricCard}>
            <Ionicons name="receipt" size={24} color={colors.info} />
            <Text style={styles.metricValue}>{analyticsData.totalSales}</Text>
            <Text style={styles.metricLabel}>Total Ventes</Text>
            <Text style={styles.metricChange}>+8.2%</Text>
          </View>

          <View style={styles.metricCard}>
            <Ionicons name="people" size={24} color={colors.warning} />
            <Text style={styles.metricValue}>{analyticsData.totalCustomers}</Text>
            <Text style={styles.metricLabel}>Clients Uniques</Text>
            <Text style={styles.metricChange}>+15.3%</Text>
          </View>
        </View>

        {/* Top Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Produits les Plus Vendus</Text>
            <TouchableOpacity>
              <Text style={styles.sectionAction}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          
          {topProducts.slice(0, 5).map((product, index) => (
            <View key={product.id} style={styles.productRow}>
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={1} ellipsizeMode="tail">{product.name}</Text>
                <Text style={styles.productCategory} numberOfLines={1} ellipsizeMode="tail">{product.category}</Text>
              </View>
              <View style={styles.productStats}>
                <Text style={styles.productRevenue}>{formatCurrency(product.revenue)}</Text>
                <Text style={styles.productQuantity}>{product.quantitySold} vendus</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderFinancialTab = () => {
    if (!financialData) return null;

    return (
      <View style={styles.tabContent}>
        <View style={styles.financialGrid}>
          <View style={[styles.metricCard, styles.financialCard]}>
            <Text style={styles.financialLabel}>Revenus Bruts</Text>
            <Text style={[styles.financialValue, { color: colors.success }]}>
              {formatCurrency(financialData.grossRevenue)}
            </Text>
          </View>

          <View style={[styles.metricCard, styles.financialCard]}>
            <Text style={styles.financialLabel}>Coûts Totaux</Text>
            <Text style={[styles.financialValue, { color: colors.error }]}>
              {formatCurrency(financialData.totalCosts)}
            </Text>
          </View>

          <View style={[styles.metricCard, styles.financialCard]}>
            <Text style={styles.financialLabel}>Bénéfice Net</Text>
            <Text style={[styles.financialValue, { color: colors.primary }]}>
              {formatCurrency(financialData.netProfit)}
            </Text>
          </View>

          <View style={[styles.metricCard, styles.financialCard]}>
            <Text style={styles.financialLabel}>Marge Bénéficiaire</Text>
            <Text style={[styles.financialValue, { color: colors.info }]}>
              {financialData.profitMargin.toFixed(1)}%
            </Text>
          </View>

          <View style={[styles.metricCard, styles.financialCard]}>
            <Text style={styles.financialLabel}>TVA Estimée</Text>
            <Text style={[styles.financialValue, { color: colors.warning }]}>
              {formatCurrency(financialData.taxAmount)}
            </Text>
          </View>

          <View style={[styles.metricCard, styles.financialCard]}>
            <Text style={styles.financialLabel}>Charges</Text>
            <Text style={[styles.financialValue, { color: colors.textSecondary }]}>
              {formatCurrency(financialData.expenses)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderInventoryTab = () => {
    if (!productAnalytics) return null;

    return (
      <View style={styles.tabContent}>
        {/* Inventory Overview */}
        <View style={styles.inventoryOverview}>
          <View style={styles.inventoryCard}>
            <Ionicons name="cube" size={20} color={colors.primary} />
            <Text style={styles.inventoryValue}>{productAnalytics.totalProducts}</Text>
            <Text style={styles.inventoryLabel}>Total Produits</Text>
          </View>

          <View style={styles.inventoryCard}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.inventoryValue}>{productAnalytics.activeProducts}</Text>
            <Text style={styles.inventoryLabel}>En Stock</Text>
          </View>

          <View style={styles.inventoryCard}>
            <Ionicons name="warning" size={20} color={colors.warning} />
            <Text style={styles.inventoryValue}>{productAnalytics.lowStockCount}</Text>
            <Text style={styles.inventoryLabel}>Stock Faible</Text>
          </View>

          <View style={styles.inventoryCard}>
            <Ionicons name="close-circle" size={20} color={colors.error} />
            <Text style={styles.inventoryValue}>{productAnalytics.outOfStockCount}</Text>
            <Text style={styles.inventoryLabel}>Rupture</Text>
          </View>
        </View>

        {/* Category Performance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance par Catégorie</Text>
          {productAnalytics.categoryPerformance.map((category, index) => (
            <View key={category.category} style={styles.categoryRow}>
              <Text style={styles.categoryName} numberOfLines={1} ellipsizeMode="tail">{category.category}</Text>
              <View style={styles.categoryStats}>
                <Text style={styles.categoryRevenue}>{formatCurrency(category.revenue)}</Text>
                <Text style={styles.categoryPercentage}>{category.percentage.toFixed(1)}%</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderCustomersTab = () => {
    if (!customerMetrics) return null;

    return (
      <View style={styles.tabContent}>
        <View style={styles.customerGrid}>
          <View style={styles.customerCard}>
            <Text style={styles.customerValue}>{customerMetrics.totalCustomers}</Text>
            <Text style={styles.customerLabel}>Total Clients</Text>
            <View style={styles.customerBreakdown}>
              <Text style={styles.customerBreakdownText}>
                Nouveaux: {customerMetrics.newCustomers}
              </Text>
              <Text style={styles.customerBreakdownText}>
                Fidèles: {customerMetrics.returningCustomers}
              </Text>
            </View>
          </View>

          <View style={styles.customerCard}>
            <Text style={styles.customerValue}>
              {formatCurrency(customerMetrics.avgSpentPerCustomer)}
            </Text>
            <Text style={styles.customerLabel}>Dépense Moyenne</Text>
            <Text style={styles.customerSubtext}>
              {customerMetrics.avgOrdersPerCustomer.toFixed(1)} commandes/client
            </Text>
          </View>

          <View style={styles.customerCard}>
            <Text style={styles.customerValue}>{customerMetrics.retentionRate}%</Text>
            <Text style={styles.customerLabel}>Taux de Rétention</Text>
            <Text style={styles.customerSubtext}>Clients qui reviennent</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderPrescriptionsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.customerGrid}>
        <View style={styles.customerCard}>
          <Text style={styles.customerValue}>{prescriptionStats.total}</Text>
          <Text style={styles.customerLabel}>Total Ordonnances</Text>
        </View>
        <View style={styles.customerCard}>
          <Text style={styles.customerValue}>{prescriptionStats.pending}</Text>
          <Text style={styles.customerLabel}>En Attente</Text>
        </View>
        <View style={styles.customerCard}>
          <Text style={styles.customerValue}>{prescriptionStats.completed}</Text>
          <Text style={styles.customerLabel}>Terminées</Text>
        </View>
        <View style={styles.customerCard}>
          <Text style={styles.customerValue}>{prescriptionStats.expired}</Text>
          <Text style={styles.customerLabel}>Expirées</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderPeriodSelector()}
      {renderCustomDateRange()}
      {renderTabSelector()}
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Chargement des données...</Text>
          </View>
        ) : (
          <>
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'financial' && renderFinancialTab()}
            {activeTab === 'inventory' && renderInventoryTab()}
            {activeTab === 'customers' && renderCustomersTab()}
            {activeTab === 'prescriptions' && renderPrescriptionsTab()}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    ...shadows.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 30,
    height: 30,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary + '14',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    display: 'none' as any,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 0,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  exportBtnText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: '600',
  },
  periodSelectorWrap: {
    height: 38,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    overflow: 'hidden',
  },
  periodSelector: {
    flex: 1,
  },
  periodButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginHorizontal: 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodButtonText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: colors.surface,
    fontWeight: '600',
  },
  tabSelectorWrap: {
    height: 38,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    overflow: 'hidden',
  },
  customDateWrap: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  customDateTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  customDateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  customDateField: {
    flex: 1,
    gap: 4,
  },
  customDateLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  customDateInputContainer: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.inputBackground,
    paddingHorizontal: spacing.sm,
    minHeight: 36,
    alignItems: 'center',
  },
  customDateInput: {
    color: colors.text,
    fontSize: 13,
    paddingVertical: 6,
  },
  customDateHint: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  tabSelector: {
    flex: 1,
  },
  tab: {
    gap: 3,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginHorizontal: 2,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary + '14',
  },
  tabText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.textSecondary,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  metricCard: {
    flex: isDesktop ? 0.23 : 0.48,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginVertical: spacing.sm,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  metricChange: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  sectionAction: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outline + '40',
    gap: spacing.md,
  },
  productInfo: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  productCategory: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  productStats: {
    alignItems: 'flex-end',
    minWidth: 110,
    flexShrink: 0,
  },
  productRevenue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
  },
  productQuantity: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  financialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  financialCard: {
    flex: isDesktop ? 0.31 : 0.48,
    alignItems: 'flex-start',
  },
  financialLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  financialValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  inventoryOverview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  inventoryCard: {
    flex: isDesktop ? 0.23 : 0.48,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  inventoryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginVertical: spacing.sm,
  },
  inventoryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outline + '40',
    gap: spacing.md,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    paddingRight: spacing.sm,
  },
  categoryStats: {
    alignItems: 'flex-end',
    minWidth: 110,
    flexShrink: 0,
  },
  categoryRevenue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  categoryPercentage: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  customerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  customerCard: {
    flex: isDesktop ? 0.31 : 0.48,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  customerValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  customerLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  customerSubtext: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  customerBreakdown: {
    marginTop: spacing.sm,
  },
  customerBreakdownText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  comingSoon: {
    textAlign: 'center',
    fontSize: 16,
    color: colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: spacing.xl * 2,
  },
});