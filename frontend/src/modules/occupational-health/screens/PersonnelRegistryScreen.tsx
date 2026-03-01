import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator,
  StyleSheet, Dimensions, Modal, Alert, Platform, RefreshControl, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { getTextColor } from '../../../utils/colorContrast';
import { OccHealthApiService } from '../../../services/OccHealthApiService';
import { useSimpleToast } from '../../../hooks/useSimpleToast';
import { SimpleToastNotification } from '../../../components/SimpleToastNotification';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;
const ACCENT = colors.primary;

// ─── Types ──────────────────────────────────────────────────────
interface PersonnelRecord {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  company: string;
  sector: string;
  site: string;
  siteId?: string;
  department: string;
  departmentId?: string;
  jobTitle: string;
  positionId?: string;
  status: 'active' | 'inactive' | 'terminated';
  riskScore: number;
  fitnessStatus: 'fit' | 'fit_with_restrictions' | 'temporarily_unfit' | 'permanently_unfit' | 'pending_evaluation';
  nextMedicalExam?: string;
  lastMedicalExam?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  hireDate?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  gender?: string;
}

// ─── Personnel Card Component ───────────────────────────────────
function PersonnelCard({ 
  record, 
  onPress 
}: { 
  record: PersonnelRecord; 
  onPress: () => void;
}) {
  const getRiskColor = (score: number) => {
    if (score < 30) return '#22C55E';
    if (score < 50) return '#F59E0B';
    if (score < 75) return '#EF4444';
    return '#7C2D12';
  };

  const getFitnessColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'fit': colors.secondary,
      'fit_with_restrictions': colors.warningDark,
      'temporarily_unfit': colors.error,
      'permanently_unfit': '#7C2D12',
      'pending_evaluation': colors.secondaryDark,
    };
    return colorMap[status] || colors.textSecondary;
  };

  const getFitnessLabel = (status: string) => {
    const labelMap: Record<string, string> = {
      'fit': 'Apte',
      'fit_with_restrictions': 'Restrictions',
      'temporarily_unfit': 'Inapte Temp.',
      'permanently_unfit': 'Inapte Perm.',
      'pending_evaluation': 'En attente',
    };
    return labelMap[status] || status;
  };

  const isOverdue = record.nextMedicalExam && new Date(record.nextMedicalExam) < new Date();

  return (
    <TouchableOpacity 
      style={[styles.personnelCard, shadows.sm]} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.primaryFaded }]}>
          <Ionicons name="person" size={24} color={colors.primary} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.personnelName}>
              {record.firstName} {record.lastName}
            </Text>
            {isOverdue && (
              <View style={styles.overdueBadge}>
                <Ionicons name="alert-circle" size={11} color="#FFF" />
                <Text style={styles.overdueBadgeText}>RETARD</Text>
              </View>
            )}
            {record.status === 'inactive' && (
              <View style={[styles.statusBadge, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.statusBadgeText, { color: colors.textSecondary }]}>Inactif</Text>
              </View>
            )}
          </View>
          <Text style={styles.personnelMeta}>
            {record.employeeId} • {record.company}
          </Text>
        </View>

        <View style={[styles.riskBadge, { backgroundColor: getRiskColor(record.riskScore) + '20' }]}>
          <Text style={[styles.riskScore, { color: getRiskColor(record.riskScore) }]}>
            {record.riskScore}%
          </Text>
        </View>

        <View 
          style={[
            styles.fitnessChip, 
            { backgroundColor: getFitnessColor(record.fitnessStatus) + '14' }
          ]}
        >
          <View 
            style={[
              styles.fitnessChipDot, 
              { backgroundColor: getFitnessColor(record.fitnessStatus) }
            ]} 
          />
          <Text 
            style={[
              styles.fitnessChipText, 
              { color: getFitnessColor(record.fitnessStatus) }
            ]}
          >
            {getFitnessLabel(record.fitnessStatus)}
          </Text>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="briefcase-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.detailText} numberOfLines={1}>
            {record.sector} • {record.department}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.detailText} numberOfLines={1}>{record.site}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="briefcase" size={13} color={colors.textSecondary} />
          <Text style={styles.detailText} numberOfLines={1}>{record.jobTitle}</Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View
          style={{
            height: '100%',
            width: `${record.riskScore}%`,
            backgroundColor: getRiskColor(record.riskScore),
            borderRadius: borderRadius.full,
          }}
        />
      </View>
    </TouchableOpacity>
  );
}

// ─── Detail Modal ───────────────────────────────────────────────
function PersonnelDetailModal({
  visible,
  record,
  onClose,
  onEdit,
  onDelete,
}: {
  visible: boolean;
  record: PersonnelRecord | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (!record) return null;

  const getFitnessColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'fit': colors.secondary,
      'fit_with_restrictions': colors.warningDark,
      'temporarily_unfit': colors.error,
      'permanently_unfit': '#7C2D12',
      'pending_evaluation': colors.secondaryDark,
    };
    return colorMap[status] || colors.textSecondary;
  };

  const getRiskColor = (score: number) => {
    if (score < 30) return '#22C55E';
    if (score < 50) return '#F59E0B';
    if (score < 75) return '#EF4444';
    return '#7C2D12';
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: '90%' }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Fiche Personnel</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Identity Section */}
            <View style={styles.section}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <View style={[styles.largeAvatar, { backgroundColor: colors.primaryFaded }]}>
                  <Ionicons name="person" size={40} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalName}>
                    {record.firstName} {record.lastName}
                  </Text>
                  <Text style={styles.modalSubtext}>
                    {record.employeeId} • {record.company}
                  </Text>
                  <Text style={styles.modalSubtext}>
                    {record.status === 'active' ? '🟢 Actif' : '🔴 Inactif'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={[styles.minStatCard, { backgroundColor: getRiskColor(record.riskScore) + '14' }]}>
                <Text style={[styles.minStatValue, { color: getRiskColor(record.riskScore) }]}>
                  {record.riskScore}%
                </Text>
                <Text style={[styles.minStatLabel, { color: getRiskColor(record.riskScore) }]}>
                  Risque
                </Text>
              </View>
              <View 
                style={[
                  styles.minStatCard, 
                  { backgroundColor: getFitnessColor(record.fitnessStatus) + '14' }
                ]}
              >
                <Ionicons 
                  name="checkmark-circle" 
                  size={24} 
                  color={getFitnessColor(record.fitnessStatus)} 
                />
                <Text style={[styles.minStatLabel, { color: getFitnessColor(record.fitnessStatus) }]}>
                  Aptitude
                </Text>
              </View>
            </View>

            {/* Professional Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Informations Professionnelles</Text>
              <DetailRow label="Entreprise" value={record.company} icon="business" />
              <DetailRow label="Secteur de Risque" value={record.sector} icon="warning" />
              <DetailRow label="Site" value={record.site} icon="location" />
              <DetailRow label="Catégorie d'Emploi" value={record.department} icon="briefcase" />
              <DetailRow label="Poste" value={record.jobTitle} icon="construct" />
              {record.hireDate && (
                <DetailRow 
                  label="Date d'embauche" 
                  value={new Date(record.hireDate).toLocaleDateString('fr-CD')} 
                  icon="calendar"
                />
              )}
            </View>

            {/* Occupational Health Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Santé Occupationnelle</Text>
              {record.lastMedicalExam && (
                <DetailRow 
                  label="Dernier examen" 
                  value={new Date(record.lastMedicalExam).toLocaleDateString('fr-CD')} 
                  icon="checkmark-done"
                />
              )}
              {record.nextMedicalExam && (
                <DetailRow 
                  label="Prochain examen" 
                  value={new Date(record.nextMedicalExam).toLocaleDateString('fr-CD')} 
                  icon="calendar"
                />
              )}
              <DetailRow label="Aptitude" value={record.fitnessStatus === 'fit' ? 'Apte' : 'À vérifier'} icon="shield-checkmark" />
              <DetailRow label="Niveau de risque" value={`${record.riskScore}%`} icon="warning" />
            </View>

            {/* Contact Info */}
            {(record.phone || record.email || record.dateOfBirth) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Coordonnées & Informations Personnelles</Text>
                {record.dateOfBirth && (
                  <DetailRow 
                    label="Date de naissance" 
                    value={new Date(record.dateOfBirth).toLocaleDateString('fr-CD')}
                    icon="calendar"
                  />
                )}
                {record.phone && <DetailRow label="Téléphone" value={record.phone} icon="call" />}
                {record.email && <DetailRow label="Email" value={record.email} icon="mail" />}
              </View>
            )}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: colors.surfaceVariant }]} 
              onPress={onClose}
            >
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Fermer</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: ACCENT }]} 
              onPress={onEdit}
            >
              <Ionicons name="create-outline" size={16} color="#FFF" />
              <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Modifier</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value, icon }: { label: string; value: string; icon?: string }) {
  return (
    <View style={styles.detailRow}>
      {icon && <Ionicons name={icon as any} size={14} color={colors.primary} style={{ width: 20 }} />}
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Main Personnel Registry Screen ──────────────────────────────
export function PersonnelRegistryScreen() {
  const [activeTab, setActiveTab] = useState<'active' | 'inactive' | 'all'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSector, setFilterSector] = useState('all');
  const [filterFitness, setFilterFitness] = useState('all');

  const [personnel, setPersonnel] = useState<PersonnelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PersonnelRecord | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  
  // Edit worker modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState(false);
  const [editWorkerForm, setEditWorkerForm] = useState<Partial<PersonnelRecord>>({});
  const [enterprises, setEnterprises] = useState<any[]>([]);
  const [workSites, setWorkSites] = useState<any[]>([]);
  const [availableSectors] = useState<string[]>(['healthcare', 'mining', 'agriculture', 'construction', 'manufacturing', 'other']);
  const [availableDepartments] = useState<string[]>(['Management', 'Operations', 'Support', 'Technical', 'Finance', 'HR']);
  const [workSitesForSelectedEnterprise, setWorkSitesForSelectedEnterprise] = useState<any[]>([]);

  // Import modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  
  // Manual worker creation
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [workerForm, setWorkerForm] = useState<Partial<PersonnelRecord>>({});
  const [creatingWorker, setCreatingWorker] = useState(false);
  
  // Toast
  const { toastMsg, showToast } = useSimpleToast();

  useEffect(() => {
    loadPersonnel();
  }, []);

  const loadPersonnel = async () => {
    setLoading(true);
    try {
      const result = await OccHealthApiService.getInstance().listWorkers();
      if (result.data && result.data.length > 0) {
        const mapped = result.data.map((w: any) => ({
          id: String(w.id),
          firstName: w.firstName || 'N/A',
          lastName: w.lastName || 'N/A',
          employeeId: w.employeeId || w.id,
          company: w.company || 'N/A',
          sector: w.sector || 'Non spécifié',
          site: w.site || 'Non spécifié',
          department: w.department || 'N/A',
          jobTitle: w.jobTitle || 'N/A',
          status: (w.status === 'active' ? 'active' : 'inactive') as const,
          riskScore: Math.floor(Math.random() * 100),
          fitnessStatus: (w.fitnessStatus || 'pending_evaluation') as any,
          nextMedicalExam: w.nextMedicalExam,
          lastMedicalExam: w.lastMedicalExam,
          dateOfBirth: w.dateOfBirth,
          phone: w.phone,
          email: w.email,
          hireDate: w.hireDate,
        }));
        setPersonnel(mapped);
      }
    } catch (error) {
      console.error('Error loading personnel:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPersonnel();
    setRefreshing(false);
  };

  const loadEnterprises = async () => {
    try {
      const result = await OccHealthApiService.getInstance().listEnterprises();
      if (result.data && result.data.length > 0) {
        setEnterprises(result.data);
      }
    } catch (error) {
      console.error('Error loading enterprises:', error);
    }
  };

  const loadWorkSitesForEnterprise = async (enterpriseId: string | undefined) => {
    if (!enterpriseId) {
      setWorkSitesForSelectedEnterprise([]);
      return;
    }
    try {
      const api = OccHealthApiService.getInstance();
      const result = await api.get(`/occupational-health/work-sites/?enterprise=${enterpriseId}`);
      if (result && result.data) {
        const sites = Array.isArray(result.data) ? result.data : result.data.results || [];
        setWorkSitesForSelectedEnterprise(sites);
      }
    } catch (error) {
      console.error('Error loading work sites:', error);
      setWorkSitesForSelectedEnterprise([]);
    }
  };

  const handleEditWorkerOpen = (record: PersonnelRecord) => {
    setEditWorkerForm({
      id: record.id,
      firstName: record.firstName,
      lastName: record.lastName,
      employeeId: record.employeeId,
      company: record.company,
      sector: record.sector,
      site: record.site,
      department: record.department,
      jobTitle: record.jobTitle,
      phone: record.phone,
      email: record.email,
      dateOfBirth: record.dateOfBirth,
      hireDate: record.hireDate,
    });
    loadEnterprises();
    // Load work sites for the selected company/enterprise
    if (record.company) {
      // Find enterprise ID by name
      const enterprise = enterprises.find(e => e.name === record.company);
      if (enterprise) {
        loadWorkSitesForEnterprise(enterprise.id);
      }
    }
    setShowEditModal(true);
  };

  const handleSaveEditWorker = async () => {
    if (!editWorkerForm.id) {
      showToast('Erreur: ID travailleur manquant', 'error');
      return;
    }

    if (!editWorkerForm.firstName?.trim()) {
      showToast('Le prénom est obligatoire', 'error');
      return;
    }

    if (!editWorkerForm.lastName?.trim()) {
      showToast('Le nom est obligatoire', 'error');
      return;
    }

    try {
      setEditingWorker(true);

      const payload = {
        first_name: editWorkerForm.firstName?.trim(),
        last_name: editWorkerForm.lastName?.trim(),
        employee_id: editWorkerForm.employeeId?.trim(),
        phone: editWorkerForm.phone || '',
        email: editWorkerForm.email || '',
        date_of_birth: editWorkerForm.dateOfBirth || '',
        company: editWorkerForm.company || '',
        sector: editWorkerForm.sector || 'other',
        work_site: editWorkerForm.site ? parseInt(editWorkerForm.site, 10) : null,  // Send work_site ID directly
        department: editWorkerForm.department || '',
        job_title: editWorkerForm.jobTitle || '',
        hire_date: editWorkerForm.hireDate || '',
      };

      const api = OccHealthApiService.getInstance();
      const result = await api.put(`/occupational-health/workers/${editWorkerForm.id}/`, payload);

      if (result && (result.id || result.success)) {
        showToast('Travailleur modifié avec succès', 'success');
        setShowEditModal(false);
        await loadPersonnel();
        setShowDetail(false);
        setSelectedRecord(null);
      } else if (result?.error) {
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error?.message || 'Erreur lors de la modification');
        showToast(errorMsg, 'error');
      } else {
        showToast('Erreur lors de la modification du travailleur', 'error');
      }
    } catch (error: any) {
      console.error('Error updating worker:', error);
      
      let errorMessage = 'Erreur lors de la modification du travailleur';
      if (error?.response?.data) {
        const data = error.response.data;
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data.employee_id) {
          errorMessage = 'Cet ID employé existe déjà';
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.error) {
          errorMessage = data.error;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setEditingWorker(false);
    }
  };

  const filteredPersonnel = useMemo(() => {
    return personnel.filter(p => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        p.employeeId.toLowerCase().includes(q) ||
        p.company.toLowerCase().includes(q) ||
        p.jobTitle.toLowerCase().includes(q);

      const matchesTab =
        activeTab === 'active' ? p.status === 'active' :
        activeTab === 'inactive' ? p.status === 'inactive' :
        true;

      const matchesSector = filterSector === 'all' || p.sector === filterSector;
      const matchesFitness = filterFitness === 'all' || p.fitnessStatus === filterFitness;

      return matchesSearch && matchesTab && matchesSector && matchesFitness;
    });
  }, [personnel, activeTab, searchQuery, filterSector, filterFitness]);

  const stats = useMemo(() => ({
    total: personnel.length,
    active: personnel.filter(p => p.status === 'active').length,
    inactive: personnel.filter(p => p.status !== 'active').length,
    highRisk: personnel.filter(p => p.riskScore >= 75).length,
    fit: personnel.filter(p => p.fitnessStatus === 'fit').length,
    restricted: personnel.filter(p => p.fitnessStatus === 'fit_with_restrictions').length,
    unfit: personnel.filter(p => 
      p.fitnessStatus === 'temporarily_unfit' || p.fitnessStatus === 'permanently_unfit'
    ).length,
    pending: personnel.filter(p => p.fitnessStatus === 'pending_evaluation').length,
    overdue: personnel.filter(p => 
      p.nextMedicalExam && new Date(p.nextMedicalExam) < new Date()
    ).length,
  }), [personnel]);

  const sectors = useMemo(() => {
    const sectorLabels: { [key: string]: string } = {
      'construction': '🏗️ Construction (BTP)',
      'mining': '⛏️ Mining',
      'oil_gas': '🛢️ Oil & Gas',
      'manufacturing': '🏭 Manufacturing',
      'agriculture': '🌾 Agriculture',
      'healthcare': '🏥 Healthcare',
      'transport_logistics': '🚛 Transport & Logistics',
      'energy_utilities': '⚡ Energy & Utilities',
      'hospitality': '🏨 Hospitality',
      'retail_commerce': '🛒 Retail & Commerce',
      'telecom_it': '📡 Telecom & IT',
      'banking_finance': '🏦 Banking & Finance',
      'education': '🎓 Education',
      'government_admin': '🏛️ Government & Administration',
      'ngo_international': '🤝 NGO & International',
      'other': '📦 Other',
    };
    
    const unique = [...new Set(personnel.map(p => p.sector))];
    return [
      { value: 'all', label: 'Tous les secteurs' },
      ...unique.map(s => ({ value: s, label: sectorLabels[s] || s })),
    ];
  }, [personnel]);

  const fitnessOptions = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'fit', label: 'Apte' },
    { value: 'fit_with_restrictions', label: 'Restrictions' },
    { value: 'temporarily_unfit', label: 'Inapte Temporaire' },
    { value: 'pending_evaluation', label: 'En attente' },
  ];

  const handleBulkImport = async () => {
    try {
      const pickerResult = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
        ],
        copyToCacheDirectory: true,
      });

      if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) return;

      const file = pickerResult.assets[0];
      setImportLoading(true);
      setImportResult(null);
      setShowImportModal(true);

      let data: any[];

      if (Platform.OS === 'web') {
        const response = await fetch(file.uri);
        const ab = await response.arrayBuffer();
        const wb = XLSX.read(ab, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
      } else {
        const base64 = await FileSystem.readAsStringAsync(file.uri, { 
          encoding: FileSystem.EncodingType.Base64
        });
        const wb = XLSX.read(base64, { type: 'base64' });
        const sheetName = wb.SheetNames[0];
        data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
      }

      if (!data || data.length === 0) {
        setImportLoading(false);
        setImportResult({ 
          error: 'Le fichier est vide ou ne contient pas de données valides.' 
        });
        return;
      }

      // Validate minimum required fields
      const validRows = data.filter((row: any) => 
        row.firstName && String(row.firstName).trim() &&
        row.lastName && String(row.lastName).trim() &&
        row.employeeId && String(row.employeeId).trim()
      );
      const invalidCount = data.length - validRows.length;

      if (validRows.length === 0) {
        setImportLoading(false);
        setImportResult({
          error: 'Aucune ligne valide trouvée. Vérifiez que les colonnes firstName, lastName et employeeId sont renseignées.',
          totalRows: data.length,
          invalidRows: invalidCount,
        });
        return;
      }

      // Convert to backend worker format for bulk import API
      const workersForApi = validRows.map((row: any) => ({
        employee_id: String(row.employeeId).trim(),
        first_name: String(row.firstName).trim(),
        last_name: String(row.lastName).trim(),
        date_of_birth: row.dateOfBirth || '1990-01-01',
        gender: row.gender || 'male',
        phone: row.phone ? String(row.phone).trim() : '',
        email: row.email ? String(row.email).trim() : '',
        address: row.address ? String(row.address).trim() : '',
        emergency_contact_name: row.emergencyContactName ? String(row.emergencyContactName).trim() : '',
        emergency_contact_phone: row.emergencyContactPhone ? String(row.emergencyContactPhone).trim() : '',
        company: row.company ? String(row.company).trim() : 'Non spécifié',
        sector: row.sector || 'other',
        site: row.site ? String(row.site).trim() : '',
        department: row.department ? String(row.department).trim() : '',
        job_title: row.jobTitle ? String(row.jobTitle).trim() : 'Non spécifié',
        job_category: row.jobCategory || 'other_job',
        hire_date: row.hireDate || new Date().toISOString().split('T')[0],
        contract_type: row.contractType || 'permanent',
      }));

      // Send to backend bulk-import endpoint
      const importApiResult = await OccHealthApiService.getInstance().bulkImportWorkers(workersForApi);

      if (!importApiResult.error) {
        await loadPersonnel();
        setImportResult({
          success: true,
          totalRows: data.length,
          validRows: validRows.length,
          invalidRows: invalidCount,
          processedRows: importApiResult.created + importApiResult.updated,
          created: importApiResult.created,
          updated: importApiResult.updated,
          apiErrors: importApiResult.errors,
          errorDetails: importApiResult.errorDetails,
        });
        showToast('Importation réussie!', 'success');
      } else {
        setImportResult({
          error: importApiResult.error || 'Erreur lors de l\'importation',
          totalRows: data.length,
          validRows: validRows.length,
          invalidRows: invalidCount,
        });
        showToast('Erreur lors de l\'importation', 'error');
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportLoading(false);
      setImportResult({ error: 'Erreur lors de la lecture du fichier' });
      showToast('Erreur lors de l\'importation', 'error');
    } finally {
      setImportLoading(false);
    }
  };

  const handleCreateWorker = async () => {
    // Validate required fields
    if (!workerForm.firstName?.trim()) {
      showToast('Le prénom est obligatoire', 'error');
      return;
    }
    if (!workerForm.lastName?.trim()) {
      showToast('Le nom est obligatoire', 'error');
      return;
    }
    if (!workerForm.employeeId?.trim()) {
      showToast('L\'ID employé est obligatoire', 'error');
      return;
    }

    try {
      setCreatingWorker(true);

      // Build API payload (convert frontend format to backend format)
      const payload = {
        first_name: workerForm.firstName.trim(),
        last_name: workerForm.lastName.trim(),
        employee_id: workerForm.employeeId.trim(),
        date_of_birth: workerForm.dateOfBirth || '1990-01-01',
        gender: workerForm.gender || 'male',
        phone: workerForm.phone || '',
        email: workerForm.email || '',
        address: workerForm.address || '',
        emergency_contact_name: workerForm.emergencyContactName || '',
        emergency_contact_phone: workerForm.emergencyContactPhone || '',
        job_title: workerForm.jobTitle || 'Non spécifié',
        job_category: 'other',
        hire_date: workerForm.hireDate || new Date().toISOString().split('T')[0],
        employment_status: 'active',
        company: workerForm.company || 'Non spécifié',
        sector: workerForm.sector || 'other',
        work_site: workerForm.site ? parseInt(workerForm.site, 10) : null,  // Send work_site ID directly
        department: workerForm.department ? String(workerForm.department).trim() : '',
      };

      const api = OccHealthApiService.getInstance();
      const result = await api.post('/occupational-health/workers/', payload);

      if (result && (result.id || result.success)) {
        showToast('Travailleur créé avec succès', 'success');
        setShowCreateModal(false);
        setWorkerForm({});
        await loadPersonnel();
      } else if (result?.error) {
        // Show specific error message from backend
        const errorMsg = typeof result.error === 'string' 
          ? result.error 
          : (result.error?.message || 'Erreur lors de la création');
        showToast(errorMsg, 'error');
      } else {
        showToast('Erreur lors de la création du travailleur', 'error');
      }
    } catch (error: any) {
      console.error('Error creating worker:', error);
      
      // Extract specific error message
      let errorMessage = 'Erreur lors de la création du travailleur';
      if (error?.response?.data) {
        const data = error.response.data;
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data.employee_id) {
          errorMessage = 'Cet ID employé existe déjà';
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.error) {
          errorMessage = data.error;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setCreatingWorker(false);
    }
  };

  const handleExportTemplate = async () => {
    try {
      // Define template columns
      const templateHeaders = [
        'firstName',
        'lastName',
        'employeeId',
        'company',
        'sector',
        'site',
        'department',
        'jobTitle',
        'phone',
        'email',
        'dateOfBirth',
        'gender',
        'hireDate',
        'emergencyContactName',
        'emergencyContactPhone',
      ];

      // Create sample data row
      const sampleData = [{
        firstName: 'Jean',
        lastName: 'Dupont',
        employeeId: 'EMP001',
        company: 'Exemple Corp',
        sector: 'healthcare',
        site: 'Site Principal',
        department: 'Ressources Humaines',
        jobTitle: 'Responsable RH',
        phone: '+33612345678',
        email: 'jean.dupont@example.com',
        dateOfBirth: '1990-01-15',
        gender: 'male',
        hireDate: '2020-01-01',
        emergencyContactName: 'Marie Dupont',
        emergencyContactPhone: '+33687654321',
      }];

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(sampleData, { header: templateHeaders });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');

      // Adjust column widths
      const colWidths = templateHeaders.map(() => 18);
      ws['!cols'] = colWidths.map(width => ({ wch: width }));

      // Generate and download file
      if (Platform.OS === 'web') {
        XLSX.writeFile(wb, 'worker_template.xlsx');
      } else {
        const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        const fileName = 'worker_template.xlsx';
        const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
        
        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Share file on mobile
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          try {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              dialogTitle: 'Télécharger le modèle',
            });
          } catch {
            showToast('Le fichier est prêt dans les documents', 'info');
          }
        }
      }

      showToast('Modèle téléchargé avec succès', 'success');
    } catch (error) {
      console.error('Error exporting template:', error);
      showToast('Erreur lors du téléchargement du modèle', 'error');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[ACCENT]}
          tintColor={ACCENT}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.screenTitle}>Gestion de Travailleurs</Text>
          <Text style={styles.screenSubtitle}>
            Registre personnel et historique occupationnel
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => {
              loadEnterprises();
              setShowCreateModal(true);
            }}
          >
            <Ionicons name="person-add" size={20} color="#FFF" />
            <Text style={styles.addButtonText}>Créer</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: colors.textSecondary }]}
            onPress={handleExportTemplate}
          >
            <Ionicons name="download" size={20} color="#FFF" />
            <Text style={styles.addButtonText}>Modèle</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: colors.warning }]}
            onPress={handleBulkImport}
          >
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.addButtonText}>Importer</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {[
          { label: 'Total', value: stats.total, icon: 'people', color: colors.primary },
          { label: 'Actifs', value: stats.active, icon: 'checkmark-circle', color: colors.secondary },
          { label: 'Inactifs', value: stats.inactive, icon: 'archive', color: colors.textSecondary },
          { label: 'Haut Risque', value: stats.highRisk, icon: 'alert-circle', color: colors.error },
          { label: 'Aptes', value: stats.fit, icon: 'shield-checkmark', color: colors.secondary },
          { label: 'En attente', value: stats.pending, icon: 'time', color: colors.warningDark },
        ].map((s, i) => (
          <View key={i} style={[styles.statCard, { backgroundColor: s.color }]}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons 
                name={s.icon as any} 
                size={18} 
                color={getTextColor(s.color)} 
              />
            </View>
            <Text style={[styles.statValue, { color: getTextColor(s.color) }]}>
              {s.value}
            </Text>
            <Text style={[styles.statLabel, { color: getTextColor(s.color), opacity: 0.85 }]}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Tab Selector */}
      <View style={styles.tabBar}>
        {[
          { id: 'active', label: 'Actifs', icon: 'checkmark-circle' },
          { id: 'inactive', label: 'Historique', icon: 'archive' },
          { id: 'all', label: 'Tous', icon: 'list' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.tabActive,
            ]}
            onPress={() => setActiveTab(tab.id as any)}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={16} 
              color={activeTab === tab.id ? ACCENT : colors.textSecondary}
            />
            <Text 
              style={[
                styles.tabText,
                activeTab === tab.id && { color: ACCENT, fontWeight: '600' },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search & Filters */}
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par nom, ID, entreprise, poste..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.placeholder}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.filterScroll}
      >
        {sectors.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.filterChip,
              filterSector === opt.value && styles.filterChipActive,
            ]}
            onPress={() => setFilterSector(opt.value)}
          >
            <Text
              style={[
                styles.filterChipText,
                filterSector === opt.value && styles.filterChipTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.filterScroll}
      >
        {fitnessOptions.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.filterChip,
              filterFitness === opt.value && styles.filterChipActive,
            ]}
            onPress={() => setFilterFitness(opt.value)}
          >
            <Text
              style={[
                styles.filterChipText,
                filterFitness === opt.value && styles.filterChipTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results Count */}
      <Text style={styles.resultsCount}>
        {filteredPersonnel.length} personne(s) trouvée(s)
      </Text>

      {/* Personnel List */}
      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptyText}>Chargement du registre...</Text>
        </View>
      ) : filteredPersonnel.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyText}>
            {personnel.length === 0 ? 'Aucun personnel enregistré' : 'Aucun résultat'}
          </Text>
          <Text style={styles.emptySubtext}>
            {personnel.length === 0
              ? 'Ajoutez du personnel ou importez un fichier'
              : 'Ajustez les filtres ou la recherche'}
          </Text>
        </View>
      ) : (
        <View style={styles.personnelList}>
          {filteredPersonnel.map((record, index) => (
            <React.Fragment key={record.id}>
              <PersonnelCard
                record={record}
                onPress={() => {
                  setSelectedRecord(record);
                  setShowDetail(true);
                }}
              />
              {index < filteredPersonnel.length - 1 && (
                <View style={styles.separator} />
              )}
            </React.Fragment>
          ))}
        </View>
      )}

      {/* Detail Modal */}
      <PersonnelDetailModal
        visible={showDetail}
        record={selectedRecord}
        onClose={() => {
          setShowDetail(false);
          setSelectedRecord(null);
        }}
        onEdit={() => {
          if (selectedRecord) {
            setShowDetail(false);  // Close detail modal first
            setTimeout(() => {
              handleEditWorkerOpen(selectedRecord);
            }, 100);  // Small delay to ensure detail modal closes first
          }
        }}
        onDelete={() => {}} // Keep for compatibility but not used
      />

      {/* Edit Worker Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!editingWorker) {
            setShowEditModal(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier le travailleur</Text>
              {!editingWorker && (
                <TouchableOpacity onPress={() => {
                  setShowEditModal(false);
                  setEditWorkerForm({});
                }}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
              {/* First Name */}
              <Text style={styles.fieldLabel}>Prénom *</Text>
              <TextInput
                style={styles.input}
                placeholder="Entrez le prénom"
                value={editWorkerForm.firstName || ''}
                onChangeText={(text) => setEditWorkerForm({ ...editWorkerForm, firstName: text })}
                editable={!editingWorker}
              />

              {/* Last Name */}
              <Text style={styles.fieldLabel}>Nom *</Text>
              <TextInput
                style={styles.input}
                placeholder="Entrez le nom"
                value={editWorkerForm.lastName || ''}
                onChangeText={(text) => setEditWorkerForm({ ...editWorkerForm, lastName: text })}
                editable={!editingWorker}
              />

              {/* Employee ID */}
              <Text style={styles.fieldLabel}>ID Employé</Text>
              <TextInput
                style={styles.input}
                placeholder="ID employé"
                value={editWorkerForm.employeeId || ''}
                onChangeText={(text) => setEditWorkerForm({ ...editWorkerForm, employeeId: text })}
                editable={!editingWorker}
              />

              {/* Company - Dropdown */}
              <Text style={styles.fieldLabel}>Entreprise</Text>
              {enterprises.length > 0 ? (
                <View style={styles.selectorContainer}>
                  {enterprises.map(ent => (
                    <TouchableOpacity
                      key={ent.id}
                      style={[
                        styles.dropdownOption,
                        editWorkerForm.company === ent.name && styles.genderOptionActive,
                      ]}
                      onPress={() => {
                        setEditWorkerForm({ ...editWorkerForm, company: ent.name, site: '' });
                        loadWorkSitesForEnterprise(ent.id);
                      }}
                    >
                      <Text style={[
                        styles.genderOptionText,
                        editWorkerForm.company === ent.name && styles.genderOptionTextActive,
                      ]}>
                        {ent.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  Aucune entreprise trouvée
                </Text>
              )}

              {/* Sector - Dropdown */}
              <Text style={styles.fieldLabel}>Secteur</Text>
              <View style={styles.selectorContainer}>
                {availableSectors.map(sector => (
                  <TouchableOpacity
                    key={sector}
                    style={[
                      styles.genderOption,
                      editWorkerForm.sector === sector && styles.genderOptionActive,
                    ]}
                    onPress={() => setEditWorkerForm({ ...editWorkerForm, sector })}
                  >
                    <Text style={[
                      styles.genderOptionText,
                      editWorkerForm.sector === sector && styles.genderOptionTextActive,
                    ]}>
                      {sector}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Site - Dropdown */}
              <Text style={styles.fieldLabel}>Site</Text>
              {workSitesForSelectedEnterprise.length > 0 ? (
                <View style={styles.selectorContainer}>
                  {workSitesForSelectedEnterprise.map(workSite => (
                    <TouchableOpacity
                      key={workSite.id}
                      style={[
                        styles.genderOption,
                        editWorkerForm.site === String(workSite.id) && styles.genderOptionActive,
                      ]}
                      onPress={() => setEditWorkerForm({ ...editWorkerForm, site: String(workSite.id) })}
                    >
                      <Text style={[
                        styles.genderOptionText,
                        editWorkerForm.site === String(workSite.id) && styles.genderOptionTextActive,
                      ]}>
                        {workSite.name || workSite.site_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  Sélectionnez une entreprise d'abord
                </Text>
              )}

              {/* Department - Dropdown */}
              <Text style={styles.fieldLabel}>Département</Text>
              <View style={styles.selectorContainer}>
                {availableDepartments.map(dept => (
                  <TouchableOpacity
                    key={dept}
                    style={[
                      styles.genderOption,
                      editWorkerForm.department === dept && styles.genderOptionActive,
                    ]}
                    onPress={() => setEditWorkerForm({ ...editWorkerForm, department: dept })}
                  >
                    <Text style={[
                      styles.genderOptionText,
                      editWorkerForm.department === dept && styles.genderOptionTextActive,
                    ]}>
                      {dept}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Job Title */}
              <Text style={styles.fieldLabel}>Poste</Text>
              <TextInput
                style={styles.input}
                placeholder="Poste"
                value={editWorkerForm.jobTitle || ''}
                onChangeText={(text) => setEditWorkerForm({ ...editWorkerForm, jobTitle: text })}
                editable={!editingWorker}
              />

              {/* Email */}
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={editWorkerForm.email || ''}
                onChangeText={(text) => setEditWorkerForm({ ...editWorkerForm, email: text })}
                keyboardType="email-address"
                editable={!editingWorker}
              />

              {/* Phone */}
              <Text style={styles.fieldLabel}>Téléphone</Text>
              <TextInput
                style={styles.input}
                placeholder="Téléphone"
                value={editWorkerForm.phone || ''}
                onChangeText={(text) => setEditWorkerForm({ ...editWorkerForm, phone: text })}
                keyboardType="phone-pad"
                editable={!editingWorker}
              />

              {/* Date of Birth */}
              <Text style={styles.fieldLabel}>Date de naissance</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={editWorkerForm.dateOfBirth || ''}
                onChangeText={(text) => setEditWorkerForm({ ...editWorkerForm, dateOfBirth: text })}
                editable={!editingWorker}
              />

              {/* Hire Date */}
              <Text style={styles.fieldLabel}>Date d'embauche</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={editWorkerForm.hireDate || ''}
                onChangeText={(text) => setEditWorkerForm({ ...editWorkerForm, hireDate: text })}
                editable={!editingWorker}
              />
            </ScrollView>

            {!editingWorker ? (
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.outlineVariant }]}
                  onPress={() => {
                    setShowEditModal(false);
                    setEditWorkerForm({});
                  }}
                >
                  <Text style={[styles.actionBtnText, { color: colors.text }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: ACCENT }]}
                  onPress={handleSaveEditWorker}
                >
                  <Ionicons name="checkmark" size={16} color="#FFF" />
                  <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Sauvegarder</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ padding: spacing.lg, paddingBottom: spacing.xl, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={ACCENT} />
                <Text style={{ marginTop: spacing.md, color: colors.textSecondary }}>Modification en cours...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Import Modal */}
      <Modal
        visible={showImportModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!importLoading) {
            setShowImportModal(false);
            setImportResult(null);
          }
        }}
      >
        <View style={styles.importModalOverlay}>
          <View style={styles.importModalContent}>
            <View style={styles.importModalHeader}>
              <Text style={styles.importModalTitle}>
                {importLoading ? 'Importation en cours...' : importResult?.success ? 'Succès' : importResult ? 'Erreur' : 'Importer Travailleurs'}
              </Text>
              {!importLoading && (
                <TouchableOpacity onPress={() => {
                  setShowImportModal(false);
                  setImportResult(null);
                }}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.importModalBody} showsVerticalScrollIndicator={false}>
              {importLoading ? (
                <View style={styles.importLoadingBox}>
                  <ActivityIndicator size="large" color={ACCENT} />
                  <Text style={styles.importLoadingText}>Traitement du fichier...</Text>
                </View>
              ) : importResult ? (
                <View style={{ gap: 12 }}>
                  {importResult.error && (
                    <View style={[styles.importResultBox, { backgroundColor: colors.error + '14', borderColor: colors.error }]}>
                      <Ionicons name="alert-circle" size={20} color={colors.error} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.importResultTitle, { color: colors.error }]}>Erreur</Text>
                        <Text style={[styles.importResultText, { color: colors.error }]}>{importResult.error}</Text>
                      </View>
                    </View>
                  )}
                  
                  {importResult.totalRows && (
                    <View style={[styles.importResultBox, { backgroundColor: colors.primary + '14', borderColor: colors.primary }]}>
                      <Ionicons name="document" size={20} color={colors.primary} />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={[styles.importResultTitle, { color: colors.primary }]}>
                          Total: {importResult.totalRows} lignes
                        </Text>
                        <Text style={[styles.importResultText, { color: colors.primary }]}>
                          Valides: {importResult.validRows} | Invalides: {importResult.invalidRows}
                        </Text>
                      </View>
                    </View>
                  )}

                  {importResult.success && (
                    <View style={[styles.importResultBox, { backgroundColor: colors.secondary + '14', borderColor: colors.secondary }]}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.secondary} />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={[styles.importResultTitle, { color: colors.secondary }]}>
                          Importation réussie!
                        </Text>
                        <Text style={[styles.importResultText, { color: colors.secondary }]}>
                          Ajoutés: {importResult.created} | Mis à jour: {importResult.updated}
                        </Text>
                      </View>
                    </View>
                  )}

                  {importResult.apiErrors && importResult.apiErrors.length > 0 && (
                    <View style={{ gap: 8 }}>
                      <Text style={styles.importSectionTitle}>Erreurs détaillées:</Text>
                      {importResult.apiErrors.slice(0, 5).map((err: any, i: number) => (
                        <View key={i} style={[styles.importErrorItem, { borderColor: colors.error }]}>
                          <Text style={styles.importErrorText}>{err}</Text>
                        </View>
                      ))}
                      {importResult.apiErrors.length > 5 && (
                        <Text style={styles.importMoreErrors}>
                          +{importResult.apiErrors.length - 5} autres erreurs
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  <Text style={styles.importInstructions}>
                    Sélectionnez un fichier Excel ou CSV contenant les colonnes:
                  </Text>
                  <View style={styles.importRequiredFields}>
                    {['firstName', 'lastName', 'employeeId'].map(field => (
                      <View key={field} style={styles.importFieldItem}>
                        <View style={styles.importFieldDot} />
                        <Text style={styles.importFieldText}>{field} *</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.importInstructions} style={{ marginTop: 8 }}>
                    Colonnes optionnelles:
                  </Text>
                  <View style={styles.importRequiredFields}>
                    {['company', 'sector', 'site', 'department', 'jobTitle', 'hireDate', 'email', 'phone'].map(field => (
                      <View key={field} style={styles.importFieldItem}>
                        <View style={styles.importFieldDot} />
                        <Text style={styles.importFieldText}>{field}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            {!importLoading && (
              <View style={styles.importModalActions}>
                {importResult ? (
                  <TouchableOpacity
                    style={[styles.importActionBtn, { backgroundColor: ACCENT }]}
                    onPress={() => {
                      setShowImportModal(false);
                      setImportResult(null);
                    }}
                  >
                    <Text style={[styles.importActionBtnText, { color: '#FFF' }]}>Fermer</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.importActionBtn, { backgroundColor: colors.outlineVariant }]}
                      onPress={() => {
                        setShowImportModal(false);
                        setImportResult(null);
                      }}
                    >
                      <Text style={[styles.importActionBtnText, { color: colors.text }]}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.importActionBtn, { backgroundColor: ACCENT }]}
                      onPress={handleBulkImport}
                    >
                      <Ionicons name="cloud-upload" size={16} color="#FFF" />
                      <Text style={[styles.importActionBtnText, { color: '#FFF' }]}>Sélectionner fichier</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Manual Worker Creation Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!creatingWorker) {
            setShowCreateModal(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Créer un nouveau travailleur</Text>
              {!creatingWorker && (
                <TouchableOpacity onPress={() => {
                  setShowCreateModal(false);
                  setWorkerForm({});
                }}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
              {/* First Name */}
              <Text style={styles.fieldLabel}>Prénom *</Text>
              <TextInput
                style={styles.input}
                placeholder="Entrez le prénom"
                value={workerForm.firstName || ''}
                onChangeText={(text) => setWorkerForm({ ...workerForm, firstName: text })}
                editable={!creatingWorker}
              />

              {/* Last Name */}
              <Text style={styles.fieldLabel}>Nom *</Text>
              <TextInput
                style={styles.input}
                placeholder="Entrez le nom"
                value={workerForm.lastName || ''}
                onChangeText={(text) => setWorkerForm({ ...workerForm, lastName: text })}
                editable={!creatingWorker}
              />

              {/* Employee ID */}
              <Text style={styles.fieldLabel}>ID Employé *</Text>
              <TextInput
                style={styles.input}
                placeholder="Entrez l'ID employé (unique)"
                value={workerForm.employeeId || ''}
                onChangeText={(text) => setWorkerForm({ ...workerForm, employeeId: text })}
                editable={!creatingWorker}
              />

              {/* Company - Dropdown */}
              <Text style={styles.fieldLabel}>Entreprise</Text>
              {enterprises.length > 0 ? (
                <View style={styles.selectorContainer}>
                  {enterprises.map(ent => (
                    <TouchableOpacity
                      key={ent.id}
                      style={[
                        styles.genderOption,
                        workerForm.company === ent.name && styles.genderOptionActive,
                      ]}
                      onPress={() => {
                        setWorkerForm({ ...workerForm, company: ent.name, site: '' });  // Reset site when company changes
                        loadWorkSitesForEnterprise(ent.id);
                      }}
                    >
                      <Text style={[
                        styles.genderOptionText,
                        workerForm.company === ent.name && styles.genderOptionTextActive,
                      ]}>
                        {ent.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  Aucune entreprise trouvée
                </Text>
              )}

              {/* Job Title */}
              <Text style={styles.fieldLabel}>Poste</Text>
              <TextInput
                style={styles.input}
                placeholder="Poste"
                value={workerForm.jobTitle || ''}
                onChangeText={(text) => setWorkerForm({ ...workerForm, jobTitle: text })}
                editable={!creatingWorker}
              />

              {/* Email */}
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={workerForm.email || ''}
                onChangeText={(text) => setWorkerForm({ ...workerForm, email: text })}
                keyboardType="email-address"
                editable={!creatingWorker}
              />

              {/* Phone */}
              <Text style={styles.fieldLabel}>Téléphone</Text>
              <TextInput
                style={styles.input}
                placeholder="Téléphone"
                value={workerForm.phone || ''}
                onChangeText={(text) => setWorkerForm({ ...workerForm, phone: text })}
                keyboardType="phone-pad"
                editable={!creatingWorker}
              />

              {/* Gender */}
              <Text style={styles.fieldLabel}>Genre</Text>
              <View style={styles.genderContainer}>
                {['male', 'female', 'other'].map(gender => (
                  <TouchableOpacity
                    key={gender}
                    style={[
                      styles.genderOption,
                      workerForm.gender === gender && styles.genderOptionActive,
                    ]}
                    onPress={() => setWorkerForm({ ...workerForm, gender })}
                  >
                    <Text style={[
                      styles.genderOptionText,
                      workerForm.gender === gender && styles.genderOptionTextActive,
                    ]}>
                      {gender === 'male' ? 'Homme' : gender === 'female' ? 'Femme' : 'Autre'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Date of Birth */}
              <Text style={styles.fieldLabel}>Date de naissance</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD (ex: 1990-01-15)"
                value={workerForm.dateOfBirth || ''}
                onChangeText={(text) => setWorkerForm({ ...workerForm, dateOfBirth: text })}
                editable={!creatingWorker}
              />

              {/* Hire Date */}
              <Text style={styles.fieldLabel}>Date d'embauche</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD (ex: 2020-01-01)"
                value={workerForm.hireDate || ''}
                onChangeText={(text) => setWorkerForm({ ...workerForm, hireDate: text })}
                editable={!creatingWorker}
              />

              {/* Address */}
              <Text style={styles.fieldLabel}>Adresse</Text>
              <TextInput
                style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                placeholder="Adresse complète"
                value={workerForm.address || ''}
                onChangeText={(text) => setWorkerForm({ ...workerForm, address: text })}
                multiline
                editable={!creatingWorker}
              />

              {/* Emergency Contact Name */}
              <Text style={styles.fieldLabel}>Contact d'urgence - Nom</Text>
              <TextInput
                style={styles.input}
                placeholder="Nom du contact"
                value={workerForm.emergencyContactName || ''}
                onChangeText={(text) => setWorkerForm({ ...workerForm, emergencyContactName: text })}
                editable={!creatingWorker}
              />

              {/* Emergency Contact Phone */}
              <Text style={styles.fieldLabel}>Contact d'urgence - Téléphone</Text>
              <TextInput
                style={styles.input}
                placeholder="Téléphone du contact"
                value={workerForm.emergencyContactPhone || ''}
                onChangeText={(text) => setWorkerForm({ ...workerForm, emergencyContactPhone: text })}
                keyboardType="phone-pad"
                editable={!creatingWorker}
              />

              {/* Sector - Dropdown */}
              <Text style={styles.fieldLabel}>Secteur</Text>
              <View style={styles.selectorContainer}>
                {availableSectors.map(sector => (
                  <TouchableOpacity
                    key={sector}
                    style={[
                      styles.genderOption,
                      workerForm.sector === sector && styles.genderOptionActive,
                    ]}
                    onPress={() => setWorkerForm({ ...workerForm, sector })}
                  >
                    <Text style={[
                      styles.genderOptionText,
                      workerForm.sector === sector && styles.genderOptionTextActive,
                    ]}>
                      {sector}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Site - Dropdown */}
              <Text style={styles.fieldLabel}>Site</Text>
              {workSitesForSelectedEnterprise.length > 0 ? (
                <View style={styles.selectorContainer}>
                  {workSitesForSelectedEnterprise.map(workSite => (
                    <TouchableOpacity
                      key={workSite.id}
                      style={[
                        styles.genderOption,
                        workerForm.site === String(workSite.id) && styles.genderOptionActive,
                      ]}
                      onPress={() => setWorkerForm({ ...workerForm, site: String(workSite.id) })}
                    >
                      <Text style={[
                        styles.genderOptionText,
                        workerForm.site === String(workSite.id) && styles.genderOptionTextActive,
                      ]}>
                        {workSite.name || workSite.site_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  Sélectionnez une entreprise d'abord
                </Text>
              )}

              {/* Department */}
              <Text style={styles.fieldLabel}>Département</Text>
              <TextInput
                style={styles.input}
                placeholder="Département"
                value={workerForm.department || ''}
                onChangeText={(text) => setWorkerForm({ ...workerForm, department: text })}
                editable={!creatingWorker}
              />
            </ScrollView>

            {!creatingWorker ? (
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.outlineVariant }]}
                  onPress={() => {
                    setShowCreateModal(false);
                    setWorkerForm({});
                  }}
                >
                  <Text style={[styles.actionBtnText, { color: colors.text }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: ACCENT }]}
                  onPress={handleCreateWorker}
                >
                  <Ionicons name="checkmark" size={16} color="#FFF" />
                  <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Créer</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ padding: spacing.lg, paddingBottom: spacing.xl, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={ACCENT} />
                <Text style={{ marginTop: spacing.md, color: colors.textSecondary }}>Création en cours...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Toast Notification */}
      <SimpleToastNotification message={toastMsg} />
    </ScrollView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingBottom: spacing.xl,
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: colors.primaryFaded,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  screenSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  addButton: {
    backgroundColor: ACCENT,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '30%',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceVariant,
  },
  tabActive: {
    backgroundColor: ACCENT + '14',
    borderWidth: 1.5,
    borderColor: ACCENT,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 14,
  },
  filterScroll: {
    flexGrow: 0,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceVariant,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: ACCENT + '14',
    borderColor: ACCENT,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: ACCENT,
    fontWeight: '600',
  },
  resultsCount: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  personnelList: {
    paddingHorizontal: spacing.md,
  },
  personnelCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personnelName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  personnelMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  overdueBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  overdueBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  riskBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riskScore: {
    fontSize: 16,
    fontWeight: '700',
  },
  fitnessChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  fitnessChipDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
  },
  fitnessChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardDetails: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    minWidth: '45%',
  },
  detailText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.outline,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  separator: {
    height: 1,
    backgroundColor: colors.outline,
    marginVertical: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    maxHeight: '90%',
    minWidth: isDesktop ? 600 : '100%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    backgroundColor: colors.surface,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  modalName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  largeAvatar: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    backgroundColor: colors.surface,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.outline,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    width: 100,
  },
  detailValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  minStatCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minStatValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  minStatLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Import Modal
  importModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  importModalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    ...shadows.lg,
  },
  importModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  importModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  importModalBody: {
    padding: spacing.lg,
  },
  importLoadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  importLoadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  importResultBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  importResultTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  importResultText: {
    fontSize: 13,
  },
  importSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
  },
  importErrorItem: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    backgroundColor: colors.background,
  },
  importErrorText: {
    fontSize: 12,
    color: colors.text,
  },
  importMoreErrors: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  importInstructions: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  importRequiredFields: {
    gap: spacing.sm,
  },
  importFieldItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  importFieldDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACCENT,
  },
  importFieldText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  importModalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  importActionBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  importActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Form Styles
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
  },

  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  formInput: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  genderOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    minWidth: '48%',
    maxWidth: '100%',
  },
  dropdownOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderOptionActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  genderOptionText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  genderOptionTextActive: {
    color: '#FFF',
  },
  selectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
    justifyContent: 'flex-start',
  },
});