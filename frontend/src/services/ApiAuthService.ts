/**
 * ApiAuthService - Authentication service that communicates with Django backend
 * Replaces the SQLite-based AuthService with REST API calls
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService, { ApiResponse } from './ApiService';
import { User } from '../models/User';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface LoginCredentials {
  phone: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: User;
  organization: {
    id: string;
    name: string;
    license_key: string;
  };
}

interface AuthResult {
  success: boolean;
  user?: User;
  organization?: any;
  error?: string;
  requiresLicenseKey?: boolean;
}

interface RegistrationData {
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  licenseKey: string;
  role?: string;
}

const SESSION_KEY = 'auth_session';
const USER_KEY = 'current_user';
const ORG_KEY = 'current_organization';

// ═══════════════════════════════════════════════════════════════
// API AUTH SERVICE
// ═══════════════════════════════════════════════════════════════

export class ApiAuthService {
  private static instance: ApiAuthService;

  private constructor() {}

  public static getInstance(): ApiAuthService {
    if (!ApiAuthService.instance) {
      ApiAuthService.instance = new ApiAuthService();
    }
    return ApiAuthService.instance;
  }

  // ═══════════════════════════════════════════════════════════════
  // AUTHENTICATION METHODS
  // ═══════════════════════════════════════════════════════════════

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const response: ApiResponse<LoginResponse> = await ApiService.getInstance().post('/auth/login/', {
        phone: credentials.phone,
        password: credentials.password,
      });

      if (response.success && response.data) {
        // Store auth token
        await ApiService.getInstance().setAuthToken(response.data.token);
        
        // Store session data
        const sessionData = {
          isAuthenticated: true,
          user: response.data.user,
          organization: response.data.organization,
          loginTime: new Date().toISOString(),
        };
        
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
        await AsyncStorage.setItem(ORG_KEY, JSON.stringify(response.data.organization));

        return {
          success: true,
          user: response.data.user,
          organization: response.data.organization,
        };
      } else {
        return {
          success: false,
          error: response.error?.message || 'Login failed',
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.',
      };
    }
  }

  async register(registrationData: RegistrationData): Promise<AuthResult> {
    try {
      const response: ApiResponse = await ApiService.getInstance().post('/auth/register/', {
        first_name: registrationData.firstName,
        last_name: registrationData.lastName,
        phone: registrationData.phone,
        password: registrationData.password,
        license_key: registrationData.licenseKey,
        primary_role: registrationData.role || 'STAFF',
      });

      if (response.success) {
        // After successful registration, automatically log in
        return await this.login({
          phone: registrationData.phone,
          password: registrationData.password,
        });
      } else {
        return {
          success: false,
          error: response.error?.message || 'Registration failed',
        };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.',
      };
    }
  }

  async logout(): Promise<void> {
    try {
      // Call backend logout endpoint
      await ApiService.getInstance().post('/auth/logout/');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage regardless of API call result
      await this.clearSessionData();
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<AuthResult> {
    try {
      const response: ApiResponse = await ApiService.getInstance().post('/auth/change-password/', {
        current_password: currentPassword,
        new_password: newPassword,
      });

      return {
        success: response.success,
        error: response.error?.message,
      };
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.',
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SESSION MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await ApiService.getInstance().getAuthToken();
      if (!token) return false;

      // Verify token with backend
      const response: ApiResponse<User> = await ApiService.get('/auth/profile/');
      return response.success;
    } catch (error) {
      console.error('Auth check error:', error);
      return false;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      // First try to get from local storage
      const storedUser = await AsyncStorage.getItem(USER_KEY);
      if (storedUser) {
        return JSON.parse(storedUser) as User;
      }

      // If not in storage, fetch from backend
      const response: ApiResponse<User> = await ApiService.get('/auth/profile/');
      if (response.success && response.data) {
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.data));
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  async getCurrentOrganization(): Promise<any | null> {
    try {
      const storedOrg = await AsyncStorage.getItem(ORG_KEY);
      if (storedOrg) {
        return JSON.parse(storedOrg);
      }
      return null;
    } catch (error) {
      console.error('Get current organization error:', error);
      return null;
    }
  }

  async updateProfile(profileData: Partial<User>): Promise<AuthResult> {
    try {
      const response: ApiResponse<User> = await ApiService.patch('/auth/profile/update/', profileData);
      
      if (response.success && response.data) {
        // Update stored user data
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.data));
        
        return {
          success: true,
          user: response.data,
        };
      } else {
        return {
          success: false,
          error: response.error?.message || 'Profile update failed',
        };
      }
    } catch (error) {
      console.error('Update profile error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.',
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════

  private async clearSessionData(): Promise<void> {
    await Promise.all([
      ApiService.removeAuthToken(),
      AsyncStorage.removeItem(SESSION_KEY),
      AsyncStorage.removeItem(USER_KEY),
      AsyncStorage.removeItem(ORG_KEY),
    ]);
  }

  async refreshUserData(): Promise<User | null> {
    try {
      const response: ApiResponse<User> = await ApiService.get('/auth/profile/');
      if (response.success && response.data) {
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.data));
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Refresh user data error:', error);
      return null;
    }
  }

  async getOrganizationLicenses(): Promise<any[]> {
    try {
      const response: ApiResponse<any[]> = await ApiService.getInstance().get('/organizations/current/licenses/');
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Get organization licenses error:', error);
      return [];
    }
  }

  async getUserModuleAccess(): Promise<any[]> {
    try {
      const response: ApiResponse<any[]> = await ApiService.getInstance().get('/auth/module-access/');
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Get user module access error:', error);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // CONNECTION STATUS
  // ═══════════════════════════════════════════════════════════════

  async checkBackendConnection(): Promise<boolean> {
    return await ApiService.getInstance().checkConnection();
  }

  // ═══════════════════════════════════════════════════════════════
  // MIGRATION FROM OLD SERVICE (temporary methods)
  // ═══════════════════════════════════════════════════════════════

  // Method to help migrate from SQLite to API
  async migrateToApiService(): Promise<void> {
    // Clear old SQLite session data if it exists
    try {
      await this.clearSessionData();
      console.log('Successfully cleared old session data');
    } catch (error) {
      console.error('Error clearing old session data:', error);
    }
  }
}

export default ApiAuthService;