import React, { useState, useMemo, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, StyleSheet, Dimensions, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
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
import { OHPatientIntakeScreen } from '../modules/occupational-health/screens/OHPatientIntakeScreen';
import { IncidentsScreen } from '../modules/occupational-health/screens/IncidentsScreen';
import { IncidentDashboardScreen } from '../modules/occupational-health/screens/IncidentDashboardScreen';
import { DiseasesScreen } from '../modules/occupational-health/screens/DiseasesScreen';
import { SurveillanceScreen } from '../modules/occupational-health/screens/SurveillanceScreen';
import { RiskAssessmentScreen } from '../modules/occupational-health/screens/RiskAssessmentScreen';
import { PPEManagementScreen } from '../modules/occupational-health/screens/PPEManagementScreen';
import { ReportsScreen } from '../modules/occupational-health/screens/ReportsScreen';
import { ComplianceScreen } from '../modules/occupational-health/screens/ComplianceScreen';
import { AnalyticsScreen } from '../modules/occupational-health/screens/AnalyticsScreen';
import { ProtocolManagementScreen } from '../modules/occupational-health/screens/ProtocolManagementScreen';
import { PersonnelRegistryScreen } from '../modules/occupational-health/screens/PersonnelRegistryScreen';
import { EnterpriseManagementScreen } from '../modules/occupational-health/screens/WorkerAndEnterpriseScreen';
import { MedicalTestVisualizationScreen, ExitExamScreen } from '../modules/occupational-health/screens/MedicalTestVisualizationScreen';
import { DiseaseRegistryScreen, HealthScreeningFormScreen } from '../modules/occupational-health/screens/DiseaseRegistryAndHealthScreeningScreen';
import { ExposureMonitoringDashboard, RegulatoryReportsScreen } from '../modules/occupational-health/screens/ExposureAndReportingScreen';
import { ISO45001DashboardScreen, ISO27001DashboardScreen } from '../modules/occupational-health/screens/ComplianceDashboardsScreen';
import { MedicalExamManagementScreen } from '../modules/occupational-health/screens/MedicalExamManagementScreen';
import { WorkerRiskProfileScreen } from '../modules/occupational-health/screens/WorkerRiskProfileScreen';
import { OverexposureAlertScreen } from '../modules/occupational-health/screens/OverexposureAlertScreen';
import { PPEComplianceRecordScreen } from '../modules/occupational-health/screens/PPEComplianceRecordScreen';
import { AudiometryScreen } from '../modules/occupational-health/screens/AudiometryScreen';
import { SpirometryScreen } from '../modules/occupational-health/screens/SpirometryScreen';
import { VisionTestScreen } from '../modules/occupational-health/screens/VisionTestScreen';
import { PPEComplianceScreen } from '../modules/occupational-health/screens/PPEComplianceScreen';
import { XrayImagingScreen } from '../modules/occupational-health/screens/XrayImagingScreen';
import { DrugAlcoholScreeningScreen } from '../modules/occupational-health/screens/DrugAlcoholScreeningScreen';
import { MedicalTestCatalogScreen } from '../modules/occupational-health/screens/MedicalTestCatalogScreen';
import { AudiometryDashboardScreen } from '../modules/occupational-health/screens/AudiometryDashboardScreen';
import { SpirometryDashboardScreen } from '../modules/occupational-health/screens/SpirometryDashboardScreen';
import { VisionDashboardScreen } from '../modules/occupational-health/screens/VisionDashboardScreen';
import { XrayDashboardScreen } from '../modules/occupational-health/screens/XrayDashboardScreen';
import { DrugAlcoholDashboardScreen } from '../modules/occupational-health/screens/DrugAlcoholDashboardScreen';
import { PPEComplianceDashboardScreen } from '../modules/occupational-health/screens/PPEComplianceDashboardScreen';
import { ExamsDashboardScreen } from '../modules/occupational-health/screens/ExamsDashboardScreen';
import { HealthScreeningDashboardScreen } from '../modules/occupational-health/screens/HealthScreeningDashboardScreen';
import { ExitExamsDashboardScreen } from '../modules/occupational-health/screens/ExitExamsDashboardScreen';
import { DiseasesDashboardScreen } from '../modules/occupational-health/screens/DiseasesDashboardScreen';
import { HeavyMetalsDashboardScreen } from '../modules/occupational-health/screens/HeavyMetalsDashboardScreen';
import { FitnessDashboardScreen } from '../modules/occupational-health/screens/FitnessDashboardScreen';
import { CAPADashboardScreen } from '../modules/occupational-health/screens/CAPADashboardScreen';
import { AudiometryListScreen } from '../modules/occupational-health/screens/AudiometryListScreen';
import { SpirometryListScreen } from '../modules/occupational-health/screens/SpirometryListScreen';
import { VisionTestListScreen } from '../modules/occupational-health/screens/VisionTestListScreen';
import { XrayImagingListScreen } from '../modules/occupational-health/screens/XrayImagingListScreen';
import { DrugAlcoholScreeningListScreen } from '../modules/occupational-health/screens/DrugAlcoholScreeningListScreen';
import { PPEComplianceListScreen } from '../modules/occupational-health/screens/PPEComplianceListScreen';
import { ExamsListScreen } from '../modules/occupational-health/screens/ExamsListScreen';
import { HealthScreeningListScreen } from '../modules/occupational-health/screens/HealthScreeningListScreen';
import { ExitExamsListScreen } from '../modules/occupational-health/screens/ExitExamsListScreen';
import { DiseasesListScreen } from '../modules/occupational-health/screens/DiseasesListScreen';
import { PlaceholderScreen } from '../modules/shared/PlaceholderScreen';
import { StaffManagementScreen } from '../screens/StaffManagementScreen';
import { POSScreen } from '../modules/pharmacy/screens/POSScreen';
import { InventoryScreen } from '../modules/pharmacy/screens/InventoryScreen';
import { SuppliersScreen } from '../modules/pharmacy/screens/SuppliersScreen';
import { StockAlertsScreen } from '../modules/pharmacy/screens/StockAlertsScreen';
import { ExpirationReportScreen } from '../modules/pharmacy/screens/ExpirationReportScreen';
import { EnhancedPrescriptionsScreen } from '../modules/pharmacy/screens/EnhancedOrdonnancesScreen';
import { SalesReportsScreen } from '../modules/pharmacy/screens/SalesReportsScreen';
import { PharmacyReportsScreen } from '../modules/pharmacy/screens/PharmacyReportsScreen';
import { SalesReceiptsScreen } from '../modules/pharmacy/screens/SalesReceiptsScreen';
import { AnalyticsScreen as PharmacyAnalyticsScreen } from '../modules/pharmacy/screens/AnalyticsScreen';
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
import { HospitalConsultationScreen } from '../modules/hospital/screens/HospitalConsultationScreen';
import { HospitalPatientIntakeScreen } from '../modules/hospital/screens/HospitalPatientIntakeScreen';
import { HospitalPrescriptionsScreen } from '../modules/hospital/screens/HospitalPrescriptionsScreen';
import { ConsultationHistoryScreen } from '../modules/hospital/screens/ConsultationHistoryScreen';
import { SidebarLayout, SidebarSection, SidebarMenuItem } from '../components/SidebarLayout';
import { colors, borderRadius } from '../theme/theme';
import ApiService from '../services/ApiService';
import { Patient } from '../models/Patient';
import { selectActiveModules, selectAllFeatures, logout as logoutAction } from '../store/slices/authSlice';
import { RootState } from '../store/store';
import { ModuleType } from '../models/License';



// ═══════════════════════════════════════════════════════════════
// No License Fallback Screen — with logout/reset button
// ═══════════════════════════════════════════════════════════════
function NoLicenseScreen() {
  const dispatch = useDispatch();
  const navigation = useNavigation<any>();

  const handleLogout = async () => {
    try {
      // Clear all auth-related storage
      const keysToRemove = [
        'auth_session',
        'current_user',
        'current_organization',
        'device_activation_info',
        'AUTH_TOKEN_KEY',
        'HK_SYNC_CHANGELOG',
        'SYNC_QUEUE_KEY',
        'LAST_SYNC_KEY',
      ];

      // Remove known keys
      await Promise.all(
        keysToRemove.map(key => 
          AsyncStorage.removeItem(key).catch(() => {})
        )
      );

      // Also clear all storage to be safe
      const allKeys = await AsyncStorage.getAllKeys();
      await AsyncStorage.multiRemove(allKeys).catch(() => {});

      // Clear Redux state
      dispatch(logoutAction());

      // Navigate to Auth and reset navigation stack
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Auth' }],
        });
      }, 500);
    } catch (error) {
      console.error('Logout error:', error);
      // Still try to redirect even if clear fails
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
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
        { id: 'staff-management', label: 'Gestion Personnel', icon: 'people-outline', iconActive: 'people' },
        ...(activeModules.includes('OCCUPATIONAL_HEALTH') ? [
          { id: 'oh-personnel-registry', label: 'Registre Personnel', icon: 'people-outline' as const, iconActive: 'people' as const },
          { id: 'oh-enterprise-management', label: 'Gestion Entreprises', icon: 'business-outline' as const, iconActive: 'business' as const },
        ] : []),
      ],
    }
  ];

  // Add Pharmacy section if user has pharmacy access
  if (activeModules.includes('PHARMACY')) {
    const pharmacyItems: SidebarMenuItem[] = [
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
      pharmacyItems.push({ id: 'ph-expiration-report', label: 'Rapport Expiration', icon: 'time-outline', iconActive: 'time' });
    }
    
    if (hasFeature('basic_reporting') || hasFeature('advanced_reporting')) {
      pharmacyItems.push({ id: 'ph-reports', label: 'Rapports Ventes', icon: 'bar-chart-outline', iconActive: 'bar-chart' });
      pharmacyItems.push({ id: 'ph-sales-reports', label: 'Rapports Ventes Détaillés', icon: 'stats-chart-outline', iconActive: 'stats-chart' });
      pharmacyItems.push({ id: 'ph-sales-history', label: 'Toutes les Ventes', icon: 'receipt-outline', iconActive: 'receipt' });
      pharmacyItems.push({ id: 'ph-analytics', label: 'Analytiques', icon: 'analytics-outline', iconActive: 'analytics' });
    }

    sections.push({
      title: 'Pharmacie',
      collapsible: true,
      defaultCollapsed: false,
      items: pharmacyItems
    });
  }

  // Add Hospital section if user has hospital access
  if (activeModules.includes('HOSPITAL')) {
    const hospitalItems: SidebarMenuItem[] = [
      { id: 'hp-dashboard', label: 'Vue d\'Ensemble', icon: 'medkit-outline', iconActive: 'medkit' }
    ];

    // Emergency & Triage
    hospitalItems.push({ id: 'hp-emergency', label: 'Urgences', icon: 'pulse-outline', iconActive: 'pulse', badge: 8 });
    hospitalItems.push({ id: 'hp-triage', label: 'Triage', icon: 'heart-outline', iconActive: 'heart' });

    // Add features based on license
    if (hasFeature('patient_management')) {
      hospitalItems.push({ id: 'hp-patients', label: 'Gestion Patients', icon: 'body-outline', iconActive: 'body' });
      hospitalItems.push({ id: 'hp-intake', label: 'Accueil Consultation', icon: 'person-add-outline', iconActive: 'person-add' });
      hospitalItems.push({ id: 'hp-consultation', label: 'Consultation', icon: 'medkit-outline', iconActive: 'medkit' });
      hospitalItems.push({ id: 'hp-consultation-history', label: 'Historique Consult.', icon: 'time-outline', iconActive: 'time' });
    }
    
    if (hasFeature('appointment_scheduling') || hasFeature('advanced_scheduling')) {
      hospitalItems.push({ id: 'hp-appointments', label: 'Rendez-vous', icon: 'calendar-outline', iconActive: 'calendar', badge: 5 });
    }
    
    // Ward & Admission Management
    if (hasFeature('multi_department')) {
      hospitalItems.push({ id: 'hp-wards', label: 'Services & Lits', icon: 'home-outline', iconActive: 'home' });
      hospitalItems.push({ id: 'hp-admissions', label: 'Hospitalisations', icon: 'log-in-outline', iconActive: 'log-in' });
    }

    // Medication Administration (MAR)
    hospitalItems.push({ id: 'hp-mar', label: 'Adm. Médicaments', icon: 'medkit-outline', iconActive: 'medkit' });
    hospitalItems.push({ id: 'hp-prescriptions', label: 'Ordonnances', icon: 'document-text-outline', iconActive: 'document-text' });
    hospitalItems.push({ id: 'hp-medical-records', label: 'Dossiers Médicaux', icon: 'folder-open-outline', iconActive: 'folder-open' });
    hospitalItems.push({ id: 'hp-staff', label: 'Personnel Médical', icon: 'person-outline', iconActive: 'person' });
    hospitalItems.push({ id: 'hp-reports', label: 'Rapports', icon: 'stats-chart-outline', iconActive: 'stats-chart' });

    if (hasFeature('medical_records')) {
      hospitalItems.push({ id: 'hp-clinical-notes', label: 'Notes Cliniques', icon: 'document-text-outline', iconActive: 'document-text' });
    }
    
    if (hasFeature('lab_integration')) {
      hospitalItems.push({ id: 'hp-lab-results', label: 'Laboratoire', icon: 'flask-outline', iconActive: 'flask', badge: 2 });
    }
    
    if (hasFeature('basic_billing') || hasFeature('billing_management')) {
      hospitalItems.push({ id: 'hp-billing', label: 'Facturation', icon: 'receipt-outline', iconActive: 'receipt' });
    }

    sections.push({
      title: 'Hôpital',
      collapsible: true,
      defaultCollapsed: false,
      items: hospitalItems
    });
  }

  // Add Occupational Health section if user has occ health access
  if (activeModules.includes('OCCUPATIONAL_HEALTH')) {
    // Principal
    sections.push({
      title: 'Méd. du Travail',
      collapsible: true,
      defaultCollapsed: false,
      items: [
        { id: 'oh-dashboard', label: 'Vue d\'Ensemble', icon: 'construct-outline', iconActive: 'construct' },
        { id: 'oh-intake', label: 'Accueil Patient', icon: 'person-add-outline', iconActive: 'person-add' },
        { id: 'oh-exams', label: 'Visite du Médecin', icon: 'medkit-outline', iconActive: 'medkit' },
        { id: 'oh-medical-test-catalog', label: 'Catalogue Évaluations Médicales', icon: 'grid-outline', iconActive: 'grid' },
        { id: 'oh-exam-management', label: 'Gestion Examens', icon: 'document-outline', iconActive: 'document' },
        { id: 'oh-protocol', label: 'Protocoles', icon: 'document-text-outline', iconActive: 'document-text' },
        { id: 'oh-previous-visits', label: 'Historique Visites', icon: 'time-outline', iconActive: 'time' },
        { id: 'oh-certificates', label: 'Certificats Aptitude', icon: 'shield-checkmark-outline', iconActive: 'shield-checkmark' },
        { id: 'oh-fitness-dashboard', label: 'Aptitude au Travail (FFD)', icon: 'shield-half-outline', iconActive: 'shield-half' },
        { id: 'oh-surveillance', label: 'Prog. Surveillance', icon: 'eye-outline', iconActive: 'eye' },
      ],
    });

    // Sécurité au Travail
    sections.push({
      title: 'Sécurité au Travail',
      collapsible: true,
      defaultCollapsed: false,
      items: [
        { id: 'oh-incident-dashboard', label: 'Incidents & Accidents', icon: 'warning-outline', iconActive: 'warning', badge: 3 },
        { id: 'oh-risk', label: 'Évaluation Risques', icon: 'alert-circle-outline', iconActive: 'alert-circle' },
        { id: 'oh-exposure-monitoring', label: 'Monitoring Expositions', icon: 'water-outline', iconActive: 'water' },
        { id: 'oh-ppe', label: 'Gestion EPI', icon: 'body-outline', iconActive: 'body' },
        { id: 'oh-worker-risk-profiles', label: 'Profils de Risque', icon: 'bar-chart-outline', iconActive: 'bar-chart' },
        { id: 'oh-overexposure-alerts', label: 'Alertes Surexposition', icon: 'alert-outline', iconActive: 'alert' },
        { id: 'oh-ppe-compliance', label: 'Conformité EPI', icon: 'checkmark-outline', iconActive: 'checkmark' },
        { id: 'oh-capa-dashboard', label: 'Actions CAPA', icon: 'construct-outline', iconActive: 'construct' },
      ],
    });

    // Rapports & Conformité
    sections.push({
      title: 'Rapports & Conformité',
      collapsible: true,
      defaultCollapsed: false,
      items: [
        { id: 'oh-regulatory-reports', label: 'Rapports Réglementaires', icon: 'document-attach-outline', iconActive: 'document-attach' },
        { id: 'oh-iso45001', label: 'ISO 45001', icon: 'shield-outline', iconActive: 'shield' },
        { id: 'oh-iso27001', label: 'ISO 27001', icon: 'lock-closed-outline', iconActive: 'lock-closed' },
        { id: 'oh-reports', label: 'Rapports SST', icon: 'stats-chart-outline', iconActive: 'stats-chart' },
        { id: 'oh-compliance', label: 'Conformité Réglementaire', icon: 'checkmark-circle-outline', iconActive: 'checkmark-circle' },
        { id: 'oh-analytics', label: 'Analytiques', icon: 'analytics-outline', iconActive: 'analytics' },
      ],
    });
  }

  return sections;
};

// ═══════════════════════════════════════════════════════════════
// Pharmacy placeholder screen definitions
// ═══════════════════════════════════════════════════════════════
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
  'hp-reports': { title: 'Rapports Hospitaliers', subtitle: 'Suivi et analyse des performances hospitalières.', icon: 'stats-chart', features: ['Rapports d\'activité', 'Indicateurs de qualité', 'Statistiques de consultations', 'Performance des services', 'Exports PDF/Excel', 'Suivi mensuel'] },
};

// ═══════════════════════════════════════════════════════════════
// Occupational Health placeholder screen definitions
// ═══════════════════════════════════════════════════════════════
const occHealthScreens: Record<string, { title: string; subtitle: string; icon: any; features: string[] }> = {
  'oh-exams': { title: 'Visites Médicales', subtitle: 'Examens d\'aptitude adaptés par secteur (ILO C161).', icon: 'medkit', features: ['Visite d\'embauche', 'Visites périodiques', 'Examens sectoriels adaptés', 'Bilan ergonomique & stress', 'Évaluation santé mentale', 'Tests de risque sectoriel'] },
  'oh-certificates': { title: 'Certificats d\'Aptitude', subtitle: 'Gestion des certificats médicaux.', icon: 'shield-checkmark', features: ['Émission certificats', 'Suivi expirations', 'Alertes renouvellement', 'Classifications aptitude', 'Historique par patient', 'Signature numérique'] },
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
  // Initialize activeScreen from URL hash if available, otherwise default to dashboard
  const getInitialScreen = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (hash) return hash;
    }
    return 'dashboard';
  };
  
  const [activeScreen, setActiveScreen] = useState(getInitialScreen);
  const activeModules = useSelector(selectActiveModules);
  const allFeatures = useSelector(selectAllFeatures);
  const { organization } = useSelector((state: RootState) => state.auth);

  // Patient sub-navigation state
  const [patientView, setPatientView] = useState<'list' | 'detail' | 'register' | 'edit'>('list');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  // Hospital consultation state
  const [consultationPatientId, setConsultationPatientId] = useState<string | null>(null);
  const [pendingHospitalConsultationToLoad, setPendingHospitalConsultationToLoad] = useState<string | null>(null);
  
  // Emergency/Triage refresh trigger
  const [emergencyRefreshTrigger, setEmergencyRefreshTrigger] = useState(0);

  // Occupational health draft management
  const [draftToLoad, setDraftToLoad] = useState<string | null>(null);
  const [pendingConsultationToLoad, setPendingConsultationToLoad] = useState<string | null>(null);
  const [ohExamsScreenKey, setOhExamsScreenKey] = useState(0);
  const [expirationSoonCount, setExpirationSoonCount] = useState<number>(0);

  // Custom navigation wrapper for screen-based navigation
  const customNavigation = {
    navigate: (screenName: string) => setActiveScreen(screenName),
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatientId(patient.id);
    setPatientView('detail');
  };
  const handleNewPatient = () => setPatientView('register');
  const handleEditPatient = (patient: Patient) => {
    setEditingPatient(patient);
    setPatientView('edit');
  };

  // Hospital consultation handlers
  const handleStartConsultation = (patient: Patient) => {
    setConsultationPatientId(patient.id);
    setActiveScreen('hp-consultation');
  };

  const handleConsultationComplete = () => {
    setConsultationPatientId(null);
    setActiveScreen('hp-consultation-history');
  };

  const handleNavigateToHospitalConsultation = (pendingId?: string) => {
    setConsultationPatientId(null);
    setPendingHospitalConsultationToLoad(pendingId || null);
    setActiveScreen('hp-consultation');
  };

  const handleResumeDraft = (draftId: string) => {
    setDraftToLoad(draftId);
    setPendingConsultationToLoad(null);
    setActiveScreen('oh-exams');
  };

  const handleNewConsultation = () => {
    setDraftToLoad(null);
    setPendingConsultationToLoad(null);
    setActiveScreen('oh-exams');
  };

  const handleNavigateToOccConsultation = (pendingId?: string) => {
    setDraftToLoad(null);
    setPendingConsultationToLoad(pendingId || null);
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

  const canAccessScreen = useMemo(() => {
    const screenModuleRequirements: Record<string, ModuleType> = {
      'ph-dashboard': 'PHARMACY',
      'ph-pos': 'PHARMACY',
      'ph-inventory': 'PHARMACY',
      'ph-suppliers': 'PHARMACY',
      'ph-stock-alerts': 'PHARMACY',
      'ph-expiration-report': 'PHARMACY',
      'ph-prescriptions': 'PHARMACY',
      'ph-reports': 'PHARMACY',
      'ph-sales-reports': 'PHARMACY',
      'ph-sales-history': 'PHARMACY',
      'ph-analytics': 'PHARMACY',

      'hp-dashboard': 'HOSPITAL',
      'hp-emergency': 'HOSPITAL',
      'hp-triage': 'HOSPITAL',
      'hp-appointments': 'HOSPITAL',
      'hp-wards': 'HOSPITAL',
      'hp-admissions': 'HOSPITAL',
      'hp-mar': 'HOSPITAL',
      'hp-prescriptions': 'HOSPITAL',
      'hp-medical-records': 'HOSPITAL',
      'hp-staff': 'HOSPITAL',
      'hp-reports': 'HOSPITAL',
      'hp-lab-results': 'HOSPITAL',
      'hp-clinical-notes': 'HOSPITAL',
      'hp-billing': 'HOSPITAL',
      'hp-consultation': 'HOSPITAL',
      'hp-consultation-history': 'HOSPITAL',
      'hp-patients': 'HOSPITAL',
      'hp-intake': 'HOSPITAL',

      'oh-dashboard': 'OCCUPATIONAL_HEALTH',
      'oh-personnel-registry': 'OCCUPATIONAL_HEALTH',
      'oh-intake': 'OCCUPATIONAL_HEALTH',
      'oh-protocol': 'OCCUPATIONAL_HEALTH',
      'oh-exams': 'OCCUPATIONAL_HEALTH',
      'oh-previous-visits': 'OCCUPATIONAL_HEALTH',
      'oh-certificates': 'OCCUPATIONAL_HEALTH',
      'oh-surveillance': 'OCCUPATIONAL_HEALTH',
      'oh-diseases': 'OCCUPATIONAL_HEALTH',
      'oh-incident-dashboard': 'OCCUPATIONAL_HEALTH',
      'oh-incidents': 'OCCUPATIONAL_HEALTH',
      'oh-risk': 'OCCUPATIONAL_HEALTH',
      'oh-exposure-monitoring': 'OCCUPATIONAL_HEALTH',
      'oh-ppe': 'OCCUPATIONAL_HEALTH',
      'oh-worker-risk-profiles': 'OCCUPATIONAL_HEALTH',
      'oh-overexposure-alerts': 'OCCUPATIONAL_HEALTH',
      'oh-ppe-compliance': 'OCCUPATIONAL_HEALTH',
      'oh-audiometry': 'OCCUPATIONAL_HEALTH',
      'oh-spirometry': 'OCCUPATIONAL_HEALTH',
      'oh-vision-tests': 'OCCUPATIONAL_HEALTH',
      'oh-ppe-compliance-new': 'OCCUPATIONAL_HEALTH',
      'oh-xray-imaging': 'OCCUPATIONAL_HEALTH',
      'oh-drug-alcohol-screening': 'OCCUPATIONAL_HEALTH',
      'oh-regulatory-reports': 'OCCUPATIONAL_HEALTH',
      'oh-iso45001': 'OCCUPATIONAL_HEALTH',
      'oh-iso27001': 'OCCUPATIONAL_HEALTH',
      'oh-reports': 'OCCUPATIONAL_HEALTH',
      'oh-compliance': 'OCCUPATIONAL_HEALTH',
      'oh-analytics': 'OCCUPATIONAL_HEALTH',
      'oh-worker-management': 'OCCUPATIONAL_HEALTH',
      'oh-enterprise-management': 'OCCUPATIONAL_HEALTH',
      'oh-medical-test-catalog': 'OCCUPATIONAL_HEALTH',
      'oh-audiometry-dashboard': 'OCCUPATIONAL_HEALTH',
      'oh-spirometry-dashboard': 'OCCUPATIONAL_HEALTH',
      'oh-vision-dashboard': 'OCCUPATIONAL_HEALTH',
      'oh-xray-dashboard': 'OCCUPATIONAL_HEALTH',
      'oh-drug-alcohol-dashboard': 'OCCUPATIONAL_HEALTH',
      'oh-ppe-compliance-dashboard': 'OCCUPATIONAL_HEALTH',
      'oh-exams-dashboard': 'OCCUPATIONAL_HEALTH',
      'oh-health-screening-dashboard': 'OCCUPATIONAL_HEALTH',
      'oh-exit-exams-dashboard': 'OCCUPATIONAL_HEALTH',
      'oh-diseases-dashboard': 'OCCUPATIONAL_HEALTH',
      'oh-heavy-metals-dashboard': 'OCCUPATIONAL_HEALTH',
      'oh-heavy-metals': 'OCCUPATIONAL_HEALTH',
      'oh-fitness-dashboard': 'OCCUPATIONAL_HEALTH',
      'oh-capa-dashboard': 'OCCUPATIONAL_HEALTH',
      'oh-medical-tests': 'OCCUPATIONAL_HEALTH',
      'oh-exam-management': 'OCCUPATIONAL_HEALTH',
      'oh-exit-exams': 'OCCUPATIONAL_HEALTH',
      'oh-health-screening': 'OCCUPATIONAL_HEALTH',
    };

    return (screen: string) => {
      const requiredModule = screenModuleRequirements[screen];
      if (!requiredModule) return true;
      return activeModules.includes(requiredModule);
    };
  }, [activeModules]);

  const handleScreenChange = (screen: string) => {
    if (!canAccessScreen(screen)) {
      return;
    }

    if (screen === 'oh-exams') {
      // Opening "Visite du Médecin" from menu should always start on waiting-room landing view.
      setDraftToLoad(null);
      setPendingConsultationToLoad(null);
      if (activeScreen === 'oh-exams') {
        setOhExamsScreenKey(prev => prev + 1);
      }
    }

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
    
    // Debug logging to see what's available
    console.log('🔍 Navigation Debug:');
    console.log('📄 Active Modules:', activeModules);
    console.log('🎯 All Features:', allFeatures);
    console.log('🏢 Organization:', organization);
    
    const sections = createDynamicSections(activeModules, hasFeature);

    const pharmacySection = sections.find((section) => section.title === 'Pharmacie');
    const expirationItem = pharmacySection?.items?.find((item) => item.id === 'ph-expiration-report');
    if (expirationItem) {
      expirationItem.badge = expirationSoonCount > 0 ? expirationSoonCount : undefined;
    }
    
    // Always add settings section
    sections.push({
      title: 'Système',
      items: [
        { id: 'connectivity', label: 'Connectivité', icon: 'wifi-outline', iconActive: 'wifi' },
        { id: 'settings', label: 'Paramètres', icon: 'settings-outline', iconActive: 'settings' },
      ],
    });
    
    return sections;
  }, [activeModules, allFeatures, expirationSoonCount]);

  useEffect(() => {
    const hasPharmacy = activeModules.includes('PHARMACY');
    const hasStockAlerts = allFeatures.includes('stock_alerts');
    if (!hasPharmacy || !hasStockAlerts) {
      setExpirationSoonCount(0);
      return;
    }

    let isMounted = true;
    const loadExpirationSoonCount = async () => {
      try {
        const api = ApiService.getInstance();
        const res = await api.get('/inventory/reports/expiring/', { scope: 'window', days: 90 });
        if (!isMounted || !res.success) return;

        const payload = res.data as any;
        const rows: any[] = Array.isArray(payload?.results) ? payload.results : [];
        const count = rows.filter((row) => {
          const days = Number(row?.days_to_expiry);
          return Number.isFinite(days) && days >= 0 && days < 90;
        }).length;

        setExpirationSoonCount(count);
      } catch {
        if (isMounted) setExpirationSoonCount(0);
      }
    };

    loadExpirationSoonCount();

    return () => {
      isMounted = false;
    };
  }, [activeModules, allFeatures, activeScreen]);

  useEffect(() => {
    if (!canAccessScreen(activeScreen)) {
      setActiveScreen('dashboard');
    }
  }, [activeScreen, canAccessScreen]);

  const renderContent = () => {
    // Main screens
    if (activeScreen === 'dashboard') return <DashboardScreen onNavigate={handleScreenChange} />;
    if (activeScreen === 'staff-management') return <StaffManagementScreen />;
    if (activeScreen === 'connectivity') return <ConnectivityScreen />;
    if (activeScreen === 'settings') return <SettingsScreen />;

    // Pharmacy screens
    if (activeScreen === 'ph-dashboard') return <PharmacyDashboardContent onNavigate={handleScreenChange} />;
    if (activeScreen === 'ph-pos') return <POSScreen />;
    if (activeScreen === 'ph-inventory') return <InventoryScreen />;
    if (activeScreen === 'ph-suppliers') return <SuppliersScreen />;
    if (activeScreen === 'ph-stock-alerts') return <StockAlertsScreen onOpenExpirationReport={() => handleScreenChange('ph-expiration-report')} />;
    if (activeScreen === 'ph-expiration-report') return <ExpirationReportScreen />;
    if (activeScreen === 'ph-prescriptions') return <EnhancedPrescriptionsScreen />;
    if (activeScreen === 'ph-reports') return <PharmacyReportsScreen />;
    if (activeScreen === 'ph-sales-reports') return <SalesReportsScreen />;
    if (activeScreen === 'ph-sales-history') return <SalesReceiptsScreen />;
    if (activeScreen === 'ph-analytics') return <PharmacyAnalyticsScreen />;

    // Hospital screens
    if (activeScreen === 'hp-dashboard') return <HospitalDashboardContent onNavigate={handleScreenChange} />;
    if (activeScreen === 'hp-emergency') return (
      <EmergencyDashboardScreen 
        key={`emergency-${emergencyRefreshTrigger}`}
        onNavigateToTriage={() => setActiveScreen('hp-triage')}
      />
    );
    if (activeScreen === 'hp-triage') return (
      <TriageScreen 
        onNavigateToRegisterPatient={() => {
          setActiveScreen('hp-patients');
          setPatientView('register');
        }}
        onTriageSaved={() => {
          setEmergencyRefreshTrigger(prev => prev + 1);
        }}
        onNavigateToEmergency={() => {
          setEmergencyRefreshTrigger(prev => prev + 1);
          setActiveScreen('hp-emergency');
        }}
      />
    );
    if (activeScreen === 'hp-appointments') return <AppointmentSchedulerScreen />;
    if (activeScreen === 'hp-wards') return <WardManagementScreen />;
    if (activeScreen === 'hp-admissions') return <AdmissionScreen />;
    if (activeScreen === 'hp-mar') return <MedicationAdministrationScreen />;
    if (activeScreen === 'hp-prescriptions') return <HospitalPrescriptionsScreen />;

    if (activeScreen === 'hp-lab-results') return <LaboratoryScreen />;
    if (activeScreen === 'hp-clinical-notes') return <ClinicalNotesScreen />;
    if (activeScreen === 'hp-billing') return <HospitalBillingScreen />;
    if (activeScreen === 'hp-intake') {
      return (
        <HospitalPatientIntakeScreen
          onConsultationQueued={() => {}}
          onNavigateToConsultation={handleNavigateToHospitalConsultation}
        />
      );
    }
    if (activeScreen === 'hp-consultation') {
      return (
        <HospitalConsultationScreen
          patientId={consultationPatientId || undefined}
          pendingConsultationToLoad={pendingHospitalConsultationToLoad}
          onPendingLoaded={() => setPendingHospitalConsultationToLoad(null)}
          onBack={() => setActiveScreen('hp-patients')}
          onComplete={handleConsultationComplete}
        />
      );
    }
    if (activeScreen === 'hp-consultation-history') {
      return (
        <ConsultationHistoryScreen
          onBack={() => setActiveScreen('hp-dashboard')}
        />
      );
    }
    if (activeScreen === 'hp-patients') {
      if (patientView === 'detail' && selectedPatientId) {
        return (
          <PatientDetailScreen
            patientId={selectedPatientId}
            onBack={handleBackToPatientList}
            onNewEncounter={handleStartConsultation}
            onEditPatient={handleEditPatient}
            onGoToTriage={(patient, encounterId) => {
              console.log(`➡️ Navigate to triage for encounter ${encounterId}`);
              // Future: navigate to triage screen
            }}
            onGoToConsultation={(patient, encounterId) => {
              handleStartConsultation(patient);
            }}
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
    if (activeScreen === 'oh-dashboard') return <OccHealthDashboardContent onNavigate={handleScreenChange} />;
    
    if (activeScreen === 'oh-personnel-registry') return <PersonnelRegistryScreen />;
    
    if (activeScreen === 'oh-exams') return (
      <OccHealthConsultationScreen 
        key={`oh-exams-${ohExamsScreenKey}`}
        draftToLoad={draftToLoad} 
        onDraftLoaded={() => setDraftToLoad(null)}
        pendingConsultationToLoad={pendingConsultationToLoad}
        onPendingLoaded={() => setPendingConsultationToLoad(null)}
        onNavigateBack={() => setActiveScreen('oh-dashboard')}
      />
    );
    
    if (activeScreen === 'oh-protocol') return <ProtocolManagementScreen />;
    
    if (activeScreen === 'oh-previous-visits') return (
      <PreviousVisitsScreen 
        onResumeDraft={handleResumeDraft} 
        onNewConsultation={handleNewConsultation}
      />
    );
    
    if (activeScreen === 'oh-certificates') return (
      <CertificatesScreen 
        onNavigateBack={() => setActiveScreen('oh-dashboard')}
        showBackButton={true}
      />
    );
    
    if (activeScreen === 'oh-intake') return (
      <OHPatientIntakeScreen
        onConsultationQueued={() => {}}
        onNavigateToConsultation={handleNavigateToOccConsultation}
      />
    );
    
    if (activeScreen === 'oh-incident-dashboard') return <IncidentDashboardScreen />;
    if (activeScreen === 'oh-incidents') return <IncidentsScreen />;
    if (activeScreen === 'oh-diseases') return <DiseasesScreen />;
    if (activeScreen === 'oh-surveillance') return <SurveillanceScreen />;
    if (activeScreen === 'oh-risk') return <RiskAssessmentScreen />;
    if (activeScreen === 'oh-exposure-monitoring') return <ExposureMonitoringDashboard />;
    if (activeScreen === 'oh-ppe') return <PPEManagementScreen />;
    if (activeScreen === 'oh-worker-risk-profiles') return <WorkerRiskProfileScreen />;
    if (activeScreen === 'oh-overexposure-alerts') return <OverexposureAlertScreen />;
    if (activeScreen === 'oh-ppe-compliance') return <PPEComplianceRecordScreen />;
    if (activeScreen === 'oh-audiometry') return <AudiometryScreen />;
    if (activeScreen === 'oh-spirometry') return <SpirometryScreen />;
    if (activeScreen === 'oh-vision-tests') return <VisionTestScreen />;
    if (activeScreen === 'oh-ppe-compliance-new') return <PPEComplianceScreen />;
    if (activeScreen === 'oh-xray-imaging') return <XrayImagingScreen />;
    if (activeScreen === 'oh-drug-alcohol-screening') return <DrugAlcoholScreeningScreen />;
    if (activeScreen === 'oh-regulatory-reports') return <RegulatoryReportsScreen />;
    if (activeScreen === 'oh-iso45001') return <ISO45001DashboardScreen />;
    if (activeScreen === 'oh-iso27001') return <ISO27001DashboardScreen />;
    if (activeScreen === 'oh-reports') return <ReportsScreen />;
    if (activeScreen === 'oh-compliance') return <ComplianceScreen />;
    if (activeScreen === 'oh-analytics') return <AnalyticsScreen />;
    if (activeScreen === 'oh-enterprise-management') return <EnterpriseManagementScreen />;
    if (activeScreen === 'oh-medical-test-catalog') return <MedicalTestCatalogScreen navigation={customNavigation} />;
    if (activeScreen === 'oh-audiometry-dashboard') return <AudiometryDashboardScreen navigation={customNavigation} />;
    if (activeScreen === 'oh-spirometry-dashboard') return <SpirometryDashboardScreen navigation={customNavigation} />;
    if (activeScreen === 'oh-vision-dashboard') return <VisionDashboardScreen navigation={customNavigation} />;
    if (activeScreen === 'oh-xray-dashboard') return <XrayDashboardScreen navigation={customNavigation} />;
    if (activeScreen === 'oh-drug-alcohol-dashboard') return <DrugAlcoholDashboardScreen navigation={customNavigation} />;
    if (activeScreen === 'oh-ppe-compliance-dashboard') return <PPEComplianceDashboardScreen navigation={customNavigation} />;
    if (activeScreen === 'oh-exams-dashboard') return <ExamsDashboardScreen navigation={customNavigation} />;
    if (activeScreen === 'oh-health-screening-dashboard') return <HealthScreeningDashboardScreen navigation={customNavigation} />;
    if (activeScreen === 'oh-exit-exams-dashboard') return <ExitExamsDashboardScreen navigation={customNavigation} />;
    if (activeScreen === 'oh-diseases-dashboard') return <DiseasesDashboardScreen navigation={customNavigation} />;
    if (activeScreen === 'oh-heavy-metals-dashboard') return <HeavyMetalsDashboardScreen navigation={customNavigation} />;
    if (activeScreen === 'oh-fitness-dashboard') return <FitnessDashboardScreen navigation={customNavigation} />;
    if (activeScreen === 'oh-capa-dashboard') return <CAPADashboardScreen navigation={customNavigation} />;
    if (activeScreen === 'oh-audiometry-list') return <AudiometryListScreen navigation={customNavigation} />;
    if (activeScreen === 'oh-spirometry-list') return <SpirometryListScreen navigation={customNavigation} />;
    if (activeScreen === 'oh-vision-list') return <VisionTestListScreen navigation={customNavigation} />;
    if (activeScreen === 'oh-xray-list') return <XrayImagingListScreen navigation={customNavigation} />;
    if (activeScreen === 'oh-drug-alcohol-list') return <DrugAlcoholScreeningListScreen navigation={customNavigation} />;
    if (activeScreen === 'oh-ppe-list') return <PPEComplianceListScreen navigation={customNavigation} />;
    if (activeScreen === 'oh-exams-list') return <ExamsListScreen navigation={customNavigation} />;
    if (activeScreen === 'oh-health-screening-list') return <HealthScreeningListScreen navigation={customNavigation} />;
    if (activeScreen === 'oh-exit-exams-list') return <ExitExamsListScreen navigation={customNavigation} />;
    if (activeScreen === 'oh-diseases-list') return <DiseasesListScreen navigation={customNavigation} />;
    if (activeScreen === 'oh-medical-tests') return <MedicalTestVisualizationScreen />;
    if (activeScreen === 'oh-exam-management') return <MedicalExamManagementScreen />;
    if (activeScreen === 'oh-exit-exams') return <ExitExamScreen />;
    if (activeScreen === 'oh-health-screening') return <HealthScreeningFormScreen />;
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
      organizationName={organization?.name}
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
  const hasPharmacyAccess = activeModules.includes('PHARMACY');
  const hasHospitalAccess = activeModules.includes('HOSPITAL');
  const hasOccHealthAccess = activeModules.includes('OCCUPATIONAL_HEALTH');

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
          height: 80,
          paddingBottom: Platform.OS === 'web' ? 8 : undefined,
          paddingTop: Platform.OS === 'web' ? 8 : 6,
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
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  return isDesktop ? <DesktopApp /> : <MobileApp />;
}

const tabStyles = StyleSheet.create({
  activeIconWrap: {
    backgroundColor: colors.primaryFaded,
    borderRadius: borderRadius.md,
    padding: 6,
  },
});