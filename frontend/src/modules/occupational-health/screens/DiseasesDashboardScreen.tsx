import React, { useState, useEffect } from 'react';
import ApiService from '../../../services/ApiService';
import { TestDashboard, KPI } from '../components/TestDashboard';

interface OccupationalDiseaseResult {
  id: string;
  worker_id: string;
  worker_name: string;
  diagnosis_date: string;
  status: 'diagnosed' | 'under_investigation' | 'resolved';
}

export function DiseasesDashboardScreen({ navigation }: any) {
  const [results, setResults] = useState<OccupationalDiseaseResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const api = ApiService.getInstance();
      const response = await api.get('/occupational-health/occupational-diseases-results/');
      if (response.success && response.data) {
        let data = Array.isArray(response.data) ? response.data : response.data.results || [];
        // Sort by diagnosis_date descending (most recent first) and take top 5
        data = data
          .sort((a: any, b: any) => new Date(b.diagnosis_date).getTime() - new Date(a.diagnosis_date).getTime())
          .slice(0, 5);
        setResults(data);
      }
    } catch (error) {
      console.error('Error loading occupational disease results:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateKPIs = (): KPI[] => {
    const total = results.length;
    const diagnosed = results.filter(r => r.status === 'diagnosed').length;
    const investigating = results.filter(r => r.status === 'under_investigation').length;
    const resolved = results.filter(r => r.status === 'resolved').length;

    return [
      { label: 'Total Maladies', value: total, icon: 'document-text-outline', color: '#DC2626' },
      { label: 'Diagnostiquée', value: diagnosed, icon: 'alert-circle-outline', color: '#EF4444' },
      { label: 'Investigation', value: investigating, icon: 'hourglass-outline', color: '#F59E0B' },
      { label: 'Résolue', value: resolved, icon: 'checkmark-circle-outline', color: '#22C55E' },
    ];
  };

  return (
    <TestDashboard
      title="Maladies Professionnelles"
      icon="warning-outline"
      accentColor="#DC2626"
      kpis={calculateKPIs()}
      lastResults={results}
      onAddNew={() => navigation.navigate('oh-diseases')}
      onSeeMore={() => navigation.navigate('oh-diseases-list')}
      loading={loading}
      onRefresh={loadResults}
    />
  );
}
