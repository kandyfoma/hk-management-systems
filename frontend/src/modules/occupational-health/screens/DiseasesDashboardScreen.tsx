import React, { useState, useEffect } from 'react';
import ApiService from '../../../services/ApiService';
import { TestDashboard, KPI } from '../components/TestDashboard';

interface OccupationalDiseaseResult {
  id: string;
  worker_id: string;
  worker_name: string;
  diagnosis_date: string;
  status: 'diagnosed' | 'under_investigation' | 'resolved';
  disease_type?: string; // e.g., 'asbestos_related', 'silicosis', 'dermatitis'
  disease_type_name?: string;
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

  const DISEASE_TYPE_LABELS: Record<string, string> = {
    'asbestos_related': 'Maladies Liées à l\'Amiante',
    'silicosis': 'Silicose',
    'asbestosis': 'Asbestose',
    'occupational_dermatitis': 'Dermatite Professionnelle',
    'occupational_asthma': 'Asthme Professionnel',
    'hearing_loss': 'Perte Auditive',
    'musculoskeletal_disorder': 'Troubles Musculo-Squelettiques',
    'chemical_exposure': 'Exposition Chimique',
    'radiation_exposure': 'Exposition aux Radiations',
    'heat_stress': 'Stress Thermique',
    'infectious_disease': 'Maladie Infectieuse',
    'mental_health': 'Santé Mentale Professionnelle',
    'other': 'Autres Maladies Professionnelles',
  };

  const calculateKPIs = (): KPI[] => {
    const total = results.length;
    const diagnosed = results.filter(r => r.status === 'diagnosed').length;
    const investigating = results.filter(r => r.status === 'under_investigation').length;
    const resolved = results.filter(r => r.status === 'resolved').length;

    return [
      { label: 'Total Maladies', value: total, icon: 'document-text-outline', color: '#1E3A8A' }, // Primary Light
      { label: 'Diagnostiquée', value: diagnosed, icon: 'alert-circle-outline', color: '#0F1B42' }, // Primary Dark
      { label: 'Investigation', value: investigating, icon: 'hourglass-outline', color: '#5B65DC' }, // Secondary Purple-Blue
      { label: 'Résolue', value: resolved, icon: 'checkmark-circle-outline', color: '#818CF8' }, // Accent Light
    ];
  };

  return (
    <TestDashboard
      title="Maladies Professionnelles"
      icon="warning-outline"
      accentColor="#1E3A8A"
      kpis={calculateKPIs()}
      lastResults={results}
      groupByField="disease_type"
      groupLabels={DISEASE_TYPE_LABELS}
      onAddNew={() => navigation.navigate('oh-diseases')}
      onSeeMore={() => navigation.navigate('oh-diseases-list')}
      loading={loading}
      onRefresh={loadResults}
    />
  );
}
