import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  RefreshControl,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, shadows, spacing } from '../../../theme/theme';
import type {
  ExamVisitProtocol,
  MedicalExamCatalogEntry,
  OccDepartment,
  OccPosition,
  OccSector,
} from '../../../models/OccHealthProtocol';
import { EXAM_CATEGORY_LABELS, VISIT_TYPE_LABELS } from '../../../models/OccHealthProtocol';
import { occHealthApi } from '../../../services/OccHealthApiService';

type ProtocolTab = 'sectors' | 'departments' | 'positions' | 'protocols' | 'exams';
type EditorType = ProtocolTab;

const TABS: { key: ProtocolTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'sectors', label: 'Secteurs', icon: 'business-outline' },
  { key: 'departments', label: 'Départements', icon: 'git-network-outline' },
  { key: 'positions', label: 'Postes', icon: 'briefcase-outline' },
  { key: 'protocols', label: 'Protocoles', icon: 'document-text-outline' },
  { key: 'exams', label: 'Examens', icon: 'flask-outline' },
];

const VISIT_TYPE_OPTIONS = Object.entries(VISIT_TYPE_LABELS).map(([key, label]) => ({
  key,
  label: label || key,
}));

const EXAM_CATEGORY_OPTIONS = Object.entries(EXAM_CATEGORY_LABELS).map(([key, label]) => ({
  key,
  label,
}));

type SectorForm = {
  id?: number;
  code: string;
  name: string;
  industry_sector_key: string;
  is_active: boolean;
};

type DepartmentForm = {
  id?: number;
  sector: string;
  code: string;
  name: string;
  is_active: boolean;
};

type PositionForm = {
  id?: number;
  department: string;
  code: string;
  name: string;
  typical_exposures: string;
  recommended_ppe: string;
  is_active: boolean;
};

type ProtocolForm = {
  id?: number;
  position: string;
  visit_type: string;
  validity_months: string;
  regulatory_note: string;
  required_codes: string;
  recommended_codes: string;
  is_active: boolean;
};

type ExamForm = {
  id?: number;
  code: string;
  label: string;
  category: string;
  description: string;
  requires_specialist: boolean;
  is_active: boolean;
};

function parseCsv(value: string): string[] {
  return value
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <TouchableOpacity style={styles.toggleRow} onPress={() => onChange(!value)} activeOpacity={0.75}>
      <View>
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      <View style={[styles.togglePill, value ? styles.togglePillActive : styles.togglePillInactive]}>
        <Text style={[styles.toggleText, value ? styles.toggleTextActive : styles.toggleTextInactive]}>
          {value ? 'Actif' : 'Inactif'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function OptionChips({
  label,
  value,
  options,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {options.length === 0 ? (
        <Text style={styles.hint}>{placeholder || 'Aucune option disponible'}</Text>
      ) : (
        <View style={styles.choiceWrap}>
          {options.map((option) => {
            const selected = value === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.choiceChip, selected && styles.choiceChipActive]}
                onPress={() => onChange(option.value)}
                activeOpacity={0.75}
              >
                <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

export function ProtocolManagementScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ProtocolTab>('sectors');

  const [tree, setTree] = useState<OccSector[]>([]);
  const [exams, setExams] = useState<MedicalExamCatalogEntry[]>([]);
  const [protocols, setProtocols] = useState<ExamVisitProtocol[]>([]);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorType, setEditorType] = useState<EditorType>('sectors');
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');

  const [filterSectorId, setFilterSectorId] = useState<string>('');
  const [filterDepartmentId, setFilterDepartmentId] = useState<string>('');
  const [filterPositionId, setFilterPositionId] = useState<string>('');

  const [sectorForm, setSectorForm] = useState<SectorForm>({
    code: '',
    name: '',
    industry_sector_key: '',
    is_active: true,
  });

  const [departmentForm, setDepartmentForm] = useState<DepartmentForm>({
    sector: '',
    code: '',
    name: '',
    is_active: true,
  });

  const [positionForm, setPositionForm] = useState<PositionForm>({
    department: '',
    code: '',
    name: '',
    typical_exposures: '',
    recommended_ppe: '',
    is_active: true,
  });

  const [protocolForm, setProtocolForm] = useState<ProtocolForm>({
    position: '',
    visit_type: VISIT_TYPE_OPTIONS[0]?.key || 'pre_employment',
    validity_months: '12',
    regulatory_note: '',
    required_codes: '',
    recommended_codes: '',
    is_active: true,
  });

  const [examForm, setExamForm] = useState<ExamForm>({
    code: '',
    label: '',
    category: EXAM_CATEGORY_OPTIONS[0]?.key || 'clinique',
    description: '',
    requires_specialist: false,
    is_active: true,
  });

  const departments = useMemo(() => tree.flatMap((s) => s.departments), [tree]);
  const positions = useMemo(() => departments.flatMap((d) => d.positions), [departments]);
  const departmentsFiltered = useMemo(() => {
    if (!filterSectorId) return departments;
    const sector = tree.find((s) => String(s.id) === filterSectorId);
    return sector?.departments || [];
  }, [departments, filterSectorId, tree]);
  const positionsFiltered = useMemo(() => {
    if (filterDepartmentId) {
      const dept = departments.find((d) => String(d.id) === filterDepartmentId);
      return dept?.positions || [];
    }
    if (filterSectorId) {
      return departmentsFiltered.flatMap((d) => d.positions);
    }
    return positions;
  }, [departments, departmentsFiltered, filterDepartmentId, filterSectorId, positions]);
  const positionByCode = useMemo(() => {
    const map = new Map<string, OccPosition>();
    positions.forEach((p) => map.set(p.code, p));
    return map;
  }, [positions]);
  const selectedDepartment = useMemo(
    () => departments.find((d) => String(d.id) === filterDepartmentId),
    [departments, filterDepartmentId]
  );
  const selectedSector = useMemo(
    () => tree.find((s) => String(s.id) === filterSectorId),
    [filterSectorId, tree]
  );
  const protocolsFiltered = useMemo(() => {
    if (filterPositionId) {
      const pos = positions.find((p) => String(p.id) === filterPositionId);
      return protocols.filter((pr) => pr.positionCode === pos?.code);
    }
    if (filterDepartmentId && selectedDepartment) {
      return protocols.filter((pr) => {
        const p = positionByCode.get(pr.positionCode || '');
        return p?.departmentCode === selectedDepartment.code;
      });
    }
    if (filterSectorId && selectedSector) {
      return protocols.filter((pr) => {
        const p = positionByCode.get(pr.positionCode || '');
        return p?.sectorCode === selectedSector.code;
      });
    }
    return protocols;
  }, [filterDepartmentId, filterPositionId, filterSectorId, positionByCode, positions, protocols, selectedDepartment, selectedSector]);
  const examByCode = useMemo(() => {
    const map = new Map<string, MedicalExamCatalogEntry>();
    exams.forEach((e) => map.set(e.code, e));
    return map;
  }, [exams]);

  const reloadData = useCallback(async (isPullToRefresh = false) => {
    if (isPullToRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [treeRes, examsRes, protocolRes] = await Promise.all([
        occHealthApi.getSectorTree(true),
        occHealthApi.listExamCatalog(),
        occHealthApi.listVisitProtocols(),
      ]);

      if (treeRes.error) {
        Alert.alert('Erreur', treeRes.error);
      }

      if (examsRes.error) {
        Alert.alert('Erreur', examsRes.error);
      }

      if (protocolRes.error) {
        Alert.alert('Erreur', protocolRes.error);
      }

      setTree(treeRes.data || []);
      setExams(examsRes.data || []);
      setProtocols(protocolRes.data || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  const resetForms = () => {
    setSectorForm({ code: '', name: '', industry_sector_key: '', is_active: true });
    setDepartmentForm({ sector: '', code: '', name: '', is_active: true });
    setPositionForm({ department: '', code: '', name: '', typical_exposures: '', recommended_ppe: '', is_active: true });
    setProtocolForm({
      position: '',
      visit_type: VISIT_TYPE_OPTIONS[0]?.key || 'pre_employment',
      validity_months: '12',
      regulatory_note: '',
      required_codes: '',
      recommended_codes: '',
      is_active: true,
    });
    setExamForm({ code: '', label: '', category: EXAM_CATEGORY_OPTIONS[0]?.key || 'clinique', description: '', requires_specialist: false, is_active: true });
  };

  const openCreate = (type: EditorType) => {
    resetForms();
    if (type === 'departments' && filterSectorId) {
      setDepartmentForm((prev) => ({ ...prev, sector: filterSectorId }));
    }
    if (type === 'positions' && filterDepartmentId) {
      setPositionForm((prev) => ({ ...prev, department: filterDepartmentId }));
    }
    if (type === 'protocols' && filterPositionId) {
      setProtocolForm((prev) => ({ ...prev, position: filterPositionId }));
    }
    setEditorType(type);
    setEditorMode('create');
    setEditorOpen(true);
  };

  const openEditSector = (item: OccSector) => {
    setSectorForm({
      id: item.id,
      code: item.code,
      name: item.name,
      industry_sector_key: item.industrySectorKey || '',
      is_active: item.isActive !== false,
    });
    setEditorType('sectors');
    setEditorMode('edit');
    setEditorOpen(true);
  };

  const openEditDepartment = (item: OccDepartment) => {
    const sectorId = tree.find((s) => s.code === item.sectorCode)?.id;
    setDepartmentForm({
      id: item.id,
      sector: sectorId ? String(sectorId) : '',
      code: item.code,
      name: item.name,
      is_active: item.isActive !== false,
    });
    setEditorType('departments');
    setEditorMode('edit');
    setEditorOpen(true);
  };

  const openEditPosition = (item: OccPosition) => {
    const deptId = departments.find((d) => d.code === item.departmentCode)?.id;
    setPositionForm({
      id: item.id,
      department: deptId ? String(deptId) : '',
      code: item.code,
      name: item.name,
      typical_exposures: (item.typicalExposures || []).join(', '),
      recommended_ppe: (item.recommendedPPE || []).join(', '),
      is_active: item.isActive !== false,
    });
    setEditorType('positions');
    setEditorMode('edit');
    setEditorOpen(true);
  };

  const openEditProtocol = async (item: ExamVisitProtocol) => {
    if (!item.id) return;
    setLoading(true);
    try {
      const detail = await occHealthApi.getVisitProtocol(item.id);
      if (detail.error || !detail.data) {
        Alert.alert('Erreur', detail.error || 'Impossible de charger le protocole.');
        return;
      }
      setProtocolForm({
        id: detail.data.id,
        position: detail.data.positionCode ? String(positions.find((p) => p.code === detail.data.positionCode)?.id || '') : '',
        visit_type: detail.data.visitType,
        validity_months: String(detail.data.validityMonths || 12),
        regulatory_note: detail.data.regulatoryNote || '',
        required_codes: (detail.data.requiredExams || []).join(', '),
        recommended_codes: (detail.data.recommendedExams || []).join(', '),
        is_active: detail.data.isActive !== false,
      });
      setEditorType('protocols');
      setEditorMode('edit');
      setEditorOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const openEditExam = (item: MedicalExamCatalogEntry) => {
    setExamForm({
      id: item.id,
      code: item.code,
      label: item.label,
      category: item.category,
      description: item.description || '',
      requires_specialist: !!item.requiresSpecialist,
      is_active: item.isActive !== false,
    });
    setEditorType('exams');
    setEditorMode('edit');
    setEditorOpen(true);
  };

  const confirmDelete = (label: string, onConfirm: () => Promise<void>) => {
    Alert.alert('Confirmation', `Supprimer ${label} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          onConfirm().catch((e) => {
            Alert.alert('Erreur', e?.message || 'Suppression impossible');
          });
        },
      },
    ]);
  };

  const syncRequiredExams = async (protocolId: number, desiredCodes: string[]) => {
    const detailRes = await occHealthApi.getVisitProtocol(protocolId);
    if (detailRes.error || !detailRes.data) {
      throw new Error(detailRes.error || 'Impossible de synchroniser les examens requis');
    }

    const currentCodes = detailRes.data.requiredExams || [];
    const toAdd = desiredCodes.filter((code) => !currentCodes.includes(code));
    const toRemove = currentCodes.filter((code) => !desiredCodes.includes(code));

    for (const code of toAdd) {
      const exam = examByCode.get(code);
      if (exam?.id) {
        const addRes = await occHealthApi.addRequiredExam(protocolId, {
          exam_id: exam.id,
          order: desiredCodes.indexOf(code) + 1,
          is_blocking: true,
        });
        if (addRes.error) throw new Error(addRes.error);
      }
    }

    for (const code of toRemove) {
      const exam = examByCode.get(code);
      if (exam?.id) {
        const removeRes = await occHealthApi.removeRequiredExam(protocolId, exam.id);
        if (removeRes.error) throw new Error(removeRes.error);
      }
    }
  };

  const onSave = async () => {
    setSaving(true);
    try {
      if (editorType === 'sectors') {
        if (!sectorForm.code.trim() || !sectorForm.name.trim()) {
          Alert.alert('Validation', 'Code et nom sont obligatoires.');
          return;
        }
        const payload = {
          code: sectorForm.code.trim().toUpperCase(),
          name: sectorForm.name.trim(),
          industry_sector_key: sectorForm.industry_sector_key.trim(),
          is_active: sectorForm.is_active,
        };
        const res = editorMode === 'create'
          ? await occHealthApi.createSector(payload)
          : await occHealthApi.updateSector(sectorForm.id!, payload);
        if (res.error) throw new Error(res.error);
      }

      if (editorType === 'departments') {
        if (!departmentForm.sector || !departmentForm.code.trim() || !departmentForm.name.trim()) {
          Alert.alert('Validation', 'Secteur, code et nom sont obligatoires.');
          return;
        }
        const payload = {
          sector: Number(departmentForm.sector),
          code: departmentForm.code.trim().toUpperCase(),
          name: departmentForm.name.trim(),
          is_active: departmentForm.is_active,
        };
        const res = editorMode === 'create'
          ? await occHealthApi.createDepartment(payload)
          : await occHealthApi.updateDepartment(departmentForm.id!, payload);
        if (res.error) throw new Error(res.error);
      }

      if (editorType === 'positions') {
        if (!positionForm.department || !positionForm.code.trim() || !positionForm.name.trim()) {
          Alert.alert('Validation', 'Département, code et nom sont obligatoires.');
          return;
        }
        const payload = {
          department: Number(positionForm.department),
          code: positionForm.code.trim().toUpperCase(),
          name: positionForm.name.trim(),
          typical_exposures: parseCsv(positionForm.typical_exposures),
          recommended_ppe: parseCsv(positionForm.recommended_ppe),
          is_active: positionForm.is_active,
        };
        const res = editorMode === 'create'
          ? await occHealthApi.createPosition(payload)
          : await occHealthApi.updatePosition(positionForm.id!, payload);
        if (res.error) throw new Error(res.error);
      }

      if (editorType === 'protocols') {
        if (!protocolForm.position || !protocolForm.visit_type) {
          Alert.alert('Validation', 'Poste et type de visite sont obligatoires.');
          return;
        }

        const recommendedCodes = parseCsv(protocolForm.recommended_codes);
        const recommendedIds = recommendedCodes
          .map((code) => examByCode.get(code)?.id)
          .filter((id): id is number => typeof id === 'number');

        const payload = {
          position: Number(protocolForm.position),
          visit_type: protocolForm.visit_type,
          validity_months: Number(protocolForm.validity_months || '12'),
          regulatory_note: protocolForm.regulatory_note.trim(),
          recommended_exams: recommendedIds,
          is_active: protocolForm.is_active,
        };

        const res = editorMode === 'create'
          ? await occHealthApi.createVisitProtocol(payload)
          : await occHealthApi.updateVisitProtocol(protocolForm.id!, payload);
        if (res.error || !res.data?.id) throw new Error(res.error || 'Erreur lors de la sauvegarde du protocole');

        await syncRequiredExams(res.data.id, parseCsv(protocolForm.required_codes));
      }

      if (editorType === 'exams') {
        if (!examForm.code.trim() || !examForm.label.trim() || !examForm.category) {
          Alert.alert('Validation', 'Code, libellé et catégorie sont obligatoires.');
          return;
        }

        const payload = {
          code: examForm.code.trim().toUpperCase(),
          label: examForm.label.trim(),
          category: examForm.category,
          description: examForm.description.trim(),
          requires_specialist: examForm.requires_specialist,
          is_active: examForm.is_active,
        };
        const res = editorMode === 'create'
          ? await occHealthApi.createExamCatalog(payload)
          : await occHealthApi.updateExamCatalog(examForm.id!, payload);
        if (res.error) throw new Error(res.error);
      }

      setEditorOpen(false);
      await reloadData();
      Alert.alert('Succès', 'Données sauvegardées avec succès.');
    } catch (e: any) {
      Alert.alert('Erreur', e?.message || 'Impossible de sauvegarder.');
    } finally {
      setSaving(false);
    }
  };

  const renderEditor = () => {
    if (editorType === 'sectors') {
      return (
        <>
          <Text style={styles.fieldLabel}>Code *</Text>
          <TextInput style={styles.input} value={sectorForm.code} onChangeText={(v) => setSectorForm((s) => ({ ...s, code: v }))} placeholder="MIN" />
          <Text style={styles.fieldLabel}>Nom *</Text>
          <TextInput style={styles.input} value={sectorForm.name} onChangeText={(v) => setSectorForm((s) => ({ ...s, name: v }))} placeholder="Secteur Minier" />
          <Text style={styles.fieldLabel}>Clé industrie</Text>
          <TextInput style={styles.input} value={sectorForm.industry_sector_key} onChangeText={(v) => setSectorForm((s) => ({ ...s, industry_sector_key: v }))} placeholder="mining" />
          <ToggleField label="Statut" value={sectorForm.is_active} onChange={(v) => setSectorForm((s) => ({ ...s, is_active: v }))} />
        </>
      );
    }

    if (editorType === 'departments') {
      const sectorOptions = tree
        .filter((s) => s.id)
        .map((s) => ({ value: String(s.id), label: `${s.code} · ${s.name}` }));
      return (
        <>
          <OptionChips
            label="Secteur parent *"
            value={departmentForm.sector}
            options={sectorOptions}
            onChange={(v) => setDepartmentForm((s) => ({ ...s, sector: v }))}
            placeholder="Ajoutez d'abord un secteur."
          />
          <Text style={styles.fieldLabel}>Code *</Text>
          <TextInput style={styles.input} value={departmentForm.code} onChangeText={(v) => setDepartmentForm((s) => ({ ...s, code: v }))} placeholder="MIN_UNDER" />
          <Text style={styles.fieldLabel}>Nom *</Text>
          <TextInput style={styles.input} value={departmentForm.name} onChangeText={(v) => setDepartmentForm((s) => ({ ...s, name: v }))} placeholder="Mines souterraines" />
          <ToggleField label="Statut" value={departmentForm.is_active} onChange={(v) => setDepartmentForm((s) => ({ ...s, is_active: v }))} />
        </>
      );
    }

    if (editorType === 'positions') {
      const departmentOptions = departments
        .filter((d) => d.id)
        .map((d) => ({ value: String(d.id), label: `${d.code} · ${d.name}` }));
      return (
        <>
          <OptionChips
            label="Département parent *"
            value={positionForm.department}
            options={departmentOptions}
            onChange={(v) => setPositionForm((s) => ({ ...s, department: v }))}
            placeholder="Ajoutez d'abord un département."
          />
          <Text style={styles.fieldLabel}>Code *</Text>
          <TextInput style={styles.input} value={positionForm.code} onChangeText={(v) => setPositionForm((s) => ({ ...s, code: v }))} placeholder="FOREUR" />
          <Text style={styles.fieldLabel}>Nom *</Text>
          <TextInput style={styles.input} value={positionForm.name} onChangeText={(v) => setPositionForm((s) => ({ ...s, name: v }))} placeholder="Foreur / Dynamiteur" />
          <Text style={styles.fieldLabel}>Expositions typiques (CSV)</Text>
          <TextInput style={styles.input} value={positionForm.typical_exposures} onChangeText={(v) => setPositionForm((s) => ({ ...s, typical_exposures: v }))} placeholder="silica_dust, noise" />
          <Text style={styles.fieldLabel}>EPI recommandés (CSV)</Text>
          <TextInput style={styles.input} value={positionForm.recommended_ppe} onChangeText={(v) => setPositionForm((s) => ({ ...s, recommended_ppe: v }))} placeholder="hard_hat, ear_plugs" />
          <ToggleField label="Statut" value={positionForm.is_active} onChange={(v) => setPositionForm((s) => ({ ...s, is_active: v }))} />
        </>
      );
    }

    if (editorType === 'protocols') {
      const positionOptions = positions
        .filter((p) => p.id)
        .map((p) => ({ value: String(p.id), label: `${p.code} · ${p.name}` }));
      const visitOptions = VISIT_TYPE_OPTIONS.map((v) => ({ value: v.key, label: v.label }));
      return (
        <>
          <OptionChips
            label="Poste cible *"
            value={protocolForm.position}
            options={positionOptions}
            onChange={(v) => setProtocolForm((s) => ({ ...s, position: v }))}
            placeholder="Ajoutez d'abord un poste."
          />
          <OptionChips
            label="Type de visite *"
            value={protocolForm.visit_type}
            options={visitOptions}
            onChange={(v) => setProtocolForm((s) => ({ ...s, visit_type: v }))}
          />
          <Text style={styles.fieldLabel}>Validité (mois)</Text>
          <TextInput style={styles.input} value={protocolForm.validity_months} onChangeText={(v) => setProtocolForm((s) => ({ ...s, validity_months: v }))} keyboardType="number-pad" />
          <Text style={styles.fieldLabel}>Codes examens requis (CSV)</Text>
          <TextInput style={styles.input} value={protocolForm.required_codes} onChangeText={(v) => setProtocolForm((s) => ({ ...s, required_codes: v }))} placeholder="RADIO_THORAX, NFS" />
          <Text style={styles.fieldLabel}>Codes examens recommandés (CSV)</Text>
          <TextInput style={styles.input} value={protocolForm.recommended_codes} onChangeText={(v) => setProtocolForm((s) => ({ ...s, recommended_codes: v }))} placeholder="ECG_REPOS" />
          <Text style={styles.fieldLabel}>Note réglementaire</Text>
          <TextInput style={[styles.input, styles.multilineInput]} value={protocolForm.regulatory_note} onChangeText={(v) => setProtocolForm((s) => ({ ...s, regulatory_note: v }))} multiline />
          <ToggleField label="Statut" value={protocolForm.is_active} onChange={(v) => setProtocolForm((s) => ({ ...s, is_active: v }))} />
        </>
      );
    }

    return (
      <>
        <Text style={styles.fieldLabel}>Code *</Text>
        <TextInput style={styles.input} value={examForm.code} onChangeText={(v) => setExamForm((s) => ({ ...s, code: v }))} placeholder="RADIO_THORAX" />
        <Text style={styles.fieldLabel}>Libellé *</Text>
        <TextInput style={styles.input} value={examForm.label} onChangeText={(v) => setExamForm((s) => ({ ...s, label: v }))} placeholder="Radiographie thoracique" />
        <Text style={styles.fieldLabel}>Catégorie *</Text>
        <TextInput style={styles.input} value={examForm.category} onChangeText={(v) => setExamForm((s) => ({ ...s, category: v }))} placeholder={EXAM_CATEGORY_OPTIONS.map((v) => v.key).join(', ')} />
        <Text style={styles.fieldLabel}>Description</Text>
        <TextInput style={[styles.input, styles.multilineInput]} value={examForm.description} onChangeText={(v) => setExamForm((s) => ({ ...s, description: v }))} multiline />
        <ToggleField label="Spécialiste requis" value={examForm.requires_specialist} onChange={(v) => setExamForm((s) => ({ ...s, requires_specialist: v }))} />
        <ToggleField label="Statut" value={examForm.is_active} onChange={(v) => setExamForm((s) => ({ ...s, is_active: v }))} />
      </>
    );
  };

  const renderRows = () => {
    if (activeTab === 'sectors') {
      return tree.map((item) => (
        <View key={item.id || item.code} style={styles.rowCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <Text style={styles.rowMeta}>{item.code} · {item.departments.length} départements</Text>
          </View>
          <View style={styles.rowActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => openEditSector(item)}><Ionicons name="create-outline" size={18} color={colors.primary} /></TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => confirmDelete(item.name, async () => {
              if (!item.id) return;
              const res = await occHealthApi.deleteSector(item.id);
              if (res.error) throw new Error(res.error);
              await reloadData();
            })}><Ionicons name="trash-outline" size={18} color={colors.error} /></TouchableOpacity>
          </View>
        </View>
      ));
    }

    if (activeTab === 'departments') {
      return departmentsFiltered.map((item) => (
        <View key={item.id || item.code} style={styles.rowCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <Text style={styles.rowMeta}>{item.code} · {item.sectorCode} · {item.positions.length} postes</Text>
          </View>
          <View style={styles.rowActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => openEditDepartment(item)}><Ionicons name="create-outline" size={18} color={colors.primary} /></TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => confirmDelete(item.name, async () => {
              if (!item.id) return;
              const res = await occHealthApi.deleteDepartment(item.id);
              if (res.error) throw new Error(res.error);
              await reloadData();
            })}><Ionicons name="trash-outline" size={18} color={colors.error} /></TouchableOpacity>
          </View>
        </View>
      ));
    }

    if (activeTab === 'positions') {
      return positionsFiltered.map((item) => (
        <View key={item.id || item.code} style={styles.rowCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <Text style={styles.rowMeta}>{item.code} · {item.departmentCode} · {item.protocols.length} protocoles</Text>
          </View>
          <View style={styles.rowActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => openEditPosition(item)}><Ionicons name="create-outline" size={18} color={colors.primary} /></TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => confirmDelete(item.name, async () => {
              if (!item.id) return;
              const res = await occHealthApi.deletePosition(item.id);
              if (res.error) throw new Error(res.error);
              await reloadData();
            })}><Ionicons name="trash-outline" size={18} color={colors.error} /></TouchableOpacity>
          </View>
        </View>
      ));
    }

    if (activeTab === 'protocols') {
      return protocolsFiltered.map((item) => (
        <View key={item.id || `${item.positionCode}-${item.visitType}`} style={styles.rowCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{item.positionCode || '—'} · {VISIT_TYPE_LABELS[item.visitType] || item.visitType}</Text>
            <Text style={styles.rowMeta}>Validité: {item.validityMonths || 12} mois · {item.isActive === false ? 'Inactif' : 'Actif'}</Text>
          </View>
          <View style={styles.rowActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => openEditProtocol(item)}><Ionicons name="create-outline" size={18} color={colors.primary} /></TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => confirmDelete(item.positionCode || 'ce protocole', async () => {
              if (!item.id) return;
              const res = await occHealthApi.deleteVisitProtocol(item.id);
              if (res.error) throw new Error(res.error);
              await reloadData();
            })}><Ionicons name="trash-outline" size={18} color={colors.error} /></TouchableOpacity>
          </View>
        </View>
      ));
    }

    return exams.map((item) => (
      <View key={item.id || item.code} style={styles.rowCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{item.label}</Text>
          <Text style={styles.rowMeta}>{item.code} · {EXAM_CATEGORY_LABELS[item.category] || item.category}</Text>
        </View>
        <View style={styles.rowActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => openEditExam(item)}><Ionicons name="create-outline" size={18} color={colors.primary} /></TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => confirmDelete(item.code, async () => {
            if (!item.id) return;
            const res = await occHealthApi.deleteExamCatalog(item.id);
            if (res.error) throw new Error(res.error);
            await reloadData();
          })}><Ionicons name="trash-outline" size={18} color={colors.error} /></TouchableOpacity>
        </View>
      </View>
    ));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Chargement des protocoles...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { padding: isDesktop ? 24 : 14 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reloadData(true)} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Gestion des Protocoles</Text>
            <Text style={styles.headerSubtitle}>CRUD complet: Secteurs, Départements, Postes, Protocoles et Catalogue d'examens</Text>
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => openCreate(activeTab)} activeOpacity={0.75}>
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={styles.primaryBtnText}>Nouveau</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabsWrap}>
          {TABS.map((tab) => {
            const selected = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabBtn, selected && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.75}
              >
                <Ionicons name={tab.icon} size={16} color={selected ? colors.primary : colors.textSecondary} />
                <Text style={[styles.tabText, selected && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {(activeTab === 'departments' || activeTab === 'positions' || activeTab === 'protocols') && (
          <View style={styles.filtersWrap}>
            <Text style={styles.filterLabel}>Filtre Secteur</Text>
            <View style={styles.choiceWrap}>
              <TouchableOpacity
                style={[styles.choiceChip, !filterSectorId && styles.choiceChipActive]}
                onPress={() => {
                  setFilterSectorId('');
                  setFilterDepartmentId('');
                  setFilterPositionId('');
                }}
              >
                <Text style={[styles.choiceChipText, !filterSectorId && styles.choiceChipTextActive]}>Tous</Text>
              </TouchableOpacity>
              {tree.filter((s) => s.id).map((s) => {
                const selected = filterSectorId === String(s.id);
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.choiceChip, selected && styles.choiceChipActive]}
                    onPress={() => {
                      setFilterSectorId(String(s.id));
                      setFilterDepartmentId('');
                      setFilterPositionId('');
                    }}
                  >
                    <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>{s.code}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {(activeTab === 'positions' || activeTab === 'protocols') && (
              <>
                <Text style={styles.filterLabel}>Filtre Département</Text>
                <View style={styles.choiceWrap}>
                  <TouchableOpacity
                    style={[styles.choiceChip, !filterDepartmentId && styles.choiceChipActive]}
                    onPress={() => {
                      setFilterDepartmentId('');
                      setFilterPositionId('');
                    }}
                  >
                    <Text style={[styles.choiceChipText, !filterDepartmentId && styles.choiceChipTextActive]}>Tous</Text>
                  </TouchableOpacity>
                  {departmentsFiltered.filter((d) => d.id).map((d) => {
                    const selected = filterDepartmentId === String(d.id);
                    return (
                      <TouchableOpacity
                        key={d.id}
                        style={[styles.choiceChip, selected && styles.choiceChipActive]}
                        onPress={() => {
                          setFilterDepartmentId(String(d.id));
                          setFilterPositionId('');
                        }}
                      >
                        <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>{d.code}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {activeTab === 'protocols' && (
              <>
                <Text style={styles.filterLabel}>Filtre Poste</Text>
                <View style={styles.choiceWrap}>
                  <TouchableOpacity
                    style={[styles.choiceChip, !filterPositionId && styles.choiceChipActive]}
                    onPress={() => setFilterPositionId('')}
                  >
                    <Text style={[styles.choiceChipText, !filterPositionId && styles.choiceChipTextActive]}>Tous</Text>
                  </TouchableOpacity>
                  {positionsFiltered.filter((p) => p.id).map((p) => {
                    const selected = filterPositionId === String(p.id);
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={[styles.choiceChip, selected && styles.choiceChipActive]}
                        onPress={() => setFilterPositionId(String(p.id))}
                      >
                        <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>{p.code}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        )}

        <View style={styles.listWrap}>{renderRows()}</View>
      </ScrollView>

      <Modal visible={editorOpen} animationType="slide" transparent onRequestClose={() => setEditorOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { width: isDesktop ? 760 : '94%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editorMode === 'create' ? 'Créer' : 'Modifier'} · {TABS.find((t) => t.key === editorType)?.label}</Text>
              <TouchableOpacity onPress={() => setEditorOpen(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ paddingBottom: 12 }}>
              {renderEditor()}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditorOpen(false)}>
                <Text style={styles.cancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={onSave} disabled={saving}>
                <Text style={styles.saveText}>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 36 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loadingText: { marginTop: 10, color: colors.textSecondary, fontSize: 14 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
  headerSubtitle: { marginTop: 2, fontSize: 13, color: colors.textSecondary },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

  tabsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
  },
  tabBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaded,
  },
  tabText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: colors.primary },

  filtersWrap: {
    marginBottom: 12,
    padding: 10,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
    ...shadows.xs,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 4,
  },
  choiceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  choiceChip: {
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  choiceChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaded,
  },
  choiceChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  choiceChipTextActive: {
    color: colors.primary,
  },

  listWrap: { gap: 10 },
  rowCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.outline,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...shadows.sm,
  },
  rowTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  rowMeta: { marginTop: 2, fontSize: 12, color: colors.textSecondary },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.outline,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text },

  fieldLabel: { marginTop: 10, marginBottom: 6, fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  input: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  multilineInput: { minHeight: 74, textAlignVertical: 'top' },
  hint: { marginTop: 6, color: colors.textTertiary, fontSize: 11 },

  toggleRow: {
    marginTop: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  togglePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  togglePillActive: { backgroundColor: colors.successLight },
  togglePillInactive: { backgroundColor: colors.errorLight },
  toggleText: { fontSize: 11, fontWeight: '700' },
  toggleTextActive: { color: colors.successDark },
  toggleTextInactive: { color: colors.errorDark },

  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  cancelText: { color: colors.textSecondary, fontWeight: '600', fontSize: 12 },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    ...shadows.sm,
  },
  saveText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
});
