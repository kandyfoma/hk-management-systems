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
  type IndustrySector, type IncidentType, type IncidentSeverity, type IncidentCategory,
  type WorkplaceIncident, type CorrectiveAction, type AffectedWorker,
} from '../../../models/OccupationalHealth';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const ACCENT = '#D97706';
const STORAGE_KEY = '@occhealth_incidents';

// ─── Sample Incidents ────────────────────────────────────────
const SAMPLE_INCIDENTS: WorkplaceIncident[] = [
  {
    id: 'inc1', incidentNumber: 'INC-2025-001', reportedBy: 'Jean-Pierre Kabongo',
    reportedDate: '2025-01-10', incidentDate: '2025-01-10', incidentTime: '14:30',
    sector: 'mining', type: 'lost_time_injury', severity: 'major', category: 'fall_from_height',
    site: 'Site Kamoto Principal', area: 'Zone d\'extraction niveau -200m',
    affectedWorkers: [{ workerId: 'w1', workerName: 'Jacques Mumba', injuryType: 'Fracture bras droit', bodyPart: 'Bras droit', treatmentProvided: 'Immobilisation + transfert hôpital', daysOff: 45, fitnessStatusAfter: 'temporarily_unfit' }],
    description: 'Chute d\'un travailleur depuis une plateforme de 3m lors de l\'inspection de la galerie. L\'échafaudage n\'avait pas de garde-corps installé.',
    immediateActions: 'Premiers secours appliqués, transfert à l\'hôpital, zone sécurisée, notification du superviseur.',
    rootCauses: ['Absence de garde-corps', 'Défaut d\'inspection pré-travail'],
    contributingFactors: ['Éclairage insuffisant', 'Formation incomplète sur le travail en hauteur'],
    ppeWorn: true, ppeDetails: 'Casque porté, harnais non utilisé',
    investigationStatus: 'in_progress', investigatorName: 'Dr. Mutombo',
    investigationFindings: 'Manquement aux procédures de travail en hauteur.',
    correctiveActions: [
      { id: 'ca1', description: 'Installation de garde-corps sur toutes les plateformes', assignedTo: 'Chef Maintenance', dueDate: '2025-02-01', status: 'in_progress' },
      { id: 'ca2', description: 'Formation recyclage travail en hauteur', assignedTo: 'HSE Manager', dueDate: '2025-01-25', status: 'completed', completedDate: '2025-01-22' },
    ],
    reportedToAuthorities: true, authorityReferenceNumber: 'INS-TRV-2025-0042',
    lostTimeDays: 45, createdAt: '2025-01-10T15:00:00Z',
  },
  {
    id: 'inc2', incidentNumber: 'INC-2025-002', reportedBy: 'Nadine Tshilombo',
    reportedDate: '2025-01-12', incidentDate: '2025-01-12', incidentTime: '09:15',
    sector: 'healthcare', type: 'first_aid', severity: 'minor', category: 'needle_stick_injury',
    site: 'Hôpital Général Jason Sendwe', area: 'Service de chirurgie — Salle d\'opération 2',
    affectedWorkers: [{ workerId: 'w4', workerName: 'Nadine Tshilombo', injuryType: 'Piqûre aiguille', bodyPart: 'Index gauche', treatmentProvided: 'Désinfection, protocole AES initié', daysOff: 0, fitnessStatusAfter: 'fit' }],
    description: 'Piqûre accidentelle lors du recapuchonnage d\'une aiguille en salle d\'opération.',
    immediateActions: 'Lavage immédiat, désinfection, déclaration AES, bilan sanguin prélevé.',
    rootCauses: ['Recapuchonnage d\'aiguille (pratique interdite)'],
    contributingFactors: ['Conteneur à aiguilles plein', 'Surcharge de travail'],
    ppeWorn: true, ppeDetails: 'Gants chirurgicaux, blouse, masque',
    investigationStatus: 'completed', investigatorName: 'Dr. Kabasele',
    investigationFindings: 'Non-respect du protocole de gestion des objets piquants.',
    correctiveActions: [
      { id: 'ca3', description: 'Remplacement quotidien des conteneurs à aiguilles', assignedTo: 'Infirmière Chef', dueDate: '2025-01-15', status: 'completed', completedDate: '2025-01-14' },
      { id: 'ca4', description: 'Rappel formation AES à tout le personnel', assignedTo: 'Direction Nursing', dueDate: '2025-02-01', status: 'completed', completedDate: '2025-01-28' },
    ],
    reportedToAuthorities: false, lostTimeDays: 0, createdAt: '2025-01-12T10:00:00Z',
  },
  {
    id: 'inc3', incidentNumber: 'INC-2025-003', reportedBy: 'Patrick Lukusa',
    reportedDate: '2025-01-15', incidentDate: '2025-01-15', incidentTime: '22:45',
    sector: 'manufacturing', type: 'near_miss', severity: 'moderate', category: 'chemical_exposure',
    site: 'Usine Kolwezi', area: 'Zone de stockage produits chimiques',
    affectedWorkers: [],
    description: 'Fuite détectée sur un fût de solvant dans la zone de stockage. Aucun travailleur exposé grâce à la ronde de nuit.',
    immediateActions: 'Zone évacuée, fût isolé, ventilation renforcée, nettoyage par équipe spécialisée.',
    rootCauses: ['Corrosion du fût', 'Stockage prolongé au-delà de la date de péremption'],
    contributingFactors: ['Inventaire chimique non à jour'],
    ppeWorn: true, ppeDetails: 'EPI chimique complet pour l\'équipe d\'intervention',
    investigationStatus: 'completed', investigatorName: 'Ing. Kasongo',
    correctiveActions: [
      { id: 'ca5', description: 'Audit complet du stock chimique', assignedTo: 'Responsable Magasin', dueDate: '2025-01-30', status: 'in_progress' },
    ],
    reportedToAuthorities: false, lostTimeDays: 0, createdAt: '2025-01-15T23:00:00Z',
  },
];

function getIncidentTypeLabel(t: IncidentType): string {
  const m: Record<IncidentType, string> = {
    fatality: 'Décès', lost_time_injury: 'Avec Arrêt', medical_treatment: 'Soins Médicaux',
    first_aid: 'Premiers Secours', near_miss: 'Presqu\'accident', property_damage: 'Dégâts Matériels',
    environmental: 'Environnemental', occupational_disease: 'Maladie Prof.', commuting_accident: 'Accident Trajet',
  };
  return m[t] || t;
}

function getIncidentTypeColor(t: IncidentType): string {
  const m: Record<IncidentType, string> = {
    fatality: '#DC2626', lost_time_injury: '#EF4444', medical_treatment: '#F59E0B',
    first_aid: '#3B82F6', near_miss: '#6366F1', property_damage: '#8B5CF6',
    environmental: '#16A34A', occupational_disease: '#D97706', commuting_accident: '#0891B2',
  };
  return m[t] || '#94A3B8';
}

function getSeverityLabel(s: IncidentSeverity): string {
  const m: Record<IncidentSeverity, string> = { critical: 'Critique', major: 'Majeur', moderate: 'Modéré', minor: 'Mineur', negligible: 'Négligeable' };
  return m[s] || s;
}

function getCategoryLabel(c: IncidentCategory): string {
  const m: Record<string, string> = {
    fall_from_height: 'Chute de hauteur', fall_same_level: 'Chute de plain-pied', fall_of_ground: 'Éboulement',
    struck_by_object: 'Choc par objet', caught_in_between: 'Coincement', vehicle_accident: 'Accident véhicule',
    explosion: 'Explosion', fire: 'Incendie', electrical: 'Électrique', chemical_exposure: 'Exposition chimique',
    heat_exhaustion: 'Coup de chaleur', respiratory: 'Respiratoire', musculoskeletal: 'Musculo-squelettique',
    noise_induced: 'Bruit', needle_stick_injury: 'Piqûre d\'aiguille', assault_violence: 'Agression',
    road_traffic: 'Circulation routière', animal_related: 'Lié aux animaux', manual_handling_injury: 'Manutention',
    slip_trip: 'Glissade/Trébuchement', psychological_event: 'Événement psychologique', other: 'Autre',
  };
  return m[c] || c;
}

function getInvestigationStatusLabel(s: string): string {
  const m: Record<string, string> = { open: 'Ouvert', in_progress: 'En cours', completed: 'Complété', closed: 'Fermé' };
  return m[s] || s;
}

function getInvestigationStatusColor(s: string): string {
  const m: Record<string, string> = { open: '#EF4444', in_progress: '#F59E0B', completed: '#22C55E', closed: '#94A3B8' };
  return m[s] || '#94A3B8';
}

// ─── Incident Card ───────────────────────────────────────────
function IncidentCard({ incident, onPress }: { incident: WorkplaceIncident; onPress: () => void }) {
  const typeColor = getIncidentTypeColor(incident.type);
  const sevColor = OccHealthUtils.getIncidentSeverityColor(incident.severity);
  const statusColor = getInvestigationStatusColor(incident.investigationStatus);
  const sectorProfile = SECTOR_PROFILES[incident.sector];

  return (
    <TouchableOpacity style={styles.incidentCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.incidentCardHeader}>
        <View style={[styles.incidentIcon, { backgroundColor: sevColor + '14' }]}>
          <Ionicons name="warning" size={20} color={sevColor} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={styles.incidentNumber}>{incident.incidentNumber}</Text>
            <View style={[styles.typeBadge, { backgroundColor: typeColor + '14' }]}>
              <Text style={[styles.typeBadgeText, { color: typeColor }]}>{getIncidentTypeLabel(incident.type)}</Text>
            </View>
            <View style={[styles.severityBadge, { backgroundColor: sevColor + '14' }]}>
              <Text style={[styles.severityBadgeText, { color: sevColor }]}>{getSeverityLabel(incident.severity)}</Text>
            </View>
          </View>
          <Text style={styles.incidentDescription} numberOfLines={2}>{incident.description}</Text>
        </View>
      </View>

      <View style={styles.incidentCardBody}>
        <View style={styles.incidentInfoRow}>
          <View style={styles.incidentInfoItem}>
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.incidentInfoText}>{new Date(incident.incidentDate).toLocaleDateString('fr-CD')} à {incident.incidentTime}</Text>
          </View>
          <View style={styles.incidentInfoItem}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.incidentInfoText}>{incident.site}</Text>
          </View>
        </View>
        <View style={styles.incidentInfoRow}>
          <View style={styles.incidentInfoItem}>
            <Ionicons name={sectorProfile.icon as any} size={14} color={sectorProfile.color} />
            <Text style={styles.incidentInfoText}>{sectorProfile.label}</Text>
          </View>
          <View style={styles.incidentInfoItem}>
            <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.incidentInfoText}>{incident.affectedWorkers.length} patient(s) affecté(s)</Text>
          </View>
        </View>
      </View>

      <View style={styles.incidentCardFooter}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '14' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusBadgeText, { color: statusColor }]}>
            {getInvestigationStatusLabel(incident.investigationStatus)}
          </Text>
        </View>
        {incident.lostTimeDays != null && incident.lostTimeDays > 0 && (
          <Text style={styles.lostDaysText}>{incident.lostTimeDays} jours perdus</Text>
        )}
        {incident.correctiveActions && (
          <Text style={styles.capaText}>
            {incident.correctiveActions.filter(c => c.status === 'completed').length}/{incident.correctiveActions.length} CAPA
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Add Incident Modal ──────────────────────────────────────
function AddIncidentModal({
  visible, onClose, onSave
}: { visible: boolean; onClose: () => void; onSave: (i: WorkplaceIncident) => void }) {
  const [description, setDescription] = useState('');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [incidentTime, setIncidentTime] = useState('08:00');
  const [type, setType] = useState<IncidentType>('near_miss');
  const [severity, setSeverity] = useState<IncidentSeverity>('minor');
  const [category, setCategory] = useState<IncidentCategory>('other');
  const [sector, setSector] = useState<IndustrySector>('mining');
  const [site, setSite] = useState('');
  const [area, setArea] = useState('');
  const [reportedBy, setReportedBy] = useState('');
  const [immediateActions, setImmediateActions] = useState('');

  const handleSave = () => {
    if (!description.trim()) {
      Alert.alert('Erreur', 'La description est obligatoire.');
      return;
    }
    const num = `INC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;
    const newIncident: WorkplaceIncident = {
      id: `inc-${Date.now()}`, incidentNumber: num,
      reportedBy: reportedBy.trim() || 'Non spécifié',
      reportedDate: new Date().toISOString().split('T')[0],
      incidentDate, incidentTime, sector, type, severity, category,
      site: site.trim() || 'Non spécifié', area: area.trim() || 'Non spécifié',
      affectedWorkers: [], description: description.trim(),
      immediateActions: immediateActions.trim(),
      ppeWorn: false, investigationStatus: 'open',
      reportedToAuthorities: false, lostTimeDays: 0,
      createdAt: new Date().toISOString(),
    };
    onSave(newIncident);
    setDescription(''); setSite(''); setArea(''); setReportedBy(''); setImmediateActions('');
  };

  const typeOptions: { value: IncidentType; label: string }[] = [
    { value: 'near_miss', label: 'Presqu\'accident' },
    { value: 'first_aid', label: 'Premiers Secours' },
    { value: 'medical_treatment', label: 'Soins Médicaux' },
    { value: 'lost_time_injury', label: 'Avec Arrêt' },
    { value: 'fatality', label: 'Décès' },
    { value: 'property_damage', label: 'Dégâts Matériels' },
  ];

  const severityOptions: { value: IncidentSeverity; label: string; color: string }[] = [
    { value: 'negligible', label: 'Négligeable', color: '#94A3B8' },
    { value: 'minor', label: 'Mineur', color: '#3B82F6' },
    { value: 'moderate', label: 'Modéré', color: '#F59E0B' },
    { value: 'major', label: 'Majeur', color: '#EF4444' },
    { value: 'critical', label: 'Critique', color: '#DC2626' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: '90%' }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Déclarer un Incident</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.textSecondary} /></TouchableOpacity>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Date de l'incident</Text>
              <TextInput style={styles.formInput} value={incidentDate} onChangeText={setIncidentDate} placeholder="AAAA-MM-JJ" />
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Heure</Text>
              <TextInput style={styles.formInput} value={incidentTime} onChangeText={setIncidentTime} placeholder="HH:MM" />
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Type d'incident</Text>
              <View style={styles.chipGrid}>
                {typeOptions.map(opt => (
                  <TouchableOpacity key={opt.value}
                    style={[styles.optionChip, type === opt.value && styles.optionChipActive]}
                    onPress={() => setType(opt.value)}>
                    <Text style={[styles.optionChipText, type === opt.value && styles.optionChipTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Gravité</Text>
              <View style={styles.chipGrid}>
                {severityOptions.map(opt => (
                  <TouchableOpacity key={opt.value}
                    style={[styles.optionChip, severity === opt.value && { backgroundColor: opt.color + '20', borderColor: opt.color }]}
                    onPress={() => setSeverity(opt.value)}>
                    <Text style={[styles.optionChipText, severity === opt.value && { color: opt.color, fontWeight: '600' }]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Description *</Text>
              <TextInput style={[styles.formInput, { minHeight: 80, textAlignVertical: 'top' }]}
                value={description} onChangeText={setDescription} placeholder="Décrivez l'incident en détail..."
                multiline numberOfLines={4} />
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Site</Text>
              <TextInput style={styles.formInput} value={site} onChangeText={setSite} placeholder="Lieu de l'incident" />
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Zone / Emplacement</Text>
              <TextInput style={styles.formInput} value={area} onChangeText={setArea} placeholder="Zone précise" />
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Déclaré par</Text>
              <TextInput style={styles.formInput} value={reportedBy} onChangeText={setReportedBy} placeholder="Nom du déclarant" />
            </View>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Actions Immédiates</Text>
              <TextInput style={[styles.formInput, { minHeight: 60, textAlignVertical: 'top' }]}
                value={immediateActions} onChangeText={setImmediateActions}
                placeholder="Actions prises immédiatement..." multiline numberOfLines={3} />
            </View>
          </ScrollView>
          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surfaceVariant }]} onPress={onClose}>
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EF4444' }]} onPress={handleSave}>
              <Ionicons name="alert-circle-outline" size={18} color="#FFF" />
              <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Déclarer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Detail Modal ────────────────────────────────────────────
function IncidentDetailModal({ visible, incident, onClose }: { visible: boolean; incident: WorkplaceIncident | null; onClose: () => void }) {
  if (!incident) return null;
  const sevColor = OccHealthUtils.getIncidentSeverityColor(incident.severity);
  const statusColor = getInvestigationStatusColor(incident.investigationStatus);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: '92%' }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{incident.incidentNumber}</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.textSecondary} /></TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <View style={[styles.typeBadge, { backgroundColor: getIncidentTypeColor(incident.type) + '14' }]}>
                <Text style={[styles.typeBadgeText, { color: getIncidentTypeColor(incident.type) }]}>{getIncidentTypeLabel(incident.type)}</Text>
              </View>
              <View style={[styles.severityBadge, { backgroundColor: sevColor + '14' }]}>
                <Text style={[styles.severityBadgeText, { color: sevColor }]}>{getSeverityLabel(incident.severity)}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '14' }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusBadgeText, { color: statusColor }]}>{getInvestigationStatusLabel(incident.investigationStatus)}</Text>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Description</Text>
              <Text style={styles.detailText}>{incident.description}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Informations</Text>
              <DetailRow label="Date" value={`${new Date(incident.incidentDate).toLocaleDateString('fr-CD')} à ${incident.incidentTime}`} />
              <DetailRow label="Site" value={incident.site} />
              <DetailRow label="Zone" value={incident.area} />
              <DetailRow label="Secteur" value={SECTOR_PROFILES[incident.sector].label} />
              <DetailRow label="Catégorie" value={getCategoryLabel(incident.category)} />
              <DetailRow label="Déclaré par" value={incident.reportedBy} />
              <DetailRow label="EPI porté" value={incident.ppeWorn ? 'Oui' : 'Non'} />
              {incident.ppeDetails && <DetailRow label="Détails EPI" value={incident.ppeDetails} />}
              {incident.lostTimeDays != null && <DetailRow label="Jours perdus" value={`${incident.lostTimeDays} jours`} />}
            </View>

            {incident.affectedWorkers.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Patients Affectés</Text>
                {incident.affectedWorkers.map((aw, i) => (
                  <View key={i} style={styles.affectedWorkerCard}>
                    <Text style={styles.affectedWorkerName}>{aw.workerName}</Text>
                    {aw.injuryType && <DetailRow label="Blessure" value={aw.injuryType} />}
                    {aw.bodyPart && <DetailRow label="Partie du corps" value={aw.bodyPart} />}
                    {aw.treatmentProvided && <DetailRow label="Traitement" value={aw.treatmentProvided} />}
                    {aw.daysOff != null && <DetailRow label="Jours d'arrêt" value={`${aw.daysOff}`} />}
                  </View>
                ))}
              </View>
            )}

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Actions Immédiates</Text>
              <Text style={styles.detailText}>{incident.immediateActions || 'N/A'}</Text>
            </View>

            {incident.rootCauses && incident.rootCauses.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Causes Racines</Text>
                {incident.rootCauses.map((rc, i) => (
                  <View key={i} style={styles.causeItem}>
                    <Ionicons name="git-branch-outline" size={14} color="#EF4444" />
                    <Text style={styles.causeText}>{rc}</Text>
                  </View>
                ))}
              </View>
            )}

            {incident.correctiveActions && incident.correctiveActions.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Actions Correctives (CAPA)</Text>
                {incident.correctiveActions.map((ca, i) => (
                  <View key={i} style={styles.capaCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name={ca.status === 'completed' ? 'checkmark-circle' : 'ellipse-outline'} size={18}
                        color={ca.status === 'completed' ? '#22C55E' : ca.status === 'overdue' ? '#EF4444' : '#F59E0B'} />
                      <Text style={styles.capaDescription}>{ca.description}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                      <Text style={styles.capaDetail}>→ {ca.assignedTo}</Text>
                      <Text style={styles.capaDetail}>Échéance: {new Date(ca.dueDate).toLocaleDateString('fr-CD')}</Text>
                    </View>
                  </View>
                ))}
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
  return (
    <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────
export function IncidentsScreen() {
  const [incidents, setIncidents] = useState<WorkplaceIncident[]>(SAMPLE_INCIDENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<IncidentType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedIncident, setSelectedIncident] = useState<WorkplaceIncident | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setIncidents(JSON.parse(stored));
      else await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_INCIDENTS));
    } catch { }
  };

  const saveData = async (list: WorkplaceIncident[]) => {
    setIncidents(list);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  const handleAdd = (inc: WorkplaceIncident) => {
    saveData([inc, ...incidents]);
    setShowAddModal(false);
    Alert.alert('Succès', `Incident ${inc.incidentNumber} déclaré.`);
  };

  const filtered = useMemo(() => {
    return incidents.filter(inc => {
      const q = searchQuery.toLowerCase();
      const matchQ = !q || inc.incidentNumber.toLowerCase().includes(q) || inc.description.toLowerCase().includes(q) || inc.site.toLowerCase().includes(q);
      const matchT = filterType === 'all' || inc.type === filterType;
      const matchS = filterStatus === 'all' || inc.investigationStatus === filterStatus;
      return matchQ && matchT && matchS;
    });
  }, [incidents, searchQuery, filterType, filterStatus]);

  // KPIs
  const kpis = useMemo(() => {
    const totalHours = incidents.length > 0 ? 200000 : 0;
    const lti = incidents.filter(i => i.type === 'lost_time_injury' || i.type === 'fatality').length;
    const tri = incidents.filter(i => i.type !== 'near_miss' && i.type !== 'property_damage' && i.type !== 'environmental').length;
    const totalLostDays = incidents.reduce((s, i) => s + (i.lostTimeDays || 0), 0);
    return {
      total: incidents.length,
      nearMisses: incidents.filter(i => i.type === 'near_miss').length,
      lti, lostDays: totalLostDays,
      ltifr: OccHealthUtils.calculateLTIFR(lti, totalHours).toFixed(2),
      trifr: OccHealthUtils.calculateTRIFR(tri, totalHours).toFixed(2),
      openInvestigations: incidents.filter(i => i.investigationStatus === 'open' || i.investigationStatus === 'in_progress').length,
    };
  }, [incidents]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Incidents & Accidents</Text>
          <Text style={styles.screenSubtitle}>Signalement, investigation et suivi (ISO 45001 §10.2)</Text>
        </View>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: '#EF4444' }]} onPress={() => setShowAddModal(true)}>
          <Ionicons name="alert-circle" size={20} color="#FFF" />
          <Text style={styles.addButtonText}>Déclarer un Incident</Text>
        </TouchableOpacity>
      </View>

      {/* KPIs */}
      <View style={styles.statsRow}>
        {[
          { label: 'Total', value: kpis.total, icon: 'warning', color: '#EF4444' },
          { label: 'Presqu\'acc.', value: kpis.nearMisses, icon: 'eye', color: '#6366F1' },
          { label: 'Avec Arrêt', value: kpis.lti, icon: 'medical', color: '#DC2626' },
          { label: 'Jours Perdus', value: kpis.lostDays, icon: 'calendar', color: '#F59E0B' },
          { label: 'LTIFR', value: kpis.ltifr, icon: 'trending-up', color: '#0891B2' },
          { label: 'Investigations', value: kpis.openInvestigations, icon: 'search', color: ACCENT },
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

      {/* Filters */}
      <View style={styles.filterBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput style={styles.searchInput} placeholder="Rechercher..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor={colors.placeholder} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollRow}>
          {['all', 'near_miss', 'first_aid', 'medical_treatment', 'lost_time_injury', 'fatality'].map(t => (
            <TouchableOpacity key={t} style={[styles.filterChip, filterType === t && styles.filterChipActive]} onPress={() => setFilterType(t as any)}>
              <Text style={[styles.filterChipText, filterType === t && styles.filterChipTextActive]}>
                {t === 'all' ? 'Tous' : getIncidentTypeLabel(t as IncidentType)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      <Text style={styles.resultsCount}>{filtered.length} incident(s)</Text>
      <View style={styles.listContainer}>
        {filtered.map(inc => (
          <IncidentCard key={inc.id} incident={inc} onPress={() => { setSelectedIncident(inc); setShowDetail(true); }} />
        ))}
        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="shield-checkmark-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyText}>Aucun incident enregistré</Text>
          </View>
        )}
      </View>

      <AddIncidentModal visible={showAddModal} onClose={() => setShowAddModal(false)} onSave={handleAdd} />
      <IncidentDetailModal visible={showDetail} incident={selectedIncident} onClose={() => { setShowDetail(false); setSelectedIncident(null); }} />
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
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: borderRadius.lg },
  addButtonText: { color: '#FFF', fontWeight: '600', fontSize: 14 },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, minWidth: isDesktop ? 130 : 100, borderRadius: borderRadius.xl, padding: 16, alignItems: 'center', ...shadows.md },
  statIcon: { width: 32, height: 32, borderRadius: borderRadius.sm, alignItems: 'center', justifyContent: 'center', marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.2)' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.9)', marginTop: 2, textAlign: 'center', fontWeight: '600' },

  filterBar: { gap: 10, marginBottom: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.lg, paddingHorizontal: 14, paddingVertical: 10, gap: 8, borderWidth: 1, borderColor: colors.outline, ...shadows.xs },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  filterScrollRow: { flexGrow: 0 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: borderRadius.full, backgroundColor: colors.surfaceVariant, marginRight: 8 },
  filterChipActive: { backgroundColor: '#EF4444' },
  filterChipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  filterChipTextActive: { color: '#FFF', fontWeight: '600' },

  resultsCount: { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
  listContainer: { gap: 12 },

  incidentCard: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 16, ...shadows.sm },
  incidentCardHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  incidentIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  incidentNumber: { fontSize: 14, fontWeight: '700', color: colors.text },
  incidentDescription: { fontSize: 13, color: colors.textSecondary, marginTop: 4, lineHeight: 18 },

  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  typeBadgeText: { fontSize: 10, fontWeight: '600' },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  severityBadgeText: { fontSize: 10, fontWeight: '600' },

  incidentCardBody: { gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.outline, marginBottom: 10 },
  incidentInfoRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  incidentInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  incidentInfoText: { fontSize: 12, color: colors.textSecondary },

  incidentCardFooter: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.outline },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.full },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  lostDaysText: { fontSize: 11, color: '#EF4444', fontWeight: '600' },
  capaText: { fontSize: 11, color: colors.textSecondary },

  emptyState: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, width: isDesktop ? 650 : '100%', maxHeight: '90%', padding: 24, ...shadows.xl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: borderRadius.lg },
  actionBtnText: { fontWeight: '600', fontSize: 14 },

  formSection: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  formInput: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.outline },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.surfaceVariant },
  optionChipActive: { backgroundColor: ACCENT + '20', borderColor: ACCENT },
  optionChipText: { fontSize: 12, color: colors.textSecondary },
  optionChipTextActive: { color: ACCENT, fontWeight: '600' },

  detailSection: { marginBottom: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.outline },
  detailSectionTitle: { fontSize: 13, fontWeight: '700', color: ACCENT, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailText: { fontSize: 13, color: colors.text, lineHeight: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  detailLabel: { fontSize: 13, color: colors.textSecondary },
  detailValue: { fontSize: 13, fontWeight: '500', color: colors.text, maxWidth: '60%', textAlign: 'right' },

  affectedWorkerCard: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.lg, padding: 12, marginBottom: 8 },
  affectedWorkerName: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },

  causeItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  causeText: { fontSize: 13, color: colors.text },

  capaCard: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.lg, padding: 12, marginBottom: 8 },
  capaDescription: { fontSize: 13, fontWeight: '500', color: colors.text, flex: 1 },
  capaDetail: { fontSize: 11, color: colors.textSecondary },
});
