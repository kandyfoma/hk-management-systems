import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows } from '../theme/theme';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'top' | 'bottom';

export interface ToastConfig {
  message: string;
  type?: ToastType;
  title?: string;
  duration?: number;
  position?: ToastPosition;
  action?: { label: string; onPress: () => void };
}

interface ToastItem extends ToastConfig {
  id: string;
  translateY: Animated.Value;
  opacity: Animated.Value;
  progress: Animated.Value;
}

interface ToastContextType {
  show: (config: ToastConfig) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

// ═══════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

// ═══════════════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════════════

const toastTheme: Record<
  ToastType,
  {
    bg: string;
    border: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    accent: string;
    titleColor: string;
  }
> = {
  success: {
    bg: '#F0FDF4',
    border: '#BBF7D0',
    icon: 'checkmark-circle',
    iconColor: colors.success,
    accent: colors.success,
    titleColor: colors.successDark,
  },
  error: {
    bg: '#FEF2F2',
    border: '#FECACA',
    icon: 'close-circle',
    iconColor: colors.error,
    accent: colors.error,
    titleColor: colors.errorDark,
  },
  warning: {
    bg: '#FFFBEB',
    border: '#FDE68A',
    icon: 'warning',
    iconColor: colors.warning,
    accent: colors.warning,
    titleColor: colors.warningDark,
  },
  info: {
    bg: '#EFF6FF',
    border: '#BFDBFE',
    icon: 'information-circle',
    iconColor: colors.info,
    accent: colors.info,
    titleColor: colors.infoDark,
  },
};

const { width: SCREEN_W } = Dimensions.get('window');
const isMobile = SCREEN_W < 768;
const TOAST_WIDTH = isMobile ? SCREEN_W - 32 : 420;

// ═══════════════════════════════════════════════════════════════
// SINGLE TOAST COMPONENT
// ═══════════════════════════════════════════════════════════════

function ToastItem({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const t = toastTheme[item.type || 'info'];

  return (
    <Animated.View
      style={[
        ts.toast,
        {
          width: TOAST_WIDTH,
          backgroundColor: t.bg,
          borderColor: t.border,
          opacity: item.opacity,
          transform: [{ translateY: item.translateY }],
        },
      ]}
    >
      {/* Accent bar */}
      <View style={[ts.accentBar, { backgroundColor: t.accent }]} />

      {/* Icon */}
      <View style={[ts.iconWrap, { backgroundColor: t.accent + '14' }]}>
        <Ionicons name={t.icon} size={22} color={t.iconColor} />
      </View>

      {/* Content */}
      <View style={ts.content}>
        {item.title && (
          <Text style={[ts.title, { color: t.titleColor }]}>{item.title}</Text>
        )}
        <Text style={ts.message} numberOfLines={3}>
          {item.message}
        </Text>
        {item.action && (
          <TouchableOpacity
            style={[ts.actionBtn, { backgroundColor: t.accent + '14' }]}
            onPress={() => {
              item.action!.onPress();
              onDismiss(item.id);
            }}
            activeOpacity={0.7}
          >
            <Text style={[ts.actionText, { color: t.accent }]}>
              {item.action.label}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Close */}
      <TouchableOpacity
        style={ts.closeBtn}
        onPress={() => onDismiss(item.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={16} color={colors.textTertiary} />
      </TouchableOpacity>

      {/* Progress bar */}
      <Animated.View
        style={[
          ts.progressBar,
          {
            backgroundColor: t.accent,
            width: item.progress.interpolate({
              inputRange: [0, 1],
              outputRange: ['100%', '0%'],
            }),
          },
        ]}
      />
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const idRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => {
      const item = prev.find((t) => t.id === id);
      if (!item) return prev;

      // Animate out
      Animated.parallel([
        Animated.timing(item.opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(item.translateY, {
          toValue: -20,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setToasts((p) => p.filter((t) => t.id !== id));
      });

      if (timersRef.current[id]) {
        clearTimeout(timersRef.current[id]);
        delete timersRef.current[id];
      }

      return prev;
    });
  }, []);

  const dismissAll = useCallback(() => {
    toasts.forEach((t) => dismiss(t.id));
  }, [toasts, dismiss]);

  const show = useCallback(
    (config: ToastConfig) => {
      const id = `toast_${++idRef.current}`;
      const duration = config.duration ?? 4000;
      const position = config.position ?? 'top';
      const startY = position === 'top' ? -80 : 80;

      const translateY = new Animated.Value(startY);
      const opacity = new Animated.Value(0);
      const progress = new Animated.Value(0);

      const item: ToastItem = {
        ...config,
        id,
        translateY,
        opacity,
        progress,
      };

      setToasts((prev) => {
        // Max 3 toasts
        const limited = prev.length >= 3 ? prev.slice(1) : prev;
        return [...limited, item];
      });

      // Animate in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Progress bar
      Animated.timing(progress, {
        toValue: 1,
        duration,
        useNativeDriver: false,
      }).start();

      // Auto dismiss
      timersRef.current[id] = setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const success = useCallback(
    (message: string, title?: string) =>
      show({ message, title: title ?? 'Succès', type: 'success' }),
    [show]
  );

  const error = useCallback(
    (message: string, title?: string) =>
      show({ message, title: title ?? 'Erreur', type: 'error', duration: 6000 }),
    [show]
  );

  const warning = useCallback(
    (message: string, title?: string) =>
      show({ message, title: title ?? 'Attention', type: 'warning' }),
    [show]
  );

  const info = useCallback(
    (message: string, title?: string) =>
      show({ message, title: title ?? 'Information', type: 'info' }),
    [show]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearTimeout);
    };
  }, []);

  return (
    <ToastContext.Provider
      value={{ show, success, error, warning, info, dismiss, dismissAll }}
    >
      {children}

      {/* Toast container — top */}
      <View style={ts.containerTop} pointerEvents="box-none">
        {toasts
          .filter((t) => (t.position ?? 'top') === 'top')
          .map((item) => (
            <ToastItem key={item.id} item={item} onDismiss={dismiss} />
          ))}
      </View>

      {/* Toast container — bottom */}
      <View style={ts.containerBottom} pointerEvents="box-none">
        {toasts
          .filter((t) => t.position === 'bottom')
          .map((item) => (
            <ToastItem key={item.id} item={item} onDismiss={dismiss} />
          ))}
      </View>
    </ToastContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const ts = StyleSheet.create({
  containerTop: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 16 : 52,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99999,
    pointerEvents: 'box-none',
    gap: 8,
  },
  containerBottom: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 16 : 34,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99999,
    pointerEvents: 'box-none',
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    paddingLeft: 18,
    overflow: 'hidden',
    ...shadows.lg,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  actionBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
    marginLeft: 4,
    marginTop: -2,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 3,
    borderBottomLeftRadius: 14,
  },
});
