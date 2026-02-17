import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SettingsState {
  language: 'fr' | 'en' | 'ln' | 'kg'; // French, English, Lingala, Kikongo
  currency: 'CDF' | 'USD';
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    enabled: boolean;
    sound: boolean;
    vibration: boolean;
  };
  sync: {
    autoSync: boolean;
    syncInterval: number; // in minutes
    lastSyncTime?: string;
  };
  backup: {
    autoBackup: boolean;
    backupFrequency: 'daily' | 'weekly' | 'monthly';
    lastBackupTime?: string;
  };
  security: {
    biometricAuth: boolean;
    sessionTimeout: number; // in minutes
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
    };
  };
  display: {
    fontSize: 'small' | 'medium' | 'large';
    highContrast: boolean;
    largeButtons: boolean;
  };
  system: {
    organizationName: string;
    hospitalAddress: string;
    contactPhone: string;
    contactEmail: string;
    licenseInfo?: {
      type: string;
      expiryDate?: string;
    };
  };
}

const initialState: SettingsState = {
  language: 'fr', // Default to French for Congo
  currency: 'CDF', // Congolese Franc
  theme: 'light',
  notifications: {
    enabled: true,
    sound: true,
    vibration: true,
  },
  sync: {
    autoSync: true,
    syncInterval: 30, // 30 minutes
  },
  backup: {
    autoBackup: true,
    backupFrequency: 'daily',
  },
  security: {
    biometricAuth: false,
    sessionTimeout: 480, // 8 hours
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
    },
  },
  display: {
    fontSize: 'medium',
    highContrast: false,
    largeButtons: false,
  },
  system: {
    organizationName: 'Healthcare System',
    hospitalAddress: '',
    contactPhone: '',
    contactEmail: '',
  },
};

export const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateLanguage: (state, action: PayloadAction<SettingsState['language']>) => {
      state.language = action.payload;
    },
    updateCurrency: (state, action: PayloadAction<SettingsState['currency']>) => {
      state.currency = action.payload;
    },
    updateTheme: (state, action: PayloadAction<SettingsState['theme']>) => {
      state.theme = action.payload;
    },
    updateNotifications: (state, action: PayloadAction<Partial<SettingsState['notifications']>>) => {
      state.notifications = { ...state.notifications, ...action.payload };
    },
    updateSync: (state, action: PayloadAction<Partial<SettingsState['sync']>>) => {
      state.sync = { ...state.sync, ...action.payload };
    },
    updateBackup: (state, action: PayloadAction<Partial<SettingsState['backup']>>) => {
      state.backup = { ...state.backup, ...action.payload };
    },
    updateSecurity: (state, action: PayloadAction<Partial<SettingsState['security']>>) => {
      state.security = { ...state.security, ...action.payload };
    },
    updatePasswordPolicy: (state, action: PayloadAction<Partial<SettingsState['security']['passwordPolicy']>>) => {
      state.security.passwordPolicy = { ...state.security.passwordPolicy, ...action.payload };
    },
    updateDisplay: (state, action: PayloadAction<Partial<SettingsState['display']>>) => {
      state.display = { ...state.display, ...action.payload };
    },
    updateSystem: (state, action: PayloadAction<Partial<SettingsState['system']>>) => {
      state.system = { ...state.system, ...action.payload };
    },
    updateLicenseInfo: (state, action: PayloadAction<SettingsState['system']['licenseInfo']>) => {
      state.system.licenseInfo = action.payload;
    },
    setLastSyncTime: (state, action: PayloadAction<string>) => {
      state.sync.lastSyncTime = action.payload;
    },
    setLastBackupTime: (state, action: PayloadAction<string>) => {
      state.backup.lastBackupTime = action.payload;
    },
    resetSettings: (state) => {
      // Reset all settings to default except system info
      const systemInfo = state.system;
      Object.assign(state, {
        ...initialState,
        system: systemInfo,
      });
    },
  },
});

export const {
  updateLanguage,
  updateCurrency,
  updateTheme,
  updateNotifications,
  updateSync,
  updateBackup,
  updateSecurity,
  updatePasswordPolicy,
  updateDisplay,
  updateSystem,
  updateLicenseInfo,
  setLastSyncTime,
  setLastBackupTime,
  resetSettings,
} = settingsSlice.actions;