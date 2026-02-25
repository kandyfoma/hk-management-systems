import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList,
  Dimensions, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';

interface ListItem {
  id: string;
  worker_name: string;
  [key: string]: any;
}

interface SearchableListProps {
  title: string;
  icon: string;
  accentColor: string;
  items: ListItem[];
  loading?: boolean;
  searchFields?: string[];
  sortOptions?: { label: string; key: string }[];
  filterOptions?: { label: string; value: string }[];
  onAddNew: () => void;
  onItemPress: (item: ListItem) => void;
  onEdit?: (item: ListItem) => void;
  onDelete?: (item: ListItem) => void;
  renderItemExtra?: (item: ListItem) => React.ReactNode;
  pageSize?: number;
  onPaginationChange?: (offset: number, limit: number) => void;
}

export function SearchableList({
  title,
  icon,
  accentColor,
  items,
  loading = false,
  searchFields = ['worker_name'],
  sortOptions = [],
  filterOptions = [],
  onAddNew,
  onItemPress,
  onEdit,
  onDelete,
  renderItemExtra,
  pageSize = 10,
  onPaginationChange,
}: SearchableListProps) {
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState(sortOptions[0]?.key || 'worker_name');
  const [filterBy, setFilterBy] = useState('all');
  const [currentPage, setCurrentPage] = useState(0);

  const handleDeleteWithConfirmation = (item: ListItem) => {
    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer l'enregistrement de ${item.worker_name}?`,
      [
        {
          text: 'Annuler',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          onPress: () => onDelete?.(item),
          style: 'destructive',
        },
      ]
    );
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...items];

    // Search
    if (searchText.trim()) {
      const query = searchText.toLowerCase();
      result = result.filter(item =>
        searchFields.some(field => {
          const value = item[field];
          return value && value.toString().toLowerCase().includes(query);
        })
      );
    }

    // Filter
    if (filterBy !== 'all' && result.length > 0 && 'status' in result[0]) {
      result = result.filter(item => item.status === filterBy);
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortBy] || '';
      const bVal = b[sortBy] || '';
      if (typeof aVal === 'string') {
        return aVal.localeCompare(bVal);
      }
      return aVal - bVal;
    });

    return result;
  }, [items, searchText, sortBy, filterBy, searchFields]);

  // Reset page when search/filter/sort changes
  React.useEffect(() => {
    setCurrentPage(0);
    if (onPaginationChange) {
      onPaginationChange(0, pageSize);
    }
  }, [searchText, filterBy, sortBy, pageSize, onPaginationChange]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredAndSorted.length / pageSize);
  const startIndex = currentPage * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedItems = filteredAndSorted.slice(startIndex, endIndex);

  const canGoNext = currentPage < totalPages - 1;
  const canGoPrev = currentPage > 0;

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('normal') || statusLower.includes('négatif') || statusLower.includes('conforme')) {
      return '#22C55E';
    }
    if (statusLower.includes('warning') || statusLower.includes('léger') || statusLower.includes('attention')) {
      return '#F59E0B';
    }
    if (statusLower.includes('critical') || statusLower.includes('sévère') || statusLower.includes('positif')) {
      return '#EF4444';
    }
    return colors.textSecondary;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name={icon as any} size={28} color={accentColor} />
          <Text style={styles.title}>{title}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: accentColor }]}
          onPress={onAddNew}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher par nom, ID..."
            placeholderTextColor={colors.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText && (
            <TouchableOpacity onPress={() => setSearchText('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Controls */}
      {(sortOptions.length > 0 || filterOptions.length > 0) && (
        <View style={styles.controls}>
          {sortOptions.length > 0 && (
            <View style={styles.controlGroup}>
              <Text style={styles.controlLabel}>Trier par:</Text>
              <FlatList
                horizontal
                data={sortOptions}
                keyExtractor={item => item.key}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.chipButton,
                      sortBy === item.key && { backgroundColor: accentColor },
                    ]}
                    onPress={() => setSortBy(item.key)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        sortBy === item.key && { color: '#FFF' },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                )}
                scrollEnabled={false}
              />
            </View>
          )}

          {filterOptions.length > 0 && (
            <View style={styles.controlGroup}>
              <Text style={styles.controlLabel}>Filtrer:</Text>
              <FlatList
                horizontal
                data={filterOptions}
                keyExtractor={item => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.chipButton,
                      filterBy === item.value && { backgroundColor: accentColor },
                    ]}
                    onPress={() => setFilterBy(item.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        filterBy === item.value && { color: '#FFF' },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                )}
                scrollEnabled={false}
              />
            </View>
          )}
        </View>
      )}

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accentColor} />
        </View>
      ) : filteredAndSorted.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>Aucun résultat trouvé</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={paginatedItems}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.listItem,
                  { borderLeftColor: accentColor }
                ]}
                onPress={() => onItemPress(item)}
                activeOpacity={0.7}
              >
                <View style={styles.itemContent}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemWorker}>{item.worker_name}</Text>
                    {item.employee_id && (
                      <Text style={styles.itemEmployeeId}>ID: {item.employee_id}</Text>
                    )}
                    {item.test_date || item.exam_date || item.screening_date ? (
                      <Text style={styles.itemDate}>
                        {new Date(
                          item.test_date ||
                          item.exam_date ||
                          item.screening_date ||
                          item.diagnosis_date ||
                          item.assigned_date
                        ).toLocaleDateString('fr-FR')}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.itemRightContent}>
                    {item.status && (
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(item.status) + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: getStatusColor(item.status) },
                          ]}
                        >
                          {item.status}
                        </Text>
                      </View>
                    )}

                    {renderItemExtra && renderItemExtra(item)}
                  </View>
                </View>

                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={styles.editIcon}
                    onPress={() => onEdit ? onEdit(item) : onItemPress(item)}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="pencil-outline" size={18} color={accentColor} />
                  </TouchableOpacity>

                  {onDelete && (
                    <TouchableOpacity
                      style={styles.deleteIcon}
                      onPress={() => handleDeleteWithConfirmation(item)}
                      activeOpacity={0.6}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.listContent}
            scrollEnabled={true}
          />

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <View style={styles.paginationContainer}>
              <TouchableOpacity
                style={[styles.paginationButton, !canGoPrev && styles.paginationButtonDisabled]}
                onPress={() => setCurrentPage(currentPage - 1)}
                disabled={!canGoPrev}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={canGoPrev ? accentColor : colors.textSecondary}
                />
              </TouchableOpacity>

              <Text style={styles.paginationText}>
                Page {currentPage + 1} sur {totalPages}
              </Text>

              <TouchableOpacity
                style={[styles.paginationButton, !canGoNext && styles.paginationButtonDisabled]}
                onPress={() => setCurrentPage(currentPage + 1)}
                disabled={!canGoNext}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={canGoNext ? accentColor : colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  searchSection: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
  },
  controls: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  controlGroup: {
    gap: spacing.sm,
  },
  controlLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  chipButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.outline,
    marginRight: spacing.sm,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  listItem: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.sm,
    borderLeftWidth: 4,
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemWorker: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  itemEmployeeId: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  itemDate: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  itemRightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginLeft: spacing.md,
  },
  editIcon: {
    padding: spacing.xs,
  },
  deleteIcon: {
    padding: spacing.xs,
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    backgroundColor: colors.background,
  },
  paginationButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
});
