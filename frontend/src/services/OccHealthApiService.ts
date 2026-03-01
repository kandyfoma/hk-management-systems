// ═══════════════════════════════════════════════════════════════════════════
// OccHealthApiService
// ═══════════════════════════════════════════════════════════════════════════
// Centralises ALL backend calls for Occupational Health:
//   - Workers (patients) CRUD
//   - Protocol hierarchy (sectors / departments / positions / protocols)
//   - Medical exam catalog
//
// Every method returns { data, error } so callers can handle offline gracefully.
// ═══════════════════════════════════════════════════════════════════════════

import ApiService from './ApiService';
import type {
  OccSector, OccDepartment, OccPosition,
  MedicalExamCatalogEntry, ExamVisitProtocol,
} from '../models/OccHealthProtocol';
import type { OccupationalHealthPatient } from '../models/OccupationalHealth';
import { PatientUtils } from '../models/Patient';

// ─── API base path for occupational health ───────────────────
const OH = '/occupational-health';

// ─── Helpers ─────────────────────────────────────────────────

/** Map a backend Worker object → frontend OccupationalHealthPatient */
function workerToPatient(w: any): OccupationalHealthPatient {
  return {
    id: String(w.id ?? w.uuid ?? ''),
    firstName: w.first_name ?? '',
    lastName: w.last_name ?? '',
    middleName: w.middle_name ?? '',
    dateOfBirth: w.date_of_birth ?? '1990-01-01',
    gender: w.gender ?? 'male',
    phone: w.phone ?? '',
    email: w.email ?? '',
    address: w.address ?? '',
    city: w.city ?? '',
    emergencyContactName: w.emergency_contact_name ?? '',
    emergencyContactPhone: w.emergency_contact_phone ?? '',
    bloodType: w.blood_type ?? undefined,
    // Patient required fields
    allergies: Array.isArray(w.allergies) ? w.allergies : (w.allergies ? String(w.allergies).split(',').map((s: string) => s.trim()).filter(Boolean) : []),
    chronicConditions: Array.isArray(w.chronic_conditions) ? w.chronic_conditions : (w.chronic_conditions ? String(w.chronic_conditions).split(',').map((s: string) => s.trim()).filter(Boolean) : []),
    currentMedications: Array.isArray(w.current_medications) ? w.current_medications : (w.medications ? String(w.medications).split(',').map((s: string) => s.trim()).filter(Boolean) : []),
    patientNumber: w.patient_number ?? PatientUtils.generatePatientNumber(),
    registrationDate: w.created_at ?? w.hire_date ?? new Date().toISOString(),
    status: w.employment_status != null
      ? (w.employment_status === 'active' ? 'active' : 'inactive')
      : (w.is_active !== false ? 'active' : 'inactive'),
    createdAt: w.created_at ?? new Date().toISOString(),
    accessCount: 0,
    // OH-specific
    employeeId: w.employee_id ?? '',
    company: w.enterprise_name ?? w.enterprise?.name ?? w.company ?? 'Non spécifié',
    sector: w.enterprise_sector ?? w.enterprise?.sector ?? w.sector ?? 'other',
    site: w.work_site_name ?? w.work_site?.name ?? w.site ?? 'Non spécifié',
    department: w.job_category_display ?? w.department ?? '',
    jobTitle: w.job_title ?? '',
    jobCategory: w.job_category ?? 'other',
    shiftPattern: w.shift_pattern ?? 'regular',
    hireDate: w.hire_date ?? new Date().toISOString().split('T')[0],
    contractType: w.contract_type ?? 'permanent',
    fitnessStatus: w.current_fitness_status ?? w.fitness_status ?? 'pending_evaluation',
    lastMedicalExam: w.last_medical_exam ?? undefined,
    nextMedicalExam: w.next_exam_due ?? w.next_medical_exam ?? undefined,
    exposureRisks: w.exposure_risks ?? [],
    ppeRequired: w.ppe_required ?? [],
    riskLevel: w.risk_level ?? 'low',
    vaccinationStatus: w.vaccination_status ?? [],
    // Protocol links
    sectorCode: w.occ_sector_code ?? w.occ_sector?.code ?? undefined,
    departmentCode: w.occ_department_code ?? w.occ_department?.code ?? undefined,
    positionCode: w.occ_position_code ?? w.occ_position?.code ?? undefined,
  };
}

/** Map a frontend OccupationalHealthPatient → backend Worker payload */
function patientToWorker(p: OccupationalHealthPatient): Record<string, any> {
  return {
    employee_id: p.employeeId,
    first_name: p.firstName,
    last_name: p.lastName,
    middle_name: p.middleName ?? '',
    date_of_birth: p.dateOfBirth,
    gender: p.gender,
    phone: p.phone ?? '',
    email: p.email ?? '',
    address: p.address ?? '',
    city: p.city ?? '',
    emergency_contact_name: p.emergencyContactName ?? '',
    emergency_contact_phone: p.emergencyContactPhone ?? '',
    blood_type: p.bloodType ?? '',
    hire_date: p.hireDate,
    department: p.department ?? '',
    job_title: p.jobTitle ?? '',
    job_category: p.jobCategory ?? 'other',
    shift_pattern: p.shiftPattern ?? 'regular',
    contract_type: p.contractType ?? 'permanent',
    fitness_status: p.fitnessStatus ?? 'pending_evaluation',
    exposure_risks: p.exposureRisks ?? [],
    ppe_required: p.ppeRequired ?? [],
    risk_level: p.riskLevel ?? 'low',
    allergies: (p.allergies ?? []).join(', '),
    chronic_conditions: (p.chronicConditions ?? []).join(', '),
    medications: (p.currentMedications ?? []).join(', '),
    // Protocol FK codes — backend resolves them to IDs
    occ_sector_code: p.sectorCode ?? '',
    occ_department_code: p.departmentCode ?? '',
    occ_position_code: p.positionCode ?? '',
    // Legacy text fields still used by serializer
    company: p.company ?? '',
    sector: p.sector ?? 'other',
    site: p.site ?? '',
  };
}

/** Map a frontend OccupationalHealthPatient → backend PATCH payload (Worker model-compatible) */
function patientToWorkerPatch(p: OccupationalHealthPatient): Record<string, any> {
  const toCsv = (values?: string[]) => (values ?? []).filter(Boolean).join(', ');
  const normalizeJobCategory = (value?: string) => {
    if (!value || value === 'other') return 'other_job';
    return value;
  };
  const putIfNonEmpty = (payload: Record<string, any>, key: string, value?: string | null) => {
    if (value == null) return;
    const text = String(value).trim();
    if (text.length > 0) payload[key] = text;
  };

  const payload: Record<string, any> = {};
  putIfNonEmpty(payload, 'employee_id', p.employeeId);
  putIfNonEmpty(payload, 'first_name', p.firstName);
  putIfNonEmpty(payload, 'last_name', p.lastName);
  putIfNonEmpty(payload, 'date_of_birth', p.dateOfBirth);
  putIfNonEmpty(payload, 'gender', p.gender);
  putIfNonEmpty(payload, 'phone', p.phone);
  // email is optional on backend: allow explicit clear
  payload.email = (p.email ?? '').trim();
  putIfNonEmpty(payload, 'address', p.address);
  putIfNonEmpty(payload, 'emergency_contact_name', p.emergencyContactName);
  putIfNonEmpty(payload, 'emergency_contact_phone', p.emergencyContactPhone);
  putIfNonEmpty(payload, 'job_category', normalizeJobCategory(p.jobCategory));
  putIfNonEmpty(payload, 'job_title', p.jobTitle);
  putIfNonEmpty(payload, 'hire_date', p.hireDate);
  putIfNonEmpty(payload, 'current_fitness_status', p.fitnessStatus);
  payload.next_exam_due = (p.nextMedicalExam ?? '').trim() || null;
  payload.exposure_risks = p.exposureRisks ?? [];
  payload.ppe_required = p.ppeRequired ?? [];
  payload.allergies = toCsv(p.allergies);
  payload.chronic_conditions = toCsv(p.chronicConditions);
  payload.medications = toCsv(p.currentMedications);

  // Backward-compatible aliases used by backend normalizer
  payload.occ_sector_code = p.sectorCode ?? '';
  payload.occ_department_code = p.departmentCode ?? '';
  payload.occ_position_code = p.positionCode ?? '';

  return payload;
}

/** Map a backend OccSector (nested tree) → frontend OccSector type */
function apiSectorToModel(s: any): OccSector {
  return {
    id: s.id,
    code: s.code,
    name: s.name,
    industrySectorKey: s.industry_sector_key ?? '',
    isActive: s.is_active !== false,
    departments: (s.departments ?? []).map(apiDeptToModel),
  };
}

function apiDeptToModel(d: any): OccDepartment {
  return {
    id: d.id,
    code: d.code,
    name: d.name,
    sectorCode: d.sector_code ?? d.sector?.code ?? '',
    isActive: d.is_active !== false,
    positions: (d.positions ?? []).map(apiPositionToModel),
  };
}

function apiPositionToModel(p: any): OccPosition {
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    departmentCode: p.department_code ?? p.department?.code ?? '',
    sectorCode: p.sector_code ?? p.department?.sector_code ?? '',
    typicalExposures: p.typical_exposures ?? [],
    recommendedPPE: p.recommended_ppe ?? [],
    isActive: p.is_active !== false,
    protocols: (p.protocols ?? []).map(apiProtocolToModel),
  };
}

function apiProtocolToModel(pr: any): ExamVisitProtocol {
  return {
    id: pr.id,
    positionCode: pr.position_code ?? pr.position?.code ?? '',
    visitType: pr.visit_type,
    visitTypeLabel: pr.visit_type_label ?? pr.visit_type ?? '',
    requiredExams: (pr.required_exam_codes ?? pr.required_exam_entries ?? []).map((e: any) =>
      typeof e === 'string' ? e : e.exam_code ?? e.code ?? ''
    ),
    recommendedExams: (pr.recommended_exam_codes ?? []),
    validityMonths: pr.validity_months ?? 12,
    regulatoryNote: pr.regulatory_note ?? '',
    isActive: pr.is_active !== false,
    createdAt: pr.created_at ?? '',
  };
}

function apiExamToModel(e: any): MedicalExamCatalogEntry {
  return {
    id: e.id,
    code: e.code,
    label: e.label,
    category: e.category,
    description: e.description ?? '',
    requiresSpecialist: e.requires_specialist ?? false,
    isActive: e.is_active !== false,
  };
}

// ═══════════════════════════════════════════════════════════════
// SERVICE CLASS
// ═══════════════════════════════════════════════════════════════

export class OccHealthApiService {
  private static _instance: OccHealthApiService;
  private api = ApiService.getInstance();

  static getInstance(): OccHealthApiService {
    if (!this._instance) this._instance = new OccHealthApiService();
    return this._instance;
  }

  // ─────────────────────────────────────────────────────────────
  // WORKERS (PATIENTS) CRUD
  // ─────────────────────────────────────────────────────────────

  /** GET /api/workers/  — returns all workers (single request with high page_size) */
  async listWorkers(params: { search?: string; page?: number; page_size?: number } = {}): Promise<{
    data: OccupationalHealthPatient[];
    count: number;
    error?: string;
  }> {
    try {
      // Use a large page_size to get all records in one request unless a specific page is requested
      const pageSize = params.page != null ? (params.page_size ?? 20) : (params.page_size ?? 1000);
      const res = await this.api.get(`${OH}/workers/`, { ...params, page_size: pageSize });
      if (!res.success) return { data: [], count: 0, error: res.error?.message };

      const raw = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
      return {
        data: raw.map(workerToPatient),
        count: res.data?.count ?? raw.length,
      };
    } catch (e: any) {
      return { data: [], count: 0, error: e?.message ?? 'Network error' };
    }
  }

  /** GET /api/workers/{id}/ */
  async getWorker(id: string): Promise<{ data: OccupationalHealthPatient | null; error?: string }> {
    try {
      const res = await this.api.get(`${OH}/workers/${id}/`);
      if (!res.success) return { data: null, error: res.error?.message };
      return { data: workerToPatient(res.data) };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** POST /api/workers/ */
  async createWorker(patient: OccupationalHealthPatient): Promise<{ data: OccupationalHealthPatient | null; error?: string }> {
    try {
      const res = await this.api.post(`${OH}/workers/`, patientToWorker(patient));
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: workerToPatient(res.data) };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** PATCH /api/workers/{id}/ */
  async updateWorker(id: string, patient: OccupationalHealthPatient): Promise<{ data: OccupationalHealthPatient | null; error?: string }> {
    try {
      const res = await this.api.patch(`${OH}/workers/${id}/`, patientToWorkerPatch(patient));
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: workerToPatient(res.data) };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** PATCH /api/workers/{id}/ — partial update (e.g. fitness_status only) */
  async patchWorker(id: string, fields: Partial<OccupationalHealthPatient>): Promise<{ data: OccupationalHealthPatient | null; error?: string }> {
    try {
      // Build minimal payload from partial fields
      const payload: Record<string, any> = {};
      if (fields.fitnessStatus !== undefined) payload.fitness_status = fields.fitnessStatus;
      if (fields.nextMedicalExam !== undefined) payload.next_medical_exam = fields.nextMedicalExam;
      if (fields.lastMedicalExam !== undefined) payload.last_medical_exam = fields.lastMedicalExam;
      if (fields.riskLevel !== undefined) payload.risk_level = fields.riskLevel;
      if (fields.exposureRisks !== undefined) payload.exposure_risks = fields.exposureRisks;
      if (fields.ppeRequired !== undefined) payload.ppe_required = fields.ppeRequired;
      if (fields.sectorCode !== undefined) payload.occ_sector_code = fields.sectorCode;
      if (fields.departmentCode !== undefined) payload.occ_department_code = fields.departmentCode;
      if (fields.positionCode !== undefined) payload.occ_position_code = fields.positionCode;
      const res = await this.api.patch(`${OH}/workers/${id}/`, payload);
      if (!res.success) return { data: null, error: res.error?.message };
      return { data: workerToPatient(res.data) };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** DELETE /api/workers/{id}/ */
  async deleteWorker(id: string): Promise<{ error?: string }> {
    try {
      const res = await this.api.delete(`${OH}/workers/${id}/`);
      if (!res.success) return { error: res.error?.message };
      return {};
    } catch (e: any) {
      return { error: e?.message };
    }
  }

  /** POST /api/workers/bulk-import/ */
  async bulkImportWorkers(rows: any[]): Promise<{
    created: number; updated: number; errors: number;
    errorDetails: any[];
    error?: string;
  }> {
    try {
      const res = await this.api.post(`${OH}/workers/bulk-import/`, rows);
      if (!res.success) return { created: 0, updated: 0, errors: 0, errorDetails: [], error: res.error?.message };
      return {
        created: res.data?.created ?? 0,
        updated: res.data?.updated ?? 0,
        errors: res.data?.errors ?? 0,
        errorDetails: res.data?.error_details ?? [],
      };
    } catch (e: any) {
      return { created: 0, updated: 0, errors: 0, errorDetails: [], error: e?.message };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // ENTERPRISES & WORKSITES
  // ─────────────────────────────────────────────────────────────

  /** GET /api/occupational-health/enterprises/ — List all enterprises */
  async listEnterprises(params: { search?: string; page?: number } = {}): Promise<{
    data: any[];
    count: number;
    error?: string;
  }> {
    try {
      const res = await this.api.get(`${OH}/enterprises/`, params);
      if (!res.success) return { data: [], count: 0, error: res.error?.message };
      const raw = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
      return {
        data: raw,
        count: res.data?.count ?? raw.length,
      };
    } catch (e: any) {
      return { data: [], count: 0, error: e?.message ?? 'Network error' };
    }
  }

  /** GET /api/occupational-health/enterprises/{id}/ */
  async getEnterprise(id: string): Promise<{ data: any | null; error?: string }> {
    try {
      const res = await this.api.get(`${OH}/enterprises/${id}/`);
      if (!res.success) return { data: null, error: res.error?.message };
      return { data: res.data };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // MEDICAL EXAMINATIONS
  // ─────────────────────────────────────────────────────────────

  /** POST /api/examinations/ */
  async createMedicalExamination(payload: {
    worker: number;
    exam_type: string;
    exam_date: string;
    examining_doctor?: number | null;
    chief_complaint?: string;
    medical_history_review?: string;
    results_summary?: string;
    recommendations?: string;
    examination_completed?: boolean;
    follow_up_required?: boolean;
    follow_up_date?: string | null;
    next_periodic_exam?: string | null;
  }): Promise<{ data: any | null; error?: string }> {
    try {
      const res = await this.api.post(`${OH}/examinations/`, payload);
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: res.data };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** GET /api/examinations/ */
  async listMedicalExaminations(params: {
    worker?: number;
    exam_type?: string;
    examination_completed?: boolean;
    page?: number;
  } = {}): Promise<{ data: any[]; count: number; error?: string }> {
    try {
      const res = await this.api.get(`${OH}/examinations/`, params);
      if (!res.success) return { data: [], count: 0, error: res.error?.message };
      const raw = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
      return {
        data: raw,
        count: res.data?.count ?? raw.length,
      };
    } catch (e: any) {
      return { data: [], count: 0, error: e?.message };
    }
  }

  /** GET /api/examinations/{id}/ */
  async getMedicalExamination(id: number | string): Promise<{ data: any | null; error?: string }> {
    try {
      const res = await this.api.get(`${OH}/examinations/${id}/`);
      if (!res.success) return { data: null, error: res.error?.message };
      return { data: res.data };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** PATCH /api/examinations/{id}/ */
  async updateMedicalExamination(id: number | string, payload: Partial<{
    exam_type: string;
    exam_date: string;
    chief_complaint: string;
    medical_history_review: string;
    results_summary: string;
    recommendations: string;
    examination_completed: boolean;
    follow_up_required: boolean;
    follow_up_date: string | null;
    next_periodic_exam: string | null;
  }>): Promise<{ data: any | null; error?: string }> {
    try {
      const res = await this.api.patch(`${OH}/examinations/${id}/`, payload);
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: res.data };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** POST /api/vital-signs/ */
  async createVitalSigns(payload: {
    examination: number;
    systolic_bp: number;
    diastolic_bp: number;
    heart_rate: number;
    respiratory_rate?: number | null;
    temperature?: number | null;
    height: number;
    weight: number;
    waist_circumference?: number | null;
    pain_scale?: number;
    pain_location?: string;
  }): Promise<{ data: any | null; error?: string }> {
    try {
      const res = await this.api.post(`${OH}/vital-signs/`, payload);
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: res.data };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** POST /api/physical-examinations/ is not routed; use serializer-backed endpoint when available via examinations detail update fallback */
  async createPhysicalExam(payload: {
    examination: number;
    general_appearance?: string;
    head_neck?: string;
    cardiovascular?: string;
    respiratory?: string;
    abdominal?: string;
    musculoskeletal?: string;
    neurological?: string;
    skin?: string;
    ent?: string;
    physical_exam_normal?: boolean;
    abnormal_findings_summary?: string;
  }): Promise<{ data: any | null; error?: string }> {
    try {
      const res = await this.api.post(`${OH}/physical-examinations/`, payload);
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: res.data };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** POST /api/fitness-certificates/ */
  async createFitnessCertificate(payload: {
    examination: number;
    fitness_decision: string;
    decision_rationale: string;
    restrictions?: string;
    work_limitations?: string;
    issue_date: string;
    valid_until: string;
    requires_follow_up?: boolean;
    follow_up_frequency_months?: number | null;
    follow_up_instructions?: string;
    is_active?: boolean;
  }): Promise<{ data: any | null; error?: string }> {
    try {
      const res = await this.api.post(`${OH}/fitness-certificates/`, payload);
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: res.data };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** GET /api/fitness-certificates/ */
  async listFitnessCertificates(params: {
    search?: string;
    is_active?: boolean;
    fitness_decision?: string;
    page?: number;
  } = {}): Promise<{ data: any[]; count: number; error?: string }> {
    try {
      const query: Record<string, any> = {};
      if (params.search) query.search = params.search;
      if (params.is_active !== undefined) query.is_active = params.is_active;
      if (params.fitness_decision) query.fitness_decision = params.fitness_decision;
      if (params.page) query.page = params.page;

      const res = await this.api.get(`${OH}/fitness-certificates/`, query);
      if (!res.success) return { data: [], count: 0, error: res.error?.message };
      const raw = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
      return { data: raw, count: res.data?.count ?? raw.length };
    } catch (e: any) {
      return { data: [], count: 0, error: e?.message };
    }
  }

  /** POST /api/fitness-certificates/{id}/revoke/ */
  async revokeFitnessCertificate(id: number | string, reason?: string): Promise<{ data: any | null; error?: string }> {
    try {
      const res = await this.api.post(`${OH}/fitness-certificates/${id}/revoke/`, {
        reason: reason ?? '',
      });
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: res.data };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** GET /api/fitness-certificates/{id}/download-pdf/ */
  async downloadFitnessCertificatePdf(id: number | string): Promise<{ blob: Blob | null; fileName?: string; error?: string }> {
    try {
      const res = await this.api.getBlob(`${OH}/fitness-certificates/${id}/download-pdf/`);
      if (!res.success) return { blob: null, error: res.error?.message };
      return {
        blob: res.data?.blob ?? null,
        fileName: res.data?.fileName,
      };
    } catch (e: any) {
      return { blob: null, error: e?.message };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // MEDICAL TEST RESULTS (Heavy Metals, Drug/Alcohol, X-ray, etc.)
  // ─────────────────────────────────────────────────────────────

  /** POST /api/heavy-metals-tests/ */
  async createHeavyMetalsTest(payload: {
    examination: number;
    heavy_metal: string;
    specimen_type: string;
    test_date: string;
    level_value: number;
    unit: string;
    reference_lower?: number | null;
    reference_upper?: number | null;
    osha_action_level?: number | null;
    clinical_significance?: string;
    occupational_exposure?: boolean;
    follow_up_required?: boolean;
    follow_up_recommendation?: string;
  }): Promise<{ data: any | null; error?: string }> {
    try {
      const res = await this.api.post(`${OH}/heavy-metals-tests/`, payload);
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: res.data };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** POST /api/drug-alcohol-screening/ */
  async createDrugAlcoholScreening(payload: {
    examination: number;
    test_type: string;
    alcohol_tested?: boolean;
    drug_tested?: boolean;
    test_date: string;
    testing_facility?: string;
    alcohol_result?: string;
    drug_result?: string;
    fit_for_duty?: boolean;
  }): Promise<{ data: any | null; error?: string }> {
    try {
      const res = await this.api.post(`${OH}/drug-alcohol-screening/`, payload);
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: res.data };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** POST /api/xray-imaging-results/ */
  async createXrayImagingResult(payload: {
    examination: number;
    imaging_type: string;
    imaging_date: string;
    ilo_classification?: string;
    pneumoconiosis_detected?: boolean;
    imaging_facility?: string;
  }): Promise<{ data: any | null; error?: string }> {
    try {
      const res = await this.api.post(`${OH}/xray-imaging-results/`, payload);
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: res.data };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // PROTOCOL HIERARCHY
  // ─────────────────────────────────────────────────────────────

  /**
   * GET /api/protocols/sectors/tree/ — full nested Sector→Dept→Position→Protocol tree.
   * This is the primary sync endpoint for the frontend local cache.
   */
  async getSectorTree(includeInactive = false): Promise<{ data: OccSector[]; error?: string }> {
    try {
      const params = includeInactive ? { include_inactive: 'true' } : {};
      const res = await this.api.get(`${OH}/protocols/sectors/tree/`, params);
      if (!res.success) return { data: [], error: res.error?.message };
      const raw = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
      return { data: raw.map(apiSectorToModel) };
    } catch (e: any) {
      return { data: [], error: e?.message };
    }
  }

  /** GET /api/protocols/sectors/ — flat list */
  async listSectors(): Promise<{ data: OccSector[]; error?: string }> {
    try {
      const res = await this.api.get(`${OH}/protocols/sectors/`);
      if (!res.success) return { data: [], error: res.error?.message };
      const raw = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
      return { data: raw.map((s: any) => ({ ...apiSectorToModel(s), departments: [] })) };
    } catch (e: any) {
      return { data: [], error: e?.message };
    }
  }

  /** GET /api/protocols/sectors/{id}/ */
  async getSector(id: number): Promise<{ data: OccSector | null; error?: string }> {
    try {
      const res = await this.api.get(`${OH}/protocols/sectors/${id}/`);
      if (!res.success) return { data: null, error: res.error?.message };
      return { data: { ...apiSectorToModel(res.data), departments: [] } };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** POST /api/protocols/sectors/ */
  async createSector(payload: {
    code: string;
    name: string;
    industry_sector_key?: string;
    is_active?: boolean;
  }): Promise<{ data: OccSector | null; error?: string }> {
    try {
      const res = await this.api.post(`${OH}/protocols/sectors/`, payload);
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: { ...apiSectorToModel(res.data), departments: [] } };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** PUT /api/protocols/sectors/{id}/ */
  async updateSector(id: number, payload: {
    code: string;
    name: string;
    industry_sector_key?: string;
    is_active?: boolean;
  }): Promise<{ data: OccSector | null; error?: string }> {
    try {
      const res = await this.api.put(`${OH}/protocols/sectors/${id}/`, payload);
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: { ...apiSectorToModel(res.data), departments: [] } };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** PATCH /api/protocols/sectors/{id}/ */
  async patchSector(id: number, payload: Partial<{
    code: string;
    name: string;
    industry_sector_key: string;
    is_active: boolean;
  }>): Promise<{ data: OccSector | null; error?: string }> {
    try {
      const res = await this.api.patch(`${OH}/protocols/sectors/${id}/`, payload);
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: { ...apiSectorToModel(res.data), departments: [] } };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** DELETE /api/protocols/sectors/{id}/ */
  async deleteSector(id: number): Promise<{ error?: string }> {
    try {
      const res = await this.api.delete(`${OH}/protocols/sectors/${id}/`);
      if (!res.success) return { error: res.error?.message };
      return {};
    } catch (e: any) {
      return { error: e?.message };
    }
  }

  /** GET /api/protocols/sectors/{id}/departments/ */
  async getDepartmentsBySectorId(sectorId: number): Promise<{ data: OccDepartment[]; error?: string }> {
    try {
      const res = await this.api.get(`${OH}/protocols/sectors/${sectorId}/departments/`);
      if (!res.success) return { data: [], error: res.error?.message };
      const raw = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
      return { data: raw.map((d: any) => ({ ...apiDeptToModel(d), positions: [] })) };
    } catch (e: any) {
      return { data: [], error: e?.message };
    }
  }

  /** GET /api/protocols/departments/?sector={id}&is_active=true */
  async listDepartments(sectorId?: number): Promise<{ data: OccDepartment[]; error?: string }> {
    try {
      const params: any = { is_active: 'true' };
      if (sectorId) params.sector = sectorId;
      const res = await this.api.get(`${OH}/protocols/departments/`, params);
      if (!res.success) return { data: [], error: res.error?.message };
      const raw = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
      return { data: raw.map((d: any) => ({ ...apiDeptToModel(d), positions: [] })) };
    } catch (e: any) {
      return { data: [], error: e?.message };
    }
  }

  /** POST /api/protocols/departments/ */
  async createDepartment(payload: {
    sector: number;
    code: string;
    name: string;
    is_active?: boolean;
  }): Promise<{ data: OccDepartment | null; error?: string }> {
    try {
      const res = await this.api.post(`${OH}/protocols/departments/`, payload);
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: { ...apiDeptToModel(res.data), positions: [] } };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** PUT /api/protocols/departments/{id}/ */
  async updateDepartment(id: number, payload: {
    sector: number;
    code: string;
    name: string;
    is_active?: boolean;
  }): Promise<{ data: OccDepartment | null; error?: string }> {
    try {
      const res = await this.api.put(`${OH}/protocols/departments/${id}/`, payload);
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: { ...apiDeptToModel(res.data), positions: [] } };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** PATCH /api/protocols/departments/{id}/ */
  async patchDepartment(id: number, payload: Partial<{
    sector: number;
    code: string;
    name: string;
    is_active: boolean;
  }>): Promise<{ data: OccDepartment | null; error?: string }> {
    try {
      const res = await this.api.patch(`${OH}/protocols/departments/${id}/`, payload);
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: { ...apiDeptToModel(res.data), positions: [] } };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** DELETE /api/protocols/departments/{id}/ */
  async deleteDepartment(id: number): Promise<{ error?: string }> {
    try {
      const res = await this.api.delete(`${OH}/protocols/departments/${id}/`);
      if (!res.success) return { error: res.error?.message };
      return {};
    } catch (e: any) {
      return { error: e?.message };
    }
  }

  /** GET /api/protocols/departments/{id}/positions/ */
  async getPositionsByDeptId(deptId: number): Promise<{ data: OccPosition[]; error?: string }> {
    try {
      const res = await this.api.get(`${OH}/protocols/departments/${deptId}/positions/`);
      if (!res.success) return { data: [], error: res.error?.message };
      const raw = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
      return { data: raw.map((p: any) => ({ ...apiPositionToModel(p), protocols: [] })) };
    } catch (e: any) {
      return { data: [], error: e?.message };
    }
  }

  /** GET /api/protocols/positions/?department={id}&is_active=true */
  async listPositions(deptId?: number): Promise<{ data: OccPosition[]; error?: string }> {
    try {
      const params: any = { is_active: 'true' };
      if (deptId) params.department = deptId;
      const res = await this.api.get(`${OH}/protocols/positions/`, params);
      if (!res.success) return { data: [], error: res.error?.message };
      const raw = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
      return { data: raw.map((p: any) => ({ ...apiPositionToModel(p), protocols: [] })) };
    } catch (e: any) {
      return { data: [], error: e?.message };
    }
  }

  /** POST /api/protocols/positions/ */
  async createPosition(payload: {
    department: number;
    code: string;
    name: string;
    typical_exposures?: string[];
    recommended_ppe?: string[];
    is_active?: boolean;
  }): Promise<{ data: OccPosition | null; error?: string }> {
    try {
      const res = await this.api.post(`${OH}/protocols/positions/`, payload);
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: { ...apiPositionToModel(res.data), protocols: [] } };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** PUT /api/protocols/positions/{id}/ */
  async updatePosition(id: number, payload: {
    department: number;
    code: string;
    name: string;
    typical_exposures?: string[];
    recommended_ppe?: string[];
    is_active?: boolean;
  }): Promise<{ data: OccPosition | null; error?: string }> {
    try {
      const res = await this.api.put(`${OH}/protocols/positions/${id}/`, payload);
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: { ...apiPositionToModel(res.data), protocols: [] } };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** PATCH /api/protocols/positions/{id}/ */
  async patchPosition(id: number, payload: Partial<{
    department: number;
    code: string;
    name: string;
    typical_exposures: string[];
    recommended_ppe: string[];
    is_active: boolean;
  }>): Promise<{ data: OccPosition | null; error?: string }> {
    try {
      const res = await this.api.patch(`${OH}/protocols/positions/${id}/`, payload);
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: { ...apiPositionToModel(res.data), protocols: [] } };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** DELETE /api/protocols/positions/{id}/ */
  async deletePosition(id: number): Promise<{ error?: string }> {
    try {
      const res = await this.api.delete(`${OH}/protocols/positions/${id}/`);
      if (!res.success) return { error: res.error?.message };
      return {};
    } catch (e: any) {
      return { error: e?.message };
    }
  }

  /**
   * GET /api/protocols/visit-protocols/for_position/?position_code=FOREUR&visit_type=pre_employment
   * Used by intake screen to auto-build the exam checklist.
   */
  async getProtocolForPosition(positionCode: string, visitType: string): Promise<{ data: ExamVisitProtocol | null; error?: string }> {
    try {
      const res = await this.api.get(`${OH}/protocols/visit-protocols/for_position/`, {
        position_code: positionCode,
        visit_type: visitType,
      });
      if (!res.success) return { data: null, error: res.error?.message };
      return { data: apiProtocolToModel(res.data) };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /**
   * GET /api/protocols/positions/{id}/protocols/ — all protocols for a position
   */
  async getProtocolsByPositionId(positionId: number): Promise<{ data: ExamVisitProtocol[]; error?: string }> {
    try {
      const res = await this.api.get(`${OH}/protocols/positions/${positionId}/protocols/`);
      if (!res.success) return { data: [], error: res.error?.message };
      const raw = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
      return { data: raw.map(apiProtocolToModel) };
    } catch (e: any) {
      return { data: [], error: e?.message };
    }
  }

  /** GET /api/protocols/visit-protocols/ */
  async listVisitProtocols(params: {
    position?: number;
    visit_type?: string;
    is_active?: boolean;
  } = {}): Promise<{ data: ExamVisitProtocol[]; error?: string }> {
    try {
      const res = await this.api.get(`${OH}/protocols/visit-protocols/`, params);
      if (!res.success) return { data: [], error: res.error?.message };
      const raw = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
      return { data: raw.map(apiProtocolToModel) };
    } catch (e: any) {
      return { data: [], error: e?.message };
    }
  }

  /** GET /api/protocols/visit-protocols/{id}/ */
  async getVisitProtocol(id: number): Promise<{ data: ExamVisitProtocol | null; error?: string }> {
    try {
      const res = await this.api.get(`${OH}/protocols/visit-protocols/${id}/`);
      if (!res.success) return { data: null, error: res.error?.message };
      return { data: apiProtocolToModel(res.data) };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** POST /api/protocols/visit-protocols/ */
  async createVisitProtocol(payload: {
    position: number;
    visit_type: string;
    visit_type_label_override?: string;
    recommended_exams?: number[];
    validity_months?: number;
    regulatory_note?: string;
    is_active?: boolean;
  }): Promise<{ data: ExamVisitProtocol | null; error?: string }> {
    try {
      const res = await this.api.post(`${OH}/protocols/visit-protocols/`, payload);
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: apiProtocolToModel(res.data) };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** PUT /api/protocols/visit-protocols/{id}/ */
  async updateVisitProtocol(id: number, payload: {
    position: number;
    visit_type: string;
    visit_type_label_override?: string;
    recommended_exams?: number[];
    validity_months?: number;
    regulatory_note?: string;
    is_active?: boolean;
  }): Promise<{ data: ExamVisitProtocol | null; error?: string }> {
    try {
      const res = await this.api.put(`${OH}/protocols/visit-protocols/${id}/`, payload);
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: apiProtocolToModel(res.data) };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** PATCH /api/protocols/visit-protocols/{id}/ */
  async patchVisitProtocol(id: number, payload: Partial<{
    position: number;
    visit_type: string;
    visit_type_label_override: string;
    recommended_exams: number[];
    validity_months: number;
    regulatory_note: string;
    is_active: boolean;
  }>): Promise<{ data: ExamVisitProtocol | null; error?: string }> {
    try {
      const res = await this.api.patch(`${OH}/protocols/visit-protocols/${id}/`, payload);
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: apiProtocolToModel(res.data) };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** DELETE /api/protocols/visit-protocols/{id}/ */
  async deleteVisitProtocol(id: number): Promise<{ error?: string }> {
    try {
      const res = await this.api.delete(`${OH}/protocols/visit-protocols/${id}/`);
      if (!res.success) return { error: res.error?.message };
      return {};
    } catch (e: any) {
      return { error: e?.message };
    }
  }

  /** POST /api/protocols/visit-protocols/{id}/add_required_exam/ */
  async addRequiredExam(protocolId: number, payload: {
    exam_id: number;
    order?: number;
    is_blocking?: boolean;
  }): Promise<{ data: ExamVisitProtocol | null; error?: string }> {
    try {
      const res = await this.api.post(`${OH}/protocols/visit-protocols/${protocolId}/add_required_exam/`, payload);
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: apiProtocolToModel(res.data) };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** DELETE /api/protocols/visit-protocols/{id}/remove_required_exam/ */
  async removeRequiredExam(protocolId: number, examId: number): Promise<{ data: ExamVisitProtocol | null; error?: string }> {
    try {
      const res = await this.api.delete(`${OH}/protocols/visit-protocols/${protocolId}/remove_required_exam/`, {
        exam_id: examId,
      });
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: apiProtocolToModel(res.data) };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // EXAM CATALOG
  // ─────────────────────────────────────────────────────────────

  /** GET /api/protocols/exam-catalog/ */
  async listExamCatalog(params: { category?: string; is_active?: boolean } = {}): Promise<{ data: MedicalExamCatalogEntry[]; error?: string }> {
    try {
      const res = await this.api.get(`${OH}/protocols/exam-catalog/`, params);
      if (!res.success) return { data: [], error: res.error?.message };
      const raw = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
      return { data: raw.map(apiExamToModel) };
    } catch (e: any) {
      return { data: [], error: e?.message };
    }
  }

  /** POST /api/protocols/exam-catalog/ */
  async createExamCatalog(payload: {
    code: string;
    label: string;
    category: string;
    description?: string;
    requires_specialist?: boolean;
    is_active?: boolean;
  }): Promise<{ data: MedicalExamCatalogEntry | null; error?: string }> {
    try {
      const res = await this.api.post(`${OH}/protocols/exam-catalog/`, payload);
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: apiExamToModel(res.data) };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** PUT /api/protocols/exam-catalog/{id}/ */
  async updateExamCatalog(id: number, payload: {
    code: string;
    label: string;
    category: string;
    description?: string;
    requires_specialist?: boolean;
    is_active?: boolean;
  }): Promise<{ data: MedicalExamCatalogEntry | null; error?: string }> {
    try {
      const res = await this.api.put(`${OH}/protocols/exam-catalog/${id}/`, payload);
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: apiExamToModel(res.data) };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** PATCH /api/protocols/exam-catalog/{id}/ */
  async patchExamCatalog(id: number, payload: Partial<{
    code: string;
    label: string;
    category: string;
    description: string;
    requires_specialist: boolean;
    is_active: boolean;
  }>): Promise<{ data: MedicalExamCatalogEntry | null; error?: string }> {
    try {
      const res = await this.api.patch(`${OH}/protocols/exam-catalog/${id}/`, payload);
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: apiExamToModel(res.data) };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** DELETE /api/protocols/exam-catalog/{id}/ */
  async deleteExamCatalog(id: number): Promise<{ error?: string }> {
    try {
      const res = await this.api.delete(`${OH}/protocols/exam-catalog/${id}/`);
      if (!res.success) return { error: res.error?.message };
      return {};
    } catch (e: any) {
      return { error: e?.message };
    }
  }

  /** POST /api/protocols/exam-catalog/bulk_lookup/  { codes: [...] } */
  async bulkLookupExams(codes: string[]): Promise<{ data: MedicalExamCatalogEntry[]; error?: string }> {
    try {
      const res = await this.api.post(`${OH}/protocols/exam-catalog/bulk_lookup/`, { codes });
      if (!res.success) return { data: [], error: res.error?.message };
      const raw = Array.isArray(res.data) ? res.data : [];
      return { data: raw.map(apiExamToModel) };
    } catch (e: any) {
      return { data: [], error: e?.message };
    }
  }

  /** POST /api/occupational-health/health-screening/ - Create health screening */
  async createHealthScreening(payload: {
    worker_id: string | number;
    screening_type: 'ergonomic' | 'mental' | 'cardio' | 'msk';
    responses: Record<string, any>;
    notes?: string;
  }): Promise<{ data: any | null; error?: string }> {
    try {
      const res = await this.api.post(`${OH}/health-screening/`, {
        worker_id: payload.worker_id,
        screening_type: payload.screening_type,
        responses: payload.responses,
        notes: payload.notes || '',
      });
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: res.data };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** GET /api/occupational-health/health-screening/ - List health screenings */
  async listHealthScreenings(params: { worker_id?: string | number; screening_type?: string; page?: number } = {}): Promise<{ data: any[]; error?: string }> {
    try {
      const query = new URLSearchParams();
      if (params.worker_id) query.append('worker', String(params.worker_id));
      if (params.screening_type) query.append('screening_type', params.screening_type);
      if (params.page) query.append('page', String(params.page));
      
      const res = await this.api.get(`${OH}/health-screening/?${query.toString()}`);
      if (!res.success) return { data: [], error: res.error?.message };
      const raw = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      return { data: raw };
    } catch (e: any) {
      return { data: [], error: e?.message };
    }
  }

  /** GET /api/occupational-health/health-screening/{id}/ - Get specific screening */
  async getHealthScreening(id: string | number): Promise<{ data: any | null; error?: string }> {
    try {
      const res = await this.api.get(`${OH}/health-screening/${id}/`);
      if (!res.success) return { data: null, error: res.error?.message };
      return { data: res.data };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SURVEILLANCE PROGRAMS
  // ─────────────────────────────────────────────────────────────

  /** GET /api/occupational-health/surveillance/programs/ */
  async listSurveillancePrograms(params: { search?: string; is_active?: boolean } = {}): Promise<{
    data: any[];
    error?: string;
  }> {
    try {
      const query = new URLSearchParams();
      if (params.search) query.append('search', params.search);
      if (params.is_active !== undefined) query.append('is_active', String(params.is_active));
      const qs = query.toString();
      const res = await this.api.get(`${OH}/surveillance/programs/${qs ? `?${qs}` : ''}`);
      if (!res.success) return { data: [], error: res.error?.message };
      const raw = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
      return { data: raw };
    } catch (e: any) {
      return { data: [], error: e?.message ?? 'Network error' };
    }
  }

  /** POST /api/occupational-health/surveillance/programs/ */
  async createSurveillanceProgram(payload: Record<string, any>): Promise<{ data: any | null; error?: string }> {
    try {
      const res = await this.api.post(`${OH}/surveillance/programs/`, payload);
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: res.data };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** PATCH /api/occupational-health/surveillance/programs/{id}/ */
  async updateSurveillanceProgram(id: number | string, payload: Record<string, any>): Promise<{ data: any | null; error?: string }> {
    try {
      const res = await this.api.patch(`${OH}/surveillance/programs/${id}/`, payload);
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: res.data };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // REGULATORY REPORTS — CNSS
  // ─────────────────────────────────────────────────────────────

  /** GET /api/occupational-health/cnss-reports/ */
  async listCNSSReports(params: { status?: string; report_type?: string } = {}): Promise<{ data: any[]; error?: string }> {
    try {
      const query = new URLSearchParams();
      if (params.status) query.append('status', params.status);
      if (params.report_type) query.append('report_type', params.report_type);
      const qs = query.toString();
      const res = await this.api.get(`${OH}/cnss-reports/${qs ? `?${qs}` : ''}`);
      if (!res.success) return { data: [], error: res.error?.message };
      const raw = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
      return { data: raw };
    } catch (e: any) {
      return { data: [], error: e?.message };
    }
  }

  /** POST /api/occupational-health/cnss-reports/ */
  async createCNSSReport(payload: {
    report_type: string;
    report_period_start: string;
    report_period_end: string;
    notes?: string;
    submission_method?: string;
    related_incident?: number | null;
    related_disease?: number | null;
  }): Promise<{ data: any | null; error?: string }> {
    try {
      const res = await this.api.post(`${OH}/cnss-reports/`, payload);
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: res.data };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** PATCH /api/occupational-health/cnss-reports/{id}/ */
  async patchCNSSReport(id: number | string, payload: Record<string, any>): Promise<{ data: any | null; error?: string }> {
    try {
      const res = await this.api.patch(`${OH}/cnss-reports/${id}/`, payload);
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: res.data };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // REGULATORY REPORTS — DRC (RDC)
  // ─────────────────────────────────────────────────────────────

  /** GET /api/occupational-health/drc-reports/ */
  async listDRCReports(params: { status?: string; report_type?: string } = {}): Promise<{ data: any[]; error?: string }> {
    try {
      const query = new URLSearchParams();
      if (params.status) query.append('status', params.status);
      if (params.report_type) query.append('report_type', params.report_type);
      const qs = query.toString();
      const res = await this.api.get(`${OH}/drc-reports/${qs ? `?${qs}` : ''}`);
      if (!res.success) return { data: [], error: res.error?.message };
      const raw = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
      return { data: raw };
    } catch (e: any) {
      return { data: [], error: e?.message };
    }
  }

  /** POST /api/occupational-health/drc-reports/ */
  async createDRCReport(payload: {
    report_type: string;
    report_period_start: string;
    report_period_end: string;
    submission_method?: string;
    submission_recipient?: string;
    required_actions?: string;
  }): Promise<{ data: any | null; error?: string }> {
    try {
      const res = await this.api.post(`${OH}/drc-reports/`, payload);
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: res.data };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** PATCH /api/occupational-health/drc-reports/{id}/ */
  async patchDRCReport(id: number | string, payload: Record<string, any>): Promise<{ data: any | null; error?: string }> {
    try {
      const res = await this.api.patch(`${OH}/drc-reports/${id}/`, payload);
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: res.data };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  // SURVEILLANCE PROGRAMS
  // ─────────────────────────────────────────────────────────────

  /** GET /api/occupational-health/surveillance/programs/ */
  async listSurveillancePrograms(params: { search?: string; page?: number; page_size?: number } = {}): Promise<{ data: any[]; error?: string }> {
    try {
      const pageSize = params.page != null ? (params.page_size ?? 20) : (params.page_size ?? 1000);
      const res = await this.api.get(`${OH}/surveillance/programs/`, { ...params, page_size: pageSize });
      if (!res.success) return { data: [], error: res.error?.message };
      const raw = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
      return { data: raw };
    } catch (e: any) {
      return { data: [], error: e?.message ?? 'Network error' };
    }
  }

  /** POST /api/occupational-health/surveillance/programs/ */
  async createSurveillanceProgram(program: any): Promise<{ data: any | null; error?: string }> {
    try {
      const res = await this.api.post(`${OH}/surveillance/programs/`, program);
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: res.data };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** PATCH /api/occupational-health/surveillance/programs/{id}/ */
  async updateSurveillanceProgram(id: number | string, program: any): Promise<{ data: any | null; error?: string }> {
    try {
      const res = await this.api.patch(`${OH}/surveillance/programs/${id}/`, program);
      if (!res.success) return { data: null, error: res.error?.message ?? JSON.stringify(res.errors) };
      return { data: res.data };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  // WORKPLACE INCIDENTS
  // ─────────────────────────────────────────────────────────────

  /** GET /api/occupational-health/workplace-incidents/ */
  async getWorkplaceIncidents(params: { search?: string; page?: number; page_size?: number } = {}): Promise<{ data: any; error?: string }> {
    try {
      const pageSize = params.page_size ?? 50;
      const res = await this.api.get(`${OH}/workplace-incidents/`, { ...params, page_size: pageSize });
      if (!res.success) return { data: null, error: res.error?.message };
      return { data: res.data };
    } catch (e: any) {
      return { data: null, error: e?.message ?? 'Network error' };
    }
  }

  /** GET /api/occupational-health/workplace-incidents/{id}/ */
  async getWorkplaceIncident(id: number | string): Promise<{ data: any | null; error?: string }> {
    try {
      const res = await this.api.get(`${OH}/workplace-incidents/${id}/`);
      if (!res.success) return { data: null, error: res.error?.message };
      return { data: res.data };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** POST /api/occupational-health/workplace-incidents/ */
  async createWorkplaceIncident(payload: Record<string, any>): Promise<{ data: any | null; error?: string }> {
    try {
      const res = await this.api.post(`${OH}/workplace-incidents/`, payload);
      if (!res.success) {
        console.error('[OccHealthApiService] Create incident error:', res.error, res.errors);
        const errorMsg = res.error?.message || (typeof res.errors === 'object' ? JSON.stringify(res.errors) : res.errors);
        return { data: null, error: errorMsg ?? 'Unknown error' };
      }
      return { data: res.data };
    } catch (e: any) {
      console.error('[OccHealthApiService] Create incident exception:', e);
      return { data: null, error: e?.message || 'Network error' };
    }
  }

  /** PATCH /api/occupational-health/workplace-incidents/{id}/ */
  async updateWorkplaceIncident(id: number | string, payload: Record<string, any>): Promise<{ data: any | null; error?: string }> {
    try {
      const res = await this.api.patch(`${OH}/workplace-incidents/${id}/`, payload);
      if (!res.success) {
        console.error('[OccHealthApiService] Update incident error:', res.error, res.errors);
        const errorMsg = res.error?.message || (typeof res.errors === 'object' ? JSON.stringify(res.errors) : res.errors);
        return { data: null, error: errorMsg ?? 'Unknown error' };
      }
      return { data: res.data };
    } catch (e: any) {
      console.error('[OccHealthApiService] Update incident exception:', e);
      return { data: null, error: e?.message || 'Network error' };
    }
  }

  /** DELETE /api/occupational-health/workplace-incidents/{id}/ */
  async deleteWorkplaceIncident(id: number | string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await this.api.delete(`${OH}/workplace-incidents/${id}/`);
      if (!res.success) return { success: false, error: res.error?.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  }

  // INCIDENT ATTACHMENTS
  // ─────────────────────────────────────────────────────────────

  /** POST /api/occupational-health/incident-attachments/ - Upload image/video */
  async uploadIncidentAttachment(
    incidentId: number,
    file: any,
    attachmentType: 'image' | 'video',
    description?: string
  ): Promise<{ data: any | null; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('incident', incidentId);
      formData.append('file', file);
      formData.append('attachment_type', attachmentType);
      if (description) {
        formData.append('description', description);
      }
      
      const res = await this.api.post(`${OH}/incident-attachments/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (!res.success) return { data: null, error: res.error?.message ?? 'Upload failed' };
      return { data: res.data };
    } catch (e: any) {
      return { data: null, error: e?.message || 'Network error' };
    }
  }

  /** GET /api/occupational-health/incident-attachments/?incident={id} */
  async getIncidentAttachments(incidentId: number): Promise<{ data: any[] | null; error?: string }> {
    try {
      const res = await this.api.get(`${OH}/incident-attachments/`, { incident: incidentId });
      if (!res.success) return { data: null, error: res.error?.message };
      const attachments = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
      return { data: attachments };
    } catch (e: any) {
      return { data: null, error: e?.message };
    }
  }

  /** DELETE /api/occupational-health/incident-attachments/{id}/ */
  async deleteIncidentAttachment(id: number): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await this.api.delete(`${OH}/incident-attachments/${id}/`);
      if (!res.success) return { success: false, error: res.error?.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  }
}

export const occHealthApi = OccHealthApiService.getInstance();
