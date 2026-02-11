import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows } from '../../../theme/theme';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

// ─── Types ───────────────────────────────────────────────────
interface MetricCard {
  title: string;
  value: string;
  change: string;
  changeType: 'up' | 'down';
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

// ─── Sample Data ─────────────────────────────────────────────
const metrics: MetricCard[] = [
  { title: 'Patients Aujourd\'hui', value: '62', change: '+15.2%', changeType: 'up', icon: 'people', color: colors.info },
  { title: 'Rendez-vous', value: '28', change: '+5.8%', changeType: 'up', icon: 'calendar', color: colors.secondary },
  { title: 'Lits Occupés', value: '84%', change: '+3.2%', changeType: 'up', icon: 'bed', color: colors.warning },
  { title: 'Urgences', value: '5', change: '-2', changeType: 'up', icon: 'pulse', color: colors.error },
];

const recentPatients = [
  { id: 'P-1042', name: 'Marie Kabamba', age: 34, service: 'Consultation', status: 'En Cours', time: '14:30' },
  { id: 'P-1041', name: 'Jean Mukendi', age: 45, service: 'Urgence', status: 'Urgent', time: '14:15' },
  { id: 'P-1040', name: 'Pierre Kasongo', age: 28, service: 'Laboratoire', status: 'En Attente', time: '13:50' },
  { id: 'P-1039', name: 'Sophie Mwamba', age: 52, service: 'Radiologie', status: 'Terminé', time: '13:20' },
  { id: 'P-1038', name: 'David Mutombo', age: 67, service: 'Cardiologie', status: 'Hospitalisé', time: '12:45' },
];

const todayAppointments = [
  { time: '08:00', patient: 'Amina Lukusa', doctor: 'Dr. Kalala', type: 'Consultation' },
  { time: '09:30', patient: 'Bruno Tshimanga', doctor: 'Dr. Mbala', type: 'Suivi' },
  { time: '10:00', patient: 'Claire Nzuzi', doctor: 'Dr. Kalala', type: 'Examen' },
  { time: '11:30', patient: 'Didier Kasa', doctor: 'Dr. Mukoko', type: 'Urgence' },
  { time: '14:00', patient: 'Elise Pongo', doctor: 'Dr. Mbala', type: 'Consultation' },
];

function StatusBadge({ status }: { status: string }) {
  const getStyle = () => {
    switch (status) {
      case 'En Cours': return { bg: colors.infoLight, text: colors.infoDark };
      case 'Urgent': return { bg: colors.errorLight, text: colors.errorDark };
      case 'En Attente': return { bg: colors.warningLight, text: colors.warningDark };
      case 'Terminé': return { bg: colors.successLight, text: colors.successDark };
      case 'Hospitalisé': return { bg: 'rgba(99,102,241,0.1)', text: colors.secondaryDark };
      default: return { bg: colors.outlineVariant, text: colors.textSecondary };
    }
  };
  const s = getStyle();
  return (
    <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
      <Text style={[styles.statusBadgeText, { color: s.text }]}>{status}</Text>
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
export function HospitalDashboardContent() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Tableau de Bord Hôpital</Text>
          <Text style={styles.headerSubtitle}>Vue d'ensemble de l'activité hospitalière</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.7}>
          <Ionicons name="person-add" size={20} color="#FFF" />
          <Text style={styles.addBtnText}>Nouveau Patient</Text>
        </TouchableOpacity>
      </View>

      {/* ══════ SECTION: Indicateurs Hôpital ══════ */}
      <SectionHeader
        title="Indicateurs Hôpital"
        subtitle="Activité en temps réel"
        icon="pulse"
        accentColor={colors.info}
        ctaLabel="Exporter"
        ctaIcon="download-outline"
      />
      <View style={styles.metricsGrid}>
        {metrics.map((m, i) => (
          <View key={i} style={styles.metricCard}>
            <View style={styles.metricTop}>
              <View style={[styles.metricIcon, { backgroundColor: m.color + '14' }]}>
                <Ionicons name={m.icon} size={22} color={m.color} />
              </View>
              <View style={[styles.changeBadge, { backgroundColor: m.changeType === 'up' ? colors.successLight : colors.errorLight }]}>
                <Ionicons name={m.changeType === 'up' ? 'arrow-up' : 'arrow-down'} size={12} color={m.changeType === 'up' ? colors.successDark : colors.errorDark} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: m.changeType === 'up' ? colors.successDark : colors.errorDark }}>{m.change}</Text>
              </View>
            </View>
            <Text style={styles.metricValue}>{m.value}</Text>
            <Text style={styles.metricLabel}>{m.title}</Text>
          </View>
        ))}
      </View>

      {/* ══════ SECTION: Patients & Rendez-vous ══════ */}
      <SectionHeader
        title="Patients & Rendez-vous"
        subtitle="Admissions récentes et agenda du jour"
        icon="people"
        accentColor={colors.secondary}
        ctaLabel="Ajouter Patient"
        ctaIcon="person-add-outline"
      />
      <View style={styles.row}>
        {/* Recent Patients */}
        <View style={[styles.card, isDesktop && { flex: 3 }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Patients Récents</Text>
            <TouchableOpacity style={styles.viewAllBtn}>
              <Text style={styles.viewAllText}>Tout Voir</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.info} />
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tableScrollContent}
          >
            <View style={{ width: isDesktop ? '100%' : 540 }}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { flex: 0.8 }]}>ID</Text>
                <Text style={[styles.th, { flex: 1.5 }]}>Patient</Text>
                <Text style={[styles.th, { flex: 0.5 }]}>Âge</Text>
                <Text style={[styles.th, { flex: 1 }]}>Service</Text>
                <Text style={[styles.th, { flex: 1 }]}>Statut</Text>
              </View>
              {recentPatients.map((p, idx) => (
                <View key={idx} style={[styles.tableRow, idx % 2 === 0 && styles.tableRowAlt]}>
                  <Text style={[styles.td, { flex: 0.8, color: colors.info, fontWeight: '600' }]}>{p.id}</Text>
                  <Text style={[styles.td, { flex: 1.5, fontWeight: '600' }]}>{p.name}</Text>
                  <Text style={[styles.td, { flex: 0.5 }]}>{p.age}</Text>
                  <Text style={[styles.td, { flex: 1 }]}>{p.service}</Text>
                  <View style={{ flex: 1 }}>
                    <StatusBadge status={p.status} />
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Today's Appointments */}
        <View style={[styles.card, isDesktop && { flex: 2 }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Rendez-vous du Jour</Text>
            <View style={[styles.countBadge, { backgroundColor: colors.infoLight }]}>
              <Ionicons name="calendar" size={14} color={colors.info} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.infoDark }}>{todayAppointments.length}</Text>
            </View>
          </View>
          {todayAppointments.map((apt, idx) => (
            <View key={idx} style={[styles.aptRow, idx === todayAppointments.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[styles.aptTime, { backgroundColor: colors.infoLight }]}>
                <Text style={[styles.aptTimeText, { color: colors.infoDark }]}>{apt.time}</Text>
              </View>
              <View style={styles.aptInfo}>
                <Text style={styles.aptPatient}>{apt.patient}</Text>
                <Text style={styles.aptDoctor}>{apt.doctor} · {apt.type}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: isDesktop ? 28 : 16, paddingBottom: 40 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  headerSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.info, paddingHorizontal: 16, paddingVertical: 10, borderRadius: borderRadius.lg, gap: 8, ...shadows.sm },
  addBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 },
  metricCard: { flex: isDesktop ? 1 : undefined, width: isDesktop ? undefined : '47%' as any, backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 18, minWidth: isDesktop ? 220 : 150, ...shadows.sm },
  metricTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  metricIcon: { width: 44, height: 44, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  changeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full, gap: 2 },
  metricValue: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 4 },
  metricLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },

  row: { flexDirection: isDesktop ? 'row' : 'column', gap: 16 },
  card: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: 20, borderWidth: 1, borderColor: colors.outline, ...shadows.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewAllText: { fontSize: 13, color: colors.info, fontWeight: '600' },

  tableHeader: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: colors.info + '08', borderRadius: borderRadius.md, marginBottom: 4, borderWidth: 1, borderColor: colors.info + '20' },
  th: { fontSize: 11, fontWeight: '700', color: colors.info, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.outline },
  tableRowAlt: { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.sm },
  td: { fontSize: 13, color: colors.text },
  tableScrollContent: { paddingBottom: 4 },

  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: borderRadius.full },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },

  countBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.full, gap: 4 },

  aptRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.outline, gap: 12 },
  aptTime: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: borderRadius.md },
  aptTimeText: { fontSize: 12, fontWeight: '700' },
  aptInfo: { flex: 1 },
  aptPatient: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 },
  aptDoctor: { fontSize: 12, color: colors.textTertiary },
});
