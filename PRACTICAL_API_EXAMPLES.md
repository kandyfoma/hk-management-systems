# Practical API Examples: Real-World Workflows

**Purpose:** Demonstrate how User, Patient, Pharmacy, Hospital, and Occupational Health systems work together in real scenarios.  
**Format:** cURL commands and response examples  
**Updated:** February 2026

---

## Table of Contents
1. [Setup: License Activation & Login](#setup)
2. [Hospital Workflow: Acute Illness](#hospital-workflow)
3. [Pharmacy Integration: Prescription Dispensing](#pharmacy-integration)
4. [Occupational Health: Periodic Medical Exam](#occupational-health)
5. [Cross-Module Scenarios](#cross-module-scenarios)

---

## Setup: License Activation & Login

### Step 1: License Validation (Frontend)
```javascript
// Frontend checks license validity before allowing login
// LicenseService validates against in-memory database

const licenseKey = "TRIAL-HK2024XY-Z9M3";
const licenseService = LicenseService.getInstance();
const result = await licenseService.validateLicenseKey(licenseKey);

// Response (if valid):
{
  "isValid": true,
  "license": {
    "key": "TRIAL-HK2024XY-Z9M3",
    "organizationId": "org_uuid_123",
    "modules": ["HOSPITAL", "PHARMACY"],
    "features": ["pos_system", "basic_inventory", "prescription_management"],
    "expiresAt": "2026-12-31",
    "status": "ACTIVE"
  },
  "errors": []
}

// Store license key in AsyncStorage
await AsyncStorage.setItem('device_activation_info', JSON.stringify({
  licenseKey: "TRIAL-HK2024XY-Z9M3",
  activatedAt: "2026-02-17T10:00:00Z",
  expiresAt: "2026-12-31T23:59:59Z",
  organizationId: "org_uuid_123"
}));
```

### Step 2: User Login Request
```bash
# Frontend sends login credentials
curl -X POST https://api.backend.com/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+243987654321",
    "password": "SecurePassword123!",
    "licenseKey": "TRIAL-HK2024XY-Z9M3"
  }'

# Response (200 OK):
{
  "success": true,
  "user": {
    "id": "user_uuid_dr_smith",
    "phone": "+243987654321",
    "firstName": "Smith",
    "lastName": "Dr.",
    "email": "smith@central-hospital.cd",
    "primaryRole": "DOCTOR",
    "organization": "org_uuid_123",
    "department": "Cardiology",
    "employeeId": "EMP123",
    "professionalLicense": "DR-CD-2024-001",
    "customPermissions": [
      "PRESCRIBE_MEDICATION",
      "VIEW_PATIENTS",
      "CREATE_ENCOUNTER",
      "ORDER_LABS",
      "ORDER_IMAGING"
    ]
  },
  "organization": {
    "id": "org_uuid_123",
    "name": "Central Hospital",
    "type": "HOSPITAL",
    "address": "123 Health Ave, Kinshasa",
    "country": "Democratic Republic of Congo"
  },
  "userModuleAccess": [
    {
      "module": "HOSPITAL",
      "accessLevel": "FULL",
      "features": ["create_encounter", "view_patients", "manage_patients"]
    },
    {
      "module": "PHARMACY",
      "accessLevel": "LIMITED",
      "features": ["create_prescription"]
    }
  ],
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

# Frontend stores in AsyncStorage + Redux
localStorage.setItem('auth_session', JSON.stringify({
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  user: { ... },
  organization: { ... },
  userModuleAccess: [ ... ]
}));

// Redux dispatch
dispatch(setUser(user));
dispatch(setOrganization(organization));
dispatch(setToken(token));
dispatch(setActiveModules(['HOSPITAL', 'PHARMACY']));
```

---

## Hospital Workflow: Acute Illness

### Scenario: Patient John Doe (45M) arrives with chest pain

#### Step 1: Patient Registration (Receptionist)
```bash
# Frontend: POST patient registration form

curl -X POST https://api.backend.com/api/v1/patients/ \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1980-12-15",
    "gender": "male",
    "phone": "+243912345678",
    "email": "john.doe@email.cd",
    "bloodType": "O+",
    "allergies": ["Penicillin"],
    "chronicConditions": ["Hypertension", "Type 2 Diabetes"],
    "currentMedications": ["Lisinopril 10mg daily", "Metformin 500mg BD"],
    "insuranceProvider": "Insurance Co",
    "insuranceNumber": "INS-2024-001",
    "address": "456 Patient St",
    "city": "Kinshasa",
    "country": "DR Congo",
    "status": "ACTIVE",
    "notes": "Regular follow-up for HTN and DM"
  }'

# Response (201 Created):
{
  "id": "patient_uuid_john_doe",
  "patientNumber": "P260124",  ← Auto-generated
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1980-12-15",
  "age": 45,
  "gender": "male",
  "bloodType": "O+",
  "allergies": ["Penicillin"],
  "chronicConditions": ["Hypertension", "Type 2 Diabetes"],
  "currentMedications": ["Lisinopril 10mg daily", "Metformin 500mg BD"],
  "status": "ACTIVE",
  "registrationDate": "2026-02-17T09:00:00Z"
}
```

#### Step 2: Create Encounter (Doctor/Receptionist)
```bash
# Frontend: Create new hospital encounter

curl -X POST https://api.backend.com/api/v1/hospital/encounters/ \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "patient": "patient_uuid_john_doe",
    "organization": "org_uuid_123",
    "encounterType": "outpatient",
    "status": "registered",
    "priority": "urgent",
    "chiefComplaint": "Chest pain",
    "attendingPhysician": "user_uuid_dr_smith"
  }'

# Response (201 Created):
{
  "id": "encounter_uuid_001",
  "encounterNumber": "E20260124",
  "patient": "patient_uuid_john_doe",
  "patient_name": "John Doe",
  "patient_number": "P260124",
  "organization": "org_uuid_123",
  "encounterType": "outpatient",
  "status": "registered",
  "priority": "urgent",
  "chiefComplaint": "Chest pain",
  "attendingPhysician": "user_uuid_dr_smith",
  "attendingPhysician_name": "Dr. Smith",
  "nursingStaff": [],
  "createdBy": "user_uuid_dr_smith",
  "createdAt": "2026-02-17T09:30:00Z",
  "admissionDate": "2026-02-17T09:30:00Z"
}
```

#### Step 3: Record Vital Signs (Nurse - Triage)
```bash
# Frontend: Triage/Vital Signs Screen records measurements

curl -X POST https://api.backend.com/api/v1/hospital/vital-signs/ \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "encounter": "encounter_uuid_001",
    "patient": "patient_uuid_john_doe",
    "temperature": 37.8,
    "bloodPressureSystolic": 158,
    "bloodPressureDiastolic": 98,
    "heartRate": 88,
    "respiratoryRate": 16,
    "oxygenSaturation": 97,
    "weight": 78,
    "height": 175,
    "painLevel": 7,
    "bloodGlucose": 145,
    "measuredBy": "user_uuid_nurse_jane",
    "measuredAt": "2026-02-17T09:45:00Z"
  }'

# Response (201 Created):
{
  "id": "vitals_uuid_001",
  "encounter": "encounter_uuid_001",
  "patient": "patient_uuid_john_doe",
  "vitals": {
    "temperature": 37.8,
    "bloodPressure": "158/98",
    "heartRate": 88,
    "respiratoryRate": 16,
    "oxygenSaturation": 97,
    "weight": 78,
    "height": 175,
    "bmi": 25.4,
    "painLevel": 7,
    "bloodGlucose": 145
  },
  "abnormalities": {
    "temperature": "normal",
    "bloodPressure": "HIGH - Stage 2 Hypertension",  ← Alert
    "heartRate": "normal",
    "oxygenSaturation": "normal"
  },
  "measuredBy": "user_uuid_nurse_jane",
    "measuredBy_name": "Jane (RN)",
  "measuredAt": "2026-02-17T09:45:00Z"
}

# Frontend Alerts:
// 🔴 Warning: Blood Pressure 158/98 - Stage 2 Hypertension
// Patient already on Lisinopril - may need dose adjustment
```

#### Step 4: Doctor Consultation & Diagnosis
```bash
# Frontend: Doctor consultation notes + decision

curl -X PUT https://api.backend.com/api/v1/hospital/encounters/encounter_uuid_001/ \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "chiefComplaint": "Chest pain x 2 hours",
    "assessment": "Likely atypical angina. HTN uncontrolled. Elevated BP 158/98, increased pain at exertion. DM co-morbidity increases risk.",
    "plan": "ECG, troponin level investigation. Start aspirin, increase Lisinopril. Admit if symptoms persist.",
    "status": "in_consultation",
    "updatedBy": "user_uuid_dr_smith"
  }'

# Response (200 OK):
{
  "id": "encounter_uuid_001",
  "encounterNumber": "E20260124",
  "status": "in_consultation",
  "assessment": "Likely atypical angina...",
  "plan": "ECG, troponin level investigation...",
  "updatedAt": "2026-02-17T10:15:00Z"
}
```

#### Step 5: Order Lab Tests
```bash
# Frontend: Physician orders lab tests

curl -X POST https://api.backend.com/api/v1/hospital/lab-orders/ \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "encounter": "encounter_uuid_001",
    "patient": "patient_uuid_john_doe",
    "testType": "CARDIAC",
    "testsRequested": ["troponin_I", "ECG", "BNP", "complete_blood_count"],
    "urgency": "stat",
    "orderedBy": "user_uuid_dr_smith",
    "notes": "Chest pain, rule out MI"
  }'

# Response (201 Created):
{
  "id": "laborder_uuid_001",
  "status": "PENDING",
  "tests": ["troponin_I", "ECG", "BNP", "complete_blood_count"],
  "resultStatus": "PENDING"
}

# Lab Tech receives order, performs tests, returns results
# (Lab Results would be saved and viewable in encounter)
```

---

## Pharmacy Integration: Prescription Dispensing

### Continuing from chest pain scenario: Doctor prescribes medication

#### Step 1: Doctor Creates Prescription (Hospital Context)
```bash
# Frontend: Hospital Consultation Screen → Prescribe

curl -X POST https://api.backend.com/api/v1/prescriptions/ \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "patient": "patient_uuid_john_doe",
    "doctor": "user_uuid_dr_smith",
    "encounter": "encounter_uuid_001",
    "organization": "org_uuid_123",
    "date": "2026-02-17",
    "items": [
      {
        "product": "product_uuid_aspirin",
        "quantityPrescribed": 10,
        "frequency": "OD",
        "duration": 7,
        "instructions": "Take one tablet with food once daily"
      },
      {
        "product": "product_uuid_lisinopril_20mg",
        "quantityPrescribed": 14,
        "frequency": "OD",
        "duration": 14,
        "instructions": "Increase from 10mg to 20mg daily"
      },
      {
        "product": "product_uuid_atorvastatin",
        "quantityPrescribed": 14,
        "frequency": "OD",
        "duration": 14,
        "instructions": "Start statin therapy 20mg daily at bedtime"
      }
    ]
  }'

# Response (201 Created):
{
  "id": "prescription_uuid_001",
  "prescriptionNumber": "RX20260124001",
  "patient": "patient_uuid_john_doe",
  "patient_name": "John Doe",
  "doctor": "user_uuid_dr_smith",
  "doctor_name": "Dr. Smith",
  "encounter": "encounter_uuid_001",  ← Linked to encounter
  "organization": "org_uuid_123",
  "date": "2026-02-17",
  "status": "PENDING",
  "createdAt": "2026-02-17T10:30:00Z",
  "items": [
    {
      "id": "prescitem_uuid_001",
      "product": "product_uuid_aspirin",
      "product_name": "Aspirin",
      "quantityPrescribed": 10,
      "quantityDispensed": 0,
      "frequency": "OD",
      "status": "PENDING"
    },
    // ... other items
  ]
}

# Frontend notification: Prescription sent to pharmacy
// "✅ Prescription RX20260124001 sent to pharmacy"
```

#### Step 2: Pharmacist Reviews Prescription
```bash
# Frontend: Pharmacy Prescriptions Queue (pharmacist view)

curl -X GET 'https://api.backend.com/api/v1/prescriptions/?status=PENDING&organization=org_uuid_123' \
  -H "Authorization: Bearer {token}"

# Response (200 OK):
{
  "results": [
    {
      "id": "prescription_uuid_001",
      "prescriptionNumber": "RX20260124001",
      "patient_name": "John Doe",
      "patient_number": "P260124",
      "doctor_name": "Dr. Smith",
      "dateCreated": "2026-02-17T10:30:00Z",
      "itemCount": 3,
      "status": "PENDING",
      "priority": "urgent"  ← From encounter.priority
    }
  ]
}

# Pharmacist taps prescription to see full detail
curl -X GET 'https://api.backend.com/api/v1/prescriptions/prescription_uuid_001/' \
  -H "Authorization: Bearer {token}"

# Response (includes full patient medical history for safety checks):
{
  "id": "prescription_uuid_001",
  "prescriptionNumber": "RX20260124001",
  "patient": {
    "id": "patient_uuid_john_doe",
    "name": "John Doe",
    "age": 45,
    "bloodType": "O+",
    "allergies": ["Penicillin"],  ← CRITICAL ALERT
    "chronicConditions": ["Hypertension", "Diabetes"],
    "currentMedications": ["Lisinopril 10mg", "Metformin 500mg"],
    "lastVital": {
      "bloodPressure": "158/98",
      "temperature": 37.8
    }
  },
  "doctor": {
    "name": "Dr. Smith",
    "license": "DR-CD-2024-001"
  },
  "encounter": {
    "type": "outpatient",
    "chiefComplaint": "Chest pain",
    "vitalSigns": {
      "bloodPressure": "158/98",
      "heartRate": 88,
      "oxygenSaturation": 97
    }
  },
  "items": [
    {
      "product": {
        "id": "product_uuid_aspirin",
        "name": "Aspirin",
        "strength": "500mg",
        "form": "tablet",
        "manufacturer": "BioPharms"
      },
      "quantityPrescribed": 10,
      "frequency": "OD",
      "duration": 7,
      "instructions": "Take with food",
      "availablInStock": 50,  ← Stock check
      "contraindications": [],
      "interactions": []
    },
    // ...
  ],
  "createdAt": "2026-02-17T10:30:00Z",
  "status": "PENDING"
}

# Pharmacist Safety Checks:
// ✅ Aspirin: In stock (50 available)
// ✅ Lisinopril 20mg: In stock (80 available) - increase from 10mg OK
// ✅ Atorvastatin: In stock (100 available) - new statin therapy
// ❌ NO ALLERGIES to these products (Patient allergic to Penicillin only)
// ⚠️ Monitor: Lisinopril increase + already stressed heart (chest pain)
//    → Approve but note for follow-up

# Frontend UI displays green flags for approval
```

#### Step 3: Pharmacist Approves & Marks for Dispensing
```bash
# Frontend: Pharmacist clicks "Approve All" items

curl -X PATCH 'https://api.backend.com/api/v1/prescriptions/prescription_uuid_001/' \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "APPROVED",
    "approvedBy": "user_uuid_pharmacist_maria",
    "approvedAt": "2026-02-17T11:00:00Z"
  }'

# Response (200 OK):
{
  "id": "prescription_uuid_001",
  "status": "APPROVED",  ← Now ready for dispensing
  "items": [
    {
      "status": "READY_TO_DISPENSE"
    }
  ]
}

# Pharmacist can now proceed with physical dispensing
```

#### Step 4: Dispense Medication & Deduct Inventory
```bash
# Frontend: Pharmacy Technician/Cashier processes dispensing

curl -X POST 'https://api.backend.com/api/v1/prescriptions/prescription_uuid_001/dispense/' \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "prescriptionItemId": "prescitem_uuid_001",
        "quantityDispensed": 10,
        "dispensedBy": "user_uuid_pharmacist_maria",
        "dispensedAt": "2026-02-17T11:30:00Z",
        "batchNumber": "ASP-2024-001",
        "expiryDate": "2027-12-31"
      },
      {
        "prescriptionItemId": "prescitem_uuid_002",
        "quantityDispensed": 14,
        "dispensedBy": "user_uuid_pharmacist_maria",
        "dispensedAt": "2026-02-17T11:30:00Z",
        "batchNumber": "LIS-2024-050",
        "expiryDate": "2026-08-15"
      },
      {
        "prescriptionItemId": "prescitem_uuid_003",
        "quantityDispensed": 14,
        "dispensedBy": "user_uuid_pharmacist_maria",
        "dispensedAt": "2026-02-17T11:30:00Z",
        "batchNumber": "ATO-2024-023",
        "expiryDate": "2027-06-30"
      }
    ]
  }'

# Response (200 OK):
{
  "id": "prescription_uuid_001",
  "status": "FULLY_DISPENSED",
  "items": [
    {
      "prescriptionItemId": "prescitem_uuid_001",
      "status": "DISPENSED",
      "quantityDispensed": 10,
      "dispensedBy": "user_uuid_pharmacist_maria",
      "dispensedAt": "2026-02-17T11:30:00Z"
    },
    // ...
  ]
}

# Backend AUTOMATICALLY deducts from inventory:
# InventoryItem[aspirin].quantity: 50 → 40
# InventoryItem[lisinopril].quantity: 80 → 66
# InventoryItem[atorvastatin].quantity: 100 → 86

# If any inventory drops below min_stock_level:
# → Create InventoryAlert
# → Notify Pharmacy Admin to reorder
```

#### Step 5: Billing/Payment
```bash
# Frontend: Payment/Billing screen

curl -X POST 'https://api.backend.com/api/v1/sales/' \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "org_uuid_123",
    "patientId": "patient_uuid_john_doe",
    "saleType": "PRESCRIPTION",
    "prescriptionId": "prescription_uuid_001",
    "paymentMethod": "CASH",
    "items": [
      {
        "productId": "product_uuid_aspirin",
        "quantity": 10,
        "unitPrice": 2.50,
        "lineTotal": 25.00
      },
      {
        "productId": "product_uuid_lisinopril_20mg",
        "quantity": 14,
        "unitPrice": 5.00,
        "lineTotal": 70.00
      },
      {
        "productId": "product_uuid_atorvastatin",
        "quantity": 14,
        "unitPrice": 6.50,
        "lineTotal": 91.00
      }
    ],
    "subtotal": 186.00,
    "taxRate": 0.15,
    "totalTax": 27.90,
    "totalAmount": 213.90,
    "createdBy": "user_uuid_cashier_john"
  }'

# Response (201 Created):
{
  "id": "sale_uuid_001",
  "organizationId": "org_uuid_123",
  "patientId": "patient_uuid_john_doe",
  "patient_name": "John Doe",
  "saleType": "PRESCRIPTION",
  "prescriptionId": "prescription_uuid_001",
  "paymentMethod": "CASH",
  "subtotal": 186.00,
  "totalTax": 27.90,
  "totalAmount": 213.90,
  "status": "COMPLETED",
  "createdAt": "2026-02-17T11:45:00Z",
  "receiptNumber": "RCP20260124001"
}

# Frontend prints receipt:
// ═══════════════════════════════
// CENTRAL HOSPITAL PHARMACY
// Receipt #RCP20260124001
// ═══════════════════════════════
// Patient: John Doe (P260124)
// Date: 2026-02-17
//
// Item                  Qty  Price    Total
// Aspirin 500mg         10   2.50     25.00
// Lisinopril 20mg       14   5.00     70.00
// Atorvastatin 20mg     14   6.50     91.00
// ═══════════════════════════════
// Subtotal                         186.00
// Tax (15%)                         27.90
// TOTAL                           213.90
// ═══════════════════════════════
// Payment: CASH
// Change: 0.00
// ═══════════════════════════════
```

---

## Occupational Health: Periodic Medical Exam

### Scenario: Mining company worker needs annual exam

#### Step 1: Check Worker Status & Overdue Exams
```bash
# Frontend: Occ Health Dashboard

curl -X GET 'https://api.backend.com/api/v1/occupational-health/workers/?enterprise=enterprise_uuid_mining' \
  -H "Authorization: Bearer {token}"

# Response (200 OK):
{
  "results": [
    {
      "id": "worker_uuid_jean",
      "employeeId": "EMP-MINING-001",
      "firstName": "Jean",
      "lastName": "Mwangi",
      "enterprise": "enterprise_uuid_mining",
      "jobTitle": "Bulldozer Operator",
      "sector": "mining",
      "sector_risk_level": "very_high",
      "nextExamDue": "2026-02-15",
      "lastExamDate": "2025-02-20",
      "overdue_exam": true,  ← 🔴 OVERDUE
      "currentFitnessStatus": "FIT",
      "fitnessRestrictions": null,
      "overallRiskScore": 18,
      "risk_level": "high"
    }
  ]
}

# Frontend displays warnings for overdue workers
```

#### Step 2: Get Worker Risk Profile & Required Tests
```bash
# Frontend: Occ Health Physician reviews worker details

curl -X GET 'https://api.backend.com/api/v1/occupational-health/workers/worker_uuid_jean/risk-profile/' \
  -H "Authorization: Bearer {token}"

# Response (200 OK):
{
  "worker_id": "worker_uuid_jean",
  "full_name": "Jean Mwangi",
  "sector": "mining",
  "sector_risk_level": "very_high",
  "jobTitle": "Bulldozer Operator",
  "exposure_risks": [
    "heavy_equipment_hazards",
    "dust_particles",
    "noise_exposure",
    "heat_stress",
    "silica_dust",
    "diesel_fumes"
  ],
  "required_ppe": [
    "hard_hat",
    "safety_vest",
    "safety_boots",
    "hearing_protection",
    "respirator",
    "safety_glasses"
  ],
  "ppe_compliance": false,
  "ppe_items_missing": ["hearing_protection"],
  "current_fitness_status": "FIT",
  "exam_frequency_months": 12,
  "next_exam_due": "2026-02-15",
  "overdue_exam": true,
  "days_overdue": 2,
  "immediate_actions": [
    "Schedule overdue medical examination urgently",
    "Verify all required PPE is available",
    "Check incident history since last exam"
  ],
  "mandatoryTests": [
    "VitalSigns",
    "PhysicalExamination",
    "AudiometryResult",     ← Hearing test
    "SpirometryResult",     ← Lung capacity
    "ChestXray",            ← Pneumoconiosis screening
    "BloodMetals",          ← Lead/mercury/cadmium
    "VisionTest"            ← Eye health
  ]
}

# Frontend displays: "⚠️ OVERDUE - Exam due 2026-02-15 (2 days overdue)"
```

#### Step 3: Create Medical Examination
```bash
# Frontend: Physician initiates exam for overdue worker

curl -X POST 'https://api.backend.com/api/v1/occupational-health/medical-examinations/' \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "worker": "worker_uuid_jean",
    "examType": "PERIODIC",
    "examDate": "2026-02-17",
    "examinedBy": "user_uuid_occhealth_physician",
    "findings": "Fit to continue work with restrictions on noise exposure"
  }'

# Response (201 Created):
{
  "id": "medexam_uuid_mining_001",
  "worker": "worker_uuid_jean",
  "worker_name": "Jean Mwangi",
  "examType": "PERIODIC",
  "examDate": "2026-02-17",
  "examinedBy": "user_uuid_occhealth_physician",
  "status": "IN_PROGRESS"
}
```

#### Step 4: Record Vital Signs & Physical Exam
```bash
# Frontend: Record vital signs (similar to hospital triage)

curl -X POST 'https://api.backend.com/api/v1/occupational-health/vital-signs/' \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "medicalExamination": "medexam_uuid_mining_001",
    "temperature": 36.9,
    "bloodPressureSystolic": 142,
    "bloodPressureDiastolic": 88,
    "heartRate": 78,
    "respiratoryRate": 16,
    "oxygenSaturation": 98,
    "weight": 82,
    "height": 178,
    "measuredAt": "2026-02-17T14:00:00Z"
  }'

# Response (201 Created):
{
  "id": "vitals_uuid_occ_001",
  "medicalExamination": "medexam_uuid_mining_001",
  "vitals": {
    "temperature": 36.9,
    "bloodPressure": "142/88",
    "heartRate": 78,
    "respiratoryRate": 16,
    "oxygenSaturation": 98,
    "weight": 82,
    "height": 178,
    "bmi": 25.9
  },
  "abnormalities": {
    "bloodPressure": "ELEVATED"  ← From occupational heat stress?
  }
}
```

#### Step 5: Record Sector-Specific Tests (Mining)
```bash
# Frontend: Audiometry test (hearing damage from noise)

curl -X POST 'https://api.backend.com/api/v1/occupational-health/audiometry-results/' \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "medicalExamination": "medexam_uuid_mining_001",
    "leftEarThreshold": 35,  # dB (normal < 20)
    "rightEarThreshold": 38, # dB (normal < 20)
    "findings": "Mild bilateral high-frequency hearing loss pattern typical of occupational noise exposure. Recommend regular monitoring and hearing protection compliance.",
    "examinedAt": "2026-02-17T14:20:00Z"
  }'

# Response (201 Created):
{
  "id": "audiometry_uuid_001",
  "medicalExamination": "medexam_uuid_mining_001",
  "leftEarThreshold": 35,
  "rightEarThreshold": 38,
  "findings": "Mild bilateral...",
  "status": "COMPLETED"
}

# Frontend: Spirometry test (lung capacity/silica damage)

curl -X POST 'https://api.backend.com/api/v1/occupational-health/spirometry-results/' \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "medicalExamination": "medexam_uuid_mining_001",
    "fev1": 85,  # % predicted
    "fvc": 88,   # % predicted
    "ratio": 97,
    "findings": "Mild restrictive pattern. Monitor for silicosis. Ensure proper respirator use.",
    "examinedAt": "2026-02-17T14:40:00Z"
  }'

# Response (201 Created):
{
  "id": "spirometry_uuid_001",
  "fev1": 85,
  "fvc": 88,
  "findings": "Mild restrictive pattern...",
  "status": "COMPLETED"
}

# Frontend: Blood metals test (lead/mercury/cadmium)

curl -X POST 'https://api.backend.com/api/v1/occupational-health/blood-metals-results/' \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "medicalExamination": "medexam_uuid_mining_001",
    "leadLevel": 25,          # μg/dL (safe threshold varies)
    "mercuryLevel": 3,        # μg/L
    "cadmiumLevel": 1.5,      # μg/L
    "findings": "All levels within acceptable occupational health limits.",
    "examinedAt": "2026-02-17T15:00:00Z"
  }'

# Response (201 Created):
{
  "leadLevel": 25,
  "mercuryLevel": 3,
  "cadmiumLevel": 1.5,
  "findings": "All levels within acceptable...",
  "status": "COMPLETED"
}
```

#### Step 6: Complete Exam & Issue Fitness Certificate
```bash
# Frontend: Physician completes exam and determines fitness

curl -X POST 'https://api.backend.com/api/v1/occupational-health/medical-examinations/medexam_uuid_mining_001/complete-examination/' \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "fitnessDecision": "FIT_WITH_RESTRICTIONS",
    "restrictions": "No work on high noise jobs without proper hearing protection. Must use respirator at all times in dusty areas. Repeat hearing test in 6 months.",
    "validFrom": "2026-02-17",
    "validUntil": "2027-02-17",
    "recommendedActions": [
      "Enforce hearing protection compliance",
      "Improve dust control in workplace",
      "Schedule repeat audiometry in 6 months",
      "Consider job rotation to reduce continuous exposure"
    ],
    "status": "COMPLETED"
  }'

# Response (200 OK - Exam completed, Certificate auto-generated):
{
  "id": "medexam_uuid_mining_001",
  "status": "COMPLETED",
  "fitnessDecision": "FIT_WITH_RESTRICTIONS",
  "certificateIssued": {
    "id": "cert_uuid_mining_001",
    "worker": "worker_uuid_jean",
    "fitnessDecision": "FIT_WITH_RESTRICTIONS",
    "restrictions": "No work on high noise jobs without proper hearing protection...",
    "validFrom": "2026-02-17",
    "validUntil": "2027-02-17",
    "issuedBy": "user_uuid_occhealth_physician",
    "issuedAt": "2026-02-17T15:30:00Z",
    "status": "ACTIVE"
  }
}

# Backend updates Worker record:
# Worker.currentFitnessStatus = FIT_WITH_RESTRICTIONS
# Worker.fitnessRestrictions = "No work on high noise..."
# Worker.nextExamDue = 2027-02-17

# Frontend generates PDF certificate (downloadable)
```

#### Step 7: Create Occupational Disease Record (if findings indicate)
```bash
# Frontend: If exam findings suggest occupational disease

curl -X POST 'https://api.backend.com/api/v1/occupational-health/occupational-diseases/' \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "worker": "worker_uuid_jean",
    "diseaseType": "OCCUPATIONAL_HEARING_LOSS",
    "diagnosis": "Mild bilateral high-frequency hearing loss attributed to prolonged noise exposure in mining operations",
    "causalDetermination": "PROBABLE",
    "diagnosedOn": "2026-02-17",
    "diagnosingPhysician": "user_uuid_occhealth_physician",
    "caseStatus": "REPORTED",
    "notes": "Monitor progression. Ensure hearing protection compliance. Recommend audiometer every 6 months."
  }'

# Response (201 Created):
{
  "id": "ocd_uuid_001",
  "worker": "worker_uuid_jean",
  "diseaseType": "OCCUPATIONAL_HEARING_LOSS",
  "diagnosis": "Mild bilateral...",
  "causalDetermination": "PROBABLE",
  "diagnosingPhysician": "user_uuid_occhealth_physician",
  "caseStatus": "REPORTED",
  "createdAt": "2026-02-17T15:45:00Z"
}

# This record triggers:
// - Notification to enterprise HR
// - Possible workers' compensation claim process
// - Enhanced monitoring requirements
```

---

## Cross-Module Scenarios

### Scenario 1: Patient Discharged from Hospital with Prescriptions

```bash
# Frontend: Hospital Discharge workflow

# 1. Doctor marks encounter as complete
curl -X PUT 'https://api.backend.com/api/v1/hospital/encounters/encounter_uuid_001/' \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "COMPLETED",
    "dischargeDate": "2026-02-18",
    "dischargeSummary": "Patient improved, chest pain resolved. ECG normal. Troponin negative. Diagnosis: Atypical chest pain, likely musculoskeletal. Started on statin therapy for CVD prevention.",
    "dischargeInstructions": "Follow up with cardiology in 2 weeks. Continue medications as prescribed. Avoid heavy exertion for 3 days.",
    "updatedBy": "user_uuid_dr_smith"
  }'

# Response (200 OK):
{
  "id": "encounter_uuid_001",
  "status": "COMPLETED",
  "dischargeDate": "2026-02-18",
  "prescriptions_pending": 0  ← All prescriptions dispensed before discharge
}

# System verifies: All active prescriptions must be fully dispensed before discharge
# If any prescription still PENDING:
#   → Prevent discharge with error message
#   → Doctor must finalize or cancel prescription

# Frontend prints discharge summary for patient
```

### Scenario 2: Same Worker is Also a Patient

```bash
# Edge case: Jean Mwangi (mining worker) also becomes hospital patient

# Occupational Health record:
{
  "id": "worker_uuid_jean",
  "employeeId": "EMP-MINING-001",
  "firstName": "Jean",
  "lastName": "Mwangi",
  "enterprise": "enterprise_uuid_mining",
  "jobTitle": "Bulldozer Operator"
}

# Hospital Patient record (separate):
{
  "id": "patient_uuid_jean_doe",  ← Different from worker_uuid_jean
  "patientNumber": "P260245",
  "firstName": "Jean",
  "lastName": "Mwangi",
  "dateOfBirth": "1985-06-20",
  "occupationalBackground": "Mining (registered occupation)"  ← Optional field
}

# These are TWO SEPARATE records:
# - Worker record: For occupational health surveillance, fitness certificates, incident tracking
# - Patient record: For hospital encounters, prescriptions, clinical care

# However, a query might find:
curl -X GET 'https://api.backend.com/api/v1/patients/?firstName=Jean&lastName=Mwangi' \
  -H "Authorization: Bearer {token}"

# Response (finds patient record only - separate from worker):
{
  "results": [
    {
      "id": "patient_uuid_jean_doe",
      "patientNumber": "P260245",
      "firstName": "Jean",
      "lastName": "Mwangi",
      "occupationalBackground": "Mining"
    }
  ]
}

# If Jean has hospital encounter:
{
  "id": "encounter_uuid_jean_hospital",
  "patient": "patient_uuid_jean_doe",  ← Links to hospital patient
  "chiefComplaint": "Occupational dust inhalation symptoms"
  // ... encounter data
}

# Note: The encounter doesn't automatically know about occupational health worker record
# You would need to:
# 1. Check patient.occupationalBackground field
# 2. OR manually search for worker by name/DOB
# 3. OR have system integration that links patient to worker by ID/email
```

### Scenario 3: Multi-Organizational Access (Enterprise Chain Pharmacy)

```bash
# User role: PHARMACY_ADMIN across multiple hospital branches

# Login response includes organization + access:
{
  "user": {
    "id": "user_uuid_pharmacy_supervisor",
    "primaryRole": "PHARMACY_ADMIN",
    "organization": "org_uuid_pharmacy_chain"
  },
  "organization": {
    "id": "org_uuid_pharmacy_chain",
    "name": "Central Pharmacy Chain",
    "type": "PHARMACY",
    "branches": [3]  // Manages 3 branch pharmacies
  },
  "userModuleAccess": [
    {
      "module": "PHARMACY",
      "accessLevel": "FULL",
      "organization": "org_uuid_pharmacy_chain"
    }
  ]
}

# When fetching prescriptions:
curl -X GET 'https://api.backend.com/api/v1/prescriptions/?organization=org_uuid_pharmacy_chain' \
  -H "Authorization: Bearer {token}"

# Automatically filters all prescriptions for the entire pharmacy chain
# Response includes prescriptions from all 3 branch locations
```

---

## Summary: Request/Response Patterns

| Action | Endpoint | Auth | Filter | Response |
|--------|----------|------|--------|----------|
| Hospital: New Encounter | POST /hospital/encounters/ | Bearer {token} | organization | encounter_uuid |
| Hospital: Record Vitals | POST /hospital/vital-signs/ | Bearer {token} | encounter | vitals_uuid |
| Hospital: View Patient Detail | GET /patients/{id}/ | Bearer {token} | - | Patient + encounters + meds |
| Pharmacy: List Pending Rx | GET /prescriptions/?status=PENDING | Bearer {token} | organization | [Prescription] |
| Pharmacy: Dispense Items | POST /prescriptions/{id}/dispense/ | Bearer {token} | - | Updated inventory |
| Occ Health: List Workers | GET /occupational-health/workers/ | Bearer {token} | enterprise | [Worker] |
| Occ Health: Create Exam | POST /occupational-health/medical-examinations/ | Bearer {token} | - | exam_uuid |
| Occ Health: Issue Certificate | POST /medical-examinations/{id}/complete-examination/ | Bearer {token} | - | certificate_uuid |

---

## Conclusion

The API design mirrors the frontend workflows:

1. **Authentication first:** Every request requires Bearer token with user role
2. **Organization scoping:** All queries filtered by user's organization (multi-tenant)
3. **Linked entities:** Encounters link doctors → patients; Prescriptions link encounters → pharmacy; Workers link enterprises → medical exams
4. **Nested responses:** Detailed GETs include related data (e.g., GET /prescriptions/{id}/ returns full patient allergies)
5. **Audit trail:** Every action records created_by and timestamp for compliance
6. **Separation of concerns:** Hospital (Patient/Encounter), Pharmacy (Inventory/Sales), Occupational Health (Worker/Enterprise) are independent but can integrate
