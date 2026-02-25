import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, shadows, spacing } from '../../../theme/theme';

const { width } = Dimensions.get('window');
const ACCENT = colors.primary;

interface TestCard {
  id: string;
  name: string;
  description: string;
  icon: string;
  screenId: string;
  color: string;
}

const tests: TestCard[] = [
  {
    id: 'audiometry',
    name: 'Audiométrie',
    description: 'Tests auditifs et historique',
    icon: 'volume-high-outline',
    screenId: 'oh-audiometry',
    color: '#3B82F6',
  },
  {
    id: 'spirometry',
    name: 'Spirométrie',
    description: 'Tests de fonction pulmonaire',
    icon: 'fitness-outline',
    screenId: 'oh-spirometry',
    color: '#10B981',
  },
  {
    id: 'vision',
    name: 'Tests de Vision',
    description: 'Acuité visuelle et daltonisme',
    icon: 'eye-outline',
    screenId: 'oh-vision-tests',
    color: '#F59E0B',
  },
  {
    id: 'xray',
    name: 'Imagerie Radiologique',
    description: 'Résultats radiographiques',
    icon: 'image-outline',
    screenId: 'oh-xray-imaging',
    color: '#EF4444',
  },
  {
    id: 'drug-alcohol',
    name: 'Dépistage D/A',
    description: 'Dépistage drogue et alcool',
    icon: 'alert-circle-outline',
    screenId: 'oh-drug-alcohol-screening',
    color: '#8B5CF6',
  },
  {
    id: 'ppe-compliance',
    name: 'Conformité EPI',
    description: 'Suivi des équipements de protection',
    icon: 'shield-outline',
    screenId: 'oh-ppe-compliance-new',
    color: '#06B6D4',
  },
  {
    id: 'medical-exam',
    name: 'Visite Médicale',
    description: 'Consultations et examens généraux',
    icon: 'medkit-outline',
    screenId: 'oh-exams',
    color: '#EC4899',
  },
  {
    id: 'health-screening',
    name: 'Dépistage Santé',
    description: 'Questionnaires de dépistage',
    icon: 'document-text-outline',
    screenId: 'oh-health-screening',
    color: '#14B8A6',
  },
  {
    id: 'exit-exam',
    name: 'Examens de Départ',
    description: 'Examens fin de contrat',
    icon: 'log-out-outline',
    screenId: 'oh-exit-exams',
    color: '#F97316',
  },
  {
    id: 'occupational-disease',
    name: 'Maladies Professionnelles',
    description: 'Registre des maladies occupationnelles',
    icon: 'warning-outline',
    screenId: 'oh-diseases',
    color: '#DC2626',
  },
];

export function MedicalTestCatalogScreen({ navigation }: any) {
  const handleTestSelect = (screenId: string) => {
    // Map catalog screens to dashboard screens
    const dashboardMap: { [key: string]: string } = {
      'oh-audiometry': 'oh-audiometry-dashboard',
      'oh-spirometry': 'oh-spirometry-dashboard',
      'oh-vision-tests': 'oh-vision-dashboard',
      'oh-xray-imaging': 'oh-xray-dashboard',
      'oh-drug-alcohol-screening': 'oh-drug-alcohol-dashboard',
      'oh-ppe-compliance-new': 'oh-ppe-compliance-dashboard',
      'oh-exams': 'oh-exams-dashboard',
      'oh-health-screening': 'oh-health-screening-dashboard',
      'oh-exit-exams': 'oh-exit-exams-dashboard',
      'oh-diseases': 'oh-diseases-dashboard',
    };
    const targetScreen = dashboardMap[screenId] || screenId;
    navigation.navigate(targetScreen);
  };

  const renderTestCard = ({ item }: { item: TestCard }) => (
    <TouchableOpacity
      style={[styles.card, shadows.md]}
      onPress={() => handleTestSelect(item.screenId)}
      activeOpacity={0.8}
    >
      <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon as any} size={40} color={item.color} />
      </View>
      <Text style={styles.testName}>{item.name}</Text>
      <Text style={styles.testDescription}>{item.description}</Text>
      <View style={styles.arrowContainer}>
        <Ionicons name="arrow-forward" size={20} color={item.color} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Tests Médicaux</Text>
          <Text style={styles.screenSubtitle}>Sélectionnez un test à effectuer</Text>
        </View>

        {/* Tests Grid */}
        <View style={styles.gridContainer}>
          <FlatList
            data={tests}
            renderItem={renderTestCard}
            keyExtractor={(item) => item.id}
            numColumns={width >= 1024 ? 3 : width >= 768 ? 2 : 1}
            scrollEnabled={false}
            columnWrapperStyle={width >= 1024 ? styles.columnWrapper3 : width >= 768 ? styles.columnWrapper2 : undefined}
            contentContainerStyle={styles.gridContent}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  gridContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: 40,
  },
  gridContent: {
    gap: spacing.md,
  },
  columnWrapper2: {
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  columnWrapper3: {
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    minHeight: 200,
    justifyContent: 'flex-start',
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  testName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  testDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    flex: 1,
  },
  arrowContainer: {
    alignItems: 'flex-start',
  },
});
