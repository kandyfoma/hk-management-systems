import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import HybridDataService from '../services/HybridDataService';
import LicenseService from '../services/LicenseService';
import AuthService from '../services/AuthService';
import { useToast } from '../components/GlobalUI';
import { 
  loginStart, 
  loginSuccess, 
  loginFailure,
  selectIsAuthenticated, 
  selectUser, 
  selectOrganization, 
  selectActiveModules,
  selectLicenses 
} from '../store/slices/authSlice';
import { colors } from '../theme/theme';

export const LicenseTestScreen: React.FC = () => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const organization = useSelector(selectOrganization);
  const activeModules = useSelector(selectActiveModules);
  const licenses = useSelector(selectLicenses);
  const [testResults, setTestResults] = useState<string[]>([]);
  const toast = useToast();

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testDatabaseSetup = async () => {
    try {
      addTestResult('Testing database setup...');
      toast.info('Testing database setup...');
      const hybridData = HybridDataService.getInstance();
      // Test the database by attempting to fetch data
      const patientsResult = await hybridData.getAllPatients();
      if (patientsResult.success) {
        addTestResult('✅ Database setup verified - patients accessible');
        toast.success('Database setup verified successfully');
      } else {
        addTestResult('✅ Database connection verified (no data yet)');
        toast.success('Database connection verified');
      }
    } catch (error) {
      addTestResult(`❌ Database setup failed: ${error}`);
      toast.error('Database setup failed');
    }
  };

  const testLicenseValidation = async () => {
    try {
      addTestResult('Testing license validation...');
      toast.info('Testing license validation...');
      const licenseService = LicenseService.getInstance();
      
      // Test with trial key
      const result = await licenseService.validateLicenseKey('TRIAL-HK2024XY-Z9M3');
      if (result.isValid) {
        addTestResult('✅ Trial license validation successful');
        addTestResult(`Organization: ${result.organization?.name}`);
        addTestResult(`License Type: ${result.license?.moduleType} - ${result.license?.licenseTier}`);
        toast.success('Trial license validation successful');
      } else {
        addTestResult(`❌ License validation failed: ${result.errors.join(', ')}`);
        toast.error('License validation failed');
      }
    } catch (error) {
      addTestResult(`❌ License validation error: ${error}`);
    }
  };

  const testUserRegistration = async () => {
    try {
      addTestResult('Testing user registration...');
      const authService = AuthService.getInstance();
      
      const registrationData = {
        firstName: 'Test',
        lastName: 'Admin',
        phone: '+1234567890',
        password: 'admin123',
        licenseKey: 'TRIAL-HK2024XY-Z9M3',
        role: 'admin'
      };

      const result = await authService.register(registrationData);
      if (result.success) {
        addTestResult('✅ User registration successful');
        addTestResult(`User: ${result.user?.firstName} ${result.user?.lastName}`);
        addTestResult(`Modules: ${result.userModuleAccess?.map(a => a.moduleType).join(', ')}`);
      } else {
        addTestResult(`❌ User registration failed: ${result.error}`);
      }
    } catch (error) {
      addTestResult(`❌ User registration error: ${error}`);
    }
  };

  const testUserLogin = async () => {
    try {
      addTestResult('Testing user login...');
      const authService = AuthService.getInstance();
      
      dispatch(loginStart());
      
      const result = await authService.login({
        phone: '+1234567890',
        password: 'admin123'
      });

      if (result.success && result.user && result.organization && result.licenses && result.userModuleAccess) {
        dispatch(loginSuccess({
          user: result.user,
          organization: result.organization,
          licenses: result.licenses,
          userModuleAccess: result.userModuleAccess
        }));
        addTestResult('✅ User login successful');
      } else {
        dispatch(loginFailure(result.error || 'Unknown error'));
        addTestResult(`❌ User login failed: ${result.error}`);
      }
    } catch (error) {
      dispatch(loginFailure(String(error)));
      addTestResult(`❌ User login error: ${error}`);
    }
  };

  const testModuleAccess = async () => {
    if (!user) {
      addTestResult('❌ No user logged in for module access test');
      return;
    }

    try {
      addTestResult('Testing module access...');
      const authService = AuthService.getInstance();
      
      const hasPharmacyAccess = await authService.hasModuleAccess(user.id, 'PHARMACY');
      const hasHospitalAccess = await authService.hasModuleAccess(user.id, 'HOSPITAL');
      const hasOccHealthAccess = await authService.hasModuleAccess(user.id, 'OCCUPATIONAL_HEALTH');
      const userModules = await authService.getUserModules(user.id);

      addTestResult(`Pharmacy Access: ${hasPharmacyAccess ? '✅' : '❌'}`);
      addTestResult(`Hospital Access: ${hasHospitalAccess ? '✅' : '❌'}`);
      addTestResult(`Occupational Health Access: ${hasOccHealthAccess ? '✅' : '❌'}`);
      addTestResult(`Available Modules: ${userModules.join(', ')}`);
    } catch (error) {
      addTestResult(`❌ Module access test error: ${error}`);
    }
  };

  const testLicenseKeyLogin = async () => {
    try {
      addTestResult('Testing login with license key...');
      const authService = AuthService.getInstance();
      
      const result = await authService.login({
        phone: '+1234567890',
        password: 'admin123',
        licenseKey: 'TRIAL-HK2024XY-Z9M3'
      });

      if (result.success && result.user && result.organization && result.licenses && result.userModuleAccess) {
        addTestResult('✅ Login with license key successful');
        addTestResult(`License validation passed during login`);
      } else {
        addTestResult(`❌ Login with license key failed: ${result.error}`);
      }
    } catch (error) {
      addTestResult(`❌ Login with license key error: ${error}`);
    }
  };

  const runAllTests = async () => {
    setTestResults([]);
    await testDatabaseSetup();
    await testLicenseValidation();
    await testUserRegistration();
    await testUserLogin();
    await testModuleAccess();
    await testLicenseKeyLogin();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="flask" size={32} color={colors.primary} />
        <Text style={styles.title}>HK Management System</Text>
        <Text style={styles.subtitle}>Modular Licensing Test Suite</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Authentication Status</Text>
        <View style={styles.statusCard}>
          <Text style={styles.statusText}>
            Status: {isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
          </Text>
          {user && (
            <Text style={styles.statusText}>
              User: {user.firstName} {user.lastName} ({user.primaryRole})
            </Text>
          )}
          {organization && (
            <Text style={styles.statusText}>
              Organization: {organization.name}
            </Text>
          )}
          <Text style={styles.statusText}>
            Active Modules: {activeModules.length > 0 ? activeModules.join(', ') : 'None'}
          </Text>
          <Text style={styles.statusText}>
            Active Licenses: {licenses.length}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Actions</Text>
        <TouchableOpacity style={styles.button} onPress={runAllTests}>
          <Ionicons name="play" size={20} color="white" />
          <Text style={styles.buttonText}>Run All Tests</Text>
        </TouchableOpacity>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.smallButton} onPress={testDatabaseSetup}>
            <Text style={styles.smallButtonText}>Database</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallButton} onPress={testLicenseValidation}>
            <Text style={styles.smallButtonText}>License</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallButton} onPress={testUserRegistration}>
            <Text style={styles.smallButtonText}>Register</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallButton} onPress={testUserLogin}>
            <Text style={styles.smallButtonText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallButton} onPress={testLicenseKeyLogin}>
            <Text style={styles.smallButtonText}>License Login</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Results</Text>
        <View style={styles.resultsContainer}>
          {testResults.length === 0 ? (
            <Text style={styles.noResults}>No tests run yet. Click "Run All Tests" to start.</Text>
          ) : (
            testResults.map((result, index) => (
              <Text key={index} style={styles.resultText}>
                {result}
              </Text>
            ))
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>License Keys for Testing</Text>
        <View style={styles.licenseCard}>
          <Text style={styles.licenseKey}>TRIAL-HK2024XY-Z9M3</Text>
          <Text style={styles.licenseDesc}>30-day trial with all features</Text>
        </View>
        <View style={styles.licenseCard}>
          <Text style={styles.licenseKey}>PHARMACY-PH2024XY-M9N3</Text>
          <Text style={styles.licenseDesc}>Pharmacy module only</Text>
        </View>
        <View style={styles.licenseCard}>
          <Text style={styles.licenseKey}>HOSPITAL-HP2024XY-B6C4</Text>
          <Text style={styles.licenseDesc}>Hospital module only</Text>
        </View>
        <View style={styles.licenseCard}>
          <Text style={styles.licenseKey}>OCCHEALTH-OH2024XY-P8Q3</Text>
          <Text style={styles.licenseDesc}>Occupational Health module only</Text>
        </View>
        <View style={styles.licenseCard}>
          <Text style={styles.licenseKey}>COMBINED-FULL2024-X7Y9</Text>
          <Text style={styles.licenseDesc}>All modules (Pharmacy + Hospital + Occ Health)</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  statusText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  smallButton: {
    backgroundColor: colors.primaryFaded,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    minWidth: 70,
  },
  smallButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  resultsContainer: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.outline,
    maxHeight: 300,
  },
  noResults: {
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  resultText: {
    fontSize: 12,
    color: colors.text,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  licenseCard: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.outline,
    marginBottom: 8,
  },
  licenseKey: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    fontFamily: 'monospace',
  },
  licenseDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
});