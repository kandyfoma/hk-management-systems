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
  ActivityIndicator,
  Image,
} from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiAuthService from '../services/ApiAuthService';
// SyncStatusIndicator reserved for future use
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
  licenseType?: string;  // Backend license type (PHARMACY, HOSPITAL, COMBINED, etc.)
  licenseStatus?: string; // Backend license status (active, pending, etc.)
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
  ForgotPassword: undefined;
  Register: undefined;
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
      <Stack.Screen name="ForgotPassword">
        {(props) => <ForgotPasswordScreen {...props} />}
      </Stack.Screen>
      <Stack.Screen name="Register">
        {(props) => <RegisterScreen {...props} onSuccess={onAuthSuccess} />}
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
            // Update stored activation info with latest license type/status
            if (result.license?.type) {
              const updatedInfo: DeviceActivationInfo = {
                ...activationInfo,
                licenseType: result.license.type,
                licenseStatus: result.license.status,
              };
              await AsyncStorage.setItem(DEVICE_ACTIVATION_KEY, JSON.stringify(updatedInfo));
              console.log('📋 Updated activation info with licenseType:', result.license.type);
            }
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
          expiresAt: result.license.expiryDate || result.license.expiry_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          organizationId: result.organization.id,
          licenseType: result.license.type,
          licenseStatus: result.license.status,
        };
        console.log('📋 Storing activation with licenseType:', result.license.type, 'status:', result.license.status);
        
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
      <View style={A.loadingScreen}>
        <View style={A.loadingLogo}>
          <Image source={require('../../assets/icon.png')} style={A.loadingLogoImg} resizeMode="contain" />
        </View>
        <Text style={A.loadingTitle}>KAT Management Systems</Text>
        <Text style={A.loadingSubtitle}>Vérification de l'activation...</Text>
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <SafeAreaView style={A.safe}>
      <View style={A.root}>
        {/* ── Left brand panel — desktop only ───────────────── */}
        {isDesktop && (
          <View style={A.brandPanel}>
            <View style={A.brandCircle1} />
            <View style={A.brandCircle2} />
            <View style={A.brandContent}>
              <View style={A.brandLogo}>
                <Image source={require('../../assets/icon.png')} style={A.brandLogoImg} resizeMode="contain" />
              </View>
              <Text style={A.brandName}>KAT Management Systems</Text>
              <Text style={A.brandTagline}>
                Système de Gestion de Santé{'\n'}pour les établissements médicaux
              </Text>
              <View style={A.brandDivider} />
              <View style={A.brandFeatures}>
                {[
                  { icon: 'shield-checkmark', text: 'Sécurisé et certifié' },
                  { icon: 'cloud-offline', text: 'Fonctionnement hors ligne' },
                  { icon: 'people', text: 'Multi-utilisateurs et rôles' },
                  { icon: 'bar-chart', text: 'Rapports et statistiques avancés' },
                ].map((f, i) => (
                  <View key={i} style={A.brandFeatureRow}>
                    <View style={A.brandFeatureIcon}>
                      <Ionicons name={f.icon as keyof typeof Ionicons.glyphMap} size={15} color="#FFF" />
                    </View>
                    <Text style={A.brandFeatureText}>{f.text}</Text>
                  </View>
                ))}
              </View>
              <View style={A.brandStepPill}>
                <Ionicons name="flag-outline" size={12} color="rgba(255,255,255,0.75)" />
                <Text style={A.brandStepLabel}>Étape 1 sur 3 — Activation</Text>
              </View>
            </View>
            <Text style={A.brandFooter}>© 2025 KAT Management Systems · RDC</Text>

          </View>
        )}

        {/* ── Right form side ───────────────────────────────── */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={A.formSide}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          <Animated.View style={[A.formSideInner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <ScrollView
              contentContainerStyle={A.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              {/* Mobile header */}
              {!isDesktop && (
                <View style={A.mobileHeader}>
                  <View style={A.mobileLogoBox}>
                    <Image source={require('../../assets/icon.png')} style={A.mobileLogoImg} resizeMode="contain" />
                  </View>
                  <View>
                    <Text style={A.mobileBrandName}>KAT Management</Text>
                    <Text style={A.mobileTagline}>Système de Gestion de Santé</Text>
                  </View>
                </View>
              )}

              {/* Step indicator */}
              <View style={A.stepRow}>
                {[
                  { label: 'Licence', icon: 'key-outline' as keyof typeof Ionicons.glyphMap },
                  { label: 'Connexion', icon: 'log-in-outline' as keyof typeof Ionicons.glyphMap },
                  { label: 'Accès', icon: 'home-outline' as keyof typeof Ionicons.glyphMap },
                ].map((step, i) => (
                  <React.Fragment key={i}>
                    <View style={A.stepItem}>
                      <View style={[A.stepBubble, i === 0 ? A.stepBubbleActive : A.stepBubbleInactive]}>
                        {i === 0
                          ? <Ionicons name="checkmark" size={13} color="#FFF" />
                          : <Text style={A.stepNum}>{i + 1}</Text>
                        }
                      </View>
                      <Text style={[A.stepLabel, i === 0 && A.stepLabelActive]}>{step.label}</Text>
                    </View>
                    {i < 2 && (
                      <View style={[A.stepConnector, i === 0 && A.stepConnectorActive]} />
                    )}
                  </React.Fragment>
                ))}
              </View>

              {/* Page heading */}
              <Text style={A.pageTitle}>Activation de licence</Text>
              <Text style={A.pageDesc}>
                Entrez votre clé de licence pour activer cet appareil et accéder au système.
              </Text>

              {/* Status banner */}
              {statusMessage ? (
                <View style={[A.statusBanner, statusType === 'success' ? A.bannerSuccess : A.bannerError]}>
                  <Ionicons
                    name={statusType === 'success' ? 'checkmark-circle' : 'alert-circle'}
                    size={16}
                    color={statusType === 'success' ? '#059669' : colors.error}
                  />
                  <Text style={[A.statusText, { color: statusType === 'success' ? '#059669' : colors.error }]}>
                    {statusMessage}
                  </Text>
                </View>
              ) : null}

              {/* License type reference cards */}
              <Text style={A.sectionLabel}>TYPES DE LICENCE DISPONIBLES</Text>
              <View style={A.licenseGrid}>
                {licenseTypes.map((lt) => (
                  <View key={lt.type} style={A.licenseCard}>
                    <View style={[A.licenseIconBox, { backgroundColor: lt.color + '18' }]}>
                      <Ionicons name={lt.icon} size={18} color={lt.color} />
                    </View>
                    <Text style={A.licenseCardTitle}>{lt.title}</Text>
                    <Text style={A.licenseCardDesc} numberOfLines={2}>{lt.desc}</Text>
                  </View>
                ))}
              </View>

              {/* License key input */}
              <Text style={A.sectionLabel}>CLÉ DE LICENCE</Text>
              <View style={A.keyInputRow}>
                <Ionicons name="key-outline" size={20} color={colors.textSecondary} style={{ marginRight: 10 }} />
                <TextInput
                  value={licenseKey}
                  onChangeText={setLicenseKey}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  placeholderTextColor={colors.textDisabled}
                  style={A.keyInput}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  mode="flat"
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                  contentStyle={A.keyInputContent}
                />
              </View>

              {/* Activate button */}
              <TouchableOpacity
                style={[A.primaryBtn, (!licenseKey.trim() || isLoading) && A.primaryBtnDisabled]}
                onPress={handleLicenseActivation}
                disabled={!licenseKey.trim() || isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark-outline" size={18} color="#FFF" />
                    <Text style={A.primaryBtnText}>Activer la Licence</Text>
                    <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.7)" style={{ marginLeft: 'auto' as any }} />
                  </>
                )}
              </TouchableOpacity>

              {/* Trust chips */}
              <View style={A.chipsRow}>
                {[
                  { icon: 'lock-closed-outline', label: 'Sécurisé' },
                  { icon: 'cloud-offline-outline', label: 'Hors ligne' },
                  { icon: 'people-outline', label: 'Multi-utilisateurs' },
                  { icon: 'shield-checkmark-outline', label: 'Validé' },
                ].map((f, i) => (
                  <View key={i} style={A.chip}>
                    <Ionicons name={f.icon as keyof typeof Ionicons.glyphMap} size={11} color={colors.primary} />
                    <Text style={A.chipText}>{f.label}</Text>
                  </View>
                ))}
              </View>

              {!isDesktop && (
                <Text style={A.footerText}>© 2025 KAT Management Systems · République Démocratique du Congo</Text>
              )}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

// ── Auth screens shared style token ────────────────────────────────────────
const A = StyleSheet.create({
  // Layout
  safe: { flex: 1, backgroundColor: colors.background, ...Platform.select({ web: { height: SCREEN_H } as any, default: {} }) },
  root: { flex: 1, flexDirection: isDesktop ? 'row' : 'column', ...Platform.select({ web: { overflow: 'hidden' } as any, default: {} }) },

  // Loading screen
  loadingScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingLogo: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    ...shadows.lg,
  },
  loadingLogoImg: { width: 60, height: 60 },
  loadingTitle: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 6 },
  loadingSubtitle: { fontSize: 14, color: colors.textSecondary },

  // Brand panel (desktop left side)
  brandPanel: {
    width: '38%',
    backgroundColor: colors.primary,
    overflow: 'hidden',
    position: 'relative',
  },
  brandCircle1: {
    position: 'absolute', top: -100, right: -80,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  brandCircle2: {
    position: 'absolute', bottom: -80, left: -60,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(91,101,220,0.22)',
  },
  brandContent: {
    flex: 1, padding: isDesktop ? 36 : 28, justifyContent: 'center', zIndex: 1,
  },
  brandLogo: {
    width: 60, height: 60, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18,
    overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  brandLogoImg: { width: 50, height: 50 },
  brandName: {
    fontSize: isDesktop ? 22 : 20, fontWeight: '800', color: '#FFF',
    letterSpacing: -0.3, marginBottom: 8,
  },
  brandTagline: {
    fontSize: 14, color: 'rgba(255,255,255,0.65)',
    lineHeight: 22, marginBottom: 22,
  },
  brandDivider: {
    width: 44, height: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2, marginBottom: 20,
  },
  brandFeatures: { gap: 14 },
  brandFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandFeatureIcon: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center', justifyContent: 'center',
  },
  brandFeatureText: { fontSize: 13, color: 'rgba(255,255,255,0.82)', fontWeight: '500' },
  brandStepPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7,
    alignSelf: 'flex-start',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  brandStepLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)', letterSpacing: 0.3 },
  brandFooter: {
    position: 'absolute', bottom: 18, left: 40,
    fontSize: 11, color: 'rgba(255,255,255,0.35)',
  },

  // Form side
  formSide: { flex: 1, backgroundColor: colors.background },
  formSideInner: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: isDesktop ? 48 : (isTablet ? 36 : 20),
    paddingTop: isDesktop ? 36 : 24,
    paddingBottom: isDesktop ? 24 : 40,
    maxWidth: isDesktop ? 520 : undefined,
    width: '100%',
    alignSelf: isDesktop ? 'center' : undefined,
  },

  // Mobile header
  mobileHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 20, marginTop: 4,
  },
  mobileLogoBox: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    ...shadows.sm,
  },
  mobileLogoImg: { width: 42, height: 42 },
  mobileBrandName: { fontSize: isTablet ? 17 : 15, fontWeight: '700', color: colors.text },
  mobileTagline: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },

  // Step indicator
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 36 },
  stepItem: { alignItems: 'center', gap: 5 },
  stepBubble: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBubbleActive: { backgroundColor: colors.primary },
  stepBubbleInactive: { backgroundColor: colors.surfaceVariant, borderWidth: 1, borderColor: colors.outline },
  stepNum: { fontSize: 12, fontWeight: '700', color: colors.textTertiary },
  stepLabel: { fontSize: 11, fontWeight: '500', color: colors.textTertiary },
  stepLabelActive: { color: colors.primary, fontWeight: '700' },
  stepConnector: { flex: 1, height: 2, backgroundColor: colors.outline, marginHorizontal: 8, marginBottom: 18 },
  stepConnectorActive: { backgroundColor: colors.primary },

  // Page heading
  pageTitle: {
    fontSize: isDesktop ? 24 : 22,
    fontWeight: '800', color: colors.text,
    letterSpacing: -0.5, marginBottom: 6,
  },
  pageDesc: {
    fontSize: 14, color: colors.textSecondary,
    lineHeight: 21, marginBottom: isDesktop ? 14 : 24,
  },

  // Status banner
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 10, marginBottom: 20, borderWidth: 1,
  },
  bannerSuccess: { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' },
  bannerError: { backgroundColor: '#FFF5F5', borderColor: '#FECACA' },
  statusText: { fontSize: 13, fontWeight: '500', flex: 1, lineHeight: 18 },

  // Section label
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textTertiary,
    letterSpacing: 1.2, marginBottom: 12, textTransform: 'uppercase',
  },

  // License type cards
  licenseGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: isDesktop ? 14 : 24,
  },
  licenseCard: {
    flex: 1, minWidth: isDesktop ? 100 : 120,
    backgroundColor: colors.surface,
    borderRadius: 10, padding: isDesktop ? 10 : 14,
    borderWidth: 1, borderColor: colors.outline,
    ...shadows.sm,
  },
  licenseIconBox: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  licenseCardTitle: { fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 2 },
  licenseCardDesc: { fontSize: 10, color: colors.textSecondary, lineHeight: 14 },

  // Key input
  keyInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12, borderWidth: 1.5, borderColor: colors.outline,
    paddingHorizontal: 14, marginBottom: 16, minHeight: isDesktop ? 48 : 56,
    ...shadows.sm,
  },
  keyInput: { flex: 1, backgroundColor: 'transparent', height: isDesktop ? 48 : 56, fontSize: 15 },
  keyInputContent: {
    backgroundColor: 'transparent', paddingHorizontal: 0,
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier', letterSpacing: 2,
  },

  // Primary button
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.primary,
    borderRadius: 12, paddingVertical: isDesktop ? 13 : 16, paddingHorizontal: 20,
    marginBottom: isDesktop ? 14 : 22,
    ...shadows.md,
  },
  primaryBtnDisabled: { opacity: 0.42 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },

  // Trust chips
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: isDesktop ? 10 : 22 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.primary + '0D',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.primary + '1A',
  },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.primaryDark },

  // Footer
  footerText: { fontSize: 11, color: colors.textTertiary, textAlign: 'center', paddingTop: 4 },
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
  const { success: showSuccessToast, error: showErrorToast, info: showInfoToast } = useToast();

  const { licenseKey, organization, license } = route.params || {};

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
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
    <SafeAreaView style={L.safe}>
      <View style={L.root}>
        {/* ── Left brand panel — desktop only ───────────────── */}
        {isDesktop && (
          <View style={L.brandPanel}>
            <View style={L.brandCircle1} />
            <View style={L.brandCircle2} />
            <View style={L.brandContent}>
              <View style={L.brandLogo}>
                <Image source={require('../../assets/icon.png')} style={L.brandLogoImg} resizeMode="contain" />
              </View>
              <Text style={L.brandName}>KAT Management Systems</Text>
              <Text style={L.brandTagline}>
                Accédez à votre espace de{'\n'}gestion médicale sécurisé
              </Text>
              <View style={L.brandDivider} />
              <View style={L.brandFeatures}>
                {[
                  { icon: 'shield-checkmark', text: 'Connexion sécurisée' },
                  { icon: 'cloud-offline', text: 'Fonctionnement hors ligne' },
                  { icon: 'people', text: 'Gestion multi-utilisateurs' },
                  { icon: 'analytics', text: 'Tableaux de bord en temps réel' },
                ].map((f, i) => (
                  <View key={i} style={L.brandFeatureRow}>
                    <View style={L.brandFeatureIcon}>
                      <Ionicons name={f.icon as keyof typeof Ionicons.glyphMap} size={15} color="#FFF" />
                    </View>
                    <Text style={L.brandFeatureText}>{f.text}</Text>
                  </View>
                ))}
              </View>
              {organization && (
                <View style={L.orgBadge}>
                  <Ionicons name="business" size={13} color="rgba(255,255,255,0.75)" />
                  <Text style={L.orgBadgeText}>{organization.name}</Text>
                </View>
              )}
              <View style={L.brandStepPill}>
                <Ionicons name="log-in-outline" size={12} color="rgba(255,255,255,0.75)" />
                <Text style={L.brandStepLabel}>Étape 2 sur 3 — Connexion</Text>
              </View>
            </View>
            <Text style={L.brandFooter}>© 2025 KAT Management Systems · RDC</Text>
          </View>
        )}

        {/* ── Right form side ───────────────────────────────── */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={L.formSide}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <Animated.View style={[L.formSideInner, { opacity: fadeAnim }]}>
            <ScrollView
              contentContainerStyle={L.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Mobile header with back button */}
              {!isDesktop && (
                <View style={L.mobileHeader}>
                  <TouchableOpacity style={L.mobileBackBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={18} color={colors.text} />
                  </TouchableOpacity>
                  <View style={L.mobileLogoBox}>
                    <Image source={require('../../assets/icon.png')} style={L.mobileLogoImg} resizeMode="contain" />
                  </View>
                  <Text style={L.mobileBrandName}>KAT Management</Text>
                </View>
              )}

              {/* Desktop back link */}
              {isDesktop && (
                <TouchableOpacity style={L.desktopBackBtn} onPress={() => navigation.goBack()}>
                  <Ionicons name="arrow-back" size={15} color={colors.textSecondary} />
                  <Text style={L.desktopBackText}>Changer de licence</Text>
                </TouchableOpacity>
              )}

              {/* Step indicator */}
              <View style={L.stepRow}>
                {[
                  { label: 'Licence' },
                  { label: 'Connexion' },
                  { label: 'Accès' },
                ].map((step, i) => (
                  <React.Fragment key={i}>
                    <View style={L.stepItem}>
                      <View style={[
                        L.stepBubble,
                        i === 0 ? L.stepBubbleDone : i === 1 ? L.stepBubbleActive : L.stepBubbleInactive,
                      ]}>
                        {i === 0
                          ? <Ionicons name="checkmark" size={13} color="#FFF" />
                          : <Text style={[L.stepNum, i === 1 && L.stepNumActive]}>{i + 1}</Text>
                        }
                      </View>
                      <Text style={[
                        L.stepLabel,
                        i === 0 && L.stepLabelDone,
                        i === 1 && L.stepLabelActive,
                      ]}>
                        {step.label}
                      </Text>
                    </View>
                    {i < 2 && (
                      <View style={[L.stepConnector, i === 0 && L.stepConnectorDone]} />
                    )}
                  </React.Fragment>
                ))}
              </View>

              {/* Org badge — mobile */}
              {organization && !isDesktop && (
                <View style={L.orgBadgeMobile}>
                  <Ionicons name="business-outline" size={13} color={colors.primary} />
                  <Text style={L.orgBadgeMobileText}>{organization.name}</Text>
                </View>
              )}

              {/* Heading */}
              <Text style={L.pageTitle}>Connexion</Text>
              <Text style={L.pageDesc}>Entrez vos identifiants pour accéder à votre espace</Text>

              {/* Alert */}
              {statusMessage ? (
                <View style={[L.alert, statusType === 'success' ? L.alertSuccess : L.alertError]}>
                  <Ionicons
                    name={statusType === 'success' ? 'checkmark-circle' : 'alert-circle'}
                    size={16}
                    color={statusType === 'success' ? '#059669' : colors.error}
                  />
                  <Text style={[L.alertText, { color: statusType === 'success' ? '#059669' : colors.error }]}>
                    {statusMessage}
                  </Text>
                </View>
              ) : null}

              {/* Phone field */}
              <View style={L.fieldGroup}>
                <Text style={L.fieldLabel}>NUMÉRO DE TÉLÉPHONE</Text>
                <View style={L.inputBox}>
                  <Ionicons name="call-outline" size={18} color={colors.textSecondary} style={L.fieldIcon} />
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="admin ou +243123456789"
                    placeholderTextColor={colors.textDisabled}
                    style={L.input}
                    autoCapitalize="none"
                    autoCorrect={false}
                    mode="flat"
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                    contentStyle={L.inputContent}
                  />
                </View>
              </View>

              {/* Password field */}
              <View style={L.fieldGroup}>
                <Text style={L.fieldLabel}>MOT DE PASSE</Text>
                <View style={L.inputBox}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} style={L.fieldIcon} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textDisabled}
                    style={L.input}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    mode="flat"
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                    contentStyle={L.inputContent}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={L.eyeBtn}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Sign-in button */}
              <TouchableOpacity
                style={[L.primaryBtn, (!phone.trim() || !password.trim() || isLoading) && L.primaryBtnDisabled]}
                onPress={handleLogin}
                disabled={!phone.trim() || !password.trim() || isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Text style={L.primaryBtnText}>Se Connecter</Text>
                    <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.75)" />
                  </>
                )}
              </TouchableOpacity>

              {/* Forgot password & Register links */}
              <View style={L.authLinksRow}>
                <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                  <Text style={L.authLink}>Mot de passe oublié?</Text>
                </TouchableOpacity>
                <View style={L.authLinkDivider} />
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                  <Text style={L.authLink}>Créer un compte</Text>
                </TouchableOpacity>
              </View>

              {!isDesktop && (
                <Text style={L.footerText}>© 2025 KAT Management Systems · RDC</Text>
              )}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════
// REGISTER SCREEN
// ═══════════════════════════════════════════════════════════════

function RegisterScreen({ onSuccess, navigation, route }: any) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | ''>('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { success: showSuccessToast, error: showErrorToast, info: showInfoToast } = useToast();

  const { licenseKey } = route.params || {};

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const validatePhone = (phoneNumber: string): boolean => {
    // Accept various phone formats: +243..., 0..., or just digits
    const phoneRegex = /^[+]?[0-9]{1,15}$/;
    return phoneRegex.test(phoneNumber.replace(/[\s\-().]/g, ''));
  };

  const validateForm = (): boolean => {
    if (!firstName.trim()) {
      setStatusMessage('Le prénom est requis');
      setStatusType('error');
      showErrorToast('Le prénom est requis');
      return false;
    }

    if (!lastName.trim()) {
      setStatusMessage('Le nom est requis');
      setStatusType('error');
      showErrorToast('Le nom est requis');
      return false;
    }

    if (!phone.trim()) {
      setStatusMessage('Le numéro de téléphone est requis');
      setStatusType('error');
      showErrorToast('Le numéro de téléphone est requis');
      return false;
    }

    if (!validatePhone(phone.trim())) {
      setStatusMessage('Format de numéro de téléphone invalide');
      setStatusType('error');
      showErrorToast('Format de numéro de téléphone invalide');
      return false;
    }

    if (password.length < 8) {
      setStatusMessage('Le mot de passe doit contenir au moins 8 caractères');
      setStatusType('error');
      showErrorToast('Le mot de passe doit contenir au moins 8 caractères');
      return false;
    }

    if (password !== confirmPassword) {
      setStatusMessage('Les mots de passe ne correspondent pas');
      setStatusType('error');
      showErrorToast('Les mots de passe ne correspondent pas');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setStatusMessage('');
    showInfoToast('Création du compte en cours...');

    try {
      console.log('Starting registration process...');
      
      const result = await ApiAuthService.getInstance().register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        password: password.trim(),
        licenseKey,
        role: 'STAFF',
      });

      console.log('Registration result:', result);

      if (result.success && result.user) {
        const successMessage = `Bienvenue, ${result.user.first_name || result.user.firstName} !`;
        setStatusMessage(successMessage);
        setStatusType('success');
        showSuccessToast(successMessage);
        
        console.log('✅ Registration successful, auto-logging in...');
        // Auto-login after successful registration
        try {
          const loginResult = await ApiAuthService.getInstance().login({
            phone: phone.trim(),
            password: password.trim(),
          });
          
          if (loginResult.success) {
            console.log('✅ Auto-login successful');
            setTimeout(() => {
              onSuccess({ ...loginResult, activatedLicenseKey: licenseKey });
            }, 500);
          } else {
            // If auto-login fails, still proceed with onSuccess
            console.warn('Auto-login failed, proceeding with registration flow');
            setTimeout(() => {
              onSuccess({ ...result, activatedLicenseKey: licenseKey });
            }, 800);
          }
        } catch (loginError) {
          console.warn('Auto-login error:', loginError);
          // Proceed with registration flow even if auto-login fails
          setTimeout(() => {
            onSuccess({ ...result, activatedLicenseKey: licenseKey });
          }, 800);
        }
      } else {
        let errorMessage = result.error || 'Erreur d\'enregistrement';
        // Handle specific backend error messages
        if (result.error?.includes('phone') || result.error?.includes('exists')) {
          errorMessage = 'Ce numéro de téléphone est déjà enregistré';
        } else if (result.error?.includes('password')) {
          errorMessage = 'Le mot de passe ne respecte pas les critères de sécurité';
        }
        console.log('❌ Registration failed:', errorMessage);
        setStatusMessage(errorMessage);
        setStatusType('error');
        showErrorToast(errorMessage);
      }
    } catch (error) {
      console.error('Registration error:', error);
      let errorMessage = error instanceof Error ? error.message : 'Échec de l\'enregistrement. Veuillez réessayer.';
      // Handle network errors
      if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch')) {
        errorMessage = 'Erreur réseau. Vérifiez votre connexion et réessayez.';
      }
      setStatusMessage(errorMessage);
      setStatusType('error');
      showErrorToast(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={R.safe}>
      <View style={R.root}>
        {/* ── Left brand panel — desktop only ───────────────── */}
        {isDesktop && (
          <View style={R.brandPanel}>
            <View style={R.brandCircle1} />
            <View style={R.brandCircle2} />
            <View style={R.brandContent}>
              <View style={R.brandLogo}>
                <Image source={require('../../assets/icon.png')} style={R.brandLogoImg} resizeMode="contain" />
              </View>
              <Text style={R.brandName}>KAT Management Systems</Text>
              <Text style={R.brandTagline}>
                Créez votre compte pour accéder au{'\n'}système de gestion
              </Text>
              <View style={R.brandDivider} />
              <View style={R.brandFeatures}>
                {[
                  { icon: 'shield-checkmark', text: 'Sécurité garantie' },
                  { icon: 'cloud-offline', text: 'Accès hors ligne' },
                  { icon: 'person-add', text: 'Inscription simple' },
                  { icon: 'checkmark-done', text: 'Accès immédiat' },
                ].map((f, i) => (
                  <View key={i} style={R.brandFeatureRow}>
                    <View style={R.brandFeatureIcon}>
                      <Ionicons name={f.icon as keyof typeof Ionicons.glyphMap} size={15} color="#FFF" />
                    </View>
                    <Text style={R.brandFeatureText}>{f.text}</Text>
                  </View>
                ))}
              </View>
              <View style={R.brandStepPill}>
                <Ionicons name="person-add-outline" size={12} color="rgba(255,255,255,0.75)" />
                <Text style={R.brandStepLabel}>Créer un compte</Text>
              </View>
            </View>
            <Text style={R.brandFooter}>© 2025 KAT Management Systems · RDC</Text>
          </View>
        )}

        {/* ── Right form side ───────────────────────────────── */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={R.formSide}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <Animated.View style={[R.formSideInner, { opacity: fadeAnim }]}>
            <ScrollView
              contentContainerStyle={R.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Mobile header with back button */}
              {!isDesktop && (
                <View style={R.mobileHeader}>
                  <TouchableOpacity style={R.mobileBackBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={18} color={colors.text} />
                  </TouchableOpacity>
                  <View style={R.mobileLogoBox}>
                    <Image source={require('../../assets/icon.png')} style={R.mobileLogoImg} resizeMode="contain" />
                  </View>
                  <Text style={R.mobileBrandName}>KAT Management</Text>
                </View>
              )}

              {/* Desktop back link */}
              {isDesktop && (
                <TouchableOpacity style={R.desktopBackBtn} onPress={() => navigation.goBack()}>
                  <Ionicons name="arrow-back" size={15} color={colors.textSecondary} />
                  <Text style={R.desktopBackText}>Retour à la connexion</Text>
                </TouchableOpacity>
              )}

              {/* Heading */}
              <Text style={R.pageTitle}>Créer un compte</Text>
              <Text style={R.pageDesc}>Remplissez le formulaire pour commencer</Text>

              {/* Alert */}
              {statusMessage ? (
                <View style={[R.alert, statusType === 'success' ? R.alertSuccess : R.alertError]}>
                  <Ionicons
                    name={statusType === 'success' ? 'checkmark-circle' : 'alert-circle'}
                    size={16}
                    color={statusType === 'success' ? '#059669' : colors.error}
                  />
                  <Text style={[R.alertText, { color: statusType === 'success' ? '#059669' : colors.error }]}>
                    {statusMessage}
                  </Text>
                </View>
              ) : null}

              {/* First name field */}
              <View style={R.fieldGroup}>
                <Text style={R.fieldLabel}>PRÉNOM</Text>
                <View style={R.inputBox}>
                  <Ionicons name="person-outline" size={18} color={colors.textSecondary} style={R.fieldIcon} />
                  <TextInput
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Jean"
                    placeholderTextColor={colors.textDisabled}
                    style={R.input}
                    autoCapitalize="words"
                    autoCorrect={false}
                    mode="flat"
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                    contentStyle={R.inputContent}
                  />
                </View>
              </View>

              {/* Last name field */}
              <View style={R.fieldGroup}>
                <Text style={R.fieldLabel}>NOM</Text>
                <View style={R.inputBox}>
                  <Ionicons name="person-outline" size={18} color={colors.textSecondary} style={R.fieldIcon} />
                  <TextInput
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Dupont"
                    placeholderTextColor={colors.textDisabled}
                    style={R.input}
                    autoCapitalize="words"
                    autoCorrect={false}
                    mode="flat"
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                    contentStyle={R.inputContent}
                  />
                </View>
              </View>

              {/* Phone field */}
              <View style={R.fieldGroup}>
                <Text style={R.fieldLabel}>NUMÉRO DE TÉLÉPHONE</Text>
                <View style={R.inputBox}>
                  <Ionicons name="call-outline" size={18} color={colors.textSecondary} style={R.fieldIcon} />
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+243123456789"
                    placeholderTextColor={colors.textDisabled}
                    style={R.input}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="phone-pad"
                    maxLength={20}
                    mode="flat"
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                    contentStyle={R.inputContent}
                  />
                </View>
              </View>

              {/* Password field */}
              <View style={R.fieldGroup}>
                <Text style={R.fieldLabel}>MOT DE PASSE</Text>
                <View style={R.inputBox}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} style={R.fieldIcon} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textDisabled}
                    style={R.input}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    mode="flat"
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                    contentStyle={R.inputContent}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={R.eyeBtn}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm password field */}
              <View style={R.fieldGroup}>
                <Text style={R.fieldLabel}>CONFIRMER LE MOT DE PASSE</Text>
                <View style={R.inputBox}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} style={R.fieldIcon} />
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textDisabled}
                    style={R.input}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    mode="flat"
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                    contentStyle={R.inputContent}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={R.eyeBtn}>
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Register button */}
              <TouchableOpacity
                style={[R.primaryBtn, (!firstName.trim() || !lastName.trim() || !phone.trim() || !password.trim() || !confirmPassword.trim() || isLoading) && R.primaryBtnDisabled]}
                onPress={handleRegister}
                disabled={!firstName.trim() || !lastName.trim() || !phone.trim() || !password.trim() || !confirmPassword.trim() || isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Text style={R.primaryBtnText}>Créer un Compte</Text>
                    <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.75)" />
                  </>
                )}
              </TouchableOpacity>

              {/* Login link */}
              <View style={R.authLinksRow}>
                <Text style={R.authLinkText}>Vous avez déjà un compte?</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={R.authLink}>Se connecter</Text>
                </TouchableOpacity>
              </View>

              {!isDesktop && (
                <Text style={R.footerText}>© 2025 KAT Management Systems · RDC</Text>
              )}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════
// FORGOT PASSWORD SCREEN
// ═══════════════════════════════════════════════════════════════

type ForgotPasswordStep = 'phone' | 'code' | 'password';

function ForgotPasswordScreen({ navigation }: any) {
  const [step, setStep] = useState<ForgotPasswordStep>('phone');
  const [phone, setPhone] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | ''>('');
  const [codeSent, setCodeSent] = useState(false);
  const [codeAttempts, setCodeAttempts] = useState(0);
  const [requestAttempts, setRequestAttempts] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { success: showSuccessToast, error: showErrorToast, info: showInfoToast } = useToast();

  const validatePhone = (phoneNumber: string): boolean => {
    const phoneRegex = /^[+]?[0-9]{1,15}$/;
    return phoneRegex.test(phoneNumber.replace(/[\s\-().]/g, ''));
  };

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const handleRequestReset = async () => {
    if (!phone.trim()) {
      setStatusMessage('Veuillez saisir votre numéro de téléphone');
      setStatusType('error');
      showErrorToast('Veuillez saisir votre numéro de téléphone');
      return;
    }

    if (!validatePhone(phone.trim())) {
      setStatusMessage('Format de numéro de téléphone invalide');
      setStatusType('error');
      showErrorToast('Format de numéro de téléphone invalide');
      return;
    }

    // Limit reset code requests to 3 per session
    if (requestAttempts >= 3) {
      setStatusMessage('Trop de demandes. Veuillez réessayer dans 15 minutes.');
      setStatusType('error');
      showErrorToast('Trop de demandes. Veuillez réessayer dans 15 minutes.');
      return;
    }

    setIsLoading(true);
    setStatusMessage('');
    showInfoToast('Envoi du code de réinitialisation...');

    try {
      const result = await ApiAuthService.getInstance().requestPasswordReset(phone.trim());

      if (result.success) {
        setStep('code');
        setCodeSent(true);
        setRequestAttempts(prev => prev + 1);
        setCodeAttempts(0);
        const successMessage = 'Code de réinitialisation envoyé à votre téléphone';
        setStatusMessage(successMessage);
        setStatusType('success');
        showSuccessToast(successMessage);
      } else {
        let errorMessage = result.error || 'Erreur lors de l\'envoi du code';
        // Check if phone number doesn't exist
        if (result.error?.includes('not found') || result.error?.includes('not exist')) {
          errorMessage = 'Ce numéro de téléphone n\'existe pas dans notre système';
        }
        setStatusMessage(errorMessage);
        setStatusType('error');
        showErrorToast(errorMessage);
      }
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : 'Erreur réseau';
      if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch')) {
        errorMessage = 'Erreur réseau. Vérifiez votre connexion et réessayez.';
      }
      setStatusMessage(errorMessage);
      setStatusType('error');
      showErrorToast(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!resetCode.trim()) {
      setStatusMessage('Veuillez saisir le code de réinitialisation');
      setStatusType('error');
      showErrorToast('Veuillez saisir le code de réinitialisation');
      return;
    }

    if (resetCode.length < 4) {
      setStatusMessage('Le code doit contenir au moins 4 caractères');
      setStatusType('error');
      showErrorToast('Le code doit contenir au moins 4 caractères');
      return;
    }

    // Limit verification attempts to 5
    if (codeAttempts >= 5) {
      setStatusMessage('Trop de tentatives. Veuillez demander un nouveau code.');
      setStatusType('error');
      showErrorToast('Trop de tentatives. Veuillez demander un nouveau code.');
      return;
    }

    setIsLoading(true);
    setStatusMessage('');
    showInfoToast('Vérification du code...');

    try {
      const result = await ApiAuthService.getInstance().verifyResetCode(phone.trim(), resetCode.trim());

      if (result.success) {
        setStep('password');
        setCodeAttempts(0);
        const successMessage = 'Code vérifié, créez un nouveau mot de passe';
        setStatusMessage(successMessage);
        setStatusType('success');
        showSuccessToast(successMessage);
      } else {
        let errorMessage = result.error || 'Code invalide';
        if (result.error?.includes('expired')) {
          errorMessage = 'Le code a expiré. Veuillez demander un nouveau code.';
        } else if (result.error?.includes('invalid')) {
          errorMessage = `Code invalide (tentative ${codeAttempts + 1}/5)`;
        }
        setCodeAttempts(prev => prev + 1);
        setStatusMessage(errorMessage);
        setStatusType('error');
        showErrorToast(errorMessage);
      }
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : 'Erreur réseau';
      if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch')) {
        errorMessage = 'Erreur réseau. Vérifiez votre connexion et réessayez.';
      }
      setStatusMessage(errorMessage);
      setStatusType('error');
      showErrorToast(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      setStatusMessage('Veuillez saisir un nouveau mot de passe');
      setStatusType('error');
      showErrorToast('Veuillez saisir un nouveau mot de passe');
      return;
    }

    if (newPassword.length < 8) {
      setStatusMessage('Le mot de passe doit contenir au moins 8 caractères');
      setStatusType('error');
      showErrorToast('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (!confirmPassword.trim()) {
      setStatusMessage('Veuillez confirmer le nouveau mot de passe');
      setStatusType('error');
      showErrorToast('Veuillez confirmer le nouveau mot de passe');
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatusMessage('Les mots de passe ne correspondent pas');
      setStatusType('error');
      showErrorToast('Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);
    setStatusMessage('');
    showInfoToast('Réinitialisation du mot de passe...');

    try {
      const result = await ApiAuthService.getInstance().resetPasswordWithCode(
        phone.trim(),
        resetCode.trim(),
        newPassword.trim()
      );

      if (result.success) {
        const successMessage = 'Mot de passe réinitialisé avec succès !';
        setStatusMessage(successMessage);
        setStatusType('success');
        showSuccessToast(successMessage);
        
        setTimeout(() => {
          navigation.navigate('Login');
        }, 1500);
      } else {
        let errorMessage = result.error || 'Erreur de réinitialisation';
        if (result.error?.includes('expired')) {
          errorMessage = 'Le code a expiré. Veuillez demander un nouveau code.';
        } else if (result.error?.includes('invalid')) {
          errorMessage = 'Code ou données invalides. Veuillez réessayer.';
        }
        setStatusMessage(errorMessage);
        setStatusType('error');
        showErrorToast(errorMessage);
      }
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : 'Erreur réseau';
      if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch')) {
        errorMessage = 'Erreur réseau. Vérifiez votre connexion et réessayez.';
      }
      setStatusMessage(errorMessage);
      setStatusType('error');
      showErrorToast(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 'phone':
        return (
          <>
            <Text style={FP.pageTitle}>Réinitialiser le mot de passe</Text>
            <Text style={FP.pageDesc}>Entrez votre numéro de téléphone pour recevoir un code</Text>

            {statusMessage ? (
              <View style={[FP.alert, statusType === 'success' ? FP.alertSuccess : FP.alertError]}>
                <Ionicons
                  name={statusType === 'success' ? 'checkmark-circle' : 'alert-circle'}
                  size={16}
                  color={statusType === 'success' ? '#059669' : colors.error}
                />
                <Text style={[FP.alertText, { color: statusType === 'success' ? '#059669' : colors.error }]}>
                  {statusMessage}
                </Text>
              </View>
            ) : null}

            <View style={FP.fieldGroup}>
              <Text style={FP.fieldLabel}>NUMÉRO DE TÉLÉPHONE</Text>
              <View style={FP.inputBox}>
                <Ionicons name="call-outline" size={18} color={colors.textSecondary} style={FP.fieldIcon} />
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+243123456789"
                  placeholderTextColor={colors.textDisabled}
                  style={FP.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="phone-pad"
                  maxLength={20}
                  mode="flat"
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                  contentStyle={FP.inputContent}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[FP.primaryBtn, (!phone.trim() || isLoading) && FP.primaryBtnDisabled]}
              onPress={handleRequestReset}
              disabled={!phone.trim() || isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Text style={FP.primaryBtnText}>Envoyer le Code</Text>
                  <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.75)" />
                </>
              )}
            </TouchableOpacity>
          </>
        );

      case 'code':
        return (
          <>
            <Text style={FP.pageTitle}>Vérifier le Code</Text>
            <Text style={FP.pageDesc}>Entrez le code reçu à {phone}</Text>

            {statusMessage ? (
              <View style={[FP.alert, statusType === 'success' ? FP.alertSuccess : FP.alertError]}>
                <Ionicons
                  name={statusType === 'success' ? 'checkmark-circle' : 'alert-circle'}
                  size={16}
                  color={statusType === 'success' ? '#059669' : colors.error}
                />
                <Text style={[FP.alertText, { color: statusType === 'success' ? '#059669' : colors.error }]}>
                  {statusMessage}
                </Text>
              </View>
            ) : null}

            <View style={FP.fieldGroup}>
              <Text style={FP.fieldLabel}>CODE DE RÉINITIALISATION</Text>
              <Text style={{ fontSize: 12, color: colors.textTertiary, marginBottom: 8 }}>
                Tentatives: {codeAttempts}/5
              </Text>
              <View style={FP.inputBox}>
                <Ionicons name="key-outline" size={18} color={colors.textSecondary} style={FP.fieldIcon} />
                <TextInput
                  value={resetCode}
                  onChangeText={setResetCode}
                  placeholder="000000"
                  placeholderTextColor={colors.textDisabled}
                  style={FP.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="number-pad"
                  maxLength={8}
                  mode="flat"
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                  contentStyle={FP.inputContent}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[FP.primaryBtn, (!resetCode.trim() || isLoading || codeAttempts >= 5) && FP.primaryBtnDisabled]}
              onPress={handleVerifyCode}
              disabled={!resetCode.trim() || isLoading || codeAttempts >= 5}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Text style={FP.primaryBtnText}>Vérifier le Code</Text>
                  <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.75)" />
                </>
              )}
            </TouchableOpacity>

            {codeSent && codeAttempts < 5 && (
              <TouchableOpacity onPress={handleRequestReset} style={FP.tertiaryBtn}>
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>Renvoyer le Code</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => { setStep('phone'); setStatusMessage(''); setCodeAttempts(0); }} style={FP.secondaryBtn}>
              <Text style={FP.secondaryBtnText}>Retour</Text>
            </TouchableOpacity>
          </>
        );

      case 'password':
        return (
          <>
            <Text style={FP.pageTitle}>Nouveau Mot de Passe</Text>
            <Text style={FP.pageDesc}>Créez un nouveau mot de passe sécurisé</Text>

            {statusMessage ? (
              <View style={[FP.alert, statusType === 'success' ? FP.alertSuccess : FP.alertError]}>
                <Ionicons
                  name={statusType === 'success' ? 'checkmark-circle' : 'alert-circle'}
                  size={16}
                  color={statusType === 'success' ? '#059669' : colors.error}
                />
                <Text style={[FP.alertText, { color: statusType === 'success' ? '#059669' : colors.error }]}>
                  {statusMessage}
                </Text>
              </View>
            ) : null}

            <View style={FP.fieldGroup}>
              <Text style={FP.fieldLabel}>NOUVEAU MOT DE PASSE</Text>
              <View style={FP.inputBox}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} style={FP.fieldIcon} />
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textDisabled}
                  style={FP.input}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  mode="flat"
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                  contentStyle={FP.inputContent}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={FP.eyeBtn}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={FP.fieldGroup}>
              <Text style={FP.fieldLabel}>CONFIRMER LE MOT DE PASSE</Text>
              <View style={FP.inputBox}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} style={FP.fieldIcon} />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textDisabled}
                  style={FP.input}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  mode="flat"
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                  contentStyle={FP.inputContent}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={FP.eyeBtn}>
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[FP.primaryBtn, (!newPassword.trim() || !confirmPassword.trim() || isLoading) && FP.primaryBtnDisabled]}
              onPress={handleResetPassword}
              disabled={!newPassword.trim() || !confirmPassword.trim() || isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Text style={FP.primaryBtnText}>Réinitialiser le Mot de Passe</Text>
                  <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.75)" />
                </>
              )}
            </TouchableOpacity>
          </>
        );
    }
  };

  return (
    <SafeAreaView style={FP.safe}>
      <View style={FP.root}>
        {/* ── Left brand panel — desktop only ───────────────── */}
        {isDesktop && (
          <View style={FP.brandPanel}>
            <View style={FP.brandCircle1} />
            <View style={FP.brandCircle2} />
            <View style={FP.brandContent}>
              <View style={FP.brandLogo}>
                <Image source={require('../../assets/icon.png')} style={FP.brandLogoImg} resizeMode="contain" />
              </View>
              <Text style={FP.brandName}>KAT Management Systems</Text>
              <Text style={FP.brandTagline}>
                Réinitialisez votre mot de{'\n'}passe en toute sécurité
              </Text>
              <View style={FP.brandDivider} />
              <View style={FP.brandFeatures}>
                {[
                  { icon: 'shield-checkmark', text: 'Processus sécurisé' },
                  { icon: 'key', text: 'Code de vérification' },
                  { icon: 'lock-closed', text: 'Nouveau mot de passe' },
                  { icon: 'checkmark-done', text: 'Accès restauré' },
                ].map((f, i) => (
                  <View key={i} style={FP.brandFeatureRow}>
                    <View style={FP.brandFeatureIcon}>
                      <Ionicons name={f.icon as keyof typeof Ionicons.glyphMap} size={15} color="#FFF" />
                    </View>
                    <Text style={FP.brandFeatureText}>{f.text}</Text>
                  </View>
                ))}
              </View>
              <View style={FP.brandStepPill}>
                <Ionicons name="key-outline" size={12} color="rgba(255,255,255,0.75)" />
                <Text style={FP.brandStepLabel}>Réinitialisation Sécurisée</Text>
              </View>
            </View>
            <Text style={FP.brandFooter}>© 2025 KAT Management Systems · RDC</Text>
          </View>
        )}

        {/* ── Right form side ───────────────────────────────── */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={FP.formSide}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <Animated.View style={[FP.formSideInner, { opacity: fadeAnim }]}>
            <ScrollView
              contentContainerStyle={FP.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Mobile header with back button */}
              {!isDesktop && (
                <View style={FP.mobileHeader}>
                  <TouchableOpacity style={FP.mobileBackBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={18} color={colors.text} />
                  </TouchableOpacity>
                  <View style={FP.mobileLogoBox}>
                    <Image source={require('../../assets/icon.png')} style={FP.mobileLogoImg} resizeMode="contain" />
                  </View>
                  <Text style={FP.mobileBrandName}>KAT Management</Text>
                </View>
              )}

              {/* Desktop back link */}
              {isDesktop && (
                <TouchableOpacity style={FP.desktopBackBtn} onPress={() => navigation.goBack()}>
                  <Ionicons name="arrow-back" size={15} color={colors.textSecondary} />
                  <Text style={FP.desktopBackText}>Retour à la connexion</Text>
                </TouchableOpacity>
              )}

              {/* Step indicator */}
              <View style={FP.stepRow}>
                {[
                  { label: 'Téléphone', stepName: 'phone' as const },
                  { label: 'Code', stepName: 'code' as const },
                  { label: 'Mot de passe', stepName: 'password' as const },
                ].map((s, i) => {
                  const steps: ForgotPasswordStep[] = ['phone', 'code', 'password'];
                  const currentIndex = steps.indexOf(step);
                  const stepIndex = steps.indexOf(s.stepName);
                  const isActive = stepIndex === currentIndex;
                  const isDone = stepIndex < currentIndex;
                  
                  return (
                    <React.Fragment key={i}>
                      <View style={FP.stepItem}>
                        <View style={[
                          FP.stepBubble,
                          isDone ? FP.stepBubbleDone : isActive ? FP.stepBubbleActive : FP.stepBubbleInactive,
                        ]}>
                          {isDone
                            ? <Ionicons name="checkmark" size={13} color="#FFF" />
                            : <Text style={[FP.stepNum, isActive && FP.stepNumActive]}>{i + 1}</Text>
                          }
                        </View>
                        <Text style={[
                          FP.stepLabel,
                          isDone && FP.stepLabelDone,
                          isActive && FP.stepLabelActive,
                        ]}>
                          {s.label}
                        </Text>
                      </View>
                      {i < 2 && (
                        <View style={[FP.stepConnector, isDone && FP.stepConnectorDone]} />
                      )}
                    </React.Fragment>
                  );
                })}
              </View>

              {renderStepContent()}

              <View style={FP.authLinksRow}>
                <Text style={FP.authLinkText}>Vous avez un compte?</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={FP.authLink}>Se connecter</Text>
                </TouchableOpacity>
              </View>

              {!isDesktop && (
                <Text style={FP.footerText}>© 2025 KAT Management Systems · RDC</Text>
              )}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

// ── Login screen style tokens ───────────────────────────────────────────────
const L = StyleSheet.create({
  // Layout
  safe: { flex: 1, backgroundColor: colors.background, ...Platform.select({ web: { height: SCREEN_H } as any, default: {} }) },
  root: { flex: 1, flexDirection: isDesktop ? 'row' : 'column', ...Platform.select({ web: { overflow: 'hidden' } as any, default: {} }) },

  // Brand panel (shared with activation, step 2 variant)
  brandPanel: {
    width: '38%',
    backgroundColor: colors.primary,
    overflow: 'hidden',
    position: 'relative',
  },
  brandCircle1: {
    position: 'absolute', top: -100, right: -80,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  brandCircle2: {
    position: 'absolute', bottom: -80, left: -60,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(91,101,220,0.22)',
  },
  brandContent: { flex: 1, padding: isDesktop ? 36 : 28, justifyContent: 'center', zIndex: 1 },
  brandLogo: {
    width: 60, height: 60, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18,
    overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  brandLogoImg: { width: 50, height: 50 },
  brandName: { fontSize: isDesktop ? 22 : 20, fontWeight: '800', color: '#FFF', letterSpacing: -0.3, marginBottom: 8 },
  brandTagline: { fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 20, marginBottom: 20 },
  brandDivider: { width: 44, height: 3, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 2, marginBottom: 18 },
  brandFeatures: { gap: 12 },
  brandFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandFeatureIcon: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center', justifyContent: 'center',
  },
  brandFeatureText: { fontSize: 13, color: 'rgba(255,255,255,0.82)', fontWeight: '500' },
  orgBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7,
    alignSelf: 'flex-start',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  orgBadgeText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  brandStepPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7,
    alignSelf: 'flex-start',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  brandStepLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)', letterSpacing: 0.3 },
  brandFooter: { position: 'absolute', bottom: 16, left: 36, fontSize: 11, color: 'rgba(255,255,255,0.35)' },

  // Form side
  formSide: { flex: 1, backgroundColor: colors.background },
  formSideInner: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: isDesktop ? 48 : (isTablet ? 36 : 20),
    paddingTop: isDesktop ? 36 : 20,
    paddingBottom: isDesktop ? 24 : 40,
    maxWidth: isDesktop ? 520 : undefined,
    width: '100%',
    alignSelf: isDesktop ? 'center' : undefined,
  },

  // Mobile header
  mobileHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 16, marginTop: 4,
  },
  mobileBackBtn: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 4,
  },
  mobileLogoBox: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    ...shadows.sm,
  },
  mobileLogoImg: { width: 32, height: 32 },
  mobileBrandName: { fontSize: isTablet ? 16 : 14, fontWeight: '700', color: colors.text },

  // Desktop back link
  desktopBackBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 20, alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  desktopBackText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },

  // Step indicator
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: isDesktop ? 18 : 28 },
  stepItem: { alignItems: 'center', gap: 5 },
  stepBubble: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBubbleDone: { backgroundColor: colors.primary },
  stepBubbleActive: { backgroundColor: colors.primary },
  stepBubbleInactive: { backgroundColor: colors.surfaceVariant, borderWidth: 1, borderColor: colors.outline },
  stepNum: { fontSize: 12, fontWeight: '700', color: colors.textTertiary },
  stepNumActive: { color: '#FFF' },
  stepLabel: { fontSize: 11, fontWeight: '500', color: colors.textTertiary },
  stepLabelDone: { color: colors.textSecondary, fontWeight: '600' },
  stepLabelActive: { color: colors.primary, fontWeight: '700' },
  stepConnector: { flex: 1, height: 2, backgroundColor: colors.outline, marginHorizontal: 8, marginBottom: 18 },
  stepConnectorDone: { backgroundColor: colors.primary },

  // Org badge mobile
  orgBadgeMobile: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: colors.surface,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.outline,
    alignSelf: 'flex-start', marginBottom: 20,
  },
  orgBadgeMobileText: { fontSize: 13, fontWeight: '600', color: colors.text },

  // Page heading
  pageTitle: {
    fontSize: isDesktop ? 24 : 22,
    fontWeight: '800', color: colors.text,
    letterSpacing: -0.5, marginBottom: 6,
  },
  pageDesc: { fontSize: 14, color: colors.textSecondary, lineHeight: 21, marginBottom: isDesktop ? 14 : 22 },

  // Alert
  alert: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 10, marginBottom: 20, borderWidth: 1,
  },
  alertSuccess: { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' },
  alertError: { backgroundColor: '#FFF5F5', borderColor: '#FECACA' },
  alertText: { fontSize: 13, fontWeight: '500', flex: 1, lineHeight: 18 },

  // Input fields
  fieldGroup: { marginBottom: isDesktop ? 12 : 18 },
  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textTertiary,
    letterSpacing: 1.1, marginBottom: 6, textTransform: 'uppercase',
  },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12, borderWidth: 1.5, borderColor: colors.outline,
    paddingHorizontal: 14, minHeight: isDesktop ? 46 : 52,
    ...shadows.sm,
  },
  fieldIcon: { marginRight: 10 },
  input: { flex: 1, backgroundColor: 'transparent', height: isDesktop ? 46 : 52, fontSize: 15, color: colors.text },
  inputContent: { backgroundColor: 'transparent', paddingHorizontal: 0 },
  eyeBtn: { paddingLeft: 10, paddingVertical: 6 },

  // Primary button
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.primary,
    borderRadius: 12, paddingVertical: isDesktop ? 13 : 16, paddingHorizontal: 20,
    marginTop: 4, marginBottom: isDesktop ? 12 : 18,
    ...shadows.md,
  },
  primaryBtnDisabled: { opacity: 0.42 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },

  // Demo credentials box
  demoBox: {
    backgroundColor: colors.secondary + '0A',
    borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: colors.secondary + '20',
    marginBottom: isDesktop ? 10 : 16,
  },
  demoHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  demoTitle: { fontSize: 12, fontWeight: '700', color: colors.secondary },
  demoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 4,
  },
  demoKey: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  demoVal: {
    fontSize: 12, color: colors.text, fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
  },

  // Auth links
  authLinksRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 0,
    marginTop: isDesktop ? 10 : 16,
    paddingVertical: 12, paddingHorizontal: 0,
  },
  authLink: {
    fontSize: 13, fontWeight: '600', color: colors.primary,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  authLinkDivider: {
    width: 1, height: 18,
    backgroundColor: colors.outline, marginHorizontal: 0,
  },

  // Footer
  footerText: { fontSize: 11, color: colors.textTertiary, textAlign: 'center', paddingTop: 4 },
});
// ---------------------------------------------------------------
// REGISTER SCREEN STYLES
// ---------------------------------------------------------------
const R = StyleSheet.create({
  // Layout
  safe: { flex: 1, backgroundColor: colors.background, ...Platform.select({ web: { height: SCREEN_H } as any, default: {} }) },
  root: { flex: 1, flexDirection: isDesktop ? 'row' : 'column', ...Platform.select({ web: { overflow: 'hidden' } as any, default: {} }) },
  brandPanel: { width: '38%', backgroundColor: colors.primary, overflow: 'hidden', position: 'relative' },
  brandCircle1: { position: 'absolute', top: -100, right: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,255,255,0.06)' },
  brandCircle2: { position: 'absolute', bottom: -80, left: -60, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(91,101,220,0.22)' },
  brandContent: { flex: 1, padding: isDesktop ? 36 : 28, justifyContent: 'center', zIndex: 1 },
  brandLogo: { width: 60, height: 60, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.13)', alignItems: 'center', justifyContent: 'center', marginBottom: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  brandLogoImg: { width: 50, height: 50 },
  brandName: { fontSize: isDesktop ? 22 : 20, fontWeight: '800', color: '#FFF', letterSpacing: -0.3, marginBottom: 8 },
  brandTagline: { fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 20, marginBottom: 20 },
  brandDivider: { width: 44, height: 3, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 2, marginBottom: 18 },
  brandFeatures: { gap: 12 },
  brandFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandFeatureIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.13)', alignItems: 'center', justifyContent: 'center' },
  brandFeatureText: { fontSize: 13, color: 'rgba(255,255,255,0.82)', fontWeight: '500' },
  brandStepPill: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  brandStepLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)', letterSpacing: 0.3 },
  brandFooter: { position: 'absolute', bottom: 16, left: 36, fontSize: 11, color: 'rgba(255,255,255,0.35)' },
  formSide: { flex: 1, backgroundColor: colors.background },
  formSideInner: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: isDesktop ? 48 : (isTablet ? 36 : 20), paddingTop: isDesktop ? 36 : 20, paddingBottom: isDesktop ? 24 : 40, maxWidth: isDesktop ? 520 : undefined, width: '100%', alignSelf: isDesktop ? 'center' : undefined },
  mobileHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, marginTop: 4 },
  mobileBackBtn: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.surfaceVariant, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  mobileLogoBox: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...shadows.sm },
  mobileLogoImg: { width: 32, height: 32 },
  mobileBrandName: { fontSize: isTablet ? 16 : 14, fontWeight: '700', color: colors.text },
  desktopBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20, alignSelf: 'flex-start', paddingVertical: 4 },
  desktopBackText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  pageTitle: { fontSize: isDesktop ? 24 : 22, fontWeight: '800', color: colors.text, letterSpacing: -0.5, marginBottom: 6 },
  pageDesc: { fontSize: 14, color: colors.textSecondary, lineHeight: 21, marginBottom: isDesktop ? 14 : 22 },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 10, marginBottom: 20, borderWidth: 1 },
  alertSuccess: { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' },
  alertError: { backgroundColor: '#FFF5F5', borderColor: '#FECACA' },
  alertText: { fontSize: 13, fontWeight: '500', flex: 1, lineHeight: 18 },
  fieldGroup: { marginBottom: isDesktop ? 12 : 18 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: colors.textTertiary, letterSpacing: 1.1, marginBottom: 6, textTransform: 'uppercase' },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1.5, borderColor: colors.outline, paddingHorizontal: 14, minHeight: isDesktop ? 46 : 52, ...shadows.sm },
  fieldIcon: { marginRight: 10 },
  input: { flex: 1, backgroundColor: 'transparent', height: isDesktop ? 46 : 52, fontSize: 15, color: colors.text },
  inputContent: { backgroundColor: 'transparent', paddingHorizontal: 0 },
  eyeBtn: { paddingLeft: 10, paddingVertical: 6 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: isDesktop ? 13 : 16, paddingHorizontal: 20, marginTop: 4, marginBottom: isDesktop ? 12 : 18, ...shadows.md },
  primaryBtnDisabled: { opacity: 0.42 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  authLinksRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: isDesktop ? 8 : 12 },
  authLinkText: { fontSize: 13, color: colors.textSecondary },
  authLink: { fontSize: 13, fontWeight: '600', color: colors.primary },
  footerText: { fontSize: 11, color: colors.textTertiary, textAlign: 'center', paddingTop: 4 },
});

// ---------------------------------------------------------------
// FORGOTTEN PASSWORD SCREEN STYLES
// ---------------------------------------------------------------
const FP = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background, ...Platform.select({ web: { height: SCREEN_H } as any, default: {} }) },
  root: { flex: 1, flexDirection: isDesktop ? 'row' : 'column', ...Platform.select({ web: { overflow: 'hidden' } as any, default: {} }) },
  brandPanel: { width: '38%', backgroundColor: colors.primary, overflow: 'hidden', position: 'relative' },
  brandCircle1: { position: 'absolute', top: -100, right: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,255,255,0.06)' },
  brandCircle2: { position: 'absolute', bottom: -80, left: -60, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(91,101,220,0.22)' },
  brandContent: { flex: 1, padding: isDesktop ? 36 : 28, justifyContent: 'center', zIndex: 1 },
  brandLogo: { width: 60, height: 60, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.13)', alignItems: 'center', justifyContent: 'center', marginBottom: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  brandLogoImg: { width: 50, height: 50 },
  brandName: { fontSize: isDesktop ? 22 : 20, fontWeight: '800', color: '#FFF', letterSpacing: -0.3, marginBottom: 8 },
  brandTagline: { fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 20, marginBottom: 20 },
  brandDivider: { width: 44, height: 3, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 2, marginBottom: 18 },
  brandFeatures: { gap: 12 },
  brandFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandFeatureIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.13)', alignItems: 'center', justifyContent: 'center' },
  brandFeatureText: { fontSize: 13, color: 'rgba(255,255,255,0.82)', fontWeight: '500' },
  brandStepPill: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  brandStepLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)', letterSpacing: 0.3 },
  brandFooter: { position: 'absolute', bottom: 16, left: 36, fontSize: 11, color: 'rgba(255,255,255,0.35)' },
  formSide: { flex: 1, backgroundColor: colors.background },
  formSideInner: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: isDesktop ? 48 : (isTablet ? 36 : 20), paddingTop: isDesktop ? 36 : 20, paddingBottom: isDesktop ? 24 : 40, maxWidth: isDesktop ? 520 : undefined, width: '100%', alignSelf: isDesktop ? 'center' : undefined },
  mobileHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, marginTop: 4 },
  mobileBackBtn: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.surfaceVariant, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  mobileLogoBox: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...shadows.sm },
  mobileLogoImg: { width: 32, height: 32 },
  mobileBrandName: { fontSize: isTablet ? 16 : 14, fontWeight: '700', color: colors.text },
  desktopBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20, alignSelf: 'flex-start', paddingVertical: 4 },
  desktopBackText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: isDesktop ? 18 : 28 },
  stepItem: { alignItems: 'center', gap: 5 },
  stepBubble: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepBubbleDone: { backgroundColor: colors.primary },
  stepBubbleActive: { backgroundColor: colors.primary },
  stepBubbleInactive: { backgroundColor: colors.surfaceVariant, borderWidth: 1, borderColor: colors.outline },
  stepNum: { fontSize: 12, fontWeight: '700', color: colors.textTertiary },
  stepNumActive: { color: '#FFF' },
  stepLabel: { fontSize: 11, fontWeight: '500', color: colors.textTertiary },
  stepLabelDone: { color: colors.textSecondary, fontWeight: '600' },
  stepLabelActive: { color: colors.primary, fontWeight: '700' },
  stepConnector: { flex: 1, height: 2, backgroundColor: colors.outline, marginHorizontal: 8, marginBottom: 18 },
  stepConnectorDone: { backgroundColor: colors.primary },
  pageTitle: { fontSize: isDesktop ? 24 : 22, fontWeight: '800', color: colors.text, letterSpacing: -0.5, marginBottom: 6 },
  pageDesc: { fontSize: 14, color: colors.textSecondary, lineHeight: 21, marginBottom: isDesktop ? 14 : 22 },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 10, marginBottom: 20, borderWidth: 1 },
  alertSuccess: { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' },
  alertError: { backgroundColor: '#FFF5F5', borderColor: '#FECACA' },
  alertText: { fontSize: 13, fontWeight: '500', flex: 1, lineHeight: 18 },
  fieldGroup: { marginBottom: isDesktop ? 12 : 18 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: colors.textTertiary, letterSpacing: 1.1, marginBottom: 6, textTransform: 'uppercase' },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1.5, borderColor: colors.outline, paddingHorizontal: 14, minHeight: isDesktop ? 46 : 52, ...shadows.sm },
  fieldIcon: { marginRight: 10 },
  input: { flex: 1, backgroundColor: 'transparent', height: isDesktop ? 46 : 52, fontSize: 15, color: colors.text },
  inputContent: { backgroundColor: 'transparent', paddingHorizontal: 0 },
  eyeBtn: { paddingLeft: 10, paddingVertical: 6 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: isDesktop ? 13 : 16, paddingHorizontal: 20, marginTop: 4, marginBottom: isDesktop ? 12 : 18, ...shadows.md },
  primaryBtnDisabled: { opacity: 0.42 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: 12, paddingVertical: isDesktop ? 11 : 14, paddingHorizontal: 20, marginBottom: isDesktop ? 12 : 18, borderWidth: 1.5, borderColor: colors.outline, ...shadows.sm },
  secondaryBtnText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  tertiaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20, marginBottom: isDesktop ? 8 : 14 },
  authLinksRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: isDesktop ? 8 : 12 },
  authLinkText: { fontSize: 13, color: colors.textSecondary },
  authLink: { fontSize: 13, fontWeight: '600', color: colors.primary },
  footerText: { fontSize: 11, color: colors.textTertiary, textAlign: 'center', paddingTop: 4 },
});
