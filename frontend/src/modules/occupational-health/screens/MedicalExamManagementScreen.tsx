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
          const dayExams  = dayMap[cell.key] || [];
          const isSelected = selectedDay === cell.key;
          const isToday    = cell.key === today;
          const dotColors  = [...new Set(dayExams.map(e => ALL_EXAM_TYPES[e.examType]?.color || colors.primary))].slice(0, 3);
          const overflow   = Math.max(0, dayExams.length - 3);

          return (
            <TouchableOpacity
              key={idx}
              style={[cgS.cell, { width: CELL_W, height: CELL_W + 20 }, isSelected && cgS.cellSel]}
              onPress={() => cell.current && onSelectDay(cell.key)}
              activeOpacity={0.7}
            >
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
              {dayExams.length > 0 && (
                <View style={cgS.dotsRow}>
                  {dotColors.map((col, di) => (
                    <View key={di} style={[cgS.dot, { backgroundColor: col }]} />
                  ))}
                  {overflow > 0 && <Text style={cgS.overflow}>+{overflow}</Text>}
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
  container:    { backgroundColor: colors.surface, borderRadius: borderRadius.xl, marginHorizontal: spacing.md, padding: spacing.md, ...shadows.sm },
  nav:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  navBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceVariant, justifyContent: 'center', alignItems: 'center' },
  monthTitle:   { fontSize: 17, fontWeight: '700', color: colors.text },
  dayHeaders:   { flexDirection: 'row', marginBottom: 4 },
  dayHeader:    { alignItems: 'center', paddingVertical: 4 },
  dayHeaderTxt: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  grid:         { flexDirection: 'row', flexWrap: 'wrap' },
  cell:         { alignItems: 'center', paddingTop: 5, paddingBottom: 3 },
  cellSel:      { backgroundColor: colors.primary + '10', borderRadius: borderRadius.md },
  dayNum:       { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  todayCircle:  { backgroundColor: colors.primary + '22' },
  selCircle:    { backgroundColor: colors.primary },
  dayNumTxt:    { fontSize: 13, fontWeight: '500', color: colors.text },
  dayNumOther:  { color: colors.outline },
  todayTxt:     { color: colors.primary, fontWeight: '700' },
  selTxt:       { color: '#FFFFFF', fontWeight: '700' },
  dotsRow:      { flexDirection: 'row', gap: 2, marginTop: 3, alignItems: 'center' },
  dot:          { width: 5, height: 5, borderRadius: 3 },
  overflow:     { fontSize: 8, color: colors.textSecondary, fontWeight: '700' },
});

// ─── Day Appointments Panel ───────────────────────────────────────────────────
function DayPanel({
  day, exams, onSelect,
}: {
  day: string | null;
  exams: ExamSchedule[];
  onSelect: (e: ExamSchedule) => void;
}) {
  if (!day) return null;
  const d     = isoToDate(day);
  const label = `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;

  return (
    <View style={dpS.container}>
      <View style={dpS.header}>
        <Text style={dpS.dateLabel}>{label}</Text>
        <View style={dpS.countPill}>
          <Text style={dpS.countTxt}>{exams.length} RDV</Text>
        </View>
      </View>

      {exams.length === 0 ? (
        <View style={dpS.empty}>
          <Ionicons name="calendar-clear-outline" size={36} color={colors.outline} />
          <Text style={dpS.emptyTxt}>No appointments on this day</Text>
        </View>
      ) : (
        exams.map(exam => {
          const t = ALL_EXAM_TYPES[exam.examType] || { label: exam.examType, color: colors.primary, icon: 'medical' };
          return (
            <TouchableOpacity key={exam.id} style={dpS.card} onPress={() => onSelect(exam)} activeOpacity={0.75}>
              <View style={[dpS.colorBar, { backgroundColor: t.color }]} />
              <View style={[dpS.iconBox, { backgroundColor: t.color + '18' }]}>
                <Ionicons name={t.icon as any} size={18} color={t.color} />
              </View>
              <View style={dpS.cardBody}>
                <Text style={dpS.workerName} numberOfLines={1}>{exam.workerName}</Text>
                <Text style={dpS.examType}>{t.label}</Text>
                {exam.examiner ? (
                  <Text style={dpS.examiner} numberOfLines={1}>Dr. {exam.examiner}</Text>
                ) : null}
              </View>
              <StatusBadge status={exam.status} />
              <Ionicons name="chevron-forward" size={15} color={colors.outline} />
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

const dpS = StyleSheet.create({
  container:  { marginHorizontal: spacing.md, marginTop: spacing.md },
  header:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  dateLabel:  { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  countPill:  { backgroundColor: colors.primary + '18', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  countTxt:   { fontSize: 11, fontWeight: '700', color: colors.primary },
  empty:      { alignItems: 'center', paddingVertical: 36, gap: spacing.sm },
  emptyTxt:   { fontSize: 13, color: colors.textSecondary },
  card:       { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: borderRadius.lg, marginBottom: spacing.sm, overflow: 'hidden', ...shadows.sm, minHeight: 64 },
  colorBar:   { width: 4, alignSelf: 'stretch' },
  iconBox:    { width: 38, height: 38, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center', marginLeft: 4 },
  cardBody:   { flex: 1, paddingVertical: spacing.sm },
  workerName: { fontSize: 13, fontWeight: '700', color: colors.text },
  examType:   { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  examiner:   { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
});

// ─── Appointment Detail Modal ─────────────────────────────────────────────────
function AppointmentDetailModal({
  visible, exam, onClose, onEdit,
}: {
  visible: boolean;
  exam: ExamSchedule | null;
  onClose: () => void;
  onEdit: () => void;
}) {
  const slideY = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
    } else {
      slideY.setValue(400);
    }
  }, [visible]);

  if (!exam) return null;
  const t          = ALL_EXAM_TYPES[exam.examType] || { label: exam.examType, color: colors.primary, icon: 'medical' };
  const statusCfg  = STATUS_CFG[exam.status] || STATUS_CFG.scheduled;
  const initials   = getInitials(exam.workerName);

  const detailRows = [
    { icon: 'calendar-outline',      label: 'Date',     value: exam.scheduledDate     },
    { icon: 'person-circle-outline', label: 'Examiner', value: exam.examiner || '—'   },
    { icon: 'location-outline',      label: 'Location', value: exam.location  || '—'  },
    ...(exam.notes ? [{ icon: 'document-text-outline', label: 'Notes', value: exam.notes }] : []),
  ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={adS.overlay}>
        <TouchableOpacity style={adS.backdrop} onPress={onClose} activeOpacity={1} />
        <Animated.View style={[adS.sheet, { transform: [{ translateY: slideY }] }]}>
          <View style={adS.handle} />
          <View style={[adS.stripe, { backgroundColor: t.color }]} />

          <View style={adS.body}>
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

            {/* Details */}
            {detailRows.map((row, i) => (
              <View key={i} style={adS.detailRow}>
                <View style={[adS.detailIcon, { backgroundColor: t.color + '12' }]}>
                  <Ionicons name={row.icon as any} size={16} color={t.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={adS.detailLabel}>{row.label}</Text>
                  <Text style={adS.detailValue}>{row.value}</Text>
                </View>
              </View>
            ))}

            {/* Actions */}
            <View style={adS.actions}>
              <TouchableOpacity style={adS.actionBtn} onPress={onEdit} activeOpacity={0.8}>
                <Ionicons name="create-outline" size={17} color={colors.primary} />
                <Text style={[adS.actionTxt, { color: colors.primary }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[adS.actionBtn, { backgroundColor: '#F0FDF4', borderColor: '#22C55E60' }]} activeOpacity={0.8}>
                <Ionicons name="mail-outline" size={17} color="#22C55E" />
                <Text style={[adS.actionTxt, { color: '#22C55E' }]}>Notify</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[adS.actionBtn, { backgroundColor: '#FEF2F2', borderColor: '#EF444460' }]} activeOpacity={0.8}>
                <Ionicons name="close-circle-outline" size={17} color="#EF4444" />
                <Text style={[adS.actionTxt, { color: '#EF4444' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const adS = StyleSheet.create({
  overlay:     { flex: 1, justifyContent: 'flex-end' },
  backdrop:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:       { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 32, overflow: 'hidden', ...shadows.lg },
  handle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.outline, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  stripe:      { height: 4, width: '100%' },
  body:        { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  workerRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg, paddingBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.outline },
  avatar:      { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  avatarTxt:   { fontSize: 20, fontWeight: '800' },
  workerName:  { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
  typeChip:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  typeTxt:     { fontSize: 12, fontWeight: '600' },
  detailRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.md },
  detailIcon:  { width: 36, height: 36, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  detailLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '500', marginBottom: 2 },
  detailValue: { fontSize: 14, color: colors.text, fontWeight: '500' },
  actions:     { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.outline },
  actionBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 11, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.primary + '60', backgroundColor: colors.primary + '10' },
  actionTxt:   { fontSize: 13, fontWeight: '600' },
});

// ─── Exam Catalog Picker ──────────────────────────────────────────────────────
function ExamCatalogPicker({
  selected, onSelect,
}: { selected: string | null; onSelect: (id: string) => void }) {
  const CARD_W = (SCREEN_W - 32 - 16 - spacing.sm) / 2;

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
              const isSel = selected === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[ecS.card, { width: CARD_W }, isSel && { borderColor: item.color, borderWidth: 2, backgroundColor: item.color + '0D' }]}
                  onPress={() => onSelect(item.id)}
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
  examType: string;
  scheduledDate: string;
  examiner: string;
  examinerId: string;
  location: string;
  notes: string;
}

const BLANK_FORM: ScheduleFormData = {
  workerId: '', workerName: '', examType: '', scheduledDate: '',
  examiner: '', examinerId: '', location: '', notes: '',
};

function ScheduleFormModal({
  visible, workers, users, onClose, onSave,
}: {
  visible: boolean;
  workers: any[];
  users: any[];
  onClose: () => void;
  onSave: (data: ScheduleFormData) => void;
}) {
  const [step, setStep]             = useState(0);
  const [form, setForm]             = useState<ScheduleFormData>(BLANK_FORM);
  const [workerSearch, setWorkerSearch] = useState('');
  const [showExaminerPicker, setShowExaminerPicker] = useState(false);
  const slideX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setStep(0);
      setForm(BLANK_FORM);
      setWorkerSearch('');
    }
  }, [visible]);

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
    form.examType !== '',
    form.scheduledDate !== '' && form.examiner !== '',
  ];

  const STEP_TITLES = ['Select Worker', 'Choose Exam Type', 'Schedule Details'];
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
                <ExamCatalogPicker
                  selected={form.examType || null}
                  onSelect={id => setForm(f => ({ ...f, examType: id }))}
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
                  {form.examType ? (() => {
                    const t = ALL_EXAM_TYPES[form.examType];
                    return t ? (
                      <View style={[sfS.summaryChip, { backgroundColor: t.color + '14', borderColor: t.color + '40' }]}>
                        <Ionicons name={t.icon as any} size={12} color={t.color} />
                        <Text style={[sfS.summaryChipTxt, { color: t.color }]} numberOfLines={1}>{t.label}</Text>
                      </View>
                    ) : null;
                  })() : null}
                </View>

                <View style={sfS.formGroup}>
                  <Text style={sfS.label}>Scheduled Date *</Text>
                  <DateInput
                    value={form.scheduledDate}
                    onChangeText={d => setForm(f => ({ ...f, scheduledDate: d }))}
                    minimumDate={new Date()}
                  />
                </View>

                <View style={sfS.formGroup}>
                  <Text style={sfS.label}>Examiner *</Text>
                  <TouchableOpacity
                    style={sfS.dropdownBtn}
                    onPress={() => setShowExaminerPicker(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={[sfS.dropdownTxt, !form.examiner && { color: colors.textSecondary }]}>
                      {form.examiner || 'Select examiner'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>

                  <Modal visible={showExaminerPicker} transparent animationType="slide">
                    <View style={sfS.pickerOverlay}>
                      <View style={sfS.pickerSheet}>
                        <View style={sfS.pickerHeader}>
                          <Text style={sfS.pickerTitle}>Select Examiner</Text>
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
                  <Text style={sfS.label}>Location</Text>
                  <TextInput
                    style={sfS.input}
                    value={form.location}
                    onChangeText={v => setForm(f => ({ ...f, location: v }))}
                    placeholder="Exam room / clinic"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <View style={sfS.formGroup}>
                  <Text style={sfS.label}>Notes</Text>
                  <TextInput
                    style={[sfS.input, { minHeight: 90, textAlignVertical: 'top' }]}
                    value={form.notes}
                    onChangeText={v => setForm(f => ({ ...f, notes: v }))}
                    placeholder="Additional instructions…"
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
                <Text style={sfS.primaryBtnTxt}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[sfS.primaryBtn, !canAdvance[2] && sfS.primaryBtnDisabled]}
                onPress={() => canAdvance[2] && onSave(form)}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                <Text style={sfS.primaryBtnTxt}>Schedule Exam</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const sfS = StyleSheet.create({
  overlay:          { flex: 1, justifyContent: 'flex-end' },
  sheet:            { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, height: '92%', overflow: 'hidden', ...shadows.lg },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  iconBtn:          { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceVariant, justifyContent: 'center', alignItems: 'center' },
  title:            { fontSize: 17, fontWeight: '700', color: colors.text },
  stepRow:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  stepItem:         { alignItems: 'center', gap: 4 },
  stepCircle:       { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceVariant, justifyContent: 'center', alignItems: 'center' },
  stepDone:         { backgroundColor: '#22C55E' },
  stepActive:       { backgroundColor: colors.primary },
  stepLabel:        { fontSize: 10, color: colors.textSecondary, fontWeight: '500', textAlign: 'center', maxWidth: 68 },
  stepLabelActive:  { color: colors.primary, fontWeight: '700' },
  stepLine:         { flex: 1, height: 1, backgroundColor: colors.outline, marginBottom: 18 },
  stepLineDone:     { backgroundColor: '#22C55E' },
  searchBox:        { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: 10, marginBottom: spacing.md },
  searchInput:      { flex: 1, fontSize: 14, color: colors.text },
  workerRow:        { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: 6, borderWidth: 1, borderColor: colors.outline },
  workerRowSel:     { borderColor: colors.primary, backgroundColor: colors.primary + '08' },
  workerAvatar:     { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceVariant, justifyContent: 'center', alignItems: 'center' },
  workerAvatarTxt:  { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  workerName:       { fontSize: 13, fontWeight: '600', color: colors.text },
  workerMeta:       { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  summaryRow:       { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' },
  summaryChip:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: colors.primary + '12', borderWidth: 1, borderColor: colors.primary + '30' },
  summaryChipTxt:   { fontSize: 12, fontWeight: '600', color: colors.primary },
  formGroup:        { marginBottom: spacing.lg },
  label:            { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 7 },
  dropdownBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: 12, minHeight: 46 },
  dropdownTxt:      { fontSize: 14, color: colors.text, flex: 1 },
  input:            { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 14, color: colors.text, minHeight: 46 },
  pickerOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  pickerSheet:      { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  pickerHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outline },
  pickerTitle:      { fontSize: 16, fontWeight: '600', color: colors.text },
  pickerOption:     { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outline },
  pickerOptionTxt:  { fontSize: 14, color: colors.text },
  footer:           { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.outline },
  primaryBtn:       { backgroundColor: colors.primary, borderRadius: borderRadius.lg, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  primaryBtnDisabled:{ backgroundColor: colors.outline },
  primaryBtnTxt:    { fontSize: 15, fontWeight: '700', color: '#FFF' },
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

  const handleSave = useCallback(async (form: ScheduleFormData) => {
    try {
      if (!form.workerId || !form.examType || !form.scheduledDate) {
        showToast('Please fill all required fields', 'error');
        return;
      }
      const payload = {
        worker:                parseInt(form.workerId),
        exam_type:             form.examType,
        exam_date:             form.scheduledDate,
        examining_doctor:      form.examinerId ? parseInt(form.examinerId) : undefined,
        chief_complaint:       form.notes || '',
        results_summary:       '',
        recommendations:       '',
        examination_completed: false,
        follow_up_required:    false,
      };
      await apiService.post('/occupational-health/medical-exams/', payload);
      showToast('Exam scheduled successfully', 'success');
      setFormVisible(false);
      handleRefresh();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || err?.message || 'Failed to schedule exam', 'error');
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
        <Text style={ms.loadingTxt}>Loading schedule…</Text>
      </View>
    );
  }

  return (
    <View style={ms.container}>
      {toastMsg && <SimpleToastNotification message={toastMsg} />}

      {/* ─── Header with compact KPI strip ─── */}
      <View style={ms.header}>
        <View style={{ flex: 1 }}>
          <Text style={ms.headerTitle}>Medical Exams</Text>
          <Text style={ms.headerSub}>Occupational health scheduling</Text>
        </View>
        <View style={ms.kpiStrip}>
          <View style={ms.kpiItem}>
            <Text style={[ms.kpiNum, { color: '#3B82F6' }]}>{stats.upcoming}</Text>
            <Text style={ms.kpiLbl}>Upcoming</Text>
          </View>
          <View style={ms.kpiDivider} />
          <View style={ms.kpiItem}>
            <Text style={[ms.kpiNum, { color: '#22C55E' }]}>{stats.completed}</Text>
            <Text style={ms.kpiLbl}>Done</Text>
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
              <Text style={ms.retryTxt}>Retry</Text>
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
                onSelectDay={setSelectedDay}
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

            {/* Day appointments */}
            <DayPanel
              day={selectedDay}
              exams={dayExams}
              onSelect={exam => { setSelectedExam(exam); setDetailVisible(true); }}
            />
          </>
        )}
      </ScrollView>

      {/* ─── FAB ─── */}
      <TouchableOpacity style={ms.fab} onPress={() => setFormVisible(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>

      {/* ─── Modals ─── */}
      <AppointmentDetailModal
        visible={detailVisible}
        exam={selectedExam}
        onClose={() => setDetailVisible(false)}
        onEdit={() => { setDetailVisible(false); setFormVisible(true); }}
      />

      <ScheduleFormModal
        visible={formVisible}
        workers={workers}
        users={users}
        onClose={() => setFormVisible(false)}
        onSave={handleSave}
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
  errorBox:     { alignItems: 'center', paddingVertical: 60, gap: spacing.md },
  errorTxt:     { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 40 },
  retryBtn:     { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.lg },
  retryTxt:     { fontSize: 14, fontWeight: '600', color: '#FFF' },
  fab:          { position: 'absolute', bottom: spacing.lg, right: spacing.lg, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', ...shadows.lg },
});
