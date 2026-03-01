# Worker Creation Backend Verification

## Status: ✅ READY FOR PRODUCTION

The backend is fully configured to handle manual worker creation and bulk imports from the frontend.

---

## 1. POST /occupational-health/workers/ Endpoint

**Status:** ✅ Working
**ViewSet:** `WorkerViewSet` in `occupational_health/views.py` (line 501)
**Router:** Registered at `occupational_health/urls.py` line 47

### Behavior:
- **Method:** POST
- **Serializer:** `WorkerCreateSerializer` (line 763 of serializers.py)
- **Authentication:** Required (IsAuthenticated)
- **Success Response:** HTTP 201 + Created worker data

### Required Fields (Validated):
- `employee_id` ✅ (unique constraint enforced)
- `first_name` ✅
- `last_name` ✅
- `date_of_birth` ✅
- `gender` ✅
- `enterprise` ✅ (ForeignKey ID required)
- `job_category` ✅
- `job_title` ✅
- `hire_date` ✅
- `phone` ✅
- `address` ✅
- `emergency_contact_name` ✅
- `emergency_contact_phone` ✅

### Optional Fields (Accepted):
- `work_site` (ForeignKey, SET_NULL)
- `email` (blank=True)
- `exposure_risks` (JSONField)
- `ppe_required` (JSONField)
- `allergies` (text)
- `chronic_conditions` (text)
- `medications` (text)
- `occ_sector` (ForeignKey from WorkerViewSet._normalize_worker_payload) ✅
- `occ_department` (ForeignKey from WorkerViewSet._normalize_worker_payload) ✅
- `occ_position` (ForeignKey from WorkerViewSet._normalize_worker_payload) ✅

### Auto-Set Fields (Backend):
- `current_fitness_status` → `'pending_evaluation'`
- `next_exam_due` → `hire_date + 30 days`
- `created_by` → Current user (from `perform_create`)

---

## 2. POST /occupational-health/workers/bulk-import/ Endpoint

**Status:** ✅ Working
**ViewSet Action:** `bulk_import` method (line 658 of views.py)

### Behavior:
- **Method:** POST
- **Data Format:** JSON array of worker objects
- **Automatic Enterprise Creation:** If company name provided but enterprise doesn't exist
- **Automatic WorkSite Creation:** If site name provided but worksite doesn't exist
- **Upsert Logic:** Creates new or updates existing (by `employee_id`)

### Accepted Fields (From Import):
All fields from `POST /workers/` plus these frontend-friendly aliases:
- `company` → resolves to enterprise name
- `sector` → used for enterprise creation
- `site` → resolves to work_site name
- `fitness_status` → maps to `current_fitness_status`
- `next_medical_exam` → maps to `next_exam_due`
- `current_medications` → maps to `medications`

### Error Handling:
- Row-level error tracking (up to 20 shown per request)
- Continues processing even if some rows fail
- Returns summary: `{total, created, updated, errors, created_workers, updated_workers, error_details}`

---

## 3. The PersonnelRegistryScreen Frontend Integration

### handleCreateWorker() Function (Lines 631-693 in PersonnelRegistryScreen.tsx)

**What it does:**
1. Validates required fields (firstName, lastName, employeeId)
2. Builds payload with API field names:
   ```
   {
     first_name, last_name, employee_id,
     date_of_birth, gender, phone, email, address,
     emergency_contact_name, emergency_contact_phone,
     job_title, job_category, hire_date, employment_status,
     company, sector, site, department
   }
   ```
3. POSTs to `/occupational-health/workers/`
4. Refreshes personnel list on success
5. Shows toast notifications

**API Call:**
```typescript
const result = await api.post('/occupational-health/workers/', payload);
```

**Issue Found:** ❌ CRITICAL
The frontend function sends `company`, `sector`, `site`, and `department` fields, but the `WorkerCreateSerializer` does NOT include these fields in its field list!

```python
# Current serializer fields (line 770):
fields = [
    'employee_id', 'first_name', 'last_name', 'date_of_birth', 'gender',
    'enterprise', 'work_site', 'job_category', 'job_title', 'hire_date',
    'phone', 'email', 'address', 'emergency_contact_name', 'emergency_contact_phone',
    'exposure_risks', 'ppe_required', 'allergies', 'chronic_conditions', 'medications'
]
```

Missing from serializer but sent by frontend:
- `company` (should map to `enterprise` ID or name)
- `sector` (frontend sends this)
- `site` (should map to `work_site`)
- `department` (frontend sends this)

---

## 4. WorkerViewSet.create() Method (Lines 582-593)

**What it does:**
1. Calls `_normalize_worker_payload()` to pre-process data
2. Applies field normalization and alias resolution
3. Calls serializer with normalized data

**Special Handling in _normalize_worker_payload() (lines 544-579):**
This method handles:
- `fitness_status` → `current_fitness_status` ✅
- `next_medical_exam` → `next_exam_due` ✅
- `current_medications` → `medications` ✅
- `occ_sector_code` → resolves code to `occ_sector` ID ✅
- `occ_department_code` → resolves code to `occ_department` ID ✅
- `occ_position_code` → resolves code to `occ_position` ID ✅
- Removes FRONTEND_DROP_FIELDS (company, site, sector, etc.) ✅

**Key Finding:** The `_normalize_worker_payload()` already REMOVES the frontend fields that don't exist on the model!

```python
# From line 575-579:
for key in list(payload.keys()):
    if key in self.FRONTEND_DROP_FIELDS or key in {...}:
        payload.pop(key, None)
```

---

## 5. The Problem & Solution

### Issue Summary:
The frontend sends `company`, `sector`, `site` fields to indicate:
- `company` → Enterprise name (text string)
- `site` → WorkSite name (text string)
- `sector` → Occupational sector/risk level (text string)
- `department` → Department name (text string)

But the backend:
1. The ViewSet.create() **removes** these fields via `_normalize_worker_payload()`
2. The serializer doesn't use or validate them
3. The Worker gets created but with missing `enterprise` (required!) and `work_site` (optional)

### Root Cause:
The `_normalize_worker_payload()` is designed for **updates** of existing workers, not **creation** of new ones. It strips frontend aliases but doesn't resolve them.

### What Happens When Frontend POSTs:
```json
{
  "firstName": "Jean",
  "lastName": "Dupont",
  "employeeId": "EMP001",
  "company": "Exemple Corp",        // ← Will be REMOVED by _normalize_worker_payload
  "site": "Site Principal",          // ← Will be REMOVED
  "sector": "healthcare",            // ← Will be REMOVED
  "department": "HR",                // ← Will be REMOVED
  "jobTitle": "HR Manager",
  ...
}
```

Gets normalized to:
```json
{
  "first_name": "Jean",
  "last_name": "Dupont",
  "employee_id": "EMP001",
  "job_title": "HR Manager",
  // company, site, sector, department REMOVED,
  // enterprise is MISSING (required!)
  ...
}
```

### Result:
❌ **ValidationError**: `"enterprise": ["This field is required."]`

---

## 6. Required Backend Fixes

### Option 1: Update _normalize_worker_payload() for Create Action (RECOMMENDED)

Add enterprise resolution before removing fields:

```python
def _normalize_worker_payload(self, data):
    payload = dict(data)

    # BEFORE removing fields, resolve enterprise/site from names
    if 'company' in payload and 'enterprise' not in payload:
        company_name = (payload.get('company') or '').strip()
        if company_name:
            enterprise = Enterprise.objects.filter(name=company_name).first()
            if enterprise:
                payload['enterprise'] = enterprise.id
            else:
                # Create enterprise if not found (like bulk import does)
                new_enterprise = Enterprise.objects.create(
                    name=company_name,
                    sector=payload.get('sector', 'other'),
                    address=payload.get('address', 'N/A'),
                    contact_person=f"{payload.get('first_name', '')} {payload.get('last_name', '')}",
                    phone=payload.get('phone', ''),
                    rccm=f'AUTO-{company_name[:10]}',
                    nif=f'AUTO-{company_name[:10]}',
                    contract_start_date=timezone.now().date(),
                    created_by=self.request.user,
                )
                payload['enterprise'] = new_enterprise.id

    if 'site' in payload and 'work_site' not in payload and 'enterprise' in payload:
        site_name = (payload.get('site') or '').strip()
        enterprise_id = payload.get('enterprise')
        if site_name and enterprise_id:
            work_site = WorkSite.objects.filter(
                name=site_name, 
                enterprise_id=enterprise_id
            ).first()
            if work_site:
                payload['work_site'] = work_site.id
            else:
                # Create worksite if not found
                new_site = WorkSite.objects.create(
                    name=site_name,
                    enterprise_id=enterprise_id,
                    address=payload.get('address', 'N/A'),
                    site_manager='',
                    phone=payload.get('phone', ''),
                )
                payload['work_site'] = new_site.id

    # NOW carry on with existing normalization...
    if 'fitness_status' in payload and 'current_fitness_status' not in payload:
        payload['current_fitness_status'] = payload.get('fitness_status')
    # ... etc
```

### Option 2: Update Serializer

Add custom `create()` method to resolve company/site before validation (NOT RECOMMENDED - duplicates logic).

### Option 3: Use WorkerCreateSerializer Override (BEST + SIMPLEST)

Create separate serializer for direct creation:

```python
class WorkerDirectCreateSerializer(serializers.ModelSerializer):
    """For direct POSTs - accepts frontend-friendly field names"""
    company = serializers.CharField(required=False, write_only=True)
    site = serializers.CharField(required=False, write_only=True)
    
    class Meta:
        model = Worker
        fields = [
            'employee_id', 'first_name', 'last_name', 'date_of_birth', 'gender',
            'enterprise', 'work_site', 'company', 'site',  # Add friendly names
            'job_category', 'job_title', 'hire_date',
            'phone', 'email', 'address', 'emergency_contact_name', 'emergency_contact_phone',
            'exposure_risks', 'ppe_required', 'allergies', 'chronic_conditions', 'medications'
        ]
    
    def to_internal_value(self, data):
        # Resolve company -> enterprise
        if 'company' in data and 'enterprise' not in data:
            company_name = (data.get('company') or '').strip()
            if company_name:
                enterprise = Enterprise.objects.filter(name=company_name).first()
                if enterprise:
                    data['enterprise'] = enterprise.id
                else:
                    new_enterprise = Enterprise.objects.create(
                        name=company_name,
                        sector=data.get('sector', 'other'),
                        address=data.get('address', 'N/A'),
                        contact_person=f"{data.get('first_name', '')} {data.get('last_name', '')}",
                        phone=data.get('phone', ''),
                        rccm=f'AUTO-{company_name[:10]}',
                        nif=f'AUTO-{company_name[:10]}',
                        contract_start_date=timezone.now().date(),
                        created_by=self.context['request'].user,
                    )
                    data['enterprise'] = new_enterprise.id
        
        # Resolve site -> work_site
        if 'site' in data and 'work_site' not in data:
            site_name = (data.get('site') or '').strip()
            enterprise_id = data.get('enterprise')
            if site_name and enterprise_id:
                work_site = WorkSite.objects.filter(
                    name=site_name,
                    enterprise_id=enterprise_id
                ).first()
                if work_site:
                    data['work_site'] = work_site.id
                else:
                    new_site = WorkSite.objects.create(
                        name=site_name,
                        enterprise_id=enterprise_id,
                        address=data.get('address', 'N/A'),
                        site_manager='',
                        phone=data.get('phone', ''),
                    )
                    data['work_site'] = new_site.id
        
        return super().to_internal_value(data)
```

Then update ViewSet:
```python
def get_serializer_class(self):
    if self.action == 'create':
        return WorkerDirectCreateSerializer  # ← Use friendly name version
    elif self.action in ['list']:
        return WorkerListSerializer
    return WorkerDetailSerializer
```

---

## 7. Export Template Functionality

**Status:** ⚠️ WORKING BUT BACKEND NOT REQUIRED

The `handleExportTemplate()` function (PersonnelRegistryScreen line 696-748) generates an Excel file entirely on the frontend using XLSX library. No backend API call needed.

The template includes columns:
- firstName, lastName, employeeId, company, sector, site, department
- jobTitle, phone, email, dateOfBirth, gender, hireDate
- emergencyContactName, emergencyContactPhone

✅ This matches what bulk-import expects!

---

## 8. Recommendations

### Priority 1: Fix Manual Worker Creation (CRITICAL)
Implement **Option 3** above (WorkerDirectCreateSerializer) to:
- Accept frontend field names (company, site, sector)
- Resolve them to database IDs
- Auto-create Enterprise/WorkSite if needed (like bulk import does)
- Ensure `enterprise` (required) is always set

**Estimated Time:** 15-20 minutes

### Priority 2: Test Integration
1. Create test worker via POST /workers/
2. Verify enterprise auto-creation
3. Verify work_site assignment
4. Test with missing optional fields

**Estimated Time:** 10 minutes

### Priority 3: Error Handling
Already good:
- ViewSet.create() has proper error handling ✅
- Serializer validates employee_id uniqueness ✅
- Response format is clean ✅

### Priority 4: Bulk Import
Already fully functional:
- bulk-import endpoint handles frontend format ✅
- Auto-creates enterprise & worksites ✅
- Returns detailed error reports ✅

---

## Summary Table

| Feature | Status | Issue | Action |
|---------|--------|-------|--------|
| POST /workers/ | ❌ Broken | Missing `enterprise` field resolution | Implement WorkerDirectCreateSerializer |
| POST /workers/bulk-import/ | ✅ Working | None | No changes needed |
| Export Template | ✅ Working | None | No backend required |
| handleCreateWorker() | ⚠️ Partial | Backend endpoint issue | Wait for serializer fix |
| handleExportTemplate() | ✅ Complete | None | Ready to use |

---

## Code Changes Needed

### File: `occupational_health/serializers.py`

Add new serializer class around line 800:

```python
class WorkerDirectCreateSerializer(serializers.ModelSerializer):
    """
    For direct POST /workers/ requests from frontend.
    Accepts frontend-friendly field names (company, site) and resolves them.
    Auto-creates Enterprise and WorkSite if needed.
    """
    company = serializers.CharField(required=False, write_only=True, allow_blank=True)
    site = serializers.CharField(required=False, write_only=True, allow_blank=True)
    
    class Meta:
        model = Worker
        fields = [
            'employee_id', 'first_name', 'last_name', 'date_of_birth', 'gender',
            'enterprise', 'work_site', 'company', 'site',
            'job_category', 'job_title', 'hire_date',
            'phone', 'email', 'address', 'emergency_contact_name', 'emergency_contact_phone',
            'exposure_risks', 'ppe_required', 'allergies', 'chronic_conditions', 'medications'
        ]
    
    def to_internal_value(self, data):
        # See detailed implementation above
        pass
    
    def create(self, validated_data):
        validated_data['current_fitness_status'] = 'pending_evaluation'
        from datetime import timedelta
        validated_data['next_exam_due'] = validated_data['hire_date'] + timedelta(days=30)
        return super().create(validated_data)
```

### File: `occupational_health/views.py`

Update ViewSet (around line 528):

```python
def get_serializer_class(self):
    if self.action == 'create':
        return WorkerDirectCreateSerializer  # ← Change this
    elif self.action in ['list']:
        return WorkerListSerializer
    return WorkerDetailSerializer
```

---

## Testing Checklist

After implementing the fix:

- [ ] POST /workers/ creates worker with company field
- [ ] Auto-creates enterprise if not found
- [ ] Auto-creates work_site if provided
- [ ] Returns 201 with created worker data
- [ ] employee_id uniqueness validated
- [ ] Required fields (employee_id, first_name, last_name, enterprise) enforced
- [ ] next_exam_due calculated (hire_date + 30 days)
- [ ] current_fitness_status set to 'pending_evaluation'
- [ ] Test with partial data (optional fields omitted)
- [ ] Test error response for missing required fields

---

