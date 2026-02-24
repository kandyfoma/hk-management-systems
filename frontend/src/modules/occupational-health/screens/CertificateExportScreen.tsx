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
        {/* Header */}
        <View style={styles.pdfHeader}>
          <View style={styles.companyBadge}>
            <Text style={styles.companyName}>KCC MINING</Text>
            <Text style={styles.companySubtitle}>Occupational Health Services</Text>
          </View>
          <Text style={styles.certificateTitle}>FITNESS CERTIFICATE</Text>
        </View>

        {/* Certificate Details */}
        <View style={styles.pdfContent}>
          {/* Worker Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Worker Information</Text>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{certificate.workerName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Employee ID:</Text>
              <Text style={styles.value}>{certificate.workerId}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Company:</Text>
              <Text style={styles.value}>{certificate.company}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Position:</Text>
              <Text style={styles.value}>{certificate.jobTitle}</Text>
            </View>
          </View>

          {/* Fitness Status */}
          <View style={[styles.fitnessBox, { borderColor: fitnessColor }]}>
            <View style={[styles.fitnessBadge, { backgroundColor: fitnessColor + '20' }]}>
              <Ionicons name={
                certificate.fitnessStatus === 'fit' ? 'checkmark-circle' :
                certificate.fitnessStatus === 'fit_with_restrictions' ? 'alert-circle' : 'close-circle'
              } size={32} color={fitnessColor} />
              <Text style={[styles.fitnessLabel, { color: fitnessColor }]}>{fitnessLabel}</Text>
            </View>
          </View>

          {/* Restrictions */}
          {certificate.restrictions && certificate.restrictions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Work Restrictions</Text>
              {certificate.restrictions.map((restriction, idx) => (
                <View key={idx} style={styles.restrictionRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.restrictionText}>{restriction}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Dates */}
          <View style={styles.datesRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dateLabel}>Issue Date</Text>
              <Text style={styles.dateValue}>{certificate.examDate}</Text>
            </View>
            <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: colors.outline, paddingLeft: spacing.md }}>
              <Text style={styles.dateLabel}>Expiry Date</Text>
              <Text style={styles.dateValue}>{certificate.expiryDate}</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={{ flex: 1 }}>
              <Text style={styles.footerLabel}>Examined By</Text>
              <Text style={styles.footerValue}>{certificate.examiner}</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={styles.footerLabel}>Certificate #</Text>
              <Text style={styles.footerValue}>{certificate.certificateNumber}</Text>
            </View>
          </View>
        </View>

        {/* Signature Area */}
        <View style={styles.signatureArea}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>Certifying Physician</Text>
        </View>
      </View>
    );
  }

  // Detailed Format
  return (
    <View style={styles.pdfPreview}>
      {/* Header */}
      <View style={styles.pdfHeader}>
        <View style={styles.companyBadge}>
          <Text style={styles.companyName}>KCC MINING</Text>
          <Text style={styles.companySubtitle}>Occupational Health Services Department</Text>
        </View>
        <Text style={styles.certificateTitle}>DETAILED FITNESS CERTIFICATE</Text>
        <Text style={styles.certificateSubtitle}>ISO 45001 Compliant</Text>
      </View>

      {/* Content */}
      <ScrollView style={styles.pdfContent} showsVerticalScrollIndicator={false}>
        {/* Worker Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Employee Information</Text>
          <View style={styles.detailGrid}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Full Name</Text>
              <Text style={styles.value}>{certificate.workerName}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Employee ID</Text>
              <Text style={styles.value}>{certificate.workerId}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Organization</Text>
              <Text style={styles.value}>{certificate.company}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Job Title</Text>
              <Text style={styles.value}>{certificate.jobTitle}</Text>
            </View>
          </View>
        </View>

        {/* Examination Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Examination Details</Text>
          <View style={styles.detailGrid}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Examination Date</Text>
              <Text style={styles.value}>{certificate.examDate}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Examiner</Text>
              <Text style={styles.value}>{certificate.examiner}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Certificate #</Text>
              <Text style={styles.value}>{certificate.certificateNumber}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Validity Period</Text>
              <Text style={styles.value}>1 Year</Text>
            </View>
          </View>
        </View>

        {/* Fitness Assessment */}
        <View style={[styles.fitnessBox, { borderColor: fitnessColor, borderWidth: 2 }]}>
          <View style={[styles.fitnessBadgeLarge, { backgroundColor: fitnessColor + '20' }]}>
            <Ionicons name={
              certificate.fitnessStatus === 'fit' ? 'checkmark-circle' :
              certificate.fitnessStatus === 'fit_with_restrictions' ? 'alert-circle' : 'close-circle'
            } size={48} color={fitnessColor} />
            <View>
              <Text style={styles.fitnessLabelLarge}>Fitness Assessment</Text>
              <Text style={[styles.fitnessValue, { color: fitnessColor }]}>{fitnessLabel}</Text>
            </View>
          </View>
        </View>

        {/* Restrictions (if any) */}
        {certificate.restrictions && certificate.restrictions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Associated Restrictions</Text>
            <View style={styles.restrictionsList}>
              {certificate.restrictions.map((restriction, idx) => (
                <View key={idx} style={styles.restrictionCard}>
                  <Ionicons name="alert-circle" size={16} color="#F59E0B" style={{ marginTop: 2 }} />
                  <Text style={styles.restrictionCardText}>{restriction}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Medical Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medical Notes</Text>
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>
              This certificate confirms that the named above has been assessed as {fitnessLabel.toLowerCase()} for their assigned duties, including all occupational exposures in their work environment.
            </Text>
            {certificate.restrictions && certificate.restrictions.length > 0 && (
              <Text style={[styles.notesText, { marginTop: spacing.md }]}>
                This fitness status is conditional upon adherence to the restrictions listed above.
              </Text>
            )}
            <Text style={[styles.notesText, { marginTop: spacing.md }]}>
              This certificate is valid until: {certificate.expiryDate}
            </Text>
          </View>
        </View>

        {/* Compliance Statement */}
        <View style={[styles.section, styles.complianceBox]}>
          <Ionicons name="shield-checkmark" size={24} color="#22C55E" />
          <Text style={styles.complianceText}>
            This certificate has been issued in accordance with ISO 45001:2018 Occupational Health and Safety Management System standard and applicable national legislation.
          </Text>
        </View>
      </ScrollView>

      {/* Signature Area */}
      <View style={styles.signatureAreaDetailed}>
        <View style={{ flex: 1 }}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>Dr. {certificate.examiner}</Text>
          <Text style={styles.signatureTitle}>Certifying Physician</Text>
        </View>
        <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: colors.outline, paddingLeft: spacing.lg }}>
          <Text style={styles.stampText}>Official Stamp</Text>
          <Text style={styles.stampSubtext}>/ Seal of Authority</Text>
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
    padding: spacing.lg,
    ...shadows.sm,
  },
  pdfHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
  },
  companyBadge: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  companyName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1,
  },
  companySubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  certificateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.5,
  },
  certificateSubtitle: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
  },
  pdfContent: {
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  label: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  value: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  detailGrid: {
    gap: spacing.md,
  },
  gridItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  fitnessBox: {
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fitnessBadge: {
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  fitnessBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.lg,
  },
  fitnessLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  fitnessLabelLarge: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  fitnessValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  restrictionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  bullet: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  restrictionText: {
    fontSize: 12,
    color: colors.text,
    flex: 1,
  },
  restrictionsList: {
    gap: spacing.md,
  },
  restrictionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: '#FFFBEB',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  restrictionCardText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
    fontWeight: '500',
  },
  datesRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: spacing.md,
  },
  dateLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  dateValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  footerValue: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
    marginTop: 4,
  },
  signatureArea: {
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
  },
  signatureAreaDetailed: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  signatureLine: {
    width: '100%',
    height: 1,
    backgroundColor: '#9CA3AF',
    marginBottom: spacing.md,
  },
  signatureLabel: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '600',
  },
  signatureTitle: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
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
});
