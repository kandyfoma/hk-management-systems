import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import {
  Ward,
  Bed,
  WardType,
  BedStatus,
  BedType,
  WardUtils,
  BedUtils,
  WARD_TYPE_CONFIG,
} from '../../../models/Ward';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

// ─── Local types for sample data (extending models) ─────────
interface SampleBed {
  id: string;
  bedNumber: string;
  wardId: string;
  roomNumber: string;
  type: string; // BedType or custom
  status: string; // BedStatus or custom
  isActive: boolean;
  createdAt: string;
  patientName?: string;
  hasMonitor?: boolean;
  hasVentilator?: boolean;
}

interface SampleWard {
  id: string;
  name: string;
  code: string;
  type: WardType;
  floor: number;
  building: string;
  organizationId: string;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  reservedBeds: number;
  nurseStationPhone: string;
  headNurseId?: string;
  headNurseName?: string;
  isActive: boolean;
  gender: 'male' | 'female' | 'mixed';
  ageGroup: 'pediatric' | 'adult' | 'all';
  createdAt: string;
  beds: SampleBed[];
}

// ─── Sample Data ─────────────────────────────────────────────
const sampleWards: SampleWard[] = [
  {
    id: 'W001',
    name: 'Médecine Générale',
    code: 'MG',
    type: 'general',
    floor: 2,
    building: 'Bâtiment Principal',
    organizationId: 'ORG001',
    totalBeds: 20,
    occupiedBeds: 14,
    availableBeds: 5,
    reservedBeds: 1,
    nurseStationPhone: '+243 999 000 001',
    headNurseId: 'N001',
    headNurseName: 'Infirmière Chef Marie',
    isActive: true,
    gender: 'mixed',
    ageGroup: 'adult',
    createdAt: new Date().toISOString(),
    beds: [
      { id: 'B001', bedNumber: 'MG-101', wardId: 'W001', roomNumber: '101', type: 'standard', status: 'occupied', isActive: true, createdAt: new Date().toISOString(), patientName: 'Jean Mukendi' },
      { id: 'B002', bedNumber: 'MG-102', wardId: 'W001', roomNumber: '101', type: 'standard', status: 'occupied', isActive: true, createdAt: new Date().toISOString(), patientName: 'Pierre Kasongo' },
      { id: 'B003', bedNumber: 'MG-103', wardId: 'W001', roomNumber: '102', type: 'standard', status: 'available', isActive: true, createdAt: new Date().toISOString() },
      { id: 'B004', bedNumber: 'MG-104', wardId: 'W001', roomNumber: '102', type: 'standard', status: 'cleaning', isActive: true, createdAt: new Date().toISOString() },
      { id: 'B005', bedNumber: 'MG-105', wardId: 'W001', roomNumber: '103', type: 'semi_private', status: 'reserved', isActive: true, createdAt: new Date().toISOString() },
      { id: 'B006', bedNumber: 'MG-106', wardId: 'W001', roomNumber: '103', type: 'semi_private', status: 'available', isActive: true, createdAt: new Date().toISOString() },
    ],
  },
  {
    id: 'W002',
    name: 'Soins Intensifs (USI)',
    code: 'USI',
    type: 'icu',
    floor: 1,
    building: 'Bâtiment Principal',
    organizationId: 'ORG001',
    totalBeds: 8,
    occupiedBeds: 6,
    availableBeds: 2,
    reservedBeds: 0,
    nurseStationPhone: '+243 999 000 002',
    headNurseId: 'N002',
    headNurseName: 'Infirmier Chef Paul',
    isActive: true,
    gender: 'mixed',
    ageGroup: 'adult',
    createdAt: new Date().toISOString(),
    beds: [
      { id: 'B101', bedNumber: 'USI-01', wardId: 'W002', roomNumber: 'USI-A', type: 'icu', status: 'occupied', isActive: true, hasMonitor: true, hasVentilator: true, createdAt: new Date().toISOString(), patientName: 'Marie Kabamba' },
      { id: 'B102', bedNumber: 'USI-02', wardId: 'W002', roomNumber: 'USI-A', type: 'icu', status: 'occupied', isActive: true, hasMonitor: true, hasVentilator: true, createdAt: new Date().toISOString(), patientName: 'David Mutombo' },
      { id: 'B103', bedNumber: 'USI-03', wardId: 'W002', roomNumber: 'USI-B', type: 'icu', status: 'available', isActive: true, hasMonitor: true, hasVentilator: true, createdAt: new Date().toISOString() },
      { id: 'B104', bedNumber: 'USI-04', wardId: 'W002', roomNumber: 'USI-B', type: 'icu', status: 'available', isActive: true, hasMonitor: true, hasVentilator: false, createdAt: new Date().toISOString() },
    ],
  },
  {
    id: 'W003',
    name: 'Pédiatrie',
    code: 'PED',
    type: 'pediatric',
    floor: 3,
    building: 'Bâtiment Principal',
    organizationId: 'ORG001',
    totalBeds: 15,
    occupiedBeds: 8,
    availableBeds: 7,
    reservedBeds: 0,
    nurseStationPhone: '+243 999 000 003',
    isActive: true,
    gender: 'mixed',
    ageGroup: 'pediatric',
    createdAt: new Date().toISOString(),
    beds: [
      { id: 'B201', bedNumber: 'PED-01', wardId: 'W003', roomNumber: '301', type: 'pediatric', status: 'occupied', isActive: true, createdAt: new Date().toISOString(), patientName: 'Petit Ange (5 ans)' },
      { id: 'B202', bedNumber: 'PED-02', wardId: 'W003', roomNumber: '301', type: 'pediatric', status: 'occupied', isActive: true, createdAt: new Date().toISOString(), patientName: 'Grace (7 ans)' },
      { id: 'B203', bedNumber: 'PED-03', wardId: 'W003', roomNumber: '302', type: 'pediatric', status: 'available', isActive: true, createdAt: new Date().toISOString() },
      { id: 'B204', bedNumber: 'PED-04', wardId: 'W003', roomNumber: '302', type: 'pediatric', status: 'available', isActive: true, createdAt: new Date().toISOString() },
    ],
  },
  {
    id: 'W004',
    name: 'Maternité',
    code: 'MAT',
    type: 'maternity',
    floor: 2,
    building: 'Bâtiment B',
    organizationId: 'ORG001',
    totalBeds: 12,
    occupiedBeds: 9,
    availableBeds: 3,
    reservedBeds: 0,
    nurseStationPhone: '+243 999 000 004',
    isActive: true,
    gender: 'female',
    ageGroup: 'adult',
    createdAt: new Date().toISOString(),
    beds: [
      { id: 'B301', bedNumber: 'MAT-01', wardId: 'W004', roomNumber: 'M1', type: 'delivery', status: 'occupied', isActive: true, createdAt: new Date().toISOString(), patientName: 'Sophie Mwamba' },
      { id: 'B302', bedNumber: 'MAT-02', wardId: 'W004', roomNumber: 'M1', type: 'standard', status: 'occupied', isActive: true, createdAt: new Date().toISOString(), patientName: 'Clarisse Ndaya' },
      { id: 'B303', bedNumber: 'MAT-03', wardId: 'W004', roomNumber: 'M2', type: 'standard', status: 'available', isActive: true, createdAt: new Date().toISOString() },
    ],
  },
  {
    id: 'W005',
    name: 'Chirurgie',
    code: 'CHI',
    type: 'surgical',
    floor: 1,
    building: 'Bâtiment Principal',
    organizationId: 'ORG001',
    totalBeds: 18,
    occupiedBeds: 12,
    availableBeds: 4,
    reservedBeds: 2,
    nurseStationPhone: '+243 999 000 005',
    isActive: true,
    gender: 'mixed',
    ageGroup: 'adult',
    createdAt: new Date().toISOString(),
    beds: [
      { id: 'B401', bedNumber: 'CHI-01', wardId: 'W005', roomNumber: 'S1', type: 'post_op', status: 'occupied', isActive: true, createdAt: new Date().toISOString(), patientName: 'Francois Katumba' },
      { id: 'B402', bedNumber: 'CHI-02', wardId: 'W005', roomNumber: 'S1', type: 'standard', status: 'maintenance', isActive: true, createdAt: new Date().toISOString() },
      { id: 'B403', bedNumber: 'CHI-03', wardId: 'W005', roomNumber: 'S2', type: 'standard', status: 'available', isActive: true, createdAt: new Date().toISOString() },
    ],
  },
];

// ─── Section Header Component ────────────────────────────────
function SectionHeader({
  title,
  subtitle,
  icon,
  accentColor = colors.info,
  ctaLabel,
  ctaIcon,
  onCtaPress,
}: {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
  ctaLabel?: string;
  ctaIcon?: keyof typeof Ionicons.glyphMap;
  onCtaPress?: () => void;
}) {
  return (
    <View style={secStyles.wrapper}>
      <View style={secStyles.divider}>
        <View style={[secStyles.dividerAccent, { backgroundColor: accentColor }]} />
        <View style={secStyles.dividerLine} />
      </View>
      <View style={secStyles.header}>
        <View style={secStyles.headerLeft}>
          <View style={[secStyles.iconBubble, { backgroundColor: accentColor + '14' }]}>
            <Ionicons name={icon} size={18} color={accentColor} />
          </View>
          <View>
            <Text style={secStyles.title}>{title}</Text>
            {subtitle && <Text style={secStyles.subtitle}>{subtitle}</Text>}
          </View>
        </View>
        {ctaLabel && (
          <TouchableOpacity
            style={[secStyles.ctaBtn, { backgroundColor: accentColor }]}
            onPress={onCtaPress}
            activeOpacity={0.7}
          >
            {ctaIcon && <Ionicons name={ctaIcon} size={15} color="#FFF" />}
            <Text style={secStyles.ctaText}>{ctaLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const secStyles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  dividerAccent: { width: 40, height: 3, borderRadius: 2 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.outline, marginLeft: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBubble: { width: 36, height: 36, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  ctaText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
});

// ─── Bed Status Badge ────────────────────────────────────────
function BedStatusBadge({ status }: { status: BedStatus }) {
  const color = BedUtils.getStatusColor(status);
  const labels: Record<BedStatus, string> = {
    available: 'Libre',
    occupied: 'Occupé',
    reserved: 'Réservé',
    cleaning: 'Nettoyage',
    maintenance: 'Maintenance',
    blocked: 'Bloqué',
    out_of_service: 'Hors Service',
  };
  return (
    <View style={[styles.bedStatusBadge, { backgroundColor: color }]}>
      <Text style={styles.bedStatusText}>{labels[status]}</Text>
    </View>
  );
}

// ─── Bed Card Component ──────────────────────────────────────
function BedCard({ bed }: { bed: SampleBed }) {
  const color = BedUtils.getStatusColor(bed.status as BedStatus);
  const isAvailable = bed.status === 'available';
  
  return (
    <TouchableOpacity
      style={[
        styles.bedCard,
        { borderColor: color },
        isAvailable && { borderStyle: 'dashed' },
      ]}
      activeOpacity={0.7}
    >
      <View style={styles.bedCardHeader}>
        <View style={[styles.bedIcon, { backgroundColor: color + '20' }]}>
          <Ionicons 
            name={bed.status === 'occupied' ? 'person' : 'bed'} 
            size={16} 
            color={color} 
          />
        </View>
        <Text style={styles.bedNumber}>{bed.bedNumber}</Text>
      </View>
      
      {bed.patientName ? (
        <Text style={styles.bedPatient} numberOfLines={1}>{bed.patientName}</Text>
      ) : (
        <Text style={[styles.bedPatient, { color: color }]}>
          {bed.status === 'available' ? '+ Admettre' : bed.status === 'cleaning' ? 'En nettoyage' : bed.status === 'maintenance' ? 'En réparation' : 'Réservé'}
        </Text>
      )}
      
      <View style={styles.bedCardFooter}>
        <Text style={styles.bedRoom}>Ch. {bed.roomNumber}</Text>
        {bed.hasMonitor && <Ionicons name="pulse" size={12} color={colors.error} />}
        {bed.hasVentilator && <Ionicons name="medical" size={12} color={colors.info} />}
      </View>
    </TouchableOpacity>
  );
}

// ─── Ward Card Component ─────────────────────────────────────
function WardCard({ ward, expanded, onToggle }: { 
  ward: typeof sampleWards[0]; 
  expanded: boolean;
  onToggle: () => void;
}) {
  const config = WARD_TYPE_CONFIG[ward.type] || { color: colors.primary, icon: 'bed' };
  const occupancyRate = ward.totalBeds > 0 ? Math.round((ward.occupiedBeds / ward.totalBeds) * 100) : 0;
  const occupancyColor = occupancyRate > 90 ? colors.error : occupancyRate > 70 ? colors.warning : colors.success;

  return (
    <View style={styles.wardCard}>
      {/* Ward Header */}
      <TouchableOpacity 
        style={styles.wardHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.wardHeaderLeft}>
          <View style={[styles.wardIcon, { backgroundColor: config.color + '20' }]}>
            <Ionicons name={config.icon as any} size={20} color={config.color} />
          </View>
          <View>
            <Text style={styles.wardName}>{ward.name}</Text>
            <Text style={styles.wardLocation}>
              {ward.building} • Étage {ward.floor}
            </Text>
          </View>
        </View>
        
        <View style={styles.wardHeaderRight}>
          <View style={styles.wardStats}>
            <View style={styles.wardStat}>
              <Text style={[styles.wardStatValue, { color: colors.success }]}>{ward.availableBeds}</Text>
              <Text style={styles.wardStatLabel}>Libres</Text>
            </View>
            <View style={styles.wardStat}>
              <Text style={[styles.wardStatValue, { color: colors.error }]}>{ward.occupiedBeds}</Text>
              <Text style={styles.wardStatLabel}>Occupés</Text>
            </View>
            <View style={styles.wardStat}>
              <Text style={[styles.wardStatValue, { color: occupancyColor }]}>{occupancyRate}%</Text>
              <Text style={styles.wardStatLabel}>Taux</Text>
            </View>
          </View>
          <Ionicons 
            name={expanded ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color={colors.textSecondary} 
          />
        </View>
      </TouchableOpacity>

      {/* Occupancy Bar */}
      <View style={styles.occupancyBar}>
        <View style={[styles.occupancyFill, { width: `${occupancyRate}%`, backgroundColor: occupancyColor }]} />
      </View>

      {/* Beds Grid (Expanded) */}
      {expanded && (
        <View style={styles.bedsGrid}>
          {ward.beds.map((bed) => (
            <BedCard key={bed.id} bed={bed} />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────────
export function WardManagementScreen() {
  const [expandedWards, setExpandedWards] = useState<string[]>([sampleWards[0].id]);
  const [selectedType, setSelectedType] = useState<WardType | null>(null);

  // Toggle ward expansion
  const toggleWard = (wardId: string) => {
    setExpandedWards(prev =>
      prev.includes(wardId)
        ? prev.filter(id => id !== wardId)
        : [...prev, wardId]
    );
  };

  // Calculate totals
  const totals = sampleWards.reduce((acc, ward) => ({
    totalBeds: acc.totalBeds + ward.totalBeds,
    occupied: acc.occupied + ward.occupiedBeds,
    available: acc.available + ward.availableBeds,
    reserved: acc.reserved + ward.reservedBeds,
  }), { totalBeds: 0, occupied: 0, available: 0, reserved: 0 });

  const overallOccupancy = Math.round((totals.occupied / totals.totalBeds) * 100);

  // Filter wards
  const filteredWards = selectedType
    ? sampleWards.filter(w => w.type === selectedType)
    : sampleWards;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🏥 Gestion des Services</Text>
          <Text style={styles.headerSubtitle}>Services hospitaliers et gestion des lits</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.7}>
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.addBtnText}>Ajouter Service</Text>
        </TouchableOpacity>
      </View>

      {/* ══════ SECTION: Vue d'Ensemble ══════ */}
      <SectionHeader
        title="Vue d'Ensemble"
        subtitle="Capacité totale de l'hôpital"
        icon="analytics"
        accentColor={colors.primary}
      />
      
      <View style={styles.overviewCard}>
        <View style={styles.overviewStats}>
          <View style={styles.overviewStat}>
            <Text style={styles.overviewStatValue}>{totals.totalBeds}</Text>
            <Text style={styles.overviewStatLabel}>Lits Total</Text>
          </View>
          <View style={[styles.overviewStat, { backgroundColor: colors.successLight }]}>
            <Text style={[styles.overviewStatValue, { color: colors.success }]}>{totals.available}</Text>
            <Text style={styles.overviewStatLabel}>Disponibles</Text>
          </View>
          <View style={[styles.overviewStat, { backgroundColor: colors.errorLight }]}>
            <Text style={[styles.overviewStatValue, { color: colors.error }]}>{totals.occupied}</Text>
            <Text style={styles.overviewStatLabel}>Occupés</Text>
          </View>
          <View style={[styles.overviewStat, { backgroundColor: colors.warningLight }]}>
            <Text style={[styles.overviewStatValue, { color: colors.warning }]}>{totals.reserved}</Text>
            <Text style={styles.overviewStatLabel}>Réservés</Text>
          </View>
        </View>
        
        <View style={styles.overviewOccupancy}>
          <View style={styles.overviewOccupancyHeader}>
            <Text style={styles.overviewOccupancyLabel}>Taux d'Occupation Global</Text>
            <Text style={[styles.overviewOccupancyValue, { color: overallOccupancy > 85 ? colors.error : overallOccupancy > 70 ? colors.warning : colors.success }]}>
              {overallOccupancy}%
            </Text>
          </View>
          <View style={styles.overviewOccupancyBar}>
            <View 
              style={[
                styles.overviewOccupancyFill, 
                { 
                  width: `${overallOccupancy}%`,
                  backgroundColor: overallOccupancy > 85 ? colors.error : overallOccupancy > 70 ? colors.warning : colors.success,
                }
              ]} 
            />
          </View>
        </View>
      </View>

      {/* ══════ SECTION: Légende Status ══════ */}
      <View style={styles.legendRow}>
        {[
          { status: 'available', label: 'Libre', color: colors.success },
          { status: 'occupied', label: 'Occupé', color: colors.error },
          { status: 'reserved', label: 'Réservé', color: colors.warning },
          { status: 'cleaning', label: 'Nettoyage', color: colors.info },
          { status: 'maintenance', label: 'Maintenance', color: colors.textTertiary },
        ].map((item) => (
          <View key={item.status} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* ══════ SECTION: Filtres par Type ══════ */}
      <SectionHeader
        title="Services par Type"
        icon="filter"
        accentColor={colors.secondary}
      />
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.typeScroll}
        contentContainerStyle={styles.typeScrollContent}
      >
        <TouchableOpacity
          style={[styles.typeChip, !selectedType && styles.typeChipSelected]}
          onPress={() => setSelectedType(null)}
          activeOpacity={0.7}
        >
          <Text style={[styles.typeChipText, !selectedType && { color: '#FFF' }]}>Tous</Text>
        </TouchableOpacity>
        {(['general', 'icu', 'pediatric', 'maternity', 'surgical'] as WardType[]).map((type) => {
          const config = WARD_TYPE_CONFIG[type];
          const isSelected = selectedType === type;
          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeChip,
                isSelected && { backgroundColor: config.color, borderColor: config.color },
              ]}
              onPress={() => setSelectedType(isSelected ? null : type)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={config.icon as any} 
                size={14} 
                color={isSelected ? '#FFF' : config.color} 
              />
              <Text style={[styles.typeChipText, isSelected && { color: '#FFF' }]}>
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ══════ SECTION: Liste des Services ══════ */}
      <SectionHeader
        title="Services"
        subtitle={`${filteredWards.length} services`}
        icon="list"
        accentColor={colors.info}
        ctaLabel="Tout Développer"
        ctaIcon="expand"
        onCtaPress={() => setExpandedWards(filteredWards.map(w => w.id))}
      />

      <View style={styles.wardsList}>
        {filteredWards.map((ward) => (
          <WardCard
            key={ward.id}
            ward={ward}
            expanded={expandedWards.includes(ward.id)}
            onToggle={() => toggleWard(ward.id)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: isDesktop ? 32 : 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  addBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },

  // Overview
  overviewCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 20,
    marginBottom: 20,
    ...shadows.sm,
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  overviewStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceVariant,
  },
  overviewStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  overviewStatLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  overviewOccupancy: {},
  overviewOccupancyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  overviewOccupancyLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  overviewOccupancyValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  overviewOccupancyBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceVariant,
    overflow: 'hidden',
  },
  overviewOccupancyFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Legend
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Type Scroll
  typeScroll: {
    marginBottom: 24,
  },
  typeScrollContent: {
    gap: 10,
    paddingRight: 16,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  typeChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },

  // Wards List
  wardsList: {
    gap: 16,
  },
  wardCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  wardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  wardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  wardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wardName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  wardLocation: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  wardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  wardStats: {
    flexDirection: 'row',
    gap: 16,
  },
  wardStat: {
    alignItems: 'center',
  },
  wardStatValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  wardStatLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  occupancyBar: {
    height: 4,
    backgroundColor: colors.surfaceVariant,
  },
  occupancyFill: {
    height: '100%',
  },

  // Beds Grid
  bedsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  bedCard: {
    width: isDesktop ? 140 : (width - 64) / 3,
    padding: 10,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 2,
  },
  bedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  bedIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bedNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  bedPatient: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  bedCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bedRoom: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  bedStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  bedStatusText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default WardManagementScreen;
