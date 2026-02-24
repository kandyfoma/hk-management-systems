# Backend/Frontend Coverage Audit
## Occupational Health Module - February 24, 2026

### Executive Summary
- **Backend Models:** 31 models with API endpoints
- **Frontend Screens:** 26 screens
- **Gap:** 10+ models without proper frontend screens or API integration
- **Critical Issues:** Mock data, no CRUD operations, missing menu items

---

## ✅ FULLY INTEGRATED (Model → API → Frontend)

| Backend Model | API ViewSet | Frontend Screen | Status |
|---|---|---|---|
| WorkplaceIncident | `workplace-incidents/` | IncidentsScreen | ✅ LIVE (just integrated) |
| HazardIdentification | `hazard-identifications/` | RiskAssessmentScreen | ✅ LIVE (just integrated) |
| PPEItem | `ppe-items/` | PPEManagementScreen | ✅ LIVE (just integrated) |
| MedicalExamination | `examinations/` | OccHealthConsultationScreen | ✅ LIVE |
| VitalSigns | `vital-signs/` | OccHealthConsultationScreen | ✅ LIVE |
| FitnessCertificate | `fitness-certificates/` | CertificatesScreen | ✅ LIVE |
| OccupationalDisease | `occupational-diseases/` | DiseasesScreen | ✅ LIVE |

---

## ⚠️ PARTIALLY INTEGRATED (Model exists → API exists, but Frontend uses MOCK DATA)

| Backend Model | API ViewSet | Frontend Screen | Issue |
|---|---|---|---|
| AudiometryResult | `heavy-metals-tests` | MedicalTestVisualizationScreen | ❌ Mock data only, no CRUD |
| SpirometryResult | `heavy-metals-tests` | MedicalTestVisualizationScreen | ❌ Mock data only, no CRUD |
| VisionTestResult | `xray-imaging` | MedicalTestVisualizationScreen | ❌ Mock data only, no CRUD |
| MentalHealthScreening | `drug-alcohol-screening` | DiseaseRegistryAndHealthScreeningScreen | ❌ Mock data only, no form submission |
| ErgonomicAssessment | `hierarchy-of-controls` | DiseaseRegistryAndHealthScreeningScreen | ❌ Mock data only, no form submission |
| ExitExamination | `exit-exams/` | MedicalTestVisualizationScreen | ⚠️ Partial, limited functionality |

---

## 🔴 MISSING (Model & API exist, but NO Frontend)

| Backend Model | API ViewSet | Endpoint | Frontend Screen | Menu Item |
|---|---|---|---|---|
| WorkerRiskProfile | `worker-risk-profiles/` | `/api/v1/occupational-health/worker-risk-profiles/` | ❌ MISSING | ❌ MISSING |
| OverexposureAlert | `overexposure-alerts/` | `/api/v1/occupational-health/overexposure-alerts/` | ❌ MISSING | ❌ MISSING |
| PPEComplianceRecord | `ppe-compliance/` | `/api/v1/occupational-health/ppe-compliance/` | ❌ MISSING | ❌ MISSING |
| XrayImagingResult | `xray-imaging/` | `/api/v1/occupational-health/xray-imaging/` | ❌ MISSING | ❌ MISSING |
| DrugAlcoholScreening | `drug-alcohol-screening/` | `/api/v1/occupational-health/drug-alcohol-screening/` | ❌ MISSING | ❌ MISSING |
| HeavyMetalsTest | `heavy-metals-tests/` | `/api/v1/occupational-health/heavy-metals-tests/` | ❌ MISSING | ❌ MISSING |

---

## 📋 CONFIGURATION MODELS (Backend only - normally don't need full CRUD screens)

| Backend Model | Purpose | Status |
|---|---|---|
| MedicalExamCatalog | Reference data for exam types | ✅ Config |
| OccSector | Reference data for sectors | ✅ Config |
| OccDepartment | Reference data for departments | ✅ Config |
| OccPosition | Reference data for positions | ✅ Config |
| ExamVisitProtocol | Reference protocols | ✅ Config |
| ProtocolRequiredExam | Protocol-exam mapping | ✅ Config |

---

## 🎯 RECOMMENDED PRIORITY FOR FRONTEND IMPLEMENTATION

### TIER 1 - User-Facing Clinical Tests (High Priority)
These are essential for occupational health workflows:

1. **AudiometryScreen** → `AudiometryResult` model
   - Hearing test management
   - Results display and trends
   - Compliance with occupational hearing loss protocols

2. **SpirometryScreen** → `SpirometryResult` model
   - Lung function tests
   - FREV/FVC ratio tracking
   - Occupational respiratory disease monitoring

3. **VisionTestScreen** → `VisionTestResult` model
   - Visual acuity testing
   - Color blindness screening
   - Refractive error tracking

4. **ErgonomicAssessmentScreen** → `ErgonomicAssessment` model
   - Workstation evaluation
   - MSK risk scoring
   - Control recommendations

5. **MentalHealthScreen** → `MentalHealthScreening` model
   - Burnout assessment
   - Stress evaluation
   - Psychosocial risk scoring

### TIER 2 - Risk & Compliance Management (Medium Priority)
These support occupational health program management:

6. **WorkerRiskProfileScreen** → `WorkerRiskProfile` model
   - Health risk scoring
   - Exposure history
   - Compliance tracking
   - Risk level visualization

7. **OverexposureAlertScreen** → `OverexposureAlert` model
   - Alert management
   - Exposure incidents
   - Action tracking
   - Trend analysis

8. **PPEComplianceScreen** → `PPEComplianceRecord` model
   - PPE assignment tracking
   - Compliance verification
   - Inspection scheduling
   - Non-compliance reporting

### TIER 3 - Specialized Medical Tests (Lower Priority)
Specialized tests used in specific sectors:

9. **DrugAlcoholScreeningScreen** → `DrugAlcoholScreening` model
10. **HeavyMetalsTestScreen** → `HeavyMetalsTest` model
11. **XrayImagingScreen** → `XrayImagingResult` model

---

## 🔧 CURRENT GAP ANALYSIS

### Missing Complete Implementations
- **AudiometryScreen** - Tier 1 (hearing tests)
- **SpirometryScreen** - Tier 1 (lung function)
- **VisionTestScreen** - Tier 1 (vision tests)
- **ErgonomicAssessmentScreen** - Tier 1 (ergonomic eval)
- **MentalHealthScreen** - Tier 1 (mental health)
- **WorkerRiskProfileScreen** - Tier 2 (risk management)
- **OverexposureAlertScreen** - Tier 2 (exposure management)
- **PPEComplianceScreen** - Tier 2 (compliance tracking)

### Issues with Existing Screens
- DiseaseRegistryAndHealthScreeningScreen: Uses SAMPLE_ASSESSMENTS mock data
- MedicalTestVisualizationScreen: Display-only, no API integration
- ExposureMonitoringScreen: Partial implementation

### Missing Navigation Items
- No menu items for: Risk Profiles, Overexposure Alerts, PPE Compliance
- Test screens not in "Tests Médicaux" submenu

---

## 💡 ARCHITECTURE REQUIREMENTS

Each new screen must have:

1. **Backend API Integration** (via axios)
   ```
   GET /api/v1/occupational-health/{model}/
   POST /api/v1/occupational-health/{model}/
   PATCH /api/v1/occupational-health/{model}/{id}/
   DELETE /api/v1/occupational-health/{model}/{id}/
   ```

2. **Frontend Components**
   - List view with filters
   - Detail/edit modal
   - Create form
   - Delete confirmation
   - API error handling with AsyncStorage fallback

3. **Navigation Integration**
   - Screen added to `OccHealthNavigator.tsx`
   - Menu item in appropriate sidebar section
   - Proper icon and label

4. **Data Sync**
   - Real-time data from database
   - Offline fallback support
   - Refresh on mount

---

## 🎯 RECOMMENDATION

**Start with TIER 1 (Clinical Tests)** because:
- High clinical relevance
- Heavy user expectations
- Real occupational health workflows
- Good models for backend integration patterns

**Estimated effort:**
- Each screen: 2-3 hours (full CRUD + API)
- Tier 1: ~15 hours total
- Tier 2: ~12 hours total
- All screens: ~27 hours total
