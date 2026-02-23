/**
 * ApiService - Central API client for communicating with Django backend
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

// Backend API URL - adjust based on your backend setup
const extractDevHost = (): string | null => {
  try {
    const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
    if (!scriptURL) return null;

    const match = scriptURL.match(/^[a-zA-Z]+:\/\/([^/:]+)/);
    const host = match?.[1] ?? null;
    if (!host) return null;
    if (host === 'localhost' || host === '127.0.0.1') return null;
    return host;
  } catch {
    return null;
  }
};

const getBaseURL = () => {
  const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.API_BASE_URL;
  if (envBaseUrl) {
    return envBaseUrl.replace(/\/$/, '');
  }

  if (Platform.OS === 'web') {
    const webHost = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
    const host = webHost === 'localhost' ? '127.0.0.1' : webHost;
    return `http://${host}:8000/api/v1`;
  }

  // Physical device on same Wi-Fi as dev machine
  const devHost = extractDevHost();
  if (devHost) {
    return `http://${devHost}:8000/api/v1`;
  }

  // Emulators/simulators fallback
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000/api/v1';
  }

  return 'http://127.0.0.1:8000/api/v1';
};

const API_BASE_URL = getBaseURL();
const AUTH_TOKEN_KEY = 'auth_token';

// ═══════════════════════════════════════════════════════════════
// API ERROR TYPES
// ═══════════════════════════════════════════════════════════════

export interface ApiError {
  message: string;
  status?: number;
  field?: string;
  code?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  errors?: { [key: string]: string[] };
}

// ═══════════════════════════════════════════════════════════════
// API SERVICE CLASS
// ═══════════════════════════════════════════════════════════════

class ApiService {
  private static instance: ApiService;
  private axiosInstance: AxiosInstance;

  private constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 120000, // Extended to 120s for Gemini API calls
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  private setupInterceptors() {
    // Request interceptor - add auth token and handle FormData
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (token) {
          config.headers.Authorization = `Token ${token}`;
        }

        // If data is FormData, delete Content-Type so browser/axios sets it with boundary
        if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
          delete config.headers['Content-Type'];
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle errors
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid - but don't automatically clear it here
          // Let the ApiAuthService handle proper logout flow
          console.log('401 error detected, token may be invalid');
        }
        return Promise.reject(error);
      }
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════

  private handleApiResponse<T>(response: AxiosResponse): ApiResponse<T> {
    return {
      success: true,
      data: response.data,
    };
  }

  private handleApiError(error: AxiosError): ApiResponse {
    if (error.response) {
      // Server responded with error status
      const errorData = error.response.data as any;
      console.error('[ApiService] Server Error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: errorData,
        config: {
          url: error.config?.url,
          method: error.config?.method,
        },
      });
      
      if (errorData.detail) {
        return {
          success: false,
          error: {
            message: errorData.detail,
            status: error.response.status,
          },
        };
      }

      if (errorData.non_field_errors) {
        return {
          success: false,
          error: {
            message: errorData.non_field_errors[0],
            status: error.response.status,
          },
        };
      }

      // Field-specific errors
      if (typeof errorData === 'object') {
        const firstError = Object.values(errorData)[0];
        return {
          success: false,
          error: {
            message: Array.isArray(firstError) ? firstError[0] : String(firstError),
            status: error.response.status,
          },
          errors: errorData,
        };
      }

      return {
        success: false,
        error: {
          message: 'An error occurred',
          status: error.response.status,
        },
      };
    } else if (error.request) {
      // Network error
      console.error('[ApiService] Network Error:', {
        message: error.message,
        code: error.code,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          timeout: error.config?.timeout,
        },
      });
      return {
        success: false,
        error: {
          message: 'Network error. Please check your connection.',
          status: 0,
        },
      };
    } else {
      // Other error
      console.error('[ApiService] Error:', {
        message: error.message,
        code: error.code,
      });
      return {
        success: false,
        error: {
          message: error.message || 'An unexpected error occurred',
        },
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HTTP METHODS
  // ═══════════════════════════════════════════════════════════════

  async get<T = any>(url: string, params?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.get(url, { params });
      return this.handleApiResponse<T>(response);
    } catch (error) {
      return this.handleApiError(error as AxiosError);
    }
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.post(url, data, config);
      return this.handleApiResponse<T>(response);
    } catch (error) {
      return this.handleApiError(error as AxiosError);
    }
  }

  async put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.put(url, data);
      return this.handleApiResponse<T>(response);
    } catch (error) {
      return this.handleApiError(error as AxiosError);
    }
  }

  async patch<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.patch(url, data);
      return this.handleApiResponse<T>(response);
    } catch (error) {
      return this.handleApiError(error as AxiosError);
    }
  }

  async delete<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.delete(url, data ? { data } : undefined);
      return this.handleApiResponse<T>(response);
    } catch (error) {
      return this.handleApiError(error as AxiosError);
    }
  }

  async getBlob(url: string, params?: any): Promise<ApiResponse<{ blob: Blob; fileName?: string }>> {
    try {
      const response = await this.axiosInstance.get(url, {
        params,
        responseType: 'blob',
      });

      const disposition = response.headers?.['content-disposition'] as string | undefined;
      const fileNameMatch = disposition?.match(/filename\*?=(?:UTF-8''|"?)([^";]+)/i);
      const fileName = fileNameMatch?.[1]?.replace(/"/g, '');

      return {
        success: true,
        data: {
          blob: response.data as Blob,
          fileName,
        },
      };
    } catch (error) {
      return this.handleApiError(error as AxiosError);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // TOKEN MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  async setAuthToken(token: string): Promise<void> {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  }

  async removeAuthToken(): Promise<void> {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  }

  async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  }

  // ═══════════════════════════════════════════════════════════════
  // CONNECTIVITY CHECK
  // ═══════════════════════════════════════════════════════════════

  async checkConnection(): Promise<boolean> {
    try {
      // Lightweight authenticated probe to verify backend reachability
      const response = await this.axiosInstance.get('/sales/reports/stats/', {
        timeout: 5000,
      });
      return response.status >= 200 && response.status < 500;
    } catch (error) {
      // If we received any HTTP response, backend is reachable.
      const maybeAxiosError = error as any;
      if (maybeAxiosError?.response?.status) {
        return true;
      }
      // No response means network/timeout/unreachable backend
      return false;
    }
  }
}

export default ApiService;