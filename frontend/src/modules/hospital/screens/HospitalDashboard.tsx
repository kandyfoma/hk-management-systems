import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows } from '../../../theme/theme';
import ApiService from '../../../services/ApiService';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const isTablet = width >= 768 && width < 1024;
const isMobile = width < 768;

// ─── Types ───────────────────────────────────────────────────
interface MetricCard {
  title: string;
  value: string;
  change: string;
  changeType: 'up' | 'down';
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

interface PatientData {
  id: string;
  patient_number: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  phone?: string;
  email?: string;
}

interface EncounterData {
  id: string;
  patient: PatientData;
  encounter_number: string;
  status: string;
  encounter_type: string;
  chief_complaint?: string;
  created_at: string;
}

interface AppointmentData {
  id: string;
  appointment_datetime: string;
  patient: PatientData;
  assigned_staff?: { first_name: string; last_name: string };
  appointment_reason?: string;
  status: string;
}

// ─── Fallback Sample Data ─────────────────────────────────────
const DEFAULT_METRICS: MetricCard[] = [
  { title: 'Patients Aujourd\'hui', value: '—', change: '+15.2%', changeType: 'up', icon: 'people', color: colors.info },
  { title: 'Rendez-vous', value: '—', change: '+5.8%', changeType: 'up', icon: 'calendar', color: colors.secondary },
  { title: 'Lits Occupés', value: '—', change: '+3.2%', changeType: 'up', icon: 'bed', color: colors.warning },
  { title: 'Urgences', value: '—', change: '-2', changeType: 'up', icon: 'pulse', color: colors.error },
];

function StatusBadge({ status, isMobile }: { status: string; isMobile?: boolean }) {
  const getStyle = () => {
    switch (status) {
      case 'Arrivé':
      case 'En Cours': return { bg: colors.infoLight, text: colors.infoDark };
      case 'Urgent': return { bg: colors.errorLight, text: colors.errorDark };
      case 'En Attente': return { bg: colors.warningLight, text: colors.warningDark };
      case 'Terminé': return { bg: colors.successLight, text: colors.successDark };
      case 'Hospitalisé':
      case 'In Progress': return { bg: 'rgba(99,102,241,0.1)', text: colors.secondaryDark };
      case 'Annulé':
      case 'Cancelled': return { bg: colors.errorLight, text: colors.errorDark };
      case 'Absent':
      case 'No Show': return { bg: colors.warningLight, text: colors.warningDark };
      default: return { bg: colors.outlineVariant, text: colors.textSecondary };
    }
  };
  const s = getStyle();
  return (
    <View style={[styles.statusBadge, isMobile && styles.statusBadgeMobile, { backgroundColor: s.bg }]}>
      <Text style={[styles.statusBadgeText, isMobile && styles.statusBadgeTextMobile, { color: s.text }]}>{status}</Text>
    </View>
  );
}

// ─── Section Header Component ────────────────────────────────
function SectionHeader({
  title,
  subtitle,
  icon,
  accentColor = colors.info,
  ctaLabel,
  ctaIcon,
  onCtaPress,
}: {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
  ctaLabel?: string;
  ctaIcon?: keyof typeof Ionicons.glyphMap;
  onCtaPress?: () => void;
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
        {ctaLabel && (
          <TouchableOpacity
            style={[secStyles.ctaBtn, { backgroundColor: accentColor }]}
            onPress={onCtaPress}
            activeOpacity={0.7}
          >
            {ctaIcon && <Ionicons name={ctaIcon} size={15} color="#FFF" />}
            <Text style={secStyles.ctaText}>{ctaLabel}</Text>
          </TouchableOpacity>
        )}
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
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  ctaText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
});

// ─── Component ───────────────────────────────────────────────
interface HospitalDashboardProps {
  onNavigate?: (screenId: string) => void;
}

export function HospitalDashboardContent({ onNavigate }: HospitalDashboardProps = {}) {
  const api = ApiService.getInstance();
  const [metrics, setMetrics] = useState<MetricCard[]>(DEFAULT_METRICS);
  const [recentEncounters, setRecentEncounters] = useState<EncounterData[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<AppointmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    try {
      setError(null);
      
      // Fetch today's encounters
      const encountersRes = await api.get('/hospital/encounters/?limit=5&ordering=-created_at');
      const encounters = encountersRes.success && encountersRes.data 
        ? (Array.isArray(encountersRes.data) ? encountersRes.data : (encountersRes.data.results || []))
        : [];
      setRecentEncounters(encounters.slice(0, 5));

      // Fetch today's appointments
      const appointmentsRes = await api.get('/hospital/appointments/?status=scheduled&ordering=appointment_datetime');
      const appointments = appointmentsRes.success && appointmentsRes.data
        ? (Array.isArray(appointmentsRes.data) ? appointmentsRes.data : (appointmentsRes.data.results || []))
        : [];
      setTodayAppointments(appointments.slice(0, 5));

      // Calculate metrics
      const todayCount = encounters.filter((e: EncounterData) => {
        const created = new Date(e.created_at);
        const today = new Date();
        return created.toDateString() === today.toDateString();
      }).length;

      const appointmentCount = appointments.length;

      setMetrics([
        { 
          title: 'Patients Aujourd\'hui', 
          value: todayCount.toString(), 
          change: '+15.2%', 
          changeType: 'up', 
          icon: 'people', 
          color: colors.info 
        },
        { 
          title: 'Rendez-vous', 
          value: appointmentCount.toString(), 
          change: '+5.8%', 
          changeType: 'up', 
          icon: 'calendar', 
          color: colors.secondary 
        },
        { 
          title: 'Lits Occupés', 
          value: '—', 
          change: '+3.2%', 
          changeType: 'up', 
          icon: 'bed', 
          color: colors.warning 
        },
        { 
          title: 'Urgences', 
          value: '—', 
          change: '-2', 
          changeType: 'up', 
          icon: 'pulse', 
          color: colors.error 
        },
      ]);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Impossible de charger les données');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const calculateAge = (dob?: string): string => {
    if (!dob) return '—';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  };

  const getEncounterStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      'checked_in': 'Arrivé',
      'in_progress': 'En Cours',
      'completed': 'Terminé',
      'cancelled': 'Annulé',
      'no_show': 'Absent',
    };
    return statusMap[status] || status;
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.info} />
        <Text style={styles.loadingText}>Chargement du tableau de bord...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={20} color={colors.errorDark} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Header */}
      <View style={[styles.header, isMobile && styles.headerMobile]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Tableau de Bord Hôpital</Text>
          <Text style={styles.headerSubtitle}>Vue d'ensemble de l'activité hospitalière</Text>
        </View>
        {!isMobile && (
          <TouchableOpacity style={styles.addBtn} activeOpacity={0.7} onPress={() => onNavigate?.('hp-patients')}>
            <Ionicons name="person-add" size={18} color="#FFF" />
            <Text style={styles.addBtnText}>Nouveau Patient</Text>
          </TouchableOpacity>
        )}
        {isMobile && (
          <TouchableOpacity style={styles.addBtnSmall} activeOpacity={0.7} onPress={() => onNavigate?.('hp-patients')}>
            <Ionicons name="person-add" size={20} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* ══════ SECTION: Indicateurs Hôpital ══════ */}
      <SectionHeader
        title="Indicateurs Hôpital"
        subtitle="Activité en temps réel"
        icon="pulse"
        accentColor={colors.info}
        ctaLabel={!isMobile ? 'Exporter' : undefined}
        ctaIcon="download-outline"
        onCtaPress={() => onNavigate?.('hp-billing')}
      />
      <View style={styles.metricsGrid}>
        {metrics.map((m, i) => (
          <View key={i} style={styles.metricCard}>
            <View style={styles.metricTop}>
              <View style={[styles.metricIcon, { backgroundColor: m.color + '14' }]}>
                <Ionicons name={m.icon} size={isMobile ? 18 : 22} color={m.color} />
              </View>
              <View style={[styles.changeBadge, { backgroundColor: m.changeType === 'up' ? colors.successLight : colors.errorLight }]}>
                <Ionicons name={m.changeType === 'up' ? 'arrow-up' : 'arrow-down'} size={10} color={m.changeType === 'up' ? colors.successDark : colors.errorDark} />
                <Text style={isMobile ? styles.changeBadgeTextMobile : styles.changeBadgeText}>{m.change}</Text>
              </View>
            </View>
            <Text style={[styles.metricValue, isMobile && styles.metricValueMobile]}>{m.value}</Text>
            <Text style={[styles.metricLabel, isMobile && styles.metricLabelMobile]}>{m.title}</Text>
          </View>
        ))}
      </View>

      {/* ══════ SECTION: Patients & Rendez-vous ══════ */}
      <SectionHeader
        title="Patients & Rendez-vous"
        subtitle="Admissions récentes et agenda du jour"
        icon="people"
        accentColor={colors.secondary}
        ctaLabel={!isMobile ? 'Ajouter Patient' : undefined}
        ctaIcon="person-add-outline"
        onCtaPress={() => onNavigate?.('hp-patients')}
      />
      <View style={styles.row}>
        {/* Recent Patients */}
        <View style={[styles.card, isDesktop && { flex: 3 }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Patients Récents</Text>
            <TouchableOpacity style={styles.viewAllBtn} onPress={() => onNavigate?.('hp-patients')}>
              <Text style={styles.viewAllText}>Tout Voir</Text>
              <Ionicons name="chevron-forward" size={12} color={colors.info} />
            </TouchableOpacity>
          </View>
          {recentEncounters.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="person-outline" size={40} color={colors.outline} />
              <Text style={styles.emptyStateText}>Aucun patient aujourd'hui</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              scrollEnabled={isMobile}
              contentContainerStyle={styles.tableScrollContent}
            >
              <View style={{ width: isDesktop ? '100%' : 540, minWidth: '100%' }}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { flex: 0.8 }]}>ID</Text>
                  <Text style={[styles.th, { flex: 1.5 }]}>Patient</Text>
                  {!isMobile && <Text style={[styles.th, { flex: 0.5 }]}>Âge</Text>}
                  <Text style={[styles.th, { flex: 1 }]}>Type</Text>
                  <Text style={[styles.th, { flex: 1 }]}>Statut</Text>
                </View>
                {recentEncounters.map((encounter, idx) => (
                  <View key={idx} style={[styles.tableRow, idx % 2 === 0 && styles.tableRowAlt]}>
                    <Text style={[styles.td, { flex: 0.8, color: colors.info, fontWeight: '600', fontSize: isMobile ? 11 : 13 }]}>
                      {encounter.encounter_number.substring(0, 8)}
                    </Text>
                    <Text style={[styles.td, { flex: 1.5, fontWeight: '600', fontSize: isMobile ? 11 : 13 }]}>
                      {encounter.patient?.first_name} {encounter.patient?.last_name}
                    </Text>
                    {!isMobile && (
                      <Text style={[styles.td, { flex: 0.5, fontSize: 13 }]}>
                        {calculateAge(encounter.patient?.date_of_birth)}
                      </Text>
                    )}
                    <Text style={[styles.td, { flex: 1, fontSize: isMobile ? 11 : 13 }]}>
                      {encounter.encounter_type || 'Consultation'}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <StatusBadge status={getEncounterStatus(encounter.status)} isMobile={isMobile} />
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Today's Appointments */}
        <View style={[styles.card, isDesktop && { flex: 2 }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Rendez-vous du Jour</Text>
            <View style={[styles.countBadge, { backgroundColor: colors.infoLight }]}>
              <Ionicons name="calendar" size={12} color={colors.info} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.infoDark }}>{todayAppointments.length}</Text>
            </View>
          </View>
          {todayAppointments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={40} color={colors.outline} />
              <Text style={styles.emptyStateText}>Aucun rendez-vous</Text>
            </View>
          ) : (
            todayAppointments.map((apt, idx) => (
              <View key={idx} style={[styles.aptRow, idx === todayAppointments.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={[styles.aptTime, { backgroundColor: colors.infoLight }]}>
                  <Text style={[styles.aptTimeText, { color: colors.infoDark, fontSize: isMobile ? 10 : 12 }]}>
                    {new Date(apt.appointment_datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={styles.aptInfo}>
                  <Text style={[styles.aptPatient, isMobile && { fontSize: 12 }]}>
                    {apt.patient?.first_name} {apt.patient?.last_name}
                  </Text>
                  <Text style={[styles.aptDoctor, isMobile && { fontSize: 11 }]}>
                    {apt.assigned_staff ? `Dr. ${apt.assigned_staff.first_name}` : 'Non assigné'} · {apt.appointment_reason || 'Consultation'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { 
    padding: isMobile ? 12 : (isTablet ? 16 : 28), 
    paddingBottom: 40,
    maxWidth: isDesktop ? 1400 : undefined,
    marginHorizontal: 'auto' as any,
  },

  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.textSecondary, textAlign: 'center' },

  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.errorLight, borderLeftWidth: 4, borderLeftColor: colors.error, padding: 12, borderRadius: borderRadius.lg, marginBottom: 16, gap: 10 },
  errorText: { flex: 1, fontSize: 13, color: colors.errorDark, fontWeight: '500' },

  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 24, 
    flexWrap: 'wrap', 
    gap: isMobile ? 8 : 12 
  },
  headerMobile: { marginBottom: 16 },
  headerTitle: { fontSize: isMobile ? 18 : 22, fontWeight: '700', color: colors.text },
  headerSubtitle: { fontSize: isMobile ? 12 : 13, color: colors.textSecondary, marginTop: 2 },
  addBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.info, 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: borderRadius.lg, 
    gap: 8, 
    ...shadows.sm 
  },
  addBtnSmall: { 
    width: 40, 
    height: 40, 
    borderRadius: borderRadius.lg, 
    backgroundColor: colors.info, 
    justifyContent: 'center', 
    alignItems: 'center', 
    ...shadows.sm 
  },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  metricsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: isMobile ? 8 : 16, 
    marginBottom: 24,
    justifyContent: isMobile ? 'space-between' : 'flex-start',
  },
  metricCard: { 
    flex: isDesktop ? 1 : undefined, 
    width: isMobile ? 'calc(50% - 4px)' : (isTablet ? 'calc(33.333% - 11px)' : undefined),
    backgroundColor: colors.surface, 
    borderRadius: borderRadius.xl, 
    padding: isMobile ? 12 : 18, 
    minWidth: isMobile ? 140 : (isDesktop ? 220 : 150), 
    ...shadows.sm 
  },
  metricTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  metricIcon: { width: isMobile ? 36 : 44, height: isMobile ? 36 : 44, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  changeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.full, gap: 2 },
  changeBadgeText: { fontSize: 11, fontWeight: '600' },
  changeBadgeTextMobile: { fontSize: 9, fontWeight: '600' },
  metricValue: { fontSize: isMobile ? 18 : 22, fontWeight: '700', color: colors.text, marginBottom: 4 },
  metricValueMobile: { fontSize: 16 },
  metricLabel: { fontSize: isMobile ? 11 : 12, color: colors.textSecondary, fontWeight: '500' },
  metricLabelMobile: { fontSize: 10 },

  row: { flexDirection: isDesktop ? 'row' : 'column', gap: 16 },
  card: { 
    backgroundColor: colors.surface, 
    borderRadius: borderRadius.xl, 
    padding: isMobile ? 12 : 20, 
    borderWidth: 1, 
    borderColor: colors.outline, 
    ...shadows.sm,
    minHeight: isMobile ? 200 : 300,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? 12 : 16 },
  cardTitle: { fontSize: isMobile ? 14 : 16, fontWeight: '700', color: colors.text },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewAllText: { fontSize: isMobile ? 11 : 13, color: colors.info, fontWeight: '600' },

  tableHeader: { 
    flexDirection: 'row', 
    paddingVertical: isMobile ? 8 : 10, 
    paddingHorizontal: 12, 
    backgroundColor: colors.info + '08', 
    borderRadius: borderRadius.md, 
    marginBottom: 4, 
    borderWidth: 1, 
    borderColor: colors.info + '20' 
  },
  th: { fontSize: isMobile ? 9 : 11, fontWeight: '700', color: colors.info, textTransform: 'uppercase', letterSpacing: 0.3 },
  tableRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: isMobile ? 8 : 12, 
    paddingHorizontal: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.outline,
    minHeight: isMobile ? 40 : 50,
  },
  tableRowAlt: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.sm },
  td: { fontSize: 13, color: colors.text },
  tableScrollContent: { paddingBottom: 4 },

  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: borderRadius.full },
  statusBadgeMobile: { paddingHorizontal: 8, paddingVertical: 2 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  statusBadgeTextMobile: { fontSize: 9, fontWeight: '700' },

  countBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: isMobile ? 8 : 10, paddingVertical: isMobile ? 3 : 4, borderRadius: borderRadius.full, gap: 4 },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 12 },
  emptyStateText: { fontSize: 14, color: colors.textSecondary, fontWeight: '500', textAlign: 'center' },

  aptRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: isMobile ? 10 : 12, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.outline, 
    gap: 10,
    minHeight: isMobile ? 50 : 60,
  },
  aptTime: { paddingHorizontal: 10, paddingVertical: isMobile ? 5 : 6, borderRadius: borderRadius.md, minWidth: isMobile ? 45 : 55 },
  aptTimeText: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  aptInfo: { flex: 1 },
  aptPatient: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 },
  aptDoctor: { fontSize: 12, color: colors.textTertiary },
});
