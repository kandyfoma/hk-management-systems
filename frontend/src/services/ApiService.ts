/**
 * ApiService - Central API client for communicating with Django backend
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

// Backend API URL - adjust based on your backend setup
const getBaseURL = () => {
  if (Platform.OS === 'web') {
    return 'http://127.0.0.1:8000/api/v1';
  }
  // For mobile emulator/device
  return 'http://10.0.2.2:8000/api/v1'; // Android emulator
  // Use 'http://127.0.0.1:8000/api/v1' for iOS simulator
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
      timeout: 30000,
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
    // Request interceptor - add auth token
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (token) {
          config.headers.Authorization = `Token ${token}`;
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
          // Token expired or invalid
          await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
          // You might want to dispatch a logout action here
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
      return {
        success: false,
        error: {
          message: 'Network error. Please check your connection.',
          status: 0,
        },
      };
    } else {
      // Other error
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

  async post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.post(url, data);
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

  async delete<T = any>(url: string): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.delete(url);
      return this.handleApiResponse<T>(response);
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
      // Use license validation endpoint as health check (doesn't require auth)
      const response = await this.axiosInstance.post('/licenses/validate/', 
        { license_key: 'HEALTH_CHECK' }, 
        { timeout: 5000 }
      );
      // Even if license is invalid, a successful response means backend is reachable
      return response.status === 200;
    } catch (error) {
      // Check if it's a network error vs API error
      if (error?.response?.status) {
        // Got a response from server (even if error), so connection is working
        return true; 
      }
      // Network/timeout error - backend unreachable
      return false;
    }
  }
}

export default ApiService;