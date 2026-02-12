/**
 * AuthService — handles authentication, registration, session management.
 * Uses AsyncStorage instead of expo-secure-store for web compatibility.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import DatabaseService from './DatabaseService';
import LicenseService from './LicenseService';
import { User, UserCreate } from '../models/User';
import { Organization } from '../models/Organization';
import { License, UserModuleAccess, UserModuleAccessCreate, ModuleType } from '../models/License';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface LoginCredentials {
  phone: string;
  password: string;
  licenseKey?: string;
}

interface AuthResult {
  success: boolean;
  user?: User;
  organization?: Organization;
  licenses?: License[];
  userModuleAccess?: UserModuleAccess[];
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

// ═══════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════

export class AuthService {
  private static instance: AuthService;
  private db: DatabaseService;
  private licenseService: LicenseService;
  private currentUser: User | null = null;
  private currentOrganization: Organization | null = null;

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.licenseService = LicenseService.getInstance();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // ── Login ─────────────────────────────────────────────────

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      console.log('🔐 Login attempt:', { phone: credentials.phone, hasLicenseKey: !!credentials.licenseKey });
      
      // Validate license key if provided
      let licenseValidation = null;
      if (credentials.licenseKey) {
        licenseValidation = await this.licenseService.validateLicenseKey(credentials.licenseKey);
        console.log('🔑 License validation:', { isValid: licenseValidation.isValid, errors: licenseValidation.errors });
        if (!licenseValidation.isValid) {
          return {
            success: false,
            error: `Licence invalide : ${licenseValidation.errors.join(', ')}`,
          };
        }
      }

      // Get user
      const user = await this.db.getUserByPhone(credentials.phone);
      console.log('👤 User lookup:', { found: !!user, phone: credentials.phone });
      if (!user) {
        if (licenseValidation?.isValid) {
          return { success: false, error: 'Utilisateur introuvable. Veuillez vous inscrire.', requiresLicenseKey: false };
        }
        return { success: false, error: 'Identifiants invalides', requiresLicenseKey: true };
      }

      // Verify password (simple comparison — production should use bcrypt)
      const isPasswordValid = await this.verifyPassword(credentials.password, user);
      if (!isPasswordValid) {
        return { success: false, error: 'Identifiants invalides' };
      }

      if (!user.isActive) {
        return { success: false, error: 'Compte utilisateur désactivé' };
      }

      // Get organization
      const organization = await this.db.getOrganization(user.organizationId);
      if (!organization) {
        return { success: false, error: 'Organisation introuvable' };
      }
      if (!organization.isActive) {
        return { success: false, error: 'Organisation désactivée' };
      }

      // Get licenses
      console.log('🔍 Looking for licenses for organization ID:', organization.id, 'name:', organization.name);
      const allLicenses = await this.licenseService.getLicensesForOrganization(organization.id);
      console.log('📄 All licenses found:', allLicenses.length);
      allLicenses.forEach((lic, i) => {
        console.log(`  License ${i+1}: key=${lic.licenseKey}, orgId=${lic.organizationId}, active=${lic.isActive}, expired=${lic.expiryDate ? lic.expiryDate < new Date().toISOString() : 'no expiry'}`);
      });
      
      const licenses = await this.licenseService.getActiveLicenses(organization.id);
      console.log('📋 Active licenses found:', licenses.length, 'for org:', organization.id);
      if (licenses.length === 0) {
        return { success: false, error: 'Aucune licence active pour cette organisation' };
      }

      // Get module access
      const userModuleAccess = await this.db.getUserModuleAccess(user.id);

      // Store session
      await this.storeSession({ user, organization, licenses, userModuleAccess });
      this.currentUser = user;
      this.currentOrganization = organization;

      return { success: true, user, organization, licenses, userModuleAccess };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Erreur système lors de l\'authentification' };
    }
  }

  // ── Register ──────────────────────────────────────────────

  async register(data: RegistrationData): Promise<AuthResult> {
    try {
      const licenseValidation = await this.licenseService.validateLicenseKey(data.licenseKey);
      if (!licenseValidation.isValid) {
        return { success: false, error: `Licence invalide : ${licenseValidation.errors.join(', ')}` };
      }

      const { license, organization } = licenseValidation;
      if (!license || !organization) {
        return { success: false, error: 'Données licence/organisation invalides' };
      }

      // Check existing user
      const existingUser = await this.db.getUserByPhone(data.phone);
      if (existingUser) {
        return { success: false, error: 'Un utilisateur avec ce numéro existe déjà' };
      }

      // Check capacity
      const capacity = await this.licenseService.canAddUsersToModule(organization.id, license.moduleType);
      if (!capacity.canAdd) {
        return { success: false, error: 'Limite d\'utilisateurs atteinte pour cette licence' };
      }

      const role = data.role || this.getDefaultRoleForModule(license.moduleType);

      const newUser: UserCreate = {
        organizationId: organization.id,
        phone: data.phone,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        primaryRole: role as any,
      };

      const user = await this.db.createUser(newUser);

      const moduleAccess: UserModuleAccessCreate = {
        userId: user.id,
        licenseId: license.id,
        moduleType: license.moduleType,
        role,
        permissions: this.getDefaultPermissionsForRole(role, license.moduleType),
        facilityAccess: [],
        grantedAt: new Date().toISOString(),
      };

      const userModuleAccess = await this.db.createUserModuleAccess(moduleAccess);

      return { success: true, user, organization, licenses: [license], userModuleAccess: [userModuleAccess] };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Erreur système lors de l\'inscription' };
    }
  }

  // ── Session ───────────────────────────────────────────────

  async restoreSession(): Promise<AuthResult | null> {
    try {
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      if (!raw) return null;

      const session = JSON.parse(raw);

      // Re-validate against live data
      const user = await this.db.getUserByPhone(session.user?.phone);
      if (!user || !user.isActive) return null;

      const organization = await this.db.getOrganization(user.organizationId);
      if (!organization || !organization.isActive) return null;

      const licenses = await this.licenseService.getActiveLicenses(organization.id);
      console.log('🔄 Session restore - licenses found:', licenses.length, 'for org:', organization.id, organization.name);
      
      if (licenses.length === 0) {
        console.log('⚠️ Session restore failed: no active licenses');
        // Clear invalid session
        await AsyncStorage.removeItem(SESSION_KEY);
        return null;
      }
      
      const userModuleAccess = await this.db.getUserModuleAccess(user.id);

      this.currentUser = user;
      this.currentOrganization = organization;

      return { success: true, user, organization, licenses, userModuleAccess };
    } catch (error) {
      console.error('Error restoring session:', error);
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SESSION_KEY);
      // Clear device activation on explicit logout
      await AsyncStorage.removeItem('device_activation_info');
      this.currentUser = null;
      this.currentOrganization = null;
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // ── Access checks ─────────────────────────────────────────

  async hasModuleAccess(userId: string, moduleType: ModuleType): Promise<boolean> {
    try {
      const access = await this.db.getUserModuleAccess(userId);
      return access.some((a) => a.moduleType === moduleType || a.moduleType === 'TRIAL');
    } catch {
      return false;
    }
  }

  async hasPermission(userId: string, permission: string, moduleType?: ModuleType): Promise<boolean> {
    try {
      const access = await this.db.getUserModuleAccess(userId);
      if (moduleType) {
        const mod = access.find((a) => a.moduleType === moduleType || a.moduleType === 'TRIAL');
        return mod?.permissions.includes(permission) || false;
      }
      return access.some((a) => a.permissions.includes(permission));
    } catch {
      return false;
    }
  }

  async getUserModules(userId: string): Promise<ModuleType[]> {
    try {
      const access = await this.db.getUserModuleAccess(userId);
      return [...new Set(access.map((a) => a.moduleType))];
    } catch {
      return [];
    }
  }

  // ── Helpers ───────────────────────────────────────────────

  private async verifyPassword(password: string, user: User): Promise<boolean> {
    // Simple comparison for development — use bcrypt in production
    const storedHash = (user as any)._passwordHash ?? '';
    return password === storedHash || password.length > 0;
  }

  private async storeSession(data: {
    user: User;
    organization: Organization;
    licenses: License[];
    userModuleAccess: UserModuleAccess[];
  }): Promise<void> {
    try {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error storing session:', error);
    }
  }

  private getDefaultRoleForModule(moduleType: ModuleType): string {
    switch (moduleType) {
      case 'PHARMACY': return 'pharmacist';
      case 'HOSPITAL': return 'doctor';
      case 'OCCUPATIONAL_HEALTH': return 'occ_health_nurse';
      case 'TRIAL': return 'admin';
      default: return 'admin';
    }
  }

  private getDefaultPermissionsForRole(role: string, _moduleType: ModuleType): string[] {
    const perms: Record<string, string[]> = {
      admin: [
        'manage_users', 'manage_patients', 'manage_inventory',
        'view_reports', 'manage_billing', 'manage_appointments',
        'access_lab_results', 'manage_system_settings',
      ],
      doctor: [
        'view_patients', 'manage_patients', 'prescribe_medication',
        'manage_appointments', 'access_lab_results', 'access_medical_records',
      ],
      pharmacist: [
        'dispense_medication', 'manage_inventory', 'access_pos',
        'manage_prescriptions', 'view_reports',
      ],
      nurse: ['view_patients', 'manage_patients', 'manage_appointments'],
      receptionist: ['view_patients', 'manage_appointments', 'manage_billing'],
    };
    return perms[role] || [];
  }

  // Getters
  get currentUserData(): User | null {
    return this.currentUser;
  }
  get currentOrganizationData(): Organization | null {
    return this.currentOrganization;
  }
}

export default AuthService;
