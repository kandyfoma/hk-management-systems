import React, { useState, useMemo, useEffect } from 'react';
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
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../store/store';
import { addAppointment, updateAppointment, setPatients, setAppointments } from '../../../store/slices/hospitalSlice';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import {
  Appointment,
  AppointmentStatus,
  AppointmentType,
  AppointmentUtils,
} from '../../../models/Appointment';
import { samplePatients, sampleAppointments } from '../../../services/sampleAppointmentData';

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
  patients,
  doctors,
  onPress 
}: { 
  appointment: any;
  patients: any[];
  doctors: any[];
  onPress?: () => void;
}) {
  // Find patient and doctor details
  const patient = patients.find(p => p.id === appointment.patientId);
  const doctor = doctors.find(d => d.id === appointment.doctorId);
  
  const patientName = patient ? `${patient.firstName} ${patient.lastName}` : 'Patient inconnu';
  const doctorName = doctor ? doctor.name : 'Médecin inconnu';
  const color = doctor?.color || colors.primary;
  
  const isPast = appointment.status === 'completed' || appointment.status === 'cancelled' || appointment.status === 'no-show';

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
            {appointment.appointmentTime} ({appointment.duration}min)
          </Text>
        </View>
        <StatusBadge status={appointment.status} />
      </View>
      
      <Text style={styles.appointmentTitle}>{appointment.type}</Text>
      
      <View style={styles.appointmentDetails}>
        <View style={styles.appointmentDetail}>
          <Ionicons name="person" size={14} color={colors.textSecondary} />
          <Text style={styles.appointmentDetailText}>{patientName}</Text>
        </View>
        <View style={styles.appointmentDetail}>
          <Ionicons name="medkit" size={14} color={color} />
          <Text style={[styles.appointmentDetailText, { color }]}>{doctorName}</Text>
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
  const dispatch = useDispatch();
  const { patients, appointments } = useSelector((state: RootState) => state.hospital);
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMainDropdown, setShowMainDropdown] = useState(false);
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);

  const weekDates = generateWeekDates(selectedDate);

  // Load sample data if not already loaded
  useEffect(() => {
    if (patients.length === 0) {
      dispatch(setPatients(samplePatients));
    }
    if (appointments.length === 0) {
      dispatch(setAppointments(sampleAppointments));
    }
  }, [dispatch, patients.length, appointments.length]);

  // Get doctors from mock data (in real app, this would come from a users/staff slice)
  const doctors = useMemo(() => [
    { id: 'D001', name: 'Dr. Kalala', specialty: 'Médecine Générale', color: colors.primary },
    { id: 'D002', name: 'Dr. Mbala', specialty: 'Chirurgie', color: colors.secondary },
    { id: 'D003', name: 'Dr. Mukoko', specialty: 'Radiologie', color: colors.info },
    { id: 'D004', name: 'Dr. Tshilombo', specialty: 'Pédiatrie', color: colors.success },
  ], []);

  // Calculate stats from Redux appointments
  const todayAppointments = useMemo(() => {
    return appointments.filter(
      a => a.appointmentDate === today.toISOString().split('T')[0]
    );
  }, [appointments]);

  const stats = useMemo(() => ({
    total: todayAppointments.length,
    confirmed: todayAppointments.filter(a => a.status === 'confirmed' || a.status === 'scheduled').length,
    inProgress: todayAppointments.filter(a => a.status === 'scheduled').length, // Updated mapping
    completed: todayAppointments.filter(a => a.status === 'completed').length,
    cancelled: todayAppointments.filter(a => a.status === 'cancelled' || a.status === 'no-show').length,
  }), [todayAppointments]);

  // Get search suggestions for main search dropdown
  const searchSuggestions = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    
    const query = searchQuery.toLowerCase();
    const suggestions: Array<{
      id: string;
      type: 'patient' | 'doctor';
      title: string;
      subtitle: string;
      data: any;
    }> = [];
    
    // Add matching patients
    const matchingPatients = patients.filter(patient => {
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      return (
        fullName.includes(query) ||
        patient.patientNumber?.toLowerCase().includes(query) ||
        patient.phone?.toLowerCase().includes(query) ||
        patient.id.toLowerCase().includes(query)
      );
    }).slice(0, 4);
    
    matchingPatients.forEach(patient => {
      suggestions.push({
        id: `patient-${patient.id}`,
        type: 'patient',
        title: `${patient.firstName} ${patient.lastName}`,
        subtitle: `Patient • ${patient.patientNumber || patient.id}`,
        data: patient
      });
    });
    
    // Add matching doctors
    const matchingDoctors = doctors.filter(doctor => {
      return (
        doctor.name.toLowerCase().includes(query) ||
        doctor.specialty.toLowerCase().includes(query) ||
        doctor.id.toLowerCase().includes(query)
      );
    }).slice(0, 4);
    
    matchingDoctors.forEach(doctor => {
      suggestions.push({
        id: `doctor-${doctor.id}`,
        type: 'doctor',
        title: doctor.name,
        subtitle: `Médecin • ${doctor.specialty}`,
        data: doctor
      });
    });
    
    return suggestions;
  }, [searchQuery, patients, doctors]);
  const filteredAppointments = useMemo(() => {
    let filtered = appointments.filter(a => {
      if (selectedDoctor && a.doctorId !== selectedDoctor) return false;
      if (a.appointmentDate !== selectedDate.toISOString().split('T')[0]) return false;
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        
        // Find patient by ID
        const patient = patients.find(p => p.id === a.patientId);
        const patientName = patient ? `${patient.firstName} ${patient.lastName}` : '';
        
        // Find doctor by ID  
        const doctor = doctors.find(d => d.id === a.doctorId);
        const doctorName = doctor ? doctor.name : '';
        
        return (
          patientName.toLowerCase().includes(query) ||
          doctorName.toLowerCase().includes(query) ||
          a.type.toLowerCase().includes(query) ||
          (a.notes && a.notes.toLowerCase().includes(query))
        );
      }
      return true;
    });
    
    return filtered.sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime));
  }, [appointments, patients, doctors, selectedDoctor, selectedDate, searchQuery]);

  // Create a new appointment
  const handleCreateAppointment = (appointmentData: {
    patientId: string;
    doctorId: string;
    date: string;
    time: string;
    duration: number;
    type: string;
    notes?: string;
  }) => {
    const newAppointment = {
      id: Date.now().toString(),
      patientId: appointmentData.patientId,
      doctorId: appointmentData.doctorId,
      appointmentDate: appointmentData.date,
      appointmentTime: appointmentData.time,
      duration: appointmentData.duration,
      type: appointmentData.type,
      status: 'scheduled' as const,
      notes: appointmentData.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    dispatch(addAppointment(newAppointment));
    setShowNewAppointmentModal(false);
  };
  
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
        <TouchableOpacity 
          style={styles.addBtn} 
          activeOpacity={0.7}
          onPress={() => setShowNewAppointmentModal(true)}
        >
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
          const hasAppointments = appointments.some(
            a => a.appointmentDate === date.toISOString().split('T')[0]
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
        <View style={styles.searchDropdownContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher patient, médecin, ID patient..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setShowMainDropdown(text.length >= 2);
              }}
              onFocus={() => setShowMainDropdown(searchQuery.length >= 2)}
              onBlur={() => {
                // Delay to allow dropdown selection
                setTimeout(() => setShowMainDropdown(false), 150);
              }}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => {
                setSearchQuery('');
                setShowMainDropdown(false);
              }}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>
          
          {/* Search Dropdown */}
          {showMainDropdown && searchSuggestions.length > 0 && (
            <View style={styles.searchDropdown}>
              {searchSuggestions.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion.id}
                  style={styles.searchDropdownItem}
                  onPress={() => {
                    setSearchQuery(suggestion.title);
                    setShowMainDropdown(false);
                  }}
                >
                  <View style={styles.searchDropdownContent}>
                    <Text style={styles.searchDropdownTitle}>
                      {suggestion.title}
                    </Text>
                    <Text style={styles.searchDropdownSubtitle}>
                      {suggestion.subtitle}
                    </Text>
                  </View>
                  <Ionicons 
                    name={suggestion.type === 'patient' ? 'person' : 'medical'} 
                    size={16} 
                    color={suggestion.type === 'patient' ? colors.primary : colors.secondary} 
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Appointments List */}
      <View style={styles.appointmentsList}>
        {filteredAppointments.map((appointment) => (
          <AppointmentCard 
            key={appointment.id} 
            appointment={appointment} 
            patients={patients}
            doctors={doctors}
          />
        ))}
        {filteredAppointments.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyStateText}>Aucun rendez-vous pour cette date</Text>
            <TouchableOpacity 
              style={styles.emptyStateBtn} 
              activeOpacity={0.7}
              onPress={() => setShowNewAppointmentModal(true)}
            >
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
            a => a.appointmentTime === slot
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
              onPress={() => {
                if (!isBooked) {
                  setShowNewAppointmentModal(true);
                }
              }}
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
      
      {/* Simple Appointment Creation Modal */}
      {showNewAppointmentModal && (
        <NewAppointmentModal
          visible={showNewAppointmentModal}
          onClose={() => setShowNewAppointmentModal(false)}
          onCreateAppointment={handleCreateAppointment}
          patients={patients}
          doctors={doctors}
          selectedDate={selectedDate.toISOString().split('T')[0]}
        />
      )}
    </ScrollView>
  );
}

// ─── New Appointment Modal ────────────────────────────────────
function NewAppointmentModal({
  visible,
  onClose,
  onCreateAppointment,
  patients,
  doctors,
  selectedDate
}: {
  visible: boolean;
  onClose: () => void;
  onCreateAppointment: (data: any) => void;
  patients: any[];
  doctors: any[];
  selectedDate: string;
}) {
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('09:00');
  const [duration, setDuration] = useState<number>(30);
  const [appointmentType, setAppointmentType] = useState<string>('consultation');
  const [notes, setNotes] = useState<string>('');
  const [patientSearch, setPatientSearch] = useState<string>('');
  const [doctorSearch, setDoctorSearch] = useState<string>('');
  const [showPatientDropdown, setShowPatientDropdown] = useState<boolean>(false);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState<boolean>(false);
  
  // Filter patients based on search
  const filteredPatients = useMemo(() => {
    if (!patientSearch) return [];
    return patients.filter(patient => {
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      const searchTerm = patientSearch.toLowerCase();
      return (
        fullName.includes(searchTerm) ||
        patient.patientNumber?.toLowerCase().includes(searchTerm) ||
        patient.phone?.toLowerCase().includes(searchTerm) ||
        patient.id.toLowerCase().includes(searchTerm)
      );
    }).slice(0, 8); // Limit to 8 results for dropdown
  }, [patients, patientSearch]);
  
  // Filter doctors based on search
  const filteredDoctors = useMemo(() => {
    if (!doctorSearch) return [];
    return doctors.filter(doctor => {
      const searchTerm = doctorSearch.toLowerCase();
      return (
        doctor.name.toLowerCase().includes(searchTerm) ||
        doctor.specialty.toLowerCase().includes(searchTerm) ||
        doctor.id.toLowerCase().includes(searchTerm)
      );
    }).slice(0, 8);
  }, [doctors, doctorSearch]);

  const handleSubmit = () => {
    if (!selectedPatient || !selectedDoctor) {
      alert('Veuillez sélectionner un patient et un médecin');
      return;
    }

    onCreateAppointment({
      patientId: selectedPatient,
      doctorId: selectedDoctor,
      date: selectedDate,
      time: selectedTime,
      duration,
      type: appointmentType,
      notes
    });

    // Reset form
    setSelectedPatient('');
    setSelectedDoctor('');
    setSelectedTime('09:00');
    setDuration(30);
    setAppointmentType('consultation');
    setNotes('');
    setPatientSearch('');
    setDoctorSearch('');
    setShowPatientDropdown(false);
    setShowDoctorDropdown(false);
  };

  if (!visible) return null;

  return (
    <View style={modalStyles.overlay}>
      <View style={modalStyles.modal}>
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>Nouveau Rendez-vous</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={modalStyles.content}>
          {/* Patient Selection */}
          <Text style={modalStyles.label}>Patient *</Text>
          <TextInput
            style={[modalStyles.searchInput, selectedPatient ? {borderColor: colors.primary, backgroundColor: colors.primary + '08'} : null]}
            placeholder="Rechercher par nom, ID patient, téléphone..."
            placeholderTextColor={colors.textSecondary}
            value={patientSearch}
            onChangeText={(text) => {
              setPatientSearch(text);
              setShowPatientDropdown(text.length > 0);
              if (text.length === 0) setSelectedPatient('');
            }}
            onFocus={() => { if (patientSearch.length > 0 && !selectedPatient) setShowPatientDropdown(true); }}
          />
          {selectedPatient ? (
            <TouchableOpacity
              style={{flexDirection:'row',alignItems:'center',gap:8,marginTop:8,paddingHorizontal:12,paddingVertical:8,backgroundColor:colors.primary+'12',borderRadius:20,borderWidth:1,borderColor:colors.primary+'30',alignSelf:'flex-start'}}
              onPress={() => { setSelectedPatient(''); setPatientSearch(''); }}
            >
              <Ionicons name="person" size={14} color={colors.primary} />
              <Text style={{fontSize:13,fontWeight:'600',color:colors.primary}}>{patientSearch}</Text>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
          {showPatientDropdown && !selectedPatient && filteredPatients.length > 0 && (
            <View style={{marginTop:6,borderWidth:1,borderColor:colors.outline,borderRadius:8,backgroundColor:'#FFFFFF'}}>
              {filteredPatients.map(patient => (
                <TouchableOpacity
                  key={patient.id}
                  style={{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:14,paddingVertical:12,borderBottomWidth:1,borderBottomColor:colors.outline+'60'}}
                  onPress={() => { setSelectedPatient(patient.id); setPatientSearch(`${patient.firstName} ${patient.lastName}`); setShowPatientDropdown(false); }}
                >
                  <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
                  <View style={{flex:1}}>
                    <Text style={{fontSize:14,fontWeight:'600',color:colors.text}}>{patient.firstName} {patient.lastName}</Text>
                    <Text style={{fontSize:12,color:colors.textSecondary,marginTop:2}}>{patient.patientNumber} · {patient.phone}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Doctor Selection */}
          <Text style={modalStyles.label}>Médecin *</Text>
          <TextInput
            style={[modalStyles.searchInput, selectedDoctor ? {borderColor: colors.secondary || colors.primary, backgroundColor: (colors.secondary || colors.primary) + '08'} : null]}
            placeholder="Rechercher par nom, spécialité..."
            placeholderTextColor={colors.textSecondary}
            value={doctorSearch}
            onChangeText={(text) => {
              setDoctorSearch(text);
              setShowDoctorDropdown(text.length > 0);
              if (text.length === 0) setSelectedDoctor('');
            }}
            onFocus={() => { if (doctorSearch.length > 0 && !selectedDoctor) setShowDoctorDropdown(true); }}
          />
          {selectedDoctor ? (
            <TouchableOpacity
              style={{flexDirection:'row',alignItems:'center',gap:8,marginTop:8,paddingHorizontal:12,paddingVertical:8,backgroundColor:(colors.secondary||colors.primary)+'12',borderRadius:20,borderWidth:1,borderColor:(colors.secondary||colors.primary)+'30',alignSelf:'flex-start'}}
              onPress={() => { setSelectedDoctor(''); setDoctorSearch(''); }}
            >
              <Ionicons name="medical" size={14} color={colors.secondary || colors.primary} />
              <Text style={{fontSize:13,fontWeight:'600',color:colors.secondary||colors.primary}}>{doctorSearch}</Text>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
          {showDoctorDropdown && !selectedDoctor && filteredDoctors.length > 0 && (
            <View style={{marginTop:6,borderWidth:1,borderColor:colors.outline,borderRadius:8,backgroundColor:'#FFFFFF'}}>
              {filteredDoctors.map(doctor => (
                <TouchableOpacity
                  key={doctor.id}
                  style={{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:14,paddingVertical:12,borderBottomWidth:1,borderBottomColor:colors.outline+'60'}}
                  onPress={() => { setSelectedDoctor(doctor.id); setDoctorSearch(doctor.name); setShowDoctorDropdown(false); }}
                >
                  <Ionicons name="medkit" size={28} color={colors.secondary || colors.primary} />
                  <View style={{flex:1}}>
                    <Text style={{fontSize:14,fontWeight:'600',color:colors.text}}>{doctor.name}</Text>
                    <Text style={{fontSize:12,color:colors.textSecondary,marginTop:2}}>{doctor.specialty}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Time Selection */}
          <Text style={modalStyles.label}>Heure</Text>
          <View style={modalStyles.timeGrid}>
            {timeSlots.map(slot => (
              <TouchableOpacity
                key={slot}
                style={[
                  modalStyles.timeSlot,
                  selectedTime === slot && modalStyles.selectedTimeSlot
                ]}
                onPress={() => setSelectedTime(slot)}
              >
                <Text style={[
                  modalStyles.timeSlotText,
                  selectedTime === slot && modalStyles.selectedTimeSlotText
                ]}>{slot}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Duration */}
          <Text style={modalStyles.label}>Durée (minutes)</Text>
          <View style={modalStyles.durationContainer}>
            {[15, 30, 45, 60].map(dur => (
              <TouchableOpacity
                key={dur}
                style={[
                  modalStyles.durationButton,
                  duration === dur && modalStyles.selectedDurationButton
                ]}
                onPress={() => setDuration(dur)}
              >
                <Text style={[
                  modalStyles.durationButtonText,
                  duration === dur && modalStyles.selectedDurationButtonText
                ]}>{dur}min</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Type */}
          <Text style={modalStyles.label}>Type de rendez-vous</Text>
          <View style={modalStyles.typeContainer}>
            {['consultation', 'suivi', 'urgence', 'chirurgie'].map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  modalStyles.typeButton,
                  appointmentType === type && modalStyles.selectedTypeButton
                ]}
                onPress={() => setAppointmentType(type)}
              >
                <Text style={[
                  modalStyles.typeButtonText,
                  appointmentType === type && modalStyles.selectedTypeButtonText
                ]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notes */}
          <Text style={modalStyles.label}>Notes</Text>
          <TextInput
            style={modalStyles.notesInput}
            placeholder="Notes additionnelles..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </ScrollView>

        <View style={modalStyles.buttons}>
          <TouchableOpacity style={modalStyles.cancelButton} onPress={onClose}>
            <Text style={modalStyles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={modalStyles.submitButton} onPress={handleSubmit}>
            <Text style={modalStyles.submitButtonText}>Créer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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

// ─── Modal Styles ─────────────────────────────────────────────
const modalStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  content: {
    padding: 20,
    maxHeight: 400,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: colors.background,
  },
  list: {
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.md,
    marginTop: 8,
  },
  listItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  selectedItem: {
    backgroundColor: colors.primaryLight || colors.primary + '20',
  },
  listItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  listItemSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  timeSlot: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.background,
  },
  selectedTimeSlot: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeSlotText: {
    fontSize: 12,
    color: colors.text,
  },
  selectedTimeSlotText: {
    color: '#FFF',
  },
  durationContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  durationButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  selectedDurationButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  durationButtonText: {
    fontSize: 12,
    color: colors.text,
  },
  selectedDurationButtonText: {
    color: '#FFF',
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.background,
  },
  selectedTypeButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeButtonText: {
    fontSize: 12,
    color: colors.text,
    textTransform: 'capitalize',
  },
  selectedTypeButtonText: {
    color: '#FFF',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: colors.background,
    textAlignVertical: 'top',
    marginTop: 8,
  },
  buttons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  
});

export default AppointmentSchedulerScreen;
