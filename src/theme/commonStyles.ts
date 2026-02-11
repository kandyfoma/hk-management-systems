import { StyleSheet } from 'react-native';
import { colors, spacing, typography, borderRadius, shadows, components } from './theme';

// Common component styles that can be reused
export const commonStyles = StyleSheet.create({
  // Layout styles
  flex1: {
    flex: 1,
  },
  flexRow: {
    flexDirection: 'row',
  },
  flexColumn: {
    flexDirection: 'column',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerHorizontal: {
    alignItems: 'center',
  },
  centerVertical: {
    justifyContent: 'center',
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
  spaceAround: {
    justifyContent: 'space-around',
  },
  spaceEvenly: {
    justifyContent: 'space-evenly',
  },

  // Padding styles
  padding: {
    padding: spacing.md,
  },
  paddingHorizontal: {
    paddingHorizontal: spacing.md,
  },
  paddingVertical: {
    paddingVertical: spacing.md,
  },
  paddingSmall: {
    padding: spacing.sm,
  },
  paddingLarge: {
    padding: spacing.lg,
  },

  // Margin styles
  margin: {
    margin: spacing.md,
  },
  marginHorizontal: {
    marginHorizontal: spacing.md,
  },
  marginVertical: {
    marginVertical: spacing.md,
  },
  marginSmall: {
    margin: spacing.sm,
  },
  marginLarge: {
    margin: spacing.lg,
  },
  marginBottom: {
    marginBottom: spacing.md,
  },
  marginTop: {
    marginTop: spacing.md,
  },

  // Text styles
  textCenter: {
    textAlign: 'center',
  },
  textLeft: {
    textAlign: 'left',
  },
  textRight: {
    textAlign: 'right',
  },
  textBold: {
    fontWeight: typography.fontWeight.bold,
  },
  textMedium: {
    fontWeight: typography.fontWeight.medium,
  },
  textPrimary: {
    color: colors.primary,
  },
  textSecondary: {
    color: colors.textSecondary,
  },
  textDisabled: {
    color: colors.textDisabled,
  },
  textError: {
    color: colors.error,
  },
  textSuccess: {
    color: colors.success,
  },
  textWarning: {
    color: colors.warning,
  },

  // Background styles
  backgroundPrimary: {
    backgroundColor: colors.primary,
  },
  backgroundSecondary: {
    backgroundColor: colors.secondary,
  },
  backgroundSurface: {
    backgroundColor: colors.surface,
  },
  backgroundWhite: {
    backgroundColor: colors.surface,
  },
  backgroundTransparent: {
    backgroundColor: 'transparent',
  },

  // Shadow styles
  shadowSmall: shadows.sm,
  shadowMedium: shadows.md,
  shadowLarge: shadows.lg,
  shadowXLarge: shadows.xl,

  // Border styles
  borderRadius: {
    borderRadius: borderRadius.md,
  },
  borderRadiusSmall: {
    borderRadius: borderRadius.sm,
  },
  borderRadiusLarge: {
    borderRadius: borderRadius.lg,
  },
  borderRadiusFull: {
    borderRadius: borderRadius.full,
  },
  border: {
    borderWidth: 1,
    borderColor: colors.outline,
  },
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  borderLeft: {
    borderLeftWidth: 1,
    borderLeftColor: colors.outline,
  },
  borderRight: {
    borderRightWidth: 1,
    borderRightColor: colors.outline,
  },

  // Position styles
  absolute: {
    position: 'absolute',
  },
  relative: {
    position: 'relative',
  },
  absoluteFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Specific component styles
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

// Screen-specific common styles
export const screenStyles = StyleSheet.create({
  // Dashboard styles
  dashboardContainer: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingVertical: spacing.md,
  },
  dashboardMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },

  // Card styles
  card: {
    ...components.card.default,
    marginBottom: spacing.md,
  },
  cardElevated: {
    ...components.card.elevated,
    marginBottom: spacing.md,
  },
  metricCard: {
    ...components.metricCard,
    flex: 1,
    minWidth: 150,
  },

  // List styles
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  listItemActive: {
    backgroundColor: colors.primary + '10',
    borderRightWidth: 3,
    borderRightColor: colors.primary,
  },

  // Form styles
  formContainer: {
    padding: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  formInput: {
    ...components.input,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
  },
  formError: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    marginTop: spacing.xs,
  },

  // Button styles
  buttonPrimary: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  buttonSecondary: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },

  // Table styles
  table: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: components.table.rowHeight,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  tableCell: {
    flex: 1,
    fontSize: typography.fontSize.md,
    color: colors.onSurface,
  },

  // Status styles
  statusChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  statusSuccess: {
    backgroundColor: colors.success + '20',
    color: colors.success,
  },
  statusError: {
    backgroundColor: colors.error + '20',
    color: colors.error,
  },
  statusWarning: {
    backgroundColor: colors.warning + '20',
    color: colors.warning,
  },
  statusInfo: {
    backgroundColor: colors.info + '20',
    color: colors.info,
  },
});

// Animation styles
export const animations = {
  fadeIn: {
    opacity: 0,
  },
  slideInLeft: {
    transform: [{ translateX: -100 }],
  },
  slideInRight: {
    transform: [{ translateX: 100 }],
  },
  slideInUp: {
    transform: [{ translateY: 100 }],
  },
  slideInDown: {
    transform: [{ translateY: -100 }],
  },
  scale: {
    transform: [{ scale: 0.9 }],
  },
};

// Responsive utilities
export const responsive = {
  // Get responsive value based on screen size
  getValue: (mobile: any, tablet?: any, desktop?: any) => {
    // This would need to be implemented with hooks in actual usage
    return mobile; // Simplified for now
  },
  
  // Responsive padding
  getResponsivePadding: () => {
    // This would check screen size and return appropriate padding
    return spacing.md;
  },
  
  // Responsive font size
  getResponsiveFontSize: (baseSize: number) => {
    // This would scale font based on screen size
    return baseSize;
  },
};