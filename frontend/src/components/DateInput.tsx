import React, { useMemo, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  Text,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors } from '../theme/theme';

type DateFormat = 'iso' | 'fr';

interface DateInputProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  format?: DateFormat;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  buttonStyle?: ViewStyle;
}

const parseDateValue = (value: string, format: DateFormat): Date | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (format === 'iso') {
    const m = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    const day = parseInt(m[3], 10);
    const date = new Date(year, month, day);
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
    return date;
  }

  const m = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10) - 1;
  const year = parseInt(m[3], 10);
  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
  return date;
};

const formatDateValue = (date: Date, format: DateFormat): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  if (format === 'fr') return `${day}/${month}/${year}`;
  return `${year}-${month}-${day}`;
};

export default function DateInput({
  value,
  onChangeText,
  placeholder,
  placeholderTextColor = colors.placeholder,
  format = 'iso',
  minimumDate,
  maximumDate,
  disabled,
  containerStyle,
  inputStyle,
  buttonStyle,
}: DateInputProps) {
  const parsedDate = useMemo(() => parseDateValue(value, format), [value, format]);
  const [showPicker, setShowPicker] = useState(false);
  const [iosTempDate, setIosTempDate] = useState<Date>(parsedDate || new Date());

  const openPicker = () => {
    if (disabled) return;
    setIosTempDate(parsedDate || new Date());
    setShowPicker(true);
  };

  const onNativeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type === 'set' && selectedDate) {
        onChangeText(formatDateValue(selectedDate, format));
      }
      return;
    }
    if (selectedDate) {
      setIosTempDate(selectedDate);
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        style={[styles.input, inputStyle]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        editable={!disabled}
      />
      <TouchableOpacity style={[styles.button, buttonStyle]} onPress={openPicker} disabled={disabled}>
        <Ionicons name="calendar-outline" size={18} color={disabled ? colors.textTertiary : colors.textSecondary} />
      </TouchableOpacity>

      {showPicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={parsedDate || new Date()}
          mode="date"
          display="default"
          onChange={onNativeChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}

      {showPicker && Platform.OS === 'ios' && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
          <View style={styles.iosModalOverlay}>
            <View style={styles.iosSheet}>
              <View style={styles.iosHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.iosCancel}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    onChangeText(formatDateValue(iosTempDate, format));
                    setShowPicker(false);
                  }}
                >
                  <Text style={styles.iosDone}>Valider</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={iosTempDate}
                mode="date"
                display="spinner"
                onChange={onNativeChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
  },
  button: {
    marginLeft: 8,
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iosModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  iosSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  iosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  iosCancel: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  iosDone: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});