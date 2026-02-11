import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../components/GlobalUI';
import { colors, borderRadius, shadows, spacing } from '../../theme/theme';

// ─── Generic Placeholder Screen ──────────────────────────────
// Used for sub-screens that haven't been fully built yet.
// Shows a professional "coming soon" card with feature preview.

interface PlaceholderScreenProps {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  features: string[];
}

export function PlaceholderScreen({
  title,
  subtitle,
  icon,
  accentColor,
  features,
}: PlaceholderScreenProps) {
  const { showToast } = useToast();
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Hero Card */}
      <View style={styles.heroCard}>
        <View style={[styles.heroIcon, { backgroundColor: accentColor + '14' }]}>
          <Ionicons name={icon} size={48} color={accentColor} />
        </View>
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroSubtitle}>{subtitle}</Text>
        <View style={[styles.statusChip, { backgroundColor: accentColor + '14' }]}>
          <View style={[styles.statusDot, { backgroundColor: accentColor }]} />
          <Text style={[styles.statusText, { color: accentColor }]}>En Développement</Text>
        </View>
      </View>

      {/* Features Preview */}
      <View style={styles.featuresCard}>
        <Text style={styles.featuresTitle}>Fonctionnalités Prévues</Text>
        {features.map((feature, idx) => (
          <View key={idx} style={styles.featureRow}>
            <View style={[styles.featureDot, { backgroundColor: accentColor }]} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      {/* Action Placeholder */}
      <TouchableOpacity
        style={[styles.actionBtn, { backgroundColor: accentColor }]}
        activeOpacity={0.8}
        onPress={() => showToast(`Notification activée pour ${title}`, 'success')}
      >
        <Ionicons name="notifications-outline" size={20} color="#FFF" />
        <Text style={styles.actionBtnText}>Me Notifier au Lancement</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 500,
    marginBottom: 20,
    ...shadows.sm,
  },
  heroIcon: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  featuresCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    marginBottom: 20,
    ...shadows.sm,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    gap: 12,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  featureText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    gap: 10,
    ...shadows.md,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
