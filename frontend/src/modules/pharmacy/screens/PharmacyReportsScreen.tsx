import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { useToast } from '../../../components/GlobalUI';
import DatabaseService from '../../../services/DatabaseService';
import ApiService from '../../../services/ApiService';
import { AnalyticsScreen } from './AnalyticsScreen';
import DataService from '../../../services/DataService';

const { width: SCREEN_W } = Dimensions.get('window');
const IS_DESKTOP = SCREEN_W >= 1024;

// ═══════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════

type ReportType = 'sales' | 'inventory' | 'prescriptions' | 'financial' | 'compliance' | 'analytics';

interface QuickReport {
  id: string;
  title: string;
  subtitle: string;
  type: ReportType;
  icon: string;
  color: string;
  period: 'today' | 'week' | 'month' | 'quarter' | 'year';
  isReady: boolean;
  lastGenerated?: string;
}

interface ReportData {
  title: string;
  period: string;
  generatedAt: string;
  sections: ReportSection[];
}

interface ReportSection {
  title: string;
  type: 'summary' | 'chart' | 'table' | 'metric';
  data: any;
}

interface ComplianceAlert {
  id: string;
  type: 'expiry' | 'recall' | 'license' | 'documentation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  dueDate?: string;
  action?: string;
}

// ═══════════════════════════════════════════════════════════════
// PHARMACY REPORTS SCREEN
// ═══════════════════════════════════════════════════════════════

export function PharmacyReportsScreen() {
  // State Management
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'quick' | 'analytics' | 'compliance'>('quick');
  const [quickReports, setQuickReports] = useState<QuickReport[]>([]);
  const [complianceAlerts, setComplianceAlerts] = useState<ComplianceAlert[]>([]);
  const [generatingReportId, setGeneratingReportId] = useState<string | null>(null);
  
  const toast = useToast();

  const formatCdf = useCallback((amount: number) => {
    return new Intl.NumberFormat('fr-CD', {
      style: 'currency',
      currency: 'CDF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  // ─── Data Loading ───────────────────────────────────────────
  const loadReportsData = useCallback(async () => {
    setLoading(true);
    try {
      // Load quick reports templates
      const reports: QuickReport[] = [
        {
          id: 'daily-sales',
          title: 'Ventes Journalières',
          subtitle: 'Résumé des ventes d\'aujourd\'hui',
          type: 'sales',
          icon: 'trending-up',
          color: colors.success,
          period: 'today',
          isReady: true,
        },
        {
          id: 'weekly-inventory',
          title: 'État Stock Hebdomadaire',
          subtitle: 'Suivi des stocks cette semaine',
          type: 'inventory',
          icon: 'cube',
          color: colors.primary,
          period: 'week',
          isReady: true,
          lastGenerated: '2024-01-15 09:30',
        },
        {
          id: 'monthly-prescriptions',
          title: 'Ordonnances Mensuelles',
          subtitle: 'Rapport mensuel des ordonnances',
          type: 'prescriptions',
          icon: 'document-text',
          color: colors.info,
          period: 'month',
          isReady: true,
          lastGenerated: '2024-01-10 14:20',
        },
        {
          id: 'quarterly-financial',
          title: 'Rapport Financier Trimestriel',
          subtitle: 'Performance financière Q1 2024',
          type: 'financial',
          icon: 'bar-chart',
          color: colors.warning,
          period: 'quarter',
          isReady: false,
        },
        {
          id: 'annual-compliance',
          title: 'Conformité Annuelle',
          subtitle: 'Rapport de conformité 2024',
          type: 'compliance',
          icon: 'shield-checkmark',
          color: colors.error,
          period: 'year',
          isReady: true,
        },
        {
          id: 'custom-analytics',
          title: 'Analytics Personnalisées',
          subtitle: 'Tableaux de bord avancés',
          type: 'analytics',
          icon: 'analytics',
          color: colors.secondary,
          period: 'month',
          isReady: true,
        },
      ];

      // Load compliance alerts from backend
      const api = ApiService.getInstance();
      const [statsRes, expiringRes, lowStockRes] = await Promise.all([
        api.get('/inventory/reports/stats/'),
        api.get('/inventory/reports/expiring/', { days: 30 }),
        api.get('/inventory/reports/low-stock/'),
      ]);
      const stats = statsRes?.data ?? {};
      const expiringCount: number = expiringRes?.data?.count ?? 0;
      const lowStockCount: number = lowStockRes?.data?.count ?? 0;
      const activeAlerts: number = stats.active_alerts ?? 0;
      const outOfStockCount: number = stats.out_of_stock_count ?? 0;

      const alerts: ComplianceAlert[] = [];
      if (expiringCount > 0) {
        alerts.push({
          id: 'exp-001',
          type: 'expiry',
          severity: expiringCount > 10 ? 'high' : 'medium',
          title: `${expiringCount} médicament${expiringCount !== 1 ? 's' : ''} expireront dans 30 jours`,
          description: 'Médicaments expirant dans les 30 prochains jours',
          action: 'Vérifier et retirer du stock',
        });
      }
      if (outOfStockCount > 0) {
        alerts.push({
          id: 'oos-001',
          type: 'documentation',
          severity: outOfStockCount > 5 ? 'high' : 'medium',
          title: `${outOfStockCount} produit${outOfStockCount !== 1 ? 's' : ''} en rupture de stock`,
          description: 'Produits dont le stock est à zéro',
          action: 'Passer des commandes de réapprovisionnement',
        });
      }
      if (lowStockCount > 0) {
        alerts.push({
          id: 'low-001',
          type: 'documentation',
          severity: 'low',
          title: `${lowStockCount} produit${lowStockCount !== 1 ? 's' : ''} en stock bas`,
          description: 'Produits en dessous du seuil de réapprovisionnement',
          action: 'Planifier le réapprovisionnement',
        });
      }
      if (activeAlerts > 0) {
        alerts.push({
          id: 'alrt-001',
          type: 'license',
          severity: activeAlerts > 10 ? 'high' : 'medium',
          title: `${activeAlerts} alerte${activeAlerts !== 1 ? 's' : ''} de stock active${activeAlerts !== 1 ? 's' : ''}`,
          description: 'Alertes de stock nécessitant attention',
          action: 'Consulter les alertes de stock',
        });
      }

      setQuickReports(reports);
      setComplianceAlerts(alerts);

      const db = DatabaseService.getInstance();
      await db.savePharmacyReportsCache({ reports, alerts });
    } catch (error) {
      console.error('Error loading reports data:', error);
      try {
        const db = DatabaseService.getInstance();
        const cached = await db.getPharmacyReportsCache();
        if (cached?.payload) {
          setQuickReports(cached.payload.reports ?? []);
          setComplianceAlerts(cached.payload.alerts ?? []);
          toast.warning('Mode hors ligne: rapports locaux chargés');
        } else {
          toast.error('Erreur lors du chargement des rapports');
        }
      } catch {
        toast.error('Erreur lors du chargement des rapports');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReportsData();
  }, [loadReportsData]);

  // ─── Report Generation ──────────────────────────────────────
  const generateReport = async (report: QuickReport) => {
    setGeneratingReportId(report.id);
    
    try {
      toast.info(`Génération du rapport "${report.title}"...`);

      const reportData = await generateReportData(report);
      
      toast.success(`Rapport "${report.title}" généré avec succès`);
      
      // Update last generated time
      setQuickReports(prev => 
        prev.map(r => 
          r.id === report.id 
            ? { ...r, lastGenerated: new Date().toLocaleString('fr-FR') }
            : r
        )
      );
      
      exportReport(reportData);
      
    } catch (error) {
      toast.error('Erreur lors de la génération du rapport');
    } finally {
      setGeneratingReportId(null);
    }
  };

  const generateReportData = async (report: QuickReport): Promise<ReportData> => {
    const dataService = DataService.getInstance();
    const overviewRes = await dataService.getPharmacyReportsOverview();
    const salesDetailsRes = await dataService.getPharmacySalesReports();

    const overview = overviewRes?.data ?? {};
    const salesDetails = salesDetailsRes?.data ?? {};
    const salesStats = overview.sales ?? {};
    const rxStats = overview.prescriptions ?? {};
    const inventoryStats = overview.inventory ?? {};
    const alertsStats = overview.alerts ?? {};

    const lowStockCount = Number(alertsStats.medium ?? 0) + Number(alertsStats.low ?? 0);
    const expiringCount = Number(rxStats.expired ?? 0);
    const totalRevenue = Number(salesStats.total_revenue ?? salesStats.today_sales_amount ?? 0);
    const totalTransactions = Number(salesStats.total_sales ?? salesStats.today_sales_count ?? 0);
    const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    return {
      title: report.title,
      period: getPeriodLabel(report.period),
      generatedAt: new Date().toLocaleString('fr-FR'),
      sections: [
        {
          title: 'Résumé Exécutif',
          type: 'summary',
          data: {
            totalRevenue: formatCdf(totalRevenue),
            totalTransactions,
            averageOrderValue: formatCdf(averageOrderValue),
            growthRate: 'N/A',
          },
        },
        {
          title: 'Conformité & Stock',
          type: 'metric',
          data: {
            lowStockCount,
            expiringCount,
            activeAlerts: Number(alertsStats.total ?? 0),
            outOfStockCount: Number(inventoryStats.out_of_stock ?? inventoryStats.out_of_stock_count ?? 0),
          },
        },
        {
          title: 'Ordonnances',
          type: 'table',
          data: {
            headers: ['Métrique', 'Valeur'],
            rows: [
              ['Total ordonnances', `${Number(rxStats.total_prescriptions ?? rxStats.total ?? 0)}`],
              ['En attente', `${Number(rxStats.pending ?? rxStats.pending_count ?? 0)}`],
              ['Terminées', `${Number(rxStats.completed ?? rxStats.completed_count ?? 0)}`],
              ['Expirées', `${Number(rxStats.expired ?? rxStats.expired_count ?? 0)}`],
            ],
          },
        },
        {
          title: 'Tendances Journalières',
          type: 'chart',
          data: salesDetails.daily_trends ?? [],
        },
      ],
    };
  };

  const exportReport = async (reportData: ReportData) => {
    Alert.alert(
      'Export Rapport',
      'Dans quel format souhaitez-vous exporter ce rapport ?',
      [
        { text: 'PDF', onPress: () => exportToPDF(reportData) },
        { text: 'Excel', onPress: () => exportToExcel(reportData) },
        { text: 'Imprimer', onPress: () => printReport(reportData) },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const exportToPDF = async (reportData: ReportData) => {
    toast.success(`Rapport "${reportData.title}" prêt pour export PDF`);
  };

  const exportToExcel = async (reportData: ReportData) => {
    toast.success(`Rapport "${reportData.title}" prêt pour export Excel`);
  };

  const printReport = async (reportData: ReportData) => {
    toast.success(`Rapport "${reportData.title}" prêt pour impression`);
  };

  // ─── Utility Functions ──────────────────────────────────────
  const getPeriodLabel = (period: string): string => {
    switch (period) {
      case 'today': return 'Aujourd\'hui';
      case 'week': return 'Cette semaine';
      case 'month': return 'Ce mois';
      case 'quarter': return 'Ce trimestre';
      case 'year': return 'Cette année';
      default: return period;
    }
  };

  const getReportTypeIcon = (type: ReportType): string => {
    switch (type) {
      case 'sales': return 'trending-up';
      case 'inventory': return 'cube';
      case 'prescriptions': return 'document-text';
      case 'financial': return 'bar-chart';
      case 'compliance': return 'shield-checkmark';
      case 'analytics': return 'analytics';
      default: return 'document';
    }
  };

  const getAlertSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return colors.error;
      case 'high': return colors.error;
      case 'medium': return colors.warning;
      case 'low': return colors.info;
      default: return colors.textSecondary;
    }
  };

  const getAlertIcon = (type: string): string => {
    switch (type) {
      case 'expiry': return 'time';
      case 'recall': return 'warning';
      case 'license': return 'document-text';
      case 'documentation': return 'folder';
      default: return 'alert-circle';
    }
  };

  // ─── Render Functions ───────────────────────────────────────
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={styles.headerIcon}>
          <Ionicons name="document" size={24} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.headerTitle}>Rapports Pharmacie</Text>
          <Text style={styles.headerSubtitle}>
            Génération et analyse des rapports
          </Text>
        </View>
      </View>
      
      <TouchableOpacity style={styles.headerButton} onPress={() => {}}>
        <Ionicons name="settings" size={16} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      {[
        { key: 'quick', label: 'Rapports Rapides', icon: 'flash' },
        { key: 'analytics', label: 'Analytics', icon: 'analytics' },
        { key: 'compliance', label: 'Conformité', icon: 'shield-checkmark' },
      ].map(({ key, label, icon }) => (
        <TouchableOpacity
          key={key}
          style={[styles.tab, activeTab === key && styles.activeTab]}
          onPress={() => setActiveTab(key as any)}
        >
          <Ionicons
            name={icon as any}
            size={16}
            color={activeTab === key ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === key && styles.activeTabText]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderQuickReports = () => (
    <ScrollView
      style={styles.content}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => {
          setRefreshing(true);
          loadReportsData();
        }} />
      }
    >
      <View style={styles.reportsGrid}>
        {quickReports.map((report) => (
          <TouchableOpacity
            key={report.id}
            style={styles.reportCard}
            onPress={() => generateReport(report)}
            disabled={generatingReportId === report.id}
            activeOpacity={0.7}
          >
            <View style={styles.reportCardHeader}>
              <View style={[styles.reportIcon, { backgroundColor: report.color + '14' }]}>
                <Ionicons name={report.icon as any} size={24} color={report.color} />
              </View>
              
              <View style={styles.reportStatus}>
                {report.isReady ? (
                  <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
                ) : (
                  <View style={[styles.statusDot, { backgroundColor: colors.warning }]} />
                )}
              </View>
            </View>

            <View style={styles.reportCardContent}>
              <Text style={styles.reportTitle}>{report.title}</Text>
              <Text style={styles.reportSubtitle}>{report.subtitle}</Text>
              
              <View style={styles.reportMeta}>
                <Text style={styles.reportPeriod}>{getPeriodLabel(report.period)}</Text>
                {report.lastGenerated && (
                  <Text style={styles.lastGenerated}>
                    Dernière génération: {report.lastGenerated}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.reportCardFooter}>
              {generatingReportId === report.id ? (
                <View style={styles.generatingIndicator}>
                  <ActivityIndicator size="small" color={report.color} />
                  <Text style={styles.generatingText}>Génération...</Text>
                </View>
              ) : (
                <View style={styles.generateButton}>
                  <Ionicons name="download" size={16} color={colors.textSecondary} />
                  <Text style={styles.generateButtonText}>Générer</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const renderAnalytics = () => (
    <View style={styles.analyticsContainer}>
      <AnalyticsScreen />
    </View>
  );

  const renderCompliance = () => (
    <ScrollView
      style={styles.content}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.complianceSection}>
        <Text style={styles.sectionTitle}>Alertes de Conformité</Text>
        <Text style={styles.sectionSubtitle}>
          Éléments nécessitant votre attention
        </Text>

        {complianceAlerts.map((alert) => (
          <View key={alert.id} style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <View style={[styles.alertIcon, { backgroundColor: getAlertSeverityColor(alert.severity) + '14' }]}>
                <Ionicons
                  name={getAlertIcon(alert.type) as any}
                  size={20}
                  color={getAlertSeverityColor(alert.severity)}
                />
              </View>
              
              <View style={styles.alertInfo}>
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={styles.alertDescription}>{alert.description}</Text>
              </View>
              
              <View style={[styles.severityBadge, { backgroundColor: getAlertSeverityColor(alert.severity) }]}>
                <Text style={styles.severityText}>{alert.severity.toUpperCase()}</Text>
              </View>
            </View>

            {alert.dueDate && (
              <View style={styles.alertMeta}>
                <Ionicons name="calendar" size={14} color={colors.textSecondary} />
                <Text style={styles.alertDueDate}>
                  Échéance: {new Date(alert.dueDate).toLocaleDateString('fr-FR')}
                </Text>
              </View>
            )}

            {alert.action && (
              <View style={styles.alertActions}>
                <TouchableOpacity style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>{alert.action}</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderTabs()}
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement des rapports...</Text>
        </View>
      ) : (
        <>
          {activeTab === 'quick' && renderQuickReports()}
          {activeTab === 'analytics' && renderAnalytics()}
          {activeTab === 'compliance' && renderCompliance()}
        </>
      )}
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
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    gap: spacing.xs,
  },
  activeTab: {
    backgroundColor: colors.primary + '14',
  },
  tabText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  reportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  reportCard: {
    width: IS_DESKTOP ? '32%' : '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  reportCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  reportIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportStatus: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  reportCardContent: {
    marginBottom: spacing.md,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  reportSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  reportMeta: {
    marginTop: spacing.sm,
  },
  reportPeriod: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  lastGenerated: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  reportCardFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    paddingTop: spacing.md,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  generateButtonText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  generatingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  generatingText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  analyticsContainer: {
    flex: 1,
  },
  complianceSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  alertCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  alertInfo: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  alertDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  severityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  severityText: {
    fontSize: 10,
    color: colors.surface,
    fontWeight: '700',
  },
  alertMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  alertDueDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  alertActions: {
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    paddingTop: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionButtonText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textSecondary,
  },
});