import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Dimensions, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../../../theme/theme';
import DatabaseService from '../../../services/DatabaseService';
import { Patient, PatientUtils } from '../../../models/Patient';
import { Encounter, EncounterUtils } from '../../../models/Encounter';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface PatientWithEncounters extends Patient {
  encounters: Encounter[];
  activeEncounter?: Encounter;
}

type TabKey = 'all' | 'active' | 'recent' | 'inactive';
type SortKey = 'name' | 'recent' | 'number';

// ═══════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════

interface Props {
  onSelectPatient?: (patient: Patient) => void;
  onNewPatient?: () => void;
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export function PatientListScreen({ onSelectPatient, onNewPatient }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patients, setPatients] = useState<PatientWithEncounters[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [sortBy, setSortBy] = useState<SortKey>('recent');
  const [stats, setStats] = useState({ total: 0, active: 0, newThisMonth: 0, byGender: { male: 0, female: 0, other: 0 } });

  const loadData = useCallback(async () => {
    try {
      const db = DatabaseService.getInstance();
      const allPatients = await db.getAllPatients();
      const allEncounters = await db.getEncountersByOrganization(
        (await db.getCurrentOrganization())?.id || ''
      );

      // Merge encounters onto patients
      const enriched: PatientWithEncounters[] = allPatients.map(p => {
        const patientEncounters = allEncounters.filter(e => e.patientId === p.id);
        const activeEnc = patientEncounters.find(e => EncounterUtils.isActive(e));
        return { ...p, encounters: patientEncounters, activeEncounter: activeEnc };
      });

      setPatients(enriched);
      setStats(await db.getPatientStats());
    } catch (err) {
      console.error('Patient list load error', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

  // ─── Filtering & Sorting ──────────────────────────────────

  const filtered = patients.filter(p => {
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.patientNumber.toLowerCase().includes(q) ||
        (p.phone && p.phone.includes(q)) ||
        (p.nationalId && p.nationalId.toLowerCase().includes(q));
      if (!match) return false;
    }
    // Tab filter
    switch (activeTab) {
      case 'active': return p.activeEncounter != null;
      case 'recent': {
        if (!p.lastVisit) return false;
        const diff = Date.now() - new Date(p.lastVisit).getTime();
        return diff < 30 * 24 * 60 * 60 * 1000; // Last 30 days
      }
      case 'inactive': return p.status === 'inactive';
      default: return true;
    }
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'name': return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
      case 'number': return a.patientNumber.localeCompare(b.patientNumber);
      case 'recent':
      default:
        return (b.lastVisit || b.createdAt).localeCompare(a.lastVisit || a.createdAt);
    }
  });

  // ─── Loading ──────────────────────────────────────────────

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.loadingText}>Chargement des patients...</Text>
      </View>
    );
  }

  // ─── Render ───────────────────────────────────────────────

  return (
    <View style={s.root}>
      {/* ── Header ──────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Ionicons name="people" size={24} color={colors.primary} />
          <View style={{ marginLeft: 12 }}>
            <Text style={s.headerTitle}>Gestion des Patients</Text>
            <Text style={s.headerSub}>{stats.total} patient{stats.total !== 1 ? 's' : ''} enregistré{stats.total !== 1 ? 's' : ''}</Text>
          </View>
        </View>
        <TouchableOpacity style={s.addBtn} activeOpacity={0.7} onPress={onNewPatient}>
          <Ionicons name="person-add" size={18} color="#FFF" />
          <Text style={s.addBtnText}>Nouveau Patient</Text>
        </TouchableOpacity>
      </View>

      {/* ── KPI Cards ───────────────────────────────────── */}
      <View style={s.kpiRow}>
        <KPICard icon="people" label="Total" value={`${stats.total}`} color={colors.primary} />
        <KPICard icon="pulse" label="Actifs auj." value={`${patients.filter(p => p.activeEncounter).length}`} color="#EF4444" />
        <KPICard icon="person-add" label="Ce mois" value={`${stats.newThisMonth}`} color={colors.info} />
        <KPICard icon="male-female" label="H / F" value={`${stats.byGender.male} / ${stats.byGender.female}`} color={colors.accent} />
      </View>

      {/* ── Search & Filters ────────────────────────────── */}
      <View style={s.filterRow}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={s.searchInput}
            placeholder="Rechercher par nom, ID, téléphone..."
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

      {/* ── Tabs ────────────────────────────────────────── */}
      <View style={s.tabRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
          {([
            { key: 'all', label: 'Tous', icon: 'people-outline' },
            { key: 'active', label: 'En visite', icon: 'pulse-outline' },
            { key: 'recent', label: 'Récents (30j)', icon: 'time-outline' },
            { key: 'inactive', label: 'Inactifs', icon: 'person-remove-outline' },
          ] as const).map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[s.tab, activeTab === tab.key && s.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon as any}
                size={16}
                color={activeTab === tab.key ? colors.onPrimary : colors.textSecondary}
              />
              <Text style={[s.tabText, activeTab === tab.key && s.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sort */}
        <View style={s.sortRow}>
          <Text style={s.sortLabel}>Trier:</Text>
          {([
            { key: 'recent', label: 'Récent' },
            { key: 'name', label: 'Nom' },
            { key: 'number', label: 'N°' },
          ] as const).map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[s.sortChip, sortBy === opt.key && s.sortChipActive]}
              onPress={() => setSortBy(opt.key)}
            >
              <Text style={[s.sortChipText, sortBy === opt.key && s.sortChipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Patient List ────────────────────────────────── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {sorted.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="people-outline" size={56} color={colors.textTertiary} />
            <Text style={s.emptyTitle}>
              {searchQuery ? 'Aucun patient trouvé' : 'Aucun patient enregistré'}
            </Text>
            <Text style={s.emptySub}>
              {searchQuery
                ? `Aucun résultat pour "${searchQuery}"`
                : 'Commencez par enregistrer votre premier patient'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={s.emptyBtn} onPress={onNewPatient}>
                <Ionicons name="person-add" size={18} color="#FFF" />
                <Text style={s.emptyBtnText}>Enregistrer un patient</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={s.grid}>
            {sorted.map(patient => (
              <PatientCard
                key={patient.id}
                patient={patient}
                onPress={() => onSelectPatient?.(patient)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// KPICard
// ═══════════════════════════════════════════════════════════════

function KPICard({ icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
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

// ═══════════════════════════════════════════════════════════════
// PatientCard
// ═══════════════════════════════════════════════════════════════

function PatientCard({ patient, onPress }: { patient: PatientWithEncounters; onPress: () => void }) {
  const fullName = PatientUtils.getFullName(patient);
  const age = PatientUtils.getAge(patient);
  const genderLabel = patient.gender === 'male' ? 'H' : patient.gender === 'female' ? 'F' : 'A';
  const genderColor = patient.gender === 'male' ? '#3B82F6' : patient.gender === 'female' ? '#EC4899' : '#8B5CF6';
  const initials = `${patient.firstName[0]}${patient.lastName[0]}`.toUpperCase();
  const hasActiveVisit = !!patient.activeEncounter;
  const lastVisitFormatted = patient.lastVisit
    ? new Date(patient.lastVisit).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Jamais';

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.7}>
      {/* Active visit indicator */}
      {hasActiveVisit && <View style={s.activeIndicator} />}

      <View style={s.cardTop}>
        {/* Avatar */}
        <View style={[s.avatar, { backgroundColor: genderColor + '18' }]}>
          <Text style={[s.avatarText, { color: genderColor }]}>{initials}</Text>
        </View>

        {/* Info */}
        <View style={s.cardInfo}>
          <Text style={s.cardName} numberOfLines={1}>{fullName}</Text>
          <View style={s.cardMetaRow}>
            <Text style={s.cardMeta}>{patient.patientNumber}</Text>
            <View style={s.dot} />
            <Text style={s.cardMeta}>{age} ans</Text>
            <View style={s.dot} />
            <View style={[s.genderBadge, { backgroundColor: genderColor + '18' }]}>
              <Text style={[s.genderText, { color: genderColor }]}>{genderLabel}</Text>
            </View>
          </View>
        </View>

        {/* Chevron */}
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      </View>

      {/* Bottom info */}
      <View style={s.cardBottom}>
        {/* Phone */}
        {patient.phone && (
          <View style={s.infoChip}>
            <Ionicons name="call-outline" size={12} color={colors.textSecondary} />
            <Text style={s.infoChipText}>{patient.phone}</Text>
          </View>
        )}

        {/* Blood type */}
        {patient.bloodType && (
          <View style={[s.infoChip, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="water" size={12} color="#EF4444" />
            <Text style={[s.infoChipText, { color: '#EF4444' }]}>{patient.bloodType}</Text>
          </View>
        )}

        {/* Allergies count */}
        {patient.allergies.length > 0 && (
          <View style={[s.infoChip, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="warning" size={12} color="#D97706" />
            <Text style={[s.infoChipText, { color: '#D97706' }]}>{patient.allergies.length} allergie{patient.allergies.length > 1 ? 's' : ''}</Text>
          </View>
        )}

        {/* Active encounter badge */}
        {patient.activeEncounter && (
          <View style={[s.infoChip, { backgroundColor: EncounterUtils.getStatusColor(patient.activeEncounter.status) + '18' }]}>
            <View style={[s.pulseDot, { backgroundColor: EncounterUtils.getStatusColor(patient.activeEncounter.status) }]} />
            <Text style={[s.infoChipText, { color: EncounterUtils.getStatusColor(patient.activeEncounter.status), fontWeight: '600' }]}>
              {EncounterUtils.getStatusLabel(patient.activeEncounter.status)}
            </Text>
          </View>
        )}
      </View>

      {/* Last visit / encounters count */}
      <View style={s.cardFooter}>
        <Text style={s.footerText}>
          <Ionicons name="time-outline" size={12} color={colors.textTertiary} /> Dernière visite: {lastVisitFormatted}
        </Text>
        <Text style={s.footerText}>
          {patient.encounters.length} visite{patient.encounters.length !== 1 ? 's' : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.textSecondary },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 16,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.outline,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  headerSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, gap: 8,
  },
  addBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  // KPI
  kpiRow: {
    flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8,
  },
  kpiCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: colors.outline,
  },
  kpiIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kpiValue: { fontSize: 20, fontWeight: '700', color: colors.text },
  kpiLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  // Filter / Search
  filterRow: { paddingHorizontal: 24, paddingVertical: 10 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.outline, gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },

  // Tabs
  tabRow: {
    flexDirection: isDesktop ? 'row' : 'column',
    alignItems: isDesktop ? 'center' : 'stretch',
    justifyContent: 'space-between',
    paddingHorizontal: isDesktop ? 0 : 0,
    paddingBottom: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.outline,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8, backgroundColor: colors.background, marginRight: 8, gap: 6,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  tabTextActive: { color: colors.onPrimary },
  sortRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 6, gap: 6,
  },
  sortLabel: { fontSize: 12, color: colors.textTertiary, marginRight: 4 },
  sortChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.outline,
  },
  sortChipActive: { backgroundColor: colors.primaryFaded, borderColor: colors.primary },
  sortChipText: { fontSize: 12, color: colors.textSecondary },
  sortChipTextActive: { color: colors.primary, fontWeight: '600' },

  // Scroll / Grid
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
  grid: {
    flexDirection: isDesktop ? 'row' : 'column',
    flexWrap: 'wrap',
    gap: 12,
  },

  // Patient Card
  card: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.outline,
    flexBasis: isDesktop ? '48%' : '100%', flexGrow: 0,
    position: 'relative', overflow: 'hidden',
  },
  activeIndicator: {
    position: 'absolute', top: 0, left: 0, bottom: 0, width: 4,
    backgroundColor: '#EF4444', borderTopLeftRadius: 14, borderBottomLeftRadius: 14,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '600', color: colors.text },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  cardMeta: { fontSize: 12, color: colors.textSecondary },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.textTertiary },
  genderBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  genderText: { fontSize: 11, fontWeight: '700' },

  // Card bottom
  cardBottom: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  infoChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.surfaceVariant, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  infoChipText: { fontSize: 11, color: colors.textSecondary },
  pulseDot: { width: 6, height: 6, borderRadius: 3 },

  // Footer
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: colors.outlineVariant, paddingTop: 8,
  },
  footerText: { fontSize: 11, color: colors.textTertiary },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 64, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  emptySub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', maxWidth: 300 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, gap: 8, marginTop: 16,
  },
  emptyBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});
