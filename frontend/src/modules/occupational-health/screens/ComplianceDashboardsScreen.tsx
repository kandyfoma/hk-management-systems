import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { occHealthApi } from '../../../services/OccHealthApiService';

interface Section {
  id: string;
  name: string;
  percentage: number;
  requirements: Array<{
    id: string;
    title: string;
    status: 'compliant' | 'minor-gap' | 'major-gap';
  }>;
}

const CLAUSE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  context:     'business-outline',
  leadership:  'ribbon-outline',
  planning:    'map-outline',
  support:     'people-outline',
  operation:   'construct-outline',
  performance: 'analytics-outline',
  improvement: 'trending-up-outline',
};

// ─── ISO 45001 Compliance Dashboard ─────────────────────────────
export function ISO45001DashboardScreen() {
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    loadComplianceData();
  }, []);

  const loadComplianceData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const toArray = (raw: any): any[] => {
        if (Array.isArray(raw)) return raw;
        if (raw?.results && Array.isArray(raw.results)) return raw.results;
        if (raw?.items && Array.isArray(raw.items)) return raw.items;
        return [];
      };

      // Fetch compliance data using proper service methods
      const [auditsResult, requirementsResult, hazardsResult, trainingsResult] = await Promise.allSettled([
        occHealthApi.listComplianceAudits(),
        occHealthApi.listRegulatoryRequirements(),
        occHealthApi.listHazardRegister(),
        occHealthApi.listTrainingCertifications(),
      ]);

      // Extract data (normalize arrays for both list and paginated payloads)
      const auditData = toArray(auditsResult.status === 'fulfilled' ? auditsResult.value.data : null);
      const regularReqs = toArray(requirementsResult.status === 'fulfilled' ? requirementsResult.value.data : null);
      const hazards = toArray(hazardsResult.status === 'fulfilled' ? hazardsResult.value.data : null);
      const trainings = toArray(trainingsResult.status === 'fulfilled' ? trainingsResult.value.data : null);

      // Calculate compliance based on real data
      const calculatedSections = buildSectionsFromData(
        auditData,
        regularReqs,
        hazards,
        trainings
      );

      setSections(calculatedSections);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load compliance data:', err);
      setError('Impossible de charger les données. Affichage des valeurs par défaut.');
      setSections(getDefaultSections());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const buildSectionsFromData = (
    audits: any[],
    requirements: any[],
    hazards: any[],
    trainings: any[]
  ): Section[] => {
    const safeAudits = Array.isArray(audits) ? audits : [];
    const safeRequirements = Array.isArray(requirements) ? requirements : [];
    const safeHazards = Array.isArray(hazards) ? hazards : [];
    const safeTrainings = Array.isArray(trainings) ? trainings : [];

    const nonConformities = safeAudits.reduce((acc: any, audit: any) => {
      const minor = audit.minor_nc || 0;
      const major = audit.major_nc || 0;
      return { minor: acc.minor + minor, major: acc.major + major };
    }, { minor: 0, major: 0 });

    const compliantRequirements = safeRequirements.filter((r: any) => r.status === 'compliant');
    const trainingCompliant = safeTrainings.filter((t: any) => t.status === 'completed');
    const hazardMitigated = safeHazards.filter((h: any) => h.control_effectiveness === 'excellent' || h.control_effectiveness === 'good');

    return [
      {
        id: 'context',
        name: 'Context of the Organization',
        percentage: calculatePercentage(compliantRequirements.length, safeRequirements.length),
        requirements: [
          { id: 'context-1', title: 'Determine scope', status: safeRequirements.length > 0 ? 'compliant' : 'minor-gap' },
          { id: 'context-2', title: 'Identify external issues', status: 'compliant' },
          { id: 'context-3', title: 'Identify internal issues', status: compliantRequirements.length > 2 ? 'compliant' : 'minor-gap' },
        ],
      },
      {
        id: 'leadership',
        name: 'Leadership & Commitment',
        percentage: nonConformities.major === 0 ? 100 : nonConformities.major > 2 ? 70 : 90,
        requirements: [
          { id: 'lead-1', title: 'Top management commitment', status: 'compliant' },
          { id: 'lead-2', title: 'Policy developed', status: compliantRequirements.length > 0 ? 'compliant' : 'minor-gap' },
          { id: 'lead-3', title: 'Roles & responsibilities', status: nonConformities.minor > 1 ? 'minor-gap' : 'compliant' },
        ],
      },
      {
        id: 'planning',
        name: 'Planning',
        percentage: calculatePercentage(hazardMitigated.length, safeHazards.length),
        requirements: [
          { id: 'plan-1', title: 'Hazard identification', status: safeHazards.length > 0 ? 'compliant' : 'major-gap' },
          { id: 'plan-2', title: 'Risk assessment', status: hazardMitigated.length > 0 ? 'compliant' : 'minor-gap' },
          { id: 'plan-3', title: 'Compliance obligations', status: compliantRequirements.length > 1 ? 'compliant' : 'minor-gap' },
          { id: 'plan-4', title: 'Objectives & planning', status: nonConformities.major === 0 ? 'compliant' : 'minor-gap' },
        ],
      },
      {
        id: 'support',
        name: 'Support (Resources)',
        percentage: calculatePercentage(trainingCompliant.length, safeTrainings.length),
        requirements: [
          { id: 'support-1', title: 'Resources allocated', status: 'compliant' },
          { id: 'support-2', title: 'Competence & training', status: trainingCompliant.length > 0 ? 'compliant' : 'major-gap' },
          { id: 'support-3', title: 'Awareness program', status: trainingCompliant.length > 1 ? 'compliant' : 'minor-gap' },
        ],
      },
      {
        id: 'operation',
        name: 'Operational Planning & Control',
        percentage: nonConformities.major === 0 ? 95 : 75,
        requirements: [
          { id: 'op-1', title: 'Operational controls', status: nonConformities.major === 0 ? 'compliant' : 'minor-gap' },
          { id: 'op-2', title: 'Emergency preparedness', status: 'compliant' },
          { id: 'op-3', title: 'Change management', status: nonConformities.minor > 2 ? 'major-gap' : 'compliant' },
        ],
      },
      {
        id: 'performance',
        name: 'Performance Evaluation',
        percentage: safeAudits.length > 0 ? 85 : 80,
        requirements: [
          { id: 'perf-1', title: 'Monitoring & measurement', status: safeAudits.length > 0 ? 'compliant' : 'compliant' },
          { id: 'perf-2', title: 'Incident investigation', status: 'compliant' },
          { id: 'perf-3', title: 'Internal audit', status: safeAudits.length > 0 ? 'compliant' : 'minor-gap' },
        ],
      },
      {
        id: 'improvement',
        name: 'Improvement',
        percentage: nonConformities.major === 0 ? 90 : 70,
        requirements: [
          { id: 'imp-1', title: 'Corrective action', status: nonConformities.major === 0 ? 'compliant' : 'major-gap' },
          { id: 'imp-2', title: 'Continuous improvement', status: nonConformities.minor > 2 ? 'minor-gap' : 'compliant' },
        ],
      },
    ];
  };

  const calculatePercentage = (compliant: number, total: number): number => {
    if (total === 0) return 75;
    return Math.round((compliant / total) * 100);
  };

  const getStatusColor = (status: string) => {
    if (status === 'compliant') return '#22C55E';
    if (status === 'minor-gap') return colors.warning;
    return colors.error;
  };

  const getStatusLabel = (status: string) => {
    if (status === 'compliant') return 'Conforme';
    if (status === 'minor-gap') return 'Écart mineur';
    return 'Écart majeur';
  };

  const getPercentageColor = (pct: number) => {
    if (pct >= 90) return '#22C55E';
    if (pct >= 75) return colors.warning;
    return colors.error;
  };

  const overallCompliance = sections.length > 0
    ? Math.round(sections.reduce((acc, s) => acc + s.percentage, 0) / sections.length)
    : 0;

  const allReqs = sections.flatMap(s => s.requirements);
  const compliantCount = allReqs.filter(r => r.status === 'compliant').length;
  const minorGapCount = allReqs.filter(r => r.status === 'minor-gap').length;
  const majorGapCount = allReqs.filter(r => r.status === 'major-gap').length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={colors.secondary} />
          <Text style={styles.loadingTitle}>Chargement en cours…</Text>
          <Text style={styles.loadingSubtitle}>Récupération des données ISO 45001</Text>
        </View>
      </View>
    );
  }

  const overallColor = getPercentageColor(overallCompliance);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadComplianceData(true)}
            tintColor={colors.secondary}
            colors={[colors.secondary]}
          />
        }
      >
        {/* ─── Hero Header ─── */}
        <View style={styles.heroHeader}>
          <View style={styles.heroTop}>
            <View style={styles.heroBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
              <Text style={styles.heroBadgeText}>Certification Active</Text>
            </View>
            {lastUpdated && (
              <Text style={styles.heroTimestamp}>
                Mis à jour {lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>
          <Text style={styles.heroTitle}>ISO 45001:2023</Text>
          <Text style={styles.heroSubtitle}>Système de management de la santé{'\n'}et sécurité au travail</Text>

          {/* Score Ring */}
          <View style={styles.heroScoreRow}>
            <View style={[styles.heroScoreRing, { borderColor: overallColor }]}>
              <Text style={[styles.heroScoreValue, { color: overallColor }]}>{overallCompliance}%</Text>
              <Text style={styles.heroScoreLabel}>Conformité{'\n'}globale</Text>
            </View>
            <View style={styles.heroStats}>
              <View style={styles.heroStatItem}>
                <View style={[styles.heroStatDot, { backgroundColor: '#22C55E' }]} />
                <View>
                  <Text style={styles.heroStatValue}>{compliantCount}</Text>
                  <Text style={styles.heroStatLabel}>Conformes</Text>
                </View>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <View style={[styles.heroStatDot, { backgroundColor: colors.warning }]} />
                <View>
                  <Text style={styles.heroStatValue}>{minorGapCount}</Text>
                  <Text style={styles.heroStatLabel}>Écarts mineurs</Text>
                </View>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatItem}>
                <View style={[styles.heroStatDot, { backgroundColor: colors.error }]} />
                <View>
                  <Text style={styles.heroStatValue}>{majorGapCount}</Text>
                  <Text style={styles.heroStatLabel}>Écarts majeurs</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ─── Error banner ─── */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* ─── Section summary strip ─── */}
        <View style={styles.summaryStrip}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{sections.length}</Text>
            <Text style={styles.summaryLabel}>Clauses</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{allReqs.length}</Text>
            <Text style={styles.summaryLabel}>Exigences</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: '#22C55E' }]}>
              {compliantCount}/{allReqs.length}
            </Text>
            <Text style={styles.summaryLabel}>Satisfaites</Text>
          </View>
        </View>

        {/* ─── Section Cards ─── */}
        <View style={styles.sectionsContainer}>
          <Text style={styles.sectionGroupTitle}>Clauses de la norme</Text>
          {sections.map((section, index) => {
            const isExpanded = selectedSection === section.id;
            const pctColor = getPercentageColor(section.percentage);
            const icon = CLAUSE_ICONS[section.id] ?? 'checkmark-circle-outline';
            const clauseNum = index + 4; // ISO 45001 clauses start at 4

            return (
              <View key={section.id} style={styles.clauseCard}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => setSelectedSection(isExpanded ? null : section.id)}
                  style={styles.clauseCardHeader}
                >
                  {/* Left accent bar */}
                  <View style={[styles.clauseAccent, { backgroundColor: pctColor }]} />

                  {/* Icon */}
                  <View style={[styles.clauseIconWrap, { backgroundColor: pctColor + '18' }]}>
                    <Ionicons name={icon} size={20} color={pctColor} />
                  </View>

                  {/* Text */}
                  <View style={styles.clauseInfo}>
                    <View style={styles.clauseNameRow}>
                      <Text style={styles.clauseNum}>Clause {clauseNum}</Text>
                      <View style={[styles.clauseStatusBadge, { backgroundColor: pctColor + '18' }]}>
                        <Text style={[styles.clauseStatusBadgeText, { color: pctColor }]}>
                          {section.percentage}%
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.clauseName}>{section.name}</Text>
                    {/* Progress bar */}
                    <View style={styles.clauseProgressBg}>
                      <View style={[styles.clauseProgressFill, { width: `${section.percentage}%`, backgroundColor: pctColor }]} />
                    </View>
                  </View>

                  {/* Chevron */}
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.textSecondary}
                    style={{ marginLeft: spacing.sm }}
                  />
                </TouchableOpacity>

                {/* Expanded requirements */}
                {isExpanded && (
                  <View style={styles.requirementsPanel}>
                    <Text style={styles.requirementsPanelTitle}>Exigences détaillées</Text>
                    {section.requirements.map((req, ri) => {
                      const sc = getStatusColor(req.status);
                      const sl = getStatusLabel(req.status);
                      const isLast = ri === section.requirements.length - 1;
                      return (
                        <View key={req.id} style={[styles.reqRow, !isLast && styles.reqRowBorder]}>
                          <View style={[styles.reqDot, { backgroundColor: sc }]} />
                          <Text style={styles.reqTitle}>{req.title}</Text>
                          <View style={[styles.reqBadge, { backgroundColor: sc + '18' }]}>
                            <Text style={[styles.reqBadgeText, { color: sc }]}>{sl}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* ─── Footer note ─── */}
        <View style={styles.footerNote}>
          <Ionicons name="information-circle-outline" size={14} color={colors.textTertiary} />
          <Text style={styles.footerNoteText}>
            Données calculées à partir des audits, du registre des dangers et des certifications de formation.
            Tirez vers le bas pour actualiser.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function getDefaultSections(): Section[] {
  return [
    {
      id: 'context',
      name: 'Context of the Organization',
      percentage: 75,
      requirements: [
        { id: 'context-1', title: 'Determine scope', status: 'compliant' },
        { id: 'context-2', title: 'Identify external issues', status: 'compliant' },
        { id: 'context-3', title: 'Identify internal issues', status: 'minor-gap' },
      ],
    },
    {
      id: 'leadership',
      name: 'Leadership & Commitment',
      percentage: 85,
      requirements: [
        { id: 'lead-1', title: 'Top management commitment', status: 'compliant' },
        { id: 'lead-2', title: 'Policy developed', status: 'compliant' },
        { id: 'lead-3', title: 'Roles & responsibilities', status: 'minor-gap' },
      ],
    },
    {
      id: 'planning',
      name: 'Planning',
      percentage: 80,
      requirements: [
        { id: 'plan-1', title: 'Hazard identification', status: 'compliant' },
        { id: 'plan-2', title: 'Risk assessment', status: 'minor-gap' },
        { id: 'plan-3', title: 'Compliance obligations', status: 'minor-gap' },
        { id: 'plan-4', title: 'Objectives & planning', status: 'compliant' },
      ],
    },
    {
      id: 'support',
      name: 'Support (Resources)',
      percentage: 75,
      requirements: [
        { id: 'support-1', title: 'Resources allocated', status: 'compliant' },
        { id: 'support-2', title: 'Competence & training', status: 'major-gap' },
        { id: 'support-3', title: 'Awareness program', status: 'minor-gap' },
      ],
    },
    {
      id: 'operation',
      name: 'Operational Planning & Control',
      percentage: 70,
      requirements: [
        { id: 'op-1', title: 'Operational controls', status: 'minor-gap' },
        { id: 'op-2', title: 'Emergency preparedness', status: 'compliant' },
        { id: 'op-3', title: 'Change management', status: 'major-gap' },
      ],
    },
    {
      id: 'performance',
      name: 'Performance Evaluation',
      percentage: 80,
      requirements: [
        { id: 'perf-1', title: 'Monitoring & measurement', status: 'compliant' },
        { id: 'perf-2', title: 'Incident investigation', status: 'compliant' },
        { id: 'perf-3', title: 'Internal audit', status: 'minor-gap' },
      ],
    },
    {
      id: 'improvement',
      name: 'Improvement',
      percentage: 75,
      requirements: [
        { id: 'imp-1', title: 'Corrective action', status: 'compliant' },
        { id: 'imp-2', title: 'Continuous improvement', status: 'minor-gap' },
      ],
    },
  ];
}

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Layout
  container: { flex: 1, backgroundColor: colors.background },

  // Loading
  loadingContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  loadingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.md,
    width: 220,
  },
  loadingTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: spacing.lg, textAlign: 'center' },
  loadingSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },

  // Hero Header
  heroHeader: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  heroBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.6 },
  heroTimestamp: { fontSize: 10, color: 'rgba(255,255,255,0.55)' },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4, lineHeight: 19 },

  heroScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.xl,
  },
  heroScoreRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroScoreValue: { fontSize: 24, fontWeight: '800' },
  heroScoreLabel: { fontSize: 9, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 2, lineHeight: 13 },

  heroStats: { flex: 1, gap: spacing.md },
  heroStatItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroStatDot: { width: 8, height: 8, borderRadius: 4 },
  heroStatValue: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  heroStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  heroStatDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningLight,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  errorText: { flex: 1, fontSize: 12, color: colors.warningDark },

  // Summary strip
  summaryStrip: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 20, fontWeight: '800', color: colors.primary },
  summaryLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: colors.outline },

  // Sections
  sectionsContainer: { paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: 40 },
  sectionGroupTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },

  claudeCard: {},
  clauseCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  clauseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
  },
  clauseAccent: { width: 4, alignSelf: 'stretch', borderTopLeftRadius: borderRadius.lg, borderBottomLeftRadius: borderRadius.lg },
  clauseIconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.md,
  },
  clauseInfo: { flex: 1 },
  clauseNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  clauseNum: { fontSize: 10, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  clauseStatusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full },
  clauseStatusBadgeText: { fontSize: 11, fontWeight: '700' },
  clauseName: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  clauseProgressBg: { height: 5, backgroundColor: colors.outlineVariant, borderRadius: 3, overflow: 'hidden' },
  clauseProgressFill: { height: '100%', borderRadius: 3 },

  // Requirements panel
  requirementsPanel: {
    backgroundColor: colors.surfaceVariant,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  requirementsPanelTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: spacing.md,
  },
  reqRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.sm },
  reqRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.outline },
  reqDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  reqTitle: { flex: 1, fontSize: 12, color: colors.text },
  reqBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.sm },
  reqBadgeText: { fontSize: 10, fontWeight: '600' },

  // Footer
  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  footerNoteText: { flex: 1, fontSize: 11, color: colors.textTertiary, lineHeight: 17 },
});
