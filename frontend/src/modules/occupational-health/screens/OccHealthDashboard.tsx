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
import { SECTOR_PROFILES, OccHealthUtils } from '../../../models/OccupationalHealth';
import type { IndustrySector, SectorRiskLevel } from '../../../models/OccupationalHealth';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

const ACCENT = '#D97706';

interface MetricCard {
  title: string;
  value: string;
  change: string;
  changeType: 'up' | 'down';
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

// ─── Sample Data (sector-agnostic) ───────────────────────────
const metrics: MetricCard[] = [
  { title: 'Travailleurs Actifs', value: '1.247', change: '+23', changeType: 'up', icon: 'people', color: '#3B82F6' },
  { title: 'Visites Aujourd\'hui', value: '18', change: '+4', changeType: 'up', icon: 'medkit', color: ACCENT },
  { title: 'Taux Aptitude', value: '94.2%', change: '+1.3%', changeType: 'up', icon: 'shield-checkmark', color: '#22C55E' },
  { title: 'Incidents (Mois)', value: '3', change: '-2', changeType: 'up', icon: 'warning', color: '#EF4444' },
];

const fitnessOverview = [
  { label: 'Apte', count: 1174, color: '#22C55E', percent: 94.2 },
  { label: 'Apte avec Restrictions', count: 38, color: '#F59E0B', percent: 3.0 },
  { label: 'Inapte Temporaire', count: 21, color: '#EF4444', percent: 1.7 },
  { label: 'En Attente', count: 14, color: '#6366F1', percent: 1.1 },
];

const recentExams = [
  { id: 'EX-0342', worker: 'Kabamba Mutombo', type: 'Periodique', result: 'Apte', time: '14:30', dept: 'Operations' },
  { id: 'EX-0341', worker: 'Tshisekedi Ilunga', type: 'Post-Accident', result: 'Avec Restrictions', time: '13:45', dept: 'Technique' },
  { id: 'EX-0340', worker: 'Mukendi Kasongo', type: 'Embauche', result: 'Apte', time: '11:20', dept: 'Maintenance' },
  { id: 'EX-0339', worker: 'Mwamba Kalala', type: 'Reprise', result: 'Inapte Temp.', time: '10:00', dept: 'Logistique' },
  { id: 'EX-0338', worker: 'Lukusa Nzuzi', type: 'Periodique', result: 'Apte', time: '09:15', dept: 'Administration' },
];

const recentIncidents = [
  { id: 'INC-087', type: 'Premiers Secours', site: 'Site Principal', severity: 'Mineur', date: '10/02/2026', status: 'Ferme' },
  { id: 'INC-086', type: 'Presque-Accident', site: 'Batiment B', severity: 'Modere', date: '08/02/2026', status: 'Investigation' },
  { id: 'INC-085', type: 'Accident avec Arret', site: 'Zone Nord', severity: 'Majeur', date: '05/02/2026', status: 'En Cours' },
];

const expiringCertificates = [
  { worker: 'Pongo Tshimanga', expires: '15/02/2026', dept: 'Operations', daysLeft: 4 },
  { worker: 'Nkulu Mwamba', expires: '18/02/2026', dept: 'Technique', daysLeft: 7 },
  { worker: 'Kasai Mulumba', expires: '22/02/2026', dept: 'Maintenance', daysLeft: 11 },
  { worker: 'Lubala Kapend', expires: '28/02/2026', dept: 'Logistique', daysLeft: 17 },
];

const safetyKPIs = [
  { label: 'LTIFR', value: '1.42', target: '< 2.0', status: 'good' },
  { label: 'TRIFR', value: '4.85', target: '< 5.0', status: 'warning' },
  { label: 'Jours Sans Incident', value: '23', target: '> 30', status: 'warning' },
  { label: 'Conformite SST', value: '97%', target: '> 95%', status: 'good' },
];

const activeSectors: { sector: IndustrySector; enterprises: number; workers: number }[] = [
  { sector: 'mining', enterprises: 3, workers: 420 },
  { sector: 'construction', enterprises: 5, workers: 312 },
  { sector: 'banking_finance', enterprises: 4, workers: 285 },
  { sector: 'manufacturing', enterprises: 2, workers: 130 },
  { sector: 'healthcare', enterprises: 1, workers: 100 },
];

// ─── Helper Components ───────────────────────────────────────

function ResultBadge({ result }: { result: string }) {
  const getStyle = () => {
    switch (result) {
      case 'Apte': return { bg: 'rgba(34,197,94,0.12)', text: '#16A34A' };
      case 'Avec Restrictions': return { bg: 'rgba(245,158,11,0.12)', text: '#D97706' };
      case 'Inapte Temp.': return { bg: 'rgba(239,68,68,0.12)', text: '#DC2626' };
      default: return { bg: colors.outlineVariant, text: colors.textSecondary };
    }
  };
  const s = getStyle();
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.text }]}>{result}</Text>
    </View>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const getStyle = () => {
    switch (severity) {
      case 'Majeur': return { bg: 'rgba(239,68,68,0.12)', text: '#DC2626' };
      case 'Modere': return { bg: 'rgba(245,158,11,0.12)', text: '#D97706' };
      case 'Mineur': return { bg: 'rgba(59,130,246,0.12)', text: '#2563EB' };
      default: return { bg: colors.outlineVariant, text: colors.textSecondary };
    }
  };
  const s = getStyle();
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.text }]}>{severity}</Text>
    </View>
  );
}

function RiskLevelBadge({ level }: { level: SectorRiskLevel }) {
  const color = OccHealthUtils.getSectorRiskColor(level);
  const label = OccHealthUtils.getSectorRiskLabel(level);
  return (
    <View style={[styles.badge, { backgroundColor: color + '18' }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function SectionHeader({
  title, subtitle, icon, accentColor = ACCENT, ctaLabel, ctaIcon, onCtaPress,
}: {
  title: string; subtitle?: string; icon: keyof typeof Ionicons.glyphMap;
  accentColor?: string; ctaLabel?: string; ctaIcon?: keyof typeof Ionicons.glyphMap; onCtaPress?: () => void;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
        <View style={{ width: 40, height: 3, borderRadius: 2, backgroundColor: accentColor }} />
        <View style={{ flex: 1, height: 1, backgroundColor: colors.outline, marginLeft: 8 }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: accentColor + '14' }}>
            <Ionicons name={icon} size={18} color={accentColor} />
          </View>
          <View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{title}</Text>
            {subtitle && <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>{subtitle}</Text>}
          </View>
        </View>
        {ctaLabel && (
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: borderRadius.lg, backgroundColor: accentColor, ...shadows.sm }}
            onPress={onCtaPress} activeOpacity={0.7}
          >
            {ctaIcon && <Ionicons name={ctaIcon} size={15} color="#FFF" />}
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFF' }}>{ctaLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────────
interface OccHealthDashboardProps {
  onNavigate?: (screenId: string) => void;
}

export function OccHealthDashboardContent({ onNavigate }: OccHealthDashboardProps = {}) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Medecine du Travail</Text>
          <Text style={styles.headerSubtitle}>Sante & Securite au Travail - ISO 45001 - ILO C155/C161</Text>
        </View>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: ACCENT }]} activeOpacity={0.7} onPress={() => onNavigate?.('oh-exams')}>
          <Ionicons name="add-circle" size={20} color="#FFF" />
          <Text style={styles.addBtnText}>Nouvelle Visite</Text>
        </TouchableOpacity>
      </View>

      {/* ══════ QUICK ACTIONS ══════ */}
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity 
          style={[styles.quickActionCard, { borderLeftColor: '#3B82F6' }]} 
          activeOpacity={0.7}
          onPress={() => onNavigate?.('patients')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
            <Ionicons name="people-outline" size={24} color="#3B82F6" />
          </View>
          <Text style={styles.quickActionTitle}>Gestion Patients</Text>
          <Text style={styles.quickActionDesc}>Enregistrer et gérer les patients</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.quickActionCard, { borderLeftColor: ACCENT }]} 
          activeOpacity={0.7}
          onPress={() => onNavigate?.('intake')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: `${ACCENT}14` }]}>
            <Ionicons name="person-add-outline" size={24} color={ACCENT} />
          </View>
          <Text style={styles.quickActionTitle}>Accueil Patient</Text>
          <Text style={styles.quickActionDesc}>Accueil et signes vitaux</Text>
        </TouchableOpacity>
      </View>

      {/* ══════ SECTION: Sectors Overview ══════ */}
      <SectionHeader
        title="Secteurs Actifs"
        subtitle="Entreprises couvertes par secteur d'activite"
        icon="business"
        accentColor="#6366F1"
        ctaLabel="Ajouter Entreprise"
        ctaIcon="add-circle-outline"
        onCtaPress={() => onNavigate?.('oh-patients')}
      />
      <View style={styles.sectorsGrid}>
        {activeSectors.map((s, i) => {
          const profile = SECTOR_PROFILES[s.sector];
          return (
            <TouchableOpacity key={i} style={styles.sectorCard} activeOpacity={0.7}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <View style={{ width: 36, height: 36, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: profile.color + '14' }}>
                  <Ionicons name={profile.icon as any} size={18} color={profile.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{profile.label}</Text>
                  <RiskLevelBadge level={profile.riskLevel} />
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>{s.enterprises} entreprises</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: profile.color }}>{s.workers} travailleurs</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ══════ SECTION: KPIs ══════ */}
      <SectionHeader
        title="Indicateurs Cles"
        subtitle="Apercu global - tous secteurs confondus"
        icon="pulse"
        accentColor={ACCENT}
        ctaLabel="Exporter"
        ctaIcon="download-outline"
        onCtaPress={() => onNavigate?.('oh-reports')}
      />
      <View style={styles.metricsGrid}>
        {metrics.map((m, i) => (
          <View key={i} style={styles.metricCard}>
            <View style={styles.metricTop}>
              <View style={[styles.metricIcon, { backgroundColor: m.color + '14' }]}>
                <Ionicons name={m.icon} size={22} color={m.color} />
              </View>
              <View style={[styles.changeBadge, { backgroundColor: m.changeType === 'up' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)' }]}>
                <Ionicons name={m.changeType === 'up' ? 'arrow-up' : 'arrow-down'} size={12} color={m.changeType === 'up' ? '#16A34A' : '#DC2626'} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: m.changeType === 'up' ? '#16A34A' : '#DC2626' }}>{m.change}</Text>
              </View>
            </View>
            <Text style={styles.metricValue}>{m.value}</Text>
            <Text style={styles.metricLabel}>{m.title}</Text>
          </View>
        ))}
      </View>

      {/* ══════ SECTION: Fitness + Safety KPIs ══════ */}
      <SectionHeader
        title="Aptitude & Securite"
        subtitle="Statut des travailleurs et indicateurs SST (ISO 45001)"
        icon="shield-checkmark"
        accentColor="#22C55E"
      />
      <View style={styles.row}>
        <View style={[styles.card, isDesktop && { flex: 1 }]}>
          <Text style={styles.cardTitle}>Repartition Aptitude</Text>
          <View style={{ marginTop: 12 }}>
            {fitnessOverview.map((f, i) => (
              <View key={i} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500' }}>{f.label}</Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>{f.count} ({f.percent}%)</Text>
                </View>
                <View style={{ height: 8, backgroundColor: colors.outlineVariant, borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{ height: 8, width: `${f.percent}%`, backgroundColor: f.color, borderRadius: 4 }} />
                </View>
              </View>
            ))}
          </View>
        </View>
        <View style={[styles.card, isDesktop && { flex: 1 }]}>
          <Text style={styles.cardTitle}>Indicateurs SST (ISO 45001)</Text>
          <View style={{ marginTop: 8 }}>
            {safetyKPIs.map((kpi, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: i < safetyKPIs.length - 1 ? 1 : 0, borderBottomColor: colors.outline }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: kpi.status === 'good' ? '#22C55E' : '#F59E0B', marginRight: 10 }} />
                <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: colors.text }}>{kpi.label}</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginRight: 8 }}>{kpi.value}</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>Cible: {kpi.target}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ══════ SECTION: Recent Examinations ══════ */}
      <SectionHeader
        title="Visites Medicales Recentes"
        subtitle="Dernieres consultations - tous secteurs"
        icon="medkit"
        accentColor={ACCENT}
        ctaLabel="Planifier Visite"
        ctaIcon="add-circle-outline"
        onCtaPress={() => onNavigate?.('oh-exams')}
      />
      <View style={styles.card}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { flex: 0.8 }]}>No</Text>
          <Text style={[styles.th, { flex: 1.5 }]}>Travailleur</Text>
          <Text style={[styles.th, { flex: 1 }]}>Departement</Text>
          <Text style={[styles.th, { flex: 1 }]}>Type</Text>
          <Text style={[styles.th, { flex: 1 }]}>Resultat</Text>
          <Text style={[styles.th, { flex: 0.6 }]}>Heure</Text>
        </View>
        {recentExams.map((exam, i) => (
          <TouchableOpacity key={i} style={[styles.tableRow, i % 2 === 0 && { backgroundColor: colors.background + '80' }]} activeOpacity={0.7}>
            <Text style={[styles.td, { flex: 0.8 }, { color: ACCENT, fontWeight: '600' }]}>{exam.id}</Text>
            <Text style={[styles.td, { flex: 1.5, fontWeight: '500' }]}>{exam.worker}</Text>
            <Text style={[styles.td, { flex: 1 }]}>{exam.dept}</Text>
            <Text style={[styles.td, { flex: 1 }]}>{exam.type}</Text>
            <View style={{ flex: 1, paddingVertical: 10 }}>
              <ResultBadge result={exam.result} />
            </View>
            <Text style={[styles.td, { flex: 0.6, color: colors.textSecondary }]}>{exam.time}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ══════ SECTION: Incidents & Expiring Certificates ══════ */}
      <SectionHeader
        title="Alertes & Incidents"
        subtitle="Incidents recents et certificats a renouveler"
        icon="warning"
        accentColor="#EF4444"
      />
      <View style={styles.row}>
        <View style={[styles.card, isDesktop && { flex: 1 }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Incidents Recents</Text>
            <TouchableOpacity style={styles.viewAllBtn} onPress={() => onNavigate?.('oh-incidents')}>
              <Text style={styles.viewAllText}>Tout Voir</Text>
              <Ionicons name="chevron-forward" size={14} color={ACCENT} />
            </TouchableOpacity>
          </View>
          {recentIncidents.map((inc, i) => (
            <TouchableOpacity key={i} style={{ paddingVertical: 10, borderBottomWidth: i < recentIncidents.length - 1 ? 1 : 0, borderBottomColor: colors.outline }} activeOpacity={0.7}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: ACCENT }}>{inc.id}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text }}>{inc.type}</Text>
                </View>
                <SeverityBadge severity={inc.severity} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>{inc.site}</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>{inc.date}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <View style={[styles.card, isDesktop && { flex: 1 }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Certificats a Renouveler</Text>
            <View style={[styles.badge, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
              <Text style={[styles.badgeText, { color: '#DC2626' }]}>{expiringCertificates.length}</Text>
            </View>
          </View>
          {expiringCertificates.map((cert, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: i < expiringCertificates.length - 1 ? 1 : 0, borderBottomColor: colors.outline }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: cert.daysLeft <= 7 ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                <Ionicons name="time" size={18} color={cert.daysLeft <= 7 ? '#EF4444' : '#F59E0B'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text }}>{cert.worker}</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>{cert.dept} - Expire: {cert.expires}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: cert.daysLeft <= 7 ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)' }]}>
                <Text style={[styles.badgeText, { color: cert.daysLeft <= 7 ? '#DC2626' : '#D97706' }]}>{cert.daysLeft}j</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* ══════ SECTION: Regulatory Standards ══════ */}
      <SectionHeader
        title="Cadre Reglementaire"
        subtitle="Standards internationaux & conformite"
        icon="shield"
        accentColor="#6366F1"
      />
      <View style={styles.row}>
        <View style={[styles.card, isDesktop && { flex: 1 }]}>
          <Text style={styles.cardTitle}>Normes Appliquees</Text>
          {[
            { code: 'ISO 45001:2018', desc: 'Systemes de management de la SST', color: '#2563EB' },
            { code: 'ILO C155', desc: 'Securite et sante des travailleurs', color: '#16A34A' },
            { code: 'ILO C161', desc: 'Services de sante au travail', color: '#D97706' },
            { code: 'ILO R194', desc: 'Liste des maladies professionnelles', color: '#7C3AED' },
            { code: 'Code du Travail RDC', desc: 'Reglementation nationale du travail', color: '#DC2626' },
          ].map((std, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: i < 4 ? 1 : 0, borderBottomColor: colors.outline }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: std.color, marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{std.code}</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>{std.desc}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={[styles.card, isDesktop && { flex: 1 }]}>
          <Text style={styles.cardTitle}>Conformite par Secteur</Text>
          {activeSectors.slice(0, 4).map((s, i) => {
            const profile = SECTOR_PROFILES[s.sector];
            const compliance = [97, 92, 99, 88][i];
            return (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: i < 3 ? 1 : 0, borderBottomColor: colors.outline }}>
                <Ionicons name={profile.icon as any} size={16} color={profile.color} style={{ marginRight: 8 }} />
                <Text style={{ flex: 1, fontSize: 13, fontWeight: '500', color: colors.text }}>{profile.label}</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: OccHealthUtils.getComplianceColor(compliance), marginRight: 4 }}>{compliance}%</Text>
                <View style={{ width: 60, height: 6, backgroundColor: colors.outlineVariant, borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ height: 6, width: `${compliance}%`, backgroundColor: OccHealthUtils.getComplianceColor(compliance), borderRadius: 3 }} />
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: isDesktop ? 28 : 16, paddingBottom: 40 },
  header: {
    flexDirection: isDesktop ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: isDesktop ? 'center' : 'flex-start',
    marginBottom: 24, gap: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: borderRadius.lg, ...shadows.sm,
  },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  quickActionsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 14, 
    marginBottom: 24 
  },
  quickActionCard: {
    flex: 1,
    minWidth: isDesktop ? 220 : 140,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: colors.outline,
    ...shadows.sm,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  quickActionDesc: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  sectorsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  sectorCard: {
    minWidth: isDesktop ? 200 : 160, flex: 1,
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: 14, borderWidth: 1, borderColor: colors.outline, ...shadows.sm,
  },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 24 },
  metricCard: {
    flex: 1, minWidth: isDesktop ? 200 : 150,
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: 18, borderWidth: 1, borderColor: colors.outline, ...shadows.sm,
  },
  metricTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  metricIcon: { width: 40, height: 40, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  changeBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  metricValue: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  metricLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2, fontWeight: '500' },
  row: { flexDirection: isDesktop ? 'row' : 'column', gap: 14, marginBottom: 24 },
  card: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: 18, borderWidth: 1, borderColor: colors.outline,
    marginBottom: isDesktop ? 0 : 14, ...shadows.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewAllText: { fontSize: 12, fontWeight: '600', color: ACCENT },
  tableHeader: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: colors.outline, marginBottom: 2 },
  th: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.outline + '60' },
  td: { fontSize: 13, color: colors.text, paddingVertical: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '600' },
});
