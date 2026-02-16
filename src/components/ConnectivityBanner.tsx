/**
 * ConnectivityBanner — persistent, animated strip at the top of the screen
 * that appears when the device goes offline and shows quality badges
 * when the connection is poor. Auto-hides when fully connected.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useConnectivity } from '../context/ConnectivityContext';
import { colors, borderRadius, shadows, spacing } from '../theme/theme';

const { width: SCREEN_W } = Dimensions.get('window');
const isMobile = SCREEN_W < 768;

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
// RECONNECTED TOAST (shows briefly when coming back online)
// ═══════════════════════════════════════════════════════════════

function ReconnectedToast({ visible, onHide }: { visible: boolean; onHide: () => void }) {
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(slideAnim, { toValue: -60, duration: 300, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start(() => onHide());
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        s.reconnectedToast,
        { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
      ]}
    >
      <View style={s.reconnectedInner}>
        <View style={s.reconnectedDot} />
        <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
        <Text style={s.reconnectedText}>Connexion rétablie</Text>
      </View>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN BANNER
// ═══════════════════════════════════════════════════════════════

export function ConnectivityBanner() {
  const { isOnline, quality, latencyMs, refresh } = useConnectivity();
  const [showReconnected, setShowReconnected] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showGoodConnectionBriefly, setShowGoodConnectionBriefly] = useState(false);
  const wasOfflineRef = useRef(false);
  const wasPooorQualityRef = useRef(false);
  const goodConnectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQualityRef = useRef<string>(quality);

  const slideAnim = useRef(new Animated.Value(-80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const shouldShowForConnectionIssues = !isOnline || quality === 'poor' || quality === 'fair';
  const showBanner = shouldShowForConnectionIssues || showGoodConnectionBriefly;

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

  // Handle connection quality changes and brief good connection display
  useEffect(() => {
    // Clear any existing timer first
    if (goodConnectionTimerRef.current) {
      clearTimeout(goodConnectionTimerRef.current);
      goodConnectionTimerRef.current = null;
    }

    const previousQuality = lastQualityRef.current;
    lastQualityRef.current = quality;

    // Track offline state
    if (!isOnline) {
      wasOfflineRef.current = true;
      wasPooorQualityRef.current = false;
      setShowGoodConnectionBriefly(false);
      return;
    }
    
    // Track poor/fair quality state
    if (quality === 'poor' || quality === 'fair') {
      wasPooorQualityRef.current = true;
      setShowGoodConnectionBriefly(false);
      return;
    }
    
    // Handle good/excellent connection
    if (quality === 'good' || quality === 'excellent') {
      // Check if we're improving from a worse state
      const improvingFromOffline = wasOfflineRef.current;
      const improvingFromPoorQuality = wasPooorQualityRef.current;
      const improvingFromFairToPerfect = previousQuality === 'fair' || previousQuality === 'poor';
      
      const shouldShowBriefly = improvingFromOffline || improvingFromPoorQuality || improvingFromFairToPerfect;
      
      if (shouldShowBriefly) {
        setShowGoodConnectionBriefly(true);
        
        // Create a fresh timer to hide after 3 seconds
        goodConnectionTimerRef.current = setTimeout(() => {
          setShowGoodConnectionBriefly(false);
          wasOfflineRef.current = false;
          wasPooorQualityRef.current = false;
          goodConnectionTimerRef.current = null;
        }, 3000);
      } else {
        // Already in good state, ensure banner is hidden
        setShowGoodConnectionBriefly(false);
        wasOfflineRef.current = false;
        wasPooorQualityRef.current = false;
      }
    }
  }, [isOnline, quality]);

  // Detect reconnection for toast
  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
    } else if (wasOfflineRef.current && isOnline) {
      setShowReconnected(true);
      // Don't reset wasOfflineRef here, let the quality effect handle it
    }
  }, [isOnline]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (goodConnectionTimerRef.current) {
        clearTimeout(goodConnectionTimerRef.current);
        goodConnectionTimerRef.current = null;
      }
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } catch (error) {
      console.log('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const cfg = qualityConfig[quality];

  return (
    <>
      <ReconnectedToast
        visible={showReconnected}
        onHide={() => setShowReconnected(false)}
      />

      <Animated.View
        style={[
          s.banner,
          {
            backgroundColor: cfg.bg,
            transform: [{ translateY: slideAnim }],
            opacity: opacityAnim,
          },
        ]}
        pointerEvents={showBanner ? 'auto' : 'none'}
      >
        <View style={s.bannerContent}>
          {/* Status indicator */}
          <View style={s.bannerLeft}>
            <View style={s.pulseContainer}>
              <View style={[s.pulseDot, { backgroundColor: cfg.text }]} />
              {!isOnline && <View style={[s.pulseRing, { borderColor: cfg.text }]} />}
            </View>
            <Ionicons name={cfg.icon} size={18} color={cfg.text} />
            <Text style={[s.bannerLabel, { color: cfg.text }]}>
              {cfg.label}
            </Text>
            {latencyMs !== null && isOnline && (
              <View style={[s.latencyBadge, { backgroundColor: cfg.text + '20' }]}>
                <Text style={[s.latencyText, { color: cfg.text }]}>
                  {latencyMs} ms
                </Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <TouchableOpacity
            style={[s.retryBtn, { borderColor: cfg.text + '40' }]}
            onPress={handleRefresh}
            activeOpacity={0.7}
            disabled={refreshing}
          >
            <Ionicons
              name={refreshing ? 'sync' : 'refresh-outline'}
              size={14}
              color={cfg.text}
            />
            <Text style={[s.retryText, { color: cfg.text }]}>
              {refreshing ? 'Vérification…' : 'Réessayer'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Progress bar for poor quality */}
        {isOnline && quality === 'poor' && (
          <View style={s.progressTrack}>
            <Animated.View style={[s.progressFill, { width: '35%' }]} />
          </View>
        )}
        {isOnline && quality === 'fair' && (
          <View style={s.progressTrack}>
            <Animated.View style={[s.progressFill, { width: '60%' }]} />
          </View>
        )}
      </Animated.View>
    </>
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
    paddingHorizontal: isMobile ? 12 : 20,
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
