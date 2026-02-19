import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../components/GlobalUI';
import { useSelector } from 'react-redux';
import SyncStatusIndicator from '../components/SyncStatusIndicator';
import HybridDataService from '../services/HybridDataService';
import { colors, spacing, typography, borderRadius, shadows } from '../theme/theme';
import { getTextColor, getIconBackgroundColor, getSecondaryTextColor, getTertiaryTextColor, getBadgeBackgroundColor } from '../utils/colorContrast';
import { selectActiveModules } from '../store/slices/authSlice';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const isTablet = width >= 768;

// ─── Types ───────────────────────────────────────────────────
interface MetricCard {
  id: string;
  title: string;
  value: string;
  change: string;
  changeType: 'up' | 'down' | 'neutral';
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
}

interface RecentOrder {
  id: string;
  client: string;
  produit: string;
  montant: string;
  statut: 'Livré' | 'En cours' | 'En attente' | 'Annulé';
  date: string;
}

interface ExpiringDrug {
  id: string;
  nom: string;
  lot: string;
  expiration: string;
  stock: number;
  urgence: 'Critique' | 'Urgent' | 'Attention';
}

interface QuickAction {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

// ─── Sample Data ─────────────────────────────────────────────
const metricCards: MetricCard[] = [
  {
    id: '1',
    title: 'Ventes du Jour',
    value: '1.247.500 FC',
    change: '+12.5%',
    changeType: 'up',
    icon: 'trending-up',
    color: colors.primary,
    bgColor: colors.primaryFaded,
  },
  {
    id: '2',
    title: 'Patients Aujourd\'hui',
    value: '48',
    change: '+8.3%',
    changeType: 'up',
    icon: 'people',
    color: colors.info,
    bgColor: colors.infoLight,
  },
  {
    id: '3',
    title: 'Ordonnances',
    value: '156',
    change: '-2.1%',
    changeType: 'down',
    icon: 'document-text',
    color: colors.secondary,
    bgColor: 'rgba(99, 102, 241, 0.08)',
  },
  {
    id: '4',
    title: 'Stock Critique',
    value: '12',
    change: '+3',
    changeType: 'down',
    icon: 'warning',
    color: colors.warning,
    bgColor: colors.warningLight,
  },
];

const recentOrders: RecentOrder[] = [
  { id: 'CMD-001', client: 'Jean Mukendi', produit: 'Amoxicilline 500mg', montant: '15.000 FC', statut: 'Livré', date: '14/01/2025' },
  { id: 'CMD-002', client: 'Marie Kabamba', produit: 'Paracétamol 1g', montant: '8.500 FC', statut: 'En cours', date: '14/01/2025' },
  { id: 'CMD-003', client: 'Pierre Kasongo', produit: 'Ibuprofène 400mg', montant: '12.000 FC', statut: 'En attente', date: '13/01/2025' },
  { id: 'CMD-004', client: 'Sophie Mwamba', produit: 'Métronidazole 250mg', montant: '22.000 FC', statut: 'Livré', date: '13/01/2025' },
  { id: 'CMD-005', client: 'David Mutombo', produit: 'Ciprofloxacine 500mg', montant: '18.500 FC', statut: 'Annulé', date: '12/01/2025' },
];

const expiringDrugs: ExpiringDrug[] = [
  { id: '1', nom: 'Amoxicilline 250mg', lot: 'LOT-2024-001', expiration: '15/02/2025', stock: 45, urgence: 'Critique' },
  { id: '2', nom: 'Métronidazole 500mg', lot: 'LOT-2024-012', expiration: '28/02/2025', stock: 120, urgence: 'Urgent' },
  { id: '3', nom: 'Cotrimoxazole', lot: 'LOT-2024-008', expiration: '15/03/2025', stock: 80, urgence: 'Attention' },
  { id: '4', nom: 'Diclofénac 50mg', lot: 'LOT-2024-015', expiration: '01/03/2025', stock: 30, urgence: 'Critique' },
];

const quickActions: QuickAction[] = [
  { id: '1', label: 'Nouvelle Vente', icon: 'cart', color: colors.primary },
  { id: '2', label: 'Ajouter Patient', icon: 'person-add', color: colors.info },
  { id: '3', label: 'Réception Stock', icon: 'cube', color: colors.secondary },
  { id: '4', label: 'Rapport', icon: 'bar-chart', color: colors.accent },
];

// ─── Status Badge Component ─────────────────────────────────
function StatusBadge({ statut }: { statut: string }) {
  const getStatusStyle = () => {
    switch (statut) {
      case 'Livré':
        return { bg: colors.successLight, text: colors.successDark, dot: colors.success };
      case 'En cours':
        return { bg: colors.infoLight, text: colors.infoDark, dot: colors.info };
      case 'En attente':
        return { bg: colors.warningLight, text: colors.warningDark, dot: colors.warning };
      case 'Annulé':
        return { bg: colors.errorLight, text: colors.errorDark, dot: colors.error };
      default:
        return { bg: colors.outlineVariant, text: colors.textSecondary, dot: colors.textTertiary };
    }
  };

  const style = getStatusStyle();
  return (
    <View style={[styles.statusBadge, { backgroundColor: style.bg }]}>
      <View style={[styles.statusDot, { backgroundColor: style.dot }]} />
      <Text style={[styles.statusBadgeText, { color: style.text }]}>{statut}</Text>
    </View>
  );
}

// ─── Urgency Badge Component ─────────────────────────────────
function UrgencyBadge({ urgence }: { urgence: string }) {
  const getUrgencyStyle = () => {
    switch (urgence) {
      case 'Critique':
        return { bg: colors.errorLight, text: colors.errorDark };
      case 'Urgent':
        return { bg: colors.warningLight, text: colors.warningDark };
      case 'Attention':
        return { bg: colors.infoLight, text: colors.infoDark };
      default:
        return { bg: colors.outlineVariant, text: colors.textSecondary };
    }
  };

  const style = getUrgencyStyle();
  return (
    <View style={[styles.urgencyBadge, { backgroundColor: style.bg }]}>
      <Text style={[styles.urgencyBadgeText, { color: style.text }]}>{urgence}</Text>
    </View>
  );
}

// ─── Mini Bar Chart Component ────────────────────────────────
function MiniBarChart() {
  const data = [65, 80, 45, 90, 70, 55, 85, 60, 75, 95, 50, 88];
  const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const maxVal = Math.max(...data);

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartBars}>
        {data.map((val, i) => (
          <View key={i} style={styles.chartBarWrapper}>
            <View
              style={[
                styles.chartBar,
                {
                  height: `${(val / maxVal) * 100}%`,
                  backgroundColor: i === 9 ? colors.primary : colors.primaryFaded,
                  borderRadius: 4,
                },
              ]}
            />
            <Text style={styles.chartLabel}>{months[i]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Section Header Component ────────────────────────────────
function SectionHeader({
  title,
  subtitle,
  icon,
  accentColor = colors.primary,
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
    <View style={sectionStyles.wrapper}>
      <View style={sectionStyles.divider}>
        <View style={[sectionStyles.dividerAccent, { backgroundColor: accentColor }]} />
        <View style={sectionStyles.dividerLine} />
      </View>
      <View style={sectionStyles.header}>
        <View style={sectionStyles.headerLeft}>
          <View style={[sectionStyles.iconBubble, { backgroundColor: accentColor + '14' }]}>
            <Ionicons name={icon} size={18} color={accentColor} />
          </View>
          <View>
            <Text style={sectionStyles.title}>{title}</Text>
            {subtitle && <Text style={sectionStyles.subtitle}>{subtitle}</Text>}
          </View>
        </View>
        {ctaLabel && (
          <TouchableOpacity
            style={[sectionStyles.ctaBtn, { backgroundColor: accentColor }]}
            onPress={onCtaPress}
            activeOpacity={0.7}
          >
            {ctaIcon && <Ionicons name={ctaIcon} size={15} color="#FFF" />}
            <Text style={sectionStyles.ctaText}>{ctaLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
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

// ─── Dashboard Screen ────────────────────────────────────────
interface DashboardScreenProps {
  onNavigate?: (screenId: string) => void;
}

export function DashboardScreen({ onNavigate }: DashboardScreenProps = {}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { info } = useToast();
  const activeModules = useSelector(selectActiveModules);
  const hasPharmacyAccess = activeModules.includes('PHARMACY');
  const hasHospitalAccess = activeModules.includes('HOSPITAL');
  const hasOccHealthAccess = activeModules.includes('OCCUPATIONAL_HEALTH');

  const reportTarget = hasPharmacyAccess
    ? 'ph-reports'
    : hasHospitalAccess
      ? 'hp-dashboard'
      : hasOccHealthAccess
        ? 'oh-reports'
        : 'dashboard';

  const operationsTarget = hasPharmacyAccess
    ? 'ph-pos'
    : hasHospitalAccess
      ? 'hp-patients'
      : hasOccHealthAccess
        ? 'oh-patients'
        : 'dashboard';

  const dashboardQuickActions = quickActions.filter((action) => {
    if (action.id === '1' || action.id === '3' || action.id === '4') {
      return hasPharmacyAccess;
    }
    if (action.id === '2') {
      return hasHospitalAccess || hasOccHealthAccess;
    }
    return true;
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const hybridData = HybridDataService.getInstance();
      const stats = await hybridData.getDashboardStats();
      const syncStatus = hybridData.getSyncStatus();
      
      // Create dashboard metrics from real data or fallback to sample data
      const metrics = stats ? {
        patients: stats.totalPatients || 48,
        sales: stats.totalSales || 1247500,
        prescriptions: stats.totalPrescriptions || 156,
        criticalStock: stats.criticalStock || 12,
        isOffline: !syncStatus.isOnline,
        pendingSync: syncStatus.pendingItems,
      } : null;
      
      setDashboardStats(metrics);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const greeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* ── Header Section ─────────────────────────────── */}
      <View style={styles.headerSection}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{greeting()}, Administrateur 👋</Text>
          <Text style={styles.subtitle}>
            Voici un aperçu de votre système de gestion
          </Text>
        </View>
        <View style={styles.headerRight}>
          <SyncStatusIndicator compact={true} onPress={() => info('Statut de synchronisation: ' + (HybridDataService.getInstance().getSyncStatus().isOnline ? 'En ligne' : 'Hors ligne'))} />
          <View style={styles.dateChip}>
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            <Text style={styles.dateText}>
              {currentTime.toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>
      </View>

      {/* ══════ SECTION: Actions Rapides ══════ */}
      <SectionHeader
        title="Actions Rapides"
        subtitle="Accès rapide aux fonctions principales"
        icon="flash"
        accentColor={colors.primary}
      />
      <View style={styles.quickActionsRow}>
        {dashboardQuickActions.map((action) => {
          const getScreenId = () => {
            switch(action.id) {
              case '1': return 'ph-pos'; // Nouvelle Vente
              case '2': return hasHospitalAccess ? 'hp-patients' : hasOccHealthAccess ? 'oh-patients' : null; // Ajouter Patient
              case '3': return 'ph-inventory'; // Réception Stock
              case '4': return reportTarget; // Rapport
              default: return null;
            }
          };
          
          return (
          <TouchableOpacity 
            key={action.id} 
            style={styles.quickActionBtn} 
            activeOpacity={0.7}
            onPress={() => {
              const screenId = getScreenId();
              if (screenId && onNavigate) {
                onNavigate(screenId);
              } else {
                info(`Action ${action.label} sélectionnée`);
              }
            }}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: action.color + '14' }]}>
              <Ionicons name={action.icon} size={22} color={action.color} />
            </View>
            <Text style={styles.quickActionLabel}>{action.label}</Text>
          </TouchableOpacity>
          );
        })}
      </View>

      {/* ══════ SECTION: Indicateurs Clés ══════ */}
      <SectionHeader
        title="Indicateurs Clés"
        subtitle="Performance en temps réel"
        icon="analytics"
        accentColor={colors.info}
        ctaLabel="Exporter"
        ctaIcon="download-outline"
        onCtaPress={() => onNavigate?.(reportTarget)}
      />
      <View style={styles.metricsGrid}>
        {metricCards.map((card) => (
          <View key={card.id} style={[styles.metricCard, { backgroundColor: card.color }]}>
            <View style={styles.metricIconContainer}>
              <Ionicons name={card.icon} size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.metricValue}>{card.value}</Text>
            <Text style={styles.metricTitle}>{card.title}</Text>
            <View style={styles.changeBadge}>
              <Ionicons
                name={card.changeType === 'up' ? 'arrow-up' : 'arrow-down'}
                size={12}
                color="rgba(255,255,255,0.8)"
              />
              <Text style={styles.changeText}>
                {card.change}
              </Text>
            </View>
            <Text style={styles.metricValue}>{card.value}</Text>
            <Text style={styles.metricTitle}>{card.title}</Text>
          </View>
        ))}
      </View>

      {/* ══════ SECTION: Analyse & Système ══════ */}
      <SectionHeader
        title="Analyse & Système"
        subtitle="Revenus et état de l'infrastructure"
        icon="bar-chart"
        accentColor={colors.secondary}
        ctaLabel="Rapport Complet"
        ctaIcon="document-text-outline"
        onCtaPress={() => onNavigate?.(reportTarget)}
      />
      <View style={styles.contentRow}>
        {/* Monthly Revenue Chart */}
        <View style={[styles.chartCard, isDesktop && styles.chartCardDesktop]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Revenus Mensuels</Text>
              <Text style={styles.cardSubtitle}>Aperçu des ventes 2025</Text>
            </View>
            <TouchableOpacity style={styles.viewAllBtn} onPress={() => onNavigate?.(reportTarget)}>
              <Text style={styles.viewAllText}>Voir Détails</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.chartStats}>
            <View style={styles.chartStatItem}>
              <Text style={styles.chartStatValue}>45.2M FC</Text>
              <Text style={styles.chartStatLabel}>Total Année</Text>
            </View>
            <View style={styles.chartStatItem}>
              <Text style={styles.chartStatValue}>3.8M FC</Text>
              <Text style={styles.chartStatLabel}>Mois En Cours</Text>
            </View>
            <View style={styles.chartStatItem}>
              <Text style={[styles.chartStatValue, { color: colors.success }]}>+15.2%</Text>
              <Text style={styles.chartStatLabel}>Croissance</Text>
            </View>
          </View>
          <MiniBarChart />
        </View>

        {/* System Status */}
        <View style={[styles.statusCard, isDesktop && styles.statusCardDesktop]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>État du Système</Text>
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>En Ligne</Text>
            </View>
          </View>
          <View style={styles.statusList}>
            <StatusItem label="Base de Données" status="Opérationnel" icon="server" ok />
            <StatusItem label="Synchronisation" status="À jour" icon="sync" ok />
            <StatusItem label="Sauvegarde" status="Il y a 2h" icon="cloud-done" ok />
            <StatusItem label="Espace Disque" status="68% utilisé" icon="hardware-chip" ok />
            <StatusItem label="Licence" status="Active" icon="shield-checkmark" ok />
          </View>
        </View>
      </View>

      {/* ══════ SECTION: Suivi des Opérations ══════ */}
      <SectionHeader
        title="Suivi des Opérations"
        subtitle="Commandes et alertes médicaments"
        icon="clipboard"
        accentColor={colors.accent}
        ctaLabel="Nouvelle Commande"
        ctaIcon="add-circle-outline"
        onCtaPress={() => onNavigate?.(operationsTarget)}
      />
      <View style={styles.contentRow}>
        {/* Recent Orders Table */}
        <View style={[styles.tableCard, isDesktop && styles.tableCardDesktop]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Commandes Récentes</Text>
              <Text style={styles.cardSubtitle}>{recentOrders.length} commandes récentes</Text>
            </View>
            <TouchableOpacity style={styles.viewAllBtn} onPress={() => onNavigate?.(operationsTarget)}>
              <Text style={styles.viewAllText}>Tout Voir</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>ID</Text>
            <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Client</Text>
            <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Produit</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Montant</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Statut</Text>
          </View>

          {/* Table Rows */}
          {recentOrders.map((order, index) => (
            <View
              key={order.id}
              style={[
                styles.tableRow,
                index % 2 === 0 && styles.tableRowAlt,
                index === recentOrders.length - 1 && styles.tableRowLast,
              ]}
            >
              <Text style={[styles.tableCell, styles.tableCellId, { flex: 1 }]}>{order.id}</Text>
              <Text style={[styles.tableCell, { flex: 1.5 }]}>{order.client}</Text>
              <Text style={[styles.tableCell, { flex: 1.5 }]}>{order.produit}</Text>
              <Text style={[styles.tableCell, styles.tableCellMoney, { flex: 1 }]}>
                {order.montant}
              </Text>
              <View style={{ flex: 1 }}>
                <StatusBadge statut={order.statut} />
              </View>
            </View>
          ))}
        </View>

        {/* Expiring Drugs Table */}
        <View style={[styles.tableCard, isDesktop && styles.expiringCardDesktop]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>Médicaments Bientôt Expirés</Text>
              <Text style={styles.cardSubtitle}>Surveillance des lots</Text>
            </View>
            <View style={styles.alertCountBadge}>
              <Ionicons name="alert-circle" size={14} color={colors.error} />
              <Text style={styles.alertCountText}>{expiringDrugs.length}</Text>
            </View>
          </View>

          {expiringDrugs.map((drug, index) => (
            <View
              key={drug.id}
              style={[
                styles.expiringRow,
                index === expiringDrugs.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <View style={styles.expiringInfo}>
                <Text style={styles.expiringName}>{drug.nom}</Text>
                <Text style={styles.expiringLot}>{drug.lot}</Text>
              </View>
              <View style={styles.expiringMeta}>
                <View style={styles.expiringDetail}>
                  <Ionicons name="calendar-outline" size={14} color={colors.textTertiary} />
                  <Text style={styles.expiringDate}>{drug.expiration}</Text>
                </View>
                <View style={styles.expiringDetail}>
                  <Ionicons name="cube-outline" size={14} color={colors.textTertiary} />
                  <Text style={styles.expiringStock}>{drug.stock} unités</Text>
                </View>
              </View>
              <UrgencyBadge urgence={drug.urgence} />
            </View>
          ))}
        </View>
      </View>

      {/* ── Footer ─────────────────────────────────────── */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © 2025 HK Management Systems — Conçu pour la RD Congo
        </Text>
        <View style={styles.footerBadge}>
          <View style={styles.footerDot} />
          <Text style={styles.footerStatus}>Système opérationnel</Text>
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Status Item Sub-component ───────────────────────────────
function StatusItem({
  label,
  status,
  icon,
  ok,
}: {
  label: string;
  status: string;
  icon: keyof typeof Ionicons.glyphMap;
  ok: boolean;
}) {
  return (
    <View style={styles.statusItem}>
      <View style={styles.statusItemLeft}>
        <View
          style={[
            styles.statusItemIcon,
            { backgroundColor: ok ? colors.successLight : colors.errorLight },
          ]}
        >
          <Ionicons name={icon} size={16} color={ok ? colors.success : colors.error} />
        </View>
        <Text style={styles.statusItemLabel}>{label}</Text>
      </View>
      <Text style={[styles.statusItemValue, { color: ok ? colors.success : colors.error }]}>
        {status}
      </Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: isDesktop ? 32 : 16,
    paddingBottom: 40,
  },

  // ── Header ──────────────────────────────────────────
  headerSection: {
    flexDirection: isDesktop ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: isDesktop ? 'center' : 'flex-start',
    marginBottom: 24,
    gap: 12,
  },
  headerLeft: {},
  headerRight: {},
  greeting: {
    fontSize: isDesktop ? 28 : 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryFaded,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    gap: 8,
  },
  dateText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
    textTransform: 'capitalize',
  },

  // ── Quick Actions ───────────────────────────────────
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  quickActionBtn: {
    flex: isDesktop ? undefined : 1,
    minWidth: isDesktop ? 160 : undefined,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    gap: 10,
    ...shadows.sm,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },

  // ── Metric Cards ────────────────────────────────────
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  metricCard: {
    flex: isDesktop ? 1 : undefined,
    width: isDesktop ? undefined : isTablet ? '48%' : '100%',
    minWidth: isDesktop ? 220 : undefined,
    borderRadius: borderRadius.xl,
    padding: 20,
    alignItems: 'center',
    ...shadows.md,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  metricIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 2,
    marginTop: 8,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  metricTitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  // ── Content Row ─────────────────────────────────────
  contentRow: {
    flexDirection: isDesktop ? 'row' : 'column',
    gap: 16,
    marginBottom: 24,
  },

  // ── Chart Card ──────────────────────────────────────
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: 20,
    ...shadows.sm,
  },
  chartCardDesktop: {
    flex: 2,
  },
  chartStats: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  chartStatItem: {},
  chartStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  chartStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chartContainer: {
    height: 160,
    justifyContent: 'flex-end',
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '100%',
    gap: 4,
  },
  chartBarWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  chartBar: {
    width: '70%',
    minWidth: 12,
  },
  chartLabel: {
    fontSize: 10,
    color: colors.textTertiary,
    marginTop: 6,
    fontWeight: '500',
  },

  // ── Status Card ─────────────────────────────────────
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: 20,
    ...shadows.sm,
  },
  statusCardDesktop: {
    flex: 1,
  },
  statusList: {
    marginTop: 16,
    gap: 2,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  statusItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusItemIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusItemLabel: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  statusItemValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.successLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  onlineText: {
    fontSize: 11,
    color: colors.successDark,
    fontWeight: '600',
  },

  // ── Card Header (shared) ────────────────────────────
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },

  // ── Table Card ──────────────────────────────────────
  tableCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadows.sm,
  },
  tableCardDesktop: {
    flex: 3,
  },
  expiringCardDesktop: {
    flex: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.primary + '08',
    borderRadius: borderRadius.md,
    marginTop: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  tableRowAlt: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.sm,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCell: {
    fontSize: 13,
    color: colors.text,
  },
  tableCellId: {
    fontWeight: '600',
    color: colors.primary,
  },
  tableCellMoney: {
    fontWeight: '600',
    color: colors.text,
  },

  // ── Status Badge ────────────────────────────────────
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Urgency Badge ───────────────────────────────────
  urgencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  urgencyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Expiring Drugs ──────────────────────────────────
  expiringRow: {
    flexDirection: isDesktop ? 'row' : 'column',
    alignItems: isDesktop ? 'center' : 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    gap: 8,
  },
  expiringInfo: {
    flex: isDesktop ? 1 : undefined,
  },
  expiringName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  expiringLot: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  expiringMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  expiringDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expiringDate: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  expiringStock: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // ── Alert Count Badge ───────────────────────────────
  alertCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  alertCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.errorDark,
  },

  // ── Footer ──────────────────────────────────────────
  footer: {
    flexDirection: isDesktop ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: isDesktop ? 'center' : 'flex-start',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  footerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  footerStatus: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '500',
  },
});
