import React, { useState, useEffect } from 'react';
import ApiService from '../../../services/ApiService';
import { TestDashboard, KPI } from '../components/TestDashboard';

interface XrayResult {
  id: string;
  worker_id: string;
  worker_name: string;
  exam_date: string;
  status: 'normal' | 'abnormal' | 'pending';
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

  const calculateKPIs = (): KPI[] => {
    const total = results.length;
    const normal = results.filter(r => r.status === 'normal').length;
    const abnormal = results.filter(r => r.status === 'abnormal').length;
    const pending = results.filter(r => r.status === 'pending').length;

    return [
      { label: 'Total Tests', value: total, icon: 'document-text-outline', color: '#EF4444' },
      { label: 'Normal', value: normal, icon: 'checkmark-circle-outline', color: '#22C55E' },
      { label: 'Anormal', value: abnormal, icon: 'alert-circle-outline', color: '#F59E0B' },
      { label: 'En attente', value: pending, icon: 'hourglass-outline', color: '#3B82F6' },
    ];
  };

  return (
    <TestDashboard
      title="Imagerie Radiologique"
      icon="image-outline"
      accentColor="#EF4444"
      kpis={calculateKPIs()}
      lastResults={results}
      onAddNew={() => navigation.navigate('oh-xray')}
      onSeeMore={() => navigation.navigate('oh-xray-list')}
      loading={loading}
      onRefresh={loadResults}
    />
  );
}
