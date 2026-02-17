# 🔗 System Relationships Analysis
## User, Patient, Pharmacy, Hospital, and Occupational Health Integration

**Updated:** February 2026  
**Framework:** Django REST + React Native Expo

---

## Table of Contents
1. [Core Entities](#core-entities)
2. [User Role System](#user-role-system)
3. [Patient Journey Across Systems](#patient-journey-across-systems)
4. [Module-Specific Relationships](#module-specific-relationships)
5. [Data Flow Diagrams](#data-flow-diagrams)
6. [Cross-Cutting Concerns](#cross-cutting-concerns)
7. [API Contract Analysis](#api-contract-analysis)

---

## Core Entities

### 1. User (Central Actor)
**Location:** `apps/accounts/models.py`

```
User
├── ID: UUID
├── Phone: PhoneNumber (primary login identifier)
├── Email: Optional email
├── FirstName, LastName
├── PrimaryRole: UserRole enum
│   ├── Admin roles (system_admin, organization_admin)
│   ├── Hospital roles (doctor, nurse, hospital_admin, lab_tech, radiographer, etc.)
│   ├── Pharmacy roles (pharmacist, pharmacy_tech, pharmacy_admin, cashier, inventory_manager)
│   └── Occupational Health roles (occ_health_physician, safety_officer, case_manager, etc.)
├── Organization: ForeignKey → Organization
├── CustomPermissions: ManyToMany via UserPermission (with related_name='custom_permissions')
├── Department: String field for departmental assignment
├── EmployeeId: Internal employee number
├── ProfessionalLicense: Medical/Pharmacy license number
└── Metadata: JSON extensible field
```

**Key Property:**
- User is the **primary authentication entity** across all modules
- Different roles unlock different API endpoints and permissions
- No direct relationship to Patient (relationship is indirect through encounters/prescriptions)

---

### 2. Patient (Healthcare Subject)
**Location:** `apps/patients/models.py`

```
Patient
├── ID: UUID
├── Demographics
│   ├── FirstName, LastName, MiddleName
│   ├── DateOfBirth
│   ├── Gender: Choice (male, female, other)
│   └── NationalId, PassportNumber
├── Contact Information
│   ├── Phone, Email
│   ├── Address, City, Country
│   └── EmergencyContact (name, phone, relation)
├── Medical Information
│   ├── BloodType: A+, A-, B+, B-, AB+, AB-, O+, O-
│   ├── Allergies: JSON list
│   ├── ChronicConditions: JSON list
│   ├── CurrentMedications: JSON list
│   └── PriorOccupationalExposure: (for occupational health context)
├── Insurance Information
│   ├── InsuranceProvider
│   └── InsuranceNumber
├── System Fields
│   ├── PatientNumber: Auto-generated unique ID (P{YY}{RANDOM})
│   ├── RegistrationDate
│   ├── LastVisit
│   ├── Status: ACTIVE, INACTIVE, DECEASED
│   ├── Notes: Clinical notes
│   └── Metadata: JSON extensible
└── Related Data
    ├── hospital_encounters: Reverse FK from HospitalEncounter
    ├── vital_signs: Reverse FK from VitalSigns
    ├── prescriptions: Reverse FK from Prescription
    └── occupational_diseases: Reverse FK from OccupationalDisease
```

**Key Property:**
- Patient is **NOT a User** - they have no login credentials or role
- Patient is the **subject of all clinical actions** (encounters, prescriptions, examinations)
- Single Patient can have multiple encounters across different doctors/dates

---

### 3. Worker (Occupational Health Subject)
**Location:** `apps/occupational_health/models.py`

```
Worker
├── ID: Auto-increment or UUID
├── Personal Information
│   ├── EmployeeId: Unique identifier (provided by enterprise)
│   ├── FirstName, LastName
│   ├── DateOfBirth
│   └── Gender
├── Employment Information
│   ├── Enterprise: ForeignKey (many workers per enterprise)
│   ├── WorkSite: ForeignKey (optional, null OK)
│   ├── JobCategory: Choice (manager, technician, operator, etc.)
│   ├── JobTitle: Free text
│   ├── HireDate: When they started
│   └── EmploymentStatus: ACTIVE, ON_LEAVE, SUSPENDED, TERMINATED
├── Occupational Health Profile
│   ├── ExposureRisks: JSON list (e.g., ["silica_dust", "noise", "chemicals"])
│   ├── PPERequired: JSON list (e.g., ["respirator", "safety_goggles", "gloves"])
│   ├── PPEProvided: JSON list (items actually given)
│   ├── CurrentFitnessStatus: FIT, FIT_WITH_RESTRICTIONS, TEMPORARILY_UNFIT, PERMANENTLY_UNFIT
│   ├── FitnessRestrictions: Text (e.g., "No heights greater than 5m")
│   └── NextExamDue: Mandatory exam due date based on sector
├── Medical Profile (Mirror of some Patient data)
│   ├── Allergies, ChronicConditions, Medications
│   └── PriorOccupationalExposure
├── Audit Fields
│   ├── CreatedBy: FK to User (occupational health admin/physician)
│   └── Timestamps
└── Related Data
    ├── medical_examinations: FK MedicalExamination
    ├── occupational_diseases: FK OccupationalDisease
    ├── incidents_involved: M2M WorkplaceIncident (as "injured_workers")
    └── ppe_items: FK PPEItem
```

**Key Property:**
- Worker is **NOT a Patient** - different domain (employed person vs. patient seeking care)
- Worker is the **subject of occupational health surveillance**
- Each Worker belongs to exactly ONE Enterprise and optionally ONE WorkSite
- Medical exam frequency depends on **Sector Risk Level** (12 months for high-risk, 24 months for moderate)

---

## User Role System

### Role Hierarchy & Access Patterns

```
SYSTEM ROLES (Cross-module)
├── ADMIN (All permissions)
└── ORGANIZATION_ADMIN (Organization-level oversight)

HOSPITAL MODULE ROLES
├── Hospital Administrator
│   └── Can manage users, view/manage patients, appointments, billing
├── Medical Director
│   └── Can prescribe, manage medical records, quality control
├── Department Head
│   └── Can manage departmental patients and staff
├── Doctor
│   └── Can create encounters, diagnose, prescribe, order tests
├── Nurse
│   └── Can triage, record vital signs, manage admissions
├── Lab Technician
│   └── Can receive lab orders, input results
├── Radiographer
│   └── Can perform imaging, store results
└── Medical Receptionist
    └── Can register patients, manage appointments, billing

PHARMACY MODULE ROLES
├── Pharmacy Administrator
│   └── Can manage staff, inventory, suppliers, approval workflows
├── Pharmacist
│   └── Can dispense, verify prescriptions, manage clinical pharmacy
├── Pharmacy Technician
│   └── Can assist dispensing, manage inventory, stock movements
├── Pharmacy Supervisor
│   └── Can oversee operations, quality control
├── Cashier
│   └── Can process POS sales, payments
└── Inventory Manager
    └── Can manage stock, suppliers, ordering, analytics

OCCUPATIONAL HEALTH MODULE ROLES
├── Occupational Health Administrator
│   └── Can manage enterprises, workers, compliance, reporting
├── Occupational Health Physician
│   └── Can conduct medical exams, issue fitness certificates
├── Safety Officer
│   └── Can manage risk assessments, incidents
├── Occupational Health Nurse
│   └── Can conduct health screenings
└── Case Manager
    └── Can manage worker compensation, return-to-work
```

### Permission Mapping

| User Role | Hospital Access | Pharmacy Access | Occupational Health Access |
|-----------|-----------------|-----------------|----------------------------|
| Doctor | ✅ Full (own patients) | ✅ Create prescriptions | ❌ No |
| Pharmacist | ❌ No | ✅ Full | ❌ No |
| Nurse | ✅ Record vitals | ❌ No | ❌ No |
| Occ Health Physician | ❌ No | ❌ Limited | ✅ Full|
| Admin | ✅ Full | ✅ Full | ✅ Full |

---

## Patient Journey Across Systems

### Scenario: Acute Illness Requiring Pharmacy Coverage

```
START: Patient arrives at Hospital
│
├─ Step 1: RECEPTION (Receptionist)
│  │ Action: Search/register Patient
│  │ System: Patient record created/verified
│  │ API: POST /api/v1/patients/ | GET /api/v1/patients/{id}
│  │ User Role: Receptionist
│  └─→ Patient.patientNumber generated (e.g., P260124)
│
├─ Step 2: TRIAGE (Nurse)
│  │ Action: Record vital signs, assign urgency
│  │ System: 
│  │   ├─ HospitalEncounter created
│  │   ├─ VitalSigns recorded (linked to Encounter)
│  │   └─ Patient.lastVisit updated
│  │ API: 
│  │   ├─ POST /api/v1/hospital/encounters/ (+ created_by=Request.user)
│  │   └─ POST /api/v1/hospital/vital-signs/ (+ measured_by/verified_by=Nurse)
│  │ User Role: Nurse
│  │ Related Data: 
│  │   ├─ Patient.allergies → Alerting
│  │   └─ Patient.chronicConditions → Risk assessment
│  └─→ Encounter.status = CHECKED_IN
│
├─ Step 3: DOCTOR CONSULTATION (Doctor)
│  │ Action: Assessment, diagnosis, treatment decisions
│  │ System: 
│  │   ├─ Encounter.chiefComplaint updated
│  │   ├─ Encounter.attendingPhysician = Doctor
│  │   └─ VitalSigns may be updated
│  │ API: PUT /api/v1/hospital/encounters/{id}/
│  │ User Role: Doctor
│  │ Possible Actions:
│  │   ├─ Send for Lab Tests → POST /api/v1/hospital/lab-orders/
│  │   ├─ Send for Imaging → POST /api/v1/hospital/imaging-orders/
│  │   ├─ Prescribe Medication → (Next step)
│  │   └─ Admit to Ward → Encounter.encounterType = INPATIENT
│  └─→ Encounter.status = IN_PROGRESS
│
├─ Step 4: PRESCRIPTION CREATION (Doctor)
│  │ Action: Doctor writes prescription for medications
│  │ System:
│  │   ├─ Prescription created
│  │   ├─ Prescription.encounter = HospitalEncounter (FK relationship)
│  │   ├─ Prescription.patient = Patient (FK)
│  │   ├─ Prescription.doctor = Doctor (FK) 
│  │   ├─ Prescription.organization = Hospital (FK)
│  │   └─ Prescription.status = PENDING
│  │ API: POST /api/v1/prescriptions/
│  │ Payload:
│  │   {
│  │     "patient": "uuid",
│  │     "doctor": "uuid",
│  │     "organization": "uuid",
│  │     "encounter": "uuid",  ← KEY: Links to hospital encounter
│  │     "date": "2026-02-17",
│  │     "items": [
│  │       {
│  │         "product": "uuid",
│  │         "quantity": 10,
│  │         "frequency": "BD",  (twice daily)
│  │         "duration": "7"     (days)
│  │       }
│  │     ]
│  │   }
│  │ User Role: Doctor
│  └─→ Prescription.status = PENDING, awaiting pharmacy approval
│
├─ Step 5: PHARMACY REVIEW & DISPENSING (Pharmacist)
│  │ Action: Review prescription, verify patient allergies/interactions
│  │ System:
│  │   ├─ Pharmacist fetches Prescription
│  │   ├─ System auto-checks Patient.allergies vs. Product.ingredients
│  │   ├─ System checks inventory availability
│  │   ├─ Pharmacist approves/modifies
│  │   └─ Prescription.status = PARTIALLY_DISPENSED or FULLY_DISPENSED
│  │ API: 
│  │   ├─ GET /api/v1/prescriptions/{id}/  (Containing Patient allergies)
│  │   └─ PUT /api/v1/prescriptions/{id}/items/{itemId}/ (update status)
│  │ Key Checks:
│  │   ├─ Check: Patient.allergies intersection Product category
│  │   ├─ Check: DosageForm appropriate for Route of Administration
│  │   └─ Check: Interactions with Patient.currentMedications
│  │ User Role: Pharmacist/Pharmacy Tech
│  │ Related Data:
│  │   ├─ InventoryItem.stock → Availability
│  │   ├─ InventoryBatch.expiryDate → Expiration check
│  │   └─ Product.contraindications → Patient history
│  └─→ Prescription moved to fulfilled/dispensed
│
├─ Step 6: PATIENT RECEIVES MEDICATION
│  │ Action: Patient takes medication (home or continued in ward)
│  │ System: Compliance tracking (if required)
│  │ User Role: None (patient action)
│  └─→ Encounter continues (if inpatient) or concludes (if outpatient)
│
└─ Step 7: DISCHARGE (Doctor/Nurse)
   Action: Patient leaves hospital
   System: 
     ├─ Encounter.status = COMPLETED
     ├─ Encounter.dischargeDate set
     ├─ Patient.lastVisit = TODAY
     └─ Final billing generated
   API: PUT /api/v1/hospital/encounters/{id}/ (status→COMPLETED)
   User Role: Doctor/Nurse
   Related Systems:
     └─ Pharmacy: Prescription.isComplete must = True for discharge
```

---

## Module-Specific Relationships

### Hospital Module

**Core Model Dependencies:**

```
Patient ──── HospitalEncounter
            ├── attending_physician: FK User (Doctor)
            ├── nursing_staff: M2M User (Nurses)
            ├── created_by: FK User (Doctor/Receptionist)
            └── updated_by: FK User
            
HospitalEncounter ──── VitalSigns
                   ├── measured_by: FK User (Nurse)
                   ├── verified_by: FK User (Doctor)
                   └── (properties: BMI, BP_category, has_abnormal_values)
                   
HospitalEncounter ──── Prescription (one-to-many)
                   └── encounter: FK HospitalEncounter
                   
HospitalDepartment ──── HospitalBed
                    └── status: BedStatus (AVAILABLE, OCCUPIED, MAINTENANCE)
```

**Data Access Patterns:**

```
Doctor Workflow:
  1. GET /api/v1/hospital/encounters/ (filter: attending_physician=self)
  2. GET /api/v1/hospital/encounters/{id}/ (retrieve full detail + related vital signs)
  3. PUT /api/v1/hospital/encounters/{id}/ (update diagnosis, prescribe)
  4. POST /api/v1/prescriptions/ (create new prescription, linked to encounter)

Nurse Workflow:
  1. GET /api/v1/hospital/encounters/ (queued/pending patients)
  2. POST /api/v1/hospital/vital-signs/ (record measurements)
  3. GET /api/v1/patients/{id}/ (fetch patient medical history)
```

**Key API Relationships:**

```
GET /api/v1/hospital/encounters/{id}/
Response includes:
{
  "id": "uuid",
  "patient": "uuid",
  "patient_name": "John Doe",  ← Nested read-only
  "patient_number": "P260124",  ← Nested read-only
  "attending_physician": "uuid",
  "attending_physician_name": "Dr. Smith",  ← Nested read-only
  "vital_signs_count": 5,
  "prescriptions_count": 2,
  "vital_signs": [  ← Fully nested in detail view
    { "temperature": 37.5, "measured_by_name": "Nurse Jane", ... }
  ],
  "recent_prescriptions": [  ← Latest 3
    { "prescription_number": "RX260124001", "status": "FULLY_DISPENSED" }
  ]
}
```

---

### Pharmacy Module

**Core Model Dependencies:**

```
Prescription ──── PrescriptionItem
              ├── product: FK Product
              ├── dispensed_by: FK User (Pharmacist)
              └── status: PrescriptionItemStatus

Prescription ──── Patient
              └── (Patient.allergies used for interaction checking)

Product ──── InventoryItem
         ├── current stock level
         ├── min_stock_level (alerts when understock)
         ├── unit_price, cost
         └── supplier relationships

InventoryItem ──── InventoryBatch
               ├── batch_number
               ├── expiry_date (alerts when < 30 days)
               └── quantity_in_batch

Sale/Cart ──── SaleItem/CartItem
          ├── product_name, product_sku (captured at sale time)
          ├── unit_price (captured at sale time)
          └── prescription_item: Optional FK (if from prescription)

Product ──── ProductSupplier
         └── supplier_code, supplier pricing
```

**Data Access Patterns:**

```
Pharmacist Workflow:
  1. GET /api/v1/prescriptions/ (filter: status=PENDING)
  2. GET /api/v1/prescriptions/{id}/ (full detail + patient allergies)
  3. GET /api/v1/inventory/products/ (check stock for each item)
  4. POST /api/v1/prescriptions/{id}/dispense/ (mark items dispensed)
  5. POST /api/v1/sales/ (create receipt if cash sale)

Inventory Manager Workflow:
  1. GET /api/v1/inventory/products/ (all products with current stock)
  2. GET /api/v1/inventory/alerts/ (low stock, expiring items)
  3. POST /api/v1/inventory/movements/ (receive from supplier)
  4. POST /api/v1/inventory/adjustments/ (stock corrections)

POS Cashier Workflow:
  1. POST /api/v1/sales/carts/ (create new cart)
  2. POST /api/v1/sales/carts/{id}/items/ (add products)
  3. GET /api/v1/inventory/products/{id}/ (fetch current price)
  4. POST /api/v1/sales/ (finalize sale)
```

**Cross-Module Integration Point:**

```
Prescription → Product → Inventory → Sales

When Pharmacist Dispenses:
  Prescription.items → Product.id
    ↓
  InventoryItem[product].quantity -= prescribed_quantity
    ↓
  If InventoryItem.quantity < min_stock_level:
    Create InventoryAlert
    Trigger Reorder workflow
    
When Product is sold via POS (non-prescription):
  CartItem → Product.id
    ↓
  InventoryItem[product].quantity -= sale_quantity
    ↓
  Same alert/reorder logic
```

---

### Occupational Health Module

**Core Model Dependencies:**

```
Enterprise ──── Worker (many workers per enterprise)
            ├── sector: Choice (INDUSTRY_SECTORS)
            ├── contract_dates
            └── exam_frequency_months (derived from sector risk level)

Enterprise ──── WorkSite (multiple sites per enterprise)

WorkSite ──── Worker (optional: worker assigned to specific site)

Worker ──── MedicalExamination (one-to-many)
        ├── exam_type: PREPLACEMENT, PERIODIC, TERMINATION, SPECIAL
        ├── examining_doctor: FK User (Occupational Health Physician)
        └── status: COMPLETED or PENDING
        
MedicalExamination ──── VitalSigns (one-to-one)
                    ├── temperature, BP, heart_rate, etc.
                    └── calculated: BMI, BP_category, has_abnormal_vitals

MedicalExamination ──── PhysicalExamination (one-to-one)
                    └── clinical findings

MedicalExamination ──── AudiometryResult (one-to-one, if sector requires)
MedicalExamination ──── SpirometryResult (one-to-one, if sector requires)
MedicalExamination ──── VisionTestResult (one-to-one, if sector requires)
MedicalExamination ──── MentalHealthScreening (one-to-one, if sector requires)
MedicalExamination ──── ErgonomicAssessment (one-to-one, if sector requires)

MedicalExamination ──── FitnessCertificate
                    ├── fitness_decision: FIT, FIT_WITH_RESTRICTIONS, UNFIT
                    ├── restrictions: Text (e.g., "No working at heights")
                    ├── valid_until: Date (based on sector exam frequency)
                    └── issued_by: FK User (Doctor)

Worker ──── OccupationalDisease (many diseases per worker)
        ├── disease_type: FK OccupationalDiseaseType
        ├── causal_determination: CERTAIN, PROBABLE, POSSIBLE, UNRELATED
        ├── diagnosing_physician: FK User
        └── case_status: REPORTED, UNDER_INVESTIGATION, CONFIRMED, RESOLVED

Enterprise ──── WorkplaceIncident (many incidents per enterprise)
            ├── injured_workers: M2M Worker
            ├── witnesses: M2M Worker
            ├── category: ACCIDENT, NEAR_MISS, OCCUPATIONAL_DISEASE
            ├── reported_by: FK User
            └── status: REPORTED, INVESTIGATING, RESOLVED

Worker ──── PPEItem (many items per worker)
        ├── ppe_type: Choice (GLOVES, RESPIRATOR, GOGGLES, etc.)
        ├── condition: NEW, GOOD, WORN, DAMAGED
        ├── issued_date, expiry_date
        ├── assigned_by: FK User
        └── is_expired: Boolean property

Enterprise ──── HazardIdentification (risk assessments)
            ├── work_site: FK WorkSite
            ├── hazard_type: PHYSICAL, CHEMICAL, BIOLOGICAL, ERGONOMIC, PSYCHOSOCIAL
            ├── probability: LOW, MEDIUM, HIGH
            ├── severity: MINOR, SERIOUS, CATASTROPHIC
            ├── risk_level: Calculated (probability × severity)
            ├── assessed_by: FK User
            ├── approved_by: FK User
            └── status: DRAFT, APPROVED, IMPLEMENTED, CLOSED
```

**Data Access Patterns:**

```
Occupational Health Physician Workflow:
  1. GET /api/v1/occupational-health/enterprises/ (list managed enterprises)
  2. GET /api/v1/occupational-health/workers/ (filter by enterprise)
  3. GET /api/v1/occupational-health/workers/{id}/risk-profile/ 
     (Returns: exposure risks, PPE compliance, next exam due, overdue status)
  4. POST /api/v1/occupational-health/examinations/
     (Create new medical exam for worker)
  5. POST /api/v1/occupational-health/examinations/{id}/complete-examination/
     (Mark complete, auto-generate fitness certificate)

Safety Officer Workflow:
  1. GET /api/v1/occupational-health/workplace-incidents/
  2. POST /api/v1/occupational-health/workplace-incidents/
     (Report new incident with injured workers)
  3. GET /api/v1/occupational-health/hazard-identification/
     (Risk assessments)
  4. POST /api/v1/occupational-health/hazard-identification/
     (Create new risk assessment)

Worker Management:
  1. Get worker's exam schedule:
     GET /api/v1/occupational-health/workers/{id}/
     Shows: next_exam_due, overdue status, current fitness status
  2. Get worker's incident history:
     GET /api/v1/occupational-health/workers/{id}/incidents/
  3. Get worker's medical history:
     GET /api/v1/occupational-health/workers/{id}/medical-history/
```

**Sector-Based Risk Profiling:**

```
When creating/updating Worker:
  1. Worker.enterprise.sector → INDUSTRY_SECTORS lookup
  2. Sector → SECTOR_RISK_LEVELS → Exam frequency
     (mining: 12 months, banking: 24-36 months)
  3. Sector → Mandatory test types:
     mining → [audiometry, spirometry, chest_xray, blood_metals]
     banking → [vision_test, ergonomic_assessment]
     construction → [audiometry, spirometry, vision]
  4. Sector → Required PPE types
  5. Sector → Exposure risk categories

Example: Worker in Mining
  ├── Exam frequency: 12 months (very high risk)
  ├── Mandatory tests:
  │   ├── VitalSigns (always)
  │   ├── PhysicalExamination (always)
  │   ├── AudiometryResult (hearing damage from noise)
  │   ├── SpirometryResult (silica/dust exposure)
  │   ├── ChestXray (pneumoconiosis screening)
  │   └── BloodMetals (lead, mercury, cadmium testing)
  ├── Exposure risks:
  │   ├── Silica dust (chronic)
  │   ├── Noise (chronic)
  │   ├── Heavy metals (chronic)
  │   └── Collapse/trauma (acute)
  └── Required PPE:
      ├── Respirator (dust/gas)
      ├── Safety goggles
      ├── Safety boots
      ├── Hard hat
      └── Hearing protection
```

---

## Data Flow Diagrams

### Cross-Module Patient Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PATIENT LIFECYCLE                              │
└─────────────────────────────────────────────────────────────────────┘

         ┌─ Creation (Receptionist)
         │
         ├─ Registration in PATIENT table
         │
         ├─ Can exist without any encounters/prescriptions
         │
    ┌────┴────┬────────────────────┬──────────────────────┐
    │          │                    │                      │
    │ HOSPITAL │   PHARMACY         │  NOT IN OCC HEALTH   │
    │          │                    │                      │
    ▼          ▼                    ▼                      ▼
[Encounter] [Prescription]     [Depends on               [Worker is
 ├─ Doctor  ├─ Item               context]                 separate entity]
 ├─ Vitals  ├─ Item
 ├─ Admit   └─ Status        Pharmacy doesn't           Occupational Health
 │                           need patient               doesn't need Patient
 │          [Dispensing]      being in OccHealth         being enrolled in
 │          ├─ Pharmacist                                Hospital
 │          ├─ Product stock
 │          └─ Receipt


┌──────────────────────────────────────────────────────────────────┐
│              PRESCRIPTION-CENTRIC LINKING                        │
└──────────────────────────────────────────────────────────────────┘

  Doctor          Hospital Encounter       Patient
   (User)              |                   (Subject)
    │                  │                      │
    └──── writes ──────→ Prescription ←────────┘
                            │
                            ├── Links to HospitalEncounter (encounter FK)
                            ├── Links to Patient (patient FK)
                            ├── Links to Doctor (doctor FK)
                            └── Items reference Products
                                    │
                                    ▼
                             [Pharmacy Module]
                             ├─ Product availability
                             ├─ Inventory deduction
                             ├─ Interaction checking
                             │  (vs Patient.allergies)
                             └─ Dispensing


┌──────────────────────────────────────────────────────────────────┐
│         OCCUPATIONAL HEALTH SEPARATE FROM PATIENT                │
└──────────────────────────────────────────────────────────────────┘

  Employee in Enterprise
        │
        ├─→ [Worker record created]
        │   (NOT a Patient)
        │
        ├─→ [Medical Examination]
        │   Conducted by Occ Health Physician
        │   (Different from Hospital Doctor)
        │
        ├─→ [FitnessCertificate]
        │   Determines if fit for job role
        │
        └─→ [Incident/Disease tracking]
            For workplace injuries/illnesses

  FACT: A Worker may also be a Patient (same person in both systems)
        BUT they have separate records and workflows
```

---

## Cross-Cutting Concerns

### 1. **User Authentication & Authorization**

```
Login Flow:
  1. Frontend: POST /api/v1/auth/login/
     Payload: { "phone": "+243..." , "password": "..." }
  
  2. Backend: User.objects.get(phone=phone)
     Verify password, return token
  
  3. Subsequent requests: Authorization: Bearer {token}
     → Middleware extracts User object
     → request.user = User instance
  
  4. Role-based access:
     if request.user.primary_role == UserRole.DOCTOR:
         Can create prescriptions
     elif request.user.primary_role == UserRole.PHARMACIST:
         Can dispense prescriptions
     elif request.user.primary_role == UserRole.OCC_HEALTH_PHYSICIAN:
         Can examine workers

Permission Model:
  ├── Role-based (primary_role field)
  ├── Fine-grained (custom_permissions via UserPermission)
  └── Organization-scoped (user.organization filter)
```

### 2. **Audit Trail & Logging**

```
Every entity has:
  ├── created_by: FK User (who created it)
  ├── updated_by: FK User (who last modified it)
  ├── created_at: Timestamp
  └── updated_at: Timestamp

Examples:
  Encounter.created_by = Doctor who registered patient
  Prescription.created_by = Doctor who prescribed
  Dispensing.dispensed_by = Pharmacist who gave medication
  MedicalExamination.examining_doctor = Occ Health Physician
  WorkplaceIncident.reported_by = Safety Officer

Audit Decorator Usage:
  @audit_critical_action(description="Création de consultation hospitalière")
  def perform_create(self, serializer):
      serializer.save(created_by=self.request.user)
```

### 3. **Organization Scoping**

```
Multi-tenant concept:
  Each User belongs_to ONE Organization
  
  GET /api/v1/hospital/encounters/
  → Auto-filtered: encounter.organization == request.user.organization
  
  Organization types:
  ├── HOSPITAL
  ├── PHARMACY
  ├── CLINIC
  ├── OCCUPATIONAL_HEALTH_SERVICE
  └── INTEGRATED (Has multiple services)

  Scenario: User from Hospital A cannot see:
  ├─ Patients from Hospital B
  ├─ Prescriptions from Hospital B
  └─ Inventory from Hospital B pharmacy
```

### 4. **Data Validation & Constraints**

```
Patient Registration:
  ├── phone: Unique per patient (but users also have unique phone)
  ├── email: Unique
  ├── patient_number: Auto-generated, unique
  ├── date_of_birth: Must be < today
  └── status: Can only be ACTIVE, INACTIVE, or DECEASED

Prescription Creation:
  ├── patient: Must exist
  ├── doctor: User.primary_role must be in [DOCTOR, SPECIALIST_DOCTOR]
  ├── date: Cannot be in future
  ├── valid_until: Must be > date
  ├── items: At least 1 item required
  └── total_items: Sum of quantity_prescribed must > 0

Worker Creation (Occupational Health):
  ├── employee_id: Unique per enterprise
  ├── enterprise: Must exist
  ├── hire_date: Cannot be in future
  ├── job_category: Must be valid choice
  ├── exposure_risks: Must match enterprise sector risk profile
  └── next_exam_due: Auto-calculated based on sector frequency
```

### 5. **Notifications & Alerts**

```
Automated Alerting:
  
  Pharmacy Alerts:
  ├─ Low Stock Alert
  │  When: InventoryItem.quantity < min_stock_level
  │  To: Inventory Manager, Pharmacy Admin
  │
  ├─ Expiring Soon Alert
  │  When: InventoryBatch.expiryDate < TODAY + 30days
  │  To: Pharmacy Supervisor
  │
  └─ Drug Interaction Alert
     When: Prescription.items include products that interact
     To: Pharmacist, Prescribing Doctor
  
  Hospital Alerts:
  ├─ Abnormal Vitals
  │  When: VitalSigns shows critical values (e.g., BP > 180/110)
  │  To: Attending Physician, Nurse
  │
  └─ Lab Results Available
     When: LabResult status changes to COMPLETED
     To: Attending Physician
  
  Occupational Health Alerts:
  ├─ Overdue Exam
  │  When: TODAY > Worker.next_exam_due
  │  To: Occ Health Admin
  │
  ├─ Abnormal Exam Finding
  │  When: MedicalExamination.has_abnormal_findings = True
  │  To: Occ Health Physician, Enterprise HR
  │
  └─ Dangerous PPE Item
     When: PPEItem.condition = DAMAGED and still in use
     To: Safety Officer
```

---

## API Contract Analysis

### Hospital ↔ Pharmacy Integration

**Request Flow:**

```
1. Doctor creates prescription:
   POST /api/v1/prescriptions/
   {
     "patient": "{patient_uuid}",
     "doctor": "{doctor_uuid}",
     "encounter": "{encounter_uuid}",
     "organization": "{org_uuid}",
     "date": "2026-02-17",
     "items": [
       {
         "product": "{product_uuid}",
         "quantity_prescribed": 10,
         "frequency": "BD",
         "duration": 7,
         "instructions": "Take with food"
       }
     ]
   }
   
   Response: 201 Created
   {
     "id": "{prescription_uuid}",
     "prescription_number": "RX260124001",
     "status": "PENDING",
     "patient": "{patient_uuid}",
     "patient_name": "John Doe",  ← Nested read-only
     "doctor": "{doctor_uuid}",
     "doctor_name": "Dr. Smith",  ← Nested read-only
     "encounter": "{encounter_uuid}",  ← Linked to hospital
     "organization": "{org_uuid}",
     "created_by": "{doctor_uuid}",
     "created_at": "2026-02-17T10:30:00Z"
   }

2. Frontend polls:
   GET /api/v1/prescriptions/?status=PENDING&organization={org_uuid}
   
   Pharmacist app fetches pending prescriptions

3. Pharmacist verifies allergies:
   GET /api/v1/patients/{patient_uuid}/
   Response includes:
   {
     "allergies": ["Penicillin", "Shellfish"],
     "chronic_conditions": ["Hypertension", "Diabetes"],
     "current_medications": ["Lisinopril", "Metformin"]
   }
   
   System checks: If any prescription item contains contraindication
   → Display warning to pharmacist

4. Pharmacist dispenses:
   PUT /api/v1/prescriptions/{id}/items/{item_id}/
   {
     "quantity_dispensed": 10,
     "dispensed_by": "{pharmacist_uuid}",
     "dispensed_at": "2026-02-17T11:00:00Z"
   }
   
   Inventory auto-deducts:
   InventoryItem[product].quantity -= 10

5. Encounter reflects dispensing:
   GET /api/v1/hospital/encounters/{encounter_uuid}/
   Response includes:
   {
     "prescriptions_count": 1,
     "recent_prescriptions": [
       {
         "prescription_number": "RX260124001",
         "status": "FULLY_DISPENSED"
       }
     ]
   }
```

### Hospital Encounter Relationship with Vital Signs & Prescriptions

**Schema:**

```
GET /api/v1/hospital/encounters/{id}/  (Detail view)

Response:
{
  "id": "encounter_uuid",
  "encounter_number": "E20260124001",
  "patient": "patient_uuid",
  "patient_name": "John Doe",               ← Linked patient
  "patient_number": "P260124",
  "patient_details": {
    "age": 45,
    "gender": "Male",
    "blood_type": "O+",
    "allergies": ["Penicillin"],
    "chronic_conditions": ["Hypertension"]
  },
  "organization": "org_uuid",
  "organization_name": "Central Hospital",
  "encounter_type": "outpatient",
  "status": "in_progress",
  "chief_complaint": "Chest pain",
  "attending_physician": "doctor_uuid",
  "attending_physician_name": "Dr. Smith",
  "nursing_staff": [
    {
      "id": "nurse_uuid",
      "full_name": "Nurse Jane",
      "user_type": "Registered Nurse"
    }
  ],
  "department": "Cardiology",
  "admission_date": "2026-02-17T09:00:00Z",
  
  "vital_signs_count": 3,
  "prescriptions_count": 1,
  
  "latest_vital_signs": {
    "id": "vitals_uuid",
    "temperature": 37.5,
    "blood_pressure_reading": "120/80",
    "heart_rate": 72,
    "respiratory_rate": 16,
    "oxygen_saturation": 98,
    "measured_at": "2026-02-17T10:30:00Z",
    "is_abnormal": false
  },
  
  "recent_prescriptions": [
    {
      "id": "prescription_uuid",
      "prescription_number": "RX260124001",
      "status": "FULLY_DISPENSED",
      "total_items": 2,
      "items_dispensed": 2,
      "created_at": "2026-02-17T10:30:00Z"
    }
  ],
  
  "created_by": "receptionist_uuid",
  "created_by_name": "Receptionist Maria",
  "created_at": "2026-02-17T09:00:00Z",
  "updated_at": "2026-02-17T11:00:00Z"
}
```

### Worker Risk Profile (Occupational Health)

**Schema:**

```
GET /api/v1/occupational-health/workers/{id}/risk-profile/

Response:
{
  "worker_id": "worker_uuid",
  "full_name": "Jean Mwangi",
  "sector": "construction",
  "sector_display": "🏗️ Construction (BTP)",
  "sector_risk_level": "very_high",
  "job_category": "equipment_operator",
  "job_title": "Bulldozer Operator",
  "hire_date": "2024-01-15",
  
  "exposure_risks": [
    "heavy_equipment_hazards",
    "dust_particles",
    "noise_exposure",
    "heat_stress",
    "fall_from_height"
  ],
  
  "ppe_required": [
    "hard_hat",
    "safety_vest",
    "safety_boots",
    "hearing_protection",
    "respirator",
    "safety_glasses"
  ],
  
  "ppe_compliance": false,  ← Missing some items
  
  "current_fitness_status": "fit",
  "fitness_restrictions": null,
  "last_exam_date": "2025-08-15",
  "next_exam_due": "2026-02-15",
  "overdue_exam": true,  ← CRITICAL
  
  "overall_risk_score": 18,  (out of 25)
  "risk_level": "high",
  
  "immediate_actions": [
    "Schedule overdue medical examination urgently",
    "Verify all required PPE is available and in good condition",
    "Update PPE compliance check",
    "Review incident history for this worker"
  ],
  
  "preventive_measures": [
    "Monthly safety training on equipment operation",
    "Quarterly fitness assessments",
    "Regular PPE inspection and replacement",
    "Hazard awareness briefings",
    "Mental health screening (construction is high-stress)"
  ]
}
```

---

## Summary Matrix

| Feature | User | Patient | Worker |
|---------|------|---------|--------|
| **Login credentials** | ✅ Yes (Phone) | ❌ No | ❌ No |
| **Role-based access** | ✅ Yes | ❌ No | ❌ No |
| **Can be Doctor** | ✅ Yes | ❌ No | ❌ No |
| **Can have encounters** | ❌ No | ✅ Yes | ❌ No |
| **Can have prescriptions** | ❌ No | ✅ Yes | ❌ No |
| **Can be examined (Hospital)** | ❌ No | ✅ Yes | ❌ No |
| **Can be examined (Occ Health)** | ❌ No | ❌ No | ✅ Yes |
| **Part of enterprise** | ❌ No (Org) | ❌ No | ✅ Yes |
| **Has fitness certificate** | ❌ No | ❌ No | ✅ Yes |
| **Subject to occupational hazards** | ❌ No | ❌ No (Patient context) | ✅ Yes |

---

## Conclusion

The system uses a **multi-domain architecture** where:

1. **User** is the actor (staff member with login)
2. **Patient** is health subject (receives hospital care)
3. **Worker** is workplace subject (receives occupational health surveillance)
4. **Pharmacy** bridges Hospital→Prescription→Medication
5. **Occupational Health** operates independently from Hospital/Pharmacy

The **prescription** entity is the integration point between Hospital and Pharmacy, linking:
- Doctor (User creating prescription)
- Patient (subject receiving medication)
- Encounter (hospital context)
- Products (inventory/pharmacy)

This design allows flexibility: same person can be User (staff), Patient (receiving care), and even Worker (if in occupational health program) in separate records.
