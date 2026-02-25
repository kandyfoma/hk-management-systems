import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput,
  ActivityIndicator, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../../../services/ApiService';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';

export interface Exam {
  id: number;
  exam_number?: string;
  exam_date: string;
  exam_type: string;
  worker_name?: string;
  worker?: number;
  examination_completed?: boolean;
}

const EXAM_TYPE_LABELS: Record<string, string> = {
  pre_employment: 'PrÃ©-emploi',
  periodic: 'PÃ©riodique',
  return_to_work: 'Reprise',
  special: 'SpÃ©cial',
  exit: 'DÃ©part',
  night_work: 'Travail de Nuit',
  pregnancy_related: 'Grossesse',
  post_incident: 'Post-Incident',
};

interface ExamSelectDropdownProps {
  value: Exam | null;
  onChange: (exam: Exam) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  workerId?: string | number | null; // filter by worker if provided
}

export function ExamSelectDropdown({
  value,
  onChange,
  placeholder = 'SÃ©lectionnez une visite mÃ©dicale',
  label = 'Visite MÃ©dicale (Examen)',
  error,
  disabled = false,
  workerId,
}: ExamSelectDropdownProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [filtered, setFiltered] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef<any>(null);

  useEffect(() => {
    if (modalVisible && exams.length === 0) {
      loadExams();
    }
  }, [modalVisible]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      q
        ? exams.filter(
            e =>
              (e.worker_name ?? '').toLowerCase().includes(q) ||
              (e.exam_number ?? '').toLowerCase().includes(q) ||
              EXAM_TYPE_LABELS[e.exam_type]?.toLowerCase().includes(q)
          )
        : exams
    );
  }, [search, exams]);

  const loadExams = async () => {
    setLoading(true);
    try {
      const api = ApiService.getInstance();
      const url = workerId
        ? `/occupational-health/examinations/?worker=${workerId}`
        : '/occupational-health/examinations/';
      const response = await api.get(url);
      if (response.success && response.data) {
        const data: Exam[] = Array.isArray(response.data)
          ? response.data
          : response.data.results ?? [];
        // Sort newest first
        data.sort((a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime());
        setExams(data);
        setFiltered(data);
      }
    } catch (err) {
      console.error('ExamSelectDropdown: load error', err);
    } finally {
      setLoading(false);
    }
  };

  const displayText = value
    ? `${value.worker_name ? value.worker_name + ' â€” ' : ''}${EXAM_TYPE_LABELS[value.exam_type] ?? value.exam_type} (${new Date(value.exam_date).toLocaleDateString('fr-CD')})`
    : null;

  return (
    <View style={styles.container}>
      {/* Label */}
      <Text style={styles.label}>{label}</Text>

      {/* Trigger */}
      <TouchableOpacity
        style={[
          styles.trigger,
          error ? styles.triggerError : null,
          disabled ? styles.triggerDisabled : null,
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons
          name="medkit-outline"
          size={16}
          color={value ? colors.primary : colors.textSecondary}
        />
        <Text
          style={[styles.triggerText, !value && styles.triggerPlaceholder]}
          numberOfLines={1}
        >
          {displayText ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir une visite mÃ©dicale</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
              <TextInput
                ref={searchRef}
                style={styles.searchInput}
                placeholder="Rechercher par travailleur ou type..."
                placeholderTextColor={colors.textSecondary}
                value={search}
                onChangeText={setSearch}
                autoFocus
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* List */}
            {loading ? (
              <ActivityIndicator
                size="large"
                color={colors.primary}
                style={{ padding: spacing.xl }}
              />
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={item => String(item.id)}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons name="medkit-outline" size={40} color={colors.textSecondary} />
                    <Text style={styles.emptyText}>Aucune visite trouvÃ©e</Text>
                    <Text style={styles.emptyHint}>
                      CrÃ©ez d'abord une visite dans "Visite du MÃ©decin"
                    </Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const isSelected = value?.id === item.id;
                  return (
                    <TouchableOpacity
                      style={[styles.examItem, isSelected && styles.examItemSelected]}
                      onPress={() => {
                        onChange(item);
                        setModalVisible(false);
                      }}
                    >
                      <View style={[styles.examTypeChip, isSelected && styles.examTypeChipSelected]}>
                        <Text style={[styles.examTypeText, isSelected && { color: '#FFF' }]}>
                          {EXAM_TYPE_LABELS[item.exam_type] ?? item.exam_type}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        {item.worker_name ? (
                          <Text style={styles.examWorker} numberOfLines={1}>
                            {item.worker_name}
                          </Text>
                        ) : null}
                        <Text style={styles.examDate}>
                          {new Date(item.exam_date).toLocaleDateString('fr-CD')}
                          {item.exam_number ? ` Â· ${item.exam_number}` : ''}
                        </Text>
                      </View>
                      {item.examination_completed && (
                        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                      )}
                      {isSelected && (
                        <Ionicons name="radio-button-on" size={18} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: {
    fontSize: 13, fontWeight: '600', color: colors.text,
    marginBottom: spacing.xs,
  },
  trigger: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderWidth: 1.5, borderColor: colors.outline, borderRadius: borderRadius.lg,
    padding: spacing.md, backgroundColor: colors.surface,
  },
  triggerError: { borderColor: colors.error },
  triggerDisabled: { opacity: 0.5 },
  triggerText: { flex: 1, fontSize: 14, color: colors.text },
  triggerPlaceholder: { color: colors.textSecondary },
  errorText: { fontSize: 11, color: colors.error, marginTop: 4 },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '80%', paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.outline,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    margin: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.background, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.outline,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  emptyState: {
    padding: spacing.xl, alignItems: 'center', gap: spacing.sm,
  },
  emptyText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  emptyHint: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  examItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.outline,
  },
  examItemSelected: { backgroundColor: colors.primary + '0A' },
  examTypeChip: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '18',
  },
  examTypeChipSelected: { backgroundColor: colors.primary },
  examTypeText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  examWorker: { fontSize: 13, fontWeight: '600', color: colors.text },
  examDate: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
});
