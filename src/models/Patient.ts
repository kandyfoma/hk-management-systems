export interface Patient {
  id: string;
  // Personal Information
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string; // ISO date string
  gender: 'male' | 'female' | 'other';
  nationalId?: string;
  passportNumber?: string;
  
  // Contact Information
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  
  // Medical Information
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  insuranceProvider?: string;
  insuranceNumber?: string;
  
  // System Information
  patientNumber: string; // Unique hospital identifier
  registrationDate: string; // ISO string
  lastVisit?: string; // ISO string
  status: 'active' | 'inactive' | 'deceased';
  notes?: string;
  
  // Metadata
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string
  metadata?: Record<string, any>;
}

export interface PatientCreate extends Omit<Patient, 'id' | 'patientNumber' | 'registrationDate' | 'createdAt'> {
  id?: string;
  patientNumber?: string;
  registrationDate?: string;
  createdAt?: string;
}

export interface PatientUpdate extends Partial<Omit<Patient, 'id' | 'patientNumber' | 'registrationDate' | 'createdAt'>> {
  updatedAt?: string;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  visitDate: string; // ISO string
  chiefComplaint: string;
  symptoms: string[];
  diagnosis?: string;
  treatment?: string;
  medications: string[];
  followUpDate?: string; // ISO string
  doctorId: string;
  notes?: string;
  vitals?: VitalSigns;
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string
}

export interface VitalSigns {
  temperature?: number; // Celsius
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number; // BPM
  respiratoryRate?: number; // per minute
  oxygenSaturation?: number; // percentage
  weight?: number; // kg
  height?: number; // cm
  bmi?: number;
  painScale?: number; // 1-10
}

export class PatientUtils {
  static getFullName(patient: Patient): string {
    const parts = [patient.firstName];
    if (patient.middleName) parts.push(patient.middleName);
    parts.push(patient.lastName);
    return parts.join(' ');
  }

  static getAge(patient: Patient): number {
    const birthDate = new Date(patient.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  static generatePatientNumber(): string {
    const year = new Date().getFullYear().toString().slice(-2);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `P${year}${random}`;
  }

  static createPatient(data: PatientCreate): Patient {
    const now = new Date().toISOString();
    return {
      ...data,
      id: data.id || generateUUID(),
      patientNumber: data.patientNumber || this.generatePatientNumber(),
      registrationDate: data.registrationDate || now,
      createdAt: data.createdAt || now,
      updatedAt: now,
      allergies: data.allergies || [],
      chronicConditions: data.chronicConditions || [],
      currentMedications: data.currentMedications || [],
      status: data.status || 'active',
    };
  }

  static updatePatient(patient: Patient, updates: PatientUpdate): Patient {
    return {
      ...patient,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
  }

  static calculateBMI(weight: number, height: number): number {
    if (!weight || !height) return 0;
    const heightInMeters = height / 100;
    return Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10;
  }
}

// Simple UUID generator for React Native
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}