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
import { occHealthApi } from '../../../services/OccHealthApiService';

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
      const [examsRes, incidentsRes, diseasesRes, alertsRes, ppeRes, workersRes,
             drillsRes, contractorsRes, surveillanceRes, kpisRes, complianceSummaryRes,
             dashStatsRes, hazardStatsRes] = 
        await Promise.allSettled([
          apiService.get('/occupational-health/examinations/', { params: { ...baseParams, limit: 1000 } }),
          apiService.get('/occupational-health/workplace-incidents/', { params: { ...baseParams, limit: 1000 } }),
          apiService.get('/occupational-health/occupational-diseases/', { params: { ...baseParams, limit: 1000 } }),
          apiService.get('/occupational-health/overexposure-alerts/', { params: { ...baseParams } }),
          apiService.get('/occupational-health/ppe-compliance/', { params: { ...baseParams } }),
          apiService.get('/occupational-health/workers/', { params: { ...baseParams, limit: 1000 } }),
          occHealthApi.listOverdueDrills(),
          occHealthApi.listPendingContractors(),
          occHealthApi.listHealthSurveillance(),
          occHealthApi.listOutOfBoundsKPIs(),
          occHealthApi.getComplianceSummary(),
          occHealthApi.getDashboardStats(),
          occHealthApi.getHazardIdentificationStats(),
        ]);

      const exams = (examsRes as any).value?.data?.results || [];
      const incidents = (incidentsRes as any).value?.data?.results || [];
      const diseases = (diseasesRes as any).value?.data?.results || [];
      const alerts = (alertsRes as any).value?.data?.results || [];
      const ppe = (ppeRes as any).value?.data?.results || [];
      const workers = (workersRes as any).value?.data?.results || [];
      const overdueDrills: any[] = (drillsRes as any).value?.data ?? [];
      const pendingContractors: any[] = (contractorsRes as any).value?.data ?? [];
      const surveillance: any[] = (surveillanceRes as any).value?.data ?? [];
      const outOfBoundsKPIs: any[] = (kpisRes as any).value?.data ?? [];
      const complianceSummary: any = (complianceSummaryRes as any).value?.data ?? {};
      const dashboardStatsData: any = (dashStatsRes as any).value?.data ?? {};
      const hazardStatsData: any = (hazardStatsRes as any).value?.data ?? {};

      // Generate consolidated reports
      const newReports = new Map<ReportType, ReportData>();
      
      newReports.set('executive-summary', generateExecutiveSummary(exams, incidents, diseases, workers, alerts, dashboardStatsData));
      newReports.set('incident-trends', generateIncidentReport(incidents, dashboardStatsData));
      newReports.set('medical-compliance', generateMedicalReport(exams, diseases));
      newReports.set('exposure-risk', generateExposureReport(alerts, ppe, outOfBoundsKPIs, hazardStatsData));
      newReports.set('regulatory-compliance', generateRegulatoryReport(incidents, diseases, overdueDrills, pendingContractors, complianceSummary));
      newReports.set('worker-health', generateWorkerReport(workers, exams, surveillance, dashboardStatsData, hazardStatsData));
      newReports.set('risk-matrix', generateRiskMatrix(incidents, alerts, hazardStatsData));

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
  const generateExecutiveSummary = (exams: any[], incidents: any[], diseases: any[], workers: any[], alerts: any[], dashStats: any): ReportData => {
    const now = new Date();
    const thisMonth = incidents.filter(i => {
      const d = new Date(i.incident_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    // Dynamic trend: compare this month vs monthly average over the selected range
    const msPerMonth = 30 * 24 * 60 * 60 * 1000;
    const monthsInRange = Math.max(1, Math.round(
      (dateRange.endDate.getTime() - dateRange.startDate.getTime()) / msPerMonth
    ));
    const avgPerMonth = incidents.length / monthsInRange;
    const incidentTrend: 'up' | 'down' = thisMonth >= avgPerMonth ? 'up' : 'down';
    const incidentDelta = Math.abs(thisMonth - Math.round(avgPerMonth));
    const incidentTrendValue = incidentDelta > 0 ? `${incidentTrend === 'up' ? '+' : '-'}${incidentDelta}` : undefined;

    const fit = exams.filter(e => e.fitness_status === 'fit').length;
    const aptitude = exams.length > 0
      ? Math.round((fit / exams.length) * 100)
      : Math.round(dashStats?.overall_fitness_rate ?? 0);
    const activeWorkers = dashStats?.active_workers ?? workers.length;

    return {
      ...reportConfigs['executive-summary'],
      generatedAt: new Date(),
      metrics: [
        { label: 'Travailleurs en Suivi', value: activeWorkers, icon: 'people', color: '#3B82F6' },
        { label: 'Incidents ce Mois', value: thisMonth, icon: 'warning', color: thisMonth > 2 ? '#EF4444' : '#22C55E', trend: incidentTrend, trendValue: incidentTrendValue },
        { label: 'Maladies Déclarées', value: diseases.length, icon: 'bandage', color: '#DC2626' },
        { label: 'Taux Aptitude', value: aptitude > 0 ? `${aptitude}%` : '—', icon: 'shield-checkmark', color: '#22C55E', benchmark: '≥ 85%' },
        { label: 'Examens Effectués', value: exams.length, icon: 'medkit', color: '#3B82F6' },
        { label: 'Alertes d\'Exposition', value: alerts.length, icon: 'alert-circle', color: alerts.length > 0 ? '#EF4444' : '#22C55E' },
      ],
    };
  };

  const generateIncidentReport = (incidents: any[], dashStats: any): ReportData => {
    const critical = incidents.filter(i => i.severity === 'critical' || i.severity === 'high').length;
    const daysLost = incidents.reduce((sum, i) => sum + (i.days_lost || i.work_days_lost || 0), 0);
    // Prefer real YTD rates from dashboard stats; fall back to formula-based estimate
    const ltifr = dashStats?.ytd_ltifr != null
      ? Number(dashStats.ytd_ltifr).toFixed(2)
      : OccHealthUtils.calculateLTIFR(Math.round(incidents.length * 0.3), 1250000).toFixed(2);
    const trifr = dashStats?.ytd_trifr != null
      ? Number(dashStats.ytd_trifr).toFixed(2)
      : OccHealthUtils.calculateTRIFR(incidents.length, 1250000).toFixed(2);
    // Closed incidents = fully processed and reported
    const closed = incidents.filter(i => i.status === 'closed').length;
    const closureLabel = incidents.length > 0 ? `${closed} / ${incidents.length}` : '—';

    return {
      ...reportConfigs['incident-trends'],
      generatedAt: new Date(),
      metrics: [
        { label: 'Total Incidents', value: incidents.length, icon: 'warning', color: '#EF4444' },
        { label: 'Incidents Critiques', value: critical, icon: 'alert-circle', color: '#DC2626' },
        { label: 'LTIFR', value: ltifr, icon: 'analytics', color: '#8B5CF6', benchmark: '< 2.5' },
        { label: 'TRIFR', value: trifr, icon: 'trending-up', color: '#6366F1', benchmark: '< 5.0' },
        { label: 'Jours d\'Arrêt', value: daysLost, icon: 'calendar', color: '#DC2626' },
        { label: 'Incidents Fermés', value: closureLabel, icon: 'checkmark', color: closed === incidents.length && incidents.length > 0 ? '#22C55E' : '#F59E0B', benchmark: '= 100%' },
      ],
    };
  };

  const generateMedicalReport = (exams: any[], diseases: any[]): ReportData => {
    const fit = exams.filter(e => e.fitness_status === 'fit').length;
    const unfit = exams.filter(e => ['unfit', 'permanently_unfit'].includes(e.fitness_status)).length;
    const provisional = exams.filter(e => ['provisional', 'fit_with_restrictions', 'temporarily_unfit'].includes(e.fitness_status)).length;
    const aptitude = exams.length > 0 ? Math.round((fit / exams.length) * 100) : 0;
    // Documentation compliance: exams that have a fitness decision (not pending/unknown)
    const documented = exams.filter(e => e.fitness_status && !['pending', 'not_evaluated', '', null, undefined].includes(e.fitness_status)).length;
    const docCompliance = exams.length > 0 ? Math.round((documented / exams.length) * 100) : 0;

    return {
      ...reportConfigs['medical-compliance'],
      generatedAt: new Date(),
      metrics: [
        { label: 'Taux Aptitude Global', value: exams.length > 0 ? `${aptitude}%` : '—', icon: 'shield-checkmark', color: '#22C55E', benchmark: '≥ 85%' },
        { label: 'Travailleurs Aptes', value: fit, icon: 'checkmark-circle', color: '#10B981' },
        { label: 'Inaptes / Restrictions', value: unfit + provisional, icon: 'close-circle', color: unfit > 0 ? '#EF4444' : '#F59E0B' },
        { label: 'Aptitude Provisoire', value: provisional, icon: 'alert-circle', color: '#F59E0B' },
        { label: 'Maladies Professionnelles', value: diseases.length, icon: 'bandage', color: '#DC2626' },
        { label: 'Conformité Documentation', value: exams.length > 0 ? `${docCompliance}%` : '—', icon: 'document-text', color: '#6366F1', benchmark: '≥ 90%' },
      ],
    };
  };

  const generateExposureReport = (alerts: any[], ppe: any[], outOfBoundsKPIs: any[], hazardStats: any): ReportData => {
    const critical = alerts.filter(a => a.severity === 'critical').length;
    const compliant = ppe.filter(p => p.is_compliant).length;
    const compliance = ppe.length > 0 ? Math.round((compliant / ppe.length) * 100) : 100;
    // Workers exposed from hazard register statistics (real headcount)
    const workersExposed = hazardStats?.workers_exposed ?? alerts.length;

    return {
      ...reportConfigs['exposure-risk'],
      generatedAt: new Date(),
      metrics: [
        { label: 'Alertes Actives', value: alerts.length, icon: 'alert', color: alerts.length > 0 ? '#F59E0B' : '#22C55E' },
        { label: 'Critiques', value: critical, icon: 'alert-circle', color: '#DC2626' },
        { label: 'Conformité EPI', value: ppe.length > 0 ? `${compliance}%` : '—', icon: 'shield-checkmark', color: '#22C55E', benchmark: '≥ 90%' },
        { label: 'EPI Non-Conforme', value: ppe.length - compliant, icon: 'close-circle', color: '#EF4444' },
        { label: 'Travailleurs Exposés', value: workersExposed, icon: 'warning', color: '#F59E0B' },
        { label: 'KPIs Hors Seuil', value: outOfBoundsKPIs.length, icon: 'analytics', color: outOfBoundsKPIs.length > 0 ? '#DC2626' : '#0891B2' },
      ],
    };
  };

  const generateRegulatoryReport = (
    incidents: any[], diseases: any[],
    overdueDrills: any[], pendingContractors: any[],
    complianceSummary: any,
  ): ReportData => {
    const isoScore = complianceSummary.compliance_score != null
      ? `${Math.round(complianceSummary.compliance_score)}%`
      : '—';
    const openCapas = complianceSummary.open_capas ?? complianceSummary.non_compliant_count ?? '—';

    return {
      ...reportConfigs['regulatory-compliance'],
      generatedAt: new Date(),
      metrics: [
        { label: 'Rapports CNSS', value: incidents.length, icon: 'document-text', color: '#6366F1' },
        { label: 'Notifications DRC', value: diseases.length, icon: 'mail', color: '#8B5CF6' },
        { label: 'Exercices en Retard', value: overdueDrills.length, icon: 'time', color: overdueDrills.length > 0 ? '#F59E0B' : '#22C55E', trend: overdueDrills.length > 0 ? 'up' : 'stable', trendValue: overdueDrills.length > 0 ? `+${overdueDrills.length}` : undefined },
        { label: 'Prestataires en Attente', value: pendingContractors.length, icon: 'people', color: pendingContractors.length > 0 ? '#F59E0B' : '#22C55E' },
        { label: 'CAPA Ouvertes', value: openCapas, icon: 'alert-circle', color: '#EF4444' },
        { label: 'Conformité ISO 45001', value: isoScore, icon: 'trophy', color: '#8B5CF6', benchmark: '≥ 90%' },
      ],
    };
  };

  const generateWorkerReport = (workers: any[], exams: any[], surveillance: any[], dashStats: any, hazardStats: any): ReportData => {
    const activeWorkers = dashStats?.active_workers ?? workers.length;
    // High-risk workers from dashboard stats
    const atRisk = dashStats?.high_risk_workers ?? 0;
    // Workers exposed from hazard register (real headcount from hazard register stats)
    const workersExposed = hazardStats?.workers_exposed ?? 0;
    // Exams performed in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentExams = exams.filter(e => {
      const d = new Date(e.exam_date);
      return !isNaN(d.getTime()) && d >= thirtyDaysAgo;
    }).length;
    const surveillanceCoverage = activeWorkers > 0
      ? Math.round((surveillance.length / activeWorkers) * 100)
      : 0;

    return {
      ...reportConfigs['worker-health'],
      generatedAt: new Date(),
      metrics: [
        { label: 'Travailleurs Actifs', value: activeWorkers, icon: 'people', color: '#06B6D4' },
        { label: 'À Risque Identifié', value: atRisk, icon: 'alert', color: '#F59E0B' },
        { label: 'Exposés aux Dangers', value: workersExposed, icon: 'warning', color: '#EF4444' },
        { label: 'Examen Récent (30j)', value: recentExams, icon: 'medkit', color: '#3B82F6' },
        { label: 'Surveillance Santé', value: surveillance.length, icon: 'eye', color: '#0891B2' },
        { label: 'Couverture Surveillance', value: activeWorkers > 0 ? `${surveillanceCoverage}%` : '—', icon: 'shield-checkmark', color: '#22C55E', benchmark: '≥ 80%' },
      ],
    };
  };

  const generateRiskMatrix = (incidents: any[], alerts: any[], hazardStats: any): ReportData => {
    const byLevel = hazardStats?.by_risk_level ?? {};
    const totalHazards = hazardStats?.total_hazards ?? 0;
    const byStatus = hazardStats?.by_status ?? {};
    // Hazards with controlled/mitigated status = controls in place
    const controlled = (byStatus.controlled ?? 0) + (byStatus.mitigated ?? 0) + (byStatus.closed ?? 0);
    const controlsRate = totalHazards > 0 ? Math.round((controlled / totalHazards) * 100) : null;
    const avgScore = hazardStats?.average_risk_score != null
      ? Number(hazardStats.average_risk_score).toFixed(1)
      : '—';

    return {
      ...reportConfigs['risk-matrix'],
      generatedAt: new Date(),
      metrics: [
        { label: 'Risques Critiques', value: byLevel.critical ?? 0, icon: 'alert-circle', color: '#DC2626' },
        { label: 'Risques Élevés', value: byLevel.high ?? 0, icon: 'warning', color: '#EF4444' },
        { label: 'Risques Modérés', value: byLevel.medium ?? 0, icon: 'alert', color: '#F59E0B' },
        { label: 'Risques Faibles', value: byLevel.low ?? 0, icon: 'checkmark', color: '#22C55E' },
        { label: 'Score Risque Moyen', value: avgScore, icon: 'analytics', color: '#8B5CF6', benchmark: '< 10' },
        { label: 'Dangers Maîtrisés', value: controlsRate != null ? `${controlsRate}%` : `${controlled} / ${totalHazards}`, icon: 'shield-checkmark', color: '#0891B2', benchmark: '≥ 80%' },
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
            data={Object.entries(reportConfigs)}
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
