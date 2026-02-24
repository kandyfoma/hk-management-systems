import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Dimensions, Modal, Alert, ActivityIndicator, FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import {
  SECTOR_PROFILES, OccHealthUtils,
  type IndustrySector, type OccupationalDisease, type OccupationalDiseaseType, type ExposureRisk,
} from '../../../models/OccupationalHealth';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const ACCENT = colors.primary;
const STORAGE_KEY = '@occhealth_diseases';

// ─── Disease Labels ──────────────────────────────────────────
function getDiseaseLabel(d: OccupationalDiseaseType): string {
  const m: Record<string, string> = {
    silicosis: 'Silicose', asbestosis: 'Asbestose', pneumoconiosis: 'Pneumoconiose',
    occupational_asthma: 'Asthme professionnel', copd: 'BPCO', byssinosis: 'Byssinose',
    noise_induced_hearing_loss: 'Surdité professionnelle',
    carpal_tunnel_syndrome: 'Syndrome canal carpien', tendinitis: 'Tendinite',
    low_back_disorder: 'Lombalgie', hand_arm_vibration_syndrome: 'Syndrome vibratoire',
    musculoskeletal_disorder: 'TMS', contact_dermatitis: 'Dermite de contact',
    occupational_eczema: 'Eczéma professionnel', skin_cancer: 'Cancer cutané',
    burnout: 'Burnout', ptsd: 'TSPT', occupational_depression: 'Dépression professionnelle',
    anxiety_disorder: 'Trouble anxieux', lead_poisoning: 'Saturnisme',
    mercury_poisoning: 'Intoxication mercure', pesticide_poisoning: 'Intoxication pesticides',
    solvent_toxicity: 'Toxicité solvants', tuberculosis: 'Tuberculose',
    hepatitis_b_c: 'Hépatite B/C', hiv_occupational: 'VIH professionnel',
    malaria: 'Paludisme', leptospirosis: 'Leptospirose',
    work_related_hypertension: 'HTA professionnelle', ischemic_heart_disease: 'Cardiopathie ischémique',
    mesothelioma: 'Mésothéliome', bladder_cancer: 'Cancer vessie', lung_cancer_occupational: 'Cancer poumon',
    heat_stroke: 'Coup de chaleur', computer_vision_syndrome: 'Fatigue visuelle',
    vocal_cord_nodules: 'Nodules cordes vocales', other: 'Autre',
  };
  return m[d] || d;
}

function getDiseaseCategory(d: OccupationalDiseaseType): { label: string; color: string; icon: string } {
  const respiratory = ['silicosis', 'asbestosis', 'pneumoconiosis', 'occupational_asthma', 'copd', 'byssinosis'];
  const musculoskeletal = ['carpal_tunnel_syndrome', 'tendinitis', 'low_back_disorder', 'hand_arm_vibration_syndrome', 'musculoskeletal_disorder'];
  const psychological = ['burnout', 'ptsd', 'occupational_depression', 'anxiety_disorder'];
  const chemical = ['lead_poisoning', 'mercury_poisoning', 'pesticide_poisoning', 'solvent_toxicity'];
  const infectious = ['tuberculosis', 'hepatitis_b_c', 'hiv_occupational', 'malaria', 'leptospirosis'];
  const skin = ['contact_dermatitis', 'occupational_eczema', 'skin_cancer'];
  const cancer = ['mesothelioma', 'bladder_cancer', 'lung_cancer_occupational'];

  if (respiratory.includes(d)) return { label: 'Respiratoire', color: '#0891B2', icon: 'cloud-outline' };
  if (musculoskeletal.includes(d)) return { label: 'Musculo-squelettique', color: '#EA580C', icon: 'body-outline' };
  if (psychological.includes(d)) return { label: 'Psychosocial', color: '#8B5CF6', icon: 'brain-outline' };
  if (chemical.includes(d)) return { label: 'Chimique', color: '#DC2626', icon: 'flask-outline' };
  if (infectious.includes(d)) return { label: 'Infectieux', color: '#16A34A', icon: 'bug-outline' };
  if (skin.includes(d)) return { label: 'Dermatologique', color: '#F59E0B', icon: 'hand-left-outline' };
  if (cancer.includes(d)) return { label: 'Cancer', color: '#991B1B', icon: 'medical-outline' };
  return { label: 'Autre', color: '#64748B', icon: 'medical-outline' };
}

function getStatusLabel(s: string): string {
  const m: Record<string, string> = { active: 'Actif', monitoring: 'Surveillance', resolved: 'Résolu', chronic: 'Chronique' };
  return m[s] || s;
}
function getStatusColor(s: string): string {
  const m: Record<string, string> = { active: '#EF4444', monitoring: '#F59E0B', resolved: '#22C55E', chronic: '#6366F1' };
  return m[s] || '#94A3B8';
}
function getSeverityLabel(s: string): string {
  const m: Record<string, string> = { mild: 'Légère', moderate: 'Modérée', severe: 'Sévère' };
  return m[s] || s;
}

// ─── Sample Data ─────────────────────────────────────────────
const SAMPLE_DISEASES: OccupationalDisease[] = [
  {
    id: 'od1', workerId: 'w1', workerName: 'Jean-Pierre Kabongo', workerSector: 'mining',
    disease: 'silicosis', icd10Code: 'J62.8', diagnosisDate: '2024-08-15', diagnosedBy: 'Dr. Mutombo',
    severity: 'moderate', exposureType: 'silica_dust', exposureDuration: '9 ans',
    cumulativeExposure: '14,400 heures en environnement poussiéreux',
    treatmentPlan: 'Suivi pneumologique trimestriel, spirométrie, éviction de l\'exposition',
    medications: ['Bronchodilatateurs', 'Corticostéroïdes inhalés'],
    followUpSchedule: 'Tous les 3 mois', workRestrictions: ['Interdiction travail souterrain', 'Poste en surface uniquement'],
    compensation: true, compensationStatus: 'approved', status: 'monitoring', createdAt: '2024-08-15T10:00:00Z',
  },
  {
    id: 'od2', workerId: 'w3', workerName: 'Patrick Lukusa', workerSector: 'manufacturing',
    disease: 'noise_induced_hearing_loss', icd10Code: 'H83.3', diagnosisDate: '2024-11-20', diagnosedBy: 'Dr. Kabasele',
    severity: 'mild', exposureType: 'noise', exposureDuration: '7 ans',
    treatmentPlan: 'Audiométrie de suivi annuelle, protection auditive renforcée',
    medications: [], followUpSchedule: 'Annuel',
    workRestrictions: ['Port obligatoire de casque anti-bruit'], compensation: true, compensationStatus: 'pending',
    status: 'active', createdAt: '2024-11-20T14:00:00Z',
  },
  {
    id: 'od3', workerId: 'w2', workerName: 'Grace Mwamba', workerSector: 'banking_finance',
    disease: 'burnout', icd10Code: 'Z73.0', diagnosisDate: '2025-01-05', diagnosedBy: 'Dr. Ngoy',
    severity: 'moderate', exposureType: 'psychosocial', exposureDuration: '2 ans',
    treatmentPlan: 'Suivi psychologique, aménagement du temps de travail, activité physique',
    medications: ['Anxiolytiques (si nécessaire)'], followUpSchedule: 'Mensuel',
    workRestrictions: ['Réduction temps de travail', 'Pas de travail le week-end'], compensation: false,
    status: 'active', createdAt: '2025-01-05T09:00:00Z',
  },
  {
    id: 'od4', workerId: 'w4', workerName: 'Nadine Tshilombo', workerSector: 'healthcare',
    disease: 'contact_dermatitis', icd10Code: 'L25.0', diagnosisDate: '2024-06-10', diagnosedBy: 'Dr. Mbala',
    severity: 'mild', exposureType: 'chemical_exposure', exposureDuration: '5 ans',
    treatmentPlan: 'Changement de gants (hypoallergéniques), crème barrière, suivi dermatologique',
    medications: ['Crème corticoïde locale'], followUpSchedule: 'Tous les 6 mois',
    workRestrictions: ['Utilisation exclusive de gants nitrile'], compensation: false,
    status: 'resolved', createdAt: '2024-06-10T11:00:00Z',
  },
];

// ─── Disease Card ────────────────────────────────────────────
function DiseaseCard({ disease, onPress }: { disease: OccupationalDisease; onPress: () => void }) {
  const cat = getDiseaseCategory(disease.disease);
  const statusColor = getStatusColor(disease.status);
  const sectorProfile = SECTOR_PROFILES[disease.workerSector];

  return (
    <TouchableOpacity style={styles.diseaseCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.diseaseCardHeader}>
        <View style={[styles.diseaseIcon, { backgroundColor: cat.color + '14' }]}>
          <Ionicons name={cat.icon as any} size={20} color={cat.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={styles.diseaseName}>{getDiseaseLabel(disease.disease)}</Text>
            <View style={[styles.catBadge, { backgroundColor: cat.color + '14' }]}>
              <Text style={[styles.catBadgeText, { color: cat.color }]}>{cat.label}</Text>
            </View>
          </View>
          <Text style={styles.diseaseWorker}>{disease.workerName} • {sectorProfile.label}</Text>
          {disease.icd10Code && <Text style={styles.icdCode}>ICD-10: {disease.icd10Code}</Text>}
        </View>
        <View style={[styles.statusChip, { backgroundColor: statusColor + '14' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusChipText, { color: statusColor }]}>{getStatusLabel(disease.status)}</Text>
        </View>
      </View>

      <View style={styles.diseaseCardBody}>
        <View style={styles.diseaseInfoRow}>
          <View style={styles.diseaseInfoItem}>
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.diseaseInfoText}>Diagnostiqué: {new Date(disease.diagnosisDate).toLocaleDateString('fr-CD')}</Text>
          </View>
          <View style={styles.diseaseInfoItem}>
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.diseaseInfoText}>Exposition: {disease.exposureDuration}</Text>
          </View>
        </View>
        <View style={styles.diseaseInfoRow}>
          <View style={styles.diseaseInfoItem}>
            <Ionicons name="medkit-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.diseaseInfoText}>Sévérité: {getSeverityLabel(disease.severity)}</Text>
          </View>
          {disease.compensation && (
            <View style={[styles.compensationBadge, { backgroundColor: disease.compensationStatus === 'approved' ? '#22C55E14' : '#F59E0B14' }]}>
              <Ionicons name={disease.compensationStatus === 'approved' ? 'checkmark-circle' : 'time'} size={12}
                color={disease.compensationStatus === 'approved' ? '#22C55E' : '#F59E0B'} />
              <Text style={{ fontSize: 10, fontWeight: '600', color: disease.compensationStatus === 'approved' ? '#22C55E' : '#F59E0B' }}>
                {disease.compensationStatus === 'approved' ? 'Indemnisé' : 'En attente'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Detail Modal ────────────────────────────────────────────
function DiseaseDetailModal({ visible, disease, onClose }: { visible: boolean; disease: OccupationalDisease | null; onClose: () => void }) {
  if (!disease) return null;
  const cat = getDiseaseCategory(disease.disease);
  const statusColor = getStatusColor(disease.status);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Fiche Maladie Professionnelle</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.textSecondary} /></TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <View style={[styles.detailIcon, { backgroundColor: cat.color + '14' }]}>
                <Ionicons name={cat.icon as any} size={28} color={cat.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailTitle}>{getDiseaseLabel(disease.disease)}</Text>
                <Text style={styles.detailSubtext}>{cat.label} — {disease.icd10Code || 'N/A'}</Text>
              </View>
              <View style={[styles.statusChip, { backgroundColor: statusColor + '14' }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusChipText, { color: statusColor }]}>{getStatusLabel(disease.status)}</Text>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Patient</Text>
              <DetailRow label="Nom" value={disease.workerName} />
              <DetailRow label="Secteur" value={SECTOR_PROFILES[disease.workerSector].label} />
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Diagnostic</Text>
              <DetailRow label="Date diagnostic" value={new Date(disease.diagnosisDate).toLocaleDateString('fr-CD')} />
              <DetailRow label="Diagnostiqué par" value={disease.diagnosedBy} />
              <DetailRow label="Sévérité" value={getSeverityLabel(disease.severity)} />
              <DetailRow label="Type d'exposition" value={OccHealthUtils.getExposureRiskLabel(disease.exposureType)} />
              <DetailRow label="Durée exposition" value={disease.exposureDuration} />
              {disease.cumulativeExposure && <DetailRow label="Exposition cumulée" value={disease.cumulativeExposure} />}
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Traitement</Text>
              <Text style={styles.detailText}>{disease.treatmentPlan}</Text>
              {disease.medications.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.subLabel}>Médicaments:</Text>
                  {disease.medications.map((med, i) => (
                    <View key={i} style={styles.medicationItem}>
                      <Ionicons name="medical-outline" size={12} color={ACCENT} />
                      <Text style={styles.medicationText}>{med}</Text>
                    </View>
                  ))}
                </View>
              )}
              <DetailRow label="Suivi" value={disease.followUpSchedule} />
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Restrictions de Travail</Text>
              {disease.workRestrictions.map((r, i) => (
                <View key={i} style={styles.restrictionItem}>
                  <Ionicons name="close-circle-outline" size={14} color="#EF4444" />
                  <Text style={styles.restrictionText}>{r}</Text>
                </View>
              ))}
            </View>

            {disease.compensation && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Indemnisation</Text>
                <DetailRow label="Statut" value={disease.compensationStatus === 'approved' ? 'Approuvé' : disease.compensationStatus === 'pending' ? 'En attente' : 'Rejeté'} />
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

// ─── Add Disease Modal ───────────────────────────────────────
function AddDiseaseModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (d: OccupationalDisease) => void }) {
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [selectedWorkerName, setSelectedWorkerName] = useState('');
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);
  const [workerSearchText, setWorkerSearchText] = useState('');
  const [workers, setWorkers] = useState<Array<{ id: string; firstName: string; lastName: string; employeeId: string; department?: string }>>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(true);
  
  const [disease, setDisease] = useState<OccupationalDiseaseType>('musculoskeletal_disorder');
  const [severity, setSeverity] = useState<'mild' | 'moderate' | 'severe'>('mild');
  const [sector, setSector] = useState<IndustrySector>('mining');
  const [exposureDuration, setExposureDuration] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');

  // Load workers on mount
  useEffect(() => {
    if (visible) {
      loadWorkers();
    }
  }, [visible]);

  const loadWorkers = async () => {
    try {
      setLoadingWorkers(true);
      // TODO: Replace with actual API call to fetch workers
      // For now, using sample data
      const sampleWorkers = [
        { id: 'w1', firstName: 'Jean-Pierre', lastName: 'Kabongo', employeeId: 'E001', department: 'Mining' },
        { id: 'w3', firstName: 'Patrick', lastName: 'Lukusa', employeeId: 'E003', department: 'Manufacturing' },
        { id: 'w2', firstName: 'Grace', lastName: 'Mwamba', employeeId: 'E002', department: 'Finance' },
        { id: 'w4', firstName: 'Nadine', lastName: 'Tshilombo', employeeId: 'E004', department: 'Healthcare' },
      ];
      setWorkers(sampleWorkers);
    } catch (error) {
      console.error('Error loading workers:', error);
    } finally {
      setLoadingWorkers(false);
    }
  };

  // Filter workers based on search text
  const filteredWorkers = workers.filter(worker => {
    const searchLower = workerSearchText.toLowerCase();
    const fullName = `${worker.firstName} ${worker.lastName}`.toLowerCase();
    return fullName.includes(searchLower) || worker.employeeId.toLowerCase().includes(searchLower);
  });

  const selectedWorker = workers.find(w => w.id === selectedWorkerId);

  const diseaseOptions: { value: OccupationalDiseaseType; label: string }[] = [
    { value: 'silicosis', label: 'Silicose' },
    { value: 'noise_induced_hearing_loss', label: 'Surdité prof.' },
    { value: 'musculoskeletal_disorder', label: 'TMS' },
    { value: 'burnout', label: 'Burnout' },
    { value: 'contact_dermatitis', label: 'Dermite contact' },
    { value: 'carpal_tunnel_syndrome', label: 'Canal carpien' },
    { value: 'occupational_asthma', label: 'Asthme prof.' },
    { value: 'lead_poisoning', label: 'Saturnisme' },
    { value: 'tuberculosis', label: 'Tuberculose' },
    { value: 'low_back_disorder', label: 'Lombalgie' },
  ];

  const handleSave = () => {
    if (!selectedWorkerId) { Alert.alert('Erreur', 'Le choix du patient est obligatoire.'); return; }
    const sectorProfile = SECTOR_PROFILES[sector];
    const newDisease: OccupationalDisease = {
      id: `od-${Date.now()}`, workerId: selectedWorkerId, workerName: selectedWorkerName,
      workerSector: sector, disease, diagnosisDate: new Date().toISOString().split('T')[0],
      diagnosedBy: 'Dr. Non spécifié', severity,
      exposureType: sectorProfile.typicalRisks[0] as ExposureRisk || 'ergonomic',
      exposureDuration: exposureDuration.trim() || 'Non spécifié',
      treatmentPlan: treatmentPlan.trim() || 'À définir',  medications: [],
      followUpSchedule: 'À planifier', workRestrictions: [], compensation: false,
      status: 'active', createdAt: new Date().toISOString(),
    };
    onSave(newDisease);
    setSelectedWorkerId(''); setSelectedWorkerName(''); setExposureDuration(''); setTreatmentPlan(''); setWorkerSearchText('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: '85%' }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle Maladie Professionnelle</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.textSecondary} /></TouchableOpacity>
            </View>
            
            {/* Worker Selection */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Patient *</Text>
              {loadingWorkers ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.md }} />
              ) : (
                <View>
                  <TouchableOpacity
                    style={[styles.formInput, { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderColor: colors.outline, borderWidth: 1, borderRadius: borderRadius.lg, justifyContent: 'center', flexDirection: 'row', alignItems: 'center' }, showWorkerDropdown && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}
                    onPress={() => setShowWorkerDropdown(!showWorkerDropdown)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, color: selectedWorkerId ? colors.text : colors.textSecondary }}>
                        {selectedWorker ? `${selectedWorker.firstName} ${selectedWorker.lastName} (${selectedWorker.employeeId})` : 'Sélectionner un patient...'}
                      </Text>
                    </View>
                    <Ionicons name={showWorkerDropdown ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
                  </TouchableOpacity>

                  {showWorkerDropdown && (
                    <View style={[styles.formInput, { paddingHorizontal: 0, paddingVertical: 0, marginTop: -1, borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, maxHeight: 200 }]}>
                      <TextInput
                        style={[styles.formInput, { marginBottom: 0, borderBottomWidth: 1, borderBottomColor: colors.outline, borderTopWidth: 0, borderLeftWidth: 0, borderRightWidth: 0 }]}
                        placeholder="Chercher par nom ou ID..."
                        placeholderTextColor={colors.textSecondary}
                        value={workerSearchText}
                        onChangeText={setWorkerSearchText}
                      />
                      <ScrollView style={{ maxHeight: 150 }} showsVerticalScrollIndicator={false}>
                        {filteredWorkers.length > 0 ? (
                          filteredWorkers.map(worker => (
                            <TouchableOpacity
                              key={worker.id}
                              style={[styles.formInput, { marginBottom: 0, borderWidth: 0, borderBottomWidth: 1, borderBottomColor: colors.outline, borderRadius: 0, paddingVertical: spacing.sm, backgroundColor: selectedWorkerId === worker.id ? colors.primary + '10' : 'transparent' }]}
                              onPress={() => {
                                setSelectedWorkerId(worker.id);
                                setSelectedWorkerName(`${worker.firstName} ${worker.lastName}`);
                                setShowWorkerDropdown(false);
                                setWorkerSearchText('');
                              }}
                            >
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View>
                                  <Text style={[{ fontSize: 13, fontWeight: '500', color: colors.text }, selectedWorkerId === worker.id && { color: colors.primary, fontWeight: '700' }]}>
                                    {worker.firstName} {worker.lastName}
                                  </Text>
                                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                                    {worker.employeeId} • {worker.department}
                                  </Text>
                                </View>
                                {selectedWorkerId === worker.id && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                              </View>
                            </TouchableOpacity>
                          ))
                        ) : (
                          <View style={{ padding: spacing.md, alignItems: 'center' }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Aucun patient trouvé</Text>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Maladie</Text>
              <View style={styles.chipGrid}>
                {diseaseOptions.map(opt => (
                  <TouchableOpacity key={opt.value}
                    style={[styles.optionChip, disease === opt.value && styles.optionChipActive]}
                    onPress={() => setDisease(opt.value)}>
                    <Text style={[styles.optionChipText, disease === opt.value && styles.optionChipTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Sévérité</Text>
              <View style={styles.chipGrid}>
                {[{ v: 'mild', l: 'Légère', c: '#22C55E' }, { v: 'moderate', l: 'Modérée', c: '#F59E0B' }, { v: 'severe', l: 'Sévère', c: '#EF4444' }].map(opt => (
                  <TouchableOpacity key={opt.v}
                    style={[styles.optionChip, severity === opt.v && { backgroundColor: opt.c + '20', borderColor: opt.c }]}
                    onPress={() => setSeverity(opt.v as any)}>
                    <Text style={[styles.optionChipText, severity === opt.v && { color: opt.c, fontWeight: '600' }]}>{opt.l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Durée d'Exposition</Text>
              <TextInput style={styles.formInput} value={exposureDuration} onChangeText={setExposureDuration} placeholder="Ex: 5 ans" />
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Plan de Traitement</Text>
              <TextInput style={[styles.formInput, { minHeight: 60, textAlignVertical: 'top' }]}
                value={treatmentPlan} onChangeText={setTreatmentPlan} placeholder="Traitement prévu..." multiline />
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
export function DiseasesScreen() {
  const [diseases, setDiseases] = useState<OccupationalDisease[]>(SAMPLE_DISEASES);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedDisease, setSelectedDisease] = useState<OccupationalDisease | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setDiseases(JSON.parse(stored));
      else await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_DISEASES));
    } catch { }
  };
  const saveData = async (list: OccupationalDisease[]) => {
    setDiseases(list);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  const handleAdd = (d: OccupationalDisease) => {
    saveData([d, ...diseases]);
    setShowAdd(false);
    Alert.alert('Succès', 'Maladie professionnelle enregistrée.');
  };

  const filtered = useMemo(() => {
    return diseases.filter(d => {
      const q = searchQuery.toLowerCase();
      const matchQ = !q || d.workerName.toLowerCase().includes(q) || getDiseaseLabel(d.disease).toLowerCase().includes(q);
      const matchS = filterStatus === 'all' || d.status === filterStatus;
      return matchQ && matchS;
    });
  }, [diseases, searchQuery, filterStatus]);

  const stats = useMemo(() => ({
    total: diseases.length,
    active: diseases.filter(d => d.status === 'active').length,
    monitoring: diseases.filter(d => d.status === 'monitoring').length,
    resolved: diseases.filter(d => d.status === 'resolved').length,
    pendingComp: diseases.filter(d => d.compensation && d.compensationStatus === 'pending').length,
  }), [diseases]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Maladies Professionnelles</Text>
          <Text style={styles.screenSubtitle}>Registre ILO R194 — Pathologies par secteur</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.addButtonText}>Nouvelle Déclaration</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        {[
          { label: 'Total', value: stats.total, icon: 'fitness', color: ACCENT },
          { label: 'Actives', value: stats.active, icon: 'alert-circle', color: '#EF4444' },
          { label: 'Surveillance', value: stats.monitoring, icon: 'eye', color: '#F59E0B' },
          { label: 'Résolues', value: stats.resolved, icon: 'checkmark-circle', color: '#22C55E' },
          { label: 'Indemn. en attente', value: stats.pendingComp, icon: 'cash', color: '#6366F1' },
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
          <TextInput style={styles.searchInput} placeholder="Rechercher..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor={colors.placeholder} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollRow}>
          {[{ v: 'all', l: 'Toutes' }, { v: 'active', l: 'Actives' }, { v: 'monitoring', l: 'Surveillance' }, { v: 'resolved', l: 'Résolues' }, { v: 'chronic', l: 'Chroniques' }].map(opt => (
            <TouchableOpacity key={opt.v} style={[styles.filterChip, filterStatus === opt.v && styles.filterChipActive]} onPress={() => setFilterStatus(opt.v)}>
              <Text style={[styles.filterChipText, filterStatus === opt.v && styles.filterChipTextActive]}>{opt.l}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Text style={styles.resultsCount}>{filtered.length} maladie(s) professionnelle(s)</Text>
      <View style={styles.listContainer}>
        {filtered.map(d => <DiseaseCard key={d.id} disease={d} onPress={() => { setSelectedDisease(d); setShowDetail(true); }} />)}
        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyText}>Aucune maladie professionnelle enregistrée</Text>
          </View>
        )}
      </View>

      <DiseaseDetailModal visible={showDetail} disease={selectedDisease} onClose={() => { setShowDetail(false); setSelectedDisease(null); }} />
      <AddDiseaseModal visible={showAdd} onClose={() => setShowAdd(false)} onSave={handleAdd} />
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
  statCard: { flex: 1, minWidth: isDesktop ? 130 : 100, borderRadius: borderRadius.xl, padding: 16, alignItems: 'center', ...shadows.md },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.text },
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

  diseaseCard: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 16, ...shadows.sm },
  diseaseCardHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  diseaseIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  diseaseName: { fontSize: 15, fontWeight: '600', color: colors.text },
  diseaseWorker: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  icdCode: { fontSize: 11, color: colors.textTertiary, marginTop: 1 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  catBadgeText: { fontSize: 10, fontWeight: '600' },

  diseaseCardBody: { gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.outline },
  diseaseInfoRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  diseaseInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  diseaseInfoText: { fontSize: 12, color: colors.textSecondary },
  compensationBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },

  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: borderRadius.full },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusChipText: { fontSize: 11, fontWeight: '600' },

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
  detailIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  detailTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  detailSubtext: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  detailText: { fontSize: 13, color: colors.text, lineHeight: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  detailLabel: { fontSize: 13, color: colors.textSecondary },
  detailValue: { fontSize: 13, fontWeight: '500', color: colors.text, maxWidth: '60%', textAlign: 'right' },
  subLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 },

  medicationItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  medicationText: { fontSize: 13, color: colors.text },
  restrictionItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  restrictionText: { fontSize: 13, color: colors.text },

  formSection: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  formInput: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.outline },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.surfaceVariant },
  optionChipActive: { backgroundColor: ACCENT + '20', borderColor: ACCENT },
  optionChipText: { fontSize: 12, color: colors.textSecondary },
  optionChipTextActive: { color: ACCENT, fontWeight: '600' },
});
