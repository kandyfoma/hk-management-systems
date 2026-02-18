import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../../components/GlobalUI';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import DatabaseService from '../../../services/DatabaseService';
import HybridDataService from '../../../services/HybridDataService';
import {
  Prescription,
  PrescriptionItem,
  PrescriptionStatus,
  PrescriptionItemStatus,
  PrescriptionUtils,
  MEDICATION_FREQUENCIES,
} from '../../../models/Prescription';
import { Product, InventoryItem } from '../../../models/Inventory';
import { SaleUtils } from '../../../models/Sale';

const { width: SCREEN_W } = Dimensions.get('window');
const IS_DESKTOP = SCREEN_W >= 1024;

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface EnrichedPrescription extends Prescription {
  patientName?: string;
  doctorName?: string;
  facilityName?: string;
}

type PrescriptionFilter = 'ALL' | 'PENDING' | 'PARTIAL' | 'COMPLETED' | 'EXPIRED';
type SortField = 'date' | 'patient' | 'status' | 'items';
type SortDir = 'asc' | 'desc';

// ═══════════════════════════════════════════════════════════════
// UTILITY HELPERS
// ═══════════════════════════════════════════════════════════════

function fmtCurrency(amount: number | null | undefined, currency = 'USD'): string {
  const v = Number(amount) || 0;
  if (currency === 'CDF') return `${v.toLocaleString()} FC`;
  return `$${v.toFixed(2)}`;
}

function relativeDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  const ts = new Date(dateStr).getTime();
  if (isNaN(ts)) return '—';
  const diff = Math.floor((Date.now() - ts) / 86400000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Hier';
  if (diff < 0) return 'À venir';
  if (diff < 7) return `Il y a ${diff} jours`;
  if (diff < 30) return `Il y a ${Math.floor(diff / 7)} sem.`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function formatFrequency(frequency: string): string {
  return MEDICATION_FREQUENCIES[frequency as keyof typeof MEDICATION_FREQUENCIES] || frequency;
}

function statusLabel(status: PrescriptionStatus): string {
  switch (status) {
    case 'pending': return 'En attente';
    case 'partially_dispensed': return 'Partiellement dispensé';
    case 'fully_dispensed': return 'Complètement dispensé';
    case 'cancelled': return 'Annulé';
    case 'expired': return 'Expiré';
    default: return status;
  }
}

function itemStatusLabel(status: PrescriptionItemStatus): string {
  switch (status) {
    case 'pending': return 'En attente';
    case 'partially_dispensed': return 'Partiellement dispensé';
    case 'fully_dispensed': return 'Dispensé';
    case 'out_of_stock': return 'Rupture de stock';
    case 'discontinued': return 'Discontinué';
    case 'cancelled': return 'Annulé';
    case 'substituted': return 'Substitué';
    default: return status;
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════

export function PrescriptionsScreen() {
  const toast = useToast();

  // ─── Core state ──────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [prescriptions, setPrescriptions] = useState<EnrichedPrescription[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  // ─── UI state ────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<PrescriptionFilter>('ALL');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ─── Modal state ─────────────────────────────────────────
  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [dispensingItem, setDispensingItem] = useState<{
    prescription: EnrichedPrescription;
    item: PrescriptionItem;
  } | null>(null);

  // ─── Organization context ────────────────────────────────
  const [orgId, setOrgId] = useState('');

  // ─── Data loading ────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const db = DatabaseService.getInstance();
      const license = await db.getLicenseByKey('TRIAL-HK2024XY-Z9M3');
      if (!license) return;
      const org = await db.getOrganization(license.organizationId);
      if (!org) return;
      setOrgId(org.id);

      const [rawPrescriptions, rawProducts, rawInventory] = await Promise.all([
        db.getPrescriptionsByOrganization(org.id),
        db.getProductsByOrganization(org.id, { activeOnly: true }),
        db.getInventoryItemsByOrganization(org.id),
      ]);

      // For demo purposes, we'll use mock patient/doctor names
      // In a real app, you'd fetch from Patient and User tables
      const enriched: EnrichedPrescription[] = rawPrescriptions.map(p => ({
        ...p,
        patientName: `Patient ${p.patientId.slice(-4).toUpperCase()}`,
        doctorName: `Dr. ${p.doctorId.slice(-4).toUpperCase()}`,
        facilityName: p.facilityId === 'pharmacy-main' ? 'Pharmacie Principale' : 'Service Hospitalier',
      }));

      setPrescriptions(enriched);
      setProducts(rawProducts);
      setInventory(rawInventory);
    } catch (err) {
      console.error('Prescriptions load error', err);
      toast.error('Erreur lors du chargement des ordonnances');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

  // ─── Filtering & sorting ─────────────────────────────────
  const filteredPrescriptions = useMemo(() => {
    let result = [...prescriptions];

    // Filter by status
    if (filter === 'PENDING') {
      result = result.filter(p => p.status === 'pending');
    } else if (filter === 'PARTIAL') {
      result = result.filter(p => p.status === 'partially_dispensed');
    } else if (filter === 'COMPLETED') {
      result = result.filter(p => p.status === 'fully_dispensed');
    } else if (filter === 'EXPIRED') {
      result = result.filter(p => p.status === 'expired' || PrescriptionUtils.isExpired(p));
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.prescriptionNumber.toLowerCase().includes(q) ||
        (p.patientName?.toLowerCase().includes(q)) ||
        (p.doctorName?.toLowerCase().includes(q)) ||
        p.items.some(item => item.medicationName.toLowerCase().includes(q)),
      );
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'date': cmp = new Date(a.date).getTime() - new Date(b.date).getTime(); break;
        case 'patient': cmp = (a.patientName || '').localeCompare(b.patientName || ''); break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
        case 'items': cmp = a.items.length - b.items.length; break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [prescriptions, filter, searchQuery, sortField, sortDir]);

  // ─── Stats ───────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = prescriptions.length;
    const pending = prescriptions.filter(p => p.status === 'pending').length;
    const partial = prescriptions.filter(p => p.status === 'partially_dispensed').length;
    const completed = prescriptions.filter(p => p.status === 'fully_dispensed').length;
    const expired = prescriptions.filter(p => p.status === 'expired' || PrescriptionUtils.isExpired(p)).length;
    const pendingItems = prescriptions.reduce((sum, p) => sum + PrescriptionUtils.getPendingItems(p).length, 0);
    const totalValue = prescriptions.reduce((sum, p) => sum + PrescriptionUtils.getTotalValue(p), 0);

    return { total, pending, partial, completed, expired, pendingItems, totalValue };
  }, [prescriptions]);

  // ─── Handlers ────────────────────────────────────────────
  const handleDispenseItem = useCallback((prescription: EnrichedPrescription, item: PrescriptionItem) => {
    if (item.status === 'fully_dispensed') {
      toast.info('Cet article est déjà entièrement dispensé');
      return;
    }
    setDispensingItem({ prescription, item });
    setShowDispenseModal(true);
  }, []);

  const handleCancelPrescription = useCallback(async (prescription: EnrichedPrescription) => {
    Alert.alert(
      'Annuler l\'ordonnance',
      `Êtes-vous sûr de vouloir annuler l'ordonnance ${prescription.prescriptionNumber} ?`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = DatabaseService.getInstance();
              await db.updatePrescription(prescription.id, { status: 'cancelled' });
              toast.success('Ordonnance annulée');
              loadData();
            } catch {
              toast.error('Erreur lors de l\'annulation');
            }
          },
        },
      ]
    );
  }, [loadData]);

  // ─── Loading state ───────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Chargement des ordonnances…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* ═══ HEADER ═══ */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Ordonnances</Text>
            <Text style={styles.headerSub}>
              {stats.total} ordonnances · {stats.pendingItems} articles en attente
            </Text>
          </View>
          <TouchableOpacity
            style={styles.btnFill}
            onPress={() => toast.info('Création d\'ordonnance depuis l\'hôpital')}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={styles.btnFillText}>Nouvelle Ordonnance</Text>
          </TouchableOpacity>
        </View>

        {/* ═══ STATS CARDS ═══ */}
        <View style={styles.statsRow}>
          <StatCard icon="document-text" label="Total" value={`${stats.total}`} color={colors.primary} />
          <StatCard icon="time" label="En attente" value={`${stats.pending}`} color={colors.warning}
            hint={stats.pending > 0 ? 'À traiter' : 'Aucune'} />
          <StatCard icon="sync" label="Partielles" value={`${stats.partial}`} color={colors.info} />
          <StatCard icon="checkmark-circle" label="Complètes" value={`${stats.completed}`} color="#10B981" />
          <StatCard icon="close-circle" label="Expirées" value={`${stats.expired}`} color={colors.error} />
          <StatCard icon="cash" label="Valeur" value={fmtCurrency(stats.totalValue)} color="#8B5CF6" />
        </View>

        {/* ═══ SEARCH & FILTERS ═══ */}
        <View style={styles.searchWrap}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher par N° ordonnance, patient, médecin, médicament…"
              placeholderTextColor={colors.placeholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}
          contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
          {([
            { key: 'ALL' as PrescriptionFilter, label: 'Toutes', count: stats.total },
            { key: 'PENDING' as PrescriptionFilter, label: 'En attente', count: stats.pending },
            { key: 'PARTIAL' as PrescriptionFilter, label: 'Partielles', count: stats.partial },
            { key: 'COMPLETED' as PrescriptionFilter, label: 'Complètes', count: stats.completed },
            { key: 'EXPIRED' as PrescriptionFilter, label: 'Expirées', count: stats.expired },
          ]).map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, filter === f.key && styles.chipActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>{f.label}</Text>
              <View style={[styles.chipBadge, filter === f.key && styles.chipBadgeActive]}>
                <Text style={[styles.chipBadgeText, filter === f.key && { color: '#FFF' }]}>{f.count}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sort options */}
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Trier par:</Text>
          {([
            { key: 'date' as SortField, label: 'Date' },
            { key: 'patient' as SortField, label: 'Patient' },
            { key: 'status' as SortField, label: 'Statut' },
            { key: 'items' as SortField, label: 'Articles' },
          ]).map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.sortBtn, sortField === opt.key && styles.sortBtnActive]}
              onPress={() => {
                if (sortField === opt.key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                else { setSortField(opt.key); setSortDir('asc'); }
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.sortBtnText, sortField === opt.key && styles.sortBtnTextActive]}>{opt.label}</Text>
              {sortField === opt.key && <Ionicons name={sortDir === 'asc' ? 'arrow-up' : 'arrow-down'} size={12} color={colors.primary} />}
            </TouchableOpacity>
          ))}
          <Text style={styles.resultCnt}>{filteredPrescriptions.length} résultats</Text>
        </View>

        {/* ═══ PRESCRIPTIONS LIST ═══ */}
        {filteredPrescriptions.length === 0 ? (
          <EmptyState icon="document-text-outline" title="Aucune ordonnance trouvée"
            sub={searchQuery ? 'Modifiez votre recherche' : 'Les ordonnances de l\'hôpital apparaîtront ici'} />
        ) : (
          <View style={{ gap: 8 }}>
            {filteredPrescriptions.map(prescription => (
              <PrescriptionCard
                key={prescription.id}
                prescription={prescription}
                expanded={expandedId === prescription.id}
                onToggle={() => setExpandedId(expandedId === prescription.id ? null : prescription.id)}
                onDispenseItem={(item) => handleDispenseItem(prescription, item)}
                onCancel={() => handleCancelPrescription(prescription)}
                products={products}
                inventory={inventory}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* ═══ DISPENSE MODAL ═══ */}
      {showDispenseModal && dispensingItem && (
        <DispenseModal
          prescription={dispensingItem.prescription}
          item={dispensingItem.item}
          products={products}
          inventory={inventory}
          onClose={() => { setShowDispenseModal(false); setDispensingItem(null); }}
          onDispensed={() => { setShowDispenseModal(false); setDispensingItem(null); loadData(); }}
        />
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════════════

function StatCard({ icon, label, value, color, hint }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color: string;
  hint?: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '14' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLbl}>{label}</Text>
      {hint && <Text style={[styles.statHint, { color: color }]}>{hint}</Text>}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// PRESCRIPTION CARD
// ═══════════════════════════════════════════════════════════════

function PrescriptionCard({ prescription, expanded, onToggle, onDispenseItem, onCancel, products, inventory }: {
  prescription: EnrichedPrescription; expanded: boolean; onToggle: () => void;
  onDispenseItem: (item: PrescriptionItem) => void; onCancel: () => void;
  products: Product[]; inventory: InventoryItem[];
}) {
  const statusColor = PrescriptionUtils.getStatusColor(prescription.status);
  const isExpired = PrescriptionUtils.isExpired(prescription);
  const pendingItems = PrescriptionUtils.getPendingItems(prescription);
  
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardRow} onPress={onToggle} activeOpacity={0.7}>
        <View style={[styles.cardIcon, { backgroundColor: statusColor + '14' }]}>
          <Ionicons name="document-text" size={22} color={statusColor} />
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.cardNameRow}>
            <Text style={styles.cardName}>{prescription.prescriptionNumber}</Text>
            {isExpired && <Ionicons name="warning" size={13} color={colors.error} />}
            <View style={[styles.statusPill, { backgroundColor: statusColor + '14' }]}>
              <Text style={[styles.statusPillText, { color: statusColor }]}>{statusLabel(prescription.status)}</Text>
            </View>
          </View>
          <Text style={styles.cardSub}>
            {prescription.patientName} · {prescription.doctorName} · {relativeDate(prescription.date)}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.cardItems}>{prescription.items.length} articles</Text>
          {pendingItems.length > 0 && (
            <Text style={[styles.cardPending, { color: colors.warning }]}>
              {pendingItems.length} en attente
            </Text>
          )}
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
      </TouchableOpacity>

      {/* ─── Expanded detail ─── */}
      {expanded && (
        <View style={styles.detail}>
          <View style={styles.divider} />
          
          {/* Prescription info */}
          <View style={styles.prescriptionInfo}>
            <InfoRow label="Patient" value={prescription.patientName || '—'} />
            <InfoRow label="Médecin" value={prescription.doctorName || '—'} />
            <InfoRow label="Service" value={prescription.facilityName || '—'} />
            <InfoRow label="Date" value={new Date(prescription.date).toLocaleDateString('fr-FR')} />
            {prescription.validUntil && (
              <InfoRow 
                label="Valide jusqu'à" 
                value={new Date(prescription.validUntil).toLocaleDateString('fr-FR')}
                valueColor={isExpired ? colors.error : undefined}
              />
            )}
            {prescription.diagnosis && <InfoRow label="Diagnostic" value={prescription.diagnosis} />}
            {prescription.instructions && <InfoRow label="Instructions" value={prescription.instructions} />}
          </View>

          {/* Prescription items */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Médicaments ({prescription.items.length})</Text>
            {prescription.items.map(item => (
              <PrescriptionItemRow
                key={item.id}
                item={item}
                products={products}
                inventory={inventory}
                onDispense={() => onDispenseItem(item)}
              />
            ))}
          </View>

          {/* Actions */}
          <View style={styles.actionRow}>
            {prescription.status !== 'cancelled' && prescription.status !== 'fully_dispensed' && (
              <TouchableOpacity style={styles.actionBtn} onPress={onCancel} activeOpacity={0.7}>
                <Ionicons name="close-outline" size={15} color={colors.error} />
                <Text style={[styles.actionText, { color: colors.error }]}>Annuler</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// PRESCRIPTION ITEM ROW
// ═══════════════════════════════════════════════════════════════

function PrescriptionItemRow({ item, products, inventory, onDispense }: {
  item: PrescriptionItem; products: Product[]; inventory: InventoryItem[];
  onDispense: () => void;
}) {
  const itemStatusColor = PrescriptionUtils.getItemStatusColor(item.status);
  const product = products.find(p => p.id === item.productId);
  const inv = inventory.find(i => i.productId === item.productId);
  const inStock = inv?.quantityAvailable || 0;
  const canDispense = item.status !== 'fully_dispensed' && item.status !== 'cancelled' && inStock > 0;

  return (
    <View style={styles.itemRow}>
      <View style={styles.itemInfo}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.medicationName}</Text>
          <View style={[styles.itemStatusPill, { backgroundColor: itemStatusColor + '14' }]}>
            <Text style={[styles.itemStatusText, { color: itemStatusColor }]}>
              {itemStatusLabel(item.status)}
            </Text>
          </View>
        </View>
        <Text style={styles.itemDetails}>
          {item.dosage} · {formatFrequency(item.frequency)} · {item.duration}
        </Text>
        <Text style={styles.itemInstructions}>
          {item.instructions || PrescriptionUtils.getRouteLabel(item.route)}
        </Text>
        <View style={styles.itemQuantities}>
          <Text style={styles.itemQty}>
            Prescrit: {item.quantity} · Dispensé: {item.quantityDispensed} · Restant: {item.quantityRemaining}
          </Text>
          {product && (
            <Text style={[styles.itemStock, inStock > 0 ? { color: '#10B981' } : { color: colors.error }]}>
              Stock: {inStock} ({product.name})
            </Text>
          )}
        </View>
      </View>
      {canDispense && (
        <TouchableOpacity style={styles.dispenseBtn} onPress={onDispense} activeOpacity={0.7}>
          <Ionicons name="medical" size={16} color={colors.primary} />
          <Text style={[styles.dispenseBtnText, { color: colors.primary }]}>Dispenser</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// DISPENSE MODAL
// ═══════════════════════════════════════════════════════════════

function DispenseModal({ prescription, item, products, inventory, onClose, onDispensed }: {
  prescription: EnrichedPrescription; item: PrescriptionItem; products: Product[]; inventory: InventoryItem[];
  onClose: () => void; onDispensed: () => void;
}) {
  const toast = useToast();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantityToDispense, setQuantityToDispense] = useState(String(item.quantityRemaining));
  const [notes, setNotes] = useState('');
  const [counselingNotes, setCounselingNotes] = useState('');
  const [dispensing, setDispensing] = useState(false);

  // Find matching products (by name or generic name)
  const matchingProducts = useMemo(() => {
    const query = item.medicationName.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(query) ||
      (p.genericName?.toLowerCase().includes(query)) ||
      query.includes(p.name.toLowerCase()) ||
      (p.genericName && query.includes(p.genericName.toLowerCase()))
    );
  }, [products, item.medicationName]);

  useEffect(() => {
    if (matchingProducts.length > 0 && !selectedProduct) {
      setSelectedProduct(matchingProducts[0]);
    }
  }, [matchingProducts, selectedProduct]);

  const selectedInventory = selectedProduct ? inventory.find(i => i.productId === selectedProduct.id) : null;
  const availableStock = selectedInventory?.quantityAvailable || 0;
  const dispensingQuantity = parseInt(quantityToDispense) || 0;

  const handleDispense = async () => {
    if (!selectedProduct) {
      toast.warning('Sélectionnez un produit');
      return;
    }
    if (dispensingQuantity <= 0 || dispensingQuantity > item.quantityRemaining) {
      toast.warning('Quantité invalide');
      return;
    }
    if (dispensingQuantity > availableStock) {
      toast.warning('Stock insuffisant');
      return;
    }

    setDispensing(true);
    try {
      const db = DatabaseService.getInstance();
      await db.dispensePrescriptionItem(item.id, {
        productId: selectedProduct.id,
        quantityToDispense: dispensingQuantity,
        pharmacistId: 'admin',
        notes,
        counselingNotes,
        substituted: selectedProduct.id !== item.productId,
      });
      toast.success(`${dispensingQuantity} ${selectedProduct.name} dispensé(s)`);
      onDispensed();
    } catch (err) {
      console.error('Dispense error', err);
      toast.error('Erreur lors de la dispensation');
    } finally {
      setDispensing(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalS.backdrop}>
        <View style={modalS.container}>
          <View style={modalS.hdr}>
            <Text style={modalS.hdrTitle}>Dispenser le médicament</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={modalS.body} showsVerticalScrollIndicator={false}>
            {/* Prescription info */}
            <View style={modalS.infoBox}>
              <Text style={modalS.infoTitle}>Ordonnance: {prescription.prescriptionNumber}</Text>
              <Text style={modalS.infoText}>Patient: {prescription.patientName}</Text>
              <Text style={modalS.infoText}>Médicament: {item.medicationName}</Text>
              <Text style={modalS.infoText}>Dosage: {item.dosage} · {formatFrequency(item.frequency)}</Text>
              <Text style={modalS.infoText}>Restant à dispenser: {item.quantityRemaining}</Text>
            </View>

            {/* Product selection */}
            <Text style={modalS.sec}>Produit à dispenser</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {matchingProducts.map(product => {
                const inv = inventory.find(i => i.productId === product.id);
                const stock = inv?.quantityAvailable || 0;
                return (
                  <TouchableOpacity
                    key={product.id}
                    style={[
                      styles.productChip,
                      selectedProduct?.id === product.id && styles.productChipActive,
                      stock === 0 && { opacity: 0.5 }
                    ]}
                    onPress={() => stock > 0 && setSelectedProduct(product)}
                    disabled={stock === 0}
                  >
                    <Text style={[
                      styles.productChipText,
                      selectedProduct?.id === product.id && styles.productChipTextActive
                    ]}>
                      {product.name}
                    </Text>
                    <Text style={styles.productChipStock}>Stock: {stock}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {selectedProduct && (
              <View style={modalS.selectedProduct}>
                <Text style={modalS.selectedProductName}>{selectedProduct.name}</Text>
                <Text style={modalS.selectedProductInfo}>
                  {selectedProduct.genericName && `${selectedProduct.genericName} · `}
                  {selectedProduct.strength} · {fmtCurrency(selectedProduct.sellingPrice)}
                </Text>
                <Text style={modalS.selectedProductStock}>
                  Stock disponible: {availableStock} unités
                </Text>
              </View>
            )}

            {/* Quantity */}
            <Text style={modalS.sec}>Quantité à dispenser</Text>
            <TextInput
              style={modalS.input}
              value={quantityToDispense}
              onChangeText={setQuantityToDispense}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.placeholder}
            />

            {/* Notes */}
            <Text style={modalS.sec}>Notes du pharmacien (optionnel)</Text>
            <TextInput
              style={[modalS.input, { height: 60, textAlignVertical: 'top' }]}
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="Notes sur la dispensation…"
              placeholderTextColor={colors.placeholder}
            />

            <Text style={modalS.sec}>Conseils au patient (optionnel)</Text>
            <TextInput
              style={[modalS.input, { height: 60, textAlignVertical: 'top' }]}
              value={counselingNotes}
              onChangeText={setCounselingNotes}
              multiline
              placeholder="Instructions données au patient…"
              placeholderTextColor={colors.placeholder}
            />
          </ScrollView>

          <View style={modalS.footer}>
            <TouchableOpacity style={modalS.cancelBtn} onPress={onClose}>
              <Text style={modalS.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalS.saveBtn, (!selectedProduct || dispensingQuantity <= 0 || dispensing) && { opacity: 0.5 }]}
              onPress={handleDispense}
              disabled={!selectedProduct || dispensingQuantity <= 0 || dispensing}
              activeOpacity={0.7}
            >
              {dispensing ? <ActivityIndicator size="small" color="#FFF" /> : (
                <>
                  <Ionicons name="medical" size={18} color="#FFF" />
                  <Text style={modalS.saveText}>Dispenser</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// UTILITY COMPONENTS
// ═══════════════════════════════════════════════════════════════

function InfoRow({ label, value, valueColor }: {
  label: string; value: string; valueColor?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
    </View>
  );
}

function EmptyState({ icon, title, sub }: {
  icon: keyof typeof Ionicons.glyphMap; title: string; sub: string;
}) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={48} color={colors.textTertiary} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{sub}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: IS_DESKTOP ? 28 : 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.textSecondary },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  btnFill: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: borderRadius.lg, gap: 6, ...shadows.sm },
  btnFillText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  // Stats
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { flex: IS_DESKTOP ? 1 : undefined, width: IS_DESKTOP ? undefined : '31%' as any, backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 14, alignItems: 'center', ...shadows.sm, minWidth: IS_DESKTOP ? 120 : undefined, borderWidth: 1, borderColor: colors.outline },
  statIcon: { width: 40, height: 40, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statVal: { fontSize: 20, fontWeight: '800', color: colors.text },
  statLbl: { fontSize: 10, color: colors.textSecondary, fontWeight: '500', marginTop: 1, textAlign: 'center' },
  statHint: { fontSize: 9, fontWeight: '600', marginTop: 3 },

  // Search & filters
  searchWrap: { marginBottom: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outline, paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, outlineStyle: 'none' as any },

  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 7, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.outline, gap: 5 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '500', color: colors.textSecondary },
  chipTextActive: { color: '#FFF', fontWeight: '600' },
  chipBadge: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.full, paddingHorizontal: 6, minWidth: 20, alignItems: 'center' },
  chipBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  chipBadgeText: { fontSize: 10, fontWeight: '700', color: colors.textSecondary },

  // Sort
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  sortLabel: { fontSize: 11, fontWeight: '600', color: colors.textTertiary, marginRight: 4 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: borderRadius.sm, gap: 3, backgroundColor: colors.surfaceVariant },
  sortBtnActive: { backgroundColor: colors.primary + '14' },
  sortBtnText: { fontSize: 11, fontWeight: '500', color: colors.textTertiary },
  sortBtnTextActive: { color: colors.primary, fontWeight: '600' },
  resultCnt: { fontSize: 11, color: colors.textTertiary, marginLeft: 'auto' },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 12 },
  emptySub: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },

  // Prescription card
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.outline, ...shadows.sm, overflow: 'hidden' },
  cardRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  cardIcon: { width: 44, height: 44, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, minWidth: 0 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardName: { fontSize: 13, fontWeight: '600', color: colors.text, flex: 1 },
  cardSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', marginRight: 6 },
  cardItems: { fontSize: 12, fontWeight: '500', color: colors.text },
  cardPending: { fontSize: 10, fontWeight: '600', marginTop: 1 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full },
  statusPillText: { fontSize: 9, fontWeight: '700' },

  // Detail expanded
  detail: { paddingHorizontal: 12, paddingBottom: 12 },
  divider: { height: 1, backgroundColor: colors.outline, marginBottom: 10 },
  prescriptionInfo: { marginBottom: 10 },
  infoRow: { flexDirection: 'row', paddingVertical: 2 },
  infoLabel: { fontSize: 11, fontWeight: '600', color: colors.textTertiary, minWidth: 80 },
  infoValue: { fontSize: 11, color: colors.text, flex: 1 },
  section: { marginBottom: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 4 },

  // Prescription item
  itemRow: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md, padding: 10, marginBottom: 6, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  itemInfo: { flex: 1 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  itemName: { fontSize: 12, fontWeight: '600', color: colors.text, flex: 1 },
  itemStatusPill: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  itemStatusText: { fontSize: 9, fontWeight: '700' },
  itemDetails: { fontSize: 11, color: colors.textSecondary, marginBottom: 2 },
  itemInstructions: { fontSize: 10, color: colors.textTertiary, fontStyle: 'italic', marginBottom: 4 },
  itemQuantities: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  itemQty: { fontSize: 10, color: colors.textSecondary },
  itemStock: { fontSize: 10, fontWeight: '600' },
  dispenseBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: borderRadius.sm, backgroundColor: colors.primary + '0A', borderWidth: 1, borderColor: colors.primary + '30' },
  dispenseBtnText: { fontSize: 10, fontWeight: '600' },

  actionRow: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: colors.outline, paddingTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: borderRadius.md, backgroundColor: colors.surfaceVariant },
  actionText: { fontSize: 11, fontWeight: '600' },

  // Product selection
  productChip: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: 8, marginRight: 8, borderWidth: 1, borderColor: colors.outline, minWidth: 100 },
  productChipActive: { backgroundColor: colors.primary + '14', borderColor: colors.primary },
  productChipText: { fontSize: 11, fontWeight: '500', color: colors.text, textAlign: 'center' },
  productChipTextActive: { color: colors.primary, fontWeight: '600' },
  productChipStock: { fontSize: 9, color: colors.textSecondary, textAlign: 'center', marginTop: 2 },
});

const modalS = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  container: { backgroundColor: colors.surface, borderRadius: borderRadius.xxl, overflow: 'hidden', maxHeight: '90%', width: '100%', maxWidth: 600, ...shadows.xl },
  hdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.outline },
  hdrTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  body: { padding: 20, maxHeight: 500 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: colors.outline },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outline },
  cancelText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: borderRadius.lg },
  saveText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  sec: { fontSize: 13, fontWeight: '700', color: colors.primary, marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: colors.text, borderWidth: 1, borderColor: colors.outline },
  infoBox: { backgroundColor: colors.primary + '08', borderRadius: borderRadius.lg, padding: 12, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: colors.primary },
  infoTitle: { fontSize: 13, fontWeight: '700', color: colors.primary, marginBottom: 4 },
  infoText: { fontSize: 12, color: colors.text, marginBottom: 2 },
  selectedProduct: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.lg, padding: 12, marginBottom: 12 },
  selectedProductName: { fontSize: 14, fontWeight: '700', color: colors.text },
  selectedProductInfo: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  selectedProductStock: { fontSize: 11, fontWeight: '600', color: '#10B981', marginTop: 4 },
});