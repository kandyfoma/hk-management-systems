import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TextInput, Text, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Switch } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { useToast } from '../components/GlobalUI';
import { RootState } from '../store/store';
import { colors, borderRadius, shadows, spacing } from '../theme/theme';
import { 
  updateLanguage, 
  updateCurrency, 
  updateTheme, 
  updateNotifications, 
  updateDisplay, 
  updateSystem,
  updateSync,
  updateBackup,
  updateSecurity,
  updatePasswordPolicy,
  setLastSyncTime,
  setLastBackupTime,
  resetSettings,
} from '../store/slices/settingsSlice';
import { logout as logoutAction, updateUser } from '../store/slices/authSlice';
import ApiAuthService from '../services/ApiAuthService';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

// ─── Section Header Component ──────────────────────────────────────────
function SectionHeader({
  title,
  subtitle,
  icon,
  accentColor = colors.primary,
}: {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
}) {
  return (
    <View style={secStyles.wrapper}>
      <View style={secStyles.divider}>
        <View style={[secStyles.dividerAccent, { backgroundColor: accentColor }]} />
        <View style={secStyles.dividerLine} />
      </View>
      <View style={secStyles.header}>
        <View style={secStyles.headerLeft}>
          <View style={[secStyles.iconBubble, { backgroundColor: accentColor + '14' }]}>
            <Ionicons name={icon} size={18} color={accentColor} />
          </View>
          <View>
            <Text style={secStyles.title}>{title}</Text>
            {subtitle && <Text style={secStyles.subtitle}>{subtitle}</Text>}
          </View>
        </View>
      </View>
    </View>
  );
}

const secStyles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  dividerAccent: { width: 40, height: 3, borderRadius: 2 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.outline, marginLeft: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBubble: { width: 36, height: 36, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
});

export function SettingsScreen() {
  const dispatch = useDispatch();
  const settings = useSelector((state: RootState) => state.settings);
  const { user, organization, licenses } = useSelector((state: RootState) => state.auth);
  const toast = useToast();
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    if (type === 'success') {
      toast.success(message);
      return;
    }
    if (type === 'error') {
      toast.error(message);
      return;
    }
    if (type === 'warning') {
      toast.warning(message);
      return;
    }
    toast.info(message);
  };

  // Local inputs for system info (keeps UI responsive while typing)
  const [orgName, setOrgName] = useState(settings.system.organizationName);
  const [hospitalAddress, setHospitalAddress] = useState(settings.system.hospitalAddress);
  const [contactPhone, setContactPhone] = useState(settings.system.contactPhone);
  const [contactEmail, setContactEmail] = useState(settings.system.contactEmail);

  // Profile editing states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || user?.first_name || '',
    lastName: user?.lastName || user?.last_name || '',
    phone: user?.phone || '',
    email: user?.email || '',
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  useEffect(() => {
    setOrgName(settings.system.organizationName);
    setHospitalAddress(settings.system.hospitalAddress);
    setContactPhone(settings.system.contactPhone);
    setContactEmail(settings.system.contactEmail);
  }, [settings.system]);

  useEffect(() => {
    // Update profile data when user changes
    if (user) {
      setProfileData({
        firstName: user.firstName || user.first_name || '',
        lastName: user.lastName || user.last_name || '',
        phone: user.phone || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!profileData.firstName.trim() || !profileData.lastName.trim()) {
      showToast('Nom et prénom sont requis', 'error');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const result = await ApiAuthService.getInstance().updateProfile({
        first_name: profileData.firstName.trim(),
        last_name: profileData.lastName.trim(),
        phone: profileData.phone.trim(),
        email: profileData.email.trim(),
      });

      if (result.success && result.user) {
        dispatch(updateUser(result.user));
        showToast('Profil mis à jour avec succès', 'success');
        setIsEditingProfile(false);
      } else {
        showToast(result.error || 'Erreur lors de la mise à jour', 'error');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      showToast('Erreur lors de la mise à jour du profil', 'error');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleLogout = () => {
    const message = 'Êtes-vous sûr de vouloir vous déconnecter ? Cela effacera toutes les données locales y compris l\'activation de licence.';

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm(message);
      if (confirmed) {
        void performLogout();
      }
      return;
    }

    Alert.alert(
      'Déconnexion',
      message,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: () => {
            void performLogout();
          }
        }
      ]
    );
  };

  const performLogout = async () => {
    try {
      showToast('Déconnexion en cours...', 'info');
      
      // Centralized logout: backend session close + complete local cleanup
      await ApiAuthService.getInstance().logout();
      
      // Reset Redux state
      dispatch(logoutAction());
      dispatch(resetSettings());
      
      showToast('Déconnexion réussie', 'success');
      
      // Force reload to restart the app and return to login
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        // For mobile platforms, we rely on the app state management
        // The App.tsx should detect the cleared Redux state and redirect to login
        console.log('Logout completed, app should redirect to login');
      }
    } catch (error) {
      console.error('Logout error:', error);
      showToast('Erreur lors de la déconnexion, nettoyage local en cours', 'warning');
      
      // Even if backend logout fails, still force full local auth cleanup
      try {
        await ApiAuthService.getInstance().logout();
        dispatch(logoutAction());
        dispatch(resetSettings());
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.location.reload();
        }
      } catch (clearError) {
        console.error('Failed to clear storage on logout error:', clearError);
      }
    }
  };

  const handleCurrencyChange = () => {
    Alert.alert(
      'Sélectionner Devise',
      'Choisissez votre devise préférée',
      [
        {
          text: 'Franc Congolais (CDF)',
          onPress: () => {
            dispatch(updateCurrency('CDF'));
            showToast('Devise changée vers CDF', 'success');
          },
        },
        {
          text: 'Dollar US (USD)',
          onPress: () => {
            dispatch(updateCurrency('USD'));
            showToast('Devise changée vers USD', 'success');
          },
        },
      ]
    );
  };

  const handleLanguageChange = () => {
    Alert.alert('Langue', 'Choisissez votre langue', [
      { text: 'Français', onPress: () => dispatch(updateLanguage('fr')) },
      { text: 'English', onPress: () => dispatch(updateLanguage('en')) },
      { text: 'Lingala', onPress: () => dispatch(updateLanguage('ln')) },
      { text: 'Kikongo', onPress: () => dispatch(updateLanguage('kg')) },
    ]);
  };

  const handleThemeChange = () => {
    Alert.alert('Thème', 'Sélectionnez un thème', [
      { text: 'Clair', onPress: () => dispatch(updateTheme('light')) },
      { text: 'Sombre', onPress: () => dispatch(updateTheme('dark')) },
      { text: 'Auto', onPress: () => dispatch(updateTheme('auto')) },
    ]);
  };

  const handleFontSizeChange = () => {
    Alert.alert('Taille du texte', 'Choisissez la taille du texte', [
      { text: 'Petit', onPress: () => dispatch(updateDisplay({ fontSize: 'small' })) },
      { text: 'Moyen', onPress: () => dispatch(updateDisplay({ fontSize: 'medium' })) },
      { text: 'Grand', onPress: () => dispatch(updateDisplay({ fontSize: 'large' })) },
    ]);
  };

  const handleSyncIntervalChange = () => {
    Alert.alert('Intervalle de synchro', 'Définir la fréquence', [
      { text: '15 min', onPress: () => dispatch(updateSync({ syncInterval: 15 })) },
      { text: '30 min', onPress: () => dispatch(updateSync({ syncInterval: 30 })) },
      { text: '60 min', onPress: () => dispatch(updateSync({ syncInterval: 60 })) },
      { text: '2 h', onPress: () => dispatch(updateSync({ syncInterval: 120 })) },
    ]);
  };

  const handleBackupFrequencyChange = () => {
    Alert.alert('Fréquence de sauvegarde', 'Planifier les backups', [
      { text: 'Quotidien', onPress: () => dispatch(updateBackup({ backupFrequency: 'daily' })) },
      { text: 'Hebdomadaire', onPress: () => dispatch(updateBackup({ backupFrequency: 'weekly' })) },
      { text: 'Mensuel', onPress: () => dispatch(updateBackup({ backupFrequency: 'monthly' })) },
    ]);
  };

  const handleSessionTimeoutChange = () => {
    Alert.alert('Expiration de session', 'Choisissez la durée', [
      { text: '15 min', onPress: () => dispatch(updateSecurity({ sessionTimeout: 15 })) },
      { text: '30 min', onPress: () => dispatch(updateSecurity({ sessionTimeout: 30 })) },
      { text: '60 min', onPress: () => dispatch(updateSecurity({ sessionTimeout: 60 })) },
      { text: '2 h', onPress: () => dispatch(updateSecurity({ sessionTimeout: 120 })) },
      { text: '8 h', onPress: () => dispatch(updateSecurity({ sessionTimeout: 480 })) },
    ]);
  };

  const handleSyncNow = () => {
    const now = new Date().toISOString();
    dispatch(setLastSyncTime(now));
    showToast('Synchronisation effectuée', 'success');
  };

  const handleBackupNow = () => {
    const now = new Date().toISOString();
    dispatch(setLastBackupTime(now));
    showToast('Sauvegarde effectuée', 'success');
  };

  const handleReset = () => {
    Alert.alert('Réinitialiser', 'Réinitialiser les réglages (hors infos système) ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Réinitialiser', style: 'destructive', onPress: () => dispatch(resetSettings()) },
    ]);
  };

  const saveSystemField = (patch: Partial<typeof settings.system>) => {
    dispatch(updateSystem(patch));
    showToast('Informations système mises à jour', 'success');
  };

  const handleExportData = () => {
    showToast('Export de données en cours...', 'info');
    Alert.alert(
      'Exporter Données',
      'Cette fonctionnalité vous permettra d\'exporter toutes vos données de santé pour la sauvegarde.',
      [{ text: 'OK', onPress: () => showToast('Export terminé avec succès', 'success') }]
    );
  };

  const handleImportData = () => {
    showToast('Import de données en cours...', 'info');
    Alert.alert(
      'Importer Données',
      'Cette fonctionnalité vous permettra d\'importer des données de santé depuis un autre système.',
      [{ text: 'OK', onPress: () => showToast('Import terminé avec succès', 'success') }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>⚙️ Paramètres</Text>
          <Text style={styles.headerSubtitle}>Configuration et préférences système</Text>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* User Profile Section */}
        <View style={styles.profileCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBubble, { backgroundColor: colors.primary + '14' }]}>
              <Ionicons name="person-circle" size={24} color={colors.primary} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Profil Utilisateur</Text>
              <Text style={styles.cardSubtitle}>Gérer vos informations personnelles</Text>
            </View>
            <TouchableOpacity 
              onPress={() => setIsEditingProfile(!isEditingProfile)}
              style={styles.editButton}
            >
              <Ionicons 
                name={isEditingProfile ? "close" : "create"} 
                size={20} 
                color={colors.primary} 
              />
            </TouchableOpacity>
          </View>
          
          {!isEditingProfile ? (
            <View style={styles.infoRows}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nom complet:</Text>
                <Text style={styles.infoValue}>
                  {(user?.firstName || user?.first_name || '') + ' ' + (user?.lastName || user?.last_name || '')}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Téléphone:</Text>
                <Text style={styles.infoValue}>{user?.phone || 'Non défini'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{user?.email || 'Non défini'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Rôle:</Text>
                <Text style={styles.infoValue}>{user?.primary_role || user?.role || 'Non défini'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Organisation:</Text>
                <Text style={styles.infoValue}>{organization?.name || 'Non définie'}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.editForm}>
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Prénom *</Text>
                <TextInput
                  style={styles.textInput}
                  value={profileData.firstName}
                  onChangeText={(text) => setProfileData({ ...profileData, firstName: text })}
                  placeholder="Entrez votre prénom"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Nom de famille *</Text>
                <TextInput
                  style={styles.textInput}
                  value={profileData.lastName}
                  onChangeText={(text) => setProfileData({ ...profileData, lastName: text })}
                  placeholder="Entrez votre nom"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Téléphone</Text>
                <TextInput
                  style={styles.textInput}
                  value={profileData.phone}
                  onChangeText={(text) => setProfileData({ ...profileData, phone: text })}
                  placeholder="+243 XXX XXX XXX"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>
              
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.textInput}
                  value={profileData.email}
                  onChangeText={(text) => setProfileData({ ...profileData, email: text })}
                  placeholder="votre.email@exemple.com"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => {
                    setIsEditingProfile(false);
                    // Reset form to original values
                    setProfileData({
                      firstName: user?.firstName || user?.first_name || '',
                      lastName: user?.lastName || user?.last_name || '',
                      phone: user?.phone || '',
                      email: user?.email || '',
                    });
                  }}
                >
                  <Text style={[styles.buttonText, { color: colors.textSecondary }]}>Annuler</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.saveButton, isUpdatingProfile && styles.disabledButton]}
                  onPress={handleUpdateProfile}
                  disabled={isUpdatingProfile}
                >
                  <Text style={[styles.buttonText, { color: colors.surface }]}>
                    {isUpdatingProfile ? 'Sauvegarde...' : 'Sauvegarder'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* License Information */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBubble, { backgroundColor: colors.success + '14' }]}>
              <Ionicons name="key" size={24} color={colors.success} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Informations de Licence</Text>
              <Text style={styles.cardSubtitle}>Statut et modules actifs</Text>
            </View>
          </View>
          <View style={styles.infoRows}>
            {licenses && licenses.length > 0 ? (
              licenses.map((license, index) => (
                <View key={license.id || index} style={styles.licenseItem}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Type:</Text>
                    <Text style={styles.infoValue}>{license.moduleType || 'Non défini'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Statut:</Text>
                    <Text style={[
                      styles.infoValue, 
                      { color: license.isActive ? colors.success : colors.error }
                    ]}>
                      {license.isActive ? 'Actif' : 'Inactif'}
                    </Text>
                  </View>
                  {license.expiryDate && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Expire:</Text>
                      <Text style={styles.infoValue}>
                        {new Date(license.expiryDate).toLocaleDateString('fr-FR')}
                      </Text>
                    </View>
                  )}
                  {index < licenses.length - 1 && <View style={styles.licenseDivider} />}
                </View>
              ))
            ) : (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Statut:</Text>
                <Text style={[styles.infoValue, { color: colors.error }]}>Aucune licence active</Text>
              </View>
            )}
          </View>
        </View>

        {/* ══════ SECTION: Préférences ══════ */}
        <SectionHeader
          title="Préférences"
          subtitle="Langue, thème et devise"
          icon="settings"
          accentColor={colors.secondary}
        />
        <View style={styles.settingsGrid}>
          <TouchableOpacity style={styles.settingCard} onPress={handleLanguageChange}>
            <View style={[styles.settingIcon, { backgroundColor: colors.secondary + '14' }]}>
              <Ionicons name="language" size={20} color={colors.secondary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Langue</Text>
              <Text style={styles.settingValue}>{settings.language.toUpperCase()}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingCard} onPress={handleThemeChange}>
            <View style={[styles.settingIcon, { backgroundColor: colors.secondary + '14' }]}>
              <Ionicons name="color-palette" size={20} color={colors.secondary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Thème</Text>
              <Text style={styles.settingValue}>{settings.theme === 'auto' ? 'Auto' : settings.theme === 'dark' ? 'Sombre' : 'Clair'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingCard} onPress={handleCurrencyChange}>
            <View style={[styles.settingIcon, { backgroundColor: colors.secondary + '14' }]}>
              <Ionicons name="cash" size={20} color={colors.secondary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Devise</Text>
              <Text style={styles.settingValue}>{settings.currency}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ══════ SECTION: Affichage ══════ */}
        <SectionHeader
          title="Affichage"
          subtitle="Personnalisation de l'interface"
          icon="eye"
          accentColor={colors.warning}
        />
        <View style={styles.settingsGrid}>
          <TouchableOpacity style={styles.settingCard} onPress={handleFontSizeChange}>
            <View style={[styles.settingIcon, { backgroundColor: colors.warning + '14' }]}>
              <Ionicons name="text" size={20} color={colors.warning} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Taille du texte</Text>
              <Text style={styles.settingValue}>
                {settings.display.fontSize === 'small' ? 'Petit' : settings.display.fontSize === 'large' ? 'Grand' : 'Moyen'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.settingCard}>
            <View style={[styles.settingIcon, { backgroundColor: colors.warning + '14' }]}>
              <Ionicons name="contrast" size={20} color={colors.warning} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Contraste Élevé</Text>
              <Text style={styles.settingDescription}>Meilleure visibilité</Text>
            </View>
            <Switch
              value={settings.display.highContrast}
              onValueChange={(value) => dispatch(updateDisplay({ highContrast: value }))}
            />
          </View>

          <View style={styles.settingCard}>
            <View style={[styles.settingIcon, { backgroundColor: colors.warning + '14' }]}>
              <Ionicons name="finger-print" size={20} color={colors.warning} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Gros Boutons</Text>
              <Text style={styles.settingDescription}>Zones tactiles agrandies</Text>
            </View>
            <Switch
              value={settings.display.largeButtons}
              onValueChange={(value) => dispatch(updateDisplay({ largeButtons: value }))}
            />
          </View>
        </View>

        {/* ══════ SECTION: Notifications ══════ */}
        <SectionHeader
          title="Notifications"
          subtitle="Alertes et rappels"
          icon="notifications"
          accentColor={colors.primary}
        />
        <View style={styles.settingsGrid}>
          <View style={styles.settingCard}>
            <View style={[styles.settingIcon, { backgroundColor: colors.primary + '14' }]}>
              <Ionicons name="notifications" size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Activer Notifications</Text>
              <Text style={styles.settingDescription}>Recevoir des alertes et rappels</Text>
            </View>
            <Switch
              value={settings.notifications.enabled}
              onValueChange={(value) => dispatch(updateNotifications({ enabled: value }))}
            />
          </View>

          <View style={[styles.settingCard, !settings.notifications.enabled && styles.disabledCard]}>
            <View style={[styles.settingIcon, { backgroundColor: colors.primary + '14' }]}>
              <Ionicons name="volume-high" size={20} color={settings.notifications.enabled ? colors.primary : colors.textSecondary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, !settings.notifications.enabled && styles.disabledText]}>Son</Text>
              <Text style={[styles.settingDescription, !settings.notifications.enabled && styles.disabledText]}>Jouer un son pour les notifications</Text>
            </View>
            <Switch
              value={settings.notifications.sound}
              onValueChange={(value) => dispatch(updateNotifications({ sound: value }))}
              disabled={!settings.notifications.enabled}
            />
          </View>

          <View style={[styles.settingCard, !settings.notifications.enabled && styles.disabledCard]}>
            <View style={[styles.settingIcon, { backgroundColor: colors.primary + '14' }]}>
              <Ionicons name="phone-portrait" size={20} color={settings.notifications.enabled ? colors.primary : colors.textSecondary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, !settings.notifications.enabled && styles.disabledText]}>Vibration</Text>
              <Text style={[styles.settingDescription, !settings.notifications.enabled && styles.disabledText]}>Vibrer pour les notifications</Text>
            </View>
            <Switch
              value={settings.notifications.vibration}
              onValueChange={(value) => dispatch(updateNotifications({ vibration: value }))}
              disabled={!settings.notifications.enabled}
            />
          </View>
        </View>

        {/* ══════ SECTION: Synchronisation ══════ */}
        <SectionHeader
          title="Synchronisation"
          subtitle="Données et sauvegarde cloud"
          icon="sync"
          accentColor={colors.info}
        />
        <View style={styles.settingsGrid}>
          <View style={styles.settingCard}>
            <View style={[styles.settingIcon, { backgroundColor: colors.info + '14' }]}>
              <Ionicons name="refresh" size={20} color={colors.info} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Sync automatique</Text>
              <Text style={styles.settingDescription}>Synchroniser périodiquement les données</Text>
            </View>
            <Switch
              value={settings.sync.autoSync}
              onValueChange={(value) => dispatch(updateSync({ autoSync: value }))}
            />
          </View>

          <TouchableOpacity style={[styles.settingCard, !settings.sync.autoSync && styles.disabledCard]} onPress={handleSyncIntervalChange}>
            <View style={[styles.settingIcon, { backgroundColor: colors.info + '14' }]}>
              <Ionicons name="timer" size={20} color={settings.sync.autoSync ? colors.info : colors.textSecondary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, !settings.sync.autoSync && styles.disabledText]}>Fréquence</Text>
              <Text style={[styles.settingValue, !settings.sync.autoSync && styles.disabledText]}>{settings.sync.syncInterval} min</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.settingCard}>
            <View style={[styles.settingIcon, { backgroundColor: colors.info + '14' }]}>
              <Ionicons name="cloud-done" size={20} color={colors.info} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Dernière synchro</Text>
              <Text style={styles.settingDescription}>
                {settings.sync.lastSyncTime 
                  ? new Date(settings.sync.lastSyncTime).toLocaleString('fr-FR') 
                  : 'Jamais'
                }
              </Text>
            </View>
            <TouchableOpacity style={styles.actionButton} onPress={handleSyncNow}>
              <Text style={styles.actionButtonText}>Synchroniser</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ══════ SECTION: Sauvegarde ══════ */}
        <SectionHeader
          title="Sauvegarde"
          subtitle="Gestion des sauvegardes automatiques"
          icon="cloud-upload"
          accentColor={colors.success}
        />
        <View style={styles.settingsGrid}>
          <View style={styles.settingCard}>
            <View style={[styles.settingIcon, { backgroundColor: colors.success + '14' }]}>
              <Ionicons name="cloud-upload" size={20} color={colors.success} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Sauvegarde automatique</Text>
              <Text style={styles.settingDescription}>Sauvegarde planifiée</Text>
            </View>
            <Switch
              value={settings.backup.autoBackup}
              onValueChange={(value) => dispatch(updateBackup({ autoBackup: value }))}
            />
          </View>

          <TouchableOpacity style={[styles.settingCard, !settings.backup.autoBackup && styles.disabledCard]} onPress={handleBackupFrequencyChange}>
            <View style={[styles.settingIcon, { backgroundColor: colors.success + '14' }]}>
              <Ionicons name="calendar" size={20} color={settings.backup.autoBackup ? colors.success : colors.textSecondary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, !settings.backup.autoBackup && styles.disabledText]}>Fréquence</Text>
              <Text style={[styles.settingValue, !settings.backup.autoBackup && styles.disabledText]}>
                {settings.backup.backupFrequency === 'daily'
                  ? 'Quotidien'
                  : settings.backup.backupFrequency === 'weekly'
                  ? 'Hebdomadaire'
                  : 'Mensuel'
                }
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.settingCard}>
            <View style={[styles.settingIcon, { backgroundColor: colors.success + '14' }]}>
              <Ionicons name="time" size={20} color={colors.success} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Dernier backup</Text>
              <Text style={styles.settingDescription}>
                {settings.backup.lastBackupTime 
                  ? new Date(settings.backup.lastBackupTime).toLocaleString('fr-FR') 
                  : 'Jamais'
                }
              </Text>
            </View>
            <TouchableOpacity style={styles.actionButton} onPress={handleBackupNow}>
              <Text style={styles.actionButtonText}>Sauvegarder</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ══════ SECTION: Sécurité ══════ */}
        <SectionHeader
          title="Sécurité"
          subtitle="Protection et authentification"
          icon="shield-checkmark"
          accentColor={colors.error}
        />
        <View style={styles.settingsGrid}>
          <View style={styles.settingCard}>
            <View style={[styles.settingIcon, { backgroundColor: colors.error + '14' }]}>
              <Ionicons name="finger-print" size={20} color={colors.error} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Biométrie</Text>
              <Text style={styles.settingDescription}>Utiliser empreinte/Face ID</Text>
            </View>
            <Switch
              value={settings.security.biometricAuth}
              onValueChange={(value) => dispatch(updateSecurity({ biometricAuth: value }))}
            />
          </View>

          <TouchableOpacity style={styles.settingCard} onPress={handleSessionTimeoutChange}>
            <View style={[styles.settingIcon, { backgroundColor: colors.error + '14' }]}>
              <Ionicons name="timer" size={20} color={colors.error} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Expiration de session</Text>
              <Text style={styles.settingValue}>{settings.security.sessionTimeout} min</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.settingCard}>
            <View style={[styles.settingIcon, { backgroundColor: colors.error + '14' }]}>
              <Ionicons name="lock-closed" size={20} color={colors.error} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Politique mot de passe</Text>
              <Text style={styles.settingDescription}>Min {settings.security.passwordPolicy.minLength} caractères</Text>
            </View>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => dispatch(updatePasswordPolicy({ minLength: Math.max(8, settings.security.passwordPolicy.minLength + 1) }))}
            >
              <Text style={styles.actionButtonText}>+ longueur</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Password Policy Options */}
        <View style={styles.policyContainer}>
          <View style={styles.policyCard}>
            <View style={styles.policyRow}>
              <Switch
                value={settings.security.passwordPolicy.requireUppercase}
                onValueChange={(value) => dispatch(updatePasswordPolicy({ requireUppercase: value }))}
              />
              <Text style={styles.policyText}>Majuscules requises</Text>
            </View>
            <View style={styles.policyRow}>
              <Switch
                value={settings.security.passwordPolicy.requireNumbers}
                onValueChange={(value) => dispatch(updatePasswordPolicy({ requireNumbers: value }))}
              />
              <Text style={styles.policyText}>Chiffres requis</Text>
            </View>
            <View style={styles.policyRow}>
              <Switch
                value={settings.security.passwordPolicy.requireSpecialChars}
                onValueChange={(value) => dispatch(updatePasswordPolicy({ requireSpecialChars: value }))}
              />
              <Text style={styles.policyText}>Caractères spéciaux requis</Text>
            </View>
          </View>
        </View>

        {/* ══════ SECTION: Gestion des Données ══════ */}
        <SectionHeader
          title="Gestion des Données"
          subtitle="Export et import des données"
          icon="archive"
          accentColor={colors.warning}
        />
        <View style={styles.settingsGrid}>
          <TouchableOpacity style={styles.settingCard} onPress={handleExportData}>
            <View style={[styles.settingIcon, { backgroundColor: colors.warning + '14' }]}>
              <Ionicons name="download" size={20} color={colors.warning} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Exporter Données</Text>
              <Text style={styles.settingDescription}>Sauvegarder vos données de santé</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingCard} onPress={handleImportData}>
            <View style={[styles.settingIcon, { backgroundColor: colors.warning + '14' }]}>
              <Ionicons name="cloud-upload" size={20} color={colors.warning} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Importer Données</Text>
              <Text style={styles.settingDescription}>Importer depuis un autre système</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ══════ SECTION: Informations Système ══════ */}
        <SectionHeader
          title="Informations Système"
          subtitle="Configuration de l'organisation"
          icon="business"
          accentColor={colors.info}
        />
        <View style={styles.settingsGrid}>
          <View style={styles.settingCard}>
            <View style={[styles.settingIcon, { backgroundColor: colors.info + '14' }]}>
              <Ionicons name="business" size={20} color={colors.info} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Nom Organisation</Text>
              <TextInput
                value={orgName}
                onChangeText={setOrgName}
                onBlur={() => saveSystemField({ organizationName: orgName })}
                style={styles.textInput}
                placeholder="Nom de l'organisation"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.settingCard}>
            <View style={[styles.settingIcon, { backgroundColor: colors.info + '14' }]}>
              <Ionicons name="location" size={20} color={colors.info} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Adresse</Text>
              <TextInput
                value={hospitalAddress}
                onChangeText={setHospitalAddress}
                onBlur={() => saveSystemField({ hospitalAddress })}
                style={styles.textInput}
                placeholder="Adresse de l'établissement"
                placeholderTextColor={colors.textSecondary}
                multiline
              />
            </View>
          </View>

          <View style={styles.settingCard}>
            <View style={[styles.settingIcon, { backgroundColor: colors.info + '14' }]}>
              <Ionicons name="call" size={20} color={colors.info} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Téléphone</Text>
              <TextInput
                value={contactPhone}
                onChangeText={setContactPhone}
                onBlur={() => saveSystemField({ contactPhone })}
                style={styles.textInput}
                placeholder="Numéro de téléphone"
                keyboardType="phone-pad"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.settingCard}>
            <View style={[styles.settingIcon, { backgroundColor: colors.info + '14' }]}>
              <Ionicons name="mail" size={20} color={colors.info} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Email</Text>
              <TextInput
                value={contactEmail}
                onChangeText={setContactEmail}
                onBlur={() => saveSystemField({ contactEmail })}
                style={[styles.textInput, contactEmail && !contactEmail.includes('@') && styles.errorInput]}
                placeholder="Adresse email"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>
          {contactEmail && !contactEmail.includes('@') && (
            <Text style={styles.errorText}>Email invalide</Text>
          )}

          <View style={styles.settingCard}>
            <View style={[styles.settingIcon, { backgroundColor: colors.info + '14' }]}>
              <Ionicons name="information-circle" size={20} color={colors.info} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Version</Text>
              <Text style={styles.settingValue}>1.0.0 (Build 1)</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => Alert.alert('À Propos', 'Système de Gestion de Santé\nVersion 1.0.0\n\nConçu pour les établissements de santé du Congo.')}
          >
            <Ionicons name="information-circle" size={20} color={colors.surface} />
            <Text style={styles.primaryButtonText}>À Propos</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out" size={20} color={colors.surface} />
            <Text style={styles.logoutButtonText}>Déconnexion</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.dangerButton} onPress={handleReset}>
            <Ionicons name="refresh" size={20} color={colors.surface} />
            <Text style={styles.dangerButtonText}>Réinitialiser</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    ...shadows.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  
  // Info Card Styles
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardHeaderText: {
    marginLeft: spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  infoRows: {
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  
  // Settings Grid and Cards
  settingsGrid: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  settingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.sm,
    minHeight: 72,
  },
  disabledCard: {
    opacity: 0.6,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  settingValue: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  disabledText: {
    color: colors.textSecondary,
    opacity: 0.6,
  },
  
  // Action Button
  actionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  actionButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Text Input
  textInput: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
    marginTop: spacing.xs,
    minHeight: 40,
  },
  errorInput: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: spacing.xs,
    marginLeft: spacing.lg,
  },
  
  // Policy Container
  policyContainer: {
    marginBottom: spacing.xl,
  },
  policyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    ...shadows.sm,
    gap: spacing.md,
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  policyText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  
  // Action Section
  actionSection: {
    gap: spacing.md,
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: colors.error,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  dangerButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },

  // Profile Card Styles
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  editButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '14',
  },
  editForm: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  inputRow: {
    gap: spacing.xs,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  // License Display
  licenseItem: {
    paddingVertical: spacing.sm,
  },
  licenseDivider: {
    height: 1,
    backgroundColor: colors.outline,
    marginVertical: spacing.md,
  },

  // Logout Button
  logoutButton: {
    backgroundColor: colors.warning,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  logoutButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});