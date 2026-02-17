import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/theme';
import DatabaseService from '../../../services/DatabaseService';
import { Patient, PatientUtils, MedicalRecord, VitalSigns } from '../../../models/Patient';
import { Encounter, EncounterUtils } from '../../../models/Encounter';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

type DetailTab = 'overview' | 'encounters' | 'records' | 'prescriptions';

interface Props {
  patientId: string;
  onBack?: () => void;
  onNewEncounter?: (patient: Patient) => void;
  onEditPatient?: (patient: Patient) => void;
  onGoToTriage?: (patient: Patient, encounterId: string) => void;
  onGoToConsultation?: (patient: Patient, encounterId: string) => void;
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export function PatientDetailScreen({ patientId, onBack, onNewEncounter, onEditPatient, onGoToTriage, onGoToConsultation }: Props) {
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const db = DatabaseService.getInstance();
      const p = await db.getPatient(patientId);
      if (p) {
        setPatient(p);
        const enc = await db.getEncountersByPatient(patientId);
        setEncounters(enc);
        const records = await db.getMedicalRecordsByPatient(patientId);
        setMedicalRecords(records);
      }
    } catch (err) {
      console.error('Patient detail load error:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { loadData(); }, [loadData]);

  const activeEncounters = useMemo(() => encounters.filter(e => EncounterUtils.isActive(e)), [encounters]);
  const pastEncounters = useMemo(() => encounters.filter(e => !EncounterUtils.isActive(e)), [encounters]);

  // ─── Create encounter + draft invoice ─────────────────────
  const createEncounterWithBilling = async (
    encounterType: 'outpatient' | 'consultation',
    initialStatus: 'registered' | 'in_consultation',
    priority: 'routine' | 'semi_urgent' | 'urgent' | 'emergency',
  ): Promise<{ encounter: Encounter; invoiceId: string } | null> => {
    if (!patient) return null;
    setActionLoading(true);
    try {
      const db = DatabaseService.getInstance();
      const license = await db.getLicenseByKey('TRIAL-HK2024XY-Z9M3');
      if (!license) throw new Error('License not found');
      const org = await db.getOrganization(license.organizationId);
      if (!org) throw new Error('Organization not found');

      // 1. Create the encounter
      const encounter = await db.createEncounter({
        patientId: patient.id,
        organizationId: org.id,
        facilityId: 'facility-main',
        type: encounterType,
        status: initialStatus,
        arrivalDate: new Date().toISOString(),
        chiefComplaint: '',
        priority,
      });

      // 2. Create a draft invoice linked to the encounter
      const invoice = await db.createHospitalInvoice({
        encounterId: encounter.id,
        patientId: patient.id,
        organizationId: org.id,
        facilityId: 'facility-main',
        status: 'draft',
        type: encounterType === 'consultation' ? 'consultation_only' : 'outpatient',
        currency: 'CDF',
        taxRate: 0,
        notes: `Facture auto-créée — ${encounterType === 'consultation' ? 'Consultation' : 'Triage'} pour ${PatientUtils.getFullName(patient)}`,
      });

      // 3. Auto-add the initial service line item
      const serviceName = initialStatus === 'in_consultation'
        ? 'Consultation Médicale'
        : 'Triage / Évaluation Infirmière';
      const servicePrice = initialStatus === 'in_consultation' ? 15000 : 5000; // CDF
      await db.addInvoiceItem(invoice.id, {
        serviceId: `svc-${initialStatus}`,
        category: initialStatus === 'in_consultation' ? 'consultation' : 'nursing',
        description: serviceName,
        quantity: 1,
        unitPrice: servicePrice,
        totalPrice: servicePrice,
        netPrice: servicePrice,
        serviceDate: new Date().toISOString().split('T')[0],
      });

      // 4. Update patient last visit
      await db.updatePatient(patient.id, {
        lastVisit: new Date().toISOString().split('T')[0],
      });

      console.log(`✅ Encounter ${encounter.encounterNumber} + Invoice ${invoice.invoiceNumber} created`);
      await loadData(); // Refresh
      return { encounter, invoiceId: invoice.id };
    } catch (err) {
      console.error('Error creating encounter with billing:', err);
      Alert.alert('Erreur', 'Impossible de créer la visite. Veuillez réessayer.');
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendToTriage = async () => {
    if (!patient) return;
    const result = await createEncounterWithBilling('outpatient', 'registered', 'routine');
    if (result) {
      Alert.alert(
        '✅ Patient envoyé au Triage',
        `Visite ${result.encounter.encounterNumber} créée.\nFacture brouillon initiée.`,
        [
          { text: 'OK', onPress: () => onGoToTriage?.(patient, result.encounter.id) },
        ],
      );
    }
  };

  const handleSendToConsultation = async () => {
    if (!patient) return;
    const result = await createEncounterWithBilling('consultation', 'in_consultation', 'routine');
    if (result) {
      Alert.alert(
        '✅ Patient envoyé en Consultation',
        `Visite ${result.encounter.encounterNumber} créée.\nFacture brouillon initiée.`,
        [
          { text: 'OK', onPress: () => onGoToConsultation?.(patient, result.encounter.id) },
        ],
      );
    }
  };

  // ─── Loading / Not found ──────────────────────────────────

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.loadingText}>Chargement du dossier patient…</Text>
      </View>
    );
  }

  if (!patient) {
    return (
      <View style={s.center}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={s.errorText}>Patient introuvable</Text>
        <TouchableOpacity style={s.backBtnFallback} onPress={onBack}>
          <Text style={s.backBtnFallbackText}>Retour à la liste</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const fullName = PatientUtils.getFullName(patient);
  const age = PatientUtils.getAge(patient);
  const genderLabel = patient.gender === 'male' ? 'Homme' : patient.gender === 'female' ? 'Femme' : 'Autre';
  const genderColor = patient.gender === 'male' ? '#3B82F6' : patient.gender === 'female' ? '#EC4899' : '#8B5CF6';
  const initials = `${patient.firstName[0]}${patient.lastName[0]}`.toUpperCase();
  const registrationDateFmt = new Date(patient.registrationDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const lastVisitFmt = patient.lastVisit
    ? new Date(patient.lastVisit).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  // ─── Render ───────────────────────────────────────────────

  return (
    <View style={s.root}>
      {/* ── Top Bar ─────────────────────────────────────── */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <Text style={s.backBtnLabel}>Patients</Text>
        </TouchableOpacity>
        <View style={s.topActions}>
          <TouchableOpacity style={s.actionBtnOutline} onPress={() => onEditPatient?.(patient)} activeOpacity={0.7}>
            <Ionicons name="create-outline" size={16} color={colors.primary} />
            <Text style={s.actionBtnOutlineText}>Modifier</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtnFilled} onPress={() => onNewEncounter?.(patient)} activeOpacity={0.7}>
            <Ionicons name="add-circle-outline" size={16} color="#FFF" />
            <Text style={s.actionBtnFilledText}>Nouvelle Visite</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        {/* ── Patient Header Card ───────────────────────── */}
        <View style={s.headerCard}>
          <View style={s.headerRow}>
            {/* Avatar */}
            <View style={[s.avatar, { backgroundColor: genderColor + '18' }]}>
              <Text style={[s.avatarText, { color: genderColor }]}>{initials}</Text>
            </View>

            {/* Name / Meta */}
            <View style={s.headerInfo}>
              <Text style={s.patientName}>{fullName}</Text>
              <View style={s.metaRow}>
                <MetaChip icon="id-card-outline" text={patient.patientNumber} />
                <MetaChip icon="calendar-outline" text={`${age} ans`} />
                <MetaChip icon="person-outline" text={genderLabel} color={genderColor} />
                <StatusBadge status={patient.status} />
              </View>
            </View>
          </View>

          {/* Quick stats row */}
          <View style={s.quickStatsRow}>
            <QuickStat label="Enregistré le" value={registrationDateFmt} icon="document-text-outline" />
            <QuickStat label="Dernière visite" value={lastVisitFmt} icon="time-outline" />
            <QuickStat label="Visites" value={`${encounters.length}`} icon="pulse-outline" />
            <QuickStat label="Actives" value={`${activeEncounters.length}`} icon="alert-circle-outline" color={activeEncounters.length > 0 ? '#EF4444' : colors.textSecondary} />
          </View>

          {/* ── Triage / Consultation Actions ─────────── */}
          <View style={s.workflowActions}>
            <TouchableOpacity
              style={[s.workflowBtn, s.workflowBtnTriage]}
              onPress={handleSendToTriage}
              activeOpacity={0.7}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="fitness-outline" size={18} color="#FFF" />
                  <View style={s.workflowBtnContent}>
                    <Text style={s.workflowBtnLabel}>Envoyer au Triage</Text>
                    <Text style={s.workflowBtnSub}>Évaluation infirmière + facturation</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.7)" />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.workflowBtn, s.workflowBtnConsult]}
              onPress={handleSendToConsultation}
              activeOpacity={0.7}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="medkit-outline" size={18} color="#FFF" />
                  <View style={s.workflowBtnContent}>
                    <Text style={s.workflowBtnLabel}>Envoyer en Consultation</Text>
                    <Text style={s.workflowBtnSub}>Consultation médicale + facturation</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.7)" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Active Encounters Alert ───────────────────── */}
        {activeEncounters.length > 0 && (
          <View style={s.alertBanner}>
            <Ionicons name="pulse" size={18} color="#EF4444" />
            <Text style={s.alertText}>
              {activeEncounters.length} visite{activeEncounters.length > 1 ? 's' : ''} en cours
            </Text>
            {activeEncounters.map(enc => (
              <View key={enc.id} style={s.alertChip}>
                <View style={[s.alertDot, { backgroundColor: EncounterUtils.getStatusColor(enc.status) }]} />
                <Text style={s.alertChipText}>
                  {enc.encounterNumber} — {EncounterUtils.getStatusLabel(enc.status)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Detail Tabs ───────────────────────────────── */}
        <View style={s.tabBar}>
          {([
            { key: 'overview', label: 'Aperçu', icon: 'person-circle-outline' },
            { key: 'encounters', label: `Visites (${encounters.length})`, icon: 'pulse-outline' },
            { key: 'records', label: `Dossier (${medicalRecords.length})`, icon: 'document-text-outline' },
          ] as const).map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[s.tabItem, activeTab === tab.key && s.tabItemActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon as any}
                size={16}
                color={activeTab === tab.key ? colors.primary : colors.textSecondary}
              />
              <Text style={[s.tabLabel, activeTab === tab.key && s.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Tab Content ───────────────────────────────── */}
        {activeTab === 'overview' && <OverviewTab patient={patient} />}
        {activeTab === 'encounters' && <EncountersTab active={activeEncounters} past={pastEncounters} />}
        {activeTab === 'records' && <MedicalRecordsTab records={medicalRecords} />}
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Micro-Components
// ═══════════════════════════════════════════════════════════════

function MetaChip({ icon, text, color }: { icon: any; text: string; color?: string }) {
  return (
    <View style={s.metaChip}>
      <Ionicons name={icon} size={13} color={color || colors.textSecondary} />
      <Text style={[s.metaChipText, color ? { color } : {}]}>{text}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: Patient['status'] }) {
  const cfg = {
    active: { label: 'Actif', bg: '#DCFCE7', fg: '#16A34A' },
    inactive: { label: 'Inactif', bg: '#FEE2E2', fg: '#DC2626' },
    deceased: { label: 'Décédé', bg: '#F1F5F9', fg: '#64748B' },
  }[status];
  return (
    <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
      <Text style={[s.statusBadgeText, { color: cfg.fg }]}>{cfg.label}</Text>
    </View>
  );
}

function QuickStat({ label, value, icon, color }: { label: string; value: string; icon: any; color?: string }) {
  return (
    <View style={s.quickStat}>
      <Ionicons name={icon} size={16} color={color || colors.textTertiary} />
      <Text style={[s.quickStatValue, color ? { color } : {}]}>{value}</Text>
      <Text style={s.quickStatLabel}>{label}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Overview Tab
// ═══════════════════════════════════════════════════════════════

function OverviewTab({ patient }: { patient: Patient }) {
  return (
    <View style={s.tabContent}>
      <View style={s.columnsRow}>
        {/* Left column */}
        <View style={s.column}>
          {/* Personal info */}
          <SectionCard title="Informations Personnelles" icon="person-outline">
            <InfoRow label="Nom complet" value={PatientUtils.getFullName(patient)} />
            <InfoRow label="Date de naissance" value={new Date(patient.dateOfBirth).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} />
            <InfoRow label="Sexe" value={patient.gender === 'male' ? 'Homme' : patient.gender === 'female' ? 'Femme' : 'Autre'} />
            {patient.nationalId && <InfoRow label="N° d'identité" value={patient.nationalId} />}
            {patient.passportNumber && <InfoRow label="N° passeport" value={patient.passportNumber} />}
          </SectionCard>

          {/* Contact */}
          <SectionCard title="Contact" icon="call-outline">
            <InfoRow label="Téléphone" value={patient.phone || '—'} />
            <InfoRow label="Email" value={patient.email || '—'} />
            <InfoRow label="Adresse" value={patient.address || '—'} />
            <InfoRow label="Ville" value={patient.city || '—'} />
          </SectionCard>

          {/* Emergency contact */}
          <SectionCard title="Contact d'Urgence" icon="alert-circle-outline">
            <InfoRow label="Nom" value={patient.emergencyContactName || '—'} />
            <InfoRow label="Téléphone" value={patient.emergencyContactPhone || '—'} />
            <InfoRow label="Relation" value={patient.emergencyContactRelation || '—'} />
          </SectionCard>
        </View>

        {/* Right column */}
        <View style={s.column}>
          {/* Medical info */}
          <SectionCard title="Informations Médicales" icon="medkit-outline">
            <InfoRow label="Groupe sanguin" value={patient.bloodType || '—'} highlight={!!patient.bloodType} />
          </SectionCard>

          {/* Allergies */}
          <SectionCard title="Allergies" icon="warning-outline" badge={patient.allergies.length} badgeColor="#D97706">
            {patient.allergies.length > 0 ? (
              <View style={s.tagList}>
                {patient.allergies.map((a, i) => (
                  <View key={i} style={[s.tag, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="warning" size={11} color="#D97706" />
                    <Text style={[s.tagText, { color: '#92400E' }]}>{a}</Text>
                  </View>
                ))}
              </View>
            ) : <Text style={s.emptyNote}>Aucune allergie connue</Text>}
          </SectionCard>

          {/* Chronic conditions */}
          <SectionCard title="Conditions Chroniques" icon="fitness-outline" badge={patient.chronicConditions.length} badgeColor="#EF4444">
            {patient.chronicConditions.length > 0 ? (
              <View style={s.tagList}>
                {patient.chronicConditions.map((c, i) => (
                  <View key={i} style={[s.tag, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={[s.tagText, { color: '#991B1B' }]}>{c}</Text>
                  </View>
                ))}
              </View>
            ) : <Text style={s.emptyNote}>Aucune condition chronique</Text>}
          </SectionCard>

          {/* Medications */}
          <SectionCard title="Médicaments en Cours" icon="medical-outline" badge={patient.currentMedications.length} badgeColor={colors.info}>
            {patient.currentMedications.length > 0 ? (
              <View style={s.tagList}>
                {patient.currentMedications.map((m, i) => (
                  <View key={i} style={[s.tag, { backgroundColor: colors.primaryFaded }]}>
                    <Ionicons name="medical" size={11} color={colors.primary} />
                    <Text style={[s.tagText, { color: colors.primaryDark }]}>{m}</Text>
                  </View>
                ))}
              </View>
            ) : <Text style={s.emptyNote}>Aucun médicament en cours</Text>}
          </SectionCard>

          {/* Insurance */}
          <SectionCard title="Assurance" icon="shield-checkmark-outline">
            <InfoRow label="Assureur" value={patient.insuranceProvider || '—'} />
            <InfoRow label="N° police" value={patient.insuranceNumber || '—'} />
          </SectionCard>
        </View>
      </View>

      {/* Notes */}
      {patient.notes && (
        <SectionCard title="Notes" icon="create-outline">
          <Text style={s.notesBody}>{patient.notes}</Text>
        </SectionCard>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Encounters Tab
// ═══════════════════════════════════════════════════════════════

function EncountersTab({ active, past }: { active: Encounter[]; past: Encounter[] }) {
  return (
    <View style={s.tabContent}>
      {/* Active encounters */}
      {active.length > 0 && (
        <>
          <Text style={s.sectionTitle}>En cours ({active.length})</Text>
          {active.map(enc => <EncounterCard key={enc.id} encounter={enc} isActive />)}
        </>
      )}

      {/* Past encounters */}
      <Text style={[s.sectionTitle, { marginTop: active.length > 0 ? 20 : 0 }]}>
        Historique ({past.length})
      </Text>
      {past.length === 0 ? (
        <View style={s.emptyBlock}>
          <Ionicons name="pulse-outline" size={36} color={colors.textTertiary} />
          <Text style={s.emptyBlockText}>Aucune visite passée</Text>
        </View>
      ) : (
        past.map(enc => <EncounterCard key={enc.id} encounter={enc} />)
      )}
    </View>
  );
}

function EncounterCard({ encounter, isActive }: { encounter: Encounter; isActive?: boolean }) {
  const arrivalFmt = new Date(encounter.arrivalDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const dischargeFmt = encounter.dischargeDate
    ? new Date(encounter.dischargeDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;
  const statusColor = EncounterUtils.getStatusColor(encounter.status);
  const priorityColor = EncounterUtils.getPriorityColor(encounter.priority);

  return (
    <View style={[s.encounterCard, isActive && { borderLeftWidth: 4, borderLeftColor: statusColor }]}>
      <View style={s.encounterHeader}>
        <View style={s.encounterHeaderLeft}>
          <Ionicons name={EncounterUtils.getTypeIcon(encounter.type) as any} size={20} color={statusColor} />
          <View>
            <Text style={s.encounterNumber}>{encounter.encounterNumber}</Text>
            <Text style={s.encounterType}>{EncounterUtils.getTypeLabel(encounter.type)}</Text>
          </View>
        </View>
        <View style={s.encounterBadgeRow}>
          {/* Priority */}
          <View style={[s.encounterBadge, { backgroundColor: priorityColor + '14' }]}>
            <View style={[s.badgeDot, { backgroundColor: priorityColor }]} />
            <Text style={[s.encounterBadgeText, { color: priorityColor }]}>{EncounterUtils.getPriorityLabel(encounter.priority)}</Text>
          </View>
          {/* Status */}
          <View style={[s.encounterBadge, { backgroundColor: statusColor + '14' }]}>
            <Text style={[s.encounterBadgeText, { color: statusColor, fontWeight: '600' }]}>{EncounterUtils.getStatusLabel(encounter.status)}</Text>
          </View>
        </View>
      </View>

      {/* Complaint */}
      <View style={s.encounterBody}>
        <Text style={s.complainLabel}>Motif:</Text>
        <Text style={s.complainText}>{encounter.chiefComplaint}</Text>
      </View>

      {/* Dates */}
      <View style={s.encounterFooter}>
        <View style={s.encDateRow}>
          <Ionicons name="log-in-outline" size={13} color={colors.textTertiary} />
          <Text style={s.encDateText}>Arrivée: {arrivalFmt}</Text>
        </View>
        {dischargeFmt && (
          <View style={s.encDateRow}>
            <Ionicons name="log-out-outline" size={13} color={colors.textTertiary} />
            <Text style={s.encDateText}>Sortie: {dischargeFmt}</Text>
          </View>
        )}
        {encounter.departmentId && (
          <View style={s.encDateRow}>
            <Ionicons name="business-outline" size={12} color={colors.textTertiary} />
            <Text style={s.encDateText}>Service: {encounter.departmentId}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Medical Records Tab
// ═══════════════════════════════════════════════════════════════

function MedicalRecordsTab({ records }: { records: MedicalRecord[] }) {
  if (records.length === 0) {
    return (
      <View style={s.tabContent}>
        <View style={s.emptyBlock}>
          <Ionicons name="document-text-outline" size={48} color={colors.textTertiary} />
          <Text style={s.emptyBlockText}>Aucun dossier médical</Text>
          <Text style={s.emptyBlockSub}>Les notes de consultation apparaîtront ici</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.tabContent}>
      {records.map(rec => (
        <View key={rec.id} style={s.recordCard}>
          <View style={s.recordHeader}>
            <Ionicons name="document-text" size={18} color={colors.primary} />
            <Text style={s.recordDate}>
              {new Date(rec.visitDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </Text>
          </View>

          <View style={s.recordBody}>
            <InfoRow label="Plainte principale" value={rec.chiefComplaint} />
            {rec.symptoms.length > 0 && (
              <View style={{ marginTop: 6 }}>
                <Text style={s.recLabel}>Symptômes:</Text>
                <View style={s.tagList}>
                  {rec.symptoms.map((sym, i) => (
                    <View key={i} style={[s.tag, { backgroundColor: '#FEF3C7' }]}>
                      <Text style={[s.tagText, { color: '#92400E' }]}>{sym}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {rec.diagnosis && <InfoRow label="Diagnostic" value={rec.diagnosis} />}
            {rec.treatment && <InfoRow label="Traitement" value={rec.treatment} />}
            {rec.medications.length > 0 && (
              <View style={{ marginTop: 6 }}>
                <Text style={s.recLabel}>Médicaments:</Text>
                <View style={s.tagList}>
                  {rec.medications.map((med, i) => (
                    <View key={i} style={[s.tag, { backgroundColor: colors.primaryFaded }]}>
                      <Ionicons name="medical" size={11} color={colors.primary} />
                      <Text style={[s.tagText, { color: colors.primaryDark }]}>{med}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Vitals if present */}
          {rec.vitals && <VitalsDisplay vitals={rec.vitals} />}

          {rec.notes && (
            <View style={s.recordNotes}>
              <Text style={s.recLabel}>Notes:</Text>
              <Text style={s.recordNotesText}>{rec.notes}</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

function VitalsDisplay({ vitals }: { vitals: VitalSigns }) {
  const items: { label: string; value: string; icon: any; color: string }[] = [];
  if (vitals.temperature) items.push({ label: 'Temp.', value: `${vitals.temperature}°C`, icon: 'thermometer-outline', color: '#EF4444' });
  if (vitals.bloodPressureSystolic && vitals.bloodPressureDiastolic) items.push({ label: 'TA', value: `${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic}`, icon: 'heart-outline', color: '#DC2626' });
  if (vitals.heartRate) items.push({ label: 'FC', value: `${vitals.heartRate} bpm`, icon: 'pulse-outline', color: '#8B5CF6' });
  if (vitals.oxygenSaturation) items.push({ label: 'SpO₂', value: `${vitals.oxygenSaturation}%`, icon: 'water-outline', color: '#3B82F6' });
  if (vitals.respiratoryRate) items.push({ label: 'FR', value: `${vitals.respiratoryRate}/min`, icon: 'cloud-outline', color: '#059669' });
  if (vitals.weight) items.push({ label: 'Poids', value: `${vitals.weight} kg`, icon: 'scale-outline', color: '#D97706' });

  if (items.length === 0) return null;

  return (
    <View style={s.vitalsRow}>
      {items.map((it, i) => (
        <View key={i} style={s.vitalChip}>
          <Ionicons name={it.icon} size={14} color={it.color} />
          <View>
            <Text style={[s.vitalValue, { color: it.color }]}>{it.value}</Text>
            <Text style={s.vitalLabel}>{it.label}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Shared sub-components
// ═══════════════════════════════════════════════════════════════

function SectionCard({ title, icon, badge, badgeColor, children }: {
  title: string; icon: any; badge?: number; badgeColor?: string; children: React.ReactNode;
}) {
  return (
    <View style={s.sectionCard}>
      <View style={s.sectionCardHeader}>
        <Ionicons name={icon} size={16} color={colors.primary} />
        <Text style={s.sectionCardTitle}>{title}</Text>
        {badge != null && badge > 0 && (
          <View style={[s.badge, { backgroundColor: (badgeColor || colors.primary) + '18' }]}>
            <Text style={[s.badgeText, { color: badgeColor || colors.primary }]}>{badge}</Text>
          </View>
        )}
      </View>
      {children}
    </View>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={[s.infoValue, highlight && s.infoValueHighlight]}>{value}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.textSecondary },
  errorText: { fontSize: 16, fontWeight: '600', color: colors.error, marginTop: 12 },
  backBtnFallback: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 8 },
  backBtnFallbackText: { color: '#FFF', fontWeight: '600' },

  // Top Bar
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 12,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.outline,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backBtnLabel: { fontSize: 14, fontWeight: '600', color: colors.primary },
  topActions: { flexDirection: 'row', gap: 8 },
  actionBtnOutline: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: colors.primary,
  },
  actionBtnOutlineText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  actionBtnFilled: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    backgroundColor: colors.primary,
  },
  actionBtnFilledText: { fontSize: 13, fontWeight: '600', color: '#FFF' },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 24, gap: 16 },

  // Header Card
  headerCard: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 20,
    borderWidth: 1, borderColor: colors.outline,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontWeight: '700' },
  headerInfo: { flex: 1 },
  patientName: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 6 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaChipText: { fontSize: 13, color: colors.textSecondary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },

  quickStatsRow: {
    flexDirection: 'row', gap: 12,
    borderTopWidth: 1, borderTopColor: colors.outlineVariant, paddingTop: 14,
  },
  quickStat: { flex: 1, alignItems: 'center', gap: 4 },
  quickStatValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  quickStatLabel: { fontSize: 11, color: colors.textTertiary },

  // Workflow actions (Triage / Consultation buttons)
  workflowActions: {
    flexDirection: 'row', gap: 12,
    borderTopWidth: 1, borderTopColor: colors.outlineVariant, paddingTop: 14, marginTop: 14,
  },
  workflowBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12,
  },
  workflowBtnTriage: {
    backgroundColor: '#D97706', // amber-600
  },
  workflowBtnConsult: {
    backgroundColor: '#2563EB', // blue-600
  },
  workflowBtnContent: { flex: 1 },
  workflowBtnLabel: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  workflowBtnSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 },

  // Alert banner
  alertBanner: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8,
    backgroundColor: '#FEE2E2', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#FECACA',
  },
  alertText: { fontSize: 14, fontWeight: '600', color: '#DC2626' },
  alertChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  alertDot: { width: 6, height: 6, borderRadius: 3 },
  alertChipText: { fontSize: 12, color: '#991B1B' },

  // Tabs
  tabBar: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: 10, borderWidth: 1, borderColor: colors.outline,
    overflow: 'hidden',
  },
  tabItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12,
  },
  tabItemActive: { backgroundColor: colors.primaryFaded, borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabLabel: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  tabLabelActive: { color: colors.primary, fontWeight: '600' },

  // Tab content
  tabContent: { gap: 12 },

  // Columns
  columnsRow: { flexDirection: isDesktop ? 'row' : 'column', gap: 16 },
  column: { flex: 1, gap: 12 },

  // Section card
  sectionCard: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: colors.outline,
  },
  sectionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionCardTitle: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 },
  badge: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  // Info rows
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
  infoLabel: { fontSize: 13, color: colors.textSecondary },
  infoValue: { fontSize: 13, fontWeight: '500', color: colors.text },
  infoValueHighlight: { fontWeight: '700', color: '#EF4444' },

  // Tags
  tagList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tagText: { fontSize: 12, fontWeight: '500' },

  emptyNote: { fontSize: 13, color: colors.textTertiary, fontStyle: 'italic' },
  notesBody: { fontSize: 13, color: colors.text, lineHeight: 20 },

  // Section titles
  sectionTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 8 },

  // Encounter card
  encounterCard: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: colors.outline, marginBottom: 8,
  },
  encounterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  encounterHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  encounterNumber: { fontSize: 14, fontWeight: '700', color: colors.text },
  encounterType: { fontSize: 12, color: colors.textSecondary },
  encounterBadgeRow: { flexDirection: 'row', gap: 6 },
  encounterBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  encounterBadgeText: { fontSize: 11, fontWeight: '500' },
  badgeDot: { width: 5, height: 5, borderRadius: 2.5 },

  encounterBody: { marginBottom: 10 },
  complainLabel: { fontSize: 12, color: colors.textTertiary, marginBottom: 2 },
  complainText: { fontSize: 13, color: colors.text },

  encounterFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, borderTopWidth: 1, borderTopColor: colors.outlineVariant, paddingTop: 8 },
  encDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  encDateText: { fontSize: 11, color: colors.textTertiary },

  // Medical records
  recordCard: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: colors.outline, marginBottom: 8,
  },
  recordHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant, paddingBottom: 8 },
  recordDate: { fontSize: 14, fontWeight: '600', color: colors.text },
  recordBody: { gap: 4 },
  recLabel: { fontSize: 12, color: colors.textTertiary, marginBottom: 4 },
  recordNotes: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.outlineVariant },
  recordNotesText: { fontSize: 13, color: colors.text, fontStyle: 'italic', lineHeight: 20 },

  // Vitals
  vitalsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.outlineVariant },
  vitalChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceVariant, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  vitalValue: { fontSize: 13, fontWeight: '700' },
  vitalLabel: { fontSize: 10, color: colors.textTertiary },

  // Empty
  emptyBlock: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyBlockText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  emptyBlockSub: { fontSize: 13, color: colors.textTertiary },
});
