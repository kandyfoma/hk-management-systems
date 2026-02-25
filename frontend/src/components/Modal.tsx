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
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows } from '../theme/theme';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type ModalVariant = 'default' | 'danger' | 'success' | 'info' | 'warning';

export interface ModalAction {
  label: string;
  onPress: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
}

export interface ModalConfig {
  title: string;
  message?: string;
  variant?: ModalVariant;
  size?: ModalSize;
  icon?: keyof typeof Ionicons.glyphMap;
  actions?: ModalAction[];
  content?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export interface ConfirmConfig {
  title: string;
  message: string;
  variant?: ModalVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ModalContextType {
  show: (config: ModalConfig) => void;
  confirm: (config: ConfirmConfig) => Promise<boolean>;
  alert: (title: string, message: string, variant?: ModalVariant) => Promise<void>;
  dismiss: () => void;
}

// ═══════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════

const ModalContext = createContext<ModalContextType | null>(null);

export function useModal(): ModalContextType {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used within a ModalProvider');
  return ctx;
}

// ═══════════════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════════════

const modalTheme: Record<
  ModalVariant,
  {
    iconBg: string;
    iconColor: string;
    headerAccent: string;
    primaryBtn: string;
    defaultIcon: keyof typeof Ionicons.glyphMap;
  }
> = {
  default: {
    iconBg: colors.primary + '14',
    iconColor: colors.primary,
    headerAccent: colors.primary,
    primaryBtn: colors.primary,
    defaultIcon: 'information-circle',
  },
  danger: {
    iconBg: colors.errorLight,
    iconColor: colors.error,
    headerAccent: colors.error,
    primaryBtn: colors.error,
    defaultIcon: 'warning',
  },
  success: {
    iconBg: colors.successLight,
    iconColor: colors.success,
    headerAccent: colors.success,
    primaryBtn: colors.success,
    defaultIcon: 'checkmark-circle',
  },
  info: {
    iconBg: colors.infoLight,
    iconColor: colors.info,
    headerAccent: colors.info,
    primaryBtn: colors.info,
    defaultIcon: 'information-circle',
  },
  warning: {
    iconBg: colors.warningLight,
    iconColor: colors.warning,
    headerAccent: colors.warning,
    primaryBtn: colors.warning,
    defaultIcon: 'alert-circle',
  },
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const isMobile = SCREEN_W < 768;

const sizeMap: Record<ModalSize, number | string> = {
  sm: 380,
  md: 480,
  lg: 580,
  xl: 700,
  full: '94%',
};

// ═══════════════════════════════════════════════════════════════
// BUTTON COMPONENT
// ═══════════════════════════════════════════════════════════════

function ModalButton({
  action,
  variantTheme,
}: {
  action: ModalAction;
  variantTheme: (typeof modalTheme)[ModalVariant];
}) {
  const variant = action.variant ?? 'primary';

  const getBtnStyle = () => {
    switch (variant) {
      case 'primary':
        return {
          bg: variantTheme.primaryBtn,
          text: '#FFF',
          border: variantTheme.primaryBtn,
        };
      case 'danger':
        return { bg: colors.error, text: '#FFF', border: colors.error };
      case 'secondary':
        return { bg: '#FFF', text: colors.text, border: colors.outline };
      case 'ghost':
        return { bg: 'transparent', text: colors.textSecondary, border: 'transparent' };
      default:
        return { bg: variantTheme.primaryBtn, text: '#FFF', border: variantTheme.primaryBtn };
    }
  };

  const s = getBtnStyle();

  return (
    <TouchableOpacity
      style={[
        ms.actionBtn,
        {
          backgroundColor: s.bg,
          borderColor: s.border,
          opacity: action.disabled ? 0.5 : 1,
        },
        variant === 'ghost' && { paddingHorizontal: 12 },
      ]}
      onPress={action.onPress}
      disabled={action.disabled || action.loading}
      activeOpacity={0.7}
    >
      {action.icon && !action.loading && (
        <Ionicons name={action.icon} size={16} color={s.text} />
      )}
      {action.loading && (
        <Ionicons name="sync" size={16} color={s.text} />
      )}
      <Text style={[ms.actionBtnText, { color: s.text }]}>{action.label}</Text>
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ModalConfig | null>(null);
  const [visible, setVisible] = useState(false);
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const resolveRef = useRef<((val: boolean) => void) | null>(null);

  const animateIn = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 65,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropAnim, scaleAnim, opacityAnim]);

  const animateOut = useCallback(
    (cb?: () => void) => {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setVisible(false);
        setConfig(null);
        cb?.();
      });
    },
    [backdropAnim, scaleAnim, opacityAnim]
  );

  const dismiss = useCallback(() => {
    animateOut(() => {
      config?.onDismiss?.();
      if (resolveRef.current) {
        resolveRef.current(false);
        resolveRef.current = null;
      }
    });
  }, [animateOut, config]);

  const show = useCallback(
    (cfg: ModalConfig) => {
      setConfig(cfg);
      setVisible(true);
      setTimeout(animateIn, 20);
    },
    [animateIn]
  );

  const confirm = useCallback(
    (cfg: ConfirmConfig): Promise<boolean> => {
      return new Promise((resolve) => {
        resolveRef.current = resolve;
        const modalCfg: ModalConfig = {
          title: cfg.title,
          message: cfg.message,
          variant: cfg.variant ?? 'default',
          icon: cfg.icon,
          dismissible: true,
          actions: [
            {
              label: cfg.cancelLabel ?? 'Annuler',
              variant: 'secondary',
              onPress: () => {
                animateOut(() => {
                  resolve(false);
                  resolveRef.current = null;
                });
              },
            },
            {
              label: cfg.confirmLabel ?? 'Confirmer',
              variant: cfg.variant === 'danger' ? 'danger' : 'primary',
              icon: cfg.variant === 'danger' ? 'trash-outline' : 'checkmark',
              onPress: () => {
                animateOut(() => {
                  resolve(true);
                  resolveRef.current = null;
                });
              },
            },
          ],
        };
        setConfig(modalCfg);
        setVisible(true);
        setTimeout(animateIn, 20);
      });
    },
    [animateIn, animateOut]
  );

  const alertFn = useCallback(
    (title: string, message: string, variant: ModalVariant = 'info'): Promise<void> => {
      return new Promise((resolve) => {
        const modalCfg: ModalConfig = {
          title,
          message,
          variant,
          dismissible: true,
          actions: [
            {
              label: 'OK',
              variant: 'primary',
              onPress: () => {
                animateOut(() => resolve());
              },
            },
          ],
        };
        setConfig(modalCfg);
        setVisible(true);
        setTimeout(animateIn, 20);
      });
    },
    [animateIn, animateOut]
  );

  const vt = modalTheme[config?.variant ?? 'default'];
  const size = config?.size ?? 'md';
  const modalWidth = isMobile
    ? '92%'
    : typeof sizeMap[size] === 'number'
    ? sizeMap[size]
    : sizeMap[size];

  return (
    <ModalContext.Provider value={{ show, confirm, alert: alertFn, dismiss }}>
      {children}

      {visible && config && (
        <View style={[ms.overlay, { pointerEvents: 'auto' }]}>
          {/* Backdrop */}
          <Animated.View style={[ms.backdrop, { opacity: backdropAnim }]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={config.dismissible !== false ? dismiss : undefined}
            />
          </Animated.View>

          {/* Modal */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[ms.modalCenter, { pointerEvents: 'box-none' }]}
          >
            <Animated.View
              style={[
                ms.modal,
                {
                  width: modalWidth as any,
                  maxWidth: 700,
                  opacity: opacityAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              {/* Header accent bar */}
              <View style={[ms.headerBar, { backgroundColor: vt.headerAccent }]} />

              {/* Close button */}
              {config.dismissible !== false && (
                <TouchableOpacity
                  style={ms.closeBtn}
                  onPress={dismiss}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="close" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              )}

              {/* Header */}
              <View style={ms.header}>
                <View style={[ms.iconCircle, { backgroundColor: vt.iconBg }]}>
                  <Ionicons
                    name={config.icon ?? vt.defaultIcon}
                    size={28}
                    color={vt.iconColor}
                  />
                </View>
                <Text style={ms.title}>{config.title}</Text>
                {config.message && (
                  <Text style={ms.message}>{config.message}</Text>
                )}
              </View>

              {/* Custom Content */}
              {config.content && (
                <ScrollView
                  style={ms.contentScroll}
                  contentContainerStyle={ms.contentInner}
                  showsVerticalScrollIndicator={false}
                >
                  {config.content}
                </ScrollView>
              )}

              {/* Actions */}
              {config.actions && config.actions.length > 0 && (
                <View style={ms.actions}>
                  {config.actions.map((action, i) => (
                    <ModalButton key={i} action={action} variantTheme={vt} />
                  ))}
                </View>
              )}
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      )}
    </ModalContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const ms = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99998,
    pointerEvents: 'auto',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  modalCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    pointerEvents: 'box-none',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    maxHeight: SCREEN_H * 0.85,
    ...shadows.xl,
  },
  headerBar: {
    height: 4,
    width: '100%',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 28,
    paddingBottom: 8,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 400,
  },
  contentScroll: {
    maxHeight: SCREEN_H * 0.4,
  },
  contentInner: {
    paddingHorizontal: 28,
    paddingVertical: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 28,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: isMobile ? '48%' : 100,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
