import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { 
  SECTOR_PROFILES, 
  OccHealthUtils,
  type ExamType,
  type FitnessStatus,
  type IndustrySector,
} from '../../../models/OccupationalHealth';
import { occHealthApi } from '../../../services/OccHealthApiService';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

const ACCENT = colors.primary;

// ─── Certificate Interface ──────────────────────────────────
interface Certificate {
  id: number;
  patientId: string;
  patientName: string;
  patientNumber: string;
  company: string;
  jobTitle: string;
  examType: ExamType;
  examDate: string;
  expiryDate: string;
  fitnessDecision: FitnessStatus;
  restrictions?: string[];
  examinerName: string;
  certificateNumber: string;
  sector: IndustrySector;
  createdAt: string;
  isActive: boolean;
  rawRestrictions?: string;
}

// ─── Helper Components ───────────────────────────────────────
function CertificateCard({ 
  certificate, 
  onPress, 
  onDownload,
  onRevoke,
  isDownloading = false
}: { 
  certificate: Certificate; 
  onPress: () => void;
  onDownload: () => void;
  onRevoke: () => void;
  isDownloading?: boolean;
}) {
  const isExpired = new Date(certificate.expiryDate) < new Date();
  const isExpiringSoon = !isExpired && new Date(certificate.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const sectorProfile = SECTOR_PROFILES[certificate.sector];
  const fitnessColor = OccHealthUtils.getFitnessStatusColor(certificate.fitnessDecision);

  return (
    <View style={[
      styles.certificateCard,
      isExpired && styles.certificateCardExpired,
      isExpiringSoon && styles.certificateCardExpiring
    ]}>
      {/* Pressable Content Area */}
      <TouchableOpacity 
        style={{ flex: 1 }}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.certificateCardHeader}>
          <View style={[styles.certificateAvatar, { backgroundColor: sectorProfile.color + '14' }]}>
            <Ionicons name="shield-checkmark" size={20} color={sectorProfile.color} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.certificateNumber}>{certificate.certificateNumber}</Text>
              {isExpired && (
                <View style={styles.expiredBadge}>
                  <Text style={styles.expiredBadgeText}>EXPIRÉ</Text>
                </View>
              )}
              {isExpiringSoon && !isExpired && (
                <View style={styles.expiringSoonBadge}>
                  <Text style={styles.expiringSoonBadgeText}>EXPIRE BIENTÔT</Text>
                </View>
              )}
            </View>
            <Text style={styles.certificatePatientName}>{certificate.patientName}</Text>
            <Text style={styles.certificateCompany}>{certificate.company} • {certificate.jobTitle}</Text>
          </View>
          <View style={styles.certificateCardActions}>
            <Text style={styles.certificateDate}>{new Date(certificate.examDate).toLocaleDateString('fr-CD')}</Text>
            <View style={[styles.fitnessChip, { backgroundColor: fitnessColor + '14' }]}>
              <Text style={[styles.fitnessChipText, { color: fitnessColor }]}>
                {OccHealthUtils.getFitnessStatusLabel(certificate.fitnessDecision)}
              </Text>
            </View>
          </View>
        </View>

        {/* Details */}
        <View style={styles.certificateCardDetails}>
          <View style={styles.certificateDetail}>
            <Ionicons name="clipboard" size={14} color={colors.textSecondary} />
            <Text style={styles.certificateDetailText}>{OccHealthUtils.getExamTypeLabel(certificate.examType)}</Text>
          </View>
          <View style={styles.certificateDetail}>
            <Ionicons name="calendar" size={14} color={colors.textSecondary} />
            <Text style={styles.certificateDetailText}>
              Expire: {new Date(certificate.expiryDate).toLocaleDateString('fr-CD')}
            </Text>
          </View>
          <View style={styles.certificateDetail}>
            <Ionicons name="person" size={14} color={colors.textSecondary} />
            <Text style={styles.certificateDetailText}>{certificate.examinerName}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Bottom Actions - SEPARATE from pressable content */}
      <View style={styles.certificateCardFooter}>
        <TouchableOpacity 
          style={styles.actionBtn}
          onPress={onDownload}
          activeOpacity={0.7}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Ionicons name="download" size={16} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>Télécharger</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionBtn, { borderColor: colors.error + '40' }]}
          onPress={onRevoke}
          activeOpacity={0.7}
          disabled={isDownloading}
        >
          <Ionicons name="ban" size={16} color={colors.error} />
          <Text style={[styles.actionBtnText, { color: colors.error }]}>Révoquer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────────
export function CertificatesScreen({
  onNavigateBack,
  showBackButton = false
}: {
  onNavigateBack?: () => void;
  showBackButton?: boolean;
}) {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<Certificate | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'valid' | 'expired' | 'expiring_soon'>('all');
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const mapApiCertificate = (item: any): Certificate => {
    const restrictionList = String(item.restrictions || '')
      .split(';')
      .map((value) => value.trim())
      .filter(Boolean);

    return {
      id: Number(item.id),
      patientId: String(item.examination ?? ''),
      patientName: item.worker_name || 'Travailleur',
      patientNumber: item.worker_employee_id || '-',
      company: item.worker_company || '-',
      jobTitle: item.worker_job_title || '-',
      examType: (item.exam_type || 'periodic') as ExamType,
      examDate: item.exam_date || item.issue_date,
      expiryDate: item.valid_until,
      fitnessDecision: (item.fitness_decision || 'fit') as FitnessStatus,
      restrictions: restrictionList,
      examinerName: item.issued_by_name || 'Médecin',
      certificateNumber: item.certificate_number || `CERT-${item.id}`,
      sector: (item.worker_sector || 'other') as IndustrySector,
      createdAt: item.created_at || item.issue_date,
      isActive: item.is_active !== false,
      rawRestrictions: item.restrictions || '',
    };
  };

  // Load certificates from backend
  const loadCertificates = async () => {
    try {
      setLoading(true);
      const res = await occHealthApi.listFitnessCertificates();
      if (res.error) throw new Error(res.error);

      const mapped = res.data
        .map(mapApiCertificate)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setCertificates(mapped);
    } catch (error) {
      console.error('Error loading certificates:', error);
      showToast('Impossible de charger les certificats.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCertificates();
  }, []);

  // ─── Filtered certificates ──
  const filteredCertificates = useMemo(() => {
    let filtered = certificates;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(cert => 
        cert.patientName.toLowerCase().includes(query) ||
        cert.company.toLowerCase().includes(query) ||
        cert.certificateNumber.toLowerCase().includes(query) ||
        cert.jobTitle.toLowerCase().includes(query)
      );
    }

    // Status filter
    const now = new Date();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    if (filterStatus === 'valid') {
      filtered = filtered.filter(cert => new Date(cert.expiryDate) >= now);
    } else if (filterStatus === 'expired') {
      filtered = filtered.filter(cert => new Date(cert.expiryDate) < now);
    } else if (filterStatus === 'expiring_soon') {
      filtered = filtered.filter(cert => {
        const expiryDate = new Date(cert.expiryDate);
        return expiryDate >= now && expiryDate <= thirtyDaysFromNow;
      });
    }

    return filtered;
  }, [certificates, searchQuery, filterStatus]);

  // ─── Stats ──
  const stats = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    const total = certificates.length;
    const valid = certificates.filter(c => new Date(c.expiryDate) >= now).length;
    const expired = certificates.filter(c => new Date(c.expiryDate) < now).length;
    const expiringSoon = certificates.filter(c => {
      const expiryDate = new Date(c.expiryDate);
      return expiryDate >= now && expiryDate <= thirtyDaysFromNow;
    }).length;

    return { total, valid, expired, expiringSoon };
  }, [certificates]);

  // ─── Handlers ──
  const handleCertificatePress = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
  };

  const handleDownload = async (certificate: Certificate) => {
    try {
      setDownloading(certificate.id);
      const result = await occHealthApi.downloadFitnessCertificatePdf(certificate.id);

      if (result.error || !result.blob) {
        showToast(result.error || 'Impossible de générer le PDF.', 'error');
        return;
      }

      // Web download
      const url = window.URL.createObjectURL(result.blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = result.fileName || `${certificate.certificateNumber}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
      showToast('PDF téléchargé avec succès');
    } catch (error) {
      console.error('Download error:', error);
      showToast('Erreur lors du téléchargement.', 'error');
    } finally {
      setDownloading(null);
    }
  };

  const handleRevoke = (certificate: Certificate) => {
    setConfirmRevoke(certificate);
  };

  const confirmRevokeAction = async () => {
    if (!confirmRevoke) return;
    try {
      setRevoking(true);
      const res = await occHealthApi.revokeFitnessCertificate(confirmRevoke.id, 'Révoqué via interface certificats');
      if (res.error) throw new Error(res.error);
      setConfirmRevoke(null);
      await loadCertificates();
      showToast('Certificat révoqué avec succès');
    } catch (error) {
      console.error('Revoke error:', error);
      showToast('Impossible de révoquer le certificat.', 'error');
    } finally {
      setRevoking(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="shield-checkmark" size={64} color={ACCENT} />
        <Text style={styles.loadingText}>Chargement des certificats...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {showBackButton && onNavigateBack && (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={onNavigateBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Certificats d'Aptitude</Text>
          <Text style={styles.subtitle}>Gestion des certificats médicaux d'aptitude au travail</Text>
        </View>
        <TouchableOpacity 
          style={styles.refreshBtn}
          onPress={loadCertificates}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={18} color={ACCENT} />
          <Text style={styles.refreshBtnText}>Actualiser</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.primary }]}>
          <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.success }]}>
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={styles.statNumber}>{stats.valid}</Text>
          <Text style={styles.statLabel}>Valides</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.warning }]}>
          <Ionicons name="warning" size={20} color="#FFFFFF" />
          <Text style={styles.statNumber}>{stats.expiringSoon}</Text>
          <Text style={styles.statLabel}>Expire Bientôt</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.error }]}>
          <Ionicons name="close-circle" size={20} color="#FFFFFF" />
          <Text style={styles.statNumber}>{stats.expired}</Text>
          <Text style={styles.statLabel}>Expirés</Text>
        </View>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Rechercher par nom, entreprise, certificat..."
            placeholderTextColor={colors.placeholder}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filtersRow}>
        {[
          { value: 'all', label: 'Tous' },
          { value: 'valid', label: 'Valides' },
          { value: 'expiring_soon', label: 'Expire Bientôt' },
          { value: 'expired', label: 'Expirés' },
        ].map(filter => (
          <TouchableOpacity
            key={filter.value}
            style={[styles.filterChip, filterStatus === filter.value && styles.filterChipActive]}
            onPress={() => setFilterStatus(filter.value as typeof filterStatus)}
          >
            <Text style={[styles.filterChipText, filterStatus === filter.value && styles.filterChipTextActive]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filteredCertificates.length} certificat{filteredCertificates.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Certificates List */}
      <ScrollView style={styles.certificatesList} contentContainerStyle={styles.certificatesListContent}>
        {filteredCertificates.map(certificate => (
          <CertificateCard
            key={certificate.id}
            certificate={certificate}
            onPress={() => handleCertificatePress(certificate)}
            onDownload={() => handleDownload(certificate)}
            onRevoke={() => handleRevoke(certificate)}
            isDownloading={downloading === certificate.id}
          />
        ))}
        
        {filteredCertificates.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="shield-checkmark-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>Aucun certificat trouvé</Text>
            <Text style={styles.emptySubtitle}>
              {certificates.length === 0 
                ? 'Aucun certificat n\'a encore été émis'
                : 'Essayez de modifier vos critères de recherche'
              }
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Certificate Details Modal */}
      <Modal visible={!!selectedCertificate} transparent animationType="fade" onRequestClose={() => setSelectedCertificate(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            {selectedCertificate && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Détails du Certificat</Text>
                  <TouchableOpacity onPress={() => setSelectedCertificate(null)}>
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalContent}>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Certificat</Text>
                    <Text style={styles.modalText}>{selectedCertificate.certificateNumber}</Text>
                    <Text style={styles.modalSubtext}>
                      Émis le {new Date(selectedCertificate.examDate).toLocaleDateString('fr-CD')} • 
                      Expire le {new Date(selectedCertificate.expiryDate).toLocaleDateString('fr-CD')}
                    </Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Patient</Text>
                    <Text style={styles.modalText}>{selectedCertificate.patientName}</Text>
                    <Text style={styles.modalSubtext}>
                      {selectedCertificate.patientNumber} • {selectedCertificate.company} • {selectedCertificate.jobTitle}
                    </Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Examen</Text>
                    <Text style={styles.modalText}>{OccHealthUtils.getExamTypeLabel(selectedCertificate.examType)}</Text>
                    <Text style={styles.modalSubtext}>{selectedCertificate.examinerName}</Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Décision d'Aptitude</Text>
                    <View style={[styles.fitnessChip, { backgroundColor: OccHealthUtils.getFitnessStatusColor(selectedCertificate.fitnessDecision) + '14' }]}>
                      <Text style={[styles.fitnessChipText, { color: OccHealthUtils.getFitnessStatusColor(selectedCertificate.fitnessDecision) }]}>
                        {OccHealthUtils.getFitnessStatusLabel(selectedCertificate.fitnessDecision)}
                      </Text>
                    </View>
                  </View>

                  {selectedCertificate.restrictions && selectedCertificate.restrictions.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Restrictions</Text>
                      {selectedCertificate.restrictions.map((restriction, i) => (
                        <View key={i} style={styles.restrictionItem}>
                          <Ionicons name="remove-circle" size={14} color={colors.error} />
                          <Text style={styles.modalText}>{restriction}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Revoke Confirmation Modal ── */}
      <Modal visible={!!confirmRevoke} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { maxHeight: 'auto' as any }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Révoquer le Certificat</Text>
              <TouchableOpacity onPress={() => setConfirmRevoke(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 20 }}>
              <Text style={[styles.modalText, { marginBottom: 8 }]}>
                Êtes-vous sûr de vouloir révoquer le certificat{' '}
                <Text style={{ fontWeight: '700' }}>{confirmRevoke?.certificateNumber}</Text> ?
              </Text>
              <Text style={[styles.modalSubtext, { color: colors.error, marginBottom: 20 }]}>
                Cette action est irréversible.
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                <TouchableOpacity
                  style={[styles.actionBtn, { paddingHorizontal: 20, paddingVertical: 10 }]}
                  onPress={() => setConfirmRevoke(null)}
                  disabled={revoking}
                >
                  <Text style={[styles.actionBtnText, { color: colors.text }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.error, borderColor: colors.error }]}
                  onPress={confirmRevokeAction}
                  disabled={revoking}
                >
                  {revoking
                    ? <ActivityIndicator size="small" color="#FFF" />
                    : <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Révoquer</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Toast ── */}
      {toastMsg && (
        <View style={[
          styles.toast,
          { backgroundColor: toastMsg.type === 'error' ? colors.error : colors.primary },
        ]}>
          <Ionicons
            name={toastMsg.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
            size={18}
            color="#FFF"
          />
          <Text style={styles.toastText}>{toastMsg.text}</Text>
        </View>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  
  // Loading
  loadingContainer: { 
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40,
  },
  loadingText: { fontSize: 16, color: colors.textSecondary, marginTop: 16 },
  
  // Header
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: isDesktop ? 32 : 16, paddingBottom: 16,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.outline,
  },
  backButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.outline,
    backgroundColor: colors.surface,
  },
  backButtonText: { fontSize: 13, fontWeight: '600', color: colors.text },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: borderRadius.md,
    backgroundColor: ACCENT + '14', borderWidth: 1, borderColor: ACCENT + '40',
  },
  refreshBtnText: { fontSize: 13, color: ACCENT, fontWeight: '600' },

  // Stats
  statsRow: { 
    flexDirection: 'row', gap: 12, paddingHorizontal: isDesktop ? 32 : 16, paddingVertical: 16,
  },
  statCard: {
    flex: 1, alignItems: 'center', padding: 16,
    borderRadius: borderRadius.lg, ...shadows.md,
  },
  statNumber: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginTop: 4 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.9)', marginTop: 2, textAlign: 'center', fontWeight: '600' },

  // Search
  searchSection: { 
    paddingHorizontal: isDesktop ? 32 : 16, paddingBottom: 16,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
    backgroundColor: colors.surface, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.outline,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, padding: 0 },

  // Filters
  filtersRow: { 
    flexDirection: 'row', gap: 8, paddingHorizontal: isDesktop ? 32 : 16, paddingBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: colors.outlineVariant, borderWidth: 1, borderColor: colors.outline,
  },
  filterChipActive: { backgroundColor: ACCENT + '14', borderColor: ACCENT },
  filterChipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  filterChipTextActive: { color: ACCENT, fontWeight: '600' },

  // Results
  resultsHeader: { paddingHorizontal: isDesktop ? 32 : 16, paddingBottom: 8 },
  resultsCount: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },

  // Certificates List
  certificatesList: { flex: 1 },
  certificatesListContent: { paddingHorizontal: isDesktop ? 32 : 16, paddingBottom: 16, gap: 12 },

  // Certificate Card
  certificateCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: 16,
    borderWidth: 1, borderColor: colors.outline, ...shadows.sm,
  },
  certificateCardExpired: { 
    borderColor: colors.error, backgroundColor: colors.error + '04',
  },
  certificateCardExpiring: { 
    borderColor: colors.warning, backgroundColor: colors.warning + '04',
  },
  certificateCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  certificateAvatar: { 
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
  },
  certificateNumber: { fontSize: 14, fontWeight: '700', color: colors.text },
  certificatePatientName: { fontSize: 13, color: colors.text, marginTop: 2 },
  certificateCompany: { fontSize: 12, color: colors.textSecondary },
  certificateCardActions: { alignItems: 'flex-end', gap: 4 },
  certificateDate: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  
  expiredBadge: { 
    backgroundColor: colors.error, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
  },
  expiredBadgeText: { fontSize: 8, color: '#FFF', fontWeight: '700' },
  expiringSoonBadge: { 
    backgroundColor: colors.warning, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
  },
  expiringSoonBadgeText: { fontSize: 8, color: '#FFF', fontWeight: '700' },

  fitnessChip: { 
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12,
  },
  fitnessChipText: { fontSize: 10, fontWeight: '700' },

  certificateCardDetails: { 
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12,
  },
  certificateDetail: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  certificateDetailText: { fontSize: 12, color: colors.text },

  certificateCardFooter: { 
    flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: colors.outline,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary + '40',
  },
  actionBtnText: { fontSize: 12, fontWeight: '600' },

  // Empty State
  emptyState: { 
    alignItems: 'center', justifyContent: 'center', padding: 40,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 4 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  modal: {
    width: isDesktop ? 600 : '92%', maxHeight: '80%',
    backgroundColor: colors.surface, borderRadius: borderRadius.xl, ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: colors.outline,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  modalContent: { flex: 1, padding: 20 },
  modalSection: { marginBottom: 16 },
  modalSectionTitle: { 
    fontSize: 12, color: colors.textSecondary, fontWeight: '700', 
    textTransform: 'uppercase', marginBottom: 6,
  },
  modalText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  modalSubtext: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  restrictionItem: { 
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4,
  },

  // Toast
  toast: {
    position: 'absolute', bottom: 32, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: borderRadius.lg, ...shadows.lg,
    maxWidth: 400,
  },
  toastText: { fontSize: 14, color: '#FFF', fontWeight: '600', flexShrink: 1 },
});