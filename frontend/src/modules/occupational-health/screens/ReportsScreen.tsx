import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows } from '../../../theme/theme';
import { OccHealthUtils, SECTOR_PROFILES, type IndustrySector } from '../../../models/OccupationalHealth';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const ACCENT = colors.primary;

interface ReportData {
  id: string;
  title: string;
  description: string;
  type: 'monthly' | 'quarterly' | 'annual' | 'custom';
  period: string;
  generatedAt: string;
  metrics: { label: string; value: string | number; trend?: 'up' | 'down' | 'stable'; trendValue?: string; icon: string; color: string }[];
  sectorBreakdown?: { sector: IndustrySector; label: string; incidents: number; exams: number; compliance: number }[];
}

function getReportTypeLabel(t: string): string {
  const m: Record<string, string> = { monthly: 'Mensuel', quarterly: 'Trimestriel', annual: 'Annuel', custom: 'Personnalisé' };
  return m[t] || t;
}

function getTrendIcon(t?: string): string {
  return t === 'up' ? 'trending-up' : t === 'down' ? 'trending-down' : 'remove';
}
function getTrendColor(t?: string, inverted = false): string {
  if (t === 'up') return inverted ? '#EF4444' : '#22C55E';
  if (t === 'down') return inverted ? '#22C55E' : '#EF4444';
  return '#94A3B8';
}

// ─── Sample Reports ──────────────────────────────────────────
const REPORTS: ReportData[] = [
  {
    id: 'r1', title: 'Rapport Mensuel SST — Janvier 2025', description: 'Synthèse mensuelle de la santé-sécurité au travail pour tous les sites.',
    type: 'monthly', period: 'Janvier 2025', generatedAt: '2025-02-01T08:00:00Z',
    metrics: [
      { label: 'Examens Réalisés', value: 145, trend: 'up', trendValue: '+12%', icon: 'medkit', color: '#3B82F6' },
      { label: 'Incidents Déclarés', value: 8, trend: 'down', trendValue: '-25%', icon: 'warning', color: '#F59E0B' },
      { label: 'Jours d\'Arrêt', value: 34, trend: 'down', trendValue: '-18%', icon: 'calendar', color: '#EF4444' },
      { label: 'LTIFR', value: '2.4', trend: 'down', trendValue: '-0.3', icon: 'analytics', color: '#8B5CF6' },
      { label: 'TRIFR', value: '5.1', trend: 'down', trendValue: '-0.5', icon: 'bar-chart', color: '#6366F1' },
      { label: 'Taux Conformité EPI', value: '87%', trend: 'up', trendValue: '+3%', icon: 'shield-checkmark', color: '#22C55E' },
      { label: 'Travailleurs Suivis', value: 520, trend: 'up', trendValue: '+15', icon: 'people', color: '#0891B2' },
      { label: 'Certificats Émis', value: 38, trend: 'up', trendValue: '+8', icon: 'document-text', color: ACCENT },
    ],
    sectorBreakdown: [
      { sector: 'mining', label: 'Mines', incidents: 3, exams: 65, compliance: 82 },
      { sector: 'manufacturing', label: 'Industrie', incidents: 2, exams: 35, compliance: 88 },
      { sector: 'construction', label: 'BTP', incidents: 2, exams: 25, compliance: 75 },
      { sector: 'healthcare', label: 'Santé', incidents: 1, exams: 20, compliance: 95 },
    ],
  },
  {
    id: 'r2', title: 'Rapport Trimestriel Q4 2024', description: 'Analyse trimestrielle avec tendances et recommandations.',
    type: 'quarterly', period: 'Oct-Déc 2024', generatedAt: '2025-01-10T09:00:00Z',
    metrics: [
      { label: 'Examens Réalisés', value: 412, trend: 'up', trendValue: '+8%', icon: 'medkit', color: '#3B82F6' },
      { label: 'Incidents Déclarés', value: 22, trend: 'down', trendValue: '-15%', icon: 'warning', color: '#F59E0B' },
      { label: 'Maladies Déclarées', value: 5, trend: 'stable', icon: 'bandage', color: '#DC2626' },
      { label: 'LTIFR Moyen', value: '2.7', trend: 'down', trendValue: '-0.4', icon: 'analytics', color: '#8B5CF6' },
      { label: 'Taux Aptitude', value: '91%', trend: 'up', trendValue: '+2%', icon: 'fitness', color: '#22C55E' },
      { label: 'Budget EPI Utilisé', value: '$45,200', trend: 'up', trendValue: '+12%', icon: 'cash', color: '#059669' },
    ],
  },
  {
    id: 'r3', title: 'Rapport Annuel 2024', description: 'Bilan annuel complet de la santé-sécurité au travail pour l\'ensemble des opérations.',
    type: 'annual', period: 'Année 2024', generatedAt: '2025-01-15T10:00:00Z',
    metrics: [
      { label: 'Total Examens', value: '1,582', trend: 'up', trendValue: '+15%', icon: 'medkit', color: '#3B82F6' },
      { label: 'Total Incidents', value: 87, trend: 'down', trendValue: '-22%', icon: 'warning', color: '#F59E0B' },
      { label: 'Accidents Graves', value: 4, trend: 'down', trendValue: '-2', icon: 'alert-circle', color: '#DC2626' },
      { label: 'Jours Sans Accident', value: 180, trend: 'up', trendValue: '+45', icon: 'trophy', color: '#22C55E' },
      { label: 'Programmes Actifs', value: 12, trend: 'up', trendValue: '+3', icon: 'eye', color: '#8B5CF6' },
      { label: 'Conformité Globale', value: '85%', trend: 'up', trendValue: '+7%', icon: 'checkmark-circle', color: '#22C55E' },
      { label: 'Budget Total SST', value: '$182,000', icon: 'cash', color: '#059669' },
      { label: 'ROI Prévention', value: '3.2x', trend: 'up', trendValue: '+0.5', icon: 'trending-up', color: ACCENT },
    ],
  },
];

// ─── Metric Card ─────────────────────────────────────────────
function MetricCard({ metric, inverted = false }: { metric: ReportData['metrics'][0]; inverted?: boolean }) {
  return (
    <View style={[styles.metricCard, { backgroundColor: metric.color }]}>
      <View style={styles.metricIcon}>
        <Ionicons name={metric.icon as any} size={18} color="#FFFFFF" />
      </View>
      <Text style={styles.metricValue}>{metric.value}</Text>
      <Text style={styles.metricLabel}>{metric.label}</Text>
      {metric.trend && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 }}>
          <Ionicons name={getTrendIcon(metric.trend) as any} size={12} color="rgba(255,255,255,0.8)" />
          <Text style={{ fontSize: 10, color: getTrendColor(metric.trend, inverted), fontWeight: '600' }}>{metric.trendValue}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Sector Breakdown ────────────────────────────────────────
function SectorBreakdown({ data }: { data: NonNullable<ReportData['sectorBreakdown']> }) {
  return (
    <View style={styles.breakdownContainer}>
      <Text style={styles.sectionTitle}>Répartition par Secteur</Text>
      <View style={styles.breakdownHeader}>
        <Text style={[styles.breakdownHeadCell, { flex: 2 }]}>Secteur</Text>
        <Text style={styles.breakdownHeadCell}>Incidents</Text>
        <Text style={styles.breakdownHeadCell}>Examens</Text>
        <Text style={styles.breakdownHeadCell}>Conformité</Text>
      </View>
      {data.map((row, i) => {
        const sp = SECTOR_PROFILES[row.sector];
        const compColor = OccHealthUtils.getComplianceColor(row.compliance);
        return (
          <View key={i} style={[styles.breakdownRow, i % 2 === 0 && { backgroundColor: colors.surfaceVariant }]}>
            <View style={[styles.breakdownCell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
              <Ionicons name={sp.icon as any} size={14} color={sp.color} />
              <Text style={styles.breakdownText}>{row.label}</Text>
            </View>
            <Text style={styles.breakdownCell}>{row.incidents}</Text>
            <Text style={styles.breakdownCell}>{row.exams}</Text>
            <View style={[styles.breakdownCell as any, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
              <View style={[styles.complianceDot, { backgroundColor: compColor }]} />
              <Text style={[styles.breakdownText, { color: compColor, fontWeight: '600' }]}>{row.compliance}%</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────
export function ReportsScreen() {
  const [selectedReport, setSelectedReport] = useState<string>(REPORTS[0].id);
  const [filterType, setFilterType] = useState<string>('all');

  const filteredReports = useMemo(() => {
    return REPORTS.filter(r => filterType === 'all' || r.type === filterType);
  }, [filterType]);

  const activeReport = REPORTS.find(r => r.id === selectedReport) || REPORTS[0];

  const handleExport = () => {
    Alert.alert('Export', `Le rapport "${activeReport.title}" sera exporté en PDF.\n\nFonctionnalité disponible prochainement.`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Rapports SST</Text>
          <Text style={styles.screenSubtitle}>Tableaux de bord et indicateurs de performance santé-sécurité</Text>
        </View>
        <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
          <Ionicons name="download-outline" size={18} color="#FFF" />
          <Text style={styles.exportButtonText}>Exporter PDF</Text>
        </TouchableOpacity>
      </View>

      {/* Report Selector */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[{ v: 'all', l: 'Tous' }, { v: 'monthly', l: 'Mensuel' }, { v: 'quarterly', l: 'Trimestriel' }, { v: 'annual', l: 'Annuel' }].map(opt => (
            <TouchableOpacity key={opt.v} style={[styles.filterChip, filterType === opt.v && styles.filterChipActive]} onPress={() => setFilterType(opt.v)}>
              <Text style={[styles.filterChipText, filterType === opt.v && styles.filterChipTextActive]}>{opt.l}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Report Cards List */}
      <View style={styles.reportSelector}>
        {filteredReports.map(r => {
          const isActive = r.id === selectedReport;
          return (
            <TouchableOpacity key={r.id} style={[styles.reportTab, isActive && styles.reportTabActive]} onPress={() => setSelectedReport(r.id)} activeOpacity={0.7}>
              <View style={styles.reportTabHeader}>
                <View style={[styles.reportTypeBadge, { backgroundColor: isActive ? ACCENT + '20' : colors.surfaceVariant }]}>
                  <Text style={[styles.reportTypeText, isActive && { color: ACCENT }]}>{getReportTypeLabel(r.type)}</Text>
                </View>
                <Text style={styles.reportDate}>{new Date(r.generatedAt).toLocaleDateString('fr-CD')}</Text>
              </View>
              <Text style={[styles.reportTabTitle, isActive && { color: ACCENT }]}>{r.title}</Text>
              <Text style={styles.reportTabPeriod}>{r.period}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Active Report Display */}
      <View style={styles.reportDisplay}>
        <View style={styles.reportTitleRow}>
          <Ionicons name="document-text" size={24} color={ACCENT} />
          <View style={{ flex: 1 }}>
            <Text style={styles.reportDisplayTitle}>{activeReport.title}</Text>
            <Text style={styles.reportDisplayDesc}>{activeReport.description}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Indicateurs Clés</Text>
        <View style={styles.metricsGrid}>
          {activeReport.metrics.map((m, i) => (
            <MetricCard key={i} metric={m} inverted={m.label.includes('Incident') || m.label.includes('Arrêt') || m.label.includes('Accident') || m.label.includes('LTIFR') || m.label.includes('TRIFR')} />
          ))}
        </View>

        {/* Sector Breakdown Table */}
        {activeReport.sectorBreakdown && <SectorBreakdown data={activeReport.sectorBreakdown} />}

        {/* Quick Calculations */}
        <View style={styles.calculationsCard}>
          <Text style={styles.sectionTitle}>Calculs Automatiques</Text>
          <View style={styles.calcRow}>
            <View style={styles.calcItem}>
              <Text style={styles.calcLabel}>LTIFR</Text>
              <Text style={styles.calcFormula}>(LTI × 1,000,000) ÷ Heures travaillées</Text>
              <Text style={styles.calcValue}>{OccHealthUtils.calculateLTIFR(3, 1250000).toFixed(2)}</Text>
            </View>
            <View style={styles.calcItem}>
              <Text style={styles.calcLabel}>TRIFR</Text>
              <Text style={styles.calcFormula}>(Incidents × 1,000,000) ÷ Heures travaillées</Text>
              <Text style={styles.calcValue}>{OccHealthUtils.calculateTRIFR(8, 1250000).toFixed(2)}</Text>
            </View>
            <View style={styles.calcItem}>
              <Text style={styles.calcLabel}>Severity Rate</Text>
              <Text style={styles.calcFormula}>(Jours perdus × 1,000) ÷ Heures travaillées</Text>
              <Text style={styles.calcValue}>{OccHealthUtils.calculateSeverityRate(34, 1250000).toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  contentContainer: { padding: isDesktop ? 32 : 16, paddingBottom: 40 },
  header: { flexDirection: isDesktop ? 'row' : 'column', justifyContent: 'space-between', alignItems: isDesktop ? 'center' : 'flex-start', gap: 12, marginBottom: 24 },
  screenTitle: { fontSize: 24, fontWeight: '700', color: colors.text },
  screenSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  exportButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ACCENT, paddingHorizontal: 16, paddingVertical: 10, borderRadius: borderRadius.lg },
  exportButtonText: { color: '#FFF', fontWeight: '600', fontSize: 14 },

  filterBar: { marginBottom: 16 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: borderRadius.full, backgroundColor: colors.surfaceVariant, marginRight: 8 },
  filterChipActive: { backgroundColor: ACCENT },
  filterChipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  filterChipTextActive: { color: '#FFF', fontWeight: '600' },

  reportSelector: { gap: 10, marginBottom: 24 },
  reportTab: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 14, ...shadows.xs, borderWidth: 1, borderColor: 'transparent' },
  reportTabActive: { borderColor: ACCENT, ...shadows.sm },
  reportTabHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  reportTypeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  reportTypeText: { fontSize: 10, fontWeight: '600', color: colors.textSecondary },
  reportDate: { fontSize: 10, color: colors.textTertiary },
  reportTabTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  reportTabPeriod: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  reportDisplay: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 20, ...shadows.sm },
  reportTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.outline },
  reportDisplayTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  reportDisplayDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: ACCENT, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  metricCard: { borderRadius: borderRadius.lg, padding: 16, alignItems: 'center', minWidth: isDesktop ? 130 : 100, flex: 1, ...shadows.md },
  metricIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  metricValue: { fontSize: 20, fontWeight: '700', color: colors.text },
  metricLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },

  breakdownContainer: { marginBottom: 24 },
  breakdownHeader: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: colors.outline },
  breakdownHeadCell: { flex: 1, fontSize: 11, fontWeight: '700', color: colors.textSecondary, textAlign: 'center' },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.outline, borderRadius: 4 },
  breakdownCell: { flex: 1, fontSize: 13, color: colors.text, textAlign: 'center' },
  breakdownText: { fontSize: 12, color: colors.text },
  complianceDot: { width: 8, height: 8, borderRadius: 4 },

  calculationsCard: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.outline },
  calcRow: { flexDirection: isDesktop ? 'row' : 'column', gap: 12 },
  calcItem: { flex: 1, backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.lg, padding: 14 },
  calcLabel: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
  calcFormula: { fontSize: 10, color: colors.textSecondary, marginBottom: 8, fontStyle: 'italic' },
  calcValue: { fontSize: 24, fontWeight: '700', color: ACCENT },
});
