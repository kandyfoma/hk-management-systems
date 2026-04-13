import React, { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { SidebarLayout, SidebarSection } from '../../components/SidebarLayout';
import { HospitalDashboardContent } from './screens/HospitalDashboard';
import { HospitalPrescriptionsScreen } from './screens/HospitalPrescriptionsScreen';
import { ConsultationHistoryScreen } from './screens/ConsultationHistoryScreen';
import { PatientListScreen } from './screens/PatientListScreen';
import { PatientDetailScreen } from './screens/PatientDetailScreen';
import { PatientRegistrationScreen } from './screens/PatientRegistrationScreen';
import { EmergencyDashboardScreen } from './screens/EmergencyDashboardScreen';
import { TriageScreen } from './screens/TriageScreen';
import { HospitalPatientIntakeScreen } from './screens/HospitalPatientIntakeScreen';
import { HospitalConsultationScreen } from './screens/HospitalConsultationScreen';
import { AppointmentSchedulerScreen } from './screens/AppointmentSchedulerScreen';
import { WardManagementScreen } from './screens/WardManagementScreen';
import { AdmissionScreen } from './screens/AdmissionScreen';
import { MedicationAdministrationScreen } from './screens/MedicationAdministrationScreen';
import { ClinicalNotesScreen } from './screens/ClinicalNotesScreen';
import { LaboratoryScreen } from './screens/LaboratoryScreen';
import { HospitalBillingScreen } from './screens/HospitalBillingScreen';
import { PlaceholderScreen } from '../shared/PlaceholderScreen';
import { colors } from '../../theme/theme';
import { Patient } from '../../models/Patient';

// ─── Sidebar Menu Configuration ──────────────────────────────
const hospitalSections: SidebarSection[] = [
  {
    title: 'Principal',
    items: [
      { id: 'dashboard', label: 'Vue d\'Ensemble', icon: 'grid-outline', iconActive: 'grid' },
      { id: 'emergency', label: 'Urgences', icon: 'pulse-outline', iconActive: 'pulse', badge: 8 },
      { id: 'triage', label: 'Triage', icon: 'heart-outline', iconActive: 'heart' },
      { id: 'patients', label: 'Gestion Patients', icon: 'people-outline', iconActive: 'people' },
    ],
  },
  {
    title: 'Services Cliniques',
    items: [
      { id: 'intake', label: 'Accueil Consultation', icon: 'person-add-outline', iconActive: 'person-add' },
      { id: 'consultation', label: 'Consultation', icon: 'medkit-outline', iconActive: 'medkit' },
      { id: 'consultations', label: 'Historique Consult.', icon: 'time-outline', iconActive: 'time' },
      { id: 'appointments', label: 'Rendez-vous', icon: 'calendar-outline', iconActive: 'calendar', badge: 5 },
      { id: 'prescriptions', label: 'Ordonnances', icon: 'document-text-outline', iconActive: 'document-text' },
      { id: 'clinical-notes', label: 'Notes Cliniques', icon: 'document-text-outline', iconActive: 'document-text' },
      { id: 'medical-records', label: 'Dossiers Médicaux', icon: 'folder-open-outline', iconActive: 'folder-open' },
      { id: 'lab-results', label: 'Laboratoire', icon: 'flask-outline', iconActive: 'flask', badge: 2 },
    ],
  },
  {
    title: 'Hospitalisation',
    items: [
      { id: 'wards', label: 'Services & Lits', icon: 'home-outline', iconActive: 'home' },
      { id: 'admissions', label: 'Hospitalisations', icon: 'log-in-outline', iconActive: 'log-in' },
      { id: 'mar', label: 'Adm. Médicaments', icon: 'medkit-outline', iconActive: 'medkit' },
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
  consultations: {
    title: 'Historique des Consultations',
    subtitle: 'Consulter l\'historique complet des consultations médicales.',
    icon: 'time',
    features: [
      'Historique complet par patient',
      'Filtrage par type, statut et période',
      'Détails des diagnostics et traitements',
      'Recherche avancée',
      'Statistiques de consultation',
      'Export des données',
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

  // Hospital consultation state
  const [consultationPatientId, setConsultationPatientId] = useState<string | null>(null);
  const [pendingConsultationToLoad, setPendingConsultationToLoad] = useState<string | null>(null);

  // Emergency/Triage refresh trigger
  const [emergencyRefreshTrigger, setEmergencyRefreshTrigger] = useState(0);

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

  // Hospital consultation handlers
  const handleStartConsultation = useCallback((patient: Patient) => {
    setConsultationPatientId(patient.id);
    setActiveScreen('consultation');
  }, []);

  const handleNavigateToConsultation = useCallback((pendingId?: string) => {
    setConsultationPatientId(null);
    setPendingConsultationToLoad(pendingId || null);
    setActiveScreen('consultation');
  }, []);

  const handleConsultationComplete = useCallback(() => {
    setConsultationPatientId(null);
    setActiveScreen('consultations');
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
      return <HospitalDashboardContent onNavigate={handleScreenChange} />;
    }

    if (activeScreen === 'emergency') {
      return (
        <EmergencyDashboardScreen
          key={`emergency-${emergencyRefreshTrigger}`}
          onNavigateToTriage={() => setActiveScreen('triage')}
        />
      );
    }

    if (activeScreen === 'triage') {
      return (
        <TriageScreen
          onNavigateToRegisterPatient={() => {
            setActiveScreen('patients');
            setPatientView('register');
          }}
          onTriageSaved={() => {
            setEmergencyRefreshTrigger(prev => prev + 1);
          }}
          onNavigateToEmergency={() => {
            setEmergencyRefreshTrigger(prev => prev + 1);
            setActiveScreen('emergency');
          }}
        />
      );
    }

    if (activeScreen === 'intake') {
      return (
        <HospitalPatientIntakeScreen
          onConsultationQueued={() => {}}
          onNavigateToConsultation={handleNavigateToConsultation}
        />
      );
    }

    if (activeScreen === 'consultation') {
      return (
        <HospitalConsultationScreen
          patientId={consultationPatientId || undefined}
          pendingConsultationToLoad={pendingConsultationToLoad}
          onPendingLoaded={() => setPendingConsultationToLoad(null)}
          onBack={() => setActiveScreen('patients')}
          onComplete={handleConsultationComplete}
        />
      );
    }

    if (activeScreen === 'consultations') {
      return (
        <ConsultationHistoryScreen
          onBack={() => setActiveScreen('dashboard')}
        />
      );
    }

    if (activeScreen === 'prescriptions') {
      return <HospitalPrescriptionsScreen />;
    }

    if (activeScreen === 'appointments') {
      return <AppointmentSchedulerScreen />;
    }

    if (activeScreen === 'wards') {
      return <WardManagementScreen />;
    }

    if (activeScreen === 'admissions') {
      return <AdmissionScreen />;
    }

    if (activeScreen === 'mar') {
      return <MedicationAdministrationScreen />;
    }

    if (activeScreen === 'clinical-notes') {
      return <ClinicalNotesScreen />;
    }

    if (activeScreen === 'lab-results') {
      return <LaboratoryScreen />;
    }

    if (activeScreen === 'billing') {
      return <HospitalBillingScreen />;
    }

    if (activeScreen === 'patients') {
      switch (patientView) {
        case 'detail':
          if (selectedPatientId) {
            return (
              <PatientDetailScreen
                patientId={selectedPatientId}
                onBack={handleBackToPatientList}
                onNewEncounter={handleStartConsultation}
                onEditPatient={() => {/* TODO: wire patient editing */}}
                onGoToTriage={(patient, encounterId) => {
                  setActiveScreen('triage');
                }}
                onGoToConsultation={(patient, encounterId) => {
                  handleStartConsultation(patient);
                }}
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
