# 📚 System Architecture & Relationships - Master Index

**Complete Guide to Understanding User, Patient, Pharmacy, Hospital, and Occupational Health Integration**

---

## 📖 Documentation Overview

This guide consists of **3 comprehensive documents** that explain the system from different angles:

### 1. **[SYSTEM_RELATIONSHIPS_ANALYSIS.md](SYSTEM_RELATIONSHIPS_ANALYSIS.md)** 
   - **Purpose:** Understand the database schema and entity relationships
   - **Audience:** Developers, architects, database designers
   - **Length:** ~800 lines
   - **Key Sections:**
     - Core entities: User, Patient, Worker
     - User role system (20+ role types)
     - Module-specific relationships (Hospital, Pharmacy, Occupational Health)
     - Cross-cutting concerns (auth, audit, notifications)
   - **Best for:** Understanding *how data is structured* and *why*

### 2. **[FRONTEND_RELATIONSHIPS_GUIDE.md](frontend/FRONTEND_RELATIONSHIPS_GUIDE.md)**
   - **Purpose:** See how relationships work in the React Native UI
   - **Audience:** Frontend developers, product managers, QA testers
   - **Length:** ~600 lines
   - **Key Sections:**
     - Authentication flow (License → Login → Module Loading)
     - Role-based navigation (dynamic tabs based on user access)
     - Complete workflows (Hospital, Pharmacy, Occupational Health)
     - Redux store structure and TypeScript models
   - **Best for:** Understanding *how users interact* with the data

### 3. **[PRACTICAL_API_EXAMPLES.md](PRACTICAL_API_EXAMPLES.md)**
   - **Purpose:** Real-world scenarios with actual API calls and responses
   - **Audience:** API integrators, backend developers, testers
   - **Length:** ~700 lines
   - **Key Sections:**
     - cURL request/response examples for every major workflow
     - Step-by-step scenarios (patient admission → prescription → pharmacy)
     - Cross-module integration patterns
     - Data validation and business rules
   - **Best for:** Understanding *how to build features* and *what data flows where*

---

## 🎯 Quick Navigation

### Learning Your Role?

**I'm a Backend Developer**
1. Start: [SYSTEM_RELATIONSHIPS_ANALYSIS.md](SYSTEM_RELATIONSHIPS_ANALYSIS.md) → *Core Entities, Module-Specific Relationships*
2. Deep dive: [PRACTICAL_API_EXAMPLES.md](PRACTICAL_API_EXAMPLES.md) → *Every API endpoint with request/response*

**I'm a Frontend Developer**  
1. Start: [FRONTEND_RELATIONSHIPS_GUIDE.md](frontend/FRONTEND_RELATIONSHIPS_GUIDE.md) → *Authentication Flow, Complete Workflows*
2. Reference: [SYSTEM_RELATIONSHIPS_ANALYSIS.md](SYSTEM_RELATIONSHIPS_ANALYSIS.md) → *Core Entities, Data Models*
3. Integration: [PRACTICAL_API_EXAMPLES.md](PRACTICAL_API_EXAMPLES.md) → *API endpoints to call, response formats*

**I'm a Product Manager / Business Analyst**
1. Start: [SYSTEM_RELATIONSHIPS_ANALYSIS.md](SYSTEM_RELATIONSHIPS_ANALYSIS.md) → *User Role System, Patient Journey*
2. Flows: [PRACTICAL_API_EXAMPLES.md](PRACTICAL_API_EXAMPLES.md) → *Real scenarios (acute illness workflow, prescription dispensing)*
3. User experience: [FRONTEND_RELATIONSHIPS_GUIDE.md](frontend/FRONTEND_RELATIONSHIPS_GUIDE.md) → *How users navigate and interact*

**I'm New to the Project (Any Role)**
1. **5-min version:** Read *System Overview* section below ↓
2. **30-min version:** Read *Core Workflows* section below ↓  
3. **Deep dive:** Choose your role above and follow the reading path

---

## 🚀 System Overview (5 Minutes)

### The Big Picture

This healthcare management system has **4 main data domains**:

```
                    ┌─────────────────────────────┐
                    │   USER (Staff Member)       │
                    │  • Doctor, Nurse, Pharmacist│
                    │  • Has login credentials     │
                    │  • Has role + permissions   │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
        ┌──────────▼──────────┐      ┌──────────▼──────────┐
        │  HOSPITAL DOMAIN    │      │  OCCUPATIONAL HEALTH│
        ├─────────────────────┤      ├──────────────────────┤
        │ Patient             │      │ Enterprise           │
        │  ├─ Demographics     │      │  ├─ Sector (mining..)│
        │  ├─ Allergies        │      │  └─ Risk level      │
        │  └─ Medications      │      │                     │
        │                     │      │ Worker               │
        │ Encounter           │      │  ├─ Employee ID      │
        │  ├─ Vital Signs     │      │  ├─ Exposures       │
        │  ├─ Doctor (User FK)│      │  ├─ PPE compliance  │
        │  └─ Prescriptions   │      │  └─ Fitness status  │
        │        ↓            │      │                     │
        │ Prescription        │      │ Medical Examination  │
        │  ├─ Patient FK      │      │  ├─ Vitals          │
        │  ├─ Doctor FK       │      │  ├─ Sector tests    │
        │  ├─ Encounter FK    │      │  │  (audiometry..)  │
        │  └─ Items[] →───┐   │      │  └─ Fitness Cert    │
        └────────────────┼───┘      └──────────┬───────────┘
                         │                     │
                         └─────────┬───────────┘
                                   │
                        ┌──────────▼──────────┐
                        │  PHARMACY DOMAIN    │
                        ├─────────────────────┤
                        │ Inventory           │
                        │  ├─ Product         │
                        │  ├─ Stock levels    │
                        │  └─ Batch tracking  │
                        │                     │
                        │ Prescription Filling│
                        │  ├─ Verify allergies│
                        │  ├─ Check stock     │
                        │  ├─ Dispense       │
                        │  └─ Update inv     │
                        │                     │
                        │ Point of Sale (POS) │
                        │  └─ OTC sales      │
                        └─────────────────────┘
```

### Key Relationships

| Relationship | Why | Example |
|---|---|---|
| **Encounter → Patient** | Each hospital visit belongs to one patient | John Doe has 3 encounters (Feb 17, Feb 14, Jan 20) |
| **Encounter → Doctor (User)** | Doctor provides medical care | Dr. Smith is attending physician for John's Feb 17 encounter |
| **Encounter → Prescription** | Medications from hospital visit | Doctor prescribes antibiotics from Feb 17 encounter |
| **Prescription → Product** | Linkage to pharmacy inventory | Aspirin from pharmacy stock |
| **Worker → Enterprise** | Employee belongs to company | Jean Mwangi works for Mining Corp |
| **Worker → Medical Exam** | Health surveillance over time | Jean had 3 exams (pre-employment, annual, special) |

### Why Two Separate "People" Models?

- **Patient:** Passive health *subject* (comes to hospital for care)
  - Can exist without User account
  - Identified by Patient Number (P260124)
  - Allergies, chronic conditions, medications
  
- **Worker:** Active *employee* (works for enterprise)
  - Part of organizational structure
  - Has EmployeeID from company
  - Occupational exposures, PPE compliance, job restrictions

- **User:** *Staff member* with login (doctors, nurses, pharmacists)
  - Has authentication credentials
  - Has role and permissions
  - Can perform actions on Patients and Workers
  - Not visible to hospital/factory

---

## 📋 Core Workflows (30 Minutes)

### Workflow 1: Acute Illness (Hospital)

**Scenario:** Patient arrives with chest pain

```
Step 1: REGISTRATION (Receptionist)
└─ Create Patient record if new
   ├─ Patient.firstName, lastName, DOB
   ├─ Patient.phone, email
   ├─ Patient.allergies ← CRITICAL
   ├─ Patient.chronicConditions
   └─ Patient.currentMedications
   
   Result: Patient.patientNumber = "P260124" (auto-generated)

Step 2: TRIAGE (Nurse)
└─ Create Encounter for this visit
   ├─ Encounter.patient = Patient
   ├─ Encounter.chiefComplaint = "Chest pain"
   ├─ Record vital signs:
   │  ├─ Temperature, BP, Heart Rate, O2 Sat
   │  ├─ Weight, Height (→ BMI)
   │  └─ Pain level
   └─ Encounter.status = "in_triage"
   
   Result: VitalSigns recorded, system checks for abnormal values

Step 3: DOCTOR CONSULTATION (Doctor)  
└─ Doctor reviews patient + triage
   ├─ Checks Patient.allergies
   ├─ Reviews Patient.chronicConditions
   ├─ Reviews Patient.currentMedications
   ├─ Assess & diagnose
   └─ Decide: Discharge, Admit, or Special tests
   
   Result: Encounter.assessment = diagnosis

Step 4: PRESCRIBE (Doctor)
└─ Create Prescription linked to Encounter
   ├─ Prescription.patient = Patient
   ├─ Prescription.doctor = Current User (Doctor)
   ├─ Prescription.encounter = Encounter ← CRITICAL LINK
   ├─ Add items (drug, quantity, frequency)
   └─ Check: Is drug contraindicated vs Patient.allergies?
   
   Result: Prescription sent to pharmacy queue

Step 5: DISPENSE (Pharmacist)
└─ Pharmacist reviews prescription
   ├─ Check inventory availability
   ├─ Double-check Patient.allergies
   ├─ Check drug interactions
   ├─ Approve or request modification
   └─ Technician dispenses actual pills
   
   Result: Prescription.status = "FULLY_DISPENSED"
           InventoryItem.quantity -= quantity_dispensed

Step 6: BILLING (Cashier)
└─ Create Sale (payment)
   ├─ Sale.patient = Patient
   ├─ Sale.prescriptionId = Prescription
   ├─ Calculate: items × unit_price + tax
   └─ Record payment method
   
   Result: Sale completed, invoice printed

Step 7: DISCHARGE (Doctor)
└─ Update Encounter
   ├─ Encounter.status = "completed"
   ├─ Encounter.dischargeDate = today
   └─ Check: All prescriptions dispensed?
   
   Result: Patient leaves with medications + discharge summary
```

**Data Model:**
```
Patient ─── Encounter (FK patient)
           ├── VitalSigns (FK encounter)
           ├── Prescription (FK patient, FK encounter) ← Bridge to pharmacy
           │   └── PrescriptionItem → Product → InventoryItem → Sale
           └── MedicalRecord
```

---

### Workflow 2: Prescription to Pharmacy (Pharmacy)

**Scenario:** Doctor's prescription reaches pharmacist queue

```
Step 1: PRESCRIPTION QUEUE
└─ Pharmacist sees: "RX20260124001 - John Doe - PENDING"
   ├─ Tap to open
   └─ System loads:
      ├─ Patient name + age
      ├─ Patient.allergies ← Highlight if matched
      ├─ Patient.currentMedications ← Check interactions
      ├─ Encounter type + vital signs
      └─ Prescription items

Step 2: SAFETY CHECKS
└─ Pharmacist verifies:
   ├─ Aspirin
   │  └─ ✅ Not in allergies
   ├─ Lisinopril 20mg (increased dose)
   │  └─ ✅ Patient on 10mg, increase makes sense (elevated BP 158/98)
   ├─ Atorvastatin (new)
   │  └─ ✅ Statin not contraindicated
   └─ All items in stock?
      ├─ Aspirin: 50 available ✅
      ├─ Lisinopril: 80 available ✅
      └─ Atorvastatin: 100 available ✅

Step 3: APPROVAL
└─ Pharmacist clicks "Approve All"
   └─ Prescription.status = "APPROVED"

Step 4: DISPENSING
└─ Pharmacy technician physically:
   ├─ Retrieves aspirin (10 tablets)
   ├─ Retrieves lisinopril (14 tablets)
   ├─ Retrieves atorvastatin (14 tablets)
   └─ Confirms dispense in system

   Backend deducts:
   ├─ InventoryItem[aspirin].quantity: 50 → 40
   ├─ InventoryItem[lisinopril].quantity: 80 → 66
   └─ InventoryItem[atorvastatin].quantity: 100 → 86

   Checks:
   └─ Any item now < min_stock_level?
      └─ If YES: Create InventoryAlert("Restock needed")

Step 5: BILLING
└─ System calculates:
   ├─ Aspirin (10 × $2.50) = $25.00
   ├─ Lisinopril (14 × $5.00) = $70.00
   ├─ Atorvastatin (14 × $6.50) = $91.00
   ├─ Subtotal = $186.00
   ├─ Tax (15%) = $27.90
   └─ TOTAL = $213.90
   
   Create Sale:
   ├─ Sale.prescriptionId = Prescription
   ├─ Sale.patientId = Patient
   ├─ Sale.totalAmount = $213.90
   └─ Sale.status = "COMPLETED"

Step 6: PATIENT PICKUP
└─ Prescription.status = "FULLY_DISPENSED"
   └─ Patient receives:
      ├─ Aspirin (10 tablets) with label
      ├─ Lisinopril (14 tablets) with label
      ├─ Atorvastatin (14 tablets) with label
      └─ Receipt + instructions
```

**Data Model:**
```
Prescription (from doctor)
├── PrescriptionItem
│   ├── Product (sku, name, strength)
│   ├── quantityPrescribed
│   └── quantityDispensed
├── Patient ← Allergies for safety check
└── InventoryItem ← Stock management
    ├── quantity (tracking across dispensing)
    └── Sale (when cash/card payment made)
```

---

### Workflow 3: Occupational Health Exam (Mining Worker)

**Scenario:** Annual medical exam for mine employee

```
Step 1: WORKER ENROLLMENT
└─ HR creates Worker record for new employee
   ├─ Worker.firstName, lastName, DOB
   ├─ Worker.employeeId (unique per enterprise)
   ├─ Worker.enterprise = Mining Corp
   ├─ Worker.workSite = North Mine Pit
   ├─ Worker.jobTitle = Bulldozer Operator
   ├─ Worker.exposureRisks = [silica_dust, noise, heat_stress]
   ├─ Worker.ppeRequired = [hard_hat, respirator, hearing_protection]
   └─ Auto-calculated:
      ├─ Sector = mining (very_high risk)
      ├─ Exam frequency = 12 months
      └─ Worker.nextExamDue = hire_date + 12 months

Step 2: PERIODIC EXAM DUE
└─ System alerts: "Jean Mwangi overdue for exam (due 2/15)"
   └─ Occupational Health Physician initiates exam

Step 3: VITAL SIGNS
└─ Record vitals (similar to hospital)
   ├─ Temperature, BP, HR, RR, O2 Sat
   ├─ Weight & height
   └─ Calculate BMI

Step 4: SECTOR-SPECIFIC TESTS (Mining requires these)
└─ Audiometry (hearing damage)
   ├─ Test: Left ear threshold = 35 dB (normal < 20)
   ├─ Test: Right ear threshold = 38 dB
   └─ Finding: "Mild bilateral hearing loss from noise exposure"
   
└─ Spirometry (lung capacity)
   ├─ Test: FEV1 = 85% of predicted
   ├─ Test: FVC = 88% of predicted
   └─ Finding: "Mild restrictive pattern, monitor for silicosis"
   
└─ Blood metals (toxic exposure)
   ├─ Lead level = 25 μg/dL ✅ (within safe limits)
   ├─ Mercury level = 3 μg/L ✅
   └─ Cadmium level = 1.5 μg/L ✅
   
└─ Chest X-ray (silicosis screening)
   ├─ Finding: "Normal, no pneumoconiosis visible"
   └─ Recommendation: "Repeat annually"

Step 5: OCCUPATIONAL RISK ASSESSMENT
└─ Physician reviews:
   ├─ Current PPE compliance
   ├─ Incident history since last exam
   ├─ Symptoms of occupational disease
   └─ Job fit given test results

Step 6: FITNESS CERTIFICATION
└─ Determine fitness level:
   ├─ Option A: FIT ✅ → Can work without restrictions
   ├─ Option B: FIT_WITH_RESTRICTIONS ⚠️ → "No high noise work without hearing protection"
   ├─ Option C: TEMPORARILY_UNFIT 🔴 → Cannot work for period
   └─ Option D: PERMANENTLY_UNFIT 🚫 → Cannot do this job
   
   In this case: FIT_WITH_RESTRICTIONS
   ├─ Restrictions: "Use hearing protection at all times"
   └─ Valid until: 2027-02-17 (next 12 months)

Step 7: ISSUE CERTIFICATE
└─ Auto-generate FitnessCertificate
   ├─ FitnessCertificate.worker = Jean Mwangi
   ├─ FitnessCertificate.fitnessDecision = "FIT_WITH_RESTRICTIONS"
   ├─ FitnessCertificate.restrictions = "Use hearing protection..."
   ├─ FitnessCertificate.validFrom = 2026-02-17
   ├─ FitnessCertificate.validUntil = 2027-02-17
   └─ PDF generated + emailed to enterprise
   
   Update Worker:
   ├─ Worker.currentFitnessStatus = "FIT_WITH_RESTRICTIONS"
   ├─ Worker.fitnessRestrictions = text
   ├─ Worker.lastExamDate = 2026-02-17
   └─ Worker.nextExamDue = 2027-02-17

Step 8: INCIDENT TRACKING
└─ If incident occurred since last exam:
   ├─ Create WorkplaceIncident
   └─ Link injured workers:
      └─ If hearing loss confirmed:
         └─ Create OccupationalDisease record
            ├─ Disease type: OCCUPATIONAL_HEARING_LOSS
            ├─ Causal determination: PROBABLE
            └─ Case status: REPORTED (for workers comp)
```

**Data Model:**
```
Enterprise (mining) ─── Worker (Jean)
                       └── MedicalExamination (annual)
                           ├── VitalSigns
                           ├── AudiometryResult
                           ├── SpirometryResult
                           ├── BloodMetalsResult
                           └── FitnessCertificate
                           
If disease found:
                           └── OccupationalDisease
                               └── Workers compensation tracking
```

---

## 🔗 Entity Relationships Quick Reference

### Patient Entity
```
Patient
├─ ID: UUID
├─ patientNumber: P{YY}{RANDOM} (unique per org)
├─ Demographics: firstName, lastName, DOB, gender
├─ Contact: phone, email, address
├─ Medical: bloodType, allergies[], chronicConditions[], currentMedications[]
├─ Insurance: provider, number
├─ Status: ACTIVE | INACTIVE | DECEASED
└─ Links to:
   ├─ Encounter (1 patient → many encounters)
   ├─ VitalSigns (through Encounter)
   ├─ Prescription (1 patient → many prescriptions)
   ├─ MedicalRecord
   └─ Sale (pharmacy payments)
```

### User Entity (Staff Member)
```
User
├─ ID: UUID
├─ phone: Unique login identifier
├─ password: Hashed
├─ firstName, lastName
├─ email
├─ primaryRole: DOCTOR | NURSE | PHARMACIST | ADMIN | ... (20+ types)
├─ organization: FK Organization
├─ department: String (Cardiology, Pharmacy, etc.)
├─ customPermissions[]: Permission[] M2M
└─ Links to:
   ├─ Encounter (as attendingPhysician or nursing_staff)
   ├─ Prescription (as doctor)
   ├─ VitalSigns (as measuredBy, verifiedBy)
   ├─ MedicalExamination (as examiningDoctor)
   └─ All audit trails (createdBy, updatedBy)
```

### Encounter Entity (Hospital Visit)
```
Encounter
├─ ID: UUID
├─ encounterNumber: E{YY}{RANDOM}
├─ patient: FK Patient (1 encounter → 1 patient)
├─ organization: FK Organization
├─ encounterType: outpatient | consultation | inpatient | emergency
├─ status: registered → in_triage → in_consultation → admitted → completed
├─ chiefComplaint: String
├─ assessment: String (diagnosis)
├─ plan: String (treatment plan)
├─ priority: routine | semi_urgent | urgent | emergency
├─ admissionDate, dischargeDate
├─ attendingPhysician: FK User (Doctor)
├─ nursingStaff: M2M User[] (Nurses)
└─ Links to:
   ├─ VitalSigns (1 encounter → many vitals)
   ├─ Prescription (1 encounter → many prescriptions) ← KEY BRIDGE
   ├─ LabOrder
   ├─ Invoice (billing)
   └─ createdBy, updatedBy: FK User
```

### Prescription Entity (Doctor → Pharmacy Bridge)
```
Prescription
├─ ID: UUID
├─ prescriptionNumber: RX{YY}{RANDOM}
├─ patient: FK Patient
├─ doctor: FK User (Doctor who prescribed)
├─ encounter: FK Encounter ← Links back to hospital context
├─ organization: FK Organization
├─ date: Prescription date
├─ status: PENDING → PARTIALLY_DISPENSED → FULLY_DISPENSED | CANCELLED
├─ items[]: FK PrescriptionItem[]
│  └─ PrescriptionItem:
│     ├─ product: FK Product
│     ├─ quantityPrescribed: Integer
│     ├─ quantityDispensed: Integer
│     ├─ frequency: OD | BD | TID | QID
│     ├─ duration: Number of days
│     ├─ instructions: String
│     ├─ dispensedBy: FK User (Pharmacist)
│     └─ status: PENDING | DISPENSED | PARTIAL
└─ Links to:
   ├─ Patient (medical history check)
   ├─ Encounter (hospital context)
   ├─ InventoryItem (stock check/deduction)
   └─ Sale (payment tracking)
```

### Worker Entity (Occupational Health)
```
Worker
├─ ID: UUID
├─ employeeId: Unique per enterprise
├─ firstName, lastName, DOB, gender
├─ enterprise: FK Enterprise (mandatory)
├─ workSite: FK WorkSite (optional)
├─ jobTitle, jobCategory
├─ hireDate, employmentStatus
├─ exposureRisks[]: String[] (sector-specific)
├─ ppeRequired[]: String[] (based on sector)
├─ ppeProvided[]: String[] (compliance tracking)
├─ currentFitnessStatus: FIT | FIT_WITH_RESTRICTIONS | UNFIT
├─ fitnessRestrictions: String (if applicable)
├─ nextExamDue: Date (auto-calculated from sector exam frequency)
├─ lastExamDate: Date
└─ Links to:
   ├─ MedicalExamination (1 worker → many exams)
   ├─ FitnessCertificate (through Exam)
   ├─ OccupationalDisease (1 worker → many diseases)
   ├─ WorkplaceIncident (M2M as injuredWorker or witness)
   └─ PPEItem (tracking issued equipment)
```

### Enterprise Entity (Occupational Health)
```
Enterprise
├─ ID: UUID
├─ name: Company name
├─ sector: Choice (mining, construction, banking, etc.) ← Determines exam protocol
├─ sector_risk_level: very_high | high | moderate | low
├─ rccm: Business registration (unique)
├─ nif: Tax ID
├─ contactInfo, location
├─ examFrequencyMonths: Calculated from sector (12, 24, 36 months)
├─ mandatoryTestTypes[]: Based on sector
│  └─ Mining: [audiometry, spirometry, bloodMetals, chestXray]
│  └─ Construction: [audiometry, spirometry, visionTest]
│  └─ Banking: [visionTest, ergonomicAssessment, mentalHealth]
└─ Links to:
   ├─ WorkSite (1 enterprise → many sites)
   ├─ Worker (1 enterprise → many workers)
   ├─ WorkplaceIncident (1 enterprise → many incidents)
   ├─ HazardIdentification (risk assessments)
   └─ MedicalExamination (through Workers)
```

### MedicalExamination Entity (Occupational Health)
```
MedicalExamination
├─ ID: UUID
├─ worker: FK Worker
├─ examType: PREPLACEMENT | PERIODIC | SPECIAL | RETURN_TO_WORK
├─ examDate: Date
├─ examinedBy: FK User (Occ Health Physician)
├─ status: IN_PROGRESS | COMPLETED
├─ findings: Text
└─ Links to:
   ├─ VitalSigns (1:1) — Temperature, BP, HR, etc.
   ├─ PhysicalExamination (1:1)
   ├─ AudiometryResult (1:1, if sector requires)
   ├─ SpirometryResult (1:1, if sector requires)
   ├─ BloodMetalsResult (1:1, if sector requires)
   ├─ ChestXray (1:1, if sector requires)
   ├─ VisionTestResult (1:1, if sector requires)
   ├─ FitnessCertificate (1:1) ← Auto-generated after exam
   └─ [OccupationalDisease] (if disease found)
```

### FitnessCertificate Entity
```
FitnessCertificate
├─ ID: UUID
├─ medicalExamination: FK MedicalExamination (1:1)
├─ worker: FK Worker
├─ fitnessDecision: FIT | FIT_WITH_RESTRICTIONS | TEMPORARY_UNFIT | PERMANENT_UNFIT
├─ restrictions: Text (e.g., "No heights > 5m, hearing protection mandatory")
├─ validFrom: Date
├─ validUntil: Date (auto-calculated: validFrom + exam_frequency_months)
├─ issuedBy: FK User (Physician)
├─ issuedAt: Timestamp
└─ Status: ACTIVE | EXPIRED | SUPERSEDED
```

---

## 🏗️ Architecture Decisions

### Why Patient ≠ Worker?
- **Patient:** Temporary state (seeks healthcare, recovers, leaves)
- **Worker:** Ongoing state (employed, recurring surveillance)
- **Allows:** Different people to be both (separate records)
- **Example:** Jean Mwangi can be both a mining worker AND a hospital patient

### Why Encounter → Prescription Link?
- **Hospital context:** Prescription is part of encounter management (admission, triage, consultation)
- **Audit trail:** Can trace prescription back to doctor's assessment and vital signs
- **Billing:** Invoice tied to encounter, prescriptions are encounter expenses
- **Safety:** Can see encounter context (vital signs that prompted selection) when dispensing

### Why Tight User Role Permissions?
- **Healthcare compliance:** Every action needs audit trail (HIPAA, medical standards)
- **Safety:** Prevents wrong person from prescribing, dispensing, or examining
- **Multi-module:** Same person (doctor) can have limited pharmacy access but full hospital access
- **Organization scoping:** Can't access data from other hospitals even with same role

### Why Separate Pharmacy From Hospital?
- **Flexibility:** Standalone pharmacy can service multiple hospitals
- **Independence:** Hospital can exist without pharmacy module
- **Scalability:** Pharmacy inventory system independent from clinical workflows
- **Integration:** Prescription is the single contract point (loosely coupled)

---

## 🎓 Conclusion

The system is designed as **loosely coupled, functionally independent modules** that integrate through **well-defined data contracts:**

1. **Hospital module** creates Patients and Encounters
2. **Doctor creates Prescription** linked to Encounter
3. **Prescription entity bridges** to Pharmacy module
4. **Pharmacist verifies** against Patient allergies + InventoryItem stock
5. **Dispensing deducts** inventory automatically
6. **Billing tracks** money flows through Sales entity

**Occupational Health** operates independently:
1. **Enterprise hires Workers** with sector-based risk profiles
2. **Periodic exams** check fitness every 12-36 months (sector dependent)
3. **Sector-specific tests** run based on industry (mining needs audiometry, banking needs ergonomics)
4. **Fitness certificates** restrict workers if needed
5. **Incident tracking** manages workplace accidents/diseases

**The key insight:** Both hospital and occupational health manage patient/worker health, but through different processes optimized for their use cases. They remain separate records but can reference each other (e.g., occupational exposure noted in hospital patient record).
