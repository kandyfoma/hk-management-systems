import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions,
  Animated, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../../../services/ApiService';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';

const { width } = Dimensions.get('window');
const numCols = width >= 1024 ? 3 : width >= 768 ? 2 : 1;

interface LiveStats {
  total: number;
  normal: number;
  warning: number;
  critical: number;
  loading: boolean;
}

interface TestConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  screenId: string;
  color: string;
  apiEndpoint: string;
  features: string[];
  category: string;
}

const TEST_CONFIGS: TestConfig[] = [
  {
    id: 'audiometry',
    name: 'Audiométrie',
    description: 'Surveillance auditive et historique des tests',
    icon: 'volume-high-outline',
    screenId: 'oh-audiometry',
    color: '#122056', // Primary Blue
    apiEndpoint: '/occupational-health/audiometry-results/',
    features: ['Audiogramme', 'Comparaison annuelle', 'Seuil légal'],
    category: 'Sensoriel',
  },
  {
    id: 'spirometry',
    name: 'Spirométrie',
    description: 'Fonction pulmonaire et capacité respiratoire',
    icon: 'fitness-outline',
    screenId: 'oh-spirometry',
    color: '#1E3A8A', // Primary Blue Light
    apiEndpoint: '/occupational-health/spirometry-results/',
    features: ['FEV1 / FVC', 'Capacité vitale', 'Tendances'],
    category: 'Respiratoire',
  },
  {
    id: 'vision',
    name: 'Tests de Vision',
    description: 'Acuité visuelle, daltonisme et perception',
    icon: 'eye-outline',
    screenId: 'oh-vision-tests',
    color: '#0F1B42', // Primary Blue Dark
    apiEndpoint: '/occupational-health/vision-test-results/',
    features: ['Acuité visuelle', 'Daltonisme', 'Vision de profondeur'],
    category: 'Sensoriel',
  },
  {
    id: 'xray',
    name: 'Imagerie Radiologique',
    description: "Radiographies et résultats d'imagerie médicale",
    icon: 'image-outline',
    screenId: 'oh-xray-imaging',
    color: '#5B65DC', // Secondary Purple-Blue
    apiEndpoint: '/occupational-health/xray-imaging-results/',
    features: ['Thorax', 'Colonne vertébrale', 'Rapport radiologue'],
    category: 'Imagerie',
  },
  {
    id: 'drug-alcohol',
    name: 'Dépistage D/A',
    description: 'Dépistage drogues, alcool et aptitude au travail',
    icon: 'alert-circle-outline',
    screenId: 'oh-drug-alcohol-screening',
    color: '#818CF8', // Secondary Purple-Blue Light
    apiEndpoint: '/occupational-health/drug-alcohol-screening/',
    features: ['Alcoolémie', 'Substances', 'Aptitude'],
    category: 'Dépistage',
  },
  {
    id: 'ppe-compliance',
    name: 'Conformité EPI',
    description: 'Suivi port et conformité des équipements de protection',
    icon: 'shield-outline',
    screenId: 'oh-ppe-compliance-new',
    color: '#4338CA', // Secondary Purple-Blue Dark
    apiEndpoint: '/occupational-health/ppe-compliance/',
    features: ['EPI actif', 'Formation requise', 'Conformité'],
    category: 'Sécurité',
  },
  {
    id: 'health-screening',
    name: 'Dépistage Santé',
    description: 'Questionnaires santé et facteurs de risque',
    icon: 'document-text-outline',
    screenId: 'oh-health-screening',
    color: '#A5B4FC', // Accent Purple-Blue Lighter
    apiEndpoint: '/occupational-health/health-screening/',
    features: ['Questionnaire', 'Facteurs risque', 'Suivi'],
    category: 'Prévention',
  },
  {
    id: 'heavy-metals',
    name: 'Métaux Lourds',
    description: 'Dosage cobalt, silice, plomb et autres métaux lourds',
    icon: 'flask-outline',
    screenId: 'oh-heavy-metals',
    color: '#122056', // Primary Blue
    apiEndpoint: '/occupational-health/heavy-metals-tests/',
    features: ['Cobalt sanguin', 'Silice urinaire', 'Plomb', 'Mercure'],
    category: 'Biologique',
  },
];

const DASHBOARD_MAP: Record<string, string> = {
  'oh-audiometry': 'oh-audiometry-dashboard',
  'oh-spirometry': 'oh-spirometry-dashboard',
  'oh-vision-tests': 'oh-vision-dashboard',
  'oh-xray-imaging': 'oh-xray-dashboard',
  'oh-drug-alcohol-screening': 'oh-drug-alcohol-dashboard',
  'oh-ppe-compliance-new': 'oh-ppe-compliance-dashboard',
  'oh-health-screening': 'oh-health-screening-dashboard',
  'oh-heavy-metals': 'oh-heavy-metals-dashboard',
};

// ─── Animated Test Card ───────────────────────────────────────────────────────

function TestCard({
  config,
  stats,
  index,
  onPress,
}: {
  config: TestConfig;
  stats: LiveStats;
  index: number;
  onPress: () => void;
}) {
  const entranceAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(entranceAnim, {
      toValue: 1,
      delay: index * 40,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  }, []);

  const onPressIn = () =>
    Animated.spring(pressAnim, { toValue: 0.96, useNativeDriver: true }).start();
  const onPressOut = () =>
    Animated.spring(pressAnim, { toValue: 1, useNativeDriver: true }).start();

  const translateY = entranceAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });
  const completionPct = stats.total > 0 ? Math.round((stats.normal / stats.total) * 100) : 0;

  return (
    <Animated.View
      style={[
        { flex: 1 },
        { opacity: entranceAnim, transform: [{ translateY }, { scale: pressAnim }] },
      ]}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        {/* Colored header band */}
        <View style={[styles.cardHeader, { backgroundColor: config.color }]}>
          <View style={styles.cardHeaderLeft}>
            <View style={styles.cardIconCircle}>
              <Ionicons name={config.icon as any} size={26} color={config.color} />
            </View>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{config.category.toUpperCase()}</Text>
            </View>
          </View>
          {stats.loading ? (
            <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
          ) : (
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeNumber}>{stats.total}</Text>
              <Text style={styles.totalBadgeLabel}>total</Text>
            </View>
          )}
        </View>

        {/* Body */}
        <View style={styles.cardBody}>
          <Text style={styles.testName}>{config.name}</Text>
          <Text style={styles.testDescription}>{config.description}</Text>

          {/* Live stat pills */}
          <View style={styles.statPills}>
            {stats.loading ? (
              [0, 1, 2].map(i => (
                <View key={i} style={[styles.pill, { backgroundColor: colors.background }]}>
                  <View style={[styles.pillDot, { backgroundColor: colors.outline }]} />
                  <Text style={[styles.pillNum, { color: colors.outline }]}>–</Text>
                </View>
              ))
            ) : (
              <>
                <View style={[styles.pill, { backgroundColor: '#22C55E15' }]}>
                  <View style={[styles.pillDot, { backgroundColor: '#22C55E' }]} />
                  <Text style={[styles.pillNum, { color: '#22C55E' }]}>{stats.normal}</Text>
                  <Text style={styles.pillLbl}>normal</Text>
                </View>
                <View style={[styles.pill, { backgroundColor: colors.warning + '18' }]}>
                  <View style={[styles.pillDot, { backgroundColor: colors.warning }]} />
                  <Text style={[styles.pillNum, { color: colors.warning }]}>{stats.warning}</Text>
                  <Text style={styles.pillLbl}>attention</Text>
                </View>
                <View style={[styles.pill, { backgroundColor: colors.error + '18' }]}>
                  <View style={[styles.pillDot, { backgroundColor: colors.error }]} />
                  <Text style={[styles.pillNum, { color: colors.error }]}>{stats.critical}</Text>
                  <Text style={styles.pillLbl}>critique</Text>
                </View>
              </>
            )}
          </View>

          {/* Progress bar */}
          {!stats.loading && stats.total > 0 && (
            <View style={styles.progressRow}>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${completionPct}%` as any, backgroundColor: config.color },
                  ]}
                />
              </View>
              <Text style={[styles.progressPct, { color: config.color }]}>{completionPct}%</Text>
            </View>
          )}

          {/* Feature chips */}
          <View style={styles.chips}>
            {config.features.map((f, i) => (
              <View key={i} style={[styles.chip, { borderColor: config.color + '40' }]}>
                <Text style={[styles.chipText, { color: config.color }]}>{f}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={[styles.cardFooter, { borderTopColor: config.color + '25' }]}>
          <Text style={[styles.footerText, { color: config.color }]}>Tableau de bord</Text>
          <Ionicons name="arrow-forward-circle" size={18} color={config.color} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function MedicalTestCatalogScreen({ navigation }: any) {
  const [statsMap, setStatsMap] = useState<Record<string, LiveStats>>(
    Object.fromEntries(
      TEST_CONFIGS.map(c => [c.id, { total: 0, normal: 0, warning: 0, critical: 0, loading: true }])
    )
  );
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    const api = ApiService.getInstance();
    await Promise.all(
      TEST_CONFIGS.map(async (cfg) => {
        try {
          const res = await api.get(cfg.apiEndpoint);
          if (res.success && res.data) {
            const raw: any[] = Array.isArray(res.data) ? res.data : res.data.results ?? [];
            setStatsMap(prev => ({
              ...prev,
              [cfg.id]: {
                total: res.data?.count ?? raw.length,
                normal: raw.filter((r: any) => r.status === 'normal').length,
                warning: raw.filter((r: any) => r.status === 'warning').length,
                critical: raw.filter((r: any) => r.status === 'critical').length,
                loading: false,
              },
            }));
          } else {
            setStatsMap(prev => ({ ...prev, [cfg.id]: { ...prev[cfg.id], loading: false } }));
          }
        } catch {
          setStatsMap(prev => ({ ...prev, [cfg.id]: { ...prev[cfg.id], loading: false } }));
        }
      })
    );
  }, []);

  useEffect(() => { fetchStats(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setStatsMap(
      Object.fromEntries(
        TEST_CONFIGS.map(c => [c.id, { total: 0, normal: 0, warning: 0, critical: 0, loading: true }])
      )
    );
    await fetchStats();
    setRefreshing(false);
  };

  const handleNavigate = (screenId: string) => {
    navigation.navigate(DASHBOARD_MAP[screenId] ?? screenId);
  };

  const totalTests = Object.values(statsMap).reduce((s, v) => s + (v.loading ? 0 : v.total), 0);
  const allLoading = Object.values(statsMap).every(s => s.loading);

  // Build rows
  const rows: TestConfig[][] = [];
  for (let i = 0; i < TEST_CONFIGS.length; i += numCols) {
    rows.push(TEST_CONFIGS.slice(i, i + numCols));
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.screenTitle}>Tests Médicaux</Text>
            <Text style={styles.screenSubtitle}>
              {allLoading
                ? 'Chargement des données...'
                : `${totalTests} enregistrements · ${TEST_CONFIGS.length} modules`}
            </Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Grid */}
        <View style={styles.grid}>
          {rows.map((row, rIdx) => (
            <View key={rIdx} style={styles.row}>
              {row.map((cfg, cIdx) => (
                <TestCard
                  key={cfg.id}
                  config={cfg}
                  stats={statsMap[cfg.id]}
                  index={rIdx * numCols + cIdx}
                  onPress={() => handleNavigate(cfg.screenId)}
                />
              ))}
              {row.length < numCols &&
                Array.from({ length: numCols - row.length }).map((_, i) => (
                  <View key={`ph-${i}`} style={{ flex: 1 }} />
                ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  screenTitle: { fontSize: 26, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  screenSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  // Grid
  grid: { paddingHorizontal: spacing.lg, paddingBottom: 48, gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },

  // Card
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadows.md,
  },

  // Card header (color band)
  cardHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderLeft: { gap: spacing.sm },
  cardIconCircle: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.93)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  categoryText: { fontSize: 9, fontWeight: '700', color: '#fff', letterSpacing: 0.8 },
  totalBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 52,
  },
  totalBadgeNumber: { fontSize: 22, fontWeight: '800', color: '#fff', lineHeight: 26 },
  totalBadgeLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Card body
  cardBody: { padding: spacing.lg, gap: spacing.md, marginTop: -spacing.md },
  testName: { fontSize: 15, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  testDescription: { fontSize: 12, color: colors.textSecondary, lineHeight: 17, marginTop: -spacing.xs },

  // Stat pills
  statPills: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillNum: { fontSize: 13, fontWeight: '700' },
  pillLbl: { fontSize: 10, color: colors.textSecondary, fontWeight: '500' },

  // Progress
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressTrack: {
    flex: 1,
    height: 5,
    backgroundColor: colors.background,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: borderRadius.full },
  progressPct: { fontSize: 11, fontWeight: '700', minWidth: 32, textAlign: 'right' },

  // Feature chips
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  chipText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },

  // Card footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  footerText: { fontSize: 12, fontWeight: '600' },
});
