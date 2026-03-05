import React, { useState, useEffect } from 'react';
import ApiService from '../../../services/ApiService';
import { TestDashboard, KPI } from '../components/TestDashboard';

interface PPEComplianceResult {
  id: string;
  worker_name: string;
  ppe_catalog_name?: string;
  ppe_type_display?: string;
  check_date: string;
  status: 'in_use' | 'expired' | 'damaged' | 'lost' | 'replaced' | 'compliant' | 'non_compliant';
  is_compliant: boolean;
  check_type?: 'routine' | 'pre_use' | 'post_incident' | 'inventory' | 'expiry_check' | 'damage';
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
      const response = await api.get('/occupational-health/ppe-compliance/');
      if (response.success && response.data) {
        let data = Array.isArray(response.data) ? response.data : response.data.results || [];
        // Sort by check_date descending (most recent first) and take top 5
        data = data
          .sort((a: any, b: any) => new Date(b.check_date).getTime() - new Date(a.check_date).getTime())
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
    'routine':       'Vérification Courante',
    'pre_use':       'Vérification Avant Utilisation',
    'post_incident': 'Vérification Post-Incident',
    'inventory':     'Inventaire',
    'expiry_check':  "Vérification D'Expiration",
    'damage':        'Vérification de Dommage',
  };

  const calculateKPIs = (): KPI[] => {
    const total = results.length;
    const compliant = results.filter(r => r.is_compliant).length;
    const nonCompliant = results.filter(r => !r.is_compliant).length;
    const critical = results.filter(r => ['expired', 'damaged', 'lost', 'non_compliant'].includes(r.status)).length;

    return [
      { label: 'Total EPI', value: total, icon: 'document-text-outline', color: '#4338CA' },
      { label: 'Conforme', value: compliant, icon: 'checkmark-circle-outline', color: '#818CF8' },
      { label: 'Non conforme', value: nonCompliant, icon: 'close-circle-outline', color: '#0F1B42' },
      { label: 'Critique', value: critical, icon: 'alert-circle-outline', color: '#5B65DC' },
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
      onAddNew={() => navigation.navigate('oh-ppe-compliance')}
      onSeeMore={() => navigation.navigate('oh-ppe-compliance')}
      loading={loading}
      onRefresh={loadResults}
    />
  );
}
