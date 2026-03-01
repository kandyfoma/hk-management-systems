# Risk Assessment Screen - Deep Dive Analysis & Issues Found

## Critical Issues Identified

### 1. **API Response Handling - Data Loss Risk** 
**Severity:** HIGH
- **Issue:** When grouping hazards by `key = ${h.assessment_date}-${h.assessed_by}`, the assessment ID is set to `h.id` (the first hazard's ID). This causes ID collision when an assessment has multiple hazards.
- **Impact:** Assessment IDs are overwritten, causing data loss in state management
- **Edge Case:** Multiple hazards per assessment → wrong assessment ID stored

### 2. **Null/Undefined Property Access**
**Severity:** HIGH
- **Issue:** `h.workers_exposed?.length` returns undefined if `workers_exposed` is null, causing `affectedWorkers` to be `0` instead of actual count
- **Issue:** `h.existing_controls.split(',')` crashes if `existing_controls` is null or not a string
- **Issue:** Missing validation for `h.assessment_date`, `h.assessed_by_name`, `h.work_site.name`
- **Impact:** Silent failures, data corruption, potential runtime crashes

### 3. **Risk Level Mapping Incomplete**
**Severity:** MEDIUM
- **Issue:** Only maps `risk_level === 'critical' → 'very_high'`, other values pass through untransformed
- **Impact:** Inconsistent risk levels between backend and frontend (backend has 'critical', frontend expects 'very_high')

### 4. **Form Validation Insufficient**
**Severity:** MEDIUM
- **Issue:** Site field validated, but sector defaults silently to 'mining' without user knowing
- **Issue:** No validation for assessor name (could be empty despite being required field)
- **Issue:** Area field can be empty (defaults to 'Non spécifié'), but this isn't user-friendly
- **Impact:** Forms submit with incomplete/misleading data

### 5. **API Token Retrieval - Silent Failures**
**Severity:** MEDIUM
- **Issue:** `AsyncStorage.getItem('auth_token')` could return null, but code doesn't check
- **Issue:** Axios headers will have `Authorization: Token null` if token is missing
- **Impact:** All API calls fail with 401, silently fall back to sample data

### 6. **Search Not Handling Accents/Diacritics**
**Severity:** LOW
- **Issue:** Search query `toLowerCase()` doesn't normalize accents
- **Example:** User searches "site" but data has "Siège" - no match
- **Impact:** Poor UX for French/accented text

### 7. **Matrix Component Filters Silently**
**Severity:** MEDIUM
- **Issue:** Hazards with likelihood/consequence outside 1-5 range are filtered out without logging
- **Issue:** No visual indicator showing some hazards were filtered
- **Impact:** Matrix appears incomplete, user doesn't know why

### 8. **Responsive Design Not Handling Orientation Changes**
**Severity:** LOW
- **Issue:** `const isDesktop = width >= 1024` is evaluated once at module load
- **Issue:** Rotating device doesn't re-evaluate (no useDimensions listener)
- **Impact:** Wrong layout after device rotation

### 9. **saveData Loop Without Error Handling**
**Severity:** HIGH
- **Issue:** `for (const hazard of assessment.hazards)` posts to API one by one
- **Issue:** If 3rd request fails, first 2 are already posted (no transaction)
- **Issue:** No partial failure reporting
- **Impact:** Inconsistent data on backend, no way to rollback

### 10. **Empty Initial State Doesn't Show Loading**
**Severity:** LOW
- **Issue:** loadData is async but component renders with SAMPLE_ASSESSMENTS immediately
- **Issue:** Real API data loads after, causing UI flash
- **Issue:** No loading indicator
- **Impact:** Poor UX, "pop-in" effect when data loads

### 11. **Review Date Hardcoded to 180 Days**
**Severity:** MEDIUM
- **Issue:** `new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)` is hardcoded
- **Issue:** Should be configurable per sector/hazard type
- **Issue:** No validation for date being in future
- **Impact:** Incorrect review schedules

### 12. **Stats Calculate from ALL Assessments, Not Filtered**
**Severity:** MEDIUM
- **Issue:** Stats show totals for all assessments, not just filtered search results
- **Issue:** User searches for one site, sees stats for all sites
- **Impact:** Confusing UI, stats don't match visible data

---

## Issues by Category

### **Data Integrity Issues:**
- API response grouping loses assessment IDs (#1)
- Null property access causes silent failures (#2)
- Risk level mapping incomplete (#3)

### **API/Backend Issues:**
- Token validation missing (#5)
- API saves without transaction support (#9)

### **UX/Validation Issues:**
- Form validation insufficient (#4)
- No loading indicator (#10)
- Stats don't match filtered view (#12)
- Matrix silently filters data (#7)

### **Code Quality Issues:**
- Orientation changes not handled (#8)
- Search doesn't handle accents (#6)
- Review date hardcoded (#11)

---

## Testing Edge Cases Covered

✓ Risk scores 0-25 range validation
✓ Invalid likelihood/consequence (0, 6, negative, null)
✓ Empty assessment list
✓ Null/undefined in API response
✓ Failed API call fallback
✓ Form submission with empty fields
✓ Search with special characters
✓ Multiple hazards per assessment
✓ Device orientation change
✓ Large datasets (matrix rendering)

