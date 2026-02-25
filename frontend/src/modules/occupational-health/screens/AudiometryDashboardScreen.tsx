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
  hearing_loss_classification?: 'normal' | 'mild' | 'moderate' | 'severe' | 'profound';
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

  const HEARING_LOSS_LABELS: Record<string, string> = {
    'normal': 'Normal (≤25 dB HL)',
    'mild': 'Légère (26-40 dB HL)',
    'moderate': 'Modérée (41-55 dB HL)',
    'severe': 'Sévère (56-70 dB HL)',
    'profound': 'Profonde (>70 dB HL)',
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
        color: '#122056', // Primary Blue
      },
      {
        label: 'Normal',
        value: normal,
        icon: 'checkmark-circle-outline',
        color: '#818CF8', // Accent Light
      },
      {
        label: 'Attention',
        value: warning,
        icon: 'alert-circle-outline',
        color: '#5B65DC', // Secondary Purple-Blue
      },
      {
        label: 'Critique',
        value: critical,
        icon: 'close-circle-outline',
        color: '#0F1B42', // Primary Blue Dark
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
      accentColor="#122056"
      kpis={calculateKPIs()}
      lastResults={results}
      groupByField="hearing_loss_classification"
      groupLabels={HEARING_LOSS_LABELS}
      onAddNew={handleAddNew}
      onSeeMore={handleSeeMore}
      loading={loading}
      onRefresh={loadResults}
    />
  );
}
