import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';

export interface TestResult {
  id: string;
  worker_name: string;
  test_date?: string;
  exam_date?: string;
  screening_date?: string;
  diagnosis_date?: string;
  assigned_date?: string;
  status?: string;
  [key: string]: any;
}

export interface KPI {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: 'up' | 'down' | 'stable';
}

interface TestDashboardProps {
  title: string;
  icon: string;
  accentColor: string;
  kpis: KPI[];
  lastResults: TestResult[];
  onAddNew: () => void;
  onSeeMore: () => void;
  onResultPress?: (result: TestResult) => void;
  loading?: boolean;
  onRefresh?: () => void;
  groupByField?: string; // e.g., 'hearing_loss_classification', 'exam_type', 'disease_type'
  groupLabels?: Record<string, string>; // e.g., { 'normal': 'Normal', 'mild': 'Légère' }
}

const getResultDate = (result: TestResult): string => {
  return (
    result.test_date ||
    result.exam_date ||
    result.screening_date ||
    result.diagnosis_date ||
    result.assigned_date ||
    new Date().toISOString()
  );
};

export function TestDashboard({
  title,
  icon,
  accentColor,
  kpis,
  lastResults,
  onAddNew,
  onSeeMore,
  onResultPress,
  loading = false,
  onRefresh,
  groupByField = 'status',
  groupLabels = {},
}: TestDashboardProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    setRefreshing(false);
  };

  // Get unique group values and their counts
  const getGroupData = () => {
    const groupMap = new Map<string, number>();
    lastResults.forEach(result => {
      const groupValue = result[groupByField] || 'Inconnu';
      const key = String(groupValue);
      groupMap.set(key, (groupMap.get(key) || 0) + 1);
    });
    return Array.from(groupMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  };

  const getGroupLabel = (key: string): string => {
    return groupLabels[key] || key;
  };

  const getGroupColor = (groupKey: string) => {
    // Color by status-like values if not custom labeled
    const key = groupKey.toLowerCase();
    if (key.includes('normal') || key.includes('négatif') || key.includes('conforme')) {
      return '#818CF8'; // Accent Light
    }
    if (key.includes('warning') || key.includes('léger') || key.includes('attention') || key.includes('mild') || key.includes('modéré')) {
      return '#5B65DC'; // Secondary Purple-Blue
    }
    if (key.includes('critical') || key.includes('sévère') || key.includes('positif') || key.includes('severe') || key.includes('profound')) {
      return '#0F1B42'; // Primary Blue Dark
    }
    return accentColor;
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) return colors.textSecondary;
    const statusLower = status.toLowerCase();
    if (statusLower.includes('normal') || statusLower.includes('négatif') || statusLower.includes('conforme')) {
      return '#818CF8'; // Accent Light
    }
    if (statusLower.includes('warning') || statusLower.includes('léger') || statusLower.includes('attention')) {
      return '#5B65DC'; // Secondary Purple-Blue
    }
    if (statusLower.includes('critical') || statusLower.includes('sévère') || statusLower.includes('positif')) {
      return '#0F1B42'; // Primary Blue Dark
    }
    return colors.textSecondary;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Ionicons name={icon as any} size={32} color={accentColor} />
            <Text style={styles.title}>{title}</Text>
          </View>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: accentColor }]}
            onPress={onAddNew}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* KPIs Section */}
        <View style={styles.kpisGrid}>
          {kpis.map((kpi, index) => (
            <View key={index} style={styles.kpiCard}>
              <View style={[styles.kpiIconContainer, { backgroundColor: kpi.color + '20' }]}>
                <Ionicons name={kpi.icon as any} size={24} color={kpi.color} />
              </View>
              <Text style={styles.kpiValue}>{kpi.value}</Text>
              <Text style={styles.kpiLabel}>{kpi.label}</Text>
              {kpi.trend && (
                <View style={styles.trendBadge}>
                  <Ionicons
                    name={kpi.trend === 'up' ? 'arrow-up' : kpi.trend === 'down' ? 'arrow-down' : 'remove'}
                    size={12}
                    color={kpi.trend === 'up' ? '#22C55E' : kpi.trend === 'down' ? '#EF4444' : colors.textSecondary}
                  />
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Last Results Section - Two Chart Layout */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Analyse des Résultats</Text>
            <TouchableOpacity onPress={onSeeMore} activeOpacity={0.7}>
              <Text style={[styles.seeMoreLink, { color: accentColor }]}>Voir plus</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={accentColor} />
            </View>
          ) : lastResults.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-outline" size={40} color={colors.textSecondary} />
              <Text style={styles.emptyText}>Aucun résultat disponible</Text>
            </View>
          ) : (
            <View style={styles.chartsGrid}>
              {/* Left: Group Distribution Chart */}
              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Ionicons name="pie-chart-outline" size={24} color={accentColor} />
                  <Text style={styles.chartTitle}>Distribution par {groupByField === 'status' ? 'Statut' : 'Catégorie'}</Text>
                </View>
                <View style={styles.chartContent}>
                  <View style={styles.departmentBars}>
                    {getGroupData().map(([groupKey, count], index) => {
                      const percentage = (count / lastResults.length) * 100;
                      return (
                        <View key={index} style={styles.departmentBar}>
                          <Text style={styles.departmentLabel}>{getGroupLabel(groupKey)}</Text>
                          <View style={styles.barContainer}>
                            <View
                              style={[
                                styles.bar,
                                {
                                  width: `${percentage}%`,
                                  backgroundColor: getGroupColor(groupKey),
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.barValue}>{count}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* Right: Top Categories Chart */}
              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Ionicons name="bar-chart-outline" size={24} color={accentColor} />
                  <Text style={styles.chartTitle}>Top Résultats</Text>
                </View>
                <View style={styles.chartContent}>
                  <View style={styles.departmentBars}>
                    {lastResults.slice(0, 5).map((result, index) => (
                      <View key={index} style={styles.departmentBar}>
                        <Text style={styles.departmentLabel} numberOfLines={1}>
                          {result.worker_name?.split(' ')[0] || 'N/A'}
                        </Text>
                        <View style={styles.barContainer}>
                          <View
                            style={[
                              styles.bar,
                              {
                                width: '70%',
                                backgroundColor: getStatusColor(result.status),
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.barValue}>{result.status || 'N/A'}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  kpisGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  kpiCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  kpiIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  trendBadge: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.outline,
    borderRadius: borderRadius.sm,
  },
  section: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  seeMoreLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  resultsList: {
    gap: spacing.sm,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.sm,
  },
  resultInfo: {
    flex: 1,
  },
  resultWorker: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  resultDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    marginHorizontal: spacing.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartsGrid: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  chartCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  chartContent: {
    flex: 1,
  },
  pieChartContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  pieChart: {
    flexDirection: 'row',
    height: 40,
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    ...shadows.sm,
  },
  pieSegment: {
    height: '100%',
  },
  chartLegend: {
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  departmentBars: {
    gap: spacing.md,
  },
  departmentBar: {
    gap: spacing.xs,
  },
  departmentLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
  },
  barContainer: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    height: 24,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  barValue: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  twoColumnLayout: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  leftColumn: {
    flex: 1,
    minWidth: 0,
  },
  rightColumn: {
    flex: 1,
    minWidth: 0,
  },
  columnTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  workersList: {
    gap: spacing.sm,
  },
  workerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...shadows.sm,
  },
  workerCardContent: {
    flex: 1,
  },
  workerName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  workerDate: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  workerStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  workerStatusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusCardsVertical: {
    gap: spacing.md,
  },
  statusCardVertical: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    ...shadows.md,
  },
  statusCardIconContainer: {
    marginRight: spacing.md,
  },
  statusCardTextContainer: {
    flex: 1,
  },
  statusCardsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  statusCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    minHeight: 140,
    ...shadows.md,
  },
  statusCardNormal: {
    backgroundColor: '#818CF8' + '10', // Accent Light
    borderColor: '#818CF8' + '30',
  },
  statusCardWarning: {
    backgroundColor: '#5B65DC' + '10', // Secondary Purple-Blue
    borderColor: '#5B65DC' + '30',
  },
  statusCardCritical: {
    backgroundColor: '#0F1B42' + '10', // Primary Blue Dark
    borderColor: '#0F1B42' + '30',
  },
  statusCardIcon: {
    marginBottom: spacing.sm,
  },
  statusCardCount: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statusCardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
