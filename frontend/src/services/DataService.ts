/**
 * DataService - Service for all non-auth API calls
 * Handles CRUD operations for various entities
 */

import ApiService, { ApiResponse } from './ApiService';

// ── shorthand so every method reads cleanly ──────────────────
const api = () => ApiService.getInstance();

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
    return await api().get('/patients/', params);
  }

  async getPatient(id: string): Promise<ApiResponse> {
    return await api().get(`/patients/${id}/`);
  }

  async createPatient(patientData: any): Promise<ApiResponse> {
    return await api().post('/patients/', patientData);
  }

  async updatePatient(id: string, patientData: any): Promise<ApiResponse> {
    return await api().patch(`/patients/${id}/`, patientData);
  }

  async deletePatient(id: string): Promise<ApiResponse> {
    return await api().delete(`/patients/${id}/`);
  }

  // ═══════════════════════════════════════════════════════════════
  // INVENTORY API
  // ═══════════════════════════════════════════════════════════════

  async getInventoryItems(params?: any): Promise<ApiResponse> {
    return await api().get('/inventory/items/', params);
  }

  async getInventoryItem(id: string): Promise<ApiResponse> {
    return await api().get(`/inventory/items/${id}/`);
  }

  async createInventoryItem(itemData: any): Promise<ApiResponse> {
    return await api().post('/inventory/items/', itemData);
  }

  async updateInventoryItem(id: string, itemData: any): Promise<ApiResponse> {
    return await api().patch(`/inventory/items/${id}/`, itemData);
  }

  async deleteInventoryItem(id: string): Promise<ApiResponse> {
    return await api().delete(`/inventory/items/${id}/`);
  }

  // ═══════════════════════════════════════════════════════════════
  // PRESCRIPTIONS API
  // ═══════════════════════════════════════════════════════════════

  async getPrescriptions(params?: any): Promise<ApiResponse> {
    return await api().get('/prescriptions/', params);
  }

  async getPrescription(id: string): Promise<ApiResponse> {
    return await api().get(`/prescriptions/${id}/`);
  }

  async createPrescription(prescriptionData: any): Promise<ApiResponse> {
    return await api().post('/prescriptions/', prescriptionData);
  }

  async updatePrescription(id: string, prescriptionData: any): Promise<ApiResponse> {
    return await api().patch(`/prescriptions/${id}/`, prescriptionData);
  }

  async deletePrescription(id: string): Promise<ApiResponse> {
    return await api().delete(`/prescriptions/${id}/`);
  }

  // ═══════════════════════════════════════════════════════════════
  // SALES API
  // ═══════════════════════════════════════════════════════════════

  async getSales(params?: any): Promise<ApiResponse> {
    return await api().get('/sales/', params);
  }

  async getSale(id: string): Promise<ApiResponse> {
    return await api().get(`/sales/${id}/`);
  }

  async createSale(saleData: any): Promise<ApiResponse> {
    return await api().post('/sales/', saleData);
  }

  async updateSale(id: string, saleData: any): Promise<ApiResponse> {
    return await api().patch(`/sales/${id}/`, saleData);
  }

  async deleteSale(id: string): Promise<ApiResponse> {
    return await api().delete(`/sales/${id}/`);
  }

  // ═══════════════════════════════════════════════════════════════
  // HOSPITAL API
  // ═══════════════════════════════════════════════════════════════

  async getAppointments(params?: any): Promise<ApiResponse> {
    return await api().get('/hospital/appointments/', params);
  }

  async createAppointment(appointmentData: any): Promise<ApiResponse> {
    return await api().post('/hospital/appointments/', appointmentData);
  }

  async updateAppointment(id: string, appointmentData: any): Promise<ApiResponse> {
    return await api().patch(`/hospital/appointments/${id}/`, appointmentData);
  }

  async getDepartments(): Promise<ApiResponse> {
    return await api().get('/hospital/departments/');
  }

  async getRooms(params?: any): Promise<ApiResponse> {
    return await api().get('/hospital/rooms/', params);
  }

  async getAdmissions(params?: any): Promise<ApiResponse> {
    return await api().get('/hospital/admissions/', params);
  }

  async createAdmission(admissionData: any): Promise<ApiResponse> {
    return await api().post('/hospital/admissions/', admissionData);
  }

  // ═══════════════════════════════════════════════════════════════
  // PHARMACY DASHBOARD API
  // ═══════════════════════════════════════════════════════════════

  async getPharmacyDashboardMetrics(): Promise<ApiResponse> {
    return await api().get('/inventory/pharmacy/dashboard/metrics/');
  }

  async getPharmacyTopProducts(params?: { days?: number; limit?: number }): Promise<ApiResponse> {
    return await api().get('/inventory/pharmacy/dashboard/top-products/', params);
  }

  async getPharmacyRecentSales(params?: { limit?: number }): Promise<ApiResponse> {
    return await api().get('/inventory/pharmacy/dashboard/recent-sales/', params);
  }

  // ═══════════════════════════════════════════════════════════════
  // PHARMACY ANALYTICS API
  // ═══════════════════════════════════════════════════════════════

  async getPharmacyAnalyticsOverview(params?: { days?: number }): Promise<ApiResponse> {
    return await api().get('/inventory/pharmacy/analytics/overview/', params);
  }

  // ═══════════════════════════════════════════════════════════════
  // PHARMACY STOCK ALERTS API
  // ═══════════════════════════════════════════════════════════════

  async getPharmacyStockAlerts(): Promise<ApiResponse> {
    return await api().get('/inventory/pharmacy/alerts/active/');
  }

  async acknowledgeStockAlert(alertId: string): Promise<ApiResponse> {
    return await api().post(`/inventory/pharmacy/alerts/${alertId}/acknowledge/`);
  }

  // ═══════════════════════════════════════════════════════════════
  // PHARMACY SALES REPORTS API
  // ═══════════════════════════════════════════════════════════════

  async getPharmacySalesReports(params?: { start_date?: string; end_date?: string }): Promise<ApiResponse> {
    return await api().get('/inventory/pharmacy/reports/sales/', params);
  }

  // ═══════════════════════════════════════════════════════════════
  // SUPPLIERS API (Enhanced)
  // ═══════════════════════════════════════════════════════════════

  async getSuppliers(params?: any): Promise<ApiResponse> {
    return await api().get('/suppliers/', params);
  }

  async getSupplier(id: string): Promise<ApiResponse> {
    return await api().get(`/suppliers/${id}/`);
  }

  async createSupplier(supplierData: any): Promise<ApiResponse> {
    return await api().post('/suppliers/', supplierData);
  }

  async updateSupplier(id: string, supplierData: any): Promise<ApiResponse> {
    return await api().patch(`/suppliers/${id}/`, supplierData);
  }

  async deleteSupplier(id: string): Promise<ApiResponse> {
    return await api().delete(`/suppliers/${id}/`);
  }

  // ═══════════════════════════════════════════════════════════════
  // ENHANCED INVENTORY API
  // ═══════════════════════════════════════════════════════════════

  async getInventoryBatches(params?: any): Promise<ApiResponse> {
    return await api().get('/inventory/batches/', params);
  }

  async getInventoryBatch(id: string): Promise<ApiResponse> {
    return await api().get(`/inventory/batches/${id}/`);
  }

  async createInventoryBatch(batchData: any): Promise<ApiResponse> {
    return await api().post('/inventory/batches/', batchData);
  }

  async updateInventoryBatch(id: string, batchData: any): Promise<ApiResponse> {
    return await api().patch(`/inventory/batches/${id}/`, batchData);
  }

  async getStockMovements(params?: any): Promise<ApiResponse> {
    return await api().get('/inventory/movements/', params);
  }

  async createStockMovement(movementData: any): Promise<ApiResponse> {
    return await api().post('/inventory/movements/', movementData);
  }

  async getInventoryAlerts(params?: any): Promise<ApiResponse> {
    return await api().get('/inventory/alerts/', params);
  }

  // ═══════════════════════════════════════════════════════════════
  // ENHANCED SALES API
  // ═══════════════════════════════════════════════════════════════

  async getSalesCart(): Promise<ApiResponse> {
    return await api().get('/sales/cart/');
  }

  async addToCart(itemData: any): Promise<ApiResponse> {
    return await api().post('/sales/cart/items/', itemData);
  }

  async updateCartItem(id: string, itemData: any): Promise<ApiResponse> {
    return await api().patch(`/sales/cart/items/${id}/`, itemData);
  }

  async removeFromCart(id: string): Promise<ApiResponse> {
    return await api().delete(`/sales/cart/items/${id}/`);
  }

  async checkoutCart(checkoutData: any): Promise<ApiResponse> {
    return await api().post('/sales/cart/checkout/', checkoutData);
  }

  async getSalePayments(params?: any): Promise<ApiResponse> {
    return await api().get('/sales/payments/', params);
  }

  async getDailySalesReport(date?: string): Promise<ApiResponse> {
    return await api().get('/sales/reports/daily/', date ? { date } : {});
  }

  async getSalesStats(params?: any): Promise<ApiResponse> {
    return await api().get('/sales/reports/stats/', params);
  }

  // ═══════════════════════════════════════════════════════════════
  // ENHANCED PRESCRIPTIONS API
  // ═══════════════════════════════════════════════════════════════

  async getPrescriptionItems(prescriptionId: string): Promise<ApiResponse> {
    return await api().get(`/prescriptions/${prescriptionId}/items/`);
  }

  async createPrescriptionItem(prescriptionId: string, itemData: any): Promise<ApiResponse> {
    return await api().post(`/prescriptions/${prescriptionId}/items/`, itemData);
  }

  async updatePrescriptionItem(id: string, itemData: any): Promise<ApiResponse> {
    return await api().patch(`/prescriptions/items/${id}/`, itemData);
  }

  async dispensePrescription(prescriptionId: string, dispensingData: any): Promise<ApiResponse> {
    return await api().post(`/prescriptions/${prescriptionId}/dispense/`, dispensingData);
  }

  async dispenseItem(itemId: string, dispensingData: any): Promise<ApiResponse> {
    return await api().post(`/prescriptions/items/${itemId}/dispense/`, dispensingData);
  }

  async getPrescriptionNotes(prescriptionId: string): Promise<ApiResponse> {
    return await api().get(`/prescriptions/${prescriptionId}/notes/`);
  }

  async addPrescriptionNote(prescriptionId: string, noteData: any): Promise<ApiResponse> {
    return await api().post(`/prescriptions/${prescriptionId}/notes/`, noteData);
  }

  async getPrescriptionImages(prescriptionId: string): Promise<ApiResponse> {
    return await api().get(`/prescriptions/${prescriptionId}/images/`);
  }

  async addPrescriptionImage(prescriptionId: string, imageData: any): Promise<ApiResponse> {
    return await api().post(`/prescriptions/${prescriptionId}/images/`, imageData);
  }

  async getPendingPrescriptions(): Promise<ApiResponse> {
    return await api().get('/prescriptions/reports/pending/');
  }

  async getExpiredPrescriptions(): Promise<ApiResponse> {
    return await api().get('/prescriptions/reports/expired/');
  }

  async getPrescriptionStats(): Promise<ApiResponse> {
    return await api().get('/prescriptions/reports/stats/');
  }

  async cancelPrescription(prescriptionId: string): Promise<ApiResponse> {
    return await api().post(`/prescriptions/${prescriptionId}/cancel/`);
  }

  async completePrescription(prescriptionId: string): Promise<ApiResponse> {
    return await api().post(`/prescriptions/${prescriptionId}/complete/`);
  }

  // ═══════════════════════════════════════════════════════════════
  // INVENTORY REPORTS API
  // ═══════════════════════════════════════════════════════════════

  async getExpiringProducts(params?: any): Promise<ApiResponse> {
    return await api().get('/inventory/reports/expiring/', params);
  }

  async getLowStockProducts(params?: any): Promise<ApiResponse> {
    return await api().get('/inventory/reports/low-stock/', params);
  }

  async getInventoryStats(): Promise<ApiResponse> {
    return await api().get('/inventory/reports/stats/');
  }

  // ═══════════════════════════════════════════════════════════════
  // MÉDECINE DU TRAVAIL API
  // ═══════════════════════════════════════════════════════════════

  async getOccupationalHealthRecords(params?: any): Promise<ApiResponse> {
    return await api().get('/occupational-health/employee-records/', params);
  }

  async createOccupationalHealthRecord(recordData: any): Promise<ApiResponse> {
    return await api().post('/occupational-health/employee-records/', recordData);
  }

  async getHealthAssessments(params?: any): Promise<ApiResponse> {
    return await api().get('/occupational-health/assessments/', params);
  }

  async createHealthAssessment(assessmentData: any): Promise<ApiResponse> {
    return await api().post('/occupational-health/assessments/', assessmentData);
  }

  // ═══════════════════════════════════════════════════════════════
  // SUPPLIERS API
  // ═══════════════════════════════════════════════════════════════

  async getSuppliers(params?: any): Promise<ApiResponse> {
    return await api().get('/suppliers/', params);
  }

  async getSupplier(id: string): Promise<ApiResponse> {
    return await api().get(`/suppliers/${id}/`);
  }

  async createSupplier(supplierData: any): Promise<ApiResponse> {
    return await api().post('/suppliers/', supplierData);
  }

  async updateSupplier(id: string, supplierData: any): Promise<ApiResponse> {
    return await api().patch(`/suppliers/${id}/`, supplierData);
  }

  async deleteSupplier(id: string): Promise<ApiResponse> {
    return await api().delete(`/suppliers/${id}/`);
  }

  // ═══════════════════════════════════════════════════════════════
  // ORGANIZATIONS API
  // ═══════════════════════════════════════════════════════════════

  async getOrganizations(params?: any): Promise<ApiResponse> {
    return await api().get('/organizations/', params);
  }

  async getOrganization(id: string): Promise<ApiResponse> {
    return await api().get(`/organizations/${id}/`);
  }

  async updateOrganization(id: string, orgData: any): Promise<ApiResponse> {
    return await api().patch(`/organizations/${id}/`, orgData);
  }

  // ═══════════════════════════════════════════════════════════════
  // LICENSES API
  // ═══════════════════════════════════════════════════════════════

  async getLicenses(params?: any): Promise<ApiResponse> {
    return await api().get('/licenses/', params);
  }

  async getLicense(id: string): Promise<ApiResponse> {
    return await api().get(`/licenses/${id}/`);
  }

  async validateLicense(licenseKey: string): Promise<ApiResponse> {
    return await api().post('/licenses/validate/', { license_key: licenseKey });
  }

  // ═══════════════════════════════════════════════════════════════
  // USERS API
  // ═══════════════════════════════════════════════════════════════

  async getUsers(params?: any): Promise<ApiResponse> {
    return await api().get('/auth/users/', params);
  }

  async getUser(id: string): Promise<ApiResponse> {
    return await api().get(`/auth/users/${id}/`);
  }

  async createUser(userData: any): Promise<ApiResponse> {
    return await api().post('/auth/users/', userData);
  }

  async updateUser(id: string, userData: any): Promise<ApiResponse> {
    return await api().patch(`/auth/users/${id}/`, userData);
  }

  async deleteUser(id: string): Promise<ApiResponse> {
    return await api().delete(`/auth/users/${id}/`);
  }

  // ═══════════════════════════════════════════════════════════════
  // CHOICES/OPTIONS API
  // ═══════════════════════════════════════════════════════════════

  async getUserRoleChoices(): Promise<ApiResponse> {
    return await api().get('/auth/choices/roles/');
  }

  async getPermissionChoices(): Promise<ApiResponse> {
    return await api().get('/auth/choices/permissions/');
  }

  // ═══════════════════════════════════════════════════════════════
  // AUDIT API
  // ═══════════════════════════════════════════════════════════════

  async getAuditLogs(params?: any): Promise<ApiResponse> {
    return await api().get('/audit/logs/', params);
  }

  async getAuditLog(id: string): Promise<ApiResponse> {
    return await api().get(`/audit/logs/${id}/`);
  }
}

export default DataService.getInstance();