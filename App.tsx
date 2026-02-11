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
import DatabaseService from './src/services/DatabaseService';
import AuthService from './src/services/AuthService';
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

  const initializeApp = async () => {
    try {
      console.log('🚀 Initializing app...');

      // Set web page title
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.title = 'HK Management Systems';
      }

      // Initialize services (database initializes automatically)
      const db = DatabaseService.getInstance();
      const authService = AuthService.getInstance();
      
      // Insert test data if needed (for testing)
      try {
        await db.insertTestData();
        console.log('📊 Test data inserted');
      } catch (error) {
        // Test data might already exist, which is fine
        console.log('📊 Test data already exists or failed to insert:', error);
      }
      
      // Check authentication
      const authResult = await authService.restoreSession();
      console.log('👤 Session restored:', authResult?.success);
      
      if (authResult?.success && authResult.user && authResult.organization && authResult.licenses) {
        // Populate Redux store with restored session data
        dispatch(loginSuccess({
          user: authResult.user,
          organization: authResult.organization,
          licenses: authResult.licenses,
          userModuleAccess: authResult.userModuleAccess || [],
        }));
        console.log('📦 Redux store populated with', authResult.licenses.length, 'licenses');
        setIsLicenseValid(true);
        setAppState('authenticated');
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
    if (authResult?.success && authResult.user && authResult.organization && authResult.licenses) {
      // Populate Redux store with login data
      dispatch(loginSuccess({
        user: authResult.user,
        organization: authResult.organization,
        licenses: authResult.licenses,
        userModuleAccess: authResult.userModuleAccess || [],
      }));
      console.log('📦 Redux store populated after login with', authResult.licenses.length, 'licenses');
      setIsLicenseValid(true);
      setAppState('authenticated');
    } else {
      // Fallback - just assume license is valid if auth was successful
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
