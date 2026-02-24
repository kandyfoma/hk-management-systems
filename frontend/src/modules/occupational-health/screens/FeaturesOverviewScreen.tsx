import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions,
  FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';

const { width } = Dimensions.get('window');

// ─── Types ──────────────────────────────────────────────────────
interface Feature {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'medical' | 'security' | 'compliance' | 'reports' | 'management';
  status: 'complete' | 'partial' | 'pending';
  screenId?: string;
  metrics?: {
    label: string;
    value: number | string;
    color?: string;
  }[];
  subFeatures?: string[];
}

interface FeatureCategory {
  id: 'medical' | 'security' | 'compliance' | 'reports' | 'management';
  name: string;
  icon: string;
  description: string;
  color: string;
}

// ─── Feature Definitions ────────────────────────────────────────
const FEATURES: Feature[] = [
  // Medical
  {
    id: 'medical-exams',
    name: 'Visites Médicales',
    description: 'Examens d\'aptitude et consultations',
    icon: 'medkit',
    category: 'medical',
    status: 'complete',
    screenId: 'medical-exams',
    metrics: [
      { label: 'Pending', value: 12, color: '#F59E0B' },
      { label: 'Completed', value: 248, color: '#22C55E' },
    ],
  },
  {
    id: 'exam-management',
    name: 'Gestion Examens',
    description: 'Planification et suivi des examens',
    icon: 'document',
    category: 'medical',
    status: 'complete',
    screenId: 'exam-management',
    metrics: [
      { label: 'Scheduled', value: 24, color: '#3B82F6' },
      { label: 'Completed', value: 156, color: '#22C55E' },
    ],
    subFeatures: ['Exam Scheduling', 'Results Tracking', 'Test Visualization'],
  },
  {
    id: 'certificates',
    name: 'Certificats d\'Aptitude',
    description: 'Génération et suivi des certificats',
    icon: 'shield-checkmark',
    category: 'medical',
    status: 'complete',
    screenId: 'certificates',
    metrics: [
      { label: 'Issued', value: 89, color: '#22C55E' },
      { label: 'Expiring', value: 7, color: '#F59E0B' },
    ],
    subFeatures: ['Simple Format', 'Detailed Format', 'PDF Export'],
  },
  {
    id: 'surveillance',
    name: 'Programmes Surveillance',
    description: 'Surveillance médicale par groupe de risque',
    icon: 'eye',
    category: 'medical',
    status: 'complete',
    screenId: 'surveillance',
    metrics: [
      { label: 'Active', value: 15, color: '#3B82F6' },
      { label: 'Due', value: 32, color: '#F59E0B' },
    ],
  },
  {
    id: 'diseases',
    name: 'Maladies Professionnelles',
    description: 'Registre ILO R194 des pathologies',
    icon: 'fitness',
    category: 'medical',
    status: 'complete',
    screenId: 'diseases',
    metrics: [
      { label: 'Registered', value: 23, color: '#EF4444' },
    ],
  },

  // Security
  {
    id: 'incidents',
    name: 'Incidents & Accidents',
    description: 'Signalement et investigation d\'accidents',
    icon: 'warning',
    category: 'security',
    status: 'complete',
    screenId: 'incident-dashboard',
    metrics: [
      { label: 'Open', value: 8, color: '#F59E0B' },
      { label: 'LTI', value: 2, color: '#DC2626' },
      { label: 'Critical', value: 1, color: '#DC2626' },
    ],
    subFeatures: ['Dashboard', 'Investigation Workflow', 'CAPA Management', 'LTI Tracking'],
  },
  {
    id: 'risk-assessment',
    name: 'Évaluation des Risques',
    description: 'Matrice de risques et cartographie',
    icon: 'alert-circle',
    category: 'security',
    status: 'complete',
    screenId: 'risk-assessment',
    metrics: [
      { label: 'High Risk', value: 12, color: '#EF4444' },
      { label: 'Medium Risk', value: 28, color: '#F59E0B' },
    ],
  },
  {
    id: 'exposure-monitoring',
    name: 'Monitoring Expositions',
    description: 'Suivi des expositions professionnelles',
    icon: 'water',
    category: 'security',
    status: 'complete',
    screenId: 'exposure-monitoring',
    metrics: [
      { label: 'Safe', value: 156, color: '#22C55E' },
      { label: 'Exceeded', value: 5, color: '#EF4444' },
    ],
    subFeatures: ['Real-time Monitoring', 'Limit Alerts', '6 Exposure Types'],
  },
  {
    id: 'ppe-management',
    name: 'Gestion des EPI',
    description: 'Attribution et suivi des équipements',
    icon: 'body',
    category: 'security',
    status: 'complete',
    screenId: 'ppe-management',
    metrics: [
      { label: 'Active', value: 342, color: '#3B82F6' },
      { label: 'Expiring', value: 18, color: '#F59E0B' },
    ],
  },

  // Compliance
  {
    id: 'compliance',
    name: 'Conformité Réglementaire',
    description: 'ISO 45001, ILO standards, legislations',
    icon: 'checkmark-circle',
    category: 'compliance',
    status: 'complete',
    screenId: 'compliance',
    metrics: [
      { label: 'Compliant', value: 45, color: '#22C55E' },
      { label: 'Partial', value: 12, color: '#F59E0B' },
    ],
    subFeatures: ['ISO 45001', 'ILO Standards', 'National Legislation'],
  },
  {
    id: 'iso-27001',
    name: 'ISO 27001 - Sécurité Informations',
    description: 'Gestion de la sécurité de l\'information',
    icon: 'lock',
    category: 'compliance',
    status: 'complete',
    metrics: [
      { label: 'Models', value: 8, color: '#3B82F6' },
      { label: 'Endpoints', value: 15, color: '#3B82F6' },
    ],
    subFeatures: ['Audit Logging', 'Access Control', 'Incident Management'],
  },
  {
    id: 'iso-45001',
    name: 'ISO 45001 - Santé & Sécurité',
    description: 'Système de management SSL',
    icon: 'shield',
    category: 'compliance',
    status: 'complete',
    metrics: [
      { label: 'Models', value: 13, color: '#3B82F6' },
      { label: 'Endpoints', value: 25, color: '#3B82F6' },
    ],
    subFeatures: ['Hazard Register', 'Investigation', 'Health Surveillance'],
  },

  // Reports
  {
    id: 'reports',
    name: 'Rapports SST',
    description: 'Tableaux de bord et rapports',
    icon: 'stats-chart',
    category: 'reports',
    status: 'partial',
    screenId: 'reports',
    metrics: [
      { label: 'Monthly', value: 12, color: '#3B82F6' },
      { label: 'Annual', value: 2, color: '#3B82F6' },
    ],
  },
  {
    id: 'analytics',
    name: 'Analytiques Avancées',
    description: 'Analyses prédictives et benchmarking',
    icon: 'analytics',
    category: 'reports',
    status: 'partial',
    screenId: 'analytics',
    metrics: [
      { label: 'KPIs', value: 28, color: '#3B82F6' },
    ],
  },

  // Management
  {
    id: 'patients',
    name: 'Gestion Patients',
    description: 'Registre des patients et profils',
    icon: 'people',
    category: 'management',
    status: 'partial',
    screenId: 'patients',
    metrics: [
      { label: 'Active', value: 1243, color: '#3B82F6' },
      { label: 'New', value: 23, color: '#10B981' },
    ],
  },
  {
    id: 'enterprise',
    name: 'Gestion Enterprise',
    description: 'Entreprises et sites multiples',
    icon: 'business',
    category: 'management',
    status: 'partial',
    metrics: [
      { label: 'Companies', value: 18, color: '#3B82F6' },
      { label: 'Sites', value: 53, color: '#3B82F6' },
    ],
  },
];

// ─── Category Definitions ────────────────────────────────────────
const CATEGORIES: Record<string, FeatureCategory> = {
  medical: {
    id: 'medical',
    name: 'Médecine du Travail',
    icon: 'medkit',
    description: 'Examens, suivi de santé et certificats',
    color: '#EC4899',
  },
  security: {
    id: 'security',
    name: 'Sécurité au Travail',
    icon: 'warning',
    description: 'Incidents, risques et expositions',
    color: '#F59E0B',
  },
  compliance: {
    id: 'compliance',
    name: 'Conformité & Standards',
    icon: 'checkmark-circle',
    description: 'Norms ISO, ILO et régulations',
    color: '#3B82F6',
  },
  reports: {
    id: 'reports',
    name: 'Rapports & Analytiques',
    icon: 'stats-chart',
    description: 'Tableaux de bord et analyses',
    color: '#8B5CF6',
  },
  management: {
    id: 'management',
    name: 'Gestion Générale',
    icon: 'cog',
    description: 'Patients, entreprises, administration',
    color: '#10B981',
  },
};

// ─── Status Badge ────────────────────────────────────────────────
function StatusBadge({ status }: { status: 'complete' | 'partial' | 'pending' }) {
  const config = {
    complete: { color: '#22C55E', label: 'Complete', icon: 'checkmark-circle' },
    partial: { color: '#F59E0B', label: 'Partial', icon: 'alert-circle' },
    pending: { color: '#EF4444', label: 'Pending', icon: 'close-circle' },
  }[status];

  return (
    <View style={[styles.statusBadge, { backgroundColor: config.color + '20' }]}>
      <Ionicons name={config.icon as any} size={12} color={config.color} />
      <Text style={[styles.statusBadgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

// ─── Feature Card ───────────────────────────────────────────────
function FeatureCard({
  feature,
  onPress,
}: {
  feature: Feature;
  onPress: () => void;
}) {
  const category = CATEGORIES[feature.category];

  return (
    <TouchableOpacity
      style={[styles.featureCard, styles.cardShadow]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: category.color + '20' }]}>
          <Ionicons name={feature.icon as any} size={28} color={category.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.featureName}>{feature.name}</Text>
          <Text style={styles.featureDesc} numberOfLines={1}>{feature.description}</Text>
        </View>
        <StatusBadge status={feature.status} />
      </View>

      {feature.metrics && feature.metrics.length > 0 && (
        <View style={styles.metricsRow}>
          {feature.metrics.map((metric, idx) => (
            <View key={idx} style={styles.metric}>
              <Text style={styles.metricLabel}>{metric.label}</Text>
              <Text style={[styles.metricValue, metric.color && { color: metric.color }]}>
                {metric.value}
              </Text>
            </View>
          ))}
        </View>
      )}

      {feature.subFeatures && feature.subFeatures.length > 0 && (
        <View style={styles.subFeaturesBox}>
          {feature.subFeatures.slice(0, 2).map((sub, idx) => (
            <Text key={idx} style={styles.subFeatureText}>✓ {sub}</Text>
          ))}
          {feature.subFeatures.length > 2 && (
            <Text style={styles.subFeatureText}>+{feature.subFeatures.length - 2} more</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Category Section ────────────────────────────────────────────
function CategorySection({
  category,
  features,
  onFeaturePress,
}: {
  category: FeatureCategory;
  features: Feature[];
  onFeaturePress: (screenId?: string) => void;
}) {
  const complete = features.filter(f => f.status === 'complete').length;
  const total = features.length;
  const percentage = Math.round((complete / total) * 100);

  return (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
          <Ionicons name={category.icon as any} size={24} color={category.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.categoryName}>{category.name}</Text>
          <Text style={styles.categoryDesc}>{category.description}</Text>
        </View>
        <View style={styles.categoryProgress}>
          <Text style={styles.progressText}>{complete}/{total}</Text>
          <View style={[styles.progressBar, { backgroundColor: colors.surfaceVariant }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${percentage}%`,
                  backgroundColor: category.color,
                },
              ]}
            />
          </View>
        </View>
      </View>

      <View style={styles.categoryFeatures}>
        {features.map((feature) => (
          <FeatureCard
            key={feature.id}
            feature={feature}
            onPress={() => onFeaturePress(feature.screenId)}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────
export function FeaturesOverviewScreen({ onNavigate }: { onNavigate?: (screenId: string) => void }) {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const stats = useMemo(() => ({
    total: FEATURES.length,
    complete: FEATURES.filter(f => f.status === 'complete').length,
    partial: FEATURES.filter(f => f.status === 'partial').length,
    pending: FEATURES.filter(f => f.status === 'pending').length,
  }), []);

  const groupedByCategory = useMemo(() => {
    const grouped: Record<string, Feature[]> = {};
    FEATURES.forEach(feature => {
      if (!grouped[feature.category]) {
        grouped[feature.category] = [];
      }
      grouped[feature.category].push(feature);
    });
    return grouped;
  }, []);

  const filteredCategories = selectedCategory
    ? Object.keys(groupedByCategory).filter(cat => cat === selectedCategory)
    : Object.keys(groupedByCategory);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  const handleFeaturePress = (screenId?: string) => {
    if (screenId && onNavigate) {
      onNavigate(screenId);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Features Overview</Text>
        <Text style={styles.headerSubtitle}>Complete inventory of all system features</Text>
      </View>

      {/* Stats Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statsRow}
        scrollEventThrottle={16}
      >
        <View style={[styles.statBox, styles.cardShadow]}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Features</Text>
        </View>
        <View style={[styles.statBox, { borderLeftColor: '#22C55E' }, styles.cardShadow]}>
          <Text style={[styles.statValue, { color: '#22C55E' }]}>{stats.complete}</Text>
          <Text style={styles.statLabel}>Complete</Text>
        </View>
        <View style={[styles.statBox, { borderLeftColor: '#F59E0B' }, styles.cardShadow]}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.partial}</Text>
          <Text style={styles.statLabel}>Partial</Text>
        </View>
        <View style={[styles.statBox, { borderLeftColor: '#EF4444' }, styles.cardShadow]}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </ScrollView>

      {/* Category Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryFilter}
        scrollEventThrottle={16}
      >
        <TouchableOpacity
          style={[
            styles.filterChip,
            !selectedCategory && styles.filterChipActive,
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.filterText, !selectedCategory && { color: colors.primary }]}>
            All
          </Text>
        </TouchableOpacity>
        {Object.values(CATEGORIES).map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.filterChip,
              selectedCategory === cat.id && styles.filterChipActive,
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Ionicons name={cat.icon as any} size={14} color={selectedCategory === cat.id ? cat.color : colors.textSecondary} />
            <Text style={[styles.filterText, selectedCategory === cat.id && { color: cat.color }]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Categories & Features */}
      <FlatList
        data={filteredCategories}
        keyExtractor={(item) => item}
        renderItem={({ item: catId }) => (
          <CategorySection
            category={CATEGORIES[catId]}
            features={groupedByCategory[catId]}
            onFeaturePress={handleFeaturePress}
          />
        )}
        contentContainerStyle={styles.listContent}
        scrollEnabled={true}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListHeaderComponent={null}
        ListFooterComponent={<View style={{ height: 20 }} />}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  statsRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  statBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    padding: spacing.lg,
    marginRight: spacing.md,
    width: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  cardShadow: {
    ...shadows.md,
  },
  categoryFilter: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: spacing.md,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: colors.primary + '20',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  categorySection: {
    marginBottom: spacing.xl,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  categoryDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  categoryProgress: {
    minWidth: 80,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  categoryFeatures: {
    gap: spacing.md,
  },
  featureCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cardIcon: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  featureDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  metric: {
    flex: 1,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
  subFeaturesBox: {
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  subFeatureText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
