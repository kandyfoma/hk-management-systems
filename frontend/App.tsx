import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider as ReduxProvider, useDispatch, useSelector } from 'react-redux';

import { store, RootState } from './src/store/store';
import { loginSuccess } from './src/store/slices/authSlice';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { AppNavigator } from './src/navigation/AppNavigator';
import ApiAuthService from './src/services/ApiAuthService';
import HybridDataService from './src/services/HybridDataService';
import SyncService from './src/services/SyncService';
import { theme, colors } from './src/theme/theme';
import { GlobalUIProvider, useToast } from './src/components/GlobalUI';

type AppState = 'loading' | 'authenticated' | 'unauthenticated';

interface DeviceActivationInfo {
  licenseKey: string;
  activatedAt: string;
  expiresAt: string;
  organizationId: string;
}

const DEVICE_ACTIVATION_KEY = 'device_activation_info';

async function getActivatedLicenseKey(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(DEVICE_ACTIVATION_KEY);
    if (!raw) return null;
    const info = JSON.parse(raw) as DeviceActivationInfo;
    return info?.licenseKey || null;
  } catch {
    return null;
  }
}

function scopeLicensesToOrganization(
  licenses: any[],
  organization: any,
  preferredLicenseKey?: string | null,
): any[] {
  const currentLicenseKey = preferredLicenseKey || organization?.license_key || organization?.licenseKey;
  if (!currentLicenseKey) return licenses;

  const scoped = licenses.filter(
    (license) => (license?.licenseKey || license?.license_key) === currentLicenseKey
  );
  return scoped.length > 0 ? scoped : licenses;
}

function SyncReconnectNotifier({ enabled }: { enabled: boolean }) {
  const toast = useToast();
  const previousOnlineRef = useRef<boolean | null>(null);
  const reconnectSyncActiveRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      previousOnlineRef.current = null;
      reconnectSyncActiveRef.current = false;
      return;
    }

    const sync = SyncService.getInstance();
    const tick = () => {
      const status = sync.getSyncStatus();
      const wasOnline = previousOnlineRef.current;
      const cameBackOnline = wasOnline === false && status.isOnline;

      if (cameBackOnline) {
        if (status.pendingItems > 0) {
          toast.info('Connexion rétablie — synchronisation en cours');
          reconnectSyncActiveRef.current = true;
        } else {
          toast.success('Connexion rétablie');
        }
      }

      if (
        reconnectSyncActiveRef.current
        && status.pendingItems === 0
        && !status.syncInProgress
      ) {
        toast.success('Synchronisation terminée');
        reconnectSyncActiveRef.current = false;
      }

      previousOnlineRef.current = status.isOnline;
    };

    tick();
    const timer = setInterval(tick, 1500);
    return () => clearInterval(timer);
  }, [enabled, toast]);

  return null;
}

// Inner app component — inside ReduxProvider so it can dispatch
function AppContent() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [isLicenseValid, setIsLicenseValid] = useState(false);
  const dispatch = useDispatch();
  
  // Subscribe to Redux auth state to handle logout
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const user = useSelector((state: RootState) => state.auth.user);
  const organization = useSelector((state: RootState) => state.auth.organization);
  
  // Handle logout detection
  useEffect(() => {
    if (!isAuthenticated && appState === 'authenticated') {
      console.log('🔐 Logout detected, redirecting to login');
      setAppState('unauthenticated');
      setIsLicenseValid(false);
    }
  }, [isAuthenticated, appState]);

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    if (appState !== 'authenticated' || !isLicenseValid) return;

    // Ensure sync engine is started app-wide (not only on POS screen)
    HybridDataService.getInstance();
    SyncService.getInstance().forceSync().catch((error) => {
      console.log('Initial background sync deferred:', error);
    });
  }, [appState, isLicenseValid]);

  useEffect(() => {
    // Set document title for web with multiple fallbacks
    if (Platform.OS === 'web') {
      const setDocumentTitle = () => {
        if (typeof document !== 'undefined') {
          const title = 'HK Management Systems - Système Hospitalier';
          
          // Method 1: Direct assignment
          document.title = title;
          
          // Method 2: Create/update title element
          let titleElement = document.querySelector('title');
          if (!titleElement) {
            titleElement = document.createElement('title');
            document.head.appendChild(titleElement);
          }
          titleElement.textContent = title;
          
          // Method 3: Set og:title meta tag
          let ogTitle = document.querySelector('meta[property="og:title"]');
          if (!ogTitle) {
            ogTitle = document.createElement('meta');
            ogTitle.setAttribute('property', 'og:title');
            document.head.appendChild(ogTitle);
          }
          ogTitle.setAttribute('content', title);
          
          // Update description meta
          let descriptionMeta = document.querySelector('meta[name="description"]');
          if (!descriptionMeta) {
            descriptionMeta = document.createElement('meta');
            descriptionMeta.setAttribute('name', 'description');
            document.head.appendChild(descriptionMeta);
          }
          descriptionMeta.setAttribute('content', 'Système de gestion hospitalière et pharmaceutique pour la RD Congo');
          
          // Debug log
          console.log('Document title set to:', document.title);
        }
      };
      
      // Set immediately
      setDocumentTitle();
      
      // Also set after a short delay to ensure it sticks
      setTimeout(setDocumentTitle, 100);
      setTimeout(setDocumentTitle, 1000);
    }
  }, []);

  const initializeApp = async () => {
    try {
      console.log('🚀 Initializing app...');

      // Set web page title
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.title = 'HK Management Systems';
      }

      // First, check for existing session data locally
      const existingSession = await ApiAuthService.getInstance().getCurrentUser();
      if (existingSession) {
        console.log('📱 Found existing session, attempting to restore...');
        
        // Try to load complete session data
        const user = await ApiAuthService.getInstance().getCurrentUser();
        const organization = await ApiAuthService.getInstance().getCurrentOrganization();
        
        if (user && organization) {
          console.log('✅ Restoring user session for:', user.first_name);
          
          // Load organization licenses and user module access
          console.log('📄 Loading organization licenses...');
          try {
            const [licenses, userModuleAccess] = await Promise.all([
              ApiAuthService.getInstance().getOrganizationLicenses(),
              ApiAuthService.getInstance().getUserModuleAccess()
            ]);

            const activatedLicenseKey = await getActivatedLicenseKey();
            const scopedLicenses = scopeLicensesToOrganization(licenses, organization, activatedLicenseKey);
            
            console.log('📋 Loaded licenses:', licenses);
            console.log('🔐 Loaded module access:', userModuleAccess);
            
            // Populate Redux store with complete user data
            dispatch(loginSuccess({
              user,
              organization,
              licenses: scopedLicenses,
              userModuleAccess,
            }));
            console.log('📦 Redux store populated with restored session data');
            setIsLicenseValid(true);
            setAppState('authenticated');
            return; // Exit early on successful session restore
          } catch (licenseError) {
            console.log('⚠️ Could not load licenses/module access, but user session is valid');
            // Still proceed with authentication even if license loading fails
            dispatch(loginSuccess({
              user,
              organization,
              licenses: [],
              userModuleAccess: [],
            }));
            setIsLicenseValid(true);
            setAppState('authenticated');
            return;
          }
        }
      }

      // If no existing session or session restore failed, check backend connection
      console.log('🔍 No existing session found, checking backend connection...');
      const isConnected = await ApiAuthService.getInstance().checkBackendConnection();
      if (!isConnected) {
        console.log('⚠️ Backend not reachable, using offline mode');
        setAppState('unauthenticated');
        return;
      }

      console.log('🌐 Backend connected');
      
      // Check authentication with backend (this now does background verification)
      const isAuthenticated = await ApiAuthService.getInstance().isAuthenticated();
      console.log('👤 Authentication check:', isAuthenticated);
      
      if (isAuthenticated) {
        // This should only happen if session was restored above, but keeping for safety
        const user = await ApiAuthService.getInstance().getCurrentUser();
        const organization = await ApiAuthService.getInstance().getCurrentOrganization();
        
        if (user && organization) {
          console.log('🔄 Loading fresh user data from backend...');
          const licenses = await ApiAuthService.getInstance().getOrganizationLicenses();
          const userModuleAccess = await ApiAuthService.getInstance().getUserModuleAccess();
          const activatedLicenseKey = await getActivatedLicenseKey();
          const scopedLicenses = scopeLicensesToOrganization(licenses, organization, activatedLicenseKey);
          
          dispatch(loginSuccess({
            user,
            organization,
            licenses: scopedLicenses,
            userModuleAccess,
          }));
          setIsLicenseValid(true);
          setAppState('authenticated');
        } else {
          // Clear invalid session
          await ApiAuthService.getInstance().logout();
          setAppState('unauthenticated');
        }
      } else {
        setAppState('unauthenticated');
      }
    } catch (error) {
      console.error('💥 Failed to initialize app:', error);
      // Don't immediately logout on initialization errors
      // Check if we have any session data and keep user logged in locally
      const user = await ApiAuthService.getInstance().getCurrentUser();
      if (user) {
        console.log('⚠️ Initialization error but user session exists, keeping logged in');
        const organization = await ApiAuthService.getInstance().getCurrentOrganization();
        if (organization) {
          dispatch(loginSuccess({
            user,
            organization,
            licenses: [],
            userModuleAccess: [],
          }));
          setIsLicenseValid(true);
          setAppState('authenticated');
          return;
        }
      }
      setAppState('unauthenticated');
    }
  };

  const handleAuthSuccess = async (authResult?: any) => {
    console.log('✅ Auth success triggered', authResult);
    if (authResult?.success && authResult.user) {
      // Load organization licenses and user module access after successful login
      console.log('📄 Loading organization licenses after login...');
      const licenses = await ApiAuthService.getInstance().getOrganizationLicenses();
      const userModuleAccess = await ApiAuthService.getInstance().getUserModuleAccess();
      const activatedLicenseKey = authResult?.activatedLicenseKey || await getActivatedLicenseKey();
      const scopedLicenses = scopeLicensesToOrganization(licenses, authResult.organization, activatedLicenseKey);
      
      console.log('📋 Loaded licenses after login:', licenses);
      console.log('🔐 Loaded module access after login:', userModuleAccess);
      
      // Populate Redux store with complete login data
      dispatch(loginSuccess({
        user: authResult.user,
        organization: authResult.organization,
        licenses: scopedLicenses,
        userModuleAccess,
      }));
      console.log('📦 Redux store populated after login');
      setIsLicenseValid(true);
      setAppState('authenticated');
    } else {
      // Fallback - just assume auth was successful
      setIsLicenseValid(true);
      setAppState('authenticated');
    }
  };

  if (appState === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>HK Management Systems</Text>
        <Text style={styles.loadingSubtext}>Initialisation du système...</Text>
      </View>
    );
  }

  console.log('📱 Render decision - authenticated:', appState === 'authenticated', 'license valid:', isLicenseValid);

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <GlobalUIProvider>
          <SyncReconnectNotifier enabled={appState === 'authenticated' && isLicenseValid} />
          {appState === 'authenticated' && isLicenseValid ? (
            <AppNavigator />
          ) : (
            <AuthNavigator onAuthSuccess={handleAuthSuccess} />
          )}
        </GlobalUIProvider>
        <StatusBar style="auto" />
      </NavigationContainer>
    </PaperProvider>
  );
}

// Root component — provides Redux store
export default function App() {
  return (
    <ReduxProvider store={store}>
      <AppContent />
    </ReduxProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
  },
});
