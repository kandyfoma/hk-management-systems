import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing, typography } from '../theme/theme';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const SIDEBAR_WIDTH = 260;
const SIDEBAR_COLLAPSED = 68;

// ─── Types ───────────────────────────────────────────────────
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

// ─── Mobile Horizontal Tab Bar ───────────────────────────────
function MobileTabBar({
  sections,
  activeId,
  onSelect,
  accentColor,
}: {
  sections: SidebarSection[];
  activeId: string;
  onSelect: (id: string) => void;
  accentColor: string;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={mobileStyles.tabBar}
      contentContainerStyle={mobileStyles.tabBarContent}
    >
      {sections.map((section, sIdx) => (
        <React.Fragment key={sIdx}>
          {/* Section divider on mobile */}
          {sIdx > 0 && <View style={mobileStyles.sectionDivider} />}
          {section.items.map((item) => {
            const isActive = item.id === activeId;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  mobileStyles.tab,
                  isActive && { backgroundColor: accentColor + '14', borderColor: accentColor },
                ]}
                onPress={() => onSelect(item.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isActive ? (item.iconActive || item.icon) : item.icon}
                  size={18}
                  color={isActive ? accentColor : colors.textSecondary}
                />
                <Text
                  style={[
                    mobileStyles.tabLabel,
                    isActive && { color: accentColor, fontWeight: '700' },
                  ]}
                >
                  {item.label}
                </Text>
                {item.badge ? (
                  <View style={[mobileStyles.badge, { backgroundColor: colors.error }]}>
                    <Text style={mobileStyles.badgeText}>{item.badge}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </React.Fragment>
      ))}
    </ScrollView>
  );
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
  const sidebarW = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;

  // On mobile, show a horizontal scrollable tab bar at the top
  if (!isDesktop) {
    return (
      <View style={styles.mobileContainer}>
        <MobileTabBar
          sections={sections}
          activeId={activeId}
          onSelect={onSelect}
          accentColor={accentColor}
        />
        <View style={styles.mobileContent}>{children}</View>
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
      <View style={styles.content}>{children}</View>
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
});

// ═══════════════════════════════════════════════════════════════
// Mobile Styles
// ═══════════════════════════════════════════════════════════════
const mobileStyles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    maxHeight: 52,
  },
  tabBarContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  sectionDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.outline,
    marginHorizontal: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
    gap: 6,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  badge: {
    borderRadius: borderRadius.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
