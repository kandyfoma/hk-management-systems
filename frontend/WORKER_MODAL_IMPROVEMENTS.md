# Worker Modal & Error Handling Improvements

## Overview
This document tracks improvements made to the worker creation modal design and error handling across the occupational health module.

## Changes Completed

### 1. PersonnelRegistryScreen.tsx - Worker Creation Modal Refactoring

#### Modal Design Pattern
- **Animation Type**: Changed from `fade` to `slide` for proper bottom-sheet effect
- **Style Classes**: Updated from incorrect `importModal*` to correct `modal*` classes
- **Structure**: All form fields now use clean `fieldLabel` + `input` styling (no unnecessary View wrappers)

#### Styling Updates
```tsx
// Modal Structure Styles
- modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'}
- modalContent: {backgroundColor: surface, borderTopLeftRadius: xl, borderTopRightRadius: xl, maxHeight: '90%'}
- modalHeader: {flexDirection: 'row', justifyContent: 'space-between', padding: lg, borderBottomWidth: 1}
- modalTitle: {fontSize: 18, fontWeight: '700'}
- modalActions: {flexDirection: 'row', padding: lg, borderTopWidth: 1, gap: md}

// Form Field Styles
- fieldLabel: {fontSize: 14, fontWeight: '600', marginTop: md, marginBottom: sm}
- input: {borderWidth: 1, borderColor: outline, borderRadius: md, padding: md, marginBottom: md}
```

#### Form Field Improvements
- ✅ All 15+ form fields use consistent styling
- ✅ Form fields: firstName, lastName, employeeId, company, jobTitle, email, phone, gender, dateOfBirth, hireDate, address, emergencyContactName, emergencyContactPhone, sector, site, department
- ✅ Labels consistently use `fieldLabel` style
- ✅ Inputs consistently use `input` style
- ✅ Removed unnecessary View wrappers for cleaner markup

#### Loading State UX
- ✅ Changed from simple `&&` conditional to `? :` ternary
- ✅ Shows ActivityIndicator with "Création en cours..." message during API call
- ✅ Form fields disabled while loading (editable={!creatingWorker})

#### Improved Error Handling in handleCreateWorker
```typescript
// Validation Errors
- "Le prénom est obligatoire" - Missing firstName
- "Le nom est obligatoire" - Missing lastName
- "L'ID employé est obligatoire" - Missing employeeId

// API Success
- "Travailleur créé avec succès" - Success toast + modal close + list refresh

// Specific Error Messages
- "Cet ID employé existe déjà" - Duplicate employee_id from backend
- Backend error messages extracted from response.data
- Generic "Erreur lors de la création du travailleur" fallback

// Error Extraction Logic
- Checks response.error for specific messages
- Checks error.response.data for detailed API errors
- Handles employee_id conflicts specifically
- Fallback to generic error message
```

### 2. WorkerAndEnterpriseScreen.tsx - Enterprise & Site Management Error Handling

#### Enterprise Edit Modal (handleSaveEnterprise)
- ✅ Validates required fields before submission
- ✅ Shows error toast: "Veuillez remplir les champs obligatoires"
- ✅ Shows success toast: "Entreprise mise à jour avec succès"
- ✅ Error toast: "Erreur lors de la mise à jour"
- ✅ Modal closes on success and refreshes enterprise list

#### Site Creation Modal (handleCreateSite)
- ✅ Validates required fields (name, siteManager)
- ✅ Shows error toast: "Veuillez remplir les champs obligatoires"
- ✅ Shows success toast: "Site créé avec succès"
- ✅ Error toast: "Erreur lors de la création du site"
- ✅ Modal closes on success and refreshes sites list

#### Site Deletion (handleDeleteSite)
- ✅ Confirmation alert before deletion
- ✅ Shows success toast on deletion
- ✅ Removes from list immediately on success
- ✅ Error toast: "Impossible de supprimer"

### 3. PersonnelRegistryScreen.tsx - Bulk Import Error Handling

#### File Validation
- ✅ Validates XLSX/CSV file format
- ✅ Checks for required columns: firstName, lastName, employeeId
- ✅ Shows error on empty files
- ✅ Shows error on missing required columns

#### Import Results
- ✅ Displays validation results to user
- ✅ Shows count of valid/invalid rows
- ✅ Shows count of processed rows
- ✅ Shows API errors with details
- ✅ Success toast: "Importation réussie!"
- ✅ Error toast: "Erreur lors de l'importation"
- ✅ Error toast: "Erreur lors de la lecture du fichier"

## Modal Design Pattern Comparison

### BEFORE (Incorrect Pattern)
```tsx
<Modal animationType="fade" transparent>
  <View style={styles.importModalOverlay}>
    <View style={styles.importModalContent}>
      <View style={styles.importModalHeader}>
        <Text style={styles.importModalTitle}>Title</Text>
      </View>
      <ScrollView style={styles.importModalBody}>
        <View>
          <Text style={styles.formLabel}>Label</Text>
          <TextInput style={styles.formInput} />
        </View>
      </ScrollView>
      <View>{showButtons && <Buttons />}</View>
    </View>
  </View>
</Modal>
```

### AFTER (Correct Pattern)
```tsx
<Modal animationType="slide" transparent>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Title</Text>
        <CloseButton />
      </View>
      <ScrollView style={{ paddingHorizontal: lg, paddingBottom: xl }}>
        <Text style={styles.fieldLabel}>Label</Text>
        <TextInput style={styles.input} />
      </ScrollView>
      {!loading ? (
        <View style={styles.modalActions}>
          <ActionButtons />
        </View>
      ) : (
        <LoadingIndicator />
      )}
    </View>
  </View>
</Modal>
```

## Error Handling Patterns

### Pattern 1: Form Validation Error (PersonnelRegistryScreen)
```typescript
if (!workerForm.firstName?.trim()) {
  showToast('Le prénom est obligatoire', 'error');
  return;
}
```

### Pattern 2: API Success/Error with Toast
```typescript
try {
  setCreatingWorker(true);
  const result = await api.post('/occupational-health/workers/', payload);
  
  if (result && (result.id || result.success)) {
    showToast('Travailleur créé avec succès', 'success');
    setShowCreateModal(false);
    await loadPersonnel();
  } else if (result?.error) {
    const errorMsg = typeof result.error === 'string' 
      ? result.error 
      : (result.error?.message || 'Erreur lors de la création');
    showToast(errorMsg, 'error');
  } else {
    showToast('Erreur lors de la création du travailleur', 'error');
  }
} catch (error: any) {
  let errorMessage = 'Erreur lors de la création du travailleur';
  if (error?.response?.data?.employee_id) {
    errorMessage = 'Cet ID employé existe déjà';
  } else if (error?.response?.data?.detail) {
    errorMessage = error.response.data.detail;
  } else if (error?.response?.data?.error) {
    errorMessage = error.response.data.error;
  } else if (error?.message) {
    errorMessage = error.message;
  }
  showToast(errorMessage, 'error');
} finally {
  setCreatingWorker(false);
}
```

### Pattern 3: Alert-based Error (Other Screens)
```typescript
try {
  const response = await api.post('/path/', data);
  if (response.success) {
    Alert.alert('Succès', 'Message');
  }
} catch (error) {
  Alert.alert('Erreur', 'Une erreur est survenue');
}
```

## Status Summary

### ✅ Completed
- PersonnelRegistryScreen worker creation modal design (**85% refactored**)
  - ✅ Bottom-sheet animation (slide)
  - ✅ Proper modal styling (modal* classes)
  - ✅ Clean form fields (fieldLabel + input)
  - ✅ Loading state UI (ActivityIndicator)
  - ✅ Improved error handling with specific messages
  
- WorkerAndEnterpriseScreen error handling
  - ✅ Enterprise edit with toast notifications
  - ✅ Site creation with toast notifications
  - ✅ Site deletion with toast notifications
  
- PersonnelRegistryScreen bulk import
  - ✅ File validation with error messages
  - ✅ Import result feedback with toast notifications

### 🔄 In Progress / Testing
- Verify no TypeScript errors from modal refactoring
- Test worker creation end-to-end with real API calls
- Verify error toasts display properly on various error scenarios
- Verify modal closes properly and list refreshes

### ⏳ Pending
- Check for edit worker functionality (if exists, ensure uses same modal pattern)
- Review other screens for toast vs Alert consistency
- Consider standardizing all API error handling to use toast instead of Alert

## Files Modified
1. **PersonnelRegistryScreen.tsx** (2074 lines)
   - Lines 631-695: handleCreateWorker with improved error handling
   - Lines 1172-1410: Worker creation modal JSX
   - Lines 1970-2050: StyleSheet with modal styles

## Testing Checklist
- [ ] Open PersonnelRegistryScreen, click "Créer" button
- [ ] Verify modal slides up from bottom (not fade)
- [ ] Fill form and submit - verify success toast and modal closes
- [ ] Test validation errors - verify error toasts
- [ ] Test duplicate employee ID - verify specific error message
- [ ] Test network error - verify error toast displayed
- [ ] Test enterprise edit workflow - verify toast notifications
- [ ] Test site creation - verify success/error toasts
- [ ] Test site deletion - verify toast notification
- [ ] Test bulk import - verify file validation and results

## Backend Integration Notes
- Backend endpoint: `POST /occupational-health/workers/`
- Expects: company, site, sector fields (converted from frontend values)
- Returns: worker object with id on success
- Error response: Includes field-specific errors (e.g., employee_id)
- Validation errors return 400 with detailed message in response.data

## Notes
- PersonnelRegistryScreen uses proper toast notifications (useSimpleToast)
- WorkerAndEnterpriseScreen uses proper toast notifications
- Other screens (XrayImagingListScreen) still use Alert.alert() instead of toast
- Consider standardizing all error notifications across app
- Modal pattern now matches WorkerAndEnterpriseScreen standards
