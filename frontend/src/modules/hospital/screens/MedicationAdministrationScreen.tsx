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
  MedicationAdministration,
  AdministrationStatus,
  MedicationRoute,
  MedicationAdministrationUtils,
  STANDARD_ADMIN_TIMES,
} from '../../../models/MedicationAdministration';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

// ─── Sample Data ─────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0];

const samplePatients = [
  { id: 'P1001', name: 'Jean Mukendi', room: 'USI-01', admissionId: 'ADM001' },
  { id: 'P1002', name: 'Marie Kabamba', room: 'CHI-01', admissionId: 'ADM002' },
  { id: 'P1003', name: 'Pierre Kasongo', room: 'MG-101', admissionId: 'ADM003' },
];

const sampleMAR: (MedicationAdministration & { patientName: string })[] = [
  // Patient 1 - Jean Mukendi
  {
    id: '1',
    administrationNumber: 'MAR260001',
    admissionId: 'ADM001',
    encounterId: 'E001',
    patientId: 'P1001',
    patientName: 'Jean Mukendi',
    prescriptionId: 'RX001',
    prescriptionItemId: 'RXI001',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    medicationName: 'Furosémide',
    dosage: '40mg',
    dose: 40,
    doseUnit: 'mg',
    route: 'intravenous',
    frequency: 'BD',
    scheduledDate: today,
    scheduledTime: '08:00',
    scheduledDateTime: `${today}T08:00:00`,
    status: 'given',
    administeredDateTime: `${today}T08:05:00`,
    administeredBy: 'N001',
    administeredByName: 'Inf. Marie',
    actualDose: 40,
    requiresWitness: false,
    createdAt: new Date().toISOString(),
    createdBy: 'N001',
  },
  {
    id: '2',
    administrationNumber: 'MAR260002',
    admissionId: 'ADM001',
    encounterId: 'E001',
    patientId: 'P1001',
    patientName: 'Jean Mukendi',
    prescriptionId: 'RX001',
    prescriptionItemId: 'RXI002',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    medicationName: 'Métoprolol',
    dosage: '50mg',
    dose: 50,
    doseUnit: 'mg',
    route: 'oral',
    frequency: 'BD',
    scheduledDate: today,
    scheduledTime: '08:00',
    scheduledDateTime: `${today}T08:00:00`,
    status: 'given',
    administeredDateTime: `${today}T08:10:00`,
    administeredBy: 'N001',
    administeredByName: 'Inf. Marie',
    actualDose: 50,
    requiresWitness: false,
    createdAt: new Date().toISOString(),
    createdBy: 'N001',
  },
  {
    id: '3',
    administrationNumber: 'MAR260003',
    admissionId: 'ADM001',
    encounterId: 'E001',
    patientId: 'P1001',
    patientName: 'Jean Mukendi',
    prescriptionId: 'RX001',
    prescriptionItemId: 'RXI003',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    medicationName: 'Héparine',
    dosage: '5000 UI',
    dose: 5000,
    doseUnit: 'UI',
    route: 'subcutaneous',
    frequency: 'BD',
    scheduledDate: today,
    scheduledTime: '08:00',
    scheduledDateTime: `${today}T08:00:00`,
    status: 'given',
    administeredDateTime: `${today}T08:15:00`,
    administeredBy: 'N001',
    administeredByName: 'Inf. Marie',
    witnessId: 'N002',
    witnessName: 'Inf. Paul',
    actualDose: 5000,
    requiresWitness: true,
    createdAt: new Date().toISOString(),
    createdBy: 'N001',
  },
  {
    id: '4',
    administrationNumber: 'MAR260004',
    admissionId: 'ADM001',
    encounterId: 'E001',
    patientId: 'P1001',
    patientName: 'Jean Mukendi',
    prescriptionId: 'RX001',
    prescriptionItemId: 'RXI001',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    medicationName: 'Furosémide',
    dosage: '40mg',
    dose: 40,
    doseUnit: 'mg',
    route: 'intravenous',
    frequency: 'BD',
    scheduledDate: today,
    scheduledTime: '20:00',
    scheduledDateTime: `${today}T20:00:00`,
    status: 'scheduled',
    requiresWitness: false,
    createdAt: new Date().toISOString(),
    createdBy: 'N001',
  },
  // Patient 2 - Marie Kabamba
  {
    id: '5',
    administrationNumber: 'MAR260005',
    admissionId: 'ADM002',
    encounterId: 'E002',
    patientId: 'P1002',
    patientName: 'Marie Kabamba',
    prescriptionId: 'RX002',
    prescriptionItemId: 'RXI004',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    medicationName: 'Céfazoline',
    dosage: '1g',
    dose: 1,
    doseUnit: 'g',
    route: 'intravenous',
    frequency: 'Q8H',
    scheduledDate: today,
    scheduledTime: '06:00',
    scheduledDateTime: `${today}T06:00:00`,
    status: 'given',
    administeredDateTime: `${today}T06:10:00`,
    administeredBy: 'N002',
    administeredByName: 'Inf. Paul',
    actualDose: 1,
    requiresWitness: false,
    createdAt: new Date().toISOString(),
    createdBy: 'N002',
  },
  {
    id: '6',
    administrationNumber: 'MAR260006',
    admissionId: 'ADM002',
    encounterId: 'E002',
    patientId: 'P1002',
    patientName: 'Marie Kabamba',
    prescriptionId: 'RX002',
    prescriptionItemId: 'RXI005',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    medicationName: 'Paracétamol',
    dosage: '1g',
    dose: 1,
    doseUnit: 'g',
    route: 'oral',
    frequency: 'Q6H',
    scheduledDate: today,
    scheduledTime: '14:00',
    scheduledDateTime: `${today}T14:00:00`,
    status: 'due',
    requiresWitness: false,
    createdAt: new Date().toISOString(),
    createdBy: 'N002',
  },
  {
    id: '7',
    administrationNumber: 'MAR260007',
    admissionId: 'ADM002',
    encounterId: 'E002',
    patientId: 'P1002',
    patientName: 'Marie Kabamba',
    prescriptionId: 'RX002',
    prescriptionItemId: 'RXI006',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    medicationName: 'Insuline Rapide',
    dosage: '10 UI',
    dose: 10,
    doseUnit: 'UI',
    route: 'subcutaneous',
    frequency: 'AC',
    scheduledDate: today,
    scheduledTime: '11:30',
    scheduledDateTime: `${today}T11:30:00`,
    status: 'overdue',
    requiresWitness: true,
    vitalsBefore: {
      bloodGlucose: 185,
      recordedAt: `${today}T11:25:00`,
      recordedBy: 'N001',
    },
    createdAt: new Date().toISOString(),
    createdBy: 'N002',
  },
  // Patient 3 - Pierre Kasongo
  {
    id: '8',
    administrationNumber: 'MAR260008',
    admissionId: 'ADM003',
    encounterId: 'E003',
    patientId: 'P1003',
    patientName: 'Pierre Kasongo',
    prescriptionId: 'RX003',
    prescriptionItemId: 'RXI007',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    medicationName: 'Amoxicilline',
    dosage: '1g',
    dose: 1,
    doseUnit: 'g',
    route: 'oral',
    frequency: 'TDS',
    scheduledDate: today,
    scheduledTime: '08:00',
    scheduledDateTime: `${today}T08:00:00`,
    status: 'refused',
    statusReason: 'Patient refuse de prendre le médicament',
    requiresWitness: false,
    createdAt: new Date().toISOString(),
    createdBy: 'N001',
  },
  {
    id: '9',
    administrationNumber: 'MAR260009',
    admissionId: 'ADM003',
    encounterId: 'E003',
    patientId: 'P1003',
    patientName: 'Pierre Kasongo',
    prescriptionId: 'RX003',
    prescriptionItemId: 'RXI008',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    medicationName: 'Azithromycine',
    dosage: '500mg',
    dose: 500,
    doseUnit: 'mg',
    route: 'oral',
    frequency: 'OD',
    scheduledDate: today,
    scheduledTime: '08:00',
    scheduledDateTime: `${today}T08:00:00`,
    status: 'held',
    statusReason: 'En attente des résultats de fonction hépatique',
    requiresWitness: false,
    createdAt: new Date().toISOString(),
    createdBy: 'N001',
  },
];

// ─── Section Header Component ────────────────────────────────
function SectionHeader({
  title,
  subtitle,
  icon,
  accentColor = colors.primary,
}: {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
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
});

// ─── Status Badge Component ──────────────────────────────────
function StatusBadge({ status }: { status: AdministrationStatus }) {
  const color = MedicationAdministrationUtils.getStatusColor(status);
  const labels: Record<AdministrationStatus, string> = {
    'scheduled': 'Planifié',
    'due': 'À Donner',
    'overdue': 'En Retard',
    'given': 'Administré',
    'held': 'Suspendu',
    'refused': 'Refusé',
    'omitted': 'Omis',
    'not_available': 'Indisponible',
    'cancelled': 'Annulé',
    'discontinued': 'Arrêté',
  };
  return (
    <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{labels[status]}</Text>
    </View>
  );
}

// ─── Route Badge Component ───────────────────────────────────
function RouteBadge({ route }: { route: MedicationRoute }) {
  const label = MedicationAdministrationUtils.getRouteLabel(route);
  const shortLabel = label.split(' ')[0];
  return (
    <View style={styles.routeBadge}>
      <Text style={styles.routeText}>{shortLabel}</Text>
    </View>
  );
}

// ─── Medication Card Component ───────────────────────────────
function MedicationCard({ 
  med,
  onAdminister,
  onHold,
  onRefuse,
}: { 
  med: typeof sampleMAR[0];
  onAdminister?: () => void;
  onHold?: () => void;
  onRefuse?: () => void;
}) {
  const isActionable = med.status === 'scheduled' || med.status === 'due' || med.status === 'overdue';
  const isOverdue = med.status === 'overdue';
  const isDue = med.status === 'due';

  return (
    <View
      style={[
        styles.medCard,
        isOverdue && { borderLeftColor: colors.error, borderLeftWidth: 4 },
        isDue && { borderLeftColor: colors.warning, borderLeftWidth: 4 },
      ]}
    >
      <View style={styles.medCardHeader}>
        <View style={styles.medCardTime}>
          <Ionicons name="time" size={14} color={isOverdue ? colors.error : colors.textSecondary} />
          <Text style={[styles.medCardTimeText, isOverdue && { color: colors.error }]}>
            {med.scheduledTime}
          </Text>
        </View>
        <StatusBadge status={med.status} />
      </View>

      <View style={styles.medCardBody}>
        <View style={styles.medCardRow}>
          <Text style={styles.medName}>{med.medicationName}</Text>
          <Text style={styles.medDosage}>{med.dosage}</Text>
        </View>
        <View style={styles.medCardRow}>
          <RouteBadge route={med.route} />
          <Text style={styles.medFrequency}>{med.frequency}</Text>
          {med.requiresWitness && (
            <View style={styles.witnessRequired}>
              <Ionicons name="people" size={12} color={colors.warning} />
              <Text style={styles.witnessRequiredText}>Témoin requis</Text>
            </View>
          )}
        </View>
      </View>

      {med.status === 'given' && med.administeredByName && (
        <View style={styles.administeredInfo}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <Text style={styles.administeredText}>
            Administré par {med.administeredByName}
            {med.witnessName && ` (témoin: ${med.witnessName})`}
            {' à '}
            {new Date(med.administeredDateTime!).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      )}

      {(med.status === 'held' || med.status === 'refused') && med.statusReason && (
        <View style={[styles.reasonInfo, { backgroundColor: med.status === 'refused' ? colors.errorLight : colors.warningLight }]}>
          <Ionicons 
            name={med.status === 'refused' ? 'close-circle' : 'pause-circle'} 
            size={14} 
            color={med.status === 'refused' ? colors.error : colors.warning} 
          />
          <Text style={[styles.reasonText, { color: med.status === 'refused' ? colors.error : colors.warning }]}>
            {med.statusReason}
          </Text>
        </View>
      )}

      {med.vitalsBefore && (
        <View style={styles.vitalsInfo}>
          <Ionicons name="analytics" size={12} color={colors.info} />
          <Text style={styles.vitalsText}>
            Glycémie: {med.vitalsBefore.bloodGlucose} mg/dL
          </Text>
        </View>
      )}

      {isActionable && (
        <View style={styles.medCardActions}>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.actionBtnGiven]} 
            onPress={onAdminister}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark" size={16} color="#FFF" />
            <Text style={styles.actionBtnText}>Administrer</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.actionBtnHeld]} 
            onPress={onHold}
            activeOpacity={0.7}
          >
            <Ionicons name="pause" size={16} color={colors.warning} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.actionBtnRefused]} 
            onPress={onRefuse}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Patient MAR Section ─────────────────────────────────────
function PatientMARSection({ 
  patient, 
  medications 
}: { 
  patient: typeof samplePatients[0];
  medications: typeof sampleMAR;
}) {
  const [expanded, setExpanded] = useState(true);
  
  const stats = {
    total: medications.length,
    given: medications.filter(m => m.status === 'given').length,
    pending: medications.filter(m => ['scheduled', 'due'].includes(m.status)).length,
    overdue: medications.filter(m => m.status === 'overdue').length,
    held: medications.filter(m => ['held', 'refused', 'omitted'].includes(m.status)).length,
  };

  const complianceRate = stats.total > 0 ? Math.round((stats.given / stats.total) * 100) : 0;

  return (
    <View style={styles.patientSection}>
      <TouchableOpacity 
        style={styles.patientHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.patientInfo}>
          <View style={styles.patientAvatar}>
            <Text style={styles.patientAvatarText}>
              {patient.name.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
          <View>
            <Text style={styles.patientName}>{patient.name}</Text>
            <Text style={styles.patientRoom}>Chambre: {patient.room}</Text>
          </View>
        </View>

        <View style={styles.patientStats}>
          <View style={[styles.patientStatBadge, { backgroundColor: colors.successLight }]}>
            <Text style={[styles.patientStatValue, { color: colors.success }]}>{stats.given}</Text>
            <Text style={styles.patientStatLabel}>✓</Text>
          </View>
          {stats.overdue > 0 && (
            <View style={[styles.patientStatBadge, { backgroundColor: colors.errorLight }]}>
              <Text style={[styles.patientStatValue, { color: colors.error }]}>{stats.overdue}</Text>
              <Text style={styles.patientStatLabel}>!</Text>
            </View>
          )}
          {stats.pending > 0 && (
            <View style={[styles.patientStatBadge, { backgroundColor: colors.warningLight }]}>
              <Text style={[styles.patientStatValue, { color: colors.warning }]}>{stats.pending}</Text>
              <Text style={styles.patientStatLabel}>⏱</Text>
            </View>
          )}
          <Ionicons 
            name={expanded ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color={colors.textSecondary} 
          />
        </View>
      </TouchableOpacity>

      {/* Compliance Bar */}
      <View style={styles.complianceBar}>
        <View style={[styles.complianceFill, { width: `${complianceRate}%` }]} />
      </View>

      {/* Medications List */}
      {expanded && (
        <View style={styles.medicationsList}>
          {medications.map((med) => (
            <MedicationCard key={med.id} med={med} />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────────
export function MedicationAdministrationScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState<AdministrationStatus | 'all'>('all');

  // Group medications by patient
  const patientMedications = samplePatients.map(patient => ({
    patient,
    medications: sampleMAR.filter(m => m.patientId === patient.id),
  }));

  // Calculate overall stats
  const allMeds = sampleMAR;
  const stats = {
    total: allMeds.length,
    given: allMeds.filter(m => m.status === 'given').length,
    due: allMeds.filter(m => m.status === 'due').length,
    overdue: allMeds.filter(m => m.status === 'overdue').length,
    scheduled: allMeds.filter(m => m.status === 'scheduled').length,
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>💊 Administration Médicaments</Text>
          <Text style={styles.headerSubtitle}>Feuille d'administration (MAR)</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.printBtn} activeOpacity={0.7}>
            <Ionicons name="print" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.refreshBtn} activeOpacity={0.7}>
            <Ionicons name="refresh" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Navigation */}
      <View style={styles.dateNav}>
        <TouchableOpacity style={styles.dateNavBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.dateNavCenter}>
          <Text style={styles.dateNavText}>
            {selectedDate.toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long' 
            })}
          </Text>
          <View style={styles.todayBadge}>
            <Text style={styles.todayBadgeText}>Aujourd'hui</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.dateNavBtn}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* ══════ SECTION: Statistiques ══════ */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.successLight }]}>
          <Ionicons name="checkmark-circle" size={24} color={colors.success} />
          <Text style={styles.statValue}>{stats.given}</Text>
          <Text style={styles.statLabel}>Administrés</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.warningLight }]}>
          <Ionicons name="time" size={24} color={colors.warning} />
          <Text style={styles.statValue}>{stats.due}</Text>
          <Text style={styles.statLabel}>À Donner</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.errorLight }]}>
          <Ionicons name="alert-circle" size={24} color={colors.error} />
          <Text style={styles.statValue}>{stats.overdue}</Text>
          <Text style={styles.statLabel}>En Retard</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.infoLight }]}>
          <Ionicons name="calendar" size={24} color={colors.info} />
          <Text style={styles.statValue}>{stats.scheduled}</Text>
          <Text style={styles.statLabel}>Planifiés</Text>
        </View>
      </View>

      {/* ══════ SECTION: Filtres ══════ */}
      <SectionHeader
        title="Filtrer par Statut"
        icon="filter"
        accentColor={colors.secondary}
      />
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterScrollContent}
      >
        {[
          { key: 'all', label: 'Tous', color: colors.primary },
          { key: 'due', label: 'À Donner', color: colors.warning },
          { key: 'overdue', label: 'En Retard', color: colors.error },
          { key: 'given', label: 'Administrés', color: colors.success },
          { key: 'held', label: 'Suspendus', color: '#8B5CF6' },
          { key: 'refused', label: 'Refusés', color: '#EC4899' },
        ].map((filter) => {
          const isSelected = filterStatus === filter.key;
          return (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                isSelected && { backgroundColor: filter.color, borderColor: filter.color },
              ]}
              onPress={() => setFilterStatus(filter.key as any)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, isSelected && { color: '#FFF' }]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ══════ SECTION: Patients ══════ */}
      <SectionHeader
        title="Patients"
        subtitle={`${samplePatients.length} patients hospitalisés`}
        icon="people"
        accentColor={colors.info}
      />

      <View style={styles.patientsList}>
        {patientMedications.map(({ patient, medications }) => (
          <PatientMARSection 
            key={patient.id} 
            patient={patient} 
            medications={medications} 
          />
        ))}
      </View>

      {/* ══════ SECTION: Légende ══════ */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Légende des Routes:</Text>
        <View style={styles.legendRow}>
          {[
            { route: 'PO', label: 'Oral' },
            { route: 'IV', label: 'Intraveineux' },
            { route: 'SC', label: 'Sous-cutané' },
            { route: 'IM', label: 'Intramusculaire' },
            { route: 'TOP', label: 'Topique' },
          ].map((item) => (
            <View key={item.route} style={styles.legendItem}>
              <View style={styles.legendBadge}>
                <Text style={styles.legendBadgeText}>{item.route}</Text>
              </View>
              <Text style={styles.legendItemText}>{item.label}</Text>
            </View>
          ))}
        </View>
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
    marginBottom: 20,
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  printBtn: {
    padding: 10,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight || '#E0E7FF',
  },
  refreshBtn: {
    padding: 10,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceVariant,
  },

  // Date Navigation
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 12,
    marginBottom: 20,
    ...shadows.sm,
  },
  dateNavBtn: {
    padding: 8,
  },
  dateNavCenter: {
    alignItems: 'center',
  },
  dateNavText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  todayBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginTop: 4,
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
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
  },

  // Filter
  filterScroll: {
    marginBottom: 24,
  },
  filterScrollContent: {
    gap: 8,
    paddingRight: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },

  // Patients List
  patientsList: {
    gap: 16,
  },
  patientSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  patientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  patientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  patientRoom: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  patientStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  patientStatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  patientStatValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  patientStatLabel: {
    fontSize: 10,
  },
  complianceBar: {
    height: 4,
    backgroundColor: colors.surfaceVariant,
  },
  complianceFill: {
    height: '100%',
    backgroundColor: colors.success,
  },
  medicationsList: {
    padding: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },

  // Medication Card
  medCard: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: 12,
  },
  medCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  medCardTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  medCardTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  medCardBody: {
    gap: 6,
  },
  medCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  medName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  medDosage: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  medFrequency: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  witnessRequired: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.warningLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  witnessRequiredText: {
    fontSize: 10,
    color: colors.warning,
    fontWeight: '500',
  },
  administeredInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  administeredText: {
    fontSize: 11,
    color: colors.success,
    flex: 1,
  },
  reasonInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    padding: 8,
    borderRadius: borderRadius.sm,
  },
  reasonText: {
    fontSize: 11,
    flex: 1,
  },
  vitalsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: colors.infoLight,
    padding: 6,
    borderRadius: borderRadius.sm,
  },
  vitalsText: {
    fontSize: 11,
    color: colors.info,
  },
  medCardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
  },
  actionBtnGiven: {
    flex: 1,
    backgroundColor: colors.success,
  },
  actionBtnHeld: {
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  actionBtnRefused: {
    backgroundColor: colors.errorLight,
    borderWidth: 1,
    borderColor: colors.error,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },

  // Badges
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  routeBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  routeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },

  // Legend
  legend: {
    marginTop: 24,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 16,
  },
  legendTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  legendBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  legendItemText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});

export default MedicationAdministrationScreen;
