import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import ApiService from '../../../services/ApiService';
import { Ionicons } from '@expo/vector-icons';
import { TestDashboard, KPI } from '../components/TestDashboard';
import { colors, spacing } from '../../../theme/theme';

interface AudiometryResult {
  id: string;
  worker_id: string;
  worker_name: string;
  test_date: string;
  left_ear_db: number;
  right_ear_db: number;
  frequency: number;
  status: 'normal' | 'warning' | 'critical';
  notes?: string;
}

export function AudiometryDashboardScreen({ navigation }: any) {
  const [results, setResults] = useState<AudiometryResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const api = ApiService.getInstance();
      const response = await api.get('/occupational-health/audiometry-results/');
      if (response.success && response.data) {
        let data = Array.isArray(response.data) ? response.data : response.data.results || [];
        // Sort by test_date descending (most recent first) and take top 5
        data = data
          .sort((a: any, b: any) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime())
          .slice(0, 5);
        setResults(data);
      }
    } catch (error) {
      console.error('Error loading audiometry results:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateKPIs = (): KPI[] => {
    const total = results.length;
    const normal = results.filter(r => r.status === 'normal').length;
    const warning = results.filter(r => r.status === 'warning').length;
    const critical = results.filter(r => r.status === 'critical').length;

    return [
      {
        label: 'Total Tests',
        value: total,
        icon: 'document-text-outline',
        color: '#3B82F6',
      },
      {
        label: 'Normal',
        value: normal,
        icon: 'checkmark-circle-outline',
        color: '#22C55E',
      },
      {
        label: 'Attention',
        value: warning,
        icon: 'alert-circle-outline',
        color: '#F59E0B',
      },
      {
        label: 'Critique',
        value: critical,
        icon: 'close-circle-outline',
        color: '#EF4444',
      },
    ];
  };

  const handleAddNew = () => {
    navigation.navigate('oh-audiometry');
  };

  const handleSeeMore = () => {
    navigation.navigate('oh-audiometry-list');
  };

  return (
    <TestDashboard
      title="Audiométrie"
      icon="volume-high-outline"
      accentColor="#3B82F6"
      kpis={calculateKPIs()}
      lastResults={results}
      onAddNew={handleAddNew}
      onSeeMore={handleSeeMore}
      loading={loading}
      onRefresh={loadResults}
    />
  );
}
