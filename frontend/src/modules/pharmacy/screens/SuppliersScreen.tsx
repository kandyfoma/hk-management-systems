import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../../components/GlobalUI';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import DatabaseService from '../../../services/DatabaseService';
import HybridDataService from '../../../services/HybridDataService';
import { Supplier } from '../../../models/Inventory';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getPaymentLabel(terms: string): string {
  const labels: Record<string, string> = {
    CASH_ON_DELIVERY: 'Paiement à la livraison',
    NET_15: 'Net 15 jours',
    NET_30: 'Net 30 jours',
    NET_60: 'Net 60 jours',
    NET_90: 'Net 90 jours',
    PREPAID: 'Prépayé',
    CONSIGNMENT: 'Consignation',
    CREDIT_LINE: 'Ligne de crédit',
  };
  return labels[terms] || terms;
}

function getRatingStars(rating: number, max = 5): string {
  const full = Math.round(rating);
  return '★'.repeat(full) + '☆'.repeat(max - full);
}

function getRatingColor(rating: number): string {
  if (rating >= 4) return colors.success;
  if (rating >= 3) return colors.warning;
  return colors.error;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function SuppliersScreen() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const db = DatabaseService.getInstance();
      const license = await db.getLicenseByKey('TRIAL-HK2024XY-Z9M3');
      if (!license) return;

      const rawSuppliers = await db.getSuppliersByOrganization(license.organizationId);
      setSuppliers(rawSuppliers.filter((s) => s.isActive));
    } catch (err) {
      console.error('Suppliers load error', err);
      toast.error('Erreur lors du chargement des fournisseurs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.loadingText}>Chargement des fournisseurs…</Text>
      </View>
    );
  }

  const activeCount = suppliers.length;
  const avgRating = suppliers.length
    ? suppliers.reduce((acc, s) => acc + (s.rating || 0), 0) / suppliers.length
    : 0;
  const avgLeadTime = suppliers.length
    ? Math.round(suppliers.reduce((acc, s) => acc + (s.leadTimeDays || 0), 0) / suppliers.length)
    : 0;

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      {/* ─── Header ────────────────────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Fournisseurs</Text>
          <Text style={s.headerSubtitle}>
            {activeCount} fournisseur{activeCount !== 1 ? 's' : ''} actif{activeCount !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={s.addBtn}
          activeOpacity={0.7}
          onPress={() => toast.info('Ajout de fournisseur — bientôt disponible')}
        >
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={s.addBtnText}>Nouveau Fournisseur</Text>
        </TouchableOpacity>
      </View>

      {/* ─── KPI Cards ──────────────────────────────────────── */}
      <View style={s.kpiRow}>
        <KPICard icon="people" label="Total" value={`${activeCount}`} color={colors.primary} />
        <KPICard icon="star" label="Note moy." value={avgRating.toFixed(1)} color={colors.warning} />
        <KPICard icon="time" label="Délai moy." value={`${avgLeadTime}j`} color={colors.info} />
      </View>

      {/* ─── Supplier Cards ─────────────────────────────────── */}
      {suppliers.length === 0 ? (
        <View style={s.emptyState}>
          <Ionicons name="business-outline" size={48} color={colors.textTertiary} />
          <Text style={s.emptyTitle}>Aucun fournisseur</Text>
          <Text style={s.emptySubtitle}>Ajoutez votre premier fournisseur</Text>
        </View>
      ) : (
        <View style={s.grid}>
          {suppliers.map((supplier) => (
            <SupplierCard
              key={supplier.id}
              supplier={supplier}
              expanded={expandedId === supplier.id}
              onToggle={() => setExpandedId(expandedId === supplier.id ? null : supplier.id)}
              onContact={(type: string) => {
                if (type === 'phone' && supplier.phone) {
                  Linking.openURL(`tel:${supplier.phone}`);
                } else if (type === 'email' && supplier.email) {
                  Linking.openURL(`mailto:${supplier.email}`);
                }
              }}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function KPICard({ icon, label, value, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color: string }) {
  return (
    <View style={s.kpiCard}>
      <View style={[s.kpiIcon, { backgroundColor: color + '14' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={s.kpiValue}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
    </View>
  );
}

function SupplierCard({
  supplier,
  expanded,
  onToggle,
  onContact,
}: {
  supplier: Supplier;
  expanded: boolean;
  onToggle: () => void;
  onContact: (type: string) => void;
}) {
  const ratingColor = getRatingColor(supplier.rating || 0);

  return (
    <View style={s.card}>
      {/* ── Main Row ────────────────────────────────────── */}
      <TouchableOpacity style={s.cardMain} onPress={onToggle} activeOpacity={0.7}>
        {/* Avatar */}
        <View style={s.avatar}>
          <Text style={s.avatarText}>
            {supplier.name.split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase()}
          </Text>
        </View>

        {/* Info */}
        <View style={s.cardInfo}>
          <Text style={s.cardName} numberOfLines={1}>{supplier.name}</Text>
          <View style={s.cardMetaRow}>
            {supplier.city && (
              <View style={s.metaChip}>
                <Ionicons name="location" size={11} color={colors.textTertiary} />
                <Text style={s.metaText}>{supplier.city}{supplier.country ? `, ${supplier.country}` : ''}</Text>
              </View>
            )}
            <View style={s.metaChip}>
              <Ionicons name="time-outline" size={11} color={colors.textTertiary} />
              <Text style={s.metaText}>{supplier.leadTimeDays || '—'}j</Text>
            </View>
          </View>
        </View>

        {/* Rating */}
        <View style={s.ratingCol}>
          <Text style={[s.ratingStars, { color: ratingColor }]}>
            {getRatingStars(supplier.rating || 0)}
          </Text>
          <Text style={s.ratingNum}>{(supplier.rating || 0).toFixed(1)}</Text>
        </View>

        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
      </TouchableOpacity>

      {/* ── Expanded ────────────────────────────────────── */}
      {expanded && (
        <View style={s.detail}>
          <View style={s.divider} />

          {/* Contact info */}
          <View style={s.detailSection}>
            <Text style={s.detailSectionTitle}>Contact</Text>
            <View style={s.contactGrid}>
              {supplier.contactPerson && (
                <ContactRow icon="person" label="Personne" value={supplier.contactPerson} />
              )}
              {supplier.phone && (
                <ContactRow icon="call" label="Téléphone" value={supplier.phone} onPress={() => onContact('phone')} />
              )}
              {supplier.email && (
                <ContactRow icon="mail" label="Email" value={supplier.email} onPress={() => onContact('email')} />
              )}
              {supplier.address && (
                <ContactRow icon="location" label="Adresse" value={supplier.address} />
              )}
              {supplier.taxId && (
                <ContactRow icon="document-text" label="N° fiscal" value={supplier.taxId} />
              )}
            </View>
          </View>

          {/* Terms */}
          <View style={s.detailSection}>
            <Text style={s.detailSectionTitle}>Conditions commerciales</Text>
            <View style={s.termsGrid}>
              <TermChip label="Paiement" value={getPaymentLabel(supplier.paymentTerms)} icon="card" />
              <TermChip label="Délai livraison" value={`${supplier.leadTimeDays || '—'} jours`} icon="time" />
              {supplier.minimumOrder !== undefined && supplier.minimumOrder > 0 && (
                <TermChip label="Commande min." value={`$${supplier.minimumOrder}`} icon="cart" />
              )}
            </View>
          </View>

          {/* Actions */}
          <View style={s.actionRow}>
            {supplier.phone && (
              <TouchableOpacity style={s.actionBtn} onPress={() => onContact('phone')} activeOpacity={0.7}>
                <Ionicons name="call" size={16} color={colors.primary} />
                <Text style={s.actionText}>Appeler</Text>
              </TouchableOpacity>
            )}
            {supplier.email && (
              <TouchableOpacity style={s.actionBtn} onPress={() => onContact('email')} activeOpacity={0.7}>
                <Ionicons name="mail" size={16} color={colors.primary} />
                <Text style={s.actionText}>Email</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[s.actionBtn, s.actionBtnOutline]} activeOpacity={0.7}>
              <Ionicons name="create" size={16} color={colors.textSecondary} />
              <Text style={[s.actionText, { color: colors.textSecondary }]}>Modifier</Text>
            </TouchableOpacity>
          </View>

          {/* Notes */}
          {supplier.notes && (
            <View style={s.notesBox}>
              <Ionicons name="chatbox-ellipses" size={14} color={colors.textTertiary} />
              <Text style={s.notesText}>{supplier.notes}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function ContactRow({ icon, label, value, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; onPress?: () => void }) {
  const content = (
    <View style={s.contactRow}>
      <Ionicons name={icon} size={14} color={colors.textTertiary} style={{ marginTop: 2 }} />
      <View style={s.contactInfo}>
        <Text style={s.contactLabel}>{label}</Text>
        <Text style={[s.contactValue, onPress ? { color: colors.primary } : undefined]}>{value}</Text>
      </View>
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>;
  }
  return content;
}

function TermChip({ label, value, icon }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={s.termChip}>
      <Ionicons name={icon} size={14} color={colors.primary} />
      <View>
        <Text style={s.termLabel}>{label}</Text>
        <Text style={s.termValue}>{value}</Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: isDesktop ? 28 : 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.textSecondary },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  headerSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: borderRadius.lg, gap: 8, ...shadows.sm },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  // KPI
  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  kpiCard: { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 16, alignItems: 'center', ...shadows.sm },
  kpiIcon: { width: 44, height: 44, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kpiValue: { fontSize: 22, fontWeight: '700', color: colors.text },
  kpiLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '500', marginTop: 2 },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },

  // Grid
  grid: { gap: 12 },

  // Card
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.outline, ...shadows.sm, overflow: 'hidden' },
  cardMain: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: borderRadius.full, backgroundColor: colors.primaryFaded, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  cardInfo: { flex: 1, minWidth: 0 },
  cardName: { fontSize: 15, fontWeight: '600', color: colors.text },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, color: colors.textTertiary },
  ratingCol: { alignItems: 'flex-end', marginRight: 6 },
  ratingStars: { fontSize: 13, letterSpacing: 1 },
  ratingNum: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', marginTop: 2 },

  // Detail
  detail: { paddingHorizontal: 14, paddingBottom: 14 },
  divider: { height: 1, backgroundColor: colors.outline, marginBottom: 12 },
  detailSection: { marginBottom: 14 },
  detailSectionTitle: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },

  // Contact
  contactGrid: { gap: 8 },
  contactRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  contactInfo: {},
  contactLabel: { fontSize: 10, color: colors.textTertiary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  contactValue: { fontSize: 13, color: colors.text, marginTop: 1 },

  // Terms
  termsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  termChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md, paddingHorizontal: 12, paddingVertical: 8, flex: 1, minWidth: 140 },
  termLabel: { fontSize: 10, color: colors.textTertiary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  termValue: { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 1 },

  // Actions
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primaryFaded, paddingHorizontal: 14, paddingVertical: 8, borderRadius: borderRadius.lg },
  actionBtnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.outline },
  actionText: { fontSize: 13, fontWeight: '600', color: colors.primary },

  // Notes
  notesBox: { flexDirection: 'row', gap: 8, backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md, padding: 10, alignItems: 'flex-start' },
  notesText: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
});
