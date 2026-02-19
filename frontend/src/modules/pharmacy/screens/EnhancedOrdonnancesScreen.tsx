import React, { useEffect, useState, useCallback } from 'react';
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
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../../components/GlobalUI';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import ApiService from '../../../services/ApiService';
import DatabaseService from '../../../services/DatabaseService';
import {
  Prescription,
  PrescriptionItem,
  PrescriptionStatus,
  PrescriptionItemStatus,
  PrescriptionUtils,
  MEDICATION_FREQUENCIES,
} from '../../../models/Prescription';
import { Product, InventoryItem } from '../../../models/Inventory';

const { width: SCREEN_W } = Dimensions.get('window');
const IS_DESKTOP = SCREEN_W >= 1024;

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface EnrichedPrescription extends Omit<Prescription, 'totalItems' | 'completedItems' | 'progress'> {
  patientName?: string;
  doctorName?: string;
  facilityName?: string;
  progress?: number;
  totalItems?: number;
  completedItems?: number;
  priority?: 'high' | 'medium' | 'low';
}

interface PrescriptionStats {
  total: number;
  pending: number;
  partial: number;
  completed: number;
  expired: number;
  todayReceived: number;
  todayProcessed: number;
  averageProcessingTime: number;
}

type PrescriptionFilter = 'ALL' | 'PENDING' | 'PARTIAL' | 'COMPLETED' | 'EXPIRED' | 'TODAY';
type SortField = 'date' | 'patient' | 'status' | 'priority' | 'doctor';
type SortDir = 'asc' | 'desc';
type ViewMode = 'list' | 'grid' | 'detailed';

interface PrescriptionProcessingAction {
  type: 'dispense' | 'partial' | 'substitute' | 'reject' | 'hold';
  itemId: string;
  quantity?: number;
  notes?: string;
  substituteProductId?: string;
  reason?: string;
}

// ═══════════════════════════════════════════════════════════════
// ENHANCED PRESCRIPTIONS SCREEN
// ═══════════════════════════════════════════════════════════════

export function EnhancedPrescriptionsScreen() {
  // State Management
  const [prescriptions, setPrescriptions] = useState<EnrichedPrescription[]>([]);
  const [stats, setStats] = useState<PrescriptionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<PrescriptionFilter>('ALL');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedPrescription, setSelectedPrescription] = useState<EnrichedPrescription | null>(null);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [processingAction, setProcessingAction] = useState<PrescriptionProcessingAction | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  
  const toast = useToast();

  // ─── Data Loading ───────────────────────────────────────────
  const loadPrescriptions = useCallback(async () => {
    setLoading(true);
    try {
      const api = ApiService.getInstance();
      const db = DatabaseService.getInstance();

      const fetchAllResults = async (endpoint: string, params: Record<string, any> = {}, maxPages = 12) => {
        const rows: any[] = [];
        for (let page = 1; page <= maxPages; page += 1) {
          const res = await api.get(endpoint, { ...params, page });
          const payload = res?.data;
          const pageRows: any[] = Array.isArray(payload) ? payload : (payload?.results ?? []);
          rows.push(...pageRows);
          if (Array.isArray(payload) || !payload?.next) break;
        }
        return rows;
      };

      const [prescriptionList, inventoryData] = await Promise.all([
        fetchAllResults('/prescriptions/', { page_size: 100 }),
        fetchAllResults('/inventory/items/', { facility_id: 'pharmacy-main', page_size: 400 }),
      ]);

      const details = await Promise.all(
        prescriptionList.map(async (row: any) => {
          const res = await api.get(`/prescriptions/${row.id}/`);
          return res?.data ?? row;
        })
      );

      const enrichedPrescriptions: EnrichedPrescription[] = details.map((p: any) => {
        const mappedItems: PrescriptionItem[] = (p.items ?? []).map((item: any) => ({
          id: item.id,
          prescriptionId: p.id,
          medicationName: item.medication_name ?? item.product_name ?? '',
          genericName: item.generic_name ?? '',
          dosage: item.dosage ?? '',
          strength: item.product_strength ?? '',
          dosageForm: (item.dosage_form ?? 'other') as any,
          frequency: item.frequency ?? '',
          duration: item.duration ?? '',
          quantity: Number(item.quantity_prescribed ?? 0),
          route: (item.route ?? 'oral') as any,
          instructions: item.instructions ?? '',
          productId: item.product ?? '',
          quantityDispensed: Number(item.quantity_dispensed ?? 0),
          quantityRemaining: Number(item.remaining_quantity ?? Math.max(0, Number(item.quantity_prescribed ?? 0) - Number(item.quantity_dispensed ?? 0))),
          status: item.status,
          isSubstitutionAllowed: true,
          isControlled: false,
          requiresCounseling: false,
          createdAt: item.created_at ?? p.created_at,
          updatedAt: item.updated_at ?? item.created_at ?? p.updated_at,
        }));

        const totalItems = Number(p.items_count ?? mappedItems.length);
        const completedItems = Number(p.dispensed_items_count ?? mappedItems.filter((i) => i.status === 'fully_dispensed').length);

        return {
          id: p.id,
          encounterId: p.encounter ?? '',
          patientId: p.patient ?? '',
          doctorId: p.doctor ?? '',
          organizationId: p.organization ?? '',
          facilityId: p.facility_id ?? 'pharmacy-main',
          prescriptionNumber: p.prescription_number ?? p.id,
          date: p.date ?? p.created_at,
          status: p.status,
          items: mappedItems,
          instructions: p.instructions ?? '',
          diagnosis: p.diagnosis ?? '',
          validUntil: p.valid_until ?? '',
          totalItems,
          itemsDispensed: completedItems,
          isComplete: !!p.is_complete,
          allergiesChecked: false,
          interactionsChecked: false,
          clinicalNotes: '',
          createdAt: p.created_at,
          updatedAt: p.updated_at ?? p.created_at,
          patientName: p.patient_name ?? '',
          doctorName: p.doctor_name ?? '',
          facilityName: p.facility_id ?? 'Pharmacie',
          completedItems,
          progress: totalItems > 0 ? (completedItems / totalItems) * 100 : 0,
        };
      });

      const mappedInventory: InventoryItem[] = inventoryData.map((item: any) => ({
        id: item.id,
        organizationId: item.organization,
        productId: item.product,
        facilityId: item.facility_id,
        facilityType: 'PHARMACY',
        quantityOnHand: Number(item.quantity_on_hand ?? 0),
        quantityReserved: Number(item.quantity_reserved ?? 0),
        quantityAvailable: Number(item.quantity_available ?? 0),
        quantityOnOrder: Number(item.quantity_on_order ?? 0),
        quantityDamaged: 0,
        quantityExpired: 0,
        averageCost: Number(item.average_cost ?? 0),
        totalStockValue: Number(item.total_value ?? 0),
        lastPurchasePrice: Number(item.average_cost ?? 0),
        averageDailyUsage: 0,
        daysOfStockRemaining: 0,
        status: item.stock_status,
        isActive: true,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));

      setPrescriptions(enrichedPrescriptions);
      setInventory(mappedInventory);
      calculateStats(enrichedPrescriptions);

      await db.savePharmacyPrescriptionsCache({
        prescriptions: enrichedPrescriptions,
        inventory: mappedInventory,
      });
      
    } catch (error) {
      console.error('Error loading prescriptions:', error);
      try {
        const db = DatabaseService.getInstance();
        const cached = await db.getPharmacyPrescriptionsCache();
        if (cached?.payload) {
          const fallbackPrescriptions = cached.payload.prescriptions ?? [];
          const fallbackInventory = cached.payload.inventory ?? [];
          setPrescriptions(fallbackPrescriptions);
          setInventory(fallbackInventory);
          calculateStats(fallbackPrescriptions);
          toast.warning('Mode hors ligne: données locales chargées');
        } else {
          toast.error('Erreur lors du chargement des ordonnances');
        }
      } catch {
        toast.error('Erreur lors du chargement des ordonnances');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const calculateStats = (prescriptions: EnrichedPrescription[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats: PrescriptionStats = {
      total: prescriptions.length,
      pending: prescriptions.filter(p => p.status === 'pending').length,
      partial: prescriptions.filter(p => p.status === 'partially_dispensed').length,
      completed: prescriptions.filter(p => p.status === 'fully_dispensed').length,
      expired: prescriptions.filter(p => p.status === 'expired').length,
      todayReceived: prescriptions.filter(p => {
        const prescDate = new Date(p.createdAt);
        prescDate.setHours(0, 0, 0, 0);
        return prescDate.getTime() === today.getTime();
      }).length,
      todayProcessed: prescriptions.filter(p => {
        const updatedDate = new Date(p.updatedAt || p.createdAt);
        updatedDate.setHours(0, 0, 0, 0);
        return updatedDate.getTime() === today.getTime() && p.status === 'fully_dispensed';
      }).length,
      averageProcessingTime: (() => {
        const processed = prescriptions.filter(p => p.status === 'fully_dispensed' || p.status === 'partially_dispensed');
        if (processed.length === 0) return 0;
        const totalMinutes = processed.reduce((sum, p) => {
          const start = new Date(p.createdAt).getTime();
          const end = new Date(p.updatedAt || p.createdAt).getTime();
          if (isNaN(start) || isNaN(end) || end < start) return sum;
          return sum + Math.round((end - start) / 60000);
        }, 0);
        return Math.round(totalMinutes / processed.length);
      })(),
    };

    setStats(stats);
  };

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  // ─── Filtering & Sorting ─────────────────────────────────────
  const filteredPrescriptions = prescriptions
    .filter(prescription => {
      // Text search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchableText = [
          prescription.patientName,
          prescription.doctorName,
          prescription.facilityName,
          prescription.id,
          ...prescription.items.map(item => item.medicationName),
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(query)) return false;
      }

      // Status filter
      if (activeFilter !== 'ALL') {
        if (activeFilter === 'TODAY') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const prescDate = new Date(prescription.createdAt);
          prescDate.setHours(0, 0, 0, 0);
          return prescDate.getTime() === today.getTime();
        } else {
          return prescription.status === activeFilter || (activeFilter === 'PENDING' && prescription.status === 'pending') || (activeFilter === 'COMPLETED' && prescription.status === 'fully_dispensed') || (activeFilter === 'PARTIAL' && prescription.status === 'partially_dispensed') || (activeFilter === 'EXPIRED' && prescription.status === 'expired');
        }
      }

      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'patient':
          comparison = (a.patientName || '').localeCompare(b.patientName || '');
          break;
        case 'doctor':
          comparison = (a.doctorName || '').localeCompare(b.doctorName || '');
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'priority':
          const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1, NORMAL: 1 };
          comparison = (priorityOrder[a.priority as keyof typeof priorityOrder] || 1) - 
                     (priorityOrder[b.priority as keyof typeof priorityOrder] || 1);
          break;
        default:
          comparison = 0;
      }
      
      return sortDir === 'asc' ? comparison : -comparison;
    });

  // ─── Actions ─────────────────────────────────────────────────
  const handlePrescriptionSelect = (prescription: EnrichedPrescription) => {
    setSelectedPrescription(prescription);
    setShowPrescriptionModal(true);
  };

  const handleProcessPrescription = (prescription: EnrichedPrescription) => {
    setSelectedPrescription(prescription);
    setShowProcessingModal(true);
  };

  const processPrescriptionAction = async (action: PrescriptionProcessingAction) => {
    if (!selectedPrescription) return;

    try {
      setLoading(true);

      const api = ApiService.getInstance();
      if (action.type === 'reject') {
        const res = await api.post(`/prescriptions/${selectedPrescription.id}/cancel/`);
        if (!res?.success) throw new Error(res?.error?.message || 'Cancel failed');
      } else if (action.type === 'dispense' || action.type === 'partial' || action.type === 'substitute') {
        const quantityToDispense = Math.max(1, Number(action.quantity ?? 1));
        const res = await api.post(`/prescriptions/${selectedPrescription.id}/dispense/`, {
          items: [
            {
              item_id: action.itemId,
              quantity_to_dispense: quantityToDispense,
            },
          ],
          dispenser_notes: action.notes ?? '',
        });
        if (!res?.success) throw new Error(res?.error?.message || 'Dispense failed');
      } else if (action.type === 'hold') {
        const res = await api.patch(`/prescriptions/${selectedPrescription.id}/`, { status: 'pending' });
        if (!res?.success) throw new Error(res?.error?.message || 'Update failed');
      }
      
      toast.success(`Action ${action.type} effectuée avec succès`);
      setShowProcessingModal(false);
      setProcessingAction(null);
      await loadPrescriptions();
      
    } catch (error) {
      toast.error('Erreur lors du traitement');
    } finally {
      setLoading(false);
    }
  };

  const exportPrescriptions = async () => {
    try {
      const count = filteredPrescriptions.length;
      toast.success(`${count} ordonnance(s) prêtes pour export (vue actuelle)`);
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  // ─── Utility Functions ───────────────────────────────────────
  const getStatusColor = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'pending': return colors.warning;
      case 'partially_dispensed': return colors.info;
      case 'fully_dispensed': return colors.success;
      case 'expired': return colors.error;
      case 'PENDING': return colors.warning;
      case 'PARTIAL': return colors.info;
      case 'COMPLETED': return colors.success;
      case 'EXPIRED': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'pending': return 'En attente';
      case 'partially_dispensed': return 'Partielle';
      case 'fully_dispensed': return 'Terminée';
      case 'expired': return 'Expirée';
      case 'cancelled': return 'Annulée';
      case 'PENDING': return 'En attente';
      case 'PARTIAL': return 'Partielle';
      case 'COMPLETED': return 'Terminée';
      case 'EXPIRED': return 'Expirée';
      default: return status;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'alert-circle';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'information-circle';
      default: return 'radio-button-off';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return colors.error;
      case 'MEDIUM': return colors.warning;
      case 'LOW': return colors.info;
      default: return colors.textSecondary;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ─── Render Functions ───────────────────────────────────────
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={styles.headerIcon}>
          <Ionicons name="document-text" size={24} color={colors.primary} />
        </View>
        <View>
          <Text style={styles.headerTitle}>Gestion des Ordonnances</Text>
          <Text style={styles.headerSubtitle}>
            {stats ? `${stats.total} ordonnances • ${stats.pending} en attente` : 'Chargement...'}
          </Text>
        </View>
      </View>
      
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.headerButton} onPress={exportPrescriptions}>
          <Ionicons name="download" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.headerButton} onPress={() => {}}>
          <Ionicons name="add" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStatsCards = () => {
    if (!stats) return null;

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
        <View style={[styles.statCard, { borderLeftColor: colors.primary }]}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        
        <View style={[styles.statCard, { borderLeftColor: colors.warning }]}>
          <Text style={styles.statValue}>{stats.pending}</Text>
          <Text style={styles.statLabel}>En Attente</Text>
        </View>
        
        <View style={[styles.statCard, { borderLeftColor: colors.info }]}>
          <Text style={styles.statValue}>{stats.partial}</Text>
          <Text style={styles.statLabel}>Partielles</Text>
        </View>
        
        <View style={[styles.statCard, { borderLeftColor: colors.success }]}>
          <Text style={styles.statValue}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Terminées</Text>
        </View>
        
        <View style={[styles.statCard, { borderLeftColor: colors.error }]}>
          <Text style={styles.statValue}>{stats.expired}</Text>
          <Text style={styles.statLabel}>Expirées</Text>
        </View>
        
        <View style={[styles.statCard, { borderLeftColor: colors.success }]}>
          <Text style={styles.statValue}>{stats.todayProcessed}</Text>
          <Text style={styles.statLabel}>Traitées Aujourd'hui</Text>
        </View>
      </ScrollView>
    );
  };

  const renderFiltersAndSearch = () => (
    <View style={styles.filtersContainer}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par patient, médecin, médicament..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.textSecondary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabs}>
        {[
          { key: 'ALL', label: 'Toutes', count: stats?.total || 0 },
          { key: 'TODAY', label: 'Aujourd\'hui', count: stats?.todayReceived || 0 },
          { key: 'PENDING', label: 'En attente', count: stats?.pending || 0 },
          { key: 'PARTIAL', label: 'Partielles', count: stats?.partial || 0 },
          { key: 'COMPLETED', label: 'Terminées', count: stats?.completed || 0 },
          { key: 'EXPIRED', label: 'Expirées', count: stats?.expired || 0 },
        ].map(({ key, label, count }) => (
          <TouchableOpacity
            key={key}
            style={[styles.filterTab, activeFilter === key && styles.filterTabActive]}
            onPress={() => setActiveFilter(key as PrescriptionFilter)}
          >
            <Text style={[styles.filterTabText, activeFilter === key && styles.filterTabTextActive]}>
              {label}
            </Text>
            <View style={[styles.filterTabBadge, activeFilter === key && styles.filterTabBadgeActive]}>
              <Text style={[styles.filterTabBadgeText, activeFilter === key && styles.filterTabBadgeTextActive]}>
                {count}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* View Mode & Sort */}
      <View style={styles.viewControls}>
        <View style={styles.viewModeButtons}>
          {(['list', 'grid', 'detailed'] as ViewMode[]).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.viewModeButton, viewMode === mode && styles.viewModeButtonActive]}
              onPress={() => setViewMode(mode)}
            >
              <Ionicons
                name={mode === 'list' ? 'list' : mode === 'grid' ? 'grid' : 'reorder-four'}
                size={16}
                color={viewMode === mode ? colors.primary : colors.textSecondary}
              />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.sortButton} onPress={() => {}}>
          <Ionicons name="funnel" size={16} color={colors.textSecondary} />
          <Text style={styles.sortButtonText}>Trier</Text>
          <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPrescriptionCard = ({ item }: { item: EnrichedPrescription }) => (
    <TouchableOpacity
      style={styles.prescriptionCard}
      onPress={() => handlePrescriptionSelect(item)}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.prescriptionHeader}>
        <View style={styles.prescriptionInfo}>
          <Text style={styles.prescriptionPatient}>{item.patientName}</Text>
          <Text style={styles.prescriptionDoctor}>Par {item.doctorName}</Text>
        </View>
        
        <View style={styles.prescriptionMeta}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '14' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
          
          <Ionicons
            name={getPriorityIcon(item.priority)}
            size={16}
            color={getPriorityColor(item.priority)}
            style={{ marginLeft: spacing.xs }}
          />
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${item.progress || 0}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {item.completedItems}/{item.totalItems} médicaments
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.prescriptionFooter}>
        <Text style={styles.prescriptionDate}>{formatDate(item.createdAt)}</Text>
        <Text style={styles.prescriptionId}>#{item.id.slice(-8).toUpperCase()}</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            handleProcessPrescription(item);
          }}
        >
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={styles.actionButtonText}>Traiter</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            // Handle view details
          }}
        >
          <Ionicons name="eye" size={16} color={colors.info} />
          <Text style={styles.actionButtonText}>Détails</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderPrescriptionsList = () => (
    <FlatList
      data={filteredPrescriptions}
      keyExtractor={(item) => item.id}
      renderItem={renderPrescriptionCard}
      style={styles.prescriptionsList}
      contentContainerStyle={styles.prescriptionsListContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => {
          setRefreshing(true);
          loadPrescriptions();
        }} />
      }
      ListEmptyComponent={() => (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyStateTitle}>Aucune ordonnance trouvée</Text>
          <Text style={styles.emptyStateText}>
            {searchQuery || activeFilter !== 'ALL'
              ? 'Essayez de modifier vos critères de recherche'
              : 'Les nouvelles ordonnances apparaîtront ici'
            }
          </Text>
        </View>
      )}
    />
  );

  const renderPrescriptionModal = () => (
    <Modal
      visible={showPrescriptionModal}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={() => setShowPrescriptionModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Détails de l'Ordonnance</Text>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowPrescriptionModal(false)}
          >
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {selectedPrescription && (
          <ScrollView style={styles.modalContent}>
            {/* Prescription Info */}
            <View style={styles.prescriptionDetailsCard}>
              <Text style={styles.detailsCardTitle}>Informations Générales</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Patient:</Text>
                <Text style={styles.detailValue}>{selectedPrescription.patientName}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Médecin:</Text>
                <Text style={styles.detailValue}>{selectedPrescription.doctorName}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Établissement:</Text>
                <Text style={styles.detailValue}>{selectedPrescription.facilityName}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date de création:</Text>
                <Text style={styles.detailValue}>{formatDate(selectedPrescription.createdAt)}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Statut:</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedPrescription.status) + '14' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(selectedPrescription.status) }]}>
                    {getStatusLabel(selectedPrescription.status)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Prescription Items */}
            <View style={styles.prescriptionDetailsCard}>
              <Text style={styles.detailsCardTitle}>Médicaments Prescrits</Text>
              
              {selectedPrescription.items.map((item, index) => (
                <View key={index} style={styles.medicationItem}>
                  <View style={styles.medicationInfo}>
                    <Text style={styles.medicationName}>{item.medicationName}</Text>
                    <Text style={styles.medicationDetails}>
                      {item.dosage} • {item.frequency} • {item.duration}
                    </Text>
                    <Text style={styles.medicationQuantity}>Quantité: {item.quantity}</Text>
                    {item.instructions && (
                      <Text style={styles.medicationInstructions}>
                        Instructions: {item.instructions}
                      </Text>
                    )}
                  </View>
                  
                  <View style={styles.medicationStatus}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                    <Text style={styles.medicationStatusText}>{getStatusLabel(item.status)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => setShowPrescriptionModal(false)}
          >
            <Text style={styles.modalButtonText}>Fermer</Text>
          </TouchableOpacity>
          
          {selectedPrescription?.status === 'pending' && (
            <TouchableOpacity
              style={[styles.modalButton, styles.primaryButton]}
              onPress={() => {
                setShowPrescriptionModal(false);
                setTimeout(() => {
                  handleProcessPrescription(selectedPrescription);
                }, 100);
              }}
            >
              <Text style={[styles.modalButtonText, styles.primaryButtonText]}>Traiter</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderStatsCards()}
      {renderFiltersAndSearch()}
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement des ordonnances...</Text>
        </View>
      ) : (
        renderPrescriptionsList()
      )}

      {renderPrescriptionModal()}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    ...shadows.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '14',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.onBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  statCard: {
    backgroundColor: colors.background,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    marginRight: spacing.md,
    minWidth: 80,
    alignItems: 'center',
    borderLeftWidth: 3,
    ...shadows.sm,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  filtersContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.onBackground,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  filterTabs: {
    marginBottom: spacing.md,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.onBackground,
    marginRight: spacing.sm,
    gap: spacing.xs,
  },
  filterTabActive: {
    backgroundColor: colors.primary + '14',
  },
  filterTabText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  filterTabBadge: {
    backgroundColor: colors.textSecondary,
    borderRadius: borderRadius.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  filterTabBadgeActive: {
    backgroundColor: colors.primary,
  },
  filterTabBadgeText: {
    fontSize: 10,
    color: colors.surface,
    fontWeight: '600',
  },
  filterTabBadgeTextActive: {
    color: colors.surface,
  },
  viewControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewModeButtons: {
    flexDirection: 'row',
    backgroundColor: colors.onBackground,
    borderRadius: borderRadius.sm,
    padding: 2,
  },
  viewModeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm - 2,
  },
  viewModeButtonActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.onBackground,
    gap: spacing.xs,
  },
  sortButtonText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  prescriptionsList: {
    flex: 1,
  },
  prescriptionsListContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  prescriptionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  prescriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  prescriptionInfo: {
    flex: 1,
  },
  prescriptionPatient: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  prescriptionDoctor: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  prescriptionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.outline,
    borderRadius: 2,
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  prescriptionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  prescriptionDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  prescriptionId: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    paddingTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.onBackground,
    gap: spacing.xs,
  },
  actionButtonText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.xl,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.onBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  prescriptionDetailsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  detailsCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  medicationItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  medicationInfo: {
    flex: 1,
    marginBottom: spacing.sm,
  },
  medicationName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  medicationDetails: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  medicationQuantity: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  medicationInstructions: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  medicationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  medicationStatusText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.onBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: colors.surface,
  },
});
