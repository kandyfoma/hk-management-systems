import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../../models/User';
import { License, UserModuleAccess, ModuleType, LicenseUtils } from '../../models/License';
import { Organization } from '../../models/Organization';

// Helper function to check if license is expired
const isLicenseExpired = (license: License): boolean => {
  return LicenseUtils.isExpired(license);
};

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  organization: Organization | null;
  licenses: License[];
  userModuleAccess: UserModuleAccess[];
  activeModules: ModuleType[];
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  organization: null,
  licenses: [],
  userModuleAccess: [],
  activeModules: [],
  isLoading: false,
  error: null,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<{ 
      user: User; 
      organization: Organization;
      licenses: License[];
      userModuleAccess: UserModuleAccess[];
    }>) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.organization = action.payload.organization;
      state.licenses = action.payload.licenses;
      state.userModuleAccess = action.payload.userModuleAccess;
      state.activeModules = action.payload.licenses
        .filter(license => license.isActive && !isLicenseExpired(license))
        .map(license => license.moduleType);
      state.isLoading = false;
      state.error = null;
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.isAuthenticated = false;
      state.user = null;
      state.organization = null;
      state.licenses = [];
      state.userModuleAccess = [];
      state.activeModules = [];
      state.isLoading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.organization = null;
      state.licenses = [];
      state.userModuleAccess = [];
      state.activeModules = [];
      state.isLoading = false;
      state.error = null;
    },
    updateLicenses: (state, action: PayloadAction<License[]>) => {
      state.licenses = action.payload;
      state.activeModules = action.payload
        .filter(license => license.isActive && !isLicenseExpired(license))
        .map(license => license.moduleType);
    },
    updateUserModuleAccess: (state, action: PayloadAction<UserModuleAccess[]>) => {
      state.userModuleAccess = action.payload;
    },
    updateOrganization: (state, action: PayloadAction<Organization>) => {
      state.organization = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  updateLicenses,
  updateUserModuleAccess,
  updateOrganization,
  clearError,
  updateUser,
} = authSlice.actions;

// Selectors
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectOrganization = (state: { auth: AuthState }) => state.auth.organization;
export const selectLicenses = (state: { auth: AuthState }) => state.auth.licenses;
export const selectActiveModules = (state: { auth: AuthState }) => state.auth.activeModules;
export const selectUserModuleAccess = (state: { auth: AuthState }) => state.auth.userModuleAccess;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;

// Complex selectors
export const selectHasModuleAccess = (module: ModuleType) => (state: { auth: AuthState }) => {
  return state.auth.activeModules.includes(module);
};

export const selectModuleFeatures = (module: ModuleType) => (state: { auth: AuthState }) => {
  const license = state.auth.licenses.find(l => l.moduleType === module && l.isActive);
  return license?.features || [];
};

export const selectHasFeature = (feature: string) => (state: { auth: AuthState }) => {
  return state.auth.licenses.some(license => 
    license.isActive && 
    !isLicenseExpired(license) && 
    license.features.includes(feature)
  );
};