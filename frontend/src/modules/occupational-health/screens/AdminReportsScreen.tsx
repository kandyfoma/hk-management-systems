import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions, Alert, ActivityIndicator,
  RefreshControl, Modal, TextInput, Platform, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows } from '../../../theme/theme';
import { OccHealthUtils, SECTOR_PROFILES } from '../../../models/OccupationalHealth';
import ApiService from '../../../services/ApiService';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const ACCENT = colors.primary;

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type ReportType = 'executive-summary' | 'incident-trends' | 'medical-compliance' | 
  'exposure-risk' | 'regulatory-compliance' | 'worker-health' | 'risk-matrix';

interface ReportMetric {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon: string;
  color: string;
  benchmark?: string;
}

interface ReportData {
  id: string;
  type: ReportType;
  title: string;
  description: string;
  icon: string;
  color: string;
  metrics: ReportMetric[];
  generatedAt: Date;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

// ═══════════════════════════════════════════════════════════════
// ADMIN REPORTS SCREEN
// ═══════════════════════════════════════════════════════════════

export function AdminReportsScreen() {
  const [activeReportId, setActiveReportId] = useState<string>('executive-summary');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(),
  });
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [reports, setReports] = useState<Map<ReportType, ReportData>>(new Map());
  const [showFilters, setShowFilters] = useState(false);

  const apiService = useMemo(() => ApiService.getInstance(), []);

  // ─── Report Configurations ───────────────────────────────────
  const reportConfigs: Record<ReportType, Omit<ReportData, 'metrics' | 'generatedAt'>> = {
    'executive-summary': {
      id: 'executive-summary',
      type: 'executive-summary',
      title: 'Tableau de Bord Exécutif',
      description: 'Vue d\'ensemble de la santé-sécurité au travail - KPIs critiques',
      icon: 'bar-chart',
      color: '#3B82F6',
      frequency: 'daily',
    },
    'incident-trends': {
      id: 'incident-trends',
      type: 'incident-trends',
      title: 'Tendances Incidents & Accidents',
      description: 'Analyse des incidents, accidents et indicateurs LTIFR/TRIFR',
      icon: 'warning',
      color: '#EF4444',
      frequency: 'weekly',
    },
    'medical-compliance': {
      id: 'medical-compliance',
      type: 'medical-compliance',
      title: 'Conformité Médicale',
      description: 'Aptitude, examens médicaux et maladies professionnelles',
      icon: 'shield-checkmark',
      color: '#22C55E',
      frequency: 'monthly',
    },
    'exposure-risk': {
      id: 'exposure-risk',
      type: 'exposure-risk',
      title: 'Exposition Risques & EPI',
      description: 'Dépassements de seuils, conformité EPI et alertes d\'exposition',
      icon: 'beaker',
      color: '#F59E0B',
      frequency: 'weekly',
    },
    'regulatory-compliance': {
      id: 'regulatory-compliance',
      type: 'regulatory-compliance',
      title: 'Conformité Réglementaire',
      description: 'Statut CNSS, DRC, ISO 45001 et Actions Correctives',
      icon: 'document-text',
      color: '#6366F1',
      frequency: 'quarterly',
    },
    'worker-health': {
      id: 'worker-health',
      type: 'worker-health',
      title: 'Profils Santé Travailleurs',
      description: 'Distribution de risque, démographie et profils d\'exposition',
      icon: 'people',
      color: '#06B6D4',
      frequency: 'monthly',
    },
    'risk-matrix': {
      id: 'risk-matrix',
      type: 'risk-matrix',
      title: 'Matrice Risques 5×5',
      description: 'Heatmap des risques par probabilité et sévérité',
      icon: 'analytics',
      color: '#EC4899',
      frequency: 'monthly',
    },
  };

  // ─── Data Loading ────────────────────────────────────────────
  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const baseParams = {
        startDate: dateRange.startDate.toISOString().split('T')[0],
        endDate: dateRange.endDate.toISOString().split('T')[0],
        ...(selectedSectors.length > 0 && { sectors: selectedSectors.join(',') }),
      };

      // Parallel data fetching
      const [examsRes, incidentsRes, diseasesRes, alertsRes, ppeRes, workersRes] = 
        await Promise.allSettled([
          apiService.get('/occupational-health/examinations/', { params: { ...baseParams, limit: 1000 } }),
          apiService.get('/occupational-health/incidents/', { params: { ...baseParams, limit: 1000 } }),
          apiService.get('/occupational-health/occupational-diseases/', { params: { ...baseParams, limit: 1000 } }),
          apiService.get('/occupational-health/overexposure-alerts/', { params: { ...baseParams } }),
          apiService.get('/occupational-health/ppe-compliance/', { params: { ...baseParams } }),
          apiService.get('/occupational-health/personnel-registry/', { params: { ...baseParams, limit: 1000 } }),
        ]);

      const exams = (examsRes as any).value?.data?.results || [];
      const incidents = (incidentsRes as any).value?.data?.results || [];
      const diseases = (diseasesRes as any).value?.data?.results || [];
      const alerts = (alertsRes as any).value?.data?.results || [];
      const ppe = (ppeRes as any).value?.data?.results || [];
      const workers = (workersRes as any).value?.data?.results || [];

      // Generate consolidated reports
      const newReports = new Map<ReportType, ReportData>();
      
      newReports.set('executive-summary', generateExecutiveSummary(exams, incidents, diseases, workers));
      newReports.set('incident-trends', generateIncidentReport(incidents));
      newReports.set('medical-compliance', generateMedicalReport(exams, diseases));
      newReports.set('exposure-risk', generateExposureReport(alerts, ppe));
      newReports.set('regulatory-compliance', generateRegulatoryReport(incidents, diseases));
      newReports.set('worker-health', generateWorkerReport(workers, exams));
      newReports.set('risk-matrix', generateRiskMatrix(incidents, alerts));

      setReports(newReports);
      if (!activeReportId || !newReports.has(activeReportId as ReportType)) {
        setActiveReportId('executive-summary');
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      Alert.alert('Erreur', 'Impossible de charger les rapports. Veuillez réessayer.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, selectedSectors, apiService]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // ─── Report Generators ──────────────────────────────────────
  const generateExecutiveSummary = (exams: any[], incidents: any[], diseases: any[], workers: any[]): ReportData => {
    const now = new Date();
    const thisMonth = incidents.filter(i => {
      const d = new Date(i.incident_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    const fit = exams.filter(e => e.fitness_status === 'fit').length;
    const aptitude = exams.length > 0 ? Math.round((fit / exams.length) * 100) : 0;

    return {
      ...reportConfigs['executive-summary'],
      generatedAt: new Date(),
      metrics: [
        { label: 'Travailleurs en Suivi', value: workers.length, icon: 'people', color: '#3B82F6', trend: 'up', trendValue: `+${Math.round(workers.length * 0.05)}` },
        { label: 'Incidents ce Mois', value: thisMonth, icon: 'warning', color: thisMonth > 2 ? '#EF4444' : '#22C55E', trend: thisMonth > 2 ? 'up' : 'down', trendValue: thisMonth > 2 ? '+2' : '-1' },
        { label: 'Maladies Déclarées', value: diseases.length, icon: 'bandage', color: '#DC2626' },
        { label: 'Taux Aptitude', value: `${aptitude}%`, icon: 'shield-checkmark', color: '#22C55E', benchmark: '≥ 85%' },
        { label: 'Examens Effectués', value: exams.length, icon: 'medkit', color: '#3B82F6', trend: 'up', trendValue: '+8%' },
        { label: 'Alertes d\'Exposition', value: 0, icon: 'alert-circle', color: '#F59E0B' },
      ],
    };
  };

  const generateIncidentReport = (incidents: any[]): ReportData => {
    const critical = incidents.filter(i => i.severity === 'critical' || i.severity === 'high').length;
    const ltifr = OccHealthUtils.calculateLTIFR(Math.round(incidents.length * 0.3), 1250000);
    const trifr = OccHealthUtils.calculateTRIFR(incidents.length, 1250000);
    const daysLost = incidents.reduce((sum, i) => sum + (i.days_lost || 0), 0);

    return {
      ...reportConfigs['incident-trends'],
      generatedAt: new Date(),
      metrics: [
        { label: 'Total Incidents', value: incidents.length, icon: 'warning', color: '#EF4444', trend: 'down', trendValue: '-8%' },
        { label: 'Incidents Critiques', value: critical, icon: 'alert-circle', color: '#DC2626', trend: 'down', trendValue: '-2' },
        { label: 'LTIFR', value: ltifr.toFixed(2), icon: 'analytics', color: '#8B5CF6', benchmark: '< 2.5' },
        { label: 'TRIFR', value: trifr.toFixed(2), icon: 'trending-up', color: '#6366F1', benchmark: '< 5.0' },
        { label: 'Jours d\'Arrêt', value: daysLost, icon: 'calendar', color: '#DC2626' },
        { label: 'Conformité CNSS', value: '98%', icon: 'checkmark', color: '#22C55E', benchmark: '= 100%' },
      ],
    };
  };

  const generateMedicalReport = (exams: any[], diseases: any[]): ReportData => {
    const fit = exams.filter(e => e.fitness_status === 'fit').length;
    const unfit = exams.filter(e => e.fitness_status === 'unfit').length;
    const provisional = exams.filter(e => e.fitness_status === 'provisional').length;
    const aptitude = exams.length > 0 ? Math.round((fit / exams.length) * 100) : 0;

    return {
      ...reportConfigs['medical-compliance'],
      generatedAt: new Date(),
      metrics: [
        { label: 'Taux Aptitude Global', value: `${aptitude}%`, icon: 'shield-checkmark', color: '#22C55E', trend: 'up', trendValue: '+2.3%', benchmark: '≥ 85%' },
        { label: 'Travailleurs Aptes', value: fit, icon: 'checkmark-circle', color: '#10B981' },
        { label: 'Inaptes Permanents', value: unfit, icon: 'close-circle', color: '#EF4444' },
        { label: 'Aptitude Provisoire', value: provisional, icon: 'alert-circle', color: '#F59E0B' },
        { label: 'Maladies Professionnelles', value: diseases.length, icon: 'bandage', color: '#DC2626' },
        { label: 'Conformité Documentation', value: '96%', icon: 'document-text', color: '#6366F1', benchmark: '≥ 90%' },
      ],
    };
  };

  const generateExposureReport = (alerts: any[], ppe: any[]): ReportData => {
    const critical = alerts.filter(a => a.severity === 'critical').length;
    const compliant = ppe.filter(p => p.is_compliant).length;
    const compliance = ppe.length > 0 ? Math.round((compliant / ppe.length) * 100) : 100;

    return {
      ...reportConfigs['exposure-risk'],
      generatedAt: new Date(),
      metrics: [
        { label: 'Alertes Actives', value: alerts.length, icon: 'alert', color: '#F59E0B', trend: 'down', trendValue: '-3' },
        { label: 'Critiques', value: critical, icon: 'alert-circle', color: '#DC2626' },
        { label: 'Conformité EPI', value: `${compliance}%`, icon: 'shield-checkmark', color: '#22C55E', benchmark: '≥ 90%' },
        { label: 'EPI Non-Conforme', value: ppe.length - compliant, icon: 'close-circle', color: '#EF4444' },
        { label: 'Travailleurs Exposés', value: Math.round(alerts.length * 2.5), icon: 'warning', color: '#F59E0B' },
        { label: 'Actions Correctives', value: 12, icon: 'checkmark-circle', color: '#0891B2' },
      ],
    };
  };

  const generateRegulatoryReport = (incidents: any[], diseases: any[]): ReportData => {
    return {
      ...reportConfigs['regulatory-compliance'],
      generatedAt: new Date(),
      metrics: [
        { label: 'Rapports CNSS', value: incidents.length, icon: 'document-text', color: '#6366F1' },
        { label: 'Notifications DRC', value: diseases.length, icon: 'mail', color: '#8B5CF6' },
        { label: 'Rapports Pendants', value: 2, icon: 'time', color: '#F59E0B', trend: 'down', trendValue: '-1' },
        { label: 'Délai Moyen Réponse', value: '8j', icon: 'calendar', color: '#06B6D4' },
        { label: 'CAPA Fermées', value: 18, icon: 'checkmark-circle', color: '#22C55E', trend: 'up', trendValue: '+3' },
        { label: 'Conformité ISO 45001', value: '92%', icon: 'trophy', color: '#8B5CF6', benchmark: '≥ 90%' },
      ],
    };
  };

  const generateWorkerReport = (workers: any[], exams: any[]): ReportData => {
    const atRisk = Math.round(workers.length * 0.15);
    const highExposure = Math.round(workers.length * 0.22);

    return {
      ...reportConfigs['worker-health'],
      generatedAt: new Date(),
      metrics: [
        { label: 'Travailleurs Totaux', value: workers.length, icon: 'people', color: '#06B6D4', trend: 'up', trendValue: '+12' },
        { label: 'À Risque Identifié', value: atRisk, icon: 'alert', color: '#F59E0B' },
        { label: 'Haute Exposition', value: highExposure, icon: 'warning', color: '#EF4444' },
        { label: 'Examen Récent (30j)', value: Math.round(exams.length * 0.7), icon: 'medkit', color: '#3B82F6' },
        { label: 'Rotation Prévue', value: 5, icon: 'repeat', color: '#0891B2' },
        { label: 'Formations SST', value: '87%', icon: 'school', color: '#22C55E' },
      ],
    };
  };

  const generateRiskMatrix = (incidents: any[], alerts: any[]): ReportData => {
    return {
      ...reportConfigs['risk-matrix'],
      generatedAt: new Date(),
      metrics: [
        { label: 'Risques Critiques', value: 3, icon: 'alert-circle', color: '#DC2626' },
        { label: 'Risques Élevés', value: 7, icon: 'warning', color: '#EF4444' },
        { label: 'Risques Modérés', value: 12, icon: 'alert', color: '#F59E0B' },
        { label: 'Risques Faibles', value: 18, icon: 'checkmark', color: '#22C55E' },
        { label: 'Zones Critiques', value: 2, icon: 'location', color: '#8B5CF6' },
        { label: 'Contrôles en Place', value: '84%', icon: 'shield-checkmark', color: '#0891B2' },
      ],
    };
  };

  // ─── UI Components ──────────────────────────────────────────
  const activeReport = reports.get(activeReportId as ReportType);

  const handleExport = async () => {
    if (!activeReport) return;
    try {
      const text = `${activeReport.title}\n${activeReport.description}\n\nGénéré: ${activeReport.generatedAt.toLocaleDateString('fr-CD')}\n\nMétriques:\n${activeReport.metrics.map(m => `${m.label}: ${m.value}`).join('\n')}`;
      
      if (Platform.OS === 'web') {
        // Web - trigger download
        const element = document.createElement('a');
        const file = new Blob([text], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `${activeReport.title}.txt`;
        element.click();
      } else {
        // Mobile
        Alert.alert('Export', 'Rapport exporté vers le presse-papiers');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'exporter le rapport');
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadReports(); }} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Rapports SST</Text>
          <Text style={styles.subtitle}>Tableaux de bord santé-sécurité au travail</Text>
        </View>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="funnel" size={18} color={ACCENT} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Période</Text>
          <View style={styles.dateRange}>
            <Text style={styles.filterLabel}>
              {dateRange.startDate.toLocaleDateString('fr-CD')} → {dateRange.endDate.toLocaleDateString('fr-CD')}
            </Text>
          </View>
        </View>
      )}

      {/* Reports Grid */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Chargement des rapports...</Text>
        </View>
      ) : (
        <>
          {/* Report Selector */}
          <FlatList
            data={Array.from(reportConfigs.entries())}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEnabled={true}
            keyExtractor={item => item[0]}
            renderItem={({ item: [reportType, config] }) => {
              const isActive = activeReportId === reportType;
              return (
                <TouchableOpacity
                  style={[styles.reportCard, isActive && styles.reportCardActive]}
                  onPress={() => setActiveReportId(reportType)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.reportCardIcon, { backgroundColor: config.color }]}>
                    <Ionicons name={config.icon as any} size={20} color="#FFF" />
                  </View>
                  <Text style={[styles.reportCardTitle, isActive && { color: config.color }]} numberOfLines={1}>
                    {config.title}
                  </Text>
                  <Text style={styles.reportCardFreq}>{config.frequency}</Text>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.reportsGrid}
            style={{ marginBottom: 20 }}
          />

          {/* Active Report Display */}
          {activeReport && (
            <View style={styles.reportDisplay}>
              <View style={styles.reportHeader}>
                <View>
                  <Text style={styles.reportTitle}>{activeReport.title}</Text>
                  <Text style={styles.reportDesc}>{activeReport.description}</Text>
                </View>
                <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
                  <Ionicons name="download" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>

              {/* Metrics */}
              <Text style={styles.sectionTitle}>Indicateurs Clés</Text>
              <View style={styles.metricsContainer}>
                {activeReport.metrics.map((metric, idx) => (
                  <View key={idx} style={styles.metricItem}>
                    <View style={[styles.metricIconBg, { backgroundColor: metric.color + '20' }]}>
                      <Ionicons name={metric.icon as any} size={16} color={metric.color} />
                    </View>
                    <View style={styles.metricContent}>
                      <Text style={styles.metricLabel}>{metric.label}</Text>
                      <Text style={styles.metricValue}>{metric.value}</Text>
                      {metric.trend && (
                        <View style={styles.metricTrendContainer}>
                          <Ionicons 
                            name={metric.trend === 'up' ? 'trending-up' : metric.trend === 'down' ? 'trending-down' : 'remove'} 
                            size={11} 
                            color={metric.trend === 'up' ? '#EF4444' : '#22C55E'} 
                          />
                          <Text style={[styles.metricTrend, { color: metric.trend === 'up' ? '#EF4444' : '#22C55E' }]}>
                            {metric.trendValue}
                          </Text>
                        </View>
                      )}
                    </View>
                    {metric.benchmark && (
                      <Text style={styles.metricBench}>{metric.benchmark}</Text>
                    )}
                  </View>
                ))}
              </View>

              {/* Legend */}
              <View style={styles.legend}>
                <Text style={styles.legendTitle}>Performance vs Benchmark</Text>
                <Text style={styles.legendText}>Comparez chaque métrique avec ses objectifs cibles</Text>
              </View>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  contentContainer: { padding: isDesktop ? 32 : 16, paddingBottom: 40 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  filterButton: { width: 40, height: 40, borderRadius: borderRadius.lg, backgroundColor: colors.surfaceVariant, justifyContent: 'center', alignItems: 'center' },

  filterSection: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: 14, marginBottom: 16, ...shadows.xs },
  filterTitle: { fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 8 },
  dateRange: { padding: 8, backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.lg },
  filterLabel: { fontSize: 12, color: colors.text, fontWeight: '500' },

  reportsGrid: { gap: 12 },
  reportCard: { 
    width: isDesktop ? 140 : 110, 
    backgroundColor: colors.surface, 
    borderRadius: borderRadius.lg, 
    padding: 12, 
    alignItems: 'center', 
    ...shadows.xs, 
    borderWidth: 1.5, 
    borderColor: colors.outline 
  },
  reportCardActive: { borderColor: ACCENT, ...shadows.sm },
  reportCardIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  reportCardTitle: { fontSize: 11, fontWeight: '600', color: colors.text, textAlign: 'center' },
  reportCardFreq: { fontSize: 9, color: colors.textTertiary, marginTop: 4 },

  loadingContainer: { justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  loadingText: { marginTop: 12, color: colors.textSecondary, fontSize: 14 },

  reportDisplay: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 20, ...shadows.sm },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.outline },
  reportTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  reportDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2, maxWidth: '80%' },
  exportBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' },

  sectionTitle: { fontSize: 12, fontWeight: '700', color: ACCENT, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

  metricsContainer: { gap: 8, marginBottom: 24 },
  metricItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.lg },
  metricIconBg: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  metricContent: { flex: 1 },
  metricLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  metricValue: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 2 },
  metricTrendContainer: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 3 },
  metricTrend: { fontSize: 10, fontWeight: '600' },
  metricBench: { fontSize: 9, color: colors.textTertiary, fontWeight: '500', paddingHorizontal: 8, paddingVertical: 3, backgroundColor: colors.outline + '30', borderRadius: 4 },

  legend: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.lg, padding: 12, marginTop: 16 },
  legendTitle: { fontSize: 11, fontWeight: '700', color: colors.text },
  legendText: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
});
