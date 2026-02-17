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
} from 'react-native';
import { Button, Text, TextInput, Surface, Snackbar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiAuthService from '../services/ApiAuthService';
import SyncStatusIndicator from '../components/SyncStatusIndicator';
import LicenseService from '../services/LicenseService';
import { useToast } from '../components/GlobalUI';
import { colors, spacing, borderRadius, shadows } from '../theme/theme';

const { width: SCREEN_W } = Dimensions.get('window');
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
      
      console.log('License validation result:', result);
      
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
          console.log('Navigating to Login screen');
          navigation.navigate('Login', { 
            licenseKey: licenseKey.trim(),
            organization: result.organization,
            license: result.license
          });
        }, 1500);
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
      type: 'TRIAL',
      title: 'Essai',
      desc: '30 jours gratuit',
      icon: 'time-outline' as keyof typeof Ionicons.glyphMap,
      color: colors.warning,
      key: 'TRIAL-HK2024XY-Z9M3',
    },
    {
      type: 'PHARMACY',
      title: 'Pharmacie',
      desc: 'Gestion pharmaceutique',
      icon: 'medical-outline' as keyof typeof Ionicons.glyphMap,
      color: colors.success,
      key: 'PHARMACY-PH2024XY-M9N3',
    },
    {
      type: 'HOSPITAL',
      title: 'Hôpital',
      desc: 'Gestion hospitalière',
      icon: 'business-outline' as keyof typeof Ionicons.glyphMap,
      color: colors.info,
      key: 'HOSPITAL-HP2024XY-B6C4',
    },
    {
      type: 'OCCUPATIONAL_HEALTH',
      title: 'Santé au Travail',
      desc: 'Santé & sécurité professionnelle',
      icon: 'shield-checkmark-outline' as keyof typeof Ionicons.glyphMap,
      color: colors.secondary,
      key: 'OCCHEALTH-OH2024XY-P8Q3',
    },
    {
      type: 'COMBINED',
      title: 'Combinée',
      desc: 'Accès complet',
      icon: 'layers-outline' as keyof typeof Ionicons.glyphMap,
      color: colors.primary,
      key: 'COMBINED-CB2024XY-K7L2',
    },
  ];

  const handleSelectType = (lt: (typeof licenseTypes)[0]) => {
    setSelectedType(lt.type);
    setLicenseKey(lt.key);
    setStatusMessage(`Clé ${lt.title} remplie. Cliquez Activer pour continuer.`);
    setStatusType('success');
  };

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
    <View style={ls.root}>
      {/* ── Background Accent Shapes ── */}
      <View style={ls.bgCircle1} />
      <View style={ls.bgCircle2} />
      <View style={ls.bgCircle3} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={ls.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[ls.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            {/* ── Logo & Branding ── */}
            <View style={ls.logoSection}>
              <View style={ls.logoCircle}>
                <Ionicons name="medical" size={36} color="#FFF" />
              </View>
              <Text style={ls.brandName}>HK Santé</Text>
              <Text style={ls.brandTag}>Système de Gestion de Santé</Text>
            </View>

            {/* ── Step Indicator ── */}
            <View style={ls.steps}>
              <View style={ls.stepActive}>
                <View style={ls.stepDotActive}>
                  <Text style={ls.stepNum}>1</Text>
                </View>
                <Text style={ls.stepLabelActive}>Licence</Text>
              </View>
              <View style={ls.stepLine} />
              <View style={ls.stepInactive}>
                <View style={ls.stepDotInactive}>
                  <Text style={ls.stepNumInactive}>2</Text>
                </View>
                <Text style={ls.stepLabelInactive}>Connexion</Text>
              </View>
              <View style={ls.stepLine} />
              <View style={ls.stepInactive}>
                <View style={ls.stepDotInactive}>
                  <Text style={ls.stepNumInactive}>3</Text>
                </View>
                <Text style={ls.stepLabelInactive}>Tableau de Bord</Text>
              </View>
            </View>

            {/* ── Main Card ── */}
            <View style={ls.card}>
              <Text style={ls.cardTitle}>Activez votre licence</Text>
              <Text style={ls.cardDesc}>
                Sélectionnez un type de licence ou saisissez votre clé manuellement
              </Text>

              {/* Status Banner */}
              {statusMessage ? (
                <View
                  style={[
                    ls.statusBanner,
                    {
                      backgroundColor:
                        statusType === 'success' ? colors.success + '12' : colors.error + '12',
                      borderColor:
                        statusType === 'success' ? colors.success + '30' : colors.error + '30',
                    },
                  ]}
                >
                  <Ionicons
                    name={statusType === 'success' ? 'checkmark-circle' : 'alert-circle'}
                    size={18}
                    color={statusType === 'success' ? colors.success : colors.error}
                  />
                  <Text
                    style={[
                      ls.statusText,
                      { color: statusType === 'success' ? colors.successDark : colors.errorDark },
                    ]}
                  >
                    {statusMessage}
                  </Text>
                </View>
              ) : null}

              {/* ── License Type Picker ── */}
              <Text style={ls.sectionLabel}>TYPE DE LICENCE</Text>
              <View style={ls.typeGrid}>
                {licenseTypes.map((lt) => {
                  const active = selectedType === lt.type;
                  return (
                    <TouchableOpacity
                      key={lt.type}
                      style={[
                        ls.typeCard,
                        active && { borderColor: lt.color, backgroundColor: lt.color + '08' },
                      ]}
                      activeOpacity={0.7}
                      onPress={() => handleSelectType(lt)}
                    >
                      <View
                        style={[
                          ls.typeIcon,
                          { backgroundColor: active ? lt.color + '18' : colors.surfaceVariant },
                        ]}
                      >
                        <Ionicons
                          name={lt.icon}
                          size={22}
                          color={active ? lt.color : colors.textTertiary}
                        />
                      </View>
                      <Text style={[ls.typeTitle, active && { color: lt.color }]}>{lt.title}</Text>
                      <Text style={ls.typeDesc}>{lt.desc}</Text>
                      {active && (
                        <View style={[ls.typeCheck, { backgroundColor: lt.color }]}>
                          <Ionicons name="checkmark" size={12} color="#FFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ── License Key Input ── */}
              <Text style={ls.sectionLabel}>CLÉ DE LICENCE</Text>
              <View style={ls.inputWrapper}>
                <View style={ls.inputIconLeft}>
                  <Ionicons name="key-outline" size={20} color={colors.textTertiary} />
                </View>
                <TextInput
                  value={licenseKey}
                  onChangeText={(t) => {
                    setLicenseKey(t);
                    setSelectedType(null);
                  }}
                  mode="flat"
                  style={ls.input}
                  placeholder="TRIAL-XXXXXXXX-XXXX"
                  placeholderTextColor={colors.textDisabled}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                  contentStyle={ls.inputContent}
                />
              </View>

              {/* ── Activate Button ── */}
              <TouchableOpacity
                style={[
                  ls.activateBtn,
                  (!licenseKey.trim() || isLoading) && ls.activateBtnDisabled,
                ]}
                activeOpacity={0.8}
                onPress={handleLicenseActivation}
                disabled={isLoading || !licenseKey.trim()}
              >
                {isLoading ? (
                  <Text style={ls.activateBtnText}>Activation en cours...</Text>
                ) : (
                  <>
                    <Ionicons name="shield-checkmark" size={20} color="#FFF" />
                    <Text style={ls.activateBtnText}>Activer la Licence</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* ── Features Strip ── */}
            <View style={ls.featuresStrip}>
              {[
                { icon: 'lock-closed-outline', label: 'Chiffré' },
                { icon: 'cloud-offline-outline', label: 'Hors Ligne' },
                { icon: 'shield-checkmark-outline', label: 'Sécurisé' },
                { icon: 'people-outline', label: 'Multi-utilisateurs' },
              ].map((f, i) => (
                <View key={i} style={ls.featureChip}>
                  <Ionicons
                    name={f.icon as keyof typeof Ionicons.glyphMap}
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={ls.featureLabel}>{f.label}</Text>
                </View>
              ))}
            </View>

            {/* ── Footer ── */}
            <Text style={ls.footerText}>
              © 2025 HK Management Systems · Conçu pour la RD Congo
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

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
  const [phone, setPhone] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | ''>('');
  const licenseKey = route?.params?.licenseKey;
  const { success: showSuccessToast, error: showErrorToast, info: showInfoToast } = useToast();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      const message = "Veuillez saisir le numéro de téléphone et le mot de passe.";
      setStatusMessage(message);
      setStatusType('error');
      showErrorToast(message);
      return;
    }
    setIsLoading(true);
    setStatusMessage('');
    // Removed the "Connexion en cours..." toast to avoid multiple toasts
    
    try {
      const result = await ApiAuthService.login({
        phone: phone.trim(),
        password: password.trim(),
      });
      if (result.success && result.user) {
        const successMessage = `Bienvenue, ${result.user.first_name || result.user.firstName} !`;
        setStatusMessage(successMessage);
        setStatusType('success');
        showSuccessToast(successMessage);
        setTimeout(() => onSuccess(result), 1000);
      } else {
        const errorMessage = result.error || 'Connexion échouée';
        setStatusMessage(errorMessage);
        setStatusType('error');
        showErrorToast(errorMessage);
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = 'Connexion échouée. Veuillez réessayer.';
      setStatusMessage(errorMessage);
      setStatusType('error');
      showErrorToast(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={logS.root}>
      <View style={ls.bgCircle1} />
      <View style={ls.bgCircle2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={logS.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[logS.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            {/* ── Logo ── */}
            <View style={ls.logoSection}>
              <View style={ls.logoCircle}>
                <Ionicons name="medical" size={36} color="#FFF" />
              </View>
              <Text style={ls.brandName}>HK Santé</Text>
              <Text style={ls.brandTag}>Connectez-vous à votre espace</Text>
            </View>

            {/* ── Step Indicator ── */}
            <View style={ls.steps}>
              <View style={ls.stepInactive}>
                <View style={[ls.stepDotActive, { backgroundColor: colors.success }]}>
                  <Ionicons name="checkmark" size={16} color="#FFF" />
                </View>
                <Text style={[ls.stepLabelActive, { color: colors.success }]}>Licence</Text>
              </View>
              <View style={[ls.stepLine, { backgroundColor: colors.success }]} />
              <View style={ls.stepActive}>
                <View style={ls.stepDotActive}>
                  <Text style={ls.stepNum}>2</Text>
                </View>
                <Text style={ls.stepLabelActive}>Connexion</Text>
              </View>
              <View style={ls.stepLine} />
              <View style={ls.stepInactive}>
                <View style={ls.stepDotInactive}>
                  <Text style={ls.stepNumInactive}>3</Text>
                </View>
                <Text style={ls.stepLabelInactive}>Tableau de Bord</Text>
              </View>
            </View>

            {/* ── Login Card ── */}
            <View style={logS.card}>
              <View style={ls.cardHeader}>
                <View>
                  <Text style={ls.cardTitle}>Connexion</Text>
                  <Text style={ls.cardDesc}>
                    Identifiez-vous pour accéder au système
                  </Text>
                </View>
                <SyncStatusIndicator compact={true} />
              </View>

              {/* Status Banner */}
              {statusMessage ? (
                <View
                  style={[
                    ls.statusBanner,
                    {
                      backgroundColor:
                        statusType === 'success' ? colors.success + '12' : colors.error + '12',
                      borderColor:
                        statusType === 'success' ? colors.success + '30' : colors.error + '30',
                    },
                  ]}
                >
                  <Ionicons
                    name={statusType === 'success' ? 'checkmark-circle' : 'alert-circle'}
                    size={18}
                    color={statusType === 'success' ? colors.success : colors.error}
                  />
                  <Text
                    style={[
                      ls.statusText,
                      { color: statusType === 'success' ? colors.successDark : colors.errorDark },
                    ]}
                  >
                    {statusMessage}
                  </Text>
                  {statusType === 'error' && statusMessage.includes('licence') && (
                    <TouchableOpacity
                      style={logS.errorBackBtn}
                      onPress={() => navigation.goBack()}
                      activeOpacity={0.7}
                    >
                      <Text style={logS.errorBackText}>Retour</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}

              {/* Phone */}
              <Text style={ls.sectionLabel}>NUMÉRO DE TÉLÉPHONE</Text>
              <View style={ls.inputWrapper}>
                <View style={ls.inputIconLeft}>
                  <Ionicons name="call-outline" size={20} color={colors.textTertiary} />
                </View>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  mode="flat"
                  style={[ls.input, { fontFamily: 'System' }]}
                  placeholder="admin ou +1234567890"
                  placeholderTextColor={colors.textDisabled}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="default"
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                />
              </View>

              {/* Password */}
              <Text style={ls.sectionLabel}>MOT DE PASSE</Text>
              <View style={ls.inputWrapper}>
                <View style={ls.inputIconLeft}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textTertiary} />
                </View>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  mode="flat"
                  style={[ls.input, { fontFamily: 'System' }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textDisabled}
                  secureTextEntry={!showPassword}
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                />
                <TouchableOpacity
                  style={logS.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={[
                  ls.activateBtn,
                  (!phone.trim() || !password.trim() || isLoading) && ls.activateBtnDisabled,
                ]}
                activeOpacity={0.8}
                onPress={handleLogin}
                disabled={isLoading || !phone.trim() || !password.trim()}
              >
                {isLoading ? (
                  <Text style={ls.activateBtnText}>Connexion en cours...</Text>
                ) : (
                  <>
                    <Ionicons name="log-in-outline" size={20} color="#FFF" />
                    <Text style={ls.activateBtnText}>Se Connecter</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Demo Info */}
              <View style={logS.demoBox}>
                <Ionicons name="information-circle-outline" size={18} color={colors.info} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={logS.demoTitle}>Compte Démo</Text>
                  <Text style={logS.demoCredentials}>admin / admin123</Text>
                </View>
              </View>
            </View>

            {/* ── Back link ── */}
            <TouchableOpacity
              style={logS.backLink}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
              <Text style={logS.backText}>Changer de licence</Text>
            </TouchableOpacity>

            <Text style={ls.footerText}>
              © 2025 HK Management Systems · Conçu pour la RD Congo
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const logS = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scrollContent: {
    flexGrow: 1, alignItems: 'center', justifyContent: 'flex-start',
    paddingVertical: isDesktop ? 24 : 12, paddingHorizontal: isDesktop ? 24 : 16,
    minHeight: '100%',
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