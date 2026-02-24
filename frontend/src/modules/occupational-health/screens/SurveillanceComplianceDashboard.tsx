import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions,
  ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { occHealthApiService } from '../services/OccHealthApiService';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

/**
 * SURVEILLANCE COMPLIANCE DASHBOARD
 * 
 * ✅ Feature 3: Compliance Dashboard for Surveillance Coverage Metrics
 * 
 * This dashboard shows:
 * - Overall compliance rate across all workers
 * - Workers in surveillance vs total workers
 * - Due soon and overdue exams
 * - Per-program enrollment and completion stats
 * - Threshold violations summary
 * 
 * Used by: OH Physicians, Safety Officers, Compliance Officers
 */

export function SurveillanceComplianceDashboard() {
  const [loading, setLoading] = useState(true);
  const [compliance, setCompliance] = useState<any>(null);
  const [violations, setViolations] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [enterprise, setEnterprise] = useState<string>('');

  useEffect(() => {
    loadDashboardData();
  }, [enterprise]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [complianceData, violationsData, trendsData] = await Promise.all([
        occHealthApiService.getSurveillanceCompliance({
          enterprise_id: enterprise || undefined,
        }),
        occHealthApiService.getThresholdViolations({
          status: 'open',
        }),
        occHealthApiService.getSurveillanceTrends({
          interval: 'monthly',
        }),
      ]);

      setCompliance(complianceData);
      setViolations(violationsData);
      setTrends(trendsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: spacing.md, color: colors.textSecondary }}>Chargement tableau de bord...</Text>
      </View>
    );
  }

  if (!compliance) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Impossible de charger les données de conformité</Text>
      </View>
    );
  }

  const complianceRate = compliance.complianceRate || 0;
  const complianceColor = complianceRate >= 90 ? '#22C55E' : complianceRate >= 75 ? '#F59E0B' : '#EF4444';

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Tableau de Bord — Conformité Surveillance</Text>
          <Text style={styles.subtitle}>Couverture et conformité des programmes de surveillance médicale</Text>
        </View>

        {/* Main KPI Cards */}
        <View style={styles.kpiGrid}>
          {/* Compliance Rate */}
          <TouchableOpacity style={[styles.kpiCard, styles.cardShadow]}>
            <View style={[styles.kpiIcon, { backgroundColor: complianceColor + '20' }]}>
              <Ionicons name="checkmark-circle-outline" size={32} color={complianceColor} />
            </View>
            <Text style={styles.kpiValue}>{complianceRate.toFixed(1)}%</Text>
            <Text style={styles.kpiLabel}>Taux Conformité</Text>
            <Text style={[styles.kpiDesc, { color: complianceColor }]}>
              {complianceRate >= 90 ? '✅ Excellent' : complianceRate >= 75 ? '⚠️ Bon' : '🔴 À Améliorer'}
            </Text>
          </TouchableOpacity>

          {/* Workers in Surveillance */}
          <TouchableOpacity style={[styles.kpiCard, styles.cardShadow]}>
            <View style={[styles.kpiIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="people-outline" size={32} color={colors.primary} />
            </View>
            <Text style={styles.kpiValue}>
              {compliance.workersInSurveillance} / {compliance.totalWorkers}
            </Text>
            <Text style={styles.kpiLabel}>Travailleurs</Text>
            <Text style={[styles.kpiDesc, { color: colors.primary }]}>
              Sous surveillance médicale
            </Text>
          </TouchableOpacity>

          {/* Due Soon */}
          <TouchableOpacity style={[styles.kpiCard, styles.cardShadow]}>
            <View style={[styles.kpiIcon, { backgroundColor: '#F59E0B20' }]}>
              <Ionicons name="alert-outline" size={32} color="#F59E0B" />
            </View>
            <Text style={styles.kpiValue}>{compliance.dueSoonCount}</Text>
            <Text style={styles.kpiLabel}>Examen Prévu</Text>
            <Text style={[styles.kpiDesc, { color: '#F59E0B' }]}>
              Prochains 30 jours
            </Text>
          </TouchableOpacity>

          {/* Overdue */}
          <TouchableOpacity style={[styles.kpiCard, styles.cardShadow]}>
            <View style={[styles.kpiIcon, { backgroundColor: '#EF444414' }]}>
              <Ionicons name="warning-outline" size={32} color="#EF4444" />
            </View>
            <Text style={styles.kpiValue}>{compliance.overdueCount}</Text>
            <Text style={styles.kpiLabel}>En Retard</Text>
            <Text style={[styles.kpiDesc, { color: '#EF4444' }]}>
              Examen dépassé
            </Text>
          </TouchableOpacity>
        </View>

        {/* Open Violations Alert */}
        {violations.length > 0 && (
          <View style={[styles.violationAlert, styles.cardShadow]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }}>
              <Ionicons name="alert-circle" size={24} color="#EF4444" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#EF4444' }}>
                  {violations.length} Dépassement(s) de Seuil Détecté(s)
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
                  Action requise pour maintenir la conformité
                </Text>
              </View>
            </View>
            <FlatList
              data={violations.slice(0, 3)}
              keyExtractor={v => v.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={{ paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.outline }}>
                  <Text style={{ fontSize: 12, color: colors.text, fontWeight: '600' }}>
                    {item.workerName} — {item.parameter}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                    Valeur: {item.value} ({item.severity === 'critical' ? '🚨 ' : item.severity === 'action' ? '🔴 ' : '⚠️ '})
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2, fontStyle: 'italic' }}>
                    Action: {item.actionRequired}
                  </Text>
                </View>
              )}
            />
            {violations.length > 3 && (
              <Text style={{ fontSize: 10, color: colors.primary, marginTop: spacing.sm, fontWeight: '600' }}>
                +{violations.length - 3} autre(s)...
              </Text>
            )}
          </View>
        )}

        {/* Program Stats */}
        <View style={{ marginTop: spacing.lg }}>
          <Text style={styles.sectionTitle}>Statistiques par Programme</Text>
          {compliance.programStats && compliance.programStats.length > 0 ? (
            compliance.programStats.map((prog: any) => (
              <TouchableOpacity
                key={prog.programId}
                style={[styles.programStatCard, styles.cardShadow]}
                onPress={() => {
                  setSelectedProgram(prog);
                  setShowDetailsModal(true);
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.programName}>{prog.programName}</Text>
                    <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
                      <View>
                        <Text style={styles.statNumber}>{prog.enrolledWorkers}</Text>
                        <Text style={styles.statLabel}>Inscrits</Text>
                      </View>
                      <View>
                        <Text style={styles.statNumber}>{prog.completedExams}</Text>
                        <Text style={styles.statLabel}>Réalisés</Text>
                      </View>
                      <View>
                        <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{prog.pendingExams}</Text>
                        <Text style={styles.statLabel}>Prévus</Text>
                      </View>
                      <View>
                        <Text style={[styles.statNumber, { color: '#EF4444' }]}>{prog.overdueExams}</Text>
                        <Text style={styles.statLabel}>En Retard</Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
                </View>
                {/* Progress bar */}
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${prog.enrolledWorkers > 0 ? (prog.completedExams / prog.enrolledWorkers) * 100 : 0}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressLabel}>
                  {prog.enrolledWorkers > 0 ? ((prog.completedExams / prog.enrolledWorkers) * 100).toFixed(0) : 0}% complété
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg }}>
              Aucun programme de surveillance actuellement
            </Text>
          )}
        </View>

        {/* Trends Chart */}
        {trends.length > 0 && (
          <View style={{ marginTop: spacing.lg, marginBottom: spacing.xl }}>
            <Text style={styles.sectionTitle}>Tendance (derniers 6 mois)</Text>
            <View style={[styles.trendCard, styles.cardShadow]}>
              {trends.map((t: any, idx: number) => (
                <View key={idx} style={{ flexDirection: 'row', marginBottom: spacing.md }}>
                  <Text style={{ width: 50, fontSize: 10, color: colors.textSecondary }}>
                    {new Date(t.date).toLocaleDateString('fr-CD', { month: 'short' })}
                  </Text>
                  <View style={{ flex: 1, gap: spacing.xs }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <Text style={{ fontSize: 10, color: '#22C55E', fontWeight: '600' }}>✓ {t.completedExams}</Text>
                      <Text style={{ fontSize: 10, color: '#F59E0B', fontWeight: '600' }}>⧖ {t.dueSoonCount}</Text>
                      <Text style={{ fontSize: 10, color: '#EF4444', fontWeight: '600' }}>✕ {t.overdueCount}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Program Details Modal */}
      {selectedProgram && (
        <Modal visible={showDetailsModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
                <Text style={styles.modalTitle}>{selectedProgram.programName}</Text>
                <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <StatRow label="Travailleurs inscrits" value={selectedProgram.enrolledWorkers} />
                <StatRow label="Examens réalisés" value={selectedProgram.completedExams} color="#22C55E" />
                <StatRow label="Examens en attente" value={selectedProgram.pendingExams} color="#F59E0B" />
                <StatRow label="Examens en retard" value={selectedProgram.overdueExams} color="#EF4444" />
                <StatRow 
                  label="Taux complétude" 
                  value={`${selectedProgram.enrolledWorkers > 0 ? ((selectedProgram.completedExams / selectedProgram.enrolledWorkers) * 100).toFixed(1) : 0}%`} 
                />
              </ScrollView>

              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowDetailsModal(false)}>
                <Text style={{ color: '#FFF', fontWeight: '600' }}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

function StatRow({ label, value, color }: { label: string; value: any; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outline }}>
      <Text style={{ fontSize: 13, color: colors.textSecondary }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '700', color: color || colors.text }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  errorText: { fontSize: 14, color: '#EF4444', textAlign: 'center', marginTop: spacing.lg },

  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: colors.textSecondary },

  kpiGrid: { flexDirection: isDesktop ? 'row' : 'column', gap: spacing.md, paddingHorizontal: spacing.md, marginBottom: spacing.lg, flexWrap: 'wrap' },
  kpiCard: {
    flex: isDesktop ? 1 : undefined,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    minWidth: isDesktop ? '22%' : '100%',
  },
  kpiIcon: { width: 60, height: 60, borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
  kpiValue: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 4 },
  kpiLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', marginBottom: spacing.xs },
  kpiDesc: { fontSize: 10, fontWeight: '600' },

  violationAlert: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: '#EF444414',
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    padding: spacing.md,
  },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginLeft: spacing.md, marginBottom: spacing.md },

  programStatCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  programName: { fontSize: 13, fontWeight: '700', color: colors.text },
  statNumber: { fontSize: 16, fontWeight: '700', color: colors.primary },
  statLabel: { fontSize: 9, color: colors.textSecondary, marginTop: 2 },

  progressBar: { height: 6, backgroundColor: colors.outline, borderRadius: 3, marginTop: spacing.sm, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  progressLabel: { fontSize: 9, color: colors.textSecondary, marginTop: spacing.xs },

  trendCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, marginHorizontal: spacing.md },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.md },
  modalContent: { backgroundColor: colors.background, borderRadius: borderRadius.xl, padding: spacing.lg, maxHeight: '80%', width: '100%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  modalCloseBtn: { backgroundColor: colors.primary, borderRadius: borderRadius.lg, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.lg },

  cardShadow: shadows.sm || { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
});
