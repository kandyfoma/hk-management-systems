import React, { useState, useEffect } from 'react';
import ApiService from '../../../services/ApiService';
import { TestDashboard, KPI } from '../components/TestDashboard';

interface PPEComplianceResult {
  id: string;
  worker_id: string;
  worker_name: string;
  assigned_date: string;
  status: 'compliant' | 'non_compliant' | 'due_inspection';
  check_type?: 'routine' | 'pre_use' | 'post_incident' | 'inventory' | 'expiry' | 'damage';
}

export function PPEComplianceDashboardScreen({ navigation }: any) {
  const [results, setResults] = useState<PPEComplianceResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const api = ApiService.getInstance();
      const response = await api.get('/occupational-health/ppe-compliance-results/');
      if (response.success && response.data) {
        let data = Array.isArray(response.data) ? response.data : response.data.results || [];
        // Sort by assigned_date descending (most recent first) and take top 5
        data = data
          .sort((a: any, b: any) => new Date(b.assigned_date).getTime() - new Date(a.assigned_date).getTime())
          .slice(0, 5);
        setResults(data);
      }
    } catch (error) {
      console.error('Error loading PPE compliance results:', error);
    } finally {
      setLoading(false);
    }
  };

  const CHECK_TYPE_LABELS: Record<string, string> = {
    'routine': 'Vérification Courante',
    'pre_use': 'Vérification Avant Utilisation',
    'post_incident': 'Vérification Post-Incident',
    'inventory': 'Inventaire',
    'expiry': "Vérification D'Expiration",
    'damage': 'Vérification de Dommage',
  };

  const calculateKPIs = (): KPI[] => {
    const total = results.length;
    const compliant = results.filter(r => r.status === 'compliant').length;
    const nonCompliant = results.filter(r => r.status === 'non_compliant').length;
    const dueInspection = results.filter(r => r.status === 'due_inspection').length;

    return [
      { label: 'Total EPI', value: total, icon: 'document-text-outline', color: '#4338CA' }, // Secondary Dark
      { label: 'Conforme', value: compliant, icon: 'checkmark-circle-outline', color: '#818CF8' }, // Accent Light
      { label: 'Non conforme', value: nonCompliant, icon: 'close-circle-outline', color: '#0F1B42' }, // Primary Dark
      { label: 'Inspection', value: dueInspection, icon: 'alert-circle-outline', color: '#5B65DC' }, // Secondary Purple-Blue
    ];
  };

  return (
    <TestDashboard
      title="Conformité EPI"
      icon="shield-outline"
      accentColor="#4338CA"
      kpis={calculateKPIs()}
      lastResults={results}
      groupByField="check_type"
      groupLabels={CHECK_TYPE_LABELS}
      onAddNew={() => navigation.navigate('oh-ppe')}
      onSeeMore={() => navigation.navigate('oh-ppe-list')}
      loading={loading}
      onRefresh={loadResults}
    />
  );
}
