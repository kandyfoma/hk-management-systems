import React, { useState, useEffect } from 'react';
import ApiService from '../../../services/ApiService';
import { TestDashboard, KPI } from '../components/TestDashboard';

interface HealthScreeningResult {
  id: string;
  worker_id: string;
  worker_name: string;
  screening_date: string;
  status: 'normal' | 'at_risk' | 'critical';
}

export function HealthScreeningDashboardScreen({ navigation }: any) {
  const [results, setResults] = useState<HealthScreeningResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const api = ApiService.getInstance();
      const response = await api.get('/occupational-health/health-screening-results/');
      if (response.success && response.data) {
        let data = Array.isArray(response.data) ? response.data : response.data.results || [];
        // Sort by screening_date descending (most recent first) and take top 5
        data = data
          .sort((a: any, b: any) => new Date(b.screening_date).getTime() - new Date(a.screening_date).getTime())
          .slice(0, 5);
        setResults(data);
      }
    } catch (error) {
      console.error('Error loading health screening results:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateKPIs = (): KPI[] => {
    const total = results.length;
    const normal = results.filter(r => r.status === 'normal').length;
    const atRisk = results.filter(r => r.status === 'at_risk').length;
    const critical = results.filter(r => r.status === 'critical').length;

    return [
      { label: 'Total Dépistage', value: total, icon: 'document-text-outline', color: '#14B8A6' },
      { label: 'Normal', value: normal, icon: 'checkmark-circle-outline', color: '#22C55E' },
      { label: 'À risque', value: atRisk, icon: 'alert-circle-outline', color: '#F59E0B' },
      { label: 'Critique', value: critical, icon: 'close-circle-outline', color: '#EF4444' },
    ];
  };

  return (
    <TestDashboard
      title="Dépistage Santé"
      icon="document-text-outline"
      accentColor="#14B8A6"
      kpis={calculateKPIs()}
      lastResults={results}
      onAddNew={() => navigation.navigate('oh-health-screening')}
      onSeeMore={() => navigation.navigate('oh-health-screening-list')}
      loading={loading}
      onRefresh={loadResults}
    />
  );
}
