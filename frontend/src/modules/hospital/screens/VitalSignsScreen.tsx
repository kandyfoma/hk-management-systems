import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';
import { Patient } from '../../../models/Patient';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

// ─── Types ───────────────────────────────────────────────────
interface VitalSigns {
  temperature?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
  painLevel?: number;
  bloodGlucose?: number;
}

interface VitalSignsScreenProps {
  patient: Patient;
  onComplete: (vitals: VitalSigns) => void;
  onBack?: () => void;
  initialVitals?: VitalSigns;
}

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function VitalSignsScreen({ 
  patient, 
  onComplete, 
  onBack, 
  initialVitals = {} 
}: VitalSignsScreenProps) {
  const [vitals, setVitals] = useState<VitalSigns>(initialVitals);

  // ─── BMI Calculation ───────────────────────────────────────
  const bmi = useMemo(() => {
    if (!vitals.weight || !vitals.height) return null;
    const heightM = vitals.height / 100;
    const bmiValue = vitals.weight / (heightM * heightM);
    return bmiValue.toFixed(1);
  }, [vitals.weight, vitals.height]);

  const bmiCategory = useMemo(() => {
    if (!bmi) return { label: '', color: colors.textSecondary };
    const value = parseFloat(bmi);
    if (value < 18.5) return { label: 'Insuffisance pondérale', color: colors.info };
    if (value < 25) return { label: 'Normal', color: colors.success };
    if (value < 30) return { label: 'Surpoids', color: colors.warning };
    return { label: 'Obésité', color: colors.error };
  }, [bmi]);

  // ─── Handlers ────────────────────────────────────────────
  const handleSave = () => {
    // Validate required vitals (you can adjust this based on requirements)
    if (!vitals.temperature && !vitals.bloodPressureSystolic && !vitals.heartRate) {
      Alert.alert(
        'Signes vitaux incomplets',
        'Veuillez saisir au moins la température, la tension artérielle ou la fréquence cardiaque.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Signes vitaux enregistrés',
      `Les constantes de ${patient.firstName} ${patient.lastName} ont été enregistrées. Procéder à la consultation ?`,
      [
        { 
          text: 'Annuler', 
          style: 'cancel' 
        },
        { 
          text: 'Continuer', 
          onPress: () => onComplete(vitals) 
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={onBack}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Signes Vitaux</Text>
          <Text style={styles.headerSubtitle}>
            Patient: {patient.firstName} {patient.lastName}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSave}
        >
          <Ionicons name="checkmark" size={24} color="#FFF" />
          <Text style={styles.saveButtonText}>Enregistrer</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.vitalsGrid}>
          {/* Temperature */}
          <View style={styles.vitalCard}>
            <View style={styles.vitalHeader}>
              <Ionicons name="thermometer" size={20} color={colors.error} />
              <Text style={styles.vitalLabel}>Température</Text>
            </View>
            <View style={styles.vitalInputRow}>
              <TextInput
                style={styles.vitalInput}
                placeholder="36.5"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                value={vitals.temperature?.toString() || ''}
                onChangeText={v => setVitals({ ...vitals, temperature: parseFloat(v) || undefined })}
              />
              <Text style={styles.vitalUnit}>°C</Text>
            </View>
          </View>

          {/* Blood Pressure */}
          <View style={styles.vitalCard}>
            <View style={styles.vitalHeader}>
              <Ionicons name="pulse" size={20} color={colors.error} />
              <Text style={styles.vitalLabel}>Tension Artérielle</Text>
            </View>
            <View style={styles.vitalInputRow}>
              <TextInput
                style={[styles.vitalInput, { flex: 1 }]}
                placeholder="120"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                value={vitals.bloodPressureSystolic?.toString() || ''}
                onChangeText={v => setVitals({ ...vitals, bloodPressureSystolic: parseInt(v) || undefined })}
              />
              <Text style={styles.vitalUnit}>/</Text>
              <TextInput
                style={[styles.vitalInput, { flex: 1 }]}
                placeholder="80"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                value={vitals.bloodPressureDiastolic?.toString() || ''}
                onChangeText={v => setVitals({ ...vitals, bloodPressureDiastolic: parseInt(v) || undefined })}
              />
              <Text style={styles.vitalUnit}>mmHg</Text>
            </View>
          </View>

          {/* Heart Rate */}
          <View style={styles.vitalCard}>
            <View style={styles.vitalHeader}>
              <Ionicons name="heart" size={20} color={colors.error} />
              <Text style={styles.vitalLabel}>Fréquence Cardiaque</Text>
            </View>
            <View style={styles.vitalInputRow}>
              <TextInput
                style={styles.vitalInput}
                placeholder="72"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                value={vitals.heartRate?.toString() || ''}
                onChangeText={v => setVitals({ ...vitals, heartRate: parseInt(v) || undefined })}
              />
              <Text style={styles.vitalUnit}>bpm</Text>
            </View>
          </View>

          {/* Respiratory Rate */}
          <View style={styles.vitalCard}>
            <View style={styles.vitalHeader}>
              <Ionicons name="fitness" size={20} color={colors.info} />
              <Text style={styles.vitalLabel}>Fréq. Respiratoire</Text>
            </View>
            <View style={styles.vitalInputRow}>
              <TextInput
                style={styles.vitalInput}
                placeholder="16"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                value={vitals.respiratoryRate?.toString() || ''}
                onChangeText={v => setVitals({ ...vitals, respiratoryRate: parseInt(v) || undefined })}
              />
              <Text style={styles.vitalUnit}>/min</Text>
            </View>
          </View>

          {/* SpO2 */}
          <View style={styles.vitalCard}>
            <View style={styles.vitalHeader}>
              <Ionicons name="water" size={20} color={colors.info} />
              <Text style={styles.vitalLabel}>Saturation O₂</Text>
            </View>
            <View style={styles.vitalInputRow}>
              <TextInput
                style={styles.vitalInput}
                placeholder="98"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                value={vitals.oxygenSaturation?.toString() || ''}
                onChangeText={v => setVitals({ ...vitals, oxygenSaturation: parseInt(v) || undefined })}
              />
              <Text style={styles.vitalUnit}>%</Text>
            </View>
          </View>

          {/* Weight */}
          <View style={styles.vitalCard}>
            <View style={styles.vitalHeader}>
              <Ionicons name="scale" size={20} color={colors.primary} />
              <Text style={styles.vitalLabel}>Poids</Text>
            </View>
            <View style={styles.vitalInputRow}>
              <TextInput
                style={styles.vitalInput}
                placeholder="70"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                value={vitals.weight?.toString() || ''}
                onChangeText={v => setVitals({ ...vitals, weight: parseFloat(v) || undefined })}
              />
              <Text style={styles.vitalUnit}>kg</Text>
            </View>
          </View>

          {/* Height */}
          <View style={styles.vitalCard}>
            <View style={styles.vitalHeader}>
              <Ionicons name="resize" size={20} color={colors.primary} />
              <Text style={styles.vitalLabel}>Taille</Text>
            </View>
            <View style={styles.vitalInputRow}>
              <TextInput
                style={styles.vitalInput}
                placeholder="170"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                value={vitals.height?.toString() || ''}
                onChangeText={v => setVitals({ ...vitals, height: parseInt(v) || undefined })}
              />
              <Text style={styles.vitalUnit}>cm</Text>
            </View>
          </View>

          {/* Pain Level */}
          <View style={styles.vitalCard}>
            <View style={styles.vitalHeader}>
              <Ionicons name="flash" size={20} color={colors.warning} />
              <Text style={styles.vitalLabel}>Niveau Douleur</Text>
            </View>
            <View style={styles.painScale}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.painButton,
                    vitals.painLevel === level && {
                      backgroundColor: level <= 3 ? colors.success : level <= 6 ? colors.warning : colors.error,
                    },
                  ]}
                  onPress={() => setVitals({ ...vitals, painLevel: level })}
                >
                  <Text
                    style={[
                      styles.painButtonText,
                      vitals.painLevel === level && { color: '#FFF' },
                    ]}
                  >
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* BMI Display */}
        {bmi && (
          <View style={styles.bmiCard}>
            <Text style={styles.bmiLabel}>IMC Calculé</Text>
            <Text style={styles.bmiValue}>{bmi}</Text>
            <View style={[styles.bmiBadge, { backgroundColor: bmiCategory.color + '20' }]}>
              <Text style={[styles.bmiBadgeText, { color: bmiCategory.color }]}>
                {bmiCategory.label}
              </Text>
            </View>
          </View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
    ...shadows.sm,
  },
  
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  
  headerContent: {
    flex: 1,
  },
  
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  
  saveButtonText: {
    color: '#FFF',
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  
  content: {
    flex: 1,
    padding: spacing.md,
  },
  
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: isDesktop ? 'flex-start' : 'space-between',
  },
  
  vitalCard: {
    backgroundColor: '#FFF',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    width: isDesktop ? '48%' : '100%',
    minWidth: isDesktop ? 300 : undefined,
    ...shadows.sm,
  },
  
  vitalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  
  vitalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: spacing.sm,
  },
  
  vitalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  vitalInput: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    fontSize: 18,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
    minWidth: 80,
  },
  
  vitalUnit: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    fontWeight: '500',
  },
  
  painScale: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  
  painButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
  },
  
  painButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  
  bmiCard: {
    backgroundColor: '#FFF',
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  
  bmiLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  
  bmiValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  
  bmiBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  
  bmiBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
});