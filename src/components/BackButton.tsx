import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '../theme/theme';

interface BackButtonProps {
  onPress: () => void;
  title?: string;
  style?: any;
  disabled?: boolean;
}

export function BackButton({ onPress, title = 'Retour', style, disabled = false }: BackButtonProps) {
  return (
    <TouchableOpacity 
      style={[styles.backButton, style, disabled && styles.disabled]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <Ionicons 
        name="arrow-back" 
        size={20} 
        color={disabled ? colors.textSecondary : colors.text} 
      />
      <Text style={[styles.backButtonText, disabled && styles.disabledText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  disabled: {
    opacity: 0.5,
    backgroundColor: colors.outlineVariant,
  },
  disabledText: {
    color: colors.textSecondary,
  },
});