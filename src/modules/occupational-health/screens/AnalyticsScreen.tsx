import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows } from '../../../theme/theme';
import { SECTOR_PROFILES, OccHealthUtils, type IndustrySector } from '../../../models/OccupationalHealth';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const ACCENT = '#D97706';

// ─── Mock Trend Data ─────────────────────────────────────────
const MONTHLY_TRENDS = [
  { month: 'Juil', incidents: 12, exams: 120, ltifr: 3.2, compliance: 78 },
  { month: 'Août', incidents: 10, exams: 115, ltifr: 2.9, compliance: 79 },
  { month: 'Sep', incidents: 11, exams: 130, ltifr: 3.0, compliance: 80 },
  { month: 'Oct', incidents: 8, exams: 140, ltifr: 2.6, compliance: 82 },
  { month: 'Nov', incidents: 9, exams: 135, ltifr: 2.7, compliance: 84 },
  { month: 'Déc', incidents: 7, exams: 142, ltifr: 2.4, compliance: 85 },
  { month: 'Jan', incidents: 8, exams: 145, ltifr: 2.4, compliance: 87 },
];

const SECTOR_ANALYTICS: { sector: IndustrySector; workers: number; incidents: number; ltifr: number; compliance: number; avgRiskScore: number; fitness: number }[] = [
  { sector: 'mining', workers: 250, incidents: 18, ltifr: 3.6, compliance: 82, avgRiskScore: 14.5, fitness: 85 },
  { sector: 'manufacturing', workers: 120, incidents: 8, ltifr: 2.1, compliance: 88, avgRiskScore: 10.2, fitness: 90 },
  { sector: 'construction', workers: 80, incidents: 12, ltifr: 4.2, compliance: 75, avgRiskScore: 13.8, fitness: 82 },
  { sector: 'healthcare', workers: 45, incidents: 3, ltifr: 1.5, compliance: 95, avgRiskScore: 8.5, fitness: 94 },
  { sector: 'banking_finance', workers: 35, incidents: 1, ltifr: 0.5, compliance: 92, avgRiskScore: 5.2, fitness: 96 },
  { sector: 'telecommunications', workers: 25, incidents: 2, ltifr: 1.2, compliance: 90, avgRiskScore: 6.8, fitness: 93 },
];

const RISK_DISTRIBUTION = [
  { label: 'Bruit', count: 45, color: '#3B82F6' },
  { label: 'Poussières', count: 38, color: '#D97706' },
  { label: 'Ergonomique', count: 32, color: '#8B5CF6' },
  { label: 'Psychosocial', count: 28, color: '#EC4899' },
  { label: 'Chimique', count: 22, color: '#EF4444' },
  { label: 'Biologique', count: 15, color: '#22C55E' },
  { label: 'Vibrations', count: 12, color: '#0891B2' },
  { label: 'Chaleur', count: 8, color: '#F59E0B' },
];

const TOP_HAZARDS = [
  { hazard: 'Exposition silice > VLE', score: 20, site: 'Kamoto Mines', sector: 'mining' as IndustrySector, trend: 'stable' as const },
  { hazard: 'Bruit > 95 dB(A) concassage', score: 18, site: 'Usine Likasi', sector: 'manufacturing' as IndustrySector, trend: 'down' as const },
  { hazard: 'AES chirurgie', score: 16, site: 'Hôpital Sendwe', sector: 'healthcare' as IndustrySector, trend: 'up' as const },
  { hazard: 'Chutes échafaudages', score: 15, site: 'Chantier Kolwezi', sector: 'construction' as IndustrySector, trend: 'down' as const },
  { hazard: 'Burnout call center', score: 14, site: 'Siège Rawbank', sector: 'banking_finance' as IndustrySector, trend: 'up' as const },
];

// ─── Bar Chart (Simple) ─────────────────────────────────────
function SimpleBarChart({ data, valueKey, maxValue, barColor, label }: { data: typeof MONTHLY_TRENDS; valueKey: keyof typeof MONTHLY_TRENDS[0]; maxValue: number; barColor: string; label: string }) {
  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{label}</Text>
      <View style={styles.chartBody}>
        {data.map((d, i) => {
          const val = Number(d[valueKey]);
          const height = Math.max(4, (val / maxValue) * 100);
          return (
            <View key={i} style={styles.barColumn}>
              <Text style={styles.barValue}>{val}</Text>
              <View style={[styles.bar, { height, backgroundColor: barColor }]} />
              <Text style={styles.barLabel}>{d.month}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Horizontal Bar ──────────────────────────────────────────
function HorizontalBarChart({ data }: { data: typeof RISK_DISTRIBUTION }) {
  const maxVal = Math.max(...data.map(d => d.count));
  return (
    <View style={styles.hBarContainer}>
      {data.map((d, i) => (
        <View key={i} style={styles.hBarRow}>
          <Text style={styles.hBarLabel}>{d.label}</Text>
          <View style={styles.hBarTrack}>
            <View style={[styles.hBarFill, { width: `${(d.count / maxVal) * 100}%`, backgroundColor: d.color }]} />
          </View>
          <Text style={styles.hBarValue}>{d.count}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Sector Comparison Table ─────────────────────────────────
function SectorComparisonTable() {
  return (
    <View style={styles.tableContainer}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeadCell, { flex: 2 }]}>Secteur</Text>
        <Text style={styles.tableHeadCell}>Travailleurs</Text>
        <Text style={styles.tableHeadCell}>Incidents</Text>
        <Text style={styles.tableHeadCell}>LTIFR</Text>
        <Text style={styles.tableHeadCell}>Conformité</Text>
        <Text style={styles.tableHeadCell}>Aptitude</Text>
        <Text style={styles.tableHeadCell}>Risque Moy.</Text>
      </View>
      {SECTOR_ANALYTICS.map((row, i) => {
        const sp = SECTOR_PROFILES[row.sector];
        return (
          <View key={i} style={[styles.tableRow, i % 2 === 0 && { backgroundColor: colors.surfaceVariant }]}>
            <View style={[styles.tableCell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
              <Ionicons name={sp.icon as any} size={14} color={sp.color} />
              <Text style={styles.tableCellText}>{sp.label}</Text>
            </View>
            <Text style={[styles.tableCell, styles.tableCellText]}>{row.workers}</Text>
            <Text style={[styles.tableCell, styles.tableCellText]}>{row.incidents}</Text>
            <Text style={[styles.tableCell, styles.tableCellText, { color: row.ltifr > 3 ? '#EF4444' : row.ltifr > 2 ? '#F59E0B' : '#22C55E', fontWeight: '600' }]}>{row.ltifr}</Text>
            <Text style={[styles.tableCell, styles.tableCellText, { color: OccHealthUtils.getComplianceColor(row.compliance), fontWeight: '600' }]}>{row.compliance}%</Text>
            <Text style={[styles.tableCell, styles.tableCellText, { color: row.fitness >= 90 ? '#22C55E' : '#F59E0B', fontWeight: '600' }]}>{row.fitness}%</Text>
            <Text style={[styles.tableCell, styles.tableCellText, { color: OccHealthUtils.getRiskScoreColor(row.avgRiskScore), fontWeight: '600' }]}>{row.avgRiskScore}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────
export function AnalyticsScreen() {
  const [view, setView] = useState<'overview' | 'trends' | 'sectors' | 'risks'>('overview');

  const globalStats = useMemo(() => {
    const totalWorkers = SECTOR_ANALYTICS.reduce((s, a) => s + a.workers, 0);
    const totalIncidents = SECTOR_ANALYTICS.reduce((s, a) => s + a.incidents, 0);
    const avgLTIFR = SECTOR_ANALYTICS.reduce((s, a) => s + a.ltifr * a.workers, 0) / totalWorkers;
    const avgCompliance = SECTOR_ANALYTICS.reduce((s, a) => s + a.compliance * a.workers, 0) / totalWorkers;
    const avgFitness = SECTOR_ANALYTICS.reduce((s, a) => s + a.fitness * a.workers, 0) / totalWorkers;
    const totalExposures = RISK_DISTRIBUTION.reduce((s, r) => s + r.count, 0);
    return { totalWorkers, totalIncidents, avgLTIFR: avgLTIFR.toFixed(1), avgCompliance: Math.round(avgCompliance), avgFitness: Math.round(avgFitness), totalExposures, sectors: SECTOR_ANALYTICS.length };
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Analytics SST</Text>
          <Text style={styles.screenSubtitle}>Analyses et tendances en santé-sécurité au travail</Text>
        </View>
      </View>

      {/* View Selector */}
      <View style={styles.viewSelector}>
        {[
          { v: 'overview', l: 'Vue Globale', i: 'grid' },
          { v: 'trends', l: 'Tendances', i: 'trending-up' },
          { v: 'sectors', l: 'Secteurs', i: 'business' },
          { v: 'risks', l: 'Risques', i: 'warning' },
        ].map(opt => (
          <TouchableOpacity key={opt.v} style={[styles.viewTab, view === opt.v && styles.viewTabActive]} onPress={() => setView(opt.v as any)}>
            <Ionicons name={opt.i as any} size={16} color={view === opt.v ? '#FFF' : colors.textSecondary} />
            <Text style={[styles.viewTabText, view === opt.v && styles.viewTabTextActive]}>{opt.l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        {[
          { label: 'Travailleurs', value: globalStats.totalWorkers, icon: 'people', color: '#3B82F6' },
          { label: 'Incidents', value: globalStats.totalIncidents, icon: 'warning', color: '#F59E0B' },
          { label: 'LTIFR Moy.', value: globalStats.avgLTIFR, icon: 'analytics', color: '#8B5CF6' },
          { label: 'Conformité', value: `${globalStats.avgCompliance}%`, icon: 'checkmark-circle', color: '#22C55E' },
          { label: 'Aptitude', value: `${globalStats.avgFitness}%`, icon: 'fitness', color: '#0891B2' },
          { label: 'Expositions', value: globalStats.totalExposures, icon: 'alert-circle', color: '#EF4444' },
        ].map((s, i) => (
          <View key={i} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: s.color + '14' }]}>
              <Ionicons name={s.icon as any} size={18} color={s.color} />
            </View>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Overview View */}
      {view === 'overview' && (
        <>
          <View style={styles.chartsRow}>
            <View style={styles.chartWrapper}>
              <SimpleBarChart data={MONTHLY_TRENDS} valueKey="incidents" maxValue={15} barColor="#F59E0B" label="Incidents (6 mois)" />
            </View>
            <View style={styles.chartWrapper}>
              <SimpleBarChart data={MONTHLY_TRENDS} valueKey="exams" maxValue={160} barColor="#3B82F6" label="Examens Réalisés" />
            </View>
          </View>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Top 5 Dangers Critiques</Text>
            {TOP_HAZARDS.map((h, i) => {
              const sp = SECTOR_PROFILES[h.sector];
              const riskColor = OccHealthUtils.getRiskScoreColor(h.score);
              return (
                <View key={i} style={styles.hazardRow}>
                  <Text style={styles.hazardRank}>#{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.hazardName}>{h.hazard}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <Ionicons name={sp.icon as any} size={12} color={sp.color} />
                      <Text style={styles.hazardSite}>{h.site}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={[styles.scoreBadge, { backgroundColor: riskColor + '14' }]}>
                      <Text style={[styles.scoreText, { color: riskColor }]}>Score: {h.score}</Text>
                    </View>
                    <Ionicons name={h.trend === 'up' ? 'trending-up' : h.trend === 'down' ? 'trending-down' : 'remove'} size={16} color={h.trend === 'up' ? '#EF4444' : h.trend === 'down' ? '#22C55E' : '#94A3B8'} />
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* Trends View */}
      {view === 'trends' && (
        <>
          <View style={styles.chartsRow}>
            <View style={styles.chartWrapper}>
              <SimpleBarChart data={MONTHLY_TRENDS} valueKey="ltifr" maxValue={4} barColor="#8B5CF6" label="Évolution LTIFR" />
            </View>
            <View style={styles.chartWrapper}>
              <SimpleBarChart data={MONTHLY_TRENDS} valueKey="compliance" maxValue={100} barColor="#22C55E" label="Évolution Conformité (%)" />
            </View>
          </View>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Indicateurs Clés de Tendance</Text>
            {[
              { label: 'Incidents en baisse', desc: '-42% sur 6 mois (de 12 à 7)', icon: 'trending-down', color: '#22C55E' },
              { label: 'Examens en hausse', desc: '+21% sur 6 mois (de 120 à 145)', icon: 'trending-up', color: '#3B82F6' },
              { label: 'LTIFR en amélioration', desc: 'De 3.2 à 2.4 (-25%)', icon: 'trending-down', color: '#22C55E' },
              { label: 'Conformité en hausse', desc: 'De 78% à 87% (+9 pts)', icon: 'trending-up', color: '#22C55E' },
            ].map((t, i) => (
              <View key={i} style={styles.trendRow}>
                <View style={[styles.trendIcon, { backgroundColor: t.color + '14' }]}>
                  <Ionicons name={t.icon as any} size={18} color={t.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.trendLabel}>{t.label}</Text>
                  <Text style={styles.trendDesc}>{t.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Sectors View */}
      {view === 'sectors' && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Comparaison par Secteur</Text>
          <ScrollView horizontal={!isDesktop} showsHorizontalScrollIndicator={true}>
            <SectorComparisonTable />
          </ScrollView>
        </View>
      )}

      {/* Risks View */}
      {view === 'risks' && (
        <>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Distribution des Risques par Type</Text>
            <HorizontalBarChart data={RISK_DISTRIBUTION} />
          </View>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Heatmap Risques par Secteur</Text>
            <View style={styles.heatmapContainer}>
              <View style={styles.heatmapHeader}>
                <View style={{ width: 80 }} />
                {['Bruit', 'Chimique', 'Ergo', 'Psycho', 'Bio'].map(r => (
                  <Text key={r} style={styles.heatmapColLabel}>{r}</Text>
                ))}
              </View>
              {[
                { sector: 'Mines', values: [4, 5, 3, 2, 1] },
                { sector: 'Industrie', values: [5, 3, 3, 2, 1] },
                { sector: 'BTP', values: [3, 2, 5, 2, 1] },
                { sector: 'Santé', values: [1, 2, 3, 4, 5] },
                { sector: 'Banque', values: [1, 1, 4, 5, 1] },
              ].map((row, ri) => (
                <View key={ri} style={styles.heatmapRow}>
                  <Text style={styles.heatmapRowLabel}>{row.sector}</Text>
                  {row.values.map((v, ci) => {
                    const opacity = v / 5;
                    const bg = v >= 4 ? `rgba(239,68,68,${opacity})` : v >= 3 ? `rgba(245,158,11,${opacity})` : `rgba(34,197,94,${opacity * 0.8})`;
                    return (
                      <View key={ci} style={[styles.heatmapCell, { backgroundColor: bg }]}>
                        <Text style={styles.heatmapCellText}>{v}</Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
            <View style={styles.heatmapLegend}>
              {[{ l: 'Faible (1)', c: 'rgba(34,197,94,0.3)' }, { l: 'Modéré (2-3)', c: 'rgba(245,158,11,0.5)' }, { l: 'Élevé (4-5)', c: 'rgba(239,68,68,0.7)' }].map((l, i) => (
                <View key={i} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: l.c }]} />
                  <Text style={styles.legendText}>{l.l}</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  contentContainer: { padding: isDesktop ? 32 : 16, paddingBottom: 40 },
  header: { marginBottom: 24 },
  screenTitle: { fontSize: 24, fontWeight: '700', color: colors.text },
  screenSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },

  viewSelector: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 4, marginBottom: 20, ...shadows.xs },
  viewTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: borderRadius.lg },
  viewTabActive: { backgroundColor: ACCENT },
  viewTabText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  viewTabTextActive: { color: '#FFF', fontWeight: '600' },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: { flex: 1, minWidth: isDesktop ? 120 : 90, backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 12, alignItems: 'center', ...shadows.xs },
  statIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 2, textAlign: 'center' },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: ACCENT, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

  chartsRow: { flexDirection: isDesktop ? 'row' : 'column', gap: 16, marginBottom: 24 },
  chartWrapper: { flex: 1 },
  chartContainer: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 20, ...shadows.sm },
  chartTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 16, textAlign: 'center' },
  chartBody: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 120 },
  barColumn: { alignItems: 'center', gap: 4 },
  barValue: { fontSize: 10, fontWeight: '600', color: colors.text },
  bar: { width: isDesktop ? 28 : 22, borderRadius: 4 },
  barLabel: { fontSize: 10, color: colors.textSecondary },

  sectionCard: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 20, marginBottom: 20, ...shadows.sm },

  hazardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.outline },
  hazardRank: { fontSize: 14, fontWeight: '700', color: ACCENT, width: 24 },
  hazardName: { fontSize: 13, fontWeight: '600', color: colors.text },
  hazardSite: { fontSize: 11, color: colors.textSecondary },
  scoreBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  scoreText: { fontSize: 10, fontWeight: '700' },

  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.outline },
  trendIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  trendLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  trendDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  // Table
  tableContainer: { minWidth: isDesktop ? '100%' : 700 },
  tableHeader: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: colors.outline },
  tableHeadCell: { flex: 1, fontSize: 11, fontWeight: '700', color: colors.textSecondary, textAlign: 'center' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.outline, borderRadius: 4 },
  tableCell: { flex: 1, textAlign: 'center' },
  tableCellText: { fontSize: 12, color: colors.text },

  // Horizontal Bars
  hBarContainer: { gap: 10 },
  hBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hBarLabel: { width: 80, fontSize: 12, color: colors.text, textAlign: 'right' },
  hBarTrack: { flex: 1, height: 20, backgroundColor: colors.surfaceVariant, borderRadius: 10, overflow: 'hidden' },
  hBarFill: { height: '100%', borderRadius: 10, minWidth: 4 },
  hBarValue: { width: 30, fontSize: 12, fontWeight: '600', color: colors.text },

  // Heatmap
  heatmapContainer: { gap: 2 },
  heatmapHeader: { flexDirection: 'row', marginBottom: 4 },
  heatmapColLabel: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '600', color: colors.textSecondary },
  heatmapRow: { flexDirection: 'row', gap: 2 },
  heatmapRowLabel: { width: 80, fontSize: 11, fontWeight: '500', color: colors.text, textAlignVertical: 'center', paddingVertical: 8 },
  heatmapCell: { flex: 1, height: 36, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  heatmapCellText: { fontSize: 12, fontWeight: '700', color: colors.text },
  heatmapLegend: { flexDirection: 'row', gap: 16, marginTop: 12, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 12, height: 12, borderRadius: 3 },
  legendText: { fontSize: 10, color: colors.textSecondary },
});
