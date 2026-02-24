# Frontend API Integration Audit - Action Items

**Date:** February 24, 2026  
**Status:** 15+ screens need optimization

---

## 🔴 CRITICAL: Screens Using MOCK DATA ONLY (Zero API Calls)

### Group 1: Clinical Test Results (No CRUD)
| Screen | Mock Data | Backend API | Status |
|--------|-----------|-------------|--------|
| AudiometryResultScreen | SAMPLE_TESTS | ✅ `/heavy-metals-tests/` | ❌ Mock only |
| SpirometryResultScreen | SAMPLE_TESTS | ✅ `/heavy-metals-tests/` | ❌ Mock only |
| VisionTestResultScreen | SAMPLE_TESTS | ✅ `/xray-imaging/` | ❌ Mock only |
| ErgonomicAssessmentScreen | SAMPLE_ASSESSMENTS | ✅ `/hierarchy-of-controls/` | ❌ Mock only |
| MentalHealthScreeningScreen | SAMPLE_SCREENINGS | ✅ `/drug-alcohol-screening/` | ❌ Mock only |

### Group 2: Exam/Incident Management (Partial Implementation)
| Screen | Mock Data | Backend API | Status |
|--------|-----------|-------------|--------|
| MedicalExamManagementScreen | SAMPLE_SCHEDULES + SAMPLE_RESULTS | ✅ `/examinations/` | ❌ Display only |
| IncidentInvestigationScreen | SAMPLE_INVESTIGATIONS | ✅ Available | ❌ Mock only |
| IncidentDashboardScreen | SAMPLE_INCIDENTS | ✅ `/workplace-incidents/` | ❌ Mock only |
| ExposureMonitoringScreen | SAMPLE_READINGS | ✅ Partial | ❌ Mock only |

### Group 3: Registry/Configuration (Display-Only)
| Screen | Mock Data | Backend API | Status |
|--------|-----------|-------------|--------|
| DiseaseRegistryAndHealthScreeningScreen | mockDiseases | ✅ `/occupational-diseases/` | ❌ Mock only |
| WorkerAndEnterpriseScreen | mockWorkers + mockEnterprises | ✅ Available | ❌ Mock only |
| MedicalTestVisualizationScreen | mockWorkers | ✅ Multiple endpoints | ❌ Display only |
| ComplianceScreen | SAMPLE_ITEMS + SAMPLE_AUDITS | ✅ Available | ❌ Mock only |
| OccHealthConsultationScreen | SAMPLE_WORKERS | ✅ `/examinations/`, `/vital-signs/` | ⚠️ Partial |

---

## 🟡 NEWLY CREATED Screens (Tier 2 - Just Added)

| Screen | Backend API | Current State | Next Step |
|--------|-------------|---------------|-----------|
| WorkerRiskProfileScreen | ✅ `/worker-risk-profiles/` | Skeleton with mock data | Need real API integration |
| OverexposureAlertScreen | ✅ `/overexposure-alerts/` | Skeleton with mock data | Need real API integration |
| PPEComplianceRecordScreen | ✅ `/ppe-compliance/` | Skeleton with mock data | Need real API integration |

---

## 🎯 OPTIMIZATION PRIORITY

### **Phase 1: TIE** (These 2 screens are critical - IncidentsScreen already has API)
- ✅ **IncidentsScreen** - VERIFY API calls are working
- ❌ **IncidentInvestigationScreen** - Convert to API (high impact)
- ❌ **IncidentDashboardScreen** - Convert to API (uses SAMPLE_INCIDENTS)

### **Phase 2: Clinical Tests** (5 screens - High medical relevance)
- ❌ AudiometryResultScreen - `APIEndpoint: /heavy-metals-tests/`
- ❌ SpirometryResultScreen - `APIEndpoint: /heavy-metals-tests/`
- ❌ VisionTestResultScreen - `APIEndpoint: /xray-imaging/`
- ❌ ErgonomicAssessmentScreen - `APIEndpoint: /hierarchy-of-controls/`
- ❌ MentalHealthScreeningScreen - `APIEndpoint: /drug-alcohol-screening/`

### **Phase 3: Management Screens** (4 screens)
- ❌ MedicalExamManagementScreen - `/examinations/`
- ❌ ExposureMonitoringScreen - Partial API (SAMPLE_READINGS fallback)
- ❌ WorkerAndEnterpriseScreen - Convert to API-first
- ❌ DiseaseRegistryAndHealthScreeningScreen - Convert to API

### **Phase 4: Newly Created Tier 2** (3 screens - Needs API integration)
- ⚠️ WorkerRiskProfileScreen - Replace mock with real API calls
- ⚠️ OverexposureAlertScreen - Replace mock with real API calls
- ⚠️ PPEComplianceRecordScreen - Replace mock with real API calls

### **Phase 5: Complex/Display-Only** (2 screens)
- ⚠️ MedicalTestVisualizationScreen - Add data filtering/API integration
- ⚠️ ComplianceScreen - Convert to API

---

## 📊 CONVERSION PATTERN (Template)

When converting mock-only screens to API integration:

```typescript
// BEFORE (Current)
const SAMPLE_DATA = [{ id: '1', ... }];
const [data, setData] = useState<Type[]>(SAMPLE_DATA);

// AFTER (Required)
const [data, setData] = useState<Type[]>([]);
const [loading, setLoading] = useState(false);

useEffect(() => {
  loadData();
}, []);

const loadData = async () => {
  try {
    setLoading(true);
    const token = await AsyncStorage.getItem('auth_token');
    const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const response = await axios.get(
      `${baseURL}/api/v1/occupational-health/{endpoint}/`,
      { headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' } }
    );
    setData(Array.isArray(response.data) ? response.data : response.data.results || []);
  } catch (error) {
    console.error('API Error:', error);
    setData(SAMPLE_DATA); // Fallback only
  } finally {
    setLoading(false);
  }
};
```

---

## 🔧 API ENDPOINTS VERIFICATION NEEDED

| Model | Endpoint | CRUD Status | Frontend |
|-------|----------|-------------|----------|
| AudiometryResult | `/heavy-metals-tests/` | ✅ | ❌ |
| SpirometryResult | `/heavy-metals-tests/` | ✅ | ❌ |
| VisionTestResult | `/xray-imaging/` | ✅ | ❌ |
| ErgonomicAssessment | `/hierarchy-of-controls/` | ✅ | ❌ |
| MentalHealthScreening | `/drug-alcohol-screening/` | ✅ | ❌ |
| WorkerRiskProfile | `/worker-risk-profiles/` | ✅ | ⚠️ Mock |
| OverexposureAlert | `/overexposure-alerts/` | ✅ | ⚠️ Mock |
| PPEComplianceRecord | `/ppe-compliance/` | ✅ | ⚠️ Mock |

---

## ✅ NEXT ACTIONS

1. **Verify** IncidentsScreen has real API calls (not mock)
2. **Prioritize** IncidentInvestigationScreen → Full API conversion
3. **Create** conversion batch for 5 clinical test screens
4. **Update** Tier 2 screens (WorkerRiskProfile, OverexposureAlert, PPECompliance) to use real APIs
5. **Test** all screens with backend database
