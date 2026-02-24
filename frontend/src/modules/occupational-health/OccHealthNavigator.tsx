import React, { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SidebarLayout, SidebarSection } from '../../components/SidebarLayout';
import { OccHealthDashboardContent } from './screens/OccHealthDashboard';
import { OccHealthConsultationScreen } from './screens/OccHealthConsultationScreen';
import { PreviousVisitsScreen } from './screens/PreviousVisitsScreen';
import { CertificatesScreen } from './screens/CertificatesScreen';
import { OHPatientsScreen } from './screens/OHPatientsScreen';
import { OHPatientIntakeScreen, PENDING_CONSULTATIONS_KEY, type PendingConsultation } from './screens/OHPatientIntakeScreen';
import { IncidentsScreen } from './screens/IncidentsScreen';
import { DiseasesScreen } from './screens/DiseasesScreen';
import { SurveillanceScreen } from './screens/SurveillanceScreen';
import { RiskAssessmentScreen } from './screens/RiskAssessmentScreen';
import { PPEManagementScreen } from './screens/PPEManagementScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { ComplianceScreen } from './screens/ComplianceScreen';
import { AnalyticsScreen } from './screens/AnalyticsScreen';
import { ProtocolManagementScreen } from './screens/ProtocolManagementScreen';
import { ExposureMonitoringScreen } from './screens/ExposureMonitoringScreen';
import { MedicalExamManagementScreen } from './screens/MedicalExamManagementScreen';
import { CertificateExportModal } from './screens/CertificateExportScreen';
import { IncidentDashboardScreen } from './screens/IncidentDashboardScreen';
import { FeaturesOverviewScreen } from './screens/FeaturesOverviewScreen';
import { WorkerAndEnterpriseScreen, EnterpriseManagementScreen } from './screens/WorkerAndEnterpriseScreen';
import { MedicalTestVisualizationScreen, ExitExamScreen } from './screens/MedicalTestVisualizationScreen';
import { DiseaseRegistryScreen, HealthScreeningFormScreen } from './screens/DiseaseRegistryAndHealthScreeningScreen';
import { ExposureMonitoringDashboard, RegulatoryReportsScreen } from './screens/ExposureAndReportingScreen';
import { ISO45001DashboardScreen, ISO27001DashboardScreen } from './screens/ComplianceDashboardsScreen';
import { PlaceholderScreen } from '../shared/PlaceholderScreen';
import { colors } from '../../theme/theme';

// Occupational Health accent color
const ACCENT = colors.primary;

// ─── Screen Definitions ──────────────────────────────────────
const occHealthScreens: Record<string, { title: string; subtitle: string; icon: any; features: string[] }> = {
  patients: {
    title: 'Gestion Patients — Santé au Travail',
    subtitle: 'Registre des patients par secteur d\'activité et entreprise.',
    icon: 'people',
    features: [
      'Enregistrement multi-secteur (mines, BTP, banque, industrie, santé...)',
      'Profil de risque adapté au secteur d\'activité',
      'Historique d\'exposition aux dangers professionnels',
      'Suivi des EPI requis et attribués',
      'Catégorisation par entreprise, site, département et poste',
      'Export CNSS / Déclaration de main-d\'œuvre',
      'Gestion multi-entreprise avec contrats inter-entreprises',
    ],
  },
  'medical-exams': {
    title: 'Visites Médicales',
    subtitle: 'Examens d\'aptitude adaptés par secteur (ILO C161).',
    icon: 'medkit',
    features: [
      'Visite d\'embauche / pré-emploi',
      'Visites périodiques (fréquence selon le risque sectoriel)',
      'Visite de reprise après arrêt maladie ou accident',
      'Visite travail de nuit / poste spécial',
      'Examens sectoriels: audiométrie, spirométrie, ergonomie, stress',
      'Bilan cardiovasculaire (postes sédentaires / stress)',
      'Dépistage toxicologique si applicable',
      'Évaluation santé mentale (burnout, stress professionnel)',
      'Tests adaptés au profil de risque du secteur',
    ],
  },
  certificates: {
    title: 'Certificats d\'Aptitude',
    subtitle: 'Gestion des certificats médicaux d\'aptitude au travail.',
    icon: 'shield-checkmark',
    features: [
      'Émission de certificats d\'aptitude',
      'Suivi des dates d\'expiration',
      'Alertes de renouvellement automatiques',
      'Classifications: Apte, Apte avec restrictions, Inapte',
      'Historique des certificats par patient',
      'Impression et signature numérique',
    ],
  },
  surveillance: {
    title: 'Programmes de Surveillance',
    subtitle: 'Surveillance médicale par groupe de risque et secteur.',
    icon: 'eye',
    features: [
      'Programmes par agent de risque (bruit, chimique, ergonomique...)',
      'Surveillance musculo-squelettique (BTP, industrie, bureaux)',
      'Surveillance respiratoire (mines, chimie, agriculture)',
      'Surveillance psychosociale (banque, santé, IT)',
      'Seuils d\'alerte et niveaux d\'action configurables par secteur',
      'Calendrier automatique des examens selon profil de risque',
      'Rapports de surveillance par programme et par entreprise',
    ],
  },
  diseases: {
    title: 'Maladies Professionnelles',
    subtitle: 'Registre ILO R194 — pathologies par secteur d\'activité.',
    icon: 'fitness',
    features: [
      'Classification ILO R194 (liste internationale)',
      'Pneumoconioses (mines, BTP, industrie)',
      'Troubles musculo-squelettiques (tous secteurs)',
      'Burnout et risques psychosociaux (banque, santé, IT)',
      'Syndrome du canal carpien (bureaux, industrie)',
      'Surdité professionnelle — NIHL (mines, BTP, industrie)',
      'Dermatites et allergies professionnelles',
      'Déclaration aux autorités (CNSS, Inspection du Travail)',
      'Suivi des indemnisations par entreprise',
    ],
  },
  incidents: {
    title: 'Incidents & Accidents',
    subtitle: 'Signalement, investigation et suivi (ISO 45001 §10.2).',
    icon: 'warning',
    features: [
      'Déclaration d\'accident de travail (tous secteurs)',
      'Classification: mortel, avec arrêt, soins médicaux, premiers secours',
      'Investigation des causes racines (méthode Ishikawa, 5 Pourquoi)',
      'Actions correctives et préventives (CAPA)',
      'Calcul automatique LTIFR, TRIFR, SR',
      'Rapports réglementaires par secteur',
      'Suivi des jours perdus et taux d\'absentéisme',
      'Analyse multi-site et multi-entreprise',
    ],
  },
  'risk-assessment': {
    title: 'Évaluation des Risques',
    subtitle: 'ISO 45001 §6.1 — Matrice de risques par secteur et poste.',
    icon: 'alert-circle',
    features: [
      'Matrice de risques adaptée par secteur d\'activité',
      'Identification des dangers (physiques, chimiques, ergonomiques, psychosociaux)',
      'Mesures d\'exposition quantitatives',
      'Hiérarchie des contrôles (ISO 45001)',
      'Plan de prévention par entreprise et département',
      'Cartographie des zones à risque',
      'Évaluation ergonomique des postes de travail',
      'Analyse des risques psychosociaux',
    ],
  },
  'ppe-management': {
    title: 'Gestion des EPI',
    subtitle: 'Attribution et suivi des Équipements de Protection Individuelle.',
    icon: 'body',
    features: [
      'Catalogue EPI: casque, lunettes, masque, harnais, etc.',
      'Attribution par poste et risque',
      'Suivi des dates de péremption/remplacement',
      'Contrôle de conformité EPI',
      'Historique de distribution par patient',
      'Alertes de renouvellement',
    ],
  },
  'exposure-monitoring': {
    title: 'Monitoring d\'Exposition',
    subtitle: 'Suivi en temps réel des expositions professionnelles.',
    icon: 'water',
    features: [
      'Silica cristalline (résirable)',
      'Cobalt et composés cobalt',
      'Poussière inhalable totale',
      'Bruit occupationnel',
      'Vibrations main-bras',
      'Chaleur (WBGT)',
      'Alertes de dépassement des limites',
      'Historique et tendances d\'exposition',
      'Calibrage des équipements de mesure',
    ],
  },
  reports: {
    title: 'Rapports SST',
    subtitle: 'Tableaux de bord et rapports de santé-sécurité au travail.',
    icon: 'stats-chart',
    features: [
      'Tableau de bord SST temps réel',
      'Rapport mensuel/trimestriel/annuel',
      'Statistiques d\'aptitude par département',
      'Taux de fréquence et de gravité',
      'Tendances des incidents',
      'Export PDF, Excel, DHIS2',
    ],
  },
  compliance: {
    title: 'Conformité Réglementaire',
    subtitle: 'Normes internationales et réglementation nationale par secteur.',
    icon: 'checkmark-circle',
    features: [
      'ISO 45001:2018 — Management SST',
      'ILO C155 — Sécurité et santé des travailleurs',
      'ILO C161 — Services de santé au travail',
      'ILO C187 — Cadre promotionnel SST',
      'Code du Travail RDC & réglementations sectorielles',
      'Audits et inspections programmés par entreprise',
      'Check-lists de conformité adaptées au secteur',
      'Actions correctives post-audit avec suivi',
    ],
  },
  analytics: {
    title: 'Analytiques Avancées',
    subtitle: 'Analyses prédictives et benchmarking multi-secteur.',
    icon: 'analytics',
    features: [
      'Tendances maladies professionnelles par secteur',
      'Analyse prédictive des risques',
      'Heatmap des incidents par zone et par site',
      'Corrélation exposition / pathologies',
      'Benchmarking inter-sectoriel et inter-entreprises',
      'Indicateurs ODD (Objectifs de Développement Durable)',
      'Tableaux croisés secteur × type de risque',
    ],
  },
};

// ─── Navigator Component ─────────────────────────────────────
export function OccHealthNavigator() {
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const [draftToLoad, setDraftToLoad] = useState<string | null>(null);
  const [pendingConsultationToLoad, setPendingConsultationToLoad] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Refresh pending queue count
  const refreshPendingCount = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(PENDING_CONSULTATIONS_KEY);
      if (stored) {
        const list: PendingConsultation[] = JSON.parse(stored);
        setPendingCount(list.filter(c => c.status === 'waiting').length);
      } else {
        setPendingCount(0);
      }
    } catch (e) {
      console.error('Failed to get pending count:', e);
    }
  }, []);

  useEffect(() => {
    refreshPendingCount();
    // Poll every 30s for updates
    const interval = setInterval(refreshPendingCount, 30000);
    return () => clearInterval(interval);
  }, [refreshPendingCount]);

  // Build sidebar sections dynamically so badge is reactive
  const occHealthSections: SidebarSection[] = [
    {
      title: 'Principal',
      items: [
        { id: 'features', label: 'Aperçu Fonctionnalités', icon: 'grid-outline', iconActive: 'grid' },
        { id: 'dashboard', label: 'Tableau de Bord', icon: 'home-outline', iconActive: 'home' },
        { id: 'worker-management', label: 'Gestion Travailleurs', icon: 'people-outline', iconActive: 'people' },
        { id: 'enterprise-management', label: 'Gestion Entreprises', icon: 'business-outline', iconActive: 'business' },
        { id: 'patients', label: 'Patients Historiques', icon: 'person-outline', iconActive: 'person' },
        { id: 'intake', label: 'Accueil Patient', icon: 'person-add-outline', iconActive: 'person-add' },
      ],
    },
    {
      title: 'Médecine du Travail',
      items: [
        { id: 'medical-exams', label: 'Visite du Médecin', icon: 'medkit-outline', iconActive: 'medkit', badge: pendingCount > 0 ? pendingCount : undefined },
        { id: 'medical-tests', label: 'Tests Médicaux', icon: 'flask-outline', iconActive: 'flask' },
        { id: 'exam-management', label: 'Gestion Examens', icon: 'document-outline', iconActive: 'document' },
        { id: 'exit-exams', label: 'Examens de Départ', icon: 'log-out-outline', iconActive: 'log-out' },
        { id: 'certificates', label: 'Certificats Aptitude', icon: 'shield-checkmark-outline', iconActive: 'shield-checkmark' },
        { id: 'protocol', label: 'Protocoles', icon: 'document-text-outline', iconActive: 'document-text' },
        { id: 'previous-visits', label: 'Historique Visites', icon: 'time-outline', iconActive: 'time' },
        { id: 'surveillance', label: 'Prog. Surveillance', icon: 'eye-outline', iconActive: 'eye' },
        { id: 'health-screening', label: 'Dépistage Santé', icon: 'pulse-outline', iconActive: 'pulse' },
      ],
    },
    {
      title: 'Maladies Professionnelles',
      items: [
        { id: 'diseases', label: 'Registre Maladies', icon: 'fitness-outline', iconActive: 'fitness' },
      ],
    },
    {
      title: 'Sécurité au Travail',
      items: [
        { id: 'incident-dashboard', label: 'Incidents & Accidents', icon: 'warning-outline', iconActive: 'warning', badge: 3 },
        { id: 'risk-assessment', label: 'Évaluation Risques', icon: 'alert-circle-outline', iconActive: 'alert-circle' },
        { id: 'exposure-monitoring', label: 'Monitoring Expositions', icon: 'water-outline', iconActive: 'water' },
        { id: 'ppe-management', label: 'Gestion EPI', icon: 'body-outline', iconActive: 'body' },
      ],
    },
    {
      title: 'Rapports & Conformité',
      items: [
        { id: 'regulatory-reports', label: 'Rapports Réglementaires', icon: 'document-attach-outline', iconActive: 'document-attach' },
        { id: 'iso45001', label: 'ISO 45001', icon: 'shield-outline', iconActive: 'shield' },
        { id: 'iso27001', label: 'ISO 27001', icon: 'lock-closed-outline', iconActive: 'lock-closed' },
        { id: 'reports', label: 'Rapports SST', icon: 'stats-chart-outline', iconActive: 'stats-chart' },
        { id: 'compliance', label: 'Conformité Réglementaire', icon: 'checkmark-circle-outline', iconActive: 'checkmark-circle' },
        { id: 'analytics', label: 'Analytiques', icon: 'analytics-outline', iconActive: 'analytics' },
      ],
    },
  ];

  const handleResumeDraft = (draftId: string) => {
    setDraftToLoad(draftId);
    setPendingConsultationToLoad(null);
    setActiveScreen('medical-exams');
  };

  const handleNewConsultation = () => {
    setDraftToLoad(null);
    setPendingConsultationToLoad(null);
    setActiveScreen('medical-exams');
  };

  const handleConsultationQueued = useCallback(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  const handleNavigateToConsultation = useCallback((pendingId?: string) => {
    setDraftToLoad(null);
    setPendingConsultationToLoad(pendingId || null);
    setActiveScreen('medical-exams');
  }, []);

  const renderContent = () => {
    if (activeScreen === 'features') {
      return <FeaturesOverviewScreen onNavigate={setActiveScreen} />;
    }

    if (activeScreen === 'dashboard') {
      return <OccHealthDashboardContent onNavigate={setActiveScreen} />;
    }

    if (activeScreen === 'worker-management') {
      return <WorkerAndEnterpriseScreen />;
    }

    if (activeScreen === 'enterprise-management') {
      return <EnterpriseManagementScreen />;
    }

    if (activeScreen === 'intake') {
      return (
        <OHPatientIntakeScreen
          onConsultationQueued={handleConsultationQueued}
          onNavigateToConsultation={handleNavigateToConsultation}
        />
      );
    }

    if (activeScreen === 'medical-exams') {
      return (
        <OccHealthConsultationScreen
          draftToLoad={draftToLoad}
          onDraftLoaded={() => setDraftToLoad(null)}
          pendingConsultationToLoad={pendingConsultationToLoad}
          onPendingLoaded={() => setPendingConsultationToLoad(null)}
        />
      );
    }

    if (activeScreen === 'medical-tests') {
      return <MedicalTestVisualizationScreen />;
    }

    if (activeScreen === 'exit-exams') {
      return <ExitExamScreen />;
    }

    if (activeScreen === 'health-screening') {
      return <HealthScreeningFormScreen />;
    }

    if (activeScreen === 'protocol') {
      return <ProtocolManagementScreen />;
    }

    if (activeScreen === 'previous-visits') {
      return (
        <PreviousVisitsScreen 
          onResumeDraft={handleResumeDraft} 
          onNewConsultation={handleNewConsultation}
        />
      );
    }

    if (activeScreen === 'certificates') {
      return <CertificatesScreen />;
    }

    if (activeScreen === 'exam-management') {
      return <MedicalExamManagementScreen />;
    }

    if (activeScreen === 'incident-dashboard') {
      return <IncidentDashboardScreen />;
    }

    if (activeScreen === 'diseases') {
      return <DiseaseRegistryScreen />;
    }

    if (activeScreen === 'surveillance') {
      return <SurveillanceScreen />;
    }

    if (activeScreen === 'risk-assessment') {
      return <RiskAssessmentScreen />;
    }

    if (activeScreen === 'exposure-monitoring') {
      return <ExposureMonitoringDashboard />;
    }

    if (activeScreen === 'regulatory-reports') {
      return <RegulatoryReportsScreen />;
    }

    if (activeScreen === 'iso45001') {
      return <ISO45001DashboardScreen />;
    }

    if (activeScreen === 'iso27001') {
      return <ISO27001DashboardScreen />;
    }

    if (activeScreen === 'ppe-management') {
      return <PPEManagementScreen />;
    }

    if (activeScreen === 'reports') {
      return <ReportsScreen />;
    }

    if (activeScreen === 'compliance') {
      return <ComplianceScreen />;
    }

    if (activeScreen === 'analytics') {
      return <AnalyticsScreen />;
    }

    return <OccHealthDashboardContent />;
  };

  return (
    <SidebarLayout
      sections={occHealthSections}
      activeId={activeScreen}
      onSelect={setActiveScreen}
      accentColor={ACCENT}
      title="Méd. du Travail"
      subtitle="Santé & Sécurité au Travail"
      headerIcon="construct"
    >
      {renderContent()}
    </SidebarLayout>
  );
}
