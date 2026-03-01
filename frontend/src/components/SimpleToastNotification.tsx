import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows } from '../theme/theme';
import type { SimpleToastMessage } from '../hooks/useSimpleToast';

interface SimpleToastNotificationProps {
  message: SimpleToastMessage | null;
}

/**
 * Simple Toast Notification Component
 * Displays success/error messages at the bottom of the screen
 * Auto-dismisses after 3.5 seconds
 *
 * Pairs with useSimpleToast hook
 */
export const SimpleToastNotification: React.FC<SimpleToastNotificationProps> = ({ message }) => {
  if (!message) return null;

  return (
    <View style={[
      styles.toast,
      { backgroundColor: message.type === 'error' ? colors.error : colors.success || '#10B981' },
    ]}>
      <Ionicons
        name={message.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
        size={18}
        color="#FFF"
      />
      <Text style={styles.toastText}>{message.text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: borderRadius.lg,
    ...shadows.lg,
    maxWidth: 400,
    zIndex: 9999,
  },
  toastText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
    flexShrink: 1,
  },
});
