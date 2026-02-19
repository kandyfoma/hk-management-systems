import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator,
  StyleSheet, Dimensions, Modal, Alert, Platform, RefreshControl,
} from 'react-native';
import { occHealthApi } from '../../../services/OccHealthApiService';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { getTextColor } from '../../../utils/colorContrast';
import {
  SECTOR_PROFILES, OccHealthUtils,
  type IndustrySector, type FitnessStatus, type SectorRiskLevel,
  type ExposureRisk, type PPEType, type ShiftPattern, type JobCategory,
  type OccupationalHealthPatient,
} from '../../../models/OccupationalHealth';
import { OccHealthProtocolService } from '../../../services/OccHealthProtocolService';
import type { OccSector, OccDepartment, OccPosition } from '../../../models/OccHealthProtocol';
import DateInput from '../../../components/DateInput';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const ACCENT = colors.primary;

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
        <View style={[styles.patientAvatar, { backgroundColor: colors.primaryFaded }]}>
          <Ionicons name={sectorProfile.icon as any} size={22} color={colors.primary} />
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
  visible, patient, onClose, onEdit, onDelete
}: { visible: boolean; patient: OccupationalHealthPatient | null; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
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
                <View style={[styles.detailAvatar, { backgroundColor: colors.primaryFaded }]}>
                  <Ionicons name={sectorProfile.icon as any} size={32} color={colors.primary} />
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
                  <View key={i} style={[styles.riskTag, { backgroundColor: colors.errorLight }]}>
                    <Ionicons name="warning-outline" size={12} color={colors.error} />
                    <Text style={[styles.riskTagText, { color: colors.error }]}>{OccHealthUtils.getExposureRiskLabel(risk)}</Text>
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
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.errorLight }]} onPress={onDelete}>
              <Ionicons name="trash-outline" size={18} color={colors.error} />
              <Text style={[styles.actionBtnText, { color: colors.error }]}>Supprimer</Text>
            </TouchableOpacity>
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
}: { visible: boolean; onClose: () => void; onSave: (p: OccupationalHealthPatient) => Promise<boolean> }) {
  const svc = OccHealthProtocolService.getInstance();
  const [saving, setSaving] = useState(false);

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

  // Structured protocol codes
  const [selectedSectorCode, setSelectedSectorCode] = useState<string>('');
  const [selectedDeptCode, setSelectedDeptCode] = useState<string>('');
  const [selectedPositionCode, setSelectedPositionCode] = useState<string>('');

  const occSectors = useMemo(() => svc.getAllSectors(), []);
  const occDepts = useMemo(() => selectedSectorCode ? svc.getDepartmentsBySector(selectedSectorCode) : [], [selectedSectorCode]);
  const occPositions = useMemo(() => selectedDeptCode ? svc.getPositionsByDepartment(selectedDeptCode) : [], [selectedDeptCode]);

  const handleSelectSectorCode = (code: string) => {
    setSelectedSectorCode(code);
    setSelectedDeptCode('');
    setSelectedPositionCode('');
    // Auto-map to IndustrySector if possible
    const sec = svc.getSectorByCode(code);
    if (sec?.industrySectorKey) setSector(sec.industrySectorKey as IndustrySector);
  };
  const handleSelectDept = (code: string) => {
    setSelectedDeptCode(code);
    setSelectedPositionCode('');
    const dept = svc.getDepartmentByCode(code);
    if (dept) setDepartment(dept.name);
  };
  const handleSelectPosition = (code: string) => {
    setSelectedPositionCode(code);
    const pos = svc.getPositionByCode(code);
    if (pos) setJobTitle(pos.name);
  };

  const handleSave = async () => {
    if (saving) return;
    if (!firstName.trim() || !lastName.trim() || !employeeId.trim()) {
      Alert.alert('Erreur', 'Nom, prénom et matricule sont obligatoires.');
      return;
    }
    if (dateOfBirth.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth.trim())) {
      Alert.alert('Erreur', 'La date de naissance doit être au format AAAA-MM-JJ.');
      return;
    }
    setSaving(true);
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
      patientNumber: `PAT-${Date.now()}`,
      registrationDate: now,
      status: 'active',
      createdAt: now,
      accessCount: 0,
      // OH fields
      employeeId: employeeId.trim(),
      company: company.trim() || 'Non spécifié',
      sector,
      site: site.trim() || 'Non spécifié',
      department: department.trim() || department || 'Non spécifié',
      jobTitle: jobTitle.trim() || 'Non spécifié',
      jobCategory: 'other',
      shiftPattern: 'regular',
      hireDate: new Date().toISOString().split('T')[0],
      contractType: 'permanent',
      fitnessStatus: 'pending_evaluation',
      exposureRisks: selectedPositionCode
        ? (svc.getPositionByCode(selectedPositionCode)?.typicalExposures ?? sectorProfile.typicalRisks.slice(0, 3)) as ExposureRisk[]
        : sectorProfile.typicalRisks.slice(0, 3) as ExposureRisk[],
      ppeRequired: selectedPositionCode
        ? (svc.getPositionByCode(selectedPositionCode)?.recommendedPPE ?? []) as PPEType[]
        : [] as PPEType[],
      riskLevel: sectorProfile.riskLevel,
      vaccinationStatus: [],
      // Structured protocol references
      sectorCode: selectedSectorCode || undefined,
      departmentCode: selectedDeptCode || undefined,
      positionCode: selectedPositionCode || undefined,
    };
    try {
      const success = await onSave(newPatient);
      if (!success) return;
      // Reset + close only when persisted successfully
      setFirstName(''); setLastName(''); setEmployeeId(''); setCompany('');
      setSector('mining'); setSite(''); setDepartment(''); setJobTitle('');
      setPhone(''); setDateOfBirth('');
      setSelectedSectorCode(''); setSelectedDeptCode(''); setSelectedPositionCode('');
      onClose();
    } finally {
      setSaving(false);
    }
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
              <View style={styles.formInput}>
                <DateInput
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                  placeholder="AAAA-MM-JJ"
                  format="iso"
                  maximumDate={new Date()}
                />
              </View>
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Téléphone</Text>
              <TextInput style={styles.formInput} value={phone} onChangeText={setPhone} placeholder="+243 XXX XXX XXX" />
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Entreprise</Text>
              <TextInput style={styles.formInput} value={company} onChangeText={setCompany} placeholder="Nom de l'entreprise" />
            </View>
            {/* ── Structured Sector / Department / Position ── */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Secteur (Protocoles Médicaux)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {occSectors.map(s => {
                    const sp = s.industrySectorKey ? SECTOR_PROFILES[s.industrySectorKey as IndustrySector] : null;
                    const isSelected = selectedSectorCode === s.code;
                    return (
                      <TouchableOpacity key={s.code}
                        style={[styles.sectorChip, isSelected && { backgroundColor: (sp?.color || ACCENT) + '20', borderColor: sp?.color || ACCENT }]}
                        onPress={() => handleSelectSectorCode(s.code)}>
                        {sp && <Ionicons name={sp.icon as any} size={14} color={isSelected ? sp.color : colors.textSecondary} />}
                        <Text style={[styles.sectorChipText, isSelected && { color: sp?.color || ACCENT, fontWeight: '600' }]}>{s.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
            {selectedSectorCode !== '' && occDepts.length > 0 && (
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Département</Text>
                <View style={styles.sectorGrid}>
                  {occDepts.map(d => {
                    const isSelected = selectedDeptCode === d.code;
                    return (
                      <TouchableOpacity key={d.code}
                        style={[styles.sectorChip, isSelected && { backgroundColor: ACCENT + '20', borderColor: ACCENT }]}
                        onPress={() => handleSelectDept(d.code)}>
                        <Text style={[styles.sectorChipText, isSelected && { color: ACCENT, fontWeight: '600' }]}>{d.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
            {selectedDeptCode !== '' && occPositions.length > 0 && (
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Poste (Protocole Auto-détecté)</Text>
                <View style={styles.sectorGrid}>
                  {occPositions.map(p => {
                    const isSelected = selectedPositionCode === p.code;
                    return (
                      <TouchableOpacity key={p.code}
                        style={[styles.sectorChip, isSelected && { backgroundColor: ACCENT + '20', borderColor: ACCENT }]}
                        onPress={() => handleSelectPosition(p.code)}>
                        <Text style={[styles.sectorChipText, isSelected && { color: ACCENT, fontWeight: '600' }]}>{p.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {selectedPositionCode && (
                  <View style={{ marginTop: 6, padding: 8, backgroundColor: colors.successLight, borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, color: colors.secondary, fontWeight: '600' }}>
                      ✓ {svc.getAvailableVisitTypes(selectedPositionCode).length} protocole(s) disponible(s) pour ce poste
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                      {svc.getPositionBreadcrumb(selectedPositionCode)}
                    </Text>
                  </View>
                )}
              </View>
            )}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Site</Text>
              <TextInput style={styles.formInput} value={site} onChangeText={setSite} placeholder="Nom du site" />
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Département (texte libre)</Text>
              <TextInput style={styles.formInput} value={department} onChangeText={setDepartment} placeholder="ex: Opérations Souterraines" />
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Intitulé Poste</Text>
              <TextInput style={styles.formInput} value={jobTitle} onChangeText={setJobTitle} placeholder="Intitulé du poste" />
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surfaceVariant }]} onPress={onClose}>
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: ACCENT }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="save-outline" size={18} color="#FFF" />}
              <Text style={[styles.actionBtnText, { color: '#FFF' }]}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Dropdown Picker ─────────────────────────────────────────
function DropdownPicker({
  label, value, displayValue, options, onSelect, disabled, placeholder, accentColor,
}: {
  label: string;
  value: string;
  displayValue: string;
  options: { value: string; label: string; sublabel?: string }[];
  onSelect: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  accentColor?: string;
}) {
  const [open, setOpen] = useState(false);
  const accent = accentColor ?? ACCENT;
  return (
    <View style={styles.formSection}>
      <Text style={styles.formLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.ddTrigger, disabled && styles.ddDisabled, open && { borderColor: accent }]}
        onPress={() => !disabled && setOpen(o => !o)}
        activeOpacity={0.7}
      >
        <Text style={[styles.ddValue, !value && { color: colors.placeholder ?? colors.textTertiary }]} numberOfLines={1}>
          {displayValue || placeholder || 'Sélectionner...'}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={disabled ? colors.textTertiary : colors.textSecondary} />
      </TouchableOpacity>
      {open && (
        <View style={styles.ddList}>
          <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
            <TouchableOpacity style={styles.ddItem} onPress={() => { onSelect(''); setOpen(false); }}>
              <Text style={[styles.ddItemText, { color: colors.textTertiary, fontStyle: 'italic' }]}>— Aucun —</Text>
            </TouchableOpacity>
            {options.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.ddItem, opt.value === value && { backgroundColor: accent + '14' }]}
                onPress={() => { onSelect(opt.value); setOpen(false); }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ddItemText, opt.value === value && { color: accent, fontWeight: '600' }]}>{opt.label}</Text>
                  {opt.sublabel ? <Text style={styles.ddItemSub}>{opt.sublabel}</Text> : null}
                </View>
                {opt.value === value && <Ionicons name="checkmark" size={14} color={accent} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ─── Edit Patient Modal ──────────────────────────────────────
function EditPatientModal({
  visible, patient, onClose, onSave,
}: {
  visible: boolean;
  patient: OccupationalHealthPatient | null;
  onClose: () => void;
  onSave: (p: OccupationalHealthPatient) => Promise<boolean>;
}) {
  const svc = OccHealthProtocolService.getInstance();
  const [saving, setSaving] = useState(false);

  // — Identity & Contact
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  // — Employment
  const [employeeId, setEmployeeId] = useState('');
  const [company, setCompany] = useState('');
  const [site, setSite] = useState('');
  const [department, setDepartment] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobCategory, setJobCategory] = useState('');
  const [shiftPattern, setShiftPattern] = useState('');
  const [contractType, setContractType] = useState('');
  const [hireDate, setHireDate] = useState('');
  // — Protocol hierarchy
  const [selectedSectorCode, setSelectedSectorCode] = useState('');
  const [selectedDeptCode, setSelectedDeptCode] = useState('');
  const [selectedPositionCode, setSelectedPositionCode] = useState('');
  // — Medical
  const [fitnessStatus, setFitnessStatus] = useState<string>('pending_evaluation');
  const [lastMedicalExam, setLastMedicalExam] = useState('');
  const [nextMedicalExam, setNextMedicalExam] = useState('');
  const [allergiesText, setAllergiesText] = useState('');
  const [chronicText, setChronicText] = useState('');
  const [medicationsText, setMedicationsText] = useState('');

  // Derived protocol lists
  const occSectors = useMemo(() => svc.getAllSectors(), [svc]);
  const occDepts = useMemo(() => selectedSectorCode ? svc.getDepartmentsBySector(selectedSectorCode) : [], [selectedSectorCode, svc]);
  const occPositions = useMemo(() => selectedDeptCode ? svc.getPositionsByDepartment(selectedDeptCode) : [], [selectedDeptCode, svc]);
  const selectedPosition = useMemo(() => selectedPositionCode ? occPositions.find(p => p.code === selectedPositionCode) : undefined, [occPositions, selectedPositionCode]);

  useEffect(() => {
    if (!patient) return;
    setFirstName(patient.firstName);
    setLastName(patient.lastName);
    setPhone(patient.phone ?? '');
    setEmail(patient.email ?? '');
    setAddress(patient.address ?? '');
    setCity(patient.city ?? '');
    setEmergencyContactName(patient.emergencyContactName ?? '');
    setEmergencyContactPhone(patient.emergencyContactPhone ?? '');
    setDateOfBirth(patient.dateOfBirth ?? '');
    setGender(patient.gender ?? '');
    setEmployeeId(patient.employeeId ?? '');
    setCompany(patient.company ?? '');
    setSite(patient.site ?? '');
    setDepartment(patient.department ?? '');
    setJobTitle(patient.jobTitle ?? '');
    setJobCategory(patient.jobCategory ?? '');
    setShiftPattern(patient.shiftPattern ?? '');
    setContractType((patient as any).contractType ?? '');
    setHireDate(patient.hireDate ?? '');
    setFitnessStatus(patient.fitnessStatus ?? 'pending_evaluation');
    setLastMedicalExam(patient.lastMedicalExam ?? '');
    setNextMedicalExam(patient.nextMedicalExam ?? '');
    setAllergiesText((patient.allergies ?? []).join(', '));
    setChronicText((patient.chronicConditions ?? []).join(', '));
    setMedicationsText((patient.currentMedications ?? []).join(', '));
    setSelectedSectorCode(patient.sectorCode ?? '');
    setSelectedDeptCode(patient.departmentCode ?? '');
    setSelectedPositionCode(patient.positionCode ?? '');
  }, [patient]);

  if (!patient) return null;

  const FITNESS_OPTIONS = [
    { value: 'fit', label: 'Apte' },
    { value: 'fit_with_restrictions', label: 'Apte avec restrictions' },
    { value: 'temporarily_unfit', label: 'Inapte temporaire' },
    { value: 'permanently_unfit', label: 'Inapte définitif' },
    { value: 'pending_evaluation', label: 'En attente' },
  ];

  const GENDER_OPTIONS = [
    { value: 'male', label: 'Homme' },
    { value: 'female', label: 'Femme' },
    { value: 'other', label: 'Autre' },
  ];

  const JOB_CATEGORY_OPTIONS = [
    { value: 'underground_miner', label: 'Mineur Souterrain', sublabel: 'Mining' },
    { value: 'surface_miner', label: 'Mineur de Surface', sublabel: 'Mining' },
    { value: 'machine_operator', label: 'Opérateur Machine', sublabel: 'Industrie' },
    { value: 'electrician', label: 'Électricien' },
    { value: 'welder', label: 'Soudeur' },
    { value: 'mechanic', label: 'Mécanicien' },
    { value: 'construction_worker', label: 'Ouvrier Construction', sublabel: 'BTP' },
    { value: 'civil_engineer', label: 'Ingénieur Civil' },
    { value: 'nurse', label: 'Infirmier(ère)', sublabel: 'Santé' },
    { value: 'doctor', label: 'Médecin', sublabel: 'Santé' },
    { value: 'lab_technician', label: 'Technicien de Labo' },
    { value: 'cashier', label: 'Caissier(ère)', sublabel: 'Finance' },
    { value: 'bank_teller', label: 'Guichetier(ère)', sublabel: 'Finance' },
    { value: 'financial_analyst', label: 'Analyste Financier' },
    { value: 'accountant', label: 'Comptable' },
    { value: 'driver', label: 'Chauffeur / Conducteur' },
    { value: 'quality_inspector', label: 'Contrôleur Qualité' },
    { value: 'safety_officer', label: 'Responsable HSE' },
    { value: 'office_worker', label: 'Employé de Bureau' },
    { value: 'manager', label: 'Manager / Cadre' },
    { value: 'security_guard', label: 'Agent de Sécurité' },
    { value: 'cleaner', label: 'Agent d\'Entretien' },
    { value: 'it_technician', label: 'Technicien Informatique', sublabel: 'IT' },
    { value: 'agricultural_worker', label: 'Ouvrier Agricole', sublabel: 'Agriculture' },
    { value: 'other_job', label: 'Autre poste' },
  ];

  const SHIFT_OPTIONS = [
    { value: 'day_shift', label: 'Équipe de Jour' },
    { value: 'night_shift', label: 'Équipe de Nuit' },
    { value: 'rotating', label: 'Rotation (Jour/Nuit)' },
    { value: 'on_call', label: 'Astreinte / On Call' },
    { value: 'regular', label: 'Horaires Réguliers' },
    { value: 'flexible', label: 'Horaires Flexibles' },
    { value: 'split_shift', label: 'Horaire Coupé' },
  ];

  const CONTRACT_OPTIONS = [
    { value: 'permanent', label: 'CDI — Contrat Permanent' },
    { value: 'contract', label: 'CDD — Contrat à Durée Déterminée' },
    { value: 'seasonal', label: 'Saisonnier' },
    { value: 'intern', label: 'Stagiaire / Intern' },
    { value: 'daily_worker', label: 'Journalier' },
  ];

  const sectorOptions = occSectors.map(s => ({ value: s.code, label: s.name }));
  const deptOptions = occDepts.map(d => ({ value: d.code, label: d.name, sublabel: `${d.positions?.length ?? 0} poste(s)` }));
  const positionOptions = occPositions.map(p => ({
    value: p.code,
    label: p.name,
    sublabel: p.protocols?.length ? `${p.protocols.length} protocole(s)` : undefined,
  }));

  const sectorDisplayValue = occSectors.find(s => s.code === selectedSectorCode)?.name ?? '';
  const deptDisplayValue = occDepts.find(d => d.code === selectedDeptCode)?.name ?? '';
  const positionDisplayValue = occPositions.find(p => p.code === selectedPositionCode)?.name ?? '';
  const jobCatDisplayValue = JOB_CATEGORY_OPTIONS.find(o => o.value === jobCategory)?.label ?? '';
  const shiftDisplayValue = SHIFT_OPTIONS.find(o => o.value === shiftPattern)?.label ?? '';
  const contractDisplayValue = CONTRACT_OPTIONS.find(o => o.value === contractType)?.label ?? '';
  const genderDisplayValue = GENDER_OPTIONS.find(o => o.value === gender)?.label ?? '';

  const handleSave = async () => {
    if (saving) return;
    if (!firstName.trim() || !lastName.trim() || !employeeId.trim()) {
      Alert.alert('Erreur', 'Nom, prénom et matricule sont obligatoires.');
      return;
    }
    if (dateOfBirth.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth.trim())) {
      Alert.alert('Erreur', 'La date de naissance doit être au format AAAA-MM-JJ.');
      return;
    }
    if (hireDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(hireDate.trim())) {
      Alert.alert('Erreur', 'La date d\'embauche doit être au format AAAA-MM-JJ.');
      return;
    }
    if (lastMedicalExam.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(lastMedicalExam.trim())) {
      Alert.alert('Erreur', 'Le dernier examen médical doit être au format AAAA-MM-JJ.');
      return;
    }
    if (nextMedicalExam.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(nextMedicalExam.trim())) {
      Alert.alert('Erreur', 'Le prochain examen médical doit être au format AAAA-MM-JJ.');
      return;
    }
    setSaving(true);
    // Resolve sector from protocol if available
    const resolvedSector = selectedSectorCode
      ? (occSectors.find(s => s.code === selectedSectorCode)?.industrySectorKey as IndustrySector ?? patient.sector)
      : patient.sector;
    // Auto-fill from position data if available
    const resolvedExposures = selectedPosition?.typicalExposures as ExposureRisk[] ?? patient.exposureRisks;
    const resolvedPPE = selectedPosition?.recommendedPPE as PPEType[] ?? patient.ppeRequired;
    const resolvedRiskLevel = selectedSectorCode
      ? (SECTOR_PROFILES[resolvedSector]?.riskLevel ?? patient.riskLevel)
      : patient.riskLevel;
    const allergies = allergiesText.split(',').map(v => v.trim()).filter(Boolean);
    const chronicConditions = chronicText.split(',').map(v => v.trim()).filter(Boolean);
    const currentMedications = medicationsText.split(',').map(v => v.trim()).filter(Boolean);
    const updated: OccupationalHealthPatient = {
      ...patient,
      firstName: firstName.trim() || patient.firstName,
      lastName: lastName.trim() || patient.lastName,
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      city: city.trim(),
      emergencyContactName: emergencyContactName.trim(),
      emergencyContactPhone: emergencyContactPhone.trim(),
      dateOfBirth: dateOfBirth.trim() || patient.dateOfBirth,
      gender: (gender as any) || patient.gender,
      employeeId: employeeId.trim() || patient.employeeId,
      company: company.trim() || patient.company,
      site: site.trim() || patient.site,
      department: department.trim() || patient.department,
      jobTitle: jobTitle.trim() || patient.jobTitle,
      jobCategory: (jobCategory as JobCategory) || patient.jobCategory,
      shiftPattern: (shiftPattern as ShiftPattern) || patient.shiftPattern,
      contractType: (contractType as any) || (patient as any).contractType,
      hireDate: hireDate.trim() || patient.hireDate,
      sector: resolvedSector,
      sectorCode: selectedSectorCode || undefined,
      departmentCode: selectedDeptCode || undefined,
      positionCode: selectedPositionCode || undefined,
      fitnessStatus: fitnessStatus as FitnessStatus,
      lastMedicalExam: lastMedicalExam.trim() || undefined,
      nextMedicalExam: nextMedicalExam.trim() || undefined,
      exposureRisks: resolvedExposures,
      ppeRequired: resolvedPPE,
      riskLevel: resolvedRiskLevel,
      allergies,
      chronicConditions,
      currentMedications,
    };
    try {
      const success = await onSave(updated);
      if (success) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: '92%' }]}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier — {patient.firstName} {patient.lastName}</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.textSecondary} /></TouchableOpacity>
            </View>

            {/* ── Section: Identité ── */}
            <Text style={styles.editSectionLabel}>Identité & Contact</Text>

            {[
              { label: 'Prénom *', value: firstName, set: setFirstName },
              { label: 'Nom *', value: lastName, set: setLastName },
              { label: 'Téléphone', value: phone, set: setPhone },
              { label: 'Email', value: email, set: setEmail, placeholder: 'prenom.nom@entreprise.cd' },
              { label: 'Adresse', value: address, set: setAddress },
              { label: 'Ville', value: city, set: setCity },
              { label: 'Contact urgence — nom', value: emergencyContactName, set: setEmergencyContactName },
              { label: 'Contact urgence — téléphone', value: emergencyContactPhone, set: setEmergencyContactPhone },
            ].map(f => (
              <View key={f.label} style={styles.formSection}>
                <Text style={styles.formLabel}>{f.label}</Text>
                <TextInput
                  style={styles.formInput}
                  value={f.value}
                  onChangeText={f.set}
                  placeholder={(f as any).placeholder ?? ''}
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            ))}

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Date de naissance (AAAA-MM-JJ)</Text>
              <View style={styles.formInput}>
                <DateInput
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                  placeholder="1985-03-15"
                  placeholderTextColor={colors.textTertiary}
                  format="iso"
                  maximumDate={new Date()}
                />
              </View>
            </View>

            <DropdownPicker
              label="Genre"
              value={gender}
              displayValue={genderDisplayValue}
              options={GENDER_OPTIONS}
              onSelect={setGender}
              placeholder="Sélectionner le genre..."
            />

            {/* ── Section: Emploi ── */}
            <Text style={styles.editSectionLabel}>Emploi</Text>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Matricule Employé *</Text>
              <TextInput style={styles.formInput} value={employeeId} onChangeText={setEmployeeId} placeholder="EMP-001" placeholderTextColor={colors.textTertiary} />
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Entreprise</Text>
              <TextInput style={styles.formInput} value={company} onChangeText={setCompany} />
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Site de travail</Text>
              <TextInput style={styles.formInput} value={site} onChangeText={setSite} />
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Date d'embauche (AAAA-MM-JJ)</Text>
              <View style={styles.formInput}>
                <DateInput
                  value={hireDate}
                  onChangeText={setHireDate}
                  placeholder="2020-01-15"
                  placeholderTextColor={colors.textTertiary}
                  format="iso"
                />
              </View>
            </View>

            <DropdownPicker
              label="Type de contrat"
              value={contractType}
              displayValue={contractDisplayValue}
              options={CONTRACT_OPTIONS}
              onSelect={setContractType}
              placeholder="Sélectionner le contrat..."
            />

            <DropdownPicker
              label="Rythme / Horaires"
              value={shiftPattern}
              displayValue={shiftDisplayValue}
              options={SHIFT_OPTIONS}
              onSelect={setShiftPattern}
              placeholder="Sélectionner les horaires..."
            />

            {/* ── Section: Protocole Médecine du Travail ── */}
            <Text style={styles.editSectionLabel}>Protocole — Médecine du Travail</Text>

            <DropdownPicker
              label="Secteur d'activité"
              value={selectedSectorCode}
              displayValue={sectorDisplayValue}
              options={sectorOptions}
              onSelect={code => {
                setSelectedSectorCode(code);
                setSelectedDeptCode('');
                setSelectedPositionCode('');
              }}
              placeholder="Sélectionner le secteur..."
            />

            <DropdownPicker
              label="Département (protocole)"
              value={selectedDeptCode}
              displayValue={deptDisplayValue}
              options={deptOptions}
              onSelect={code => {
                setSelectedDeptCode(code);
                setSelectedPositionCode('');
              }}
              disabled={!selectedSectorCode}
              placeholder={selectedSectorCode ? 'Sélectionner le département...' : 'Choisir un secteur d\'abord'}
            />

            <DropdownPicker
              label="Poste de travail"
              value={selectedPositionCode}
              displayValue={positionDisplayValue}
              options={positionOptions}
              onSelect={code => {
                setSelectedPositionCode(code);
                const pos = occPositions.find(p => p.code === code);
                if (pos) {
                  setJobTitle(pos.name);
                  const dept = occDepts.find(d => d.code === selectedDeptCode);
                  if (dept) setDepartment(dept.name);
                }
              }}
              disabled={!selectedDeptCode}
              placeholder={selectedDeptCode ? 'Sélectionner le poste...' : 'Choisir un département d\'abord'}
            />

            {/* Auto-fill info banner when position selected */}
            {selectedPosition && (
              <View style={styles.protocolBanner}>
                <Ionicons name="shield-checkmark-outline" size={16} color={ACCENT} />
                <Text style={styles.protocolBannerText}>
                  Poste sélectionné · {selectedPosition.protocols?.length ?? 0} protocole(s) d'examen associé(s)
                  {selectedPosition.typicalExposures?.length ? ` · ${selectedPosition.typicalExposures.length} risque(s) d'exposition` : ''}
                </Text>
              </View>
            )}

            {/* Intitulé Poste — editable even after auto-fill */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Intitulé du Poste (libre)</Text>
              <TextInput style={styles.formInput} value={jobTitle} onChangeText={setJobTitle} />
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Département (libre)</Text>
              <TextInput style={styles.formInput} value={department} onChangeText={setDepartment} />
            </View>

            <DropdownPicker
              label="Catégorie de poste"
              value={jobCategory}
              displayValue={jobCatDisplayValue}
              options={JOB_CATEGORY_OPTIONS}
              onSelect={setJobCategory}
              placeholder="Sélectionner la catégorie..."
            />

            {/* ── Section: Suivi Médical ── */}
            <Text style={styles.editSectionLabel}>Suivi Médical</Text>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Statut d'Aptitude</Text>
              <View style={styles.sectorGrid}>
                {FITNESS_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.sectorChip, fitnessStatus === opt.value && { backgroundColor: ACCENT + '20', borderColor: ACCENT }]}
                    onPress={() => setFitnessStatus(opt.value)}
                  >
                    <Text style={[styles.sectorChipText, fitnessStatus === opt.value && { color: ACCENT, fontWeight: '600' }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Dernier examen médical (AAAA-MM-JJ)</Text>
              <View style={styles.formInput}>
                <DateInput
                  value={lastMedicalExam}
                  onChangeText={setLastMedicalExam}
                  placeholder="2024-01-15"
                  placeholderTextColor={colors.textTertiary}
                  format="iso"
                />
              </View>
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Prochain examen médical (AAAA-MM-JJ)</Text>
              <View style={styles.formInput}>
                <DateInput
                  value={nextMedicalExam}
                  onChangeText={setNextMedicalExam}
                  placeholder="2025-01-15"
                  placeholderTextColor={colors.textTertiary}
                  format="iso"
                />
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Allergies (séparées par virgule)</Text>
              <TextInput
                style={styles.formInput}
                value={allergiesText}
                onChangeText={setAllergiesText}
                placeholder="Pénicilline, Latex"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Conditions chroniques (séparées par virgule)</Text>
              <TextInput
                style={styles.formInput}
                value={chronicText}
                onChangeText={setChronicText}
                placeholder="Asthme, HTA"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Médications actuelles (séparées par virgule)</Text>
              <TextInput
                style={styles.formInput}
                value={medicationsText}
                onChangeText={setMedicationsText}
                placeholder="Salbutamol, Metformine"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surfaceVariant }]} onPress={onClose}>
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: ACCENT }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="save-outline" size={18} color="#FFF" />}
              <Text style={[styles.actionBtnText, { color: '#FFF' }]}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────
export function OHPatientsScreen() {
  const [patients, setPatients] = useState<OccupationalHealthPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSector, setFilterSector] = useState<IndustrySector | 'all'>('all');
  const [filterFitness, setFilterFitness] = useState<FitnessStatus | 'all'>('all');
  const [selectedPatient, setSelectedPatient] = useState<OccupationalHealthPatient | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  // Bootstrap protocol data from API on mount
  useEffect(() => {
    OccHealthProtocolService.getInstance().loadFromApi().catch(() => {});
  }, []);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await occHealthApi.listWorkers();
      if (error) {
        setLoadError(error);
        console.warn('[OHPatientsScreen] API load failed:', error);
      } else {
        setPatients(data);
      }
    } catch (err: any) {
      setLoadError(err?.message ?? 'Erreur de connexion au serveur');
      console.error('Failed to load patients:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPatients();
    setRefreshing(false);
  }, [loadPatients]);

  const handleAddPatient = async (p: OccupationalHealthPatient): Promise<boolean> => {
    if (isMutating) return false;
    setIsMutating(true);
    try {
      const { data, error } = await occHealthApi.createWorker(p);
      if (!error && data) {
        await loadPatients();
        Alert.alert('Succès', `${p.firstName} ${p.lastName} enregistré(e).`);
        return true;
      }
      Alert.alert('Erreur', error ?? 'Impossible de créer le patient. Vérifiez la connexion au serveur.');
      return false;
    } finally {
      setIsMutating(false);
    }
  };

  const handleEditPatient = async (updated: OccupationalHealthPatient): Promise<boolean> => {
    if (isMutating) return false;
    setIsMutating(true);
    try {
      const { data, error } = await occHealthApi.updateWorker(updated.id, updated);
      if (!error && data) {
        await loadPatients();
        setShowDetail(false);
        setSelectedPatient(null);
        Alert.alert('Succès', 'Dossier mis à jour.');
        return true;
      }
      Alert.alert('Erreur', error ?? 'Impossible de mettre à jour. Vérifiez la connexion au serveur.');
      return false;
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeletePatient = (id: string) => {
    if (isMutating) return;
    Alert.alert('Confirmer la suppression', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          if (isMutating) return;
          setIsMutating(true);
          try {
            const { error } = await occHealthApi.deleteWorker(id);
            if (error) {
              Alert.alert('Erreur', error ?? 'Impossible de supprimer ce patient.');
              return;
            }
            setShowDetail(false);
            setSelectedPatient(null);
            await loadPatients();
          } finally {
            setIsMutating(false);
          }
        },
      },
    ]);
  };

  // ─── Bulk Import Functions ───────────────────────────────────
  const downloadTemplate = async () => {
    try {
      const templateData = [
        {
          firstName: 'Jean',
          lastName: 'Dupont',
          employeeId: 'EMP-001',
          dateOfBirth: '1985-03-15',
          gender: 'male',
          phone: '+243812345678',
          email: 'jean.dupont@entreprise.cd',
          company: 'Exemple Entreprise SA',
          sector: 'mining',
          site: 'Site Principal',
          department: 'Production',
          jobTitle: 'Opérateur',
          jobCategory: 'machine_operator',
          hireDate: '2020-01-15',
          contractType: 'permanent',
          emergencyContactName: 'Marie Dupont',
          emergencyContactPhone: '+243821234567',
          address: '12 Ave Kasavubu, Lubumbashi',
        },
        {
          firstName: 'Marie',
          lastName: 'Kabila',
          employeeId: 'EMP-002',
          dateOfBirth: '1990-07-22',
          gender: 'female',
          phone: '+243821456789',
          email: 'marie.kabila@entreprise.cd',
          company: 'Exemple Entreprise SA',
          sector: 'manufacturing',
          site: 'Site Secondaire',
          department: 'Qualité',
          jobTitle: 'Contrôleur Qualité',
          jobCategory: 'quality_inspector',
          hireDate: '2019-06-01',
          contractType: 'permanent',
          emergencyContactName: 'Paul Kabila',
          emergencyContactPhone: '+243833456789',
          address: '45 Ave Mobutu, Kinshasa',
        },
        {
          firstName: 'Patrick',
          lastName: 'Mutombo',
          employeeId: 'EMP-003',
          dateOfBirth: '1988-11-08',
          gender: 'male',
          phone: '+243833567890',
          email: 'patrick.mutombo@banque.cd',
          company: 'Rawbank S.A.',
          sector: 'banking_finance',
          site: 'Siège Social',
          department: 'Opérations',
          jobTitle: 'Analyste Financier',
          jobCategory: 'financial_analyst',
          hireDate: '2018-03-10',
          contractType: 'permanent',
          emergencyContactName: 'Jeanne Mutombo',
          emergencyContactPhone: '+243844678901',
          address: '78 Blvd 30 Juin, Kinshasa',
        },
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(templateData);
      XLSX.utils.book_append_sheet(wb, ws, 'Patients_Template');
      
      // Add instructions sheet
      const instructions = [
        { Colonne: 'firstName', Description: 'Prénom du patient (OBLIGATOIRE)', Exemple: 'Jean' },
        { Colonne: 'lastName', Description: 'Nom de famille (OBLIGATOIRE)', Exemple: 'Dupont' },
        { Colonne: 'employeeId', Description: 'Matricule employé (OBLIGATOIRE, unique)', Exemple: 'EMP-001' },
        { Colonne: 'dateOfBirth', Description: 'Date de naissance (AAAA-MM-JJ)', Exemple: '1985-03-15' },
        { Colonne: 'gender', Description: 'Genre: male, female, other', Exemple: 'male' },
        { Colonne: 'phone', Description: 'Téléphone', Exemple: '+243812345678' },
        { Colonne: 'email', Description: 'Email', Exemple: 'jean@mail.com' },
        { Colonne: 'company', Description: 'Nom de l\'entreprise', Exemple: 'Kamoto Copper Company' },
        { Colonne: 'sector', Description: 'Secteur: mining, construction, manufacturing, healthcare, banking_finance, telecom_it, agriculture, oil_gas, etc.', Exemple: 'mining' },
        { Colonne: 'site', Description: 'Nom du site de travail', Exemple: 'Site Kamoto Principal' },
        { Colonne: 'department', Description: 'Département', Exemple: 'Production' },
        { Colonne: 'jobTitle', Description: 'Intitulé du poste', Exemple: 'Opérateur Machine' },
        { Colonne: 'jobCategory', Description: 'Catégorie: machine_operator, underground_miner, nurse, financial_analyst, driver, office_worker, other_job', Exemple: 'machine_operator' },
        { Colonne: 'hireDate', Description: 'Date d\'embauche (AAAA-MM-JJ)', Exemple: '2020-01-15' },
        { Colonne: 'contractType', Description: 'Type: permanent, contract, seasonal, intern, daily_worker', Exemple: 'permanent' },
        { Colonne: 'emergencyContactName', Description: 'Contact d\'urgence — nom', Exemple: 'Marie Dupont' },
        { Colonne: 'emergencyContactPhone', Description: 'Contact d\'urgence — téléphone', Exemple: '+243821234567' },
        { Colonne: 'address', Description: 'Adresse', Exemple: '12 Ave Kasavubu, Lubumbashi' },
      ];
      const wsInstructions = XLSX.utils.json_to_sheet(instructions);
      XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');
      
      const fileName = `patients_oh_template_${new Date().toISOString().split('T')[0]}.xlsx`;

      if (Platform.OS === 'web') {
        XLSX.writeFile(wb, fileName);
        Alert.alert('Succès', `Modèle téléchargé: ${fileName}`);
      } else {
        const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        
        await FileSystem.writeAsStringAsync(fileUri, wbout, { encoding: FileSystem.EncodingType.Base64 });
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert('Succès', `Modèle téléchargé: ${fileName}`);
        }
      }
    } catch (error) {
      console.error('Template download error:', error);
      Alert.alert('Erreur', 'Impossible de télécharger le modèle');
    }
  };

  const handleBulkImport = async () => {
    try {
      const pickerResult = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
        ],
        copyToCacheDirectory: true,
      });

      if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) return;

      const file = pickerResult.assets[0];
      setImportLoading(true);
      setImportResult(null);
      setShowImportModal(true);

      let data: any[];

      if (Platform.OS === 'web') {
        const response = await fetch(file.uri);
        const ab = await response.arrayBuffer();
        const wb = XLSX.read(ab, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
      } else {
        const base64 = await FileSystem.readAsStringAsync(file.uri, { 
          encoding: FileSystem.EncodingType.Base64
        });
        const wb = XLSX.read(base64, { type: 'base64' });
        const sheetName = wb.SheetNames[0];
        data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
      }

      if (!data || data.length === 0) {
        setImportLoading(false);
        setImportResult({ 
          error: 'Le fichier est vide ou ne contient pas de données valides.' 
        });
        return;
      }

      // Validate minimum required fields
      const validRows = data.filter((row: any) => 
        row.firstName && String(row.firstName).trim() &&
        row.lastName && String(row.lastName).trim() &&
        row.employeeId && String(row.employeeId).trim()
      );
      const invalidCount = data.length - validRows.length;

      if (validRows.length === 0) {
        setImportLoading(false);
        setImportResult({
          error: 'Aucune ligne valide trouvée. Vérifiez que les colonnes firstName, lastName et employeeId sont renseignées.',
          totalRows: data.length,
          invalidRows: invalidCount,
        });
        return;
      }

      // Convert to backend worker format for bulk import API
      const workersForApi = validRows.map((row: any) => ({
        employee_id: String(row.employeeId).trim(),
        first_name: String(row.firstName).trim(),
        last_name: String(row.lastName).trim(),
        date_of_birth: row.dateOfBirth || '1990-01-01',
        gender: row.gender || 'male',
        phone: row.phone ? String(row.phone).trim() : '',
        email: row.email ? String(row.email).trim() : '',
        address: row.address ? String(row.address).trim() : '',
        emergency_contact_name: row.emergencyContactName ? String(row.emergencyContactName).trim() : '',
        emergency_contact_phone: row.emergencyContactPhone ? String(row.emergencyContactPhone).trim() : '',
        company: row.company ? String(row.company).trim() : 'Non spécifié',
        sector: row.sector || 'other',
        site: row.site ? String(row.site).trim() : '',
        department: row.department ? String(row.department).trim() : '',
        job_title: row.jobTitle ? String(row.jobTitle).trim() : 'Non spécifié',
        job_category: row.jobCategory || 'other_job',
        hire_date: row.hireDate || new Date().toISOString().split('T')[0],
        contract_type: row.contractType || 'permanent',
      }));

      // Send to backend bulk-import endpoint
      const importApiResult = await occHealthApi.bulkImportWorkers(workersForApi);

      if (!importApiResult.error) {
        await loadPatients();
        setImportResult({
          success: true,
          totalRows: data.length,
          validRows: validRows.length,
          invalidRows: invalidCount,
          processedRows: importApiResult.created + importApiResult.updated,
          created: importApiResult.created,
          updated: importApiResult.updated,
          apiErrors: importApiResult.errors,
          errorDetails: importApiResult.errorDetails,
        });
      } else {
        // API failed — fallback to local storage
        const now = new Date().toISOString();
        const newPatients: OccupationalHealthPatient[] = validRows.map((row: any) => {
          const sector = (row.sector as IndustrySector) || 'other';
          const sectorProfile = SECTOR_PROFILES[sector];
          return {
            id: `import-${Date.now()}-${Math.random()}`,
            firstName: String(row.firstName).trim(),
            lastName: String(row.lastName).trim(),
            middleName: row.middleName ? String(row.middleName).trim() : '',
            dateOfBirth: row.dateOfBirth || '1990-01-01',
            gender: (row.gender as 'male' | 'female' | 'other') || 'male',
            phone: row.phone ? String(row.phone).trim() : '',
            email: row.email ? String(row.email).trim() : '',
            address: row.address ? String(row.address).trim() : '',
            city: row.city ? String(row.city).trim() : '',
            emergencyContactName: row.emergencyContactName ? String(row.emergencyContactName).trim() : '',
            emergencyContactPhone: row.emergencyContactPhone ? String(row.emergencyContactPhone).trim() : '',
            allergies: [],
            chronicConditions: [],
            currentMedications: [],
            patientNumber: `PAT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            registrationDate: now,
            status: 'active',
            createdAt: now,
            accessCount: 0,
            employeeId: String(row.employeeId).trim(),
            company: row.company ? String(row.company).trim() : 'Non spécifié',
            sector,
            site: row.site ? String(row.site).trim() : 'Non spécifié',
            department: row.department ? String(row.department).trim() : 'Non spécifié',
            jobTitle: row.jobTitle ? String(row.jobTitle).trim() : 'Non spécifié',
            jobCategory: 'other',
            shiftPattern: (row.shiftPattern as ShiftPattern) || 'regular',
            hireDate: row.hireDate || new Date().toISOString().split('T')[0],
            contractType: row.contractType || 'permanent',
            fitnessStatus: 'pending_evaluation',
            exposureRisks: sectorProfile.typicalRisks.slice(0, 3) as ExposureRisk[],
            ppeRequired: [] as PPEType[],
            riskLevel: sectorProfile.riskLevel,
            vaccinationStatus: [],
          };
        });
        
        setPatients(prev => [...newPatients, ...prev]);
        
        setImportResult({
          success: true,
          totalRows: data.length,
          validRows: validRows.length,
          invalidRows: invalidCount,
          processedRows: newPatients.length,
          localOnly: true,
        });
      }

      setImportLoading(false);
      
      // Find appropriate success message based on import path
      let importedCount = 0;
      if (importResult?.processedRows) {
        importedCount = importResult.processedRows;
      } else if (importResult?.created || importResult?.updated) {
        importedCount = (importResult.created || 0) + (importResult.updated || 0);
      }
      
      Alert.alert('Import réussi', `${importedCount} patient(s) ont été importés avec succès.`);
      
    } catch (error: any) {
      console.error('Import error:', error);
      setImportLoading(false);
      if (error?.message?.includes('cancel') || error?.code === 'ERR_CANCELED') return;
      
      let errorMessage = 'Erreur lors de la lecture du fichier: ';
      if (error?.message?.includes('network')) {
        errorMessage = 'Erreur de connexion réseau. Vérifiez votre connexion internet.';
      } else if (error?.message?.includes('permission')) {
        errorMessage = 'Erreur de permissions. Vérifiez les autorisations du fichier.';
      } else {
        errorMessage += (error?.message || 'Inconnue');
      }
      
      setImportResult({ error: errorMessage });
      setShowImportModal(true);
    }
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
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[ACCENT]}
          tintColor={ACCENT}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.screenTitle}>Patients — Santé au Travail</Text>
            {refreshing && (
              <View style={styles.syncIndicator}>
                <Ionicons name="sync" size={16} color={ACCENT} />
                <Text style={styles.syncText}>Synchronisation...</Text>
              </View>
            )}
          </View>
          <Text style={styles.screenSubtitle}>Registre des patients par secteur d'activité et entreprise</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.importButton} onPress={downloadTemplate}>
            <Ionicons name="download-outline" size={18} color="#FFF" />
            <Text style={styles.importButtonText}>Télécharger Modèle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.importButton} onPress={handleBulkImport}>
            <Ionicons name="cloud-upload-outline" size={18} color="#FFF" />
            <Text style={styles.importButtonText}>Import Excel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.addButtonText}>Nouveau Patient</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'Total', value: stats.total, icon: 'people', color: colors.primary },
          { label: 'Aptes', value: stats.fit, icon: 'checkmark-circle', color: colors.secondary },
          { label: 'Restrictions', value: stats.restricted, icon: 'warning', color: colors.warningDark },
          { label: 'Inaptes', value: stats.unfit, icon: 'close-circle', color: colors.error },
          { label: 'En attente', value: stats.pending, icon: 'time', color: colors.secondaryDark },
          { label: 'Exam. en retard', value: stats.overdue, icon: 'alert-circle', color: colors.errorDark },
        ].map((s, i) => {
          const textColor = getTextColor(s.color);
          return (
            <View key={i} style={[styles.statCard, { backgroundColor: s.color }]}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name={s.icon as any} size={20} color={textColor} />
              </View>
              <Text style={[styles.statValue, { color: textColor }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: textColor, opacity: 0.9 }]}>{s.label}</Text>
            </View>
          );
        })}
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
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.emptySubtext}>Chargement des patients...</Text>
          </View>
        ) : loadError ? (
          <View style={styles.emptyState}>
            <Ionicons name="cloud-offline-outline" size={48} color={colors.error} />
            <Text style={styles.emptyText}>Serveur inaccessible</Text>
            <Text style={styles.emptySubtext}>{loadError}</Text>
            <TouchableOpacity
              style={{ marginTop: 12, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: borderRadius.lg }}
              onPress={loadPatients}>
              <Text style={{ color: '#FFF', fontWeight: '600' }}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : filteredPatients.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyText}>{patients.length === 0 ? 'Aucun patient enregistré' : 'Aucun résultat'}</Text>
            <Text style={styles.emptySubtext}>
              {patients.length === 0
                ? 'Ajoutez un patient ou importez un fichier Excel'
                : 'Ajustez les filtres ou la recherche'}
            </Text>
          </View>
        ) : (
          filteredPatients.map((p, index) => (
            <React.Fragment key={p.id}>
              <PatientCard patient={p} onPress={() => { setSelectedPatient(p); setShowDetail(true); }} />
              {index < filteredPatients.length - 1 && <View style={styles.patientSeparator} />}
            </React.Fragment>
          ))
        )}
      </View>

      {/* Modals */}
      <PatientDetailModal
        visible={showDetail}
        patient={selectedPatient}
        onClose={() => { setShowDetail(false); setSelectedPatient(null); }}
        onEdit={() => { setShowDetail(false); setShowEditModal(true); }}
        onDelete={() => { if (selectedPatient) handleDeletePatient(selectedPatient.id); }}
      />
      <AddPatientModal visible={showAddModal} onClose={() => setShowAddModal(false)} onSave={handleAddPatient} />
      <EditPatientModal
        visible={showEditModal}
        patient={selectedPatient}
        onClose={() => setShowEditModal(false)}
        onSave={handleEditPatient}
      />
      
      {/* Bulk Import Modal */}
      {showImportModal && (
        <Modal visible={true} transparent animationType="fade" onRequestClose={() => setShowImportModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '80%', minHeight: 300 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {importLoading ? 'Import en cours...' : 'Résultat de l\'import'}
                </Text>
                <TouchableOpacity onPress={() => { setShowImportModal(false); setImportResult(null); }}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {importLoading ? (
                  <View style={styles.loadingContainer}>
                    <Ionicons name="cloud-upload" size={48} color={ACCENT} />
                    <Text style={styles.loadingText}>Traitement du fichier...</Text>
                    <Text style={styles.loadingSubtext}>Veuillez patienter pendant l'import des patients</Text>
                  </View>
                ) : importResult ? (
                  <View>
                    {importResult.error ? (
                      <View style={styles.resultContainer}>
                        <View style={[styles.resultIcon, { backgroundColor: '#EF444414' }]}>
                          <Ionicons name="alert-circle" size={32} color="#EF4444" />
                        </View>
                        <Text style={[styles.resultTitle, { color: colors.error }]}>Erreur d'import</Text>
                        <Text style={styles.resultMessage}>{importResult.error}</Text>
                        
                        {importResult.totalRows && (
                          <View style={styles.statsGrid}>
                            <View style={styles.statItem}>
                              <Text style={styles.importStatValue}>{importResult.totalRows}</Text>
                              <Text style={styles.importStatLabel}>Lignes totales</Text>
                            </View>
                            {importResult.invalidRows > 0 && (
                              <View style={styles.statItem}>
                                <Text style={[styles.importStatValue, { color: colors.error }]}>{importResult.invalidRows}</Text>
                                <Text style={styles.importStatLabel}>Lignes invalides</Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    ) : (
                      <View style={styles.resultContainer}>
                        <View style={[styles.resultIcon, { backgroundColor: colors.successLight }]}>
                          <Ionicons name="checkmark-circle" size={32} color={colors.secondary} />
                        </View>
                        <Text style={[styles.resultTitle, { color: colors.secondary }]}>Import réussi!</Text>
                        <Text style={styles.resultMessage}>
                          {importResult.processedRows} patient(s) ont été importés avec succès dans le système de médecine du travail.
                          {importResult.localOnly && '\n\n⚠️ Sauvegardé localement (serveur indisponible).'}
                        </Text>
                        
                        <View style={styles.statsGrid}>
                          <View style={styles.statItem}>
                            <Text style={styles.importStatValue}>{importResult.totalRows}</Text>
                            <Text style={styles.importStatLabel}>Lignes totales</Text>
                          </View>
                          {importResult.created != null && (
                            <View style={styles.statItem}>
                              <Text style={[styles.importStatValue, { color: colors.secondary }]}>{importResult.created}</Text>
                              <Text style={styles.importStatLabel}>Créés</Text>
                            </View>
                          )}
                          {importResult.updated != null && importResult.updated > 0 && (
                            <View style={styles.statItem}>
                              <Text style={[styles.importStatValue, { color: colors.primary }]}>{importResult.updated}</Text>
                              <Text style={styles.importStatLabel}>Mis à jour</Text>
                            </View>
                          )}
                          {importResult.validRows != null && !importResult.created && (
                            <View style={styles.statItem}>
                              <Text style={[styles.importStatValue, { color: colors.secondary }]}>{importResult.validRows}</Text>
                              <Text style={styles.importStatLabel}>Lignes valides</Text>
                            </View>
                          )}
                          {importResult.invalidRows > 0 && (
                            <View style={styles.statItem}>
                              <Text style={[styles.importStatValue, { color: colors.warning }]}>{importResult.invalidRows}</Text>
                              <Text style={styles.importStatLabel}>Lignes ignorées</Text>
                            </View>
                          )}
                          {importResult.apiErrors > 0 && (
                            <View style={styles.statItem}>
                              <Text style={[styles.importStatValue, { color: colors.error }]}>{importResult.apiErrors}</Text>
                              <Text style={styles.importStatLabel}>Erreurs API</Text>
                            </View>
                          )}
                        </View>

                        {importResult.errorDetails && importResult.errorDetails.length > 0 && (
                          <View style={[styles.successNote, { backgroundColor: '#FEF2F214' }]}>
                            <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                            <Text style={[styles.successNoteText, { color: colors.error }]}>
                              {importResult.errorDetails.slice(0, 5).map((e: any) => `Ligne ${e.row}: ${e.error}`).join('\n')}
                            </Text>
                          </View>
                        )}

                        <View style={styles.successNote}>
                          <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
                          <Text style={styles.successNoteText}>
                            Tous les patients importés ont le statut "En attente d'évaluation" par défaut.
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                ) : null}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: colors.surfaceVariant }]} 
                  onPress={() => { setShowImportModal(false); setImportResult(null); }}
                >
                  <Text style={[styles.actionBtnText, { color: colors.text }]}>Fermer</Text>
                </TouchableOpacity>
                {!importLoading && importResult?.error && (
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: ACCENT }]} 
                    onPress={() => { setShowImportModal(false); setImportResult(null); handleBulkImport(); }}
                  >
                    <Ionicons name="refresh-outline" size={18} color="#FFF" />
                    <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Réessayer</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}
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
  headerActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: borderRadius.lg },
  addButtonText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  importButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.secondary, paddingHorizontal: 12, paddingVertical: 10, borderRadius: borderRadius.lg },
  importButtonText: { color: '#FFF', fontWeight: '500', fontSize: 13 },
  syncIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primaryFaded, paddingHorizontal: 8, paddingVertical: 4, borderRadius: borderRadius.md },
  syncText: { fontSize: 11, color: colors.primary, fontWeight: '500' },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { 
    flex: 1, 
    minWidth: isDesktop ? 140 : 100, 
    borderRadius: borderRadius.xl, 
    padding: 16, 
    alignItems: 'center', 
    ...shadows.lg 
  },
  statIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 2, textAlign: 'center' },

  filterBar: { gap: 10, marginBottom: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.lg, paddingHorizontal: 14, paddingVertical: 10, gap: 8, borderWidth: 1, borderColor: colors.outline, ...shadows.xs },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  filterScrollRow: { flexGrow: 0 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: borderRadius.full, backgroundColor: colors.surfaceVariant, marginRight: 8 },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  filterChipTextActive: { color: '#FFF', fontWeight: '600' },

  resultsCount: { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },

  patientsList: { },
  patientSeparator: { 
    height: 1, 
    backgroundColor: colors.outline, 
    marginVertical: 12, 
    opacity: 0.5,
  },
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

  overdueBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.error, paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
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
  detailSectionTitle: { fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
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

  // Dropdown picker
  ddTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md,
    paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.outline,
  },
  ddDisabled: { opacity: 0.45 },
  ddValue: { flex: 1, fontSize: 14, color: colors.text, marginRight: 8 },
  ddList: {
    marginTop: 4, backgroundColor: colors.surface, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.outline, overflow: 'hidden',
    ...shadows.sm,
    zIndex: 9999,
  },
  ddItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.outline,
  },
  ddItemText: { fontSize: 13, color: colors.text },
  ddItemSub: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },

  // Edit section header
  editSectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: 4, marginBottom: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: colors.outline,
  },

  // Protocol banner
  protocolBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: ACCENT + '10', borderRadius: borderRadius.md,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16,
    borderWidth: 1, borderColor: ACCENT + '30',
  },
  protocolBannerText: { flex: 1, fontSize: 12, color: ACCENT, lineHeight: 16, fontWeight: '500' },

  // Import Modal styles
  loadingContainer: { alignItems: 'center', padding: 40, gap: 12 },
  loadingText: { fontSize: 18, fontWeight: '600', color: colors.text, textAlign: 'center' },
  loadingSubtext: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  
  resultContainer: { padding: 20, alignItems: 'center', gap: 16 },
  resultIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  resultTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  resultMessage: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  
  statsGrid: { flexDirection: 'row', gap: 16, marginTop: 16, justifyContent: 'center' },
  statItem: { alignItems: 'center', gap: 4 },
  importStatValue: { fontSize: 24, fontWeight: '700', color: colors.text },
  importStatLabel: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  
  successNote: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: colors.surfaceVariant, padding: 12, borderRadius: borderRadius.md, marginTop: 16 },
  successNoteText: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 16 },
});
