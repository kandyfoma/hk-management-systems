/**
 * ConnectivityBanner — slides in when offline, shows a brief "reconnected"
 * confirmation when connection is restored, then disappears.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useConnectivity } from '../context/ConnectivityContext';
import { colors, borderRadius, shadows, spacing } from '../theme/theme';



// ═══════════════════════════════════════════════════════════════
// QUALITY CONFIG
// ═══════════════════════════════════════════════════════════════

const qualityConfig = {
  offline: {
    bg: colors.error,
    text: '#FFFFFF',
    icon: 'cloud-offline' as const,
    label: 'Hors ligne — Aucune connexion',
  },
  poor: {
    bg: colors.warningDark,
    text: '#FFFFFF',
    icon: 'cellular-outline' as const,
    label: 'Connexion instable',
  },
  fair: {
    bg: colors.warning,
    text: '#1a1a1a',
    icon: 'cellular-outline' as const,
    label: 'Connexion moyenne',
  },
  good: {
    bg: colors.success,
    text: '#FFFFFF',
    icon: 'wifi' as const,
    label: 'En ligne',
  },
  excellent: {
    bg: colors.success,
    text: '#FFFFFF',
    icon: 'wifi' as const,
    label: 'Connexion excellente',
  },
};

// ═══════════════════════════════════════════════════════════════
// MAIN BANNER
// ═══════════════════════════════════════════════════════════════

export function ConnectivityBanner() {
  const { isOnline } = useConnectivity();

  // Track whether we were offline so we can show the brief "reconnected" state
  const wasOfflineRef = useRef(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slideAnim = useRef(new Animated.Value(-80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Derived: what to display
  const showOffline = !isOnline;
  const showBanner = showOffline || showReconnected;

  // React to online/offline changes
  useEffect(() => {
    if (!isOnline) {
      // Went offline — mark it and clear any reconnected timer
      wasOfflineRef.current = true;
      setShowReconnected(false);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    } else if (wasOfflineRef.current) {
      // Just came back online after being offline
      wasOfflineRef.current = false;
      setShowReconnected(true);
      // Auto-hide the reconnected banner after 3 s
      hideTimerRef.current = setTimeout(() => {
        setShowReconnected(false);
        hideTimerRef.current = null;
      }, 3000);
    }

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [isOnline]);

  // Animate banner in/out
  useEffect(() => {
    if (showBanner) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -80, duration: 300, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [showBanner]);

  if (!showBanner) return null;

  const cfg = showReconnected ? qualityConfig.good : qualityConfig.offline;

  return (
    <Animated.View
      style={[
        s.banner,
        {
          backgroundColor: cfg.bg,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents="none"
    >
      <View style={s.bannerContent}>
        <View style={s.bannerLeft}>
          <View style={s.pulseContainer}>
            <View style={[s.pulseDot, { backgroundColor: cfg.text }]} />
            {!isOnline && <View style={[s.pulseRing, { borderColor: cfg.text }]} />}
          </View>
          <Ionicons name={cfg.icon} size={18} color={cfg.text} />
          <Text style={[s.bannerLabel, { color: cfg.text }]}>
            {showReconnected ? 'Connexion rétablie' : 'Hors ligne — Aucune connexion'}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPACT STATUS INDICATOR (for header / sidebar)
// ═══════════════════════════════════════════════════════════════

export function ConnectivityDot({ size = 10 }: { size?: number }) {
  const { isOnline, quality } = useConnectivity();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isOnline) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isOnline]);

  const dotColor = isOnline
    ? quality === 'excellent' || quality === 'good'
      ? colors.success
      : quality === 'fair'
      ? colors.warning
      : colors.warningDark
    : colors.error;

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: dotColor,
        opacity: pulseAnim,
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const s = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99990,
    ...shadows.md,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  pulseContainer: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pulseRing: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    opacity: 0.5,
  },
  bannerLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  latencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  latencyText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 2,
  },
  // Reconnected toast
  reconnectedToast: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 12 : 50,
    alignSelf: 'center',
    zIndex: 99991,
  },
  reconnectedInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.success,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    ...shadows.lg,
  },
  reconnectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  reconnectedText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
