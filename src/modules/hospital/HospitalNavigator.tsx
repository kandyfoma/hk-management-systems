import React, { useState, useCallback } from 'react';
import { SidebarLayout, SidebarSection } from '../../components/SidebarLayout';
import { HospitalDashboardContent } from './screens/HospitalDashboard';
import { HospitalPrescriptionsScreen } from './screens/HospitalPrescriptionsScreen';
import { PatientListScreen } from './screens/PatientListScreen';
import { PatientDetailScreen } from './screens/PatientDetailScreen';
import { PatientRegistrationScreen } from './screens/PatientRegistrationScreen';
import { PlaceholderScreen } from '../shared/PlaceholderScreen';
import { colors } from '../../theme/theme';
import { Patient } from '../../models/Patient';

// ─── Sidebar Menu Configuration ──────────────────────────────
const hospitalSections: SidebarSection[] = [
  {
    title: 'Principal',
    items: [
      { id: 'dashboard', label: 'Tableau de Bord', icon: 'grid-outline', iconActive: 'grid' },
      { id: 'patients', label: 'Gestion Patients', icon: 'people-outline', iconActive: 'people' },
    ],
  },
  {
    title: 'Services Cliniques',
    items: [
      { id: 'appointments', label: 'Rendez-vous', icon: 'calendar-outline', iconActive: 'calendar', badge: 5 },
      { id: 'prescriptions', label: 'Ordonnances', icon: 'document-text-outline', iconActive: 'document-text' },
      { id: 'medical-records', label: 'Dossiers Médicaux', icon: 'folder-open-outline', iconActive: 'folder-open' },
      { id: 'lab-results', label: 'Résultats Labo', icon: 'flask-outline', iconActive: 'flask', badge: 2 },
      { id: 'wards', label: 'Services & Lits', icon: 'bed-outline', iconActive: 'bed' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { id: 'billing', label: 'Facturation', icon: 'receipt-outline', iconActive: 'receipt' },
      { id: 'staff', label: 'Personnel Médical', icon: 'person-outline', iconActive: 'person' },
      { id: 'reports', label: 'Rapports', icon: 'stats-chart-outline', iconActive: 'stats-chart' },
    ],
  },
];

// ─── Screen Definitions ──────────────────────────────────────
const hospitalScreens: Record<string, { title: string; subtitle: string; icon: any; features: string[] }> = {
  patients: {
    title: 'Gestion des Patients',
    subtitle: 'Enregistrer, rechercher et gérer les informations complètes des patients.',
    icon: 'people',
    features: [
      'Enregistrement de nouveaux patients',
      'Recherche par nom, ID ou numéro de téléphone',
      'Fiche patient complète (antécédents, allergies)',
      'Historique des consultations',
      'Photo et documents d\'identité',
      'Export de la base patients',
    ],
  },
  appointments: {
    title: 'Gestion des Rendez-vous',
    subtitle: 'Planifier et gérer les consultations et rendez-vous des patients.',
    icon: 'calendar',
    features: [
      'Calendrier interactif des rendez-vous',
      'Planification par médecin et service',
      'Rappels automatiques (SMS/notification)',
      'Gestion des annulations et reports',
      'Vue journalière, hebdomadaire, mensuelle',
      'Statistiques de fréquentation',
    ],
  },
  prescriptions: {
    title: 'Création d\'Ordonnances',
    subtitle: 'Prescrire des médicaments et créer des ordonnances pour les patients.',
    icon: 'document-text',
    features: [
      'Prescription de médicaments',
      'Recherche dans le catalogue pharmaceutique',
      'Vérification des interactions médicamenteuses',
      'Posologie et durée de traitement',
      'Historique des prescriptions par patient',
      'Transmission automatique à la pharmacie',
    ],
  },
  'medical-records': {
    title: 'Dossiers Médicaux Électroniques',
    subtitle: 'Consulter et mettre à jour les dossiers médicaux de manière sécurisée.',
    icon: 'folder-open',
    features: [
      'Dossier médical complet par patient',
      'Notes de consultation et diagnostics',
      'Prescriptions et ordonnances',
      'Résultats d\'examens intégrés',
      'Historique chronologique',
      'Accès sécurisé par rôle',
    ],
  },
  'lab-results': {
    title: 'Résultats de Laboratoire',
    subtitle: 'Gérer les tests de laboratoire et leurs résultats.',
    icon: 'flask',
    features: [
      'Demande d\'examens de laboratoire',
      'Saisie des résultats',
      'Valeurs normales et interprétation',
      'Historique par patient',
      'Impression des résultats',
      'Alertes sur résultats critiques',
    ],
  },
  wards: {
    title: 'Services & Attribution des Lits',
    subtitle: 'Gérer les services hospitaliers et l\'occupation des lits.',
    icon: 'bed',
    features: [
      'Vue d\'ensemble des services',
      'Occupation des lits en temps réel',
      'Admission et sortie des patients',
      'Transferts inter-services',
      'Statistiques d\'occupation',
      'Plan des étages interactif',
    ],
  },
  billing: {
    title: 'Facturation & Assurance',
    subtitle: 'Gérer la facturation des patients et les réclamations d\'assurance.',
    icon: 'receipt',
    features: [
      'Création de factures détaillées',
      'Gestion des tarifs par acte',
      'Réclamations d\'assurance (SONAS, etc.)',
      'Suivi des paiements',
      'Rapports financiers',
      'Mode de paiement mobile (M-Pesa, Airtel Money)',
    ],
  },
  staff: {
    title: 'Personnel Médical',
    subtitle: 'Gérer les médecins, infirmiers et personnel de l\'hôpital.',
    icon: 'person',
    features: [
      'Répertoire du personnel',
      'Planning et horaires',
      'Spécialités et qualifications',
      'Gestion des gardes',
      'Affectation aux services',
      'Évaluation des performances',
    ],
  },
  reports: {
    title: 'Rapports Hospitaliers',
    subtitle: 'Tableaux de bord analytiques et rapports de gestion.',
    icon: 'stats-chart',
    features: [
      'Rapports d\'activité par service',
      'Statistiques de morbidité',
      'Indicateurs de qualité des soins',
      'Rapports financiers détaillés',
      'Export PDF et Excel',
      'Rapports réglementaires (DHIS2)',
    ],
  },
};

// ─── Navigator Component ─────────────────────────────────────
export function HospitalNavigator() {
  const [activeScreen, setActiveScreen] = useState('dashboard');

  // Sub-navigation state for patients module
  const [patientView, setPatientView] = useState<'list' | 'detail' | 'register'>('list');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const handleSelectPatient = useCallback((patient: Patient) => {
    setSelectedPatientId(patient.id);
    setPatientView('detail');
  }, []);

  const handleNewPatient = useCallback(() => {
    setPatientView('register');
  }, []);

  const handleBackToPatientList = useCallback(() => {
    setPatientView('list');
    setSelectedPatientId(null);
  }, []);

  const handlePatientCreated = useCallback((patient: Patient) => {
    setSelectedPatientId(patient.id);
    setPatientView('detail');
  }, []);

  // Reset patient sub-navigation when switching away
  const handleScreenChange = useCallback((screen: string) => {
    setActiveScreen(screen);
    if (screen !== 'patients') {
      setPatientView('list');
      setSelectedPatientId(null);
    }
  }, []);

  const renderContent = () => {
    if (activeScreen === 'dashboard') {
      return <HospitalDashboardContent />;
    }

    if (activeScreen === 'prescriptions') {
      return <HospitalPrescriptionsScreen />;
    }

    if (activeScreen === 'patients') {
      switch (patientView) {
        case 'detail':
          if (selectedPatientId) {
            return (
              <PatientDetailScreen
                patientId={selectedPatientId}
                onBack={handleBackToPatientList}
                onNewEncounter={() => {/* TODO: wire encounter creation */}}
                onEditPatient={() => {/* TODO: wire patient editing */}}
              />
            );
          }
          return (
            <PatientListScreen
              onSelectPatient={handleSelectPatient}
              onNewPatient={handleNewPatient}
            />
          );
        case 'register':
          return (
            <PatientRegistrationScreen
              onBack={handleBackToPatientList}
              onPatientCreated={handlePatientCreated}
            />
          );
        default:
          return (
            <PatientListScreen
              onSelectPatient={handleSelectPatient}
              onNewPatient={handleNewPatient}
            />
          );
      }
    }

    const screenDef = hospitalScreens[activeScreen];
    if (screenDef) {
      return (
        <PlaceholderScreen
          title={screenDef.title}
          subtitle={screenDef.subtitle}
          icon={screenDef.icon}
          accentColor={colors.info}
          features={screenDef.features}
        />
      );
    }

    return <HospitalDashboardContent />;
  };

  return (
    <SidebarLayout
      sections={hospitalSections}
      activeId={activeScreen}
      onSelect={handleScreenChange}
      accentColor={colors.info}
      title="Hôpital"
      subtitle="Module de gestion"
      headerIcon="business"
    >
      {renderContent()}
    </SidebarLayout>
  );
}
