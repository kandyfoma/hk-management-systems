import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../../../services/ApiService';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';

export interface Worker {
  id: string;
  name: string;
  email?: string;
  department?: string;
  employee_id?: string;
}

interface WorkerSelectDropdownProps {
  value: Worker | null;
  onChange: (worker: Worker) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
}

export function WorkerSelectDropdown({
  value,
  onChange,
  placeholder = 'Sélectionnez un travailleur',
  label = 'Travailleur',
  error,
  disabled = false,
}: WorkerSelectDropdownProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [filteredWorkers, setFilteredWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (isDropdownOpen && workers.length === 0) {
      loadWorkers();
    }
  }, [isDropdownOpen]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchText.trim() === '') {
      setFilteredWorkers(workers);
      setIsSearching(false);
    } else {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(() => {
        const filtered = workers.filter((worker) =>
          worker.name.toLowerCase().includes(searchText.toLowerCase()) ||
          (worker.email && worker.email.toLowerCase().includes(searchText.toLowerCase())) ||
          (worker.employee_id && worker.employee_id.toLowerCase().includes(searchText.toLowerCase()))
        );
        setFilteredWorkers(filtered);
        setIsSearching(false);
      }, 300);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchText, workers]);

  const loadWorkers = async () => {
    try {
      setLoading(true);
      const api = ApiService.getInstance();
      
      // Fetch enterprise users
      const response = await api.get('/occupational-health/enterprise-users/');
      
      if (response.success && response.data) {
        const workersList = Array.isArray(response.data) 
          ? response.data 
          : response.data.results || [];
        
        // Map backend response to expected Worker interface
        const mappedWorkers: Worker[] = workersList.map((w: any) => ({
          id: w.id,
          name: w.full_name || `${w.first_name || ''} ${w.last_name || ''}`.trim(),
          email: w.email,
          employee_id: w.employee_id,
          department: w.job_title,
        }));
        
        setWorkers(mappedWorkers);
        setFilteredWorkers(mappedWorkers);
      }
    } catch (err) {
      console.error('Error loading workers:', err);
      Alert.alert('Erreur', 'Impossible de charger la liste des travailleurs');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (worker: Worker) => {
    onChange(worker);
    setIsDropdownOpen(false);
    setSearchText('');
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[
          styles.triggerButton,
          isDropdownOpen && styles.triggerButtonActive,
          error && styles.triggerButtonError,
          disabled && styles.triggerButtonDisabled,
        ]}
        onPress={() => !disabled && setIsDropdownOpen(!isDropdownOpen)}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <View style={styles.triggerContent}>
          <Ionicons
            name="people-outline"
            size={18}
            color={value ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.triggerText, !value && styles.placeholderText]}>
            {value ? value.name : placeholder}
          </Text>
        </View>
        <Ionicons
          name={isDropdownOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {isDropdownOpen && (
        <View style={[styles.dropdownContainer, shadows.md]}>
          {/* Search Input */}
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un travailleur..."
              placeholderTextColor={colors.textSecondary}
              value={searchText}
              onChangeText={setSearchText}
              editable={!loading}
            />
            {isSearching && <ActivityIndicator size="small" color={colors.primary} />}
            {searchText.length > 0 && !isSearching && (
              <TouchableOpacity onPress={() => setSearchText('')} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Worker List Dropdown */}
          <View style={styles.dropdownList}>
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Chargement...</Text>
              </View>
            )}
            {!loading && filteredWorkers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={24} color={colors.textSecondary} />
                <Text style={styles.emptyText}>
                  {searchText.trim() ? 'Aucun travailleur trouvé' : 'Aucun travailleur disponible'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredWorkers}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[styles.workerItem, value?.id === item.id && styles.workerItemSelected]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.workerInfo}>
                      <Text style={styles.workerName}>{item.name}</Text>
                      {item.email && <Text style={styles.workerEmail}>{item.email}</Text>}
                      {item.employee_id && <Text style={styles.workerEmployee}>ID: {item.employee_id}</Text>}
                    </View>
                    {value?.id === item.id && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                nestedScrollEnabled={false}
              />
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  triggerButtonActive: {
    borderColor: colors.primary,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  triggerButtonError: {
    borderColor: colors.error,
  },
  triggerButtonDisabled: {
    opacity: 0.5,
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  triggerText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  placeholderText: {
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
  dropdownContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.primary,
    borderBottomLeftRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
    maxHeight: 300,
    overflow: 'hidden',
    zIndex: 1000,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    padding: spacing.xs,
  },
  dropdownList: {
    maxHeight: 250,
  },
  workerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  workerItemSelected: {
    backgroundColor: colors.primary + '10',
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  workerEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  workerEmployee: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
