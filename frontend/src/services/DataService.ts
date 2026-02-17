/**
 * DataService - Service for all non-auth API calls
 * Handles CRUD operations for various entities
 */

import ApiService, { ApiResponse } from './ApiService';

// ═══════════════════════════════════════════════════════════════
// DATA SERVICE CLASS
// ═══════════════════════════════════════════════════════════════

class DataService {
  private static instance: DataService;

  private constructor() {}

  public static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  // ═══════════════════════════════════════════════════════════════
  // PATIENTS API
  // ═══════════════════════════════════════════════════════════════

  async getPatients(params?: any): Promise<ApiResponse> {
    return await ApiService.get('/patients/', params);
  }

  async getPatient(id: string): Promise<ApiResponse> {
    return await ApiService.get(`/patients/${id}/`);
  }

  async createPatient(patientData: any): Promise<ApiResponse> {
    return await ApiService.post('/patients/', patientData);
  }

  async updatePatient(id: string, patientData: any): Promise<ApiResponse> {
    return await ApiService.patch(`/patients/${id}/`, patientData);
  }

  async deletePatient(id: string): Promise<ApiResponse> {
    return await ApiService.delete(`/patients/${id}/`);
  }

  // ═══════════════════════════════════════════════════════════════
  // INVENTORY API
  // ═══════════════════════════════════════════════════════════════

  async getInventoryItems(params?: any): Promise<ApiResponse> {
    return await ApiService.get('/inventory/', params);
  }

  async getInventoryItem(id: string): Promise<ApiResponse> {
    return await ApiService.get(`/inventory/${id}/`);
  }

  async createInventoryItem(itemData: any): Promise<ApiResponse> {
    return await ApiService.post('/inventory/', itemData);
  }

  async updateInventoryItem(id: string, itemData: any): Promise<ApiResponse> {
    return await ApiService.patch(`/inventory/${id}/`, itemData);
  }

  async deleteInventoryItem(id: string): Promise<ApiResponse> {
    return await ApiService.delete(`/inventory/${id}/`);
  }

  // ═══════════════════════════════════════════════════════════════
  // PRESCRIPTIONS API
  // ═══════════════════════════════════════════════════════════════

  async getPrescriptions(params?: any): Promise<ApiResponse> {
    return await ApiService.get('/prescriptions/', params);
  }

  async getPrescription(id: string): Promise<ApiResponse> {
    return await ApiService.get(`/prescriptions/${id}/`);
  }

  async createPrescription(prescriptionData: any): Promise<ApiResponse> {
    return await ApiService.post('/prescriptions/', prescriptionData);
  }

  async updatePrescription(id: string, prescriptionData: any): Promise<ApiResponse> {
    return await ApiService.patch(`/prescriptions/${id}/`, prescriptionData);
  }

  async deletePrescription(id: string): Promise<ApiResponse> {
    return await ApiService.delete(`/prescriptions/${id}/`);
  }

  // ═══════════════════════════════════════════════════════════════
  // SALES API
  // ═══════════════════════════════════════════════════════════════

  async getSales(params?: any): Promise<ApiResponse> {
    return await ApiService.get('/sales/', params);
  }

  async getSale(id: string): Promise<ApiResponse> {
    return await ApiService.get(`/sales/${id}/`);
  }

  async createSale(saleData: any): Promise<ApiResponse> {
    return await ApiService.post('/sales/', saleData);
  }

  async updateSale(id: string, saleData: any): Promise<ApiResponse> {
    return await ApiService.patch(`/sales/${id}/`, saleData);
  }

  async deleteSale(id: string): Promise<ApiResponse> {
    return await ApiService.delete(`/sales/${id}/`);
  }

  // ═══════════════════════════════════════════════════════════════
  // HOSPITAL API
  // ═══════════════════════════════════════════════════════════════

  async getAppointments(params?: any): Promise<ApiResponse> {
    return await ApiService.get('/hospital/appointments/', params);
  }

  async createAppointment(appointmentData: any): Promise<ApiResponse> {
    return await ApiService.post('/hospital/appointments/', appointmentData);
  }

  async updateAppointment(id: string, appointmentData: any): Promise<ApiResponse> {
    return await ApiService.patch(`/hospital/appointments/${id}/`, appointmentData);
  }

  async getDepartments(): Promise<ApiResponse> {
    return await ApiService.get('/hospital/departments/');
  }

  async getRooms(params?: any): Promise<ApiResponse> {
    return await ApiService.get('/hospital/rooms/', params);
  }

  async getAdmissions(params?: any): Promise<ApiResponse> {
    return await ApiService.get('/hospital/admissions/', params);
  }

  async createAdmission(admissionData: any): Promise<ApiResponse> {
    return await ApiService.post('/hospital/admissions/', admissionData);
  }

  // ═══════════════════════════════════════════════════════════════
  // OCCUPATIONAL HEALTH API
  // ═══════════════════════════════════════════════════════════════

  async getOccupationalHealthRecords(params?: any): Promise<ApiResponse> {
    return await ApiService.get('/occupational-health/employee-records/', params);
  }

  async createOccupationalHealthRecord(recordData: any): Promise<ApiResponse> {
    return await ApiService.post('/occupational-health/employee-records/', recordData);
  }

  async getHealthAssessments(params?: any): Promise<ApiResponse> {
    return await ApiService.get('/occupational-health/assessments/', params);
  }

  async createHealthAssessment(assessmentData: any): Promise<ApiResponse> {
    return await ApiService.post('/occupational-health/assessments/', assessmentData);
  }

  // ═══════════════════════════════════════════════════════════════
  // SUPPLIERS API
  // ═══════════════════════════════════════════════════════════════

  async getSuppliers(params?: any): Promise<ApiResponse> {
    return await ApiService.get('/suppliers/', params);
  }

  async getSupplier(id: string): Promise<ApiResponse> {
    return await ApiService.get(`/suppliers/${id}/`);
  }

  async createSupplier(supplierData: any): Promise<ApiResponse> {
    return await ApiService.post('/suppliers/', supplierData);
  }

  async updateSupplier(id: string, supplierData: any): Promise<ApiResponse> {
    return await ApiService.patch(`/suppliers/${id}/`, supplierData);
  }

  async deleteSupplier(id: string): Promise<ApiResponse> {
    return await ApiService.delete(`/suppliers/${id}/`);
  }

  // ═══════════════════════════════════════════════════════════════
  // ORGANIZATIONS API
  // ═══════════════════════════════════════════════════════════════

  async getOrganizations(params?: any): Promise<ApiResponse> {
    return await ApiService.get('/organizations/', params);
  }

  async getOrganization(id: string): Promise<ApiResponse> {
    return await ApiService.get(`/organizations/${id}/`);
  }

  async updateOrganization(id: string, orgData: any): Promise<ApiResponse> {
    return await ApiService.patch(`/organizations/${id}/`, orgData);
  }

  // ═══════════════════════════════════════════════════════════════
  // LICENSES API
  // ═══════════════════════════════════════════════════════════════

  async getLicenses(params?: any): Promise<ApiResponse> {
    return await ApiService.get('/licenses/', params);
  }

  async getLicense(id: string): Promise<ApiResponse> {
    return await ApiService.get(`/licenses/${id}/`);
  }

  async validateLicense(licenseKey: string): Promise<ApiResponse> {
    return await ApiService.post('/licenses/validate/', { license_key: licenseKey });
  }

  // ═══════════════════════════════════════════════════════════════
  // USERS API
  // ═══════════════════════════════════════════════════════════════

  async getUsers(params?: any): Promise<ApiResponse> {
    return await ApiService.get('/auth/users/', params);
  }

  async getUser(id: string): Promise<ApiResponse> {
    return await ApiService.get(`/auth/users/${id}/`);
  }

  async createUser(userData: any): Promise<ApiResponse> {
    return await ApiService.post('/auth/users/', userData);
  }

  async updateUser(id: string, userData: any): Promise<ApiResponse> {
    return await ApiService.patch(`/auth/users/${id}/`, userData);
  }

  async deleteUser(id: string): Promise<ApiResponse> {
    return await ApiService.delete(`/auth/users/${id}/`);
  }

  // ═══════════════════════════════════════════════════════════════
  // CHOICES/OPTIONS API
  // ═══════════════════════════════════════════════════════════════

  async getUserRoleChoices(): Promise<ApiResponse> {
    return await ApiService.get('/auth/choices/roles/');
  }

  async getPermissionChoices(): Promise<ApiResponse> {
    return await ApiService.get('/auth/choices/permissions/');
  }

  // ═══════════════════════════════════════════════════════════════
  // AUDIT API
  // ═══════════════════════════════════════════════════════════════

  async getAuditLogs(params?: any): Promise<ApiResponse> {
    return await ApiService.get('/audit/logs/', params);
  }

  async getAuditLog(id: string): Promise<ApiResponse> {
    return await ApiService.get(`/audit/logs/${id}/`);
  }
}

export default DataService.getInstance();