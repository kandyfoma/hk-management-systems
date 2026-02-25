import React, { useState, useEffect } from 'react';
import ApiService from '../../../services/ApiService';
import { TestDashboard, KPI } from '../components/TestDashboard';

interface ExitExamResult {
  id: string;
  worker_id: string;
  worker_name: string;
  exam_date: string;
  status: 'completed' | 'pending' | 'cancelled';
}

export function ExitExamsDashboardScreen({ navigation }: any) {
  const [results, setResults] = useState<ExitExamResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const api = ApiService.getInstance();
      const response = await api.get('/occupational-health/exit-exams-results/');
      if (response.success && response.data) {
        let data = Array.isArray(response.data) ? response.data : response.data.results || [];
        // Sort by exam_date descending (most recent first) and take top 5
        data = data
          .sort((a: any, b: any) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime())
          .slice(0, 5);
        setResults(data);
      }
    } catch (error) {
      console.error('Error loading exit exam results:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateKPIs = (): KPI[] => {
    const total = results.length;
    const completed = results.filter(r => r.status === 'completed').length;
    const pending = results.filter(r => r.status === 'pending').length;
    const cancelled = results.filter(r => r.status === 'cancelled').length;

    return [
      { label: 'Total Départ', value: total, icon: 'document-text-outline', color: '#F97316' },
      { label: 'Complété', value: completed, icon: 'checkmark-circle-outline', color: '#22C55E' },
      { label: 'En attente', value: pending, icon: 'hourglass-outline', color: '#F59E0B' },
      { label: 'Annulé', value: cancelled, icon: 'close-circle-outline', color: '#EF4444' },
    ];
  };

  return (
    <TestDashboard
      title="Examens de Départ"
      icon="log-out-outline"
      accentColor="#F97316"
      kpis={calculateKPIs()}
      lastResults={results}
      onAddNew={() => navigation.navigate('oh-exit-exams')}
      onSeeMore={() => navigation.navigate('oh-exit-exams-list')}
      loading={loading}
      onRefresh={loadResults}
    />
  );
}
