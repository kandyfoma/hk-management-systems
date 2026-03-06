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
          <Ionicons name="medical" size={36} color="#FFF" />
        </View>
        <Text style={A.loadingTitle}>KAT Santé</Text>
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
                <Ionicons name="medical" size={34} color="#FFF" />
              </View>
              <Text style={A.brandName}>KAT Santé</Text>
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
                    <Ionicons name="medical" size={22} color="#FFF" />
                  </View>
                  <View>
                    <Text style={A.mobileBrandName}>KAT Santé</Text>
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
                <Text style={A.footerText}>© 2025 KAT Management Systems · RDC</Text>
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
  safe: { flex: 1, backgroundColor: colors.background },
  root: { flex: 1, flexDirection: isDesktop ? 'row' : 'column' },

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
    ...shadows.lg,
  },
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
    flex: 1, padding: 48, justifyContent: 'center', zIndex: 1,
  },
  brandLogo: {
    width: 68, height: 68, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  brandName: {
    fontSize: 34, fontWeight: '800', color: '#FFF',
    letterSpacing: -0.5, marginBottom: 10,
  },
  brandTagline: {
    fontSize: 15, color: 'rgba(255,255,255,0.65)',
    lineHeight: 23, marginBottom: 36,
  },
  brandDivider: {
    width: 44, height: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2, marginBottom: 32,
  },
  brandFeatures: { gap: 18 },
  brandFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  brandFeatureIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center', justifyContent: 'center',
  },
  brandFeatureText: { fontSize: 14, color: 'rgba(255,255,255,0.82)', fontWeight: '500' },
  brandStepPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 44,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9,
    alignSelf: 'flex-start',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  brandStepLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)', letterSpacing: 0.3 },
  brandFooter: {
    position: 'absolute', bottom: 24, left: 48,
    fontSize: 11, color: 'rgba(255,255,255,0.35)',
  },

  // Form side
  formSide: { flex: 1, backgroundColor: colors.background },
  formSideInner: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: isDesktop ? 56 : (isTablet ? 36 : 20),
    paddingTop: isDesktop ? 56 : 24,
    paddingBottom: 40,
    maxWidth: isDesktop ? 520 : undefined,
    width: '100%',
    alignSelf: isDesktop ? 'center' : undefined,
  },

  // Mobile header
  mobileHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 28, marginTop: 4,
  },
  mobileLogoBox: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  mobileBrandName: { fontSize: 18, fontWeight: '700', color: colors.text },
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
    fontSize: isDesktop ? 28 : 22,
    fontWeight: '800', color: colors.text,
    letterSpacing: -0.5, marginBottom: 8,
  },
  pageDesc: {
    fontSize: 14, color: colors.textSecondary,
    lineHeight: 21, marginBottom: 28,
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
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28,
  },
  licenseCard: {
    flex: 1, minWidth: isDesktop ? 140 : 120,
    backgroundColor: colors.surface,
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.outline,
    ...shadows.sm,
  },
  licenseIconBox: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  licenseCardTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 2 },
  licenseCardDesc: { fontSize: 11, color: colors.textSecondary, lineHeight: 15 },

  // Key input
  keyInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12, borderWidth: 1.5, borderColor: colors.outline,
    paddingHorizontal: 14, marginBottom: 20, minHeight: 56,
    ...shadows.sm,
  },
  keyInput: { flex: 1, backgroundColor: 'transparent', height: 56, fontSize: 15 },
  keyInputContent: {
    backgroundColor: 'transparent', paddingHorizontal: 0,
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier', letterSpacing: 2,
  },

  // Primary button
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.primary,
    borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20,
    marginBottom: 24,
    ...shadows.md,
  },
  primaryBtnDisabled: { opacity: 0.42 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },

  // Trust chips
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28 },
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
                <Ionicons name="medical" size={34} color="#FFF" />
              </View>
              <Text style={L.brandName}>KAT Santé</Text>
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
                    <Ionicons name="medical" size={20} color="#FFF" />
                  </View>
                  <Text style={L.mobileBrandName}>KAT Santé</Text>
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

              {/* Demo credentials */}
              <View style={L.demoBox}>
                <View style={L.demoHeader}>
                  <Ionicons name="flask-outline" size={14} color={colors.secondary} />
                  <Text style={L.demoTitle}>Identifiants de démonstration</Text>
                </View>
                <View style={L.demoRow}>
                  <Text style={L.demoKey}>Téléphone</Text>
                  <Text style={L.demoVal}>+243123456789</Text>
                </View>
                <View style={L.demoRow}>
                  <Text style={L.demoKey}>Mot de passe</Text>
                  <Text style={L.demoVal}>adminadmin</Text>
                </View>
              </View>

              {!isDesktop && (
                <Text style={L.footerText}>© 2025 KAT Management Systems</Text>
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
  safe: { flex: 1, backgroundColor: colors.background },
  root: { flex: 1, flexDirection: isDesktop ? 'row' : 'column' },

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
  brandContent: { flex: 1, padding: 48, justifyContent: 'center', zIndex: 1 },
  brandLogo: {
    width: 68, height: 68, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  brandName: { fontSize: 34, fontWeight: '800', color: '#FFF', letterSpacing: -0.5, marginBottom: 10 },
  brandTagline: { fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 23, marginBottom: 36 },
  brandDivider: {
    width: 44, height: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2, marginBottom: 32,
  },
  brandFeatures: { gap: 18 },
  brandFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  brandFeatureIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center', justifyContent: 'center',
  },
  brandFeatureText: { fontSize: 14, color: 'rgba(255,255,255,0.82)', fontWeight: '500' },
  orgBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    alignSelf: 'flex-start',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  orgBadgeText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  brandStepPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9,
    alignSelf: 'flex-start',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  brandStepLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)', letterSpacing: 0.3 },
  brandFooter: {
    position: 'absolute', bottom: 24, left: 48,
    fontSize: 11, color: 'rgba(255,255,255,0.35)',
  },

  // Form side
  formSide: { flex: 1, backgroundColor: colors.background },
  formSideInner: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: isDesktop ? 56 : (isTablet ? 36 : 20),
    paddingTop: isDesktop ? 52 : 20,
    paddingBottom: 40,
    maxWidth: isDesktop ? 520 : undefined,
    width: '100%',
    alignSelf: isDesktop ? 'center' : undefined,
  },

  // Mobile header
  mobileHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 24, marginTop: 4,
  },
  mobileBackBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 4,
  },
  mobileLogoBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  mobileBrandName: { fontSize: 17, fontWeight: '700', color: colors.text },

  // Desktop back link
  desktopBackBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 32, alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  desktopBackText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },

  // Step indicator
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 36 },
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
    fontSize: isDesktop ? 28 : 22,
    fontWeight: '800', color: colors.text,
    letterSpacing: -0.5, marginBottom: 8,
  },
  pageDesc: { fontSize: 14, color: colors.textSecondary, lineHeight: 21, marginBottom: 28 },

  // Alert
  alert: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 10, marginBottom: 20, borderWidth: 1,
  },
  alertSuccess: { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' },
  alertError: { backgroundColor: '#FFF5F5', borderColor: '#FECACA' },
  alertText: { fontSize: 13, fontWeight: '500', flex: 1, lineHeight: 18 },

  // Input fields
  fieldGroup: { marginBottom: 18 },
  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textTertiary,
    letterSpacing: 1.1, marginBottom: 8, textTransform: 'uppercase',
  },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12, borderWidth: 1.5, borderColor: colors.outline,
    paddingHorizontal: 14, minHeight: 52,
    ...shadows.sm,
  },
  fieldIcon: { marginRight: 10 },
  input: { flex: 1, backgroundColor: 'transparent', height: 52, fontSize: 15, color: colors.text },
  inputContent: { backgroundColor: 'transparent', paddingHorizontal: 0 },
  eyeBtn: { paddingLeft: 10, paddingVertical: 6 },

  // Primary button
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.primary,
    borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20,
    marginTop: 4, marginBottom: 20,
    ...shadows.md,
  },
  primaryBtnDisabled: { opacity: 0.42 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },

  // Demo credentials box
  demoBox: {
    backgroundColor: colors.secondary + '0A',
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.secondary + '20',
    marginBottom: 20,
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

  // Footer
  footerText: { fontSize: 11, color: colors.textTertiary, textAlign: 'center', paddingTop: 4 },
});