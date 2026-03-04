import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator,
  StyleSheet, Dimensions, Modal, Alert, Platform, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';

const { width } = Dimensions.get('window');

interface ExposureReading {
  id: number;
  exposure_type: string;
  exposure_value: number;
  unit_measurement: string;
  status: 'safe' | 'warning' | 'critical' | 'exceeded';
  measurement_date: string;
  sampling_location: string;
  worker: number | null;
  worker_name?: string;
  enterprise: number;
  equipment_id?: string;
  equipment_name?: string;
  calibration_date?: string;
  calibration_due_date?: string;
  measured_by?: number;
  measured_by_name?: string;
  reviewed_by?: number;
  reviewed_by_name?: string;
  osha_twa_limit: number | null;
  acgih_tlv_limit: number | null;
  local_limit?: number | null;
  percent_of_limit: number;
  alert_triggered: boolean;
  source_type?: string;
  is_valid_measurement: boolean;
  measurement_notes?: string;
  created_at: string;
  updated_at: string;
}

interface ExposureType {
  id: string;
  name: string;
  fullName: string;
  unit: string;
  osha_limit: number;
  acgih_limit: number;
  icon: string;
  color: string;
  riskColor: (value: number, limit: number) => string;
}

const EXPOSURE_TYPES: Record<string, ExposureType> = {
  silica_dust: {
    id: 'silica_dust',
    name: 'Silice',
    fullName: 'Silice Cristalline (Respirable)',
    unit: 'mg/m³',
    osha_limit: 0.025,
    acgih_limit: 0.025,
    icon: 'water-outline',
    color: colors.error,
    riskColor: (val, limit) => val >= limit * 1.5 ? colors.errorDark : val >= limit ? colors.error : '#FCA5A5'
  },
  cobalt: {
    id: 'cobalt',
    name: 'Cobalt',
    fullName: 'Cobalt & Composés de Cobalt',
    unit: 'µg/m³',
    osha_limit: 100,
    acgih_limit: 5,
    icon: 'sparkles-outline',
    color: colors.warning,
    riskColor: (val, limit) => val >= limit * 1.5 ? colors.warningDark : val >= limit ? colors.warning : '#FED7AA'
  },
  total_dust: {
    id: 'total_dust',
    name: 'Poussière',
    fullName: 'Poussière Totale Inhalable',
    unit: 'mg/m³',
    osha_limit: 5,
    acgih_limit: 3,
    icon: 'cloud-outline',
    color: colors.accent,
    riskColor: (val, limit) => val >= limit * 1.5 ? colors.accentDark : val >= limit ? colors.accent : 'rgba(129, 140, 248, 0.2)'
  },
  noise: {
    id: 'noise',
    name: 'Bruit',
    fullName: 'Niveau Sonore',
    unit: 'dB(A)',
    osha_limit: 90,
    acgih_limit: 85,
    icon: 'volume-high-outline',
    color: colors.info,
    riskColor: (val, limit) => val >= limit * 1.1 ? colors.infoDark : val >= limit ? colors.info : 'rgba(129, 140, 248, 0.2)'
  },
  vibration: {
    id: 'vibration',
    name: 'Vibration',
    fullName: 'Vibration Main-Bras',
    unit: 'm/s²',
    osha_limit: 5,
    acgih_limit: 2.2,
    icon: 'radio-outline',
    color: colors.secondary,
    riskColor: (val, limit) => val >= limit * 1.5 ? colors.secondaryDark : val >= limit ? colors.secondary : 'rgba(91, 101, 220, 0.2)'
  },
  heat: {
    id: 'heat',
    name: 'Chaleur',
    fullName: 'Température Globe Mouillé',
    unit: '°C',
    osha_limit: 32.2,
    acgih_limit: 28,
    icon: 'flame-outline',
    color: colors.error,
    riskColor: (val, limit) => val >= limit * 1.15 ? colors.errorDark : val >= limit ? colors.error : 'rgba(239, 68, 68, 0.2)'
  }
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: 'safe' | 'warning' | 'critical' | 'exceeded' }) {
  const config: Record<string, { color: string; label: string; icon: string }> = {
    safe: { color: colors.secondary, label: 'Sûr', icon: 'checkmark-circle' },
    warning: { color: colors.warning, label: 'Attention', icon: 'alert-circle' },
    exceeded: { color: colors.error, label: 'Dépassé', icon: 'close-circle' },
    critical: { color: colors.errorDark, label: 'Critique', icon: 'alert' },
  };
  const cfg = config[status] ?? { color: '#9CA3AF', label: status, icon: 'help-circle' };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.color + '20' }]}>
      <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Exposure Type Card ───────────────────────────────────────────────────────
function ExposureTypeCard({ 
  exposure, 
  readings, 
  onPress 
}: { 
  exposure: ExposureType; 
  readings: ExposureReading[]; 
  onPress: () => void 
}) {
  const exposureReadings = readings.filter(r => r.exposure_type === exposure.id);
  const latestReading = exposureReadings[0];
  const exceedCount = exposureReadings.filter(r => r.status === 'exceeded' || r.status === 'critical').length;
  const avgValue = exposureReadings.reduce((sum, r) => sum + Number(r.exposure_value), 0) / (exposureReadings.length || 1);
  const exceeding = latestReading && (latestReading.status === 'exceeded' || latestReading.status === 'critical');

  return (
    <TouchableOpacity 
      style={[styles.typeCard, { borderLeftColor: exposure.color, borderLeftWidth: 4 }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.typeCardHeader}>
        <View style={[styles.typeIcon, { backgroundColor: exposure.color + '20' }]}>
          <Ionicons name={exposure.icon as any} size={24} color={exposure.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.typeName}>{exposure.name}</Text>
          <Text style={styles.typeUnit}>{exposure.fullName}</Text>
        </View>
        {exceedCount > 0 && (
          <View style={styles.exceedBadge}>
            <Text style={styles.exceedCount}>{exceedCount}</Text>
            <Text style={styles.exceedLabel}>Dépassé</Text>
          </View>
        )}
      </View>

      {latestReading && (
        <View style={styles.typeCardContent}>
          <View style={styles.readingRow}>
            <Text style={styles.label}>Dernière Mesure :</Text>
            <View style={styles.valueWithStatus}>
              <Text style={[styles.value, { color: exceeding ? exposure.color : colors.secondary }]}>
                {Number(latestReading.exposure_value).toFixed(2)} {latestReading.unit_measurement}
              </Text>
              <StatusBadge status={latestReading.status} />
            </View>
          </View>
          <View style={styles.readingRow}>
            <Text style={styles.label}>Limite ACGIH :</Text>
            <Text style={styles.limit}>{exposure.acgih_limit} {exposure.unit}</Text>
          </View>
          <View style={styles.limitBar}>
            <View 
              style={[
                styles.limitFill, 
                { 
                  width: `${Math.min((avgValue / exposure.acgih_limit) * 100, 100)}%`,
                  backgroundColor: exposure.riskColor(avgValue, exposure.acgih_limit)
                }
              ]} 
            />
          </View>
          <Text style={styles.limitText}>
            {latestReading.worker_name || (latestReading.worker ? `Travailleur #${latestReading.worker}` : 'Mesure de Zone')} • {latestReading.sampling_location} • {latestReading.measurement_date}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Detailed Exposure View ───────────────────────────────────────────────────
function ExposureDetailModal({ 
  exposure, 
  readings, 
  visible, 
  onClose 
}: { 
  exposure: ExposureType | null; 
  readings: ExposureReading[]; 
  visible: boolean; 
  onClose: () => void 
}) {
  if (!exposure) return null;

  const exposureReadings = readings.filter(r => r.exposure_type === exposure.id);
  const exceedCount = exposureReadings.filter(r => r.status === 'exceeded' || r.status === 'critical').length;
  const safeCount = exposureReadings.filter(r => r.status === 'safe').length;
  const avgValue = exposureReadings.reduce((sum, r) => sum + Number(r.exposure_value), 0) / (exposureReadings.length || 1);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <View style={[styles.typeIcon, { backgroundColor: exposure.color + '20' }]}>
                <Ionicons name={exposure.icon as any} size={28} color={exposure.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{exposure.fullName}</Text>
                <Text style={styles.modalSubtitle}>{exposure.unit}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Statistics */}
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { borderTopColor: exposure.color }]}>
                <Text style={styles.statLabel}>Mesures</Text>
                <Text style={styles.statValue}>{exposureReadings.length}</Text>
              </View>
              <View style={[styles.statCard, { borderTopColor: colors.secondary }]}>
                <Text style={styles.statLabel}>Sûres</Text>
                <Text style={[styles.statValue, { color: colors.secondary }]}>{safeCount}</Text>
              </View>
              <View style={[styles.statCard, { borderTopColor: colors.error }]}>
                <Text style={styles.statLabel}>Dépassées</Text>
                <Text style={[styles.statValue, { color: colors.error }]}>{exceedCount}</Text>
              </View>
              <View style={[styles.statCard, { borderTopColor: exposure.color }]}>
                <Text style={styles.statLabel}>Moyenne</Text>
                <Text style={styles.statValue}>{avgValue.toFixed(2)}</Text>
              </View>
            </View>

            {/* Limit Info */}
            <View style={styles.limitSection}>
              <Text style={styles.sectionTitle}>Valeurs Limites d'Exposition</Text>
              <View style={styles.limitRow}>
                <Text style={styles.limitRowLabel}>OSHA VLE :</Text>
                <Text style={styles.limitRowValue}>{exposure.osha_limit} {exposure.unit}</Text>
              </View>
              <View style={styles.limitRow}>
                <Text style={styles.limitRowLabel}>ACGIH TLV :</Text>
                <Text style={styles.limitRowValue}>{exposure.acgih_limit} {exposure.unit}</Text>
              </View>
              <View style={[styles.limitBar, { marginTop: 12 }]}>
                <View 
                  style={[
                    styles.limitFill, 
                    { 
                      width: `${Math.min((avgValue / exposure.acgih_limit) * 100, 100)}%`,
                      backgroundColor: exposure.riskColor(avgValue, exposure.acgih_limit)
                    }
                  ]} 
                />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 8 }}>
                <Text style={styles.limitScaleLabel}>0</Text>
                <Text style={styles.limitScaleLabel}>{exposure.acgih_limit} {exposure.unit}</Text>
              </View>
            </View>

            {/* Recent Readings Table */}
            <View style={styles.readingsSection}>
              <Text style={styles.sectionTitle}>Mesures Récentes</Text>
              <View style={styles.readingsTable}>
                <View style={[styles.tableHeader, { backgroundColor: exposure.color + '15' }]}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>Travailleur</Text>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>Valeur</Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>Zone</Text>
                </View>
                {exposureReadings.map(reading => (
                  <View key={reading.id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>
                      {reading.worker_name?.split(' ')[0] || (reading.worker ? `#${reading.worker}` : 'Zone')}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1.5, color: reading.status === 'safe' ? colors.secondary : colors.error }]}>
                      {Number(reading.exposure_value).toFixed(2)}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1 }]} numberOfLines={1}>
                      {reading.sampling_location.split(' ')[0] || '—'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function ExposureMonitoringScreen() {
  const [readings, setReadings] = useState<ExposureReading[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedExposure, setSelectedExposure] = useState<ExposureType | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [manualEntryVisible, setManualEntryVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'safe' | 'warning' | 'exceeded' | 'critical'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'value' | 'status'>('date');
  const [searchText, setSearchText] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [submitting, setSubmitting] = useState(false);
  const [userEnterprise, setUserEnterprise] = useState<number | null>(null);

  // Manual entry form state
  const [newReading, setNewReading] = useState({
    exposure_type: '',
    exposure_value: '',
    unit_measurement: '',
    sampling_location: '',
    equipment_name: '',
    source_type: 'manual_entry',
  });

  // Form validation
  const isFormValid = () => {
    return (
      newReading.exposure_type.trim() !== '' &&
      newReading.exposure_value.trim() !== '' &&
      newReading.sampling_location.trim() !== ''
    );
  };

  // Fetch user's enterprise on mount
  useEffect(() => {
    const fetchUserEnterprise = async () => {
      try {
        const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
        const token = await AsyncStorage.getItem('auth_token');
        if (!token) return;

        const response = await axios.get(`${baseURL}/api/v1/auth/profile/`, {
          headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' },
          timeout: 5000,
        });
        
        const profileData = response.data.user || response.data;
        if (profileData.enterprise_id) {
          setUserEnterprise(profileData.enterprise_id);
        } else if (profileData.enterprise) {
          setUserEnterprise(profileData.enterprise);
        }
      } catch (err) {
        console.error('Failed to fetch user enterprise:', err);
      }
    };
    fetchUserEnterprise();
  }, []);

  // Load readings from API
  const loadReadings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const token = await AsyncStorage.getItem('auth_token');

      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      if (filterType !== 'all') {
        params.append('exposure_type', filterType);
      }
      params.append('ordering', sortBy === 'date' ? '-measurement_date' : sortBy === 'value' ? '-exposure_value' : '-status');

      const response = await axios.get(`${baseURL}/api/v1/occupational-health/exposure-readings/?${params.toString()}`, {
        headers: token ? { Authorization: `Token ${token}`, 'Content-Type': 'application/json' } : {},
      });
      setReadings(response.data.results || response.data);
    } catch (err: any) {
      console.error('Failed to load exposure readings:', err);
      setError(err.response?.data?.detail || 'Échec du chargement des mesures');
      setReadings([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType, sortBy]);

  // Load readings on mount and when filters change
  useEffect(() => {
    loadReadings();
  }, [loadReadings]);

  // Submit manual entry
  const handleSubmitReading = useCallback(async () => {
    if (!newReading.exposure_type || !newReading.exposure_value || !newReading.sampling_location) {
      Alert.alert('Champs manquants', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    const parsedValue = parseFloat(newReading.exposure_value);
    if (isNaN(parsedValue) || parsedValue < 0) {
      Alert.alert('Valeur invalide', 'La valeur d\'exposition doit être un nombre positif');
      return;
    }

    try {
      setSubmitting(true);
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const token = await AsyncStorage.getItem('auth_token');

      const readingData: any = {
        exposure_type: newReading.exposure_type,
        exposure_value: parsedValue,
        unit_measurement: newReading.unit_measurement,
        sampling_location: newReading.sampling_location,
        equipment_name: newReading.equipment_name || '',
        source_type: newReading.source_type,
        measurement_date: new Date().toISOString().split('T')[0],
      };

      // Only include enterprise if available (backend will auto-assign from request.user if not provided)
      if (userEnterprise) {
        readingData.enterprise = userEnterprise;
      }

      await axios.post(
        `${baseURL}/api/v1/occupational-health/exposure-readings/`,
        readingData,
        {
          headers: token ? { Authorization: `Token ${token}`, 'Content-Type': 'application/json' } : {},
        }
      );

      Alert.alert('Succès', 'Mesure d\'exposition enregistrée');
      setManualEntryVisible(false);
      setNewReading({
        exposure_type: '',
        exposure_value: '',
        unit_measurement: '',
        sampling_location: '',
        equipment_name: '',
        source_type: 'manual_entry',
      });
      await loadReadings();
    } catch (err: any) {
      const errorData = err.response?.data;
      const errorMessage = errorData?.detail || errorData?.enterprise?.[0] || JSON.stringify(errorData) || 'Failed to submit reading';
      console.error('Submission error:', { status: err.response?.status, errorData, message: errorMessage });
      Alert.alert('Erreur', errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, [newReading, loadReadings]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReadings();
    setRefreshing(false);
  }, [loadReadings]);

  const filteredReadings = useMemo(() => {
    let filtered = readings;
    
    // Apply search filter
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(r => 
        (r.worker_name?.toLowerCase() || '').includes(search) ||
        (r.sampling_location?.toLowerCase() || '').includes(search) ||
        (r.equipment_name?.toLowerCase() || '').includes(search) ||
        (r.exposure_type?.toLowerCase() || '').includes(search)
      );
    }
    
    // Apply sorting
    if (sortBy === 'value') {
      filtered = [...filtered].sort((a, b) => b.exposure_value - a.exposure_value);
    } else if (sortBy === 'status') {
      const statusOrder = { critical: 0, exceeded: 1, warning: 2, safe: 3 };
      filtered = [...filtered].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
    }

    return filtered;
  }, [readings, sortBy, searchText]);

  // Pagination
  const totalPages = Math.ceil(filteredReadings.length / ITEMS_PER_PAGE);
  const paginatedReadings = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredReadings.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filteredReadings, currentPage]);

  // Reset to page 1 when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, filterStatus, filterType, sortBy]);

  const stats = useMemo(() => ({
    total: readings.length,
    safe: readings.filter(r => r.status === 'safe').length,
    warning: readings.filter(r => r.status === 'warning').length,
    exceeded: readings.filter(r => r.status === 'exceeded' || r.status === 'critical').length,
  }), [readings]);

  const openModal = useCallback((exposure: ExposureType) => {
    setSelectedExposure(exposure);
    setModalVisible(true);
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Surveillance des Expositions</Text>
        <Text style={styles.headerSubtitle}>Suivi des expositions professionnelles en temps réel</Text>
      </View>

      {error && (
        <View style={styles.errorBar}>
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Filter /Sort Bar */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
          <TouchableOpacity 
            style={[styles.filterBadge, filterStatus === 'all' && styles.filterBadgeActive]}
            onPress={() => setFilterStatus('all')}
          >
            <Text style={[styles.filterText, filterStatus === 'all' && { color: colors.primary }]}>
              Tout ({stats.total})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterBadge, filterStatus === 'safe' && styles.filterBadgeActive]}
            onPress={() => setFilterStatus('safe')}
          >
            <Text style={[styles.filterText, filterStatus === 'safe' && { color: colors.secondary }]}>
              Sûr ({stats.safe})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterBadge, filterStatus === 'exceeded' && styles.filterBadgeActive]}
            onPress={() => setFilterStatus('exceeded')}
          >
            <Text style={[styles.filterText, filterStatus === 'exceeded' && { color: colors.error }]}>
              Dépassé ({stats.exceeded})
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Add Reading Button */}
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setManualEntryVisible(true)}
        >
          <Ionicons name="add" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {loading && readings.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Chargement des mesures...</Text>
          </View>
        ) : (
          <>
            {/* Overview Cards */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Types d'Exposition</Text>
              <View style={styles.typesGrid}>
                {Object.values(EXPOSURE_TYPES).map(exposure => (
                  <ExposureTypeCard 
                    key={exposure.id} 
                    exposure={exposure} 
                    readings={readings}
                    onPress={() => openModal(exposure)}
                  />
                ))}
              </View>
            </View>

            {/* Search & Filter Controls */}
            <View style={styles.section}>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Chercher travailleur, lieu, équipement..."
                  placeholderTextColor={colors.textSecondary}
                  value={searchText}
                  onChangeText={setSearchText}
                />
                {searchText.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchText('')}>
                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Filter Chips */}
              <View style={styles.filterChipsContainer}>
                <Text style={styles.filterLabel}>Statut :</Text>
                <View style={styles.chipsRow}>
                  {[
                    { id: 'all' as const, label: 'Tous' },
                    { id: 'safe' as const, label: 'Sûr' },
                    { id: 'warning' as const, label: 'Attention' },
                    { id: 'exceeded' as const, label: 'Dépassé' },
                    { id: 'critical' as const, label: 'Critique' }
                  ].map(chip => (
                    <TouchableOpacity
                      key={chip.id}
                      style={[
                        styles.filterChip,
                        filterStatus === chip.id && styles.filterChipActive
                      ]}
                      onPress={() => {
                        setFilterStatus(chip.id);
                        setCurrentPage(1);
                      }}
                      disabled={loading}
                    >
                      <Text style={[
                        styles.filterChipText,
                        filterStatus === chip.id && styles.filterChipActiveText
                      ]}>
                        {chip.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Results Summary & Sort */}
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsText}>
                  {filteredReadings.length} résultats • Page {currentPage} sur {totalPages}
                </Text>
                <TouchableOpacity onPress={() => setSortBy(sortBy === 'date' ? 'value' : 'date')} style={styles.sortButton}>
                  <Ionicons name="swap-vertical" size={16} color={colors.primary} />
                  <Text style={styles.sortButtonText}>
                    {sortBy === 'date' ? 'Date ↓' : 'Valeur ↓'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Recent Readings Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mesures Récentes</Text>

              {paginatedReadings.length > 0 ? (
                <>
                  {paginatedReadings.map(reading => (
                  <View key={reading.id} style={styles.readingCard}>
                    <View style={styles.readingHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.readingWorker}>{reading.worker_name || (reading.worker ? `Travailleur #${reading.worker}` : 'Mesure de Zone')}</Text>
                        <Text style={styles.readingArea}>{reading.sampling_location}</Text>
                      </View>
                      <StatusBadge status={reading.status} />
                    </View>
                    <View style={styles.readingDetails}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailLabel}>Valeur</Text>
                        <Text style={[styles.detailValue, { color: reading.status === 'safe' ? colors.secondary : colors.error }]}>
                          {Number(reading.exposure_value).toFixed(3)} {reading.unit_measurement}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailLabel}>Limite</Text>
                        <Text style={styles.detailValue}>{reading.acgih_tlv_limit != null ? reading.acgih_tlv_limit : '—'} {reading.unit_measurement}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailLabel}>Date</Text>
                        <Text style={styles.detailValue}>{reading.measurement_date}</Text>
                      </View>
                    </View>
                  </View>
                  ))}
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <View style={styles.paginationContainer}>
                      <TouchableOpacity
                        style={[
                          styles.paginationBtn,
                          currentPage === 1 && styles.paginationBtnDisabled
                        ]}
                        onPress={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <Ionicons name="chevron-back" size={18} color={currentPage === 1 ? colors.textSecondary : colors.primary} />
                        <Text style={[
                          styles.paginationBtnText,
                          currentPage === 1 && { color: colors.textSecondary }
                        ]}>Précédent</Text>
                      </TouchableOpacity>

                      <Text style={styles.paginationInfo}>
                        Page <Text style={styles.paginationPageNumber}>{currentPage}</Text> / <Text style={styles.paginationPageNumber}>{totalPages}</Text>
                      </Text>

                      <TouchableOpacity
                        style={[
                          styles.paginationBtn,
                          currentPage === totalPages && styles.paginationBtnDisabled
                        ]}
                        onPress={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        <Text style={[
                          styles.paginationBtnText,
                          currentPage === totalPages && { color: colors.textSecondary }
                        ]}>Suivant</Text>
                        <Ionicons name="chevron-forward" size={18} color={currentPage === totalPages ? colors.textSecondary : colors.primary} />
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="information-circle-outline" size={48} color={colors.textSecondary} />
                  <Text style={styles.emptyStateText}>Aucune mesure trouvée</Text>
                </View>
              )}
            </View>

            <View style={{ height: 20 }} />
          </>
        )}
      </ScrollView>

      {/* Detail Modal */}
      <ExposureDetailModal 
        exposure={selectedExposure}
        readings={readings}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />

      {/* Manual Entry Modal */}
      <Modal visible={manualEntryVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enregistrer une Mesure d'Exposition</Text>
              <TouchableOpacity onPress={() => setManualEntryVisible(false)}>
                <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.formLabel}>Type d'Exposition *</Text>
              <View style={styles.pickerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {Object.values(EXPOSURE_TYPES).map(type => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.typeOption,
                        newReading.exposure_type === type.id && styles.typeOptionActive
                      ]}
                      onPress={() => {
                        setNewReading({ ...newReading, exposure_type: type.id, unit_measurement: type.unit });
                      }}
                    >
                      <Text style={[
                        styles.typeOptionText,
                        newReading.exposure_type === type.id && { color: '#FFF', fontWeight: '700' }
                      ]}>
                        {type.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={styles.formLabel}>Valeur d'Exposition *</Text>
              <TextInput
                style={styles.input}
                placeholder="Saisir la valeur mesurée"
                keyboardType="decimal-pad"
                value={newReading.exposure_value}
                onChangeText={(text) => setNewReading({ ...newReading, exposure_value: text })}
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.formLabel}>Unité</Text>
              <Text style={styles.unitDisplay}>
                {newReading.unit_measurement || 'Sélectionner un type d\'exposition d\'abord'}
              </Text>

              <Text style={styles.formLabel}>Lieu de Prélèvement *</Text>
              <TextInput
                style={styles.input}
                placeholder="ex: Puits Principal, Broyeur"
                value={newReading.sampling_location}
                onChangeText={(text) => setNewReading({ ...newReading, sampling_location: text })}
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.formLabel}>Nom de l'Équipement (Optionnel)</Text>
              <TextInput
                style={styles.input}
                placeholder="ex: Échantillonneur Gravimétrique #02"
                value={newReading.equipment_name}
                onChangeText={(text) => setNewReading({ ...newReading, equipment_name: text })}
                placeholderTextColor={colors.textSecondary}
              />

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!isFormValid() || submitting) && styles.submitButtonDisabled
                ]}
                onPress={handleSubmitReading}
                disabled={!isFormValid() || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={[styles.submitButtonText, !isFormValid() && styles.submitButtonTextDisabled]}>
                    Enregistrer la Mesure
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  errorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#FEE2E2',
    gap: spacing.sm,
  },
  errorText: {
    fontSize: 12,
    color: colors.errorDark,
    flex: 1,
  },
  filterBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  filterBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceVariant,
  },
  filterBadgeActive: {
    backgroundColor: colors.primaryFaded,
  },
  filterText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  sortText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  typesGrid: {
    gap: spacing.md,
  },
  typeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.md,
  },
  typeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  typeUnit: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  exceedBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: borderRadius.md,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  exceedCount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.errorDark,
  },
  exceedLabel: {
    fontSize: 10,
    color: colors.errorDark,
    fontWeight: '500',
  },
  typeCardContent: {
    gap: spacing.md,
  },
  readingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  valueWithStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  limit: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  limitBar: {
    height: 6,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  limitFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  limitText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  readingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  readingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  readingWorker: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  readingArea: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  readingDetails: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  detailLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalBody: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 0.5,
    backgroundColor: colors.surfaceVariant,
    borderTopWidth: 3,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  limitSection: {
    marginBottom: spacing.lg,
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  limitRowLabel: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  limitRowValue: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  limitScaleLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  readingsSection: {
    marginBottom: spacing.lg,
  },
  readingsTable: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.outline,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  tableCell: {
    fontSize: 12,
    color: colors.text,
  },
  closeButton: {
    margin: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  pickerContainer: {
    marginBottom: spacing.md,
  },
  typeOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceVariant,
  },
  typeOptionActive: {
    backgroundColor: colors.primary,
  },
  typeOptionText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  unitDisplay: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  submitButtonDisabled: {
    opacity: 0.5,
    backgroundColor: colors.textSecondary,
  },
  submitButtonTextDisabled: {
    color: colors.textTertiary,
  },
  // Search & Filter Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  filterChipsContainer: {
    marginBottom: spacing.lg,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceVariant,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  filterChipActive: {
    backgroundColor: colors.primaryFaded,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  filterChipActiveText: {
    color: colors.primary,
    fontWeight: '600',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  resultsText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryFaded,
    gap: spacing.sm,
  },
  sortButtonText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  paginationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryFaded,
    gap: 4,
  },
  paginationBtnDisabled: {
    backgroundColor: colors.outline,
    opacity: 0.5,
  },
  paginationBtnText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  paginationInfo: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  paginationPageNumber: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },
});
