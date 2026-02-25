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
}: TestDashboardProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    setRefreshing(false);
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) return colors.textSecondary;
    const statusLower = status.toLowerCase();
    if (statusLower.includes('normal') || statusLower.includes('négatif') || statusLower.includes('conforme')) {
      return '#22C55E';
    }
    if (statusLower.includes('warning') || statusLower.includes('léger') || statusLower.includes('attention')) {
      return '#F59E0B';
    }
    if (statusLower.includes('critical') || statusLower.includes('sévère') || statusLower.includes('positif')) {
      return '#EF4444';
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

        {/* Last Results Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Derniers Résultats</Text>
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
            <View style={styles.resultsList}>
              {lastResults.slice(0, 5).map((result) => (
                <TouchableOpacity
                  key={result.id}
                  style={styles.resultItem}
                  onPress={() => onResultPress?.(result)}
                  activeOpacity={0.7}
                >
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultWorker}>{result.worker_name}</Text>
                    <Text style={styles.resultDate}>
                      {new Date(getResultDate(result)).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(result.status) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(result.status) },
                      ]}
                    >
                      {result.status || 'Aucun statut'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              ))}
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
});
