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
import { colors } from '../../../theme/theme';
import { commonStyles } from '../../../theme/commonStyles';
import DatabaseService from '../../../services/DatabaseService';
import { Sale, SaleUtils, PaymentMethod } from '../../../models/Sale';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface TopProduct {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
  costTotal: number;
  margin: number;
}

interface PaymentBreakdown {
  method: PaymentMethod;
  label: string;
  amount: number;
  count: number;
  percentage: number;
}

interface DailyStat {
  date: string;
  label: string;
  revenue: number;
  transactions: number;
  itemsSold: number;
}

type DateRange = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all';
type TabView = 'overview' | 'products' | 'payments' | 'trends';

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const fc = (amount: number) =>
  amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';

const getDateRange = (range: DateRange) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (range) {
    case 'today':
      return { start: today, end: new Date(today.getTime() + 86400000) };
    case 'week': {
      const ws = new Date(today);
      ws.setDate(today.getDate() - today.getDay() + 1); // Monday
      const we = new Date(ws);
      we.setDate(ws.getDate() + 7);
      return { start: ws, end: we };
    }
    case 'month':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      };
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3);
      return {
        start: new Date(now.getFullYear(), q * 3, 1),
        end: new Date(now.getFullYear(), q * 3 + 3, 1),
      };
    }
    case 'year':
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear() + 1, 0, 1),
      };
    default:
      return { start: new Date('2020-01-01'), end: now };
  }
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  COMPONENT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export function SalesReportsScreen() {
  const db = DatabaseService.getInstance();
  const [selectedRange, setSelectedRange] = useState<DateRange>('month');
  const [activeTab, setActiveTab] = useState<TabView>('overview');
  const [loading, setLoading] = useState(true);

  // Computed data
  const [sales, setSales] = useState<Sale[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [totalItemsSold, setTotalItemsSold] = useState(0);
  const [avgOrderValue, setAvgOrderValue] = useState(0);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);

  // â”€â”€â”€ Load data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const org = await db.getCurrentOrganization();
      if (!org) { setLoading(false); return; }

      const { start, end } = getDateRange(selectedRange);

      const allSales = await db.getSalesByOrganization(org.id, {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });

      // Only completed sales
      const completed = allSales.filter(s => s.status === 'COMPLETED');
      setSales(completed);

      // â”€â”€ Aggregate Metrics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      let revenue = 0;
      let cost = 0;
      let itemCount = 0;
      const productMap: Record<string, TopProduct> = {};
      const payMap: Record<string, { amount: number; count: number }> = {};
      const dayMap: Record<string, DailyStat> = {};

      for (const sale of completed) {
        revenue += sale.totalAmount;

        // Items
        for (const item of sale.items) {
          itemCount += item.quantity;
          const itemCost = item.costPrice * item.quantity;
          cost += itemCost;

          // Product aggregation
          if (!productMap[item.productId]) {
            productMap[item.productId] = {
              productId: item.productId,
              productName: item.productName,
              quantitySold: 0,
              revenue: 0,
              costTotal: 0,
              margin: 0,
            };
          }
          productMap[item.productId].quantitySold += item.quantity;
          productMap[item.productId].revenue += item.lineTotal;
          productMap[item.productId].costTotal += itemCost;
        }

        // Payment methods
        for (const p of sale.payments) {
          const key = p.method;
          if (!payMap[key]) payMap[key] = { amount: 0, count: 0 };
          payMap[key].amount += p.amount;
          payMap[key].count += 1;
        }

        // Daily aggregation
        const dayKey = sale.createdAt.slice(0, 10); // YYYY-MM-DD
        if (!dayMap[dayKey]) {
          dayMap[dayKey] = {
            date: dayKey,
            label: new Date(dayKey).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
            revenue: 0,
            transactions: 0,
            itemsSold: 0,
          };
        }
        dayMap[dayKey].revenue += sale.totalAmount;
        dayMap[dayKey].transactions += 1;
        dayMap[dayKey].itemsSold += sale.items.reduce((s, i) => s + i.quantity, 0);
      }

      setTotalRevenue(revenue);
      setTotalCost(cost);
      setTotalItemsSold(itemCount);
      setAvgOrderValue(completed.length > 0 ? revenue / completed.length : 0);

      // Top products sorted by revenue
      const sortedProducts = Object.values(productMap)
        .map(p => ({ ...p, margin: p.revenue > 0 ? ((p.revenue - p.costTotal) / p.revenue) * 100 : 0 }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
      setTopProducts(sortedProducts);

      // Payment breakdown
      const payArr: PaymentBreakdown[] = Object.entries(payMap)
        .map(([method, data]) => ({
          method: method as PaymentMethod,
          label: SaleUtils.getPaymentMethodLabel(method as PaymentMethod),
          amount: data.amount,
          count: data.count,
          percentage: revenue > 0 ? (data.amount / revenue) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);
      setPaymentBreakdown(payArr);

      // Daily stats sorted by date
      const sortedDays = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
      setDailyStats(sortedDays);

    } catch (err) {
      console.error('Error loading sales data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedRange]);

  useEffect(() => { loadData(); }, [loadData]);

  // â”€â”€â”€ Max value for bar chart scaling â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const maxDailyRevenue = Math.max(...dailyStats.map(d => d.revenue), 1);

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  //  RENDER
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  if (loading) {
    return (
      <View style={st.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={st.centerText}>Chargement des rapports…</Text>
      </View>
    );
  }

  return (
    <View style={st.root}>
      {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <View style={st.header}>
        <View style={st.headerRow}>
          <Ionicons name="bar-chart" size={24} color={colors.primary} />
          <View style={{ marginLeft: 12 }}>
            <Text style={st.headerTitle}>Rapports de Ventes</Text>
            <Text style={st.headerSub}>Analyses détaillées des performances commerciales</Text>
          </View>
        </View>
      </View>

      {/* â”€â”€ Date Range Pills â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <View style={st.pillBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
          {([
            ['today', "Aujourd'hui"],
            ['week', 'Cette semaine'],
            ['month', 'Ce mois'],
            ['quarter', 'Trimestre'],
            ['year', 'Année'],
            ['all', 'Tout'],
          ] as [DateRange, string][]).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              onPress={() => setSelectedRange(key)}
              style={[st.pill, selectedRange === key && st.pillActive]}
            >
              <Text style={[st.pillText, selectedRange === key && st.pillTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* â”€â”€ Tab Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <View style={st.pillBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
          {([
            ['overview', "Vue d'ensemble", 'grid-outline'],
            ['products', 'Top Produits', 'cube-outline'],
            ['payments', 'Paiements', 'card-outline'],
            ['trends', 'Tendances', 'trending-up-outline'],
          ] as [TabView, string, string][]).map(([key, label, icon]) => (
            <TouchableOpacity
              key={key}
              onPress={() => setActiveTab(key)}
              style={[st.tab, activeTab === key && st.tabActive]}
            >
              <Ionicons name={icon as any} size={16} color={activeTab === key ? colors.onPrimary : colors.textSecondary} />
              <Text style={[st.tabText, activeTab === key && st.tabTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* â”€â”€ Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <ScrollView style={st.scroll} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>

        {/* â•â•â• OVERVIEW â•â•â• */}
        {activeTab === 'overview' && (
          <>
            {/* KPI Cards */}
            <View style={st.kpiGrid}>
              <KPICard icon="receipt-outline" color={colors.primary} value={sales.length.toString()} label="Transactions" />
              <KPICard icon="cube-outline" color={colors.success} value={totalItemsSold.toString()} label="Articles Vendus" />
              <KPICard icon="cash-outline" color={colors.info} value={fc(totalRevenue)} label="Chiffre d'Affaires" />
              <KPICard icon="analytics-outline" color={colors.warning} value={fc(avgOrderValue)} label="Panier Moyen" />
            </View>

            {/* Profit Row */}
            <View style={st.profitRow}>
              <View style={[st.profitCard, { borderLeftColor: colors.success }]}>
                <Text style={st.profitLabel}>Marge Brute</Text>
                <Text style={[st.profitValue, { color: colors.success }]}>{fc(totalRevenue - totalCost)}</Text>
              </View>
              <View style={[st.profitCard, { borderLeftColor: colors.error }]}>
                <Text style={st.profitLabel}>Coût Total</Text>
                <Text style={[st.profitValue, { color: colors.error }]}>{fc(totalCost)}</Text>
              </View>
              <View style={[st.profitCard, { borderLeftColor: colors.info }]}>
                <Text style={st.profitLabel}>% Marge</Text>
                <Text style={[st.profitValue, { color: colors.info }]}>
                  {totalRevenue > 0 ? (((totalRevenue - totalCost) / totalRevenue) * 100).toFixed(1) : '0.0'}%
                </Text>
              </View>
            </View>

            {/* Quick Top 5 */}
            {topProducts.length > 0 && (
              <View style={st.section}>
                <Text style={st.sectionTitle}>Top 5 Produits</Text>
                {topProducts.slice(0, 5).map((p, i) => (
                  <View key={p.productId} style={st.quickRow}>
                    <View style={[st.rankBadge, { backgroundColor: i < 3 ? colors.primary : colors.outline }]}>
                      <Text style={st.rankText}>{i + 1}</Text>
                    </View>
                    <Text style={st.quickName} numberOfLines={1}>{p.productName}</Text>
                    <Text style={st.quickVal}>{fc(p.revenue)}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* No Data */}
            {sales.length === 0 && (
              <View style={st.emptyState}>
                <Ionicons name="receipt-outline" size={48} color={colors.textSecondary} />
                <Text style={st.emptyTitle}>Aucune vente pour cette période</Text>
                <Text style={st.emptySub}>Sélectionnez une autre plage de dates</Text>
              </View>
            )}
          </>
        )}

        {/* â•â•â• TOP PRODUCTS â•â•â• */}
        {activeTab === 'products' && (
          <View style={st.section}>
            <Text style={st.sectionTitle}>Top Produits par Chiffre d'Affaires</Text>
            {topProducts.length === 0 && (
              <View style={st.emptyState}>
                <Ionicons name="cube-outline" size={48} color={colors.textSecondary} />
                <Text style={st.emptyTitle}>Aucun produit vendu</Text>
              </View>
            )}
            {topProducts.map((p, i) => (
              <View key={p.productId} style={st.productCard}>
                <View style={[st.rankBadge, { backgroundColor: i < 3 ? colors.primary : colors.textSecondary }]}>
                  <Text style={st.rankText}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.productName}>{p.productName}</Text>
                  <View style={st.productMeta}>
                    <Text style={st.productMetaText}>
                      Qté: {p.quantitySold}
                    </Text>
                    <Text style={st.productMetaText}>
                      Coût: {fc(p.costTotal)}
                    </Text>
                    <Text style={[st.productMetaText, { color: p.margin >= 30 ? colors.success : colors.warning }]}>
                      Marge: {p.margin.toFixed(1)}%
                    </Text>
                  </View>
                </View>
                <Text style={st.productRevenue}>{fc(p.revenue)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* â•â•â• PAYMENTS â•â•â• */}
        {activeTab === 'payments' && (
          <View style={st.section}>
            <Text style={st.sectionTitle}>Répartition par Mode de Paiement</Text>
            {paymentBreakdown.length === 0 && (
              <View style={st.emptyState}>
                <Ionicons name="card-outline" size={48} color={colors.textSecondary} />
                <Text style={st.emptyTitle}>Aucun paiement enregistré</Text>
              </View>
            )}
            {paymentBreakdown.map(p => {
              const pctWidth = `${Math.max(p.percentage, 2)}%`;
              return (
                <View key={p.method} style={st.payCard}>
                  <View style={st.payHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name={SaleUtils.getPaymentMethodIcon(p.method) as any} size={20} color={colors.primary} />
                      <Text style={st.payLabel}>{p.label}</Text>
                    </View>
                    <Text style={st.payPct}>{p.percentage.toFixed(1)}%</Text>
                  </View>
                  <View style={st.payBarBg}>
                    <View style={[st.payBarFill, { width: pctWidth as any }]} />
                  </View>
                  <View style={st.payFooter}>
                    <Text style={st.payAmount}>{fc(p.amount)}</Text>
                    <Text style={st.payCount}>{p.count} transactions</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* â•â•â• TRENDS â•â•â• */}
        {activeTab === 'trends' && (
          <View style={st.section}>
            <Text style={st.sectionTitle}>Évolution des Ventes</Text>
            {dailyStats.length === 0 && (
              <View style={st.emptyState}>
                <Ionicons name="trending-up-outline" size={48} color={colors.textSecondary} />
                <Text style={st.emptyTitle}>Pas de données pour cette période</Text>
              </View>
            )}
            {dailyStats.length > 0 && (
              <View style={st.chartCard}>
                <Text style={st.chartTitle}>Ventes Quotidiennes</Text>
                {dailyStats.map(day => {
                  const pct = (day.revenue / maxDailyRevenue) * 100;
                  return (
                    <View key={day.date} style={st.chartRow}>
                      <Text style={st.chartDate}>{day.label}</Text>
                      <View style={st.chartBarBg}>
                        <View style={[st.chartBarFill, { width: `${Math.max(pct, 1)}%` as any }]} />
                      </View>
                      <View style={st.chartVals}>
                        <Text style={st.chartRevenue}>{fc(day.revenue)}</Text>
                        <Text style={st.chartTx}>{day.transactions} tx</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Summary table */}
            {dailyStats.length > 0 && (
              <View style={st.summaryCard}>
                <Text style={st.chartTitle}>Résumé de la Période</Text>
                <View style={st.summaryRow}>
                  <Text style={st.summaryLabel}>Jours avec ventes</Text>
                  <Text style={st.summaryValue}>{dailyStats.length}</Text>
                </View>
                <View style={st.summaryRow}>
                  <Text style={st.summaryLabel}>Meilleur jour</Text>
                  <Text style={st.summaryValue}>
                    {dailyStats.reduce((best, d) => d.revenue > best.revenue ? d : best, dailyStats[0]).label} — {fc(maxDailyRevenue)}
                  </Text>
                </View>
                <View style={st.summaryRow}>
                  <Text style={st.summaryLabel}>Moyenne / jour</Text>
                  <Text style={st.summaryValue}>
                    {fc(totalRevenue / dailyStats.length)}
                  </Text>
                </View>
                <View style={[st.summaryRow, { borderBottomWidth: 0 }]}>
                  <Text style={st.summaryLabel}>Articles / jour (moy.)</Text>
                  <Text style={st.summaryValue}>
                    {(totalItemsSold / dailyStats.length).toFixed(1)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// â”€â”€â”€ Small KPI card component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function KPICard({ icon, color, value, label }: { icon: string; color: string; value: string; label: string }) {
  return (
    <View style={st.kpiCard}>
      <Ionicons name={icon as any} size={24} color={color} />
      <Text style={st.kpiValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={st.kpiLabel}>{label}</Text>
    </View>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  STYLES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  centerText: { marginTop: 12, fontSize: 14, color: colors.textSecondary },

  // Header
  header: { backgroundColor: colors.surface, paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.outline },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  headerSub: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },

  // Pill bar
  pillBar: { backgroundColor: colors.surface, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.outline },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.background, marginRight: 8, borderWidth: 1, borderColor: colors.outline },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  pillTextActive: { color: colors.surface },

  // Tab bar
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: colors.background, marginRight: 8 },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary, marginLeft: 6 },
  tabTextActive: { color: colors.surface },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20 },

  // KPI Grid
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
    flexBasis: isDesktop ? '23%' : '47%',
    flexGrow: 1,
  },
  kpiValue: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 8, marginBottom: 4 },
  kpiLabel: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },

  // Profit row
  profitRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  profitCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.outline, borderLeftWidth: 4 },
  profitLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  profitValue: { fontSize: 18, fontWeight: '700' },

  // Section
  section: { marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 16, marginTop: 8 },

  // Quick top-5 (overview)
  quickRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.outline },
  rankBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  rankText: { color: colors.surface, fontWeight: '700', fontSize: 13 },
  quickName: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '500' },
  quickVal: { fontSize: 14, fontWeight: '600', color: colors.success },

  // Product cards
  productCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.outline },
  productName: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 4 },
  productMeta: { flexDirection: 'row', gap: 12 },
  productMetaText: { fontSize: 12, color: colors.textSecondary },
  productRevenue: { fontSize: 16, fontWeight: '700', color: colors.success, marginLeft: 12 },

  // Payment cards
  payCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.outline },
  payHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  payLabel: { fontSize: 15, fontWeight: '600', color: colors.text, marginLeft: 8 },
  payPct: { fontSize: 15, fontWeight: '700', color: colors.primary },
  payBarBg: { height: 8, backgroundColor: colors.background, borderRadius: 4, overflow: 'hidden' },
  payBarFill: { height: 8, backgroundColor: colors.primary, borderRadius: 4 },
  payFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  payAmount: { fontSize: 14, fontWeight: '600', color: colors.text },
  payCount: { fontSize: 12, color: colors.textSecondary },

  // Chart
  chartCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.outline, marginBottom: 16 },
  chartTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 16 },
  chartRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  chartDate: { width: 50, fontSize: 12, color: colors.textSecondary },
  chartBarBg: { flex: 1, height: 20, backgroundColor: colors.background, borderRadius: 10, overflow: 'hidden', marginHorizontal: 10 },
  chartBarFill: { height: 20, backgroundColor: colors.primary, borderRadius: 10 },
  chartVals: { alignItems: 'flex-end', minWidth: 80 },
  chartRevenue: { fontSize: 12, fontWeight: '600', color: colors.text },
  chartTx: { fontSize: 10, color: colors.textSecondary },

  // Summary
  summaryCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.outline },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.outline },
  summaryLabel: { fontSize: 14, color: colors.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: '600', color: colors.text },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 48, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.outline },
  emptyTitle: { fontSize: 16, color: colors.textSecondary, marginTop: 12, fontWeight: '500' },
  emptySub: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
});
