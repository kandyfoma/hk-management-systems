import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider as ReduxProvider, useDispatch } from 'react-redux';

import { store } from './src/store/store';
import { loginSuccess } from './src/store/slices/authSlice';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { AppNavigator } from './src/navigation/AppNavigator';
import ApiAuthService from './src/services/ApiAuthService';
import { theme, colors } from './src/theme/theme';
import { GlobalUIProvider } from './src/components/GlobalUI';

type AppState = 'loading' | 'authenticated' | 'unauthenticated';

// Inner app component — inside ReduxProvider so it can dispatch
function AppContent() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [isLicenseValid, setIsLicenseValid] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    initializeApp();
  }, []);

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

      // Check backend connection
      const isConnected = await ApiAuthService.getInstance().checkBackendConnection();
      if (!isConnected) {
        console.log('⚠️ Backend not reachable, using offline mode');
        setAppState('unauthenticated');
        return;
      }

      console.log('🌐 Backend connected');
      
      // Check authentication with backend
      const isAuthenticated = await ApiAuthService.getInstance().isAuthenticated();
      console.log('👤 Authentication check:', isAuthenticated);
      
      if (isAuthenticated) {
        const user = await ApiAuthService.getInstance().getCurrentUser();
        const organization = await ApiAuthService.getInstance().getCurrentOrganization();
        
        if (user && organization) {
          // Load organization licenses and user module access
          console.log('📄 Loading organization licenses...');
          const licenses = await ApiAuthService.getInstance().getOrganizationLicenses();
          const userModuleAccess = await ApiAuthService.getInstance().getUserModuleAccess();
          
          console.log('📋 Loaded licenses:', licenses);
          console.log('🔐 Loaded module access:', userModuleAccess);
          
          // Populate Redux store with complete user data
          dispatch(loginSuccess({
            user,
            organization,
            licenses,
            userModuleAccess,
          }));
          console.log('📦 Redux store populated with complete user data');
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
      
      console.log('📋 Loaded licenses after login:', licenses);
      console.log('🔐 Loaded module access after login:', userModuleAccess);
      
      // Populate Redux store with complete login data
      dispatch(loginSuccess({
        user: authResult.user,
        organization: authResult.organization,
        licenses,
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
