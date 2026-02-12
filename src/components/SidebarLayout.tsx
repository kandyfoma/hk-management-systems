import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Animated,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing, typography } from '../theme/theme';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const SIDEBAR_WIDTH = 260;
const SIDEBAR_COLLAPSED = 68;

// ─── Mobile Sidebar Modal ───────────────────────────────────
function MobileSidebarModal({
  visible,
  sections,
  activeId,
  onSelect,
  onClose,
  accentColor,
  title,
  subtitle,
  headerIcon,
}: {
  visible: boolean;
  sections: SidebarSection[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  accentColor: string;
  title?: string;
  subtitle?: string;
  headerIcon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <View style={mobileSidebarStyles.container}>
        {/* Header */}
        <View style={mobileSidebarStyles.header}>
          <View style={mobileSidebarStyles.headerContent}>
            {headerIcon && (
              <View style={[mobileSidebarStyles.headerIcon, { backgroundColor: accentColor + '14' }]}>
                <Ionicons name={headerIcon} size={24} color={accentColor} />
              </View>
            )}
            <View style={mobileSidebarStyles.headerText}>
              {title && <Text style={mobileSidebarStyles.headerTitle}>{title}</Text>}
              {subtitle && <Text style={mobileSidebarStyles.headerSubtitle}>{subtitle}</Text>}
            </View>
          </View>
          <TouchableOpacity
            style={mobileSidebarStyles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Sidebar Content */}
        <ScrollView style={mobileSidebarStyles.content} showsVerticalScrollIndicator={false}>
          {sections.map((section, sIdx) => (
            <View key={sIdx}>
              {/* Section Header */}
              {section.title && (
                <View style={mobileSidebarStyles.sectionHeader}>
                  <Text style={mobileSidebarStyles.sectionTitle}>{section.title}</Text>
                </View>
              )}
              
              {/* Section Items */}
              {section.items.map((item) => {
                const isActive = item.id === activeId;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      mobileSidebarStyles.menuItem,
                      isActive && {
                        backgroundColor: accentColor + '14',
                        borderLeftColor: accentColor,
                        borderLeftWidth: 3,
                      },
                    ]}
                    onPress={() => {
                      onSelect(item.id);
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      mobileSidebarStyles.menuIcon,
                      isActive && { backgroundColor: accentColor + '20' }
                    ]}>
                      <Ionicons
                        name={isActive ? (item.iconActive || item.icon) : item.icon}
                        size={20}
                        color={isActive ? accentColor : colors.textSecondary}
                      />
                    </View>
                    <Text style={[
                      mobileSidebarStyles.menuLabel,
                      isActive && { color: accentColor, fontWeight: '600' },
                    ]}>
                      {item.label}
                    </Text>
                    {item.badge ? (
                      <View style={[mobileSidebarStyles.badge, { backgroundColor: colors.error }]}>
                        <Text style={mobileSidebarStyles.badgeText}>{item.badge}</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
              
              {/* Section Divider */}
              {sIdx < sections.length - 1 && <View style={mobileSidebarStyles.sectionDivider} />}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const mobileSidebarStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.sidebar,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? spacing.xl + 10 : spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.sidebarHover,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.sidebarText,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.sidebarText,
    marginTop: 2,
  },
  closeButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.sidebarText,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuLabel: {
    fontSize: 15,
    color: colors.sidebarText,
    flex: 1,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.surface,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.sidebarHover,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
  },
});

// ─── Mobile Header Component ─────────────────────────────────
function MobileHeader({
  title,
  subtitle,
  headerIcon,
  accentColor,
  onMenuPress,
}: {
  title?: string;
  subtitle?: string;
  headerIcon?: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  onMenuPress: () => void;
}) {
  return (
    <View style={mobileHeaderStyles.container}>
      <View style={mobileHeaderStyles.content}>
        <TouchableOpacity
          style={mobileHeaderStyles.menuButton}
          onPress={onMenuPress}
          activeOpacity={0.7}
        >
          <Ionicons name="menu" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={mobileHeaderStyles.titleContainer}>
          {headerIcon && (
            <View style={[mobileHeaderStyles.headerIcon, { backgroundColor: accentColor + '14' }]}>
              <Ionicons name={headerIcon} size={20} color={accentColor} />
            </View>
          )}
          <View>
            {title && <Text style={mobileHeaderStyles.title}>{title}</Text>}
            {subtitle && <Text style={mobileHeaderStyles.subtitle}>{subtitle}</Text>}
          </View>
        </View>
      </View>
    </View>
  );
}

const mobileHeaderStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    ...shadows.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingTop: Platform.OS === 'ios' ? spacing.xl + 10 : spacing.md, // Account for status bar
  },
  menuButton: {
    padding: spacing.sm,
    marginRight: spacing.md,
    borderRadius: borderRadius.sm,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
});

// ─── Mobile Sidebar Modal ───────────────────────────────────
export interface SidebarMenuItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive?: keyof typeof Ionicons.glyphMap;
  badge?: number;
}

export interface SidebarSection {
  title?: string;
  items: SidebarMenuItem[];
}

interface SidebarLayoutProps {
  sections: SidebarSection[];
  activeId: string;
  onSelect: (id: string) => void;
  children: React.ReactNode;
  accentColor?: string;
  title?: string;
  subtitle?: string;
  headerIcon?: keyof typeof Ionicons.glyphMap;
}

// ─── Sidebar Layout Component ────────────────────────────────
export function SidebarLayout({
  sections,
  activeId,
  onSelect,
  children,
  accentColor = colors.primary,
  title,
  subtitle,
  headerIcon,
}: SidebarLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const sidebarW = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;

  // Track navigation history for back button
  const [navHistory, setNavHistory] = useState<string[]>([]);
  const isPoppingRef = useRef(false);

  // Find the label for the current active screen
  const getActiveLabel = useCallback((id: string): string => {
    for (const section of sections) {
      for (const item of section.items) {
        if (item.id === id) return item.label;
      }
    }
    return 'Tableau de Bord';
  }, [sections]);

  // Update browser tab title when active screen changes
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const label = getActiveLabel(activeId);
      document.title = `${label} — HK Management Systems`;
    }
  }, [activeId, getActiveLabel]);

  // Push to browser history when navigating (web only)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    if (isPoppingRef.current) {
      isPoppingRef.current = false;
      return;
    }

    // Push state for browser back/forward
    const label = getActiveLabel(activeId);
    window.history.pushState({ screenId: activeId }, label, `#${activeId}`);

    // Track internal history for back button visibility
    setNavHistory(prev => {
      if (prev[prev.length - 1] === activeId) return prev;
      return [...prev, activeId];
    });
  }, [activeId, getActiveLabel]);

  // Listen for browser back/forward button
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.screenId) {
        isPoppingRef.current = true;
        onSelect(event.state.screenId);
        setNavHistory(prev => prev.slice(0, -1));
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onSelect]);

  const canGoBack = navHistory.length > 1;

  const handleGoBack = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.history.back();
    } else if (navHistory.length > 1) {
      const previousScreen = navHistory[navHistory.length - 2];
      setNavHistory(prev => prev.slice(0, -1));
      onSelect(previousScreen);
    }
  };

  // Mobile: header with menu button + modal sidebar
  if (!isDesktop) {
    return (
      <View style={styles.mobileContainer}>
        <MobileHeader
          title={title}
          subtitle={subtitle}
          headerIcon={headerIcon}
          accentColor={accentColor}
          onMenuPress={() => setMobileMenuVisible(true)}
        />
        <View style={styles.mobileContent}>
          {canGoBack && (
            <View style={styles.mobileBackBar}>
              <TouchableOpacity
                style={styles.mobileBackButton}
                onPress={handleGoBack}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={18} color={colors.primary} />
                <Text style={styles.mobileBackText}>Retour</Text>
              </TouchableOpacity>
            </View>
          )}
          {children}
        </View>
        
        <MobileSidebarModal
          visible={mobileMenuVisible}
          sections={sections}
          activeId={activeId}
          onSelect={onSelect}
          onClose={() => setMobileMenuVisible(false)}
          accentColor={accentColor}
          title={title}
          subtitle={subtitle}
          headerIcon={headerIcon}
        />
      </View>
    );
  }

  // Desktop: collapsible dark sidebar + content area
  return (
    <View style={styles.container}>
      {/* ── Sidebar ──────────────────────────────── */}
      <View style={[styles.sidebar, { width: sidebarW }]}>
        {/* Sidebar Header */}
        <View style={styles.sidebarHeader}>
          {headerIcon && (
            <View style={[styles.sidebarHeaderIcon, { backgroundColor: accentColor + '20' }]}>
              <Ionicons name={headerIcon} size={24} color={accentColor} />
            </View>
          )}
          {!collapsed && title && (
            <View style={styles.sidebarHeaderText}>
              <Text style={styles.sidebarTitle}>{title}</Text>
              {subtitle && <Text style={styles.sidebarSubtitle}>{subtitle}</Text>}
            </View>
          )}
        </View>

        {/* Menu Sections */}
        <ScrollView
          style={styles.sidebarScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sidebarScrollContent}
        >
          {sections.map((section, sIdx) => (
            <View key={sIdx}>
              {/* ── Section Divider ── */}
              {sIdx > 0 && <View style={styles.sectionDivider} />}

              {/* Section Label */}
              {section.title && !collapsed && (
                <Text style={styles.sectionLabel}>{section.title}</Text>
              )}
              {section.title && collapsed && (
                <View style={styles.sectionDotRow}>
                  <View style={[styles.sectionDot, { backgroundColor: accentColor + '40' }]} />
                </View>
              )}

              {/* Section Items */}
              {section.items.map((item) => {
                const isActive = item.id === activeId;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.menuItem,
                      collapsed && styles.menuItemCollapsed,
                      isActive && styles.menuItemActive,
                      isActive && { borderLeftColor: accentColor },
                    ]}
                    onPress={() => onSelect(item.id)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.menuIconWrap,
                        isActive && { backgroundColor: accentColor + '20' },
                      ]}
                    >
                      <Ionicons
                        name={isActive ? (item.iconActive || item.icon) : item.icon}
                        size={20}
                        color={isActive ? accentColor : colors.sidebarText}
                      />
                    </View>
                    {!collapsed && (
                      <Text
                        style={[
                          styles.menuLabel,
                          isActive && styles.menuLabelActive,
                        ]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                    )}
                    {!collapsed && item.badge ? (
                      <View style={styles.menuBadge}>
                        <Text style={styles.menuBadgeText}>{item.badge}</Text>
                      </View>
                    ) : null}
                    {collapsed && item.badge ? (
                      <View style={styles.menuBadgeCollapsed}>
                        <Text style={styles.menuBadgeText}>{item.badge}</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>

        {/* Sidebar Footer — Toggle + Status */}
        <View style={styles.sidebarFooter}>
          {!collapsed && (
            <>
              <View style={styles.sidebarFooterDot} />
              <Text style={styles.sidebarFooterText}>Système Actif</Text>
            </>
          )}
          <TouchableOpacity
            onPress={() => setCollapsed(!collapsed)}
            style={styles.toggleBtn}
            activeOpacity={0.7}
          >
            <Ionicons
              name={collapsed ? 'chevron-forward' : 'chevron-back'}
              size={18}
              color={colors.sidebarText}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Main Content ─────────────────────────── */}
      <View style={styles.content}>
        {/* Content Header with Back Button + Page Title */}
        <View style={styles.contentHeader}>
          <View style={styles.contentHeaderLeft}>
            {canGoBack && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleGoBack}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={20} color={colors.text} />
              </TouchableOpacity>
            )}
            <Text style={styles.contentHeaderTitle}>{getActiveLabel(activeId)}</Text>
          </View>
        </View>
        {children}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Desktop Styles
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  mobileContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mobileContent: {
    flex: 1,
  },

  // ── Sidebar ─────────────────────────────────────────
  sidebar: {
    backgroundColor: colors.sidebar,
    borderRightWidth: 1,
    borderRightColor: colors.sidebarHover,
    ...Platform.select({
      web: { height: '100%' as any, transition: 'width 0.2s ease' as any },
      default: {},
    }),
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.sidebarHover,
    gap: 12,
    minHeight: 72,
  },
  sidebarHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarHeaderText: {
    flex: 1,
  },
  sidebarTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.sidebarTextActive,
    marginBottom: 2,
  },
  sidebarSubtitle: {
    fontSize: 11,
    color: colors.sidebarText,
  },
  sidebarScroll: {
    flex: 1,
  },
  sidebarScrollContent: {
    paddingVertical: 8,
  },

  // ── Section Divider ─────────────────────────────────
  sectionDivider: {
    height: 1,
    backgroundColor: colors.sidebarHover,
    marginHorizontal: 16,
    marginVertical: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.sidebarText,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sectionDotRow: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  sectionDot: {
    width: 20,
    height: 3,
    borderRadius: 2,
  },

  // ── Menu Item ───────────────────────────────────────
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginHorizontal: 8,
    marginVertical: 1,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    gap: 12,
  },
  menuItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
    marginHorizontal: 6,
  },
  menuItemActive: {
    backgroundColor: colors.sidebarActive,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: colors.sidebarText,
  },
  menuLabelActive: {
    color: colors.sidebarTextActive,
    fontWeight: '600',
  },
  menuBadge: {
    backgroundColor: colors.error,
    borderRadius: borderRadius.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  menuBadgeCollapsed: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.error,
    borderRadius: borderRadius.full,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  menuBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── Footer ──────────────────────────────────────────
  sidebarFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.sidebarHover,
    gap: 8,
  },
  sidebarFooterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  sidebarFooterText: {
    flex: 1,
    fontSize: 12,
    color: colors.sidebarText,
    fontWeight: '500',
  },
  toggleBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: colors.sidebarHover,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Content ─────────────────────────────────────────
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    minHeight: 48,
  },
  contentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  mobileBackBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  mobileBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  mobileBackText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
});

// ═══════════════════════════════════════════════════════════════
// Mobile Styles
// ═══════════════════════════════════════════════════════════════
