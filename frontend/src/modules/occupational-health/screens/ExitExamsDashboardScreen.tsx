import React, { useState, useEffect } from 'react';
import ApiService from '../../../services/ApiService';
import { TestDashboard, KPI } from '../components/TestDashboard';

interface ExitExamResult {
  id: string;
  worker_id: string;
  worker_name: string;
  exam_date: string;
  status: 'completed' | 'pending' | 'cancelled';
  reason_for_exit?: 'retirement' | 'resignation' | 'termination' | 'contract_end' | 'transfer' | 'other';
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

  const REASON_FOR_EXIT_LABELS: Record<string, string> = {
    'retirement': 'Retraite',
    'resignation': 'Démission',
    'termination': 'Licenciement',
    'contract_end': 'Fin de Contrat',
    'transfer': 'Transfert',
    'other': 'Autres',
  };

  const calculateKPIs = (): KPI[] => {
    const total = results.length;
    const completed = results.filter(r => r.status === 'completed').length;
    const pending = results.filter(r => r.status === 'pending').length;
    const cancelled = results.filter(r => r.status === 'cancelled').length;

    return [
      { label: 'Total Départ', value: total, icon: 'document-text-outline', color: '#5B65DC' }, // Secondary Purple-Blue
      { label: 'Complété', value: completed, icon: 'checkmark-circle-outline', color: '#818CF8' }, // Accent Light
      { label: 'En attente', value: pending, icon: 'hourglass-outline', color: '#5B65DC' }, // Secondary Purple-Blue
      { label: 'Annulé', value: cancelled, icon: 'close-circle-outline', color: '#0F1B42' }, // Primary Dark
    ];
  };

  return (
    <TestDashboard
      title="Examens de Départ"
      icon="log-out-outline"
      accentColor="#5B65DC"
      kpis={calculateKPIs()}
      lastResults={results}
      groupByField="reason_for_exit"
      groupLabels={REASON_FOR_EXIT_LABELS}
      onAddNew={() => navigation.navigate('oh-exit-exams')}
      onSeeMore={() => navigation.navigate('oh-exit-exams-list')}
      loading={loading}
      onRefresh={loadResults}
    />
  );
}
