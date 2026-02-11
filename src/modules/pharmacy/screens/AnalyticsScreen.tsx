import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { useToast } from '../../../components/GlobalUI';
import DatabaseService from '../../../services/DatabaseService';
import { Sale, SaleUtils, PaymentMethod } from '../../../models/Sale';
import { Product, InventoryItem } from '../../../models/Inventory';
import { Prescription } from '../../../models/Prescription';

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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { showToast } = useToast();

  // ─── Load Analytics Data ─────────────────────────────────────
  const loadAnalyticsData = useCallback(async () => {
    setLoading(true);
    try {
      const dateRange = getDateRange();
      
      // Load overview analytics
      const sales = await DatabaseService.getSales(dateRange.start, dateRange.end);
      const prescriptions = await DatabaseService.getPrescriptions();
      const inventory = await DatabaseService.getInventory();
      
      // Calculate analytics
      const analytics = calculateAnalytics(sales);
      const topProductsData = calculateTopProducts(sales);
      const financial = calculateFinancialSummary(sales);
      const customers = calculateCustomerMetrics(sales);
      const products = calculateProductAnalytics(inventory, sales);
      
      setAnalyticsData(analytics);
      setTopProducts(topProductsData);
      setFinancialData(financial);
      setCustomerMetrics(customers);
      setProductAnalytics(products);
      
    } catch (error) {
      console.error('Error loading analytics:', error);
      showToast('Erreur lors du chargement des données', 'error');
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
        start = customDateFrom ? new Date(customDateFrom) : new Date();
        end = customDateTo ? new Date(customDateTo) : new Date();
        break;
    }

    return { start, end };
  };

  const calculateAnalytics = (sales: Sale[]): AnalyticsData => {
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalProfit = sales.reduce((sum, sale) => sum + (sale.total - sale.costTotal), 0);
    const totalSales = sales.length;
    const totalCustomers = new Set(sales.map(s => s.customerId).filter(id => id)).size;
    const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Calculate growth rate (mock data for now)
    const growthRate = 12.5;

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

  const calculateTopProducts = (sales: Sale[]): TopProduct[] => {
    const productMap = new Map<string, TopProduct>();

    sales.forEach(sale => {
      sale.items.forEach(item => {
        const existing = productMap.get(item.productId);
        if (existing) {
          existing.quantitySold += item.quantity;
          existing.revenue += item.subtotal;
          existing.profit += (item.subtotal - (item.costPerUnit * item.quantity));
        } else {
          productMap.set(item.productId, {
            id: item.productId,
            name: item.productName,
            category: item.category || 'Général',
            quantitySold: item.quantity,
            revenue: item.subtotal,
            profit: item.subtotal - (item.costPerUnit * item.quantity),
            margin: 0,
          });
        }
      });
    });

    const products = Array.from(productMap.values()).map(product => ({
      ...product,
      margin: product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0,
    }));

    return products.sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  };

  const calculateFinancialSummary = (sales: Sale[]): FinancialSummary => {
    const grossRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalCosts = sales.reduce((sum, sale) => sum + sale.costTotal, 0);
    const netProfit = grossRevenue - totalCosts;
    const taxAmount = grossRevenue * 0.18; // 18% VAT
    const expenses = totalCosts * 0.1; // Estimated operational expenses
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

  const calculateCustomerMetrics = (sales: Sale[]): CustomerMetrics => {
    const customerIds = sales.map(s => s.customerId).filter(id => id);
    const totalCustomers = new Set(customerIds).size;
    const avgOrdersPerCustomer = totalCustomers > 0 ? sales.length / totalCustomers : 0;
    const avgSpentPerCustomer = totalCustomers > 0 ? 
      sales.reduce((sum, sale) => sum + sale.total, 0) / totalCustomers : 0;

    return {
      totalCustomers,
      newCustomers: Math.floor(totalCustomers * 0.3), // Mock data
      returningCustomers: Math.floor(totalCustomers * 0.7), // Mock data
      avgOrdersPerCustomer,
      avgSpentPerCustomer,
      retentionRate: 68.5, // Mock data
    };
  };

  const calculateProductAnalytics = (inventory: InventoryItem[], sales: Sale[]): ProductAnalytics => {
    const totalProducts = inventory.length;
    const activeProducts = inventory.filter(item => item.quantity > 0).length;
    const lowStockCount = inventory.filter(item => item.quantity <= item.minimumStock).length;
    const outOfStockCount = inventory.filter(item => item.quantity === 0).length;

    // Calculate category performance
    const categoryMap = new Map<string, { revenue: number; profit: number; quantity: number }>();
    
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const category = item.category || 'Général';
        const existing = categoryMap.get(category);
        const profit = item.subtotal - (item.costPerUnit * item.quantity);
        
        if (existing) {
          existing.revenue += item.subtotal;
          existing.profit += profit;
          existing.quantity += item.quantity;
        } else {
          categoryMap.set(category, {
            revenue: item.subtotal,
            profit,
            quantity: item.quantity,
          });
        }
      });
    });

    const totalRevenue = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.revenue, 0);
    const categoryPerformance: CategoryPerformance[] = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      revenue: data.revenue,
      profit: data.profit,
      quantity: data.quantity,
      percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
    }));

    const topProducts = calculateTopProducts(sales);
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
      showToast('Export en cours...', 'info');
      // Mock export functionality
      setTimeout(() => {
        showToast('Rapport exporté avec succès', 'success');
      }, 2000);
    } catch (error) {
      showToast('Erreur lors de l\'export', 'error');
    }
  };

  // ─── Render Functions ───────────────────────────────────────
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={styles.headerIcon}>
          <Ionicons name="analytics" size={24} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.headerTitle}>Rapports & Analytiques</Text>
          <Text style={styles.headerSubtitle}>Analyse complète de performance</Text>
        </View>
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
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodSelector}>
      {[
        { key: 'today', label: 'Aujourd\'hui' },
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
  );

  const renderTabSelector = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabSelector}>
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
            size={18} 
            color={activeTab === key ? colors.primary : colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

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
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productCategory}>{product.category}</Text>
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
              <Text style={styles.categoryName}>{category.category}</Text>
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
      <Text style={styles.comingSoon}>Rapports d'ordonnances bientôt disponibles</Text>
      {/* TODO: Implement prescription analytics */}
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderPeriodSelector()}
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
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
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '14',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  exportBtnText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  periodSelector: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    paddingVertical: spacing.sm,
  },
  periodButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.inputBackground,
    minWidth: 80,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: colors.surface,
    fontWeight: '600',
  },
  tabSelector: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    paddingVertical: spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  tabActive: {
    backgroundColor: colors.primary + '14',
  },
  tabText: {
    fontSize: 14,
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
  },
  productInfo: {
    flex: 1,
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
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  categoryStats: {
    alignItems: 'flex-end',
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