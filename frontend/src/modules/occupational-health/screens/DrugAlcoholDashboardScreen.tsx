import React, { useState, useEffect } from 'react';
import ApiService from '../../../services/ApiService';
import { TestDashboard, KPI } from '../components/TestDashboard';

interface DrugAlcoholResult {
  id: string;
  worker_id: string;
  worker_name: string;
  screening_date: string;
  status: 'negative' | 'positive' | 'inconclusive';
  test_type?: 'urine' | 'breath' | 'blood' | 'oral_fluid';
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

  const TEST_TYPE_LABELS: Record<string, string> = {
    'urine': 'Analyse d\'Urine',
    'breath': 'Test d\'Haleine',
    'blood': 'Analyse Sanguin',
    'oral_fluid': 'Fluide Oral',
  };

  const calculateKPIs = (): KPI[] => {
    const total = results.length;
    const negative = results.filter(r => r.status === 'negative').length;
    const positive = results.filter(r => r.status === 'positive').length;
    const inconclusive = results.filter(r => r.status === 'inconclusive').length;

    return [
      { label: 'Total Tests', value: total, icon: 'document-text-outline', color: '#818CF8' }, // Accent Light
      { label: 'Négatif', value: negative, icon: 'checkmark-circle-outline', color: '#818CF8' }, // Accent Light
      { label: 'Positif', value: positive, icon: 'close-circle-outline', color: '#0F1B42' }, // Primary Dark
      { label: 'Inconc.', value: inconclusive, icon: 'help-circle-outline', color: '#5B65DC' }, // Secondary Purple-Blue
    ];
  };

  return (
    <TestDashboard
      title="Dépistage D/A"
      icon="alert-circle-outline"
      accentColor="#818CF8"
      kpis={calculateKPIs()}
      lastResults={results}
      groupByField="test_type"
      groupLabels={TEST_TYPE_LABELS}
      onAddNew={() => navigation.navigate('oh-drug-alcohol-screening')}
      onSeeMore={() => navigation.navigate('oh-drug-alcohol-list')}
      loading={loading}
      onRefresh={loadResults}
    />
  );
}
