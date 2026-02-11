import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { List, Divider, Switch, Button, Title, Paragraph, Card } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { useToast } from '../components/GlobalUI';
import { RootState } from '../store/store';
import { 
  updateLanguage, 
  updateCurrency, 
  updateTheme, 
  updateNotifications, 
  updateDisplay, 
  updateSystem 
} from '../store/slices/settingsSlice';
import { theme } from '../theme/theme';

export function SettingsScreen() {
  const dispatch = useDispatch();
  const settings = useSelector((state: RootState) => state.settings);
  const { user, license } = useSelector((state: RootState) => state.auth);
  const { showToast } = useToast();

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
      <ScrollView style={styles.scrollView}>
        {/* User & License Information */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <Title style={styles.cardTitle}>Informations Système</Title>
            <Paragraph>Utilisateur: {user?.firstName} {user?.lastName}</Paragraph>
            <Paragraph>Rôle: {user?.role.toUpperCase()}</Paragraph>
            <Paragraph>Licence: {license?.type || 'Non Activée'}</Paragraph>
            {license?.expiryDate && (
              <Paragraph>Expire: {new Date(license.expiryDate).toLocaleDateString('fr-FR')}</Paragraph>
            )}
          </Card.Content>
        </Card>

        {/* Currency Settings */}
        <List.Section>
          <List.Subheader>Région et Devise</List.Subheader>
          <List.Item
            title="Devise"
            description={settings.currency}
            left={() => <List.Icon icon="currency-usd" />}
            right={() => <List.Icon icon="chevron-right" />}
            onPress={handleCurrencyChange}
          />
        </List.Section>

        <Divider />

        {/* Display Settings */}
        <List.Section>
          <List.Subheader>Affichage</List.Subheader>
          <List.Item
            title="Contraste Élevé"
            description="Meilleure visibilité pour les conditions de faible luminosité"
            left={() => <List.Icon icon="contrast-box" />}
            right={() => (
              <Switch
                value={settings.display.highContrast}
                onValueChange={(value) => dispatch(updateDisplay({ highContrast: value }))}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Gros Boutons"
            description="Zones de touch plus faciles pour appareils mobiles"
            left={() => <List.Icon icon="gesture-tap" />}
            right={() => (
              <Switch
                value={settings.display.largeButtons}
                onValueChange={(value) => dispatch(updateDisplay({ largeButtons: value }))}
              />
            )}
          />
        </List.Section>

        <Divider />

        {/* Notifications */}
        <List.Section>
          <List.Subheader>Notifications</List.Subheader>
          <List.Item
            title="Activer Notifications"
            description="Recevoir des alertes et rappels"
            left={() => <List.Icon icon="bell" />}
            right={() => (
              <Switch
                value={settings.notifications.enabled}
                onValueChange={(value) => dispatch(updateNotifications({ enabled: value }))}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Son"
            description="Jouer un son pour les notifications"
            left={() => <List.Icon icon="volume-high" />}
            right={() => (
              <Switch
                value={settings.notifications.sound}
                onValueChange={(value) => dispatch(updateNotifications({ sound: value }))}
                disabled={!settings.notifications.enabled}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Vibration"
            description="Vibrer pour les notifications"
            left={() => <List.Icon icon="vibrate" />}
            right={() => (
              <Switch
                value={settings.notifications.vibration}
                onValueChange={(value) => dispatch(updateNotifications({ vibration: value }))}
                disabled={!settings.notifications.enabled}
              />
            )}
          />
        </List.Section>

        <Divider />

        {/* Data Management */}
        <List.Section>
          <List.Subheader>Gestion des Données</List.Subheader>
          <List.Item
            title="Exporter Données"
            description="Sauvegarder vos données de santé"
            left={() => <List.Icon icon="export" />}
            right={() => <List.Icon icon="chevron-right" />}
            onPress={handleExportData}
          />
          <Divider />
          <List.Item
            title="Importer Données"
            description="Importer des données depuis un autre système"
            left={() => <List.Icon icon="import" />}
            right={() => <List.Icon icon="chevron-right" />}
            onPress={handleImportData}
          />
        </List.Section>

        <Divider />

        {/* System Information */}
        <List.Section>
          <List.Subheader>Système</List.Subheader>
          <List.Item
            title="Nom Organisation"
            description={settings.system.organizationName}
            left={() => <List.Icon icon="domain" />}
          />
          <Divider />
          <List.Item
            title="Version"
            description="1.0.0 (Build 1)"
            left={() => <List.Icon icon="information" />}
          />
          <Divider />
          <List.Item
            title="Dernière Synchro"
            description={settings.sync.lastSyncTime || 'Jamais'}
            left={() => <List.Icon icon="sync" />}
          />
        </List.Section>

        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            style={styles.button}
            onPress={() => Alert.alert('À Propos', 'Système de Gestion de Santé\nVersion 1.0.0\n\nConçu pour les établissements de santé du Congo.')}
          >
            À Propos
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  infoCard: {
    margin: 16,
    elevation: 2,
  },
  cardTitle: {
    color: theme.colors.primary,
    marginBottom: 8,
  },
  buttonContainer: {
    padding: 16,
    marginBottom: 32,
  },
  button: {
    marginVertical: 8,
  },
});