import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows } from '../../../theme/theme';
import { SECTOR_PROFILES, OccHealthUtils, type IndustrySector } from '../../../models/OccupationalHealth';
import { occHealthApi } from '../../../services/OccHealthApiService';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const ACCENT = colors.primary;

// ─── Display label maps ───────────────────────────────────────
const HAZARD_TYPE_LABELS: Record<string, string> = {
  physical: 'Physique',
  chemical: 'Chimique',
  biological: 'Biologique',
  ergonomic: 'Ergonomique',
  psychosocial: 'Psychosocial',
  environmental: 'Environnemental',
};

const HAZARD_TYPE_COLORS: Record<string, string> = {
  physical: '#3B82F6',
  chemical: '#EF4444',
  biological: '#22C55E',
  ergonomic: '#8B5CF6',
  psychosocial: '#EC4899',
  environmental: '#0891B2',
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Critique',
  fatal: 'Fatal',
  high: 'Élevé',
  major: 'Majeur',
  medium: 'Moyen',
  low: 'Faible',
  minor: 'Mineur',
};

const RISK_LEVEL_COLORS: Record<string, string> = {
  critical: '#EF4444',
  high: '#F59E0B',
  medium: '#8B5CF6',
  low: '#22C55E',
};

const CONTROL_TO_TREND: Record<string, 'up' | 'down' | 'stable'> = {
  excellent: 'down',
  good: 'down',
  fair: 'stable',
  poor: 'up',
  ineffective: 'up',
};

const INDICATOR_TREND_MAP: Record<string, { icon: 'trending-up' | 'trending-down' | 'remove'; color: string }> = {
  improving:  { icon: 'trending-down', color: '#22C55E' },
  stable:     { icon: 'remove',        color: '#94A3B8' },
  worsening:  { icon: 'trending-up',   color: '#EF4444' },
  insufficient_data: { icon: 'remove', color: '#94A3B8' },
};

// ─── Bar Chart (Simple) ─────────────────────────────────────
function SimpleBarChart({ data, valueKey, maxValue, barColor, label }: {
  data: Array<Record<string, any>>;
  valueKey: string;
  maxValue: number;
  barColor: string;
  label: string;
}) {
  if (!data.length) return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{label}</Text>
      <View style={{ alignItems: 'center', paddingVertical: 20 }}>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>Aucune donnée disponible</Text>
      </View>
    </View>
  );
  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{label}</Text>
      <View style={styles.chartBody}>
        {data.map((d, i) => {
          const val = Number(d[valueKey]);
          const height = Math.max(4, maxValue > 0 ? (val / maxValue) * 100 : 0);
          return (
            <View key={i} style={styles.barColumn}>
              <Text style={styles.barValue}>{Number.isInteger(val) ? val : val.toFixed(1)}</Text>
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
function HorizontalBarChart({ data }: { data: Array<{ label: string; count: number; color: string }> }) {
  const maxVal = Math.max(...data.map(d => d.count), 1);
  if (!data.length) return (
    <View style={{ alignItems: 'center', paddingVertical: 20 }}>
      <Text style={{ fontSize: 12, color: colors.textSecondary }}>Aucune donnée disponible</Text>
    </View>
  );
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
function SectorComparisonTable({ sectors, sectorDetails }: {
  sectors: Array<{ sector: string; name: string; workers: number }>;
  sectorDetails: Record<string, any>;
}) {
  if (!sectors.length) return (
    <View style={{ alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 12, color: colors.textSecondary }}>Aucun secteur disponible</Text>
    </View>
  );
  return (
    <View style={styles.tableContainer}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeadCell, { flex: 2 }]}>Secteur</Text>
        <Text style={styles.tableHeadCell}>Travailleurs</Text>
        <Text style={styles.tableHeadCell}>Incidents YTD</Text>
        <Text style={styles.tableHeadCell}>Aptitude</Text>
        <Text style={styles.tableHeadCell}>Maladies YTD</Text>
      </View>
      {sectors.map((row, i) => {
        const sp = SECTOR_PROFILES[row.sector as IndustrySector] ?? { icon: 'briefcase', label: row.name, color: '#808080' };
        const detail = sectorDetails[row.sector] ?? {};
        const activeW = detail.active_workers ?? row.workers;
        const fitW = (detail.fit_workers ?? 0) + (detail.restricted_workers ?? 0);
        const fitnessRate = activeW > 0 ? Math.round((fitW / activeW) * 100) : null;
        const incidents = detail.total_incidents_ytd ?? '—';
        const diseases = detail.total_diseases_ytd ?? '—';
        return (
          <View key={i} style={[styles.tableRow, i % 2 === 0 && { backgroundColor: colors.surfaceVariant }]}>
            <View style={[styles.tableCell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
              <Ionicons name={sp.icon as any} size={14} color={sp.color} />
              <Text style={styles.tableCellText}>{sp.label}</Text>
            </View>
            <Text style={[styles.tableCell, styles.tableCellText]}>{activeW}</Text>
            <Text style={[styles.tableCell, styles.tableCellText]}>{incidents}</Text>
            <Text style={[styles.tableCell, styles.tableCellText, {
              color: fitnessRate != null ? (fitnessRate >= 90 ? '#22C55E' : '#F59E0B') : colors.textSecondary,
              fontWeight: '600',
            }]}>{fitnessRate != null ? `${fitnessRate}%` : '—'}</Text>
            <Text style={[styles.tableCell, styles.tableCellText]}>{diseases}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────
export function AnalyticsScreen() {
  const [view, setView] = useState<'overview' | 'trends' | 'sectors' | 'risks'>('overview');
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<any>({});
  const [incidentStats, setIncidentStats] = useState<any>({});
  const [hazardStats, setHazardStats] = useState<any>({});
  const [highRiskHazards, setHighRiskHazards] = useState<any[]>([]);
  const [performanceIndicators, setPerformanceIndicators] = useState<any[]>([]);
  const [sectorDetails, setSectorDetails] = useState<Record<string, any>>({});

  useEffect(() => { loadAnalytics(); }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    const [statsRes, incidentRes, hazardRes, highRiskRes, kpiRes] = await Promise.allSettled([
      occHealthApi.getDashboardStats(),
      occHealthApi.getIncidentStatistics(),
      occHealthApi.getHazardIdentificationStats(),
      occHealthApi.listHighRiskHazards(),
      occHealthApi.listPerformanceIndicators(),
    ]);

    const stats = statsRes.status === 'fulfilled' ? (statsRes.value.data ?? {}) : {};
    if (statsRes.status === 'fulfilled') setDashboardStats(stats);
    if (incidentRes.status === 'fulfilled') setIncidentStats(incidentRes.value.data ?? {});
    if (hazardRes.status === 'fulfilled') setHazardStats(hazardRes.value.data ?? {});
    if (highRiskRes.status === 'fulfilled') setHighRiskHazards(highRiskRes.value.data ?? []);
    if (kpiRes.status === 'fulfilled') setPerformanceIndicators(kpiRes.value.data ?? []);

    // Load per-sector details in parallel
    const sectorKeys: string[] = (stats?.sectors ?? []).map((s: any) => s.sector).filter(Boolean);
    if (sectorKeys.length > 0) {
      const sectorResults = await Promise.allSettled(
        sectorKeys.map(sk => occHealthApi.getSectorAnalysis(sk))
      );
      const details: Record<string, any> = {};
      sectorResults.forEach((r, i) => {
        if (r.status === 'fulfilled') details[sectorKeys[i]] = r.value.data ?? {};
      });
      setSectorDetails(details);
    }
    setLoading(false);
  };

  // ─── Derived global stats ────────────────────────────────────
  const globalStats = useMemo(() => ({
    totalWorkers: dashboardStats?.active_workers ?? 0,
    totalIncidents: dashboardStats?.total_incidents_this_month ?? 0,
    avgLTIFR: String(dashboardStats?.ytd_ltifr ?? '—'),
    avgCompliance: Math.round(dashboardStats?.exam_compliance_rate ?? 0),
    avgFitness: Math.round(dashboardStats?.overall_fitness_rate ?? 0),
    totalExposures: hazardStats?.total_hazards ?? 0,
    sectors: (dashboardStats?.sectors ?? []).length,
  }), [dashboardStats, hazardStats]);

  // ─── Chart data ──────────────────────────────────────────────

  // Overview: incident bars from incidentStats.by_severity
  const incidentSeverityData = useMemo(() =>
    Object.entries(incidentStats?.by_severity ?? {})
      .slice(0, 7)
      .map(([k, v]) => ({ month: SEVERITY_LABELS[k] ?? k, incidents: Number(v) }))
  , [incidentStats]);

  // Overview: fitness bars from dashboardStats.fitness_overview
  const fitnessChartData = useMemo(() =>
    (dashboardStats?.fitness_overview ?? []).map((fo: any) => ({
      month: (fo.label ?? '').split(' ')[0],
      exams: fo.count ?? 0,
    }))
  , [dashboardStats]);

  // Trends: lagging & leading KPI bars from PerformanceIndicator.previous_values
  const lagKPIs = useMemo(() =>
    performanceIndicators.filter(p => p.indicator_type === 'lagging'), [performanceIndicators]);
  const leadKPIs = useMemo(() =>
    performanceIndicators.filter(p => p.indicator_type === 'leading'), [performanceIndicators]);

  const buildKPIChart = (kpis: any[], valueKey: string) => {
    if (!kpis.length) return [];
    const kpi = kpis[0];
    if (Array.isArray(kpi.previous_values) && kpi.previous_values.length > 0) {
      return kpi.previous_values.slice(-7).map((pv: any) => ({
        month: String(pv.date ?? '').slice(0, 7),
        [valueKey]: Number(pv.value ?? 0),
      }));
    }
    return [{ month: 'Actuel', [valueKey]: Number(kpi.current_value ?? 0) }];
  };

  const lagChart = useMemo(() => buildKPIChart(lagKPIs, 'ltifr'), [lagKPIs]);
  const leadChart = useMemo(() => buildKPIChart(leadKPIs, 'compliance'), [leadKPIs]);

  // Risks: hazard type distribution from hazardStats.by_type
  const riskDistribution = useMemo(() =>
    Object.entries(hazardStats?.by_type ?? {}).map(([k, v]) => ({
      label: HAZARD_TYPE_LABELS[k] ?? k,
      count: Number(v),
      color: HAZARD_TYPE_COLORS[k] ?? '#808080',
    }))
  , [hazardStats]);

  // ─── Render ──────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={{ marginTop: 12, color: colors.textSecondary, fontSize: 14 }}>Chargement des analytics…</Text>
      </View>
    );
  }


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
          { label: 'Patients', value: globalStats.totalWorkers, icon: 'people', color: '#3B82F6' },
          { label: 'Incidents', value: globalStats.totalIncidents, icon: 'warning', color: '#F59E0B' },
          { label: 'LTIFR Moy.', value: globalStats.avgLTIFR, icon: 'analytics', color: '#8B5CF6' },
          { label: 'Conformité', value: `${globalStats.avgCompliance}%`, icon: 'checkmark-circle', color: '#22C55E' },
          { label: 'Aptitude', value: `${globalStats.avgFitness}%`, icon: 'fitness', color: '#0891B2' },
          { label: 'Dangers', value: globalStats.totalExposures, icon: 'alert-circle', color: '#EF4444' },
        ].map((s, i) => (
          <View key={i} style={[styles.statCard, { backgroundColor: s.color }]}>
            <View style={styles.statIcon}>
              <Ionicons name={s.icon as any} size={18} color="#FFFFFF" />
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
              <SimpleBarChart
                data={incidentSeverityData}
                valueKey="incidents"
                maxValue={Math.max(...incidentSeverityData.map(d => d.incidents), 1)}
                barColor="#F59E0B"
                label="Incidents par Sévérité"
              />
            </View>
            <View style={styles.chartWrapper}>
              <SimpleBarChart
                data={fitnessChartData}
                valueKey="exams"
                maxValue={Math.max(...fitnessChartData.map((d: any) => d.exams), 1)}
                barColor="#3B82F6"
                label="Distribution Aptitude"
              />
            </View>
          </View>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Top 5 Dangers Critiques</Text>
            {highRiskHazards.slice(0, 5).length === 0 ? (
              <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', paddingVertical: 12 }}>
                Aucun danger critique enregistré
              </Text>
            ) : (
              highRiskHazards.slice(0, 5).map((h: any, i: number) => {
                const riskScore = h.risk_score_after ?? h.risk_score_before ?? 0;
                const riskColor = OccHealthUtils.getRiskScoreColor(riskScore);
                const trend = CONTROL_TO_TREND[h.control_effectiveness] ?? 'stable';
                const site = h.work_site?.name ?? h.enterprise?.name ?? h.location ?? '—';
                const hazardTypeKey = h.hazard_type ?? 'physical';
                return (
                  <View key={i} style={styles.hazardRow}>
                    <Text style={styles.hazardRank}>#{i + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.hazardName}>{h.description}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <Ionicons name="location-outline" size={12} color={HAZARD_TYPE_COLORS[hazardTypeKey] ?? '#808080'} />
                        <Text style={styles.hazardSite}>{site}</Text>
                        <Text style={{ fontSize: 10, color: colors.textSecondary }}>
                          · {HAZARD_TYPE_LABELS[hazardTypeKey] ?? hazardTypeKey}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <View style={[styles.scoreBadge, { backgroundColor: riskColor + '14' }]}>
                        <Text style={[styles.scoreText, { color: riskColor }]}>Score: {riskScore}</Text>
                      </View>
                      <Ionicons
                        name={trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove'}
                        size={16}
                        color={trend === 'up' ? '#EF4444' : trend === 'down' ? '#22C55E' : '#94A3B8'}
                      />
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </>
      )}

      {/* Trends View */}
      {view === 'trends' && (
        <>
          <View style={styles.chartsRow}>
            <View style={styles.chartWrapper}>
              <SimpleBarChart
                data={lagChart}
                valueKey="ltifr"
                maxValue={Math.max(...lagChart.map((d: any) => d.ltifr), 1)}
                barColor="#8B5CF6"
                label={lagKPIs[0] ? `${lagKPIs[0].indicator_name} (Retardé)` : 'Indicateurs Retardés'}
              />
            </View>
            <View style={styles.chartWrapper}>
              <SimpleBarChart
                data={leadChart}
                valueKey="compliance"
                maxValue={Math.max(...leadChart.map((d: any) => d.compliance), 1)}
                barColor="#22C55E"
                label={leadKPIs[0] ? `${leadKPIs[0].indicator_name} (Avancé)` : 'Indicateurs Avancés'}
              />
            </View>
          </View>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Indicateurs de Performance SST</Text>
            {performanceIndicators.length === 0 ? (
              <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', paddingVertical: 12 }}>
                Aucun indicateur configuré
              </Text>
            ) : (
              performanceIndicators.slice(0, 6).map((kpi: any, i: number) => {
                const trendInfo = INDICATOR_TREND_MAP[kpi.trend] ?? INDICATOR_TREND_MAP.insufficient_data;
                const currentVal = kpi.current_value != null ? Number(kpi.current_value).toFixed(1) : '—';
                const target = kpi.target_value != null ? `Cible: ${kpi.target_value} ${kpi.target_unit ?? ''}` : '';
                return (
                  <View key={kpi.id ?? i} style={styles.trendRow}>
                    <View style={[styles.trendIcon, { backgroundColor: trendInfo.color + '14' }]}>
                      <Ionicons name={trendInfo.icon} size={18} color={trendInfo.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.trendLabel}>{kpi.indicator_name}</Text>
                      <Text style={styles.trendDesc}>
                        Valeur actuelle: {currentVal} {kpi.target_unit ?? ''}{target ? ` · ${target}` : ''}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: kpi.indicator_type === 'leading' ? '#3B82F614' : '#F59E0B14', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: kpi.indicator_type === 'leading' ? '#3B82F6' : '#F59E0B' }}>
                        {kpi.indicator_type === 'leading' ? 'Avancé' : 'Retardé'}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </>
      )}

      {/* Sectors View */}
      {view === 'sectors' && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Comparaison par Secteur</Text>
          <ScrollView horizontal={!isDesktop} showsHorizontalScrollIndicator={true}>
            <SectorComparisonTable
              sectors={dashboardStats?.sectors ?? []}
              sectorDetails={sectorDetails}
            />
          </ScrollView>
        </View>
      )}

      {/* Risks View */}
      {view === 'risks' && (
        <>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Distribution des Risques par Type</Text>
            <HorizontalBarChart data={riskDistribution} />
          </View>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Risques par Niveau</Text>
            <View style={styles.heatmapContainer}>
              <View style={styles.heatmapHeader}>
                <View style={{ width: 80 }} />
                {['Critique', 'Élevé', 'Moyen', 'Faible'].map(r => (
                  <Text key={r} style={styles.heatmapColLabel}>{r}</Text>
                ))}
              </View>
              {Object.entries(hazardStats?.by_risk_level ?? {}).map(([level, count], ri) => {
                const numCount = Number(count);
                const maxForRow = Math.max(...Object.values(hazardStats?.by_risk_level ?? {}).map(Number), 1);
                const intensity = Math.round((numCount / maxForRow) * 5);
                const color = RISK_LEVEL_COLORS[level] ?? '#808080';
                return (
                  <View key={level} style={styles.heatmapRow}>
                    <Text style={styles.heatmapRowLabel}>{HAZARD_TYPE_LABELS[level] ?? level}</Text>
                    {['critical', 'high', 'medium', 'low'].map(col => {
                      const isMatch = col === level;
                      const bg = isMatch ? `${RISK_LEVEL_COLORS[col]}${Math.round(((numCount / maxForRow) || 0.1) * 255).toString(16).padStart(2, '0')}` : `${colors.surfaceVariant}`;
                      return (
                        <View key={col} style={[styles.heatmapCell, { backgroundColor: bg }]}>
                          <Text style={styles.heatmapCellText}>{isMatch ? numCount : ''}</Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
              {Object.keys(hazardStats?.by_risk_level ?? {}).length === 0 && (
                <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center', paddingVertical: 12 }}>
                  Aucune donnée de niveau de risque disponible
                </Text>
              )}
            </View>
            <View style={styles.heatmapLegend}>
              {[
                { l: `Critique: ${hazardStats?.by_risk_level?.critical ?? 0}`, c: RISK_LEVEL_COLORS.critical },
                { l: `Élevé: ${hazardStats?.by_risk_level?.high ?? 0}`, c: RISK_LEVEL_COLORS.high },
                { l: `Moyen: ${hazardStats?.by_risk_level?.medium ?? 0}`, c: RISK_LEVEL_COLORS.medium },
                { l: `Faible: ${hazardStats?.by_risk_level?.low ?? 0}`, c: RISK_LEVEL_COLORS.low },
              ].map((l, i) => (
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
  statCard: { flex: 1, minWidth: isDesktop ? 120 : 90, borderRadius: borderRadius.xl, padding: 14, alignItems: 'center', ...shadows.md },
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
  tableContainer: { minWidth: isDesktop ? '100%' : 800, maxWidth: '100%' },
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
