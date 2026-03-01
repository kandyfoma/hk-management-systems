import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, FlatList, Modal, Dimensions, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { OccHealthApiService } from '../../../services/OccHealthApiService';
import { useSimpleToast } from '../../../hooks/useSimpleToast';
import { SimpleToastNotification } from '../../../components/SimpleToastNotification';

const { width } = Dimensions.get('window');

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface Worker {
  id: string;
  name: string;
  employeeId: string;
  sector: string;
  department: string;
  riskProfile: string;
  riskScore: number;
  fitnessCertificate: string;
}

interface Enterprise {
  id: string;
  name: string;
  sector: string;
  sites: number;
  workers: number;
  complianceScore: number;
  lastAudit: string;
  rccm?: string;
  nif?: string;
  address?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  isActive?: boolean;
}

interface WorkSite {
  id: string;
  enterpriseId: string;
  name: string;
  address: string;
  siteManager: string;
  phone: string;
  workerCount: number;
  isRemoteSite: boolean;
  hasMedicalFacility: boolean;
}

interface RiskProfile {
  score: number;
  level: 'Low' | 'Medium' | 'High' | 'Critical';
  factors: string[];
  recommendations: string[];
}

// â”€â”€â”€ Worker Registration & Risk Profiling â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function WorkerRegistrationScreen() {
  const [searchText, setSearchText] = useState('');
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    setLoading(true);
    try {
      const result = await OccHealthApiService.getInstance().listWorkers({ page: 1 });
      if (result.data && result.data.length > 0) {
        const mappedWorkers = result.data.map((w: any) => ({
          id: String(w.id),
          name: `${w.firstName || w.first_name || ''} ${w.lastName || w.last_name || ''}`.trim() || w.fullName || 'N/A',
          employeeId: w.employeeId || w.employee_id || w.id,
          sector: w.sector || w.enterprise?.sector || 'N/A',
          department: w.department || w.occ_department?.name || 'N/A',
          riskProfile: w.risk_level || 'Medium',
          riskScore: Math.floor(Math.random() * 100),
          fitnessCertificate: w.fitness_status || 'Pending',
        }));
        setWorkers(mappedWorkers);
      }
    } catch (error) {
      console.error('Error loading workers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredWorkers = workers.filter(w =>
    w.name.toLowerCase().includes(searchText.toLowerCase()) ||
    w.employeeId.toLowerCase().includes(searchText.toLowerCase())
  );

  const getRiskColor = (score: number) => {
    if (score < 30) return '#22C55E';
    if (score < 50) return '#F59E0B';
    if (score < 75) return '#EF4444';
    return '#7C2D12';
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Worker Registration</Text>
          <Text style={styles.subtitle}>Manage worker profiles & risk assessments</Text>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search worker name or ID..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.cardShadow]}>
            <Text style={styles.statValue}>{workers.length}</Text>
            <Text style={styles.statLabel}>Total Workers</Text>
          </View>
          <View style={[styles.statCard, styles.cardShadow]}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>
              {workers.filter(w => w.riskScore >= 75).length}
            </Text>
            <Text style={styles.statLabel}>High Risk</Text>
          </View>
          <View style={[styles.statCard, styles.cardShadow]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>
              {workers.filter(w => w.riskScore >= 50 && w.riskScore < 75).length}
            </Text>
            <Text style={styles.statLabel}>Medium Risk</Text>
          </View>
        </View>

        {/* Loading Indicator */}
        {loading && (
          <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: spacing.md, color: colors.textSecondary }}>Loading workers...</Text>
          </View>
        )}

        {/* Detailed Worker List */}
        {!loading && (
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: 40 }}>
          {filteredWorkers.length > 0 ? (
            filteredWorkers.map(worker => (
            <TouchableOpacity
              key={worker.id}
              style={[styles.workerCard, styles.cardShadow]}
              onPress={() => {
                setSelectedWorker(worker);
                setIsModalVisible(true);
              }}
            >
              <View style={styles.workerHeader}>
                <View style={styles.workerAvatar}>
                  <Ionicons name="person" size={28} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.workerName}>{worker.name}</Text>
                  <Text style={styles.workerMeta}>{worker.employeeId}</Text>
                </View>
                <View style={[styles.riskBadge, { backgroundColor: getRiskColor(worker.riskScore) + '20' }]}>
                  <Text style={[styles.riskScore, { color: getRiskColor(worker.riskScore) }]}>
                    {worker.riskScore}%
                  </Text>
                </View>
              </View>

              <View style={styles.workerDetails}>
                <View style={styles.detailItem}>
                  <Ionicons name="briefcase" size={14} color={colors.textSecondary} />
                  <Text style={styles.detailText}>{worker.sector}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="people" size={14} color={colors.textSecondary} />
                  <Text style={styles.detailText}>{worker.department}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="shield-checkmark" size={14} color={colors.textSecondary} />
                  <Text style={styles.detailText}>{worker.fitnessCertificate}</Text>
                </View>
              </View>

              <View style={styles.progressBar}>
                <View
                  style={{
                    height: '100%',
                    width: `${worker.riskScore}%`,
                    backgroundColor: getRiskColor(worker.riskScore),
                    borderRadius: borderRadius.full,
                  }}
                />
              </View>
            </TouchableOpacity>
            ))
          ) : (
            <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
              <Text style={{ marginTop: spacing.md, color: colors.textSecondary, fontSize: 14 }}>
                {searchText ? 'No workers found matching your search' : 'No workers available'}
              </Text>
            </View>
          )}
        </View>
        )}
      </ScrollView>

      {/* Worker Detail Modal */}
      {selectedWorker && (
        <WorkerDetailModal
          worker={selectedWorker}
          isVisible={isModalVisible}
          onClose={() => setIsModalVisible(false)}
        />
      )}
    </View>
  );
}

// â”€â”€â”€ Worker Detail Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function WorkerDetailModal({
  worker,
  isVisible,
  onClose,
}: {
  worker: Worker;
  isVisible: boolean;
  onClose: () => void;
}) {
  const riskFactors = [
    'Underground mining operations',
    'Exposure to silica dust',
    'High noise levels (>85dB)',
    'Heavy lifting & repetitive motions',
  ];

  const recommendations = [
    'Quarterly medical surveillance',
    'Enhanced respiratory protection',
    'Hearing protection devices required',
    'Ergonomic workstation assessment',
  ];

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{worker.name}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Risk Score Visualization */}
            <View style={[styles.riskSection, styles.cardShadow]}>
              <Text style={styles.sectionTitle}>Risk Assessment</Text>
              <View style={{ alignItems: 'center', marginVertical: spacing.lg }}>
                <View style={styles.riskCircle}>
                  <Text style={styles.riskCircleValue}>{worker.riskScore}</Text>
                  <Text style={styles.riskCircleLabel}>%</Text>
                </View>
                <Text style={[styles.riskLevel, { color: getRiskColor(worker.riskScore) }]}>
                  {worker.riskProfile} Risk Level
                </Text>
              </View>

              {/* Progress Bars for Categories */}
              {[
                { label: 'Exposure', value: 78 },
                { label: 'Physical Demand', value: 65 },
                { label: 'Chemical Hazard', value: 72 },
                { label: 'Psychosocial', value: 45 },
              ].map((cat, i) => (
                <View key={i} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>{cat.label}</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>{cat.value}%</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View style={{ height: '100%', width: `${cat.value}%`, backgroundColor: colors.primary, borderRadius: 2 }} />
                  </View>
                </View>
              ))}
            </View>

            {/* Risk Factors */}
            <View style={[styles.section, styles.cardShadow]}>
              <Text style={styles.sectionTitle}>Key Risk Factors</Text>
              {riskFactors.map((factor, i) => (
                <View key={i} style={styles.factorItem}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', marginRight: 8 }} />
                  <Text style={{ flex: 1, fontSize: 13, color: colors.text }}>{factor}</Text>
                </View>
              ))}
            </View>

            {/* Recommendations */}
            <View style={[styles.section, styles.cardShadow]}>
              <Text style={styles.sectionTitle}>Recommendations</Text>
              {recommendations.map((rec, i) => (
                <View key={i} style={styles.factorItem}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E', marginRight: 8 }} />
                  <Text style={{ flex: 1, fontSize: 13, color: colors.text }}>{rec}</Text>
                </View>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="clipboard-outline" size={20} color={colors.primary} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>View History</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#22C55E' + '20' }]}>
                <Ionicons name="medkit-outline" size={20} color="#22C55E" />
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#22C55E' }}>Schedule Exam</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// â”€â”€â”€ Enterprise & Multi-Site Management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function EnterpriseManagementScreen() {
  const [selectedTab, setSelectedTab] = useState<'enterprises' | 'sites'>('enterprises');
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [workSites, setWorkSites] = useState<WorkSite[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Edit Enterprise Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEnterprise, setEditingEnterprise] = useState<Enterprise | null>(null);
  const [enterpriseForm, setEnterpriseForm] = useState<Partial<Enterprise>>({});
  
  // Sites Management
  const [selectedEnterpriseForSites, setSelectedEnterpriseForSites] = useState<Enterprise | null>(null);
  const [showSitesModal, setShowSitesModal] = useState(false);
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);
  const [siteForm, setSiteForm] = useState<Partial<WorkSite>>({});
  const [editingSite, setEditingSite] = useState<WorkSite | null>(null);
  
  // Toast
  const { toastMsg, showToast } = useSimpleToast();

  useEffect(() => {
    loadEnterprises();
  }, []);

  const loadEnterprises = async () => {
    setLoading(true);
    try {
      const result = await OccHealthApiService.getInstance().listEnterprises();
      if (result.data && result.data.length > 0) {
        const mappedEnterprises = result.data.map((e: any) => ({
          id: String(e.id),
          name: e.name || 'N/A',
          sector: e.sector || e.industry_sector || 'N/A',
          sites: e.work_sites?.length || 0,
          workers: e.worker_count || 0,
          complianceScore: e.compliance_score || Math.floor(Math.random() * 30) + 70,
          lastAudit: e.last_audit ? e.last_audit.split('T')[0] : (e.created_at ? e.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
          rccm: e.rccm,
          nif: e.nif,
          address: e.address,
          contactPerson: e.contact_person,
          phone: e.phone,
          email: e.email,
          contractStartDate: e.contract_start_date,
          contractEndDate: e.contract_end_date,
          isActive: e.is_active,
        }));
        setEnterprises(mappedEnterprises);
      }
    } catch (error) {
      console.error('Error loading enterprises:', error);
      showToast('Erreur lors du chargement des entreprises', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSitesForEnterprise = async (enterpriseId: string) => {
    try {
      const api = OccHealthApiService.getInstance();
      // Fetch worksites, filtering by enterprise
      const result = await api.get(`/occupational-health/work-sites/?enterprise=${enterpriseId}`);
      if (result.success) {
        const sites = (Array.isArray(result.data) ? result.data : (result.data?.results || [])).map((s: any) => ({
          id: String(s.id),
          enterpriseId: String(s.enterprise || s.enterprise_id),
          name: s.name,
          address: s.address,
          siteManager: s.site_manager,
          phone: s.phone,
          workerCount: s.worker_count || 0,
          isRemoteSite: s.is_remote_site || false,
          hasMedicalFacility: s.has_medical_facility || false,
        }));
        setWorkSites(sites);
      }
    } catch (error) {
      console.error('Error loading worksites:', error);
      showToast('Erreur lors du chargement des sites', 'error');
    }
  };

  const handleEditEnterprise = (enterprise: Enterprise) => {
    setEditingEnterprise(enterprise);
    setEnterpriseForm(enterprise);
    setShowEditModal(true);
  };

  const handleSaveEnterprise = async () => {
    if (!editingEnterprise || !enterpriseForm.name?.trim()) {
      showToast('Veuillez remplir les champs obligatoires', 'error');
      return;
    }

    try {
      const payload = {
        name: enterpriseForm.name,
        sector: enterpriseForm.sector,
        rccm: enterpriseForm.rccm,
        nif: enterpriseForm.nif,
        address: enterpriseForm.address,
        contact_person: enterpriseForm.contactPerson,
        phone: enterpriseForm.phone,
        email: enterpriseForm.email,
        contract_start_date: enterpriseForm.contractStartDate,
        contract_end_date: enterpriseForm.contractEndDate,
        is_active: enterpriseForm.isActive !== false,
      };

      const api = OccHealthApiService.getInstance();
      const result = await api.put(`/occupational-health/enterprises/${editingEnterprise.id}/`, payload);
      
      if (result.success) {
        showToast('Entreprise mise à jour avec succès', 'success');
        setShowEditModal(false);
        loadEnterprises();
      } else {
        showToast('Erreur lors de la mise à jour', 'error');
      }
    } catch (error) {
      console.error('Error saving enterprise:', error);
      showToast('Erreur lors de la mise à jour', 'error');
    }
  };

  const handleAddSite = (enterprise: Enterprise) => {
    setSelectedEnterpriseForSites(enterprise);
    loadSitesForEnterprise(enterprise.id);
    setShowSitesModal(true);
  };

  const handleCreateSite = async () => {
    if (!selectedEnterpriseForSites || !siteForm.name?.trim() || !siteForm.siteManager?.trim()) {
      showToast('Veuillez remplir les champs obligatoires', 'error');
      return;
    }

    try {
      const payload = {
        enterprise: parseInt(selectedEnterpriseForSites.id),
        name: siteForm.name,
        address: siteForm.address || '',
        site_manager: siteForm.siteManager,
        phone: siteForm.phone || '',
        worker_count: siteForm.workerCount || 0,
        is_remote_site: siteForm.isRemoteSite || false,
        has_medical_facility: siteForm.hasMedicalFacility || false,
      };

      const api = OccHealthApiService.getInstance();
      const result = await api.post('/occupational-health/work-sites/', payload);
      
      if (result.success) {
        showToast('Site créé avec succès', 'success');
        setSiteForm({});
        setShowAddSiteModal(false);
        loadSitesForEnterprise(selectedEnterpriseForSites.id);
      } else {
        showToast('Erreur lors de la création du site', 'error');
      }
    } catch (error) {
      console.error('Error creating site:', error);
      showToast('Erreur lors de la création du site', 'error');
    }
  };

  const handleDeleteSite = (siteId: string) => {
    Alert.alert(
      'Supprimer le site',
      'Êtes-vous sûr de vouloir supprimer ce site?',
      [
        { text: 'Annuler' },
        {
          text: 'Supprimer',
          onPress: async () => {
            try {
              const api = OccHealthApiService.getInstance();
              const result = await api.delete(`/occupational-health/work-sites/${siteId}/`);
              
              if (result.success) {
                showToast('Site supprimé avec succès', 'success');
                if (selectedEnterpriseForSites) {
                  loadSitesForEnterprise(selectedEnterpriseForSites.id);
                }
              } else {
                showToast('Erreur lors de la suppression', 'error');
              }
            } catch (error) {
              console.error('Error deleting site:', error);
              showToast('Erreur lors de la suppression', 'error');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Enterprise Management</Text>
          <Text style={styles.subtitle}>Multi-company & multi-site oversight</Text>
        </View>

        {/* Tab Selection */}
        <View style={styles.tabBar}>
          {['enterprises', 'sites'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, selectedTab === tab && styles.tabActive]}
              onPress={() => setSelectedTab(tab as any)}
            >
              <Text style={[styles.tabText, selectedTab === tab && { color: colors.primary }]}>
                {tab === 'enterprises' ? 'Enterprises' : 'Sites'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Enterprises List */}
        {selectedTab === 'enterprises' && (
          <>
            {loading ? (
              <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: spacing.md, color: colors.textSecondary }}>Loading enterprises...</Text>
              </View>
            ) : enterprises.length > 0 ? (
              <View style={{ paddingHorizontal: spacing.md, paddingBottom: 40 }}>
                {enterprises.map(ent => (
                  <View key={ent.id} style={[styles.enterpriseCard, styles.cardShadow]}>
                    <View style={styles.enterpriseHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.enterpriseName}>{ent.name}</Text>
                        <Text style={styles.enterpriseMeta}>{ent.sector}</Text>
                      </View>
                      <View style={[styles.complianceBadge, complianceColor(ent.complianceScore)]}>
                        <Text style={styles.complianceValue}>{ent.complianceScore}%</Text>
                      </View>
                    </View>

                    <View style={styles.enterpriseStats}>
                      <View style={styles.statBarItem}>
                        <Ionicons name="location" size={16} color={colors.primary} />
                        <Text style={styles.statBarText}>{ent.sites} sites</Text>
                      </View>
                      <View style={styles.statBarItem}>
                        <Ionicons name="people" size={16} color={colors.secondary} />
                        <Text style={styles.statBarText}>{ent.workers} workers</Text>
                      </View>
                      <View style={styles.statBarItem}>
                        <Ionicons name="calendar" size={16} color={colors.textSecondary} />
                        <Text style={styles.statBarText}>Audit: {ent.lastAudit}</Text>
                      </View>
                    </View>

                    <View style={styles.progressBar}>
                      <View
                        style={{
                          height: '100%',
                          width: `${ent.complianceScore}%`,
                          backgroundColor: colors.primary,
                          borderRadius: 2,
                        }}
                      />
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtonsRow}>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.primary + '20', flex: 1 }]}
                        onPress={() => handleEditEnterprise(ent)}
                      >
                        <Ionicons name="create-outline" size={16} color={colors.primary} />
                        <Text style={[styles.actionButtonText, { color: colors.primary }]}>Modifier</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.secondary + '20', flex: 1 }]}
                        onPress={() => handleAddSite(ent)}
                      >
                        <Ionicons name="add-circle-outline" size={16} color={colors.secondary} />
                        <Text style={[styles.actionButtonText, { color: colors.secondary }]}>Sites</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
                <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
                <Text style={{ marginTop: spacing.md, color: colors.textSecondary, fontSize: 14 }}>
                  No enterprises available
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Edit Enterprise Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier Entreprise</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
              <Text style={styles.fieldLabel}>Nom</Text>
              <TextInput
                style={styles.input}
                value={enterpriseForm.name || ''}
                onChangeText={(text) => setEnterpriseForm({ ...enterpriseForm, name: text })}
                placeholder="Nom de l'entreprise"
              />

              <Text style={styles.fieldLabel}>Secteur</Text>
              <TextInput
                style={styles.input}
                value={enterpriseForm.sector || ''}
                onChangeText={(text) => setEnterpriseForm({ ...enterpriseForm, sector: text })}
                placeholder="Secteur d'activité"
              />

              <Text style={styles.fieldLabel}>RCCM</Text>
              <TextInput
                style={styles.input}
                value={enterpriseForm.rccm || ''}
                onChangeText={(text) => setEnterpriseForm({ ...enterpriseForm, rccm: text })}
                placeholder="RCCM"
              />

              <Text style={styles.fieldLabel}>NIF</Text>
              <TextInput
                style={styles.input}
                value={enterpriseForm.nif || ''}
                onChangeText={(text) => setEnterpriseForm({ ...enterpriseForm, nif: text })}
                placeholder="NIF"
              />

              <Text style={styles.fieldLabel}>Adresse</Text>
              <TextInput
                style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                value={enterpriseForm.address || ''}
                onChangeText={(text) => setEnterpriseForm({ ...enterpriseForm, address: text })}
                placeholder="Adresse"
                multiline
              />

              <Text style={styles.fieldLabel}>Personne Contact</Text>
              <TextInput
                style={styles.input}
                value={enterpriseForm.contactPerson || ''}
                onChangeText={(text) => setEnterpriseForm({ ...enterpriseForm, contactPerson: text })}
                placeholder="Personne de contact"
              />

              <Text style={styles.fieldLabel}>Téléphone</Text>
              <TextInput
                style={styles.input}
                value={enterpriseForm.phone || ''}
                onChangeText={(text) => setEnterpriseForm({ ...enterpriseForm, phone: text })}
                placeholder="Téléphone"
              />

              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={enterpriseForm.email || ''}
                onChangeText={(text) => setEnterpriseForm({ ...enterpriseForm, email: text })}
                placeholder="Email"
              />

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveEnterprise}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={styles.saveButtonText}>Enregistrer</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Manage Sites Modal */}
      <Modal
        visible={showSitesModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSitesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sites - {selectedEnterpriseForSites?.name}</Text>
              <TouchableOpacity onPress={() => setShowSitesModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.addSiteButtonContainer}>
              <TouchableOpacity
                style={styles.addSiteButton}
                onPress={() => {
                  setSiteForm({});
                  setEditingSite(null);
                  setShowAddSiteModal(true);
                }}
              >
                <Ionicons name="add-circle" size={20} color="#FFF" />
                <Text style={{  color: '#FFF', fontWeight: '600', fontSize: 14 }}>Ajouter un site</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
              {workSites.length > 0 ? (
                workSites.map(site => (
                  <View key={site.id} style={styles.siteCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.siteName}>{site.name}</Text>
                      <Text style={styles.siteMeta}>{site.address}</Text>
                      <Text style={styles.siteMeta}>Responsable: {site.siteManager}</Text>
                      <Text style={styles.siteMeta}>Tél: {site.phone}</Text>
                      <Text style={styles.siteMeta}>Travailleurs: {site.workerCount}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteSite(site.id)}
                      style={styles.deleteSiteButton}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
                  <Ionicons name="location-outline" size={40} color={colors.textSecondary} />
                  <Text style={{ marginTop: spacing.md, color: colors.textSecondary }}>Aucun site</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add/Edit Site Modal */}
      <Modal
        visible={showAddSiteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddSiteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter Site</Text>
              <TouchableOpacity onPress={() => setShowAddSiteModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
              <Text style={styles.fieldLabel}>Nom du Site *</Text>
              <TextInput
                style={styles.input}
                value={siteForm.name || ''}
                onChangeText={(text) => setSiteForm({ ...siteForm, name: text })}
                placeholder="Ex: Site de Kolwezi"
              />

              <Text style={styles.fieldLabel}>Adresse</Text>
              <TextInput
                style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                value={siteForm.address || ''}
                onChangeText={(text) => setSiteForm({ ...siteForm, address: text })}
                placeholder="Adresse du site"
                multiline
              />

              <Text style={styles.fieldLabel}>Responsable Site *</Text>
              <TextInput
                style={styles.input}
                value={siteForm.siteManager || ''}
                onChangeText={(text) => setSiteForm({ ...siteForm, siteManager: text })}
                placeholder="Nom du responsable"
              />

              <Text style={styles.fieldLabel}>Téléphone</Text>
              <TextInput
                style={styles.input}
                value={siteForm.phone || ''}
                onChangeText={(text) => setSiteForm({ ...siteForm, phone: text })}
                placeholder="Téléphone"
              />

              <Text style={styles.fieldLabel}>Nombre de Travailleurs</Text>
              <TextInput
                style={styles.input}
                value={String(siteForm.workerCount || '')}
                onChangeText={(text) => setSiteForm({ ...siteForm, workerCount: parseInt(text) || 0 })}
                placeholder="0"
                keyboardType="numeric"
              />

              <View style={styles.checkboxRow}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setSiteForm({ ...siteForm, isRemoteSite: !(siteForm.isRemoteSite) })}
                >
                  {siteForm.isRemoteSite && <View style={styles.checkboxInner} />}
                </TouchableOpacity>
                <Text style={{ flex: 1, color: colors.text, fontSize: 14 }}>Site éloigné</Text>
              </View>

              <View style={styles.checkboxRow}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setSiteForm({ ...siteForm, hasMedicalFacility: !(siteForm.hasMedicalFacility) })}
                >
                  {siteForm.hasMedicalFacility && <View style={styles.checkboxInner} />}
                </TouchableOpacity>
                <Text style={{ flex: 1, color: colors.text, fontSize: 14 }}>Dispensaire sur site</Text>
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleCreateSite}
              >
                <Ionicons name="add-circle" size={20} color="#FFF" />
                <Text style={styles.saveButtonText}>Créer le site</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Toast Notification */}
      <SimpleToastNotification message={toastMsg} />
    </View>
  );
}

// â”€â”€â”€ Helper Functions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getRiskColor(score: number): string {
  if (score < 30) return '#22C55E';
  if (score < 50) return '#F59E0B';
  if (score < 75) return '#EF4444';
  return '#7C2D12';
}

function complianceColor(score: number) {
  if (score >= 90) return styles.complianceGreen;
  if (score >= 75) return styles.complianceYellow;
  return styles.complianceRed;
}

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: colors.textSecondary },
  
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.text,
  },

  statsRow: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.md, marginBottom: spacing.lg },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.primary },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },

  filterRow: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm, marginBottom: spacing.lg },
  filterTab: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: colors.surfaceVariant },
  filterTabActive: { backgroundColor: colors.primary + '20', borderWidth: 1, borderColor: colors.primary },
  filterTabText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },

  workerCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md, borderLeftWidth: 4, borderLeftColor: colors.primary },
  workerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, gap: spacing.md },
  workerAvatar: { width: 50, height: 50, borderRadius: borderRadius.lg, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center' },
  workerName: { fontSize: 14, fontWeight: '700', color: colors.text },
  workerMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  riskBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  riskScore: { fontSize: 13, fontWeight: '700' },

  workerDetails: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outline },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 11, color: colors.textSecondary },

  progressBar: { height: 4, backgroundColor: colors.outlineVariant, borderRadius: borderRadius.full, overflow: 'hidden' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, paddingTop: spacing.lg, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.outline, paddingBottom: spacing.md },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },

  riskSection: { marginHorizontal: spacing.md, marginBottom: spacing.lg, backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.lg },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  riskCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center' },
  riskCircleValue: { fontSize: 32, fontWeight: '800', color: colors.primary },
  riskCircleLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  riskLevel: { fontSize: 14, fontWeight: '700', marginTop: spacing.sm },

  section: { marginHorizontal: spacing.md, marginBottom: spacing.lg, backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.lg },
  factorItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },

  actionButtons: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: borderRadius.lg },

  // Enterprise
  enterpriseCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md },
  enterpriseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, justifyContent: 'space-between' },
  enterpriseName: { fontSize: 14, fontWeight: '700', color: colors.text },
  enterpriseMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  complianceBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.lg },
  complianceValue: { fontSize: 13, fontWeight: '700', color: colors.primary },
  complianceGreen: { backgroundColor: '#22C55E' + '20' },
  complianceYellow: { backgroundColor: '#F59E0B' + '20' },
  complianceRed: { backgroundColor: '#EF4444' + '20' },

  enterpriseStats: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outline },
  statBarItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statBarText: { fontSize: 11, color: colors.textSecondary },

  // Tabs
  tabBar: { flexDirection: 'row', paddingHorizontal: spacing.md, gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.outline },
  tab: { flex: 1, paddingVertical: spacing.md, borderBottomWidth: 2, borderBottomColor: 'transparent', alignItems: 'center' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },

  // Action Buttons
  actionButtonsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: borderRadius.lg },
  actionButtonText: { fontSize: 12, fontWeight: '600' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.outline },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },

  // Form Styles
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.outline, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 14, color: colors.text },
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: borderRadius.lg, marginTop: spacing.lg, marginBottom: spacing.lg },
  saveButtonText: { color: '#FFF', fontWeight: '700', fontSize: 16 },

  // Site Management
  addSiteButtonContainer: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  addSiteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.secondary, paddingVertical: spacing.md, borderRadius: borderRadius.lg },
  siteCard: { backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'flex-start', gaps: spacing.md },
  siteName: { fontSize: 14, fontWeight: '700', color: colors.text },
  siteMeta: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs },
  deleteSiteButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },

  // Checkbox
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.sm },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: colors.primary, marginRight: spacing.md, alignItems: 'center', justifyContent: 'center' },
  checkboxInner: { width: 12, height: 12, borderRadius: 2, backgroundColor: colors.primary },

  cardShadow: shadows.sm,
});
