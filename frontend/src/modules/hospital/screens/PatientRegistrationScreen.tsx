import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Dimensions, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/theme';
import HybridDataService from '../../../services/HybridDataService';
import { PatientCreate, Patient } from '../../../models/Patient';

const { width } = Dimensions.get('window');
const isDesktop = width >= 1024;

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

type Step = 'personal' | 'contact' | 'medical' | 'insurance' | 'review';

const STEPS: { key: Step; label: string; icon: any }[] = [
  { key: 'personal', label: 'Identité', icon: 'person-outline' },
  { key: 'contact', label: 'Contact', icon: 'call-outline' },
  { key: 'medical', label: 'Médical', icon: 'medkit-outline' },
  { key: 'insurance', label: 'Assurance', icon: 'shield-checkmark-outline' },
  { key: 'review', label: 'Confirmation', icon: 'checkmark-done-outline' },
];

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

interface Props {
  onBack?: () => void;
  onPatientCreated?: (patient: Patient) => void;
  editingPatient?: Patient; // For edit mode
  onPatientUpdated?: (patient: Patient) => void; // For edit mode
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export function PatientRegistrationScreen({ onBack, onPatientCreated, editingPatient, onPatientUpdated }: Props) {
  const isEditMode = !!editingPatient;
  const [currentStep, setCurrentStep] = useState<Step>('personal');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ─── Form State ───────────────────────────────────────────

  // Personal
  const [firstName, setFirstName] = useState(editingPatient?.firstName || '');
  const [lastName, setLastName] = useState(editingPatient?.lastName || '');
  const [middleName, setMiddleName] = useState(editingPatient?.middleName || '');
  const [dateOfBirth, setDateOfBirth] = useState(
    editingPatient?.dateOfBirth 
      ? new Date(editingPatient.dateOfBirth).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) 
      : ''
  );
  const [gender, setGender] = useState<'male' | 'female' | 'other'>(editingPatient?.gender || 'male');
  const [nationalId, setNationalId] = useState(editingPatient?.nationalId || '');

  // Contact
  const [phone, setPhone] = useState(editingPatient?.phone || '');
  const [email, setEmail] = useState(editingPatient?.email || '');
  const [address, setAddress] = useState(editingPatient?.address || '');
  const [city, setCity] = useState(editingPatient?.city || '');
  const [country, setCountry] = useState(editingPatient?.country || 'RD Congo');
  const [emergencyContactName, setEmergencyContactName] = useState(editingPatient?.emergencyContactName || '');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(editingPatient?.emergencyContactPhone || '');
  const [emergencyContactRelation, setEmergencyContactRelation] = useState(editingPatient?.emergencyContactRelation || '');

  // Medical
  const [bloodType, setBloodType] = useState<typeof BLOOD_TYPES[number] | ''>(editingPatient?.bloodType || '');
  const [allergiesText, setAllergiesText] = useState(editingPatient?.allergies?.join(', ') || '');
  const [chronicText, setChronicText] = useState(editingPatient?.chronicConditions?.join(', ') || '');
  const [medicationsText, setMedicationsText] = useState(editingPatient?.currentMedications?.join(', ') || '');
  const [notes, setNotes] = useState(editingPatient?.notes || '');

  // Insurance
  const [insuranceProvider, setInsuranceProvider] = useState(editingPatient?.insuranceProvider || '');
  const [insuranceNumber, setInsuranceNumber] = useState(editingPatient?.insuranceNumber || '');

  const stepIndex = STEPS.findIndex(s => s.key === currentStep);

  // ─── Validation ───────────────────────────────────────────

  const validateStep = useCallback((step: Step): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 'personal') {
      if (!firstName.trim()) newErrors.firstName = 'Le prénom est obligatoire';
      if (!lastName.trim()) newErrors.lastName = 'Le nom est obligatoire';
      if (!dateOfBirth.trim()) newErrors.dateOfBirth = 'La date de naissance est obligatoire';
      else {
        // Validate DD/MM/YYYY
        const dob = parseDateFR(dateOfBirth);
        if (!dob) newErrors.dateOfBirth = 'Format invalide (JJ/MM/AAAA)';
        else if (dob > new Date()) newErrors.dateOfBirth = 'Date future non autorisée';
      }
    }

    if (step === 'contact') {
      if (!phone.trim()) newErrors.phone = 'Le téléphone est obligatoire';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [firstName, lastName, dateOfBirth, phone]);

  // ─── Navigation ───────────────────────────────────────────

  const goNext = useCallback(() => {
    if (!validateStep(currentStep)) return;
    const idx = stepIndex;
    if (idx < STEPS.length - 1) setCurrentStep(STEPS[idx + 1].key);
  }, [currentStep, stepIndex, validateStep]);

  const goPrev = useCallback(() => {
    const idx = stepIndex;
    if (idx > 0) setCurrentStep(STEPS[idx - 1].key);
  }, [stepIndex]);

  // ─── Submit ───────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    setSaving(true);
    try {
      const dob = parseDateFR(dateOfBirth);
      if (!dob) throw new Error('Date invalide');

      const allergies = allergiesText.split(',').map(a => a.trim()).filter(Boolean);
      const chronicConditions = chronicText.split(',').map(c => c.trim()).filter(Boolean);
      const currentMedications = medicationsText.split(',').map(m => m.trim()).filter(Boolean);

      const db = HybridDataService.getInstance();

      if (isEditMode && editingPatient) {
        // Update existing patient
        const updateData = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          middleName: middleName.trim() || undefined,
          dateOfBirth: dob.toISOString(),
          gender,
          nationalId: nationalId.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          country: country.trim() || undefined,
          emergencyContactName: emergencyContactName.trim() || undefined,
          emergencyContactPhone: emergencyContactPhone.trim() || undefined,
          emergencyContactRelation: emergencyContactRelation.trim() || undefined,
          bloodType: (bloodType as any) || undefined,
          allergies,
          chronicConditions,
          currentMedications,
          insuranceProvider: insuranceProvider.trim() || undefined,
          insuranceNumber: insuranceNumber.trim() || undefined,
          notes: notes.trim() || undefined,
        };
        
        const updatedPatient = await db.updatePatient(editingPatient.id, updateData);
        
        if (updatedPatient) {
          if (Platform.OS === 'web') {
            alert(`Patient ${updatedPatient.firstName} ${updatedPatient.lastName} mis à jour avec succès!`);
          } else {
            Alert.alert('Succès', `Patient ${updatedPatient.firstName} ${updatedPatient.lastName} mis à jour avec succès!`);
          }
          onPatientUpdated?.(updatedPatient);
        } else {
          if (Platform.OS === 'web') {
            alert('Erreur lors de la mise à jour du patient');
          } else {
            Alert.alert('Erreur', 'Erreur lors de la mise à jour du patient');
          }
        }
      } else {
        // Create new patient
        const data: PatientCreate = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          middleName: middleName.trim() || undefined,
          dateOfBirth: dob.toISOString(),
          gender,
          nationalId: nationalId.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          country: country.trim() || undefined,
          emergencyContactName: emergencyContactName.trim() || undefined,
          emergencyContactPhone: emergencyContactPhone.trim() || undefined,
          emergencyContactRelation: emergencyContactRelation.trim() || undefined,
          bloodType: (bloodType as any) || undefined,
          allergies,
          chronicConditions,
          currentMedications,
          insuranceProvider: insuranceProvider.trim() || undefined,
          insuranceNumber: insuranceNumber.trim() || undefined,
          status: 'active',
          notes: notes.trim() || undefined,
        };

        const newPatient = await db.createPatient(data);
        
        if (Platform.OS === 'web') {
          alert(`Patient ${newPatient.firstName} ${newPatient.lastName} enregistré avec succès!\nN° Patient: ${newPatient.patientNumber}`);
        } else {
          Alert.alert('Succès', `Patient ${newPatient.firstName} ${newPatient.lastName} enregistré avec succès!\nN° Patient: ${newPatient.patientNumber}`);
        }
        onPatientCreated?.(newPatient);
      }
    } catch (err: any) {
      const msg = err?.message || 'Erreur inconnue';
      if (Platform.OS === 'web') {
        alert(`Erreur: ${msg}`);
      } else {
        Alert.alert('Erreur', msg);
      }
    } finally {
      setSaving(false);
    }
  }, [
    firstName, lastName, middleName, dateOfBirth, gender, nationalId,
    phone, email, address, city, country,
    emergencyContactName, emergencyContactPhone, emergencyContactRelation,
    bloodType, allergiesText, chronicText, medicationsText, notes,
    insuranceProvider, insuranceNumber, onPatientCreated, onPatientUpdated,
    isEditMode, editingPatient,
  ]);

  // ─── Render ───────────────────────────────────────────────

  return (
    <View style={st.root}>
      {/* Top Bar */}
      <View style={st.topBar}>
        <TouchableOpacity style={st.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <Text style={st.backBtnLabel}>Patients</Text>
        </TouchableOpacity>
        <Text style={st.topTitle}>{isEditMode ? 'Modifier Patient' : 'Enregistrement Patient'}</Text>
        <View style={{ width: 80 }} />
      </View>

      {/* Stepper */}
      <View style={st.stepper}>
        {STEPS.map((step, i) => {
          const isActive = step.key === currentStep;
          const isDone = i < stepIndex;
          return (
            <React.Fragment key={step.key}>
              <TouchableOpacity
                style={[st.stepDot, isActive && st.stepDotActive, isDone && st.stepDotDone]}
                onPress={() => { if (isDone) setCurrentStep(step.key); }}
              >
                {isDone ? (
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                ) : (
                  <Ionicons name={step.icon} size={14} color={isActive ? '#FFF' : colors.textTertiary} />
                )}
              </TouchableOpacity>
              <Text style={[st.stepLabel, isActive && st.stepLabelActive, isDone && st.stepLabelDone]}>{step.label}</Text>
              {i < STEPS.length - 1 && <View style={[st.stepLine, isDone && st.stepLineDone]} />}
            </React.Fragment>
          );
        })}
      </View>

      {/* Form */}
      <ScrollView style={st.scroll} contentContainerStyle={st.scrollContent} keyboardShouldPersistTaps="handled">
        {currentStep === 'personal' && (
          <StepCard title="Informations Personnelles" subtitle="Identité civile du patient">
            <FieldRow>
              <Field label="Prénom *" value={firstName} onChange={setFirstName} error={errors.firstName} placeholder="Ex: Marie" autoFocus />
              <Field label="Nom *" value={lastName} onChange={setLastName} error={errors.lastName} placeholder="Ex: Kasongo" />
            </FieldRow>
            <FieldRow>
              <Field label="Post-nom" value={middleName} onChange={setMiddleName} placeholder="(optionnel)" />
              <Field label="Date de Naissance *" value={dateOfBirth} onChange={setDateOfBirth} error={errors.dateOfBirth} placeholder="JJ/MM/AAAA" />
            </FieldRow>
            <View style={st.fieldGroup}>
              <Text style={st.fieldLabel}>Sexe *</Text>
              <View style={st.genderRow}>
                {([
                  { key: 'male', label: 'Homme', icon: 'male', color: '#3B82F6' },
                  { key: 'female', label: 'Femme', icon: 'female', color: '#EC4899' },
                  { key: 'other', label: 'Autre', icon: 'person', color: '#8B5CF6' },
                ] as const).map(g => (
                  <TouchableOpacity
                    key={g.key}
                    style={[st.genderOption, gender === g.key && { backgroundColor: g.color + '14', borderColor: g.color }]}
                    onPress={() => setGender(g.key)}
                  >
                    <Ionicons name={g.icon as any} size={18} color={gender === g.key ? g.color : colors.textSecondary} />
                    <Text style={[st.genderText, gender === g.key && { color: g.color, fontWeight: '600' }]}>{g.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <FieldRow>
              <Field label="N° d'identité" value={nationalId} onChange={setNationalId} placeholder="Carte d'identité nationale" />
            </FieldRow>
          </StepCard>
        )}

        {currentStep === 'contact' && (
          <StepCard title="Coordonnées" subtitle="Informations de contact du patient">
            <FieldRow>
              <Field label="Téléphone *" value={phone} onChange={setPhone} error={errors.phone} placeholder="+243 ..." keyboardType="phone-pad" icon="call-outline" />
              <Field label="Email" value={email} onChange={setEmail} placeholder="patient@email.com" keyboardType="email-address" icon="mail-outline" />
            </FieldRow>
            <Field label="Adresse" value={address} onChange={setAddress} placeholder="Rue, numéro, quartier" icon="location-outline" />
            <FieldRow>
              <Field label="Ville" value={city} onChange={setCity} placeholder="Lubumbashi, Kinshasa..." />
              <Field label="Pays" value={country} onChange={setCountry} placeholder="RD Congo" />
            </FieldRow>

            <View style={st.separator} />
            <Text style={st.subSectionTitle}>Contact d'urgence</Text>
            <FieldRow>
              <Field label="Nom" value={emergencyContactName} onChange={setEmergencyContactName} placeholder="Nom complet" icon="person-outline" />
              <Field label="Téléphone" value={emergencyContactPhone} onChange={setEmergencyContactPhone} placeholder="+243 ..." keyboardType="phone-pad" icon="call-outline" />
            </FieldRow>
            <Field label="Relation" value={emergencyContactRelation} onChange={setEmergencyContactRelation} placeholder="Ex: Époux, Mère, Frère..." />
          </StepCard>
        )}

        {currentStep === 'medical' && (
          <StepCard title="Informations Médicales" subtitle="Antécédents et état de santé">
            <View style={st.fieldGroup}>
              <Text style={st.fieldLabel}>Groupe sanguin</Text>
              <View style={st.bloodRow}>
                {BLOOD_TYPES.map(bt => (
                  <TouchableOpacity
                    key={bt}
                    style={[st.bloodChip, bloodType === bt && st.bloodChipActive]}
                    onPress={() => setBloodType(bloodType === bt ? '' : bt)}
                  >
                    <Text style={[st.bloodChipText, bloodType === bt && st.bloodChipTextActive]}>{bt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <Field
              label="Allergies"
              value={allergiesText}
              onChange={setAllergiesText}
              placeholder="Séparer par des virgules (ex: Pénicilline, Iode)"
              icon="warning-outline"
              multiline
            />
            <Field
              label="Conditions chroniques"
              value={chronicText}
              onChange={setChronicText}
              placeholder="Séparer par des virgules (ex: Diabète, Hypertension)"
              icon="fitness-outline"
              multiline
            />
            <Field
              label="Médicaments en cours"
              value={medicationsText}
              onChange={setMedicationsText}
              placeholder="Séparer par des virgules (ex: Metformine 500mg, Amlodipine 5mg)"
              icon="medical-outline"
              multiline
            />
            <Field
              label="Notes médicales"
              value={notes}
              onChange={setNotes}
              placeholder="Remarques additionnelles..."
              multiline
            />
          </StepCard>
        )}

        {currentStep === 'insurance' && (
          <StepCard title="Couverture Assurance" subtitle="Informations d'assurance maladie (optionnel)">
            <Field label="Assureur" value={insuranceProvider} onChange={setInsuranceProvider} placeholder="Ex: SONAS, Rawsur, ACTIVA..." icon="shield-checkmark-outline" />
            <Field label="N° Police / Carte" value={insuranceNumber} onChange={setInsuranceNumber} placeholder="Numéro de police d'assurance" icon="card-outline" />
          </StepCard>
        )}

        {currentStep === 'review' && (
          <ReviewStep
            data={{
              firstName, lastName, middleName, dateOfBirth, gender, nationalId,
              phone, email, address, city, country,
              emergencyContactName, emergencyContactPhone, emergencyContactRelation,
              bloodType, allergiesText, chronicText, medicationsText, notes,
              insuranceProvider, insuranceNumber,
            }}
          />
        )}
      </ScrollView>

      {/* Bottom actions */}
      <View style={st.bottomBar}>
        {stepIndex > 0 ? (
          <TouchableOpacity style={st.prevBtn} onPress={goPrev} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={18} color={colors.primary} />
            <Text style={st.prevBtnText}>Précédent</Text>
          </TouchableOpacity>
        ) : <View />}

        {currentStep !== 'review' ? (
          <TouchableOpacity style={st.nextBtn} onPress={goNext} activeOpacity={0.7}>
            <Text style={st.nextBtnText}>Suivant</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[st.nextBtn, { backgroundColor: '#059669' }]} onPress={handleSubmit} activeOpacity={0.7} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name={isEditMode ? "save" : "checkmark-circle"} size={18} color="#FFF" />
                <Text style={st.nextBtnText}>{isEditMode ? 'Sauvegarder les Modifications' : 'Enregistrer le Patient'}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Sub-Components
// ═══════════════════════════════════════════════════════════════

function StepCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <View style={st.stepCard}>
      <Text style={st.stepCardTitle}>{title}</Text>
      <Text style={st.stepCardSub}>{subtitle}</Text>
      <View style={st.stepCardBody}>{children}</View>
    </View>
  );
}

function Field({ label, value, onChange, placeholder, error, icon, multiline, autoFocus, keyboardType }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  error?: string; icon?: any; multiline?: boolean; autoFocus?: boolean; keyboardType?: any;
}) {
  return (
    <View style={[st.fieldGroup, { flex: 1 }]}>
      <Text style={st.fieldLabel}>{label}</Text>
      <View style={[st.inputWrap, error && st.inputError, multiline && { minHeight: 72, alignItems: 'flex-start' }]}>
        {icon && <Ionicons name={icon} size={16} color={error ? colors.error : colors.textTertiary} style={{ marginTop: multiline ? 10 : 0 }} />}
        <TextInput
          style={[st.input, multiline && { textAlignVertical: 'top', minHeight: 60 }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          multiline={multiline}
          autoFocus={autoFocus}
          keyboardType={keyboardType}
        />
      </View>
      {error && <Text style={st.errorMsg}>{error}</Text>}
    </View>
  );
}

function FieldRow({ children }: { children: React.ReactNode }) {
  return <View style={st.fieldRow}>{children}</View>;
}

function ReviewStep({ data }: { data: any }) {
  const allergies = data.allergiesText.split(',').map((a: string) => a.trim()).filter(Boolean);
  const chronic = data.chronicText.split(',').map((c: string) => c.trim()).filter(Boolean);
  const meds = data.medicationsText.split(',').map((m: string) => m.trim()).filter(Boolean);
  const genderLabel = data.gender === 'male' ? 'Homme' : data.gender === 'female' ? 'Femme' : 'Autre';

  return (
    <View style={st.stepCard}>
      <Text style={st.stepCardTitle}>Confirmation</Text>
      <Text style={st.stepCardSub}>Vérifiez les informations avant l'enregistrement</Text>

      <View style={st.reviewBlock}>
        {/* Patient name */}
        <View style={st.reviewHeader}>
          <View style={[st.reviewAvatar, { backgroundColor: data.gender === 'male' ? '#3B82F614' : '#EC489914' }]}>
            <Text style={[st.reviewAvatarText, { color: data.gender === 'male' ? '#3B82F6' : '#EC4899' }]}>
              {(data.firstName[0] || '?') + (data.lastName[0] || '?')}
            </Text>
          </View>
          <View>
            <Text style={st.reviewName}>{data.firstName} {data.middleName ? data.middleName + ' ' : ''}{data.lastName}</Text>
            <Text style={st.reviewMeta}>{genderLabel} · {data.dateOfBirth}</Text>
          </View>
        </View>

        <ReviewSection title="Contact">
          <ReviewRow label="Téléphone" value={data.phone || '—'} />
          <ReviewRow label="Email" value={data.email || '—'} />
          <ReviewRow label="Adresse" value={data.address || '—'} />
          <ReviewRow label="Ville" value={data.city || '—'} />
          <ReviewRow label="Pays" value={data.country || '—'} />
        </ReviewSection>

        {(data.emergencyContactName || data.emergencyContactPhone) && (
          <ReviewSection title="Contact d'urgence">
            <ReviewRow label="Nom" value={data.emergencyContactName || '—'} />
            <ReviewRow label="Téléphone" value={data.emergencyContactPhone || '—'} />
            <ReviewRow label="Relation" value={data.emergencyContactRelation || '—'} />
          </ReviewSection>
        )}

        <ReviewSection title="Médical">
          <ReviewRow label="Groupe sanguin" value={data.bloodType || '—'} />
          <ReviewRow label="Allergies" value={allergies.length > 0 ? allergies.join(', ') : 'Aucune'} />
          <ReviewRow label="Conditions" value={chronic.length > 0 ? chronic.join(', ') : 'Aucune'} />
          <ReviewRow label="Médicaments" value={meds.length > 0 ? meds.join(', ') : 'Aucun'} />
        </ReviewSection>

        {(data.insuranceProvider || data.insuranceNumber) && (
          <ReviewSection title="Assurance">
            <ReviewRow label="Assureur" value={data.insuranceProvider || '—'} />
            <ReviewRow label="N° Police" value={data.insuranceNumber || '—'} />
          </ReviewSection>
        )}
      </View>
    </View>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={st.reviewSection}>
      <Text style={st.reviewSectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={st.reviewRow}>
      <Text style={st.reviewLabel}>{label}</Text>
      <Text style={st.reviewValue}>{value}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function parseDateFR(str: string): Date | null {
  // Accept DD/MM/YYYY or DD-MM-YYYY
  const m = str.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10) - 1;
  const year = parseInt(m[3], 10);
  const d = new Date(year, month, day);
  if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return null;
  return d;
}

// ═══════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  // Top bar
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 12,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.outline,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 80 },
  backBtnLabel: { fontSize: 14, fontWeight: '600', color: colors.primary },
  topTitle: { fontSize: 16, fontWeight: '700', color: colors.text },

  // Stepper
  stepper: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24, paddingVertical: 16, gap: 6,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.outline,
  },
  stepDot: {
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceVariant,
  },
  stepDotActive: { backgroundColor: colors.primary },
  stepDotDone: { backgroundColor: '#059669' },
  stepLabel: { fontSize: 11, color: colors.textTertiary, marginRight: 4 },
  stepLabelActive: { color: colors.primary, fontWeight: '600' },
  stepLabelDone: { color: '#059669' },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.outlineVariant, maxWidth: 40 },
  stepLineDone: { backgroundColor: '#059669' },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 24 },

  // Step card
  stepCard: {
    backgroundColor: colors.surface, borderRadius: 14, padding: 24,
    borderWidth: 1, borderColor: colors.outline, maxWidth: isDesktop ? 780 : undefined,
    alignSelf: isDesktop ? 'center' : undefined, width: isDesktop ? '100%' : undefined,
  },
  stepCardTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  stepCardSub: { fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 20 },
  stepCardBody: { gap: 14 },

  // Field
  fieldGroup: { marginBottom: 4 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.background, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.outline,
  },
  inputError: { borderColor: colors.error },
  input: { flex: 1, fontSize: 14, color: colors.text },
  errorMsg: { fontSize: 11, color: colors.error, marginTop: 4 },
  fieldRow: { flexDirection: isDesktop ? 'row' : 'column', gap: 12 },

  // Gender
  genderRow: { flexDirection: 'row', gap: 10 },
  genderOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: colors.outline,
    backgroundColor: colors.background,
  },
  genderText: { fontSize: 14, color: colors.textSecondary },

  // Blood type
  bloodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bloodChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.background,
  },
  bloodChipActive: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
  bloodChipText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  bloodChipTextActive: { color: '#EF4444', fontWeight: '700' },

  // Separator
  separator: { height: 1, backgroundColor: colors.outlineVariant, marginVertical: 16 },
  subSectionTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 10 },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 14,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.outline,
  },
  prevBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.outline },
  prevBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.primary },
  nextBtnText: { fontSize: 14, fontWeight: '600', color: '#FFF' },

  // Review
  reviewBlock: { gap: 16 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
  reviewAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText: { fontSize: 20, fontWeight: '700' },
  reviewName: { fontSize: 18, fontWeight: '700', color: colors.text },
  reviewMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },

  reviewSection: { gap: 4 },
  reviewSectionTitle: { fontSize: 13, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
  reviewLabel: { fontSize: 13, color: colors.textSecondary },
  reviewValue: { fontSize: 13, fontWeight: '500', color: colors.text },
});
