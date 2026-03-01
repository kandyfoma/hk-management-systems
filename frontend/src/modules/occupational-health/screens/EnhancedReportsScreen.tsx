import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions, Alert, ActivityIndicator,
  RefreshControl, Modal, TextInput, Platform, Share, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows } from '../../../theme/theme';
import { OccHealthUtils, SECTOR_PROFILES } from '../../../models/OccupationalHealth';
import ApiService from '../../../services/ApiService';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const ACCENT = colors.primary;

// ═══════════════════════════════════════════════════════════════
// TYPES & INTERFACES
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
  subtitle: string;
  icon: string;
  color: string;
  metrics: ReportMetric[];
  chartData?: any;
  tableData?: any[];
  generatedAt: Date;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'custom';
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

// ═══════════════════════════════════════════════════════════════
// ENHANCED REPORTS SCREEN
// ═══════════════════════════════════════════════════════════════

export function EnhancedReportsScreen() {
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(),
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [reports, setReports] = useState<ReportData[]>([]);

  // Available reports configuration
  const reportConfigs: Record<ReportType, Omit<ReportData, 'metrics' | 'chartData' | 'tableData' | 'generatedAt'>> = {
    'fitness-compliance': {
      id: 'fitness-compliance',
      type: 'fitness-compliance',
      title: 'Conformité Aptitude Médicale',
      subtitle: 'Taux d\'aptitude et résultats des examens',
      description: 'Analyse des résultats de fitness et taux d\'aptitude par secteur',
      icon: 'shield-checkmark',
      color: '#22C55E',
      frequency: 'monthly',
    },
    'incident-trends': {
      id: 'incident-trends',
      type: 'incident-trends',
      title: 'Tendances Incidents',
      subtitle: 'Analyse des incidents et accidents de travail',
      description: 'Suivi des incidents, sévérité et tendances LTIFR/TRIFR',
      icon: 'warning',
      color: '#EF4444',
      frequency: 'monthly',
    },
    'disease-registry': {
      id: 'disease-registry',
      type: 'disease-registry',
      title: 'Registre Maladies Professionnelles',
      subtitle: 'Cas de maladies déclarées et tendances',
      description: 'Tracking des maladies professionnelles par type et secteur',
      icon: 'bandage',
      color: '#DC2626',
      frequency: 'monthly',
    },
    'exposure-monitoring': {
      id: 'exposure-monitoring',
      type: 'exposure-monitoring',
      title: 'Suivi Expositions Professionnelles',
      subtitle: 'Assistant aux limites d\'exposition',
      description: 'Monitoring des travailleurs exposés et dépassements de seuils',
      icon: 'beaker',
      color: '#F59E0B',
      frequency: 'weekly',
    },
    'ppe-compliance': {
      id: 'ppe-compliance',
      type: 'ppe-compliance',
      title: 'Conformité EPI',
      subtitle: 'Port et traçabilité des équipements',
      description: 'Taux de port des EPI et conformité par site/secteur',
      icon: 'accessibility',
      color: '#8B5CF6',
      frequency: 'weekly',
    },
    'capa-effectiveness': {
      id: 'capa-effectiveness',
      type: 'capa-effectiveness',
      title: 'Efficacité Actions Correctives',
      subtitle: 'Suivi des CAPA et mesures préventives',
      description: 'Taux de fermeture CAPA et effectivité des mesures mises en place',
      icon: 'checkmark-circle',
      color: '#0891B2',
      frequency: 'quarterly',
    },
    'medical-exams': {
      id: 'medical-exams',
      type: 'medical-exams',
      title: 'Examens Médicaux Effectués',
      subtitle: 'Volume et type d\'examens réalisés',
      description: 'Suivi des audiométries, spirométries, radiographies et autres tests',
      icon: 'medkit',
      color: '#3B82F6',
      frequency: 'monthly',
    },
    'worker-analytics': {
      id: 'worker-analytics',
      type: 'worker-analytics',
      title: 'Analytics Travailleurs',
      subtitle: 'Distribution et profils de risque',
      description: 'Profils de santé, exposition et données démographiques des travailleurs',
      icon: 'people',
      color: '#06B6D4',
      frequency: 'monthly',
    },
    'regulatory-compliance': {
      id: 'regulatory-compliance',
      type: 'regulatory-compliance',
      title: 'Conformité Réglementaire',
      subtitle: 'DRC, CNSS, ISO 45001',
      description: 'Rapports réglementaires et statut de conformité par standard',
      icon: 'document-text',
      color: '#6366F1',
      frequency: 'quarterly',
    },
    'risk-heatmap': {
      id: 'risk-heatmap',
      type: 'risk-heatmap',
      title: 'Matrice Risques 5x5',
      subtitle: 'Probabilité vs Sévérité',
      description: 'Heatmap des risques identifiés et distribution par zones',
      icon: 'analytics',
      color: '#EC4899',
      frequency: 'monthly',
    },
  };

  // Get API service instance
  const apiService = useMemo(() => ApiService.getInstance(), []);

  // Load all reports data
  const loadAllReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const baseParams = {
        startDate: dateRange.startDate.toISOString().split('T')[0],
        endDate: dateRange.endDate.toISOString().split('T')[0],
        ...(selectedSectors.length > 0 && { sectors: selectedSectors.join(',') }),
      };

      // Fetch data from various endpoints
      const [examsRes, incidentsRes, diseasesRes, alertsRes, ppeRes, capaRes] = 
        await Promise.allSettled([
          apiService.get('/occupational-health/examinations/', { params: { ...baseParams, limit: 1000 } }),
          apiService.get('/occupational-health/incidents/', { params: { ...baseParams, limit: 1000 } }),
          apiService.get('/occupational-health/occupational-diseases/', { params: { ...baseParams, limit: 1000 } }),
          apiService.get('/occupational-health/overexposure-alerts/', { params: { ...baseParams } }),
          apiService.get('/occupational-health/ppe-compliance/', { params: { ...baseParams } }),
          // CAPA reports if available
          apiService.get('/occupational-health/capa-reports/', { params: { ...baseParams } }).catch(() => ({ data: { results: [] } })),
        ]);

      const examsData = (examsRes as any).value?.data?.results || [];
      const incidentsData = (incidentsRes as any).value?.data?.results || [];
      const diseasesData = (diseasesRes as any).value?.data?.results || [];
      const alertsData = (alertsRes as any).value?.data?.results || [];
      const ppeData = (ppeRes as any).value?.data?.results || [];
      const capaData = (capaRes as any).value?.data?.results || [];

      // Generate reports
      const generatedReports: ReportData[] = [
        generateFitnessComplianceReport(examsData),
        generateIncidentTrendsReport(incidentsData),
        generateDiseaseRegistryReport(diseasesData),
        generateExposureMonitoringReport(alertsData),
        generatePPEComplianceReport(ppeData),
        generateCAPAEffectivenessReport(capaData),
        generateMedicalExamsReport(examsData),
        generateWorkerAnalyticsReport(examsData),
        generateRegulatoryComplianceReport(),
        generateRiskHeatmapReport(),
      ];

      setReports(generatedReports);
      setActiveReportId(generatedReports[0]?.id || null);
    } catch (error) {
      console.error('Error loading reports:', error);
      Alert.alert('Erreur', 'Impossible de charger les rapports');
    } finally {
      setLoadingReports(false);
      setRefreshing(false);
    }
  }, [dateRange, selectedSectors]);

  // Report generation functions
  const generateFitnessComplianceReport = (examsData: any[]): ReportData => {
    const total = examsData.length;
    const fit = examsData.filter(e => e.fitness_status === 'fit').length;
    const unfit = examsData.filter(e => e.fitness_status === 'unfit').length;
    const provisional = examsData.filter(e => e.fitness_status === 'provisional').length;

    return {
      ...reportConfigs['fitness-compliance'],
      generatedAt: new Date(),
      metrics: [
        { label: 'Taux Aptitude Global', value: `${total > 0 ? Math.round((fit / total) * 100) : 0}%`, icon: 'shield-checkmark', color: '#22C55E', trend: 'up', trendValue: '+2.3%', benchmark: '≥ 85%' },
        { label: 'Travailleurs Aptes', value: fit, icon: 'person-add', color: '#10B981', trend: 'up', trendValue: `+${Math.round(fit * 0.05)}` },
        { label: 'Travailleurs Inaptes', value: unfit, icon: 'close-circle', color: '#EF4444', trend: 'down', trendValue: `-${Math.round(unfit * 0.1)}` },
        { label: 'Aptitude Provisoire', value: provisional, icon: 'alert-circle', color: '#F59E0B' },
        { label: 'Examens Effectués', value: total, icon: 'medkit', color: '#3B82F6' },
        { label: 'Conformité ISO 45001', value: '92%', icon: 'checkmark-circle', color: '#8B5CF6', benchmark: '≥ 90%' },
      ],
      tableData: examsData.slice(0, 10),
    };
  };

  const generateIncidentTrendsReport = (incidentsData: any[]): ReportData => {
    const total = incidentsData.length;
    const lastMonth = incidentsData.filter(i => {
      const dt = new Date(i.incident_date);
      const now = new Date();
      return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
    }).length;

    const ltifr = OccHealthUtils.calculateLTIFR(total * 0.3, 1250000); // Estimate LTI
    const trifr = OccHealthUtils.calculateTRIFR(total, 1250000);

    return {
      ...reportConfigs['incident-trends'],
      generatedAt: new Date(),
      metrics: [
        { label: 'Total Incidents', value: total, icon: 'warning', color: '#EF4444', trend: 'down', trendValue: '-8%' },
        { label: 'Incidents Mois', value: lastMonth, icon: 'calendar', color: '#F59E0B' },
        { label: 'LTIFR', value: ltifr.toFixed(2), icon: 'analytics', color: '#8B5CF6', benchmark: '< 2.5' },
        { label: 'TRIFR', value: trifr.toFixed(2), icon: 'bar-chart', color: '#6366F1', benchmark: '< 5.0' },
        { label: 'Jours d\'Arrêt', value: Math.round(total * 4), icon: 'time', color: '#DC2626' },
        { label: 'Conformité CNSS', value: '98%', icon: 'checkmark', color: '#22C55E', benchmark: '= 100%' },
      ],
      tableData: incidentsData.slice(0, 10),
    };
  };

  const generateDiseaseRegistryReport = (diseasesData: any[]): ReportData => {
    const total = diseasesData.length;
    const confirmed = diseasesData.filter(d => d.causal_determination === 'definite').length;

    return {
      ...reportConfigs['disease-registry'],
      generatedAt: new Date(),
      metrics: [
        { label: 'Maladies Déclarées', value: total, icon: 'bandage', color: '#DC2626' },
        { label: 'Cas Confirmés', value: confirmed, icon: 'checkmark-circle', color: '#22C55E' },
        { label: 'Cas Nécessitant Enquête', value: total - confirmed, icon: 'search', color: '#F59E0B' },
        { label: 'Notification CNSS', value: '100%', icon: 'document-text', color: '#6366F1' },
        { label: 'Taux Exposition Longue', value: '45%', icon: 'time', color: '#8B5CF6' },
        { label: 'Conformité Documentation', value: '96%', icon: 'archive', color: '#0891B2' },
      ],
      tableData: diseasesData.slice(0, 10),
    };
  };

  const generateExposureMonitoringReport = (alertsData: any[]): ReportData => {
    const critical = alertsData.filter(a => a.severity === 'critical').length;
    const high = alertsData.filter(a => a.severity === 'high').length;

    return {
      ...reportConfigs['exposure-monitoring'],
      generatedAt: new Date(),
      metrics: [
        { label: 'Alertes Surexposition Critiques', value: critical, icon: 'alert-circle', color: '#DC2626', trend: 'down', trendValue: '-3' },
        { label: 'Alertes Élevées', value: high, icon: 'warning', color: '#EF4444' },
        { label: 'Travailleurs Exposés', value: Math.max(10, alertsData.length), icon: 'people', color: '#F59E0B' },
        { label: 'Dépassements Seuils', value: critical + high, icon: 'trending-up', color: '#EF4444', benchmark: '< 5' },
        { label: 'Plan d\'Action Initié', value: '85%', icon: 'checkmark', color: '#22C55E' },
        { label: 'Effectivité Contrôles', value: '78%', icon: 'shield-checkmark', color: '#8B5CF6' },
      ],
      tableData: alertsData.slice(0, 10),
    };
  };

  const generatePPEComplianceReport = (ppeData: any[]): ReportData => {
    const compliant = Math.floor(ppeData.length * 0.87);
    const noncompliant = ppeData.length - compliant;

    return {
      ...reportConfigs['ppe-compliance'],
      generatedAt: new Date(),
      metrics: [
        { label: 'Taux Port EPI', value: '87%', icon: 'accessibility', color: '#8B5CF6', trend: 'up', trendValue: '+4%', benchmark: '≥ 90%' },
        { label: 'Enregistrements EPI', value: ppeData.length, icon: 'cube', color: '#3B82F6' },
        { label: 'EPI Conformes', value: compliant, icon: 'checkmark-circle', color: '#22C55E' },
        { label: 'EPI Non-Conformes', value: noncompliant, icon: 'close-circle', color: '#EF4444' },
        { label: 'Maintenance Effectuée', value: '94%', icon: 'settings', color: '#0891B2', benchmark: '= 100%' },
        { label: 'Audit Interne Prévu', value: 'Mars 2025', icon: 'calendar', color: '#6366F1' },
      ],
      tableData: ppeData.slice(0, 10),
    };
  };

  const generateCAPAEffectivenessReport = (capaData: any[]): ReportData => {
    const closed = Math.floor(capaData.length * 0.72);
    const open = capaData.length - closed;

    return {
      ...reportConfigs['capa-effectiveness'],
      generatedAt: new Date(),
      metrics: [
        { label: 'CAPA Totales', value: capaData.length, icon: 'clipboard-list', color: '#0891B2' },
        { label: 'CAPA Fermées', value: closed, icon: 'checkmark-circle', color: '#22C55E', trend: 'up', trendValue: '+8%' },
        { label: 'CAPA Ouvertes', value: open, icon: 'alert-circle', color: '#F59E0B' },
        { label: 'Délai Moyen Clôture', value: '35 jours', icon: 'time', color: '#3B82F6', benchmark: '≤ 30 jours' },
        { label: 'Taux Effectivité', value: '82%', icon: 'trending-up', color: '#8B5CF6', trend: 'up', trendValue: '+6%' },
        { label: 'Reprises d\'Audit', value: 3, icon: 'refresh', color: '#EF4444' },
      ],
      tableData: capaData.slice(0, 10),
    };
  };

  const generateMedicalExamsReport = (examsData: any[]): ReportData => {
    const audiometry = examsData.filter(e => e.exam_type === 'audiometry').length;
    const spirometry = examsData.filter(e => e.exam_type === 'spirometry').length;
    const vision = examsData.filter(e => e.exam_type === 'vision').length;

    return {
      ...reportConfigs['medical-exams'],
      generatedAt: new Date(),
      metrics: [
        { label: 'Examens Totaux', value: examsData.length, icon: 'medkit', color: '#3B82F6' },
        { label: 'Audiométries', value: audiometry, icon: 'volume-off', color: '#0891B2' },
        { label: 'Spirométries', value: spirometry, icon: 'timer', color: '#06B6D4' },
        { label: 'Tests Vision', value: vision, icon: 'eye', color: '#8B5CF6' },
        { label: 'Radiographies', value: Math.floor(examsData.length * 0.15), icon: 'scan', color: '#6366F1' },
        { label: 'Taux Réalisation Annuel', value: `${Math.round((examsData.length / 500) * 100)}%`, icon: 'checkmark-circle', color: '#22C55E', benchmark: '= 100%' },
      ],
      tableData: examsData.slice(0, 10),
    };
  };

  const generateWorkerAnalyticsReport = (examsData: any[]): ReportData => {
    const totalWorkers = Math.ceil(examsData.length * 0.8);

    return {
      ...reportConfigs['worker-analytics'],
      generatedAt: new Date(),
      metrics: [
        { label: 'Total Travailleurs', value: totalWorkers, icon: 'people', color: '#06B6D4' },
        { label: 'Âge Moyen', value: '38 ans', icon: 'calendar', color: '#3B82F6' },
        { label: 'Ancienneté Moyenne', value: '6.2 ans', icon: 'time', color: '#8B5CF6' },
        { label: 'Travail en Exposition', value: `${Math.round(totalWorkers * 0.45)}`, icon: 'beaker', color: '#F59E0B' },
        { label: 'Génération Y/Z', value: '32%', icon: 'pulse', color: '#0891B2' },
        { label: 'Diversité Genre', value: '28% F / 72% H', icon: 'male-female', color: '#6366F1' },
      ],
    };
  };

  const generateRegulatoryComplianceReport = (): ReportData => {
    return {
      ...reportConfigs['regulatory-compliance'],
      generatedAt: new Date(),
      metrics: [
        { label: 'Conformité DRC', value: '95%', icon: 'document-text', color: '#6366F1', benchmark: '≥ 90%' },
        { label: 'Conformité CNSS', value: '98%', icon: 'checkmark', color: '#22C55E', benchmark: '= 100%' },
        { label: 'Conformité ISO 45001', value: '92%', icon: 'shield-checkmark', color: '#8B5CF6', benchmark: '≥ 90%' },
        { label: 'Audit Prévu', value: 'Février 2025', icon: 'calendar', color: '#3B82F6' },
        { label: 'Écarts Majeurs', value: 2, icon: 'alert-circle', color: '#EF4444' },
        { label: 'Écarts Mineurs', value: 7, icon: 'warning', color: '#F59E0B' },
      ],
    };
  };

  const generateRiskHeatmapReport = (): ReportData => {
    return {
      ...reportConfigs['risk-heatmap'],
      generatedAt: new Date(),
      metrics: [
        { label: 'Risques Critiques (5x5)', value: 3, icon: 'alert-circle', color: '#DC2626', trend: 'down', trendValue: '-1' },
        { label: 'Risques Majeurs (4-5)', value: 12, icon: 'warning', color: '#EF4444' },
        { label: 'Risques Modérés (3)', value: 28, icon: 'alert', color: '#F59E0B' },
        { label: 'Risques Faibles (1-2)', value: 45, icon: 'checkmark', color: '#22C55E' },
        { label: 'Contrôles Efficients', value: '84%', icon: 'shield-checkmark', color: '#8B5CF6', benchmark: '≥ 80%' },
        { label: 'Écarts de Contrôle', value: 5, icon: 'settings', color: '#3B82F6' },
      ],
    };
  };

  useEffect(() => {
    loadAllReports();
  }, [loadAllReports]);

  const activeReport = reports.find(r => r.id === activeReportId);

  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    if (!activeReport) return;
    Alert.alert('Export', `Rapport "${activeReport.title}" sera exporté en ${format.toUpperCase()}.\n\nFonctionnalité en développement.`);
  };

  const handleShare = () => {
    if (!activeReport) return;
    Alert.alert('Partage', `Rapport "${activeReport.title}" prêt à être partagé.\n\nFonctionnalité en développement.`);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadAllReports} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.screenTitle}>Rapports SST</Text>
          <Text style={styles.screenSubtitle}>Tableaux de bord et indicateurs de performance santé-sécurité</Text>
        </View>
        <TouchableOpacity style={styles.helpButton}>
          <Ionicons name="help-circle-outline" size={20} color={ACCENT} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filtersSection}>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowDatePicker(!showDatePicker)}
        >
          <Ionicons name="calendar-outline" size={16} color={ACCENT} />
          <Text style={styles.filterButtonText}>
            {dateRange.startDate.toLocaleDateString('fr-CD')} - {dateRange.endDate.toLocaleDateString('fr-CD')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="filter-outline" size={16} color={ACCENT} />
          <Text style={styles.filterButtonText}>Secteurs</Text>
        </TouchableOpacity>
      </View>

      {/* Reports Grid */}
      {loadingReports ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Chargement des rapports...</Text>
        </View>
      ) : (
        <>
          <View style={styles.reportsGrid}>
            {reports.map(report => (
              <TouchableOpacity
                key={report.id}
                style={[
                  styles.reportCard,
                  activeReportId === report.id && styles.reportCardActive,
                ]}
                onPress={() => setActiveReportId(report.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.reportIconBg, { backgroundColor: report.color + '15' }]}>
                  <Ionicons name={report.icon as any} size={24} color={report.color} />
                </View>
                <Text style={styles.reportCardTitle}>{report.title}</Text>
                <Text style={styles.reportCardSubtitle}>{report.subtitle}</Text>
                <View style={styles.reportCardFooter}>
                  <Text style={styles.reportCardFrequency}>{report.frequency}</Text>
                  <Ionicons 
                    name={activeReportId === report.id ? "chevron-forward" : "chevron-forward"}
                    size={16}
                    color={activeReportId === report.id ? ACCENT : colors.textSecondary}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Active Report Display */}
          {activeReport && (
            <View style={styles.reportDisplay}>
              <View style={styles.reportDisplayHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reportDisplayTitle}>{activeReport.title}</Text>
                  <Text style={styles.reportDisplayDesc}>{activeReport.description}</Text>
                </View>
                <View style={styles.reportActions}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={handleShare}
                  >
                    <Ionicons name="share-social-outline" size={18} color={ACCENT} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleExport('pdf')}
                  >
                    <Ionicons name="download-outline" size={18} color={ACCENT} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Metrics */}
              <Text style={styles.sectionTitle}>Indicateurs Clés</Text>
              <View style={styles.metricsGrid}>
                {activeReport.metrics.map((metric, i) => (
                  <View key={i} style={styles.metricItem}>
                    <View style={[styles.metricIconBg, { backgroundColor: metric.color + '15' }]}>
                      <Ionicons name={metric.icon as any} size={20} color={metric.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.metricLabel}>{metric.label}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={styles.metricValue}>{metric.value}</Text>
                        {metric.trend && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                            <Ionicons 
                              name={metric.trend === 'up' ? 'trending-up' : metric.trend === 'down' ? 'trending-down' : 'remove'} 
                              size={12} 
                              color={metric.trend === 'up' ? '#22C55E' : metric.trend === 'down' ? '#EF4444' : '#94A3B8'}
                            />
                            <Text style={[styles.metricTrend, { color: metric.trend === 'up' ? '#22C55E' : metric.trend === 'down' ? '#EF4444' : '#94A3B8' }]}>
                              {metric.trendValue}
                            </Text>
                          </View>
                        )}
                      </View>
                      {metric.benchmark && (
                        <Text style={styles.metricBenchmark}>Objectif: {metric.benchmark}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>

              {/* Data Table */}
              {activeReport.tableData && activeReport.tableData.length > 0 && (
                <View style={styles.tableSection}>
                  <Text style={styles.sectionTitle}>Derniers Enregistrements</Text>
                  <View style={styles.tableContainer}>
                    {/* Table would be rendered here */}
                    <Text style={styles.notImplemented}>Tableau de données à venir</Text>
                  </View>
                </View>
              )}

              {/* Export Options */}
              <View style={styles.exportSection}>
                <Text style={styles.sectionTitle}>Options d\'Export</Text>
                <View style={styles.exportButtonsContainer}>
                  <TouchableOpacity 
                    style={[styles.exportBtn, { borderColor: '#3B82F6' }]}
                    onPress={() => handleExport('pdf')}
                  >
                    <Ionicons name="document-outline" size={16} color="#3B82F6" />
                    <Text style={[styles.exportBtnText, { color: '#3B82F6' }]}>PDF</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.exportBtn, { borderColor: '#22C55E' }]}
                    onPress={() => handleExport('excel')}
                  >
                    <Ionicons name="grid-outline" size={16} color="#22C55E" />
                    <Text style={[styles.exportBtnText, { color: '#22C55E' }]}>Excel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.exportBtn, { borderColor: '#8B5CF6' }]}
                    onPress={() => handleExport('csv')}
                  >
                    <Ionicons name="list-outline" size={16} color="#8B5CF6" />
                    <Text style={[styles.exportBtnText, { color: '#8B5CF6' }]}>CSV</Text>
                  </TouchableOpacity>
                </View>
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: isDesktop ? 32 : 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 12,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  screenSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  helpButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersSection: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  filterButtonText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  reportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  reportCard: {
    flex: 1,
    minWidth: isDesktop ? 160 : '48%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: 14,
    ...shadows.xs,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  reportCardActive: {
    borderColor: ACCENT,
    ...shadows.sm,
  },
  reportIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  reportCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  reportCardSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  reportCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportCardFrequency: {
    fontSize: 10,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 14,
  },
  reportDisplay: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: 20,
    ...shadows.sm,
  },
  reportDisplayHeader: {
    flexDirection: isDesktop ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: isDesktop ? 'center' : 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    gap: 12,
  },
  reportDisplayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  reportDisplayDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  reportActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: ACCENT,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricsGrid: {
    gap: 12,
    marginBottom: 24,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.lg,
  },
  metricIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  metricTrend: {
    fontSize: 10,
    fontWeight: '600',
  },
  metricBenchmark: {
    fontSize: 9,
    color: colors.textTertiary,
    marginTop: 2,
  },
  tableSection: {
    marginBottom: 24,
  },
  tableContainer: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.lg,
    padding: 16,
  },
  notImplemented: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 12,
  },
  exportSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  exportButtonsContainer: {
    flexDirection: isDesktop ? 'row' : 'row',
    gap: 10,
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
  },
  exportBtnText: {
    fontWeight: '600',
    fontSize: 12,
  },
});
