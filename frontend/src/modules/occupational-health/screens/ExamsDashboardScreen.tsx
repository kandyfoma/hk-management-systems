import React, { useState, useEffect } from 'react';
import ApiService from '../../../services/ApiService';
import { TestDashboard, KPI } from '../components/TestDashboard';

interface MedicalExamResult {
  id: string;
  worker_id: string;
  worker_name: string;
  exam_date: string;
  status: 'normal' | 'abnormal' | 'pending';
  exam_type?: 'pre_employment' | 'periodic' | 'return_to_work' | 'special' | 'exit' | 'night_work' | 'pregnancy_related' | 'post_incident';
}

export function ExamsDashboardScreen({ navigation }: any) {
  const [results, setResults] = useState<MedicalExamResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const api = ApiService.getInstance();
      const response = await api.get('/occupational-health/medical-exams-results/');
      if (response.success && response.data) {
        let data = Array.isArray(response.data) ? response.data : response.data.results || [];
        // Sort by exam_date descending (most recent first) and take top 5
        data = data
          .sort((a: any, b: any) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime())
          .slice(0, 5);
        setResults(data);
      }
    } catch (error) {
      console.error('Error loading medical exam results:', error);
    } finally {
      setLoading(false);
    }
  };

  const EXAM_TYPE_LABELS: Record<string, string> = {
    'pre_employment': 'Visite Pré-embauché',
    'periodic': 'Visite Périodique',
    'return_to_work': 'Visite de Reprise du Travail',
    'special': 'Visite Spéciale',
    'exit': 'Visite de Sortie',
    'night_work': 'Visite Travail de Nuit',
    'pregnancy_related': 'Visite Grossesse',
    'post_incident': 'Visite Post-Incident',
  };

  const calculateKPIs = (): KPI[] => {
    const total = results.length;
    const normal = results.filter(r => r.status === 'normal').length;
    const abnormal = results.filter(r => r.status === 'abnormal').length;
    const pending = results.filter(r => r.status === 'pending').length;

    return [
      { label: 'Total Visites', value: total, icon: 'document-text-outline', color: '#818CF8' }, // Accent Light
      { label: 'Normal', value: normal, icon: 'checkmark-circle-outline', color: '#818CF8' }, // Accent Light
      { label: 'Anormal', value: abnormal, icon: 'alert-circle-outline', color: '#5B65DC' }, // Secondary Purple-Blue
      { label: 'En attente', value: pending, icon: 'hourglass-outline', color: '#A5B4FC' }, // Accent Lighter
    ];
  };

  return (
    <TestDashboard
      title="Visite Médicale"
      icon="medkit-outline"
      accentColor="#818CF8"
      kpis={calculateKPIs()}
      lastResults={results}
      groupByField="exam_type"
      groupLabels={EXAM_TYPE_LABELS}
      onAddNew={() => navigation.navigate('oh-exams')}
      onSeeMore={() => navigation.navigate('oh-exams-list')}
      loading={loading}
      onRefresh={loadResults}
    />
  );
}
