/**
 * Appointment Model
 * 
 * Scheduling system for OPD visits, follow-ups, and doctor time slots.
 * Appointments are created before encounters - when patient checks in,
 * an encounter is created and linked to the appointment.
 */

export interface Appointment {
  id: string;
  patientId: string;              // → Patient
  doctorId: string;               // → User (doctor)
  organizationId: string;         // → Organization
  facilityId: string;             // → Hospital
  appointmentNumber: string;      // Auto-generated: "A260001"
  date: string;                   // ISO date (YYYY-MM-DD)
  startTime: string;              // 24-hour format: "09:30"
  endTime: string;                // 24-hour format: "10:00" 
  type: AppointmentType;
  status: AppointmentStatus;
  department?: string;            // Which hospital department
  reason: string;                 // Reason for appointment
  notes?: string;                 // Additional notes from scheduler
  encounterId?: string;           // → Encounter (created on check-in)
  // Reminder system
  reminderSent?: boolean;
  reminderDate?: string;          // When reminder was sent
  // Metadata
  createdAt: string;              // ISO timestamp
  updatedAt?: string;             // ISO timestamp
  createdBy: string;              // → User (who scheduled)
  metadata?: Record<string, any>; // Extensible data
}

export type AppointmentType = 
  | 'new_visit'                   // First time patient
  | 'follow_up'                   // Return visit for ongoing care
  | 'consultation'                // Specialist consultation
  | 'procedure'                   // Scheduled procedure
  | 'lab_only'                    // Lab work only
  | 'checkup'                     // Routine health checkup
  | 'vaccination'                 // Immunization visit
  | 'emergency'                   // Urgent appointment
  | 'telemedicine';               // Virtual consultation

export type AppointmentStatus = 
  | 'scheduled'                   // Appointment booked
  | 'confirmed'                   // Patient confirmed attendance
  | 'checked_in'                  // Patient arrived, encounter created
  | 'in_progress'                 // Currently with doctor
  | 'completed'                   // Appointment finished
  | 'cancelled'                   // Cancelled by patient/staff
  | 'no_show'                     // Patient didn't show up
  | 'rescheduled';                // Moved to different date/time

export interface AppointmentCreate extends Omit<Appointment, 'id' | 'appointmentNumber' | 'createdAt'> {
  id?: string;
  appointmentNumber?: string;
  createdAt?: string;
}

export interface AppointmentUpdate extends Partial<Omit<Appointment, 'id' | 'patientId' | 'organizationId' | 'appointmentNumber' | 'createdAt'>> {
  updatedAt?: string;
}

/**
 * Time slot for appointment scheduling
 */
export interface TimeSlot {
  startTime: string;              // "09:00"
  endTime: string;                // "09:30"
  isAvailable: boolean;
  appointmentId?: string;         // If booked
  slotType: 'regular' | 'emergency' | 'blocked'; // Type of slot
}

/**
 * Doctor's schedule for a day
 */
export interface DoctorSchedule {
  doctorId: string;
  date: string;                   // YYYY-MM-DD
  workingHours: {
    start: string;                // "08:00"
    end: string;                  // "17:00"
    lunchBreak?: {
      start: string;              // "12:00"
      end: string;                // "13:00"
    };
  };
  slots: TimeSlot[];
  isAvailable: boolean;           // Doctor working today?
  notes?: string;                 // Special notes (half day, etc.)
}

/**
 * Appointment statistics
 */
export interface AppointmentStats {
  total: number;
  byStatus: Record<AppointmentStatus, number>;
  byType: Record<AppointmentType, number>;
  showRate: number;               // Percentage (1 - no_show_rate)
  avgWaitTime: number;            // Minutes
  peakHours: { hour: number; count: number }[];
}

export class AppointmentUtils {
  /**
   * Generate appointment number: A{YY}{DDDD}
   * Example: A260001 (2026, sequence 0001)
   */
  static generateAppointmentNumber(): string {
    const year = new Date().getFullYear().toString().slice(-2);
    const sequence = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `A${year}${sequence}`;
  }

  /**
   * Create new appointment with defaults
   */
  static createAppointment(data: AppointmentCreate): Appointment {
    const now = new Date().toISOString();
    return {
      ...data,
      id: data.id || generateUUID(),
      appointmentNumber: data.appointmentNumber || this.generateAppointmentNumber(),
      createdAt: data.createdAt || now,
      updatedAt: now,
    };
  }

  /**
   * Update appointment with timestamp
   */
  static updateAppointment(appointment: Appointment, updates: AppointmentUpdate): Appointment {
    return {
      ...appointment,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Check if appointment is today
   */
  static isToday(appointment: Appointment): boolean {
    const today = new Date().toISOString().split('T')[0];
    return appointment.date === today;
  }

  /**
   * Check if appointment is in the past
   */
  static isPast(appointment: Appointment): boolean {
    const appointmentDateTime = new Date(`${appointment.date}T${appointment.startTime}`);
    return appointmentDateTime < new Date();
  }

  /**
   * Check if appointment is upcoming (within next 24 hours)
   */
  static isUpcoming(appointment: Appointment): boolean {
    const appointmentDateTime = new Date(`${appointment.date}T${appointment.startTime}`);
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    return appointmentDateTime >= now && appointmentDateTime <= tomorrow;
  }

  /**
   * Calculate duration in minutes
   */
  static getDuration(appointment: Appointment): number {
    const [startHour, startMin] = appointment.startTime.split(':').map(Number);
    const [endHour, endMin] = appointment.endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    return endMinutes - startMinutes;
  }

  /**
   * Format time display
   */
  static formatTime(time: string): string {
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour);
    const period = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    
    return `${displayHour}:${minute} ${period}`;
  }

  /**
   * Format appointment time range
   */
  static formatTimeRange(appointment: Appointment): string {
    return `${this.formatTime(appointment.startTime)} - ${this.formatTime(appointment.endTime)}`;
  }

  /**
   * Get status display color
   */
  static getStatusColor(status: AppointmentStatus): string {
    switch (status) {
      case 'scheduled': return '#6B7280';    // Gray
      case 'confirmed': return '#059669';    // Green
      case 'checked_in': return '#0D9488';   // Teal
      case 'in_progress': return '#0284C7';  // Blue
      case 'completed': return '#065F46';    // Dark green
      case 'cancelled': return '#DC2626';    // Red
      case 'no_show': return '#B91C1C';      // Dark red
      case 'rescheduled': return '#D97706';  // Orange
      default: return '#6B7280';
    }
  }

  /**
   * Get type display label
   */
  static getTypeLabel(type: AppointmentType): string {
    switch (type) {
      case 'new_visit': return 'New Patient';
      case 'follow_up': return 'Follow-up';
      case 'consultation': return 'Consultation';
      case 'procedure': return 'Procedure';
      case 'lab_only': return 'Lab Only';
      case 'checkup': return 'Checkup';
      case 'vaccination': return 'Vaccination';
      case 'emergency': return 'Emergency';
      case 'telemedicine': return 'Telemedicine';
      default: return type;
    }
  }

  /**
   * Check if appointment can be cancelled
   */
  static canCancel(appointment: Appointment): boolean {
    return ['scheduled', 'confirmed'].includes(appointment.status) && !this.isPast(appointment);
  }

  /**
   * Check if appointment can be rescheduled
   */
  static canReschedule(appointment: Appointment): boolean {
    return ['scheduled', 'confirmed'].includes(appointment.status);
  }

  /**
   * Check if patient can check in
   */
  static canCheckIn(appointment: Appointment): boolean {
    return appointment.status === 'confirmed' && this.isToday(appointment);
  }

  /**
   * Generate time slots for a day
   */
  static generateTimeSlots(
    startTime: string, 
    endTime: string, 
    slotDuration: number = 30,
    breakTimes?: { start: string; end: string }[]
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let currentTime = startHour * 60 + startMin;
    const endTimeMinutes = endHour * 60 + endMin;
    
    while (currentTime < endTimeMinutes) {
      const slotStart = this.minutesToTimeString(currentTime);
      const slotEnd = this.minutesToTimeString(currentTime + slotDuration);
      
      // Check if slot conflicts with break times
      const isBreakTime = breakTimes?.some(breakTime => {
        const breakStart = this.timeStringToMinutes(breakTime.start);
        const breakEnd = this.timeStringToMinutes(breakTime.end);
        return currentTime >= breakStart && currentTime < breakEnd;
      }) || false;
      
      if (!isBreakTime) {
        slots.push({
          startTime: slotStart,
          endTime: slotEnd,
          isAvailable: true,
          slotType: 'regular',
        });
      }
      
      currentTime += slotDuration;
    }
    
    return slots;
  }

  /**
   * Convert time string to minutes since midnight
   */
  private static timeStringToMinutes(time: string): number {
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute;
  }

  /**
   * Convert minutes since midnight to time string
   */
  private static minutesToTimeString(minutes: number): string {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }
}

// Simple UUID generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}