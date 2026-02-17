import { DefaultTheme } from 'react-native-paper';
import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════
// Healthcare Center Design System
// Modern Medical & Hospital Management System
// Inspired by Healthcare Center UI/UX Design
// ═══════════════════════════════════════════════════════════════

export const colors = {
  // Primary — Hospital Blue (Pantone 2766 C from the design)
  primary: '#122056',
  primaryLight: '#1E3A8A',
  primaryDark: '#0F1B42',
  primaryFaded: 'rgba(18, 32, 86, 0.08)',

  // Secondary — Hospital Purple-Blue (Pantone 2726 C)
  secondary: '#5B65DC',
  secondaryLight: '#818CF8',
  secondaryDark: '#4338CA',

  // Accent — Lighter Purple-Blue
  accent: '#818CF8',
  accentLight: '#A5B4FC',
  accentDark: '#5B65DC',

  // Sidebar — Professional Dark Navy
  sidebar: '#0F1B42',
  sidebarHover: '#1E3A8A',
  sidebarActive: 'rgba(91, 101, 220, 0.15)',
  sidebarText: '#94A3B8',
  sidebarTextActive: '#FFFFFF',

  // Semantic
  success: '#5B65DC',
  successLight: '#E0E7FF',
  successDark: '#4338CA',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  errorDark: '#DC2626',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningDark: '#D97706',
  info: '#818CF8',
  infoLight: '#E0E7FF',
  infoDark: '#6366F1',

  // Surfaces — Clean Medical Blue-Tinted White
  background: '#FAFAFD',
  surface: '#FFFFFF',
  surfaceVariant: '#F1F5F9',
  outline: '#E2E8F0',
  outlineVariant: '#F1F5F9',

  // Text
  onSurface: '#0F172A',
  onSurfaceVariant: '#64748B',
  onBackground: '#0F172A',
  onPrimary: '#FFFFFF',
  onSecondary: '#FFFFFF',
  onError: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  textDisabled: '#CBD5E1',
  placeholder: '#94A3B8',
  disabled: '#CBD5E1',
  backdrop: 'rgba(18, 32, 86, 0.6)',
  shadow: 'rgba(18, 32, 86, 0.08)',

  // Charts — Modern Medical Data Visualization
  chart1: '#122056',
  chart2: '#5B65DC',
  chart3: '#818CF8',
  chart4: '#A5B4FC',
  chart5: '#8B5CF6',
  chart6: '#EC4899',
};

export const darkColors = {
  ...colors,
  background: '#0F1B42',
  surface: '#1E3A8A',
  surfaceVariant: '#334155',
  outline: '#334155',
  onSurface: '#F1F5F9',
  onSurfaceVariant: '#94A3B8',
  onBackground: '#F1F5F9',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  backdrop: 'rgba(18, 32, 86, 0.8)',
  shadow: 'rgba(18, 32, 86, 0.12)',
};

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    ...colors,
    notification: colors.primary,
  },
  roundness: 12,
  fonts: {
    ...DefaultTheme.fonts,
    regular: { fontFamily: 'System', fontWeight: '400' as '400' },
    medium: { fontFamily: 'System', fontWeight: '500' as '500' },
    light: { fontFamily: 'System', fontWeight: '300' as '300' },
    thin: { fontFamily: 'System', fontWeight: '100' as '100' },
  },
};

export const darkTheme = { ...theme, colors: { ...theme.colors, ...darkColors } };

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 48, massive: 64,
};

export const typography = {
  fontSize: {
    xs: 10, sm: 12, md: 14, lg: 16, xl: 18, xxl: 20, xxxl: 24, display: 28, hero: 32, massive: 40,
  },
  fontWeight: {
    light: '300' as '300', regular: '400' as '400', medium: '500' as '500',
    semiBold: '600' as '600', bold: '700' as '700', extraBold: '800' as '800',
  },
  lineHeight: { tight: 1.2, normal: 1.4, relaxed: 1.6, loose: 1.8 },
};

export const borderRadius = {
  none: 0, xs: 4, sm: 6, md: 8, lg: 12, xl: 16, xxl: 20, full: 9999,
};

// Platform-aware shadows: uses boxShadow on web, native shadow props on iOS/Android
const createShadow = (elevation: number, offsetY: number, opacity: number, radius: number, color = '#0F172A') => {
  if (Platform.OS === 'web') {
    if (elevation === 0) return { boxShadow: 'none' } as any;
    return { boxShadow: `0px ${offsetY}px ${radius}px rgba(15, 23, 42, ${opacity})` } as any;
  }
  return {
    elevation,
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius,
    shadowColor: color,
  };
};

export const shadows = {
  none: createShadow(0, 0, 0, 0),
  xs: createShadow(1, 1, 0.04, 2),
  sm: createShadow(2, 1, 0.06, 3),
  md: createShadow(3, 2, 0.08, 6),
  lg: createShadow(6, 4, 0.1, 12),
  xl: createShadow(10, 8, 0.12, 20),
};

export const layout = {
  screen: { width, height },
  breakpoints: { mobile: 320, tablet: 768, desktop: 1024, largeDesktop: 1440 },
  container: { sm: 640, md: 768, lg: 1024, xl: 1280, full: '100%' as const },
  sidebar: { width: 260, collapsedWidth: 72 },
  header: { height: 64 },
  footer: { height: 48 },
  fab: { size: 56, margin: 16 },
};

export const components = {
  card: {
    default: { borderRadius: borderRadius.xl, padding: spacing.xl, backgroundColor: colors.surface, ...shadows.sm },
    elevated: { borderRadius: borderRadius.xl, padding: spacing.xl, backgroundColor: colors.surface, ...shadows.md },
  },
  button: { height: { small: 36, medium: 44, large: 52 }, borderRadius: borderRadius.lg },
  input: { height: 48, borderRadius: borderRadius.md, padding: spacing.md },
  metricCard: { borderRadius: borderRadius.xl, padding: spacing.xl, backgroundColor: colors.surface, ...shadows.sm },
  table: { headerHeight: 48, rowHeight: 52, borderRadius: borderRadius.xl, backgroundColor: colors.surface, ...shadows.sm },
};

export const congoDesign = {
  touchTargetSize: { minimum: 44, comfortable: 56, large: 72 },
  highContrast: { background: '#FFFFFF', text: '#000000', primary: colors.primary, secondary: colors.accent, success: colors.success, error: colors.error },
  visualCues: {
    iconSize: { small: 20, medium: 24, large: 32, extraLarge: 48, huge: 64 },
    colors: { pharmacy: '#14B8A6', hospital: '#0D9488', emergency: '#EF4444', warning: '#F59E0B', info: '#14B8A6', success: '#10B981' },
  },
  offline: { indicators: { connected: '#14B8A6', disconnected: '#EF4444', syncing: '#F59E0B' } },
  performance: { imageQuality: 0.8, cacheSize: 50, prefetchLimit: 10 },
};

export const utils = {
  isTablet: () => width >= layout.breakpoints.tablet,
  isMobile: () => width < layout.breakpoints.tablet,
  isDesktop: () => width >= layout.breakpoints.desktop,
  withOpacity: (color: string, opacity: number) => `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
  getSpacing: (multiplier: number) => spacing.md * multiplier,
  getDynamicFontSize: (baseSize: number) => {
    if (width < layout.breakpoints.tablet) return baseSize * 0.9;
    if (width >= layout.breakpoints.desktop) return baseSize * 1.1;
    return baseSize;
  },
};

export const designSystem = { colors, darkColors, theme, darkTheme, spacing, typography, borderRadius, shadows, layout, components, congoDesign, utils };
