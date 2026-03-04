import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  Dimensions, Modal, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const ACCENT = colors.primary;

interface WorkerRiskProfile {
  id: number;
  worker: number;
  worker_name: string;
  worker_employee_id: string;
  enterprise_name: string;
  health_risk_score: number;
  exposure_risk_score: number;
  compliance_risk_score: number;
  overall_risk_score: number;
  risk_level: 'low' | 'moderate' | 'high' | 'critical';
  risk_level_display: string;
  calculated_by_system: boolean;
  last_calculated: string;
  intervention_recommended: boolean;
  intervention_type: string;
  priority_actions: string;
  exams_overdue: boolean;
  days_overdue: number;
  abnormal_findings_count: number;
  incidents_last_12months: number;
  near_misses_last_12months: number;
  manual_notes: string;
}

const SAMPLE_PROFILES: WorkerRiskProfile[] = [
  {
    id: 1, worker: 1, worker_name: 'Jean-Pierre Kabongo', worker_employee_id: 'EMP-001',
    enterprise_name: '—',
    health_risk_score: 30, exposure_risk_score: 45, compliance_risk_score: 20, overall_risk_score: 32,
    risk_level: 'low', risk_level_display: 'Faible', calculated_by_system: true,
    last_calculated: '2025-02-20T10:00:00Z',
    intervention_recommended: false, intervention_type: '', priority_actions: 'Suivi annuel',
    exams_overdue: false, days_overdue: 0, abnormal_findings_count: 0,
    incidents_last_12months: 0, near_misses_last_12months: 0, manual_notes: '',
  },
  {
    id: 2, worker: 2, worker_name: 'Patrick Lukusa', worker_employee_id: 'EMP-002',
    enterprise_name: '—',
    health_risk_score: 60, exposure_risk_score: 75, compliance_risk_score: 50, overall_risk_score: 62,
    risk_level: 'high', risk_level_display: 'Élevé', calculated_by_system: true,
    last_calculated: '2025-02-20T10:00:00Z',
    intervention_recommended: true, intervention_type: 'Suivi médical renforcé',
    priority_actions: 'Suivi trimestriel requis — examen audiométrique',
    exams_overdue: true, days_overdue: 45, abnormal_findings_count: 2,
    incidents_last_12months: 1, near_misses_last_12months: 2, manual_notes: '',
  },
];

export function WorkerRiskProfileScreen() {
  const [profiles, setProfiles]           = useState<WorkerRiskProfile[]>([]);
  const [loading, setLoading]             = useState(true);
  const [searchQuery, setSearchQuery]     = useState('');
  const [filterRisk, setFilterRisk]       = useState<'all' | 'low' | 'moderate' | 'high' | 'critical'>('all');
  const [selectedProfile, setSelectedProfile] = useState<WorkerRiskProfile | null>(null);
  const [showDetail, setShowDetail]       = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showInfo, setShowInfo]           = useState(false);

  useEffect(() => { loadProfiles(); }, []);

  const loadDetailedProfile = async (profileId: number) => {
    setDetailLoading(true);
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(
        `${baseURL}/api/v1/occupational-health/worker-risk-profiles/${profileId}/`,
        { headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' } }
      );
      setSelectedProfile(response.data);
    } catch {
      // If fetch fails, use the list data we already have
      console.error('Error loading detailed profile');
    } finally {
      setDetailLoading(false);
    }
  };

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${baseURL}/api/v1/occupational-health/worker-risk-profiles/`,
        { headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' } });
      if (response.data) setProfiles(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch {
      setProfiles(SAMPLE_PROFILES);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => profiles.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchQ = !q
      || (p.worker_name ?? '').toLowerCase().includes(q)
      || (p.worker_employee_id ?? '').toLowerCase().includes(q);
    const matchF = filterRisk === 'all' || p.risk_level === filterRisk;
    return matchQ && matchF;
  }), [profiles, searchQuery, filterRisk]);

  const getRiskColor = (level: string) =>
    level === 'low' ? '#22C55E' : level === 'moderate' ? '#F59E0B' : level === 'high' ? '#EF4444' : '#DC2626';

  const riskLabel = (level: string) =>
    level === 'low' ? 'Faible' : level === 'moderate' ? 'Modéré' : level === 'high' ? 'Élevé' : 'Critique';

  const riskLabelUpper = (level: string) =>
    level === 'low' ? 'FAIBLE' : level === 'moderate' ? 'MODÉRÉ' : level === 'high' ? 'ÉLEVÉ' : 'CRITIQUE';

  const fmtDate = (iso: string | null) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
    catch { return iso; }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Profils de Risque</Text>
          <Text style={styles.screenSubtitle}>Score de risque par travailleur – Surveillance ciblée</Text>
        </View>
      </View>

      {/* How It Works Info Panel */}
      <TouchableOpacity 
        style={styles.infoPanel}
        onPress={() => setShowInfo(!showInfo)}
        activeOpacity={0.7}
      >
        <View style={styles.infoPanelHeader}>
          <Ionicons name="information-circle-outline" size={20} color={ACCENT} />
          <Text style={styles.infoPanelTitle}>Comment ça marche?</Text>
          <Ionicons 
            name={showInfo ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={colors.textSecondary} 
            style={{ marginLeft: 'auto' }}
          />
        </View>

        {showInfo && (
          <View style={styles.infoPanelContent}>
            <View style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>📊 Les 3 scores de risque</Text>
              <View style={styles.infoItem}>
                <Text style={styles.infoItemLabel}>🏥 Score Santé (0-100)</Text>
                <Text style={styles.infoItemDesc}>Basé sur l'âge, status d'aptitude, conditions chroniques et allergies du travailleur</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoItemLabel}>⚠️ Score Exposition (0-100)</Text>
                <Text style={styles.infoItemDesc}>Basé sur les substances dangereuses exposées, années d'emploi et compiance aux EPI</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoItemLabel}>✓ Score Conformité (0-100)</Text>
                <Text style={styles.infoItemDesc}>Basé sur les incidents, maladies professionnelles actuelles et examens médicaux en retard</Text>
              </View>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>🎨 Niveaux de risque</Text>
              <View style={styles.infoRiskLevel}>
                <View style={[styles.riskColorBox, { backgroundColor: '#22C55E' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.riskLevelName}>Faible (0-24)</Text>
                  <Text style={styles.riskLevelDesc}>Risque minimal — suivi annuel standard</Text>
                </View>
              </View>
              <View style={styles.infoRiskLevel}>
                <View style={[styles.riskColorBox, { backgroundColor: '#F59E0B' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.riskLevelName}>Modéré (25-49)</Text>
                  <Text style={styles.riskLevelDesc}>Nécessite attention particulière et suivi régulier</Text>
                </View>
              </View>
              <View style={styles.infoRiskLevel}>
                <View style={[styles.riskColorBox, { backgroundColor: '#EF4444' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.riskLevelName}>Élevé (50-74)</Text>
                  <Text style={styles.riskLevelDesc}>Intervention requise et suivi intensifié</Text>
                </View>
              </View>
              <View style={styles.infoRiskLevel}>
                <View style={[styles.riskColorBox, { backgroundColor: '#DC2626' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.riskLevelName}>Critique (75-100)</Text>
                  <Text style={styles.riskLevelDesc}>Action immédiate et suivi strict obligatoire</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>⏰ Indicateurs clés</Text>
              <Text style={styles.infoIndicator}>🔴 <Text style={{ fontWeight: '600' }}>Exams en retard:</Text> Examens médicaux passés leur date limite</Text>
              <Text style={styles.infoIndicator}>⚡ <Text style={{ fontWeight: '600' }}>Incidents:</Text> Accidents ou incidents de travail dans les 12 derniers mois</Text>
              <Text style={styles.infoIndicator}>📋 <Text style={{ fontWeight: '600' }}>Presqu'accidents:</Text> Situations dangereuses qui auraient pu causer des blessures</Text>
              <Text style={styles.infoIndicator}>🔄 <Text style={{ fontWeight: '600' }}>Recalculé auto:</Text> Les scores se mettent à jour automatiquement quand vous enregistrez un nouvel incident ou examen</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* Filters */}
      <View style={styles.filterBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Chercher un travailleur..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textSecondary}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.filterButtons}>
          {(['all', 'low', 'moderate', 'high', 'critical'] as const).map(risk => (
            <TouchableOpacity
              key={risk}
              style={[
                styles.filterBtn,
                filterRisk === risk && {
                  backgroundColor: risk === 'all' ? ACCENT : getRiskColor(risk),
                  borderColor: 'transparent',
                },
              ]}
              onPress={() => setFilterRisk(risk)}
            >
              <Text style={[styles.filterBtnText, filterRisk === risk && styles.filterBtnTextActive]}>
                {risk === 'all' ? 'Tous' : riskLabel(risk)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Chargement des profils…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>Aucun profil trouvé</Text>
        </View>
      ) : (
        filtered.map(item => {
          const riskColor = getRiskColor(item.risk_level);
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.card, { borderLeftColor: riskColor }]}
              onPress={() => { 
                setSelectedProfile(item);
                loadDetailedProfile(item.id);
                setShowDetail(true);
              }}
              activeOpacity={0.85}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <View style={[styles.workerAvatar, { backgroundColor: riskColor + '20' }]}>
                    <Text style={[styles.workerAvatarText, { color: riskColor }]}>
                      {(item.worker_name ?? '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.worker_name}</Text>
                    <Text style={styles.cardSub}>
                      {item.worker_employee_id ? `#${item.worker_employee_id}` : ''}
                      {item.worker_employee_id && item.last_calculated ? '  ·  ' : ''}
                      {item.last_calculated ? `MAJ : ${fmtDate(item.last_calculated)}` : ''}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={[styles.riskBadge, { backgroundColor: riskColor }]}>
                    <Text style={styles.riskBadgeText}>{riskLabelUpper(item.risk_level)}</Text>
                  </View>
                  {item.overall_risk_score > 0 && (
                    <Text style={[styles.overallScore, { color: riskColor }]}>Score : {item.overall_risk_score}/100</Text>
                  )}
                </View>
              </View>

              {/* Alert flags */}
              {(item.exams_overdue || item.intervention_recommended) && (
                <View style={styles.flagsRow}>
                  {item.exams_overdue && (
                    <View style={styles.flag}>
                      <Ionicons name="time-outline" size={12} color="#DC2626" />
                      <Text style={[styles.flagText, { color: '#DC2626' }]}>
                        Examens en retard{item.days_overdue > 0 ? ` (${item.days_overdue}j)` : ''}
                      </Text>
                    </View>
                  )}
                  {item.intervention_recommended && (
                    <View style={[styles.flag, { backgroundColor: '#FEF3C7' }]}>
                      <Ionicons name="alert-circle-outline" size={12} color="#D97706" />
                      <Text style={[styles.flagText, { color: '#D97706' }]}>Intervention recommandée</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.scoresGrid}>
                {[
                  { label: 'Santé',       score: item.health_risk_score },
                  { label: 'Exposition',  score: item.exposure_risk_score },
                  { label: 'Conformité',  score: item.compliance_risk_score },
                ].map(({ label, score }) => {
                  const scoreColor = score >= 70 ? '#EF4444' : score >= 40 ? '#F59E0B' : '#22C55E';
                  return (
                    <View key={label} style={styles.scoreCard}>
                      <Text style={styles.scoreLabel}>{label}</Text>
                      <View style={[styles.scoreRing, { borderColor: scoreColor }]}>
                        <Text style={[styles.scoreNumber, { color: scoreColor }]}>{score}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {item.priority_actions ? (
                <Text style={styles.recomm} numberOfLines={2}>{item.priority_actions}</Text>
              ) : null}
            </TouchableOpacity>
          );
        })
      )}

      {/* Detail Modal */}
      <Modal
        visible={showDetail}
        animationType={isDesktop ? 'fade' : 'slide'}
        transparent
        onRequestClose={() => setShowDetail(false)}
      >
        <View style={[styles.modalOverlay, isDesktop && styles.modalOverlayDesktop]}>
          <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>

            {selectedProfile && (
              <>
                {/* Modal Header */}
                <View style={[styles.modalHeader, { borderTopColor: getRiskColor(selectedProfile.risk_level), borderTopWidth: 4 }]}>
                  <View style={[styles.workerAvatarLarge, { backgroundColor: getRiskColor(selectedProfile.risk_level) + '20' }]}>
                    <Text style={[styles.workerAvatarTextLarge, { color: getRiskColor(selectedProfile.risk_level) }]}>
                      {(selectedProfile.worker_name ?? '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={styles.modalTitle}>{selectedProfile.worker_name}</Text>
                    <Text style={styles.modalSub}>
                      {selectedProfile.worker_employee_id ? `#${selectedProfile.worker_employee_id}` : ''}
                      {selectedProfile.enterprise_name ? `  ·  ${selectedProfile.enterprise_name}` : ''}
                    </Text>
                    <View style={[styles.riskBadge, { backgroundColor: getRiskColor(selectedProfile.risk_level), alignSelf: 'flex-start', marginTop: 4 }]}>
                      <Text style={styles.riskBadgeText}>{riskLabelUpper(selectedProfile.risk_level)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setShowDetail(false)}>
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {detailLoading ? (
                  <View style={styles.center}>
                    <ActivityIndicator size="large" color={ACCENT} />
                    <Text style={styles.loadingText}>Chargement des détails…</Text>
                  </View>
                ) : (
                  <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>

                  {/* Score cards */}
                  <View style={styles.detailScoresRow}>
                    {[
                      { label: 'Santé',       score: selectedProfile.health_risk_score },
                      { label: 'Exposition',  score: selectedProfile.exposure_risk_score },
                      { label: 'Conformité',  score: selectedProfile.compliance_risk_score },
                    ].map(({ label, score }) => {
                      const scoreColor = score >= 70 ? '#EF4444' : score >= 40 ? '#F59E0B' : '#22C55E';
                      return (
                        <View key={label} style={[styles.detailScoreCard, { borderWidth: 1, borderColor: scoreColor + '40' }]}>
                          <Text style={styles.detailScoreLabel}>{label}</Text>
                          <Text style={[styles.detailScoreValue, { color: scoreColor }]}>{score}</Text>
                          <Text style={styles.detailScoreMax}>/100</Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Overall score */}
                  <View style={[styles.overallScoreCard, { borderColor: getRiskColor(selectedProfile.risk_level) }]}>
                    <Ionicons name="analytics-outline" size={18} color={getRiskColor(selectedProfile.risk_level)} />
                    <Text style={styles.overallScoreLabel}>Score global pondéré</Text>
                    <Text style={[styles.overallScoreValue, { color: getRiskColor(selectedProfile.risk_level) }]}>
                      {selectedProfile.overall_risk_score}/100
                    </Text>
                  </View>

                  {/* Alert flags */}
                  {(selectedProfile.exams_overdue || selectedProfile.intervention_recommended) && (
                    <View style={styles.detailFlagsSection}>
                      {selectedProfile.exams_overdue && (
                        <View style={[styles.alertBanner, { backgroundColor: '#FEE2E2', borderLeftColor: '#DC2626' }]}>
                          <Ionicons name="time-outline" size={16} color="#DC2626" />
                          <Text style={[styles.alertBannerText, { color: '#7F1D1D' }]}>
                            Examens médicaux en retard de {selectedProfile.days_overdue} jour{selectedProfile.days_overdue !== 1 ? 's' : ''}
                          </Text>
                        </View>
                      )}
                      {selectedProfile.intervention_recommended && (
                        <View style={[styles.alertBanner, { backgroundColor: '#FEF3C7', borderLeftColor: '#D97706' }]}>
                          <Ionicons name="alert-circle-outline" size={16} color="#D97706" />
                          <Text style={[styles.alertBannerText, { color: '#92400E' }]}>
                            Intervention recommandée{selectedProfile.intervention_type ? ` : ${selectedProfile.intervention_type}` : ''}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Info */}
                  <Text style={styles.detailSection}>Indicateurs</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Résultats anormaux</Text>
                    <Text style={[styles.detailValue, selectedProfile.abnormal_findings_count > 0 && { color: '#EF4444', fontWeight: '700' }]}>
                      {selectedProfile.abnormal_findings_count}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Incidents (12 mois)</Text>
                    <Text style={[styles.detailValue, selectedProfile.incidents_last_12months > 0 && { color: '#F59E0B', fontWeight: '700' }]}>
                      {selectedProfile.incidents_last_12months}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Presqu'accidents (12 mois)</Text>
                    <Text style={styles.detailValue}>{selectedProfile.near_misses_last_12months}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Calculé automatiquement</Text>
                    <Text style={styles.detailValue}>{selectedProfile.calculated_by_system ? 'Oui' : 'Non'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Dernière mise à jour</Text>
                    <Text style={styles.detailValue}>{fmtDate(selectedProfile.last_calculated)}</Text>
                  </View>

                  {selectedProfile.priority_actions ? (
                    <>
                      <Text style={styles.detailSection}>Actions prioritaires</Text>
                      <View style={styles.recommendationBox}>
                        <Ionicons name="shield-checkmark-outline" size={16} color={ACCENT} style={{ marginBottom: spacing.xs }} />
                        <Text style={styles.recommendationText}>{selectedProfile.priority_actions}</Text>
                      </View>
                    </>
                  ) : null}

                  {selectedProfile.manual_notes ? (
                    <>
                      <Text style={styles.detailSection}>Notes</Text>
                      <View style={styles.recommendationBox}>
                        <Text style={styles.recommendationText}>{selectedProfile.manual_notes}</Text>
                      </View>
                    </>
                  ) : null}

                  <View style={{ height: spacing.xl }} />
                </ScrollView>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: colors.background },
  contentContainer:     { padding: spacing.md, paddingBottom: spacing.xl },
  header:               { marginBottom: spacing.lg },
  screenTitle:          { fontSize: 24, fontWeight: '700', color: colors.text },
  screenSubtitle:       { fontSize: 14, color: colors.textSecondary, marginTop: 2 },

  // Filters
  filterBar:            { marginBottom: spacing.lg },
  searchBox:            { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.md, ...shadows.sm },
  searchInput:          { flex: 1, paddingVertical: spacing.md, marginLeft: spacing.sm, color: colors.text, fontSize: 14 },
  filterButtons:        { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  filterBtn:            { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline },
  filterBtnText:        { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  filterBtnTextActive:  { color: '#FFF', fontWeight: '600' },

  // Loading / empty
  center:               { alignItems: 'center', paddingVertical: spacing.xl },
  loadingText:          { marginTop: spacing.md, color: colors.textSecondary, fontSize: 13 },
  emptyText:            { marginTop: spacing.md, color: colors.textSecondary, fontSize: 14 },

  // Cards
  card:                 { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, borderLeftWidth: 4, ...shadows.sm },
  cardHeader:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  cardTitleRow:         { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  workerAvatar:         { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  workerAvatarText:     { fontSize: 18, fontWeight: '700' },
  cardTitle:            { fontSize: 15, fontWeight: '700', color: colors.text },
  cardSub:              { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  riskBadge:            { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.sm },
  riskBadgeText:        { fontSize: 10, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
  scoresGrid:           { flexDirection: 'row', justifyContent: 'space-around', marginBottom: spacing.md },
  scoreCard:            { alignItems: 'center' },
  scoreLabel:           { fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  scoreRing:            { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  scoreNumber:          { fontSize: 18, fontWeight: '800' },
  recomm:               { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic', lineHeight: 17 },

  // Modal
  modalOverlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalOverlayDesktop:  { justifyContent: 'center', alignItems: 'center' },
  modalContent:         { backgroundColor: colors.background, borderTopLeftRadius: borderRadius.lg, borderTopRightRadius: borderRadius.lg, maxHeight: '92%' },
  modalContentDesktop:  { width: '50%', maxWidth: 600, borderRadius: borderRadius.lg },
  modalHeader:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outline },
  workerAvatarLarge:    { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  workerAvatarTextLarge:{ fontSize: 22, fontWeight: '800' },
  modalTitle:           { fontSize: 17, fontWeight: '700', color: colors.text },
  closeBtn:             { padding: spacing.xs, borderRadius: borderRadius.sm, backgroundColor: colors.surfaceVariant },

  // Detail scroll
  detailScroll:         { paddingHorizontal: spacing.md },
  detailScoresRow:      { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.lg },
  detailScoreCard:      { flex: 1, alignItems: 'center', backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md, paddingVertical: spacing.md },
  detailScoreLabel:     { fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs },
  detailScoreValue:     { fontSize: 28, fontWeight: '800' },
  detailScoreMax:       { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  detailSection:        { fontSize: 11, fontWeight: '700', color: ACCENT, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.outline, paddingBottom: 4 },
  detailRow:            { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.outline, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel:          { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  detailValue:          { fontSize: 14, fontWeight: '500', color: colors.text, textAlign: 'right', flex: 1, marginLeft: spacing.md },
  recommendationBox:    { backgroundColor: colors.surface, borderRadius: borderRadius.md, padding: spacing.md, marginTop: spacing.sm },
  recommendationText:   { fontSize: 13, color: colors.text, lineHeight: 20 },
});
