import React, { useState, useEffect } from 'react';
import ApiService from '../../../services/ApiService';
import { TestDashboard, KPI } from '../components/TestDashboard';

interface SpirometryResult {
  id: string;
  worker_id: string;
  worker_name: string;
  test_date: string;
  fev1: number;
  fvc: number;
  status: 'normal' | 'warning' | 'critical';
}

export function SpirometryDashboardScreen({ navigation }: any) {
  const [results, setResults] = useState<SpirometryResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const api = ApiService.getInstance();
      const response = await api.get('/occupational-health/spirometry-results/');
      if (response.success && response.data) {
        let data = Array.isArray(response.data) ? response.data : response.data.results || [];
        // Sort by test_date descending (most recent first) and take top 5
        data = data
          .sort((a: any, b: any) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime())
          .slice(0, 5);
        setResults(data);
      }
    } catch (error) {
      console.error('Error loading spirometry results:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateKPIs = (): KPI[] => {
    const total = results.length;
    const normal = results.filter(r => r.status === 'normal').length;
    const warning = results.filter(r => r.status === 'warning').length;
    const critical = results.filter(r => r.status === 'critical').length;

    return [
      { label: 'Total Tests', value: total, icon: 'document-text-outline', color: '#10B981' },
      { label: 'Normal', value: normal, icon: 'checkmark-circle-outline', color: '#22C55E' },
      { label: 'Attention', value: warning, icon: 'alert-circle-outline', color: '#F59E0B' },
      { label: 'Critique', value: critical, icon: 'close-circle-outline', color: '#EF4444' },
    ];
  };

  return (
    <TestDashboard
      title="Spirométrie"
      icon="fitness-outline"
      accentColor="#10B981"
      kpis={calculateKPIs()}
      lastResults={results}
      onAddNew={() => navigation.navigate('oh-spirometry')}
      onSeeMore={() => navigation.navigate('oh-spirometry-list')}
      loading={loading}
      onRefresh={loadResults}
    />
  );
}
