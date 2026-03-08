import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  Dimensions, FlatList, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { occHealthApi } from '../../../services/OccHealthApiService';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import DateInput from '../../../components/DateInput';
import { useSimpleToast } from '../../../hooks/useSimpleToast';
import { SimpleToastNotification } from '../../../components/SimpleToastNotification';

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


// ─── CNSS / ITM label helpers ────────────────────────────────────
const CNSS_TYPE_LABELS: Record<string, string> = {
  incident: 'Déclaration Accident',
  occupational_disease: 'Maladie Professionnelle',
  fatality: 'Déclaration Décès',
  monthly_stats: 'Statistiques Mensuelles',
};

const ITM_TYPE_LABELS: Record<string, string> = {
  work_accident_declaration: 'Déclaration AT (ITM)',
  monthly_incident: 'Rapport Mensuel d\'Incidents',
  quarterly_health: 'Rapport Trimestriel de Santé',
  annual_compliance: 'Conformité Annuelle',
  annual_pamt: 'PAMT (Plan Annuel MT)',
  fatal_incident: 'Déclaration Incident Mortel',
  severe_incident: 'Déclaration Incident Grave',
  occupational_disease_notice: 'Déclaration Maladie Pro',
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
  const { toastMsg, showToast } = useSimpleToast();
  const [activeTab, setActiveTab] = useState<'cnss' | 'drc'>('cnss');
  const [cnssReports, setCnssReports] = useState<any[]>([]);
  const [drcReports, setDrcReports] = useState<any[]>([]);
  const [editingReport, setEditingReport] = useState<{ report: any; isCnss: boolean } | null>(null);
  const [viewingReport, setViewingReport] = useState<{ report: any; isCnss: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    const [cnssResult, drcResult] = await Promise.all([
      occHealthApi.listCNSSReports(),
      occHealthApi.listDRCReports(),
    ]);
    if (cnssResult.error || drcResult.error) {
      setFetchError(cnssResult.error ?? drcResult.error ?? 'Erreur réseau');
    }
    setCnssReports(cnssResult.data);
    setDrcReports(drcResult.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleDelete = useCallback((id: number, isCnss: boolean, reportStatus: string) => {
    const isProtected = ['submitted', 'acknowledged', 'approved'].includes(reportStatus);
    Alert.alert(
      isProtected ? 'Suppression déconseillée' : 'Confirmer la suppression',
      isProtected
        ? `Ce rapport a le statut « ${STATUS_LABELS[reportStatus] ?? reportStatus} » et a déjà été transmis à l'autorité. Voulez-vous quand même le supprimer définitivement ?`
        : 'Voulez-vous vraiment supprimer ce rapport ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            setActionLoadingId(id);
            const res = isCnss
              ? await occHealthApi.deleteCNSSReport(id)
              : await occHealthApi.deleteDRCReport(id);
            setActionLoadingId(null);
            if (res.error) { showToast(res.error, 'error'); }
            else fetchReports();
          },
        },
      ]
    );
  }, [fetchReports]);

  const handleSubmit = useCallback(async (id: number, isCnss: boolean, currentStatus: string) => {
    setActionLoadingId(id);
    if (isCnss) {
      if (currentStatus === 'draft') {
        const patch = await occHealthApi.patchCNSSReport(id, { status: 'ready_for_submission' });
        if (patch.error) {
          setActionLoadingId(null);
          showToast(patch.error, 'error');
          return;
        }
      }
      const res = await occHealthApi.submitCNSSReport(id);
      setActionLoadingId(null);
      if (res.error) { showToast(res.error, 'error'); fetchReports(); }
      else { showToast('Rapport soumis à la CNSS.', 'success'); fetchReports(); }
    } else {
      const res = await occHealthApi.submitDRCReport(id);
      setActionLoadingId(null);
      if (res.error) { showToast(res.error, 'error'); fetchReports(); }
      else { showToast("Rapport soumis à l'autorité ITM.", 'success'); fetchReports(); }
    }
  }, [fetchReports]);

  const list = activeTab === 'cnss' ? cnssReports : drcReports;
  const typeLabels = activeTab === 'cnss' ? CNSS_TYPE_LABELS : ITM_TYPE_LABELS;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <View>
          <Text style={styles.title}>Rapports Réglementaires</Text>
          <Text style={styles.subtitle}>Déclarations CNSS & ITM obligatoires</Text>
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
              {tab === 'cnss' ? 'CNSS' : 'ITM'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {fetchError ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg }}>
          <Ionicons name="cloud-offline-outline" size={40} color="#EF4444" />
          <Text style={{ fontSize: 13, color: '#EF4444', marginTop: spacing.md, textAlign: 'center' }}>{fetchError}</Text>
          <TouchableOpacity onPress={fetchReports} style={{ marginTop: spacing.md, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.md }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 40 }}>
          {list.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Ionicons name="document-outline" size={48} color={colors.outline} />
              <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' }}>
                {`Aucun rapport ${activeTab === 'cnss' ? 'CNSS' : 'ITM'}.\nCréez le premier avec le bouton « Nouveau ».`}
              </Text>
            </View>
          ) : (
            list.map((r: any) => {
              const color = getStatusColor(r.status);
              const label = typeLabels[r.report_type] ?? r.report_type;
              return (
                <View key={r.id} style={[styles.reportCard, styles.cardShadow, { borderLeftWidth: 4, borderLeftColor: color }]}>
                  {/* Auto-generated banner */}
                  {r.content_json?.auto_generated && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF7ED', borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: 5, marginBottom: spacing.sm, borderWidth: 1, borderColor: '#FED7AA' }}>
                      <Ionicons name="flash" size={12} color="#EA580C" />
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#EA580C', flex: 1 }}>Auto-généré depuis incident •{r.content_json.incident_number}</Text>
                      {r.content_json.declaration_deadline || r.declaration_deadline ? (
                        <Text style={{ fontSize: 10, color: '#DC2626', fontWeight: '600' }}>
                          ⏰ {new Date(r.declaration_deadline || r.content_json.declaration_deadline) < new Date() ? 'DÉLAI DÉPASSÉ' : `Délai: ${(r.declaration_deadline || r.content_json.declaration_deadline)?.slice(0, 10)}`}
                        </Text>
                      ) : null}
                    </View>
                  )}
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

                  {/* Action buttons */}
                  <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.outlineVariant, paddingTop: spacing.sm }}>
                    <TouchableOpacity
                      onPress={() => setViewingReport({ report: r, isCnss: activeTab === 'cnss' })}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: colors.outlineVariant, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: borderRadius.md }}
                    >
                      <Ionicons name="eye-outline" size={14} color={colors.textSecondary} />
                      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>Voir</Text>
                    </TouchableOpacity>
                    {r.status === 'draft' && (
                      <TouchableOpacity
                        onPress={() => setEditingReport({ report: r, isCnss: activeTab === 'cnss' })}
                        disabled={actionLoadingId === r.id}
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#FFF7ED', paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1, borderColor: '#EA580C' }}
                      >
                        <Ionicons name="create-outline" size={14} color="#EA580C" />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#EA580C' }}>Compléter</Text>
                      </TouchableOpacity>
                    )}
                    {(r.status === 'draft' || r.status === 'ready_for_submission') && (
                      <TouchableOpacity
                        onPress={() => handleSubmit(r.id, activeTab === 'cnss', r.status)}
                        disabled={actionLoadingId === r.id}
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: colors.primary + '20', paddingVertical: spacing.xs, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.primary }}
                      >
                        {actionLoadingId === r.id
                          ? <ActivityIndicator size="small" color={colors.primary} />
                          : <Ionicons name="cloud-upload-outline" size={14} color={colors.primary} />}
                        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.primary }}>Soumettre</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => handleDelete(r.id, activeTab === 'cnss', r.status)}
                      disabled={actionLoadingId === r.id}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#FEF2F2', paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: '#EF4444' }}
                    >
                      <Ionicons name="trash-outline" size={14} color="#EF4444" />
                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#EF4444' }}>Supprimer</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {showCreate && (
        <CreateReportModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchReports(); showToast('Rapport créé avec succès.', 'success'); }}
        />
      )}
      {editingReport && (
        <CompleteReportModal
          report={editingReport.report}
          isCnss={editingReport.isCnss}
          onClose={() => setEditingReport(null)}
          onSaved={() => { setEditingReport(null); fetchReports(); showToast('Rapport mis à jour.', 'success'); }}
        />
      )}
      {viewingReport && (
        <ReportDetailsModal
          report={viewingReport.report}
          isCnss={viewingReport.isCnss}
          onClose={() => setViewingReport(null)}
          onEdit={viewingReport.report.status === 'draft' ? () => { setViewingReport(null); setEditingReport(viewingReport); } : undefined}
        />
      )}
      <SimpleToastNotification message={toastMsg} />
    </View>
  );
}

// ─── Create Report Modal ──────────────────────────────────────────
function CreateReportModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toastMsg: modalToastMsg, showToast: showModalToast } = useSimpleToast();
  const [authority, setAuthority] = useState<'cnss' | 'drc'>('cnss');
  const [reportType, setReportType] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [submissionMethod, setSubmissionMethod] = useState('online');
  const [itmOffice, setItmOffice] = useState('');
  const [declarationDeadline, setDeclarationDeadline] = useState('');
  const [workersAffectedCount, setWorkersAffectedCount] = useState('');
  const [requiredActions, setRequiredActions] = useState('');
  const [saving, setSaving] = useState(false);

  const cnssTypes = Object.entries(CNSS_TYPE_LABELS);
  const itmTypes = Object.entries(ITM_TYPE_LABELS);
  const types = authority === 'cnss' ? cnssTypes : itmTypes;

  const canSubmit = useMemo(
    () => !!reportType && !!periodStart && !!periodEnd && periodEnd > periodStart &&
      (authority === 'cnss' || !!itmOffice),
    [reportType, periodStart, periodEnd, authority, itmOffice]
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;

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
        submission_recipient: 'Inspection du Travail et des Mines (ITM)',
        itm_office: itmOffice || undefined,
        declaration_deadline: declarationDeadline || undefined,
        workers_affected_count: workersAffectedCount ? parseInt(workersAffectedCount, 10) : undefined,
        required_actions: requiredActions || undefined,
      });
    }
    setSaving(false);

    if (result.error) {
      showModalToast(result.error, 'error');
    } else {
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
                    {a === 'cnss' ? 'CNSS' : 'ITM'}
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
            <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: spacing.xs }}>Début de période *</Text>
            <View style={[styles.textInput, { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }]}>
              <DateInput
                value={periodStart}
                onChangeText={setPeriodStart}
                placeholder="Sélectionner une date"
                format="iso"
                maximumDate={new Date()}
                containerStyle={{ flex: 1 }}
                inputStyle={{ fontSize: 13, color: colors.text }}
              />
            </View>
            {!!periodStart && <Text style={{ fontSize: 10, color: colors.textSecondary, marginBottom: spacing.sm, marginTop: -spacing.xs }}>{periodStart}</Text>}

            <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.xs }}>Fin de période *</Text>
            <View style={[styles.textInput, { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }]}>
              <DateInput
                value={periodEnd}
                onChangeText={setPeriodEnd}
                placeholder="Sélectionner une date"
                format="iso"
                minimumDate={periodStart ? new Date(periodStart) : undefined}
                containerStyle={{ flex: 1 }}
                inputStyle={{ fontSize: 13, color: colors.text }}
              />
            </View>
            {!!periodEnd && periodEnd <= periodStart && (
              <Text style={{ fontSize: 10, color: '#EF4444', marginBottom: spacing.sm, marginTop: -spacing.xs }}>
                La date de fin doit être postérieure à la date de début.
              </Text>
            )}

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

            {/* ITM-specific fields */}
            {authority === 'drc' && (
              <>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: spacing.xs }}>Bureau ITM *</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md }}>
                  {['Kinshasa', 'Lubumbashi', 'Goma', 'Mbuji-Maï', 'Kananga', 'Kisangani', 'Autre'].map(office => (
                    <TouchableOpacity
                      key={office}
                      onPress={() => setItmOffice(office)}
                      style={{
                        paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full,
                        backgroundColor: itmOffice === office ? colors.secondary : colors.outlineVariant,
                        borderWidth: 1, borderColor: itmOffice === office ? colors.secondary : colors.outline,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: itmOffice === office ? '#FFF' : colors.textSecondary }}>{office}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: spacing.xs }}>Délai légal de déclaration</Text>
                <View style={[styles.textInput, { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }]}>
                  <DateInput
                    value={declarationDeadline}
                    onChangeText={setDeclarationDeadline}
                    placeholder="Date limite légale"
                    format="iso"
                    containerStyle={{ flex: 1 }}
                    inputStyle={{ fontSize: 13, color: colors.text }}
                  />
                </View>

                <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.xs }}>Nbre de travailleurs affectés</Text>
                <TextInput
                  value={workersAffectedCount}
                  onChangeText={v => setWorkersAffectedCount(v.replace(/[^0-9]/g, ''))}
                  placeholder="ex: 3"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  style={[styles.textInput, { marginBottom: spacing.md }]}
                />

                <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: spacing.xs }}>Actions correctives requises</Text>
                <TextInput
                  value={requiredActions}
                  onChangeText={setRequiredActions}
                  placeholder="Mesures prises ou prévues par l’employeur…"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  style={[styles.textInput, { height: 80, textAlignVertical: 'top', paddingTop: spacing.sm, marginBottom: spacing.md }]}
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
              style={[styles.actionBtn, styles.cardShadow, { marginHorizontal: 0, marginTop: spacing.lg, opacity: (!canSubmit || saving) ? 0.45 : 1 }]}
              onPress={handleSubmit}
              disabled={!canSubmit || saving}
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
          <SimpleToastNotification message={modalToastMsg} />
        </View>
      </View>
    </Modal>
  );
}

// ─── Report Details Modal ────────────────────────────────────────
function ReportDetailsModal({
  report,
  isCnss,
  onClose,
  onEdit,
}: {
  report: any;
  isCnss: boolean;
  onClose: () => void;
  onEdit?: () => void;
}) {
  const typeLabels = isCnss ? CNSS_TYPE_LABELS : ITM_TYPE_LABELS;
  const color = getStatusColor(report.status);
  const content = report.content_json ?? {};
  const isOverdue =
    !!report.declaration_deadline && new Date(report.declaration_deadline) < new Date();

  const Row = ({ label, value }: { label: string; value?: string | number | null }) =>
    value != null && value !== '' ? (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant }}>
        <Text style={{ fontSize: 11, color: colors.textSecondary, flex: 1 }}>{label}</Text>
        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, flex: 1.5, textAlign: 'right' }}>{String(value)}</Text>
      </View>
    ) : null;

  return (
    <Modal visible={true} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {typeLabels[report.report_type] ?? report.report_type}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 }}>
                <View style={{ backgroundColor: color + '20', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.full }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color }}>{STATUS_LABELS[report.status] ?? report.status}</Text>
                </View>
                <Text style={{ fontSize: 10, color: colors.textSecondary }}>{isCnss ? 'CNSS' : 'ITM'}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: spacing.lg }}>
            {/* Auto-generated banner */}
            {content.auto_generated && (
              <View style={{ backgroundColor: '#FFF7ED', borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, borderLeftWidth: 4, borderLeftColor: '#EA580C' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#EA580C', marginBottom: 4 }}>⚡ Rapport auto-généré</Text>
                {!!content.incident_number && (
                  <Text style={{ fontSize: 11, color: '#92400E' }}>Incident : {content.incident_number}</Text>
                )}
                {!!report.declaration_deadline && (
                  <Text style={{ fontSize: 11, fontWeight: '600', color: isOverdue ? '#EF4444' : '#92400E', marginTop: 2 }}>
                    {isOverdue ? '⚠ Délai dépassé : ' : 'Délai légal : '}{report.declaration_deadline}
                  </Text>
                )}
              </View>
            )}

            {/* Core fields */}
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, marginBottom: spacing.xs, marginTop: spacing.xs }}>Informations générales</Text>
            <Row label="Référence" value={report.reference_number} />
            <Row label="Type" value={typeLabels[report.report_type] ?? report.report_type} />
            <Row label="Statut" value={STATUS_LABELS[report.status] ?? report.status} />
            <Row label="Autorité" value={isCnss ? 'CNSS' : 'ITM'} />
            <Row label="Période" value={`${report.report_period_start?.slice(0, 10) ?? '—'} → ${report.report_period_end?.slice(0, 10) ?? '—'}`} />
            <Row label="Méthode de soumission" value={report.submission_method} />
            <Row label="Soumis le" value={(report.submitted_date ?? report.submitted_at)?.slice(0, 10)} />

            {/* ITM-specific */}
            {!isCnss && (
              <>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, marginBottom: spacing.xs, marginTop: spacing.lg }}>Informations ITM</Text>
                <Row label="Bureau ITM" value={report.itm_office} />
                <Row label="Délai légal" value={report.declaration_deadline} />
                <Row label="Travailleurs affectés" value={report.workers_affected_count} />
                <Row label="Destinataire" value={report.submission_recipient} />
                {!!report.required_actions && (
                  <View style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant }}>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>Actions correctives</Text>
                    <Text style={{ fontSize: 12, color: colors.text }}>{report.required_actions}</Text>
                  </View>
                )}
              </>
            )}

            {/* Incident content */}
            {(content.incident_number || content.description || content.location) && (
              <>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, marginBottom: spacing.xs, marginTop: spacing.lg }}>Données de l'incident</Text>
                <Row label="N° incident" value={content.incident_number} />
                <Row label="Date" value={content.incident_date} />
                <Row label="Lieu" value={content.location} />
                <Row label="Catégorie" value={content.category} />
                <Row label="Gravité" value={content.severity != null ? `Niveau ${content.severity}` : null} />
                {!!content.description && (
                  <View style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant }}>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>Description</Text>
                    <Text style={{ fontSize: 12, color: colors.text }}>{content.description}</Text>
                  </View>
                )}
              </>
            )}

            {/* Notes */}
            {!!report.notes && (
              <>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text, marginBottom: spacing.xs, marginTop: spacing.lg }}>Notes</Text>
                <Text style={{ fontSize: 12, color: colors.text, fontStyle: 'italic', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant }}>
                  {report.notes}
                </Text>
              </>
            )}

            {onEdit && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.cardShadow, { marginHorizontal: 0, marginTop: spacing.lg, backgroundColor: '#EA580C' }]}
                onPress={onEdit}
              >
                <Ionicons name="create-outline" size={20} color="#FFF" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFF' }}>Compléter ce rapport</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Complete Report Modal ────────────────────────────────────────
function CompleteReportModal({
  report,
  isCnss,
  onClose,
  onSaved,
}: {
  report: any;
  isCnss: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toastMsg: modalToastMsg, showToast: showModalToast } = useSimpleToast();

  const content = report.content_json ?? {};

  const [periodEnd, setPeriodEnd] = useState<string>(report.report_period_end ?? '');
  const [submissionMethod, setSubmissionMethod] = useState<string>(report.submission_method ?? 'online');
  const [notes, setNotes] = useState<string>(report.notes ?? '');
  // ITM-specific
  const [itmOffice, setItmOffice] = useState<string>(report.itm_office ?? '');
  const [workersAffectedCount, setWorkersAffectedCount] = useState<string>(
    report.workers_affected_count != null ? String(report.workers_affected_count) : '',
  );
  const [requiredActions, setRequiredActions] = useState<string>(report.required_actions ?? '');
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const errors = {
    periodEnd: !periodEnd ? 'La date de fin de période est obligatoire.' : null,
    itmOffice: !isCnss && !itmOffice ? 'Veuillez sélectionner le bureau ITM compétent.' : null,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const isOverdue = !!report.declaration_deadline && new Date(report.declaration_deadline) < new Date();

  const handleSave = async () => {
    setSubmitted(true);
    if (hasErrors) return;
    setSaving(true);
    const payload: Record<string, any> = {
      report_period_end: periodEnd,
      submission_method: submissionMethod || undefined,
      notes: notes || undefined,
    };
    if (!isCnss) {
      payload.itm_office = itmOffice || undefined;
      payload.required_actions = requiredActions || undefined;
      if (workersAffectedCount) payload.workers_affected_count = parseInt(workersAffectedCount, 10);
    }
    const res = isCnss
      ? await occHealthApi.patchCNSSReport(report.id, payload)
      : await occHealthApi.patchDRCReport(report.id, payload);
    setSaving(false);
    if (res.error) {
      showModalToast(res.error, 'error');
    } else {
      onSaved();
    }
  };

  return (
    <Modal visible={true} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Compléter le rapport {isCnss ? 'CNSS' : 'ITM'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: spacing.lg }}>
            {/* Auto-generated incident info banner */}
            {content.auto_generated && (
              <View style={{ backgroundColor: '#FFF7ED', borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md, borderLeftWidth: 4, borderLeftColor: '#EA580C' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#EA580C', marginBottom: 4 }}>
                  ⚡ Rapport auto-généré
                </Text>
                {!!content.incident_number && (
                  <Text style={{ fontSize: 11, color: '#92400E' }}>Incident : {content.incident_number}</Text>
                )}
                {!!report.declaration_deadline && (
                  <Text style={{ fontSize: 11, fontWeight: '600', color: isOverdue ? '#EF4444' : '#92400E', marginTop: 2 }}>
                    {isOverdue ? '⚠ Délai dépassé : ' : 'Délai légal : '}
                    {report.declaration_deadline}
                  </Text>
                )}
                {!!content.location && (
                  <Text style={{ fontSize: 11, color: '#92400E', marginTop: 2 }}>Lieu : {content.location}</Text>
                )}
              </View>
            )}

            {/* Read-only incident summary */}
            {!!content.description && (
              <View style={{ backgroundColor: colors.outlineVariant + '50', borderRadius: borderRadius.sm, padding: spacing.sm, marginBottom: spacing.md }}>
                <Text style={{ fontSize: 10, color: colors.textSecondary, marginBottom: 2 }}>Résumé de l'incident</Text>
                <Text style={{ fontSize: 12, color: colors.text }}>{content.description}</Text>
              </View>
            )}

            {/* Period end date */}
            <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: spacing.xs }}>
              Fin de période <Text style={{ color: '#EF4444' }}>*</Text>
            </Text>
            <View style={[styles.textInput, { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, borderColor: submitted && errors.periodEnd ? '#EF4444' : colors.outline, borderWidth: submitted && errors.periodEnd ? 1.5 : 1 }]}>
              <DateInput
                value={periodEnd}
                onChangeText={setPeriodEnd}
                placeholder="Sélectionner une date"
                format="iso"
                containerStyle={{ flex: 1 }}
                inputStyle={{ fontSize: 13, color: colors.text }}
              />
            </View>
            {submitted && errors.periodEnd ? (
              <Text style={{ fontSize: 10, color: '#EF4444', marginBottom: spacing.sm, marginTop: -spacing.xs }}>
                {errors.periodEnd}
              </Text>
            ) : !!periodEnd ? (
              <Text style={{ fontSize: 10, color: colors.textSecondary, marginBottom: spacing.sm, marginTop: -spacing.xs }}>
                {periodEnd}
              </Text>
            ) : null}

            {/* Submission method */}
            <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md }}>
              Méthode de soumission
            </Text>
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

            {/* ITM-specific fields */}
            {!isCnss && (
              <>
                <Text style={{ fontSize: 11, color: submitted && errors.itmOffice ? '#EF4444' : colors.textSecondary, marginBottom: spacing.xs }}>
                  Bureau ITM <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: submitted && errors.itmOffice ? spacing.xs : spacing.md }}>
                  {['Kinshasa', 'Lubumbashi', 'Goma', 'Mbuji-Maï', 'Kananga', 'Kisangani', 'Autre'].map(office => (
                    <TouchableOpacity
                      key={office}
                      onPress={() => setItmOffice(office)}
                      style={{
                        paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full,
                        backgroundColor: itmOffice === office ? colors.secondary : colors.outlineVariant,
                        borderWidth: 1, borderColor: itmOffice === office ? colors.secondary : colors.outline,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: itmOffice === office ? '#FFF' : colors.textSecondary }}>
                        {office}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {submitted && errors.itmOffice && (
                  <Text style={{ fontSize: 10, color: '#EF4444', marginBottom: spacing.md }}>
                    {errors.itmOffice}
                  </Text>
                )}

                <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: spacing.xs }}>
                  Nbre de travailleurs affectés
                </Text>
                <TextInput
                  value={workersAffectedCount}
                  onChangeText={v => setWorkersAffectedCount(v.replace(/[^0-9]/g, ''))}
                  placeholder="ex: 3"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  style={[styles.textInput, { marginBottom: spacing.md }]}
                />

                <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: spacing.xs }}>
                  Actions correctives requises
                </Text>
                <TextInput
                  value={requiredActions}
                  onChangeText={setRequiredActions}
                  placeholder="Mesures prises ou prévues par l'employeur…"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  style={[styles.textInput, { height: 80, textAlignVertical: 'top', paddingTop: spacing.sm, marginBottom: spacing.md }]}
                />
              </>
            )}

            {/* Notes */}
            <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.xs }}>
              Notes {isCnss ? '(optionnel)' : ''}
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Remarques ou informations complémentaires…"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              style={[styles.textInput, { height: 80, textAlignVertical: 'top', paddingTop: spacing.sm }]}
            />

            {submitted && hasErrors && (
              <View style={{ backgroundColor: '#FEF2F2', borderRadius: borderRadius.md, padding: spacing.sm, marginTop: spacing.lg, borderLeftWidth: 3, borderLeftColor: '#EF4444' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#EF4444', marginBottom: 2 }}>Veuillez compléter les champs obligatoires :</Text>
                {Object.values(errors).filter(Boolean).map((msg, i) => (
                  <Text key={i} style={{ fontSize: 11, color: '#B91C1C', marginTop: 2 }}>• {msg}</Text>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.actionBtn, styles.cardShadow, { marginHorizontal: 0, marginTop: spacing.md, backgroundColor: '#EA580C', opacity: saving ? 0.45 : 1 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
              )}
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFF' }}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </Text>
            </TouchableOpacity>

            <View style={{ height: 30 }} />
          </ScrollView>
          <SimpleToastNotification message={modalToastMsg} />
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
