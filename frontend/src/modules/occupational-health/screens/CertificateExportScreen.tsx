import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Modal, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';

const { width } = Dimensions.get('window');

interface Certificate {
  id: string;
  certificateNumber: string;
  workerName: string;
  workerId: string;
  company: string;
  jobTitle: string;
  examDate: string;
  expiryDate: string;
  fitnessStatus: 'fit' | 'fit_with_restrictions' | 'unfit';
  restrictions?: string[];
  examiner: string;
  stamp?: string;
  signature?: string;
}

interface CertificateExportProps {
  visible: boolean;
  certificate: Certificate | null;
  onClose: () => void;
  onExportPDF?: (format: 'simple' | 'detailed') => Promise<void>;
}

// ─── PDF Preview Component ───────────────────────────────────
function PDFPreview({ certificate, format }: { certificate: Certificate; format: 'simple' | 'detailed' }) {
  const fitnessColor = {
    fit: '#22C55E',
    fit_with_restrictions: '#F59E0B',
    unfit: '#EF4444',
  }[certificate.fitnessStatus];

  const fitnessLabel = {
    fit: 'FIT FOR WORK',
    fit_with_restrictions: 'FIT WITH RESTRICTIONS',
    unfit: 'UNFIT FOR WORK',
  }[certificate.fitnessStatus];

  if (format === 'simple') {
    return (
      <View style={styles.pdfPreview}>
        {/* Decorative Border Frame */}
        <View style={styles.certificateFrame}>
          {/* Header Section */}
          <View style={styles.pdfHeader}>
            <View style={styles.companyBadge}>
              <Text style={styles.companyName}>KCC MINING</Text>
              <Text style={styles.companySubtitle}>Occupational Health & Safety Department</Text>
            </View>
            <View style={styles.headerDivider} />
            <Text style={styles.certificateTitle}>FITNESS FOR WORK CERTIFICATE</Text>
            <Text style={styles.certificateSubtitle}>Occupational Health Assessment</Text>
          </View>

          {/* Certificate Body */}
          <View style={styles.certificateBody}>
            {/* Employee Information Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>EMPLOYEE INFORMATION</Text>
              <View style={styles.sectionDivider} />
              
              <View style={styles.infoGrid}>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Full Name</Text>
                  <Text style={styles.infoValue}>{certificate.workerName}</Text>
                </View>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Employee ID</Text>
                  <Text style={styles.infoValue}>{certificate.workerId}</Text>
                </View>
              </View>

              <View style={styles.infoGrid}>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Organization</Text>
                  <Text style={styles.infoValue}>{certificate.company}</Text>
                </View>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Position / Job Title</Text>
                  <Text style={styles.infoValue}>{certificate.jobTitle}</Text>
                </View>
              </View>
            </View>

            {/* Medical Assessment Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>MEDICAL ASSESSMENT RESULT</Text>
              <View style={styles.sectionDivider} />
              
              <View style={[styles.fitnessBox, { borderColor: {
                fit: '#059669',
                fit_with_restrictions: '#D97706',
                unfit: '#DC2626',
              }[certificate.fitnessStatus] }]}>
                <View style={[styles.fitnessBadge, { backgroundColor: {
                  fit: '#ECFDF5',
                  fit_with_restrictions: '#FFFBEB',
                  unfit: '#FEF2F2',
                }[certificate.fitnessStatus] }]}>
                  <Ionicons name={
                    certificate.fitnessStatus === 'fit' ? 'checkmark-circle' :
                    certificate.fitnessStatus === 'fit_with_restrictions' ? 'alert-circle' : 'close-circle'
                  } size={48} color={{
                    fit: '#059669',
                    fit_with_restrictions: '#D97706',
                    unfit: '#DC2626',
                  }[certificate.fitnessStatus]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fitnessStatus}>Status:</Text>
                    <Text style={[styles.fitnessLabel, { color: {
                      fit: '#059669',
                      fit_with_restrictions: '#D97706',
                      unfit: '#DC2626',
                    }[certificate.fitnessStatus] }]}>
                      {
                        certificate.fitnessStatus === 'fit' ? 'FIT FOR WORK' :
                        certificate.fitnessStatus === 'fit_with_restrictions' ? 'FIT WITH RESTRICTIONS' : 'UNFIT FOR WORK'
                      }
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Restrictions Section */}
            {certificate.restrictions && certificate.restrictions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>WORK RESTRICTIONS & RECOMMENDATIONS</Text>
                <View style={styles.sectionDivider} />
                {certificate.restrictions.map((restriction, idx) => (
                  <View key={idx} style={styles.restrictionItemSimple}>
                    <View style={styles.restrictionBullet} />
                    <Text style={styles.restrictionItemText}>{restriction}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Validity Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>CERTIFICATE VALIDITY</Text>
              <View style={styles.sectionDivider} />
              
              <View style={styles.validityGrid}>
                <View style={styles.validityItem}>
                  <Text style={styles.validityLabel}>Assessment Date</Text>
                  <Text style={styles.validityValue}>{certificate.examDate}</Text>
                </View>
                <View style={styles.validityItem}>
                  <Text style={styles.validityLabel}>Expiry Date</Text>
                  <Text style={styles.validityValue}>{certificate.expiryDate}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Signature Section */}
          <View style={styles.signatureBasicSection}>
            <View style={styles.signatureBlock}>
              <View style={styles.signatureLine} />
              <Text style={styles.certifierName}>Dr. {certificate.examiner}</Text>
              <Text style={styles.certifierTitle}>Occupational Health Physician</Text>
            </View>
            <View style={styles.signatureBlock}>
              <Text style={styles.stampLabel}>Official</Text>
              <Text style={styles.stampLabel}>Stamp/Seal</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.certificateFooter}>
            <Text style={styles.footerText}>Certificate #{certificate.certificateNumber}</Text>
            <Text style={styles.footerText}>This certificate is issued in accordance with occupational health regulations</Text>
          </View>
        </View>
      </View>
    );
  }

  // Detailed Format
  return (
    <View style={styles.pdfPreview}>
      <View style={styles.certificateFrame}>
        {/* Header */}
        <View style={styles.pdfHeader}>
          <View style={styles.companyBadge}>
            <Text style={styles.companyName}>KCC MINING</Text>
            <Text style={styles.companySubtitle}>Occupational Health & Safety Department</Text>
          </View>
          <View style={styles.headerDivider} />
          <Text style={styles.certificateTitle}>FITNESS FOR WORK CERTIFICATE</Text>
          <Text style={styles.certificateSubtitle}>Comprehensive Health Assessment - ISO 45001 Compliant</Text>
        </View>

        {/* Content */}
        <View style={styles.certificateBody}>
          {/* Employee Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EMPLOYEE INFORMATION</Text>
            <View style={styles.sectionDivider} />
            <View style={styles.infoGrid}>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Full Name</Text>
                <Text style={styles.infoValue}>{certificate.workerName}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Employee ID</Text>
                <Text style={styles.infoValue}>{certificate.workerId}</Text>
              </View>
            </View>
            <View style={styles.infoGrid}>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Organization</Text>
                <Text style={styles.infoValue}>{certificate.company}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Position / Job Title</Text>
                <Text style={styles.infoValue}>{certificate.jobTitle}</Text>
              </View>
            </View>
          </View>

          {/* Examination Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EXAMINATION INFORMATION</Text>
            <View style={styles.sectionDivider} />
            <View style={styles.infoGrid}>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Assessment Date</Text>
                <Text style={styles.infoValue}>{certificate.examDate}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Expiry Date</Text>
                <Text style={styles.infoValue}>{certificate.expiryDate}</Text>
              </View>
            </View>
            <View style={styles.infoGrid}>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Examining Physician</Text>
                <Text style={styles.infoValue}>Dr. {certificate.examiner}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Certificate Number</Text>
                <Text style={styles.infoValue}>{certificate.certificateNumber}</Text>
              </View>
            </View>
          </View>

          {/* Fitness Assessment */}
          <View style={[styles.fitnessBox, { borderColor: {
            fit: '#059669',
            fit_with_restrictions: '#D97706',
            unfit: '#DC2626',
          }[certificate.fitnessStatus] }]}>
            <View style={[styles.fitnessBadge, { backgroundColor: {
              fit: '#ECFDF5',
              fit_with_restrictions: '#FFFBEB',
              unfit: '#FEF2F2',
            }[certificate.fitnessStatus] }]}>
              <Ionicons name={
                certificate.fitnessStatus === 'fit' ? 'checkmark-circle' :
                certificate.fitnessStatus === 'fit_with_restrictions' ? 'alert-circle' : 'close-circle'
              } size={48} color={{
                fit: '#059669',
                fit_with_restrictions: '#D97706',
                unfit: '#DC2626',
              }[certificate.fitnessStatus]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.fitnessStatus}>FITNESS ASSESSMENT</Text>
                <Text style={[styles.fitnessLabel, { color: {
                  fit: '#059669',
                  fit_with_restrictions: '#D97706',
                  unfit: '#DC2626',
                }[certificate.fitnessStatus] }]}>
                  {
                    certificate.fitnessStatus === 'fit' ? 'FIT FOR WORK' :
                    certificate.fitnessStatus === 'fit_with_restrictions' ? 'FIT WITH RESTRICTIONS' : 'UNFIT FOR WORK'
                  }
                </Text>
              </View>
            </View>
            {certificate.restrictions && certificate.restrictions.length > 0 && (
              <Text style={styles.fitnessNote}>See restrictions below for specific recommendations</Text>
            )}
          </View>

          {/* Restrictions Section */}
          {certificate.restrictions && certificate.restrictions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>WORK RESTRICTIONS & RECOMMENDATIONS</Text>
              <View style={styles.sectionDivider} />
              {certificate.restrictions.map((restriction, idx) => (
                <View key={idx} style={styles.restrictionItemSimple}>
                  <View style={styles.restrictionBullet} />
                  <Text style={styles.restrictionItemText}>{restriction}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Medical Statement */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>MEDICAL STATEMENT</Text>
            <View style={styles.sectionDivider} />
            <View style={styles.statementBox}>
              <Text style={styles.statementText}>
                This certifies that the above-named employee has been comprehensively medically examined
                and assessed as <Text style={{ fontWeight: '700' }}>
                  {
                    certificate.fitnessStatus === 'fit' ? 'FIT' :
                    certificate.fitnessStatus === 'fit_with_restrictions' ? 'FIT WITH RESTRICTIONS' : 'UNFIT'
                  }
                </Text> for their assigned work duties and occupational exposures.
              </Text>
              {certificate.restrictions && certificate.restrictions.length > 0 && (
                <Text style={[styles.statementText, { marginTop: spacing.md }]}>
                  This assessment is conditional on strict adherence to the work restrictions listed above.
                </Text>
              )}
              <Text style={[styles.statementText, { marginTop: spacing.md }]}>
                This certificate is valid until <Text style={{ fontWeight: '700' }}>{certificate.expiryDate}</Text>.
              </Text>
            </View>
          </View>

          {/* Compliance Statement */}
          <View style={[styles.section, styles.complianceBox]}>
            <Ionicons name="shield-checkmark" size={20} color="#059669" style={{ marginRight: spacing.sm }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.complianceText}>
                This certificate has been issued in compliance with ISO 45001:2018 Occupational Health and Safety Management System standards and applicable national workplace health regulations.
              </Text>
            </View>
          </View>
        </View>

        {/* Signature Section */}
        <View style={styles.signatureDetailedSection}>
          <View style={styles.signatureDetailBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.certifierName}>Dr. {certificate.examiner}</Text>
            <Text style={styles.certifierTitle}>Occupational Health Physician</Text>
            <Text style={styles.licenseInfo}>License / Registration #: ____________</Text>
          </View>
          <View style={styles.signatureDetailBlock}>
            <Text style={styles.stampLargeLabel}>Official</Text>
            <Text style={styles.stampLargeLabel}>Stamp/Seal</Text>
            <Text style={styles.stampLargeLabel} style={{ marginTop: spacing.lg, fontSize: 9 }}>(Date: {new Date().toLocaleDateString()})</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.certificateFooter}>
          <Text style={styles.footerText}>Certificate #{certificate.certificateNumber}</Text>
          <Text style={styles.footerText}>Valid from {certificate.examDate} to {certificate.expiryDate}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Main Export Modal ──────────────────────────────────────
export function CertificateExportModal({
  visible,
  certificate,
  onClose,
  onExportPDF,
}: CertificateExportProps) {
  const [selectedFormat, setSelectedFormat] = useState<'simple' | 'detailed'>('simple');
  const [exporting, setExporting] = useState(false);

  if (!certificate) return null;

  const handleExport = async () => {
    setExporting(true);
    try {
      if (onExportPDF) {
        await onExportPDF(selectedFormat);
      }
      Alert.alert('Success', `Certificate exported as ${selectedFormat} PDF`);
      setExporting(false);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to export certificate');
      setExporting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Export Certificate</Text>
            <TouchableOpacity onPress={onClose} disabled={exporting}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Format Selection */}
          <View style={styles.formatSection}>
            <Text style={styles.formatTitle}>Select Format</Text>

            <TouchableOpacity
              style={[
                styles.formatCard,
                selectedFormat === 'simple' && styles.formatCardActive,
              ]}
              onPress={() => setSelectedFormat('simple')}
              disabled={exporting}
            >
              <View style={[styles.formatIcon, selectedFormat === 'simple' && styles.formatIconActive]}>
                <Ionicons
                  name="document-outline"
                  size={24}
                  color={selectedFormat === 'simple' ? colors.primary : colors.textSecondary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.formatName, selectedFormat === 'simple' && { color: colors.primary }]}>
                  Simple Format
                </Text>
                <Text style={styles.formatDescription}>
                  Single page certificate for printing
                </Text>
              </View>
              <View style={[styles.radioButton, selectedFormat === 'simple' && styles.radioButtonChecked]}>
                {selectedFormat === 'simple' && <View style={styles.radioButtonInner} />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.formatCard,
                selectedFormat === 'detailed' && styles.formatCardActive,
              ]}
              onPress={() => setSelectedFormat('detailed')}
              disabled={exporting}
            >
              <View style={[styles.formatIcon, selectedFormat === 'detailed' && styles.formatIconActive]}>
                <Ionicons
                  name="document-text-outline"
                  size={24}
                  color={selectedFormat === 'detailed' ? colors.primary : colors.textSecondary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.formatName, selectedFormat === 'detailed' && { color: colors.primary }]}>
                  Detailed Format
                </Text>
                <Text style={styles.formatDescription}>
                  Multi-page report with full details
                </Text>
              </View>
              <View style={[styles.radioButton, selectedFormat === 'detailed' && styles.radioButtonChecked]}>
                {selectedFormat === 'detailed' && <View style={styles.radioButtonInner} />}
              </View>
            </TouchableOpacity>
          </View>

          {/* Preview */}
          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>Preview</Text>
            <PDFPreview certificate={certificate} format={selectedFormat} />
          </View>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={exporting}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
              onPress={handleExport}
              disabled={exporting}
            >
              <Ionicons name="download" size={18} color="#FFF" />
              <Text style={styles.exportBtnText}>
                {exporting ? 'Exporting...' : 'Export PDF'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Standalone Export Screen ──────────────────────────────
export function CertificateExportScreen() {
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate>({
    id: 'c1',
    certificateNumber: 'CERT-2025-001',
    workerName: 'Jean-Charles Mulinga',
    workerId: 'w001',
    company: 'KCC Mining Ltd',
    jobTitle: 'Extraction Operator',
    examDate: '2025-02-20',
    expiryDate: '2026-02-20',
    fitnessStatus: 'fit_with_restrictions',
    restrictions: ['No heights work during vertigo episodes', 'Avoid prolonged vibration exposure'],
    examiner: 'Habimana',
  });

  const [modalVisible, setModalVisible] = useState(true);

  return (
    <CertificateExportModal
      visible={modalVisible}
      certificate={selectedCertificate}
      onClose={() => setModalVisible(false)}
      onExportPDF={async (format) => {
        // Implement actual PDF export here
        return new Promise((resolve) => {
          setTimeout(resolve, 2000);
        });
      }}
    />
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '95%',
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  formatSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  formatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  formatCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  formatCardActive: {
    backgroundColor: colors.primary + '10',
    borderColor: colors.primary,
    borderWidth: 2,
  },
  formatIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formatIconActive: {
    backgroundColor: colors.primary + '20',
  },
  formatName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  formatDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.outline,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonChecked: {
    borderColor: colors.primary,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  previewSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    maxHeight: 350,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  pdfPreview: {
    backgroundColor: '#FFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadows.sm,
  },
  certificateFrame: {
    borderWidth: 3,
    borderColor: '#1F2937',
    borderRadius: 8,
    padding: spacing.lg,
    backgroundColor: '#FFFFFF',
  },
  pdfHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerDivider: {
    width: '100%',
    height: 2,
    backgroundColor: '#1F2937',
    marginVertical: spacing.md,
  },
  companyBadge: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: 1.5,
  },
  companySubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  certificateTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  certificateSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '500',
  },
  certificateBody: {
    marginVertical: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
    backgroundColor: '#F9FAFB',
    padding: spacing.lg,
    borderRadius: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#D1D5DB',
    marginBottom: spacing.md,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
    lineHeight: 20,
  },
  fitnessBox: {
    borderWidth: 3,
    borderRadius: 8,
    padding: spacing.lg,
    marginVertical: spacing.md,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fitnessBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    padding: spacing.lg,
    borderRadius: 8,
    gap: spacing.lg,
    width: '100%',
  },
  fitnessStatus: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  fitnessLabel: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  restrictionItemSimple: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  restrictionBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1F2937',
    marginTop: 8,
    flexShrink: 0,
  },
  restrictionItemText: {
    fontSize: 13,
    color: '#1F2937',
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
  },
  validityGrid: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  validityItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  validityLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  validityValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '700',
  },
  signatureBasicSection: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 2,
    borderTopColor: '#1F2937',
    justifyContent: 'space-between',
  },
  signatureBlock: {
    flex: 1,
    alignItems: 'center',
  },
  signatureLine: {
    width: 120,
    height: 2,
    backgroundColor: '#1F2937',
    marginBottom: spacing.md,
  },
  certifierName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  certifierTitle: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '500',
  },
  stampLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
    textAlign: 'center',
  },
  certificateFooter: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '500 ',
  },
  notesBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  notesText: {
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 18,
  },
  complianceBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: '#22C55E',
  },
  complianceText: {
    fontSize: 12,
    color: '#047857',
    flex: 1,
    lineHeight: 18,
    fontWeight: '500',
  },
  stampText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  stampSubtext: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  exportBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  exportBtnDisabled: {
    opacity: 0.6,
  },
  exportBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  statementBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    padding: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
  },
  statementText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 22,
    fontWeight: '500',
  },
  fitnessNote: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  signatureDetailedSection: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 2,
    borderTopColor: '#1F2937',
    justifyContent: 'space-between',
    width: '100%',
  },
  signatureDetailBlock: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  licenseInfo: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: spacing.sm,
    fontWeight: '500',
    textAlign: 'center',
  },
  stampLargeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
});
