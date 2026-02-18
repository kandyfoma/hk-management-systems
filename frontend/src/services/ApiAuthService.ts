/**
 * ApiAuthService - Authentication service that communicates with Django backend
 * Replaces the SQLite-based AuthService with REST API calls
 */

import { Platform } from 'react-native';
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
      console.log('🔐 ApiAuthService logout initiated');
      // Call backend logout endpoint
      await ApiService.getInstance().post('/auth/logout/');
      console.log('✅ Backend logout successful');
    } catch (error) {
      console.error('Logout error (continuing with local cleanup):', error);
    } finally {
      // Clear local storage regardless of API call result
      console.log('🧹 Clearing local session data');
      await this.clearSessionData();
      console.log('✅ Local session data cleared');
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
      // First check if we have a stored session
      const [token, sessionData] = await Promise.all([
        ApiService.getInstance().getAuthToken(),
        AsyncStorage.getItem(SESSION_KEY)
      ]);
      
      if (!token || !sessionData) {
        console.log('No token or session data found');
        return false;
      }

      const session = JSON.parse(sessionData);
      if (!session.isAuthenticated) {
        console.log('Session marked as not authenticated');
        return false;
      }

      // If we have valid session data, assume user is authenticated
      // Backend verification will happen in background to validate token
      console.log('Valid session found, user is authenticated');
      
      // Verify token with backend in background (don't wait for result)
      this.verifyTokenInBackground();
      
      return true;
    } catch (error) {
      console.error('Auth check error:', error);
      return false;
    }
  }

  // Background token verification - will logout user if token is invalid
  private async verifyTokenInBackground(): Promise<void> {
    try {
      const response: ApiResponse<User> = await ApiService.getInstance().get('/auth/profile/');
      if (!response.success) {
        console.log('Token verification failed, logging out user');
        await this.logout();
        // Notify app to update UI state
        this.notifyLogout();
      } else {
        console.log('Token verification successful');
        // Optionally update user data if it changed
        if (response.data) {
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.data));
        }
      }
    } catch (error: any) {
      console.error('Background token verification error:', error);
      // Only logout if it's a 401 error (unauthorized)
      if (error?.response?.status === 401) {
        console.log('Token expired, logging out user');
        await this.logout();
        this.notifyLogout();
      }
      // For network errors or other issues, keep user logged in
    }
  }

  // Method to notify the app that user should be logged out
  private notifyLogout(): void {
    // Log the logout event for debugging
    console.log('🔐 User logged out due to token verification failure');
    
    // Force app reload on web to ensure clean state
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      console.log('🔄 Forcing app reload due to token failure');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
    
    // Note: For a more sophisticated approach, you could:
    // 1. Inject the Redux store and dispatch logout action
    // 2. Use an event emitter to notify components
    // 3. Use a navigation service to redirect to login
    // For now, we rely on the app's authentication checking
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      // First try to get from local storage
      const storedUser = await AsyncStorage.getItem(USER_KEY);
      if (storedUser) {
        return JSON.parse(storedUser) as User;
      }

      // If not in storage, fetch from backend
      const response: ApiResponse<User> = await ApiService.getInstance().get('/auth/profile/');
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
      const response: ApiResponse<User> = await ApiService.getInstance().patch('/auth/profile/update/', profileData);
      
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
      ApiService.getInstance().removeAuthToken(),
      AsyncStorage.removeItem(SESSION_KEY),
      AsyncStorage.removeItem(USER_KEY),
      AsyncStorage.removeItem(ORG_KEY),
    ]);
  }

  async refreshUserData(): Promise<User | null> {
    try {
      const response: ApiResponse<User> = await ApiService.getInstance().get('/auth/profile/');
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