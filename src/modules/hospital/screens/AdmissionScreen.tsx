import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import {
  Admission,
  AdmissionStatus,
  AdmissionType,
  CareLevel,
  AdmissionUtils,
} from '../../../models/Admission';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

// ─── Sample Data ─────────────────────────────────────────────
type UIAdmission = Admission & {
  patientName: string;
  wardName: string;
  bedNumber: string;
  primaryDiagnosis: string;
  chiefComplaint?: string;
  secondaryDiagnoses?: string[];
  allergies?: string[];
  dietaryRequirements?: string;
  codeStatus?: string;
  admittingDoctorName?: string;
  attendingDoctorName?: string;
  admissionDate?: string;
  admissionTime?: string;
  expectedDischargeDate?: string;
};

const sampleAdmissions: UIAdmission[] = [
  {
    id: '1',
    admissionNumber: 'ADM260001',
    patientId: 'P1001',
    patientName: 'Jean Mukendi',
    encounterId: 'E260001',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    type: 'emergency',
    status: 'admitted',
    careLevel: 'critical',
    currentWardId: 'W002',
    wardName: 'Soins Intensifs',
    currentBedId: 'B101',
    bedNumber: 'USI-01',
    admissionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    admitDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    admissionTime: '14:30',
    admittingDoctorId: 'D001',
    admittingDoctorName: 'Dr. Kalala',
    attendingDoctorId: 'D001',
    attendingDoctorName: 'Dr. Kalala',
    primaryDiagnosis: 'Insuffisance cardiaque aiguë',
    admissionDiagnosis: 'Insuffisance cardiaque aiguë',
    admissionReason: 'Dyspnée sévère, œdème des membres inférieurs',
    chiefComplaint: 'Essoufflement progressif depuis 1 semaine',
    precautions: ['fall_risk', 'cardiac_monitoring'],
    consultingDoctorIds: ['D001'],
    allergiesVerified: true,
    dietaryRestrictions: ['régime sans sel'],
    allergies: ['Pénicilline'],
    dietaryRequirements: 'Régime sans sel',
    specialInstructions: 'Surveillance continue des signes vitaux',
    codeStatus: 'full_code',
    transferHistory: [],
    insuranceVerified: true,
    metadata: {},
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    admissionNumber: 'ADM260002',
    patientId: 'P1002',
    patientName: 'Marie Kabamba',
    encounterId: 'E260002',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    type: 'elective',
    status: 'admitted',
    careLevel: 'moderate',
    currentWardId: 'W005',
    wardName: 'Chirurgie',
    currentBedId: 'B401',
    bedNumber: 'CHI-01',
    admissionDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    admitDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    admissionTime: '08:00',
    admittingDoctorId: 'D002',
    admittingDoctorName: 'Dr. Mbala',
    attendingDoctorId: 'D002',
    attendingDoctorName: 'Dr. Mbala',
    primaryDiagnosis: 'Appendicite aiguë',
    admissionDiagnosis: 'Appendicite aiguë',
    secondaryDiagnoses: ['Diabète type 2'],
    admissionReason: 'Appendicectomie programmée',
    chiefComplaint: 'Douleur abdominale droite',
    precautions: ['nothing_by_mouth', 'diabetic_monitoring'],
    consultingDoctorIds: ['D002'],
    allergiesVerified: true,
    dietaryRestrictions: [],
    codeStatus: 'full_code',
    transferHistory: [],
    insuranceVerified: true,
    metadata: {},
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    admissionNumber: 'ADM260003',
    patientId: 'P1003',
    patientName: 'Pierre Kasongo',
    encounterId: 'E260003',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    type: 'observation',
    status: 'admitted',
    careLevel: 'minimal',
    currentWardId: 'W001',
    wardName: 'Médecine Générale',
    currentBedId: 'B001',
    bedNumber: 'MG-101',
    admissionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    admitDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    admissionTime: '16:45',
    admittingDoctorId: 'D001',
    admittingDoctorName: 'Dr. Kalala',
    attendingDoctorId: 'D001',
    attendingDoctorName: 'Dr. Kalala',
    primaryDiagnosis: 'Pneumonie communautaire',
    admissionDiagnosis: 'Pneumonie communautaire',
    admissionReason: 'Fièvre persistante, toux productive',
    chiefComplaint: 'Fièvre et toux depuis 5 jours',
    precautions: ['contact_precaution'],
    consultingDoctorIds: ['D001'],
    allergiesVerified: true,
    dietaryRequirements: 'Régime normal',
    dietaryRestrictions: [],
    codeStatus: 'full_code',
    transferHistory: [],
    insuranceVerified: true,
    metadata: {},
    createdAt: new Date().toISOString(),
  },
  {
    id: '4',
    admissionNumber: 'ADM260004',
    patientId: 'P1004',
    patientName: 'Sophie Mwamba',
    encounterId: 'E260004',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    type: 'maternity',
    status: 'admitted',
    careLevel: 'moderate',
    currentWardId: 'W004',
    wardName: 'Maternité',
    currentBedId: 'B301',
    bedNumber: 'MAT-01',
    admissionDate: new Date().toISOString(),
    admitDate: new Date().toISOString(),
    admissionTime: '06:30',
    admittingDoctorId: 'D004',
    admittingDoctorName: 'Dr. Tshilombo',
    attendingDoctorId: 'D004',
    attendingDoctorName: 'Dr. Tshilombo',
    primaryDiagnosis: 'Travail actif G2P1',
    admissionDiagnosis: 'Travail actif G2P1',
    admissionReason: 'Contractions régulières, dilatation 5cm',
    chiefComplaint: 'Contractions depuis 4 heures',
    allergiesVerified: true,
    consultingDoctorIds: ['D004'],
    dietaryRestrictions: [],
    codeStatus: 'full_code',
    transferHistory: [],
    insuranceVerified: true,
    metadata: {},
    createdAt: new Date().toISOString(),
  },
  {
    id: '5',
    admissionNumber: 'ADM260005',
    patientId: 'P1005',
    patientName: 'David Mutombo',
    encounterId: 'E260005',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    type: 'transfer_in',
    status: 'discharge_pending',
    careLevel: 'minimal',
    currentWardId: 'W001',
    wardName: 'Médecine Générale',
    currentBedId: 'B002',
    bedNumber: 'MG-102',
    admissionDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    admitDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    admissionTime: '10:00',
    admittingDoctorId: 'D001',
    admittingDoctorName: 'Dr. Kalala',
    attendingDoctorId: 'D001',
    attendingDoctorName: 'Dr. Kalala',
    primaryDiagnosis: 'Hypertension artérielle mal contrôlée',
    admissionDiagnosis: 'Hypertension artérielle mal contrôlée',
    admissionReason: 'Transfert pour bilan cardiologique',
    chiefComplaint: 'Céphalées, tension élevée',
    expectedDischargeDate: new Date().toISOString().split('T')[0],
    estimatedDischargeDate: new Date().toISOString().split('T')[0],
    consultingDoctorIds: ['D001'],
    allergiesVerified: true,
    dietaryRestrictions: [],
    codeStatus: 'full_code',
    transferHistory: [],
    insuranceVerified: true,
    metadata: {},
    createdAt: new Date().toISOString(),
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

// ─── Status Badge Component ──────────────────────────────────
function StatusBadge({ status }: { status: AdmissionStatus }) {
  const color = AdmissionUtils.getStatusColor(status);
  const labels: Record<AdmissionStatus, string> = {
    admitted: 'Admis',
    transferred: 'Transféré',
    discharge_pending: 'Sortie Prévue',
    discharged: 'Sorti',
    deceased: 'Décédé',
    absconded: 'Abscondé',
    cancelled: 'Annulé',
  };
  return (
    <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{labels[status]}</Text>
    </View>
  );
}

// ─── Care Level Badge ────────────────────────────────────────
function CareLevelBadge({ level }: { level: CareLevel }) {
  const config: Record<CareLevel, { label: string; color: string }> = {
    minimal: { label: 'Minimal', color: colors.success },
    moderate: { label: 'Modéré', color: colors.warning },
    intensive: { label: 'Intensif', color: colors.error },
    critical: { label: 'Critique', color: '#7C3AED' },
    palliative: { label: 'Palliatif', color: colors.info },
    rehabilitation: { label: 'Rééducation', color: colors.primary },
  };
  const c = config[level];
  return (
    <View style={[styles.careLevelBadge, { backgroundColor: c.color + '20', borderColor: c.color }]}>
      <Ionicons name="pulse" size={10} color={c.color} />
      <Text style={[styles.careLevelText, { color: c.color }]}>{c.label}</Text>
    </View>
  );
}

// ─── Admission Card Component ────────────────────────────────
function AdmissionCard({ admission }: { admission: typeof sampleAdmissions[0] }) {
  const losText = AdmissionUtils.formatLengthOfStay(admission as any);
  const isDischarging = admission.status === 'discharge_pending';

  return (
    <TouchableOpacity
      style={[
        styles.admissionCard,
        isDischarging && { borderLeftColor: colors.success, borderLeftWidth: 4 },
      ]}
      activeOpacity={0.7}
    >
      <View style={styles.admissionHeader}>
        <View style={styles.admissionHeaderLeft}>
          <View style={styles.patientAvatar}>
            <Text style={styles.patientAvatarText}>
              {admission.patientName.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
          <View>
            <Text style={styles.patientName}>{admission.patientName}</Text>
            <Text style={styles.admissionNumber}>{admission.admissionNumber}</Text>
          </View>
        </View>
        <StatusBadge status={admission.status} />
      </View>

      <View style={styles.admissionDiagnosis}>
        <Ionicons name="medkit" size={14} color={colors.error} />
        <Text style={styles.diagnosisText}>{admission.primaryDiagnosis}</Text>
      </View>

      <View style={styles.admissionDetails}>
        <View style={styles.admissionDetail}>
          <Ionicons name="bed" size={14} color={colors.textSecondary} />
          <Text style={styles.admissionDetailText}>
            {admission.wardName} • {admission.bedNumber}
          </Text>
        </View>
        <View style={styles.admissionDetail}>
          <Ionicons name="person" size={14} color={colors.primary} />
          <Text style={[styles.admissionDetailText, { color: colors.primary }]}>
            {admission.attendingDoctorName}
          </Text>
        </View>
      </View>

      <View style={styles.admissionFooter}>
        <View style={styles.admissionFooterLeft}>
          <CareLevelBadge level={admission.careLevel} />
          <View style={styles.losContainer}>
            <Ionicons name="time" size={12} color={colors.textSecondary} />
            <Text style={styles.losText}>{losText}</Text>
          </View>
        </View>

        {admission.precautions && admission.precautions.length > 0 && (
          <View style={styles.precautionsRow}>
            {admission.precautions.slice(0, 2).map((p, idx) => (
              <View key={idx} style={styles.precautionBadge}>
                <Ionicons name="warning" size={10} color={colors.warning} />
              </View>
            ))}
            {admission.precautions.length > 2 && (
              <Text style={styles.morePrecautions}>+{admission.precautions.length - 2}</Text>
            )}
          </View>
        )}
      </View>

      {isDischarging && admission.expectedDischargeDate && (
        <View style={styles.dischargeNotice}>
          <Ionicons name="exit" size={14} color={colors.success} />
          <Text style={styles.dischargeNoticeText}>
            Sortie prévue: {new Date(admission.expectedDischargeDate).toLocaleDateString('fr-FR')}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Component ──────────────────────────────────────────
export function AdmissionScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<AdmissionStatus | null>(null);
  const [selectedCareLevel, setSelectedCareLevel] = useState<CareLevel | null>(null);

  // Calculate stats
  const stats = {
    total: sampleAdmissions.length,
    admitted: sampleAdmissions.filter(a => a.status === 'admitted').length,
    dischargePending: sampleAdmissions.filter(a => a.status === 'discharge_pending').length,
    critical: sampleAdmissions.filter(a => a.careLevel === 'critical' || a.careLevel === 'intensive').length,
  };

  // Filter admissions
  const filteredAdmissions = sampleAdmissions.filter(a => {
    if (selectedStatus && a.status !== selectedStatus) return false;
    if (selectedCareLevel && a.careLevel !== selectedCareLevel) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        a.patientName.toLowerCase().includes(query) ||
        a.admissionNumber.toLowerCase().includes(query) ||
        a.primaryDiagnosis.toLowerCase().includes(query) ||
        a.wardName.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🏨 Hospitalisations</Text>
          <Text style={styles.headerSubtitle}>Gestion des admissions et séjours</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.7}>
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.addBtnText}>Nouvelle Admission</Text>
        </TouchableOpacity>
      </View>

      {/* ══════ SECTION: Statistiques ══════ */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.infoLight }]}>
          <Ionicons name="people" size={24} color={colors.info} />
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Hospitalisés</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.primaryLight || '#E0E7FF' }]}>
          <Ionicons name="bed" size={24} color={colors.primary} />
          <Text style={styles.statValue}>{stats.admitted}</Text>
          <Text style={styles.statLabel}>Admis</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.successLight }]}>
          <Ionicons name="exit" size={24} color={colors.success} />
          <Text style={styles.statValue}>{stats.dischargePending}</Text>
          <Text style={styles.statLabel}>Sorties Prévues</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.errorLight }]}>
          <Ionicons name="pulse" size={24} color={colors.error} />
          <Text style={styles.statValue}>{stats.critical}</Text>
          <Text style={styles.statLabel}>Soins Intensifs</Text>
        </View>
      </View>

      {/* ══════ SECTION: Filtres ══════ */}
      <SectionHeader
        title="Filtres"
        icon="filter"
        accentColor={colors.secondary}
      />
      
      {/* Status Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Statut:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, !selectedStatus && styles.filterChipSelected]}
              onPress={() => setSelectedStatus(null)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, !selectedStatus && { color: '#FFF' }]}>Tous</Text>
            </TouchableOpacity>
            {(['admitted', 'discharge_pending', 'in_treatment'] as AdmissionStatus[]).map((status) => {
              const isSelected = selectedStatus === status;
              const color = AdmissionUtils.getStatusColor(status);
              const labels: Record<string, string> = {
                admitted: 'Admis',
                discharge_pending: 'Sortie Prévue',
                in_treatment: 'En Traitement',
              };
              return (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterChip,
                    isSelected && { backgroundColor: color, borderColor: color },
                  ]}
                  onPress={() => setSelectedStatus(isSelected ? null : status)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterChipText, isSelected && { color: '#FFF' }]}>
                    {labels[status]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Care Level Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Niveau de Soins:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, !selectedCareLevel && styles.filterChipSelected]}
              onPress={() => setSelectedCareLevel(null)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, !selectedCareLevel && { color: '#FFF' }]}>Tous</Text>
            </TouchableOpacity>
            {(['minimal', 'moderate', 'intensive', 'critical', 'palliative', 'rehabilitation'] as CareLevel[]).map((level) => {
              const isSelected = selectedCareLevel === level;
              const labels: Record<CareLevel, string> = {
                minimal: 'Minimal',
                moderate: 'Modéré',
                intensive: 'Intensif',
                critical: 'Critique',
                palliative: 'Palliatif',
                rehabilitation: 'Rééducation',
              };
              return (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.filterChip,
                    isSelected && styles.filterChipSelected,
                  ]}
                  onPress={() => setSelectedCareLevel(isSelected ? null : level)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterChipText, isSelected && { color: '#FFF' }]}>
                    {labels[level]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* ══════ SECTION: Liste des Hospitalisations ══════ */}
      <SectionHeader
        title="Patients Hospitalisés"
        subtitle={`${filteredAdmissions.length} patients`}
        icon="list"
        accentColor={colors.info}
        ctaLabel="Exporter"
        ctaIcon="download-outline"
      />

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher patient, diagnostic, service..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Admissions List */}
      <View style={styles.admissionsList}>
        {filteredAdmissions.map((admission) => (
          <AdmissionCard key={admission.id} admission={admission} />
        ))}
        {filteredAdmissions.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="bed-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyStateText}>Aucune hospitalisation trouvée</Text>
          </View>
        )}
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

  // Stats
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: isDesktop ? 1 : undefined,
    width: isDesktop ? undefined : (width - 48) / 2,
    padding: 16,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },

  // Filters
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },

  // Search
  searchContainer: {
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },

  // Admissions List
  admissionsList: {
    gap: 12,
  },
  admissionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 16,
    ...shadows.sm,
  },
  admissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  admissionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  patientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  admissionNumber: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  admissionDiagnosis: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.errorLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    marginBottom: 12,
  },
  diagnosisText: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '500',
    flex: 1,
  },
  admissionDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  admissionDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  admissionDetailText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  admissionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  admissionFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  losContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  losText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  precautionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  precautionBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  morePrecautions: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  dischargeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.successLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    marginTop: 12,
  },
  dischargeNoticeText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },

  // Badges
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  careLevelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  careLevelText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
  },
});

export default AdmissionScreen;
