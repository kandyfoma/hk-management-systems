import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Dimensions, ActivityIndicator, RefreshControl,
  Modal, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import { colors, shadows } from '../../../theme/theme';
import ApiService from '../../../services/ApiService';
import { Patient, PatientUtils } from '../../../models/Patient';
import { getTextColor, getIconBackgroundColor, getSecondaryTextColor } from '../../../utils/colorContrast';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface PatientWithEncounters extends Patient {
  encounters: never[];
  activeEncounter?: undefined;
}

type TabKey = 'all' | 'active' | 'recent' | 'inactive';
type SortKey = 'name' | 'recent' | 'number';

interface ImportResult {
  total?: number;
  created?: number;
  updated?: number;
  errors?: number;
  error_details?: { row: number; error: string }[];
  error?: string;
}

// ═══════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════

interface Props {
  onSelectPatient?: (patient: Patient) => void;
  onNewPatient?: () => void;
}

// ═══════════════════════════════════════════════════════════════
// API → Patient mapper
// ═══════════════════════════════════════════════════════════════

function apiToPatient(d: any): PatientWithEncounters {
  // Support both full serializer (first_name/last_name) and list serializer (full_name)
  const fullName: string = d.full_name ?? '';
  const nameParts = fullName.split(' ');
  const firstName = d.first_name ?? nameParts[0] ?? '';
  const lastName = d.last_name ?? (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
  return {
    id: d.id,
    firstName,
    lastName,
    middleName: d.middle_name ?? '',
    dateOfBirth: d.date_of_birth ?? '',
    gender: d.gender ?? 'other',
    phone: d.phone ?? '',
    email: d.email ?? '',
    address: d.address ?? '',
    city: d.city ?? '',
    nationalId: d.national_id ?? '',
    bloodType: d.blood_type ?? undefined,
    allergies: Array.isArray(d.allergies) ? d.allergies : [],
    chronicConditions: Array.isArray(d.chronic_conditions) ? d.chronic_conditions : [],
    currentMedications: Array.isArray(d.current_medications) ? d.current_medications : [],
    emergencyContactName: d.emergency_contact_name ?? '',
    emergencyContactPhone: d.emergency_contact_phone ?? '',
    insuranceProvider: d.insurance_provider ?? '',
    insuranceNumber: d.insurance_number ?? '',
    patientNumber: d.patient_number ?? '',
    registrationDate: d.registration_date ?? d.created_at ?? '',
    lastVisit: d.last_visit ?? undefined,
    status: d.status ?? 'active',
    isActive: (d.status ?? 'active') === 'active',
    createdAt: d.created_at ?? '',
    accessCount: 0,
    encounters: [],
    activeEncounter: undefined,
  };
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export function PatientListScreen({ onSelectPatient, onNewPatient }: Props) {
  const api = ApiService.getInstance();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [patients, setPatients] = useState<PatientWithEncounters[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [sortBy, setSortBy] = useState<SortKey>('recent');

  // Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [deletingPatientId, setDeletingPatientId] = useState<string | null>(null);

  // ─── Stats ────────────────────────────────────────────────
  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: patients.length,
      active: patients.filter(p => p.status === 'active').length,
      newThisMonth: patients.filter(p => {
        const d = new Date(p.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length,
      byGender: {
        male: patients.filter(p => p.gender === 'male').length,
        female: patients.filter(p => p.gender === 'female').length,
        other: patients.filter(p => p.gender === 'other').length,
      },
    };
  }, [patients]);

  // ─── Load Data ────────────────────────────────────────────

  const loadData = useCallback(async (search?: string) => {
    setLoadError(null);
    try {
      const params: any = {};
      const q = (search ?? searchQuery).trim();
      if (q) params.search = q;

      // Fetch all pages to ensure no patients are missed
      let allPatients: PatientWithEncounters[] = [];
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const res = await api.get('/patients/', { ...params, page });
        if (res.success && res.data) {
          const payload = res.data as any;
          const rows: any[] = Array.isArray(payload)
            ? payload
            : (payload.results ?? []);
          allPatients = [...allPatients, ...rows.map(apiToPatient)];
          // If the response is paginated and has a next page, keep going
          hasMore = !Array.isArray(payload) && !!payload.next;
          page++;
        } else {
          setLoadError((res.error as any)?.message ?? 'Erreur lors du chargement des patients');
          hasMore = false;
        }
      }
      setPatients(allPatients);
    } catch (err: any) {
      setLoadError(err?.message ?? 'Connexion impossible au serveur');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api, searchQuery]);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const t = setTimeout(() => loadData(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

  // ─── Delete ───────────────────────────────────────────────

  const handleDeletePatient = useCallback((patient: PatientWithEncounters) => {
    if (deletingPatientId) return;
    Alert.alert(
      'Supprimer le patient',
      `Êtes-vous sûr de vouloir supprimer ${PatientUtils.getFullName(patient)} ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            if (deletingPatientId) return;
            setDeletingPatientId(patient.id);
            try {
              const res = await api.delete(`/patients/${patient.id}/`);
              if (res.success) {
                setPatients(prev => prev.filter(p => p.id !== patient.id));
                Alert.alert('Succès', 'Patient supprimé.');
              } else {
                Alert.alert('Erreur', res.error?.message ?? 'Impossible de supprimer ce patient.');
              }
            } catch {
              Alert.alert('Erreur', 'Suppression impossible pour le moment.');
            } finally {
              setDeletingPatientId(null);
            }
          },
        },
      ]
    );
  }, [api, deletingPatientId]);

  // ─── Bulk Import ──────────────────────────────────────────

  const downloadTemplate = async () => {
    try {
      const templateData = [
        { first_name: 'Jean', last_name: 'Dupont', date_of_birth: '1985-03-15', gender: 'male', phone: '+243812345678', email: 'jean.dupont@example.cd', address: '12 Ave Kasavubu, Lubumbashi', city: 'Lubumbashi', blood_type: 'A+', emergency_contact_name: 'Marie Dupont', emergency_contact_phone: '+243821234567', insurance_provider: 'SONAS', insurance_number: 'INS-001', patient_number: '' },
        { first_name: 'Marie', last_name: 'Kabila', date_of_birth: '1990-07-22', gender: 'female', phone: '+243821456789', email: 'marie.kabila@example.cd', address: '45 Ave Mobutu, Kinshasa', city: 'Kinshasa', blood_type: 'O+', emergency_contact_name: 'Paul Kabila', emergency_contact_phone: '+243833456789', insurance_provider: '', insurance_number: '', patient_number: '' },
      ];
      const instructions = [
        { Colonne: 'first_name', Obligatoire: 'OUI', Description: 'Prénom', Exemple: 'Jean' },
        { Colonne: 'last_name', Obligatoire: 'OUI', Description: 'Nom de famille', Exemple: 'Dupont' },
        { Colonne: 'date_of_birth', Obligatoire: 'NON', Description: 'AAAA-MM-JJ ou JJ/MM/AAAA', Exemple: '1985-03-15' },
        { Colonne: 'gender', Obligatoire: 'NON', Description: 'male / female / other', Exemple: 'male' },
        { Colonne: 'phone', Obligatoire: 'NON', Description: 'Téléphone (max 20 car.)', Exemple: '+243812345678' },
        { Colonne: 'email', Obligatoire: 'NON', Description: 'Email', Exemple: 'jean@mail.com' },
        { Colonne: 'address', Obligatoire: 'NON', Description: 'Adresse', Exemple: '12 Ave Kasavubu' },
        { Colonne: 'city', Obligatoire: 'NON', Description: 'Ville', Exemple: 'Lubumbashi' },
        { Colonne: 'blood_type', Obligatoire: 'NON', Description: 'Groupe sanguin', Exemple: 'A+' },
        { Colonne: 'emergency_contact_name', Obligatoire: 'NON', Description: 'Contact urgence — nom', Exemple: 'Marie Dupont' },
        { Colonne: 'emergency_contact_phone', Obligatoire: 'NON', Description: 'Contact urgence — tél.', Exemple: '+243821234567' },
        { Colonne: 'insurance_provider', Obligatoire: 'NON', Description: 'Assureur', Exemple: 'SONAS' },
        { Colonne: 'insurance_number', Obligatoire: 'NON', Description: 'N° assurance', Exemple: 'INS-001' },
        { Colonne: 'patient_number', Obligatoire: 'NON', Description: 'Laisser vide — généré automatiquement', Exemple: '' },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(templateData), 'Patients');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(instructions), 'Instructions');
      const fileName = `patients_template_${new Date().toISOString().split('T')[0]}.xlsx`;
      if (Platform.OS === 'web') {
        XLSX.writeFile(wb, fileName);
        Alert.alert('Succès', `Modèle téléchargé : ${fileName}`);
      } else {
        const { default: FileSystem } = await import('expo-file-system');
        const { default: Sharing } = await import('expo-sharing');
        const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, wbout, { encoding: FileSystem.EncodingType.Base64 });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert('Succès', `Modèle enregistré : ${fileName}`);
        }
      }
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de télécharger le modèle.');
    }
  };

  const handleBulkImport = async () => {
    if (importLoading) return;
    try {
      const pickerResult = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
        ],
        copyToCacheDirectory: true,
      });
      if (pickerResult.canceled || !pickerResult.assets?.length) return;

      const file = pickerResult.assets[0];
      setImportLoading(true);
      setImportResult(null);
      setShowImportModal(true);

      let rawRows: any[];
      if (Platform.OS === 'web') {
        const response = await fetch(file.uri);
        const ab = await response.arrayBuffer();
        const wb = XLSX.read(ab, { type: 'array' });
        rawRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      } else {
        const { default: FileSystem } = await import('expo-file-system');
        const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
        const wb = XLSX.read(base64, { type: 'base64' });
        rawRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      }

      if (!rawRows?.length) {
        setImportLoading(false);
        setImportResult({ error: 'Le fichier est vide ou ne contient pas de données valides.' });
        return;
      }

      const validRows = rawRows.filter((r: any) =>
        (r.first_name || r.firstName || '').toString().trim() &&
        (r.last_name || r.lastName || '').toString().trim()
      );
      if (!validRows.length) {
        setImportLoading(false);
        setImportResult({ error: `Aucune ligne valide. Les colonnes "first_name" et "last_name" sont obligatoires.\n${rawRows.length} ligne(s) dans le fichier.` });
        return;
      }

      const payload = validRows.map((r: any) => ({
        first_name: (r.first_name || r.firstName || '').toString().trim(),
        last_name: (r.last_name || r.lastName || '').toString().trim(),
        middle_name: (r.middle_name || r.middleName || '').toString().trim(),
        date_of_birth: (r.date_of_birth || r.dateOfBirth || '1990-01-01').toString().trim(),
        gender: (r.gender || 'other').toString().toLowerCase().trim(),
        phone: (r.phone || '').toString().trim().slice(0, 20),
        email: (r.email || '').toString().trim(),
        address: (r.address || '').toString().trim(),
        city: (r.city || '').toString().trim(),
        blood_type: (r.blood_type || r.bloodType || '').toString().trim(),
        emergency_contact_name: (r.emergency_contact_name || r.emergencyContactName || '').toString().trim(),
        emergency_contact_phone: (r.emergency_contact_phone || r.emergencyContactPhone || '').toString().trim().slice(0, 20),
        insurance_provider: (r.insurance_provider || r.insuranceProvider || '').toString().trim(),
        insurance_number: (r.insurance_number || r.insuranceNumber || '').toString().trim(),
        patient_number: (r.patient_number || r.patientNumber || '').toString().trim(),
        notes: (r.notes || '').toString().trim(),
      }));

      const res = await api.post('/patients/bulk-import/', payload);
      if (res.success) {
        await loadData();
        setImportResult(res.data as ImportResult);
      } else {
        setImportResult({ error: res.error?.message ?? 'Erreur lors de l\'import.' });
      }
    } catch (err: any) {
      setImportResult({ error: err?.message ?? 'Erreur inattendue lors de l\'import.' });
    } finally {
      setImportLoading(false);
    }
  };

  // ─── Filtering & Sorting ──────────────────────────────────

  const filtered = patients.filter(p => {
    if (activeTab === 'active') return p.status === 'active';
    if (activeTab === 'inactive') return p.status === 'inactive';
    if (activeTab === 'recent') {
      if (!p.lastVisit) return false;
      return Date.now() - new Date(p.lastVisit).getTime() < 30 * 24 * 60 * 60 * 1000;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const parseDateToTs = (value?: string) => {
      if (!value) return 0;
      const ts = new Date(value).getTime();
      return Number.isNaN(ts) ? 0 : ts;
    };
    if (sortBy === 'name') return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
    if (sortBy === 'number') return a.patientNumber.localeCompare(b.patientNumber);
    return parseDateToTs(b.lastVisit || b.createdAt) - parseDateToTs(a.lastVisit || a.createdAt);
  });

  // ─── Loading ──────────────────────────────────────────────

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.loadingText}>Chargement des patients...</Text>
      </View>
    );
  }

  // ─── Render ───────────────────────────────────────────────

  return (
    <View style={s.root}>
      {/* ── Header ──────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Ionicons name="people" size={24} color={colors.primary} />
          <View style={{ marginLeft: 12 }}>
            <Text style={s.headerTitle}>Gestion des Patients</Text>
            <Text style={s.headerSub}>{stats.total} patient{stats.total !== 1 ? 's' : ''} enregistré{stats.total !== 1 ? 's' : ''}</Text>
          </View>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.importBtn} activeOpacity={0.7} onPress={handleBulkImport}>
            <Ionicons name="cloud-upload-outline" size={17} color={colors.secondary} />
            <Text style={s.importBtnText}>Importer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.addBtn} activeOpacity={0.7} onPress={onNewPatient}>
            <Ionicons name="person-add" size={17} color="#FFF" />
            <Text style={s.addBtnText}>Nouveau</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Error Banner ─────────────────────────────────── */}
      {loadError && (
        <View style={s.errorBanner}>
          <Ionicons name="warning-outline" size={16} color={colors.error} />
          <Text style={s.errorText}>{loadError}</Text>
          <TouchableOpacity onPress={() => { setLoading(true); loadData(); }}>
            <Text style={s.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── KPI Cards ───────────────────────────────────── */}
      <View style={s.kpiRow}>
        <KPICard icon="people" label="Total" value={`${stats.total}`} color={colors.primary} />
        <KPICard icon="checkmark-circle" label="Actifs" value={`${stats.active}`} color="#10B981" />
        <KPICard icon="person-add" label="Ce mois" value={`${stats.newThisMonth}`} color="#3B82F6" />
        <KPICard icon="male-female" label="H / F" value={`${stats.byGender.male} / ${stats.byGender.female}`} color={colors.secondary} />
      </View>

      {/* ── Search & Filters ────────────────────────────── */}
      <View style={s.filterRow}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={s.searchInput}
            placeholder="Rechercher par nom, N° patient, téléphone..."
            placeholderTextColor={colors.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Tabs ────────────────────────────────────────── */}
      <View style={s.tabRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
          {([
            { key: 'all',      label: 'Tous',        icon: 'people-outline' },
            { key: 'active',   label: 'Actifs',      icon: 'checkmark-circle-outline' },
            { key: 'recent',   label: 'Récents 30j', icon: 'time-outline' },
            { key: 'inactive', label: 'Inactifs',    icon: 'person-remove-outline' },
          ] as const).map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[s.tab, activeTab === tab.key && s.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons name={tab.icon as any} size={15} color={activeTab === tab.key ? colors.onPrimary : colors.textSecondary} />
              <Text style={[s.tabText, activeTab === tab.key && s.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sort */}
        <View style={s.sortRow}>
          <Text style={s.sortLabel}>Trier:</Text>
          {([
            { key: 'recent', label: 'Récent' },
            { key: 'name',   label: 'Nom' },
            { key: 'number', label: 'N°' },
          ] as const).map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[s.sortChip, sortBy === opt.key && s.sortChipActive]}
              onPress={() => setSortBy(opt.key)}
            >
              <Text style={[s.sortChipText, sortBy === opt.key && s.sortChipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Patient List ────────────────────────────────── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {sorted.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="people-outline" size={56} color={colors.textTertiary} />
            <Text style={s.emptyTitle}>
              {searchQuery ? 'Aucun patient trouvé' : 'Aucun patient enregistré'}
            </Text>
            <Text style={s.emptySub}>
              {searchQuery
                ? `Aucun résultat pour "${searchQuery}"`
                : 'Commencez par enregistrer votre premier patient'}
            </Text>
            {!searchQuery && (
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <TouchableOpacity style={s.emptyBtnOutline} onPress={handleBulkImport}>
                  <Ionicons name="cloud-upload-outline" size={17} color={colors.primary} />
                  <Text style={[s.emptyBtnText, { color: colors.primary }]}>Importer Excel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.emptyBtn} onPress={onNewPatient}>
                  <Ionicons name="person-add" size={17} color="#FFF" />
                  <Text style={s.emptyBtnText}>Nouveau patient</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={s.grid}>
            {sorted.map((patient, index) => (
              <React.Fragment key={patient.id}>
                <PatientCard
                  patient={patient}
                  onPress={() => onSelectPatient?.(patient)}
                  onDelete={() => handleDeletePatient(patient)}
                  deleting={deletingPatientId === patient.id}
                />
                {index < sorted.length - 1 && <View style={s.separator} />}
              </React.Fragment>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Import Modal ─────────────────────────────────── */}
      <ImportModal
        visible={showImportModal}
        loading={importLoading}
        result={importResult}
        onClose={() => { setShowImportModal(false); setImportResult(null); }}
        onDownloadTemplate={downloadTemplate}
        onRetry={() => { setShowImportModal(false); setImportResult(null); handleBulkImport(); }}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// KPICard
// ═══════════════════════════════════════════════════════════════

function KPICard({ icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const textColor = getTextColor(color);
  const iconBgColor = getIconBackgroundColor(textColor);
  const secondaryTextColor = getSecondaryTextColor(textColor);
  
  return (
    <View style={[s.kpiCard, { backgroundColor: color }]}>
      <View style={[s.kpiIcon, { backgroundColor: iconBgColor }]}>
        <Ionicons name={icon} size={22} color={textColor} />
      </View>
      <Text style={[s.kpiValue, { color: textColor }]}>{value}</Text>
      <Text style={[s.kpiLabel, { color: secondaryTextColor }]}>{label}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// PatientCard
// ═══════════════════════════════════════════════════════════════

function PatientCard({
  patient,
  onPress,
  onDelete,
  deleting,
}: {
  patient: PatientWithEncounters;
  onPress: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const fullName = PatientUtils.getFullName(patient);
  const ageRaw = PatientUtils.getAge(patient);
  const ageLabel = patient.dateOfBirth && !isNaN(ageRaw) && ageRaw >= 0 ? `${ageRaw} ans` : '—';
  const genderLabel = patient.gender === 'male' ? 'H' : patient.gender === 'female' ? 'F' : 'A';
  const genderColor = patient.gender === 'male' ? '#3B82F6' : patient.gender === 'female' ? '#EC4899' : '#8B5CF6';
  const initials = `${patient.firstName?.[0] ?? '?'}${patient.lastName?.[0] ?? '?'}`.toUpperCase();
  const lastVisitFormatted = patient.lastVisit
    ? new Date(patient.lastVisit).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Jamais';

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.75}>
      <View style={s.cardTop}>
        {/* Avatar */}
        <View style={[s.avatar, { backgroundColor: genderColor + '18' }]}>
          <Text style={[s.avatarText, { color: genderColor }]}>{initials}</Text>
        </View>

        {/* Info */}
        <View style={s.cardInfo}>
          <Text style={s.cardName} numberOfLines={1}>{fullName}</Text>
          <View style={s.cardMetaRow}>
            <Text style={s.cardMeta}>{patient.patientNumber}</Text>
            <View style={s.dot} />
            <Text style={s.cardMeta}>{ageLabel}</Text>
            <View style={s.dot} />
            <View style={[s.genderBadge, { backgroundColor: genderColor + '18' }]}>
              <Text style={[s.genderText, { color: genderColor }]}>{genderLabel}</Text>
            </View>
          </View>
        </View>

        {/* Delete */}
        <TouchableOpacity
          style={s.deleteBtn}
          onPress={e => { e.stopPropagation?.(); onDelete(); }}
          disabled={deleting}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <Ionicons name="trash-outline" size={16} color={colors.error} />
          )}
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} style={{ marginLeft: 4 }} />
      </View>

      {/* Chips */}
      <View style={s.cardBottom}>
        {!!patient.phone && (
          <View style={s.infoChip}>
            <Ionicons name="call-outline" size={12} color={colors.textSecondary} />
            <Text style={s.infoChipText}>{patient.phone}</Text>
          </View>
        )}
        {!!patient.bloodType && (
          <View style={[s.infoChip, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="water" size={12} color={colors.error} />
            <Text style={[s.infoChipText, { color: colors.error }]}>{patient.bloodType}</Text>
          </View>
        )}
        {patient.allergies.length > 0 && (
          <View style={[s.infoChip, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="warning" size={12} color={colors.warning} />
            <Text style={[s.infoChipText, { color: colors.warning }]}>
              {patient.allergies.length} allergie{patient.allergies.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}
        {patient.status === 'inactive' && (
          <View style={[s.infoChip, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[s.infoChipText, { color: colors.textSecondary }]}>Inactif</Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={s.cardFooter}>
        <Text style={s.footerText}>Dernière visite: {lastVisitFormatted}</Text>
        <Text style={s.footerText}>{patient.city || '—'}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════════
// ImportModal
// ═══════════════════════════════════════════════════════════════

function ImportModal({
  visible, loading, result, onClose, onDownloadTemplate, onRetry,
}: {
  visible: boolean;
  loading: boolean;
  result: ImportResult | null;
  onClose: () => void;
  onDownloadTemplate: () => void;
  onRetry: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalBox}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Import de patients</Text>
            {!loading && (
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View style={s.modalBody}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[s.modalBodyText, { marginTop: 16 }]}>Importation en cours...</Text>
            </View>
          ) : result ? (
            <View style={s.modalBody}>
              {result.error ? (
                <>
                  <Ionicons name="close-circle" size={48} color={colors.error} />
                  <Text style={[s.modalBodyText, { color: colors.error, marginTop: 12, textAlign: 'center' }]}>{result.error}</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                  <Text style={[s.modalBodyText, { fontWeight: '700', fontSize: 18, marginTop: 12 }]}>Import terminé</Text>
                  <View style={s.resultGrid}>
                    <ResultStat label="Créés" value={result.created ?? 0} color="#10B981" />
                    <ResultStat label="Mis à jour" value={result.updated ?? 0} color="#3B82F6" />
                    <ResultStat label="Erreurs" value={result.errors ?? 0} color={result.errors ? colors.error : colors.textTertiary} />
                  </View>
                  {result.error_details && result.error_details.length > 0 && (
                    <ScrollView style={s.errorList}>
                      {result.error_details.map((e, i) => (
                        <Text key={i} style={s.errorItem}>Ligne {e.row}: {e.error}</Text>
                      ))}
                    </ScrollView>
                  )}
                </>
              )}
            </View>
          ) : null}

          {!loading && (
            <View style={s.modalFooter}>
              <TouchableOpacity style={s.modalBtnOutline} onPress={onDownloadTemplate}>
                <Ionicons name="download-outline" size={16} color={colors.secondary} />
                <Text style={[s.modalBtnText, { color: colors.secondary }]}>Modèle Excel</Text>
              </TouchableOpacity>
              {result?.error && (
                <TouchableOpacity style={[s.modalBtn, { backgroundColor: colors.secondary }]} onPress={onRetry}>
                  <Ionicons name="refresh" size={16} color="#FFF" />
                  <Text style={[s.modalBtnText, { color: '#FFF' }]}>Réessayer</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: colors.primary }]} onPress={onClose}>
                <Text style={[s.modalBtnText, { color: '#FFF' }]}>Fermer</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function ResultStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={s.resultStat}>
      <Text style={[s.resultStatValue, { color }]}>{value}</Text>
      <Text style={s.resultStatLabel}>{label}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.textSecondary },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 16,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.outline,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  headerSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 10 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9, gap: 7,
  },
  addBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  importBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.secondary,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9, gap: 7,
    backgroundColor: colors.surface,
  },
  importBtnText: { color: colors.secondary, fontSize: 14, fontWeight: '600' },

  // Error banner
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', paddingHorizontal: 20, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#FECACA',
  },
  errorText: { flex: 1, fontSize: 13, color: colors.error },
  retryText: { fontSize: 13, color: colors.secondary, fontWeight: '600' },

  // KPI
  kpiRow: {
    flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8,
  },
  kpiCard: {
    flex: 1, borderRadius: 12, padding: 16,
    alignItems: 'center', ...shadows.md,
  },
  kpiIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kpiValue: { fontSize: 20, fontWeight: '800' },
  kpiLabel: { fontSize: 12, marginTop: 2, fontWeight: '600' },

  // Separator
  separator: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    marginVertical: 8,
    marginHorizontal: isDesktop ? 0 : 4,
  },

  // Filter / Search
  filterRow: { paddingHorizontal: 24, paddingVertical: 10 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.outline, gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },

  // Tabs
  tabRow: {
    flexDirection: isDesktop ? 'row' : 'column',
    alignItems: isDesktop ? 'center' : 'stretch',
    justifyContent: 'space-between',
    paddingBottom: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.outline,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8, backgroundColor: colors.background, marginRight: 8, gap: 6,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  tabTextActive: { color: colors.onPrimary },
  sortRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 6, gap: 6,
  },
  sortLabel: { fontSize: 12, color: colors.textTertiary, marginRight: 4 },
  sortChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.outline,
  },
  sortChipActive: { backgroundColor: colors.primaryFaded, borderColor: colors.primary },
  sortChipText: { fontSize: 12, color: colors.textSecondary },
  sortChipTextActive: { color: colors.primary, fontWeight: '600' },

  // Scroll / Grid
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
  grid: {
    flexDirection: isDesktop ? 'row' : 'column',
    flexWrap: 'wrap',
    gap: 12,
  },

  // Patient Card
  card: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.outline,
    flexBasis: isDesktop ? '48%' : '100%', flexGrow: 0,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '600', color: colors.text },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  cardMeta: { fontSize: 12, color: colors.textSecondary },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.textTertiary },
  genderBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  genderText: { fontSize: 11, fontWeight: '700' },
  deleteBtn: {
    padding: 5, borderRadius: 6, backgroundColor: '#FEE2E2',
  },

  // Card bottom
  cardBottom: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  infoChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.surfaceVariant, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  infoChipText: { fontSize: 11, color: colors.textSecondary },

  // Footer
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: colors.outlineVariant, paddingTop: 8,
  },
  footerText: { fontSize: 11, color: colors.textTertiary },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 64, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  emptySub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', maxWidth: 300 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary,
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, gap: 8,
  },
  emptyBtnOutline: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.primary,
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, gap: 8,
  },
  emptyBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  // Import Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalBox: {
    backgroundColor: colors.surface, borderRadius: 16,
    width: '100%', maxWidth: 480,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.outline,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  modalBody: { padding: 24, alignItems: 'center', minHeight: 140 },
  modalBodyText: { fontSize: 14, color: colors.text },
  resultGrid: { flexDirection: 'row', gap: 24, marginTop: 16 },
  resultStat: { alignItems: 'center' },
  resultStatValue: { fontSize: 28, fontWeight: '800' },
  resultStatLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  errorList: { maxHeight: 120, width: '100%', marginTop: 12 },
  errorItem: { fontSize: 11, color: colors.error, paddingVertical: 2 },
  modalFooter: {
    flexDirection: 'row', gap: 10, padding: 16,
    borderTopWidth: 1, borderTopColor: colors.outline, flexWrap: 'wrap', justifyContent: 'flex-end',
  },
  modalBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8,
  },
  modalBtnOutline: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: colors.secondary,
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8,
  },
  modalBtnText: { fontSize: 14, fontWeight: '600' },
});
