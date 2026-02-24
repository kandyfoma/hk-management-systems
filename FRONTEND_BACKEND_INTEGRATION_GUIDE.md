# 🔗 Frontend-Backend Integration Guide

**Quick START**: Wire the dashboard to API calls

---

## 🎯 Immediate Tasks

### 1. Verify Backend is Running
```bash
# Terminal 1: Start the Django backend
cd backend
python manage.py runserver
# Expected: "Starting development server at http://127.0.0.1:8000/"
```

### 2. Create Test Data (Admin Panel)
```bash
# Go to: http://localhost:8000/admin/
# Login with your superuser credentials
# Navigate to: Occupational Health > Surveillance Programs
# Create a test program

# Or use API:
curl -X POST http://localhost:8000/api/surveillance/programs/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Respiratory Surveillance",
    "code": "SURV_RESP_2024",
    "sector": "mining",
    "target_risk_group": "respiratory_exposed",
    "screening_interval_months": 12,
    "enterprise": 1,
    "required_screenings": ["spirometry", "chest_xray"],
    "action_levels": {
      "fev1": {
        "warning": 80,
        "action": 70,
        "critical": 60
      }
    }
  }'
```

### 3. Start Frontend Development Server
```bash
# Terminal 2: Start React frontend
cd frontend
npm start
# Expected: "Compiled successfully" message
```

### 4. Test API Connection
Open browser console (F12) and run:
```javascript
// Test API connectivity
fetch('http://localhost:8000/api/surveillance/programs/')
  .then(r => r.json())
  .then(data => console.log('✅ API Connected:', data))
  .catch(e => console.error('❌ API Connection Failed:', e))
```

---

## 📝 Next Phase: Update Frontend Component

### Location
`frontend/src/modules/occupational-health/screens/SurveillanceComplianceDashboard.tsx`

### Current State
- Component skeleton exists ✅
- API service methods exist ✅
- Service is initialized ✅

### What's Needed
Update the component to:

1. **Load programs data on mount** (use `useEffect`)
   ```typescript
   useEffect(() => {
     const loadPrograms = async () => {
       const programs = await OccHealthApiService.getSurveillancePrograms();
       setPrograms(programs);
     };
     loadPrograms();
   }, []);
   ```

2. **Display dashboard metrics** (use `useEffect` with enterprise_id)
   ```typescript
   useEffect(() => {
     if (enterpriseId) {
       const loadDashboard = async () => {
         const metrics = await OccHealthApiService.getDashboardMetrics(enterpriseId);
         setMetrics(metrics);
       };
       loadDashboard();
     }
   }, [enterpriseId]);
   ```

3. **Handle API errors gracefully** (try/catch with user feedback)

---

## 🧪 Complete Test Workflow

### Step 1: Create Program
```bash
curl -X POST http://localhost:8000/api/surveillance/programs/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Hearing Conservation Program",
    "code": "SURV_HEAR_2024",
    "sector": "manufacturing",
    "target_risk_group": "noise_exposed",
    "screening_interval_months": 24,
    "enterprise": 1,
    "required_screenings": ["audiometry"],
    "action_levels": {"hearing_threshold": {"warning": 20, "action": 25, "critical": 30}}
  }'
```

**Expected Response** (201 Created):
```json
{
  "id": 1,
  "name": "Hearing Conservation Program",
  "code": "SURV_HEAR_2024",
  "status": "active",
  "is_active": true,
  "enrolled_workers_count": 0,
  "overdue_screenings_count": 0
}
```

### Step 2: Enroll Worker
```bash
curl -X POST http://localhost:8000/api/surveillance/enrollments/enroll-worker/ \
  -H "Content-Type: application/json" \
  -d '{
    "worker_id": 1,
    "program_id": 1,
    "reason_for_enrollment": "New hire in noise exposure area"
  }'
```

**Expected Response** (201 Created):
```json
{
  "id": 1,
  "program": 1,
  "worker": 1,
  "enrollment_date": "2024-02-24",
  "next_screening_due": "2024-02-24",
  "compliance_status": "pending",
  "compliance_rate": 0
}
```

### Step 3: Complete Screening
```bash
curl -X POST http://localhost:8000/api/surveillance/enrollments/1/mark-screening-completed/ \
  -H "Content-Type: application/json" \
  -d '{
    "exam_id": 123
  }'
```

### Step 4: Check Thresholds
```bash
curl -X POST http://localhost:8000/api/surveillance/check-thresholds/ \
  -H "Content-Type: application/json" \
  -d '{
    "exam_id": 123,
    "program_id": 1
  }'
```

### Step 5: View Dashboard
```bash
curl http://localhost:8000/api/surveillance/compliance-dashboard/?enterprise_id=1
```

---

## 🔍 Debugging Tips

### Check API is Working
```bash
# Test basic connectivity
curl -I http://localhost:8000/api/surveillance/programs/

# Expected: HTTP/1.1 200 OK (or 401 Unauthorized if auth required)
```

### Check Database
```bash
# In Django shell
python manage.py shell
>>> from apps.occupational_health.models_surveillance import SurveillanceProgram
>>> SurveillanceProgram.objects.count()
```

### Check Frontend Network Requests
```javascript
// In browser console
// Open Network tab in DevTools to see all API calls
// Filter by XHR to see only API requests
// Each request should show 200, 201, or 400 status codes
```

### Enable Debug Mode
```bash
# In backend Django settings.py
DEBUG = True  # Add logging to see all requests
```

---

## 📋 API Methods in OccHealthApiService

All these methods are already implemented and ready to use:

```typescript
// Program Management
getSurveillancePrograms(): Promise<SurveillanceProgram[]>
createSurveillanceProgram(data): Promise<SurveillanceProgram>
updateSurveillanceProgram(id, data): Promise<SurveillanceProgram>

// Enrollment Management
getEnrollments(): Promise<SurveillanceEnrollment[]>
enrollWorker(workerId, programId): Promise<SurveillanceEnrollment>
markScreeningCompleted(enrollmentId, examId): Promise<void>

// Violation Management
getViolations(): Promise<ThresholdViolation[]>
acknowledgeViolation(violationId, notes): Promise<void>
resolveViolation(violationId, notes): Promise<void>

// Dashboard & Metrics
getDashboardMetrics(enterpriseId): Promise<DashboardMetrics>
getTrendData(programId, months): Promise<TrendData[]>
generateReport(programId, startDate, endDate): Promise<Report>
```

---

## ✅ End-to-End Test Checklist

Run through this checklist to verify everything works:

- [ ] Backend server running on `http://localhost:8000`
- [ ] Frontend server running on `http://localhost:3000` (or configured port)
- [ ] Create test program via API (curl or Postman)
- [ ] View program in API list endpoint
- [ ] Enroll test worker in program
- [ ] Mark screening as completed
- [ ] Check for violations created
- [ ] View dashboard metrics
- [ ] Frontend calls API without errors
- [ ] No CORS errors in browser console
- [ ] Dashboard displays real data from API

---

## 🚨 Troubleshooting

| Problem | Solution |
|---------|----------|
| **CORS errors** | Add `CORS_ALLOWED_ORIGINS` to Django settings pointing to frontend URL |
| **401 Unauthorized** | Add auth token to request headers: `Authorization: Bearer {token}` |
| **404 Not Found** | Verify URL matches exactly, reload dev server |
| **500 Server Error** | Check Django terminal for traceback, fix error, reload |
| **Data not showing** | Check browser DevTools Network tab to see API response |
| **Frontend can't find API** | Verify `REACT_APP_API_URL` environment variable is set |

---

## 🎓 Learning Path

1. **Frontend Developer**: Focus on wiring API calls in component
2. **Backend Developer**: Extend threshold checking logic in views.py
3. **DevOps**: Deploy to staging/production servers
4. **QA**: Test all workflows end-to-end

---

## 📞 Immediate Questions?

**Q: Where is the API documentation?**  
A: Browse API at `http://localhost:8000/api-docs/` (if DRF browsable API enabled) or [BACKEND_SURVEILLANCE_IMPLEMENTATION.md](./BACKEND_SURVEILLANCE_IMPLEMENTATION.md)

**Q: How do I add authentication?**  
A: API methods should include auth token in headers. See `OccHealthApiService.ts` for interceptor setup.

**Q: Where do I find the component?**  
A: `frontend/src/modules/occupational-health/screens/SurveillanceComplianceDashboard.tsx`

**Q: How do I know if threshold checking works?**  
A: POST to `/api/surveillance/check-thresholds/` with exam_id and check if violations are created.

---

**Status**: ✅ Ready for Frontend Integration  
**Timeline**: All backend complete, frontend wiring next  
**Blockers**: None - ready to proceed
