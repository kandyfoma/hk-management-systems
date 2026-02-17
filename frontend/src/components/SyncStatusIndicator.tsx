/**
 * SyncStatusIndicator - Shows connectivity and sync status
 * Displays offline/online status and sync progress
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HybridDataService from '../services/HybridDataService';
import { colors, borderRadius, spacing } from '../theme/theme';

interface Props {
  onPress?: () => void;
  compact?: boolean;
}

export function SyncStatusIndicator({ onPress, compact = false }: Props) {
  const [syncStatus, setSyncStatus] = useState(HybridDataService.getInstance().getSyncStatus());
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setSyncStatus(HybridDataService.getInstance().getSyncStatus());
      setLastUpdate(new Date());
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (syncStatus.syncInProgress) return colors.warning;
    if (!syncStatus.isOnline) return colors.error;
    if (syncStatus.pendingItems > 0) return colors.info;
    return colors.success;
  };

  const getStatusIcon = () => {
    if (syncStatus.syncInProgress) return 'sync' as const;
    if (!syncStatus.isOnline) return 'cloud-offline' as const;
    if (syncStatus.pendingItems > 0) return 'cloud-upload' as const;
    return 'cloud-done' as const;
  };

  const getStatusText = () => {
    if (syncStatus.syncInProgress) return 'Synchronisation...';
    if (!syncStatus.isOnline) return 'Hors ligne';
    if (syncStatus.pendingItems > 0) return `${syncStatus.pendingItems} en attente`;
    return 'Synchronisé';
  };

  if (compact) {
    return (
      <TouchableOpacity style={[styles.compactContainer, { backgroundColor: getStatusColor() + '20' }]} onPress={onPress}>
        <Ionicons name={getStatusIcon()} size={16} color={getStatusColor()} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={[styles.container, { borderColor: getStatusColor() }]} onPress={onPress}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: getStatusColor() }]}>
          <Ionicons name={getStatusIcon()} size={16} color="white" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
          {syncStatus.lastSync && (
            <Text style={styles.timeText}>
              Dernière synchro: {syncStatus.lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  compactContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  timeText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

export default SyncStatusIndicator;