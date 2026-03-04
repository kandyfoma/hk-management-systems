import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Dimensions, Modal, Alert, ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows } from '../../../theme/theme';
import DateInput from '../../../components/DateInput';
import {
  SECTOR_PROFILES, OccHealthUtils,
  type IndustrySector, type RiskAssessment, type HazardIdentification,
  type ExposureRisk, type SectorRiskLevel, type StatusHistoryEntry,
} from '../../../models/OccupationalHealth';
import { useSimpleToast } from '../../../hooks/useSimpleToast';
import { SimpleToastNotification } from '../../../components/SimpleToastNotification';

const ACCENT = colors.primary;
const STORAGE_KEY = '@occhealth_risk_assessments';
const DRAFT_STORAGE_KEY = '@occhealth_assessment_drafts';
const DEFAULT_REVIEW_OFFSET_DAYS = 180;

// Normalize search text by removing accents for better French text matching
function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function getControlLabel(c: string): string {
  const m: Record<string, string> = { elimination: 'Élimination', substitution: 'Substitution', engineering: 'Ingénierie', administrative: 'Administrative', ppe: 'EPI' };
  return m[c] || c;
}
function getControlColor(c: string): string {
  const m: Record<string, string> = { elimination: '#22C55E', substitution: colors.secondary, engineering: colors.accent, administrative: colors.warning, ppe: colors.error };
  return m[c] || colors.textTertiary;
}
function getStatusLabel(s: string): string {
  const m: Record<string, string> = { draft: 'Brouillon', active: 'Actif', under_review: 'En révision', archived: 'Archivé' };
  return m[s] || s;
}
function getStatusColor(s: string): string {
  const m: Record<string, string> = { draft: colors.textTertiary, active: '#22C55E', under_review: colors.warning, archived: colors.textSecondary, approved: colors.secondary, implemented: colors.primaryLight, reviewed: colors.accent };
  return m[s] || colors.textTertiary;
}
function safeDate(val: string | undefined | null): string {
  if (!val) return '—';
  const d = new Date(val);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-CD');
}

// ─── Status Mapping ──────────────────────────────────────────
const VALID_BACKEND_STATUSES = ['draft', 'approved', 'implemented', 'reviewed'];

const mapBackendToHazard = (hazard: any): HazardIdentification => {
  // workers_exposed is an array of IDs (M2M), NOT a count — must use .length
  const exposedIds: (string | number)[] = Array.isArray(hazard.workers_exposed) ? hazard.workers_exposed : [];
  const exposedDetails: any[] = Array.isArray(hazard.workers_exposed_details) ? hazard.workers_exposed_details : [];
  return {
    id: hazard.id,
    hazardType: hazard.hazard_type || hazard.hazardType || 'physical',
    description: hazard.hazard_description || hazard.description || '',
    affectedWorkers: exposedIds.length || Number(hazard.affectedWorkers ?? 0),
    likelihood: (Number(hazard.probability ?? hazard.likelihood) || 3) as any,
    consequence: (Number(hazard.severity ?? hazard.consequence) || 3) as any,
    riskScore: Number(hazard.risk_score ?? hazard.riskScore ?? 0),
    existingControls: typeof hazard.existing_controls === 'string'
      ? hazard.existing_controls.split('\n').filter((c: string) => c.trim())
      : (Array.isArray(hazard.existingControls) ? hazard.existingControls : []),
    additionalControls: Array.isArray(hazard.ppe_recommendations) && hazard.ppe_recommendations.length
      ? hazard.ppe_recommendations
      : (typeof hazard.additional_controls === 'string'
        ? hazard.additional_controls.split('\n').filter((c: string) => c.trim())
        : (Array.isArray(hazard.additionalControls) ? hazard.additionalControls : [])),
    controlHierarchy: hazard.control_hierarchy || hazard.controlHierarchy || 'engineering',
    responsiblePerson: hazard.responsible_person_name || hazard.responsiblePerson || 'Non assigné',
    responsiblePersonId: hazard.responsible_person || hazard.responsiblePersonId,
    targetDate: hazard.next_review_date || hazard.targetDate || new Date().toISOString().split('T')[0],
    assessmentDate: hazard.assessment_date || hazard.assessmentDate || '',
    reviewDate: hazard.review_date || hazard.reviewDate || '',
    nextReviewDate: hazard.next_review_date || hazard.nextReviewDate || '',
    assessmentStatus: hazard.status || hazard.assessmentStatus || 'draft',
    activitiesAffected: hazard.activities_affected || hazard.activitiesAffected || '',
    controlEffectiveness: hazard.control_effectiveness || hazard.controlEffectiveness || 'effective',
    residualLikelihood: Number(hazard.residual_probability ?? hazard.residualLikelihood ?? 2),
    residualConsequence: Number(hazard.residual_severity ?? hazard.residualConsequence ?? 2),
    exposedWorkerIds: exposedIds,
    exposedWorkerNames: exposedDetails.map((w: any) => w.full_name || `${w.first_name} ${w.last_name}`),
  };
};

// ─── Sample Data ─────────────────────────────────────────────
const SAMPLE_ASSESSMENTS: RiskAssessment[] = [
  {
    id: 'ra1', sector: 'mining', site: 'Site Kamoto Principal', area: 'Galerie souterraine Niv. -200m',
    assessmentDate: '2025-01-08', assessorName: 'Ing. Kasongo',
    hazards: [
      { hazardType: 'silica_dust', description: 'Exposition aux poussières de silice lors du forage et dynamitage', affectedWorkers: 45, likelihood: 4, consequence: 4, riskScore: 16, existingControls: ['Ventilation forcée', 'Masques FFP3'], additionalControls: ['Système brumisation', 'Rotation des postes'], controlHierarchy: 'engineering', responsiblePerson: 'Chef Ventilation', targetDate: '2025-03-01' },
      { hazardType: 'noise', description: 'Bruit des foreuses et concasseurs > 95 dB(A)', affectedWorkers: 60, likelihood: 5, consequence: 3, riskScore: 15, existingControls: ['Bouchons d\'oreilles fournis'], additionalControls: ['Casque anti-bruit obligatoire', 'Encoffrement machines'], controlHierarchy: 'engineering', responsiblePerson: 'HSE Manager', targetDate: '2025-04-15' },
      { hazardType: 'working_at_heights', description: 'Travaux sur plateformes sans garde-corps', affectedWorkers: 20, likelihood: 3, consequence: 5, riskScore: 15, existingControls: ['Harnais disponibles'], additionalControls: ['Installation garde-corps permanents', 'Formation travail en hauteur'], controlHierarchy: 'engineering', responsiblePerson: 'Chef Maintenance', targetDate: '2025-02-15' },
    ],
    overallRiskLevel: 'very_high', reviewDate: '2025-07-08', status: 'active', createdAt: '2025-01-08T10:00:00Z',
  },
  {
    id: 'ra2', sector: 'banking_finance', site: 'Siège Social Rawbank', area: 'Étages bureaux (1-8)',
    assessmentDate: '2025-01-12', assessorName: 'Dr. Ngoy',
    hazards: [
      { hazardType: 'ergonomic', description: 'Postures prolongées devant écran sans mobilier adapté', affectedWorkers: 200, likelihood: 4, consequence: 2, riskScore: 8, existingControls: ['Chaises standard'], additionalControls: ['Audit ergonomique complet', 'Chaises ergonomiques', 'Écrans réglables'], controlHierarchy: 'engineering', responsiblePerson: 'Dir. Logistique', targetDate: '2025-06-01' },
      { hazardType: 'psychosocial', description: 'Charge de travail élevée, objectifs commerciaux agressifs', affectedWorkers: 150, likelihood: 4, consequence: 3, riskScore: 12, existingControls: ['Cellule d\'écoute'], additionalControls: ['Programme bien-être', 'Formation gestion du stress'], controlHierarchy: 'administrative', responsiblePerson: 'DRH', targetDate: '2025-04-01' },
    ],
    overallRiskLevel: 'medium', reviewDate: '2025-07-12', status: 'active', createdAt: '2025-01-12T09:00:00Z',
  },
  {
    id: 'ra3', sector: 'healthcare', site: 'Hôpital Sendwe', area: 'Service de chirurgie',
    assessmentDate: '2024-12-15', assessorName: 'Dr. Mbala',
    hazards: [
      { hazardType: 'biological', description: 'Risque d\'exposition au sang et fluides biologiques', affectedWorkers: 35, likelihood: 4, consequence: 4, riskScore: 16, existingControls: ['EPI standard', 'Protocole AES'], additionalControls: ['Aiguilles sécurisées', 'Formation continue'], controlHierarchy: 'substitution', responsiblePerson: 'Inf. Chef', targetDate: '2025-03-01' },
      { hazardType: 'psychosocial', description: 'Surcharge de travail, travail de nuit, confrontation à la mort', affectedWorkers: 50, likelihood: 5, consequence: 3, riskScore: 15, existingControls: ['Rotation des gardes'], additionalControls: ['Groupe de parole', 'Soutien psychologique'], controlHierarchy: 'administrative', responsiblePerson: 'Dir. Nursing', targetDate: '2025-02-28' },
    ],
    overallRiskLevel: 'high', reviewDate: '2025-06-15', status: 'under_review', createdAt: '2024-12-15T14:00:00Z',
  },
];

// ─── Risk Matrix Component ───────────────────────────────────
function RiskMatrix({ hazards }: { hazards: HazardIdentification[] }) {
  const matrix = Array.from({ length: 5 }, () => Array(5).fill(0));
  let filteredCount = 0;
  hazards.forEach(h => {
    if (typeof h.likelihood !== 'number' || typeof h.consequence !== 'number') {
      filteredCount++;
      return;
    }
    if (h.likelihood >= 1 && h.likelihood <= 5 && h.consequence >= 1 && h.consequence <= 5) {
      matrix[5 - h.consequence][h.likelihood - 1]++;
    } else {
      filteredCount++;
    }
  });

  const getCellColor = (row: number, col: number): string => {
    const score = (5 - row) * (col + 1);
    if (score >= 20) return colors.errorDark + '40';
    if (score >= 12) return colors.error + '40';
    if (score >= 6) return colors.warning + '40';
    return '#22C55E40';
  };

  return (
    <View style={styles.matrixContainer}>
      <Text style={styles.matrixTitle}>Matrice de Risques (5×5)</Text>
      <View style={styles.matrixGrid}>
        <View style={styles.matrixYLabel}><Text style={styles.matrixAxisLabel}>Conséquence ↑</Text></View>
        <View>
          {matrix.map((row, ri) => (
            <View key={ri} style={styles.matrixRow}>
              <Text style={styles.matrixRowLabel}>{5 - ri}</Text>
              {row.map((count, ci) => (
                <View key={ci} style={[styles.matrixCell, { backgroundColor: getCellColor(ri, ci) }]}>
                  {count > 0 && <Text style={styles.matrixCellText}>{count}</Text>}
                </View>
              ))}
            </View>
          ))}
          <View style={styles.matrixBottomRow}>
            <Text style={styles.matrixRowLabel}> </Text>
            {[1, 2, 3, 4, 5].map(n => <Text key={n} style={styles.matrixColLabel}>{n}</Text>)}
          </View>
          <Text style={styles.matrixXLabel}>Probabilité →</Text>
        </View>
      </View>
      <View style={styles.matrixLegend}>
        {[{ label: 'Faible (1-5)', color: '#22C55E' }, { label: 'Modéré (6-11)', color: colors.warning }, { label: 'Élevé (12-19)', color: colors.error }, { label: 'Critique (20-25)', color: colors.errorDark }].map((l, i) => (
          <View key={i} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: l.color }]} />
            <Text style={styles.legendText}>{l.label}</Text>
          </View>
        ))}
      </View>
      {filteredCount > 0 && (
        <View style={styles.warningBanner}>
          <Ionicons name="information-circle" size={14} color={colors.warning} />
          <Text style={styles.warningText}>{filteredCount} danger(s) filtré(s) (scénarios invalides)</Text>
        </View>
      )}
    </View>
  );
}

// ─── Assessment Card ─────────────────────────────────────────
function AssessmentCard({ assessment, onPress }: { assessment: RiskAssessment; onPress: () => void }) {
  const sectorProfile = SECTOR_PROFILES[assessment.sector];
  const riskColor = OccHealthUtils.getSectorRiskColor(assessment.overallRiskLevel);
  const statusColor = getStatusColor(assessment.status);

  const highRisks = assessment.hazards.filter(h => h.riskScore >= 12).length;
  const totalWorkers = assessment.hazards.reduce((s, h) => s + (Number(h.affectedWorkers) || 0), 0);

  return (
    <TouchableOpacity style={styles.assessmentCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.assessmentCardHeader}>
        <View style={[styles.assessmentIcon, { backgroundColor: riskColor + '14' }]}>
          <Ionicons name="alert-circle" size={20} color={riskColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.assessmentSite}>{assessment.site}</Text>
          <Text style={styles.assessmentArea}>{assessment.area}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View style={[styles.riskLevelBadge, { backgroundColor: riskColor + '14' }]}>
            <Text style={[styles.riskLevelText, { color: riskColor }]}>
              {OccHealthUtils.getSectorRiskLabel(assessment.overallRiskLevel)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '14' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{getStatusLabel(assessment.status)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.assessmentCardBody}>
        <View style={styles.assessmentInfoRow}>
          <View style={styles.assessmentInfoItem}>
            <Ionicons name={sectorProfile.icon as any} size={14} color={sectorProfile.color} />
            <Text style={styles.assessmentInfoText}>{sectorProfile.label}</Text>
          </View>
          <View style={styles.assessmentInfoItem}>
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.assessmentInfoText}>{safeDate(assessment.assessmentDate)}</Text>
          </View>
        </View>
        <View style={styles.assessmentInfoRow}>
          <View style={styles.assessmentInfoItem}>
            <Ionicons name="warning-outline" size={14} color={colors.error} />
            <Text style={styles.assessmentInfoText}>{assessment.hazards.length} dangers identifiés ({highRisks} élevés)</Text>
          </View>
          <View style={styles.assessmentInfoItem}>
            <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.assessmentInfoText}>{totalWorkers} travailleurs exposés</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Detail Modal ────────────────────────────────────────────
function AssessmentDetailModal({ visible, assessment, onClose, onDelete, onUpdate }: { visible: boolean; assessment: RiskAssessment | null; onClose: () => void; onDelete?: (id: string) => void; onUpdate?: (hazard: HazardIdentification) => void }) {
  if (!assessment) return null;
  const sectorProfile = SECTOR_PROFILES[assessment.sector];
  const riskColor = OccHealthUtils.getSectorRiskColor(assessment.overallRiskLevel);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: '92%' }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Évaluation des Risques</Text>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.textSecondary} /></TouchableOpacity>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Informations Générales</Text>
              <DetailRow label="Site" value={assessment.site} />
              <DetailRow label="Zone" value={assessment.area} />
              <DetailRow label="Secteur" value={sectorProfile.label} />
              <DetailRow label="Date évaluation" value={safeDate(assessment.assessmentDate)} />
              <DetailRow label="Évaluateur" value={assessment.assessorName} />
              <DetailRow label="Prochaine révision" value={safeDate(assessment.reviewDate)} />
              <DetailRow label="Niveau global" value={OccHealthUtils.getSectorRiskLabel(assessment.overallRiskLevel)} />
            </View>

            {/* Risk Matrix */}
            <RiskMatrix hazards={assessment.hazards} />

            {/* Hazards List */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Dangers Identifiés</Text>
              {assessment.hazards.map((h, i) => {
                const riskScoreColor = OccHealthUtils.getRiskScoreColor(h.riskScore);
                const controlColor = getControlColor(h.controlHierarchy);
                return (
                  <View key={i} style={styles.hazardCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <Ionicons name="warning" size={16} color={riskScoreColor} />
                        <Text style={styles.hazardType}>{OccHealthUtils.getExposureRiskLabel(h.hazardType)}</Text>
                      </View>
                      <View style={[styles.scoreBadge, { backgroundColor: riskScoreColor + '14' }]}>
                        <Text style={[styles.scoreText, { color: riskScoreColor }]}>
                          Score: {h.riskScore} ({OccHealthUtils.getRiskScoreLabel(h.riskScore)})
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.hazardDesc}>{h.description}</Text>
                    <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
                      <Text style={styles.hazardMeta}>P: {h.likelihood}/5</Text>
                      <Text style={styles.hazardMeta}>C: {h.consequence}/5</Text>
                      <Text style={styles.hazardMeta}>{h.affectedWorkers} travailleurs</Text>
                    </View>

                    {/* Exposed workers */}
                    {(h as any).exposedWorkerNames?.length > 0 && (
                      <View style={{ marginTop: 8 }}>
                        <Text style={styles.controlTitle}>Travailleurs exposés:</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                          {(h as any).exposedWorkerNames.map((name: string, j: number) => (
                            <View key={j} style={{ backgroundColor: colors.error + '15', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 }}>
                              <Text style={{ color: colors.error, fontSize: 11, fontWeight: '500' }}>{name}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    <View style={{ marginTop: 8 }}>
                      <Text style={styles.controlTitle}>Contrôles existants:</Text>
                      {h.existingControls.map((c, j) => (
                        <View key={j} style={styles.controlItem}>
                          <Ionicons name="checkmark-circle-outline" size={12} color="#22C55E" />
                          <Text style={styles.controlText}>{c}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={{ marginTop: 6 }}>
                      <Text style={styles.controlTitle}>Contrôles additionnels:</Text>
                      {h.additionalControls.map((c, j) => (
                        <View key={j} style={styles.controlItem}>
                          <Ionicons name="add-circle-outline" size={12} color={ACCENT} />
                          <Text style={styles.controlText}>{c}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <View style={[styles.controlHierarchyBadge, { backgroundColor: controlColor + '14' }]}>
                        <Text style={[styles.controlHierarchyText, { color: controlColor }]}>{getControlLabel(h.controlHierarchy)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        <Text style={styles.hazardMeta}>→ {h.responsiblePerson} • {safeDate(h.targetDate)}</Text>
                        {onUpdate && (
                          <TouchableOpacity 
                            onPress={() => onUpdate(h)}
                            style={{ padding: 4 }}
                          >
                            <Ionicons name="pencil-outline" size={16} color={ACCENT} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Audit Trail Section */}
            {assessment.statusHistory && assessment.statusHistory.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Historique des Modifications</Text>
                {assessment.statusHistory.map((entry: StatusHistoryEntry, i: number) => (
                  <View key={i} style={styles.historyEntry}>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={{ alignItems: 'center' }}>
                        <View style={styles.historyDot} />
                        {i < assessment.statusHistory!.length - 1 && <View style={styles.historyLine} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <View style={[styles.historyStatus, { backgroundColor: getStatusColor(entry.status || 'draft') + '20' }]}>
                            <Text style={[styles.historyStatusText, { color: getStatusColor(entry.status || 'draft') }]}>
                              {getStatusLabel(entry.status || 'draft')}
                            </Text>
                          </View>
                          <Text style={styles.historyMeta}>{entry.changed_by_name || 'Système'}</Text>
                        </View>
                        {entry.note && <Text style={styles.historyNote}>{entry.note}</Text>}
                        <Text style={styles.historyTime}>{entry.changed_at ? new Date(entry.changed_at).toLocaleString('fr-CD') : ''}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
          <View style={styles.modalActions}>
            {onDelete && (
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.error }]} onPress={() => { onClose(); onDelete(assessment.id); }}>
                <Ionicons name="trash-outline" size={18} color="#FFF" />
                <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Supprimer</Text>
              </TouchableOpacity>
            )}
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

// ─── Edit Hazard Modal ───────────────────────────────────────
function EditHazardModal({ visible, hazard, onClose, onSave }: { visible: boolean; hazard: (HazardIdentification & { assessmentId?: string }) | null; onClose: () => void; onSave: (hazard: HazardIdentification) => Promise<void> }) {
  const { showToast } = useSimpleToast();
  const [description, setDescription] = useState('');
  const [hazardType, setHazardType] = useState('physical');
  const [likelihood, setLikelihood] = useState('3');
  const [consequence, setConsequence] = useState('3');
  const [existingControls, setExistingControls] = useState('');
  const [additionalControls, setAdditionalControls] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && hazard) {
      setDescription(hazard.description || '');
      setHazardType(hazard.hazardType || 'physical');
      setLikelihood(String(hazard.likelihood ?? 3));
      setConsequence(String(hazard.consequence ?? 3));
      setExistingControls(hazard.existingControls?.join('\n') || '');
      setAdditionalControls(hazard.additionalControls?.join('\n') || '');
      setResponsiblePerson(hazard.responsiblePerson || '');
      setTargetDate(hazard.targetDate || '');
    }
  }, [visible, hazard]);

  const riskScore = Number(likelihood) * Number(consequence);

  const handleSave = async () => {
    if (!description.trim()) {
      showToast('La description est obligatoire', 'error');
      return;
    }

    if (!responsiblePerson.trim()) {
      showToast('Le responsable est obligatoire', 'error');
      return;
    }

    setSaving(true);
    try {
      const updatedHazard: HazardIdentification = {
        ...hazard!,
        description: description.trim(),
        hazardType: hazardType as ExposureRisk,
        likelihood: (Number(likelihood) || 3) as any,
        consequence: (Number(consequence) || 3) as any,
        riskScore: riskScore,
        existingControls: existingControls.split('\n').filter(c => c.trim()),
        additionalControls: additionalControls.split('\n').filter(c => c.trim()),
        responsiblePerson: responsiblePerson.trim(),
        targetDate,
      };

      await onSave(updatedHazard);
      onClose();
    } catch (error) {
      console.error('Error saving hazard:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!hazard) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: '90%' }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier le Danger</Text>
              <TouchableOpacity onPress={onClose} disabled={saving}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Description *</Text>
              <TextInput
                style={[styles.formInput, { minHeight: 80, textAlignVertical: 'top' }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Description complète du danger..."
                multiline
                editable={!saving}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Type de Danger</Text>
              <View style={styles.chipGrid}>
                {[
                  { value: 'physical', label: 'Physique' },
                  { value: 'chemical', label: 'Chimique' },
                  { value: 'biological', label: 'Biologique' },
                  { value: 'psychosocial', label: 'Psychosocial' },
                  { value: 'ergonomic', label: 'Ergonomique' },
                  { value: 'safety', label: 'Sécurité' },
                ].map(t => (
                  <TouchableOpacity
                    key={t.value}
                    style={[styles.optionChip, hazardType === t.value && { backgroundColor: ACCENT + '20', borderColor: ACCENT }]}
                    onPress={() => setHazardType(t.value)}
                    disabled={saving}
                  >
                    <Text style={[styles.optionChipText, hazardType === t.value && { color: ACCENT, fontWeight: '600' }]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>Probabilité (1-5)</Text>
                <View style={styles.chipGrid}>
                  {['1', '2', '3', '4', '5'].map(v => (
                    <TouchableOpacity
                      key={v}
                      style={[styles.optionChip, { flex: 1, justifyContent: 'center', backgroundColor: likelihood === v ? ACCENT + '20' : undefined }]}
                      onPress={() => setLikelihood(v)}
                      disabled={saving}
                    >
                      <Text style={[styles.optionChipText, { textAlign: 'center', fontWeight: likelihood === v ? '700' : '500' }]}>
                        {v}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>Gravité (1-5)</Text>
                <View style={styles.chipGrid}>
                  {['1', '2', '3', '4', '5'].map(v => (
                    <TouchableOpacity
                      key={v}
                      style={[styles.optionChip, { flex: 1, justifyContent: 'center', backgroundColor: consequence === v ? colors.error + '20' : undefined }]}
                      onPress={() => setConsequence(v)}
                      disabled={saving}
                    >
                      <Text style={[styles.optionChipText, { textAlign: 'center', fontWeight: consequence === v ? '700' : '500' }]}>
                        {v}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={{ backgroundColor: riskScore >= 16 ? colors.errorDark + '40' : riskScore >= 12 ? colors.error + '40' : riskScore >= 6 ? colors.warning + '40' : '#22C55E40', borderRadius: borderRadius.lg, padding: 12, marginBottom: 16 }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>Score de Risque</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: riskScore >= 16 ? colors.errorDark : riskScore >= 12 ? colors.error : riskScore >= 6 ? colors.warning : '#22C55E' }}>
                {likelihood} × {consequence} = {riskScore} {riskScore >= 16 ? '(CRITIQUE)' : riskScore >= 12 ? '(ÉLEVÉ)' : riskScore >= 6 ? '(MOYEN)' : '(FAIBLE)'}
              </Text>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Contrôles Existants</Text>
              <TextInput
                style={[styles.formInput, { minHeight: 70, textAlignVertical: 'top' }]}
                value={existingControls}
                onChangeText={setExistingControls}
                placeholder="Un contrôle par ligne..."
                multiline
                editable={!saving}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Contrôles Additionnels</Text>
              <TextInput
                style={[styles.formInput, { minHeight: 70, textAlignVertical: 'top' }]}
                value={additionalControls}
                onChangeText={setAdditionalControls}
                placeholder="Un contrôle par ligne..."
                multiline
                editable={!saving}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Responsable</Text>
              <TextInput
                style={styles.formInput}
                value={responsiblePerson}
                onChangeText={setResponsiblePerson}
                placeholder="Nom du responsable"
                editable={!saving}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Date Cible</Text>
              <TouchableOpacity
                style={[styles.formInput, { justifyContent: 'center' }]}
                disabled={saving}
              >
                <Text style={{ color: targetDate ? colors.text : colors.textSecondary }}>
                  {targetDate ? new Date(targetDate).toLocaleDateString('fr-CD') : 'Sélectionner une date'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.surfaceVariant, opacity: saving ? 0.6 : 1 }]}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: ACCENT, opacity: saving ? 0.6 : 1 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={16} color="#FFF" />
                  <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Enregistrer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Add Modal ───────────────────────────────────────────────
interface User {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  primary_role?: string;
}

interface MineWorker {
  id: string | number;
  employee_id: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  job_title?: string;
  job_category_display?: string;
  work_site_name?: string;
}

function AddAssessmentModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (a: RiskAssessment) => void }) {
  const { showToast } = useSimpleToast();
  const [step, setStep] = useState<'assessment' | 'hazards'>('assessment');
  const [site, setSite] = useState('');
  const [area, setArea] = useState('');
  const [sector, setSector] = useState<IndustrySector>('mining');
  const [assessorName, setAssessorName] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [workers, setWorkers] = useState<User[]>([]);
  const [workerSearchText, setWorkerSearchText] = useState('');
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);
  const [filteredWorkers, setFilteredWorkers] = useState<User[]>([]);
  // Mine workers (workers_exposed)
  const [mineWorkers, setMineWorkers] = useState<MineWorker[]>([]);
  const [filteredMineWorkers, setFilteredMineWorkers] = useState<MineWorker[]>([]);
  const [selectedExposedWorkers, setSelectedExposedWorkers] = useState<MineWorker[]>([]);
  const [mineWorkerSearchText, setMineWorkerSearchText] = useState('');
  const [showExposedWorkersDropdown, setShowExposedWorkersDropdown] = useState(false);
  const [assessorSearchText, setAssessorSearchText] = useState('');
  const [filteredAssessors, setFilteredAssessors] = useState<User[]>([]);
  const [hazards, setHazards] = useState<HazardIdentification[]>([]);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Hazard form state
  const [hazDescription, setHazDescription] = useState('');
  const [hazType, setHazType] = useState('physical');
  const [likelihood, setLikelihood] = useState('3');
  const [consequence, setConsequence] = useState('3');
  const [affectedWorkers, setAffectedWorkers] = useState('0');
  const [activitiesAffected, setActivitiesAffected] = useState('');
  const [existingControls, setExistingControls] = useState('');
  const [controlEffectiveness, setControlEffectiveness] = useState<'very_effective' | 'effective' | 'partially_effective' | 'ineffective'>('effective');
  const [residualLikelihood, setResidualLikelihood] = useState('2');
  const [residualConsequence, setResidualConsequence] = useState('2');
  const [additionalControls, setAdditionalControls] = useState('');
  const [controlHierarchy, setControlHierarchy] = useState<'elimination' | 'substitution' | 'engineering' | 'administrative' | 'ppe'>('engineering');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [responsiblePersonId, setResponsiblePersonId] = useState<string | null>(null);
  const [enterpriseId, setEnterpriseId] = useState<string | null>(null);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [assessmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [reviewDate, setReviewDate] = useState(new Date(Date.now() + DEFAULT_REVIEW_OFFSET_DAYS * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [nextReviewDate, setNextReviewDate] = useState(new Date(Date.now() + DEFAULT_REVIEW_OFFSET_DAYS * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [assessmentStatus, setAssessmentStatus] = useState<'draft' | 'approved' | 'implemented' | 'reviewed'>('draft');

  const riskScore = Number(likelihood) * Number(consequence);

  // Fetch current user and list of users when modal opens
  useEffect(() => {
    if (visible) {
      fetchUserData();
    }
  }, [visible]);

  const fetchUserData = async () => {
    try {
      setLoadingUsers(true);
      const token = await AsyncStorage.getItem('auth_token');
      const baseURL = await AsyncStorage.getItem('api_base_url') || 'http://localhost:8000';

      if (!token) return;

      // Fetch current user profile
      const profileResponse = await axios.get(
        `${baseURL}/api/v1/auth/profile/`,
        { headers: { Authorization: `Token ${token}` }, timeout: 5000 }
      );
      const user: User = profileResponse.data.user || profileResponse.data;
      setCurrentUser(user);
      setAssessorName(`${user.first_name} ${user.last_name}`);
      // Store enterprise ID for hazard creation
      if (profileResponse.data.enterprise_id) {
        setEnterpriseId(profileResponse.data.enterprise_id);
      }

      // Fetch list of all users for responsible person selection
      const usersResponse = await axios.get(
        `${baseURL}/api/v1/auth/users/`,
        { headers: { Authorization: `Token ${token}` }, timeout: 5000 }
      );
      const users = Array.isArray(usersResponse.data) ? usersResponse.data : usersResponse.data.results || [];
      const otherUsers = users.filter((u: User) => u.id !== user.id);
      setAvailableUsers(otherUsers);
      setWorkers(users); // Use users for responsible person selection
      setFilteredWorkers(users);

      // Fetch mine workers for workers_exposed selection
      try {
        const workersResponse = await axios.get(
          `${baseURL}/api/v1/occupational-health/workers/`,
          { headers: { Authorization: `Token ${token}` }, timeout: 5000 }
        );
        const mineWorkersList: MineWorker[] = Array.isArray(workersResponse.data)
          ? workersResponse.data
          : workersResponse.data.results || [];
        setMineWorkers(mineWorkersList);
        setFilteredMineWorkers(mineWorkersList);
      } catch {
        // Workers endpoint optional — don't break the modal if it fails
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleWorkerSearch = (text: string) => {
    setWorkerSearchText(text);
    if (!text.trim()) {
      setFilteredWorkers(workers);
      return;
    }
    const normalized = normalizeText(text.toLowerCase());
    const filtered = workers.filter(worker => {
      const nameMatch = normalizeText(`${worker.first_name} ${worker.last_name}`.toLowerCase()).includes(normalized);
      const emailMatch = worker.email && normalizeText(worker.email.toLowerCase()).includes(normalized);
      const idMatch = false; // User doesn't have employee_id field
      return nameMatch || emailMatch || idMatch;
    });
    setFilteredWorkers(filtered);
  };

  const handleSelectWorker = (user: User) => {
    setResponsiblePerson(`${user.first_name} ${user.last_name}`);
    setResponsiblePersonId(user.id);
    setShowWorkerDropdown(false);
    setWorkerSearchText('');
    if (errors.responsiblePerson) setErrors(prev => ({ ...prev, responsiblePerson: '' }));
  };

  const handleAssessorSearch = (text: string) => {
    setAssessorSearchText(text);
    if (!text.trim()) {
      setFilteredAssessors(currentUser ? [currentUser, ...availableUsers] : availableUsers);
      return;
    }
    const normalized = normalizeText(text.toLowerCase());
    const allAssessors = currentUser ? [currentUser, ...availableUsers] : availableUsers;
    const filtered = allAssessors.filter(user => {
      const nameMatch = normalizeText(`${user.first_name} ${user.last_name}`.toLowerCase()).includes(normalized);
      const emailMatch = user.email && user.email.toLowerCase().includes(text.toLowerCase());
      return nameMatch || emailMatch;
    });
    setFilteredAssessors(filtered);
  };

  const handleSelectAssessor = (user: User) => {
    setAssessorName(`${user.first_name} ${user.last_name}`);
    setShowUserDropdown(false);
    setAssessorSearchText('');
    if (errors.assessorName) setErrors(prev => ({ ...prev, assessorName: '' }));
  };

  const saveDraft = async () => {
    try {
      const draftData = {
        id: currentDraftId || `draft_${Date.now()}`,
        site,
        area,
        sector,
        assessorName,
        hazards,
        targetDate,
        reviewDate,
        nextReviewDate,
        assessmentStatus,
        createdAt: currentDraftId ? new Date().toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const existingDrafts = JSON.parse(await AsyncStorage.getItem(DRAFT_STORAGE_KEY) || '[]');
      const draftIndex = existingDrafts.findIndex((d: any) => d.id === draftData.id);

      if (draftIndex >= 0) {
        existingDrafts[draftIndex] = draftData;
      } else {
        existingDrafts.push(draftData);
      }

      await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(existingDrafts));
      setCurrentDraftId(draftData.id);
      showToast('Brouillon sauvegardé avec succès', 'success');
    } catch (error) {
      console.error('Error saving draft:', error);
      showToast('Erreur lors de la sauvegarde du brouillon', 'error');
    }
  };

  const validateAssessment = () => {
    const newErrors: Record<string, string> = {};
    if (!site.trim()) newErrors.site = 'Le site est obligatoire';
    if (!area.trim()) newErrors.area = 'La zone est obligatoire';
    if (!assessorName.trim()) newErrors.assessorName = 'L\'évaluateur est obligatoire';
    return newErrors;
  };

  const validateHazard = () => {
    const newErrors: Record<string, string> = {};
    if (!hazDescription.trim()) newErrors.hazDescription = 'La description est obligatoire';
    if (!responsiblePerson.trim()) newErrors.responsiblePerson = 'Le responsable est obligatoire';
    return newErrors;
  };

  const handleAddHazard = () => {
    const newErrors = validateHazard();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }

    const newHazardBase: HazardIdentification & Record<string, any> = {
      hazardType: hazType as ExposureRisk,
      description: hazDescription.trim(),
      affectedWorkers: Number(affectedWorkers) || 0,
      likelihood: (Number(likelihood) || 3) as any,
      consequence: (Number(consequence) || 3) as any,
      riskScore: riskScore,
      existingControls: existingControls.split('\n').filter(c => c.trim()),
      additionalControls: additionalControls.split('\n').filter(c => c.trim()),
      controlHierarchy,
      responsiblePerson: responsiblePerson.trim(),
      responsiblePersonId: responsiblePersonId || undefined,
      targetDate,
      // Additional fields for backend
      activitiesAffected: activitiesAffected.trim(),
      controlEffectiveness,
      residualLikelihood: Number(residualLikelihood) || 2,
      residualConsequence: Number(residualConsequence) || 2,
      assessmentDate,
      reviewDate,
      nextReviewDate,
      assessmentStatus,
    };

    const newHazard = {
      ...newHazardBase,
      exposedWorkerIds: selectedExposedWorkers.map(w => w.id),
      exposedWorkerNames: selectedExposedWorkers.map(w => w.full_name || `${w.first_name} ${w.last_name}`),
    };
    setHazards([...hazards, newHazard]);
    
    // Reset hazard form
    setHazDescription('');
    setHazType('physical');
    setLikelihood('3');
    setConsequence('3');
    setAffectedWorkers('0');
    setActivitiesAffected('');
    setExistingControls('');
    setControlEffectiveness('effective');
    setResidualLikelihood('2');
    setResidualConsequence('2');
    setAdditionalControls('');
    setControlHierarchy('engineering');
    setResponsiblePerson('');
    setResponsiblePersonId(null);
    setSelectedExposedWorkers([]);
    setMineWorkerSearchText('');
    setShowExposedWorkersDropdown(false);
    setTargetDate(new Date().toISOString().split('T')[0]);
    setReviewDate(new Date(Date.now() + DEFAULT_REVIEW_OFFSET_DAYS * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setNextReviewDate(new Date(Date.now() + DEFAULT_REVIEW_OFFSET_DAYS * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setAssessmentStatus('draft');
    setErrors({});
    setShowWorkerDropdown(false);
    setWorkerSearchText('');
    
    showToast('Danger ajouté', 'success');
  };

  const handleRemoveHazard = (index: number) => {
    setHazards(hazards.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const newErrors = validateAssessment();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }

    if (hazards.length === 0) {
      showToast('Ajoutez au moins un danger', 'error');
      return;
    }

    const newAssessment: RiskAssessment = {
      id: `ra-${Date.now()}`,
      sector,
      site: site.trim(),
      area: area.trim(),
      assessmentDate: new Date().toISOString().split('T')[0],
      assessorName: assessorName.trim(),
      hazards,
      overallRiskLevel: hazards.some(h => h.riskScore >= 16) ? 'very_high' : 
                       hazards.some(h => h.riskScore >= 10) ? 'high' :
                       hazards.some(h => h.riskScore >= 5) ? 'medium' : 'low',
      reviewDate: new Date(Date.now() + DEFAULT_REVIEW_OFFSET_DAYS * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'draft',
      createdAt: new Date().toISOString(),
    };

    onSave(newAssessment);
    
    // Reset form
    setSite('');
    setArea('');
    setAssessorName('');
    setHazards([]);
    setStep('assessment');
    setErrors({});
  };

  const handleClose = () => {
    setSite('');
    setArea('');
    setAssessorName('');
    setHazards([]);
    setStep('assessment');
    setErrors({});
    setShowUserDropdown(false);
    setShowWorkerDropdown(false);
    setWorkerSearchText('');
    setSelectedExposedWorkers([]);
    setMineWorkerSearchText('');
    setShowExposedWorkersDropdown(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: '92%' }]}>
          {/* Step Indicator */}
          <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.outline }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.stepIndicatorCircle, { backgroundColor: step === 'assessment' ? ACCENT : '#22C55E' }]}>
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>1</Text>
                </View>
                <View style={{ flex: 1, height: 2, backgroundColor: step === 'hazards' ? ACCENT : colors.outline, marginHorizontal: 8 }} />
                <View style={[styles.stepIndicatorCircle, { backgroundColor: step === 'hazards' ? ACCENT : colors.surfaceVariant }]}>
                  <Text style={{ color: step === 'hazards' ? '#FFF' : colors.text, fontWeight: '700', fontSize: 14 }}>2</Text>
                </View>
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 8 }}>
              <Text style={{ fontSize: 11, color: step === 'assessment' ? ACCENT : colors.textSecondary, fontWeight: '500' }}>Évaluation</Text>
              <Text style={{ fontSize: 11, color: step === 'hazards' ? ACCENT : colors.textSecondary, fontWeight: '500' }}>Dangers</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{step === 'assessment' ? 'Nouvelle Évaluation' : 'Ajouter un Danger'}</Text>
              <TouchableOpacity onPress={handleClose}><Ionicons name="close" size={24} color={colors.textSecondary} /></TouchableOpacity>
            </View>

            {step === 'assessment' ? (
              <>
                <View style={styles.formSection}>
                  <Text style={[styles.formLabel, errors.site && { color: colors.error }]}>Site *</Text>
                  <TextInput 
                    style={[styles.formInput, errors.site && { borderColor: colors.error, borderWidth: 2 }]} 
                    value={site} 
                    onChangeText={(text) => { setSite(text); if (errors.site) setErrors(prev => ({ ...prev, site: '' })); }} 
                    placeholder="Nom du site (ex: Mine Kamoto)"
                  />
                  {errors.site && <Text style={styles.formError}>{errors.site}</Text>}
                </View>

                <View style={styles.formSection}>
                  <Text style={[styles.formLabel, errors.area && { color: colors.error }]}>Zone *</Text>
                  <TextInput 
                    style={[styles.formInput, errors.area && { borderColor: colors.error, borderWidth: 2 }]} 
                    value={area} 
                    onChangeText={(text) => { setArea(text); if (errors.area) setErrors(prev => ({ ...prev, area: '' })); }} 
                    placeholder="Zone évaluée (ex: Galerie -200m)"
                  />
                  {errors.area && <Text style={styles.formError}>{errors.area}</Text>}
                </View>

                <View style={styles.formSection}>
                  <Text style={[styles.formLabel, errors.assessorName && { color: colors.error }]}>Évaluateur *</Text>
                  <TouchableOpacity
                    style={[styles.formInput, { paddingRight: 12, justifyContent: 'center', backgroundColor: showUserDropdown ? colors.surfaceVariant : colors.surfaceVariant }, errors.assessorName && { borderColor: colors.error, borderWidth: 2 }]}
                    onPress={() => {
                      setShowUserDropdown(!showUserDropdown);
                      if (!showUserDropdown) setFilteredAssessors(currentUser ? [currentUser, ...availableUsers] : availableUsers);
                      setAssessorSearchText('');
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <Text style={{ color: assessorName ? colors.text : colors.textSecondary, flex: 1 }} numberOfLines={1}>
                        {loadingUsers ? 'Chargement...' : (assessorName || 'Sélectionner un évaluateur')}
                      </Text>
                      <Ionicons name={showUserDropdown ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                    </View>
                  </TouchableOpacity>
                  
                  {showUserDropdown && (
                    <View style={{ backgroundColor: colors.surface, borderRadius: borderRadius.md, marginTop: 8, borderWidth: 1, borderColor: colors.outline, overflow: 'hidden' }}>
                      {/* Search Input */}
                      <View style={{ paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.outline, backgroundColor: colors.surfaceVariant }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.md, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.outline }}>
                          <Ionicons name="search" size={16} color={colors.textSecondary} />
                          <TextInput
                            style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 8, color: colors.text, fontSize: 13 }}
                            placeholder="Rechercher..."
                            placeholderTextColor={colors.textSecondary}
                            value={assessorSearchText}
                            onChangeText={handleAssessorSearch}
                          />
                          {assessorSearchText ? (
                            <TouchableOpacity onPress={() => { setAssessorSearchText(''); setFilteredAssessors(currentUser ? [currentUser, ...availableUsers] : availableUsers); }}>
                              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      </View>

                      {/* Results */}
                      <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled>
                        {filteredAssessors.length > 0 ? (
                          filteredAssessors.map(user => {
                            const isCurrent = currentUser && user.id === currentUser.id;
                            return (
                              <TouchableOpacity
                                key={user.id}
                                style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.outline, backgroundColor: isCurrent ? colors.surfaceVariant : 'transparent' }}
                                onPress={() => handleSelectAssessor(user)}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: ACCENT + '20', justifyContent: 'center', alignItems: 'center' }}>
                                    <Text style={{ color: ACCENT, fontWeight: '700', fontSize: 12 }}>
                                      {user.first_name[0]}{user.last_name[0]}
                                    </Text>
                                  </View>
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>
                                      {user.first_name} {user.last_name}
                                      {isCurrent && <Text style={{ color: ACCENT, fontWeight: '600' }}> (Moi)</Text>}
                                    </Text>
                                    {user.primary_role && <Text style={{ color: ACCENT, fontSize: 11, fontWeight: '600', marginTop: 1 }}>{user.primary_role}</Text>}
                                    {user.email && <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 1 }}>{user.email}</Text>}
                                  </View>
                                  {isCurrent && <Ionicons name="checkmark-circle" size={20} color={ACCENT} />}
                                </View>
                              </TouchableOpacity>
                            );
                          })
                        ) : (
                          <View style={{ padding: 16, justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Aucun résultat trouvé</Text>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  )}
                  
                  {errors.assessorName && <Text style={styles.formError}>{errors.assessorName}</Text>}
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Secteur</Text>
                  <View style={styles.chipGrid}>
                    {(Object.keys(SECTOR_PROFILES) as IndustrySector[]).slice(0, 8).map(s => {
                      const sp = SECTOR_PROFILES[s];
                      const sel = sector === s;
                      return (
                        <TouchableOpacity key={s} style={[styles.optionChip, sel && { backgroundColor: sp.color + '20', borderColor: sp.color }]} onPress={() => setSector(s)}>
                          <Ionicons name={sp.icon as any} size={12} color={sel ? sp.color : colors.textSecondary} />
                          <Text style={[styles.optionChipText, sel && { color: sp.color, fontWeight: '600' }]}>{sp.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={{ backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.lg, padding: 12, marginTop: 16, marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Ionicons name="information-circle" size={16} color={ACCENT} />
                    <Text style={{ fontSize: 12, color: colors.text, fontWeight: '600' }}>Dangers à ajouter</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 16 }}>À l'étape suivante, vous pourrez ajouter plusieurs dangers avec leur probabilité, gravité et contrôles recommandés.</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.formSection}>
                  <Text style={[styles.formLabel, errors.hazDescription && { color: colors.error }]}>Description du Danger *</Text>
                  <TextInput 
                    style={[styles.formInput, errors.hazDescription && { borderColor: colors.error, borderWidth: 2 }, { minHeight: 70, textAlignVertical: 'top' }]} 
                    value={hazDescription} 
                    onChangeText={(text) => { setHazDescription(text); if (errors.hazDescription) setErrors(prev => ({ ...prev, hazDescription: '' })); }} 
                    placeholder="Description complète du danger..."
                    multiline
                  />
                  {errors.hazDescription && <Text style={styles.formError}>{errors.hazDescription}</Text>}
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Type de Danger</Text>
                  <View style={styles.chipGrid}>
                    {[
                      { value: 'physical', label: 'Physique' },
                      { value: 'chemical', label: 'Chimique' },
                      { value: 'biological', label: 'Biologique' },
                      { value: 'psychosocial', label: 'Psychosocial' },
                      { value: 'ergonomic', label: 'Ergonomique' },
                      { value: 'safety', label: 'Sécurité' },
                    ].map(t => (
                      <TouchableOpacity 
                        key={t.value} 
                        style={[styles.optionChip, hazType === t.value && { backgroundColor: ACCENT + '20', borderColor: ACCENT }]} 
                        onPress={() => setHazType(t.value)}
                      >
                        <Text style={[styles.optionChipText, hazType === t.value && { color: ACCENT, fontWeight: '600' }]}>{t.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Probabilité (1-5)</Text>
                    <View style={styles.chipGrid}>
                      {['1', '2', '3', '4', '5'].map(v => (
                        <TouchableOpacity 
                          key={v} 
                          style={[styles.optionChip, { flex: 1, justifyContent: 'center', backgroundColor: likelihood === v ? ACCENT + '20' : undefined }]} 
                          onPress={() => setLikelihood(v)}
                        >
                          <Text style={[styles.optionChipText, { textAlign: 'center', fontWeight: likelihood === v ? '700' : '500' }]}>{v}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Gravité (1-5)</Text>
                    <View style={styles.chipGrid}>
                      {['1', '2', '3', '4', '5'].map(v => (
                        <TouchableOpacity 
                          key={v} 
                          style={[styles.optionChip, { flex: 1, justifyContent: 'center', backgroundColor: consequence === v ? colors.error + '20' : undefined }]} 
                          onPress={() => setConsequence(v)}
                        >
                          <Text style={[styles.optionChipText, { textAlign: 'center', fontWeight: consequence === v ? '700' : '500' }]}>{v}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                <View style={{ backgroundColor: riskScore >= 16 ? colors.errorDark + '40' : riskScore >= 12 ? colors.error + '40' : riskScore >= 6 ? colors.warning + '40' : '#22C55E40', borderRadius: borderRadius.lg, padding: 12, marginBottom: 16 }}>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>Score de Risque</Text>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: riskScore >= 16 ? colors.errorDark : riskScore >= 12 ? colors.error : riskScore >= 6 ? colors.warning : '#22C55E' }}>
                    {likelihood} × {consequence} = {riskScore} {riskScore >= 16 ? '(CRITIQUE)' : riskScore >= 12 ? '(ÉLEVÉ)' : riskScore >= 6 ? '(MOYEN)' : '(FAIBLE)'}
                  </Text>
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Travailleurs Exposés</Text>
                  <TextInput 
                    style={styles.formInput} 
                    value={affectedWorkers} 
                    onChangeText={setAffectedWorkers} 
                    placeholder="Nombre de travailleurs"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Activités Affectées</Text>
                  <TextInput 
                    style={[styles.formInput, { minHeight: 70, textAlignVertical: 'top' }]} 
                    value={activitiesAffected} 
                    onChangeText={setActivitiesAffected} 
                    placeholder="Description des activités affectées (ex: Forage, dynamitage, chargement)"
                    multiline
                  />
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Contrôles Existants</Text>
                  <TextInput 
                    style={[styles.formInput, { minHeight: 70, textAlignVertical: 'top' }]} 
                    value={existingControls} 
                    onChangeText={setExistingControls} 
                    placeholder="Un par ligne (ex: Ventilation&#10;Masques FFP3)"
                    multiline
                  />
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Efficacité des Contrôles Existants</Text>
                  <View style={styles.chipGrid}>
                    {['very_effective', 'effective', 'partially_effective', 'ineffective'].map(e => (
                      <TouchableOpacity 
                        key={e} 
                        style={[styles.optionChip, controlEffectiveness === e && { backgroundColor: ACCENT + '20', borderColor: ACCENT }]} 
                        onPress={() => setControlEffectiveness(e as any)}
                      >
                        <Text style={[styles.optionChipText, controlEffectiveness === e && { color: ACCENT, fontWeight: '600' }]}>
                          {e === 'very_effective' ? 'Très' : e === 'effective' ? 'Efficace' : e === 'partially_effective' ? 'Partielle' : 'Inefficace'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Prob. Résiduelle (1-5)</Text>
                    <View style={styles.chipGrid}>
                      {['1', '2', '3', '4', '5'].map(v => (
                        <TouchableOpacity 
                          key={v} 
                          style={[styles.optionChip, { flex: 1, justifyContent: 'center', backgroundColor: residualLikelihood === v ? ACCENT + '20' : undefined }]} 
                          onPress={() => setResidualLikelihood(v)}
                        >
                          <Text style={[styles.optionChipText, { textAlign: 'center', fontWeight: residualLikelihood === v ? '700' : '500' }]}>{v}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Grav. Résiduelle (1-5)</Text>
                    <View style={styles.chipGrid}>
                      {['1', '2', '3', '4', '5'].map(v => (
                        <TouchableOpacity 
                          key={v} 
                          style={[styles.optionChip, { flex: 1, justifyContent: 'center', backgroundColor: residualConsequence === v ? colors.error + '20' : undefined }]} 
                          onPress={() => setResidualConsequence(v)}
                        >
                          <Text style={[styles.optionChipText, { textAlign: 'center', fontWeight: residualConsequence === v ? '700' : '500' }]}>{v}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Contrôles Additionnels Recommandés</Text>
                  <TextInput 
                    style={[styles.formInput, { minHeight: 70, textAlignVertical: 'top' }]} 
                    value={additionalControls} 
                    onChangeText={setAdditionalControls} 
                    placeholder="Un par ligne (ex: Système brumisation&#10;Rotation des postes)"
                    multiline
                  />
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Hiérarchie de Contrôle</Text>
                  <View style={styles.chipGrid}>
                    {['elimination', 'substitution', 'engineering', 'administrative', 'ppe'].map(c => (
                      <TouchableOpacity 
                        key={c} 
                        style={[styles.optionChip, controlHierarchy === c && { backgroundColor: getControlColor(c) + '20', borderColor: getControlColor(c) }]} 
                        onPress={() => setControlHierarchy(c as any)}
                      >
                        <Text style={[styles.optionChipText, controlHierarchy === c && { color: getControlColor(c), fontWeight: '600' }]}>{getControlLabel(c)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.formSection}>
                  <Text style={[styles.formLabel, errors.responsiblePerson && { color: colors.error }]}>Personne Responsable *</Text>
                  <TouchableOpacity
                    style={[styles.formInput, { paddingRight: 12, justifyContent: 'center' }, errors.responsiblePerson && { borderColor: colors.error, borderWidth: 2 }]}
                    onPress={() => {
                      setShowWorkerDropdown(!showWorkerDropdown);
                      if (!showWorkerDropdown) setFilteredWorkers(workers);
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: responsiblePerson ? colors.text : colors.textSecondary, flex: 1 }}>
                        {responsiblePerson || 'Sélectionner le responsable'}
                      </Text>
                      <Ionicons name={showWorkerDropdown ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                    </View>
                  </TouchableOpacity>
                  {showWorkerDropdown && (
                    <View style={{ backgroundColor: colors.surface, borderRadius: borderRadius.md, marginTop: 8, borderWidth: 1, borderColor: colors.outline }}>
                      <TextInput
                        style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.outline, color: colors.text }}
                        placeholder="Rechercher par nom ou email..."
                        placeholderTextColor={colors.textSecondary}
                        value={workerSearchText}
                        onChangeText={handleWorkerSearch}
                      />
                      <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled>
                        {filteredWorkers.length > 0 ? (
                          filteredWorkers.map(worker => (
                            <TouchableOpacity
                              key={worker.id}
                              style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.outline }}
                              onPress={() => handleSelectWorker(worker)}
                            >
                              <Text style={{ color: colors.text, fontWeight: '500' }}>
                                {worker.first_name} {worker.last_name}
                              </Text>
                              {worker.email && (
                                <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                                  {worker.email}
                                </Text>
                              )}
                            </TouchableOpacity>
                          ))
                        ) : (
                          <View style={{ padding: 12, justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ color: colors.textSecondary }}>Aucun résultat trouvé</Text>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  )}
                  {errors.responsiblePerson && <Text style={styles.formError}>{errors.responsiblePerson}</Text>}
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Travailleurs Exposés</Text>
                  <TouchableOpacity
                    style={[styles.formInput, { paddingRight: 12, justifyContent: 'center' }]}
                    onPress={() => {
                      setShowExposedWorkersDropdown(!showExposedWorkersDropdown);
                      if (!showExposedWorkersDropdown) setFilteredMineWorkers(mineWorkers);
                      setMineWorkerSearchText('');
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: selectedExposedWorkers.length > 0 ? colors.text : colors.textSecondary, flex: 1 }} numberOfLines={1}>
                        {selectedExposedWorkers.length === 0
                          ? 'Sélectionner les travailleurs exposés'
                          : `${selectedExposedWorkers.length} travailleur(s) sélectionné(s)`}
                      </Text>
                      <Ionicons name={showExposedWorkersDropdown ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                    </View>
                  </TouchableOpacity>

                  {/* Selected workers chips */}
                  {selectedExposedWorkers.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {selectedExposedWorkers.map(w => (
                        <View key={w.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: ACCENT + '15', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: ACCENT + '40' }}>
                          <Text style={{ color: ACCENT, fontSize: 12, fontWeight: '600', marginRight: 6 }}>
                            {w.full_name || `${w.first_name} ${w.last_name}`}
                          </Text>
                          <TouchableOpacity onPress={() => setSelectedExposedWorkers(prev => prev.filter(x => x.id !== w.id))}>
                            <Ionicons name="close-circle" size={16} color={ACCENT} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  {showExposedWorkersDropdown && (
                    <View style={{ backgroundColor: colors.surface, borderRadius: borderRadius.md, marginTop: 8, borderWidth: 1, borderColor: colors.outline, overflow: 'hidden' }}>
                      <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.outline, backgroundColor: colors.surfaceVariant }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.md, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.outline }}>
                          <Ionicons name="search" size={16} color={colors.textSecondary} />
                          <TextInput
                            style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 8, color: colors.text, fontSize: 13 }}
                            placeholder="Rechercher par nom, ID ou poste..."
                            placeholderTextColor={colors.textSecondary}
                            value={mineWorkerSearchText}
                            onChangeText={(text) => {
                              setMineWorkerSearchText(text);
                              if (!text.trim()) { setFilteredMineWorkers(mineWorkers); return; }
                              const norm = normalizeText(text);
                              setFilteredMineWorkers(mineWorkers.filter(w =>
                                normalizeText(w.full_name || `${w.first_name} ${w.last_name}`).includes(norm) ||
                                normalizeText(w.employee_id || '').includes(norm) ||
                                normalizeText(w.job_title || '').includes(norm)
                              ));
                            }}
                          />
                        </View>
                      </View>
                      <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
                        {mineWorkers.length === 0 ? (
                          <View style={{ padding: 16, alignItems: 'center' }}>
                            <Ionicons name="people-outline" size={24} color={colors.textSecondary} />
                            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 6, textAlign: 'center' }}>Aucun travailleur trouvé.{`\n`}Ajoutez des travailleurs dans le module Travailleurs.</Text>
                          </View>
                        ) : filteredMineWorkers.length === 0 ? (
                          <View style={{ padding: 12, alignItems: 'center' }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Aucun résultat</Text>
                          </View>
                        ) : filteredMineWorkers.map(w => {
                          const isSelected = selectedExposedWorkers.some(s => s.id === w.id);
                          return (
                            <TouchableOpacity
                              key={w.id}
                              style={{ paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.outline, backgroundColor: isSelected ? ACCENT + '10' : 'transparent', flexDirection: 'row', alignItems: 'center', gap: 10 }}
                              onPress={() => {
                                setSelectedExposedWorkers(prev =>
                                  isSelected ? prev.filter(s => s.id !== w.id) : [...prev, w]
                                );
                              }}
                            >
                              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isSelected ? ACCENT + '25' : colors.surfaceVariant, justifyContent: 'center', alignItems: 'center' }}>
                                <Text style={{ color: isSelected ? ACCENT : colors.textSecondary, fontWeight: '700', fontSize: 11 }}>
                                  {w.first_name[0]}{w.last_name[0]}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>{w.full_name || `${w.first_name} ${w.last_name}`}</Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{w.employee_id} {w.job_title ? `• ${w.job_title}` : ''}</Text>
                                {w.work_site_name && <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{w.work_site_name}</Text>}
                              </View>
                              {isSelected && <Ionicons name="checkmark-circle" size={20} color={ACCENT} />}
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                      {selectedExposedWorkers.length > 0 && (
                        <TouchableOpacity style={{ padding: 10, borderTopWidth: 1, borderTopColor: colors.outline, alignItems: 'center', backgroundColor: colors.surfaceVariant }} onPress={() => setShowExposedWorkersDropdown(false)}>
                          <Text style={{ color: ACCENT, fontWeight: '600', fontSize: 13 }}>Confirmer ({selectedExposedWorkers.length} sélectionné(s))</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Date Cible d'Action</Text>
                  <DateInput
                    value={targetDate}
                    onChangeText={(date) => setTargetDate(date)}
                    placeholder="Sélectionnez la date cible"
                    format="iso"
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Date Révision</Text>
                    <DateInput
                      value={reviewDate}
                      onChangeText={(date) => setReviewDate(date)}
                      placeholder="Sélectionnez la date de révision"
                      format="iso"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formLabel}>Prochaine Révision</Text>
                    <DateInput
                      value={nextReviewDate}
                      onChangeText={(date) => setNextReviewDate(date)}
                      placeholder="Sélectionnez la prochaine révision"
                      format="iso"
                    />
                  </View>
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Statut d'Évaluation</Text>
                  <View style={styles.chipGrid}>
                    {['draft', 'approved', 'implemented', 'reviewed'].map(s => (
                      <TouchableOpacity 
                        key={s} 
                        style={[styles.optionChip, assessmentStatus === s && { backgroundColor: ACCENT + '20', borderColor: ACCENT }]} 
                        onPress={() => setAssessmentStatus(s as any)}
                      >
                        <Text style={[styles.optionChipText, assessmentStatus === s && { color: ACCENT, fontWeight: '600' }]}>
                          {s === 'draft' ? 'Brouillon' : s === 'approved' ? 'Approuvé' : s === 'implemented' ? 'Implémenté' : 'Révisé'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {hazards.length > 0 && (
                  <View style={{ backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.lg, padding: 12, marginBottom: 16 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginBottom: 8 }}>Dangers ajoutés: {hazards.length}</Text>
                    {hazards.map((h, i) => (
                      <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.outline }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text }}>{h.description.substring(0, 40)}...</Text>
                          <Text style={{ fontSize: 10, color: colors.textSecondary }}>Score: {h.riskScore} • {(h as any).exposedWorkerIds?.length || h.affectedWorkers || 0} exposé(s)</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleRemoveHazard(i)}>
                          <Ionicons name="trash-outline" size={16} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </ScrollView>

          <View style={styles.modalActions}>
            {step === 'assessment' ? (
              <>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surfaceVariant, opacity: 0.7 }]} onPress={saveDraft}>
                  <Ionicons name="document-outline" size={16} color={colors.text} />
                  <Text style={[styles.actionBtnText, { color: colors.text, fontSize: 12 }]}>Brouillon</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surfaceVariant }]} onPress={handleClose}>
                  <Text style={[styles.actionBtnText, { color: colors.text }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: (!site.trim() || !area.trim() || !assessorName.trim()) ? colors.outline : ACCENT, opacity: (!site.trim() || !area.trim() || !assessorName.trim()) ? 0.5 : 1 }]} 
                  onPress={() => { const newErrors = validateAssessment(); if (Object.keys(newErrors).length === 0) setStep('hazards'); else setErrors(newErrors); }}
                  disabled={!site.trim() || !area.trim() || !assessorName.trim()}
                >
                  <Ionicons name="arrow-forward" size={18} color={(!site.trim() || !area.trim() || !assessorName.trim()) ? colors.textSecondary : "#FFF"} />
                  <Text style={[styles.actionBtnText, { color: (!site.trim() || !area.trim() || !assessorName.trim()) ? colors.textSecondary : '#FFF' }]}>Suivant</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surfaceVariant, opacity: 0.7 }]} onPress={saveDraft}>
                  <Ionicons name="document-outline" size={16} color={colors.text} />
                  <Text style={[styles.actionBtnText, { color: colors.text, fontSize: 12 }]}>Brouillon</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.surfaceVariant }]} onPress={() => setStep('assessment')}>
                  <Ionicons name="arrow-back" size={18} color={colors.text} />
                  <Text style={[styles.actionBtnText, { color: colors.text }]}>Retour</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: (!hazDescription.trim() || !responsiblePerson.trim()) ? colors.outline : colors.secondary, opacity: (!hazDescription.trim() || !responsiblePerson.trim()) ? 0.5 : 1 }]} 
                  onPress={handleAddHazard}
                  disabled={!hazDescription.trim() || !responsiblePerson.trim()}
                >
                  <Ionicons name="add-circle-outline" size={18} color={(!hazDescription.trim() || !responsiblePerson.trim()) ? colors.textSecondary : "#FFF"} />
                  <Text style={[styles.actionBtnText, { color: (!hazDescription.trim() || !responsiblePerson.trim()) ? colors.textSecondary : '#FFF' }]}>+ Danger</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: hazards.length === 0 ? colors.outline : ACCENT, opacity: hazards.length === 0 ? 0.5 : 1 }]} 
                  onPress={handleSave} 
                  disabled={hazards.length === 0}
                >
                  <Ionicons name="save-outline" size={18} color={hazards.length === 0 ? colors.textSecondary : "#FFF"} />
                  <Text style={[styles.actionBtnText, { color: hazards.length === 0 ? colors.textSecondary : '#FFF' }]}>Créer ({hazards.length})</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────
export function RiskAssessmentScreen() {
  const { toastMsg, showToast } = useSimpleToast();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState<RiskAssessment | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingHazard, setEditingHazard] = useState<(HazardIdentification & { assessmentId?: string }) | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => { loadData(); }, []);
  
  const loadData = async () => {
    try {
      setLoading(true);
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const token = await AsyncStorage.getItem('auth_token');
      
      // Check if token exists before making API call
      if (!token) {
        console.warn('No authentication token found');
        setAssessments([]);
        setLoading(false);
        return;
      }
      
      try {
        const response = await axios.get(
          `${baseURL}/api/v1/occupational-health/hazard-identifications/`,
          {
            headers: {
              Authorization: `Token ${token}`,
              'Content-Type': 'application/json',
            },
            timeout: 8000, // 8 second timeout
          }
        );
        
        if (response.data) {
          // Handle both list response and paginated response
          const hazardsList = Array.isArray(response.data) ? response.data : response.data.results || [];
          
          // Validate that hazardsList is an array
          if (!Array.isArray(hazardsList)) {
            throw new Error('Invalid API response format');
          }
          
          // Convert HazardIdentification records to RiskAssessment format
          // Group by assessment date and assessor to create assessments
          const assessmentsMap: Record<string, any> = {};
          hazardsList.forEach((h: any, index: number) => {
            try {
              // Validate required fields
              const assessmentDate = h.assessment_date || '';
              const assessorName = h.assessed_by_name || 'Inconnu';
              const workSiteName = h.work_site_name || h.work_site?.name || 'Site sans nom';
              
              const key = `${assessmentDate}-${assessorName}`;
              if (!assessmentsMap[key]) {
                assessmentsMap[key] = {
                  id: h.id || `ra-api-${key}-${index}`,
                  sector: 'mining', // Default sector, should ideally come from API
                  site: workSiteName,
                  area: h.location || ''  ,
                  assessmentDate: assessmentDate,
                  assessorName: assessorName,
                  assessorId: h.assessed_by,
                  updatedByName: h.updated_by_name,
                  statusHistory: h.status_history || [],
                  hazards: [],
                  overallRiskLevel: h.risk_level === 'critical' ? 'very_high' : (h.risk_level || 'low'),
                  reviewDate: h.review_date || '',
                  status: h.status || 'draft',
                  createdAt: h.created_at || new Date().toISOString(),
                  updatedAt: h.updated_at,
                };
              }
              
              // Map hazard using the new function
              const mappedHazard = mapBackendToHazard(h);
              assessmentsMap[key].hazards.push(mappedHazard);
            } catch (itemError) {
              console.warn('Error processing hazard item:', itemError);
              // Continue processing other items
            }
          });
          
          const assessmentsList = Object.values(assessmentsMap);
          setAssessments(assessmentsList);
        }
      } catch (apiError: any) {
        console.warn('API request failed:', apiError?.message);
        setAssessments([]);
      }
    } catch (error) {
      console.error('Failed to load risk assessments:', error);
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  };
  
  const saveData = async (assessment: RiskAssessment) => {
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const token = await AsyncStorage.getItem('auth_token');
      
      if (!token) {
        console.warn('No token available, saving locally only');
        const updatedAssessments = [assessment, ...assessments];
        setAssessments(updatedAssessments);
        return false;
      }
      
      // Create hazard identification records for each hazard in the assessment
      if (assessment.hazards && assessment.hazards.length > 0) {
        const failedHazards: string[] = [];
        for (let i = 0; i < assessment.hazards.length; i++) {
          const hazard: any = assessment.hazards[i];
          try {
            const hazardData: any = {
              hazard_description: hazard.description || '',
              hazard_type: hazard.hazardType || 'physical',
              location: assessment.area,
              activities_affected: hazard.activitiesAffected || '',
              workers_exposed: Array.isArray(hazard.exposedWorkerIds) ? hazard.exposedWorkerIds : [],
              probability: Math.max(1, Math.min(5, Number(hazard.likelihood) || 1)),
              severity: Math.max(1, Math.min(5, Number(hazard.consequence) || 1)),
              existing_controls: (Array.isArray(hazard.existingControls) ? hazard.existingControls : []).join('\n'),
              control_effectiveness: hazard.controlEffectiveness || 'effective',
              residual_probability: Math.max(1, Math.min(5, hazard.residualLikelihood || (Number(hazard.likelihood) || 1) - 1)),
              residual_severity: Math.max(1, Math.min(5, hazard.residualConsequence || (Number(hazard.consequence) || 1) - 1)),
              assessment_date: assessment.assessmentDate,
              review_date: hazard.reviewDate || assessment.reviewDate,
              next_review_date: hazard.nextReviewDate || assessment.reviewDate,
              status: hazard.assessmentStatus || assessment.status,
            };
            
            // Add optional responsible person field if provided (enterprise is auto-assigned by backend)
            if (hazard.responsiblePersonId) {
              hazardData.responsible_person = hazard.responsiblePersonId;
            }
            
            await axios.post(
              `${baseURL}/api/v1/occupational-health/hazard-identifications/`,
              hazardData,
              {
                headers: {
                  Authorization: `Token ${token}`,
                  'Content-Type': 'application/json',
                },
                timeout: 8000,
              }
            );
          } catch (error) {
            failedHazards.push(`Danger ${i + 1}`);
            console.error(`Failed to save hazard ${i + 1}:`, error);
          }
        }
        
        if (failedHazards.length > 0) {
          showToast(`${failedHazards.length}/${assessment.hazards.length} danger(s) non sauvegardé(s)`, 'error');
          return false;
        }
      }
      
      // Reload assessments after successful creation
      loadData();
      return true;
    } catch (error) {
      console.error('Failed to save assessment:', error);
      // Fall back to local storage
      const updatedAssessments = [assessment, ...assessments];
      setAssessments(updatedAssessments);
      return false;
    }
  };

  const handleAdd = async (a: RiskAssessment) => { 
    const success = await saveData(a); 
    setShowAdd(false); 
    if (success) {
      showToast('Évaluation des risques créée et sauvegardée.', 'success');
    } else {
      showToast('Évaluation créée localement (sync pending).', 'error');
    }
  };

  const handleDelete = async (assessmentId: string) => {
    Alert.alert(
      'Supprimer l\'évaluation',
      'Êtes-vous sûr de vouloir supprimer cette évaluation et tous ses dangers?',
      [
        { text: 'Annuler', onPress: () => {} },
        {
          text: 'Supprimer',
          onPress: async () => {
            try {
              const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
              const token = await AsyncStorage.getItem('auth_token');
              
              if (!token) {
                showToast('Authentification requise', 'error');
                return;
              }

              // Get the assessment to find its hazards
              const assessment = assessments.find(a => a.id === assessmentId);
              if (!assessment) {
                showToast('Évaluation non trouvée', 'error');
                return;
              }

              // Delete each hazard by its ID directly
              const failedDeletes: string[] = [];
              for (const hazard of assessment.hazards) {
                if (hazard.id) {
                  try {
                    await axios.delete(
                      `${baseURL}/api/v1/occupational-health/hazard-identifications/${hazard.id}/`,
                      {
                        headers: {
                          Authorization: `Token ${token}`,
                          'Content-Type': 'application/json',
                        },
                        timeout: 8000,
                      }
                    );
                  } catch (deleteError: any) {
                    console.warn(`Failed to delete hazard ${hazard.id}:`, deleteError);
                    failedDeletes.push(hazard.description.substring(0, 30) + '...');
                  }
                }
              }

              // Remove from local state
              setAssessments(assessments.filter(a => a.id !== assessmentId));
              setShowDetail(false);
              setSelectedAssessment(null);

              if (failedDeletes.length > 0) {
                showToast(`Évaluation supprimée (${failedDeletes.length} danger(s) non supprimé(s))`, 'error');
              } else {
                showToast('Évaluation supprimée', 'success');
              }
            } catch (error: any) {
              console.error('Failed to delete assessment:', error);
              showToast('Erreur lors de la suppression', 'error');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleUpdate = (hazard: HazardIdentification) => {
    // Open edit modal with the hazard data
    const hazardWithAssessmentId = {
      ...hazard,
      assessmentId: selectedAssessment?.id,
    };
    setEditingHazard(hazardWithAssessmentId);
    setShowEditModal(true);
  };

  const handleSaveHazardUpdate = async (updatedHazard: HazardIdentification) => {
    try {
      if (!updatedHazard.id) {
        showToast('ID du danger non trouvé', 'error');
        return;
      }

      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const token = await AsyncStorage.getItem('auth_token');
      
      if (!token) {
        showToast('Authentification requise', 'error');
        return;
      }

      // Prepare update payload - only include provided fields
      const updatePayload: any = {};
      
      if (updatedHazard.description !== editingHazard?.description) updatePayload.hazard_description = updatedHazard.description;
      if (updatedHazard.hazardType !== editingHazard?.hazardType) updatePayload.hazard_type = updatedHazard.hazardType;
      if (updatedHazard.activitiesAffected !== editingHazard?.activitiesAffected) updatePayload.activities_affected = updatedHazard.activitiesAffected;
      if (updatedHazard.exposedWorkerIds !== editingHazard?.exposedWorkerIds) updatePayload.workers_exposed = updatedHazard.exposedWorkerIds;
      if (updatedHazard.likelihood !== editingHazard?.likelihood) updatePayload.probability = updatedHazard.likelihood;
      if (updatedHazard.consequence !== editingHazard?.consequence) updatePayload.severity = updatedHazard.consequence;
      if (updatedHazard.residualLikelihood !== editingHazard?.residualLikelihood) updatePayload.residual_probability = updatedHazard.residualLikelihood;
      if (updatedHazard.residualConsequence !== editingHazard?.residualConsequence) updatePayload.residual_severity = updatedHazard.residualConsequence;
      if (updatedHazard.existingControls !== editingHazard?.existingControls) updatePayload.existing_controls = updatedHazard.existingControls;
      if (updatedHazard.controlEffectiveness !== editingHazard?.controlEffectiveness) updatePayload.control_effectiveness = updatedHazard.controlEffectiveness;
      if (updatedHazard.additionalControls !== editingHazard?.additionalControls) updatePayload.additional_control_measures = updatedHazard.additionalControls;
      if (updatedHazard.responsiblePersonId !== editingHazard?.responsiblePersonId) updatePayload.responsible_person = updatedHazard.responsiblePersonId;
      if (updatedHazard.targetDate !== editingHazard?.targetDate) updatePayload.target_date = updatedHazard.targetDate;
      if (updatedHazard.assessmentStatus !== editingHazard?.assessmentStatus) updatePayload.status = updatedHazard.assessmentStatus;

      await axios.patch(
        `${baseURL}/api/v1/occupational-health/hazard-identifications/${updatedHazard.id}/`,
        updatePayload,
        {
          headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 8000,
        }
      );

      // Find and update the assessment in local state
      const assessmentIndex = assessments.findIndex(a => a.id === editingHazard?.assessmentId);

      if (assessmentIndex !== -1) {
        const updatedAssessments = [...assessments];
        const hazardIndex = updatedAssessments[assessmentIndex].hazards.findIndex(h => h.id === updatedHazard.id);
        
        if (hazardIndex !== -1) {
          updatedAssessments[assessmentIndex].hazards[hazardIndex] = updatedHazard;
          
          setAssessments(updatedAssessments);
          setSelectedAssessment(updatedAssessments[assessmentIndex]);
        }
      }

      setShowEditModal(false);
      setEditingHazard(null);
      showToast('Danger mis à jour avec succès', 'success');
    } catch (error: any) {
      console.error('Failed to update hazard:', error);
      const message = error.response?.data?.detail || 'Erreur lors de la mise à jour du danger';
      showToast(message, 'error');
    }
  };

  // Normalize search for better accent handling
  const normalizedQuery = normalizeText(searchQuery);
  const filtered = useMemo(() => {
    if (!normalizedQuery) return assessments;
    return assessments.filter(a => 
      normalizeText(a.site).includes(normalizedQuery) ||
      normalizeText(a.area).includes(normalizedQuery) ||
      normalizeText(SECTOR_PROFILES[a.sector].label).includes(normalizedQuery) ||
      normalizeText(a.assessorName).includes(normalizedQuery)
    );
  }, [assessments, normalizedQuery]);

  const stats = useMemo(() => {
    const allHazards = filtered.flatMap(a => a.hazards);
    return {
      total: filtered.length,
      totalHazards: allHazards.length,
      highRisks: allHazards.filter(h => h.riskScore >= 12).length,
      criticalRisks: allHazards.filter(h => h.riskScore >= 20).length,
      workersExposed: allHazards.reduce((s, h) => s + (Number(h.affectedWorkers) || 0), 0),
    };
  }, [filtered]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Chargement des évaluations...</Text>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <View>
              <Text style={styles.screenTitle}>Évaluation des Risques</Text>
              <Text style={styles.screenSubtitle}>ISO 45001 §6.1 — Matrice de risques par secteur et poste</Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowAdd(true)}>
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.addButtonText}>Nouvelle Évaluation</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            {[
              { label: 'Évaluations', value: stats.total, icon: 'clipboard', color: ACCENT },
              { label: 'Dangers', value: stats.totalHazards, icon: 'warning', color: colors.warning },
              { label: 'Risques Élevés', value: stats.highRisks, icon: 'alert-circle', color: colors.error },
              { label: 'Critiques', value: stats.criticalRisks, icon: 'skull', color: colors.errorDark },
              { label: 'Travailleurs', value: stats.workersExposed, icon: 'people', color: colors.secondary },
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

          {/* Global Risk Matrix */}
          <RiskMatrix hazards={filtered.flatMap(a => a.hazards)} />

          <View style={styles.filterBar}>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
              <TextInput style={styles.searchInput} placeholder="Rechercher par site, zone, secteur..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor={colors.placeholder} />
            </View>
          </View>

          <Text style={styles.resultsCount}>{filtered.length} évaluation(s) {searchQuery && `(filtré)`}</Text>
          <View style={styles.listContainer}>
            {filtered.map(a => <AssessmentCard key={a.id} assessment={a} onPress={() => { setSelectedAssessment(a); setShowDetail(true); }} />)}
            {filtered.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
                <Text style={styles.emptyText}>Aucune évaluation trouvée</Text>
              </View>
            )}
          </View>

          <AssessmentDetailModal visible={showDetail} assessment={selectedAssessment} onClose={() => { setShowDetail(false); setSelectedAssessment(null); }} onDelete={handleDelete} onUpdate={handleUpdate} />
          <AddAssessmentModal visible={showAdd} onClose={() => setShowAdd(false)} onSave={handleAdd} />
          {editingHazard && <EditHazardModal visible={showEditModal} hazard={editingHazard} onClose={() => { setShowEditModal(false); setEditingHazard(null); }} onSave={handleSaveHazardUpdate} />}
        </>
      )}
      <SimpleToastNotification message={toastMsg} />
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  contentContainer: { padding: 16, paddingBottom: 40 },
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 24 },
  screenTitle: { fontSize: 24, fontWeight: '700', color: colors.text },
  screenSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ACCENT, paddingHorizontal: 16, paddingVertical: 10, borderRadius: borderRadius.lg },
  addButtonText: { color: '#FFF', fontWeight: '600', fontSize: 14 },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, minWidth: 90, borderRadius: borderRadius.xl, padding: 16, alignItems: 'center', ...shadows.md },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 6, backgroundColor: 'rgba(255, 255, 255, 0.18)' },
  statValue: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  statLabel: { fontSize: 10, color: 'rgba(255, 255, 255, 0.75)', marginTop: 2, textAlign: 'center' },

  filterBar: { gap: 10, marginBottom: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.lg, paddingHorizontal: 14, paddingVertical: 10, gap: 8, borderWidth: 1, borderColor: colors.outline, ...shadows.xs },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },

  resultsCount: { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
  listContainer: { gap: 12 },

  assessmentCard: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 16, ...shadows.sm },
  assessmentCardHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  assessmentIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  assessmentSite: { fontSize: 15, fontWeight: '600', color: colors.text },
  assessmentArea: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  riskLevelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  riskLevelText: { fontSize: 10, fontWeight: '600' },

  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '600' },

  assessmentCardBody: { gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.outline },
  assessmentInfoRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  assessmentInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  assessmentInfoText: { fontSize: 12, color: colors.textSecondary },

  emptyState: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },

  // Risk Matrix
  matrixContainer: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 20, marginBottom: 24, ...shadows.sm },
  matrixTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 16, textAlign: 'center' },
  matrixGrid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  matrixYLabel: { marginRight: 4 },
  matrixAxisLabel: { fontSize: 10, color: colors.textSecondary, writingDirection: 'ltr' },
  matrixRow: { flexDirection: 'row', alignItems: 'center' },
  matrixRowLabel: { width: 20, textAlign: 'center', fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  matrixCell: { width: 40, height: 30, borderWidth: 1, borderColor: colors.outline, alignItems: 'center', justifyContent: 'center' },
  matrixCellText: { fontSize: 13, fontWeight: '700', color: colors.text },
  matrixBottomRow: { flexDirection: 'row', alignItems: 'center' },
  matrixColLabel: { width: 40, textAlign: 'center', fontSize: 11, color: colors.textSecondary, fontWeight: '600', marginTop: 2 },
  matrixXLabel: { textAlign: 'center', fontSize: 10, color: colors.textSecondary, marginTop: 4, marginLeft: 20 },
  matrixLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 10, color: colors.textSecondary },
  
  warningBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.warningLight, borderRadius: borderRadius.md, padding: 10, marginTop: 12, borderLeftWidth: 3, borderLeftColor: colors.warning },
  warningText: { flex: 1, fontSize: 11, color: colors.text, fontWeight: '500' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, width: '100%', maxHeight: '90%', ...shadows.xl },
  stepIndicatorCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingHorizontal: 20, paddingTop: 12 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20, paddingHorizontal: 20, paddingBottom: 20 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: borderRadius.lg },
  actionBtnText: { fontWeight: '600', fontSize: 14 },

  detailSection: { marginBottom: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.outline },
  detailSectionTitle: { fontSize: 13, fontWeight: '700', color: ACCENT, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  detailLabel: { fontSize: 13, color: colors.textSecondary },
  detailValue: { fontSize: 13, fontWeight: '500', color: colors.text, maxWidth: '60%', textAlign: 'right' },

  hazardCard: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.lg, padding: 14, marginBottom: 10 },
  hazardType: { fontSize: 14, fontWeight: '600', color: colors.text },
  hazardDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  hazardMeta: { fontSize: 11, color: colors.textSecondary },
  scoreBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  scoreText: { fontSize: 10, fontWeight: '700' },
  controlTitle: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 },
  controlItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  controlText: { fontSize: 12, color: colors.text },
  controlHierarchyBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  controlHierarchyText: { fontSize: 10, fontWeight: '600' },

  formSection: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  formInput: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.text, borderWidth: 1, borderColor: colors.outline },
  formError: { fontSize: 12, color: colors.error, marginTop: 4, marginLeft: 4 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.surfaceVariant },
  optionChipText: { fontSize: 11, color: colors.textSecondary },

  // Audit Trail
  historyEntry: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.outline },
  historyDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: ACCENT, marginTop: 3 },
  historyLine: { width: 2, height: 40, backgroundColor: colors.outline, alignSelf: 'center' },
  historyStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  historyStatusText: { fontSize: 10, fontWeight: '600' },
  historyMeta: { fontSize: 11, fontWeight: '500', color: colors.textSecondary },
  historyNote: { fontSize: 11, color: colors.text, marginVertical: 2 },
  historyTime: { fontSize: 10, color: colors.textTertiary, marginTop: 2 },
});
