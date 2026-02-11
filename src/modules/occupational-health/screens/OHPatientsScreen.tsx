import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Dimensions, Modal, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import {
  SECTOR_PROFILES, OccHealthUtils,
  type IndustrySector, type FitnessStatus, type SectorRiskLevel,
  type ExposureRisk, type PPEType, type ShiftPattern, type JobCategory,
  type OccupationalHealthPatient,
} from '../../../models/OccupationalHealth';
import { PatientUtils } from '../../../models/Patient';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const ACCENT = '#D97706';
const STORAGE_KEY = '@occhealth_patients';

// ─── Sample Patients (with full Patient + OH fields) ─────────
const SAMPLE_PATIENTS: OccupationalHealthPatient[] = [
  {
    id: 'w1',
    firstName: 'Jean-Pierre',
    lastName: 'Kabongo',
    middleName: '',
    dateOfBirth: '1985-03-15',
    gender: 'male',
    phone: '+243 812 345 678',
    email: 'jpkabongo@mail.com',
    address: '12 Ave Kasavubu, Lubumbashi',
    city: 'Lubumbashi',
    emergencyContactName: 'Marie Kabongo',
    emergencyContactPhone: '+243 815 555 111',
    // Patient required fields
    allergies: [],
    chronicConditions: [],
    currentMedications: [],
    patientNumber: PatientUtils.generatePatientNumber(),
    registrationDate: '2015-06-01',
    status: 'active',
    createdAt: '2015-06-01T00:00:00.000Z',
    // OH fields
    employeeId: 'EMP-001',
    company: 'Kamoto Copper Company',
    sector: 'mining',
    site: 'Site Kamoto Principal',
    department: 'Opérations Souterraines',
    jobTitle: 'Mineur de Fond',
    jobCategory: 'underground_work',
    shiftPattern: 'rotating',
    hireDate: '2015-06-01',
    contractType: 'permanent',
    fitnessStatus: 'fit',
    lastMedicalExam: '2024-10-15',
    nextMedicalExam: '2025-04-15',
    exposureRisks: ['silica_dust', 'noise', 'vibration', 'confined_spaces'],
    ppeRequired: ['hard_hat', 'safety_boots', 'ear_plugs', 'dust_mask', 'safety_glasses', 'high_vis_vest'],
    riskLevel: 'very_high',
    vaccinationStatus: [],
  },
  {
    id: 'w2',
    firstName: 'Grace',
    lastName: 'Mwamba',
    middleName: '',
    dateOfBirth: '1990-07-22',
    gender: 'female',
    phone: '+243 821 456 789',
    email: 'gmwamba@mail.com',
    address: '45 Ave Mobutu, Kinshasa',
    city: 'Kinshasa',
    emergencyContactName: 'Paul Mwamba',
    emergencyContactPhone: '+243 822 333 444',
    allergies: [],
    chronicConditions: [],
    currentMedications: [],
    patientNumber: PatientUtils.generatePatientNumber(),
    registrationDate: '2019-01-15',
    status: 'active',
    createdAt: '2019-01-15T00:00:00.000Z',
    employeeId: 'EMP-002',
    company: 'Rawbank S.A.',
    sector: 'banking_finance',
    site: 'Siège Social Kinshasa',
    department: 'Opérations Bancaires',
    jobTitle: 'Analyste Financier',
    jobCategory: 'finance_accounting',
    shiftPattern: 'regular',
    hireDate: '2019-01-15',
    contractType: 'permanent',
    fitnessStatus: 'fit',
    lastMedicalExam: '2024-09-20',
    nextMedicalExam: '2025-09-20',
    exposureRisks: ['ergonomic', 'vdt_screen', 'psychosocial', 'sedentary'],
    ppeRequired: ['ergonomic_chair'],
    riskLevel: 'low',
    vaccinationStatus: [],
  },
  {
    id: 'w3',
    firstName: 'Patrick',
    lastName: 'Lukusa',
    middleName: 'Tshimanga',
    dateOfBirth: '1988-11-08',
    gender: 'male',
    phone: '+243 833 567 890',
    email: 'plukusa@mail.com',
    address: '78 Blvd 30 Juin, Kolwezi',
    city: 'Kolwezi',
    emergencyContactName: 'Jeanne Lukusa',
    emergencyContactPhone: '+243 834 222 333',
    allergies: ['Poussière industrielle'],
    chronicConditions: [],
    currentMedications: [],
    patientNumber: PatientUtils.generatePatientNumber(),
    registrationDate: '2017-03-10',
    status: 'active',
    createdAt: '2017-03-10T00:00:00.000Z',
    employeeId: 'EMP-003',
    company: 'Brasserie Simba',
    sector: 'manufacturing',
    site: 'Usine Kolwezi',
    department: 'Production',
    jobTitle: 'Opérateur Machine',
    jobCategory: 'production_line',
    shiftPattern: 'rotating',
    hireDate: '2017-03-10',
    contractType: 'permanent',
    fitnessStatus: 'fit_with_restrictions',
    lastMedicalExam: '2024-11-05',
    nextMedicalExam: '2025-05-05',
    exposureRisks: ['noise', 'chemical_exposure', 'ergonomic', 'machine_hazards'],
    ppeRequired: ['ear_plugs', 'safety_glasses', 'safety_gloves', 'safety_boots'],
    riskLevel: 'high',
    vaccinationStatus: [],
  },
  {
    id: 'w4',
    firstName: 'Nadine',
    lastName: 'Tshilombo',
    middleName: '',
    dateOfBirth: '1992-04-30',
    gender: 'female',
    phone: '+243 844 678 901',
    email: 'ntshilombo@mail.com',
    address: '33 Ave Lumumba, Lubumbashi',
    city: 'Lubumbashi',
    emergencyContactName: 'Robert Tshilombo',
    emergencyContactPhone: '+243 845 444 555',
    allergies: ['Latex'],
    chronicConditions: [],
    currentMedications: [],
    patientNumber: PatientUtils.generatePatientNumber(),
    registrationDate: '2016-08-20',
    status: 'active',
    createdAt: '2016-08-20T00:00:00.000Z',
    employeeId: 'EMP-004',
    company: 'Hôpital Sendwe',
    sector: 'healthcare',
    site: 'Hôpital Général Jason Sendwe',
    department: 'Soins Infirmiers',
    jobTitle: 'Infirmière Chef',
    jobCategory: 'nursing',
    shiftPattern: 'rotating',
    hireDate: '2016-08-20',
    contractType: 'permanent',
    fitnessStatus: 'fit',
    lastMedicalExam: '2024-08-10',
    nextMedicalExam: '2025-02-10',
    exposureRisks: ['biological', 'needle_stick', 'chemical_exposure', 'psychosocial', 'shift_work'],
    ppeRequired: ['safety_gloves', 'lab_coat', 'face_shield', 'dust_mask'],
    riskLevel: 'high',
    vaccinationStatus: [{ vaccine: 'Hepatitis B', date: '2016-09-01' }],
  },
  {
    id: 'w5',
    firstName: 'Samuel',
    lastName: 'Ilunga',
    middleName: '',
    dateOfBirth: '1995-01-12',
    gender: 'male',
    phone: '+243 855 789 012',
    email: 'silunga@mail.com',
    address: '67 Ave Kamanyola, Kinshasa',
    city: 'Kinshasa',
    emergencyContactName: 'Alice Ilunga',
    emergencyContactPhone: '+243 856 666 777',
    allergies: [],
    chronicConditions: [],
    currentMedications: [],
    patientNumber: PatientUtils.generatePatientNumber(),
    registrationDate: '2021-02-01',
    status: 'active',
    createdAt: '2021-02-01T00:00:00.000Z',
    employeeId: 'EMP-005',
    company: 'Vodacom Congo',
    sector: 'telecom_it',
    site: 'Tour Vodacom Kinshasa',
    department: 'Développement IT',
    jobTitle: 'Ingénieur Logiciel',
    jobCategory: 'it_systems',
    shiftPattern: 'regular',
    hireDate: '2021-02-01',
    contractType: 'permanent',
    fitnessStatus: 'pending_evaluation',
    lastMedicalExam: '2024-02-01',
    nextMedicalExam: '2025-02-01',
    exposureRisks: ['ergonomic', 'vdt_screen', 'psychosocial', 'sedentary'],
    ppeRequired: ['ergonomic_chair', 'wrist_rest'],
    riskLevel: 'low',
    vaccinationStatus: [],
  },
  {
    id: 'w6',
    firstName: 'François',
    lastName: 'Mutombo',
    middleName: '',
    dateOfBirth: '1980-06-18',
    gender: 'male',
    phone: '+243 866 890 123',
    email: 'fmutombo@mail.com',
    address: '14 Ave Kasai, Mbuji-Mayi',
    city: 'Mbuji-Mayi',
    emergencyContactName: 'Claire Mutombo',
    emergencyContactPhone: '+243 867 888 999',
    allergies: [],
    chronicConditions: ['Hypertension légère'],
    currentMedications: ['Amlodipine 5mg'],
    patientNumber: PatientUtils.generatePatientNumber(),
    registrationDate: '2010-04-15',
    status: 'active',
    createdAt: '2010-04-15T00:00:00.000Z',
    employeeId: 'EMP-006',
    company: 'Tenke Fungurume Mining',
    sector: 'mining',
    site: 'Site TFM Fungurume',
    department: 'Traitement Minerais',
    jobTitle: 'Superviseur Usine',
    jobCategory: 'processing_refining',
    shiftPattern: 'day_shift',
    hireDate: '2010-04-15',
    contractType: 'permanent',
    fitnessStatus: 'fit',
    lastMedicalExam: '2024-12-01',
    nextMedicalExam: '2025-06-01',
    exposureRisks: ['chemical_exposure', 'noise', 'heat_stress', 'heavy_metals'],
    ppeRequired: ['hard_hat', 'safety_glasses', 'respirator', 'safety_boots', 'coveralls', 'safety_gloves'],
    riskLevel: 'very_high',
    vaccinationStatus: [],
  },
];

// ─── Patient Card ────────────────────────────────────────────
function PatientCard({ patient, onPress }: { patient: OccupationalHealthPatient; onPress: () => void }) {
  const sectorProfile = SECTOR_PROFILES[patient.sector];
  const fitnessColor = OccHealthUtils.getFitnessStatusColor(patient.fitnessStatus);
  const fitnessLabel = OccHealthUtils.getFitnessStatusLabel(patient.fitnessStatus);
  const riskColor = OccHealthUtils.getSectorRiskColor(patient.riskLevel);
  const isOverdue = patient.nextMedicalExam && new Date(patient.nextMedicalExam) < new Date();

  return (
    <TouchableOpacity style={styles.patientCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.patientCardHeader}>
        <View style={[styles.patientAvatar, { backgroundColor: sectorProfile.color + '14' }]}>
          <Ionicons name={sectorProfile.icon as any} size={22} color={sectorProfile.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.patientName}>{patient.firstName} {patient.lastName}</Text>
            {isOverdue && (
              <View style={styles.overdueBadge}>
                <Ionicons name="alert-circle" size={12} color="#FFF" />
                <Text style={styles.overdueBadgeText}>EXAMEN EN RETARD</Text>
              </View>
            )}
          </View>
          <Text style={styles.patientId}>{patient.patientNumber} • {patient.employeeId} • {patient.company}</Text>
        </View>
        <View style={[styles.fitnessChip, { backgroundColor: fitnessColor + '14' }]}>
          <View style={[styles.fitnessChipDot, { backgroundColor: fitnessColor }]} />
          <Text style={[styles.fitnessChipText, { color: fitnessColor }]}>{fitnessLabel}</Text>
        </View>
      </View>

      <View style={styles.patientCardBody}>
        <View style={styles.patientInfoRow}>
          <View style={styles.patientInfoItem}>
            <Ionicons name="briefcase-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.patientInfoText}>{patient.jobTitle}</Text>
          </View>
          <View style={styles.patientInfoItem}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.patientInfoText}>{patient.site}</Text>
          </View>
        </View>
        <View style={styles.patientInfoRow}>
          <View style={styles.patientInfoItem}>
            <Ionicons name="business-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.patientInfoText}>{sectorProfile.label} • {patient.department}</Text>
          </View>
          <View style={[styles.riskBadge, { backgroundColor: riskColor + '14' }]}>
            <Ionicons name="shield-outline" size={12} color={riskColor} />
            <Text style={[styles.riskBadgeText, { color: riskColor }]}>
              Risque {OccHealthUtils.getSectorRiskLabel(patient.riskLevel)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.patientCardFooter}>
        <View style={styles.ppeRow}>
          {patient.ppeRequired.slice(0, 4).map((ppe, i) => (
            <View key={i} style={styles.ppeMiniTag}>
              <Text style={styles.ppeMiniTagText}>{getPPELabel(ppe)}</Text>
            </View>
          ))}
          {patient.ppeRequired.length > 4 && (
            <Text style={styles.ppeMoreText}>+{patient.ppeRequired.length - 4}</Text>
          )}
        </View>
        <Text style={styles.examDate}>
          Prochain examen: {patient.nextMedicalExam ? new Date(patient.nextMedicalExam).toLocaleDateString('fr-CD') : 'N/A'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function getPPELabel(ppe: PPEType): string {
  const labels: Record<string, string> = {
    hard_hat: 'Casque', safety_glasses: 'Lunettes', ear_plugs: 'Bouchons', ear_muffs: 'Casque anti-bruit',
    dust_mask: 'Masque', respirator: 'Respirateur', safety_boots: 'Bottes', safety_gloves: 'Gants',
    high_vis_vest: 'Gilet', fall_harness: 'Harnais', face_shield: 'Visière', coveralls: 'Combinaison',
    lab_coat: 'Blouse', chemical_suit: 'Combinaison chimique', radiation_badge: 'Badge radiation',
    ergonomic_chair: 'Chaise ergo', wrist_rest: 'Repose-poignet', anti_fatigue_mat: 'Tapis',
    safety_harness_electrical: 'Harnais élec.', none_required: 'Aucun',
  };
  return labels[ppe] || ppe;
}

// ─── Patient Detail Modal ────────────────────────────────────
function PatientDetailModal({
  visible, patient, onClose, onEdit
}: { visible: boolean; patient: OccupationalHealthPatient | null; onClose: () => void; onEdit: () => void }) {
  if (!patient) return null;
  const sectorProfile = SECTOR_PROFILES[patient.sector];
  const fitnessColor = OccHealthUtils.getFitnessStatusColor(patient.fitnessStatus);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Fiche Patient — Santé au Travail</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.textSecondary} /></TouchableOpacity>
            </View>

            {/* Identity */}
            <View style={styles.detailSection}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <View style={[styles.detailAvatar, { backgroundColor: sectorProfile.color + '14' }]}>
                  <Ionicons name={sectorProfile.icon as any} size={32} color={sectorProfile.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailName}>{patient.firstName} {patient.middleName || ''} {patient.lastName}</Text>
                  <Text style={styles.detailSubtext}>N° {patient.patientNumber} • {patient.employeeId} • {patient.company}</Text>
                </View>
                <View style={[styles.fitnessChip, { backgroundColor: fitnessColor + '14' }]}>
                  <View style={[styles.fitnessChipDot, { backgroundColor: fitnessColor }]} />
                  <Text style={[styles.fitnessChipText, { color: fitnessColor }]}>
                    {OccHealthUtils.getFitnessStatusLabel(patient.fitnessStatus)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Personal Info */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Informations Personnelles</Text>
              <DetailRow label="Date de Naissance" value={new Date(patient.dateOfBirth).toLocaleDateString('fr-CD')} />
              <DetailRow label="Âge" value={`${OccHealthUtils.getPatientAge(patient)} ans`} />
              <DetailRow label="Genre" value={patient.gender === 'male' ? 'Masculin' : 'Féminin'} />
              <DetailRow label="Téléphone" value={patient.phone || 'N/A'} />
              <DetailRow label="Email" value={patient.email || 'N/A'} />
              <DetailRow label="Adresse" value={patient.address || 'N/A'} />
              <DetailRow label="Contact Urgence" value={`${patient.emergencyContactName || 'N/A'} — ${patient.emergencyContactPhone || 'N/A'}`} />
            </View>

            {/* Medical Info */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Informations Médicales</Text>
              <DetailRow label="Groupe Sanguin" value={patient.bloodType || 'Non renseigné'} />
              <DetailRow label="Allergies" value={patient.allergies.length > 0 ? patient.allergies.join(', ') : 'Aucune connue'} />
              <DetailRow label="Pathologies Chroniques" value={patient.chronicConditions.length > 0 ? patient.chronicConditions.join(', ') : 'Aucune'} />
              <DetailRow label="Médicaments" value={patient.currentMedications.length > 0 ? patient.currentMedications.join(', ') : 'Aucun'} />
            </View>

            {/* Employment Info */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Contexte Professionnel</Text>
              <DetailRow label="Entreprise" value={patient.company} />
              <DetailRow label="Secteur" value={sectorProfile.label} />
              <DetailRow label="Site" value={patient.site} />
              <DetailRow label="Département" value={patient.department} />
              <DetailRow label="Poste" value={patient.jobTitle} />
              <DetailRow label="Catégorie" value={OccHealthUtils.getJobCategoryLabel(patient.jobCategory)} />
              <DetailRow label="Horaire" value={getShiftLabel(patient.shiftPattern)} />
              <DetailRow label="Date Embauche" value={new Date(patient.hireDate).toLocaleDateString('fr-CD')} />
              <DetailRow label="Contrat" value={getContractLabel(patient.contractType)} />
            </View>

            {/* Health Info */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Santé au Travail</Text>
              <DetailRow label="Dernier Examen" value={patient.lastMedicalExam ? new Date(patient.lastMedicalExam).toLocaleDateString('fr-CD') : 'Aucun'} />
              <DetailRow label="Prochain Examen" value={patient.nextMedicalExam ? new Date(patient.nextMedicalExam).toLocaleDateString('fr-CD') : 'Non planifié'} />
              <DetailRow label="Niveau de Risque" value={OccHealthUtils.getSectorRiskLabel(patient.riskLevel)} />
            </View>

            {/* Exposure Risks */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Risques d'Exposition</Text>
              <View style={styles.tagContainer}>
                {patient.exposureRisks.map((risk, i) => (
                  <View key={i} style={[styles.riskTag, { backgroundColor: '#EF444414' }]}>
                    <Ionicons name="warning-outline" size={12} color="#EF4444" />
                    <Text style={[styles.riskTagText, { color: '#EF4444' }]}>{OccHealthUtils.getExposureRiskLabel(risk)}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* PPE */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>EPI Requis</Text>
              <View style={styles.tagContainer}>
                {patient.ppeRequired.map((ppe, i) => (
                  <View key={i} style={[styles.riskTag, { backgroundColor: ACCENT + '14' }]}>
                    <Ionicons name="shield-checkmark-outline" size={12} color={ACCENT} />
                    <Text style={[styles.riskTagText, { color: ACCENT }]}>{getPPELabel(ppe)}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surfaceVariant }]} onPress={onClose}>
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Fermer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: ACCENT }]} onPress={onEdit}>
              <Ionicons name="create-outline" size={18} color="#FFF" />
              <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Modifier</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function getShiftLabel(s: ShiftPattern): string {
  const m: Record<ShiftPattern, string> = {
    day_shift: 'Jour', night_shift: 'Nuit', rotating: 'Rotation', on_call: 'Astreinte',
    regular: 'Régulier', flexible: 'Flexible', split_shift: 'Coupé',
  };
  return m[s] || s;
}

function getContractLabel(c: string): string {
  const m: Record<string, string> = {
    permanent: 'CDI', contract: 'CDD', seasonal: 'Saisonnier', intern: 'Stagiaire', daily_worker: 'Journalier',
  };
  return m[c] || c;
}

// ─── Add Patient Modal ───────────────────────────────────────
function AddPatientModal({
  visible, onClose, onSave
}: { visible: boolean; onClose: () => void; onSave: (p: OccupationalHealthPatient) => void }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [company, setCompany] = useState('');
  const [sector, setSector] = useState<IndustrySector>('mining');
  const [site, setSite] = useState('');
  const [department, setDepartment] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  const handleSave = () => {
    if (!firstName.trim() || !lastName.trim() || !employeeId.trim()) {
      Alert.alert('Erreur', 'Nom, prénom et matricule sont obligatoires.');
      return;
    }
    const sectorProfile = SECTOR_PROFILES[sector];
    const now = new Date().toISOString();
    const newPatient: OccupationalHealthPatient = {
      id: `p-${Date.now()}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dateOfBirth: dateOfBirth || '1990-01-01',
      gender: 'male',
      phone: phone.trim(),
      // Patient required fields
      allergies: [],
      chronicConditions: [],
      currentMedications: [],
      patientNumber: PatientUtils.generatePatientNumber(),
      registrationDate: now,
      status: 'active',
      createdAt: now,
      // OH fields
      employeeId: employeeId.trim(),
      company: company.trim() || 'Non spécifié',
      sector,
      site: site.trim() || 'Non spécifié',
      department: department.trim() || 'Non spécifié',
      jobTitle: jobTitle.trim() || 'Non spécifié',
      jobCategory: 'other',
      shiftPattern: 'regular',
      hireDate: new Date().toISOString().split('T')[0],
      contractType: 'permanent',
      fitnessStatus: 'pending_evaluation',
      exposureRisks: sectorProfile.typicalRisks.slice(0, 3) as ExposureRisk[],
      ppeRequired: [] as PPEType[],
      riskLevel: sectorProfile.riskLevel,
      vaccinationStatus: [],
    };
    onSave(newPatient);
    // Reset
    setFirstName(''); setLastName(''); setEmployeeId(''); setCompany('');
    setSector('mining'); setSite(''); setDepartment(''); setJobTitle('');
    setPhone(''); setDateOfBirth('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: '85%' }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouveau Patient — Santé au Travail</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.textSecondary} /></TouchableOpacity>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Prénom *</Text>
              <TextInput style={styles.formInput} value={firstName} onChangeText={setFirstName} placeholder="Prénom" />
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Nom *</Text>
              <TextInput style={styles.formInput} value={lastName} onChangeText={setLastName} placeholder="Nom de famille" />
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Matricule *</Text>
              <TextInput style={styles.formInput} value={employeeId} onChangeText={setEmployeeId} placeholder="EMP-XXX" />
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Date de Naissance</Text>
              <TextInput style={styles.formInput} value={dateOfBirth} onChangeText={setDateOfBirth} placeholder="AAAA-MM-JJ" />
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Téléphone</Text>
              <TextInput style={styles.formInput} value={phone} onChangeText={setPhone} placeholder="+243 XXX XXX XXX" />
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Entreprise</Text>
              <TextInput style={styles.formInput} value={company} onChangeText={setCompany} placeholder="Nom de l'entreprise" />
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Secteur d'Activité</Text>
              <View style={styles.sectorGrid}>
                {(Object.keys(SECTOR_PROFILES) as IndustrySector[]).slice(0, 8).map(s => {
                  const sp = SECTOR_PROFILES[s];
                  const isSelected = sector === s;
                  return (
                    <TouchableOpacity key={s}
                      style={[styles.sectorChip, isSelected && { backgroundColor: sp.color + '20', borderColor: sp.color }]}
                      onPress={() => setSector(s)}>
                      <Ionicons name={sp.icon as any} size={14} color={isSelected ? sp.color : colors.textSecondary} />
                      <Text style={[styles.sectorChipText, isSelected && { color: sp.color, fontWeight: '600' }]}>{sp.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Site</Text>
              <TextInput style={styles.formInput} value={site} onChangeText={setSite} placeholder="Nom du site" />
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Département</Text>
              <TextInput style={styles.formInput} value={department} onChangeText={setDepartment} placeholder="Département" />
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Poste</Text>
              <TextInput style={styles.formInput} value={jobTitle} onChangeText={setJobTitle} placeholder="Intitulé du poste" />
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surfaceVariant }]} onPress={onClose}>
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: ACCENT }]} onPress={handleSave}>
              <Ionicons name="save-outline" size={18} color="#FFF" />
              <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────
export function OHPatientsScreen() {
  const [patients, setPatients] = useState<OccupationalHealthPatient[]>(SAMPLE_PATIENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSector, setFilterSector] = useState<IndustrySector | 'all'>('all');
  const [filterFitness, setFilterFitness] = useState<FitnessStatus | 'all'>('all');
  const [selectedPatient, setSelectedPatient] = useState<OccupationalHealthPatient | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setPatients(JSON.parse(stored));
      else await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_PATIENTS));
    } catch { /* keep samples */ }
  };

  const savePatients = async (list: OccupationalHealthPatient[]) => {
    setPatients(list);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  const handleAddPatient = (p: OccupationalHealthPatient) => {
    const updated = [p, ...patients];
    savePatients(updated);
    setShowAddModal(false);
    Alert.alert('Succès', `${p.firstName} ${p.lastName} enregistré(e) — N° ${p.patientNumber}`);
  };

  const handleDeletePatient = (id: string) => {
    Alert.alert('Confirmer', 'Supprimer ce patient du registre ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: () => {
          savePatients(patients.filter(p => p.id !== id));
          setShowDetail(false);
          setSelectedPatient(null);
        }
      },
    ]);
  };

  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        p.employeeId.toLowerCase().includes(q) ||
        p.patientNumber.toLowerCase().includes(q) ||
        p.company.toLowerCase().includes(q) ||
        p.jobTitle.toLowerCase().includes(q);
      const matchesSector = filterSector === 'all' || p.sector === filterSector;
      const matchesFitness = filterFitness === 'all' || p.fitnessStatus === filterFitness;
      return matchesSearch && matchesSector && matchesFitness;
    });
  }, [patients, searchQuery, filterSector, filterFitness]);

  // Stats
  const stats = useMemo(() => ({
    total: patients.length,
    fit: patients.filter(p => p.fitnessStatus === 'fit').length,
    restricted: patients.filter(p => p.fitnessStatus === 'fit_with_restrictions').length,
    unfit: patients.filter(p => p.fitnessStatus === 'temporarily_unfit' || p.fitnessStatus === 'permanently_unfit').length,
    pending: patients.filter(p => p.fitnessStatus === 'pending_evaluation').length,
    overdue: patients.filter(p => p.nextMedicalExam && new Date(p.nextMedicalExam) < new Date()).length,
  }), [patients]);

  const sectorOptions: { value: IndustrySector | 'all'; label: string }[] = [
    { value: 'all', label: 'Tous les secteurs' },
    ...Object.keys(SECTOR_PROFILES).slice(0, 8).map(s => ({
      value: s as IndustrySector,
      label: SECTOR_PROFILES[s as IndustrySector].label,
    })),
  ];

  const fitnessOptions: { value: FitnessStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'fit', label: 'Apte' },
    { value: 'fit_with_restrictions', label: 'Avec restrictions' },
    { value: 'temporarily_unfit', label: 'Inapte temporaire' },
    { value: 'pending_evaluation', label: 'En attente' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Patients — Santé au Travail</Text>
          <Text style={styles.screenSubtitle}>Registre des patients par secteur d'activité et entreprise</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.addButtonText}>Nouveau Patient</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'Total', value: stats.total, icon: 'people', color: ACCENT },
          { label: 'Aptes', value: stats.fit, icon: 'checkmark-circle', color: '#22C55E' },
          { label: 'Restrictions', value: stats.restricted, icon: 'warning', color: '#F59E0B' },
          { label: 'Inaptes', value: stats.unfit, icon: 'close-circle', color: '#EF4444' },
          { label: 'En attente', value: stats.pending, icon: 'time', color: '#6366F1' },
          { label: 'Exam. en retard', value: stats.overdue, icon: 'alert-circle', color: '#DC2626' },
        ].map((s, i) => (
          <View key={i} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: s.color + '14' }]}>
              <Ionicons name={s.icon as any} size={20} color={s.color} />
            </View>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Search & Filters */}
      <View style={styles.filterBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher par nom, N° patient, matricule, entreprise..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.placeholder}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollRow}>
          {sectorOptions.map(opt => (
            <TouchableOpacity key={opt.value}
              style={[styles.filterChip, filterSector === opt.value && styles.filterChipActive]}
              onPress={() => setFilterSector(opt.value)}>
              <Text style={[styles.filterChipText, filterSector === opt.value && styles.filterChipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollRow}>
          {fitnessOptions.map(opt => (
            <TouchableOpacity key={opt.value}
              style={[styles.filterChip, filterFitness === opt.value && styles.filterChipActive]}
              onPress={() => setFilterFitness(opt.value)}>
              <Text style={[styles.filterChipText, filterFitness === opt.value && styles.filterChipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Patients List */}
      <Text style={styles.resultsCount}>{filteredPatients.length} patient(s) trouvé(s)</Text>
      <View style={styles.patientsList}>
        {filteredPatients.map(p => (
          <PatientCard key={p.id} patient={p} onPress={() => { setSelectedPatient(p); setShowDetail(true); }} />
        ))}
        {filteredPatients.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyText}>Aucun patient trouvé</Text>
            <Text style={styles.emptySubtext}>Ajustez les filtres ou enregistrez un nouveau patient</Text>
          </View>
        )}
      </View>

      {/* Modals */}
      <PatientDetailModal
        visible={showDetail}
        patient={selectedPatient}
        onClose={() => { setShowDetail(false); setSelectedPatient(null); }}
        onEdit={() => { Alert.alert('Info', 'Fonction de modification en cours de développement.'); }}
      />
      <AddPatientModal visible={showAddModal} onClose={() => setShowAddModal(false)} onSave={handleAddPatient} />
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
  statCard: { flex: 1, minWidth: isDesktop ? 140 : 100, backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 16, alignItems: 'center', ...shadows.sm },
  statIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2, textAlign: 'center' },

  filterBar: { gap: 10, marginBottom: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.lg, paddingHorizontal: 14, paddingVertical: 10, gap: 8, borderWidth: 1, borderColor: colors.outline, ...shadows.xs },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  filterScrollRow: { flexGrow: 0 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: borderRadius.full, backgroundColor: colors.surfaceVariant, marginRight: 8 },
  filterChipActive: { backgroundColor: ACCENT },
  filterChipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  filterChipTextActive: { color: '#FFF', fontWeight: '600' },

  resultsCount: { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },

  patientsList: { gap: 12 },
  patientCard: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 16, ...shadows.sm },
  patientCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  patientAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  patientName: { fontSize: 15, fontWeight: '600', color: colors.text },
  patientId: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  fitnessChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: borderRadius.full },
  fitnessChipDot: { width: 7, height: 7, borderRadius: 4 },
  fitnessChipText: { fontSize: 11, fontWeight: '600' },

  patientCardBody: { gap: 8, marginBottom: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.outline },
  patientInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  patientInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  patientInfoText: { fontSize: 13, color: colors.textSecondary },

  riskBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: borderRadius.full },
  riskBadgeText: { fontSize: 11, fontWeight: '600' },

  patientCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.outline },
  ppeRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', flex: 1 },
  ppeMiniTag: { backgroundColor: colors.surfaceVariant, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  ppeMiniTagText: { fontSize: 10, color: colors.textSecondary },
  ppeMoreText: { fontSize: 11, color: colors.textTertiary, alignSelf: 'center' },
  examDate: { fontSize: 11, color: colors.textSecondary },

  overdueBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DC2626', paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  overdueBadgeText: { fontSize: 9, fontWeight: '700', color: '#FFF' },

  emptyState: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
  emptySubtext: { fontSize: 13, color: colors.textTertiary },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, width: isDesktop ? 600 : '100%', maxHeight: '90%', padding: 24, ...shadows.xl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: borderRadius.lg },
  actionBtnText: { fontWeight: '600', fontSize: 14 },

  detailSection: { marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.outline },
  detailSectionTitle: { fontSize: 14, fontWeight: '700', color: ACCENT, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  detailName: { fontSize: 18, fontWeight: '700', color: colors.text },
  detailSubtext: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  detailLabel: { fontSize: 13, color: colors.textSecondary },
  detailValue: { fontSize: 13, fontWeight: '500', color: colors.text, maxWidth: '60%', textAlign: 'right' },

  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  riskTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: borderRadius.full },
  riskTagText: { fontSize: 11, fontWeight: '500' },

  // Form
  formSection: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  formInput: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.outline },
  sectorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sectorChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.surfaceVariant },
  sectorChipText: { fontSize: 11, color: colors.textSecondary },
});
