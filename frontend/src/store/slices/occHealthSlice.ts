import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  Worker,
  MedicalExamination,
  WorkplaceIncident,
  OccupationalDisease,
  FitnessCertificate,
  SurveillanceProgram,
  SiteHealthMetrics,
  FitnessStatus,
} from '../../models/OccupationalHealth';

// ─── State Interface ─────────────────────────────────────────
interface OccupationalHealthState {
  // Workers
  workers: Worker[];
  selectedWorker: Worker | null;

  // Medical Examinations
  examinations: MedicalExamination[];
  selectedExamination: MedicalExamination | null;

  // Incidents
  incidents: WorkplaceIncident[];
  selectedIncident: WorkplaceIncident | null;

  // Occupational Diseases
  diseases: OccupationalDisease[];

  // Certificates
  certificates: FitnessCertificate[];

  // Surveillance Programs
  surveillancePrograms: SurveillanceProgram[];

  // Site Metrics
  siteMetrics: SiteHealthMetrics | null;

  // UI State
  isLoading: boolean;
  error: string | null;
  filters: {
    searchTerm: string;
    fitnessStatus?: FitnessStatus;
    site?: string;
    department?: string;
    jobCategory?: string;
  };
  sortBy: 'lastName' | 'firstName' | 'hireDate' | 'nextMedicalExam' | 'fitnessStatus';
  sortOrder: 'asc' | 'desc';
}

const initialState: OccupationalHealthState = {
  workers: [],
  selectedWorker: null,
  examinations: [],
  selectedExamination: null,
  incidents: [],
  selectedIncident: null,
  diseases: [],
  certificates: [],
  surveillancePrograms: [],
  siteMetrics: null,
  isLoading: false,
  error: null,
  filters: {
    searchTerm: '',
  },
  sortBy: 'lastName',
  sortOrder: 'asc',
};

// ─── Slice ───────────────────────────────────────────────────
export const occHealthSlice = createSlice({
  name: 'occupationalHealth',
  initialState,
  reducers: {
    // ── Workers ──────────────────────────────────────────────
    setWorkers: (state, action: PayloadAction<Worker[]>) => {
      state.workers = action.payload;
    },
    addWorker: (state, action: PayloadAction<Worker>) => {
      state.workers.push(action.payload);
    },
    updateWorker: (state, action: PayloadAction<Worker>) => {
      const idx = state.workers.findIndex(w => w.id === action.payload.id);
      if (idx !== -1) state.workers[idx] = action.payload;
    },
    removeWorker: (state, action: PayloadAction<string>) => {
      state.workers = state.workers.filter(w => w.id !== action.payload);
    },
    selectWorker: (state, action: PayloadAction<Worker | null>) => {
      state.selectedWorker = action.payload;
    },

    // ── Medical Examinations ─────────────────────────────────
    setExaminations: (state, action: PayloadAction<MedicalExamination[]>) => {
      state.examinations = action.payload;
    },
    addExamination: (state, action: PayloadAction<MedicalExamination>) => {
      state.examinations.push(action.payload);
    },
    updateExamination: (state, action: PayloadAction<MedicalExamination>) => {
      const idx = state.examinations.findIndex(e => e.id === action.payload.id);
      if (idx !== -1) state.examinations[idx] = action.payload;
    },
    removeExamination: (state, action: PayloadAction<string>) => {
      state.examinations = state.examinations.filter(e => e.id !== action.payload);
    },
    selectExamination: (state, action: PayloadAction<MedicalExamination | null>) => {
      state.selectedExamination = action.payload;
    },

    // ── Incidents ────────────────────────────────────────────
    setIncidents: (state, action: PayloadAction<WorkplaceIncident[]>) => {
      state.incidents = action.payload;
    },
    addIncident: (state, action: PayloadAction<WorkplaceIncident>) => {
      state.incidents.push(action.payload);
    },
    updateIncident: (state, action: PayloadAction<WorkplaceIncident>) => {
      const idx = state.incidents.findIndex(i => i.id === action.payload.id);
      if (idx !== -1) state.incidents[idx] = action.payload;
    },
    removeIncident: (state, action: PayloadAction<string>) => {
      state.incidents = state.incidents.filter(i => i.id !== action.payload);
    },
    selectIncident: (state, action: PayloadAction<WorkplaceIncident | null>) => {
      state.selectedIncident = action.payload;
    },

    // ── Occupational Diseases ────────────────────────────────
    setDiseases: (state, action: PayloadAction<OccupationalDisease[]>) => {
      state.diseases = action.payload;
    },
    addDisease: (state, action: PayloadAction<OccupationalDisease>) => {
      state.diseases.push(action.payload);
    },
    updateDisease: (state, action: PayloadAction<OccupationalDisease>) => {
      const idx = state.diseases.findIndex(d => d.id === action.payload.id);
      if (idx !== -1) state.diseases[idx] = action.payload;
    },

    // ── Certificates ─────────────────────────────────────────
    setCertificates: (state, action: PayloadAction<FitnessCertificate[]>) => {
      state.certificates = action.payload;
    },
    addCertificate: (state, action: PayloadAction<FitnessCertificate>) => {
      state.certificates.push(action.payload);
    },
    revokeCertificate: (state, action: PayloadAction<{ id: string; reason: string }>) => {
      const idx = state.certificates.findIndex(c => c.id === action.payload.id);
      if (idx !== -1) {
        state.certificates[idx].isValid = false;
        state.certificates[idx].revokedReason = action.payload.reason;
        state.certificates[idx].revokedDate = new Date().toISOString();
      }
    },

    // ── Surveillance Programs ────────────────────────────────
    setSurveillancePrograms: (state, action: PayloadAction<SurveillanceProgram[]>) => {
      state.surveillancePrograms = action.payload;
    },
    addSurveillanceProgram: (state, action: PayloadAction<SurveillanceProgram>) => {
      state.surveillancePrograms.push(action.payload);
    },
    updateSurveillanceProgram: (state, action: PayloadAction<SurveillanceProgram>) => {
      const idx = state.surveillancePrograms.findIndex(p => p.id === action.payload.id);
      if (idx !== -1) state.surveillancePrograms[idx] = action.payload;
    },

    // ── Site Metrics ─────────────────────────────────────────
    setSiteMetrics: (state, action: PayloadAction<SiteHealthMetrics | null>) => {
      state.siteMetrics = action.payload;
    },

    // ── UI State ─────────────────────────────────────────────
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action: PayloadAction<Partial<OccupationalHealthState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = { searchTerm: '' };
    },
    setSorting: (state, action: PayloadAction<{ sortBy: OccupationalHealthState['sortBy']; sortOrder: OccupationalHealthState['sortOrder'] }>) => {
      state.sortBy = action.payload.sortBy;
      state.sortOrder = action.payload.sortOrder;
    },
  },
});

export const {
  setWorkers, addWorker, updateWorker, removeWorker, selectWorker,
  setExaminations, addExamination, updateExamination, removeExamination, selectExamination,
  setIncidents, addIncident, updateIncident, removeIncident, selectIncident,
  setDiseases, addDisease, updateDisease,
  setCertificates, addCertificate, revokeCertificate,
  setSurveillancePrograms, addSurveillanceProgram, updateSurveillanceProgram,
  setSiteMetrics,
  setLoading, setError, clearError,
  setFilters, clearFilters, setSorting,
} = occHealthSlice.actions;

// ─── Selectors ───────────────────────────────────────────────
type OccHealthRootState = { occupationalHealth: OccupationalHealthState };

export const selectWorkers = (state: OccHealthRootState) => state.occupationalHealth.workers;
export const selectSelectedWorker = (state: OccHealthRootState) => state.occupationalHealth.selectedWorker;
export const selectExaminations = (state: OccHealthRootState) => state.occupationalHealth.examinations;
export const selectIncidents = (state: OccHealthRootState) => state.occupationalHealth.incidents;
export const selectDiseases = (state: OccHealthRootState) => state.occupationalHealth.diseases;
export const selectCertificates = (state: OccHealthRootState) => state.occupationalHealth.certificates;
export const selectSurveillancePrograms = (state: OccHealthRootState) => state.occupationalHealth.surveillancePrograms;
export const selectSiteMetrics = (state: OccHealthRootState) => state.occupationalHealth.siteMetrics;
export const selectOccHealthLoading = (state: OccHealthRootState) => state.occupationalHealth.isLoading;
export const selectOccHealthError = (state: OccHealthRootState) => state.occupationalHealth.error;
export const selectOccHealthFilters = (state: OccHealthRootState) => state.occupationalHealth.filters;

// Computed selectors
export const selectFitWorkers = (state: OccHealthRootState) =>
  state.occupationalHealth.workers.filter(w => w.fitnessStatus === 'fit');

export const selectWorkersNeedingExam = (state: OccHealthRootState) => {
  const now = new Date();
  return state.occupationalHealth.workers.filter(w => {
    if (!w.nextMedicalExam) return true;
    return new Date(w.nextMedicalExam) <= now;
  });
};

export const selectOpenIncidents = (state: OccHealthRootState) =>
  state.occupationalHealth.incidents.filter(i => i.investigationStatus !== 'closed');

export const selectExpiringCertificates = (daysThreshold: number = 30) => (state: OccHealthRootState) => {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + daysThreshold);
  return state.occupationalHealth.certificates.filter(c => {
    if (!c.isValid) return false;
    const expiry = new Date(c.expiryDate);
    return expiry <= threshold && expiry >= new Date();
  });
};
