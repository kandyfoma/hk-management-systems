import React, { useState, useEffect } from 'react';
import ApiService from '../../../services/ApiService';
import { TestDashboard, KPI } from '../components/TestDashboard';

interface HeavyMetalsResult {
  id: string;
  worker_id: string;
  worker_name: string;
  test_date: string;
  status: 'normal' | 'elevated' | 'critical';
  metal_type?: 'cobalt' | 'silica' | 'lead' | 'mercury' | 'manganese' | 'arsenic' | 'other';
  sample_type?: 'blood' | 'urine' | 'hair' | 'nail';
}

export function HeavyMetalsDashboardScreen({ navigation }: any) {
  const [results, setResults] = useState<HeavyMetalsResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const api = ApiService.getInstance();
      const response = await api.get('/occupational-health/heavy-metals-tests/');
      if (response.success && response.data) {
        let data = Array.isArray(response.data) ? response.data : response.data.results || [];
        data = data
          .sort((a: any, b: any) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime())
          .slice(0, 5);
        setResults(data);
      }
    } catch (error) {
      console.error('Error loading heavy metals results:', error);
    } finally {
      setLoading(false);
    }
  };

  const METAL_TYPE_LABELS: Record<string, string> = {
    'cobalt': 'Cobalt (Co)',
    'silica': 'Silice Cristalline',
    'lead': 'Plomb (Pb)',
    'mercury': 'Mercure (Hg)',
    'manganese': 'Manganèse (Mn)',
    'arsenic': 'Arsenic (As)',
    'other': 'Autres Métaux',
  };

  const calculateKPIs = (): KPI[] => {
    const total = results.length;
    const normal = results.filter(r => r.status === 'normal').length;
    const elevated = results.filter(r => r.status === 'elevated').length;
    const critical = results.filter(r => r.status === 'critical').length;

    return [
      { label: 'Total Tests', value: total, icon: 'flask-outline', color: '#122056' }, // Primary Blue
      { label: 'Normal', value: normal, icon: 'checkmark-circle-outline', color: '#818CF8' }, // Accent Light
      { label: 'Élevé', value: elevated, icon: 'alert-circle-outline', color: '#5B65DC' }, // Secondary Purple-Blue
      { label: 'Critique', value: critical, icon: 'close-circle-outline', color: '#0F1B42' }, // Primary Dark
    ];
  };

  return (
    <TestDashboard
      title="Métaux Lourds"
      icon="flask-outline"
      accentColor="#122056"
      kpis={calculateKPIs()}
      lastResults={results}
      groupByField="metal_type"
      groupLabels={METAL_TYPE_LABELS}
      onAddNew={() => navigation.navigate('oh-heavy-metals')}
      onSeeMore={() => navigation.navigate('oh-heavy-metals-list')}
      loading={loading}
      onRefresh={loadResults}
    />
  );
}
