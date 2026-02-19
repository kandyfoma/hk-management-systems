import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Dimensions, Modal, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows } from '../../../theme/theme';
import { type PPEType } from '../../../models/OccupationalHealth';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const ACCENT = colors.primary;
const STORAGE_KEY = '@occhealth_ppe';

interface PPEItem {
  id: string;
  type: PPEType;
  name: string;
  brand: string;
  model: string;
  category: 'head' | 'eye' | 'ear' | 'respiratory' | 'hand' | 'foot' | 'body' | 'fall' | 'ergonomic';
  stockQuantity: number;
  assignedQuantity: number;
  expiryDate?: string;
  certificationStandard: string;
  unitPrice: number;
  supplier: string;
  isActive: boolean;
  createdAt: string;
}

interface PPEAssignment {
  id: string;
  ppeItemId: string;
  ppeName: string;
  workerId: string;
  workerName: string;
  assignmentDate: string;
  expiryDate?: string;
  quantity: number;
  condition: 'new' | 'good' | 'worn' | 'damaged' | 'expired';
  returnedDate?: string;
}

function getCategoryLabel(c: string): string {
  const m: Record<string, string> = {
    head: 'Protection Tête', eye: 'Protection Yeux', ear: 'Protection Auditive',
    respiratory: 'Protection Respiratoire', hand: 'Protection Mains', foot: 'Protection Pieds',
    body: 'Protection Corps', fall: 'Protection Chutes', ergonomic: 'Ergonomie',
  };
  return m[c] || c;
}
function getCategoryIcon(c: string): string {
  const m: Record<string, string> = {
    head: 'construct', eye: 'eye', ear: 'ear', respiratory: 'cloud', hand: 'hand-left',
    foot: 'footsteps', body: 'body', fall: 'trending-down', ergonomic: 'desktop',
  };
  return m[c] || 'shield';
}
function getCategoryColor(c: string): string {
  const m: Record<string, string> = {
    head: '#D97706', eye: '#3B82F6', ear: '#8B5CF6', respiratory: '#0891B2',
    hand: '#EA580C', foot: '#16A34A', body: '#6366F1', fall: '#DC2626', ergonomic: '#059669',
  };
  return m[c] || '#94A3B8';
}
function getConditionLabel(c: string): string {
  const m: Record<string, string> = { new: 'Neuf', good: 'Bon', worn: 'Usé', damaged: 'Endommagé', expired: 'Expiré' };
  return m[c] || c;
}
function getConditionColor(c: string): string {
  const m: Record<string, string> = { new: '#22C55E', good: '#3B82F6', worn: '#F59E0B', damaged: '#EF4444', expired: '#94A3B8' };
  return m[c] || '#94A3B8';
}

// ─── Sample Data ─────────────────────────────────────────────
const SAMPLE_PPE: PPEItem[] = [
  { id: 'ppe1', type: 'hard_hat', name: 'Casque de sécurité ABS', brand: 'MSA', model: 'V-Gard 500', category: 'head', stockQuantity: 150, assignedQuantity: 120, expiryDate: '2027-06-15', certificationStandard: 'EN 397:2012', unitPrice: 25, supplier: 'SafetyPro Congo', isActive: true, createdAt: '2024-01-01' },
  { id: 'ppe2', type: 'safety_glasses', name: 'Lunettes de protection anti-projections', brand: '3M', model: 'SecureFit 400', category: 'eye', stockQuantity: 200, assignedQuantity: 180, expiryDate: '2026-12-31', certificationStandard: 'EN 166:2001', unitPrice: 15, supplier: 'SafetyPro Congo', isActive: true, createdAt: '2024-01-01' },
  { id: 'ppe3', type: 'ear_plugs', name: 'Bouchons d\'oreilles mousse', brand: '3M', model: '1100', category: 'ear', stockQuantity: 500, assignedQuantity: 350, expiryDate: '2026-06-01', certificationStandard: 'EN 352-2:2002', unitPrice: 2, supplier: 'MediSupply', isActive: true, createdAt: '2024-01-01' },
  { id: 'ppe4', type: 'respirator', name: 'Demi-masque filtrant FFP3', brand: 'Dräger', model: 'X-plore 1930', category: 'respiratory', stockQuantity: 100, assignedQuantity: 65, expiryDate: '2025-09-30', certificationStandard: 'EN 149:2001+A1:2009', unitPrice: 8, supplier: 'Dräger Congo', isActive: true, createdAt: '2024-02-01' },
  { id: 'ppe5', type: 'safety_boots', name: 'Bottes de sécurité S3', brand: 'Caterpillar', model: 'Holton SB', category: 'foot', stockQuantity: 80, assignedQuantity: 75, expiryDate: '2026-03-15', certificationStandard: 'EN ISO 20345:2011', unitPrice: 65, supplier: 'WorkWear DRC', isActive: true, createdAt: '2024-01-15' },
  { id: 'ppe6', type: 'safety_gloves', name: 'Gants anti-coupure niveau 5', brand: 'Ansell', model: 'HyFlex 11-849', category: 'hand', stockQuantity: 300, assignedQuantity: 240, expiryDate: '2026-08-01', certificationStandard: 'EN 388:2016', unitPrice: 12, supplier: 'SafetyPro Congo', isActive: true, createdAt: '2024-01-01' },
  { id: 'ppe7', type: 'fall_harness', name: 'Harnais antichute complet', brand: 'Petzl', model: 'NEWTON EASYFIT', category: 'fall', stockQuantity: 30, assignedQuantity: 22, expiryDate: '2025-04-01', certificationStandard: 'EN 361:2002', unitPrice: 120, supplier: 'AltiSafe', isActive: true, createdAt: '2024-03-01' },
  { id: 'ppe8', type: 'high_vis_vest', name: 'Gilet haute visibilité classe 2', brand: 'Portwest', model: 'C470', category: 'body', stockQuantity: 200, assignedQuantity: 180, certificationStandard: 'EN ISO 20471:2013', unitPrice: 10, supplier: 'WorkWear DRC', isActive: true, createdAt: '2024-01-01' },
];

const SAMPLE_ASSIGNMENTS: PPEAssignment[] = [
  { id: 'pa1', ppeItemId: 'ppe1', ppeName: 'Casque MSA V-Gard 500', workerId: 'w1', workerName: 'Jean-Pierre Kabongo', assignmentDate: '2024-10-01', expiryDate: '2027-06-15', quantity: 1, condition: 'good' },
  { id: 'pa2', ppeItemId: 'ppe4', ppeName: 'Masque FFP3 Dräger', workerId: 'w1', workerName: 'Jean-Pierre Kabongo', assignmentDate: '2025-01-05', quantity: 10, condition: 'new' },
  { id: 'pa3', ppeItemId: 'ppe6', ppeName: 'Gants Ansell HyFlex', workerId: 'w3', workerName: 'Patrick Lukusa', assignmentDate: '2024-12-15', quantity: 3, condition: 'good' },
  { id: 'pa4', ppeItemId: 'ppe7', ppeName: 'Harnais Petzl NEWTON', workerId: 'w1', workerName: 'Jean-Pierre Kabongo', assignmentDate: '2024-06-01', expiryDate: '2025-04-01', quantity: 1, condition: 'worn' },
];

// ─── PPE Card ────────────────────────────────────────────────
function PPECard({ item, onPress }: { item: PPEItem; onPress: () => void }) {
  const catColor = getCategoryColor(item.category);
  const isLowStock = item.stockQuantity - item.assignedQuantity < 10;
  const isExpiringSoon = item.expiryDate && new Date(item.expiryDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  return (
    <TouchableOpacity style={styles.ppeCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.ppeCardHeader}>
        <View style={[styles.ppeIcon, { backgroundColor: catColor + '14' }]}>
          <Ionicons name={getCategoryIcon(item.category) as any} size={20} color={catColor} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={styles.ppeName}>{item.name}</Text>
            {isLowStock && <View style={styles.lowStockBadge}><Text style={styles.lowStockText}>STOCK BAS</Text></View>}
            {isExpiringSoon && <View style={styles.expiringBadge}><Text style={styles.expiringText}>EXPIRE BIENTÔT</Text></View>}
          </View>
          <Text style={styles.ppeBrand}>{item.brand} {item.model}</Text>
        </View>
        <View style={[styles.categoryBadge, { backgroundColor: catColor + '14' }]}>
          <Text style={[styles.categoryBadgeText, { color: catColor }]}>{getCategoryLabel(item.category)}</Text>
        </View>
      </View>

      <View style={styles.ppeCardBody}>
        <View style={styles.stockRow}>
          <View style={styles.stockItem}>
            <Text style={styles.stockValue}>{item.stockQuantity}</Text>
            <Text style={styles.stockLabel}>En stock</Text>
          </View>
          <View style={styles.stockItem}>
            <Text style={[styles.stockValue, { color: ACCENT }]}>{item.assignedQuantity}</Text>
            <Text style={styles.stockLabel}>Attribués</Text>
          </View>
          <View style={styles.stockItem}>
            <Text style={[styles.stockValue, { color: isLowStock ? '#EF4444' : '#22C55E' }]}>{item.stockQuantity - item.assignedQuantity}</Text>
            <Text style={styles.stockLabel}>Disponibles</Text>
          </View>
          <View style={styles.stockItem}>
            <Text style={styles.stockValue}>${item.unitPrice}</Text>
            <Text style={styles.stockLabel}>Prix unit.</Text>
          </View>
        </View>
      </View>

      <View style={styles.ppeCardFooter}>
        <Text style={styles.ppeStandard}>{item.certificationStandard}</Text>
        {item.expiryDate && <Text style={styles.ppeExpiry}>Expire: {new Date(item.expiryDate).toLocaleDateString('fr-CD')}</Text>}
      </View>
    </TouchableOpacity>
  );
}

// ─── Detail Modal ────────────────────────────────────────────
function PPEDetailModal({ visible, item, assignments, onClose }: { visible: boolean; item: PPEItem | null; assignments: PPEAssignment[]; onClose: () => void }) {
  if (!item) return null;
  const catColor = getCategoryColor(item.category);
  const itemAssignments = assignments.filter(a => a.ppeItemId === item.id);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Fiche EPI</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.textSecondary} /></TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <View style={[styles.detailIconLg, { backgroundColor: catColor + '14' }]}>
                <Ionicons name={getCategoryIcon(item.category) as any} size={32} color={catColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailTitle}>{item.name}</Text>
                <Text style={styles.detailSubtext}>{item.brand} {item.model}</Text>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Informations Produit</Text>
              <DetailRow label="Catégorie" value={getCategoryLabel(item.category)} />
              <DetailRow label="Norme" value={item.certificationStandard} />
              <DetailRow label="Fournisseur" value={item.supplier} />
              <DetailRow label="Prix unitaire" value={`$${item.unitPrice}`} />
              {item.expiryDate && <DetailRow label="Date expiration" value={new Date(item.expiryDate).toLocaleDateString('fr-CD')} />}
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Stock</Text>
              <View style={styles.stockDetailRow}>
                <View style={styles.stockDetailCard}>
                  <Text style={styles.stockDetailValue}>{item.stockQuantity}</Text>
                  <Text style={styles.stockDetailLabel}>Total</Text>
                </View>
                <View style={styles.stockDetailCard}>
                  <Text style={[styles.stockDetailValue, { color: ACCENT }]}>{item.assignedQuantity}</Text>
                  <Text style={styles.stockDetailLabel}>Attribués</Text>
                </View>
                <View style={styles.stockDetailCard}>
                  <Text style={[styles.stockDetailValue, { color: '#22C55E' }]}>{item.stockQuantity - item.assignedQuantity}</Text>
                  <Text style={styles.stockDetailLabel}>Disponibles</Text>
                </View>
              </View>
            </View>

            {itemAssignments.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Attributions ({itemAssignments.length})</Text>
                {itemAssignments.map((a, i) => (
                  <View key={i} style={styles.assignmentCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.assignmentWorker}>{a.workerName}</Text>
                      <View style={[styles.conditionBadge, { backgroundColor: getConditionColor(a.condition) + '14' }]}>
                        <Text style={[styles.conditionText, { color: getConditionColor(a.condition) }]}>{getConditionLabel(a.condition)}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
                      <Text style={styles.assignmentMeta}>Qté: {a.quantity}</Text>
                      <Text style={styles.assignmentMeta}>Attribué: {new Date(a.assignmentDate).toLocaleDateString('fr-CD')}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surfaceVariant }]} onPress={onClose}>
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

// ─── Add PPE Modal ───────────────────────────────────────────
function AddPPEModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (item: PPEItem) => void }) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [category, setCategory] = useState<PPEItem['category']>('head');
  const [stockQuantity, setStockQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [supplier, setSupplier] = useState('');
  const [standard, setStandard] = useState('');

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Erreur', 'Le nom est obligatoire.'); return; }
    const newItem: PPEItem = {
      id: `ppe-${Date.now()}`, type: 'none_required' as PPEType, name: name.trim(),
      brand: brand.trim(), model: model.trim(), category,
      stockQuantity: parseInt(stockQuantity) || 0, assignedQuantity: 0,
      certificationStandard: standard.trim() || 'N/A',
      unitPrice: parseFloat(unitPrice) || 0, supplier: supplier.trim() || 'N/A',
      isActive: true, createdAt: new Date().toISOString(),
    };
    onSave(newItem);
    setName(''); setBrand(''); setModel(''); setStockQuantity(''); setUnitPrice(''); setSupplier(''); setStandard('');
  };

  const categoryOptions = ['head', 'eye', 'ear', 'respiratory', 'hand', 'foot', 'body', 'fall', 'ergonomic'];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: '85%' }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvel EPI</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.textSecondary} /></TouchableOpacity>
            </View>
            <View style={styles.formSection}><Text style={styles.formLabel}>Nom *</Text><TextInput style={styles.formInput} value={name} onChangeText={setName} placeholder="Ex: Casque de sécurité" /></View>
            <View style={styles.formSection}><Text style={styles.formLabel}>Marque</Text><TextInput style={styles.formInput} value={brand} onChangeText={setBrand} placeholder="Marque" /></View>
            <View style={styles.formSection}><Text style={styles.formLabel}>Modèle</Text><TextInput style={styles.formInput} value={model} onChangeText={setModel} placeholder="Modèle" /></View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Catégorie</Text>
              <View style={styles.chipGrid}>
                {categoryOptions.map(c => {
                  const sel = category === c; const clr = getCategoryColor(c);
                  return (
                    <TouchableOpacity key={c} style={[styles.optionChip, sel && { backgroundColor: clr + '20', borderColor: clr }]} onPress={() => setCategory(c as any)}>
                      <Ionicons name={getCategoryIcon(c) as any} size={12} color={sel ? clr : colors.textSecondary} />
                      <Text style={[styles.optionChipText, sel && { color: clr, fontWeight: '600' }]}>{getCategoryLabel(c)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={styles.formSection}><Text style={styles.formLabel}>Quantité en stock</Text><TextInput style={styles.formInput} value={stockQuantity} onChangeText={setStockQuantity} placeholder="0" keyboardType="numeric" /></View>
            <View style={styles.formSection}><Text style={styles.formLabel}>Prix unitaire ($)</Text><TextInput style={styles.formInput} value={unitPrice} onChangeText={setUnitPrice} placeholder="0.00" keyboardType="numeric" /></View>
            <View style={styles.formSection}><Text style={styles.formLabel}>Fournisseur</Text><TextInput style={styles.formInput} value={supplier} onChangeText={setSupplier} placeholder="Nom du fournisseur" /></View>
            <View style={styles.formSection}><Text style={styles.formLabel}>Norme de certification</Text><TextInput style={styles.formInput} value={standard} onChangeText={setStandard} placeholder="Ex: EN 397:2012" /></View>
          </ScrollView>
          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surfaceVariant }]} onPress={onClose}><Text style={[styles.actionBtnText, { color: colors.text }]}>Annuler</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: ACCENT }]} onPress={handleSave}><Ionicons name="save-outline" size={18} color="#FFF" /><Text style={[styles.actionBtnText, { color: '#FFF' }]}>Enregistrer</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────
export function PPEManagementScreen() {
  const [items, setItems] = useState<PPEItem[]>(SAMPLE_PPE);
  const [assignments, setAssignments] = useState<PPEAssignment[]>(SAMPLE_ASSIGNMENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<PPEItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) { const data = JSON.parse(stored); setItems(data.items || SAMPLE_PPE); setAssignments(data.assignments || SAMPLE_ASSIGNMENTS); }
      else await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ items: SAMPLE_PPE, assignments: SAMPLE_ASSIGNMENTS }));
    } catch { }
  };
  const saveData = async (i: PPEItem[], a: PPEAssignment[]) => {
    setItems(i); setAssignments(a);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ items: i, assignments: a }));
  };

  const handleAdd = (item: PPEItem) => {
    saveData([item, ...items], assignments);
    setShowAdd(false);
    Alert.alert('Succès', 'EPI ajouté au catalogue.');
  };

  const filtered = useMemo(() => {
    return items.filter(i => {
      const q = searchQuery.toLowerCase();
      const matchQ = !q || i.name.toLowerCase().includes(q) || i.brand.toLowerCase().includes(q);
      const matchC = filterCategory === 'all' || i.category === filterCategory;
      return matchQ && matchC;
    });
  }, [items, searchQuery, filterCategory]);

  const stats = useMemo(() => {
    const totalStock = items.reduce((s, i) => s + i.stockQuantity, 0);
    const totalAssigned = items.reduce((s, i) => s + i.assignedQuantity, 0);
    const lowStock = items.filter(i => i.stockQuantity - i.assignedQuantity < 10).length;
    const expiringSoon = items.filter(i => i.expiryDate && new Date(i.expiryDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)).length;
    const totalValue = items.reduce((s, i) => s + i.stockQuantity * i.unitPrice, 0);
    return { totalItems: items.length, totalStock, totalAssigned, available: totalStock - totalAssigned, lowStock, expiringSoon, totalValue };
  }, [items]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Gestion des EPI</Text>
          <Text style={styles.screenSubtitle}>Équipements de Protection Individuelle — Attribution et suivi</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.addButtonText}>Nouvel EPI</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        {[
          { label: 'Articles', value: stats.totalItems, icon: 'shield', color: ACCENT },
          { label: 'En stock', value: stats.totalStock, icon: 'cube', color: '#3B82F6' },
          { label: 'Attribués', value: stats.totalAssigned, icon: 'people', color: '#6366F1' },
          { label: 'Disponibles', value: stats.available, icon: 'checkmark-circle', color: '#22C55E' },
          { label: 'Stock bas', value: stats.lowStock, icon: 'alert-circle', color: '#EF4444' },
          { label: 'Valeur totale', value: `$${stats.totalValue.toLocaleString()}`, icon: 'cash', color: '#059669' },
        ].map((s, i) => (
          <View key={i} style={[styles.statCard, { backgroundColor: s.color }]}>
            <View style={styles.statIcon}>
              <Ionicons name={s.icon as any} size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.filterBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput style={styles.searchInput} placeholder="Rechercher par nom, marque..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor={colors.placeholder} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollRow}>
          {[{ v: 'all', l: 'Tous' }, { v: 'head', l: 'Tête' }, { v: 'eye', l: 'Yeux' }, { v: 'ear', l: 'Oreilles' }, { v: 'respiratory', l: 'Respiratoire' }, { v: 'hand', l: 'Mains' }, { v: 'foot', l: 'Pieds' }, { v: 'body', l: 'Corps' }, { v: 'fall', l: 'Chutes' }].map(opt => (
            <TouchableOpacity key={opt.v} style={[styles.filterChip, filterCategory === opt.v && styles.filterChipActive]} onPress={() => setFilterCategory(opt.v)}>
              <Text style={[styles.filterChipText, filterCategory === opt.v && styles.filterChipTextActive]}>{opt.l}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Text style={styles.resultsCount}>{filtered.length} article(s)</Text>
      <View style={styles.listContainer}>
        {filtered.map(item => <PPECard key={item.id} item={item} onPress={() => { setSelectedItem(item); setShowDetail(true); }} />)}
        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="body-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyText}>Aucun EPI trouvé</Text>
          </View>
        )}
      </View>

      <PPEDetailModal visible={showDetail} item={selectedItem} assignments={assignments} onClose={() => { setShowDetail(false); setSelectedItem(null); }} />
      <AddPPEModal visible={showAdd} onClose={() => setShowAdd(false)} onSave={handleAdd} />
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  contentContainer: { padding: isDesktop ? 32 : 16, paddingBottom: 40 },
  header: { flexDirection: isDesktop ? 'row' : 'column', justifyContent: 'space-between', alignItems: isDesktop ? 'center' : 'flex-start', gap: 12, marginBottom: 24 },
  screenTitle: { fontSize: 24, fontWeight: '700', color: colors.text },
  screenSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ACCENT, paddingHorizontal: 16, paddingVertical: 10, borderRadius: borderRadius.lg },
  addButtonText: { color: '#FFF', fontWeight: '600', fontSize: 14 },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, minWidth: isDesktop ? 120 : 90, borderRadius: borderRadius.xl, padding: 16, alignItems: 'center', ...shadows.md },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 2, textAlign: 'center' },

  filterBar: { gap: 10, marginBottom: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.lg, paddingHorizontal: 14, paddingVertical: 10, gap: 8, borderWidth: 1, borderColor: colors.outline, ...shadows.xs },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  filterScrollRow: { flexGrow: 0 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: borderRadius.full, backgroundColor: colors.surfaceVariant, marginRight: 8 },
  filterChipActive: { backgroundColor: ACCENT },
  filterChipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  filterChipTextActive: { color: '#FFF', fontWeight: '600' },

  resultsCount: { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
  listContainer: { gap: 12 },

  ppeCard: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 16, ...shadows.sm },
  ppeCardHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  ppeIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  ppeName: { fontSize: 14, fontWeight: '600', color: colors.text },
  ppeBrand: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full, alignSelf: 'flex-start' },
  categoryBadgeText: { fontSize: 10, fontWeight: '600' },

  lowStockBadge: { backgroundColor: '#EF444420', paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.full },
  lowStockText: { fontSize: 8, fontWeight: '700', color: '#EF4444' },
  expiringBadge: { backgroundColor: '#F59E0B20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.full },
  expiringText: { fontSize: 8, fontWeight: '700', color: '#F59E0B' },

  ppeCardBody: { paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.outline, marginBottom: 10 },
  stockRow: { flexDirection: 'row', justifyContent: 'space-around', flexWrap: 'wrap', gap: isDesktop ? 0 : 8 },
  stockItem: { alignItems: 'center', minWidth: isDesktop ? 'auto' : 70 },
  stockValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  stockLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },

  ppeCardFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.outline },
  ppeStandard: { fontSize: 11, color: colors.textSecondary },
  ppeExpiry: { fontSize: 11, color: colors.textSecondary },

  emptyState: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, width: isDesktop ? 600 : '100%', maxHeight: '90%', padding: 24, ...shadows.xl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: borderRadius.lg },
  actionBtnText: { fontWeight: '600', fontSize: 14 },

  detailSection: { marginBottom: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.outline },
  detailSectionTitle: { fontSize: 13, fontWeight: '700', color: ACCENT, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailIconLg: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  detailTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  detailSubtext: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  detailLabel: { fontSize: 13, color: colors.textSecondary },
  detailValue: { fontSize: 13, fontWeight: '500', color: colors.text, maxWidth: '55%', textAlign: 'right' },

  stockDetailRow: { flexDirection: isDesktop ? 'row' : 'column', gap: 12 },
  stockDetailCard: { flex: 1, backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.lg, padding: 12, alignItems: 'center' },
  stockDetailValue: { fontSize: 22, fontWeight: '700', color: colors.text },
  stockDetailLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  assignmentCard: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.lg, padding: 12, marginBottom: 8 },
  assignmentWorker: { fontSize: 14, fontWeight: '600', color: colors.text },
  assignmentMeta: { fontSize: 11, color: colors.textSecondary },
  conditionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  conditionText: { fontSize: 10, fontWeight: '600' },

  formSection: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  formInput: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.outline },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.surfaceVariant },
  optionChipText: { fontSize: 11, color: colors.textSecondary },
});
