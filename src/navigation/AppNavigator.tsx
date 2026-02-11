import React, { useState, useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, StyleSheet, Dimensions, Text, TouchableOpacity } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DashboardScreen } from '../screens/DashboardScreen';
import { PharmacyNavigator } from '../modules/pharmacy/PharmacyNavigator';
import { HospitalNavigator } from '../modules/hospital/HospitalNavigator';
import { OccHealthNavigator } from '../modules/occupational-health/OccHealthNavigator';
import { SettingsScreen } from '../screens/SettingsScreen';
import { PharmacyDashboardContent } from '../modules/pharmacy/screens/PharmacyDashboard';
import { HospitalDashboardContent } from '../modules/hospital/screens/HospitalDashboard';
import { OccHealthDashboardContent } from '../modules/occupational-health/screens/OccHealthDashboard';
import { OccHealthConsultationScreen } from '../modules/occupational-health/screens/OccHealthConsultationScreen';
import { PreviousVisitsScreen } from '../modules/occupational-health/screens/PreviousVisitsScreen';
import { CertificatesScreen } from '../modules/occupational-health/screens/CertificatesScreen';
import { PlaceholderScreen } from '../modules/shared/PlaceholderScreen';
import { POSScreen } from '../modules/pharmacy/screens/POSScreen';
import { InventoryScreen } from '../modules/pharmacy/screens/InventoryScreen';
import { SuppliersScreen } from '../modules/pharmacy/screens/SuppliersScreen';
import { StockAlertsScreen } from '../modules/pharmacy/screens/StockAlertsScreen';
import { ConnectivityScreen } from '../screens/ConnectivityScreen';
import { PatientListScreen } from '../modules/hospital/screens/PatientListScreen';
import { PatientDetailScreen } from '../modules/hospital/screens/PatientDetailScreen';
import { PatientRegistrationScreen } from '../modules/hospital/screens/PatientRegistrationScreen';
// New Hospital Screens
import { EmergencyDashboardScreen } from '../modules/hospital/screens/EmergencyDashboardScreen';
import { TriageScreen } from '../modules/hospital/screens/TriageScreen';
import { AppointmentSchedulerScreen } from '../modules/hospital/screens/AppointmentSchedulerScreen';
import { WardManagementScreen } from '../modules/hospital/screens/WardManagementScreen';
import { AdmissionScreen } from '../modules/hospital/screens/AdmissionScreen';
import { MedicationAdministrationScreen } from '../modules/hospital/screens/MedicationAdministrationScreen';
import { LaboratoryScreen } from '../modules/hospital/screens/LaboratoryScreen';
import { ClinicalNotesScreen } from '../modules/hospital/screens/ClinicalNotesScreen';
import { HospitalBillingScreen } from '../modules/hospital/screens/HospitalBillingScreen';
import { SidebarLayout, SidebarSection } from '../components/SidebarLayout';
import { colors, borderRadius } from '../theme/theme';
import { Patient } from '../models/Patient';
import { selectActiveModules, selectAllFeatures, logout as logoutAction } from '../store/slices/authSlice';
import { ModuleType } from '../models/License';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

// ═══════════════════════════════════════════════════════════════
// No License Fallback Screen — with logout/reset button
// ═══════════════════════════════════════════════════════════════
function NoLicenseScreen() {
  const dispatch = useDispatch();

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('auth_session');
      await AsyncStorage.removeItem('device_activation_info');
      dispatch(logoutAction());
      // Force reload to get fresh state
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: colors.background }}>
      <Ionicons name="lock-closed" size={64} color={colors.textSecondary} />
      <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginTop: 16 }}>
        Aucune licence active
      </Text>
      <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8, maxWidth: 320 }}>
        Les modules n'ont pas été chargés. Veuillez vous reconnecter ou contacter votre administrateur.
      </Text>
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginTop: 24,
          backgroundColor: colors.primary,
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 12,
        }}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Ionicons name="log-out-outline" size={20} color="#FFF" />
        <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 15 }}>
          Retour à la connexion
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Dynamic sidebar sections based on licensed modules and features
// ═══════════════════════════════════════════════════════════════
const createDynamicSections = (
  activeModules: ModuleType[], 
  hasFeature: (feature: string) => boolean
): SidebarSection[] => {
  const sections: SidebarSection[] = [
    {
      title: 'Général',
      items: [
        { id: 'dashboard', label: 'Tableau de Bord', icon: 'grid-outline', iconActive: 'grid' },
      ],
    }
  ];

  // Add Pharmacy section if user has pharmacy access
  if (activeModules.includes('PHARMACY') || activeModules.includes('TRIAL')) {
    const pharmacyItems = [
      { id: 'ph-dashboard', label: 'Vue d\'Ensemble', icon: 'pulse-outline', iconActive: 'pulse' }
    ];

    // Add features based on license
    if (hasFeature('pos_system')) {
      pharmacyItems.push({ id: 'ph-pos', label: 'Point de Vente', icon: 'cart-outline', iconActive: 'cart' });
    }
    
    if (hasFeature('basic_inventory') || hasFeature('advanced_inventory')) {
      pharmacyItems.push({ id: 'ph-inventory', label: 'Inventaire', icon: 'cube-outline', iconActive: 'cube', badge: 7 });
    }
    
    if (hasFeature('prescription_management')) {
      pharmacyItems.push({ id: 'ph-prescriptions', label: 'Ordonnances', icon: 'document-text-outline', iconActive: 'document-text' });
    }
    
    if (hasFeature('supplier_management')) {
      pharmacyItems.push({ id: 'ph-suppliers', label: 'Fournisseurs', icon: 'people-outline', iconActive: 'people' });
    }
    
    if (hasFeature('stock_alerts')) {
      pharmacyItems.push({ id: 'ph-stock-alerts', label: 'Alertes Stock', icon: 'alert-circle-outline', iconActive: 'alert-circle', badge: 3 });
    }
    
    if (hasFeature('basic_reporting') || hasFeature('advanced_reporting')) {
      pharmacyItems.push({ id: 'ph-reports', label: 'Rapports Ventes', icon: 'bar-chart-outline', iconActive: 'bar-chart' });
    }

    sections.push({
      title: 'Pharmacie',
      items: pharmacyItems
    });
  }

  // Add Hospital section if user has hospital access
  if (activeModules.includes('HOSPITAL') || activeModules.includes('TRIAL')) {
    const hospitalItems = [
      { id: 'hp-dashboard', label: 'Vue d\'Ensemble', icon: 'medkit-outline', iconActive: 'medkit' }
    ];

    // Emergency & Triage
    hospitalItems.push({ id: 'hp-emergency', label: 'Urgences', icon: 'pulse-outline', iconActive: 'pulse', badge: 8 } as any);
    hospitalItems.push({ id: 'hp-triage', label: 'Triage', icon: 'fitness-outline', iconActive: 'fitness' } as any);

    // Add features based on license
    if (hasFeature('patient_management')) {
      hospitalItems.push({ id: 'hp-patients', label: 'Gestion Patients', icon: 'body-outline', iconActive: 'body' });
    }
    
    if (hasFeature('appointment_scheduling') || hasFeature('advanced_scheduling')) {
      hospitalItems.push({ id: 'hp-appointments', label: 'Rendez-vous', icon: 'calendar-outline', iconActive: 'calendar', badge: 5 });
    }
    
    // Ward & Admission Management
    if (hasFeature('multi_department')) {
      hospitalItems.push({ id: 'hp-wards', label: 'Services & Lits', icon: 'bed-outline', iconActive: 'bed' });
      hospitalItems.push({ id: 'hp-admissions', label: 'Hospitalisations', icon: 'enter-outline', iconActive: 'enter' } as any);
    }

    // Medication Administration (MAR)
    hospitalItems.push({ id: 'hp-mar', label: 'Adm. Médicaments', icon: 'medical-outline', iconActive: 'medical' } as any);

    if (hasFeature('medical_records')) {
      hospitalItems.push({ id: 'hp-clinical-notes', label: 'Notes Cliniques', icon: 'document-text-outline', iconActive: 'document-text' } as any);
    }
    
    if (hasFeature('lab_integration')) {
      hospitalItems.push({ id: 'hp-lab-results', label: 'Laboratoire', icon: 'flask-outline', iconActive: 'flask', badge: 2 });
    }
    
    if (hasFeature('basic_billing') || hasFeature('billing_management')) {
      hospitalItems.push({ id: 'hp-billing', label: 'Facturation', icon: 'receipt-outline', iconActive: 'receipt' });
    }

    sections.push({
      title: 'Hôpital',
      items: hospitalItems
    });
  }

  // Add Occupational Health section if user has occ health access
  if (activeModules.includes('OCCUPATIONAL_HEALTH') || activeModules.includes('TRIAL')) {
    const occHealthItems = [
      { id: 'oh-dashboard', label: 'Vue d\'Ensemble', icon: 'construct-outline', iconActive: 'construct' }
    ];

    if (hasFeature('worker_management')) {
      occHealthItems.push({ id: 'oh-workers', label: 'Travailleurs', icon: 'people-outline', iconActive: 'people' });
    }

    if (hasFeature('medical_examinations')) {
      occHealthItems.push({ id: 'oh-exams', label: 'Visites Médicales', icon: 'medkit-outline', iconActive: 'medkit', badge: 8 } as any);
      occHealthItems.push({ id: 'oh-previous-visits', label: 'Historique Visites', icon: 'time-outline', iconActive: 'time' } as any);
    }

    if (hasFeature('fitness_certificates')) {
      occHealthItems.push({ id: 'oh-certificates', label: 'Certificats', icon: 'shield-checkmark-outline', iconActive: 'shield-checkmark' });
    }

    if (hasFeature('incident_management') || hasFeature('basic_incident_reporting')) {
      occHealthItems.push({ id: 'oh-incidents', label: 'Incidents', icon: 'warning-outline', iconActive: 'warning', badge: 3 } as any);
    }

    if (hasFeature('occupational_disease_tracking')) {
      occHealthItems.push({ id: 'oh-diseases', label: 'Maladies Pro.', icon: 'fitness-outline', iconActive: 'fitness' });
    }

    if (hasFeature('surveillance_programs')) {
      occHealthItems.push({ id: 'oh-surveillance', label: 'Surveillance', icon: 'eye-outline', iconActive: 'eye' });
    }

    if (hasFeature('risk_assessment')) {
      occHealthItems.push({ id: 'oh-risk', label: 'Risques', icon: 'alert-circle-outline', iconActive: 'alert-circle' });
    }

    if (hasFeature('ppe_management')) {
      occHealthItems.push({ id: 'oh-ppe', label: 'Gestion EPI', icon: 'body-outline', iconActive: 'body' });
    }

    if (hasFeature('advanced_reporting') || hasFeature('basic_reporting')) {
      occHealthItems.push({ id: 'oh-reports', label: 'Rapports SST', icon: 'stats-chart-outline', iconActive: 'stats-chart' });
    }

    sections.push({
      title: 'Méd. du Travail',
      items: occHealthItems
    });
  }

  return sections;
};

// ═══════════════════════════════════════════════════════════════
// Pharmacy placeholder screen definitions
// ═══════════════════════════════════════════════════════════════
const pharmacyScreens: Record<string, { title: string; subtitle: string; icon: any; features: string[] }> = {
  'ph-pos': { title: 'Point de Vente (POS)', subtitle: 'Système de caisse intelligent pour traiter les ventes rapidement.', icon: 'cart', features: ['Scan code-barres', 'Recherche rapide', 'Remises automatiques', 'Impression de reçus', 'Multi-paiement', 'Historique transactions'] },
  'ph-inventory': { title: 'Inventaire Médicaments', subtitle: 'Gérer le stock complet avec suivi en temps réel.', icon: 'cube', features: ['Catalogue complet', 'Suivi lots & expiration', 'Alertes réapprovisionnement', 'Catégorisation DCI/marque', 'Import/Export stock', 'Historique mouvements'] },
  'ph-prescriptions': { title: 'Gestion Ordonnances', subtitle: 'Traiter et délivrer les ordonnances médicales.', icon: 'document-text', features: ['Validation ordonnances', 'Interactions médicamenteuses', 'Délivrance partielle', 'Historique par patient', 'Liaison dossier médical', 'Ordonnances en attente'] },
  'ph-suppliers': { title: 'Gestion Fournisseurs', subtitle: 'Gérer les fournisseurs, commandes et livraisons.', icon: 'people', features: ['Répertoire fournisseurs', 'Bons de commande', 'Suivi livraisons', 'Historique achats', 'Comparaison prix', 'Gestion retours'] },
  'ph-stock-alerts': { title: 'Alertes de Stock', subtitle: 'Surveillance des niveaux de stock et expirations.', icon: 'alert-circle', features: ['Alertes stock bas', 'Proches expiration', 'Produits périmés', 'Seuils personnalisables', 'Notifications auto', 'Rapports alertes'] },
  'ph-reports': { title: 'Rapports de Ventes', subtitle: 'Analyses détaillées des performances commerciales.', icon: 'bar-chart', features: ['Ventes jour/semaine/mois', 'Top produits vendus', 'Marge bénéficiaire', 'Tendances & prévisions', 'Export PDF/Excel', 'Comparaison périodes'] },
};

// ═══════════════════════════════════════════════════════════════
// Hospital placeholder screen definitions
// ═══════════════════════════════════════════════════════════════
const hospitalScreens: Record<string, { title: string; subtitle: string; icon: any; features: string[] }> = {
  'hp-appointments': { title: 'Gestion Rendez-vous', subtitle: 'Planifier et gérer les consultations.', icon: 'calendar', features: ['Calendrier interactif', 'Planification par médecin', 'Rappels automatiques', 'Annulations & reports', 'Vue jour/semaine/mois', 'Statistiques fréquentation'] },
  'hp-medical-records': { title: 'Dossiers Médicaux', subtitle: 'Consulter et mettre à jour les dossiers.', icon: 'folder-open', features: ['Dossier complet par patient', 'Notes consultation', 'Prescriptions intégrées', 'Résultats examens', 'Historique chronologique', 'Accès sécurisé par rôle'] },
  'hp-lab-results': { title: 'Résultats Laboratoire', subtitle: 'Gérer les tests et résultats.', icon: 'flask', features: ['Demande examens', 'Saisie résultats', 'Valeurs normales', 'Historique par patient', 'Impression résultats', 'Alertes critiques'] },
  'hp-wards': { title: 'Services & Lits', subtitle: 'Gérer les services et l\'occupation des lits.', icon: 'bed', features: ['Vue services', 'Occupation temps réel', 'Admission & sortie', 'Transferts', 'Statistiques occupation', 'Plan des étages'] },
  'hp-billing': { title: 'Facturation & Assurance', subtitle: 'Gérer la facturation et les assurances.', icon: 'receipt', features: ['Factures détaillées', 'Tarifs par acte', 'Réclamations assurance', 'Suivi paiements', 'Rapports financiers', 'Paiement mobile'] },
  'hp-staff': { title: 'Personnel Médical', subtitle: 'Gérer le personnel de l\'hôpital.', icon: 'person', features: ['Répertoire personnel', 'Planning & horaires', 'Spécialités', 'Gestion gardes', 'Affectation services', 'Évaluation performances'] },
};

// ═══════════════════════════════════════════════════════════════
// Occupational Health placeholder screen definitions
// ═══════════════════════════════════════════════════════════════
const occHealthScreens: Record<string, { title: string; subtitle: string; icon: any; features: string[] }> = {
  'oh-workers': { title: 'Gestion des Travailleurs', subtitle: 'Registre multi-secteur des travailleurs avec profils de risque.', icon: 'people', features: ['Enregistrement multi-secteur', 'Profil de risque par secteur & poste', 'Historique d\'exposition', 'Suivi EPI', 'Gestion multi-entreprise', 'Export CNSS'] },
  'oh-exams': { title: 'Visites Médicales', subtitle: 'Examens d\'aptitude adaptés par secteur (ILO C161).', icon: 'medkit', features: ['Visite d\'embauche', 'Visites périodiques', 'Examens sectoriels adaptés', 'Bilan ergonomique & stress', 'Évaluation santé mentale', 'Tests de risque sectoriel'] },
  'oh-certificates': { title: 'Certificats d\'Aptitude', subtitle: 'Gestion des certificats médicaux.', icon: 'shield-checkmark', features: ['Émission certificats', 'Suivi expirations', 'Alertes renouvellement', 'Classifications aptitude', 'Historique par travailleur', 'Signature numérique'] },
  'oh-incidents': { title: 'Incidents & Accidents', subtitle: 'Signalement et investigation ISO 45001 §10.2.', icon: 'warning', features: ['Déclaration accident', 'Classification gravité', 'Investigation causes racines', 'Actions correctives (CAPA)', 'Calcul LTIFR/TRIFR/SR', 'Rapports réglementaires par secteur'] },
  'oh-diseases': { title: 'Maladies Professionnelles', subtitle: 'Classification ILO R194 — tous secteurs.', icon: 'fitness', features: ['TMS & troubles ergonomiques', 'Burnout & risques psychosociaux', 'Pneumoconioses & pathologies respiratoires', 'Déclaration CNSS', 'Suivi indemnisations', 'Registre par secteur'] },
  'oh-surveillance': { title: 'Programmes de Surveillance', subtitle: 'Surveillance médicale par secteur et risque.', icon: 'eye', features: ['Programmes par agent de risque', 'Surveillance musculo-squelettique', 'Surveillance psychosociale', 'Seuils d\'alerte par secteur', 'Calendrier examens', 'Rapports par entreprise'] },
  'oh-risk': { title: 'Évaluation des Risques', subtitle: 'ISO 45001 §6.1 — risques par secteur et poste.', icon: 'alert-circle', features: ['Matrice de risques par secteur', 'Évaluation ergonomique', 'Risques psychosociaux', 'Hiérarchie des contrôles', 'Plan de prévention', 'Cartographie zones à risque'] },
  'oh-ppe': { title: 'Gestion EPI', subtitle: 'Équipements de Protection Individuelle.', icon: 'body', features: ['Catalogue EPI', 'Attribution par poste', 'Dates péremption', 'Contrôle conformité', 'Historique distribution', 'Alertes renouvellement'] },
  'oh-reports': { title: 'Rapports SST', subtitle: 'Tableaux de bord santé-sécurité au travail.', icon: 'stats-chart', features: ['Dashboard SST temps réel', 'Rapports mensuels/annuels', 'Statistiques aptitude', 'Taux fréquence/gravité', 'Tendances incidents', 'Export PDF/Excel'] },
};

// ═══════════════════════════════════════════════════════════════
// Desktop App — Unified Sidebar with Dynamic Modules
// ═══════════════════════════════════════════════════════════════
function DesktopApp() {
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const activeModules = useSelector(selectActiveModules);
  const allFeatures = useSelector(selectAllFeatures);

  // Patient sub-navigation state
  const [patientView, setPatientView] = useState<'list' | 'detail' | 'register' | 'edit'>('list');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  // Occupational health draft management
  const [draftToLoad, setDraftToLoad] = useState<string | null>(null);

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatientId(patient.id);
    setPatientView('detail');
  };
  const handleNewPatient = () => setPatientView('register');
  const handleEditPatient = (patient: Patient) => {
    setEditingPatient(patient);
    setPatientView('edit');
  };

  const handleResumeDraft = (draftId: string) => {
    setDraftToLoad(draftId);
    setActiveScreen('oh-exams');
  };

  const handleNewConsultation = () => {
    setDraftToLoad(null);
    setActiveScreen('oh-exams');
  };
  const handleBackToPatientList = () => { 
    setPatientView('list'); 
    setSelectedPatientId(null); 
    setEditingPatient(null);
  };
  const handlePatientCreated = (patient: Patient) => { 
    setSelectedPatientId(patient.id); 
    setPatientView('detail'); 
    setEditingPatient(null);
  };
  const handlePatientUpdated = (patient: Patient) => {
    setSelectedPatientId(patient.id);
    setPatientView('detail');
    setEditingPatient(null);
  };

  const handleScreenChange = (screen: string) => {
    setActiveScreen(screen);
    if (screen !== 'hp-patients') { 
      setPatientView('list'); 
      setSelectedPatientId(null); 
      setEditingPatient(null);
    }
  };

  // Create dynamic sidebar sections based on user's licenses
  const dynamicSections = useMemo(() => {
    const hasFeature = (feature: string) => allFeatures.includes(feature);
    const sections = createDynamicSections(activeModules, hasFeature);
    
    // Always add settings section
    sections.push({
      title: 'Système',
      items: [
        { id: 'connectivity', label: 'Connectivité', icon: 'wifi-outline', iconActive: 'wifi' },
        { id: 'settings', label: 'Paramètres', icon: 'settings-outline', iconActive: 'settings' },
      ],
    });
    
    return sections;
  }, [activeModules, allFeatures]);

  const renderContent = () => {
    // Main screens
    if (activeScreen === 'dashboard') return <DashboardScreen />;
    if (activeScreen === 'connectivity') return <ConnectivityScreen />;
    if (activeScreen === 'settings') return <SettingsScreen />;

    // Pharmacy screens
    if (activeScreen === 'ph-dashboard') return <PharmacyDashboardContent />;
    if (activeScreen === 'ph-pos') return <POSScreen />;
    if (activeScreen === 'ph-inventory') return <InventoryScreen />;
    if (activeScreen === 'ph-suppliers') return <SuppliersScreen />;
    if (activeScreen === 'ph-stock-alerts') return <StockAlertsScreen />;
    // Remaining pharmacy screens that don't have components yet
    if (pharmacyScreens[activeScreen]) {
      const s = pharmacyScreens[activeScreen];
      return <PlaceholderScreen title={s.title} subtitle={s.subtitle} icon={s.icon} accentColor={colors.primary} features={s.features} />;
    }

    // Hospital screens
    if (activeScreen === 'hp-dashboard') return <HospitalDashboardContent />;
    if (activeScreen === 'hp-emergency') return <EmergencyDashboardScreen />;
    if (activeScreen === 'hp-triage') return <TriageScreen />;
    if (activeScreen === 'hp-appointments') return <AppointmentSchedulerScreen />;
    if (activeScreen === 'hp-wards') return <WardManagementScreen />;
    if (activeScreen === 'hp-admissions') return <AdmissionScreen />;
    if (activeScreen === 'hp-mar') return <MedicationAdministrationScreen />;
    if (activeScreen === 'hp-lab-results') return <LaboratoryScreen />;
    if (activeScreen === 'hp-clinical-notes') return <ClinicalNotesScreen />;
    if (activeScreen === 'hp-billing') return <HospitalBillingScreen />;
    if (activeScreen === 'hp-patients') {
      if (patientView === 'detail' && selectedPatientId) {
        return (
          <PatientDetailScreen
            patientId={selectedPatientId}
            onBack={handleBackToPatientList}
            onNewEncounter={() => {}}
            onEditPatient={handleEditPatient}
          />
        );
      }
      if (patientView === 'register') {
        return (
          <PatientRegistrationScreen
            onBack={handleBackToPatientList}
            onPatientCreated={handlePatientCreated}
          />
        );
      }
      if (patientView === 'edit' && editingPatient) {
        return (
          <PatientRegistrationScreen
            onBack={handleBackToPatientList}
            onPatientUpdated={handlePatientUpdated}
            editingPatient={editingPatient}
          />
        );
      }
      return (
        <PatientListScreen
          onSelectPatient={handleSelectPatient}
          onNewPatient={handleNewPatient}
        />
      );
    }
    if (hospitalScreens[activeScreen]) {
      const s = hospitalScreens[activeScreen];
      return <PlaceholderScreen title={s.title} subtitle={s.subtitle} icon={s.icon} accentColor={colors.info} features={s.features} />;
    }

    // Occupational Health screens
    if (activeScreen === 'oh-dashboard') return <OccHealthDashboardContent />;
    if (activeScreen === 'oh-exams') return <OccHealthConsultationScreen draftToLoad={draftToLoad} onDraftLoaded={() => setDraftToLoad(null)} />;
    if (activeScreen === 'oh-previous-visits') return <PreviousVisitsScreen onResumeDraft={handleResumeDraft} onNewConsultation={handleNewConsultation} />;
    if (activeScreen === 'oh-certificates') return <CertificatesScreen />;
    if (occHealthScreens[activeScreen]) {
      const s = occHealthScreens[activeScreen];
      return <PlaceholderScreen title={s.title} subtitle={s.subtitle} icon={s.icon} accentColor="#D97706" features={s.features} />;
    }

    return <DashboardScreen />;
  };

  // Determine accent color based on active section
  const getAccentColor = () => {
    if (activeScreen.startsWith('ph-')) return colors.primary;
    if (activeScreen.startsWith('hp-')) return colors.info;
    if (activeScreen.startsWith('oh-')) return '#D97706';
    return colors.primary;
  };

  // Check if user has any licensed modules
  if (activeModules.length === 0) {
    return <NoLicenseScreen />;
  }

  return (
    <SidebarLayout
      sections={dynamicSections}
      activeId={activeScreen}
      onSelect={handleScreenChange}
      accentColor={getAccentColor()}
      title="HK Management"
      subtitle="Système de Gestion de Santé"
      headerIcon="medkit"
    >
      {renderContent()}
    </SidebarLayout>
  );
}

// ═══════════════════════════════════════════════════════════════
// Mobile App — Dynamic Bottom Tabs Based on Licensed Modules
// ═══════════════════════════════════════════════════════════════
type RootTabParamList = {
  Dashboard: undefined;
  Pharmacy?: undefined;
  Hospital?: undefined;
  OccHealth?: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

function MobileApp() {
  const activeModules = useSelector(selectActiveModules);
  const hasPharmacyAccess = activeModules.includes('PHARMACY') || activeModules.includes('TRIAL');
  const hasHospitalAccess = activeModules.includes('HOSPITAL') || activeModules.includes('TRIAL');
  const hasOccHealthAccess = activeModules.includes('OCCUPATIONAL_HEALTH') || activeModules.includes('TRIAL');

  // If no modules are licensed, show locked screen
  if (activeModules.length === 0) {
    return <NoLicenseScreen />;
  }

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          if (route.name === 'Dashboard') iconName = focused ? 'grid' : 'grid-outline';
          else if (route.name === 'Pharmacy') iconName = focused ? 'medical' : 'medical-outline';
          else if (route.name === 'Hospital') iconName = focused ? 'business' : 'business-outline';
          else if (route.name === 'OccHealth') iconName = focused ? 'construct' : 'construct-outline';
          else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
          else iconName = 'grid-outline';

          return (
            <View style={focused ? tabStyles.activeIconWrap : undefined}>
              <Ionicons name={iconName} size={22} color={color} />
            </View>
          );
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.outline,
          elevation: 0,
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowColor: '#0F172A',
          shadowOffset: { height: -2, width: 0 },
          height: Platform.OS === 'web' ? 64 : 72,
          paddingBottom: Platform.OS === 'web' ? 8 : 16,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        headerStyle: {
          backgroundColor: colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.outline,
        },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' as '700', fontSize: 18, color: colors.text },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ title: 'Tableau de Bord', headerTitle: 'HK Management Systems' }} 
      />
      
      {hasPharmacyAccess && (
        <Tab.Screen 
          name="Pharmacy" 
          component={PharmacyNavigator} 
          options={{ title: 'Pharmacie', headerShown: false }} 
        />
      )}
      
      {hasHospitalAccess && (
        <Tab.Screen 
          name="Hospital" 
          component={HospitalNavigator} 
          options={{ title: 'Hôpital', headerShown: false }} 
        />
      )}
      
      {hasOccHealthAccess && (
        <Tab.Screen 
          name="OccHealth" 
          component={OccHealthNavigator} 
          options={{ title: 'Méd. Travail', headerShown: false }} 
        />
      )}
      
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ title: 'Paramètres', headerTitle: 'Paramètres du Système' }} 
      />
    </Tab.Navigator>
  );
}

// ═══════════════════════════════════════════════════════════════
// Export — picks Desktop or Mobile layout
// ═══════════════════════════════════════════════════════════════
export function AppNavigator() {
  return isDesktop ? <DesktopApp /> : <MobileApp />;
}

const tabStyles = StyleSheet.create({
  activeIconWrap: {
    backgroundColor: colors.primaryFaded,
    borderRadius: borderRadius.md,
    padding: 6,
  },
});