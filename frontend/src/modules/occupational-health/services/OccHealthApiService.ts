import axios, { AxiosInstance } from 'axios';

// Base API configuration
// Update with your backend URL (e.g., http://localhost:8000/api)
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// ─── Types ──────────────────────────────────────────────────────
export interface DashboardMetrics {
  examScheduled: number;
  examCompleted: number;
  examPending: number;
  incidentsOpen: number;
  incidentsLTI: number;
  incidentsCritical: number;
  certificatesIssued: number;
  certificatesExpiring: number;
  casesOfLTI: number;
  frequencyRate: number;
  severityRate: number;
}

export interface ExamSchedule {
  id: string;
  workerId: string;
  workerName: string;
  examType: 'pre-employment' | 'periodic' | 'return-to-work' | 'exit' | 'follow-up';
  dateScheduled: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  results?: ExamResult[];
}

export interface ExamResult {
  id: string;
  examId: string;
  testType: 'spirometry' | 'audiometry' | 'vision' | 'blood-pressure' | 'xray' | 'heavy-metals' | 'drug-alcohol';
  value: any;
  normalRange: string;
  status: 'normal' | 'abnormal' | 'pending';
  notes?: string;
}

export interface Certificate {
  id: string;
  workerId: string;
  workerName: string;
  status: 'fit' | 'fit-with-restrictions' | 'unfit';
  issuedDate: string;
  expiryDate: string;
  restrictions?: string[];
}

export interface Incident {
  id: string;
  type: 'accident' | 'near-miss' | 'medical-treatment' | 'lost-time' | 'dangerous-incident';
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'under-investigation' | 'closed';
  dateOccurred: string;
  workerId: string;
  workerName: string;
  description: string;
  isLTI: boolean;
  daysLost?: number;
}

export interface ComplianceMetrics {
  total: number;
  compliant: number;
  partial: number;
  nonCompliant: number;
  percentage: number;
}

export interface FeatureStats {
  totalFeatures: number;
  completeFeatures: number;
  partialFeatures: number;
  pendingFeatures: number;
  completionPercentage: number;
}

// ─── API Service ─────────────────────────────────────────────────
class OccHealthApiService {
  private api: AxiosInstance;

  constructor(baseURL: string = API_BASE) {
    this.api = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests if available
    this.api.interceptors.request.use(async (config) => {
      try {
        const token = await this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (e) {
        console.warn('Failed to get auth token:', e);
      }
      return config;
    });

    // Handle errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        throw error;
      }
    );
  }

  private async getToken(): Promise<string | null> {
    // Implementation depends on your auth system (AsyncStorage, Redux, etc.)
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem('auth_token');
    } catch (e) {
      return null;
    }
  }

  // ─── Dashboard Metrics ──────────────────────────────────────
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      const response = await this.api.get<DashboardMetrics>('/dashboard/metrics/');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch dashboard metrics:', error);
      // Return mock data for development
      return {
        examScheduled: 24,
        examCompleted: 156,
        examPending: 12,
        incidentsOpen: 8,
        incidentsLTI: 2,
        incidentsCritical: 1,
        certificatesIssued: 89,
        certificatesExpiring: 7,
        casesOfLTI: 2,
        frequencyRate: 2.5,
        severityRate: 18.3,
      };
    }
  }

  // ─── Exam Schedules ─────────────────────────────────────────
  async getExamSchedules(
    status?: string,
    examType?: string,
    limit: number = 50
  ): Promise<ExamSchedule[]> {
    try {
      const params = { limit };
      if (status) params.status = status;
      if (examType) params.exam_type = examType;

      const response = await this.api.get<ExamSchedule[]>('/examinations/schedules/', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch exam schedules:', error);
      return [];
    }
  }

  // ─── Exam Results ───────────────────────────────────────────
  async getExamResults(examId: string): Promise<ExamResult[]> {
    try {
      const response = await this.api.get<ExamResult[]>(`/examinations/${examId}/results/`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch exam results:', error);
      return [];
    }
  }

  // ─── Certificates ───────────────────────────────────────────
  async getCertificates(status?: string, limit: number = 50): Promise<Certificate[]> {
    try {
      const params = { limit };
      if (status) params.status = status;

      const response = await this.api.get<Certificate[]>('/certificates/', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch certificates:', error);
      return [];
    }
  }

  async getCertificatesExpiring(daysThreshold: number = 30): Promise<Certificate[]> {
    try {
      const response = await this.api.get<Certificate[]>('/certificates/expiring/', {
        params: { days_threshold: daysThreshold },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch expiring certificates:', error);
      return [];
    }
  }

  // ─── Incidents ──────────────────────────────────────────────
  async getIncidents(status?: string, type?: string, limit: number = 50): Promise<Incident[]> {
    try {
      const params = { limit };
      if (status) params.status = status;
      if (type) params.type = type;

      const response = await this.api.get<Incident[]>('/incidents/', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch incidents:', error);
      return [];
    }
  }

  async getIncidentsLTI(limit: number = 50): Promise<Incident[]> {
    try {
      const response = await this.api.get<Incident[]>('/incidents/lti/', { params: { limit } });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch LTI incidents:', error);
      return [];
    }
  }

  // ─── Compliance ─────────────────────────────────────────────
  async getComplianceMetrics(framework?: 'iso-27001' | 'iso-45001'): Promise<ComplianceMetrics> {
    try {
      const params = {};
      if (framework) params.framework = framework;

      const response = await this.api.get<ComplianceMetrics>('/compliance/metrics/', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch compliance metrics:', error);
      // Return mock data
      return {
        total: 45,
        compliant: 32,
        partial: 10,
        nonCompliant: 3,
        percentage: 71,
      };
    }
  }

  // ─── Feature Status ─────────────────────────────────────────
  async getFeatureStats(): Promise<FeatureStats> {
    try {
      const response = await this.api.get<FeatureStats>('/health/features/stats/');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch feature stats:', error);
      // Return mock data
      return {
        totalFeatures: 35,
        completeFeatures: 23,
        partialFeatures: 8,
        pendingFeatures: 4,
        completionPercentage: 66,
      };
    }
  }

  // ─── Worker Statistics ──────────────────────────────────────
  async getWorkerStats(): Promise<{
    totalWorkers: number;
    activeWorkers: number;
    newThisMonth: number;
    medicalExamsDue: number;
  }> {
    try {
      const response = await this.api.get('/workers/stats/');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch worker stats:', error);
      return {
        totalWorkers: 1243,
        activeWorkers: 1156,
        newThisMonth: 23,
        medicalExamsDue: 32,
      };
    }
  }

  // ─── Exposure Monitoring ────────────────────────────────────
  async getExposureMonitoringStats(): Promise<{
    safe: number;
    exceeded: number;
    critical: number;
  }> {
    try {
      const response = await this.api.get('/exposure-monitoring/stats/');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch exposure stats:', error);
      return {
        safe: 156,
        exceeded: 5,
        critical: 0,
      };
    }
  }

  // ─── KPI Data ───────────────────────────────────────────────
  async getKPITrends(
    kpiType: 'ltifr' | 'trifr' | 'severity' | 'absenteeism',
    months: number = 12
  ): Promise<Array<{ month: string; value: number }>> {
    try {
      const response = await this.api.get(`/kpi/trends/${kpiType}/`, {
        params: { months },
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch ${kpiType} trends:`, error);
      return [];
    }
  }

  // ─── Health Surveillance ────────────────────────────────────
  
  // Fetch all surveillance programs with optional filtering
  async getSurveillancePrograms(params?: { sector?: string; isActive?: boolean }): Promise<any[]> {
    try {
      const response = await this.api.get('/surveillance/programs/', { params });
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch surveillance programs:', error);
      return [];
    }
  }

  // Create new surveillance program
  async createSurveillanceProgram(programData: any): Promise<any> {
    try {
      const response = await this.api.post('/surveillance/programs/', programData);
      return response.data;
    } catch (error) {
      console.error('Failed to create surveillance program:', error);
      throw error;
    }
  }

  // Update surveillance program
  async updateSurveillanceProgram(id: string, programData: any): Promise<any> {
    try {
      const response = await this.api.patch(`/surveillance/programs/${id}/`, programData);
      return response.data;
    } catch (error) {
      console.error('Failed to update surveillance program:', error);
      throw error;
    }
  }

  // Delete surveillance program
  async deleteSurveillanceProgram(id: string): Promise<boolean> {
    try {
      await this.api.delete(`/surveillance/programs/${id}/`);
      return true;
    } catch (error) {
      console.error('Failed to delete surveillance program:', error);
      return false;
    }
  }

  // Get surveillance programs with enrollment stats
  async getHealthSurveillancePrograms(): Promise<Array<{
    id: string;
    name: string;
    workersEnrolled: number;
    dueSoon: number;
    overdue: number;
  }>> {
    try {
      const response = await this.api.get('/surveillance/programs/stats/');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch surveillance programs:', error);
      return [];
    }
  }

  // Check exam results against surveillance program thresholds
  async checkExamThresholds(examId: string, programId: string): Promise<{
    violations: Array<{
      parameter: string;
      level: 'warning' | 'action' | 'critical';
      value: number;
      threshold: number;
      actionRequired: string;
    }>;
    overallStatus: 'compliant' | 'non-compliant' | 'critical';
  }> {
    try {
      const response = await this.api.post('/surveillance/check-thresholds/', {
        exam_id: examId,
        program_id: programId,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to check exam thresholds:', error);
      return { violations: [], overallStatus: 'compliant' };
    }
  }

  // Get surveillance compliance metrics by sector/enterprise
  async getSurveillanceCompliance(params?: { 
    enterprise_id?: string; 
    sector?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    totalWorkers: number;
    workersInSurveillance: number;
    complianceRate: number;
    dueSoonCount: number;
    overdueCount: number;
    programStats: Array<{
      programId: string;
      programName: string;
      enrolledWorkers: number;
      completedExams: number;
      pendingExams: number;
      overdueExams: number;
    }>;
  }> {
    try {
      const response = await this.api.get('/surveillance/compliance/', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch surveillance compliance:', error);
      return {
        totalWorkers: 0,
        workersInSurveillance: 0,
        complianceRate: 0,
        dueSoonCount: 0,
        overdueCount: 0,
        programStats: [],
      };
    }
  }

  // Enroll worker in surveillance program
  async enrollWorkerInSurveillance(workerId: string, programId: string): Promise<any> {
    try {
      const response = await this.api.post('/surveillance/enroll/', {
        worker_id: workerId,
        program_id: programId,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to enroll worker in surveillance:', error);
      throw error;
    }
  }

  // Get worker's surveillance enrollment status
  async getWorkerSurveillanceStatus(workerId: string): Promise<{
    enrolledPrograms: Array<{
      programId: string;
      programName: string;
      enrollmentDate: string;
      lastExamDate?: string;
      nextExamDue: string;
      status: 'compliant' | 'due-soon' | 'overdue';
    }>;
    overallStatus: 'compliant' | 'due-soon' | 'overdue';
  }> {
    try {
      const response = await this.api.get(`/surveillance/worker/${workerId}/status/`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch worker surveillance status:', error);
      return { enrolledPrograms: [], overallStatus: 'compliant' };
    }
  }

  // Get threshold violations
  async getThresholdViolations(params?: {
    severity?: 'warning' | 'action' | 'critical';
    programId?: string;
    status?: 'open' | 'resolved';
  }): Promise<Array<{
    id: string;
    workerId: string;
    workerName: string;
    programName: string;
    parameter: string;
    value: number;
    threshold: number;
    severity: 'warning' | 'action' | 'critical';
    actionRequired: string;
    createdAt: string;
    status: 'open' | 'resolved';
  }>> {
    try {
      const response = await this.api.get('/surveillance/threshold-violations/', { params });
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch threshold violations:', error);
      return [];
    }
  }

  // Resolve a threshold violation
  async resolveThresholdViolation(violationId: string, resolution: string): Promise<any> {
    try {
      const response = await this.api.patch(`/surveillance/threshold-violations/${violationId}/`, {
        status: 'resolved',
        resolution,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to resolve threshold violation:', error);
      throw error;
    }
  }

  // Generate surveillance compliance report
  async generateComplianceReport(params?: {
    startDate?: string;
    endDate?: string;
    sector?: string;
    enterpriseId?: string;
    format?: 'json' | 'pdf';
  }): Promise<any> {
    try {
      const response = await this.api.get('/surveillance/compliance-report/', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to generate compliance report:', error);
      throw error;
    }
  }

  // Get surveillance trends over time
  async getSurveillanceTrends(params?: {
    programId?: string;
    startDate?: string;
    endDate?: string;
    interval?: 'daily' | 'weekly' | 'monthly';
  }): Promise<Array<{
    date: string;
    completedExams: number;
    dueSoonCount: number;
    overdueCount: number;
    violationCount: number;
  }>> {
    try {
      const response = await this.api.get('/surveillance/trends/', { params });
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch surveillance trends:', error);
      return [];
    }
  }

  // ─── Disease Registry ────────────────────────────────────────
  async getDiseaseRegistry(limit: number = 20): Promise<Array<{
    id: string;
    workerName: string;
    diseaseType: string;
    dateReported: string;
    status: 'under-investigation' | 'confirmed' | 'closed';
  }>> {
    try {
      const response = await this.api.get('/diseases/registry/', { params: { limit } });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch disease registry:', error);
      return [];
    }
  }

  // ─── Protocols & Procedures ─────────────────────────────────
  async getProtocols(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    lastUpdated: string;
    status: 'active' | 'archived';
  }>> {
    try {
      const response = await this.api.get('/protocols/');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch protocols:', error);
      return [];
    }
  }

  // ─── Batch Updates ──────────────────────────────────────────
  async getFullDashboardData() {
    try {
      const [
        metrics,
        exams,
        certificates,
        incidents,
        compliance,
        workers,
        exposure,
      ] = await Promise.all([
        this.getDashboardMetrics(),
        this.getExamSchedules('pending'),
        this.getCertificatesExpiring(),
        this.getIncidents('open'),
        this.getComplianceMetrics(),
        this.getWorkerStats(),
        this.getExposureMonitoringStats(),
      ]);

      return {
        metrics,
        exams,
        certificates,
        incidents,
        compliance,
        workers,
        exposure,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Failed to fetch full dashboard data:', error);
      return null;
    }
  }
}

// Export singleton instance
export const occHealthApiService = new OccHealthApiService();

// ─── Hook for React Components ──────────────────────────────────
import { useEffect, useState } from 'react';

export function useDashboardData() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await occHealthApiService.getFullDashboardData();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const refetch = async () => {
    try {
      setLoading(true);
      const result = await occHealthApiService.getFullDashboardData();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch };
}
