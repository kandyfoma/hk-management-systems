/**
 * ConnectivityScreen — full diagnostic page showing:
 *   • Live connection status with animated visuals
 *   • Latency gauge / quality score
 *   • Connection type details
 *   • Recent connection history timeline
 *   • Offline duration stats
 *   • Manual test / refresh button
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useConnectivity } from '../context/ConnectivityContext';
import { ConnectivityDot } from '../components/ConnectivityBanner';
import { useToast } from '../components/GlobalUI';
import { colors, spacing, borderRadius, shadows, typography } from '../theme/theme';
import type { ConnectionQuality, ConnectivitySnapshot } from '../services/ConnectivityService';

const { width: SCREEN_W } = Dimensions.get('window');
const isMobile = SCREEN_W < 768;

// ═══════════════════════════════════════════════════════════════
// QUALITY VISUAL CONFIG
// ═══════════════════════════════════════════════════════════════

const qualityMeta: Record<
  ConnectionQuality,
  { label: string; color: string; emoji: string; description: string; score: number }
> = {
  excellent: {
    label: 'Excellente',
    color: colors.success,
    emoji: '🟢',
    description: 'Connexion très rapide, idéale pour toutes les opérations y compris la synchronisation.',
    score: 100,
  },
  good: {
    label: 'Bonne',
    color: colors.success,
    emoji: '🟢',
    description: 'Connexion stable, convient parfaitement pour la plupart des tâches.',
    score: 75,
  },
  fair: {
    label: 'Moyenne',
    color: colors.warning,
    emoji: '🟡',
    description: 'Latence élevée — certaines opérations peuvent être lentes.',
    score: 50,
  },
  poor: {
    label: 'Faible',
    color: colors.warningDark,
    emoji: '🟠',
    description: 'Connexion instable — utilisez le mode hors ligne si possible.',
    score: 25,
  },
  offline: {
    label: 'Hors ligne',
    color: colors.error,
    emoji: '🔴',
    description: 'Aucune connexion. Les données locales sont toujours accessibles.',
    score: 0,
  },
};

// ═══════════════════════════════════════════════════════════════
// GAUGE COMPONENT
// ═══════════════════════════════════════════════════════════════

function QualityGauge({ quality, latencyMs }: { quality: ConnectionQuality; latencyMs: number | null }) {
  const meta = qualityMeta[quality];
  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(fillAnim, {
      toValue: meta.score / 100,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();
  }, [quality]);

  const fillWidth = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={gs.card}>
      {/* Accent bar */}
      <View style={[gs.accentBar, { backgroundColor: meta.color }]} />

      <View style={gs.gaugeContent}>
        {/* Score circle */}
        <View style={[gs.scoreCircle, { borderColor: meta.color }]}>
          <Text style={[gs.scoreNumber, { color: meta.color }]}>{meta.score}</Text>
          <Text style={gs.scoreLabel}>/ 100</Text>
        </View>

        <View style={gs.gaugeInfo}>
          <View style={gs.qualityRow}>
            <Text style={gs.qualityEmoji}>{meta.emoji}</Text>
            <Text style={[gs.qualityLabel, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <Text style={gs.qualityDesc}>{meta.description}</Text>

          {/* Latency pill */}
          {latencyMs !== null && (
            <View style={[gs.latencyPill, { backgroundColor: meta.color + '14' }]}>
              <Ionicons name="timer-outline" size={14} color={meta.color} />
              <Text style={[gs.latencyValue, { color: meta.color }]}>
                {latencyMs} ms
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Progress bar */}
      <View style={gs.barTrack}>
        <Animated.View style={[gs.barFill, { width: fillWidth as any, backgroundColor: meta.color }]} />
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// STATUS CARD
// ═══════════════════════════════════════════════════════════════

function StatusCard({ snapshot }: { snapshot: ConnectivitySnapshot }) {
  const typeLabels: Record<string, string> = {
    wifi: 'Wi-Fi',
    cellular: 'Cellulaire',
    ethernet: 'Ethernet',
    bluetooth: 'Bluetooth',
    vpn: 'VPN',
    wimax: 'WiMAX',
    other: 'Autre',
    none: 'Aucun',
    unknown: 'Inconnu',
  };

  const items = [
    {
      icon: 'wifi-outline' as const,
      label: 'Type de connexion',
      value: typeLabels[snapshot.type] ?? snapshot.type,
    },
    {
      icon: 'globe-outline' as const,
      label: 'Internet accessible',
      value:
        snapshot.isInternetReachable === null
          ? 'Vérification…'
          : snapshot.isInternetReachable
          ? 'Oui'
          : 'Non',
    },
    {
      icon: 'speedometer-outline' as const,
      label: 'Latence',
      value: snapshot.latencyMs !== null ? `${snapshot.latencyMs} ms` : '—',
    },
    {
      icon: 'download-outline' as const,
      label: 'Débit descendant',
      value: snapshot.downlinkMbps !== null ? `${snapshot.downlinkMbps} Mbps` : '—',
    },
  ];

  return (
    <View style={gs.card}>
      <View style={[gs.accentBar, { backgroundColor: colors.secondary }]} />
      <Text style={gs.sectionTitle}>
        <Ionicons name="information-circle-outline" size={16} color={colors.secondary} />{' '}
        Détails de la Connexion
      </Text>
      {items.map((item, i) => (
        <View key={i} style={[gs.detailRow, i < items.length - 1 && gs.detailRowBorder]}>
          <View style={gs.detailLeft}>
            <Ionicons name={item.icon} size={18} color={colors.textSecondary} />
            <Text style={gs.detailLabel}>{item.label}</Text>
          </View>
          <Text style={gs.detailValue}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// HISTORY TIMELINE
// ═══════════════════════════════════════════════════════════════

function HistoryTimeline({ history }: { history: ConnectivitySnapshot[] }) {
  const recentHistory = history.slice(-12).reverse();

  if (recentHistory.length === 0) {
    return (
      <View style={gs.card}>
        <View style={[gs.accentBar, { backgroundColor: colors.accent }]} />
        <Text style={gs.sectionTitle}>
          <Ionicons name="time-outline" size={16} color={colors.accent} />{' '}
          Historique Récent
        </Text>
        <View style={gs.emptyHistory}>
          <Ionicons name="analytics-outline" size={36} color={colors.textTertiary} />
          <Text style={gs.emptyText}>Aucun événement enregistré</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={gs.card}>
      <View style={[gs.accentBar, { backgroundColor: colors.accent }]} />
      <Text style={gs.sectionTitle}>
        <Ionicons name="time-outline" size={16} color={colors.accent} />{' '}
        Historique Récent
      </Text>
      {recentHistory.map((snap, i) => {
        const meta = qualityMeta[snap.quality];
        const time = new Date(snap.timestamp);
        const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time
          .getMinutes()
          .toString()
          .padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;

        return (
          <View key={i} style={gs.timelineItem}>
            {/* Timeline dot + line */}
            <View style={gs.timelineDotCol}>
              <View style={[gs.timelineDot, { backgroundColor: meta.color }]} />
              {i < recentHistory.length - 1 && <View style={gs.timelineLine} />}
            </View>

            {/* Content */}
            <View style={gs.timelineContent}>
              <View style={gs.timelineHeader}>
                <Text style={gs.timelineTime}>{timeStr}</Text>
                <View style={[gs.timelineBadge, { backgroundColor: meta.color + '14' }]}>
                  <Text style={[gs.timelineBadgeText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>
              {snap.latencyMs !== null && (
                <Text style={gs.timelineLatency}>{snap.latencyMs} ms</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// OFFLINE STATS
// ═══════════════════════════════════════════════════════════════

function OfflineStats({ totalOfflineMs, lastOfflineAt, lastOnlineAt }: {
  totalOfflineMs: number;
  lastOfflineAt: number | null;
  lastOnlineAt: number | null;
}) {
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms} ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds} s`;
    const minutes = Math.floor(seconds / 60);
    const remainSec = seconds % 60;
    if (minutes < 60) return `${minutes} min ${remainSec} s`;
    const hours = Math.floor(minutes / 60);
    const remainMin = minutes % 60;
    return `${hours} h ${remainMin} min`;
  };

  const formatTime = (ts: number | null): string => {
    if (!ts) return '—';
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const stats = [
    {
      icon: 'cloud-offline-outline' as const,
      label: 'Temps total hors ligne',
      value: formatDuration(totalOfflineMs),
      color: colors.error,
    },
    {
      icon: 'arrow-down-circle-outline' as const,
      label: 'Dernière déconnexion',
      value: formatTime(lastOfflineAt),
      color: colors.warningDark,
    },
    {
      icon: 'arrow-up-circle-outline' as const,
      label: 'Dernière reconnexion',
      value: formatTime(lastOnlineAt),
      color: colors.success,
    },
  ];

  return (
    <View style={gs.card}>
      <View style={[gs.accentBar, { backgroundColor: colors.primary }]} />
      <Text style={gs.sectionTitle}>
        <Ionicons name="stats-chart-outline" size={16} color={colors.primary} />{' '}
        Statistiques Session
      </Text>
      <View style={gs.statsGrid}>
        {stats.map((stat, i) => (
          <View key={i} style={gs.statItem}>
            <View style={[gs.statIcon, { backgroundColor: stat.color + '14' }]}>
              <Ionicons name={stat.icon} size={22} color={stat.color} />
            </View>
            <Text style={gs.statValue}>{stat.value}</Text>
            <Text style={gs.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// TIPS CARD
// ═══════════════════════════════════════════════════════════════

function TipsCard() {
  const tips = [
    {
      icon: 'save-outline' as const,
      text: 'Les données sont sauvegardées localement — vous pouvez travailler hors ligne.',
    },
    {
      icon: 'sync-outline' as const,
      text: 'La synchronisation reprend automatiquement quand la connexion est rétablie.',
    },
    {
      icon: 'shield-checkmark-outline' as const,
      text: 'Aucune donnée patient n\'est perdue lors des coupures réseau.',
    },
    {
      icon: 'battery-half-outline' as const,
      text: 'Le mode hors ligne consomme moins de batterie.',
    },
  ];

  return (
    <View style={gs.card}>
      <View style={[gs.accentBar, { backgroundColor: colors.info }]} />
      <Text style={gs.sectionTitle}>
        <Ionicons name="bulb-outline" size={16} color={colors.info} />{' '}
        Conseils pour le Congo
      </Text>
      {tips.map((tip, i) => (
        <View key={i} style={gs.tipRow}>
          <View style={[gs.tipIcon, { backgroundColor: colors.info + '10' }]}>
            <Ionicons name={tip.icon} size={16} color={colors.info} />
          </View>
          <Text style={gs.tipText}>{tip.text}</Text>
        </View>
      ))}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════

export function ConnectivityScreen() {
  const conn = useConnectivity();
  const [testing, setTesting] = useState(false);
  const { showToast } = useToast();

  const handleTest = useCallback(async () => {
    setTesting(true);
    showToast('Test de connectivité en cours...', 'info');
    try {
      await conn.refresh();
      showToast('Test de connectivité terminé', 'success');
    } catch (error) {
      showToast('Erreur lors du test de connectivité', 'error');
    }
    setTesting(false);
  }, [conn, showToast]);

  return (
    <ScrollView
      style={gs.container}
      contentContainerStyle={gs.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={testing}
          onRefresh={handleTest}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Page Header */}
      <View style={gs.pageHeader}>
        <View style={gs.headerLeft}>
          <View style={gs.headerIconWrap}>
            <Ionicons name="wifi" size={24} color={colors.primary} />
          </View>
          <View>
            <Text style={gs.pageTitle}>État de la Connexion</Text>
            <Text style={gs.pageSubtitle}>
              Surveillance réseau en temps réel
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[gs.testBtn, testing && gs.testBtnDisabled]}
          onPress={handleTest}
          disabled={testing}
          activeOpacity={0.7}
        >
          <Ionicons
            name={testing ? 'sync' : 'pulse-outline'}
            size={16}
            color="#FFF"
          />
          <Text style={gs.testBtnText}>
            {testing ? 'Test en cours…' : 'Tester maintenant'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Live status badge */}
      <View style={gs.liveStatusRow}>
        <ConnectivityDot size={12} />
        <Text
          style={[
            gs.liveStatusText,
            { color: conn.isOnline ? colors.success : colors.error },
          ]}
        >
          {conn.isOnline ? 'En ligne' : 'Hors ligne'}
        </Text>
        <Text style={gs.liveStatusMeta}>
          Dernière vérification :{' '}
          {new Date(conn.snapshot.timestamp).toLocaleTimeString('fr-FR')}
        </Text>
      </View>

      {/* Main content grid */}
      <View style={gs.grid}>
        <View style={gs.gridCol}>
          <QualityGauge quality={conn.quality} latencyMs={conn.latencyMs} />
          <StatusCard snapshot={conn.snapshot} />
          <TipsCard />
        </View>
        <View style={gs.gridCol}>
          <OfflineStats
            totalOfflineMs={conn.totalOfflineMs}
            lastOfflineAt={conn.lastOfflineAt}
            lastOnlineAt={conn.lastOnlineAt}
          />
          <HistoryTimeline history={conn.history} />
        </View>
      </View>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const gs = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: isMobile ? 16 : 28,
    paddingBottom: 40,
  },

  // Page Header
  pageHeader: {
    flexDirection: isMobile ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: isMobile ? 'flex-start' : 'center',
    gap: 16,
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  pageSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  testBtnDisabled: {
    opacity: 0.6,
  },
  testBtnText: {
    color: colors.text,
    fontWeight: '500',
    fontSize: 13,
  },

  // Live status row
  liveStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  liveStatusText: {
    fontSize: 14,
    fontWeight: '700',
  },
  liveStatusMeta: {
    fontSize: 12,
    color: colors.textTertiary,
    marginLeft: 'auto',
  },

  // Grid
  grid: {
    flexDirection: isMobile ? 'column' : 'row',
    gap: 20,
  },
  gridCol: {
    flex: 1,
    gap: 20,
  },

  // Card base
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.outline,
  },
  accentBar: {
    height: 2,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },

  // Gauge card
  gaugeContent: {
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
  },
  scoreLabel: {
    fontSize: 10,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  gaugeInfo: {
    flex: 1,
    alignItems: isMobile ? 'center' : 'flex-start',
  },
  qualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  qualityEmoji: {
    fontSize: 16,
  },
  qualityLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  qualityDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    textAlign: isMobile ? 'center' : 'left',
  },
  latencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
  },
  latencyValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  barTrack: {
    height: 6,
    backgroundColor: colors.outline,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Detail rows
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  statItem: {
    flex: 1,
    minWidth: isMobile ? '28%' : 120,
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 10,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },

  // Timeline
  timelineItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    minHeight: 48,
  },
  timelineDotCol: {
    alignItems: 'center',
    width: 20,
    marginRight: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.outline,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timelineTime: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  timelineBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  timelineBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timelineLatency: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 3,
  },

  // Empty
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textTertiary,
  },

  // Tips
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
});

export default ConnectivityScreen;
