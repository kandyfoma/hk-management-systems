import React, { useState, useEffect } from 'react';
import ApiService from '../../../services/ApiService';
import { TestDashboard, KPI } from '../components/TestDashboard';

interface VisionTestResult {
  id: string;
  worker_id: string;
  worker_name: string;
  test_date: string;
  status: 'normal' | 'correction_needed' | 'refer_specialist';
  color_vision_test?: 'normal' | 'deficient' | 'not_tested';
}

export function VisionDashboardScreen({ navigation }: any) {
  const [results, setResults] = useState<VisionTestResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const api = ApiService.getInstance();
      const response = await api.get('/occupational-health/vision-test-results/');
      if (response.success && response.data) {
        let data = Array.isArray(response.data) ? response.data : response.data.results || [];
        // Sort by test_date descending (most recent first) and take top 5
        data = data
          .sort((a: any, b: any) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime())
          .slice(0, 5);
        setResults(data);
      }
    } catch (error) {
      console.error('Error loading vision test results:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLOR_VISION_LABELS: Record<string, string> = {
    'normal': 'Vision des Couleurs Normale',
    'deficient': 'Vision des Couleurs Déficiente',
    'not_tested': 'Non Testée',
  };

  const calculateKPIs = (): KPI[] => {
    const total = results.length;
    const normal = results.filter(r => r.status === 'normal').length;
    const correction = results.filter(r => r.status === 'correction_needed').length;
    const refer = results.filter(r => r.status === 'refer_specialist').length;

    return [
      { label: 'Total Tests', value: total, icon: 'document-text-outline', color: '#0F1B42' }, // Primary Dark
      { label: 'Normal', value: normal, icon: 'checkmark-circle-outline', color: '#818CF8' }, // Accent Light
      { label: 'Correction', value: correction, icon: 'alert-circle-outline', color: '#5B65DC' }, // Secondary Purple-Blue
      { label: 'Spécialiste', value: refer, icon: 'close-circle-outline', color: '#0F1B42' }, // Primary Dark
    ];
  };

  return (
    <TestDashboard
      title="Tests de Vision"
      icon="eye-outline"
      accentColor="#0F1B42"
      kpis={calculateKPIs()}
      lastResults={results}
      groupByField="color_vision_test"
      groupLabels={COLOR_VISION_LABELS}
      onAddNew={() => navigation.navigate('oh-vision')}
      onSeeMore={() => navigation.navigate('oh-vision-list')}
      loading={loading}
      onRefresh={loadResults}
    />
  );
}
