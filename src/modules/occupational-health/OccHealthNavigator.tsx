import React, { useState } from 'react';
import { SidebarLayout, SidebarSection } from '../../components/SidebarLayout';
import { OccHealthDashboardContent } from './screens/OccHealthDashboard';
import { OccHealthConsultationScreen } from './screens/OccHealthConsultationScreen';
import { PreviousVisitsScreen } from './screens/PreviousVisitsScreen';
import { CertificatesScreen } from './screens/CertificatesScreen';
import { WorkersScreen } from './screens/WorkersScreen';
import { IncidentsScreen } from './screens/IncidentsScreen';
import { DiseasesScreen } from './screens/DiseasesScreen';
import { SurveillanceScreen } from './screens/SurveillanceScreen';
import { RiskAssessmentScreen } from './screens/RiskAssessmentScreen';
import { PPEManagementScreen } from './screens/PPEManagementScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { ComplianceScreen } from './screens/ComplianceScreen';
import { AnalyticsScreen } from './screens/AnalyticsScreen';
import { PlaceholderScreen } from '../shared/PlaceholderScreen';
import { colors } from '../../theme/theme';

// Occupational Health accent color
const ACCENT = '#D97706';

// ─── Sidebar Menu Configuration ──────────────────────────────
const occHealthSections: SidebarSection[] = [
  {
    title: 'Principal',
    items: [
      { id: 'dashboard', label: 'Tableau de Bord', icon: 'grid-outline', iconActive: 'grid' },
      { id: 'workers', label: 'Travailleurs', icon: 'people-outline', iconActive: 'people' },
    ],
  },
  {
    title: 'Médecine du Travail',
    items: [
      { id: 'medical-exams', label: 'Visites Médicales', icon: 'medkit-outline', iconActive: 'medkit', badge: 8 },
      { id: 'previous-visits', label: 'Historique Visites', icon: 'time-outline', iconActive: 'time' },
      { id: 'certificates', label: 'Certificats Aptitude', icon: 'shield-checkmark-outline', iconActive: 'shield-checkmark' },
      { id: 'surveillance', label: 'Prog. Surveillance', icon: 'eye-outline', iconActive: 'eye' },
      { id: 'diseases', label: 'Maladies Professionnelles', icon: 'fitness-outline', iconActive: 'fitness' },
    ],
  },
  {
    title: 'Sécurité au Travail',
    items: [
      { id: 'incidents', label: 'Incidents & Accidents', icon: 'warning-outline', iconActive: 'warning', badge: 3 },
      { id: 'risk-assessment', label: 'Évaluation Risques', icon: 'alert-circle-outline', iconActive: 'alert-circle' },
      { id: 'ppe-management', label: 'Gestion EPI', icon: 'body-outline', iconActive: 'body' },
    ],
  },
  {
    title: 'Rapports & Conformité',
    items: [
      { id: 'reports', label: 'Rapports SST', icon: 'stats-chart-outline', iconActive: 'stats-chart' },
      { id: 'compliance', label: 'Conformité Réglementaire', icon: 'checkmark-circle-outline', iconActive: 'checkmark-circle' },
      { id: 'analytics', label: 'Analytiques', icon: 'analytics-outline', iconActive: 'analytics' },
    ],
  },
];

// ─── Screen Definitions ──────────────────────────────────────
const occHealthScreens: Record<string, { title: string; subtitle: string; icon: any; features: string[] }> = {
  workers: {
    title: 'Gestion des Travailleurs',
    subtitle: 'Registre complet des travailleurs par secteur et entreprise.',
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
      'Historique des certificats par travailleur',
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
      'Historique de distribution par travailleur',
      'Alertes de renouvellement',
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

  const handleResumeDraft = (draftId: string) => {
    setDraftToLoad(draftId);
    setActiveScreen('medical-exams');
  };

  const handleNewConsultation = () => {
    setDraftToLoad(null);
    setActiveScreen('medical-exams');
  };

  const renderContent = () => {
    if (activeScreen === 'dashboard') {
      return <OccHealthDashboardContent />;
    }

    if (activeScreen === 'medical-exams') {
      return <OccHealthConsultationScreen draftToLoad={draftToLoad} onDraftLoaded={() => setDraftToLoad(null)} />;
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

    if (activeScreen === 'workers') {
      return <WorkersScreen />;
    }

    if (activeScreen === 'incidents') {
      return <IncidentsScreen />;
    }

    if (activeScreen === 'diseases') {
      return <DiseasesScreen />;
    }

    if (activeScreen === 'surveillance') {
      return <SurveillanceScreen />;
    }

    if (activeScreen === 'risk-assessment') {
      return <RiskAssessmentScreen />;
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
