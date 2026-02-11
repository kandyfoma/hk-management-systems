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
  ClinicalNote,
  ProgressNote,
  DischargeSummary,
  NoteType,
  NoteStatus,
  ProgressNoteType,
  ClinicalNotesUtils,
} from '../../../models/ClinicalNotes';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

// ─── Sample Data ─────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

const sampleProgressNotes: (ProgressNote & { patientName: string; authorName: string })[] = [
  {
    id: '1',
    noteNumber: 'PN260001',
    noteType: 'progress_note',
    encounterId: 'E001',
    admissionId: 'ADM001',
    patientId: 'P1001',
    patientName: 'Jean Mukendi',
    authorId: 'D001',
    authorName: 'Dr. Mbeki',
    authorRole: 'attending_physician',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    status: 'final',
    noteDate: today,
    noteDateTime: `${today}T09:30:00`,
    progressNoteType: 'daily_progress',
    subjective: 'Patient se plaint de légères douleurs thoraciques persistantes. Rapporte avoir mieux dormi la nuit dernière. Appétit amélioré.',
    objective: 'TA: 135/85 mmHg, FC: 78 bpm, T°: 36.8°C, SpO2: 96%.\nExamen cardio: Rythme régulier, pas de souffle. Poumons clairs à l\'auscultation. Pas d\'œdème des MI.',
    assessment: '1. Syndrome coronarien aigu - stabilisé sous traitement\n2. HTA contrôlée\n3. Évolution favorable',
    plan: '1. Continuer traitement actuel\n2. Contrôle troponine ce soir\n3. ECG de contrôle demain matin\n4. Discussion sortie si résultats satisfaisants',
    signedAt: `${today}T10:00:00`,
    signedBy: 'D001',
    createdAt: new Date().toISOString(),
    createdBy: 'D001',
  },
  {
    id: '2',
    noteNumber: 'PN260002',
    noteType: 'progress_note',
    encounterId: 'E002',
    admissionId: 'ADM002',
    patientId: 'P1002',
    patientName: 'Marie Kabamba',
    authorId: 'D002',
    authorName: 'Dr. Kalombo',
    authorRole: 'attending_physician',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    status: 'final',
    noteDate: today,
    noteDateTime: `${today}T08:15:00`,
    progressNoteType: 'post_procedure',
    subjective: 'Patiente en J+3 post-appendicectomie. Douleur minimale au site opératoire. Passage de gaz+. Transit repris.',
    objective: 'Pansement propre et sec. Abdomen souple, pas de défense. Reprise alimentation liquide tolérée.',
    assessment: 'Post-op J+3 appendicectomie - Évolution favorable sans complication.',
    plan: '1. Passer alimentation légère\n2. Mobilisation active\n3. Retrait perfusion si bonne tolérance orale\n4. Sortie prévue demain si évolution favorable',
    signedAt: `${today}T08:30:00`,
    signedBy: 'D002',
    createdAt: new Date().toISOString(),
    createdBy: 'D002',
  },
  {
    id: '3',
    noteNumber: 'PN260003',
    noteType: 'progress_note',
    encounterId: 'E003',
    admissionId: 'ADM003',
    patientId: 'P1003',
    patientName: 'Pierre Kasongo',
    authorId: 'N001',
    authorName: 'Inf. Marie',
    authorRole: 'nurse',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    status: 'draft',
    noteDate: today,
    noteDateTime: `${today}T07:00:00`,
    progressNoteType: 'nursing_note',
    subjective: 'Patient éveillé et orienté ce matin. Se plaint de fatigue. Nuit agitée avec réveil à 3h.',
    objective: 'Signes vitaux stables. Voie IV perméable. Miction spontanée. Soins d\'hygiène effectués avec aide partielle.',
    assessment: 'Patient stable. Besoin d\'aide pour les AVQ.',
    plan: '1. Surveillance continue\n2. Aide à l\'alimentation\n3. Prévention escarre - changement position /2h',
    createdAt: new Date().toISOString(),
    createdBy: 'N001',
  },
  {
    id: '4',
    noteNumber: 'PN260004',
    noteType: 'progress_note',
    encounterId: 'E001',
    patientId: 'P1001',
    patientName: 'Jean Mukendi',
    authorId: 'D003',
    authorName: 'Dr. Nkumu',
    authorRole: 'consultant',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    status: 'final',
    noteDate: yesterday,
    noteDateTime: `${yesterday}T14:30:00`,
    progressNoteType: 'consultation',
    subjective: 'Consultation cardiologie demandée pour évaluation SCA. Patient rapporte douleur thoracique depuis 2 jours.',
    objective: 'ECG: sous-décalage ST V4-V6. Troponine élevée à 0.8 ng/mL. Écho: FE 55%, pas de trouble cinétique.',
    assessment: 'NSTEMI avec fonction VG préservée.',
    plan: '1. Traitement médical optimal\n2. Coronarographie programmée\n3. Suivi cardiologique à la sortie',
    signedAt: `${yesterday}T15:00:00`,
    signedBy: 'D003',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    createdBy: 'D003',
  },
];

const sampleDischargeSummaries: (DischargeSummary & { patientName: string; authorName: string })[] = [
  {
    id: '5',
    noteNumber: 'DC260001',
    noteType: 'discharge_summary',
    encounterId: 'E004',
    admissionId: 'ADM004',
    patientId: 'P1004',
    patientName: 'Sophie Lunga',
    authorId: 'D001',
    authorName: 'Dr. Mbeki',
    authorRole: 'attending_physician',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    status: 'final',
    noteDate: today,
    noteDateTime: `${today}T11:00:00`,
    admissionDate: `${new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0]}`,
    dischargeDate: today,
    lengthOfStay: 5,
    primaryDiagnosis: 'Pneumonie communautaire',
    secondaryDiagnoses: ['Diabète type 2', 'HTA'],
    admittingComplaint: 'Fièvre, toux productive, dyspnée',
    hospitalCourse: 'Patiente admise pour pneumonie avec détresse respiratoire modérée. Antibiothérapie IV par Ceftriaxone + Azithromycine. Amélioration progressive de l\'état clinique. Apyrexie depuis J+3. Oxygénothérapie sevrée à J+4.',
    proceduresPerformed: ['Radiographie thorax', 'Hémocultures', 'Gazométrie artérielle'],
    conditionAtDischarge: 'stable',
    dischargeDisposition: 'home',
    dischargeMedications: [
      { medication: 'Amoxicilline-Clavulanate', dose: '1g', frequency: 'x2/j', duration: '5 jours', instructions: 'À prendre aux repas' },
      { medication: 'Metformine', dose: '850mg', frequency: 'x2/j', duration: 'continu', instructions: 'Traitement habituel' },
      { medication: 'Amlodipine', dose: '5mg', frequency: 'x1/j', duration: 'continu', instructions: 'Le matin' },
    ],
    followUpInstructions: '1. Consulter médecin traitant dans 1 semaine\n2. Contrôle radiographie thorax dans 4 semaines\n3. Revenir aux urgences si fièvre, essoufflement ou douleur thoracique',
    followUpAppointments: [
      { specialty: 'Médecine interne', date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], provider: 'Dr. Mbeki' },
    ],
    activityRestrictions: 'Repos relatif 1 semaine. Pas d\'effort intense.',
    dietaryInstructions: 'Régime diabétique. Hydratation abondante.',
    signedAt: `${today}T11:30:00`,
    signedBy: 'D001',
    createdAt: new Date().toISOString(),
    createdBy: 'D001',
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
function StatusBadge({ status }: { status: NoteStatus }) {
  const config: Record<NoteStatus, { color: string; label: string }> = {
    'draft': { color: colors.warning, label: 'Brouillon' },
    'pending_review': { color: colors.info, label: 'En Révision' },
    'final': { color: colors.success, label: 'Finalisé' },
    'amended': { color: '#8B5CF6', label: 'Modifié' },
    'cancelled': { color: colors.error, label: 'Annulé' },
  };
  const { color, label } = config[status];
  return (
    <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Note Type Badge ─────────────────────────────────────────
function NoteTypeBadge({ type }: { type: ProgressNoteType | 'discharge' }) {
  const config: Record<string, { color: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
    'daily_progress': { color: colors.primary, label: 'Évolution', icon: 'document-text' },
    'consultation': { color: '#8B5CF6', label: 'Consultation', icon: 'people' },
    'procedure': { color: colors.error, label: 'Procédure', icon: 'cut' },
    'post_procedure': { color: colors.warning, label: 'Post-Op', icon: 'bandage' },
    'transfer': { color: colors.info, label: 'Transfert', icon: 'swap-horizontal' },
    'nursing_note': { color: '#EC4899', label: 'Soins Inf.', icon: 'heart' },
    'discharge': { color: colors.success, label: 'Sortie', icon: 'exit' },
  };
  const { color, label, icon } = config[type] || config['daily_progress'];
  return (
    <View style={[styles.noteTypeBadge, { backgroundColor: color + '15', borderColor: color }]}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[styles.noteTypeText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Author Role Badge ───────────────────────────────────────
function AuthorRoleBadge({ role }: { role: string }) {
  const roleLabels: Record<string, string> = {
    'attending_physician': 'Médecin',
    'resident': 'Résident',
    'consultant': 'Consultant',
    'nurse': 'Infirmier',
    'nurse_practitioner': 'IPA',
    'physician_assistant': 'Assistant',
    'therapist': 'Thérapeute',
    'pharmacist': 'Pharmacien',
    'dietitian': 'Diététicien',
    'social_worker': 'Assistant social',
  };
  return (
    <View style={styles.authorRoleBadge}>
      <Text style={styles.authorRoleText}>{roleLabels[role] || role}</Text>
    </View>
  );
}

// ─── Progress Note Card ──────────────────────────────────────
function ProgressNoteCard({ note }: { note: typeof sampleProgressNotes[0] }) {
  const [expanded, setExpanded] = useState(false);
  
  const formattedDate = new Date(note.noteDateTime).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = new Date(note.noteDateTime).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={styles.noteCard}>
      {/* Header */}
      <TouchableOpacity 
        style={styles.noteCardHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.noteCardLeft}>
          <View style={styles.noteMetaRow}>
            <NoteTypeBadge type={note.progressNoteType} />
            <StatusBadge status={note.status} />
          </View>
          <View style={styles.patientRow}>
            <Ionicons name="person" size={14} color={colors.textSecondary} />
            <Text style={styles.patientName}>{note.patientName}</Text>
          </View>
          <View style={styles.authorRow}>
            <Text style={styles.authorName}>{note.authorName}</Text>
            <AuthorRoleBadge role={note.authorRole} />
          </View>
        </View>
        
        <View style={styles.noteCardRight}>
          <View style={styles.dateTimeBlock}>
            <Text style={styles.dateText}>{formattedDate}</Text>
            <Text style={styles.timeText}>{formattedTime}</Text>
          </View>
          <Ionicons 
            name={expanded ? 'chevron-up' : 'chevron-down'} 
            size={18} 
            color={colors.textSecondary}
          />
        </View>
      </TouchableOpacity>

      {/* Expanded Content - SOAP */}
      {expanded && (
        <View style={styles.soapContent}>
          {note.subjective && (
            <View style={styles.soapSection}>
              <View style={[styles.soapLabel, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[styles.soapLabelText, { color: '#D97706' }]}>S</Text>
              </View>
              <View style={styles.soapBody}>
                <Text style={styles.soapTitle}>Subjectif</Text>
                <Text style={styles.soapText}>{note.subjective}</Text>
              </View>
            </View>
          )}
          {note.objective && (
            <View style={styles.soapSection}>
              <View style={[styles.soapLabel, { backgroundColor: '#DBEAFE' }]}>
                <Text style={[styles.soapLabelText, { color: '#2563EB' }]}>O</Text>
              </View>
              <View style={styles.soapBody}>
                <Text style={styles.soapTitle}>Objectif</Text>
                <Text style={styles.soapText}>{note.objective}</Text>
              </View>
            </View>
          )}
          {note.assessment && (
            <View style={styles.soapSection}>
              <View style={[styles.soapLabel, { backgroundColor: '#FCE7F3' }]}>
                <Text style={[styles.soapLabelText, { color: '#DB2777' }]}>A</Text>
              </View>
              <View style={styles.soapBody}>
                <Text style={styles.soapTitle}>Évaluation</Text>
                <Text style={styles.soapText}>{note.assessment}</Text>
              </View>
            </View>
          )}
          {note.plan && (
            <View style={styles.soapSection}>
              <View style={[styles.soapLabel, { backgroundColor: '#D1FAE5' }]}>
                <Text style={[styles.soapLabelText, { color: '#059669' }]}>P</Text>
              </View>
              <View style={styles.soapBody}>
                <Text style={styles.soapTitle}>Plan</Text>
                <Text style={styles.soapText}>{note.plan}</Text>
              </View>
            </View>
          )}

          {/* Signature */}
          {note.signedAt && (
            <View style={styles.signatureBlock}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={styles.signatureText}>
                Signé le {new Date(note.signedAt).toLocaleString('fr-FR')}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Actions */}
      <View style={styles.noteActions}>
        <TouchableOpacity style={styles.noteActionBtn} activeOpacity={0.7}>
          <Ionicons name="eye" size={16} color={colors.primary} />
          <Text style={[styles.noteActionText, { color: colors.primary }]}>Voir</Text>
        </TouchableOpacity>
        {note.status === 'draft' && (
          <TouchableOpacity style={styles.noteActionBtn} activeOpacity={0.7}>
            <Ionicons name="create" size={16} color={colors.warning} />
            <Text style={[styles.noteActionText, { color: colors.warning }]}>Éditer</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.noteActionBtn} activeOpacity={0.7}>
          <Ionicons name="print" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Discharge Summary Card ──────────────────────────────────
function DischargeSummaryCard({ summary }: { summary: typeof sampleDischargeSummaries[0] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.noteCard, { borderLeftColor: colors.success, borderLeftWidth: 4 }]}>
      {/* Header */}
      <TouchableOpacity 
        style={styles.noteCardHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.noteCardLeft}>
          <View style={styles.noteMetaRow}>
            <NoteTypeBadge type="discharge" />
            <StatusBadge status={summary.status} />
          </View>
          <View style={styles.patientRow}>
            <Ionicons name="person" size={14} color={colors.textSecondary} />
            <Text style={styles.patientName}>{summary.patientName}</Text>
          </View>
          <View style={styles.losRow}>
            <Ionicons name="bed" size={14} color={colors.textSecondary} />
            <Text style={styles.losText}>Séjour: {summary.lengthOfStay} jours</Text>
          </View>
        </View>
        
        <View style={styles.noteCardRight}>
          <View style={styles.dateTimeBlock}>
            <Text style={styles.dateText}>Sortie: {new Date(summary.dischargeDate).toLocaleDateString('fr-FR')}</Text>
          </View>
          <Ionicons 
            name={expanded ? 'chevron-up' : 'chevron-down'} 
            size={18} 
            color={colors.textSecondary}
          />
        </View>
      </TouchableOpacity>

      {/* Primary Diagnosis */}
      <View style={styles.diagnosisBlock}>
        <Text style={styles.diagnosisLabel}>Diagnostic principal:</Text>
        <Text style={styles.diagnosisText}>{summary.primaryDiagnosis}</Text>
      </View>

      {/* Expanded Content */}
      {expanded && (
        <View style={styles.dischargeContent}>
          {/* Secondary Diagnoses */}
          {summary.secondaryDiagnoses && summary.secondaryDiagnoses.length > 0 && (
            <View style={styles.dischargeSection}>
              <Text style={styles.dischargeSectionTitle}>Diagnostics secondaires</Text>
              {summary.secondaryDiagnoses.map((dx, idx) => (
                <Text key={idx} style={styles.dischargeListItem}>• {dx}</Text>
              ))}
            </View>
          )}

          {/* Hospital Course */}
          <View style={styles.dischargeSection}>
            <Text style={styles.dischargeSectionTitle}>Évolution hospitalière</Text>
            <Text style={styles.dischargeSectionText}>{summary.hospitalCourse}</Text>
          </View>

          {/* Discharge Medications */}
          {summary.dischargeMedications && summary.dischargeMedications.length > 0 && (
            <View style={styles.dischargeSection}>
              <Text style={styles.dischargeSectionTitle}>Ordonnance de sortie</Text>
              {summary.dischargeMedications.map((med, idx) => (
                <View key={idx} style={styles.medItem}>
                  <Text style={styles.medName}>{med.medication} {med.dose}</Text>
                  <Text style={styles.medDetails}>{med.frequency} - {med.duration}</Text>
                  {med.instructions && (
                    <Text style={styles.medInstructions}>{med.instructions}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Follow-up Instructions */}
          <View style={styles.dischargeSection}>
            <Text style={styles.dischargeSectionTitle}>Consignes de suivi</Text>
            <Text style={styles.dischargeSectionText}>{summary.followUpInstructions}</Text>
          </View>

          {/* Appointments */}
          {summary.followUpAppointments && summary.followUpAppointments.length > 0 && (
            <View style={styles.dischargeSection}>
              <Text style={styles.dischargeSectionTitle}>Rendez-vous</Text>
              {summary.followUpAppointments.map((apt, idx) => (
                <View key={idx} style={styles.appointmentItem}>
                  <Ionicons name="calendar" size={14} color={colors.primary} />
                  <Text style={styles.appointmentText}>
                    {apt.specialty} - {new Date(apt.date).toLocaleDateString('fr-FR')} ({apt.provider})
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Actions */}
      <View style={styles.noteActions}>
        <TouchableOpacity style={[styles.noteActionBtn, styles.noteActionBtnPrimary]} activeOpacity={0.7}>
          <Ionicons name="document-text" size={16} color="#FFF" />
          <Text style={[styles.noteActionText, { color: '#FFF' }]}>Voir Complet</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.noteActionBtn} activeOpacity={0.7}>
          <Ionicons name="print" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.noteActionBtn} activeOpacity={0.7}>
          <Ionicons name="share" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────────
export function ClinicalNotesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'progress' | 'discharge'>('all');
  const [filterStatus, setFilterStatus] = useState<NoteStatus | 'all'>('all');

  // Stats
  const stats = {
    totalNotes: sampleProgressNotes.length + sampleDischargeSummaries.length,
    drafts: sampleProgressNotes.filter(n => n.status === 'draft').length,
    todayNotes: sampleProgressNotes.filter(n => n.noteDate === today).length,
    discharges: sampleDischargeSummaries.length,
  };

  // Filter progress notes
  const filteredProgressNotes = sampleProgressNotes.filter(note => {
    if (filterType === 'discharge') return false;
    if (filterStatus !== 'all' && note.status !== filterStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        note.patientName.toLowerCase().includes(query) ||
        note.authorName.toLowerCase().includes(query) ||
        note.noteNumber.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const filteredDischargeSummaries = sampleDischargeSummaries.filter(summary => {
    if (filterType === 'progress') return false;
    if (filterStatus !== 'all' && summary.status !== filterStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        summary.patientName.toLowerCase().includes(query) ||
        summary.primaryDiagnosis.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>📝 Notes Cliniques</Text>
          <Text style={styles.headerSubtitle}>Documentation médicale</Text>
        </View>
        <TouchableOpacity style={styles.newNoteBtn} activeOpacity={0.7}>
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.newNoteBtnText}>Nouvelle Note</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher patient, auteur, numéro..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ══════ SECTION: Statistiques ══════ */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.infoLight }]}>
          <Ionicons name="document-text" size={22} color={colors.info} />
          <Text style={styles.statValue}>{stats.totalNotes}</Text>
          <Text style={styles.statLabel}>Total Notes</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.warningLight }]}>
          <Ionicons name="create" size={22} color={colors.warning} />
          <Text style={styles.statValue}>{stats.drafts}</Text>
          <Text style={styles.statLabel}>Brouillons</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.primaryLight || '#E0E7FF' }]}>
          <Ionicons name="today" size={22} color={colors.primary} />
          <Text style={styles.statValue}>{stats.todayNotes}</Text>
          <Text style={styles.statLabel}>Aujourd'hui</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.successLight }]}>
          <Ionicons name="exit" size={22} color={colors.success} />
          <Text style={styles.statValue}>{stats.discharges}</Text>
          <Text style={styles.statLabel}>Sorties</Text>
        </View>
      </View>

      {/* ══════ SECTION: Filtres ══════ */}
      <SectionHeader
        title="Filtrer"
        icon="filter"
        accentColor={colors.secondary}
      />
      
      {/* Type Filter */}
      <View style={styles.typeFilterRow}>
        {[
          { key: 'all', label: 'Toutes', icon: 'list' as const },
          { key: 'progress', label: 'Évolution', icon: 'document-text' as const },
          { key: 'discharge', label: 'Sorties', icon: 'exit' as const },
        ].map((filter) => {
          const isSelected = filterType === filter.key;
          return (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.typeFilterBtn,
                isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setFilterType(filter.key as any)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={filter.icon} 
                size={16} 
                color={isSelected ? '#FFF' : colors.textSecondary} 
              />
              <Text style={[styles.typeFilterText, isSelected && { color: '#FFF' }]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Status Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterScrollContent}
      >
        {[
          { key: 'all', label: 'Tous Statuts', color: colors.textSecondary },
          { key: 'draft', label: 'Brouillons', color: colors.warning },
          { key: 'final', label: 'Finalisés', color: colors.success },
          { key: 'amended', label: 'Modifiés', color: '#8B5CF6' },
        ].map((filter) => {
          const isSelected = filterStatus === filter.key;
          return (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                isSelected && { backgroundColor: filter.color + '20', borderColor: filter.color },
              ]}
              onPress={() => setFilterStatus(filter.key as any)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, isSelected && { color: filter.color }]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ══════ SECTION: Résumés de Sortie ══════ */}
      {(filterType === 'all' || filterType === 'discharge') && filteredDischargeSummaries.length > 0 && (
        <>
          <SectionHeader
            title="Résumés de Sortie"
            subtitle={`${filteredDischargeSummaries.length} résumé(s)`}
            icon="exit"
            accentColor={colors.success}
          />
          <View style={styles.notesList}>
            {filteredDischargeSummaries.map((summary) => (
              <DischargeSummaryCard key={summary.id} summary={summary} />
            ))}
          </View>
        </>
      )}

      {/* ══════ SECTION: Notes d'Évolution ══════ */}
      {(filterType === 'all' || filterType === 'progress') && filteredProgressNotes.length > 0 && (
        <>
          <SectionHeader
            title="Notes d'Évolution"
            subtitle={`${filteredProgressNotes.length} note(s)`}
            icon="document-text"
            accentColor={colors.primary}
          />
          <View style={styles.notesList}>
            {filteredProgressNotes.map((note) => (
              <ProgressNoteCard key={note.id} note={note} />
            ))}
          </View>
        </>
      )}

      {/* Empty State */}
      {filteredProgressNotes.length === 0 && filteredDischargeSummaries.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyStateText}>Aucune note trouvée</Text>
          <Text style={styles.emptyStateSubtext}>
            Modifiez les filtres ou créez une nouvelle note
          </Text>
        </View>
      )}

      {/* ══════ SECTION: Templates ══════ */}
      <SectionHeader
        title="Modèles Rapides"
        subtitle="Templates de documentation"
        icon="copy"
        accentColor="#8B5CF6"
      />
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.templatesScroll}
        contentContainerStyle={styles.templatesScrollContent}
      >
        {[
          { name: 'Note SOAP', icon: 'document-text', color: colors.primary },
          { name: 'Consultation', icon: 'people', color: '#8B5CF6' },
          { name: 'Note Infirmière', icon: 'heart', color: '#EC4899' },
          { name: 'Résumé Sortie', icon: 'exit', color: colors.success },
          { name: 'Note Procédure', icon: 'cut', color: colors.error },
        ].map((template, idx) => (
          <TouchableOpacity 
            key={idx} 
            style={[styles.templateCard, { borderTopColor: template.color }]}
            activeOpacity={0.7}
          >
            <View style={[styles.templateIcon, { backgroundColor: template.color + '15' }]}>
              <Ionicons name={template.icon as any} size={20} color={template.color} />
            </View>
            <Text style={styles.templateName}>{template.name}</Text>
            <Text style={styles.templateAction}>Utiliser →</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
    flexWrap: 'wrap',
    gap: 12,
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
  newNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
  },
  newNoteBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Search
  searchContainer: {
    marginBottom: 20,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
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
    padding: 14,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Type Filter
  typeFilterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  typeFilterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  typeFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
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

  // Notes List
  notesList: {
    gap: 14,
    marginBottom: 24,
  },
  noteCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  noteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  noteCardLeft: {
    flex: 1,
    gap: 6,
  },
  noteCardRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  noteMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorName: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  losRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  losText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  dateTimeBlock: {
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
  },
  timeText: {
    fontSize: 11,
    color: colors.textSecondary,
  },

  // SOAP Content
  soapContent: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    gap: 12,
  },
  soapSection: {
    flexDirection: 'row',
    gap: 12,
  },
  soapLabel: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soapLabelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  soapBody: {
    flex: 1,
  },
  soapTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  soapText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  signatureBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  signatureText: {
    fontSize: 11,
    color: colors.success,
  },

  // Discharge Content
  diagnosisBlock: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surfaceVariant,
  },
  diagnosisLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  diagnosisText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  dischargeContent: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    gap: 16,
  },
  dischargeSection: {
    gap: 6,
  },
  dischargeSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  dischargeSectionText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  dischargeListItem: {
    fontSize: 13,
    color: colors.text,
    marginLeft: 8,
  },
  medItem: {
    backgroundColor: colors.surfaceVariant,
    padding: 10,
    borderRadius: borderRadius.sm,
    marginTop: 4,
  },
  medName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  medDetails: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  medInstructions: {
    fontSize: 11,
    color: colors.info,
    fontStyle: 'italic',
    marginTop: 2,
  },
  appointmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  appointmentText: {
    fontSize: 13,
    color: colors.text,
  },

  // Actions
  noteActions: {
    flexDirection: 'row',
    gap: 8,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  noteActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceVariant,
  },
  noteActionBtnPrimary: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
  },
  noteActionText: {
    fontSize: 12,
    fontWeight: '600',
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
  noteTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  noteTypeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  authorRoleBadge: {
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  authorRoleText: {
    fontSize: 10,
    color: colors.textSecondary,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },

  // Templates
  templatesScroll: {
    marginBottom: 24,
  },
  templatesScrollContent: {
    gap: 12,
    paddingRight: 16,
  },
  templateCard: {
    width: 130,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 14,
    borderTopWidth: 4,
    alignItems: 'center',
    ...shadows.sm,
  },
  templateIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  templateName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  templateAction: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '500',
  },
});

export default ClinicalNotesScreen;
