import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, Alert, FlatList, RefreshControl, TextInput, useWindowDimensions, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { OccHealthApiService } from '../../../services/OccHealthApiService';
import { useSimpleToast } from '../../../hooks/useSimpleToast';
import { SimpleToastNotification } from '../../../components/SimpleToastNotification';
import type { RootState } from '../../../store/store';

// ─── Types ──────────────────────────────────────────────────
interface IncidentAttachment {
  id: number;
  file: string;
  thumbnail?: string;
  attachment_type: 'image' | 'video';
  description: string;
  uploaded_at: string;
  uploaded_by_name: string;
  file_size_mb: number;
}

interface StatusHistoryEntry {
  status: string;
  changed_by_id?: number;
  changed_by_name: string;
  changed_at: string;
  note?: string;
}

interface Incident {
  id: string;
  number: string;
  date: string;
  time: string;
  worker: string;
  workerId: string;
  type: string;
  severity: string | number;
  status: string;
  description: string;
  location: string;
  department?: string;
  lti: boolean;
  ltiDays?: number;
  rootCause?: string;
  capaDeadline?: string;
  modifiedDate?: string;
  backendId?: number;
  attachments?: IncidentAttachment[];
  // Extended fields from backend model
  equipmentInvolved?: string;
  immediateActions?: string;
  firstAidGiven?: boolean;
  firstAidBy?: string;
  medicalTreatmentRequired?: boolean;
  hospitalName?: string;
  correctiveActionsPlanned?: string;
  reportableToAuthorities?: boolean;
  reportedToCnss?: boolean;
  reportedToLabourInspection?: boolean;
  // Audit trail
  reportedByName?: string;
  updatedByName?: string;
  closedByName?: string;
  closedAt?: string;
  statusHistory?: StatusHistoryEntry[];
}

// ─── Helper Functions ───────────────────────────────────────
function mapBackendToIncident(backendIncident: any): Incident {
  const severityMap: Record<number, string> = { 1: 'low', 2: 'medium', 3: 'high', 4: 'critical', 5: 'critical' };
  
  // Get the first injured worker from the detailed list returned by backend
  const injuredWorker = backendIncident.injured_workers_details?.[0];
  
  // Build worker name from available fields
  let workerName = 
    injuredWorker?.full_name ||
    injuredWorker?.name ||
    (injuredWorker?.first_name && injuredWorker?.last_name 
      ? `${injuredWorker.first_name} ${injuredWorker.last_name}`
      : injuredWorker?.first_name || 
        injuredWorker?.last_name ||
        '(No worker assigned)');
  
  return {
    id: String(backendIncident.id),
    backendId: backendIncident.id,
    number: backendIncident.incident_number,
    date: backendIncident.incident_date,
    time: backendIncident.incident_time,
    worker: workerName,
    workerId: injuredWorker?.id?.toString() || '',
    type: (backendIncident.category as any) || 'other',
    severity: severityMap[backendIncident.severity] || 'medium',
    status: backendIncident.status || 'reported',
    description: backendIncident.description,
    location: backendIncident.location_description,
    department: backendIncident.work_site?.name || '',
    lti: (backendIncident.work_days_lost || 0) > 0,
    ltiDays: backendIncident.work_days_lost || 0,
    rootCause: backendIncident.root_cause_analysis,
    modifiedDate: backendIncident.updated_at ? new Date(backendIncident.updated_at).toISOString().split('T')[0] : undefined,
    equipmentInvolved: backendIncident.equipment_involved || '',
    immediateActions: backendIncident.immediate_actions_taken || '',
    firstAidGiven: backendIncident.first_aid_given || false,
    firstAidBy: backendIncident.first_aid_by || '',
    medicalTreatmentRequired: backendIncident.medical_treatment_required || false,
    hospitalName: backendIncident.hospital_name || '',
    correctiveActionsPlanned: backendIncident.corrective_actions_planned || '',
    reportableToAuthorities: backendIncident.reportable_to_authorities || false,
    reportedToCnss: backendIncident.reported_to_cnss || false,
    reportedToLabourInspection: backendIncident.reported_to_labour_inspection || false,
    // Audit trail
    reportedByName: backendIncident.reported_by_name || '',
    updatedByName: backendIncident.updated_by_name || '',
    closedByName: backendIncident.closed_by_name || '',
    closedAt: backendIncident.closed_at || undefined,
    statusHistory: Array.isArray(backendIncident.status_history) ? backendIncident.status_history : [],
  };
}

// ─── Config Maps ─────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  fatality:                      { icon: 'skull',             color: '#DC2626', label: 'Fatality' },
  lost_time_injury:              { icon: 'bandage',           color: '#EF4444', label: 'Lost Time' },
  medical_treatment:             { icon: 'medical',           color: '#3B82F6', label: 'Medical' },
  first_aid:                     { icon: 'medkit',            color: '#3B82F6', label: 'First Aid' },
  near_miss:                     { icon: 'alert-circle',      color: '#F59E0B', label: 'Near Miss' },
  dangerous_occurrence:          { icon: 'warning',           color: '#F59E0B', label: 'Dangerous' },
  occupational_disease_incident: { icon: 'pulse',             color: '#8B5CF6', label: 'Disease' },
  needle_stick:                  { icon: 'alert-circle',      color: '#DC2626', label: 'Needle Stick' },
  patient_violence:              { icon: 'alert',             color: '#DC2626', label: 'Violence' },
  road_accident:                 { icon: 'car',               color: '#DC2626', label: 'Road' },
  robbery_violence:              { icon: 'alert',             color: '#DC2626', label: 'Robbery' },
  chemical_spill:                { icon: 'water',             color: '#8B5CF6', label: 'Chemical' },
  fall_from_height:              { icon: 'alert-circle',      color: '#DC2626', label: 'Fall' },
  machinery_accident:            { icon: 'hammer',            color: '#DC2626', label: 'Machinery' },
  explosion:                     { icon: 'alert',             color: '#DC2626', label: 'Explosion' },
  fire:                          { icon: 'alert',             color: '#DC2626', label: 'Fire' },
  electrical_incident:           { icon: 'flash',             color: '#EF4444', label: 'Electrical' },
  struck_by_object:              { icon: 'alert-circle',      color: '#DC2626', label: 'Struck' },
  repetitive_strain:             { icon: 'hand-right-outline',color: '#F59E0B', label: 'RSI' },
  stress_related:                { icon: 'alert-circle',      color: '#8B5CF6', label: 'Stress' },
  injury:                        { icon: 'bandage',           color: '#EF4444', label: 'Injury' },
  property_damage:               { icon: 'hammer',            color: '#8B5CF6', label: 'Property' },
  environmental:                 { icon: 'leaf',              color: '#10B981', label: 'Environmental' },
  other:                         { icon: 'help-circle',       color: '#94A3B8', label: 'Other' },
};

// Valid backend status values: reported | investigating | closed | follow_up
const STATUS_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  reported:      { icon: 'flag-outline',             color: '#3B82F6', label: 'Reported' },
  investigating: { icon: 'search-outline',           color: '#F59E0B', label: 'Investigating' },
  follow_up:     { icon: 'refresh-circle-outline',   color: '#8B5CF6', label: 'Follow-up' },
  closed:        { icon: 'checkmark-done-circle',    color: '#22C55E', label: 'Closed' },
  // Legacy / display-only aliases kept for backwards compatibility
  under_investigation:    { icon: 'search-outline',  color: '#F59E0B', label: 'Investigating' },
  investigation_complete: { icon: 'checkmark-circle', color: '#8B5CF6', label: 'Complete' },
};

const VALID_BACKEND_STATUSES = ['reported', 'investigating', 'follow_up', 'closed'] as const;
type BackendStatus = typeof VALID_BACKEND_STATUSES[number];

const FALLBACK_STATUS_CFG = { icon: 'help-circle-outline', color: '#94A3B8', label: 'Unknown' };
const FALLBACK_TYPE_CFG   = { icon: 'help-circle',         color: '#94A3B8', label: 'Other' };
const FALLBACK_SEV_CFG    = { color: '#94A3B8', label: '—' };

const SEVERITY_CONFIG: Record<string, { color: string; label: string }> = {
  '1': { color: '#22C55E', label: 'Negligible' },
  '2': { color: '#F59E0B', label: 'Minor' },
  '3': { color: '#EF4444', label: 'Moderate' },
  '4': { color: '#DC2626', label: 'Major' },
  '5': { color: '#8B0000', label: 'Catastrophic' },
  low:      { color: '#22C55E', label: 'Low' },
  medium:   { color: '#F59E0B', label: 'Medium' },
  high:     { color: '#EF4444', label: 'High' },
  critical: { color: '#DC2626', label: 'Critical' },
};

// ─── Sample Data ─────────────────────────────────────────────
const SAMPLE_INCIDENTS: Incident[] = [
  {
    id: 'i1', number: 'INC-2025-0342', date: '2025-02-20', time: '09:15:00',
    worker: 'Pierre Kabamba', workerId: 'w003', type: 'injury',
    severity: '3', status: 'investigating',
    description: 'Cut to left hand from sharp edge during equipment maintenance',
    location: 'Processing Building - Section C', department: 'Maintenance', lti: false,
  },
  {
    id: 'i2', number: 'INC-2025-0341', date: '2025-02-19', time: '14:30:00',
    worker: 'Robert Mbala', workerId: 'w004', type: 'near_miss',
    severity: '2', status: 'follow_up',
    description: 'Near miss: Equipment fell from shelf but did not hit worker',
    location: 'Storage Area - Building B', department: 'Warehouse',
    lti: false, rootCause: 'Improper securing of equipment',
  },
  {
    id: 'i3', number: 'INC-2025-0340', date: '2025-02-18', time: '11:00:00',
    worker: 'Marie Lusaka', workerId: 'w002', type: 'medical_treatment',
    severity: '2', status: 'closed',
    description: 'Eye irritation from dust exposure - first aid treatment provided',
    location: 'Main Shaft Extraction', department: 'Operations',
    lti: false, modifiedDate: '2025-02-20',
  },
  {
    id: 'i4', number: 'INC-2025-0339', date: '2025-02-17', time: '08:45:00',
    worker: 'Jean-Charles Mulinga', workerId: 'w001', type: 'fall_from_height',
    severity: '4', status: 'investigating',
    description: 'Slip and fall on wet surface, suspected broken ankle',
    location: 'Processing Area - Building A', department: 'Processing',
    lti: true, ltiDays: 5, capaDeadline: '2025-03-03',
  },
];

// ─── Sub-components ──────────────────────────────────────────
function StatusBadge({ status }: { status: Incident['status'] }) {
  const cfg = STATUS_CONFIG[status] ?? FALLBACK_STATUS_CFG;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.color + '18' }]}>
      <Ionicons name={cfg.icon as any} size={11} color={cfg.color} />
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function SeverityBadge({ severity }: { severity: Incident['severity'] }) {
  const cfg = SEVERITY_CONFIG[String(severity)] ?? FALLBACK_SEV_CFG;
  return (
    <View style={[styles.severityBadge, { backgroundColor: cfg.color }]}>
      <Text style={styles.severityText}>{cfg.label}</Text>
    </View>
  );
}

function MetricTile({ label, value, color }: { label: string; value: string | undefined; color: string }) {
  return (
    <View style={[styles.metricTile, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value ?? '—'}</Text>
    </View>
  );
}

// ─── Incident Card ───────────────────────────────────────────
function IncidentCard({ incident, onPress }: { incident: Incident; onPress: () => void }) {
  const typeCfg   = TYPE_CONFIG[incident.type]   ?? FALLBACK_TYPE_CFG;
  const statusCfg = STATUS_CONFIG[incident.status] ?? FALLBACK_STATUS_CFG;

  return (
    <TouchableOpacity
      style={[styles.incidentCard, styles.cardShadow, { borderLeftColor: statusCfg.color }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Top row */}
      <View style={styles.cardTop}>
        <View style={[styles.typeIconBox, { backgroundColor: typeCfg.color + '18' }]}>
          <Ionicons name={typeCfg.icon as any} size={20} color={typeCfg.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.incidentNumber}>{incident.number}</Text>
          <Text style={styles.incidentDate}>{incident.date} · {incident.time}</Text>
        </View>
        <View style={styles.badgeStack}>
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={incident.status} />
        </View>
      </View>

      {/* Meta row */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="person-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.metaText} numberOfLines={1}>{incident.worker}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.metaText} numberOfLines={1}>{incident.location}</Text>
        </View>
      </View>

      {/* Description */}
      <Text style={styles.description} numberOfLines={2}>{incident.description}</Text>

      {/* Alert pills */}
      {incident.lti && (
        <View style={styles.alertPill}>
          <Ionicons name="alert-circle" size={13} color="#DC2626" />
          <Text style={styles.alertPillText}>
            LTI — {incident.ltiDays} day{incident.ltiDays !== 1 ? 's' : ''} lost
          </Text>
        </View>
      )}
      {incident.capaDeadline && (
        <View style={[styles.alertPill, styles.alertPillAmber]}>
          <Ionicons name="calendar-outline" size={13} color="#D97706" />
          <Text style={[styles.alertPillText, { color: '#92400E' }]}>CAPA due {incident.capaDeadline}</Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View style={[styles.typeLabelPill, { backgroundColor: typeCfg.color + '12' }]}>
          <Ionicons name={typeCfg.icon as any} size={11} color={typeCfg.color} />
          <Text style={[styles.typeLabelText, { color: typeCfg.color }]}>{typeCfg.label}</Text>
        </View>
        <TouchableOpacity style={styles.footerBtn} onPress={onPress}>
          <Ionicons name="eye-outline" size={14} color={colors.primary} />
          <Text style={[styles.footerBtnText, { color: colors.primary }]}>View Details</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Detail Modal ────────────────────────────────────────────
function IncidentDetailModal({
  visible, incident, onClose, onUpdate, onDelete, isDesktop,
}: {
  visible: boolean;
  incident: Incident | null;
  onClose: () => void;
  onUpdate: (data: Incident) => void;
  onDelete: (incidentId: number) => void;
  isDesktop: boolean;
}) {
  const [formData, setFormData] = useState<Incident | null>(incident);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  React.useEffect(() => { setFormData(incident); setIsEditing(false); }, [incident, visible]);
  if (!formData) return null;

  const typeCfg   = TYPE_CONFIG[formData.type]     ?? FALLBACK_TYPE_CFG;
  const statusCfg = STATUS_CONFIG[formData.status] ?? FALLBACK_STATUS_CFG;
  const sevCfg    = SEVERITY_CONFIG[String(formData.severity)] ?? FALLBACK_SEV_CFG;

  const handleSaveChanges = () => {
    if (!formData.description?.trim() || !formData.location?.trim()) {
      Alert.alert('Validation Error', 'Description and Location are required');
      return;
    }
    if ((formData.ltiDays ?? 0) < 0) {
      Alert.alert('Validation Error', 'Work days lost cannot be negative');
      return;
    }
    onUpdate(formData);
    onClose();
    setIsEditing(false);
  };

  const handleConfirmDelete = () => {
    Alert.alert('Delete Incident', 'Are you sure you want to delete this incident? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { onDelete(formData.backendId!); onClose(); } },
    ]);
  };

  const handleAddAttachment = async () => {
    if (!formData.backendId) {
      Alert.alert('Error', 'This incident must be saved before adding attachments');
      return;
    }
    Alert.alert(
      'Add Evidence',
      'Choose how to add photo or video:',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Camera access is required to take photos');
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
              });
              if (!result.canceled && formData.backendId) {
                await uploadAttachment(result.assets[0], 'image');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to access camera');
            }
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Gallery access is required to select photos');
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
              });
              if (!result.canceled && formData.backendId) {
                await uploadAttachment(result.assets[0], 'image');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to access gallery');
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const uploadAttachment = async (asset: any, attachmentType: 'image' | 'video') => {
    if (!formData.backendId) return;
    try {
      setUploadingAttachment(true);
      // Convert asset to proper format for FormData
      const filename = asset.uri.split('/').pop() || `${attachmentType}-${Date.now()}.jpg`;
      const fileObject = {
        uri: asset.uri,
        name: filename,
        type: asset.mimeType || (attachmentType === 'image' ? 'image/jpeg' : 'video/mp4'),
      };
      const result = await OccHealthApiService.getInstance().uploadIncidentAttachment(
        formData.backendId,
        fileObject,
        attachmentType,
        ''
      );
      if (result.data) {
        setFormData({
          ...formData,
          attachments: [...(formData.attachments || []), result.data],
        });
        Alert.alert('Success', 'Evidence uploaded successfully');
      } else {
        Alert.alert('Error', result.error || 'Failed to upload evidence');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload evidence');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    Alert.alert('Delete Evidence', 'Remove this photo/video?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const result = await OccHealthApiService.getInstance().deleteIncidentAttachment(attachmentId);
            if (result.success) {
              // Remove from local state
              if (formData.attachments) {
                setFormData({
                  ...formData,
                  attachments: formData.attachments.filter(a => a.id !== attachmentId),
                });
              }
              Alert.alert('Success', 'Evidence removed');
            } else {
              Alert.alert('Error', result.error || 'Failed to delete evidence');
            }
          } catch (error) {
            Alert.alert('Error', 'Failed to delete evidence');
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType={isDesktop ? 'fade' : 'slide'}>
      <View style={[styles.modalOverlay, isDesktop && styles.modalOverlayDesktop]}>
        <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>

          {/* Header */}
          <View style={[styles.modalHeader, { borderTopColor: statusCfg.color, borderTopWidth: 4 }]}>
            {/* Worker Avatar (Left) */}
            <View style={[styles.workerAvatarLarge, { backgroundColor: typeCfg.color + '20' }]}>
              <Text style={[styles.workerAvatarTextLarge, { color: typeCfg.color }]}>
                {formData.worker ? formData.worker.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
            
            {/* Header Info (Center) */}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.modalTitle}>{formData.number}</Text>
              <Text style={styles.modalWorkerName}>{formData.worker}</Text>
              <Text style={styles.modalSubtitle}>
                {formData.date} · {formData.time} · {formData.department}
              </Text>
            </View>
            
            {/* Close Button (Right) */}
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>

            {/* Quick Info Strip */}
            <View style={styles.quickInfoStrip}>
              <View style={styles.quickInfoItem}>
                <View style={[styles.quickInfoIcon, { backgroundColor: typeCfg.color + '20' }]}>
                  <Ionicons name={typeCfg.icon as any} size={16} color={typeCfg.color} />
                </View>
                <Text style={styles.quickInfoLabel}>Type</Text>
                <Text style={[styles.quickInfoValue, { color: typeCfg.color }]}>{typeCfg.label}</Text>
              </View>
              <View style={styles.quickInfoItem}>
                <View style={[styles.quickInfoIcon, { backgroundColor: sevCfg.color + '20' }]}>
                  <Ionicons name="alert-circle" size={16} color={sevCfg.color} />
                </View>
                <Text style={styles.quickInfoLabel}>Severity</Text>
                <Text style={[styles.quickInfoValue, { color: sevCfg.color }]}>{sevCfg.label}</Text>
              </View>
              <View style={styles.quickInfoItem}>
                <View style={[styles.quickInfoIcon, { backgroundColor: statusCfg.color + '20' }]}>
                  <Ionicons name={statusCfg.icon as any} size={16} color={statusCfg.color} />
                </View>
                <Text style={styles.quickInfoLabel}>Status</Text>
                <Text style={[styles.quickInfoValue, { color: statusCfg.color }]}>{statusCfg.label}</Text>
              </View>
            </View>

            {/* Metrics grid */}
            <View style={styles.metricsGrid}>
              <MetricTile label="Type"     value={typeCfg.label}   color={typeCfg.color} />
              <MetricTile label="Severity" value={sevCfg.label}    color={sevCfg.color} />
              <MetricTile label="Status"   value={statusCfg.label} color={statusCfg.color} />
              <MetricTile label="Dept."    value={formData.department} color={colors.primary} />
            </View>

            {/* Description */}
            <View style={styles.modalSection}>
              <View style={styles.modalSectionHeader}>
                <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                <Text style={styles.modalSectionTitle}>Description</Text>
              </View>
              {isEditing ? (
                <TextInput
                  style={[styles.editableField, styles.multilineInput]}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  placeholder="Enter incident description"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={4}
                />
              ) : (
                <Text style={styles.modalBodyText}>{formData.description}</Text>
              )}
            </View>

            {/* Location */}
            <View style={styles.modalSection}>
              <View style={styles.modalSectionHeader}>
                <Ionicons name="location-outline" size={16} color={colors.primary} />
                <Text style={styles.modalSectionTitle}>Location</Text>
              </View>
              {isEditing ? (
                <TextInput
                  style={styles.editableField}
                  value={formData.location}
                  onChangeText={(text) => setFormData({ ...formData, location: text })}
                  placeholder="Enter incident location"
                  placeholderTextColor={colors.textSecondary}
                />
              ) : (
                <Text style={styles.modalBodyText}>{formData.location}</Text>
              )}
            </View>

            {/* Worker */}
            <View style={[styles.modalSection, styles.cardShadow]}>
              <View style={styles.modalSectionHeader}>
                <Ionicons name="person-outline" size={16} color={colors.primary} />
                <Text style={styles.modalSectionTitle}>Affected Worker</Text>
              </View>
              <View style={styles.workerInfoCard}>
                <View style={styles.workerInfoRow}>
                  <View style={styles.workerInfoRowLeft}>
                    <Ionicons name="person" size={14} color={colors.textSecondary} />
                    <Text style={styles.workerInfoLabel}>Full Name</Text>
                  </View>
                  <Text style={styles.workerInfoValue}>{formData.worker}</Text>
                </View>
                <View style={[styles.workerInfoRow, { borderTopWidth: 1, borderTopColor: colors.outline, paddingTop: spacing.sm }]}>
                  <View style={styles.workerInfoRowLeft}>
                    <Ionicons name="barcode" size={14} color={colors.textSecondary} />
                    <Text style={styles.workerInfoLabel}>Worker ID</Text>
                  </View>
                  <Text style={styles.workerInfoValue}>{formData.workerId || 'N/A'}</Text>
                </View>
              </View>
            </View>

            {/* LTI */}
            {formData.lti && (
              <View style={styles.ltiBanner}>
                <View style={styles.ltiBannerTitle}>
                  <Ionicons name="alert-circle" size={18} color="#DC2626" />
                  <Text style={styles.ltiBannerHeading}>Lost Time Injury (LTI)</Text>
                </View>
                <Text style={styles.ltiBannerText}>
                  Reportable LTI — {formData.ltiDays} day{formData.ltiDays !== 1 ? 's' : ''} recorded
                </Text>
              </View>
            )}

            {/* Investigation & Status */}
            <View style={styles.modalSection}>
              <View style={styles.modalSectionHeader}>
                <Ionicons name="search-outline" size={16} color={colors.primary} />
                <Text style={styles.modalSectionTitle}>Investigation</Text>
              </View>
              {isEditing ? (
                <>
                  <Text style={[styles.infoTableLabel, { marginBottom: spacing.xs }]}>Root Cause Analysis</Text>
                  <TextInput
                    style={[styles.editableField, styles.multilineInput]}
                    value={formData.rootCause || ''}
                    onChangeText={(text) => setFormData({ ...formData, rootCause: text })}
                    placeholder="Enter root cause analysis"
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    numberOfLines={3}
                  />
                  <Text style={[styles.infoTableLabel, { marginTop: spacing.md, marginBottom: spacing.xs }]}>Work Days Lost</Text>
                  <TextInput
                    style={styles.editableField}
                    value={String(formData.ltiDays || 0)}
                    onChangeText={(text) => {
                      const n = parseInt(text) || 0;
                      setFormData({ ...formData, ltiDays: n < 0 ? 0 : n });
                    }}
                    placeholder="Number of days lost"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </>
              ) : (
                <>
                  {formData.rootCause ? (
                    <View style={styles.rootCauseBox}>
                      <Text style={styles.infoTableLabel}>Root Cause</Text>
                      <Text style={styles.modalBodyText}>{formData.rootCause}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.modalBodyText, { color: colors.textSecondary, fontStyle: 'italic' }]}>No root cause analysis yet</Text>
                  )}
                  {formData.capaDeadline && (
                    <View style={styles.capaBanner}>
                      <Ionicons name="calendar-outline" size={15} color="#D97706" />
                      <Text style={styles.capaBannerText}>CAPA Deadline: {formData.capaDeadline}</Text>
                    </View>
                  )}
                </>
              )}
              <Text style={[styles.infoTableLabel, { marginTop: spacing.md }]}>Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
                {(VALID_BACKEND_STATUSES as readonly string[]).map((st) => {
                  const cfg = STATUS_CONFIG[st] ?? FALLBACK_STATUS_CFG;
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.statusChip,
                        formData.status === st && { backgroundColor: cfg.color + '20', borderColor: cfg.color },
                        !isEditing && { opacity: 0.6 },
                      ]}
                      onPress={() => isEditing && setFormData({ ...formData, status: st })}
                      disabled={!isEditing}
                    >
                      <Ionicons name={cfg.icon as any} size={13} color={formData.status === st ? cfg.color : colors.textSecondary} />
                      <Text style={[styles.statusChipText, formData.status === st && { color: cfg.color, fontWeight: '600' }]}>
                        {cfg.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Immediate Actions */}
            <View style={styles.modalSection}>
              <View style={styles.modalSectionHeader}>
                <Ionicons name="flash-outline" size={16} color={colors.primary} />
                <Text style={styles.modalSectionTitle}>Immediate Actions</Text>
              </View>
              {isEditing ? (
                <TextInput
                  style={[styles.editableField, styles.multilineInput]}
                  value={formData.immediateActions || ''}
                  onChangeText={(text) => setFormData({ ...formData, immediateActions: text })}
                  placeholder="What immediate actions were taken?"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              ) : (
                <Text style={styles.modalBodyText}>{formData.immediateActions || '—'}</Text>
              )}
            </View>

            {/* Equipment */}
            <View style={styles.modalSection}>
              <View style={styles.modalSectionHeader}>
                <Ionicons name="construct-outline" size={16} color={colors.primary} />
                <Text style={styles.modalSectionTitle}>Equipment Involved</Text>
              </View>
              {isEditing ? (
                <TextInput
                  style={styles.editableField}
                  value={formData.equipmentInvolved || ''}
                  onChangeText={(text) => setFormData({ ...formData, equipmentInvolved: text })}
                  placeholder="Any equipment or machinery involved?"
                  placeholderTextColor={colors.textSecondary}
                />
              ) : (
                <Text style={styles.modalBodyText}>{formData.equipmentInvolved || '—'}</Text>
              )}
            </View>

            {/* First Aid & Medical */}
            <View style={styles.modalSection}>
              <View style={styles.modalSectionHeader}>
                <Ionicons name="medkit-outline" size={16} color={colors.primary} />
                <Text style={styles.modalSectionTitle}>Medical Response</Text>
              </View>
              <View style={styles.infoTable}>
                {/* First Aid Toggle */}
                <View style={styles.infoTableRow}>
                  <Text style={styles.infoTableLabel}>First Aid Given</Text>
                  {isEditing ? (
                    <TouchableOpacity
                      style={[styles.toggleBtn, { backgroundColor: formData.firstAidGiven ? '#22C55E20' : colors.surfaceVariant, borderColor: formData.firstAidGiven ? '#22C55E' : colors.outline }]}
                      onPress={() => setFormData({ ...formData, firstAidGiven: !formData.firstAidGiven })}
                    >
                      <Ionicons name={formData.firstAidGiven ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={formData.firstAidGiven ? '#22C55E' : colors.textSecondary} />
                      <Text style={[styles.toggleBtnText, { color: formData.firstAidGiven ? '#22C55E' : colors.textSecondary }]}>{formData.firstAidGiven ? 'Yes' : 'No'}</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.infoTableValue}>{formData.firstAidGiven ? 'Yes' : 'No'}</Text>
                  )}
                </View>
                {formData.firstAidGiven && (
                  <View style={[styles.infoTableRow, { flexDirection: 'column', alignItems: 'flex-start', gap: 4 }]}>
                    <Text style={styles.infoTableLabel}>First Aid By</Text>
                    {isEditing ? (
                      <TextInput
                        style={[styles.editableField, { marginTop: 4, width: '100%' }]}
                        value={formData.firstAidBy || ''}
                        onChangeText={(text) => setFormData({ ...formData, firstAidBy: text })}
                        placeholder="Name of first aid provider"
                        placeholderTextColor={colors.textSecondary}
                      />
                    ) : (
                      <Text style={styles.infoTableValue}>{formData.firstAidBy || '—'}</Text>
                    )}
                  </View>
                )}
                {/* Medical Treatment Toggle */}
                <View style={styles.infoTableRow}>
                  <Text style={styles.infoTableLabel}>Medical Treatment Required</Text>
                  {isEditing ? (
                    <TouchableOpacity
                      style={[styles.toggleBtn, { backgroundColor: formData.medicalTreatmentRequired ? '#3B82F620' : colors.surfaceVariant, borderColor: formData.medicalTreatmentRequired ? '#3B82F6' : colors.outline }]}
                      onPress={() => setFormData({ ...formData, medicalTreatmentRequired: !formData.medicalTreatmentRequired })}
                    >
                      <Ionicons name={formData.medicalTreatmentRequired ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={formData.medicalTreatmentRequired ? '#3B82F6' : colors.textSecondary} />
                      <Text style={[styles.toggleBtnText, { color: formData.medicalTreatmentRequired ? '#3B82F6' : colors.textSecondary }]}>{formData.medicalTreatmentRequired ? 'Yes' : 'No'}</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.infoTableValue}>{formData.medicalTreatmentRequired ? 'Yes' : 'No'}</Text>
                  )}
                </View>
                {formData.medicalTreatmentRequired && (
                  <View style={[styles.infoTableRow, { flexDirection: 'column', alignItems: 'flex-start', gap: 4, borderBottomWidth: 0 }]}>
                    <Text style={styles.infoTableLabel}>Hospital / Clinic</Text>
                    {isEditing ? (
                      <TextInput
                        style={[styles.editableField, { marginTop: 4, width: '100%' }]}
                        value={formData.hospitalName || ''}
                        onChangeText={(text) => setFormData({ ...formData, hospitalName: text })}
                        placeholder="Hospital or clinic name"
                        placeholderTextColor={colors.textSecondary}
                      />
                    ) : (
                      <Text style={styles.infoTableValue}>{formData.hospitalName || '—'}</Text>
                    )}
                  </View>
                )}
              </View>
            </View>

            {/* Corrective Actions */}
            <View style={styles.modalSection}>
              <View style={styles.modalSectionHeader}>
                <Ionicons name="checkmark-done-outline" size={16} color={colors.primary} />
                <Text style={styles.modalSectionTitle}>Corrective Actions Planned</Text>
              </View>
              {isEditing ? (
                <TextInput
                  style={[styles.editableField, styles.multilineInput]}
                  value={formData.correctiveActionsPlanned || ''}
                  onChangeText={(text) => setFormData({ ...formData, correctiveActionsPlanned: text })}
                  placeholder="Describe planned corrective actions..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              ) : (
                <Text style={styles.modalBodyText}>{formData.correctiveActionsPlanned || '—'}</Text>
              )}
            </View>

            {/* Regulatory Compliance */}
            <View style={styles.modalSection}>
              <View style={styles.modalSectionHeader}>
                <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
                <Text style={styles.modalSectionTitle}>Regulatory Reporting</Text>
              </View>
              <View style={styles.infoTable}>
                {[
                  { key: 'reportableToAuthorities', label: 'Reportable to Authorities' },
                  { key: 'reportedToCnss', label: 'Reported to CNSS' },
                  { key: 'reportedToLabourInspection', label: 'Reported to Labour Inspection' },
                ].map(({ key, label }) => (
                  <View key={key} style={styles.infoTableRow}>
                    <Text style={styles.infoTableLabel}>{label}</Text>
                    {isEditing ? (
                      <TouchableOpacity
                        style={[styles.toggleBtn, { backgroundColor: (formData as any)[key] ? '#8B5CF620' : colors.surfaceVariant, borderColor: (formData as any)[key] ? '#8B5CF6' : colors.outline }]}
                        onPress={() => setFormData({ ...formData, [key]: !(formData as any)[key] })}
                      >
                        <Ionicons name={(formData as any)[key] ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={(formData as any)[key] ? '#8B5CF6' : colors.textSecondary} />
                        <Text style={[styles.toggleBtnText, { color: (formData as any)[key] ? '#8B5CF6' : colors.textSecondary }]}>{(formData as any)[key] ? 'Yes' : 'No'}</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.infoTableValue}>{(formData as any)[key] ? 'Yes' : 'No'}</Text>
                    )}
                  </View>
                ))}
              </View>
            </View>

            {/* Audit Trail */}
            <View style={[styles.modalSection]}>
              <View style={styles.modalSectionHeader}>
                <Ionicons name="time-outline" size={16} color={colors.primary} />
                <Text style={styles.modalSectionTitle}>Audit Trail</Text>
              </View>
              <View style={styles.infoTable}>
                <View style={styles.infoTableRow}>
                  <Text style={styles.infoTableLabel}>Reported</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.infoTableValue}>{formData.date} {formData.time}</Text>
                    {formData.reportedByName ? <Text style={[styles.infoTableLabel, { marginTop: 2 }]}>{formData.reportedByName}</Text> : null}
                  </View>
                </View>
                {formData.modifiedDate || formData.updatedByName ? (
                  <View style={styles.infoTableRow}>
                    <Text style={styles.infoTableLabel}>Last Updated</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.infoTableValue}>{formData.modifiedDate || '—'}</Text>
                      {formData.updatedByName ? <Text style={[styles.infoTableLabel, { marginTop: 2 }]}>{formData.updatedByName}</Text> : null}
                    </View>
                  </View>
                ) : null}
                {formData.closedAt ? (
                  <View style={[styles.infoTableRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.infoTableLabel}>Closed</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.infoTableValue}>{new Date(formData.closedAt).toLocaleDateString()}</Text>
                      {formData.closedByName ? <Text style={[styles.infoTableLabel, { marginTop: 2 }]}>{formData.closedByName}</Text> : null}
                    </View>
                  </View>
                ) : null}
              </View>
              {/* Status History */}
              {formData.statusHistory && formData.statusHistory.length > 1 && (
                <View style={{ marginTop: spacing.md }}>
                  <Text style={[styles.infoTableLabel, { marginBottom: spacing.sm }]}>Status History</Text>
                  {formData.statusHistory.map((entry, idx) => {
                    const cfg = STATUS_CONFIG[entry.status] ?? FALLBACK_STATUS_CFG;
                    return (
                      <View key={idx} style={styles.historyEntry}>
                        <View style={[styles.historyDot, { backgroundColor: cfg.color }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.historyStatus, { color: cfg.color }]}>{cfg.label}</Text>
                          <Text style={styles.historyMeta}>
                            {entry.changed_by_name} · {new Date(entry.changed_at).toLocaleDateString()}
                          </Text>
                          {entry.note ? <Text style={styles.historyNote}>{entry.note}</Text> : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Attachments */}
            <View style={styles.modalSection}>
              <View style={styles.modalSectionHeader}>
                <Ionicons name="image-outline" size={16} color={colors.primary} />
                <Text style={styles.modalSectionTitle}>Evidence (Photos/Videos)</Text>
              </View>
              {formData.attachments && formData.attachments.length > 0 ? (
                <View style={{ marginBottom: spacing.md }}>
                  {formData.attachments.map((attachment) => (
                    <View key={attachment.id} style={[styles.attachmentItem, styles.cardShadow]}>
                      <View style={styles.attachmentHeader}>
                        <Ionicons 
                          name={attachment.attachment_type === 'image' ? 'image' : 'videocam'} 
                          size={18} 
                          color={attachment.attachment_type === 'image' ? '#3B82F6' : '#EF4444'} 
                        />
                        <Text style={styles.attachmentType}>
                          {attachment.attachment_type === 'image' ? 'Photo' : 'Video'} ({attachment.file_size_mb} MB)
                        </Text>
                      </View>
                      {attachment.description && (
                        <Text style={styles.attachmentDescription}>{attachment.description}</Text>
                      )}
                      <View style={styles.attachmentMeta}>
                        <Text style={styles.attachmentMeta_text}>{attachment.uploaded_by_name}</Text>
                        <Text style={styles.attachmentMeta_text}>{attachment.uploaded_at?.split('T')[0]}</Text>
                      </View>
                      {isEditing && (
                        <TouchableOpacity 
                          style={styles.attachmentDeleteBtn}
                          onPress={() => handleDeleteAttachment(attachment.id)}
                        >
                          <Ionicons name="close-circle" size={18} color="#EF4444" />
                          <Text style={styles.attachmentDeleteBtnText}>Remove</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.infoTableLabel, { color: colors.textSecondary, fontStyle: 'italic' }]}>
                  No evidence attached yet
                </Text>
              )}
              {isEditing && (
                <TouchableOpacity 
                  style={[styles.attachmentButton, { marginTop: spacing.md }]}
                  onPress={handleAddAttachment}
                >
                  <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                  <Text style={styles.attachmentButtonText}>Add Photo/Video</Text>
                </TouchableOpacity>
              )}
              {!isEditing && (
                <TouchableOpacity
                  style={[styles.attachmentButton, { marginTop: spacing.md }]}
                  onPress={handleAddAttachment}
                  disabled={uploadingAttachment}
                >
                  {uploadingAttachment
                    ? <ActivityIndicator size="small" color={colors.primary} />
                    : <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                  }
                  <Text style={styles.attachmentButtonText}>
                    {uploadingAttachment ? 'Uploading...' : 'Add Photo/Video'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setIsEditing(false); onClose(); }}>
              <Text style={styles.cancelBtnText}>{isEditing ? 'Cancel' : 'Close'}</Text>
            </TouchableOpacity>
            {isEditing ? (
              <>
                <TouchableOpacity style={[styles.deleteBtn]} onPress={handleConfirmDelete}>
                  <Ionicons name="trash" size={16} color="#FFF" />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveChanges}>
                  <Ionicons name="checkmark" size={16} color="#FFF" />
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.saveBtn} onPress={() => setIsEditing(true)}>
                <Ionicons name="pencil" size={16} color="#FFF" />
                <Text style={styles.saveBtnText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Create Incident Modal ───────────────────────────────────
function CreateIncidentModal({
  visible, onClose, onCreate, isLoading, isDesktop,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (data: any) => Promise<void>;
  isLoading: boolean;
  isDesktop: boolean;
}) {
  const { toastMsg, showToast } = useSimpleToast();
  const [formData, setFormData] = useState({
    type: 'lost_time_injury',
    date: new Date().toISOString().split('T')[0],
    time: '09:00:00',
    description: '',
    location: '',
    rootCause: '',
    severity: 1,
    ltiDays: 0,
    immediateActions: '',
    injured_worker_id: null as number | null,
    injured_worker_name: '',
    equipmentInvolved: '',
    firstAidGiven: false,
    firstAidBy: '',
    medicalTreatmentRequired: false,
    hospitalName: '',
    correctiveActionsPlanned: '',
    reportableToAuthorities: false,
    reportedToCnss: false,
    reportedToLabourInspection: false,
  });

  const [pendingAttachments, setPendingAttachments] = useState<Array<{
    uri: string;
    attachmentType: 'image' | 'video';
    mimeType?: string;
    name: string;
  }>>([]);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setFormData({
        type: 'lost_time_injury',
        date: new Date().toISOString().split('T')[0],
        time: '09:00:00',
        description: '',
        location: '',
        rootCause: '',
        severity: 1,
        ltiDays: 0,
        immediateActions: '',
        injured_worker_id: null,
        injured_worker_name: '',
        equipmentInvolved: '',
        firstAidGiven: false,
        firstAidBy: '',
        medicalTreatmentRequired: false,
        hospitalName: '',
        correctiveActionsPlanned: '',
        reportableToAuthorities: false,
        reportedToCnss: false,
        reportedToLabourInspection: false,
      });
      setPendingAttachments([]);
      setWorkerSearchText('');
      setShowWorkerDropdown(false);
    }
  }, [visible]);

  const [workers, setWorkers] = useState<any[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [workerSearchText, setWorkerSearchText] = useState('');
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);

  // Load workers when modal opens or search text changes
  useEffect(() => {
    if (visible && (!workers.length || workerSearchText)) {
      loadWorkers(workerSearchText);
    }
  }, [visible, workerSearchText]);

  const loadWorkers = useCallback(async (searchQuery: string = '') => {
    try {
      setLoadingWorkers(true);
      const response = await OccHealthApiService.getInstance().listWorkers({ 
        search: searchQuery,
        page_size: 100 
      });
      if (response.data && Array.isArray(response.data)) {
        setWorkers(response.data);
      }
    } catch (error) {
      console.error('Error loading workers:', error);
      showToast('Failed to load workers', 'error');
    } finally {
      setLoadingWorkers(false);
    }
  }, [showToast]);

  const handleSelectWorker = (worker: any) => {
    const fullName = `${worker.firstName || ''} ${worker.lastName || ''}`.trim();
    setFormData({ 
      ...formData, 
      injured_worker_id: worker.id, 
      injured_worker_name: fullName
    });
    setShowWorkerDropdown(false);
    setWorkerSearchText('');
    showToast(`${fullName} selected`, 'success');
  };

  const handleClearWorker = () => {
    setFormData({ 
      ...formData, 
      injured_worker_id: null, 
      injured_worker_name: '' 
    });
    setWorkerSearchText('');
    showToast('Worker cleared');
  };

  const filteredWorkers = useMemo(() => {
    if (!workerSearchText) return workers;
    const query = workerSearchText.toLowerCase();
    return workers.filter(w => {
      const fullName = `${w.firstName || ''} ${w.lastName || ''}`.toLowerCase();
      return fullName.includes(query) || String(w.id).includes(query);
    });
  }, [workers, workerSearchText]);
  const handlePickAttachment = () => {
    Alert.alert('Add Evidence', 'Choose how to add photo or video:', [
      {
        text: 'Take Photo',
        onPress: async () => {
          try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') { Alert.alert('Permission Denied', 'Camera access required'); return; }
            const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
            if (!result.canceled) {
              const asset = result.assets[0];
              const name = asset.uri.split('/').pop() || `photo-${Date.now()}.jpg`;
              setPendingAttachments(prev => [...prev, { uri: asset.uri, attachmentType: 'image', mimeType: asset.mimeType || 'image/jpeg', name }]);
            }
          } catch { Alert.alert('Error', 'Failed to access camera'); }
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: async () => {
          try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') { Alert.alert('Permission Denied', 'Gallery access required'); return; }
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.8 });
            if (!result.canceled) {
              const asset = result.assets[0];
              const isVideo = asset.type === 'video' || asset.mimeType?.startsWith('video/');
              const name = asset.uri.split('/').pop() || `file-${Date.now()}`;
              setPendingAttachments(prev => [...prev, { uri: asset.uri, attachmentType: isVideo ? 'video' : 'image', mimeType: asset.mimeType || 'image/jpeg', name }]);
            }
          } catch { Alert.alert('Error', 'Failed to access gallery'); }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleRemovePendingAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!formData.description?.trim() || !formData.location?.trim() || !formData.type || !formData.date || !formData.immediateActions?.trim()) {
      showToast('Please fill in all required fields (Type, Date, Location, Description, Immediate Actions)', 'error');
      return;
    }
    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.date)) {
      showToast('Date must be in YYYY-MM-DD format (e.g. 2026-03-04)', 'error');
      return;
    }
    // Validate time format HH:MM or HH:MM:SS
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(formData.time)) {
      showToast('Time must be in HH:MM:SS format (e.g. 09:30:00)', 'error');
      return;
    }
    // Ensure time is always HH:MM:SS
    const normalizedTime = formData.time.length === 5 ? `${formData.time}:00` : formData.time;
    await onCreate({ ...formData, time: normalizedTime, pendingAttachments });
  };

  const isFormValid = formData.description && formData.location && formData.type && formData.date && formData.immediateActions;

  return (
    <>
      <Modal visible={visible} transparent animationType={isDesktop ? 'fade' : 'slide'}>
        <View style={[styles.modalOverlay, isDesktop && styles.modalOverlayDesktop]}>
          <View style={[styles.modalContent, isDesktop && { ...styles.modalContentDesktop, width: '65%', maxWidth: 800, maxHeight: '92%' }]}>

            {/* Header */}
            <View style={[styles.modalHeader, { borderTopColor: colors.primary, borderTopWidth: 4 }]}>
              <Text style={styles.modalTitle}>Report New Incident</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>

              {/* Incident Type */}
              <View style={styles.modalSection}>
                <Text style={styles.infoTableLabel}>Incident Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
                  {(Object.entries(TYPE_CONFIG) as [string, typeof TYPE_CONFIG[string]][])
                    .map(([type, cfg]) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.statusChip,
                          formData.type === type && { backgroundColor: cfg.color + '20', borderColor: cfg.color },
                        ]}
                        onPress={() => setFormData({ ...formData, type })}
                      >
                        <Ionicons name={cfg.icon as any} size={13} color={formData.type === type ? cfg.color : colors.textSecondary} />
                        <Text style={[styles.statusChipText, formData.type === type && { color: cfg.color, fontWeight: '600' }]}>
                          {cfg.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </View>

              {/* Date */}
              <View style={styles.modalSection}>
                <Text style={styles.infoTableLabel}>Date of Incident</Text>
                <TextInput
                  style={styles.editableField}
                  value={formData.date}
                  onChangeText={(text) => setFormData({ ...formData, date: text })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Time */}
              <View style={styles.modalSection}>
                <Text style={styles.infoTableLabel}>Time</Text>
                <TextInput
                  style={styles.editableField}
                  value={formData.time}
                  onChangeText={(text) => setFormData({ ...formData, time: text })}
                  placeholder="HH:MM:SS"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Location */}
              <View style={styles.modalSection}>
                <Text style={styles.infoTableLabel}>Location *</Text>
                <TextInput
                  style={styles.editableField}
                  value={formData.location}
                  onChangeText={(text) => setFormData({ ...formData, location: text })}
                  placeholder="Where did the incident occur?"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Description */}
              <View style={styles.modalSection}>
                <Text style={styles.infoTableLabel}>Description *</Text>
                <TextInput
                  style={[styles.editableField, styles.multilineInput]}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  placeholder="Describe what happened..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Severity */}
              <View style={styles.modalSection}>
                <Text style={styles.infoTableLabel}>Severity</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
                  {(['1', '2', '3', '4', '5']).map((level) => {
                    const cfg = SEVERITY_CONFIG[level as any];
                    return (
                      <TouchableOpacity
                        key={level}
                        style={[
                          styles.statusChip,
                          String(formData.severity) === level && { backgroundColor: cfg.color + '20', borderColor: cfg.color },
                        ]}
                        onPress={() => setFormData({ ...formData, severity: parseInt(level) })}
                      >
                        <Text style={[styles.statusChipText, String(formData.severity) === level && { color: cfg.color, fontWeight: '600' }]}>
                          {cfg.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Root Cause (optional) */}
              <View style={styles.modalSection}>
                <Text style={[styles.infoTableLabel, { opacity: 0.7 }]}>Root Cause (Optional)</Text>
                <TextInput
                  style={[styles.editableField, styles.multilineInput]}
                  value={formData.rootCause}
                  onChangeText={(text) => setFormData({ ...formData, rootCause: text })}
                  placeholder="Initial assessment of root cause..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Immediate Actions */}
              <View style={styles.modalSection}>
                <Text style={styles.infoTableLabel}>Immediate Actions Taken *</Text>
                <TextInput
                  style={[styles.editableField, styles.multilineInput]}
                  value={formData.immediateActions}
                  onChangeText={(text) => setFormData({ ...formData, immediateActions: text })}
                  placeholder="What immediate actions were taken?"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Injured Worker Selection - IMPROVED */}
              <View style={styles.modalSection}>
                <View style={styles.workerSectionHeader}>
                  <Ionicons name="person-circle-outline" size={18} color={colors.primary} />
                  <Text style={styles.infoTableLabel}>Injured Worker (Optional)</Text>
                </View>
                
                {/* Selected Worker Display */}
                {formData.injured_worker_id ? (
                  <View style={[styles.workerSelectedCard, styles.cardShadow]}>
                    <View style={styles.workerSelectedLeft}>
                      <View style={[styles.workerAvatar, { backgroundColor: colors.primary + '20' }]}>
                        <Ionicons name="person" size={16} color={colors.primary} />
                      </View>
                      <View style={styles.workerSelectedInfo}>
                        <Text style={styles.workerSelectedName}>{formData.injured_worker_name}</Text>
                        <Text style={styles.workerSelectedId}>Worker ID: {formData.injured_worker_id}</Text>
                      </View>
                    </View>
                    <TouchableOpacity 
                      style={styles.workerClearBtn}
                      onPress={handleClearWorker}
                    >
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    {/* Search Input */}
                    <View style={[styles.workerSearchBox, showWorkerDropdown && { borderColor: colors.primary, borderWidth: 2 }]}>
                      <Ionicons name="search" size={16} color={colors.textSecondary} />
                      <TextInput
                        style={styles.workerSearchInput}
                        placeholder="Search by name or worker ID..."
                        placeholderTextColor={colors.textSecondary}
                        value={workerSearchText}
                        onChangeText={setWorkerSearchText}
                        onFocus={() => setShowWorkerDropdown(true)}
                        editable={!isLoading}
                      />
                      {workerSearchText ? (
                        <TouchableOpacity onPress={() => setWorkerSearchText('')}>
                          <Ionicons name="close-outline" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    {/* Dropdown List */}
                    {showWorkerDropdown && (
                      <View style={[styles.workerDropdown, styles.cardShadow]}>
                        {loadingWorkers ? (
                          <View style={styles.workerDropdownLoading}>
                            <ActivityIndicator size="small" color={colors.primary} />
                            <Text style={styles.workerDropdownLoadingText}>Loading workers...</Text>
                          </View>
                        ) : filteredWorkers.length > 0 ? (
                          <FlatList
                            scrollEnabled
                            data={filteredWorkers}
                            keyExtractor={(item) => String(item.id)}
                            renderItem={({ item }) => (
                              <TouchableOpacity
                                style={styles.workerDropdownItem}
                                onPress={() => handleSelectWorker(item)}
                              >
                                <View style={[styles.workerItemAvatar, { backgroundColor: colors.primary + '15' }]}>
                                  <Text style={styles.workerItemAvatarText}>
                                    {((item.firstName || item.lastName || '?').charAt(0)).toUpperCase()}
                                  </Text>
                                </View>
                                <View style={styles.workerItemInfo}>
                                  <Text style={styles.workerItemName}>{`${item.firstName || ''} ${item.lastName || ''}`.trim()}</Text>
                                  <Text style={styles.workerItemId}>Worker ID: {item.id}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                              </TouchableOpacity>
                            )}
                            nestedScrollEnabled
                            maxToRenderPerBatch={10}
                            initialNumToRender={10}
                            style={{ maxHeight: 300 }}
                          />
                        ) : (
                          <View style={styles.workerDropdownEmpty}>
                            <Ionicons name="people-outline" size={24} color={colors.textSecondary} />
                            <Text style={styles.workerDropdownEmptyText}>
                              {workerSearchText ? 'No workers found' : 'No workers available'}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </>
                )}
                <Text style={styles.workerHelperText}>
                  <Ionicons name="information-circle" size={12} color={colors.textSecondary} /> 
                  {' '}Optional: Link affected worker to improve incident tracking
                </Text>
              </View>

              {/* Equipment Involved */}
              <View style={styles.modalSection}>
                <Text style={styles.infoTableLabel}>Equipment Involved (Optional)</Text>
                <TextInput
                  style={styles.editableField}
                  value={formData.equipmentInvolved}
                  onChangeText={(text) => setFormData({ ...formData, equipmentInvolved: text })}
                  placeholder="Any equipment or machinery involved?"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* First Aid */}
              <View style={styles.modalSection}>
                <Text style={styles.infoTableLabel}>First Aid</Text>
                <TouchableOpacity
                  style={[styles.toggleBtn, { backgroundColor: formData.firstAidGiven ? '#22C55E20' : colors.surfaceVariant, borderColor: formData.firstAidGiven ? '#22C55E' : colors.outline, marginTop: spacing.sm }]}
                  onPress={() => setFormData({ ...formData, firstAidGiven: !formData.firstAidGiven })}
                >
                  <Ionicons name={formData.firstAidGiven ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={formData.firstAidGiven ? '#22C55E' : colors.textSecondary} />
                  <Text style={[styles.toggleBtnText, { color: formData.firstAidGiven ? '#22C55E' : colors.textSecondary }]}>First aid was given</Text>
                </TouchableOpacity>
                {formData.firstAidGiven && (
                  <TextInput
                    style={[styles.editableField, { marginTop: spacing.sm }]}
                    value={formData.firstAidBy}
                    onChangeText={(text) => setFormData({ ...formData, firstAidBy: text })}
                    placeholder="Name of first aid provider"
                    placeholderTextColor={colors.textSecondary}
                  />
                )}
              </View>

              {/* Medical Treatment */}
              <View style={styles.modalSection}>
                <Text style={styles.infoTableLabel}>Medical Treatment</Text>
                <TouchableOpacity
                  style={[styles.toggleBtn, { backgroundColor: formData.medicalTreatmentRequired ? '#3B82F620' : colors.surfaceVariant, borderColor: formData.medicalTreatmentRequired ? '#3B82F6' : colors.outline, marginTop: spacing.sm }]}
                  onPress={() => setFormData({ ...formData, medicalTreatmentRequired: !formData.medicalTreatmentRequired })}
                >
                  <Ionicons name={formData.medicalTreatmentRequired ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={formData.medicalTreatmentRequired ? '#3B82F6' : colors.textSecondary} />
                  <Text style={[styles.toggleBtnText, { color: formData.medicalTreatmentRequired ? '#3B82F6' : colors.textSecondary }]}>Medical treatment required</Text>
                </TouchableOpacity>
                {formData.medicalTreatmentRequired && (
                  <TextInput
                    style={[styles.editableField, { marginTop: spacing.sm }]}
                    value={formData.hospitalName}
                    onChangeText={(text) => setFormData({ ...formData, hospitalName: text })}
                    placeholder="Hospital or clinic name"
                    placeholderTextColor={colors.textSecondary}
                  />
                )}
              </View>

              {/* Corrective Actions */}
              <View style={styles.modalSection}>
                <Text style={[styles.infoTableLabel, { opacity: 0.7 }]}>Corrective Actions Planned (Optional)</Text>
                <TextInput
                  style={[styles.editableField, styles.multilineInput]}
                  value={formData.correctiveActionsPlanned}
                  onChangeText={(text) => setFormData({ ...formData, correctiveActionsPlanned: text })}
                  placeholder="Describe planned corrective actions..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Regulatory Compliance */}
              <View style={styles.modalSection}>
                <Text style={styles.infoTableLabel}>Regulatory Reporting</Text>
                <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
                  {([
                    { key: 'reportableToAuthorities', label: 'Reportable to Authorities' },
                    { key: 'reportedToCnss', label: 'Report to CNSS' },
                    { key: 'reportedToLabourInspection', label: 'Report to Labour Inspection' },
                  ] as const).map(({ key, label }) => (
                    <TouchableOpacity
                      key={key}
                      style={[styles.toggleBtn, { backgroundColor: formData[key] ? '#8B5CF620' : colors.surfaceVariant, borderColor: formData[key] ? '#8B5CF6' : colors.outline }]}
                      onPress={() => setFormData({ ...formData, [key]: !formData[key] })}
                    >
                      <Ionicons name={formData[key] ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={formData[key] ? '#8B5CF6' : colors.textSecondary} />
                      <Text style={[styles.toggleBtnText, { color: formData[key] ? '#8B5CF6' : colors.textSecondary }]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Attachments / Evidence */}
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeader}>
                  <Ionicons name="image-outline" size={16} color={colors.primary} />
                  <Text style={styles.modalSectionTitle}>Evidence (Photos/Videos)</Text>
                </View>
                {pendingAttachments.length > 0 && (
                  <View style={{ marginBottom: spacing.md }}>
                    {pendingAttachments.map((att, idx) => (
                      <View key={idx} style={[styles.attachmentItem, styles.cardShadow]}>
                        <View style={styles.attachmentHeader}>
                          <Ionicons
                            name={att.attachmentType === 'image' ? 'image' : 'videocam'}
                            size={18}
                            color={att.attachmentType === 'image' ? '#3B82F6' : '#EF4444'}
                          />
                          <Text style={styles.attachmentType}>{att.name}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.attachmentDeleteBtn}
                          onPress={() => handleRemovePendingAttachment(idx)}
                        >
                          <Ionicons name="close-circle" size={18} color="#EF4444" />
                          <Text style={styles.attachmentDeleteBtnText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
                <TouchableOpacity style={styles.attachmentButton} onPress={handlePickAttachment}>
                  <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                  <Text style={styles.attachmentButtonText}>
                    {pendingAttachments.length > 0 ? `Add More (${pendingAttachments.length} selected)` : 'Add Photo/Video'}
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.workerHelperText, { marginTop: spacing.xs }]}>
                  Files will be uploaded after the incident is created
                </Text>
              </View>

            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isLoading}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveBtn, (isLoading || !isFormValid) && { opacity: 0.5 }]} 
                onPress={handleSubmit} 
                disabled={isLoading || !isFormValid}
              >
                <Ionicons name={isLoading ? 'hourglass' : 'add'} size={16} color="#FFF" />
                <Text style={styles.saveBtnText}>{isLoading ? 'Creating...' : 'Create Incident'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Toast Notification */}
      {toastMsg && <SimpleToastNotification message={toastMsg} />}
    </>
  );
}

// ─── Stat Card ───────────────────────────────────────────────
function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <View style={[styles.statCard, styles.cardShadow, { borderTopColor: color, borderTopWidth: 3 }]}>
      <View style={[styles.statCardIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={[styles.statCardValue, { color }]}>{value}</Text>
      <Text style={styles.statCardLabel}>{label}</Text>
    </View>
  );
}

// ─── Filter Chip ─────────────────────────────────────────────
function FilterChip({ label, active, onPress, dotColor }: {
  label: string; active: boolean; onPress: () => void; dotColor?: string;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.filterChip,
        active && { backgroundColor: (dotColor || colors.primary) + '18', borderColor: dotColor || colors.primary },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {dotColor && <View style={[styles.filterDot, { backgroundColor: dotColor, opacity: active ? 1 : 0.35 }]} />}
      <Text style={[styles.filterChipText, active && { color: dotColor || colors.primary, fontWeight: '600' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Main Screen ─────────────────────────────────────────────
export function IncidentDashboardScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const { toastMsg, showToast } = useSimpleToast();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [filterType, setFilterType] = useState<'all' | string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | string>('all');
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);

  // Load incidents from backend
  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    try {
      setLoading(true);
      const response = await OccHealthApiService.getInstance().getWorkplaceIncidents();
      if (response.data && Array.isArray(response.data.results)) {
        const mapped = response.data.results.map(mapBackendToIncident);
        setIncidents(mapped);
      }
    } catch (error) {
      console.error('Error loading incidents:', error);
      showToast('Failed to load incidents', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadIncidents();
    setRefreshing(false);
  }, []);

  const handleDeleteIncident = async (incidentId: number) => {
    Alert.alert('Delete Incident', 'Are you sure you want to delete this incident?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const result = await OccHealthApiService.getInstance().deleteWorkplaceIncident(incidentId);
            if (result.success) {
              setIncidents(incidents.filter(i => i.backendId !== incidentId));
              setModalVisible(false);
              showToast('Incident deleted successfully', 'success');
            } else {
              showToast(result.error || 'Failed to delete incident', 'error');
            }
          } catch (error: any) {
            showToast(error.message || 'Error deleting incident', 'error');
          }
        },
      },
    ]);
  };

  const handleUpdateIncident = async (updatedIncident: Incident) => {
    if (!updatedIncident.backendId) {
      showToast('Cannot update incident without ID', 'error');
      return;
    }

    try {
      const payload: Record<string, any> = {
        category: updatedIncident.type,
        incident_date: updatedIncident.date,
        incident_time: updatedIncident.time,
        description: updatedIncident.description,
        location_description: updatedIncident.location,
        immediate_cause: updatedIncident.immediateActions || updatedIncident.rootCause || '',
        immediate_actions_taken: updatedIncident.immediateActions || '',
        root_cause_analysis: updatedIncident.rootCause || '',
        status: updatedIncident.status,
        work_days_lost: Math.max(0, updatedIncident.ltiDays || 0),
        equipment_involved: updatedIncident.equipmentInvolved || '',
        first_aid_given: updatedIncident.firstAidGiven || false,
        first_aid_by: updatedIncident.firstAidBy || '',
        medical_treatment_required: updatedIncident.medicalTreatmentRequired || false,
        hospital_name: updatedIncident.hospitalName || '',
        corrective_actions_planned: updatedIncident.correctiveActionsPlanned || '',
        reportable_to_authorities: updatedIncident.reportableToAuthorities || false,
        reported_to_cnss: updatedIncident.reportedToCnss || false,
        reported_to_labour_inspection: updatedIncident.reportedToLabourInspection || false,
        // Auto-mark as investigated when root cause is provided
        investigated: !!(updatedIncident.rootCause?.trim()),
      };
      const result = await OccHealthApiService.getInstance().updateWorkplaceIncident(updatedIncident.backendId, payload);
      if (result.data) {
        const updated = mapBackendToIncident(result.data);
        setIncidents(incidents.map(i => i.backendId === updatedIncident.backendId ? updated : i));
        setModalVisible(false);
        showToast('Incident updated successfully', 'success');
      } else {
        showToast(result.error || 'Failed to update incident', 'error');
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to update incident', 'error');
    }
  };

  const handleCreateIncident = async (formData: any) => {
    if (!formData.description || !formData.location || !formData.type || !formData.date || !formData.immediateActions) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      setCreating(true);
      
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
      const randomSuffix = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
      const incidentNumber = `INC-${dateStr}-${randomSuffix}`;
      
      const payload: Record<string, any> = {
        incident_number: incidentNumber,
        category: formData.type,
        incident_date: formData.date,
        incident_time: formData.time || '09:00:00',
        description: formData.description,
        location_description: formData.location,
        immediate_cause: formData.immediateActions,
        immediate_actions_taken: formData.immediateActions,
        root_cause_analysis: formData.rootCause || '',
        status: 'reported',
        work_days_lost: formData.ltiDays || 0,
        severity: formData.severity || 1,
        injury_type: 'general',
        equipment_involved: formData.equipmentInvolved || '',
        first_aid_given: formData.firstAidGiven || false,
        first_aid_by: formData.firstAidBy || '',
        medical_treatment_required: formData.medicalTreatmentRequired || false,
        hospital_name: formData.hospitalName || '',
        corrective_actions_planned: formData.correctiveActionsPlanned || '',
        reportable_to_authorities: formData.reportableToAuthorities || false,
        reported_to_cnss: formData.reportedToCnss || false,
        reported_to_labour_inspection: formData.reportedToLabourInspection || false,
      };
      
      if (formData.injured_worker_id) {
        const workerId = parseInt(String(formData.injured_worker_id), 10);
        if (!isNaN(workerId)) {
          payload.injured_workers = [workerId];
        }
      }
      
      const result = await OccHealthApiService.getInstance().createWorkplaceIncident(payload);
      if (result.data) {
        const createdBackendId: number = result.data.id;
        // Upload any pending attachments
        if (formData.pendingAttachments?.length) {
          for (const pending of formData.pendingAttachments) {
            try {
              const filename = pending.uri.split('/').pop() || `file-${Date.now()}.jpg`;
              await OccHealthApiService.getInstance().uploadIncidentAttachment(
                createdBackendId,
                { uri: pending.uri, name: filename, type: pending.mimeType || 'image/jpeg' },
                pending.attachmentType,
                ''
              );
            } catch (uploadErr) {
              console.warn('Failed to upload attachment:', uploadErr);
            }
          }
        }
        const newIncident = mapBackendToIncident(result.data);
        setIncidents([newIncident, ...incidents]);
        setCreateModalVisible(false);
        showToast('Incident created successfully', 'success');
      } else {
        showToast(result.error || 'Failed to create incident', 'error');
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to create incident', 'error');
    } finally {
      setCreating(false);
    }
  };

  const stats = useMemo(() => ({
    total: incidents.length,
    open:  incidents.filter(i => i.status !== 'closed').length,
    lti:   incidents.filter(i => i.lti).length,
    critical: incidents.filter(i => i.severity === 'critical').length,
  }), [incidents]);

  const filteredIncidents = useMemo(() => {
    let list = [...incidents];
    if (filterType !== 'all') list = list.filter(i => i.type === filterType);
    if (filterStatus !== 'all') list = list.filter(i => i.status === filterStatus);
    if (searchText) {
      const q = searchText.toLowerCase();
      list = list.filter(i =>
        i.number.toLowerCase().includes(q) ||
        i.worker.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q),
      );
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [incidents, filterType, filterStatus, searchText]);

  const openDetail = (incident: Incident) => {
    setSelectedIncident(incident);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Incident Dashboard</Text>
          <Text style={styles.headerSubtitle}>Track and manage workplace incidents</Text>
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={() => setCreateModalVisible(true)}>
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={styles.newBtnText}>Report</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 12, color: colors.textSecondary }}>Loading incidents...</Text>
        </View>
      ) : (
        <>
          {/* Stats grid — 2×2 mobile, 1×4 desktop */}
          <View style={[styles.statsGrid, isDesktop && styles.statsGridDesktop]}>
            <StatCard icon="list-outline"         label="Total"    value={stats.total}    color={colors.primary} />
            <StatCard icon="alert-circle-outline" label="Open"     value={stats.open}     color="#F59E0B" />
            <StatCard icon="alert-outline"        label="LTI"      value={stats.lti}      color="#DC2626" />
            <StatCard icon="warning-outline"      label="Critical" value={stats.critical} color="#EF4444" />
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={16} color={colors.textSecondary} style={{ marginRight: spacing.sm }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by number, worker, description..."
              placeholderTextColor={colors.textSecondary}
              value={searchText}
              onChangeText={setSearchText}
            />
            {!!searchText && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filters */}
          <View style={styles.filtersWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
              <FilterChip label="All types" active={filterType === 'all'} onPress={() => setFilterType('all')} />
              {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                <FilterChip key={k} label={v.label} active={filterType === k} onPress={() => setFilterType(k)} dotColor={v.color} />
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterRow, styles.filterRowBordered]}>
              <FilterChip label="All status" active={filterStatus === 'all'} onPress={() => setFilterStatus('all')} />
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <FilterChip key={k} label={v.label} active={filterStatus === k} onPress={() => setFilterStatus(k)} dotColor={v.color} />
              ))}
            </ScrollView>
          </View>

          {/* Results */}
          <View style={styles.resultsBar}>
            <Text style={styles.resultsText}>
              {filteredIncidents.length} incident{filteredIncidents.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* List */}
          <FlatList
            data={filteredIncidents}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <IncidentCard incident={item} onPress={() => openDetail(item)} />
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBox}>
                  <Ionicons name="checkmark-circle-outline" size={40} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>No incidents found</Text>
                <Text style={styles.emptySubtitle}>Try adjusting your filters or search</Text>
              </View>
            }
          />

          <IncidentDetailModal
            visible={modalVisible}
            incident={selectedIncident}
            onClose={() => setModalVisible(false)}
            onUpdate={handleUpdateIncident}
            onDelete={handleDeleteIncident}
            isDesktop={isDesktop}
          />

          <CreateIncidentModal
            visible={createModalVisible}
            onClose={() => setCreateModalVisible(false)}
            onCreate={handleCreateIncident}
            isLoading={creating}
            isDesktop={isDesktop}
          />

          {/* Toast Notification */}
          {toastMsg && <SimpleToastNotification message={toastMsg} />}
        </>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle:    { fontSize: 22, fontWeight: '700', color: colors.text },
  headerSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  newBtnText: { fontSize: 13, fontWeight: '600', color: '#FFF' },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  statsGridDesktop: { flexWrap: 'nowrap' },
  statCard: {
    flex: 1,
    minWidth: '47%',
    maxWidth: '47%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    alignItems: 'center',
  },
  statCardIcon: {
    width: 40, height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statCardValue: { fontSize: 26, fontWeight: '800' },
  statCardLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2, fontWeight: '500' },
  cardShadow: { ...shadows.sm },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    height: 40,
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadows.sm,
  },
  searchInput: { flex: 1, fontSize: 13, color: colors.text },

  filtersWrapper: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
  },
  filterRow:        { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  filterRowBordered:{ borderTopWidth: 1, borderTopColor: colors.outline },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.surfaceVariant,
    gap: 5,
  },
  filterDot:      { width: 7, height: 7, borderRadius: 4 },
  filterChipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },

  resultsBar: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  resultsText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },

  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },

  incidentCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  typeIconBox: {
    width: 40, height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  incidentNumber: { fontSize: 14, fontWeight: '700', color: colors.text },
  incidentDate:   { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  badgeStack:     { gap: 4, alignItems: 'flex-end' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 3,
  },
  badgeText:     { fontSize: 10, fontWeight: '600' },
  severityBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 },
  severityText:  { fontSize: 10, fontWeight: '700', color: '#FFF' },

  metaRow:  { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  metaText: { fontSize: 12, color: colors.textSecondary, flex: 1 },

  description: { fontSize: 12, color: colors.text, lineHeight: 17, marginBottom: spacing.sm },

  alertPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    gap: 5,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  alertPillAmber: { backgroundColor: '#FEF3C7' },
  alertPillText:  { fontSize: 11, fontWeight: '600', color: '#991B1B' },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  typeLabelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  typeLabelText: { fontSize: 11, fontWeight: '600' },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  footerBtnText: { fontSize: 12, fontWeight: '600' },

  emptyState:    { alignItems: 'center', paddingVertical: 60 },
  emptyIconBox: {
    width: 72, height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle:    { fontSize: 16, fontWeight: '600', color: colors.text },
  emptySubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,27,66,0.55)',
    justifyContent: 'flex-end',
  },
  modalOverlayDesktop: { justifyContent: 'center', alignItems: 'center' },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '98%',
    ...shadows.lg,
  },
  modalContentDesktop: {
    width: '52%',
    maxWidth: 640,
    borderRadius: borderRadius.xl,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    gap: spacing.md,
  },
  workerAvatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  workerAvatarTextLarge: {
    fontSize: 24,
    fontWeight: '800',
  },
  modalTitle:    { fontSize: 15, fontWeight: '700', color: colors.text },
  modalWorkerName: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginTop: 2 },
  modalSubtitle: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  closeBtn: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm, maxHeight: '100%' },

  quickInfoStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  quickInfoItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceVariant,
  },
  quickInfoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  quickInfoLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  quickInfoValue: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  metricTile: {
    width: '48%',
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    alignItems: 'center',
  },
  metricLabel: { fontSize: 10, color: colors.textSecondary, fontWeight: '500', marginBottom: 2 },
  metricValue: { fontSize: 12, fontWeight: '700', textAlign: 'center' },

  modalSection: { marginBottom: spacing.md },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  modalSectionTitle: { fontSize: 13, fontWeight: '600', color: colors.text },
  modalBodyText:     { fontSize: 13, color: colors.text, lineHeight: 19 },

  infoTable: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  infoTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  infoTableLabel: { fontSize: 12, color: colors.textSecondary },
  infoTableValue: { fontSize: 12, fontWeight: '600', color: colors.text },

  ltiBanner: {
    backgroundColor: '#FEE2E2',
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  ltiBannerTitle:   { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 2 },
  ltiBannerHeading: { fontSize: 13, fontWeight: '700', color: '#DC2626' },
  ltiBannerText:    { fontSize: 12, color: '#7F1D1D' },

  capaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FEF3C7',
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#D97706',
  },
  capaBannerText: { fontSize: 12, fontWeight: '600', color: '#92400E' },

  rootCauseBox: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    marginBottom: spacing.sm,
    gap: 2,
  },

  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceVariant,
  },
  statusChipText: { fontSize: 12, color: colors.textSecondary },

  modalFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: colors.text },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  
  editableField: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  multilineInput: {
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  
  deleteBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.sm,
  },
  deleteBtnText: { fontSize: 14, fontWeight: '600', color: '#FFF' },

  attachmentItem: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  attachmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  attachmentType: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  attachmentDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontStyle: 'italic',
  },
  attachmentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  attachmentMeta_text: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  attachmentButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  attachmentDeleteBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  attachmentDeleteBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  historyEntry: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    flexShrink: 0,
  },
  historyStatus: {
    fontSize: 13,
    fontWeight: '700',
  },
  historyMeta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  historyNote: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  workerInfoCard: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  workerInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  workerInfoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  workerInfoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  workerInfoValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '700',
  },

  // ─── Worker Selection Styles ──────────────────────────────
  workerSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  workerSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
    gap: spacing.sm,
    height: 44,
  },
  workerSearchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  workerDropdown: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  workerDropdownLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  workerDropdownLoadingText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  workerDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  workerItemAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerItemAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  workerItemInfo: {
    flex: 1,
  },
  workerItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  workerItemId: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 3,
  },
  workerDropdownEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  workerDropdownEmptyText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  workerSelectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary + '08',
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  workerSelectedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  workerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerSelectedInfo: {
    flex: 1,
  },
  workerSelectedName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  workerSelectedId: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  workerClearBtn: {
    padding: spacing.xs,
  },
  workerHelperText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});
