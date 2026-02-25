import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  Dimensions, FlatList, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { occHealthApi } from '../../../services/OccHealthApiService';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';

const { width } = Dimensions.get('window');

// ─── Exposure Monitoring Dashboard ──────────────────────────────
export function ExposureMonitoringDashboard() {
  const [selectedExposure, setSelectedExposure] = useState<string | null>(null);

  const exposureTypes = [
    {
      id: 'silica',
      name: 'Silica (Respirable)',
      limit: 0.025,
      unit: 'mg/m³',
      current: 0.008,
      status: 'safe',
      trend: [0.020, 0.018, 0.015, 0.012, 0.010, 0.008],
    },
    {
      id: 'cobalt',
      name: 'Cobalt & Compounds',
      limit: 0.05,
      unit: 'mg/m³',
      current: 0.012,
      status: 'safe',
      trend: [0.015, 0.020, 0.018, 0.015, 0.012, 0.012],
    },
    {
      id: 'dust',
      name: 'Total Dust',
      limit: 10.0,
      unit: 'mg/m³',
      current: 3.5,
      status: 'safe',
      trend: [5.0, 4.5, 4.0, 3.8, 3.6, 3.5],
    },
    {
      id: 'noise',
      name: 'Noise Level',
      limit: 85,
      unit: 'dB(A)',
      current: 82,
      status: 'safe',
      trend: [88, 86, 85, 84, 83, 82],
    },
    {
      id: 'vibration',
      name: 'Hand-Arm Vibration',
      limit: 2.8,
      unit: 'm/s²',
      current: 1.2,
      status: 'safe',
      trend: [2.0, 1.8, 1.6, 1.4, 1.3, 1.2],
    },
    {
      id: 'heat',
      name: 'Heat (WBGT)',
      limit: 32.0,
      unit: '°C',
      current: 28.5,
      status: 'safe',
      trend: [31.0, 30.0, 29.5, 29.0, 28.8, 28.5],
    },
  ];

  const getStatusColor = (status: string) => {
    if (status === 'safe') return '#22C55E';
    if (status === 'warning') return '#F59E0B';
    return '#EF4444';
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Exposure Monitoring</Text>
          <Text style={styles.subtitle}>Real-time occupational exposure tracking</Text>
        </View>

        {/* Overall Status */}
        <View style={[styles.section, styles.cardShadow, { marginHorizontal: spacing.md, marginBottom: spacing.lg }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={styles.sectionTitle}>Overall Status</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>All exposures monitored</Text>
            </View>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#22C55E' + '20', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: '#22C55E' }}>✓</Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#22C55E' }}>Safe</Text>
            </View>
          </View>
        </View>

        {/* Exposure Types */}
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: 40 }}>
          {exposureTypes.map(exp => (
            <TouchableOpacity
              key={exp.id}
              style={[styles.exposureCard, styles.cardShadow]}
              onPress={() => setSelectedExposure(exp.id)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exposureName}>{exp.name}</Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                    Limit: {exp.limit} {exp.unit}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(exp.status) + '20' }]}>
                  <Text style={[styles.statusValue, { color: getStatusColor(exp.status) }]}>
                    {exp.current} {exp.unit}
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBar}>
                <View
                  style={{
                    height: '100%',
                    width: `${(exp.current / exp.limit) * 100}%`,
                    backgroundColor: getStatusColor(exp.status),
                    borderRadius: borderRadius.full,
                  }}
                />
              </View>

              <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 8, textAlign: 'right' }}>
                {Math.round((exp.current / exp.limit) * 100)}% of limit
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {selectedExposure && (
        <ExposureDetailModal
          exposureId={selectedExposure}
          exposures={exposureTypes}
          onClose={() => setSelectedExposure(null)}
        />
      )}
    </View>
  );
}

// ─── Exposure Detail Modal ──────────────────────────────────────
function ExposureDetailModal({
  exposureId,
  exposures,
  onClose,
}: {
  exposureId: string;
  exposures: any[];
  onClose: () => void;
}) {
  const exp = exposures.find(e => e.id === exposureId);
  if (!exp) return null;

  return (
    <Modal visible={true} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{exp.name}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: spacing.lg }}>
            {/* Current Status */}
            <View style={[styles.section, styles.cardShadow]}>
              <Text style={styles.sectionTitle}>Current Status</Text>
              <View style={{ flexDirection: 'row', gap: spacing.lg }}>
                <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg, borderRadius: borderRadius.lg }}>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>Current Level</Text>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary }}>
                    {exp.current} {exp.unit}
                  </Text>
                </View>
                <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg, borderRadius: borderRadius.lg }}>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>Limit</Text>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
                    {exp.limit} {exp.unit}
                  </Text>
                </View>
                <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg, borderRadius: borderRadius.lg }}>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>Safety Margin</Text>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: '#22C55E' }}>
                    {Math.round(((exp.limit - exp.current) / exp.limit) * 100)}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Trend Chart */}
            <View style={[styles.section, styles.cardShadow]}>
              <Text style={styles.sectionTitle}>6-Month Trend</Text>
              <LineChart
                data={{
                  labels: ['M-5', 'M-4', 'M-3', 'M-2', 'M-1', 'Now'],
                  datasets: [
                    {
                      data: exp.trend,
                      color: () => colors.primary,
                      strokeWidth: 2,
                    },
                    {
                      data: Array(6).fill(exp.limit),
                      color: () => '#EF4444',
                      strokeWidth: 2,
                      strokeDashArray: [5, 5],
                    },
                  ],
                }}
                width={width - 60}
                height={220}
                chartConfig={{
                  backgroundColor: colors.background,
                  backgroundGradientFrom: colors.background,
                  backgroundGradientTo: colors.background,
                  decimalPlaces: 2,
                  color: () => colors.textSecondary,
                  labelColor: () => colors.textSecondary,
                  style: { borderRadius: borderRadius.lg },
                }}
                bezier
                style={{ marginVertical: spacing.md }}
              />
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: spacing.md }}>
                Blue line: Current levels | Red line: Exposure limit
              </Text>
            </View>

            {/* Recommendations */}
            <View style={[styles.section, styles.cardShadow]}>
              <Text style={styles.sectionTitle}>Controls in Place</Text>
              {[
                'Continuous monitoring system installed',
                'Automated alert system at 75% of limit',
                'Weekly calibration of sensors',
                'Real-time data logging to backend',
                'Monthly trend analysis & reporting',
              ].map((control, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
                  <Text style={{ fontSize: 12, color: colors.text, marginLeft: spacing.md }}>{control}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={[styles.actionBtn, styles.cardShadow]}>
              <Ionicons name="download" size={20} color="#FFF" />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFF' }}>Download Detailed Report</Text>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}


// ─── CNSS / DRC label helpers ────────────────────────────────────
const CNSS_TYPE_LABELS: Record<string, string> = {
  incident: 'Déclaration Accident',
  occupational_disease: 'Maladie Professionnelle',
  fatality: 'Déclaration Décès',
  monthly_stats: 'Statistiques Mensuelles',
};

const DRC_TYPE_LABELS: Record<string, string> = {
  monthly_incident: 'Incidents Mensuels',
  quarterly_health: 'Santé Trimestrielle',
  annual_compliance: 'Conformité Annuelle',
  fatal_incident: 'Incident Mortel',
  severe_incident: 'Incident Grave',
  occupational_disease_notice: 'Avis Maladie Pro',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  ready_for_submission: 'Prêt',
  submitted: 'Soumis',
  acknowledged: 'Accusé',
  rejected: 'Rejeté',
  approved: 'Approuvé',
};

function getStatusColor(status: string): string {
  switch (status) {
    case 'approved': case 'acknowledged': return '#22C55E';
    case 'submitted': return '#3B82F6';
    case 'ready_for_submission': return '#F59E0B';
    case 'rejected': return '#EF4444';
    default: return '#94A3B8';
  }
}

export function RegulatoryReportsScreen() {
  const [activeTab, setActiveTab] = useState<'cnss' | 'drc'>('cnss');
  const [cnssReports, setCnssReports] = useState<any[]>([]);
  const [drcReports, setDrcReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const [cnssResult, drcResult] = await Promise.all([
      occHealthApi.listCNSSReports(),
      occHealthApi.listDRCReports(),
    ]);
    setCnssReports(cnssResult.data);
    setDrcReports(drcResult.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const list = activeTab === 'cnss' ? cnssReports : drcReports;
  const typeLabels = activeTab === 'cnss' ? CNSS_TYPE_LABELS : DRC_TYPE_LABELS;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <View>
          <Text style={styles.title}>Rapports Réglementaires</Text>
          <Text style={styles.subtitle}>Déclarations CNSS & RDC obligatoires</Text>
        </View>
        <TouchableOpacity
          style={{ backgroundColor: colors.primary, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
          onPress={() => setShowCreate(true)}
        >
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>Nouveau</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.md }}>
        {(['cnss', 'drc'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{
              flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.md, alignItems: 'center',
              backgroundColor: activeTab === tab ? colors.primary : colors.outlineVariant,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: activeTab === tab ? '#FFF' : colors.textSecondary }}>
              {tab === 'cnss' ? 'CNSS' : 'RDC (DRC)'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 40 }}>
          {list.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Ionicons name="document-outline" size={48} color={colors.outline} />
              <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' }}>
                {`Aucun rapport ${activeTab === 'cnss' ? 'CNSS' : 'RDC'}.\nCréez le premier avec le bouton « Nouveau ».`}
              </Text>
            </View>
          ) : (
            list.map((r: any) => {
              const color = getStatusColor(r.status);
              const label = typeLabels[r.report_type] ?? r.report_type;
              return (
                <View key={r.id} style={[styles.reportCard, styles.cardShadow, { borderLeftWidth: 4, borderLeftColor: color }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                    <View style={{ flex: 1, marginRight: spacing.sm }}>
                      <Text style={styles.reportName}>{label}</Text>
                      <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>
                        Réf: {r.reference_number}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: color + '20', paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: borderRadius.full }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color }}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, color: colors.textSecondary }}>Période</Text>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text, marginTop: 2 }}>
                        {r.report_period_start?.slice(0, 10)} → {r.report_period_end?.slice(0, 10)}
                      </Text>
                    </View>
                    {(r.submitted_date || r.submitted_at) ? (
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, color: colors.textSecondary }}>Soumis le</Text>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text, marginTop: 2 }}>
                          {(r.submitted_date ?? r.submitted_at)?.slice(0, 10)}
                        </Text>
                      </View>
                    ) : null}
                    {r.submission_method ? (
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, color: colors.textSecondary }}>Méthode</Text>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text, marginTop: 2 }}>
                          {r.submission_method}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {r.notes ? (
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: spacing.sm, fontStyle: 'italic' }}>
                      {r.notes}
                    </Text>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {showCreate && (
        <CreateReportModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchReports(); }}
        />
      )}
    </View>
  );
}

// ─── Create Report Modal ──────────────────────────────────────────
function CreateReportModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [authority, setAuthority] = useState<'cnss' | 'drc'>('cnss');
  const [reportType, setReportType] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [submissionMethod, setSubmissionMethod] = useState('online');
  const [submissionRecipient, setSubmissionRecipient] = useState('');
  const [saving, setSaving] = useState(false);

  const cnssTypes = Object.entries(CNSS_TYPE_LABELS);
  const drcTypes = Object.entries(DRC_TYPE_LABELS);
  const types = authority === 'cnss' ? cnssTypes : drcTypes;

  const handleSubmit = async () => {
    if (!reportType) { Alert.alert('Champ requis', 'Veuillez sélectionner le type de rapport.'); return; }
    if (!periodStart || !periodEnd) { Alert.alert('Champ requis', 'Veuillez saisir les dates de la période.'); return; }

    setSaving(true);
    let result: { data: any; error?: string };
    if (authority === 'cnss') {
      result = await occHealthApi.createCNSSReport({
        report_type: reportType,
        report_period_start: periodStart,
        report_period_end: periodEnd,
        notes: notes || undefined,
        submission_method: submissionMethod || undefined,
      });
    } else {
      result = await occHealthApi.createDRCReport({
        report_type: reportType,
        report_period_start: periodStart,
        report_period_end: periodEnd,
        submission_method: submissionMethod || undefined,
        submission_recipient: submissionRecipient || undefined,
      });
    }
    setSaving(false);

    if (result.error) {
      Alert.alert('Erreur', result.error);
    } else {
      Alert.alert('Succès', 'Rapport créé avec succès.');
      onCreated();
    }
  };

  return (
    <Modal visible={true} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nouveau Rapport Réglementaire</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: spacing.lg }}>
            {/* Authority tabs */}
            <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: spacing.xs }}>Autorité</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
              {(['cnss', 'drc'] as const).map(a => (
                <TouchableOpacity
                  key={a}
                  onPress={() => { setAuthority(a); setReportType(''); }}
                  style={{
                    flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.md, alignItems: 'center',
                    backgroundColor: authority === a ? colors.primary : colors.outlineVariant,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: authority === a ? '#FFF' : colors.textSecondary }}>
                    {a === 'cnss' ? 'CNSS' : 'RDC (DRC)'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Report type chips */}
            <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: spacing.xs }}>Type de rapport *</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md }}>
              {types.map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setReportType(key)}
                  style={{
                    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full,
                    backgroundColor: reportType === key ? colors.primary : colors.outlineVariant,
                    borderWidth: 1, borderColor: reportType === key ? colors.primary : colors.outline,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: reportType === key ? '#FFF' : colors.textSecondary }}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Period dates */}
            <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: spacing.xs }}>Début de période * (AAAA-MM-JJ)</Text>
            <TextInput
              value={periodStart}
              onChangeText={setPeriodStart}
              placeholder="2026-01-01"
              placeholderTextColor={colors.textSecondary}
              style={styles.textInput}
              keyboardType="numeric"
            />

            <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md }}>Fin de période * (AAAA-MM-JJ)</Text>
            <TextInput
              value={periodEnd}
              onChangeText={setPeriodEnd}
              placeholder="2026-01-31"
              placeholderTextColor={colors.textSecondary}
              style={styles.textInput}
              keyboardType="numeric"
            />

            {/* Submission method */}
            <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md }}>Méthode de soumission</Text>
            <View style={{ flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md }}>
              {['online', 'mail', 'in_person'].map(m => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setSubmissionMethod(m)}
                  style={{
                    flex: 1, paddingVertical: spacing.xs, borderRadius: borderRadius.md, alignItems: 'center',
                    backgroundColor: submissionMethod === m ? colors.secondary : colors.outlineVariant,
                    borderWidth: 1, borderColor: submissionMethod === m ? colors.secondary : colors.outline,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '600', color: submissionMethod === m ? '#FFF' : colors.textSecondary }}>
                    {m === 'online' ? 'En ligne' : m === 'mail' ? 'Courrier' : 'En personne'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Recipient — DRC only */}
            {authority === 'drc' && (
              <>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: spacing.xs }}>Destinataire / Autorité</Text>
                <TextInput
                  value={submissionRecipient}
                  onChangeText={setSubmissionRecipient}
                  placeholder="ex: Inspection du Travail"
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.textInput, { marginBottom: spacing.md }]}
                />
              </>
            )}

            {/* Notes — CNSS only */}
            {authority === 'cnss' && (
              <>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.xs }}>Notes (optionnel)</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Remarques ou informations complémentaires…"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  style={[styles.textInput, { height: 80, textAlignVertical: 'top', paddingTop: spacing.sm }]}
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.actionBtn, styles.cardShadow, { marginHorizontal: 0, marginTop: spacing.lg, opacity: saving ? 0.7 : 1 }]}
              onPress={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="cloud-upload-outline" size={20} color="#FFF" />
              )}
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFF' }}>
                {saving ? 'Création…' : 'Créer le rapport'}
              </Text>
            </TouchableOpacity>

            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: colors.textSecondary },

  section: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.md },

  exposureCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  exposureName: { fontSize: 13, fontWeight: '700', color: colors.text },
  statusBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  statusValue: { fontSize: 12, fontWeight: '700' },
  progressBar: { height: 8, backgroundColor: colors.outlineVariant, borderRadius: borderRadius.full, overflow: 'hidden' },

  reportCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  reportName: { fontSize: 13, fontWeight: '700', color: colors.text },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, paddingTop: spacing.lg, maxHeight: '95%' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    paddingBottom: spacing.md,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },

  cardShadow: shadows.sm,

  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 13,
    color: colors.text,
    marginBottom: spacing.sm,
  },
});
