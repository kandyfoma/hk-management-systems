import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator,
  StyleSheet, Dimensions, Modal, FlatList, RefreshControl, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import DateInput from '../../../components/DateInput';
import ApiService from '../../../services/ApiService';
import { useSimpleToast } from '../../../hooks/useSimpleToast';
import { SimpleToastNotification } from '../../../components/SimpleToastNotification';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────
interface ExamSchedule {
  id: string;
  workerId: string;
  workerName: string;
  examType: string;
  scheduledDate: string; // YYYY-MM-DD
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
  examiner: string;
  examinerId?: string;
  location: string;
  sector: string;
  notes?: string;
  completedDate?: string;
}

// ─── Exam Catalog ─────────────────────────────────────────────────────────────
interface CatalogItem {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  duration: string;
}
interface CatalogCategory {
  category: string;
  icon: string;
  items: CatalogItem[];
}

const EXAM_CATALOG: CatalogCategory[] = [
  {
    category: 'Statutory & Regulatory',
    icon: 'shield-checkmark',
    items: [
      { id: 'pre_employment',  label: 'Pre-Employment',  description: 'Fitness assessment prior to hiring',       icon: 'person-add',      color: '#3B82F6', duration: '60 min' },
      { id: 'periodic',        label: 'Periodic',         description: 'Annual/biannual health monitoring',        icon: 'calendar',         color: '#8B5CF6', duration: '45 min' },
      { id: 'return_to_work',  label: 'Return to Work',   description: 'Post-absence fitness clearance',           icon: 'arrow-redo',       color: '#22C55E', duration: '30 min' },
      { id: 'exit',            label: 'Exit Exam',        description: 'Final health status on departure',         icon: 'exit',             color: '#F59E0B', duration: '45 min' },
      { id: 'follow_up',       label: 'Follow-Up',        description: 'Monitoring of a known condition',          icon: 'refresh',          color: '#EC4899', duration: '20 min' },
    ],
  },
  {
    category: 'Specialized Tests',
    icon: 'flask',
    items: [
      { id: 'audiometry',      label: 'Audiometry',            description: 'Hearing threshold evaluation',            icon: 'volume-high',  color: '#14B8A6', duration: '30 min' },
      { id: 'spirometry',      label: 'Spirometry',            description: 'Pulmonary function testing',               icon: 'leaf',         color: '#06B6D4', duration: '25 min' },
      { id: 'vision',          label: 'Vision / Ophthalmology',description: 'Visual acuity and eye health',             icon: 'eye',          color: '#6366F1', duration: '20 min' },
      { id: 'cardiovascular',  label: 'Cardiovascular',        description: 'ECG & cardiac fitness test',               icon: 'heart',        color: '#EF4444', duration: '40 min' },
      { id: 'blood_panel',     label: 'Blood Panel',           description: 'Full blood count, glucose, lipids',        icon: 'water',        color: '#DC2626', duration: '15 min' },
      { id: 'chest_xray',      label: 'Chest X-Ray',           description: 'Pulmonary radiological exam',              icon: 'scan',         color: '#64748B', duration: '15 min' },
      { id: 'dermatological',  label: 'Dermatology',           description: 'Skin and occupational exposure check',     icon: 'bandage',      color: '#F97316', duration: '20 min' },
      { id: 'musculoskeletal', label: 'Musculoskeletal',        description: 'Ergonomic and joint assessment',           icon: 'body',         color: '#D97706', duration: '35 min' },
    ],
  },
];

// Flat lookup map
const ALL_EXAM_TYPES: Record<string, { label: string; color: string; icon: string }> = {};
EXAM_CATALOG.forEach(cat =>
  cat.items.forEach(item => {
    ALL_EXAM_TYPES[item.id] = { label: item.label, color: item.color, icon: item.icon };
  })
);

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  scheduled:   { color: '#3B82F6', bg: '#EFF6FF', icon: 'calendar-outline',  label: 'Scheduled'   },
  completed:   { color: '#22C55E', bg: '#F0FDF4', icon: 'checkmark-circle',  label: 'Completed'   },
  cancelled:   { color: '#EF4444', bg: '#FEF2F2', icon: 'close-circle',      label: 'Cancelled'   },
  no_show:     { color: '#F59E0B', bg: '#FFFBEB', icon: 'alert-circle',      label: 'No Show'     },
  rescheduled: { color: '#8B5CF6', bg: '#F5F3FF', icon: 'refresh',           label: 'Rescheduled' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_ABBR = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function todayKey(): string { return dateKey(new Date()); }
function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  return parts.slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'sm' | 'lg' }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.scheduled;
  return (
    <View style={[sbS.badge, { backgroundColor: cfg.bg }, size === 'lg' && sbS.lg]}>
      <Ionicons name={cfg.icon as any} size={size === 'lg' ? 15 : 12} color={cfg.color} />
      <Text style={[sbS.label, { color: cfg.color }, size === 'lg' && sbS.labelLg]}>{cfg.label}</Text>
    </View>
  );
}
const sbS = StyleSheet.create({
  badge:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8,  paddingVertical: 3,  borderRadius: 20 },
  lg:      { paddingHorizontal: 12, paddingVertical: 6 },
  label:   { fontSize: 11, fontWeight: '600' },
  labelLg: { fontSize: 13 },
});

// ─── Calendar Grid ────────────────────────────────────────────────────────────
interface CalendarGridProps {
  year: number;
  month: number;
  exams: ExamSchedule[];
  selectedDay: string | null;
  onSelectDay: (key: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

function CalendarGrid({ year, month, exams, selectedDay, onSelectDay, onPrevMonth, onNextMonth }: CalendarGridProps) {
  const dayMap = useMemo(() => {
    const map: Record<string, ExamSchedule[]> = {};
    exams.forEach(e => {
      if (!e.scheduledDate) return;
      if (!map[e.scheduledDate]) map[e.scheduledDate] = [];
      map[e.scheduledDate].push(e);
    });
    return map;
  }, [exams]);

  const cells = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev  = new Date(year, month,     0).getDate();
    const total = Math.ceil((startOffset + daysInMonth) / 7) * 7;
    return Array.from({ length: total }, (_, i) => {
      if (i < startOffset) {
        const d = new Date(year, month - 1, daysInPrev - startOffset + i + 1);
        return { date: d, key: dateKey(d), current: false };
      }
      const dayNum = i - startOffset + 1;
      if (dayNum > daysInMonth) {
        const d = new Date(year, month + 1, dayNum - daysInMonth);
        return { date: d, key: dateKey(d), current: false };
      }
      const d = new Date(year, month, dayNum);
      return { date: d, key: dateKey(d), current: true };
    });
  }, [year, month]);

  const today    = todayKey();
  const CELL_W   = Math.floor((SCREEN_W - 48) / 7);

  return (
    <View style={cgS.container}>
      {/* Month nav */}
      <View style={cgS.nav}>
        <TouchableOpacity onPress={onPrevMonth} style={cgS.navBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={cgS.monthTitle}>{MONTH_NAMES[month]} {year}</Text>
        <TouchableOpacity onPress={onNextMonth} style={cgS.navBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Day-of-week headers */}
      <View style={cgS.dayHeaders}>
        {DAY_ABBR.map(d => (
          <View key={d} style={[cgS.dayHeader, { width: CELL_W }]}>
            <Text style={cgS.dayHeaderTxt}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Grid */}
      <View style={cgS.grid}>
        {cells.map((cell, idx) => {
          const dayExams   = dayMap[cell.key] || [];
          const isSelected = selectedDay === cell.key;
          const isToday    = cell.key === today;

          // Unique exam colors for pip indicators (up to 2)
          const uniqueColors = [...new Set(dayExams.map(e => ALL_EXAM_TYPES[e.examType]?.color || colors.primary))].slice(0, 2);
          const overflow     = Math.max(0, dayExams.length - 2);

          // Status-based priority color for badge bg
          const hasScheduled = dayExams.some(e => e.status === 'scheduled');
          const badgeBg      = hasScheduled ? colors.primary : '#22C55E';

          return (
            <TouchableOpacity
              key={idx}
              style={[cgS.cell, { width: CELL_W }, isSelected && cgS.cellSel, isToday && !isSelected && cgS.cellToday]}
              onPress={() => cell.current && onSelectDay(cell.key)}
              activeOpacity={0.75}
            >
              {/* Day number */}
              <View style={[cgS.dayNum, isToday && cgS.todayCircle, isSelected && cgS.selCircle]}>
                <Text style={[
                  cgS.dayNumTxt,
                  !cell.current && cgS.dayNumOther,
                  isToday && cgS.todayTxt,
                  isSelected && cgS.selTxt,
                ]}>
                  {cell.date.getDate()}
                </Text>
              </View>

              {/* Exam count badge */}
              {dayExams.length > 0 && cell.current && (
                <View style={[cgS.countBadge, { backgroundColor: isSelected ? '#FFF' : badgeBg }]}>
                  <Text style={[cgS.countBadgeTxt, { color: isSelected ? colors.primary : '#FFF' }]}>
                    {dayExams.length}
                  </Text>
                </View>
              )}

              {/* Color pips */}
              {dayExams.length > 0 && cell.current && (
                <View style={cgS.pipsRow}>
                  {uniqueColors.map((col, di) => (
                    <View key={di} style={[cgS.pip, { backgroundColor: isSelected ? 'rgba(255,255,255,0.8)' : col }]} />
                  ))}
                  {overflow > 0 && (
                    <View style={[cgS.overflowPip, { backgroundColor: isSelected ? 'rgba(255,255,255,0.5)' : colors.outline }]}>
                      <Text style={[cgS.overflowTxt, { color: isSelected ? colors.primary : colors.textSecondary }]}>+{overflow}</Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const cgS = StyleSheet.create({
  container:      { backgroundColor: colors.surface, borderRadius: borderRadius.xl, marginHorizontal: spacing.md, padding: spacing.md, ...shadows.sm },
  nav:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  navBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceVariant, justifyContent: 'center', alignItems: 'center' },
  monthTitle:     { fontSize: 17, fontWeight: '700', color: colors.text },
  dayHeaders:     { flexDirection: 'row', marginBottom: 4 },
  dayHeader:      { alignItems: 'center', paddingVertical: 4 },
  dayHeaderTxt:   { fontSize: 11, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  grid:           { flexDirection: 'row', flexWrap: 'wrap' },
  cell:           { alignItems: 'center', paddingTop: 6, paddingBottom: 5, minHeight: 58, position: 'relative' },
  cellSel:        { backgroundColor: colors.primary, borderRadius: borderRadius.md },
  cellToday:      { backgroundColor: colors.primary + '0A', borderRadius: borderRadius.md },
  dayNum:         { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  todayCircle:    { backgroundColor: 'transparent' },
  selCircle:      { backgroundColor: 'rgba(255,255,255,0.22)' },
  dayNumTxt:      { fontSize: 13, fontWeight: '600', color: colors.text },
  dayNumOther:    { color: colors.outline },
  todayTxt:       { color: colors.primary, fontWeight: '800' },
  selTxt:         { color: '#FFFFFF', fontWeight: '800' },
  // count badge
  countBadge:     { minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginTop: 2, paddingHorizontal: 4 },
  countBadgeTxt:  { fontSize: 10, fontWeight: '800', lineHeight: 14 },
  // color pips
  pipsRow:        { flexDirection: 'row', gap: 2, marginTop: 2, alignItems: 'center' },
  pip:            { width: 5, height: 5, borderRadius: 3 },
  overflowPip:    { paddingHorizontal: 3, paddingVertical: 1, borderRadius: 4 },
  overflowTxt:    { fontSize: 8, fontWeight: '700' },
});

// ─── Day Modal ───────────────────────────────────────────────────────────────
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function DayModal({
  visible, day, exams, onClose, onSelect, onAddAppointment,
}: {
  visible: boolean;
  day: string | null;
  exams: ExamSchedule[];
  onClose: () => void;
  onSelect: (e: ExamSchedule) => void;
  onAddAppointment: () => void;
}) {
  const slideY = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 72, friction: 11 }).start();
    } else {
      Animated.timing(slideY, { toValue: 600, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible]);

  if (!day) return null;
  const d         = isoToDate(day);
  const dayName   = DAY_NAMES[d.getDay()];
  const dateLabel = `${dayName}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  const isToday   = day === todayKey();

  // Group exams by status for the summary strip
  const scheduled  = exams.filter(e => e.status === 'scheduled').length;
  const completed  = exams.filter(e => e.status === 'completed').length;
  const others     = exams.length - scheduled - completed;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={dmS.overlay}>
        <TouchableOpacity style={dmS.backdrop} onPress={onClose} activeOpacity={1} />
        <Animated.View style={[dmS.sheet, { transform: [{ translateY: slideY }] }]}>
          {/* Handle */}
          <View style={dmS.handle} />

          {/* Header */}
          <View style={dmS.header}>
            <View style={{ flex: 1 }}>
              <View style={dmS.headerTop}>
                {isToday && (
                  <View style={dmS.todayChip}>
                    <Text style={dmS.todayChipTxt}>Aujourd'hui</Text>
                  </View>
                )}
                <Text style={dmS.dateLabel}>{dateLabel}</Text>
              </View>
              {exams.length > 0 && (
                <View style={dmS.summaryStrip}>
                  {scheduled > 0 && (
                    <View style={[dmS.sumChip, { backgroundColor: '#EFF6FF' }]}>
                      <View style={[dmS.sumDot, { backgroundColor: '#3B82F6' }]} />
                      <Text style={[dmS.sumTxt, { color: '#3B82F6' }]}>{scheduled} prévu(s)</Text>
                    </View>
                  )}
                  {completed > 0 && (
                    <View style={[dmS.sumChip, { backgroundColor: '#F0FDF4' }]}>
                      <View style={[dmS.sumDot, { backgroundColor: '#22C55E' }]} />
                      <Text style={[dmS.sumTxt, { color: '#22C55E' }]}>{completed} complétés</Text>
                    </View>
                  )}
                  {others > 0 && (
                    <View style={[dmS.sumChip, { backgroundColor: colors.surfaceVariant }]}>
                      <View style={[dmS.sumDot, { backgroundColor: colors.textSecondary }]} />
                      <Text style={[dmS.sumTxt, { color: colors.textSecondary }]}>{others} autre(s)</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
            <View style={dmS.headerActions}>
              {exams.length > 0 && (
                <TouchableOpacity style={dmS.addBtn} onPress={onAddAppointment} activeOpacity={0.8}>
                  <Ionicons name="add" size={18} color={colors.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={dmS.closeBtn} onPress={onClose} activeOpacity={0.8}>
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={dmS.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {exams.length === 0 ? (
              <View style={dmS.empty}>
                <View style={dmS.emptyIcon}>
                  <Ionicons name="calendar-clear-outline" size={40} color={colors.outline} />
                </View>
                <Text style={dmS.emptyTitle}>Aucun rendez-vous</Text>
                <Text style={dmS.emptyHint}>Aucun examen prévu pour d'autres jours.</Text>
                <TouchableOpacity style={dmS.addAppointmentBtn} onPress={onAddAppointment}>
                  <Ionicons name="add" size={16} color="#FFF" />
                  <Text style={dmS.addAppointmentTxt}>Ajouter rendez-vous</Text>
                </TouchableOpacity>
              </View>
            ) : (
              exams.map(exam => {
                const t   = ALL_EXAM_TYPES[exam.examType] || { label: exam.examType, color: colors.primary, icon: 'medical' };
                const cfg = STATUS_CFG[exam.status]        || STATUS_CFG.scheduled;
                const initials = getInitials(exam.workerName);
                return (
                  <TouchableOpacity
                    key={exam.id}
                    style={dmS.card}
                    onPress={() => { onClose(); setTimeout(() => onSelect(exam), 260); }}
                    activeOpacity={0.8}
                  >
                    {/* Left accent */}
                    <View style={[dmS.cardAccent, { backgroundColor: t.color }]} />

                    {/* Worker avatar */}
                    <View style={[dmS.avatar, { backgroundColor: t.color + '20' }]}>
                      <Text style={[dmS.avatarTxt, { color: t.color }]}>{initials}</Text>
                    </View>

                    {/* Main info */}
                    <View style={dmS.cardBody}>
                      <Text style={dmS.workerName} numberOfLines={1}>{exam.workerName}</Text>

                      {/* Exam type chip */}
                      <View style={[dmS.examChip, { backgroundColor: t.color + '14' }]}>
                        <Ionicons name={t.icon as any} size={11} color={t.color} />
                        <Text style={[dmS.examChipTxt, { color: t.color }]}>{t.label}</Text>
                      </View>

                      {/* Meta row */}
                      <View style={dmS.metaRow}>
                        {exam.examiner ? (
                          <View style={dmS.metaItem}>
                            <Ionicons name="person-outline" size={11} color={colors.textSecondary} />
                            <Text style={dmS.metaTxt} numberOfLines={1}>Dr. {exam.examiner}</Text>
                          </View>
                        ) : null}
                        {exam.location ? (
                          <View style={dmS.metaItem}>
                            <Ionicons name="location-outline" size={11} color={colors.textSecondary} />
                            <Text style={dmS.metaTxt} numberOfLines={1}>{exam.location}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {/* Right: status + chevron */}
                    <View style={dmS.cardRight}>
                      <View style={[dmS.statusBadge, { backgroundColor: cfg.bg }]}>
                        <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
                        <Text style={[dmS.statusTxt, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={14} color={colors.outline} style={{ marginTop: 4 }} />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const dmS = StyleSheet.create({
  overlay:            { flex: 1, justifyContent: 'flex-end' },
  backdrop:           { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:              { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '80%', ...shadows.lg },
  handle:             { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.outline, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  header:             { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: spacing.lg, paddingTop: 4, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outline, gap: spacing.sm },
  headerTop:          { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 },
  dateLabel:          { fontSize: 16, fontWeight: '800', color: colors.text },
  todayChip:          { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  todayChipTxt:       { fontSize: 10, fontWeight: '800', color: '#FFF', letterSpacing: 0.4 },
  summaryStrip:       { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  sumChip:            { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  sumDot:             { width: 6, height: 6, borderRadius: 3 },
  sumTxt:             { fontSize: 11, fontWeight: '600' },
  headerActions:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBtn:             { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary + '12', justifyContent: 'center', alignItems: 'center' },
  closeBtn:           { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceVariant, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  scrollContent:      { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 32 },
  // Empty state
  empty:              { alignItems: 'center', paddingVertical: 48, gap: spacing.sm },
  emptyIcon:          { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surfaceVariant, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  emptyTitle:         { fontSize: 16, fontWeight: '700', color: colors.text },
  emptyHint:          { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 8 },
  addAppointmentBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: borderRadius.lg },
  addAppointmentTxt:  { fontSize: 13, fontWeight: '600', color: '#FFF' },
  // Appointment card
  card:          { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.xl, marginBottom: spacing.sm, overflow: 'hidden', borderWidth: 1, borderColor: colors.outline, ...shadows.sm, minHeight: 76 },
  cardAccent:    { width: 5, alignSelf: 'stretch' },
  avatar:        { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginHorizontal: 10 },
  avatarTxt:     { fontSize: 16, fontWeight: '800' },
  cardBody:      { flex: 1, paddingVertical: 10 },
  workerName:    { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
  examChip:      { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginBottom: 4 },
  examChipTxt:   { fontSize: 11, fontWeight: '700' },
  metaRow:       { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  metaItem:      { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaTxt:       { fontSize: 11, color: colors.textSecondary, maxWidth: 130 },
  cardRight:     { alignItems: 'center', paddingRight: 10, gap: 2 },
  statusBadge:        { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 16 },
  statusTxt:          { fontSize: 10, fontWeight: '700' },
});

// ─── Appointment Detail Modal ─────────────────────────────────────────────────
function AppointmentDetailModal({
  visible, exam, onClose, onUpdate, users,
}: {
  visible: boolean;
  exam: ExamSchedule | null;
  onClose: () => void;
  onUpdate: (exam: ExamSchedule) => void;
  users: any[];
}) {
  const slideY = useRef(new Animated.Value(400)).current;
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<ExamSchedule | null>(null);
  const [showExamPicker, setShowExamPicker] = useState(false);
  const [showExaminerPicker, setShowExaminerPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
      setEditMode(false);
      setEditData(exam);
    } else {
      slideY.setValue(400);
    }
  }, [visible, exam]);

  if (!exam || !editData) return null;
  const t          = ALL_EXAM_TYPES[editData.examType] || { label: editData.examType, color: colors.primary, icon: 'medical' };
  const statusCfg  = STATUS_CFG[exam.status] || STATUS_CFG.scheduled;
  const initials   = getInitials(exam.workerName);

  const handleUpdate = () => {
    onUpdate(editData);
    setEditMode(false);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={adS.overlay}>
        <TouchableOpacity style={adS.backdrop} onPress={onClose} activeOpacity={1} />
        <Animated.View style={[adS.sheet, { transform: [{ translateY: slideY }] }]}>
          <View style={adS.handle} />
          <View style={[adS.stripe, { backgroundColor: t.color }]} />

          <ScrollView style={adS.body} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Worker row */}
            <View style={adS.workerRow}>
              <View style={[adS.avatar, { backgroundColor: t.color + '22' }]}>
                <Text style={[adS.avatarTxt, { color: t.color }]}>{initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={adS.workerName}>{exam.workerName}</Text>
                <View style={adS.typeChip}>
                  <Ionicons name={t.icon as any} size={12} color={t.color} />
                  <Text style={[adS.typeTxt, { color: t.color }]}>{t.label}</Text>
                </View>
              </View>
              <StatusBadge status={exam.status} size="lg" />
            </View>

            {/* Edit mode fields */}
            {editMode ? (
              <View>
                <View style={adS.editFieldGroup}>
                  <Text style={adS.editLabel}>Type d'examen</Text>
                  <TouchableOpacity
                    style={adS.editInput}
                    onPress={() => setShowExamPicker(true)}
                    activeOpacity={0.8}
                  >
                    <View style={adS.examDisplay}>
                      <View style={[adS.examIcon, { backgroundColor: t.color + '18' }]}>
                        <Ionicons name={t.icon as any} size={18} color={t.color} />
                      </View>
                      <Text style={[adS.examDisplayTxt, { color: t.color, fontWeight: '600' }]}>{t.label}</Text>
                      <Ionicons name="chevron-down" size={18} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
                    </View>
                  </TouchableOpacity>

                  <Modal visible={showExamPicker} transparent animationType="slide">
                    <View style={adS.pickerOverlay}>
                      <View style={[adS.pickerSheet, { maxHeight: '90%' }]}>
                        <View style={adS.pickerHeader}>
                          <Text style={adS.pickerTitle}>Sélectionner type d'examen</Text>
                          <TouchableOpacity onPress={() => setShowExamPicker(false)}>
                            <Ionicons name="close" size={22} color={colors.textSecondary} />
                          </TouchableOpacity>
                        </View>
                        <ExamCatalogPicker
                          selected={[editData.examType]}
                          onSelect={ids => {
                            const newId = ids.find(id => id !== editData.examType) ?? (ids.length > 0 ? ids[ids.length - 1] : editData.examType);
                            setEditData({ ...editData, examType: newId });
                            setShowExamPicker(false);
                          }}
                        />
                      </View>
                    </View>
                  </Modal>
                </View>

                <View style={adS.editFieldGroup}>
                  <Text style={adS.editLabel}>Date de rendez-vous</Text>
                  <DateInput
                    value={editData.scheduledDate}
                    onChangeText={d => setEditData({ ...editData, scheduledDate: d })}
                    minimumDate={new Date()}
                  />
                </View>

                <View style={adS.editFieldGroup}>
                  <Text style={adS.editLabel}>Médecin examinateur</Text>
                  <TouchableOpacity
                    style={adS.editInput}
                    onPress={() => setShowExaminerPicker(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={[adS.editInputTxt, !editData.examiner && { color: colors.textSecondary }]}>
                      {editData.examiner || 'Sélectionner médecin'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>

                  <Modal visible={showExaminerPicker} transparent animationType="slide">
                    <View style={adS.pickerOverlay}>
                      <View style={adS.pickerSheet}>
                        <View style={adS.pickerHeader}>
                          <Text style={adS.pickerTitle}>Sélectionner médecin</Text>
                          <TouchableOpacity onPress={() => setShowExaminerPicker(false)}>
                            <Ionicons name="close" size={22} color={colors.textSecondary} />
                          </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 400 }}>
                          <TouchableOpacity
                            style={adS.pickerOption}
                            onPress={() => {
                              setEditData({ ...editData, examiner: '', examinerId: '' });
                              setShowExaminerPicker(false);
                            }}
                          >
                            <Text style={[adS.pickerOptionTxt, { fontWeight: '600', color: colors.primary }]}>
                              Aucun médecin
                            </Text>
                          </TouchableOpacity>
                          {users.filter(u => u.first_name || u.last_name).map(u => {
                            const selected = editData.examinerId === String(u.id);
                            return (
                              <TouchableOpacity
                                key={u.id}
                                style={[adS.pickerOption, selected && [adS.pickerOptionSelected, { borderColor: colors.primary }]]}
                                onPress={() => {
                                  setEditData({ ...editData, examiner: `${u.first_name} ${u.last_name}`, examinerId: String(u.id) });
                                  setShowExaminerPicker(false);
                                }}
                              >
                                <View style={{ flex: 1 }}>
                                  <Text style={[adS.pickerOptionTxt, selected && { color: colors.primary, fontWeight: '700' }]}>
                                    {u.first_name} {u.last_name}
                                  </Text>
                                </View>
                                {selected && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    </View>
                  </Modal>
                </View>

                <View style={adS.editFieldGroup}>
                  <Text style={adS.editLabel}>Lieu</Text>
                  <TextInput
                    style={adS.editInput}
                    value={editData.location}
                    onChangeText={v => setEditData({ ...editData, location: v })}
                    placeholder="Salle d'examen / clinique"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={adS.editFieldGroup}>
                  <Text style={adS.editLabel}>Remarques</Text>
                  <TextInput
                    style={[adS.editInput, { minHeight: 80, textAlignVertical: 'top' }]}
                    value={editData.notes}
                    onChangeText={v => setEditData({ ...editData, notes: v })}
                    placeholder="Remarques supplémentaires..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                  />
                </View>
              </View>
            ) : (
              <View>
                <DetailItem label="Type d'examen" value={t.label} icon={t.icon} iconColor={t.color} style={adS.detailRow} />
                <DetailItem label="Date" value={exam.scheduledDate} icon="calendar-outline" style={adS.detailRow} />
                <DetailItem label="Médecin examinateur" value={exam.examiner || '—'} icon="person-circle-outline" style={adS.detailRow} />
                <DetailItem label="Lieu" value={exam.location || '—'} icon="location-outline" style={adS.detailRow} />
                {exam.notes && <DetailItem label="Remarques" value={exam.notes} icon="document-text-outline" style={adS.detailRow} />}
              </View>
            )}

            {/* Actions */}
            <View style={adS.actions}>
              {editMode ? (
                <>
                  <TouchableOpacity style={adS.actionBtn} onPress={handleUpdate} activeOpacity={0.8}>
                    <Ionicons name="checkmark" size={17} color="#22C55E" />
                    <Text style={[adS.actionTxt, { color: '#22C55E' }]}>Enregistrer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[adS.actionBtn, { backgroundColor: colors.surfaceVariant, borderColor: colors.outline }]} onPress={() => { setEditMode(false); setEditData(exam); }} activeOpacity={0.8}>
                    <Ionicons name="close" size={17} color={colors.textSecondary} />
                    <Text style={[adS.actionTxt, { color: colors.textSecondary }]}>Annuler</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={adS.actionBtn} onPress={() => setEditMode(true)} activeOpacity={0.8}>
                    <Ionicons name="create-outline" size={17} color={colors.primary} />
                    <Text style={[adS.actionTxt, { color: colors.primary }]}>Modifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[adS.actionBtn, { backgroundColor: '#F0FDF4', borderColor: '#22C55E60' }]} activeOpacity={0.8}>
                    <Ionicons name="mail-outline" size={17} color="#22C55E" />
                    <Text style={[adS.actionTxt, { color: '#22C55E' }]}>Notifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[adS.actionBtn, { backgroundColor: '#FEF2F2', borderColor: '#EF444460' }]} activeOpacity={0.8}>
                    <Ionicons name="close-circle-outline" size={17} color="#EF4444" />
                    <Text style={[adS.actionTxt, { color: '#EF4444' }]}>Annuler</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function DetailItem({
  label, value, icon, style, iconColor,
}: {
  label: string;
  value: string;
  icon: string;
  style?: any;
  iconColor?: string;
}) {
  const color = iconColor || colors.primary;
  return (
    <View style={style || adS.detailRow}>
      <View style={[adS.detailIcon, { backgroundColor: color + '12' }]}>
        <Ionicons name={icon as any} size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={adS.detailLabel}>{label}</Text>
        <Text style={adS.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const adS = StyleSheet.create({
  overlay:           { flex: 1, justifyContent: 'flex-end' },
  backdrop:          { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:             { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%', overflow: 'hidden', ...shadows.lg },
  handle:            { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.outline, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  stripe:            { height: 4, width: '100%' },
  body:              { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  workerRow:         { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg, paddingBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.outline },
  avatar:            { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  avatarTxt:         { fontSize: 20, fontWeight: '800' },
  workerName:        { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
  typeChip:          { flexDirection: 'row', alignItems: 'center', gap: 4 },
  typeTxt:           { fontSize: 12, fontWeight: '600' },
  detailRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.md },
  detailIcon:        { width: 36, height: 36, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  detailLabel:       { fontSize: 11, color: colors.textSecondary, fontWeight: '500', marginBottom: 2 },
  detailValue:       { fontSize: 14, color: colors.text, fontWeight: '500' },
  editFieldGroup:    { marginBottom: spacing.lg },
  editLabel:         { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 8 },
  editInput:         { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 14, color: colors.text, minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 8 },
  editInputTxt:      { fontSize: 14, color: colors.text, flex: 1 },
  examDisplay:       { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  examIcon:          { width: 32, height: 32, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  examDisplayTxt:    { fontSize: 14, flex: 1 },
  actions:           { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.outline },
  actionBtn:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 11, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.primary + '60', backgroundColor: colors.primary + '10' },
  actionTxt:         { fontSize: 13, fontWeight: '600' },
  pickerOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  pickerSheet:       { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  pickerHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outline },
  pickerTitle:       { fontSize: 16, fontWeight: '600', color: colors.text },
  catLabel:          { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  pickerOption:      { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outline },
  pickerOptionSelected: { borderLeftWidth: 3, paddingLeft: spacing.md - 3 },
  pickerOptionTxt:   { fontSize: 14, color: colors.text, flex: 1 },
  pickerOptionDesc:  { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
});


// ─── Exam Catalog Picker (Multi-select) ────────────────────────────────────────
function ExamCatalogPicker({
  selected, onSelect,
}: { selected: string[]; onSelect: (ids: string[]) => void }) {
  const CARD_W = (SCREEN_W - 32 - 16 - spacing.sm) / 2;

  const toggleSelect = (id: string) => {
    if (selected.includes(id)) {
      onSelect(selected.filter(s => s !== id));
    } else {
      onSelect([...selected, id]);
    }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {EXAM_CATALOG.map(cat => (
        <View key={cat.category} style={ecS.section}>
          <View style={ecS.catHeader}>
            <Ionicons name={cat.icon as any} size={14} color={colors.textSecondary} />
            <Text style={ecS.catTitle}>{cat.category}</Text>
          </View>
          <View style={ecS.grid}>
            {cat.items.map(item => {
              const isSel = selected.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[ecS.card, { width: CARD_W }, isSel && { borderColor: item.color, borderWidth: 2, backgroundColor: item.color + '0D' }]}
                  onPress={() => toggleSelect(item.id)}
                  activeOpacity={0.8}
                >
                  {isSel && (
                    <View style={[ecS.check, { backgroundColor: item.color }]}>
                      <Ionicons name="checkmark" size={11} color="#FFF" />
                    </View>
                  )}
                  <View style={[ecS.iconBox, { backgroundColor: item.color + '18' }]}>
                    <Ionicons name={item.icon as any} size={22} color={item.color} />
                  </View>
                  <Text style={[ecS.cardLabel, isSel && { color: item.color }]} numberOfLines={2}>{item.label}</Text>
                  <Text style={ecS.cardDesc} numberOfLines={2}>{item.description}</Text>
                  <View style={[ecS.duration, { backgroundColor: item.color + '12' }]}>
                    <Ionicons name="time-outline" size={10} color={item.color} />
                    <Text style={[ecS.durationTxt, { color: item.color }]}>{item.duration}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const ecS = StyleSheet.create({
  section:     { marginBottom: spacing.lg },
  catHeader:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  catTitle:    { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  grid:        { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card:        { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.outline, position: 'relative', ...shadows.sm },
  check:       { position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  iconBox:     { width: 44, height: 44, borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
  cardLabel:   { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 3 },
  cardDesc:    { fontSize: 11, color: colors.textSecondary, lineHeight: 15, marginBottom: spacing.sm },
  duration:    { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  durationTxt: { fontSize: 10, fontWeight: '600' },
});

// ─── Schedule Form Modal (3-step wizard) ──────────────────────────────────────
interface ScheduleFormData {
  workerId: string;
  workerName: string;
  examTypes: string[];
  scheduledDate: string;
  examiner: string;
  examinerId: string;
  location: string;
  notes: string;
}

const BLANK_FORM: ScheduleFormData = {
  workerId: '', workerName: '', examTypes: [], scheduledDate: '',
  examiner: '', examinerId: '', location: '', notes: '',
};

function ScheduleFormModal({
  visible, workers, users, onClose, onSave, prefilledDate,
}: {
  visible: boolean;
  workers: any[];
  users: any[];
  onClose: () => void;
  onSave: (data: ScheduleFormData) => void;
  prefilledDate?: string;
}) {
  const [step, setStep]             = useState(0);
  const [form, setForm]             = useState<ScheduleFormData>(BLANK_FORM);
  const [workerSearch, setWorkerSearch] = useState('');
  const [showExaminerPicker, setShowExaminerPicker] = useState(false);
  const slideX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setStep(0);
      const initialForm = { ...BLANK_FORM };
      if (prefilledDate) {
        initialForm.scheduledDate = prefilledDate;
      }
      setForm(initialForm);
      setWorkerSearch('');
    }
  }, [visible, prefilledDate]);

  const animeTo = useCallback((next: number) => {
    Animated.timing(slideX, { toValue: -SCREEN_W, duration: 180, useNativeDriver: true }).start(() => {
      setStep(next);
      slideX.setValue(SCREEN_W);
      Animated.spring(slideX, { toValue: 0, tension: 100, friction: 14, useNativeDriver: true }).start();
    });
  }, [slideX]);

  const filteredWorkers = useMemo(() =>
    workers.filter(w => !workerSearch ||
      `${w.first_name} ${w.last_name}`.toLowerCase().includes(workerSearch.toLowerCase())
    ), [workers, workerSearch]);

  const canAdvance = [
    form.workerId !== '',
    form.examTypes.length > 0,
    form.scheduledDate !== '',
  ];

  const STEP_TITLES = ['Sélectionner travailleur', 'Types d\'examen', 'Détails'];
  const STEP_ICONS  = ['person-outline', 'flask-outline', 'calendar-outline'] as const;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={sfS.overlay}>
        <View style={sfS.sheet}>
          {/* Header */}
          <View style={sfS.header}>
            {step > 0 ? (
              <TouchableOpacity onPress={() => animeTo(step - 1)} style={sfS.iconBtn}>
                <Ionicons name="arrow-back" size={20} color={colors.text} />
              </TouchableOpacity>
            ) : <View style={{ width: 38 }} />}
            <Text style={sfS.title}>{STEP_TITLES[step]}</Text>
            <TouchableOpacity onPress={onClose} style={sfS.iconBtn}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Step indicator */}
          <View style={sfS.stepRow}>
            {STEP_TITLES.map((t, i) => (
              <React.Fragment key={i}>
                <View style={sfS.stepItem}>
                  <View style={[sfS.stepCircle, i < step && sfS.stepDone, i === step && sfS.stepActive]}>
                    {i < step
                      ? <Ionicons name="checkmark" size={14} color="#FFF" />
                      : <Ionicons name={STEP_ICONS[i]} size={14} color={i === step ? '#FFF' : colors.textSecondary} />
                    }
                  </View>
                  <Text style={[sfS.stepLabel, i === step && sfS.stepLabelActive]} numberOfLines={2}>{t}</Text>
                </View>
                {i < 2 && <View style={[sfS.stepLine, i < step && sfS.stepLineDone]} />}
              </React.Fragment>
            ))}
          </View>

          {/* Step content */}
          <Animated.View style={[{ flex: 1, overflow: 'hidden' }, { transform: [{ translateX: slideX }] }]}>
            {/* STEP 0 – Worker */}
            {step === 0 && (
              <View style={{ flex: 1, paddingHorizontal: spacing.md }}>
                <View style={sfS.searchBox}>
                  <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
                  <TextInput
                    style={sfS.searchInput}
                    placeholder="Search workers…"
                    value={workerSearch}
                    onChangeText={setWorkerSearch}
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <FlatList
                  data={filteredWorkers}
                  keyExtractor={w => String(w.id)}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item: w }) => {
                    const selected = form.workerId === String(w.id);
                    const name     = `${w.first_name} ${w.last_name}`;
                    return (
                      <TouchableOpacity
                        style={[sfS.workerRow, selected && sfS.workerRowSel]}
                        onPress={() => setForm(f => ({ ...f, workerId: String(w.id), workerName: name }))}
                        activeOpacity={0.8}
                      >
                        <View style={[sfS.workerAvatar, selected && { backgroundColor: colors.primary }]}>
                          <Text style={[sfS.workerAvatarTxt, selected && { color: '#FFF' }]}>
                            {getInitials(name)}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[sfS.workerName, selected && { color: colors.primary }]}>{name}</Text>
                          {w.employee_id && <Text style={sfS.workerMeta}>ID: {w.employee_id}</Text>}
                          {w.department   && <Text style={sfS.workerMeta}>{w.department}</Text>}
                        </View>
                        {selected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={{ alignItems: 'center', paddingVertical: 40, gap: 8 }}>
                      <Ionicons name="people-outline" size={40} color={colors.outline} />
                      <Text style={{ color: colors.textSecondary }}>No workers found</Text>
                    </View>
                  }
                />
              </View>
            )}

            {/* STEP 1 – Exam catalog */}
            {step === 1 && (
              <View style={{ flex: 1, paddingHorizontal: spacing.md }}>
                <View style={sfS.multiSelectHint}>
                  <Ionicons name="information-circle" size={14} color={colors.primary} />
                  <Text style={sfS.multiSelectHintTxt}>Sélectionnez un ou plusieurs types d'examen</Text>
                </View>
                <ExamCatalogPicker
                  selected={form.examTypes || []}
                  onSelect={ids => setForm(f => ({ ...f, examTypes: ids }))}
                />
              </View>
            )}

            {/* STEP 2 – Details */}
            {step === 2 && (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
              >
                {/* Summary pills */}
                <View style={sfS.summaryRow}>
                  {form.workerName ? (
                    <View style={sfS.summaryChip}>
                      <Ionicons name="person" size={12} color={colors.primary} />
                      <Text style={sfS.summaryChipTxt} numberOfLines={1}>{form.workerName}</Text>
                    </View>
                  ) : null}
                  {form.examTypes.map(examTypeId => {
                    const t = ALL_EXAM_TYPES[examTypeId];
                    return t ? (
                      <View key={examTypeId} style={[sfS.summaryChip, { backgroundColor: t.color + '14', borderColor: t.color + '40' }]}>
                        <Ionicons name={t.icon as any} size={12} color={t.color} />
                        <Text style={[sfS.summaryChipTxt, { color: t.color }]} numberOfLines={1}>{t.label}</Text>
                      </View>
                    ) : null;
                  })}
                </View>

                <View style={sfS.formGroup}>
                  <Text style={sfS.label}>Date du rendez-vous *</Text>
                  <DateInput
                    value={form.scheduledDate}
                    onChangeText={d => setForm(f => ({ ...f, scheduledDate: d }))}
                    minimumDate={new Date()}
                  />
                </View>

                <View style={sfS.formGroup}>
                  <Text style={sfS.label}>Médecin examinateur</Text>
                  <TouchableOpacity
                    style={sfS.dropdownBtn}
                    onPress={() => setShowExaminerPicker(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={[sfS.dropdownTxt, !form.examiner && { color: colors.textSecondary }]}>
                      {form.examiner || 'Sélectionner médecin'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>

                  <Modal visible={showExaminerPicker} transparent animationType="slide">
                    <View style={sfS.pickerOverlay}>
                      <View style={sfS.pickerSheet}>
                        <View style={sfS.pickerHeader}>
                          <Text style={sfS.pickerTitle}>Sélectionner médecin</Text>
                          <TouchableOpacity onPress={() => setShowExaminerPicker(false)}>
                            <Ionicons name="close" size={22} color={colors.textSecondary} />
                          </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 400 }}>
                          {users.filter(u => u.first_name || u.last_name).map(u => (
                            <TouchableOpacity
                              key={u.id}
                              style={sfS.pickerOption}
                              onPress={() => {
                                setForm(f => ({ ...f, examiner: `${u.first_name} ${u.last_name}`, examinerId: String(u.id) }));
                                setShowExaminerPicker(false);
                              }}
                            >
                              <Text style={sfS.pickerOptionTxt}>{u.first_name} {u.last_name}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </View>
                  </Modal>
                </View>

                <View style={sfS.formGroup}>
                  <Text style={sfS.label}>Lieu</Text>
                  <TextInput
                    style={sfS.input}
                    value={form.location}
                    onChangeText={v => setForm(f => ({ ...f, location: v }))}
                    placeholder="Salle d'examen / clinique"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={sfS.formGroup}>
                  <Text style={sfS.label}>Remarques</Text>
                  <TextInput
                    style={[sfS.input, { minHeight: 90, textAlignVertical: 'top' }]}
                    value={form.notes}
                    onChangeText={v => setForm(f => ({ ...f, notes: v }))}
                    placeholder="Instructions supplémentaires…"
                    placeholderTextColor={colors.textSecondary}
                    multiline
                  />
                </View>
              </ScrollView>
            )}
          </Animated.View>

          {/* Footer */}
          <View style={sfS.footer}>
            {step < 2 ? (
              <TouchableOpacity
                style={[sfS.primaryBtn, !canAdvance[step] && sfS.primaryBtnDisabled]}
                onPress={() => canAdvance[step] && animeTo(step + 1)}
                activeOpacity={0.85}
              >
                <Text style={sfS.primaryBtnTxt}>Continuer</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[sfS.primaryBtn, !canAdvance[2] && sfS.primaryBtnDisabled]}
                onPress={() => canAdvance[2] && onSave(form)}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                <Text style={sfS.primaryBtnTxt}>Planifier examen</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const sfS = StyleSheet.create({
  overlay:            { flex: 1, justifyContent: 'flex-end' },
  sheet:              { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, height: '92%', overflow: 'hidden', ...shadows.lg },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  iconBtn:            { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceVariant, justifyContent: 'center', alignItems: 'center' },
  title:              { fontSize: 17, fontWeight: '700', color: colors.text },
  stepRow:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  stepItem:           { alignItems: 'center', gap: 4 },
  stepCircle:         { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceVariant, justifyContent: 'center', alignItems: 'center' },
  stepDone:           { backgroundColor: '#22C55E' },
  stepActive:         { backgroundColor: colors.primary },
  stepLabel:          { fontSize: 10, color: colors.textSecondary, fontWeight: '500', textAlign: 'center', maxWidth: 68 },
  stepLabelActive:    { color: colors.primary, fontWeight: '700' },
  stepLine:           { flex: 1, height: 1, backgroundColor: colors.outline, marginBottom: 18 },
  stepLineDone:       { backgroundColor: '#22C55E' },
  multiSelectHint:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary + '12', borderColor: colors.primary + '40', borderWidth: 1, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: 10, marginBottom: spacing.md },
  multiSelectHintTxt: { flex: 1, fontSize: 12, color: colors.primary, fontWeight: '500' },
  searchBox:          { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: 10, marginBottom: spacing.md },
  searchInput:        { flex: 1, fontSize: 14, color: colors.text },
  workerRow:          { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: 6, borderWidth: 1, borderColor: colors.outline },
  workerRowSel:       { borderColor: colors.primary, backgroundColor: colors.primary + '08' },
  workerAvatar:       { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceVariant, justifyContent: 'center', alignItems: 'center' },
  workerAvatarTxt:    { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  workerName:         { fontSize: 13, fontWeight: '600', color: colors.text },
  workerMeta:         { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  summaryRow:         { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' },
  summaryChip:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: colors.primary + '12', borderWidth: 1, borderColor: colors.primary + '30' },
  summaryChipTxt:     { fontSize: 12, fontWeight: '600', color: colors.primary },
  formGroup:          { marginBottom: spacing.lg },
  label:              { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 7 },
  dropdownBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: 12, minHeight: 46 },
  dropdownTxt:        { fontSize: 14, color: colors.text, flex: 1 },
  input:              { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 14, color: colors.text, minHeight: 46 },
  pickerOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  pickerSheet:        { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  pickerHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outline },
  pickerTitle:        { fontSize: 16, fontWeight: '600', color: colors.text },
  pickerOption:       { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outline },
  pickerOptionTxt:    { fontSize: 14, color: colors.text },
  footer:             { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.outline },
  primaryBtn:         { backgroundColor: colors.primary, borderRadius: borderRadius.lg, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  primaryBtnDisabled: { backgroundColor: colors.outline },
  primaryBtnTxt:      { fontSize: 15, fontWeight: '700', color: '#FFF' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function MedicalExamManagementScreen() {
  const { toastMsg, showToast } = useSimpleToast();

  // Calendar navigation
  const [calYear, setCalYear]   = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(todayKey());

  // Data
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [workers, setWorkers]     = useState<any[]>([]);
  const [users, setUsers]         = useState<any[]>([]);

  // UI modals
  const [selectedExam, setSelectedExam]     = useState<ExamSchedule | null>(null);
  const [detailVisible, setDetailVisible]   = useState(false);
  const [dayModalVisible, setDayModalVisible] = useState(false);
  const [formVisible, setFormVisible]       = useState(false);

  const apiService = useMemo(() => ApiService.getInstance(), []);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [examsRes, workersRes, usersRes] = await Promise.all([
        apiService.get('/occupational-health/medical-exams/', { ordering: '-exam_date', page_size: 200 }),
        apiService.get('/occupational-health/workers/', { page_size: 1000 }),
        apiService.get('/auth/users/', { page_size: 1000 }),
      ]);

      const exams = examsRes?.data?.results || examsRes?.data || [];
      const mapped: ExamSchedule[] = exams.map((e: any) => ({
        id:            String(e.id),
        workerId:      String(e.worker),
        workerName:    e.worker_name || '',
        examType:      e.exam_type || 'periodic',
        scheduledDate: e.exam_date || '',
        status:        e.examination_completed ? 'completed' : 'scheduled',
        examiner:      e.examining_doctor_name || '',
        examinerId:    String(e.examining_doctor || ''),
        location:      e.location || 'KCC Health Center',
        sector:        '',
        notes:         e.results_summary || e.chief_complaint || '',
      }));

      setSchedules(mapped);
      setWorkers(workersRes?.data?.results || workersRes?.data || []);
      setUsers(usersRes?.data?.results   || usersRes?.data   || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load data');
    }
  }, [apiService]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData().finally(() => setRefreshing(false));
  }, [loadData]);

  const mapExamTypeToBackend = (frontendExamId: string): string => {
    const typeMap: Record<string, string> = {
      'pre_employment':   'pre_employment',
      'periodic':         'periodic',
      'return_to_work':   'return_to_work',
      'exit':             'exit',
      'follow_up':        'periodic',
      'night_work':       'night_work',
      'pregnancy_related':'pregnancy_related',
      'post_incident':    'post_incident',
      'audiometry':       'special',
      'spirometry':       'special',
      'vision':           'special',
      'cardiovascular':   'special',
      'blood_panel':      'special',
      'chest_xray':       'special',
      'dermatological':   'special',
      'musculoskeletal':  'special',
    };
    return typeMap[frontendExamId] || 'special';
  };

  const handleSave = useCallback(async (form: ScheduleFormData) => {
    try {
      if (!form.workerId || form.examTypes.length === 0 || !form.scheduledDate) {
        showToast('Veuillez remplir tous les champs requis', 'error');
        return;
      }
      
      const promises = form.examTypes.map(examTypeId => {
        const backendExamType = mapExamTypeToBackend(examTypeId);
        const t = ALL_EXAM_TYPES[examTypeId] || { label: examTypeId };
        const payload: any = {
          worker:                parseInt(form.workerId),
          exam_type:             backendExamType,
          exam_date:             form.scheduledDate,
          chief_complaint:       `${t.label}${form.notes ? ' - ' + form.notes : ''}`,
          results_summary:       '',
          recommendations:       '',
          examination_completed: false,
          follow_up_required:    false,
          location:              form.location || '',
        };
        if (form.examinerId && form.examinerId.trim() !== '') {
          payload.examining_doctor = form.examinerId;
        }
        return apiService.post('/occupational-health/medical-exams/', payload);
      });
      
      await Promise.all(promises);
      showToast(`${form.examTypes.length} examen(s) planifié(s) avec succès`, 'success');
      setFormVisible(false);
      await handleRefresh();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || err?.message || 'Échec de la planification', 'error');
    }
  }, [apiService, handleRefresh, showToast]);

  // KPI counts
  const stats = useMemo(() => ({
    total:     schedules.length,
    upcoming:  schedules.filter(s => s.status === 'scheduled').length,
    completed: schedules.filter(s => s.status === 'completed').length,
  }), [schedules]);

  // Appointments for selected day
  const dayExams = useMemo(
    () => (selectedDay ? schedules.filter(s => s.scheduledDate === selectedDay) : []),
    [selectedDay, schedules]
  );

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  if (loading) {
    return (
      <View style={ms.loadingWrap}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={ms.loadingTxt}>Chargement du calendrier...</Text>
      </View>
    );
  }

  return (
    <View style={ms.container}>
      {toastMsg && <SimpleToastNotification message={toastMsg} />}

      {/* ─── Header with compact KPI strip ─── */}
      <View style={ms.header}>
        <View style={{ flex: 1 }}>
          <Text style={ms.headerTitle}>Examens médicaux</Text>
          <Text style={ms.headerSub}>Planification de santé occupationnelle</Text>
        </View>
        <View style={ms.kpiStrip}>
          <View style={ms.kpiItem}>
            <Text style={[ms.kpiNum, { color: '#3B82F6' }]}>{stats.upcoming}</Text>
            <Text style={ms.kpiLbl}>À venir</Text>
          </View>
          <View style={ms.kpiDivider} />
          <View style={ms.kpiItem}>
            <Text style={[ms.kpiNum, { color: '#22C55E' }]}>{stats.completed}</Text>
            <Text style={ms.kpiLbl}>Complétés</Text>
          </View>
          <View style={ms.kpiDivider} />
          <View style={ms.kpiItem}>
            <Text style={[ms.kpiNum, { color: colors.primary }]}>{stats.total}</Text>
            <Text style={ms.kpiLbl}>Total</Text>
          </View>
        </View>
      </View>

      {/* ─── Scrollable body ─── */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {error ? (
          <View style={ms.errorBox}>
            <Ionicons name="alert-circle-outline" size={36} color={colors.error || '#EF4444'} />
            <Text style={ms.errorTxt}>{error}</Text>
            <TouchableOpacity style={ms.retryBtn} onPress={handleRefresh}>
              <Text style={ms.retryTxt}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Calendar */}
            <View style={{ marginTop: spacing.md }}>
              <CalendarGrid
                year={calYear}
                month={calMonth}
                exams={schedules}
                selectedDay={selectedDay}
                onSelectDay={key => { setSelectedDay(key); setDayModalVisible(true); }}
                onPrevMonth={prevMonth}
                onNextMonth={nextMonth}
              />
            </View>

            {/* Exam type legend */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: spacing.sm }}
              contentContainerStyle={ms.legendContent}
            >
              {Object.entries(ALL_EXAM_TYPES).map(([id, t]) => (
                <View key={id} style={ms.legendItem}>
                  <View style={[ms.legendDot, { backgroundColor: t.color }]} />
                  <Text style={ms.legendTxt}>{t.label}</Text>
                </View>
              ))}
            </ScrollView>

            {/* Tap-hint below calendar */}
            <View style={ms.tapHint}>
              <Ionicons name="finger-print-outline" size={13} color={colors.textSecondary} />
              <Text style={ms.tapHintTxt}>Cliquez sur une date pour voir les rendez-vous</Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* ─── FAB ─── */}
      <TouchableOpacity style={ms.fab} onPress={() => { setSelectedDay(null); setFormVisible(true); }} activeOpacity={0.85}>
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>

      {/* ─── Modals ─── */}
      <DayModal
        visible={dayModalVisible}
        day={selectedDay}
        exams={dayExams}
        onClose={() => setDayModalVisible(false)}
        onSelect={exam => { setSelectedExam(exam); setDetailVisible(true); }}
        onAddAppointment={() => { setDayModalVisible(false); setFormVisible(true); }}
      />

      <AppointmentDetailModal
        visible={detailVisible}
        exam={selectedExam}
        users={users}
        onClose={() => setDetailVisible(false)}
        onUpdate={async (updated) => {
          try {
            const payload: any = {
              exam_type: mapExamTypeToBackend(updated.examType),
              exam_date: updated.scheduledDate,
              location: updated.location,
              chief_complaint: updated.notes,
            };
            if (updated.examinerId && updated.examinerId.trim() !== '') {
              payload.examining_doctor = updated.examinerId;
            } else {
              payload.examining_doctor = null;
            }
            await apiService.patch(`/occupational-health/medical-exams/${updated.id}/`, payload);
            showToast('Rendez-vous mis à jour', 'success');
            setDetailVisible(false);
            handleRefresh();
          } catch (err: any) {
            showToast('Erreur de mise à jour', 'error');
          }
        }}
      />

      <ScheduleFormModal
        visible={formVisible}
        workers={workers}
        users={users}
        onClose={() => setFormVisible(false)}
        onSave={handleSave}
        prefilledDate={selectedDay || undefined}
      />
    </View>
  );
}

// ─── Main Styles ──────────────────────────────────────────────────────────────
const ms = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.background },
  loadingWrap:  { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, backgroundColor: colors.background },
  loadingTxt:   { fontSize: 14, color: colors.textSecondary },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.outline },
  headerTitle:  { fontSize: 20, fontWeight: '800', color: colors.text },
  headerSub:    { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  kpiStrip:     { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.xl, padding: 8 },
  kpiItem:      { alignItems: 'center', paddingHorizontal: 10 },
  kpiNum:       { fontSize: 18, fontWeight: '800' },
  kpiLbl:       { fontSize: 10, color: colors.textSecondary, fontWeight: '500', marginTop: 1 },
  kpiDivider:   { width: 1, height: 28, backgroundColor: colors.outline },
  legendContent:{ paddingHorizontal: spacing.md, paddingVertical: 6, gap: spacing.md },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:    { width: 8, height: 8, borderRadius: 4 },
  legendTxt:    { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  tapHint:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 6, opacity: 0.55 },
  tapHintTxt:   { fontSize: 11, color: colors.textSecondary },
  errorBox:     { alignItems: 'center', paddingVertical: 60, gap: spacing.md },
  errorTxt:     { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 40 },
  retryBtn:     { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.lg },
  retryTxt:     { fontSize: 14, fontWeight: '600', color: '#FFF' },
  fab:          { position: 'absolute', bottom: spacing.lg, right: spacing.lg, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', ...shadows.lg },
});
