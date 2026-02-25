import React, { useState, useEffect } from 'react';
import ApiService from '../../../services/ApiService';
import { TestDashboard, KPI } from '../components/TestDashboard';

interface DrugAlcoholResult {
  id: string;
  worker_id: string;
  worker_name: string;
  screening_date: string;
  status: 'negative' | 'positive' | 'inconclusive';
}

export function DrugAlcoholDashboardScreen({ navigation }: any) {
  const [results, setResults] = useState<DrugAlcoholResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const api = ApiService.getInstance();
      const response = await api.get('/occupational-health/drug-alcohol-screening-results/');
      if (response.success && response.data) {
        let data = Array.isArray(response.data) ? response.data : response.data.results || [];
        // Sort by screening_date descending (most recent first) and take top 5
        data = data
          .sort((a: any, b: any) => new Date(b.screening_date).getTime() - new Date(a.screening_date).getTime())
          .slice(0, 5);
        setResults(data);
      }
    } catch (error) {
      console.error('Error loading drug/alcohol screening results:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateKPIs = (): KPI[] => {
    const total = results.length;
    const negative = results.filter(r => r.status === 'negative').length;
    const positive = results.filter(r => r.status === 'positive').length;
    const inconclusive = results.filter(r => r.status === 'inconclusive').length;

    return [
      { label: 'Total Tests', value: total, icon: 'document-text-outline', color: '#8B5CF6' },
      { label: 'Négatif', value: negative, icon: 'checkmark-circle-outline', color: '#22C55E' },
      { label: 'Positif', value: positive, icon: 'close-circle-outline', color: '#EF4444' },
      { label: 'Inconc.', value: inconclusive, icon: 'help-circle-outline', color: '#F59E0B' },
    ];
  };

  return (
    <TestDashboard
      title="Dépistage D/A"
      icon="alert-circle-outline"
      accentColor="#8B5CF6"
      kpis={calculateKPIs()}
      lastResults={results}
      onAddNew={() => navigation.navigate('oh-drug-alcohol')}
      onSeeMore={() => navigation.navigate('oh-drug-alcohol-list')}
      loading={loading}
      onRefresh={loadResults}
    />
  );
}
