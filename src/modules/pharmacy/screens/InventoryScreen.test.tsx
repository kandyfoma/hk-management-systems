import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../../theme/theme';

// Temporary test component to verify routing works
export function InventoryScreenTest() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>✅ Inventaire Screen - WORKING!</Text>
      <Text style={styles.subtitle}>The routing fix is successful!</Text>
      <Text style={styles.description}>
        This proves the PharmacyNavigator fix worked. 
        The actual InventoryScreen might have a runtime error.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.backgroundPrimary,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: colors.success,
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});