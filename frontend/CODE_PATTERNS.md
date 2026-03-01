# Code Pattern Reference - Modal & Error Handling

## Modal Structure Pattern

### ✅ CORRECT Pattern (Now Implemented)
```tsx
<Modal
  visible={showCreateModal}
  transparent
  animationType="slide"  // ← Bottom-sheet animation
  onRequestClose={() => {
    if (!creatingWorker) {
      setShowCreateModal(false);
    }
  }}
>
  <View style={styles.modalOverlay}>  // ← Semi-transparent background
    <View style={styles.modalContent}>  // ← Rounded top corners
      
      {/* Header Section */}
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Créer un nouveau travailleur</Text>
        {!creatingWorker && (
          <TouchableOpacity onPress={() => setShowCreateModal(false)}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* Scrollable Form Content */}
      <ScrollView 
        style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }} 
        showsVerticalScrollIndicator={false}
      >
        {/* Form Fields */}
        <Text style={styles.fieldLabel}>Prénom *</Text>
        <TextInput
          style={styles.input}
          placeholder="Entrez le prénom"
          value={workerForm.firstName || ''}
          onChangeText={(text) => setWorkerForm({ ...workerForm, firstName: text })}
          editable={!creatingWorker}
        />
        
        {/* More fields... */}
      </ScrollView>

      {/* Footer with Actions */}
      {!creatingWorker ? (
        <View style={styles.modalActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.outlineVariant }]}
            onPress={() => {
              setShowCreateModal(false);
              setWorkerForm({});
            }}
          >
            <Text style={[styles.actionBtnText, { color: colors.text }]}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: ACCENT }]}
            onPress={handleCreateWorker}
          >
            <Ionicons name="checkmark" size={16} color="#FFF" />
            <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Créer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ padding: spacing.lg, paddingBottom: spacing.xl, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={{ marginTop: spacing.md, color: colors.textSecondary }}>
            Création en cours...
          </Text>
        </View>
      )}
    </View>
  </View>
</Modal>

{/* Toast Notification (IMPORTANT - must be at bottom) */}
<SimpleToastNotification message={toastMsg} />
```

### ❌ INCORRECT Pattern (Don't Use)
```tsx
<Modal
  visible={showCreateModal}
  transparent
  animationType="fade"  // ← Wrong: fade effect instead of slide
  onRequestClose={() => setShowCreateModal(false)}
>
  <View style={styles.importModalOverlay}>  // ← Wrong: incorrect class name
    <View style={styles.importModalContent}>  // ← Wrong: incorrect class name
      <View style={styles.importModalHeader}>  // ← Wrong: incorrect class name
        <Text style={styles.importModalTitle}>Title</Text>  // ← Wrong: incorrect class name
      </View>
      
      <ScrollView style={styles.importModalBody}>  // ← Wrong: incorrect wrapper
        <View>
          <Text style={styles.formLabel}>Label</Text>  // ← Wrong: use fieldLabel
          <TextInput style={styles.formInput} />  // ← Wrong: use input
        </View>
      </ScrollView>
      
      {showButtons && (  // ← Wrong: no loading state UI
        <View>
          <TouchableOpacity>Cancel</TouchableOpacity>
          <TouchableOpacity>Submit</TouchableOpacity>
        </View>
      )}
    </View>
  </View>
</Modal>
```

---

## StyleSheet Definitions

```tsx
const styles = StyleSheet.create({
  // ─── Modal Structure ─────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
    borderBottomWidth: 0,
  },
  
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
  },
  
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.outline,
    backgroundColor: colors.surface,
  },
  
  // ─── Form Fields ═════════════════════════════════════════
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  
  input: {
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    backgroundColor: colors.background,
    marginBottom: spacing.md,
    fontSize: 14,
  },
  
  // ─── Buttons ═════════════════════════════════════════════
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  
  // ─── Gender Selector ═════════════════════════════════════
  genderContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  
  genderOption: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  
  genderOptionActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  
  genderOptionText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  
  genderOptionTextActive: {
    color: '#FFF',
  },
});
```

---

## Error Handling Pattern

### Pattern 1: Simple Validation Error (No API Call)
```tsx
const handleCreateWorker = async () => {
  // Validate required fields
  if (!workerForm.firstName?.trim()) {
    showToast('Le prénom est obligatoire', 'error');
    return;  // Stop execution
  }
  
  if (!workerForm.lastName?.trim()) {
    showToast('Le nom est obligatoire', 'error');
    return;
  }
  
  if (!workerForm.employeeId?.trim()) {
    showToast('L\'ID employé est obligatoire', 'error');
    return;
  }
  
  // Continue to API call if validation passes...
};
```

### Pattern 2: API Call with Success/Error Handling
```tsx
const handleCreateWorker = async () => {
  try {
    setCreatingWorker(true);  // Show loading state
    
    const payload = {
      first_name: workerForm.firstName.trim(),
      last_name: workerForm.lastName.trim(),
      // ... other fields
    };
    
    const api = OccHealthApiService.getInstance();
    const result = await api.post('/occupational-health/workers/', payload);
    
    // Check for success
    if (result && (result.id || result.success)) {
      showToast('Travailleur créé avec succès', 'success');
      setShowCreateModal(false);
      setWorkerForm({});
      await loadPersonnel();  // Refresh list
    } 
    // Check for API error with details
    else if (result?.error) {
      const errorMsg = typeof result.error === 'string' 
        ? result.error 
        : (result.error?.message || 'Erreur lors de la création');
      showToast(errorMsg, 'error');
    }
    // Generic error
    else {
      showToast('Erreur lors de la création du travailleur', 'error');
    }
  } 
  catch (error: any) {
    console.error('Error creating worker:', error);
    
    // Extract specific error message
    let errorMessage = 'Erreur lors de la création du travailleur';
    
    if (error?.response?.data) {
      const data = error.response.data;
      
      // Handle different error formats
      if (typeof data === 'string') {
        errorMessage = data;
      } else if (data.employee_id) {
        errorMessage = 'Cet ID employé existe déjà';  // Specific error
      } else if (data.detail) {
        errorMessage = data.detail;  // Detail message from API
      } else if (data.error) {
        errorMessage = data.error;
      }
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    showToast(errorMessage, 'error');
  } 
  finally {
    setCreatingWorker(false);  // Clear loading state
  }
};
```

### Pattern 3: Multiple API Operations with Consistent Error Handling
```tsx
// Enterprise Edit
const handleSaveEnterprise = async () => {
  if (!enterpriseForm.name?.trim()) {
    showToast('Veuillez remplir les champs obligatoires', 'error');
    return;
  }

  try {
    setLoadingEnterprise(true);
    const api = OccHealthApiService.getInstance();
    const result = await api.put(
      `/occupational-health/enterprises/${editingEnterprise.id}/`,
      payload
    );
    
    if (result.success) {
      showToast('Entreprise mise à jour avec succès', 'success');
      setShowEditModal(false);
      loadEnterprises();
    } else {
      showToast('Erreur lors de la mise à jour', 'error');
    }
  } catch (error) {
    console.error('Error saving enterprise:', error);
    showToast('Erreur lors de la mise à jour', 'error');
  } finally {
    setLoadingEnterprise(false);
  }
};

// Site Creation
const handleCreateSite = async () => {
  if (!siteForm.name?.trim() || !siteForm.siteManager?.trim()) {
    showToast('Veuillez remplir les champs obligatoires', 'error');
    return;
  }

  try {
    setSiteLoading(true);
    const api = OccHealthApiService.getInstance();
    const result = await api.post('/occupational-health/work-sites/', payload);
    
    if (result.success) {
      showToast('Site créé avec succès', 'success');
      setSiteForm({});
      setShowAddSiteModal(false);
      loadSites();
    } else {
      showToast('Erreur lors de la création du site', 'error');
    }
  } catch (error) {
    console.error('Error creating site:', error);
    showToast('Erreur lors de la création du site', 'error');
  } finally {
    setSiteLoading(false);
  }
};
```

---

## Form Field Patterns

### ✅ CORRECT: Clean Form Field
```tsx
<Text style={styles.fieldLabel}>Prénom *</Text>
<TextInput
  style={styles.input}
  placeholder="Entrez le prénom"
  value={workerForm.firstName || ''}
  onChangeText={(text) => setWorkerForm({ ...workerForm, firstName: text })}
  editable={!creatingWorker}
/>
```

### ❌ INCORRECT: Over-wrapped Field
```tsx
<View>
  <Text style={styles.formLabel}>Prénom *</Text>
  <View>
    <TextInput
      style={styles.formInput}
      placeholder="Entrez le prénom"
      value={workerForm.firstName || ''}
      onChangeText={(text) => setWorkerForm({ ...workerForm, firstName: text })}
    />
  </View>
</View>
```

### ✅ CORRECT: Multi-line Field
```tsx
<Text style={styles.fieldLabel}>Adresse</Text>
<TextInput
  style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
  placeholder="Adresse complète"
  value={workerForm.address || ''}
  onChangeText={(text) => setWorkerForm({ ...workerForm, address: text })}
  multiline
  editable={!creatingWorker}
/>
```

### ✅ CORRECT: Selection Component
```tsx
<Text style={styles.fieldLabel}>Genre</Text>
<View style={styles.genderContainer}>
  {['male', 'female', 'other'].map(gender => (
    <TouchableOpacity
      key={gender}
      style={[
        styles.genderOption,
        workerForm.gender === gender && styles.genderOptionActive,
      ]}
      onPress={() => setWorkerForm({ ...workerForm, gender })}
    >
      <Text style={[
        styles.genderOptionText,
        workerForm.gender === gender && styles.genderOptionTextActive,
      ]}>
        {gender === 'male' ? 'Homme' : gender === 'female' ? 'Femme' : 'Autre'}
      </Text>
    </TouchableOpacity>
  ))}
</View>
```

---

## Hook Usage Pattern

### ✅ CORRECT: Toast Hook
```tsx
import { useSimpleToast } from '../../../hooks/useSimpleToast';

export function PersonnelRegistryScreen() {
  const { showToast, toastMsg } = useSimpleToast();  // ← Hook call at top
  
  // Use in handlers
  const handleCreateWorker = async () => {
    if (!workerForm.firstName?.trim()) {
      showToast('Le prénom est obligatoire', 'error');  // ← Show toast
      return;
    }
    // ...
  };
  
  return (
    <ScrollView>
      {/* ... JSX ... */}
      <SimpleToastNotification message={toastMsg} />  // ← Toast component at bottom
    </ScrollView>
  );
}
```

---

## API Service Pattern

### ✅ CORRECT: Error Handling with Status Check
```tsx
try {
  const api = OccHealthApiService.getInstance();
  const result = await api.post('/occupational-health/workers/', payload);
  
  if (result && (result.id || result.success)) {
    // Success
    showToast('Travailleur créé avec succès', 'success');
  } else if (result?.error) {
    // Backend returned error in response
    showToast(result.error, 'error');
  } else {
    // Unknown response format
    showToast('Erreur lors de la création', 'error');
  }
} catch (error) {
  // Network or other error
  showToast('Erreur lors de la création', 'error');
}
```

---

## Form State Management Pattern

### ✅ CORRECT: Form State
```tsx
interface WorkerFormData {
  firstName?: string;
  lastName?: string;
  employeeId?: string;
  company?: string;
  [key: string]: string | undefined;
}

export function PersonnelRegistryScreen() {
  const [workerForm, setWorkerForm] = useState<WorkerFormData>({});
  
  // Update single field
  const handleFirstNameChange = (text: string) => {
    setWorkerForm({ ...workerForm, firstName: text });
  };
  
  // Or inline
  <TextInput
    onChangeText={(text) => setWorkerForm({ ...workerForm, firstName: text })}
  />
  
  // Reset form after success
  setWorkerForm({});
}
```

---

## Loading State Pattern

### ✅ CORRECT: Full Loading Management
```tsx
const [creatingWorker, setCreatingWorker] = useState(false);

const handleCreateWorker = async () => {
  try {
    setCreatingWorker(true);  // ← Start loading
    
    // API call
    const result = await api.post('/occupational-health/workers/', payload);
    
    if (result.success) {
      showToast('Travailleur créé avec succès', 'success');
      setShowCreateModal(false);  // ← Close modal
      setWorkerForm({});  // ← Reset form
      await loadPersonnel();  // ← Refresh list
    }
  } catch (error) {
    showToast('Erreur lors de la création', 'error');
  } finally {
    setCreatingWorker(false);  // ← Clear loading state (ALWAYS)
  }
};

// In JSX
{!creatingWorker ? (
  <View style={styles.modalActions}>
    {/* Buttons visible when not loading */}
  </View>
) : (
  <View style={{ padding: spacing.lg, alignItems: 'center' }}>
    <ActivityIndicator size="large" color={ACCENT} />
    <Text style={{ marginTop: spacing.md, color: colors.textSecondary }}>
      Création en cours...
    </Text>
  </View>
)}

// Form fields disabled during loading
<TextInput
  editable={!creatingWorker}
  // ... rest of props
/>
```

---

## Summary of Key Changes

| Aspect | Before | After |
|--------|--------|-------|
| Modal Animation | `animationType="fade"` | `animationType="slide"` |
| Modal Styles | `importModal*` classes | `modal*` classes |
| Form Fields | Wrapped in View | Direct labels + inputs |
| Field Labels | `formLabel` style | `fieldLabel` style |
| Field Inputs | `formInput` style | `input` style |
| Loading UI | Buttons disappear | ActivityIndicator + message |
| Error Messages | Generic "Error occurred" | Specific error details |
| Error Type | Alert (some) | Toast (all modern screens) |
| Footer Buttons | Above ScrollView | In dedicated modalActions footer |
| Modal Close | Anytime | Disabled during loading |

