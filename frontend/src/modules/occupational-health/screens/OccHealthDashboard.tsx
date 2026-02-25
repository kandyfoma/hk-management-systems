import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, borderRadius, shadows } from '../../../theme/theme';
import { SECTOR_PROFILES, OccHealthUtils } from '../../../models/OccupationalHealth';
import type { IndustrySector, SectorRiskLevel } from '../../../models/OccupationalHealth';
import axios from 'axios';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

const ACCENT = colors.primary;

interface MetricCard {
  title: string;
  value: string;
  change: string;
  changeType: 'up' | 'down';
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

interface DashboardData {
  metrics: MetricCard[];
  fitness_overview: Array<{
    label: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  recent_exams: Array<{
    id: string;
    worker: string;
    type: string;
    result: string;
    time: string;
    dept: string;
  }>;
  recent_incidents: Array<{
    id: string;
    type: string;
    site: string;
    severity: string;
    date: string;
    status: string;
  }>;
  expiring_certificates: Array<{
    worker: string;
    expires: string;
    dept: string;
    daysLeft: number;
  }>;
  sectors: Array<{
    sector: string;
    name: string;
    enterprises: number;
    workers: number;
    color: string;
    icon: string;
  }>;
  safety_kpis: Array<{
    label: string;
    value: string;
    target: string;
    status: string;
  }>;
}

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
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string>('');

  // Fetch dashboard data from API
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get the API base URL from environment or use default
        const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
        
        // Get auth token and organization from AsyncStorage
        const token = await AsyncStorage.getItem('auth_token');
        const orgData = await AsyncStorage.getItem('current_organization');
        
        // Extract organization name if available
        if (orgData) {
          try {
            const org = JSON.parse(orgData);
            setOrganizationName(org.name || '');
          } catch (e) {
            console.warn('Failed to parse organization data');
          }
        }
        
        const response = await axios.get(
          `${baseURL}/api/v1/occupational-health/dashboard/stats/`,
          {
            headers: {
              Authorization: `Token ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (response.data) {
          setDashboardData(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Could not load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Fallback data in case API is not available (for development)
  const getFallbackData = (): DashboardData => ({
    metrics: [
      { title: 'Travailleurs Actifs', value: '—', change: '+0', changeType: 'up', icon: 'people', color: colors.primary },
      { title: "Visites Aujourd'hui", value: '—', change: '+0', changeType: 'up', icon: 'medkit', color: colors.secondary },
      { title: 'Taux Aptitude', value: '—', change: '+0', changeType: 'up', icon: 'shield-checkmark', color: '#22C55E' },
      { title: 'Incidents (Mois)', value: '—', change: '+0', changeType: 'up', icon: 'warning', color: colors.error },
    ],
    fitness_overview: [],
    recent_exams: [],
    recent_incidents: [],
    expiring_certificates: [],
    sectors: [],
    safety_kpis: [],
  });

  const data = dashboardData || getFallbackData();

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.textSecondary }}>Chargement du tableau de bord...</Text>
      </View>
    );
  }

  if (error && !dashboardData) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={{ marginTop: 12, color: colors.error, fontSize: 14, textAlign: 'center' }}>{error}</Text>
        <Text style={{ marginTop: 8, color: colors.textSecondary, fontSize: 12, textAlign: 'center' }}>
          Connexion au serveur échouée
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Medecine du Travail</Text>
          <Text style={styles.headerSubtitle}>
            {organizationName ? `${organizationName} - ` : ''}Sante & Securite au Travail - ISO 45001 - ILO C155/C161
          </Text>
        </View>
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.7} onPress={() => onNavigate?.('oh-exams')}>
          <Ionicons name="add-circle" size={20} color="#FFF" />
          <Text style={styles.addBtnText}>Nouvelle Visite</Text>
        </TouchableOpacity>
      </View>

      {/* ══════ QUICK ACTIONS ══════ */}
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity 
          style={[styles.quickActionCard, { borderLeftColor: colors.primary }]} 
          activeOpacity={0.7}
          onPress={() => onNavigate?.('patients')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: colors.primaryFaded }]}>
            <Ionicons name="people-outline" size={24} color={colors.primary} />
          </View>
          <Text style={styles.quickActionTitle}>Gestion Patients</Text>
          <Text style={styles.quickActionDesc}>Enregistrer et gérer les patients</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.quickActionCard, { borderLeftColor: colors.secondary }]} 
          activeOpacity={0.7}
          onPress={() => onNavigate?.('intake')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: colors.secondaryLight + '22' }]}>
            <Ionicons name="person-add-outline" size={24} color={colors.secondary} />
          </View>
          <Text style={styles.quickActionTitle}>Accueil Patient</Text>
          <Text style={styles.quickActionDesc}>Accueil et signes vitaux</Text>
        </TouchableOpacity>
      </View>

      {/* ══════ SECTION: Occupational Health Summary ══════ */}
      <SectionHeader
        title="Sante Occupationnelle"
        subtitle="Maladies professionnelles, risques & formation"
        icon="heart"
        accentColor={colors.secondary}
      />
      <View style={styles.row}>
        <View style={[styles.card, isDesktop && { flex: 1 }]}>
          <Text style={styles.cardTitle}>Maladies Professionnelles</Text>
          <View style={{ marginTop: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(239,68,68,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#DC2626' }}>YTD</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>Diagnostiques cette année</Text>
                <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>
                  {(data as any).total_diseases_this_year || 0}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(245,158,11,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#F59E0B' }}>MTD</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>Diagnostiques ce mois</Text>
                <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>
                  {(data as any).current_month_diseases || 0}
                </Text>
              </View>
            </View>
          </View>
        </View>
        <View style={[styles.card, isDesktop && { flex: 1 }]}>
          <Text style={styles.cardTitle}>Personnel Entrainé & Risques</Text>
          <View style={{ marginTop: 12 }}>
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500' }}>Formation SST</Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                  {(data as any).trained_workers || 0} travailleurs
                </Text>
              </View>
              <View style={{ height: 8, backgroundColor: colors.outlineVariant, borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ height: 8, width: '72%', backgroundColor: '#22C55E', borderRadius: 4 }} />
              </View>
            </View>
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500' }}>Haut Risque</Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '600' }}>
                  {(data as any).high_risk_workers || 0} workers
                </Text>
              </View>
              <View style={{ height: 8, backgroundColor: colors.outlineVariant, borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ height: 8, width: '28%', backgroundColor: '#EF4444', borderRadius: 4 }} />
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* ══════ SECTION: KPIs ══════ */}
      <SectionHeader
        title="Indicateurs Cles"
        subtitle="Statut des travailleurs et indicateurs de performance"
        icon="pulse"
        accentColor={colors.primary}
        ctaLabel="Exporter"
        ctaIcon="download-outline"
        onCtaPress={() => onNavigate?.('oh-reports')}
      />
      <View style={styles.metricsGrid}>
        {data.metrics.map((m, i) => (
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
        accentColor={colors.secondary}
      />
      <View style={styles.row}>
        <View style={[styles.card, isDesktop && { flex: 1 }]}>
          <Text style={styles.cardTitle}>Repartition Aptitude</Text>
          <View style={{ marginTop: 12 }}>
            {data.fitness_overview && data.fitness_overview.length > 0 ? data.fitness_overview.map((f, i) => (
              <View key={i} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500' }}>{f.label}</Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>{f.count} ({f.percentage}%)</Text>
                </View>
                <View style={{ height: 8, backgroundColor: colors.outlineVariant, borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{ height: 8, width: `${f.percentage}%`, backgroundColor: f.color, borderRadius: 4 }} />
                </View>
              </View>
            )) : <Text style={{ color: colors.textSecondary }}>Aucune donnée</Text>}
          </View>
        </View>
        <View style={[styles.card, isDesktop && { flex: 1 }]}>
          <Text style={styles.cardTitle}>Indicateurs SST (ISO 45001)</Text>
          <View style={{ marginTop: 8 }}>
            {data.safety_kpis && data.safety_kpis.length > 0 ? data.safety_kpis.map((kpi, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: i < (data.safety_kpis?.length || 0) - 1 ? 1 : 0, borderBottomColor: colors.outline }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: kpi.status === 'good' ? '#22C55E' : '#F59E0B', marginRight: 10 }} />
                <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: colors.text }}>{kpi.label}</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginRight: 8 }}>{kpi.value}</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>Cible: {kpi.target}</Text>
              </View>
            )) : <Text style={{ color: colors.textSecondary }}>Aucune donnée</Text>}
          </View>
        </View>
      </View>

      {/* ══════ SECTION: Recent Examinations ══════ */}
      <SectionHeader
        title="Visites Medicales Recentes"
        subtitle="Dernieres consultations - tous secteurs"
        icon="medkit"
        accentColor={colors.primary}
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
        {data.recent_exams && data.recent_exams.length > 0 ? data.recent_exams.map((exam, i) => (
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
        )) : <View style={styles.tableRow}><Text style={{ color: colors.textSecondary }}>Aucune visite récente</Text></View>}
      </View>

      {/* ══════ SECTION: Incidents & Expiring Certificates ══════ */}
      <SectionHeader
        title="Alertes & Incidents"
        subtitle="Incidents recents et certificats a renouveler"
        icon="warning"
        accentColor={colors.error}
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
          {data.recent_incidents && data.recent_incidents.length > 0 ? data.recent_incidents.map((inc, i) => (
            <TouchableOpacity key={i} style={{ paddingVertical: 10, borderBottomWidth: i < (data.recent_incidents?.length || 0) - 1 ? 1 : 0, borderBottomColor: colors.outline }} activeOpacity={0.7}>
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
          )) : <View style={{ paddingVertical: 10 }}><Text style={{ color: colors.textSecondary }}>Aucun incident récent</Text></View>}
        </View>
        <View style={[styles.card, isDesktop && { flex: 1 }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Certificats a Renouveler</Text>
            <View style={[styles.badge, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
              <Text style={[styles.badgeText, { color: '#DC2626' }]}>{data.expiring_certificates?.length || 0}</Text>
            </View>
          </View>
          {data.expiring_certificates && data.expiring_certificates.length > 0 ? data.expiring_certificates.map((cert, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: i < (data.expiring_certificates?.length || 0) - 1 ? 1 : 0, borderBottomColor: colors.outline }}>
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
          )) : <View style={{ paddingVertical: 10 }}><Text style={{ color: colors.textSecondary }}>Aucun certificat à expirer</Text></View>}
        </View>
      </View>

      {/* ══════ SECTION: Regulatory Standards ══════ */}
      <SectionHeader
        title="Cadre Reglementaire"
        subtitle="Standards internationaux & conformite"
        icon="shield"
        accentColor={colors.secondary}
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
          <Text style={styles.cardTitle}>Statut Conformite</Text>
          {[
            { label: 'Taux Aptitude', value: data && (data as any).overall_fitness_rate ? `${(data as any).overall_fitness_rate}%` : '—', status: 'good', icon: 'checkmark-circle' },
            { label: 'Exams Conformite', value: data && (data as any).exam_compliance_rate ? `${(data as any).exam_compliance_rate}%` : '—', status: 'good', icon: 'checkmark-circle' },
            { label: 'PPE Conformite', value: data && (data as any).ppe_compliance_rate ? `${(data as any).ppe_compliance_rate}%` : '—', status: 'warning', icon: 'alert-circle' },
          ].map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: colors.outline }}>
              <Ionicons name={item.icon as any} size={16} color={item.status === 'good' ? '#22C55E' : '#F59E0B'} style={{ marginRight: 8 }} />
              <Text style={{ flex: 1, fontSize: 13, fontWeight: '500', color: colors.text }}>{item.label}</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: item.status === 'good' ? '#22C55E' : '#F59E0B' }}>{item.value}</Text>
            </View>
          ))}
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
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: borderRadius.lg,
    backgroundColor: colors.primary, ...shadows.sm,
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
  viewAllText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  tableHeader: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: colors.primary + '08', borderRadius: borderRadius.md, marginBottom: 4, borderWidth: 1, borderColor: colors.primary + '20' },
  th: { fontSize: 11, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.outline + '60' },
  td: { fontSize: 13, color: colors.text, paddingVertical: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '600' },
});
