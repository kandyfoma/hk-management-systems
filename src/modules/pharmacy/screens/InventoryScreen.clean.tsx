import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function InventoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>✅ Inventaire Screen - WORKING!</Text>
      <Text style={styles.subtitle}>The routing fix is successful!</Text>
      <Text style={styles.description}>
        This proves the PharmacyNavigator fix worked. The full inventory functionality will be restored shortly.
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
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#34C759',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});