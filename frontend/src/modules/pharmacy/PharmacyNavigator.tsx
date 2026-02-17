import React, { useState } from 'react';
import { SidebarLayout, SidebarSection } from '../../components/SidebarLayout';
import { PharmacyDashboardContent } from './screens/PharmacyDashboard';
import { InventoryScreen } from './screens/InventoryScreen';
import { SuppliersScreen } from './screens/SuppliersScreen';
import { StockAlertsScreen } from './screens/StockAlertsScreen';
import { POSScreen } from './screens/POSScreen';
import { PrescriptionsScreen } from './screens/PrescriptionsScreen';
import { EnhancedPrescriptionsScreen } from './screens/EnhancedOrdonnancesScreen';
import { SalesReportsScreen } from './screens/SalesReportsScreen';
import { PharmacyReportsScreen } from './screens/PharmacyReportsScreen';
import { AnalyticsScreen } from './screens/AnalyticsScreen';
import { PlaceholderScreen } from '../shared/PlaceholderScreen';
import { colors } from '../../theme/theme';

// ─── Sidebar Menu Configuration ──────────────────────────────
const pharmacySections: SidebarSection[] = [
  {
    title: 'Principal',
    items: [
      { id: 'dashboard', label: 'Tableau de Bord', icon: 'grid-outline', iconActive: 'grid' },
      { id: 'pos', label: 'Point de Vente', icon: 'cart-outline', iconActive: 'cart' },
    ],
  },
  {
    title: 'Gestion',
    items: [
      { id: 'inventory', label: 'Inventaire', icon: 'cube-outline', iconActive: 'cube', badge: 7 },
      { id: 'ordonnances', label: 'Ordonnances', icon: 'document-text-outline', iconActive: 'document-text', badge: 12 },
      { id: 'prescriptions', label: 'Prescriptions Basic', icon: 'receipt-outline', iconActive: 'receipt' },
      { id: 'suppliers', label: 'Fournisseurs', icon: 'business-outline', iconActive: 'business' },
      { id: 'stock-alerts', label: 'Alertes Stock', icon: 'alert-circle-outline', iconActive: 'alert-circle', badge: 3 },
    ],
  },
  {
    title: 'Rapports',
    items: [
      { id: 'reports', label: 'Tous les Rapports', icon: 'document-outline', iconActive: 'document' },
      { id: 'sales-reports', label: 'Rapports Ventes', icon: 'bar-chart-outline', iconActive: 'bar-chart' },
      { id: 'analytics', label: 'Analytiques', icon: 'analytics-outline', iconActive: 'analytics' },
    ],
  },
];

// ─── Screen Definitions ──────────────────────────────────────
const pharmacyScreens: Record<string, { title: string; subtitle: string; icon: any; features: string[] }> = {
  pos: {
    title: 'Point de Vente (POS)',
    subtitle: 'Système de caisse intelligent pour traiter les ventes rapidement et efficacement.',
    icon: 'cart',
    features: [
      'Scan code-barres des médicaments',
      'Recherche rapide par nom ou catégorie',
      'Application automatique des remises',
      'Impression de reçus et factures',
      'Gestion multi-modes de paiement',
      'Historique des transactions',
    ],
  },
  inventory: {
    title: 'Inventaire Médicaments',
    subtitle: 'Gérer le stock complet de médicaments avec suivi en temps réel.',
    icon: 'cube',
    features: [
      'Catalogue complet de médicaments',
      'Suivi des lots et dates d\'expiration',
      'Alertes de réapprovisionnement',
      'Catégorisation (DCI, marque, forme)',
      'Import/Export des données stock',
      'Historique des mouvements de stock',
    ],
  },
  prescriptions: {
    title: 'Prescriptions Basiques',
    subtitle: 'Interface simple pour la gestion des prescriptions.',
    icon: 'receipt',
    features: [
      'Affichage des prescriptions',
      'Interface basique',
      'Fonctionnalités essentielles',
    ],
  },
  ordonnances: {
    title: 'Gestion des Ordonnances',
    subtitle: 'Traiter et délivrer les ordonnances médicales de manière professionnelle.',
    icon: 'document-text',
    features: [
      'Réception et validation d\'ordonnances',
      'Vérification des interactions médicamenteuses',
      'Délivrance partielle ou complète',
      'Historique par patient et médecin',
      'Analytics et rapports avancés',
      'Suivi des ordonnances en temps réel',
      'Interface professionnelle moderne',
      'Filtres et recherche avancée',
    ],
  },
  suppliers: {
    title: 'Gestion Fournisseurs',
    subtitle: 'Gérer les fournisseurs, commandes et livraisons.',
    icon: 'business',
    features: [
      'Répertoire des fournisseurs agréés',
      'Création de bons de commande',
      'Suivi des livraisons',
      'Historique des achats par fournisseur',
      'Comparaison des prix',
      'Gestion des retours',
    ],
  },
  'stock-alerts': {
    title: 'Alertes de Stock',
    subtitle: 'Surveillance automatique des niveaux de stock et expirations.',
    icon: 'alert-circle',
    features: [
      'Alertes de stock bas',
      'Médicaments proches de l\'expiration',
      'Produits périmés à retirer',
      'Seuils d\'alerte personnalisables',
      'Notifications automatiques',
      'Rapports d\'alertes périodiques',
    ],
  },
  'sales-reports': {
    title: 'Rapports de Ventes',
    subtitle: 'Analyses détaillées des performances commerciales.',
    icon: 'bar-chart',
    features: [
      'Ventes journalières, hebdomadaires, mensuelles',
      'Top produits vendus',
      'Marge bénéficiaire par produit',
      'Tendances et prévisions',
      'Export PDF et Excel',
      'Comparaison inter-périodes',
    ],
  },
  reports: {
    title: 'Centre de Rapports',
    subtitle: 'Hub centralisé pour tous vos rapports pharmacie.',
    icon: 'document',
    features: [
      'Rapports rapides pré-configurés',
      'Analytics avancées avec visualisations',
      'Alertes de conformité automatiques',
      'Export multi-formats (PDF, Excel)',
      'Planification automatique des rapports',
      'Tableau de bord de compliance',
      'Métriques de performance temps réel',
      'Historique et archivage',
    ],
  },
  analytics: {
    title: 'Analytiques Avancées',
    subtitle: 'Indicateurs de performance et tableaux de bord analytiques.',
    icon: 'analytics',
    features: [
      'KPIs de la pharmacie',
      'Rotation des stocks',
      'Analyse ABC des produits',
      'Prédiction de la demande',
      'Taux de satisfaction client',
      'Benchmarking sectoriel',
    ],
  },
};

// ─── Navigator Component ─────────────────────────────────────
export function PharmacyNavigator() {
  const [activeScreen, setActiveScreen] = useState('dashboard');

  const renderContent = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <PharmacyDashboardContent onNavigate={setActiveScreen} />;
      case 'inventory':
        return <InventoryScreen />;
      case 'suppliers':
        return <SuppliersScreen />;
      case 'stock-alerts':
        return <StockAlertsScreen />;
      case 'pos':
        return <POSScreen />;
      case 'prescriptions':
        return <PrescriptionsScreen />;
      case 'ordonnances':
        return <EnhancedPrescriptionsScreen />;
      case 'sales-reports':
        return <SalesReportsScreen />;
      case 'reports':
        return <PharmacyReportsScreen />;
      case 'analytics':
        return <AnalyticsScreen />;
      default:
        // For screens that don't have components yet, show placeholder
        const screenDef = pharmacyScreens[activeScreen];
        if (screenDef) {
          return (
            <PlaceholderScreen
              title={screenDef.title}
              subtitle={screenDef.subtitle}
              icon={screenDef.icon}
              accentColor={colors.primary}
              features={screenDef.features}
            />
          );
        }
        return <PharmacyDashboardContent onNavigate={setActiveScreen} />;
    }
  };

  return (
    <SidebarLayout
      sections={pharmacySections}
      activeId={activeScreen}
      onSelect={setActiveScreen}
      accentColor={colors.primary}
      title="Pharmacie"
      subtitle="Module de gestion"
      headerIcon="medical"
    >
      {renderContent()}
    </SidebarLayout>
  );
}
