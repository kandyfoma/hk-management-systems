# Worker Modal & Error Handling - Testing Guide

## Quick Reference

### What Was Changed
1. **Worker Creation Modal** - Refactored to use proper bottom-sheet design pattern
2. **Error Handling** - Improved to show specific error messages via toast notifications
3. **Form Fields** - Cleaned up structure and styling for consistency
4. **Loading State** - Added visual feedback during creation

### Key Files Modified
- `PersonnelRegistryScreen.tsx` - Worker creation modal + bulk import
- `WorkerAndEnterpriseScreen.tsx` - Already had proper error handling (verified)

---

## Test Cases

### Test 1: Modal Design & Animation
**Goal**: Verify the worker creation modal uses proper bottom-sheet design

**Steps**:
1. Navigate to **Personnel Registry** screen
2. Click **"Créer"** button
3. Observe modal animation:
   - Should slide up from bottom (not fade)
   - Should have rounded top corners
   - Should overlay with semi-transparent background

**Expected Results**:
- ✅ Modal slides from bottom with smooth animation
- ✅ Modal has rounded top corners (borderTopLeftRadius, borderTopRightRadius)
- ✅ Modal header shows "Créer un nouveau travailleur" title
- ✅ Modal header has close (X) button on the right
- ✅ Form takes up center area with scrollable content
- ✅ Buttons appear in footer (not above scrollable content)

**Pass/Fail**: _______________

---

### Test 2: Form Validation - Empty Fields
**Goal**: Verify required field validation shows proper error messages

**Steps**:
1. Open worker creation modal (Test 1)
2. Leave Prénom (firstName) empty
3. Click "Créer" button

**Expected Results**:
- ✅ No API call made
- ✅ Error toast appears: "Le prénom est obligatoire"
- ✅ Modal stays open for correction
- ✅ Form fields remain editable
- ✅ No loading indicator shown

**Variations**:
- Empty "Nom" → "Le nom est obligatoire"
- Empty "ID Employé" → "L'ID employé est obligatoire"

**Pass/Fail**: _______________

---

### Test 3: Form Validation - Duplicate Employee ID
**Goal**: Verify backend detects duplicate employee IDs and shows proper error

**Steps**:
1. Open worker creation modal
2. Fill in a form:
   - Prénom: "John"
   - Nom: "Doe"
   - ID Employé: "[EXISTING_ID]" (use an ID that already exists in database)
3. Click "Créer"

**Expected Results**:
- ✅ Form fields disabled while loading
- ✅ "Création en cours..." message appears with spinner
- ✅ API call made to backend
- ✅ Backend returns error for duplicate ID
- ✅ Error toast appears: "Cet ID employé existe déjà"
- ✅ Modal stays open
- ✅ Form fields re-enabled for correction

**Pass/Fail**: _______________

---

### Test 4: Successful Worker Creation
**Goal**: Verify worker creation succeeds and updates UI properly

**Steps**:
1. Open worker creation modal
2. Fill in required fields:
   - Prénom: "Jane"
   - Nom: "Smith"
   - ID Employé: "[UNIQUE_ID]" (unique, not duplicate)
3. Fill in optional fields (optional but recommended):
   - Entreprise: "Acme Corp"
   - Poste: "Manager"
   - Email: "jane@acme.com"
   - Téléphone: "+1234567890"
4. Click "Créer"

**Expected Results**:
- ✅ Form fields disabled
- ✅ "Création en cours..." message with spinner appears
- ✅ API call made to backend
- ✅ Success toast appears: "Travailleur créé avec succès"
- ✅ Modal closes automatically
- ✅ Personnel list refreshes
- ✅ New worker appears in list

**Pass/Fail**: _______________

---

### Test 5: Loading State UI
**Goal**: Verify proper UI feedback during long-running operations

**Steps**:
1. Open worker creation modal
2. Fill in form with valid data
3. Click "Créer" and immediately observe
4. (If API is fast, may not see loading state; can simulate by slowing API)

**Expected Results**:
- ✅ Cancel/Create buttons disappear
- ✅ Loading spinner (ActivityIndicator) appears in footer
- ✅ "Création en cours..." text appears below spinner
- ✅ Form fields become non-editable (greyed out appearance)
- ✅ Close button (X) disabled during loading

**Pass/Fail**: _______________

---

### Test 6: Error Handling - Network Error
**Goal**: Verify app handles network failures gracefully

**Steps**:
1. Disconnect from network (or disable WiFi/cellular)
2. Open worker creation modal
3. Fill in form with valid data
4. Click "Créer"
5. Observe error handling

**Expected Results**:
- ✅ Error toast appears (generic message or specific network error)
- ✅ Modal stays open
- ✅ Loading state cleared (buttons reappear, loading message gone)
- ✅ Form fields re-enabled for retry

**Pass/Fail**: _______________

---

### Test 7: Error Handling - Missing Backend Fields
**Goal**: Verify app handles backend validation errors properly

**Steps**:
1. Open worker creation modal
2. Fill only minimum required fields:
   - Prénom: "Test"
   - Nom: "User"  
   - ID Employé: "TEST123"
3. Click "Créer"

**Expected Results**:
- ✅ Worker created successfully (optional fields should have defaults)
- OR
- ✅ Error toast with specific backend error message
- ✅ Modal stays open for correction

**Pass/Fail**: _______________

---

### Test 8: Bulk Import - File Validation
**Goal**: Verify bulk import validates files properly

**Steps**:
1. Click **"Importer"** button on Personnel Registry
2. Select **empty Excel file** (no data)
3. Observe result

**Expected Results**:
- ✅ Import modal opens
- ✅ Error message appears: "Le fichier est vide ou ne contient pas de données valides."
- ✅ Can select another file

**Variations**:
- Missing required columns → "Aucune ligne valide trouvée..."
- Valid file → Shows count of valid/invalid rows

**Pass/Fail**: _______________

---

### Test 9: Bulk Import - Successful Import
**Goal**: Verify successful bulk import with results display

**Steps**:
1. Create Excel file with columns:
   - firstName, lastName, employeeId, company, jobTitle, email, phone
2. Add 5 rows of valid data (with unique employee IDs)
3. Click "Importer" on Personnel Registry
4. Select the file

**Expected Results**:
- ✅ Import modal shows progress
- ✅ Success toast: "Importation réussie!"
- ✅ Results displayed:
   - Total rows in file
   - Valid rows processed
   - Invalid rows (if any)
   - Rows created vs updated
- ✅ Personnel list refreshed with new workers

**Pass/Fail**: _______________

---

### Test 10: Enterprise Edit Modal
**Goal**: Verify enterprise edit operations show proper error handling

**Steps**:
1. Navigate to **Worker & Enterprise** screen
2. Tap **Edit** button on an enterprise
3. Modify enterprise name or sector
4. Click **Save**

**Expected Results**:
- ✅ Loading state shows: "Création en cours..." (or similar)
- ✅ Success toast: "Entreprise mise à jour avec succès"
- ✅ Modal closes
- ✅ List updates with new data
- OR on error:
- ✅ Error toast: "Erreur lors de la mise à jour"
- ✅ Modal stays open for retry

**Pass/Fail**: _______________

---

### Test 11: Site Creation Modal
**Goal**: Verify site creation shows proper validation and error handling

**Steps**:
1. Navigate to **Worker & Enterprise** screen
2. Tap **Add Site** on an enterprise
3. Try submitting empty form

**Expected Results**:
- ✅ Error message (Alert or Toast): "Veuillez remplir les champs obligatoires"
- ✅ Modal stays open

**Steps** (continued):
4. Fill in required fields:
   - Site Name: "Branch A"
   - Site Manager: "John Manager"
5. Click **Create**

**Expected Results**:
- ✅ Loading state shows
- ✅ Success toast: "Site créé avec succès"
- ✅ Modal closes
- ✅ Site appears in list

**Pass/Fail**: _______________

---

### Test 12: Site Deletion
**Goal**: Verify site deletion shows confirmation and error handling

**Steps**:
1. Navigate to **Worker & Enterprise** screen
2. Open an enterprise's sites
3. Tap **Delete** on a site

**Expected Results**:
- ✅ Confirmation alert appears
- ✅ Upon confirmation:
   - Loading state shows
   - Success toast or error toast
   - Site removed from list on success

**Pass/Fail**: _______________

---

## Summary Checklist

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Modal Design & Animation | ⬜ | |
| 2 | Form Validation - Empty Fields | ⬜ | |
| 3 | Form Validation - Duplicate ID | ⬜ | |
| 4 | Successful Worker Creation | ⬜ | |
| 5 | Loading State UI | ⬜ | |
| 6 | Error Handling - Network Error | ⬜ | |
| 7 | Error Handling - Missing Fields | ⬜ | |
| 8 | Bulk Import - File Validation | ⬜ | |
| 9 | Bulk Import - Successful Import | ⬜ | |
| 10 | Enterprise Edit Modal | ⬜ | |
| 11 | Site Creation Modal | ⬜ | |
| 12 | Site Deletion | ⬜ | |

**Legend**: ⬜ = Not tested | ✅ = Passed | ❌ = Failed

---

## Common Issues & Solutions

### Issue 1: Modal doesn't appear or crashes
**Possible causes**:
- Missing imports (check `useSimpleToast`, `SimpleToastNotification`)
- TypeScript errors (check file for compile errors)
- State management issue

**Solution**:
- Check browser/simulator console for errors
- Run: `npm run type-check` or `tsc --noEmit`

### Issue 2: Toast notifications don't appear
**Possible causes**:
- `SimpleToastNotification` component missing at bottom of scrollview
- `useSimpleToast` hook not properly initialized
- Toast duration too short

**Solution**:
- Verify `SimpleToastNotification` component rendered in JSX (near end of file)
- Check `useSimpleToast` hook is called at top of component
- Look for console errors

### Issue 3: Form fields have no spacing
**Possible causes**:
- Styles not applied correctly
- `fieldLabel` or `input` styles missing
- CSS specificity issue

**Solution**:
- Check StyleSheet has `fieldLabel` and `input` defined
- Verify styles reference `colors`, `spacing`, `borderRadius` from theme
- Clear build cache and rebuild

### Issue 4: Duplicate ID error not showing
**Possible causes**:
- Backend not validating employee_id uniqueness
- Error response format different than expected
- Error message extraction logic doesn't match API response

**Solution**:
- Check backend returns employee_id error in response.data
- Verify backend endpoint: `POST /occupational-health/workers/`
- Check OccHealthApiService error response format

### Issue 5: Modal doesn't close after success
**Possible causes**:
- `setShowCreateModal(false)` not being called
- Async operation not completing
- State not updating properly

**Solution**:
- Add console.log to verify success condition is met
- Check error handling isn't triggering instead of success
- Ensure `loadPersonnel()` completes before closing modal

---

## Performance Notes

- Modal should open instantly (no loading state for modal itself)
- Worker creation API call should complete in < 3 seconds
- Bulk import processes files client-side for validation (fast)
- Personnel list refresh should complete in < 5 seconds

---

## Accessibility Notes

- All form fields have labels (for screen readers)
- Required fields marked with asterisk (*)
- Loading state shows text + spinner (not just spinner)
- Modal has close button and onRequestClose handler
- Form fields disabled during loading (prevents accidental re-submission)

---

## Next Steps If Tests Fail

1. **Check TypeScript Compilation**
   ```bash
   npm run type-check
   ```

2. **Check Console for Errors**
   - Open browser/simulator console
   - Look for red errors or warnings

3. **Verify API Service**
   - Check OccHealthApiService.post() method
   - Verify endpoint URL is correct
   - Check request payload format

4. **Verify Backend**
   - Check backend is running and accessible
   - Verify `/occupational-health/workers/` endpoint exists
   - Check backend logs for validation errors

5. **Debug with Logs**
   - Add console.log statements in handleCreateWorker
   - Add console.log in error handlers
   - Check API response in network tab

---

## File Locations for Reference

- **Screen**: `src/modules/occupational-health/screens/PersonnelRegistryScreen.tsx`
- **API Service**: `src/services/OccHealthApiService.ts`
- **Toast Hook**: `src/hooks/useSimpleToast.ts`
- **Toast Component**: `src/components/SimpleToastNotification.tsx`
- **Theme**: `src/theme/theme.ts`

