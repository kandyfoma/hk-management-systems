import React, { useState, useEffect } from 'react';
import ApiService from '../../../services/ApiService';
import { TestDashboard, KPI } from '../components/TestDashboard';

interface PPEComplianceResult {
  id: string;
  worker_id: string;
  worker_name: string;
  assigned_date: string;
  status: 'compliant' | 'non_compliant' | 'due_inspection';
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

  const calculateKPIs = (): KPI[] => {
    const total = results.length;
    const compliant = results.filter(r => r.status === 'compliant').length;
    const nonCompliant = results.filter(r => r.status === 'non_compliant').length;
    const dueInspection = results.filter(r => r.status === 'due_inspection').length;

    return [
      { label: 'Total EPI', value: total, icon: 'document-text-outline', color: '#06B6D4' },
      { label: 'Conforme', value: compliant, icon: 'checkmark-circle-outline', color: '#22C55E' },
      { label: 'Non conforme', value: nonCompliant, icon: 'close-circle-outline', color: '#EF4444' },
      { label: 'Inspection', value: dueInspection, icon: 'alert-circle-outline', color: '#F59E0B' },
    ];
  };

  return (
    <TestDashboard
      title="Conformité EPI"
      icon="shield-outline"
      accentColor="#06B6D4"
      kpis={calculateKPIs()}
      lastResults={results}
      onAddNew={() => navigation.navigate('oh-ppe')}
      onSeeMore={() => navigation.navigate('oh-ppe-list')}
      loading={loading}
      onRefresh={loadResults}
    />
  );
}
