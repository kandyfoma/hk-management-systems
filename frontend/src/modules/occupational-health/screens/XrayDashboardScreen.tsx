import React, { useState, useEffect } from 'react';
import ApiService from '../../../services/ApiService';
import { TestDashboard, KPI } from '../components/TestDashboard';

interface XrayResult {
  id: string;
  worker_id: string;
  worker_name: string;
  exam_date: string;
  status: 'normal' | 'abnormal' | 'pending';
  imaging_type?: 'chest_xray' | 'hrct' | 'plain_film';
}

export function XrayDashboardScreen({ navigation }: any) {
  const [results, setResults] = useState<XrayResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const api = ApiService.getInstance();
      const response = await api.get('/occupational-health/xray-imaging-results/');
      if (response.success && response.data) {
        let data = Array.isArray(response.data) ? response.data : response.data.results || [];
        // Sort by exam_date descending (most recent first) and take top 5
        data = data
          .sort((a: any, b: any) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime())
          .slice(0, 5);
        setResults(data);
      }
    } catch (error) {
      console.error('Error loading X-ray results:', error);
    } finally {
      setLoading(false);
    }
  };

  const IMAGING_TYPE_LABELS: Record<string, string> = {
    'chest_xray': 'Radiographie Thoracique',
    'hrct': 'Tomodensitométrie Haute Résolution',
    'plain_film': 'Radiographie Simple',
  };

  const calculateKPIs = (): KPI[] => {
    const total = results.length;
    const normal = results.filter(r => r.status === 'normal').length;
    const abnormal = results.filter(r => r.status === 'abnormal').length;
    const pending = results.filter(r => r.status === 'pending').length;

    return [
      { label: 'Total Tests', value: total, icon: 'document-text-outline', color: '#5B65DC' }, // Secondary Purple-Blue
      { label: 'Normal', value: normal, icon: 'checkmark-circle-outline', color: '#818CF8' }, // Accent Light
      { label: 'Anormal', value: abnormal, icon: 'alert-circle-outline', color: '#5B65DC' }, // Secondary Purple-Blue
      { label: 'En attente', value: pending, icon: 'hourglass-outline', color: '#A5B4FC' }, // Accent Lighter
    ];
  };

  return (
    <TestDashboard
      title="Imagerie Radiologique"
      icon="image-outline"
      accentColor="#5B65DC"
      kpis={calculateKPIs()}
      lastResults={results}
      groupByField="imaging_type"
      groupLabels={IMAGING_TYPE_LABELS}
      onAddNew={() => navigation.navigate('oh-xray-imaging')}
      onSeeMore={() => navigation.navigate('oh-xray-list')}
      loading={loading}
      onRefresh={loadResults}
    />
  );
}
