import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Patient, MedicalRecord } from '../../models/Patient';

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
  type: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

interface HospitalState {
  patients: Patient[];
  selectedPatient: Patient | null;
  medicalRecords: MedicalRecord[];
  appointments: Appointment[];
  isLoading: boolean;
  error: string | null;
  filters: {
    searchTerm: string;
    status?: Patient['status'];
    gender?: Patient['gender'];
    ageRange?: {
      min: number;
      max: number;
    };
  };
  sortBy: 'lastName' | 'firstName' | 'registrationDate' | 'lastVisit';
  sortOrder: 'asc' | 'desc';
}

const initialState: HospitalState = {
  patients: [],
  selectedPatient: null,
  medicalRecords: [],
  appointments: [],
  isLoading: false,
  error: null,
  filters: {
    searchTerm: '',
  },
  sortBy: 'lastName',
  sortOrder: 'asc',
};

export const hospitalSlice = createSlice({
  name: 'hospital',
  initialState,
  reducers: {
    // Patient management
    setPatients: (state, action: PayloadAction<Patient[]>) => {
      state.patients = action.payload;
    },
    addPatient: (state, action: PayloadAction<Patient>) => {
      state.patients.push(action.payload);
    },
    updatePatient: (state, action: PayloadAction<Patient>) => {
      const index = state.patients.findIndex(patient => patient.id === action.payload.id);
      if (index !== -1) {
        state.patients[index] = action.payload;
      }
    },
    removePatient: (state, action: PayloadAction<string>) => {
      state.patients = state.patients.filter(patient => patient.id !== action.payload);
    },
    selectPatient: (state, action: PayloadAction<Patient | null>) => {
      state.selectedPatient = action.payload;
    },
    
    // Medical records
    setMedicalRecords: (state, action: PayloadAction<MedicalRecord[]>) => {
      state.medicalRecords = action.payload;
    },
    addMedicalRecord: (state, action: PayloadAction<MedicalRecord>) => {
      state.medicalRecords.push(action.payload);
    },
    updateMedicalRecord: (state, action: PayloadAction<MedicalRecord>) => {
      const index = state.medicalRecords.findIndex(record => record.id === action.payload.id);
      if (index !== -1) {
        state.medicalRecords[index] = action.payload;
      }
    },
    removeMedicalRecord: (state, action: PayloadAction<string>) => {
      state.medicalRecords = state.medicalRecords.filter(record => record.id !== action.payload);
    },
    
    // Appointments
    setAppointments: (state, action: PayloadAction<Appointment[]>) => {
      state.appointments = action.payload;
    },
    addAppointment: (state, action: PayloadAction<Appointment>) => {
      state.appointments.push(action.payload);
    },
    updateAppointment: (state, action: PayloadAction<Appointment>) => {
      const index = state.appointments.findIndex(apt => apt.id === action.payload.id);
      if (index !== -1) {
        state.appointments[index] = action.payload;
      }
    },
    removeAppointment: (state, action: PayloadAction<string>) => {
      state.appointments = state.appointments.filter(apt => apt.id !== action.payload);
    },
    
    // UI state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    
    // Filters and sorting
    setFilters: (state, action: PayloadAction<Partial<HospitalState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        searchTerm: '',
      };
    },
    setSorting: (state, action: PayloadAction<{ sortBy: HospitalState['sortBy']; sortOrder: HospitalState['sortOrder'] }>) => {
      state.sortBy = action.payload.sortBy;
      state.sortOrder = action.payload.sortOrder;
    },
  },
});

export const {
  setPatients,
  addPatient,
  updatePatient,
  removePatient,
  selectPatient,
  setMedicalRecords,
  addMedicalRecord,
  updateMedicalRecord,
  removeMedicalRecord,
  setAppointments,
  addAppointment,
  updateAppointment,
  removeAppointment,
  setLoading,
  setError,
  clearError,
  setFilters,
  clearFilters,
  setSorting,
} = hospitalSlice.actions;