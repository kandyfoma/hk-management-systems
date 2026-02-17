import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import ApiAuthService from '../services/ApiAuthService';
import { colors, spacing } from '../theme/theme';

export function OrganizationTestScreen() {
  const { user, organization } = useSelector((state: RootState) => state.auth);
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testProfileEndpoint = async () => {
    setLoading(true);
    try {
      const currentUser = await ApiAuthService.getInstance().getCurrentUser();
      const currentOrg = await ApiAuthService.getInstance().getCurrentOrganization();
      
      console.log('Profile test - User:', currentUser);
      console.log('Profile test - Organization:', currentOrg);
      
      setProfileData({
        user: currentUser,
        organization: currentOrg,
      });
      
      Alert.alert(
        'Profile Test Results',
        `User: ${currentUser?.first_name} ${currentUser?.last_name}\n` +
        `Organization: ${currentOrg?.name || 'N/A'}\n` +
        `User Org Name: ${currentUser?.organization_name || 'N/A'}`
      );
    } catch (error) {
      console.error('Profile test error:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Organization Test Screen</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Redux State</Text>
        <Text style={styles.data}>User: {user?.first_name} {user?.last_name}</Text>
        <Text style={styles.data}>User Org Name: {user?.organization_name || 'N/A'}</Text>
        <Text style={styles.data}>Organization: {organization?.name || 'N/A'}</Text>
        <Text style={styles.data}>Organization ID: {organization?.id || 'N/A'}</Text>
      </View>
      
      <TouchableOpacity
        style={styles.testButton}
        onPress={testProfileEndpoint}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Testing...' : 'Test Profile Endpoint'}
        </Text>
      </TouchableOpacity>
      
      {profileData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Response</Text>
          <Text style={styles.data}>User: {profileData.user?.first_name} {profileData.user?.last_name}</Text>
          <Text style={styles.data}>User Org Name: {profileData.user?.organization_name || 'N/A'}</Text>
          <Text style={styles.data}>Organization: {profileData.organization?.name || 'N/A'}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  section: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  data: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  testButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  buttonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});