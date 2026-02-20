import React, { useState, useRef, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  TouchableOpacity,
  Animated,
  KeyboardAvoidingView,
  SafeAreaView,
} from 'react-native';
import { Button, Text, TextInput, Surface, Snackbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiAuthService from '../services/ApiAuthService';
import SyncStatusIndicator from '../components/SyncStatusIndicator';
import LicenseService from '../services/LicenseService';
import { useToast } from '../components/GlobalUI';
import { colors, spacing, borderRadius, shadows } from '../theme/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const isDesktop = SCREEN_W >= 1024;
const isTablet = SCREEN_W >= 768;
const MAX_CARD_W = 680;

// Cross-platform alert
const DEVICE_ACTIVATION_KEY = 'device_activation_info';

interface DeviceActivationInfo {
  licenseKey: string;
  activatedAt: string;
  expiresAt: string;
  organizationId: string;
}

const showAlert = (title: string, message: string, onOk?: () => void) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    if (onOk) onOk();
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
  }
};

type AuthStackParamList = {
  Login: undefined;
  LicenseActivation: undefined;
};

const Stack = createStackNavigator<AuthStackParamList>();

interface AuthNavigatorProps {
  onAuthSuccess: () => void;
}

export function AuthNavigator({ onAuthSuccess }: AuthNavigatorProps) {
  return (
    <Stack.Navigator
      initialRouteName="LicenseActivation"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="LicenseActivation">
        {(props) => <LicenseActivationScreen {...props} onSuccess={onAuthSuccess} />}
      </Stack.Screen>
      <Stack.Screen name="Login">
        {(props) => <LoginScreen {...props} onSuccess={onAuthSuccess} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

// ═══════════════════════════════════════════════════════════════
// LICENSE ACTIVATION SCREEN
// ═══════════════════════════════════════════════════════════════

// Check if device is already activated
const checkDeviceActivation = async (): Promise<DeviceActivationInfo | null> => {
  try {
    const stored = await AsyncStorage.getItem(DEVICE_ACTIVATION_KEY);
    if (!stored) return null;
    
    const activationInfo: DeviceActivationInfo = JSON.parse(stored);
    
    // Check if activation has expired
    const now = new Date();
    const expiryDate = new Date(activationInfo.expiresAt);
    
    if (now >= expiryDate) {
      // Activation expired, remove it
      await AsyncStorage.removeItem(DEVICE_ACTIVATION_KEY);
      console.log('Device activation expired and removed');
      return null;
    }
    
    console.log('Device is already activated:', activationInfo);
    return activationInfo;
  } catch (error) {
    console.error('Error checking device activation:', error);
    return null;
  }
};

function LicenseActivationScreen({ navigation, onSuccess }: any) {
  const [licenseKey, setLicenseKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | ''>('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isCheckingActivation, setIsCheckingActivation] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const { success: showSuccessToast, error: showErrorToast, info: showInfoToast } = useToast();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
    
    // Check if device is already activated
    const checkActivation = async () => {
      const activationInfo = await checkDeviceActivation();
      if (activationInfo) {
        // Re-validate the stored license key against DB (in-memory DB resets on reload)
        try {
          const licenseService = LicenseService.getInstance();
          const result = await licenseService.validateLicenseKey(activationInfo.licenseKey);
          if (result.isValid) {
            console.log('✅ Device activation is still valid, navigating to login');
            showSuccessToast('Appareil déjà activé. Redirection...');
            setTimeout(() => {
              navigation.navigate('Login', { 
                licenseKey: activationInfo.licenseKey,
                isDeviceActivated: true
              });
            }, 800);
            return;
          } else {
            // License key no longer valid — clear stale activation
            console.log('⚠️ Stored license key is no longer valid, clearing activation');
            await AsyncStorage.removeItem(DEVICE_ACTIVATION_KEY);
          }
        } catch (err) {
          console.log('⚠️ Error re-validating stored license, clearing activation');
          await AsyncStorage.removeItem(DEVICE_ACTIVATION_KEY);
        }
      }
      setIsCheckingActivation(false);
    };
    
    checkActivation();
  }, []);

  const handleLicenseActivation = async () => {
    if (!licenseKey.trim()) {
      const message = 'Veuillez saisir une clé de licence valide.';
      setStatusMessage(message);
      setStatusType('error');
      showErrorToast(message);
      return;
    }

    setIsLoading(true);
    setStatusMessage('');
    showInfoToast('Validation de la licence en cours...');
    
    try {
      console.log('Starting license validation for:', licenseKey.trim());
      
      // Validate the license key using LicenseService
      const licenseService = LicenseService.getInstance();
      const result = await licenseService.validateLicenseKey(licenseKey.trim());
      
      console.log('📋 License validation result:', result);
      console.log('📋 isValid:', result.isValid);
      console.log('📋 License data:', result.license);
      console.log('📋 Organization data:', result.organization);
      console.log('📋 Errors:', result.errors);
      
      if (result.isValid && result.license && result.organization) {
        // Store device activation info for persistence
        const activationInfo: DeviceActivationInfo = {
          licenseKey: licenseKey.trim(),
          activatedAt: new Date().toISOString(),
          expiresAt: result.license.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          organizationId: result.organization.id
        };
        
        await AsyncStorage.setItem(DEVICE_ACTIVATION_KEY, JSON.stringify(activationInfo));
        console.log('Device activation stored successfully');
        
        const successMessage = 'Licence activée avec succès !';
        setStatusMessage(successMessage);
        setStatusType('success');
        showSuccessToast(`${successMessage} Redirection vers la connexion...`);
        
        // Navigate to login/registration with the validated license after a short delay
        setTimeout(() => {
          console.log('✅ Navigating to Login screen with validated license');
          navigation.navigate('Login', { 
            licenseKey: licenseKey.trim(),
            organization: result.organization,
            license: result.license
          });
        }, 800); // Reduced from 1500ms to 800ms for faster flow
      } else {
        const errorMessage = result.errors.length > 0 
          ? result.errors.join(', ') 
          : 'Clé de licence invalide';
        console.log('License validation failed:', errorMessage);
        setStatusMessage(errorMessage);
        setStatusType('error');
        showErrorToast(errorMessage);
      }
    } catch (error) {
      console.error('License activation error:', error);
      const errorMessage = error instanceof Error ? error.message : "Échec de l'activation. Veuillez réessayer.";
      setStatusMessage(errorMessage);
      setStatusType('error');
      showErrorToast(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const licenseTypes = [
    {
      type: 'PHARMACY',
      title: 'Pharmacie',
      desc: 'Gestion pharmaceutique',
      icon: 'medical-outline' as keyof typeof Ionicons.glyphMap,
      color: colors.success,
    },
    {
      type: 'HOSPITAL',
      title: 'Hôpital',
      desc: 'Gestion hospitalière',
      icon: 'business-outline' as keyof typeof Ionicons.glyphMap,
      color: colors.info,
    },
    {
      type: 'MEDECIN_DU_TRAVAIL',
      title: 'Médecine du Travail',
      desc: 'Santé & sécurité professionnelle',
      icon: 'shield-checkmark-outline' as keyof typeof Ionicons.glyphMap,
      color: colors.secondary,
    },
    {
      type: 'COMBINED',
      title: 'Combinée',
      desc: 'Accès complet',
      icon: 'layers-outline' as keyof typeof Ionicons.glyphMap,
      color: colors.primary,
    },
  ];

  const handleSelectType = undefined; // Type selection handled by manual input, test data removed

  // Show loading screen while checking activation
  if (isCheckingActivation) {
    return (
      <View style={[ls.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 18, color: colors.text, marginBottom: 16 }}>Vérification de l'activation...</Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary }}>Veuillez patienter</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={newLS.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={newLS.keyboardContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          style={newLS.scrollView}
          contentContainerStyle={newLS.scrollContentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={true}
          scrollEnabled={true}
          nestedScrollEnabled={true}
        >
          {/* Background decorations */}
          <View style={newLS.backgroundDecorations}>
            <View style={newLS.bgCircle1} />
            <View style={newLS.bgCircle2} />
          </View>

          <Animated.View
            style={[newLS.contentContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            {/* Header Section */}
            <View style={newLS.headerSection}>
              <View style={newLS.logoContainer}>
                <View style={newLS.logoCircle}>
                  <Ionicons name="medical" size={isDesktop ? 40 : 36} color="#FFF" />
                </View>
                <Text style={newLS.brandName}>HK Santé</Text>
                <Text style={newLS.brandSubtitle}>Système de Gestion de Santé</Text>
              </View>

              {/* Progress Steps */}
              <View style={newLS.progressContainer}>
                <View style={newLS.stepContainer}>
                  <View style={[newLS.stepDot, newLS.stepDotActive]}>
                    <Text style={newLS.stepNumActive}>1</Text>
                  </View>
                  <Text style={newLS.stepLabelActive}>Licence</Text>
                </View>
                <View style={newLS.stepLine} />
                <View style={newLS.stepContainer}>
                  <View style={[newLS.stepDot, newLS.stepDotInactive]}>
                    <Text style={newLS.stepNumInactive}>2</Text>
                  </View>
                  <Text style={newLS.stepLabelInactive}>Connexion</Text>
                </View>
                <View style={newLS.stepLine} />
                <View style={newLS.stepContainer}>
                  <View style={[newLS.stepDot, newLS.stepDotInactive]}>
                    <Text style={newLS.stepNumInactive}>3</Text>
                  </View>
                  <Text style={newLS.stepLabelInactive}>Tableau de Bord</Text>
                </View>
              </View>
            </View>

            {/* Main Content Card */}
            <View style={newLS.mainCard}>
              <Text style={newLS.cardTitle}>Activez votre licence</Text>
              <Text style={newLS.cardDescription}>
                Saisissez votre clé de licence pour accéder au système
              </Text>

              {/* Status Message */}
              {statusMessage ? (
                <View
                  style={[
                    newLS.statusBanner,
                    statusType === 'success' ? newLS.statusSuccess : newLS.statusError,
                  ]}
                >
                  <Ionicons
                    name={statusType === 'success' ? 'checkmark-circle' : 'alert-circle'}
                    size={18}
                    color={statusType === 'success' ? colors.success : colors.error}
                  />
                  <Text
                    style={[
                      newLS.statusText,
                      { color: statusType === 'success' ? colors.success : colors.error },
                    ]}
                  >
                    {statusMessage}
                  </Text>
                </View>
              ) : null}

              {/* License Types Grid */}
              <View style={newLS.sectionContainer}>
                <Text style={newLS.sectionTitle}>TYPES DE LICENCE DISPONIBLES</Text>
                <View style={newLS.licensesGrid}>
                  {licenseTypes.map((license) => (
                    <View key={license.type} style={newLS.licenseTypeCard}>
                      <View style={[newLS.licenseIcon, { backgroundColor: license.color + '18' }]}>
                        <Ionicons name={license.icon} size={20} color={license.color} />
                      </View>
                      <Text style={newLS.licenseTitle}>{license.title}</Text>
                      <Text style={newLS.licenseDesc}>{license.desc}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* License Key Input */}
              <View style={newLS.sectionContainer}>
                <Text style={newLS.sectionTitle}>CLÉ DE LICENCE</Text>
                <View style={newLS.inputContainer}>
                  <View style={newLS.inputWrapper}>
                    <Ionicons 
                      name="key-outline" 
                      size={20} 
                      color={colors.textSecondary} 
                      style={newLS.inputIcon}
                    />
                    <TextInput
                      value={licenseKey}
                      onChangeText={setLicenseKey}
                      placeholder="Saisissez votre clé de licence..."
                      placeholderTextColor={colors.textDisabled}
                      style={newLS.textInput}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      mode="flat"
                      underlineColor="transparent"
                      activeUnderlineColor="transparent"
                      contentStyle={newLS.textInputContent}
                    />
                  </View>
                </View>
              </View>

              {/* Activate Button */}
              <TouchableOpacity
                style={[
                  newLS.activateButton,
                  (!licenseKey.trim() || isLoading) && newLS.activateButtonDisabled,
                ]}
                onPress={handleLicenseActivation}
                disabled={!licenseKey.trim() || isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <Text style={newLS.activateButtonText}>Validation en cours...</Text>
                ) : (
                  <>
                    <Ionicons name="shield-checkmark" size={20} color="#FFF" style={newLS.buttonIcon} />
                    <Text style={newLS.activateButtonText}>Activer la Licence</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Features Bar */}
              <View style={newLS.featuresContainer}>
                {[
                  { icon: 'lock-closed-outline', label: 'Sécurisé' },
                  { icon: 'cloud-offline-outline', label: 'Hors ligne' },
                  { icon: 'people-outline', label: 'Multi-utilisateurs' },
                  { icon: 'shield-checkmark-outline', label: 'Validé' },
                ].map((feature, index) => (
                  <View key={index} style={newLS.featureItem}>
                    <Ionicons
                      name={feature.icon as keyof typeof Ionicons.glyphMap}
                      size={14}
                      color={colors.primary}
                    />
                    <Text style={newLS.featureLabel}>{feature.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Footer */}
            <View style={newLS.footer}>
              <Text style={newLS.footerText}>
                © 2025 HK Management Systems · République Démocratique du Congo
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// New License Screen Styles - Completely redesigned for proper scrolling
const newLS = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    minHeight: SCREEN_H * 0.9, // Ensure content can scroll
    paddingBottom: 40,
  },
  backgroundDecorations: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  bgCircle1: {
    position: 'absolute',
    top: -100,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.primary + '08',
  },
  bgCircle2: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.secondary + '06',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: isDesktop ? 24 : 16,
    paddingVertical: isDesktop ? 32 : 20,
    zIndex: 1,
    alignItems: 'center',
    width: '100%',
    maxWidth: MAX_CARD_W,
    alignSelf: 'center',
  },
  
  // Header Section
  headerSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: isDesktop ? 64 : 56,
    height: isDesktop ? 64 : 56,
    borderRadius: isDesktop ? 32 : 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...shadows.lg,
  },
  brandName: {
    fontSize: isDesktop ? 28 : 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: isDesktop ? 16 : 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  
  // Progress Steps
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 300,
  },
  stepContainer: {
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepDotInactive: {
    backgroundColor: colors.surfaceVariant,
  },
  stepNumActive: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  stepNumInactive: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  stepLabelActive: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  stepLabelInactive: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  stepLine: {
    height: 2,
    backgroundColor: colors.outline,
    flex: 0.5,
    marginHorizontal: 8,
    marginTop: -20,
  },
  
  // Main Card
  mainCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: isDesktop ? 32 : 24,
    marginBottom: 24,
    ...shadows.lg,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  cardTitle: {
    fontSize: isDesktop ? 24 : 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: isDesktop ? 16 : 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  
  // Status Banner
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
  },
  statusSuccess: {
    backgroundColor: colors.success + '12',
    borderColor: colors.success + '30',
  },
  statusError: {
    backgroundColor: colors.error + '12',
    borderColor: colors.error + '30',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  
  // Sections
  sectionContainer: {
    width: '100%',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  
  // License Types Grid
  licensesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  licenseTypeCard: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  licenseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  licenseTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  licenseDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  
  // Input Section
  inputContainer: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: 'transparent',
    height: 56,
  },
  textInputContent: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  
  // Button
  activateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
    ...shadows.md,
  },
  activateButtonDisabled: {
    backgroundColor: colors.textDisabled,
    opacity: 0.6,
  },
  activateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  buttonIcon: {
    marginRight: 8,
  },
  
  // Features
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginBottom: 8,
  },
  featureLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  
  // Footer
  footer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
});

const ls = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  bgCircle1: {
    position: 'absolute', top: -120, right: -80,
    width: 320, height: 320, borderRadius: 160,
    backgroundColor: colors.primary + '08',
  },
  bgCircle2: {
    position: 'absolute', bottom: -60, left: -100,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: colors.secondary + '06',
  },
  bgCircle3: {
    position: 'absolute', top: '40%' as any, left: -40,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: colors.accent + '06',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: isDesktop ? 16 : 12,
    paddingHorizontal: isDesktop ? 20 : 16,
  },
  content: { width: '100%', maxWidth: MAX_CARD_W, alignItems: 'center' },

  // Logo
  logoSection: { alignItems: 'center', marginBottom: isDesktop ? 16 : 20 },
  logoCircle: {
    width: isDesktop ? 56 : 64, height: isDesktop ? 56 : 64, borderRadius: isDesktop ? 28 : 32,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: isDesktop ? 10 : 12,
    ...shadows.lg,
  },
  brandName: { fontSize: isDesktop ? 24 : 22, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  brandTag: { fontSize: isDesktop ? 13 : 13, color: colors.textSecondary, marginTop: 2 },

  // Steps
  steps: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginBottom: isDesktop ? 16 : 20, gap: 0,
  },
  stepActive: { alignItems: 'center', gap: 4 },
  stepDotActive: {
    width: isDesktop ? 32 : 28, height: isDesktop ? 32 : 28, borderRadius: isDesktop ? 16 : 14,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNum: { fontSize: isDesktop ? 13 : 12, fontWeight: '700', color: '#FFF' },
  stepLabelActive: { fontSize: isDesktop ? 11 : 10, fontWeight: '600', color: colors.primary },
  stepInactive: { alignItems: 'center', gap: 4 },
  stepDotInactive: {
    width: isDesktop ? 32 : 28, height: isDesktop ? 32 : 28, borderRadius: isDesktop ? 16 : 14,
    backgroundColor: colors.outline,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumInactive: { fontSize: isDesktop ? 13 : 12, fontWeight: '600', color: colors.textTertiary },
  stepLabelInactive: { fontSize: isDesktop ? 11 : 10, color: colors.textTertiary },
  stepLine: { width: isDesktop ? 40 : 30, height: 2, backgroundColor: colors.outline, marginHorizontal: 8 },

  // Card
  card: {
    width: '100%', backgroundColor: colors.surface,
    borderRadius: isDesktop ? 20 : 16, padding: isDesktop ? 28 : 24,
    borderWidth: 1, borderColor: colors.outline,
    ...shadows.md,
  },
  cardTitle: { fontSize: isDesktop ? 20 : 20, fontWeight: '700', color: colors.text, marginBottom: 6 },
  cardDesc: { fontSize: isDesktop ? 14 : 14, color: colors.textSecondary, lineHeight: 20, marginBottom: isDesktop ? 16 : 20 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: isDesktop ? 16 : 20,
  },

  // Status
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1, marginBottom: 18,
  },
  statusText: { fontSize: 13, fontWeight: '500', flex: 1, lineHeight: 18 },

  // Section labels
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textTertiary,
    letterSpacing: 1, marginBottom: 10, marginTop: 4,
  },

  // Type Grid
  typeGrid: {
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: isDesktop ? 8 : 8, 
    marginBottom: isDesktop ? 14 : 18,
  },
  typeCard: {
    flexBasis: isDesktop ? '31.5%' as any : '48%' as any,
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 14, 
    padding: isDesktop ? 12 : 14,
    borderWidth: 1.5, 
    borderColor: colors.outline,
    alignItems: 'center', 
    position: 'relative',
  },
  typeIcon: {
    width: isDesktop ? 36 : 40, 
    height: isDesktop ? 36 : 40, 
    borderRadius: 12,
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: isDesktop ? 6 : 8,
  },
  typeTitle: { 
    fontSize: isDesktop ? 13 : 13, 
    fontWeight: '700', 
    color: colors.text, 
    marginBottom: 2,
    textAlign: 'center',
  },
  typeDesc: { 
    fontSize: 11, 
    color: colors.textTertiary, 
    textAlign: 'center',
    lineHeight: 15,
  },
  typeCheck: {
    position: 'absolute', top: 6, right: 6,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },

  // Input
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: isDesktop ? 12 : 10, borderWidth: 1, borderColor: colors.outline,
    marginBottom: isDesktop ? 20 : 16, overflow: 'hidden',
  },
  inputIconLeft: {
    paddingLeft: isDesktop ? 14 : 12, paddingRight: 4,
  },
  input: {
    flex: 1, backgroundColor: 'transparent',
    fontSize: isDesktop ? 16 : 15, height: isDesktop ? 54 : 48,
  },
  inputContent: { fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier', letterSpacing: 1 },

  // Activate Button
  activateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.primary,
    paddingVertical: isDesktop ? 17 : 15, borderRadius: isDesktop ? 16 : 14,
    ...shadows.md,
  },
  activateBtnDisabled: { opacity: 0.5 },
  activateBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },

  // Features strip
  featuresStrip: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    gap: 10, marginTop: 24, marginBottom: 16,
  },
  featureChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary + '0A',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: colors.primary + '18',
  },
  featureLabel: { fontSize: 12, fontWeight: '600', color: colors.primaryDark },

  // Footer
  footerText: { fontSize: 12, color: colors.textTertiary, textAlign: 'center', marginTop: 8 },
});

// ═══════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════════════════

function LoginScreen({ onSuccess, navigation, route }: any) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | ''>('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const { success: showSuccessToast, error: showErrorToast, info: showInfoToast } = useToast();

  const { licenseKey, organization, license } = route.params || {};

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      const message = 'Veuillez saisir votre téléphone et mot de passe.';
      setStatusMessage(message);
      setStatusType('error');
      showErrorToast(message);
      return;
    }

    setIsLoading(true);
    setStatusMessage('');
    showInfoToast('Connexion en cours...');

    try {
      console.log('Starting login process...');
      
      const result = await ApiAuthService.getInstance().login({
        phone: phone.trim(),
        password: password.trim(),
        licenseKey,
      });

      console.log('Login result:', result);

      if (result.success && result.user) {
        const successMessage = `Bienvenue, ${result.user.first_name || result.user.firstName} !`;
        setStatusMessage(successMessage);
        setStatusType('success');
        showSuccessToast(successMessage);
        
        console.log('✅ Login successful, calling onSuccess');
        setTimeout(() => {
          onSuccess({ ...result, activatedLicenseKey: licenseKey });
        }, 800);
      } else {
        const errorMessage = result.error || 'Email ou mot de passe incorrect';
        console.log('❌ Login failed:', errorMessage);
        setStatusMessage(errorMessage);
        setStatusType('error');
        showErrorToast(errorMessage);
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Echec de la connexion. Veuillez réessayer.';
      setStatusMessage(errorMessage);
      setStatusType('error');
      showErrorToast(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={newLogS.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={newLogS.keyboardContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          style={newLogS.scrollView}
          contentContainerStyle={newLogS.scrollContentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={true}
          scrollEnabled={true}
          nestedScrollEnabled={true}
        >
          {/* Background decorations */}
          <View style={newLogS.backgroundDecorations}>
            <View style={newLogS.bgCircle1} />
            <View style={newLogS.bgCircle2} />
          </View>

          <Animated.View
            style={[newLogS.contentContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            {/* Header Section */}
            <View style={newLogS.headerSection}>
              <View style={newLogS.logoContainer}>
                <View style={newLogS.logoCircle}>
                  <Ionicons name="medical" size={isDesktop ? 40 : 36} color="#FFF" />
                </View>
                <Text style={newLogS.brandName}>HK Santé</Text>
                <Text style={newLogS.brandSubtitle}>Connectez-vous à votre espace</Text>
              </View>

              {/* Progress Steps */}
              <View style={newLogS.progressContainer}>
                <View style={newLogS.stepContainer}>
                  <View style={[newLogS.stepDot, newLogS.stepDotCompleted]}>
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                  </View>
                  <Text style={newLogS.stepLabelCompleted}>Licence</Text>
                </View>
                <View style={newLogS.stepLineCompleted} />
                <View style={newLogS.stepContainer}>
                  <View style={[newLogS.stepDot, newLogS.stepDotActive]}>
                    <Text style={newLogS.stepNumActive}>2</Text>
                  </View>
                  <Text style={newLogS.stepLabelActive}>Connexion</Text>
                </View>
                <View style={newLogS.stepLine} />
                <View style={newLogS.stepContainer}>
                  <View style={[newLogS.stepDot, newLogS.stepDotInactive]}>
                    <Text style={newLogS.stepNumInactive}>3</Text>
                  </View>
                  <Text style={newLogS.stepLabelInactive}>Tableau de Bord</Text>
                </View>
              </View>
            </View>

            {/* Organization Info Card */}
            {organization && (
              <View style={newLogS.orgCard}>
                <View style={newLogS.orgHeader}>
                  <Ionicons name="business" size={20} color={colors.primary} />
                  <Text style={newLogS.orgName}>{organization.name || 'Organisation'}</Text>
                </View>
                <Text style={newLogS.licenseInfo}>
                  Licence: {licenseKey || 'N/A'}
                </Text>
                <SyncStatusIndicator compact={true} />
              </View>
            )}

            {/* Main Login Card */}
            <View style={newLogS.mainCard}>
              <Text style={newLogS.cardTitle}>Connexion</Text>
              <Text style={newLogS.cardDescription}>
                Identifiez-vous pour accéder au système
              </Text>

              {/* Status Message */}
              {statusMessage ? (
                <View
                  style={[
                    newLogS.statusBanner,
                    statusType === 'success' ? newLogS.statusSuccess : newLogS.statusError,
                  ]}
                >
                  <Ionicons
                    name={statusType === 'success' ? 'checkmark-circle' : 'alert-circle'}
                    size={18}
                    color={statusType === 'success' ? colors.success : colors.error}
                  />
                  <Text
                    style={[
                      newLogS.statusText,
                      { color: statusType === 'success' ? colors.success : colors.error },
                    ]}
                  >
                    {statusMessage}
                  </Text>
                </View>
              ) : null}

              {/* Phone Input */}
              <View style={newLogS.sectionContainer}>
                <Text style={newLogS.sectionTitle}>NUMÉRO DE TÉLÉPHONE</Text>
                <View style={newLogS.inputContainer}>
                  <View style={newLogS.inputWrapper}>
                    <Ionicons 
                      name="call-outline" 
                      size={20} 
                      color={colors.textSecondary} 
                      style={newLogS.inputIcon}
                    />
                    <TextInput
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="admin ou +243123456789"
                      placeholderTextColor={colors.textDisabled}
                      style={newLogS.textInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="default"
                      mode="flat"
                      underlineColor="transparent"
                      activeUnderlineColor="transparent"
                      contentStyle={newLogS.textInputContent}
                    />
                  </View>
                </View>
              </View>

              {/* Password Input */}
              <View style={newLogS.sectionContainer}>
                <Text style={newLogS.sectionTitle}>MOT DE PASSE</Text>
                <View style={newLogS.inputContainer}>
                  <View style={newLogS.inputWrapper}>
                    <Ionicons 
                      name="lock-closed-outline" 
                      size={20} 
                      color={colors.textSecondary} 
                      style={newLogS.inputIcon}
                    />
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="••••••••"
                      placeholderTextColor={colors.textDisabled}
                      style={newLogS.textInput}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      mode="flat"
                      underlineColor="transparent"
                      activeUnderlineColor="transparent"
                      contentStyle={newLogS.textInputContent}
                    />
                    <TouchableOpacity
                      style={newLogS.eyeButton}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={[
                  newLogS.loginButton,
                  (!phone.trim() || !password.trim() || isLoading) && newLogS.loginButtonDisabled,
                ]}
                onPress={handleLogin}
                disabled={!phone.trim() || !password.trim() || isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <Text style={newLogS.loginButtonText}>Connexion en cours...</Text>
                ) : (
                  <>
                    <Ionicons name="log-in-outline" size={20} color="#FFF" style={newLogS.buttonIcon} />
                    <Text style={newLogS.loginButtonText}>Se Connecter</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Demo Info */}
              <View style={newLogS.demoContainer}>
                <View style={newLogS.demoHeader}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.info} />
                  <Text style={newLogS.demoTitle}>Compte de Démonstration</Text>
                </View>
                <Text style={newLogS.demoCredentials}>
                  Téléphone: +243123456789{'\n'}Mot de passe: adminadmin
                </Text>
              </View>
            </View>

            {/* Back Button */}
            <TouchableOpacity
              style={newLogS.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
              <Text style={newLogS.backText}>Changer de licence</Text>
            </TouchableOpacity>

            {/* Footer */}
            <View style={newLogS.footer}>
              <Text style={newLogS.footerText}>
                © 2025 HK Management Systems · République Démocratique du Congo
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// New Login Screen Styles - Matching the license screen design
const newLogS = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    minHeight: SCREEN_H * 0.9,
    paddingBottom: 40,
  },
  backgroundDecorations: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  bgCircle1: {
    position: 'absolute',
    top: -100,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.primary + '08',
  },
  bgCircle2: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.secondary + '06',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: isDesktop ? 24 : 16,
    paddingVertical: isDesktop ? 32 : 20,
    zIndex: 1,
    alignItems: 'center',
    width: '100%',
    maxWidth: MAX_CARD_W,
    alignSelf: 'center',
  },
  
  // Header Section
  headerSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: isDesktop ? 64 : 56,
    height: isDesktop ? 64 : 56,
    borderRadius: isDesktop ? 32 : 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...shadows.lg,
  },
  brandName: {
    fontSize: isDesktop ? 28 : 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: isDesktop ? 16 : 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  
  // Progress Steps
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 300,
  },
  stepContainer: {
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepDotCompleted: {
    backgroundColor: colors.success,
  },
  stepDotInactive: {
    backgroundColor: colors.surfaceVariant,
  },
  stepNumActive: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  stepNumInactive: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  stepLabelActive: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
  },
  stepLabelCompleted: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
    textAlign: 'center',
  },
  stepLabelInactive: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  stepLine: {
    height: 2,
    backgroundColor: colors.outline,
    flex: 0.5,
    marginHorizontal: 8,
    marginTop: -20,
  },
  stepLineCompleted: {
    height: 2,
    backgroundColor: colors.success,
    flex: 0.5,
    marginHorizontal: 8,
    marginTop: -20,
  },
  
  // Organization Card
  orgCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadows.sm,
  },
  orgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  orgName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
    flex: 1,
  },
  licenseInfo: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  
  // Main Card
  mainCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: isDesktop ? 32 : 24,
    marginBottom: 24,
    ...shadows.lg,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  cardTitle: {
    fontSize: isDesktop ? 24 : 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: isDesktop ? 16 : 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  
  // Status Banner
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
  },
  statusSuccess: {
    backgroundColor: colors.success + '12',
    borderColor: colors.success + '30',
  },
  statusError: {
    backgroundColor: colors.error + '12',
    borderColor: colors.error + '30',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  
  // Sections
  sectionContainer: {
    width: '100%',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  
  // Input Section
  inputContainer: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: 'transparent',
    height: 56,
  },
  textInputContent: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  eyeButton: {
    padding: 8,
    marginLeft: 8,
  },
  
  // Login Button
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
    ...shadows.md,
  },
  loginButtonDisabled: {
    backgroundColor: colors.textDisabled,
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  buttonIcon: {
    marginRight: 8,
  },
  
  // Demo Container
  demoContainer: {
    backgroundColor: colors.info + '08',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.info + '18',
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  demoTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.info,
    marginLeft: 8,
  },
  demoCredentials: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'System',
    lineHeight: 18,
  },
  
  // Back Button
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  backText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    marginLeft: 8,
  },
  
  // Footer
  footer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
});

// Old styles (kept for compatibility)
const logS = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    flexGrow: 1, alignItems: 'center', justifyContent: 'flex-start',
    paddingVertical: isDesktop ? 24 : 12, paddingHorizontal: isDesktop ? 24 : 16,
  },
  content: { width: '100%', maxWidth: MAX_CARD_W, alignItems: 'center' },
  card: {
    width: '100%', backgroundColor: colors.surface,
    borderRadius: isDesktop ? 20 : 16, padding: isDesktop ? 28 : 20,
    borderWidth: 1, borderColor: colors.outline,
    ...shadows.md,
  },
  eyeBtn: { paddingHorizontal: isDesktop ? 14 : 12, paddingVertical: 12 },
  demoBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.info + '08',
    paddingHorizontal: isDesktop ? 14 : 12, paddingVertical: 12,
    borderRadius: 10, marginTop: isDesktop ? 18 : 16,
    borderWidth: 1, borderColor: colors.info + '18',
  },
  demoTitle: { fontSize: isDesktop ? 12 : 11, fontWeight: '600', color: colors.info, marginBottom: 2 },
  demoCredentials: { fontSize: isDesktop ? 13 : 12, color: colors.textSecondary, fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier' },
  backLink: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: isDesktop ? 20 : 16, paddingVertical: 8,
  },
  backText: { fontSize: isDesktop ? 13 : 12, color: colors.textSecondary, fontWeight: '500' },
  errorBackBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.error,
    marginLeft: 8,
  },
  errorBackText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});