# 🚀 Surveillance Programs — Quick Reference Guide

> **Version**: 2.0 (3 Features)  
> **Status**: ✅ Complete & Documented  
> **Release Date**: February 24, 2026

---

## ⚡ 30-Second Overview

**What's New?**
- ✅ Surveillance programs saved to database (persistent)
- ✅ Auto-detect when exam results violate thresholds
- ✅ Real-time compliance dashboard for managers

**Why Important?**
- Legally mandated medical surveillance (ISO 45001, ILO C155)
- Early detection of occupational health issues
- Regulatory audit-ready compliance tracking

**Who Uses It?**
- 👨‍⚕️ OH Physicians → Define programs, see alerts
- 👮 Safety Officers → Ensure all risks covered
- 👔 HR Managers → Enroll workers, track compliance
- 📋 Compliance Officers → Generate reports
- 📊 Site Managers → Monitor local compliance

---

## 📁 Documentation Files

| File | Purpose | Read Time |
|------|---------|-----------|
| **[SURVEILLANCE_IMPLEMENTATION_GUIDE.md](../SURVEILLANCE_IMPLEMENTATION_GUIDE.md)** | Complete technical specifications + API reference | 30 min |
| **[OCCUPATIONAL_HEALTH_WORKFLOW.md](./OCCUPATIONAL_HEALTH_WORKFLOW.md#-surveillance-programs-system-v20--enhanced-implementation)** | Integrated into main workflow guide | 10 min |
| **[This File]** | Quick reference & checklists | 5 min |

---

## 📋 Feature Checklist

### Feature 1: Backend API ✅
- [x] 12 API endpoints designed
- [x] Request/response specs documented
- [x] Error handling specified
- [x] Authentication requirements defined
- [ ] **TODO**: Implement backend endpoints

**Key Endpoints**:
```
POST   /surveillance/programs/           Create program
GET    /surveillance/programs/           List programs
PATCH  /surveillance/programs/{id}/      Update program
POST   /surveillance/enroll/             Enroll worker
POST   /surveillance/check-thresholds/   Check exam vs thresholds
GET    /surveillance/compliance/         Get compliance metrics
```

### Feature 2: Threshold Monitoring ✅
- [x] Auto-check logic designed
- [x] Violation tracking specified
- [x] Alert severity levels defined
- [x] Resolution workflow planned
- [ ] **TODO**: Integrate into exam completion flow

**Integration Point** (in Medical Exam Screen):
```typescript
// When exam saved:
1. Get exam results
2. Find worker's programs
3. For each: checkExamThresholds()
4. If violations: createAlert()
```

### Feature 3: Compliance Dashboard ✅
- [x] Component created: `SurveillanceComplianceDashboard.tsx`
- [x] API methods designed
- [x] KPI calculation logic documented
- [x] Per-program breakdown UI implemented
- [ ] **TODO**: Connect to live API data (currently uses mock)

**What It Shows**:
```
Compliance Rate (%)    Workers In Surveillance    Due Soon    Overdue
      92.5%                 485/520                  15          3
      
Program Stats:
  Surveillance Respiratoire:     248/250 (99.2%)
  Surveillance Auditive:         156/160 (97.5%)
  
Open Violations: 3
  • Jean-Pierre K. — FEV1 < threshold
  • Grace M. — Blood Lead > threshold
```

---

## 🔧 Implementation Checklist

### Phase 1: Backend Setup (Week 1)

**Backend Developer**:
- [ ] Create Django model: `SurveillanceProgram`
  - name, sector, frequency, requiredScreenings, actionLevels
- [ ] Create Django model: `SurveillanceEnrollment`
  - worker_id, program_id, enrollmentDate, nextExamDue
- [ ] Create Django model: `ThresholdViolation`
  - workerId, programId, parameter, value, threshold, severity, status
- [ ] Implement 12 API endpoints (use SURVEILLANCE_IMPLEMENTATION_GUIDE.md)
- [ ] Add unit tests for threshold checking logic
- [ ] Deploy to staging

**Frontend Developer**:
- [ ] Wait for backend deployment
- [ ] Test API endpoints with Postman
- [ ] Prepare for integration

### Phase 2: Frontend Integration (Week 2)

**Frontend Developer**:
- [ ] Update `SurveillanceScreen.tsx`:
  - [ ] Replace localStorage with API calls
  - [ ] Hook "Add Program" button to API
  - [ ] Hook "Edit" buttons to API
  - [ ] Show loading states
- [ ] Update `MedicalExamScreen.tsx`:
  - [ ] Call checkExamThresholds() after exam save
  - [ ] Display violation alerts
  - [ ] Add resolution workflow modal
- [ ] Wire `SurveillanceComplianceDashboard.tsx`:
  - [ ] Load compliance data from API
  - [ ] Load violations from API
  - [ ] Load trends from API
- [ ] Test end-to-end flows

### Phase 3: QA & Deployment (Week 3)

**QA**:
- [ ] Manual testing checklist (see IMPLEMENTATION_GUIDE section 8)
- [ ] Edge cases: API failures, large datasets
- [ ] Performance testing: 1000+ workers in surveillance
- [ ] Regression testing: Other OH screens unaffected

**DevOps**:
- [ ] Deploy to production
- [ ] Monitor API response times
- [ ] Set up alerts for violations

---

## 🎯 User Workflows (Quick Version)

### Workflow A: Create Surveillance Program (5 min)

```
1. Go to: Occupational Health → Surveillance
2. Click: + Add Program
3. Fill in:
   Name: "Surveillance Respiratoire"
   Sector: Mining
   Frequency: Biannual (6 months)
   Tests: Spirometry, X-ray
   Thresholds:
     • FEV1: ⚠️ 80% | 🔴 70% | 🚨 60%
4. Click: Create
5. Program available for enrollment
```

### Workflow B: Enroll Worker (2 min)

```
1. Go to: Worker Profile → Health
2. Click: Enroll in Program
3. Select: "Surveillance Respiratoire"
4. Confirm
5. System schedules first exam (in 6 months)
6. Worker notified of exam date
```

### Workflow C: Complete Exam & Auto-Check (3 min)

```
1. Worker completes spirometry → FEV1 = 65%
2. Nurse enters results
3. Click: Submit Exam
   
[System automatically]
4. Saves exam to database
5. Checks against program thresholds
6. Finds: FEV1 65% < ACTION 70% = VIOLATION
7. Creates alert notification
8. OH Physician sees: "⚠️ FEV1 below threshold"

[OH Physician]
9. Reviews worker's exam results
10. Takes action: "Refer to pulmonologist"
11. Marks violation as resolved
```

### Workflow D: Check Compliance Dashboard (2 min)

```
1. Go to: Occupational Health → Compliance Dashboard
2. See: Overall compliance 92.5% ✅
3. See: This month 485/520 workers current on exams
4. See: 15 exams due soon (next 30 days)
5. See: 3 exams overdue (action needed)
6. Tap: "Surveillance Respiratoire" for details
7. See: 248/250 workers completed (99.2%)
```

### Workflow E: Resolve Threshold Violation (3 min)

```
1. See violation in dashboard: "FEV1 < Threshold"
2. Click: Resolve
3. Enter: "Referred to Dr. Kasongo - appointment 2026-03-10"
4. Click: Save
5. Violation marked resolved
6. No longer affects compliance rate
```

---

## 🧪 Testing Scenarios

### Scenario 1: Happy Path ✅
```
1. Create program with thresholds
2. Enroll worker
3. Worker does exam with compliant results
4. No violations
5. Compliance rate = 100%
```

### Scenario 2: Violation Detected ⚠️
```
1. Worker exam: FEV1 = 65%
2. Program threshold: ACTION = 70%
3. System detects violation severity: "ACTION"
4. Alert shown: "Consult pulmonologist"
5. OH Physician marks resolved
6. Violation status: "resolved"
```

### Scenario 3: Critical Violation 🚨
```
1. Worker exam: Blood Lead = 0.25 mg/dL
2. Program threshold: CRITICAL = 0.2 mg/dL
3. System detects violation severity: "CRITICAL"
4. High-priority alert shown
5. Compliance rate temporarily lower until resolved
```

### Scenario 4: Multiple Violations
```
1. Single exam with 3 violations:
   - Parameter 1: Warning level
   - Parameter 2: Action level
   - Parameter 3: Critical level
2. System captures all 3
3. Dashboard shows all 3
4. OH Physician resolves in order of severity
```

---

## 🔍 Verification Checklist

After implementation, verify:

- [ ] Programs persist in database (reload app = data still there)
- [ ] Violations created when results exceed thresholds
- [ ] Violations NOT created for compliant results
- [ ] Compliance rate calculated as: (current workers) / (total enrolled) * 100
- [ ] Dashboard KPIs match manual calculation
- [ ] API errors handled gracefully (offline mode)
- [ ] Trends load historical data correctly
- [ ] Per-program statistics accurate
- [ ] Violation resolution updates compliance rate
- [ ] Performance acceptable (<500ms API calls)

---

## 💾 Database Schema Summary

**Tables Required**:

```sql
-- Surveillance Programs
CREATE TABLE surveillance_programs (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  sector VARCHAR(50),
  frequency VARCHAR(20),  -- monthly, quarterly, biannual, annual
  target_risk_group VARCHAR(50),
  required_screenings JSON,
  action_levels JSON,  -- [{ parameter, warning, action, critical, unit, action_required }, ...]
  is_active BOOLEAN,
  created_by VARCHAR(100),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Enrollments
CREATE TABLE surveillance_enrollments (
  id UUID PRIMARY KEY,
  worker_id UUID FOREIGN KEY,
  program_id UUID FOREIGN KEY,
  enrollment_date TIMESTAMP,
  last_exam_date TIMESTAMP,
  next_exam_due DATE,
  status VARCHAR(20),  -- compliant, due-soon, overdue
  created_at TIMESTAMP
);

-- Violations
CREATE TABLE threshold_violations (
  id UUID PRIMARY KEY,
  worker_id UUID FOREIGN KEY,
  program_id UUID FOREIGN KEY,
  exam_id UUID FOREIGN KEY,
  parameter VARCHAR(100),
  value DECIMAL,
  threshold DECIMAL,
  unit VARCHAR(20),
  severity VARCHAR(20),  -- warning, action, critical
  action_required TEXT,
  status VARCHAR(20),  -- open, resolved
  resolution TEXT,
  created_at TIMESTAMP,
  resolved_at TIMESTAMP
);
```

---

## 📞 Support & Questions

**Documentation**:
- Full specs: [SURVEILLANCE_IMPLEMENTATION_GUIDE.md](../SURVEILLANCE_IMPLEMENTATION_GUIDE.md)
- API reference: See section 6 of implementation guide
- Workflow context: [OCCUPATIONAL_HEALTH_WORKFLOW.md](./OCCUPATIONAL_HEALTH_WORKFLOW.md)

**Common Issues**:
- If programs don't persist → Check backend API is running
- If violations not created → Check `checkExamThresholds()` called after exam save
- If dashboard blank → Check compliance metrics API responses

**Contact**: occupational-health@hk-systems.local

---

**✅ Status**: Phase 1 Specification Complete → Ready for Backend Development  
**Last Updated**: February 24, 2026
