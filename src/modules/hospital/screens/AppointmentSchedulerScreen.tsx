import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import {
  Appointment,
  AppointmentStatus,
  AppointmentType,
  AppointmentUtils,
} from '../../../models/Appointment';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

// ─── Sample Data ─────────────────────────────────────────────
const weekDays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const today = new Date();

const generateWeekDates = (startDate: Date): Date[] => {
  const dates: Date[] = [];
  const start = new Date(startDate);
  start.setDate(start.getDate() - start.getDay());
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date);
  }
  return dates;
};

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', 
  '11:00', '11:30', '12:00', '14:00', '14:30', '15:00', 
  '15:30', '16:00', '16:30', '17:00'
];

const sampleAppointments: (Appointment & { patientName: string; doctorName: string })[] = [
  {
    id: '1',
    appointmentNumber: 'A260001',
    patientId: 'P1001',
    patientName: 'Marie Kabamba',
    providerId: 'D001',
    doctorName: 'Dr. Kalala',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    type: 'consultation',
    title: 'Consultation Générale',
    status: 'confirmed',
    priority: 'normal',
    scheduledDate: today.toISOString().split('T')[0],
    scheduledStartTime: '09:00',
    scheduledEndTime: '09:30',
    duration: 30,
    departmentId: 'DEP001',
    department: 'Médecine Générale',
    slotId: 'SLOT001',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    appointmentNumber: 'A260002',
    patientId: 'P1002',
    patientName: 'Jean Mukendi',
    providerId: 'D001',
    doctorName: 'Dr. Kalala',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    type: 'follow_up',
    title: 'Suivi Diabète',
    status: 'scheduled',
    priority: 'normal',
    scheduledDate: today.toISOString().split('T')[0],
    scheduledStartTime: '10:00',
    scheduledEndTime: '10:30',
    duration: 30,
    departmentId: 'DEP001',
    department: 'Médecine Générale',
    slotId: 'SLOT002',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    appointmentNumber: 'A260003',
    patientId: 'P1003',
    patientName: 'Pierre Kasongo',
    providerId: 'D002',
    doctorName: 'Dr. Mbala',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    type: 'emergency',
    title: 'Urgence - Douleur Abdominale',
    status: 'checked_in',
    priority: 'urgent',
    scheduledDate: today.toISOString().split('T')[0],
    scheduledStartTime: '08:30',
    scheduledEndTime: '09:00',
    duration: 30,
    departmentId: 'DEP002',
    department: 'Chirurgie',
    slotId: 'SLOT003',
    notes: 'Patient présente douleur abdominale aiguë depuis 2 jours',
    createdAt: new Date().toISOString(),
  },
  {
    id: '4',
    appointmentNumber: 'A260004',
    patientId: 'P1004',
    patientName: 'Sophie Mwamba',
    providerId: 'D003',
    doctorName: 'Dr. Mukoko',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    type: 'procedure',
    title: 'Échographie Abdominale',
    status: 'in_progress',
    priority: 'normal',
    scheduledDate: today.toISOString().split('T')[0],
    scheduledStartTime: '11:00',
    scheduledEndTime: '11:45',
    duration: 45,
    departmentId: 'DEP003',
    department: 'Radiologie',
    slotId: 'SLOT004',
    createdAt: new Date().toISOString(),
  },
  {
    id: '5',
    appointmentNumber: 'A260005',
    patientId: 'P1005',
    patientName: 'David Mutombo',
    providerId: 'D001',
    doctorName: 'Dr. Kalala',
    organizationId: 'ORG001',
    facilityId: 'FAC001',
    type: 'consultation',
    title: 'Consultation Cardiologie',
    status: 'completed',
    priority: 'normal',
    scheduledDate: today.toISOString().split('T')[0],
    scheduledStartTime: '08:00',
    scheduledEndTime: '08:30',
    duration: 30,
    departmentId: 'DEP004',
    department: 'Cardiologie',
    slotId: 'SLOT005',
    createdAt: new Date().toISOString(),
  },
];

const doctors = [
  { id: 'D001', name: 'Dr. Kalala', specialty: 'Médecine Générale', color: colors.primary },
  { id: 'D002', name: 'Dr. Mbala', specialty: 'Chirurgie', color: colors.secondary },
  { id: 'D003', name: 'Dr. Mukoko', specialty: 'Radiologie', color: colors.info },
  { id: 'D004', name: 'Dr. Tshilombo', specialty: 'Pédiatrie', color: colors.success },
];

// ─── Section Header Component ────────────────────────────────
function SectionHeader({
  title,
  subtitle,
  icon,
  accentColor = colors.primary,
  ctaLabel,
  ctaIcon,
  onCtaPress,
}: {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
  ctaLabel?: string;
  ctaIcon?: keyof typeof Ionicons.glyphMap;
  onCtaPress?: () => void;
}) {
  return (
    <View style={secStyles.wrapper}>
      <View style={secStyles.divider}>
        <View style={[secStyles.dividerAccent, { backgroundColor: accentColor }]} />
        <View style={secStyles.dividerLine} />
      </View>
      <View style={secStyles.header}>
        <View style={secStyles.headerLeft}>
          <View style={[secStyles.iconBubble, { backgroundColor: accentColor + '14' }]}>
            <Ionicons name={icon} size={18} color={accentColor} />
          </View>
          <View>
            <Text style={secStyles.title}>{title}</Text>
            {subtitle && <Text style={secStyles.subtitle}>{subtitle}</Text>}
          </View>
        </View>
        {ctaLabel && (
          <TouchableOpacity
            style={[secStyles.ctaBtn, { backgroundColor: accentColor }]}
            onPress={onCtaPress}
            activeOpacity={0.7}
          >
            {ctaIcon && <Ionicons name={ctaIcon} size={15} color="#FFF" />}
            <Text style={secStyles.ctaText}>{ctaLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const secStyles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  dividerAccent: { width: 40, height: 3, borderRadius: 2 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.outline, marginLeft: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBubble: { width: 36, height: 36, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  ctaText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
});

// ─── Status Badge Component ──────────────────────────────────
function StatusBadge({ status }: { status: AppointmentStatus }) {
  const color = AppointmentUtils.getStatusColor(status);
  const labels: Record<AppointmentStatus, string> = {
    'scheduled': 'Planifié',
    'confirmed': 'Confirmé',
    'checked_in': 'Arrivé',
    'in_progress': 'En Cours',
    'completed': 'Terminé',
    'cancelled': 'Annulé',
    'no_show': 'Absent',
    'rescheduled': 'Reporté',
  };
  return (
    <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{labels[status]}</Text>
    </View>
  );
}

// ─── Appointment Card Component ──────────────────────────────
function AppointmentCard({ 
  appointment, 
  onPress 
}: { 
  appointment: typeof sampleAppointments[0];
  onPress?: () => void;
}) {
  const doctor = doctors.find(d => d.id === appointment.providerId);
  const color = doctor?.color || colors.primary;
  const isPast = appointment.status === 'completed' || appointment.status === 'cancelled' || appointment.status === 'no_show';

  return (
    <TouchableOpacity
      style={[
        styles.appointmentCard,
        { borderLeftColor: color, borderLeftWidth: 4 },
        isPast && { opacity: 0.6 },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.appointmentHeader}>
        <View style={styles.appointmentTime}>
          <Ionicons name="time" size={14} color={colors.textSecondary} />
          <Text style={styles.appointmentTimeText}>
            {appointment.scheduledStartTime} - {appointment.scheduledEndTime}
          </Text>
        </View>
        <StatusBadge status={appointment.status} />
      </View>
      
      <Text style={styles.appointmentTitle}>{appointment.title}</Text>
      
      <View style={styles.appointmentDetails}>
        <View style={styles.appointmentDetail}>
          <Ionicons name="person" size={14} color={colors.textSecondary} />
          <Text style={styles.appointmentDetailText}>{appointment.patientName}</Text>
        </View>
        <View style={styles.appointmentDetail}>
          <Ionicons name="medkit" size={14} color={color} />
          <Text style={[styles.appointmentDetailText, { color }]}>{appointment.doctorName}</Text>
        </View>
      </View>

      {appointment.notes && (
        <Text style={styles.appointmentNotes} numberOfLines={1}>
          📝 {appointment.notes}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Component ──────────────────────────────────────────
export function AppointmentSchedulerScreen() {
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [searchQuery, setSearchQuery] = useState('');

  const weekDates = generateWeekDates(selectedDate);

  // Calculate stats
  const todayAppointments = sampleAppointments.filter(
    a => a.scheduledDate === today.toISOString().split('T')[0]
  );
  const stats = {
    total: todayAppointments.length,
    confirmed: todayAppointments.filter(a => a.status === 'confirmed' || a.status === 'scheduled').length,
    inProgress: todayAppointments.filter(a => a.status === 'in_progress' || a.status === 'checked_in').length,
    completed: todayAppointments.filter(a => a.status === 'completed').length,
    cancelled: todayAppointments.filter(a => a.status === 'cancelled' || a.status === 'no_show').length,
  };

  // Filter appointments
  const filteredAppointments = sampleAppointments.filter(a => {
    if (selectedDoctor && a.providerId !== selectedDoctor) return false;
    if (a.scheduledDate !== selectedDate.toISOString().split('T')[0]) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        a.patientName.toLowerCase().includes(query) ||
        a.doctorName.toLowerCase().includes(query) ||
        a.title.toLowerCase().includes(query)
      );
    }
    return true;
  }).sort((a, b) => a.scheduledStartTime.localeCompare(b.scheduledStartTime));

  // Navigate dates
  const goToPrevDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const goToNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const isToday = selectedDate.toDateString() === today.toDateString();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>📅 Rendez-vous</Text>
          <Text style={styles.headerSubtitle}>Gestion des consultations et rendez-vous</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.7}>
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.addBtnText}>Nouveau RDV</Text>
        </TouchableOpacity>
      </View>

      {/* ══════ SECTION: Statistiques ══════ */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.infoLight }]}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.successLight }]}>
          <Text style={styles.statValue}>{stats.confirmed}</Text>
          <Text style={styles.statLabel}>Confirmés</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.warningLight }]}>
          <Text style={styles.statValue}>{stats.inProgress}</Text>
          <Text style={styles.statLabel}>En Cours</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.primaryLight || '#E0E7FF' }]}>
          <Text style={styles.statValue}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Terminés</Text>
        </View>
      </View>

      {/* ══════ SECTION: Calendrier ══════ */}
      <SectionHeader
        title="Calendrier"
        icon="calendar"
        accentColor={colors.info}
      />
      
      {/* Date Navigation */}
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={goToPrevDay} style={styles.dateNavBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.dateNavCenter}
          onPress={() => setSelectedDate(today)}
        >
          <Text style={styles.dateNavText}>
            {selectedDate.toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long' 
            })}
          </Text>
          {isToday && (
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>Aujourd'hui</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity onPress={goToNextDay} style={styles.dateNavBtn}>
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Week View */}
      <View style={styles.weekView}>
        {weekDates.map((date, idx) => {
          const isSelected = date.toDateString() === selectedDate.toDateString();
          const isTodayDate = date.toDateString() === today.toDateString();
          const hasAppointments = sampleAppointments.some(
            a => a.scheduledDate === date.toISOString().split('T')[0]
          );
          
          return (
            <TouchableOpacity
              key={idx}
              style={[
                styles.weekDay,
                isSelected && styles.weekDaySelected,
                isTodayDate && !isSelected && styles.weekDayToday,
              ]}
              onPress={() => setSelectedDate(date)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.weekDayName,
                isSelected && { color: '#FFF' },
              ]}>
                {weekDays[date.getDay()]}
              </Text>
              <Text style={[
                styles.weekDayNumber,
                isSelected && { color: '#FFF' },
              ]}>
                {date.getDate()}
              </Text>
              {hasAppointments && !isSelected && (
                <View style={styles.weekDayDot} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ══════ SECTION: Médecins ══════ */}
      <SectionHeader
        title="Filtrer par Médecin"
        icon="person"
        accentColor={colors.secondary}
      />
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.doctorScroll}
        contentContainerStyle={styles.doctorScrollContent}
      >
        <TouchableOpacity
          style={[
            styles.doctorChip,
            !selectedDoctor && styles.doctorChipSelected,
          ]}
          onPress={() => setSelectedDoctor(null)}
          activeOpacity={0.7}
        >
          <Ionicons name="people" size={16} color={!selectedDoctor ? '#FFF' : colors.textSecondary} />
          <Text style={[
            styles.doctorChipText,
            !selectedDoctor && { color: '#FFF' },
          ]}>
            Tous
          </Text>
        </TouchableOpacity>
        {doctors.map((doctor) => {
          const isSelected = selectedDoctor === doctor.id;
          return (
            <TouchableOpacity
              key={doctor.id}
              style={[
                styles.doctorChip,
                isSelected && { backgroundColor: doctor.color, borderColor: doctor.color },
              ]}
              onPress={() => setSelectedDoctor(isSelected ? null : doctor.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.doctorColor, { backgroundColor: doctor.color }]} />
              <View>
                <Text style={[
                  styles.doctorChipText,
                  isSelected && { color: '#FFF' },
                ]}>
                  {doctor.name}
                </Text>
                <Text style={[
                  styles.doctorChipSpecialty,
                  isSelected && { color: 'rgba(255,255,255,0.8)' },
                ]}>
                  {doctor.specialty}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ══════ SECTION: Rendez-vous du Jour ══════ */}
      <SectionHeader
        title="Rendez-vous"
        subtitle={`${filteredAppointments.length} rendez-vous`}
        icon="list"
        accentColor={colors.primary}
        ctaLabel="Actualiser"
        ctaIcon="refresh"
      />

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher patient, médecin..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Appointments List */}
      <View style={styles.appointmentsList}>
        {filteredAppointments.map((appointment) => (
          <AppointmentCard key={appointment.id} appointment={appointment} />
        ))}
        {filteredAppointments.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyStateText}>Aucun rendez-vous pour cette date</Text>
            <TouchableOpacity style={styles.emptyStateBtn} activeOpacity={0.7}>
              <Ionicons name="add" size={18} color={colors.primary} />
              <Text style={styles.emptyStateBtnText}>Ajouter un rendez-vous</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ══════ SECTION: Créneaux Disponibles ══════ */}
      <SectionHeader
        title="Créneaux Disponibles"
        subtitle="Cliquez pour réserver"
        icon="time"
        accentColor={colors.success}
      />
      <View style={styles.timeSlotsGrid}>
        {timeSlots.map((slot) => {
          const isBooked = filteredAppointments.some(
            a => a.scheduledStartTime === slot
          );
          return (
            <TouchableOpacity
              key={slot}
              style={[
                styles.timeSlot,
                isBooked && styles.timeSlotBooked,
              ]}
              disabled={isBooked}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.timeSlotText,
                isBooked && { color: colors.textTertiary },
              ]}>
                {slot}
              </Text>
              {isBooked ? (
                <Ionicons name="close-circle" size={14} color={colors.textTertiary} />
              ) : (
                <Ionicons name="add-circle" size={14} color={colors.success} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: isDesktop ? 32 : 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  addBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: isDesktop ? 1 : undefined,
    width: isDesktop ? undefined : (width - 48) / 2,
    padding: 16,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Date Navigation
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 12,
    marginBottom: 16,
    ...shadows.sm,
  },
  dateNavBtn: {
    padding: 8,
  },
  dateNavCenter: {
    alignItems: 'center',
  },
  dateNavText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textTransform: 'capitalize',
  },
  todayBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginTop: 4,
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
  },

  // Week View
  weekView: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  weekDaySelected: {
    backgroundColor: colors.primary,
  },
  weekDayToday: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  weekDayName: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  weekDayNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  weekDayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 4,
  },

  // Doctor Scroll
  doctorScroll: {
    marginBottom: 24,
  },
  doctorScrollContent: {
    gap: 10,
    paddingRight: 16,
  },
  doctorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  doctorChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  doctorChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  doctorChipSpecialty: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  doctorColor: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Search
  searchContainer: {
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },

  // Appointments List
  appointmentsList: {
    gap: 12,
    marginBottom: 24,
  },
  appointmentCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 16,
    ...shadows.sm,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appointmentTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appointmentTimeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  appointmentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  appointmentDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  appointmentDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appointmentDetailText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  appointmentNotes: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 8,
    fontStyle: 'italic',
  },

  // Status Badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
  },
  emptyStateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
  },
  emptyStateBtnText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },

  // Time Slots
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.success,
    minWidth: 90,
  },
  timeSlotBooked: {
    backgroundColor: colors.surfaceVariant,
    borderColor: colors.outline,
    borderStyle: 'dashed',
  },
  timeSlotText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
});

export default AppointmentSchedulerScreen;
