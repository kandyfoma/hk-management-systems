import axios, { AxiosInstance } from 'axios';

// Base API configuration
const API_BASE = 'http://your-backend-url/api/v1';  // Update with actual backend URL

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
  async getHealthSurveillancePrograms(): Promise<Array<{
    id: string;
    name: string;
    workersEnrolled: number;
    dueSoon: number;
    overdue: number;
  }>> {
    try {
      const response = await this.api.get('/surveillance/programs/');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch surveillance programs:', error);
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
