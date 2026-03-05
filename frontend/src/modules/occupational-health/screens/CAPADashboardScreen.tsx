import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, Modal, TextInput, Animated, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../../../services/ApiService';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { useSimpleToast } from '../../../hooks/useSimpleToast';
import { SimpleToastNotification } from '../../../components/SimpleToastNotification';

// --- Types -------------------------------------------------------------------
interface IncidentDetail {
  id: number;
  incident_number: string;
  category: string;
  category_display: string;
  severity: number;
  severity_display: string;
  incident_date: string;
  status: string;
}

interface Investigation {
  id: number;
  investigation_id: string;
  incident: number;
  incident_detail?: IncidentDetail;
  status: BackendStatus;
  status_display: string;
  investigation_date: string;
  investigation_team: string[];
  investigation_findings: string;
  rca_method: string;
  rca_method_display: string;
  rca_documentation: string;
  root_causes: string[];
  contributing_factors: string[];
  corrective_actions: string;
  corrective_action_owner: number | null;
  corrective_action_owner_name: string | null;
  corrective_action_deadline: string | null;
  corrective_action_implemented_date: string | null;
  preventive_actions: string;
  preventive_action_deadline: string | null;
  effectiveness_check_date: string | null;
  effectiveness_verified: boolean;
  effectiveness_notes: string;
  completion_date: string | null;
  lessons_learned: string;
  is_overdue: boolean;
}

type BackendStatus =
  | 'reported'
  | 'under_investigation'
  | 'root_cause_identified'
  | 'corrective_action_planned'
  | 'corrective_action_implemented'
  | 'effectiveness_verified'
  | 'closed';

// --- Constants ---------------------------------------------------------------
const PIPELINE_STAGES: { key: BackendStatus; label: string; short: string; color: string; icon: string }[] = [
  { key: 'reported',                       label: 'Signale',             short: 'Signale',     color: '#EF4444', icon: 'warning-outline' },
  { key: 'under_investigation',             label: 'En Enquete',          short: 'Enquete',     color: '#F97316', icon: 'search-outline' },
  { key: 'root_cause_identified',           label: 'Cause Identifiee',    short: 'Cause',       color: '#EAB308', icon: 'bulb-outline' },
  { key: 'corrective_action_planned',       label: 'Action Planifiee',    short: 'Planifiee',   color: '#3B82F6', icon: 'list-outline' },
  { key: 'corrective_action_implemented',   label: 'Action Implementee',  short: 'Impl.',       color: '#8B5CF6', icon: 'checkmark-outline' },
  { key: 'effectiveness_verified',          label: 'Efficacite Verifiee', short: 'Verifiee',    color: '#06B6D4', icon: 'shield-checkmark-outline' },
  { key: 'closed',                          label: 'Cloture',             short: 'Cloture',     color: '#22C55E', icon: 'lock-closed-outline' },
];

const STATUS_MAP: Record<BackendStatus, { color: string; bg: string; icon: string; label: string; step: number }> = {
  reported:                       { color: '#EF4444', bg: '#FEF2F2', icon: 'warning',            label: 'Signale',           step: 1 },
  under_investigation:             { color: '#F97316', bg: '#FFF7ED', icon: 'search',             label: 'En Enquete',        step: 2 },
  root_cause_identified:           { color: '#EAB308', bg: '#FEFCE8', icon: 'bulb',              label: 'Cause Identifiee',  step: 3 },
  corrective_action_planned:       { color: '#3B82F6', bg: '#EFF6FF', icon: 'list',              label: 'Action Planifiee',  step: 4 },
  corrective_action_implemented:   { color: '#8B5CF6', bg: '#F5F3FF', icon: 'checkmark-circle',  label: 'Implementee',       step: 5 },
  effectiveness_verified:          { color: '#06B6D4', bg: '#ECFEFF', icon: 'shield-checkmark',  label: 'Verifiee',          step: 6 },
  closed:                          { color: '#22C55E', bg: '#F0FDF4', icon: 'lock-closed',        label: 'Cloture',           step: 7 },
};

const RCA_LABELS: Record<string, string> = {
  '5why':     '5 Pourquois',
  fishbone:   'Diagramme Ishikawa',
  fault_tree: 'Arbre des Defaillances',
  timeline:   'Analyse Chronologique',
  other:      'Autre',
};

const SEVERITY_COLORS: Record<number, string> = {
  1: '#22C55E', 2: '#84CC16', 3: '#EAB308', 4: '#F97316', 5: '#EF4444',
};

function fmtDate(d: string | null | undefined): string {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

function daysUntil(d: string | null | undefined): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

// --- Pipeline Filter Bar -----------------------------------------------------
function PipelineBar({
  investigations, activeStatus, onSelect,
}: { investigations: Investigation[]; activeStatus: BackendStatus | 'all'; onSelect: (s: BackendStatus | 'all') => void }) {
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    investigations.forEach(i => { c[i.status] = (c[i.status] || 0) + 1; });
    return c;
  }, [investigations]);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ps.row}>
      <TouchableOpacity
        style={[ps.allChip, activeStatus === 'all' && ps.allChipActive]}
        onPress={() => onSelect('all')} activeOpacity={0.75}
      >
        <Text style={[ps.allChipTxt, activeStatus === 'all' && ps.allChipTxtActive]}>
          Tous ({investigations.length})
        </Text>
      </TouchableOpacity>
      {PIPELINE_STAGES.map(stage => {
        const count = counts[stage.key] || 0;
        const active = activeStatus === stage.key;
        return (
          <TouchableOpacity
            key={stage.key}
            style={[ps.chip, active && { backgroundColor: stage.color, borderColor: stage.color }]}
            onPress={() => onSelect(stage.key)} activeOpacity={0.75}
          >
            <Ionicons name={stage.icon as any} size={13} color={active ? '#FFF' : stage.color} />
            <Text style={[ps.chipTxt, active && { color: '#FFF' }]}>{stage.short}</Text>
            {count > 0 && (
              <View style={[ps.badge, { backgroundColor: active ? 'rgba(255,255,255,0.3)' : stage.color + '20' }]}>
                <Text style={[ps.badgeTxt, { color: active ? '#FFF' : stage.color }]}>{count}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const ps = StyleSheet.create({
  row:              { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 8, alignItems: 'center' },
  allChip:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: borderRadius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline },
  allChipActive:    { backgroundColor: colors.text, borderColor: colors.text },
  allChipTxt:       { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  allChipTxtActive: { color: '#FFF' },
  chip:             { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: borderRadius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline },
  chipTxt:          { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  badge:            { borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1 },
  badgeTxt:         { fontSize: 10, fontWeight: '700' },
});

// --- CAPA Card ----------------------------------------------------------------
function CAPACard({ item, onPress }: { item: Investigation; onPress: () => void }) {
  const st = STATUS_MAP[item.status] ?? STATUS_MAP.reported;
  const days = daysUntil(item.corrective_action_deadline);
  const dueLabel = days === null ? null : days < 0 ? `${Math.abs(days)}j en retard` : days === 0 ? 'Echeance auj.' : `${days}j restants`;
  const dueColor = days !== null && days <= 0 ? colors.error : days !== null && days <= 7 ? '#F97316' : colors.textSecondary;

  return (
    <TouchableOpacity style={[cs.card, shadows.sm]} onPress={onPress} activeOpacity={0.75}>
      <View style={[cs.stripe, { backgroundColor: st.color }]} />
      <View style={cs.body}>
        <View style={cs.topRow}>
          <View style={[cs.statusPill, { backgroundColor: st.bg }]}>
            <Ionicons name={st.icon as any} size={12} color={st.color} />
            <Text style={[cs.statusTxt, { color: st.color }]}>{st.label}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {item.is_overdue && (
              <View style={cs.overduePill}>
                <Ionicons name="alert" size={10} color={colors.error} />
                <Text style={cs.overdueTxt}>En retard</Text>
              </View>
            )}
            <Text style={cs.invId}>{item.investigation_id}</Text>
          </View>
        </View>
        {item.incident_detail && (
          <View style={cs.incidentRow}>
            <View style={[cs.sevDot, { backgroundColor: SEVERITY_COLORS[item.incident_detail.severity] ?? '#888' }]} />
            <Text style={cs.incidentNum}>{item.incident_detail.incident_number}</Text>
            <Text style={cs.incidentCat}>{item.incident_detail.category_display}</Text>
            <Text style={cs.incidentDate}>- {fmtDate(item.incident_detail.incident_date)}</Text>
          </View>
        )}
        {item.investigation_findings ? (
          <Text style={cs.findings} numberOfLines={2}>{item.investigation_findings}</Text>
        ) : null}
        {item.rca_method ? (
          <View style={cs.rcaRow}>
            <Ionicons name="analytics-outline" size={11} color={colors.primary} />
            <Text style={cs.rcaTxt}>{RCA_LABELS[item.rca_method] ?? item.rca_method}</Text>
          </View>
        ) : null}
        <View style={cs.footer}>
          {item.corrective_action_owner_name ? (
            <View style={cs.footerItem}>
              <Ionicons name="person-outline" size={11} color={colors.textSecondary} />
              <Text style={cs.footerTxt} numberOfLines={1}>{item.corrective_action_owner_name}</Text>
            </View>
          ) : null}
          {dueLabel ? (
            <View style={cs.footerItem}>
              <Ionicons name="calendar-outline" size={11} color={dueColor} />
              <Text style={[cs.footerTxt, { color: dueColor }]}>{dueLabel}</Text>
            </View>
          ) : null}
          <View style={{ flex: 1 }} />
          <Ionicons name="chevron-forward" size={14} color={colors.outline} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const cs = StyleSheet.create({
  card:        { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: borderRadius.xl, overflow: 'hidden' },
  stripe:      { width: 4 },
  body:        { flex: 1, padding: spacing.md, gap: 6 },
  topRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusPill:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: borderRadius.full },
  statusTxt:   { fontSize: 11, fontWeight: '700' },
  overduePill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FEF2F2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.full },
  overdueTxt:  { fontSize: 9, fontWeight: '700', color: colors.error },
  invId:       { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  incidentRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sevDot:      { width: 8, height: 8, borderRadius: 4 },
  incidentNum: { fontSize: 12, fontWeight: '700', color: colors.text },
  incidentCat: { fontSize: 11, color: colors.textSecondary },
  incidentDate:{ fontSize: 11, color: colors.textSecondary },
  findings:    { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  rcaRow:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rcaTxt:      { fontSize: 11, color: colors.primary, fontWeight: '500' },
  footer:      { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap', marginTop: 2 },
  footerItem:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerTxt:   { fontSize: 11, color: colors.textSecondary },
});

// --- Detail Modal ------------------------------------------------------------
function DetailModal({
  investigation, visible, onClose, onStatusChange,
}: {
  investigation: Investigation | null;
  visible: boolean;
  onClose: () => void;
  onStatusChange: (id: number, newStatus: BackendStatus) => void;
}) {
  const slideY = useRef(new Animated.Value(700)).current;

  useEffect(() => {
    if (visible) Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 72, friction: 11 }).start();
    else Animated.timing(slideY, { toValue: 700, duration: 220, useNativeDriver: true }).start();
  }, [visible]);

  if (!investigation) return null;
  const st = STATUS_MAP[investigation.status] ?? STATUS_MAP.reported;
  const stageIdx = PIPELINE_STAGES.findIndex(s => s.key === investigation.status);
  const nextStage = stageIdx < PIPELINE_STAGES.length - 1 ? PIPELINE_STAGES[stageIdx + 1] : null;
  const prevStage = stageIdx > 0 ? PIPELINE_STAGES[stageIdx - 1] : null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={dm.overlay}>
        <TouchableOpacity style={dm.backdrop} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[dm.sheet, { transform: [{ translateY: slideY }] }]}>
          <View style={dm.handle} />
          <View style={dm.header}>
            <View style={[dm.statusIcon, { backgroundColor: st.bg }]}>
              <Ionicons name={st.icon as any} size={22} color={st.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={dm.invId}>{investigation.investigation_id}</Text>
              <Text style={[dm.statusLabel, { color: st.color }]}>{st.label}</Text>
            </View>
            <TouchableOpacity style={dm.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={dm.content} showsVerticalScrollIndicator={false}>
            {/* Stage progress bar */}
            <View style={dm.progressRow}>
              {PIPELINE_STAGES.map((stage, idx) => {
                const done = idx < stageIdx;
                const active = idx === stageIdx;
                return (
                  <React.Fragment key={stage.key}>
                    <View style={[dm.progressDot, { backgroundColor: done || active ? stage.color : colors.outline }]}>
                      {done && <Ionicons name="checkmark" size={8} color="#FFF" />}
                      {active && <View style={dm.progressActiveDot} />}
                    </View>
                    {idx < PIPELINE_STAGES.length - 1 && (
                      <View style={[dm.progressLine, { backgroundColor: done ? PIPELINE_STAGES[idx + 1].color : colors.outline }]} />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
            <Text style={dm.progressLbl}>
              Etape {st.step} / {PIPELINE_STAGES.length} - {st.label}
            </Text>
            {/* Incident */}
            {investigation.incident_detail && (
              <View style={dm.section}>
                <Text style={dm.sectionTitle}>Incident Lie</Text>
                <View style={[dm.infoCard, { borderLeftColor: SEVERITY_COLORS[investigation.incident_detail.severity] ?? colors.outline }]}>
                  <View style={dm.infoRow}>
                    <Text style={dm.infoLabel}>Numero</Text>
                    <Text style={dm.infoValue}>{investigation.incident_detail.incident_number}</Text>
                  </View>
                  <View style={dm.infoRow}>
                    <Text style={dm.infoLabel}>Categorie</Text>
                    <Text style={dm.infoValue}>{investigation.incident_detail.category_display}</Text>
                  </View>
                  <View style={dm.infoRow}>
                    <Text style={dm.infoLabel}>Severite</Text>
                    <Text style={[dm.infoValue, { color: SEVERITY_COLORS[investigation.incident_detail.severity] }]}>
                      Niv. {investigation.incident_detail.severity} - {investigation.incident_detail.severity_display}
                    </Text>
                  </View>
                  <View style={dm.infoRow}>
                    <Text style={dm.infoLabel}>Date incident</Text>
                    <Text style={dm.infoValue}>{fmtDate(investigation.incident_detail.incident_date)}</Text>
                  </View>
                </View>
              </View>
            )}
            {/* Investigation */}
            <View style={dm.section}>
              <Text style={dm.sectionTitle}>Details de l''Enquete</Text>
              <View style={dm.infoCard}>
                <View style={dm.infoRow}>
                  <Text style={dm.infoLabel}>Date enquete</Text>
                  <Text style={dm.infoValue}>{fmtDate(investigation.investigation_date)}</Text>
                </View>
                {investigation.rca_method ? (
                  <View style={dm.infoRow}>
                    <Text style={dm.infoLabel}>Methode RCA</Text>
                    <Text style={dm.infoValue}>{RCA_LABELS[investigation.rca_method] ?? investigation.rca_method}</Text>
                  </View>
                ) : null}
                {investigation.investigation_findings ? (
                  <View style={[dm.infoRow, { flexDirection: 'column', gap: 4 }]}>
                    <Text style={dm.infoLabel}>Resultats</Text>
                    <Text style={dm.infoBody}>{investigation.investigation_findings}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            {/* Root causes */}
            {investigation.root_causes?.length > 0 && (
              <View style={dm.section}>
                <Text style={dm.sectionTitle}>Causes Racines</Text>
                {investigation.root_causes.map((c, i) => (
                  <View key={`cause-${i}-${c.slice(0, 12)}`} style={dm.causeRow}>
                    <View style={[dm.causeDot, { backgroundColor: '#EF4444' }]} />
                    <Text style={dm.causeTxt}>{c}</Text>
                  </View>
                ))}
              </View>
            )}
            {/* Corrective actions */}
            <View style={dm.section}>
              <Text style={dm.sectionTitle}>Actions Correctives</Text>
              <View style={dm.infoCard}>
                {investigation.corrective_actions ? (
                  <View style={[dm.infoRow, { flexDirection: 'column', gap: 4 }]}>
                    <Text style={dm.infoLabel}>Actions</Text>
                    <Text style={dm.infoBody}>{investigation.corrective_actions}</Text>
                  </View>
                ) : <Text style={dm.emptyField}>Non renseigne</Text>}
                {investigation.corrective_action_owner_name ? (
                  <View style={dm.infoRow}>
                    <Text style={dm.infoLabel}>Responsable</Text>
                    <Text style={dm.infoValue}>{investigation.corrective_action_owner_name}</Text>
                  </View>
                ) : null}
                {investigation.corrective_action_deadline ? (
                  <View style={dm.infoRow}>
                    <Text style={dm.infoLabel}>Echeance</Text>
                    <Text style={[dm.infoValue, investigation.is_overdue && { color: colors.error }]}>
                      {fmtDate(investigation.corrective_action_deadline)}
                      {investigation.is_overdue ? '  En retard' : ''}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
            {/* Preventive actions */}
            {investigation.preventive_actions ? (
              <View style={dm.section}>
                <Text style={dm.sectionTitle}>Actions Preventives</Text>
                <View style={dm.infoCard}>
                  <Text style={dm.infoBody}>{investigation.preventive_actions}</Text>
                  {investigation.preventive_action_deadline ? (
                    <View style={[dm.infoRow, { marginTop: 6 }]}>
                      <Text style={dm.infoLabel}>Echeance</Text>
                      <Text style={dm.infoValue}>{fmtDate(investigation.preventive_action_deadline)}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}
            {/* Lessons learned */}
            {investigation.lessons_learned ? (
              <View style={dm.section}>
                <Text style={dm.sectionTitle}>Lecons Apprises</Text>
                <View style={dm.infoCard}>
                  <Text style={dm.infoBody}>{investigation.lessons_learned}</Text>
                </View>
              </View>
            ) : null}
            {/* Stage navigation buttons */}
            {(prevStage || nextStage) && (
              <View style={dm.stageActions}>
                {prevStage && (
                  <TouchableOpacity
                    style={[dm.rejectBtn, { borderColor: prevStage.color }]}
                    onPress={() => onStatusChange(investigation.id, prevStage.key)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="arrow-back-circle-outline" size={16} color={prevStage.color} />
                    <Text style={[dm.rejectTxt, { color: prevStage.color }]}>Retour: {prevStage.label}</Text>
                  </TouchableOpacity>
                )}
                {nextStage && (
                  <TouchableOpacity
                    style={[dm.advanceBtn, { backgroundColor: nextStage.color, flex: prevStage ? 1 : undefined }]}
                    onPress={() => onStatusChange(investigation.id, nextStage.key)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="arrow-forward-circle-outline" size={18} color="#FFF" />
                    <Text style={dm.advanceTxt}>Avancer: {nextStage.label}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const dm = StyleSheet.create({
  overlay:           { flex: 1, justifyContent: 'flex-end' },
  backdrop:          { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:             { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%' },
  handle:            { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.outline, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header:            { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outline },
  statusIcon:        { width: 46, height: 46, borderRadius: borderRadius.xl, justifyContent: 'center', alignItems: 'center' },
  invId:             { fontSize: 15, fontWeight: '800', color: colors.text },
  statusLabel:       { fontSize: 12, fontWeight: '600', marginTop: 2 },
  closeBtn:          { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceVariant, justifyContent: 'center', alignItems: 'center' },
  content:           { padding: spacing.lg, paddingBottom: 60, gap: spacing.md },
  progressRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  progressDot:       { width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  progressActiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  progressLine:      { flex: 1, height: 2 },
  progressLbl:       { fontSize: 11, color: colors.textSecondary, textAlign: 'center', fontWeight: '500' },
  section:           { gap: 8 },
  sectionTitle:      { fontSize: 12, fontWeight: '800', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoCard:          { backgroundColor: colors.background, borderRadius: borderRadius.lg, padding: spacing.md, gap: 8, borderLeftWidth: 3, borderLeftColor: colors.outline },
  infoRow:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 },
  infoLabel:         { fontSize: 11, color: colors.textSecondary, fontWeight: '600', flex: 1 },
  infoValue:         { fontSize: 12, color: colors.text, fontWeight: '600', flex: 2, textAlign: 'right' },
  infoBody:          { fontSize: 12, color: colors.text, lineHeight: 18 },
  emptyField:        { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic' },
  causeRow:          { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 3 },
  causeDot:          { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  causeTxt:          { fontSize: 12, color: colors.text, flex: 1, lineHeight: 18 },
  advanceBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: borderRadius.xl, marginTop: 8 },
  advanceTxt:        { fontSize: 14, fontWeight: '700', color: '#FFF' },
  stageActions:      { flexDirection: 'row', gap: 10, marginTop: 8 },
  rejectBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 14, borderRadius: borderRadius.xl, borderWidth: 1.5 },
  rejectTxt:         { fontSize: 12, fontWeight: '700' },
});

// --- KPI Bar -----------------------------------------------------------------
function KPIBar({ investigations }: { investigations: Investigation[] }) {
  const total   = investigations.length;
  const active  = investigations.filter(i => i.status !== 'closed').length;
  const overdue = investigations.filter(i => i.is_overdue).length;
  const closed  = investigations.filter(i => i.status === 'closed').length;
  const rate    = total > 0 ? Math.round((closed / total) * 100) : 0;

  const items = [
    { label: 'Actifs',       value: active,      color: '#F97316', icon: 'reload-outline' },
    { label: 'En retard',    value: overdue,     color: colors.error, icon: 'alert-circle-outline' },
    { label: 'Clotures',     value: closed,      color: '#22C55E', icon: 'checkmark-circle-outline' },
    { label: '% Resolution', value: `${rate}%`,  color: '#3B82F6', icon: 'pie-chart-outline' },
  ];

  return (
    <View style={kb.row}>
      {items.map(item => (
        <View key={item.label} style={[kb.card, shadows.sm]}>
          <View style={[kb.iconWrap, { backgroundColor: item.color + '18' }]}>
            <Ionicons name={item.icon as any} size={18} color={item.color} />
          </View>
          <Text style={[kb.value, { color: item.color }]}>{item.value}</Text>
          <Text style={kb.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const kb = StyleSheet.create({
  row:      { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  card:     { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing.md, alignItems: 'center', gap: 4 },
  iconWrap: { width: 36, height: 36, borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center' },
  value:    { fontSize: 20, fontWeight: '800' },
  label:    { fontSize: 9, color: colors.textSecondary, textAlign: 'center', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
});

// --- Main Screen -------------------------------------------------------------
export function CAPADashboardScreen({ navigation }: any) {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState<BackendStatus | 'all'>('all');
  const [selected, setSelected] = useState<Investigation | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'deadline' | 'severity'>('newest');
  const { toastMsg, showToast } = useSimpleToast();

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await ApiService.get('/ohs/incident-investigations/');
      const data = Array.isArray(res.data) ? res.data : (res.data.results ?? []);
      setInvestigations(data);
    } catch (e: any) {
      showToast(e?.response?.data?.detail ?? 'Erreur de chargement', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = useCallback(async (id: number, newStatus: BackendStatus) => {
    try {
      await ApiService.patch(`/ohs/incident-investigations/${id}/`, { status: newStatus });
      setInvestigations(prev =>
        prev.map(i => i.id === id ? { ...i, status: newStatus, status_display: STATUS_MAP[newStatus]?.label ?? newStatus } : i)
      );
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: newStatus } : prev);
      setModalVisible(false);
      showToast(`Statut mis a jour: ${STATUS_MAP[newStatus]?.label}`, 'success');
    } catch (e: any) {
      showToast(e?.response?.data?.detail ?? 'Erreur de mise a jour', 'error');
    }
  }, [selected]);

  const filtered = useMemo(() => {
    let list = investigations;
    if (activeStatus !== 'all') list = list.filter(i => i.status === activeStatus);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(i =>
        i.investigation_id?.toLowerCase().includes(q) ||
        i.incident_detail?.incident_number?.toLowerCase().includes(q) ||
        i.investigation_findings?.toLowerCase().includes(q) ||
        i.corrective_action_owner_name?.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.investigation_date).getTime() - new Date(a.investigation_date).getTime();
      if (sortBy === 'oldest') return new Date(a.investigation_date).getTime() - new Date(b.investigation_date).getTime();
      if (sortBy === 'deadline') {
        if (!a.corrective_action_deadline) return 1;
        if (!b.corrective_action_deadline) return -1;
        return new Date(a.corrective_action_deadline).getTime() - new Date(b.corrective_action_deadline).getTime();
      }
      if (sortBy === 'severity') {
        const sa = a.incident_detail?.severity ?? 0;
        const sb = b.incident_detail?.severity ?? 0;
        return sb - sa;
      }
      return 0;
    });
  }, [investigations, activeStatus, search, sortBy]);

  const openDetail = (item: Investigation) => { setSelected(item); setModalVisible(true); };

  return (
    <View style={ss.screen}>
      {toastMsg && (
        <SimpleToastNotification
          visible={!!toastMsg}
          message={toastMsg.text}
          type={toastMsg.type}
          onHide={() => {}}
        />
      )}

      {/* Header */}
      <View style={ss.header}>
        <TouchableOpacity style={ss.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={ss.title}>Tableau CAPA</Text>
          <Text style={ss.subtitle}>Corrective &amp; Preventive Actions</Text>
        </View>
        <TouchableOpacity style={ss.refreshBtn} onPress={() => { setRefreshing(true); load(true); }} activeOpacity={0.7} disabled={refreshing}>
          {refreshing ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-outline" size={20} color={colors.primary} />}
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={ss.searchWrap}>
        <Ionicons name="search-outline" size={16} color={colors.textSecondary} style={{ marginLeft: spacing.md }} />
        <TextInput
          style={ss.searchInput}
          placeholder="Rechercher par ID, incident, responsable..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={{ paddingHorizontal: spacing.md }}>
            <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={ss.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={ss.loadingTxt}>Chargement des CAPA...</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
        >
          <KPIBar investigations={investigations} />
          <PipelineBar investigations={investigations} activeStatus={activeStatus} onSelect={setActiveStatus} />

          {/* Sort bar */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: 8, paddingBottom: spacing.sm }}>
            {([
              { key: 'newest',   label: 'Plus récent', icon: 'arrow-down-outline' },
              { key: 'oldest',   label: 'Plus ancien', icon: 'arrow-up-outline' },
              { key: 'deadline', label: 'Échéance',    icon: 'calendar-outline' },
              { key: 'severity', label: 'Sévérité',    icon: 'warning-outline' },
            ] as const).map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[ss.sortChip, sortBy === opt.key && ss.sortChipActive]}
                onPress={() => setSortBy(opt.key)} activeOpacity={0.75}
              >
                <Ionicons name={opt.icon as any} size={11} color={sortBy === opt.key ? '#FFF' : colors.textSecondary} />
                <Text style={[ss.sortChipTxt, sortBy === opt.key && { color: '#FFF' }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {filtered.length === 0 ? (
            <View style={ss.empty}>
              <Ionicons name="document-text-outline" size={48} color={colors.outline} />
              <Text style={ss.emptyTitle}>Aucun CAPA</Text>
              <Text style={ss.emptySubt}>
                {search ? 'Aucun resultat pour cette recherche' : activeStatus !== 'all' ? 'Aucun element dans cette etape' : 'Aucune investigation enregistree'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => <CAPACard item={item} onPress={() => openDetail(item)} />}
              contentContainerStyle={ss.list}
              scrollEnabled={false}
            />
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      <DetailModal
        investigation={selected}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onStatusChange={handleStatusChange}
      />
    </View>
  );
}

const ss = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: colors.background },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.md, gap: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.outline },
  backBtn:      { width: 40, height: 40, borderRadius: borderRadius.xl, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  title:        { fontSize: 20, fontWeight: '800', color: colors.text },
  subtitle:     { fontSize: 12, color: colors.textSecondary, fontWeight: '500', marginTop: 1 },
  refreshBtn:   { width: 40, height: 40, borderRadius: borderRadius.xl, backgroundColor: colors.primary + '12', justifyContent: 'center', alignItems: 'center' },
  searchWrap:   { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, marginHorizontal: spacing.md, marginVertical: spacing.sm, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.outline },
  searchInput:  { flex: 1, paddingVertical: 10, paddingHorizontal: spacing.sm, fontSize: 13, color: colors.text },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingTxt:   { fontSize: 13, color: colors.textSecondary },
  list:         { padding: spacing.md, gap: spacing.md },
  empty:        { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle:   { fontSize: 16, fontWeight: '700', color: colors.text },
  emptySubt:    { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.xl },
  sortChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: borderRadius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline },
  sortChipActive: { backgroundColor: colors.text, borderColor: colors.text },
  sortChipTxt:  { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
});